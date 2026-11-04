import { httpUrl, isRecord } from "./validation";
import type { Store } from "./store";
import type { Caps, Direction, Find, Platform, State } from "./types";

export const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);
export const spentThisMonth = (s: State, month = monthKey()) => (s.spend.month === month ? s.spend.usd : 0);

interface Search { platform: Platform; actor: string; input: Record<string, unknown>; matched: string }

// Actor ids and input fields were checked against each actor's published schema on 2026-11-02.
export function planSearches(platforms: Platform[], directions: Direction[], limit: number): Search[] {
  const out: Search[] = [];
  const of = (k: Direction["kind"]) => directions.filter((d) => d.kind === k).map((d) => d.value);
  for (const p of platforms) {
    if (p === "tiktok") {
      for (const h of of("hashtag")) out.push({ platform: p, actor: "clockworks~tiktok-scraper", matched: `#${h}`, input: { hashtags: [h], resultsPerPage: limit } });
      for (const a of of("account")) out.push({ platform: p, actor: "clockworks~tiktok-scraper", matched: `@${a}`, input: { profiles: [a], resultsPerPage: limit } });
      for (const t of of("topic")) out.push({ platform: p, actor: "clockworks~tiktok-scraper", matched: t, input: { searchQueries: [t], resultsPerPage: limit } });
    }
    if (p === "instagram") for (const h of of("hashtag")) out.push({ platform: p, actor: "apify~instagram-hashtag-scraper", matched: `#${h}`, input: { hashtags: [h], resultsLimit: limit } });
    if (p === "youtube") for (const t of [...of("topic"), ...of("hashtag")]) out.push({ platform: p, actor: "streamers~youtube-scraper", matched: t, input: { searchQueries: [t], maxResults: limit } });
  }
  return out;
}

// Actors name these fields differently, so read each one defensively.
export function normalize(raw: unknown, platform: Platform, matched: string, now: string): Find | null {
  if (!isRecord(raw)) return null;
  const url = raw.webVideoUrl ?? raw.url ?? raw.postUrl;
  if (!httpUrl(url)) return null;
  const author = (isRecord(raw.authorMeta) ? raw.authorMeta.name : undefined) ?? raw.ownerUsername ?? raw.channelName ?? "unknown";
  const caption = String(raw.text ?? raw.caption ?? raw.title ?? "").slice(0, 280);
  const views = Number(raw.playCount ?? raw.videoPlayCount ?? raw.viewCount ?? raw.likesCount ?? 0);
  return { id: `f-${hash(url)}`, platform, url, author: String(author).slice(0, 300) || "unknown", caption, views: Number.isFinite(views) && views >= 0 ? views : 0, matched, status: "new", foundAt: now };
}

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16);
}

export function filterAvoid(finds: Find[], directions: Direction[]) {
  const avoid = directions.filter((d) => d.kind === "avoid").map((d) => d.value.toLowerCase());
  return finds.filter((f) => !avoid.some((a) => f.caption.toLowerCase().includes(a)));
}

export interface RunResult { items: unknown[]; usd: number }
export type ActorRunner = (actor: string, input: Record<string, unknown>, maxUsd: number) => Promise<RunResult>;

export const apifyRunner = (token: string, fetchFn = fetch): ActorRunner => async (actor, input, maxUsd) => {
  const auth = { Authorization: `Bearer ${token}` };
  // Do not retry the POST: a timeout can mean the paid run already started.
  const start = await fetchFn(`https://api.apify.com/v2/acts/${actor}/runs?waitForFinish=60&timeout=300&maxTotalChargeUsd=${maxUsd}`, {
    method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(input), signal: AbortSignal.timeout(70000),
  });
  if (!start.ok) throw new Error(`Apify rejected ${actor}: HTTP ${start.status}`);
  const readRun = (body: unknown) => {
    if (!isRecord(body) || !isRecord(body.data) || typeof body.data.id !== "string" || typeof body.data.status !== "string") throw new Error("Invalid Apify run response.");
    return body.data;
  };
  let run = readRun(await start.json());
  for (let i = 0; i < 6 && ["READY", "RUNNING", "TIMING-OUT", "ABORTING"].includes(String(run.status)); i++) {
    const poll = await fetchFn(`https://api.apify.com/v2/actor-runs/${encodeURIComponent(String(run.id))}?waitForFinish=60`, { headers: auth, signal: AbortSignal.timeout(70000) });
    if (!poll.ok) throw new Error(`Apify run: HTTP ${poll.status}`);
    run = readRun(await poll.json());
  }
  if (run.status !== "SUCCEEDED") throw new Error(`Apify run ended with status ${run.status}; reservation retained.`);
  const usd = run.usageTotalUsd ?? maxUsd;
  if (typeof usd !== "number" || !Number.isFinite(usd) || usd < 0) throw new Error("Invalid Apify charge; reservation retained.");
  if (typeof run.defaultDatasetId !== "string" || !run.defaultDatasetId) throw new Error("Apify run returned no dataset.");
  const limit = Number(input.resultsPerPage ?? input.resultsLimit ?? input.maxResults);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) throw new Error("Invalid dataset limit.");
  const res = await fetchFn(`https://api.apify.com/v2/datasets/${encodeURIComponent(run.defaultDatasetId)}/items?clean=true&limit=${limit}`, { headers: auth, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`Apify dataset: HTTP ${res.status}; reservation retained.`);
  const items: unknown = await res.json();
  if (!Array.isArray(items)) throw new Error("Invalid Apify dataset.");
  return { items: items.slice(0, limit).filter(isRecord), usd };
};

export interface ScanReport { finds: Find[]; usd: number; stoppedForCap: boolean; errors: string[] }

export function validateCaps(caps: Caps) {
  if (!Number.isFinite(caps.perRunUsd) || caps.perRunUsd <= 0 ||
      !Number.isFinite(caps.perMonthUsd) || caps.perMonthUsd < 0 ||
      !Number.isSafeInteger(caps.resultsPerSearch) || caps.resultsPerSearch < 1 || caps.resultsPerSearch > 1000) {
    throw new Error("Invalid scan caps: use positive per-run USD, nonnegative monthly USD and 1–1000 results.");
  }
}

// Reserve before the provider call. Unknown outcomes keep their full reservation.
// A Store makes reservation and settlement atomic across bot processes.
export async function scan(state: State, caps: Caps, run: ActorRunner, now: Date | (() => Date) = new Date(), store?: Store): Promise<ScanReport> {
  validateCaps(caps);
  let local = state;
  const update = async (fn: (s: State) => State) => store ? store.update(fn) : (local = fn(local));
  const report: ScanReport = { finds: [], usd: 0, stoppedForCap: false, errors: [] };
  for (const s of planSearches(state.platforms, state.directions, caps.resultsPerSearch)) {
    const at = typeof now === "function" ? now() : now;
    const month = monthKey(at);
    let reserved = false;
    await update(current => {
      const spent = spentThisMonth(current, month);
      if (current.spend.month > month || spent + caps.perRunUsd > caps.perMonthUsd + 1e-9) return current;
      reserved = true;
      return { ...current, spend: { month, usd: spent + caps.perRunUsd } };
    });
    if (!reserved) { report.stoppedForCap = true; break; }
    report.usd += caps.perRunUsd;
    try {
      const r = await run(s.actor, s.input, caps.perRunUsd);
      if (!Number.isFinite(r.usd) || r.usd < 0 || !Array.isArray(r.items)) throw new Error("Invalid scan result; reservation retained.");
      const found = filterAvoid(r.items.slice(0, caps.resultsPerSearch)
        .map(raw => normalize(raw, s.platform, s.matched, at.toISOString()))
        .filter((f): f is Find => f !== null), state.directions);
      let fresh: Find[] = [];
      await update(current => {
        const seen = new Set(current.finds.map(f => f.url));
        fresh = found.filter(f => !seen.has(f.url) && !!seen.add(f.url));
        return { ...current, finds: [...fresh, ...current.finds],
          // An old in-flight run must never reset a newer month's ledger.
          spend: current.spend.month === month ? { month, usd: Math.max(0, current.spend.usd + r.usd - caps.perRunUsd) } : current.spend };
      });
      report.usd += r.usd - caps.perRunUsd;
      report.finds.push(...fresh);
      if (r.usd > caps.perRunUsd) {
        report.errors.push("Provider charge exceeded the requested ceiling; scan stopped.");
        break;
      }
    } catch (e) { report.errors.push(e instanceof Error ? e.message : "Search failed; reservation retained."); }
  }
  return report;
}

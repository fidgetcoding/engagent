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
export function normalize(raw: Record<string, any>, platform: Platform, matched: string, now: string): Find | null {
  const url = raw.webVideoUrl ?? raw.url ?? raw.postUrl;
  if (typeof url !== "string" || !url.startsWith("http")) return null;
  const author = raw.authorMeta?.name ?? raw.ownerUsername ?? raw.channelName ?? "unknown";
  const caption = String(raw.text ?? raw.caption ?? raw.title ?? "").slice(0, 280);
  const views = Number(raw.playCount ?? raw.videoPlayCount ?? raw.viewCount ?? raw.likesCount ?? 0) || 0;
  return { id: `f-${hash(url)}`, platform, url, author: String(author), caption, views, matched, status: "new", foundAt: now };
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

export interface RunResult { items: Record<string, any>[]; usd: number }
export type ActorRunner = (actor: string, input: Record<string, unknown>, maxUsd: number) => Promise<RunResult>;

export const apifyRunner = (token: string, fetchFn = fetch): ActorRunner => async (actor, input, maxUsd) => {
  const base = `https://api.apify.com/v2/acts/${actor}/runs`;
  const auth = { Authorization: `Bearer ${token}` };
  const start = await fetchFn(`${base}?waitForFinish=60&timeout=300&maxTotalChargeUsd=${maxUsd}`, { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (!start.ok) throw new Error(`Apify rejected ${actor}: HTTP ${start.status}`);
  let run = (await start.json()).data;
  for (let i = 0; i < 6 && ["READY", "RUNNING"].includes(run.status); i++) {
    const poll = await fetchFn(`https://api.apify.com/v2/actor-runs/${run.id}?waitForFinish=60`, { headers: auth });
    if (!poll.ok) throw new Error(`Apify run ${run.id}: HTTP ${poll.status}`);
    run = (await poll.json()).data;
  }
  const usd = Number(run.usageTotalUsd ?? maxUsd);
  const res = await fetchFn(`https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?clean=true`, { headers: auth });
  return { items: res.ok ? await res.json() : [], usd };
};

export interface ScanReport { finds: Find[]; usd: number; stoppedForCap: boolean; errors: string[] }

// Reserves the full per-run ceiling before each run, so the monthly cap cannot be overshot.
export async function scan(state: State, caps: Caps, run: ActorRunner, now = new Date()): Promise<ScanReport> {
  let spent = spentThisMonth(state, monthKey(now));
  const report: ScanReport = { finds: [], usd: 0, stoppedForCap: false, errors: [] };
  for (const s of planSearches(state.platforms, state.directions, caps.resultsPerSearch)) {
    if (spent + caps.perRunUsd > caps.perMonthUsd) { report.stoppedForCap = true; break; }
    try {
      const r = await run(s.actor, s.input, caps.perRunUsd);
      spent += r.usd; report.usd += r.usd;
      for (const raw of r.items) { const f = normalize(raw, s.platform, s.matched, now.toISOString()); if (f) report.finds.push(f); }
    } catch (e) { report.errors.push((e as Error).message); }
  }
  const unique = new Map(report.finds.map((f) => [f.url, f]));
  report.finds = filterAvoid([...unique.values()], state.directions);
  return report;
}

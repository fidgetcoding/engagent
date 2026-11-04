import { isBrowserAction } from "../lib/validation";
import config from "../engagent.config";
import { hash, monthKey, scan, spentThisMonth, type ActorRunner } from "../lib/scan";
import type { Store } from "../lib/store";
import { DIRECTION_KINDS, PLATFORMS, type Action, type Direction, type DirectionKind, type Find, type Platform, type State } from "../lib/types";

export interface Button { text: string; data: string }
export interface Reply { text: string; buttons?: Button[][] }
export interface Deps { store: Store; runner: ActorRunner | null; interpret?: (text: string, s: State) => Promise<string | null>; newId?: () => string; now?: () => Date }

const HELP = `Here's what I can do:
/directions — what I'm looking for
/watch hashtag coffeetok — add a direction (account, hashtag, reference, topic or avoid)
/unwatch hashtag coffeetok — remove one
/platforms tiktok instagram — choose platforms
/scan — search now
/finds — review new finds
/board — content by stage
/move 2 Filming — move card 2
/log 2 tiktok views=1200 likes=80 — log performance
/spend — this month's scan spend`;

const count = (n: number) => n.toLocaleString("en-US");
const findMsg = (f: Find): Reply => ({ text: `${f.platform} · ${f.author} · ${count(f.views)} views\n${f.caption}\n${f.url}\nMatched ${f.matched}`, buttons: [[{ text: "Add to board", data: `ok:${f.id}` }, { text: "Skip", data: `no:${f.id}` }]] });
const isKind = (k: string): k is DirectionKind => (DIRECTION_KINDS as readonly string[]).includes(k);
const isPlatform = (p: string): p is Platform => (PLATFORMS as readonly string[]).includes(p);

export async function handleText(text: string, chatId: number, d: Deps): Promise<Reply[]> {
  const t = text.trim();
  if (!t || t.length > 4096) return [{ text: "Send a message between 1 and 4,096 characters." }];
  if (!t.startsWith("/")) {
    if (!d.interpret) return [{ text: `Plain-English messages need ANTHROPIC_API_KEY. Commands work without it.\n\n${HELP}` }];
    const command = await d.interpret(t, await d.store.read());
    if (!command?.startsWith("/")) return [{ text: command || "I didn't catch that. Try /help." }];
    if (/^\/scan(?:@\w+)?(?:\s|$)/i.test(command)) return [{ text: "Send /scan to start a paid search." }];
    return handleText(command, chatId, { ...d, interpret: undefined });
  }
  const [cmd, ...args] = t.split(/\s+/);
  const name = cmd.slice(1).split("@")[0].toLowerCase();
  const s = await d.store.read();
  switch (name) {
    case "start": case "help": return [{ text: `${config.brand.name} on Engagent.\n\n${HELP}` }];
    case "whoami": return [{ text: `Your chat id: ${chatId}` }];
    case "directions": return [{ text: s.directions.length ? DIRECTION_KINDS.map((k) => { const v = s.directions.filter((x) => x.kind === k).map((x) => x.value); return v.length ? `${k}: ${v.join(", ")}` : ""; }).filter(Boolean).join("\n") : "No directions yet. Try /watch hashtag coffeetok" }];
    case "watch": case "unwatch": {
      const [kind, ...rest] = args; const value = rest.join(" ");
      if (!kind || !isKind(kind) || !value) return [{ text: `Use /${name} ${DIRECTION_KINDS.join("|")} <value>` }];
      const direction: Direction = { kind, value };
      const action: Action = { type: name === "watch" ? "direction.add" : "direction.remove", direction };
      if (!isBrowserAction(action, config) || !value.trim().replace(/^[#@]/, "").trim()) return [{ text: "Use a nonempty direction of up to 300 characters; references need an HTTP(S) URL." }];
      await d.store.apply(action);
      return [{ text: `${name === "watch" ? "Watching" : "Stopped watching"} ${kind}: ${value}` }];
    }
    case "platforms": {
      if (!args.length) return [{ text: `Active: ${s.platforms.join(", ") || "none"}. Available: ${PLATFORMS.join(", ")}` }];
      const want = args.map((a) => a.toLowerCase());
      const bad = want.filter((p) => !isPlatform(p));
      if (bad.length) return [{ text: `Unknown: ${bad.join(", ")}. Available: ${PLATFORMS.join(", ")}` }];
      await d.store.apply({ type: "platform.set", platforms: PLATFORMS.filter(p => want.includes(p)) });
      return [{ text: `Active: ${PLATFORMS.filter((p) => want.includes(p)).join(", ")}` }];
    }
    case "scan": {
      if (!d.runner) return [{ text: "Add APIFY_TOKEN to run live searches." }];
      const r = await scan(s, config.caps, d.runner, d.now ?? (() => new Date()), d.store);
      const fresh = r.finds;
      const notes = [r.stoppedForCap ? `Stopped at the $${config.caps.perMonthUsd} monthly cap.` : "", r.errors.length ? `${r.errors.length} search(es) failed; uncertain charges remain reserved: ${r.errors[0]}` : ""].filter(Boolean).join(" ");
      return [{ text: `Found ${fresh.length} new, spent $${r.usd.toFixed(2)}. ${notes}`.trim() }, ...fresh.slice(0, 5).map(findMsg)];
    }
    case "finds": {
      const fresh = s.finds.filter((f) => f.status === "new").sort((a, b) => b.views - a.views).slice(0, 5);
      return fresh.length ? fresh.map(findMsg) : [{ text: "No new finds. Run /scan." }];
    }
    case "board": return [{ text: s.cards.length ? config.stages.map((st) => { const rows = s.cards.map((c, i) => ({ c, i })).filter((x) => x.c.stage === st); return rows.length ? `${st}\n${rows.map((x) => `  ${x.i + 1}. ${x.c.title}`).join("\n")}` : ""; }).filter(Boolean).join("\n") : "The board is empty." }];
    case "move": {
      const c = s.cards[Number(args[0]) - 1]; const stage = config.stages.find((x) => x.toLowerCase() === args.slice(1).join(" ").toLowerCase());
      if (!c || !stage) return [{ text: `Use /move <card number> <${config.stages.join("|")}>` }];
      await d.store.apply({ type: "card.move", id: c.id, stage });
      return [{ text: `Moved "${c.title}" to ${stage}.` }];
    }
    case "log": {
      const c = s.cards[Number(args[0]) - 1]; const p = args[1]?.toLowerCase();
      if (!c || !p || !isPlatform(p)) return [{ text: "Use /log <card number> <platform> views=1200 likes=80 comments=5 shares=2" }];
      const nums: Record<string, number> = {};
      for (const pair of args.slice(2)) { const [k, v] = pair.split("="); const n = Number(v?.replace(/,/g, "")); if (pair.split("=").length !== 2 || !v || !["views", "likes", "comments", "shares"].includes(k.toLowerCase()) || !Number.isSafeInteger(n) || n < 0) return [{ text: `Couldn't read "${pair}".` }]; nums[k.toLowerCase()] = n; }
      if (!Object.keys(nums).length) return [{ text: "Give at least one number, like views=1200." }];
      const metric = { platform: p, views: nums.views ?? 0, likes: nums.likes ?? 0, comments: nums.comments ?? 0, shares: nums.shares ?? 0, at: (d.now?.() ?? new Date()).toISOString() };
      await d.store.apply({ type: "metric.log", id: c.id, metric });
      return [{ text: `Logged ${count(metric.views)} views on ${p} for "${c.title}".` }];
    }
    case "spend": return [{ text: `Scans this month: $${spentThisMonth(s, monthKey(d.now?.() ?? new Date())).toFixed(2)} of $${config.caps.perMonthUsd}.` }];
    default: return [{ text: `I don't know /${name}.\n\n${HELP}` }];
  }
}

export async function handleButton(data: unknown, d: Deps): Promise<string> {
  if (typeof data !== "string" || !/^(ok|no):[^:]+$/.test(data)) return "Unknown button.";
  const [verb, id] = data.split(":");
  const f = (await d.store.read()).finds.find((x) => x.id === id);
  if (!f) return "That find is gone.";
  if (f.status !== "new") return `Already ${f.status}.`;
  const action: Action = verb === "ok"
    ? { type: "find.approve", id, cardId: d.newId?.() ?? `c-${hash(id + Date.now())}`, firstStage: config.stages[0], contentType: config.contentTypes[0] }
    : { type: "find.skip", id };
  await d.store.apply(action);
  return verb === "ok" ? "Added to the board." : "Skipped.";
}

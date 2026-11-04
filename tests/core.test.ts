import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { handleButton, handleText, type Deps } from "../bot/agent";
import { applyAction, initialState } from "../lib/reducer";
import { filterAvoid, planSearches, scan, type ActorRunner } from "../lib/scan";
import { fileStore } from "../lib/store";
import type { Find, State } from "../lib/types";

const base = (): State => initialState({ platforms: ["tiktok"], directions: [{ kind: "hashtag", value: "a" }, { kind: "hashtag", value: "b" }, { kind: "hashtag", value: "c" }] });
const item = (u: string) => ({ webVideoUrl: `https://x.test/${u}`, text: `cap ${u}`, playCount: 5, authorMeta: { name: "n" } });
const caps = { perRunUsd: 1, perMonthUsd: 2, resultsPerSearch: 5 };

test("monthly cap stops scans before the next run could overshoot", async () => {
  let runs = 0;
  const run: ActorRunner = async () => { runs++; return { items: [item(String(runs))], usd: 1 }; };
  const r = await scan(base(), caps, run, new Date("2026-11-02"));
  assert.equal(runs, 2); assert.equal(r.stoppedForCap, true); assert.equal(r.usd, 2);
});

test("last month's spend does not count against this month", async () => {
  const s = { ...base(), spend: { month: "2026-10", usd: 99 } };
  const r = await scan(s, caps, async () => ({ items: [], usd: 0 }), new Date("2026-11-02"));
  assert.equal(r.stoppedForCap, false);
});

test("a failed search is reported and the rest continue", async () => {
  let n = 0;
  const r = await scan(base(), { ...caps, perMonthUsd: 50 }, async () => { if (n++ === 0) throw new Error("boom"); return { items: [item(String(n))], usd: 0 }; });
  assert.deepEqual(r.errors, ["boom"]); assert.equal(r.finds.length, 2);
});

test("avoid list removes finds; plan respects platforms", () => {
  const f = { caption: "Instant Coffee ads rock" } as Find;
  assert.equal(filterAvoid([f], [{ kind: "avoid", value: "instant coffee" }]).length, 0);
  assert.equal(planSearches([], [{ kind: "hashtag", value: "a" }], 5).length, 0);
});

test("duplicate directions and finds are ignored", () => {
  let s = applyAction(base(), { type: "direction.add", direction: { kind: "hashtag", value: "#A" } });
  assert.equal(s.directions.length, 3);
  const f = { id: "1", url: "u", status: "new" } as Find;
  s = applyAction(s, { type: "find.add", finds: [f, f] });
  assert.equal(s.finds.length, 1);
});

const testDirectories: string[] = [];
after(() => { for (const dir of testDirectories) rmSync(dir, { recursive: true, force: true }); });

function deps(): Deps {
  const dir = mkdtempSync(path.join(tmpdir(), "eg-"));
  testDirectories.push(dir);
  const store = fileStore(path.join(dir, "s.json"));
  return { store, runner: async () => ({ items: [item("v")], usd: 0.25 }), newId: () => "c1", now: () => new Date("2026-11-02") };
}

test("full Telegram loop: direct, scan, approve, move, log, persist", async () => {
  const d = deps();
  await handleText("/watch hashtag #latte", 1, d);
  const scanned = await handleText("/scan", 1, d);
  assert.match(scanned[0].text, /Found 1 new, spent \$3\.00/);
  const data = scanned[1].buttons![0][0].data;
  assert.equal(await handleButton(data, d), "Added to the board.");
  assert.match(await handleButton(data, d), /Already approved/);
  assert.match((await handleText("/move 1 Filming", 1, d))[0].text, /Filming/);
  assert.match((await handleText("/log 1 tiktok views=1,200 likes=80", 1, d))[0].text, /1,200 views/);
  const s = await d.store.read();
  assert.equal(s.cards[0].stage, "Filming"); assert.equal(s.cards[0].metrics[0].views, 1200); assert.equal(s.spend.usd, 3);
});

test("bad input gets guidance and changes nothing", async () => {
  const d = deps();
  const before = await d.store.read();
  assert.match((await handleText("/log 9 tiktok views=1", 1, d))[0].text, /Use \/log/);
  assert.match((await handleText("/platforms myspace", 1, d))[0].text, /Unknown/);
  assert.match((await handleText("hello there", 1, d))[0].text, /ANTHROPIC_API_KEY/);
  assert.deepEqual(await d.store.read(), before);
});

test("interpreter output runs as a command but cannot recurse", async () => {
  const d = { ...deps(), interpret: async () => "/watch topic espresso" };
  assert.match((await handleText("track espresso", 1, d))[0].text, /Watching topic: espresso/);
});

test("unknown run outcomes retain their ceiling and stop at the cap", async () => {
  let runs = 0;
  const r = await scan(base(), caps, async () => { runs++; throw new Error("connection lost after start"); });
  assert.equal(runs, 2);
  assert.equal(r.usd, 2);
  assert.equal(r.stoppedForCap, true);
});

test("unknown Telegram buttons cannot skip a find", async () => {
  const d = deps();
  await handleText("/scan", 1, d);
  const before = await d.store.read();
  assert.equal(await handleButton(`unknown:${before.finds[0].id}`, d), "Unknown button.");
  assert.deepEqual(await d.store.read(), before);
});

test("unwatch normalizes the same hashtag syntax as watch", () => {
  const state = applyAction(base(), { type: "direction.add", direction: { kind: "hashtag", value: "#Latte" } });
  const next = applyAction(state, { type: "direction.remove", direction: { kind: "hashtag", value: " #LATTE " } });
  assert.equal(next.directions.some(d => d.value.toLowerCase() === "latte"), false);
});

test("replaying card creation is idempotent", () => {
  const card = { id: "retry-card", title: "Retry", type: "Short video", stage: "Idea", platforms: [], due: null, brief: "", briefStatus: "none" as const, sourceFindId: null, metrics: [] };
  const state = applyAction(base(), { type: "card.add", card });
  assert.deepEqual(applyAction(state, { type: "card.add", card }), state);
});

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import config from "../engagent.config";
import { fileStore } from "../lib/store";
import { scan, normalize, apifyRunner } from "../lib/scan";
import { initialState } from "../lib/reducer";
import { handleText } from "../bot/agent";
import { isBrowserAction, isState } from "../lib/validation";
import { POST } from "../app/api/action/route";

const sandbox = async (fn: (file: string) => Promise<void>) => {
  const dir = await mkdtemp(path.join(tmpdir(), "engagent-check-"));
  try { await fn(path.join(dir, "state.json")); } finally { await rm(dir, { recursive: true, force: true }); }
};

test("two processes retain all writes and clean temporary files", () => sandbox(async file => {
  const worker = path.resolve("tests/helpers/writer.ts");
  const execute = (prefix: string) => new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", worker, file, prefix], { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = ""; child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject); child.on("exit", code => code === 0 ? resolve() : reject(new Error(stderr)));
  });
  await Promise.all([execute("web"), execute("bot")]);
  const state = await fileStore(file).read();
  assert.equal(state.directions.filter(d => d.value.startsWith("worker-")).length, 40);
  assert.deepEqual(await readdir(path.dirname(file)), ["state.json"]);
}));

test("malformed persisted data is preserved and failed writes release the lock", () => sandbox(async file => {
  await writeFile(file, '{"cards":null}');
  await assert.rejects(fileStore(file).apply({ type: "platform.toggle", platform: "tiktok" }), /Invalid workspace/);
  assert.equal(await readFile(file, "utf8"), '{"cards":null}');
  assert.deepEqual(await readdir(path.dirname(file)), ["state.json"]);
  await writeFile(file, JSON.stringify(initialState(config)));
  await fileStore(file).apply({ type: "direction.add", direction: { kind: "topic", value: "recovered" } });
  assert.ok((await fileStore(file).read()).directions.some(d => d.value === "recovered"));
}));

test("concurrent scans reserve the shared budget before provider execution", () => sandbox(async file => {
  const store = fileStore(file);
  await store.update(() => initialState({ platforms: ["tiktok"], directions: [{ kind: "topic", value: "test" }] }));
  let calls = 0;
  const runner = async () => {
    calls++;
    assert.equal((await fileStore(file).read()).spend.usd, 1);
    await new Promise(r => setTimeout(r, 30));
    return { items: [], usd: 1 };
  };
  const state = await store.read();
  const reports = await Promise.all([1, 2].map(() => scan(state, { perRunUsd: 1, perMonthUsd: 1, resultsPerSearch: 5 }, runner, new Date("2026-11-04"), fileStore(file))));
  assert.equal(calls, 1); assert.equal(reports.filter(r => r.stoppedForCap).length, 1);
  assert.equal((await store.read()).spend.usd, 1);
}));

test("failed provider calls survive reopening as reserved spend", () => sandbox(async file => {
  const store = fileStore(file);
  const state = initialState({ platforms: ["tiktok"], directions: [{ kind: "topic", value: "test" }] });
  await store.update(() => state);
  await scan(state, { perRunUsd: 1, perMonthUsd: 1, resultsPerSearch: 5 }, async () => { throw new Error("lost connection"); }, new Date("2026-11-04"), store);
  assert.equal((await fileStore(file).read()).spend.usd, 1);
}));

test("invalid budgets never start a provider call", async () => {
  for (const caps of [{ perRunUsd: NaN, perMonthUsd: 10, resultsPerSearch: 5 }, { perRunUsd: -1, perMonthUsd: 10, resultsPerSearch: 5 }, { perRunUsd: 1, perMonthUsd: 10, resultsPerSearch: 0 }]) {
    await assert.rejects(scan(initialState(config), caps, async () => { assert.fail("provider must not run"); }));
  }
});

test("provider data handles malformed records and unsafe URLs", () => {
  for (const raw of [null, [], { url: "http-fake" }, { url: "javascript:alert(1)" }, { url: "https://user:pass@example.com" }]) assert.equal(normalize(raw, "tiktok", "test", new Date().toISOString()), null);
  const find = normalize({ url: "https://example.com", playCount: Infinity }, "tiktok", "test", new Date().toISOString());
  assert.equal(find?.views, 0);
});

test("provider requests have deadlines, limit downloaded results and reject unfinished runs", async () => {
  const urls: string[] = [];
  const runner = apifyRunner("fake", async (url, options) => {
    assert.ok(options?.signal);
    urls.push(String(url));
    return urls.length === 1 ? Response.json({ data: { id: "r", status: "SUCCEEDED", defaultDatasetId: "d", usageTotalUsd: 0.2 } }) : Response.json(Array.from({ length: 10 }, () => ({ url: "https://example.com" })));
  });
  assert.equal((await runner("fake", { maxResults: 2 }, 1)).items.length, 2);
  assert.match(urls[1], /limit=2/);
  const unfinished = apifyRunner("fake", async () => Response.json({ data: { id: "r", status: "RUNNING" } }));
  await assert.rejects(unfinished("fake", { maxResults: 2 }, 1), /RUNNING/);
});

test("validation rejects forged approval rules, invalid dates, metrics and state", () => {
  for (const action of [
    { type: "card.brief", id: "x", brief: "test", approvals: !config.approvals },
    { type: "card.move", id: "x", stage: "invented" },
    { type: "card.due", id: "x", due: "2026-02-30" },
    { type: "metric.log", id: "x", metric: { platform: "tiktok", views: 1, likes: 0, comments: 0, shares: 0 } },
    { type: "spend.add", month: "2026-11", usd: -100 },
  ]) assert.equal(isBrowserAction(action, config), false);
  assert.equal(isState({ cards: [] }), false);
});

test("API rejects cross-origin, oversized and malformed bodies", async () => {
  const old = process.env.ENGAGENT_DEMO; process.env.ENGAGENT_DEMO = "0";
  try {
    const request = (body: string, headers = {}) => new Request("http://localhost/api/action", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body });
    assert.equal((await POST(request("{}", { origin: "https://other.test" }))).status, 403);
    assert.equal((await POST(request("{"))).status, 400);
    assert.equal((await POST(request("x".repeat(65537)))).status, 413);
    assert.equal((await POST(request("{}", { "Content-Type": "text/plain" }))).status, 415);
  } finally { if (old === undefined) delete process.env.ENGAGENT_DEMO; else process.env.ENGAGENT_DEMO = old; }
});

test("mistyped Telegram metrics and model-generated paid scans make no changes", () => sandbox(async file => {
  const store = fileStore(file);
  await store.apply({ type: "card.add", card: { id: "card", title: "Test", stage: config.stages[0], type: config.contentTypes[0], platforms: ["tiktok"], brief: "", briefStatus: "none", due: null, sourceFindId: null, metrics: [] } });
  const deps = { store, runner: async () => { assert.fail("paid runner must not execute"); }, interpret: async () => "/scan" };
  assert.match((await handleText("/log 1 tiktok veiws=100", 1, deps))[0].text, /Couldn't read/);
  assert.match((await handleText("find ideas", 1, deps))[0].text, /Send \/scan/);
  assert.equal((await store.read()).cards[0].metrics.length, 0);
}));

test("an older in-flight scan cannot overwrite the new month's spend", () => sandbox(async file => {
  const store = fileStore(file);
  const state = initialState({ platforms: ["tiktok"], directions: [{ kind: "topic", value: "test" }] });
  await store.update(() => state);
  await scan(state, { perRunUsd: 1, perMonthUsd: 10, resultsPerSearch: 5 }, async () => {
    await store.update(current => ({ ...current, spend: { month: "2026-12", usd: 5 } }));
    return { items: [], usd: 0.2 };
  }, new Date("2026-11-30"), store);
  assert.deepEqual((await store.read()).spend, { month: "2026-12", usd: 5 });
}));

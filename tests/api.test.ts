import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { POST } from "../app/api/action/route";
import { fileStore } from "../lib/store";
test("browser API rejects incomplete cards without changing storage", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "engagent-api-"));
  const oldDemo = process.env.ENGAGENT_DEMO;
  const oldData = process.env.ENGAGENT_DATA;
  process.env.ENGAGENT_DEMO = "0";
  process.env.ENGAGENT_DATA = path.join(dir, "state.json");
  try {
    const response = await POST(new Request("http://localhost/api/action", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "card.add", card: { id: "bad", title: "Incomplete", metrics: [], platforms: [] } }),
    }));
    assert.equal(response.status, 400);
    assert.equal((await fileStore().read()).cards.length, 0);
  } finally {
    if (oldDemo === undefined) delete process.env.ENGAGENT_DEMO; else process.env.ENGAGENT_DEMO = oldDemo;
    if (oldData === undefined) delete process.env.ENGAGENT_DATA; else process.env.ENGAGENT_DATA = oldData;
    await rm(dir, { recursive: true, force: true });
  }
});

test("same-origin checks use the public Host rather than Next's internal listener", async () => {
  const oldDemo = process.env.ENGAGENT_DEMO; process.env.ENGAGENT_DEMO = "0";
  try {
    const response = await POST(new Request("http://0.0.0.0:3000/api/action", {
      method: "POST", headers: { host: "workspace.test:3000", origin: "http://workspace.test:3000", "Content-Type": "application/json" }, body: "{}",
    }));
    assert.equal(response.status, 400); // Reaches validation; the action itself is deliberately invalid.
  } finally { if (oldDemo === undefined) delete process.env.ENGAGENT_DEMO; else process.env.ENGAGENT_DEMO = oldDemo; }
});

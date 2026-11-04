import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileStore } from "../lib/store";

test("independent stores preserve every concurrent write", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "engagent-race-"));
  try {
    const file = path.join(dir, "state.json");
    const results = await Promise.allSettled(Array.from({ length: 20 }, (_, i) =>
      fileStore(file).apply({ type: "direction.add", direction: { kind: "topic", value: `concurrent-${i}` } })));
    assert.equal(results.filter(r => r.status === "rejected").length, 0);
    const state = await fileStore(file).read();
    assert.equal(state.directions.filter(d => d.value.startsWith("concurrent-")).length, 20);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

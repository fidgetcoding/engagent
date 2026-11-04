import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileStore } from "../lib/store";
import { claimUpdate, splitText } from "../bot/telegram";

test("Telegram updates can be claimed only once across stores and restarts", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "engagent-offset-"));
  try {
    const file = path.join(dir, "state.json");
    const claims = await Promise.all([1, 2].map(() => claimUpdate(fileStore(file), "123", 42)));
    assert.equal(claims.filter(Boolean).length, 1);
    assert.equal(await claimUpdate(fileStore(file), "123", 42), false);
    assert.equal(await claimUpdate(fileStore(file), "123", 41), false);
    assert.equal(await claimUpdate(fileStore(file), "123", 43), true);
    assert.equal(await claimUpdate(fileStore(file), "456", 1), true);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("long Telegram replies retain all text without splitting emoji", () => {
  const text = 'x'.repeat(3999) + '🌿'.repeat(4001);
  const parts = splitText(text);
  assert.equal(parts.join(''), text);
  assert.ok(parts.every(p => p.length <= 4000 && !/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/.test(p)));
});

test("Telegram can accept a lower randomized update ID after a long idle period", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "engagent-idle-"));
  try {
    const store = fileStore(path.join(dir, "state.json"));
    await claimUpdate(store, "123", 900);
    await store.update(state => ({ ...state, telegramOffsetTimes: { "123": Date.now() - 9 * 86400000 } }));
    assert.equal(await claimUpdate(store, "123", 1), true);
    assert.equal(await claimUpdate(store, "123", 1), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

test("demo mode never starts the live Telegram bot even with a token", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "engagent-bot-"));
  try {
    const preload = path.join(dir, "deny-network.cjs");
    await writeFile(preload, 'globalThis.fetch = async () => { throw new Error("NETWORK_FORBIDDEN_IN_TEST"); }; setTimeout(() => process.exit(99), 1000).unref();');
    const result = await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
      const child = spawn(process.execPath, ["--require", preload, "--import", "tsx", "bot/run.ts"], { env: { ...process.env, ENGAGENT_DEMO: "1", ENGAGENT_DATA: path.join(dir, "state.json"), TELEGRAM_BOT_TOKEN: "123:test-only", TELEGRAM_ALLOWED_CHAT_IDS: "" }, stdio: ["ignore", "pipe", "pipe"] });
      let output = "";
      child.stdout.on("data", c => { output += c; }); child.stderr.on("data", c => { output += c; });
      child.on("error", reject); child.on("exit", code => resolve({ code, output }));
    });
    assert.equal(result.code, 1);
    assert.match(result.output, /disabled in demo mode/);
    assert.doesNotMatch(result.output, /NETWORK_FORBIDDEN/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

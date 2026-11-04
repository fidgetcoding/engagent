try { process.loadEnvFile(); } catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
}
import { apifyRunner } from "../lib/scan";
import { fileStore } from "../lib/store";
import { handleButton, handleText, type Deps, type Reply } from "./agent";
import { claudeInterpreter } from "./interpret";
import { claimUpdate, getUpdateOffset, splitText } from "./telegram";
import { isRecord } from "../lib/validation";

if (process.env.ENGAGENT_DEMO !== "0") {
  console.error("The live bot is disabled in demo mode. Set ENGAGENT_DEMO=0 for real use.");
  process.exit(1);
}
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token || !/^\d+:/.test(token)) { console.error("Set TELEGRAM_BOT_TOKEN first. See .env.example."); process.exit(1); }
const botId = token.split(":")[0];
const allowed = new Set((process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean));
const api = async (method: string, body: unknown): Promise<unknown> => {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(45000) });
  const j: unknown = await r.json();
  if (!r.ok || !isRecord(j) || j.ok !== true) throw new Error(`Telegram ${method}: HTTP ${r.status}`);
  return j.result;
};
const send = async (chat_id: number, r: Reply) => {
  const chunks = splitText(r.text);
  for (let i = 0; i < chunks.length; i++) await api("sendMessage", {
    chat_id, text: chunks[i], disable_web_page_preview: true,
    ...(r.buttons && i === chunks.length - 1 ? { reply_markup: { inline_keyboard: r.buttons.map(row => row.map(b => ({ text: b.text, callback_data: b.data }))) } } : {}),
  });
};
const deps: Deps = {
  store: fileStore(),
  runner: process.env.APIFY_TOKEN ? apifyRunner(process.env.APIFY_TOKEN) : null,
  interpret: process.env.ANTHROPIC_API_KEY ? claudeInterpreter(process.env.ANTHROPIC_API_KEY) : undefined,
};

async function main() {
  console.log(`Engagent bot running. ${allowed.size} allowed chat(s).`);
  for (;;) {
    let updates: unknown;
    try {
      const offset = getUpdateOffset(await deps.store.read(), botId);
      updates = await api("getUpdates", { offset, timeout: 30, allowed_updates: ["message", "callback_query"] });
      if (!Array.isArray(updates)) throw new Error("Invalid Telegram update list");
    } catch { console.error("Telegram polling failed; retrying in 5 seconds."); await new Promise(r => setTimeout(r, 5000)); continue; }
    for (const u of updates as unknown[]) {
      if (!isRecord(u) || typeof u.update_id !== "number") continue;
      const callback = isRecord(u.callback_query) ? u.callback_query : null;
      const message = isRecord(u.message) ? u.message : (callback && isRecord(callback.message) ? callback.message : null);
      const chatId = message && isRecord(message.chat) ? message.chat.id : undefined;
      try {
        if (!await claimUpdate(deps.store, botId, u.update_id)) continue;
        if (typeof chatId !== "number" || !Number.isSafeInteger(chatId)) continue;
        // Only an exact /whoami command is available outside the allowlist.
        if (!allowed.has(String(chatId))) {
          if (!callback && typeof message?.text === "string" && /^\/whoami(?:@\w+)?\s*$/i.test(message.text)) {
            await send(chatId, { text: `Your chat id: ${chatId}. Add it to TELEGRAM_ALLOWED_CHAT_IDS.` });
          }
          continue;
        }
        if (callback && typeof callback.id === "string") {
          await api("answerCallbackQuery", { callback_query_id: callback.id, text: await handleButton(callback.data, deps) });
        } else if (typeof message?.text === "string") {
          for (const r of await handleText(message.text, chatId, deps)) await send(chatId, r);
        }
      } catch {
        console.error("Telegram update failed. Check storage and provider availability; the update will not replay.");
        if (typeof chatId === "number" && allowed.has(String(chatId))) {
          try { await send(chatId, { text: "That command could not be confirmed. Check /board, /finds or /spend before trying again." }); }
          catch { console.error("Could not deliver the failure notice."); }
        }
      }
    }
  }
}
main().catch(() => { console.error("Bot stopped unexpectedly."); process.exitCode = 1; });

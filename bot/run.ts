try { process.loadEnvFile(); } catch { /* no .env file */ }
import { apifyRunner } from "../lib/scan";
import { fileStore } from "../lib/store";
import { handleButton, handleText, type Deps, type Reply } from "./agent";
import { claudeInterpreter } from "./interpret";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) { console.error("Set TELEGRAM_BOT_TOKEN first. See .env.example."); process.exit(1); }
const allowed = new Set((process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean));
const api = async (method: string, body: unknown) => {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!j.ok) throw new Error(`Telegram ${method}: ${j.description}`);
  return j.result;
};
const send = (chat_id: number, r: Reply) => api("sendMessage", { chat_id, text: r.text, disable_web_page_preview: true, ...(r.buttons ? { reply_markup: { inline_keyboard: r.buttons.map((row) => row.map((b) => ({ text: b.text, callback_data: b.data }))) } } : {}) });

const deps: Deps = {
  store: fileStore(),
  runner: process.env.APIFY_TOKEN ? apifyRunner(process.env.APIFY_TOKEN) : null,
  interpret: process.env.ANTHROPIC_API_KEY ? claudeInterpreter(process.env.ANTHROPIC_API_KEY) : undefined,
};

async function main() {
  console.log(`Engagent bot running. ${allowed.size} allowed chat(s).`);
  let offset = 0;
  for (;;) {
    let updates: any[] = [];
    try { updates = await api("getUpdates", { offset, timeout: 30, allowed_updates: ["message", "callback_query"] }); }
    catch (e) { console.error((e as Error).message); await new Promise((r) => setTimeout(r, 5000)); continue; }
    for (const u of updates) {
      offset = u.update_id + 1;
      try {
        const chatId: number | undefined = u.message?.chat.id ?? u.callback_query?.message?.chat.id;
        if (chatId === undefined) continue;
        // Locked by default: strangers can only learn their own id.
        if (!allowed.has(String(chatId))) {
          if (u.message?.text?.startsWith("/whoami")) await send(chatId, { text: `Your chat id: ${chatId}. Add it to TELEGRAM_ALLOWED_CHAT_IDS.` });
          continue;
        }
        if (u.callback_query) await api("answerCallbackQuery", { callback_query_id: u.callback_query.id, text: await handleButton(u.callback_query.data, deps) });
        else if (u.message?.text) for (const r of await handleText(u.message.text, chatId, deps)) await send(chatId, r);
      } catch (e) { console.error((e as Error).message); }
    }
  }
}
main();

import type { State } from "../lib/types";
import type { Store } from "../lib/store";

// Telegram retains updates for at most 24h and can randomize IDs after a week idle.
export function getUpdateOffset(state: State, botId: string, now = Date.now()) {
  const updated = state.telegramOffsetTimes?.[botId];
  return updated === undefined || now - updated >= 86400000 ? 0 : (state.telegramOffsets?.[botId] ?? 0);
}

// Persist before acting: an interrupted paid command must not replay on restart.
export async function claimUpdate(store: Store, botId: string, updateId: number) {
  if (!/^\d+$/.test(botId) || !Number.isSafeInteger(updateId) || updateId < 0) return false;
  let claimed = false;
  await store.update(state => {
    if (getUpdateOffset(state, botId) > updateId) return state;
    claimed = true;
    return { ...state, telegramOffsets: { ...state.telegramOffsets, [botId]: updateId + 1 }, telegramOffsetTimes: { ...state.telegramOffsetTimes, [botId]: Date.now() } };
  });
  return claimed;
}

// Telegram's text limit counts UTF-16 units; avoid splitting a surrogate pair.
export function splitText(text: string, limit = 4000): string[] {
  if (!Number.isSafeInteger(limit) || limit < 2) throw new Error("Invalid text limit");
  const parts: string[] = [];
  while (text.length > limit) {
    let end = limit;
    const code = text.charCodeAt(end - 1);
    if (code >= 0xd800 && code <= 0xdbff) end--;
    parts.push(text.slice(0, end)); text = text.slice(end);
  }
  parts.push(text || "No response.");
  return parts;
}

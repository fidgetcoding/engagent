import { DIRECTION_KINDS, PLATFORMS, type Action, type BrandConfig, type Card, type Direction, type Find, type Metric, type State } from "./types";

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const string = (v: unknown, max: number, empty = false): v is string => typeof v === "string" && v.length <= max && (empty || v.trim().length > 0);
const member = (v: unknown, values: readonly string[]) => typeof v === "string" && values.includes(v);
const id = (v: unknown): v is string => string(v, 128);
const nonnegative = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const platforms = (v: unknown) => Array.isArray(v) && v.every(p => member(p, PLATFORMS)) && new Set(v).size === v.length;
export const dateOnly = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const timestamp = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));
export const httpUrl = (v: unknown): v is string => {
  if (!string(v, 2048)) return false;
  try { const url = new URL(v); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
};
const direction = (v: unknown): v is Direction => isRecord(v) && member(v.kind, DIRECTION_KINDS) && string(v.value, 300) && (v.kind !== "reference" || httpUrl(v.value));
const metric = (v: unknown): v is Metric => isRecord(v) && member(v.platform, PLATFORMS) && [v.views, v.likes, v.comments, v.shares].every(n => nonnegative(n) && Number.isSafeInteger(n)) && timestamp(v.at);
const card = (v: unknown): v is Card => isRecord(v) && id(v.id) && string(v.title, 300) && string(v.type, 100) && string(v.stage, 100) && platforms(v.platforms) && (v.due === null || dateOnly(v.due)) && string(v.brief, 20000, true) && member(v.briefStatus, ["none", "pending", "approved", "changes"]) && (v.sourceFindId === null || id(v.sourceFindId)) && Array.isArray(v.metrics) && v.metrics.every(metric);
const find = (v: unknown): v is Find => isRecord(v) && id(v.id) && member(v.platform, PLATFORMS) && httpUrl(v.url) && string(v.author, 300) && string(v.caption, 280, true) && nonnegative(v.views) && string(v.matched, 300) && member(v.status, ["new", "approved", "skipped"]) && timestamp(v.foundAt);

// Persisted data is untrusted too. Reject it without replacing the original file.
export const isState = (v: unknown): v is State => isRecord(v) &&
  (v.telegramOffsetTimes === undefined || (isRecord(v.telegramOffsetTimes) && Object.entries(v.telegramOffsetTimes).every(([key, n]) => /^\d+$/.test(key) && nonnegative(n) && Number.isSafeInteger(n)))) &&
  (v.telegramOffsets === undefined || (isRecord(v.telegramOffsets) && Object.entries(v.telegramOffsets).every(([key, n]) => /^\d+$/.test(key) && nonnegative(n) && Number.isSafeInteger(n)))) && platforms(v.platforms) &&
  Array.isArray(v.directions) && v.directions.every(direction) &&
  Array.isArray(v.finds) && v.finds.every(find) && new Set(v.finds.map(f => f.id)).size === v.finds.length &&
  Array.isArray(v.cards) && v.cards.every(card) && new Set(v.cards.map(c => c.id)).size === v.cards.length &&
  isRecord(v.spend) && (v.spend.month === "" || (typeof v.spend.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v.spend.month))) && nonnegative(v.spend.usd);

export function isBrowserAction(a: unknown, config: BrandConfig): a is Action {
  if (!isRecord(a)) return false;
  switch (a.type) {
    case "direction.add": case "direction.remove": return direction(a.direction);
    case "platform.toggle": return member(a.platform, PLATFORMS);
    case "find.approve": return id(a.id) && id(a.cardId) && a.firstStage === config.stages[0] && a.contentType === config.contentTypes[0];
    case "find.skip": return id(a.id);
    case "card.add": return card(a.card) && config.stages.includes(a.card.stage) && config.contentTypes.includes(a.card.type) && a.card.briefStatus === "none" && a.card.metrics.length === 0 && a.card.sourceFindId === null;
    case "card.move": return id(a.id) && member(a.stage, config.stages);
    case "card.due": return id(a.id) && (a.due === null || dateOnly(a.due));
    case "card.brief": return id(a.id) && string(a.brief, 20000, true) && a.approvals === config.approvals;
    case "card.review": return config.approvals && id(a.id) && member(a.decision, ["approved", "changes"]);
    case "metric.log": return id(a.id) && metric(a.metric);
    default: return false;
  }
}

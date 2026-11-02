import type { Action, Direction, State } from "./types";

const sameDirection = (a: Direction, b: Direction) => a.kind === b.kind && a.value.toLowerCase() === b.value.toLowerCase();
export const cleanValue = (v: string) => v.trim().replace(/^[#@]/, "");

// Pure so the browser-only demo and the real server share every rule.
export function applyAction(s: State, a: Action): State {
  const card = (id: string, fn: (c: State["cards"][number]) => State["cards"][number]) => ({ ...s, cards: s.cards.map((c) => (c.id === id ? fn(c) : c)) });
  switch (a.type) {
    case "direction.add": {
      const value = a.direction.kind === "reference" ? a.direction.value.trim() : cleanValue(a.direction.value);
      const direction = { kind: a.direction.kind, value };
      if (!value || s.directions.some((d) => sameDirection(d, direction))) return s;
      return { ...s, directions: [...s.directions, direction] };
    }
    case "direction.remove":
      return { ...s, directions: s.directions.filter((d) => !sameDirection(d, a.direction)) };
    case "platform.toggle":
      return { ...s, platforms: s.platforms.includes(a.platform) ? s.platforms.filter((p) => p !== a.platform) : [...s.platforms, a.platform] };
    case "find.add": {
      const seen = new Set(s.finds.map((f) => f.url));
      const fresh = a.finds.filter((f) => !seen.has(f.url) && seen.add(f.url));
      return { ...s, finds: [...fresh, ...s.finds] };
    }
    case "find.approve": {
      const f = s.finds.find((x) => x.id === a.id);
      if (!f || f.status !== "new") return s;
      return {
        ...s,
        finds: s.finds.map((x) => (x.id === a.id ? { ...x, status: "approved" as const } : x)),
        cards: [{ id: a.cardId, title: f.caption.slice(0, 80) || `Idea from ${f.author}`, type: a.contentType, stage: a.firstStage, platforms: [f.platform], due: null, brief: `Reference: ${f.url}`, briefStatus: "none", sourceFindId: f.id, metrics: [] }, ...s.cards],
      };
    }
    case "find.skip":
      return { ...s, finds: s.finds.map((x) => (x.id === a.id && x.status === "new" ? { ...x, status: "skipped" as const } : x)) };
    case "card.add":
      return { ...s, cards: [a.card, ...s.cards] };
    case "card.move":
      return card(a.id, (c) => ({ ...c, stage: a.stage }));
    case "card.due":
      return card(a.id, (c) => ({ ...c, due: a.due }));
    case "card.brief":
      return card(a.id, (c) => ({ ...c, brief: a.brief, briefStatus: a.approvals ? "pending" : "none" }));
    case "card.review":
      return card(a.id, (c) => ({ ...c, briefStatus: a.decision }));
    case "metric.log":
      return card(a.id, (c) => ({ ...c, metrics: [...c.metrics, a.metric] }));
    case "spend.add":
      return { ...s, spend: s.spend.month === a.month ? { month: a.month, usd: s.spend.usd + a.usd } : { month: a.month, usd: a.usd } };
  }
}

export function initialState(cfg: { platforms: State["platforms"]; directions: Direction[] }): State {
  return { platforms: cfg.platforms, directions: cfg.directions, finds: [], cards: [], spend: { month: "", usd: 0 } };
}

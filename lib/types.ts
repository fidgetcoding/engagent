export const PLATFORMS = ["tiktok", "instagram", "youtube"] as const;
export type Platform = (typeof PLATFORMS)[number];
export const DIRECTION_KINDS = ["account", "hashtag", "reference", "topic", "avoid"] as const;
export type DirectionKind = (typeof DIRECTION_KINDS)[number];

export interface Direction { kind: DirectionKind; value: string }
export interface Caps { perRunUsd: number; perMonthUsd: number; resultsPerSearch: number }
export interface BrandConfig {
  brand: { name: string; tagline: string; accent: string; accentSoft: string; font: string };
  voice: string;
  platforms: Platform[];
  stages: string[];
  contentTypes: string[];
  approvals: boolean;
  directions: Direction[];
  caps: Caps;
}
export interface Find {
  id: string; platform: Platform; url: string; author: string; caption: string;
  views: number; matched: string; status: "new" | "approved" | "skipped"; foundAt: string;
}
export interface Metric { platform: Platform; views: number; likes: number; comments: number; shares: number; at: string }
export type BriefStatus = "none" | "pending" | "approved" | "changes";
export interface Card {
  id: string; title: string; type: string; stage: string; platforms: Platform[]; due: string | null;
  brief: string; briefStatus: BriefStatus; sourceFindId: string | null; metrics: Metric[];
}
export interface State {
  platforms: Platform[]; directions: Direction[]; finds: Find[]; cards: Card[];
  spend: { month: string; usd: number };
}
export type Action =
  | { type: "direction.add"; direction: Direction }
  | { type: "direction.remove"; direction: Direction }
  | { type: "platform.toggle"; platform: Platform }
  | { type: "find.add"; finds: Find[] }
  | { type: "find.approve"; id: string; cardId: string; firstStage: string; contentType: string }
  | { type: "find.skip"; id: string }
  | { type: "card.add"; card: Card }
  | { type: "card.move"; id: string; stage: string }
  | { type: "card.due"; id: string; due: string | null }
  | { type: "card.brief"; id: string; brief: string; approvals: boolean }
  | { type: "card.review"; id: string; decision: "approved" | "changes" }
  | { type: "metric.log"; id: string; metric: Metric }
  | { type: "spend.add"; month: string; usd: number };

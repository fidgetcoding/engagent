import config from "../engagent.config";
import type { Find, State } from "./types";

const find = (n: number, platform: Find["platform"], author: string, caption: string, views: number, matched: string): Find => ({ id: `demo-f${n}`, platform, url: `https://example.com/sample/${n}`, author, caption, views, matched, status: "new", foundAt: "2026-11-02T14:00:00.000Z" });

export const sampleFinds: Find[] = [
  find(1, "tiktok", "slowpour.sam", "POV: your regular orders the thing you just ran out of", 412000, "#coffeetok"),
  find(2, "instagram", "crema.club", "Five milk textures, ranked by how much they forgive you", 88000, "#homebarista"),
  find(3, "youtube", "the.grind.report", "We tried every latte art tutorial and failed in new ways", 231000, "latte art fails"),
  find(4, "tiktok", "morningbatch", "The sound of a perfect tamp, no talking", 1250000, "#coffeetok"),
];

export function demoState(): State {
  const stages = config.stages;
  const at = (i: number) => stages[Math.min(i, stages.length - 1)];
  const last = stages[stages.length - 1];
  const c = (id: string, title: string, stage: string, due: string | null, extra = {}) => ({ id, title, type: config.contentTypes[0], stage, platforms: ["tiktok" as const], due, brief: "", briefStatus: "none" as const, sourceFindId: null, metrics: [], ...extra });
  return {
    platforms: config.platforms, directions: config.directions, finds: sampleFinds, spend: { month: "2026-11", usd: 3.4 },
    cards: [
      c("demo-1", "Regulars order wrong on purpose", at(0), "2026-11-12"),
      c("demo-2", "Roaster reacts to your worst grinder", at(1), "2026-11-09"),
      c("demo-3", "Sixty seconds behind the Tuesday rush", at(Math.min(3, stages.length - 2)), "2026-11-06", { brief: "Hook on the milk steam sound. No voiceover until second five. End on the regular's order.", briefStatus: "pending" }),
      c("demo-4", "The latte art we refuse to serve", last, "2026-10-28", { metrics: [
        { platform: "tiktok", views: 184000, likes: 21300, comments: 940, shares: 3100, at: "2026-10-30T12:00:00.000Z" },
        { platform: "instagram", views: 52000, likes: 6100, comments: 210, shares: 480, at: "2026-10-30T12:00:00.000Z" } ], platforms: ["tiktok", "instagram"] }),
      c("demo-5", "Decaf is not a personality", last, "2026-10-21", { metrics: [ { platform: "tiktok", views: 96000, likes: 8800, comments: 512, shares: 760, at: "2026-10-23T12:00:00.000Z" } ] }),
    ],
  };
}

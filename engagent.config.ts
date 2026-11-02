import type { BrandConfig } from "./lib/types";

// Everything brand-specific lives here. Swap this file to re-skin a deployment.
const config: BrandConfig = {
  brand: { name: "Fernhouse Coffee", tagline: "Small-batch coffee, big opinions", accent: "#1f6f54", accentSoft: "#e3f1ea", font: "Georgia, 'Times New Roman', serif" },
  voice: "Warm, dry and curious. Talks like a barista who remembers your order.",
  platforms: ["tiktok", "instagram", "youtube"],
  stages: ["Idea", "Scripting", "Filming", "Review", "Scheduled", "Posted"],
  contentTypes: ["Short video", "Carousel", "Story", "Long video"],
  approvals: true,
  directions: [
    { kind: "hashtag", value: "coffeetok" },
    { kind: "hashtag", value: "homebarista" },
    { kind: "account", value: "jameshoffmann" },
    { kind: "topic", value: "latte art fails" },
    { kind: "avoid", value: "instant coffee ads" },
  ],
  caps: { perRunUsd: 1, perMonthUsd: 20, resultsPerSearch: 10 },
};

export default config;

import type { BrandConfig } from "../lib/types";

// A second sample brand. Copy over engagent.config.ts to re-skin the whole app.
const config: BrandConfig = {
  brand: { name: "Peakline Outdoors", tagline: "Gear for people who check the forecast twice", accent: "#b4471f", accentSoft: "#f8e9e1", font: "'Trebuchet MS', Verdana, sans-serif" },
  voice: "Plainspoken and outdoorsy. Practical first, one joke at most.",
  platforms: ["instagram", "youtube"],
  stages: ["Pitch", "Shoot", "Edit", "Live"],
  contentTypes: ["Reel", "Trail review"],
  approvals: false,
  directions: [{ kind: "hashtag", value: "ultralight" }, { kind: "topic", value: "gear repair" }],
  caps: { perRunUsd: 0.5, perMonthUsd: 10, resultsPerSearch: 10 },
};

export default config;

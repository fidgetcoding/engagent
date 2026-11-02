// One source of truth for every option. Modeled on the live Content HQ (board, dashboard, engage trends/formats) as of 2026-10-28, with a sample brand.
window.KIT = {
  product: { name: "Engagent", parse: "eng + agent", line: "Your content team's agent: it finds what to post, keeps the board moving, and tracks what worked." },
  brand: { name: "Fernhouse Coffee", handle: "@fernhouse", platforms: ["TikTok", "Instagram", "YouTube"], seats: [
    { id: "ava", name: "Ava Reyes", initials: "AR", role: "Content lead" }, { id: "jun", name: "Jun Lee", initials: "JL", role: "Editor" },
    { id: "mika", name: "Mika Kato", initials: "MK", role: "Shooter" }, { id: "sol", name: "Sol Ortiz", initials: "SO", role: "Client approver" } ] },
  today: "2026-11-02",
  stages: [
    { id: "idea", name: "Idea" }, { id: "brief", name: "Brief" }, { id: "approved", name: "Approved", note: "brief signed off" },
    { id: "assets", name: "Assets" }, { id: "editing", name: "Editing" }, { id: "review", name: "Review", note: "final cut with the client" }, { id: "posted", name: "Posted" } ],
  shortPipeline: { types: ["Carousel", "Story"], stages: ["idea", "assets", "editing", "posted"], note: "Carousels and stories skip the brief stages." },
  categories: {
    type: ["Reel", "Carousel", "Story", "Long video"],
    source: { Trend: "picked from Trends", Format: "picked from Formats", Reference: "from a saved video reference", Original: "team idea" },
    priority: ["Top", "Normal", "Later"],
    approval: ["None", "Pending", "Approved", "Changes requested"] },
  cards: [
    { id: "c1", title: "Mirror-walk outfit change, barista edition", note: "Two looks on the beat drop, shot in the shop mirror.", stage: "idea", type: "Reel", source: "Trend", priority: "Top", assignee: "ava", due: "2026-11-06", slot: "2026-11-08 18:00", platforms: ["TikTok", "Instagram"], tasks: [0, 3], refs: 2, daysInStage: 1, approval: "None" },
    { id: "c2", title: "Five cafés ranked by how long you'd stay", note: "Text-on-black hook, three seconds.", stage: "idea", type: "Carousel", source: "Format", priority: "Normal", assignee: "jun", due: "2026-11-09", slot: null, platforms: ["Instagram"], tasks: [0, 2], refs: 1, daysInStage: 4, approval: "None" },
    { id: "c3", title: "Morning open, no talking", note: "Lights, grinder, first pour. ASMR pacing.", stage: "brief", type: "Reel", source: "Original", priority: "Top", assignee: "mika", due: "2026-11-04", slot: "2026-11-05 08:00", platforms: ["TikTok", "Instagram", "YouTube"], tasks: [2, 5], refs: 3, daysInStage: 2, approval: "Pending" },
    { id: "c4", title: "Regulars order wrong on purpose", note: "Street-interview format inside the shop.", stage: "approved", type: "Reel", source: "Format", priority: "Normal", assignee: "ava", due: "2026-11-07", slot: "2026-11-10 19:00", platforms: ["TikTok"], tasks: [1, 4], refs: 1, daysInStage: 3, approval: "Approved" },
    { id: "c5", title: "Winter menu, styled three ways", note: "Same drink, three sets.", stage: "assets", type: "Carousel", source: "Reference", priority: "Normal", assignee: "mika", due: "2026-11-05", slot: "2026-11-06 12:00", platforms: ["Instagram"], tasks: [3, 6], refs: 4, daysInStage: 1, approval: "None" },
    { id: "c6", title: "Sound-on latte art transition", note: "Cut on the pour, trending audio.", stage: "editing", type: "Reel", source: "Trend", priority: "Top", assignee: "jun", due: "2026-11-03", slot: "2026-11-04 18:00", platforms: ["TikTok", "Instagram"], tasks: [4, 5], refs: 2, daysInStage: 5, approval: "Approved" },
    { id: "c7", title: "Roaster reacts to your worst grinder", note: "Stitch-style reaction, long cut for YouTube.", stage: "editing", type: "Long video", source: "Original", priority: "Later", assignee: "mika", due: "2026-11-14", slot: null, platforms: ["YouTube"], tasks: [2, 7], refs: 1, daysInStage: 2, approval: "Approved" },
    { id: "c8", title: "Behind the Saturday rush, 60 seconds", note: "Final cut sent to Sol.", stage: "review", type: "Reel", source: "Original", priority: "Normal", assignee: "ava", due: "2026-11-02", slot: "2026-11-03 09:00", platforms: ["TikTok", "Instagram"], tasks: [6, 6], refs: 0, daysInStage: 1, approval: "Pending", comments: 3 },
    { id: "c9", title: "Duet the viral pour", stage: "posted", type: "Reel", source: "Trend", priority: "Top", assignee: "jun", due: "2026-10-30", postedAt: "2026-10-30", platforms: ["TikTok"], tasks: [4, 4], refs: 1, daysInStage: 0, approval: "Approved" },
    { id: "c10", title: "Week in twelve frames", stage: "posted", type: "Carousel", source: "Original", priority: "Normal", assignee: "mika", due: "2026-10-28", postedAt: "2026-10-28", platforms: ["Instagram"], tasks: [3, 3], refs: 0, daysInStage: 0, approval: "None" } ],
  trends: {
    rule: "TikTok posts under 7 days old, 10k+ views, ranked by views ÷ followers. 16 per run, grouped by category.",
    schedule: "Mondays 7:00 AM", categories: ["Lifestyle", "Food & drink", "Local", "Music"],
    items: [
      { id: "t1", category: "Lifestyle", title: "Mirror walk, fit flips on the beat", author: "@lena.wears", followers: 64000, views: 2400000, outlier: 38, ageDays: 3, flip: "Two looks in the shop mirror on the drop.", difficulty: "Easy", state: "new" },
      { id: "t2", category: "Food & drink", title: "Ranking menu items by how hard they are to make", author: "@thebrewlist", followers: 52000, views: 1100000, outlier: 21, ageDays: 5, flip: "Your baristas rank the menu.", difficulty: "Medium", state: "new" },
      { id: "t3", category: "Local", title: "Silent POV walk to work", author: "@kaito.daily", followers: 75000, views: 910000, outlier: 12, ageDays: 2, place: "Shimokitazawa", flip: "Walk from the subway to your door.", difficulty: "Easy", state: "picked" },
      { id: "t4", category: "Lifestyle", title: "Before and after lighting, same product", author: "@goldhour", followers: 70000, views: 1900000, outlier: 27, ageDays: 4, flip: "One cup, window light vs shop light.", difficulty: "Medium", state: "new" },
      { id: "t5", category: "Food & drink", title: "Hands-only process cut", author: "@clay.and.co", followers: 71000, views: 640000, outlier: 9, ageDays: 6, flip: "Eight hand shots from bean to cup.", difficulty: "Hard", state: "new" },
      { id: "t6", category: "Music", title: "Reply-to-comment remake", author: "@studio.fern", followers: 32000, views: 480000, outlier: 15, ageDays: 1, flip: "Answer your best comment with a remake.", difficulty: "Easy", state: "passed" } ] },
  formats: {
    rule: "A format counts when several different creators used it in the last 7 days. Rising = most posts in the last 3 days.",
    schedule: "Mondays 7:30 AM",
    items: [
      { id: "f1", market: "US", kind: "Lifestyle", name: "Get ready with me, location tagged", creators: 14, posts: 31, views: 8200000, momentum: "Rising", sound: "original audio" },
      { id: "f2", market: "US", kind: "Meme", name: "Three-second hook, text on black", creators: 9, posts: 22, views: 5100000, momentum: "Rising", sound: "Espresso (remix)" },
      { id: "f3", market: "Japan", kind: "Place", name: "Café counter, one continuous shot", creators: 7, posts: 12, views: 2300000, momentum: "Steady", sound: "ambient" },
      { id: "f4", market: "US", kind: "Food", name: "Hands-only unboxing", creators: 5, posts: 9, views: 1400000, momentum: "Fading", sound: "ASMR" } ] },
  performance: {
    ranges: ["1D", "7D", "30D", "90D", "All"], range: "30D",
    totals: [ { k: "Followers", lifetime: 48210, period: 2810, prev: 2140 }, { k: "Views", lifetime: 9120000, period: 1284900, prev: 1088000 },
      { k: "Likes", lifetime: 702000, period: 96400, prev: 81200 }, { k: "Comments", lifetime: 21400, period: 3020, prev: 2410 },
      { k: "Shares", lifetime: 38800, period: 5900, prev: 4300 }, { k: "Saves", lifetime: 26100, period: 4100, prev: 3700 } ],
    followersDaily: [45400,45520,45610,45700,45790,45880,45960,46100,46240,46330,46480,46590,46720,46810,46950,47080,47160,47290,47380,47460,47570,47660,47720,47800,47890,47950,48010,48080,48150,48210],
    byPlatform: [ { p: "TikTok", views: 798000, followers: 31200 }, { p: "Instagram", views: 346000, followers: 14100 }, { p: "YouTube", views: 140900, followers: 2910 } ],
    byWeekday: { Mon: 0.8, Tue: 1.1, Wed: 0.9, Thu: 1.3, Fri: 1.0, Sat: 1.4, Sun: 0.7 },
    highlights: { mostViewed: "c9", bestEngagement: "c10", lowest: "c4" },
    posts: [ { card: "c9", platform: "TikTok", views: 412000, likes: 51200, comments: 1840, shares: 6100, saves: 3900, vsMedian: 4.1 },
      { card: "c10", platform: "Instagram", views: 88000, likes: 9800, comments: 420, shares: 610, saves: 2100, vsMedian: 1.6 },
      { card: "c8", platform: "TikTok", views: 61000, likes: 4100, comments: 190, shares: 300, saves: 220, vsMedian: 0.7 } ],
    connections: [ { p: "TikTok", state: "ok", via: "Apify", last: "today 7:04 AM" }, { p: "Instagram", state: "ok", via: "Meta Graph API", last: "today 7:02 AM" },
      { p: "YouTube", state: "warn", via: "YouTube API", last: "2 nights ago", fix: "Reconnect the channel owner" }, { p: "X", state: "off", via: "Apify", fix: "Turn on in Directions" } ] },
  directions: {
    accounts: ["@lena.wears", "@thebrewlist", "@goldhour", "@kaito.daily"],
    hashtags: ["#cafevibes", "#coffeetok", "#smallbatch", "#ootd"],
    references: [ { label: "Mirror walk we loved", url: "tiktok.com/@lena.wears/video/7432…" }, { label: "Counter one-shot", url: "instagram.com/reel/C9x…" } ],
    topics: ["third-wave coffee", "slow mornings", "neighbourhood spots"],
    avoid: ["politics", "giveaway bots", "other cafés' drama"],
    trendCategories: ["Lifestyle", "Food & drink", "Local", "Music"],
    platforms: { TikTok: true, Instagram: true, YouTube: true, X: false },
    caps: { perSearchUsd: 1, perMonthUsd: 20, spentUsd: 6.4 }, schedule: { trends: "Mon 7:00 AM", formats: "Mon 7:30 AM", performance: "Daily 7:00 AM" } },
  telegram: [
    { from: "me", text: "watch #cafevibes and never engage with giveaway bots" },
    { from: "agent", text: "Watching #cafevibes. Giveaway bots are on your never list." },
    { from: "agent", text: "Monday trends are in: 6 new, 2 easy flips.", find: "t1", buttons: ["Add to board", "Skip"] },
    { from: "me", text: "add it, Ava owns it, due thursday" },
    { from: "agent", text: "Added to Idea: Mirror-walk outfit change. Ava, due Nov 6." },
    { from: "me", text: "duet got 412k views, 51k likes" },
    { from: "agent", text: "Logged. That's 4.1× your TikTok median, best post this month." } ]
};

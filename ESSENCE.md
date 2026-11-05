# Engagent: the essence

**What it is.** A content team's agent you run yourself, from Telegram. You tell it which accounts, hashtags and topics to watch. It searches TikTok, Instagram and YouTube through your Apify account, brings back posts worth reacting to, and waits for you to tap Add to board. A small web workspace holds the board, the timeline, briefs, finds, directions and the numbers on how each post did. Your brand lives in one config file. The name splits as eng + agent.

**Who it's for.** A brand, a creator or a small social team that wants a scout and a content board without paying for a social media suite, and is fine running a Node app on an always-on machine with its own keys. There's no hosted copy. I'm not hosting anything for anyone.

**Why it exists.** I built a version of this for a music project I work on: a content board plus an engagement booster that finds posts worth replying to. It was built around that one project. I wanted the whole idea in a form any brand could set up on its own, so I rebuilt it from scratch as new code with a Telegram agent in charge.

**What's different.**

- Telegram is the front door. You can run the day from your phone: `/scan`, tap Add to board or Skip, `/move 2 Filming`, `/log 2 tiktok views=1200 likes=80`, `/spend`.
- One file is the brand. Name, colors, voice, platforms, stages, content types, approvals, what to watch and the spending caps all live in `engagent.config.ts`. A second sample brand ships in `examples/`.
- Money gets reserved before it moves. Each search books its per-search cap against the monthly cap first, two bot processes share that budget, and a failed or uncertain call keeps its reservation instead of counting as free.
- A paid search never starts from a guess. The plain-English helper can suggest a search, but only an explicit `/scan` spends anything.
- Your keys, your machine, your data. Everything sits in one JSON file on your disk, with a lock so the web app and the bot can't overwrite each other.

**How to try it.** Demo mode needs no keys and makes no paid calls:

```bash
git clone https://github.com/fidgetcoding/engagent.git
cd engagent
npm install
npm run dev
```

Open <http://localhost:3000> for a sample coffee brand. To run it for real with your own Telegram bot and Apify account, follow the eight steps in the [README](README.md).

**What works today.** Every number here traces to a recorded run:

- 32 of 32 unit and integration tests and 3 of 3 browser checks passed on the November 4 release (`367346e`), along with typecheck, the production build and `npm audit` with 0 vulnerabilities. I reran all of it on a fresh clone on November 5: same result.
- The browser checks cover all seven screens of the current app, demo reset and recovery, password-protected saves, save order, cross-site rejection and drafts kept after a failed save.
- Shared storage under load: the first version lost 19 of 20 simultaneous writes. The current one keeps 20 of 20, and 40 of 40 from two separate processes.
- The design it's heading toward, Pipeline Track, is in `docs/design/pipeline-track.html`. It won out of 126 options across five design rounds. The app UI hasn't been rebuilt to it yet.
- Telegram, Apify and Anthropic haven't been called live yet. Every test uses fakes for them.

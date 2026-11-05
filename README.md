# Engagent

A content and engagement agent any brand can run from Telegram with its own keys. Tell it what to watch, approve what it finds, plan the content and log the results.

Short version: [ESSENCE.md](ESSENCE.md). How it got built: [EVOLUTION.md](EVOLUTION.md).

There's no hosted copy, and I'm not hosting anything for anyone. You run it on your own machine with your own Telegram bot, your own Apify account and, if you want it, your own Anthropic key. Your searches get billed to you, under caps you set.

## What it is

Two pieces that share one data file on your disk:

- **A Telegram bot.** It's the front door. `/watch hashtag coffeetok` adds something to look for, `/scan` searches, `/finds` brings back posts worth reacting to with Add to board and Skip buttons, `/move 2 Filming` moves a card, `/log 2 tiktok views=1200 likes=80` records how a post did, and `/spend` tells you what this month's searches cost.
- **A web workspace.** Board, Timeline, Briefs, Finds, Directions, Performance and a Telegram preview. Once it's live, it sits behind a password.

Everything about your brand lives in one file, `engagent.config.ts`: name, colors, font, voice, platforms, stages, content types, whether briefs need approval, what to watch and how much you're willing to spend. Swap the file and it's a different brand's workspace.

The name splits as eng + agent.

## Why I made it

I built a version of this for a music project I work on: a content board that tracks what's getting made, and an engagement booster that finds posts worth replying to. It was built around that one project. I wanted the whole idea in a form other brands could pick up and set up on their own, so I rebuilt it from scratch as new code, put a Telegram agent in charge and pulled every brand detail out into one config file.

## Try it in demo mode

No keys, no login, no paid calls. You need Node.js 20.12 or newer.

```bash
git clone https://github.com/fidgetcoding/engagent.git
cd engagent
npm install
npm run dev
```

Open http://localhost:3000. Demo mode uses a sample coffee brand with big opinions. The bot doesn't run in demo mode.

## Run it for real, on your own keys

There's no Engagent server, account or sign-up. The web app and the bot both run on one always-on machine you control (a small server, a VPS, a desktop that never sleeps), because the data is one local file, `data/engagent.json`.

You'll need:

- Node.js 20.12 or newer
- A Telegram account, to make a bot with @BotFather
- An Apify account and API token, for live searches (optional)
- An Anthropic API key, for plain-English messages (optional)

These steps are written so you, or your coding agent, can follow them top to bottom:

1. **Clone and install.**

   ```bash
   git clone https://github.com/fidgetcoding/engagent.git
   cd engagent
   npm install
   ```

2. **Make it your brand.** Edit `engagent.config.ts`: `brand`, `voice`, `platforms` (`tiktok`, `instagram`, `youtube`), `stages`, `contentTypes`, `approvals`, `directions` and `caps` (`perRunUsd`, `perMonthUsd`, `resultsPerSearch`). For a head start, copy `examples/engagent.config.peakline.ts` over it and change its import from `../lib/types` to `./lib/types`.

3. **Create your `.env`.**

   ```bash
   cp .env.example .env
   ```

   Set `ENGAGENT_DEMO=0` and a long `ENGAGENT_PASSWORD` (`openssl rand -base64 24` makes one).

4. **Make a Telegram bot.** Message @BotFather, send `/newbot`, follow the prompts and put the token it gives you in `TELEGRAM_BOT_TOKEN`.

5. **Add the optional keys.** `APIFY_TOKEN` turns on live searches. `ANTHROPIC_API_KEY` lets you message the bot in plain English; it uses `claude-haiku-5-5` unless you set `ENGAGENT_MODEL`. Without an Apify token, `/scan` just tells you to add one.

6. **Build and start both processes on the same machine.**

   ```bash
   npm run build && npm start   # terminal 1: the web workspace on port 3000
   npm run bot                  # terminal 2: the Telegram bot
   ```

   If they run from different directories, give both the same absolute `ENGAGENT_DATA` path.

7. **Let yourself in.** Message your bot `/whoami`. Add the chat id it sends back to `TELEGRAM_ALLOWED_CHAT_IDS` (comma separated for more than one) and restart the bot. Then send `/help`.

8. **Open the workspace.** Go to http://localhost:3000. Your browser asks for a username and password: any username works, and the password is your `ENGAGENT_PASSWORD`. Put it behind HTTPS before you open it to the internet.

## Core features

- **Directions.** Accounts, hashtags, references, topics and things to avoid. Set them in the config, on the Directions screen, or with `/watch` and `/unwatch` in Telegram.
- **Scans on Apify.** TikTok searches hashtags, accounts and topics. Instagram searches hashtags. YouTube searches topics and hashtags. Each find comes back with its author, views, caption, link and what it matched.
- **You approve finds.** Every find lands in Telegram with Add to board and Skip. No find reaches the board until you tap Add to board.
- **Board, Timeline and Briefs.** Cards move through your own stages. With `approvals: true`, a brief goes out for approval and comes back approved or with changes requested.
- **Performance logging.** Views, likes, comments and shares per card and platform, from the web or `/log` in Telegram.
- **Spending caps.** A per-search cap and a monthly cap, reserved before any money moves. `/spend` shows where the month stands.
- **Plain English, with a guardrail.** With an Anthropic key, the bot turns a message like "add latte art fails as a topic" into one of its own commands, so it goes through the same checks. A paid search still only starts when you send `/scan` yourself.
- **Locked by default.** The web workspace refuses to open in live mode until you set a password, and the bot only talks to chat ids on your allowlist.
- **One file per brand.** A second sample brand ships in `examples/`.

## Spending

Before each search, Engagent durably reserves `caps.perRunUsd` under `caps.perMonthUsd`. Concurrent bot processes share that budget. Confirmed successful runs settle to the reported cost; failed or uncertain calls keep their full reservation. Results persist after each search, so a later failure does not discard earlier finds.

Engagent sends Apify's `maxTotalChargeUsd`, which applies to pay-per-event actors. Other pricing models and separate platform fees can exceed that request; check the selected actors' pricing before live use. A reported charge above the requested ceiling is recorded and stops that scan. See [Apify's run options](https://docs.apify.com/api/client/js/reference/interface/TaskCallOptions#maxTotalChargeUsd).

The bot is disabled in demo mode. Plain-English requests for paid searches return instructions to send `/scan` explicitly.

## Status

Early. On the November 4 release (`367346e`), 32 unit and integration tests and 3 browser checks passed, along with typecheck, the production build and `npm audit` with 0 vulnerabilities. I ran the same set again on a fresh clone on November 5 and got the same result. Every test uses temporary files and fake provider responses: the bot hasn't been run against live Telegram, Apify or Anthropic yet. See [docs/BUILD-HISTORY.md](docs/BUILD-HISTORY.md) for the details.

## Storage and recovery

Use the same absolute `ENGAGENT_DATA` path for the web server and bot if they run from different directories. The default remains `data/engagent.json` in the working directory. Both processes must use this version: older writers do not honor the lock.

Writes use an inter-process lock, an atomic file replacement and disk sync. A lock left by a killed process becomes recoverable after 10 seconds; ordinary failures release it immediately. Do not remove an active `.lock` directory manually. Back up the JSON file regularly. Invalid existing data is rejected and left intact; restore or repair a copy before restarting.

Telegram update offsets are stored with workspace data before commands execute. This prevents replay after a restart, including accidental repeat paid scans. Saved offsets expire after 24 hours without a claimed update; Telegram discards older updates and can randomize IDs after a quiet week. A crash between claiming an update and completing it can leave that command unfinished; check `/board`, `/finds` and `/spend` before retrying. Uncertain scan reservations stay charged to that month's budget until manually reconciled against Apify billing while both processes are stopped. No automatic refund or paid-request retry occurs.

The Telegram allowlist trusts the entire chat, including every member of an allowed group. Use private chat IDs when access should be limited to one person. Serve real deployments over HTTPS because Basic authentication carries a reusable password. A reverse proxy must preserve the public Host and request scheme for same-origin mutation checks.

## Verify locally

```bash
npm test
npm run typecheck
npm run build
npm run test:browser
```

Run them in that order: the browser checks start the production build. Tests use temporary files and fake provider responses. Browser checks need Playwright Chromium installed, start their own localhost servers, and block outside browser requests. Unit tests use at most two files concurrently; browser tests run sequentially. There is no separate ESLint configuration. The scoped PostCSS override addresses advisories in Next's bundled version; recheck it when upgrading Next.

## Next: the new design

The chosen design is `docs/design/pipeline-track.html` (open it in a browser; add `?screen=board`, `list`, `timeline`, `calendar`, `trends`, `formats`, `performance`, `directions` or `telegram`). The board is one transit line running through the stages to a terminus. The app UI hasn't been rebuilt to it yet.

## License

MIT. See [LICENSE](LICENSE).

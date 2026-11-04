# Engagent

A Telegram agent and content workspace any brand can run with its own keys. Tell it what to watch, approve what it finds, plan the content and log the results.

## Try it

Use Node.js 20.12 or newer (the bot uses Node's built-in `.env` loader).

```bash
npm install
npm run dev
```

Open http://localhost:3000. Demo mode uses a sample brand, with no login, keys or paid calls.

## Make it yours

1. Edit `engagent.config.ts`: brand, voice, platforms, stages, approvals, directions and spending caps. `examples/` holds a second brand.
2. Copy `.env.example` to `.env`, set `ENGAGENT_DEMO=0` and `ENGAGENT_PASSWORD`.
3. Create a bot with @BotFather and set `TELEGRAM_BOT_TOKEN`.
4. Run `npm run build && npm start`, and `npm run bot` in a second terminal. Both must run on the same always-on machine, because data is one local file, `data/engagent.json`.
5. Message the bot `/whoami`, add the id to `TELEGRAM_ALLOWED_CHAT_IDS`, and restart it.

`APIFY_TOKEN` turns on live searches. `ANTHROPIC_API_KEY` turns on plain-English messages.

## Spending

Before each search, Engagent durably reserves `caps.perRunUsd` under `caps.perMonthUsd`. Concurrent bot processes share that budget. Confirmed successful runs settle to the reported cost; failed or uncertain calls keep their full reservation. Results persist after each search, so a later failure does not discard earlier finds.

Engagent sends Apify's `maxTotalChargeUsd`, which applies to pay-per-event actors. Other pricing models and separate platform fees can exceed that request; check the selected actors' pricing before live use. A reported charge above the requested ceiling is recorded and stops that scan. See [Apify's run options](https://docs.apify.com/api/client/js/reference/interface/TaskCallOptions#maxTotalChargeUsd).

The bot is disabled in demo mode. Plain-English requests for paid searches return instructions to send `/scan` explicitly.

## Status

Early. Local tests cover concurrency, caps, API inputs, authentication, provider failures and browser behavior. See `docs/BUILD-HISTORY.md` for what has and hasn't run against live services.

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

Tests use temporary files and fake provider responses. Browser checks need Playwright Chromium installed, start their own localhost servers, and block outside browser requests. Unit tests use at most two files concurrently; browser tests run sequentially. There is no separate ESLint configuration. The scoped PostCSS override addresses advisories in Next's bundled version; recheck it when upgrading Next.

## Next: the new design

The chosen design is `docs/design/pipeline-track.html` (open it in a browser; add `?screen=board`, `list`, `timeline`, `calendar`, `trends`, `formats`, `performance`, `directions` or `telegram`). The app UI hasn't been rebuilt to it yet.

## License

MIT

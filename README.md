# Engagent

A Telegram agent and content workspace any brand can run with its own keys. Tell it what to watch, approve what it finds, plan the content and log the results.

## Try it

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

Each Apify run carries a hard ceiling (`caps.perRunUsd`). A new run starts only if that full ceiling still fits under `caps.perMonthUsd`.

## Status

Early. Tests cover the agent, caps and storage. See `docs/BUILD-HISTORY.md` for what has and hasn't run against live services.

## Next: the new design

The chosen design is `docs/design/pipeline-track.html` (open it in a browser; add `?screen=board`, `list`, `timeline`, `calendar`, `trends`, `formats`, `performance`, `directions` or `telegram`). The app UI hasn't been rebuilt to it yet.

## License

MIT

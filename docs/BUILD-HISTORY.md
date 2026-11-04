# Build history

## 2026-11-02: first version

New code, written from a generic spec. Web workspace, Telegram agent, Apify scans with spending caps, demo mode, config-driven branding.

Not yet run live: Telegram API, Apify runs, Anthropic interpreter. Apify output fields are read defensively and need checking on a first real run. Scans are manual (/scan), not scheduled. Screenshots aren't read for performance logging.

Known limit: the web app and bot are separate processes writing one JSON file, so simultaneous writes can lose one change.

## 2026-11-02: design chosen

After five lab rounds the final design is "Pipeline Track" (`docs/design/pipeline-track.html`): the board is one transit line through the seven stages, with Trends, Formats, Performance and Directions screens. The app has not been rebuilt to it yet.

## 2026-11-04: reliability and security maintenance

Preserved the existing workspace and locked Pipeline Track direction. Fixed concurrent web/bot writes with inter-process locking, unique atomic temporary files, disk sync and cleanup. Invalid persisted data is rejected without overwriting it.

Scans now reserve budget durably before each provider call, settle successful runs and save finds after each search. Unknown outcomes keep their reservation. Concurrent scans share the cap; old in-flight work cannot reset a newer month's spend. Provider calls have deadlines, validate terminal states and charges, and limit dataset downloads. The spending documentation now distinguishes Engagent's budget accounting from Apify's pricing-model-dependent ceiling.

Added strict action/state validation, bounded request bodies, same-origin mutation checks using the public Host, malformed-auth handling, idempotent card creation, normalized direction removal and atomic platform selection. Browser saves run in order, retain drafts on failure, report transport errors and validate demo input. Corrupt demo storage falls back to samples; reset clears unsaved brief drafts.

The bot refuses live startup in demo mode, rejects unknown buttons and metric keys, requires an explicit /scan for paid searches suggested by the interpreter, chunks long replies and persists update claims before actions. Idle claims expire so Telegram's randomized IDs after inactivity remain usable. A crash after claiming an update can leave a command unfinished; check state before retrying.

Targeted security upgrade: Next.js 15.5.29, React/React DOM 19.3.1, React types 19.3.0, and a scoped PostCSS 8.5.32 override. Node 20.12+ is declared for the built-in environment loader. No unrelated blanket dependency update.

Verified locally: 32 unit/integration tests, 3 isolated production-browser checks, TypeScript, production build, npm dependency tree and npm audit (0 vulnerabilities). Regression evidence includes 20 simultaneous store instances and 40 writes from two processes, shared scan budgets, restart/idle handling, auth/CSRF boundaries, browser persistence, ordered saves and error recovery. No live Telegram, Apify or Anthropic requests were made.

Measured tradeoff: first-load JavaScript increased from 91.4 kB to 108 kB with the security upgrade. Compact serialization reduces the same demo-state payload from 4,154 to 2,810 bytes. These are size measurements, not a latency benchmark. Build workers are capped at two; tests use at most two files concurrently.

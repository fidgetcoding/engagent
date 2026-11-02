# Build history

## 2026-11-02: first version

New code, written from a generic spec. Web workspace, Telegram agent, Apify scans with spending caps, demo mode, config-driven branding.

Not yet run live: Telegram API, Apify runs, Anthropic interpreter. Apify output fields are read defensively and need checking on a first real run. Scans are manual (/scan), not scheduled. Screenshots aren't read for performance logging.

Known limit: the web app and bot are separate processes writing one JSON file, so simultaneous writes can lose one change.

## 2026-11-02: design chosen

After five lab rounds the final design is "Pipeline Track" (`docs/design/pipeline-track.html`): the board is one transit line through the seven stages, with Trends, Formats, Performance and Directions screens. The app has not been rebuilt to it yet.

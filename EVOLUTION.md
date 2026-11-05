# How Engagent got built

My words are quoted as I wrote or said them, typos fixed, nothing else. Commit hashes are from this repo. "Private note" means a dated record I keep offline: session notes from November 2, and the release record from November 4.

## 1. The short version

Engagent is a rebuild. I'd made a content board and an engagement booster for a music project I work on, and on November 2, 2026, I decided the whole idea should be something any brand can set up on its own, with a Telegram agent in charge.

That one day held a lot. A first version went into code. I called it unbranded and asked for a design lab. The first lab was colour swaps, so I turned the lab into a reusable skill and ran five real rounds: 126 options, cut down to one design called Pipeline Track. That night the code and the design spec went public (`baadc34`).

On November 4 a reliability and security pass fixed lost writes between the web app and the bot, made the spending cap hold when scans overlap, and checked every input at the door (`367346e`). 32 tests and 3 browser checks passed, and they passed again on a fresh clone on November 5. The app UI still has to be rebuilt to Pipeline Track, and nothing has run against live Telegram or Apify yet.

## 2. Origin, in my words

I didn't want to strip the original down and file the names off. What I said on November 2 (private note):

> "I want to turn the whole concept into a product, easy plug and play Telegram agent, easy categories and directions for the agents searching for certain types of things to engage with, relevant accounts, video references, hashtags you like, etc... an agent that assists that whole process, easy populating info into performance, selecting which platforms matter, etc... content kanban timeline etc... view, all the stuff we have, trend following, connecting Apify API or whatever. You get what I mean, so I can give it to other brands easily and they can just set up on their own or I can open source it."

The name came thirty seconds later:

> "We can call it engagent something like that."

And how to say it:

> "Also pretty clear it's like eng agent not engag ent lol."

## 3. Timeline

| Date (2026) | What happened | Evidence |
|---|---|---|
| Before Nov 2 | A content board and an engagement booster, built for a music project I work on | Private note |
| Nov 2 | Decided to rebuild the whole idea as a product any brand runs itself. Named it Engagent | Private note |
| Nov 2 | v1 in code: web workspace, Telegram bot, capped Apify scans, demo mode, one config file per brand. 8 of 8 tests | Private note |
| Nov 2 | v1 called unbranded. Design lab asked for | Private note |
| Nov 2 | First lab was colour and font swaps, rejected. The design lab became a reusable skill | Private note |
| Nov 2 | Lab round 1: 54 options in 9 families | Private note |
| Nov 2 | Lab round 2: 40 refinements. Three picks | Private note |
| Nov 2 | Lab round 3: 12 options of one calm merged design. Rejected as boring | Private note |
| Nov 2 | Lab round 4: 10 options in the playful family. Rejected as childish | Private note |
| Nov 2 | Lab round 5: 10 grown-up options. Pipeline Track locked | Private note |
| Nov 2 | v1 and the design spec pushed, repo made public, MIT | `baadc34` |
| Nov 4 | Reliability and security pass: locked storage, budget reserved before each search, input validation, framework upgrade. 32 tests, 3 browser checks | `367346e`, private note |
| Nov 5 | Same checks rerun on a fresh clone, all passing. These docs | This commit |

## 4. Round by round

### Round 1: v1 from a generic spec (November 2)

- **Built:** a Next.js 14 workspace with seven tabs (Board, Timeline, Briefs, Finds, Directions, Performance, Telegram). A Telegram bot with commands and Add to board or Skip buttons on every find. Apify scans with a per-run `maxTotalChargeUsd` and a monthly cap. A JSON file store, demo mode, password lock, and `engagent.config.ts` with a second brand in `examples/`.
- **Tested:** 8 of 8 tests, typecheck and build. Checked in a browser, password lock verified.
- **Broke:** the look. My words: "this is unbranded so idk wtf I'm looking at frankly." It was built from a generic spec instead of the newest version of the real thing it came from. Also on record from day one: the web app and the bot write the same file separately, so a write at the same moment can drop a change.
- **Wanted next:** drop the Briefs tab, model it on the latest version of the original, better kanban categories, Board, List and Timeline views, and Engagent's own branding. Then: "we'll need a design lab for this product, shitloads of variations."

### Round 2: the colour-swap lab, then a real one (November 2)

- **Built:** a first lab that was mostly colour and font swaps on one layout.
- **Broke:** "basic as fuck on your design lab, all looks like absolute turd."
- **Fixed:** "in fact, I want to turn design lab into a skill." The rule for every lab since: different concepts, never token swaps. Round 1 of the real lab had 9 families of 6, 54 options, each with every screen built from real sample content.
- **Tested:** I went through every option live and starred my picks. Swiss system and Studio wall: "complete shit, you can just tank those." Everything unstarred got cut. Then a rule for all of them: the section nav (Content, Trends, Formats and so on) lives in a left side panel. Four options got rebuilt that way.
- **Broke again:** my stars lived in browser storage, and reading them back missed two of my picks. The lab server now saves every star and note to a file on disk.
- **Wanted next:** refine five favorites: Hairline, Tray, Palette, Pebble and Jelly.

### Round 3: forty refinements (November 2)

- **Built:** 40 options. Hairline, Tray and Palette, each in a crafted take and a bolder take, five of each, plus five each of Pebble and Jelly.
- **Tested:** three picks. "A has the cleanest look overall but not sure about color scheme, I like the simplicity. B is also very good. H has the best performance, directions, formats, trends, but not the other pages."
- **Wanted next:** "Cut the other option completely, now let's make like a merge version of the ones I mentioned, make sure they follow that overall, cut the rest."

### Round 4: the calm merge (November 2)

- **Built:** one merged design in A's calm style, with H's data screens, in 12 colourways.
- **Broke:** "Nah this looks boring as fuck now, I think H were the best tbh."
- **Wanted next:** H's character everywhere, including the screens it was weak on.

### Round 5: candy everywhere (November 2)

- **Built:** 10 options with the playful H family carried through Board, List, Timeline, Calendar and the Telegram screen. Gummy tubes, candy conveyors, sticker books.
- **Broke:** "The premise is good structure wise, it's just too childish all the options."
- **Wanted next:** keep those structures, give them a grown-up skin.

### Round 6: Pipeline Track (November 2)

- **Built:** 10 options on the round 5 structures with a premium finish.
- **Tested:** one winner, Pipeline Track. The board is one transit line bending through numbered stations to a terminus. Ultraviolet, teal and sun on cool paper. Archivo, Inter Tight and DM Mono. The wordmark splits eng and agent with a rail and a station dot. The data screens (Trends, Formats, Performance, Directions) come from the H family.
- **Lesson across rounds 4 to 6:** too calm is boring, candy is childish. The target was energetic and colourful, and still adult.
- **Wanted next:** I said "don't worry about rebuilding at the moment, we will do that later. Just push everything current to repo and I'll get to that tomorrow. Make the repo public." A rebuild that had already started got stopped and reverted, and `baadc34` went up with v1 plus the design spec in `docs/design/`.

### Round 7: reliability and security (November 4)

- **Built:** an inter-process lock with atomic file replacement and disk sync, so the web app and the bot can share one file. Budget reserved durably before every paid call, shared by concurrent scans, with finds saved after each search. Strict checks on every browser action and saved state, size limits on requests, same-origin checks on writes. Browser saves that run in order and keep your draft if one fails. A bot that refuses to start live in demo mode, rejects unknown buttons and metric names, and only spends money on an explicit `/scan`. Next.js 15.5.29 and React 19.3.1.
- **Tested:** 32 unit and integration tests, 3 browser checks in headless Chromium with outside requests blocked, typecheck, production build and `npm audit` with 0 vulnerabilities.
- **Broke, found in the audit before fixing:** twenty store instances writing at once lost 19 of 20 writes. Scan spend was only written when a scan finished, and a failed call used no budget at all. The action check let incomplete cards through. A malformed password header slipped past the lock's error handling. Unknown button presses skipped finds. Browser saves could race each other. Also fixed: duplicate card creation, hashtag removal, and two platform changes landing at once.
- **Fixed:** all of it, in `367346e`. Twenty simultaneous writers keep 20 of 20, and two separate processes keep 40 of 40.
- **Cost:** first-load JavaScript went from 91.4 kB to 108 kB with the framework upgrade. The saved demo state shrank from 4,154 to 2,810 bytes.
- **Wanted next:** the UI rebuild to Pipeline Track, and a first live run with a real bot, Apify account and Anthropic key.

## 5. Feature family tree

```
a content board + an engagement booster for a music project
└─ "turn the whole concept into a product" → Engagent (eng + agent)
   ├─ Telegram agent: /watch, /scan, /finds, /board, /move, /log, /spend
   │  └─ plain-English helper (Anthropic) → paid searches still need /scan
   ├─ directions: accounts, hashtags, references, topics, avoid
   │  └─ Apify scans on TikTok, Instagram, YouTube → per-search and monthly caps
   │     └─ Nov 4: budget reserved before money moves, shared across processes
   ├─ engagent.config.ts → one file per brand → a second brand in examples/
   ├─ one JSON file shared by web and bot → Nov 4: lock, atomic writes, disk sync
   └─ v1 "unbranded" → colour-swap lab → design lab as a reusable skill
      └─ 126 options over five rounds → Pipeline Track (docs/design/)
```

## 6. Test log

| When | What | Result | Where |
|---|---|---|---|
| Nov 2, `baadc34` | Unit tests, typecheck, build | 8 of 8, typecheck and build clean | Private note |
| Nov 4, before the fix | 20 store instances writing at once | 19 of 20 writes lost | Private note |
| Nov 4, `367346e` | Unit and integration tests | 32 passed, 0 failed, 4.36 s | Private note |
| Nov 4, `367346e` | Browser checks, headless Chromium, localhost only | 3 passed, 0 failed | Private note |
| Nov 4, `367346e` | Concurrent writes | 20 of 20 kept, 40 of 40 across two processes | Private note |
| Nov 4, `367346e` | Typecheck, production build, `npm audit` | Pass, pass, 0 vulnerabilities | Private note |
| Nov 4 | GitHub Actions | None configured | Private note |
| Nov 5, fresh clone of `367346e` | `npm ci`, tests, typecheck, build, browser checks | 32 of 32, pass, pass, 3 of 3 | Local run |

The browser checks cover all seven screens of the current app, demo reset and recovery, password-protected saves, save order, cross-site rejection, error messages when the network fails, drafts kept after a failed save, and bad metrics rejected.

Trap to remember: `npm run test:browser` starts the production build, so run `npm run build` first or the browser checks can't start their server.

## 7. Roads not taken

- **Copying the original and filing the names off.** Turned down on day one. Engagent is new code.
- **Swiss system and Studio wall** (lab round 1). Cut on sight.
- **The calm merge** (round 4). Boring.
- **Candy everywhere** (round 5). Childish. Its structures survived into Pipeline Track.
- **Rebuilding the UI the same night it went public.** Stopped and reverted. The design spec shipped on its own instead.
- **Hosting it for people.** Every install runs on its owner's machine and keys. I'm not running anything for anyone.

## 8. What's next

- Rebuild the app UI to Pipeline Track: Board, List, Timeline, Calendar, Trends, Formats, Performance, Directions and Telegram.
- A first live run with a real Telegram bot, Apify account and Anthropic key, and a check of the Apify output fields against real results.
- Two gaps the build history lists: scans only run when you send `/scan`, and screenshots aren't read for performance logging yet.

## 9. Sources

- Commits: `git log` of `fidgetcoding/engagent`.
- In the repo: [docs/BUILD-HISTORY.md](docs/BUILD-HISTORY.md), [docs/design/pipeline-track.html](docs/design/pipeline-track.html).
- Private, kept by me: session notes from November 2, 2026 (product decision, v1, all lab rounds, public push) and the release record from November 4, 2026 (audit, fixes, test runs).

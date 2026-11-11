# Round 1 tools (scratch copies, kept so the round can be repeated exactly)

Records, not product code. UX-0 (`03-plan-to-9.md`) turns `crawl.mjs` into a repo tool with a CI drift check; until then:

| File | What | Run |
|---|---|---|
| `discover.mjs` | Follows every link from the seeds as one person; one example per route pattern | `NODE_PATH=$(npm root -g) node discover.mjs http://localhost:4480 user-A 120 / /review …` |
| `crawl.mjs` | Opens each target at 1440 and 375 px, opens fold-outs, clicks only tabs; records sections, fields, actions, links, fold-outs, tabs, notices, counts and axe | `AXE_JS=<studio>/node_modules/axe-core/axe.min.js NODE_PATH=$(npm root -g) node crawl.mjs six.json out` |
| `empty.json`, `six.json`, `story.json`, `extra.json` | The four target lists of round 1 (ports: 4480 empty then the six, 4481 finished story, 4482 configured checkpoint) | |
| `gen-inventory.mjs` | Crawl JSON + `scores.json` → `inventory/<screen>.yaml` | `node gen-inventory.mjs scores.json ../inventory out/crawl-*.json` |
| `scores.mjs` → `scores.json` | The planner's scores, problems and finding ids; computes every weighted score | `COMMIT=<sha> node scores.mjs` |
| `walk-step.mjs`, `walk.log` | One walk step at a time over CDP (Chromium on :9334), logging clicks and typing | `node walk-step.mjs <shot> '<js>' [width]` |
| `walk-client-answers.js`, `walk-client-parts-*.json` | qa's BK-1 questionnaire filler, instrumented: inputs and words per part | run through `walk-step.mjs` |

Paths inside the walk files point at the planner's scratch folder; change `S` before re-use. Never press a priced button: the crawl clicks only tabs, and live AI stays off (P-175).

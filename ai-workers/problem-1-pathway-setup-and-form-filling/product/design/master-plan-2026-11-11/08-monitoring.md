# 08 · Monitoring: detect problems as they happen, and enforce the decisions

Master analysis, part 8 of 8 (A19 (j): "detect problems as soon as they happen (browser, backend, app, terminal), with the decisions enforced"). Read-only. Facts from `origin/main` fbfb263c7 (11 Nov), `.github/workflows/*`, `.githooks/`, `product/tools/`, `prototype/studio/api/src/`.

## 1. What detects what today

| Layer | What runs | When | Catches | Misses |
|---|---|---|---|---|
| **Browser (tests)** | `pageerror` and console-error capture in 154 browser test files (e.g. `tests/check_c75_review_page_browser.cjs:36`); axe accessibility checks; journey walks at 1440 and 375 px | each ready PR (selected suites), each queue batch, nightly | script errors and layout/a11y breaks on the paths the tests walk | errors people meet on the demo; paths no test walks |
| **Browser (people)** | nothing | — | — | every error the founder or co-founder sees on :4400 is reported only if he says so |
| **API** | Nest logger at `error` and `warn` only (`api/src/main.ts:232`); `GET session` doubles as "the copies' health check" (`main.ts:63`) | always | a crash in the console of whoever started it | slow requests, 5xx counts, DB down, disk full, a stuck fill queue (in memory, one job at a time: `api/src/fill-case.ts:167-175`); no request log, no metrics, no alert |
| **Demo** | `demo-update.yml` on every push to main (self-hosted Mac runner `xr-mac-light`): move the demo copy, migrate (no reset), restart :4400 | each merge | a failed migration or restart (the workflow goes red) | the app starts but the journey is broken; nobody checks after the restart |
| **CI per PR** | `ci.yml`: push guard on drafts; on ready and in the queue: suites (6 shards), types, gate B, route-has-screen, regression packs for Works rows; `guards.yml` proves each guard fails without its guard | each push / batch | regressions before merge | — |
| **Nightly** | `nightly.yml` at 01:53 IST: every suite including quarantined ones, every Works pack, on the six or the checkpoint, US$0 | daily, or by hand (the Lead; cloud lanes get 403, P-439) | drift on main, flaky suites | a red night is seen only at the Lead's next check |
| **Labels and queue** | `label-guard.yml` (on push and every 10 min) removes `review: approved` when the head changed; `records-label.yml`; Mergify queues | continuous | an approval outliving a new commit | — |
| **Lanes** | `lead-watch.sh` (30-min check: resources, merges, queue, lanes); `flow-watch.sh` (bottlenecks as numbers); `lead-heartbeat.sh` (standby's 15-min dead-man switch); the Lead opens each lane on claude.ai (A19 (a)) | every 30 min | a stalled lane, a red queue, disk | a lane that is "running" but has not pushed (P-326 counts it only after a push); cloud lanes cannot be read by a tool from the Mac except through claude.ai pages |
| **Terminal / Mac** | `lane-preflight.sh` (≥7 GB free, load ≤16, <4 test copies); `disk.sh`; pre-push hook (no push to main, no PDFs, secrets or names) | on lane start, on push | disk and load at lane start | disk filling between starts; a demo process that died |

## 2. Decisions: enforced by a tool, or by prose only

| Decision | Enforced by | Status |
|---|---|---|
| RULES within 3 rows of DECISIONS; STATE ≤12 KB, one `current_lead`; instruction files short | `check-docs.sh`, `check-rules-lag`, `check-state-page` (CI + stop hook) | **enforced** |
| Label only with "Reviewer: Approve <sha>" and green; no approval outlives a commit (P-385) | `label-guard.sh/.yml` | **enforced** |
| Gate B: a PR naming a capability with an open Major fails unless it fixes it (P-317) | `gate-b.mjs` in CI | **enforced** |
| Only the Lead merges, closes, reviews | `merge-guard.sh` hook | **enforced (Mac hook; cloud lanes rely on GitHub permissions)** |
| Builders never edit STATE, RULES, DECISIONS, BACKLOG (P-314) | `stop-check.sh` | **enforced on the Mac; not in CI** (a cloud lane's PR could change them; see M8) |
| No push to main; no PDFs, secrets, names, `sources/`, `code/` | pre-push + `push-guard.sh` + CI job `guard` | **enforced** |
| A mutating route needs a caller in `web/src` (P-348 (4)) | `route-has-screen.mjs` | **enforced** |
| No combination key, form number or program branch in `engine/` or `api/src/` (P-319, P-425, P-452) | `tests/check_b164_no_engine_keys.ts` (shrink-only allow-list against origin/main) | **enforced since #1501** (the older draft #945 is superseded) |
| Lane start needs room | `lane-preflight.sh` | **enforced (Mac only)** |
| **One builder at a time on `schema.prisma` and on `case-prepare.ts`** (P-438 (2)) | — | **prose only.** STATE names the holder; nothing checks a PR against it |
| **PRs under ~800 lines** (P-436 (4)) | — | **prose only** |
| **At most two review rounds, then the Lead decides** (P-293 (3)) | — | prose only |
| **Fresh branch per row, one session per branch** (P-278, P-436 (2)) | — | prose only; #1523 broke it on 11 Nov (part 1, Question 5) |
| Live AI off in every lane; money caps; ledger before a paid call (P-175, P-295) | ledger code exists (`p2/ledger.ts`); approval is the Lead's | **partly** |
| Context hand-over thresholds; burn ≤3%/h (P-440, P-446) | `get_usage` read by hand | prose only |
| Merge `main` in only on a conflict (P-270); "merged main three times lands next" (P-436 (1)) | — | prose only |
| Works needs a green pack run id on main (P-339) | `works-set.mjs` + qa's verdict | **partly** (the run id is written by qa) |
| Compass numbers "judged daily from tools" (P-312) | `flow-watch.sh` computes some | **partly** |

## 3. What to add (counted; one small PR each, pipeline lane, outside the Bake caps unless noted)

Ordered by how early they catch a problem a person would otherwise find. Each row has its exit test.

| # | Row | Layer | What it adds | Exit test | Size |
|---|---|---|---|---|---|
| M1 | **Health endpoint** | API | `GET /api/health`: database ping, disk free, fill-queue depth and oldest job age, git sha, uptime; 503 when any is bad | a test stops the database and expects 503 with the failing part named; healthy copy returns 200 in <100 ms | 0.5 |
| M2 | **Request log + error count** | API | one JSON line per request (request id, route, actor role, status, ms) into the copy's `var/logs/`; 5xx and slow (>1 s) counted; `tools/app-errors.sh` prints the last hour | a forced 500 appears in the log with its request id; `app-errors.sh` prints it; `lead-watch.sh` shows the count | 1 |
| M3 | **Errors people meet in the browser** | browser (people) | `window.onerror`, `unhandledrejection` and a React error boundary send `{page, message, stack, sha}` to `POST /api/client-errors` (same log as M2; no personal data; route listed in `route-has-screen`'s allow-list) | a test page throws; the log has the entry; the screen shows the team's error state with "what to do next", not a blank page | 1 |
| M4 | **Demo checked after every update** | demo | `demo-update.yml` ends with `/api/health` and a 2-minute smoke walk on :4400 (sign in by role, open the finished-story case, open its forms); red = the workflow fails and the step summary names the screen | break the case page on a branch, run the smoke against it: it fails naming the page; on main it passes in <3 min | 1 |
| M5 | **Nightly red reaches the Lead at once** | CI | the nightly writes `nightly-status.json` (green/red, failing suites, run id) as an artifact; `lead-watch.sh` reads the newest at every check and puts a red night first (RULES pick order: "red on main first") | a forced red nightly shows as the first ACT line at the next check | 0.5 |
| M6 | **Lane liveness from GitHub** | lanes | `tools/lane-liveness.sh`: for each lane in STATE's table, the minutes since its branch's last push, its PR's CI state and newest "tech lead" comment; a lane >60 min without a push or >30 min red is an ACT line | run against today's lanes: names the lanes started 12:3x with no push yet | 0.5 |
| M7 | **CI wait time** | CI | `flow-watch.sh` adds each queue run's job wait (`created_at` → `started_at`) and longest shard | shows today's 49.5 min longest shard; >2 min wait flagged (runner concurrency, part 1 §3) | 0.5 |
| M8 | **Batons and lead-only files checked in CI** | CI | a `product/BATONS` line per baton file (`schema.prisma: <branch>`, `case-prepare.ts: <branch>`), written by the Lead; CI fails a PR that changes a baton file from another branch; CI also fails a non-Lead branch that changes STATE, RULES, DECISIONS or BACKLOG (today the Mac hook only) | a test PR touching `schema.prisma` from a non-holder branch fails with the holder's name; a `lead/*` branch passes | 1 |
| M9 | **PR size and branch reuse** | CI | warn above 800 changed lines (excluding tests, screenshots, records); fail when a PR's head branch already merged a PR | #1523's branch would have been flagged; a 900-line PR shows the warning | 0.5 |
| M10 | **Timing budget from the request log** | API / Scalable | p50/p95 per route from M2's log, nightly on the checkpoint; budgets 300 ms reads / 600 ms writes (the "not built" release gate in `reports/verify-2026-11-03/V1-completeness.md:316`) | nightly prints the table; one route over budget fails a named check | 1 (ties to Scalable, part 7) |

**Total: ~7.5 sessions.** M1-M6 first (~4.5): they cover the four places the founder named (browser, backend, app, terminal) within one check interval. M8 turns the one rule broken most often (one holder per baton) from prose into a check. Context, burn and money stay with the Lead's `get_usage` reads: no tool can see them from the repository.

## 4. What this does not add, and why

* **No hosted monitoring service, uptime pinger or paging.** New technology goes through the STANDARDS §1 gate. Hosting, tenants and real users are the team's (P-335, P-357). Everything above runs on what the repository already uses.
* **No GitHub issues for alerts.** AGENTS rule 1 forbids opening issues in the team's repositories. Status goes to step summaries, artifacts and the Lead's check.
* **No live AI in any monitor.** P-175 forbids it; every check above is US$0.

## Question for the tech lead (posted on the PR)

**M1 + M4 first, as one pipeline-lane row now, beside the Bake.** Since #1519 every merge restarts the founder's demo (:4400) with no check that it works afterwards (`demo-update.yml`, restart step only). Today he and the co-founder (B168, P-459) are the first to see a broken demo. *Recommend:* one pipeline lane for M1 + M4 (~1.5 sessions), outside the caps. It touches `api/src/main.ts` (a new route) and `demo-update.yml`, and no baton.

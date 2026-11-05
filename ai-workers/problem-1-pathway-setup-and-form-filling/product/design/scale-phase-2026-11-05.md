# Scale phase — how the factory reaches 100, then 1,000+ capabilities (B108, design only)

Written 5 Nov 2026, 13:10–14:30 IST, by a cloud session on row B108 (P-353, carrying out P-336). **Design only:** no product file, CI file or skill is changed by this document; every tool named below is proposed, none adopted. Building starts when M2 lands (P-353), before M3 grows past 3–4 lanes (P-351 (4)). Live AI off, US$0. Every number below was measured on `main` at `7bf8db261` (5 Nov 12:58 IST) with the command shown in §8, unless it says otherwise.

## 1. The problem in five numbers

| What | Measured | Why it stops scale |
|---|---|---|
| Demo data is code | `api/src/demo.ts` 111 KB, 1,014 lines; **43 merges** touched it since 23 Oct (13 on 4 Nov alone, of 107 merges); **8 of 13** open builder PRs edit it today | Every new combination is a code change to one file, so lanes queue behind each other (STATE's "demo.ts order": 4 PRs in a chain) |
| A pack's time is mostly set-up | C11.13 on the six: 46 s, of which **Reset to the six 37 s** (`screens/gate-b/review.md`) | 57 Works packs × 37 s of set-up per batch, and growing |
| One scorecard file | `qa/CAPABILITIES.md` **230,553 bytes, 98 rows**; grew 19 KB → 230 KB in 11 days while rows went 71 → 98 (≈ +40 KB a day at a fixed 98 rows); edited by **18 commits on 5 Nov**; parsed by 11 tools and CI | At 1,000 rows, the same text per row is about 2.4 MB; every qa lane writes the same file |
| Records are half of all merges | **23 of 45 merges** on 5 Nov (00:00–12:58 IST) were records PRs (17 qa records, 5 Lead records, 1 regression data); compass target 20% | Lead and qa time goes to bookkeeping; the compass number is red |
| Works rows with no pack | **20 of 57** M2 Works rows (`works-set.mjs --list`: "57 capabilities, 37 with an acceptance pack"); was 18 of 42 on 4 Nov (P-336) | A merge can take away those 20 unseen; the hole grows with Works |
| Approvals are self-applied | 0 APPROVED reviews on #1057, #1051, #1009 (sampled); all 19 open PRs come from one GitHub login; the builder runs its reviewer as its own sub-agent and adds `review: approved` itself (`next` skill, step 4) | Nothing on GitHub records that someone other than the builder approved |

## 2. Order and why

1. **Demo data as data files** first: it is the only one of the five that blocks parallel building today (8 of 13 open PRs on one file) and it makes every later pack cheaper (37 s of 46 s is set-up).
2. **One file per capability**, then 3. **generated records**: 3 reads the per-capability files that 2 creates.
4. **Packs for pack-less Works rows** can start in its own lane alongside 2 and 3 (it touches only `acceptance/`), but packs written after 1 run on the snapshot, so they cost less in every batch.
5. **GitHub App for approvals:** the build is small, but it needs the founder's hands once (create the App, add one secret). **Recommendation:** the founder does that set-up while 1 is being built, so 5 is not waiting on him at the end.

Effort in all: about **18 rows** (5 + 3 + 2 + 6 + 2), about 4–5 builder-days with 3 lanes; numbers in each section.

## 3. Change 1 — Demo data as data files, built once by product steps, snapshotted

**What moves.** The set-up of each combination leaves code and becomes a data file. Today the six's inputs are already data (`samples/wave1.json`, `programs.json`), but the **configured checkpoint** is 330 lines of code (`demo.ts:550–877`, `loadConfigured`) that call the screens' services one DEMO.md row at a time; `forms-demo.ts` (7.7 KB) and `demo-reset-to-six.ts` (two copies: `api/src/` and `api/src/features/`) are more of the same. After the change:
* `samples/recipes/<combination>.json` lists the **product steps** a person would take (attach file, read, replay saved answer, accept or return a draft, approve, release) with their inputs. One recipe per combination; Express Entry (B79a), Family sponsorship (B79b) and M3's Visitor visa set-up (B104) become recipe files, not code.
* One small **runner** in `demo.ts` executes a recipe through the same services the screens call. A step's name maps to one service call on an allow-list; a step that would need new logic is a product gap and becomes a product row, never runner code (this keeps "built by product steps", P-322, and the P-348 (4) rule that a mutating route needs a screen).
* **Snapshot:** after the runner builds the six and the checkpoint once, the database is kept as a PostgreSQL template database plus a copy of the workspace's working files; **Reset to the six** and **Load the configured checkpoint** then restore it (`CREATE DATABASE … TEMPLATE …`, PostgreSQL's own feature, already in the stack). The snapshot's key is a hash of the migrations, the recipes, the runner and the saved AI answers; any change rebuilds it. Snapshots are never committed (the push guard refuses databases); CI keeps one in its existing cache.

**Steps (rows).**
1. Runner + recipe format + parity check: build the checkpoint both ways and compare a fingerprint of the configuration (demo.ts already fingerprints preserved files; this adds one for configured rows). The code path stays the default.
2. Port the six and the configured checkpoint to recipes; parity green.
3. Snapshot and restore for Reset to the six and the checkpoint; packs, `gate-b.mjs` and `isolated.sh` use the restore. Version check: the dump step refuses when the client and server versions differ (`cloud-setup.sh:69` records "pg_dump 16 refuses an 18 server").
4. Port B79a, B79b, B104 and any other in-flight set-up that has merged by then to recipes; retire `forms-demo.ts` and the duplicate `demo-reset-to-six.ts` into the runner.
5. Switch the default to recipes + snapshot; remove the old code path after 7 days of parity.

**How the factory keeps working.** The switch is an environment setting (`DEMO_SOURCE=code|recipes`, config in environment, STANDARDS §4), default `code` until step 5, so no lane changes how it works mid-row. Rows already editing `demo.ts` (today #1050, #1052, #1062, #1073, #1084, #1036, #1058, #1072) finish in code and are ported in step 4; from step 2, new set-up work is a recipe file. The parity check runs in every batch during steps 2–5, so a recipe that drifts from the code is red before it reaches the demo.

**What could go wrong, and undo.** (a) Recipes grow into a second programming language: refused by the allow-list; a review finding if a step takes logic. (b) A stale snapshot hides a broken migration: the key includes the migrations, and the nightly run builds from recipes without a snapshot. (c) Snapshot restore is not identical to a fresh build (sequence values, timestamps, tied sorts like QA-236 and `demo.ts:595`): the parity fingerprint ignores ids and times and compares content and order. (d) Working files and database drift apart: one snapshot holds both, restored together. **Undo:** `DEMO_SOURCE=code`; nothing else changes until step 5 deletes the code path, which is a revert.

**Number it should move (P-312), checked 7 days after step 5 merges:** PRs that set up a combination and edit `api/src/*.ts`: from 8 of 13 open PRs to 0; merges touching `demo.ts` per week: from 13 in one day (4 Nov) to at most 1; set-up time of a pack on the six: from 37 s to under 5 s (measured in gate B's log lines).

**Effort:** 5 rows. **STANDARDS §1 gate:** no new tool (PostgreSQL templates, JSON files, GitHub Actions cache are already in use). Gate B's set-up path changes, so the row's PR states it in its first line and the tech lead reads it.

## 4. Change 2 — One file per capability, with a generated index

**What moves.** Each row of `qa/CAPABILITIES.md` becomes `qa/capabilities/<ID>.md`: a fixed header (id, step, capability, milestone, status, tested-on commit and date, latest verdict link) and the evidence history below it, word for word (nothing is cut: AGENTS.md rule 8). `qa/verdicts/` (58 entries since 4 Nov) stays as it is and is linked. `qa/CAPABILITIES.md` becomes a **generated index**: the same first six columns as today, the Evidence column reduced to a one-line summary and a link.

**Who reads it today** (all must keep working): `works-set.mjs` and `check-works-set.mjs` (the regression set in every batch), `m3-guard.sh`, `progress.sh`, `graph.mjs`, `factory-board.sh`, `lead-watch.sh`, `flow-watch.sh`, `decision-impact.sh`, `change-kind.sh`, `check-select-suites.sh`, the `qa`, `lead` and `screen-concept` skills. The 18 acceptance files that name it do so in comments only.

**Steps (rows).**
1. A reader module (`qa/capabilities` → id, milestone, status) used by every tool above, with a `--check` that the table and the files give the same set; the table stays the source.
2. One split, in a window with no qa records PR open (qa told first: lesson of 5 Nov, `wtrec13`): the files are written from the table, the index is generated, the tools switch to the files. `works-set.mjs` reads the files at the base if `qa/capabilities/` exists there, else the table, so a batch that straddles the split still reads the right set.
3. A guard: a PR that changes `qa/CAPABILITIES.md` must leave it equal to the generator's output; only qa writes `qa/capabilities/` (same ownership as today, P-314).

**Why the index is not regenerated in every PR:** a generated file that every qa PR rewrites is today's conflict again. The index is refreshed in the one daily records PR (P-336); no tool reads it, so a few hours' staleness harms nobody, and it says "generated at <commit>".

**How the factory keeps working.** Mac qa (M2) and cloud qa (M3, P-351 (3)) keep scoring; after the split each writes only the files of the rows it scored, so the two never touch the same file. The table is valid until the split commit and generated after it.

**What could go wrong, and undo.** (a) A tool still reads the table and sees a stale status: step 1's `--check` and step 3's guard; `works-set --list` output is compared before and after (it must be identical). (b) Header fields drift in format: the reader refuses an unreadable header loudly (no silent skip, unlike today's "a line that cannot be read is reported and ignored"). **Undo:** revert the split; the table is regenerated from the files, so nothing written after the split is lost.

**Number it should move, checked 7 days after the split:** biggest records file a qa PR edits: from 230 KB to under 20 KB (largest row today is C11.10 at 9 KB); qa records PRs that conflict with each other: from "two qa lanes can't both write" (P-351 (3) keeps them apart by milestone) to 0 conflicts a week with both qa lanes writing.

**Effort:** 3 rows. **STANDARDS §1 gate:** none (Markdown files and Node scripts the team already uses).

## 5. Change 3 — Generated records

**What moves.** STATE's running parts and the compass come from tools; judgment stays in people's words; rulings stay PR comments (P-336).
* **From tools:** STATE's "In flight" table and "Where we are" counts (`factory-board.sh` already builds the board from GitHub; `progress.sh` already counts per milestone), the "Leads, in order" list (from session ids in commits' `Claude-Session:` lines: 197 of 546 commits since 4 Nov carry one), and **the seven compass numbers** (RULES.md, "The compass"), which no tool computes today (`grep -il compass product/tools/*` finds none). A new `tools/compass.sh` reads git, GitHub and the per-capability files: confirmed per day (status changes to Works in `qa/capabilities/`), Works on first re-score, Majors after merge, demotions per day, capabilities in progress (open PRs by title), records share of merges (as measured in §8), batches thrown away (Mergify batch runs).
* **Stays hand-written:** STATE's "Waiting for the founder", lessons, founder asks, the day's rulings summary. That part is short and changes once a day.

**Steps (rows).** 1. `compass.sh` + a "STATE, generated" section produced by one command (`factory-board.sh` + `progress.sh` + `compass.sh`). 2. STATE's running tables replaced by "run `tools/state.sh`" and the `lead` and `lead-watch` skills told to read its output (skill edits are in that row, not here).

**How the factory keeps working.** The tools are read-only, so they run beside today's STATE for 2 days; the Lead compares them at each 30-minute check before STATE's tables are cut.

**What could go wrong, and undo.** (a) A tool's number differs from qa's: qa's files are the only input for Works counts, so they cannot differ unless the tool is wrong; the 2-day side-by-side catches it. (b) GitHub's API is slow or refused from a cloud copy: the tool says "not read" rather than 0. **Undo:** STATE's tables come back from git history.

**Number it should move, checked 7 days after step 2:** records PRs as a share of merges: from 23 of 45 (51%) to the compass's 20% or less. **Honest note:** 17 of the 23 are qa records PRs. Changes 2 and 3 cut the Lead's 5 to 1 a day and make qa's cheap and conflict-free, but they do not by themselves cut how often qa publishes. If after 7 days the share is still over 20%, the remaining lever is qa's cadence (one qa records PR per 3 hours, or qa's verdicts merging on their own green check-docs run); that is a rule change for the founder, not part of this design.

**Effort:** 2 rows. **STANDARDS §1 gate:** none (bash, `gh`, Python already in `flow-watch.sh`).

## 6. Change 4 — Packs for the Works rows that have none

**What moves.** The 20 pack-less M2 Works rows get an acceptance pack: C1.1, C1.2, C1.4, C1.8, C2.1, C2.2, C2.3, C3.1, C3.3, C3.7, C4.3, C4.9, C4.10, C5.3, C5.5, C5.6, C5.7, C11.2, C11.9, C11.18. Each pack is written from that row's 4 Nov verdict (`qa/verdicts/2026-11-04-<ID>.md`: the no-pack re-proof listed the checks that confirmed it), mostly by wrapping the checks it already names. (Also without a pack: 3 Parked and 6 thin-slice Works rows; they stay out of the protected set, which is M2 only, until the founder puts them in.)

**Steps (rows).** About 6 rows of 3–4 capabilities each, grouped by area so one builder knows the screens: Setup (C1.x), Library (C2.x), Fields (C3.x), Forms and checklists (C4.x), Release and governance (C5.x), Demo and runtime (C11.x).

**How the factory keeps working.** A pack is a new file in `acceptance/`; the protected set picks it up at the base by itself (`works-set.mjs`). A new pack that is red on `main` is held through `qa/REGRESSION-HELD.md` (exists) and sent to qa, never a demotion by the builder. Packs are added two rows at a time, so the batch's job count rises in steps that can be watched.

**What could go wrong, and undo.** (a) Batch time grows: 37 → 57 regression jobs per batch; with change 1's snapshot each job's set-up drops from about 37 s to under 5 s, so the total should fall even with more jobs (to be measured, not assumed). (b) A pack exposes a real regression on a Works row: that is the point; it goes to qa as a bug. **Undo:** hold the pack by name in `REGRESSION-HELD.md`.

**Number it should move, checked 3 days after the last pack merges:** Works rows without a pack: from 20 of 57 to 0 of 57; Works → Partial demotions found by qa rather than by a batch (compass: at most 1 a day) — the target is that demotions are caught in the batch before merge.

**Effort:** 6 rows. **STANDARDS §1 gate:** none.

## 7. Change 5 — A GitHub App for agent approvals

**What moves.** Today `.mergify.yml` merges on `label = review: approved` plus green CI, and the builder adds the label after its own sub-agent's Approve. After the change:
* The reviewer runs as **its own session** (a fresh cloud session the Lead or the builder's PR starts, not a sub-agent of the builder), in a cloud environment that holds the App's private key as an environment secret. Builder environments do not have the key.
* That session posts a GitHub **APPROVE review on the exact head commit** as the App (`<app>[bot]`), with its session id in the body.
* Mergify's queue condition becomes "approved by `<app>[bot]`, no changes requested" (`approved-reviews-by`), and GitHub's "dismiss stale approvals on push" setting makes any later push need a new approval, as today's rule says (P-293 (1)).

**Steps.** Founder, once (about 20 minutes): create the App (pull requests: write; contents: read), install it on this repository, add its key to a new "reviewer" cloud environment. Rows: 1. the reviewer session's approve step (mint a token from the key with `openssl` and `curl`, already in the image; post the review), tried once live on a test PR (P-326: a platform decision needs one live canary). 2. Mergify condition: label **and** App approval for 3 days, then the App approval alone; the `next` and `screen-review` skills updated in that row.

**How the factory keeps working.** During the 3 days both are required, so nothing merges on less than today; PRs labelled before the switch get one App approval on their current head from a reviewer session (no new review if the head is unchanged and the earlier review was by a different session: the tech lead's call per PR).

**What could go wrong, and undo.** (a) The key leaks into a builder's environment, and the builder could approve itself: the key lives only in the reviewer environment; rotate it if seen anywhere else (GitHub shows the App's activity). (b) The cloud proxy refuses the token request: unconfirmed until the canary; if refused, the fallback is a GitHub Actions workflow that holds the key as a repository secret and posts the review when the reviewer session posts its verdict comment (weaker: any session can post that comment, so the workflow must refuse a verdict whose session id matches a `Claude-Session:` line in the PR's commits). (c) One more session per PR costs tokens: the reviewer already runs once per PR as a sub-agent; as a session it re-reads the same diff, so the extra cost is its start-up, to be measured on the canary. (d) Mac lanes have no reviewer environment: their PRs get their review from a cloud reviewer session. **Undo:** the Mergify condition goes back to the label (one line); the App is uninstalled.

**Number it should move, checked 7 days after the label is dropped:** merged PRs whose approval was recorded on GitHub by an identity other than the author's: from 0 of 3 sampled (5 Nov) to every product PR; approval-to-merge time stays under 1 hour (RULES, "How many sessions").

**Effort:** 2 rows plus the founder's 20 minutes. **STANDARDS §1 gate (for the founder's OK, recorded in `ENVIRONMENT.md` when adopted):**
* Problem: no recorded approval by anyone but the builder (§1 numbers).
* Options: (1) keep the label (today); (2) a second GitHub account for bots (dropped by the founder, 4 Nov, P-336); (3) a GitHub App (recommended); (4) a workflow-held key (fallback above).
* Integration and upkeep: one App, one secret, key rotation once a quarter or on any leak; the repository already runs two Apps that post reviews and checks (Devin Review posted 8 reviews on #1057; Mergify).
* Data and licence: the App sees this repository only; no cost on GitHub's free plan for Apps. Legal points: Unconfirmed: no counsel.
* Reconsider when the team's platform owns the repository or its own approval flow (P-249).

## 8. How each number was measured (5 Nov, 13:00–13:40 IST, `main` 7bf8db261)

| Number | Command (run at the repository root; `S` = `…/prototype/studio/api/src`, `P` = `…/product`) |
|---|---|
| demo.ts size, merges | `wc -lc $S/demo.ts` · `git log --first-parent -m --merges origin/main -- $S/demo.ts` (43; by day with `--format=%ad --date=short`) · all three demo files: 44 merges |
| open PRs on demo.ts | for each open PR's head: `git diff --stat $(git merge-base origin/main <head>) <head> -- $S/demo.ts` (8 of 13 builder PRs; records and paid PRs left out) |
| pack set-up time | `screens/gate-b/review.md`: "C11.13 on the six: exit 0, 15/15, 46 s (copy 5 s, Reset to the six 37 s, run 5 s)" |
| scorecard | `wc -c $P/qa/CAPABILITIES.md` · `grep -c '^\| C[0-9]'` · size by day: `git show $(git rev-list -1 --first-parent --before=<day>T18:30Z origin/main):…` · `git log --since=2026-11-04T18:30Z -- …CAPABILITIES.md` (18) |
| records share | first-parent merges since 4 Nov 18:30 UTC, classed by branch (`qa-records-*`, `lead/*`, `qa-regression-data`): 23 of 45 |
| pack-less Works | `node studio/tools/works-set.mjs --list` with `RANGE` empty: "57 capabilities, 37 with an acceptance pack" |
| approvals | GitHub reviews on #1057, #1051, #1009: only COMMENTED (Devin, owner), none APPROVED; open PR list: one author login |
| suites | `tools/suite-times.tsv`: 262 suites, 4,943 s in all (3 Nov medians) |

## 9. What still breaks at 1,000 after these five, and when to tackle it

| Breaks | Evidence today | What to do | Tackle when |
|---|---|---|---|
| **One Lead session** | 12 Leads named in DECISIONS between 3 Nov evening and 5 Nov 13:00 IST (one every ~3 h); hand-over at about 400k tokens (P-314); STATE lists 13 lanes in flight | One coordinating Lead plus area Leads (setup, forms, runtime, case), each with its own board filtered from `factory-board.sh` and its own slice of capabilities; needs change 3 first | More than 10 lanes, or 200 capabilities |
| **Per-batch test selection** | Every batch re-runs every Works pack, one job each: 37 now, 57 after change 4. GitHub's documented limit is 256 jobs per matrix (outside fact, not measured). 262 suites, 82 min of suite time per full run | Run in a batch only the packs whose capability's pages, API routes or files the batch touches (`graph.mjs` already maps capabilities to pages and routes); the whole set nightly and before a milestone | Protected set over 150 packs, or a batch over 30 minutes |
| **Per-row re-scoring by qa** | qa re-scores each row a merged PR names, by walking like a person (P-290, P-311); 17 qa records PRs in 13 hours on 5 Nov from two qa lanes | Unchanged rows stay confirmed by their green pack; qa walks journeys (P-348 (2)) and samples rows; more qa lanes by area once change 2 lets them write without conflicts. Changes the Works rule (P-290): the founder's decision | qa's re-score queue older than one day |
| **Other single files** | `DECISIONS.md` 233 KB, 255 rows; `qa/BUGS.md` 57 KB (22 commits on 5 Nov); `BACKLOG.md` 50 KB | The same split as change 2 (one file per bug; decisions by month with an index) | When a file passes 300 KB or two writers conflict |

## 10. Rules this design touches (for the founder)
* **Process freeze to 10 Nov 22:30 IST (P-312):** each change above names its number and its check date, as P-312 asks; adoption needs the founder's OK per change.
* **Who writes what:** qa stays the only writer of capability and bug records (P-314); change 5 changes who approves, not who builds.
* **Not decided here:** qa's cadence (§5 note), the Works rule at 1,000 (§9), area Leads (§9). Each goes to the founder one at a time with a recommendation.

## 11. Independent challenge
See `scale-phase-2026-11-05-challenge.md` (fresh Opus context); verdict and answers below.

# Scale phase — how the factory reaches 100, then 1,000+ capabilities (B108, design only)

Written 5 Nov 2026, 13:10–15:00 IST, by a cloud session on row B108 (P-353, carrying out P-336); revised after the independent challenge (§11). **Design only:** this document changes no product file, CI file or skill, and every tool named below is proposed, not adopted. Building starts when M2 lands (P-353), before M3 grows past 3–4 lanes (P-351 (4)), unless the P-336 trip-wire fires first (§10). Live AI off, US$0. Every number was measured on `main` at `7bf8db261` (5 Nov 12:58 IST), with the command in §8, unless marked **estimate** or **outside fact**. Days are IST days (00:00–24:00 IST).

## 1. The problem in six numbers

| What | Measured | Why it stops scale |
|---|---|---|
| Demo set-up is code | `api/src/demo.ts`: 111 KB, 1,014 lines, 72 distinct service and database calls (challenger's count). **43 merges** touched it since 23 Oct: 8 of 107 merges on 4 Nov, 7 of 45 on 5 Nov up to 12:58. **8 of 13** open builder PRs edit it today. | Every new combination, and every new kind of set-up step, is a change to one file, so lanes queue behind each other (STATE's "demo.ts order": a chain of 4 PRs) |
| A pack's time is mostly set-up | C11.13 on the six took 46 s, of which **37 s was Reset to the six** (`screens/gate-b/review.md:11`). This is **one sample** (4 Nov 09:23 IST), not a measured batch. | Set-up is paid again in every pack that resets: 31 of the 38 protected packs (7 run on their own fixture) |
| One scorecard file | `qa/CAPABILITIES.md`: **230,553 bytes, 98 rows**. It grew from 19 KB to 230 KB in 11 days while rows went from 71 to 98 (about +40 KB a day at a fixed 98 rows). **18 commits on 5 Nov**; parsed by 11 tools, CI, `.mergify.yml`'s M3 title pattern (kept by hand) and the `scout` skill. | At 1,000 rows the same text per row is about 2.4 MB, and every qa lane writes the same file |
| Bugs are one file too | `qa/BUGS.md`: 57,557 bytes, 22 commits on 5 Nov; 13 of the 17 qa records PRs that day edited it | Two qa lanes (P-351 (3)) collide on it |
| Records are half of all merges | **23 of 45 merges** on 5 Nov were records PRs (17 qa records, 5 Lead records, 1 regression data). The compass target is 20%. | Lead and qa time goes to bookkeeping |
| Works rows with no pack | **20 of 57** M2 Works rows (`works-set.mjs --list`: "57 capabilities, 37 with an acceptance pack"); it was 18 of 42 on 4 Nov (P-336) | A merge can take those 20 away unseen, and the gap grows with Works |
| Approvals are self-applied | No APPROVED review on #1057, #1051 or #1009 (sampled; only COMMENTED reviews). All 19 open PRs come from one GitHub login. The builder runs its reviewer as its own sub-agent and adds `review: approved` itself (`next` skill, step 4). | Nothing on GitHub records that anyone other than the builder approved |

## 2. Order and why

1. **Demo data as data files (change 1) and one file per capability (change 2) start together.** They share no files. Change 1 is the larger blocker for parallel building (8 of 13 open PRs on one file). Change 2 is cheap and its file grows by about 40 KB a day (challenge F15).
2. **Generated records (change 3)** reads the per-capability and per-bug files that change 2 creates, so it comes after.
3. **Packs for pack-less Works rows (change 4)** run in their own lane alongside 2 and 3, because they touch only `acceptance/`. Packs written after change 1's test-copy snapshot run cheaper in every batch.
4. **The GitHub App for approvals (change 5)** is small to build but needs the founder's hands once. **Recommendation:** the founder does that set-up while changes 1 and 2 are being built.

**Effort, estimate:** about 22 rows in all (8 + 4 + 2 + 6 + 2). No rows-per-day throughput has been measured for work of this kind, so no builder-days are claimed. The binding limit is the rules, not the effort: after 10 Nov 22:30 IST, at most one process change a week (`WAY-OF-WORKING.md:80`). See §10.

## 3. Change 1 — Demo data as data files, built by product steps; a snapshot for test copies only

**What moves.**
* **The product routes stay as they are.** "Reset to the six" (D1, P-226) and "Load the configured checkpoint" keep building by product steps through the same services, because gate B calls them (`gate-b.mjs:244`) and Works counts on that data (P-322, frozen by P-337 until M2 = 60). Change 1 does **not** change what Works counts on (challenge F5).
* **Set-up of a combination becomes a recipe file.** `samples/recipes/<combination>.json` lists the product steps a person takes (attach a file, read it, replay a saved answer, accept or return a draft, approve, release) and their inputs. The six's inputs are already data (`samples/wave1.json`, `programs.json`, and P-319's sample files). What is code today is the order of steps for the **configured checkpoint**: 330 lines in `loadConfigured` (`demo.ts:550–877`), plus M3's second set-up path (`acceptance/lib/setup_vv_m3.ts`, 23 KB, and `tests/runtime/setup_visitor_visa.ts`).
* **One runner** in `demo.ts` runs a recipe. Each step kind maps to one service call on an allow-list.
* **Be honest about the hot file.** The 8 open `demo.ts` edits are mostly new logic, not new data: B82 changes which proposal kinds are rejected, B78 adds a section-naming step, C6.4 adds a 66-line step (challenge F3). Under this design such edits become **new step kinds in the runner**. So the runner stays a shared file. What leaves code is **adding a combination with step kinds that already exist** (B79a Express Entry, B79b Family sponsorship, B104 Visitor visa for M3). Those become one new file each, with no code and no queue.
* **Writes with no screen behind them.** `loadSix` writes some rows straight to the database (`demo.ts:448–452`: `programDef.updateMany`, `sampleProfile.create`, `sampleFact.createMany`). Each becomes either a step kind marked "sample-only, no screen" on the allow-list (listed, so a reviewer can see it), or a product row when a person really needs to do it by screens. Sizing them is step 1 below.
* **Snapshot, for test copies only.** `tools/isolated.sh start` (used by gate B, qa and builders' fresh copies) builds the six and the checkpoint once from recipes. It keeps them as template databases plus a copy of the working files, and starts each copy with `createdb -T <snapshot>` **before** the API starts, so no connection is open to the template. The :4400 demo is never restored this way.
* **The snapshot's key** is a hash of everything the build reads: `api/src`, `engine`, `prisma`, `samples`, the recipes and the saved AI answers (challenge F1). Any change rebuilds it. **This means almost every code batch rebuilds it:** 15 of the 22 non-records merges on 5 Nov touched `api/src`, `prisma` or `samples`. So the gain in CI is "build once per batch instead of once per resetting pack" (31 of 38). It is not "build once and reuse".

**Steps (rows), estimate 8.**
0. **Measure first.** Take one real merge-queue batch's regression job log and record the step times: checkout (`fetch-depth: 0` of a 1.39 GiB history), PostgreSQL install, Playwright install, Reset, pack. **Stop here if Reset is a small share:** then build the recipes (steps 1–2, 4) and drop the snapshot (step 3).
1. Runner, recipe format and the allow-list; size the screen-less writes (sample-only step kinds, or product rows).
2. **Port one combination per PR, as a swap:** its recipe goes in and its code comes out in the same PR. A parity check (a fingerprint of that combination's configuration, built both ways, ignoring ids and times) runs as a **report, not a merge gate**, until that combination is swapped (challenge F4).
3. Snapshot in `isolated.sh`. In CI, one "seed" job per batch builds it and passes it to the regression jobs as a dump file, made with the same installed PostgreSQL version as the jobs restore with. The dump step refuses when the client and server versions differ (`cloud-setup.sh:69` records "pg_dump 16 refuses an 18 server"). The npm fallback server has no `pg_dump`, so on that path there is no snapshot and each copy builds as it does today. This adds a new CI job (a CI change).
4. Port B79a, B79b, B104 and `setup_vv_m3.ts` to recipes, each as a swap.
5. Retire the code path for what is ported. `demo-reset-to-six.ts` (controller) and `features/demo-reset-to-six.ts` (its registration) are the route gate B calls. They stay; only the code behind them changes (challenge F13).

**How the factory keeps working.** The product routes and gate B's data do not change. M2 and M3 lanes keep editing `demo.ts` until their combination is swapped, and parity is only a report, so no batch goes red because of the port. Who extends the runner: the same lane that needs a new step kind, in its own PR, as it edits `demo.ts` today. The runner keeps today's "one `demo.ts` PR at a time" rule (P-337, P-348 (8)).

**What could go wrong, and undo.**
* (a) Recipes grow into a second programming language. Refused by the allow-list; a review finding if a step carries logic.
* (b) A test copy runs on a snapshot built by old code. Prevented by the full key; the nightly build runs from recipes with no snapshot.
* (c) Restored data differs from a fresh build (sequence values, timestamps, tied sorts like QA-236 and `demo.ts:595`). The parity fingerprint ignores ids and times and compares content and order.
* (d) Working files and the database drift apart. One snapshot holds both, and they are restored together.
* **Undo:** the snapshot switches off by one environment setting in `isolated.sh` (`SNAPSHOT=off`). A swapped combination reverts with its own PR.

**Number it should move (P-312), checked 7 days after step 4 merges:**
* **PRs that add a combination using existing step kinds and edit any `api/src/*.ts`:** from every such PR today (B79a, B79b and B104 all edit `demo.ts`) to 0.
* **Merges touching `demo.ts` per IST day:** from 8 (4 Nov) and 7 (5 Nov) to at most 2. Runner step kinds remain.
* **Set-up minutes per merge-queue batch:** the baseline comes from step 0's batch log; the target is a cut of at least half. Kept only if the measurement shows it.

**STANDARDS §1 gate:** no new tool. PostgreSQL templates, `createdb`, `pg_dump` and JSON files are already in use. The seed job is a CI change, so its PR says so in its first line and the tech lead reads it.

## 4. Change 2 — One file per capability and per bug, with a generated index

**What moves.**
* Each row of `qa/CAPABILITIES.md` becomes `qa/capabilities/<ID>.md`. It has a fixed header and the evidence history below it, word for word: nothing is cut (AGENTS.md rule 8).
* Header fields: id, step, capability, milestone, status, tested-on commit and date, latest verdict link, plus the fields the compass needs (challenge F8): the date status last changed, and whether qa's first re-score after merge was Works.
* Each bug in `qa/BUGS.md` becomes `qa/bugs/<QA-n>.md`, with severity, capability, status, and whether it was found after merge (challenge F7).
* `qa/verdicts/` (58 entries since 4 Nov) stays and is linked.
* `qa/CAPABILITIES.md` and `qa/BUGS.md` become **generated indexes**, keeping today's first columns.

**Who reads it today.** All of these must keep working:
* `works-set.mjs` and `check-works-set.mjs` (the regression set in every batch), `m3-guard.sh`, `progress.sh`, `graph.mjs`, `factory-board.sh`, `lead-watch.sh`, `flow-watch.sh`, `decision-impact.sh`, `change-kind.sh`, `check-select-suites.sh`;
* `.mergify.yml`'s hand-kept M3 title pattern;
* the `qa`, `lead`, `screen-concept` and `scout` skills.

The 18 acceptance files that name the scorecard do so in comments only.

**Steps (rows), estimate 4.**
1. A reader module (`qa/capabilities` and `qa/bugs` → fields) used by every tool above, with a `--check` that the old table and the new files give the same set. `works-set --list` output is compared before and after and must be identical.
2. **The split, owned by the qa lane** (P-314: only qa edits these records), in a window with no qa records PR open; qa is told first (lesson of 5 Nov, `wtrec13`). `works-set.mjs` reads the files at the base if `qa/capabilities/` exists there, otherwise the table, so a batch that straddles the split still reads the right set.
3. `change-kind.sh` treats `qa/capabilities/` and `qa/bugs/` as it treats `qa/CAPABILITIES.md` today (records checks run, challenge F6). A check compares `.mergify.yml`'s M3 pattern with the M3 files.
4. **The index guard checks one commit, not "now".** The index says "generated at `<commit>`", and the guard checks that it equals the generator's output **at that commit**. A qa file that merges after the index PR was cut therefore does not throw the batch out (challenge F6). The index is refreshed in the one daily records PR (P-336). No tool reads it, so a few hours of staleness harm nobody.

**How the factory keeps working.** Mac qa (M2) and cloud qa (M3) keep scoring. After the split, each writes only the files of the rows and bugs it touched, so they never edit the same file unless they score the same row.

**What could go wrong, and undo.**
* (a) A tool still reads the old table. Step 1's `--check` and the identical `works-set` output catch it.
* (b) A header is malformed. The reader refuses it loudly; there is no silent skip.
* **Undo:** revert the split; the tables are regenerated from the files, so nothing written after the split is lost.

**Number it should move, checked 7 days after the split:**
* **Largest records file a qa PR edits:** from 230 KB to under 20 KB (the largest row today, C11.10, is 9 KB).
* **qa records PRs that conflict with each other:** to 0 a week, with both qa lanes writing.

**STANDARDS §1 gate:** none (Markdown and Node scripts the team already uses).

## 5. Change 3 — Generated records

**What moves.** STATE's running parts and the compass come from tools. Judgment stays in people's words, and rulings stay PR comments (P-336).
* **From tools:**
  * STATE's "In flight" table: open PRs from `factory-board.sh`, plus Mac lanes with no PR from the lane bindings (`tools/lane.sh`). The board's own header says it misses those (challenge F8).
  * The "Where we are" counts: `progress.sh`.
  * **The seven compass numbers** (RULES.md, "The compass"). No tool computes them today: `grep -il compass product/tools/*` finds none. A new `tools/compass.sh` reads git, GitHub and change 2's header fields. Its inputs are confirmed per day, Works on first re-score, Majors found after merge, demotions per day, capabilities in progress, records share of merges, and batches thrown away.
* **Stays hand-written:** the Leads list (it changes only at a hand-over), "Waiting for the founder", lessons, founder asks, and the day's rulings summary.

**Steps (rows), estimate 2.**
1. `compass.sh`, and a `tools/state.sh` that prints STATE's generated part.
2. STATE's running tables are replaced by "run `tools/state.sh`". The `lead` and `lead-watch` skills are told to read it; the skill edits are in that row, not here.

**How the factory keeps working.** The tools only read, so they run beside today's STATE for 2 days, and the Lead compares the two at each 30-minute check before STATE's tables are cut.

**What could go wrong, and undo.**
* (a) A tool's count differs from qa's. qa's files are the only input for Works, and the 2-day comparison catches a wrong tool.
* (b) GitHub is slow or refuses a cloud copy. The tool says "not read", never 0.
* **Undo:** STATE's tables come back from git history.

**Numbers it should move, checked 7 days after step 2 (challenge F8: numbers this change can move):**
* **Lead records PRs per day:** from 5 (5 Nov) to 1.
* **Compass produced from tools every day:** from no to yes.
* **Lines the Lead writes by hand per STATE update:** baseline taken at step 1.

**Not claimed:** records share of merges reaching the compass's 20%. With the Lead at 1 a day, 5 Nov would have been 19 of 41 (46%). 17 of the 23 records PRs were qa's, so the lever left is qa's cadence: for example, one qa records PR every 3 hours, or qa records merging on their own green docs check. That is a rule change for the founder (§10).

**STANDARDS §1 gate:** none (bash, `gh` and Python, as in `flow-watch.sh`).

## 6. Change 4 — Packs for the Works rows that have none

**What moves.**
* The 20 pack-less M2 Works rows each get an acceptance pack: C1.1, C1.2, C1.4, C1.8, C2.1, C2.2, C2.3, C3.1, C3.3, C3.7, C4.3, C4.9, C4.10, C5.3, C5.5, C5.6, C5.7, C11.2, C11.9, C11.18.
* **Each pack runs on the six, as a person's steps** (gate B's "pack alone" run). Wrapping a row's old checks is not enough: those scripts run on their own fixtures, which gives "fixture only" packs (challenge F12).
* The evidence comes from each row's latest verdict. For C4.3, C4.9 and C5.6 that is newer than 4 Nov: they were "Partial (was Works)" on 4 Nov and Works again since.
* Also without a pack: 3 Parked and 6 thin-slice Works rows. They stay out of the protected set, which covers M2 only, unless the founder puts them in.

**Steps (rows), estimate 6.** Each row covers 3–4 capabilities, grouped by area so one builder knows the screens: Setup (C1.x), Library (C2.x), Fields (C3.x), Forms and checklists (C4.x), Release and governance (C5.x), Demo and runtime (C11.x).

**How the factory keeps working.**
* A pack is a new file in `acceptance/`. The protected set picks it up from the base by itself (`works-set.mjs`).
* A pack that is red on `main` is held in `qa/REGRESSION-HELD.md` and sent to qa. The builder never demotes a row.
* Packs land two rows at a time, so batch jobs rise in steps that can be watched. GitHub job waits are the nearer limit (§9).

**What could go wrong, and undo.**
* (a) Batch time and waiting jobs grow, from 37 to 57 regression jobs per batch, up to 3 batches at once. They are measured after each two rows; adding packs pauses if waits pass 10 minutes.
* (b) A pack finds a real regression on a Works row. That is the point; it goes to qa as a bug.
* **Undo:** hold the pack by name in `REGRESSION-HELD.md`.

**Number it should move, checked 3 days after the last pack merges:**
* **Works rows without a pack:** from 20 of 57 to 0.
* **Works → Partial demotions found by qa after merge rather than by a batch before it:** the compass's at most 1 a day, with the batch catching them.

**STANDARDS §1 gate:** none.

## 7. Change 5 — A GitHub App for agent approvals (recorded, not enforced)

**What moves.**
* Today `.mergify.yml` merges on `label = review: approved` plus green CI, and the builder adds the label after its own sub-agent's Approve.
* After the change, the reviewer is **a separate session**, not a sub-agent of the builder. It runs in a cloud environment that holds the App's private key as an environment secret; builder environments do not have the key.
* It posts a GitHub **APPROVE review on the exact head commit** as the App (`<app>[bot]`), with its own session id in the body.
* Mergify's queue condition becomes "approved by `<app>[bot]`, none requesting changes". The repository's "dismiss stale approvals on push" setting makes any later push need a new approval, as today's rule already does (P-293 (1)).

**What it does and does not give (challenge F9).** It gives a **recorded** approval, by an identity other than the builder's, on the head commit, which today does not exist. It does **not enforce** independence:
* every session runs under one account;
* any session can start a session in the reviewer environment, or message one;
* session ids are written by the sessions themselves.

So the design adds one machine check, a CI step: the approving review's session id must differ from every `Claude-Session:` line in the PR's commits, and every commit on a product PR must carry that line. Today only 197 of 546 commits since 4 Nov carry one, so this check is part of the row. Real enforcement needs a credential no builder can reach: a separate account, which the founder dropped on 4 Nov (P-336), or the team's platform (P-249).

**Who starts reviewers, and the cost.** **Recommendation:** one standing reviewer session per area, which takes PRs by message, is fresh per PR through its own sub-agent, and hands over like a Lead. The other way is the Lead starting about 20 or more sessions a day, which is more load on the one Lead (§9). A cloud reviewer must run `cloud-setup.sh` and the app for the 1440 px walk. Its cost per PR is measured on the canary and is not assumed.

**Steps.**
* **Founder, once, estimate under an hour:** create the App (pull requests: write; contents: read), install it on this repository, add its key to a new "reviewer" cloud environment, and turn on "dismiss stale approvals" for `main` (this may need a branch rule).
* **Row 1:** the reviewer's approve step (mint a token from the key with `openssl` and `curl`, already in the image; post the review) and the session-id check. **Canary (P-326):** on one test PR, show that the token works through the cloud proxy, that the review posts, and that Mergify's condition matches the `[bot]` approval. Mergify counting a bot's review is an **outside fact, unconfirmed**.
* **Row 2:** the Mergify condition requires the label **and** the App approval for 3 days, then the App approval alone; the `next` and `screen-review` skills are updated in that row.

**How the factory keeps working.** During the 3 days both are required, so nothing merges on less than today. PRs labelled before the switch get one App approval on their current head from the area reviewer.

**What could go wrong, and undo.**
* (a) The key reaches a builder's environment. Rotate it; GitHub lists the App's actions.
* (b) The cloud proxy refuses the token request. Fallback: a workflow holds the key and posts the review when the reviewer posts its verdict comment, with the same session-id check. This is weaker, because anyone who can comment can trigger it.
* (c) Token cost goes up. It is measured on the canary against today's sub-agent review.
* (d) Mac lanes have no reviewer environment. Their PRs are reviewed by the cloud area reviewer.
* **Undo:** the Mergify condition goes back to the label (one line), and the App is uninstalled.

**Number it should move, checked 7 days after the label is dropped:**
* **Product PRs merged with an App approval on the head commit whose session id differs from every builder commit's:** from 0 of 3 sampled (5 Nov) to all.
* **Approval-to-merge:** stays under 1 hour (RULES, "How many sessions"). Its baseline is taken from `flow-watch.sh` at row 1.

**STANDARDS §1 gate** (for the founder's OK, recorded in `ENVIRONMENT.md` if adopted):
* **Problem:** no approval is recorded by anyone but the builder (§1).
* **Options:**
  1. keep the label (today);
  2. a second GitHub account for bots (dropped, P-336);
  3. a GitHub App (recommended);
  4. a workflow-held key (fallback).
* **Integration and upkeep:** one App, one secret, key rotation on any leak. The repository already runs Apps that post reviews and checks: Devin Review posted all 8 of #1057's reviews, and Mergify runs here.
* **Data and licence:** the App sees this repository only. Cost: **outside fact, unconfirmed** (GitHub Apps carry no charge of their own). Legal points: Unconfirmed: no counsel.
* **Reconsider** when the team's platform owns the repository or its approval flow (P-249).

## 8. How each number was measured (5 Nov, 13:00–14:40 IST, `main` 7bf8db261)

| Number | Command (repository root; `S` = `…/prototype/studio/api/src`, `P` = `…/product`) |
|---|---|
| `demo.ts` size and merges | `wc -lc $S/demo.ts` · `git log --first-parent -m --merges origin/main -- $S/demo.ts` (43; with the other demo files 44) · per IST day: `--since=<day-1>T18:30Z --until=<day>T18:30Z` (8 of 107 on 4 Nov, 7 of 45 on 5 Nov) |
| Open PRs on `demo.ts` | for each open PR head: `git diff --stat $(git merge-base origin/main <head>) <head> -- $S/demo.ts` (8 of 13 builder PRs) |
| Server files in merges | `git diff --name-only <m>^1 <m>` per 5 Nov merge: 15 of 22 non-records merges touch `api/src`, `prisma` or `samples` (challenger, re-run) |
| Pack set-up time | `screens/gate-b/review.md:11`: "C11.13 on the six: exit 0, 15/15, 46 s (copy 5 s, Reset to the six 37 s, run 5 s)": one sample |
| Scorecard | `wc -c $P/qa/CAPABILITIES.md` · `grep -c '^\| C[0-9]'` · size by day: `git show $(git rev-list -1 --first-parent --before=<day>T18:30Z origin/main):…` · commits since 4 Nov 18:30 UTC (18) |
| Bugs file | `wc -c $P/qa/BUGS.md` · commits on 5 Nov (22) · qa records merges editing it (13 of 17) |
| Records share | first-parent merges on 5 Nov IST, classed by branch (`qa-records-*`, `lead/*`, `qa-regression-data`): 23 of 45 |
| Pack-less Works | `cd studio && RANGE= node tools/works-set.mjs --list`: "57 capabilities, 37 with an acceptance pack" |
| Approvals | GitHub reviews API on #1057, #1051, #1009: COMMENTED only (8 on #1057, all Devin Review), none APPROVED; open PR list: one author login |
| Session lines | `git log --no-merges --since=2026-11-03T18:30Z --format=%B origin/main \| grep -c '^Claude-Session:'`: 197 of 546 |
| Suites | `tools/suite-times.tsv`: 262 suites, 4,943 s (3 Nov medians) |

## 9. What still breaks at 1,000 after these five, and when to tackle it

| Breaks | Evidence today | What to do | Tackle when |
|---|---|---|---|
| **GitHub job concurrency** (nearest) | `ci.yml` comment (P-214, 4 Nov 12:24–12:58 IST): 7–28 jobs waiting up to 57 min. After change 4: 57 regression jobs per batch, with up to 3 batches at once (`.mergify.yml max_parallel_checks: 3`) | **Per-batch test selection:** run only the packs whose capability's pages, routes or files the batch touches (`graph.mjs` already maps capabilities to pages and routes); the full set nightly and before a milestone | Now, with change 4: when job waits pass 10 minutes, or the protected set passes 80 packs |
| **Token budget** | P-353: burn about 6% of the weekly plan an hour against P-336's 2.5%/h trip-wire; change 5 adds a reviewer per area | Measure tokens per confirmed capability per role from `get_usage`; cap lanes by the burn, not by count | Every week; before adding any lane |
| **One Lead session** | 12 Leads named in DECISIONS from 3 Nov evening to 5 Nov 13:00 IST (about one every 3 h); hand-over at about 400k tokens (P-314); STATE lists 11 lanes plus qa in flight | One coordinating Lead plus area Leads, each with a board filtered from `state.sh`; needs change 3 | More than 10 lanes, or 200 capabilities |
| **Per-row re-scoring by qa** | qa re-scores each row a merged PR names by walking like a person (P-290, P-311); 17 qa records PRs in 13 hours on 5 Nov | Unchanged rows stay confirmed by their green pack; qa walks journeys (P-348 (2)) and samples rows; more qa lanes by area. This changes the Works rule (P-290), so it is the founder's call | qa's re-score queue older than one day |
| **Queue throughput** | About 9–12 product PRs per confirmed capability (P-312), so about 10,000 PRs for 1,000 capabilities through batches of up to 6 | Bigger batches only once test selection has cut batch time; fewer PRs per capability (fewer fix PRs after merge) | When the queue holds over 20 approved PRs |
| **Full-history checkout** | Most CI jobs check out full history (`fetch-depth: 0`) of a 1.39 GiB repository (challenger, `git count-objects -vH`); only `regression-plan` uses `filter: blob:none` | Partial clone (`filter: blob:none`) in every job that needs history; shallow where it does not | When checkout passes 1 minute in step 0's measurement |
| **Other single files** | `DECISIONS.md` 233 KB, 255 rows; `BACKLOG.md` 50 KB | The same split as change 2 (decisions by month with an index; one file per backlog row) | When a file passes 300 KB or two writers conflict |

## 10. Rules this design touches, and the questions for the founder

* **Process freeze to 10 Nov 22:30 IST, then at most one change a week (P-312; `WAY-OF-WORKING.md:80`).** Changes 2, 3 and 5 are process changes; change 1 changes test copies and CI, but not what Works counts on. As five separate changes, the last one lands about 5 weeks after the first. **Question 1:** does the scale phase P-353 chose count as one change, with each part keeping its own number and check date, or as five? **Recommendation:** one change, with each part checked and undone on its own.
* **Trip-wire (P-336, kept by P-353):** at 6 Nov 23:00 IST, if M2 is under 57 confirmed or the burn is over 2.5% an hour, the work switches to scale-first. **Question 2:** if it fires, what comes first? **Recommendation:** change 2 (no shared files, 4 rows), then change 1's step 0 (measure only).
* **Works freeze (P-337) and the Works basis (P-322):** untouched. Change 1 keeps the product routes; only test copies use the snapshot.
* **Who writes what (P-314):** qa does the split in change 2 and stays the only writer of capability and bug records. Change 5 changes who approves, not who builds.
* **Not decided here (each goes to the founder one at a time, with a recommendation):** qa's records cadence (§5); the Works rule at 1,000 (§9); area Leads (§9).

## 11. Independent challenge: verdict and answers

The challenge is in `scale-phase-2026-11-05-challenge.md`: an independent Opus challenger in a fresh context, which did not write this document. It re-measured the numbers, and most matched. The one mismatch was the 4 Nov `demo.ts` count, where time zones were mixed; it is fixed above.

**Verdict: Approve with changes.** No Blocker; 11 Majors and 4 Minors. It asks for changes 1 and 5 to be reworked, with a short re-challenge before their build rows start. They are reworked above. The re-challenge is not run here: **it is to be run on rows 1 and 5 before they are built**, as the challenger asks.

| # | Severity | Answer | Where |
|---|---|---|---|
| F1 | Major | Accepted. The snapshot key now covers everything the build reads, and the text says almost every code batch rebuilds it | §3 |
| F2 | Major | Accepted. "Existing cache" is gone. A seed job passes a version-checked dump; the npm fallback runs without a snapshot. The 37 s is labelled one sample. Step 0 measures a real batch before anything is built, and the snapshot is dropped if set-up is a small share | §1, §3 |
| F3 | Major | Accepted. The runner is named as the new shared file; data-only and logic edits are told apart; screen-less writes are sized in step 1; effort 5 → 8 rows | §3 |
| F4 | Major | Accepted. Parity is a report, not a gate, and each combination is ported as a single swap, so M3's lanes (B79a, B79b, B104) are not stalled | §3 |
| F5 | Major | Accepted. Product routes unchanged; the snapshot is used only in `isolated.sh` test copies, before the API starts; the :4400 demo is never restored | §3, §10 |
| F6 | Major | Accepted. The guard checks the index against its own "generated at" commit; `change-kind.sh`, `.mergify.yml`'s pattern and `scout` are added; qa owns the split | §4 |
| F7 | Major | Accepted. Bugs split into one file per bug inside change 2 (+1 row), so "0 conflicts" can be met | §4 |
| F8 | Major | Accepted. Change 3's numbers are now ones it moves (Lead records PRs 5 → 1, compass daily yes or no). The 20% share is not claimed, and qa's cadence goes to the founder. Mac lanes come from `lane.sh`; compass fields are added in change 2 | §4, §5 |
| F9 | Major | Accepted. Titled "recorded, not enforced", with a CI session-id check. Area reviewer sessions are recommended, with cost measured on the canary. The founder's steps include "dismiss stale approvals"; the canary includes Mergify matching a `[bot]` approval | §7 |
| F10 | Major | Accepted. The one-change-a-week rule, the trip-wire and P-337 are in §10 as two founder questions. Builder-days are no longer claimed | §2, §10 |
| F11 | Major | Accepted. Rows added for job concurrency (now nearest, test selection moved earlier), token budget, queue throughput and full-history checkout | §9 |
| F12 | Minor | Fixed. Packs run on the six as a person's steps; C4.3, C4.9 and C5.6 use evidence newer than 4 Nov | §6 |
| F13 | Minor | Fixed. Counts are by IST day; `demo-reset-to-six.ts` is a controller and its registration and stays; 11 lanes plus qa | §1, §3, §9 |
| F14 | Minor | Fixed. Effort and the founder's time are marked estimate; outside facts are labelled; `setup_vv_m3.ts` is in change 1's scope; the approval-to-merge baseline comes at row 1 | §2, §3, §7 |
| F15 | Minor | Accepted. Changes 1 and 2 start together | §2 |

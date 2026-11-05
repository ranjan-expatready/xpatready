# Challenge of scale-phase-2026-11-05.md

5 Nov 2026 · independent Opus challenger, fresh context (did not write the design) · read-only: no file changed except this one, no commit, no GitHub tools, live AI off, US$0.

**What I checked:** every number in §1 and §8 re-run on `main` 7bf8db261 (the design sits on top of it as 00bfae6ba); `demo.ts`, `forms-demo.ts`, both `demo-reset-to-six.ts`; the 8 open branches that edit `demo.ts` (what they change); `gate-b.mjs`, `works-set.mjs`, `isolated.sh`, `cloud-setup.sh`, `ci.yml`, `.mergify.yml`, `change-kind.sh`, `factory-board.sh`, `m3-guard.sh`, `lead-watch.sh`; `RULES.md`, `WAY-OF-WORKING.md`, `STANDARDS.md` §1, `STATE.md`; P-312, P-314, P-320, P-322, P-326, P-336, P-337, P-348, P-351, P-353 (from `origin/lead/2026-11-05-lead11c`).

**Verdict: Approve with changes**

The order and the five directions are sound, the numbers mostly match, and the brief's shape is met. But change 1's snapshot as written would weaken the merge-time regression gate and probably not save CI time. Change 5 records a different identity, not an independent reviewer. Two of the "numbers it should move" cannot be moved by their own change. And the rule that allows at most one process change a week after 10 Nov is missing. Rework changes 1 and 5 (F1–F5, F9) and get a short re-challenge before their build rows start. The rest can be fixed in the text.

## Findings

**F1 · Major · §3 Change 1, the snapshot key.** The key is "migrations, recipes, runner, saved AI answers". It leaves out the services the runner calls (`api/src/*`, `engine/`, `samples/`). If a PR changes how a screen's service sets things up, the packs still run on data that the old code built. The break then shows only at the nightly, after merge. That is exactly the hole the protected set exists to close (P-320 (b)). It also goes against "Works counts only if product steps built it" (P-322, frozen by P-337 until M2 = 60).
*Measured:* 15 of the 22 non-records merges on 5 Nov (00:00–12:58 IST) touched `studio/api/src`, `prisma` or `samples` (`git diff --name-only <m>^1 <m>` for each first-parent merge).
*Change:* key the snapshot on everything the build reads (at least `api/src`, `engine`, `prisma`, `samples`, saved answers). Then say honestly that almost every code batch rebuilds it. With a batch of up to 6 PRs, about 7 in 10 PRs touching the server means nearly every batch misses the cache. So the CI saving is small, and the saving applies mainly to local copies and gate B on one machine. Re-state the number to match.

**F2 · Major · §3 "CI keeps one in its existing cache", the "37 s → under 5 s" number and §1 row 2.**
* (a) There is no cache to keep it in. `ci.yml` caches only npm (`cache: npm` in `setup-node`), and CI runs only on `pull_request`, so there is no cache built on main for a pull request to restore (GitHub's scoping: an outside fact, not measured).
* (b) Each regression job is a separate GitHub machine that installs PostgreSQL 18 afresh (`cloud-setup.sh`). A template database lives inside one server, so moving a snapshot between machines needs `pg_dump`/`pg_restore` or a copy of the data folder. The npm fallback server ships no `pg_dump` (`cloud-setup.sh:66–69`).
* (c) The 37 s is one sample: one pack (C11.13), one run on 4 Nov 09:23 IST (`screens/gate-b/review.md:11`), and probably not on a GitHub machine. The matrix runs in parallel, so "57 × 37 s" is machine time, not batch time.
* (d) 7 of the 38 protected packs run "fixture only" and never call Reset to the six (counted with `gate-b.mjs runPlan` over the protected set).
* (e) Each job also checks out full history (`fetch-depth: 0`) of a 1.39 GiB pack (`git count-objects -vH`) and installs Playwright. Nobody has measured how that time compares with the 37 s.

*Change:* measure one real regression job's step times from a batch log before claiming a gain. Name the transport between machines (a build-once job plus an artifact, or a dump file) and its version check. Put "existing cache" back as "new cache step".

**F3 · Major · §1 row 1 and §3 "8 of 13 → 0".** The 8 open `demo.ts` edits are mostly loader logic, not set-up data. The data is already in data files (P-319: `samples/conditional-documents.json`, `section-names.json`).
*Measured:* `git diff <merge-base> <branch> -- api/src/demo.ts` on the 8 branches:
* B82 changes which proposal kinds are rejected;
* B78 adds a section-naming step;
* C6.4 adds a 66-line new step type;
* `busy-rubin` changes how a condition body is built;
* B83 changes an import and one argument.

Those changes become runner or allow-list changes, so the hot file moves from `demo.ts` to the runner. Also, `loadSix` writes to the database directly where there is no screen service (`demo.ts:448–452`: `programDef.updateMany`, `sampleProfile.create`, `sampleFact.createMany`). In all, `demo.ts` makes 72 distinct service and database calls. Each one with no screen becomes a product row under the design's own rule.
*Change:* re-measure as "edits that only add data" against "edits that add a step kind". Expect the runner to become the new shared file. Size the product rows that the screen-less writes create. 5 rows for change 1 looks low.

**F4 · Major · §3 "How the factory keeps working" (parity in every batch, code path default).** During steps 1–4, M2 and M3 lanes keep changing set-up in code (B79a, B79b, B104, P-351 (1)(2)). If the parity check runs in every batch, each such change must also be written into the recipe, or the batch goes red and is thrown away. From step 2, new set-up work "is a recipe file", but it waits on any step kind the runner lacks (see F3). Both of these can stall the M3 lanes.
*Change:* make parity a report, not a merge gate, until step 4. Or port one combination at a time as a single swap (recipe in, its code out, in one PR). State who extends the runner and how fast.

**F5 · Major · §3 "Reset to the six and Load the configured checkpoint then restore it".** These are product routes. D1 (P-226) says Reset to the six runs "by the same code paths", and gate B calls `POST /api/demo/reset-to-six` (`gate-b.mjs:244`). Turning them into a database restore changes a capability and the data that Works counts on (RULES "Works is frozen at P-322 until M2 = 60"). That needs the founder's decision, which §10 does not list.
It is also technically harder than stated:
* `CREATE DATABASE … TEMPLATE` needs no other connection open to the template, and the target must not exist. On the :4400 demo, the running API holds the database open.
* The reset clears one workspace (`wipe`, `demo.ts:981–1005`), but a restore replaces the whole database.

*Change:* restore only in the test harness (`isolated.sh start`: `createdb -T <snapshot>` before the API starts, which is simple and safe). Keep the product routes building by product steps.

**F6 · Major · §4 Change 2, the generated index and its guard.** "A PR that changes `CAPABILITIES.md` must leave it equal to the generator's output" will fail in the merge queue. Mergify tests on the latest main. If any qa file PR merged after the daily records PR was cut (17 qa records PRs on 5 Nov by 12:58 IST), the index no longer equals the generator's output and the batch is thrown away.
Two smaller gaps:
* `change-kind.sh:23` treats `qa/CAPABILITIES.md` as a risky path. New `qa/capabilities/*.md` files would be classed "notes" and skip the records checks (graph, guards) unless the pattern is extended.
* The reader list misses `.mergify.yml`, whose M3 title pattern is kept by hand from the table's M3 rows (its comment says so), and the `scout` skill.

On ownership: P-314 (1) says only qa edits `CAPABILITIES.md`, so the split PR must be qa's or carry the founder's exception.
*Change:* have the guard check that the index matches the commit it says it was generated at, or regenerate it after merge with a push-to-main workflow (the `demo-update.yml` pattern). Add `qa/capabilities/` to `change-kind.sh`. Name the split's owner.

**F7 · Major · §4 number "0 conflicts a week with both qa lanes writing".** It cannot be met while `qa/BUGS.md` is one file. 13 of the 17 qa records PRs on 5 Nov also edit `qa/BUGS.md` (`git diff --name-only` per merge). `BUGS.md` is 57,557 bytes with 22 commits on 5 Nov, and both qa lanes write it. §9 defers this file until "two writers conflict", which is already true.
*Change:* split the bugs into one file per bug inside change 2 (about +1 row), or change the number to "conflicts on capability records".

**F8 · Major · §5 Change 3's number.** The design's own arithmetic shows that change 3 cannot reach 20%: cutting the Lead's records PRs from 5 to 1 gives 19 of 41 = 46%. P-312 asks for the number the change should move.
The inputs are also weaker than stated:
* `factory-board.sh` says in its header that a Mac lane with no PR "does not show: read STATE 'In flight'" for it, so the generated in-flight table drops Mac lanes.
* `Claude-Session:` lines are on only 197 of 546 commits since 4 Nov IST (re-measured: match) and do not say which session was a Lead.
* "Majors after merge" and "Works on first re-score" are written as prose today, with no field a tool can read.

*Change:* use numbers this change actually moves (Lead records PRs per day; minutes per 30-minute check; compass produced daily, yes or no). Add the fields the compass needs to the per-capability header and to bugs. Read Mac lanes from the lane list.

**F9 · Major · §7 Change 5, independence.** The App gives a second recorded identity. It does not give an independent reviewer:
* All sessions share one account and one GitHub login. Any session can start a session in any environment of the account (`create_session` takes an `environment_id`; `list_environments` lists them) or message an existing reviewer session. So a builder can have "its" reviewer approve.
* The success number ("approval recorded by an identity other than the author's") measures the mechanism, so it will be 100% whether or not the reviewer was independent.
* The fallback (b) relies on session ids written in text by the sessions themselves.
* How "the builder's PR starts" a session is not described. A workflow that starts Claude would be new technology needing the §1 gate, and possibly paid. If the Lead starts every reviewer instead, that is about 20+ more starts a day through the one Lead that §9 already calls a limit.

Also missing:
* The founder's 20 minutes leave out the branch setting "dismiss stale approvals". That is a repository settings change, and it may require pull-request rules on main.
* The canary tests only the token and the review post. It must also show Mergify's `approved-reviews-by` matching a `[bot]` login. Mergify counts reviewers with write access (an outside fact, unconfirmed).
* The reviewer's start-up is more than "start-up". A cloud reviewer must run `cloud-setup.sh` and the app for screen-reviewer's walk at 1440 px. Each push after approval (for example merging main on a conflict, `next` skill step 2) needs a fresh session.

*Change:* say plainly "recorded, not enforced". Add a check that the review body's session id differs from every `Claude-Session:` line in the PR. Name who starts reviewers and what it costs. Widen the canary and the founder's steps.

**F10 · Major · §10, rules.** `WAY-OF-WORKING.md:80`: after 10 Nov 22:30 IST, process changes are "at most one a week". Changes 2, 3 and 5 are process changes, and change 1 changes the basis that Works counts on. In sequence that is about 4–5 weeks, not "4–5 builder-days". §10 cites only the freeze.
Two more gaps:
* The P-336 trip-wire (6 Nov 23:00 IST: switch to scale-first) could start building before M2 lands. The design says only "when M2 lands" (P-353 keeps the trip-wire standing).
* P-337's Works freeze is not named.

*Change:* ask the founder once whether the five count as one change or five, and what is built first if the trip-wire fires.

**F11 · Major · §9 "What still breaks at 1,000".** It misses the limits most likely to bite first:
* **Token budget:** P-353 records a burn of about 6% of the weekly plan an hour against a 2.5% trip-wire, and change 5 adds a session per PR.
* **GitHub job concurrency:** the `ci.yml` comment (P-214, 4 Nov) measured 7–28 jobs waiting up to 57 min. After change 4 that becomes 57 regression jobs per batch × up to 3 batches at once (`.mergify.yml max_parallel_checks: 3`).
* **Full-history checkout:** every job checks out a 1.39 GiB pack, and it grows.
* **Queue throughput:** P-312 measured 9–12 PRs per confirmed capability, which is about 10,000 PRs for 1,000 capabilities, through batches of 6.

*Change:* add these rows with their evidence and a "tackle when" for each. Test selection (row 2) should move earlier, because concurrency, not GitHub's 256-job matrix limit, is the nearer wall.

**F12 · Minor · §6 Change 4.** "Each pack is written from that row's 4 Nov verdict" does not hold for every row:
* 3 of the 20 (C4.3, C4.9, C5.6) were "Partial (was Works)" on 4 Nov (`qa/verdicts/2026-11-04-<ID>.md`), so their packs must come from later evidence.
* The checks those verdicts name are scripts that run on their own fixtures (for example `check_screen01_smallfix.cjs`). Wrapped as they are, they make "fixture only" packs (gate B: Works then needs qa's demo-data PASS), not packs on the six.
* "The total should fall" depends on F2.

*Change:* write each pack on the six, as a person's steps. List the 3 rows' current evidence.

**F13 · Minor · numbers and facts.**
* "13 on 4 Nov alone, of 107 merges" mixes time zones. By UTC day it is 13 of 127; by IST day it is 8 of 107.
* On 5 Nov IST up to 12:58, 7 merges touched `demo.ts`, not 2.
* The target ("per week at most 1") is compared with a per-day baseline.
* The "two copies" of `demo-reset-to-six.ts` are not copies. One is the controller (1,019 B), the other its feature registration (283 B). "Retiring" them would remove the route gate B calls.
* STATE's in-flight table has 11 rows plus the qa lane (12), not 13.

*Change:* fix the text.

**F14 · Minor · unmeasured claims.**
* No measured basis: the effort in rows and builder-days (no throughput measured), the founder's "about 20 minutes", the approval-to-merge baseline, and the reviewer's start-up cost.
* Outside facts not labelled as such: "no cost on GitHub's free plan for Apps", and "Devin posted 8 reviews on #1057" (GitHub, not in §8).
* Change 1 also misses a second set-up path: `acceptance/lib/setup_vv_m3.ts` (22,969 B) and `tests/runtime/setup_visitor_visa.ts` build M3's Visitor visa release through routes.

*Change:* measure the unmeasured claims, label the outside facts, and add or exclude the second set-up path.

**F15 · Minor · order.** P-353 set the order, and the design follows it.
* Change 2 shares no files with change 1, costs 3 rows, and the scorecard grows by about 40 KB a day.
* The `demo.ts` queue is already eased by stacked PRs (P-348 (8)).
* If F1–F3 shrink change 1's gain, change 2 is the better first step.

*Change:* say that 2 can run alongside 1 from day one.

## Numbers re-measured (5 Nov, `main` 7bf8db261)

| Number | Design | Re-measured | Match |
|---|---|---|---|
| `demo.ts` size | 111 KB, 1,014 lines | 111,293 B, 1,014 lines | yes |
| Merges touching `demo.ts` since 23 Oct | 43 (44 with the other demo files) | 43 (44) | yes |
| `demo.ts` merges on 4 Nov | 13, of 107 merges | 13 of 127 (UTC) or 8 of 107 (IST) | no, time zones mixed |
| Open branches editing `demo.ts` | 8 of 13 PRs | 8 local `origin/` branches; PR count not checked (no GitHub tools) | plausible |
| `forms-demo.ts` | 7.7 KB | 7,752 B | yes |
| `CAPABILITIES.md` size and rows | 230,553 B, 98 rows | 230,553 B, 98 rows | yes |
| Scorecard growth | 19 KB → 230 KB; 71 → 98 rows | 19,161 B / 71 rows (25 Oct) → 214,354 B / 98 rows (4 Nov) → 230,553 B | yes |
| Commits to `CAPABILITIES.md` on 5 Nov | 18 | 18 | yes |
| Records share of 5 Nov merges | 23 of 45 (17 qa, 5 Lead, 1 data) | 23 of 45 (17, 5, 1) | yes |
| Protected set (`works-set --list`) | 57 rows, 37 with a pack | "57 capabilities, 37 with an acceptance pack, 37 re-run"; same 20 ids | yes |
| Pack-less rows on 4 Nov | 18 of 42 | 18 of 42 at 98177d6c7 (4 Nov 19:35 IST) | yes |
| Readers of `CAPABILITIES.md` | 11 tools and CI | 11 tools; also `.mergify.yml` and `scout` | partly |
| Acceptance files naming it | 18 | 18 (17 packs and the README) | yes |
| Commits with `Claude-Session:` | 197 of 546 | 197 of 546 non-merge commits since 4 Nov IST | yes |
| Compass tool | none | none (`grep -il compass tools/*`) | yes |
| Suite times | 262 suites, 4,943 s | 4,943 s | yes |
| `DECISIONS.md` / `BUGS.md` / `BACKLOG.md` | 233 KB, 255 rows / 57 KB, 22 commits / 50 KB | 233,191 B, 255 rows / 57,557 B, 22 / 50,734 B | yes |
| Gate B set-up time | 37 s of 46 s | as quoted, but one sample (4 Nov 09:23 IST) | yes, but thin |
| Approvals on #1057, #1051, #1009; one author login | 0 APPROVED; one login | not re-measured (no GitHub tools by brief) | not checked |

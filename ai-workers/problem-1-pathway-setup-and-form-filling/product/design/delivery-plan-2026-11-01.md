# Delivery plan from 1 Nov: tests first, a swarm of builders, Visitor visa end to end first (P-220)

Founder agreed 1 Nov 2026 (option B, ordered by option C). Written by the tech lead after three independent reviews (throughput, quality and risk, product outcome; each read the repository and GitHub history on its own) and the tech lead's own challenge. Estimates are marked as estimates.

## 1. Why we were slow (evidence, our own history)

| Loss | Evidence | Fix in this plan |
|---|---|---|
| "Done" was decided during review, not before building | Reviewers block about 1 in 3 PRs on the first round; about 35% of PRs since 29 Oct were closed without merging (66 of 189) | Every open capability gets its acceptance tests **before** building |
| Thin slices instead of whole capabilities | 92 PRs merged since 31 Oct; only 14 titles named a capability; on 1 Nov only C1.8 moved to Works | A builder owns a whole capability until its tests are green |
| Process work | 41 of those 92 PRs were lead, qa, tooling or runner PRs | Records: one PR a day each for the Lead and qa |
| Flaky checks breaking batches | 7 of 21 batches failed after the GitHub machines arrived (`ps -E` on Linux, a speed budget, a drift check) | Fixed before the swarm starts |
| Bugs found late, where features meet | Both recent Majors (QA-119, QA-122) were seam bugs, after every per-PR review passed | Journey tests written first cover the seams |
| Merging needed a person | Every merge since 31 Oct was queued by a typed command | Merge Protections on (1 Nov); approved PRs queue themselves |

Typing code is not the limit: the queue merges up to 6 PRs every 12–17 minutes and carried about 3 per batch, so it was waiting for work.

## 2. The three options considered

| | A. Six journey teams | **B. Tests first, then a swarm (chosen)** | C. One combination end to end first |
|---|---|---|---|
| Unit of work | A journey, owned by one builder | A capability, with its tests written and challenged before anyone builds | One combination through M2 and M3 |
| Who writes "done" | The builder, as it goes | A separate test-writing team, checked by challengers, skimmed by the founder | The builder |
| Parallel builders | 6 | 10–12 | 3–6 |
| Compliance | Implicit | **Each IRCC business rule traced: rule → official source (page, quote, date) → test → capability** | Implicit |
| Known in history as | Amazon's two-pizza teams | Regulated software (aircraft DO-178C, medical devices): requirement → test traceability; test-first development | Walking skeleton (Cockburn); Toyota's first run |
| M2 done (estimate) | 6–8 working days | **3–5 working days** | M2 later, M3 sooner |
| Main risk | Paced by one qa session and the forms order | Tests must be right; more builders, more collisions on shared files; highest usage | Breadth waits |

**Chosen: B, ordered by C.** We write every test and the compliance table first, then swarm, and the first journey made green is **Visitor visa (`vv.single`) end to end**: configured in M2, then a case, document collection, filing, verification and the application ready (the M3 parts, whose design r5c was agreed 29 Oct). Breadth to the other five combinations runs on the same tests. No scope is cut (P-173); only the order changes.

**How this differs from A:** in A each builder discovers "done" while building and qa finds the gaps after merge; in B "done" is written, challenged and agreed before building, twice as many builders work at once because each one has a failing test to turn green, and compliance becomes a table anyone can check.

## 3. The tech lead's challenge of B (and how each point is handled)

1. **Tests for screens not yet built cannot click real buttons.** Day-0 tests check the API and the data underneath (executable now); the click-through journeys are written as numbered steps with expected results, and the builder turns them into browser checks.
2. **Failing tests must not break the merge queue.** They live in `prototype/studio/acceptance/` (not run by `run-suites.sh` or the batches). A builder moves its capability's tests into the suites in the PR that makes them pass.
3. **The test writers need the team's requirements** (`sources/` and `code/`, Mac only), so Day 0 runs on the Mac. Builders run in the cloud from `main`.
4. **Twelve builders collide on shared files.** One owner each: the Prisma schema and every migration go through the tech lead, one at a time; `contracts/workspace.ts` is owned by the forms intake builder; `api/src/studio.ts` changes are additive only and named in the PR's first line.
5. **Wrong tests multiply wrong work.** Each test pack is attacked by a fresh challenger agent before any builder starts; the founder skims one list of capabilities and rules (not code).
6. **One qa session cannot keep up.** Two to three qa sessions walk journeys as they turn green.
7. **The founder's decisions are serial.** Batched: one sitting to skim the tests, one for any new M3 screen look, one paid AI budget for replayed and live runs (amount stated before it is spent).

## 4. The work, in order

**Day 0 (1 Nov, Mac, about half a day):**
* Four test-writing sessions (Mac, own worktrees), one per group: (1) forms in and field mapping; (2) AI drafting, questionnaires and release; (3) library upkeep, demo and runtime proof; (4) Visitor visa M3 path (case, documents, filing, verification, application ready).
* Each delivers: acceptance tests per open capability (API and data, executable, failing now), journey steps for screens, and its rows of the compliance table `product/compliance-trace.md` (rule → canada.ca page, quote, date → test → capability; values not found labelled Sample, legal points "Unconfirmed: no counsel").
* A fresh challenger per pack; the tech lead merges the packs; the founder skims the list.
* In parallel: one session fixes the known flaky checks (P-214).

**Days 1–3 (from 2 Nov):** 10–12 cloud builders, one capability group each, Visitor visa path first; every PR names its capability IDs and moves its tests into the suites; 2–3 qa sessions walk journeys as they go green.

**Target (estimate):** Visitor visa configured end to end by 3 Nov; Visitor visa case to application ready by 5 Nov; M2 for all six combinations by 6 Nov; M3 for all combinations about 12–14 Nov. Checkpoint 3 Nov with measured numbers (capabilities green, journeys qa-passed, spend).

## 5. Tracking

* `qa/CAPABILITIES.md` stays the scoreboard (Works / Built, awaiting qa / Partial / Not built); `tools/progress.sh` counts it.
* New: each capability shows its acceptance tests (green or red), and `compliance-trace.md` shows each IRCC rule with its source and test.
* The tech lead reports: capabilities green, journeys qa-passed, batches passed or failed, usage share and spend, three to five lines at each check.

## 6. Cost and limits

* Weekly AI plan: 37% used on 1 Nov (resets 5 Nov); 10–12 builders need extra usage, turned on by the founder with a cap. The tech lead measures after the first two hours of the swarm and reports before adding more.
* Live AI stays off; replayed runs at US$0 unless the founder approves a stated budget.
* GitHub machine minutes: within the US$30 trial cap; verdict 3 Nov.

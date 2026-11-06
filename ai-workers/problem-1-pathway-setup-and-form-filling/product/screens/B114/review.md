# Review: B114, QA-262 (C4.11, C5.1): a condition on one combination stops another releasing

Reviewer: independent agent, did not build it, 5 Nov. PR #1115, commit **87385d60f** against origin/main 03f91dbbe (no newer commits on main). US$0: Saved and Rules only, no `STUDIO_*_LIVE`, no priced button, never :4400. Copy `b114r` on :4452, one at a time, stopped.

**Verdict in short: Approve.** Open: 0 Blocker, 0 Major, 5 Minor. Journey score **9/10** (`journey-test-reviewer-2026-11-05.md`).
**Permissions or schema: neither is touched.** The diff is `engine/snapshot.ts`, one new check, one built note and screenshots, with nothing in `prisma/`, duties or routes. No screen, money or permission code changed, so these give no reason to run a breaker.

## The tech lead's hard constraints
| Constraint | Result | Evidence |
|---|---|---|
| Fingerprint check not removed or loosened | Met | `api/src/studio.ts` is not in the diff. **Ran:** with line 1212 disabled, the check falls to 55/57 and the release answers 201 |
| Hiding (P-303) not relaxed | Met | `engine/validate.ts` is not in the diff. **Ran:** with Hiding disabled, the check falls to 55/57. Walked: With an LMIA still shows it, and Submit is off |
| `vv.single-ae2133b8a398` does not move | Met | The check compares the whole name on fresh copies. After all my runs, `p2/question-lists` holds only that file |

## The builder's claims, re-run
| Claim | My result |
|---|---|
| Final check on the fix (57/57 was **unverified**, per the coordinator) | **Ran: 57/57, exit 0**, 86 s |
| 46/57 on main's `snapshot.ts` | **Ran: 46/57, exit 1**: 11 fails, all QA-262 lines, 4 of them the 409 itself |
| Fingerprints identical before and after | **Ran:** old and new assembly on one Load configured database (6 combinations, 3 releases, 229 questions with a condition): 12 of 12 identical (draft and published modes). I did not compare frozen release hashes directly. The new read is no slower: draft 278 ms against 477 ms (old ran first, cold), published 222 ms against 245 ms |
| Packs C4.11, C4.5, C5.1, C5.2, C5.4 | **Ran on fresh copies:** 24/24, 26/26, 49/49, 32/32 (after `setup_visitor_visa` 15/15), 27/27, all exit 0. The builder's `packs.txt` shows C5.2 exit 2 for missing setup; its later log shows 32/32 |
| Scratch merge with #1068 | **Ran:** `C4.11-spread` 8/8; with all conditions in force, VV, SP, EE, Spouse and LMIA all 201 with draft equal to release. **VV-first order only.** The other order is the builder's log, which I only read |
| Types | **Ran:** `tsc -p api`: 0 errors in `engine/` and `api/src/`, none in the new check. 15 errors in `tests/`, none in files this PR touches. `web` not run: no web change |

## Questions attacked
**Does a draft and its published snapshot always agree?** With nobody editing, yes.
* **Ran:** property test of the real `assemble` over random libraries (fake database, `publishRow`'s publish rule copied in the test; forms and placements only, no document lines or rules): drafts adding, changing and withdrawing conditions, shared questions, draft fields, derived chains. **Fix 0 of 4,500 releases differ; main 2,054 of 4,500.** With section moves added to the random drafts, the fix differs in 521 of 4,500: that is Minor 1.
* **Ran on the app:** one question placed by two combinations, with the condition released by one: the other 201. A released condition withdrawn: the combination not asking it keeps its fingerprint; both that ask it release 201 with draft equal to release.
* **Read:** the eligibility gate facts are added after the loop, in both modes, and their fields publish through `canonical_fields`. `buildSnapshot` calls `buildSnapshots`, so one assembly. Pulled sections and derived rows are the same in both modes.
* **One remaining way needs an edit to the shared question: Minor 1.**

**Can a combination lose a question it needs?** I found no such case.
* **Ran:** chains reach the end (the check; removing the repeat fails it). A question's condition on a derived value whose input is another derived value reaches the input (fake database).
* **Read:** `engine/render.ts` and `engine/runtime/*` read conditions only on placed questions, which the loop closes over. `gateProblems` and `coverageGaps` refuse in words if a needed fact is unasked. A person's saved source choice on a dropped fact can raise a refusal with its fix (`engine/sources.ts:147`), on old data only; not run.
**A release frozen by the old code carrying another combination's deciding question?** **Ran**, old code then the fix on one database: Minor 2. Submit is not refused: "Nothing has changed" no longer applies, because the fingerprint and the changes both differ. After the new release, Submit says "Nothing has changed".
**Does the loop always end, and is it order-independent?** Yes. `used` only grows over a finite set, and the result is the least fixed point. **Ran:** shuffled database rows: fix 0 of 4,500 differ, main 249 (main's one derived pass depended on row order, so this also removes an old bug). The final pass recomputes `placements` on the final `used`.
**Are the fail tests real?** **Ran** each mutation on a scratch worktree, since removed:
| Mutation | Check result |
|---|---|
| main's `snapshot.ts` | 46/57, caught |
| Loop runs once | 55/57, caught (both repeat lines) |
| Fingerprint check off | 55/57, caught: the trigger really lands between freeze and check; without the check the release answers 201 |
| Hiding off | 55/57, caught |
| Derived expansion moved out of the loop | **57/57, not caught: Minor 3** |

## Issues
**Must fix before merge:** none.
**Minor 1, Should (pre-existing, same on main; the closest sibling of QA-262).** `engine/snapshot.ts:192` with `api/src/studio.ts:1197`. A draft that moves a question out of the only chosen section holding it leaves the draft without it, so nothing publishes that row, while the published row still places it: 409 on every press.
* Steps: place a question no form or rule reads in a section Study permit chose, and release. On Library › Fields › that field, choose a section Study permit did not choose, and save the placement. Submit, sign, Approve and release.
* **Ran:** 409 twice on the screen on the fix; 409 by API on main.
* "Review the change, submit it again" does not help. Moving it back does (**ran**). Adding the section, or releasing a combination that carries the move, should too (read).
* Why Minor, my judgement, and the tech lead may re-rank: it needs a deliberate edit, it was not introduced or worsened here, it rolls back whole, and of the 140 questions Study permit has after the check's own setup steps, none is held by section alone (other combinations not counted). Words and recovery are the fault, not data.
* Fix: a new qa row. Refuse or warn at Submit in words, or publish the moved row. Not in this PR.

**Minor 2, Should list in the PR (one-time, honest).** A combination released under the old code carrying a foreign deciding question shows two changes after this lands, with no author action. **Ran:** "removed Field" (needs the immigration expert) and "removed Question placement"; Submit 201, sign, release 201 as v2; v1 stays as frozen. Only databases that made such a release; I did not check :4400 (forbidden).

**Minor 3, Should.** `tests/check_forms_b114_condition_other_combination.ts:136-147`, for `engine/snapshot.ts:191`. Nothing in the new check guards a condition on a derived value: moving the expansion out of the loop stays 57/57. The six have 0 derived rows, and I ran only this one check on that mutation. Fix: one line with a derived row inserted by labelled SQL, as the repeat lines do.

**Minor 4, Should (pre-existing).** A double press on Approve and release answers 201 then 409, and the screen shows "Released version 1" followed by "This already exists, or someone else saved the same thing". **Ran:** one release exists. `web/src/pages/review.tsx:120`.

**Minor 5, Should (pre-existing).** The Hiding message repeats the question inside itself, because `conditionPlain` holds the whole sentence (`api/src/question-condition.ts:62`, `engine/validate.ts:184`): `shown only when ""Free-text details of criminal history" is asked only when…`. Seen on With an LMIA.

**PR state.** #1115 is a **draft**, and GitHub shows every CI job skipped at this commit, so there is no CI evidence yet. Engine changes select ALL suites (`select-suites.mjs`), and I did not run the full set.

## Dimensions (1–5; no screen code changed, so screen scores rest on the walk of the existing Review tab)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 5 | QA-262's table: row 1 and row 2 201 by the check; row 3 by the merged run |
| D2 Data integrity | 5 | Refused release leaves 0 rows; double press leaves one release |
| D3 Reuse | 5 | The shared library is unchanged; no combination gains a foreign question |
| D4 Rule integrity | 5 | Hiding intact, chains closed, property test 0 differ without a move |
| D5 Stability and recovery | 4 | Reload and double press hold; Minor 1 and Minor 4 |
| D6 Freshness and governance | 5 | Old-release removals are named for sign-off, and v1 stays |
| D7 AI trust | 5 | The condition still goes through a second person; shown as AI-proposed |
| D8 Orientation | 5 | Full path and tabs on Review |
| D9 Flow | 5 | Submit, sign, release, Open a case |
| D10 Language | 3 | The refusal in Minor 1 misleads; Minor 4; Minor 5 |
| D11 Feedback | 4 | "Released version 1", Live, version table; Minor 4 |
| D12 Visual | 5 | Team look, unchanged |
| D13 Accessibility | 5 | axe 0 at 400, 512, 1024, 1440; keyboard-only release |
| D14 Team look | 5 | Unchanged |
| D15 Speed | 5 | Review loads 750–932 ms; the new read is no slower |
| D16 Testability | 4 | 4 of 5 mutations caught; Minor 3 |
| D17 First-use | simulated only | No intended user walked it |
| D18 Provenance | 5 | Demo release and Sample labels; release shows who did what |
| D19 Capability closure | 5 | Configure, release, open a case walked on Study permit |
| D20 Pain solved | simulated only | Founder's walk |

## Scope, standards, graph
* **Concept:** `screens/B114/` holds no concept (a fix row). Judged against QA-262, the tech lead's constraints, P-303 and `STANDARDS.md`. Retrofit mapping does not apply.
* **[M] lines:** only §9 and accessibility bear on this change, both met above. I did not go through the other [M] lines one by one, because no screen, route or schema changed.
* **Graph:** ran `graph.mjs` without `--write` on a scratch worktree. Its only line naming C4.11 and C5.1 lists them as named by a test; I found no gap for them, and I did not read `GRAPH.md` beyond a search for them. The new check names C4.11 and C5.1 and runs by its usage line. No page or route is added.
* **Scaffolding (P-33):** the check and walk set up by API and labelled SQL, but the release itself is the product's own screen.

## What I could not check
A real screen reader; an intended user's walk (D17, D20); the headed browser (I used headless Chrome so as not to take over the Mac, with screenshots read); the full suite set; the demo's data; the VV-last order on the merge.

**Verdict: Approve** for commit `87385d60f2663f3c3d57fffc3bbe1fc0fcf543ac`: no open Blocker or Major. List Minors 1–5 in the PR and file Minor 1 as a qa row. The PR must leave draft for CI to run.

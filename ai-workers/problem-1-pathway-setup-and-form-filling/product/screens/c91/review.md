# Review: AI on a held new edition (C9.1), PR 1 at US$0. Forms lane, commit 459bcccaa

Reviewer: screen-reviewer, fresh context, did not build it. 3 Nov 2026. Bar: the brief `design/c91-ai-row-2026-11-02.md` (items 1–5), `acceptance/C9.1.test.ts`, the founder's AI rules (3 Nov), `WAY-OF-WORKING.md` "Every PR", `STANDARDS.md`, `EXPERIENCE.md`, Screen 02 concept BR-12 and view 7. Journey report: `journey-test-reviewer-2026-11-03.md` (this folder).

## Verdict: **Block**: 2 Majors open (listed under "To fix before Approve")

**Journey score (reviewer, the one score for this check): 7.5 / 10, not a pass** (task completed ½, plain words ½, feedback ½, sizes ½, trust ½; no criterion at 0). Details are in the journey report.

## What I ran (my own isolated copies on 4444–4449, live switch off, never :4400, no priced click)
| Check | Result |
|---|---|
| `tests/check_c91_impact_ai.ts` (scratch `P2_LEDGER_DIR`) | 24/24 pass; canary and stub-pass put back by the check (git clean after) |
| `tests/check_c91_impact_api.ts 4447` (its own fake-launcher restart) | 22/22 pass; shared ledger unchanged |
| `tests/check_c91_impact_browser.cjs 4448` | 20/20 pass; it rewrites the 6 committed screenshots, which I put back with `git checkout` |
| `acceptance/C9.1.test.ts 4449` | **7/16**: part 1 is 6/6 plus R-143; all 9 lines of part 2 fail (`held: ""`: the configured checkpoint holds no IMM 5476 11-2025) |
| C11.13 neutrality: `check_forms_c1113_acceptance.ts 4445`, `check_screen02_slice2.ts 4444` | 21/21, 54/54 pass. The extraction in `field-drafts-routes.ts` is behaviour-neutral (same lock, order and job id) |
| `graph.mjs --check` | exit 0 |

## Founder's AI rules, checked one by one
* **Contract-valid output:** met. `impactStep.shapeOk` requires the field-map shape, this printed edition, and only changed boxes (`answersInside`). The launcher's `contract_valid` is checked as well. Each has a pass and a fail test.
* **Blind checker round:** the checker job has the same part input and no draft output, so the round is blind. **But replay does not pin the two rounds to one run** (Major 1).
* **Every evidence quote found in its source:** met for this step. `formText` is narrowed to the changed boxes' captions and headings (impact.ts:165). The API check proves "not printed on this form edition" leads to Decide. The quote rule is shared C11.13 code and checks one quote per field; that is not a finding of this PR.
* **One attempt, retry only on a transient error:** met. The launcher has `MAX_ATTEMPTS` with no third round. A failed draft round skips the checker (impact.ts:157, tested `stub,live`). A paid failed comparison is not re-run (impact.ts:137–140, tested).
* **Spend ledger before any call:** met through `p2/launch.ts` (stub pass then live). The worst case is checked against what is left of the cap before launch (impact.ts:115–120).
* **Nothing accepted without the rules and a person:** met. Proposals land `waiting` on To review. The audit line exists (checked in my DB: one job, 3 proposals, one `edition impact AI` audit event).
* **Live AI off; a live click states the worst case first:** met. The button is greyed with its reason, and the server answers 409 with words when the switch is off. The click carries `expected_worst_usd`, and a mismatch is refused before launch (tested).

## To fix before Approve
**Major 1: replay can pair a draft round and a checker round from two different saved runs.** At `api/src/impact.ts:151–157` the replay context has no `replayPair` (or `replayWindow`). `StepRunner.round` therefore picks the newest usable draft and the newest usable checker separately. Every other two-round step pins the pair: `pqr-drafts.ts:127`, `draft-qd.ts:121`, `form-masters.ts:167–169` (the C4.7 B1, QA-162 M2 and C3.4 B1 breaks). A second recorded run of the same comparison would mix them. That can happen after a Mac rerun, or after a demo reset clears the `drafting_job` rows that `paidOnce` relies on and the second run's checker fails. Mixed rounds then produce "agreed" (Ready, bulk-acceptable under P-121) from two runs that never read the box together. The `saved` flag (impact.ts:88–95) also looks at the draft round only. *Fix:* replay the checker with `replayPair: pairOf(step, true, draft.runFile)`, and the matching window as in `form-masters.ts`. Mark Saved only when a paired checker exists, or say "draft round only". Add a fail test with two saved runs of one comparison (draft of run 2 and checker of run 1 must not pair).

**Major 2: the components touched (brief item 1, P-32) are never exercised with data, and the acceptance pack is 7/16.** `fieldComponentsOf` returns early at `api/src/where-used.ts:113`. This happens whenever no removed or reworded box has a mapped field (`impact.ts:53`), and an edition added through the intake has no maps. As a result, in the API check, the browser check, the pack's part 1 and my own walk (six and configured samples), every list is empty and the tab reads "Sections (0) None touched…". The Prisma part (sections and document-type names, `current` rules and checks, combination filter, `why` words) runs in no test. Only the pure `fieldComponents` and `componentsView` are proven, on synthetic rows. The brief's "Done when" requires the pack "in full … with PR 1". The stated reason (the runtime lane owns the loader) explains part 2's row-17 setup. It does not cover an untested server path for a P-32 rule. *Fix (forms lane, no loader change):* add an API check that gives the library edition mapped reworded or removed boxes, plus a section question, rule, check and document line reading those fields (SQL seeding is used by e.g. `check_c119_acceptance.ts`). It should assert non-empty lists with `why` (> 10 characters, naming the box) and the combination, with a fail case for another combination. Alternatively, the tech lead records in the PR that P-32 components ship unproven until runtime's row 17, and C9.1 stays Partial. Either way, say "7/16" in the PR body.

## Minors (fix or list in the PR)
1. Plain words [M] (EXPERIENCE §5): visible text says "(the founder's switch, P-175)" (`api/src/impact-ai.ts:71`). Other steps say "(the founder's switch)" (`runtime.ts:262`). Drop the decision number.
2. After drafting, the AI section still shows the offer ("nothing runs until you click"). Without the saved file it also shows "No saved AI run for this comparison yet" beside "Saved AI run … 3 proposals" (seen as the approver). Hide the offer and saved words once `drafted` is set (`web/src/pages/review-items.tsx:307–308`).
3. Keyboard: after "Use the saved AI run" the button disappears and focus falls to `<body>`. Move focus to `[data-drafted]` or its link (EXPERIENCE 12).
4. 400 px: the new fourth tab pushes "Combinations (1)" 26 px past the edge (`review-items.tsx:317`, the tab row does not wrap). 1024 px and 200 % zoom are clean. axe flags `scrollable-region-focusable` on the table at 400 px (the table predates this PR).
5. Two cost figures for one run. The app says "about US$0.43 · at most US$2.00" (round budgets; `rounds.ts:83,92` floor US$1 a round). `tools/c91-impact-job.ts` prints usual ~US$0.27 and worst US$1.22 (the launcher's reservation). The app's figure is the safe one and follows the shared C4.11 rule. Make the job tool also print the app's figure so PR 2's Go quotes the number the person sees.
6. `paidOnce` relies on `drafting_job.costUsd`. A round that throws after a paid call is recorded at US$0 (`impact.ts:152`, `safe` catch), so a second paid attempt stays possible. The ledger still caps spend. Record the run file's cost when one exists.
7. `fieldUseRows` (`where-used.ts:96`) copies the seven-query block of `itemCombinations` (lines 29–37) instead of being called by it. That duplicates logic in the one where-used service (STANDARDS §6).
8. To review does one `formCombinations` query per held new edition (`review-queue.ts:245`). Few rows today, but this is "no request per row" [M].
9. A live click goes straight to a paid POST, with the cost on the label but without the shared cost gate (`useCostGate`, P-179 Continue/Cancel) used by `sources.tsx`. That is acceptable under P-138 as written. State it in the PR.
10. A double Enter on "Use the saved AI run" sends a second POST that answers 409 "already running". There was one job and no duplicate data, but the second press gets a refusal instead of the first result.

## Builder's stated items, judged
* Part 2 not built: Major 2 above. The row-17 setup can wait for runtime, but the P-32 server path cannot go untested.
* `field-map-check.v1.md` on a part: acceptable. It is blind and "never invent a data path". The risk is a wasted checker round (any stray box voids it), not a wrong acceptance. Note it for PR 2.
* Job ids `studio-fieldmap-impact-…`: acceptable. No collision: `sources.ts` savedRuns uses `studio-fieldmap-<form>-live-`. `field-map-check.ts`'s draft pattern matches the files, but `isSameSavedRun` rejects them on prompt and inputs. `check_r146` filters on template.
* "At most US$2.00" vs reservation US$1.22: acceptable, because stating more than the reservation is the safe direction. See Minor 5.

## Standards [M], what changed
Server authorisation (author only, 403 tested) met · Problem Details with words met · idempotent launch met (advisory lock plus one result per comparison; second click returns the first) · AI evidence, cost estimated before launch and capped met · no `.catch(() => undefined)` after a wait met (the browser check fails loudly on its waits) · shared contracts additive met (`QueueItem.combinations?` optional; `ImpactReview` adds fields only the API produces) · a pass and a fail test per rule met, except P-32 server (Major 2) and round pairing (Major 1) · no N+1: Minor 8 · plain words: Minor 1 · axe on every state met at 1440, 1024 and 720 px (200 % zoom).

## D1–D20 (1–5)
D1 3: items 2–5 fit; item 1 unproven, pack 7/16 · D2 4: one job per comparison under a lock, one audit line · D3 4: reuses the field-map prompts and the C11.13 item code · D4 n/a · D5 4: reload keeps Drafted, 409 on repeat, stale run refused; Minor 6 · D6 4: IRCC accepted-until quoted with page and saved date · D7 3: AI marked, a person accepts; rounds can mix (Major 1) · D8 5: crumbs "To review › IMM 5476 new edition" · D9 4: one click to proposals, link to To review · D10 3: Minor 1, cost said three times · D11 3: Minors 2–3 · D12 4: team cards and pills, one tab row · D13 4: clean at 1024 px and 200 %; Minor 4 · D14 4 · D15 5: GET 0.46 s, page 0.87 s, drafted 1.3 s · D16 3: strong rule checks; the Major 1–2 gaps · D17 simulated only · D18 4: run file, quote and IRCC page traced · D19 3: the row-17 story is not on the demo · D20 simulated only.

## Retrofit mapping
New route `POST /intake/held/:id/impact/draft` → the team's AI jobs module, behind the same guarded launcher. `components` → the where-used service (SH2). Nothing new for the team to port in the schema (no migration).

## Could not check
A real screen reader; a live model run (PR 2); part 2 on the configured checkpoint (not loadable here). Concurrent agents in this clone planted and left files in `p2/runs` and `p2/jobs` during my run. These were not mine and are not findings against this PR: an untracked `p2/jobs/studio-fieldmap-impact-…-e986da59.json` is still there.

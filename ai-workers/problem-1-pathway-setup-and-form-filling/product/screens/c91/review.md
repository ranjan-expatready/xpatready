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

## Round 2 (127f57500)

Diff only: `git diff 459bcccaa..127f57500`. Same reviewer role, fresh context, 3 Nov. Web rebuilt (`npx vite build`). Isolated copies `rv2c91api` :4442 and `rv2c91b` :4443, never :4400. No priced click; live paths only through the check's own fake-launcher restart. Afterwards: copies stopped, databases dropped, screenshots put back with `git checkout`, `p2/runs`, `p2/jobs` and `p2/parts` the same as before, spend ledger md5 unchanged (d36ab979…), git clean.

### Verdict: **Block**: 2 Majors open (A and B below). Both are small. Journey score (reviewer): **8 / 10, pass** (details at the end of `journey-test-reviewer-2026-11-03.md`).

| Check | Result |
|---|---|
| `tests/check_c91_impact_api.ts 4442 xr_studio_rv2c91api` | 31/31 pass (2 min) |
| `tests/check_c91_impact_browser.cjs 4443 xr_studio_rv2c91b`, run twice | 22/22 both runs |
| My walk on :4442 (saved, drafted by keyboard, paid-closed) and two probes on saved-run files (removed after) | see A, B and the minors |
| `graph.mjs --check` | exit 0 |

### Findings it claims to fix
* **Review Major 2 / P-32: fixed.** The API check seeds maps on two reworded and two removed boxes, a rule, a check, a document line, a section, and a decoy rule on an unchanged box. Three tests, all pass: listed with label and combination; `why` names the box, its old caption and the field; the decoy is not listed. The pack is still 7/16 (part 2, row 17: tech lead question, below).
* **Break B1: fixed.** A LIVE job that is not RUNNING with `costUsd` NULL now counts (`impact.ts:153`, inside the advisory lock at :146). The test inserts the restart's FAILED/NULL row. A second click gets 409 and launches nothing. The test fails at 459bcccaa (`gt: 0` only).
* **Break M1: fixed for every call the launcher records.** `liveRunsOf` (impact-ai.ts:130) is read under the lock (impact.ts:155) and on the page (:93). The test passes. Residue: a call killed before its record is written (restart) leaves only the DB row, and a later reset removes it. That is break m6's case: the ledger still reserves it, so not a blocker.
* **Break M2: fixed in the API (impact.ts:129) and on the page** (no `[data-priced]` beside "Use the saved AI run"). Both are tested. The words are only partly fixed (Minor R2-3).
* **Break M4: fixed.** Set-aside rejects the run's waiting proposals (intake.ts:151–153), tested. A draft still running at set-aside lands nothing: `held()` inside the insert transaction (impact.ts:191) answers 409. Minor R2-4 covers the transaction.
* **Break m1: fixed.** A missing or null mode gets 400, tested. Break m4: a failed draft round is now audited. Break m7: fixture names carry the copy's tag, so copies no longer delete each other's files.
* **Review minors 1–4 and 6: fixed.** Seen in my walk: "only the founder turns it on". After drafting, the offer and saved lines are gone and focus is on `[data-drafted]` (true). The tabs wrap at 400 px with 0 px sideways scroll. axe is clean on the saved and paid-closed states. A live round that throws counts at half the worst case.
* **Review Major 1 / break M3: only half fixed (Major A).**

### To fix before Approve
**Major A: the replay pair still mixes two paid runs made by the Mac runner.** `pairOf` pairs on the job stem (impact.ts:180). The app's own runs get a unique stem (batch = job id). The one paid run that PR 2 plans goes through `tools/c91-impact-job.ts`, whose fixed batch `"c91-paid"` (line 24) gives every Mac run of this comparison the same stem `imm5476e-impact-2d69ae6ecab9-28cc6ecb`. This is the C3.4 B1 case, and round 1 asked for "the matching window as in `form-masters.ts`". *Probe:* run 1's draft (10:00, contract-invalid) and checker (10:05, usable), then run 2's draft (12:00, usable) with no checker. Replay recorded `draftRun …t120000000z-rvtwo2`, `checkRun …t100500000z-rvone1`, "read by both rounds", proposals Ready/Check/Decide. The new fail test uses two different stems (`c91fixture-*` vs `c91api-otherrun`), so it cannot see this. *Fix:* add `replayWindow` (after = the draft's run time; before = the next draft of the same stem, as in `form-masters.ts:166–169`). Add a fail test with same-stem files: an earlier run's checker plus a later run's draft must give "draft round only".

**Major B: a US$0 refusal the launcher recorded closes the paid path for good and says it was "stopped".** `liveRunsOf` counts every `-live-` record of the part whatever its cost or status (impact-ai.ts:130–138). `paidOnce(0)` then says "its cost not recorded: it was stopped" (impact-ai.ts:75). The launcher writes a record for provider refusals such as the usage limit, busy or too large (`p2/launch.ts:155–157`). `rounds.ts` treats those as US$0, and the app's own job records US$0. This breaks the rule this PR keeps in impact.ts:149–150 ("refused before any cost (US$0) may be started again") and the founder's "retry on a transient error". It is not a spend path. But the screen states a false fact about money, and a person is sent to the tech lead for a retry that is free. *Probe (fake launcher, live on):* before, `live.open: true`. With one record (`status: failed`, `refused_by_provider` "usage limit", `cost_usd: 0`), the offer closes with the words above, the click gets 409, and nothing launches. *Fix:* count a record only when the charged cost by `rounds.ts`'s own reading is above zero (`costBesideLimit` for limit refusals, 0 for `refused_input_too_large`), and never say "stopped" for a US$0 total. Add a pass test: a US$0 refusal record leaves Draft with AI open.

### Minors (fix or list)
* **R2-1.** The advisory lock is keyed on the held id (impact.ts:146), but the paid rule is keyed on the part, and RUNNING jobs are left out (:153). Two held items of one comparison (for example the same edition uploaded and downloaded by the form finder with different bytes) are not serialised. Lock on `impact-ai:${part.sha256}`. This was already so at 459bcccaa and is hard to reach.
* **R2-2.** A thrown live round is stored and audited as spent ("live, US$1.00") and shown as "a paid AI run (US$1.00)". It is a reserved share, so say "counted at its reserved worst case".
* **R2-3.** Words. In the Saved state: "Draft with AI uses it at US$0" (impact.ts:98), but the only button is "Use the saved AI run (US$0)". In the paid-closed state, the page still says "nothing runs until you click" and "No saved AI run…: Draft with AI runs it" above the greyed button and its refusal (my screenshot). `nothingUsed` (impact-ai.ts:68) still offers "Draft with AI runs again" (left over from break m2).
* **R2-4.** The set-aside claim and the proposals update are two statements outside one transaction (intake.ts:148–153).
* **R2-5.** Review minor 5 / break m5 (two cost plans: US$2.00 vs US$1.22) is neither fixed nor on the PR's not-fixed list. Add it.

### Deferred items: none blocks
* **Break M5** (an accepted proposal does not map its box): the brief §3 says to reuse "the existing review flow", which is C11.13's. This is a capability gap with no wrong data and no spend. Keep C9.1 Partial and give it to the C11.13 owner.
* **Review minors 7–10:** minor 8 is an [M] line (a query per row), but on few rows; minor 9 is acceptable under P-138.
* **Break m3, m8:** UX and hygiene only. **Break m6** is the one spend-related residue (a dead launcher with no record can be retried). The ledger reservation still caps it, and it lives in shared `rounds.ts`: track it as its own row.
* **Part 2 of `acceptance/C9.1.test.ts`** (configured checkpoint, DEMO row 17) is a question for the tech lead. Until then the pack is 7/16 and C9.1 stays Partial.

### Spend rules asked about
Paid-before is checked inside `pg_advisory_xact_lock` (impact.ts:146–156): the DB row and the run records both. A job refused before any call records US$0 and does not count in the DB query. The run-record query does count such refusals, which is Major B. Nothing is counted twice: `paidBefore` returns the DB cost or the run-record sum, never both. Impact jobs have no batch, so no spend total adds `drafting_job.costUsd`. The thrown-round estimate goes to the job only, never the ledger. No new spend path: every change in the diff closes a path (mode required, saved first, B1, M1), and the spend ledger was unchanged after all runs.

### Could not check
A real screen reader; a live model run (PR 2); the real launcher's record for a usage-limit refusal (I built it from `launch.ts:109–157`, not from a captured file); part 2 on the configured checkpoint.

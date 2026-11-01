# Review — C4.11 part 1 "Draft questions and documents" (forms lane, builder B4b)

Reviewed commit **ee66d870** (diff `a5db2602..ee66d870`), branch claude/hopeful-maxwell-4etgzs. Reviewer: fresh context, did not build it.
Run on an isolated copy (rv411, :24470, sample loaded, wp.family = "With an LMIA"), once normally and once with `STUDIO_SLOW_QD_STEP=1500` so I could see the running state and use Stop.
Spec read: CAPABILITIES row C4.11; W1-questions-and-documents concept-draft §4; W1-ai-drafting plan §1–2 and concept BR-1/4/10/12.
Journey test: `journey-test-reviewer-c411-2026-11-01.md`, **7.5/10 (below the pass mark)**.

Note: while I was reviewing, the builder pushed **8458dd2d** on top (8 lines in api/src/draft-qd.ts). I read that commit only for M3, which it fixes. I have not reviewed it as a whole.

## Verdict: Block

## What works (checked myself, not taken from the builder's notes)
* The plan shows before anything runs: all seven steps, how each one runs, "Cost: US$0" and "AI now (not approved yet)" greyed out with the reason. Plan 114 ms; a rules-only run 0.7 s.
* A live run is refused with 409. A run whose plan checksum is out of date gets 409. The approver (user-B) gets 403 on Draft. Two clicks at the same moment: the second gets 409 "Already running" (advisory lock plus a check in one transaction, draft-qd.ts:76-83).
* One AiBatch with exactly seven DraftingJobs. Steps 2 and 5 end NOT_YET with honest words. Step 6 goes through C4.7 with `opts.jobId` (pqr-drafts.ts:185-196); running it again adds no pick twice (32, then 0). Saved AI answers with none saved: step 6 ends FAILED, the run ends PARTIAL, US$0. Step 7 runs all four checks, and the draft is not changed.
* axe finds nothing on the plan or on the result. Keyboard only: Tab reaches the button, Enter opens it, focus goes into the dialog, Tab reaches Draft and Enter starts it. No sideways scroll at 400 px or at 512 px (200 % of 1024). No console errors.
* tsc is clean according to the builder; graph `--check` gives G1 0 G2 0 G3 1 (the same as on main).

## Blockers
None.

## Majors
* **M1: Stop cannot be reached on any product screen while the run is going (BR-1 "stopped alone"; P-33: the capability works only through the API).** The run executes inside the POST request (draft-qd.ts:68-145), so `QdDialog` gets `runId` only after the run has ended (qd-draft.tsx:38-44). During the run the dialog shows only a busy Draft button: no run card and no Stop. Screenshot 02 of the journey: 0 run cards, 0 Stop buttons. The top-bar chip is inert behind the modal. If the person closes the dialog, the chip's link (runs.ts:234) goes to `/c/:id/questionnaires`, which renders no run card for this operation (questionnaires.tsx only shows the people run's card), so it is a dead end. The suite tests Stop only through `POST /runs/:id/stop` (check_forms_c411_draft_qd.ts:100-117). *Scenario:* a part-2 AI step takes 40 s; the author wants to stop it and finds no Stop anywhere. *Fix:* start the run in the background as people-ai.ts:163 does (return `runId` straight away, `void this.execute(...)`), show `<RunCard runId onEnded>` in the dialog at once, and show the active run's card on the Questionnaires tab so the chip lands on it. Add a browser test that clicks Stop.
* **M2: Stop has no server authorisation and no audit line for this operation.** At runs.ts:106 `aiBatch.update({cancelRequested:true})` runs with no `need(actor,"author")`. Every other branch has the check (finder.ts:834, people-ai.ts:195, ai.ts:423). *Scenario (reproduced):* the case officer `user-O` (duties `case`, runtime area) sent `POST /runs/<author's run>/stop` and got **201**, and the author's run ended "stopped", with steps 3–7 CANCELLED. Nothing in audit_event says who stopped it. The run's own audit line still reads "drafted questions and documents … 0 to review" (draft-qd.ts:143). *Fix:* `need(actor,"author")` plus an audit line "stopped" in a `DraftQd.stop`. Word the run's audit line differently when the run was stopped or failed. Add a fail test for the wrong role.
* **M3: at ee66d870, a run left RUNNING by a server restart blocked that combination forever.** The one-run guard (draft-qd.ts:78-79) finds the orphaned RUNNING batch, nothing ever ends it, and every later Draft gets 409 "Already running". *Fixed in 8458dd2d* (`onModuleInit` ends such runs as FAILED, the same pattern as people-ai). I checked that delta and it is sound. It needs a test (start a slow run, restart, Draft again succeeds).

## Minors (Should)
* **m1 Step 4 writes nothing: acceptable, but not recorded.** I judge it right for now. factSources already applies the P-130 rule source live until a person overrides it. A proposal per fact equal to the value already in force would put about 245 items in the queue with nothing to decide. comes_from proposals only start to matter when part 2 (AI documents, step 2) can change which document supplies a fact. However, plan §1 row 5 says "proposal per fact", so this is a deviation from the spec. Record it in `challenge.md` and in `qa/built/C4.11.md` ("step 4 proposes nothing: rules already in force"), so it is not a silent change.
* **m2 Two of the four step-7 rules have no fail test.** No test fails if `askedInOrder` (engine/draft-qd.ts:329) or the `coverageGaps` line (:324) is removed. Only `pqr_subset` and `document_on_checklist` have fail tests. Add a planted out-of-order deciding fact and a field with no source.
* **m3 Rule attribution depends on message text.** engine/draft-qd.ts:326 maps `factSourceProblems` to rules by regex on the English message. If a wording changes in sources.ts, the finding moves to "one_source" without anyone noticing. Return a rule code from sources.ts instead.
* **m4 Step 3 message is a wall of text.** It lists all 18 document names in one sentence (journey 03-done-1024). Show the count, with the names under "details" (`detail.no_facts` is already there).
* **m5 A NOT_YET step shows "rules · US$0" on the card.** runs.ts:221/227 gives `uses: "rules"` to a step that did not run (screenshot 03). Show no how/cost pill for NOT_YET.
* **m6 Run note grammar.** "32 items for To review; All four rules pass: …" has a capital letter after the semicolon and repeats the whole rules sentence (draft-qd.ts:140). The replay note also leaves out that step 6 failed.
* **m7 Orphaned doc comment.** validate.ts:122-124: `validate`'s "Grounding audit finding 3" doc block now sits directly above the new `askedInOrder` doc block, and `reachability` has lost it. Move `askedInOrder` above that comment.

## D1–D20 (part 1 scope)
D1 Requirement fit 3/5: seven steps, plan first, US$0 and live refused all match §4; Stop from the screen (BR-1) is missing (M1) · D2 Data integrity 4: one batch, seven jobs, no duplicates under a race, picks deduplicated · D3 Reuse 5: reuses C4.7's producer, factSources and reachability · D4 Rule integrity 4: four checks run; two have no fail test (m2) · D5 Stability and recovery 2: run stuck after a restart at ee66d870 (M3, fixed in 8458dd2d); Stop cannot be reached (M1) · D6 Governance 3: no audit line for Stop; a stopped run is audited as "drafted" (M2) · D7 AI trust 4: "saved AI answers" pill, US$0, AI now greyed with the reason · D8 Orientation 4: dialog title, run label and combination named · D9 Flow 3: "Open To review" after the run; the chip leads to a dead end (M1) · D10 Language 3: m4, m5, m6 · D11 Feedback and state 2: no progress while the run is going (M1) · D12 Visual 4: team components; m4 wall of text · D13 Accessibility 5: axe clean, keyboard path, 400 and 512 px · D14 Team look 4: shared Dialog and RunCard · D15 Speed 5: plan 114 ms, run 0.7 s · D16 Testability 3: Stop tested only through the API; m2 · D17 simulated only · D18 Provenance 4: each step says where it reads from · D19 Closure 3: steps 2 and 5 come in part 2 (stated), row stays partial · D20 simulated only.

## To fix before Approve (re-review the new head)
M1, M2 (with tests), and a test for M3's fix in 8458dd2d. Minors m1–m7 can follow in part 2. m1 should at least be recorded in this PR.

## Not checked
A real screen reader. Saved AI answers with real saved files (the suite plants them; I ran only the case with none saved). 1440 px (the builder's screenshots cover it). An intended user's unaided walk (D17/D20 stay with the founder).

---

# Round 2 (c94db558)

Re-reviewed the C4.11 fixes only (`git diff ee66d870 c94db558`, merge of main ignored). Isolated copy rv411 :24470, `STUDIO_SLOW_QD_STEP=400`. Journey test: `journey-test-reviewer-c411-r2-2026-11-01.md`, **9/10 (pass)**. The C4.11 API suite on my copy: 33/33.

## Verdict: Approve

## Round-1 findings
* **M1 fixed.** The run executes in the background (draft-qd.ts `execute`); POST answers in 94 ms with `{runId, status:"running"}`. The dialog shows the run card with Stop 204 ms after Draft. Clicking Stop on screen ends the run ("Stopped", later steps cancelled, no rules verdict). The chip's href is now `/ai/:id`, and AiBatchPage renders the run card (with Stop) for this operation. A second tab's 409 shows the running card (break m5). The browser suite clicks Stop.
* **M2 fixed.** `DraftQd.stop` calls `need(actor,"author")`: user-O and user-B both get 403 (checked live; the suite has the user-B fail). One "stopped" audit line names the author and the run id. Leftover: see m9.
* **M3 fixed and tested.** `onModuleInit` ends orphaned runs as FAILED; a RUNNING run older than 10 minutes is ended FAILED inside the locked transaction on the next Draft. Suite: 1-minute-old run gives 409 with its runId, 1-hour-old run gives 201. I could not walk a live restart (isolated.sh recreates the database).
* Break m2 (plan readable by case officer): now `readerOf`, 403 live. Break m3 (Stop after the last step): note says so. Break m4 (replay failure said "done"): status `done_with_problems`, note "Not done: Pre-qualification picks: …", tested.
* m1 recorded in `qa/built/C4.11.md`. m2 asked-first pass/fail tests added (pure snapshot; `coverageGaps` still has no fail test, acceptable for part 2). m4, m6, m7 fixed.
* **m3 (regex rule attribution) and m5 ("rules · US$0" on a NOT_YET step) not changed: neither blocks.** m5 is still visible on the card; fix in part 2.

## New Minors (do not block; part 2)
* **m8 No next step on the run's own page after it ends.** runs.ts:96-97 returns `null` for this operation, and the comment says the card "is shown on its own Questionnaires tab", but href is now `/ai/:id`. A person who left the dialog and followed the chip ends on /ai/:id with "Done" and no link to To review or to the combination (breadcrumb is "AI work" only). Fix: next = "Open To review" (`/review/proposals?group=combination:<id>`) when the run proposed items; correct the comment.
* **m9 A stopped or failed run is still audited as "drafted … 0 findings".** draft-qd.ts:218 writes the same "proposed" line whatever `out.status` is; checked live on a stopped run (it follows the "stopped" line). Round-1 M2 asked for different wording. "0 findings" reads as "the checks passed" when step 7 never ran. Fix: word it by `out.status` (stopped / failed / done with problems).

## D1–D20 changes from round 1
D1 4 (Stop from the screen now present) · D5 4 (background run, stale and restart recovery) · D6 4 (author check, stopped line; m9) · D9 4 (live card everywhere; m8) · D10 4 (m5 open) · D11 5 (card at 204 ms) · D12 5 · D16 4 (Stop clicked in the browser; restart tested by plant). The rest are unchanged.

## Not checked
A live server restart. A real screen reader. Replay with real saved files. The merged-in main files.

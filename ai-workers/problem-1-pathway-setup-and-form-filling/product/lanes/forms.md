# Lane: forms — PDF and online forms (P-61–P-63)

## From the Lead

2026-10-28 (Lead, Mac): **S4 merged (PR #65, main 06a8fc30); :4400 restarted on it.** Stage BUILD, owner Builder: (1) **QA-53**: one shared guard on every Studio configuration read (nobody 401, case people 403; case routes untouched), pass and fail tests; (2) then the form library on the shared lifecycle components (written row action, greyed reason as text, edition "kept by" line, P-116 amended). Desktop only; save often; hand back by message.

Command: `/next forms` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_item: QA-61..QA-64 (qa after-merge on S4), then the run-suites per-copy prefix
stage: BUILD
owner: Builder
next_action: QA-61..64 handed back (cbfdab22); now the run-suites per-copy prefix (Lead OK); sync main after PR #69 merges
blocked_by: none
updated: 2026-10-28

## Handover (28 Oct, late; resume from this section alone)
* **Where it stands:** stage BUILD, owner Builder. Branch `forms/2026-10-27-s4-form-library`, last pushed `cbfdab22`, synced with main `3858216e`. Lead PR #69 holds `ef71eae8` (QA-53, the form library on the shared lifecycle components, the PR #67 resend fix). Built since then and pushed: **QA-64** (a library form's retire or restore takes effect at approval, the approval re-checks, the confirm says "When it is approved"), **QA-61** (the filing rule reads each sentence), **QA-62** (AI work names a finder run by its place in plain words), **QA-63** (a waiting finder card leads to the combination's Sources page). Checks on `cbfdab22`: finder 129, runs 90, library browser 58, run browser 22, canada 66, qa's check_qa_s4_filing 9/9. The suites these touch were started one by one on fx copies (structure, structure r3, screen02 fix and slice2, w1 s1s2 fix, structure browser, ai orchestration, qa53); their results are not in yet.
* **Next (do exactly this):**
  1. Read the touched-suite results (rerun any that did not finish: `FILES="<suite>" zsh <scratchpad>/s02.sh` pattern, or each suite's usage line under an fx name on ports 4471–4480). Put back the by-products.
  2. Hand back to the Lead by message: QA-61..64 on `cbfdab22` (or later).
  3. Then the Lead-approved run-suites per-copy prefix: `product/tools/run-suites.sh` gives each copy its own prefix for isolated names and ports, from `lane.sh whoami` or `COPY_PREFIX`; CI unchanged; a check that two copies cannot pick the same names; its own commit, named for the Lead.
  4. Sync main after PR #69 merges.
* **Open for the Lead or founder:** whether guides must also be attached to their combinations; 5 of 7 sample forms are "Not set yet" until a person sets them (C11.18); the shared Button's primary hover contrast (4.4 at 12 px).
* **How to run the checks (Mac, this copy):**
  * S4 checks: `forms_s4`, `forms_s4r`, `forms_s4b`, `forms_s4l` on ports 4455–4458; QA-53: `forms_qa53` on 4459.
  * Other suites alone under `fx_*` names on 4471–4480 (pass the database name too: some suites read it from their 2nd argument). `run-suites.sh` uses names other lanes share: check `ps` for another run first.
  * Rebuild `web/dist` (`vite build web`) before the browser checks.
  * After any run, put back only the by-products (other screens' screenshots, `evidence/*.json`, `p2/ledger`, `used-launch-tickets`, `p2/runs/stub-pass`, the canary digest, S4's 390 px shots). Drop this copy's `var/isolated-*` and their databases when nothing is connected.
  * Stop any run if free space falls below 3 GB (it was 3.2 GB at the last check).
  * The Bash hook misfires on some compound commands: put them in a scratchpad script. No paid AI (US$0). Lane pushes run no CI (P-85).

## Log (last 10 lines)
- 2026-10-28 · QA-61..64 · BUILD · touched suites alone on fx copies, all pass on cbfdab22: structure 83, structure r3 41, screen02 fix 61, screen02 slice2 56, w1 s1s2 fix 30, structure browser 135, qa53 13; S4: finder 129, runs 90, library browser 58, run browser 22, canada 66. Handed back by message. Next: run-suites per-copy prefix. US$0.
- 2026-10-28 · QA-61..64 · BUILD · QA-61 the filing rule reads each sentence (canada 66, qa's filing check 9/9); QA-62 AI work names a finder run by its place in plain words; QA-63 a waiting finder card leads to the Sources page; QA-64 a library form's retire or restore takes effect at approval (one applyFormLifecycle for approval and an older approved change at release; the approval re-checks; the confirm says When it is approved). finder 129, runs 90, library browser 58, run browser 22. US$0.
- 2026-10-28 · PR #67 review · BUILD → CHECK (owner Lead) · resend fix pushed (8939a822); touched suites alone on fx copies: finder 124, runs 88, structure r3 41, structure 83, screen02 fix 61 (its QA-53 officer step is in 1a975003: the edit was not in f56442a2 as reported). US$0.
- 2026-10-28 · PR #67 review · BUILD · synced main 3858216e; a returned library form change (delete, retire, restore) is sent again by the form's own rule: Lifecycle.resubmit has a library_form branch that reads formUses leaving the change itself out of the open-change check, checks the action again and marks it WAITING (before: the form number was read as a combination id, 409). Pass and fail tests in the finder check, incl. a returned retire sent again after its last use was removed: finder 124/124. US$0.
- 2026-10-28 · W1 lifecycle (forms) · BUILD · the form library on the shared lifecycle components (P-116 amended): one written row action from the guard (Delete, Retire, Restore, Withdraw for my own waiting change), greyed with the guard's reason as visible text under the row (aria-describedby), the confirm in the right panel (ImpactPanel) with Undo, Retire and Delete gone from the ⋯ menu; each earlier edition says what keeps it (Kept by Release N of … and K open cases; never deleted). library browser 57/57, runs 88/88. US$0.
- 2026-10-28 · QA-53 · CHECK → BUILD · applied Lead message 28 Oct (S4 merged, PR #65 06a8fc30): synced main; QA-53 one shared guard (ConfigReadGuard, APP_GUARD): every GET under /api is a configuration read (nobody and an unknown name 401, case people 403) unless marked: CaseRead (runtime controllers, releases, activity), OpenRead (session, three file links). New check_forms_qa53.ts reads every GET route from the code (pass and fail per route; the exception list is reviewed): 13/13. US$0.
- 2026-10-28 · S4 · FIX → CHECK (owner Lead) · synced main dccd87e3 (PR #66): S4's form retire and delete on the shared guard and word set (Delete everywhere; Remove only off a combination; one re-check, before the click and at approval, with the library form's rule). Full run-suites on 80504e33: 46/46 pass (studio browser skipped). S4: finder 118, runs 86, canada 63, library browser 53, run browser 20. Outside this lane: structure.tsx tab count contrast (one token) and tests/check_screen02_fix.ts (earlier). US$0.
- 2026-10-28 · S4 · FIX · S4 checks on the PR #66 merge: finder 118, runs 86, canada 63, library browser 53, run browser 20. The run browser's scan found two contrast failures from #66 on the Structure page: the selected Pathway type tab's count (text-primary-foreground/80, 4.37) fixed in structure.tsx (one token); a small primary button's hover (4.4, shared Button) under the left-over pointer, which the check now moves off; reported to the Lead. US$0.
- 2026-10-28 · S4 · FIX · synced main dccd87e3 (PR #66, shared lifecycle pattern): 7 conflicts resolved keeping main's one guard and word set (Delete for every delete; Remove only for a form line off a combination); the library form's retire and delete run on it (recheckForm in the one re-check, before the click and at approval). Typecheck clean; S4 checks next. US$0.
- 2026-10-28 · S4 · FIX · carried Shoulds (Lead 28 Oct) fixed with tests: Where used on the retire/delete approval page; an unread copy is never a "Record the IRCC page" step (screens' check_screen02_fix moved that flow to its readable copy: 61/61); a form with no file is "No file yet". S4: finder 118, runs 86, canada 63, library browser 53, run browser 20; screen02 slice1 59, slice2 56, slice2 browser 65. US$0.

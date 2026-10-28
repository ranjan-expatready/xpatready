# Lane: forms — PDF and online forms (P-61–P-63)

## From the Lead

2026-10-28 (Lead, Mac, sixth chat, Claude Code): PR #70 (records) merged; the run-suites per-copy prefix (5c2c4e82) is on main through the Lead PR, so do not carry it on this branch. Stage FIX, owner Builder: sync main; then R69-1 (a RETURNED form change keeps Withdraw/its state: `form-library.ts` lifecyclePending reads WAITING and APPROVED only), R69-2 (actor in the Forms list query key), R69-3 (prove Retire greys when both delete and retire are refused), takesEffect only for RETIRE/RESTORE (`library-forms.tsx`); a pass and a fail test each. They do not block anything but go with QA-61..64 (fa653bec, not on main yet) in one Lead PR. Also note for S5: runtime will read the edition's acceptedChannels on the Forms tab (lead-check L4); keep that field's meaning stable. Local run-suites on the exact commit, `tools/graph.mjs`, hand back. US$0.

Command: `/next forms` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_item: R69-1..3 + takesEffect (Devin Review on #69), with QA-61..64, for one Lead PR
stage: FIX
owner: Builder
next_action: run the full run-suites once on 9e48029e when free space is 3 GB or more, then hand back (CHECK, owner Lead) for the one Lead PR
blocked_by: free space 2.8 GB (under the 3 GB stop line) while other lanes run; full suites stopped after 3 suites
updated: 2026-10-28

## Handover (28 Oct, late; resume from this section alone)
* **Where it stands (safe stop, 28 Oct, late):** stage FIX. Branch `claude/forms-r69-fix-4af07a`, pushed, clean tree, synced with main `38722933` (the run-suites prefix is main's; none carried here). Holds QA-61..64 (fa653bec) and the R69 fixes (`5250bed4`, `9e48029e`):
  * R69-1: the Forms list reads a RETURNED library form change too (it is still open): the row shows "Retire returned" (danger pill, TIP.returned) and its author keeps Withdraw; anyone else sees the action greyed.
  * R69-2: the Forms list's query key carries the person, so switching person without a reload reads their own row actions.
  * R69-3: `rowActionOf` moved to `api/src/form-row-action.ts` (no decorators, so a check loads it); both-refused proved greyed (unit and every library row).
  * takesEffect: passed only for Retire and Restore (Withdraw has no Takes effect line; Delete keeps its own words).
  * Checks on 9e48029e: finder 137/137, library browser 61/61; types clean; graph --check passes (hard 0; soft G3 `GET /attachments/:id/file` in main.ts, not this lane).
  * Full run-suites: started, stopped at 2.1 GB free (others' runs); done before the stop: ai drafting 48/48, ai launch paths 39/39. This copy's isolated copies and the lane's 47 old `xr_studio_forms_*` test databases (587 MB, none connected) dropped; by-products put back.
* **Next:** when free space is 3 GB or more, `bash product/tools/run-suites.sh` once on the exact commit, then CHECK, owner Lead, and the Paste to Lead block.
* **Open for the Lead or founder:** whether guides must also be attached to their combinations; 5 of 7 sample forms are "Not set yet" until a person sets them (C11.18); the shared Button's primary hover contrast (4.4 at 12 px).
* **How to run the checks (Mac, this copy):**
  * S4 checks: `forms_s4`, `forms_s4r`, `forms_s4b`, `forms_s4l` on ports 4455–4458; QA-53: `forms_qa53` on 4459.
  * Other suites alone under `fx_*` names on 4471–4480 (pass the database name too: some suites read it from their 2nd argument). `run-suites.sh` uses names other lanes share: check `ps` for another run first.
  * Rebuild `web/dist` (`vite build web`) before the browser checks.
  * After any run, put back only the by-products (other screens' screenshots, `evidence/*.json`, `p2/ledger`, `used-launch-tickets`, `p2/runs/stub-pass`, the canary digest, S4's 390 px shots). Drop this copy's `var/isolated-*` and their databases when nothing is connected.
  * Stop any run if free space falls below 3 GB (2.8 GB at the last check, 28 Oct late).
  * The Bash hook misfires on some compound commands: put them in a scratchpad script. No paid AI (US$0). Lane pushes run no CI (P-85).

## Log (last 10 lines)
- 2026-10-28 · R69 · FIX · applied Lead note 28 Oct (sixth chat): synced main 38722933; R69-1 returned form change keeps its state and Withdraw, R69-2 person in the list key, R69-3 both-refused greyed (proved), takesEffect for Retire/Restore only; pass and fail tests: finder 137, library browser 61. Full run-suites stopped at 2.1 GB free (rule: 3 GB); old forms test databases dropped. US$0.
- 2026-10-28 · safe stop · BUILD → CHECK (owner Lead) · QA-61..64 (cbfdab22) wait for the Lead check; the run-suites prefix (5c2c4e82) goes to a Lead PR; everything pushed, Handover current. US$0.
- 2026-10-28 · QA-61..64 · BUILD · touched suites alone on fx copies, all pass on cbfdab22: structure 83, structure r3 41, screen02 fix 61, screen02 slice2 56, w1 s1s2 fix 30, structure browser 135, qa53 13; S4: finder 129, runs 90, library browser 58, run browser 22, canada 66. Handed back by message. Next: run-suites per-copy prefix. US$0.
- 2026-10-28 · QA-61..64 · BUILD · QA-61 the filing rule reads each sentence (canada 66, qa's filing check 9/9); QA-62 AI work names a finder run by its place in plain words; QA-63 a waiting finder card leads to the Sources page; QA-64 a library form's retire or restore takes effect at approval (one applyFormLifecycle for approval and an older approved change at release; the approval re-checks; the confirm says When it is approved). finder 129, runs 90, library browser 58, run browser 22. US$0.
- 2026-10-28 · PR #67 review · BUILD → CHECK (owner Lead) · resend fix pushed (8939a822); touched suites alone on fx copies: finder 124, runs 88, structure r3 41, structure 83, screen02 fix 61 (its QA-53 officer step is in 1a975003: the edit was not in f56442a2 as reported). US$0.
- 2026-10-28 · PR #67 review · BUILD · synced main 3858216e; a returned library form change (delete, retire, restore) is sent again by the form's own rule: Lifecycle.resubmit has a library_form branch that reads formUses leaving the change itself out of the open-change check, checks the action again and marks it WAITING (before: the form number was read as a combination id, 409). Pass and fail tests in the finder check, incl. a returned retire sent again after its last use was removed: finder 124/124. US$0.
- 2026-10-28 · W1 lifecycle (forms) · BUILD · the form library on the shared lifecycle components (P-116 amended): one written row action from the guard (Delete, Retire, Restore, Withdraw for my own waiting change), greyed with the guard's reason as visible text under the row (aria-describedby), the confirm in the right panel (ImpactPanel) with Undo, Retire and Delete gone from the ⋯ menu; each earlier edition says what keeps it (Kept by Release N of … and K open cases; never deleted). library browser 57/57, runs 88/88. US$0.
- 2026-10-28 · QA-53 · CHECK → BUILD · applied Lead message 28 Oct (S4 merged, PR #65 06a8fc30): synced main; QA-53 one shared guard (ConfigReadGuard, APP_GUARD): every GET under /api is a configuration read (nobody and an unknown name 401, case people 403) unless marked: CaseRead (runtime controllers, releases, activity), OpenRead (session, three file links). New check_forms_qa53.ts reads every GET route from the code (pass and fail per route; the exception list is reviewed): 13/13. US$0.
- 2026-10-28 · S4 · FIX → CHECK (owner Lead) · synced main dccd87e3 (PR #66): S4's form retire and delete on the shared guard and word set (Delete everywhere; Remove only off a combination; one re-check, before the click and at approval, with the library form's rule). Full run-suites on 80504e33: 46/46 pass (studio browser skipped). S4: finder 118, runs 86, canada 63, library browser 53, run browser 20. Outside this lane: structure.tsx tab count contrast (one token) and tests/check_screen02_fix.ts (earlier). US$0.
- 2026-10-28 · S4 · FIX · S4 checks on the PR #66 merge: finder 118, runs 86, canada 63, library browser 53, run browser 20. The run browser's scan found two contrast failures from #66 on the Structure page: the selected Pathway type tab's count (text-primary-foreground/80, 4.37) fixed in structure.tsx (one token); a small primary button's hover (4.4, shared Button) under the left-over pointer, which the check now moves off; reported to the Lead. US$0.

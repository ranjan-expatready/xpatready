# Lane: forms — PDF and online forms (P-61–P-63)

## From the Lead

2026-10-28 (Lead, Mac): **S4 merged (PR #65, main 06a8fc30); :4400 restarted on it.** Stage BUILD, owner Builder: (1) **QA-53**: one shared guard on every Studio configuration read (nobody 401, case people 403; case routes untouched), pass and fail tests; (2) then the form library on the shared lifecycle components (written row action, greyed reason as text, edition "kept by" line, P-116 amended). Desktop only; save often; hand back by message. **Also (28 Oct, qa after-merge on S4: ready, 4 Minors):** QA-61 filing rule reads words not the sentence ("Do not … paper"), QA-62 AI work names runs by their place in plain states, QA-63 a waiting run card gives the next step, QA-64 a library retire takes effect at approval (P-116 amended), plus the returned form-change resubmit (PR #67 review).

Command: `/next forms` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_item: QA-53 (one guard on every Studio configuration read), then the form library on the shared lifecycle components (P-116 amended)
stage: CHECK
owner: Lead
next_action: Lead checks and merges QA-53, the form library on the shared lifecycle components and the PR #67 resend fix; next in this lane: a library retire takes effect at approval (P-116 amended)
blocked_by: none
updated: 2026-10-28

## Handover (28 Oct, Lead check FIX round; resume from this section alone)
* **Where it stands:** QA-53 and the form library on the shared lifecycle components are built and handed to the Lead (stage CHECK, owner Lead). Branch `forms/2026-10-27-s4-form-library`, synced with main `06a8fc30` (S4 merged as PR #65), pushed, clean tree.
* **Next:** the Lead checks and merges. Then, in this lane: a library form's retire and restore take effect at approval, not at the next release (P-116 amended; not built yet: the release-time retire tests change with it).
* **Done this round (all with tests, all pushed):**
  * Drift fixes: main merged; Delete vs Remove in one word map, also used in History and Activity.
  * Load sample from Sample fixtures (`samples/form-library-sample.json`), checked by `api/src/filing.ts`.
  * Replay keyed by `combination_key`; stub passes never replayed, by file name and by the record's `caller`.
  * Lead check: paper or mail is never a PDF upload, and "fill it on a computer" is not a filing line. Load sample now sets 2 of 7 data forms (IMM 5475, IMM 5476).
  * Carried Shoulds: Where used on the approval page; an unread copy is never "Record the IRCC page"; "No file yet".
  * The one edit outside this lane: `tests/check_screen02_fix.ts` now walks the record-the-page flow on its readable copy.
* **Last evidence (code `80504e33`):** full `run-suites.sh` 46/46 pass (only `check_studio_browser` skipped: it resets :4400). S4 checks: finder 118, runs 86, canada 63, library browser 53, run browser 20. graph `--check`: G3 1 (the older gap).
* **Open for the Lead or founder:** whether guides must also be attached to their combinations (review Should 2); 5 of 7 sample forms stay "Not set yet" until a person sets them (C11.18).
* **How to run the checks (Mac, this copy):**
  * S4 checks run under this lane's names `forms_s4`, `forms_s4r`, `forms_s4b`, `forms_s4l` on ports 4455–4458.
  * Other suites run alone under `fx_*` names on ports 4471–4480, because `run-suites.sh` uses names other lanes share (a `screens_s1s2` clash happened once).
  * Rebuild `web/dist` (`vite build web`) before the browser checks.
  * After any run, put back only the by-products: other screens' screenshots, `evidence/*.json`, `p2/ledger`, `used-launch-tickets`, `p2/runs/stub-pass`, the canary digest, and S4's 390 px shots (wave 1 is desktop only).
  * Drop this copy's `var/isolated-*` folders and their databases when nothing is connected to them.
  * The Bash hook misfires on some compound commands: put them in a scratchpad script.
  * No paid AI (US$0). Lane pushes run no CI (P-85): local `run-suites.sh` is the evidence.

## Log (last 10 lines)
- 2026-10-28 · PR #67 review · BUILD → CHECK (owner Lead) · resend fix pushed (8939a822); touched suites alone on fx copies: finder 124, runs 88, structure r3 41, structure 83, screen02 fix 61 (its QA-53 officer step is in 1a975003: the edit was not in f56442a2 as reported). US$0.
- 2026-10-28 · PR #67 review · BUILD · synced main 3858216e; a returned library form change (delete, retire, restore) is sent again by the form's own rule: Lifecycle.resubmit has a library_form branch that reads formUses leaving the change itself out of the open-change check, checks the action again and marks it WAITING (before: the form number was read as a combination id, 409). Pass and fail tests in the finder check, incl. a returned retire sent again after its last use was removed: finder 124/124. US$0.
- 2026-10-28 · W1 lifecycle (forms) · BUILD · the form library on the shared lifecycle components (P-116 amended): one written row action from the guard (Delete, Retire, Restore, Withdraw for my own waiting change), greyed with the guard's reason as visible text under the row (aria-describedby), the confirm in the right panel (ImpactPanel) with Undo, Retire and Delete gone from the ⋯ menu; each earlier edition says what keeps it (Kept by Release N of … and K open cases; never deleted). library browser 57/57, runs 88/88. US$0.
- 2026-10-28 · QA-53 · CHECK → BUILD · applied Lead message 28 Oct (S4 merged, PR #65 06a8fc30): synced main; QA-53 one shared guard (ConfigReadGuard, APP_GUARD): every GET under /api is a configuration read (nobody and an unknown name 401, case people 403) unless marked: CaseRead (runtime controllers, releases, activity), OpenRead (session, three file links). New check_forms_qa53.ts reads every GET route from the code (pass and fail per route; the exception list is reviewed): 13/13. US$0.
- 2026-10-28 · S4 · FIX → CHECK (owner Lead) · synced main dccd87e3 (PR #66): S4's form retire and delete on the shared guard and word set (Delete everywhere; Remove only off a combination; one re-check, before the click and at approval, with the library form's rule). Full run-suites on 80504e33: 46/46 pass (studio browser skipped). S4: finder 118, runs 86, canada 63, library browser 53, run browser 20. Outside this lane: structure.tsx tab count contrast (one token) and tests/check_screen02_fix.ts (earlier). US$0.
- 2026-10-28 · S4 · FIX · S4 checks on the PR #66 merge: finder 118, runs 86, canada 63, library browser 53, run browser 20. The run browser's scan found two contrast failures from #66 on the Structure page: the selected Pathway type tab's count (text-primary-foreground/80, 4.37) fixed in structure.tsx (one token); a small primary button's hover (4.4, shared Button) under the left-over pointer, which the check now moves off; reported to the Lead. US$0.
- 2026-10-28 · S4 · FIX · synced main dccd87e3 (PR #66, shared lifecycle pattern): 7 conflicts resolved keeping main's one guard and word set (Delete for every delete; Remove only for a form line off a combination); the library form's retire and delete run on it (recheckForm in the one re-check, before the click and at approval). Typecheck clean; S4 checks next. US$0.
- 2026-10-28 · S4 · FIX · carried Shoulds (Lead 28 Oct) fixed with tests: Where used on the retire/delete approval page; an unread copy is never a "Record the IRCC page" step (screens' check_screen02_fix moved that flow to its readable copy: 61/61); a form with no file is "No file yet". S4: finder 118, runs 86, canada 63, library browser 53, run browser 20; screen02 slice1 59, slice2 56, slice2 browser 65. US$0.
- 2026-10-28 · S4 · FIX · baseline full suites on 98b5102: 39 pass, 2 fail, both test races fixed (two approved lines in one instant; the picker counted before its rows rendered): runs 82/82, forms_demo 26/26 alone. Waiting for PR #66 to merge before the final sync. US$0.
- 2026-10-28 · S4 · CHECK → FIX · applied Lead check 28 Oct (lead-check.md): a paper or mail line is never a PDF upload (Not set yet, reason given); filling the form in on a computer says nothing about how it is filed (one rule: 5707, 5409, 1295 and the saved AI line for 5257 alike); only an upload line is a PDF upload; replay and Load sample read the record's own mode. Load sample now sets 2 of 7 data forms (5475, 5476). S4: finder 118, runs 82, canada 63, library browser 51, run browser 20. US$0.

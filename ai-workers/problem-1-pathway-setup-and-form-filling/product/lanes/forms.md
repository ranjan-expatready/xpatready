# Lane: forms — PDF and online forms (P-61–P-63)

## From the Lead

2026-10-28 (Lead, Mac): **S4 merged (PR #65, main 06a8fc30); :4400 restarted on it.** Stage BUILD, owner Builder: (1) **QA-53**: one shared guard on every Studio configuration read (nobody 401, case people 403; case routes untouched), pass and fail tests; (2) then the form library on the shared lifecycle components (written row action, greyed reason as text, edition "kept by" line, P-116 amended). Desktop only; save often; hand back by message. **Also (28 Oct, qa after-merge on S4: ready, 4 Minors):** QA-61 filing rule reads words not the sentence ("Do not … paper"), QA-62 AI work names runs by their place in plain states, QA-63 a waiting run card gives the next step, QA-64 a library retire takes effect at approval (P-116 amended), plus the returned form-change resubmit (PR #67 review).

Command: `/next forms` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_item: S4-form-library (W1-06 Form library + form finder, with the W1-07 run component; P-123, P-124)
stage: CHECK
owner: Lead
next_action: Lead re-merges S4 into Lead PR #65 and merges on green; then QA-53
blocked_by: none
updated: 2026-10-28

## Handover (28 Oct, Lead check FIX round; resume from this section alone)
* **Where it stands:** S4 is at CHECK, owner Lead: handed back for the re-merge into Lead PR #65. Branch `forms/2026-10-27-s4-form-library`, code `80504e33`, synced with main `dccd87e3` (PR #66), clean tree, pushed.
* **Next:** the Lead re-merges S4 into PR #65 and merges on green; then QA-53, and the form library moves onto the shared lifecycle components (P-116 amended; a library retire takes effect at approval). Nothing waits on this lane.
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
- 2026-10-28 · S4 · FIX → CHECK (owner Lead) · synced main dccd87e3 (PR #66): S4's form retire and delete on the shared guard and word set (Delete everywhere; Remove only off a combination; one re-check, before the click and at approval, with the library form's rule). Full run-suites on 80504e33: 46/46 pass (studio browser skipped). S4: finder 118, runs 86, canada 63, library browser 53, run browser 20. Outside this lane: structure.tsx tab count contrast (one token) and tests/check_screen02_fix.ts (earlier). US$0.
- 2026-10-28 · S4 · FIX · S4 checks on the PR #66 merge: finder 118, runs 86, canada 63, library browser 53, run browser 20. The run browser's scan found two contrast failures from #66 on the Structure page: the selected Pathway type tab's count (text-primary-foreground/80, 4.37) fixed in structure.tsx (one token); a small primary button's hover (4.4, shared Button) under the left-over pointer, which the check now moves off; reported to the Lead. US$0.
- 2026-10-28 · S4 · FIX · synced main dccd87e3 (PR #66, shared lifecycle pattern): 7 conflicts resolved keeping main's one guard and word set (Delete for every delete; Remove only for a form line off a combination); the library form's retire and delete run on it (recheckForm in the one re-check, before the click and at approval). Typecheck clean; S4 checks next. US$0.
- 2026-10-28 · S4 · FIX · carried Shoulds (Lead 28 Oct) fixed with tests: Where used on the retire/delete approval page; an unread copy is never a "Record the IRCC page" step (screens' check_screen02_fix moved that flow to its readable copy: 61/61); a form with no file is "No file yet". S4: finder 118, runs 86, canada 63, library browser 53, run browser 20; screen02 slice1 59, slice2 56, slice2 browser 65. US$0.
- 2026-10-28 · S4 · FIX · baseline full suites on 98b5102: 39 pass, 2 fail, both test races fixed (two approved lines in one instant; the picker counted before its rows rendered): runs 82/82, forms_demo 26/26 alone. Waiting for PR #66 to merge before the final sync. US$0.
- 2026-10-28 · S4 · CHECK → FIX · applied Lead check 28 Oct (lead-check.md): a paper or mail line is never a PDF upload (Not set yet, reason given); filling the form in on a computer says nothing about how it is filed (one rule: 5707, 5409, 1295 and the saved AI line for 5257 alike); only an upload line is a PDF upload; replay and Load sample read the record's own mode. Load sample now sets 2 of 7 data forms (5475, 5476). S4: finder 118, runs 82, canada 63, library browser 51, run browser 20. US$0.
- 2026-10-28 · S4 · FIX → CHECK (owner Lead) · CHECK findings fixed with tests (4399c3b): fixture lines must say their value (filing rule, line on the page; 5 of 7 data forms set, SCH1 and 5409 Not set yet), stub passes never replayed (R5-1), one word in History and Activity (R5-2), fixtures checked against the manifest (R5-3, R5-4), 1024 tag wrap and origin words. Full suites on 4399c3b: 39 pass in the run + 2 rerun alone (forms_demo 26/26; w1_s1s2_fix 30/30, which collided with another copy on screens_s1s2) = 41/41; S4 finder 118, runs 83, canada 62, library browser 51, run browser 20; graph G3 1 (older). Synced main 83e658b (docs and CI only). No CI on lane pushes (P-85). US$0.
- 2026-10-28 · S4 · CHECK → FIX · breaker R5 (break-report.md): 0 Blocker, 2 Major (a stub pass replayed when the place's name holds "live"; History and Activity words), 6 Minor. All fixed with tests together with the review's Major (fixture lines must say their value: the finder's filing rule, line on the page; SCH1 and 5409 left Not set yet) and Shoulds; canada 62/62; other S4 checks running. US$0.
- 2026-10-28 · S4 · CHECK · full suites on 26b1c40 (code = a660f7b): 41/41 pass (studio browser skipped: resets :4400). Fresh reviewer (review.md): Ship after fixes, journey 8.5/10, no Must, 1 Major (IMM 5476's fixture quotes a paper line; IMM 5257 SCH1's quotes a download label), D18 at 3; Shoulds: 1024 tag overlap, guide and visa-office origin words. Breaker running. US$0.
- 2026-10-28 · S4 · FIX → CHECK · first full suites on the drift fix: 40 pass, 1 fail (screen 01 intake check uploaded guide 5487, which Load sample now loads; moved to guide 5553: 135/135, a660f7b); suites rerunning on a660f7b; reviewer (ports 4475–4477) and breaker (4478–4480) launched. US$0.

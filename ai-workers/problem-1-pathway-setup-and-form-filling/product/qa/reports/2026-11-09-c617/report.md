# qa capability C6.17: a multi-stage case (row B139, #1262), main df52c9fc6, 9 Nov 2026

**Verdict (fresh Opus reader that ran nothing, P-303; `verdict.md`): gate A PASS · C6.17 Partial (was Not built). Not Works: no GitHub run id (P-339), and QA-375 (Ambiguity · Major, "adds documents") waits on the tech lead's ruling.** US$0, live AI off. Cloud qa lane; #1262 merged at 21:26 UTC; the round ran on `origin/main` at that point, df52c9fc6.

## Runs
* **Pack on its scoring data, fresh isolated copy** (`pack-C6.17-df52c9fc6.txt`). The pack's own run line, `tsx acceptance/C6.17.test.ts 4471 xr_studio_qa_c617p`, on a copy started for it and stopped at once; the pack loads the configured checkpoint itself (P-322). Result: **"42/42 passed", EXIT CODE: 0** (21:29–21:31 UTC).
* **Local gate B stand-in** (`local-gateb-C6.17-df52c9fc6.txt`): `GATE_B_DATA=checkpoint gate-b.mjs` reported "C6.17.test.ts on the checkpoint: exit 0, 42/42 passed (206 s)", then "Gate B: passed", **EXIT CODE: 0**.
* **GitHub's runners: none.** No `nightly.yml` run has run the C6.17 pack on main df52c9fc6. Cloud lanes get 403 when they dispatch, so this lane did not try (the C7.8 round's 403 is on record). **Question 1.** Without that run id, the row cannot be Works (P-339).

## Gate A by screens (`walk-screens.md`, `walk/`, `scripts/`)
Fresh copy `qa_c617w` (:4472, `--ttl 150`, stopped by qa). The checkpoint was loaded through **Demo › Load the configured checkpoint** (109.3 s). Every case and answer was made on screen, with no case set up by script. The case officer walked at 1440 px, and Client B where the client acts.
* **A. Open at a later stage** (BR-3, F13 (c)):
  * Open a case on the work permit asks for "Earlier stages · Sample route". A UCI "AB-12" is refused on its field: "UCI: Use digits only (0 to 9)…".
  * With UCI 12345678 and valid until 3 Feb 2027 the case opens. The strip reads "Study permit (outside Canada) · Done before we started" and "Apply for the work permit by 3 Feb 2027 · Sample".
  * The done-before stage's record holds both key details, "entered by the case officer".
* **B. Start next stage and C7.8's stage-scoping** (#1262's fix):
  * On stage 1 the officer adds IMM 0008 DEP (blank) and IMM 5710, a form of the **next** stage's release, by the add-a-form panel.
  * The dialog shows the release, who comes along, the counts, 5 forms, 2 documents with the checklist caveat (D1), the deadline (Sample), the missing filing record and "This cannot be undone".
  * Without a reason it is refused on the field. With one, the stage starts: "Ended — next stage started".
  * Stage 2's Prepare application lists only IMM 5476 and IMM 5710, the latter as the release's own form. "IMM 0008 DEP" and "Added by the case officer" appear 0 times on the page.
  * The ended stage's panel is read only.
  * **Underneath:** removing or adding on the ended stage's filing is 409 `stage_ended`; the database refuses a removed mark (`case_stage_ended`); the blank PDF is still served (200, 448,821 bytes, `%PDF-1.7`); and stage 2's add list offers IMM 0008 DEP fresh.
* **C. What carries, then the next capability's first step:**
  * Client B answers a person part and an application part on stage 1. The officer starts the next stage with UCI 87654321 and valid until 31 May 2027. The dialog reads "4 answers about the people used (not copied) · 18 questions about this application asked again"; the strip then reads "Apply for the work permit by 31 May 2027 · Sample".
  * **C6.2's first step:** on the work permit's questionnaire, Client B sees the person answers read where they are (name, single, F, and the UCI from the start). The application's question is asked again (empty underneath), and Client B answers and saves it.
  * **C7.1's first step:** the officer's "Generate a copy" of IMM 5710 on stage 2 gives "5 form fields written · read back and checked". Underneath, the copy's release is the work stage's combination.
* **Replay** at 400 and 1024 px, twice each: no sideways scroll, and Cancel leaves stage 1 current every time. axe is clean at 1024 px.
* **At 400 px, axe flags `color-contrast` on the Start confirm button intermittently:** 2 of 2 replay passes, then 1 of 2 with reduced motion (the reader's ask), then 0 in 7 targeted re-checks. The colours pass (white on rgb(8, 98, 197), about 5.9:1), so there is no row; the cause is not found. My first reading, "mid-fade", was wrong: the reader doubted it and the reduced-motion run disproved it. The same runs measured QA-373: Cancel starts at x = -24.9 px.
* **Not walked:** a headed pass; the later-stage case taken on to its own questionnaire (path C covers stage 2); a screenshot of the IMM 5710 addition on stage 1 (the script and the data show it); B05's error on the field itself, which is below the fold (the summary shows); 200% zoom; keyboard only (the builder's `check_c617_stages_browser.ts` covers keyboard and focus, 33/33 in the PR); the shared demo :4400 (none runs in this container); two tabs; a race by screens (pack C6.17-11 covers it).

## Bugs (0 Blocker · 0 Critical · 1 Major · 5 Minor, all new)
* **QA-375 · Ambiguity · Major** (proposed by the reader; qa agrees; held Major until the tech lead rules): does naming the release's documents meet the row's "adds documents"? On the checkpoint no document line is made on either stage (D1: the per-person checklist is not worked out for `sp.outside` or `wp.lmia_inside`). The concept pack's items 5 (an upload) and 9 ("On file from …") are not in the pack. No check: it is a question.
* **QA-370 · UX · Minor:** the Start next stage dialog's Deadline line keeps "Can't set: Study permit valid until is missing" while the officer has typed that date in the same dialog, right above "This cannot be undone". The started stage then uses the date. Check `tests/qa/check_qa370_start_dialog_deadline.ts` (1/2 today).
* **QA-371 · UX · Minor:** the current stage's panel reads "UCI (also the client's answer) · Not recorded" while the client's UCI answer is set (12345678; 87654321 on the other case). The reader adds: the last stage's own "Work permit valid until" can never be recorded. Check `tests/qa/check_qa371_current_stage_uci_words.ts` (1/2 today).
* **QA-372 · UX · Minor** (found by the reader): the dialog and the toast say "5 forms", but the new stage lists 2. The other 3 may apply later (`case-stages.ts` preview counts `applies !== false`). Check `tests/qa/check_qa372_start_forms_count.ts` (1/2 today).
* **QA-373 · UX · Minor** (found by the reader): at 400 px the start dialog's Cancel is cut off at the left edge (x = -24.9 px). It still works. Check `tests/qa/check_qa373_start_dialog_400px.ts` (1/2 today).
* **QA-374 · Gap · Minor** (review m7, untracked until now): Open a case at a later stage shows no deadline, although BR-8 names the Open-a-case summary. Check `tests/qa/check_qa374_open_case_deadline.ts` (1/2 today).
* **QA-310** (open, already names C6.17): seen again. Open a case says "release 1", while the case header and the start dialog say "Release 3".
* Noted, not rows:
  * the stage_ended 409's title "Changed since you read it" (the PR's m3; not reachable by screens);
  * QA-356 also shows on stage 1's added form;
  * the ended stage's panel does not list its added forms (concept m2 names filings, key details and documents only).

## F13
* (a) The route is data (`samples/routes.json`); #1262 adds no route or combination key to `api/src`, `engine` or `web/src` (`f13-code-check.txt`), and no tree model is changed.
* (b) The deadline is computed on read, labelled Sample, with no filing item: "Apply for the work permit by 31 May 2027 · Sample", and `deadline.sample: true` underneath.
* (c) The key details are on the stage record. Only the UCI is also the person's answer (`stage_record`, user-O); "valid until" is not an answer.

## Coverage, graph, suites
Not run for this row. No c8, no `graph.mjs`, no full suite rerun, no `decision-impact.sh`: this capability round covered the pack, gate A and the probes underneath.

## Questions for the Lead
1. **Please dispatch `nightly.yml` on main with capabilities=C6.17 and data=checkpoint** (cloud lanes get 403). The run id goes in the row; with it, C6.17 moves to Works if it is green (P-339).
2. **QA-375, your ruling:** is naming the release's documents in the dialog enough for "adds documents"? Or must the per-person checklist be turned on for the two route combinations first (#1262's D1 data row, P-230 (7))? Until you rule, the row stays Partial even with a green run.
3. QA-370 to QA-374: owning lane screens (B139) by guess. All are wording, display or layout; no data is wrong.

## What the reader says moves C6.17 to Works (`verdict.md` §4)
1. A green `nightly.yml` run (capabilities=C6.17, data=checkpoint) on main's head, with app code unchanged since df52c9fc6. Its run id and job id go in the row.
2. Until B77 lets the protected set run checkpoint packs, the row carries the checkpoint-row hold.
3. The tech lead rules on QA-375 (D1).
4. QA-370 to QA-374 are logged with checks (done). None of them blocks Works.

## Suggestions
* QA-370's check could become a pack or browser step: "the dialog's deadline follows the key detail typed" (*Later*, *Capability*).
* Show an ended stage's added forms on its read-only panel, so the history a stage keeps is visible (*Later*, *Capability*).

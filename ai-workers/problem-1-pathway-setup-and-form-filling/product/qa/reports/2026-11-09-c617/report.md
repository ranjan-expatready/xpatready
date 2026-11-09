# qa capability C6.17: a multi-stage case (row B139, #1262), main df52c9fc6, 9 Nov 2026

**Verdict (fresh Opus reader that ran nothing, P-303; `verdict.md`): VERDICT_LINE** US$0, live AI off. Cloud qa lane; #1262 merged at 21:26 UTC; the round ran on `origin/main` at that point, df52c9fc6.

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
* **Replay** at 400 and 1024 px, twice each: no sideways scroll, and Cancel leaves stage 1 current every time. axe is clean, apart from a 400 px contrast flag that did not reproduce on four re-checks (read as mid-fade; the builder's suite uses reduced motion).
* **Not walked:** a headed pass; 200% zoom; keyboard only (the builder's `check_c617_stages_browser.ts` covers keyboard and focus, 33/33 in the PR); the shared demo :4400 (none runs in this container); two tabs; a race by screens (pack C6.17-11 covers it).

## Bugs (0 Blocker · 0 Critical · 0 Major · 2 Minor, both new)
* **QA-370 · UX · Minor:** the Start next stage dialog's Deadline line keeps "Can't set: Study permit valid until is missing" while the officer has typed that date in the same dialog, right above "This cannot be undone". The started stage then uses the date. Check `tests/qa/check_qa370_start_dialog_deadline.ts` (1/2 today).
* **QA-371 · UX · Minor:** the current stage's panel reads "UCI (also the client's answer) · Not recorded" while the client's UCI answer is set (12345678; 87654321 on the other case). Check `tests/qa/check_qa371_current_stage_uci_words.ts` (1/2 today).
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
2. QA-370 and QA-371: owning lane screens (B139) by guess. Both are wording or display only; no data is wrong.

## Suggestions
* QA-370's check could become a pack or browser step: "the dialog's deadline follows the key detail typed" (*Later*, *Capability*).
* Show an ended stage's added forms on its read-only panel, so the history a stage keeps is visible (*Later*, *Capability*).

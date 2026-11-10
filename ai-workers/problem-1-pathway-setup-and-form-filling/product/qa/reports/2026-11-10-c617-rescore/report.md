# qa re-score of C6.17 after #1477 (QA-375's fix, P-444), main 66e74115e, 10 Nov 2026

**Verdict (fresh Opus reader that ran nothing, P-303; `verdict.md`): gate A PASS · QA-375 closed · C6.17 Works (was Partial).** P-339 is met by nightly run 42759023740, job 129640099845, on main's head; no open Blocker, Critical or Major names C6.17. US$0, live AI off. Cloud qa lane, asked by the tech lead (Lead 7, series 2).

## Runs
* **GitHub's runners (P-339):** nightly run **42759023740**, dispatched by the tech lead (workflow_dispatch, main, head **66e74115e**, data=checkpoint). Job **129640099845** "packs (C6.17)" logged "C6.17.test.ts on the checkpoint: exit 0, **47/47 passed** (156 s: copy 4, Load the configured checkpoint 75, run 77)", then "Gate B: passed". Conclusion: success. The excerpt is in `github-run-42759023740.txt`.
  * Main's head is still 66e74115e.
  * The records branch merged main (30c6a44b1), and its app code is identical to it: only `tests/qa/` differs.
* **qa's local run:** the pack's own run line on a fresh isolated copy gave **47/47, exit 0** (`pack-C6.17-66e74115e.txt`). The pack was 42/42 on df52c9fc6; the 5 new steps are pack items 5 and 9.

## Gate A by screens (`walk-screens.md`, `walk/R01`–`R10`)
The checkpoint was loaded through Demo › Load (116.2 s). Every case, upload and start was made on screen, at 1440 px, as the case officer. Replays at 400 and 1024 px, twice each.
* **QA-375's fix:**
  * The study permit's Documents panel has its own lines ("0 of 3 received").
  * The passport copy is uploaded through the line's menu (C6.4) and reads Received.
  * Start next stage says "2 documents on the checklist", and so does the toast.
  * The work stage has its own fresh lines ("0 of 2 received"), and its passport line says "On file from Study permit, uploaded 10 Nov 2026: check it for this application."
  * The ended stage's panel lists "Its own documents · sample-passport-qa.pdf".
* **Underneath** (`underneath-documents.txt`): the lines are per stage, each stage's document is on its own line, and `on_file` is on the work stage's passport line. An upload or Not applicable on the ended stage's line is **409 `stage_ended`**, and nothing is added.
* **The next capability's first step, C6.4 on the new stage:** the officer uploads this application's passport copy on the work stage's line. It reads Received, and the panel reads "1 of 2 received".
* **The first round's walk** on df52c9fc6 (open at a later stage, Start next stage, C7.8's stage-scoping, C6.2 and C7.1 on stage 2) is not repeated. #1477 touches only the documents: `case-checklist.ts` (+3), `form-setup.ts`, `300-reviewed-release-documents.ts`, `samples/fee-table.json`, the pack and the browser suite.
* **400 and 1024 px:** axe (WCAG 2.2 A/AA) is clean in every state, including the work stage's Documents panel, with no sideways scroll. The 9 Nov contrast flag did not appear.

## Bugs
* **Closed: QA-375** (Ambiguity · Major), moved word for word to `history/qa-bugs-closed-2026-11-10.md` with its closing note.
* **New: QA-382 · UX · Minor:** "On file from Study permit … check it" stays after the new stage's line has its own file (#1477's review m2, unlogged until now). Check `tests/qa/check_qa382_on_file_after_own_upload.ts` (1/2 today).
* **Still open, each re-checked on this main (1/2, exit 1):** QA-370, QA-371, QA-372, QA-373, QA-374 (all Minor). Also QA-310 (Minor).
* **Totals open on C6.17:** 0 Blocker · 0 Critical · 0 Major · 7 Minor.

## From the reader, not logged as rows
* **A possible Minor, from reading the code only:** document files are matched by person and document type, not by stage (`docsOf` in `case-checklist.ts`; the step that replaces an older file on upload, `case-checklist.ts:264`, `case-documents.ts:299`). If two stages of a route shared a document type, the new stage could show the earlier stage's file as its own, and a new upload could mark the ended stage's file as no longer current. On the checkpoint the two stages' passport document types differ (passport_information_page_copy, passport_or_travel_document_information_page_photocopy), so this cannot be reproduced here, and it is not logged until a reproduction exists. For the forms lane to look at with P-444's follow-up.
* **Record gaps the reader named:**
  * The page-error and 5xx claim now has its logs: `walk-log-r2.txt` and `walk-log-r3.txt`. Part R2's log ends in a crash at its last steps, a locator using stage 1's line label; part R3 redid those steps.
  * There is no `walk/R06`: R2 stopped before it, and R10 shows the same panel.
  * The excerpt of the Not applicable 409 in `underneath-documents.txt` was cut to 400 characters by qa's command. The code and the words match the upload's 409.

## Not run
* c8 coverage, `graph.mjs`, the full suites, a headed pass, and the shared demo (none runs in this container).
* The first round's 1440 px walk of the parts #1477 did not touch.

## Questions for the Lead
1. QA-382 and QA-370 to QA-374: owning lane forms (QA-382, P-444) and screens (the others), by guess.

## Suggestions
* A pack step for QA-382: once the line has its own file, it no longer says "On file" (*Later*, *Capability*).

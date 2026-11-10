# qa re-score of C6.17 after #1477 (QA-375's fix, P-444), main 66e74115e, 10 Nov 2026

**Verdict (fresh Opus reader that ran nothing, P-303; `verdict.md`): VERDICT_LINE** US$0, live AI off. Cloud qa lane, asked by the tech lead (Lead 7, series 2).

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

## Not run
* c8 coverage, `graph.mjs`, the full suites, a headed pass, and the shared demo (none runs in this container).
* The first round's 1440 px walk of the parts #1477 did not touch.

## Questions for the Lead
1. QA-382 and QA-370 to QA-374: owning lane forms (QA-382, P-444) and screens (the others), by guess.

## Suggestions
* A pack step for QA-382: once the line has its own file, it no longer says "On file" (*Later*, *Capability*).

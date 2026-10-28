# /qa after-merge on main 06a8fc30 (PR #65: S4 Form library and form finder), 28 Oct

This is the independent qa lane. The run used my own copies (:4472, :4473 and :4474; databases `xr_studio_qa_*`) and was desktop only (1440 and 1024 px). The form finder ran in **Rules and Replay only**. A live plan was read but never launched, and canada.ca came from recorded copies. AI cost: US$0. Screenshots are in `reports/2026-10-28-after-merge-s4/`.

## Verdict
**Ready.** No Blocker, Critical or Major is new. The S4 library works as P-123 and P-116 describe:
* one list;
* "What IRCC accepts" says the value and who said it, and nothing is invented;
* a person can set it, and a second person approves;
* uploads keep duplicates out and hold changed copies;
* Delete of an unused form, and Retire / Restore with Where used on the approver's page;
* a finder that never leaves canada.ca and never borrows another combination's answers.

There are four new Minors. One is a Conflict with the amended P-116: a library retire waits for the release instead of applying at approval. The QA-57 contrast is fixed.

## What was tested
* **Headed walk** (browser pane, 1440 px, configuration author):
  * the Forms page;
  * AI work with three finder runs (this found QA-62);
  * a waiting run card (this found QA-63).
* **`check_qa_am_s4_1028.cjs`**: **55/61 on both runs**, the same 6 fails, each a finding.
  * **Library list:** 16 rows = the library; Type chips count; Guides filter; search "5257" finds IMM 5257 and its schedule; the no-match state has Clear filters; the Used by filter works.
  * **Drawer:** Definition with the canada.ca page, What IRCC accepts with IRCC's words, Where used, History. Focus returns to the form number on close.
  * **IRCC accepts column:** IMM 5476 "PDF upload · Sample · canada.ca words"; IMM 5409 "Not set yet"; guides "Not filed".
  * **C11.18 refusals:**
    * no line and no reason: 400;
    * a guide: 409;
    * the approver: 403;
    * the proposer approving it: 403.
  * **C11.18 pass:** set from the drawer, approved by the second person, and the row shows "set by a person · Sample".
  * **Upload:**
    * the same official file again adds nothing;
    * an empty file is refused (400, plain words);
    * a non-PDF adds nothing;
    * a changed copy of IMM 5562 is held for a person.
  * **Delete of an unused form** (seeded as the builders' check does: no product route makes one, because every way in approves the file). The dialog says "Nothing uses it" and asks why; the change waits; the approval page says "Delete library form"; once approved, the form leaves at once.
  * **Retire of IMM 5257:**
    * the dialog shows where the form is used, and so does the second person's page (the Lead's carried Should);
    * the row says "Retire waiting";
    * once applied, attaching the form is refused and the Retired chip lists it;
    * Restore brings it back.
  * **Retire of IMM 1295** (a release files it) is refused with the combination named (409).
  * **Approver:** upload and delete 403; Upload is not shown.
  * **axe:** clean on the list (1440 and 1024), drawer, retire dialog, approval page, run card and the read-only view.
  * **1024 px:** Status and ⋯ stay on screen, with no sideways scroll.
* **Form finder (API: no page starts it until S5 slice 3):**
  * **Refused pages:** off-host and http pages get 400 with plain words.
  * **Live plan:** it states the worst case (US$5.58) and what is left (US$58) before anything starts.
  * **Rules:** US$0; it lists 9 printed numbers and attaches nothing.
  * **Replay on Visitor visa:** US$0. It attaches the 7 forms both saved rounds agree on, each with IRCC's quoted line. It downloads IMM 5645 and IRM 0002 from canada.ca (recorded copies), marked as downloaded. The saved line "Download and fill out the form on a computer" does **not** set IMM 5257 to PDF upload (Lead check).
  * **Replay on Super visa:** it waits for a person and never uses Visitor visa's answers.
  * **Launch keys:** a stale plan gets 409; the same key returns the same run; another combination's key gets 409; the approver gets 403.
  * **Stop:** Stop on a finished run gets 409, "already ended".
  * **Run card:** 6 steps, US$0, "saved AI answers, no new call".
* **`check_qa_s4_filing.ts`** (the filing rule on IRCC-style lines): **6/9**. Every case from the Lead check passes; the 3 QA-61 lines fail.
* **Earlier checks on the new main:**
  * `check_qa_am_r3_1028.cjs`: **64/69**. QA-57 is fixed and nothing regressed; the fails are QA-48 and QA-55, 56, 58 and 59.
  * `check_qa_am_fix_1027.cjs`: **13/14** (QA-53).
  * `check_qa_am_1027.cjs` was not rerun: S4 changed no Program structure code apart from the contrast fix.

## Bugs (open after this run: 0 Blocker · 0 Critical · 2 Major · 13 Minor)
**New:**
* **QA-64 (Conflict, Minor, forms):** a library retire is applied at the **next release**, and the dialog says so. The amended P-116 says a library retire takes effect **at approval**. Either the build or the decision's line changes.
* **QA-63 (UX, Minor, runtime or forms):** the waiting run's "Find again" links back to its own card. No page chooses the application page yet.
* **QA-62 (UX, Minor, forms):** AI work shows a database ID with a "|" as the Scope, and codes as states ("NEEDS_PERSON", "RULES"). The replay message says "AI could not pick the page" when no AI ran, and has a double full stop.
* **QA-61 (Bug, Minor, forms):** the filing rule reads single words, not the sentence. "Do not upload this form" becomes PDF upload, and "don't need to upload … if you apply online" becomes PDF upload · Online.

**Closed:** QA-57.

**Still open:** QA-53 (S4 did not add the read guard: `/library/forms/list` answers 200 to nobody and to case people), QA-60 (Major), QA-38 (Major), QA-55, 56, 58, 59, 48, 39, 40, 47.

## Suites and coverage
* **CI on the Lead PR #65:** `run-suites.sh --demo` passed **47 of 47**, on a tree identical to main 06a8fc30. Devin Review on that PR shows "fail", but it is an outside reviewer, not CI.
* **Mac under coverage:** COVERAGE_LINE

## Graph (P-86)
* **G1–G6:** G1 0 · G2 0 · G3 1 · G4 0 · G5 0 · G6 0. G3 is `GET /attachments/:id/file`, the same route as before.
* **Decision impact:** every product decision has a capability row; P-116 → C11.9 and C11.11; P-123 → C3.12, C11.15 and C11.18.

## Journey score: Forms library (author and second person, 1440 and 1024 px)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | list, set accepts, upload, delete, retire, restore |
| Next step obvious | ½ | QA-63 (Find again loops); the finder has no button yet |
| Plain words | ½ | QA-62 on AI work |
| Feedback and state | 1 | Retire waiting on the row, Where used before every action |
| Correct data | ½ | QA-61 (filing rule), QA-64 (retire timing) |
| Error recovery | 1 | plain 400/403/409 everywhere tested |
| Accessibility and sizes | 1 | axe clean on 7 states, 1024 px, focus returns |
| Speed | ½ | not timed against §9 |
| Visual quality | 1 | `s4-library-1440.png`, `s4-approval-where-used.png` |
| Trust and sources | 1 | IRCC's words, "Sample", who said it, US$0 shown |
| **Score** | **8/10, pass** | |

D17 and D20 stay with the founder.

## Could not test
* Stop on a run that is still going: Replay and Rules finish in under a second, and Stop needs a pause hook or a live run.
* The finder from a page: it has no button until S5 slice 3.
* A real screen reader.
* Corporate forms in depth.

## Questions for the Lead
1. **Load sample:** your brief expected "5 of 7 forms set; IMM 5257 SCH1 and IMM 5409 Not set yet". Main sets **2 of 7** (IMM 5475, 5476); IMM 1295, 5257, 5257 SCH1, 5409 and 5707 say Not set yet. This matches the forms lane log after the paper fix ("5 of 7 … stay Not set yet") and `filing.ts`, where "fill out the form on a computer" is not a filing line. Which count is intended?
2. **QA-64:** should the form retire move to approval, or should P-116 amended's line change?

## Suggestions
* *Needed for the proof · Capability:* give "Find again" a place to choose the application page (QA-63) when S5 slice 3 wires the finder.
* *Later · Scaffolding:* the Type chips' accessible names read "All16", "Forms8" with no space. They read fine on screen, but a space inside the name would help screen readers.

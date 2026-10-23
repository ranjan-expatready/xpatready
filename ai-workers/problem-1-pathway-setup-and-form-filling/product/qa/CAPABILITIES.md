# Capabilities — what the product must do, and what independent testing found

Rows: the Lead (every product decision becomes a row or a backlog item the same day, P-74, `tools/decision-impact.sh`). Status, tested-on and evidence: the qa lane (skill `qa`). Seeded by the Lead from the 23 Oct audit (`history/AUDIT-2026-10-23.md`). Status: **Works** · **Partial** · **Broken** · **Not built** · **Not tested** (built, but no independent human-style test yet). Only the qa lane changes Status, after a run, with the commit it tested. M = milestone (M2 setup, M3 runtime, T = thin slice P-67).

| # | Step | Capability (persona: what they can do) | M | Status | Tested on | Evidence / note |
|---|---|---|---|---|---|---|
| C1.1 | 1 Setup | Author sees every combination by workspace, filters Needs work · Live · All, sorts by status | M2 | Works | 141194dc 23 Oct | Walked (pane) and journeys J1, J8; Screen 01 browser suite 101/101; warm first view 809 ms, filter 113 ms; 1024 and 400 px no sideways scroll |
| C1.2 | 1 Setup | Author creates Program › Category › Sub-category in one path builder; duplicates refused with a field message | M2 | Partial | 141194dc 23 Oct | Path builder, duplicate recognition (case, spaces, hyphens), double click and wrong role all hold (J1, J2, J4); 121+ characters fails silently (QA-7), symbol-only names accepted (QA-6), 'Open the existing combination' opens the list (QA-11) |
| C1.3 | 1 Setup | Author links combinations ("Supported by", "Follows") carrying named facts and documents | M2 | Not built | 141194dc 23 Oct | 'Linked to' stores a text label only (seen on the path builder) |
| C1.4 | 1 Setup | Combination page shows path, status and the one next step | M2 | Works | 141194dc 23 Oct | Path with clickable levels, status, one next step ('Add sources'); reload keeps the page only through the QA-4 proxy in a lane copy |
| C1.5 | 1 Setup | Author copies a line from another combination, and adds or removes one line across many (SA-1B-61, Screen 03) | M2 | Not built | 141194dc 23 Oct | Not in the app (BACKLOG, Lead note) |
| C1.6 | 1 Setup | Programs row and combination page show each form's channel (PDF upload · Online with its portal · Signed PDF upload) and the filing method (PDF only · Online only · Mixed); the author sets the channel per form line (P-61, P-62) | M2 | Not built | — | Back end on main (F1); Screen 01 fix pass |
| C1.7 | 1 Setup | Author picks the combination's portal (IRCC Portal · APR Portal · Representative PR Portal · LMIA Online) and each line defaults to Online where IRCC files it online (expert confirms per combination) (P-61, P-62 §3) | M2 | Not built | — | Back end on main (F1); Screen 01 fix pass |
| C2.1 | 2 Sources | Author uploads an IRCC PDF; code, edition, published date and checksum read without AI | M2 | Works | 141194dc 23 Oct | J5: IMM 5257 (09-2023) read from the file and attached in 0.8 s; Screen 01 suites |
| C2.2 | 2 Sources | A file not on the approved list is held, with a plain reason, before library, attachment or AI (P-57) | M2 | Works | 141194dc 23 Oct | J5: unapproved file held 'for source verification' with the reason, not added, attached or sent to AI; listed in `/intake/held` |
| C2.3 | 2 Sources | A person approves or rejects a held file in the product | M2 | Not built | — | Approval is a manifest row today |
| C2.4 | 2 Sources | Same file again → "already in the library"; same code, new edition → held for impact review | M2 | Partial | 141194dc 23 Oct | J5: same file → 'Already in the library'; older edition → 'Older edition: not used'. An approved newer edition (impact review) could not be produced without a manifest change: covered by the Screen 01 browser suite only |
| C2.5 | 2 Sources | Author adds a portal (online) form from a saved blank page or the template; values refused; second person approves (P-66) | M2 | Not built | — | forms lane F1 slice 1 |
| C2.6 | 2 Sources | Checklists are read into document requirement proposals | M2 | Not built | — | Stored as sources only |
| C2.7 | 2 Sources | Author adds an online form to a combination from a saved blank portal page or the template; it shows "awaiting a second person" and becomes an online version when approved (P-61, P-66) | M2 | Not built | — | Back end on main (F1); Screen 01 fix pass (add), Screen 02 (review) |
| C2.8 | 2 Sources | A second person approves or returns a portal capture, reading the portal twin's review document (P-66) | M2 | Not built | — | Screen 02 |
| C2.9 | 2 Sources | Content team captures portal screens with the extension's capture mode, guided screen by screen, structure only (P-66) | M2 | Not built | — | Forms lane F2 |
| C2.10 | 2 Sources | For each form the author sees which source drafting reads — the PDF version first by default, the online screens for what differs — can change it per form, and every shared field shows which source it came from (P-62 §1) | M2 | Not built | — | Screen 01 sources tab (choice), Screen 02 (per field) |
| C2.11 | 2 Sources | An online version carries a re-check date; when it passes, the author sees "re-check due" and re-captures or confirms it; a changed portal screen is handled like a new edition (P-61) | M2 | Not built | — | Validator rule on main (F1); Screens 02 and 04 |
| C3.1 | 3 Library | AI maps form fields to shared fields: reuse / new / ambiguous / conflict, beside the source | M2 | Partial | 141194dc 23 Oct | Scripted only (replays, no person walk): Studio suite A-pass; in lane copies every AI step fails (QA-8) |
| C3.2 | 3 Library | Reviewer accepts, edits or rejects each proposal; bulk accept only for clean reuse; Undo | M2 | Not tested | — | |
| C3.3 | 3 Library | AI failure gives a plain message and keeps the good entries; a paid repeat of a failed run is refused | M2 | Broken | 141194dc 23 Oct | `check_ai_drafting` red (QA-2); stub steps fail in lane copies (QA-8) |
| C3.4 | 3 Library | AI drafts sections, document types, rules, checks and answer lists from sources | M2 | Not built | — | Only field maps today |
| C3.5 | 3 Library | Shared fields keep aliases; a reviewed merge redirects one into the other (P-65) | M2 | Not built | — | forms lane F1 slice 1 |
| C3.6 | 3 Library | "Describe what you need" adds a field or section with an advisory duplicate check; keys never typed (P-34, P-53) | M2 | Not built | — | Keys typed today (`studio.ts:253`) |
| C3.7 | 3 Library | Retire or delete library items, blocked while in use (P-52) | M2 | Not built | — | |
| C3.8 | 3 Library | Validator: every form field mapped or "not a fact", every option mapped per channel, every conditional question reachable | M2 | Partial | — | Problems check exists; channel rules in F1 |
| C3.9 | 3 Library | An online version's screen map reuses the PDF twin's field map first, then aliases; leftovers go to review (P-62) | M2 | Not tested | — | Back end on main (F1); review on Screen 02 |
| C3.10 | 3 Library | Every screen and message says form field, shared field and field map; never "box" (P-63) | M2 | **Broken** | main 23 Oct (Lead walk) | "Boxes mapped", "data boxes" on the combination page |
| C3.11 | 3 Library | A Signed PDF upload line automatically adds its signed-scan document requirement for that person (P-62 §3) | M2 | Not built | — | Screen 03 |
| C4.1 | 4 Questionnaires | Author builds the SQR per person role from the facts the forms and documents need | M2 | Partial | — | Section selection only |
| C4.2 | 4 Questionnaires | Author marks the combination's PQR questions on its PQR tab; only questions its SQR asks can be marked (P-76) | M2 | Not built | — | Screen 03 |
| C4.7 | 4 Questionnaires | AI drafts the combination's PQR picks with a reason per pick; a person accepts or removes each (P-76) | M2 | Not built | — | Screen 03; AI drafting owned by forms slice 3 |
| C4.8 | 5 Release | PQR and SQR changes are part of the combination's one review and release, with sources, forms, documents and rules; no separate approval (P-76) | M2 | Not built | — | Screen 03 Review and release |
| C4.3 | 4 Questionnaires | Preview by person with a sample family through the shared renderer (P-47) | M2 | Partial | — | Coverage preview, not the renderer |
| C4.5 | 4 Questionnaires | An upload question creates a document line (SA-1B-3 with P-47) | M2 | Not built | 141194dc 23 Oct | Not in the app; needs the shared renderer (C4.4) |
| C4.6 | 4 Questionnaires | Preview by person shows, for each person, which outputs they get per channel: portal screens, filled PDFs, PDFs to sign (P-62 §7) | M2 | Not built | — | Screen 03 |
| C4.4 | 4 Questionnaires | Every question type, three-tier validation, rules as data in one renderer (P-47) | T | Not built | — | runtime lane |
| C5.1 | 5 Release | Author submits; expert ticks; a different person approves and releases | M2 | Works | 141194dc 23 Oct | J6 in the browser: submit; approver refused before SME sign-off (plain reason); reviewer signs with the SME duty; author cannot approve (button and server 403); approver releases v2 with author/submitter/approver recorded. Submitter shown as an id (QA-10) |
| C5.3 | 5 Release | One "To review" page first under Configure lists every item waiting for a person or second person (AI proposals, editions, captures, screen maps, new fields, merges, held PDFs, combinations to release) with Needs you · Waiting for others · Running · All; the maker cannot approve their own item (P-79) | M2 | Not built | — | Screen 02 |
| C5.2 | 5 Release | The shared Release page cannot bypass submission or expert sign-off | M2 | **Broken** | 141194dc 23 Oct | QA-1 reproduced: API check and browser (J7) — shared release published an unsubmitted, unsigned change; author recorded as submitter |
| C6.1 | 6 Runtime | Officer opens a case for a released combination with its people (thin slice R1, P-67) | T | Not built | — | |
| C6.2 | 6 Runtime | Client answers on a family link, one group at a time, save and resume; each fact asked once | T | Not built | — | |
| C6.3 | 6 Runtime | Agent view: every fact once per person, source and status; edit updates every draft output | T | Not built | — | |
| C6.5 | 6 Runtime | AI reads uploaded documents and proposes facts for a person to confirm (SA-1B-34, one-pager 7.3) | M3 | Not built | — | BACKLOG, Lead note |
| C6.6 | 6 Runtime | Officer confirms facts section by section; only confirmed facts fill forms; AI-read values stay proposed (P-72) | T | Not built | — | Runtime R1 |
| C6.4 | 6 Runtime | Dynamic document checklist per person | M3 | Not built | — | |
| C6.10 | 6 Runtime | Confirmed by who answered: own answers and the principal's answers for a minor fill forms; the principal's answers for an adult show "answered by the principal" and fill only after that adult or the officer confirms (P-78) | T | Not built | — | Runtime R1a (adult's own link later, P-40) |
| C6.7 | 6 Runtime | A prospect answers the combination's PQR on the shared renderer; no verdict is shown to the prospect, only the firm's next step (P-76, P-77) | M3 | Not built | — | Runtime lane after R1 |
| C6.8 | 6 Runtime | PQR answers appear in the SQR already filled and marked "please confirm"; nothing is asked twice (P-77) | M3 | Not built | — | Runtime lane after R1 |
| C6.9 | 6 Runtime | Staff eligibility page: each gate met, not met or not answered, what is missing, "rules as at", disclaimer; gates are rules as data on the R1 engine, Sample values (P-77) | M3 | Not built | — | Runtime lane after R1; scoring grids stay B16 |
| C7.1 | 7 Fill | Fill an IRCC PDF from case facts with the append-only writer; read back equal; signatures intact | T | Partial | 141194dc 23 Oct | Studio suite A4: IMM 1295 filled, every value reads back; the download answers 404 in lane copies (QA-4); still from sample facts |
| C7.2 | 7 Fill | Form passes Adobe Validate; barcodes match the facts (fill-trial gate, P-65) | T | Not tested | — | evidence lane E1b |
| C7.5 | 7 Fill | Independent AI review of a filled form before it goes out (one-pager 8.3) | M3 | Not built | — | BACKLOG, Lead note |
| C7.6 | 7 Fill | Only the form's own Validate and missing or conflicting facts block "ready to file"; AI findings are acknowledged with a reason (P-71) | M3 | Not built | — | |
| C7.7 | 7 Fill | Prepare application lists a filing's items by channel — online forms with their portal sheet, PDF forms with Validate, signed PDFs with print-sign-upload, documents — with a status each (P-62 §6) | M3 | Not built | — | Board being drafted |
| C7.3 | 7 Fill | Portal sheet: answers in the portal's screen order with copy buttons | M3 | Not built | — | |
| C7.4 | 7 Fill | Extension fills one portal screen on a saved copy (P-66) | M3 | Not built | — | forms lane F2 |
| C8.1 | 8 Submit | Signed-PDF states, upload of signed scans, per-screen "entered" ticks | M3 | Not built | — | |
| C8.2 | 8 Submit | Filing records portal, our reference, application number and UCI | M3 | Not built | — | |
| C9.1 | 9 Changes | New edition: field-by-field comparison and AI impact on components and combinations, then release | M2 | Not built | — | Held only (Screen 02) |
| C9.2 | 9 Changes | A changed fact marks signed, uploaded or submitted items stale and never changes them (P-65) | M3 | Not built | — | |
| C9.3 | 9 Changes | Every fill checks the portal structure and opens "Re-capture needed"; Form health view (P-66) | M3 | Not built | — | |
| C9.4 | 9 Changes | A change on a portal screen found at re-check or by the extension opens a held online edition with its field-by-field difference and impact review, like a new PDF edition (P-61, P-66) | M3 | Not built | — | |

## Coverage floor (c8, P-69)
Set by QA-0 on main 141194dc (23 Oct): API servers under c8 12.0.0 while every suite and the qa journeys ran, plus the offline suites. **Floor: `api/src` 93% lines / 74% branches · `engine/` 94% lines / 85% branches** (measured 93.10 / 74.83 and 94.15 / 85.78; every file loaded). It may only rise; a fall is a Major finding. Lowest: `engine/ai-run.ts` 53% (QA-2 crash, QA-8), `api/src/studio.ts` 85%, branches in `sources.ts` 61% and `fill.ts` 63%. Detail: `reports/2026-10-23-milestone.md`.

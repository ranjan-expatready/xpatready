# Capabilities — what the product must do, and what independent testing found

Owner: the qa lane (skill `qa`); seeded by the Lead from the 23 Oct audit (`history/AUDIT-2026-10-23.md`). Status: **Works** · **Partial** · **Broken** · **Not built** · **Not tested** (built, but no independent human-style test yet). Only the qa lane changes Status, after a run, with the commit it tested. M = milestone (M2 setup, M3 runtime, T = thin slice P-67).

| # | Step | Capability (persona: what they can do) | M | Status | Tested on | Evidence / note |
|---|---|---|---|---|---|---|
| C1.1 | 1 Setup | Author sees every combination by workspace, filters Needs work · Live · All, sorts by status | M2 | Works | 141194dc 23 Oct | Walked (pane) and journeys J1, J8; Screen 01 browser suite 101/101; warm first view 809 ms, filter 113 ms; 1024 and 400 px no sideways scroll |
| C1.2 | 1 Setup | Author creates Program › Category › Sub-category in one path builder; duplicates refused with a field message | M2 | Partial | 65826022 23 Oct | Path builder, duplicates, double click and wrong role hold (J1, J2, J4); 121+ characters fails silently (QA-7), symbol-only names (QA-6), 'Open the existing' opens the list (QA-11); simultaneous same names stored twice (QA-14) |
| C1.3 | 1 Setup | Author links combinations ("Supported by", "Follows") carrying named facts and documents | M2 | Not built | 141194dc 23 Oct | 'Linked to' stores a text label only (seen on the path builder) |
| C1.4 | 1 Setup | Combination page shows path, status and the one next step | M2 | Partial | 65826022 23 Oct | Path, status, one next step hold; on Visitor visa the next step 'Add 1 form from the library' fails after a removal (QA-13); step times without a date (QA-17) |
| C1.5 | 1 Setup | Author copies a line from another combination, and adds or removes one line across many (SA-1B-61, Screen 03) | M2 | Not built | 141194dc 23 Oct | Not in the app (BACKLOG, Lead note) |
| C2.1 | 2 Sources | Author uploads an IRCC PDF; code, edition, published date and checksum read without AI | M2 | Works | 141194dc 23 Oct | J5: IMM 5257 (09-2023) read from the file and attached in 0.8 s; Screen 01 suites |
| C2.2 | 2 Sources | A file not on the approved list is held, with a plain reason, before library, attachment or AI (P-57) | M2 | Works | 141194dc 23 Oct | J5: unapproved file held 'for source verification' with the reason, not added, attached or sent to AI; listed in `/intake/held` |
| C2.3 | 2 Sources | A person approves or rejects a held file in the product | M2 | Not built | — | Approval is a manifest row today |
| C2.4 | 2 Sources | Same file again → "already in the library"; same code, new edition → held for impact review | M2 | Partial | 65826022 23 Oct | Same file → 'Already in the library'; older edition kept aside (J5); a form removed then added again → 409 (QA-13); approved newer edition not producible without a manifest change |
| C2.5 | 2 Sources | Author adds a portal (online) form from a saved blank page or the template; values refused; second person approves (P-66) | M2 | Partial | 65826022 23 Oct | API only (no pages yet, slice 3): capture, French labels kept, answers refused (value, tick, choice, date), hidden token ignored, second person approves, two approvals at once → one version (qa probe 25/26; builders' suite 106/106). Lower-case form code refused (QA-15) |
| C2.6 | 2 Sources | Checklists are read into document requirement proposals | M2 | Not built | — | Stored as sources only |
| C3.1 | 3 Library | AI maps form fields to shared fields: reuse / new / ambiguous / conflict, beside the source | M2 | Partial | 141194dc 23 Oct | Scripted only (replays, no person walk): Studio suite A-pass; in lane copies every AI step fails (QA-8) |
| C3.2 | 3 Library | Reviewer accepts, edits or rejects each proposal; bulk accept only for clean reuse; Undo | M2 | Not tested | — | |
| C3.3 | 3 Library | AI failure gives a plain message and keeps the good entries; a paid repeat of a failed run is refused | M2 | Partial | 65826022 23 Oct | QA-2 closed: `check_ai_drafting` 48/48. Every AI step still fails in lane copies (QA-8) |
| C3.4 | 3 Library | AI drafts sections, document types, rules, checks and answer lists from sources | M2 | Not built | — | Only field maps today |
| C3.5 | 3 Library | Shared fields keep aliases; a reviewed merge redirects one into the other (P-65) | M2 | Works | 65826022 23 Oct | API only: aliases one-label-one-field across case and hyphens, French alias kept; merge into itself refused, different kinds refused, proposer cannot approve, a different person's approval redirects, releases untouched (qa probe) |
| C3.6 | 3 Library | "Describe what you need" adds a field or section with an advisory duplicate check; keys never typed (P-34, P-53) | M2 | Not built | — | Keys typed today (`studio.ts:253`) |
| C3.7 | 3 Library | Retire or delete library items, blocked while in use (P-52) | M2 | Not built | — | |
| C3.8 | 3 Library | Validator: every form field mapped or "not a fact", every option mapped per channel, every conditional question reachable | M2 | Partial | 65826022 23 Oct | Channel rules work through the API: an Online line without a portal is an error in plain words and blocks submission; unknown channel refused. Conditional-question reachability not checked; PDF form fields 'mapped or not a fact' stays a warning (forms choice 4, Lead decision) |
| C4.1 | 4 Questionnaires | Author builds the SQR per person role from the facts the forms and documents need | M2 | Partial | — | Section selection only |
| C4.2 | 4 Questionnaires | Author builds the PQR (pre-qualification subset) | M2 | Not built | — | Owner open: per country (team) vs per combination |
| C4.3 | 4 Questionnaires | Preview by person with a sample family through the shared renderer (P-47) | M2 | Partial | — | Coverage preview, not the renderer |
| C4.5 | 4 Questionnaires | An upload question creates a document line (SA-1B-3 with P-47) | M2 | Not built | 141194dc 23 Oct | Not in the app; needs the shared renderer (C4.4) |
| C4.4 | 4 Questionnaires | Every question type, three-tier validation, rules as data in one renderer (P-47) | T | Not built | — | runtime lane |
| C5.1 | 5 Release | Author submits; expert ticks; a different person approves and releases | M2 | Works | 141194dc 23 Oct | J6 in the browser: submit; approver refused before SME sign-off (plain reason); reviewer signs with the SME duty; author cannot approve (button and server 403); approver releases v2 with author/submitter/approver recorded. Submitter shown as an id (QA-10) |
| C5.2 | 5 Release | The shared Release page cannot bypass submission or expert sign-off | M2 | **Broken** | 141194dc 23 Oct | QA-1 reproduced: API check and browser (J7) — shared release published an unsubmitted, unsigned change; author recorded as submitter |
| C6.1 | 6 Runtime | Officer opens a case for a released combination with its people | T | Not built | — | |
| C6.2 | 6 Runtime | Client answers on a family link, one group at a time, save and resume; each fact asked once | T | Not built | — | |
| C6.3 | 6 Runtime | Agent view: every fact once per person, source and status; edit updates every draft output | T | Not built | — | |
| C6.5 | 6 Runtime | AI reads uploaded documents and proposes facts for a person to confirm (SA-1B-34, one-pager 7.3) | M3 | Not built | — | BACKLOG, Lead note |
| C6.4 | 6 Runtime | Dynamic document checklist per person | M3 | Not built | — | |
| C7.1 | 7 Fill | Fill an IRCC PDF from case facts with the append-only writer; read back equal; signatures intact | T | Partial | 141194dc 23 Oct | Studio suite A4: IMM 1295 filled, every value reads back; the download answers 404 in lane copies (QA-4); still from sample facts |
| C7.2 | 7 Fill | Form passes Adobe Validate; barcodes match the facts (fill-trial gate, P-65) | T | Not tested | — | evidence lane E1b |
| C7.5 | 7 Fill | Independent AI review of a filled form before it goes out (one-pager 8.3) | M3 | Not built | — | BACKLOG, Lead note |
| C7.3 | 7 Fill | Portal sheet: answers in the portal's screen order with copy buttons | M3 | Not built | — | |
| C7.4 | 7 Fill | Extension fills one portal screen on a saved copy (P-66) | M3 | Not built | — | forms lane F2 |
| C8.1 | 8 Submit | Signed-PDF states, upload of signed scans, per-screen "entered" ticks | M3 | Not built | — | |
| C8.2 | 8 Submit | Filing records portal, our reference, application number and UCI | M3 | Not built | — | |
| C9.1 | 9 Changes | New edition: field-by-field comparison and AI impact on components and combinations, then release | M2 | Not built | — | Held only (Screen 02) |
| C9.2 | 9 Changes | A changed fact marks signed, uploaded or submitted items stale and never changes them (P-65) | M3 | Not built | — | |
| C9.3 | 9 Changes | Every fill checks the portal structure and opens "Re-capture needed"; Form health view (P-66) | M3 | Not built | — | |

## Coverage floor (c8, P-69)
Set by QA-0 on 141194dc (api 93.10 / 74.83, engine 94.15 / 85.78). After-merge on **65826022**: api **94.71% lines / 76.44% branches**, engine **98.80% / 84.71%** (new slice-1 files included). **Floor now: `api/src` 94% lines / 76% branches · `engine/` 98% lines / 85% branches** (raised where it rose; engine branches stay at 85% and are below it: QA-18). It may only rise; a fall is a Major finding. Detail: `reports/2026-10-23-after-merge.md`.

# Capabilities — what the product must do, and what independent testing found

Owner: the qa lane (skill `qa`); seeded by the Lead from the 23 Oct audit (`history/AUDIT-2026-10-23.md`). Status: **Works** · **Partial** · **Broken** · **Not built** · **Not tested** (built, but no independent human-style test yet). Only the qa lane changes Status, after a run, with the commit it tested. M = milestone (M2 setup, M3 runtime, T = thin slice P-67).

| # | Step | Capability (persona: what they can do) | M | Status | Tested on | Evidence / note |
|---|---|---|---|---|---|---|
| C1.1 | 1 Setup | Author sees every combination by workspace, filters Needs work · Live · All, sorts by status | M2 | Not tested | — | Screen 01 |
| C1.2 | 1 Setup | Author creates Program › Category › Sub-category in one path builder; duplicates refused with a field message | M2 | Not tested | — | `api/src/programs.ts` |
| C1.3 | 1 Setup | Author links combinations ("Supported by", "Follows") carrying named facts and documents | M2 | Not built | — | Text label only (P-59, Screen 03) |
| C1.4 | 1 Setup | Combination page shows path, status and the one next step | M2 | Not tested | — | Screen 01 |
| C2.1 | 2 Sources | Author uploads an IRCC PDF; code, edition, published date and checksum read without AI | M2 | Not tested | — | `api/src/intake.ts` |
| C2.2 | 2 Sources | A file not on the approved list is held, with a plain reason, before library, attachment or AI (P-57) | M2 | Not tested | — | |
| C2.3 | 2 Sources | A person approves or rejects a held file in the product | M2 | Not built | — | Approval is a manifest row today |
| C2.4 | 2 Sources | Same file again → "already in the library"; same code, new edition → held for impact review | M2 | Not tested | — | Newer-edition path untested |
| C2.5 | 2 Sources | Author adds a portal (online) form from a saved blank page or the template; values refused; second person approves (P-66) | M2 | Not built | — | forms lane F1 slice 1 |
| C2.6 | 2 Sources | Checklists are read into document requirement proposals | M2 | Not built | — | Stored as sources only |
| C3.1 | 3 Library | AI maps form fields to shared fields: reuse / new / ambiguous / conflict, beside the source | M2 | Not tested | — | `engine/normalize.ts` |
| C3.2 | 3 Library | Reviewer accepts, edits or rejects each proposal; bulk accept only for clean reuse; Undo | M2 | Not tested | — | |
| C3.3 | 3 Library | AI failure gives a plain message and keeps the good entries; a paid repeat of a failed run is refused | M2 | Not tested | — | `check_ai_drafting` red on main (expects 4 runs, 6 exist) |
| C3.4 | 3 Library | AI drafts sections, document types, rules, checks and answer lists from sources | M2 | Not built | — | Only field maps today |
| C3.5 | 3 Library | Shared fields keep aliases; a reviewed merge redirects one into the other (P-65) | M2 | Not built | — | forms lane F1 slice 1 |
| C3.6 | 3 Library | "Describe what you need" adds a field or section with an advisory duplicate check; keys never typed (P-34, P-53) | M2 | Not built | — | Keys typed today (`studio.ts:253`) |
| C3.7 | 3 Library | Retire or delete library items, blocked while in use (P-52) | M2 | Not built | — | |
| C3.8 | 3 Library | Validator: every form field mapped or "not a fact", every option mapped per channel, every conditional question reachable | M2 | Partial | — | Problems check exists; channel rules in F1 |
| C4.1 | 4 Questionnaires | Author builds the SQR per person role from the facts the forms and documents need | M2 | Partial | — | Section selection only |
| C4.2 | 4 Questionnaires | Author builds the PQR (pre-qualification subset) | M2 | Not built | — | Owner open: per country (team) vs per combination |
| C4.3 | 4 Questionnaires | Preview by person with a sample family through the shared renderer (P-47) | M2 | Partial | — | Coverage preview, not the renderer |
| C4.4 | 4 Questionnaires | Every question type, three-tier validation, rules as data in one renderer (P-47) | T | Not built | — | runtime lane |
| C5.1 | 5 Release | Author submits; expert ticks; a different person approves and releases | M2 | Not tested | — | `studio.ts:464-525` |
| C5.2 | 5 Release | The shared Release page cannot bypass submission or expert sign-off | M2 | **Broken** | main eeea376f (Lead read) | `/pack/release` skips both, records first author as submitter (`studio.ts:527-547`) |
| C6.1 | 6 Runtime | Officer opens a case for a released combination with its people | T | Not built | — | |
| C6.2 | 6 Runtime | Client answers on a family link, one group at a time, save and resume; each fact asked once | T | Not built | — | |
| C6.3 | 6 Runtime | Agent view: every fact once per person, source and status; edit updates every draft output | T | Not built | — | |
| C6.4 | 6 Runtime | Dynamic document checklist per person | M3 | Not built | — | |
| C7.1 | 7 Fill | Fill an IRCC PDF from case facts with the append-only writer; read back equal; signatures intact | T | Partial | — | From sample facts only (`api/src/fill.ts`) |
| C7.2 | 7 Fill | Form passes Adobe Validate; barcodes match the facts (fill-trial gate, P-65) | T | Not tested | — | evidence lane E1b |
| C7.3 | 7 Fill | Portal sheet: answers in the portal's screen order with copy buttons | M3 | Not built | — | |
| C7.4 | 7 Fill | Extension fills one portal screen on a saved copy (P-66) | M3 | Not built | — | forms lane F2 |
| C8.1 | 8 Submit | Signed-PDF states, upload of signed scans, per-screen "entered" ticks | M3 | Not built | — | |
| C8.2 | 8 Submit | Filing records portal, our reference, application number and UCI | M3 | Not built | — | |
| C9.1 | 9 Changes | New edition: field-by-field comparison and AI impact on components and combinations, then release | M2 | Not built | — | Held only (Screen 02) |
| C9.2 | 9 Changes | A changed fact marks signed, uploaded or submitted items stale and never changes them (P-65) | M3 | Not built | — | |
| C9.3 | 9 Changes | Every fill checks the portal structure and opens "Re-capture needed"; Form health view (P-66) | M3 | Not built | — | |

## Coverage floor (c8, P-69)
Not yet measured. The first `/qa milestone` run sets the floor for `api/src` and `engine/` (lines and branches); it may only rise.

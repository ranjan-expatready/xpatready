# P-65 — Independent review of the forms design (Lead, 23 Oct; founder agreed 23 Oct)

The founder had ChatGPT propose a design from a neutral problem statement ("canonical field library with human-operated government channels"), then asked the Lead to test it against our decisions (P-61, P-62, P-63), the code and IRCC sources, keep what is right, and update the files.

## Sources checked (23 Oct)
| Claim | Verdict |
|---|---|
| IMM 0008 has a Permanent Residence Portal digital version and a PDF for paper (IRCC IMM 0008 page, updated 11 Sep 2026) | Verified |
| IMM 0008, IMM 1344 and eIMM 5669 are validated forms with 2D barcodes; they need Adobe Reader on a computer, not a browser (IRCC Help Centre q138) | Verified |
| Express Entry PR is applied for online; the system gives a personalised document checklist once the online form is complete (IRCC Express Entry page) | Verified |
| APR portal: profile sections each show Not started / In progress / Complete; for visitor, study and work applications the representative enters the client's **case ID, an internal reference IRCC does not use** (APR user guide) | Verified (new fact for us) |
| DocketWise (questionnaire, roles on forms, document requests, review of generated forms) and CaseEasy (forms and checklists by application type, questionnaire → form autofill) | Vendor statements only, not proof of how they work |

## Verdict on the eight proposals
| # | Proposal | Verdict | Why |
|---|---|---|---|
| 1 | Stable canonical id per fact | **Kept** (already P-62, `fact-key.ts`) | Same as ours |
| 2 | Facts separate from form versions; a split date = one fact, three mappings | **Kept** (P-62, P-63; confirmed in IMM 5257/1344 files) | Same as ours |
| 3 | Deterministic PDF extraction; human entry for portal screens; optional AI | **Kept, extended.** We also read saved portal pages by code. **New safeguard:** a saved page must come from a blank or test application, and values are stripped by code before it is stored (a real page holds a client's data). Human entry stays the no-AI path | Reading by code is cheaper and exact; privacy gap closed |
| 4 | AI drafts candidate fields only; search first; editor reuses, creates, edits or rejects; evidence kept | **Kept** (P-15, P-53, P-62 §5). **Added:** aliases and reviewed merges (below) | Same rule; two gaps filled |
| 5 | Role-specific PQR/SQR, follow-ups, checklists, form list from the release | **Kept** (P-47, P-62 §2) | Same |
| 6 | Facts once with source, owner, verification status, history; PDF only when tested; portal worksheet; signed-PDF states; stale, never overwrite | **Kept and adopted where we were weaker:** (a) a PDF edition is filled directly only after its fill trial passes (team "Forms at launch"; evidence lane), else answer sheet; (b) each case fact carries source, owner, verification status and history; (c) signed PDFs move prepare → printed → sent for signature → signed copy received → uploaded; (d) **a changed fact marks dependent drafts stale and never changes a signed, uploaded or submitted item**: this corrects P-45's "updates everywhere" | (d) was a real gap in our design |
| 6b | Portal: manual entry from a worksheet only | **Changed:** worksheet (portal sheet) with a per-screen "entered" tick mirroring the portal's own Complete states, plus the team's extension (redesign decision 16) later | Team requirement keeps the extension; worksheet stays the baseline |
| 7 | PDF changes by listing checks and inventory comparison; portal changes by observation | **Kept with P-32:** a person uploads; the product never fetches. An optional listing alert may tell a person to upload (team decision 17 change watch), never download | Same, with our rule |
| 8 | Start with one combination, one PDF, one worksheet; defer broad AI and many combinations | **Rejected as scope** (founder decisions P-28, P-29, P-54: full scope, 3 + 2 then 5 + 5). **Kept as sequencing:** prove one thin end-to-end slice early (P-18) on spousal sponsorship | Founder chose full scope; the thin slice reduces risk |

## How "automatic shared-field creation" works (draft ≠ approved)
1. **Read by code:** every form field or portal input gets its label, type, options and path.
2. **Match without AI first:** same form and path already mapped → reuse; the label equals a shared field's name or one of its **aliases** (labels seen on other forms: "Date of birth", "DOB", "Birth date") with a compatible type → proposed reuse.
3. **AI (optional) drafts the rest:** for each leftover, a match to an existing field or a **draft new field** (id by `fact-key.ts`, label, type, scope person/case, answer list, the source quote). Drafts are never live.
4. **Duplicate check:** exact key or alias → blocked; meaning check → "use existing · probably not needed · new is justified".
5. **A person decides** reuse, create, edit or reject; a different person approves; the new field's id never changes after release.
6. **Merge, reviewed:** two approved fields found to mean the same → one survives; the other's id becomes an alias that redirects; mappings and rules are moved; released versions stay as released. AI may propose a merge; a person approves it.
With AI off, steps 1, 2, 4 (exact), 5 and 6 still work: the person maps leftovers by searching the library.

Unconfirmed: no counsel. Portal behaviour beyond the cited pages is unconfirmed until the immigration expert and the design-partner firm confirm it.

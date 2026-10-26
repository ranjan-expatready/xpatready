# Wave 1 — the tracking list (read by every /lead, P-101)

Owner: the Lead. Founder brief 26 Oct (R-115–R-117), decisions P-101–P-110. Goal: the whole journey **without the browser extension**, actor by actor, on the founder's 5 Retail combinations (+1 Corporate Sample). Forms come in only as PDFs; the extension returns last, for online fill only. Status words: Not started · Concept · Founder choice · Build · Check · Merged · Works (tested by qa).

## Order of work (one actor at a time; engine work alongside)
| ID | Business name | Lane | Depends on | Status |
|---|---|---|---|---|
| W1-01 | Decisions recorded, plan, lanes redirected, workflow trimmed | Lead | — | Merged when the Lead PR lands |
| W1-02 | Park the browser extension (branch `lead/parked-extension-2026-10-26`; remove capture, pairing, online fill, APR twin, Extension page, "Add an online form", portal fields; demo rows that need it) | forms | W1-01 | Not started |
| W1-03 | Structure: five levels, Pathway type as tab (Retail · Corporate and employers), Structure page with links, duplicate check, AI "did you mean" | screens | W1-01 | Concept |
| W1-04 | Programs page redesign: modern tabs, full five-part trail, no filter-tab row, search and New combination placed, tooltips | screens | W1-03 | Concept |
| W1-05 | New combination redesign: pick from Structure, Rules then AI proposal, mandatory markers, "Linked to" removed | screens | W1-03 | Concept |
| W1-06 | Form library as the one door, with the **form finder** (founder's ask: pick a combination → AI suggests its forms from the official IRCC guide/checklist with the quoted line → the person ticks → the system downloads only from canada.ca and files them in the library). Honest split: AI chooses which forms and under what condition; the lookup, download, code/edition/checksum and duplicate check are deterministic; a person approves. Also: IRCC columns, duplicate check (number + edition + checksum), person upload, AI proposes forms → system downloads from canada.ca → person approves, "Find missing forms", what IRCC accepts per form (PDF / Online / both) | forms | W1-02 | Concept |
| W1-07 | AI run experience (shared): steps shown live, progress bar, plain errors, Stop; live-tested within US$40 | forms (component) · all lanes use it | W1-01 | Concept |
| W1-08 | Combination workspace cleanup: tabs without overlap, forms picked from the library only, channel default per form, "People in this combination" explained, sample-file and portal scaffolding removed, Configuration (who fills, when) and Preview simplified, tooltips | runtime | W1-02, W1-06 | Concept |
| W1-09 | Shared library in setup order (combination → forms → fields, sections, document types, checks); manual add with the AI duplicate check; missing masters listed | screens | W1-03 | Concept |
| W1-10 | AI drafts the rest of the masters from the PDFs and checklists: sections, document types, conditions, checks (proposals only) | forms | W1-06, W1-07 | Not started |
| W1-11 | Reset empties everything; Load sample = structure + official PDFs of the 5 combinations (+1 Corporate Sample); AI proposals replay | runtime | W1-03, W1-06 | Not started |
| W1-12 | Forms for the 5 combinations identified from IRCC guides (Sample until the expert confirms), downloaded, checked in Adobe | Lead research · evidence (Mac) | — | Research running |
| W1-14 | End-to-end map v2: the complete scope (built and imagined) redrawn on today's decisions, as a new file beside the earlier map (founder: create our own version) | Lead | W1-03–W1-09 concepts agreed | Not started |
| W1-13 | Content publisher end to end on the 5 combinations, tested like a person | qa | W1-02–W1-11 | Not started |
| W2 | Immigration expert: second-person approvals, release gate, Sample values confirmed | screens · runtime | W1-13 | Not started |
| W3 | AI wherever designed: describe what you need, propose facts from documents, AI review, new-edition impact | forms | W2 | Not started |
| W4 | Case officer / agent view: open case, PDF / online / both per form (P-107), case link to an employer case (P-106), confirm section by section, prepare and record the filing | m3 (design now: IRCC representative-portal research) | W2 | Concept research |
| W5 | Client and prospect: PQR, SQR, sign | runtime | W4 | Not started |
| W6 | Browser extension for online fill (unpark; capture does not return). Carry the PR #37 review findings: a repeated fill keeps Undo; portal option codes are checked for client details | forms | W5 | Parked |

## Founder inputs checked (not followed blindly)
* **Sheet of 5 combinations:** "Study Permit › Study Permit" repeats the program (category becomes the application type); "Express Entry Stream _ Province" typo; Ontario as a sub-category changes no IRCC form (P-109); inside/outside Canada and inland/outland are levels only where IRCC files them as different applications (expert confirms); the forms column was empty (W1-12).
* **End-to-end map 26 Oct:** extension cards, "the product never fetches" and the capture steps are superseded by P-102/P-103.
* **Progress page 26 Oct:** its focus line "ingestion and extension" is superseded by P-101.
* Screens the founder named by their place in the app (Programs › New combination; Programs › Individual › Citizenship › Grant of citizenship; Corporate › Compliance › Inspection response; Shared library) are saved as the "before" in `screens/W1-baseline/` (18 screenshots, 26 Oct). Forms come from the canada.ca forms page the founder gave (W1-12).
* Structure names on the sheet: the Lead decides from IRCC's own naming (founder: "research what is the truth"); research in screens/W1-form-library/forms-for-5-combinations.md (Part B, being written); the expert confirms later.

## Earlier parallel work: what happens to it (Lead audit 26 Oct)
| Work | Where now | In wave 1 |
|---|---|---|
| Extension F2 + F3 slices 1–4 (capture, pairing, online fill, APR twin) | merged on `main` (PR #34–#36); saved on `lead/parked-extension-2026-10-26` | Removed by W1-02; fill parts return in W6; capture does not return |
| PDF intake, held files, second-person approval, second-draft guard, PDF hardening (forms) | `main` | Kept; the base of W1-06 |
| Screen 01 Programs and New combination | `main` | Redesigned in W1-03–W1-05 |
| Screen 02 AI work, To review, merges, edition impact | `main` | Kept; reused by W1-06, W1-09, W2 |
| Screen 04 slice 1 (library lists) | never built (session stopped) | Folded into W1-09 |
| Screen 03 S1 + S2 (SQR tab, coverage per role, copies, minimum age, signed by, preview by person) | runtime branch, 5 commits, not merged | Reused by W1-08 where its concept keeps it; merged only after that |
| R1 thin slice (case, family link, answers once, agent facts, PDF fill) | `main` | Reused in W4 and W5 |
| M3 Prepare application challenge | m3 lane | Input to W4 research |
| Evidence IMM 5409, IMM 5476 Adobe checks | `main` | Reused (IMM 5476 is in every combination) |
| qa/Goose explore (real-portal proof plan), scout SC-1 Programs empty-state wording | own branches, not merged | Portal plan parked; SC-1 wording considered in W1-04 |
| Lead PRs #28 (roles audit), #30 (archive non-POC folders) | open since 25 Oct | Founder decides later; not blocking |

## Rules for this wave
**Lanes (P-111):** two build lanes (screens, forms) plus qa after every merge; runtime (workspace) starts after both merge; m3 research only; scout, evidence, Devin and Goose paused; one Lead chat at a time, a fresh /lead each day. Permanent-residence combinations: PDFs where IRCC takes them, an answer sheet for portal-only forms (P-113).
Concepts offer the founder 2–3 options with a recommendation before BUILD (founder: "discuss the available solutions, then select one"). Tooltips in plain functional words on every control. Corporate stays empty except one Sample. AI only proposes; every AI action follows W1-07.

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
| W1-06 | Form library as the one door: IRCC columns, duplicate check (number + edition + checksum), person upload, AI proposes forms → system downloads from canada.ca → person approves, "Find missing forms", what IRCC accepts per form (PDF / Online / both) | forms | W1-02 | Concept |
| W1-07 | AI run experience (shared): steps shown live, progress bar, plain errors, Stop; live-tested within US$40 | forms (component) · all lanes use it | W1-01 | Concept |
| W1-08 | Combination workspace cleanup: tabs without overlap, forms picked from the library only, channel default per form, "People in this combination" explained, sample-file and portal scaffolding removed, Configuration (who fills, when) and Preview simplified, tooltips | runtime | W1-02, W1-06 | Concept |
| W1-09 | Shared library in setup order (combination → forms → fields, sections, document types, checks); manual add with the AI duplicate check; missing masters listed | screens | W1-03 | Concept |
| W1-10 | AI drafts the rest of the masters from the PDFs and checklists: sections, document types, conditions, checks (proposals only) | forms | W1-06, W1-07 | Not started |
| W1-11 | Reset empties everything; Load sample = structure + official PDFs of the 5 combinations (+1 Corporate Sample); AI proposals replay | runtime | W1-03, W1-06 | Not started |
| W1-12 | Forms for the 5 combinations identified from IRCC guides (Sample until the expert confirms), downloaded, checked in Adobe | Lead research · evidence (Mac) | — | Research running |
| W1-13 | Content publisher end to end on the 5 combinations, tested like a person | qa | W1-02–W1-11 | Not started |
| W2 | Immigration expert: second-person approvals, release gate, Sample values confirmed | screens · runtime | W1-13 | Not started |
| W3 | AI wherever designed: describe what you need, propose facts from documents, AI review, new-edition impact | forms | W2 | Not started |
| W4 | Case officer / agent view: open case, PDF / online / both per form (P-107), case link to an employer case (P-106), confirm section by section, prepare and record the filing | m3 (design now: IRCC representative-portal research) | W2 | Concept research |
| W5 | Client and prospect: PQR, SQR, sign | runtime | W4 | Not started |
| W6 | Browser extension for online fill (unpark) | forms | W5 | Parked |

## Founder inputs checked (not followed blindly)
* **Sheet of 5 combinations:** "Study Permit › Study Permit" repeats the program (category becomes the application type); "Express Entry Stream _ Province" typo; Ontario as a sub-category changes no IRCC form (P-109); inside/outside Canada and inland/outland are levels only where IRCC files them as different applications (expert confirms); the forms column was empty (W1-12).
* **End-to-end map 26 Oct:** extension cards, "the product never fetches" and the capture steps are superseded by P-102/P-103.
* **Progress page 26 Oct:** its focus line "ingestion and extension" is superseded by P-101.
* Promised but not received: screenshots of the screens and a folder of library forms; the canada.ca forms page is used until they arrive.

## Rules for this wave
Concepts offer the founder 2–3 options with a recommendation before BUILD (founder: "discuss the available solutions, then select one"). Tooltips in plain functional words on every control. Corporate stays empty except one Sample. AI only proposes; every AI action follows W1-07.

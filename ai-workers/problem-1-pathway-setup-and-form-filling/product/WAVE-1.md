# Wave 1 — the tracking list (read by every /lead, P-101)

Owner: the Lead. Founder brief 26 Oct (R-115–R-117), decisions P-101–P-110. Goal: the whole journey **without the browser extension**, actor by actor, on the founder's 5 Retail combinations (+1 Corporate Sample). Forms come in only as PDFs; the extension returns last, for online fill only. Status words: Not started · Concept · Founder choice · Build · Check · Merged · Works (tested by qa).

## Screen queue (P-117: one at a time; the Lead guides; "Founder OK" moves to the next)
| # | Screen | Closes asks | Status | Founder OK |
|---|---|---|---|---|
| S1 | Structure (+ Pathway cards that open the tree; "Used by" names; toasts; menu background) | B5; B1, B2 in part | Merged 27 Oct incl. S1-finish (Lead check d40c582: 34/34 suites, journey 45/45); Start setup link and panel footer fixed in S2 | |
| S2 | Immigration programs, card layout (design D) | B1–B4, C2 | Built on screens lane (4e6b409, not on :4400). Lead early look 27 Oct: close to D, 10 differences, small fix recommended (`screens/W1-structure-programs/early-look/s2/EARLY-LOOK.md`); founder Go or changes next | |
| S3 | New combination | C1–C5 | Agreed 27 Oct: founder marked walkthrough v2 OK (P-123); builds after S2, one at a time | |
| S4 | Form library: one list, upload through AI, every action (P-123) | E1, D6, A4 data, F6 | Agreed (walkthrough v2, P-123). **Started 27 Oct in the forms lane, in parallel with S2 (P-124):** DESIGN (challenge + slice plan), then BUILD; includes the form finder engine (find, download, store, attach automatically) | |
| S5 | Combination workspace: forms picked by AI, editable "Who can be in this application" (P-123) | D1, D3–D5 | Agreed 27 Oct: founder marked walkthrough v2 OK (P-123); builds after S2, one at a time | |
| S6 | Shared library: one review queue, one Add in plain words (P-120, P-121) | F3–F5, H1, H6 | Agreed 27 Oct: founder marked walkthrough v2 OK (P-123); builds after S2, one at a time | |
| S7 | Reset + Load sample (5 combinations with their PDFs) | B6, E2, F1, F2 | Agreed 27 Oct: founder marked walkthrough v2 OK (P-123); builds after S2, one at a time; all published official files for the 6 combinations saved 27 Oct (28 of 29; EMP5626 online-only) | |
| S8 | Content publisher walk-through (qa, like a person) | W1-13 | Not started | |
**Walkthrough page (27 Oct): v2 marked OK on all of S3–S7 (P-123), so the S3–S7 designs are agreed.** `design/walkthrough-s3-s7.html` shows S3–S7 as they will look with the grilling answers (P-118–P-121) built in; the founder marks each OK or Change in one pass, and "Copy my marks" gives the text for the Lead. Then W2–W6 below, the same way. At the end of every screen the Lead asks: Is it working? Anything to change? OK to move on?

## Order of work (one actor at a time; engine work alongside)
| ID | Business name | Lane | Depends on | Status |
|---|---|---|---|---|
| W1-01 | Decisions recorded, plan, lanes redirected, workflow trimmed | Lead | — | Merged |
| W1-02 | Park the browser extension (branch `lead/parked-extension-2026-10-26`; remove capture, pairing, online fill, APR twin, Extension page, "Add an online form", portal fields; demo rows that need it) | forms | W1-01 | Merged 27 Oct (PR #39; local suites 32/32 + browser 44/44); qa after-merge next |
| W1-03 | Structure: five levels, Pathway type as tab (Retail · Corporate and employers), Structure page with links, duplicate check, AI "did you mean" | screens | W1-01 | Merged 27 Oct (slices 1+2 + journey fix; 33/33 suites, studio journey 45/45); finish items are S1 |
| W1-04 | Programs page redesign: modern tabs, full five-part trail, no filter-tab row, search and New combination placed, tooltips | screens | W1-03 | S2: after the founder's OK on S1 |
| W1-05 | New combination redesign: pick from Structure, Rules then AI proposal, mandatory markers, "Linked to" removed | screens | W1-03 | Agreed (P-115) → screens challenge, then BUILD |
| W1-06 | (S4, started 27 Oct, P-124) Form library as the one door, with the **form finder** (founder's ask: pick a combination → AI suggests its forms from the official IRCC guide/checklist with the quoted line → the person ticks → the system downloads only from canada.ca and files them in the library). Honest split: AI chooses which forms and under what condition; the lookup, download, code/edition/checksum and duplicate check are deterministic; a person approves. Also: IRCC columns, duplicate check (number + edition + checksum), person upload, AI proposes forms → system downloads from canada.ca → person approves, "Find missing forms", the form edition × filing route mapping (online form · PDF upload · print and sign · not needed; P-114) | forms | W1-02 | Concept |
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
| W4 | Case officer / agent view (includes the P-113 answer sheet in portal order for portal-only forms): open case, filing route per application, channel per form inside it (P-114), case link to an employer case (P-106), confirm section by section, prepare and record the filing | m3 (design now: IRCC representative-portal research) | W2 | Concept research |
| W5 | Client and prospect: PQR, SQR, sign | runtime | W4 | Not started |
| W6 | Browser extension for online fill (unpark; capture does not return). Carry the PR #37 review findings: a repeated fill keeps Undo; portal option codes are checked for client details | forms | W5 | Parked |

**Founder asks of 26 Oct, one line each** (44 asks, where each lives, status, and the gaps still open for the founder): `screens/W1-baseline/founder-asks.md`. Progress page for the founder: `design/end-to-end-progress.html`. Keep all three in step.

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
**Remove, retire, reorder (P-116):** one shared mechanism on every master (where used first; remove only unused, retire/restore used; reorder where order matters; no move), built with W1-03 and reused by W1-06, W1-08, W1-09. **Lanes (P-111, amended by P-117):** one build lane at a time on the demo path, qa after every merge; m3 research only; scout, evidence, Devin and Goose paused; one Lead chat at a time, a fresh /lead each day. Permanent-residence combinations: PDFs where IRCC takes them, an answer sheet for portal-only forms (P-113).
Concepts offer the founder 2–3 options with a recommendation before BUILD (founder: "discuss the available solutions, then select one"), always including the Lead's best modern layout even where it departs from the founder's words (founder, 27 Oct: "feel free to suggest"). Tooltips in plain functional words on every control. Corporate stays empty except one Sample. AI only proposes; every AI action follows W1-07.

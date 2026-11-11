# UX baseline: the whole product scored, screen by screen (step 2 of A19 (k))

**Round 1, 11 Nov 2026, `main` fbfb263c7.** The UX planner, read-only on product code (P-455 (5)). Rubric: `01-rubric.md`. Ground truth: `inventory/<screen>.yaml` (68 files, one per screen, state or dialog, crawled; `inventory/INDEX.md` maps every route to its files and says why the few unreached ones are not reached), `score-history.md` (screen × dimension, dated), `shots/` (1440 and 375 px), `tools/` (the crawl, the walk and the scores, so the next round repeats this one exactly).

## 1. In one paragraph

**The journey scores 6.1 of 10; the whole product 6.4.** The product is honest, accessible and well built underneath: 0 axe violations on 67 of 68 screens at both widths (one serious, on the edition review at 375 px), sources and AI marked everywhere, empty states that teach, and a client task list that already looks like GOV.UK. What holds it at 6 is **load on the brain**: the case page is one page of 10,877 words (about 64 phone screens tall), and a family of three meets **72 question pages and 414 answer boxes**. One of those pages has 57 inputs; questions read like database definitions ("Whether the person has ever used another name"). Numbers disagree with each other ("7 to fix", "6 problems", "13 problems", "14 problems" for one pathway), and the next step often waits on someone else. The two lowest journey dimensions are **cognitive load (4.7)** and **forms and data entry (4.8)**; the highest are **accessibility (7.7)** and **speed (7.5)**. The founder's words fit the evidence: it is "really heavy on people's brain", not ugly. So the plan (`03-plan-to-9.md`) cuts and orders first, with a few shared pieces, and polishes last.

## 2. How it was measured

* **Copies:** three isolated copies of `main` fbfb263c7 on fresh databases (`tools/isolated.sh`): `:4480` empty, then the six (Load sample, 19.8 s); `:4481` the finished story (179.8 s); `:4482` the configured checkpoint (115.9 s), for the walk. **Live AI off** (`STUDIO_AI_LIVE` unset), **US$0**, no priced button pressed (P-175). Loaders run by their demo routes, as scaffolding (P-33).
* **Crawl (ground truth, the Lead's ruling of 12:5x IST):** `tools/discover.mjs` follows every link from the menu's pages as each person (author, case officer, representative, Client A) and keeps one example per route pattern: **27 Studio routes, 10 case routes**. Then `tools/crawl.mjs` opens each at **1440 × 900 and 375 × 812**, opens every fold-out, clicks only tabs, and records: the accessibility tree (`ariaSnapshot`, kept in the scratch run), every section with its fields (label, type, hint, required, invalid), actions (filled or not, disabled, icon-only, tooltip, opens a dialog), links, fold-outs (arrow or not), tabs and notices, plus counts (words, words in the first view, type sizes, filled buttons, raw keys, targets under 24 px, sideways scroll, page height) and **axe-core 4.14 (WCAG 2.0-2.2 A and AA)**. Dialogs, question pages and error states were added as targets with their own steps (`tools/extra.json`). **68 screens, states and dialogs, 136 crawled views, 1 axe violation** (`review-edition` at 375 px: a scrollable region without keyboard access). The first push had 53; the Lead asked to finish the inventory, which added the review sub-pages reachable on the data, the case and field dialogs, the permission and error states, and the Approver's views (`tools/finish.json`, `tools/dialogs.json`). Four review sub-pages and six case dialogs need a state none of the three data sets holds: `inventory/INDEX.md` lists each with what it needs.
* **Walk (a new user, by screens):** `tools/walk-step.mjs` drives one step at a time and logs clicks and typing (`tools/walk.log`); `tools/walk-client-answers.js` (qa's BK-1 filler, instrumented) answers the client questionnaire part by part and records each part's inputs and words (`tools/walk-client-parts-*.json`). Release, generate, send and the representative's approvals were walked in full by qa's BK-1 the night before (`qa/bake-baseline-2026-11-11.md`), and are cited, not repeated.
* **Scores:** by hand against the anchors, from the evidence above; one line of evidence per problem in each inventory file. `tools/scores.mjs` computes every weighted score, so no number is typed twice.

## 3. Counted

### 3.1 The journey, task by task

| Task (person) | Screens | Clicks / typed | What a new user meets | Evidence |
|---|---|---|---|---|
| Set up a pathway from the six (author, then two people) | Programs › pathway › Forms › AI field map × 7 forms › To review × each new field | **376 decisions** for Visitor visa (191 accepts, 185 approvals); **84 clicks** for IMM 5257's new definitions alone, no bulk action | Not walkable by one person in a sitting | QA-241; BK-1 §2.5 |
| Finish the one unreleased pathway on the checkpoint (E1's start, P-456) | Programs › Corporate › High-wage position › Forms | 3 clicks, then a wall | The next step reads "Waiting for the immigration expert: Confirm who can apply"; "Find form numbers by rules" attaches nothing ("choose the application page") | `tools/walk.log` w02-w04 |
| Release a pathway (author › Content reviewer › Approver) | pathway › Review and release, ×3 people | 5 person changes on the whole journey, **1 hand-off button** | The draft banner's "Review and release (72)" and the pathway's "Review and release" tab are **two different pages**; my first click went to the wrong one | BK-1 §2.1; walk w05 |
| Open a case (case officer) | Cases › dialog | **6** (1 click, 2 picks, 2 typed, 1 submit) | Picker says "Outside Canada · release 1" with no program; "Visitor visa · release 2" where the pathway says "Release 6" | walk w08-w10 |
| Add spouse and child | 2 dialogs | **6** | Name only; age and biometrics wait (QA-248) | walk w11-w12 |
| **Client A answers for a family of three** (client, 375 px) | Task list + **72 part pages** (total read 59 → 58 → 66 → 72 → 65) | **≥ 253 clicks, ≥ 293 typed** (a lower bound: the filler skips optional lists) | **414 answer boxes, 8,071 words read**; 22 of 72 parts over 5 inputs; the longest has **57 inputs, 4,751 px at 375 px**; "Statutory declaration of common-law union" met 10 times, "Personal details" 8 | `tools/walk-client-parts-*.json`; `shots/walk-client-personal-details-57-inputs@375-full.jpg` |
| Case officer confirms the answers | case page › Agent view, **11 person tabs** | **113 clicks, 78 answers still to confirm** (stopped) | "Confirm section" is per section per person; the first visible ones are disabled with "Nothing answered yet" on a section that reads "12 answered" | walk w20-w22 |
| Generate, send for review, the representative approves | case page › Prepare application › Representative's review | 9 copies (~2.3 s each), 3 filings sent, 3 approved | The review shows **102 facts per form**, each with a 2-4 line source | BK-1 walk/46-54; `shots/representative-review@1440.jpg` |
| **Forms filled and downloaded** (PDF upload channel) | case page | per copy: Generate, Download, **leave the app for Adobe** (hand-fill, Validate, save), upload to IRCC, return and press "Validated copy uploaded back" | Finished story, 4 people: **28 Download buttons** (named only by time, QA-288), **13 "uploaded back" records** | crawl `case-page--officer`; `web/src/runtime/forms.tsx:240-262` |
| Dead ends | | **2 at 1440 px, 3 at 375 px** (BK-1), plus E1's start above | | BK-1 §2.2 |

### 3.2 The product, from the crawl

| Measure | Result | Bar (rubric anchor 8) |
|---|---|---|
| Screens, states and dialogs inventoried | **68**: every router address but 4 review sub-pages (state not in the data; INDEX), 6 empty states, 9 dialogs, 6 error and permission states, Approver views | every route and state |
| axe violations (WCAG 2.0-2.2 A/AA) | **1 on 136 views** (edition review at 375 px, serious); 3 contrast checks "incomplete" on pathway Forms | 0 |
| Fold-outs without an arrow | **0** (BK-2 has landed: one shared fold-out) | 0 |
| Words on the case page / its first view | **10,877** / 351 (1440 px) | first view ≤ ~120 words on a staff page |
| Case page height at 375 px | **51,724 px** (~64 phone screens); field page 56,796 px | a staff page reflows; the whole case is not one page |
| Filled (primary) buttons in one view | up to **29** (AI field map), **12** (new case page), **6** (Programs) | ≤ 1 per panel |
| Type sizes in one page | 3 to **7** (case page 7, client pages 6) | ≤ 3 per panel |
| Raw keys on the main path | AI field map, field page, case page (`case.subject_is_principal_applicant`, `law_society`, `chambre_notaires_quebec`) | 0 |
| Sideways scroll at 375 px | **2 screens**: AI field map 119 px, Program structure 98 px | 0 |
| Targets under 24 px at 375 px | case page 37, Form library 40, client long page 26 (over-counts radios whose label is the target) | 0 |
| Settle time (incl. a 0.5 s pause) | most 1.2-1.5 s; **case page 4.7-4.9 s**; field page 1.9 s | < 1 s; < 400 ms per action |
| Pages called "Review" something | **4**: To review, Review and release (shared), Review and release (pathway tab), Review (the case's check), plus Representative's review | one name per thing |
| Frames | **2**: Studio (menu, Demo, Acting as) and Cases (no menu, own header); browser tab says "Product Studio" on case pages (QA-390) | 1 |
| Release numbering | **2 schemes**: "Release 6" (global) and "Visitor visa · release 2" (per combination) | 1 |
| Error patterns | **2**: dialog errors on the field only (no summary, focus not moved); client pages "Check these answers" summary | 1 |
| Numbers for one thing | Visitor visa's problems: **7, 6, 13, 14** on four screens | 1 |
| Download + re-upload round trips | 1 per PDF-upload copy (13 on the finished story) | only where IRCC requires; guided |

## 4. Findings (UXF: this round's ids; qa's ids where a row exists)

Each finding names the dimensions it moves and the screens. "For qa" marks a fault qa should confirm and log in `qa/BUGS.md` (only qa edits it, P-314).

| Id | Finding | Dimensions | Screens | Existing row |
|---|---|---|---|---|
| **UXF-01** | **The client questionnaire is too long for a family:** 72 part pages, 414 answer boxes, 22 of 72 parts over 5 inputs, one with 57; the same parts recur per person and per parent (common-law declaration ×10) | D3, D4 | client task list, question page | QA-388 (total jumps) |
| **UXF-02** | **Questions are field definitions, not questions:** third person ("Whether the person…") under "Answering for Client A (you)"; part names are form section titles ("Indicate whether you are", "Applicant", "Signature"); part 1 asks the client whether they are the principal applicant, which the case already knows | D3, D4, D7 | client pages; SQR tab | QA-166, QA-253; BIC-01, BIC-02 |
| **UXF-03** | **Free text where a pick-list belongs, and no type check:** "Country or territory of birth" and "Country … from which the person is submitting" accepted a date; country of citizenship is typed | D4, D5, D14 | client question page | **For qa** (a date can reach IRCC's country box) |
| UXF-04 | The part total jumps while answering (59, 58, 66, 72, 65) | D6 | client pages | QA-388 |
| **UXF-05** | **The case page is the whole case on one page:** 10,877 words, 63 sections, 140 buttons, 11 person tabs inside it, 33 "Pass with a reason…", up to 12 filled buttons; no single next step for the officer or the representative | D2, D3, D1 | case page (both roles), new case | — |
| **UXF-06** | **Numbers disagree:** one pathway's problems read 7, 6, 13 and 14; Forms "199 to do" vs "Review 184 proposals"; SQR "1 to do" with "Needs you 0"; "Confirm section" disabled "Nothing answered yet" beside "12 answered" | D6, D14, D3 | pathway tabs, case page | QA-179, QA-224 (same class) |
| UXF-07 | The pathway header (title, a 40-word metadata line, the next-step card, the Sample banner) fills ~450 px before the tabs on every tab | D3, D1 | every pathway tab | — |
| **UXF-08** | **The next step often waits on someone else or leads nowhere:** "Waiting for the immigration expert: Choose the checklist page" (no page control), "Confirm who can apply"; "the immigration expert" is "Content reviewer" in the people list | D2, D8, D9 | pathway Overview, Forms | QA-240; BK-1 §3.6 |
| UXF-09 | One name, several pages: "Review and release" (banner) vs "Review and release" (tab); "Review" (case check) vs "Representative's review" vs "To review"; `/sources` shows the Forms tab | D8, D9 | Studio, case | — |
| UXF-10 | Two areas still look like two products: BK-3 PR 1 (on this commit) gave both one header line and a way back, but the Studio keeps its left menu, Demo and Acting-as, the case area its own header and person select; person changes by a header select: 5 changes, 1 hand-off button | D8, D9 | all | BK-3 PRs 2-4, BK-4 (Bake) |
| UXF-11 | Two release numbers, and a combination named without its program in the case picker | D8, D14 | Open a case, case page | QA-279 |
| UXF-12 | Two error patterns: dialogs show errors on the field only, focus stays on the button, and the hint disappears; client pages have a summary | D5, D8 | Open a case, dialogs | BIC-13 |
| UXF-13 | The AI field-map page shows raw keys, 29 filled buttons, and no bulk action for new definitions; good keyboard keys | D3, D4, D8 | AI field map, field page | QA-190, QA-241 |
| **UXF-14** | **The PDF round trip:** each PDF-upload copy leaves the app for Adobe and comes back as a record; 28 identically named Download buttons for one family | D4, D10 | case page | QA-288; B170 (#1527) |
| UXF-15 | 375 px: staff tables break names mid-letter; 2 screens scroll sideways; many small targets (the way back to the Studio at 375 px is fixed by BK-3 PR 1, seen on this commit) | D11, D10 | case page, structure, AI field map, Form library | BK-1 §2.2 (3), fixed |
| UXF-16 | Demo marks are loud and repeated: "(Sample)", "(simulated)", "Stand-in", orange Sample banners on most blocks and rows | D1, D3 | all | (needed in the demo: consolidate, never remove) |
| UXF-17 | Every live pathway reads "Needs you · 4 of 5 steps to do" beside "Live" | D6, D14, D2 | Programs | — |
| UXF-18 | The representative's review is a 102-row table per form with a long source on every row; approve/send back is not the obvious next step | D2, D3 | Representative's review | — |
| UXF-19 | Slow where it matters: the case page settles in ~4.4 s; confirming sections is slow | D12 | case page | — |
| UXF-20 | Help is thin where strangers are: no "Why we ask" on client questions; system words instead ("Declared: the client's own answer; it fills the forms now") | D7 | client pages | BIC-14 |
| UXF-21 | Duplicate accessible names (20 Download, Correct… buttons) and focus not moved to the first error in dialogs | D10 | case page, dialogs | QA-288, QA-294 |
| UXF-22 | Typography drifts: 6-7 sizes on case and client pages, one-off 13 px, capitals and monospace form titles | D1, D8 | case, pathway tabs | — |
| UXF-23 | Approving new shared fields one page at a time (103 waiting after one form) | D2, D4 | To review (Approver) | QA-241 |
| UXF-24 | Copy cut mid-word in IRCC quotes and in lists; "and 1 more" fold-outs | D1, D14 | pathway Forms, Review | QA-222 (same class) |
| UXF-25 | Error and permission states have no page heading; an unknown review round reads "No such case" on a case that exists; the client's blocked page says "for the case officer" when the representative also works there | D5, D10, D14 | representative's review by round, case not found, case page as client, Studio as case staff | — |

## 5. Scores

### 5.1 The journey, per dimension (23 journey screens, states and dialogs)

| D1 Polish | D2 Next step | D3 Load | D4 Forms | D5 Errors | D6 Feedback | D7 Help | D8 Consistency | D9 Navigation | D10 Access | D11 Responsive | D12 Speed | D13 Empty | D14 Trust | **Weighted** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 6.1 | 6.1 | **4.7** | **4.8** | 6.4 | 6.1 | 6.0 | 5.9 | 6.7 | 7.7 | 5.7 | 7.5 | 7.2 | 6.8 | **6.1** |

Off-journey screens: 6.9. Whole product (journey weighted 3): **6.4**. Empty states alone: 7.8-8.2; the small dialogs 7.6-8.0 (they already follow the bar: one filled button named for its action, hints, required in words). The first push of this round read 6.0 on 21 journey states; the finished inventory adds the Approver's change page and the Open a case error state to the journey.

### 5.2 Journey screens (weighted score; all 14 dimensions in `score-history.md`)

| Screen | Persona | W | Top problems (finding) |
|---|---|---|---|
| Client task list | Client A | **6.6** | Best-looking screen; 72 parts, total jumps, form-title part names (UXF-01, 02, 04) |
| Client question page | Client A | **6.0** | Asks what the case knows; definitions not questions; free-text countries; no "why we ask" (UXF-02, 03, 20) |
| Client question page, longest | Client A | **5.3** | 57 inputs on one page (UXF-01) |
| Cases | Case officer | **7.3** | Second frame; tab title (UXF-10) |
| Open a case | Case officer | **6.8** | Release numbers, error pattern (UXF-11, 12) |
| Open a case, empty submit | Case officer | **6.7** | No summary, focus stays on the button, hint replaced (UXF-12) |
| Add spouse or child | Case officer | **7.0** | Name only (QA-248) |
| Case page | Case officer / Representative | **5.0 / 5.0** | One 10,877-word page; no single next step; round trip; 375 px (UXF-05, 14, 15, 19) |
| Case page, new case | Case officer | **4.8** | 12 filled buttons; confirm by section × person (UXF-05, 06) |
| Case check ("Review") | Case officer | **6.1** | Name clash; 972 words (UXF-09) |
| Representative's review | Representative | **5.7** | 102 facts per form; next step unclear (UXF-18) |
| Programs | Author | **6.8** | Live but "Needs you" (UXF-17) |
| Pathway Overview | Author | **5.6** | Next step waits on others; four problem counts; header (UXF-06, 07, 08) |
| Pathway Forms | Author | **6.0** | 1,716 words, 8 filled buttons (UXF-06, 07) |
| AI field map | Author | **5.6** | Raw keys, 29 filled buttons, no bulk (UXF-13, 23) |
| Smart questionnaire | Author | **6.3** | Field meanings not client words (UXF-02) |
| Review and release (tab) | Author | **6.0** | Name clash; counts; no hand-off (UXF-06, 09, 10) |
| To review | Author / Approver | **6.5 / 6.4** | Six numbers per row; one page per approval (UXF-23) |
| Release (shared) | Approver | **6.2** | 2,807 words of changes; name clash (UXF-09) |
| A library change | Approver | **7.1** | Short and clear; one page per change (UXF-23) |

## 6. What is already good (keep it; build on it)

* **Accessibility floor:** 0 axe violations on 67 of 68 screens, a visible focus ring, real buttons and labels (`web/src/styles/index.css`), and contrast already corrected above the team's own token.
* **The client side's shape is right:** a GOV.UK task list, one part per page, Save and continue, "Save and come back later", "✓ Saved", and a "Check these answers … leave them for now and continue" summary. The fault is content and length, not pattern.
* **Empty states teach** ("Nothing set up in Retail yet … Open Program structure"): 7.8-8.2.
* **Trust is built in:** IRCC's own words quoted, sources and AI marked, Undo on set-up changes, cost shown before any AI run, roles and duties explained.
* **Expert speed exists in places:** keyboard keys J/K/A/N on the AI field map; ⌘K hint on Programs; the shared fold-out (BK-2) gives every fold-out its arrow.

## 7. Challenges (for the Lead; evidence above)

1. **The Bake's exit does not measure load.** E1 and E2 count logins, dead ends and help asked (P-447, P-456). The case page and the client's 72 pages would pass E1 with a patient walker and still fail the founder's test ("heavy on people's brain", "any unknown person"). **Proposal:** add two measured lines to E1, recorded but not blocking in the Bake: (a) the client's part pages and answer boxes for the E1 family (today 72 and 414); (b) the words in the case page's first view, and its filled buttons (today 351 and 4-12). They become the M4 targets in `03-plan-to-9.md`.
2. **The in-browser PDF viewer is not the first fix for the round trip.** B170 (#1527) measured that the team's engine reads 2 of 21 IRCC forms and has no viewer screens. The round trip (UXF-14) is real, but most of its pain is the case page around it: 28 unnamed Download buttons in a 10,877-word page. **Proposal:** a guided "Get the filing pack" step per filing (one place, named copies, what to do in Adobe, then one record) in the next milestone. Revisit the viewer after B170c, measured against this round trip.
3. **Shorten the client questionnaire before polishing it.** Most of UXF-01 is content and engine (parts per parent, per person, sections that mirror form pages), not screens. The fix rows sit on the forms and runtime lanes, with a measured target, not on the screens lane alone.

## 8. Limits of this round (said plainly)

* **Not run:** a screen reader, 200 % zoom, keyboard-only walk (axe and the focus ring only); dark mode; the set-up of a pathway end to end by one person (as BK-1: not walkable today); generate, send and the representative's approvals were cited from BK-1, not re-walked.
* **Counter noise:** "targets under 24 px" counts a radio input whose label is the real target (over-counts client pages); the raw-key search flags "a.m." in times (ignored in the scores); settle times include a fixed 0.5 s pause.
* **Scores are one reader's judgement against written anchors**, with the evidence beside each. The next round should be scored by qa's fresh reader without seeing these scores first, then compared (`04` `ux-audit`).
* Screenshots are capped at 1,800 px (1440) and 2,436 px (375) to keep the repository light; the crawl's full pages are in the scratch run and are rebuilt by re-running `tools/crawl.mjs`.

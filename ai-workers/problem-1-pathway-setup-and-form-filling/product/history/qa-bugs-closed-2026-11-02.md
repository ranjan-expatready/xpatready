# qa findings closed on 2 Nov 2026 (moved word for word from `qa/BUGS.md` and `qa/reports/bugs-open-detail.md`, AGENTS.md rule 8)

## QA-73 — closed 2 Nov 2026 (after-merge 59d2da74)

Closed by the qa lane on main **59d2da74** (fixed by #389, F8): `tests/check_screens_qa_1029_browser.cjs` on a fresh isolated copy: every Item cell on Review and release is 60 characters or fewer or clamped (22 items, 20 with the long definition in the tip, longest 56), no Item shows a system role name or a whole definition, "IMM 1295:" once; `tests/check_review_item_words.ts` 7/7. Six-sample Visitor visa Review tab at 1440/1024/400 px: no sideways scroll, form titles in the Item column, number in the tip (screenshots `qa/reports/2026-11-02-after-merge/qa73-*.png`).

Row as it stood in `qa/BUGS.md`:

| QA-73 | UX · Minor (was Major) | C4.x Review and release tab · PRODUCT §4 | f7cb40d9 | **Retest 832ee5bd (1 Nov): keys gone; each Item is now the calculation's whole definition (up to about 260 characters, e.g. "Sort the person's activity rows by start month; count calendar months …") and one holds a system role name: "… holding the role subject_spouse_or_partner …". Expected: a short name per item, the definition in a tip. "IMM 1295: IMM 1295:" fixed.** Retest deda0e6b: warnings now in words ("Calculated answers · … this calculation is not checked by a test yet", "the immigration expert's sign-off"). Still: the changes table's Item column is the key alone (`person.age_years` …, 1 … | screens | Open |

Row as it stood in `qa/reports/bugs-open-detail.md`:

| QA-73 | UX · Minor (was Major) | C4.x Review and release tab · PRODUCT §4 | **f7cb40d9** | **Retest 832ee5bd (1 Nov): keys gone; each Item is now the calculation's whole definition (up to about 260 characters, e.g. "Sort the person's activity rows by start month; count calendar months …") and one holds a system role name: "… holding the role subject_spouse_or_partner …". Expected: a short name per item, the definition in a tip. "IMM 1295: IMM 1295:" fixed.** **Retest deda0e6b: warnings now in words ("Calculated answers · … this calculation is not checked by a test yet", "the immigration expert's sign-off"). Still: the changes table's Item column is the key alone (`person.age_years` …, 13 rows on Visitor visa); "IMM 1295: IMM 1295: 37 rows".** Before: Combination › Review and release: the changes table names items by key (`case.applying_country_differs_from_citizenship`, `person.age_years` …) with Kind "Derived definition"; warnings read "Derived fields · … Calculation other has no tested helper: recorded, never evaluated", "Calculation count_people_in_role", "role subject_spouse_or_partner"; "Field map IMM 1295 (09-2023) · IMM 1295: IMM 1295: 37 rows"; steps say "SME duty". Fix: item = its meaning ("Age in whole years"); Kind "Calculated answer"; warning "This calculation is not checked by a test yet; it is shown, never used to decide"; role words; one "IMM 1295:"; "the immigration expert's sign-off" | `ws/`ev-review-keys.png, ev-review-warnings.png | screens | Open |

## QA-145 — closed 2 Nov 2026 (after-merge 59d2da74)

Closed by the qa lane on main **59d2da74** (fixed by #378, commits 325b6588 and 8a1c53ec: what Load sample generates is committed, so a load rewrites the same bytes): after five Load sample runs on isolated copies (acceptance C11.3, C11.7, C11.10, C11.13, C2.12) and the Demo menu's Load sample walked in the browser, `git status --porcelain` is empty; no `p1/inventory` or `p2/jobs/studio-fieldmap-*` file is new or changed.

Row as it stood in `qa/BUGS.md`:

| QA-145 | Bug · Minor | C11.7 · AGENTS rule 1 (clean clone), STANDARDS | 61f561d7 (after-merge 10) | Demo › Load sample (the six) writes 9 `prototype/p1/inventory/*.inventory.json` and 12 `prototype/p2/jobs/studio-fieldmap-*.json` files into the repository's own folders. Any clone that loads it is left dirty, and `check_forms_c31_formats.ts` then fails ("every inventoried form has its formats read"). Also: the acceptance packs rewrite tracked `prototype/p2` files (stub-pass runs, canary digest). … | runtime | Open |

Row as it stood in `qa/reports/bugs-open-detail.md`:

| QA-145 | Bug · Minor | C11.7 | **61f561d7** | Steps: an isolated copy; Demo › Load sample (`POST /demo/load {"sample":"six"}`); `git status --ignored` in the clone. Expected: a load writes only to the copy's database and its `var/` folder. Actual: new untracked `prototype/p1/inventory/imm{0008,1294,5406,5532,5562,5604,5645,5646,5710}e.inventory.json` and `prototype/p2/jobs/studio-fieldmap-*.json` (12), and `prototype/p2/jobs/studio-fieldmap-imm5476e.json` modified. `check_forms_c31_formats.ts` then fails 99/100 ("every inventoried form has its formats read"), and passes 100/100 with those 9 files moved aside. Seen again 1 Nov evening (acceptance runs on 56e3dfd5): running the packs also rewrites tracked files: `prototype/p2/runs/stub-pass/studio-fieldmap-imm5257e-p1of5…p5of5-*.json`, `prototype/p2/screening/canary-digest.json` and `prototype/p2/jobs/studio-fieldmap-imm5476e.json`. |

## QA-75 — closed 2 Nov 2026 (after-merge 278eb3e9)

Closed by the qa lane on main **278eb3e9** (fixed by #412): `tests/check_forms_qa75_job_page_browser.cjs` 21/21 on a fresh copy; walked as the author on a copy with the six loaded (AI work › the six's field-map run › Review proposals) at 1440, 1024 and 400 px: the heading names the form ("IMM 5707 (01-2023): AI-proposed field map"), the trail is "Outside Canada › Forms", the basis line is plain ("A saved AI answer, replayed: no model was called now"), "below" has the comparison below it, no status code, no "On this computer", no "prototype-only", no "Sources and forms"; no sideways scroll, no page error (screenshots `qa/reports/2026-11-02-after-merge/qa75-job-*.png`). The builder's listed Minors (Completed vs Done wording, links from the address when no combination) stay with #412's follow-up.

Row as it stood in `qa/BUGS.md`:

| QA-75 | UX · Major | C2.x AI field map job page · PRODUCT §4 | f7cb40d9 | A field-map job page (`/c/:id/jobs/:id`, from AI work) shows status `NEEDS_PERSON`, heading "Form: AI-proposed field map" with no form named, chip "On this computer", "a … | forms | Open |

Row as it stood in `qa/reports/bugs-open-detail.md`:

| QA-75 | UX · Major | C2.x AI field map job page · PRODUCT §4 | **f7cb40d9** | A field-map job page (`/c/:id/jobs/:id`, from AI work) shows status `NEEDS_PERSON`, heading "Form: AI-proposed field map" with no form named, chip "On this computer", "a prototype-only exception to the AI-processing rule; not the product's provider route", says "the comparison with the library below" with nothing below, and its trail starts "Sources and forms" (the tab is now Forms). Fix: "Needs you" with the step to take; name the form; plain basis line; show the comparison or link to it; trail "<combination> › Forms" | `ws/`ev-job.png | forms | Open |

## QA-120 — closed 2 Nov 2026 (main 21d988b7)

Closed by the qa lane on main **21d988b7** (K10, screens-1): `tests/check_x1_tabs_focus_browser.cjs` 48/48 on a fresh isolated copy. Review and release reads "Review and release 1 problem" (name and tip, never "Review and release1"), there is a space before the count in the visible text, both counts use one badge shape, and a tab with no count keeps its plain name. The same words were seen in qa's walk of Visitor visa's tabs ("Review and release 6 problems", "Forms 44 setup items open").

Row as it stood in `qa/BUGS.md`:

| QA-120 | UX · Minor | C4.x combination tabs · STANDARDS (accessibility, WCAG 1.3.1 / 2.5.3) | 832ee5bd (explore X1) | Combination tablist: the Review and release tab's error count sits against the label with no space and no accessible name, so it reads "Review and release1"; the step badges beside it read "Forms 4 setup items open". Expected: "Review and release, 1 problem" (label and tip) and one badge style for counts | screens | Open |

Row as it stood in `qa/reports/bugs-open-detail.md`:

| QA-120 | UX · Minor | C4.x combination tabs · STANDARDS (accessibility, WCAG 1.3.1 / 2.5.3) | 832ee5bd (explore X1) | Combination tablist: the Review and release tab's error count sits against the label with no space and no accessible name, so it reads "Review and release1"; the step badges beside it read "Forms 4 setup items open". Expected: "Review and release, 1 problem" (label and tip) and one badge style for counts | `/tmp/qa/ex.cjs` tab names at 1440, 1024, 400 (report §6); `web/src/pages/combination.tsx:106` | screens | Open |


## QA-121 — closed 2 Nov 2026 (main 21d988b7)

Closed by the qa lane on main **21d988b7** (K10, screens-1): `tests/check_x1_tabs_focus_browser.cjs` 48/48. A `?focus=` whose place is gone (Documents, Questionnaires, Forms held) lands on the tab, says "This was done since you opened it" and drops the key from the address. Places still open (forms:sources, lines, finder) say nothing false.

Row as it stood in `qa/BUGS.md`:

| QA-121 | UX · Minor | C11.10 X1 `?focus=` landing · W1 checklist concept v4 §7 ("done since you opened it") | 832ee5bd (explore X1) | A `?focus=` link whose place is no longer on the page (e.g. `documents:problems` after the problems are fixed, or a wrong key) lands nowhere, says nothing, and the key stays in the address. Expected: land on the tab and say "This was done since you opened it" (the words exist for items still drawn) | screens | Open (seen again 25cefb67 on #247's new landing: `?focus=forms:held` with no held edition leaves focus on the page body, keeps `?focus=` in the address, says nothing; fix in #256 not merged yet) |

Row as it stood in `qa/reports/bugs-open-detail.md`:

| QA-121 | UX · Minor | C11.10 X1 `?focus=` landing · W1 checklist concept v4 §7 ("done since you opened it") | 832ee5bd (explore X1) | A `?focus=` link whose place is no longer on the page (e.g. `documents:problems` after the problems are fixed, or a wrong key) lands nowhere, says nothing, and the key stays in the address. Expected: land on the tab and say "This was done since you opened it" (the words exist for items still drawn) | `?focus=nonsense:key`, `?focus=documents:problems` on a combination without problems: activeElement BODY, address keeps the key (report §6) | screens | Open |

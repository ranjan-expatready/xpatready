# /qa after-merge on S3 Start setup, main f7cb40d9 (PR #76), 29 Oct

**Scope:** what PR #76 merged:
* S3 Start setup:
  * `POST /combinations/start` and `GET /combinations/:id/start-setup`;
  * the finder's cost line, "about US$… · at most US$…";
  * Start setup lands on the Forms tab with one offer;
  * `/new` now shows Page not found.
* DV-bb-1: a finished upload card on the Form library can be dismissed, and stays gone after a reload.
* DV-bb-6b: the demo reset counts person roles someone added and names the 6 built-in ones.
* DV-bb-6c: the Program structure footer no longer shows "(P-95)".

**Where it ran:** isolated copy `qa_s3` on :4477, with the stand-in launcher. The finder suite ran in its own copy through run-suites (qa slot). The shared demo :4400 was not touched. US$0, no model call; the offer was read, and clicked only through the stand-in launcher.

**DV-doc-1** was already done (`2026-10-29-dv-doc-1.md`, 8d974921).

## Verdict
**Ready.** S3 and the three DV-bb fixes work as merged.
* One new finding, **QA-70 (UX · Major)**: the menu links show no focus ring. It dates from the 23 Oct baseline, not from this merge.
* PR #76's CI was green. Every merged suite passes when run as run-suites runs it.

## What works (each from a run on f7cb40d9)
**Start setup (C11.15, C11.10, C11.3):**
* A Not started card offers Start setup. A double click, or Enter on the focused button, makes one setup and lands on the Forms tab. That tab shows exactly one offer, "Find forms with AI (about US$… · at most US$…)", or the ceiling alone when there is no usual cost yet.
* Nothing runs and nothing is spent before the click. Back returns to Immigration programs, and the card no longer offers Start setup.
* A saved answer loads by itself at US$0. A run that attached nothing shows the offer again.
* "Choose the page and find again" accepts canada.ca pages only (400 otherwise).
* Raw launcher text never reaches the page.

**Who may start, and what is refused:**
* Only an author may start: approver, client and officer get 403, nobody gets 401.
* A program that has categories, an unknown name, a name that is not text and a 5000-character name are each refused with a 4xx in plain words. Nothing is created.
* **Two Start setup requests at the same moment make one combination** (one 201, one 200).
* The offer (`GET …/start-setup`) gives 401 to nobody and 403 to a client, under the QA-53 rule. An unknown combination gets 404 in plain words.
* The one guard returns 409 with the same words on the Program structure row, the Immigration programs card and the API, for:
  * a retired name;
  * a name under a retired one;
  * a name under a waiting change.

  Withdraw the change and the name starts.
* The old POST /combinations is held to the same guard.
* `/new` shows Page not found with a way back. The path builder's two endpoints answer 404.
* axe is clean on the landing at 1440 and 1024 px. There is no page error.

**DV fixes:**
* **DV-bb-1:** Dismiss removes only that card, and it stays gone after a reload (`check_forms_s4_library_browser.cjs` 67/67).
* **DV-bb-6b:** a person role added by SQL is counted as "Person roles added here: 1", and the 6 built-in roles are counted apart. After a reset, 0 rows remain and only the 6 built-in roles are left. The dialog says so and never says "0 rows remain" bare (`check_studio_browser.cjs` 49/49).
* **DV-bb-6c:** the Program structure page shows no decision number at 1440 or 1024 px (`check_w1_structure.ts` 81/81).

## Bugs
| Bug | Severity | Lane | Note |
|---|---|---|---|
| **QA-70 (new)** | UX · Major | screens (app shell) | **Menu links have no visible focus.** `styles/index.css` sets `:focus-visible { outline: none }` and the menu `NavLink` adds no ring, so a keyboard user cannot see which menu item has focus (WCAG 2.2 SC 2.4.7). Buttons are fine (`focus-visible:ring`). axe does not catch it. Check: the QA-70 steps in `check_qa_am_s3_1029.cjs` |
| QA-69, QA-48, QA-39, QA-47 | Minor | as before | Not in this merge; not retested |

## Suites replayed on f7cb40d9
| Suite | Result |
|---|---|
| `check_w1_start_setup.ts` | 26/26 |
| `check_w1_start_setup_browser.cjs` | 39/39 |
| `check_w1_programs_s2.cjs` | 87/87 |
| `check_w1_structure.ts` | 81/81 |
| `check_screen01_api.ts` / `_rules.ts` / `_browser.cjs` | 135/135 · 67/67 · 120/120 |
| `check_forms_s4_library_browser.cjs` | 67/67 |
| `check_forms_s4_finder.ts` | 138/138 (run-suites, own copy) |
| `check_s5_slice3_browser.cjs` | 35/35 |
| `check_screen02_slice2.ts` / `_browser.cjs` | 52/52 · 62/62 |
| `check_w1_s1s2_fix.cjs` | 30/30 |
| `check_studio_browser.cjs` (on :4477, not the demo) | 49/49 |
| `check_qa_am_s3_1029.cjs` (new) | 37/39: QA-70 at 1440 and 1024 |
| `check_qa_am_s2_1027.cjs` (qa, updated) | 15/15 up to its retirement point (see below) |

**First-pass reds, all my run order and none of them app faults:**
* I ran 15 suites back to back on one copy. Structure, screen01 and library expect a fresh workspace, and the finder needs `STUDIO_CANADA_FIXTURES=canada-alt`.
* Each passed when run after a reset, or through run-suites.
* `check_studio_browser` failed once at A8 ("stand-in probe") in the first pass and passed 49/49 after a reset.

**My S2 check (27 Oct) needed changes:**
* The page button is now "Add combination" and the empty state's is "Open Program structure". I updated those words.
* The Pathway cards it later clicks became filter chips in round 3, before this merge. The check is retired from that step on; `check_w1_programs_s2.cjs` covers the chips.
* In the S2 check, the keyboard step now stops at the card's next step. Run on, it wrapped into the menu, and that is where QA-70 showed.

## Capabilities (CAPABILITIES.md, f7cb40d9)
* **C11.2:** Partial → **Works**. Find missing forms from a combination now runs.
* **C11.15:** stays **Partial**. Redo with AI and Replace are still not run; everything else in the row now has a run.
* **C11.10, C11.3:** notes and commit refreshed. QA-70 is noted on C11.10.
* M2 is now 18 of 57 Works, with 13 Partial.

## Graph
`graph.mjs --write`: G1 0 · G2 0 · G3 2 · G4 0 · G5 0 · G6 0.
* **G5:** after DV-doc-1, C3.7 and C11.17 said Works with no test naming them. Their steps in `check_qa_am_s4_1028.cjs` and `check_qa_am_r3_1028.cjs` now carry the IDs (labels only).
* **G3** (attachments upload and file routes, used by no page) was there before; it is API-only scaffolding.

## Coverage
Not run in this pass. The S4+S5 coverage rerun waits for a quiet Mac, as the Lead asked.

## Questions for the Lead
1. **QA-70:** should the shell use one shared focus ring for every link, the way buttons have one? The alternative is to remove the global `outline: none`. Severity Major, because keyboard use is a written standard.
2. The C1.8 and QA-69 questions from DV-doc-1 are still open.

## Suggestions
* *Later · Scaffolding:* a keyboard-focus check in the shared browser helpers: Tab through each page and assert a visible ring on every stop. axe does not test this.

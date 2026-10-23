# QA-0 baseline — `/qa milestone` (M2), 23 Oct 2026

Tester: the qa lane (independent; built none of this). Tested: **main 141194dc** (app code unchanged since bea563ba; walking began on d75602b2, same app code). Own copies on ports 4470–4479, databases `xr_studio_qa_*`; :4400 untouched. No paid AI: the spend ledger was unchanged after every AI-touching run. Screenshots and the journey log: `2026-10-23-milestone/`.

## Verdict
**Not ready for the M2 gate.** Screen 01 itself is solid for an author (path builder, duplicates, roles, intake, speed), but **QA-1 (Critical) is reproduced**: the shared Release page published an unsubmitted change carrying an unsigned SME item and recorded the author as submitter. Four suites are red on main, two of them because the builders' checks no longer match Layout v2 (QA-9). Lane copies cannot open the app's pages or downloads (QA-4) or run any AI step (QA-8), so builders' browser and AI checks cannot pass in their own copies.

## What works (seen as a person, checked underneath)
* Empty catalogue says what to do; path builder creates Program › Category in one go; preview "Will be created as …"; a double click creates once (1 combination, 3 audit lines by the author).
* Duplicates: "  VISITORS ", "super-VISA" are recognised ("… exists: choose it"); the existing path offers "Open the existing combination"; Create is off. Five parallel creates of one name → one 201, four 409, one row.
* French and Japanese names kept exactly. Bad JSON, unknown routes → Problem Details.
* Wrong role: the approver sees "Only a configuration author can create combinations" and a disabled button; by direct call 403 "does not hold the author duty". Author cannot approve (button off, 403).
* Intake (J5): IMM 5257 read and attached (0.8 s); same file → "Already in the library"; pre-2023 edition → "Older edition: not used"; an unapproved file → "Held for source verification … not on the approved source list", not added, attached or sent to AI; a fake PDF → "Only PDF files and saved web pages (HTML) can be added"; empty file → "The file is empty."
* Release with duties (J6): submit; approver refused before SME sign-off with the reason; reviewer signs (2 SME sign-offs recorded); approver releases v2 with author/submitter/approver recorded; row Live.
* Back keeps the filter; reload keeps the page (via the proxy, see QA-4); keyboard reaches New combination; 1024 and 400 px no sideways scroll; axe clean on 20 states (19 in the Screen 01 suite + the empty catalogue).
* Speed: warm first view 809 ms (Screen 01 suite 144 ms), filter 113 ms (suite 108 ms); cold first view 3.4 s on a just-started server.

## Bugs (detail in `qa/BUGS.md`)
0 Blocker · 1 Critical · 5 Major · 6 Minor (QA-1 to QA-12; new: QA-4 to QA-12).
| # | Sev. | One line |
|---|---|---|
| QA-1 | Critical | Shared release skips submission and SME sign-off; reproduced by API and in the browser (Release 3, submitter user-A) |
| QA-2 | Major | `check_ai_drafting` still red on main (31 pass, 2 fail, crash; 6 saved runs, expects 4) |
| QA-4 | Major | In any lane copy every page address and file download answers 404 (dot-folder in the path) |
| QA-7 | Major | A 121+ character name: Create silently does nothing; the server's message never shows |
| QA-8 | Major | In a lane copy every AI step, even the free stub, fails in the drafting sandbox (linked folders not readable) |
| QA-9 | Major | Builder checks out of date with Layout v2: Studio suite Pass B, the 100-program fixture and scale check |
| QA-3 | Minor | (carried, not retested) restart script stops every copy |
| QA-5 | Minor | Times stored 5 h 30 early in the database (app reads them back right) |
| QA-6 | Minor | Symbol-only names accepted ("!!!" → key `item`); "???" then a "duplicate" |
| QA-10 | Minor | "Submitted by user-A" instead of the person's name |
| QA-11 | Minor | "Open the existing combination" opens the list, not the combination |
| QA-12 | Minor | Demo menu says "Sample inputs loaded" when a person created the programs |

## Suites rerun on the exact commit (red first)
| Suite | Result | Note |
|---|---|---|
| `check_ai_drafting.ts` | **31 pass · 2 fail · crash** | QA-2 |
| `check_ai_orchestration.ts` | **19 pass · 3 fail** | QA-8 (stub sandbox in a lane copy); run on 4478 via a port-shifted temporary copy |
| `check_studio_browser.cjs` | **17 pass · 2 fail · stops** | A4 download (QA-4), A8 stub (QA-8), Pass B stale (QA-9); run through the proxy with the download step recorded, not awaited |
| `fixtures/scale_100.ts` + `check_catalogue_scale.cjs` | **cannot run** | QA-9 (removed endpoint and table name) |
| `check_screen01_browser.cjs` | 101 / 101 | through the QA-4 proxy |
| `check_screen01_api.ts` | 94 / 94 | asserts the QA-1 behaviour as a pass (line 135) |
| `check_grounding_db.ts` | 29 / 29 | |
| `check_screen01_rules.ts` | 54 / 54 | |
| `check_engine.ts` | 38 / 38 | |
| qa checks (`tests/qa/`) | QA-1, QA-2, QA-4, QA-5 FAIL as expected; journeys 40 pass · 6 fail (five are QA-1, 6, 7, 10, 11; one was my own check reading the sign-off table too early, now read from the database) | |

## Coverage (c8 12.0.0, P-69) — floor set
API servers under c8 while every suite and the journeys ran, plus the offline suites; every file in `api/src` and `engine/` was loaded.
| Area | Lines | Branches | Floor |
|---|---|---|---|
| `api/src` | 93.10% | 74.83% | 93% / 74% |
| `engine/` | 94.15% | 85.78% | 94% / 85% |
Weakest: `engine/ai-run.ts` 52.6% lines (suite crash QA-2 and QA-8), `api/src/studio.ts` 85.4%, branches `sources.ts` 61%, `fill.ts` 63%. Server-only (without the offline suites): engine 92.7% / 81.4%.
**Business rules with no failing test:** BR-5 (no test; expert rule, not code), BR-15 and BR-16 (pass only: labels), BR-7 and BR-9 (fail only: not built). The release rule "submitted and SME-signed before release" has a failing test only on the per-combination path, none on the shared path (hence QA-1).

## Journey score — Screen 01 as author and reviewer (journey-test, simulated personas)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J5, J6 complete |
| Next step obvious | 1 | one next step on row, header and sources |
| Plain words | ½ | "Submitted by user-A" (QA-10), Demo menu (QA-12) |
| Feedback and state | ½ | silent Create on long names (QA-7) |
| Correct data | **0** | QA-1 records a submission that never happened; QA-6 key `item`; QA-5 |
| Error recovery | ½ | reload, back, double click hold; QA-7 leaves no way forward |
| Accessibility and sizes | 1 | axe clean 20 states, keyboard, 1024/400 px (200% zoom and a real screen reader not tested) |
| Speed | 1 | 809 ms / 113 ms warm |
| Visual quality | 1 | screenshots `2026-10-23-milestone/` |
| Trust and sources | 1 | source, edition and held reasons shown; AI-proposed marked in review |
**7.5 / 10 with one 0 → does not pass.** Raise it by fixing QA-1 (correct data → 1), QA-7 (feedback, recovery), QA-10/12 (words). D17 and D20 need an intended user: simulated only, not awarded.

## How I tested, and what I could not
* Person walk in the app's browser pane (:4471) and a visible Playwright browser (`tests/qa/check_qa_m2_journeys.cjs`, `QA_HEADED=1`) on fresh copies.
* **Scaffolding used, labelled:** `tests/qa/page-proxy.mjs` (serves the page only when the server answers 404 to a page address: QA-4); `tests/qa/coverage-preload.mjs`; temporary copies of two builder suites with only the port/database or the blocked download changed (deleted after the run).
* Not tested: C2.4 approved newer edition (needs a manifest change; Screen 01 suite covers it), AI proposal review as a person (C3.2: AI steps fail in this copy, QA-8), C4.x questionnaires, C7.2 Adobe validation (evidence lane), 200% zoom, a real screen reader, QA-3.
* Machine load was 13–19 during the morning runs: sample load took 51–188 s then, 16 s later.

## Questions for the Lead
1. QA-4 and QA-8 make every lane copy unable to run browser or AI checks. Fix in the app (screens: `main.ts`; forms: `p2/guard.ts`), or have `lane.sh` place copies outside a dot-folder and clone packages? Recommended: fix the app (the team's servers may also run from such paths).
2. QA-1's fix changes `check_screen01_api.ts:135`, which today asserts the bypass as a pass. Should the shared page refuse, or submit-and-route each row through the per-combination review? Product choice for you.
3. The x-actor header defaults to the author for unknown or missing values (`core.ts:35`). Simulated people are by design; confirm this stays as Sample until the team's sign-in replaces it.

## Suggestions (never built by qa)
* Make the release-rule test symmetric on both release paths — *Needed for the proof · Scaffolding*.
* Run the browser suites from lane copies in CI-like order after each merge (`/qa after-merge`) so stale checks (QA-9) show the day they break — *Needed for the proof · Scaffolding*.
* Show the person's name wherever an actor id appears (review, releases, activity) — *Later · Capability*.

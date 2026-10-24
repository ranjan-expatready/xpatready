# `/qa after-merge` — Screen 01 closing fix (1cb174a6) on main, 24 Oct 2026

Tester: the qa lane. Tested: **main e742bc59** (app code = the Screen 01 merge 1cb174a6; later commits are Lead documents). Asked for by a session titled "Pre-qualification questions review"; scope from the Lead's note. Own copies on 4470–4479, `xr_studio_qa_*`, each stopped after use; the shared demo :4400 walked **read-only** (GET and page views only). No paid AI: spend ledger unchanged. Machine load 6–42 during the run; browser runs were repeated where load decided the result.

## Verdict
**Screen 01 is ready from the qa side: no Critical, no Major in its own scope.** Of the 11 findings the Lead asked me to retest, all 11 are closed (QA-1, 3, 5, 6, 7, 9, 10, 11, 12, 13, 16), plus QA-18 on measurement. The new forms features on Screen 01 (C1.6, C1.7, C2.7, C2.10, C3.10) work as a person uses them. Still open: QA-14 (Major, a same-name race on the server), QA-4 downloads (Major, lane copies only), QA-8 (Major, AI in lane copies), and five Minors. Before the founder walks :4400, a demo reset would remove QA-19 (old "data boxes" texts and early times).

## Retests (all on e742bc59)
| # | Result | Evidence |
|---|---|---|
| QA-1 Critical | **Closed** | shared release refuses an unsubmitted, unsigned row (`check_qa1` 7/7); J7 in the browser ×3 |
| QA-13 Major | **Closed** | add → remove → add again works (`check_qa13` 6/6) |
| QA-7 Major | **Closed** | "Keep the name under 120 characters." on the field, Create off (J3 ×3) |
| QA-9 Major | **Closed** | Studio browser runs both passes 38/40 (A4 = QA-4, A8 = QA-8); scale fixture + check 17/17 at 393 combinations |
| QA-6, 10, 11, 12 | **Closed** | J3, J6, J2 ×3; Demo menu "programs exist: reset first" |
| QA-3 | **Closed** | restart on :4477 replaced only its own process; a port with no database refused |
| QA-5 | **Closed** for new writes | `check_qa5`; rows stored before the fix still read early (QA-19) |
| QA-16 / C3.10 | **Closed** | no "box" in screen text or messages (`check_qa16`) |
| QA-18 | **Closed** | engine branches 86.22% ≥ 85% |
| QA-4 | Half fixed | pages open; source and filled-PDF downloads still 404 in lane copies |
| QA-14 | Open | 3 of 20 names stored twice when sent 4× at once; `check_grounding_db` 28/29 |
| QA-15, 17, 8 | Open | unchanged (QA-15 is now explained on the field in the new panel) |

## Capabilities walked (headed in the browser pane and Playwright, then headless; `check_qa_s01_channels.cjs` 18/19)
* **C1.6 / C1.7** — row "Filed: PDF only"; the author picks IRCC Portal → "1 draft change", next step "Review and release"; IMM 1295 → Online → "Filing: Mixed: online and PDF" and "Blocks release: IMM 1295 is filed Online, but the library has no approved online version captured from the IRCC Portal: capture its screens, or file it as a PDF upload."; the approver sees both read-only; axe clean; 1024 px fits; **400 px is 13 px too wide (QA-20)**.
* **C2.7** — the panel pre-fills the portal and the line's code; a page holding an answer is refused ("nothing was kept"), no half capture is left; three blank screens → the combination lists "IMM 1295 … Awaiting a second person"; the capturer cannot approve (403); after a second person approves (API — the review screen is Screen 02) the line's message moves on to "no screen map yet: draft and accept it (no AI)".
* **C2.10** — Sources tab "What drafting reads, per form": "PDF first (default)" → "Online screens only", stored on the library form; read-only for the approver; axe clean. Per-field source is Screen 02.
* **M2 journeys J1–J8** (author, reviewer, approver; `check_qa_m2_journeys.cjs`, updated for the fixes): **47/47 headed, 47/47 and 47/47 headless**; warm first view 735–902 ms, filter 30–109 ms.

## New findings (detail in `qa/BUGS.md`)
| # | Type · Sev. | One line | Lane |
|---|---|---|---|
| QA-19 | UX · Minor | :4400 still shows 14 stored "Read 242 data boxes" step texts and pre-fix times 5 h 30 early ("5:23:20 PM" for 22:53); a demo reset clears both (`check_qa19`, GET only) | Lead |
| QA-20 | Bug · Minor | Combination page 413 px wide at 400 px (the Filing · Portal row) | screens |
| QA-21 | Bug · Minor | `check_screen01_browser.cjs:383` reads the online-forms list before it refreshes: 134/135 twice in the qa copy; the behaviour itself is right | screens |
Open totals: **0 Blocker · 0 Critical · 3 Major (QA-4, 8, 14) · 5 Minor (QA-15, 17, 19, 20, 21)**. Closed this run: 12 (`qa/BUGS-CLOSED.md`).

## Read-only walk of :4400 (merged build, migrated)
Catalogue (21 Individual, 8 Corporate; 20 need work, 1 Live), Visitor visa page, Forms library. New words everywhere on the page; "Add 1 form from the library" on Visitor visa no longer a trap (QA-13 fixed in code; not clicked here). Stored step texts and old times as in QA-19.

## Suites on e742bc59 (red first)
| Suite | Result | Note |
|---|---|---|
| `check_grounding_db.ts` | **28/29** | QA-14 race |
| `check_ai_orchestration.ts` | **19/22** | QA-8 |
| `check_studio_browser.cjs` | **38/40** | A4 QA-4, A8 QA-8 |
| `check_screen01_browser.cjs` | **134/135** ×2 | QA-21 (racy check) |
| `check_screen01_api.ts` 130/130 · `check_screen01_channels.ts` 42/42 · `check_screen01_release_race.ts` safe (7 rounds) · `check_screen01_rules.ts` 65/65 · `check_forms_channels.ts` 106/106 · `check_engine.ts` 38/38 · `check_ai_drafting.ts` 48/48 · scale 17/17 | pass | |
| qa checks | QA-1, 5, 13, 16 PASS; QA-4 pages PASS, download FAIL; QA-14 FAIL; F1 probe 25/26 (QA-15); QA-19 FAIL | |

## Coverage (c8 12.0.0)
api/src **95.57% lines / 79.01% branches** · engine **98.82% / 86.22%** — both above the floor; floor raised to api 95/79, engine 98/86. Lowest branches: `engine/ai-run.ts` 62.7%, `api/src/sources.ts` 68.2%, `engine/twin.ts` 83.2%, `capture.ts` 83.9%. Rules with no failing test: BR-5 (expert rule), BR-15/16 pass only; concurrent same-name creation has a failing test (grounding, `check_qa14`) and still fails.

## Journey score — Screen 01 (journey-test, simulated personas)
Task 1 · next step 1 · plain words 1 · feedback and state 1 · correct data ½ (QA-14 duplicate names under concurrency) · error recovery 1 · accessibility and sizes ½ (axe clean; 400 px overflow QA-20; 200% zoom and a screen reader not tested) · speed 1 · visual 1 · trust and sources 1 → **9 / 10, no 0: pass** (QA-0 was 7.5 with a 0). D17 and D20 need the intended user (the Lead's M2 walk with a team content publisher): simulated only, not awarded.

## Could not test
200% zoom; a real screen reader; the Screen 02 review of a capture (approved by API); an approved newer edition (needs a manifest change); AI steps in a lane copy (QA-8).

## Questions for the Lead
1. A demo reset before the founder's or the content publisher's walk on :4400 (clears QA-19)?
2. QA-14 is on the server for any concurrent same-name create (two tabs, two people): fix with a database uniqueness on the normalised name under a parent, as Screen 01's next small FIX?

## Suggestions (never built by qa)
* A database uniqueness for same-parent names (closes QA-14 for good) — *Needed for the proof · Capability*.
* Show a date in "Recent steps" when the step is not from today (QA-17) — *Later · Capability*.

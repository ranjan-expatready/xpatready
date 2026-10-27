# W1-structure-programs — independent review, S2 Immigration programs + fixes (CHECK, 27 Oct)

Reviewer agent (did not build it). Commit `b45ca44` (branch `screens/2026-10-27-s2-programs`; `ac85273` after it changes only `lanes/screens.md`). Scope: `web/src/pages/programs.tsx`, `components/pathway-cards.tsx`, `api/src/programs.ts`, `contracts/programs.ts`, `engine/programs.ts` (`waitsForPerson`), `samples/programs.json`, and on Structure only the Start setup link, the panel footer and New combination's `?leaf=` prefill. S3–S7 are out of scope. Isolated copies :4448 (`xr_studio_screens_rev`) and :4449 (`xr_studio_screens_rev2`); never :4400. AI US$0.
Journey test: `journey-test-reviewer-2026-10-27-s2.md`. **Journey score 9/10 (pass).**

## Verdict: **Ship after fixes**: one Major (a test gap), no Blocker, no Must
Design D is built as agreed, and all seven early-look fixes behave as the Lead's note asks when walked like a person:
* P-112 Pathways; Start setup; no silent start (counts and the `combination` table unchanged until Create).
* Form counts agree with the button; the search is wide; "need you" counts only combinations waiting on a person; the Not started card has an empty bar.
* Both S1 fixes are in. `?leaf=` prefill works for Retail and Corporate.
* The server refuses the approver (403) and an unknown person (401). Four parallel starts on one leaf store 1 row (201 + 3 × 200 existing).
* Reset leaves 0 names, and reading the page creates none.
* axe found 0 violations on every state I opened (including Not ready, AI proposals, List, approver). No sideways scroll at 400, 720 (200 % zoom), 1024 and 1440 px.
The builder's check `check_w1_programs_s2.cjs`, run 3× on my copy (screenshots sent to the scratchpad, not to `screenshots/s2/`), gave 73/74, 73/74 and 74/74. Each run failed a different step, and that step passed in the other runs: this is timing on a busy machine (see m7).

## D1–D20 (1–5; independent reviewer, browser and script evidence)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | §2/§5/§7/§8 present: tabs, Pathway cards and sections, cards with 4-step bar and "Filed:", Cards/List remembered per person, Status menu (6 options), search + other-tab offer, callout, empty/error/read-only. Gaps m3, m4, m5 |
| D2 Data integrity | 5 | Not started click/Enter creates nothing; Create double-click → 1 row; 4 parallel → 1 row; approver 403 on the server; audit "created the configuration row" written once |
| D3 Reuse | 4 | One `PathwayCards` for both pages; need-you rule in one engine function used by catalogue and Structure (counts equal, checked at 1 and 2 waiting). The tooltip text is held twice (`programs.tsx:45`, `pathway-cards.tsx:12`) |
| D4 Rule integrity | 4 | Status, step and need-you are calculated on the server. The bar can contradict the next step (m1) |
| D5 Stability/recovery | 4 | Reload keeps view/filters (URL + per-person storage); Back restores the highlight and focus; error → Retry recovers. Panel height settles by a 500 ms poll (m8) |
| D6 Freshness/governance | 4 | Overdue mark kept on cards and rows; start audited; no release path changed |
| D7 AI trust | 4 | AI steps carry the AI mark ("Review 84 AI proposals", "Draft setup"). The running card could not be observed (replay finishes too fast) |
| D8 Orientation | 5 | Every card/row carries the five-part trail; "No sub-category" never blank; menu, title and breadcrumb say Immigration programs |
| D9 Flow | 4 | One step per card; Start setup → prefilled page in one click. That page still says "Will be created as / Create and add sources" (S3 replaces it) |
| D10 Language/guidance | 4 | Tooltips on tabs, chips, bars, need-you, view switch, status options. No Pathway-meaning tooltip (m3); approver sees "Not started" 3× on one card (m10) |
| D11 Feedback/state | 4 | Toast after adding from library, counts move at once, sr-only "N shown". A stale `p=` says "No combinations … yet" under a header saying 12 (m2) |
| D12 Visual | 4 | Clean design D in team tokens; 3 → 2 → 1 columns; nothing cut at 1024 |
| D13 Accessibility | 4 | axe 0 on 13 states; keyboard: List switch, one-tab-stop rows, ↑/↓/Enter, Back focus. No real screen reader used |
| D14 Team look | 4 | Team segmented control, chips, buttons, empty state, notice |
| D15 Speed | 5 | First view 123 ms; server search 4–103 ms; browser search 137–175 ms (one loaded run 243 ms; not repeated) |
| D16 Testability | 3 | Major M1 (need-you "counts" half never tested; the tooltip step passes when there is nothing to show); mislabelled capability IDs (m6); scale threshold 10× the budget (m7); c8 coverage not run |
| D17 First use | simulated only | No intended user walked it |
| D18 Provenance | 3 | The P-112 names are Sample, but the Programs page never says so (m4); the Corporate callout does |
| D19 End-to-end | Not yet evidenced | One slice of W1 |
| D20 Pain / wow | simulated only | — |

## Findings (Must = blocks Ship; none here)
**M1 Major: the need-you rule has no passing test; only the "not counted" half is tested.** `tests/check_w1_programs_s2.cjs:96-108`. The sample has nothing waiting on a person, so every section reads "none need you". Reading the assertions: if `waitsForPerson` always returned false, every step would still pass, because each one checks only that nothing is counted wrongly, or that the counts on two places are equal (not mutated and run; I edit no app code). Step 108 passes with no chip at all (`!(await chip.count()) || …`). STANDARDS §3.10 and §7 require a passing and a failing test for every rule, and a test that fails when the rule is removed.
* Reproduce: run the check, then `grep "2 need you\|need you" run.log`. Every count is 0.
* Fix: in the check, add the recipe from `check_screen01_browser.cjs:76-93` (a replay on Super visa, a Not ready "Spouse of a student"). Then assert section, Pathway card and Structure card = 2 for Temporary residence, the chip and its tooltip, and that Not ready and AI proposals each count. I walked this state myself: it counts correctly (2, then 1 after Reset + replay only). A pure test of `waitsForPerson` per kind would also do.

**Minor**
* **m1 The bar can say the wrong step.**
  * Not ready "Spouse of a student" (already released, Release 2) shows "Step 4 of 4 · Release" with the 4th segment outlined, beside "See 1 missing".
  * Super visa shows "Step 1 of 4 · Forms" beside "Review 84 AI proposals".
  * Code: `programs.tsx:330-335` over `engine/structure.ts:53-58`. Reproduce: the scratchpad walk, j1-cards.
  * For the Lead: show Not ready as its own label ("Released · not ready: see what is missing"), or put the bar on the step the missing item belongs to.
* **m2 A `p=` from another tab or a removed Pathway shows false empties.** `/?p=corporate.temporary_residence` on Retail gives "0 combinations", and each section reads "No combinations in Temporary residence yet" under "12 combinations". The API accepts any `pathwayKey` (`api/src/programs.ts:204`); the page's fallback is at `programs.tsx:116-119` and `:225`. Fix: treat an unknown `p` as All, or answer 400.
* **m3 The concept's Pathway tooltip (§8, m7) is missing on Programs.** "The outcome the application leads to…" exists only on Structure (`structure.tsx:34`). Add it to the section headers and Pathway cards.
* **m4 Sample names are unmarked on Programs.** AGENTS rule 4 says non-expert values are labelled Sample. Structure says "Names and locations are Sample until the immigration expert confirms" (`structure.tsx:202`); Programs has no such line. Add the same one-line note under the stats line.
* **m5 The List trail wraps instead of being "cut at the start so the end stays visible"** (concept §2 m4, BR-7; `programs.tsx:455-459`). This is a fair choice, but it is not recorded as a deviation in the build notes. Record it or align.
* **m6 Wrong capability IDs in the check.** 30 step names say "C11.4" for Programs-page behaviour, but C11.4 is New combination's path proposal and the Programs page is C11.10 (`qa/CAPABILITIES.md:83,89`). The graph then credits C11.4 with tests and C11.10 with almost none. Rename them to C11.10.
* **m7 The scale step allows 2000 ms against STANDARDS §9's 200 ms** (`check_w1_programs_s2.cjs:262`). The suite is also timing-sensitive:
  * Run 1: footer bottom 904 > 900 at 1440×900.
  * Run 2: the fix-3 step read `main` before the prefill rendered.
  * Use the §9 budget, and wait on the prefilled preview line rather than on text.
* **m8 The panel height is set by a never-ending poll** (`setInterval(run, 500)`, `structure.tsx:225`). Right after opening, the footer can sit a few pixels off screen (run 1: 904/900). A layout that needs no poll would be steadier, e.g. sticky with `max-height: calc(100dvh - top)`.
* **m9 A wrong `/new?leaf=` gives empty pickers with no message** (`new-combination.tsx:50-61`): an unknown key, or a Corporate key without `pw=CORPORATE`. In-app links always pass `pw`. Low priority, since S3 replaces the page.
* **m10 The approver's Not started card says "Not started" three times**: chip, bar label, and step slot (`programs.tsx:349`). Drop the step-slot text, or say "A configuration author starts it".

## Graph (P-86) and retrofit
`graph.mjs`: G1 0 · G2 0 · G3 1 (the earlier `GET /attachments/:id/file`) · G4 0 · G5 0 · G6 1 (the earlier `badge.tsx`). Nothing new from S2: the page `/` is visited by browser tests. Every element serves C11.10/C11.3, except "Load sample", which is scaffolding and stays in the Demo menu. The retrofit mapping is in build-notes "Team-name mapping".

## What I could not check
* The AI-running card (pulse, "View AI progress"; concept §7 also draws a Stop link, which belongs to W1-07/C11.8, Not built). A replay finishes before the page reloads. The code path was read only (`programs.tsx:330-335`).
* A real screen reader; c8 coverage; an intended user's unaided walk (D17, D20).
* For the Lead: `PRODUCT.md` §3–§4 still say "Programs" and "Pathway: Individual" (P-115/P-104 not yet written there). That is a Lead file, not a builder finding.
Reviewer evidence (not committed): screenshots and logs in `/private/tmp/claude-501/-Users-ranjansingh-Desktop-Xpatready--claude-worktrees-bold-carson-0b4a7e/2efda732-528e-4734-8e13-0ba4f617279a/scratchpad/` (`walk-shots/`, `walk1.log`, `walk2.log`, `probe2.log`, `run1-3.log`).

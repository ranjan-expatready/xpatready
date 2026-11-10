# Gate A walk of C7.3 (the answer sheet's "Entered in the portal" tick, P-401), main 7e32ee210, 9 Nov 2026, ~23:15–23:20 IST (17:45–17:50 UTC)

Playwright with the image's Chrome, through the suites' own helper (`acceptance/lib/browser.ts`), headless, one pass; 1024 px for the walk, the same sheet also at 400 and 1440 px. Fresh isolated copy `qa_c73a` on :4471 (ttl 60; stopped by the same command: "database and files removed"). Main 7e32ee210 holds #1430 (b56cdbe39) and #1435. The walk script (`scripts/walk_c73.mts`) acts only through clicks and keys on what the page shows. It reads the API only to compare the page with the server (`GET /answer-sheet`, `GET /prepare`), and makes one write probe after the walk (10b). Console output: `walk/walk-log.txt`.

## Data, through the product's screens
* Author (user-A), **Demo › Load the configured checkpoint… › Load the configured checkpoint**: "Configured checkpoint loaded in 173.6 s" (`walk/00-checkpoint-loaded.png`; `scripts/walk_load.mts`).
* Setup, not under test (`scripts/walk_c73_setup.mts`: c78's setup steps, plus the Online line taken from the release, `lib/c73.ts`'s rule): a one-person Visitor visa case, "Sample Client W". The release's own Online line is IMM 5257 ("release line": no channel move needed). Every fact was answered and confirmed, and the other forms signed or validated. The representative reviewed, and the 8 open warnings were passed. Printed (`walk/setup-log.txt`): `item_state to_do warnings_before 8 open_after 0 blocks_after 0`. **No section was ticked by the setup.**

## C7.3, as the case officer (user-O), 1024 px
1. Case page: header "Readiness: Ready · 100%". The Online line reads "Open answer sheet: IMM 5257 for Sample Client W · To do" (`00`).
2. Click → "IMM 5257 answer sheet · Sample Client W": "To do · Every answer is ready to enter in the portal; 9 of 9 sections still to tick "Entered in the portal": Personal details, … Signature.", and below it "9 of 9 sections still to tick "Entered in the portal"" (`01`). Each of the 9 sections has an **Entered in the portal** button. **QA-323's point is gone: the words name a control the page now has.**
3. Mouse click on "Entered in the portal" in section 1, Personal details. The pill reads "Entered by Case officer (Sample), 9 Nov, 17:49" and the count is 8 of 9. The server holds `entered.by = user-O` (`02`).
4. "Take the tick off" → the reason box. Submitted empty: "Say why the tick comes off." on the box, and the tick stays (server unchanged) (`03`). With the reason "Typed the wrong passport number into the portal; re-entering (Sample, qa walk)" and Enter: "Tick taken off by Case officer (Sample), 9 Nov, 17:49. Reason: …", the count is back to 9 of 9, and the server has no tick (`04`). Two toasts confirm each change.
5. Section 1 ticked again **by keyboard** (focus on the button, Enter), and sections 2–9 by mouse. Result: "Every section is ticked "Entered in the portal"" and the item reads "**Done** · Every section is entered in the portal, with every answer confirmed and current." The server holds 9 ticks (`05`).
6. No sideways scroll at 1024, 400 or 1440 px (`06` 400 px: the tables become stacked cards; `07` 1440 px).
7. Wrong role by URL: the client (user-P) opening `/cases/<id>/sheet/<item>` reads "This page is for the case officer. The answer sheet is what the firm types into the IRCC account; a client never sees it. Back to the case", with no tick button (`08`).
8. Back on the case page (by URL: the walk script's link pattern picked the "Cases" breadcrumb, a script slip, not the product's), the Online line reads "· **Done**". The header is unchanged ("Readiness: Ready · 100%"), so the ticks neither raise nor lower readiness (`09`).

## Next capability's first step: C8.2 "Record the submission" (gate A: reached, and usable)
9. Ready to file: the officer presses **Ready to file**, and the filing reads Ready to file (`10`, `11`). **"Record the submission…"** is enabled. Click → the dialog "Record the submission" (`12`). Typed the application number "V300000777", our reference "SAMPLE-QA-C73" and the UCI "1111-2222" (submitted on: today, prefilled), then **Record the submission**. Underneath (`GET /prepare`): filing `status: submitted`, portal APR_PORTAL, `application_number V300000777`, `prepared_by` the case officer and `reviewed_by` the representative (`13`).
10. The answer sheet after the record: no "Entered in the portal" or "Take the tick off" control, and "Every section is ticked" kept (`14`). **10b (API probe, after the walk):** an untick on section 1 → **409** `problems/recorded`: "This application is recorded as submitted to IRCC, so it is read-only: the tick "Entered in the portal" on IMM 5257 is not changed…".
11. Page errors during the walk: none.

## Checked and not a finding
* The sheet's section 1 lists start and end dates beside "Citizen" for the **applying-from** country (Q9 B), the pattern #1435 gated for the current country (Q7). The form's own script (`validateCWA`, read from `official-sources/ircc/forms/imm5257e.pdf`'s XFA with pypdf) has that rule **commented out**: "//negative case CWA always requires from and to date. /*if (!oFrom.isNull && !oTo.isNull){ … oStatus.rawValue = null; }". So these dates are not cleared, and #1435's gate set (Other only for Q9 B) is consistent with the script. Whether IRCC's online portal accepts dates beside Citizen is not knowable here (W6, the live portal order, is parked).

## Not covered by this walk
* R4 (a changed answer clears the tick, with "was / now") was not walked by qa: changing a fact after review would have broken the path to the next step. It is covered by pack steps C7.3-31 (API) and C7.3-48 (screen), both green below.
* A stale second tab (R3): pack steps C7.3-22, -25, -45 and -46.
* 200% zoom, an axe scan (the PR's reviewer reported 0 violations in six states), a headed pass, and the shared demo :4400 (none in this cloud copy).

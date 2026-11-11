# BK-3 One frame, PR 2 (release ↔ case links): independent review

PR #1525 · commit **47595217af66f58dfcde82b7c695b2e61b70fb02** (branch claude/awesome-keller-i4snlb) · diff `git diff origin/main...47595217a` on base fbfb263c7 (PR 1, #1519, merged) · the reviewer did not build it · 11 Nov 2026.
A shared part (links between existing screens), so no concept.md. Judged against the tech lead's ruling and Done when, qa baseline 11 Nov §2.2 dead end 2, STANDARDS, EXPERIENCE, the code and the running app.
**Copies:** rv_bk3l on :4481 (links test, then a fresh copy for my walk), rv_bk3f on :4482 (frame test), rv_mut on :4483 (mutation check from a scratch worktree, see below). Live AI off, US$0. All stopped; test-copies.sh shows 0. Suite screenshots went to the scratchpad; the repo gets only the three `review-pr2-*` PNGs linked here.

## Done when, point by point
- **(a) Met.** Visitor visa (configured checkpoint) shows "Open a case on Release 6" under the facts line ("In Release 6 · …"). One click, or Tab + Enter, lands on `/cases?open=<id>` as the case officer with that combination chosen. Opening the case lands on it. API check: RV-1440 and RV-375 exist once each, on that combination, pinned to Release 6.
- **(b) Met.** The case's "Release 6 →" pill (name "Release 6: open its set-up in Product Studio", visible focus ring, 24 px) opens `/c/<id>` as the Studio person (user-A), by click and by Enter. Browser Back returns to the case as the case officer.
- **No release, no button: Met.** High-wage position, reached through the Studio (Corporate and employers → Resume setup), reads "Not released yet" and has no button at 1440 or 375. `/cases?open=<that id>` says "That combination has no release a case can open on", so it never swaps silently. Retired is hidden by `!row.retired` (combination.tsx:116); I checked the code only, because no checkpoint combination is retired.
- **Browser test at 1440 and 375 with axe: Met.** check_bk3_links_browser.cjs passed **47/47** on a fresh :4481. axe found 0 violations on the button, the dialog and the pill at both widths.
- **BK-3 walk and selected suites: Met for what I ran, the rest unverified.**
  - check_bk3_frame_browser.cjs: **431/431** on a fresh :4482, including the new "Product Studio → acts as the Studio person" step.
  - check_bk3_frame.ts (static): 128/128. `tsc --noEmit` on web: clean. `graph.mjs --check`: G1 0, G2 0.
  - select-suites picks 157 lines for this diff, both bk3 browser suites among them. I did not run the rest; the builder's full run and the ready check must be green.

## The builder's extra change, challenged
- **leaveCasesAsStudio / casesLeaving (frame.tsx:20-25, cases.tsx:59-60): justified and proven.**
  - I rebuilt the web from a scratch worktree with only the `!casesLeaving() &&` guard removed (:4483). Product Studio → on a case page then landed as **user-O on "This page is for the configuration people"**. check_bk3_links_browser failed at "acting as the Studio person there" (user-O).
  - The same steps on the PR's code: user-A, no refusal. So the tests fail when the rule is removed, and PR 1 did ship this defect.
  - The module-level flag is safe as used. Every caller navigates out of /cases, and RuntimeApp's mount effect clears it before the person check runs (effects run in order).
- **data-asked-off: right.** An unknown or never-released id gets a warning, and the select falls back to the first startable combination with that notice above it. That is said, not silent. "Open case" stays usable for the other choice.
- **Modified clicks on the pill change nothing: acceptable, with a consequence.** A Ctrl-click opens the Studio in a new tab as the case officer, i.e. the refusal page with "Open your cases". The current tab is kept, and the actor store has no cross-tab sync (lib/api.ts:10-11). See m1, though: the opposite link does not follow the same rule.

## The release-number question (dialog "release 2" vs button/pill "Release 6")
**Not a Major for this PR. Follow-up row (Should).**
- Walk: the button says "Open a case on Release 6", the dialog chosen line says "Visitor visa · release 2" ([dialog](screenshots/review-pr2-dialog-release-2-1440.png)), and the case pill says "Release 6".
- Why not a Major:
  - The mismatch is already on main (dialog vs case pill, QA-38's per-combination `version`).
  - This PR does not change the dialog's words.
  - The outcome is right: the case is pinned to Release 6, as the button promised.
- It does now sit one click apart on the PR's own main path. It cost this walk half a point for plain words.
- Fix (api/src/runtime.ts:351-360 plus the option text in cases.tsx:161):
  - `openable` includes `packVersion` and returns `release: r.packVersion?.version ?? r.version`.
  - The dialog shows `Release N` (releaseLabel), the PRODUCT §4 word.
- If the builder has room, it can ride in this PR. Otherwise it needs a backlog row.

## D1-D20 (1-5; shared part, most untouched)
D1 4: all Done-when points met · D2 4: one case per submit (idempotency key, unchanged), server checks unchanged (openable/createCase staff-only, startable) · D3 n/a · D4 n/a · D5 3: reload after Cancel stays closed, but Back after opening reopens the dialog (m2) and a modified click on the button flips the Studio tab (m1) · D6 n/a · D7 n/a · D8 4: the case says its release and links to its source · D9 4: dead end 2 closed both ways, 1 click each · D10 3: release 6 vs release 2 (follow-up above) · D11 4: "Case opened" toast, preselected dialog · D12 4: secondary sm button, info pill with arrow, team components · D13 4: axe 0, keyboard path, ring visible, no sideways scroll at 375/512/1024/1440 · D14 4 · D15 4: dialog open ~0.4-0.5 s, no per-row requests added · D16 4: new suite, mutation-proven guard; the "released but not ready" branch is untested (m3) · D17 simulated only · D18 4: the case's pill names its frozen release and opens it · D19 4: configure → case → back closes without the Demo menu · D20 simulated only.

## BIC (EXPERIENCE §6; links only)
BIC-01 to 13, 15 to 17, 19: **N/A** (no questions, documents, forms, reviews or new type).
BIC-14 **Met**: the pill has a title (frozen when, opens set-up) and a full accessible name.
BIC-18 **Met**: the dialog shows a skeleton while combinations load, then the chosen one or the asked-off notice.
BIC-20 **Met**: keyboard path Tab → Enter on both links, visible focus, no sideways scroll at 375/512/1024 (my walk; builder's pr2-*-1440/375).

## Blockers / Majors
None.

## Minors (Should: fix, or list in the PR with a follow-up row)
- **m1:** Ctrl/Cmd-click (new tab) on "Open a case on Release N" switches the **current Studio tab** to the case officer. The author's page becomes "This page is for the configuration people" ([screenshot](screenshots/review-pr2-ctrlclick-open-case-studio-tab-1440.png)).
  - Cause: combination.tsx:116 `onClick={actAsCaseStaff}`, and cases.tsx:45 ignores modifier keys, unlike leaveCasesAsStudio.
  - Fix: the same guard (`e.button !== 0 || meta/ctrl/shift/alt` → return) and a test step. Moving actAsCaseStaff beside leaveCasesAsStudio in frame.tsx would also stop a Studio page from importing runtime/cases.
- **m2:** after "Open case", browser Back goes to `/cases?open=<id>` and reopens a blank Open a case dialog, which invites a second case ([screenshot](screenshots/review-pr2-back-after-open-1440.png)).
  - Fix: when the dialog came from `?open`, navigate to the new case with `replace` (or drop `open` first), as Cancel already does.
- **m3:** the "not ready for new cases" notice (cases.tsx:158, a released but not startable combination) has no test. The suite reaches only the no-release branch. Fix: add one address check, or list it.
- **Pre-existing, not this PR (PR 1's person switch, recorded until BK-4):** browser Back from Cases to the Studio lands on the refusal as the case officer, both after PR 1's "Cases →" and after this button. The refusal offers "Open your cases". Worth a line in the BK-4 row.

## Not checked
The other selected suites (the builder's run and CI). A retired combination in the browser. A real screen reader. Dark theme. An intended user's unaided walk (D17 and D20 stay with the founder).

Journey test: `journey-test-reviewer-pr2-2026-11-11.md`, **8½/10** (pass, no 0).

**Verdict: Approve** (commit 47595217af66f58dfcde82b7c695b2e61b70fb02; no open Blocker or Major). m1-m3 and the release-number follow-up are Shoulds: fix them, or list them in the PR with a follow-up row.

## Re-review (diff only): d2204b626 (`git diff 47595217a..d2204b626 -- '*.tsx' '*.cjs'`)
11 Nov 2026 · same reviewer. **Copy:** rv_bk3r on :4484 (fresh each time). Live AI was off (US$0). Stopped afterwards; test-copies.sh shows 0.
**What changed:** 3 code and test files, +35/−5, still web/src plus one test. My review, the journey report and the three screenshots were committed unchanged.
- **m1: closed.**
  - `plainClick` (frame.tsx) is now the one test for "follows the link in this tab". Both `leaveCasesAsStudio` and `actAsCaseStaff(e)` (cases.tsx:45) use it. A Ctrl/Cmd-click on "Open a case on Release N" opens the new tab and leaves the Studio tab as the author.
  - The new suite step asserts exactly that. At 47595217a my walk saw that tab turn into the refusal, so the step would have failed there.
  - Keyboard Enter still switches the person: Enter fires a click with button 0 and no modifiers.
- **m2: closed.**
  - When the dialog came from `?open`, `onDone` first replaces the list's address with `/cases`, then pushes the case.
  - My direct walk: Studio → Open a case → Enter → case RR-1 (once, by API) → browser Back lands on `/cases` with no dialog.
  - The suite's Back-twice step (Studio → case → list, no `?open`, no dialog) passes at both widths. Opening from the list's own button is unchanged: no `open`, so there is no replace.
- **m3: closed.**
  - The suite answers `/runtime/openable` with `startable:false` for the released combination (a client-side route).
  - It asserts the notice `"<combination>" is not ready for new cases` and that the select does not offer it.
  - A test-side stand-in is enough here: the server's startable check and its 409 are unchanged and covered by their own suites. This step only proves the dialog's branch.
- **No new findings.** Two navigations in one `onDone` are safe: both history operations run in order before the next render.
- **Evidence:**
  - check_bk3_links_browser.cjs **56/56 twice** on a fresh :4484.
  - check_bk3_frame.ts 128/128. Web `tsc` is clean.
  - "Product Studio →" still opens the Studio as the author, not the refusal.
  - I did not re-run check_bk3_frame_browser. The only frame.tsx change is extracting `plainClick`, with the same logic. The links suite and my walk exercise both callers.
- **Still open, as before:** the release-number follow-up ("release 2" in the dialog vs "Release 6"), a Should with a follow-up row. Also the PR 1 browser-Back-to-Studio note, for BK-4. Neither blocks.
- **Not checked:** the selected suites beyond these (the builder's run and the ready check).

**Verdict: Approve** (head d2204b626205aef616598fdc4df3302db31e1cec; no open Blocker or Major).

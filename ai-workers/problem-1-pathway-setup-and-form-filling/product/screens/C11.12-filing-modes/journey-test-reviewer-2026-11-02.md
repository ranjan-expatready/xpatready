# C11.12 PR 1: journey test (reviewer role, 2 Nov)

**Commit:** `e4cc6008` (code identical to `a6d0af44`).
**Copies:** :4441 (`xr_studio_rev1112`) and :4442; never :4400. US$0, live AI off.
**Browser:** headless Chromium (Playwright with axe WCAG 2.2 A/AA), script kept in the reviewer's scratchpad. The screen part of PR 1 is only the editor keeping `filingMode`; the Filing column and the preview panel are PR 3.

## Journeys (persona: configuration author unless noted)
1. **Main path.** Load the Demo sample, open Visitor visa › Forms › "Who can be in this application", Show and edit, Edit, set Child's most to 3, Save. Expected: the save keeps every filing mode. Result: **held** (principal, spouse and child `files_own`).
2. **Undo** after the main path. Expected: the earlier list returns with its modes. Result: **held**.
3. **Alternate path.** Fill from the guide (Rules only, US$0), then Use these lines, then Save. Expected: the guide proposes people only and the modes stay. Result: **held**; the Representative has no mode.
4. **Add person** (Sponsor) and **untick Applicant** on Child, then Save. Expected: Sponsor saved with no mode; Child not an applicant with its mode cleared; the spouse is unchanged. Result: **held**. The release check then lists "Filing for Child" as a warning.
5. **Wrong role.** The content reviewer sends PATCH people. Expected: 403. Result: **held**.
6. **Two tabs.** Two saves at the same version. Expected: one 200 and one 409 naming who saved. Result: **held** ("Configuration author changed who can be in this application at 06:02 UTC. Reload their version, then make your change again.").
7. **Across the screen boundary** (author, then reviewer and approver, then case officer). Set Child Declared only by API (warning shown), release, open a Visitor visa case, open Prepare. Expected: the case opens, or the release is refused until PR 2. Result: **failed**, Prepare answers 500 (`filing_mode_check`). This is review M1.
8. **Recovery and preview.** Untick Child, save, tick it again, save; read "What a case gets". Expected: the preview matches what a case gets. Result: **failed**. The preview says "2 filings in one submission", but a case gives the child its own filing (fallback table). This is review M2.
9. **Bad input** (API): unknown mode → 400 in words. Principal Declared only → 400. Representative Declared only → 400. Declared only with applicant ticked → 400. Result: **held** (acceptance test and probe).

Not walked: a real screen reader, 200 % zoom, a full keyboard-only run, and an intended user's unaided walk (D17 and D20 stay with the founder).

## Automated replay
22/22 checks pass:
- axe is clean on the folded, editing, guide-proposal, unticked and saved states, and at 400 and 1024 px.
- No sideways scroll at 400 or 1024 px.
- No console or page errors.

Also: `check_c1112_modes.ts` 32/32, and `C11.12.test.ts` 18/19 (line 90 fails, as on main).

## Data underneath
After each save, `GET …/workspace?tab=questionnaires` shows only the change made, and one audit row per save (unchanged code). Release 3 was stored with the child `declared_only`. On the case, `/filings` returned `mode:"declared_only"` filings with applicants `"applying"`, which breaks the contract (M1).

## Break-it findings
| Severity | Finding | Where |
|---|---|---|
| Major | A releasable configuration crashes Prepare (500) | `case-prepare.ts:74`, `case-filings.ts:30`, no release-check line |
| Major | The preview drops a line with no mode, though the case gives it a filing | `filing-modes.ts:302` |
| Minor | `filing` and `filingMode` that disagree are accepted silently | `filing-modes.ts:204` |
| Minor | Warnings send the user to a Filing control that PR 3 adds | `filing-modes.ts:242`, `people.ts:359` |

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–4 |
| Next step obvious | ½ | The "Filing for Child" warning names a control not yet on the screen |
| Plain words | 1 | Warnings and errors in words, with Guide 5256 quoted |
| Feedback and state | 1 | Save toast, Undo, 409 naming who saved |
| Correct data | ½ | Modes kept by the editor; the preview is wrong for unmoded lines (journey 8) |
| Error recovery | ½ | Undo and 409 hold; a releasable state ends in a 500 (journey 7) |
| Accessibility and screen sizes | 1 | axe clean; 400, 1024 and 1440 px |
| Speed | 1 | Saves and reads well under 1 s on the copy |
| Visual quality | ½ | Unchanged screen; the new modes are not visible until PR 3 |
| Trust and sources | ½ | Sample labelled and fees never CAD 0; the preview states a wrong count with confidence |
| **Total** | **7.5 / 10** | Below the pass of 8; no criterion at 0 |

**Fixes that raise it, most valuable first:**
1. Refuse the release, or map the modes, so Prepare never gives a 500 (M1).
2. Make the preview use the case's fallback for unmoded lines, or name them (M2).
3. Refuse a body whose `filing` and `filingMode` disagree.

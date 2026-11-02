# Journey test, reviewer: K11 (C11.15 Minors), commit a6a94750, 2 Nov

**Copy:** `forms_k11r` on :4454. The demo sample was loaded. Study permit had a Rules find and IMM 5707 attached. US$0: rules-only finds; the live path used only the builder's check with the fake launcher.

**How:** headless Chrome driven like a person: visible controls, keyboard and clicks. The reviewer's script is in the session scratchpad and is not committed. The builder's `check_forms_k11_minors_browser.cjs` was replayed twice: 20/20 on this commit, and 10/20 on main's sources as the before state.

## Journeys (persona: configuration author, content publisher, user-A, unless noted)
1. **Choose how a form is filed (main).** Forms tab → IMM 5707's channel choice.
   * The options read "Online (typed in by hand for now)", PDF upload, Paper, and "Not needed (IRCC does not accept it)".
   * Picking Online saves the line. The cell then shows "Needs the browser extension (later wave)" (P-107 wording) and "Answer sheet in portal order (P-113)".
   * Held. A decision number is still shown, but that is older than this PR.
2. **Find again, compare the ways, back out (keyboard only).** Tab to Find again, Enter, the dialog opens.
   * Saved, Rules only and Live each change the description. Rules only reads "… No AI, nothing is attached, US$0." The Sample note stays in every mode.
   * After Escape, focus is on Find again. Held.
3. **Redo with AI from a line's menu, then back out (alternate).** "Actions for IMM 5707", then "Redo with AI", then the dialog "Redo with AI: IMM 5707".
   * Escape puts focus on **BODY**, and so does Cancel with the mouse. **Not held** (review m1).
4. **Start a Rules-only find (US$0) and watch it end.**
   * The plan says "Cost: US$0 (no AI call)." Start closes the dialog.
   * Find again is disabled while the find runs. Focus goes to BODY (same as on main, outside QA-110).
   * When the find ends, the strip reads "Last find today at 10:39 a.m. · rules only, US$0." with one full stop, and the lines refresh.
   * Held.
5. **A find the tab did not start ends after a reload (recovery, QA-111).** Builder's check: the run card's poll is held on RUNNING, and the latest read sees the end.
   * IMM 1294 appears without a reload. The strip no longer says "running now".
   * Held. On main the same step fails.
6. **Forms attached but not yet lines (Visitor visa).** The rows read "IMM 5257 / IMM 5257 (09-2023)" and "IMM 5707 / IMM 5707 (01-2023)". No file names are shown. Held.
7. **Wrong role (approver, user-B).** No Find again and no channel choice. Starting a find through the API as the approver returns 403. Held.
8. **Screen sizes.**
   * At 1024 px, 200 % zoom (512 css px) and 400 px, the Forms tab has no sideways scroll (scrollWidth = clientWidth).
   * The dialog fits inside the viewport: 16–496 of 512 px at 200 %.
   * Held.

## Data underneath
* The quotes stay as stored. `irccWords` is used only for output (`api/src/workspace.ts:84`, web views), so nothing is written.
* One find per Start. From Start to settled, each Forms-tab read ran 2×, the same as main. No per-row requests.

## Break-it (15 min)
* `irccWords` probes:
  * `"Version 1 .5"` → `"1.5"`
  * `"Section 4\n. next"` → joined into one line
  * `"\" , \""` → loses the space before the comma
  * The space rule is wider than the link-text reason (review m3). Display only. No IRCC quote seen is hurt.
* The QA-107 page step passes on the unfixed copy as well, because the fixture has no link text (review m2).
* Side effect of the change: `check_forms_demo.ts` fails at this commit. It looked up a row by its file name (review M1, Major).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J2, J4–J6 complete; the builder's check is 20/20 |
| Next step obvious | 1 | One Find again; the description says what each way does |
| Plain words | ½ | The new words are clear, but "(P-113)" is still on the Online line (`forms.tsx:143`, older than this PR) |
| Feedback and state | 1 | The strip and lines refresh when a find ends (J4, J5) |
| Correct data | 1 | The stored quotes are unchanged; one run per Start |
| Error recovery | 1 | Escape and Cancel; a reload mid-run still refreshes |
| Accessibility and screen sizes | ½ | axe clean, no sideways scroll at 1024 / 200 % / 400; but focus is lost after Redo from the menu (J3) and after Start (J4) |
| Speed | 1 | Rules find ends in under 3 s; no per-row requests |
| Visual quality | 1 | Dialog and tab in team tokens; layout unchanged (screens `2-dialog.png`, `4-1024-z2.png`) |
| Trust and sources | 1 | The Sample note stays in every mode; US$0 stated; AI steps marked |

**9 / 10, pass** (no criterion at 0). To raise it:
* Return focus to the menu trigger on the Redo path (m1).
* Drop "(P-113)" from the Online line. This is a follow-up row, not this PR.

## Could not test
* A real screen reader.
* A live AI find (US$0 rule).
* An intended user's unaided walk. D17 and D20 stay with the founder.

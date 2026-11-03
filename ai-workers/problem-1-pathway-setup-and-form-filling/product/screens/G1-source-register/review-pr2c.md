# G1 (C5.4) PR 2c (#627): review at head **201e67c3**

Reviewer (did not build it), 3 Nov 2026. This is a full review of `origin/main...201e67c3` (the three commits 989aba7c, 5a7729d5 and 201e67c3; 8 code and record files). The head moved twice while I worked, and every finding below was re-checked on 201e67c3.
Measured against: concept v2 §4 ("The panel also opens from …") and m3, board 2 ("In the rule dialog"), build-notes "PR 2c", and STANDARDS and EXPERIENCE [M].
I used my own worktree and an isolated copy on :4473 (never :4400), then stopped the copy, dropped its database and removed the worktree. US$0, nothing committed.

## Verdict: **Approve**. No Blocker or Major. Four Minors (fix or list in the PR). Journey score **9/10** (pass).

## What I ran
* `vite build`; web `tsc` 0 errors.
* `check_g1_source_entry_points_browser.cjs` **22/22**; `check_g1_source_register_browser.cjs` **60/60 twice**.
* My own walks (scratch `walk2c*.cjs`):
  * as the author and as the approver;
  * keyboard;
  * 400 and 1024 px;
  * axe with WCAG A/AA **plus `experimental`**, so label-content-name-mismatch was on;
  * a 503 on the sources list;
  * "From age" saved through the drawer itself, not the API.

## The points you asked me to judge
1. **"As saved in the draft": right.**
   * This is board 2's own rule ("Save the rule first, then add its source: a source is written for the number as saved").
   * The server holds the same line: PUT refuses a value that is not the draft's (409 "the number moved").
   * The section says so in one line. While an edit is unsaved, the panel lists the saved numbers (18), which is the true state.
2. **Focus with the rule dialog underneath: right.**
   * One Escape closes only the panel. Focus lands on "Check sources", the rule dialog stays open, and its discard question is not raised.
   * A check row's panel returns focus to its "Sources (n)" button; the "From age" Source link does the same.
3. **Names and labels: right.**
   * Axe with label-content-name-mismatch found 0 issues on the rule dialog, the checks table and the line drawer.
   * Each visible text starts its name: "Sources (1) 1 no source: check …", "Source of From age: 18".
   * The approver reads "View sources".
   * Nit: a check's name ends with its code (`check OR_COMMON_LAW_ONE_YEAR`). That matches the table's own first column, so I let it stand.
4. **Each check fails without its feature: yes,** for the rule section, the checks button and its label, focus return, the Sample note (exact words), the From age hint and link, the save from the drawer, the answered hint and the 503 case.
   * The new conflict wait has no catch, so it fails loudly.
   * Gaps are in Minor 4.

## What held
* **Concept §4, all three entry points:**
  * The RuleDialog section "Sources of its numbers": numbers with their chips.
  * A "Sources (n)" action on the 13 of 64 checks that hold a number; the other rows stay blank.
  * The "Source" link under a saved "From age".
* **m3:**
  * An illustrative check opens with "This check stays Sample: …".
  * "From age" reads "Leave empty for any age." when empty, "Needs a source before release." when missing or changed, and "Its source is recorded: see Source below." when answered.
  * A failed list never reads as answered.
* **Saving from the drawer:**
  * After None published, the chip and hint follow.
  * Changing 18 to 19 and saving shows "Changed since its source" and "Needs a source" (from about 1 s after the save; see Minor 1).
* **One shared cached query** for every row and dialog, so there are no per-row requests. The page fits at 400 and 1024 px; the checks table scrolls inside its own box. No page errors.
* **No API or contract change.** `useItemNumbers` is shared by the hint and `ItemSources`, so there is no duplicated logic.

## Minors
1. **For about 1 s after a save, the old answer still shows ("recorded").**
   * Repro (walk `X2`): with 18 answered, set 19 in the drawer and save, then reopen at once. The drawer shows 19 with "Its source is recorded: see Source below." and the chip "None published" for the old 18. About 1 s later it corrects itself to "Changed since its source".
   * Cause: neither the line save (`workspace/forms.tsx` `refresh()`, ~line 302) nor the rule save (`configuration.tsx:136` invalidate) refreshes `["sources", id]`, so the 2 s staleTime serves the old list.
   * This is the same claim Devin flagged, in a short window.
   * **Fix:** add `["sources", id]` to both lists.
   * **Check:** save 19, reopen at once, and assert "Needs a source".
2. **A failed list floods the checks table.**
   * With a 503, all **64** check rows (including the 51 without numbers) show "Sources could not be loaded." with `role="alert"` and their own Try again, so 64 alerts are announced (`source-panel.tsx`, the `failed` branch of `ItemSources`; screenshot `c-checks-503.png`).
   * **Fix:** in the `button` variant, show one notice for the table (or only on rows known to hold numbers), and drop `role="alert"` from the rows.
3. **Stacking the panel on the dialog is not recorded.**
   * Board 2's note reads "no panel is stacked on the dialog, because the dialog closes on save". The build stacks the panel over the open rule dialog.
   * It works: focus, a single Escape and the guard all behave. But it is a difference from the board, and build-notes "PR 2c" does not list it ("never deviate silently").
   * **Fix:** add one line to build-notes. The same goes for the From age hint, which splits concept m3's single sentence into three states.
4. **Test gaps.**
   * The drawer's own save of "From age" is never tested; the suite sets it through the API, and Minor 1 sits on that path.
   * The section's "View sources" for a non-author is not asserted.
   * A check row with no number staying empty is not asserted.
   * **Fix:** add these three assertions, plus Minor 1's check.

## Journey test (reviewer, 3 Nov)
Journeys:
1. Author: rule dialog, then Check sources, then Escape back.
2. Author: a check row's Sources, by keyboard.
3. Illustrative check (Sample note).
4. "From age" set in the drawer, then Source, then None published.
5. Change 18 to 19, then reopen.
6. Approver: View sources.
7. Sources list down (503).
8. Widths 400 and 1024.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | All three entry points open the panel on their item; saves land (walks W1, W5, D) |
| Next step obvious | 1 | The hint tells the author to save first; the Source link sits under the field |
| Plain words | 1 | Concept words; "View sources" for a non-author |
| Feedback and state | 1 | Chips update after a panel save; the hint follows the state |
| Correct data | 1 | Server state right in every walk (`19/changed`, None published stored) |
| Error recovery | 1 | Try again on a 503; the dialog guard is untouched by the panel's Escape |
| Accessibility and screen sizes | ½ | Axe (with experimental rules) 0, focus returns, fits; 64 alerts on failure (Minor 2) |
| Speed | 1 | One shared request; nothing per row |
| Visual quality | 1 | Section sits calmly inside the dialog (`rule-dialog-sources-1440.png`) |
| Trust and sources | ½ | "Recorded" shown for the old answer for about 1 s after a save (Minor 1) |

**9/10, pass.**

Most valuable fixes:
1. Minor 1 (one line in each of two places).
2. Minor 2.

## Could not check
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* CI on 201e67c3.
* Editing a rule's number through the dialog's own condition box (it is raw JSON; I did that path through the API).

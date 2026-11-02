# UX-A part 4 review, round 4: the condition editor keeps its own rows; calculated values typed by whole words (commit a7e4b6f0)

Reviewer agent (did not build it), 2 Nov 2026.

**Scope.** `git diff d487119a a7e4b6f0`: `conditions.tsx`, `studio.ts` `derivedValues` (now returns `executable`), and `check_uxa4_details_browser.cjs`. It fixes:
* break round 3 R3-M1: clearing a field box to retype it dropped that comparison and overwrote another;
* break round 3 R3-M2: "Add a comparison" did nothing;
* my r3-n1: the type of a calculated value was matched on parts of words.

**How it was run.**
* The exact commit, in the detached worktree `/home/user/uxa2-rev`. Its web build (`index-6zQPL_QV.js`, 18:49) contains the new words.
* `isolated.sh rev_uxa4 4448`, fresh database, `demo/load` as user-A. I never touched the breaker's copy on :4471, and never used :4400.
* US$0, no AI. One placement was saved as a draft on my own copy only, to check the stored condition.
* The check overwrites committed screenshots. I copied the `uxa4-*` shots to `/tmp/claude-0/-home-user-xpatready/d1a19a26-d4f8-5a0b-9a61-250603ccb5cc/scratchpad/r4/` and restored them with `git checkout`. The only file I changed is this one.

## Verdict: Approve
No Blocker or Major. Two Minors (r4-n1 and r4-n2) can go in the PR's Minors.

## What holds
* **Builder's check:** `check_uxa4_details_browser.cjs` passed **46/46, twice**. That includes the new R3-M2 case (Add gives 2 rows) and the R3-M1 case (retyping keeps two rows with two different keys).
* **My walk on `person.marital_status`** (typed key by key, then Tab; `scratchpad/r4/walk4.log`):
  * Row 1 "Email address", "is answered". Add a comparison: a new empty row shows.
  * Row 2 "Age years (calculated)" ≥ 18. Add again; row 3 "Residence differs from citizenship (calculated)".
  * Row 3 now gets a **yes/no select**: `derivedType` reads "differs" as a whole word.
  * **Cleared row 1 and paused 600 ms with it empty:** the rows stayed in place. Row 1 was empty, and rows 2 and 3 kept their fields and values.
  * **Retyped "Marital status":** all three rows are correct, so R3-M1 is fixed.
  * **Removed the middle row:** rows 1 and 3 are intact, and row 3's value "true" was kept.
  * axe is clean, and there were no console errors.
* **Data underneath:** Save placement as draft added exactly one `section_question` row (164 → 165) whose `predicate_json` is `{"op":"and","args":[{"op":"exists","field":"person.marital_status"},{"op":"eq","field":"person.residence_differs_from_citizenship","value":true}],"subjectKind":"EACH_APPLICANT"}`.
  * Two different keys, stored as keys.
  * A real boolean, not the string "true".
  * No empty row was stored.
  * After a reload the editor shows the same two rows by name.
* **Removing every row leaves one empty row** and the condition becomes `null`, so the editor never shows zero rows.
* **The "from outside" sync** (`emitted` ref plus the effect on `norm(value)`) re-reads the rows only when the value differs from what the editor itself last sent. Its own edits therefore never reset the rows, while Edit as JSON and a reload are picked up again. The reload case was walked above.
* **`executable`** comes from the database. 7 of the 22 calculated values are not executable, and they get a warning that a condition on one "cannot be decided on a case". That is true and useful, and the draft still saves.

## Minors (fix, or list in the PR)
* **r4-n1. No check covers the two smaller changes.**
  * `derivedType` ("country" is not "count"; "differs" gives yes/no) and the not-executable warning have no fail case. The new steps cover only R3-M1 and R3-M2.
  * Fix: one step that types "Applying country differs from citizenship (calculated)" and expects the yes/no select and the warning text.
* **r4-n2. `person.venezuelan_extended_passport_expiry` is a date but is typed as text.** `derivedType` treats a value as a date only when its key contains the word "date". The value is not executable, so a condition on it cannot be decided anyway; impact is low. Fix: add "expiry" to the date words, or have the derived table hold a type.

## Earlier rounds
* Rounds 1–3 stand: M1, n1–n3, n6, n7, R2-M1, the breaker's M2 and M3, and its R2-M1 and R2-M2 are fixed.
* r3-n1 is fixed by `derivedType`. r3-n2 (the warning for a retired field) is still in the PR's Minors with n4, n5 and r2-n3.
* The "Add a comparison" item I raised for the Lead in round 3 is fixed here (R3-M2).

## Journey
| Journey | Result |
|---|---|
| Author: "show this question when marital status is answered and the person is 18 or older", built row by row | Holds. Rows added, typed, cleared, retyped and removed without losing others; stored as keys. |
| Author: a yes/no calculated value | Holds. yes/no select; stored as a boolean; the not-executable warning is shown. |
| Recovery: reload after saving | Holds. The same rows by name. |

The score stays at **9.5 / 10, Pass**.

**Could not test:**
* Two fields with the same name (the demo has none).
* Edit as JSON with an invalid tree and then back to the builder (read from the code only).
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).

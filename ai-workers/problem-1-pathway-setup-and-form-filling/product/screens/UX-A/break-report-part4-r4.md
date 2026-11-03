# UX-A part 4: break report, round 4 (commit a7e4b6f0)

Breaker, 2 Nov 2026. Fix under test: `git diff d487119a a7e4b6f0` (`conditions.tsx`: the editor keeps its own rows; `derivedType`; calculated values that are not worked out say so; `derivedValues` returns `executable`).
Setup: an isolated copy `brk_uxa4` on :4471, restarted on this commit, with the demo sample freshly loaded and the web build of a7e4b6f0. I stopped the copy at the end.
Spend was US$0. No draft start, no priced click, no `*_LIVE` change. Nothing was saved: every editor was cancelled, and my walks made no write requests (the only POSTs were the editor's own `/conditions/check`).
The builder's `check_uxa4_details_browser.cjs` passes 46/46 on my copy, with its screenshots sent to scratch.

## Breaks

No Blocker or Major.

**r4-m1 (Minor, older behaviour that Add a comparison now makes easy to reach): a comparison with no value is sent, and the check calls it valid.**
Steps: open Change IMM 5476 › Add a comparison, then choose "Email address" or "Age years (calculated)" in the new row and leave Value empty.
Actual:
- The condition sent holds `person.email_address eq ""` and `person.age_years eq ""`.
- The server check gives `errors: []`. In the rule editor, "Residence differs from citizenship (calculated)" with Value "choose" also shows "Condition is valid".
- Saved, such a comparison is never true, so the whole condition fails when the comparisons are combined with "all of these" (and does nothing under "any of these"). The form or rule would then never apply.

Expected: a row with a field but no value is either left out like an empty row, or flagged.
This existed before part 4 for the single row. It is listed because R3-M2 now makes adding rows easy.

**r4-m2 (Minor): changing a row's field keeps its old value.**
Steps: in IMM 5409, clear "Marital status" and type "Citizenship"; in rule R-03, type "Criminal history details" instead.
Actual: the row keeps its old value `common_law`, so the condition sent is `person.citizenship eq "common_law"` (or `person.criminal_history_details eq "common_law"`).
The value is visible in the Value box, so this is not silent, but nothing points it out.

**r4-m3 (Minor, expert path): an impossible yes/no value from JSON is hidden in the simple editor.**
Steps: in Edit as JSON, set "Uses representative" (yes/no) to `"changed-in-json"`, then go back to the simple editor.
Actual: the Value select shows "choose", while the condition still holds the string. When the JSON is invalid ("not valid JSON yet"), "Use the simple editor" is still offered and drops the unfinished text.

**r4-m4 (Minor): `derivedType` misses one date.**
"Venezuelan extended passport expiry (calculated)" still gets a text Value box: the key has the word "expiry", not "date". It is one of the values that are not worked out yet, and it now says so.

## What held

**IMM 5409 clear and retype (R3-M1).** On With an LMIA › Forms › Change IMM 5409, clearing "Marital status" keeps both rows in the editor ("", "Accompanies subject to canada"). While the first row is empty, the condition sent holds only the second comparison. Typing "Citizenship" and pressing Tab gives `SPOUSE and[person.citizenship eq "common_law"; relationship.accompanies_subject_to_canada eq true]`: the second comparison is never touched.
- Switching "Always" then "Only if" keeps the edited rows.
- Cancel, then reopening, shows the saved condition (Marital status, Accompanies), not the stale rows.
- The drawer is modal: clicking another line's Change while it is open is blocked, so a drawer is never reused for another line.

**Add a comparison (R3-M2).** It shows a new empty row, and the empty row is not sent.

**Several rows.** On IMM 5476: with four rows, I typed half of "Age years (calc…" in row 3, then removed row 1. Rows 0, 2 and 3 stayed, with the half-typed text still in the right box. Finishing it stores `person.age_years`.

**Combining.** Choosing "any of these is true" sends `or`.

**Edit as JSON round trip.**
- The JSON leaves the empty row out.
- An edit in JSON (`op` changed to `and`, a value changed) is read back into the simple editor: the rows and the combine choice follow it.
- A round trip without edits changes nothing.

**Questionnaires rules editor.**
- R-03 behaves the same way: clear and retype keeps the second row, and Cancel then reopen shows the saved condition.
- A calculated yes/no ("Residence differs from citizenship (calculated)") gets a yes/no select. Its note ends "Not worked out by the studio yet, so a condition on it cannot be decided on a case."
- R-01 (nested) stays in JSON.

**Outside changes.** A condition changed by another action while the editor is open (Edit as JSON, Always or Only if) is read in again. The typed text is reset only then.

## Verdict
Ready from the breaker's side.
R3-M1 and R3-M2 are fixed, and nothing I tried lost a row, moved a typed text to another row, or kept stale rows after Cancel.
List r4-m1 to r4-m4 in the PR as Minors. r4-m1 is the one to fix soon: it lets a condition that can never be true pass as "valid".

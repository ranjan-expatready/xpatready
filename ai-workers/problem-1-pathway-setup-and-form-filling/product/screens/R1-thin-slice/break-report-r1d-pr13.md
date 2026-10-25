# Break report: R1d PR 13 fix (commit 47084bf, copy keeps its groups' entry ids)

Driven through the API on the isolated copy :4430 (db xr_studio_runtime_r1), officer `user-O`. I opened fresh `vv.single` cases with a principal and a spouse, made IMM 5257 ready (the makeReady helper from check_runtime_r1d.ts), then generated, locked and changed entries. I made no direct database writes and did not restart the app. Probe scripts are in the session scratchpad; `changedGroups` was also called directly to cover old copies.

## Blocker
None.

## Major
None.

## Minor

| # | Steps | Expected | Actual | Where |
|---|---|---|---|---|
| m1 | Generate a copy and make it ready. Fire `POST /form-copies/:id/lock {kind:"filed"}` and, at the same moment, add a blank entry `POST …/groups/P/rows {group:"previous_countries_of_residence"}`, with a 0–30 ms offset. Run 20 times. | The lock either sees the new entry and refuses (409, not ready / out of date), or locks a copy that was current when it was locked. | 20/20 locks succeeded (201) and the copy showed as stale at once. In 2 of the 20, the entry's recorded time is 18–19 ms *before* `locked_at`, so the entry probably committed between the lock's read of the case and its write. A copy can be filed while the form is no longer ready. It is visible, not silent: the copy is shown as stale straight away. | `api/src/fill-case.ts:205-219`, `lock()`: it reads the state, checks for changes and readiness, then runs `updateMany`. There is no transaction and no `FOR UPDATE` on the case row. `generate()` takes that lock at `:127`. |
| m2 | IMM 5707 for the principal reads both the principal's and the spouse's "Employment and activity history" groups (snapshot keys `P\|employment_history` and `SP\|employment_history`). Add a spouse entry after the copy. | The change says whose entries changed. | `changed: ['Entries in "Employment and activity history"']`, with no person named. If both people's groups change, the Set merges them into one line (checked with `changedGroups` directly). The officer cannot tell whose entries to check. | `engine/runtime/forms.ts:92` (name is built from `title` only, deduplicated by a Set) |
| m3 | A copy made before the fix (its `GroupFact` has no `rows`) that had 1 entry. Add a second entry. | Ideally caught. At least, the gap is stated. | `changedGroups([{…entries:true}], [{…rows:["a","b"]}])` returns `[]`, so the original bug remains for those copies. Going from 1 entry to 0 is still caught. On :4430 there are 0 such snapshots. The code comment says this is accepted ("absent on copies made before it was kept"), but the commit message, the test and the fix notes don't say so. | `engine/runtime/forms.ts:92` (`x.rows && y.rows && …`) |
| m4 | Lock a copy after only an entry changed. | The refusal names an entries change. | "This copy is out of date (1 fact changed since it was made)". The group counts as a "fact", which reads oddly beside the panel's 'Entries in "…"'. | `api/src/fill-case.ts:211` |

## What held

| Attempt | Result |
|---|---|
| Filed copy, then an entry added (filled and confirmed) | Stale. The changed list has the row's fields plus 'Entries in "Previous countries of residence"'. |
| Locked copy with one entry, then that entry removed | Stale and named. |
| Removed, then a new entry added back with the same values | Still stale (it has a new row id). The safe choice. |
| none apply, then entries apply with 0 rows, then none apply again | Out of date while the officer's "none apply" is unconfirmed. **Current again** after Confirm section, matching the original state. |
| 3 entries, then a 4th, then the 4th removed | The 3-entry copy is out of date, then current again. The 4-entry copy turns out of date when the 4th is removed. |
| Entry beyond the form's capacity (4th employment entry, capacity 3) | Out of date. The safe choice, since the copy no longer covers every entry. |
| Spouse's education entry after the principal's IMM 5257 copy | The principal's copy stays current: that form doesn't read it. |
| Spouse's employment entry after the principal's IMM 5707 copy (a form that reads it) | Out of date, as it should be. |
| Case-level group `your_visit`, switched to entries apply and an entry added | Copies (both unlocked and locked) turn out of date / stale, 'Entries in "Your visit"'. |
| Lock of an out-of-date copy after an entries-only change | 409, as it should be. |
| Lock when "entries apply" has 0 entries | 409, not ready to file. |
| 63 entries in one group | Forms list in 47 ms. Generate (job) in about 1 s. Snapshot about 110 KB. No errors. |
| Copies of other forms or people with unchanged groups | Never flagged. |

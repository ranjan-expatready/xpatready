# Review: R1d PR 13 fix (a copy keeps its groups' entry ids), 47084bf vs 093390f

Reviewer, fresh context, 25 Oct. Backend fix only; no journey score.

## Verdict: PASS (merge). 0 Blocker, 0 Major, 5 Minor.

The fix does what the PR 13 finding asked. `groupFacts` now stores `rows`, the sorted, de-duplicated live row ids of each group the form reads. `changedGroups` compares them only when both the copy and today have them. The list, single-copy and lock paths in `api/src/fill-case.ts` all go through `groupFacts`/`changedGroups`, so out of date, stale and the lock refusal all see the change.

## How checked
* Read the diff. Also read `caseView`/`knownOf` (`engine/runtime/case.ts`), `runtime.state`/`addRow`/`removeRow`/`groupFor` (`api/src/runtime.ts`), and `generate`/`copyOf`/`lock` (`api/src/fill-case.ts`).
* Engine suite in a scratch copy of the studio: with the fix it passes 49/49. With `engine/runtime/forms.ts` put back to 093390f it passes 48/49, and only "PR 13 review fail" fails. So the engine test catches the bug.
* R1d API check: not run. It moves a release (version -1) on the shared :4430 copy, which a breaker is using. Reasoned instead: before the fix, a blank row writes no facts, and `entries` is true on both sides. So `changed` is `[]`, `c13.stale` is false, and the check fails. After the fix the row ids differ, so it passes.
* Read-only look at :4430's database: new snapshots store `rows` per group, for example `"rows": []` for "Previous countries of residence".

## Cases checked
| Case | Result |
|---|---|
| Blank entry added | Stale, naming `Entries in "<title>"` (the bug, fixed). |
| Entry removed (blank or complete) | The ids differ, so it is a change. A blank removal was missed before; now it is caught. |
| Removed row's tombstone | `state()` loads only `tombstone: false` rows. A removed id leaves `rows`, and its answers are never read (`knownOf`). Correct. |
| Removed and added again | `addRow` always makes a new `randomUUID`, so it is a change even when the answers match. Errs safe (see m2). |
| Reordering | There is no reorder API: order is always the highest + 1. Ids are sorted, so order does not count as a change of `rows`. If a reorder is ever added, `knownOf` gives each row its slot by order, so moved values show up as fact changes. Correct. |
| Entries for another person | The key is `subjectId|section`, and the rows are filtered by that subject in `caseView`. A form that reads a spouse's group compares the spouse's rows. Correct. |
| Case-level group `your_visit` | `groupFor` allows rows only on the case subject. The view's rows for it come from the case subject, and the key is `<case subject>|your_visit`. Every person's copy that reads it goes stale on its own. Correct. |
| Copies made before the fix (no `rows`) | `x.rows && y.rows` skips the comparison, so they behave exactly as before. The engine test asserts this (a copy with `rows` stripped gives `[]`). |
| Same entry named twice? | No. The `Set` keeps one line per group. Removing a complete entry now names its question labels and the group line. These are different strings, and both are true. |
| Wording `Entries in "<title>"` | Matches the readiness/forms-panel name (`groupLabel`, `contracts/runtime.ts`: `Entries in "<title>": …`). Right. |

## Findings

**Minor m1: the counts and verbs in the wording are slightly off for group changes.**
* Evidence: the lock refusal says `(${changed.length} fact(s) changed …)`, and the group line counts as one "fact". The copy card says "Added or changed: …" (`web/src/runtime/forms.tsx:159`), even when an entry was removed. Both wordings were there before the fix; the fix makes removals reach them more often.
* Fix: say "N changes" in the lock refusal, and "Added, changed or removed:" on the card.

**Minor m2: some changes that do not change the printed form still make the copy stale.**
* Evidence: an entry removed and added again with the same answers makes the copy stale, though the PDF would be identical. So does an extra entry past the form's capacity (`fits: false`), which writes nothing.
* Why this is acceptable: it errs on the side of a new copy, and readiness already treats an unfilled entry as not answered.
* Fix: no code change. Note it in the `GroupFact.rows` comment as intended ("any entry added or removed counts, even one the PDF cannot hold").

**Minor m3: the input hash covers the facts only.**
* Evidence: `inputHash(cov.facts)` (`fill-case.ts:130`) leaves out `groups`. Two snapshots can therefore share a hash and still differ in entries or "none apply". Nothing reads `inputHash` today: it is stored once and never compared (grep). So it has no effect on stale or out-of-date now.
* Fix: either hash `{facts, groups}`, or say in `inputHash`'s comment that it is facts-only and not used for staleness. That way no later dedupe relies on it.

**Minor m4: copies made before the fix stay blind to a blank entry.**
* Evidence: a copy filed before 47084bf has no `rows`. A blank entry added later still leaves it current. This is by design and was asked for.
* Fix: none needed for prototype data. Record it in build notes as a known limit, or regenerate the demo copies.

**Minor m5: removing an entry has no test.**
* Evidence: the tests cover adding only (`one` to `two`).
* Fix: add `JSON.stringify(changedGroups(two, one)) === '["Entries in \"Jobs\""]'` to the engine check. A removed-and-re-added id (`withRows([a1])` vs `withRows([a3])`) is one more line.

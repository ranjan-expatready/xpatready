# C3.15 rename a shared field: review of PR #712, commit 60bd8998b

Reviewer: not the builder. Re-ran the pack on :4448 (setup 13/13, `acceptance/C3.15.test.ts` 11/11, US$0). Read P-96, P-266, P-253 word for word. Read the full diff and `check_gcore_b2_door.ts` around the change.

**Verdict: Approve** (no open Blocker or Major; three Minors, none blocks the merge).

## The pack: rewritten, not made easier
- The three checks that expected a direct rename of K (a released field) now expect the P-266 route: 202, one waiting RENAME, author cannot approve own (403), a different person approves, a new draft version, earlier version kept. That is stricter, and it follows P-266 ("a rename of a shared field that a released combination uses needs a second person").
- P-96's direct route is kept on a field no release uses. The pack inserts a test row for it and refuses to run if the row is in a release (`inRelease(free)`). It asserts 200, applied, no library change, and the activity line. Honest, and `every other rename` of P-266 is covered.
- Nothing was dropped: roles (403), duplicate, waiting-name duplicate, stale ("Look again"), no-reason refused (400), meaning-with-reason not live and reason kept are all there. The stale check moved from the old `version` to the G-CORE `expected` fingerprint, with a fingerprint taken before the approval, so it still fails if the check is removed.
- The meaning check keeps its either-route allowance (library change, or a draft released by another person). That is the same as main and fits P-96 + P-116.
- Rule removal: the 400 test fails without the reason rule (`bare` sends no reason; the next check also needs the reason in the activity). The waiting-name test fails without `waitingNames`.

## Points you asked about
1. **Waiting-name rule can wrongly refuse? No, in the cases you named.** `change-set.ts:86-87`: `w.key !== it.key` so its own waiting change never blocks it. Only `status: "WAITING"` rows count (`change-sets.ts:117-119`), so a returned or withdrawn change frees the name (the b2 door test returns and withdraws a rename after this and passes). Different group (key first part vs `me.group`) is not compared. Residual: the group is the key prefix of the waiting change, while `me.group` is the group column; they agree on the sample but are two sources (Minor 1).
2. **Reason only when the meaning really changes: right.** `studio.ts:592` compares the trimmed new meaning with the newest version, so a value-type-only edit, or the same meaning sent again, needs none. The UI sends `reason` only when `meaning.trim() !== cur.meaning` and shows the box only then (`library.tsx:148`), the same test, so the screen and server agree. A reason of invisible characters does not count (as K1).
3. **`check_gcore_b2_door` setup change: still honest.** BR-2 is the approval-time re-check, and its subject is "the name was taken after the proposal". Writing the label with SQL reproduces exactly that end state, since the direct-rename route is now (rightly) shut by the new rule. The assertions that follow (`recheck.ok === false`, 409 at approve, still WAITING) read the live library and are unchanged. The new line right before it proves the shut route. Small cost: SQL edits the newest row in place instead of making a new version; the check does not depend on that.
4. **Wording.** Refusal texts are plain and name the next step ("Choose another name, or wait until that change is decided"). "To review" matches the menu. See Minor 2.

## Issues (all Minor, Should)
1. `change-set.ts:86` mixes `me.group` and `w.key.split(".")[0]`. If a field's group column ever differs from its key prefix, a legitimate rename is allowed or refused wrongly. Fix: use one source (carry `group` on the waiting row), or add a pack check that a waiting name in another group does not refuse (none exists now; the negative case and the own-waiting-change exclusion are untested).
2. `library.tsx:148` hint and `studio.ts:593` message say "the second person reads it before the new meaning is released". The reason is stored only in the activity line (`studio.ts:604`); I found no release or To-review view that shows it (`release.tsx` has no reason). The promise is not yet kept. Fix: soften to "is kept in the activity" or show it at release review (that would be new scope; prefer the wording fix).
3. Pack gaps (no new scope): no test for the 300-character cap (`studio.ts:594`), an invisible-characters-only reason, or "unchanged meaning needs no reason". Add one assertion each if cheap.

## Questions for the tech lead (from the PR)
- No reason for renames: consistent with P-96/P-266 (only the meaning needs a reason; P-253's "reason" is on the guarded change). No objection.
- C3.2 AT-14 edit: the only change is adding `reason` to the meaning edit, which the new rule requires; its assertions are unchanged. Acceptable under P-291.

## Journey score (reviewer): 7.5 / 10, provisional
Honest limit: I ran the API pack and read the UI code. I did not walk the field page in a visible browser, so accessibility, 400/1024/1440 px and keyboard path are unchecked, and the "why" box is read from code only.
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Rename waits (202), second person approves, version added; direct route works on an unreleased field |
| Next step obvious | 0.5 | Box appears only when the meaning changes; not seen in a browser |
| Plain words | 0.5 | Refusals plain; hint over-promises (Minor 2) |
| Feedback and state | 1 | 202/409/400 texts, "Look again" |
| Correct data | 1 | Version kept, meaning unchanged by a rename, reason kept in the activity |
| Error recovery | 1 | Stale, duplicate, no-reason all refused with nothing changed |
| Accessibility and sizes | 0.5 | Not walked; label and hint are present in code |
| Speed | 1 | Pack ran with no slow step |
| Visual quality | 0.5 | PR screenshots only |
| Trust and sources | 0.5 | Reason kept but not shown to the second person |
Pass is 8 or more; mine is 7.5 because the browser walk was not done, so the score is partly unverified. To raise it: a visible-browser walk of the field page (keyboard, 1024 px at 200 %) and the Minor 2 wording fix. I do not treat this as blocking, as the capability, decisions and pack are met; the founder's walk (D17, D20) stays open.

## Could not check
Browser look and keyboard path; the whole suite (not asked); the PR's screenshots beyond their names.

**Verdict: Approve**

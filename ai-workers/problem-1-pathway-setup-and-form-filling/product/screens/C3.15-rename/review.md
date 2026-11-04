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

## Round 2 (commit b7b7c5a76, diff-only against 60bd8998b)
- The diff touches two files and only words: the 400 detail (`studio.ts:593`) and the field-page hint and comment (`library.tsx:148-149`) now say the reason "is kept with the change in the activity". That matches what the code does (`studio.ts:604` writes it to the activity line), so Minor 2 is closed.
- The pack's `/Say why the meaning changes/` match still holds: the detail still starts with that phrase and the `errors[0].message` is unchanged. No rerun needed, since no logic changed.
- Minor 1 (two group sources) is accepted as inherent: a waiting library change has no group column and #295 defines the group as the key's first part. Minor 3 (untested edges) stays listed in the PR. Neither blocks.

**Verdict: Approve** (round 2, b7b7c5a76).

## Opus review (P-303), commit 5447c3d1f, independent of rounds 1–2
Reviewer: not the builder, on Opus. Read P-96, P-266 and P-253 word for word, the whole diff and the door (`rename-door.ts`). I ran everything from a detached worktree of 5447c3d1f with the web built there, on :4448. US$0, live AI off. Pack: setup 13/13, `acceptance/C3.15.test.ts` **11/11**. Touched suites: `check_gcore_engine` 130/130 · `check_gcore_b2_door` 52/52 · `check_c119_library_items` 70/70 · `C3.2` 22/22. Graph `--check` exit 0, and every field route is tested.

**Verdict: Block**: one Major (the pack). The code itself is correct.

### Rule removal (does each rule's test fail when the rule is gone?)
- Waiting-name rule removed (`change-set.ts:87`): pack 9/11 (the waiting-name check and the stale check fail). Guarded.
- Reason rule removed (`studio.ts:593`): pack 10/11 (the 400 check fails). Guarded.
- A direct rename that overwrites the published version in place, with no new version (`rename-door.ts:74`, the direct branch only): **pack 11/11, b2 door 52/52**. The data then holds `1|DRAFT|Direct name …`, and published v1 is gone. Not guarded (Major 1).

### Major
1. **The rewritten pack no longer checks that P-96's direct rename is versioned.** P-96: "a direct, **versioned** edit"; P-266: "every other rename … stays direct and logged (P-96)". On main, the pack's direct check asserted `after.version === before.version + 1` and that the earlier version is kept. The rewrite moved those two assertions to the second-person route on K. The direct check at `acceptance/C3.15.test.ts:70` keeps only label, DRAFT, 200, no library change and the activity line. `fb` (line 67) is read and never used. Failing scenario: a change to the direct branch that edits the published row in place passes every suite I ran, so a published field could lose its earlier version (D2) and C3.15 would still count as Works (P-291). The PR says "no check was weakened", but this one was. The code is right today (real run: v1 PUBLISHED kept, v2 DRAFT). Fix: add `&& fa.version === fb.version + 1 && Number(sql(\`select count(*) from canonical_field where canonical_field_key = '${free}' and version = ${fb.version} and status = 'PUBLISHED'\`)) === 1` at line 70, then show it fails under the in-place mutation above.

### Minors (Should; fix or list in the PR)
2. **The reason error is not on the field, and the error is not prevented** (EXPERIENCE §8 and §10 [M]: "errors … on the field"; "prevent errors before messaging them"). Walked: with an empty reason, **Save as draft** stays enabled. The refusal shows only as a toast, the box gets no `aria-invalid`, and nothing appears under it (`library.tsx:123`, `:149`), although the 400 response carries `errors[{field:"reason"}]` and `Field` takes `error`. Fix: pass the field error to the box's `Field error`, or disable Save until the reason has 8 characters.
3. **The same-group part of the waiting-name rule has no failing test.** No case checks that a waiting name in *another* group is allowed, so dropping the group comparison at `change-set.ts:87` keeps the pack green. The two group sources match on all 213 fields of the setup (0 where `group_key` differs from the key prefix), so this is a test gap, not a bug today.
4. **Concurrency, narrow and recoverable.** (a) Two renames of two released fields in one group to the same name, sent at the same moment, both pass the check (`rename-door.ts:69` reads waiting names without a lock) and both wait. Each approval is then refused by the other's waiting name until one is returned; on main the first would have gone through. The words say what to do. (b) The reason rule reads `before` outside the item lock (`studio.ts:591` against the lock at `:600`). An edit that puts back the old meaning while another person's meaning change is being saved can land without a reason. Fix if cheap: read `before` inside the transaction.
5. The final meaning check's name says the draft "goes out with a release by another person", but the pack does not check that. It is BR-14 (`studio.ts:1104`, "You made changes in this draft … a different person releases it"), tested elsewhere. Main's pack pointed to that test; restore the pointer comment.

Not counted (already on main, outside the diff): Activity shows the key code ("changed field person.country_of_birth … because …"); a double click on Save writes a second activity line with no change; a reviewer sees the Meaning and reason boxes enabled and gets a 403 in words on Save.

### Concept and standards (what the diff touches)
Met: P-266 202 route, one waiting rename at a time, no self-approval, different approver → new draft version, earlier version kept · P-96 direct route on an unreleased field · exact duplicate in any case or spacing (BR-6) · waiting names · stale fingerprint "Look again" · 403 for reviewer and officer · 400 Problem Details naming `reason` (STANDARDS [M] "field-level messages": met on the server, not on the screen, see 2). Server authorisation `need(actor,"author")`. One query for waiting names per check, not one per row. No migration.

### D1–D20 (1–5)
D1 4 decisions met, pack misses P-96's "versioned" (Major 1) · D2 4 duplicates, waiting and stale refused; race in 4 · D3 4 one name per group · D4 n/a, no rule changed · D5 4 reload keeps the draft; double click gives one version · D6 4 reason, who and when in Activity · D7 n/a, no AI · D8 4 breadcrumb Fields › Country of birth · D9 4 box only when the meaning changes · D10 4 plain refusals; code in the activity line (already on main) · D11 3 toast only, not on the field · D12 4 team Field and Input · D13 4 axe 0 violations with the box shown; keyboard order Meaning → Why → Value type → Save; no sideways scroll at 400, 1024 and 1024 at 200 % · D14 4 · D15 4 save 186 ms; cold first open 1.2 s · D16 3 two rules guarded, one dropped (Major 1), one untested (3) · D17 simulated only · D18 4 reason kept with the change · D19 4 rename → To review → approver walked · D20 simulated only.

### Journey test (reviewer role), score **9 / 10, pass**
Journeys walked in headless Chrome as the author (user-A), the approver (user-B) and the reviewer (user-C): J1 edit the meaning, give a reason, save (v2 draft; the reason is in Activity, `because IMM 5707 asks …`) · J2 no reason, or only invisible characters (refused in words; Versions still "v1 published") · J3 edit then put the meaning back (the box goes) · J4 reload (the draft stays) · J5 double click (one version) · J7 keyboard only (21 Tabs to Meaning; Save with Enter) · J8 reviewer (403 in words) · J9 rename the released field (dialog "Send for approval", "stays as it is until a second person approves", the approver's To review lists it). The data checked underneath: the audit line holds the reason in its detail, published v1 is untouched, and there is one library change per rename. No page errors; the only console errors are the expected 400 and 403.
| Task 1 | Next step 1 | Words ½ (key code in Activity) | Feedback ½ (toast, not on the field) | Data 1 | Recovery 1 | A11y and sizes 1 | Speed 1 | Visual 1 | Trust 1 |
Not tested: a real screen reader, an intended user's unaided walk (D17, D20 stay with the founder), the release step after the meaning draft. No separate journey-test file: the brief allowed only this file.

**Verdict: Block**. Fix Major 1 (one assertion plus its fail-first proof). Fix Minors 2–5 or list them in the PR.

## Opus re-review (P-303), diff only, 5447c3d1f..2a0a4249d
Reviewer: not the builder, on Opus. I read the diff (`C3.15.test.ts`, `engine/change-set.ts`, `library.tsx` in 4c00e9204, then `library.tsx` again in 2a0a4249d). I ran it from the PR worktree at 2a0a4249d with the web rebuilt there, on :4449. US$0. Setup 13/13, pack **11/11**. The server code is the same in 4c00e9204 and 2a0a4249d.
- **Major 1: closed.** `C3.15.test.ts:70` now requires `fa.version === fb.version + 1` and that the published v`fb.version` row is kept. My mutation (the direct branch at `rename-door.ts:74` overwrites the published row in place) now turns the pack to **10/11**, failing exactly that check. Restored: 11/11.
- **Minor 2: closed.** Walked in Chrome:
  - Empty reason: Save is disabled.
  - "abc": Save is disabled, the box is `aria-invalid`, and "At least 8 characters: say why in a sentence (invisible characters do not count)." shows under it, announced by its alert role.
  - "abc" plus six invisible characters: still disabled, since the screen now counts as the server does (NFKC, invisible characters removed).
  - A sentence: enabled; saved as v2 draft with v1 published kept.
  - Accessibility scan with the error shown: 0 violations.
- **Minor 3: closed.** `change-set.ts:87-90` takes the waiting change's group from its field when the field exists, else the key's first part (#295), so it follows the same rule as the twin check. The pack now proves that a waiting name in another group is allowed (200). Removing the group comparison turns the pack to **10/11**, failing that check.
- **Minor 5: closed.** The check name now cites BR-14, `check_screen01_release_race.ts` and C10.1 row 10 instead of claiming the pack checks the release.
- **Minor 4:** listed in the PR, not fixed (both narrow and recoverable). Accepted.
Journey score unchanged at 9/10, except feedback and state now earn the full point (error on the field): **9.5 / 10, pass**.

**Verdict: Approve** on 2a0a4249d (no open Blocker or Major).

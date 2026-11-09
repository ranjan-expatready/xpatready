# B142 (C7.9 must verify before filing): break report

PR #1282 at commit 177378a54 (branch claude/runtime-must-verify). I ran an isolated copy, `brk142` on :4438, which is now stopped. I loaded the configured checkpoint and ran `acceptance/C7.9.test.ts` (15/15 PASS). Then I released Visitor visa v4 with three more Sample flags: `case.funds_available_cad`, `person.occupation_employer` (repeating) and `person.criminal_history_details` (background). Roles were called through the API, and the UI was driven with Playwright Chromium. No AI was used (US$0). Line numbers are at 177378a54.
Note: another session edited `engine/runtime/must-verify.ts` and `api/src/case-prepare.ts` in this working tree during my run (uncommitted, 04:13 UTC). My server had started at 04:00 and does not reload, so every result below is the commit's behaviour.

## Findings

**F1 (Major). Approving the flag on a field merged since the proposal brings the merged field back as an active draft.**
Steps:
1. As user-A: POST `/library/fields/person.family_name_at_permanent_residence/must-verify` `{on:true, reason}` (201).
2. As user-A: POST `/library/merges` `{keep:"person.other_family_name", merge:"person.family_name_at_permanent_residence", reason}`.
3. As user-B: POST `/library/merges/:id/approve`. The field's rows become `1 PUBLISHED, 2 RETIRED (merged)`.
4. As user-C: POST `/library/changes/:id/approve`.

Actual: 201 APPROVED, and the rows become `1 PUBLISHED, 2 RETIRED, 3 DRAFT must_verify=true merged_into_key=person.other_family_name`. GET `/library/fields` lists the merged key again as `version 3, status DRAFT` (it shows as active, can be used again, and duplicates the field it was merged into). GET `…/must-verify` shows `on:true`.
Expected: refused in words ("merged into …"), with nothing written.
Cause: `fieldOf` skips RETIRED rows, so `current` is the old PUBLISHED v1 (`api/src/must-verify.ts:27`). `refuseRetired` does not see a merge either: `stateOf` treats an item as retired only when no PUBLISHED row is left (`library-items.ts:42`). So `revise` stacks a DRAFT on top of the RETIRED row (`must-verify.ts:96`).

**F2 (Major). Merging a flagged field after approval drops the expert's flag, and the change gets stuck forever.**
Steps:
1. As user-A: propose on `person.given_name_at_permanent_residence`.
2. As user-C: approve it. The field's draft v2 now has must_verify=true.
3. As user-A: merge it into `person.full_name`.
4. As user-B (no sme duty): approve the merge.

Actual:
- The draft becomes RETIRED (merged), and `person.full_name` stays `must_verify=false`. The expert's flag disappeared through a decision that only a reviewer made.
- The change stays APPROVED. `releaseMustVerify` never releases it, because the published flag never matches (`must-verify.ts:124`).
- Withdrawing it gives 409 "The field's flag changed after this was approved" (`:110`).
- Any new proposal on the key gives 409 "Already waiting" (`:66`).
- The panel keeps saying "is approved and goes out with the next release".

Expected: one of two things. (a) The merge carries the flag to the field that stays, or the merge waits for the expert. (b) At the least, the open change is closed and the drop is named in the merge preview.

**F3 (Minor). The "Merged" guard on proposals never fires.** After a merge was approved (`person.activity_location` into `person.activity_description`), POST `…/person.activity_location/must-verify` returned 201 WAITING. The guard at `must-verify.ts:60` reads `current.mergedIntoKey` from the old PUBLISHED row (`:27`), and that value is always null. Expected: 409 "Merged … set the flag there". This is the entry point to F1.

**F4 (Major; the same root cause as review M1). A flagged application-level fact never warns.** On a Visitor visa v4 case, the client (user-P) saved `case.funds_available_cad` = "5000" (PUT 200). IMM 5257 maps it (`Page3.DetailsOfVisit.PurposeRow1.Funds`). GET `/runtime/cases/:id/prepare` showed no must_verify line for it, before or after the other lines. Expected: a CRITICAL line "… not verified". Cause: `engine/runtime/must-verify.ts:30` compares `about` ("case") with the answers' `subjectId` (the case subject's id). The uncommitted fix mentioned in the note above targets this.

**F5 (Minor). A background answer warns only after the client re-confirms the officer's value.** On a case, the officer (user-O) recorded `person.criminal_history_details` by phone (channel `agent_view`, status DECLARED). Readiness showed no line, because it counts as a staff entry. The client then re-confirmed the same value (POST `…/answers/:id/reconfirm`, 201, channel `client_reconfirm`, `runtime.ts:512`). A CRITICAL line appeared: "the client gave it and no one on staff has checked it". The value had not changed, but the warning appeared only after the client agreed with staff. Expected: one consistent reading for the same value. Either a phone-recorded background answer counts as unchecked from the start, or a re-confirmation of a staff entry stays verified. Ruling needed: SA-1B-260 r3(b) against P-244.

**F6 (Minor). To review names the wrong decider, and offers the decision to someone who cannot make it.** On a waiting must-verify change:
- user-B's queue item says "A content publisher approves or returns it". user-B is a content publisher and is refused (`review-queue.ts:287`).
- The proposer's item says "a different person approves". Expected: name the immigration expert.
- `/review/change/:id` shows user-B enabled Approve and Return buttons, and both always end in a 403. The 403 is in words, so this is wording only.

**F7 (Minor). Keyboard: opening the proposal form loses focus.** As user-A at 1024 px, Tab reaches "Propose: must verify before filing…" (30 Tabs), and Enter opens the form. `document.activeElement` is then `<body>`, because the button unmounts and focus is not moved to the reason box (`must-verify-panel.tsx:39`). The next Tab happens to land on the textarea. Escape does not close the form. Expected: focus moves to "Why the flag changes".

## What held
- **Proposing, by role:** 403 "does not hold the author duty" for user-B, C, O, P and R. 401 with no actor or an unknown actor.
- **Reading, by role:** GET `…/must-verify` returns 403 for O and P ("works on cases") and 200 for A, B and C.
- **Deciding, by role:** approve or return by user-A (the proposer, who has the review duty) or user-B gives 403 "does not hold the immigration expert's duty". O, P and R get 403 for the missing review duty.
- **Other ways in:**
  - Withdrawing someone else's change: 403.
  - Batch route `review/changes/batch/<id>`: 404, because a must-verify change never has a batch.
  - `review/proposals/decide`: 400, it does not decide library changes.
  - Resubmitting a waiting change: 409.
- **Concurrency:**
  - Five proposals at once: one 201 and four 409. One open row.
  - Approve, approve and return at once: one 201 and two 409.
  - Approve and withdraw at once: withdraw 201, approve 409. The field was untouched (v1 only).
  - Two withdrawals of an approved change at once: one 201 and one 409. The draft flag went back to false.
  - Proposing "off" while "on" waits: 409.
- **Retired between proposal and approval** (`case.application_date`): the expert's approval gives 409 "is retired". The change stays WAITING and nothing is written.
- **Bodies:**
  - `on:"true"`, an extra key, null, an array, a missing reason, zero-width-only or emoji-only reasons, 301 characters, and a 3 MB JSON body all give 400 in words. Malformed JSON gives 400.
  - A Hindi/Chinese reason of 290 characters was saved and shown whole at 200 % zoom.
  - Unknown, upper-case, padded, traversal and 5000-character keys all give 404.
- **Values on a case:**
  - A client-typed passport number warns on IMM 5257 only. IMM 5645 and IMM 5476 do not write it, and show no line.
  - The principal giving the adult spouse's passport number warns, on the spouse's own line.
  - An officer correction clears the line.
  - The client re-saving the officer's value brings it back, as the client's value now.
  - A repeating `occupation_employer` row typed by the client warns, and deleting the row clears it.
  - A pass by key covers only that line, and a changed value brings it back.
  - The client trying to pass gets 403.
  - Confirm section for everyone clears all lines.
- **Migration:** every code main allows is still allowed with its main severity, including fields_left_empty, no_copy, hand_write and release_update. 'must_verify' is accepted as critical only. 'barcode_not_validated' and an unknown code are refused. A real must_verify pass is stored as critical. The new column is NOT NULL DEFAULT false, and the other 371 rows are all false. Main's newest migration (20261108090000) is older than this one.
- **Fingerprints:** `snapshot.ts:220` adds `must_verify` only when it is true, and the row-version note is version and status only. So a release with no flag assembles as on main.
- **Budgets:** prepare took 173–252 ms with 4 flagged facts on a two-person case (8 form lines). Approving and releasing took 534 ms.
- **Layout:** at 1024 px and at 200 % zoom (512 CSS px), the panel and the expert's before/after block show no horizontal overflow. Approve is reached in 8 Tabs.

## Not checked
- Hostile or planted-instruction uploads: this item has no upload.
- 100 programs / 400 combinations: this item has no list or catalogue. I measured prepare and release instead.
- Reload or back mid-proposal beyond losing the typed reason.
- A field with a separate pending draft (for example, a meaning edit) at approval or withdrawal.
- Relatives' (`<person>/parent_1`) subjects: these are in review M1.

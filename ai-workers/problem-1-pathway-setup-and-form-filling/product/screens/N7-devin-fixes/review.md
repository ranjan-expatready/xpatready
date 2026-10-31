# N7 Devin fixes: review (reviewer, 31 Oct)

**Scope.** Commit `10939d21` on `claude/runtime-devin-fixes`. Only the diff `origin/claude/reverent-mahavira-cef858..10939d21` was reviewed: 7 code and test files, plus 4 screenshots. Source findings: `inbox/2026-10-30-devin-d1-walk.md` (DV-bb-8, DV-bb-9, DV-d1-3).

**How I checked.** I used my own isolated copies, `rev_n7` on :4435 and `rev_n7b` on :4436, with web built from this commit. I never used :4400, set no `*_LIVE`, and spent US$0.

Results:
- `check_runtime_n7.cjs`: 18/18 (a copy writing screenshots to /tmp).
- `check_forms_demo.ts`: 23/23.
- `tsc --noEmit`: passes for api and web.
- Journey test: `journey-test-reviewer-2026-10-31.md`, **8.5/10, pass**.

## Per finding
- **DV-bb-9 (withdraw by proposer only).** This is fixed for remove, retire and restore.
  - Placement: `lifecycle.ts:437` sits after the duty check and **before** the note and status checks, which is correct. I confirmed that an empty note from a non-proposer gets 403 "Not yours", not 400 "Say why".
  - Words are plain and name the proposer by role name. An unknown id falls back to "Another person", and that is tested.
  - Data: a refused withdraw leaves the change WAITING with no audit line. The proposer's own withdraw writes one audit line. A second withdraw returns 409 in words.
  - The page hides "Withdraw it instead…" from a non-proposer and says who can withdraw (`review-items.tsx:137`). This is checked with axe at 1440, 1024 and 400 px, and by keyboard.
- **DV-bb-8 (one upload door).** The POST route is removed (`main.ts:81-82`). GET and `/sample` stay.
  - I grepped web, tests and `tests/qa` for other callers. The only POST caller left is the N7 check's own 404 probe. The only other hit is a preserved file under `evidence/before-d279-d280/`, which is history, not live code.
  - `check_forms_demo.ts` now uses `/intake` with `combinationId` and passes.
  - `graph.mjs` now gives G3 = 1, so the removed route has left the gap list.
- **DV-d1-3 (raw role keys).** `roleKeysInWords` is applied to the derived-field warning and to the change label (`review.tsx:15,75`).
  - I scanned every tab of With an LMIA (overview, forms, documents, questionnaires, review, preview, studio preview) and To review. There is no `subject_…` or `form_subject` key anywhere.
  - The stored text is unchanged; only the display is converted.

## Issues
1. **Major (Must): the same withdraw hole remains for a new shared field, on the same endpoint.**
   - What is wrong: `library-changes.ts:152-159` (`withdrawChange`) sends lifecycle kinds to the new check. For `kind: "field", action: "ADD"` it checks only the author duty, so any author can withdraw another author's waiting or returned new field. That also resets the other author's draft form-field mappings to "no decision" (`:164`).
   - The page matches the server: Withdraw is shown to any author at `review-items.tsx:106` (WAITING) and `:159` (inside `Correct`).
   - The server's new message, "Only the person who proposed a change can withdraw it", is therefore untrue for one kind on the same route. This is the same class and the same latent exposure (a second author) that made DV-bb-9 Major.
   - Fix:
     - Move the proposer check from `withdrawLifecycle` into `withdrawChange`, right after the 404, so it covers every kind. Keep it before the note check.
     - Gate `<Withdraw>` at lines 106 and 159 on `mine`, with the same "Only … can withdraw it." line.
     - Add a fail and a pass case for a field ADD to `check_runtime_n7.cjs`.
   - If the Lead holds that new fields are deliberately "any author" (B1 comment, `resubmitChange:134`), record that in `challenge.md` with the decision. Then the 403 text must stop saying "a change" for all kinds.
2. **Minor (Should): the To review queue contradicts the page for a non-proposer.**
   - What is wrong: `review-queue.ts:194` gives an author "Correct or withdraw" on another person's returned remove, retire or restore. The waiting text still says "…or an author, corrects or withdraws it". The item page then offers only "Send again" (`/tmp/rev_n7/j/queue-not-mine-1440.png`).
   - Fix: when the change is a lifecycle kind (or every kind, after issue 1) and not mine, use the label "Correct" and the waiting text "The person who proposed it withdraws it; an author may correct it".
3. **Minor (info): `qa/GRAPH.md` is out of date.** It was generated at `bff4dd77` and still lists the removed route under G3. Regenerate it in the next lane PR. It is not this PR's file to edit.

Note, not a finding: `review.tsx` imports `roleKeysInWords` from another page (`@/pages/job`). It works and type-checks. Moving it to a shared module next to `PERSON` would be tidier, but this is not required.

## D1–D20 (only the dimensions this diff touches; others unchanged)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | Each of the three findings is met as written; issue 1 is an adjacent gap of the same rule |
| D2 Data integrity | 3 | Lifecycle withdraw is enforced on the server and under status race (`updateMany` on OPEN); field ADD withdraw is not (issue 1) |
| D5 Stability and recovery | 5 | Double withdraw gives 409 in words; refused calls change nothing |
| D9 Flow of information | 3 | Queue next step contradicts the page for a non-proposer (issue 2) |
| D10 Language and guidance | 5 | No system keys on the LMIA pages; refusals in plain words with role names |
| D13 Accessibility and responsive | 5 | Axe 0 at 400, 1024 and 1440 px; keyboard path to Withdraw and its input |
| D14 Team look | 5 | Same tokens and rule-line pattern as the Withdraw row it replaces |
| D16 Testability | 4 | Each fix has a fail and a pass case; 7 failed before the fix (builder's run, not re-run by me); the field path is untested |
| D17, D20 | simulated only | No intended user walked it |
| Others | n/a | Not touched by this diff |

## Not checked
- A real screen reader.
- A second real author: the demo has one author, so "not mine" was set up through SQL, as in the builder's check.
- Mutation testing: I did not revert the fix to watch the checks fail.
- Timings against the STANDARDS §9 budgets.

**Verdict: Block (Changes needed) on commit `10939d21`.** Fix issue 1 (Major): the proposer-only withdraw must also cover new shared fields on server and page, with a test. Alternatively, record a Lead decision in `challenge.md` that fields are deliberately "any author" and correct the 403 wording. Issue 2 (Minor) should be fixed in the same pass.

---

## Re-review at `cddef56a` (31 Oct)
Diffs read: `10939d21..cddef56a`, and the whole N7 diff `origin/claude/reverent-mahavira-cef858..cddef56a`.

How I checked:
- Own copy `rev_n7c` on :4437; the web build already in `web/dist` was from cddef56a. No :4400, no `*_LIVE`, US$0.
- `check_runtime_n7.cjs`: **27/27** (a copy writing screenshots to /tmp).
- `tsc --noEmit`: passes for api and web.
- Browser walk on Program structure, the change page and To review.

**Issue 1 (Major): closed.**
- The proposer check is now in `withdrawChange` (`library-changes.ts:156-157`). It sits after the 404 and before the kind, status and note checks, so it covers every kind.
- New field: a fail case (403, still WAITING) and a pass case (WITHDRAWN) are both in the check.
- Page: Withdraw shows only when the change is `mine`, on a WAITING new field (`review-items.tsx:107`) and in `Correct` (`:160`).

**Issue 2 (Minor): closed.**
- `review-queue.ts:195` no longer gives "Needs you" to a non-proposer author on a returned remove, retire or restore. I saw this in the browser under "Waiting for others": "The person who proposed it sends it again or withdraws it. — No step for you".
- A new field still reads "Correct it" for another author, consistent with `resubmitChange` (any author corrects).

**Issue 3 (Minor, info):** left for qa, as agreed.

**Breaker fixes, verified:**
- B1: `Lifecycle.resubmit` is proposer-only. A non-proposer gets 403 and the change stays returned with its reason unchanged; the proposer's send-again returns it to WAITING. The check runs before the status and reason checks, which is correct. I also sent again by keyboard as the proposer.
- B4: on Program structure, another person's waiting change greys the row ("A change to it is waiting for a second person."); my own shows Withdraw. "Send again" on a returned row appears only for the proposer (0 instances when not mine, 1 when mine).
- The contract change in `contracts/structure.ts` (`pending.mine`) is additive. `rowAction` has a single caller, `structure.ts:60`.
- B5: `attachments/sample` with no body, with or without a JSON content-type, returns 400 "That sample is not in the official library." It no longer returns 500.

**New Minor 4 (Should): wrong words on a returned row that is not mine.**
- What is wrong: `lifecycle.ts:116` gives every pending change that is not mine `WHY.waiting`, "A change to it is waiting for a second person.". A RETURNED change is waiting for its proposer, not a second person, and the row's own red line above it says "Returned by Approver…".
- Seen in the API at :4437: `pending.status: "RETURNED", mine: false` gave `why: "A change to it is waiting for a second person."`.
- Fix: when `status === "RETURNED"`, use the wording from `review-queue.ts:195`, "The person who proposed it sends it again or withdraws it.". The status needs passing into `rowAction`.

**Open product question, not blocking this commit: break B3.**
- `resubmitChange` (`library-changes.ts:134`) lets any author correct a returned new field. The second-person check compares the approver only with `proposedBy`. So a second author can rewrite someone's returned field and then approve their own words.
- This behaviour is older than N7 and documented as deliberate (B1 comment; the queue wording). The builder has raised it in the PR for the Lead. It is latent today because the demo has one author.
- I record it so the Lead decides it explicitly: either make it proposer-only, or record the corrector as the person the second-person check must differ from.

**Journey score at cddef56a: 9/10, pass.** Next step obvious and correct data are back to 1. Speed stays ½ because I did not time it against §9.

D-scores that changed:

| D | Score | Evidence |
|---|---|---|
| D2 | 4 | Withdraw and send-again are proposer-only on the server for every kind; B3 is left to the Lead |
| D9 | 4 | Queue and page agree; Minor 4 wording |
| D16 | 5 | Each fix has a fail and a pass case (27 checks) |

**Verdict: Approve on commit `cddef56a`.** There is no open Blocker or Major. Minor 4 (Should) and Minor 3 (qa) can go in a later PR. B3 is the Lead's decision.

---

## Re-review at `aef48f3a`: Minor 4 delta only (31 Oct)
Diff read: `cddef56a..aef48f3a`, which touches `contracts/lifecycle.ts`, `api/src/lifecycle.ts`, `api/src/structure.ts`, `contracts/structure.ts` and `check_runtime_n7.cjs`.

How I checked:
- Own copy `rev_n7d` on :4438, now stopped. No :4400, no `*_LIVE`, US$0.
- `check_runtime_n7.cjs`: **28/28**, run twice.
- `tsc --noEmit`: passes for api and web.

**Minor 4: closed.**
- In the browser on Program structure (Corporate and employers), another person's returned remove now reads: "Returned by Approver: Check again (walk)", then "A change to it was returned to Content reviewer: only they send it again or withdraw it.". There is no Send again.
- Another person's waiting change still reads "A change to it is waiting for a second person.".
- My own returned change shows Send again (1).
- To review still agrees: "The person who proposed it sends it again or withdraws it."
- The name comes from `ACTORS` with a fallback and never shows an id. The new `pending.proposer` in `contracts/structure.ts` only adds a field, and `rowAction` still has a single caller.
- The new check asserts the exact sentence and the proposer.

**Not a finding here:**
- The Form library row (`form-row-action.ts`, owned by the forms lane) has the same "waiting for a second person" wording for a returned change. The builder has listed it in the PR for forms.
- An APPROVED change that is not mine also still reads "waiting for a second person", although it is waiting for the release. That is older than N7 and outside this delta; noted for the screens lane.

**Verdict: Approve on commit `aef48f3a`.** No Blocker or Major is open. Minor 3 (GRAPH.md) is with qa, and B3 is the Lead's decision.

---

## Re-review at `aef35efa`: the two merges and B50 / P-193 (31 Oct)
Read: `git show aef35efa`, the combined diffs of `912dccfa` (origin/main) and `d76f4d9d` (#113 at `52d2c2be`), and `git diff origin/main...aef35efa`. Copies `rev_n7e` :4436 and `rev_n7f` :4437, both stopped. `P2_LEDGER_DIR=/tmp/rev_n7e-ledger`, no `*_LIVE`, no :4400, US$0.

**Checks run**
- Web built; `tsc --noEmit` passes for api and web.
- `check_runtime_n7.cjs`: **32/32**, twice. `check_screen02_fix.ts`: 61/61. `graph.mjs`: G1/G2/G4/G5/G6 0; the one G3 (`GET /attachments/:id/file`) is not N7's.
- Each new rule fails its test when removed:
  - Server back to "or an author": the B50 403 step fails.
  - Queue back to `needs` for an author: 31/32, the B50 queue step fails.
  - Page back to the old condition: the `[data-withdraw-not-mine]` wait times out and the check exits 1.
- My own journeys (`/tmp/rev_n7e/journey.cjs`, untracked): 31/32, twice. The one miss is under Minor 2.

**Merges: held**
- `review.tsx`: `problemLine` keeps main's message-once branch, and N7's `roleKeysInWords` applies only to the Derived-fields label. The import is from `@/pages/job`. The changes table also uses `roleKeysInWords`. On With an LMIA's review tab: no doubled "X: X:" and no `subject_…` key.
- `main.ts`: the `@Module` list is main's exactly. It is a superset of #113's (it adds `OfficialPagesController` and `OfficialPagesService`), so nothing is dropped. Against origin/main, `main.ts` differs only by N7's own lines: the upload door removed, the sample comment, `b?.officialFile`, and `demo/load` taking a body (from #113).
- Only N7 and #113 are on the branch. `origin/main..aef35efa ^52d2c2be` is N7's five commits (`10939d21`, `cddef56a`, `aef48f3a`, `53eb01f4`, `aef35efa`). Everything else is in #113's head `52d2c2be`.
- Main + #113 conflict on their own only in `main.ts`, and this branch resolved that. The branch also merges cleanly with today's origin/main `eddb4b94` (#129, #130).
- No caller of the removed `POST /combinations/:id/attachments` remains. `check_forms_demo.ts` moved to `/intake`; only N7's 404 fail-check calls the old route.

**B50 / P-193 at `aef35efa`: held as written**
- `library-changes.ts:137`: a non-proposer's resubmit is 403 "Not yours", naming the proposer from `ACTORS`. I checked it for the Configuration author and for the Approver; label, meaning and status do not change.
- The proposer corrects by keyboard: Name, then Tab to "What you corrected"; Send again stays disabled under 8 characters; Enter sends.
  - Result: a toast "… sent to a second person again", back on To review, WAITING, version 2, the draft field renamed, one change row.
  - A second send is a 409 in words.
  - Then the Approver approves it: APPROVED, decided by user-B.
- A proposer without the author duty (Content reviewer) corrects a non-English name. Zero-width characters and spaces are removed.
- The page for another person's returned field (`review-items.tsx:97`) shows "Only Content reviewer can correct it or withdraw it." It has no inputs and no Withdraw, and the return reason stays visible. Axe 0. No sideways scroll at 1024 and 400 px, or at 200 % zoom of a 1024 window (screenshot checked). `Correct` always carries `Withdraw` now, which is right because it renders for the proposer only.
- To review (`review-queue.ts:195`) files it under "Waiting for others" with "The person who proposed it corrects it or withdraws it.". The proposer's link reads "Correct or withdraw".
- The `main.ts:84` comment says why the sample route is not `/intake`.

**Major 1 (Should; for the Lead, not from this diff): another author can still rewrite a returned field by other routes and then approve it alone.** This is breaker R3-1/R3-2; I reproduced it on :4436.
- Setup: the Content reviewer's field is RETURNED.
- The Configuration author calls `PATCH /library/fields/person.rev_x` with a new meaning: 200.
- The Content reviewer sends it again with a reason only: 201.
- The Configuration author approves it: 201, APPROVED, `decided_by user-A`.
- Result: the draft's meaning is the approver's own text. The resubmit also set `updated_by` back to `user-C` (`library-changes.ts:148`), so nothing shows who wrote it, and neither edit has an audit line.
- Cause: `updateField` (`studio.ts`) and `renameField`/`renameSection` (`library-sources.ts`) check only the author duty, and `decideChange` (`library-changes.ts:83-85`) compares only `proposedBy`/`appliedBy`.
- These routes are older than N7 and unchanged by it. The demo has a single author, so the gap is latent. It is still the exact gap P-193 gives as its reason, so B50 is not closed end to end.
- Fix, one of:
  - (a) refuse those edits while the key has an open change, unless the person is its proposer;
  - (b) record each editor on the change and make the second-person check differ from all of them.
- Breaker R3-3 (a corrected document type or section name is never written to its draft, since only `kind === "field"` is) and R3-4 (a returned accepts or who-fills change cannot be corrected or withdrawn) are also older than this diff. I did not reproduce them.

**Minors (Should, later PR)**
1. `library-changes.ts:136-137` checks the status before the proposer, so a non-proposer gets 409 "this one is waiting" instead of 403. The lifecycle path checks the proposer first (`lifecycle.ts:250`). This is harmless, but the two paths are inconsistent.
2. Correcting or withdrawing a field writes no `audit_event` line. That is older than N7; resubmit for lifecycle kinds does log (`lifecycle.ts:278`). STANDARDS audit rule.

**D-scores changed:** D2 4 (P-193 holds on `resubmit`; Major 1 is another route) · D16 5 (each B50 rule has a fail and a pass case and fails when removed).
**Journey score at aef35efa: 9.5/10, pass** (`journey-test-reviewer-2026-10-31.md`; correct data ½ for Major 1 and the missing audit line).
**Not checked:** a screen reader; a real second author (set up through SQL); breaker R3-3 to R3-5; the two `*_LIVE` suites (CI).

**Verdict: Approve on commit `aef35efa`.** The merges are correct and this diff carries only N7 and #113. B50 holds on the resubmit route, on the page and in the queue. Major 1 is older than N7 and sits on routes this PR does not touch; the Lead should open it as a follow-up before marking B50 closed.

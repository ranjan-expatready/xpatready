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

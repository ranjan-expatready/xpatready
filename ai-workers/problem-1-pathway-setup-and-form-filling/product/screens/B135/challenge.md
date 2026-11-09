# B135 · C6.13 Filing changes while preparing: fresh challenge

Challenger: a fresh context that did not draft the concept (screen-concept part B), 7 Nov 2026, branch `claude/intelligent-noether-qkzc6a` at 4eee6aefc. Read: `concept.md`, `design/draft-filing-changes.html`, `best-in-class-sources-2026-11-07.md`; row B135 and P-406 on `origin/lead/2026-11-07-lead30`; PRODUCT, STANDARDS, EXPERIENCE, QUALITY; AG-07 v3.12 (AG-7-4, AG-7-45 with BR-31, AG-7-50), SA-01B v2.1 (SA-1B-219, SA-1B-213); the founder's boards P-164 and P-122; and the code listed below. `ai-workers/tools/freshness.sh` **failed** in this copy (`code/README-copies.md` missing: `code/` is not in the cloud copy), so the freshness of the team's code captures is **Unverified**. The requirement snapshot used is `domain/requirements-2026-11-02/`. Paths below are relative to `prototype/studio/` unless they start with `domain/` or `product/`.

## Verdict
**Build after these changes.** The rules for fees and filing ids are sound and the arithmetic is right. One Blocker: Make principal silently changes which answers count as confirmed, and so what fills the forms. Six Majors must also be fixed before building: the recorded-as-submitted boundary, the Ready to file claim, where the reason is kept, a second door that skips the rules, applications filed on the principal's application, and who signs for a minor. None of these needs a rethink. Each is a rule or a guard with a test.

## Objections

### Blocker
**B1. Make principal changes which answers are "confirmed", so it changes what fills the forms. Neither the preview nor the tests say so.** *Needed for the proof.*
* **Fact (high confidence).** Whether an answer is confirmed depends on the person's role, not on who typed it. `engine/runtime/case.ts:55-68`: a questionnaire answer counts as the client's own (confirmed) when its person's role is `principal`. For an adult in any other role it reads "answered by the principal" until that adult or the officer confirms it (P-78). Only confirmed facts are written into a form (`engine/runtime/forms.ts:3,38`). The client is one login that answers for everyone (`web/src/runtime/cases.tsx:192`). Make principal leaves that login with the same person (`Case.clientActorId`, `prisma/schema.prisma` model Case).
* **What breaks.** Sample Client A (the login) typed Sample Client B's passport facts. Today they wait for Client B to confirm. After "Make Client B principal" they count as Client B's own and fill Client B's IMM 5257 at once, although nobody confirmed them. At the same moment Client A's own answers become "answered by the principal", so they drop out of Client A's forms. Concept BR-3 says "Answers stay under each person". Test C6.13-6 checks that the answers are unchanged in SQL, and it passes. Yet the forms change, and nothing names the change. QUALITY D2 would score 1 (data at risk).
* **Retrofit, part of the cause (side 6).** In the team's model the `PRINCIPAL` role belongs to each filing. In Visitor visa every person is principal on their own filing (AG-7-4 rule 2, `domain/…/AG-07…md:595-596`; SA-1B-219 rule 1: "It is never a filing role… Client A is the principal applicant on her own filing"). The case's principal is also the case's client (AG-7-4 rule 1, AG07-D22 Q43). Our `CaseParticipant.role = principal` is that case-level principal: the person who carries the family maximum and answers the household questions. AG-7-45 rule 9 swaps a role inside one filing, so it does not cover what our Make principal changes. The concept gives no mapping.
* **Fix.**
  1. Add one line to concept §2 that maps our `principal` to the team's case principal and case's client, and keeps each filing's own principal.
  2. Decide who the client is after a swap (Question 1 below).
  3. Base "the client's own answers" on that decision, not on the role (`confirmation`, `engine/runtime/case.ts:62`). The P-242 rework (L-SA6) has the same need.
  4. The preview names, by person, how many answers change confirmation.
  5. Add two pack checks. Pass: after the swap, the new principal's answers typed by the client are still waiting. Fail: one of them fills the form.

### Major
**M1. "Refused when submitted" is drawn for one filing, but the case's submission is recorded for the whole group.** *Needed for the proof.*
* **Fact.** Recording a submission records the whole submission group in one action (`api/src/submission.ts:2,122-129`). Today, once any filing is recorded, every change to the people on the case is refused (`refuseIfCaseRecorded`, `api/src/submission-record.ts:30-35`; used by `updatePerson`, `api/src/runtime.ts:259-262`). A filing that comes back is put into the family group (`api/src/case-prepare.ts:145-147`).
* **What breaks.** BR-7 and board frame 4 refuse only the recorded filing's own row. Make principal is the only change refused case-wide. Example: the family group is recorded on 3 Nov and Child A1 is "not travelling". "Add filing back" would put Child A1's filing into a submission that is already recorded and change its biometrics maximum. Likewise, removing a filing that was split out would go through the existing case-wide refusal and get its unrelated words: "A new applicant goes on a new case".
* **Fix.** All three changes keep the case-wide refusal. The rows of filings not yet recorded say: "The family's submission was recorded on 3 Nov (V312345678): people on this case are not changed here. Withdrawing is done in the case's lifecycle." The API returns the same words with status 409. Add a pack check that "Add filing back" on a case with a recorded group is refused and nothing is changed.

**M2. The claim "Ready to file goes back by C7.6's own rule" is untrue for the changes this screen makes.** *Needed for the proof.*
* **Fact.** C7.6 takes back a Ready to file mark only when the filing is **no longer ready**, and sets it to `NOT_STARTED` (`api/src/case-prepare.ts:378-385`). Readiness looks at forms, documents and fee editions, not at fee amounts (`engine/runtime/readiness.ts:151-161`). Filing statuses are `not_started`, `ready_to_file` and `submitted` (`api/src/submission.ts:56`). There is no "In progress". A removed filing keeps its stored `status` while it is inactive (`case-prepare.ts:148`).
* **What breaks.** Board frame 2 promises that Client A's filing goes from "Marked Ready to file" back to "In progress" when biometrics drops from CAD 170 to CAD 85. On read it would stay Ready to file. A filing added back comes back still marked Ready to file.
* **Fix.** The apply itself resets every filing in the preview's changes, plus a filing that comes back, from `READY_TO_FILE` to `NOT_STARTED`. It writes an audit entry in C7.6's form. The words are "back to Not started". Add one pass check and one fail check.

**M3. The reason is to be kept in the audit entry, against the C6.12 split's rule and STANDARDS §5. The board also reads it back on the row.** *Needed for the proof.*
* **Fact.** The C6.12 split keeps its reason on the group row, and the audit line says only that a reason was given ("Review M2, break B1", `api/src/case-prepare.ts:441-442`; `SubmissionGroup.reason`: "never in an audit line"). Runtime audit lines never hold typed text (`api/src/runtime.ts:5`, STANDARDS §5 "never logged"). The concept writes the reason into the audit `detail` "as the C6.12 split". Board frame 1 shows `Removed 7 Nov by the case officer: "Added by mistake"`. That means a case screen reading the audit table, which breaks STANDARDS §4 (modules talk through services, not each other's tables).
* **Fix.** Keep each change in a small table (`filing_change`: case, kind, subject, reason, by, at, before and after). This is an expand-only migration. The row and Undo read it, and the audit says "reason given". If the tech lead rules that the audit `detail` may hold it after all, record that ruling against the split precedent. "No migration" in concept §2 then changes.

**M4. A second door skips the preview, the reason and the refusals.** *Needed for the proof.*
* **Fact.** `PATCH /runtime/cases/:id/people/:subject {applies}` makes the same change as Remove filing and Add filing back, with no reason and no preview (`api/src/runtime.ts:251-266, 533`). Its audit line has no reason. C6.12's pack uses it (`acceptance/C6.12.test.ts:82-85`).
* **What breaks.** BR-6 says a reason is required, but one PATCH call with `{applies:false}` removes Client B's filing without one. STANDARDS §3.4 says every rule is checked by the service.
* **Fix.** Send both doors through one service method that holds the BR-1, BR-6 and BR-7 rules. The PATCH asks for a reason when another filing changes. qa adjusts C6.12-19 and C6.12-20 to send one. Or, if the tech lead keeps the PATCH reason-free, record that as a ruling.

**M5. On an application filed on the principal's application, Make principal moves the filing to a new id, and "Remove filing" means something else.** *Needed for the proof (the guard); the full behaviour is Not built.*
* **Fact.** The family filing is keyed by the principal: `filing-${principal.subject}` (`engine/filing-modes.ts:90`), with `on_principal` people added to it (`:96`). Stored filings are matched by owner (`api/src/case-prepare.ts:143`). Releases with `on_principal` exist (`samples/programs.json:376`; `tests/check_qa144_ee_release.ts`), and their filings are derived from the release's modes even without fees (`engine/runtime/filings.ts:185-186`).
* **What breaks.** Make principal on such a case turns off the family filing and starts or revives the new principal's. Every item is re-keyed to the new filing, and the chosen channels, entered sections, signing steps and reviews are left on the inactive one. That breaks C6.12's "ids stay". For an `on_principal` applicant, "Remove filing" does not remove a filing: the person becomes declared only.
* **Fix.** In C6.13, offer Make principal and Remove filing only where every role that may apply files its own application, as Visitor visa does. Anywhere else, refuse in words: "Changing the principal of an application filed for the family together is not built yet". Add a fail check.

**M6. Make principal also moves who signs for a minor. The preview does not name it, and a signed scan stays counted.** *Needed for the proof.*
* **Fact.** A minor's signer is "the principal applicant, as their parent", decided by role (`engine/runtime/signing.ts:24-30`; `engine/runtime/preview.ts:227`). Signing steps record who recorded the step, not who signed (C8.1 `SignStep`). P-223 (5) says a parent or legal guardian signs, and the principal only when the principal is that child's parent. Parenthood is to be read from the relationship record (SA-1B-213 rule 7), which is not built.
* **What breaks.** Child A2 (15) has an IMM 5257 signed by hand by Client A. After the swap the screen says Client B signs as the parent. The "Signed by hand" step stays done, and nobody is told. If Client B is a step-parent, the words are false.
* **Fix.** The preview lists each form whose signer changes ("Child A2's IMM 5257: now signed by Client B as parent; Client A signed it on 6 Nov"). A form already signed by hand whose signer changed gets a warning line (warn, never block). Who the parent is stays Unconfirmed: expert until SA-1B-213 rule 7 is built. Add one check.

**M7. The promise that the preview and Prepare application agree needs a shared derivation and a test. Q3 rules out the file that holds it.** *Needed for the proof.*
* **Fact.** Items, the "filled/signed" state, readiness and signers are worked out inside `CasePrepare.build`, which also writes the stored rows (`api/src/case-prepare.ts:76-171, 366-385`). Q3 forbids changing that file. The engine pieces are pure (`deriveFilings`, `wantedItems`, `render`, `caseChecklist`, `signersOf`).
* **What breaks.** A second orchestration in the new endpoint can drift from Prepare application. That breaks the concept's own claim "so the two screens always agree" (§4b).
* **Fix.** Build the preview from the pure engine functions in `engine/runtime/filing-changes.ts`, fed by the same reads, and read item states from the tables. Add a check: the preview's "after" (filings, applicants, fee lines per filing, total, item keys) equals `GET …/prepare` after the apply. That check is the proof that the two agree.

### Minor
* **m1. The test family is ambiguous and named differently from the pack.** CAD 470 → CAD 370 and test 3 ("2 filings, visa CAD 200") hold only when `FAMILY` has Child A1 **not travelling**. With all four travelling, the visa total is 400 → 300. The pack's spouse is "Sample Spouse A" (`acceptance/lib/m3.ts:73-78`), but the board says "Sample Client B". Fix: name the fixture as in C6.12-18 and use the pack's names. *Needed for the proof.*
* **m2. Stored `FilingApplicant.role` is not refreshed by a swap that changes roles only.** `sameApplicants` compares subject and mode, not role (`api/src/case-prepare.ts:131-133`). Fix: compare the role too. *Needed for the proof.*
* **m3. The basis covers people, roles and travelling, but the money also depends on ages and groups.** If a date of birth is corrected between preview and apply, the change goes through under a stale warning. Fix: make the basis the hash of the preview's own result. *Needed for the proof.*
* **m4. Undo is unspecified.** It needs a reason (BR-6) and a basis. Fix: Undo sends `undo` from the apply's answer, with reason "Undo: <reason>". *Needed for the proof.*
* **m5. Citation.** SA-1B-219 rule 5 fires on a withdrawn or refused filing, which are the team's events (C8.4, SI-18), not a removal before filing. The source for the warning before removal is the row (P-406) and AG-7-45 rule 9 ("shows a warning and never blocks"). *Needed for the proof (words only).*
* **m6. Missing failing tests.** BR-9 needs a fail check for another firm (404). BR-5(b) (a sponsor's filing is never removed alone) has no check, because Visitor visa has no sponsor: cite the existing C11.12 check or mark it Not built here. *Needed for the proof.*
* **m7. Words.** PRODUCT §4 defines "Withdraw" as "cancels a waiting delete or retire", so the case word in frame 4 collides with it: add a row to PRODUCT §4 or rephrase. The roles show in the release's own words ("Dependent child"), not "Child". The principal's row shows a ⋯ that has no item: drop it, or put the refused Remove filing item in it with its reason. *Needed for the proof.*

## What is sound
* **Fee arithmetic.** Checked against `samples/fee-table.json` and `engine/runtime/filings.ts:145-158, 233-242`. Visitor visa is CAD 100 per person (maximum CAD 500 from 5 people). Biometrics are CAD 85 per person (maximum CAD 170 from 2 people), not charged under 14 or over 79.
  * Before: three paying people, one aged 15. Visa CAD 300. Biometrics 3 × 85 = 255, capped at CAD 170 on the principal's filing. Total **CAD 470**.
  * After removing the spouse: visa CAD 200. Biometrics 2 × 85 = 170, not above the cap, so `cap_applied` is false and each pays CAD 85. Total **CAD 370**.
  * The board's lines ("CAD 170 for 3 people → CAD 85 for one person", "covered by the family maximum → CAD 85") are right.
  * After Make principal, the capped line moves to Client B's filing, because the payer is the principal (`:233`).
* **Filing ids are kept.** A filing is keyed by its owner, not its role (`engine/filing-modes.ts:90,95`; `Filing @@unique([caseId, subjectId])`). An inactive filing keeps its row and id and is turned back on (`api/src/case-prepare.ts:148, 152-165`). Its items come back with their ids and channels. So "Add filing back: same filing id and item ids" holds for Visitor visa.
* **`updatePerson` refuses the principal and co-filing roles.** The principal gets 404 "Only a spouse, partner or child…" (`api/src/runtime.ts:254-255`) and a co-filing role gets 422 (`:257-258`), under the case's row lock with `refuseIfCaseRecorded` (`:259-263`). The C11.12 PATCH has no screen: no caller in `web/src`.
* **The principal must be travelling** (`engine/filing-modes.ts:88-90`; BR-2 in `filings.ts:189`). Requiring it before Make principal is right.
* **Team rules followed.** No Remove control on the principal, with "Make someone else principal first" (AG-7-45 rule 9). Remove filing is not Withdraw (BR-31). Warn, never block. Withdrawal is left to the team (P-406 (1), SI-18). Refusals keep their words instead of greyed-out buttons. Every dependent filing is named, by person, with its numbers before confirming. Undo is offered instead of an irreversible confirm. Nothing is typed twice.
* **Q1 (spouse or partner only).** A parent cannot take the "child" role without breaking every child-of-the-principal fact.
* **Q2 (`dependsOnRole` Not built).** Correct, and stronger than argued: its trigger is the team's withdraw or refusal (see m5).
* **Scope is tight.** No history panel. No removal of a person. No AI.

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| People and filings table | `CaseParticipant`, stored `Filing` (read) | `GET …/prepare` `people[]` (existing) | Status words are the Prepare view's: Not started, Ready to file, Submitted (m1, m7) | C6.13-13 walk |
| Preview | none written | `POST …/filing-changes {preview:true}` → `engine/runtime/filing-changes.ts` (pure) | BR-4, plus answers whose confirmation changes (B1) and signer changes (M6); basis = hash of the result (m3) | C6.13-1; new check: preview "after" = Prepare after apply (M7) |
| Remove filing | `CaseParticipant.applies=false`; `filing_change` row (M3); `Filing.status → NOT_STARTED` on changed filings (M2) | apply; PATCH through the same service (M4) | BR-1, BR-6, own-filing combinations only (M5) | C6.13-2, 3, 12; Ready to file reset pass and fail |
| Add filing back | `applies=true`; same `Filing.id` and `FilingItem.id` | apply, Undo | BR-1; refused case-wide once anything is recorded (M1) | C6.13-4; add back on a recorded group: 409, nothing changed |
| Make principal | two `CaseParticipant.role` updates in one transaction under the case lock; `FilingApplicant.role` on sync (m2) | apply | BR-3; client and confirmation rule (B1); own-filing combinations only (M5) | C6.13-6, 7, 8; confirmation pass and fail (B1); signer named (M6) |
| Refused when recorded | `FilingRecord` (read) | 409 with date, number and "lifecycle" | BR-7 case-wide (M1) | C6.13-10 |
| Stale preview | none | 409 | BR-8 | C6.13-9 |
| Who | none | `reach(…, "officer")` | BR-9 | C6.13-11; other firm 404 (m6) |
| Audit | `AuditEvent` with "reason given" only (M3) | none | STANDARDS §5 | C6.13-12 |

## Questions for the founder (at most 3, recommendation first)
1. **After Make principal, who is the client whose own answers count as given (Declared or confirmed, P-78 as amended by P-242)?**
   * **Recommended: the client stays the same person.** The portal login does not move, and the rule follows the client's person, not the principal role. Only the fee lead, the household questions and the minor's signer move, each named in the preview.
   * Alternative: the client moves to the new principal, as the team's "the case's principal is the case's client" (AG-7-4 rule 1). The new principal then needs the login, and everything the old client typed for themselves waits for their own confirmation.
2. *(No second question for the founder.* M3's migration and M4's single door are the tech lead's calls; who signs for a step-child is the immigration expert's, Unconfirmed until SA-1B-213 rule 7.)

## Lead response

## Agreement

## Build discoveries

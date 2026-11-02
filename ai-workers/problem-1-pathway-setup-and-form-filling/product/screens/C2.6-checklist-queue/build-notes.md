# C2.6 — checklist lines through the review queue (QA-157), build notes

No new screen part, so no concept. This finishes C2.6 on the parts already agreed. The pages are the checklist job page (`web/src/pages/job.tsx`, now read-only) and To review › Proposals, which is unchanged except for the lines it now holds.

## What changed
- **Reading rules** (`api/src/saved-readings.ts`, `api/src/checklist.ts`):
  - A line under another program's part of the checklist is left out. The parts are listed in `PROGRAM_PARTS`; today the only one is IMM 5484 page 2, Super visa.
  - A line the checklist sends to the visa office waits as Decide.
  - "Any additional documents" is left out.
  - A quote is split from its "Note:".
  - Document types the library lacks are proposed to the library. A passport or travel document is proposed as an identity document read by coded lines, decided by its name only.
- **One door:** the replay writes through `insertProposals`. `LANDERS.requirement_line` (`api/src/proposals.ts`) writes a DRAFT line under the requirement writer's rules and needs the author duty. It accepts the line's new type in the same decision, and Undo takes them back together.
- **Old doors closed:** these answer 410 on a checklist draft and write nothing:
  - `apply-checklist`
  - the per-item decide
  - `accept-clean`

## Review and break rounds (PR 574)
- **Breaker:** 4 Majors, all fixed, each with a passing and a failing case in `tests/check_forms_c26_queue_breaks.ts`:
  - M1: Undo would orphan a line.
  - M2: a typed document type in an edit was ignored.
  - M3: an accept and a reject at once could both succeed. Fixed with a row lock in `decide`.
  - M4: a retired field was allowed in a condition.
- **Breaker Minors fixed:** m1 duplicate roles, m2 photos read by a person, m6 the words of Undo for a line, m7 the race message (fixed by the M3 lock).
- **Reviewer:** 2 Majors, both fixed:
  - M1: `accept-clean` was a third old door.
  - M2: the Decide words pointed to an Edit the queue does not have. They now say "Accept writes the AI's draft condition", or "reject it and add the line by hand on the combination's Documents". The AI's commentary is dropped from a landed condition.
- **Reviewer word Minors fixed:** no "(P-134)" in reasons, readable names in the left-out list, "US".

## Still open (Minors, for the tech lead)
- **The queue's panel has no Edit.** The API has one, so a Decide line with no condition can only be rejected and added by hand. Recommendation: an Edit of a line's condition on the panel is a small screens row.
- **The Decide band tip** (`contracts/review-proposals.ts`, screens' contract) still says "the two readings differ". Each item's own reason gives the true why.
- **Accept is shown to people without the author duty.** They get a 403 in words.
- **Proposed document types have no near-match check** (exact name and what it proves only).
- **A document type item left unused stays waiting.** This happens when its line was rejected, or landed on another type. Accepting it later adds an unused type.
- **`alternativeGroup` is not written** (`alternatives` is null).
- **The accept reply does not say** when a landed condition reads facts the library lacks. Release blocks those (P-223 (a)).

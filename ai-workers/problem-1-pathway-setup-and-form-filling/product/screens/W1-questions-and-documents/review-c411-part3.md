# Review: C4.11 part 3, the condition lander (commit 14eb433b, branch head 5f6a744e)

Reviewer, 1 Nov 2026. Short code review of the part-3 commit only (`git show 14eb433b`); the later merge of main is not reviewed. I read the code and did not run the app. No journey test this time (the time box is code-only), so this check has no journey score.

Decision checked against: the tech lead's option (a) on #319, BR-6. Accepting writes a WAITING `placement_condition` / `SET_CONDITION` change and never edits the question. A second person approves. At approval the code re-checks and writes a draft version with the condition and SHOW. The release publishes it. Undo removes the change through batchId. An accepted condition is not proposed again.

## What holds
- The lander never edits the question; it only creates a WAITING change carrying `proposalItemId` and `batchId` (question-condition.ts:43-45).
- Two accepts of different items on the same question: the advisory lock `placement_condition:<ws>:<key>` is taken before the OPEN check inside the decide transaction (question-condition.ts:40-41). Under read committed, the second accept sees the first one's committed row and gets 409 "Already waiting". Correct.
- Undo: the batchId delete (proposals.ts:345, 363) already refuses once the change is not WAITING, so an approved draft is never left without its change.
- The author's own approve is 403 because `appliedBy` and `proposedBy` are both the accepter (library-changes.ts:84-86).
- At approval, the code re-checks the same "before" tree and that the question is still placed, then writes the draft version through `revise` (question-condition.ts:59-62). If the check fails, screen02.ts:124-126 puts the change back to WAITING.
- Dedupe: accepted and edited items count as "gone" (draft-qd.ts:112-114), and the message says so.

## Majors
1. **To review always says "asked in 0 combinations".** question-condition.ts:42 counts `combination.count({ … sqrSections: { some: … } })`, but `Combination` has no relation called `sqrSections`. It is `sections SqrSectionSelection[]` (prisma/schema.prisma, model Combination). Prisma rejects the query and `.catch(() => 0)` hides the error. So `uses` is always 0, and the second person sees "(asked in 0 combinations; …)" (review-queue.ts:238) on a change that reaches every combination using the section. That is the main fact they approve against. Fix: use `sections: { some: { sectionKey: current.sectionKey } }` and drop the `.catch`. Add an L3 check that `uses` is at least 1 for a question that is placed.
2. **The raw action code shows on screen.** `SET_CONDITION` is missing from `ACTION_WORD` (library-changes.ts:23), and `actionWord` falls back to the code itself. The review-item header reads "SET_CONDITION when a question is asked: …" (web/src/pages/review-items.tsx:69). The release table shows the same (web/src/pages/release.tsx:61). Audit lines built with `actionVerb` get "sET_CONDITION". Fix: add something like `SET_CONDITION: "Change when it is asked:"`, or a verb and noun pair that reads well with `KIND_NOUN.placement_condition`, as QA-113 did for who fills. Also add `placement_condition` to `changeNoun` (library-changes.ts:28). Without it the 403 reads "You proposed this when a question is asked, so…".

## Minors
- question-condition.ts:67-71 `releaseCondition` marks an APPROVED change RELEASED whenever the question has no DRAFT. If the draft was discarded rather than published, the change still reads "Released" and no condition went out. This comes from `releaseFills`; better to check that the published version carries `m.after`.
- draft-qd.ts:112-114: when an accepted item's change is later Returned and withdrawn, the condition is never proposed again, and no condition reaches the library. The decision says "accepted is not proposed again", so this is not a defect. The case should be written in build notes so the founder knows about it.
- question-condition.ts:62: `revise` runs outside any lock that the who-fills apply also takes. Two approvals at the same moment, one condition and one who-fills on the same question, can both see the newest PUBLISHED version and both create version n+1. One then fails with screen02's "Nothing was deleted" wording, which is the wrong noun for this change. This is rare. A shared per-question lock, or a kind-aware message, would fix it.
- The To review line puts plain text and a sentence side by side: "Always asked → \"X\" is asked when …". The label strips the quoted subject (question-condition.ts:43), but the after text keeps it. This is readable, but the two sides do not match in form.

**Verdict: Block.** Fix Majors 1 and 2. The locking, the Undo path, the re-check at approval and the release hook are sound.

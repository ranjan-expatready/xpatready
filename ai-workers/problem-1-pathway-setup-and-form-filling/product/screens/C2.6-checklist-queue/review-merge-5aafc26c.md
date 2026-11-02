# C2.6 (#574) merge 5aafc26c — diff-only review (P-278)

Scope: `undo()` guard in `prototype/studio/api/src/proposals.ts:583-600` and the M1 regex in `tests/check_forms_c26_queue_breaks.ts:46`; auto-merged `draft-qd.ts`, `review-proposals.ts`. Read only; suites not run.

**Verdict: Approve** (no Blocker, no Major).

## (1) Both sides' intent and tests
* C2.6 line + its new type in one batch: the type is in `adds` (libraryChange ADD) and in `added` (decidedKey, match new); the keys collapse in the `Set`. The batch's own line is in `own` (`combinationId|lineageKey`, from `decidedKey.split(",")`, as `landRequirementLine` returns `keys.join(",")`), so `.find` skips it and Undo proceeds. Same as the PR side.
* C3.6 case (type accepted alone, then a hand-added line via `saveRequirement`): that line is not a proposal row of the batch, so it is not in `own` and the guard fails with 409 "already used by a checklist line". C3.6 test regex `/used by a checklist line/` (check_forms_c36_requirement_type.ts ~130) still matches.
* C2.6 M1 test (type batch X undone while line batch Y uses it): the line is not in X's rows, so 409; message now contains "used by a checklist line on Visitor visa" and matches the new regex. Undo of Y first, then X: 201 each (Y's undo needs no type key; X then finds no line).
* Alternatives: main's `array_contains` kept; a line outside the batch naming the type only as an alternative is refused (C3.6 behaviour retained).

## (2) Lock order and deadlock
* `lockItem` sorts and dedupes, and builds `library-item:<ws>:document_type:<key>`, the key `saveRequirement` (studio.ts:778) and `landRequirementLine` (proposals.ts:308) use. Undo takes its locks before reading lines, at the start of the guard, and takes no other advisory lock after.
* Against the line door: line save first, undo waits, then sees the committed line and refuses. Undo first, the save waits, then its `refuseRetired`/"still in library" re-read (studio.ts ~781) refuses on the removed type. Both races close, as in #573 round 3.
* Against `landRequirementLine` in `decide()`: a different transaction; same lock, no nesting inside undo, so no self-deadlock.
* Minor residual (below, m2), not new: a `decide` batch takes its locks item by item (unsorted across items) and holds them to commit; undo takes its set sorted at once. Two concurrent transactions over the same two type keys in opposite order could deadlock. Postgres aborts one (40P01, a 500) and nothing is left half done. It needs a decide and an undo of a different batch within 10 s on the same two new types, so it is unlikely.

## (3) Behaviour changes
* C2.6 now ignores RETIRED lines (`status: { not: "RETIRED" }`) and also checks `alternatives`. Both are correct: a retired line uses nothing, and an alternative does use the type. Neither weakens a refusal that should happen. A lineage whose older version is non-retired but whose newest is RETIRED still matches (every version is scanned): a false refusal, as on main; it only refuses safely, never wrongly allows.
* Wording: C2.6's "is now used by a document line on X" became "already used by a checklist line on X"; the one test that asserted it was updated, and no other file greps the old text. Gain: label kept, "remove that line (or undo its decision) first" covers both routes.
* One query per type key (N small, bounded by batch types); fine.

## (4) Auto-merged files
* `draft-qd.ts`: only the conditions v2 prompt, `inputsOf`/`charsOf`/`factNames` and the fingerprint's `questions`. `review-proposals.ts`: only the pickTitle wording. Neither touches `landRequirementLine`, the one-door wording ("the requirement writer's rules"), or the document_type lander. The `LANDERS.document_type` change from main (origin HUMAN when `r.step === "requirement_type"`) does not touch the C2.6 path (its step is the checklist step), so a type proposed beside a checklist line is still `AI_PROPOSAL`. No clash.

## Findings
* **m1 (Minor)** — `tests/check_forms_c26_queue_breaks.ts` and `check_forms_c26_checklist.ts` have no case for "a checklist line accepted together with its new type, then one Undo takes both back". `own` (proposals.ts:594) is now the only thing keeping that Undo from being refused by main's guard; a regression there passes every listed suite. Concrete failure: drop the `!own.has(...)` filter and no test goes red. Add the case (accept a line whose type is proposed beside it, undo that one batch, expect 201, type and line gone) when next in the file; not a gate.
* **m2 (Minor)** — possible lock-order deadlock between `decide()` (locks taken per item, unsorted, held to commit) and `undo()` (sorted set), described in (2). Postgres resolves it; nothing is corrupted. No change asked.

Verdict: Approve

# Review: C1.5 copy-one route (`POST /api/combinations/:id/lines/copy`)

Commit reviewed: 40f1f56fb637cb7c046688e312f9d284f07bd770 (working-tree HEAD equals it). API only, no screen change, so D1–D20 and keyboard/zoom checks are not applicable. Code read at that commit via `git show`. I did not run the suites: a test run was in progress in the tree, so builder's 18/18 and 97/97 are unverified by me.

## Verdict: Approve (no Blocker, no Major; two Should)

## Checks
- Concept fit (X2 concept §2): route, body, 409 words, Undo by batch all as written. Closes the "Route name" gap in review-x2b-c.md.
- Server authorisation: `need(actor,"author")` first (lines-bulk.ts copyOne); test covers 403 with nothing written.
- Field errors: Zod 400 via `problemFromZod`; key rules mirror the existing ones. Unknown target 404 (UUID shape checked first, so no 500 on junk ids). Unknown/foreign-workspace source: `evaluate` 404s, `ends` 404s.
- No per-row requests: one call, one batch. Reuses `copyFrom`, so audit, batch, Undo and retired-target refusal are unchanged.
- Tests: 10 checks cover 403, 400, 404, waits refused/allowed, pass, replay, already-has, own-source, Undo. The own-source and waits checks would fail if the rule were removed (they assert 409 and "nothing written").

## Your four points
1. **Replay-before-rules.** Sound. With a key, a lookup of `${key}#1` skips only the pre-check; `copyFrom` still runs its own replay, which returns 409 "Key used" if the key was used for a different actor/line/target. So skipping rules cannot write anything: a replay writes nothing, and a non-replay goes through `applyIn`. Race: `copyFrom` takes `FOR NO KEY UPDATE` on the target, then `applyIn` re-runs `evaluate` inside the transaction and refuses any non-tickable target (409 "Changed since the preview"). The pre-check therefore cannot let through anything the rules refuse. One gap, see Should 1.
2. **409 for own source.** Acceptable. It is a state conflict on a well-formed request, and the pack requires it. The dialog's preview answers 400 "Same combination" because there the pair is the input; the two routes differ in status but both say nothing changed. Not a defect; worth one line in the API notes.
3. **Random key when none sent.** Acceptable. The caller gets `batchId` for Undo. A blind retry without a key cannot double-write: the second call is refused 409 "already has it". Only the "replayed" flag is lost, which is fine.
4. **Live AI off, US$0.** Confirmed by reading: the change touches no AI, extraction, finder or priced call; only Prisma reads/writes and Zod. No new dependency (`zod` already used in the API).

## Issues
1. **Should** (lines-bulk.ts:580 vs `applyIn` 227–233): `withdrawSubmission` is only checked in the pre-check. `WAITS` is tickable inside `applyIn`, so if a submission appears between the pre-check and the transaction, the copy goes ahead and withdraws it without the caller having asked. Narrow window, same as the dialog's behaviour; fix is to pass the flag into the transaction or re-check `WAITS` there. Not blocking: the data is a draft and Undo restores it.
2. **Should** (lines-bulk.ts:567–568, 575): `tgt.retiredAt` is not selected, so a retired target gets the evaluate preview first; `copyFrom` then refuses it 409 "Retired", so the outcome is correct but the words come from the later check. No action needed unless the words differ from the dialog's.

## Could not check
Running the pack and the 97 checks; retired-target and cross-workspace paths have no test of their own (covered only by reading).

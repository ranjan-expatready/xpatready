# Review: runtime Minors 1 Nov (branch claude/runtime-minors-1nov)

Reviewed commit: **fb1dd7ff** (`git diff origin/main fb1dd7ff`, origin/main = 73396df2). This is the head after main (#113, #278) was merged in. The first head reviewed was 3a393dce; its QA-112 drawer change was dropped in favour of main's fix (38289ef6), so QA-112 is outside this review. This is a small Minors PR, so there is no full concept or D1–D20 pass. The reviewer did not build it.

## What changed (code)
1. `api/src/people-ai.ts`: new `peopleWorstUsd(perAttempt) = round2(2 × runWorstUsd(perAttempt, 2))`. Each round is rounded up to the cent and held to RUN_CAP_USD. Used by the "Who fills it" AI-now plan.
2. `web/.../questionnaires.tsx:381`: the bulk toast now reads "… for N questions" instead of "… on N questions".
3. `tests/check_cost_check.ts` (3 checks), `tests/check_w115_slice2_browser.cjs` (3 toast checks; the wait for the refusal list now fails loudly instead of being swallowed). Slice 2 screenshots were re-shot. One-line `qa/built/` records for C10.1, C3.11 and C11.7.

## What I ran (clean `git archive` exports in /tmp, isolated copies on 4441–4447, US$0, no *_LIVE set)
- The shared clone at /home/user/xpatready gained staged changes from someone else while I worked. My first browser run used that tree and its result is discarded. Every result below comes from an exact export of the commit.
- fb1dd7ff: check_cost_check **109/109** · check_who_can_be_qa **9/9** · check_s5_people_ai **15/15** · check_qa99_who_can_be_trail **3/3** · check_w115_slice2_browser **58/58** · check_who_fills_browser **27/27** · check_s5_leadcheck **46/49**.
- The 3 leadcheck FAILs (C11.12 L9 pass and fail, "7/2" person roles after reset; C11.6 L5 IMM 5409 "cannot_tell") are identical on **origin/main 73396df2** (46/49, fresh copy). They come from main, not this PR. Flagged for the lead below.
- 3a393dce (first head): cost 109/109, who_can_be_qa 9/9, people_ai 15/15, qa99 3/3, leadcheck 48/49.
- `vite build` was run in each export before the browser suites.
- My own probe (/tmp/rv/req.mts) builds the exact request the runner prices (`p2/prompt.ts buildRequest` with the real template, schema and guide inventory) for every guide in `p1/inventory`.

## Findings, ranked

**M1 (Major). The people AI worst case is still below what the runner may reserve, and the new test asserts the opposite.**
`people-ai.ts:107` prices each attempt from `inputTokenBound(g.text)`, which is the guide text alone. The runner (`p2/runner.ts:60`) prices `inputTokenBound(JSON.stringify(req))`, and `req` also carries the system prompt (who-can-be.v1.md 2,577 B, check 1,734 B), the output schema (1,126 B), the `<input …>` envelope, the combination trail and JSON escaping. Measured at fb1dd7ff, shown worst case vs what the two rounds × 2 attempts may reserve:

| guide | shown | runner may reserve |
|---|---|---|
| 5256 | US$1.12 | 1.1762 |
| 5269 | 0.92 | 0.9720 |
| 5289 | 1.74 | 1.8098 |
| 5487 | 0.88 | 0.9370 |
| 5553 | 0.96 | 1.0107 |

So every real guide is under-stated by US$0.05–0.07. The rounding fix is real but small: at most half a cent per round. The old `round2` under-statement is also real, e.g. US$0.0124 showed as US$0.01. The PR's comment and the check "C11.12 pass: the people AI worst case is never below what the two rounds may spend" therefore state something the code does not do. The test only exercises a synthetic per-attempt number, so it cannot see this.

Effect:
- STANDARDS "[M] cost estimated before launch" and P-179 ("the warning never says fits when the ledger would refuse") are not met for this plan.
- `propose()`'s "Over the spending cap" check (people-ai.ts:120) can pass when what is left of the cap lies between the shown and the reservable amount. The ledger would then refuse round 2 after round 1 was paid.
- Money stays capped, because the ledger is the guard, and AI now is gated off until the founder approves a trial. That is why this is Major and not Blocker.

Other plans bound this with margin: forms `ai.ts:226` uses +30 000 B or the last real `request_bytes`, and A4 `sources.ts:323` uses +8 000.

**Fix:** price each round from what is sent, for example `buildRequest(template, schema, [inventory], {combination_trail})` per round (draft and check templates differ). Alternatively add the template, schema and envelope bytes plus a margin. Add a check that compares `peopleWorstUsd` with the runner's own pricing of the built request for a real `p1/inventory` guide. It must fail on today's code.

**m1 (Minor). The merge deleted main's evidence and left orphan screenshots.**
- `screenshots/who-fills/05-case-fact-no-documents-{1024,1440}.png` is deleted vs main. `check_who_fills_browser.cjs:107` still writes it, and it is #113's evidence for QA-112. Fix: restore it from origin/main (P-188).
- `screenshots/slice2/09-drawer-case-fact-no-document-*`, `10-needs-you-release-check-*` and `11-read-only-approver-*` are added, but no step at fb1dd7ff writes them. They are left over from 3a393dce's dropped QA-112 step. The 09 image shows drawer code that is no longer on the branch. Fix: drop the three pairs. The test now writes 09-needs-you and 10-read-only.

**m2 (Minor, pre-existing, same line).** `peopleWorstUsd` holds each round to RUN_CAP_USD (US$5), but the job runs with `budget_usd: 1` (people-ai.ts:184). For a very large guide this over-states, which is the safe direction. The check "each round is still held to the run cap" (2 × US$5) describes a cap the run never uses. Worth aligning when M1 is fixed. Not blocking.

## Questions asked of me
- **Worst case correct and never below the reservation?** No: see M1. The rounding half is correct: runWorstUsd rounds each round up, and `round2` of a sum of whole cents is exact.
- **Old under-statement real?** Yes, by at most half a cent (US$0.0124 showed US$0.01). It is small next to M1's US$0.05–0.07.
- **Other "on on" or doubled "No document supplies it"?**
  - No `\bon on\b`, `for for` or `the the` in web/src, api/src, engine or contracts.
  - The bulk `what` strings (`fact-sources.ts:186`, "where the answer comes from set to …" and "pre-qualification on/off") read correctly with "for N questions".
  - The audit line says "changed N questions in "…": …", which is fine.
  - "No document supplies it" appears once, in main's drawer.
- QA-112 questions: skipped, as directed (main's fix is taken whole).

## Journey test (reviewer role; one score for this check)
Persona: content publisher (`user-A`) on "With an LMIA", Questionnaires tab. Walked in headless Chrome by script (/tmp/rvj/journey.cjs), plus the builder's slice 2 replay, re-run by me.

| Journey | Result |
|---|---|
| J1, keyboard only: Space ticks one row, the bar says "1 selected", choose Ask in pre-qualification | Toast "Pre-qualification on for 1 question" with Undo (singular correct). axe clean. One row changed. Audit "changed 1 question in "With an LMIA": pre-qualification on". Undo by Enter restores. |
| J2, 400 px: tick 2 document rows, "Do not ask" | No sideways scroll and the bar is usable. The rows were already off, so the server skips them ("already as chosen", fact-sources.ts:178): no toast and no words, and the bar stays (pre-existing, not this PR). |
| Slice 2 replay (2 rows "on", Undo; set to the client for 2, Undo; refusals in words) | 58/58, axe and 1024 px clean, no console errors. |

Score:

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 |
| Next step obvious | 1 | J1 |
| Plain words | 1 | "for 1 question" / "for 2 questions" |
| Feedback and state | ½ | A no-op bulk change says nothing (pre-existing) |
| Correct data | 1 | One row changed, audit line present |
| Error recovery | 1 | Undo by keyboard |
| Accessibility and screen sizes | 1 | axe, 400/1024/1440 |
| Speed | 1 | Every step under 1 s, settle-bound |
| Visual quality | 1 | |
| Trust and sources | ½ | The AI-now cost shown is below the reservation (M1) |

**Journey score: 9/10.** Pass on the toast journey. The ½ marks come from M1 and the pre-existing silent no-op.

Not checked: a real screen reader, any paid run (US$0 only), and an intended user's unaided walk (D17/D20 stay with the founder).

## For the lead (outside this PR)
check_s5_leadcheck fails 46/49 on origin/main 73396df2 (C11.12 L9 ×2, C11.6 L5), which looks like it came in with the #113 merge. The shared clone /home/user/xpatready had someone else's staged merge in progress during this review; I did not touch it.

**Verdict: Block.** Fix before `review: approved`:
1. M1: price the people AI worst case from the request the runner sends (template, schema, envelope, trail) per round, and add a check against the runner's pricing of a real guide that fails on today's code.
2. m1: restore `who-fills/05-case-fact-no-documents-*` from main and drop the orphan slice 2 shots 09-drawer-case-fact-no-document, 10-needs-you-release-check and 11-read-only-approver (Minor; fix in the same push).

The toast fix (questionnaires.tsx:381), its checks, the loud wait, and the `qa/built` lines are correct and can stay as they are.

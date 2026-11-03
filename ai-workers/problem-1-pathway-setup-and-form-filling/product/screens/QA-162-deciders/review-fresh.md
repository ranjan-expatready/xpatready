# QA-162 deciders (PR #744, f8c88db44): fresh review

Read from `git diff origin/main...f8c88db44` and from `fact-words.ts` / `qd-conditions.ts` at that commit. I did not start the studio or run the suites. The one thing I ran was a small script against `findFact` (item m1). The builder's 28/28 and 54/54 are not re-verified here.

## (a) Is "can take the answer" a guess QA-194 forbids?
No. It is a legitimate use of the condition's own content, with one limit (m1).
- QA-194 removed a tie-break that chose by the question's own key (shorter key wins), which has nothing to do with what the AI said. This filter uses a hard fact in the condition: the answer `when`. A question that `answerOf` refuses cannot be the decider anyway, because the later `answerOf` call (qd-conditions.ts:98) drops it.
- Dropping candidates that would be refused cannot turn a correct condition into a wrong one. Two takers are still none, and every one is named (the fallback re-runs the wider search, so the reason lists the same candidates).
- Fit with the QA-194 wording: its reviewer withdrew "leaving the target out of its decider's candidates". This PR leaves the target in (the pool is only widened, and the target lookup is unchanged). A target that is the sole taker gives "cannot decide itself" (line 91), not a guess.
- The decider's `how` stays `words`. So `loose` is set, `named_exactly` fails and the item goes to a person's check, never Ready (lines 143 and 148). I confirmed this by reading. A word-matched decider can never be made Ready by this PR.

## (b) Can the filter pick a wrong decider?
- A yes/no twin pair: both take "yes", so the result is several, none picked. This is correct, and the fail check on "Other names used" covers it.
- A country or other answer list holding "Yes" or "Other": `answerOf` needs an exact normalised key or label equal to `when`. A list with an "Other" entry plus a words-fit to the pick would be taken. That is the intended case, and it is the same list the condition's answer names. If two lists hold "other", that is several, so none. Low risk.
- A free-text twin that the AI actually meant is not a case at all, because such a decider is refused later.

## (c) Fallback
Correct. The filtered pool is a subset of the unfiltered pool, so if the filtered search says "several", the unfiltered search says "several" with a superset (same or longer candidate list in the reason). If the filtered search says "none", the unfiltered result is exactly the old behaviour, including the later `answerOf` refusal text. I found no path where the fallback skips the refusal.

## (d) Anything Ready that should not be?
No. Words-matched deciders are never Ready (see (a)). `askedOnly` skips `rule_only` placements and the representative, and the C5 "asked first" check still runs on the new deciders.

## Findings

### Blockers
None.

### Majors
None.

### Minors
- m1. qd-conditions.ts:~88-89. The filtered search runs first, so an exact name can be overruled by a word match among the takers. QA-162's own rule (fact-words.ts, "an exact name is never overruled by a wider search") is bypassed. I showed it with `findFact`: with "Marital status" and "Marital status note" both in the pool, the unfiltered search returns `marital_status` (exact), and the search over only the second returns `marital_status_note` (words). If the exactly named question cannot take the answer but a word-superset question can, the superset becomes the decider. The harm is limited: the result is `how=words`, so it is flagged `loose` and goes to a person. Suggested fix: run the unfiltered search first, and use the filter only when it returns "several".
- m2. The tests prove the intended cases (other name, national ID, green card, Other purpose details) and the twin fail case. They do not cover m1 or the case where a filtered unique taker differs from an exact-name hit. Add one check on `conditionProblem` with a synthetic snapshot.
- m3. The test file keeps two near-duplicate checks on "Other names used" (one from the earlier #735 check, one added). This is only noise.
- m4. Reversing #735's "Purpose of visit" check is documented in the test comment and in the PR. Say in the PR that this is a deliberate, narrow carve-out (the answer decides), so the QA-194 owner can confirm it.

**Verdict: Approve** (no open Blocker or Major). m1 is worth fixing before merge if it is cheap, because it is the one place the new code overrides the exact-name rule. It reaches a person, never Ready.

# Journey test, reviewer (Opus), QA-162 deciders, PR #744 at b2e4adc0c, 3 Nov 2026

Scope: C4.11 step 5. The saved conditional-question run #531 (Visitor visa, Guide 5256) is replayed into To review items at US$0. This is an engine-only change: the screens are unchanged.

The journeys were walked through the product's own step code (`conditionsFromRounds`) on an isolated copy on port 4457 (`xr_studio_rvo`, Visitor visa set up by `setup_visitor_visa.ts`). I did not use a browser. Showing these items on To review needs a Live or fake launcher run, which this session must not start (no STUDIO_*_LIVE).

## Journeys (the content publisher, then the approver)
1. **Main path.** The AI says "Other family names used is asked only when Ever used other name is yes".
   - Expected: one item, decided by IMM 5257's own Yes/No question, never Ready.
   - Got: `person.used_other_name = true`, Decide (first reading only), and a reason in words. **Held.**
2. **Alternate path: a list answer.** "Other purpose details when Purpose of visit is Other".
   - Expected: decided by the purpose list's "other", not by the free-text details.
   - Got: `case.visit_purpose = "other"`, role case, Check (both readings agree; the hiding warn plus loose words). **Held.**
3. **Alternate path: Yes/No questions that fill no form box.** National ID number and green card number.
   - Got: decided by `person.has_national_id` and `person.us_lawful_permanent_resident`, both Decide. **Held.**
4. **Error: the deciding question is not asked.** "Lived elsewhere past five years" and "Residence same as mailing".
   - Got: left out with "is not a question this combination asks of this person". **Held.**
5. **Error: the words fit two asked questions.** "Other names used" as the asked question.
   - Got: left out, naming both questions, never guessed. **Held.**
6. **Error: every question the words fit can take the answer.** Pure check.
   - Got: "could be 3 questions", every one named. **Held.**
7. **Exact name present.** "Marital status", where only its note could take the answer. Pure check.
   - Got: the exact `person.marital_status` stays the decider. **Held.**
8. **Recovery.** I re-ran the replay twice. Both times: the same 8/22 landed, the same 6 items, 0 Ready. **Held (no flakiness).**
9. **Step across the screen boundary.** To review shows the items; accept or reject happens there. **Not walked** (needs a launcher run).

## Break it
- **Mutations.** I removed, one at a time: the type filter, the exact-first order, and `askedOnly`. Each removal fails a test (pure 57/58, or integration 23/27 and 24/27). The code was restored and `git diff` is clean.
- **Exact twins plus a case-level exact question** (a pure probe of `pickDecider`).
  - The fallback returns the case-level question with `loose: null`, so it can be Ready. It is not one of the questions the tie named.
  - In the same path, a W2 fallback says "no other question of this person has them all", which is not true there.
  - **Minor** (review-opus m1). The current data does not reach it.
- **Reason text with "could be N questions" in the AI's words.** It sends the search to the fallback. The fallback searches a subset, so the result is the same. **Minor** (m2): the fallback is keyed on the reason's wording.

## Data underneath
- The item trees are exactly field + value + `subjectKind`.
- `roles` is the target's role, origin "ai", basis SAMPLE.
- Each item holds the quote and the run file.
- Every condition is landed or left out with a reason (test lines 110–113).
- Nothing is written to the database by this step's engine code.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | 8/22 land (was 4 on main) with the right deciders (journeys 1–3) |
| Next step obvious | 1 | Each item says "Decide: keep it or remove it" or "Check it is this question" |
| Plain words | 1 | The sentences use the library's own words. The false "no other question" text is not reached on #531 (m1) |
| Feedback and state | 1 | Ready, Check or Decide on every item; a reason on every condition left out |
| Correct data | 1 | The trees and values are right (`true`, `"other"`); the role is "case" for the case fact |
| Error recovery | ½ | Conditions left out say "so it is not guessed" but give no next step; not walked on screen |
| Accessibility and screen sizes | ½ | No UI change; not walked here (builder: `uxa1_counts_browser` 47/0, not re-run) |
| Speed | 1 | Pure; the replay plus checks finish in seconds; no request per row |
| Visual quality | ½ | No UI change; not seen on To review in this session |
| Trust and sources | 1 | AI origin, Sample basis, the guide quote, the replay run file, US$0 |

**8.5/10, pass** (8 or more, no criterion at 0).

To raise it: walk the To review screen with these items on a launcher copy (accessibility, visual quality, recovery), and fix m1 so a decider chosen by its answer type always says so.

Not tested: a real screen reader; an intended user's unaided walk (D17 and D20 stay with the founder).

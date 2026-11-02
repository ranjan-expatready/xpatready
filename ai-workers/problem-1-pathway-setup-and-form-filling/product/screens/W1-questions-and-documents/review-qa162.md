# Review: QA-162 (forms lane), commit cc3c3dbe, reviewer (did not build it)

Ran on isolated copies, port 4458 only, US$0, no STUDIO_*_LIVE switch set, no paid call. Both copies stopped.

## Evidence
- `check_forms_qa162_fact_words.ts`: 30/30.
- `check_forms_qa162_saved_matching.ts` (Visitor visa configured by its own setup, two fresh copies): 19/19 both times. C4.7 picks before 2/23, now 13/23 (7 queue items: 6 Check, 1 Decide, 0 Ready). C4.11 step 5 conditions before 0/22, now 4/22 (2 items, both Check). Every left-out item has its reason.
- `acceptance/C4.7.test.ts` on a fresh copy: **15/17 on the first fresh copy, 17/17 on the second fresh copy**. Not stable (finding M1).
- Replay of v1: `rounds.ts` compares a v1-prompt saved run only against `want.inputs.slice(0, 1)` (guide only) and the v1 prompt hash, keyed by the combination key. Test `R fail` shows a run recorded with other inputs is not replayed. `track-a-jobs.ts` is pinned to v1 so the paid-run job list is unchanged. I found no path that replays another run.

## Findings

### Major
**M1. The C4.7 acceptance (the "done when" gate) is flaky on a clean copy.** `acceptance/C4.7.test.ts:60`: `c = picks.slice(2).find(role !== "case")`. The queue orders by `createdAt asc` (`review-proposals.ts:53`). The 7 picks are inserted in one transaction, so the order is not guaranteed. Scenario, seen on my first fresh run: the third non-case pick was `person.criminal_history`. The test then sets it to "case officer", the server refuses ("a declaration or background answer: only the client gives it"), and 2 checks fail (15/17). Another fresh copy gave 17/17. The old test used rules picks, whose order and facts were fixed. Fix: choose the third pick from picks whose fact the server accepts as AGENT (not a declaration), or try the next pick on a 422. A gate that fails on about half of clean runs cannot show "C4.7 well above 5/19".

### Minor
**m1. The tolerant match can land on a question that only mentions the word (subset match against a long label).** Checked against Visitor visa's 240 real facts with `findFact`:
- "Marriage" and "Marriage date" land on `relationship.start_date` ("Date of marriage or date the common-law relationship began"). An AI pick meaning marital status or previous marriage would be mis-mapped.
- "Police" lands on `person.military_service`, because "police force" is in its label.
- "Health" and "Mental health" land on `person.disorder_requiring_services`. The synonym "condition" to "disorder" also does this ("Health conditions", "Health condition").
- "Accompanying" lands on the principal's own `relationship.accompanies_subject_to_canada`, a question about a family member.

These are safe by construction as far as they go: they are never Ready, they show "taken as", and an exact or several-way tie is left out. But the stated bar is "never invents a mapping", and a one-word pick that matches a single long label does so. Suggested fix, not new scope: require a pick of 1 word to be W1 only, or require the matched words to cover at least half of the label's meaningful words.

The other adversarial wordings behaved:
- Nationality maps to citizenship; Gender to sex.
- Criminal record to criminal history, not its details.
- Planned dates (first and last day), Visa, Country, Address, Residence, Passport and Expiry date all gave "several" and were left out.
- "Previous visa refusal" and "Overstay" gave none.
- Spouse and child picks never reach another person's or the case's questions.
- Role words are dropped only for that role.

**m2. The "tight" tie-break is sound but narrow.** It returns one question only when exactly one key is wholly inside the pick's words, so "Telephone number" resolves to the main phone and not the alternate. Equal ties go to "several". I could not build a wrong landing from it on this data.

**m3. Weak assertions that let a silent drop through.**
- `C4.7.test.ts:38` checks `proposed + dropped >= 7`, which is true of any result (7 + 10). It does not show that every saved pick is landed or listed.
- `check_forms_qa162_saved_matching.ts:64` computes "landed" as `picks - dropped`. That is circular: it counts picks that collapsed silently.
- `pqr-picks.ts`: `if (!out.has(k)) out.set(...)`. Two picks in one round that name the same question ("Purpose of visit" and "Visit purpose") collapse, and the second is in neither "landed" nor "left out". Same in `qd-conditions.ts`. Minor now (no instance in the saved data), but it is a hidden drop.

**m4. The acceptance restructure is mostly a fair adaptation, with two small losses.**
- Fair: when a Saved result exists, the saved AI picks are accepted and rejected. S1 is kept. S2 now allows a single-reading pick with its "Decide" reason, which is more honest than the old "both readings" rule. The same lander and refusal checks still run.
- Lost: with a Saved result, the "rules picks say Rules, never AI" check and the rules draft no longer run on this combination (so the rules path has no coverage there). The check "US$0 with Saved" is replaced by the single closing "US$0 so far" check. Acceptable only once M1 and m3 are fixed.

**m5. Library aliases are untested at scale.** The copy has 0 aliases, so the alias path of W1 and W2 has only unit coverage. W2 unions words from label, key, question text and aliases, so a pick can combine words from two different names of one fact. Never Ready, so low risk.

**m6. `questionList()` writes a file as a side effect of the read-only `plan` route.** The write is non-atomic and a copy shared across ports could read a half-written file. The guard would refuse a half-written file (checksum), so it fails safe.

## What a person sees (point 4)
- Left-out picks are listed in the dialog ("Left out (n)" with asks and why, `pqr-draft.tsx:75`) and in the run card (`details`).
- Left-out conditions are in the run card `details`.
- A loose match shows "Both readings pick it, in the AI's own words: ... Check it is this question" on the queue row (screenshots `qa162-to-review-saved-picks-1440.png` and `qa162-pick-taken-as-1440.png`). It is never Ready.
- Hidden: only the same-question collapse in m3. The in-dialog list disappears when the dialog closes; the run card keeps it.

## Not checked
- C4.11 step 5: 4 of 22 conditions land (18 left out with reasons). The ticket says (b), candidate questions in the prompt, "is likely needed". v2 prompts and the question list exist, but no paid run was made, so whether v2 improves the yield is unproven. This is not a defect of this PR.
- I did not run the v2 prompts or the guard live.

## Journey score (reviewer, simulated only; no visible-browser walk was done)
Walked by script and screenshots: Draft pre-qualification picks, Saved, then To review, accept and reject, with the left-out list read.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Saved picks land: 7 on To review, 10 listed as left out |
| Next step obvious | 1 | "Open To review" button; Check and Decide labels |
| Plain words | 1 | "The AI wrote ...; taken as ..." |
| Feedback and state | 1 | Counts and left-out list shown |
| Correct data | ½ | m1 loose landings; checked at Check only |
| Error recovery | ½ | Reject needs a reason (400); the acceptance flake (M1) obscures the officer-source refusal path |
| Accessibility and sizes | ½ | Screenshots at 400 and 1440 only; no axe run by me |
| Speed | 1 | Saved draft is a synchronous US$0 call; no wait seen |
| Visual quality | 1 | Rows read cleanly |
| Trust and sources | 1 | AI marked, never Ready, the AI's own wording shown |

Score 8/10 (simulated). D17 and D20 stay with the founder.

**Verdict: Block** (fix M1; m1 and m3 should be fixed in the same PR). To fix:
1. M1: make the third pick in `C4.7.test.ts:60` independent of queue order and of declaration facts. Re-run twice on fresh copies.
2. m1: tighten W2 for 1-word picks or for picks that cover few of the label's words.
3. m3: strengthen the left-out check to "landed + left out = all saved picks", and list picks that collapse onto an already-kept question.

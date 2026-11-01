# Journey test: C3.6 "Add the fact this rule needs", reviewer, 1 Nov 2026

Commit 576c1f31 (branch `claude/sleepy-ramanujan-hv8wap`). Isolated copy `rev_c36` on :17461 with the sample inputs loaded. I walked it in headless Playwright with scripts kept outside the repo (`/tmp/rev_c36/`). No model calls (US$0). Review: `review-c36.md`.

## Journeys
1. **Main path.** The configuration author (user-A) has a rule needing "refused a US visa", which no form asks. Their goal: "get that fact into the library so my rule works".
   * Expected: the Questionnaires tab offers the add; one proposal goes to To review; once accepted, the field has the rule's key and "Needed by rule …".
   * **Got:** it cannot be started from the product. The rule dialog only offers library facts, and saving a rule that reads a fact the library lacks is refused with "reads … which is not in the library" (400).
   * After I inserted the rule with SQL (reviewer scaffolding), the panel showed "Facts a rule needs that no form asks · 2". Propose took 264 ms, and the row then said "Proposed: waits on To review › Proposals". Accepting it as user-C landed `person.rev_overstay`. The Library source reads "Needed by rule R-91: Rule R-91: …" (the key is doubled).
2. **Alternate: a fact read by two rules.** "The rule that needs it" select lists both rule sentences. I picked R-91, and the proposal and source name R-91. Held.
3. **Keyboard only.** Focus reaches the button, Enter opens the form, Tab goes to the select, and arrow keys change the answer type. After Propose, focus drops to `<body>`.
4. **Error: incomplete add.** The builder's check was re-run: "Say what the fact means, in a sentence (10 characters or more)", shown in a `role=alert`, and nothing was written. Held.
5. **Recovery: double click on Propose.** One proposal (busy state). Held.
6. **Break: three parallel adds of the same fact.** 201/201/201 and 3 waiting proposals. Accepting the extras is refused at landing (409), so the library stays clean, but the queue has duplicates.
7. **Wrong role: the approver (user-B).** The approver sees "Add the fact this rule needs", can fill the whole form, and is refused only at the end: "Approver (simulated) does not hold the author duty". The server enforces it (403).
8. **Screen sizes.** 1440, 1024 and 640 px (200 % zoom) have no sideways scroll. At 400 px, a 75-character fact key overflows by 162 px. Short keys pass (builder check).
9. **Long and non-English text.** A German rule sentence wraps fine. Only the unbroken key line overflows.
10. **Crossing the screen boundary.** The "Proposed" link opens To review › Proposals, and the item waits in Check under its combination (builder check). Accepting it lands a DRAFT field with an ADD waiting for a second person. Held.

## Data underneath
One `proposal_item` per add (except the race): kind field, step rule_fact, origin rules, basis SAMPLE, `source.rule {key, sentence}`, `work.ruleFact`, no key in the payload. There is an audit line "proposed the fact … for Rule …" and a DraftingJob with US$0. Refused adds write nothing. Once accepted, `canonical_field` holds the rule's key, DRAFT, of the given type, and `library_change` has the ADD WAITING.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 0 | No product path creates the rule the panel needs: rule save → 400; the condition builder only offers library facts. All 6 sample combinations return `facts: []`. |
| Next step obvious | ½ | "Proposed: waits on To review" link; the approver gets a dead-end form |
| Plain words | ½ | "(P-158)" on screen and in errors; raw fact keys; "Rule R-91: Rule R-91" in the source; "author duty" |
| Feedback and state | ½ | The row turns into the Proposed link; no read-only state; focus lost |
| Correct data | ½ | Right key, source and Sample basis; duplicate proposals under parallel adds |
| Error recovery | 1 | Each refusal says why and what to do; nothing is written; a stale proposal is refused at accept |
| Accessibility and screen sizes | ½ | axe clean (closed and open); 1024 px and 200 % OK; focus lost after Propose; long keys overflow at 400 px |
| Speed | 1 | Propose 264 ms; one request for the panel |
| Visual quality | 1 | Team tokens and components, aligned two-column form (screenshot j2) |
| Trust and sources | 1 | Sample, origin rules, "Needed by rule …" in Library sources, no AI |

**Score 6.5/10. Fail** (below 8, and "task completed" is 0).

## Fixes that raise the score, most valuable first
1. Make the add reachable from the product's own rule, check or condition path (review M1). This lifts "task completed".
2. Refuse a second waiting proposal for the same fact inside the write: a unique index or a lock (M2). This lifts "correct data".
3. Give the approver the read-only state; move focus to the Proposed link; wrap the key line (m1, m3, m4).
4. Remove "(P-158)" and the doubled rule key (m2).

## Could not test
A real screen reader; an intended user's unaided walk (D17/D20 stay with the founder); "Where used" flagging a retired rule (not built). The screenshots are in `/tmp/rev_c36/shots/` and are not committed.

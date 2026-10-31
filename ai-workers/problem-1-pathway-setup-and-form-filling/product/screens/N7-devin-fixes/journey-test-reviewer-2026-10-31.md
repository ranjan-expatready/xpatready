# N7 Devin fixes: journey test, reviewer role, 31 Oct

Commit `10939d21` (branch `claude/runtime-devin-fixes`, diff against `origin/claude/reverent-mahavira-cef858`). I used isolated copies `rev_n7` on :4435 and `rev_n7b` on :4436, with web built from this commit. Headless Chrome through Playwright. No `*_LIVE` set, US$0 spent. Screenshots are in `/tmp/rev_n7/j/` and were not committed; the builder's set is in `screenshots/`.

## Journeys (persona · goal · expected)
1. **Main.** The configuration author withdraws their own returned "remove structure name". Expected: they reach Withdraw by keyboard, give a reason, and the change is withdrawn once, with one audit line. The name stays.
2. **Wrong person.** The author opens another person's returned remove. Expected: no Withdraw button, and the page names who can withdraw it. The server refuses a direct POST with 403 in words.
3. **Wrong role.** The Approver tries to withdraw. Expected: 403 "does not hold the author duty".
4. **Error order.** A non-proposer sends an empty note. Expected: "Not yours" comes first, before "Say why".
5. **Recovery.** A second withdraw of the same change. Expected: 409 in plain words, and nothing else changes.
6. **Hand-off (To review, then the item page).** For a non-proposer the queue row's next step should match what the item page allows.
7. **Plain words.** With an LMIA's review page and every other tab show no `subject_…` or `form_subject` key, at 400, 1024 and 1440 px.
8. **One upload door.** A POST to `/combinations/:id/attachments` returns 404. `/intake` with `combinationId` takes the file in. The forms demo still passes.

## What held
- The builder's `check_runtime_n7.cjs` ran against my copy: **18/18**.
- `check_forms_demo.ts`, the forms lane test moved to `/intake`: **23/23** on :4436.
- `tsc --noEmit` passes for both api and web.
- J1: Tab reaches "Withdraw it instead…", Enter opens it and focus lands in the reason input. Typing and Enter withdraw the change. The toast reads `Withdrawn: "Corporate and employers › Reviewer walk pathway" stays as it was.` The database row is `WITHDRAWN|user-A|Kept after all (walk)`, there is 1 audit line, and the node still exists.
- J2: the page shows "Only Content reviewer can withdraw it." with no button. The API returns 403 "Not yours: Only the person who proposed a change can withdraw it. Content reviewer proposed this one: ask them to withdraw it."
- J3: 403 "Approver (simulated) does not hold the author duty."
- J4: 403 "Not yours" comes before the note check. The placement is correct: authorisation before input.
- J5: 409 "This change is withdrawn: nothing to withdraw."
- J7: no role key on the overview, forms, documents, questionnaires, review, preview, studio preview or To review pages. Axe finds 0 violations at 400 px. No sideways scroll at 400 or 1024 px. No page errors.
- J8: the removed route returns 404 and nothing is taken in. `graph.mjs` now reports G3 = 1 (only `GET /attachments/:id/file`), so the removed route has left the gap list.

## Findings
| # | Severity | What | Where |
|---|---|---|---|
| 1 | Major | The same withdraw hole remains for a new shared field. On the same endpoint, `withdrawChange` sends lifecycle kinds to the new check but lets **any author** withdraw another person's field ADD. That also reopens their form-field mappings to "no decision". The page offers Withdraw to any author too. As a result, the server's own new message, "Only the person who proposed a change can withdraw it", is untrue for one kind on the same route. | `api/src/library-changes.ts:152-159`; `web/src/pages/review-items.tsx:106,159` |
| 2 | Minor | The To review queue still tells a non-proposer author "Correct or withdraw" on a returned remove, retire or restore. The waiting text is "…or an author, corrects or withdraws it". The item page then refuses Withdraw. | `api/src/review-queue.ts:194`; screenshot `/tmp/rev_n7/j/queue-not-mine-1440.png` |
| 3 | Minor (info) | The committed `qa/GRAPH.md` (from `bff4dd77`) still lists the removed route under G3 until it is regenerated. | `product/qa/GRAPH.md:14` |

## Score (journey score, QUALITY.md)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 and J8 complete, with database rows checked |
| Next step obvious | ½ | Finding 2: the queue's next step promises a withdraw the page refuses |
| Plain words | 1 | 403 text and page line name the person by role name, never by id (the "Another person" fallback is tested); LMIA prose is in words |
| Feedback and state | 1 | Toast names the item; disabled buttons until the reason is 3 or more characters |
| Correct data | ½ | Lifecycle withdraw is enforced on the server, but a non-proposer can still withdraw a field ADD (finding 1) |
| Error recovery | 1 | Second withdraw gives 409 in words; refused withdraw leaves the change WAITING and writes no audit line |
| Accessibility and screen sizes | 1 | Axe 0 at 400, 1024 and 1440 px; keyboard-only J1; no sideways scroll |
| Speed | ½ | Pages settled inside the 1.2 s waits, but I did not time them against the STANDARDS §9 budgets |
| Visual quality | 1 | Uses the team's tokens; the not-mine line sits under a rule like the Withdraw row it replaces (400 px shot) |
| Trust and sources | 1 | Not affected; AI labels on the review page unchanged |

**Score: 8.5 / 10, pass (8 or more, no 0).** Fixing finding 1 (correct data) and then finding 2 (next step) would raise the score most.

## Not tested
A real screen reader. An intended user's unaided walk (D17 and D20 stay with the founder). A second real author: the demo has only one, so "not mine" was set up through SQL, as in the builder's check. Mutation testing of the fix: I did not revert the fix to watch the checks fail. I relied on the builder's statement that 7 failed before the fix, and the assertions match the changed lines.

## Re-walk at `cddef56a` (copy `rev_n7c` on :4437)
- `check_runtime_n7.cjs`: 27/27.
- J2 (another person's change, as the author):
  - The change page shows "Only Content reviewer can send it again or withdraw it." with no buttons.
  - On Program structure, Send again is gone from the returned row (0 when not mine, 1 when mine).
  - To review files the change under "Waiting for others" with "The person who proposed it sends it again or withdraws it. — No step for you".
- J1, sending again by keyboard as the proposer: the change returns to WAITING and the page goes back to To review.
- The new-field withdraw from a non-proposer is refused (403) and the change stays waiting.
- New Minor: a returned row that is not mine is greyed with "waiting for a second person" (`lifecycle.ts:116`). It should say the proposer acts.
- **Score at cddef56a: 9/10, pass.** Next step obvious is 1 and correct data is 1; speed stays ½ because it was not timed.

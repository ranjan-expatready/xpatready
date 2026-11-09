# B144 · C8.3 Representative review: journey test (reviewer, 9 Nov 2026)

The reviewer's one journey score for this check (skill `journey-test`, P-64). Code at `09e660220` (head `f72e706a5`: records only). Isolated copy on :4446, Visitor visa checkpoint. Walks are headless Playwright, using only what a person sees. Data was read through the API and the database. Screenshots are in the reviewer's scratch folder (not committed); the builder's shots in `screenshots/` match what I saw.

## Journeys
1. **Main path.**
   * Who: the case officer, then the representative.
   * Goal: "Send both filings for review; check each form; approve one, send the other back."
   * Steps: Send for review → the representative opens round 1 → ticks → Approve (one confirmation) → Send back with a reason.
   * Expected: statuses per filing; a stamp per form; C7.6's line closes.
   * Held (walk 2, 4–8; pack C8.3-1, 7, 8, 9).
2. **Round 2 (alternate).** The officer fixes a fact and resends. The representative sees only the changed form, before → after, and who typed it.
   * Held (walk 4; shot 04).
3. **After approval (P-412).** A later fact change withdraws one form → the change-only view → one-click Re-approve.
   * Firm with a second person: held (walk 9–11). A double click made one round (200 + 409).
   * **Solo firm: fails.** The click answers 400 "confirm … (self: true)" as a toast, and the page has no way to confirm (`r4-solo-reapprove.png`).
4. **Empty.** A case with nothing sent. The page teaches "Send for review". Held (walk 12).
5. **Error.**
   * A stale hash gives "Changed while you were reading: reload. Nothing was stamped.", and Reload then Approve works (walk 7, 8).
   * A send back with no reason is refused on the field (walk 6).
   * Reasons with zero-width characters or over 500 characters: 400. Non-English text: accepted.
6. **Wrong role.**
   * Officer: reads only, with the concept's words (walk 3).
   * Client and configuration: 403.
   * Another firm: 404 on every route.
   * Former representative: 403.
7. **Recovery.**
   * A reload keeps the state.
   * Two sends at once: 201 + 409.
   * Approve ×2 + send back at once: one decision, one `filing_review`, one audit line.
8. **Across the boundary.** Ready to file shows "Approval withdrawn" and "Open the review". After an approval, C7.6's line closes, and `readyToFile` (C8.1/C8.2) still works (pack C8.3-15).
9. **Self-review path.** The representative edits a fact between rounds (after the send back, before the resend), then approves round 2. The answer is 200 **"reviewed"**, though the page shows "Typed by" the representative (probe A6).

## Automated replay
The builder's walk ran 19/19 on my copy. My own walk:
* axe WCAG 2.2 AA clean at 400 and 1024 px, for the representative and the officer;
* 0 px sideways scroll at 400, at 1024 and at 200 % zoom (720 css px);
* keyboard: 24 Tabs to Approve, Enter opens the dialog, and focus moves into it;
* no console errors except the solo 400;
* first view 546 ms at 200 % zoom.

## Data underneath
* One round per send. Statuses differ per filing.
* Stamps:
  * Online: `none` with its own snapshot;
  * barcode: `validated_copy`, with the read-back sha;
  * generated copy: only when its facts match.
* The triggers refuse a changed decision, a deleted round and a second stamp.
* Rollback dry-run is clean.

## Findings (full list in `review.md`)
* **Major:**
  * solo re-approve dead end;
  * BR-8 misses facts typed by the representative between rounds;
  * the facts table names relatives as the client (IMM 5707 parents' date of birth reads "· Sample Client A");
  * 25 screenshots of other screens are rewritten in the PR.
* **Minor:**
  * raw "annulled_marriage" and "(self: true)" shown to people;
  * "Open the review" does not select its filing, so Re-approve is hidden until clicked;
  * "Review now" works on a firm that is not solo.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | main, round 2 and re-approve work; the solo re-approve cannot be completed (journey 3) |
| Next step obvious | ½ | the Re-approve footer appears only for the selected filing; the link does not preselect it (m7) |
| Plain words | ½ | "(self: true)" toast; "annulled_marriage"; "Stamped with" on unstamped forms |
| Feedback and state | 1 | toasts, Nothing was recorded + Reload, state chips with tooltips |
| Correct data | ½ | wrong person on relatives' facts; between-rounds self-edit logged as "reviewed" |
| Error recovery | 1 | stale hash 409 + Reload; races and double click safe |
| Accessibility and screen sizes | 1 | axe clean, 200 % zoom, keyboard path |
| Speed | 1 | 546 ms first view; decisions under 1 s |
| Visual quality | 1 | Change set layout, team look; the left column is long but readable |
| Trust and sources | ½ | Sample marked on program items, typist shown; the person label is wrong on relatives' facts |
| **Total** | **7.5 / 10** | **Below pass (8).** No criterion is at 0. |

**Fixes that raise it, most valuable first:**
1. Solo re-approve with the self statement.
2. Person words with the relation on the facts table.
3. BR-8 measured from round n-1.
4. Preselect the filing from "Open the review".
5. Plain words for codes and the self error.

Not tested: a real screen reader; an intended user's unaided walk (D17/D20 stay with the founder).

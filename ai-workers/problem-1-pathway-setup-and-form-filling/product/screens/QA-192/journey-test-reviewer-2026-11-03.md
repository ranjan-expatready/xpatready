# Journey test: QA-192 (reviewer role), 3 Nov 2026, commit 22c9f0fd0

Isolated copy `rvq` on :4459 (forms range), sample data, live AI off, US$0. Walked in headless Chrome by a Playwright script
using only what a person sees (roles, labels, keyboard), then checked in the database and the API. Screenshots (not
committed): /tmp/claude-0/-home-user-xpatready/4a02ef13-b1c0-5884-8900-0e666d875a28/scratchpad/shots/

## Journeys (persona · goal · expected)
1. Content publisher (decider) · "accept the AI's new field that is close to one we have" · Accept stays off until a
   one-line reason is typed; it lands with that reason, kept as a person's. **Held.**
2. The same person · accepts with no reason through the API · 400 naming the close item; the item still waits. **Held.**
3. The same person · accepts a plain item (close to nothing) · Accept is on, the label is the usual reject one. **Held.**
4. Approver (second person) · "why is this new field not the same as the one we have?" · To review and Release show the
   decider's words, by a person. **Held** ("Why it is not the same: Sponsor's own name, not the applicant's.").
5. Recovery · Undo, then accept again without a reason · the original identity comes back and the accept is refused (400).
   **Held.**
6. Edit (the checker's reading) · accept by edit · needs the reason too. **Held** for an item already marked near.
7. Twin (the same field drafted for a second form edition) · accept the second copy first · it should need a reason.
   **Failed:** 201 with no reason; it landed as a new field close to "Application Date" (M1).
8. Edit that renames to a name close to a library field · should need a reason · **Failed:** 201, no reason (M2).
9. Bulk · choose two near items and accept them together · refused, because near items are Check. **Held** (409).

## Automated replay (main path and error path)
Chrome at 1440 px: the near item is in Check. Open the panel with the keyboard (focus Open, Enter). Accept is disabled with
no reason, and still disabled at 7 characters ("Sponsor"). Typing on to 8+ characters turns it on, and Enter accepts. The
toast reads "Decided. It landed as person.application_date_of_the_sponsor." axe (WCAG 2.2 A/AA) on the panel: 0
violations. 1024, 512 (200 % zoom of 1024) and 400 px: no sideways scroll. No console or page errors. 16/16 steps. API
checks: check_c1113_near_release 22/22; acceptance C11.13 16/16 (fresh database). I ran it once, not twice; flakiness was
not checked.

## Data underneath
proposal_item: status accepted, `identity.nearReason` = the typed text, `nearReasonBy` = "person", and `work.nearBefore`
holds the rule's words. One library_change row carrying that reason. An audit line containing the reason. Only one item
changed. Server roles were not re-tested (unchanged by this diff).

## Break it (15 min)
Twin bypass (M1) and edit-rename bypass (M2), above. A reason of only spaces plus "abc" → 400. A decider who types the
rule's own phrase "one name holds the other" is accepted, and the release then shows it as not given (m2). Two near items
in one accept → 409.

## Findings (detail and file:line in review.md)
- Major M1: twin resolved to "new" lands a near duplicate with no reason (proposals.ts:573 runs before :589; :173 never
  computes `near` for twins).
- Major M2: an edit to a name close to a library field is not checked again (proposals.ts:578-580 checks only an exact twin).
- Minor m1: the panel shows the rule's words as "Why it is not the same: …" right above the field asking for that reason
  (proposals.tsx:198).
- Minor m3: no "8 characters" in the label. The disabled Accept is skipped by Tab and has no description. "Accept the
  checker's reading" is not disabled (proposals.tsx:169-170,201).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–6 complete as written |
| Next step obvious | ½ | The label says a reason is needed, but a "Why it is not the same" from the rules sits just above (m1) |
| Plain words | ½ | The label is long (and ends "Also needed to reject"); the rule's words are shown as a reason |
| Feedback and state | ½ | Accept stays off at 7 characters with no count or minimum shown |
| Correct data | ½ | The main path is exact; the twin and edit-rename paths store a near duplicate with no person's reason |
| Error recovery | 1 | The 400 names the close item; Undo restores the identity; accepting again is refused |
| Accessibility and screen sizes | 1 | axe clean; 1024/512/400 px with no sideways scroll; keyboard-only main path works |
| Speed | 1 | Queue in about 0.6 s after Playwright's idle wait; accept toast within 0.8 s |
| Visual quality | 1 | Team components; the disabled Accept reads as off (screenshot panel-no-reason-1440.png) |
| Trust and sources | ½ | Release labels person and AI apart; the twin path releases on the AI's words alone |

**7.5/10. Not a pass (8 needed), no criterion at 0.** Fixes in order of value: M1 + M2 (one near check at accept)
raises Correct data and Trust; m1 raises Next step and Plain words; m3 raises Feedback.

Could not test: a real screen reader, a headed walk by a person, or an unaided walk by an intended user (D17/D20 stay with
the founder).

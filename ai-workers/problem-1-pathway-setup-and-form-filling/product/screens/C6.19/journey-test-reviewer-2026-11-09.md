# C6.19 journey test (reviewer, 9 Nov 2026), commit 2f20d282b

This is the one journey score for this check. Copy `rev_c619` on :4435 with the configured checkpoint, stopped and dropped afterwards. All data is Sample. Persona: the case officer, or the representative of the Sample firm. Review: `review.md`.

## Journeys (main path first)
1. **Main path.** The representative opens a work-permit case (With an LMIA) for a client who already has a Visitor visa case. The "Facts from an earlier case" card offers the passport number and expiry date as New. They tick both and press "Re-confirm and use (2)". The toast reads "Re-confirmed 2 facts … the earlier case did not change". The card then reads "Nothing to offer". The Agent view shows both values marked "earlier case, re-confirmed". **Held** (walk, shots 01-04).
2. **Alternate: same combination, Unicode name in another letter case.** The officer opens a Visitor visa case for "ZOË ÜNAL …" when the earlier case is "Zoë Ünal …". The cases are matched and the offer is shown. **Held.**
3. **Expired passport on a work permit.** The earlier passport is expired. The officer opens a further case. The passport rows read Expired, the ticks are disabled, the rule's words are shown, and the source reads "Sample on this combination". **Held** (shot 05).
4. **Expired passport on a Visitor visa.** As journey 3, but on a Visitor visa case. The canada.ca quote is shown word for word, but it reads **"recorded 26 Oct 2026"**; the data says 27 Oct. **Finding M2** (`r1-vv-expired-1440.png`).
5. **Empty.** A case for a client with a different name. There is no card (pack BR-1 fail). **Held.**
6. **Error: stale data.** A value is saved on B, or an earlier answer is replaced on A, after the officer looked. The officer gets a 409 "Changed since you looked: <label>" and nothing is copied (pack). **Held.**
7. **Error: expired value forced by the API.** The officer gets a 409 with the rule's words and nothing is copied. **Held.** The message leaves out the source (m4).
8. **Wrong role.** The client and the configuration author get 403; another firm's representative gets 404 (pack). **Held.**
9. **Recovery: double press.** Two POSTs at once give 201 and 409, and one row is written (probe). Reload after a 409 clears the ticks and refetches the offer. **Held.**
10. **Across the boundary: copied facts go to the form sheet (C7.3).** The client's own date of birth is copied to B.
    * On A, the IMM 5257 answer sheet says the source is "Client".
    * On B, it says **"Case officer"**.
    * **Finding M1:** the copy does not keep who gave the fact.

## Automated checks (run twice: the pack, the walk and my probes)
* **Pack:** 61/61, exit 0.
* **Walk:** 15/15, exit 0. The checkpoint step was skipped because the checkpoint was already loaded.
* **Accessibility:** axe WCAG 2.2 A/AA on the card found 0 violations in both states.
* **Screen sizes:** no sideways page scroll at 400 px, 512 px (1024 at 200 %) or 1024 px.
* **Keyboard:** every tick, chip and canada.ca link can be reached. Chip tooltips open on focus and on hover.
* **Errors:** 0 console or page errors.

## Data underneath
* Copies are new answer rows on B and keep A's status and verifier. A is unchanged.
* The audit line names fact keys and the earlier reference, never a value.
* The one gap is M1: the copy does not keep who first gave the fact.

## Break-it (15 min)
* **Unicode letter case:** OK.
* **Double submit:** OK.
* **Wrong role by URL:** OK.
* **Another firm's case id:** 404, OK.
* **Expired value by API:** refused.
* **200 % zoom:** the reason a fact cannot be used sits in a column about 96 px wide inside a table that scrolls on its own, so rows grow to about 400 px tall (m3, Minor).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journey 1 end to end, shots 01-04 |
| Next step obvious | 1 | One primary button; "Tick each fact the client says is still true" |
| Plain words | ½ | ISO date values; card dates in Toronto time against the Agent view (m2) |
| Feedback and state | 1 | Toast, "Nothing to offer", 409 notice with Reload, skeleton |
| Correct data | ½ | Status and verifier kept; the giver is lost on the form sheet (M1) |
| Error recovery | 1 | Stale and expired values refused with nothing written; Reload works |
| Accessibility and screen sizes | ½ | axe 0 and keyboard complete; the reason is off screen at 200 % (m3) |
| Speed | 1 | Card visible about 1.0 s after navigation |
| Visual quality | 1 | Team card pattern (shots 01 and 05) |
| Trust and sources | ½ | Quote word for word with the Sample label; the recorded date is wrong (M2) |
| **Total** | **8/10** | **Pass** (8 or more, no 0) |

Fixes that would raise the low criteria, most valuable first:
1. M1: keep the giver on a copy.
2. M2: show the cited date without a time-zone shift.
3. m2: show dates in words, the same on the card and in the Agent view.
4. m3: put the reason in a Details line under the row.

## Not tested
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* canada.ca live.

# B151 journey test (reviewer, 7 Nov 2026, commit d32eeaddf)

Isolated `rev_b151` on :4445, configured checkpoint, the case officer (`user-O`), headless Chromium. Everything was walked by screens:
Cases › the case's reference › "Submission to IRCC" › Fees. Each run was compared with GET `/prepare` in the same run. Live AI off,
US$0. Scratch evidence: `walk-*.png`, `break-long-dup-1024.png` (not committed).

## Journeys (persona: the case officer)
1. **Main, sponsorship:** "Before I prepare this spouse sponsorship, what will it cost and who pays nothing?" fs.spouse with spouse,
   sponsor and an adult child not travelling. Expect: the server's "not worked out" words once, the child named "Declared only: no fee",
   no amount. **Held:** "Fees not worked out yet for Spouse or common-law partner; nothing is guessed." · "P2 Adult child: Declared only:
   no fee". No CAD. 1440, 1024, 512 and 400 px: same words, no overflow, no sideways scroll; axe 0.
2. **Alternate, sponsorship with children:** one child travelling, one at home. **Held:** the child at home is named "Declared only: no
   fee". The travelling child is an applicant on the spouse's filing and is not named in the panel (outside B151; see the review).
3. **Alternate, a person with no filing:** wp.lmia_inside, partner not applying (fees not worked out). **Held:** "… Partner home: no
   fee. Not travelling (not applying on this case): no filing and no fee." The server's words, once, under the first submission.
4. **Recorded group (builder's check, re-run):** a Visitor visa group, recorded. **Held:** "Fees as worked out today, not the amount
   recorded" above the table. With B152's `fees_recorded` it reads "Fees as recorded on November 5, 2026". No note before recording.
5. **Priced, nobody without a fee:** no no-fee line, no recorded note (builder's check). B5's 58 checks pass.
6. **Wrong role:** the client's view has no fee block (builder's check, re-run).
7. **Keyboard:** 80 Tabs through the case page at 1024 px. Focus never lands in the read-only block. "Record the submission…" is
   disabled on these cases, so focus does not stop on it. Headings: H2 Submission to IRCC › H3 submission › H4 Fees.
8. **Recovery:** reload gives the same words. Time zone America/Toronto: the same words, no console error.
9. **Step across the boundary:** "Record the submission…" (C8.2) is disabled ("Opens once every filing is Ready to file"). Nothing
   in the fee block competes with it.

## Break it
* A served view with the same person declared only on two filings: listed twice, with the same React key (Minor, review issue 2).
* A 140-character name without spaces, in non-English script: it wraps inside the block at 1024 px; no line overflows.
* The `not_filing` assertion on fs.spouse passes with zero people (`not_filing: []`), so it cannot fail (Major, review issue 1).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J3: each no-fee person and the server's words, as `/prepare` |
| Next step obvious | 1 | No amount, and the reason why is in plain view; the panel's button keeps its own reason |
| Plain words | 1 | The server's words; the concept's "Declared only: no fee"; no codes in this state |
| Feedback and state | 1 | Unpriced, recorded today and recorded as recorded each have their own words |
| Correct data | 1 | 3 real cases equal `/prepare`; never CAD 0 |
| Error recovery | 1 | Reload holds; B5's failed-read state unchanged (58/58) |
| Accessibility and screen sizes | 1 | axe 0; 1440/1024/512/400 px clean; nothing focusable in a read-only block |
| Speed | ½ | Click to Fees 1.0–1.1 s on fs.spouse (whole case page; 0.3 s on wp.lmia) |
| Visual quality | 1 | B5's list style; bold name, muted reason (`B151-unpriced-fs-spouse-1440.png`) |
| Trust and sources | ½ | Server's why on each line. The `not_filing` half is not proven by a test that can fail |

**9 / 10: pass** (no criterion at 0). To raise it: a real check of the unpriced `not_filing` line that can fail (review issue 1).
Speed is the case page's, not this block's.
**Could not test:** a real screen reader; an intended user's unaided walk (D17, D20 stay with the founder); the "as recorded"
wording on real data before B152 merges; a recorded fs.spouse group (none is Ready to file on the checkpoint).

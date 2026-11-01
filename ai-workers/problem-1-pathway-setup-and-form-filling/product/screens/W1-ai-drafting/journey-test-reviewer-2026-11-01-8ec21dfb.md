# Journey test: reviewer, C2.6 checklist replay (commit 8ec21dfb), 2026-11-01

Reviewer role. This is the one journey score for the re-check after the f30a7a7f Block.

I used isolated copy `rev_c26b`: the API on :4425 and this commit's web build on :4426. The walks ran in headless Playwright (Chromium 1243) with axe-core. The cost was US$0, and no `*_LIVE` variable was set. Scripts are in `/tmp/revc26` (walk4, walk7, probe4) and screenshots in `/tmp/revc26/shots` (40–42). Neither is committed.

## Journeys
1. **Main path: the author (user-A).**
   - Setup was the same as the f30a7a7f report: an LMIA-exempt combination with IMM 5488 and IMM 5406, and steps 1–2 done.
   - Steps: "Map 1 form" opens Draft setup. The Checklists panel reads "IMM 5488 (10-2024) · saved AI reading: **12 lines**". Tab, then Enter on "Replay the saved reading · US$0", opens the job page in 581 ms with 12 proposals.
   - The line text reads "For principal applicant · Only when IRCC authorized…", with no doubled "when". axe is clean.
2. **Alternate: the reviewer (user-C) finds the work.**
   - **To review** reads "Nothing waits for you · All 0", and the nav badge shows no count (screenshot 40).
   - Typing the URL `/review/proposals` shows the group, with 12 rows reading "Decide on its checklist page" (screenshot 41; axe clean).
   - The link opens the right job page.
   - **Expected:** the waiting draft is listed on To review, as it was on f30a7a7f (badge "1"). **Result:** it is not listed (Major).
3. **Decide and apply (user-A).**
   - Accept all 12, then "Apply to the draft". The page stays put.
   - The panel reads "Applied: 10 document requirements added to the draft", then "Not applied (2), each with its reason". The two reasons are `case.is_employer_specific_work_permit` and `case.intended_work_province` not in the library. The link reads "Back to the combination" (screenshot 42). axe is clean, with no sideways scroll at 400 px.
4. **Recovery: replay again.**
   - The second replay proposes 2 and drops 11, 10 of them as "already on this combination". The builder suite's M2 steps show that applying it writes 0 rows and no suffixed copies.
5. **Empty, error and wrong role** behave as on f30a7a7f, confirmed by the suite's steps: IMM 5483 gives a 409 in words, live gives a 409, user-C replaying gets a 403, and a queue accept by API gets a 409 that says "checklist page".

## Data underneath
- The suite on my copy ran **34 passed, 0 failed**.
- `GET /review-queue` returns all zero for user-A and user-C while `GET /review/proposals` holds the group "LMIA-exempt (employer offer): 2".
- The combination's next step stays "Draft setup" (`aiProposals` 0).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| task completed | 1 | Replay, decide, apply, and the skipped lines with reasons, all on the product's own pages. |
| next step obvious | ½ | The queue link is clear, but To review says nothing waits (journey 2). |
| plain words | 1 | "12 lines", "Only when…", and the Draft setup note now points to Checklists. |
| feedback and state | ½ | The Applied panel is good; the inbox shows a false "Nothing waits for you". |
| correct data | 1 | No duplicate lines on re-replay; conditions written. |
| error recovery | 1 | 409s in words; the queue accept says where the item is decided. |
| accessibility and screen sizes | 1 | axe clean on the dialog, job page, queue and Applied panel; keyboard reaches Replay; 400/1024 px fine. |
| speed | 1 | 581 ms replay to the job page. |
| visual quality | 1 | Team components (screenshots 41, 42). |
| trust and sources | ½ | AI is marked, with the quote and Sample shown, but applied rows read "Edited by a person". |
| **Total** | **8.5/10** | Passes (8 or more, no 0). The open Major still blocks the verdict. |

**Fixes that raise it:**
1. List waiting checklist drafts on To review, linking to their checklist page. This raises next step obvious and feedback and state.
2. Keep the AI origin on applied rows. This raises trust and sources.

## Could not test
- A visible-browser walk by a person.
- A real screen reader.
- 200 % zoom.
- An intended user's unaided walk (D17/D20 stay with the founder).

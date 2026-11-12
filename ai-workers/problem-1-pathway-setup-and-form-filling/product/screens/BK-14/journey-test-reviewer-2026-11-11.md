# BK-14 journey test: reviewer role, 11 Nov 2026

**Commit:** 2c9a35660467837c6b506819476ad078635d4e3f (PR #1573). The app code is the same as 5de0fa9a3.
**Copy:** isolated `rv_bk14` on :4493 with STUDIO_MADE_UP_REVIEW_RUNS=1. No STUDIO_*_LIVE was set. Started and stopped in one command. I did not use :4400.
**Method:** headless Chrome through Playwright, driven like a person (Tab and Enter, reading the screen). I read the data underneath with SQL.

## Journeys (persona: case officer, Sample firm)
1. **Main path.**
   * Goal: "Review the Study permit applicant's filled form before it goes out."
   * Steps: open the case, Tab to Open Review, read the run card, Tab to Run review (Saved), then read the findings.
   * Expected: the form chosen from the case's release (IMM 1294), with Saved at US$0 and findings on that form.
2. **Alternate.** Visitor visa person: IMM 5257 is still offered first and replays as before. I did not walk this; it is covered by the builder's C7.5 packs and my pure check.
3. **Empty.** No saved review recorded for these values: Saved is not offered and a run is refused with the reason (API check).
4. **Error: Live with live AI off.** Refused with 409 "Live is off", nothing added, no AI batch (API check).
5. **Error: a form that is not this person's.** Refused with 422 "IMM 5409 is not one of Sample Student S14's forms on this case." (API check).
6. **Wrong role.** A client opens the Review URL.
7. **Recovery.** Reload, then run Saved again with a double click.
8. **Across the boundary.** The findings land in the Findings panel to be acknowledged or dismissed, or passed on Ready to file.

## What held
* **Journey 1 (my second Study permit case, with the same Sample person and answers as the API check):**
  * The case page's "Open Review" was reached by Tab, and the Review page appeared in 496 ms.
  * The run card shows: Person Sample Student S14; Form IMM 1294 (options IMM 1294, IMM 5476, IMM 5707); Saved US$0.00 "Replays the checked saved review of IMM 1294 (06-2026) … (72 form fields)"; Live "about US$1.08, at most US$4.80", disabled with the approval words; and the made-up banner.
  * Run review (Saved, US$0.00) was reached by Tab and pressed with Enter. The result came in 548 ms: "Saved (made-up test run): 2 new findings. US$0.00." A toast said "2 new findings".
  * The findings show MAJOR/High and MINOR/Low. Each is AI and Replayed, with both rounds' reasons and "The form says 'India'". Each names "IMM 1294 · …" and has Acknowledge… and Dismiss….
  * DB: 2 rows (`IMM 1294|person.applying_from_country|high|true`; `…current_residence_country|low|true`) and 1 `reviewed` audit line.
* **Journeys 3–5:** `check_bk14_sp_review_api.ts` passed 10/10 on the same copy.
* **Journey 6:** user-P sees "This page is for the case officer" and no run card.
* **Journey 7:** after a reload, a double-clicked Saved run still left exactly 2 AI findings. The repeat is recorded as already on the case.
* **Screen checks:** axe (WCAG 2.2 A/AA) found 0 violations on both states. There is no sideways scroll at 1440, 1024 or 400 px on either state, and no page or console errors.

## Findings
* **Minor: the SI-6 tooltip and the register disagree.** The chip's tooltip ends "Row SI-6 of the stand-ins register", and that row still says Visitor visa forms only at this commit; the tooltip says any form (review m1). This is the trust criterion's half point.
* **Minor: error states not walked in the browser.** I walked no error state there; the API check covers them in words. No-edition and missing-official-text are only checked at reason-code level (review m3).
* **My walk script's own mistakes (not product defects):**
  * The SI-6 chip's words are in a focus tooltip, not page text.
  * "ai_batch = 0" was the wrong assertion: the checkpoint load leaves its own rows. The API check's before/after equality passed.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Study permit IMM 1294 reviewed from the page; 2 findings added. |
| Next step obvious | 1 | One primary button named with its mode and price; findings show Acknowledge/Dismiss. |
| Plain words | 1 | The card and result line are plain; no ids on the main path. |
| Feedback and state | 1 | Steps are ticked, and the result line and toast appear. |
| Correct data | 1 | DB rows exactly as shown; 1 audit line; no duplicates. |
| Error recovery | ½ | The refusals are clear (409/422, API), but none was walked on screen; m3. |
| Accessibility and screen sizes | 1 | Keyboard main path; axe 0; 400/1024/1440 px fit. 200 % zoom not done. |
| Speed | 1 | 496 ms page; 548 ms run. |
| Visual quality | 1 | Team components; the 1024 px layout reads cleanly. |
| Trust and sources | ½ | AI, Replayed, made-up banner and edition are shown; the register row contradicts the chip (m1). |
| **Total** | **8.5 / 10** | **Pass** (8 or more, no 0). |

**To raise it:**
1. Apply the SI-6 register wording (trust).
2. Add one on-screen or API check for each refusal's words (error recovery).

**Could not test:** a real screen reader; an intended user's unaided walk (D17 and D20 stay with the founder); the Visitor visa walk on this copy (the builder's C7.5 browser pack, 37/37).

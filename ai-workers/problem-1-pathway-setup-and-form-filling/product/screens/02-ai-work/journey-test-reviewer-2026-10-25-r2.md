# Screen 02 — journey test, reviewer round 2 (25 Oct) · **9.5/10, pass**

Same session as `review-2.md`. Head `aa43c46` + the one-line SC-2 label (this reviewer session also made that fix — a re-check item, not a new feature). Fresh isolated copy `screens_j` :4444 (`xr_studio_screens_j`), seeded by `tests/runtime/setup_visitor_visa.ts` (combination `85b7075d…`, release 1). Browser: headless Chromium, real clicks/keys; PostgreSQL checked after each step. Screenshots `/tmp/s02-check/*.png` (12). US$0 (replay).

## Journeys walked (concept + round-1 report)
- **(a) To review → approve → release:** author adds a field (a WAITING `LibraryChange` appears under "Waiting for others · 1"); the change page says "Waiting for a second person" (`a2-change-author.png`); as the approver the same page shows "Needs you" with Approve; one click → `library_change` APPROVED by user-B. Field placed as a draft change → submit → release v2: the field is `PUBLISHED`; the unrelated returned and withdrawn fields stayed `DRAFT`/no row — the release published only what the combination uses.
- **(b) propose → returned → resend; and withdraw:** approver returns two fields with notes ("Name it better", "Not needed") → both `RETURNED`; the author's To review rows read "Returned by Approver: … · Needs you — Correct or withdraw" (`b1-author-review.png`); the detail page offers "Correct it and send it again" (name, meaning, what you corrected) → Send again → `WAITING`; "Withdraw it instead…" → why → Withdraw the new field → `WITHDRAWN`.
- **(c) draft setup → proposals → apply:** replay draft of IMM 5409 on the seeded combination completes with US$0.00 and the honest label "AI-drafted under a prototype-only exception to the AI-processing rule" (`c1-job.png`); the job shows "Applied to draft"; 708 `form_field_map` rows after apply. The leftover-reason path (BR-7) is enforced and tested by check_screen02_fix.
- **(d) AI work log:** `/ai` lists every launch with scope, how, steps, status, spent/worst case and started (`d1-ai.png`); axe clean.
- **(e) held PDF → second person:** not exercised live on this copy (no held new-edition fixture was created); the gate — Approve disabled "Waiting for the uploader to record the IRCC page" — is in `review-items.tsx:208` and covered by the fix suite. Scored accordingly below.

## The round-1 dead ends — all gone
1. K1 form fields "left for a person" appearing nowhere → decision list exists (`/review/form-fields/:id`), linked and tested.
2. Approved-source edition stuck at "Only an approved official file is compared" → the refusal now says what to do (set aside with a reason, or keep held until the official file is in).
3. Held-file uploader had no step → the row/gate names the step (record the IRCC page).
4. Returned field froze its combination ("Release" offered then refused) → "Correct or withdraw" is offered on the author's rows, resend and withdraw both work.

## Score (0, ½ or 1 each)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | (a)–(d) done end to end, psql-verified; (e) not walked live — its gate is in code and in the fix suite |
| Next step obvious | 1 | status chips name the next actor ("Waiting for a second person", "Needs you", "Correct or withdraw", "Approved · in the next release") |
| Plain words | 1 | return notes, "AI-drafted under a prototype-only exception", no ids on the main path |
| Feedback and state | 1 | Needs you/Waiting/Running counts; every mutation ends in a named state (`a1`, `b1`, `d1`) |
| Correct data | 1 | psql after each step: APPROVED→PUBLISHED, RETURNED→WAITING, WITHDRAWN, 708 maps, release v2 scoped |
| Error recovery | 1 | resend and withdraw recover a returned proposal; refuse paths say why |
| Accessibility and screen sizes | 1 | axe WCAG 2.2 A/AA: 0 serious/critical on To review, change, job, AI work; no sideways scroll at 1024, 390, 640 px; focus ring classes on interactive elements (`focus-visible:ring-[3px]`) |
| Speed | 1 | To review 269–320 ms; approve click→saved ~0.95 s; submit→release ~0.4 s |
| Visual quality | 1 | consistent with `design/draft-ai-work.html` (launch table, status chips, spend columns); brand tokens, readable tables at all widths (`w390`, `w1024`, `w640`) |
| Trust and sources | 1 | proposed-by/returned-by names, origin labels, "On this computer", US$0.00, audit line per action |
| **Total** | **9.5** | pass (≥ 8, no 0) |

## Findings
- No Must, no Major. Minor: the AI-work batch row did not navigate on click in this walk (the list itself is complete); held-PDF live walk remains for a fixture.
- The withdraw control is inside the correct/resend panel — discoverable but one level down (Minor at most; consistent with the pattern of offering the safe action first).

## Could not test
Real keyboard on a headed browser (headless Chromium never changes a closed `<select>` on ArrowDown — verified quirk, not a defect); a live AI call (none by design); the held-PDF journey (no fixture created this round).

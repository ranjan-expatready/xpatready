# C6.9 part 3 (override, review, the page): journey test, reviewer, 2 Nov 2026, commit 2572b9b0
Isolated copy `rev_c69` on :4439 (never :4400); live AI off; US$0. Walked headless Chrome (`channel: "chrome"`) keyboard only at 200 % (640×400 CSS px, device scale 2), plus the builder's 1440/1024 script; scratchpad scripts `walk/walk.cjs`, `walk/race.mjs`.

## Journeys
1. **Main (case officer):** case page → card "Eligibility (staff only)" (Not run, SI-1 chip) → Open eligibility → empty state in the concept's words → Run eligibility check → "Possibly eligible — needs 3 facts", both rules Not answered, judgement lines, disclaimer, "Run by Case officer". **Held**; focus drops to `body` after the run (M1).
2. **Out of date → run again:** answers added → reload → orange band naming each change, old result readable → Run again → empty or spaces reason refused on the field ("Give a reason for running again, such as 'Passport renewed'.", `aria-invalid`, described) → reason → new result. **Held**; Escape and submit both drop focus to `body` (M1).
3. **Honest outcome:** conviction answered yes, passport still missing → "Possibly eligible — needs 2 facts; the representative reviews this", never Not eligible (P-230 (1)). **Held**; the sentence quotes the rule label "Answered no to …" for a yes answer (m10).
4. **Override:** drawer opens on the read-only outcome; Tab cycles inside; empty label and empty reason refused on their fields; a line break in the reason refused (textarea invites it, m1) → saved; the rules' outcome stays, override shown beside it with name and time; one row and one audit row. **Held**, focus lost after (M1).
5. **Review (representative):** preview "Reviewed by Representative (a licensed representative)" → saved → "Reviewed by Representative (Sample), …: Checked (Sample)"; button then disabled. Case officer gets "Seen" (builder's check, API). **Held**.
6. **Double review / race:** 20 POSTs at once → one 200, nineteen 409 naming who and when. **Held**.
7. **History:** newest first, Overridden, Reviewed, Out of date pills. **Held**.
8. **Wrong role:** client → no card on the case page, no verdict on the page, 403 from the API; another firm's representative → "No such case". **Held**.
9. **Break:** RTL override character in a label → 400 on `label`; 501-character note → 400; 80 emoji label → 400 (counts UTF-16, m3); reason "..." → 201 (m2); malformed id → 404 staff, 403 client.

## Data underneath
The `assessment` row is unchanged by override and review. There is one `assessment_override` row per override. `assessment_review` is unique per run. Stamps hold the name, the duty, the licence (only when licensed) and out of date. Audit rows exist for both, with no answer values. `ai_batch` is unchanged.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Run, run again, override, review and history all work by keyboard; acceptance 15/15. |
| Next step obvious | 1 | One primary action. The out-of-date band says "Run again". Missing facts link onward, though only to the case page (m8). |
| Plain words | 1 | The outcomes are honest, "IRCC decides" is shown, and "Seen by"/"Reviewed by" are correct. m10 is one awkward sentence. |
| Feedback and state | ½ | Toasts and states are clear, but focus is lost after every action (M1). |
| Correct data | 1 | Stamps follow firms.json. The engine's outcome is never changed. The race is safe. |
| Error recovery | 1 | Refusals are on the field, in words. m1 and m5 are small gaps. |
| Accessibility and screen sizes | ½ | axe is clean, with no sideways scroll at 1024 px or 200 %, and the listbox works. Focus is not returned (M1, WCAG 2.4.3). |
| Speed | 1 | Each action settles in under 1 s on the copy. The whole builder journey takes 37 s, including setup and axe. |
| Visual quality | 1 | Team tokens; rows meet the size bar; the screenshots at 1440, 1024 and 200 % are tidy. |
| Trust and sources | 1 | The SI-1 chip, "rules as at", the release, who and when, and the disclaimer are always shown. No AI. Sample labels are marked. |

**9/10: pass (no 0).** Fixing M1 raises feedback and accessibility to 1.
Not tested: a real screen reader, and an intended user's unaided walk (D17 and D20 stay with the founder).

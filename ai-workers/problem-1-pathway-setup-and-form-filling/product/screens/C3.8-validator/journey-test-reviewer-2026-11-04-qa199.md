# Journey test, reviewer role: C3.8 QA-199 (Background questions), 4 Nov 2026

Commit 724b48fb5 (tip 834b4c444 adds only screenshots). Isolated copy `rev_qa199` on port 4630. Reset, the sample loaded, and Reset to the six with IMM 5257's and IMM 1294's saved field-map answers applied (replays, US$0). I walked it in headless Playwright, looking only at what a person sees (`li[data-form-field]` rows, buttons and placeholders), and took screenshots in the reviewer's scratchpad. Data was checked through the API and with psql.

## Journeys
1. **Main path.** The content reviewer opens To review › Form fields for IMM 5257, finds Q6 (ill-treatment, undecided) and decides it.
   - Expected: the note explains why; only "Filled by hand" is offered; Save removes the row.
   - Held. Keyboard only, 31 Tabs reach Q6's Decide, then Enter. The note reads "A Background information question: IRCC returns an application with one unanswered, so it is never "not a fact"…". The only option is "Filled by hand". Tab goes to the Reason field ("Who fills it and why"), then Save. The row is gone.
2. **Error.** Save with an empty reason.
   - Held: the server refused it (400) and the toast said "Say why in a sentence (at least 8 characters)."
   - Pre-existing gap: the message is not on the Reason field.
3. **Earlier decision (recovery).** Q5 (political party) was left "not a fact" from before the rule.
   - Expected: it is listed with "Marked "not a fact": decide again"; the combination's Review and release shows an error naming Q5.
   - Held. The validation reads: `Forms · IMM 5257: "Question 5. Are you, or have you ever been a member … political party …" is a Background information question: IRCC returns an application with one unanswered, so it cannot be "not a fact". Map it to a shared field the applicant answers, or mark it "filled by hand" with a reason.`
4. **The step across the screen boundary.** Release names the form; Form fields lists the question; "filled by hand" clears it.
   - Held, on all three forms (API check 33/33).
5. **Pass case.** A field outside Background information can still be "not a fact".
   - Held: 201 on IMM 5257, 1295 and 1294.
6. **Wrong role.** A client tries to decide.
   - Held: 403 (acceptance AT-2).
7. **Break it: unreadable reading.** The edition's reading file is missing.
   - **Failed open.** Q6 "not a fact" answered 201, no Background flag and no release error. Restoring the file restores the guard without a restart.
8. **Screen sizes.** 400, 720 (about 200 % at 1440) and 1024 px, Decide open.
   - Held: 0 px sideways scroll at each width.

## Data underneath
- After each refusal the row stays `unresolved` (psql and the API).
- "Filled by hand" writes one new DRAFT version with the reason and the person's role.
- Every edition that has field maps has an `inventory_file` in this copy.
- Console: one expected 400 (the empty-reason probe), no page errors.

## Findings
- **Minor**: fails open on an unreadable reading (`api/src/background-questions.ts:18`). Fix in `review-qa199.md` finding 1.
- **Minor**: IMM 5710's blank-caption question reads "This question…" (`engine/form-completeness.ts:33-34`). Fall back to the reading's heading.
- **Seen, not from this diff:**
  - Two rows start "Question 6…": the consent box carries Q6's caption, an inventory caption error.
  - The empty-reason message is a toast only.
  - After Save, focus falls to the page body.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Q6 decided by hand and Q5's error shown and cleared, keyboard only. |
| Next step obvious | 1 | The note and the release error both say what to do. |
| Plain words | ½ | Caption plus the IRCC reason, no path. Blank caption on 5710. Duplicate "Question 6" rows (older cause). |
| Feedback and state | ½ | The error clears once decided. The empty reason gets only a toast, and focus is lost after Save. |
| Correct data | 1 | The row is unchanged on 409. One new version on Save. |
| Error recovery | ½ | Earlier "not a fact" is recoverable on the page. A missing reading disables the rule silently. |
| Accessibility and screen sizes | 1 | axe WCAG 2.2 A/AA: 0 violations on the list, open-decision and release states. Keyboard path works. No sideways scroll. |
| Speed | 1 | Form fields first view 0.6 s. Review API 0.57 s warm. |
| Visual quality | 1 | Team components, unchanged layout. |
| Trust and sources | ½ | The IRCC reason is stated in words. No link to the source quote on screen. |

**8.0 / 10: pass** (8 or more, no 0).

Fixes that would raise the score, most valuable first:
1. Fail closed on an unreadable reading.
2. Fall back to the heading for a blank caption.
3. Put the reason message on its field and keep focus after Save (pre-existing).

## Could not test
- A visible (headed) browser walk by eye.
- A real screen reader.
- True 200 % zoom (approximated by 720 px).
- An intended user's unaided walk: D17 and D20 stay with the founder.

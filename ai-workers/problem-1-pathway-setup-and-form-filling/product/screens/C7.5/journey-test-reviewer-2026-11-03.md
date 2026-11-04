# Journey test: C7.5 part 1 Review findings, reviewer role, 3 Nov (IST)

Commit 9d654e170. Own isolated copy `rev_c75` on :4437. Playwright with Chrome. US$0. The walk scripts and screenshots are in the reviewer's scratchpad, not the repo. Case: Visitor visa family (Sample Client A, Sample Spouse A, Sample Child A1 aged 10, Sample Child A2 aged 15). The representative of record is `user-R` and the case officer is `user-O`. The case and its starting facts were set up through the API. Everything about findings was done on the screen, and one fact was fixed through the agent view.

## Journeys (persona · goal · expected → what happened)
1. **Main: the case officer clears the review.** "Show me what disagrees and let me deal with it."
   * Expected: three Rules findings listed in words; Acknowledge with a reason; fix the fact; the finding resolves.
   * Held: three MAJOR Rules findings (spouse's passport, Child A2's passport, Child A1's national ID issued before birth). Each quotes both dates, names the person, the form (IMM 5257) and the fact. The Rules tooltip gives the rule and "Severity Sample". Acknowledged with a French and Chinese reason, which is shown with who and when.
   * Fixing the spouse's passport year in the agent view's edit dialog changed the counts at once, without a reload, to "2 open · 0 acknowledged · 1 resolved".
   * Wrong turns: the panel is at y=1854 of a 3259 px page, below the forms panel. Nothing links a finding to its fact: I had to find the spouse's tab and the "Edit Expiry date of the passport…" button myself.
2. **Alternate: dismiss and come back.** Dismissed Child A2's finding with a reason, then reloaded: "1 open · 0 acknowledged · 1 resolved · 1 dismissed", and it did not come back. Held.
3. **Empty: a new case.** "No findings: the facts and forms agree so far." The counts line says 0, and there is a line saying the AI review comes later. Held.
4. **Error: bad input.** A reason of "ok" gives "Give a reason of at least 3 characters…" on the field. An empty hand-added finding gives "Say what the finding is, in at least 3 characters." on the field. Both also appear as a red toast (shown twice). Spaces only, 1001 characters, or a body that is not JSON: 400.
5. **Wrong role.**
   * The case officer tries Waive… on a CRITICAL: refused in words after typing a reason; the button should not have been offered (m4).
   * The representative of record waived it.
   * The client gets a 403 and sees no panel. The configuration author gets a 403 from the API, and the Cases area falls back to its own actor list.
6. **Recovery.**
   * Two tabs acknowledge the same finding: tab two shows "This finding is acknowledged already, so it cannot be acknowledged now." on the field, and 1 row is stored. Held.
   * Double-click Acknowledge: saved once, but a red toast says "Someone changed this finding after you read it" (m6).
   * Double-click "Add finding": two identical findings stored (M2).
7. **Add by hand, hostile and long text.** 400 characters of Turkish and Japanese wrap with no sideways scroll. An `<img onerror>` note is shown as text.
8. **Screen sizes and keyboard.** No sideways scroll at 400, 720 (≈200 % zoom), 1024 or 1440 px. axe WCAG 2.2 A/AA is clean on every state (my walk and the builder's suite). Dialogs open with focus in the reason. After Dismiss… the row leaves the list and focus falls to `BODY` (m5).
9. **Across the boundary (finding → Ready to file).** The "Findings warn: they never stop Ready to file" line is shown. The readiness warning itself (C7.5-9) is part 2, so it was not testable.

## Replayed as automated checks
* `check_c75_findings_browser.cjs` covers journeys 1, 2 and 5–8 (keyboard, axe, 1024 and 1440 px, console errors).
* Run 8 times on my copy: **4 passed (23/23) and 4 failed** with "timed out waiting for 1 resolved". The cause is the random order of findings created in one read (review M1). Not stable.

## Data underneath (psql)
* Each finding row is stored once with its state. Rules rows carry their fingerprint.
* Audit lines say "acknowledged a MAJOR Rules finding on case …", with no values and no reasons.
* `ai_batch` is unchanged.
* Defects: the double-click duplicate (M2), and the acknowledger's id is overwritten with "rules" on resolve (m3).

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Acknowledge, dismiss, add, waive, and resolve by fixing the fact all completed on screen |
| Next step obvious | ½ | No link from a finding to its fact; panel far down the page; Waive… offered to the officer |
| Plain words | ½ | Quotes are clear; facts are named from their key ("National id issue date") |
| Feedback and state | 1 | Counts update live after a fix elsewhere on the page; who, when and why on each row |
| Correct data | ½ | Double-click add stores 2 findings |
| Error recovery | ½ | Two tabs handled in words; a misleading toast after your own double-click; focus lost after a move |
| Accessibility and screen sizes | ½ | axe clean, 4 widths, keyboard path; focus to `BODY` after Dismiss or Waive |
| Speed | 1 | GET 16–19 ms warm; findings visible 0.9 s after reload; one request |
| Visual quality | ½ | Team look; a flat list mixing 4 people (board frame 13 groups by person); header squeezed at 400 px |
| Trust and sources | 1 | Rule tooltip, both facts quoted, Severity Sample, SI-6 chip |

**Total 7/10: below the pass mark (8, no 0). Fixes that raise it, most valuable first:**
1. Group the findings per filing and person in a stable order (visual quality, next step; also makes the suite stable).
2. Make add-by-hand idempotent (correct data).
3. A "Fix the fact" link to the question in the agent view (next step).
4. Return focus after a move, and drop the misleading toast after your own double-click (error recovery, accessibility).
5. Name facts by their question label (plain words).

**Not tested:** a real screen reader; an intended user's unaided walk (D17 and D20 stay with the founder); the AI review and the readiness warning (part 2).

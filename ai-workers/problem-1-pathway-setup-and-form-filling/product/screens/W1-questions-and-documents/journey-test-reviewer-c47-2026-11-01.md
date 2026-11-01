# Journey test (reviewer): C4.7 PQR picks, commit 4ec178e8, 1 Nov 2026

Isolated copies: :4464 for the browser and :4463 for the API and break-it pass, both with the sample loaded, on wp.family ("With an LMIA", Guide 5487).

I walked the journeys in headless Chrome by keyboard only (Tab, Enter, Esc, typing) at 1024 px, then at 400 px, at 1440 px, and at 200 % zoom (512 px with deviceScaleFactor 2). Axe (WCAG 2.2 A/AA) ran on each state. I checked the data underneath with SQL and the audit table. No model was called (US$0). Screenshots are in /tmp only (/tmp/c47probe/shots): this review may write only its two files.

## Journeys (persona: content publisher with the author duty, unless named)
1. **Main path.** Goal: "propose this combination's pre-qualification questions and accept the right ones."
   * Steps: Questionnaires → Pre-qualification chip (45 Tabs, Enter) → "Draft pre-qualification picks" (2 Tabs) → the plan shows its steps and "Cost: US$0 (no AI call)" (34 ms).
   * Draft takes 211 ms and reports "32 picks for To review … Check 32 · rules, US$0".
   * "Open To review" (3 Tabs) shows the picks titled "Ask in pre-qualification: … (Principal applicant)".
   * Opening one shows its reason, "Proposed by the rules", and "No quote: it comes from the rules alone".
   * Accept: the tick is written (1 DRAFT row, CODE_MATCH) with "Undo (10 s)".
   * **Held.**
2. **Recovery (Undo).** Undo within 10 s brings the tick count back to 0 and the pick waits again. **Held.**
3. **Remove with a reason.** Reject is disabled until a reason is typed. With the reason typed, the item is rejected with it, nothing is ticked, and the audit line holds the reason. **Held.**
4. **Alternate (saved AI answers).** With none saved, the result says "No saved AI answer … Use rules only meanwhile" and proposes nothing. **Held.**
5. **AI not approved.** "AI now (not approved yet)" is greyed out with the reason. A live draft is refused with 409 and the launcher is never called (suite L checks). **Held.**
6. **Wrong role.** The approver and content reviewer see no Draft button, and the server answers their draft with 403. The client's draft gets 403, but **the client's plan gets 200** (Minor m1). **Partly held.**
7. **Esc and focus.** Esc closes the dialog, but focus lands on BODY, not on the button, so the keyboard user starts again from the top (m4). **Failed (Minor).**
8. **Double click or two tabs.** Two drafts at the same moment produce 62 waiting picks for 31 facts (Major M1). **Failed.**
9. **Bulk accept of Ready AI picks** (stand-in launcher, both rounds agree):
   * 40 picks: accepted in 4.2 s.
   * 80 picks: 500 "Something went wrong" after 5.0 s, and nothing was accepted (Major M2).
   * **Failed.**
10. **Hostile AI output.** I gave the stand-in launcher picks quoting only "a" or "the": they were proposed as Ready with "IRCC's words … found" (M3). Non-English words ("Date de naissance 生年月日") were left out with the reason. **Partly held.**
11. **Edit through the API** (break-it). Editing the pick to another person's fact ticks it with the rules' origin (M4).

## Data underneath
* There is one draft row per accepted tick, with the reason kept.
* The audit lines are present:
  * "drafted pre-qualification picks … (rules only, US$0.00): 32 to review"
  * "accepted the rules' pick: ask … Why: …"
  * the reject line, with its reason
* Retired combinations are refused (409) for both the plan and accept.
* No other combination changed.

## Sizes and accessibility
* Axe was clean on the plan, the result, To review and the side panel.
* The dialog fits at 400 px (368 px wide), at 1440 px, and at 200 % zoom.
* To review scrolls sideways at 400 px and at 200 % zoom (its group card is 614 px wide; that layout already existed).
* There were no console or page errors.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–3: draft, then accept or remove, by keyboard |
| Next step obvious | 1 | "Open To review" in the result; per-band counts |
| Plain words | ½ | Keys in the Undo refusal and the toast; "(P-110, P-131)"; "pqr subset of sqr" (m2, m3) |
| Feedback and state | 1 | Plan before run, counts, Undo countdown; "210 questions" misleads slightly (m6) |
| Correct data | ½ | Race duplicates (M1); edit lands any fact as the rules' pick (M4) |
| Error recovery | ½ | Undo and refusals in words, but bulk accept gives a generic 500 and accepts nothing (M2) |
| Accessibility and screen sizes | ½ | Focus lost on Esc and after Accept; To review scrolls sideways at 400 px and 200 % zoom |
| Speed | ½ | Plan 34 ms, draft 211 ms, accept 315 ms; bulk 40 = 4.2 s, 80 = timeout |
| Visual quality | 1 | Team components; clean dialog at all widths |
| Trust and sources | ½ | AI and rules origin shown, both readings shown; a one-letter quote counts as "found" (M3) |

**Score: 7/10. Fail** (below 8; no criterion at 0).

Fixes that would raise the score, most valuable first:
1. M1: a unique key or lock for waiting picks.
2. M2: one snapshot per batch.
3. M3: a minimum quote that sits on word boundaries.
4. M4: lock the edit's identity, or land it with the HUMAN origin.
5. Words: no keys or decision ids on screen.
6. Return focus to the button after Esc.

Not tested: a real screen reader; a headed browser; an intended user's unaided walk (D17 and D20 stay with the founder); a real saved AI run (none exists until P-131).

## Re-check at c3d62b5e (same day): 8/10, pass
I re-ran the journeys that failed, through the API on :4463 (US$0). No web file changed, so the browser walk above still applies.

* **Journey 8 (double click or two tabs):** three drafts at the same moment gave 32 picks for 32 facts. **Held.**
* **Journey 9 (bulk accept):** 167 Ready picks were accepted in 8.8 s, and Undo took 0.5 s. **Held, but slow.**
* **Journey 10 (hostile AI output):**
  * "a", "the" and 21-letter quotes are dropped.
  * Mid-word fragments of 5 words or more still pass (Minor).
  * **Mostly held.**
* **Journey 11 (edit):** an edit that changes the person or fact gets 409 in words. **Held.**

| Criterion | Before | Now | Why |
|---|---|---|---|
| Correct data | ½ | 1 | One pick per fact under a race; an edit cannot change the fact |
| Error recovery | ½ | 1 | Bulk accept no longer fails |
| Speed | ½ | ½ | 167 picks take 8.8 s |
| Trust and sources | ½ | ½ | Fragment quotes still count as "found" |

The other criteria are unchanged: plain words ½, accessibility and screen sizes ½, and the rest 1.

**Score: 8/10. Pass** (no criterion at 0).

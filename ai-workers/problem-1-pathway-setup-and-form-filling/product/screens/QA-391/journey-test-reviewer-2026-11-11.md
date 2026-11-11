# QA-391 journey test: reviewer, 11 Nov 2026

PR #1576 at commit a118065290706ee4b09289840e38d15acf14230e. Persona: the case officer (`user-O`), plus the configuration author for the wrong-role check. Copies used: :4450 (the builder's copy, finished story) and :4456 (the reviewer's own copy, configured checkpoint, stopped after use). Never :4400. US$0.

## Journeys
1. **Main.** The officer opens SAMPLE-VV-FAMILY-1 after the finished story. Goal, in the officer's words: "Which forms do I still file?" Expected: IMM 5475 and IRM 0002 read as kept, with the reason, and offer nothing to file.
2. **Alternate: Online form.** IMM 5257 filed Online, with an old copy. Expected: the copy is for checking, never "to file it".
3. **Alternate: a person stops travelling.** The officer marks Partner not travelling. Expected: every Partner form is kept, and the reason says the person is not travelling.
4. **Alternate: age limit.** Child 18 or over's date of birth is corrected to 2014. Expected: the forms for adults only are kept, and the reason says the person's age.
5. **Alternate: a filed copy later stops applying.** Expected: the filed copy stays shown as filed, and nothing tells the officer to file it again.
6. **Error: lock by route.** The officer locks a kept copy as Filed. Expected: refused in words, nothing changed.
7. **Wrong role.** The author tries the same lock. Expected: 403.
8. **Recovery.** Reload after a refusal. Expected: the same state.
9. **Boundary.** The forms that still apply keep Generate, Validate and lock as before.

## What held
- **J1:** all 8 kept rows read "Kept, never filed". Each has its reason and Download only. qa's repro passes 6/6 and the builder's suite 14/14 (screenshot `kept-row-1440x1.png`).
- **J2:** the copy reads "generate a new copy to check the current answers" (`online-row-1440.png`).
- **J3:** "Partner (Sample) is not travelling with this application" on 6 rows, with no Generate.
- **J6:** 409, "… no longer applies to this person (…): its copies are kept, never filed.". GET shows the copy still unlocked.
- **J7:** 403, "Configuration author (simulated) works on configuration, not on cases."
- **J8:** reload shows the same rows. The page draws in 2.1–2.7 s; GET …/forms takes 0.70–0.98 s.
- **J9:** applying rows are unchanged. The Paper IMM 5257 keeps Validate, Read back and "to file it".
- axe 0 at 1440 and 1024 px. No sideways scroll at 400, 1024 or 1440 px or at 200 % zoom. Keyboard: Tab reaches a kept row's Download, and Enter downloads `IMM5475-copy-….pdf`.

## Findings (detail and fixes in `review.md`)
- **Major, J5:** the row says "Its copies are kept as they were, never filed." beside "Stale · Filed" (`rv-IMM_5257_5bb99bd8.png`). Reviewer's M1.
- **Major, J4:** the reason reads "its own rule reads No on this case's answers (always required for this combination; for a dependent child, from age 18)". It contradicts itself and never says "under 18" (`rv-IMM_5257_SCH1_885c2c0a.png`). Reviewer's M2.
- **Major, J3 and J4:** the kept IMM 5707 rows still say "To write by hand in Adobe: …". Reviewer's M3.
- **Minor:** "this case's answer says otherwise" is vague for a question asked per person, and the server refusal nests brackets (m2). The suite does not reach J3–J5 (m1).

## Score (QUALITY.md "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J6: kept forms are listed, and none can be filed |
| Next step obvious | 1 | A kept row offers no action; applying rows keep theirs (J9) |
| Plain words | ½ | J4's reason is contradictory; "says otherwise" is vague |
| Feedback and state | ½ | J5: "never filed" beside a "Filed" pill |
| Correct data | 1 | The refused lock changes nothing; `applies` and `applies_why` match the answers |
| Error recovery | 1 | The 409 gives the reason in words; reload holds (J8) |
| Accessibility and screen sizes | 1 | axe 0; 400, 1024 and 1440 px and 200 % zoom without sideways scroll; keyboard reaches Download |
| Speed | 1 | Forms GET under 1 s; no request per row |
| Visual quality | 1 | Team Pill and layout (`kept-row-1024x1.png`) |
| Trust and sources | ½ | J4: the reason names the wrong cause (M3's instruction also misleads) |
| **Total** | **8½ / 10** | Pass (8 or more, no 0). The Majors still block the review. |

To raise the score, most valuable first: M1 (the state), then M2 (the age reason), then M3 (hide the by-hand and not-on-form lines on kept rows).

## Not tested
- A real screen reader.
- An intended user's unaided walk (D17 and D20 stay with the founder).
- J5 through the real lock route: the Filed lock was set in the reviewer's own copy's database, because no form reaches ready to file plus a passed trial without long setup.
- Two tabs or a double click on the lock: the button is not offered on kept rows.

Screenshots (not committed): `/tmp/claude-0/-home-user-xpatready/ace8db74-715e-5d4a-92c5-f8724332d4d8/scratchpad/shots/`.

## Re-test at eeff622a3 (reviewer, 11 Nov)
Copy: the reviewer's own on :4456, `rv391b`, configured checkpoint, then the finished story via the suite; stopped after use.
- **J3 (not travelling):** "they are not travelling with this application". Held.
- **J4 (age):** "they are under 18, and this form is asked of them only from age 18". Held.
- **J5 (filed, then no longer applies):** "Its copy locked as “Filed” on … stays as it was; no new copy is filed." Held.
- **M3:** no by-hand, not-on-form or before-filing lines on kept rows. Held.
- **J6:** the 409 now says the reason in plain words.
- The suite passes 24/24 and qa's repro 6/6. axe 0 at 1440 and 1024 px.

| Criterion | Was | Now | Evidence |
|---|---|---|---|
| Plain words | ½ | ½ | M2 is fixed. Minor n1 remains (under the age while the rule still waits reads "its own rule reads No"), and the long questionnaire labels sit in the sentence |
| Feedback and state | ½ | 1 | One state per row: the filed copy is named, the others "never filed" |
| Trust and sources | ½ | 1 | The reason names the true cause: the age, the person, or whose answer |
| **Total** | 8½ | **9½ / 10** | Pass. No Major is open |

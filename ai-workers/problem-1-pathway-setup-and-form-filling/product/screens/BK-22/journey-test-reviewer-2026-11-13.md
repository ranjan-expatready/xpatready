# BK-22 journey test (reviewer role), 13 Nov 2026, PR #1698 at b15be9f1f

Copy: isolated `rev_bk22` on :4468 (never :4400), built from b15be9f1f with #1695's head (4ac54e63e) merged in for its Sample data and replay script, as the builder did. Configured checkpoint loaded. Live AI off, US$0. Sample people, made up.

## Journeys
1. **Main (case officer):** the Study permit family's forms are generated and read back. BK-13's replay (`tests/check_bk13_zero_code_run.ts`, unchanged) gives **40/45: 3 GAP (BK-23), 2 FAIL**. The two FAILs are check 1 ("no code change", expected on a code branch) and **IMM 1295 for the spouse: 1 by hand** ("person.current_residence_country is not confirmed, so it cannot be compared"). IMM 1294: 0 by hand, 70 written. IMM 5707 ×2, IMM 5257, IMM 5476 ×3: 0 by hand. Every copy's PDF read-back is equal and no list field holds a value outside its export values (C1b holds).
2. **Field map review (configuration author):** Study permit › IMM 1295 (09-2023) AI field-map draft › Decided. 11 cards carry the warning "The form filler cannot run a step (…) of 1 form field (first: "…"): filled as drafted, it is left to write by hand on every case." The words run to 254 characters at most, within the queue's 300.
3. **Seeded unrunnable step (error path):** `address_part:moon_phase then code_list:…` fails the rule "steps the filler runs". The item is rated Check, never High, and its words name the step and the form field. This is shown by `check_bk22_filler_steps.ts`, not by a screen walk: the checkpoint has no waiting field-map item with a flag (all 140 flagged items were accepted by the loader).
4. **Never a wrong value (break-it):** cents, words or 8 digits in a 7-character amount box go by hand. A part step with words after it is not run (by hand). An unknown relationship ("Nephew") or phone type ("Satellite") goes by hand. Six mutations of the filler each turn at least one check red.
5. **Other pathways:** I compared the old and new filler on every mapped entry of all six releases. The only changes are on fs.spouse IMM 1344 (country and province are now codes, not names; "same as mailing" is now worked out) and on IMM 5707 relationship for vv.single and wp.lmia_inside (now written). Each change is a fix or a newly run step. `check_g4_answer_keys` 93/93, `check_c72_imm5257_fill` 57/57, `check_qa318_sch1` 19/19, `check_qa403_who_fills` 37/37, `check_forms_b99_same_as` 9/9 and `check_p121_rating` all pass.

## What held
- The job page at 1440, 1024 and 400 px: no sideways scroll, axe WCAG 2.2 A/AA 0 violations, no console errors, the Decided view loads in about 0.3–0.4 s. The warning colour is rgb(102,50,0) on rgb(247,247,247), which passes contrast.
- The review queue (`/review/proposals`) lists the rule with its words as "Failed" (proposals.tsx:257). No waiting field-map item was there to show it live.

## Findings
- **Major:** the row's Done-when is not met. IMM 1295 for the spouse has 1 line by hand (journey 1). The builder's options A/B/C are open on #1698.
- **Major:** IMM 1294's Israeli-passport step writes Y for every ISR passport. The #1363 ruling makes the same question the person's own on IMM 5257 (see review.md M2).
- **Minor:** the words say "on every case", but an unanswered fact leaves the box blank, not by hand.
- **Minor:** `phone_part:nanp_*` is never flagged at review (see review.md m1).
- **Minor:** no test reads `stepsNotRun` on the review row or the card (`data-steps-not-run`). Removing either turns no check red.

## Score (reviewer, out of 10)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | 0 by hand on IMM 1294 and IMM 5707; 1 left on IMM 1295 |
| Next step obvious | ½ | the flag says what happens, not what to do (return the item, or change the step) |
| Plain words | ½ | plain sentence, but it quotes raw step syntax and says "on every case" (not accurate) |
| Feedback and state | 1 | card warning, Check rating, Failed rule in the queue |
| Correct data | ½ | C1b fixed and read-back equal; the Israeli-passport Y is inferred (M2) |
| Error recovery | 1 | anything not understood goes by hand with its reason; never rounded or truncated (tested) |
| Accessibility and screen sizes | 1 | axe 0 at 400, 1024 and 1440; no sideways scroll |
| Speed | 1 | under 0.5 s |
| Visual quality | 1 | same warning style as the card's other notes |
| Trust and sources | 1 | names the step and the form field; by-hand reasons kept on the copy |
| **Total** | **8 / 10** | pass (8 or more, no 0) |

## Could not test
A real screen reader. An intended user's unaided walk (D17 and D20 stay with the founder). Accepting a waiting flagged item on a fresh draft: there is none on the checkpoint, and making one needs a new saved AI run. The two-tab and double-click races on Accept were not re-tested, because this PR does not change the decide route. The replay ran once, not twice (it is deterministic: saved AI answers only).

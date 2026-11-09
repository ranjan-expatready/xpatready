# Journey test, reviewer role: QA-318 (IMM 5257 SCH1's mandatory Yes/No fields), 9 Nov 2026

Head: a668f2969a75acac23358bbbe66cd989aa5b51a6. The card and engine code are the same as at e9064970, where I measured them.

Setup:
* Isolated copy `rvq318` on :4435, with the configured checkpoint loaded (`/api/demo/load` sample `configured`). Live AI off, US$0, no priced button. The copy was stopped afterwards.
* The Sample family Visitor visa case 6e6a2886… was opened and filled by `check_qa318_sch1.ts`.
* Browser: Playwright Chromium (headless; no visible pane in this cloud session), acting as the Case officer.

## Journeys (persona · goal · expected)
1. **Main.** Case officer, family Visitor visa, every fact answered and confirmed. Goal: "file each adult's SCH1 with nothing left blank". Expected: SCH1 says "Facts confirmed" and no mandatory field left empty; the copy writes Q4–Q8.
2. **Alternate.** The client answers SCH1's Q5 (ill treatment) and Q6 (organizations) in the agent view. Expected: each is asked once in the form's words and says which form it fills.
3. **Empty/recovery.** The officer takes back "none apply" on Previous travel. Expected: SCH1 never says "Facts confirmed"; it names what to answer; the old copy is out of date.
4. **Recovery.** One trip is recorded. Expected: Q8 is "filled by hand" (the form counts only some trips), never a guessed Yes.
5. **Across the boundary.** The card and Ready to file read the same lines, and the lock is not a dead end (#1318 M2).
6. **Wrong data.** The same applicant gives contradictory answers to the same official question. Expected: impossible, because each question is asked once (BIC-01).

## What held
* J1 (API and DOM): SCH1 for Sample Client A and for Sample Spouse A has `missing: []`. The copy writes all five boxes and reads them back intact. Q8's reason is `nothing recorded: "none apply" answered in Previous travel` (B2–B4).
* J2: Q5 and Q6 are asked, each saying "fills IMM 5257 SCH1 for Sample Client A" (walk/01, 02). Their `question` strings are word for word in `imm5257_1e.xfa-template.txt`.
* J3, at 1440 and 1024 px:
  * The pill reads "2 facts to answer or confirm before filing", never "Facts confirmed".
  * The old copy is marked "Out of date", with the reason "Entries in "Previous travel"".
  * axe WCAG 2.2 A/AA: 0 violations. No sideways scroll and no console or page errors. The keyboard reaches "Facts to answer or confirm".
  * The case page reached network idle in 2.3 s and 2.5 s.
* J4: qa165_readiness_paths R6 setup: one trip makes Q8 "filled by hand", and R5/R6 pass (9/9). Unit check A7: recorded trips give "hand", never Yes.
* J5: Ready to file's CRITICAL "fields_left_empty" line and GET …/forms name the same box (R5). The lock is refused for its own reason (no fill trial), not as "facts to answer" (R6).

## Findings
* **Major, J6 (review M1).** The client is asked the ill-treatment question twice and the organizations question twice.
  * Once for IMM 5257: `person.ill_treatment_of_prisoners_or_civilians` and `person.violent_organization_association`.
  * Once for SCH1: the new `person.witnessed_or_took_part_in_ill_treatment` and `person.member_of_a_violent_or_criminal_organization`.
  * Nothing compares the two answers, so IMM 5257 and SCH1 can be filed with opposite answers. Cause: `samples/own-yes-no.json:80-94` labels.
* **Minor, J3 (review m1, m2).**
  * "2 facts" are counted for one answer.
  * The Q8 box is listed under "Facts to answer" with the reason "left empty on the form", and again under "Marked mandatory … still empty".
  * It is named "Country or territory the person travelled to on one trip", not the form's own Q8 question.
* **Minor (review m3).** The Prepare plan's "Every fact it reads is confirmed" (`engine/runtime/prepare.ts:84-85`) does not use the card's rule.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1: SCH1 copy written, read back intact, `missing: []` for both adults |
| Next step obvious | ½ | J3 points to "Previous travel", but counts one answer as 2 facts |
| Plain words | ½ | J3: a "fact to answer" whose reason reads "left empty on the form"; Q8 named after the trip-country question |
| Feedback and state | 1 | J3 pill honest; copy "Out of date" with what changed |
| Correct data | ½ | Values are correct (booleans → "false"; Q8 "none apply" → No), but J6 allows contradictory answers across two forms |
| Error recovery | 1 | J3/J4: taking back and recording a trip each lead to an honest state; no dead-end lock |
| Accessibility and screen sizes | ½ | axe 0 and keyboard at 1024/1440; 200 % zoom not verified |
| Speed | 1 | No new request; card computed client-side; page idle ≈2.3 s, unchanged by this item |
| Visual quality | 1 | Team pills and lists; nothing new in layout (1024 px shot) |
| Trust and sources | 1 | Official words exact; "fills IMM 5257 SCH1 for …"; Sample / Unconfirmed: expert labelled |

**Score: 8/10. Pass (8 or more, no 0).** Fixes that would raise it, most valuable first:
1. Reuse the IMM 5257 fields for SCH1 Q5/Q6. This raises correct data.
2. Count and word the Q8 line once, as "not answered", in the form's words. This raises next step and plain words.
3. Verify 200 % zoom on the case page.

## Not tested
* A visible-browser walk. This cloud session is headless; the builder's walk PNGs at a668f2969 match what I measured.
* A real screen reader.
* An intended user's unaided walk: D17 and D20 stay with the founder.
* The Mac's Adobe Validate.
* Two tabs saving the same answer: not touched by this item.

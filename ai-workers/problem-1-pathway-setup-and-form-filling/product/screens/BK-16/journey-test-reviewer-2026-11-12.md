# BK-16 PR 1: journey test, reviewer role (12 Nov 2026)

Commit **1709f2cd31d513c5e3a710cc8263425bb0859db6** (#1614; cf089d423 plus the check_sh3_resolver.ts fix). Live AI off, US$0, one isolated copy on :4456 (`isolated.sh rv_bk16 4456`), started and stopped in the same command; never :4400.
Scope (P-26): the ruling P-490 adds one form-line `who` and its studio picker option. No combination uses it until PR 2, so the case-side journeys are walked on the engine (render, case view, case words) with a hand-made Sample snapshot, not in a browser.

## Journeys (main path first)
1. **Configuration author, main path:** "This form is for the student and each child who studies." Forms tab › Change a form line (keyboard: focus, Enter) › Who fills it = "Principal, and each child only if" › Save to draft › the table and the reopened drawer read it back.
2. **Author, error:** the same line saved with Only if = Always › Review and release lists a warning in words, not an error.
3. **Case officer, family case (engine):** principal, spouse, child Yes, child No, child not answered, child not travelling › who gets the form, why, and which question is asked.
4. **Case officer, condition on the principal's answer (engine, `PRINCIPAL` subject):** children decided on the principal's answer; the principal is asked it.
5. **Case officer, a kept copy that stops applying (engine, `notApplyingWhy`):** the words for an unanswered child and for a child answered No.
6. **Across the boundary:** Ready to file for an unanswered child (code read of `api/src/readiness-inputs.ts`).
7. **Recovery:** reload after save; reopen the drawer.

## What held
- Walk (script: `/tmp/claude-0/-home-user-xpatready/6d3f81e4-91b0-51f3-a14e-9da7af894382/scratchpad/journey/walk.cjs`; shots beside it in `shots/`): **10/10** on wp.family, line IMM 1295.
  - The picker lists the option in words, with no raw key.
  - axe WCAG 2.2 A/AA on the open drawer: 0 violations.
  - Save took 505 ms. The database then has exactly one new DRAFT row with the new who; the PUBLISHED row is unchanged, and no other combination holds the value.
  - After a reload the table reads "Principal, and each child only if", and the reopened drawer keeps the choice.
  - The Review tab shows the warning: "IMM 1295 is for the principal applicant and each child while its condition holds, but it has no condition, so no child ever gets it. Build its condition on the Forms tab, or choose "Principal applicant"."
  - No sideways scroll at 1024 or 400 px, and no page or console error. The Forms tab loads in about 1.5 s on the first visit (including settle).
- My first run read the table 400 ms after Save and still saw the old value. After a 2 s wait and a reload, both this line and a control line (IMM 5257 SCH1 saved as "Spouse or partner") read back correctly. I cannot pin that on this diff; noted, not scored.
- Engine journeys (probe `.../scratchpad/wt/.../studio/tests/probe_bk16_review.ts`, plus `check_bk16_children_when.ts` 20/20):
  - The principal always gets the form; the spouse and the non-travelling child have no row.
  - Yes gives the form, No gives none, and an unanswered child gets none with no "Cannot tell yet".
  - The case view asks the unanswered child's deciding question, and it is required (P6).
  - With a `PRINCIPAL` condition, the children wait on the principal's answer and the principal is asked it (P2).
  - The case words for an unanswered child read "their answer is not given yet", not as a No.

## Findings (details and fixes in `review.md`)
- **Minor (for the tech lead):** an unanswered child's form is dropped instead of standing on Ready to file. Break B3 (`api/src/readiness-inputs.ts:127-131`) keeps a waiting form as a CRITICAL line; this `who` gives applies=false, so nothing on Ready to file waits for the child's answer, unless another line reads the same question.
- **Minor:** a principal who has an answer to the condition keeps that question, marked as deciding "whether STUDY applies to principal" (`engine/render.ts:226`), although the condition is never read for them (probe P1).
- **Minor:** on a line with a minimum age, a principal under that age who answered No is given the condition as the reason, not the age (`engine/runtime/forms.ts:99,108`; probe P4).
- **Minor (words):** one value has two names: "Principal, and each child only if" (picker) and "…while its condition holds" (`WHO_WORDS`, the release warning).

## Break it (short)
- An unknown `who` on the save route is refused (`api/src/form-lines.ts:25`, `api/src/studio.ts:974`; FORM_WHO).
- A words-only conditional line: the principal applies, each child gets "the line has no condition", and release refuses it (S5 error).
- Not done: two tabs saving the same line, wrong role by URL, long text. This diff does not touch those paths (revision tokens and role checks are unchanged).

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journey 1, 10/10; the engine journeys hold. |
| Next step obvious | ½ | With Always set, the drawer gives no hint; the warning appears only on Review. |
| Plain words | ½ | Two names for one value; untrue "decides" text for an answered principal (P1). |
| Feedback and state | 1 | Toast, read back after reload, and a release warning in words. |
| Correct data | 1 | One DRAFT row; the PUBLISHED row and other combinations unchanged. |
| Error recovery | ½ | The no-condition case is warned. An unanswered child is not held on Ready to file (Break B3). |
| Accessibility and screen sizes | 1 | axe 0; 1024 and 400 px with no sideways scroll; the drawer opens by keyboard. |
| Speed | 1 | Save 505 ms; tab about 1.5 s first visit with settle, same as main (no new requests). |
| Visual quality | 1 | Label fits the select at 1440 px (`bk16-01-who-picker-1440.png`). |
| Trust and sources | 1 | No AI; Sample labels unchanged. |
| **Total** | **8.5 / 10** | **Pass** (8 or more, no 0). |

What would raise it: the tech lead rules whether Ready to file should wait on an unanswered child for this `who`; one name for the value; a one-line hint in the drawer when this `who` has no Only if.

Not tested: a real screen reader, 200 % zoom, an intended user's unaided walk (D17 and D20 stay with the founder), and a real family case in the browser (needs PR 2's data).

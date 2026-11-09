# C6.9 UX revision: fresh challenge, 7 Nov 2026

**Who and how.** A fresh Opus agent challenged `concept-ux-2026-11-07.md` as first drafted. It did not write the concept, and it edited nothing.

It checked the concept against:
* the code, in `eligibility.tsx`, `engine/runtime/eligibility.ts`, `case.ts` and `answer-sheet.ts`;
* the pack;
* the decisions P-77, P-164, P-229, P-230, P-236, P-251 and P-393;
* the running copy on :4441, with a Playwright probe at 1024 px.

**Verdict: Build after these changes.** It found 5 Major, 9 Minor and no Blocker. Every Major is answered in the revised concept.

## Majors and answers
| # | Finding | Answer in the revised concept |
|---|---|---|
| M1 | The source label would read the wrong field. `case.ts:240` keeps the latest row's channel, which is `confirm_section` after Confirm section. No channel ever reads "Document" | Revision 4 dropped |
| M2 | BIC-05 is not in C6.9's applicability table, and its bar (document, page, Accept / Edit / Reject) is the Agent view's. Question 1 would not be needed | BIC-05 scored N/A with the reason; Question 1 removed |
| M3 | The Details text hard-coded Visitor visa judgement items (against BR-1). It misread P-229 (3), where a failed rule wins over a missing fact, and left out P-393 | Revision 1 rewritten: a rule not met gives Not eligible even with facts missing; a line for an outcome that rests on unconfirmed answers; the judgement lines stay from the release |
| M4 | Removing the Score line changes P-164 (1) and BR-11, which keep the score's place | The score place moves into the Details, so it is kept, but not always on |
| M5 | Focusable tooltips inside the listbox options would break the listbox pattern | The focusable `Tip` goes only on the result pill and the card pills. In the list, the meaning goes in the option's accessible name, so the list keeps one tab stop |

## Minors and answers
1. The tooltip example was wrong for a Possibly that comes from a review rule. Tooltip text is now built from the same parts as `outcomeWords`.
2. The role words came from the wrong source. They now come from `cases.tsx` `roleOf`. "Dependent child" against "Child" is Question 1.
3. BIC-18 was scored Met, but the read-only state is not built. It is now Partly and listed as a follow-up row.
4. Four scores were off. BIC-13 is now Partly (listed), BIC-17 N/A, BIC-20 Partly (200 % zoom not tested) and BIC-10 Partly.
5. The departures from the applicability table were not stated. The revised score says them: BIC-12 is N/A, and BIC-05 is N/A for the reason given.
6. The totals were wrong. They are recounted: Met 3 · Partly 7 · Not met 1 · N/A 9.
7. BIC-14 missed the disabled "Mark reviewed" `title`, which is now fixed as visible text. It also over-reached on the Stand-in, which is now left as is because it is demo chrome and the same pattern is used on every screen.
8. The 13 px trail is used on other screens too. It is now cross-screen Question 2, not changed here.
9. New outcome words could collide with the held P-236 rename. All new words now go through `outcomeWords`, and the hold is named.

## What the challenger found sound
* The BIC-14 diagnosis.
* Revision 5 (it reuses `lineId`; the fallback is added).
* The ISO-date fix, now also applied to the out-of-date band.
* That `role_label` exists.
* The scores for BIC-03, BIC-04 and BIC-11.
* That no pack line breaks.
* That no schema, money or permission change is made.
* Deferring the shared Pill's 11 px.

## Lead response
Waiting for the tech lead's approval comment on the PR (P-316 (3)).

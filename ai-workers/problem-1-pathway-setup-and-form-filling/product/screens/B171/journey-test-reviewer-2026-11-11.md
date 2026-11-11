# B171 journey test, reviewer role, 11 Nov 2026

Commit 042dd0ac2. Copies: branch `rv_b171` on :4456. B169 merged locally (no commit): `rv_b171m` on :4457. Main's two files: also
`rv_b171m` on :4457, run earlier. Never :4400. Synthetic people only. US$0.

## Journeys (written from the row, Lead 16, and B169 review M1)
1. **Main path (case officer).** "Which IRCC account do I enter this spousal sponsorship in?" Steps: open the fs.spouse case, read
   "How each form is filed", then open the IMM 0008 answer sheet. Expected: "Filed through PR Portal" in both places, with no code.
2. **Alternate (case officer).** "Record what IRCC acknowledged." Steps: on a Ready to file case on the PR Portal, Record the
   submission… (by keyboard), read the dialog, record, read the recorded line. Expected: "through PR Portal" in both.
3. **Alternate (paper).** A combination with no account (paper filing). Expected: "Filed on paper, with no IRCC account".
4. **Each account the Forms tab offers.** Expected: each reads in the Forms tab's words.
5. **Unchanged.** The Visitor visa still reads "Filed through APR Portal" word for word.
6. **Recovery.** Reload, and run again on a copy that is not fresh. Expected: same words, and the accounts are restored.
7. **Across the screen boundary.** From the case page, follow "Open answer sheet: IMM 0008…" by its link.

Not applicable to this row: empty states, failed AI, held files and wrong role. The row changes no route or permission, and the
dialog's role checks are unchanged.

## What held
- **J1, J7** (walked like a person on a real fs.spouse case, account from B169's data): the case page line at 1440, at 1024, and at
  1024 with 200 % zoom, then the IMM 0008 sheet through its link. Both read "Filed through PR Portal: set by the combination, not on
  the case".
- **J2:** B171-7 and B171-8, with the dialog opened by Enter. Screenshots `screenshots/03-…` and `04-…`.
- **J3, J4, J5:** B171-2, B171-3 and the APR line.
- **J6:** a second run on the same copy, 13/13. Database checked after: `fs.spouse` PR_PORTAL, `vv.single` APR_PORTAL.
- **Automated replay:** `tests/check_b171_account_words.ts` passed 14/14 on the branch (fresh copy) and 13/13 twice with B169
  merged. On main's code it passed 6/14: every behaviour check failed on the raw key.
- **Accessibility and sizes:** axe WCAG 2.2 A/AA gave 0 violations at 1440, 1024 and 1024 with 200 % zoom. No sideways scroll. No
  console or page errors.

## Data underneath
The `filing_record.portal` column still stores the key (`PR_PORTAL`); only what a person reads changed. The test's SQL account
switch is restored in `finally`. The one recorded Visitor visa case stays in that test copy only.

## Break it (short; the row changes words only)
- Every account key, including PAPER and LMIA_ONLINE: no raw key shows.
- A second run on a copy that was not fresh: passes.
- Reload: the same words.

No Blocker or Major. Minor: case-side phrasing "through PR Portal" against the Forms tab's "through the PR Portal". On the case side
it also reads oddly for "IRCC secure account" and "LMIA Online (ESDC)". The helper is duplicated in two files (review finding 1).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J2 and J7 complete with the right words |
| Next step obvious | 1 | unchanged; the answer sheet link is named for the form and the person |
| Plain words | ½ | no raw keys; case side drops "the" while the Forms tab keeps it; "through IRCC secure account" |
| Feedback and state | 1 | lock icon, "set by the combination, not on the case"; recorded group marked read-only |
| Correct data | 1 | key stored and words shown; accounts restored after the test |
| Error recovery | 1 | reload and a rerun on a copy that was not fresh both pass; the test restores in `finally` |
| Accessibility and screen sizes | 1 | axe 0 at three sizes; dialog by keyboard; no sideways scroll |
| Speed | ½ | case-page line on screen in 1.4–2.3 s on a cold load (budget: first view under 1 s); the same on main |
| Visual quality | 1 | screenshots 01–04 and my 1024 / 200 % capture: one line under the panel heading, team look |
| Trust and sources | 1 | the line says where the account comes from (the combination) |

**9/10, pass** (8 or more, and no criterion at 0). To raise the score:
1. Plain words: one contract helper and one phrasing (review finding 1).
2. Speed: this belongs to the case page as a whole, not to this row.

## Could not test
A real screen reader. An intended user's own walk without help (D17 and D20 stay with the founder).

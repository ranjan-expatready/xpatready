# B79b (#1052): what is left once #1062 (B78) is in #1050 — for whoever picks this up

Rehearsed on a scratch copy at 05:50 UTC, 5 Nov (this PR at 7d9cd6c25 + #1050 at dffef13b9 + #1062 at 28483c59a):
Family sponsorship released, `check_qa144_fs_release.ts` 25/25; Study permit 24/24, With an LMIA 23/23, Express Entry
20/20, `check_b78_section_names.ts` 9/9. `check_qa144_vv_release.ts` 33/34: its "Language(s) holds questions" line fails
on #1050 + #1062 alone too (not this PR's; told the tech lead on #1052).

1. `git merge origin/claude/epic-heisenberg-dkr5mu` (once B78 is in it). Conflicts, all "both added":
   * `api/src/form-setup.ts`, `acceptance/lib/pack2.ts`: take this branch's side (it is #1050's lines plus B79b's).
   * `samples/form-setup.json`: take #1050's file, then add the `fs.spouse` entry back as this branch has it.
   * `api/src/form-part-placements.ts`: take B78's side (the same "edited" fix; B78's comment).
   * `api/src/demo.ts`: B78's `section-names.ts` import, with #1050's `SET_UP_FROM_FORMS` from the table.
2. Append `b79b-held-section-names.json` (this folder; 15 IMM 5532 + 15 IMM 5604 entries, all from print, Sample) to
   `studio/samples/section-names.json`, then delete it here.
3. B78's two "29" counts → 59 (29 + 30), with the reason beside them: `tests/check_b78_section_names.ts`,
   `tests/check_qa144_vv_release.ts` (two places).
4. Re-run fs/vv/sp/lmia/ee checks, C4.1 (six), C4.8 and C9.1 (checkpoint), `run-suites.sh --changed`, graph, count-any;
   Opus screen-reviewer on the diff; then ready + label `review: approved`. Delete this note in that commit.

IMM 5532's pages: personal information, the tables and the yes/no questions (named by the form's title) on page 1; the declarations on pages 3 and 4 (IMM 5533 p. 10,
"Page 3, question 9 (Declaration of sponsor)", "Page 4, question 5 (Declaration of applicant)"); Part C on page 5 is
inferred (it follows Part B's page-4 declaration). The XFA template is one flowing page, so it gives no page breaks.

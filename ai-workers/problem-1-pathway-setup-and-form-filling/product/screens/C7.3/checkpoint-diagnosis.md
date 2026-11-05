# C7.3 on the configured checkpoint: why 2/13 (5 Nov 2026)

Runtime lane, cloud builder. Main ffcfb45c8. A fresh isolated copy (`rt_c73cp`, :4431), Demo › Reset, then Load the
configured checkpoint as the author: 88.6 s, released `Visitors › Visitor visa`, `Study permits › Study permit › Outside
Canada`, `Work permits › … With an LMIA – inside Canada`. Then `acceptance/C7.3.test.ts 4431 xr_studio_rt_c73cp`, with
no fixture setup. Live AI off, US$0.

## Result: 2/13 (exit 1)
Only the two refusals pass (C7.3-2 and C7.3-8: a client gets 403). Every other check fails on one answer:
`409 "IMM 5707 is filed as PDF upload: its PDF is the deliverable, so it has no answer sheet."`

## Why, exactly
1. **No released combination on the checkpoint has an Online form line.** Visitor visa release 1 files all eight of
   its lines as PDF upload (IMM 5257, IMM 5257 SCH1, IMM 5409, IMM 5475, IMM 5476, IMM 5707, IRM 0002; IMM 5645 retired),
   and so do the other two releases. The answer sheet exists only for an Online item, so there is nothing to show.
   This is correct for IMM 5707: the pack's "IMM 5707 is an Online line" is the fixture's Sample (FQ-2); on the
   checkpoint release 1 it is a PDF upload. A person meets the sheet on the checkpoint only through:
   * **release 2's channels** (DEMO.md row 9: IMM 5257 Online, so IMM 5645 as the family information form). The
     loader's row 9 is `waiting`: "Waits for row B81" (#1057, C10.1), then `api/src/demo.ts` (#1009 → B78 → B79a → B79b);
   * **Express Entry** (B79a, #1050): IMM 5669 and IMM 5406 are Online with the answer sheet only (P-171 (3)), the
     library recording `IRCC_SECURE_ACCOUNT · ONLINE` for both on the checkpoint already. Not released on main.
   Both are C10.1's checkpoint rows, not on main. **C7.3 cannot pass on the checkpoint before one of them lands.**
2. **Even then, the sheet would have no sections for most portal forms.** The sheet's sections come from
   `contracts/pdf-sections.json`, a hand-written Sample table that names four forms (IMM 5257, IMM 1295, IMM 5707,
   IMM 5476). IMM 5645, IMM 5669 and IMM 5406 have no entry, so every one of their answers would be left out
   (`answer-sheet.ts`: "a form field outside them is left out"). That is a form-number table standing in for
   configuration (P-319). Buildable now: see the PR.
3. **The pack names the form and the family.** `C7.3.test.ts` looks for IMM 5707 and checks its sections against
   `pdf-sections.json["IMM 5707"]`. On the checkpoint the Online form will be another one, so the pack has to find
   the case's Online line rather than a form number, with its 13 rules unchanged.
4. **Two open Majors name C7.3** and keep it Partial whatever the pack says: QA-153 (IMM 5707's sheet waits for the
   parents, whom no question asks) and QA-165 (IMM 5257's mandatory boxes still empty).
5. **No screen.** The sheet is `GET /runtime/items/:id/answer-sheet` only: no person can open it, copy an answer or
   tick "Entered in the portal". That is a new screen part (P-223 (4)): concept and an independent challenge first.

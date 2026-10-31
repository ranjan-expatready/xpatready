# Journey test (reviewer): C1.8 copies per form line, commit 727ea2a7

Role: reviewer agent. Date: 31 Oct 2026. Copy: isolated `screens_rev` on :4442. Headless Chromium (`/opt/pw-browsers/chromium`) driven like a person: clicks, typing and reading text, with DB reads afterwards. Screenshots were kept in /tmp (`j1`–`j6`) and not committed. The builder's checks rerun here: API 20/20, browser 11/11, axe clean.

## Journeys
1. **Main path (author, keyboard only, 1024 px).** Goal: "IMM 1295 is filed in 3 copies per applicant."
   * Steps: Forms tab, focus "Change IMM 1295", Enter, Tab to Copies, type 3, Tab to "Save to draft", Enter.
   * Result: the panel closes, the toast says "IMM 1295 saved to the draft", the row reads "Each applicant · 3 copies each", the draft bar shows 1 change.
   * Data: DB has draft v2 `copies=3` and published v1 `copies=1`. The audit `detail` has `"copies":3`.
2. **Error (author).** Typing 0 and saving shows "Copies is a whole number from 1 to 9." on the field (aria-invalid), and the panel stays open. Editing the field clears the error. Typing "2x5" keeps "2" (one digit only).
3. **Empty.** Clearing the field and saving stores 1, and the row goes quiet again ("Each applicant" only).
4. **Alternate (document line, IMM 5488).** The panel has no Copies field. The row stays "Checklist · not filed".
5. **Wrong role (approver).** The approver sees "· 3 copies each" and gets no Change button. An approver PATCH returns 403 (API check).
6. **Recovery (two tabs).** Both tabs open the panel on IMM 1295. Tab A saves 4. Tab B saving 5 shows "Changed by Configuration author at 12:29:59 UTC … Your change was not saved; reopen the item …" and the DB keeps 4.
7. **Recovery (Undo).** Undo last change puts the line back to 1 copy, and the config fingerprint equals the one before the edit (API check).
8. **Across the boundary (release).** The author submits on Review and release, then the approver approves. Release v2's snapshot contains `copies: 3` for IMM 1295 and release v1 is unchanged. Cases filling N copies is runtime's area, outside this PR.

## Screen sizes and accessibility
No sideways scroll at 1024, 720 (1440 at 200 %) or 400 px. axe WCAG 2.2 A/AA found no violations on the refused-field state, the saved row, or the panel at 400 px. No page errors.

## Break it
* API: 0, 10, 2.5 and "two" are refused on the field.
* SQL: `copies = 12` is refused by the DB check.
* A stale revision gets a 409.
* Finding: a direct PATCH with copies on a document line is accepted (Minor m2 in `review-c18.md`).

## Findings
* **Minor m1.** "Who fills it" hint "One copy for each person it names." contradicts the Copies field just below it (`web/src/pages/workspace/forms.tsx:290`).
* **Minor m2.** The server does not refuse copies on a document line (`api/src/studio.ts:570-572`).
* Already there before this commit, not scored against it:
  * At 400 px the panel footer cuts off "Save to draft".
  * Focus goes to `<body>` when the panel closes.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 saved by keyboard; release v2 carries copies 3 |
| Next step obvious | 1 | Row, draft bar and "Review and release" next step update at once |
| Plain words | ½ | Clear message and suffix, but the Who hint contradicts Copies (m1) |
| Feedback and state | 1 | Field error, toast, row suffix, draft count |
| Correct data | 1 | DB row, audit and snapshot exactly as entered; v1 untouched |
| Error recovery | 1 | Error clears on edit; a refused value keeps the saved one; 409 for two tabs; Undo exact |
| Accessibility and screen sizes | 1 | axe clean, keyboard path, no sideways scroll at 1024/720/400 |
| Speed | 1 | Save and redraw well under 1 s locally; no extra request |
| Visual quality | 1 | Fits the existing grid and muted suffix style |
| Trust and sources | 1 | "Sample" on the hint; schema notes the immigration expert's confirmation is pending |
| **Total** | **9.5/10** | **Pass** (8 or more, no 0) |

To reach 10: reword the "Who fills it" hint (m1).

## Could not test
A real screen reader. A visible-browser walk by a person (headless only). An intended user's unaided walk (D17, D20 stay with the founder). Runtime use of copies.

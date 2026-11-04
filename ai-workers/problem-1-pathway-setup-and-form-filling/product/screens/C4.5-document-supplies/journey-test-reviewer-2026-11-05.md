# C4.5 · Facts this document supplies — journey test (reviewer, 5 Nov 2026, IST)

Reviewer agent (did not build it), PR #1005 at **ec43f2a89**. Because the PR's worktree had another session's uncommitted edits (the panel, `supplies-panel.tsx`, `preview.tsx` toggle) during this check, every run used a clean `git archive` of ec43f2a89 in the reviewer's scratch folder, served on port 4453 (fresh database each run). Live AI off, no priced button, US$0 (pack step C4.5-20 and setup `spent 0`).

## Journeys (scope: API person's step, Preview try-out key, release line, read-only block on the change page, two copy fixes)
1. **Main, approver (content publisher):** the author's change "Passport information page copy · supplies 9 facts" is on To review → open it → read each fact's official words, page, date read → Approve. Expected: one draft of the type with 9 facts; SQR tab "9 from documents"; Documents drawer "Taken out: Yes"; Preview "fills 9 answers"; Library lists the facts.
2. **Alternate, author after a return:** the approver returns a change with a reason → the author follows To review's "Correct or withdraw" → withdraws, or proposes again.
3. **Empty:** before the step the SQR tab reads "0 from documents", Library "none recorded".
4. **Error:** bad input through the route (not a shared field, no quote, no or future date, listed twice, wrong "about whom", unknown key, short reason, no actor).
5. **Wrong role:** approver or reviewer proposes; author approves their own; someone else withdraws.
6. **Recovery:** reload after approval; double press of Approve; three proposals at the same moment.
7. **Across the boundary:** Preview with the passport tried as missing (the `missing:` key through the URL) → its 9 answers are asked instead.
8. **Long, non-English and hostile text** on the change page at 400 px.

## What held (evidence)
* J1: To review row reads "no fact → 9 facts; adds Number of the passport…; Official words: IMM 5484 (05-2026), page 1 (read 2026-11-05)…; Sample"; change page lists all 9 with quote, source, date (shot `j1-change-1440`). Approve → type v1 DRAFT with 9 facts, change APPROVED, one apply audit line plus the decision line. SQR tab: "9 from documents · 121 asked"; drawer: 9 facts "Yes"; Preview: "fills 9 answers"; Library row lists the 9 facts.
* J3: before the step, 0 from documents (walk step 1, pack C4.5-1).
* J4: every refusal is 400/404/409 with field-level words (e.g. `facts.0.about`: "Say whom it is about: …"); unknown keys refused (`.strict()`); no actor 401.
* J5: approver and reviewer propose → 403; author approves own → 403; someone else withdraws → 403 (pack C4.5-2, -10, -19, -25).
* J6: three concurrent proposals on one type → one 201, two 409 "already waits", one WAITING row. Double Enter on Approve → one 201 and one 409 "Already decided"; data correct. Reload after approval shows To review.
* J7: tried missing, the client's count goes 120 → 129, the passport box goes (walk, pack C4.5-16). A key for a person not in the family changes nothing (C4.5-17).
* J8: 390-character Spanish/French/Chinese quote and `<img onerror>` text render as text, no dialog, no sideways scroll at 400 px (shot `j4-long-400`).
* Automated: pack 26/26 exit 0 twice; release check 7/7 exit 0; builder's walk 10/10 exit 0 twice; axe WCAG 2.2 A/AA 0 violations on To review and the change page; sideways scroll 0 at 400, 720 (≈200 % zoom of 1440), 1024, 1440; keyboard only: To review → change link (Tab, Enter) → Approve (Tab, Enter), focus ring visible (shot `focus-approve-1024`); no page errors; To review first view 930 ms, change page 113 ms.

## Findings
* **Major — the returned path is a dead end with wrong words** (J2). The author's change page for a returned facts change shows the new-field form "Correct it and send it again" with **Name** and **Meaning** (shot `j2-returned-author-1440`); **Send again** is always refused 409 "A returned change of the facts a document supplies is not sent again…" (shot `j2-send-again-1440`); the withdraw button reads **"Withdraw the new field"** and its toast reads **"Withdrawn: undefined form fields back to "no decision""**. Cause: `web/src/pages/review-items.tsx:116` sends every returned kind that is not a rename or lifecycle kind to `<Correct>`; `:207` reads `form_fields_reopened`, which the withdraw answer for this kind does not carry (`api/src/library-changes.ts` renaming branch).
* **Major — the Documents tab points to a control that is not there** (J1, J7). `web/src/pages/workspace/documents.tsx:139` now says "…"Try it missing" there shows them asked instead", but at ec43f2a89 Preview has no such control (0 matches; the try-out works only by editing the URL).
* Minor — a double press of Approve shows a red "Someone decided this change at the same moment" toast beside the green success one (shot `j1-approved-1440`): the existing Decide button, not this PR; the data stays correct.
* Minor — the same facts have two names: Library › Document types says "Passport number, Birth city", To review says "Number of the passport or travel document, City or town of birth".

## Score (0, ½, 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 end to end; data checked in the database |
| Next step obvious | ½ | J2: "Correct or withdraw" leads to a field form that cannot be sent |
| Plain words | ½ | "Withdraw the new field"; "Try it missing" names a missing control; otherwise plain and named |
| Feedback and state | ½ | "undefined form fields" toast; chips and toasts otherwise right |
| Correct data | 1 | one row per change; race and double press safe; nothing changes before approval |
| Error recovery | ½ | the refusal message explains, and withdrawing works, but the page offers the refused action first |
| Accessibility and screen sizes | 1 | axe 0; keyboard path; 400/720/1024/1440 with no sideways scroll |
| Speed | 1 | 930 ms and 113 ms first views; one request per view |
| Visual quality | 1 | team components, matches the existing change pages |
| Trust and sources | 1 | every fact shows its official words, form, edition, page, date read and Sample; quotes match the committed text |
| **Total** | **8 / 10** | Pass (8+, no 0). Most valuable raises: fix J2's returned view and words (+1½), fix the Documents sentence (+½) |

**Could not test:** a real screen reader; an intended user's unaided walk (D17, D20 stay with the founder); the author's own UI step (the panel is not in this PR, per the tech lead's ruling); a release on the six (blocked by C4.8, B70; proven on the fixture only).

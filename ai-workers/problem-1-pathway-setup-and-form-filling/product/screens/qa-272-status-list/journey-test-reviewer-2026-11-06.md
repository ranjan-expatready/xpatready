# Journey test, reviewer role — QA-272, 6 Nov 2026

Commit **a46fa2a301a38561d802907b7a38fea521f0351c**. **Evidence-based simulated review, not a fresh visible-browser walk.** The isolated server was intentionally stopped; this sandbox could not reach PostgreSQL :54329. I read the maker's 1440 px walk/screenshots and fresh isolated acceptance log, inspected code, independently ran the engine pack twice, and ran a temporary rule-removal check. No live AI, US$0. D17/D20 remain with an intended user.

## Journeys (persona · goal · result)

1. **Main, case officer:** load the configured checkpoint; open the Sample family and Client A; add current-country immigration status; choose Citizen; Save; Confirm section; Prepare application; generate IMM 5257. **Held:** nine choices shown; ten answers confirmed; new copy Generated; request `CurrentCOR.Row2.Status = 01` (acceptance lines 38-42; four screenshots).
2. **Alternate choices:** choose any status from Citizen through Foreign National and fill its own code. **Held in engine/property tests:** exact label/code pairs, 100 generated code cases, no out-of-range code.
3. **Error, old value:** enter `01..09`. **Held:** the answer reports “Choose one of: Citizen … Foreign National”; it is not a valid choice.
4. **Empty:** before answering, Personal details shows Not answered and Add. **Held:** visible behind the status dialog in `status-choices-1440.png`.
5. **Legacy release:** a map still holding a bare range. **Held:** `shapeOf` leaves the answer open and never offers `01..09`; unit fail case passes.
6. **Recovery:** reopen Citizen and Cancel without a change. **Held in maker walk:** Citizen remains selected and “Now: Citizen (Confirmed by the officer).” Reload mid-save and double-click Save were not rerun.
7. **Boundary:** confirm the answer, then generate a new form copy. **Held:** earlier copies remain; the new copy is Generated with 12 fields written/read back; request JSON independently supplies the code-01 assertion.
8. **Wrong role / duplicates / failed AI:** no authorization route changed. Existing acceptance uses officer `user-O`, duplicate checkpoint load gets 409, and all map work is replay with ledger unchanged. A new wrong-role browser attempt and failed-AI path were not needed for this engine fix.
9. **Hostile/awkward option data:** missing options, non-range notes, and labels containing comma, equals, semicolon or brackets leave the transform unchanged. **Held:** unit fail cases pass rather than inventing a partial interpretation.

## Break-it evidence

- Rule disabled in a temporary copy: **72/76, exit 1**; four QA-272 checks failed and literal `01..09` returned. Normal exact-commit pack: **76/76 twice**.
- Fresh configured acceptance: **45/45**, including ten confirmed answers, code 01, no live AI/spend, duplicate-load refusal and Reset cleanup.
- No product finding. Not exercised: non-English free text (the fixed list needs none), hostile upload (unchanged), concurrent tabs, real screen reader, keyboard-only, 400/1024 px, 200% zoom, axe, or Adobe/PDF visual inspection.

## Score

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Citizen answered, section confirmed, IMM 5257 generated with code 01 |
| Next step obvious | 1 | Save → Confirm section → Generate a new copy in walk screenshots |
| Plain words | 1 | Nine form labels; validation spells out valid choices |
| Feedback and state | 1 | Confirmed answer, 10/10 section counts, Generated/read-back state |
| Correct data | 1 | Acceptance reads generated request field as `01`; property checks all codes |
| Error recovery | ½ | Invalid range refused and Cancel preserves value; reload/double-click not rerun |
| Accessibility and screen sizes | ½ | Native labelled select, visible focus and maker accessibility-tree reading; keyboard/zoom/axe/small widths unverified |
| Speed | ½ | No status-interaction timing against the budgets; no new request path |
| Visual quality | 1 | Existing calm team dialog, answer row, section and generated-copy cards at 1440 px |
| Trust and sources | 1 | PDF-resolved options, fills-form explanation, Sample labels, replay only, US$0 |

**Score: 8.5/10 — Pass** (8 or more, no 0). The half-points are evidence limits, not new scope: independent recovery/accessibility/timing walks would raise them. No Blocker or Major; review verdict **Approve**.

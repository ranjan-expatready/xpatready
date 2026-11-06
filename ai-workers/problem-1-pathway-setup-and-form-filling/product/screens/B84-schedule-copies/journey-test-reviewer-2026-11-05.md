# B84 — journey test, reviewer role (5 Nov 2026)

PR #1060 at 9e352c78. The walk copy :4451 (configured checkpoint, case SAMPLE-VV-FAMILY-1, case officer `user-O`) and my own copy :4455 (C7.7 pack). Playwright headless Chrome at 1440 px, clicking and reading only. Live AI off, US$0. My screenshots were kept outside the repo (scratchpad `walk/`); the builder's committed screenshots are in `screenshots/`.

## Journeys
1. **Main.** Case officer: "make Schedule 1 for the partner". Cases › SAMPLE-VV-FAMILY-1 › row "IMM 5257 SCH1 for Partner (Sample)" › Generate a new copy. Expected: a copy is made. **Held.** The toast "A new copy of IMM 5257 SCH1 for Partner (Sample) is being generated." came in 306 ms. The row showed a new Generated copy about 2.4 s later, and Earlier copies went from 2 to 3. After a reload it stays at 3. In the database: one new `form_instance`, GENERATED, `created_by` user-O, `intact: true`. `GET /form-copies/:id` returns `source: ircc_pdf`. The file is a 624 kB `%PDF-1.7`.
2. **Keyboard only.** The same for Child: focus the row heading, Tab once to Generate a new copy (focus ring visible), press Enter. **Held.** One new GENERATED copy for Child.
3. **Alternate (dependants' form).** IMM 0008 DEP for the child of 15. No release in the product holds DEP, so this ran only through the pack's patched release (C7.7-28): 202, then GENERATED and intact. **Held**, but only as scaffolding.
4. **Error, wrong form number.** Fourteen hostile or near-miss numbers (see `review.md`) all gave 404 "No such form.", never echoed. C7.7-30 counted no new copy. **Held.**
5. **Error, form not for that person.** SCH1 for the child of 15, and DEP for the principal: 422 "… does not apply to that person on this case." (C7.7-29). **Held.**
6. **Error, a line with no PDF map.** IMM 5409 with no map: "IMM 5409 has no PDF to fill in this case's release." (C7.7-31). **Held.**
7. **Wrong role.** As the client (`user-P`): 403 "Only the case officer can do this.". As the author: 403 "… works on configuration, not on cases.". The client also gets 403 on the copy's file download. **Held.**
8. **Recovery.** A pack step that crashes after the release was patched (an injected throw in a scratch copy of the pack): the release, its fingerprint, the pins and the trigger were all exactly as before. **Held.** See review Minor 3 for the unreported case.
9. **Screen boundary.** The copy goes on to Download and to "Validated copy uploaded back" / "Filed". Both are disabled and say why ("no fill trial is recorded for edition IMM 5257 SCH1 (09-2023), so this copy is for checking only, not for filing"), as QA-235 expected. **Held.**

## Automated replay
axe (WCAG 2.0/2.1/2.2 A and AA) on the case page after Generate at 1440: 0 violations. Sideways scroll: 0 px at 1024, at 400, and at 200 % zoom (720 CSS px). Console and page errors: none. The C7.7 pack ran once with the scaffolding (33/33) and once with an injected failure (restore verified). The walk ran twice: two copies each for Partner and Child, with no flakiness.

## Break it (15 min)
URL injection (markup, `%2F`, prototype keys, 5000 characters, non-English): all 404 with fixed words. Generating again with an earlier key for another form: `formOf` refuses an unknown number first, and a known one keeps the 409 rule (unchanged). A double press: the button is busy while working. No new break found. Findings are listed in `review.md` (Minors 1–5).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J2: SCH1 copies made through the screen |
| Next step obvious | 1 | One Generate button per row; the disabled lock buttons say why |
| Plain words | 1 | "No such form.", "does not apply to that person on this case." |
| Feedback and state | 1 | Busy button, toast, Generated state, Earlier copies count |
| Correct data | 1 | One row per press; none on refusal (C7.7-30); release restored exactly |
| Error recovery | 1 | J4–J8 |
| Accessibility and screen sizes | 1 | axe 0; 1024, 400 and 200 % with no sideways scroll; keyboard path |
| Speed | 1 | Toast 0.3 s; copy about 2.4 s in the background with visible state |
| Visual quality | 1 | Team components, unchanged layout |
| Trust and sources | ½ | Honest "Checked copy, not for filing". But "read back and checked" on a DEP copy covers only the written values: the "other data" half is empty for DEP (review Minor 1) |

**9.5 / 10: pass** (8 or more, no criterion at 0). To raise trust and sources: make the "other data" check compare the leaves that are new in the copy (review Minor 1).

Not tested: a real screen reader; an intended user's unaided walk (D17 and D20 stay with the founder); DEP through the product's own screens (no release holds it).

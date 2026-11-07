# M3-A4 (B106) build notes

Builder: seat B-2 (stream B), 6 Nov. Concept: `concept.md` (approved by the tech lead on #1172 with conditions, §11); challenge: `challenge.md`. No board (P-223 (4)).

## Files
| File | What |
|---|---|
| `prototype/studio/web/src/components/eligibility-gates-editor.tsx` (new) | `EligibilityGatesSection` (read view, marks, problems, waiting line, read-only reasons) and the edit dialog (`GatesEditor` → `GatesForm`); `keyFor` (BR-4, m9) |
| `prototype/studio/web/src/components/conditions.tsx` | Q1: `only="person-questions"` (default off): subject fixed to PERSON with "Checked for each person", no calculated values (the `/library/derived` read is skipped), a declaration typed as yes/no; `subjectLabel("PERSON")` reads "each person" |
| `prototype/studio/web/src/pages/combination.tsx` | Q2: the one mount line on the Questionnaires tab (end of the tab, m7) |
| `prototype/studio/tests/check_b106_gates_browser.cjs` (new) | J-A4 and BR-1…BR-9, axe, 1024 px; 56 checks |
| `product/tools/route-has-screen-allow.txt` | the `PUT /combinations/:id/eligibility-gates` line removed; `route-has-screen.mjs` exit 0 |
| `api/src/eligibility.ts` | not changed: every refusal already reads in words on the screen |

## Mapping to the concept
* BR-1 one PUT at the version read (no version on the first save). BR-2/m8 Edit only with `useSessionView().canAuthor`. BR-3 the builder's Q1 setting; the rule is sent with `subjectKind: "PERSON"`. BR-4/Q3 key from the label at the first save, kept after; `gate.rule_<n>` fallback; taken = draft keys + newest release's keys. BR-5 lines and disclaimer (empty → `null` → the Sample default). BR-6 marks and count from `draft.changes` kind "Eligibility" (m3); the number from `releases[0].release` (m2); the three refusals (a), (b), (c) are the existing flow, tested. BR-7 `draft.problems` where "Eligibility", under their gate by `item`; the rest below the list. BR-8 409 keeps edits, Reload. BR-8a every gate's `whenNotMet` and the saved disclaimer are sent back (m5); the waiting line when a submission is SUBMITTED (m4). BR-9 retired → read-only; Edit waits until the summary is read (found in the build: it showed for a moment otherwise).
* The web declares `EligibilityGatesView` locally: importing `contracts/eligibility.ts` makes the web type-check reach engine files that need Node (`tsc -p web` failed). The shape is the contract's.

## Checks (6 Nov)
* `tests/check_b106_gates_browser.cjs` 56/56 exit 0, fresh copy, the fixture (setup_visitor_visa 15/15; setup_vv_m3 44/46, its known S2w and S7a gaps).
* `acceptance/C6.9.test.ts` 15/15 exit 0 on its own fresh fixture copy (m6). A1 (#1084) is not on main, so not on the checkpoint.
* `route-has-screen.mjs` 0 · `graph.mjs --check` 0 · `count-any` 418 = base · `tsc -p web/tsconfig.json` 0.

## Seen, not this row
* The case's Eligibility page says "release 3" (the combination's own release number) where the combination header and this section say "In Release 4" (the pack's): two numbers for one release, already on main.
* Review and release's heading says "released version N" (the combination's number), the header "In Release N" (the pack's): the same split.
* Review's Eligibility line for an added gate shows the field key in its rule ("rule: person.intended_job_title is answered", `engine/eligibility-gates.ts` shortWords).

## Self-score (honest; the reviewer scores)
D1 job done by screen: 4 · D2 rules: 4 · D4 errors on fields: 4 · D7 permissions: 4 (server decides; screen says why) · D10 accessibility: 4 (axe 0 on section and dialog) · D12 responsive: 4 (1024 px no sideways scroll) · D17/D20: not self-awarded. Known gaps: no keyboard-only walk scripted (every control is a native input, button or radio); no 200 % zoom check.

Cost: US$0, no model call.

## After the review and the breaker (on 2e7f53506; fixes in the next commit)
Both found the same **Blocker**: the dialog was a `<form onSubmit={save}>` and the team `Button` has no `type`, so Add a comparison, a comparison's bin, Add a gate, Add a line and Reload each saved the set. **Fixed:** the form never submits by itself; only Save saves. Fail tests: Add a comparison and a bin keep the dialog open at the same version; Add a gate shows no refusal before Save.
* **Breaker M1** (an empty value saves a gate nobody can meet): **fixed** on the row (gate mode says it at once) and by the save (`api/src/eligibility.ts` `emptyValues`, 400 on the gate's rule, also for "is one of" with none). Fail tests by screen and by route.
* **Fixed Minors:** Cancel asks before discarding (break m3, review m3) · the Keep button takes focus on Remove, Add a gate after it, Edit after the dialog closes (break m4, review m4) · the tip is the team's `Tip`, reachable by keyboard (break m4, review m1) · a refusal because the combination was retired is not "Changed by someone else" (break m5; tested) · errors are cleared on Remove (break m2) · each mark has a tooltip (review m2) · "Review and release" is a link (review m5) · the released disclaimer is called the Sample default only when the draft did not change it (review m6) · no bare "Draft" (review m8) · gate mode says at once that another subject kind is refused (break m1) · tests for the needs_review radio, the default disclaimer at release (review m7; the waiting line was already tested in both cycles).
* **Not fixed, listed:** at 200 % zoom the question name is cut and the type code (`yes_no`) shows under a row (break m6): it is the shared builder's line for all four of its users, not this screen's. The in-app Back button does not ask before leaving a dirty dialog (break m3): the same as every other editor (beforeunload only).
* After the fixes: `check_b106_gates_browser.cjs` **68/68** exit 0 on a fresh copy.

## After the diff-only re-review (on 86070c912)
* **Re-review N1 (Major): fixed.** Cancelling the form's submit was not enough: inside a `<form>`, Enter in a field "clicks" its first submit button (gate 1's first comparison bin; Reload while a stale notice shows). The dialog's body is now a `role="group"`, not a `<form>`, so no button in it is a submit button and Enter does nothing. Fail test: Enter in gate 2's label leaves gate 1's two comparisons and the version unchanged.
* **New Minors fixed:** the empty-value refusal names the question ("Passport Number"), not its key · the gate-mode subject message is in words · the ⓘ's own name is short ("About eligibility rules"); the tooltip carries the text.
* `check_b106_gates_browser.cjs` **69/69** exit 0 on a fresh copy.

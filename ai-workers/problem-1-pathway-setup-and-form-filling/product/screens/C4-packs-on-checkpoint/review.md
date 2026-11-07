# Review: row C4, pack C7.6 onto the configured checkpoint (PR #1249)

Independent Opus reviewer (P-303), 7 Nov 2026. Commit **ff47fe7b85a40294188f02ef6fa054ff695f5bf4** on `claude/zen-fermi-poiqv8`. Code diff `1e1ca443e..ff47fe7b8`, where 1e1ca443e is origin/main, merged into the branch. I did not build it. The only code file is `prototype/studio/acceptance/C7.6.test.ts` (+49/−18). This row has no concept.md, so I checked it against: row C4 of `design/m3-sprint-plan-2026-11-06.md`; the tech lead's rulings on #1225 (Lead 30, 14:55 and 15:30 IST); P-319, P-330 (7), R1/P-380; and AGENTS rules 4 and 5.

**Outcome: Ship (Approve).** No Blocker or Major is open. Two Minors, both about step and NOTE wording.

## What I ran myself (own copies on :4471, :4472, :4473, each stopped afterwards; live AI off; US$0)
* **Checkpoint** (`rv_c76`, Demo › Reset, then Load configured): **22/25, exit 1.** Red: -5, -12, -19. -4 used the required `person.national_id_issue_date`, and the line names the kind. Both NOTE lines (the principal and the solo case) read Paper, status 200. -22: 409 with `barcode_not_validated` only. The api log has no 5xx.
* **Fixture** (`rv_c76f`: `setup_visitor_visa.ts`, then `setup_vv_m3.ts` 44/46 with S2w and S7a red, as recorded): **25/25, exit 0.** No NOTE line, so nothing was switched. -6 reads "on PDF upload", and -20a/-20 read IMM 5707.
* **Main's pack on a fresh fixture** (`rv_c76m`, the 1e1ca443e version): 25/25. Its -4 picks the same `person.national_id_issue_date` as the branch. So the dob/expiry exclusion and the "optional first" order leave fixture behaviour unchanged.
* **Second checkpoint copy** (`rv_c76j`): J-C3 by screens, `check_c3_jc3_browser.ts`: 25/25 at 1440 px, axe WCAG 2.2 A/AA clean in all 5 states, no page error. A repeat pack run on the same copy, after J-C3, gave the same 22/25 with the same -5, -12 and -19 red, so it is not flaky.

## Against the rules
* **Same assertions, no step dropped or added (P-330 (7)):** the step ids are identical on both sides (1–22, with 6b, 20a and 20b). Each predicate is the old one with the form literal replaced by `BC`, `HS` or `FAM`. Where the form is read, there is a guard: -4 and -6 `!!BC && b.words.includes(BC)` (lines 72, 77); -7 `!!HS` (80); -10 `!!BC` (85); -11 gives `signed = 0` without HS (87). If `eds` is empty, -20a, -20 and -20b fail, because `setUntil` returns false (111). None of these can pass on an undefined form.
* **Forms from C1's `expectedLines` (R1):** `linesOf` (lines 21-24) reads `expectedFor(...)[name]` over `forms` plus `waiting`. On release 2, IMM 5476 sits in `waiting`, on "uses a representative". `acceptance/lib/m3.ts` is unchanged, `expectedFor` was already exported, and no other importer is touched (diff stat: one file under `prototype/`).
* **IMM 5707 → IMM 5645 through `family`:** this held on the checkpoint, where -20a and -20 name IMM 5645 and pass. The SQL interpolation is guarded by `/^[A-Z0-9 ]+$/` (line 110).
* **No hard-coded form number or channel in a check (P-319):** form numbers appear only in comments. `"ONLINE"` in `asPaper` and `BCC` decides whether to switch, from the release line; the check itself does not read it. `e.channel <> 'ONLINE'` (line 110) was already there before this PR.
* **Paper under founder Q3 (Lead answer 1):** `asPaper` (lines 32-37) uses the product's own route, PATCH `/runtime/items/:id/channel` (`api/src/case-prepare.ts:515`). That is the route the "Change channel" screen sends (`web/src/runtime/item-channels.tsx:125`), so this is not scaffolding (P-33). The written reason is "Cannot apply online: accommodation (Sample)", and the comment carries "Sample … Unconfirmed: no counsel" (AGENTS rule 4). The fixture is untouched: its line is a PDF upload.
* **Gaps stay visible, nothing passed in the pack:** `fillEverything` is unchanged, so the 17 IMM 5476 facts (QA-300) are not answered. -12 and -19 stay red on the checkpoint with `missing_facts` plus `missing_signature` (Paper, B132). The pack passes no warning on the principal's case except `missing_document` at -17, which the step already did.
* **-22, the solo case's Paper switch:** this is needed because IMM 5257 Online makes no `barcode_not_validated` block, so the step would have nothing to be refused by. The step passes every warning with a reason, as it always did; on the fixture that already included IMM 5476's `missing_signature`. So passing the solo case's Paper signature is the step's own meaning (P-315). It does not hide B132, which -12 and -19 still show.
* **-4 (Lead answer 3):** an optional date is used first, and a required one only when no optional date exists. The date of birth and expiry dates are left out (line 64). The rule holds: status < 300 (saved, P-47), plus a CRITICAL `fact_problem` naming the form. The label names the kind. The restore (line 73) puts back the date's earlier value (`answer.value` is the stored string, `engine/runtime/case.ts:318`), or "1990-01-15" as before when there was none. On the checkpoint, -5's remaining warnings hold no `fact_problem`, so the restore worked.
* **Rule 5:** no personal names in the diff, README or runs. Roles only ("the tech lead", "Lead 30", "Sample Client A").

## D1-D20 (a pack-only change: no screen, route or schema)
D1 Requirement fit 9: row C4's Change and all three of Lead 30's answers are met. The checkpoint exit 0 waits on B107 and B132, as recorded.
D2 Data integrity 9: the pack writes only through product routes; editions are restored at -20b.
D4 Rule integrity 9: each rule tests the same thing on both data sets.
D16 Testability 9: the steps fail when their rule is removed (-6, -10 and -20 are guarded against undefined forms). -2 and -22 are the exception (m1).
D18 Provenance 9: the reason is labelled Sample and Q3 is cited. The runs are logged in `runs/`.
D19 Closure 8: the C7.6 path runs on release 2 up to the two named gaps.
D3, D5–D15: not applicable or unchanged (no product file). D7: no AI. D17 and D20: simulated only.

## Issues
1. **m1, Minor (Should): two labels can print "undefined" and still pass.** -2 (line 51) and -22 (line 136) name `${BC}` and `${SL.barcode?.form}`, but their predicates never read the form. When `expectedFor` returns null (a case pinned to an older release: `lib/m3.ts:297-304`), the line would read "undefined has a CRITICAL…" and pass. Today both data sets give IMM 5257, so the risk is not reached. **Fix:** add `!!BC &&` to -2 and `!!SL.barcode?.form &&` to -22, as -4, -6 and -10 already do. This does not change the meaning on either data set.
2. **m2, Minor (Should): the switch's words do not follow its result.** `asPaper` (line 36) prints "switched to Paper …" whatever the PATCH answers. -6's label takes "on Paper" from the release line (`BCC`, line 45), not from the item after the switch. A refused switch still turns -6 red, because Online has no barcode block, so nothing passes vacuously. But the log would say "switched" and "on Paper" when the switch did not happen. **Fix:** word the NOTE from `r.status`. Take `BCC` from the item's channel in `/prepare`.

## Not checked
* Graph (P-86): `tools/graph.mjs` rewrites `qa/GRAPH.md`, which I may not edit. The PR reports `--check` exit 0.
* The other suites the PR lists (`run-suites.sh --changed`). Main's checkpoint baseline of 15/25 (run 42357755876).
* That the remaining `missing_signature` at -12 is IMM 5257's "signed in pen": the recorder truncates the words. This rests on the builder's measurement on #1225.

## Journey test (reviewer, the one score for this check; a pack-only change, so it is scored on the pack's path)
Journeys: J1, the case officer takes Client A to Ready to file on release 2 (the pack on the checkpoint). J2, the same on the fixture. J3, the Paper switch by screens with an accommodation reason, then Ready to file names the Validate block (J-C3 browser). J4, a wrong role: the client cannot pass a warning or mark ready (-18). J5, an error: Paper without a reason is refused (J-C3), and a barcode block cannot be passed (-6b). J6, a repeat run on the same copy.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Fixture 25/25. Checkpoint 22/25: the last mile waits on B107 and B132, named and not hidden |
| Next step obvious | 1 | J-C3 screen path; the 409 names its blocks and warnings |
| Plain words | 1 | Step labels name the real forms; the 409 detail reads "6 open warnings (pass each with a reason…)" |
| Feedback and state | 1 | NOTE line per switch; the Validate block appears and clears (-6, -10) |
| Correct data | 1 | Fixture -4 fact identical to main; editions restored; the -4 answer restored |
| Error recovery | 1 | -16 refuses a pass with no reason (400); -6b refuses a pass of the block (409) |
| Accessibility and screen sizes | 1 | J-C3: axe clean in the 5 states at 1440 px (this PR changes no screen; the C3 review covers 1024 and 400 px) |
| Speed | ½ | Pack run about a minute; not timed against the §9 budgets |
| Visual quality | 1 | No screen change; J-C3 screenshots in my scratch folder |
| Trust and sources | 1 | The reason is Sample, Q3 is cited, "Unconfirmed: no counsel" is in the comment |

**Score 9/10, no 0: pass.** To raise it: B107 and B132 landing (task completed); timing the Ready to file refresh against §9 (speed).
Not tested: a real screen reader, 200 % zoom, and an intended user's unaided walk (D17 and D20 stay with the founder).

**Verdict: Approve** (ff47fe7b85a40294188f02ef6fa054ff695f5bf4). Blockers: none. Majors: none. Minors: m1, m2.

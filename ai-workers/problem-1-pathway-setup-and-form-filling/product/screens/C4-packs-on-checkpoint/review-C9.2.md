# Review: row C4, pack 2 of 4, C9.2 onto the configured checkpoint (PR #1283)

Independent Opus reviewer (P-303), 7 Nov 2026. Commit **61897c92d826acdc8f97aad9b10fc7188f715cc7** on `claude/zen-fermi-poiqv8-c92`, base `origin/main` 3470dc992. I did not build it. The only code file is `prototype/studio/acceptance/C9.2.test.ts` (+36/−17). The record is `C9.2.md` with `runs/C9.2-*.txt`. This row has no concept.md, so I checked it against: row C4 of `design/m3-sprint-plan-2026-11-06.md:164-172`; Lead 30/31 (#1225, #1249; README on #1249's branch); P-319, P-330 (7), R1/P-380; and AGENTS rules 4 and 5. Sister pattern: `review.md` on `claude/zen-fermi-poiqv8` (C7.6).

**Outcome: Ship (Approve).** No Blocker or Major is open. Three Minors (m1 to m3).

## What I ran myself (own copies, each stopped afterwards; live AI off; US$0)
* **Checkpoint** (`rv_c92` on :4471; Demo › Reset, then Load configured): **11/11, exit 0.** Two NOTE lines, each with status 200: "IMM 5257 is ONLINE … Paper with an accommodation reason (founder Q3)" and "IMM 5645 is PDF_UPLOAD … filed Online". -7 lists the spouse's forms as `IMM 5257 to_do, IMM 5257 SCH1 to_do, IMM 5645 to_do, IMM 5476 ready`. -9 names IMM 5645.
* **Fixture** (`rv_c92fx` on :4472): `setup_visitor_visa.ts` exit 0. `setup_vv_m3.ts` exit 1, with only S2w and S7a red, the same as recorded on #1249. The pack gave **11/11, exit 0.** No NOTE line was printed, so nothing was switched. -9 names IMM 5707. Fixture behaviour is unchanged.

## Against the rules
* **Same assertions, no step dropped or added (P-330 (7)):** the step ids are identical on main and on the branch (-1 to -11). Each predicate is the old one with the literal replaced by `BC`, `HS` or `FAM` (lines 46-91). At -5 (line 70), `/IMM 5257/.test` becomes `!!BC && b.words.includes(BC)`, which is equally strict: both match "IMM 5257 SCH1" too. No step was weakened or moved.
* **Forms from C1's `expectedLines` (R1):** lines 22-23 read `expectedFor(c.id)["Sample Client A"]` over `forms` plus `waiting`. On release 2, IMM 5476 is in `waiting`. `barcode`, `family` and `handSigned` are the helper's own kinds (`lib/m3.ts:198, 207-209, 263-266`). The diff stat shows one file under `prototype/`, so `lib/m3.ts` is unchanged.
* **No form number or channel in a check (P-319):** outside comments, the file has no "IMM". `"ONLINE"` and `"PAPER"` appear only in `fileAs` (lines 29-37). There they decide whether to switch, from the release line; no check reads them.
* **Barcode form to Paper (Lead 30, answer 1):** `fileAs(BC, …, "PAPER")` (line 36) uses the product's own route, PATCH `/runtime/items/:id/channel` (`api/src/case-prepare.ts:670`). The server enforces two things: the item's accepts, and a written reason for Paper (`engine/runtime/prepare.ts:108-113`). The reason is "Cannot apply online: accommodation (Sample)". The comment carries Q3, "Sample" and "Unconfirmed: no counsel" (lines 24-26), so AGENTS rule 4 is met. The guard at line 30 switches only an Online line, so the fixture's PDF upload is left alone.
* **IMM 5645 from PDF upload to Online (line 37). It is legitimate, and it keeps -9's meaning.**
  * -9 tests C7.3's "Entered in the portal" tick going out of date. The answer sheet and the tick exist only for an Online item (`onlineItem`, `case-prepare.ts:520, 532`), so on release 2's PDF upload the step could not run at all. README (c) on #1249 already named this switch.
  * The switch stays within the item's accepts: a channel outside them is a 422 (`prepare.ts:108`), and the measured status is 200.
  * It touches only the principal's item, so -7's scope does not change. -7 reads the spouse's IMM 5257 and IMM 5476, and both are untouched; the spouse's IMM 5645 stays a PDF upload, `to_do`.
  * Cost: release 2's own configuration (the family form as a PDF upload, going out of date on a spouse change) is not exercised by this pack. No step of the pack ever covered that path, so it is not a finding.
  * Lead 30's answer 1 covers only the barcode form. So line 37 rests on the row's own gate, the tech lead approving the changed lines (P-400), and `C9.2.md` asks for that.
* **No product gap answered or passed inside the pack:** `fillEverything` is unchanged. No warning is passed. -5 still requires `ready === false` with a CRITICAL `out_of_date`.
* **Rule 5:** no personal names in the diff, `C9.2.md` or the runs.

## Vacuity
`itemsOf(p, P, "")` returns **every** item of the person (`lib/m3.ts:182`, `!form ||`); it does not return none. With `HS = ""`, -10 (line 91) is true as soon as the principal has any `out_of_date` item and any `to_do` item, which is the case after -9. With `BC` and `HS` both `""`, -8 (line 75) is true trivially. A green 11/11 still cannot be reached when `BC` or `HS` is empty, because -2 (line 54) then fails:
* with no form, `generateCopy` returns no copy;
* a signed scan on a form that is not hand-scanned is refused with 409 (`api/src/sign-steps.ts:128`).

`FAM = ""` alone leaves -2 green, and -9 (line 83) then reads the principal's first item. On both data sets `BC`, `HS` and `FAM` are set (my runs above). See m1.

## Issues
1. **m1, Minor (Should): the per-step guards are missing, unlike C7.6 round 2.** -3, -6, -8, -9 and -10 (lines 59, 71, 75, 83, 91) read `itemsOf(…, X)` without first checking `!!X`. On an empty form name they evaluate over all of the person's items, as described under Vacuity. **Fix:** add `!!BC && !!HS &&` to -2 and -8, `!!BC &&` to -3, `!!HS &&` to -6 and -10, and `!!FAM &&` to -9. This changes the meaning on neither data set.
2. **m2, Minor (Should): the NOTE's words do not follow the PATCH result.** Line 34 prints "the principal's filed on Paper …" or "… filed Online" whatever `sw.status` is (the status is only shown in brackets). A refused switch still turns -2/-3 or -9 red (an Online copy is "not for filing"; a PDF upload has no answer sheet), so nothing passes vacuously. **Fix:** word the line from `sw.status`, as C7.6's `asPaper` does after round 2.
3. **m3, Minor (Should): the record cites a file that is not on main.** `C9.2.md:3` says the rulings are in `README.md` "on `main` with C7.6's PR #1249". `origin/main` (3470dc992) has no `screens/C4-packs-on-checkpoint/README.md` yet; it is on #1249's branch, queued. **Fix:** say "on #1249's branch, on main once it merges".

## D1-D20 (a pack-only change: no screen, route or schema)
D1 Requirement fit 9: row C4's Change is met for C9.2: 11/11 on both data sets, a step-for-step match, and R1 holds.
D2 Data integrity 9: the pack writes only through product routes; -4 and -11 hold.
D4 Rule integrity 9: each rule tests the same thing on both data sets; -9's Online precondition is the same as the fixture's.
D16 Testability 8: the steps fail when their rule is removed; the exception is the empty-form-name case (m1).
D18 Provenance 9: the reasons are labelled Sample, Q3 is cited, and the runs are logged.
D19 Closure 9: the pack runs whole on release 2.
D3 and D5-D15: not applicable or unchanged. D7: no AI. D17 and D20: simulated only.

## Journey test (reviewer, the one score for this check; scored on the pack's path)
* J1: the case officer on release 2 changes the principal's family name after the barcode form is validated and IMM 5476 is signed, then undoes it (checkpoint -1 to -8).
* J2: the same on the fixture.
* J3: the spouse's date of birth reaches the principal's entered family-form section (-9).
* J4: a change of representative makes the signed IMM 5476 stale (-10).
* J5: the Paper and Online switches by the officer (the NOTE lines).
* J6: wrong role and errors are not covered by this pack. -5 shows that a stale item blocks Ready to file.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Checkpoint 11/11 and fixture 11/11, both run by me |
| Next step obvious | 1 | -3's reason says "Make a new copy, press Validate again" |
| Plain words | 1 | The -5 words name the form, the person, the fact and the date |
| Feedback and state | ½ | The NOTE says "filed …" whatever the status (m2) |
| Correct data | 1 | -4: the validated copy has the same bytes and the scan checksum is kept; -11: old values are kept |
| Error recovery | 1 | -8: Undo restores the value and clears out of date |
| Accessibility and screen sizes | ½ | No screen changed; not walked in a browser for this PR |
| Speed | ½ | Not timed against the §9 budgets |
| Visual quality | ½ | No screen changed; nothing to judge |
| Trust and sources | 1 | Sample reasons; Q3 and "Unconfirmed: no counsel" in the comment |

**Score 8/10, no 0: pass.** What would raise it, most valuable first:
* fix m2 (feedback);
* a browser walk of the switch on the item's "Change channel" screen (accessibility and visual quality);
* timing the `/prepare` refresh against §9 (speed).

Not tested: a real screen reader, 200 % zoom, and an intended user's unaided walk.

## Not checked
* The graph (P-86): `tools/graph.mjs` rewrites `qa/GRAPH.md`, which I may not edit.
* Main's checkpoint baseline of 6/11 (run 42357755876).
* Whether IMM 5645's accepts record for Online carries an IRCC quote (immigration value; rule 4). The pack asserts nothing about it.

**Verdict: Approve** (61897c92d826acdc8f97aad9b10fc7188f715cc7). Blockers: none. Majors: none. Minors: m1, m2, m3.

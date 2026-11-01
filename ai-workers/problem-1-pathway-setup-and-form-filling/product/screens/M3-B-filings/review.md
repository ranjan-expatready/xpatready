# Review: M3-B filings and fees (C6.12, Visitor visa part), commit e7da8e2f (round 2)

Reviewer agent, 1 Nov 2026. Backend-only slice, no screen. Branch `claude/relaxed-shannon-jp01vj`, commit e7da8e2f (the fixes, on top of a merge of main 69e0f215). Isolated copy :4436, database `xr_studio_m3b`, serving the new code (the 409 check passes there). Never :4400.
Design: `screens/M3-agent-view/concept-draft.md` r5c BR-1, BR-16, BR-18, §"New"; P-171, P-170; `screens/W1-baseline/immigration-facts-2026-10-29.md` row 19; P-221 (`qa/built/C6.12.md`).
Journey test: `journey-test-reviewer-2026-11-01.md`, **9.5/10, passes**.

**Verdict: Approve.** For commit e7da8e2f: no Blocker or Major is open.

Round 1 (02f5ec14) was Block: M1 and M2 Major, m1–m4 Minor. Git history keeps that text. All six are closed below.

## Round-1 findings, re-checked
* **M1 · closed.** `engine/runtime/filings.ts` now puts a capped line on the principal's filing (the first filing if the principal is not applying). The other filings get `exempt: true`, CAD 0, the principal as payer, and "Covered by the family maximum on …'s filing". Live on :4436, family of 3: CAD 100 × 3 visitor lines, CAD 170 biometrics on the principal, 2 × CAD 0 exempt. Lines CAD 470 = group CAD 470. Six people: lines CAD 670 = group CAD 670 (API suite). The property test now asserts lines = total for every fee over 400 households. The agreed BR-18 test (cap on the principal, others exempt) is present.
* **M2 · closed.** The names follow r5c: `filings[{id, combination, applicants[{subject, role, mode}], group, status, number}]`, `groups[{id, kind, filings, splittable}]`, `fees[{filing, payer, line, amount_cents, exempt}]`, `version`. Casing is snake_case throughout. The types live in `contracts/runtime.ts` (`CaseFilings`). The remaining differences (`amount_cents`, extra `label`/`why`/`totals`, no `waitsFor`, a separate `/filings` route) are recorded with reasons in `challenge.md`.
* **m1 · closed.** Ids are `filing-<subjectId>` and `group-family`. A test shows a filing keeps its id when someone else stops travelling.
* **m2 · closed.** The visitor quote is verbatim and marked `quote_kind: "IRCC's words"`. Biometrics is marked "summary of the Lead-checked record". `basis` says biometrics exemptions are not checked yet.
* **m3 · closed.** A made-up rule (maximum CAD 150 from 3 people) makes the threshold decide. Mutants `>=`→`>` and threshold-removed now fail.
* **m4 · closed.** The "not derived yet" text is plain, with no capability code. A test refuses "C6.12" in it.
* **Breaker M2 (the snapshot names another combination) · closed for this route.** `api/src/case-filings.ts` compares the snapshot's `combination.key` with the case's own combination row and returns 409 Problem Details. The API test edits the snapshot, sees 409, restores it and reads 200. The wider gap (releases are not re-hashed or frozen) is correctly left to the Lead in `challenge.md` and is outside this item.

## What holds (re-verified on e7da8e2f)
* **Rule:** CAD 100 each, CAD 500 for 5 or more, quoting "family of 5 or more people applying at the same time and place". Biometrics CAD 85 each, CAD 170 for 2 or more. The cap applies within one submission group only.
* **Money and guessing:** money in whole cents, CAD. Nothing is guessed for other combinations. Built-in names (`constructor`, `__proto__`) are not derived, now that the tables use `Map` instead of plain objects.
* **Access:** officer only through `Runtime.reach`. Client 403 and configuration author 403 (live), unknown case 404.
* **Suites:** engine 37/37 and API 12/12, run here.
* **Mutations:** no-cap (7 tests fail), no-exempt (3), the payer moved to the last filing (1), positional ids (suite crashes), ignore `applies` (5), `splittable` always true (1), constant `version` (1), threshold `>` or removed (1 each), the "nobody applying" reason removed (1). None survive.
* **Static checks:** `tsc` shows no errors in the changed files (one existing error, `tests/check_c18_age_case.ts:59`, unrelated). Graph `--check`: G1 0, G2 0; the only G3 is an unrelated route.
* **P-221:** `CAPABILITIES.md` matches main; the record is `qa/built/C6.12.md`. Against main, the branch changes only this item's 11 files.
* **Speed:** 2 queries per read (`reach` + the combination key), about 15 ms.

## Open findings
None at Blocker or Major. No new Minor.
Noted, not a finding: `payer` on an uncapped line is the filing's own person (for example a child). That matches the r5c field and BR-18 ("on whose filing"); who actually pays money is AG-06's (P-167).

## D1–D20 (1–5)
D1 Requirement fit 4: BR-1, BR-16 and BR-18 for the Visitor visa, with the agreed tests. · D2 Data integrity 5: lines add up to the total (property test), cents, read-only. · D3 Reuse 4: `reach`, `peopleOf`, the pin. · D4 Rule integrity 4: every released role resolves; unknown roles and combinations give a reason. · D5 Stability 5: stable ids, deterministic, `version`. · D6 Freshness 4: date read and checker on every total; not re-read today. · D7 n/a: no AI. · D8–D13 n/a: no screen. · D14 Team look 4: r5c names, the contracts package, deviations recorded. · D15 Speed 5. · D16 Testability 5: pass and fail per rule, property test, every mutant caught. · D17 simulated only. · D18 Provenance 5: URL, words and quote kind, date, checker. · D19 n/a for this slice. · D20 simulated only.

## Not checked
canada.ca (not reachable this session), so the fee values rest on the Lead-checked row 19 of 29 Oct. No screen, so browser, axe and screen sizes do not apply. Coverage (c8) was not run. The Lead check and the founder's walkthrough are not part of this review.

# BK-8 break report: biometrics ages per pathway (PR #1535, commit 5fb174b0f)

Breaker, runtime lane, 11 Nov 2026. Scope: the diff only (`api/src/case-prepare.ts` reads `bio = feeRule(own!.combinationKey, "biometrics")` once; new `biometricsWaits(rule)` in `engine/runtime/prepare.ts:31-34`; the B164 exception for `case-prepare.ts:29` is removed). Method: pure tsx scripts in the scratch area that import the shipped engine, with edited copies of `samples/fee-table.json` (`rulesFrom`, `soundLine`, `wantedItems`, `deriveFilings`, `ageOn`). I did not run the API: every path below can be reached with the engine alone. I changed no shipped file.

Paths are relative to `prototype/studio/`. Reproduce with `node_modules/.bin/tsx <script>.mts`. The scripts are in the scratch area, not committed. Each finding below gives the edit to the table to make.

## Blocker
None.

## Major

**M1. Data alone cannot give two pathways different biometrics ages or different citations at the same time, and a second biometrics line gets fees but no step.** (This is the row's own goal, P-448/P-449.)
- Why: line keys in the table must be unique (`rulesFrom` returns undefined on a duplicate), and the prepare view looks up only the literal key `"biometrics"` (`case-prepare.ts:191`, `filings.ts:149`). So every combination that lists `biometrics` shares one exemption: one set of ages and one IRCC page.
- Did: copied the table, added a line `biometrics_pr` (Biometrics fee, exempt 14/79, page "When to give biometrics: permanent residents"), and added it to `fs.spouse.lines`.
- Expected: a "Give biometrics" step for the principal (40), and a waiting step for the child (no date of birth).
- Actual: `feeRule(fs.spouse,"biometrics")` is `undefined`, so neither person gets a step. `deriveFilings` on the same table still charges `biometrics_pr`: "CAD 85 for Client A." and "Waits for Client C's date of birth: no biometrics under 14 or over 79". The fee panel and the item list disagree.
- The other way out is to add the shared `biometrics` line to `fs.spouse`. The words for a permanent-residence case then read "Waits for the date of birth: no biometrics under 14 or over 79 (IRCC, When to give biometrics: temporary residents)", which is the wrong IRCC page for that pathway.
- The PR's test hides this. `tests/check_bk8_biometrics_ages.ts:38-40` changes the shared line's ages (18/60) and removes biometrics from `vv.single` so the Visitor visa result does not change. It never shows two pathways with different ages side by side, and they cannot exist.

**M2 (pre-existing, not from this diff). A date of birth saved with spaces passes its check but is read as missing.**
- Did: `checkValue(S,"person.date_of_birth"," 1980-05-01 ")` gives `[]`. This is asserted in `tests/check_vv_checklist.ts:171`, and the answer is stored untrimmed (`api/src/runtime.ts` create with `valueJson: b.value`).
- `ageOn(" 2012-11-11", today)` and `ageOn("2012-11-11T00:00", today)` both return `null` (`filings.ts:153-154`, no trim). `case-prepare.ts:165` feeds that to `wantedItems`.
- Actual: a person with an answered, valid date of birth gets "Waits for the date of birth: no biometrics under 14 or over 79 (IRCC, …)", and the fee is "Not counted until it is answered" (`case-filings.ts:37`, same reading).
- Meanwhile the checklist trims the same answer (C6.4 break M1 fixed it there). The prepare view and the fees were not fixed.

**M3 (pre-existing step source, reached through this rule). An unsound biometrics row makes the step disappear for everyone, with no reason given.**
- Did: copied the table and set biometrics `exempt.under_age` to `"14"` (a string). `rulesFrom("vv.single")` is now `undefined`, so `bio` is `undefined`.
- With the release's modes set, `deriveFilings` still gives `derived: true` with 2 filings. The fee words say "No fee lines in the fee table for vv.single yet, so no fee is charged". That is wrong: the lines exist but are unsound.
- `wantedItems` gives nobody a "Give biometrics" step, and no item says it is waiting. A required IRCC step vanishes in silence because of a typo in the table. The same happens with exempt `{}`, `[]`, `"yes"` or a missing `over_age`.

## Minor

**m1. `biometricsWaits` prints "(IRCC, undefined)", "(IRCC, )" or "(IRCC, 42)".**
- `soundLine` checks only that `exempt.source` is truthy (`filings.ts:78`). It does not check that `source.page` is a non-empty string, as it does for the line's own `source` (`filings.ts:66`).
- Repro: set exempt.source to `{}`, `"IRCC"`, `{page:""}` or `{page:42}`. The rules are still "sound", and the new words show the broken citation.
- "IRCC," is also hard-coded in the words, not taken from the source (`prepare.ts:33`).

**m2. Falsy `exempt` values silently remove the age exemption.**
- `exempt: false`, `0` or `""` count as "no exemption" (`l.exempt && …`, `filings.ts:78`, `124`).
- With any of these, a 5-year-old gets "Give biometrics" and is charged. Only `null` or no `exempt` should mean "no exemption".

**m3. Exemption bounds allow ages that make no sense, and the words repeat them as is.**
- `{under_age:0, over_age:0}` is sound: nobody aged 1 or more gives biometrics, and the words say "no biometrics under 0 or over 0".
- `over_age: 1e21` is sound and the words say "over 1e+21". There is no upper limit (for example 130).

**m4. A `roles` limit on the biometrics line changes the fees but not the steps.**
- Did: set the biometrics line to `per_person_by_role` with `roles:["principal"]`. The rules stay sound.
- Actual: the fee is charged to the principal only (`[["p",8500]]`), but `wantedItems` still gives the child (15) "Give biometrics". `wantedItems` ignores `rule.roles`.

**m5 (pre-existing, FQ-7 open). Age is counted on the UTC date.**
- `ageOn` uses `today.toISOString()`. A child whose 14th birthday is 12 Nov is already 14 at 21:00 Toronto time on 11 Nov, so the step appears a day early.
- Born 29 Feb: the child is 13 on 28 Feb and 14 on 1 Mar in a year without 29 Feb.

## What held
- The Visitor visa is unchanged. Ages 13 and 80 get no step; 14 and 79 get a step; no date of birth gets a waiting step. The words are "Waits for the date of birth: no biometrics under 14 or over 79 (IRCC, When to give biometrics: temporary residents)."
- The ages in the words always match the ages that decide the step, because one `bio` feeds both (`case-prepare.ts:191`, `468`). A waiting reason appears only when `ageCheck` waits, which needs `exempt`. So the "no exempt" fallback words cannot be reached from the API, and there is no step that waits on a rule without an exemption.
- A co-filer (sponsor) never gets a biometrics step: they get `undefined`.
- A combination whose rows list no biometrics gives nobody a step, and nothing is borrowed from `vv.single`.
- Bad exemption values are refused: string ages, swapped ages, negative ages, `{}`, `[]`, `"yes"`, a missing `over_age`. The combination is then not derived and nothing crashes.
- Prototype keys (`constructor`, `__proto__`) are refused by `rulesFrom` (`Object.hasOwn`).
- Dates of birth in the future or that do not exist are refused by `checkValue` before `ageOn` sees them. An unparsable date gives `null` (waits), never a crash.
- Stored items follow the wanted ones: a step that is no longer wanted is deactivated (`case-prepare.ts` sync, `gone`).
- `own` is checked before `own!` is used (the 409 when the release describes another combination).
- Tests pass: `check_bk8_biometrics_ages.ts` 12/12, `check_b164_no_engine_keys.ts` 52/52, `check_vv_prepare.ts` 32/32. No `vv.single` or hard-coded 14/79 is left in `api/src` for biometrics.

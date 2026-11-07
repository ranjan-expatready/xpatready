# B133 Fee totals carry their `basis` (C6.12, B5 follow-up): independent review (reviewer, 7 Nov 2026)

**Reviewed commit:** ca0f92c78eff22f414ac2b9833ead593a7fb0840 on `claude/screens-b133-basis` (PR #1274, draft; only the guard has run in CI).
**Row:** BACKLOG B133, "each total has a `basis` field, the page reads it, the stopgap goes, tests both ways". **Read:** B5 `concept.md`
§2 and question 2, B5 `review.md` (Shoulds 3 and 4), P-247, Lead 30 and Lead 31 on #1233 (scope: basis only; B152 and B151 come
after), `tools/m2-hot-files.txt`, the diff (5 files, +42 −16), and every reader of `groups[].totals`.
**Ran** (isolated copy on :4445, configured checkpoint, live AI off, US$0, copy stopped and removed at the end):
`check_r2_fee_table.ts` 84/84 · `runtime/check_vv_filings.ts` 55/55 · `check_vv_prepare_api.ts` 41/41 (both B133 lines PASS) ·
`check_c612_fees_browser.ts` 58/58 · `acceptance/C6.12.test.ts` 24/24 · `C6.12-breadth.test.ts` -24 and -25 PASS, -22 and -23 HELD
(P-380 Q1; never green) · `tsc` web clean, api clean on the changed files (15 errors elsewhere, in unrelated tests) · my own walk
twice, 13/13 both times. The browser check rewrote 11 screenshots under `screens/C6.12/screenshots/`; I restored them with `git checkout --`.

**Verdict (skill scale): Ship.** The field is in place, the page reads only that field, both stopgap branches are gone, and every
pass test has a fail test that would catch the old code. The visible block is unchanged. No Blocker and no Major.

## Is carrying `basis` in the engine's own `FeeTotal` sound? Yes, for today's readers
* `engine/runtime/filings.ts:146` `FeeTotal = SubmissionGroup["totals"][number] & { basis: FeeBasis }`. `familyFee` returns it
  (`:164`), and `deriveFilings` collects `FeeTotal[]` (`:223`). It is additive and compiles against the unchanged contract.
* **Every reader keeps the field. I traced each one:** `case-prepare.ts:226` spreads each group (`{ ...g, filings, reason }`), so
  totals pass through as they are. `:229` reads only `.source`. `split()` (`:465-506`) returns `this.build()`, the same path. The
  split refusal words (`:473-476`) read `rulesFrom(FEE_TABLE)` and never totals. `case-filings.ts:36` spreads `deriveFilings(...)`:
  I checked live that `GET /filings` totals carry `family_maximum`. No submission or record code reads or stores totals (a grep for
  `totals` in `api/src` finds only `case-prepare.ts:229`). No fixture or test compares a total's exact shape. In the web only
  `fees.tsx` reads totals.
* **What it costs:** `deriveFilings` is still declared to return the contract's `CaseFilings`, so the API code sees totals without
  `basis`. If someone later rebuilds a total field by field, no type error will warn them. The API tests (pass, and after a split)
  are the guard, and they are enough for now (Minor 1).
* `basis: rule.basis ?? "family_maximum"` (`:164`): every table rule has a basis (`soundLine` refuses none and `per_position`).
  Only hand-written test rules lack one, and `familyFee` already caps those as a family maximum (`:155`). So the default states
  how the line was priced; it is not a guess.

## Tests both ways (checked by mutation, not only by reading)
* **Engine:** in a scratch copy, removing `basis` from `familyFee` fails 3 of the new lines (81/84). Hard-coding
  `"family_maximum"` fails 2 (82/84): the per-person line and the per-application line.
* **API:** the `/prepare` pass line fails if `case-prepare` drops the field. The split line fails if either new group loses it.
* **Browser, against the old `basisOf`:** "BR-2 fail (B133)" serves a total that still has `family_max_cents > 0` and words
  containing "(per application;". The test asserts the maximum is there, so the old `family_max_cents > 0` branch would name a
  basis and fail it. "BR-2 pass (B133)" serves `per_person_by_role` with the maximum at 0 and the words "(per application; …)", so
  the old words branch would show "Per application" and fail it. The existing P-247 lines still check each of the three words.

## D1–D20 (only what B133 touches; otherwise as B5 round 2)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 5 | P-247 "Every fee line carries a basis": each total carries the table line's own basis; the row's four Done-when parts are met |
| D2 Data integrity | 5 | Read only; no write, migration or route change |
| D3 Reuse | 5 | The basis now comes from the table through the engine; B5 Should 4 (copying the engine's English) is closed for the basis |
| D4 Rule integrity | 5 | Amounts are unchanged; R2 and the property suites pass (400 + 300 households) |
| D5 Stability | 5 | A reload shows the same bases (walk); after a split both groups keep the basis (API test) |
| D6 Freshness | 4 | Unchanged: each source once with its read or page date |
| D7 AI trust | n/a | No AI |
| D8–D9, D11–D12, D14 | 4 | Unchanged from B5; no visible change (`walk-1440.png`) |
| D10 Language | 3 | Unchanged: "(P-171)" and "(FQ-7)" are still in the case's basis sentence (Note 3) |
| D13 Accessibility | 4 | axe clean on the fees block; keyboard reaches it; no sideways scroll at 1024 and 512 px; the waiting row wraps at 512 px |
| D15 Speed | 4 | The fees block shows 811 ms after the click (page load included); no extra request |
| D16 Testability | 5 | Engine, API and browser pass and fail; mutations confirmed |
| D17, D20 | simulated only | No intended user walked it |
| D18 Provenance | 5 | The basis is now the fee table's own word, not a guess from the words or the maximum |
| D19 Closure | 4 | As B5: the receipt box (C8.2) is not reachable on the checkpoint |

## BIC scorecard (EXPERIENCE §6; a read-only fee block, no visible change)
BIC-14 Met (the basis and why on each totals line explain the number). BIC-18 Met (no basis is named for an unknown or missing
field; only the why shows). BIC-19 Met (one heading, no button: `walk-1440.png`, `walk-1024.png`). BIC-20 Met (keyboard, axe,
1024 px and 512 px). BIC-11, BIC-13 and BIC-16 are as B5 (no button, no input, recording is C8.2's). BIC-01 to BIC-10, BIC-12,
BIC-15 and BIC-17 are N/A here (no question, document, case structure, check view, channel or review on this block).

## Issues (ranked; none Must)
1. **Should (Minor), STANDARDS §6 [M] "Contract first": `basis` is not in `contracts/runtime.ts:254`.** This is deliberate
   (M2-hot), and concept question 2 said "one field in `engine/runtime/filings.ts` and the contract, once `studio/contracts/` is
   free". Nothing records that second half: no row and no "Minors left" line. The web type (`fees.tsx:13`, `basis?: string`) is
   looser than `FeeBasis` too. **Fix:** in the PR body under "Minors left", name the follow-up: add `basis: FeeBasis` to
   `SubmissionGroup.totals` when the tech lead frees the file, then drop `FeeTotal` and narrow the web type.
2. **Should (Minor): the PR body still says "Checks and results: To come"**, and the PR is a draft (CI has run the guard only).
   **Fix:** fill it in and mark it ready, so the full check and gate B run before the label.
3. **Note (not B133's row): decision codes on screen.** B5 review Should 3 ("(P-171)", "(FQ-7)" in `filings.ts:269`) was meant
   to go with B133. Lead 31 scoped B133 to the basis only, so this is not a finding against this PR. It still has no row: the
   tech lead's call.

## Journey test (reviewer; the screen does not change visibly, so this is a short note)
**Journeys:** (J1) the case officer goes Cases › click a Visitor visa case › Submission to IRCC › Fees and reads each fee's basis.
(J2) the same at 1024 px and 512 px. (J3) reload. (J4) the wrong role: the author (`user-A`) and the client (`user-P`) on `/prepare`.
(J5) the step across: after a split, each submission's totals keep their basis (API). (J6) break-it: a total with an unknown
basis or none, and words that contradict the field (the browser check's served states).
**Held:** J1 shows "Per person, with a family maximum of CAD 500 from 5 people applying together" and "… CAD 170 from 2 …",
the same as `/prepare`'s `family_maximum` and the fee table. J2 has no sideways scroll, and the waiting row wraps
(`walk-512.png`). J3 shows the same bases. J4 returns 403 for both. J5 PASS. J6: nothing is guessed, and the field wins over the
words. No page errors. Both runs 13/13.
**Score:** task 1 · next step ½ (as B5: the waiting row does not link to its question, Not built) · plain words ½ (Note 3) ·
feedback 1 · correct data 1 · recovery 1 · accessibility and sizes 1 · speed 1 · visual 1 · trust and sources 1 =
**9 / 10, Pass** (no 0). To raise it: Note 3's row (plain words), then B151.
Evidence (scratch, not committed): the reviewer walk script and its screenshots `walk-1440.png`, `walk-1024.png` and `walk-512.png`.

## Could not check
A real screen reader. An intended user's unaided walk (D17, D20 stay with the founder). The PR's full CI and gate B (draft;
guard only). The browser fail lines were checked against the old `basisOf` by reasoning: I did not rebuild the web in a scratch
copy.

**Verdict: Approve** (commit ca0f92c78eff22f414ac2b9833ead593a7fb0840): no open Blocker or Major. Minors 1 and 2 go in the PR body.

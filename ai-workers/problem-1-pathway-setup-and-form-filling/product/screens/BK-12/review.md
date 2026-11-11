# BK-12 review: Sample case as a setting (runtime, Bake plan row 26)

**Commit reviewed:** b465cf485880a3b3f2a9a3933d6c43c5ac1496d5 (branch claude/cool-brahmagupta-kg7eu9, PR #1533, diff `origin/main...b465cf485`). The later head 82283089b only removes the one C12 line from `ASSUMPTIONS.md` (1 file, 1 deletion, no code; the row is now a PR comment), so this verdict also holds for 82283089b.
**Reviewer:** fresh session (screen-review + journey-test, reviewer role), 11 Nov 2026. Isolated copy `rev_bk12` on :4436 (runtime ports); :4400 never used.
**Scope:** a runtime/API row with no new screen. The concept is the row's "Done when" plus P-448, P-449, P-452 and Bake plan rows 16-27. BIC-01–20 do not apply because no case-side screen changed.

## Done when: met, with evidence
| Condition | Result |
|---|---|
| The sample case is read from data | Met. `samples/sample-cases.json` by combination key. `sample-case.ts` no longer contains any key, reference or form number. |
| Study permit uses its own sample case and no engine, API or screen code names it | Met. `check_bk12_sample_case.ts` passed 31/31 on my copy. `POST /api/demo/sample-case` for `sp.outside` opened SAMPLE-SP-STUDENT-1 on its own release 1 with principal "Student A (Sample)", all 26 file answers taken and 0 refused, and 5 copies including IMM 1294. `web/src` is untouched. |
| Visitor visa sample case loads as today | Met. `check_c10_1_configured.ts` passed 48/48 on my copy. Rows 11/12 read "Case SAMPLE-VV-FAMILY-1 on release 1: 4 people … 41 answers from the Sample record and 4 made up" and "IMM 5257 generated for 4 of 4". The idempotency keys still come out as `sample-vv-family-1`, `-spouse_or_partner`, `-child-1` and `-child-2`. The made-up facts go in the same order, with the family name first for child-2. |
| B164 ALLOW does not grow | Met: it shrinks by one entry (`api/src/sample-case.ts`). `check_b164` passed 52/52. `sample-cases.ts` and `demo-sample-case.ts` are not allow-listed, so the guard reads them. |
| Suites green | Met on my runs: qa285 13/13, bk10_form_rules_data 20/20, check_engine 44/44. `tsc` reports no errors in changed files. `graph.mjs --check` exit 0. |
| Sample labels (rule 4) | Met. Every display name carries "(Sample)". The answers file is labelled Sample, Unconfirmed: expert, no counsel. No value is presented as an IRCC value. |
| Not touched: `prisma/schema.prisma` and `api/src/case-prepare.ts` | Met (not in the diff). |

**The builder's interpretation ("release data" = per-combination data files) is accepted.** It matches BK-10's `form-setup.json` and P-449's "data and release changes only, no change to engine or screen code". Carrying the setting into the release snapshot would change the snapshot contract. That is correctly raised as a PR question and not done silently.

## Code checks (item 5)
* **Correctness:** checkpoint step 120 now picks the story's combination via `keyOf` and the release-1 labels. This is equivalent to the old `visitor && vvId`. Step 150 reads `applicationForm` from `form-setup.json`, and its words are unchanged for the Visitor visa.
* **Server authorisation:** I exercised each refusal.
  * No actor: 401.
  * Client (user-P) or officer (user-O): 403 (author duty).
  * Not a UUID, or an empty body: 400.
  * Unknown id: 404, filtered to this workspace.
  * A combination with no entry (LMIA): 409 in words, no case created.
  * The demo workspace is enforced (409, from the code).
* **Unreleased combination** (after "Load the six"): 409, "The Sample case was not opened: … has no released version yet", with 0 cases created.
* **Idempotency:** a second open returns the same case id in 1.5 s, with still 1 case and 21 copies on the family case.
* **Duplicates under race:** two concurrent POSTs for `sp.outside` gave 1 case, 1 principal and one GENERATED copy per form. Underneath, the 26 answers were each DECLARED once and VERIFIED once (confirm_section), exactly the file's values.
* **Does a removed rule fail its test?** I made three mutations in a scratch worktree:
  * the key `"sp.outside"` hard-coded with double quotes,
  * the same key with single quotes,
  * `"IMM 5257"` put back.

  B164 fails on each (51/52). B164 runs in CI, so this guard holds even though the BK-12 test itself does not (m1). Dropping the data lookup would fail BK-12 checks (5).
* **Validation:** the reader refuses all nine bad shapes the test names, each naming the entry (pass and fail per rule).

## Blockers
None.

## Majors
None.

## Minors (Should; none blocks)
1. **m1. The BK-12 test does not run in CI.**
   * Cause: `run-suites.sh` discovers only `tests/check_*` plus `tests/runtime/check_case_engine.ts` and the R1 trio (`run-suites.sh:193`, `:357`). `run-suites.sh --list` does not show `check_bk12_sample_case.ts`.
   * Effect: the row's proof is a hand run. In CI only B164 (code naming) and `check_c10_1_configured.ts` (Visitor visa unchanged) guard it, and nothing guards "the Study permit opens its own case".
   * Context: this is a lane-wide pattern that already existed (other `tests/runtime/check_*` suites are run on Mac copies).
   * Fix: move the test to `tests/check_bk12_sample_case.ts`, or register it in run-suites.sh in this PR or a follow-up row.
2. **m2. A missing answers file is only caught after the case is opened.**
   * Cause: `sampleCasesFrom` checks only that `answers` is a non-empty string (`sample-cases.ts:27`). A misspelled file name throws ENOENT at `sample-case.ts:74`. That point is after `createCase` and `addPerson` (lines 64, 69) and outside any try.
   * Effect: a 500 with a half-opened case and no answers. Re-running after the fix recovers, because the open is idempotent.
   * The same applies to `validated`. Also, its path is relative to the studio folder while `answers` is relative to `samples/`.
   * Fix: check in the reader that both files exist and parse, add a fail case, and use one path convention.
3. **m3. Counters are misleading on a race or a re-open (the data underneath is correct).**
   * Race: each of the two concurrent 201 replies listed 15–17 `answerRefused` lines ("Someone changed this answer after you opened it…").
   * Re-open of the family case: `notTaken: 89`, because answers already held are counted as "not taken".
   * Fix: on a re-open (an idempotent replay of createCase), say "already open, nothing changed", or count held answers apart from refused ones.
4. **m4. The reference is not checked as a key.**
   * Cause: the createCase and addPerson keys use the lower-cased reference unsanitised (`sample-case.ts:62-69`); only the copy key is sanitised.
   * Effect: two references that differ only in letter case would share keys, and the reader's duplicate check is case-sensitive.
   * Fix: refuse a duplicate after lower-casing, and limit references to `[A-Z0-9-]`.

Observations (not findings):
* `clientActor: "user-P"` is fixed. That is why the Study permit case says "Client A answers on their phone" beside Student A (Sample). It is a simulated persona, not a pathway name.
* The test's static check (3) matches double-quoted keys only, but B164 covers single quotes.
* There is no Demo menu button: the Study permit case opens by API only. This is stated as out of scope ("Not in it"), and P-26 rules out treating it as a finding.

## D1–D20 (runtime row; one line each)
* **D1 fit:** 1, all Done-when conditions met.
* **D2 integrity:** 1, the race gives one case and one copy per form.
* **D3 reuse:** 1, one data file reused through the case officer's own steps.
* **D4 rules:** 1, the reader's 9 refusals.
* **D5 stability:** ½ (m2 path).
* **D6 governance:** ½. The Sample labels are dated 11 Nov; the C12 assumption is only a PR comment until the tech lead takes it.
* **D7 AI:** N/A (no AI, US$0).
* **D8–D14:** N/A or unchanged. There is no new screen; the builder's 1440 px shots show the case on the existing Cases screens in the team look.
* **D15 speed:** 1. Study permit opens in 3.7 s, re-opens in 1.5 s; the family re-open takes 14 s.
* **D16 testability:** ½ (m1).
* **D17, D20:** simulated only.
* **D18 provenance:** 1, everything labelled Sample.
* **D19 closure:** 1. The case shows on Cases and opens as the officer (screenshots 01, 02).

## Journey score
**8.5/10, pass.** Details are in `journey-test-reviewer-2026-11-11.md`.

## Could not check
* A keyboard or 200% walk, and axe: there is no new UI.
* The real CI run on the ready head.
* The Mac-only validated files: on my copy, 4 were kept on the Mac.
* After my last run, the environment restarted and stopped the shared Postgres. The copy's database `xr_studio_rev_bk12` may be left behind; `tools/prune-test-dbs.sh` removes it.

**Verdict: Approve** (no open Blocker or Major). Minors m1–m4 are recommended fixes; none blocks.

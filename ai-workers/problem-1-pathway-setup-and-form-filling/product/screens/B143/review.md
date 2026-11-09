# Review: B143 · C7.10, readiness figure per filing (PR #1389, commit c504e200271afb6d2d73f25fe62bc194a92bf51d)

Independent reviewer (did not build it), 9 Nov 2026. Skill screen-review plus journey-test (reviewer role). Diff: `git diff origin/main...c504e2002`. My copy `rev143a` ran on :4436 only, loaded with the configured checkpoint, and was stopped and dropped after. Synthetic data, no model call, US$0. Paths: S = `prototype/studio/`.

**Verdict: Ship after fixes (Block for now): 0 Blockers, 2 Majors, 5 Minors.**

The core is right. Score 100 ⇔ C7.6 ready holds by construction, and the state rules match the concept. C7.6 is untouched, and the UI is clean at every width. One counting fault and a missing pack test for the two Major fixes stand in the way.

## What I ran (exact commit)
* **Engine checks.** `tests/check_c710_figure.ts` 34/34; `check_c76_readiness.ts` 91/91.
* **Packs on a fresh checkpoint copy.** C7.10 13/13 (106 s), C7.10-screen 8/8, C7.6 27/27.
* **C7.6 unchanged.** `git diff --stat` on `engine/runtime/readiness.ts`, `check_c76_readiness.ts`, `C7.6*.test.ts` is empty. The prepare view strips `figure` from `readiness[]` (`api/src/case-prepare.ts:604`), and the live entry keys are unchanged (probe J3).
* **Mutations** (scratch copy of `engine/`). Each of these fails at least one check, so the rule's test fails when the rule is removed:
  * the CRITICAL-finding state;
  * the submitted filter;
  * floor → round;
  * the closed-findings loop;
  * the passed reset;
  * the facts codes;
  * resolved counted as passed;
  * Not needed counted;
  * the catch-all;
  * the "waits" label.

  Survivor: score ties going to the last filing (`readiness-figure.ts:96` `<` → `<=`). The tie test checks `state_filing` only.
* **P-319.** No combination key, form number or program in `engine/runtime/readiness-figure.ts` (only the comment that says so).
* **Graph** (`graph.mjs --check`). G1 0 · G2 0 · G4 0 · G5 0. G3's 20 are older (none on `/prepare`). C7.10 cites P-406 and a test.
* **Pack quality.** No `.catch(() => undefined)` after a wait in either pack. Every pack check has a pass and a fail. Gate B: I did not run it; the builder reports exit 0.

## Concept fit (BR by BR)
| BR | Built | Evidence |
|---|---|---|
| BR-1 state | Yes | `readiness-figure.ts:82`. Engine M1 checks and the property (state ⇔ block · CRITICAL warning · CRITICAL finding) |
| BR-2 items | Yes | Not needed and not-required lines are left out. The catch-all is mutation-tested. m7 label |
| BR-3 done / passed | Yes, except resolved history | Waived → Done and Passed, acknowledged MINOR → Done and Passed (probe J3). **Major 1** |
| BR-4 rounded down | Yes | 198/199 → 99; property checks floor |
| BR-5 case lowest, skipping submitted | Yes | `lowestOf` filter. Probe J4: recorded group → `case_figure` null; a later fact change drops the submitted filing to 66 and the case figure stays null. **Major 2** (no pack test) |
| BR-6 never gates | Yes | C7.10-10 and s5: 409 under 100 |
| BR-7 rule shown | Yes | Disclosure lists the items and the rule (s3). Copy Minors below |
| BR-8 C7.6 unchanged | Yes | Above |
| §4 layout | Yes | Pill outside `<h1>`, amber Not ready, submitted filing shows no figure, pill hidden while loading or on error (`readiness-figure.tsx:58`) |

## D1–D20 (1–5)
D1 4 (all BRs built; resolved history is off BR-30's "each check") · D2 3 (figure inflated by history, Major 1) · D3 5 (one engine function, types shared in web only as for C7.6) · D4 5 (catch-all: no open line without an item) · D5 5 (reload keeps state; read-only) · D6 N/A (stores nothing) · D7 N/A (no AI; AI findings are labelled "flagged by the AI review") · D8 4 (pill names the filing) · D9 4 (figure above the lines that move it) · D10 3 (rule paragraph long, carries ids; title-only tooltips) · D11 5 (updates after a pass or waiver) · D12 5 (screens below) · D13 4 (0 axe violations at 1440/1024/400/200 %; aria-label ineffective) · D14 5 (Pill and team tokens) · D15 5 (one shared `/prepare` fetch; 1.1–1.6 s to the pill) · D16 3 (engine rules well tested; API wiring of M2 and M3 untested, Major 2) · D17 simulated only · D18 4 (items and rule shown) · D19 4 (reaches Ready to file and hands to C8.2's Record, s7) · D20 simulated only.

## BIC scorecard (EXPERIENCE §6)
Screens: builder `screenshots/01`–`06` (1440); mine `scratchpad/shots/filing-1024.png`, `filing-open-1440.png`, `pill-400.png`, `submitted-1440.png`.

| Check | Score | Evidence |
|---|---|---|
| BIC-01–10, 13, 15, 16, 17 | N/A | No input, facts, AI values, people, signing or review step added |
| BIC-11 | Met | No new button; Ready to file stays the panel's only primary |
| BIC-12 | Met | C7.6's lines stay the check below the figure |
| BIC-14 | Partly (Should) | State pill and "%" carry `title` only; native titles do not open on keyboard focus (tabIndex −1). The same words are in the keyboard-reachable disclosure, so nothing needed to act is hidden. Existing house `Pill` pattern |
| BIC-18 | Met | Pill hidden while loading or on error; panel skeleton kept; submitted filing says why there is no figure |
| BIC-19 | Partly (Should) | One line per filing and detail folded, but "Not done" circles are red (`readiness-figure.tsx:39`, 22 on one case) for a normal state |
| BIC-20 | Met (Minor) | Keyboard `<details>` with a 2 px focus ring; no sideways scroll at 1024 px or 200 %; 0 axe violations. The `aria-label` on a role-less span (`:32`) is ignored (axe `aria-prohibited-attr`, needs review) |

## Issues
**Major (Must)**
1. **Resolved rules findings are counted once per edit, not once per check, so the figure rises with nothing done.**
   * Cause: each changed value of a rules finding is a new row (`api/src/findings.ts:68-83`). Every `resolved` row becomes its own done item (`api/src/readiness-inputs.ts:91`, `engine/runtime/readiness-figure.ts:75`).
   * Probe J5: one passport-vs-visit check, still open, was edited three times; the figure went 0 → 9 → 16 → 25.
   * End state: 3 "resolved" items for one check. BR-30 counts "each pack library check" once, satisfied when RESOLVED or WAIVED.
   * *Fix:* read `ruleKey` and `subjectId` too. For `source = "rules"`, keep at most one closed row per (filing, rule, subject). Drop it when a non-resolved row of the same rule and subject exists, because the open one is the item. Add engine pass and fail checks, plus one pack check (edit the fact twice, then fix it: one item, Done).
2. **M2 and M3 are wired in the API with no test that fails when the wiring is removed.**
   * Removing `submitted: recordedFiling.has(…)` (`case-prepare.ts:609`) or the `closedFindings` read (`readiness-inputs.ts:91`) leaves all suites green. The engine checks feed `submitted` and `closed` by hand, and neither pack waives a finding or records a submission (grep: no `submitted`, `waive` or `findings` in either pack).
   * This breaks STANDARDS §7 [M] ("a rule's test fails when the rule is removed") and the challenge's back-end plan rows.
   * *Fix:* add to `acceptance/C7.10.test.ts`:
     * (a) add a CRITICAL finding by hand: Not ready, with an item not done; the representative waives it in Review findings: same `countable`, `passed` +1, the item Done (M1 and M3);
     * (b) record a group: `figures[].submitted` true and `case_figure` null; then change a fact: `case_figure` still null (M2).

   My probe `probe-api.mts` does exactly this and passes on this commit.

**Minor (Should)**
3. **Red "Not done" markers** (BIC-19, `readiness-figure.tsx:39`). Use the muted tone; the words already carry the state.
4. **`aria-label` on a span with no role** (`:32`) is not announced. Drop it, or add visually hidden "Readiness" text.
5. **Shown rule words end "(AG-7-27, BR-30)"** (`readiness-figure.ts:41`): requirement ids on the staff path (EXPERIENCE §2 [M]). The first sentence is about 45 words. Keep the ids in the comment and split the sentence.
6. **Tie test** checks `state_filing` only. Add `score_filing` (mutation `<` → `<=` survives).
7. **State pill and figure tooltips are title-only** (BIC-14 Partly). Acceptable as the house Pill pattern since the disclosure holds the words; note it for the Pill follow-up.

## Not checked
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* The header pill naming two different filings: no data reached it; I read the code at `readiness-figure.tsx:66-69`.
* Gate B myself.
* Unrelated C6.12 screenshot changes appeared in this clone's working tree during my run. They are not mine and not in the commit, and I left them untouched.

Journey score (reviewer, the one score for this check): **8.5 / 10, pass, no 0.** See `journey-test-reviewer-2026-11-09.md`.

**Verdict: Block** on c504e200271afb6d2d73f25fe62bc194a92bf51d. Fix:
1. Count a resolved rules check once per rule and person, never once per edit (Major 1).
2. Add the pack checks for the waived CRITICAL finding and the submitted filing, so removing the API wiring fails (Major 2).

The Minors are fixed or listed in the PR.

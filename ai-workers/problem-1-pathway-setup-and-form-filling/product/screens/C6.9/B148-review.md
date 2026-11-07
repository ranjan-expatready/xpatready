# B148 review: C6.9 says P-236's words (PR #1250)

Reviewer: Opus, fresh context, did not build it. Commit reviewed: `9451799cac1d80795311f3317dc58feacd2c372a` on `claude/gallant-lamport-cj0epp`, diff against `origin/main` 1e1ca443e. Row B148 (lead branch `lead/2026-11-07-lead30`, BACKLOG:58; P-236, P-316 (1), P-408). Isolated copy `rev_b148` on :4445 (never :4400), stopped after. Live AI off, US$0.

**Screen-review verdict: Ship.** No Blocker and no Major. Four Minors, none blocking. Two Done-when conditions sit outside the code (see "Open before the label").

## What I ran (my runs, this commit)
* `tests/check_b148_words.ts` 13/13. **Fail-first confirmed:** on an `origin/main` worktree with only the test and `contracts/case-check-words.ts` copied in, it gives 5/13. It catches the old words in `answer-key-editors.tsx:37`, the page, the A4 dialog, the API lines and the engine summary.
* `acceptance/C6.9.test.ts` 21/21 (exit 0, fixture after `setup_visitor_visa` + `setup_vv_m3`). Step ids compared with main: all 20 kept, `C6.9-8b` added, none dropped (P-330 (7)). 8b read the line "Case officer ran the case check on case … (run again): Qualifies".
* `check_c69_page_browser.cjs` 42/42. The builder's 43rd step is the setup step, which runs only on a fresh database. Includes axe and 1024 px for each state, 200 % zoom, and the client refusal.
* `check_b124_unconfirmed_browser.cjs` 19/19 on a fresh copy. On a reused database, its setup step refuses ("Reset the demo first"), as designed.
* `check_b106_gates_browser.cjs` 69/69 on a fresh copy. The builder's 30 s wait for "Submitted for review" did not recur in my run.
* `tsc --noEmit` on web and api: no error in any touched file. The graph (P-86): C6.9 is named by 7 tests, now including `check_b148_words.ts`, and `case-check-words.ts` is wired into `api/src/assessments.ts`. No new orphan.
* Note: my browser runs overwrote the committed screenshots. I restored them with `git checkout`, so the tree is clean.

## Builder's choices, judged
1. **Codes kept, words in `contracts/case-check-words.ts`: agreed.** P-236 renames words, not AG-03's §7 codes. Stored runs, overrides (`fromOutcome`) and answer keys stay readable, with no migration. `outcomeWord` uses `hasOwnProperty`, so `"constructor"` is not mapped (tested). Reading "the API's outcome words" as the audit/history lines is right: the API returns codes only, and the lines were the only words it produced (`assessments.ts:87,151,167`, plus the 404 "No such case check." and the traveller refusal at :54).
2. **"Eligibility rules (staff check)" kept, the AI launch's "not eligible" the one named exception, route kept: agreed.** The A4 editor names AG-03's gates, not the page. `ai-launch.tsx:85` counts sources AI does not draft, a different meaning. A URL is not page words. The words still left in web/src are comments or the A4 rules' name, e.g. `answer-key-editors.tsx:278`, `cases.tsx:172`, and "No eligibility rules yet" (`eligibility.tsx:165`, the A4 rules).
3. **ELIGIBLE_BELOW_CUTOFF reworded, still selectable: acceptable for this row.** This was already true on main. Removing it changes C5.7's behaviour, so it is not a wording change. Raising it as a question for the tech lead was the right call (see m3).
4. **Tests rewritten, assertion by assertion against main:** every assertion still checks the same code (`res.outcome === …`) or the same DOM. The client-refusal check in `check_c69_page_browser.cjs:138` is stronger (`eligible|qualif|can't tell`). `check_b106…:119` now selects the radio by its new label, so it fails if the label reverts. Three text checks are slightly weaker (m1). No assertion was removed.
5. **J7 row 4.2** (`acceptance/journeys/J7…md:55`) changes its expected result, not only its words: from "Not eligible: has a … conviction" to "Can't tell yet — the representative reviews this". That fixes a stale row: P-230 (1) already made that gate `needs_review`, and C6.9-7 asserts `POSSIBLY_ELIGIBLE`. It belongs in the same qa agreement as the pack wording.

## Issues
**Blockers:** none. **Majors:** none.

**Minors** (Should; none blocks):
* **m1. Three text checks match more than before.** The people-list pill now shows the full word, so `/Qualifies/` (`check_b124_unconfirmed_browser.cjs:92`) and `/Can't tell yet/` (`check_c69_page_browser.cjs:85,132`) also match the pill. Before, `/Likely eligible/` and `/Possibly eligible/` could match only the outcome line, because the pills read "Likely" and "Possibly". If the outcome line broke, these steps would still pass. Fix: anchor each check to the outcome pill text. Use `/Can't tell yet — /` for the two C6.9 checks. For the B124 check, read the outcome line itself, e.g. `/(^|\n)Qualifies(\n|$)/`, or read it from the result panel.
* **m2. The grep test does not catch a bare "Eligibility" used as the page name.** `tests/check_b148_words.ts:15` lists "Eligibility (staff only)" and "Open eligibility", but not "Eligibility ·" in the title or "› Eligibility" in the trail. Those are covered only by the source-shape checks at :43 and by the browser trail check. Fix: add `/\bEligibility\s*·/` and `/›\s*Eligibility\b/`, or say in the test that :43 and `check_c69_page_browser` own those two spots.
* **m3. P-236 drops the fourth outcome, but two places still have it.** The answer-key editor still offers "Below the cut-off (not used: P-236)" (`contracts/case-check-words.ts:18`, `answer-key-editors.tsx:39,361`). The page's fallback in `eligibility.tsx:56` shows the raw code (`ELIGIBLE_BELOW_CUTOFF`) for that outcome. Both were already on main. Fix: the forms follow-up row the builder proposes (tech lead's call). That row should also let the page fall back to `outcomeWord(code)`.
* **m4. The toasts read as if the whole case was checked.** "Case checked" / "Case checked again" (`eligibility.tsx:181,251`) can read that way. "Case check run" / "Case check run again" matches P-236's name. Wording only; take it if qa agrees.

## Open before the label (Done-when items outside the code)
* **qa's agreement on the pack wording** (BACKLOG B148: "with qa's agreement"). The PR comment asks, but at this commit there is no qa reply. The agreement should also cover J7 row 4.2 (choice 5).
* **Gate B: the C6.9 pack on the checkpoint, exit 0.** The builder says it is still running. I ran the pack on the fixture only (21/21).
* "qa gate A keeps C6.9 Works" is qa's to confirm after the merge.

## D1–D20 (B148's change only; other dimensions as in `review.md`)
D1 Requirement fit 9: every Done-when wording item is met (screen, A4 dialog, API lines, B124's line "Qualifies, on 1 answer not yet confirmed"). · D2 Data integrity 10: no schema change, codes unchanged. · D3 Reuse 10: one words file read by web, API and engine. · D4 Rule integrity 10: engine logic untouched, only the strings in its summary changed. · D5 Stability 9: double runs not retested (code unchanged). · D6 Governance 9: history lines in words, with who and when. · D7 AI trust: n/a (no AI). · D8 Orientation 9: trail and h1 read "Case check from confirmed facts". · D9 Flow 9: Open case check, then Run case check. · D10 Language 9: P-236's words everywhere (m4 aside). · D11 Feedback 9: toast, focus and state unchanged. · D12 Visual 9: the longer title fits at 1024 (`screens/C6.9/screenshots/02-cant-tell-yet-1024.png`, `B124/walk/3-some-confirmed-1024.png`). · D13 Accessibility 9: axe clean on every state, keyboard path green, no sideways scroll at 400, 1024 and 1440 px or at 200 %. · D14 Team look 9: the team's three words. · D15 Speed 9: page open about 0.5 s. · D16 Testability 8: fail-first grep test plus 8b; m1 and m2 aside. · D17 / D20: simulated only. · D18 Provenance 9: SI-1 chip and "Unconfirmed: no counsel" kept. · D19 Closure 9: case page, case check, history, A4 dialog and answer key say the same words.

## Journey score
**9/10, pass** (`screens/C6.9/journey-test-reviewer-2026-11-07-B148.md`).

## Could not check
A real screen reader. An intended user's unaided walk (D17/D20 stay with the founder). The checkpoint (gate B) run. CI on GitHub (GraphQL is not reachable from here, and I did not read the REST check runs).

**Verdict: Approve**. No open Blocker or Major at `9451799ca`. Fix list (Minors, optional for this PR): m1, m2, m4; m3 as a follow-up row. Add the label only once qa agrees to the pack wording and gate B exits 0, as the row's Done-when requires.

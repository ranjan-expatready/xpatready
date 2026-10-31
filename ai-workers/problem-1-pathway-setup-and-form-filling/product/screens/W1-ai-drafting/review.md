# Review 2: P-179 cost warning + override on the QA-90 shared ledger, after the FIX (reviewer, 30 Oct)

Independent CHECK (P-68), backend path. Code at `c950b098` (branch HEAD `3b1e4c39`, notes only after it). The first CHECK is `review-p179-1.md` (6/10, B1) and `break-report-p179-1.md`. US$0 throughout: no live switch, no priced button, scratch `P2_LEDGER_DIR` only. The real `.tools/p2-ledger/spend.jsonl` had the same checksum before and after. Isolated copy `fx7_rev2` on :4458 with the queue held, stopped at the end.

## Verdict: Ship after fixes. Two Majors, no Blocker, no Must on money
Every finding from the first CHECK is fixed in code, and each has a pass and a fail check. Money stays bounded. Two new gaps break P-179's promise ("warn, then Continue or Cancel") on paths a person will take:
* **N1:** the Forms tab's own "Draft with AI" start has no warning at all.
* **N2:** a person's own unused Continue blocks their retry, and the words say the founder must raise the cap.

**Journey score: 8 / 10. Pass** (8 or more, no criterion at 0), held back by N1 and N2.

## What I ran (US$0)
* `check_cost_check.ts` 61/61 · `check_cost_override.ts` 50/50 (:4458) · `check_p2_launch.ts` 60/60 (temp copy; §12 is B1 end to end) · `check_cost_warning_browser.cjs` 14/14, run twice, both green.
  * The browser check overwrote the builder's `screenshots/p179/*`; I put them back with git checkout.
* Graph (`graph.mjs`, no `--write`): G1 0 · G2 0 · G3 2 · G4 0 · G5 0 · G6 0. The two G3 routes are not P-179 (`POST /combinations/:id/attachments`, `GET /attachments/:id/file`).
* My walk (headless Chromium, Playwright, :4458) and ledger attacks on scratch ledgers. Screenshots are in my session scratchpad (`shots/j1-*`, `j2-*`, `j4-*`).

## First CHECK findings: each verified in code and in a check
| Finding | Fix (code) | Pass / fail check |
|---|---|---|
| B1 stub pass refused past a money cap | `p2/ledger.ts:147` stub → US$0; `:157` a US$0 reservation passes no limit | `check_p2_launch` §12 (real launcher, ledger past the experiment and Wave caps) + `check_cost_check` B1 ×4; attack A4: stub admitted at US$130, paid and unmarked refused |
| M1 malformed amounts switch the caps off | `ledger.ts:82-86` `counted`, `:220` settle | `check_cost_check` M1 ×3 |
| M2 Continue starts past US$132 | `cost-gate.ts:62` | `check_cost_override` "break M2" |
| m1/m2 click used up with no run; double click | `checkOverride` before, `spendOverride` last in the transaction (`ai.ts:289`, `finder.ts:250`); `launchSource` key check before the re-plan (`ai.ts:318`) | `check_cost_override` m1 ×3, m2 ×3 |
| m3 unspent Continues not held | `ledger.ts:96-111` | `check_cost_check` m3 ×4 (but see N2) |
| m4/m5 two totals, spend said 3–4 times | `sources.ts ledger()` uses `SpendLedger`; one label | browser check m4/m5; my walk: "Spent so far" said once |
| m5/m6/m7 (break) strict body, 413/503, `by` | `contracts/cost-check.ts:21-33`, `cost-gate.ts:66`, `ledger.ts:131` | `check_cost_override` m5 ×3, m6 ×3, m7 |
| review m3 focus lost after Cancel | `cost-warning.tsx:57-62` | browser check m3 ×2 |
| review m6 audit words | `ai.ts:340-342`, `finder.ts:257` | `check_cost_override` m6; my walk: both audit lines name the limit and the override |
| review m7 finder Cancel shown as an error | `finder.tsx:66-67` info toast | by reading (the finder dialog needs the live switch) |
| review m8 seed without lock; m9 stale-lock race | `seed-shared-ledger.ts:24-33`; `ledger.ts:193-217` | `check_cost_check` m8, m9 ×3 |
| review m2 weakened slice3 test | `check_s5_slice3_browser.cjs:96-103` branches on the server's `live.on` | — |

## New findings
**Major**
* **N1. The Forms tab's "Draft with AI" start has no cost warning and no Continue.**
  * Where: `web/src/pages/sources.tsx:120` `DraftDialog` posts `/attachments/:id/draft` without `useCostGate`.
  * Plan §2 "Wiring" lists the field-map draft among the forms lane's own starts.
  * Walk (screenshot `j4-draft-with-ai-over-cap`): spend at US$119.50, Forms › IMM 5257 › Draft with AI › Live › "Start live AI draft". The only answer is a red toast, "The worst case (US$7.23) is above what is left of the experiment cap (US$0.50 of US$120).", with no warning and no way to Continue.
  * The same refusal comes from the API: 400, nothing started.
  * Only Draft setup (`ai-launch.tsx`) and the finder offer Continue.
  * Fix: gate `DraftDialog` with `useCostGate` (plan from `/ai/plan` scope `source`, `start` `draft_field_maps`, pass `overrideId`), plus a pass and a fail check in the browser.
* **N2. Your own unused Continue blocks your retry, and the error wrongly sends you to the founder.** This was brought in by the m3 fix.
  * Code: `heldByOverridesUsd` (`ledger.ts:96`) counts every unused Continue for 10 minutes, including this person's own one for the same start. `costCheck` (`engine/cost-check.ts:40`) does not count held Continues, so the dialog still offers Continue.
  * A launch refused after the click leaves the Continue unused, by design. Causes: the plan changed (409), a draft under review, or the limit field set below the worst case. On retry, `useCostGate.proceed` records a new Continue.
  * Walk J2 (screenshot `j2-second-continue`): spend at US$120.01, worst case US$9.99.
    * Continue is refused at launch, as expected, with "above this launch's limit (US$5.00)".
    * Cancel, fix the limit, Start, Continue. The answer is 409 "ceiling US$132: committed 120.0120 + 9.9900 held by other Continues not started yet + worst case 9.9900; the founder must raise the cap. Nothing was recorded."
    * The real total would be US$130.00, within US$132.
    * The words are ledger internals (EXPERIENCE [M] 10 and plain words), and the fix they name is wrong: waiting 10 minutes is enough.
  * Ledger proof: attack A1.
  * Fix:
    * Reuse this person's own unexpired, unused Continue for the same run key, or leave it out of `held`.
    * Say a held Continue in words ("You have a Continue from a moment ago…").
    * Add a pass and a fail check.

**Minor**
* **n3.** The amount check of the M1 fix covers `reserve` and `settle` lines only.
  * An `override` line with no `worst_usd` makes `held` NaN, so `recordOverride` admits US$50 at US$125 (attack A2). `reserve` still caps at US$132, and the API checks `can_continue` first.
  * A `reserve` line with no `at` counts toward the experiment but not toward the wave (A3).
  * Both need a malformed line, which only the seed tool merges.
  * Fix: validate those fields in `counted`/`heldByOverridesUsd`.
* **n4.** `DraftDialog` still shows "Spent so far US$119.5 … US$0.5 left" (`sources.tsx:126`, no `toFixed(2)`), while Draft setup shows US$119.50. This is the m4 residue.
* **n5.** `handover-p179.md` §1–§2 still tell other lanes to call `useOverride(b.overrideId, plan)`. That function no longer exists: it is now `checkOverride` before and `spendOverride` last inside the transaction, as the m1 fix needs. A lane following the note would bring m1 back.

## D1–D20 (1–5)
D1 Requirement fit 3: Continue works on Draft setup and the finder; N1 leaves the Forms-tab start unwired. · D2 Data integrity 4: one Continue, one use, one run (walk + checks); n3. · D3 n/a · D4 n/a · D5 Stability 4: lock and transaction fixes hold; N2. · D6 Governance 4: ledger line plus both audit lines name the limit, the person and the override (walk). · D7 AI trust 4: cost before spend, Sample words unchanged. · D8 Orientation 4. · D9 Flow 3: N1, N2. · D10 Language 3: N2 ledger words; n4. · D11 Feedback 3: N1 shows a red toast with no next step. · D12 Visual 4: team Dialog (shots j1). · D13 Accessibility 4: axe 0; 3 Tabs to Continue; focus returns; 400/1024 px and 200 % with no sideways scroll. · D14 Team look 4. · D15 Speed 4: warning opens in 0.1–0.3 s; Continue to run page in 0.7–2.0 s (one run over 1 s). · D16 Testability 4: every earlier fix has a pass and a fail check; N1 and N2 have none. · D17 simulated only. · D18 Provenance 4. · D19 Closure 3: N1, N2. · D20 simulated only.

## Journey score (journey-test, reviewer)
Journeys:
* J1 main: an author at US$115 (worst US$9.99) clicks Continue on Draft setup, and the run is queued. Data underneath: override + use + 2 audit lines, then reload.
* J2 recovery: a launch is refused after Continue, then retried (N2).
* J3 wrong role: the approver's Continue gets 403.
* J4 the per-form Draft with AI start over the cap (N1).
* J5 keyboard and sizes: inside J1.
* Cancel, Escape, past US$132 and double click: covered by the checks, run twice.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | J1 done; B1 path proven (check_p2_launch §12); J4 cannot Continue (N1) |
| Next step obvious | ½ | J1 clear; N1 has no next step; N2 points to the founder wrongly |
| Plain words | ½ | dialog clear; N2 ledger internals; n4 |
| Feedback and state | 1 | info toast on Cancel; run page queued; audit names the Continue |
| Correct data | 1 | exactly 1 override, 1 use, 1 run; worst US$9.99 and limit `experiment` exact |
| Error recovery | ½ | N2 |
| Accessibility and sizes | 1 | axe 0; keyboard; focus back on Start (check); 400/1024/200 % |
| Speed | 1 | warning 0.1–0.3 s |
| Visual quality | 1 | shots j1 |
| Trust and sources | 1 | spend against cap and ceiling shown; who and why recorded |

Fixes most valuable first: N1 → N2 → n5 → n4 → n3.

## Not checked
* A live run or a real launcher run with the queue released: B1 rests on `check_p2_launch` §12, ledger attacks and code.
* The finder's dialog in a browser: it needs the live switch.
* The full 88/88: I took it from `run-suites-c950b098.md` and re-ran only the 4 P-179 suites.
* A headed (visible) browser: I walked headless. A real screen reader: not tried. D17 and D20 stay with the founder.
* An untracked `break-report.md` appeared in this folder during my run. It comes from another session; I did not read or touch it.

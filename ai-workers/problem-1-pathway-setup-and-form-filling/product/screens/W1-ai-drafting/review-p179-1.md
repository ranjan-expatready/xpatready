# Review: P-179 cost warning + override on one shared ledger (QA-90), and the slice-1 FIX (reviewer, 30 Oct)

Independent CHECK (P-68), backend path. Code reviewed at `a264532b` (HEAD `3e2b94dd`). US$0: no live switch, no priced button, scratch ledgers only, isolated copy on :4458 (stopped). Slice 1's earlier review is `review-slice1.md`.

## Verdict: Ship after fixes. Not mergeable as it stands: one Blocker
The dialog, the API gate, the override records and the ceiling all work and are well tested. But a Continue past a **money** limit (experiment, wave or run) cannot start a real run: the free stub pass that comes before every live call reserves the paid worst case with no override, and the ledger refuses it (B1). The attempts-only Continue (Q2) is not affected.

**Journey score: 6 / 10. Fail** (below 8, and one criterion is 0).

## What I ran (US$0)
* `check_cost_check.ts` 39/39 · `check_p2_shared_ledger.ts` 9/9 · `check_cost_override.ts` 33/33 (port 4458, scratch ledger) · `check_cost_warning_browser.cjs` 10/10, run twice, both green, axe clean. I saved the builder's screenshots first and put them back afterwards with git checkout.
* My own walk on :4458, held queue, scratch ledger at US$118:
  * Keyboard only: Next step › Draft again › Start › warning. Focus opens on the dialog, and Continue is 4 Tabs away.
  * Escape cancels: no run, no ledger line, a toast.
  * At 720 CSS px (200 % zoom) there is no sideways scroll and Continue stays visible.
  * Double-clicking Continue gives 1 override, 1 use and 1 run.
  * The approver can see the plan; the approver's Continue is refused 403.
  * After a reload the audit has both `ai_override` and the "started … continued past experiment (override …)" line.
* Proof of B1 on HEAD's own `p2/ledger.ts` (taken with `git show`, scratch ledger at US$118). After the override is recorded and used, `reserve(…, 2.5, 5, "stub")` is refused with "experiment cap US$120: committed 118 + worst case 2.5". The same reservation as "paid" with the override goes through.
* Graph (`graph.mjs`): G1 0 · G2 0 · G3 2 · G4 0 · G5 0 · G6 0. No P-179 route or page is untested.

## Findings
**Blocker**
* **B1. The stub pass stops every Continue past a money limit.**
  * Code: `p2/runner.ts:65` reserves `worst` for every caller, `stub` included. `api/src/sources.ts` `launchArgs` gives the override to live calls only, and `check_cost_override` asserts exactly that. `api/src/rounds.ts:134` (finder) and `sources.ts launch`/`runParts` (field maps) run `launchOnce(jobId, "stub")` before the live call.
  * Scenario: the founder's demo has US$118 committed. The author drafts IMM 5409 (worst US$9.99) and clicks Continue. The override is recorded and used, and the run is queued. Its first stub pass is refused by `reserve` (118 + 2.5 > 120), so the step fails with "could not start on this computer", before the live call. The same happens past the Wave 1 cap, or with any part whose worst case is over the US$5 run cap.
  * Why the tests missed it: `check_cost_override` and the browser check hold the queue, and `check_p2_launch` (override) runs on an empty ledger.
  * Fix: a stub reservation counts US$0 and passes no limit, with a pass and a fail test that run `launch.ts --stub` against a ledger seeded past the cap.
  * Note: at about 14:24, another session left uncommitted changes in this copy (`ledger.ts` `caller === "stub"` → 0, `cost-gate.ts`, `check_cost_check.ts`, and an untracked `break-report.md`). I did not review them. They are not part of `a264532b`.

**Major**: none besides B1.

**Minor**
* **m1. A Continue can be used up with nothing started** (`api/src/ai.ts:270`, `api/src/finder.ts:238`).
  * `useOverride` runs before the batch transaction.
  * A `guardDrafts` conflict, "Already finding", or the same idempotency key arriving twice at once (the P2002 path) uses up the click. The retry then gets "already used" (409) instead of the existing run.
  * Fix: use the override inside the same transaction, or after the idempotency check passes.
* **m2. A test was weakened in the FIX** (`tests/check_s5_slice3_browser.cjs:96-101`).
  * The test now branches on the radio's *observed* disabled state. If AI now were wrongly enabled on a copy with no switch, it takes the else branch and still passes. The "at most US$" words are never checked in suites either.
  * The server guard is still covered (`check_ai_live_switch.ts:42-51`), hence Minor.
  * Fix: branch on the plan's `live.on` from the API, or assert disabled unconditionally.
  * The other FIX test edits keep their intent:
    * w102: the renamed key.
    * s5_leadcheck: `signature='NONE'`, which the C-2 guard needs.
    * slice2_browser: stronger than before.
    * screen01: a precise `b[title]` and a real wait.
  * `check_s5_slice1.ts:166` `rows1295.every(...)` is true when there are no rows. Add a length check.
* **m3. Focus is lost after Cancel or Escape** (`components/cost-warning.tsx:16` with `ai-launch.tsx` `busy`).
  * The Start trigger is disabled while the warning is open, so focus returns to `<body>` (seen in my walk). This breaks EXPERIENCE 12 [M], the keyboard path.
  * Fix: focus Start again on close.
* **m4. The same spend appears as two numbers** (screenshot `03-past-ceiling-1440`).
  * Draft setup says "Spent so far US$127.01". The dialog says "Spend so far US$127.02".
  * Cause: `sources.ts:230` uses `Math.round`, while `contracts/cost-check.ts` uses `toFixed`. The labels also differ: "Spent" vs "Spend".
  * Fix: one rounding and one label.
* **m5. The dialog repeats "Spend so far US$x of US$120"** 3 times, 4 times past the ceiling (`cost-warning.tsx:16,25`, `engine/cost-check.ts:37`).
  * Fix: drop the description, or drop the restatement in the limit line.
* **m6. Audit wording differs between the two starts.**
  * The `ai_override` summary stores the dialog's instructions ("…Continue records your name…; Cancel starts nothing.", `ai.ts` `override`).
  * The finder's "started" line (`finder.ts:254`) does not name the override. The field-map line does.
* **m7. Finder Cancel looks like an error** (`pages/workspace/finder.tsx:66`).
  * It is shown as a red `role=alert`, while Draft setup uses an info toast for the same words.
* **m8. The seed can lose a reservation** (`p2/tools/seed-shared-ledger.ts:45-47`).
  * It rewrites `spend.jsonl` by rename without `spend.reserve.lock`. A reservation another copy appends between the read and the rename is lost, so spend is undercounted.
  * Fix: hold the lock.
* **m9. Stale-lock race** (`p2/ledger.ts:168`).
  * Two waiters can both find a lock older than 30 s. The slower one then deletes the lock the faster one just made, and both enter. This only happens after a crash.
* **m10. Old ledger path, owned by other files.**
  * The qa lane's checks still read the old fixed `p2/ledger/spend.jsonl` (`tests/qa/check_qa_s2_probe.ts:60,176`, `check_qa_explore_1029.cjs:105`). Route to the qa lane.
  * `product/tools/run-suites.sh` still has no `P2_LEDGER_DIR` line (Q3 said yes; this is the Lead's file).
    * `policy.ts` now resolves every lane copy on the Mac to the real `.tools/p2-ledger`, so a suite run that does not export it writes test lines there.
    * `run-suites-fix7.md` says a scratch folder was set by hand.

## D1–D20 (1–5)
D1 Requirement fit 2: the dialog, gate and ceiling match plan §2 and Q1–Q3, but B1 defeats Continue past money limits. · D2 Data integrity 4: one override per click, 409 on stale/changed/used/expired; m1, m8. · D3 Reuse n/a. · D4 Rule integrity n/a. · D5 Stability 3: double click safe, cancel US$0; m1, m9. · D6 Governance 4: ledger line (who, run key, limits, expiry) plus `ai_override` audit. · D7 AI trust 3: cost shown before spend; m6. · D8 Orientation 4: the dialog sits over Draft setup in context. · D9 Flow 4: Continue/Cancel, one action each. · D10 Language 3: m4, m5. · D11 Feedback 3: toast on Cancel; m7. · D12 Visual 4: team Dialog, Notice and Button (screenshots p179). · D13 Accessibility 3: axe 0, 200 % ok, keyboard path works; m3. · D14 Team look 4. · D15 Speed 4: the dialog opens at once; the override re-plans on the server (one request). · D16 Testability 2: B1 escaped every check; m2; the finder Continue launch is tested only up to the live-off gate. · D17 simulated only. · D18 Provenance 3: spend against the cap and the ceiling shown. · D19 Closure 2: B1. · D20 simulated only.

## Journey score (journey-test, reviewer)
Journeys: (1) an author over the US$120 cap clicks Continue and the run starts; (2) Cancel leaves US$0; (3) past US$132 there is no Continue; (4) the approver is refused; (5) double click and reload; (6) keyboard only and 200 %; (7) the handover to the run page.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 0 | B1: the queued run stops at its stub pass (ledger proof on HEAD) |
| Next step obvious | 1 | Continue/Cancel, and "the founder must raise the cap" (shot 03) |
| Plain words | ½ | m4, m5 |
| Feedback and state | ½ | m7; the run page does not say it was continued |
| Correct data | ½ | ledger and audit lines exact (walk); m4, m8 |
| Error recovery | ½ | 409 words for each case; m1 |
| Accessibility and sizes | ½ | axe 0, 390/1024/1440/200 % ok; m3 |
| Speed | 1 | the dialog opens with no wait |
| Visual quality | 1 | shots 01–03 |
| Trust and sources | ½ | cap, ceiling and who are recorded; m6 |

Fixes most valuable first: B1 (with its stub-past-cap test) → m3 → m1 → m4/m5 → m2.

## Not checked
* A live run, or a run through the real launcher with the queue released. The working copy was being edited by another session, so I proved B1 on HEAD's ledger file plus the code path.
* The finder's dialog in a browser: unreachable without the live switch.
* The 88/88 run-suites (not re-run).
* The Forms tab at 390 px after the `min-w-0` fix: covered only by the builder's suites.
* A real screen reader. D17/D20 stay with the founder.

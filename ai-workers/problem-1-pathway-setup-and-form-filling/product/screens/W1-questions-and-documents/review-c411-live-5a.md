# Review: C4.11 "Draft questions and documents", live wiring part 5a (P-227), on c154cd6c

Reviewer: an independent session that did not build this. Scope: `git diff 3c377911..c154cd6c` (da9844d1 + c154cd6c), branch `forms-c411-live`, stacked on #506. Isolated copies on :4455 and :4456 only. :4400 and the breaker's ports (4457–4459) were not touched. Live ran only on the fake launcher (`STUDIO_AI_LIVE=approved` set only on the usage lines, together with `STUDIO_FAKE_LAUNCHER`). My test ledger was in my scratchpad. Spend: US$0. No code was edited.

**Screen-review verdict: Ship after fixes.** One Major is open (M1). Journey score: **7.5/10, which fails** (`journey-test-reviewer-c411-live-5a-2026-11-02.md`).

## What I ran (all at c154cd6c)
* `check_forms_c411_draft_qd.ts`: **63/63**. `check_forms_c411_draft_qd_browser.cjs`: **49/49** (axe clean at 1440, 1024 and 400 px). `check_forms_c411_contract.ts`: **31/31**. `check_forms_c47_pqr_picks.ts`: **60/60**.
* Probes, with the fake launcher's first round set to sleep 5 s:
  * Stop during step 5's first Live round, and Stop during step 6's first Live round.
  * A Live plan with the cap almost used (test ledger at US$58.50).
  * Keyboard only; 1024 px at 200 % (a 512 px viewport).
  * The stated worst case compared with what the ledger reserves for the real requests (`p2/prompt.ts buildRequest`).

## The commit's claims, checked
| Claim | Result |
|---|---|
| Exactly Live and Saved; "rules" stays API-only | Holds. Browser S pass/fail. |
| Live only with `aiLive()` | Holds. After a restart without the switch: 409 "Live is not open yet", and the launcher is never asked. |
| The plan gives the worst case of the 4 rounds and the cap left | Shown (US$2.06 on wp.family), but see m1 and m2. |
| Saved = both rounds of one run (`pairOf`) | Holds. A lone newer checker round leaves step 5 not Saved (LV fail). |
| Step 5: Stop is checked before each Live call | Holds. With Stop during round 1, the checker round is never sent. The step ends Cancelled: "…This step cost US$0.30 (counted); nothing of it is used." |
| Step 6 Live rounds inside the run | **Stop is not honoured (M1).** |
| A failed Live step offers Saved only when it has one; a paid round's cost is stated | Holds. LV F pass/fail and LV B2. The browser's "Use Saved (US$0)" returns focus to Saved. |
| Step 2 uses its saved reading in both ways | Holds. Step 2 is "Saved" in the Live plan and runs at US$0. |
| The batch is LIVE, with worstCaseUsd and spendLimitUsd set | Holds (`ai_batch.mode = LIVE`). spendLimitUsd is a record only: nothing enforces it for this run. |

## Major (Must; blocks)
1. **M1. Stop does not stop step 6's Live rounds, and does not end a running call.**
   * Probe: I pressed Stop while step 6's first Live round was running.
     * The launcher log then shows `stub` + `live` for `studio-pqr-picks-check`: the paid checker round was sent after Stop.
     * Step 6 ended COMPLETED at US$0.60, and its picks were proposed. The run then said "Stopped by a person; the steps already done stand."
   * Cause:
     * Step 6 runs through `this.pqr.draft(...)` (`api/src/draft-qd.ts:299`), whose rounds use `wanted: async () => true` (`api/src/pqr-drafts.ts:157`). The run's `cancelRequested` is never read there.
     * `DraftQd.stop` (`draft-qd.ts:71-75`) only sets `cancelRequested`. It never calls `sources.stopLaunches`, unlike the finder (`finder.ts:840`), people (`people-ai.ts:197`) and AI work (`ai.ts:433`). So a running Live call of step 5 or 6 goes on to the end and is charged.
   * The commit message promises "Stop before each call" for Live. Standards it breaks: `STANDARDS.md:28` [M] (cancel), P-225 (a run stops at once), D5, D11.
   * No test covers Stop between rounds or during a call. If the step-5 `wanted` at `draft-qd.ts:137` is replaced by `async () => true`, every suite still passes.
   * *Fix:*
     * Pass the run's `stopped` into `pqr.draft` (for example `opts.wanted`), so it is checked before each of step 6's calls. A stopped step 6 ends Cancelled with its cost and proposes nothing.
     * In `DraftQd.stop`, end this run's running launch: keep the StepRunner per run and use `liveJob(batchId)`, or match its job ids.
   * *Tests* (fake launcher, round 1 sleeps):
     * Stop during step 5 round 1, and during step 6 round 1: the checker round is never launched, the step is Cancelled with its US$, and no item is proposed.
     * Stop during a call ends the launcher process (`stopped`).

## Minors (Should; do not block)
* **m1. The "At most" figure is below what the ledger can reserve.**
  * `worstRoundUsd` (`rounds.ts:78`, from #506) counts the guide's characters only. The ledger bounds the whole request in bytes: prompt, schema, the inventory envelope and the trail.
  * Measured with `buildRequest`: wp.family is stated at US$2.06 but can reserve US$2.18. Visitor visa's Guide 5256 is stated at US$2.53 but can reserve US$2.66.
  * So the plan's cap check can pass when the 4th round would then be refused mid-run, and P-225's "stated worst case" is not the true ceiling.
  * *Fix (with C4.7):* size each round from its request bytes, as `requestBytesOf`/`sizedBudgetUsd` already do.
* **m2. "Inside the AI spending cap" is shown when the run is over the cap.**
  * With US$1.50 left, the dialog read "At most US$2.06, inside the AI spending cap (US$1.50 left)." Draft Live was enabled, and the click got "Not started: … Nothing was started." (`qd-draft.tsx:108`; same in `pqr-draft.tsx:95`).
  * *Fix:* when worst > left, say so and grey Draft Live, tied by `aria-describedby`.
* **m3. A missing full stop in the run note.** The "Not done" note ran the reasons together: "…so nothing was charged Pre-qualification picks, each with its reason: …" (`draft-qd.ts:325` joins reasons; `rounds.ts:155` has no full stop). *Fix:* end each reason with a full stop before the join.
* **m4. A Saved pill on a step with nothing saved.** When only step 2 has a Saved reading, steps 5 and 6 show the "Saved" pill next to "(none saved: proposes nothing)" (`qd-draft.tsx:107`). *Fix:* show a neutral "none saved" pill instead.
* **m5. Two paid step-6 runs can overlap.**
  * Step 6 inside this run skips C4.7's per-combination "Already drafting" check (`pqr-drafts.ts:140`, the `opts.jobId` path).
  * A standalone C4.7 Live draft that is already running on the same combination is not seen, so both send paid rounds side by side. This is #506 break B3 through the other door. Found by reading the code; not reproduced.
  * *Fix:* run the same RUNNING check under the same lock before the step-6 job starts.

## D1–D20 (1–5)
D1 4: P-227 and claims met except Stop in step 6 · D2 4: one run per combination, Saved pairs per run; m5 · D3 5: reuses C4.7's producer and `rounds.ts`, no copies · D4 5: unchanged · D5 3: M1 (Stop) · D6 4: audit line says Live/Saved and US$ · D7 4: AI marked, a pick proposed after Stop (M1) · D8 5: dialog on the combination's tab · D9 5: failed Live → "Use Saved (US$0)" → plan · D10 4: m3, m4 · D11 3: "Stopped" while step 6 kept spending; m2 · D12 5: matches C4.7's dialog · D13 5: axe clean at 3 widths, keyboard path, 512 px usable · D14 5: team controls · D15 5: plan shown in 201 ms · D16 3: no test for Stop between rounds or in step 6 (a rule removal survives) · D17 simulated only · D18 4: run files on the step, cost per step · D19 3: Visitor visa still "No forms yet" in the fixture (outside this diff) · D20 simulated only.

## Could not check
* A real model call (US$0 by rule), and the real launcher's Stop timing.
* The Visitor visa Live once / Saved after (it needs Track A's run and the 5b contract).
* A screen reader, and an intended user's unaided walk (D17, D20 stay with the founder).

## Housekeeping
The suites rewrote 9 committed screenshots, which I restored with `git checkout`. They also rewrote `studio/var/suites/check_forms_c411_draft_qd.json` and `check_forms_c47_pqr_picks.json`. Those are git-ignored, so I could not restore them from git: they now hold my runs (63/63, 60/60). My copies (rv411a/b/c/k) are stopped and their databases dropped.

**Verdict: Block.** Fix: **M1**. Minors m1–m5 are for the PR or a follow-up (m1 and m2 also apply to C4.7).

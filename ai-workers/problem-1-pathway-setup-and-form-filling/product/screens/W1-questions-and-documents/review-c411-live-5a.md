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

---

## Round 2 on 4a09887b (2 Nov): **Approve**
Scope:
* The fixes: `git diff c154cd6c..4a09887b` (code, tests, and the break report `break-report-c411-live-5a.md`).
* The verdict: the whole of `3c377911..4a09887b`.

Same rules as round 1: :4455 and :4456 only, the fake launcher only, my test ledger in my scratchpad, US$0, no code edited.

**Suites, run at 4a09887b by me:**
* `check_forms_c411_draft_qd.ts`: **71/71**
* `check_forms_c411_draft_qd_browser.cjs`: **49/49**
* `check_forms_c411_contract.ts`: **31/31**
* `check_forms_c47_pqr_picks.ts`: **60/60**

**Restored afterwards:** the 11 screenshots the browser suite rewrote (`git checkout`), and the builder's `var/suites/*.json` (copied back from my backup). Copies stopped, databases dropped.

### My findings and the breaker's Majors
| Item | Result at 4a09887b |
|---|---|
| **M1 / L1, Stop** | **Fixed.** Step 6 now passes the run's `stopped` into `pqr.draft` (`draft-qd.ts:310`, `pqr-drafts.ts:164`). `DraftQd.stop` ends the running launch of step 5 (one shared runner) and of step 6 (`pqr.liveJob`) through `stopLaunches` (`draft-qd.ts:76-80`). Step 5 also checks Stop between its rounds. Suite M1 fail ×2: the checker is never sent, the step is CANCELLED and nothing is proposed. My browser probe (step 6's first round sleeping 20 s): "Stopped" showed 175 ms after the click. The step reads "Stopped while the AI call ran: the call was ended", so the process was ended and did not finish its sleep. The launcher log has no `studio-pqr-picks-check`, and the note reads "Stopped by a person; … This run cost US$0.60 (counted)." No Saved offer. |
| **m5 / L2, one picks draft at a time** | **Fixed.** The `opts.jobId` path runs C4.7's lock and RUNNING check, leaving out its own job (`pqr-drafts.ts:147-153`). The QD step's job is already RUNNING before the lock, so both orders are refused. Suite L2 fail/pass. |
| **L3, cost on a crash** | **Fixed.** Step 5's Live rounds are wrapped. Suite L3: the step, the job (0.42) and the run all keep US$0.42. |
| **m1, stated worst case** | **Fixed.** `roundBudgetUsd` = max(character bound, `sizedBudgetUsd` over the request bytes), which is the per-round run cap the ledger enforces, so it is a true ceiling (`rounds.ts:80-83`). wp.family now states US$4.00: each round is at the US$1 floor, above the ~US$2.18 the ledger could really reserve. Conservative, as "at most" allows. C4.7 uses the same function. |
| **m2 / L4, over the cap** | **Fixed in both dialogs.** With US$1.50 left: "At most US$4.00: over what is left of the AI spending cap (US$1.50), so Live cannot start." Draft Live is disabled. |
| **L5, L6, m3, m4** | **Fixed.** A refusal re-reads the plans. A stopped run's note says "Stopped by a person" with its cost. Joined reasons end in full stops. A step with nothing saved shows a neutral "None saved" pill (browser S fail). |

### Whole branch: claims re-checked
Live and Saved only. Live only with the switch: after a restart without it, 409 and the launcher is never asked. Saved pairs one run. A failed Live step offers Saved only when one exists and never after Stop. A paid round's cost is said. Step 2 is Saved in both ways. One LIVE batch with the worst case recorded. Keyboard path and 1440, 1024 and 400 px all held as in round 1.

### Minors (Should; do not block; follow-up rows)
* **n1. Words.** A checker round that throws after a paid first round reads "…so nothing of it is used. This step cost US$0.42 (counted); nothing of it is used.": the clause is said twice (`draft-qd.ts:145` reason plus `:153`). *Fix:* drop the clause from the wrapped reason.
* **n2. A round ended by Stop is counted at US$0 here, but the ledger keeps its reservation.**
  * `rounds.ts:153` returns `costUsd: 0`, yet the step's own words say "It stays counted at its reserved worst case". So the run note ("This run cost US$0.60"), the card ("US$0.60 spent") and the job cost leave it out, while the real ledger keeps up to that round's reservation (about US$0.5–0.6 here).
  * This predates the branch: shared `rounds.ts`, same for the finder.
  * *Fix:* return the round's budget as its counted cost, or have the note say "plus one call ended by Stop, counted at its reserved worst case".
* **n3. The disabled Draft Live is not tied to its reason.** When over the cap, Draft Live has no `aria-describedby` pointing to the cost line (`qd-draft.tsx:81`; `pqr-draft.tsx:67`), unlike "Nothing can start".
* **n4. Gaps in the tests.**
  * No suite asserts that Stop ends the launcher process. Removing `stopLaunches` from `stop()` still passes M1, because the checker round is refused after the sleep.
  * No browser step covers the over-cap state.
* **L7–L11** are recorded in the break report and are still open. Each is Minor, and I agree with that rating.

**Journey score, round 2: 8.5/10, which passes.**
* Raised from round 1:
  * Feedback and state (1): Stop is shown in 175 ms and is true.
  * Correct data (1): nothing is proposed after Stop.
  * Plain words (1): m3 and m4 fixed. n1 is a small repeat.
* Still at ½:
  * Trust and sources: n2, a killed call is missing from "spent".
  * Accessibility and screen sizes: n3.
* Every other criterion stays at 1.

**Verdict: Approve** (commit 4a09887b). No Blocker or Major is open. n1–n4 and L7–L11 are for follow-ups. n2 should be fixed before the paid Visitor visa Live run, so the founder's US$ figure matches the ledger.

---

## Round 3 on 85d6bf35 (2 Nov): **Approve**
Scope: `git diff 4a09887b..85d6bf35 -- …/prototype/studio`, 7 files: the two dialogs, `draft-qd.ts` and three tests. I read the code and reran nothing, because the changes are small and the builder's results cover them (c411 API 73/73, c411 browser 50/50, c47 browser 63/63, c47 API 60/60, contract 31/31).

* **qa minor 1 on #506 (both dialogs): fixed.**
  * A greyed way is never shown checked (`checked={mode === m && !off}`).
  * A closed mode's button reads "Draft".
  * Both browser walks assert no checked choice and "Draft" in the nothing-can-start state.
  * One small effect, which is acceptable: while the first plan loads, every way counts as closed, so the button reads "Draft" (disabled) for that moment.
* **n3: fixed.** When over the cap, Draft's `aria-describedby` is `qd-cost` / `pqr-cost`, and the cost line now carries that id. "Nothing can start" still wins when the mode is closed.
* **n1: fixed.** A crashed round reads "The AI step stopped on this computer." The L3 message is now "…the checker round did not: the AI step stopped on this computer. This step cost US$0.42 (counted); nothing of it is used." The phrase is no longer doubled.
* **n4, browser part: done.** The pgrep check added to the API suite does not test the rule yet. It is still Minor.
  * Why: the pgrep at `check_forms_c411_draft_qd.ts:311` runs only after `result()` has waited for the run to end. The round awaits the launcher's `close`, so by then the stand-in has exited whether or not Stop ended it. Without `stopLaunches` the 4 s sleep simply finishes first, and the check still passes.
  * *Fix:* either assert the step message "the call was ended", which comes only from a signal (`rounds.ts:153`), or run pgrep right after the Stop call, well inside the 4 s sleep. Round 2 already showed by probe that the process is ended (175 ms, "the call was ended"), so the behaviour is right; only the test is weak.
  * pgrep `-f` also matches other copies' stand-in launchers for the same job prefix. In CI each copy runs alone, so this is low risk.
* **n2: not fixed here.** It is raised to the tech lead as its own row in shared `rounds.ts`. I agree with that: it touches every AI step, and it should land before the paid Visitor visa Live run.

**Journey score: 9.5/10, which passes.** n3 raises accessibility to 1, and n2 keeps trust and sources at ½. Every other criterion is 1.

**Correction to my earlier sums.** The criteria were right but the totals were added wrong. Round 1's table (½ on plain words, feedback, correct data and trust) adds up to 8.0, not 7.5. Round 2's (½ on trust and accessibility) adds up to 9.0, not 8.5. Round 1's Block stands, because M1 was a Major on its own. The same 7.5 appears in `journey-test-reviewer-c411-live-5a-2026-11-02.md`, which is committed on the branch.

**Verdict: Approve** (commit 85d6bf35). No Blocker or Major is open. The n4 test strengthening, n2 (own row), and L7–L11 are follow-ups.

---

## Part 5b on f8a6fe90 (2 Nov): **Approve**
Scope: `git diff e0a8b8fb..f8a6fe90`, which covers the acceptance contract (`api/src/draft-contract.ts`), a per-step `worst_usd` in `draft-qd.ts`, and `check_forms_c411_contract.ts`. 1b179125 adds only `qa/built/C4.11.md`.

Rules as before: :4455 only, the fake launcher with the switch only on the usage line, my test ledger in my scratchpad, US$0, no code edited.

**Suite:** `check_forms_c411_contract.ts` **35/35**, run by me on HEAD. The four L5 checks and the three closed-Live checks all pass. Afterwards I stopped the copy, dropped its database, and copied the builder's `var/suites/*.json` back.

### What holds
* **Live open (fake launcher), all seven steps planned with the AI steps Live.**
  * conditions: worst US$2.00, "The most its two AI rounds can reserve; the usual cost is not estimated yet".
  * pqr_picks: worst US$2.00, same words.
  * documents: worst US$0, "uses its saved checklist reading", with its saved reading named (IMM 5488, 2026-10-20).
  * checker: worst US$0.
  * The totals are `worst_usd 4`, `usual_usd null` and `remaining_usd 60`, the same as the engine's plan from 5a. `live.approved` is true.
* **BR-12 spend limit.** A limit 1 cent under the worst case gets 409 "over the limit" and nothing starts. A limit at the worst case starts one LIVE batch.
* **AI spending cap (my probe).** With my test ledger at US$1.50 left and a limit of US$10, the run got 409 "Not started: the worst case (US$4.00) is above what is left of the AI spending cap (US$1.50). Nothing was started." The batch count stayed at 4. The contract hands over to `qd.run`, which re-checks its own plan checksum and the cap, so every 5a guard (Stop, one run per combination, one picks draft) also applies to Live runs started through the contract.
* **Rules steps asked Live.** Open: 400 "worked out by the rules". Closed: the old 409, now in P-227's words (`LIVE_WAITING`). Closed-Live plans still show costs as null with "Not estimated: Live is not open on this copy." and never run.
* **Plans after a restart.** Plans live only in memory, so a plan made with the switch open cannot run after a restart without it (409 "Look at the plan again").

### Minors (Should; do not block)
* **p1. The checker step's flags contradict each other.** In a Live plan, `checker` has `uses_ai: true` and `mode: live`, but its cost says "US$0: worked out without an AI call."
  * Concept §4 step 7 is the independent checker round plus rules. Here the blind checker rounds are inside steps 5 and 6 and are costed there.
  * *Fix:* say that in the words, e.g. "US$0 here: the blind checker rounds are counted under conditions and pqr_picks; this step is the rules check" (`draft-contract.ts:83`).
* **p2. Old wording still in the documents step.** `saved()` still says "recorded in the founder-approved live trial (P-131)" for the out-of-date and none states (`draft-contract.ts:100-101`). A Live plan now shows this block too. The engine's 5a words are "an approved Live run of the checklist, on its page". *Fix:* use the same words.
* **p3. A wrong reason when the guide is not among the AI-readable files.** Found by reading the code; not probed. In that case `worst_usd` is 0 for conditions and picks (`draft-qd.ts` steps map, `g?.input`), so the contract says "US$0: worked out without an AI call." for steps that will in fact fail with "not among the official files the AI may read". *Fix:* say that reason instead.
* **p4. A missing test.** The contract suite does not cover the AI spending cap refusal through `/draft`; my probe above shows it holds. *Fix:* add one fail check with a scratch ledger.

**Journey:** not rescored. 5b is an API contract with no screen change, and the 5a dialog score (9.5/10) is unaffected.

**Verdict: Approve** (commit f8a6fe90, with 1b179125 on top). No Blocker or Major is open. p1–p4 are follow-ups, as are the earlier n2 (its own row, before the paid Visitor visa run) and L7–L11.

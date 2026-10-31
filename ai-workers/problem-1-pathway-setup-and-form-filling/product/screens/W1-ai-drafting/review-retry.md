# Review: PR #131, P-179 follow-up (a Continue covers retries of the run it started), the fix of M1

Commit reviewed: **468f5102** (branch `claude/friendly-lamport-06zafk`, the PR head). The fix itself is `468f5102~1..468f5102`: `p2/ledger.ts` (`reserveNow`, `overrideRoomUsd`), `studio/api/src/ai.ts` (`retry`), `studio/tests/check_cost_check.ts`, `studio/tests/check_cost_override.ts`. Against origin/main the PR also carries the cfb98bda change (`sources.ts` `runDraftStep`, the retry exemption) and the earlier review. Reviewer: an independent check. Cost: US$0. I used a scratch `P2_LEDGER_DIR` (`/tmp/rv131/ledger`), no `*_LIVE` switch, and port 4458, which was stopped afterwards.

The earlier review of cfb98bda is replaced by this one. Its M1 is fixed. One new Major remains: the fix makes a Continue run's own second attempt depend on how a cent rounds.

## What was run

| Run | Result |
|---|---|
| `studio/tests/check_cost_check.ts` | 98/98 |
| `studio/tests/check_cost_override.ts 4458 rv_rt` | 68/68 |
| `studio/tests/check_ai_orchestration.ts 4458 rv_or` | 22/22 |
| `tests/check_p2_launch.ts` (§12 uses a Continue through the real launcher) | 60/60 |
| `tests/check_p2_guard.ts` | 80/80 |
| `check_cost_check.ts` with the 7-line `reserveNow` branch removed (`overrideRoomUsd` kept, so the suite loads) | 97/98. "a second US$2 reservation under it (a retry) is refused" fails, so the ledger check guards the fix. With the whole pre-fix `ledger.ts`, the suite stops with `TypeError: overrideRoomUsd is not a function`. |
| `check_cost_override.ts` with `ledger.ts` and `ai.ts` from `468f5102~1` | 62/68. Two checks fail directly: the "past the cap" check (on the old code the retry is refused against the ceiling, with the wrong words) and the "no room left" check (201, queued). Four more fail because a job is left queued. The new API checks fail without the fix. |
| Probe R (scratch ledger, `/tmp/rv131/probe/round.ts`). A whole-form request of 151,000 bytes gives a worst case of US$1.892 per attempt. `estimate()` shows round(2 × 1.892) = **US$3.78** and the Continue records that. Attempt 1 reserves US$1.892, then attempt 2 reserves US$1.892 | **Attempt 2 refused**: "would reserve US$1.8920 more … above the US$1.8880 left". At 151,234 bytes (US$3.7859, which rounds up to US$3.79) both attempts are admitted. |

Every file the suites changed is restored: `p2/runs/stub-pass/*.json` (5), `p2/screening/canary-digest.json` and `studio/evidence/ai-orchestration/check_ai_orchestration.json`. The swapped `ledger.ts` and `ai.ts` are restored too. `git status` is clean, and port 4458 is free.

## Money-safety questions asked

- **Is every reservation that carries an override now held to that override's accepted worst case?** Yes. A reservation that passes a ledger limit still goes through `overrideRefusal`, which checks used + worst ≤ `o.worst_usd`. A reservation that passes none and adds money now goes through the new branch, which checks worst ≤ `overrideRoomUsd`. Both run inside the reserve lock, so two processes cannot both fit into the same room. An override the ledger does not know is refused. The branch can only refuse, never admit, so it skipping the run-key and used checks is harmless.
- **Does the new branch break an earlier path?**
  - *Stub passes and the US$0 B1 path:* no. `caller === "stub"` sets the worst case to 0, so `adds` is false and the branch is skipped. This is covered by the check_cost_check stub check and by launch §12, B1.
  - *A4 parts under one batch Continue:* no. The planned worst case per part uses `bytes + 8,000`, against the runner's request + 2,000. The real request is the compacted part plus about 7,070 bytes of template and schema. For the five IMM 5257 parts the plan bounds are 123,989 / 82,663 / 93,603 / 104,221 / 36,921 tokens, against requests of 79,272 / 54,661 / 60,938 / 65,566 / 26,456 bytes. That leaves cents of slack per attempt, well above any rounding.
  - *A first whole-form run started with a Continue:* **yes, in about half the cases (Major M1 below).** Its reservations do not fit by construction, because the accepted worst case is rounded to the nearest cent, not up.
- **Is the retry's up-front room check right?** It is money-safe and uses the same ledger and the same sum as the reserve. It compares the target's whole planned worst case with the room. A run stopped before anything was sent therefore retries (the PR's purpose, and checked). A run with anything sent is refused with "start the draft again … choose Continue again". That is conservative for A4 (m1).
- **Is the cap-versus-ceiling choice (old m1) right?** Yes. The ceiling applies only when the Continue names `experiment`, which matches the ledger: `overrideRefusal` admits passing the cap only for a named limit, and holds the total to the ceiling. Otherwise the remaining cap applies. After the change, the ceiling branch has no check (m2).
- **Do the new checks fail without the fix?** Yes: the ledger check and both API checks (see the table).

## Findings

### Major M1: a Continue run's own second attempt can be refused, because the accepted worst case is rounded to the cent, not up
The plan's worst case is `round(Math.min(RUN_CAP_USD, perAttempt * 2))` in `studio/api/src/ai.ts:226` (`estimate`). The parts are `Math.round(worst*100)/100` at `sources.ts:322`, and the totals are `round(...)` at `ai.ts:158`. The Continue records that figure (`overrideAllowed` checks it to 1e-9). The runner reserves the exact, unrounded per-attempt figure (`p2/runner.ts:60`).

For a whole form, `estimate` uses the past run's exact `request_bytes`, which is the usual case for a form over `attempts`, since it already has paid runs. So the plan's per-attempt figure equals the runner's. Whenever 2 × per-attempt rounds **down**, attempt 2 is short by up to US$0.005, and the new branch (`ledger.ts`, `worstUsd > room + 1e-9`) refuses it. Probe R shows this.

Effect: on the C11.8 path this PR targets, a Continue run whose first attempt times out (counted at its worst case) or meets a busy service (US$0, but its reservation still counts toward the room) ends as budget_exceeded. The run never gets the "up to 2 attempts" the dialog promised. Its retry is then refused up front too. On main, that attempt 2 ran. Money is safe (it only refuses), but this breaks the path the earlier rules guaranteed. The same rounding already affected Continues naming `experiment`, `run` or `wave` through `overrideRefusal`; the fix widens it to attempts-only Continues.

**Fix (small).** Round every worst case shown and recorded **up** to the cent: `Math.ceil(x * 100 - 1e-9) / 100` in `estimate`, in the part worst case in `draftSplit` and in the totals. Then the person accepts at least what the runner reserves, and the ledger stays exact. Add a failing check: a Continue whose worst case is the rounded figure for an exact request size that rounds down, where attempt 2 is admitted. Probe R's 151,000 bytes is such a case.

### Minor m1: under a Continue, an A4 run with any part already sent cannot be retried, even when the parts left would fit
`retry` compares the target's whole `worst_usd` (every part, two attempts each) with the room. Parts that finished reuse their saved answers at US$0, but they still count toward the retry's worst case. So a run cancelled part-way, or one with a single failed part, is refused ("start the draft again"). This is money-safe, and the advice works: a new start re-plans at US$0 for the saved parts. But it means the PR's "a Continue covers retries" holds only for runs that sent nothing. Either say so in the PR's question to the founder, or count only the parts that will be sent (the `a4.parts` with no `saved_answer` and no finished run).

### Minor m2: the US$132 ceiling branch of a Continue's retry lost its check
The old "past US$132 gives 409, the founder must raise the cap" check was turned into the cap check for an attempts-only Continue (`check_cost_override.ts:103-104`). No check now covers a Continue naming `experiment` whose retry would pass the ceiling. Add one, for example by recording the C11.8 Continue's plan override with `limits: ["experiment"]` and seeding a ledger at US$140.

### Minor m3: another author's Retry spends under the first person's Continue
`retry` needs only the author role (`ai.ts:439`). Break m7 holds a Continue to the person who recorded it when it **starts** a run, but a retry by any other author is admitted under it. The money stays within the accepted worst case, so this is not a money fault. It is a gap against "a Continue is used only by the person who recorded it". Either refuse a Continue-covered retry by anyone other than `override.by`, or name this in the PR's question to the founder.

### Minor m4 (carried from the earlier review, m2): no check for a batch with several targets, only some over attempts
This is unchanged. By reading, the behaviour is right (`continued()` is per target, and the room is shared), but it is untested.

Note (not a finding): the room counts a reservation settled at US$0 (refused or busy) at its worst case, as `overrideRefusal` always has. This is conservative and consistent. It is what makes M1 bite on a busy first attempt.

## Journey test
Not scored. The change is API and ledger only: no screen, no flow and no words on a screen changed, apart from the Retry error text. That text is plain and gives the next step: "This run has used its Continue: a retry could cost up to US$x, and only US$y is left of the US$z the person accepted. Start the draft again to look at the cost and choose Continue again." An unaided walk by an intended user stays with the founder. Not checked: the graph tool (I did not run it, because it rewrites `qa/GRAPH.md`), and a live paid call (US$0 rule).

Verdict: Ship after fixes

To fix before merge: M1 (round the shown and recorded worst case up to the cent, with a failing check). Recommended in the same PR: m2 (the ceiling check). m1, m3 and m4 can be fixed, or named in the PR's question to the founder.

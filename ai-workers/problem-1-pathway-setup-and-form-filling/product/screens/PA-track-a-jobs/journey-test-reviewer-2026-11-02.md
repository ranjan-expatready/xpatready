# Journey test, reviewer role: PA Track A jobs (C4.7 PQR picks, C4.11 step 5), 2 Nov 2026

Commit 80a9df79 on `claude/nice-gates-gn2vfq`, compared with origin/main. Isolated copy `forms_rv` on :4457 (`xr_studio_forms_rv`), stopped afterwards. **No model call and US$0:** no `*_LIVE=approved`, no `launch.ts --live`. Only `--stub` and Replay were used.

This item is data and tooling. It changes no screen, so the journeys follow the two people it serves: the tech lead running the Mac paid runner, and the content author who later uses **Saved AI answers**.

## Journeys
1. **Main path (tech lead).** Goal: "Before I say Go, tell me what each run costs and in what order." Ran `tools/track-a-jobs.ts` in plan mode. Expected: 4 jobs in run order, each with worst cost, usual cost and budget. **Held.** C4.7 runs before C4.11. Worst costs are US$0.63, 0.62, 0.71 and 0.70, total US$2.66. Usual is about US$0.11 each, about US$0.43 in total. Each budget is US$1.
2. **Main path (tech lead).** Goal: "Prove each job gets through the guarded launcher for free." Ran `p2/launch.ts --job <id> --stub` for all four. **Held.** Each exited 0 and was contract-valid at US$0. The `request_bytes` it recorded (56387, 55826, 56535, 55458) are exactly the bytes the tool prices. The committed stub passes are still current: `hasStubPass` is ok for all four.
3. **Across the boundary (author, C4.7).** Goal: "Use the AI's saved picks for Visitor visa." I put launcher-shaped live runs of both committed C4.7 jobs in place and walked it in Chrome: Visitor visa › Questionnaires › Pre-qualification › Draft pre-qualification picks › Saved AI answers › Draft. **Held.** Replay used both readings in 124 ms at US$0. The result reads "0 picks for To review, 2 left out with the reason", with the first and second readings named. Screenshots: `…/scratchpad/shots/01-plan-saved.png`, `02-result-saved.png`, `03-result-1024.png` (session scratchpad, not committed).
4. **Across the boundary (author, C4.11 step 5).** I replayed through the exact call `draft-qd.ts conditions()` makes, via the check's R step. **Held**: it used exactly the committed draft and checker runs. The full "Draft questions and documents" run stops before step 5 on Visitor visa right after Reset to the six, because its field maps wait in To review. So that step was not walked in the browser.
5. **Error: wrong combination.** I saved the same runs under the key `fs.spouse`. **Held.** C4.7 says "No saved AI answer…" and C4.11 step 5 returns nothing.
6. **Error: unknown kind.** A run whose kind is not in the contract is refused (`/kind` enum). Against origin/main's contract, all four stub runs are invalid at `/kind`, which confirms the PR's reason for the contract change.
7. **Recovery: regenerate.** I compared the committed jobs with the jobs derived now. They are byte-identical (J). Re-running `--write` gives the same files.
8. **Recovery: cleanup.** After the check, after my own stub launches and after the browser walk, `git status` is clean. The stub passes and the canary digest are restored byte for byte (md5 checked).

## Data underneath
- No proposal rows were written in journey 3: every pick was left out, because Visitor visa has no question that asks "Date of birth" yet, which is correct.
- The ledger got only US$0 reservations: `committed()` was the same before and after.
- The job's `inputs` match what the app asks for byte for byte (guide-5256 inventory, sha `c6bc45…`), and so does `combination`, which is `vv.single`.

## Break-it (15 min)
- **Another combination's run:** never used.
- **A run of a made-up kind:** refused.
- **A later real run file next to the check's simulated ones** (a run named `…-live-20261103…` appeared in the shared checkout during my session; it was not mine): the check's R steps would then fail, because Replay picks the newest run. This is finding 1 in `review.md`.
- **Plan mode with an extra `studio-pqr-picks-*` job file in `p2/jobs`:** it may price the wrong file (finding 3).

## Score

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | All four jobs are ready, pass their stub at US$0, and Replay uses their runs (25/25; journey 3) |
| Next step obvious | ½ | Run order, costs and caps are printed. Plan mode finds a job file by prefix only, and the PR does not say it covers 2 of PA's job sets |
| Plain words | 1 | The tool's output and the dialog are in plain words |
| Feedback and state | 1 | The result names the readings and gives each left-out pick a reason; US$0 is shown |
| Correct data | ½ | Worst costs are exact against runner.ts:60. But the printed "experiment cap counted since 2026-10-26" is wrong (that cap counts all time), and "usual" doubles the output without saying so |
| Error recovery | 1 | A wrong-key run is never used. A stale stub pass or a changed input is refused before any spend (launch.ts gate, guard) |
| Accessibility and screen sizes | ½ | axe: 0 violations on the result. No sideways scroll at 1024 px. No keyboard-only walk (the dialog is unchanged by this PR) |
| Speed | 1 | Replay 124 ms; the check takes 20 s |
| Visual quality | 1 | The existing dialog is unchanged and in the team's look |
| Trust and sources | 1 | Run files are named. Replay requires a contract-valid live run with the same prompt sha, inputs and key. Picks are marked Sample |

**8.5 / 10, no criterion at 0: pass.**

## Not tested
- A real paid run (forbidden here). Whether the model's `asks` will match Visitor visa's question labels once its field maps are accepted.
- The C4.11 step 5 browser path after field maps are accepted.
- A screen reader. D17 and D20 stay with the founder.

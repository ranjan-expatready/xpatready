# Review r2: PR #113 (runtime lane) at 66be73b7

Independent reviewer, 31 Oct, fresh context. I read `git diff origin/main...HEAD` (code only) and `git diff 8dc95280..66be73b7` (the fixes). I ran the M1 and M2 checks on isolated copies on ports 4431–4436 (prefix `rv2_`), probed the server by API, and walked Preview by person in headless Chrome.
Cost: US$0. No `*_LIVE` switch was set by hand. The only pairing used was `STUDIO_AI_LIVE=approved` + `STUDIO_FAKE_LAUNCHER`, taken from the checks' own usage lines (P-192). No Fill was pressed in AI now outside the checks.
Setup: I ran `prisma generate` and `vite build` from this head. Both write untracked build files only.

## Verdict: Ship (**Verdict: Approve**). No open Blocker or Major.

## M1 holds: AI now opens only behind the live switch
* `people-ai.ts:38-39`: `whoCanBeLiveOpen` = `STUDIO_AI_LIVE=approved` AND (the founder's trial `STUDIO_PEOPLE_AI_LIVE=approved` OR the fake launcher). `LIVE_APPROVED` also ANDs `aiLive()`. This now agrees with main's gate in `launchOnce` (`sources.ts:454`). `usesFakeLauncher()` is still honoured only for an `isolated-*` folder whose path resolves to the fixture (`sources.ts:49-56`).
* Server probe:
  * **Fake launcher only (:4436).** `POST …/people/propose/plan {mode:"live"}` → 409 "AI now is not approved yet". The rules plan reports `live.approved: false`, with the plain reason.
  * **Paired copy (:4431).** The live plan returns its steps and cost, and `live.approved` is true.
  * **No switch (:4435).** `check_s5_leadcheck_browser` 21/21: greyed.
* Checks on this head:
  * `check_qa91_who_can_be_run` 21/0. It adds 4 pure gate cases: fake alone, trial alone and switch alone all stay closed; switch + fake and switch + trial open.
  * `check_qa91_who_can_be_run_browser` 10/0.
  * `check_s5_live_approval_browser` 5/0.
* Spend guards: the TS and browser QA-91 checks now STOP on any other `*_LIVE=approved` and need the fake launcher. In the browser check, `STUDIO_AI_LIVE` must also be present. All three usage lines pair `STUDIO_AI_LIVE` with the fixture, as P-192 says.
* Founder's trial: it now also needs `STUDIO_AI_LIVE`. That is correct, because main's launch gate already refused it without the switch.

## M2 holds: signed scans now reach Preview by person and the case
* `engine/render.ts:191-215`: the shared renderer adds one `"<form> signed by hand and scanned"` line per signer. It applies the same "Signed by" values (person, principal for the family, parent for a minor, person and representative, none) and skips document-kind forms. The status follows the form's own applies, aggregated per signer. Both Preview (`preview.ts:104`) and the case (`case.ts:192`) read `render`, so both get the line. Nothing is stored.
* `check_c3_11_signed_scan` 30/30 covers both directions:
  * API: Preview lists the line, and drops it when the form is set back to PDF upload.
  * Engine: each person gets it; principal for the family gives the principal only; a typed name or No signature gives nobody; previewFamily lists it.
  * The engine cases read `render(...).checklist`, so removing the block fails them.
* My walk (wp.family, IMM 1295 set to PDF upload + HAND_SCANNED):
  * The principal and the spouse each show "IMM 1295 signed by hand and scanned" with its "because…" line, last in Documents (18).
  * Axe: 0 violations. No sideways scroll at 1024 px. No page errors. Load took 0.8–0.95 s.
* Other consumers are unaffected: `preview.ts:84` (document-supplied facts: signed scans supply none) and `coverage.ts` (reads coverage, not checklist).

## Rest of the PR (unchanged since the r1 review; spot-checked)
The scaffolding guard on demo load, the queue transaction, C10.1, S7 and the P-184 helper are unchanged since 8dc95280, apart from the files above.
The builder's full run on 43cf2014 (105 PASS) covers all of these: queue_tx 8/0, c10_1 20/0 + browser 12/0, s7_load 19/0, s7_reset 4/0, s7_dialogs 12/0, speed_budget 5/0, ai_live_switch 9/0, ai_launch_paths 44/44. 66be73b7 changes only the s5 usage line and guard. r1c's tab budget is accepted by the Lead and is not counted.

## Issues
| # | Sev | Where | Failure scenario | Fix |
|---|---|---|---|---|
| m6 | Minor (Should) | `engine/render.ts:196-201` vs `engine/sources.ts:246-251` | The same "who signs" rule now exists twice, and the two can disagree. A form line on "each applicant" whose condition is on one subject kind (PRINCIPAL or CASE) gets different lines on each side. Probe on the wp.family draft: the Documents tab gives `[principal]` for PRINCIPAL and `[]` for CASE, but Preview and the case give every applicant ("Cannot tell yet"). No sample form uses such a condition today, so nothing visible is wrong now. | Derive both from one function, or add a parity test (Documents-tab roles = render signers) over the Signed-by × who × subjectKind cases. Follow-up is acceptable. |
| m7 | Minor (Should) | `check_qa91_who_can_be_run.ts:39-42` | The M1 tests call the pure `whoCanBeLiveOpen`. No suite starts a fake-launcher-only server and asserts that AI now is refused. If `LIVE_APPROVED` were reverted to `… \|\| usesFakeLauncher()`, every check would still pass. I proved the server behaviour by hand only (409 on :4436). | In s5_leadcheck, or one small check, start a fake-launcher-only copy and assert the 409 / `live.approved:false`. Follow-up is acceptable. |

m1–m5 from r1 are recorded as follow-ups. None got worse: `demo.ts`, `proposals.ts`, `sources.ts` and `studio.ts` are untouched since 8dc95280.

## Journey score (reviewer role; QUALITY.md "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Checkpoint, Reset and Load sample work (r1 walk plus the 43cf2014 run). The signed scan now reaches Preview and the case (M2 fixed). |
| Next step obvious | 1 | Waiting rows say why. Greyed AI now says what it waits for. |
| Plain words | 1 | "because IMM 1295 is filed as PDF upload, signed by hand and scanned…". 409s are in words. |
| Feedback and state | 1 | Run card steps and Stop (qa91 browser 10/0); busy and double-load 409. |
| Correct data | 1 | Line added and removed with its form line, never stored, release untouched (c3_11). m6 is latent only. |
| Error recovery | 1 | Fake-launcher-only copies get a clear refusal. Paired copies run end to end (M1 fixed). |
| Accessibility and sizes | 1 | Axe 0 on Preview (principal, spouse). No sideways scroll at 1024 px. Keyboard path from r1. |
| Speed | 1 | Preview 0.8–0.95 s. Checkpoint 15–16.5 s. |
| Visual quality | 1 | Team components. The signed-scan line matches its neighbours. |
| Trust and sources | 1 | US$0 is true: no LIVE spend. The reason names the form line. |
| **Total** | **10 / 10** | Pass. |

## D1–D20
Not scored one by one: this is a multi-item lane PR with no single concept.md (same as r1). D17 and D20 are simulated only.

## What I could not check
* A real screen reader. An intended user's unaided walk.
* A full `run-suites.sh` on 66be73b7. I relied on the builder's 43cf2014 log plus my reruns of every check the fixes touched.
* `graph.mjs`: it rewrites the tracked `qa/graph.json`.

**Verdict: Approve** (commit 66be73b7). Should-fix follow-ups: m6 and m7, plus m1–m5 from r1.

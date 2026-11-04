# Journey test, reviewer: gate B (PR #804, head 844094baa), 4 Nov 2026, about 08:30–09:10 IST

This is CI tooling, not a screen. The "user" is a person reading the gate's lines in a PR's checks, so the journeys are walked on the command line and in CI, the way a builder, qa or the tech lead meets the gate. Browser, axe and screen widths do not apply. US$0, ports 4431–4432.

## Journeys and results
| # | Persona and goal | Steps | Expected | Result |
|---|---|---|---|---|
| 1 | Builder: "claim Works for C11.13 while QA-192 (Major) is open" | `Claims Works: C11.13` | refused, names QA-192 and the fix | **Held**: exit 1, "fix it in this PR and name it (a "Fixes: QA-192" line), or do not claim Works" |
| 2 | Builder: "my PR fixes QA-192" | the same + `Fixes: QA-192`, or QA-192 in the title | passes | **Held** |
| 3 | Builder, honest: "Works, but QA-192 is not fixed yet" | `Claims Works: C11.13` + "QA-192 is not fixed by this PR" | refused | **Failed**: exit 0, "says it fixes QA-192" (M1) |
| 4 | Builder: incremental work on C11.13, no Works claim | title `forms: C11.13 …` | packs run, no bug check | **Held**: C11.13 on the six, 15/15, 46 s, passed |
| 5 | Builder: adds "Claims Works" after CI was green | edit the body after the run | rechecked before merge | **Failed**: `on: pull_request` has no `edited`, and the batch skips the gate (M2) |
| 6 | qa: a records PR mentioning C11.13 and Claims Works | `--kind records` | skipped | **Held** |
| 7 | Merge queue: a batch PR | `QUEUE=true` | skipped | **Held** (see 5 for the gap) |
| 8 | Builder: works on C11.12 (two packs) | title `runtime: C11.12 …` | both packs; a red one says why | **Partly**: refused on C11.12-runtime, but the reason read "exit 1 on the six (})" (m4) |
| 9 | Builder: writes the claim another way | list under `Claims Works:`, `Claims Works — C11.13`, lower case | refused, or told the right form | **Failed silently**: "claims Works for none", exit 0 (m1) |
| 10 | Tech lead: #785's and #771's titles | both titles, no Claims Works | pass; refused with Claims Works | **Held**: self-check cases, plus part 1 on all 20 open PRs |

## Data underneath
* After runs 4 and 8 the copies stopped (no listener on 4431–4432). But `xr_studio_b1r_gate0`/`1` and `var/isolated-b1r_gate*` stayed until I dropped them (m2).
* No `*_LIVE` was set and no spend occurred.

## Break-it pass (15 minutes)
* Negations near "fixed" or "closes": a false pass (Major, M1).
* Body edit after CI: a false pass (Major, M2).
* En-dash ranges `steps 1–4`: a false refusal (Minor).
* `GATE_B_PORT` + pack index, with more packs than the builder's ports: `isolated.sh` kills another copy's listener (Minor).
* The PR editing its own BUGS.md row to "Done": a false pass that the reviewer can see in the diff (Minor).
* `--bogus`: exit 2 (held).
* A header with no run line: an error, not a skip (held).

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Journeys 1, 2, 4, 6, 7 and 10 hold; 3 and 5 are false passes |
| Next step obvious | 1 | Each refusal says what to do: name the bug, or do not claim Works |
| Plain words | 1 | "on the six", "fixture only", the exact reason per capability |
| Feedback and state | ½ | "(})" as a reason (m4); a malformed claim gets a silent "none" (m1) |
| Correct data | ½ | Fix waiver wrong (M1); reads the PR's own BUGS.md (m7) |
| Error recovery | 1 | Setup missing, a bad header or a bad option is loud; `finally` stops each copy |
| Runs wherever the check runs (in place of accessibility and screen sizes) | ½ | Absent on the `PR_RUNNER/BATCH_RUNNER=mac` path (m8) |
| Speed | ½ | 46 s per pack on the six locally; the CI timing step took 48 s. The under-5-minute figure is the builder's, not yet shown |
| Readability of its output (in place of visual quality) | 1 | One summary line, one line per pack with its times, `GITHUB_STEP_SUMMARY` |
| Trust and sources | 1 | "fixture only" is labelled, and the fix, claim and bug ids are echoed |

**7.5 / 10: not a pass** (8 or more is needed; no criterion is at 0).

## Fixes that would raise the score, most valuable first
1. M2: re-run part 1 in the batch on each PR's current body.
2. M1: count a fix only on `Fixes:` or a direct "fixes QA-n".
3. m1: refuse a "Claims Works" line that names nothing.
4. m4: a clearer reason line.
5. m8: run the gate on the Mac fallback too.

## Not tested
* An intended user's unaided walk (D17 and D20 stay with the founder).
* Gate A's parser (not on main).
* The CI timing log.
* Packs other than C11.13 and C11.12.

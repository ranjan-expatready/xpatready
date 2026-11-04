# Review: gate B (PR #804, head 844094baa), CI tooling under P-214

The reviewer wrote this independently, 4 Nov 2026, about 08:20–09:10 IST. It covers the whole PR: `git diff origin/main...844094baa`, three files: `studio/tools/gate-b.mjs`, `studio/tools/check-gate-b.mjs`, `.github/workflows/ci.yml`. The TEMPORARY timing step (ci.yml:111-115) is not counted as a defect.

**Verdict: Block.** Two Majors are open. Both are false passes, and a false pass is the worst way a gate can fail.

## What I ran (US$0, no `*_LIVE` set, ports 4431–4432, never 4400)
* `check-gate-b.mjs`: **43 passed, 0 failed**. The real qa/BUGS.md on main has 77 open rows and each has a severity.
* `--plan` across **all 54 packs**: every run line is read, with no left-over port or database name, and the M3 setup is added where it is needed (C7.5, C11.6, C9.2 …).
* Real packs, `GATE_B_PORT=4431 GATE_B_NAME=b1r_gate GATE_B_JOBS=1`, against main's BUGS.md:
  * C11.13 "on the six": exit 0, 15/15, 46 s (copy 5 s, Reset to the six 37 s, run 5 s). Gate passed.
  * C11.12, two packs one after the other, 134 s: C11.12 20/20; C11.12-runtime red "on the six", so the gate refused (see m4).
* Part 1 on all 20 of main's open PRs: none is refused, because none has a `Claims Works:` line yet. #788 (C7.5 "part 1", whole pack) will be refused on red steps unless its body names its steps. That is the agreed rule.
* PR #804's own CI: the gate step was skipped (the PR names no capability, as designed). The timing step ran 08:24:24–08:25:12 IST (48 s for both measure runs). Its log was not readable while the job was still running.
* Clean-up: after `stop`, `xr_studio_b1r_gate0` and `var/isolated-b1r_gate0` were still there (see m2). I dropped both databases and the folders. No listener is left on 4431–4432 and nothing in git is changed.

## Findings

### Major
**M1: a bug is waived when the body only mentions it near the word "fixed", "closes" or similar** (`gate-b.mjs:45`). Any body line that contains fixes/fixed/closes/closed adds *every* QA-id on that line to `fixes`. Reproduced with the real gate:
* body `Claims Works: C11.13` + `QA-192 is not fixed by this PR; it stays open.` gives exit 0 ("says it fixes QA-192"; passed);
* `Claims Works: C11.13 (QA-192 still open, closes nothing)` gives exit 0;
* `Claims Works: C11.13 — QA-192 to follow (see QA-169 fixed)` gives exit 0.

Fail scenario: an honest builder claims Works for C11.13 and writes that the open Major is still open. The gate passes, which is exactly the silent Works the gate exists to stop. The self-check's negative case only passes because "fix" is not in the list (`check-gate-b.mjs:38`).

Fix: count a fix only on a `Fixes:` line, in the title (per the ruling), or where the verb directly precedes the id (`\b(fixes|fixed|closes)\s+QA-\d+`), never after "not", "no" or "n't". Add the three lines above as self-check fail cases.

**M2: a "Claims Works:" line added after CI has run is never checked** (`ci.yml:25-26`, `gate-b.mjs:213`).
* `on: pull_request:` has no `types`, so editing a title or body does not start a new run.
* `check-success = ci` stays green in Mergify (`.mergify.yml` queue_conditions).
* The merge-queue batch skips gate B "since each PR passed it on its own", but the PR never passed it with that body.
* A Major filed in BUGS.md between the PR's run and the batch is not re-read either.

Fail scenario: this is the ordinary order of work. The builder pushes, CI goes green, then the builder edits the body to "Claims Works: C11.13" while QA-192 is open. The PR gets approved and merges with no bug check.

Fix (CI only, no new scope): in QUEUE mode, do not skip. Run part 1 (`--no-packs`, seconds) for each PR in the batch (its number is in the batch title, "merge queue: checking #801 + #789 …"), with its *current* title and body (`gh pr view`, read-only token) and the batch's BUGS.md. The other option is `types: [opened, synchronize, reopened, edited]`, which reruns the whole CI on each edit.

### Minor
* **m1: a malformed "Claims Works" line silently means no bug check** (`gate-b.mjs:39-40`). `Claims Works:` with a list on the next line, `## Claims Works` on its own line, `Claims Works — C11.13`, `Claims Works for C11.13`, a table row `| Claims Works | C11.13 |`, and lower-case `c11.13` all exit 0 with "claims Works for none". Lower case even finds no pack (`packsOf("c11.13")`). Fix: a line starting "Claims Works" that yields no C<n.n> refuses (exit 1, "write it as Claims Works: C<n.n>"); read CAP case-insensitively and upper-case it.
* **m2: databases and working folders leak on a Mac copy** (`gate-b.mjs:199`). `isolated.sh … stop` stops the server only, so `xr_studio_<name><k>` and `var/isolated-<name><k>` stay (confirmed above). #745 (still open) would fix this in isolated.sh. Until then, drop them in `finally`. A cancelled run also skips `finally`, and a SIGKILL on tsx after 900 s can leave its node child running (`:157`).
* **m3: ports grow with the number of packs, not with parallel slots** (`gate-b.mjs:172, 226`). Port = `GATE_B_PORT + k`, where k is the pack's index. On a Mac copy with 5 packs and GATE_B_PORT=4431, it uses 4431–4435. `isolated.sh start` kills any listener on those ports, which can include another builder's copy. Fix: port = base + slot (0 … GATE_B_JOBS-1).
* **m4: the reason line can be meaningless** (`gate-b.mjs:192`). `tail` is the last output line. For C11.12-runtime the gate printed "exit 1 on the six (})". The FAIL excerpt helped, but it was cut off at 160 characters on a psql error. Fix: use the last non-empty line that is not punctuation, or the pack's "n/m passed" line. Note on the same pack: its header says it needs the suites' fixture until J4, so under the ruling ("pack alone → on the six") every PR naming C11.12 is refused. The pack's header or run needs the tech lead's call. The gate behaves as ruled.
* **m5: a step range written with an en dash is refused** (`gate-b.mjs:53`). `steps 1–4` (en dash, the house style) becomes the single label "1–4", so the gate refuses for a missing step. This fails safe but is confusing. Fix: map `–` and `—` to `-`, as `…` already is.
* **m6: steps on a "Claims Works" line narrow the pack** (`gate-b.mjs:41-43`). `Claims Works: C7.5 (steps 1)` runs only step 1 for a Works claim. Gate A (qa's demo-data PASS) still stands, but gate B reads green on part of a pack. Fix: steps count only on a `Capabilities:` line.
* **m7: the gate reads the PR's own copy of qa/BUGS.md** (`gate-b.mjs:204`). The PR can edit its own ledger: status "Done", or severity changed to Minor. A status starting with "Retested" (for example "Retested: still fails") also reads as closed (`:67`). Fix: read `git show $BASE_SHA:…/qa/BUGS.md`, and close only on "Closed", "Fixed and retested" or "Withdrawn".
* **m8: the gate disappears on the fallback runner** (`ci.yml:199` onwards). With `PR_RUNNER=mac` or `BATCH_RUNNER=mac`, the shard job is skipped and the Mac branch of the `ci` job has neither `check-gate-b.mjs` nor `gate-b.mjs`. Fix: add the two lines there too, or note the gap in WAY-OF-WORKING.
* **m9: a BUGS.md typo blocks unrelated PRs** (`check-gate-b.mjs:103-104`). A notes-only PR (BUGS.md is a notes file) can add a row whose severity cannot be read. The next unrelated code or records PR then fails the rules step. This is loud, not a false pass. Run the same parse in the notes job, or let the gate refuse an unknown severity for a claimed capability.

## What holds
* **Env injection is safe.** Title and body come in as `env:`, never pasted into the script (`ci.yml:109`).
* **Step order and conditions are right.** The `if: matrix.shard == 1 && env.KIND == 'code'` condition is correct. The gate runs before the suites, so a red gate saves suite minutes. A non-zero exit fails `shard (1)`, which fails "the parts' result" in `ci` (`ci.yml:193`), which is the check Mergify needs.
* **US$0 holds.** `cleanEnv` removes every `*_LIVE` variable and `ANTHROPIC_API_KEY`. The API reads live flags only from the process environment. Port 4400 is refused.
* **A red pack reads red** in both modes. Exit 2 (setup missing or WAIT) is red. A run timed out after 900 s is red. A header with no readable run line is an error, never a skip. A named step needs a PASS line and no FAIL line under the same label, so C1.6's three AT-1 lines all count. C7.5-1 is not mistaken for C7.5-10.
* **Bug parsing is right:** Minor "(Major if …)" stays Minor, bold severity is read, `C6.x` covers C6.4 but not C16.4, and references after the first "·" are ignored.
* **The idiom fits** the paired-self-check pattern (check-select-suites.sh, check-merge-guard.sh), `GITHUB_STEP_SUMMARY` lines, and exit codes 0, 1 and 2.

## D1–D20 (CI tool: UI dimensions do not apply)
D1 ½ (done-when cases met; M1 and M2 break the bug rule) · D2 ½ (M1, m7) · D3 n/a · D4 1 (all 54 run lines read) · D5 ½ (m2, m3) · D6 n/a · D7 n/a · D8 n/a · D9 1 (refusals say what to do) · D10 1 · D11 ½ (m1 silent, m4) · D12 to D14 n/a · D15 not judged here (the builder's CI measurement is pending; locally 46 s per pack on the six) · D16 ½ (43 cases, but none catches M1, M2 or m1) · D17 and D20 simulated only · D18 1 ("fixture only" label) · D19 ½ (M2).

## Journey score: **7.5 / 10, not a pass** (`screens/gate-b/journey-test-reviewer-2026-11-04.md`)

## Could not check
* Gate A's own parser (not on main), so I could not compare its "Claims Works" syntax with gate B's.
* The CI log of the timing step, and the under-5-minute figure. Both are for the builder to show on #804.
* Packs other than C11.13 and C11.12 against the gate (one at a time, by the brief).
* Repository variables (`gh variable list` returned nothing).

**Block.** To fix before the label: M1, M2.

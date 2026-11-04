# Gate B (PR #804, head 844094baa) — break report

Breaker pass, 4 Nov, about 08:15–08:50 IST. Files: `prototype/studio/tools/gate-b.mjs` (gate), `check-gate-b.mjs`, `.github/workflows/ci.yml` at 844094baa. How I tested: part 1 through the gate's own exports and the CLI with `--no-packs` and fixture BUGS.md files. Part 2 used an unmodified copy of gate-b.mjs in a scratch tree with a stub isolated.sh and tsx and crafted packs on ports 4433/4434, plus one real pack run (C11.13, `GATE_B_PORT=4433 GATE_B_NAME=b1x_gate GATE_B_JOBS=1`). That run ended at 08:28:57 IST and I dropped its database and folder afterwards. US$0, no `*_LIVE`, gate files not edited.

## Blocker

**B1. Ordinary wording counts as "fixes", and real PR text clears two open Majors.** `gate-b.mjs:45` adds every QA-nnn on any line that contains fixes, fixed, closes or closed, whatever the sentence says. `:47` counts every QA-nnn in the title as fixed.
* Input (body): `Claims Works: C11.13` + `QA-192 is not fixed here.` Expected: refuse (QA-192 is Major). Actual: pass, fixes=QA-192.
* The same happens with `This closes QA-150; QA-192 stays open.`, `Known open: QA-192 (to be fixed in a later PR).`, `Was QA-192 closed? No.`, `Claims Works: C11.13 (QA-192 not fixed)`, and a title `forms: C11.13 reason (QA-192 still open)`.
* Real text: I ran `claims()` on #766's title and body. It reads QA-184 (UX · Major on C5.4) and QA-162 (Gap · Major on C4.7) as fixed: "…22/22 twice and QA-197 closed. **QA-184** (UX · Major, open) still names C5.4" and "QA-162 is still Open: "Major (C4.11; C4.7 part fixed…)". Both rows are open in BUGS.md today. Add `Claims Works: C4.7` or `C5.4` to that body and it passes.
* The only negative case in check-gate-b (`does not fix`, check-gate-b.mjs:38) avoids the bug because "fix" on its own is not in the list of words.

## Major

**M1. Named steps ignore the exit code, and an empty step list passes a red pack.** `:42`, `:53-55`, `:194-196`.
* Input `Capabilities: C99.2 (steps ,)` (also `;`): the list becomes `[]`, which counts as true, so no step is checked. The pack exited 1 and printed `FAIL  C99.2-2` (scratch run). Expected: refuse. Actual: "Gate B: passed", exit 0.
* Input `Claims Works: C99.8 (steps 1)`: the pack exits 1 and step 2 does not pass. Actual: passed. A Works claim needs only part of the pack green.
* A pack that exits 2 ("setup missing" / WAIT, pack2.ts:98) after printing its named PASS lines also passes.

**M2. A builder's own branch name turns the gate off.** ci.yml:49 sets `queue=true` for any head ref matching `mergify/*`, and gate-b.mjs:213 then skips. Input: a code PR from branch `mergify/x` with `Claims Works: C11.13`. Expected: checked. Actual: "skipped (merge-queue batch)", exit 0. Nothing guards the branch name (I searched .githooks, tools and workflows).

**M3. The gate's verdict is never re-checked before merge.** ci.yml:25-26 uses `on: pull_request` with the default types (opened, synchronize, reopened), so editing the PR does not re-run CI.
* A body edited to add `Claims Works: C11.13` after a green run keeps its green `ci` check.
* A Major that qa files on main after the PR's run is never seen either.
* The merge-queue batch skips the gate ("each PR passed it on its own", `:213`). So both cases reach main.

**M4. The PR's own BUGS.md is the one that gets read.** `:204` and `:218` read qa/BUGS.md from the PR's checkout. A code PR that also changes QA-192's row to `Closed` or `Gap · Minor` passes. change-kind.sh classifies api code + BUGS.md as `code`, and no guard limits BUGS.md edits to qa.

**M5. The 900 s pack timeout does not stop a pack, so the gate hangs and never cleans up.** `sh()` (`:157`) sends SIGKILL to the tsx wrapper only. tsx runs the pack in a child node process, which survives and keeps the pipe open, so `close` (`:160`) never fires.
* Test: real `node_modules/.bin/tsx` on a script that never ends, SIGKILL after 3 s. `exit` fired, `close` did not within 8 s, and the pack process (pid 96415) was still alive.
* Result: shard 1 runs until its 45-minute limit (ci.yml:64) and shows no gate reason. The `finally` stop (`:199`) never runs. On a Mac the gate hangs for good with the copy still up. The 300 s start timeout (`:175`) has the same weakness.

**M6. Common ways of writing the claim are not read, so the bug check never runs.** Regex at `:39`. Each input below returned exit 0 with works empty (fixture QA-192 open):
* `Claims Works:` on one line with `- C11.13` on the next; `## Claims Works` heading followed by a list;
* `Capabilities: C11.13 · Claims Works: C11.13` (the first keyword wins);
* `Claims Works (after this PR): C11.13`; `Claims Works — C11.13`; `| Claims Works | C11.13 |`;
* `Claims Works: c11.13`: the id is listed among the named capabilities, but the Works check (CAP has no /i) and the pack search both miss it;
* `Capability: C11.13` (singular) with no id in the title: "names no capability", skipped.

## Minor

* m1. The exit code of a setup step is ignored (`:190`). A run line pointing at a missing `studio/tests/missing_setup.ts` logs "exit 1" and the pack still runs; its exit 0 passed. Real packs stop on missing setup (pack1 `stop`, m3.ts:32), so today this is only a gap in the gate itself.
* m2. A whole-pack run that exits 0 passes even if it printed FAIL lines (`:198`; scratch pack C99.1). Today's libraries always set the exit code on a FAIL.
* m3. Cases where the gate could not run exit 1 ("refuses"), not 2: the copy did not start (`:177`) or Reset to the six was refused (`:181`). A signal kill is reported as "exit 1", not 137 (`:160`). It still fails closed.
* m4. Any KIND other than `code` (empty, `Code`) means "skipped", exit 0 (`:204`, `:212`). CI also checks `if: env.KIND == 'code'`, so this matters only off CI.
* m5. BUGS.md rows that are dropped or misread (`:64-70`):
  * a leading space, `**QA-192**` or a linked id: the row is dropped and no check notices;
  * the capability after the "·", in lower case, or written `C11.*`: no capability, so the row never stops anything;
  * `Minor → Major (raised)`: read as Minor;
  * status `Retested 4 Nov: still fails` or `Closed 1 Nov, reopened 4 Nov`: read as closed.
  * The gate treats an unknown severity as not stopping (fail open). CI catches that only through check-gate-b's test on the real file (check-gate-b.mjs:104).
* m6. Every run leaves its database and copy folder behind: isolated.sh `stop` drops neither, and `:199` only stops. My run left `xr_studio_b1x_gate0` and `var/isolated-b1x_gate0`, which I removed. An earlier gate run's `xr_studio_b1r_gate0` and `var/isolated-b1r_gate0` (08:27 IST) are still there.
* m7. Packs write the shared `studio/var/acceptance/<id>.json` (pack2.ts:95). The gate run overwrote this copy's `C11.13.json` at 08:28 IST, and packs running side by side share that folder.
* m8. An en dash range `(steps 1–4)` stays as the literal step "1–4" and refuses (`:53` turns only "…" into "-"). It is too strict, not a false pass.
* m9. On a Mac without GATE_B_PORT, every copy uses 4590+k with the name `gatebK` (`:172`). isolated.sh kills whatever listens on that port, so two copies running the gate stop each other's servers.
* m10. Time risk: one pack on the six took 73 s on the Mac (copy 7, Reset 57, run 9). Shard 1 runs the gate before its suites, under the 45-minute limit. A PR naming 10 fixture packs (up to 15 minutes each, 3 at a time on 2 cores) could crowd out the suites. The temporary timing step measures only C11.13 and C11.10.
* m11. A "Fixes:" line is taken at its word: the gate cannot tell whether the bug is fixed. This is how the gate is designed; noted only because B1 makes it easy to trigger by accident.

## What held

* Injection: a title of `$(touch /tmp/pwn) \`id\`` and a body containing `"; exit 0; #` are inert. Title and body arrive as env values (ci.yml:109); every child process gets an argument array and no shell. /tmp/pwn was not created.
* Line forms that are read: CRLF, NBSP, `Claims  Works`, bold, heading, `>` quote, list bullet, a trailing dot `C11.13.`, an id inside a code fence (too strict, not a pass). Lookalikes (Cyrillic С, zero-width space, fullwidth colon) are not read as an id; a person would not read them as one either.
* Capability matching: word boundaries (C11.1 is not C11.13); `C6.x` covers C6.4 but not C16.4; capabilities after the "·" are not counted; Minor-with-"Major if" stays Minor; bold severity is read; a pipe inside a cell or an escaped pipe, a row without a trailing pipe, CRLF rows.
* Steps: `5-1`, `1-500` and `-` are not expanded and refuse; 1-99 is the cap. `C7.5-1` does not match `C7.5-10` or `1x`. A FAIL line labelled for the step wins over an echoed PASS.
* Whole packs: exit 1, exit 2, a crash before any output, and SIGKILL all refuse.
* Couldn't-run inputs exit 2: `GATE_B_JOBS=abc` (TypeError); a missing `--body-file` or BUGS.md; an unknown option. Port 4400 is refused (`:173`).
* Run lines: all 54 capability packs give a plan; every step gets the gate's own port and database; every script exists.
* Ports: in CI the gate uses 4590+k, one per run. Suites use up to 4581 and start only after the gate, so no clash.
* Real run: C11.13 on the six, exit 0, 15/15, 73 s. The server stopped and port 4433 was free.
* check-gate-b: 43 passed, 0 failed. The real BUGS.md: 77 open rows, all with a severity, 16 that stop a Works claim. The 2 with no capability (QA-181, QA-201) are tooling rows.

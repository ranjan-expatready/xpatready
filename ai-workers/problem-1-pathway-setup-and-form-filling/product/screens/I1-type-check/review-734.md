# Review: I1 type check, fix for file-less tsc errors (PR 734, commit 9570b208e)

Not a screen: a tooling change with no UI, so the journey test and the browser walk do not apply. Journey score: not applicable.
Graph, concept fit, D1–D20 and the words check: not applicable (no screen, no route, no capability).

## The ask, checked
- If tsc exits non-zero and no file-located error was counted, the check exits 2: met at `typecheck.mjs:37-43`. Each project gets its own check, so one bad project stops the run.
- An "error TS" line with no file is a new error: met at `typecheck.mjs:34,62-65`. `--write` refuses it (`:49`).
- `--write` only removes lines, counted as a multiset: met at `typecheck.mjs:51-53`.
- Fail cases TS5058, TS18003 and TS2688: covered in `check-typecheck.sh:25-30`, plus mixed projects, TS2688 alongside a file error, and a bad option (TS5023).
- ci.yml: the new step runs before the real check. Under `bash -e` the job fails if it fails, `needs.types.result != success` makes `ci` fail (ci.yml:178), and `exit ${PIPESTATUS[0]}` keeps the exit code through `tee`.

## Ran (exit codes)
- `bash product/tools/check-typecheck.sh`: 11 passed, 0 failed, **exit 0**.
- `node product/tools/typecheck.mjs`: api 15 errors in files (tsc exit 2), web 0. PASS, 15 known, 0 fixed. **Exit 0**.
- Tried to break it with throwaway tsconfigs, run through `--project/--known`:
  - `files: []`: TS18002 is reported at tsconfig.json(1), so it is located. Exit 1 (a new error). OK.
  - `extends` a missing file: TS5083 with no file, plus the a.ts error. Exit 1. OK.
  - A path with parentheses, `(group)/a (1).ts`: parsed correctly. Exit 1. OK.
  - Solution-style `{"files":[],"references":[...]}` with a broken file in the referenced project: tsc exit 0. **PASS, exit 0**.
  - An include that matches only `env.d.ts`: tsc exit 0. **PASS, exit 0**.
  - `"noCheck": true` with a broken a.ts: tsc exit 0. **PASS, exit 0**.
- With a fake tsc (a copy of the script whose `node_modules/.bin/tsc` is a bash stub):
  - Out of memory (exit 134, FATAL ERROR on stderr): exit 2. OK.
  - A JS crash stack, exit 1: exit 2. OK.
  - tsc not executable (spawn error): exit 2. OK, but the log says "exited null".
  - Windows CRLF output `C:\w\src\a.ts(3,5): error TS…` plus `error TS5058`: path normalised, `\r` trimmed. Exit 1. OK.
  - One located error printed, then `kill -9`, with that error in the known list: **PASS, exit 0**.
  - `--write` with the same error twice: 1 known line gives exit 1 (refused); 3 known lines write 2 (exit 0); a missing known file is refused (exit 1). OK.

## Findings
No Blocker, no Major.

**Minor 1: tsc checks no source file yet exits 0, and the check PASSes.** The PR asked about the non-zero case and meets it. The same
failure class (a tsconfig edit that leaves the project unchecked and goes green) still passes in three reproduced shapes:
- a solution-style tsconfig, which is the Vite template's default;
- `include` that matches only `.d.ts` files;
- `"noCheck": true`.
Fix, at `typecheck.mjs:31-37`:
- Add `"--noCheck", "false", "--listFiles"` to the tsc arguments. A command-line flag overrides the tsconfig; verified on tsc 6.0.3, where `nocheck/a.ts` then reports TS2322.
- Count the listed files that end in `.ts`/`.tsx`, are not `.d.ts` and are not under `node_modules`.
- If that count is 0, set `couldNotCheck`. Verified: solution-style lists 0 such files and `.d.ts`-only lists only `env.d.ts`.
- Add these three cases to `check-typecheck.sh`. The error regex is unaffected because `--listFiles` lines contain no "error TS".
Cheap enough to fold into this PR; otherwise name it in the PR text as the next I1 item.

**Minor 2: tsc killed by a signal after printing some errors is treated as a full run** (`typecheck.mjs:37`). `r.status` is null,
`located.length > 0`, so the gate falls through. If every printed error is known, the run PASSes (reproduced: SIGKILL, exit 0). tsc prints
its diagnostics at the end, so this is unlikely, and the same applies to `r.error` ENOBUFS past the 64 MB maxBuffer. Fix: change the
condition to `if (r.signal || r.error || (r.status !== 0 && located.length === 0))`, and print `r.error?.code` in the log line (`:35,39`)
so the spawn-error case does not read "exited null".

**Nit:** `--project` given without a value crashes on `undefined.split` (`:22`) with node's exit 1 rather than 2. This only affects tool use.

## Not checked
The workflow was not run on GitHub; I read the needs/if logic only. I did not run on Windows: the CRLF and backslash
handling was checked with stubbed output.

**Verdict: Approve.** No open Blocker or Major. Minor 1 is recommended in this PR or as the next item; Minor 2 is a one-line hardening.

## Round 2 (P-293, diff only: `9570b208e..53372050e`)
Ran:
- `bash product/tools/check-typecheck.sh`: 14 passed, 0 failed, **exit 0**.
- `node product/tools/typecheck.mjs`: api 391 sources, 15 errors in files; web 106 sources, 0. PASS, 15 known. **Exit 0**.

Round-1 repros re-run on 53372050e:
- Solution-style `files: []` + references: STOP, exit 2.
- `.d.ts`-only include: STOP, exit 2.
- `noCheck: true`: TS2322 reported, exit 1.
- A `.tsx`-only project counts as a source (exit 1 on its error).
- Fake tsc printing a known error then SIGKILL: STOP, exit 2 (was PASS).
- Spawn error: exit 2.

Minor 1 and Minor 2 are fixed (`typecheck.mjs:31-42`), and the three new self-check cases cover Minor 1.

New, Nit only:
- `typecheck.mjs:36`: the source test `^\/` counts only POSIX absolute paths. On Windows tsc lists `C:/…`, so every project
  would read 0 sources and stop with exit 2. That fails closed and CI and the Mac are POSIX. Fix if Windows ever matters:
  `/^(\/|[A-Za-z]:[\\/]).*\.(ts|tsx|mts|cts)$/`.
- `typecheck.mjs:44` (the STOP excerpt): with `--listFiles`, the first 10 lines are often lib `.d.ts` paths rather than the reason, and a spawn
  error still logs "exited null". Fix: drop the list lines from the excerpt, and print `r.error?.code ?? r.status ?? r.signal`.

**Verdict (round 2): Approve.** No open Blocker, Major or Minor; two Nits, both optional.

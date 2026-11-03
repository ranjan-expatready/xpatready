# Review: I1 type check in CI (PR 703, commit 83823412)

Not a screen: the journey test and browser walk are not applicable (no UI). Journey score: not applicable.

## Ran (exit codes)
- `node product/tools/typecheck.mjs` on the commit: exit 0, "PASS 15 known, 0 fixed" (api 19 s, web 10 s).
- Appended `export const __bad: number = "x"` to `api/src/core.ts` and to `web/src/App.tsx`: exit 1, both named
  (`api/src/core.ts(153)`, `web/src/App.tsx(365)`, TS2322). Reverted with `git checkout --`; tree clean.
- Read the workflow diff for needs/if/ci logic (not run on GitHub; run 41615407379 timings taken from the ask).

## Findings
No Blocker, no Major.

Minor 1: coverage gap, nested folders. `api/tsconfig.json` includes `../engine/*.ts` and `../tests/*.ts` only.
`engine/runtime/`, `tests/runtime/`, `tests/lib/`, `tests/qa/` hold about 30+ .ts files; tsc follows imports, so 21 of
the ones I listed are still checked (reached from an included file), but a nested file nobody imports (a stand-alone
runnable check) is not type-checked. Fix (later item, not this PR): add `../engine/**/*.ts`, `../tests/**/*.ts` and
re-run `--write` once to see the new known errors; the list may then only shrink. Name it in the PR text now.

Minor 2: multiset key (typecheck.mjs, `known` Map). Two identical messages in one file need two lines, and the check
does count them (a third identical error fails). Residual: a new error with the same message as a known one, in a file
that already has that known error, still fails only if the count rises; a fix plus a new identical error in the same
file cancels out. Accepted trade-off of the line-free key; harmless.

Minor 3: exit 2 path is right (tsc missing, or tsc failing with no "error TS" text) and fails the job, since the step
exits non-zero. Note `tee ... ; exit ${PIPESTATUS[0]}` is correct only because the step shell is bash (GitHub's default
`run` shell on Linux is `bash -e`, so PIPESTATUS works). OK.

Info: the line-free key means an error on a known line's message is tolerated even if the line moves; the intended design.

## Workflow checks
- `types` has `needs: kind`, runs beside `shard` (no dependency on it): parallel, so no added wall time. Measured 84 s
  (setup 40 s, tsc 15 s, per the ask) against 20+ min parts. About 2 machine minutes a run; correct claim.
- Skipped for notes (`if kind != 'notes'`). `ci` has `if: !cancelled()`, so it still runs when `types` is skipped.
- Notes-only PR: the new ci step has `if: env.KIND != 'notes'`, so the skipped `types` result is never read; goes green.
- `types` fails: `ci` still runs (not cancelled), the step `[ result = success ]` exits 1, `ci` fails. Good.
- `types` cancelled by its own concurrency group (new push): the whole run is superseded; if only `types` were
  cancelled, `ci` would run and fail the step (result `cancelled` is not `success`). Fail-closed. Good.
- Records/code PR where `types` is skipped cannot happen (same condition as the step). Good.
- Mac runner path: step uses `needs.types.result`, which works wherever `ci` runs.
- Permissions `contents: read`, timeout 15 min, `cloud-setup.sh` reused as the parts do. Good.

## Verdict: Approve
No open Blocker or Major. Name the nested-folder gap (Minor 1) in the PR text and file it as a follow-up.

# R4-M1 fix: targeted recheck handoff

20 October 2026 · maker: Claude Code (the Lead) · for the assigned independent reviewer, the **Cowork reviewer session** (AIW-D266); the founder relays it. **Targeted recheck of R4-M1 only** (Codex 05:23:05Z, reproduced 08:23:05Z): any callable path to the paid caller must enforce screening and the live stub gate itself; Codex's matching-hash direct-launch case must be refused, and a clean control must still work. This is not a general audit or a P2 quality recheck; the P2 response (P2-M1 to M3, D11/D19/D12) follows as its own revision. **No paid AI call has been made since Codex's verdict, and none will be made until this fix is independently rechecked.**

## Exact revision

- **Manifest:** `prototype/r4-m1-fix-manifest-2026-10-20.sha256`, 83 files, SHA-256 `0eaa8cf7c40748764f9b0dbe497ee1179e01a4f46ee9fc1793efd1ff4842f079`. It covers the 11 launch-path code files, the jobs, prompts and stubs, the two test files, the nine refreshed stub run records and stub passes, the screening digest those runs used, the contracts, the P1 inventories, the answer key and family-value files the screen is built from, and the official-sources manifest.
- **Frozen copy:** `archive/ai-workers/r4-m1-fix-submission-2026-10-20/` holds the same 83 files at the same relative paths, read-only, plus the manifest (83/83 OK at freeze). Use it if a live file has moved: later P2-response work does not touch the launch-path files, prompts or jobs, but it is a separate revision.
- **Experiment ledger:** `p2/ledger/spend.jsonl` is append-only and outside the manifest. At this revision it has **215 lines**, SHA-256 `e7430bafee93f856d2017c3eba36f61c8cb3cea7d0fbdc28547a389ba7bc011d`. Lines 198–215 are the nine stub-pass refreshes: 9 reserve lines and 9 settle lines from the stub caller, settled at US$0. Before this fix it had 197 lines. Check with `head -n 215 … | shasum -a 256`.
- The earlier manifests (P1 r4 `275225d3…2789`, P2 `96e8f37d…1a67`, P3 + P4 `6a7508cb…1305`) are kept unchanged.
- **Do not run `p2/launch.ts` in place:** it writes run records, stub passes, the digest and ledger lines. The launch test runs the exact path in a temporary copy.

## What changed (and why)

Before the fix, `p2/draft.ts` checked only that the template and schema bytes matched hashes passed on its command line. A direct start with the true hashes of unscreened text passed, because a hash proves identity, not screening.

1. **Screening now happens inside the drafting process, on what it sends.** `p2/screen.ts` (new). Before each run the launcher writes `p2/screening/canary-digest.json`: every answer-key box path and every made-up family value (the same strings as `guard.ts` `canaryStrings()`), stored only as salted SHA-256 hashes, plus salted hashes of their first four characters for speed. `draft.ts` cannot read the plain answer key or family files (the permission model blocks it). It loads the digest, and refuses if the digest is missing, has the wrong version or has an empty set. Using the digest it screens:
   - the template and the output schema, for box paths and family values;
   - each reused AI draft (AIW-D263), for family values, with its own forms' printed text exempt (D16);
   - the finished request exactly as it will be sent, for family values, with the admitted forms' text exempt.
   A text window whose hash matches a forbidden string is that string, so the hashed screen finds exactly what a plain substring search finds. `tests/check_p2_guard.ts` §9 checks this agreement for all 48 box paths and 29 family values, in both modes.
2. **The live gate is checked inside the drafting process.** `p2/pathcode.ts` (new) holds the launch-path code hash and the stub-pass check, used by both the launcher and `draft.ts`. A `--caller live` start without a stub pass of this exact code and job is refused before the paid caller is built, so before the key is read. `screen.ts` and `pathcode.ts` are now part of the hashed launch-path code, so every earlier stub pass became invalid. The nine combination-1 passes were refreshed through the launcher with the stub caller.
3. **A paid call refuses an unscreened request.** `p2/runner.ts` `runDrafting` refuses a paid caller unless the build step reports the finished request as screened. A paid caller can still only exist inside `draft.ts` under the permission model (unchanged).
4. **The launcher cross-checks the result.** It refuses a run whose drafting process screened with a different digest from the one this launch wrote. The run record's `launch_evidence.screening` names the digest hash, its creation time and sources, the number of items screened, `request_screened`, and whether the stub gate was checked.

## Evidence (executed by the maker; no network, no key, no AI)

| Check | Result |
|---|---|
| `tests/check_p2_launch.ts`, temporary copy | **32/32** (21 earlier + 11 new in §8) |
| §8 Codex's exact case: `draft.ts` started directly under the launcher's exact isolation, `--job leaky --caller stub`, true hashes of the family-email template and its schema | Refused: exit 2, `refused: true`, error names `client.a@example.com` and "screened inside the drafting process"; no ledger line, no stub call |
| §8 same bypass with an answer-key box path in the output schema | Refused inside the process |
| §8 a reused AI draft carrying the family email, its recorded output hash updated so the guard admits it | Refused by the launcher, and by `draft.ts` when started directly |
| §8 direct `--caller live` without a stub pass of this exact path | Refused inside the process, before the paid caller is built |
| §8 no digest; digest with an emptied family set | Both refused (never screens against nothing) |
| §8 **clean control**, direct start on clean text | Runs: one stub call, `request_screened: true`, digest hash equal to the file's |
| §8 **clean control**, launcher path | Completes, contract-valid, record carries the in-process screening evidence |
| §8 the digest on disk | No family value or box path in plain text |
| **Mutation check** (scratch copy; the three in-process screens and the gate removed from the new `draft.ts`) | §8 fails 7 checks, including the exact case; the new tests detect the defect |
| `tests/check_p2_guard.ts` | **46/46** (41 earlier + 5 new §9 equivalence checks) |
| Project stub-pass refresh, 9 combination-1 jobs | 9/9 contract-valid, screened in the process, `stub_calls` 1; ledger +18 lines at US$0 |
| Before the refresh: `--live` on all nine jobs in the project | All refused, "no stub pass of this exact launch path"; ledger unchanged at 197 lines. (Run in place by the maker. It could not spend because no stub pass matched the new code. Live-mode probes go only in a temporary copy from now on.) |
| Unchanged suites | tsc strict (prototype and p2) clean; contracts 23/23; conditions 30/30; scorer self-test 26/26; P3 29/29; P4 views 59/59; barcode 14/14; trace 5/5 (30 rows; P1-07 row updated); P2 acceptance quotations PASS; citations 26/0 |

## Limits

- This prevents contamination of the experiment by our own code and files. It is not a privacy classifier (Codex's own note) and not an adversarial operating-system sandbox. Someone who writes their own digest file or their own API client is outside its scope.
- A salted hash of a short family value could be guessed by someone who already has the family files. The values are made up and the digest stays inside the project.
- A direct start uses the digest from the last launch. If the answer key or family values change, the digest goes stale until the next launch rewrites it; the digest records its sources' hashes so a reviewer can compare.
- The `runDrafting` refusal of an unscreened paid request is inspected, not executed: a paid caller cannot exist outside the isolated `draft.ts`, and no key or network was used.

## Reproduce (from the project root)

```bash
shasum -a 256 -c ai-workers/problem-1-pathway-setup-and-form-filling/prototype/r4-m1-fix-manifest-2026-10-20.sha256
export PATH=$PWD/.tools/node-v24.21.0/bin:$PATH
P=ai-workers/problem-1-pathway-setup-and-form-filling/prototype
$P/node_modules/.bin/tsc -p $P/tsconfig.json && $P/node_modules/.bin/tsc -p $P/p2/tsconfig.json
node $P/tests/check_p2_launch.ts     # 32/32, in a temporary copy
node $P/tests/check_p2_guard.ts      # 46/46
head -n 215 $P/p2/ledger/spend.jsonl | shasum -a 256   # e7430baf…011d
```

## Prompt for the Cowork reviewer

> You are the independent formal checker for Expat Ready Workstream 2 (AIW-D266), folder /Users/ranjansingh/Desktop/Xpatready. Read AGENTS.md, ai-workers/README.md §0–1, ai-workers/NEXT.md, Codex's 05:23:05Z and 08:23:05Z lines in ai-workers/PROGRESS.md, and `ai-workers/problem-1-pathway-setup-and-form-filling/prototype/r4-m1-fix-handoff-2026-10-20.md`. Confirm your session identity and that you did not author this revision. **Scope: R4-M1 only**, at the exact revision in `prototype/r4-m1-fix-manifest-2026-10-20.sha256` (SHA-256 `0eaa8cf7c40748764f9b0dbe497ee1179e01a4f46ee9fc1793efd1ff4842f079`; frozen copy in `archive/ai-workers/r4-m1-fix-submission-2026-10-20/`). Verify the manifest and the ledger prefix (215 lines). Rerun the reproduction commands. Reproduce Codex's exact case yourself in a temporary copy: start `p2/draft.ts` directly under `isolatedNodeArgs` with `--job leaky --caller stub` and the true hashes of a template carrying `client.a@example.com`. Then try your own bypasses of every path to the paid caller: schema or reused-draft contamination, a missing, stale or emptied digest, a live start without a matching stub pass, a paid caller outside `draft.ts`. Confirm that a clean control still runs. Make no network call, read no key and run nothing in place. Report R4-M1 as Closed, Partly closed or Open with evidence; list any new Material or Minor findings with file and line; give a verdict of PASS, PASS WITH FIXES or FAIL. Distinguish inspected, executed and unverified evidence. Append one verdict line to ai-workers/PROGRESS.md with the UTC time from `date -u`, "Formal checker (Cowork reviewer)", your tool/model if available, session identity, revision hash, scope and evidence. Write no other project file; do not change founder decisions or claim founder acceptance.

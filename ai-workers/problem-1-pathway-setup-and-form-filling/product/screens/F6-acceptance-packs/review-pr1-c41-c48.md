# Review: PR1 C4.1 and C4.8 to the P-279 source gate (commit e57b256e)

Scope checked: `git diff 877acf66..e57b256e` (3 files, all under `S/acceptance/`). Ports: 4477 only, US$0, no STUDIO_*_LIVE.
Journey-test score: 8/10, applied loosely. This is a test-only change, so I scored the packs as tests: they follow what an author does (answer each number on the Source panel through the API, then Submit) and they check the refusal in words. I lost points because the refusal is not exercised on Visitor visa, and for the unrelated C4.1 failure there.

## Results (fresh copy before each run)
| Pack | Combination | Result | Exit |
|---|---|---|---|
| C4.1 | wp.family | 18/18 | 0 |
| C4.8 | wp.family | 12/12 | 0 |
| C4.1 | Visitor visa (after setup_visitor_visa) | 17/18, FAIL "a fact the passport supplies is not asked of the principal in the SQR" (found `[]`) | 1 |
| C4.8 | Visitor visa | 11/11 | 0 |

(An earlier C4.8 run on a reused copy, after C4.1 had already sourced the numbers, gave 11/11 with the refusal NOTE. That is expected; it is why a fresh copy is needed.)

## Findings

### Blocker
None.

### Major
None caused by this diff.

### Minor
1. `acceptance/C4.1.test.ts` on Visitor visa fails one assertion, the passport-supplied fact in the SQR. The assertion is untouched by this diff and has nothing to do with sources: the move-line assertion that the re-test reported now passes there. The failure is a separate gap (data or setup on Visitor visa). I did not run it on main, so I did not confirm that it already fails there. The builder should report it as an existing, unrelated failure and not hide it.
2. `acceptance/lib/pack2.ts` (new `sourceGate`): when `held_back` is 0, the refusal check is skipped with only a NOTE line. That is visible and honest (it happens on Visitor visa, 8 numbers, 0 held back, and on a reused copy). But the P-279 refusal is then not tested on that run, so exit 0 does not prove the gate. The wp.family runs do test it (17 numbers). Acceptable; worth knowing.
3. `acceptance/C4.8.test.ts` header comment: "refuses Submit and release", but only Submit is checked. Say "Submit".
4. Refusal check soundness: `r.status >= 400 && /no source entry/.test(words(r))`. The message is specific to the gate ("17 numbers have no source entry"), so it cannot pass on an unrelated 4xx. Sound. It is run before the answers are written, so a refusal here cannot be a leftover of an earlier step.

## Questions in the brief
- Changes only what P-279 changed: yes. The only additions are the gate call before each Submit, the header comments, and the helper. No app code.
- Assertions loosened or removed: none. The diff is additions only (+ one export and one import), and every existing `ok(...)` is unchanged, including the "names the move as one change line" and the release assertions.
- Helper change and the 3 suites that import `pack2.ts` (c36, c34, c1113): they now load `source-every-number.cjs` at import and get an extra unused `sourceGate` export. None of them calls `sourceGate`. Nothing else in `pack2` changed (the `done` and `ok` logic, exit codes and return fields are unchanged apart from the added key). Low risk. I did not run those suites (the builder is running the full suites).
- Comments: accurate except item 3. The helper comment says outside the demo workspace a Sample entry does not pass (P-279), which matches P-279 and the fixture (it skips `sample` entries and writes "None published").

Verdict: Approve

# B170c review: one adapter to the XFA engine and its switches (forms lane, PR #1692)

Reviewer: a fresh session that did not build this row, 13 Nov 2026. Commit reviewed: **5f9b8a03fb85d657229820ba4557e258e17be1af**
(branch `claude/fervent-dijkstra-bo1vh7`; PR diff `origin/main...5f9b8a03f`: 5 files, +415, no deletions).
The bar: analysis §4.1 "B170c" and §4.2, writer trial §7, and the row's rules. This row has no screen and no concept, so the screen-review
skill applies only where it fits (as in B178). Live AI off, US$0. Node 24.21.0. Isolated copy `b170c_rev` on :4452 (forms ports), never :4400.

## What I ran
1. `tsx --tsconfig api/tsconfig.json tests/check_b170c_xfa_adapter.ts`: **exit 0, 31 passed, 0 failed** (blank IMM 5257 took 2,495 ms).
2. `tsx --tsconfig api/tsconfig.json tests/check_b164_no_engine_keys.ts`: **exit 0, 59 passed, 0 failed** (225 engine files, 2 adapter files, 5 box paths).
3. `typecheck.mjs`: PASS, no new errors (15 known). `graph.mjs --check`: exit 0. Isolated copy: `/api/health` 200, sha 5f9…; stopped.
4. Probes (scratchpad, nothing committed): time limit 400 ms + `pgrep`; a byte-changed IMM 5257; 4 calls at once; strict runs; 9 guard probes.

## Done when, line by line
| Line | Result | Evidence |
|---|---|---|
| Made-up form: "not complete" with its own first box and message | Met | `stops_at` `…Details[0].Name[0]`, "Name is required" |
| Blank IMM 5257: the same | Met | `stops_at` `…ServiceIn[0].ServiceIn[0]`, the form's "must contain a value … I want service in", 5 pages; IMM 1295 also stops at ServiceIn |
| Refused form: `not available` with reason, exit 0 | Met | IMM 1294 → `UNSUPPORTED_FEATURE` "… picture category "zero" …"; the child exits 0 |
| No form number or box name in adapter or engine (guard extended) | **Partly** | Form numbers: well covered. Box names: only the 5 descriptor strings (Major 2) |
| Every switch off → app as today | Met | No app file in the diff; health 200; no app file imports `engine/xfa/` |
| Rules: <800 lines; no `schema.prisma` / `case-prepare.ts`; no new explicit `any` | Met | 415 lines; neither file touched; `any` grep on the diff empty |
| Every rule with a passing and a failing test | Partly | The `passes` answer is tested only on a hand-made raw object (Minor 2) |
| A wait a test relies on fails loudly | Met | Adapter timer → `TIME_LIMIT`; `spawnSync` 60 s fails its check; the npm build throws |

**The builder's question:** keep `samples/xfa-forms.json` for this row (the rules forbid `schema.prisma`; §4.2 (7) allows data beside
the fill-trial record); Minor 1 is about the lookup key, not the file. **Switches:** the app has no feature-switch list (`api/src/features.ts` registers Nest modules), so a frozen constant is acceptable.
P-520 (6) ("no switch of ours") is about the private copy, not this repository.

## Issues, ranked
**Major 1 (Must): the engine runs in non-strict mode, so it can return `passes` or `stops_at` after silently skipping script it does not model.**
`engine/xfa/run-engine.mjs:43` calls `createFormRuntime` without `strict`, and the engine's default is `false`
(`packages/xfa-engine/src/runtime/options.ts:77`: "Default false: record it and carry on"). In that mode, a form script that touches an
unsupported member gets `undefined` and keeps running (`src/script/prelude.ts:83-86`). The child never reads `runtime.unsupported`
(`run-engine.mjs:51-54`), so the adapter answers as if the run were whole. The team's own real-form tests run with `strict: true` and
assert `unsupportedAfterValidate: []` for IMM 5257 (`src/__tests__/corpus/form-cases.ts:117-120`), so non-strict answers fall outside
their tested boundary. That breaks §4.2 (4): "fail closed, say why … never as a pass". I measured `strict: true` on the three Done-when
forms: they give the same answers, so the fix costs nothing there.
Fix: pass `strict: true`, so `UNSUPPORTED_MEMBER` → `refused` → `not_available` with the reason (or map a non-empty
`runtime.unsupported` to `not_available`). Add a failing test, for example a made-up form built with the engine's fixture builder whose
Validate script touches an unmodelled member, which must come back `not_available`.

**Major 2 (Must): the box-name half of the extended guard catches only 5 exact strings and does less than its own comment claims.**
`tests/check_b164_no_engine_keys.ts:306` says the set holds "each path's dotted parts of two or more names", but `boxNamesOf`
(`:307-311`) adds only the whole descriptor values. One-word boxes count only as a whole string (`:320`). My probes on engine source
that were **not caught**: `"PersonalDetails.ApplicationValidatedFlag"`, `"ButtonsHeader.ValidateButton[0]"`,
`"Page1.PersonalDetails.ServiceIn"` (a real IMM 5257 box) and `"xfa.form.form1.Barcodes"`.

The Done-when line is "no … box name appears in the adapter or the engine", and 5 strings make that close to trivially satisfied. The
engine's own fixtures already list the two forms' real boxes (`src/__tests__/fixtures/form-data/imm5257.synthetic.json`,
`imm1295.synthetic.json`): 318 dotted sub-paths, and the engine source holds **0** of them today.
Fix: build the set from the descriptors plus those fixture keys, adding every dotted suffix of two or more parts as the comment says.
Count a one-word recorded box as a whole SOM segment. Add a failing case for a sub-path.

**Minor 1 (Should): the default lookup hashes the given file, so a written copy finds no descriptor and gets a false reason.**
`engine/xfa/index.ts:132-135` looks up `sha256(file)`. A copy of IMM 5257 with one byte appended came back `reads`, "no descriptor of its
own Validate is recorded for this edition" (`:117`), which is untrue: the edition has one. It still fails closed, but B170e/f will ask
about written copies. Look the descriptor up by the edition's official-file SHA (the record has it) and say so in the JSDoc, or word the
reason "for this file".

**Minor 2 (Should): the `passes` path through the child is never run.** `run-engine.mjs:52-54` (Validate complete → barcodes) is
exercised only through `answerOf` on a literal (`tests/check_b170c_xfa_adapter.ts:107`). Fill the blank IMM 5257 with the engine's
`imm5257.synthetic.json` in the suite, save it, and expect `passes` with 5 non-empty texts.

**Minor 3 (Should): every engine exception reads "the engine cannot read this form yet"** (`run-engine.mjs:21,58`, `index.ts:119`). That
includes a bad descriptor in our own data, and `xfaFormRecords` casts without a shape check (`index.ts:98`). Name a bad record as ours.

**Minor 4 (Should): `passes` accepts an empty or all-null barcode list, and `barcodesValidated` is dropped** (`index.ts:113`,
`run-engine.mjs:54`). Hand both to the caller, or make an empty set `not_available` for barcode texts.

**Minor 5 (Should): the switch-off check stops checking once any switch is on** (`check_b170c_xfa_adapter.ts:55`: `names.some(on) ||`).
Its import regex also misses `.js` specifiers and `require` (`:52`). This is fine for this row (no caller). Rows d and f should replace it
with a per-call `xfaOn` check.

**Minor 6 (Lead's file): a PR that changes only `packages/xfa-engine/src` selects neither guard suite.** In
`product/tools/select-suites.mjs:386` a path outside `prototype/` returns `{}`, so a form number added by an engine patch (B170g, P-470)
is caught only in the merge queue or the nightly run.

**Minor 7: stdout is decoded chunk by chunk** (`index.ts:144`). A multi-byte character split across chunks becomes U+FFFD and still
parses. Use `child.stdout.setEncoding("utf8")`.

**Held under probing:** at the time limit the child is killed (`pgrep` finds no `run-engine.mjs` at once or 3 s later); 4 calls at once
each get their own correct answer (4.9 s); unbuilt engine, missing file, unreadable records and a wrong descriptor are each
`not_available`. For GitHub's Linux runners: the blanks and the made-up form are tracked in git, `npm ci` uses the package's own
lockfile, Node comes from `.nvmrc`, and `dist/` and `node_modules/` are gitignored.

## D1–D20 and BIC
- **Applicable:** D1 Partly (Major 2) · D2 Met (read-only, nothing written) · D5 Met (never throws, child killed at the limit) ·
  D15 Met (~2.5 s per call, 20 s limit) · D16 Partly (Minor 2; suites rerun by me on the exact commit) · D18 Partly (Major 1).
- **N/A:** D3, D4, D6–D14, D17, D19 and D20 (no screen or content; D17 and D20 stay with the founder), and BIC-01–20 (not case-side).
- **Journey score:** 8/10, a pass (`journey-test-reviewer-2026-11-13.md`).

## Could not check
The full PR check on GitHub (the PR is a draft; only "guard" ran, green; I ran the suites on Linux with the same Node); a form whose
script actually hits an unsupported member (Major 1 rests on the engine's documented behaviour and tests); the other refused editions.

Blockers: none. Majors: 1 (run-engine.mjs:43, non-strict engine and `unsupported` dropped); 2 (check_b164_no_engine_keys.ts:306-311,320, box-name guard covers 5 strings and not the sub-paths it claims).
Minors: 1–7 above.
Verdict: Changes requested

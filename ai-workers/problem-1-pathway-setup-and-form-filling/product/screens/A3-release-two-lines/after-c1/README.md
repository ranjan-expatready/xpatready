# Row A3 after C1 (#1180): `main` 4a7e3107 merged once, C1-8's hand-worked answer updated, 7 Nov

**Why.** #1198 left the merge queue (batch 23113b92e5, run 42340383765, shard 6). `check_m3_c1_expected_lines.ts` C1-8
failed twice. C1's hand-worked answer for release 2 was written before row A3: its comment said Schedule 1 and IMM 5645
"keep no signer", and it expected `IMM 5257 SCH1 PDF_UPLOAD/NONE` and `IMM 5645 PDF_UPLOAD/NONE`.

**Ruling (tech lead, Lead 26, on #1198):** match the answer to release 2 as A3 defines it, only if A3's lines are the
row's intended lines, and never loosen the check.

**A3's lines are the row's intended lines.** Row A3's Change: "IMM 5645 signed by the person; how IMM 5645 and Schedule
1 are signed". Its Done when: "on a filled family case no 'missing signature' warning names a line whose signing the data
sets".

**What changed in the check**
* `RELEASE2_LINES` (the configuration C1-2 feeds the helper): IMM 5645 gains `signed_by: "person"` and
  `signature: "TYPED_NAME"`; Schedule 1 gains `signature: "TYPED_NAME"`.
* `R2_ADULT` (the expected lines): `IMM 5257 SCH1 PDF_UPLOAD/TYPED_NAME by person` and
  `IMM 5645 PDF_UPLOAD/TYPED_NAME by person [family]`.
* The comments say where these come from.
* The comparison (`diff`, exact, sorted, with counts) is unchanged.

**Runs** (fresh isolated copies, live AI off, US$0):

| Check | this branch | `main` 4a7e3107 |
|---|---|---|
| `check_m3_c1_expected_lines.ts` with the new answer | **13/13, exit 0** | **exit 1**: only C1-8 fails, because `main` has no A3 lines, so the check still catches them missing |
| `check_b104_checkpoint.ts` | 15/15, exit 0 | — |
| `check_c10_1_configured.ts` | 48/48, exit 0 | — |
| C10.1 (M2) | 28/28 | 28/28, no step differs |
| C7.6, C11.6, C8.1, each alone on a fresh checkpoint | 15/25 · 9/14 · 14/14 | the same; no step changes (`rundiff.txt`) |
| J-A3 walk at 1440 px (`../walk/`, re-run) | 6/6 steps and 2 notes, 0 errors, exit 0 | — |

**C7.6's `missing_signature` warnings** at steps -5 and -12 together: 5 on `main`, 1 here. That is 3 → 1 and 2 → 0, as
before the merge; the one left is IMM 5476's hand-signed scan, which C7.6-7 expects.

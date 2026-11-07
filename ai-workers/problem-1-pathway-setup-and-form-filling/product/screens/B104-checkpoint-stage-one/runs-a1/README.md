# Row A1 (M3 sprint plan, 6 Nov): B104 after B120 — the checks of its Done when

Code: this branch after the merge of `main` 3a1bfd8d (B120, #1158) in 4c7e080e, B104's call moved to
`api/src/features/checkpoint/105-stage-one.ts`. The product code is the same at this folder's commit. Every run used a
fresh isolated copy (`tools/isolated.sh`). Live AI was off (every `*_LIVE` variable and AI key unset), no priced button was
pressed, and the cost was US$0. Cloud session, 6 Nov, 23:00–00:30 IST.

## 1. M3 packs, each alone on a fresh configured checkpoint

* **Method.** `run-checkpoint.mjs` is cloud qa's runner from gate A on #1084. It runs, in order: Demo › Reset (201), Load
  the configured checkpoint (201), then the pack alone with the tsx CLI from `prototype/`, with no `--tsconfig` and no
  fixture set-up.
* **Results.** The outputs are in `checkpoint/`. `stepdiff.txt` compares every step with the plan's baseline,
  `screens/M3-plan/packs-2026-11-06.md` on `main` 50e47a6fd (`stepdiff.py`).

| Pack | Plan's table (main) | This branch | Steps that change |
|---|---|---|---|
| **C8.2** | 11/12, exit 1 | **12/12, exit 0** | C8.2-7 fail → pass |
| **C6.9** | 2/15, exit 1 | **15/15, exit 0** | C6.9-2 to -14 fail → pass |
| C11.6 | 6/14 | **9/14** | C11.6-1, -2, -8b fail → pass |
| C8.1 | 0/14 | **2/14** | C8.1-1, -2 fail → pass |
| C6.11, C6.4, C6.12, C7.7, C7.3, C7.6, C9.2, C7.5, C6.5, C10.2 | 22/25, 18/30, 24/24, 16/33, 0/13, 13/25, 3/11, 9/16, 9/32, 0/11 | the same | none |
| C6.12-breadth | 1/4 (its screen step -25 could not start a browser there) | 1/4 | -25 now runs and fails on "no fee or CAD on the case page" (row B5's screen); counted red in the plan's table too |
| C1.3 | 54/54, exit 0 | 54/54, exit 0 | none (its steps are named C11.5…; no FAIL line on either side) |

**No step goes from pass to fail in any of the 16 packs.**

**Gate B itself** (`gate-b-C8.2.txt`, `gate-b-C6.9.txt`): run with `GATE_B_DATA=checkpoint`, it passes, 12/12 and 15/15.
Their run lines have set-up steps, so the gate ran them **on their fixture**, not the checkpoint ("fixture only"). `main`
also passes there. The checkpoint numbers above are the evidence for the Done when.

## 2. `tests/check_b104_checkpoint.ts` (live)

`live/`:
* this branch: **11/11, exit 0**;
* `main` 3a1bfd8d: **exit 1**, with 2 of 11 passing. Same test file, run on a `main` copy.

## 3. Reset to the six, byte-equal (`tools/demo-dump.mjs`)

Both sides ran with the AI queue serialised by a local, never committed edit (`ai.ts` `MAX_PARALLEL = 1`), as B120 did:
with 2 at once, Reset to the six differs from run to run on `main` (B120 finding 1).

* **A fresh Reset to the six, `main` 3a1bfd8d against this branch: `cmp` exit 0.** That is 1,251 rows in 88 tables and 59
  files, sha256 a79d3aeeb0f8c568 on both.
* **Load the configured checkpoint, then Reset to the six, `main` against this branch.** With the random-id tokens masked,
  the two differ in 2 lines:
  1. Reset's own audit line says it removed 10,505 rows here and 10,493 on `main`. That is the 12 rows B104's step adds
     to the checkpoint that Reset then clears; the six it leaves are the same.
  2. One `form_line_action` ("finder_attach") lists the same lines in another order: the same characters, rearranged.
     That is a list `main` builds in no order.
* **Finding, not this row's:** on `main` itself, Reset to the six after a checkpoint load is not byte-equal to a fresh Reset
  to the six. With tokens masked, 10 lines differ (proposal items, the finder's attach lines and Reset's audit line).

## 4. 097 or 105

Measured before this merge, on a local merge of #1084 onto #1158's head ccb0d98ec, with the AI queue serialised: the
configured checkpoint with the step as `097-…` and as `105-…` is **byte-equal, `cmp` exit 0**. That is 11,031 rows in 88
tables and 130 files. Order relative to `100-form-roles` does not matter (`applySampleFormRoles` sets only
`gov_form_def.form_role` where it is empty), so the plan's 105 stands.

## 5. Journey J-A1 at 1440 px

Run with `../walk-stage1-1440.cjs`:

| Copy | Folder | Result |
|---|---|---|
| this branch | `../walk/` | **15/15 steps and 2 notes, 0 errors, exit 0** |
| `main` | `../walk-main/` | exit 1 |

On `main` the walk misses 1.2, 1.3b, 1.5, 2.3, 4.1a and 4.1b. It then stops at 4.4, because with no check run there is no
result to override.

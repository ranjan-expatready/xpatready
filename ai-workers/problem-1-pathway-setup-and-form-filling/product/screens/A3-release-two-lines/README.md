# Row A3 (M3 sprint plan, 6 Nov): release 2's own lines — checks

**What changed:** release 2's draft of Visitor visa gets three settings, through the Forms tab's own routes, before it is
submitted (`features/checkpoint/130-release-two.ts`):
* IMM 5645 is signed by the person.
* IMM 5645 is signed with a typed name.
* IMM 5257 SCH1 is signed with a typed name.

The data is `samples/checkpoint-stage-one.json` → `vv.single.release_two`.
* IMM 5645's signer cites the committed copy of canada.ca's IMM 5645 page,
  `official-sources/ircc/canada/pages/imm5645.html`, dcterms.modified 2024-06-21, P-170. canada.ca does not resolve from
  cloud sessions.
* The typed names are Sample, Unconfirmed: expert (FQ-2).
* By the tech lead's ruling on #1167 (option 1), nothing is recorded on what IRCC accepts for IMM 5257: release 2 keeps
  IMM 5257 Online.

**How it was run:** base `main` 73ae633 (#1084, #1072, #1073 and #1172 merged), branch `claude/blissful-mccarthy-5b5t13`.
Every run used a fresh isolated copy, with live AI off and US$0. Cloud session, 7 Nov, about 08:45 to 09:45 IST.

## 1. Packs, each alone on a fresh configured checkpoint, `main` against this branch

* **Runner:** `../B104-checkpoint-stage-one/runs-a1/run-checkpoint.mjs`, cloud qa's runner: tsx CLI, no `--tsconfig`, no
  fixture.
* **Outputs:** `runs/main/` and `runs/branch/`. The step-by-step comparison is `runs/rundiff.txt` (`rundiff.py`).

| Pack | main 73ae633 | this branch | Steps that change |
|---|---|---|---|
| C7.6 | 15/25 | 15/25 | none: same PASS/FAIL (the warnings change, see below) |
| C11.6 | 9/14 | 9/14 | none |
| C8.1 · C8.2 · C6.9 | 14/14 · 12/12 · 15/15, exit 0 | the same | none |
| C9.2 · C7.7 · C6.4 | 6/11 · 17/33 · 19/30 | the same | none |
| **C10.1 (M2)** | **28/28, exit 0** | **28/28, exit 0** | **none: no step differs** |

**C7.6: the Done when.** "On a filled family case no 'missing signature' warning names a line whose signing the data
sets." Counted from the warning codes the pack prints:

| C7.6 step | main | this branch |
|---|---|---|
| -5, after every fact is confirmed | 3 × `missing_signature` | **1**: IMM 5476, signed by hand and scanned, which C7.6-7 expects (it passes on both) |
| -12, after IMM 5476's scan is uploaded (C7.6-11) | 2 × `missing_signature` | **0** |

* **What the 2 at step -12 are.** They are the lines this row sets, IMM 5645 and Schedule 1, which `main` leaves "how it is
  signed is not set".
* **Why -5 and -12 still fail on both sides:** `missing_facts`, `fact_problem` (the helper's Sample UCI) and
  `missing_document`. Those are other rows' causes.

**C11.6-8a, -8b and -9 are named, not moved** (tech lead's ruling on #1167).
* -8a and -9 fail as on `main`, both read on the outputs:
  * -8a expects Online on IMM 5257 to be refused by the fixture's S4a accept record, which the ruling leaves out.
  * -9's Paper change is saved (200), but the step expects the spouse's IMM 5257 to stay a PDF upload, and on release 2
    it is Online (`acceptance/C11.6.test.ts:36`).
* -8b passes, as on `main`.
* They move with the C11.6 pack onto release 2's lines: stream C, row C4, hand-over H4.

## 2. Tests

Outputs are in `live/`.

| Test | this branch | main |
|---|---|---|
| `tests/check_b104_checkpoint.ts` (live) | **15/15, exit 0** | **exit 1**: A3-L1, A3-L2 and A3-L4 fail (A3-L3, "release 1 untouched", passes on both by design) |
| `tests/check_b104_stage_one.ts` (offline) | **23/23, exit 0** (B104's 16, plus A3-1 to A3-7) | — |
| `tests/check_c10_1_configured.ts` | **48/48, exit 0** | — |

**Mutation check of the offline test:** with the signature step switched off in a scratch copy, A3-5, A3-6 and A3-7 fail.

## 3. Journey J-A3 at 1440 px

Run with `walk-a3-1440.cjs`.

| Copy | Folder | Result |
|---|---|---|
| this branch | `walk/` | **6/6 steps and 2 notes, 0 errors, exit 0** |
| `main` | `walk-main/` | **3/6, exit 1** |

On `main` the walk misses 1.3 (IMM 5645: the person, typed name), 1.4 (Schedule 1: typed name) and 2.4 (the case's "How
each form is filed" shows "No signature" for both).

**Notes (not counted):**
* **1.4a.** What IRCC accepts for IMM 5257 is not recorded, by the #1167 ruling.
* **The readiness list has no screen yet** (row B2). Its evidence is the live test's A3-L4 and C7.6's warnings above.

The walk ends at C11.6 5.2: IMM 5476 › Change channel, where Online is greyed, with IRCC's line.

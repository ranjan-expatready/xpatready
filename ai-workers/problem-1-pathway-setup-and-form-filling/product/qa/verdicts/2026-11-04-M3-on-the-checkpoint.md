# qa verdict: the M3 rows on the configured checkpoint, after QA-144 slice 1 (#798), 4 Nov 2026

**Verdict: the five M3 rows (C6.12, C6.4, C7.6, C7.7, C7.3) still cannot count on the checkpoint (P-322).** On main 0e5f8630, Demo › Load the configured checkpoint still releases **nothing** (`released: []`). So no firm can open a case on a configured release, and no M3 capability can be met there by a real user.

The rows stay Partial on their fixtures, unchanged.

* **Commit tested:** main 0e5f8630 (#798 merged, with #840 IRM 0002's saved field map already on main since a7709b49).
* **Tester:** the independent cloud qa for M3 (Opus). It built none of this.
* **How:** a fresh isolated copy (`qam3ck`, port 4470). Demo › Reset as the author, then Demo › Load the configured checkpoint (`POST /api/demo/load {"sample":"configured"}`, 58 s, `cost_usd: 0`), the same two calls gate B makes for `GATE_B_DATA=checkpoint`. Live AI was off; cost US$0. The copy was dropped.

## What the checkpoint did (its own rows)
| Row | Status |
|---|---|
| 1 Ingest, held file | done |
| 3 Saved field-map answers replayed | done: **18** saved answers, 670 proposals |
| 4, 5 Review and approve | done |
| 7 Sections and questions from the forms' parts | done (36 sections, 147 facts, 52 by hand, 6 form lines from IRCC's words) |
| 9 Channels for release 2 | waiting for release 1 |
| **10 Review and release** | **waiting**: "Visitors › Visitor visa: Fix 1 problem before submitting: IRM 0002: No form fields mapped yet …"; Study permit 40 problems; others not reached |
| 12 IMM 5257 filled and read back | waiting (no saved IMM 5257 field map under today's drafting) |

## Why IRM 0002 is still unmapped (qa's reading of the code, for the owner to confirm)
* #840 put IRM 0002's saved field map on main (`p2/runs/studio-fieldmap-irm0002e-live-20261104t053531343z-0a39c9.json`, with its checker run).
* The checkpoint's field-map replay (`api/src/demo.ts` ~354–365) plans only over the forms read at ingest (`made`).
* IRM 0002 joins the Visitor visa later, as a form line set from IRCC's words (row 7, `VV_FORM_RULES`).
* So the saved IRM 0002 answer is never replayed, and row 10 stays blocked on the one block #798 named.

## For the qa lane (the one writer of BUGS.md)
* **QA-144 retest on 0e5f8630:** still open. The count improved from "releases nothing, 391 blocks" to "releases nothing, Visitor visa has 1 problem (IRM 0002)", but the outcome a person sees is the same.
* Add the reading above as evidence to QA-144's row.
* **New bugs: none.** This is QA-144's remaining part, not a new row.

## The fixture packs on the same commit (gate B, run twice, the same both times)
* C6.12 0 · 24/24 · C6.12-breadth 1 · 1/4
* C6.4 0 · 30/30
* C7.6 1 · 4/23 (#861 not merged)
* C7.7 0 · 26/26
* C7.3 0 · 13/13
* `setup_vv_m3` 44/46

This is the same result as on 9caa043b and d4146dbd.

## What each row's verdict now says
"fixture only: Partial (as in the 4 Nov round-0 verdicts); on the checkpoint: not reachable, since the checkpoint releases nothing on 0e5f8630 (QA-144 remains: IRM 0002's saved map is not replayed)."

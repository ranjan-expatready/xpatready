# Solution 1: acceptance decision card, one-pager draft 4.3

19 October 2026 · Claude Code (the Lead) · Under AIW-D246 step 4. **Status: accepted by the founder, 19 Oct 2026 (AIW-D249), with the limits and below-target exception below; answer recorded at the end.** Corrected after the answer as the founder directed (three items, listed at the end). Nothing in this card changes the one-pager, a founder decision or a team document. Legal points: Unconfirmed: no counsel (AIW-D94).

## What is being accepted

| | |
|---|---|
| **Revision** | One-pager **v3 draft 4.3**, `solution-1-one-pager.html`, SHA-256 `124df0a2b6ddafe23310f53db713d1705bc3ab33ed08d386d226400937728445`. Re-hashed by the Lead at 10:37 UTC today: unchanged. Rebuilds byte for byte from `tools/s3/`. |
| **Purpose** | High/medium **solution alignment** only. Not build readiness, not proof that AI, PDF filling, barcodes or portals work. |
| **Source basis** | Written against the 13 October team sources. The 19 October sources are compared in the [conflict table](conflict-table-2026-10-19.md), not built in. |
| **Hosted copy** | The shared link still shows draft 4.2. Republishing 4.3 needs separate approval. |

## Review evidence

- **Independent check:** fresh Codex reviewer session, **PASS** at 10:19 UTC today. The two findings from the 4.2 final audit are corrected: R-M1 (a disproved mapping fault releases only the mapping hold; a wrong fact keeps its forms held until corrected, re-checked and re-approved) and R-m2 (the stage 6 → 7 arrow). Hash matched before and after; 37 of 37 targeted checks reproduced; panels opened; fresh screenshots at 960 and 1440 px, light and dark, inspected.
- **Before that:** Codex's final audit of 4.2: PASS WITH FIXES; 312 of 312 assertions reproduced; 57 of 57 panels opened and extracted, with zero extraction failures. Review depth as that audit states it: the prior full panel and language review combined with the current source differences, changed bodies, examples and affected dependencies; not a fresh reread of every unchanged sentence.
- **Lead's own checks today:** all suites pass on 4.3 (150, 35, 41, 86, 37; 0 label collisions). Drive has no change after the 07:03 UTC snapshot (newest change: a sprint plan sheet at 05:00 UTC); all four code repositories match. The reviewer's 1440 px and 960 px dark screens were looked at again: readable, stage flow and decisions clear.

## Limits (accepted with it, if you say yes)

1. **Below-nine scores.** Independent scores on 4.2 (4.3 changed only the two fixes, not rescored): solution 8.5, completeness 8, readability 8, usability 8.5, honesty 8.5, feasibility 7.5, language 8. Your target is 9 in every lens. Codex said these need not reach 9 before moving on. Saying yes records an explicit **below-target exception**. Feasibility stays lowest because nothing AI, PDF or portal has been run; the prototype is what raises it.
2. **Not executed:** AI drafting, PDF filling and read-back, barcodes, portals, signing.
3. **No reader trial:** no team member or new reader has tried it.
4. **Team has moved on since 13 October.** The screens show 4.3 saying "verifies each fact once", "Wrong mapping → support ticket", "Wrong value … blocks" and "the SME confirms". The team's 18 October record would change each of these (rows 1–4).

## Known conflicts and proposed treatment

All 17 rows are in the [conflict table](conflict-table-2026-10-19.md). None is settled by accepting. Proposed treatment:

| Rows | What | Treatment if you accept |
|---|---|---|
| 0 | Which team text counts: the 18 Oct record or SA-01B v1.5 | **Blocker for the prototype**, not for acceptance. Asked first |
| 1–5 | Review model, correcting a wrong value, blocking vs warning, the SME role, AI processing region | **Blockers for the prototype**, except row 5: the prototype reads only public official forms and guides and uses a synthetic family, so no client data reaches AI and it can proceed under either answer. One question each, straight after this |
| 6–12 | Where Validate runs, hand authoring, who answers each field, PQR result, PQR→SQR, family link, answer sheet | **Limitations.** Each asked before the prototype milestone it affects (P2–P5) |
| 13–16 | "Drafter" name, IMM 5645/5707, proof framing, scope not covered | **Limitations.** No founder decision needed |

Your answers change the **prototype working version**, never 4.3 itself. Acceptance selects 4.3 as the reference revision that baseline B0 must preserve. **B0 creation and verification are pending** (AIW-D246: settle backup coverage, then preserve or rebuild B0 and check it reproduces this hash).

## Lead recommendation

**Accept draft 4.3, with the limits and the below-target exception above.**

Why: acceptance here fixes a known reference point, not the final behaviour. D246 already routes every correction into a new working version and keeps the original. The conflicts are about the team's newer direction, and they are asked one by one straight after.

The honest risk: the most important behaviours (how the officer reviews, when the product stops staff) may change in rows 1–3. So the accepted 4.3 is a baseline, not a statement that its review and blocking model is right.

## The one question

Do you accept one-pager draft 4.3 (`124df0a2…8445`) for high/medium solution alignment, with the limits and below-target exception above?

- **Accept with these limits** (recommended): record acceptance; ask row 0, then rows 1–5.
- **Not yet:** name the issues; the Lead answers them before acceptance is asked again.

## Founder answer, 19 October 2026

Accepted (AIW-D249): "I accept draft 4.3 (124df0a2…8445) for high/medium solution alignment, with the listed limitations and below-target exception." The founder added: "This acceptance selects the preserved reference revision. It does not approve unresolved behaviour conflicts or establish that B0 preservation and reproduction are complete."

Corrections made to this card at the founder's direction: (1) removed the unsupported claim that declining would necessarily mean a draft 4.4, another recheck and a day's delay; (2) B0 creation and verification marked pending; (3) the 4.2 audit's panel evidence restated as 57 panels opened and extracted, at the review depth that audit states. Row 5's prototype exception kept explicit.

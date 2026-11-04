# qa verdict: the M3 rows on the configured checkpoint after #891, 4 Nov 2026 (~19:00 IST)

**Verdict: the checkpoint now releases the Visitor visa, built by the product's own steps (P-322).**
* **C6.12:** its Visitor visa part now counts there (24/24).
* **C7.6:** its API counts there (probes 16/16; verdict `2026-11-04-C7.6-after-861.md`).
* **C6.4, C7.7 and C7.3:** not met there, because the configured release has no document lines, never lists IMM 5476, and has no Online form in release 1.
* **Every row stays Partial.**

Commit and method:
* **Commit tested:** main 1d0be4aa3 (#891 and #861 merged).
* **Tester:** the independent cloud qa for M3 (Opus). Its read before the merge of #891 (6123019d, `reports/2026-11-04-qa-m3-cloud/checkpoint-pre-merge-891.md`) found the same.
* **How:** a fresh isolated copy, then Demo › Reset and Load the configured checkpoint as the author: 52 s, `cost_usd: 0`, `released: ["Visitors › Visitor visa", "Work permits › … With an LMIA – inside Canada"]`. The packs ran directly on `vv.single` release 1, twice, with no fixture setup. Live AI was off; cost US$0; the copy was dropped.

## Packs on the checkpoint (exit · passed; the same both runs)
| Pack | Checkpoint | Fixture | Row verdict |
|---|---|---|---|
| C6.12 | **0 · 24/24** | 0 · 24/24 | Partial: the Visitor visa part counts on the checkpoint; breadth 1/4 (sponsorship, the child study question, the screen) |
| C6.4 | 1 · 6/30 | 0 · 30/30 | Partial: not met on the checkpoint (finding 1) |
| C7.7 | 1 · 12/26 | 0 · 26/26 | Partial: not met on the checkpoint (findings 1, 2; no Online line in release 1) |
| C7.3 | 1 · 2/13 | 0 · 13/13 | Partial: not reachable on the checkpoint until release 2 (DEMO.md row 9) |
| C7.6 | 1 · 16/25 (probes 16/16) | 0 · 25/25 | Partial: API works on the checkpoint, no screen |

## Findings for the qa lane to copy (proposed severities)
1. **Gap · Major · C6.4, C7.7 (owner: the checkpoint loader / runtime): the configured Visitor visa release has no document lines.**
   * **Steps:** open a case on the checkpoint release and read `GET /runtime/cases/:id/checklist`.
   * **Actual:** `empty_release: true`. The database's `document_requirement` table has 0 rows. There is no passport line and no proof of financial support.
   * **Expected:** the release carries the Visitor visa's document lines from IRCC's checklist (IMM 5484), set through the product's screens. The fixture's `setup_vv_m3` adds them; the product's own steps do not.
   * **Found on:** 6123019d, confirmed on 1d0be4aa3.
2. **Bug · Major · C7.7, C6.11, C7.6 (owner: runtime, the QA-144 rules): IMM 5476 never applies to a represented case on the configured release.**
   * **Cause:** its form line's rule is `{"op": "exists", "field": "case.representative_form_action", "subjectKind": "CASE"}`, and no question on the case asks that fact. None of the 110 questions in the officer's view does.
   * **Actual:** the line is not even listed as "Cannot start yet".
   * **Expected:** a case with a representative of record lists IMM 5476.
   * **Same shape:** IMM 5475 (`case.release_authorization_action`).
3. **Gap · Minor · C7.6, C8.1 (owner: the checkpoint loader):** the checkpoint's form lines carry no signer rule, so C8.1's signing steps are absent (0/14). Every form warns "missing signature" until it is passed.
4. **Note:** C7.3 needs release 2's channels (DEMO.md row 9, IMM 5257 Online), which the checkpoint does not reach yet (row 9 "waiting").

## QA-144
On main 1d0be4aa3 the configured checkpoint releases the Visitor visa and With an LMIA. **For the qa lane:** QA-144's release half can be retested and closed on that evidence. Findings 1–3 above are what the released Visitor visa still lacks for M3.

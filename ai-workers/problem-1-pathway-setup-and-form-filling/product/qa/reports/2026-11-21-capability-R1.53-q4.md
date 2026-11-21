# qa capability R1.53 (Q4) — 21 Nov 2026, main f50a4e4fd

Lane: qa Q4 (cloud copy; P-728 allows four). Opus 5.5, medium effort (P-781). Live AI off, US$0.
Trigger: FO-5b (#2720) merged as f50a4e4fd, ~09:4x UTC. Fresh reader: `2026-11-21-r153-q4/reader-verdict.md` (Opus, ran nothing, P-303).

## Verdict
**Partial: parts missing FO-5s (retainer screens) and J-53 (join and walk).** The reader agrees (high confidence). No Works verdict is possible under P-606: two of the row's four parts (FO-5, FO-5b, FO-5s, J-53; `focus-list.md:39`) are not on main, and neither has an open PR.

## Pack on GitHub's runners (P-339)
Merge-queue run **44888126444** (success; queue commit 035c8af93, "merged #2727, #2720"). Its `prototype/studio` tree equals main f50a4e4fd's: `git diff 035c8af93 f50a4e4fd` changes only records and `product/tools`.
| Suite | Result | Job |
|---|---|---|
| `check_fo5b_retainer_checklist.ts` | 28 passed, 0 failed | 136798806632 |
| `check_fo5_retainers.ts` | 248 passed, 0 failed | 136798806632 |
| `check_fo5f2_template_safety.ts` | 72 passed, 0 failed | 136798806599 |
| `check_b164_no_engine_keys.ts` | 67 passed, 0 failed | 136798806621 |
Every other job in the run passed. `guard` and `packs` were skipped by design.

## What works (route only)
* **The Code's items on a draft:** `GET /api/front-office/retainers/:id` returns `codeChecklist` with 26 items (a)-(z), each present or missing. `GET /api/front-office/retainer-templates/:id/checklist` gives the template view ("n of 26 items marked") with a "how we check" note on each item.
* **Non-blocking (P-566):** `blocksSend: false`. Only AG-5-9's client name and fee refuse a send (fo5b DW4).
* **Versions until sent:** an edit makes version n+1. Each version keeps its own marked list (`code.marked` in the version's merge values, write-once).
* **A sent retainer cannot change:** the database trigger refuses any change, including to the sent version's list. A later template version does not change it (DW6: still 1 of 26, same file hash, `templateChanged: true`).
* **Citation (AGENTS rule 4):** `samples/cicc-code-s24-items.json` cites SOR/2022-128 s. 24(3), the Justice Laws URL (`#s-24`), "current to 2026-10-29" and the read date 21 Nov 2026, with `legalReading: "Unconfirmed: no counsel"`. The builder's script extracted the text from the page, and the reviewer's diff against the live page found 0 differences. qa did not fetch the page.
* The 15 Nov gap "Missing: the regulator's 26 items (FO-5b)" is closed.

## Gate A (P-317, P-348 (3))
**Not met, and it cannot run.** `web/src/modules/front-office/` has booking, booking-public, compliance, embed and sales, but no retainer folder. `tests/journeys/j_53.ts` does not exist. The next step (draft → send → sign → WON → the case side's `prospect.won`, FO-8) has no screens to walk. So there is no headed walk, no 400/1024/1440 replay and no walk on :4400 to record: nothing a person can see changed.

## Bugs
0 Blocker · 0 Critical · 0 Major · 0 Minor new. No new BUGS.md row: the missing parts are planned rows (FO-5s, J-53), not defects, and the two records notes below are for the tech lead.

## Not tested
* No browser walk, journey score, axe or zoom check: there is no screen.
* No API probes beyond the pack: the pack's DW1-DW8 already cover wrong firm, malformed id, permission key, unknown marker, a marker used as a section, and double versions. A qa copy would only repeat them.
* Coverage (c8) was not run: this is a capability round, not a milestone.

## Questions for the Lead
1. **"Current to" date (records, Minor Conflict):** P-567 (2) and the FO-5b BACKLOG row say "current to 2026-10-19". The data file and its tests say 2026-10-29, which is what the page said when read on 21 Nov. The newer official date should win. Recommendation: update P-567's wording, or note that the row follows the page.
2. **Row 53's part list (records, Minor Ambiguity):** `MVP-CHECKLIST.md` row 53 lists "FO-5, FO-5b, FO-5s (FO-5r research)" and leaves out J-53. `focus-list.md:39` and BACKLOG J-53 include it. Recommendation: add J-53 to the checklist row, so the readiness gate (ENF-782a) sees it.
3. The builder's deviation 1 on #2720 (marker spelling `{code.s24_3_k}`, not `{code:24-3-k}`) is still for you to confirm before FO-5s writes it into help text.

## Suggestions
* Shape and start FO-5s (concept r2 is approved) and then J-53. Without them R1.53 stays Partial. *Needed for the proof · Capability.*

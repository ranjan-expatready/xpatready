# qa after-merge 9 — main 6d5d751c (1 Nov 2026, qa-2)

**Run:** the rows the batch marks in `qa/built/` (P-219, P-221). Product PRs: #285 (forms, C2.12), #294 (screens, C3.14), #284 (runtime, C4.1), #292 (runtime, C4.6), #288 (runtime, C6.11, M3-A). Records only: #290 (lead). Copies (isolated, US$0, no STUDIO_*_LIVE): one fresh copy per builder check (:4475–:4479); qa_g :4474 with the configured checkpoint (the data a person reaches from the Demo menu); qa_g2 :4478 with the suites' fixture (`POST /demo/load` with no body), because no combination in the checkpoint has a section to move.

## Verdict
**Ready.** All five rows work on main as a person sees them. Nothing new to log. 0 Blocker · 0 Critical · 0 Major · 0 Minor new. One flaky step, below.

## What works (evidence on 6d5d751c)
| PR | Row | Builder's checks here | qa walk (`tests/qa/check_qa_am_1101g_walk.cjs`, new) | Score |
|---|---|---|---|---|
| #284 | C4.1 | `check_c41_section_order.ts` 32/32; `…_browser.cjs` 28/28 twice alone, **27/28 once under parallel load** (R2 "a move from a stale tab … the order shown refreshes") | Suites fixture, With an LMIA: Move down by keyboard; first Move up greyed with "\"Application details\" is already the first section."; "Sections reordered: …"; one Undo; approver no Move; axe (`c41-moved-1440.png`) | Partial (SQR per person not built on the demo data; QA-133) |
| #294 | C3.14 | `check_c314_rules.ts` 23/23, `…_browser.cjs` 31/31 | Checks and Rules read-only, chips, counts, filter, search ("No rule matches · Clear the search, or choose All"), where used opens the tab, 1440/1024/400, axe, approver reads (`c314-*.png`) | **Works** |
| #285 | C2.12 | `check_forms_c212_to_review_browser.cjs` 30/30, `check_forms_c212_rail_browser.cjs` 31/31 | Checkpoint, IMM 5257 on Visitor visa: strip "Setting up IMM 5257 on Visitor visa · Step 2 of 6 · … · Back to the steps", "Show every form", axe (`c212-to-review-filtered-1440.png`) | Partial (slices 5–8) |
| #292 | C4.6 | `check_c46_preview_channels.ts` 21/21, `…_browser.cjs` 23/23 | Checkpoint, Visitor visa Preview: "… gets: 8 filled PDFs to upload", household picker, no sideways scroll at 1024 (`c46-vv-preview-child-1024.png`) | **Works** |
| #288 | C6.11 | `runtime/check_c611_team.ts` 57/57, `…_browser.cjs` 22/22 | Open a case: "Case team · Stand-in · Representative of record: Representative (Sample) · CICC R000000 / Second representative (Sample) · CICC R000002 · Licensed, named on IMM 5476"; the case shows the representative; solo firm 404, client 403, author 403 in words (`c611-*.png`) | **Works** (M3's first) |

`qa/built/` files deleted for all five (C2.12, C3.14, C4.1, C4.6, C6.11).

## Findings
* No new row.
* **Flaky step:** `check_c41_section_order_browser.cjs` R2 failed once in three runs, when four copies ran at once. It's either the product's refresh after the 409 being slow under load, or the step's timing. Watch it; a second failure means quarantine (P-205).
* **For P-220:** in the configured checkpoint no combination has a section, so C4.1's Move can't be walked on the data the Demo menu gives (Visitor visa: "Applicant · 0 questions · 53 not asked"). That's the same cause as after-merge 7 (177 problems). QA-143 ("Applicant") is seen again on Preview.

## Acceptance packs reviewed this round (comments on the PRs)
#296 (pack 4, Visitor visa M3), #295 (pack 3), #298 (pack 2) and #303 (pack 1). The common finding: packs 1–3 load the suites' fixture (`POST /demo/load` with no body), not the six the Demo menu loads. All four create `compliance-trace.md` as a new file, so they'll conflict when merged.

## Progress (`tools/progress.sh`)
On main before: M2 25 of 56 · 6 built, awaiting qa; M3 0 of 16 · 1 built, awaiting qa. After this PR: **M2 27 of 56 · 2 built, awaiting qa** (C11.11 and C11.15, scored in #299, which hasn't merged yet; with both: M2 29 of 56) · **M3 1 of 16 (C6.11)** · R1 6 of 8.

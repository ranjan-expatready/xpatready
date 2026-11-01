# qa after-merge 8 — main b350b989 (1 Nov 2026, qa-2)

**Run:** `git log --first-parent 73396df2..b350b989`. Product PRs: #274 (forms, C11.15 and C11.11: QA-101, QA-102, QA-103) and #270 (forms, C11.15: #261 Minors m1–m3, a download-failure link per failure). Records only: #287 (lead, P-220). Copies (isolated, US$0): qa_101 :4477 (stand-in launcher `fake-launch.mjs`, no model call) and qa_1115 :4478 (canada.ca fixture `canada-c1115`).

## Verdict
**Ready.** Both PRs work on main. Three Majors closed: QA-101, QA-102, QA-103. Nothing new. 0 Blocker · 0 Critical · 0 Major · 0 Minor new.

## What works (evidence on b350b989)
| PR | Capability | Builder's check here | qa look as a person |
|---|---|---|---|
| #274 | C11.11, C11.15 | `check_forms_qa101_103.cjs` 22/22 | Study permit › Forms after the find (`sp-forms-after-find-1440.png`): no IMM 5483 line (QA-101). IMM 5707 is not offered again, and "Add to this combination" appears 0 times (QA-102). IMM 1294 reads "File in the library · Step 2 of 6 · Field map · Your step", and "Not attached" appears 0 times (QA-103). |
| #270 | C11.15 | `check_forms_c1115_download_link.cjs` 16/16 | — |

## Re-scored (P-219)
* **C11.11 Built, awaiting qa → Works**: QA-101 was the last open item on the row.
* **C11.15 Built, awaiting qa → Partial**: still open are QA-78 ("Online (later wave)" is still shown on the tab), QA-98, 105, 107, 110 and 111. Redo with AI and Replace were not run (live only).
* `qa/built/` has only its README, so there were no files to delete.

## Progress (`tools/progress.sh`)
Before: M2 26 of 56 · 2 built, awaiting qa · 25 partial. After: **M2 27 of 56 (48%) · 0 built, awaiting qa · 26 partial · 3 not built**. R1 6 of 8 and M3 0 of 16 unchanged.

## Could not test
* The finder with a live model (US$0 rule). The stand-in launcher replays both rounds.

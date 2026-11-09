# C10.2 (Lead 37): journey test, reviewer, 9 Nov 2026

**Head:** 3df708b18b38dbc7bfa86c8f02e76cbcb6ad82b8 (PR #1394), branch `claude/runtime-c102-finished`, working tree clean.
**Copies:** isolated, :4435 and :4436 only, each started and stopped in one command; the validated folder and saved read-back of each copy were in the reviewer's scratch folder, which was removed afterwards. Nothing was committed.
**Validated file:** TEST ONLY. Acrobat is not on this machine, so the "validated" file is the acceptance helpers' `asValidated`, as in `tests/check_c102_paper_readback.ts`. It never touched demo data or `samples/`.
**Script:** a Playwright journey with axe-core in the reviewer's scratch folder. Screenshots `j1-*` and `j2-*` are there too and are not committed (this report is the only record).

## Journeys (persona · goal · expected)
1. **Main path, no Adobe file** (the configuration author, CI or a cloud copy). "Show the founder the finished story." Expected: Paper, forms, ready and record read Partly. The Paper stage says in words what waits, with no fixed count. Three filings are recorded and the Paper filing is split out.
2. **Main path, with the validated file** (the author, after the Lead's Adobe step). "Load it again and see it finished." Expected: every stage is Done and four filings are recorded in one group. The Paper copy is read back by the case officer, printed from the validated copy, then signed in pen.
3. **Wrong role at the door.** The client uploads the validated copy. Expected: refused.
4. **Bad input at the door.** The product's own unchanged copy is uploaded. Expected: refused.
5. **The file no longer fits the copy** (facts changed, values changed, Validate did not pass, other checksum, a path out of the folder, folder absent, another person). Expected: the finder never returns `found`.
6. **Wrong role on the load.** A case officer presses Load. Expected: refused in words.
7. **Across the boundary.** Result › Open the family case › the Paper IMM 5257 › Ready to file and Submission. Expected: the case page agrees with the result.

## What happened
| # | Result | Evidence |
|---|---|---|
| 1 | **Held.** A keyboard-only path (Tab to Demo, Enter, arrow to the item, type RESET, Tab to Load, Enter) loaded in 153 s. Stages: move, facts, signed and documents done; paper, forms, ready and record Partly. The Paper row reads "its copy made (generated, no mandatory form field left open on it); it waits for its validated copy", then the Adobe step once, with no "16 of". Data: 3 filings recorded, 2 groups, 0 validated copies, no sign steps. | j1-1440-paper-stage, j1-1440/1024-case-paper-copy |
| 2 | **Held.** Keyboard load in 158 s; every stage Done. Data: 4 filings recorded in 1 group. 1 validated copy, `read_by` user-O. Sign steps `print:user-O:<the validated copy>`, then `sign_in_pen:user-O`. The case page shows "Validated copy read back", Filed, and Signed in pen. | j2-1440-paper-stage, j2-1440-case-paper-copy, j2-1024-submission |
| 3 | **Held:** 403, "Only the case officer can do this." | log |
| 4 | **Held:** 422, "This is the copy the product made, unchanged: it was not validated…" | log |
| 5 | **Held.** `storyValidatedFile` was called on the live copy with variants of the saved file. Results: as saved `found`; facts `differs`; values `differs`; not passed `differs`; other checksum `refused`; `../` name `kept_on_mac` (never read); no folder `kept_on_mac`; another person `none`. | log |
| 6 | **Held:** a toast reads "Case officer (simulated) does not hold the author duty"; nothing started. | j2-after-load-press (first run) |
| 7 | **Held,** with one inconsistency: the forms stage reads **Done** and also "Still waits: QA-153 …" (see the review, m6). | j2-1440-paper-stage |

**Also re-run, all exit 0:**
* Gate B on the checkpoint: C10.2 14/14 (with 5b and 6d PENDING).
* `check_c102_paper_readback`: 8/8 (scratch copy; Linux psql path).
* The pack on a copy holding the test-only file: 16/16, nothing PENDING; 10 loads again and keeps all stages Done.
* Serverless: qa285 13/13, b99 family hash 8/8, b99 same-as 9/9, case_feed 29/29, qa182 8/8, features_registry 27/27.

**Accessibility and sizes:**
* axe WCAG 2.2 A/AA: 0 violations on the result dialog and the case page, in both states.
* 1440 and 1024 px: no sideways scroll.
* Console: 4 resource 403s, all while the harness acted as the case officer on Studio pages. This PR has no web change.

**Break pass:**
* A double Load is covered by the existing refusals check, which was not re-run.
* Two loads back to back kept one story (pack line 10).
* The file name `../x` is never read.

## Score (QUALITY.md "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 and J2 end to end; pack 16/16 with the file and 14/14 without |
| Next step obvious | 1 | The Paper row says who acts (the Lead, in Adobe on the Mac) and what follows; the case page offers "Read back the validated copy" |
| Plain words | ½ | The founder-facing result names a repository path (`samples/validated-imm5257-paper.json`), "row 12b" and P-codes. This is the house style of this result, but not plain |
| Feedback and state | ½ | The forms stage shows **Done** next to "Still waits: QA-153" (J7); it is new, because the stage could never be Done before |
| Correct data | 1 | Recorded once, in one group; the officer is the actor of the read-back and of both pen steps; the validated copy was printed |
| Error recovery | 1 | J3–J6 refuse in words; a mismatched file is never read back |
| Accessibility and screen sizes | ½ | axe 0 and keyboard path; 1440 and 1024 px only (400 px and 200 % not re-run, no web change) |
| Speed | 1 | 153–158 s for a job that says "a few minutes", with a running state |
| Visual quality | 1 | Team dialog and pills; case page unchanged |
| Trust and sources | 1 | Sample marked; Validate never simulated in product or demo code; the read-back only through the product's door |
| **Total** | **8.5 / 10** | **Pass** (8 or more, no 0) |

**To raise it:**
1. Make the forms stage either Partly with the QA-153 words, or Done with the known gap labelled as a gap, not "Still waits".
2. Put the path and the codes behind the words, or after them.

## Could not test
* Adobe's real Validate on this copy (the 7 fields "to write by hand", the Canada/US re-tick).
* Which folder the Mac's :4400 reads.
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).

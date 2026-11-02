# qa after-merge, 2 Nov pm: P-250 verdicts and re-scores on main 12647032

Session: a new qa cloud session (finish program P-260, P-264, P-265). Main: **12647032** (#497). AI spend: **US$0**. This copy has no key, and the ledger was unchanged in every run.

## Verdict
* **Main 12647032:** 1 row moves to Works (**C5.6**). Five re-scored rows stay Partial with named gaps: **C2.6, C6.4, C7.7** (was "Not built"), **C11.7, C11.14**.
* **No Blocker or Critical on main.**
* **New findings:** 2 Major (QA-156, QA-157) and 3 Minor (QA-158–160). QA-82 drops from Major to Minor once #469 merges.

## Verdicts on PRs (P-250 / P-227), each commented on the PR
| PR | Head | Verdict | Evidence |
|---|---|---|---|
| #469 QA-82 | dc969406 | **Pass**, Minors QA-160 and QA-82 (rest) | `check_c41_questionnaire_roles.ts` 9/9; `check_s5_slice2_browser.cjs` 63/63. Own walk at 1440, 1024 and 400 px: 143/143 rows show the short name with the mark; Details shows "Meaning"; keyboard Enter opens it; axe 0. Pass case: a written `question_text` gives `asked: true`, and Preview asks it (SQL in my copy, then put back) |
| #493 R3 | 4dcf9e10 | **Major QA-156** (label removed by the tech lead; fix in a superseding runtime PR) | `C6.4.test.ts` 26/26, `check_c64_storage_api.ts` 48/48, `setup_vv_m3` 29/31 (known S2w, S7a). Probes: only children are asked; with no application date or no date of birth the lines show as "May be needed"; the 18th-birthday boundary is right; an invalid value decides nothing. A minor principal gets nothing (`tests/qa/check_qa_r3_minor_principal.ts` 2/4) |
| #502 R-146 part 1 | 85d30cfb | **Pass** (P-227 Saved), Minor QA-159 | Main: 0 usable saved runs for IMM 5604, 5562, 5406 and 5646. Head: 1 each. Reset to the six replays all four at US$0 (2, 8, 10 and 12 proposals, each with the file's edition); a second Saved plan skips each. `check_qa_p227_r146_saved_maps.ts` 26/26; D1 25/25 on the head |

## Re-scores on main 12647032 (isolated copies `qa_m3`–`qa_m6`, run in parallel)
| Row | Status | Evidence |
|---|---|---|
| C5.6 | **Works** (was Not built) | `check_g3_demo_release_browser.cjs` 11/11. Judgement, medium confidence: "refused anywhere else" cannot arise, because the POC has one workspace whose key is hard-coded `demo`. Case pages lack the mark (QA-158) |
| C2.6 | Partial | Pack 2 21/32 (was 4/32); `check_forms_c26_checklist.ts` 35/35. Gaps: QA-157 |
| C6.4 | Partial | `C6.4.test.ts` 16/16, `check_c64_storage_api.ts` 48/48. Waivers, the Express Entry block, the case screen and FQ-4 (QA-156) are open |
| C7.7 | Partial (was Not built) | `C7.7.test.ts` 18/18, `check_vv_prepare_api.ts` 35/35. Paper lines, the our-format copy, the licence fields and the readiness warning are not built |
| C11.7 | Partial | D1 25/25, D1 browser 25/25, pack 18/21 (part B Provincial nominee red). 4 of the 8 saved maps arrive with #502 |
| C11.14 | Partial | Choose all / Clear the choice works (`check_s6_queue_browser.cjs` 32/32). Pack 9/13: replayed field-map proposals have one round, no rules check, and are decided on their page |

`qa/built/` deleted for the rows re-scored: C6.4, C7.7, C11.14.

## Not tested / limits
* **No full suite run on 12647032.** I relied on CI for main. The red check on #493 was `check_c313_reuse_browser.cjs`, which the tech lead is quarantining in #503.
* Coverage (c8) and the graph were not rerun this round: no product code merged since the last report.
* C7.7 and C2.6 were checked through the API only; I walked no screen for them.
* R3's two new questions were not screenshotted in the client's page. The page loads with no errors.
* C2.6's "each quote is IMM 5484's own words" step fails against the official file. The rows already pass the in-product check "found in the file", so the difference may be extraction (spacing or ligatures). Not judged; part of QA-157 until the forms lane says.

## Questions for the tech lead
1. **C5.6:** do you accept Works with "refused elsewhere" untestable (one hard-coded workspace)? Or should a second workspace (or a flag) exist so that the refusal can be shown?
2. **C2.6 (QA-157):** pack 2 expects accepting through the queue's one door (P-149). The build decides checklist lines on the checklist page. Which applies? If the checklist page is the decision, the pack needs rewriting rather than the code.

## Suggestions
* *Needed for the proof · Capability:* R3's fix should use `each_applicant` under the age guard (QA-156). The tech lead has already ruled this.
* *Needed for the proof · Capability:* the C11.14 checker round on replayed field maps (AT-2, AT-3) would have caught QA-159.
* *Later · Scaffolding:* the acceptance and qa checks still call `/opt/homebrew/...` psql. On cloud copies that works only because setup shims the path. A `PSQL` constant in one shared lib would make them portable.

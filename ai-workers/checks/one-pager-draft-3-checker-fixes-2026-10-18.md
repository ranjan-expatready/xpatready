# One-pager draft 3: the Lead's fixes after the checker's verdict

18 October 2026 · Lead (Claude Code). Responds to `illustrations/actor-handoff-demo/draft-3-review/review.md` (checker: accepted for high/medium solution alignment once C-M1 is fixed). Reviewed page `f351d479…0394`, archived whole as `archive/ai-workers/*-v3-draft3-checked-2026-10-18.*` with `manifest-v3-draft3-checked-2026-10-18.sha256`. Result page `9fc94c35…3390`.

## C-M1 (material): one route for a signed file that does not match

| Cause | Destination, now the same everywhere |
|---|---|
| A signatory reports a wrong value | 8.1 (correct the fact); affected forms re-render, are approved and signed again |
| A re-run time-sensitive check blocks | 8.1, as above |
| The signed file cannot be matched to the approved version | The representative's check (9.3), without the approval. Answers match: approved again. An answer changed: the new value goes to 8.1 as 'needs review' and the form follows that route. Unchanged facts are never sent to 8.1 |

Where it changed:
- **Map stage 8:** the mixed decision is split. "Representative approves the final form?" (Yes, every form of the filing → signing; Returned → stage 7). Then "Problem when signing?" (No: the signed file matches → submission; Signed file does not match → back to the representative's check, approval not inherited; Wrong value reported, or a re-run check blocks → back to stage 6). "(stage 7)" is removed from the representative outcome.
- **9.3:** trigger adds the returned signed file; the signing rule names both outcomes of the re-check.
- **9.4:** the return path and the last rule name the three causes and their two destinations.
- **View 6 (BPMN):** "Problem when signing?" has two labelled return branches. "Wrong value or check blocks" → link to 8.1 (view 4). "Signed file does not match" → message "Signed file to check (9.3)" to the form pool, then back to the wait for "every form of a filing approved". View 5 gains the matching start event "Signed file to check" before 9.3. The view 6 end text says the same. No new activity, role or tier.

## Minor findings

| Finding | Change |
|---|---|
| M6 colour rule | One definition in 8.4: red = a block-severity failure, a missing or conflicting fact, or a meaning flag; amber = a warning acknowledged with a reason (warn-severity consistency checks included), or a hold ('needs review', 'still true?') that cannot be acknowledged away; grey = no check, not yet checked, or not yet supported; green = filled and checked, not approved |
| M13 'checklist item' at setup | 2.2 input, accept and example → "source checklist entry"; 3.3 authority → "document requirement lines", 3.3 exception → "source checklist entry"; 3.5 ready and rule, 4.1 action → "document requirement line". The case's "checklist item" is unchanged |
| M3 8.1 ready | "A form whose facts are missing or in conflict may render, but stops at 8.4 until they are resolved here." |
| M12 history gap | Controls: "until filled with a recorded history entry and checked again" |
| Sweep leftovers | 9.3 and 10.3 example headers "Copy" → "Form"; 8.1 example "confirmed" → "verified"; the representative sub-label now reads "RCIC, lawyer or notary, or paralegal", as in Who is who |
| 6.3 over-absolute | Accept, rule and example: "only 'still true?' items, missing facts and differences are asked" |
| IMM 5476 | Added to 1.1's source-set table as a base form, matching map stage 1 |
| M11 default holders | 9.3 prerequisite: "by default the firm's Owner and Case Manager roles hold it; on this page, normally the case's lead representative" (verified: SA-06 manifest line 90, "the professional approvals … stay on Owner and Case Manager by default; no licensed-representative role") |
| Term map not applied | Adopted the team's names: 9.3 "Case › Forms › Approve form" and 9.6 "Case › Lifecycle (government steps and letters)", both now marked as the team's screens; 8.2–9.2 "Form check view" → "Case › Forms › Form review", still marked proposed (the term map's recommendation) |

## Corrections to the draft 3 change record

The change record (`checks/one-pager-draft-3-annotated-map-2026-10-17.md`, section 5) marked **M10** and **M13** "Fixed". They were partly fixed: M10's failure route was inconsistent (C-M1 above) and M13 left about ten setup strings. Both are now fixed as listed above. That record is kept unchanged as the history of what was claimed at the time; this file is the correction.

## Verification

- Build: structural checks all passed (41 activities, 241 rules; ledger dispositions added for two draft 1 rules whose wording changed: 3.5#1 and 6.2#1).
- Browser suite: 149/149 (`checks/one-pager-draft-3-browser-checks-2026-10-17.json`).
- Visual check of views 5 and 6 at 1,440px: the new branch, message and start event are labelled, with no overlap left after one layout adjustment.
- Not done: a separate checker recheck of C-M1 (the checker asked for a targeted recheck of the three places it touches), a new-reader trial, a screen reader.

**Ready for the checker's targeted C-M1 recheck.** The detail-panel pass that follows (`one-pager-detail-panels-2026-10-18.md`) starts from this version, archived whole as `archive/ai-workers/*-v3-draft3-final-2026-10-18.*`.

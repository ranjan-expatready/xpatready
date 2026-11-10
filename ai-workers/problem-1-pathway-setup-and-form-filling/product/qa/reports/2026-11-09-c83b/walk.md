# C8.3 gate A walk by screens, re-run after #1440 (QA-345 fix), main 7e32ee210, 9 Nov 2026, 23:18–23:31 IST

Isolated copy qa_c83b on :4473 (`--ttl 150`, stopped by qa after the walk). Configured checkpoint loaded **by screen**: Demo › Load the configured checkpoint… › Load (`scripts/load_checkpoint.cjs`; "Configured checkpoint loaded in 119.1 s"; shots `walk/00a`, `walk/00b`). Headless Playwright at 1024 px, one pass, every press on a control a person sees (role and name). Page words: `walk-log.txt`. Data underneath: `logs/data-underneath.txt`. Live AI off, US$0.

The scripts are the 9 Nov round's (`2026-11-09-c83/scripts`), copied unchanged except: shots go to `walk/`; new stages `3f` (confirm the section; replaces 3d's first half), `look` (the representative opens one filing's review from the case and selects a form) and `reapprove` (the representative presses "Re-approve 1 changed form" on the principal's filing). Screenshots were cropped to their top 3200 px and halved to keep the folder at 5 MB (the full words are in `walk-log.txt`).

**Setup, not under test:**
* `scripts/setup_c83_case.mts` (`logs/setup-case.json`): a represented Visitor visa family case (principal 2654fd57, spouse 08d1bcbe), every fact answered and confirmed, each IMM 5257 validated copy read back. Nothing sent for review.
* `scripts/setup_c83_files.mts`, run twice (`logs/setup-files-1.json`, `-2.json`): the Adobe read-back of each IMM 5257 and the hand-signed IMM 5476 scans, simulated (no screen for the Adobe step). It reads back **every** barcode form whose item is not ready or done, so each run also made a second validated copy of the same facts for a form whose copy was already current. That turned out to walk #1440's C8.3-23 path (a second copy withdraws the approval) by screens; see steps 12 and 16.

## The walk
| # | Who | Step, by screen | Seen (page words) | Shot |
|---|---|---|---|---|
| 1 | Case officer | Ready to file › **Send for review**, both filings ticked › Send 2 | Each filing "Sent for review · Open the review" | 01–04 |
| 2 | Representative | **Open the review** › spouse: tick 6 items › **Approve** | Dialog, new words from #1440: "Each form is stamped with the facts it read and its file. A form with no file for these facts yet (a barcode form not read back) is stamped with the validated copy read back next. A later change to a fact withdraws only the forms that read it." Spouse "Approved". | 05–09 |
| 3 | Representative | Principal: **Send back…** with no reason, then with a reason | No reason: refused on the field. With reason: "Sent back" with the reason quoted. | 10–12 |
| 4 | Case officer | Ready to file; Open the review | "Sent back · Open the review"; the review is read-only for the officer (no Approve or Send back), reason shown | 13, 16 |
| 5 | Case officer | Client A tab › City or town of birth › **Edit** › SAMPLEVILLE › Save › **Confirm section** | "Entered by staff · to confirm" → "Confirmed" | 17–19 |
| 6 | Case officer | **Send for review**, principal ticked by hand (blocked: its IMM 5257 copy must be read back again) › Send 1 | "IMM 5257 for Sample Client A: no validated copy read back for today's facts…" | 22–23 |
| 7 | Representative | Round 2: only IMM 5257 "Changed since review" (SAMPLE → SAMPLEVILLE, Case officer) › **Approve** with nothing ticked › one confirmation | "Approved"; "Rounds of this filing: 1 sent back · 2 approved". Underneath: round 2's IMM 5257 `stamp_file_kind = none` (no current copy yet). | 24–26 |
| 8 | (setup part 2, run 1) | Read-back of both IMM 5257s; IMM 5476 signed and scanned | — | — |
| 9 | **Representative, QA-345** | Open the principal's review › IMM 5257 | **"Approved, still current · Stamped with the validated copy read back."** No Re-approve button. Underneath: round 2's IMM 5257 now `validated_copy` 47c9adf3; one audit line `review_stamp_file`: "Case officer read back the validated copy of IMM 5257 on case 0c3f0d36: stamped to the approval of round 2, which stamped no file" (`was: none`). | 26c |
| 10 | Representative | Open the spouse's review › IMM 5257 (its second validated copy of the same facts was read back in step 8) | Ready to file: spouse "Approval withdrawn". Review: "**Approval withdrawn: the validated copy read back since is not the file this approval stamped. Re-approve to stamp the file that is filed.**" and, on the next line, "Stamped with the validated copy read back. Details". Button "Re-approve 1 changed form". | 26d |
| 11 | Case officer → Representative | Spouse tab › City or town of birth → SAMPLETOWN › Save › Confirm section; then the representative opens the review › **Re-approve 1 changed form** | "Approval withdrawn: City or town of birth changed by Case officer (Sample), 9 Nov 2026." → "Round 3 · Re-approved after a change". Underneath: round 3's spouse IMM 5257 stamped `none` (copy stale). | 27–30 |
| 12 | (setup part 2, run 2) | Read-back of both IMM 5257s again | — | — |
| 13 | **Representative, QA-345 via P-412** | Open the spouse's review › IMM 5257 | "Approved, still current · Stamped with the validated copy read back." Underneath: round 3 → `validated_copy` fa55eab8; second audit line "stamped to the approval of round 3, which stamped no file". | 30c |
| 14 | Representative | Open the principal's review (a second copy of the same facts read back in step 12) | "Approval withdrawn: the validated copy read back since is not the file…"; "Re-approve 1 changed form" | 30d, 30e |
| 15 | Representative | **Re-approve 1 changed form** | "Round 4 · Re-approved after a change". Underneath: round 4 IMM 5257 `validated_copy` e8187de8 = the live copy's sha (stamped at approve, no move). | 30f |
| 16 | Case officer | Ready to file after the files | Both filings "Approved"; **no representative-review line open** | 31 |
| 17 | Case officer | **Pass with a reason…** on 38 warnings, then **Ready to file** on each filing | Both "Ready to file · Approved" (walk-log, stage 6; shot 32 is the case page); "Record the submission…" enabled | 32 |
| 18 | **Next capability, C8.2** | Case officer › **Record the submission…** | The dialog opens (its first step) | 33 |
| 19 | C8.2 | Representative of record: application numbers W123456789 / W123456790, today › **Record the submission** | "Recorded · read-only"; each filing "Submitted"; "**Prepared by · Reviewed by: Case officer · Representative**" | 34, 35 |

## Data underneath (`logs/data-underneath.txt`)
* `review_round_filing`: round 1 spouse approved, principal sent back; round 2 principal approved; round 3 (reapprove) spouse approved; round 4 (reapprove) principal approved. Every decision by user-R, the representative of record.
* `filing_review`: 4 rows, `reviewed`, user-R, licence R000000, one per approval.
* `review_round_form`, IMM 5257: round 1 spouse `validated_copy` 50cdeeae; round 2 principal `validated_copy` 47c9adf3 (moved from none on read-back); round 3 spouse `validated_copy` fa55eab8 (moved from none); round 4 principal `validated_copy` e8187de8 (= its `file_sha256` at approve).
* IMM 5476 (hand-signed, scanned in step 8) is stamped `generated_copy` in rounds 3 and 4, although its signed scan existed by then. The model knows only `validated_copy`, `generated_copy` and `none`; the concept names only the barcode form's file. Not judged here: a question for the Lead.
* `audit_event`: exactly 2 `review_stamp_file` lines (rounds 2 and 3), both by the case officer at read-back.

## Replays
* QA-345's check, fresh checkpoint copy qa_q345 (:4470), started and stopped in one command: **exit 0, 2/2** (`logs/check_qa345-7e32ee210.txt`). It was exit 1, 1/2 on cfaa199f4.
* The builder's `tests/check_c83_review_browser.cjs` at 1440 px on qa_c83b, 3 runs: **15/16 (exit 1), 23/23 (exit 0), 15/16 (exit 1)**. Both failures stop at line 141: after Tab onto the "Approval withdrawn" chip, the tooltip did not appear in 20 s (`logs/replay-browser-run1..3.txt`). #1440's builder saw the same stop once (#1440's PR description, "Note (flake)": "one walk run at the n1 code stopped at `check_c83_review_browser.cjs:141`, waiting 20 s for the chip's tooltip after a Tab press (16/17)"). qa's probe (`scripts/probe_tooltip_keyboard.cjs`, `logs/probe-tooltip.txt`): 1 of 12 Tab presses focused the chip and no tooltip opened.

* Later, on fresh copies: the builder's check 23/23 on a blank copy and 23/23 on a checkpoint copy; qa's `tests/qa/check_qa376_withdrawn_tooltip_keyboard.cjs` 0 of 40 Tabs missed on the blank copy, **2 of 40 missed on the checkpoint copy** (`logs/check_qa376-7e32ee210.txt`, `logs/check_qa376-checkpoint-7e32ee210.txt`, `logs/replay-browser-run4-fresh.txt`).

## Seen, not part of QA-345
* The principal's filing was approved twice (rounds 2 and 4) with no checklist item ticked, through the one confirmation BR-4 allows ("Approve with 6 items not ticked? … This is recorded.").
* IMM 5257's "Facts on this form · 110 facts" lists 110 rows for 68 distinct facts: "Current mailing address" 9 times, each telephone and fax number 8 times, "Date of birth" 3 times, all with the same value (`scripts/probe_facts_repeated.cjs`, `logs/probe-facts.txt`; shot 30e). IMM 5476 repeats one fact twice (the 9 Nov round saw this one, untraced).
* After a second copy, the withdrawn form reads "Approval withdrawn: the validated copy read back since is not the file this approval stamped…" directly above "Stamped with the validated copy read back." (shot 30e). The button reads "Re-approve 1 changed form", though no fact changed.

## Not covered
* One pass at 1024 px; 400 px not walked; 1440 px only through the builder's check. No headed browser in this cloud copy; the shared demo :4400 is not running here.
* The approve-time line "The validated copy read back next for these facts is stamped to this approval" on round 2's IMM 5257 (before the read-back) was not selected on screen; the stamp kind `none` was read underneath.
* An Online barcode form; regenerating a copy with the same bytes (same sha); a change of representative; two tabs.
* The database guard's refusals (another sha, back to none, another column) were not probed by qa; the pack's C8.3-22 covers them and passed.

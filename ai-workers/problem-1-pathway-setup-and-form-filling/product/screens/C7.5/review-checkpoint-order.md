# PR #1411: checkpoint field-map review order, independent review (screen-reviewer, 9 Nov)

**Reviewed:** exact head `6a5c80c933cf29c727381c9e11fb0fb9d1b78b6d` (`claude/determined-maxwell-f33ogl`). I worked in a worktree fixed at that commit that nothing else used. My copies ran only on :4438 and :4439, and both are stopped. Live AI was off and nothing was spent (US$0). The done-when is Lead 39 on #1396, option (a).

## Verdict: Block. One Blocker (B1).
The fix does what the done-when asks: two fresh loads give one sheet. But the new order also changes **which shared field** IMM 5257's form fields map to, not only the wording. Two Works packs that score on the checkpoint go red: C10.1 drops from 28/28 to 25/28, and C7.6 from 27/27 to 24/27.

## What I ran
| Check | Result |
|---|---|
| `tests/check_checkpoint_review_order.ts` at head | 5/5 |
| The same check against 4eabbaa's start-time order (copied from `git show`, outside the worktree) | 2/5, so it fails first as the PR says |
| `tests/check_checkpoint_sheet_stable.ts`, fresh copy rv1411a :4438 | 5/5, `effce263ca43` on both loads, "Date of birth of the person" |
| The same check, second fresh copy rv1411b :4439 | 5/5, `effce263ca43` on both loads |
| A fifth fresh load (:4439, `POST /demo/load configured`) | all 19 drafts applied, showcase IMM 1294 (1 edited, 1 returned) |
| `C10.1.test.ts` on the checkpoint (:4439) | **25/28.** Red: R12b, R12d and part B, which reports `["2 out","7 partial","12 partial"]` |
| Gate B on the checkpoint (:4438, one slot): C9.5 · C7.6 · C1.3 · C9.1 | 49/49 · **24/27** · 55/55 · 17/17 |
| `C7.6.test.ts` again on a fresh load (:4439) | 24/27. Red: -5 (`missing_facts` stays), -12 and -19 (Ready to file refused 409) |
| Baseline, main `3614e35` (+#1386, which does not touch the checkpoint), queue run 42581145689 | C10.1 28/28 (job 129042301570) · C7.6 27/27 (job 129042301617) |

This PR's own CI jobs (`packs`, `regression`, `ci`) were **skipped** at this head (check runs on 6a5c80c), so nothing else has run the affected packs yet.

## Done-when, point by point
* **The order no longer depends on start time.** `reviewOrder` sorts by file name, then run file, then job id, comparing by code unit with no locale. The showcase is the draft with the most proposals, and a tie goes to the first in the order. On the real data that tie exists: IMM 1294 and IMM 5710 both have 95 proposals. Before, start time decided which one was the showcase; now it is always IMM 1294 (`CAQ number … (as asked on imm1294e.pdf)` edited, `casecaqexpirydate` returned).
* **Two fresh loads give one sheet, with a fail-first check.** Met: 2/5 before the fix, 5/5 after, `effce263ca43` on 4 of my loads.
* **Nothing else in the load still decides a field's meaning by timing.**
  * `ingest` reads only the library and the run file.
  * `insertProposals` has a "first new" twin rule that is timing-dependent (`orderBy createdAt` across concurrent ingests). It changes only `reuse`, `relatesTo`, confidence and reason, never the key or the meaning.
  * `apply` lands `proposedMeaning` from the first applied draft.
  * Steps 060 and 310 sort by `createdAt` then `identityKey` over rows written in sequence. Steps 070, 130 and 150 approve, which does not change a meaning.
  * Steps 130 and 325 (rule facts) add a field only where it is missing.
  * IMM 5645's merged run uses the library as it stands before 040.
  * I found nothing else.
* **Fixture run b4936d0b is not affected.** 040 runs only in the checkpoint (`grep`: only `095-questionnaire.ts` imports it), and the fixture builds its library through its own setup.

## Issues
**B1 (Blocker, Must): the order also decides keys, and two Works checkpoint packs go red.**

`040-field-map-review.ts:20-24` with `sources.ts:772` (`decidedKey = rec?.key ?? matchedKey ?? proposedKey`). A draft applied later is compared again with the library that the earlier drafts already filled. Its near-duplicate key is then recommended onto the existing field.

Under start order, IMM 5257 started first on every load I saw (03:20:07.329 in the database's America/Toronto time, 08:20:07.329 UTC, 13:50:07.329 IST, on copy B; tied first with IMM 5257 SCH1 on copy A), so its own keys landed. Under file-name order, `imm0008depe.pdf`, `imm0008e.pdf` and `imm1294e.pdf` come before it. On the loaded copy:

| What IMM 5257 proposes | What it now maps to | Why |
|---|---|---|
| `person.other_given_names` | `person.other_given_name` | AMBIGUOUS |
| `person.us_green_card_expiry_date` | `person.us_pr_card_expiry_date` | AMBIGUOUS |

The library holds 0 rows of either IMM 5257 key. `samples/own-yes-no.json` (vv.single, IMM 5257) asks both as follow-ups, so **DEMO row 7 turns partial**: "person.other_given_names: not asked in the library … person.us_green_card_expiry_date: IMM 5257 does not ask it …".

Row 12 turns partial too. All four copies say "reads different answers from the copy that was validated" (`sample-validated.ts:126`, the family-facts hash). C7.6 keeps `missing_facts`.

My comparison on the loaded copy: about 80 shared fields that more than one draft proposes now take a wording other than the one the start order put first. Most of them now come from IMM 0008 Schedule A rather than IMM 5257, for example "Country where the person currently resides" on IMM 5257's own sheet.

The PR's "Nothing else in the load changes" and "either of two" wordings understate this.

*Fix:* keep a deterministic order, but one that lands the drafts in the order the load intends. For example, use the batch plan's target order: the six's combination order, then each form's place in it. Keep file name, run file and id only as tie-breaks, so the Visitor visa's IMM 5257 drafts land first as on main. Then:
* re-run all 19 checkpoint-scored Works packs (`works-set.mjs --list --milestone all`), with C10.1 at 28/28 and C7.6 at 27/27;
* re-measure the sheet, which will no longer be `effce263ca43`;
* in the PR, say that the order decides keys as well as wording.

**m1 (Minor, Should): the "saved answer" tie-break can vary from load to load for a merged run.**

`040-field-map-review.ts:12` (`runOf`) says the run file "tells two drafts of one form apart from load to load". IMM 5645's run file is written during each load with the time and a random suffix (`studio-fieldmap-imm5645e-merged-20261109t081034266z-06a4c5.json`). With one draft per form today this has no effect.

*Fix:* drop the time and suffix in `runOf`, or correct the comment.

**m2 (Minor, Should): the stability check guards only the sheet and the date-of-birth wording.** It would have passed with B1 present. After the fix, its evidence should cite the C10.1 and C7.6 runs on the checkpoint.

## D1–D20 (loader fix; screen dimensions N/A)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | The done-when is met, but DEMO row 7 regresses (B1) |
| D2 Data integrity | 2 | IMM 5257 form fields now map to other forms' keys; two of its own keys are missing (B1) |
| D3 Reuse | 4 | The near-duplicate merge is the product's own rule; only the landing order moved |
| D4 Rule integrity | 2 | IMM 5257's own Yes/No follow-ups are no longer reachable (row 7) |
| D5 Stability and recovery | 4 | Deterministic: 5 fresh loads, one sheet, 19/19 drafts applied |
| D6 Freshness and governance | 4 | Each landed field still names its source draft (`sourceRef`) |
| D7 AI trust | 4 | Replayed answers only, US$0; the showcase edit and return are visible |
| D8 to D14 | N/A | No screen changes; the Review page was walked unchanged (journey) |
| D15 Speed | 4 | Load 106 to 109 s here; main's queue runs took 138 to 145 s on GitHub |
| D16 Testability | 3 | A pure fail-first check (2 to 5 of 5) plus a 2-load check; neither catches B1 (m2) |
| D17, D20 | simulated only | No intended user walked it |
| D18 Provenance | 3 | The sheet now labels IMM 5257 boxes in IMM 0008 Schedule A's words |
| D19 Capability closure | 2 | The checkpoint story regresses: row 7 and row 12 partial, C7.6 Ready to file refused |

BIC-01 to BIC-20: N/A. This PR changes no case-side screen; the run card was seen unchanged in the journey.

## Journey (reviewer's one score; limited to the pack's case on the checkpoint)
I walked as the case officer, with a headless Chromium driven like a person and the keyboard for Open Review. The path was the pack's case page › Open Review › the IMM 5257 run card. Screenshots at 1440, 1024 and 400 px are in scratch only, because I may write no other file.

What I saw:
* the page in 122 ms;
* Saved disabled: "No saved review of this form edition with these values yet";
* Live disabled, with its cost and the approval words;
* the source shows "Date of birth of the person (DD/MM/YYYY)";
* axe WCAG 2.2 AA: 0 violations; no sideways scroll; no console errors.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | One stable sheet; nothing can run until the paid run, as intended |
| Next step obvious | 1 | Each disabled mode says why and what to do |
| Plain words | 1 | No ids on the card |
| Feedback and state | 1 | Steps marked "(waiting)"; the action is disabled with its reason |
| Correct data | 0 | "Nothing else changed" fails: IMM 5257 keys moved, row 7 partial (B1) |
| Error recovery | ½ | Row 7 names its gap in words; not exercised further |
| Accessibility and screen sizes | 1 | axe 0; 1440, 1024 and 400 px with no sideways scroll |
| Speed | 1 | 122 ms |
| Visual quality | 1 | The same as before (1024 px screenshot) |
| Trust and sources | 1 | Stand-in chip, AI marked, cost first |

**Score: 8/10 with a 0, so it does not pass.** Fixing B1 raises "correct data".

## What I could not check
* A real screen reader.
* The other 14 checkpoint-scored packs (I ran 5 of 19).
* Main's code locally (my baseline is GitHub's queue run on `3614e35`).
* The C7.6-screen pack, which writes committed screenshots.

## Hand-back
**Verdict: Block.** To fix: B1, then m1 and m2.

## Re-review (diff only, P-293): `6a5c80c..cfa115b`, 9 Nov
**Reviewed:** exact head `cfa115b1060f201632d720344ceda302289d732b`, in the same isolated worktree. The diff has two parts:
* `7430dd3`, the fix: `040-field-map-review.ts` and both checks;
* `cfa115b`, which adds only this report.

I ran fresh copies on :4438 and :4439, and both are stopped. Live AI was off and nothing was spent (US$0).

| Check | Result |
|---|---|
| `check_checkpoint_review_order.ts` at head | 6/6 |
| The same check against `6a5c80c` (file-name order), copied out of the worktree | 3/6 |
| The same check against `4eabbaa` (start-time order), copied out of the worktree | 3/6 |
| `check_checkpoint_sheet_stable.ts` on two fresh copies at once (:4438 and :4439, 4 loads) | 7/7 and 7/7 |
| Gate B on the checkpoint, `C7.6.test.ts` (:4438, fresh) | 27/27 (baseline on main 27/27) |
| `C10.1.test.ts` on a fresh checkpoint (:4439) | 28/28 (baseline on main 28/28) |

What the stability runs showed:
* every load gave sheet `123a97599291` and the date-of-birth wording "Date of birth";
* the published library had md5 `2687b1af…` on all 4 loads;
* both IMM 5257 keys, `person.other_given_names` and `person.us_green_card_expiry_date`, are present;
* on both copies the `draft_field_maps` plan lists its targets in the same order (md5 `dcc7044a…`), with IMM 5257 first, then SCH1, then 5707 and so on. IRM 0002's batch comes last.
* all 19 drafts were APPLIED.

**B1: closed.** `reviewOrder` sorts in this order:
1. the batch, by its own start (the load creates its batches one after another);
2. the draft's place in that batch's `plan.targets`;
3. file name, run file and job id, as tie-breaks only.

A job's start time is never read. The plan order is built from the six's combination order and each combination's attachments by `createdAt` (`ai.ts:89, 109`). It was the same on both copies, it keeps main's keys, and the two red packs are green again. The showcase is still IMM 1294, because the plan lists it before IMM 5710.

**m1: closed.** The comment on `runOf` now says it is only a tie-break, and the doc comment says the order decides keys.

**m2: closed.** The stability check now also compares the whole published library (key=meaning, md5) and asserts both B1 keys. Either way B1 can return, the check now fails.

**Note (no finding).** Two batches that start in the same millisecond would fall back to ordering by batch id, which is random. The load creates its batches seconds apart (5 s on these copies), so this cannot happen there today. The PR body now says that the order decides keys as well as wording, and that the expected sheet is `123a97599291`.

No new finding. The journey criterion "correct data" rises to 1, because IMM 5257's keys are as on main and rows 7 and 12 pass in C10.1. The journey is **9/10, a pass**.

Not checked:
* the other 15 checkpoint-scored packs (this round I ran C10.1 and C7.6; the builder reports 10 green);
* C7.6-screen, which writes committed screenshots;
* a real screen reader.

**Verdict: Approve cfa115b1060f201632d720344ceda302289d732b**

# Review of the move: C7.7 part 1 onto the new base (commit c528dc3d)

Scope: the move of PR #357 only. The branch is `claude/runtime-deliverables-3` at c528dc3d. Its base is `claude/runtime-answer-sheet-3` at 7595e170 (#358 rebased onto the new #356). I compared the old approved diff (`git diff dd16d505 b979cdff`, Approve in round 2 on 7a07e52b) with the new one (`git diff 7595e170 c528dc3d`). The content was reviewed in `review.md`; it is not re-reviewed here.

Setup:
* My own fresh clone at c528dc3d with its own `node_modules`, so `prisma generate` never touched /home/user/xpatready.
* Isolated copies on :4450, :4451 and :4452, each with a fresh database, all stopped and dropped afterwards. :4400 and 4440–4449 were not touched.
* Live AI off, US$0.

## Nothing approved was lost
* `git range-diff dd16d505..b979cdff 7595e170..c528dc3d` matches all three commits one-to-one. The same 13 files changed, with +315/−18 in both diffs.
* The only content differences are the three expected conflict resolutions below. Everything else is the same, line for line: `engine/runtime/team.ts` (`representativeAnswers`, stored key order for B1), `p5/transforms.ts` (`derive_inverse`, phone and country steps for M2), the client-view exclusion and never sending firm answers as seen (M1), the samples, `qa/built/C7.7.md`, `check_p5_engine.ts`, and the round-2 records.

## The conflict resolutions are right
1. **`web/src/runtime/questionnaire.tsx`.** The order is now: declaration → "Only the client makes this declaration"; then a firm-record answer → "Change it in the firm record"; otherwise the Edit/Add button.
   * Main's declaration rule is kept and comes first. A firm-record answer is never a declaration, so the order cannot hide either rule.
   * The firm note changed from `<span>` to `<p className="max-w-40 …">`, the same as the declaration note. This is only a visual match.
   * `seen` still leaves firm answers out. `ConfirmPill` and `CHANNEL.firm_record` are unchanged.
2. **`api/src/runtime.ts` imports.** Main's `aiLive` import (used by `review()`) and C7.7's `representativeAnswers, type Member` are both present, with no duplicates. The `state()` hunk is unchanged.
3. **`tests/check_vv_prepare_api.ts`.** The loop now runs `["C6.12", "C11.6", "C7.3", "C7.7"]` and the header names all four. C7.3's tests were not dropped.

## Results on my fresh copies
| Suite | Result |
|---|---|
| `check_vv_prepare_api.ts` (:4450) | **37/37**. Pack 4: C6.12 24/24, C11.6 14/14, C7.3 13/13, **C7.7 18/18**. The C7.7 B1, M1, M2 and m1 lines pass. |
| `check_vv_prepare_store_api.ts` (:4451, fresh) | **34/34**. The builder reported 33/33. All pass, but the count differs; my run is the newer one. |
| `runtime/check_c611_team.ts` (:4452, after `setup_visitor_visa.ts`) | **59/59** |
| `runtime/check_case_engine.ts` | **57/57** |
| `tests/check_p5_engine.ts` | **33/33** |
| `tsc -p web` | clean |
| `vite build` | builds |
| `tsc -p api` | 10 errors, all in test files (`check_vv_checklist.ts` 6, `check_x2b_bulk_apply.ts` 3, `check_c18_age_case.ts` 1). The same 10 are on the base 7595e170, and no C7.7 file is among them, so this PR did not add them. "tsc clean" holds for `api/src`, not for `tests/`. |

## How C7.7 now works with the base's C7.3 (new on this base)
* The C7.3 answer sheet reads `Runtime.state()`, which now also returns the firm-record answers.
  * The only Online form in the Visitor visa release is IMM 5707. IMM 5476 is a PDF upload.
  * On my copy, no IMM 5707 sheet holds a `representative` subject.
  * So the firm values do not reach the sheet, and they do not change its section fingerprints.
* C7.7's derived "has any children" does reach the IMM 5707 sheet as a confirmed answer (`person.has_children = true`). That is right: it is not listed as waiting.
* **Minor r1 (new, from the two rows together).** On the sheet, that derived answer's source reads "Case officer". The cause: `sourceOf()` in `engine/runtime/answer-sheet.ts:33` treats any channel that is not a document and not the questionnaire as the officer, including no stored answer and `firm_record`. The answer is actually worked out from the people on the case. Fix (owned by C7.3): give derived and firm-record values their own source word, and test it. This does not block, because the value is correct and the officer types it.

## Browser look (headless chromium, :4450, case officer, a Visitor visa family case of 4 people)
* The representative tab reads the same as in round 2:
  * every firm value shows "From the firm record" and "Change it in the firm record";
  * there are 0 Edit buttons, and all 3 Confirm section buttons are disabled;
  * the phone shows "+1 4165550100".
* axe WCAG 2.2 A/AA found 0 violations at 1024 px. There is no sideways scroll at 1024 or 400 px. Tab reaches the panel's parts.
* The client's questionnaire (Client A) has 0 representative-subject sections and 0 firm-record answers.
  * The words "Representative and authorizations" seen there are each client's own phone and e-mail. The release places them in that section; they are not the firm's data and not from this PR.
* Screenshot (not committed): /tmp/claude-0/-home-user-xpatready/996db592-b798-557c-8d10-93d97a7e840a/scratchpad/w3/r3-rep-tab-1024.png

## Journey score (reviewer, the round-2 journeys 1, 4 and 5 walked again on the moved code)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | The block is filled from the firm record. The C7.7 B1 line passes: a new copy is current. |
| Next step obvious | ½ | n2 is still open: fax Add leads to "That person is not on this case." |
| Plain words | ½ | n1/n3 are still open: the lower-case "representative" tab, and `canada`. |
| Feedback and state | 1 | Read-only lines; Confirm is disabled. |
| Correct data | ½ | `canada` in lower case (n1). r1 is about the source label, not the value. |
| Error recovery | ½ | Fax Add gives a 404 message. |
| Accessibility and screen sizes | 1 | axe 0; 400 and 1024 px fine; keyboard reaches the panel. |
| Speed | 1 | The page settles in about 1 s. |
| Visual quality | 1 | Team look; the firm note matches the declaration note. |
| Trust and sources | 1 | "From the firm record" with its tooltip. r1 is on C7.3's sheet. |
**8/10, Pass** (no criterion at 0). This is the same as round 2.

## Not checked
* A real screen reader, 200 % zoom, and the declaration branch in the browser (the Visitor visa release has no declaration question; the branch was read in code only).
* The demo database.
* D17 and D20 stay with the founder.

**Verdict: Approve** for commit c528dc3d.
* No Blocker or Major is open. Nothing approved on 7a07e52b was lost, and the three conflict resolutions are right.
* Minors carried over: n1, n2, n3, n4, m2, m3, m4, m6 (from `review.md`).
* New: r1, the answer sheet's source label for derived and firm-record values. It goes to C7.3's owner or the PR's Questions for the Lead.

# Independent review — B97, release 2 through B81's step (PR #1085, commit c930dcab7)

5 Nov 2026; read-only, live AI off, US$0. Paths are under `prototype/studio/`.

**Verdict: Block (changes needed).** The loader's release 2 reads right. Four checks that row 9 now breaks were not updated: they still say the Visitor visa has one release. Two Majors, both in tests. No Blocker. Do not label `review: approved` at c930dcab7.

**Read:** `git diff origin/main...c930dcab7`; `demo.ts` against 4a09bcd86; the 3 commits on `demo.ts` since it; `forms.ts`, `engine/options.ts`, `engine/channels.ts`, `form-masters.ts`; the checks that load the checkpoint; #1009's rulings; nightly run 41987883260's log. One read-only script read IMM 5645's choices from `p1/inventory/imm5645e.inventory.json`; `select-suites.mjs` listed the PR's suites.
**Not run (the tech lead's rule):** no test copy, browser, suite or database read. No walk, axe or keyboard pass. `graph.mjs` not run (this check writes one file only). D1–D20 not scored: this row is a loader and adds no screen. Every failure below comes from reading the code; none was seen in a log.
**Seen, not re-run:** run 41987883260 at this head ran packs only, its `suites` job was skipped: C10.1 22/24 (the two reds are R12b and "every row", as ruled; "every row" lists rows 2, 7, 10 and 12, not 9), C4.8 and C9.1 succeeded.
**PR CI (run 41988541203), read 13:19 IST:** kind, types and Devin Review pass; shards 1–6 not finished. So no suite result at this head. Mergify checks skipped. No label.

## Majors

**M1. `tests/check_c10_1_configured.ts:111` contradicts `:121` in the same file.**
* `:111` needs `count(config_release) for 'Visitor visa' === 1`; `:121`, new here, needs `>= 2`.
* Fail case: any load where row 9 is done gives 2, so the step "the Visitor visa is released (QA-144 slice 1)" fails. The other branch (`=== 0`, `:110`) fails too. At 4a09bcd86 this passed only because Submit refused release 2.
* `select-suites.mjs` picks this suite for the PR, so a shard should show it.
* Fix: `>= 1` at `:111`, or count `version = 1`.

**M2. Three QA-144 checks still read one release. The PR's suite list does not pick the two suites, so the merge queue's full run would be the first to show them.**
* `tests/check_qa144_vv_release.ts:52`: `order by version desc limit 1` must equal `1|user-B|user-A`. It now reads version 2, so `released` is false. `:53` fails; `:54`'s branch fails too, because the draft has no errors left.
* `tests/check_qa144_vv_release.ts:63`: rules jobs on the Visitor visa must equal its attachments other than IMM 5645. `sectionsFrom` at `demo.ts:871` adds IMM 5645's job, so it is N+1 against N.
* `tests/check_qa144_sp_release.ts:52`: `count(config_release) === 1` for the Visitor visa, once IRM 0002's map is present (the saved map #891 replays). It is now 2.
* `tests/qa/check_qa144_vv_walk.cjs:51`: the same `=== 1`. It is a qa walk, not a suite.
* Fix: read `version = 1` at `:52`; at `:63` count the family form by how IMM 5257 is filed, as `:116` already does; `>= 1` at the other two. Then run these suites with the row.

## What was asked, and what I found

| Check | Finding |
|---|---|
| `sectionsFrom` against main's inline code | Same on the first pass. Two differences. `lists` defaults on, so the same filter. Runs narrow to `attachmentId in forms`; main read every rules job of the combination. A rules job for an attachment outside `forms` would need the family form taken off to have been drafted, and it is not, and a second load is refused. An edition drafted for another combination stays outside `combinationId` either way (`form-masters.ts:290`). |
| Lost from main since 4a09bcd86 | `demo.ts`: nothing. Its 3 commits touch only row 9's read-only path and the `RUNTIME_ACTORS` import, and that import's removal is kept. `forms.ts`: only the unused method goes. `checkpoint-words.ts`: **one line lost, see m1.** |
| Marks | Right. `demo.ts:863` marks only `!code && !asks_more && !printed.length`. The server also refuses a wrong mark (`forms.ts:290`), so removing the filter fails the row. The inventory agrees: 13 fields print 7 choices with no "Unknown". The 2 fields printing two Married choices are not marked. I could not read why they do not block Submit (no database), but R9 is green. |
| Shortcuts | None new. Author, SME and a different Approver use their own methods, and `setOptionMaps` is the person's route with `need(actor, "author")` and a base revision. `seedSampleSources` writes directly, as release 1 does (ruling on #558, demo workspace). |
| Order, what later steps read | Rows 11 and 12 run first, on release 1 (`demo.ts`, `fam` before row 9). `released` and `visitor` are set before it, so row 10 keeps "Release 1 of…". Only `vvReleases` and row 17's `users` read afterwards, and row 17 counts the same IMM 5476 lines. Drift: approval makes the draft match release 2. At 4a09bcd86 only the Visitor visa was exempt, so the other drafts did not move with these steps. Not run. C9.1 P-67 is green in the log. |
| Other checks that load it | `check_b52_own_yes_no.ts:63` reads the preview's "read by IMM 5257" with that form now Online. PDF editions stay in the snapshot (`engine/snapshot.ts:162`), so I expect it to hold; not proven. `C1.3:92` opens a new case on release 2 and reads only the offer, which IMM 5645 does not change (no employer fact, by reading). |
| Words | Done: labels and counts only, no field code, no form number from the new step. Refusal: `releaseTwoWords` names the step. `optionMapProblemsIfFiled` and the old shape: no reader left in code or tests (only review notes). |
| Rules 4 and 5 | "Sample, Unconfirmed: expert" is on the row. No personal names. See m4. |
| Do the tests fail when it goes? | `:121` and `:122` yes (no release, or no mark; a wrong mark is refused so the row is not done). `:123` yes (warning). `check_c101_release_two_words.ts`: step, count from `errors[]`, and own words each have a fail case. Browser: see m6. |

## Minors (none holds the merge alone)
* **m1 Lost from main.** `checkpoint-words.ts:34` dropped `.replace(/\.$/, "")`, and the test dropped `!/\.\./`. Fail case: the test's own IMM 5476 problem reads "…but nobody signs it.. Visitor visa's draft…". Restore both.
* **m2 Results that reach nobody.** `sectionsFrom` at `demo.ts:871` pushes to `sectionsHeld` and `sectionsRefused` after row 7 was written, and row 9 never reads them. Fail case: IMM 5645's rules draft is refused, or a section has no printed heading: row 9 says done and nothing lists it, against QA-206 (listed as refused). I could not see whether today's data hits it. Say them on row 9.
* **m3 For the tech lead.** A refusal leaves the Visitor visa's draft changed, as the words say. That is what 74020332e removed ("a waiting row must not leave the checkpoint's draft worse"). It happens only if release 2 stops passing, and the drift step would then go red. The restored path was asked for, so I do not hold on it.
* **m4 Marks' citation.** `demo.ts:896` names label and count, not the edition or the printed choices. Ruling (c') says "cited from IMM 5645's printed choices". It would also say "on 1 form fields".
* **m5 Hard-coded (P-319).** Restored, not new: `checkpoint-words.ts:7` and `demo.ts:848`, `:896`. Main took these from `FORM_SETUP` and `FAMILY_FORM_BY_CHANNEL`. The refusal words could name a form other than `fam.form`.
* **m6 Browser and comments.** `check_c10_1_browser.cjs` no longer has a step for row 9, so it stays green if row 9 goes back to waiting (the API check catches that). Stale comments: `check_c10_1_configured.ts:117`; the "11 + 2" in `check_c101_release_two_words.ts`'s header.
* **Still open from round 4:** R4-m1 (the "filled by hand" words) with the tech lead.

## Journey score
**7/10, provisional, not a walked score.** Nothing walked and no journey report, under the tech lead's rule. Task completed 1 (pack's R9) · next step 1 · plain words ½ (m1) · feedback ½ (m2) · correct data 1 · error recovery ½ (m3) · accessibility ½ (not run) · speed ½ (load 62 s in the pack, not judged) · visual ½ (not seen) · trust ½ (m4).

**Verdict: Block (changes needed).** To fix: M1 (`check_c10_1_configured.ts:111`), M2 (`check_qa144_vv_release.ts:52,63`, `check_qa144_sp_release.ts:52`, `qa/check_qa144_vv_walk.cjs:51`). A next check needs only that diff and the suites' result at its head. The Minors do not hold the merge.

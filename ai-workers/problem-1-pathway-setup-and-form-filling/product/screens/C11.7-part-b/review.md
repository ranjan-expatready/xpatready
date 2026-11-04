# Review: C11.7 part B, Provincial nominee from its paper twins (PR #881)

Independent reviewer (Opus, P-303), head **54410819** against origin/main d4146dbd, 4 Nov 2026; I did not build this.
Copies `rev117` :4720, `rev117b` :4722, `rev117q` :4721, all stopped and dropped. Live AI off, US$0, no priced button.
Journey report: `journey-test-reviewer-2026-11-04.md`, score **8.5/10** (a journey pass; the Block comes from the code review).

**Verdict: Block** (changes requested): 3 Majors, no Blocker. The lines go through the product's own services and the
builder's pack case 2 reasoning holds, but the new proposal turns three existing checks red, and Works is claimed at 20/21.

## What I ran (this head)
| Run | Result |
|---|---|
| `tests/check_forms_c117_part_b.ts`, fresh copy, run 1 and run 2 | 19/19, 19/19 |
| `acceptance/C11.7.test.ts` | 20/21. Only part B case 2 (certificate) is red, as the PR says |
| `tests/check_s7_load.ts` | 23/23 |
| `tests/check_d1_reset_to_six.ts` | 25/25. A first run read 24/25 because another session's C9.1 fixture in the same working tree set the p2/runs files aside. Re-run alone: green |
| `tests/check_c10_1_configured.ts` | 28/28 |
| **`tests/check_queue_tx.ts`** | **7/8, FAIL** "the queue holds every replayed proposal": the database has 671 waiting, the replays have 670 |
| **`tests/check_d1_reset_to_six_browser.cjs`** | **24/25, FAIL** line 124: the screen's "AI proposals waiting for review" reads 670, the database has 671 waiting |
| **`acceptance/C10.1.test.ts`** | 12/23. The 10 part B and row 10 fails are already recorded (C10.1 Partial). **The "rows 3–4" case is newly red:** after the configured checkpoint, 1 waiting proposal has a `run_id`, the certificate's LOCAL `requirement_type` job (SQL on the copy) |
| Reviewer browser journey (1024 and 1440 px, keyboard for Reset) | see the journey report |

## The eight questions
1. **Product services only, no form number in code: yes.** `linesByHand` (demo.ts:335–356) calls `FormLibrary.attach`
   (form-library.ts:374–396, with its 404, 409, retired and approved-edition refusals), `Forms.setChannel` (forms.ts:82, with
   the C-3/C-4 accepts check) and `Studio.saveRequirement`, all as user-A. None of the added demo.ts lines names an IMM
   code (grep: 0). The codes are data in `samples/wave1.json`. A refusal goes through `loadClaimed`'s catch
   (demo.ts:104–113): "Loading stopped after … Reason: …", so it is loud.
2. **Clear of the LMIA lines: yes.** The hunks are at 21, 57, 67, 252, 269 and 318–356. The LMIA code is at 41–200, and
   #837's demo.ts hunks are at 23–29 and 132–190. They are not adjacent, so a textual merge is expected to be clean. Only
   the setup with `lines` (pnp.express_entry) is touched.
3. **US$0: yes.** No AI call was made: the job is `mode LOCAL` and `cost_usd 0`, there are 0 LIVE jobs, and the response has
   `cost_usd: 0`. The walk clicks no priced button, and the Forms text has no "Draft with AI (about".
4. **No document type written, and the certificate waits as a person-named proposal: correct, and the reasoning holds.**
   Both writers of a `document_requirement` need the type in the library first:
   * `studio.ts:852` fails "Choose a document type, or name a new one." A new name only creates the proposal (`:849` returns `waiting`).
   * `proposals.ts:396` refuses a line whose type the library lacks.

   Part A (`C11.7.test.ts:57`) requires `count(document_type) = 0` after the same load, and case 2 (`:73`) requires a
   required line on that load. So case 2 can only pass by writing past the rules, and the builder rightly declined to. The
   ruling belongs to the tech lead (the pack is qa's). The proposal is `basis SAMPLE`, `origin rules` and shows "Rules" on
   To review. Accepting it gives a DRAFT type with its library ADD WAITING. Observation, not this PR: user-A can accept a
   type it named itself (tested). The second person is the library approver (existing C3.6 behaviour).
5. **Order effects: partly.** `proposals_waiting` is counted before `linesByHand` (demo.ts:317), so the response, the
   result dialog ("AI proposals waiting for review 670") and the audit text ("670 AI proposals waiting") stay accurate as
   AI counts. `check_s7_load` and `check_d1_reset_to_six` filter `origin='ai'` and pass. Two existing checks still compare
   with *all* waiting proposals and now fail (M1). `lines_by_hand` is an added key, so the response stays compatible
   (App.tsx ignores it). A second Reset to the six gives the same lines and the certificate waits again (suite, last check).
6. **A pass and a fail per rule: mostly.** Forms, Online and the certificate each have a pass and a fail. The suite has no
   waits (no `until`). The walk's only long wait (`waitFor detached`, 180 s) throws when it times out. Gaps are under Minors.
7. **Immigration values: labelled Sample.** The forms come from P-109 (the founder's decision), Online from P-171 (3)
   (Sample), and whose form each is is Sample. For the certificate, the `basis` says no page in `official-sources/ircc/`
   names it. I confirmed that: `pdftotext` over checklists and instructions plus grep over the HTML pages found no
   "nominat". Its quote is P-109's words with "Sample: no counsel".
8. **`check_c10_1_configured.ts` row 4: the intent is kept.** "Replayed" is exactly `drafting_job.mode='REPLAY'`. On the
   configured checkpoint the only other run-linked waiting item is the certificate, a person's proposal (SQL above). But
   the **C10.1 pack has the same old query** (`acceptance/C10.1.test.ts:35`) and was not changed, so it is now red (M2).

## Issues, ranked
**M1 (Major, must): two existing suites go red.** `tests/check_queue_tx.ts:51` and `tests/check_d1_reset_to_six_browser.cjs:124`
compare the replay count with `count(*) … status='waiting'`, which now includes the certificate. Neither is in the PR's
"Checks and results" list. Fix: count the replayed AI proposals in both, with `origin='ai'` as `check_s7_load.ts:75` and
`check_d1_reset_to_six.ts:88` already do. Or say in the result that one person-named proposal waits too, and test that.
**M2 (Major, must): the C10.1 pack's case "rows 3–4" turns red** (`acceptance/C10.1.test.ts:35`, `run_id is not null and
status='waiting'` = 1). Either the configured checkpoint lets user-B decide the certificate and the author add its line,
through the same services as rows 4–5 (demo.ts loadConfigured). Or the tech lead agrees the pack's query reads
`mode='REPLAY'`, as row 4's suite now does. That is qa's pack, so it needs the tech lead's OK in this PR.
**M3 (Major, must): "Claims Works: C11.7" while `C11.7.test.ts` is 20/21.** Gate B (`tools/gate-b.mjs`, P-214) runs the whole
pack for a Works claim, so CI cannot pass at this head, and "Works means confirmed" (WAY-OF-WORKING) is not met. Fix: get the
tech lead's ruling and the pack change in this PR, or claim `Capabilities: C11.7 (part B cases 1, 3)` until then.
**m1 (Minor, should):** the suite takes its expected forms from `wave1.json` (check_forms_c117_part_b.ts:21–23). A form
dropped from the data would still pass all 19 checks. While I ran, another session's mutation of `wave1.json` (IMM 5476
removed) showed this. Pin P-109's five in the suite, as the pack does (tests may name forms; P-319 is about product code).
**m2 (Minor, should):** plan item 3 promised a failing test of the *load* stopping when a line names a form the library
lacks. The suite only tests the route (`POST /combinations/:id/forms`, 404). It does not test that `linesByHand` stops
Reset to the six with that reason.
**m3 (Minor, should):** the "naming it again" check (`:274–275`) asserts one proposal but not one line. Through the API, a
second `documentTypeName` save adds a second certificate line (key plus a timestamp, studio.ts:870). That is existing
behaviour, but the check reads as if nothing doubled.
**m4 (Minor):** the walk's accept and add-line steps use the API (`walk-b.cjs:70–73`), so the PR's "a person" walk is part
API. I did both on screen, and they work (journey report).
**m5 (Minor, words):** the Reset to the six dialog's "Comes back" list and the result dialog do not mention that Provincial
nominee's lines are added by hand, or that one person-named proposal waits too. The audit text omits it as well (only the
attached log has it).

## D1–D20 (this item's scope)
D1 4/5: P-109 forms ✓, Online ✓, the certificate as a waiting proposal (case 2 waits for a ruling). D2 4/5: no doubles (409),
one proposal under an advisory lock. D3 5/5: library forms and a library type are reused. D4 5/5: n/a beyond channel warnings.
D5 3/5: reset twice is stable, the load stops loudly, but three checks regress (M1, M2). D6 4/5: audit lines by user-A, Sample
basis. D7 5/5: the proposal shows "Rules", no AI reading, and its source. D8 5/5: full path on PN. D9 3/5: Documents says
"No documents yet" with no hint that the certificate waits on To review. D10 4/5: plain words. D11 3/5: the finder's red line
beside 5 lines (existing bug), the dialog omits the by-hand step (m5). D12 4/5 and D14 4/5: team look unchanged. D13 4/5:
axe clean, no sideways scroll at 400, 1024 and 1440 px. D15 5/5: the lines step takes 0.2 s, Reset 25–27 s. D16 3/5 (m1–m3,
M1). D17 and D20: simulated only. D18 4/5: Sample is shown. D19 4/5: Forms › To review › Documents closes on screen.

## Could not check
A real screen reader. True 200 % browser zoom (CSS zoom only: the app shell header clips at 512 px, which is existing). The
CI run on this head (still queued when I checked). The C10.1 pack on main side by side (inferred from the identical old query
that row 4's suite passed on main, and the one certificate row). Graph: `graph.mjs --check` G1 0, G2 0, G4 0, G5 0.

## Round 2: diff-only, ea30e005 against 54410819 (4 Nov, ~09:00–09:15 UTC)
I reviewed only `git diff 54410819..ea30e005`. Before starting each copy I checked that HEAD was ea30e005 and that
`demo.ts` had `ReviewProposals`. Copies `rev2a`–`rev2d` (ports 4720–4724) are stopped and their databases dropped. US$0.

| Run on ea30e005 | Result |
|---|---|
| `check_queue_tx.ts` | **8/8** (was 7/8) |
| `check_d1_reset_to_six_browser.cjs` | **25/25** (was 24/25) |
| `acceptance/C10.1.test.ts` | **13/23**. The "rows 3–4" case passes again. The 10 that fail are the same row 10 and part B cases as in round 1 (recorded Partial) |
| `check_c10_1_configured.ts` | 28/28 |
| `check_forms_c117_part_b.ts` | 20/20 |
| `check_c91_impact_api.ts`, run alone | 33/33. BR-12 lists ["Express Entry stream", "Visitor visa"] |

* **M1: closed.** Both checks now count `origin='ai'`, as `check_s7_load` and `check_d1_reset_to_six` already do.
* **M2: closed.** In `loadConfigured`, before row 5 (demo.ts:455–472), the author accepts the waiting type through
  `ReviewProposals.decide` and adds the line through `Studio.saveRequirement`. Row 5's approver then approves the library
  change. On the configured checkpoint (SQL on the copy):
  * proposal `accepted|user-A`;
  * library change `APPROVED`, proposed by user-A and decided by user-B, so the two-person rule P-80 holds;
  * one line `provincial_nomination_certificate:principal_applicant|COMBINATION_MANDATORY|DRAFT|HUMAN|user-A`, quoting P-109;
  * 0 run-linked proposals waiting; row 4 "done", row 5 "354 of 354".

  It uses only the product's services, no form number is in the code, and no LMIA line is touched (the hunk sits after
  row 4). A step that fails is logged and the load goes on.
* **m1: closed.** P-109's five are pinned in the suite (`check_forms_c117_part_b.ts:36`). m3 is relabelled only, so it
  stays as written. m2, m4 and m5 are unchanged.
* **C9.1 knock-on: fine.** BR-12 still requires Visitor visa, and requires every combination that has an IMM 5476 line to
  be named in the words and in the list. The regex is looser, but the list check still catches a missing combination.
* **New minors (should):**
  * **r2-m1:** the loader's accept passes no reason (`this.proposals.decide(author, { ids, action: "accept" })`, demo.ts:466).
    It is the only accepted proposal with an empty `decision_reason` (1 of 670). Row 4 promises "accept with a reason",
    and every other accept carries "Accepted by the sample loader…". `decide` takes `reason`, so pass one.
  * **r2-m2:** if `saveRequirement` fails after the accept, the log says `"…" stays waiting`, but the type was accepted.
    The rows say nothing about it (log only).
  * **r2-m3:** `sixLines()` reads `wave1.json` a second time and matches labels by path text. If a label changes, the step
    logs "is not waiting on To review" (wrong words), and only the C10.1 pack would notice.
* **M3: still open.** The PR body still has "Claims Works: C11.7", and `C11.7.test.ts` is still 20/21 (case 2 waits for
  the tech lead's ruling). Gate B runs the whole pack for a Works claim, so CI cannot pass this head as written.
* **Side effects:** after my runs, `git status` shows 5 changed `p2/runs/stub-pass/studio-fieldmap-imm5257e-p*of5-*.json`
  files and `p2/screening/canary-digest.json` (made_at 09:13:25, during my C9.1 run, though other sessions were running
  too). I left them, as for the D1 screenshots.

**Round 2 verdict: Block.** M1 and M2 are fixed and checked. **One open Major remains, M3.** Either change will clear it:
* the tech lead rules on pack case 2 and the pack change lands in this PR, or
* the body's "Claims Works: C11.7" becomes `Capabilities: C11.7 (part B cases 1, 3)` until the ruling.

Either one turns this into **Approve for ea30e005** with no further code review needed. r2-m1 to r2-m3 do not hold the PR.

## Merge check: 7e7ca86fc (origin/main a155fe772 into 24559602), 4 Nov, diff-only
I read the diffs only (`git show --cc`, then each parent against the merge and against the merge base d4146dbd). I ran no
suites and started no server, as the tech lead asked (other runs share the folder). The PR head is 7e7ca86fc. The body reads
`Capabilities: C11.7 (part B cases 1, 3)` with no Works claim, under the tech lead's ruling. **That clears M3.**

**Only two files changed on both sides:** `api/src/demo.ts` and `tests/check_c10_1_configured.ts`. Every other file in the merge
is byte-equal to the one side that changed it.

1. **`demo.ts` resolution: correct.**
   * **Constructor:** it has main's 13 parameters, then `FormLibrary` and `ReviewProposals`. `Forms` appears once.
   * **Imports:** lines 8–33 have no duplicate. `Forms` is imported once (line 30, main's place), and there are no conflict markers.
   * **Nothing lost:** I compared the changed lines of the branch against the base with those of the merge against main.
     They are identical, except the constructor and `Forms` import that both sides wrote. The same holds the other way for
     main's changes.
   * **LMIA:** 0 changed lines in the merge against main mention LMIA. The merged file's LMIA lines are main's (10 of 10).
   * **Order in `loadConfigured`:** row 4 (l.494), then the certificate step (l.497–516), then main's row 7 sections (l.518–551),
     then row 5 (l.553). The approver approves the certificate type and the sections in one pass.
2. **`check_c10_1_configured.ts`: main's file exactly** (no diff against ^2). Row 4 now counts
   `proposal_item p join drafting_job j … where j.kind = 'field_map' and p.status = 'waiting'`. The certificate's job is
   `kind requirement_type`, mode LOCAL (studio.ts:838), so the query **still excludes it**. It also excludes row 7's answer
   lists, which are left waiting on purpose. The branch's `mode = 'REPLAY'` line would also have excluded both, so its intent
   is kept. Main's C10.1 pack line 35 now filters `j.mode = 'REPLAY'`, so it no longer depends on the certificate step either.
3. **Row 7 with the certificate step: no bad interaction.**
   * **One door:** `ReviewProposals.decide` calls the same `decide` from proposals.ts (review-proposals.ts:115) as main's row 7 does
     directly. Both go through one door, with the same rules.
   * **No shared items:** row 7 decides only `section` and `answer_list` items of `masters_edition` runs on `SET_UP_FROM_FORMS`
     combinations (the Visitor visa). The certificate is a `document_type` on Provincial nominee. So neither step decides the
     other's items.
   * **Counters:** row 4's counters are read before the certificate step and do not change. Row 5's "N of N" goes up by one
     item, the certificate type.
   * **Main's QA-195 check:** the one door now refuses a `document_type` payload that fails the contract (`docTypeWhy`). The
     certificate's payload comes from the product's own `saveRequirement`, with `readerKind person_only` and
     `identityDocument: isIdentityName(…)`. It fits `contracts/proposal-item.ts:41`, and "Provincial nomination certificate"
     matches no identity pattern. So the accept still lands. *Not run.*
   * **Row 5 includes the certificate type:** the certificate's library ADD is WAITING when row 5 reads every WAITING change,
     so user-B approves it. The checks still read the same at the merge: `check_c10_1_configured` row 5 needs WAITING = 0 and no
     item decided by its proposer, and `check_qa144_vv_release.ts:58` needs "the author approved no library item".
4. **The r2 Minors in 24559602:**
   * **r2-m1: fixed.** The accept now carries `Accepted by the sample loader: <P-109 quote>` (246 characters, under the 300 cut).
   * **r2-m2: fixed in words.** The accept and the line now have separate catches. A refused line now reads "was accepted, but its
     required line was not added". It is still log only, with no row status and no test of either branch. That is a residual
     Minor and does not hold the PR.
   * **r2-m3: fixed.** `sixLines()` is gone. `linesByHand` returns `combination_id`, `who` and `quote`, so wave1.json is read once
     and nothing is matched by path text.
   * **Round 1's m2, m4 and m5 stay open as Minors.**

**Not checked:** typecheck, Nest DI start-up and the suites at 7e7ca86fc. CI on this head is the check for those. The journey
score stays **8.5/10** from round 1. No journey was re-run, because none was allowed here, and the merge does not change the
screens' code.

**Verdict: Approve** for 7e7ca86fc. No Blocker and no Major is open: M1 and M2 were closed in round 2, M3 is cleared by the
body, and the merge resolution is clean.

## Merge check 2 (28bbb74de, origin/main e840d2d88 into claude/lucid-volta-ily0ht)

Read-only, diff-only. Nothing was run. Parents: ^1 = 761502940 (this branch), ^2 = e840d2d88 (main, with qa's #939). Merge base: a155fe772.
Method: `git show --cc 28bbb74de`, `git diff 28bbb74de^2 28bbb74de` and `git diff 28bbb74de^1 28bbb74de` on `demo.ts`. Each
parent's own change since the merge base was compared line by line with what the merge keeps of it.

1. **Constructor, `familyForm` and imports: correct.**
   * The resolved constructor (demo.ts:126) has main's 14 parameters in main's order, including main's own
     `@Inject(FormLibrary) private readonly formLibrary`. `@Inject(ReviewProposals) private readonly proposals` is added
     last. That makes 15 `@Inject`s, and no type or property name appears twice. `Forms` appears once.
   * Main's `familyForm` (demo.ts:128-134) is byte for byte as on main.
   * Imports: `FormLibrary` is imported once, at main's place (line 33). This branch's second import at line 21 is gone, and
     `ReviewProposals` takes its place. No module is imported twice.
2. **Nothing lost: confirmed.**
   * This branch's side, merge base to ^1, matches the merge minus main (^2 to merge) except for two lines. The dropped
     duplicate `FormLibrary` import, and the constructor's minus line, because main's base constructor already had
     `FormLibrary`.
   * Main's side, merge base to ^2, matches the merge minus this branch (^1 to merge) except for the same two lines.
   * Kept from this branch: the `SixSetup.lines` and `SixLines` types, `made[].lines`, the `byHand` loop, `lines_by_hand` in
     loadSix's return, `linesByHand`, and the certificate step in `loadConfigured`.
   * Kept from main: `familyForm`, `FAMILY_FORM_BY_CHANNEL`, `keyOf0`, `irmWhy`, row 3 and row 4 (`differ`), and row 7's
     form setup.
   * No other file had a conflict. Outside `demo.ts`, merge minus main is only this PR's own files (wave1.json, the check
     scripts, the screen folder).
3. **No clash with main's code.**
   * **One `formLibrary` method:** both sides call `this.formLibrary.attach(actor, combinationId, { formKey, … })`. That is
     `FormLibrary.attach` (form-library.ts:373, serialised by `oneAtATime`). This branch passes `who` as well. Same instance,
     same method, same body shape.
   * **No double attach:** main's row 7 call (demo.ts:626) runs only for `SET_UP_FROM_FORMS` = `vv.single` and
     `wp.lmia_inside`. Before it attaches, it rebuilds `has` from `combination_form`. This branch's `linesByHand` runs only
     where wave1.json has `lines`, which is only `provincial_nominees.express_entry`. So no combination is touched by both.
     If one ever were, main's `has` check would skip a form that is already there.
   * **Certificate step (demo.ts:545-563):** it uses `author`, `approver`, `six`, `workspaceId` and `log`. All of them are
     defined at the top of `loadConfigured` (lines 474-476). The names `keyOf0`, `irmWhy`, `differ`, `byHand` and `lines`
     do not collide with it. Main's `let byHand` (row 7) is in `loadConfigured`, and this branch's `const byHand` is in
     `loadSix`, so their scopes are separate.
   * **Order:** the step still runs between row 4 and row 7. Row 5's "every WAITING library change" still collects the
     certificate's ADD for user-B, as in Merge check 1.
   * **qa's #939 case 2** (acceptance/C11.7.test.ts): after `/demo/load {"sample":"six"}`, it wants exactly one waiting
     `document_type` proposal for the certificate, with basis SAMPLE, and no `document_type` of that name. Then user-B
     accepts it and the author adds the line. That is what loadSix's `linesByHand` leaves: `saveRequirement`'s
     new-type path writes `basis: "SAMPLE"` (studio.ts:844), and the certificate step runs only in `loadConfigured`. So the
     rewrite and this branch agree. *Not run.*
4. **LMIA: unchanged.** `git diff 28bbb74de^2 28bbb74de -- demo.ts` has no LMIA line. The merge's LMIA lines (15) are the same
   as main's, compared with `diff`. All of them come from main (QA-144 slice 2). This branch adds none.

**Not checked:** typecheck, Nest DI start-up and the suites at 28bbb74de. CI on this head is the check for those. The journey
score stays **8.5/10** from round 1. No journey was re-run, because none was allowed here, and this merge changes no screen
code.

**Verdict: Approve** for 28bbb74de. No Blocker and no Major is open. The resolution follows the tech lead's rule exactly.
Round 1's Minors m2, m4 and m5, and r2-m2's residual, stay open as Minors.

## Fix check (s7 dialogs): 800612bc1 against ba802f035, 4 Nov, diff-only
I looked only at `git diff ba802f035 HEAD`, which is one line in `tests/check_s7_dialogs_browser.cjs:58`. I ran no suite,
started no server and ran no journey. The reason for the change: on ba802f035, CI shard 1 failed only on this step, because
the new person-named certificate proposal (`origin rules`) added one row to the unfiltered count.

1. **The intent is kept.** The step still asks for three things: the dialog shows 6 combinations, the dialog's "AI
   proposals waiting for review" equals the waiting proposals in the database, and that count is above 0. The only change
   is that the database side now adds `and origin='ai'`, so it counts the replayed AI proposals and not the person's
   certificate. The query matches `check_s7_load.ts:75`, `check_d1_reset_to_six.ts:88`,
   `check_d1_reset_to_six_browser.cjs:124` and `check_queue_tx.ts:51`, which are round 1's M1 fix. Like
   `check_d1_reset_to_six_browser`, it has no `workspace_id` filter. That is safe here because the step comes right after
   Reset to blank, which line 43 checks.
2. **The dialog's count is the AI count.** `web/src/App.tsx:281` renders `data-count="AI proposals waiting for review"`
   from `loaded6.drafts.proposals_waiting`. In `api/src/demo.ts`, `loadSix` sets that value from `proposals`. `proposals`
   is `proposalItem.count({ workspaceId, status: "waiting" })` at line 400, which runs after the field-map replay and
   before `linesByHand` at line 405. The return at line 409 passes it on unchanged. On a blank workspace, nothing that
   runs before line 400 writes a non-AI proposal, so it counts AI proposals only. Gate B's `origin='ai'` checks on
   ba802f035 confirm that empirically. One property is worth recording: the server's count has no origin filter, so if a
   later load step ever wrote a rules proposal before line 400, this step would now go red. That is better than before,
   when the test would have quietly agreed with a wrong label. This is not a finding.
3. **No other assertion is affected.** The diff touches only line 58. The other SQL in the file is `combination` and
   `canonical_field` counts (lines 43 and 53), and the text checks on the dialog and the missing list do not read
   `proposal_item`. I also searched the repo for other unfiltered `proposal_item … status='waiting'` comparisons.
   `tests/qa/check_qa_golden_2.cjs:71` and `acceptance/C11.14.test.ts:63` only check `> 0`, which the extra rules row
   cannot break. `check_c10_1_configured.ts` and `acceptance/C10.1.test.ts` were settled under round 2's M2. No other
   check compares the dialog or API count with an unfiltered total.

**Not checked:** CI on 800612bc1. Shard 1 re-running green on this head is the remaining check. The journey score stays
**8.5/10** from round 1. No journey was re-run, because none was allowed and this commit changes no screen code.

**Verdict: Approve** for 800612bc1. No Blocker and no Major is open. Round 1's Minors m2, m4 and m5, and r2-m2's residual,
stay open as Minors.

## Merge check 3 (498c9a967, origin/main 5ac8bd71c into 31c871d92), 4 Nov, diff-only
I read `git show --cc HEAD`, `git diff HEAD^1 HEAD` and `git diff HEAD^2 HEAD` for `prototype/studio/api/src/demo.ts`.
I also compared each side's own changes since the merge base e840d2d88 with what the merge carries. I ran no suite,
started no server, ran no typecheck and ran no journey.

1. **The resolution is exactly the ruled one.** `--cc` shows one resolved hunk, at `demo.ts:389`:
   `made.push({ id: comp.id, label: path, page: c.page ?? null, missing, files: sources.length - absent.length - refused.length, absent, lines: c.lines })`.
   That is main's swap-aware count, then `absent`, then this PR's `lines: c.lines`, in that order. No other file in the
   merge has a combined hunk. `demo.ts` is the only file both sides touched since e840d2d88.
   **The swap does not reach the lines.** `opts.swap` maps file names (`imm5476e.pdf` to `imm5476e-2021.pdf`), and only
   in the local `sources` (`demo.ts:380`). `c.lines` comes straight from the sample. `linesByHand` (`:456`) works by
   library form code (`formKey: "IMM 5476"`, `lineageKey`), and the PNP setup's code list has no file names in it.
   `FormLibrary.attach` needs an approved printed edition under that code. `imm5476e-2021.pdf` is in the
   official-sources manifest (`previous-editions/`), so `approvedShas` holds its checksum. With the swap on, the code
   still attaches, now at 11-2021. Main's `const sources` is a local inside `setUp`. It does not shadow `this.sources`,
   which `setUp` still calls for `read`.
2. **Nothing from either side was lost.** Main's changes from e840d2d88 to HEAD^2 match the PR head to merge diff line
   for line, 109 changed lines each. This PR's changes from e840d2d88 to HEAD^1 match the main to merge diff line for line,
   69 each. The only differing line is the `made.push` line, and there it differs exactly by the other side's half. Main's
   `log.push` count, which uses `sources.length`, is kept. This PR's `SixLines` type, `made` type, `ReviewProposals`
   import and constructor injection, `linesByHand`, `lines_by_hand` in the return, and the certificate step
   (`:593`) are all kept.
3. **No clash with main's new code.**
   * `opts.swap` and row 17 (QA-207, #885, #886). The swap is computed before `loadSix` and passed only from
     `loadConfigured`. Reset to the six, which this PR's `check_forms_c117_part_b.ts` uses, runs without it. The
     certificate step runs at row 4 and touches only `document_type` proposals and `saveRequirement`. Row 17's intake of
     the 11-2025 file comes later (`:762`) and reads `intake_item`/`combination_form`, so the two do not meet. One
     property to record, not a finding: #886 brings IMM 5476 (11-2021)'s saved map. So on the configured checkpoint the
     Provincial nominee's IMM 5476 line files 11-2021, and the nominee counts in row 17's "N combinations file". Main's
     `check_c10_1_configured.ts` row 17 asserts no count. This PR's widened `check_c91_impact_api.ts` assertion compares
     against the live `combination_form` set on its own plain-six setup, so either count passes.
   * Main's `unread` filter (`outcome: "held"`), its `ruleFact.beside` change in row 7, and `sp.outside` joining
     `SET_UP_FROM_FORMS`. None of them reads `lines_by_hand`, `this.formLibrary` or `this.proposals`. Row 7 takes only
     `section`/`answer_list` proposals by run id, so the certificate's `document_type` proposal is never swept in. Row 5
     approves each waiting library change in its own try/catch, so the certificate type waiting there cannot hold up the
     Study permit's release.
   * The filing-record migration (`20261104150000_c82_filing_record`) only creates new tables (`filing_record`,
     `filing_person_record`, `filing_record_correction`, `case_task`) and triggers on them. It alters nothing this PR
     reads or writes. This PR adds no migration. `main.ts` (where `ReviewProposals` is provided) was not changed by main.
     Main's other API changes (`sources.ts` apply timeout, `form-part-placements.ts`, `case-prepare.ts`, `runtime.ts`,
     submission/filing record) are in services that `linesByHand` and the certificate step do not call.
4. **No LMIA line changed.** `git diff HEAD^2 HEAD -- demo.ts | grep -i lmia` is empty. The LMIA lines of HEAD^2 and HEAD
   are identical, including `LMIA_FORM_RULES` (`:68`), `FORM_SETUP["wp.lmia_inside"]` and `wp.lmia_inside` in
   `SET_UP_FROM_FORMS` (`:36`). This PR's side never touched an LMIA line.

**Not checked:** typecheck, Nest DI start-up and the suites at 498c9a967. CI on this head is the check for those. The
journey score stays **8.5/10** from round 1. No journey was re-run, because none was allowed and this merge changes no
screen code.

**Verdict: Approve** for 498c9a967. No Blocker and no Major is open. The resolution is exactly the tech lead's ruled line.
Round 1's Minors m2, m4 and m5, and r2-m2's residual, stay open as Minors.

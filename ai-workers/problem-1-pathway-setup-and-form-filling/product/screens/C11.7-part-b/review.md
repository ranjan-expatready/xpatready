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

# Round 2: diff-only re-review (P-303) of PR #1075 at 7355f3055 (7 Nov 2026)

Reviewer: a fresh context that built none of this. Skills: screen-review and journey-test (reviewer role). Scope:
`git diff a823f119e..43ec5ce5c` (fixes for round 1) and `43ec5ce5c..7355f3055` (row C2: `expectedFor`; a parts check
driven by the data). This PR has the API and the pack only, so browser, axe and screen-size criteria are n/a. The runs
used the local trial merge `/home/user/c2-trial` (7355f3055 + origin/main 9dc77d1ac, not pushed), on isolated copy
`rv_c2` :4436, which was stopped after. Live AI off, `cost_usd: 0`, no priced button.

**Skill verdict (screen-review): Ship.** All four round-1 Majors are fixed, and each has a check that can fail. No new
Blocker or Major.

## Runs (trial merge of 7355f3055)
* Reset, then load `configured` as user-A: 78.0 s, `cost_usd: 0`, 5 combinations released plus release 2.
* `tsx studio/acceptance/C7.3.test.ts 4436 xr_studio_rv_c2`: **exit 0, 13/13**. "expected (row C1): the principal's
  Online form is IMM 5257": release 2 has the Online line, so no setup step. `form_parts`, 9 parts in printed order.
* `tsx studio/tests/check_c73_parts_checkpoint.ts 4436 xr_studio_rv_c2` (after the pack, same copy): **exit 0, 6/6**.
  The part not named at release was found on IMM 5645 (`part_70142da4`). It was ticked (201), then edit-named by
  user-C. Key, title and tick were kept, it was not Out of date, and nothing moved to "Other questions".
* `tsx studio/tests/check_vv_answer_sheet.ts`: **exit 0, 24/24**. `tsc --noEmit -p api/tsconfig.json`: no error in
  `form-parts.ts`, `case-prepare.ts`, `answer-sheet.ts` or `fill-case.ts`. Graph (P-86): no C7.3 route, page or
  module among the gaps.
* Probe (own case, IMM 5257 SCH1 filed Online, 200): 7 named parts, edit-named before release 2, and no "Other
  questions" (m1 held). Stale tick: 409 in words. Client read: 403. 8 ticks at once: one 201, seven 200. Sheet 34 ms,
  Prepare 143 ms.
* Fixture runs (setup 15/15, setup_vv_m3 44/46, C7.3 13/13 on IMM 5707, C7.7 33/33, prepare API 40/40): the builder's
  only; not reproduced here.

## Round-1 Majors
* **M1 fixed.** `layoutOf` orders by the edition's field list (`case-prepare.ts:569`, `inventoryOf`), with the field
  map only as a fallback. It can fail in two places. (1) C7.3-3's oracle reads the inventory file itself
  (`acceptance/C7.3.test.ts:28-42`). (2) The parts check shows that the alphabet order differs on this checkpoint and
  requires strictly rising first-field positions.
* **M2 fixed.** `NAMED = {accepted, edited}` (`api/src/form-parts.ts:15`, used at `:31` and `:37`). It can fail:
  IMM 5257's "Signature" part on this checkpoint is edit-named before release 2. Drop "edited" and line 31 skips it,
  so the sheet loses it while C7.3-3's `want` keeps it.
* **M3 fixed.** Rows come from `createdAt <= released_at` (`form-parts.ts:24`). A decision made after it reads as
  waiting, an edit made after it reads `work.beforeEdit` (`:30-34`), and titles come from the snapshot
  (`case-prepare.ts:557`). Round 1's M5 tick refusal is rightly removed: its reason, a key that changes on naming, is
  gone. It can fail: the parts check names the part after the release and asserts the same key, title and tick. A
  decided proposal cannot be decided again (`proposals.ts:796`). A post-release undo is limited to 10 s and is refused
  once a second person has approved, so it cannot re-key a released part.
* **M4 fixed.** C7.3-3 now requires `form_parts` whenever the release holds parts (`C7.3.test.ts:77`). It also
  requires exact equality, "Other questions" aside, so every part with a fact must appear in printed order.
* **Minors:** m1 (a 120-character prefix: unit check plus the SCH1 probe), m3 (`otherKey`: unit check), m4 (the words)
  and m5 (named kept before waiting: unit check) are fixed. m2 is moot (the refusal is removed).

## New in this round (43ec5ce5c..7355f3055): sound
* (a) The Online form and the application now come from `expectedFor` (row C1, the case's pinned release). An
  unreadable release stops the pack (exit 2), not a pass. C7.3-1 now also needs /prepare to hold that very form as
  Online, so it is stricter than before.
* (b) The parts check picks its form from the case's release data. It found IMM 5645 on release 2, and no form number
  is written in the check.
* **The 13 rule texts are byte-identical to round 1's** (md5 of the 13 `ok("C7.3-n …")` labels at a823f119e and
  7355f3055). Only the conditions of C7.3-1 and C7.3-3 changed, and both became stricter.
* **The merge resolution is right.** In `engine/runtime/answer-sheet.ts:86`, main's `b.coverage === "not needed"`
  skip sits before the branch's `sectionOf(b.box)`. This matches main's own change to `answerSheet`, which now
  delegates to `sheetOf`.

## Issues (none blocking)
* **n1 (Minor, Should)** In `tests/check_c73_parts_checkpoint.ts:57` and `:64`, the `proposal_item` queries have no
  `workspace_id`. On a copy with an older workspace, they can pick another workspace's waiting part. That gives a false
  failure, never a false pass. *Fix:* join on the case's workspace.
* **n2 (Minor, Should)** In `acceptance/C7.3.test.ts:38`, `findIndex(...) ?? -1` is dead code (`findIndex` never
  returns undefined). It is harmless, because `n < 0` maps to last.
* **n3 (Minor, Should)** The no-layout refusal ends "Ask the Lead." (`case-prepare.ts:499`), which names a project role,
  not a firm role. It is the API's existing phrase (8 uses), so the change belongs in a row of its own.

## D1–D20 (changes from round 1 only; screen dimensions n/a)
* D1 Requirement fit 4: BR-2 and BR-6 now hold. · D2 Data integrity 5: frozen at release; one tick under an 8-way race.
* D4 Rule integrity 4: edit-named parts are kept. · D5 Stability 5: a later decision no longer moves a tick.
* D6 Freshness and governance 4: a pinned case reads only what was released (§3.7, §3.8).
* D10 Language 4: m4 words, with n3 left. · D16 Testability 4: C7.3-3 is independent of the route, and the parts
  check fails on M1, M2 and M3.
* D18 Provenance 5: `order_note` is now true. D15 stays at 5. D17 and D20 are simulated only. D19 Closure 4: it needs
  origin/main's row C1 to run on the branch (the planned merge).

**Not checked:** the screen (not built), the fixture copy (the builder's runs only), the real IRCC portal order (W6).
Journey score (reviewer, the one score for this check): **7½ of 8 applicable criteria (9.4/10 scaled), pass**
(`journey-test-reviewer-2026-11-07.md`).

**Verdict: Approve**: no open Blocker or Major. The Minors n1–n3 may follow in their own row. Note for the builder:
the pack imports `expectedFor` from origin/main, so CI on 7355f3055 alone cannot run it until the branch merges main.

---

# C7.3 Portal answer sheet: independent review of PR #1075 at a823f119e (5 Nov 2026)

Reviewer: a fresh context that did not build it (skill screen-review + journey-test, reviewer role). Diff
`git diff origin/main...a823f119e`. Scope: the API and the acceptance pack only. The screen part is a concept waiting for
the tech lead (P-223 (4)), so no browser, axe or screen-size criteria: n/a. Isolated copies only (:4436 checkpoint,
:4437 fixture), stopped after; live AI off, US$0 (`cost_usd: 0`), no priced button.

**Skill verdict (screen-review): Ship after fixes**, so this check blocks until they are fixed. Four Majors: three in the layout the PR adds, one in the pack check that should catch them.

## Runs (exact commit a823f119e)
* Checkpoint: fresh `rv_c73` :4436, reset then load `configured` as user-A, 74.3 s, the same 3 releases, `cost_usd: 0`.
  `tsx studio/acceptance/C7.3.test.ts 4436 xr_studio_rv_c73`: **exit 0, 13/13**. Setup line printed: no Online line on
  release 1, so the officer filed IMM 5257 Online (C11.6, 200). `order_basis: "form_parts"`, 8 parts.
* `tsx studio/tests/check_vv_answer_sheet.ts`: **exit 0, 24/24**.
* Fixture: fresh `rv_c73f` :4437, `setup_visitor_visa` 15/15, `setup_vv_m3` 44/46 (as on main), C7.3 **13/13**
  (`pdf_twin`, IMM 5707); `check_vv_prepare_api.ts` 38/38; `tests/qa/check_qa_vv_1102_c73.ts` 6/7 (QA-153, already open).
* `tsc --noEmit -p api/tsconfig.json`: no error in the files this PR touches. Graph (P-86): both C7.3 routes are reached
  by tests (not in G3); `form-parts.ts` is imported (not in G6).

## Break-it results (API, checkpoint copy)
* 12 ticks at once, same version → one 201, eleven 200; one `entered_section` row, no orphan snapshot. Held.
* Stale version → 409 `…/stale` with the section's name. Unknown key → 404. No body → 400 on `version`. Held.
* Unnamed part (`part_6205079c`, IMM 5257 SCH1 filed Online) → 409 in words (M5). Client user-P → 403 first; client, author, reviewer and approver read → 403, the officer only. Held.
* Recorded filing (a `filing_record` row put in by SQL for the probe) → tick 409 `…/recorded`; read stays 200. Held.
* An edition with no parts and no twin (SCH1's proposals moved aside by SQL) → GET 409 with the new words; Prepare
  still answers 200 and the item reads To do (no empty sheet counted as Done). Held.
* Naming an unnamed part on To review, and the order of the parts: **failed**, see M1 and M2.

## Issues
**M1 (Major, Must) The parts are in alphabetical order, not the order the form prints them.** `layoutOf`
(`api/src/case-prepare.ts:566`) orders by the release's field-map entries, and the snapshot reads those sorted by
`dataPath` (`engine/snapshot.ts:114`). On the checkpoint IMM 5257 reads Personal details · Contact information · US PR
card · National identity document · Background information · Details of visit · Education · Employment. The form's
own field list (`prototype/p1/inventory/imm5257e.inventory.json`) has natID (112) · USCard (117) · ContactInformation
(120) · DetailsOfVisit (168) · Education (185) · Occupation (195) · BackgroundInfo (223). Uppercase sorts before
lowercase (`USCard` < `natID`), and a form with ten or more pages would put `Page10` before `Page2`. BR-2 is not met,
and the server's `order_note` ("In the order the form prints its parts") is not true. *Fix:* order by the edition's
inventory field order, as `engine/answer-keys.ts:248` (`labelsOf`) does already, with the field map only as a fallback.
Add a unit check where the alphabetical and printed orders differ.
**M2 (Major, Must) A part named on To review drops off the sheet; its answers move to "Other questions".** An unnamed
part cannot be accepted ("Give the section a name before it is accepted", `api/src/proposals.ts:769`). It is named only
by **edit**, and that stores `status: "edited"` (`proposals.ts:922`). `formPartsOf` reads `accepted` and `waiting`
only (`api/src/form-parts.ts:18`; `named` at `:32`). The pack's oracle uses the same filter. Live: I edit-named
"Unnamed section 2 of IMM 5257 SCH1" as "Your name" (user-C, 201, `edited → your_name`). It then left the sheet, and
family name and given names showed under `_other` "Other questions". So BR-6 and M5's promise ("tick it once it is
named") can never come true. *Fix:* read `["accepted", "edited"]` as named, plus `waiting`, as `proposals.ts:335`,
`:831` and `:971` do. Add a unit and pack case for an edit-named part.
**M3 (Major, Must) A released case's sheet follows the live configuration (STANDARDS §3.7 [M]).** `formPartsOf` reads
today's `proposal_item` rows and the newest `logical_section` version, whatever its status (`form-parts.ts:18-28`),
not what was released. The release snapshot already freezes section titles (`sections`, `section_titles`). Live: the
To review edit above, made after release 1, changed the sheet of a case pinned to release 1. Decisions made later
(edit, undo within 10 s, a new rules-pass run) can re-key a part. That loses its tick with no word, or turns a ticked
part Out of date with no answer changed. An unapproved DRAFT title would also reach a released case (§3.8). The
refusal text "not named in this release's configuration yet" promises a change that a frozen release never gets.
*Fix:* lay out from what the release froze. Store the parts (key, title, field keys) in the snapshot at release, or at
the least keep proposals decided by `config_release.released_at` and take titles from the snapshot's sections. Keys
then stay stable for the case's life. Ask the tech lead whether M5's refusal is still needed, since its reason (the key
changes on naming) would be gone.
**M4 (Major, Must) Pack check C7.3-3 cannot fail on M1–M3.** The pack's other edits are sound: it finds the case's
Online line, and the C11.6 step is a product route whose refusal stops the pack (exit 2). C7.3-13's
`words.includes(FORM)` is stricter. But `ownParts` (`acceptance/C7.3.test.ts:26-35`) re-runs the product's own query:
the same status filter, the newest library title, the field-map order. It also accepts a subset of parts (`:60`
`shown.every(... want.includes)`) and either basis. IMM 5257 has a twin entry, so a fall back to `pdf_twin` on the
checkpoint would still pass. *Fix (rule text unchanged):* when the edition has parts, require `form_parts`. Take the
expected order from the form's printed order (its inventory), not the field map. Require every part with a confirmed
answer to appear.
**m1 (Minor, Should)** The rules pass cuts field keys to 120 characters (`api/src/form-masters.ts:111`). An exact match
in `sheetOf` then misses long paths. On the checkpoint, five SCH1 answers (government position level and activities,
organisation name, start date, activities) sit in "Other questions" instead of Government positions and Membership.
*Fix:* treat a 120-character key as a prefix in `form-parts.ts`, and add a row for the forms lane.
**m2 (Minor, Should)** The API refusal (`case-prepare.ts:470-471`) has no test: deleting it fails nothing, because the
unit test calls only `tickRefusal`, and the pack's IMM 5257 has no unnamed part with answers (STANDARDS §3.10). *Fix:*
an API check on SCH1 filed Online, whose four unnamed parts carry answers.
**m3 (Minor, Should)** `check_vv_answer_sheet.ts:84` only checks that `OTHER_PART` starts with `_`. It never shows a
library key cannot. *Fix:* check the library key rule, or reserve the key in `formPartsOf`.
**m4 (Minor, Should)** Words for a case officer: "the Sections step names them" (`case-prepare.ts:501`), "the
configuration people" (`engine/runtime/answer-sheet.ts` `tickRefusal`). *Fix:* "This form's parts are not set up for
this release yet" and "This part has no name in the release this case uses".
**m5 (Minor, Should)** `partsInFormOrder` drops a duplicate by `fieldKeys[0]` and keeps the one proposed first
(`answer-sheet.ts:42`), so an older waiting duplicate would hide a later named one. From reading the code, not seen
live. Pinning (M3) makes this mostly go away.

## D1–D20 (1–5; screen dimensions n/a: no screen in this PR)
* D1 Requirement fit 3: BR-1, 3, 4, 5, 7 behave as written; BR-2 order wrong (M1); BR-6 never resolves (M2). · D2 Data integrity 4: one tick under 12-way race, version 409, recorded refusal under the lock; parts re-key (M3).
* D3 Reuse 4: reads the C3.4 parts and library titles, no new table, no form number in code (P-319). · D4 Rule integrity 3: Done rule guarded (`sections.length > 0`); an edit-named part breaks the layout rule (M2).
* D5 Stability 4: idempotent tick, reload-safe; a later configuration decision silently drops a tick (M3). · D6 Freshness and governance 2: reads unreleased configuration into a pinned case (§3.7, §3.8).
* D7 AI trust n/a: no AI in this path (rules-pass parts are already accepted or waiting). · D8, D9, D11, D12, D13, D14 n/a: no screen. D10 Language 3: plain refusals, but studio terms for the officer (m4).
* D15 Speed 5: sheet 48–52 ms, Prepare 119–153 ms, one parts read per request, `formEdition` indexed. · D16 Testability 3: 24 unit and 13 pack checks pass, but C7.3-3 mirrors the code (M4) and the refusal is untested (m2).
* D17, D20 simulated only: no intended user walked it. D18 Provenance 4: each answer has its source; `order_note` wrong (M1). · D19 Closure 3: works on the checkpoint through the case's C11.6 change; no screen yet; QA-153 and QA-165 stay open.

**Retrofit mapping:** the team's screens are Unverified here (no `code/` capture, as the challenge noted). The team's word is "answer sheet".
No retrofit change in this PR.
**Not checked:** the screen (not built). A real IRCC portal order (W6, parked). Release 2's Online lines (DEMO.md row 9, not on main).
The recorded-filing probe used an SQL row, and the no-parts-no-twin probe an SQL move, both on my own copy. A real
recording and a real edition without parts were not built for this.
Journey score (reviewer, the one score for this check): **5½ of 8 applicable criteria (6.9/10 scaled), fail** (`journey-test-reviewer-2026-11-05.md`).

**Verdict: Block**: fix M1, M2, M3, M4 (the Minors may follow in their own row).

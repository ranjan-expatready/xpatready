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

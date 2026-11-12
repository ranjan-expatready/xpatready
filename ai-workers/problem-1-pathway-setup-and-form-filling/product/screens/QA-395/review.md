# QA-395 review: IMM 5257 Q8 A counts only another country, for more than 6 months of the past 5 years (C7.2, C7.3), PR #1566

Reviewer (screen-review skill, adapted to a bug fix in the PDF fill; fresh context, did not build it). Head **c6a0c7636** on base 7ad01b342. 11 Nov 2026. Ports 4457-4458 only, never :4400. Live AI off, US$0. Skill verdict: **Ship after fixes** (one Major).

## The tech lead's "done" points (Lead 18)
1. **Test fails on main first: met.** Commit ac4b16849 adds only `tests/check_qa395_q8a_counts.ts`. On main, `runTransform(<Q8 A transform>, "India", {})` (main's `p5/transforms.ts`, scratch worktree) returns `{"ok":true,"value":"Y"}`. That is the "any entry" reading, so the N steps fail. On the branch, `tsx studio/tests/check_qa395_q8a_counts.ts 4457 xr_studio_forms_rv5` gives **9/9**, with PCRIndicator read back from the PDF as N, Y, N, N, N, Y. I could not run main's server myself: Postgres cannot read a worktree under the scratchpad. The builder's 5/9 on main is consistent with that output.
2. **C7.3 green on the checkpoint: met.** On `configured`, :4457: C7.3 **17/17**, C7.3-tick **15/15**, C7.8 **20/20**. I did not re-run C7.3-screen or C7.2 (the builder reports 15/15, and 3/11 on both main and branch).
3. **Wording from the form, cited; no form or program in engine code: met.** The quote in `samples/recorded-counts.json:7` matches the PCRIndicator caption in `p1/inventory/imm5257e.inventory.json` word for word. The printed p. 1 text in `expected/source-text/imm5257e.xfa-template.txt` says the same ("…current country of residence (indicated above) for more than six months?"). `countedOf` (`engine/runtime/forms.ts:131-150`) names no form, fact or program.
4. **Opus Approve:** not yet. See M1.

## Independent judgements on the points asked
* **Own country.** Matching is exact after trim and lower case (`forms.ts:125`). "india" against "India" gives N, and the PDF writes 205 (India) in the table. The checkpoint's country facts are free text ("No fixed list for this answer yet", `countries: 0`), so another spelling of the person's own country is reachable. "Indian Republic" (2 years) gave **Y**. The error is on the side of saying too much, and the table's Country box goes by hand ("not in the box's option list"), so the officer sees that row (m4).
* **"More than 6 months" (strict).** Correct: 1 Jan to 1 Jul is N, and 1 Jan to 2 Jul is Y. `addMonths` rolls past the end of a month, though (m2).
* **Partial overlap with the 5 years.** Only the part inside the window counts. The data file marks this reading "Unconfirmed: immigration expert". Correct as built. The window ends on the server's date when the copy is made (m5).
* **Dates to the month, open entries, future end dates.** "2024-01" counts from the first day of January to the last day of July. The fact shape is `day` precision on the checkpoint, so this is not reachable today. A missing end date gives **null**, so the box goes by hand. An end date in the future is cut at today: 200 days so far gives Y, 3 months gives N. **An end date before the start date gives N, with no other sign** (M1).
* **Null, so a person decides.** Live at 1024 px: the PDF leaves PCRIndicator empty. The header shows the pill "1 mandatory form field left empty". "Marked mandatory on IRCC's form, still empty (1)" lists "Question 8 A … — filled by hand: … a person checks the entries and decides Yes or No". The copy's line reads "To write by hand in Adobe: A country or territory where the person previously resided ("Question 8 A …": …)". Readiness and the officer both see it (m6 covers the wording).
* **P-319 and the data source.** Legitimate. It follows the pattern of `samples/fee-table.json` (imported by `engine/runtime/filings.ts:22`) and `samples/own-yes-no.json` (B88 moved form-specific facts to data). It is keyed by the library's data path and fact ids. Like those files it is not frozen with a release, and option A remains the long-term home. The tech lead's answer on the design question in the PR is still open; this review does not stand in for it.
* **Existing readers.** `countedOf` runs only on `coverage === "confirmed fact"` boxes (`forms.ts:88`). The B155, nothing-recorded and QA-165 gate branches act only on boxes that are not "confirmed fact", so none of them changes. A gate No with a detail recorded is already "answered on screen" with a fix in `formCoverage`. "None apply" with no rows is not "confirmed fact", so QA-392's N stays. Re-run: C7.3 17/17. Answer keys: no sample has a previous-residence entry. `check_g4_answer_keys` **93/93**, `check_c72_imm5257_fill` **57/57**, `check_qa165_gate_follow_ups` **38/38**, `check_vv_answer_sheet` **47/47**. The type check (`tsc -p api/tsconfig.json`) shows 15 errors, none in a touched file. **Other forms:** IMM 1294 and IMM 1295 have the same data path and the same caption (checked in their inventories), and the rule matches on box and fact only, never on `form` (`forms.ts:132`). They take the rule too, which is correct today but not recorded (m3).
* **Stored copies and out-of-date.** The count is frozen in the copy's stored boxes (`fill-case.ts:322`), so a made copy never changes. Its inputs are form facts (citizenship, residence, the table's dates), so a changed input marks the copy out of date. Time alone does not, and neither does an entry past the form's rows (m5).
* **PreviousCOR table on a No.** Out of scope for QA-395, so a Minor here (m7). The form's script disables the rows on No but does not clear them (template text confirmed). Live: N with India still in Row 2. The answer to Q8 A is now right, and the rows are the person's own confirmed answers. Before this PR an N could only come with an empty table. It still needs its own row.

## Issues
* **M1 (Major, must fix): an entry whose end date is before its start date writes No without any warning.** `forms.ts:144-146` treats `to < from` as complete, so `end > addMonths(start, 6)` is false. The pure probe gives `false`. Live: Kenya, from 2025-11-11 to 2023-11-11 (a 2-year stay typed backwards) is accepted, and the PDF reads `Q8A=N`. The fields-open list has no Q8 A line and the by-hand list has nothing. Main wrote Y here. This PR adds a way to deny a stay that likely qualifies. A typo then becomes a non-disclosure on a misrepresentation-sensitive question. Fix: in `countedOf`, an entry that is not the person's own country with `to < from` sets `open = true` (a person decides). Add a pass and a fail line in `check_qa395_counted.ts`.
* **m1 (Should): the per-entry reading is not recorded.** Two stays in one country, Jan-Apr and May-Sep 2025 (7 months together), give N. The words "lived … for more than 6 months" also allow the total. Either add this reading to the data file's basis as "Unconfirmed: immigration expert", like the overlap reading, or return null when one country's entries pass the limit only together.
* **m2 (Should): month-end rollover undercounts.** `addMonths` (`forms.ts:124`) makes 31 Aug + 6 months = 3 Mar, so 31 Aug 2025 to 2 Mar 2026 gives N. Fix: clamp the day to the last day of the target month.
* **m3 (Should): `form` is not used for matching.** IMM 1294 and 1295 (same path and caption) and any later IMM 5257 edition at the same path take the rule silently. Either list each form and edition checked in the data file, or match on the form and edition too.
* **m4 (Note, follow-up): free-text countries.** A spelling that differs from citizenship or residence counts as another country. Revisit when the country fact gets a fixed list. The form's own country list already resolves "India" to 205.
* **m5 (Note): time.** The 5 years end on the server's date when the copy is made, not the filing date, and out-of-date detection ignores time and entries past the form's rows. Rare, but a copy made weeks before filing can drift.
* **m6 (Should, words): the copy's by-hand line is labelled with the detail's question**, "A country or territory where the person previously resided" (`fill-case.ts:285`), not with Q8 A. The reason also does not say which entry lacks what. Fix: use the caption for a counted box. Name the entry and the missing part ("Kenya: no end date").
* **m7 (Should, own row before C7.2 claims Works): the PreviousCOR rows on a No.** Log this as a qa/BUGS or BACKLOG row, not only in the PR body. The Mac's Adobe Validate run confirms it.

## Not checked
Main's server run (Postgres permissions), C7.2 and C7.3-screen re-runs, axe, 400 px and 200 % zoom, `graph.mjs`, which writes the tracked `qa/graph.json`. D17/D20 stay with the founder. BIC-01–20: N/A, no screen changed. D1–D20: only D1 (Q8 A now meets the form's words, except M1), D2 (M1), D16 (each limit is tested pass and fail, but not to < from), D18 (the reason quotes the form) and D19 (copy, readiness and sheet read one marking step) apply. All are met apart from M1.

Journey score: **8/10** (pass), `journey-test-reviewer-2026-11-11.md`.

**Verdict: Block.** To fix: M1. Then fix the Shoulds or list them in the PR. Reviewed commit **c6a0c7636b75eb9d0a14f746aa3f40fd036fcc69**.

## Re-review (diff)
Diff only, `git diff c6a0c7636..0c87e7b74`: `engine/runtime/forms.ts` (countedOf, addMonths), the data file's basis, and 5 new test lines. My two reports are committed unchanged. Port 4457, US$0.
* **M1: fixed.** The new check runs after the own-country skip (`forms.ts:146`). An entry with `to < from` becomes null with the reason "Kenya ends (2023-11-11) before it starts (2025-11-11)". Live on a fresh checkpoint, with the same input as before: Q8 A is left by hand, with that reason both on the copy's by-hand line and in readiness ("Question 8 A … left empty on the form — filled by hand: … Kenya ends … before it starts …"). Before this fix it wrote N with no line. A backwards entry does not hide a counting one: the test's pass line gives Y. If the check is removed, the new fail line goes red, because the entry then reads as a complete stay that does not count (the builder reports 21/22).
* **m2: fixed.** Months now stop at the month's last day. Probe: 31 Aug to 28 Feb gives N, 31 Aug to 2 Mar gives Y, 31 Aug to 3 Mar gives Y.
* **m6: partly fixed.** The reason now names each entry and what it lacks ("Kenya lacks its dates", "an entry lacks its country"). The copy's by-hand line is still labelled "A country or territory where the person previously resided" (`api/src/fill-case.ts:285`). The reason quotes Q8 A, so the officer can tell. It stays a Minor, not blocking.
* **m1 and m3: recorded.** The basis now records two more readings as "Unconfirmed: immigration expert": each entry counts on its own, and a backwards or incomplete entry goes to a person. It also records that a rule matches by data path and fact, so IMM 1294 and IMM 1295 take it (same Q8 A, 11 Nov 2026), and that a form which counts differently needs its own rule first.
* **m4, m5 and m7: listed in the PR**, not fixed. All three are Minors, and m7 still needs its own row before C7.2 claims Works.
* **Re-run on 0c87e7b74:** `check_qa395_counted` **22/22**. `check_qa395_q8a_counts` **9/9** on a fresh checkpoint. C7.3 **17/17** on the checkpoint. My edge-case probe agrees: one case changed (backwards dates now go to a person), m2 now counts calendar months, and the null reasons are more specific; no other result moved. Not re-run: C7.3-screen, C7.3-tick (no changed code reaches them), the type check (builder: no new errors).

No Blocker or Major remains open.

**Verdict: Approve.** Commit **0c87e7b74ff227b9dc1a89f833969ebf6a10e688**.

## Re-review (merge of main)
Diff only. Approved c147783b0, then two commits: 4bcfaad1e merges origin/main 36e4a4d57 (#1563 merged), and c56da3ec3 updates #1563's own test. 12 Nov 2026, port 4457, fresh checkpoint copies, US$0.
* **The merge keeps this PR unchanged.** `git diff 36e4a4d57 c56da3ec3 --stat` lists this PR's 9 files plus `tests/check_qa392b_recorded_yes_no.ts`, and nothing else. For each of the 9 files, the added and removed lines of `diff 7ad01b342..c147783b0` and of `diff 36e4a4d57..c56da3ec3` hash the same (sha1 compare). `render.ts` keeps `counted?: boolean | null`, and #1563's removal of `NOTHING_RECORDED` stands. `git grep NOTHING_RECORDED` finds it only in records (QA-392 and QA-392b), not in code.
* **The test change is a correct knock-on, not a weakening.** #1563's Yes case relied on the old "any entry" reading: India is the principal's own country, so it now rightly gives N. The test now uses a stay that counts (United States, 3 to 1 years ago, answered by the client, then confirmed), so it still proves a Yes.
* **The sheet now follows the count.** It builds its lines from the same marked boxes (`api/src/case-prepare.ts:911-914`, `markNothingRecorded` then `formValues`). Live on the Online IMM 5257 sheet:
  - own country, one day in 2015: No
  - Kenya for 2 years: Yes
  - Kenya with no end date: no Q8 A line
  - Kenya with dates typed backwards: no Q8 A line

  These match the PDF in every case.
* **Re-run on c56da3ec3:** `check_qa392b_recorded_yes_no` **14/14**, `check_qa395_q8a_counts` **9/9**, C7.3 **19/19** (with qa's C7.3-15v and C7.3-15; nothing HELD, no FAIL). The builder's other results are not re-run, because the merge changed no line of this PR.
* **Note (follow-up, not this PR):** when Q8 A is left to a person, the Online sheet shows no line and says nothing about why. The PDF path does say why (by-hand line and readiness). This is #1563's merged design ("no line when it is left to a person"). Suggest a qa row so the Online officer also sees the reason.

No Blocker or Major is open. The Minors m4, m5, m6 (label) and m7 stay as listed in the PR.

**Verdict: Approve.** Commit **c56da3ec335a1db90fac37a1308776481ec31ff1**.

## Re-review (merge with QA-403), fresh reviewer
Diff only. Last approved head 2f1379ee1, then one merge, 272972e95, of origin/main b29d04a20 (brings in #1588, QA-403). I did not build or review this PR before. 12 Nov 2026, ports 4456 and 4457, fresh isolated copies, live AI off, US$0.
* **The two conflicted files are main's version plus exactly this PR's lines.** `git diff b29d04a20 272972e95` on `p5/transforms.ts` adds the same 6 lines as this PR's own diff (`git diff 36e4a4d57 2f1379ee1`): the `counted`/`countedWhy` doc and field, and the two `ctx.counted` lines at the head of the RECORDED branch (`transforms.ts:144-146`). On `engine/form-values.ts`, the only change is the `runTransform` call and the `why` line (`form-values.ts:71-72`). The call has QA-403's `ownFact`/`words` and this PR's `...(r.counted !== undefined ? {counted, countedWhy} : {})`, each once. The `why` keeps `r.nothing_recorded || r.counted !== undefined`. Nothing from either side is lost or doubled.
  - QA-403's `wordsInSteps` import, `Entry.transform`, the `wordsOf` map (`form-values.ts:52-55`), `wordOf`/`TICK_EQ`/`tickByName`/`notAWord`, the `as_is (plain-language …)` step and the tick steps (`transforms.ts:205-220`) are all byte-for-byte main's.
* **The rest of the merge is main's own work.** `git diff 2f1379ee1 272972e95 --stat` lists 73 files. Every file this PR does not touch is identical to b29d04a20. `git diff --name-only b29d04a20 272972e95` lists exactly this PR's 10 files.
  - For 8 of the 10, the added and removed lines equal this PR's own diff (sorted-hash compare): `forms.ts`, `render.ts`, the counts file, the 3 tests and the 2 records.
  - The other 2 are the conflicted files, checked line by line above.
  - Main changed neither `render.ts` nor `runtime/forms.ts` (`git diff 36e4a4d57 b29d04a20` is empty for both).
* **No wrong interaction inside `runTransform`.** RECORDED is matched before the tick steps, and no tick spelling matches RECORDED (it needs "… recorded" or "any …" after `derived:`). The tick steps never read `counted`. RECORDED never reads `ownFact`/`words`. My pure probe (scratchpad only, not committed) used the real Q8 A step:
  - Q8 A with `counted: false` plus `ownFact`/`words`, and an entry present: N
  - `counted: true`: Y
  - `counted: null`: the `countedWhy` text, by hand
  - no `counted`: the old path, Y
  - `checked_if_application_type_is_visitor` with `counted` set: visitor gives 1, worker gives 0, "vistor" goes by hand ("not one of the words this form takes (visitor, worker)")
  - `TICK_EQ` "1 if case.representative_form_action = appoint" with `counted: null`: 1
* The legacy caller `p5/engine.ts:313` passes no context, and neither side changed it.
* **Re-run on 272972e95:**
  - Pure: `check_qa395_counted` 22/22, `check_qa392_nothing_recorded_sheet` 17/17, `check_vv_answer_sheet` 47/47, `check_forms_b86_fill` 35/35, `check_qa165_gate_follow_ups` 38/38.
  - Server, `forms_rv8` on 4456: `check_qa403_who_fills` **36/36**, `check_qa395_q8a_counts` **9/9**.
  - Server, `forms_rv9` on 4457: `check_c72_imm5257_fill` 57/57, `check_qa392b_recorded_yes_no` 14/14.
  - Both copies were stopped and their databases removed.
  - Type check (`tsc -p studio/api/tsconfig.json`): 15 errors, all in 5 test files that neither this PR nor the conflict touches (`check_c18_age_case`, `check_c69_runs`, `check_cost_check`, `check_vv_checklist`, `check_x2b_bulk_apply`). None are in `transforms.ts`, `form-values.ts` or `runtime/forms.ts`.
  - Not re-run: Gate B (C7.2 3/11 as on main, C7.3, C7.3-screen, C7.3-tick). The builder reports them green or unchanged, and the merge changed no line of this PR.
* **Journey score: 8/10 (pass)**, unchanged from `journey-test-reviewer-2026-11-11.md`. The merge changes no screen and no wording. The Q8 A fill journeys still pass as scripted checks on fresh checkpoints: the counted Yes, the counted No, the by-hand case with its reason, and QA-403's case-officer journey. I did not re-walk them in a browser. D17/D20 stay with the founder.

No Blocker or Major is open. The Minors m4, m5, m6 (label) and m7 stay as listed in the PR.

**Verdict: Approve.** Commit **272972e95ef0bd2de8ee3fd53365f3a50a1c9f78**.

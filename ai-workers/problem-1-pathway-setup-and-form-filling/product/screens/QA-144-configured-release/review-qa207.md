# QA-207 (C9.1, C10.1 row 17): independent review of 561d59528 (PR #885, runtime lane)

Reviewer: a fresh context that did not build this. Date: 4 Nov 2026. US$0. As the tech lead asked, I started no isolated copy, ran no server suite and used no port: the Mac is kept for walks.
Diff reviewed: `git diff ba0bd37f7 561d59528` (3 files), against the tech lead's ruling (a) and the PR body.

## Verdict (screen-review): Ship after fixes (Minors only). **Verdict: Approve 561d59528**
Open: 0 Blockers, 0 Majors, 4 Minors. CI was still pending when I reviewed (`kind` passed; `types` and shards 1–6 pending). The PR merges only on green, so a red shard still stops it.

## What I checked, and how
* **The gate (demo.ts:397).** `jobIdFor("imm5476e-2021.pdf")` gives `studio-fieldmap-imm5476e-2021`. `savedRuns` looks for that `-live-` prefix and for `c1-fieldmap-imm5476e-2021-live-`.
  * p2/runs, which is in git (349 files), has neither prefix today. So `row17` is false and `loadSix` gets `{}`: today's behaviour is unchanged, byte for byte.
  * When there is a whole-run map, `ai.plan` REPLAY (ai.ts:149–166) finds it under the same job id, because `draftName(a)` is the official file name.
  * A map recorded in parts uses the job ids `…-2021-p<i>of<n>-<hash>` (sources.ts:338). The gate does not see those, so the gate stays false. That is the safe direction, and the PR body names it as an open assumption.
* **The swap.** Five sample combinations list `imm5476e.pdf`: Visitor visa, Study permit outside, LMIA inside, Express Entry and Spouse (samples/wave1.json). All five get the 2021 file. The library then holds one IMM 5476 edition, which is P-32's rule.
  * C9.1 part 2 needs Visitor visa and With an LMIA, and both are covered. `load six` (no opts) is unchanged. No release rule reads IRCC's accepted-until date (only impact.ts:83 does), so filing the 2021 edition does not block releases by itself.
* **The held edition.** I ran the identity reader on the files. `imm5476e-2021.pdf` reads as IMM 5476 (11-2021), printed, and `imm5476e.pdf` reads as IMM 5476 (11-2025). `intake.one` (intake.ts:388–399) therefore returns `new_edition_held`, with no combination, as C2.4 says.
* **Row 1's move.** I read the email copy, which is the official file plus the Sample trailer, exactly as demo.ts:377 builds it. It reads as **IMM 5257 (06-2019)**, printed.
  * Its checksum is on no list, so it is held. The Approver approves it, and the re-intake then holds it as `older_edition_held` against the Visitor visa's 09-2023. The Approver sets it aside.
  * The C10.1 checks keep their strength: label, page `imm5257.html`, the off-list checksum, not in `form_edition`, nothing held, and the trail keyed on the read label.
* **The citation** matches page-imm5476.html word for word:
  * title "Use of a Representative Form (IMM 5476) - Canada.ca";
  * the quote "A new version of this form is available (11-2025). Make sure you are using the most recent version.";
  * `dcterms.modified` 2025-12-12;
  * the manifest's download date of 2026-10-19.
* **Other suites.** `imm5476e-2021-from-email` is used nowhere else. The suites that load `imm5257e-pre-2023.pdf` (pdf_hardening, screen01, qa_m2_journeys, fill_queue_kinds, s2_fill_trials) use IRCC's own checksum, not the copy's, so they are untouched.
  * acceptance/C10.1:68 (every row done) was already red on main (row 17 "not built yet"), so this is not a regression. Row 17's new "why" passes the forbidden-words check at :32.
  * C9.1 part 2 stays red until the map exists, as the ruling says.
* **Schema and types.** `combinationForm` has `workspaceId`, `lineageKey` and the `RETIRED` status. `timed` is in scope in `loadConfigured` (:402).

## Issues (each: file:line, failing scenario, fix)
**m1 (Minor, Should). The gate is looser than the replay. `api/src/demo.ts:397`**
* The gate calls `savedRuns(jobId)` with no inventory checksum. The replay calls `savedRuns(jobId, inputSha)` (ai.ts:149).
* Failing scenario: the map is recorded against inventory S1, then `p1/inventory/imm5476e-2021.inventory.json` is regenerated as S2. The gate says yes, the swap runs, and the replay finds nothing. IMM 5476 then waits for Draft with AI on all five combinations, and QA-180 refuses the releases: the condition the ruling forbids. acceptance/C10.1:54 would catch it, but only after the merge.
* Fix: pass the checksum of the committed 2021 inventory: `sha(readFileSync(join(SOLUTION, "prototype/p1/inventory/imm5476e-2021.inventory.json")))`.

**m2 (Minor, Should). The test's branch differs from the gate. `tests/check_c10_1_configured.ts:73`**
* `map2021` is true for any file named `studio-fieldmap-imm5476e-2021-live-*`. It skips the validity check and the `c1-fieldmap-…` prefix.
* Failing scenario: the paid run is refused or truncated, and the runner still records it. The test expects "done" while demo.ts says "waiting", so the suite is red for the wrong reason.
* Fix: decide the branch the gate's way (`contract_valid`, `raw_output`, no `output_errors`, completed), or check both prefixes and validity.

**m3 (Minor, Should). The held branch is thin, and the browser check is loose.**
* `check_c10_1_configured.ts:74` does not assert that IMM 5476 (11-2025) is absent from `form_edition`. It also does not assert that IMM 5476 is mapped or released on any combination, which is QA-180's condition.
* `check_c10_1_browser.cjs:47` accepts either status with either text, for example "done" alongside the "Waits…" words.
* Fix: add `form_edition '…(11-2025)' = 0` and one released combination that files the 2021 edition. In the browser check, tie the "waiting" status to the "Waits" text and "done" to the "held" text.

**m4 (Minor, Should). The comment does not match what will run, and the row uses an internal ticket code. `api/src/demo.ts:579–590`**
* The comment says 11-2025 arrives "through the intake … as a person sends". In loadSix, though, the Visitor visa's form finder runs from its saved answer (US$0), and that answer names IMM 5476. Its canada.ca check (finder.ts:626–646, recorded copies) gets the 11-2025 file. `storeDownloaded` (:704–708) then holds it as `new_edition_held` before row 17 runs. Row 17's own intake would then return "Already waiting for a person". The outcome is still right; only the account of how it gets there is wrong.
* The row's words "(the paid runner's, tech lead on QA-207)" put an internal code in front of a person. Row 12 uses "(Lead, 30 Oct)".
* Fix:
  * Confirm the path on the map's PR walk and correct the comment and row wording. If the finder holds the file, say so: that is the product's own path, which P-33 prefers.
  * Use "(tech lead, 4 Nov)" in the row.

Idiom is fine otherwise. `ROW17` and `OFF_LIST_COPY.library` remove the hard-coded labels, and the swap is generic. One nit: demo.ts:583 reads the manifest again even though `officialFiles()` and `intake.sample` exist.

## D1–D20 (runtime/demo row; one line each; no screen changed)
D1 4 (meets ruling (a) point by point) · D2 4 (one edition per form; the held file never enters the library) · D3 n/a · D4 n/a · D5 3 (gate risk m1) · D6 4 (P-170 citation exact) · D7 4 (saved answers only, US$0) · D8 n/a · D9 4 (the row says what it waits for) · D10 3 (m4 words) · D11 4 (status and why in words) · D12–D14 n/a (no UI change) · D15 not measured · D16 3 (m2, m3) · D17 simulated only · D18 4 (each edition's source named) · D19 2 (C9.1 part 2 not reachable until the map) · D20 simulated only.

## Journey test (reviewer role; the one score for this check): **7/10, not a pass, from code and CI only**
Journeys:
1. The author loads the configured checkpoint and reads row 17. Today it says "Waiting", what it waits for, and what follows.
2. The same journey after the map: row 17 is "done", and To review offers New edition: review impact.
3. Row 1: the email copy is held, the Approver approves it, and it is set aside as older.

Journeys 1 and 3 were traced through the code and the reader output. Journey 2 cannot be reached yet.
Score: task ½ · next step 1 · plain words ½ (m4) · feedback 1 · correct data 1 · error recovery ½ (not walked) · accessibility and sizes ½ (not walked) · speed ½ (not timed) · visual ½ (not seen) · trust and sources 1.
To raise it, most valuable first: on the map's PR, walk To review › New edition at 1440 and 1024 px and keyboard-only; time the configured load; fix m4's words.

## What I could not check
* No running app. As instructed: no walk, no axe, no timings, no screenshots.
* The held branch end to end, which needs the map (C9.1 part 2 at the 1440 px walk, C10.1 row-17 "done", and the saved #781 comparison matching the checkpoint's inputs).
* CI results (pending).
* Graph (P-86): not run, because it writes `qa/GRAPH.md` and this check may write only this file.
* The separate journey-test report: not written, for the same reason. Its content is in the section above.

## Round 2: diff-only re-check of e2ab26056 (`git diff 561d59528 e2ab26056`, 4 files), 4 Nov 2026
Reviewer: the same fresh context. US$0. As the tech lead asked, I started no copy, ran no server suite and used no port.

### Verdict: **Approve e2ab26056**
Open: 0 Blockers, 0 Majors, 1 new Minor (m5, latent: it is reached only once the 2021 map exists, and the suite already catches it). CI: `kind` was pending when I checked, and the other checks had not started. The PR merges only on green.

### m1–m4: each fix holds
* **m1 holds.**
  * demo.ts:399–400 now passes `sha256(readFileSync(SOLUTION/prototype/p1/inventory/imm5476e-2021.inventory.json))` to `savedRuns`. That is the same value the replay compares. `ensureJobFile` sets `inputs[0].sha256 = sha(invBytes)` of the same file, which `inventoryOf` resolves for an official file (sources.ts:280, :293), and ai.ts:148 passes `prepared.inputSha`.
  * `existsSync` and `createHash` are already imported (demo.ts:10–11).
  * The gate accepts `valid` only. The replay also accepts `recheckable`, so the gate is the stricter of the two. When they differ, the row waits, which is the safe direction.
* **m2 holds.**
  * The test's rule matches sources.ts:225–231 term by term: `contract_valid === true`, `raw_output`, no `output_errors`, `/^completed/`, `official_files[0].sha256` equal to the inventory checksum, and the `.reconverted` copy preferred.
  * Nit, not raised: the test reads only the `studio-fieldmap-…` prefix, while `savedRuns` also reads `c1-fieldmap-imm5476e-2021-live-`. No such file exists, and the studio runner writes the `studio-` prefix, so the two cannot differ today. The test also ignores `STUDIO_HIDE_SAVED_RUNS`, which only check_forms_saved_parts uses.
* **m3 holds.**
  * The held branch now also asserts that `form_edition '…(11-2025)' = 0` and that the 2021 edition has more than 0 `form_field_map` rows with `outcome = 'mapped'`. The column names match the schema (`form_edition_id`, `outcome`), and check_s6_library_sources uses the same `'mapped'` value.
  * This replaces my "one released combination" suggestion with "the 2021 edition is mapped". That is acceptable, because QA-180's release refusal is already covered by acceptance/C10.1:54.
  * The browser check now pairs `waiting` with the "Waits…" words and `done` with the "held…" words.
* **m4 holds.**
  * The query is `intakeItem.findFirst({ workspaceId, outcome: "new_edition_held", status: "HELD", code: "IMM 5476" })`.
  * *Could it pick another form's item?* No. `code` must equal "IMM 5476" exactly, within this workspace only.
  * *Could it pick an older held item?* No.
    * Reset clears `intakeItem` for the workspace (demo.ts:693).
    * With the swap, the 2021 file is the library's edition, so it is never `new_edition_held`.
    * The finder's hold (finder.ts:707) and row 17's intake add the same checksum, and both deduplicate: the finder with `skipDuplicates`, the intake with "already waiting".
    * So at most one such item exists, and check_c10_1_configured.ts:82 asserts exactly 1. `findFirst` with no `orderBy` is safe for that reason.
  * When the item is missing, `why17` still carries the intake's own message.
  * The row now reads "(tech lead, 4 Nov)".

### New issue
**m5 (Minor, Should). In the held branch, row 1 would count the finder-held 11-2025 file as unreadable. `api/src/demo.ts:414`**
* `unread` takes every intake item with `status: "HELD"` in any outcome.
* Failing scenario: the 2021 map exists, so the swap runs, and the Visitor visa's form finder holds `imm5476e.pdf` as `new_edition_held` inside loadSix (the path m4 now documents, finder.ts:704–707). Row 1 then says "1 official file stays held because the form's edition could not be read from the file (imm5476e.pdf)". That is false: its edition was read as 11-2025.
* check_c10_1_configured.ts:56 compares `outcome = 'held'` with that number, so the map's PR would go red. This is not new in this diff, but m4 makes the path explicit.
* Fix (one line): add `outcome: "held"` to the `unread` query at demo.ts:414.

### Journey score (reviewer role, the one score for this check): **7.5/10, not a pass, from code only**
* Row 17's words now meet the bar: "(tech lead, 4 Nov)", with no ticket code. That raises "plain words" to 1.
* m5 is a wrong statement in row 1's words, but only in the branch that cannot run yet, so it costs nothing today.
* The score is not higher because nothing was walked, timed or seen. That is still the most valuable next step, on the map's PR: To review › New edition at 1440 and 1024 px, and keyboard-only.

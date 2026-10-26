# Lane: runtime — the thin end-to-end slice, then M3 runtime (P-67)

## From the Lead
2026-10-26 (Lead, Mac): for your D1 demo seed (P-93), one line in `api/src/demo.ts`: the work-permit import during /demo/load passes `keepForm: f => f !== "IMM 5409"`, so the starting library does not hold IMM 5409 and DEMO row 1's held copy (the forms lane's seed function) fills a real gap and is **approved** by the second person (row 1 must show an approval). Add a demo-suite check that row 1 ends approved. The forms lane leaves row 1 as merged (rejected as not needed) until your change lands.
2026-10-25 13:30 (Lead, Mac): **S2 early look: GO with five changes** (`screens/03-combination-workspace/lead-check.md`). Stage FIX, owner Builder: sync main (F2 and Screen 02 are merged); the five changes; the channel item (2. below, now unblocked); coverage reads the K1 form-field decisions (now on main); each with a fail-before test; then CHECK (reviewer and breaker, score to the `journey-test` rubric, all ten criteria). Then D1, the demo seed (P-93). P-97 (founder): "filled by" stays read-only here with the link to the shared library; Screen 04 edits it.
2026-10-25 10:05 (Lead, cloud): **S2 received (3d88250); EARLY-LOOK by the next Lead chat.** Stage FIX, owner Builder, for three things before S2's early look:
1. **"Filled by" (re-check Blocker, `screens/03-combination-workspace/recheck-2026-10-25.md`):** remove the new `filled_by` column and its `revise()` write. Who fills a question already lives in `SectionQuestion.collectedFrom`, which the renderer reads. Show and edit that; a change becomes a library change approved by a second person once the screens lane's `LibraryChange` merges (until then the edit control is read-only with "Changes go through the shared library"). The founder is deciding whether it is set once in the library (Lead recommends yes). Keep the where-used count and the rule that background and declaration stay with the client.
2. **Your channel question, decided:** a line's channel picks its field map (Online → the online version's screen map, PDF → the PDF field map), in `render.ts`, with a test that an online-only screen field is asked and counted by coverage. Do it after the forms branch merges (it changes what Online cases ask).
3. **Also in this pass:** D-1 (signoff with no body → 400), D-2 (submit needs the author duty), SC-4 (one filing status on Overview), SC-5 (drop "source-backed"), each with a fail-before test; coverage reads the K1 form-field decisions after the screens merge.
* 11:30: an outside fix PR for D-1 (#25) was closed under the checker rules — `api/src/studio.ts` is busy on your branch and the drop had no fail-before test. D-1 stays yours exactly as written.
Then EARLY-LOOK (Lead) with the slice 2 screenshots. Then D1, the demo seed (P-93, `DEMO.md`).

Command: `/next runtime` in this lane's own copy (`LANES.md`). This lane writes everything below; the Lead writes only the section above.

current_item: 03-combination-workspace
current_slice: DESIGN challenge
stage: DESIGN
owner: Lead
next_action: Lead answers screens/03-combination-workspace/challenge.md (5 points: Preview on caseView, missing records, coverage gate, slices S1–S4, lane overlap; 1 founder question on Sample substitute sets), then moves the lane to BUILD slice 1.
blocked_by: none
updated: 2026-10-25

## Log (last 10 lines)
- 2026-10-25 · Builder (cloud): applied Lead note (P-89, Screen 03 to this lane); DESIGN feasibility challenge written: Build after these changes, 5 Majors/Minor, slices S1–S4 proposed; no code; owner Lead.
- 2026-10-25 · Builder (cloud): PR 13 fix verified on a fresh copy: journey 120/120, R1d 63/63, R1a 99/99, engine 50/50; run-suites --demo 21/21; any 437; copies stopped; CHECK owner Lead.
- 2026-10-25 · Builder (cloud): break on the PR 13 fix: 0 Blocker/Major, 4 Minor; the change now names whose entries; lock race and old copies recorded; engine 50/50.
- 2026-10-25 · Builder (cloud): applied Lead note 02:00 (PR 13 review): a copy keeps each group's live entry ids, so an added (even blank) or removed entry makes it stale; R1d 63/63, engine 50/50, mutations caught; review PASS (5 minors applied); break pending.
- 2026-10-25 · Builder (cloud): "none apply" FIX verified on a fresh copy: journey 120/120, R1d 62/62, R1a 99/99, engine 48/48; run-suites --demo 21/21; any 437; copies stopped; CHECK owner Lead; lane stops.
- 2026-10-25 · Builder (cloud): CHECK "none apply": review 8/10 (2 Majors), break 1 Major (filed copy not stale when none apply withdrawn) + 6 Minors; all fixed with tests, mutations caught; journey 120/120, R1d 62/62, engine 48/48.
- 2026-10-25 · Builder (cloud): synced main e619113 (PR #12 merged); BUILD "none apply" for required groups: client_group_answer (append-only), PUT none-apply, Confirm section, readiness blocks empty required groups; engine 44/44, R1d 57/57, journey 116/116, R1a 99/99; mutations caught; CHECK started.
- 2026-10-25 · Builder (cloud): PR #12 review (Lead): 3 fill-case defects fixed with tests caught by mutation (Online filing line → 422 and not listed; lock refuses a missing or changed file 409; cap counted under FOR UPDATE); R1d 43/43, run-suites --demo 21/21 at be16c22; told the Lead; WAIT.
- 2026-10-24 · Builder (cloud): Lead accepted R1d (3d47004, 21/21); answers recorded: an empty required group that applies blocks ready to file, cleared by a confirmed "none apply" fact (P-71, P-72); STATUS.md verdict is the trial record (IMM 1344 not passed, IMM 5707 passed). Waiting for the Lead PR merge.
- 2026-10-24 · Builder (cloud): FIX R1d done: review minors 1–2 wording too; fresh copy journey 107/107, R1d 38/38, R1a 99/99, engine 39/39; run-suites --demo 21/21; any 437; copies stopped; CHECK owner Lead.

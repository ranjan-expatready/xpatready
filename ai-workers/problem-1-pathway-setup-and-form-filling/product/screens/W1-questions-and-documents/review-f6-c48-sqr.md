# Review: F6 / C4.8, the questionnaire's section choice in the one release (commit cdbacbff)

**Verdict: Approve** for cdbacbff (branch `claude/runtime-c48-sqr`). There are no Blockers and no Majors. Four Minors are listed below. None of them blocks the merge.

Reviewer: an independent session that did not build this. Isolated copy `runtime_c48r` on :4438 (never :4400). No AI was used (US$0). 1 Nov.

## What I re-ran
* `check_c48_sqr_release.ts 4438 xr_studio_runtime_c48r`: **22/22**, and 22/22 again on a second run (not flaky).
* **Fail proof:** I copied `api/src/studio.ts` to /tmp, put in the parent commit's version, restarted the copy and ran the check: **18/22**. The 4 red checks are the title in the history line, the unknown section (201 before), the retired combination's DELETE (200 before) and the retired combination's add (201 before). I then restored the file exactly (sha256 `348a3457…` before and after). That matches the builder's "4 red on main".
* Neighbours: `check_s5_slice2` 31/31, `check_qa92_95_browser` 23/23 (Remove asks first, the Undo toast, Undo puts the section back in place, no console errors). `tsc -p api/tsconfig.json --noEmit` is clean.
* The working tree is as I found it: only the earlier pngs are modified, and the `node_modules` symlink is untracked.

## The guards (`api/src/studio.ts:469-473`)
* **Retired combination (409):** the words match the existing PQR and sources guards (`fact-sources.ts:47, :226`). On a retired combination, Undo of a removal now gets 409 with the words "… is retired: its questionnaire is not changed. Restore it on Structure first". I probed this: remove, retire in SQL, then POST with `sectionOrder`. I accept this behaviour. A retired combination is locked for every other draft change, and its open cases keep their release. When the combination is restored, Undo works again by adding the section. The UI shows no Remove buttons on the retired combination I opened, so a person does not reach this path by clicking.
* **Unknown section (404):** applies only to adding (`on && !section`). I probed it: DELETE of a key the library does not have on a live combination still returns **200**, so removing a section the library later dropped (a rejected AI proposal deletes its DRAFT section, `proposals.ts:195`; a reset clears them all) still works. A key with odd characters (`';--`) gets 404 in words. A malformed combination id gets 404 in words.
* **Submit and release:** after submitting, I added the section back. Approve was refused with "The draft changed after it was submitted: submit it again". So a section change cannot reach a release without being on the reviewed summary. This is C4.8's main point, and it holds.
* The library lookup reads the latest version of a section by key within the workspace. That is correct for the title. No new per-row requests and no new race. The upsert and deleteMany are unchanged.

## Do the checks prove their labels?
Yes for the four new rules: each fails on the parent code. Five checks are labelled "fail" but describe behaviour that already existed:
* the release keeps the section until the next release
* another combination is unchanged
* the 4 guessed approval routes return 404
* not released before submit
* the author cannot approve

These are fail-guards on existing behaviour, not rule removals. That is acceptable for a capability that was already built and only unproven. The build notes say this honestly ("was already … nothing proved it").

## Journey (reviewer score, journey-test skill)
I walked one journey in a headless Chrome browser at 1024 and 1440 px, keyboard-driven for Remove. The persona is the content publisher (author). The goal: "stop showing an empty section on this combination, and see it go out only with the next release."

Steps, all on wp.family:
1. Questionnaires, role Child.
2. "Remove from questionnaire: Application details" with Enter. The dialog names the section, says who it is removed for and that it can be undone.
3. Confirm with Enter. The toast reads `"Application details" removed from the questionnaire` with Undo.
4. Review and release shows one line: Section · removed · Needs Review.
5. Activity shows `… removed the section "Application details" from the questionnaire of "With an LMIA"`.

The approve and release part is covered by the API check (Release 2). Axe found 0 violations on the confirm dialog and on Review, there is no sideways scroll at 1024 px, and there were no console or page errors.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Remove, Review line, Release 2 without the section (check 17) |
| Next step obvious | 1 | The "Next step: Review and release" card, and the header says "1 draft change" |
| Plain words | ½ | The Review warnings show the system name `application_details` 7 times (Minor 1) |
| Feedback and state | 1 | Toast with Undo, a draft banner, the change line |
| Correct data | 1 | One selection row is removed, the audit line uses the title, the other combination is unchanged |
| Error recovery | 1 | Undo in place. Retired and unknown sections are refused in words |
| Accessibility and screen sizes | 1 | Axe clean, 1024/1440 px, keyboard Remove |
| Speed | 1 | No step waited over 1 s |
| Visual quality | 1 | Team look, Review screenshot is clean |
| Trust and sources | ½ | The Review change line names the section by its description, not the title the author removed (Minor 2) |

**Score: 9/10. Pass** (8 or more, no 0).

## Blockers
None.

## Majors
None.

## Minors
1. **System name on Review, on this capability's main path. Not caused by this change: the wording comes from existing code.** After a section is removed, "Validation of the draft" says `Placed in section application_details, which this combination's questionnaire does not use.` (`engine/validate.ts:81`). It should use the section title. This is a STANDARDS words violation that already exists. Log it as a bug row. Also, the check's fail-guard "said in words" covers only the change line, not the warnings around it.
2. **Review change line uses the section's description, not its title.** The author removed "Application details", but Review lists "Case-level facts about the application itself: …" (the change-line label from the draft diff). The toast and Activity use the title, so the same change has two names. This already existed. Fix: label `"<title>": <meaning>`, or the title alone.
3. **A no-op DELETE still writes a history line.** Removing a key that is not chosen (or not in the library) returns 200 and logs `removed the section "That section" from …`. Fix: log only when `deleteMany` removed a row, and use the key-free words. The check also has no pass proving that DELETE of an unknown key stays 200. Add one so that a later change cannot extend the 404 to removal.
4. **Area:** `api/src/studio.ts` is shared. Its release rule is assigned to screens (BACKLOG X1a), and `selectSection` was last changed by runtime (3839ddf4, QA-93). F6 is runtime's area, so the edit is in scope. The PR body should still say that it touches `studio.ts selectSection` (shared with screens) so the screens lane knows when it merges.

## What I could not check
* A real screen reader.
* An intended user's unaided walk (D17/D20 stay with the founder).
* `tools/graph.mjs`, because it rewrites `qa/GRAPH.md` and this review may write only this file.
* The other browser neighbours the builder listed (`check_s5_slice2_browser`, `check_s5_slice3_browser`, `check_screen02_fix`, `check_s6_library_sources`). I relied on the builder's counts for those.
* A visible (headed) browser: the walk was a headless script.

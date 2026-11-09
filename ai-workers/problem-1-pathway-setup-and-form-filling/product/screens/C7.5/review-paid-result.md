# C7.5 paid result (#1396): independent review, 9 Nov 2026 (~12:30 IST)

Reviewer: fresh agent, did not build it. Head reviewed: `9313ec8621db3a5c7ca6de6fa7502d78f806f24b` (diff `origin/main...` 60235a001: 10 files, the saved run, the sheet, 2 new checks, 1 changed check). Own copies only: `rv_c75tw` and `rv_c75cp` on :4436/:4437, then `rv_c75lv`, `rv_c75rr`, `rv_c75p` on :4437. All stopped. No live AI call, US$0. `STUDIO_AI_LIVE` was set only through check_c75_live_fake.ts's usage line, with the env exactly as written and only the copy name and port changed to mine. Before that check ran, the copy reported `GET /session → ai {"live":true,"launcher":"stand-in"}`. p2/runs, p2/jobs, p2/screening, p2/review-sheets and tests/ were byte-identical before and after (sha256 lists). Screenshots overwritten by the browser check were restored. git status is clean apart from this file.

**Verdict: Ship after fixes** (2 Majors, 3 Minors). Journey score 9.5/10 (pass).

## What I measured (fresh copies, live off unless stated)
| Check | Result |
|---|---|
| Saved records: two `live` rounds, completed, contract-valid, no `test_fixture`; cost 0.432524 + 0.429548 = US$0.862; both read inventory 004fc9fb… and sheet 3a2acc10d135… | confirmed by reading the files and sha256sum of the committed sheet (49 lines, review-sheet/v1, values Sample) |
| `check_c75_saved_run_tripwire.ts` on fixture data | 13/13 on a fresh copy (the 2 setup lines print), 11/11 on the second run, exit 0 both times |
| Tripwire on the configured checkpoint (Demo › Load the configured checkpoint) | 9/11, exit 1: "pack's case" FAIL (sheet 666775af9fcc ≠ 3a2acc10d135) and "Saved is offered" FAIL; the run is named. As designed |
| `acceptance/C7.5.test.ts` | fixture 16/16, exit 0 · **checkpoint 11/16** (-6b, -7, -8, -9, -15 red) |
| `check_c75_live_fake.ts` (stand-in launcher) | 17/17. Fake log shows draft:stub, draft:live, then for Stop only round 1. p2/runs unchanged |
| `check_c75_review_runs_api.ts` (STUDIO_MADE_UP_REVIEW_RUNS=1) | 44/44. Committed sheet intact (3a2acc10d135), canary and stub-pass restored |
| `check_c75_review_page_browser.cjs` | 37/37 (12 screenshots restored) |
| Gate B `--plan` with this PR's title and body | names C7.5 and runs it "fixture only" (NOT TESTED warning). CI will not see the checkpoint result |
| graph.mjs | no gap names C7.5. Both new checks and `/review-runs/:run/stop` are in the graph |

## Done-when (tech lead)
Both new checks fail on tampered input and pass on the saved run: **met**. The tripwire has its own tamper steps (a changed value, an inventory byte, a missing sheet, a changed answer → 409), and the real checkpoint data turned it red. The live check refuses a wrong, missing or stale card and two forms. Pack 16/16: **met on the fixture data, not on the checkpoint** (below). Approve on the exact head: not yet, see the Majors.

## The checkpoint (11/16): is it handled honestly?
**In code: yes.** The tripwire fails loudly on the checkpoint and names run b4936d0b. The product refuses to replay the run for other answers (BR-3, 409 US$0). The builder did not widen the replay key, did not fit the case to the sheet, and did not ask for another paid run. Choosing the next step is for the tech lead (and the founder if money is involved), not new scope from me.

**In the record: no.** C7.5's scoring data is the checkpoint: P-322; works-set.mjs `scoringOf` (an M3 row → checkpoint); the CAPABILITIES row's evidence is "on the configured checkpoint". On that data this paid run gives the pack nothing past -6. The PR does not say this anywhere: 0 comments, the commit messages are silent, and the body says "Pack … 16/16" without naming the data. → Major 2.

## Issues, ranked
1. **Major (Must), money safety:** `tests/check_c75_live_fake.ts:46-51` turns live AI on but never proves first that launches go to the stand-in. If `STUDIO_FAKE_LAUNCHER` is not honoured (path, link, or a var folder `launcherFor` does not accept, `api/src/sources.ts:61-65`), the guarded `p2/launch.ts` runs silently. Then the "Live run of the card read" (:71), the two-at-once case (:88) and Stop (:96) become real paid calls, worst US$4.80 each, and the check only goes red afterwards (:75). 16 of the 19 live-switch checks carry the P-192 guard, e.g. `check_cost_override.ts:54-55`. **Fix:** before any POST, read `GET /session` and stop the whole check unless `ai.live === true && ai.launcher === "stand-in"`. Fail case: run it on a copy started without the fake launcher, where it must stop before any launch.
2. **Major (Must), record honesty (CLAUDE.md "never deviate silently", P-275):** the PR body is stale and in parts false. "The sheet files … are not committed" is false now: one sheet is committed. Items 1–2 under "Not done yet" are done. Nothing says pack 11/16 and tripwire red on the checkpoint, the 69 vs 49 form fields, or the builder's question to the tech lead. qa labels this PR after its own Saved check on its scoring data (P-275), and would meet 11/16 with no explanation. **Fix (body only):** each number with the data set it was measured on, the checkpoint result and its cause, the tripwire red there by design, and the question as a "Question for the tech lead" comment.
3. **Minor (Should):** the tripwire's own failure detail is cut by `recorder()` at 260 characters (`tests/runtime/api.ts:28`). On the checkpoint the list of lines that moved shows only `Citizenship: Afghanistan → Ind`, but the header (:5) promises "the lines that moved". **Fix:** print `moved` first, or on its own line when the step fails.
4. **Minor (Should):** `check_c75_review_runs_api.ts:121` (break m) now runs only after a *refused* replay (`review-runs.ts:229` returns 409 before `writeSheet` at :235). A successful Saved run that wrote the sheet would no longer be caught, because the made-up replay of plan2 comes after the assertion. The step name still says "a plan or a Saved run". **Fix:** move the assertion after the made-up Saved run of plan2 (:123).
5. **Minor (Should), for the tech lead:** both new run records keep `launch_evidence` paths under `/Users/<founder's login>/…`, a personal name (AGENTS.md rule 5). The push guard's `\bRanjan\b` misses it inside the login. 13 live runs already on main do the same (newer ones write `<main copy>`). Do not edit the records (P-188); close the guard gap in its own row.

Noted, not findings: the builder's "tripwire 11/11" is the count on a copy that already has its releases (13/13 on a fresh copy). The PR's checks use ports 4438/4439 (runtime lane, allowed). P-422 is not yet in DECISIONS.md, so I could not check its text.

## D1–D20 (scope: this PR's capability, the saved paid review and its checks)
D1 4 · fixture pack 16/16, M2 tripwire present; checkpoint 11/16 · D2 4 · rerun adds nothing ("4 already on the case"), two Live runs at once → 201/409 · D3 4 · the committed sheet is the product's own `sheetText` · D4 N/A · D5 4 · reload keeps the 4 findings; Stop ends round 1 · D6 4 · run date and edition on the card; audit names the run files · D7 5 · every AI row: AI, Replayed, High/Low, both reasons, quote, Show on the form · D8 4 · Cases › case › Review · D9 4 · one primary button · D10 4 · refusals in words · D11 4 · steps tick, result in a live region · D12 4 · see BIC-19 · D13 4 · axe 0 on 4 states, 400/1024/1440 with no sideways scroll, keyboard Enter · D14 4 · team tokens · D15 5 · Saved run 127/161 ms · D16 3 · tamper cases present; Majors 1 and 4 leave gaps · D17 simulated only · D18 4 · findings trace to the run files in the audit · D19 3 · closes on fixture data, not on the checkpoint · D20 simulated only.

## BIC scorecard (Review page on the real saved run, my walk; shots in my scratchpad, not committed)
| BIC | | BIC | | BIC | | BIC | |
|---|---|---|---|---|---|---|---|
| 01 | N/A | 06 | Met: Low first, both reasons | 11 | Met: one primary | 16 | N/A |
| 02 | N/A | 07 | N/A | 12 | Met: warns, never blocks | 17 | Met: nothing self-approves |
| 03 | N/A (a changed fact resolved the "India" finding) | 08 | Met: per filing, then person | 13 | Met: "No saved review … with these values yet" | 18 | Met: result live region, toast |
| 04 | Met: Saved / Live, Live refused in words | 09 | N/A | 14 | Met: SI-6 chip, pills | 19 | Partly: the "4 new findings" toast covers the group header at 1440 for its few seconds (not changed by this PR) |
| 05 | Partly (as concept): source line plus Acknowledge/Dismiss | 10 | N/A | 15 | N/A | 20 | Met: axe 0, no sideways scroll at 400/1024/1440 |

## Journey test (reviewer role, headless Chrome: no visible browser in this environment)
Persona: case officer. J1 main path: case page › Open Review › Saved by keyboard → "Saved: 4 new findings. US$0.00" (Low MAJOR "India", Low INFO "No", High MAJOR "Annulled Marriage", High MINOR "2015"), then Show on the form highlights the quoted line. J2 error: one answer changed → Saved disabled "IMM 5257: No saved review of this form edition with these values yet."; the quoted finding moved to resolved. J3 wrong role: the client sees "This page is for the case officer", no card, API 403. J4 recovery: reload keeps 4; running again says "no new finding, 4 already on the case". Data underneath: 4 `review_finding` rows, all replayed, High/Low as shown; the audit line names both run files, with no value or reason; `ai_batch` unchanged. Walked twice on two fresh cases, with the same result each time.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 on the fixture data. On the checkpoint (C7.5's scoring data) Saved is refused: Major 2 |
| Next step obvious | 1 | one primary button; Acknowledge… / Dismiss… on each row |
| Plain words | 1 | result and refusal lines |
| Feedback and state | 1 | steps ticked, result line, toast |
| Correct data | 1 | DB as above |
| Error recovery | 1 | J2, J4 |
| Accessibility and sizes | 1 | axe 0 ×4, no sideways scroll at 3 widths, keyboard |
| Speed | 1 | 127 and 161 ms |
| Visual quality | ½ | the toast covers the group header (BIC-19) |
| Trust and sources | 1 | AI and Replayed marked, run date, both rounds, quotes |
| **Total** | **9.5/10, pass** | |

Not checked: a real screen reader; an intended user's unaided walk (D17/D20 stay with the founder); P-422's wording; the 69-field count on the checkpoint (I saw a different sheet, 666775af9fcc, but did not count its lines).

**Verdict: Block**: fix 1 (stand-in guard in `check_c75_live_fake.ts`, with its fail case) and 2 (PR body and the checkpoint question on the PR). Then a diff-only re-review on the new head. Minors 3–5 are fixed or listed in the PR.

## Re-review on a3b496d (diff-only, 9 Nov)
Head `a3b496d836cffc1adfbdb1a16e64097bfe3b81a8`; diff `9313ec8..a3b496d`: 3 test files plus this review. Own copies on :4436/:4437, all stopped. US$0. Live was on only through the live check's usage line, and that copy reported `{"live":true,"launcher":"stand-in"}` before the run. p2/runs, jobs, screening, review-sheets and tests/ were byte-identical before and after. git status was clean.
* **Major 1: closed.** `check_c75_live_fake.ts:50-52` reads `GET /session` before anything else and exits 1 unless the copy reports live on with the stand-in launcher. I ran the failing case on a plain copy: "FAIL P-192 guard … {"live":false,"launcher":"guarded"}; stopped before any start", exit 1, no setup, no fake-launch files. On its usage-line copy: 18/18, exit 0.
* **Major 2: closed.** The PR body is rewritten: every number with its data (16/16 fixture, 11/16 checkpoint, tripwire 9/11 there), the cause (69 vs 49 fields, other first choices), Gate B fixture-only, nothing widened and no second run, and the question for the tech lead. The stale lines are gone.
* **Minor 3: closed.** On the checkpoint (reloaded), the tripwire prints the run, the new sheet and the moved lines in full, e.g. "Citizenship: Afghanistan → India", "SameAsCORIndicator: No → Yes", "nativeLang: Ada → Hindi". Two leftovers, not blocking: the body says "every line" but the code prints the first 12 (and the log says so); a box whose caption changed but value did not shows as "No → No".
* **Minor 4: closed.** The break m assertion now follows the successful made-up Saved run of plan2 (the next step asserts 201). API check 44/44.
* **Minor 5:** listed in the PR body, not changed (as asked).
* No new finding in the diff.

**Verdict: Approve a3b496d836cffc1adfbdb1a16e64097bfe3b81a8**

## Re-review on fefebef (diff-only, 9 Nov)
Head `fefebef3c7e2fed4fe4469d5a22783a840eaee6a`; diff `5560afc..fefebef`: the tripwire and the live check take one saved pair per data set, plus the new `studio/tools/c75-pack-case.ts`. The tech lead ruled (Lead 39) that a second paid run will be made on the configured checkpoint; nothing is spent here. Measured on a detached worktree fixed at fefebef with its own node_modules and web build, on own copies at :4436/:4437, all stopped. US$0. Live was on only through the live check's usage line, and the copy reported `{"live":true,"launcher":"stand-in"}` first. p2/runs, jobs, screening, review-sheets and tests/ were byte-identical before and after. My first attempt was void: the shared checkout was switched to another branch partway through, so its last steps ran without the saved files. Everything below comes from the worktree.
* **Tripwire, fixture data: 14/14, exit 0.**
  * Each committed pair is checked on its own: real, made by one job, and reads its committed sheet and the unchanged inventory.
  * "No two pairs read the same sheet" holds.
  * The pack's case matches exactly the b4936d0b pair, and Saved offers exactly that pair.
  * The tamper checks still run on b4936d0b.
  * A later paid run gets its own pair name, because each live run's job id contains its run id. The fake launcher's runs got 63072dd3 and 6516ee5b.
* **`c75-pack-case.ts`:**
  * With `--expect 3a2acc10d135`: exit 0. It printed 49 form fields, sheet 3a2acc10d135…, `saved_available: true`, `live_allowed: false`, live about US$1.06 and at most US$4.80, and the live request.
  * With `--expect 666775af9fcc`: exit 1, "the sheet is 3a2acc10d135, not the expected 666775af9fcc: stop, nothing was run".
  * It only plans (reads files). The copy's single `ai_batch` row is the Visitor visa setup's US$0 REPLAY.
* **`check_c75_live_fake.ts` through its usage line: 19/19, exit 0.** The P-192 guard passes first. The new step finds the pair whose recorded sheet matches this data's sheet (3a2acc10d135…), and the fake answers with that pair. p2/runs was unchanged.
* **Configured checkpoint:** not re-run. With no checkpoint pair committed it is red by design. #1411 (one checkpoint sheet, effce263ca43) is separate. My two checkpoint loads earlier today gave 666775af9fcc and then 123a97599291, which confirms the load-order question. `--expect` stops a paid run on the wrong sheet.
* **Minor (Should), new:** two of the new rules have no failing case: "no two pairs read the same sheet" and "every first round has its checker". `c75-pack-case.ts` has no check of its own. This does not block: the tool is for the tech lead, and tests may not write runs into p2/runs. A pure-function test over made-up pair lists would cover the two rules.
* No Blocker or Major.

**Verdict: Approve fefebef3c7e2fed4fe4469d5a22783a840eaee6a**

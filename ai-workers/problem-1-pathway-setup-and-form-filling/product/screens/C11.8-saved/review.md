# C11.8 Saved for IMM 5645 — independent review (PR #872, commit 5afd90be4d6e2a4b6f871a629bc26fb82bec8233)

4 Nov, reviewer (did not build it). Base origin/main 9caa043b. Diff: `acceptance/C11.8.test.ts` (new pack), `screens/C11.8-saved/` (walk.md, 4 screenshots). No app code. Row: `qa/CAPABILITIES.md:94`; P-175, P-194, P-227.
How I checked it: isolated copy `rev_c118` on :4455, live AI off, stand-in launcher. The pack ran twice on fresh copies: **30/30, exit 0** both times (2 m 47 s per run). I walked the journeys myself (`journey-test-reviewer-2026-11-04.md`), probed the API and the database, did a Ctrl-C break test, and checked p2 with `find -newer` and `git status --ignored` before and after. My runs changed nothing in p2. The copy is stopped.

**Verdict: Ship after fixes.** Two Majors. Both are builder judgment calls the brief asked me to challenge, and both make a pass label claim more than the product does.

## Is the pack honest?
* **It could not pass with the qa defect present.** Checked against the app at 83f846a5 (before #762):
  * `draftOptions` had no `saved_parts`, so line 133 fails.
  * The dialog had `disabled={!saved.length}` and "No saved AI answer for this form yet", so line 138 fails.
  * A REPLAY start with no `runFile` went to `useSaved` with no saved file, so line 151 fails.
  * The sweep's dialog test is false for IMM 5645, so line 102 fails.
  * `STUDIO_HIDE_SAVED_RUNS` did not exist, so lines 162/168/172 fail.
* **Pass and fail cases.** Each IMM 5645 rule has both: all four parts saved, then part 2 hidden. Both cases are checked in the dialog (browser, 1440 px), at the door, and in words. The exception is the sweep (m5).
* **Waits fail loudly.**
  * The dialog waits time out at 30 s and throw. The catch prints "the check itself stopped", restores, and exits 1.
  * The job poll gives up at 120 s and the check then fails, showing the job's last status.
  * The restart poll stops with exit 2.
  * One fixed sleep remains (m4). It can only cause a false fail, never a false pass.
* **Safety is good.**
  * `checkCopy` refuses :4400 and any database that is not an isolated copy's.
  * Every restart blanks `STUDIO_AI_LIVE`.
  * Hidden runs are honoured only on an isolated copy with the stand-in launcher and live off (`api/src/sources.ts:68`).
  * The stand-in's live step exits 1.
  * The launcher log and the shared ledger are compared byte for byte.
  * The pack writes nothing to p2/runs, p2/jobs or the demo.
  * Restore runs on error, SIGINT and SIGTERM. Gap: m6.
* **Labels.** Every `ok()` label starts with "C11.8".

## Issues (ranked)
1. **Major (Must) — judgment (b): the sweep counts as passes Saved offers that the product refuses.** `C11.8.test.ts:99` accepts plan `skip` + "Being mapped in …" whenever the dialog offers Saved.
   * On the six, 17 form rows are like this: IMM 0008, 5406, 5409, 5475, 5476, 5669 and 5707 on the combinations that share them.
   * For every one of them, `POST /attachments/:id/draft {mode:"replay"}` returns **409** "Being mapped in Express Entry stream: 10 proposals left …" and queues nothing.
   * In the browser, Spouse or common-law partner › Forms › IMM 5406 › Draft with AI shows Saved selected and "Use Saved (US$0)" enabled. The click ends in an error toast.
   * So the line-102 label ("offered as Saved by its dialog and the plan") is false for those rows.
   * Fix: make `skip` its own outcome in the sweep. List those forms by name, and assert that the dialog does not offer a Saved start the door refuses. That check fails today. Either the forms lane closes Start in `DraftDialog` (`web/src/pages/sources.tsx`) with the plan's "Being mapped in …" reason, or the mismatch goes to `challenge.md` / a QA item. Do not count those rows as passes.
2. **Major (Must) — judgment (a): a Live start with every part saved is shown as "Live" although no model was called, and the pack does not test this case.**
   * Probe on the fixture, live off: `POST …/draft {mode:"live"}` returns 201. The stand-in launcher was asked 4 times, stub only. The step is COMPLETED at US$0.00.
   * The job's message reads "**Live AI draft** in 4 parts…". The job page badge reads **Live** · Completed · US$0.00 · 1s, with no "no model was called" line. The Saved run of the same parts says "Saved: no model was called now".
   * P-227 defines Live as "a real model call" and says Saved is "labelled wherever it is shown". P-194 covers one Continue for retries of the same run, so it does not support this behaviour.
   * The pack's header (line 13) says "a Live start is refused (409) before anything is queued", but the 409 is checked only with part 2 hidden (lines 173–177). With every part saved it is not refused.
   * Fix:
     * Correct line 13 and the comment at lines 173–174, and drop P-194 from them.
     * Add a check of the all-saved Live state: US$0, no model call, and not labelled "Live AI draft" or badged Live. It fails today. The label comes from the completion message in `api/src/sources.ts` ("Live AI draft", in the compare step) and from the job badge.
     * Or raise it in `challenge.md` for the tech lead: should P-175 refuse this start, or should the result be relabelled Saved?
3. **Minor (Should) — counts.** Line 102 says "16 forms" but lists 13 names; on the fixture it says "3 forms" for 2. Count unique forms, or say "16 form rows (13 forms)".
4. **Minor (Should) — one check passes on the six whatever the Saved start does.** Line 153 (`proposals5645() > 0`) is true there before the Saved start, because Load sample already drafted IMM 5645. Count the proposals of job `J`.
5. **Minor (Should) — the label says "Use Saved (US$0)" but the check makes an API call (line 145), not a click.** My keyboard walk shows the button path works: 4 Tabs, Enter; a double Enter makes one job; 3.9 s to "Review AI proposals". Rename the label, or click the button.
6. **Minor (Should) — a fixed sleep.** `waitForTimeout(300)` at line 121. Wait on `[data-start-ready]` or `[data-mode]` with a timeout instead.
7. **Minor (Should) — the sweep's fail case is never run.** Also, line 89 (`!o?.job_id → continue`) skips forms silently. Run the sweep once with `imm5645e-p2of4` hidden and expect exactly IMM 5645 to be missed; report skipped forms with no job id.
8. **Minor (Should) — restore is incomplete on Ctrl-C.**
   * Break test: SIGINT just after the IMM 1344 check gives exit 130 and leaves the copy **stopped**. That is safe (no hidden-run server is left serving), but the copy is not restored.
   * Also, `restart()`'s timeout calls `stop()` without `restore()` (line 60).
9. **Minor (Should) — walk.md overstates the six's entry.** It calls `?draft=` "the link a failed Live run's 'Use Saved (US$0)' gives", but no suite proves that link for a form saved in parts (the `runs.ts` `allParts` branch added by #762). `check_forms_d2_live_fails_offer_saved.ts` covers IMM 5257 only, which has one whole-form answer.

Judgment (c) (`?draft=` on the six): **accepted.** Load sample already used the saved parts there, so the row correctly shows Review AI proposals. The person's button path is walked on the fixture and in the six's part-missing state. Items 4 and 9 still apply.
The pack overlaps `tests/check_forms_saved_parts.ts` (#762) on API states. Its new evidence is the 1440 px dialog on both setups, the intake path on the fixture, the sweep, IMM 1344 from its parts alone, and the Live 409.

## Standards [M] and dimensions (1–5; one line of evidence each)
D1 3: the Saved rules are met for IMM 5645; Major 1 and Major 2 leave P-227 unproven elsewhere · D2 4: one job per double Enter, nothing queued on a refusal · D3 n/a · D4 n/a · D5 4: part missing → waits, never half-filled; Ctrl-C leaves the copy stopped (item 8) · D6 n/a · D7 3: Saved is labelled; a Live run at US$0 is badged Live (Major 2) · D8 4: breadcrumb Visitor visa › Forms › AI field-map draft · D9 3: the shared rows offer a start that is refused (Major 1) · D10 4: "3 of its 4 parts only: it waits for Live, so it is never half-filled" · D11 3: Start Live is enabled with no live-off notice when every part is saved (QA-138) · D12 4: screenshots · D13 4: axe none at 400/1024/1440, no sideways scroll, focus moves into the dialog; 200 % zoom not checked · D14 4: team components · D15 4: Saved in 4 parts, about 4 s to review · D16 3: items 4, 7 and Major 1 · D17 simulated only · D18 4: the saved file and cost are shown under Details · D19 4: the fixture walk goes from the intake to Saved to review · D20 simulated only.

## Still unproven in C11.8's row
* Progress, Stop and cost on a real live run: one live run (#746, `screens/C11.8-live-run/`), the founder's live gate J2.
* A failed Live run offers Saved for a form saved in parts (item 9).
* Honest labelling of Live when every part is saved (Major 2).
* The other clauses are proven: P-175 door rules by `check_forms_c118_acceptance.ts` 22/22 (CI); P-179/P-194 by `check_cost_override.ts` 72/72 (CI). I did not re-run those two: they start their own copy with the live switch.

## Could not check
* A real screen reader; 200 % zoom.
* An intended user's unaided walk (D17/D20).
* P-86 graph: `graph.mjs` scans only `tests/check_*`, so `acceptance/*.test.ts` packs are never linked to their capability. This is a tool-wide gap, not this PR's.
* Ten files were already modified in the working tree before my runs (W1 screenshots, `p2/runs/stub-pass/*imm5257e*`, `canary-digest.json`, `check_ai_orchestration.json`, all timed 07:41). They are not in this PR, and my runs did not touch them.

Verdict: Changes requested (Block: Majors 1 and 2 open) — reviewed commit 5afd90be4d6e2a4b6f871a629bc26fb82bec8233

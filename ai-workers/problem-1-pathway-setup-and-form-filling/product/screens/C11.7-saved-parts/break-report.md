# C11.7 saved parts: break report (forms_br, port 4474)

Target: commit eacb7da94 (Saved and Load sample use a form's saved parts). Tested on the API of an isolated copy (`isolated.sh forms_br 4474`, stand-in launcher, live switch never set, US$0). The six were loaded and IMM 5645's four saved parts (untracked, from #746) were used.
Caveat: the builder changed the working tree while this ran (HEAD moved to b7b5ba43e, and `sources.ts`, `sources.tsx` had uncommitted edits: the hook guard, `saved_parts` in draft-options, the final message). Each restart loaded the working tree. None of the results below depend on those edits unless a line says so.
Launcher check: `var/isolated-forms_br/fake-launch.log` was never created, so no Saved path called the launcher. That covers about 10 Saved starts (2 of them runs of the sample), the failed, cancelled, retried and reset runs, and a Live run of the all-saved form that was cancelled before part 1.

## Blockers
None.

## Majors
None new.
- Known, already being fixed in the working tree ("Opus Major 2"). At eacb7da94, `draftOptions` returns only whole-form `saved_runs` (`sources.ts:245`), and the Draft dialog reads only those (`web/src/pages/sources.tsx:136`). So the form's own Draft dialog cannot offer Saved for IMM 5645, even though the API allows it. Load sample does use the parts.

## Minors
1. **The failure gives the wrong cause.** What I did: queued Saved while all 4 parts were present (STUDIO_HOLD_QUEUE=1), then restarted with STUDIO_HIDE_SAVED_RUNS=imm5645e-p3of4. Expected: words that say the saved answer is missing. Actual: FAILED with "part 3: no saved AI answer for exactly this part now (the library changed since the plan)". The library had not changed; a saved run file was gone. The same words appear in `GET /runs/:id` error.what. `sources.ts:416`.
2. **Retry is offered for a failure it repeats.** The run view's next step is "Retry the failed step" (`runs.ts:120`). Retry does not re-plan (`ai.ts` retry). Attempt 2 failed with the same words, US$0. It can go up to 3 attempts before "needs a person", and none of those attempts can succeed while the part is missing.
3. **The cancel message says something was sent.** Cancelled at part 2 (STUDIO_PART_PAUSE_MS=4000): "1 of 4 parts ran before the cancel; the rest were not sent." A Saved step never sends anything. `sources.ts:443`.
4. **Saved and Live point at each other.** With part 4 hidden, Saved is refused ("Saved AI answers for 3 of its 4 parts only…", 400). A Live start is then refused with "AI now is switched off… Choose Saved (US$0)…", which points back to Saved. `ai.ts:41`. The text is older than this change; this change makes the case reachable.
5. **"Use Saved" ignores saved parts.** A failed Live run offers "Use Saved" only when there is a whole-form valid run (`runs.ts:96`, still the same in the working tree). A form with all parts saved never gets the link. Found by reading the code: cancelled runs have no error block, so I could not trigger it.
6. **A form not yet read shows wrong words.** If every part is saved but the form has not been read yet (`read_first`), the plan says "No saved AI answer to use (the form has not been read yet)" (`ai.ts:164`), but the saved answers exist. The whole-form Saved path reads the form first instead. Found by reading the code.
7. **Known, being fixed in the working tree ("Opus m3").** At eacb7da94 the hook ignores the live switch (`sources.ts:66`). On an isolated copy started with STUDIO_AI_LIVE, hiding a part would make Live pay for that part. The plan does show that cost first, but the comment "it never spends" is not true at that commit.

Not caused by this change (recorded only): Saved on a form whose Saved draft is still waiting for review adds a second identical set of waiting proposals. IMM 5645 had 9 + 9 under two run ids, and whole-form IMM 5707 did the same. `GET /runs/:id` shows `counts: null` for parts steps, which also happens for Live parts.

## What held
- **Never half-filled, plan time.** With p3 or p4 hidden, the plan says not_eligible: "Saved AI answers for 3 of its 4 parts only: it waits for Draft with AI, so it is never half-filled." A Saved start returns 400 and queues nothing. Load sample reports `waiting_for_draft_with_ai: ["IMM 5645 (01-2021)"]`, with 15 forms replayed instead of 16.
- **Never half-filled, run time.** The step ends FAILED, the proposals stay at 9, cost_usd is 0, and each part's state is right (3 done, part 3 failed).
- **Concurrent starts.** 3 Saved starts at once gave 1 queued and 2 × 409 ("a draft of this same form was started a moment ago").
- **Saved while a stub draft is queued:** 409 "already queued or running".
- **Bad runFile.** A path-traversal value and a part's run file name each got 409 "not the newest valid run", with nothing queued. An empty runFile goes to the parts path.
- **Wrong role and unknown id.** user-C got 403 and an unknown source got 404.
- **Cancel during the run:** CANCELLED, nothing applied, US$0. Retrying the cancelled step gives COMPLETED (the 4 saved parts, US$0).
- **Reset during the run (after part 1):** the job is removed, no proposals, no merged run is written, and the server stays up.
- **Library change between plan and launch.** `plan_sha256` covers each part's file and saved run (`ai.ts:162,188`), so launch returns 409. Between launch and run, the parts are worked out again when the step runs, and a part without a saved answer fails the step. I showed that with the hook. I could not change IMM 5645's parts through the library in the six: they depend only on published maps of another IMM 5645 edition, and the six has none. That part comes from reading the code.
- **Hook outside an isolated copy.** `VAR_ROOT = STUDIO_VAR ?? studio/var` (`core.ts:27`). On the demo copy the folder name does not match `isolated-*`, so the hook is ignored. This is the same guard as the stand-in launcher.
- **Words while running:** "saved AI answers in 4 parts: part 2 of 4 done · 74 of 139 form fields." Plan totals show worst_usd 0, model_calls 0 and live.blocked false.

Not attributed: once, the copy stopped silently during a Load sample right after a restart (curl got no answer, and api.log has no line for it). It did not happen again on retry. Other suites were running on this machine at the time.

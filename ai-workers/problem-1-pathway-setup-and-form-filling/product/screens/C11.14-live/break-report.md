# Break report: C11.14-live, commit 0e2b64e2c (completed_with_unresolved accepted by StepRunner.launch)
Method: in-process, fake launcher, US$0, no server/network. Script: /tmp/claude-0/-home-user-xpatready/4a02ef13-b1c0-5884-8900-0e666d875a28/scratchpad/brk.ts

## Breaks
1. Minor: status ["completed"] (an array) is accepted as finished. api/src/rounds.ts:205 (and 198, 202, 207, 209-ish: every `FINISHED_RUN.has(String(rec.drafting_run?.status))`; same pattern in engine/rounds.ts:39).
   Repro: run record {drafting_run:{status:["completed"],usage:{cost_usd:0.1}}, contract_valid:true, raw_output:'{"forms":[]}'} -> ok:true, from "live". Also [ "completed_with_unresolved" ]. Before the change `!== "completed"` refused it, so this is a new, if unreachable-in-practice, hole (p2 writes plain strings). Fix would be `typeof s === "string" && FINISHED_RUN.has(s)`.
2. Minor (consistency): the same finished-state rule is still the old one in other readers, so a paid unresolved round is used live but not replayed or reused. api/src/finder.ts:811 (saved-run listing: status !== "completed" skips it), api/src/people-ai.ts:273 and :297. The same answer you paid for is usable once, then ignored on reload/replay. engine/rounds.ts:39 (isSameSavedRun) does accept it, so replay in StepRunner works; finder.ts:811 does not. Check scope against the concept before filing as a defect.
3. Minor (pre-existing, not from this change, now reachable by one more status): cost is `Number(usage.cost_usd ?? 0)` with no check (rounds.ts:~185). cost_usd "abc" -> costUsd NaN, -5 -> -5 (a negative cost would reduce a spend total), missing/null -> 0 on a paid run. Same for status "completed".
4. Minor: a contradictory record is used. status completed_with_unresolved, valid, with output, and attempts = [only refused_by_provider] (cost 0) -> ok:true. Because the refused/limit/busy guards are skipped for finished runs, a record whose only attempt was refused or busy but which carries raw_output is trusted. Same as "completed" before; no real producer writes it. Not a money loss (cost 0).

## Held (reproduced, correct)
- unresolved + contract_valid false -> refused, cost 0.3 kept. No raw_output -> refused, cost kept. raw_output an object (not string) -> refused, cost kept. Unparseable -> "not readable", cost kept. Wrong shape -> refused, cost kept.
- unresolved + usage-limit attempt and NO output -> blocked:true, cost 0.22 (timed-out attempt kept, refused attempt free). With output (a later attempt answered) -> used at 0.22; cost right.
- unresolved + refused_input_too_large -> refused at US$0 (check runs before the status test).
- unresolved + refused_by_provider after an errored attempt, with output -> used at 0.22 (the retry's output is kept; cost counted).
- Case/whitespace: "Completed", " completed", "completed ", "COMPLETED_WITH_UNRESOLVED", "completed_with_unresolved\n" -> all refused, cost 0.1 kept.
- Non-strings: null, undefined, 0, 1, true, {}, object with toString()->"completed" (JSON-serialised in the file, so a plain object), "[object Object]", "completed,x", ["completed","x"] -> all refused, cost kept.
- refused, invalid_output, timed_out with well-formed output -> still refused, cost 0.12 kept (also in the commit's own test).
- Stub-mode refusal (stub exit 2) -> ok:false, costUsd 0, plain words, no launcher text.

# Review: QA-312 (Bug, Major, pack fault): C6.9-18, PR #1348 at 4dfbde100 (`git diff origin/main...4dfbde100`)

Independent reviewer (did not build it), 8 Nov. Diff-only review. The ruling is the tech lead's (Lead 34): in the pack, before -18, the client re-confirms each officer-recorded background answer through the product's own route, as `acceptance/lib/m3.ts` `fillEverything` does. Keep -18's words and condition. No product code.

My copies ran on :4436 only and were stopped and dropped after. All values Sample. US$0. Unconfirmed: no counsel.

**Verdict: Approve.** 0 Blockers, 0 Majors, 2 Minors. The change does exactly what the ruling asks and nothing else.

## What I ran (exact commit, working tree at 4dfbde100)
* **Gate B on the checkpoint:** `GATE_B_DATA=checkpoint GATE_B_PORT=4436 GATE_B_NAME=revc69 node tools/gate-b.mjs --title "runtime: C6.9 — QA-312" --kind code` gave `C6.9.test.ts on the checkpoint: exit 0, 21/21 passed` (117 s) and "Gate B: passed". This matches the builder's evidence.
* **Reviewer probe** on a fresh copy `revc69p`: Reset, then Load configured (122 s). It replays the pack's c2 path with controls and gave 10/10. Details are in `journey-test-reviewer-2026-11-08.md`.
* **Graph:** `graph.mjs --check` gives G1 0, G2 0, G4 0, G5 0. The reconfirm route is not among the untested routes.
* **Drift:** the merge base is 7e94da44f. Main has not changed `acceptance/`, `api/src/runtime.ts` or `engine/runtime/` since then.
* **Not re-run:** gate B on the six (default data). That is the builder's 21/21; the change reads the case it creates itself, so the data set does not enter into it.

## The questions asked
1. **Does it do exactly the ruling?** Yes.
   * `C6.9.test.ts:93-96`, as the client (`CLIENT`), calls `POST /runtime/cases/:id/answers/:answer/reconfirm` (`api/src/runtime.ts:677` → `reconfirm` `:473`) for every answer, and every row answer, that the product itself marks `awaits_client` on the Agent view.
   * It touches only case c2, which the pack opens itself.
   * The diff adds 6 lines and removes none.
2. **Is -18 unchanged?** Yes. Line 98 is byte-identical to main's line 92: the same words and the same condition (`LIKELY_ELIGIBLE && restingOn(r2).length === 0`).
3. **Are -16 and -17 unaffected?** Yes.
   * The new lines sit after -17 (line 89) and after the existing `confirmAll` (line 90). Nothing before them changed.
   * The loop's `a` and `q` are block-scoped and only shadow the outer `let a`, which is never written. `r2` is reassigned at line 97 exactly as before.
   * -19 calls the pure function only.
4. **Does it lower the bar?** No.
   * **The product decides what may be re-confirmed, not the pack.** Probe-b: after `confirmAll`, exactly one answer waits, `person.criminal_history`, so the loop re-confirms exactly what qa named.
   * **The route keeps its own guards:**
     * the officer gets 403 (probe-d), and the line stays (d2);
     * a non-background officer answer (passport number) gets 409 (probe-a);
     * a second re-confirm gets 409 (probe-f);
     * the value must be unchanged, and an answer with a problem is refused (`runtime.ts:486-489`).
   * **-18 still fails on a real fault.** If the product stopped flagging the answer, or refused the re-confirm, the answer would stay unconfirmed and -18 would go red naming it. Probe-c (the loop removed) reproduces main's red: `["person.criminal_history"]`.
   * **P-244 is still enforced after the step.** An officer re-entry waits for the client again (probe-i).
   * **The claim that Confirm section does not confirm a background answer** is C6.18's to test, and it stays there. -16/-17 still cover "rests on unconfirmed answers".
   * **No scaffolding (P-33):** this is the client's own route, the same one `lib/m3.ts:161` and `api/src/sample-case.ts:142` use.
5. **Does it match `fillEverything` and the route?** Yes, the loop is the same expression: `[q.answer, ...q.rows.map(...)]`, `if (a?.awaits_client)`, `POST …/reconfirm` with `{}` as `CLIENT`.
   * **One difference: order.** `fillEverything` re-confirms before `confirmAll`; this pack re-confirms after it.
   * **The order does not matter:**
     * Confirm section leaves the background answer as the officer's `agent_view` version (probe-b);
     * `reconfirm` names the officer's answer either way (`runtime.ts:491`);
     * the client's `client_reconfirm` version of a principal's answer counts as confirmed without another Confirm section (`engine/runtime/case.ts:83-88`; probe-g `confirmed:true`).

## Screen-review items
* **D1–D20, BIC-01–BIC-20, concept fit, keyboard/1024 px/200 %, menu and words:** N/A. No page, route, engine or word changed. The diff is an acceptance-pack fix under a tech lead ruling, not a screen.
* **Code (item 5):** the rule's test fails when the rule is removed (probe-c). No migration, no concurrency surface.
* **Retrofit mapping (item 6):** N/A.
* **Journey score (reviewer, the one score for this check): 8.5 / 10, pass, no 0** (`journey-test-reviewer-2026-11-08.md`). The halves are criteria a pack-only diff cannot show (UI walk, accessibility, visual).

## Issues (ranked)
**Minor**
1. **The loop ignores each re-confirm's status** (`C6.9.test.ts:96`). A refused call shows up only as -18 red with the field name, one step from the cause. `fillEverything` does the same.
   * *Should (optional):* collect the statuses and add them to -18's detail argument. That changes neither -18's words nor its condition.
2. **The comment says "as lib/m3.ts fillEverything does" but runs in the other order** (after `confirmAll`). The order is harmless (point 5 above).
   * *Should (optional):* say "after Confirm section" in the comment, so no one later "fixes" the order.

## What I could not check
* Gate B on the six myself (the builder's 21/21 stands).
* A visible-browser walk of the client's re-confirm (no UI in the diff).
* Another agent's `run-suites.sh --changed origin/main..HEAD` was running in this clone during my probe. It rewrote tracked R1 screenshots, `evidence/forms-channels/check_forms_channels.json` and `p2/screening/canary-digest.json`. Those changes are not mine and not in the reviewed commit. I left them untouched.

**Verdict: Approve** (no open Blocker or Major; the two Minors are optional).

Reviewer: Approve 4dfbde1003daeb2ff105f2bc8dc8c298800f29e3

# Gate B re-review: commit 155e03cb8 (diff only, P-318 (1))

PR #1374, branch `claude/runtime-c65-drawer`. Reviewed in a fresh context: `git show 155e03cb8` only (`studio/tools/gate-b.mjs`, `studio/tools/check-gate-b.mjs`). Read with the code it calls: `stepsVerdict`, `packVerdict`, `runPack`'s early returns, `runPackRecorded`, `main`'s pack loop, `claims`, and the GATE_B_RESULTS callers (`works-set.mjs`, `ci.yml`, `nightly.yml`).

## What was run

* `node tools/check-gate-b.mjs` from the studio folder (Node 24.21.0, no server): **192 passed, 0 failed**, exit 0.
* A side script (in the scratchpad, not committed) that copies the new judging (gate-b.mjs:433-434 per pack, 608-615 per capability) on top of the exported functions. It ran the cases below, old rule against new. No isolated copy was started: ports 4430-4432 belong to another run, and `runPack` always starts a copy.
* Step labels compared across every capability that has more than one pack (C4.11, C6.4, C6.5, C6.12, C7.6, C11.12). No two packs of a capability print the same label at the start of a result line. The labels that do repeat (C6.5-9b, -14 and -17 in `C6.5-screen.test.ts`; C7.6-10c in `C7.6-screen.test.ts`) occur only in comments or in the middle of another step's text, which the `^(PASS|FAIL|HELD)\s+<id>[- ]<step>` anchor never matches. `C6.5-counts.test.ts` does not exist at this commit.

## The cases the brief asked about

| Case | Result | Holds? |
|---|---|---|
| Pack crashed and printed nothing | `printed=[]` makes it judged on its whole run, so it is refused (`exit N`). Its steps are also unprinted, so a second refusal is added. | Yes |
| Pack printed its named steps, then crashed with exit 137 or timed out (124) | Judged on the printed steps; `packVerdict` refuses any exit other than 0 or 1. | Yes |
| Setup failure, missing file, unreadable run line, or another early return without `printed` | Each one returns a `why`, so the pack is refused. `r.printed ?? []` adds nothing to the per-capability check. | Yes |
| Infra result (copy did not start, demo reset refused, port 4400) | Left out of `mine`, but its `why` is in `reasons` and the gate exits 2. If every pack is infra, the per-capability check is skipped and the exit is still 2. | Yes (wording: m3) |
| Works claim | `claims()` sets the steps to null, so `wanted` is null: whole pack, and the per-capability loop skips it. Same as before. | Yes |
| HELD line on a named step | It counts as printed (`stepsPrinted`), so `stepsVerdict` judges the step in that pack and refuses it. A pack that prints none of the named steps but has HELD lines for other steps passes on exit 0, the same as the existing whole-pack rule (P-284). | Yes |
| 21 against 21e | `(?![0-9A-Za-z])` keeps them apart in both directions. `C6.5-21-a` counts as step 21, the same as `stepsVerdict` already did. | Yes |
| One pack, every named step printed | Same as before (`printed` equals `wanted`). | Yes |
| One pack, some or all named steps not printed (exit 0 or 1) | Before: refused, "named steps not green: X". Now: the pack passes and the capability is refused with "named steps no pack printed: X". The gate still refuses with the same exit code (1); only the reason's wording changes. | Gate yes; result line no (m1) |
| One pack, empty steps list (`(steps ,)`) | Before: refused, "the steps list names no step". Now: judged on its whole run. That is stricter than any named step, not weaker. | Not "as before" (m2) |
| GATE_B_RESULTS line | Written from `r.why` only. The refusal for unprinted steps never reaches it. | See m1 |

Conclusion: the gate is not weaker than its stated rule. Every pack is held either to the named steps it prints or to its whole run. A named step cannot go unseen across the capability. Exit codes match the old rule in every one-pack case that refused before.

## Findings

No Block or Major findings.

**m1 · Minor: the GATE_B_RESULTS line says `ok: true` for a run the gate refuses.** Lines: `tools/gate-b.mjs:494` (`ok: !r.why`) and `tools/gate-b.mjs:608-615` (the unprinted refusal goes into `reasons` only).
Scenario: `Capabilities: C6.4 (steps 1, 99)` with GATE_B_RESULTS set. `C6.4.test.ts` prints `PASS C6.4-1` and exits 1. `C6.4-screen.test.ts` prints neither step and passes its whole run. Both result lines say `{"ok":true,"why":null}`, but the gate exits 1 with "C6.4: named steps no pack printed: C6.4-99". With one pack the line used to say `ok:false, why:"named steps not green: …-99"`, so the line is not "as before" even for a one-pack capability. A caller that reads the lines, as `works-set.mjs` `poolVerdicts` does, would score that run green.
No caller is affected today. `works-set.mjs:201,212` and `ci.yml:379,382` pass only `--title` with an empty PR_BODY, so the steps are always null. This makes the documented contract ("one JSON line per pack run … for a caller", gate-b.mjs:43) a trap for the next caller. Fix: also write one capability line (for example `{id, file: null, ok: false, why: "named steps no pack printed: …"}`), or document at :43 that named steps are judged per capability and are not on the pack lines.

**m2 · Minor: an empty steps list is no longer refused through the gate, and the check-gate-b case still says it is.** Lines: `tools/gate-b.mjs:434` (`wanted && (printed.length ? printed : null)`: `[]` is truthy, `printed` is `[]`, so the steps become null and the pack is judged on its whole run) and `tools/gate-b.mjs:610` (`!st.length` skips the per-capability check). `tools/gate-b.mjs:272` ("the steps list names no step") can no longer be reached from `runPack`.
Scenario: `Capabilities: C6.5 (steps ,)` gives `caps C6.5 → []` (`check-gate-b.mjs:134`). Before, the gate refused with "the steps list names no step". Now `C6.5.test.ts` must pass whole; it is red at 19b and 20, so the gate still refuses, but as "exit 1 …". On a fully green pack the gate now passes where it used to refuse. That is safe, because the whole pack is the strictest bar. But it contradicts the brief's "one-pack capabilities must judge as before", and `check-gate-b.mjs:134` ("an empty steps list is empty, and refuses") now passes only because it calls `packVerdict` directly. Fix: in `runPack`, pass `wanted` itself when `wanted.length === 0` (keeping the old refusal), or change the comment and the check to say an empty list means the whole pack.

**m3 · Minor: one infra pack makes the other packs' result read as "no pack printed".** Line: `tools/gate-b.mjs:611` (infra results are left out of `mine`, then 613-614 runs on the rest).
Scenario: `Capabilities: C6.5 (steps 10, 24)`. The copy for `C6.5.test.ts` does not start (infra). `C6.5-screen.test.ts` prints `PASS C6.5-24`. The report lists "isolated copy … did not start" and also "C6.5: named steps no pack printed: C6.5-10". The exit is correctly 2, but the second reason blames the pack for a step the gate never ran. Fix: skip the per-capability check for a capability that has any infra pack (its exit is 2 anyway), or add "(a pack of it could not run)" to the reason.

**m4 · Minor: two packs of one capability that print the same step label let one cover for the other.** Lines: `tools/gate-b.mjs:264-265` (`stepsUnprinted` asks whether any pack printed the step) together with `tools/gate-b.mjs:434` (a pack is judged only on the steps it printed, on exit 0 or 1).
Scenario: `C6.5-screen.test.ts` reuses the label `C6.5-19`, and the PR names `steps 10, 19`. `C6.5.test.ts` prints `PASS C6.5-10`, then throws an uncaught error. Node exits 1, so the pack never reaches its own step 19. That pack is judged on `[10]` and passes, and step 19 counts as printed because the screen pack printed it. The side script confirms both lines are ok and there is no reason to refuse. No such label is shared today (checked above), and nothing stops one being added later. Fix (cheap): in `stepsUnprinted`'s place, refuse a capability whose named step is printed by two packs, or note in the gate-b.mjs header (lines 19-21) that step labels must be unique across a capability's packs.

**m5 · Minor: the report does not say what each pack was held to.** Line: `tools/gate-b.mjs:429`.
Scenario: a C6.5 run logs `C6.5.test.ts on the six: exit 1, 30/32 passed` and `C6.5-screen.test.ts on the six: exit 0, 32/32 passed` and passes. A reader cannot tell that the first pack was judged on steps 10 and 19 only and the second on its whole run. That difference is the whole point of this commit, and the reason for a pass should be readable from the report (P-214). Fix: add `(judged on C6.5-10, -19)` or `(judged on its whole run)` to the line.

**m6 · Minor: the new checks test the helper functions, not the wiring.** Lines: `tools/check-gate-b.mjs:144-152`. They call `stepsPrinted`, `stepsUnprinted` and `packVerdict` directly. The wiring that carries the rule (gate-b.mjs:433-434 and 608-615) is never run, so m1 and m2 got through with 192/192 green.
Scenario: a later edit drops the `printed.length ? printed : null` fallback. A pack that prints none of the named steps would then be judged on the full named list and refused. Every capability with several packs would be back to never passing, and check-gate-b would stay green. Fix: move the per-pack plus per-capability decision into one exported pure function (`(id, steps, [{status, out, infra}]) → reasons`) used by `main`. Test it with C99.5 fixtures, including the one-pack-equals-before cases.

Verdict: Approve 155e03cb8

## Builder's fixes (after the Approve on 155e03cb8)
* m1: the GATE_B_RESULTS contract (gate-b.mjs header) now says that a named step no pack printed refuses the capability, in the gate's reasons and exit code, not in the per-pack lines. works-set.mjs names no steps.
* m2: an empty steps list stays refused ("the steps list names no step"), never read as the whole run (`packSteps`).
* m3: when a pack of the capability could not run (infra), its steps are not also called unprinted (`unprintedReason`).
* m4: the header says step labels are unique across a capability's packs. Today they are, per your survey.
* m5: each pack's report line says whether it was judged on its named steps (which ones) or on its whole run.
* m6: the per-pack choice (`packSteps`) and the per-capability check (`unprintedReason`) are exported and tested. There are 4 new wiring checks, and check-gate-b passes 196/196.

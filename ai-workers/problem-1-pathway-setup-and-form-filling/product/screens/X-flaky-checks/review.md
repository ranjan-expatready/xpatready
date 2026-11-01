# Review: flaky checks (test reliability, not a screen)

Reviewed: branch `claude/modest-hawking-epxq28` at `a72a9f6e` (merge of origin/main), `git diff origin/main..a72a9f6e`, 4 files.
Reviewer did not build it. Code read at that commit; `tests/check_speed_budget.ts` run (7 passed, 0 failed); a bash 5.2 replica
of the new `run-suites.sh` idioms run under `set -u`. No isolated copy and no browser suite was started (the builder's
runs held ports 4430–4445).

**Verdict: Approve** (no Blocker, no Major; three Minor findings for a follow-up)

## What each change proves, and whether it holds

1. **`product/tools/run-suites.sh`**
   * `:139` `if "$TIMEOUT" 1200 … ; then …; else code=$?; …` — in an `else` branch `$?` is the condition's status, so a
     timeout records 124 (checked: `timeout 1 sleep 3` gave `[124]`). `code=0` is `local`, `failed` is global, so it fills the
     same way `rows` does.
   * `:209` `${failed[@]+"${failed[@]}"}` is the standard bash 3.2 `set -u` idiom for a possibly empty array: with no failure
     the loop body never runs (checked). `IFS='|' read -r f code log <<< "$x"` works in 3.2 and keeps spaces in paths. The
     script has `set -u` only (`:13`), no `set -e` or `pipefail`, so `grep … | head -20` finding nothing cannot stop it.
   * `:211–213` the whole group goes to `>&2`. CI runs `run-suites.sh … | tee suites.md` (ci.yml:63, :159; nightly.yml:41),
     which pipes stdout only, so the summary table stays a table and the group lands in the job log. The overwritten globals
     `f`/`code`/`log` are not read after the loop.
   * `:145` order: `^(FAIL|STOP)`, then `Error: `, then `Error`. A PASS line that quotes an expected error is still behind
     the FAIL line, as before. The table cell gets `exit N: ` added before it; the `cut -c1-90` still applies to the line.
2. **`check_s5_slice2_browser.cjs`** — `loud(what)` (`:31`) records `wait: <what>` as a FAIL step (counted in `fail`, and the
   run exits 1 at `:203`). All seven former `.catch(() => {})` waits use it (`:32, :77, :82, :119, :187, :188, :190`); no silent
   wait is left in the file. Each wait's condition is the one its step reads, so no step proves less. The `:119` wait reads
   `textContent` and the step reads `innerText`. That is not a false pass: the wait can only be satisfied *earlier*, and the
   step still judges on its own read.
3. **`check_setup_card_browser.cjs`** — `:193` the wait is loud. `:195` the count (`>=150`, every row shown) is judged on
   every machine. `:196` the 2000 ms budget goes through `speed()`. That helper reports "not judged" only when
   `RUNNER_ENVIRONMENT=github-hosted` or the load is above the core count (P-184, P-215), so the Mac nightly still judges it.
   Splitting it this way is what P-215 decided; it is not a loosened check.
4. **`check_w1_structure_browser.cjs`**
   * R3-5 (`:228–234`): the page selector `[data-list] [data-row] [data-trail-line]` picks the same element as
     `listRows().first().locator("[data-trail-line]")` (`:222`; `data-list` exists once, structure.tsx:328). Both sides read
     `innerText` with the same whitespace collapse, so the wait and `pageFirst` compare like with like. The condition is false
     before the action, and on correct code it is always met, because the step requires the first row to change from
     "Visitors › Visitor visa" to "Start-up visa". The sort runs on the client from the address (structure.tsx:90, :241), so
     the whole list changes in one render and a changed first row means the list is sorted. Nothing is loosened: the step
     still checks both trails.
   * R3-6 status (`:244–248`): "Showing" is shown only while a filter is on (structure.tsx:272), so the condition cannot be
     true before the select. The stats and the Tree come from the same render (both read `sp`), so when the counts say
     1 the Tree is already filtered. The step's `Showing 1 of 6` is stricter than the wait's `\d+`. Both use `textContent`.
   * Chip + Program (`:253–257`): the wait now covers each thing the step reads except `row("Work permits")`. The step still
     checks that. 15 s and loud, plus a detail on the step. Nothing is loosened.

No Mac/Linux difference found: no GNU-only flags were added (`grep -m1 -E`, `head`, `tail -40`, here-strings are on both),
and `gtimeout` on the Mac also exits 124.

## Findings

**Blocker:** none. **Major:** none.

**Minor 1 — silent waits the steps rely on are still in the touched files.** The goal says every relied-on wait fails loudly,
but these keep `.catch(() => {})` / `.catch(() => undefined)`, several with the short 5–8 s timeouts the builder named as the
chip+Program cause:
`check_w1_structure_browser.cjs:172` (8 s, detached), `:298` (5 s, close-spelling warning), `:310` (dialog detached), `:374`
(5 s, "Enter opens Edit"), `:412` (8 s, "Moved" note); `check_setup_card_browser.cjs:150` and `:154` (URL changes). The step
after each one re-reads the same condition, so none can pass wrongly; it only fails with no reason, which is what this change
set out to end. Fix: give them the same `loud()` pattern (and 15 s where the 5 s ones are on 2-core paths). It can be a
follow-up item; it does not block this PR.

**Minor 2 — some FAIL rows still get no log in the job log.** `run-suites.sh:158`, `:173` (isolated copy did not start, with
its output sent to `/dev/null`) and `:195` (R1 setup failed, with `setup_visitor_visa.log` present) add FAIL rows without
going through `run()`, so they are not in `failed` and get no `::group::`. Fix: for `:195`, add
`failed+=("check_runtime_r1a.ts|setup|$OUT/setup_visitor_visa.log")`; for the other two, send the start output to a log and
add that log the same way.

**Minor 3 — a log line can act as a workflow command.** `tail -40 "$log"` (`:212`) prints suite output straight into the job
log, so a line beginning `::` (such as `::endgroup::` or `::error::`) would be read as a workflow command. No suite prints such
a line today. Fix if wanted: wrap the output in `::stop-commands::<token>` … `::<token>::`.

Residual risk, not a finding: `settle()` (s5 `:32`) is now loud. The spinner it waits on also covers run-card's RUNNING spinner
(web/src/components/run-card.tsx:23), and that one stays up as long as a run is going. s5 does not visit such a state today
(the builder ran it green twice). If it ever does, the check will now say so instead of waiting 30 s in silence.

## Journey test

Not run, no score given. This is a test-only change with no screen and no user journey, and the caller ruled out isolated
copies and browser suites for this check. The builder's evidence (the touched suites green twice on Linux; the structure check
at 6× CPU throttle 2/2 after, against 2 of 3 failing before) was read, not repeated.

## Could not check

Live runs on a 2-core GitHub machine or the Mac; bash 3.2 itself (checked on bash 5.2 with the 3.2-safe idiom); the `::group::`
rendering in a real Actions log.

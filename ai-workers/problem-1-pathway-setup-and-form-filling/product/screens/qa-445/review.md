# QA-445 review: Save and continue moves on after the hand-off (PR #1671)

Independent reviewer (skill screen-review scaled to a bug fix, plus journey-test as reviewer; fresh context, did not build it), 13 Nov 2026. **Commit reviewed: `7f63d1f76b320135f177fcdaf9d52eee39f26705`** (`git rev-parse HEAD`; branch `claude/screens-qa445-next-part`; `git diff origin/main...HEAD`: `questionnaire.tsx` +22/−6, new `tests/check_qa445_every_part_browser.cjs`, qa's `tests/qa/check_qa445_save_and_continue.cjs` copied). Bar: the Bake walk 1 row (C6.2, QA-441 / P-498), the tech lead's brief, WAY-OF-WORKING "Every PR". No concept file, no breaker (no money, schema, permission or new screen). Read-only as asked: no app copy started, :4400 untouched, live AI off, US$0. The journey score is in this file (§ Journey).

## Verdict
**Block: 1 Major (M1), plus M2 on the check that let M1 through.** Fix (1), the exact key, is right and proven. Fix (2), the pin, makes the item's own symptom ("✓ Saved", same part) come back on the direct path whenever a save adds or drops a part before the open one. That is a regression from main on that path. In skill terms: Ship after fixes.

## What I ran
* `tsc --noEmit -p web/tsconfig.json`: exit 0.
* The builder's logs (scratchpad `q445w.log`, `main-445.log`, `main-445w.log`). Main's failures are all cause (1). Visitor visa sticks at press 4 and Study permit at press 2, and the part count is unchanged at both presses (55→55, 65→65). The main run never reached a part-shift press, so cause (2) as described ("the open part unmounted, its Save and continue never moved") is not shown by these logs.
* **A timing harness on the exact `Sqr` pin code.** Real React 19.2.7, react-router-dom 7.18.2 (`BrowserRouter`) and @tanstack/react-query 5.101.1 from studio's `node_modules`, in headless Chromium, with a local static server and a real `fetch`. Files: `/tmp/claude-0/-home-user-xpatready/70689521-baa4-5b7b-b47a-9616020a96f9/scratchpad/pinh/` (`h3.tsx`, `run3.cjs`). The `SqrPart` stub repeats `leave()`'s order: put, `await invalidateQueries`, setState, the `alive` check, exact `getQueryData`, `go(next)`. Results (D open at `?part=4`, E the next part):

| Save on D | main (no pin) | head (pin) | pin + `go()` clears the pin |
|---|---|---|---|
| direct, drops a part before D | E ✓ | **D, URL `?part=3`** ✗ | E ✓ |
| direct, adds a part before D | E ✓ (C flashes) | **D, URL `?part=5`** ✗ | E ✓ |
| summary, drops one before, then "leave them…" | summary lost (part swapped to E) ✗ | D with summary, then E ✓ | D with summary, then E ✓ |
| summary, adds one before, then "leave them…" | — | D, then E ✓ | D, then E ✓ |

## Issues
**M1 (Major, Must) — the pin undoes Save and continue's own navigation.** File: `questionnaire.tsx:466-472`.
* Why: `go(to)` pushes the target first. The query's listeners reach React on a `setTimeout(0)` (query-core `notifyManager`), and the router applies the push in a transition. So the first render that sees the reloaded parts still has the old `raw`. In that render `pin.current.raw === raw`, the pin "corrects" to the open part, and its layout effect's `setParams(..., { replace: true })` replaces the history entry the push just created.
* Result: the client stays on the part ("✓ Saved"), and the URL becomes the open part's new position.
* When: every direct pass, whether the client typed or not, where the save adds or drops a part before the open part. The builder's own trail shows such saves on real cases: Visitor visa press 54 and Study permit press 68 ("at 53" and "at 66"). Both passed there, very likely because those Personal details parts went out through the summary, the only path where the pin is right (rows 3–4). The trail does not record which path each press took.
* Link mode (`link-page.tsx` uses the same `Sqr`) has the same exposure.
* Fix (proven in the harness, all four rows): `go()` clears the pin before it navigates, e.g. `pin.current = { raw: null, key: null }`, with `pin` declared above `go`. The pin then only acts when the data moves under an address nobody navigated from. This keeps the summary-path gain and Back.

**M2 (Major, Must) — no test fails when the pin is wrong or removed.** File: `check_qa445_every_part_browser.cjs`.
* Pin removed: the summary path lands on E straight away. `left()` resolves on the changed heading, "leave them…" is not visible, and E equals `want`, so the check passes.
* Pin wrong (M1): the shift-before presses in the walk went through the summary, so M1 passed 17/17.
* WAY-OF-WORKING "Every PR": every business rule has a passing and a failing test.
* Fix:
  * Add a case where a saved part has every required question and list settled, and its answer adds or drops a part before it. Assert the landing after a direct press.
  * Record for each press whether it went direct or through the summary, and assert that at least one shift-before press of each kind ran.
  * Run the check once with the pin removed and once with M1, and show it fails both times.

**m1 (Minor, Should) — check labels do not name C6.2** ("Every PR": `C6.2: …`). For example, "Visitor visa: Save and continue never stays…" should read "C6.2: Visitor visa: …".

**m2 (Minor, Should) — PR body.** Due before the PR is marked ready.
* Missing: "On the demo:", the context share, regression results ("running; results to follow"), and before/after screenshots of the visible change (stays vs moves).
* Cause (2) is called "measured", but the main logs show only cause (1). Restate it as: on main a shift-before swaps the open part during its summary.

**m3 (Minor, note) — the walk's oracle is a copy of `partState` and `byPerson`.** It cannot catch an order or done-rule error both copies share. The overview check is also compared with the same copy. This is acceptable for QA-445, because it uses the client's own API view and identifies parts by person and section. Every press answers through the API, so typed drafts, 409s and failed saves are covered only by qa's part-1 check.

## Judged as asked
* **Pin mechanics:** no render loop. After the replace, `raw` differs from `pin.raw`, so the next render updates the pin (2 renders, `SqrPart` not remounted, same key).
  * `from` is kept.
  * The overview (`raw` null) is untouched.
  * A removed part (`findIndex` −1) falls back to the position, as on main.
  * Back after a summary-path correction returns to the open part (harness).
  * The defect is M1 only.
* **Exact key:** `freshKey(caseId, actor)` equals `useCaseView`'s `["runtime","view",id,"sqr",actor]`. Both read the module-level actor in the same render. Link mode's `["link","view",id]` is exact for `link-page.tsx:146`.
  * The reload is awaited: `save()` awaits `invalidateQueries`, and the client's view is the only active query under the prefix (the client's `useCaseWhere` and agent view are disabled).
  * On a failed refetch, `getQueryData` returns this person's previous data, never the officer's.
* **QA-441 interplay:** `nextNotDone` runs on `order(fresh)`, with `from` taken from the part key. `leaveTo` is set from the same `fresh` value, and with the pin the summary's link opens the right part (harness rows 3–4).
* **Engine order vs `byPerson`:** sound to keep `byPerson` and raise it as a question. It is a stable regrouping applied to both the shown and the reloaded view. Main's failures are cause (1) with an unchanged part count. qa's own check expects the application's part first. The builder disagreed openly, as the rules ask ("never deviate silently"), and did not change the order. This is for the tech lead; not a finding.

## D1–D20 (scaled; this diff only)
* D1 Partly: fix (1) meets C6.2 after the hand-off; M1 breaks it on shift-before direct passes.
* D2 Met: no write path changed.
* D3, D4, D6, D7 and D18 N/A.
* D5 Partly: summary path recovers; M1 sticks.
* D8 Met: "Part k of N" agrees with the view (walk).
* D9 Partly: the next step is lost under M1.
* D10 Met: no words changed.
* D11 Partly: "✓ Saved" with no move is the reported symptom.
* D12–D14 Met: no layout change. Heading focus is kept when the pin holds the part (same key).
* D15 Met: no extra request (exact cache read).
* D16 Not met: M2.
* D17 and D20: simulated only.
* D19 Partly: the hand-off → client answers loop sticks under M1.

## BIC (§6, this diff)
* BIC-11 Met: one primary action, "Save and continue".
* BIC-13 Met: the summary's leaveTo link is right (harness rows 3–4).
* BIC-18 Partly (M1): "✓ Saved" shows but the client does not move.
* BIC-20: not walked by keyboard here. Focus goes to the h1 on a new part, as before.
* BIC-01–10, 12, 14–17 and 19: N/A (unchanged by this diff).

## Journey (reviewer role)
I could not walk it in the app (no copy, as asked). The journeys are scored on the builder's logs and the harness.
* J1, main path: the officer hands off, and Client A presses Save and continue on every part. Holds on head, except when a save shifts parts before the open one (M1).
* J2, alternate: the part needs a fix → summary → "leave them for now and continue". Holds.
* J3, recovery: Back after a correction. Holds.
* J4, boundary: the stale officer view after the hand-off. Fixed.

Score:

| Criterion | Score | Evidence |
|---|---|---|
| task completed | ½ | M1 |
| next step obvious | 1 | |
| plain words | 1 | |
| feedback and state | ½ | "✓ Saved" with no move under M1 |
| correct data | 1 | answers kept |
| error recovery | ½ | summary path ok; M1 recoverable only via Back or the overview |
| accessibility and sizes | ½ | not walked |
| speed | ½ | not measured |
| visual | 1 | unchanged |
| trust | 1 | no AI |

**7/10, below the pass.** Fixing M1 raises the first two ½ to 1 (8/10).

**Not checked:** keyboard or 200 % zoom walk, axe, timings (no app copy). `graph.mjs` was not run: it rewrites `qa/graph.json`, and this review writes only this file. There are no new pages or routes. Fail-on-main for the walk is taken from the builder's logs.

Verdict: Block
* Majors: M1 (pin undoes `go()` on shift-before direct saves; fix: `go()` clears the pin), M2 (a test that fails without the pin and with M1).
* Minors: m1 (C6.2 in check labels), m2 (PR body), m3 (oracle note).

## Re-review (diff 7f63d1f7..86b337d0)
Diff-only re-review (P-277, P-436 (5)) by an independent reviewer with fresh context, who did not build it. 13 Nov 2026. **Commit reviewed: `86b337d0d30efd28e7f724c4c19789f54f4ec86f`** (`git rev-parse HEAD`). Diff: `questionnaire.tsx` +5/−2, `check_qa445_every_part_browser.cjs` +75/−15, and this file (the first review, not re-judged). Read-only, as asked: no app copy started, :4400 untouched, live AI off, US$0.

**What I ran**
* The reviewer's harness (`scratchpad/pinh/`), unchanged. Its `FIX` variant is head's `go()` line for line: it drops the pin, then calls `setParams`. I ran `run3.cjs` again, plus `run4.cjs`, the same cases with the pin removed.

  | Save on D (open at `?part=4`) | head (`go()` drops the pin) | pin removed |
  |---|---|---|
  | direct, drops one before D | E, `?part=4` ✓ | E ✓ |
  | direct, adds one before D | E, `?part=6` ✓ | E ✓ |
  | summary, drops one before D | D with summary, then E ✓; Back → D | **summary lost: E shown at once** ✗ |
  | summary, adds one before D | D with summary, then E ✓; Back → D | **summary lost: C shown at once** ✗ |
* The builder's logs: `full-head.log` (21/21, with the trail), `shift-head.log`, `shift-prev.log` and `shift-main.log`. The PR body was read through the REST API: draft, no labels, head `86b337d0d`.

**M1: fixed.**
* `pin` is declared above `go`, and `go()` sets `pin.current = { raw: null, key: null }` before `setParams`. This is the fix proven in the harness, and all four rows hold.
* The race on one render: after `go()`, the reloaded parts can reach a render that still has the old `raw`.
  * The pin is now null, so `moved` is −1 and no replace is queued.
  * That render briefly shows the position's part (main's "C flashes").
  * Its layout effect re-pins at the old `raw`. The pushed address differs from that `raw`, so the next render cannot correct.
  * If the reloaded data renders *before* `go()` runs, the pin corrects first (a replace at D's new place) and the push follows. History ends `[…D, E]`, which is right.
  * If `go()`'s address equals the old one (drop one before, target E at the same number), the URL does not change. With the pin null, the position shows E, which is right.
  * Only a second data change landing between `go()`'s push and its commit could replace the push. That is a window of milliseconds, and nothing polls (no `refetchInterval`, headless has no focus events). Not a finding.
* Back and browser history:
  * After a summary-path correction, Back returns to the open part (harness).
  * After a direct shift-before press, Back goes to the old address, which now holds another part (C in the add case). Main does the same, because the address is a position. Not a regression.
* Every caller of `go` (overview open, Back, the summary's link, Save and continue) is a move the person asked for, so dropping the pin is right for all of them.

**M2: half fixed; the pin itself still has no failing test.**
* Fixed half:
  * The new "shift" scenario is a direct press after the principal's Personal details answers move the open child's part.
  * It fails on 7f63d1f76: it stays on "Part 30 of 54 · National identity document", and `left` is false.
  * It passes on head.
  * Each press's way out is now recorded (`path`, the trail's "(summary)" or "(direct)").
* Soundness of the scenario's assertions:
  * *The move is real.* The open part's number at opening (`before`) differs from its index in the client's own view after the press (`at`), and `decided > 0`. The child's parts follow the principal's, so the shift is before the open part. One small dependency: `before` is the screen's number and `at` is the oracle's (m3). The walk's `agrees()` keeps the two in line, and the prev build stayed on the picked part at a different number, so the move is not an oracle artefact.
  * *It cannot pass falsely on M1.* No polling or focus refetch reaches the page before the press, so the press really carries the shift. `landedKey !== pick.key` catches the stay. `left` times out on a stay.
  * *"Direct" detection is sound for M1:* a summary makes `viaSummary` true and fails the check.
  * Nit: the landing is compared by position only. Also comparing the shown title with `parts[want].title` would make it independent of `agrees()`.
* Open half (first review, M2 fix bullets 2–3):
  * **Nothing shows the check fails with the pin removed.** With the pin removed, the direct rows pass, so the new scenario passes too.
  * In the walk, a shift-before press through the summary (Visitor visa press 54, Study permit press 68 in `full-head.log`) loses its summary. It is then recorded as "direct", and nothing asserts that the summary should have shown. In a drop-one case, the part swapped in is the target itself (Visitor visa press 54 would pass).
  * Study permit press 68 dropped two parts, so it might fail as "wrong" by chance of the data. No run shows it.
  * There is also no assertion that at least one shift-before press through the summary ran.
  * WAY-OF-WORKING "Every PR" requires a failing test for each business rule. Half of this PR's behaviour, fix (2), could be deleted with every check green.
* **Fix (small):**
  1. In the walk (or a "shift" variant through the summary), after each press where the client's view says the pressed part is not done and was not passed, assert that the summary shows on the same part (same title and "Answering for") before "leave them…".
  2. Assert that at least one such press had a shift before it.
  3. Run it once with the pin removed (e.g. `moved` forced to −1) on an isolated copy and show it fails. `QA445_ONLY` can carry it.

**m1: fixed.** Every scenario label reads "C6.2 QA-445 …". The shared "no page errors" line is unlabelled, which is fine.

**m2: mostly fixed.**
* The body has "On the demo", the context share, regression results (after M1: qa441 13/13, r1c 140/140, c616 50/50, bk4c 46/46, qa427 17/17) and the before/after in words.
* Cause (2) is no longer called "measured" on main.
* Left (Should, not blocking):
  * There are no before/after screenshots ("no visual change" is the reason given; the stay vs the move is the visible change).
  * The body's "M2: … Fixed" overstates it (see above).

**QA445_ONLY:** only the value `shift` narrows the run, and it drops the two families. Unset (CI, `var/suites/selection.tsv`), the full check runs. It is set nowhere in the repository. Nit: say it in the file's header usage line.

**New in this diff:** nothing breaks.
* Note (pre-existing on main, not this PR's scope): Back with unsaved answers, or "leave them for now and go back", uses the old `index − 1`. After a save that drops a part before, that can be the open part itself. A row for the lead if wanted.

**Journey (reviewer role, re-scored on the harness and logs; no app walk):**
* J1 holds now, direct and through the summary.
* Task completed: 1. Feedback and state: 1.
* Error recovery stays ½ for the pre-existing dirty-Back edge.
* Accessibility and speed stay ½ (not walked, not measured).
* **8/10, a pass (no 0).**

Verdict: Block
* **M2 (rest), Major:**
  * No check fails with the pin removed.
  * A summary lost on a shift-before press is recorded as "direct" and passes.
  * Fix: assert the summary on not-done presses, assert one such shift-before press ran, and show a pin-removed run failing.
* M1, m1: fixed. m2: mostly fixed (screenshots and the "M2 fixed" wording are Should). m3: note, unchanged.

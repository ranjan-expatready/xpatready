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

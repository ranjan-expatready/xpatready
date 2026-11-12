# QA-441 review: Save and continue goes to the next part not done (PR #1659)

Independent reviewer (skill screen-review, scaled to a small bug fix, plus journey-test as reviewer; fresh context, did not build it), 12 Nov 2026. **Commit reviewed: `a9dd6eba34f5b5208aa56f3ae05a9848428a3bbc`** (branch `claude/adoring-hamilton-t5k87a`; `git diff origin/main...HEAD`: `questionnaire.tsx` +22/−4, new `tests/check_qa441_next_not_done_browser.cjs`, 3 screenshots). Row QA-441 (P-498, Bake). Bar: the tech lead's brief (the first later part whose `partState(...).done` is false, wrapping round, else the overview). No concept file (a bug fix). No breaker (no money, schema, permissions or new screen).
The journey test (reviewer role) is in this file: the caller asked for review.md only. **9/10, pass.**

## Verdict
No Blocker, no Major. 4 Minor and 2 notes on older code. In skill terms: Ship (Minor 4 is the PR body, due before it is marked ready).

## What I ran (isolated copy :4441 built from this branch; live AI off, US$0; :4400 untouched)
* `node tests/check_qa441_next_not_done_browser.cjs 4441`: **13 passed, 0 failed**, exit 0 (6 min 22 s). The run overwrote one committed screenshot; I restored it with `git checkout` (no change left).
* My own walk (Playwright, scratchpad script, not committed), on the state the check leaves (86 of 87 done; Part 11 Contact information needs a fix):
  * part 1 edited, Back → overview; part 5, Back → Part 4 (**Back unchanged**);
  * part 5 → Save and continue → Part 11; part 10 → Part 11 (**the next part, when not done, is still the next part**: first pass unchanged);
  * keyboard: typed in part 1, Enter → Part 11, focus on its h1;
  * 1024 px: part 2 → Part 11 in 125 ms, `scrollWidth` 1024, axe 0 on main;
  * Part 11 Save and continue → summary (role alert, focused), then "leave them for now and continue" → overview;
  * no page errors.
* `tsc --noEmit -p web/tsconfig.json`: exit 0. `graph.mjs --check`: G1 0 · G2 0 · G3 30 · G4 0 · G5 0 · G6 12 (no hard gap). No explicit `any` added.
* **Fails on main:** not re-run (this copy serves the branch build). By construction it fails there: main's `saveAndContinue` is `leave(index + 1 < total ? index + 1 : null, …)`.
  * (1): from part 1, main lands on Part 2, not the overview.
  * (2): main lands on Part 2, and the check asserts the target is past part 2 (`target.n > 2`, Part 11 here).
  * (3): from part 87, main goes to the overview, not Part 11.
  * (4): main's summary link goes to Part 12, not the overview.
* CI: the PR is a draft; only the guard has run (success). The full check runs when it is marked ready (done-when 2 pending). `select-suites.mjs` runs a changed `check_*` file itself.

## Correctness (the points asked)
* **Order: `view.sections` vs the fresh view.** The loop walks the shown order (`byPerson`, own parts on a link) and looks each part up in the reloaded view by `subjectId|section` (`questionnaire.tsx:428-436`), so the reload's raw order does not matter. Correct.
* **Link mode.** `freshKey` is `["link","view",id]` (`link-page.tsx:40`), the full link view including shared sections. Only the parts this `Sqr` shows are walked (own and own relatives, `link-page.tsx:151-155`). Correct.
* **Current part.** It is excluded (`k` starts at 1). It is marked passed before the walk, only when it may leave (`:577-579`). A part kept with the summary keeps main's behaviour.
* **Summary path.** "leave them for now and continue" uses the same target (`setLeaveTo` at `:579`, link at `:626`). Walked and checked by (4).
* **Back** passes an explicit index (`:584`), unchanged. Walked.
* **First pass.** The next part is not done, so it is chosen (walked). As the brief defines it, a part already done by someone else is passed by on any pass (Note A).
* **Parts appearing or disappearing after a save:** Minor 1.

## Issues (ranked; all Minor)
1. **(Should) The target index belongs to the list before the save; the address is read against the list after it.**
   * `nextNotDone(view.sections, …)` runs on the `view` captured when the part rendered (`:579`). `go(to)` writes `?part=to+1`, and `Sqr` resolves that against the reloaded `parts` (`:449-456`).
   * A save can change which parts exist. Example: a relative's parts are asked only once a form applies to that person (`engine/runtime/case.ts:376-377`, "a child's form waiting for a date of birth asks no parents"). If such a save adds or removes a part between the current part and the target, the client lands one part off, possibly on a done part. A newly added part, never done, is never considered.
   * Main used the old list too (`index + 1`). But main then landed on the inserted part, which was the right place.
   * The case is narrow (it needs an edit that changes which parts exist, with done parts after it), so this is not a Major.
   * Fix: work the target out as a part key on the reloaded order (for example `byPerson` of the fresh view, limited to the keys this `Sqr` shows), and let `Sqr` map the key to its current index. If the key is gone, go to the overview.
2. **(Should; WAY-OF-WORKING "Every PR": a wait a test relies on fails loudly)** The check has `.catch(() => {})` after `waitForFunction` at `check_qa441…:40`, `:41` and `:107`.
   * I found no false pass: each later assertion fails if the wait timed out, because the part shown or the missing summary gives it away. But the FAIL then names the wrong cause.
   * Fix: drop the catches (the outer `.catch` exits 1), or turn each into a named FAIL step.
3. **(Should) Dead waiting.** `partOf` (`:35`) calls `innerText()` with Playwright's default 30 s auto-wait. On the overview there is no "Part N of" line, so each call waits 30 s before its catch, and `overview()` and step (4) call it several times. That is most of the 6 min 22 s run.
   * Fix: return `null` when `await locator.count() === 0`, before `innerText()`.
4. **(Must, before ready; PR body, "Every PR")** The PR body is not complete yet:
   * "Checks and results" still says "(filled in as steps land)";
   * no before and after screenshots in the body (the QA-441 sweep's `shots/33` would do as "before");
   * no context share.
   * CI green (done-when 2) waits for "ready".
* **Note A (older definition; for the tech lead, not this PR).** `partState` counts some parts as done that still wait for this person:
  * a part whose answers wait for the adult's own Confirm on their link (C6.16 BR-6, `ConfirmMine`, `:603`);
  * a part with C6.18 answers waiting for the client to re-confirm.
  * Save and continue now passes these by. The overview's count and "Continue where you left off" already did (older code), and the brief names `partState`. C6.18 answers are still listed on the overview (`RecordedForYou`); BR-6 answers are not. If the adult should be walked through them, that needs a ruling or a qa row, not a change here.
* **Note B (older code, demo only).** The fresh read takes `getQueriesData({ queryKey: [..., "sqr"] })[0]`, a prefix match. After an actor switch, it could pick another simulated person's cached view. It now also decides the target.

## D1–D20 (only what this diff touches)
D1 5: the brief's rule as written, wrap and overview included · D2 5: no new writes; the edit saved once (check 1) · D3, D4, D6, D7 N/A · D5 4: Back, summary and failed save keep main's paths; Minor 1 edge · D8 5: "Part 11 of 87" says where the client landed · D9 4: done parts skipped; Minor 1, Note A · D10 5: no new words · D11 5: summary and status line unchanged · D12 5: no visual change · D13 4: keyboard Enter, focus on h1, axe 0 at 1440 and 1024, no sideways scroll; 200 % zoom not re-checked · D14 5: unchanged · D15 5: 125 ms to land, no extra requests · D16 4: fails on main by construction, passes here; Minors 2–3; no link-mode case · D17 simulated only · D18 5: unchanged · D19 4: the second pass reaches "Every part is answered" · D20 simulated only.

## Best in class (EXPERIENCE §6; this diff touches BIC-10, 11, 13, 18, 20; the others are N/A)
| Check | Result | Evidence |
|---|---|---|
| BIC-10 task list, statuses calculated | Met | Overview "86 of 87 parts done", Done pills; Save and continue now follows the same statuses (`committed qa441-4-overview-one-left-1440`) |
| BIC-11 one primary action | Met | Save and continue unchanged; one primary per part |
| BIC-13 errors where they happened | Met | Part 11 lands with the field error; on save, the summary is focused (role alert) |
| BIC-18 states drawn | Met | "Every part is answered" notice (check 1, `qa441-1-overview-after-part-1-1440`) |
| BIC-20 keyboard, 1024 px | Met (200 % zoom not re-checked) | Enter submits, focus on h1; 1024 px `scrollWidth` 1024; axe 0 (my walk, `rev-1024-landed`) |

## Journey test (reviewer role)
Journeys (Client A, the client): **J1** (main) every part done, come back, edit part 1, Save and continue → overview · **J2** a later part needs a fix → that part · **J3** wrap from the last part · **J4** summary, leave anyway → overview · **J5** Back · **J6** first pass · **J7** keyboard only · **J8** 1024 px.
Not walked: link mode (by reading only); two tabs (no new write).

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | 13/13; J1–J8 as expected |
| Next step obvious | ½ | Lands on the part not done; Minor 1 edge and Note A |
| Plain words | 1 | No new words |
| Feedback and state | 1 | "Part 11 of 87", "Saved: 1 answer needs a fix", summary |
| Correct data | 1 | Part 1's edit saved once, read back through the API |
| Error recovery | 1 | Summary keeps the client; leave anyway goes on correctly |
| Accessibility and screen sizes | ½ | axe 0, keyboard, 1024 px; 400 px and 200 % zoom not re-checked |
| Speed | 1 | 125 ms to land |
| Visual quality | 1 | Unchanged |
| Trust and sources | 1 | Origin lines on the part unchanged; no AI |

**9/10, pass (no criterion at 0).** To raise it: Minor 1, then a 400 px and 200 % pass.

## What I could not check
A run on main's build (fails by construction, above) · link mode in a browser (needs a code-verified link; reviewed by reading) · a real screen reader · an intended user's unaided walk (D17, D20 stay with the founder) · the full CI set (the draft has not run it).

My `rev-*` shots are in my session scratchpad, not committed.

Verdict: Approve a9dd6eba34f5b5208aa56f3ae05a9848428a3bbc

## Re-review (diff a9dd6eba..64c66e18)
Diff-only re-review (P-277, P-436 (5)); HEAD confirmed `64c66e18a33c7e88f04f3b5214d8b048ed238862`. I read the code diff (`questionnaire.tsx`, `link-page.tsx`, the check) and the builder's logs. I started no app copy, did not use :4400 and spent nothing. I ran no tsc of my own, because this copy has no `web/node_modules`. The builder's results stand on their logs: `qa441-final` 13/13, `screens_r1` 140/140, `screens_c616` 50/50, `screens_bk4cb` 46/46, all with 0 FAIL and all written after the 17:08 commit.

**m1: fixed.**
* **Same order in both modes.**
  * Client: `Sqr` renders `byPerson(view.data)` of the `["runtime","view",id,"sqr",actor]` query. The target is now read on `order(fresh)`, which defaults to `byPerson(fresh).sections`, and `fresh` comes from that same query (`freshKey` prefix `[…,"sqr"]`). So the index `go()` writes is the index `Sqr` resolves after the reload.
  * Link: `Sqr` renders `byPerson(ownView(v))`. `order` is `byPerson(ownView(fresh))`, and `fresh` is the `["link","view",id]` query, the raw `LinkView` with `own`, so the cast is sound. Same order.
* **Inserted parts.** A part the save adds is now in `parts`, and as it is not done it is considered.
* **Removed part.** When the save removes the current part, `findIndex` gives -1, so `start = after - 1` and the first index tried is `after`, the slot where the part stood. All n positions are then tried once, and `i === from` (-1) never matches.
  * Note only: `after` is the old index. If the same save also inserted or removed parts *before* it, the search starts a slot off. It still finds a not-done part, just possibly not the first one after. This needs two structural changes in one save; not an issue.
* **The `from` skip.** k runs 1..n, and k = n lands on `from` and is skipped. So every other part is tried once, in order, wrapping round. That matches main's first-pass behaviour (the next part) and the row's wrap.
* **Empty list.** The loop does not run and the result is null (the overview). There is no modulo by 0.
* **Fallback when the fresh read is missing.** It uses `view.sections` with the index found there, as before.
* **The "leave them for now" target.** `setLeaveTo` stores the same fresh-order target, so the button resolves against the reloaded view too.
* Note B (prefix read after an actor switch) is unchanged and stays a demo-only note.

**Link-page refactor: no behaviour change.** `mine` and `ownView` are the same pure expressions, lifted to module level with `v` passed in. `own` and `shared` are computed exactly as before. The only addition is the `order` prop.

**m2: fixed.** The two `saveAndContinue` waits and step (4)'s wait now record a named FAIL step ("…leaves the part … within 30 s", "…the page settles (no busy button)", "…leaves the part within 15 s"). The one `.catch(() => false)` left is on `summary.isVisible()`, which does not wait, so it is fine.

**m3: fixed.** `partOf` returns null when `count()` is 0, so there is no 30 s auto-wait on the overview. A tiny race is left (the line disappearing between `count()` and `innerText()`), but it would fail loudly through the outer catch, never pass silently.

**m4** (PR body) is with the builder. It is a "ready" gate, not a code finding, so it does not block this commit.

**New issues:** none. The new check does not exercise the removed-part or inserted-part path. That is acceptable: building that state needs a form that starts or stops applying on one save, and the logic above is small and checked by reading.

**Journey score:** unchanged from the first review (no change visible to the user beyond the target in the edge case).

Verdict: Approve 64c66e18a33c7e88f04f3b5214d8b048ed238862

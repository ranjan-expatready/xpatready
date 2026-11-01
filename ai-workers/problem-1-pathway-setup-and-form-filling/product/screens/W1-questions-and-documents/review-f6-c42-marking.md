# Review: F6 / C4.2 marked by hand (`check_c42_marking_browser.cjs`), commit d487d426

**Verdict: Approve** (commit d487d426, branch `claude/runtime-pqr-tab`). No Blocker, no Major. Three Minors and two app observations below; none blocks.

Reviewer: independent session (did not build it). Date 1 Nov 2026. Test-only change: no app code changed (`git show d487d426 --stat`: 1 test, 8 screenshots, 1 build-notes line).

## What I ran (isolated copy `runtime_c42r` on :4438, never :4400; no AI switch, US$0)
| Run | Code | Result |
|---|---|---|
| 1 | as committed | 32 passed, 0 failed (48 s) |
| 2 | as committed, same database (the check resets itself) | 32 passed, 0 failed |
| 3 | `api/src/fact-sources.ts:258` removed (`if (tick && !f.placed) …`), server restarted | **red**: "API refuses a tick on a fact no question asks" (200), "neither refusal wrote a row" (2), "fail (bulk) … listed as not changed"; then the next wait times out loudly (exit 1) |
| 4 | `fact-sources.ts:257` removed (case officer tick refusal) | **red**: API case officer 422 (200), "neither refusal wrote a row" (2), bulk list; then a loud timeout |
| 5 | restored (`cmp` against a /tmp copy: identical), restarted | 32 passed, 0 failed |

The builder's claim holds: 32/32 twice, 3 checks red with the "no question asks it" refusal removed. The file was restored byte for byte; `git status` shows only the four pre-existing `screenshots/pqr/*.png` changes (not touched). The run's regenerated `c42-marking/` screenshots were put back to the committed ones.

Claim about the gap verified: `tests/check_w115_slice1.ts:130-131` runs its C4.2 "no question asks" fail only `if (unplaced)`, and prints nothing when it skips.

## Does each check prove its label
* **Pass and fail per rule, labels name C4.2:** yes. Asked fact: pass in the drawer, in the database (DRAFT, prequalification, HUMAN, reason) and in bulk. Case officer fact and unasked fact: fail in the drawer (disabled, reason in words), through the API (422, field `prequalification`, words) and in bulk (listed, in words). No row written by either refusal. Roles: Approver reads but cannot tick (UI) and gets 403 (API). P-132: other combination unchanged; country view lists the tick only as a draft add.
* **The drawer checks prove the web rule, not the server rule.** `web/src/pages/workspace/sources.tsx:168` disables the tick from `f.placed`; with the server refusal removed the drawer checks still pass. That is correct as labelled ("the drawer says why"); the server rule is proven by the API and bulk checks. Not a finding.
* **Waits are loud:** every `waitFor`/`waitForFunction` has a timeout and no `.catch`; the outer promise exits 1 on any throw (seen in runs 3 and 4). The one `.catch(() => null)` is on `r.json()` (a body parse), not a wait.
* **System keys on screen:** guarded on the drawer reason and the bulk list (`KEYS` regex); none seen in the 8 screenshots.
* **Axe and 1024 px:** 4 states, WCAG 2.2 A/AA clean, no sideways scroll at 1024.

## Is the SQL fixture fair
Mostly. `placed` is `!!p && !p.rule_only` (`engine/sources.ts:130`), so setting `rule_only` gives the refusal exactly the input it reads, and "decides only" is a real library state an author can make (`POST /api/library/fields/:key/placement` with `ruleOnly`, `api/src/studio.ts:432-451`). But the SQL edits the PUBLISHED v1 row in place, with no new version and no audit line, which the product itself never does (see Minor 1).

## Findings
**Blockers:** none. **Majors:** none.

**Minors**
1. *Fixture bypasses the product path* (`check_c42_marking_browser.cjs:54`). The check edits a released library row in place. Fix: make the fact unasked through the author's own route (`POST /api/library/fields/<fact>/placement`, same `collectedFrom`/`repeats`/`sectionKey`, `ruleOnly: true`) and check the combination's draft view shows `placed: false`. If the draft view does not pick up a draft library row, keep the SQL and say in the header comment that it stands in for a released "decides only" placement. Only the `rule_only` branch of `placed` is covered, not "no placement at all" (`!p`); the same refusal reads both, so this is acceptable if it is written down.
2. *Weak assertions.* (a) `GET /api/pqr` → 404 (line 116) holds for any unknown route, so it does not prove "no PQR record of its own" beyond the absence of a route. Fix: name it as a route check, or drop it. (b) `/Ask/` on the row's whole text (lines 87, 107) would match a label containing "Ask". Fix: read the Pre-qualification cell only.
3. *Silent skip stays.* `check_w115_slice1.ts:131` still skips without a word when no unplaced fact exists. Fix: print a SKIP line naming `check_c42_marking_browser.cjs` as the place the rule is proven, so a reader does not count a pass that never ran.

Not flaky in 3 green runs; two fixed sleeps (`waitForTimeout(300)`, `(250)`) are short padding after a loud wait, acceptable.

**App observations from the walk (existing code, not this commit; for the runtime lane's queue, not a condition of this Approve)**
* Bulk toast reads "Pre-qualification on **on** 1 question" (`web/src/pages/workspace/questionnaires.tsx:357` adds " on " after `r.what`, which already ends in "on"); visible in `screenshots/c42-marking/04-bulk-refused-1440.png`.
* Neither `04-bulk-refused` screenshot shows the refused list (it is above the scrolled view; only the toast is visible). The list is proven by the check's text; the screenshot named for it does not show it. Scroll `[data-bulk-refused]` into view before the screenshot.

## Journey test (reviewer role; the one score for this check)
Persona: configuration author marking a work-permit family combination's pre-qualification questions; wrong role: Approver. Journeys: (1) tick one asked question in its details with a reason, Save; (2) try a case officer fact and an unasked fact (drawer, then direct API); (3) bulk tick three rows, read what was refused, Undo; (4) open another combination and the country view; (5) Approver opens the same row. Walked through the scripted browser replay three times plus the screenshots; I did not do a headed, by-hand walk, a keyboard-only pass, 400 px or 200 % zoom.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | tick saved as a DRAFT HUMAN row with reason; chip 0 → 1 |
| Next step obvious | 1 | drawer reason says what to do ("Add a fallback question first") |
| Plain words | ½ | refusals in words, no keys; toast "on on" slip |
| Feedback and state | 1 | chip count, row Ask, toast with Undo, "Release check" status on the unasked row |
| Correct data | 1 | one row per tick, none for refusals, other combination untouched (SQL) |
| Error recovery | 1 | bulk Undo restores 1 question; refusals leave no partial write |
| Accessibility and sizes | ½ | axe clean on 4 states, 1024 clean; keyboard-only, 400 px and zoom not checked |
| Speed | ½ | no wait over the 15 s guards; not timed against `STANDARDS.md` §9 budgets |
| Visual quality | 1 | team look, demo chrome separate (screenshots 01-04) |
| Trust and sources | 1 | origin shown (Rules/Human), "Simulated" actor badge, Sample reason text |

**Journey score: 8.5 / 10, no criterion at 0: pass.** To raise it: fix the toast words; add a keyboard-only and 400 px pass to the check.

## Could not check
A headed by-hand walk, a real screen reader, 200 % zoom, keyboard-only; a web-side mutation (the drawer rule needs a web rebuild); an intended user's unaided walk (D17/D20 stay with the founder).

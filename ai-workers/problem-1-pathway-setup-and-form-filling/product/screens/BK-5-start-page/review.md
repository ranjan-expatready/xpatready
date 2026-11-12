# BK-5 PR 1 Starting points: independent review (screen-review + journey-test, reviewer role)

Reviewer: a fresh context that did not build this. Commit **2029a76fbab7b1f359c4bb0d9dc8347d360482ab** (`claude/ecstatic-franklin-sbhofa`, PR #1581), 11 Nov 2026. Concept rev 2 and challenge read from `origin/claude/epic-feynman-qiq6u6`; rulings P-484. Own isolated copy `screens_bk5r` on :4461 (stopped after). Live AI off, US$0, no priced button pressed. Paths under `prototype/studio/` unless stated.

**Summary verdict (skill scale): Ship after fixes.** One open Major (M1). Journey score **8.5/10**.

## What I re-ran
* `tests/check_bk5_start_browser.cjs 4461 xr_studio_screens_bk5r`: **39/39** from a scratch copy, so the repo's screenshots were not overwritten. Door 2 end to end took 111.5 s.
* My own Playwright walk (headless, `/opt/pw-browsers/chromium`): keyboard only, Demo menu → Starting points → Start here → Empty and start → landed in 120.6 s (toast "loaded in 120 s. Kept files checked unchanged"). Data after: 17 programs, 6 combinations, releases on 5 (Visitor visa 2, others 1), 1 `runtime_case`, 1 reset line, 1 checkpoint line, 0 AI POSTs.
* Also: 1024 px and 200 % zoom (720 px CSS) with no sideways scroll, page and dialog; axe clean at 1024 px; first view 336 ms; H1 then 3×H2; a reload during door 2's load; the Approver at 1024 px; the two-tab break.
* `graph.mjs --check`: exit 0, G1 0 and G4 0. `/start` is visited by the new check, and its 3 POST routes are reached.

## Issues (ranked)
**M1 · Major · Must: a start sends RESET for the person on a stale or unknown "no programs", so it empties work without the typed RESET.** This breaks BR-2 and EXPERIENCE §2.8 [M] (in-page confirmation for destructive actions).
* *Code:* `web/src/pages/start.tsx:155` sets `needsReset = !!status?.programsExist`. That reads `false` while `/demo/status` has not loaded or has failed, and stays `false` from the page's last read: the query does not refetch on focus, and outside the story job it has no interval. `:164`/`:176` then always send `{confirm:"RESET"}`.
* *Reproduced:* tab A sat on `/start` on an empty demo; a second tab loaded the six (17 programs). In tab A, door 1's dialog said "The demo has no programs, so nothing you made is lost: no RESET needed" with "Goes … 1 row". Meanwhile the frame's own draft bar already read "7 changes across 1 combination". **Empty and start** sent `POST /demo/reset {"confirm":"RESET"}`, so 17 programs became 0, and the toast said "1234 rows removed".
* *Why the server did not stop it:* the server's only guard is the typed RESET, and the page supplied it. Build deviation 1 (door 2 always resets) carries the same hole to door 2. Concept §7 would have sent `load` alone there, and the server refuses that with a 409 when programs exist.
* *Fix:* treat "unknown" as needing RESET and keep the doors off until `/demo/status` has answered (also on error). In `go()`, when RESET was not typed, re-read `/demo/status` first; if programs now exist, stop and show the RESET field ("The demo has programs now: type RESET"). Fail test: load the six by API while the page is open, press door 1 and door 2, expect no `/demo/reset` POST until RESET is typed.
* *Severity:* demo data only and it can be reloaded, but this is the page's one destructive guard, and "two tabs" is in the concept's own breaker list (§7).

**m1 · Minor · Should:** on an empty demo the confirm says "Goes: All configuration, releases and cases: **1 row**" next to "nothing you made is lost" (`start.tsx:207`; screenshot `bk5-02`). That row is the last reset's own Activity line (`scope.rows["Activity entries"]=1`). *Fix:* when `!programsExist`, say "Nothing you made (only the last reset's activity line)", or leave the count out.

**m2 · Minor · Should:** the part-way words carry two instructions: "…Reset the demo, then load again. Start again empties it first." (`bk5-08`). This follows BR-6 to the letter, because the server's words are kept. *Fix:* drop the server's trailing "Reset the demo, then load again.", which is the Demo-menu instruction, from the words shown here. Optional; listed for the Lead.

**m3 · Minor · Should:** door 3's evidence shot `screenshots/bk5-11-door3-landed-1440.png` shows only loading skeletons, and the step checks the URL only (`tests/check_bk5_start_browser.cjs:199-201`). *Fix:* wait for the case's heading before the shot and the PASS.

**m4 · Minor · Should:** the tab title is set twice, by the fallback at `web/src/App.tsx:67` and again at `start.tsx:66` (STANDARDS §7: no duplicated logic). *Fix:* keep one.

## Builder's deviations and discovery, judged
* **1. Door 2 always empties first.** The reason holds: only the reset returns `preserved_unchanged`. Accepted **only with M1's fix**, because otherwise it widens M1.
* **2. "Sign in as the Configuration author" switches the simulated person.** Accepted until BK-5 PR 2 links it to `/sign-in`.
* **3. Door 1's Continue is secondary on an empty demo.** Accepted (P-473, BIC-11).
* **4. A 4.5 s toast.** Accepted, since the concept chose a toast.
* **Status race: confirmed in the code.** `api/src/demo.ts` `status()` reads `last` before `await this.scope()` and `this.story` after it; `runStory` awaits the "finished story" audit line before it sets `done`, so any read after the first "done" is right. The web workaround (`start.tsx:74-75`, re-read once the job stops) is sound and passes without a reload. The server one-liner (read `this.story` first) is the Lead's call, not needed for this PR.

## Concept fit, words, standards, code
* **Concept fit.** BR-1 to BR-7 present, each with a pass and a fail step (apart from M1's gap); words per concept §4 and §6; one name everywhere (menu "Starting points…" first, "Demo › Starting points", tab, H1, Demo pill); one filled button; door 2's comes-back list matches the measured load (5 of 6 released, High-wage position unreleased, the family case on Visitor visa).
* **Menu (PRODUCT §3).** No new left-menu item: the page sits in the Demo menu, which is demo chrome with its pill (EXPERIENCE §1 [M] met).
* **Code.** No API, schema or migration change; the server keeps authorisation (a direct reset by the Approver gets 403); a double click sends one start (`once` ref; the check double-clicks Try again); 2 GETs (session, status), no per-row requests. **Rule-removal spot-check:** dropping the RESET branch fails "BR-2 fail"; changing BR-6's words fails its anchored regex; removing the running→"Another state" line fails the BR-5 pass step. No test covers M1.
* **Retrofit.** Scaffolding and demo chrome, not ported (concept §8; pill title "Demo chrome: not part of the product").
* **Other suites.** I did not re-run the bk3/C10.1/S7 suites myself. The change to them is the menu item plus one `where.ts` line, and the bk5 check covers both.

## D1-D20 (1-5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | BR-1 to BR-7 each pass and fail (39/39); M1 breaks BR-2 under a race |
| D2 Data integrity | 3 | M1: a stale tab empties 17 programs with no RESET typed |
| D3 Reuse | 4 | Existing routes and `FinishedStoryDialog` reused; no server logic copied |
| D4 Rule integrity | N/A | No configuration rules on this page |
| D5 Stability and recovery | 4 | Double click sends one start; part-way Try again; the story survives a reload. Door 2 after a reload shows no progress (concept: "Keep this page open") |
| D6 Freshness and governance | 4 | Reset audit line and reset log; kept files checked and shown in the toast |
| D7 AI trust | N/A | No AI; BR-7 has 0 AI POSTs |
| D8 Orientation | 5 | Demo › Starting points, tab, H1, Demo pill, Back |
| D9 Flow | 4 | One card and one wait; lands on Immigration programs with the next step in the toast |
| D10 Language | 4 | Plain words throughout; m1, m2 |
| D11 Feedback and state | 4 | Step and real seconds, 409 words, Another state; M1's dialog states something stale as fact |
| D12 Visual quality | 4 | Team components; one primary; destructive red only on the confirm |
| D13 Accessibility | 4 | axe clean at 1440, 1024 and 375 px; keyboard path; 200 % zoom; focus ring (after its 150 ms transition). No screen reader tried |
| D14 Team look | 4 | Frame, tokens, Notice, Pill, Dialog |
| D15 Speed | 5 | First view 336 ms; door 2 111.5 s and 120.6 s against "typically 2 minutes" |
| D16 Testability | 4 | 39/39 reproduced by me; M1 and m3 gaps |
| D17 First use | simulated only | No intended user walked it |
| D18 Provenance | 4 | Row counts, measured seconds and the kept check all come from the server's answers |
| D19 E2E closure | 4 | Door 2 → Visitor visa → Review and release (builder's `walk-08`; my data check). E1's change and release is not this PR |
| D20 Pain/wow | simulated only | Today 2 dialogs, RESET, then load; now 1 card and 1 wait |

## BIC scorecard (concept §5: BIC-11, BIC-18, BIC-20 apply; the rest N/A, demo chrome)
| Check | Score | Evidence |
|---|---|---|
| BIC-11 one primary | Met | One filled button on every state: `bk5-01`, `bk5-06` (1440 px); `rv-08` Approver (1024 px) |
| BIC-18 states | Partly | Read-only says why; running, busy and failed are drawn. But while status loads, the page shows a spinner line and the doors are live with "no RESET" (M1). Must, via §2.8 |
| BIC-20 keyboard and zoom | Met | Keyboard-only door 2 end to end; 1024 px and 200 % with no sideways scroll; H1 then H2s; plain short sentences |

## Journey test (reviewer role; folded in here, since my brief allowed only this file)
Persona: the Configuration author running the demo. Journeys: J1 (main) Demo menu → Starting points → door 2 by keyboard → Immigration programs → Visitor visa's Review and release · J2 door 1 from a full demo · J3 door 3 with a reload while it runs · J4 (empty) no RESET asked · J5 (error) part-way stop, then Try again · J6 (busy) 409 while another load runs · J7 (wrong role) the Approver, a non-demo workspace · J8 (recovery) reload during door 2's load: "Another state", not updated until a reload (BR-4 allows), right after one · J9 (break) two tabs → M1. **Held:** all but J9.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 landed; data correct |
| Next step obvious | 1 | One filled button; the toast names the next step |
| Plain words | ½ | m1, m2 |
| Feedback and state | ½ | M1's dialog says "no programs" while the frame shows changes; J8 never updates |
| Correct data | ½ | M1 deletes work without confirmation |
| Error recovery | 1 | Part-way Try again; 409 in the server's words |
| Accessibility and screen sizes | 1 | axe, 375/1024/1440 px, 200 %, keyboard |
| Speed | 1 | 336 ms; door 2 within its typical time |
| Visual quality | 1 | `bk5-06`, `rv-08` |
| Trust and sources | 1 | Measured seconds, row counts, kept check, US$0 |
| **Total** | **8.5/10** | Passes the score bar, but M1 is open |

## Could not check
A headed (visible) browser (headless only) · a real screen reader · an intended user's unaided walk (D17, D20 stay with the founder) · server down beyond the frame's notice · E1's change and release N+1 (BK-5 PR 2 and the walk).

**Verdict: Changes needed** at 2029a76fbab7b1f359c4bb0d9dc8347d360482ab (Block). Fix M1, with its fail test. m1-m4 should be fixed or listed in the PR.

## Re-review (f1e4f40)
Diff only: `2029a76f..f1e4f4068dedfaca206f1f7a20c63e4fbe8e2101`, covering `web/src/pages/start.tsx` and `tests/check_bk5_start_browser.cjs`. I used a fresh isolated copy on :4461 (stopped after). US$0. The later head 56025a12a changes records only (break report, screenshots), not product code.
* **Re-ran:** `check_bk5_start_browser.cjs` passed **44/44** from a scratch copy, with the new M1, m3 and m4 steps. Door 2 took 152.7 s, slowed by the coordinator's run on the same machine; the card says "typically".
* **M1: closed, and checked by my own break run** (`review_break2.cjs`, not committed):
  * **Stale tab, every door:** the tab read the demo as empty; another tab then loaded the six (17 programs). Doors 1, 2 and 3 each sent **no POST**, and 17 programs remained. Each said "The demo has programs now … nothing was emptied. Type RESET to confirm.", and the RESET field appeared.
  * **RESET then typed:** the demo emptied, as expected.
  * **`/demo/status` failing (500):** all 3 doors were off, with "The demo's state could not be read".
  * **Code:** unknown state asks for RESET (`start.tsx` `needsReset = status ? … : true`), and doors stay off while `!s`. `go()` re-reads `/demo/status` before emptying, and sends the person's own RESET when programs exist. The milliseconds left between that read and the reset are covered by the server's one-at-a-time claim: a running load gets a 409.
  * **Test:** the new step fails if the re-read is removed, because a `/demo/reset` POST would appear.
* **m1: closed.** The empty demo's Goes line now reads "No programs: only 1 record line, such as the last reset's activity line".
* **m3: closed.** The check waits for the case page itself, and `bk5-11` now shows it.
* **m4: closed.** The title is set only in `App.tsx`.
* **Breaker's minors: checked.**
  * Focus returns to the opening door on close (my run: blank, configured and story).
  * "Another state" with programs re-reads every 10 s: a configured load finished in another tab, and the open page showed "Last loaded: Pathways released, ready to walk" 10.3 s later, without a reload.
  * The 409 "did not start" words and the kept part-way context on a refused retry read correctly in the code.
  * The 10 s poll keeps running while the six alone are loaded: one light GET, demo only, not a finding.
* **m2: open, for the Lead** (BR-6 keeps the server's words). It is not blocking.
* **Changed scores:**
  * D2 3→4, D11 4, D16 4→5.
  * BIC-18 Partly→**Met**: doors stay off until the demo's state is read, and a failed read says so.
  * Journey: feedback and state ½→1, correct data ½→1. Plain words stays ½ for m2. **Journey score 9.5/10.**
* No new Blocker, Major or Minor.

Verdict: Approve (f1e4f4068dedfaca206f1f7a20c63e4fbe8e2101)

# F2 — Browser extension and forms ingestion: review-3, Pass A + Pass B (independent reviewer, 26 Oct; commit 55c0cba)

**Verdict: Ship after fixes.** Every item in the Lead's 26 Oct note is built and its scripted check passes again on this commit. Nothing sends a typed value: the panel's check list, the server and the stored record all held. But two things are not ready. (1) A copy of a form whose edition is already in the library gets stuck after a second person approves it, and DEMO row 1's own seed leaves one such stuck item in To review. (2) The pairing endpoint no longer has any rate limit. **0 Must · 2 Major · 10 Minor. Journey score 7.5/10: below the pass mark of 8** (fixes listed below).

Method: skills `screen-review` and `journey-test` (reviewer role). Isolated copies on 4454 and 4455 only, with the Sample APR server on 4453 over https under a made-up host (`apr-portal.sample.test`). Headless Chromium (no visible window, so the founder's live demo screen was not disturbed). Stub and replay only, no model call: US$0. Shots and logs: `/private/tmp/claude-501/…/scratchpad/review3/`.

## What I ran (exact results)
* Suites on 4454: `check_forms_apr` 37/37 · `f2b` 45/45 · `f2c` 38/38 · `p80_guard` 41/41 · `pdf_hardening` 49/49 · `demo` 16/16 · `f2a` 60/60 · `f2c_fill` 17/17.
* Not run: `f2d`. It hardcodes portal port 4459, which is outside my ports. `check_forms_apr` and my journeys cover the same panel.
* `graph.mjs --check`: G1 0 · G2 0 · G3 2 · G4 0 · G5 1 · G6 0, exit 0. Same counts as review-2. I could not itemise them from graph.json.
* **The working copy changed while I reviewed it (builder, uncommitted):**
  * `tests/check_forms_demo.ts` at 11:22. My demo run of 16 includes 4 new SC-3 browser checks; the committed file has 12.
  * `extension/build.ts` and `tests/check_forms_apr.ts` at 11:42: a partial fix for Minor 3. The app code I ran is the committed code.
* The suites append US$0 stub lines to the tracked `p2/ledger/spend.jsonl`, `p2/screening/canary-digest.json` and `used-launch-tickets/`. I left those for the Lead. I deleted the drafting files my own J4 stub pass created (see Minor 8).

## Journeys walked (my script `review3/j.mts`, as a person: clicks and typing only, API only for case setup)
1. **The founder's G3 path.**
   * Build and connect:
     * `npm run extension:dev http://localhost:4454 apr-portal.sample.test <out>` builds in 0.9 s and prints where it runs.
     * Pasting a full URL with a path, or `localhost:4400` without `http://`, builds nothing and says why in plain words. `APR-Portal.Sample.Test` and `host:443` are accepted.
     * Studio "Get a code", then one wrong character typed in lower case: the panel says so (wrong_tries 1 in the database). The right code in lower case connects.
   * Capture:
     * The portal is APR by default.
     * Start capture, then remove a screen, both by keyboard.
     * Values I typed on the screen (family name, UCI) are absent from "Check before sending" and from the stored record.
     * Shadow-DOM and unlabelled pages: "Not read … Nothing was sent".
     * The same screen twice is refused. Finish: held.
   * Return and resume:
     * The capturer cannot decide their own capture. The reviewer returns it with a reason.
     * After a panel reload: "Returned to you: IMM 5257 · 5 screens", with the note. Remove screen 5, capture it again, finish; the reviewer approves.
2. **Officer fill.**
   * A release with IMM 5257 filed Online on APR (setup helper). The officer connects and finds the case.
   * "Filled 6 of 9 · 3 need you", each value with its source; the UCI says "You answer this on screen".
   * The reworded APR screen: nothing filled, "This screen looks different", one "Re-capture needed" task in the Studio.
3. **Sample-form picker.**
   * At 1024 px: 37 files. Kind = Form: 14. A search for "5707": 2 files. "Family Information": "No official file matches".
   * Attach by keyboard (Tab to Attach, then Enter). At 512 px (1024 px at 200 % zoom): no sideways scroll.
4. **Held PDF, second person, then drafted.**
   * A byte-different copy of IMM 1344 is held. The uploader records the IRCC page and cannot approve; the reviewer approves.
   * The form is attached as "Approved in the product by Content reviewer" and read in 284 ms (233 form fields). "Stub pass only" runs all 5 parts in 3.1 s (STUB, COMPLETED).
   * Repeated with the DEMO row 1 file, a copy of IMM 5257 SCH1: see Major 1.

axe (WCAG 2.2 A/AA): clean on all 13 states I checked:
* Panel (7): connect, capture start, check before sending, not read, returned, fill, looks different.
* Studio (6): extension page, capture review, held file, picker, draft dialog, and the review-2 states this pass did not change.

At 360 px there is no sideways scroll in any panel state. Console: one 401 (my deliberately wrong code). Speed: sending a screen ≈100 ms, a fill 40–110 ms.

## Major
1. **An approved copy of an edition the library already has goes round in a loop and stops with a 409.**
   * What happens: `intake.ts:145` sends the approved file through the intake again. It is held again as "same edition, different file" (`intake.ts:268`). Approving that second hold fails: "This file is already on the approved list" (`intake.ts:133`). The copy is never attached, read or drafted, and the only way out is Reject.
   * Who hits it: DEMO row 1's own seed (`forms-demo.ts:48-56`, IMM 5257 SCH1). On a fresh copy (4455): `DONE|Approved…`, then `HELD|same edition, different file`, 0 attachments. `check_forms_demo` passes only because it never looks at what happens after approval. The P-80 pass test uses IMM 1344, whose edition is new, so it never meets this.
   * Fix: decide the case before approving. Either tell the reviewer that the library already has this edition from the official file and the copy should be rejected, or let the re-intake accept the approved checksum. Then assert the outcome after approval in `check_forms_demo`.
2. **The only unauthenticated endpoint has no rate limit** (`extension.ts:69-85`; STANDARDS [M] "rate limits", ASVS L2).
   * Pass A removed the per-address pause (the fix review-2 Minor 1 asked for) and put nothing in its place.
   * Measured: 300 random codes from one address at about 880 per second, all answered 401, none slowed. At that rate one client can sweep every three-character selector five times (about 149,000 requests) in about 170 s, inside a code's 5 minutes. That voids every open code in the office.
   * It is a denial of service, not a takeover: the per-code void keeps guessing at about 4 in 28.6 million.
   * Fix: keep the per-code void and add a generous throttle per address and overall (e.g. 60 per minute), so a shared office address is not penalised and floods are.

## Minor
1. **A returned capture loses portal order.** `removeScreen` splices the screen out (`forms.ts:310`) and a re-capture is added at the end. Reproduced: remove screen 2 of 3, capture it again, and the order becomes 1, 3, 2. This is exactly the PR #27 flow ("remove, capture again"). Fix: re-capture into the gap, or let the person choose the position.
2. **Some unknown markup silently drops questions** (`reader.ts:184,187`). A closed shadow root, or a frame from another site next to labelled inputs, gives a check list without those questions instead of "Not read". I probed both on a local https page. No value is sent, but the founder's real APR capture could be incomplete with no warning.
3. **The build command deletes whatever folder path it is given** (`build.ts:21`, `rmSync(out, {recursive})`; `build.ts:48`).
   * A wrong extra argument wipes an existing folder: reproduced on a scratch folder; its file was deleted.
   * `npm run extension http://localhost:4400 <host>` silently built into a folder named `http:/localhost:4400`. I removed the two folders it made.
   * The uncommitted fix in the builder's copy catches addresses only. Fix: build only into `var/` or into an empty folder.
4. **The draft dialog of an approved-in-product form defaults to "Live AI call … up to US$5 / Start live AI draft"** (`sources.tsx:124,133`), and the server refuses it (`ai.ts` plan: not_eligible). Fix: default to Stub, or disable Live with that reason.
5. **The capture review says an extension capture came "from saved blank pages"** (`review-items.tsx:123`). It is not new, but the second person sees it on the founder's real APR capture. The provenance is wrong.
6. **Returned capture wording:**
   * Finish is disabled with no reason shown (`panel.tsx:248`).
   * The status says "or abandon the capture", but the panel has no Abandon (`forms.ts:68`).
   * "again.. Next" when the note ends with a full stop; "1 questions".
7. **The officer has no visible way to the extension page.** The case app has no link to it. The Studio's person switch lists only the author, the reviewer and the approver (`App.tsx:144`), so the page is reachable only by typing `/extension`, and there the switch shows "Configuration author" while the code is the officer's. Not new.
8. **Drafting an approved form writes per-copy files into tracked repo folders** (`p2/jobs/studio-fieldmap-approved-*.json`, `p2/runs/…`; `sources.ts:192-195,264`). My UI stub pass left 11 untracked files, and a lane commit could pick them up. Fix: gitignore those files or write them under `var/`.
9. **SC-3 search:** the build notes say "search by code or title", but it searches the edition and the file name only (`sources.tsx:95`). At 55c0cba no committed test names SC-3; one is being added uncommitted.
10. **G3 instructions** (`build-notes.md:115`): only text that matches a client-detail pattern turns red. Add: "a text that names a person or an account (for example a representative's name in a heading): do not send; tell the Lead."

## Journey score (QUALITY.md; one score for this check)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | J1–J4 complete; J4 with the DEMO row 1 file dead-ends (Major 1) |
| Next step obvious | ½ | Finish disabled with no reason; "abandon" with no button; the officer has no link; Live is the default for a form that cannot run live |
| Plain words | 1 | Refusals and "Not read" reasons are clear (shots j1-03, j1-06); small slips in Minor 6 |
| Feedback and state | 1 | Wrong code, moved tab, not read, held, returned, filled and looks-different are all visible |
| Correct data | ½ | No value is ever sent and a reworded screen fills nothing; but order is lost (Minor 1) and questions can be silently missing (Minor 2) |
| Error recovery | ½ | Reload, return and resume all work; the approved copy loops to a 409 (Major 1) |
| Accessibility and screen sizes | 1 | axe clean on 13 states; keyboard start, remove and attach; 360 px; 1024 px at 200 % |
| Speed | 1 | Sending a screen ≈100 ms, a fill ≤110 ms, reading a form 284 ms |
| Visual quality | 1 | Team look, pinned primary action, tidy at 360 px (j1-12, j2-02) |
| Trust and sources | ½ | Fill sources are shown; but "from saved blank pages" is the wrong origin, and a paid call is offered by default for a closed route |

**7.5/10, below the pass mark of 8, no criterion at 0.** Fixes that raise it, most valuable first:
1. Major 1, which raises task completed and error recovery.
2. Minor 1 and Minor 2, for correct data.
3. Minors 4, 6 and 7, for next step obvious.
4. Minor 5, for trust.

## D1–D20 (1–5; D17 and D20 simulated only)
* D1 4: every Pass A and Pass B item is present; P-80's positive path works only for new editions.
* D2 4: atomic wrong-try count and its race tests; order loss on re-capture.
* D3 4: the online twin reuses the PDF map first.
* D4 4: branches not seen are listed (spouse, past employment).
* D5 3: approved-copy loop.
* D6 4: audit lines for void and approval; a per-copy approval record.
* D7 4: stub labelled everywhere; Live default (Minor 4).
* D8 4: path shown on every screen.
* D9 3: Minors 4, 6 and 7.
* D10 4: Minor 6.
* D11 4: states visible.
* D12 4: team look.
* D13 5: axe, keyboard and sizes.
* D14 4: team tokens.
* D15 5: speed.
* D16 4: 303 checks re-run green; SC-3 untested at this commit; demo row 1's outcome after approval not asserted.
* D17 simulated only.
* D18 3: Minor 5.
* D19 4: everything closes except Major 1.
* D20 simulated only.

**[M] lines:**
* Not met: rate limits (Major 2).
* Met: expand-only migration with recorded rollback; server authorisation (removing a screen with another token: 403; the uploader cannot approve their own file: 403); zod contracts; axe and keyboard; no per-row requests seen.

## Could not check
* A real screen reader, and Chrome's real side panel (I tested the panel as a tab, as before).
* The real APR markup (G3 is the founder's).
* `f2d` (port 4459).
* The team code (`code/` is not used here).
* D17 and D20 need the founder's or an intended user's unaided walk.

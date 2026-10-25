# F2 — Browser extension: review at CHECK (independent reviewer, 25 Oct; commit 6f6e098)

**Verdict: Ship after fixes.** 1 Must · 1 Major · 9 Minor. **Journey score 7/10: fail.** "Correct data" scores 0 because of the Must; with it fixed this walk would score 8.
The journey report is in this file because the Lead asked for one file. Method: skills `screen-review` and `journey-test`. Isolated copy on :4446 and Sample portal on :4448, Chromium 1243 with the unpacked dev build, PostgreSQL 16. No model call (US$0).

## What I re-ran (exact commit, by someone other than the builder)
f1p 16/16 · f2a 34/34 · f2a_api 29/29 · f2b 33/33 · f2c 32/32 · f2c_fill 11/11 · f2d 31/31. For f2d I used a scratch copy with only the portal port changed to 4448. Rule-removal spot checks, run in a scratch copy:
* BR-12 removed (`filler.ts:58`): f2c_fill fails 2 checks.
* BR-8 removed (`fill.ts:89`): f2c fails "an answer not confirmed is not filled" and the count words.

Graph (P-86): G3 lists `GET /extension/captures/:id` (unused and untested) and `GET /extension/cases`. The second is a tool blind spot: the panel calls it and f2d drives it, but the graph does not see the panel as a page.

## Journeys walked (my own Playwright script on the unpacked extension; screenshots are in the reviewer's scratchpad)
1. Author connects with a Studio code (typed in lower case: accepted) → captures s1 (typed into), s2, s3 → Finish → "Held for a second person". Capturer approve → 403. Held.
2. Officer: choose case → Fill on s1 → "Filled 6 of 9 · 3 need you", each value with its case question and "confirmed". 1.3 s under a concurrent regression run; API calls 16–28 ms. Held.
3. Error: reworded screen → nothing filled, differences listed, task opened. Unknown screen → "Capture needed". Wrong code → plain refusal. Held.
4. Boundary: the content team re-captures only the changed screen in the panel → "Compared 1 screen seen (1 changed); 2 not seen this time" → second person approves → task Done, the other screen's task stays Open → old case gets "fill this screen by hand". Held.
5. Wrong role: the client persona's "Get a code" → "holds neither the capture duty nor the case duty". Held.
6. Recovery: double click on Fill → 1 plan request. Reload the panel mid-capture → **the capture is gone from the panel** (Major 1).
7. Break: a spouse screen whose heading shares its first 40 characters with the applicant's screen → **filled with the principal's facts** (Must 1).
8. Sizes and keyboard: panel at 320 and 480 px, Studio page at 1024 px and 200 % (512 px): no sideways scroll. Connect, Fill and Capture by keyboard. axe clean on every panel state and on the Studio page.

## Journey score (QUALITY.md)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1, 2 and 4 complete in the panel |
| Next step obvious | ½ | After "Finish capture" the only button is "Sign out" (Minor 1) |
| Plain words | ½ | A slug in the Studio's task list; "options" there, "choices changed" in the panel (Minor 3) |
| Feedback and state | ½ | A re-capture of 1 screen says "3 screens captured" (Minor 2) |
| Correct data | **0** | Wrong-person fill on a colliding heading, shown green as "Filled 6 of 9" (Must 1) |
| Error recovery | ½ | Changed or unknown screen and 401 recover well; a capture is lost on panel close (Major 1) |
| Accessibility and screen sizes | 1 | axe clean; keyboard path; 320/480/1024/200 % |
| Speed | 1 | API 16–28 ms; Fill to result 1.3 s with the machine under load |
| Visual quality | 1 | Team tokens and logo; one pinned primary action; tidy at 360 px |
| Trust and sources | 1 | Every filled value names the case question and "confirmed"; "You answer this on screen" shown |

## Must
**Must 1 — Screen identity is cut to 40 characters, so a different screen can match and be filled with the wrong person's facts (B1 comes back).**
* The cause: `engine/twin.ts:52` `screenIdentity` keeps only the first 40 normalised characters. `screenDifference` (`engine/extension/screens.ts:27-29`) compares inputs only and drops the title.
* Evidence (engine): "Personal details of the principal applicant" and "Personal details of the principal applicant's spouse or common-law partner" both become `personal-details-of-the-principal-applic`, and the difference between them is `[]`.
* Evidence (browser): on the spouse-headed page the panel filled familyName "SAMPLE" and dobYear "1990" from Client A. It reported "Filled 6 of 9" under the twin's applicant title.
* The same collision refuses the second screen at capture as "already captured" (`forms.ts:194-196`). It also merges the two screens' re-capture tasks (`screen_page` in the unique key).
* Plan E-1 promised "heading + the form's own step id". Build notes say "the heading, normalised" and record no reason.
* Fix:
  * Use the full normalised heading as the identity (no cut; hash it if a short key is needed), plus the step id where the page has one.
  * Have `screenDifference` report a changed title.
  * Add a pass/fail test with two headings that share a 40-character prefix (engine and fill-plans).
  * Record the E-1 change in build-notes.

## Major
**Major 1 — Closing or reloading the side panel loses an open capture; there is no resume (D5, EXPERIENCE §4 states).**
* What happened: after one screen was sent, a panel reload showed the "Start capture" form again. The database still holds 1 OPEN extension capture that nothing can continue. Starting again leaves an orphan. `CaptureMode` keeps `cap` only in React state (`panel.tsx:166`).
* Why it matters: a capture runs across many portal screens during real work, so a closed panel is likely.
* Fix: on load, list the person's own OPEN or RETURNED extension captures and offer "Continue". This could use the existing, unused `GET /api/extension/captures/:id` plus a list route, or keep the capture id in `storage.session`. Add a reload-mid-capture test.

## Minor
1. After Finish, no next action (`panel.tsx:198-212`): add "Start another capture" (EXPERIENCE §2.5).
2. The re-capture header counts the merged version ("3 screens captured" after capturing 1) (`panel.tsx:201`). Say "1 screen captured this time" and use the status line for the rest.
3. The Studio task list shows the key "(screen your-spouse-or-common-law-partner)" for a not-captured screen (`extension.ts:184`) and the raw "options" (`web/src/pages/extension.tsx:70`). Use the live heading (or "A screen not in the approved version") and the panel's word, "choices changed" (EXPERIENCE §5).
4. The "Browser extension" menu item is filed under History (`App.tsx:40`). PRODUCT.md §3 lists History as AI work · Releases · Activity. The Lead should record the item and its group.
5. "This case uses the version released on <date>" prints the online version's capture date, not the release date (`extension.ts:167`).
6. `GET /api/extension/captures/:id` has no caller and no test (graph G3). Use it (Major 1) or remove it.
7. The f2d journey stops before plan §9's last steps: re-capture in the panel → approve → a new case fills `s1-reworded`. That part is covered only by f2c through the API. The approve step and the Q3 marker run through API scaffolding because no Studio screen has them yet (F1 hooks, screens lane). This is for the Lead under P-33 at the milestone walk.
8. The `check_forms_f2b.ts` usage line omits `--tsconfig api/tsconfig.json`. Run as written, it stops with a decorator TransformError.
9. Two smaller code points:
   * `portalTab()` takes the active portal tab of any window (`panel.tsx:28`). Prefer the last focused window.
   * The writer does not check that the element's tag and type match the plan's type before writing (`filler.ts:55-57`; plan §7 "after a type check"). The structure compare makes this unlikely to bite.

## Dimension scores (independent reviewer; browser and script)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | BR-1…BR-15, XT-1…XT-7 built and tested; E-1 identity deviates (Must 1) |
| D2 Data integrity | 2 | Revision 409, partial-unique tasks, racing codes and tasks tested; wrong-person fill on a colliding heading |
| D3 Reuse | 4 | One reader-rules file for both readers (conformance 34/34); fill uses the shared renderer |
| D4 Rule integrity | 4 | An incomplete screen map fills nothing; the marker counts as decided at release |
| D5 Stability and recovery | 3 | Double click safe; plan dropped on navigation; capture lost on panel close |
| D6 Freshness and governance | 4 | `last_seen` per screen; audit lines carry counts only; author ≠ approver 403 |
| D7 AI trust | n/a | No AI in F2 (P-62 §4) |
| D8 Orientation | 4 | Panel header shows person and mode; Studio menu group questionable (Minor 4) |
| D9 Flow | 3 | Short paths; dead end after Finish |
| D10 Language | 4 | Plain words throughout; one slug and one raw change word |
| D11 Feedback | 4 | Every concept §4 state reached; one miscount |
| D12 Visual | 4 | Team tokens, logo, Inter; pinned primary action |
| D13 Accessibility | 4 | axe clean on all states; keyboard; 320/480/1024/200 %; no screen reader run |
| D14 Team look | 4 | Team components on the Studio page; panel built on the same tokens |
| D15 Speed | 4 | API 16–28 ms; no request per row (`cases()` is one query) |
| D16 Testability | 4 | 186 checks rerun green; removed rules fail; no collision test; one unused route |
| D17 First use | simulated only | |
| D18 Provenance | 4 | Each filled value names the case question and "confirmed" |
| D19 End-to-end closure | 3 | Works across capture → release → case → fill → re-capture; approve and marker are API only |
| D20 Pain and wow | simulated only | |

## Standards [M] — exceptions only (the rest met with evidence above)
* Not met: EXPERIENCE §5 no IDs on the main path (Minor 3) · EXPERIENCE §2.5 one next action per status (Minor 1) · STANDARDS §3.10 a pass and a fail test per rule (screen identity, Must 1).
* Met: server authorisation deny by default (token-only routes; x-actor 401; capture-only token 403) · Problem Details errors · expand-only migrations with recorded rollback · no client data logged (tests) · technology gate (`@types/chrome` 0.3.5, for the Lead's ENVIRONMENT.md) · panel width deviation (320–480 px vs EXPERIENCE §3's 480–560 px) recorded in the plan.
* Retrofit mapping is recorded (plan §8, "Unverified").

## Could not check
A real screen reader · the panel inside Chrome's real side-panel surface (tested as a tab, as the builder did) · Edge · PostgreSQL 18 (CI's version) · a real portal and its hosts · the team code (`code/` is not in this copy) · D17 and D20 (need the founder's or an intended user's unaided walk).

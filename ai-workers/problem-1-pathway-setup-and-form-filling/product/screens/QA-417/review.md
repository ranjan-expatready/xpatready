# QA-417 review: the officer can find where "to confirm" lives (PR #1640)

Independent reviewer (skill screen-review plus journey-test as reviewer; fresh context, did not build it), 12 Nov 2026. **Commit reviewed: `9f0fc27e69fa3f638864f2993e77df6da4b7f9ac`** (branch `claude/screens-qa417-one-count`; diff `git diff origin/main...9f0fc27e6`, merge base `e5bcc40d3`). Row: `qa/BUGS.md` QA-417 (Major, journey). Ruling: P-497 (Lead 25, on #1640): web only, P-72 and P-78 kept, the four points below. No concept file (a bug fix); the bar is the ruling, `challenge.md` and the rehearsal (`qa/reports/2026-11-12-walk-1-rehearsal.md` §2 step 11, §3 step 3, §4).
Journey test (reviewer role): in this file (the caller asked for review.md only, so there is no separate report). **8/10, pass.**

## Verdict
No Blocker, no Major; 3 Minor (Should), 2 notes on older code. **Verdict: Approve** (for `9f0fc27e6`). In skill terms: Ship. The Minors can follow in a later PR.

## What I re-ran (my own isolated copies, :4461 and :4462, each stopped afterwards; live AI off, US$0)
* `tests/check_qa417_counts_browser.cjs 4461 xr_studio_screens_q417r`: **38/38** passed, exit 0, on two fresh copies. The 38 include the checkpoint-load setup line. Visitor visa: household 101 = tabs 101 = sections 101; 30 = 30 = 30 after Confirm section on Sample Spouse A (71). Study permit: 29 → 18 after Sample Client A's first parent (11).
* **Fails on base:** I did not re-run it myself. A scratch worktree with the base's two web files could not start a copy: the sandbox refuses the database data folder through the scratch path. By construction it fails: `data-tab=`, `data-tab-to-confirm`, `data-household-tab(s)` and `data-nothing-to-confirm` do not exist in `web/src/runtime` at `e5bcc40d3` (git grep), so the tabs sum to 0 and the link and nothing-to-confirm checks fail. This matches the builder's 9 passed, 4 failed.
* `tsc --noEmit -p web/tsconfig.json`: exit 0. `graph.mjs --check`: G1 0 · G2 0 · G3 33 · G4 0 · G5 0 · G6 12, the same as the base (no hard gap).
* My own walk (Playwright script in the scratchpad, not committed): a big Visitor visa family (principal, spouse, children aged 19, 15, 9 and 4; 17 tabs; Client A answered 542). Also a case where the officer records 9 background answers by phone (C6.18).

## The four points (P-497)
| Point | Result |
|---|---|
| 1. Each person's tab shows "N to confirm" | Met. Every tab with a count shows it, and the tooltip says it too. Big family: tabs sum to 188, and the API says answered 491 − confirmed 303 = 188. |
| 2. The household line names those tabs and links to them; a link opens the tab | Met. 12 links summing to 188. The link opens the tab, scrolls it into view, focuses it and clears the address. A subject id with "/" (`…/parent_2`) opened correctly. |
| 3. Confirm section with nothing to confirm says so | Met, and no request is sent (checked twice). But two of the new sentences can be false (Minor 1 and 2). |
| 4. Pack check on Visitor visa and Study permit, before and after: household = tabs = sections; fails before the fix | Met (above). |

## Your questions
* **The button is no longer disabled.** Acceptable, and better for a11y. It stays focusable, keeps its secondary look and its tooltip says "Nothing to confirm in this section". The toast is announced through the frame's `aria-live="polite"` region (`components/frame.tsx:120`). P-72 is kept: the `nothing` check uses `open` (answers not VERIFIED), so own Declared answers are not called "nothing". The wording is wrong in two cases (Minor 1 and 2).
* **A "0 to confirm" section with a primary Confirm button** (the client's own Declared answers). This comes from older code (`variant={open > 0 …}`, unchanged) and is not among P-497's four points. Under P-72 the officer may still confirm them, so it is not wrong data. It does strain BIC-11 ("the next step the status calls for"). It is out of this PR's scope: I recommend a qa row, not a change here.
* **The hash link with keyboard and screen readers.** Works. From the client link, the first household link is 4 Tab presses away. Enter opens the tab, focus lands on it with a visible ring (`rev-keyboard-opened-1440`), and the arrow keys keep working. Accessible names, from the aria snapshot: tab "Sample Spouse A 71 to confirm 7 missing"; link "Sample Client A's father (7)", in a sentence that starts "To confirm, in the Agent view:" (meets WCAG 2.4.4 in context). One note: replaceState leaves the history entry the link pushed, so the first Back press stays on the page. The `#a-` links already do the same (C6.4).
* **The line's length on a big family** (12 links). 1440 px: 144 px tall. 1024 px: 352 px in a ~330 px column. 375 px: 312 px, readable. No sideways scroll at any width. At 720 px (1440 at 200 % zoom) it is **1600 px tall, one word per line**. The cause is in older code: the header's left column is `min-w-0 flex-1` next to the Client questionnaire card, and is **41 px wide even on a case without the new line** (`rev-720-no-tabs-line`: the case reference breaks into "RE / V4 / 17-"). See Minor 3.
* **Suites and the new tab names.** Every Agent-view suite finds a tab by a prefix regex or a substring (`^Name`, `(?!'s )`, string `name:`). These still match "Name 12 to confirm…". The exact-name checks (`check_x1_tabs_focus`, `check_uxa1_counts`, `check_w1_start_setup`) look at the Studio setup tabs, not the Agent view. `qa/check_qa_golden_2.cjs:235` clicks every enabled Confirm button. It will now also click nothing-to-confirm ones, but it only logs (`info`). No suite asserts the disabled state or "Nothing answered yet". I did not run the full suites: CI and the builder's `--direct` run cover them.

## Code (STANDARDS §6–§7)
* One source: `toConfirmByTab` sums `answered − confirmed` over the same sections the engine sums for `summary` (`engine/runtime/case.ts:513`). `byPerson` is a stable sort, so applying it twice is harmless. The case page and the Agent view read the same query, and Confirm's `refresh` updates both. Nothing changes in the API, the schema or permissions, so no data is at risk. There is no per-row request.
* The hash handler: an undecodable hash or an unknown person is ignored. `CSS.escape` handles ids with "/". The address is cleared after use, so a later render does not jump back.

## Issues (ranked; all Minor, Should)
1. **"No answer is given here yet" beside answers that are shown.** In a section whose answers all come from the firm record, `seen` is empty because firm answers are excluded (`questionnaire.tsx`, AgentSection `seen`/`nothing`). Example: The representative › Section B, "12 answered · 0 to confirm", 12 answers marked "From the firm record". The toast says "nothing to confirm. No answer is given here yet." (`rev-J3rep-0-page`). This is the **first tab of every case**. Fix: choose the sentence by `s.answered === 0`; for firm answers say something like "These answers come from the firm record."
2. **"Every answer here is confirmed already" when none are.** Background information with 9 answers recorded by staff: the pill says "9 answered · 9 to confirm", and the household line sends the officer there ("Sample Client A (10)"). The toast says "nothing to confirm. Every answer here is confirmed already. 9 recorded by staff wait for the client to re-confirm." (`rev-J3bg-13-page`). Before this PR the click returned "0 answers confirmed. 9 … wait…", which was true. Fix: when `waiting > 0`, drop "Every answer here is confirmed already"; say "Nothing here for you to confirm: 9 … wait for the client to re-confirm." The pack check does not cover this case or Minor 1. Add one line for each.
3. **The new line inherits the 200 % zoom column bug** (BIC-20, D13). The squeeze is older code, not this PR, but the line makes it 1600 px. Also, at 375 and 1024 px the "·" separators can sit alone on a line, because the links are `inline-flex`. Fix (one class): give the left column a basis so the card wraps below it (e.g. `basis-[28rem]` or `min-w-[min(100%,28rem)]`). Or file it as a qa row on the case header.
* Note A (older code): the primary Confirm on a "0 to confirm" Declared section (your second question). Note B (older code): the Back entry after an in-page link.

## D1–D20 (only what this diff touches)
D1 5: the four points met, under P-72/P-78 · D2 5: no writes; nothing-to-confirm sends nothing · D3 N/A · D4 N/A · D5 4: bad or unknown hash ignored, address cleared; repeat clicks fine · D6 N/A · D7 N/A · D8 4: the link lands on the named tab, in view · D9 5: the household line points to where the work is · D10 3: two toast sentences can be false (Minor 1, 2) · D11 4: an explicit toast instead of silence · D12 4: team tokens; lone separators (Minor 3) · D13 3: keyboard and axe pass; 200 % zoom column (Minor 3, older code) · D14 4: team components and words · D15 5: 613 ms to the line at 1440; client-side sums · D16 4: the pack fails on the base and passed twice; Minors 1–2 untested · D17 simulated only · D18 4: counts trace to section pills; Declared tooltip kept · D19 4: officer path from household to Confirm closes · D20 simulated only.

## Best in class (EXPERIENCE §6; this diff touches BIC-11, 14, 18, 19, 20; the others are N/A here)
| Check | Result | Evidence |
|---|---|---|
| BIC-11 one primary action, the one the status calls for | Partly | Unchanged rule: primary on a "0 to confirm" Declared section (Note A); the new button state is secondary |
| BIC-14 help in place | Met | Tab title "N answers to confirm (Confirm section)"; button title "Nothing to confirm in this section" |
| BIC-18 states drawn | Partly | A nothing-to-confirm state now exists; its words can be false (Minor 1, 2) |
| BIC-19 counts say what they count | Met | "71 to confirm", "Sample Spouse A (71)" under "To confirm, in the Agent view:"; shots `qa417-vv-00/01-1440` |
| BIC-20 keyboard, zoom, no sideways scroll | Partly | Keyboard path and axe 0 at 1440; no sideways scroll at 375/1024/1440; 200 % zoom column (Minor 3, older code) |

## Journey test (reviewer role)
Journeys (case officer): **J1** "where are the 188 left?": read the household line → follow the biggest tab → Confirm section → the counts fall (pack check, both programs). **J2** the same by keyboard only. **J3** the empty and edge sections: The representative (firm record), Background (waiting for the client), unanswered sections. **J4** widths 375, 1024, 1440 and 720 (200 %). Not walked: wrong role (no new route or permission), two tabs (no new write).
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Pack check 38/38 twice; J1 sums agree with the API |
| Next step obvious | 1 | The household names the tabs; a link opens the tab, focused |
| Plain words | ½ | Minor 1, 2 |
| Feedback and state | ½ | A toast replaces the silence; it contradicts the pill in J3 |
| Correct data | 1 | 188 = 491 − 303 (API) = sum of links = sum of tabs |
| Error recovery | 1 | Nothing sent on nothing; bad hash ignored; reload clean |
| Accessibility and screen sizes | ½ | axe 0 (WCAG 2.2 AA, main, 1440); keyboard J2 passes; 200 % zoom column |
| Speed | 1 | Line visible in 613 ms at 1440; no extra requests |
| Visual quality | ½ | Lone "·" separators; 352 px line at 1024 |
| Trust and sources | 1 | Counts trace to section pills; P-72 Declared tooltip kept |
**8/10, pass (no criterion at 0).** To raise it: fix Minor 2, then Minor 1, then Minor 3.

## What I could not check
A real screen reader (the names come from Chromium's accessibility tree). An intended user's unaided walk (D17 and D20 stay with the founder). A re-run on the base's files (above). The full suite set (CI). Screenshots cited as `rev-*` are in my session scratchpad, not committed.

## Re-review 112c3fc20 (diff-only, P-277)
Same reviewer role, fresh context, 12 Nov 2026. Scope: `git diff 9f0fc27e6 112c3fc20` (`questionnaire.tsx` toast, `cases.tsx` household line, the pack check, this file). Own isolated copy on :4463, stopped after each run; live AI off, US$0.
* **Re-ran:** `check_qa417_counts_browser.cjs` **46/46**, exit 0, on four fresh copies. `tsc --noEmit -p web/tsconfig.json` exit 0. Fails on the base: I could not start a copy from a scratch worktree (the sandbox refuses the database folder through that path, as in round 1). By construction it fails there: the old toast picked "No answer…" by `!seen.length`, and firm-record answers are never in `seen`, so m1 fails. It also added "Every answer here is confirmed already" whenever `seen` was non-empty, even beside waiting answers, so m2 fails. This matches the builder's 42/3.
* **m1: closed.** `!s.answered` counts firm answers, which the engine stores as VERIFIED (`engine/runtime/team.ts:185`). The representative's section now says "Every answer here is confirmed already." (vv and sp).
* **m2: closed.** When `waiting > 0`, the toast drops the sentence and names the wait. With confirmed and waiting answers mixed, the words are still true.
* **m3: the lone "·" is gone, but the line no longer wraps (new, Must).** Each item is `<span class="whitespace-nowrap">· <a>…</a>{" "}</span>` (`cases.tsx:309`). The only space between items sits inside a nowrap span, and Chromium does not break there. So the whole list stays on one line. Measured with my scratch script at 375, 1024 and 1440 px on the pack's cases: the line is 44 px tall, `scrollWidth` is 1230 against a 343 / 329 / 633 px box, and `lone = 0`.
  * At **375 px** the page scrolls sideways (document 1246 px wide).
  * At **1024 px** it also scrolls sideways (1254 px). The 3rd to 7th links lie outside the 330 px column.
  * At **1440 px** the line runs past its column, under the Client questionnaire card's column, to x = 1310. With the big family (12 links) it would leave the page.
  * In round 1, at 9f0fc27e6, the line wrapped: 144 px at 1440, and no sideways scroll at 375, 1024 or 1440. So this is a regression from the fix. It breaks EXPERIENCE §1 [M] 12 ("1024 px … work") and BIC-20, so it is a **Must**.
  * **Fix:** put the break outside the nowrap span: `{i ? " " : ""}<span className="whitespace-nowrap">{i ? "· " : ""}<a …/></span>`, with the space as a sibling text in the `<p>`.
  * **Test:** add a line to the pack check: at 375 and 1024 px, `[data-household-tabs]` has `scrollWidth <= clientWidth` and the page does not scroll sideways. That line fails at 112c3fc20.
* Leaving the 200 % zoom column (older code) as a follow-up is right, as round 1 said. No row exists yet in `qa/BUGS.md` or `BACKLOG.md`: file one.
* **Notes (no change asked here):**
  * (a) The m1 lines run only `if` a "The representative" tab exists, and the sp m2 lines only if a background answer is found. If either is missing they pass without checking. Asserting the tab exists would keep m1 from going silent.
  * (b) `s.answered` also counts group cells that are not shown (B155 `inEntry`). If a section's only unconfirmed answers were hidden cells, "confirmed already" would be false. I did not reproduce this, and the round-1 wording had the same gap.

**The two older Agent-view suites: yes, leave them out of this PR, as rows.** I reproduced both on a fresh copy at 112c3fc20 after `POST /demo/load {sample:"configured"}`.
* `tests/runtime/check_qa293_rep_tab_browser.cjs` **7/8**. The city line reads "Toronto From the firm record". The suite expects "not filled from the firm record". That wording (`questionnaire.tsx:948`) and the firm-record data are not in this PR's diff. The checkpoint data went stale against the suite.
* `tests/runtime/check_c611_imm5476_browser.cjs` **5/6**. Strict mode: `getByRole('tab', {name: /^Client A/})` resolves to 4 tabs ("Client A", "Client A's mother", …). This PR only adds a count after each label and does not change the set of tabs. A prefix regex matches the relatives' tabs on main too.
* Neither suite runs on a fresh copy without a loaded checkpoint (both 0/1, "Visitor visa" not offered). Their result depends on what ran before them.
* These are test defects, not product defects. They are not this PR's to fix, and none exists as a row yet: file them for the tech lead.

**Journey (reviewer role), re-scored on the diff:**
* Task 1 · next step ½ (links past the column at 1024) · plain words 1 (m1, m2) · feedback 1 · data 1 · recovery 1 · **accessibility and screen sizes 0** (sideways scroll at 375 and 1024) · speed 1 · visual ½ (line under the card's column at 1440) · trust 1.
* **8/10, fail: one criterion at 0.** It returns to pass when the line wraps again.

**Verdict: Request changes** (Block until 112c3fc20's m3 wrap regression is fixed and its width check is added). m1 and m2 are approved as they are.

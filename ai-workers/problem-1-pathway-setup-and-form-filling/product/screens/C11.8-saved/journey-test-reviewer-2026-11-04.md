# Journey test — C11.8 Saved for IMM 5645 (reviewer, 4 Nov, commit 5afd90be)

This is the reviewer's own journey score for this check. The builder ran scripted journeys only.
Setup: isolated copy `rev_c118` on :4455 (forms ports), live AI off, stand-in launcher, US$0. Chromium (headless; the cloud has no visible browser). Setups:
* the fixture (`POST /demo/load {}`), with IMM 5645 added to Visitor visa through the intake and read;
* the six (Load sample).

My walk script and screenshots are in the session scratchpad, not committed. The journeys below say what I saw.

## Journeys (persona: configuration author unless stated)
1. **Main: "use the saved AI answer for IMM 5645".** Visitor visa › Forms › IMM 5645 "Read: ready for AI drafting" › Draft with AI (opened from the keyboard) › Use Saved (US$0) › Review AI proposals.
2. **Alternate: "I pick Live anyway"**, with every part saved and live off.
3. **Error: one part's saved answer missing** (part 2 hidden): Saved is closed, Live is refused.
4. **Shared form: "use Saved on a form mapped in another combination"** (the six: Spouse or common-law partner › IMM 5406).
5. **Wrong role:** the content reviewer opens `?draft=<IMM 5645>` and posts a start.
6. **Recovery:** pressing Enter twice on Use Saved; Ctrl-C during the pack's induced state.
7. **Across the screen boundary:** Saved run → the AI-proposed field map (review page).

## What held
* **J1.** The dialog opens with focus inside it. Saved is pre-selected: "Saved answers for each of its 4 parts (it was drafted in parts): used together." The button reads "Use Saved (US$0)".
  * 4 Tabs reach the button. Pressing Enter twice creates **1** job.
  * The row shows "Review AI proposals" after **3.9 s**.
  * The review page is badged **Saved** · Completed · US$0.00, with "Saved: no model was called now". It shows 139 form fields (119 mapped) and 9 proposals.
* **Screen sizes and accessibility.** axe (WCAG 2.2 A/AA) found no violations on the open dialog at 400, 1024 and 1440 px. No sideways scroll at any width. No page or console errors.
* **J3.** The dialog says "Saved answers for 3 of its 4 parts only: it waits for Live, so it is never half-filled" and shows the off notice. Start Live is greyed. The door refuses Saved with 400 in the same words, and Live with 409 "AI now is switched off on this copy…". Nothing is queued.
* **J5.** The reviewer sees no dialog. The server answers 403 "Content reviewer (simulated) does not hold the author duty".
* **Data.** One job per start. Cost US$0. The launcher was not asked for Saved. The shared ledger is byte for byte unchanged. p2 is unchanged after two full pack runs.

## Findings
* **Major (J2, trust).** Live chosen with every part saved: "Start Live" is enabled, the dialog says "up to US$5 for this run", and there is no off notice (QA-138).
  * The run completes at US$0 from the saved parts; no model is called.
  * Its page is badged **Live**, and its message says "Live AI draft in 4 parts".
  * The Saved label promised by P-227 is missing.
* **Major (J4, next step).** On the six, IMM 5406's dialog offers Saved, selected, with "Use Saved (US$0)" enabled. The click is refused in a toast: "Being mapped in Express Entry stream: 10 proposals left · a content publisher…". The row's "Waiting on someone else" is the only hint beforehand. 17 shared form rows on the six behave this way.
* **Minor (J6).** Ctrl-C during the pack's restart leaves the copy stopped, not restored. It is safe: no hidden-run server is left serving.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 done on both setups; J7 reaches the review page |
| Next step obvious | ½ | J4: Saved is offered, then refused after the click |
| Plain words | 1 | the part-count words; the refusals in words |
| Feedback and state | ½ | J2: Start Live enabled, no off notice; J4: the refusal appears only after the click |
| Correct data | 1 | one job per double Enter; US$0; 403 for the reviewer; ledger unchanged |
| Error recovery | 1 | J3: never half-filled; refusals in words |
| Accessibility and screen sizes | 1 | axe clean at 400/1024/1440; keyboard path; no sideways scroll (200 % zoom not checked) |
| Speed | 1 | 3.9 s for a 4-part Saved run, with progress |
| Visual quality | 1 | team dialog and components (screenshots) |
| Trust and sources | ½ | J2: a run at US$0 with no model call is badged Live |
| **Total** | **8.5 / 10** | **Pass** (8 or more, no 0) |

Fixes that would raise the low criteria, most valuable first:
1. Label a Live start served entirely from saved parts as Saved (or refuse it), with "no model was called".
2. Close Start in the dialog with the plan's "Being mapped in …" reason.
3. Show the live-off notice when Live is chosen (QA-138).

## Could not test
* A real screen reader; 200 % zoom; a visible (headed) browser.
* An intended user's unaided walk (D17/D20 stay with the founder).
* A real live run: off by rule; the founder's live gate.

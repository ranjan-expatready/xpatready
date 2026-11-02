# C11.8 run trust — journey test, reviewer role, 2 Nov 2026

Commit 8bc48cf1. Own copies :4455/:4456 (fake launcher, no live switch, scratch ledger, US$0), all stopped. Browser: Chrome headless via Playwright (a script, not a visible pane: this environment has none), plus API reads for the data underneath. Not run: any live-on journey (never set the switch).

## Journeys (persona: configuration author)
1. **Main:** Visitor visa › Map 2 forms › Draft setup with the switch off, default Live. Expected: a form with a saved answer starts at US$0.
2. **Alternate:** tick "Draft again" (a paid call is now needed). Expected: the panel says live is off, Start disabled, Saved offered.
3. **Recovery:** choose Saved by keyboard (Space on the radio). Expected: notice goes, Start enabled at US$0.
4. **Error:** a draft fails (stub); open its AI work page. Expected: what went wrong in words, one way out.
5. **Recovery 2:** Retry the failed step. Expected: attempt 2 queued, the page names the latest failure.
6. **Break it:** API start of a live draft with the switch off, with and without a Continue; Retry of a live step (pack AT-3b); Continue by a reviewer/approver/client (403).
7. **Wrong role / double click:** covered by the acceptance pack (AT-6, AT-9) and an idempotency key reused (returns the same run).

## What held
* J1: Start enabled "Start 2 steps, US$0", no notice; the saved-answer run on the API went Done, spent US$0.00, no error line.
* J2: notice "Live AI is off on this copy" plus "Choose Saved (US$0) …", Start disabled (screenshot `off-1440.png`); API twin: 409 in the same words, batch count unchanged.
* J3: keyboard only, notice gone in 1 s, Start "Start 2 steps, US$0".
* J4/J5: "What went wrong: AI drafts the form's field map: stub pass failed: …" with a "Retry 1 failed step" button; after Retry the run shows 2 steps and still names the failure. No sideways scroll at 512 px (200 % zoom of 1024). No page errors.
* Data underneath: ledger unchanged (acceptance AT-13 byte compare), no reserve lines, launcher log has no live call, no batch created by a refused start.

## Findings
* Minor: the notice repeats itself ("Live AI is off…" / "AI now is switched off…").
* Minor: error text carries a trailing newline; the count line stays under "What went wrong".
* Major (tests, not the user path): the spend-guard checks for Continues and their retries, and the cost warning dialog walk, now SKIP in CI; see `review-2026-11-02.md` M1.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | free saved start works; paid start refused with the free choice named |
| Next step obvious | 1 | notice names Saved; failed run has Retry |
| Plain words | ½ | duplicate and "AI now" phrasing; otherwise plain |
| Feedback and state | 1 | notice appears/clears with the choice; run page shows the failure |
| Correct data | 1 | nothing queued, ledger unchanged, latest attempt named |
| Error recovery | 1 | Retry works (free steps), live retry refused in words |
| Accessibility and sizes | ½ | builder's axe on the dialog passes (I re-ran it), keyboard OK, no scroll at 512 px; I did not axe the run page |
| Speed | 1 | all views under 2 s |
| Visual quality | 1 | team look, danger notice and disabled Start clear at 1440 and 1024 |
| Trust and sources | 1 | the AI-off state is said before anything starts; no paid call possible |

**Score: 9.0 / 10 (pass, no criterion at 0).** The Block verdict comes from the test-coverage Major, not the user path. Cannot test: real screen reader, intended user's unaided walk (D17/D20 stay with the founder), any live-on run.

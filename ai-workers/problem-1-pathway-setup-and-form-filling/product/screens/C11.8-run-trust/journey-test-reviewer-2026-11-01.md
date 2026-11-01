# Journey test — C11.8 run trust (reviewer) — 1 Nov 2026, commit 976e8a6a

Copy `rev118` on :4466 with the stand-in launcher, no live switch, US$0. Headless Chrome via Playwright: I acted only by clicks, typing and keys, and read the API and database afterwards. Persona: configuration author (`user-A`) on Visitor visa with the sample loaded. Steps 1 and 2 of setup were finished through the suites' `stepsBeforeForms` helper, and IMM 5707 was added as a line.

## Journeys
| # | Journey (J2 step) | Expected | Result |
|---|---|---|---|
| 1 | Main (J2 10–11): Map 1 form › Draft setup, Live default, saved answer | Start enabled at US$0, no switched-off notice | Held: "Start 1 step, US$0", no notice; the replay run reached `/ai/:id` at US$0 |
| 2 | Alternate: Draft again in Live, copy without the switch | Said before starting; no live start offered | Held: warn notice "AI now is switched off" with the reason; Start "up to US$7.27" disabled |
| 3 | Recovery: switch to a free mode with the keyboard | Free start possible | Held: ArrowRight moves to Replay; Start enabled; Enter starts; US$0 |
| 4 | Error (J2 29): a failed field-map step | What went wrong in words, one next step | Partly: the page has the step row and "Retry 1 failed step", but the run line is still "0 done, 1 failed …" and the step text was a raw stack trace (stand-in launcher) |
| 5 | Wrong door: live start by API with the switch off | 409 in words, nothing queued | Held (acceptance AT-2/AT-9b; removing the rule makes them fail) |
| 6 | Recovery: Retry an old live step with the switch off | Refused at the door | Not held: 201, attempt 2 queued as LIVE, then failed; US$0 |
| 7 | Across screens (#285 m2): job page opened from the guided path › Apply › Preview | The way back is kept | Held: `/preview?form=IMM+5257&c=…` with "Back to the steps" |

## Checks
* axe (WCAG 2.2 AA) on the Draft setup panel in the live-off state: no violations.
* Sideways scroll at 1024 and 400 px, and at 720 px (200 % zoom of 1440): none.
* Console and page errors during the walks: none.
* Data: a refused start leaves no batch and no job (AT-2). The shared ledger is unchanged byte for byte (AT-13). The retry in journey 6 cost US$0 and was not counted as a paid attempt (`cost_usd` null, FAILED).

## Break-it (short)
* Double start: the launch key returns the same run (existing).
* Stale attempt: after a retry, the run view's `error.what` describes attempt 1, not the latest.
* who-can-be runs inherit "Retry the failed step", a link back to the same page.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1, 3 and 7 complete |
| Next step obvious | ½ | The notice says "saved AI answers or rules only" instead of naming Replay saved runs / Stub pass |
| Plain words | ½ | The notice title is repeated in its first sentence; raw step text on `/ai/:id` |
| Feedback and state | 1 | Disabled Start with the reason beside it; the run page updates |
| Correct data | 1 | Nothing queued or reserved on refusal; ledger unchanged |
| Error recovery | ½ | Retry queues a doomed live step; the field-map run line is still a count |
| Accessibility and screen sizes | 1 | axe clean; keyboard path; 1024, 400 and 200 % fine |
| Speed | 1 | Plan and notice within about 1.5 s on the sample |
| Visual quality | 1 | Shared Notice and Panel, aligned (screenshot 03) |
| Trust and sources | 1 | Cost, worst case, spend against the cap, and why live is off, all before Start |
| **Total** | **8.5 / 10** | **Pass** (8 or more, no 0) |

Fixes that would raise the low scores, most valuable first: refuse a live retry at the door (journey 6); show the run's plain error on `/ai/:id` (journey 4); name the panel's free options in the notice.

## Not tested
A real screen reader. An intended user's unaided walk (D17/D20 stay with the founder). A real live run (needs the founder's Go). A who-can-be failure in the browser.

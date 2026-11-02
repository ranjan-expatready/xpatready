# Break report: C4.11 "Draft questions and documents", live wiring part 5a (P-227)

Commit c154cd6c (diff `3c377911..c154cd6c`), worktree `c411-brk`. Isolated copy `brk411` on :4457 (fresh database, sample loaded) with `STUDIO_AI_LIVE=approved` and the fake launcher only: no model call, US$0. For the over-cap case only, the copy was restarted once with `P2_LEDGER_DIR` pointing at a scratch ledger with US$1.00 left. The shared ledger was never written.

Probes: API scripts and Playwright (headless Chromium) at 1024, 512 (1024 at 200 %) and 400 px. Fake saved runs named `…brk-test…` were written to `prototype/p2/runs` and removed afterwards (0 left). The copy is stopped and no code was edited. Paths below are relative to `prototype/studio/`. Screenshots are in `/tmp/claude-0/-home-user-xpatready/3ee89504-25b7-5a91-be6b-51bc34e108c1/scratchpad/shots/` (c411-*.png).

## Findings

| id | steps | expected | actual | severity | code location |
|---|---|---|---|---|---|
| L1 | Draft Live with the fake first pick round (step 6) sleeping 4 s. Press Stop while it runs. | "Stop works before each live call": the checker round of step 6 is not sent, and nothing more is proposed. | The step 6 checker round was still launched (stub, then **live**) after Stop, at a cost of US$0.20. Step 6 ended COMPLETED with "1 pick proposed": a pick reached To review after Stop. The run ends "stopped" with US$0.70 spent. Step 5 does honour Stop (L-held 3). | Major | `api/src/pqr-drafts.ts:157` (`wanted: async () => true`); `api/src/draft-qd.ts:298-299` (Stop is not passed to the C4.7 producer) |
| L2 | Start a C4.7 Live picks draft (fake rounds 3 s each), then right away Draft questions and documents Live on the same combination (step 5 refused at once). | One pre-qualification picks draft per combination at a time (C4.7 break B3, Major), so step 6 says it is already being drafted. | Both went through. Two `pqr_picks` jobs were RUNNING together (peak 2). Each ran its own two paid rounds: 4 live calls, US$0.40. Step 6 said "0 picks proposed". The reverse order is refused correctly (L-held 2). | Major | `api/src/pqr-drafts.ts:140` (with `opts.jobId` the job is updated directly, skipping the lock and the RUNNING check at :141-146) |
| L3 | Live: step 5's first round succeeds at US$0.42, then the checker round's run record cannot be read (fake `run_file` points to a missing file). | The step states its cost, and the run card and audit agree (as in C4.7 break B2). | The step reads "This step stopped on this computer…". The note says "Live, US$0.00". The card shows spent 0, the job cost is 0, and the audit says "(Live, US$0.00)". The US$0.42 already paid is said nowhere. Step 6 in the same case keeps its cost (US$0.37), because its rounds are wrapped. | Major | `api/src/draft-qd.ts:136-139` (Live rounds not wrapped); `:283` (the catch returns no `usd`) |
| L4 | Ledger with US$1.00 left. Open the dialog and choose Live. | Worst case first. When it does not fit, the plan says so and Draft Live cannot start. | The plan reads "At most US$2.06, inside the AI spending cap (US$1.00 left)." Draft Live is enabled. Clicking it brings the server's 409 "Not started: the worst case (US$2.06) is above…". No money is at risk, but the money line states the opposite of the truth. Screenshots: c411-u1-overcap-1024.png, …-clicked-1024.png | Major | `web/src/components/qd-draft.tsx:108`, `:77` (no worst > remaining check) |
| L5 | In the dialog with Saved chosen, add a newer Saved pair, click "Draft with Saved", then click it again. | "Check the plan again" comes with a way to see the new plan. | Both clicks give the same 409 text. The plan shown never refreshes (the 409's `plan` is ignored), so the person is stuck until they close and reopen the dialog. Screenshot: c411-u2-stale-1024.png | Minor | `web/src/components/qd-draft.tsx:54-58`; `api/src/draft-qd.ts:217` |
| L6 | Press Stop with the keyboard while step 5's fake first round is still running (it then fails, and step 5 has a Saved result). | Words say what happened and what it cost. | The dialog shows the card and "Use Saved (US$0)" with no note: a stopped run has `note: ""`. The same happens in L1, where US$0.70 is shown only as the card's figure. Screenshot: c411-u2-stopped-1024.png | Minor | `api/src/draft-qd.ts:321-325` (note only when the run is done); `web/src/components/qd-draft.tsx:66`, `:76` |
| L7 | Draft Live with step 5's first round sleeping 3 s, and retire the combination during it. | Nothing more is drafted for a retired combination. | Step 5 still sent its checker round (US$0.30 total) and put 1 condition on To review for the retired combination. Step 6 then failed with "is retired". | Minor | `api/src/draft-qd.ts:128-140` (retirement checked once, at :219) |
| L8 | Saved step 5: an older complete pair "brk-test", then a newer pair whose first round is unreadable JSON. Read the Saved plan. | The older complete pair is used, as happens when the newest checker round has the wrong shape (held). | `qd_conditions: false`: step 5 is shown as having no Saved result although a complete one exists. The C4.7 producer behaves the same. | Minor | `api/src/draft-qd.ts:108-115`; `api/src/pqr-drafts.ts:89-95` |
| L9 | Code read, plus the probe. The Saved checksum covers the files the plan saw, but at run time steps 5 and 6 look up their Saved rounds again. The Live checksum leaves out the guide's sha (only its length, through `worst`) and the Saved state (probe: unchanged after removing Saved). | The run replays exactly what the plan showed. | A Saved pair written between Start and step 5 or 6 is replayed instead of the one shown. A guide of the same length that changed is not noticed. The window is about one second in a Saved run. | Minor | `api/src/draft-qd.ts:134`, `:200`, `:298` |
| L10 | The guide is unlinked (form page URL removed). Plan Live, then run Saved. | Words fit this dialog. | The Live 409 and step 5's message both end "Then draft its pre-qualification.", which is C4.7's wording, here on the conditions step and on the questions and documents dialog. | Minor | `api/src/pqr-drafts.ts:78` reused at `api/src/draft-qd.ts:131`, `:189` |
| L11 | Code read: a non-HTTP throw in step 6 after its rounds were paid (for example the insert transaction fails). | The cost is kept. | `pqr-drafts.ts:207` ends the job FAILED without `costUsd`. `draft-qd.ts:302` rethrows, the whole run fails with a blank note, and the paid rounds are missing from the card. Not reproduced. | Minor | `api/src/pqr-drafts.ts:207`; `api/src/draft-qd.ts:301-302` |

## What held
1. **Two Live runs at once on one combination:** one 201, the other 409 "is being drafted already" with the running run id. In the browser, starting again after a reload shows the running card, not a second run.
2. **A C4.7 Live draft started while C4.11 step 6 runs:** refused with 409 "already being drafted".
3. **Stop during step 5's first live round:** the checker round's live call is never sent (only its free stub). Step 5 ends CANCELLED and says "This step cost US$0.42 (counted)". The card shows US$0.42 spent. Use Saved is not offered. The audit says who stopped the run.
4. **A paid step 6 first round, then the checker fails:** the step message, the note ("Live, US$0.37") and the card (US$0.37) agree. There is no "nothing was charged", and no Saved offer without a Saved result.
5. **Use Saved only where Saved exists:** with Saved for step 5 only and both Live steps failing, only step 5's message offers Saved. The Saved run then replays step 5 at US$0, and step 6 says "No saved AI answer…". The plan marks step 6 "(none saved: proposes nothing)".
6. **Saved pairing:**
   * A newest lone first round (its checker failed) is ignored, and the older pair is used.
   * A newest checker round of the wrong shape is skipped.
   * The Saved checksum gives a 409 when Saved changes between plan and Start.
7. **Roles:**
   * The approver and the content reviewer can read the plan but cannot start (403).
   * The case officer and Client A get 403 on the plan, Start and the result.
   * With no actor: 401.
8. **No guide:** Live is refused (409) before anything runs, both with no guide and with guide text that cannot be read. Saved still runs and says why steps 5 and 6 did nothing.
9. **Hostile AI answers** (5 000-character, Japanese, Arabic and empty labels, a 20 000-character passage): left out with reasons, and the run ends Done.
10. **Retired combination at plan time:** 409. Live closed: refused before the launcher (suite).
11. **Dialog behaviour:**
    * It offers exactly Live and Saved.
    * Arrow keys switch between them, and Enter starts.
    * Focus stays in the dialog.
    * The result is announced by the run card (`aria-live` section and `role=alert`).
    * "Use Saved (US$0)" by keyboard moves focus to the Saved radio, which is checked.
12. **Layout:** no sideways scroll on the plan or the result at 1024, 512 (1024 at 200 %) and 400 px, and Draft stays visible.
13. **Reload mid-run:** the top-bar chip shows "Drafting questions and documents · step 5 of 7".
14. **Plan speed:** the plan answers in about 60 ms (Saved and Live).

Not tried: 100 programs and 400 combinations against the budgets (the plan and steps are per combination), and spend-cap races across two combinations, because the fake launcher does not reserve in the ledger.

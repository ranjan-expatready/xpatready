# C9.1 "Draft with AI" on a held new edition: break report (breaker, 3 Nov)

Commit 459bcccaa on `claude/pensive-brown-a2iw66`. Isolated copy `brk91` on :4441: first with live AI off, then `STUDIO_AI_LIVE=approved` on the fake launcher (no model call, US$0). Setup as `tests/check_c91_impact_api.ts` setup(): IMM 5476 11-2025 held over the 2021 edition on Visitor visa, 23 new or reworded boxes, offer "about US$0.43 · at most US$2.00". Fake costs below (US$0.11 to US$0.60) are scenario values. Lines are at 459bcccaa. The spend ledger (`.tools/p2-ledger/spend.jsonl`, md5 67c824a1…) is unchanged. Copy stopped, its database dropped, everything I wrote removed.
Note: other agents were working in this same tree at the same time. A builder edit (uncommitted, "Review Major 1") already addresses M3. Another agent's C9.1 check removed the shared fixture files in the middle of one of my steps (see m7).

## Blocker

**B1. A server restart during a live run reopens the one paid attempt; the second paid run starts at once.**
Steps: fake round with `sleep_ms: 20000`. POST `…/impact/draft {mode:"live",expected_worst_usd:2}`. After 4 s, `isolated.sh brk91 4441 restart …`. POST the same body again.
What happened: the start-up sweep (`sources.ts:120`) set the job to FAILED with `cost_usd` NULL. The fake launcher had already logged the first live call. The paid-once query (`impact.ts:138`, `costUsd: { gt: 0 }`) does not count a NULL cost, so the second click ran a full paid draft and checker (4 more launcher calls, COMPLETED, US$0.22).
The interrupted round's job file was also left in the tracked folder `p2/jobs/` (`…-impact-2d69ae6ecab9-e986da59.json`), because the `finally` never ran. I removed it.
What should happen: a live job that ended without a recorded cost counts as a paid attempt at its reserved worst case (as `rounds.ts` says for "stopped"). The comparison is then refused like any other failed paid run. Restarts are routine here: the demo redeploys itself on merge.

## Major

**M1. A demo reset erases the "one paid attempt per comparison" record.**
Steps: scenario `otheredition`. A live click fails at US$0.13. A second click is refused ("already had a paid AI run"), which is correct. Then POST `/demo/reset`, upload the 2021 PDF, load sample six, and live click again.
What happened: the same part (sha 380053…) was paid for again. The fake log shows a second `live`. The rule is kept only in `drafting_job` rows, which the reset deletes. The ledger and run records, which outlive the reset, are not consulted.
What should happen: the paid-attempt check reads something that survives a reset (the ledger or the run records for the part checksum), or the reset keeps those rows.

**M2. With a saved run present, the page and the API still offer and run a paid call, and the words say otherwise.**
Steps: write the saved run of this comparison (`c91-saved-run.ts write`). The review then says *"A saved AI run of this comparison is here: Draft with AI uses it at US$0."* Live click.
What happened: the API launched both rounds live and charged US$0.22 (`impact.ts:95`, `:109-160`). The page shows "Use the saved AI run (US$0)" and an enabled priced "Draft with AI (about US$0.43 · at most US$2.00)" side by side (`review-items.tsx:311-312`). Clicking the button whose name the text says is US$0 spends money.
What should happen: while a saved run of exactly this comparison exists, live is refused (or the priced button is hidden), and the words name the right button.

**M3. A replay pairs the draft round of one saved run with the checker round of another.**
Steps: write a draft of run X (`…-brkX-live-20261103t090000000z…`) and only a checker of run Y (`…-check-brkY-live-20261103t110000000z…`) for this part, with different facts. Then replay.
What happened: the job recorded `draftRun` from X and `checkRun` from Y. The message says "4 proposals on To review, read by both rounds". `impactContext` (`impact-ai.ts:110`) sets no `replayPair`, unlike `pqr-drafts.ts:127`, `draft-qd.ts:121` and `form-masters.ts:169` (rule from C4.7 break B1).
What should happen: the checker round is taken from the draft's own run, or the result is labelled as coming from the draft round only. (Uncommitted builder edit in the tree adds `replayPair`; not at 459bcccaa.)

**M4. A set-aside edition's AI proposals stay on To review and can be accepted into the library.**
Steps: replay (3 proposals). The approver sets the edition aside (`/intake/held/:id/reject`, user-B): the item is now DONE/refused and draft returns 409.
What happened: To review still says "3 proposals waiting: 1 ready to accept" under `edition:IMM 5476 (11-2025)`. `POST /review/proposals/decide {action:"accept"}` landed `representative.email` as a DRAFT library field, sourced from a file a person had refused.
What should happen: setting the edition aside withdraws (or blocks) the proposals of its impact run.

**M5. Accepting an AI proposal does not map its box: the AI work never reaches the new edition.**
Steps: replay. Accept the Ready proposal (box `SectionA[0].givenName[0]`). Accept the edition (`/impact/accept {expected:53}`).
What happened: the result was `carried 0, for_a_person 53`. The box's `form_field_map` row is `unresolved`, "Reworded … left for a person". The proposal only adds a library field; nothing ties it to the box (`impact.ts` accept builds every changed box as `unresolved`).
What should happen: the brief (`design/c91-ai-row-2026-11-02.md` §3) says field-map proposals per changed box, which a person accepts per box. An accepted proposal should fill its box's draft map, or the offer should not promise proposals "for the 23 boxes".

## Minor

- **m1. A request with no `mode` is a paid call.** `impact.ts:109` defaults a missing mode to `"live"`. `{expected_worst_usd:1.996}` alone launched both rounds (US$0.22). Missing mode should be refused like an unknown one.
- **m2. After a paid attempt that cannot be repeated, the page still offers it.** After the US$0.12/0.13/0.60 failures, `live.open` stays true and `drafted` null. The priced button stays enabled and the text still says "nothing runs until you click" and "Draft with AI runs it". The failure text itself says "…or Draft with AI runs again" (`impact-ai.ts:68`), then the next click is refused. An answer naming an unchanged box gets the generic "did not have the expected shape" (`rounds.ts:215`). `IMPACT_AI_WORDS.outside` (`impact-ai.ts:75`) is never used.
- **m3. Reload mid-run shows nothing running.** During an 8 s fake round, a reload shows the priced button enabled and no "running" state (`drafted` reads COMPLETED jobs only, `impact.ts:90`). A click then gets "already running" (the server held).
- **m4. A failed paid run leaves no audit event.** After the US$0.13 failure, `audit_event` has nothing for it. Only the success path logs (`impact.ts:174`).
- **m5. Two cost plans for one run.** The screen says about US$0.43 · at most US$2.00 (2 × the US$1 round budget). `tools/c91-impact-job.ts` and the commit message say usual ~US$0.27, worst US$1.22. The Go is given on one number and the person sees the other.
- **m6. A launcher that dies with no run file is "nothing was charged" and can be retried without limit.** Scenario `launcherdies` (exit 1, "socket hang up after request sent"): cost 0, and every click launches again (2 live launches). `rounds.ts:177` trusts the missing record. This depends on what the real `p2/launch.ts` leaves; not checked with a real launch.
- **m7. Test fixtures pose as real saved runs in the shared `p2/runs`.** `c91-saved-run.ts:25` writes fixed-name `-live-` records with `caller:"live"`. While they exist, every copy, the demo :4400 included, shows Saved and replays the test answer. Parallel checks delete each other's files: mine disappeared mid-step while `check_c91_impact_browser.cjs` ran on :4448.
- **m8. Opening the review writes to the source tree.** Any studio reader's GET writes `p2/parts/<part>.json` (`impact.ts:85`).

## What held
- Live is refused without the switch (409, in words, US$0, no job). Only an author drafts: user-B, C, O, R and P get 403. An unknown or missing actor gets 401. `LIVE`, `null` and `"replay "` get 400; non-JSON gets 400.
- With live on, `expected_worst_usd` as `"2"`, `"2.00"`, `null`, `-2`, `1e308` or `[2]` is refused with 409 before anything launches. Random and non-UUID ids get 404; a set-aside id gets 409.
- Concurrency: 6 parallel replay clicks made 1 job and 3 proposals. A live click during a run got "already running". A UI double-click made 1 job.
- Paid once: a failed draft round (another edition, an unchanged box, or a timeout) makes no checker call, records its cost, and a second click is refused. Setting the edition aside and uploading the same file again is refused too (the check is keyed on the part checksum).
- Saved answers naming an unchanged box or another edition are never replayed ("No saved AI run").
- Guard (`p2/guard.ts` admitInput): a part with a planted caption, an extra top-level or field key, a changed summary, a duplicate field, part 0 of 1, or a part as parent is refused. The real part tampered on disk is refused against the job's checksum. Without a pinned checksum the guard admits a part of unchanged boxes or of the 2021 inventory; the job checksum is the only stop, and it held.
- An IMM 5476 PDF with a planted instruction is held for source verification and never reaches impact or draft (409).
- Every proposal waits for a person; nothing is auto-accepted. The library edition is unchanged until accept.
- UI: the priced button is reached by keyboard in 20 Tabs with a visible focus ring. At 1024 px there is no sideways scroll and axe is clean. At 200 % zoom (512 px) there is no page overflow. The one axe hit there (`scrollable-region-focusable` on the comparison tab panel) was already on main.
- The review answers in about 0.43 s.

# Progress and road to M4 — 11 Nov 2026, 07:4x IST (Lead 10, series 2)

For the founder. Every code is followed by what it is for, in plain words. Numbers come from GitHub and the plan meter at the time stated. Sizes are builder-sessions (one builder taking one small item to a merged, reviewed change), estimates loosely held.

## 1. Where we are, in one line
M3 is finished (29 of 29 capabilities proven by qa). We are now in the **Bake (M3.5)**: making what works feel like one product and making new pathways a matter of data, not code. About **9 of ~56 Bake sessions are done** after one night.

## 2. Last night (22:54 IST 10 Nov to 07:30 IST 11 Nov): 9 merged
| PR | Code | What it is for |
|---|---|---|
| #1501 | B164 | A safety test: fails if anyone writes a pathway's name into engine or API code, so pathways stay data |
| #1505 | M3-S1 | A linked application (e.g. the sponsor's sponsorship) carries its own fees, set as data and cited from IRCC's fee list |
| #1507 | M3-S5 | Whether a form is online-only (answer sheet, no PDF) now comes from the form library, not a list in code |
| #1506 | BK-2 | Every fold-out section (33) shows the same arrow, so people see there is more inside |
| #1509 | BK-1 | qa's baseline of the journey: 14 open Majors, 4 extra person changes without a hand-off button, today's dead ends |
| #1510 | Expert pack | The immigration expert's review pack: Visitor visa answer key, Study permit content, RCIC practice checklist, all cited (P-455 (2)) |
| #1504 | Pipeline 4a | Tests are picked by what a change touches, including the checkpoint's hidden links (caught a past miss) |
| #1502 | Pipeline | Test timings refreshed so CI parts finish evenly (SHARDS stays 6 by your choice) |
| #1503 | Records | Yesterday's decisions and the Bake plan saved |
Main stayed green all night; no merge batch thrown away.

## 3. Running now
| Lane | Code | What it is for | State |
|---|---|---|---|
| Screens (cloud) | BK-3 PR 1 | One frame for every screen with a "where am I" line and a way back | building |
| Forms (cloud) | BK-10 | Which forms a pathway needs comes from data, not code (needed before Study permit can prove "no code") | building |
| Engine | M3-S2 (#1513) | A configured answer adds an extra filing (e.g. a child's own application) | draft; waits for your click on "finish M3-S2" |

## 4. The sequence (what comes after what, and why)
1. **M3 — done.** The 29 capabilities work on the demo.
2. **Bake (M3.5) — now.** Two tracks, both needed for its exit (P-447 to P-449):
   * *Track 1, one product (cap 24):* BK-1 baseline ✔, BK-2 arrows ✔, BK-3 one frame (4 PRs), BK-4 sign in once by role with hand-off buttons, BK-5 start page with three starting points, then the journey's Major bugs (QA-237/239 conditions that block other pathways, QA-276 release refusal, QA-234, QA-275, QA-165/318 mandatory boxes, QA-315, QA-355), walk 1, fixes.
   * *Track 2, generic engine core (~16):* B164 ✔, M3-S1 ✔, M3-S5 ✔, M3-S2 (running), M3-S3 waivable checklist line with a reason, M3-S4 never-waivable blocking line, BK-8 biometrics ages per pathway, BK-9 shared-filing changes on any pathway, BK-10 form rules into data (running), BK-11 fill-trial status in the release, BK-12 sample case as a setting, BK-13 Study permit by data (the proof).
   * *Exit:* qa's fresh reader, then the co-founder cold, walk the whole journey with one sign-in, no dead end, no help, 0 open Majors; and Study permit reaches filled, checked forms with data changes only.
3. **M4 Track A — every pathway by set-up on screens.** What the Bake leaves out by decision (P-448, P-449): the seven rule tables moved onto library screens; relatives and repeating groups; a content publisher sets up a pathway on screens alone; the other pathways (work permit with LMIA first, as the cheapest) brought to full cases; fill trials on every form.
4. **Production-grade running and hardening** (internal tool, P-450): the off-journey Majors (e.g. QA-278 many cases at once, QA-383 IMM 5710 country choice), job queue and file storage, splitting the five busiest files, tests on Playwright's own browser. Real users, tenants and backups stay the team's (P-335, P-455 (3)).
5. **M4 Track B — the Chrome extension** (P-245, BACKLOG L5: E1 screen reader and AI match, E2 changed-screen detection, E3 fill with the representative's check, E4 navigation helper, never credentials, E5 vision fallback with masking, E6 screen maps). First a counsel question: do IRCC's terms allow a portal extension ("Unconfirmed: no counsel").
6. **Later, by decision:** the employer's side of LMIA (a sample employer combination, L-SA5); single-screen polish and wording cuts (~18-22), decided at the Bake's cap walk (P-447 (3)).

## 5. Hour by hour from now
| Time (IST) | What happens |
|---|---|
| 07:30-10:00 Wed 11 | BK-3 PR 1 and BK-10 build and review; if you click "finish M3-S2", it finishes #1513 (~1 session) |
| ~10:00 | Weekly plan ~91%: I tell every lane to push and stop |
| ~10:30 | 93%: all pushed; lanes pause (P-431, your P-455 choice) |
| Wed-Sun | No builder work (no budget). Free work: you read the expert pack and book the expert when ready; I answer open questions and shape the next rows |
| Sun 15, 22:30 | Weekly reset: three lanes restart on the Bake order above |
| Mon 16-Fri 20 | BK-3 PRs 2-4, BK-4, BK-5; M3-S3, M3-S4, BK-8, BK-9, BK-12; BK-11, the journey Majors |
| Sat 21-Tue 24 | BK-13 Study permit by data; walk 1; fixes; the co-founder's walk within 24 h of walk 1 passing |
**Bake forecast: 21-24 Nov IST.**

## 6. How we are doing (honest)
**Going well.** 9 merges in one night with main green and no thrown-away batch. The quality gates are catching real problems before merge: the M3-S2 breaker found 5 Majors and the reviewer 2 more, all fixed with tests. Fees are cited from IRCC with page, quote and date. CI picks tests more accurately.
**What limits us.**
1. **The weekly plan, not the builders.** 66% → 87% overnight for ~9 merged PRs: about **2.4% of the week per merged PR** (Lead and qa included). A full week buys roughly **30-35 PRs**. The Bake has ~47 sessions left, so it needs most of next week.
2. **Cloud builders cannot chain rows.** Each new row needs a fresh session, and a scheduled check can only leave you a card. Overnight that cost hours. Fix without changing rules: before you sleep, start the next two or three cards (I keep them ready).
3. **Rows sized too big.** M3-S2 hit the 400k context limit and split. I will shape the next engine rows smaller (one rule per PR).
4. **Mac housekeeping.** Four leftover test copies fill the Mac's slots; my sandbox cannot stop them (one Terminal command each from you, or leave them: cloud builders don't need them).
5. **Fable.** Twice the Fable window rose with the all-models window, so Fable probably counts against the same weekly limit. Use it for planning only, as you chose.

## 7. Size of the road to the Chrome extension
| Stage | Sessions (est.) | At ~30-35 per week |
|---|---|---|
| Bake remaining | ~47 | done ~21-24 Nov |
| M4 Track A (every pathway by set-up) | ~38-63 | ~1.5-2 weeks |
| Production running and hardening | ~30-50 | ~1-1.5 weeks |
| **Before the extension** | **~115-160** | **about mid to late December** |
| M4 Track B (Chrome extension) | not sized yet | after the counsel answer |
The one lever that changes these dates is budget (paid extra usage or a second account); quality gates stay either way. M4 Track A has no designed rows yet: it needs a counted plan with you before the Bake ends (P-450 (2)).

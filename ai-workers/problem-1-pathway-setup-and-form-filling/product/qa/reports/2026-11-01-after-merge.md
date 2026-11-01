# qa after-merge — 1 Nov 2026, main 52768cd2

**Scope:** everything merged since qa last tested (bcd482d3, 30 Oct) that touched the app: #139 (C1 Before forms), #153 (C1.8 copies), #146 and #145 (X5 form library fill and paging), #147 (Forms tab refresh), #155, #143, #144 (test waits), the 31 Oct screens fixes #111, #117, #118, #119, #120, #135, #136, #137, and the earlier forms and runtime work #112 (channels slice 1, P-175 live AI off, QA-90 shared ledger, P-179 cost warning), #108 (W1 setup card v4), #121, #122, #127, #128. Lead-only PRs (#104–#110, #114, #115, #123–#126, #130, #132, #134, #140, #141, #149, #150, #152, #156, #157, #161, #183) change no app code.
**How:** isolated copies qa_am :4471, qa_pr :4472 and qa_st :4473 (isolated.sh, no STUDIO_*_LIVE, fake launcher; US$0). The shared demo :4400 does not run in this cloud copy, so it was **not walked** (it runs on the Mac).

## Verdict
**Ready, with one Major to fix.** Every merged change does what its PR says, through the screen and underneath. Both open Criticals are **closed**: QA-100 (live AI off) and QA-90 (one ledger). One new **Major Conflict (QA-119):** the combination page shows two different "next steps" since Before forms landed.

## Suites (underneath)
* **Nightly on 25aaf574** (the last app commit; #183 and #161 after it are tooling only): every suite passed except `check_cost_warning_browser.cjs` (a 30 s wait timed out). #183 has since quarantined it from PR checks (P-205). Here it passed **26/26 twice**, so it is unreliable, not broken.
* **Re-run here on 52768cd2:**

| Check | Result |
|---|---|
| `check_w1_before_forms_browser.cjs` | 23/23 |
| `check_c18_copies_browser.cjs` | 12/12 |
| `check_c18_copies.ts` | 28/28 |
| `check_forms_tab_refresh_browser.cjs` | 7/7 |
| `check_cost_warning_browser.cjs` | 26/26 ×2 |
| `check_forms_s4_library_browser.cjs` | 95/95 |
| `check_screens_qa_1029_browser.cjs` | 58/58 |
| `check_setup_checklist.ts` | 60/60 |
| `check_forms_x5_library.ts` | 65/65 |
| `check_official_pages.ts` | 42/42 |
| `check_p2_shared_ledger.ts` | 9/9 |
| `check_w1_structure_browser.cjs` | 137/137 on a fresh copy |

* `check_w1_structure_browser.cjs` failed 2 steps once, on a copy that other checks had already used: "empty after Reset", then a timeout. Reset itself empties correctly (`/demo/reset` leaves 0 rows, checked). It is the check's own dependence on a fresh copy, not a product fault, so no row was logged.
* **Graph:** G1 0 · G2 0 · G3 2 · G4–G6 0. The two G3 are attachment routes that predate these PRs (the #146 reviewer saw the same two). No new gap.
* **Coverage (c8): not run this time.** Context budget went to the Criticals' retests; it is first in the next after-merge.
* `decision-impact.sh`: no decision without a row (the new P-199 to P-205 are workflow, exempt).

## What works (tested like a person, then underneath)
* **C11.10 Before forms (#139), walked at 400, 1024 and 1440 px.**
  * It is the first block on the Forms tab: Official pages and Who can be in this application, with the checklist's marks.
  * No sideways scroll; axe clean at 1024 px.
  * Tab from the tab list reaches it before any form line.
  * Questionnaires links to the moved people card.
  * Screenshots: `2026-11-01-after-merge/before-forms-*.png`.
* **C1.8 copies (#153).**
  * API (`tests/qa/check_qa_am_1101_api.ts`, 9/9):
    * "2" as text, -1 and null are each refused on the field with "Copies is a whole number from 1 to 9."; 2.0 is accepted as 2.
    * Two saves at the same moment from one revision give one 200 and one 409, and the winner's value is kept.
    * Another role gets 403. The draft snapshot carries the copies.
  * Screen at 400 px (`tests/qa/check_qa_am_1101_browser.cjs`, 23/23 twice):
    * The drawer fits the width; letters are refused on the field and nothing is saved.
    * The row says "3 copies each", the database holds 3, and an `audit_event` line records the change.
  * Copies are stored for setup only; Preview and cases do not use them yet.
* **X5 form library (#145, #146).**
  * Fill from IRCC's list: 221 new + 9 already = 230.
  * The list states its count in a live region ("Showing 50 of 23…"); axe clean; no sideways scroll.
  * **The reviewer's Major on #146 does not reproduce.** I set IMM 5488's edition to (01-2019), then moved the index date 2026-01 → 2024-10. It still shows "newer_file": the printed edition month is compared, not the last date read.
* **To review and Review and release (#118, #119, #120, #137).**
  * To review at 1024 px: no sideways scroll, axe clean, and a link reached by Tab shows a focus ring.
  * /release has the title "Review and release · Product Studio" and the matching heading.
* **QA-100 retest (P-175, #112).** On a copy started without the switch:
  * The finder plan says `live.on: false`, with the words "AI now is switched off on this copy (no paid AI call can start here)…".
  * A live start is refused 409 with the same words, before any process starts. US$0.
  * **Closed.**
* **QA-90 retest (#112).**
  * The ledger is untracked and resolves to the main copy's `.tools/p2-ledger`.
  * Two processes reserving at once count against one cap.
  * **Closed.**
* #127 (barcode download serves the validated copy), #128 and #121 (cost warning), #122 (Used-by count, official-pages confirm), #108 (setup card v4): covered by the nightly run on 25aaf574 (r1d 80/80, cost check 98/98, official pages 42/42, setup card 42/42). I did not walk them by hand this run.

## Bugs (new)
* **QA-119 · Conflict · Major · C11.10 · screens.**
  * On the combination page, the header box says "Next step: Add 1 form from the library". It reads the catalogue's `nextAction`.
  * Before forms and the card say "Next: Choose the checklist page". They read the setup checklist.
  * All five sample combinations in setup disagree. P-161 asks for one next step, driven by one checklist. The W1 plan says the header is replaced in slice B, but until then both show.
* **QA-118 · UX · Minor · C1.8 and every drawer · screens.** Pressing Enter in Copies (or in any drawer field) does not save. No drawer in the app is a `<form>`.

Open after this run: 0 Blocker · 0 Critical (QA-100 and QA-90 closed) · Majors include QA-119 · Minors include QA-118. Full rows: `qa/BUGS.md`, `qa/reports/bugs-open-detail.md`; the closed rows are in `history/qa-bugs-closed-2026-11-01.md`.

## Could not test
* The shared demo on :4400 (it is not in this cloud copy).
* Live AI runs (never set the switch here), so #147's settling AI draft was checked only through its own check (7/7).
* c8 coverage.
* QA-73, QA-74 and QA-113: their screens parts merged (#118, #119), and the builder check 58/58 passes, but I did not walk a release with list warnings. They stay open for a retest walk.

## Questions for the Lead
1. QA-119: should the header box take the checklist's next now, or does it wait for slice B and F2? Until then a person sees two different next steps on one page.
2. `check_w1_structure_browser.cjs` needs a fresh copy (it fails on a reused one). Should the suite runner always give it one, as it does in CI?

## Suggestions
* Make each drawer a `<form>`, so Enter saves (QA-118). *Later* · *Capability*.
* Have Preview by person say "2 copies" when a line asks for more than one. *Later* · *Capability*.

# Runtime builder handover (1 Nov, cloud session; replaced by the tech lead)

All work is on branch `claude/festive-lovelace-jx2dwb` (this session's only push branch). It merges three pieces of work that are
**not yet in any PR**. Each one was built on PR #113's head and waits for #113 to land. Take each piece from its own commits; the
two merge commits at the top only gather them in one place. US$0 throughout; no live AI switch was set by hand.

## Blocker: #113 cannot merge
Mergify took #113 out of the queue at 18:10 UTC on 31 Oct for a conflict in `prototype/studio/tests/check_w115_slice2_browser.cjs`
with #155 on main. Both added waits after the same Undo. Main's version holds #113's wait and four more, so **the fix is to take
main's file**. Another session owns #113, so this session did not push to it. The same conflict appears when main is merged into
any branch below; resolve it the same way.

## 1. #116 (DV-bb-9, DV-bb-8, DV-d1-3, P-193): ready to push once #113 lands
* Commit `419948f8` (local branch `local/116-pre`) = #116's head `4e373f4c` + #113's head + main at `72d18fa0`.
* The tech lead's red suites, re-run on it: `check_qa91_who_can_be_run` 21/21 and `check_qa91_who_can_be_run_browser` 10/10. Both were
  red only because #116 lacked #113's M1 fix.
* `check_runtime_r1c` fails one check: the person-tab budget, 220–350 ms against 200 ms at load about 1.8 on 4 cores. **This is not
  #116's code.** #113's new version of the test fails the same way against main's own server (248 and 352 ms). Main's old version
  passes on that server (146–170 ms). So the miss comes from #113's new way of measuring (a fresh page load each time, best of
  three). Question for the tech lead: keep the 200 ms budget with the new measurement, or measure the tab as before.
* Still to do: merge main again; get a fresh reviewer Approve on the new head; push to `claude/runtime-devin-fixes`; update its body;
  add `review: approved`.

## 2. F7 "Demo reset and sample": X9a and X9b (commits `c4a7f412`, `446a4d82`, `844905d5`)
* **X9a, row 1:**
  * The configured checkpoint uploads an off-list copy of IMM 5476 (11-2021): the official bytes plus one comment line, labelled
    Sample. This is the same pattern as `forms-demo.ts`'s "copy saved from an email".
  * The author records its canada.ca page and the Approver approves it (P-80). The re-intake finds it older than IMM 5476
    (11-2025), and the Approver sets it aside. Row 1 now reads "done"; nothing is left on To review.
  * Question for the tech lead: the plain 2021 file could not show this. It is on the approved manifest (P-32), so the intake
    only keeps it aside as an older edition, which no one can approve. Keep the re-saved copy?
* **X9a, K1 words:** already fixed on main by 72deaf61 (#118 review). `check_c10_1_configured` now proves it on row 10.
* **X9b m6:**
  * `formSigners` in `engine/render.ts` is now the one "who signs" rule, used by both render and the Documents tab
    (`sources.ts signedScanLines`).
  * A 180-case parity check sits in `check_c3_11_signed_scan` (32/32). It fails 2 on the old code.
* **X9b m7:** the new suite `check_x9b_ai_now_refused.ts` (6/6) starts with the fake launcher alone and proves AI now is refused.
  With `LIVE_APPROVED` widened to `… || usesFakeLauncher()` it fails.
* **Reviewer:** Approve on `446a4d82`, see `review-f7-x9.md` (9/10). Its Minors m1–m3 are fixed in `844905d5`; that commit still
  needs a short re-review.
* **Full run:** 106 pass. The only failures are qa91 ×2, from `ps -E` being macOS-only on Linux; 4e373f4c (#116) fixes this.

## 3. F6 slice 1: pre-qualification picks by rules (C4.7 with C4.2 and C4.8) (commits `63e9eff6`, `80b0fdee`, `903986c7`)
* **Propose:** `POST /combinations/:id/pqr/picks` runs `pqrPicksByRules` as a LOCAL run that costs US$0. Each pick goes on To review
  through `insertProposals`, titled `Ask "…" (person) in pre-qualification`.
  * The proposer does not repeat a pick that is still waiting or that a person has already decided.
  * It takes one lock per combination, so two clicks at once add each pick once.
* **Accept:** the queue's `pqr_pick` lander calls `acceptPqrPick`. It ticks the fact in the draft; no library item is written and
  no second person approves (P-76).
* **Undo:** restores the author's earlier draft row exactly. It refuses once a person has changed the tick since, and points to the
  Questionnaires tab.
* **Web:** Questionnaires › Pre-qualification gets "Propose picks from the rules". On To review, the item is called a
  "Pre-qualification pick", and a non-author's Accept is disabled with words.
* **Tests:** `check_f6_pqr_picks` 24/24 and `check_f6_pqr_picks_browser` 27/27. Full run: 107 pass. The only failures are qa91 ×2
  (`ps -E`) and r1c (see #116 above).
* **Reviewer:** r1 Block (two Majors), then r2 **Approve on `80b0fdee`** (8.5/10), see
  `screens/W1-questions-and-documents/review-f6-slice1.md`. `903986c7` only adds the review record and one wording fix.
* **Deviation, said here and not silent:** the tech lead asked for F6 from origin/main, avoiding #113's files. C4.7's path has to
  change `fact-sources.ts` and `proposals.ts`, which #113 also changes, so this slice is built on #113's head.
* **Follow-ups:**
  * the "pqr subset of sqr" rule key, "(The application)" in titles, and the same long "Why a person looks" sentence on every row
    (all from `engine/sources.ts pqrPicksByRules`);
  * the To review table at 1024 px;
  * any reviewer can reject a pick, which then is not proposed again (fits P-76; founder's preference?).
* **Next for F6:** C4.1 beyond what is built (adding and ordering questions per person) needs an agreed board first: v2 notes :61
  mark section order "Not built here". Live AI picks (W1-10 step 7) need the founder's Go (about US$10, P-131).

## Copies on the cloud machine (lost when it is reclaimed; everything that matters is in this branch)
`/home/user/f7`, `/home/user/f6`, `/home/user/w116`, `/home/user/wmain`. The Postgres cluster stops when the container restarts;
start it again with `pg_ctl` (see `studio/start.sh` line 10).

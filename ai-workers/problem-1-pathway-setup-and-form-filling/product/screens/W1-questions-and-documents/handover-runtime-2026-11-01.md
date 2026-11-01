# Runtime builder handover (1 Nov, second cloud session)

Context passed 50% (P-198), so this records where F6 stands. US$0 throughout; no live switch was set by hand. The previous
session's note is `screens/W1-reset-and-sample/handover-runtime-2026-11-01.md` on branch `claude/festive-lovelace-jx2dwb`.

## Open PRs from this session
| PR | What | State |
|---|---|---|
| #197 | F6 C4.2: an author marks pre-qualification questions by hand (test `check_c42_marking_browser.cjs`, 32/32; the old "no question asks it" fail check was skipped silently) | reviewer Approve on d487d426, labelled |
| #201 | F6 C4.8: a questionnaire change goes out only in the one release; section choice refuses a retired combination and an unknown section (`check_c48_sqr_release.ts` 22/22) | reviewer Approve on cdbacbff, labelled |
| #195 | F6 C4.1 concept draft (draft PR): section order per combination, title, "Ask it in…" on a gap | **founder's early look needed**; three questions in the PR |

## Ready, waiting only on #113
Each branch is built on main 143a2301 plus #113's head 7e4ea58c, with main's `check_w115_slice2_browser.cjs`.
* **F6 slice 1, PQR picks by rules (C4.7):** branch `claude/runtime-f6-pqr-picks` (c5e44b51).
  * It is the previous builder's 63e9eff6, 80b0fdee and 903986c7, cherry-picked cleanly.
  * On this base: `check_f6_pqr_picks` 24/24, `check_f6_pqr_picks_browser` 27/27.
  * Its diff touches `contracts/`, so run-suites selects ALL: run the full set once on the final head.
* **F7 X9a, X9b:** branch `claude/runtime-f7-x9` (a1142acd).
  * It is c4a7f412, 446a4d82 and 844905d5, cherry-picked cleanly. 844905d5 still needs the short re-review.
  * Keep the re-saved IMM 5476 (2021) copy. The plain 2021 file is on the approved manifest (P-32), so the intake only keeps it aside as an older edition, which no one can approve; it cannot show held-file approval.
* **#116:** branch `claude/runtime-116-prep` (32cf4bf2) = #116 + 419948f8 + main 143a2301.
  * Once #113 is on main: merge main again, re-run `check_qa91_*` and `check_runtime_r1c`, get a fresh reviewer Approve, then push to `claude/runtime-devin-fixes` and add the label.
  * The r1c person-tab budget miss comes from #113's way of measuring, not from #116's code: say so in the PR.

## Steps once #113 merges
For each branch above:
1. `git merge origin/main` (no conflict is expected, since #113 is in it).
2. Run its suites.
3. Have the reviewer check the new head.
4. Open the PR (for #116: update it) and add `review: approved`.

## F6 still to build after that
* **C4.6:** Preview by person shows "PDFs to sign".
  * It needs #113's signed-scan lines (C3.11), so build it on main after #113.
  * Also walk the per-channel groups when a form's channel changes.
* **Fixes the reviews found:**
  * the bulk toast reads "Pre-qualification on **on** 1 question" (`questionnaires.tsx:357`, one of #113's files);
  * `engine/validate.ts:81` shows a section's system name on Review;
  * the Review change line names a section by its description, not its title;
  * a section DELETE that removes nothing still writes a history line;
  * the Minors listed in #197 and #201.
* **The previous builder's follow-ups, in `engine/sources.ts pqrPicksByRules`:**
  * the "pqr subset of sqr" rule key;
  * "(The application)" in titles;
  * the same long "Why" sentence on every row.
* **C4.1:** after the founder answers #195.
* **Live AI picks (C4.7 AI):** need the founder's Go (about US$10, P-131).

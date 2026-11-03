# Quarantined suites — evidence and status on main (3 Nov)

P-291, next task (2) after I1. The list lives in `tools/run-suites.sh` (`QUARANTINE=`, P-205). A quarantined suite is
skipped in PR and merge-queue checks, so one unreliable test cannot stall every batch; only the nightly full run on
main still runs it. Status checked on main 3b0d4d64 (3 Nov 09:52 UTC) by an infra cloud session; US$0, live AI off.

**How "does it still fail on main?" was checked**
* **Nightly full runs on main** (nightly.yml, the founder's Mac), read from the job logs. The last five are run
  41430490799 (2 Nov 10:38, ae5a5605, green), 41425132384 (09:59, red before the suites ran, so no rows),
  41381724752 (03:11, 54019473), 41365145720 (00:04, b1a662cd) and 41254287192 (31 Oct 23:52, 25aaf574). The 3 Nov
  02:43 nightly was cancelled.
* **Three fresh local runs of each suite** on main's app code, each on a new isolated copy, one at a time on an idle
  4-core cloud machine with a fresh web build.
* **Limit:** every recorded failure happened under load (a CI part running ~65 suites, or a busy batch). Idle passes
  are weak evidence for a random failure: they show the suite is not broken, not that it is no longer flaky.

| Suite (capability, lane) | Quarantined | Evidence when quarantined | Fix since? | Nightly on main | 3 local runs on main | Recommendation |
|---|---|---|---|---|---|---|
| `check_d1_reset_to_six_browser.cjs` (D1 Reset to the six, runtime) | 2 Nov 07:15 UTC | "Reset to the six… reachable with the arrow keys" timed out waiting for the dialog: run 41401230384 (#458, a forms change) and batch run 41400122250 (#423, test-only). The API check `check_d1_reset_to_six.ts` passed. | **Yes**: ad641538 + 3421c6e6, "the arrow-key path waits for the focus to settle", merged 08:46 UTC via #479, about 90 min after the quarantine. The list was never updated. | Pass 1/1 (2 Nov 10:38, after the fix) | Pass 3/3 (25/25 each, 44–54 s) | **Take it off the list.** Its fix has been on main for about 25 h. |
| `check_forms_c36_rule_facts_browser.cjs` (C3.6, forms) | 1 Nov 22:45 UTC | Focus check "after Propose, focus lands on the row's To review link" failed batch b489cc2d79 and #374's own PR check (a run-suites.sh-only change). On main 70eb4b7e it failed 1 of 3 runs on a fresh copy ("focus lands on the Proposals link"). | **No.** The only later change is b52c7763 (K13, words only). The fix row, "wait for the page's ready signal and the focus move before reading `document.activeElement`", is not done. | Pass 3/3 (2 Nov 00:04, 03:11, 10:38) | Pass 3/3 (16/16 each, 20–30 s) | **Keep** until the forms lane lands the wait; it failed 1 in 3 before. The fix is small. |
| `check_screen01_api.ts` (C2.2 source trust, screens) | 2 Nov 03:45 UTC | "Source-trust race: a new unapproved form uploaded five times gives five answers" failed #404's PR check (records only, run 41379078310, part 1) and batch run 41382319102 (#405, records only). It passed on other PRs. | **No.** Later edits (c0211908, 2c877d10) changed other checks in the file, not the race. The fix row (product race or check race?) is open. | Pass 4/4 (31 Oct 23:52 to 2 Nov 10:38) | Pass 3/3 (135/135 each, 26–30 s) | **Keep.** It may be a real product race (five concurrent uploads of one unapproved form must give one held item). It needs the screens lane's answer and a fail test, not a lift. |

**Earlier quarantines that came back** (run-suites.sh comments; git history):
* `check_cost_warning_browser.cjs`: 31 Oct → 1 Nov, fixed by #177 (X8a, waits for the page's ready signal).
* `check_forms_c31_formats.ts`: 1 Nov night → fixed by #316 (C3.1/QA-146, reads only committed inventories).
* `check_c313_reuse_browser.cjs`: quarantined twice.
  * 1 Nov 22:00, fixed in `isolated.sh` (#382: an older copy answered on a shared port).
  * 2 Nov 11:40, fixed by runtime L1 (a `Workspace.id()` race on an empty database; fail test `check_workspace_first_calls.ts`, 5/9 before, 9/9 after).

## Gaps found while checking (for the tech lead)
1. **Quarantined suites have had no run at all for about 23 h.** The nightly is their only run, and the last one to
   finish was 2 Nov 10:38. The 3 Nov 02:43 nightly was cancelled, and the two before 10:38 went red, one before
   reaching the suites. If the Mac's nightly does not run, nothing checks these three. Cheapest remedy: run the
   quarantined suites as a report-only step in each merge-queue batch, so a failure is logged without blocking the
   batch. That is a ci.yml change for an infra PR, and only if you want it.
2. **The smoke set is one short.** `check_screen01_api.ts` is in `select-suites.mjs`'s SMOKE list and in QUARANTINE,
   so every PR's smoke set silently runs 5 suites, not 6.
3. **Nobody removes an entry when its fix lands.** D1's fix merged about 90 min after the quarantine and the entry
   stayed for a day. Suggestion: a fix row for a quarantined suite is done only when the same PR takes the suite off
   the list, as the run-suites.sh comment already says ("take it off this list in that PR"). Reviewers check it.

Lifting D1 changes `tools/run-suites.sh`, so it is a code PR (the full suite in the queue), not this notes PR. The
runtime lane or the infra session can take it.

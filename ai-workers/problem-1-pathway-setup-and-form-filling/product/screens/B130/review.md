# B130 review: Signed by hand and the signed scan name the printed copy (server + a small screen change; no migration)

Reviewer: Opus, a fresh session that did not build this change. Branch `claude/screens-b130-printed-copy` at **f14e65d3789b7aa402d948506c31611e245274e5** (PR #1290). Only B130's own diff was reviewed: `658122db8..f14e65d37` (B132 #1278 and B129 #1275 are underneath and were not reviewed here). Files: `api/src/sign-steps.ts`, `web/src/runtime/sign-steps.tsx`, `tests/check_c81_signing_api.ts` section (8), `tests/check_c81_sign_browser.ts` (tab `pOld`). Scope: the row (BACKLOG B130, B3 challenge m5), STANDARDS §6–§7 and the screen-review code checks. The screen's look does not change (it sends one more field), so D1–D20, the BIC table and the journey score are N/A. The caller skipped the journey score. Own copy `rev_b130` on :4447 (`tools/isolated.sh`, TTL 60, now stopped: database and files removed). Live AI off, US$0, Sample data only. No tracked file changed (`git status` clean). The probe script was a scratch file and was deleted.

## What I ran
- `tests/check_c81_signing_api.ts 4447 xr_studio_rev_b130`: **40/40, exit 0**. The four B130 lines pass and every earlier line is unchanged.
- `acceptance/C8.1.test.ts 4447`: **14/14, exit 0**. The pack's calls name no copy and behave as before.
- `node P/tools/graph.mjs --check`: exit 0, with G3 12 and G6 6, the same as B132's base.
- `tsc --noEmit` on api and web: no error in either sign-steps file.
- Signed scans on disk vs `signed_scan` rows after the suite: **4 files for 4 rows**. The refused scan's file is removed by `rmSync` in the catch at `sign-steps.ts:199`.
- Live probes (scratch script), listed in the next section.

## Probes and findings on the code
- **Stale tab after a restart (the row):** tab A printed copy 1, then tab B printed copy 2 (a restart). A's `signed {copy: copy1}` gets **409** in the server's words ("…not the one printed now…Nothing was recorded."), and only `print` stays live. A scan naming copy 1 also gets 409, with no row and no file left. With copy 2, both are recorded. This meets "a mismatch gets a 409 in the server's words".
- **Check under the lock vs the restart transaction:** the check (`sign-steps.ts:162-165`) reads the live print step after `lockCase`, in the same transaction as the insert. The restart (`:135-139`) supersedes the old steps and inserts the new print under the same lock, and passes `signs` undefined for `print`.
  - I raced the restart print (copy 2) against a stale `signed {copy: copy1}` with `Promise.all`: both returned 200. Signed committed first, against copy 1, which was still the live print at that moment. The restart then superseded it, leaving only `print:copy2` live.
  - That is a correct ordering. A stale step is never left live against the new copy, and there is no deadlock (the case row is locked first in both paths).
- **The scan:** the file is written before the transaction. On the 409, the catch removes it, and the disk count above confirms this.
- **Odd copy values:** `"not-a-uuid"`, `123`, `{}`, the nil uuid and an upper-case form of the right id each get **409 in words, never a 500**. The comparison is in JS, so no uuid cast can throw. `""` (and a missing field, or null) means "names no copy" and gets today's order-only check: 200, and the scan 201.
- **Does the screen ever send a stale copy when its page is current?** No.
  - `done.print.copy` comes from the item read. `after()` awaits `invalidateQueries(["runtime","view",caseId])`, which covers the `sign-item` key, before the next button is enabled.
  - While a restart is due, `again` hides Signed by hand and the upload, and the window-focus refetch keeps a refocused tab current.
  - A print step always holds a copy id (`:120-121` refuses a print without one), so the screen always sends one.
- **Anything legitimate broken:** none found.
  - The C8.1 pack passes 14/14. Section (8)'s neighbours and B132's lines still pass.
  - `m3.ts signByHand`, the checkpoint builder and the qa walks send no copy, so they are unchanged.
  - The builder reports J-B3 58/58 and gate B C8.1 14/14 on the checkpoint; I did not re-run either (see "Could not check").
- **A rule's test fails when the rule is removed (STANDARDS §7):** section (8)'s two fail lines assert 409 and an unchanged live set. Without the check in `save()` both would return 200/201 and the two pass lines would see extra steps. That matches the builder's 36/40 with the code stashed.

## Design choice: `copy` checked when sent, optional otherwise
This meets the row, and I do not think the copy must be required.
- The defect in m5 is a stale page of the product's own screen. The screen now always names the copy on Signed by hand, the scan and Uploaded to IRCC, and the server refuses any mismatch under the lock.
- Making it required would change about ten set-up and pack callers (`acceptance/lib/m3.ts:357-359`, `acceptance/C8.1.test.ts`, the checkpoint's `130-release-two.ts`, `tests/check_c76_readiness_api.ts`, the qa walks) for no gain on the product path.
- The one residual case is a tab loaded before this deploy, which sends no copy and gets the order-only check. It is narrow and short-lived.
- Recommendation for the PR: record the rule ("named copy checked when sent") on the C8.1 line of `acceptance/M3-CONTRACT.md` when the tech lead answers option (a) on #1278. That is not a blocker.
- Note: the `signed` and `scan_received` rows still store `copy_id` null. I read "carry the printed copy's id" as the request carrying it. The check ties each step to the live print step in the same non-superseded set, so the record stays unambiguous.

## Issues, ranked (no Blocker, no Major)

**m1 (Minor, Should). The browser "B130 fail (two tabs)" line passes without B130's server check.** In `tests/check_c81_sign_browser.ts:149-151`, after the restart, `pOld`'s printed copy reads `out_of_date: true` in the forms view (probe: the old copy `ood:true`, the new one `ood:false`).
- The screen's own guard, `printedCopyStale()` (`web/src/runtime/sign-steps.tsx:99-109,113`), therefore refuses before any POST, with "The printed copy … is out of date…", inside the "Not recorded" notice.
- The test's regex `/out of date|not the one printed now/` accepts those words. So this line proves the client guard, not the server's 409.
- The server-only case, which the old guard cannot catch, is a stale copy that reads current again. Example: the fact is changed back after the re-print, so copy 1 is current and copy 2 is out of date, while the live print is copy 2. The other case is the window between the guard's refetch and the POST.
- Section (8) is a real two-tab proof through the API, so the row's "a two-tab test proves it" is met.
- Fix: in the browser test, change the fact back before `pOld` presses, then require `/not the one printed now/`. Or relabel the line as the client guard.

**m2 (Minor, Should). A stale comment.** `web/src/runtime/sign-steps.tsx:96-98` still says "The server checks only the order (a follow-up row asks it to check the printed copy too)". That is no longer true after this row. Fix: say the server now refuses a step that names another copy (B130).

**m3 (Minor, Should). Refusal words on the scan and on a junk value.**
- The scan's 409 reuses the step text "…sign the copy printed now. Nothing was recorded." Every other scan refusal in `scan()` ends "Nothing was stored." (`:179-189`).
- A value that is not a copy at all (`"not-a-uuid"`) is told "it was printed again since this page was read".
- Fix: for the scan, say "Upload the scan of the copy printed now. Nothing was stored." The junk-value wording is a nit; only a hand-made call reaches it.

## Could not check
- I did not run `check_c81_sign_browser.ts` or J-B3. Each needs Demo › Reset and loading the configured checkpoint on my copy (up to 20 minutes) and rewrites tracked screenshots.
- m1 comes from the code path plus the forms-view probe above, not from a captured browser run.
- The builder reports J-B3 58/58 and gate B C8.1 14/14 on the checkpoint.

**Verdict: Approve** (no open Blocker or Major) for **f14e65d3789b7aa402d948506c31611e245274e5**. m1–m3 are Should fixes that can follow in this PR or the next one on the B3 lane.

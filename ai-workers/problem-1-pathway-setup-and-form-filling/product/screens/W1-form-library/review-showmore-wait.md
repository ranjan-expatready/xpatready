# Independent CHECK: the Show more wait in the Form library check, commit d5746082 (1 Nov 2026)

Reviewer: I did not build this. I reviewed only `git show d5746082` on `claude/forms-showmore-wait` (from main 751cbc42), checked out at that commit. The change is test-only: `prototype/studio/tests/check_forms_s4_library_browser.cjs`, 5 lines added and 1 removed. No app code changed, so concept fit, words, [M] lines and the graph are unchanged since the last W1 review (`review-x5a.md`, `review-x5c-deletions.md`). This check covers the test's correctness only.

## The change
* **Before.** Enter on Show more, a fixed 60 ms sleep, then Enter again. Under load the first press had not re-rendered yet, so the second press hit Show more again: 200 rows, and the step failed (91/92 on main).
* **Now.** Enter on Show more. Then `waitForFunction` waits (10 s, no `.catch`) until there are exactly 150 `tr[data-form]` and `document.activeElement.closest("tr[data-form]")` is row index 100. Then Enter.

## Is it still a real fail test for the original bug? Yes
* The original bug (310acb9c 1 / break m16): Show more focused the new row's number button, so a second Enter opened that row's drawer.
* The wait matches focus on the row **or anything inside it** (`closest`). With the bug, focus on row 101's button satisfies the wait, the Enter goes to the button, and the step's `dialogs === 0` fails.
* **Proven, not only reasoned.** On the running copy I put focus on row 101's button after the second Show more. The new wait passed and Enter opened 1 dialog, so the step would print FAIL (`journey-test-reviewer-2026-11-01-showmore-wait-d5746082.md`, "mutants").
* Because of this, `closest` (rather than `activeElement` being the `tr` itself) is the right choice. A stricter wait (`activeElement.matches("tr")`) would time out on the bug instead of reaching the assertion. That is still loud, but less specific.

## Would the wait hide a bug? No; other regressions fail loudly
* **Show more stops moving focus (m1 regressed).** I left focus on the button. The wait threw after 10,005 ms. In the script that goes to the outer `catch` (line 368): `fail++` and "FAIL unexpected …", exit 1.
* **Show more stops adding rows, or adds a different number.** The row count never reaches 150, so the wait throws. Loud.
* **The timeout gives no slack to hide a slow bug.** 10 s is only a ceiling. It cannot turn the wrong focus into the right focus.

## Is the wait right?
* **Index 100.** PAGE is 50 (`library-forms.tsx:73–91`). The first Show more gives 100 rows with focus at index 50, which the step at line 290 asserts. The second adds rows 101–150 and focuses `rows[pageRows.length]`, the first row added, at index 100. Correct.
* **150 rows.** The fill lists 230 forms, so 150 is reachable. The assertion that follows already required 150, so this adds no new assumption. Both 100 and 150 hard-code PAGE = 50, as the neighbouring steps already do.
* **The race is closed.** `showMore` calls `setLimit` and then focuses in `setTimeout(…, 0)`. The wait needs both, rows and focus, so the second Enter cannot reach Show more again. Journey 3 in the report shows what the old 60 ms hit: a fast double Enter loads 200 rows and opens no drawer.
* **It matches the file's pattern.** Lines 362 and 365 already use `waitForFunction(…, { timeout: 10_000 })` with no `.catch` for focus after an action.

## Runs
* My run, on a fresh `zsh studio/tools/isolated.sh forms_rv5 4456 start`: `node studio/tests/check_forms_s4_library_browser.cjs 4456 xr_studio_forms_rv5` gave **99 passed, 0 failed**, exit 0. The step reads "dialogs 0, rows 150".
* The builder ran it 99/99 twice, on fresh isolated copies.
* I stopped the copy afterwards. I did not use :4400. US$0.

## Journey score
**10/10, Pass** (`journey-test-reviewer-2026-11-01-showmore-wait-d5746082.md`). It covers Show more by keyboard:
* 148 ms to rows and focus
* the status updates
* Enter on the focused row opens nothing
* reload resets the list
* axe is clean
* no sideways page scroll at 400, 1024 or 1440 px

## Issues
* **Minor (Should, wording; does not block).** The step name still says "before: row 51's drawer opened" (line 302), but the step now tests the second Show more, which focuses row 101. Fix: "(before: the new row's drawer opened)".
* **Minor (note, does not block).** A timeout in this wait ends the run at the outer `catch`, so the later steps in the file do not run. That is loud and correct for a gate, and it is the file's existing pattern. No change asked.
* **Housekeeping (not a finding against the commit).** Running the check rewrites the committed screenshots in `screens/W1-form-library/screenshots/slice3/`. In /home/user/w5 they show as modified, which they already were before my run. Do not commit them with this PR unless intended.

## Not checked
* CI on d5746082. I ran the test locally only.
* The rest of the screen, which this change does not touch.

**Verdict: Approve**

No open Blocker or Major at d5746082. The two Minor items above are Should and do not block.

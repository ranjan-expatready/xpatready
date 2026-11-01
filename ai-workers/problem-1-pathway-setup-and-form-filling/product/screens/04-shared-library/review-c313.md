# Review: C3.13 reused vs new per combination (Screen 04 BR-4), commit c0006eb0

Reviewer: independent reviewer agent (did not build it). Branch `claude/screens-c313-reuse`, diff `origin/main..c0006eb0`. Own isolated copy on :4449 (`rev_c313`); :4400 not used. No AI calls.
Journey test: `journey-test-reviewer-2026-11-01-c313.md` in this folder. **Journey score 7.5 / 10 (fail: pass is 8)**.

**Verdict: Block** (Changes needed / Ship after fixes): 3 Majors open, listed at the end.

## What holds
* All three lists (Fields, Sections, Document types) have a Combination chooser, kept in the address (`?combination=<key>`), so a reload or a shared link keeps it. "All combinations" brings the whole list back. Totals read "With an LMIA uses 18 sections · 0 reused · 18 new here". Each row shows a Reused or New here pill next to the origin/status pill. A combination that uses nothing gets an empty state that teaches what to do. An unknown combination gets a `role=alert` in words and the full list stays.
* Server: `readerOf` on the new route. No person gives 401, an unknown person 401, a studio reader (user-C) 200. Unknown list or combination: 404 Problem Details in words. Grouped queries, no per-row requests. API time 6–44 ms; first view 600 ms.
* Builder suites rerun by me on fresh copies at c0006eb0: `check_c313_reuse.ts` 15/15, `check_c313_reuse_browser.cjs` 24/24. The "brought in" test does fail when the rule is replaced by `createdAt`: vv.single was created before wp.family, so it would turn New.
* axe WCAG 2.2 A/AA is clean on the chosen, empty and unknown states. No sideways scroll at 400, 1024, 1440 px or at 200 % zoom (720 CSS px at DPR 2) on all three pages. Keyboard: the chooser is reached in 16 Tabs with a visible focus ring, and arrow keys choose.
* Graph (`graph.mjs`): G1–G6 show no gap for this item. `GET /library/reuse/:kind` is tested by `check_c313_reuse.ts`. The graph does not see the web call because the path is a template; that is a tool blind spot, not a finding.

## Issues (ranked)
1. **Major (Must): the rule credits the combination that started first, not the one that brought the item in.** Concept §2 Links says "first combination that brought the item in". BR-4 says "Reused (in the library before this combination)", and PRODUCT §1 says "the next combination, which reuses what exists". Reproduced on :4449: Study permit added a new document type "Reviewer probe two" (it created the type). One second later With an LMIA added the same type. Study permit then shows **Reused, "Brought in by With an LMIA"** and LMIA shows it **New here**, which is the reverse of what happened. Cause: `library-sources.ts:58-67` ranks whole combinations by their earliest setup line and never looks at when each combination took up *this item*. Fix: rank per item, by when each combination first used it. Stable per-item times already exist in `audit_event` (`at`, `combinationId`, `entity`, `entityKey`: section picks, requirement lines, form attaches). The other option is a `createdAt` added to the usage rows (expand-only migration). Add a pass/fail test for this exact sequence.
2. **Major (Must): the ordering key is `updatedAt`, so New/Reused flips when another combination is released or edited.** All four tables have only `@updatedAt` (`schema.prisma`; no `createdAt`). Releasing a combination updates every one of its draft rows to PUBLISHED (`studio.ts:809`), and a retire also updates a row (`studio.ts:526`). Reproduced: Study permit and High-wage position each added the same new document type, Study permit first, so Study permit = New and High-wage = Reused. I then re-saved Study permit's draft row exactly as its release would (`updated_at = now()`). Study permit flipped to **Reused, brought in by High-wage position**, and High-wage flipped to New. Nothing about the item changed. Fix: use a time that never changes (same source as issue 1).
3. **Major (Must): the Fields totals count 21 calculated facts that are not library fields.** With an LMIA reads "uses 185 fields · 0 reused · 185 new here" and "(185 used)" in the chooser, but the list shows "164 of 164" rows. The 21 extra keys are rule-derived values such as `person.age_years` and `person.passport_days_until_expiry` (screenshot `/tmp/revc313/shots/size-1024-1-fields.png`). This breaks EXPERIENCE §2.7 [M] "counts say what they count" and BR-4's totals. Fix: in `reuse()` for `field`, count only keys that are library fields (intersect with the canonical field keys). Add the test that is missing: Fields total = the number of rows marked in the list (today it is checked for Sections and Document types only).
4. Minor (Should): "Brought in by …" lives only in the pill's `title` (`library.tsx:273`). The pill is a `span`, so keyboard and touch users cannot read who brought the item in (EXPERIENCE §2.10 [M] tooltips). This is the team's Pill pattern, so it is Minor. Fix: a focusable tooltip, or the name as text in the pill's accessible label.
5. Minor (Should): with `?combination=` in the address, Sections and Document types first draw the whole list, then cut it down once the reuse answer arrives (`useReuse`: `items` is null while loading, so `keep()` passes every row). Fix: show the spinner until the reuse answer is in.
6. Minor (Should): the concept's contract line is `GET /library/:kind?combination=` (one request per view, STANDARDS §4 [M]). The build uses a separate route, so each view makes two requests, and `ReuseView` is a web-only type with no shared zod contract (STANDARDS §5 [M]). The route deviation and the "brought in" interpretation are recorded only in the PR or commit message, not in this folder ("never deviate silently"). Fix: record both in a `build-notes.md` or `challenge.md` here, or fold the route into the list route.
7. Minor (Should): neither suite can be rerun on the same copy. `/demo/load` refuses a loaded workspace, and the browser suite leaves Visitor visa's section picked, which then fails the API suite's "uses 0". On my run on the same copy that gave 14/15 and 21/24. Fix: reset first, or undo the pick at the end.

## [M] lines of STANDARDS and EXPERIENCE (only the ones this change touches; the rest are untouched, so N/A)
STANDARDS: stack and gate (no new technology): met · modules and services (library-sources only, studio.ts untouched): met · no schema change: met · read paths: no N+1 (met), one request per view (not met, issue 6) · contract first (zod): not met for the response (issue 6) · Problem Details: met · authorisation deny by default: met · strict TS, no `any` in the new code: met (the pages keep their existing `any[]`) · a rule's test fails when the rule is removed: met for totals and the "set up first" rule, not met for fields totals (issue 3) · axe on every state: met · performance budget: met.
EXPERIENCE: team look and tokens (Pill, Select, EmptyState): met · status by shape and text: met · counts say what they count: not met (issue 3) · tooltips on every status: partly met (issue 4) · accessible (keyboard, 1024 px, 200 %): met · empty states: met · plain words (PRODUCT §4, no keys on the main path): met.

## D1–D20 (1–5)
D1 Requirement fit 2: BR-4 is built, but the "brought in" answer is wrong in an ordinary sequence (issue 1). · D2 Data integrity 3: read-only, but the shown values are unstable (issue 2). · D3 Reuse 4: shows reuse correctly on the sample for Sections and Document types. · D4 Rule integrity N/A. · D5 Stability 3: reload and back are fine; labels flip on release (issue 2); suites not rerunnable (issue 7). · D6 Freshness/governance 3: "brought in by" exists but rests on a mutable time. · D7 AI trust N/A (no AI). · D8 Orientation 4: the chooser and totals sit with the filters. · D9 Flow 4: one choice, URL-kept. · D10 Language 4: "Reused / New here / uses N · R reused · M new here". · D11 Feedback 3: alert on error; list flash (issue 5). · D12 Visual 4: team components, clean at all widths. · D13 Accessibility 4: axe clean, keyboard, 200 %; tooltip not reachable. · D14 Team look 4. · D15 Speed 5: 600 ms first view, reuse 6–44 ms. · D16 Testability 3: pass and fail cases exist; missing the per-item and fields-total cases. · D17 simulated only. · D18 Provenance 2: the named origin combination can be wrong (issues 1, 2). · D19 E2E closure 3: the "34 reused · 12 new" moment of the proof loop is visible, but its numbers are not yet trustworthy. · D20 simulated only.

## Retrofit mapping
The concept maps this to the team's list route with `?combination=`. The build maps it to a new `GET /library/reuse/:kind`. This is not recorded in the screen folder (issue 6).

## Could not check
A real screen reader. An intended user's unaided walk (D17, D20 stay with the founder). A true end-to-end release by two people to show issue 2 through the UI: I simulated it with the same column update the release code makes (`studio.ts:809`), on my isolated database only.

## To fix before Approve
1. Rank "brought in" per item, by when each combination first used it (issue 1).
2. Use a time that never changes, not `updatedAt` (issue 2).
3. Fields totals count only library fields, and a test compares them with the rows (issue 3).
Minors 4–7 are recommended but do not block.

## Re-review, commit 900f70ac (diff from c0006eb0)

**Verdict: Approve.** No Blocker or Major is open. **Journey score 9.5 / 10 (pass).**

I used my own fresh copy on :4449 (never :4400) and made no AI calls. Both suites pass on fresh copies at 900f70ac: `check_c313_reuse.ts` 21/21 and `check_c313_reuse_browser.cjs` 24/24.

* **Issue 1 (Major) is closed.** "Brought in by" is now the combination named on the item's first ADD library change (`library-sources.ts:169-176`).
  * I redid my own sequence: Study permit names "Probe two", then With an LMIA adds it. Study permit shows **New here** and LMIA shows **Reused, from Study permit**.
  * The same holds for "Probe three": Study permit first, then High-wage position.
  * The new "M1 fail" test (LMIA was set up first) would fail under the old rule.
* **Issue 2 (Major) is closed.** No `updatedAt` is read any more. I rewrote `updated_at = now()` on all 29 requirement rows of Study permit and With an LMIA, and no mark or total changed.
  * The fallback, for items with no ADD record, uses `ConfigRelease.releasedAt`, then `createdAt`. Neither value changes after it is written.
* **Issue 3 (Major) is closed.** `keysOf` limits the counts to items that are in the library. Fields for With an LMIA read "164 · 0 reused · 164 new". The chooser says "(164 used)" and the list has 164 rows.
  * New tests: "M3 pass/fail", which check that every marked key is a row and that `person.age_years` is not counted.
* **Issue 4 is closed.** "from Study permit" is visible text under the Reused pill, so keyboard and touch users can read it.
* **Issue 5 is closed.** I delayed the reuse request by 800 ms: no row was drawn before the marks arrived, at 1440, 1024 and 400 px or at 200 % zoom.
* **Issue 6 is accepted as recorded.** `build-notes-c313.md` records the separate route, its cost (two requests per view) and the rule. The response still has no shared zod contract, which stays a Minor.
* **Issue 7 is accepted as recorded.** The build notes state that both suites need a fresh copy for each run.
* Checked again on Document types at 1440, 1024 and 400 px and at 200 % zoom: axe WCAG 2.2 A/AA clean, no sideways scroll, no page errors.

**New Minors (Should, not blocking):**
* **A withdrawn ADD still gets the credit.** The ADD query does not filter on status (`library-sources.ts:170`). Withdrawing a new field deletes its draft rows but keeps the WITHDRAWN ADD (`library-changes.ts:165-170`). If another combination later adds the same key, the combination that withdrew it would be shown as having brought it in. Fix: add `status: { not: "WITHDRAWN" }`.
* **Library-only field maps fall back to release order.** A field map applied without a combination (`sources.ts:794`, `job.combinationId` null) writes an ADD with no combination. Those fields then use the release-or-creation fallback, but the build notes describe the fallback only for the sample import. Fix: one line in `build-notes-c313.md`.

**Journey score, re-run:**

| Criterion | Score | Note |
|---|---|---|
| Task completed | 1 | |
| Next step obvious | ½ | Unchanged: the empty state's "set up this combination first" has no link |
| Plain words | 1 | |
| Feedback and state | 1 | |
| Correct data | 1 | |
| Error recovery | 1 | |
| Accessibility and screen sizes | 1 | |
| Speed | 1 | |
| Visual quality | 1 | |
| Trust and sources | 1 | |
| **Total** | **9.5 / 10** | **Pass** |

**D1–D20 changes:** D1 4 · D2 4 · D5 4 · D6 4 · D11 4 · D13 5 · D16 4 · D18 4. The rest are unchanged; D17 and D20 remain simulated only.

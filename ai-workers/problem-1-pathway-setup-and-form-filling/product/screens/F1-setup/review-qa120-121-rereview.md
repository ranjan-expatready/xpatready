# Review: QA-120 and QA-121, combination tab counts and a `?focus=` place that is gone (commit 83628cec)

**Reviewer.** I did not build this. **Scope:** `048330ac` (the code: `combination.tsx`, `focus-item.tsx`, `documents.tsx`, `questionnaires.tsx`, `check_x1_tabs_focus_browser.cjs`). On top of that, `83628cec` only adds rewritten screenshots; I checked that it has no code change. Rows QA-120 and QA-121 are in `product/qa/BUGS.md`.
**Design sources:** W1 setup checklist `plan.md:78` ("This was done since you opened it." shows only when that line's step is done), concept v4 §7, EXPERIENCE #10, STANDARDS (accessibility).
**Environment:** isolated copy `screens_x1` on port 4442 (`xr_studio_screens_x1`), with the sample loaded and `web/dist` built after the source change. Headless Chromium. No model call (US$0). My probe script is `/tmp/rv/probe.cjs` (not committed) and its screenshots are in `/tmp/rv/shots/`. I restored the suite screenshots that my reruns rewrote.

**Verdict: Block** (Ship after fixes): one Major finding. QA-120 is done well. QA-121 shows a false "done" on the Forms tab.

## Suites rerun on this code (port 4442)
* `check_x1_tabs_focus_browser`: **39/39** passed, not the 40/40 in the hand-off. No step failed. The count is 39 because one guarded setup step (`setup: the sample loads`) only runs on an empty database.
* `check_w1_before_forms_browser`: 23/23 passed.
* Graph: G1 0 · G2 0 · G3 1 · G4–G6 0. This diff adds no page and no route.

## QA-120 (tab counts): met
* There is now one `StepBadge` (`combination.tsx:177`) with the same shape for both counts, coloured warn or danger, with a space before each count. The tab with nothing to count keeps its plain name and has no tip.
* The tab names read in the browser at 1024 px and at 200 % zoom, with no sideways scroll:
  * "Forms 4 setup items open"
  * "Documents 1 setup item open"
  * "Review and release 1 problem"
* Keyboard Tab reaches all six tabs with those names. axe on the Overview finds 0 violations.
* **The choice of no comma is right.** WCAG 2.5.3 asks that the name contain the visible label, and best practice is to start with it. The visible text is "Review and release 1", and "Review and release 1 problem" contains it unbroken. "Review and release, 1 problem" would split it, so a voice user saying "click Review and release 1" could miss. A screen reader pauses at the badge in either case. This version is better than the one QA asked for. QA-120 can close with a note to the QA lane.
* The "one badge style" test (`check_x1…:67`) removes the colour classes and compares what is left, so it would catch a shape change. Good.

## QA-121 (`?focus=` place gone): findings
1. **Major (Must): a false "This was done since you opened it" on the Forms tab, for items that are still open.**
   * **Repro:** Super visa, Overview strip. Click "Add 1 form found" (`/forms?focus=forms:sources`) or "Map 1 form" (`forms:lines`). After 1.5 s, Before forms says "This was done since you opened it. Nothing waits there now; the next step is on the card." Both items are still open, and the badge still says Forms 4. Screenshot: `/tmp/rv/shots/forms-false-done-since-1440.png`.
   * **Cause:** `before-forms.tsx:27` is the only `useFocusItem` on the Forms tab. No element there answers the `forms:*` keys (`grep data-focus`: only `pages:record` and `people:card`). The new miss timer (`focus-item.tsx:28-37`) therefore treats every `forms:*` key the engine emits (`forms:finder`, `forms:sources`, `forms:lines`, `forms:problems`, `forms:held`; `itemHref` sends all of them to Forms) as gone.
   * **Why it matters:** the item had landed nowhere since C1, which an earlier review recorded. It now says something false, on the main path from the strip. That breaks `plan.md:78` and the bug's own expected result ("say it was done" only when it was).
   * **Fix:** a hook should judge only the keys it owns. For example, use `useFocusItem(done, owns)`, where `owns` for Before forms is `pages:record` and `people:card`; for Documents it is `documents:*` and `questions_documents:problems`; for Questionnaires it is `questionnaires:*` and `questions_documents:problems`. Arm the miss timer only for an owned key.
   * **Test to add:** "`?focus=forms:sources` on Super visa shows no done-since notice and breaks nothing". Today no step covers it, so the rule's test would not fail if the rule were removed.
2. **Minor (Should): the Questionnaires empty state drops the key silently.** In `questionnaires.tsx:290-296`, the `!q` return has no `<DoneSinceNotice>`. A `questionnaires:problems` key that misses there is cleared from the address and nothing is said. This is the QA-121 symptom again, though rarer. Fix: add the notice, as `documents.tsx:62` does.
3. **Minor (Should): a direct link can give a false "done" when the summary is slow.**
   * `PartProblems`' Not ready branch (`part-problems.tsx:20-21`) waits for `combination-summary`. On Questionnaires the hook is armed with `[]` as soon as `q` is in, and `q` comes from the combination view, not from the summary.
   * So a reloaded or shared `?focus=questionnaires:problems` (from release) says "done" if the summary arrives more than 1.5 s after the view. That happens with the summary at 59 ms locally only under throttling.
   * Fix: pass `sum.data ? [] : undefined` (the parent already has the query), or start the wait once both queries are settled.
4. **Minor (Should): under React StrictMode, the miss wait never re-arms in `vite dev`.**
   * The unmount cleanup (`focus-item.tsx:22`) clears `missTimer.current` but leaves its id in place. StrictMode's remount keeps the ref, so `if (!missTimer.current)` stays false.
   * The production build is not affected (the probe and suites use `dist`). Fix: set `missTimer.current = undefined` in the cleanup.
5. **Minor (Should): the tab tip is a native `title`.** It does not open on keyboard focus or touch (EXPERIENCE #10). The words are in the accessible name, so screen-reader users get them, but sighted keyboard users see only "Forms 4". The `Tip` component would meet the rule. This is borderline; record it if you keep `title`.

**What held:**
* Double timers: the ref guard and the clear on landing keep it to one timer.
* Slow loads on Documents and in Before forms: with the summary delayed 3 s, `documents:lines` and `people:card` still landed with no notice, because Before forms passes `undefined` until its steps load.
* A wrong key on Documents shows the notice, has no axe violation and clears the address. A reload does not repeat the notice.
* No page errors.

## D scores (only those this diff touches; the others are unchanged by it)
* D1 Requirement fit: 3. QA-120 is met. QA-121 is met on Documents and Questionnaires but breaks `plan.md:78` on Forms.
* D10 Language: 4. Plain words; the tip is mouse-only.
* D11 Feedback and state: 2. The state on the Forms tab is false.
* D12 Visual: 5. One badge.
* D13 Accessibility and responsive: 4. Names, keyboard, axe, 1024 px and 200 % all pass; the tip is a native title.
* D16 Testability: 3. The rule "only when done" has no failing test for Forms.
* D17 and D20: simulated only.

## Journey score (one per check): 8/10
The details are in `journey-test-reviewer-2026-11-01-qa120-121.md`. The score is 8 by number, but the Major finding above blocks the verdict.

## Could not check
* A real screen reader, or voice control speaking "click Review and release 1".
* An intended user's unaided walk (D17/D20 stay with the founder).

**Block.** To fix: Major 1 (owned keys, plus a Forms test). Minors 2–5 should be fixed or recorded in the PR.

## Re-review on a48c7cf3 (1 Nov)
**Scope:** `git diff 83628cec..a48c7cf3`. Code changes: `focus-item.tsx` (`useFocusItem(done, owns)`, cleanup clears ids), `before-forms.tsx`, `documents.tsx`, `questionnaires.tsx`, and two new fail-guard steps in the suite. Same copy on :4442; `web/dist` was rebuilt after the source change; `tsc --noEmit` is clean. I restored the screenshots my reruns rewrote.
**Suite:** `check_x1_tabs_focus_browser` passed **41/41, twice** (the builder's 42 includes the sample-load step, which runs only on an empty database).

* **Major 1: fixed.** The miss timer starts only for a key the page owns (`focus-item.tsx:34`). Browser probe on Super visa, Forms tab, 2.6 s after landing: `forms:sources`, `forms:lines`, `forms:problems`, `forms:held` and `pages:gone` show no "done since". The new fail-guard steps fail if `owns` is removed (they reproduce my repro). The `forms:*` keys still land nowhere and stay in the address, as before this PR (the known C1 gap, outside this bug).
* **m2: fixed.** The empty state now renders `<DoneSinceNotice>` (`questionnaires.tsx:295`). Read only: the sample has no empty questionnaire to walk.
* **m3: fixed on Questionnaires.** With the summary delayed 3 s, `?focus=questionnaires:gone` showed no notice at 2.5 s and showed it at 5.5 s.
  * **Residual Minor (Should, not blocking):** Documents still starts its wait from the checklist (`documents.tsx:52`, `v.data`). Its from-release `documents:problems` notice (`part-problems.tsx:20`) also needs the summary, so a reloaded link with a summary more than 1.5 s late could still say "done". With the summary delayed 3 s, a missing key showed the notice at 2.5 s. Fix: the same summary gate as on Questionnaires. Record it in the PR or fix it with the next change.
* **m4: fixed.** The cleanup clears both ids, so a StrictMode remount starts a new timer.
* **m5: not changed, accepted as recorded.** The words are in the accessible name; the native title is listed in the PR.
* **No regressions found.** `documents:lines` still lands and is outlined with no notice; there are no page errors.

**Journey score, re-run: 9/10.** Next step obvious and feedback and state go back to 1 (no false "done" on Forms). Accessibility and screen sizes stay at ½ (title tip).

**Approve on a48c7cf3.** No Blocker or Major is open. Minors still open: Documents' summary gate (above) and m5 (recorded in the PR).

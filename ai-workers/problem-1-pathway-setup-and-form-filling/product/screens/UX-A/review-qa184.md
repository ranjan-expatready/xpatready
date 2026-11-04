# QA-184 review: a Live combination reads as one state (C11.10, C5.4; P-273, EXPERIENCE "one clear state")

Reviewed: **d58d9cc9d** (branch claude/screens-live-state; diff `origin/main...HEAD`, base debbf3fc8). I first reviewed
b9b7a9816; the head moved during the review (68d3b1db7, d58d9cc9d) and the verdict is for d58d9cc9d. Isolated copies on
:4632 (main) and :4633–4639 (head), each from its own clean worktree with web rebuilt. US$0, no model call, no live switch.
Journey test: `journey-test-reviewer-2026-11-04-qa184.md`, **8/10, pass**.

## Done-when, checked
* **New check fails on main and passes on the head:** `check_qa184_live_state_browser.cjs` **6/15 on main**, **15/15 on head**
  (b9b7a9816's version was 5/15 on main).
* **Packs on fresh copies (head):** C11.10 **15/15**, C5.4 **22/22**. Touched and neighbouring suites, each on its own fresh copy,
  all exit 0: setup_card 44, w1_programs_s2 90, x1_overview_strip 28, x1_tabs_focus 48, uxa1_counts browser 47,
  uxa2_to_review 56, uxa3 26, w1_s1s2_fix 30, w1_structure 81. `graph.mjs`: the gap list is the same on main and head.
* **Walk at 1440 px (plus 1024 and 400), done-when path through the menus:** Demo › Reset to the six › Start With an LMIA.
  Header "Live" and "Next step for the next release · Official pages"; strip "Live · Release 1 · Next release: 3 of 5 steps to
  do"; card "✓ Live · Next release: 3 of 5 steps to do"; List "Live · next release 3 to do"; /catalogue `{step 1, of 5, done
  [F,F,F,T,T], live true, "✓ Live · Next release: 3 of 5 steps to do"}`. After one draft change: tabs Forms 97 · SQR 14 ·
  Documents 3 to do · **Review and release 17 to fix**; Overview row 5 "2 changes since Release 1 · **17 problems block
  release**"; Review page "17 problems to fix"; To review "17 problems to fix before release of its next version". The step
  total is 5 everywhere. Main reproduced the bug: strip "2 of 5 done", card "✓ Live" only, /catalogue "Step 2 of 4: Draft".

## The tech lead's questions
1. **Is the "one count" right?** At b9b7a9816, no. `reviewFixCount` gave the tab no badge after a change while its own
   page said "17 problems to fix" and To review said 17: that would have been a Major (the tab with Add source carried no
   count). At **d58d9cc9d, yes.** The tab counts every release-blocking error except `no_field_map` (`combination.tsx:73`), the
   same rule as row errors (`api/src/programs.ts:231`, `waitsForMap`), and row 5 now names that number
   (`engine/setup-checklist.ts:252`). The same 17 also show as step 4 work on Documents (3) and SQR (14). The row's words "block
   release" say how the two relate, and the setup tabs' "to do" still add up to the step items (114 = 114).
2. **Does progressOf agree with the card for every chip state?** Yes, by construction and by check: the label is `bar.text`
   (+ `bar.next` when Live), the same as `progressText`/`progressWords` (`programs.tsx:116-118`). Not started: "0 of 5 steps",
   step 1 (`check_w1_structure` 81/81). In progress: "n of 5 steps" at the next item's step (all rows walked). Not ready: "n of
   5 steps", never Live (`check_w1_s1s2_fix` 30/30). Live with nothing open: "✓ Live", step 5 (unit check). Retired: "Retired at
   Release n", live false; not built in the browser (see m5).
3. **QA-129:** no step logic changed, so the founder's answer is not pre-empted: the same steps are open as on main. But the
   question is now visible on Programs too. With 0 draft changes the Live card says "Next release: 3 of 5 steps to do". One
   function (`nextReleaseWords`) carries whatever the answer is.
4. **Readers of `progress` and the removed exports:** `git grep` finds no code reader of `setupProgress`, `progressFollows`,
   `SETUP_STEPS` or `SetupProgress`. The web never read `leaf.progress`. Tests that read it are updated. One stale reader is
   left (m3).
5. **Words, a11y, widths:** see the journey report. axe WCAG 2.2 A/AA clean on Overview and Programs; card and row aria
   names carry the same words; no sideways scroll at 400/1024/1440.

## D1–D20 (for this change)
D1 Requirement fit 9: the row's "Live first, one count, one step list", five steps everywhere · D2 Data integrity n/a (read
only) · D3 Reuse 9: one checklist feeds card, strip, list, API; the 4-step model is gone · D4 Rule integrity n/a · D5 Stability
8: derived on read, the same after reload · D6 Governance n/a · D7 AI trust n/a · D8 Orientation 8: header and strip name the
release · D9 Flow 7: "Fix N problems" (no-source) lands away from Add source (pre-existing) · D10 Language 7: List "3 to do"
has no unit · D11 Feedback and state 9: one state on 7 surfaces · D12 Visual 7: List cell wraps to four lines at 1440 ·
D13 A11y 9: axe clean, aria matches · D14 Team look 8: green edge bar kept (P-180) · D15 Speed 9 · D16 Testability 8: new check
fails on main; m4 · D17 simulated only · D18 Provenance 8: source gate counted · D19 Closure 8: C5.4 path intact (22/22) ·
D20 simulated only.

## Findings (no Blocker, no Major at d58d9cc9d)
* **m1 Should (visual, words):** List progress "Live · next release 3 to do" wraps onto four lines in its column at 1440 px
  and names no unit (`web/src/pages/programs.tsx:499`). Fix: "Live · 3 steps to do" or a wider cell (screenshot: List row at
  1440, journey report).
* **m2 Should (record):** P-180 says the card shows "n of 5 steps" or "✓ Live" only; the Live card now adds "· Next release:
  N of 5 steps to do". The tech lead's done-when asks for this on the card, but neither the commit nor the PR names P-180.
  Say it in the PR (decision impact), so the change to P-180 is on record.
* **m3 Should (qa tool):** `tests/qa/check_qa_am_fix_1027.cjs:44-47` still reads the 4-step stages (`progress.step`
  against the old Forms/Draft/Review/Release stages). It is not in run-suites and I did not run it. Tell qa in the PR.
* **m4 Should (test):** the tab's `no_field_map` exclusion repeats the engine rule as a string in the web
  (`combination.tsx:73`, `code !== "no_field_map"`), and no check fails if it is removed (the QA-184 fixture has no unmapped
  form). Fix: import `waitsForMap` (or take the count from the summary), and add one assertion on a combination with an
  unmapped form.
* **m5 Note:** a retired leaf with no combination would read "Retired at Release 1" (`release: null`, fallback 1), on the card
  as before and now in `progress.label`. I could not build this state; I record it, not a finding against this row.

Could not check: a real screen reader, 200 % zoom, an intended user's unaided walk (D17/D20), Retired in the browser.

**Verdict: Approve d58d9cc9d**

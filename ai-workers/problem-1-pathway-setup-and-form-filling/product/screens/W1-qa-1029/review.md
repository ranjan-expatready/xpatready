# Review: PR #389, QA-73 (F8 remainder), Review and release Item column (head 330f4a64)

Reviewer: separate context, did not build. Scope: the diff only (`web/src/pages/review.tsx`, `tests/check_screens_qa_1029_browser.cjs`). No new screen part, so no concept.md. Checked against QA-73 in `qa/BUGS.md`, `EXPERIENCE.md`, `STANDARDS.md`, `QUALITY.md`.

**Verdict: Block** (Rework of the fallback rule; small). One Major is open.

## What I ran
- Isolated copy `screens_qa29` on :4438 (never :4400). `node studio/tests/check_screens_qa_1029_browser.cjs 4438 xr_studio_screens_qa29`: **63 PASS · 0 FAIL**, matching the builder ("22 items, 20 with a long definition in the tip; longest text 56"). Screenshots it rewrote were restored with `git checkout`.
- I read every Item label `engine/validate.ts` `diff()` (lines 184-250) can produce, and called `GET /combinations/:id/review` on all 6 sample combinations. Every change in the sample is a "Derived definition", so the test only covers that kind.
- A Playwright probe at 1440, 1024 and 512 px: no sideways scroll; the tab loads in about 0.35 s; the Item `<td>` has tabIndex -1; the author has no row checkbox.

## Issues (ranked)
1. **Major (Must): the fallback applies to every kind, so a long non-calculation label becomes a wrong or ID-like name.** `review.tsx:18` (`itemName`) swaps any label over 60 characters for `fieldName(c.key)`. `fieldName` (`library.tsx:24`) keeps the part after the last "." and turns `_` into spaces. That only makes sense for field-like keys. Keys for the other kinds, from `validate.ts`:
   - **Row details** (`validate.ts:228`): the label is always "name, path, portal, source basis or allowed locations (no line changed)", 71 characters, so it always falls back. The key is the combination key, e.g. `vv.single`, so the Item reads **"Single"**. That is misleading.
   - **Section order** (`:211`) and **People on this row** (`:226`): the labels are "Sections reordered: …" and "who this row covers: …", usually over 60. The key is the combination key, so the Item again reads "Single". What changed appears only on hover.
   - **Rule** (`:189`, label = `then` = `thenPlain`, free text): the key is the predicate key `R-01`… (`engine/import.ts:104`), so the Item reads **"R-01"**. That is an ID on the main path (`EXPERIENCE.md:46`, D10). Rules always need the immigration expert's sign-off, so the expert would sign rows named "R-01" and "R-02".
   - **Document requirement**: the key is `<type>:<role>[:<ts>]` (`api/src/studio.ts:698`). It has no ".", so the Item would read e.g. "Passport copy:principal applicant:lz8k3".
   - **Who fills a question** (`:195`) and **Where an answer comes from** (`:243`): the long label *is* the change ("…: filled by the client, was the case officer …"). The fallback leaves only the fact name ("Date of birth"), and the role is dropped from `role|fact` keys.
   - **Form**: a title over 60 characters falls back to the form number. That is acceptable.

   Before this PR all of these labels showed in full, so for every kind except calculations this is a regression. **Fix:** limit the short-name fallback to `c.kind === "Derived definition"`, where the key is field-like and the label is the definition. Every other kind keeps showing its label, line-clamped if needed, with the full text in the tip as `EXPERIENCE.md:14` allows. Add a fail case to the test with one long non-derived label (Row details is the easiest: edit a combination's name after release) and assert that the Item is not just the combination's key words.
2. **Minor (Should): the full definition is mouse-only on this tab.** The `title` sits on a non-focusable `<td>`, so keyboard and touch users cannot reach it. When the row has a checkbox, a screen reader hears the full label through `aria-label="Select …"`, but the author view has no checkbox. Calculated answers' definitions are not listed on the library pages (`library.tsx` has no calculated-answer view). `EXPERIENCE.md:14` accepts "full text on hover" for long text, so this is acceptable for a Minor fix. Strictly it falls short of WCAG 1.4.13 / 2.1.1 for keyboard users. Cheap fix: a disclosure (`<details>`) or a focusable tip on the Item.
3. **Minor: a short label's tip is the system key.** `itemTip` (`review.tsx:19`) shows e.g. `person.age_years` on hover. That is unchanged from before (pre-existing) but still a key on screen (D10).
4. **Minor: "Us PR card days until expiry".** `ABBREVIATIONS` (`library.tsx:23`) has no `us`. "Start vs cohabitation days" is also key-like wording.
5. **Minor: the test's pass check is weak.** `check_screens_qa_1029_browser.cjs:126`: `longTips.every(x => x.tip !== x.text)` is true for any key tip, and nothing checks that the long definition is actually in the tip or that the name means something. "R-01" or "Single" would pass both new steps. The fail step's snake_case regex is sound. The builder's evidence shows both steps fail on main.

## D1–D20 (this change only)
D1 concept fit 3/5: QA-73 is fixed for calculated answers, but other kinds regress (issue 1). D2 workflow 4: unchanged. D3 correctness 2: wrong names for Row details, Rules and others (issue 1). D4 data 5: display only, no data path changed. D5 states 4: empty and loading are unchanged. D6 errors n/a. D7 roles 5: server unchanged. D8 audit n/a. D9 visual 4: rows are one line, longest 56 characters (screenshot `review-1440.png`). D10 language 3: no codes or roles in names for calculations; "R-01" and system-key tips remain. D11 accessibility 3: axe passes, but the definition is mouse-only (issue 2). D12 responsive 5: no sideways scroll at 1024 or 512 px. D13 speed 5: about 0.35 s. D14 consistency 4: reuses fieldName. D15 code 3: a kind-blind rule. D16 tests 3: only the derived kind is exercised (issue 5). D17 simulated only. D18 sources n/a. D19 trust 4: origin and AI pills unchanged. D20 simulated only.

## Graph (P-86)
Not run for this one-cell change. No new element, page or route.

## Could not check
A real screen reader. Non-derived long labels live: the isolated sample has none, so issue 1 is shown from code (`validate.ts` labels and keys, `fieldName`), not from a screenshot. 200 % zoom was approximated by the 512 px width.

Journey score: **6.5/10**, see `journey-test-reviewer-2026-11-02.md`.

**Verdict: Block.** Fix before `review: approved`: issue 1 (limit the fallback to calculations, and add a test that a long non-derived label is not replaced by key words).

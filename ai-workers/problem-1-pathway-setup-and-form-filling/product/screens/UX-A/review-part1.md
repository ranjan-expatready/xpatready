# UX-A part 1 review: one definition per count (commit 9f2229e3)

Reviewer agent (did not build it), 2 Nov 2026. I checked commit `9f2229e3` on `claude/friendly-davinci-dfsq83` against `origin/main` (merge-base `079ef107`). Spec: BACKLOG row UX-A (P-273), finding 1 of `screens/UX-baseline-2026-11-02/findings.md`. There is no `concept.md` for UX-A, so the row's "Done when" is the bar.
Run: an isolated copy `rev_uxa1` on :4446 with the web rebuilt at this commit, then `POST /api/demo/load` (`x-actor: user-A`). Live AI was off and nothing cost money (US$0). The builder's `check_uxa1_counts_browser.cjs` passed 41/41 on my copy (screenshots went to scratch). Journey test: `journey-test-reviewer-2026-11-02-part1.md`, **8 / 10**.

## Verdict: Block

One Major is open (M1). Every other part of the Done-when holds on the screens I walked.

## What holds (evidence)
* **Forms.** Visitor visa shows "2 forms · 0 set up" on the setup strip, the Overview tile ("2 / 0 set up"), the Forms tab header ("On this combination: 2 forms · 0 set up") and its filing line. LMIA shows "8 forms" in the same four places. `summary.setup.counts.forms` equals `row.forms.length`.
* **Removal through the UI.** On LMIA I used Actions → Remove IMM 5475 → confirm. The tab changed to 7 at once. After a reload, the strip, tile, finder and filing line all said 7, and "Removed in this draft" was listed. Undo brought all of them back to 8. The check's removal fail case does catch a regression: IMM 1295 has a recognised Form attachment (`source_attachment`), so dropping `removedInDraft` would leave the count at 8.
* **Questions.** LMIA: the Overview tile and strip say 377 = Questionnaires chips 143 + 110 + 109 + 15, and the tile names each part. The Preview principal chip says 143. The Preview heading says "What Principal applicant is asked · 83 of 143 questions". The 18 section counts add up to 143.
* **Form facts.** The strip is labelled "Form facts" (333). The principal's line reads "120 form facts (22 of them once for the application)", the same as the dialog. The API agrees: plan roles 98 + 22 + 101 + 97 + 15 = 333. Spouse 101, child 97 and representative 15 also match the fact-sources rows.
* **Badges.** "Forms 4 to do · Documents 1 to do · Review and release 1 to fix". Each tab's `aria-label` is exactly its visible text and the badge is `aria-hidden`. Tabs with nothing open show no number.
* **Widths and axe.** 1440, 1024, 720 (200 % zoom) and 400 px: no sideways scroll and badges stay on one line. axe WCAG 2.2 A/AA is clean on Overview, Forms, Questionnaires, Preview and Review at 1440, 720 and 400.
* **Roles.** The reviewer (user-C) sees the same counts.
* **Errors.** No console or page error on any walk.

## Blockers
None.

## Majors
**M1. Visitor visa's Review and release tab says the combination "has no forms". Every other screen says "2 forms · 0 set up".** Screenshot: the release validation of Visitor visa reads "error · Release · Nothing to release yet: this combination has no forms and no documents…", while the Overview and Forms tab of the same combination say 2 forms. The text comes from `api/src/studio.ts:77` (`EMPTY_WORDS`), which fires on `s.forms.length` (lines only, `studio.ts:79`). That is the same kind of disagreement finding 1 recorded ("Overview 0 forms" against "2 forms on this combination"). It breaks the Done-when "the same count on every screen for Visitor visa", on the screen that blocks release.
*Fix:* reword it so it agrees with the one definition, e.g. "no form is set up yet (2 are attached) and no documents", or plain "no form set up yet", with the words taken from `contracts/counts.ts`. Update `tests/check_f8_empty_release.ts:22`. Add a fail case to `check_uxa1_counts_browser.cjs`: when `counts.forms > 0`, no tab of the combination says "no forms".

## Minors (fix or list in the PR)
* **m1 (your question 3).** LMIA shows "Forms 2 to do" right above a ✓ Forms step reading "8 forms". The badge now says what it counts, so it meets the row. But both open items belong to Official pages and Who can be in this application. The tip ("2 setup items open on Forms") does not name them, and a `title` cannot be reached by keyboard or touch. *Fix:* the tip and the tab panel name the steps ("2 to do here: Official pages, Who can be in this application").
* **m2.** Visitor visa Overview: the badge says "Review and release 1 to fix" while the Rules and checks tile says "no problems". `combination.tsx:69` counts every draft error, but `overview.tsx:20` counts only rule problems. These are two definitions of "problems". Carry it to part 2 (findings 2 and 7).
* **m3. Second computations are still in place.**
  * `questionnaires.tsx:427` gets the footer's "143 questions for Principal applicant" by summing section lengths without de-duplication. It should use the chip's count.
  * `questionnaires.tsx:420-429` works out per-person form facts with its own rule (application facts also go to a non-principal when placed in their section, de-duplicated by fact). `factsByPerson` gives all application facts to the principal. The two agree in the sample only.
  * Fix both by using one helper.
* **m4.** `counts.forms` is computed as `lines + sources`, where sources are keyed by `edition ?? officialFile ?? id` (`programs.ts:191`). The card's list, `leaf.forms`, de-duplicates by `edition ?? officialFile ?? "Form"` (`programs.ts:188`). The two can differ for an attachment with no edition. *Fix:* derive both from `forms.length`.
* **m5.** The Forms tab now depends on the summary:
  * While it loads, the finder says "Forms on this combination" plus START.body "…Nothing was spent yet", and the filing line shows "· … ·" (`finder.tsx:150-151`, `forms.tsx:127`).
  * If the summary fails, these stay that way with no message and no Retry.
* **m6 (your question 1).** `questionCounts` measured 37–108 ms per call on LMIA (warm to cold, on a busy machine), close to the ~70 ms you reported. In the sample only LMIA has content. The catalogue's cold first view took 776 ms, which is inside the 1 s budget, and a rebuild after each edit took 160–340 ms. That is acceptable at sample scale (STANDARDS §9). It grows with each configured combination because every edit recomputes all of them. *Fix:* memoise by the snapshot's `sha256`, which `buildSnapshots` already returns.
* **m7.** The new check's labels do not name what they prove (WAY-OF-WORKING: check labels name the capability IDs). Prefix them with "UX-A1:" if no C-ID applies.
* **m8 (observation).** The Preview shows "Child 2 · 108 questions" next to "Child 1 · 109", and Questionnaires shows "Child · 109" (the first child stands for the role). The cause is per-person and not wrong, but nothing on screen explains it.

## Your other questions
* **(2) Other screens.** The Programs cards and list, Structure, Release, AI work and To review show no forms or questions count. Only these remain:
  * The Visitor visa release error (M1).
  * The Preview's per-person "7 forms" and "Forms (7)". These are labelled for the person and are correct, since the principal files 7 of the 8.
  * The Documents tab's "10 facts" per document. That is a different measure, labelled "Facts it supplies", and is fine.
  * The "Programs panel" named in `contracts/counts.ts` no longer exists. Drop the mention.
* **(4) WCAG 2.5.3.** Met. The accessible name equals the visible text ("Forms 4 to do") and starts with the label, so voice control works with "Forms". The fuller words are in the `title` (see m1).

## D1–D20 (only those this row moves)
D1 4 (row met except M1) · D2 5 (one rule for removal on the server and the tab, no extra writes) · D3 4 (one contract, m3/m4 leftovers) · D5 4 (reload/undo consistent; m5) · D8 n/a · D9 3 (m1) · D10 4 ("2 forms · 0 set up", "to do/to fix" plain; M1 wording) · D11 4 (instant update on removal; "…" placeholders) · D12 5 · D13 5 (axe clean, 400–1440, keyboard tab names) · D14 5 · D15 4 (budget met; m6) · D16 4 (pass and fail cases bite; no ID labels) · D18 4 · D17 and D20 not scored: simulated only.

## Code read
One query added per rebuild (`combinationForm.findMany` for the workspace), not one per row. There is no migration. `formsSetUp` was added to the shared `Counts` contract, and the PR's first line must name it. `removedInDraft` is shared by the count (`programs.ts`) and the tab's list (`workspace.ts`). Questions are computed in the engine, so the server, the chips and the Preview use one function (`question-count.ts`). No authorisation changes.

## Not checked
A real screen reader. An intended user's unaided walk (D17/D20). `run-suites.sh --changed`: another session was running suites in this copy, so I left it to CI. A same-machine before/after timing of the catalogue (the base copy did not start). 200 % zoom was approximated with a 720 px viewport.

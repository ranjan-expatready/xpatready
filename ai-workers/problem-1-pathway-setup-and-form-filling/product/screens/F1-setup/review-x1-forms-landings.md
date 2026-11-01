# Review: X1 forms landings (`?focus=forms:sources|lines|problems|held`), commit 2e3ea7e8

Reviewer agent, 1 Nov. Fresh context; I did not build this. Branch `claude/forms-focus-landings`, from main 751cbc42, checked out at /home/user/w3. Ask: the tech lead on PR #186, from screens #206 finding 6. Judged against `W1-setup-checklist/concept-draft.md` §3 row 3, §6 (`where` → "Forms · the line"), §7 and §8, the engine items (`engine/setup-checklist.ts:124-129`), `STANDARDS.md` and `EXPERIENCE.md`. It is a small change, so the review is proportionate.

**Verdict: Approve**

No Blocker and no Major. The Minors below should be fixed but are not gating.

## Runs (own copy `forms_rv3` on :4455, fresh start for each suite, US$0, copy stopped afterwards)
* `check_forms_focus_landings_browser.cjs`: **26/26 pass** (28 s).
* `check_x1_tabs_focus_browser.cjs`: **29/29 pass**.
* `check_w1_before_forms_browser.cjs`: **23/23 pass**.
* My own journey script (in /tmp, not committed): the results are in `journey-test-reviewer-2026-11-01-x1-forms.md`.
* `tsc --noEmit` on web is clean. `graph.mjs --check`: G1–G6 have no new gap (the only G3 is the old `/attachments/:id/file`).
* Note: the suites rewrite committed screenshots in `F1-setup/screenshots/x1*` and `W1-setup-checklist/screenshots/before-forms/`. I restored them with `git checkout`, so my working tree is the commit.

## The questions asked
1. **Do the counts match the checklist, with no recount? Yes.**
   * `forms:sources`: the line reads "Not set up yet: 3 forms can be added…", and the item says count 3. This is asserted in the test.
   * `forms:held`: the notice uses the summary's `row.held`. That is the same deduplicated list whose length is the engine's `s.held` (`api/src/programs.ts:191,215`). The top-level `summary.held` is not deduplicated. I walked two held uploads of one edition: the checklist said "Review new edition", count 1, and the notice showed one edition, so this choice is correct.
   * `forms:problems`: the walked case had 1 counted and 1 listed as "Blocks release". A release-only problem: the notice title takes `released.count` from the checklist item itself.
   * No number is recomputed on the web, apart from the edition count in the held title, which is the same list. One caveat (Minor 4): the list and the engine's count come from two different validator calls.
2. **Do the moved filing problems affect existing suites? No.**
   * The `<ul aria-label="Filing problems">` keeps its label, markup and position under the table. It is now wrapped in `[data-forms-problems]`.
   * Only `check_s5_slice2_browser.cjs:60` reads that name, through `getByRole("list", { name: "Filing problems" })`. The role and name are unchanged.
   * x1 and before-forms are green on a fresh start.
   * BeforeForms also calls `useFocusItem` on this tab. Both hooks may land the same element and both clear `?focus=`, which is harmless. I saw no double outline and no jump back.
3. **Is the held notice's copy right, and does it duplicate anything? The copy is right, and nothing else on Forms says it.**
   * "A new edition is waiting for its impact review: IMM 1295 (02-2099) … This combination keeps using the edition in the library until a person reviews what changed. Review it on To review."
   * It matches P-32 and the menu word "To review" (`PRODUCT.md` §3), and it uses no system words.
   * The To review badge shows 1 for the held item (`04-held-1440.png`). I did not confirm the row's text there: my text search found nothing, probably because of my hand-made intake row. The Overview card is report-only. See Minor 6 for the link target.
4. **Is the separate `combination-summary` fetch OK? Yes.**
   * It uses the same key and URL as `pages/combination.tsx:60`, `components/before-forms.tsx:25` and `components/part-problems.tsx:15`, so the data is shared through the cache.
   * `staleTime` is 2 s (`lib/api.ts:29`). The new observers mount together with BeforeForms, so at most one deduplicated refetch happens. There is no request per row.
5. **Forbidden patterns (silent waits, silent skips)? None.**
   * Every landing waits loudly (`[data-focused]`, 15 s, fails if absent).
   * The fixed sleeps come after a loud wait. They are: 800 ms in `noLanding` to prove that nothing lands, 2200 ms to prove the 2 s outline goes away, and 200 ms after a resize. They are padding after a loud wait, the precedent accepted in `W1…/review-f6-c42-marking.md:38`.
   * There is no `.catch(() => …)` that swallows an assertion, and a missing fixture throws.

## Findings
**Blocker:** none. **Major:** none.

**Minor**
1. **The words-only condition is now said twice on Forms.**
   * The existing warn notice "1 condition is in words only … Release waits for it" (`forms.tsx:112`) is above the table.
   * The new "Other form problems" list under the table repeats it as "Blocks release: Turn "…" into a rule: the condition is in words only…" (`forms.tsx:339,347`).
   * Walked: two blocks on the page for one problem (`03-problems-1440.png` with `04-held-1440.png`).
   * Fix: give the notice `data-focus-also="forms:problems"` and leave the "Turn … into a rule" messages out of `more`, or drop the notice when `more` holds them.
2. **The landing is not "the line" (concept §3 "Forms · first open line", §6 "Forms · the line").**
   * `forms:lines` outlines the whole table (`forms.tsx:113`), and `forms:problems` outlines a list under the table.
   * The ask named these targets, and the sample's tables have 2 rows, so the ring is seen (vv.single and sv.super_visa: top 694–714 of 900).
   * On a long table, `block: "center"` puts the ring's edges off-screen.
   * Fix later, or record that the Lead accepts it: put `data-focus` on the first `tr[data-pending]` or on the unmapped `tr[data-line]` row.
3. **The release-only branch has no test.**
   * The `released` notice in `FormsProblems` (`forms.tsx:340,348`) is new code, and removing it fails no test.
   * I walked it: the release's form condition was broken by SQL and the draft was clean. The link `/forms?focus=forms%3Aproblems` landed on "The released version has 1 form problem: firms cannot open cases … Review and release", so it works.
   * Fix: add the pass and fail cases that `check_x1_tabs_focus_browser.cjs:102-120` has for Questionnaires.
4. **The list and the count use two validator calls.**
   * The checklist counts `validate(snapshot, library, derived)` *without* `accepts` (`api/src/programs.ts:163`).
   * The Forms list (`filing` from `workspace.ts:72`, and `draft.problems` from `studio.ts:341`) uses `accepts`.
   * So a "not accepted by IRCC" channel error (`engine/channels.ts:126`) shows here as "Blocks release" but is not counted, and the step can read ✓.
   * This is a pre-existing engine gap that the new block makes visible; I did not reproduce it with the sample. For the Lead: pass `accepts` in `programs.ts:163`.
5. `FormsProblems` filters on `p.where === "Forms"` (`forms.tsx:339`) where `PartProblems` uses the engine's `WHERE_STEP` (STANDARDS [M] "no duplicated logic between web and API"). It is equivalent today; use `WHERE_STEP[p.where]?.step === "forms"`.
6. **The held link goes to To review, not to the item.**
   * The link goes to `/review`, and the person has to find the edition there.
   * `summary.held[].id` exists, and the item's own page is `/review/edition/:id` (`App.tsx:105`).
   * Fix: link to the item when there is one held edition. The approver sees the notice too, but the item waits for the author; the link still works.
7. **The landed block lists warnings before the counted error.** It reads Warning ×3 and then Blocks release (`03-problems-1440.png`). Put the errors first, or use PartProblems' danger Notice and its title "n problems to fix…".
8. **A stale link fails silently.** `useFocusItem([])` never says "This was done since you opened it", and a key whose target is gone keeps `?focus=` in the address. This is the same open Minor as on Documents and Questionnaires (`review-x1.md` m5).
9. **Test evidence.**
   * The 390 px screenshots are taken after a resize that scrolls the landed element away (`02-lines-390.png` shows Before forms).
   * Step names carry no capability ID (P-86, as `review-x1.md` m7 asked: `C11.10: …`).

## D scores (this slice only)
D1 4 (all four keys land with the engine's counts; m1, m2) · D2–D4 n/a (read-only) · D5 4 (reload and Back do not jump; an unknown key is harmless; m8) · D8 4 · D9 4 · D10 4 (plain copy; m1 duplicates) · D11 4 (ring seen, 2 s) · D12 4 (team Notice and Pill) · D13 4 (axe clean at 1440 and 390 px; keyboard Tab → link → Enter; no overflow at 1024 px or at 720 px, i.e. 1440 at 200 %) · D14 4 · D15 5 (landed in 553 ms; shared query) · D16 3 (26/26 pass; m3, m9) · D18 4 (held edition named, To review linked) · D17, D20: simulated only · D6, D7, D19 n/a.

## Journey score (reviewer, the one score for this check)
**9 / 10, pass.** Details: `journey-test-reviewer-2026-11-01-x1-forms.md`.

## Could not check
A real screen reader; an intended user's unaided walk (D17 and D20 stay with the founder); a long table for `forms:lines` (the sample has none); the accepts-only error of m4 end to end.

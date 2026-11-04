# C4.2 — unasked fact, section names, "Still asked": review

PR #866, branch `claude/optimistic-bohr-mk1zo5`, reviewed commit **5e9c3fc6** (base `origin/main` 9caa043b). The PR head
has since moved to e3679c44, which adds only `product/qa/built/C4.2.md` (one line). The code is the same, so this review
covers both commits. Reviewer: a fresh agent that did not build this. Concept: the tech lead's brief (three parts) and
ruling P-294 (B) on #688. There is no `concept.md` for this item. Journey test:
`journey-test-reviewer-2026-11-04.md`, **8.5/10**.

## Verdict: Ship after fixes (Block: 1 Blocker, 2 Majors)

## What I checked and saw
* `acceptance/C4.2.test.ts`, each run on a fresh isolated copy (ports 4460–4463): `wp.family` **10/10** twice; Visitor visa
  after `tests/runtime/setup_visitor_visa.ts` (13/13) **10/10**. `tests/check_c42_still_asked_browser.cjs` **12/12**.
* Walked as the content publisher at 1440 px, with no API shortcut. I opened Study permit (no sections chosen), clicked
  Forms › "Add from library" on IMM 5707, then opened the Smart questionnaire (SQR) tab. Three sections read "Still
  asked: IMM 5707 needs these answers." (the one-form wording). The six-form wording ("… and IMM 5707 need …") shows in
  the builder's check. Chosen sections show no line. "Remove from questionnaire" is hidden on a section that is still
  asked. axe: 0 violations. No sideways scroll at 1440, 1024, 512 (200 % zoom of 1024) or 400 px. Keyboard only: Tab
  reaches the section toggle and Enter collapses it, with a visible 2 px outline. No page or console errors. The view
  answers in 0.08–0.23 s.
* Concept fit: (1) the case is now truly unasked (`placed:false`). It expects the release error and the 422, and PACK-2's
  row is updated. Met. (2) Preview, the case (render.ts) and the SQR tab use the library title. Met for those screens;
  see M1 for the Review tab. (3) The "Still asked" line is met, and shows only where it should: on a section not chosen
  that asks this person something (`questionnaires.ts:95-96`; a section that asks only other people is not listed for
  this person).

## Issues (ranked)
**B1 Must — CI is red: Gate B refuses the PR's own pack.** On e3679c44 (same code), shard 1 printed "Gate B refuses:
C4.2.test.ts on the six: exit 2". Gate B runs a pack whose run line has no setup step on the six (`tools/gate-b.mjs`
:15-17, :212, :233). C4.2's run line (`acceptance/C4.2.test.ts:8`) names no setup, so QA-144 stops it there. Nothing
merges on red (merge guard). Fix: put the setup it really needs in its run line (`tests/runtime/setup_visitor_visa.ts`,
so Gate B runs it "fixture only", as the build notes already say). Otherwise, ask the tech lead for a ruling on the PR.

**M1 Must — raw section keys, and words that contradict "Still asked", on Review and release.** `engine/validate.ts:100`
gives every pulled question the warning "Placed in section personal_details, which this combination's questionnaire
does not use." This is the state this PR names on the SQR tab. In my walk, Study permit's Review tab listed 24 such
warnings (background_declarations, contact, personal_details, travel_document, your_visit …). They show raw keys, which
breaks P-91 and the EXPERIENCE [M] line "no hashes, IDs … on the main path". They also say "does not use" where the SQR
tab says "Still asked", which breaks P-294 (B). The line is older than this PR, but brief part 2 is exactly this key.
Fix: name the section by `section_titles`/`sections` and reword to match (B). For example: "Asked in "Personal
details" because IMM 5707 needs it, though this combination does not choose that section." Add a fail line to the
browser check.

**M2 Must — keeping `section_titles` out of the fingerprint means a new title is never released.** Probe on a fresh copy:
I took Personal details out of Visitor visa and released it (v2). The snapshot carries `[{"personal_details","Personal
details"}]`. I then renamed the library section to "About you". The SQR tab showed "About you", but `matches_release`
stayed true, the change list was `[]`, and Submit answered 400 "Nothing has changed since the released version." The
release, which cases read, keeps the old title with no way to release the new one. A chosen section's rename would be
a change, because `sections[].title` is hashed. So the same words are treated differently depending on whether the
section is chosen. The same cause breaks the build note "an older release keeps its key until it is released again":
Submit refuses that re-release. One more gap: `publishRow` publishes only `snapshot.sections`
(`api/src/studio.ts:1184`), so a draft library title in `section_titles` is frozen into a release while its section row
stays a draft. Fix: hash `section_titles` (present only when there are any, so releases without pulled sections keep
their fingerprint). Remove `section_titles` from the `snapshotHash` and `assemble` exclusions (`engine/snapshot.ts:85`,
`:223`). Add a change line for a title added or changed (`validate.ts:269`; the expert signs words, as for sections).
Also publish those sections at release (`studio.ts:1184`). Add a fail test that renames a pulled section and expects a
change. The other readers are consistent today: `case-prepare.ts:71`, `answer-key-gate.ts:69`, the release recheck
(`studio.ts:1198`) and `matches_release` (`studio.ts:429`) all use the same hash. No snapshot schema validates the keys.

**Minors (Should)**
* m1 `stillAskedWords` (`contracts/workspace.ts`): the one-form and no-form wordings are never tested. The check covers
  six forms only; I saw the one-form wording by hand. Add a test line for each.
* m2 The browser check reaches the "taken out" state with an API DELETE on a section that has questions. The screen
  never offers that (QA-93: "Remove from questionnaire: not here"). The path a person can take on the screen is a
  section that was never chosen, plus an added form (my walk). Add that path to the check.
* m3 On a combination with no chosen section, "so its questions follow the chosen sections" reads oddly. The line
  also does not say how to give the section a place ("Add a library section…" is just above).
* m4 The pack's SQL repoint (`update form_field_map … where canonical_field_key=…`) has no workspace or edition filter.
  This is fine on a fresh copy; scope it to the copy's workspace.

## Code judgements asked for
* **The fixture is a fair stand-in, and the test proves the rule.** No US$0 screen path makes a form field read a fact
  that has no library question (P-158), and the suites use the same SQL pattern. The rule under test is
  `fact-sources.ts:275` (`tick && !f.placed`), reached through the real PUT. The probe has no fact_source row, so
  `source` is null and line 273 cannot fire. Removing line 275 therefore turns the tick into 200 and fails the case. The
  release half matches any person's gap for the probe (it matched "Child: …"); that is acceptable.
* **The "Still asked" line shows only where it should.** It appears on a section not chosen that asks this person
  something. Its wording is right for one form ("needs") and many forms ("A, B and C need"). For no forms it says a
  rule or condition reads them (untested, m1).
* No migration, no new route, no per-row request. Authorisation is unchanged (403s re-run in the pack).

## D1–D20
D1 4/5 brief parts met; M1 left · D2 5 one PQR record, 409 on a race (pack) · D3 5 nothing new to the library · D4 4
unasked fact blocked at release and on the tick; M2 · D5 5 reload and stale tab (pack, check) · D6 3 a title change of
a pulled section leaves no trace (M2) · D7 n/a, no AI · D8 5 breadcrumb and tabs unchanged · D9 4 no "how to choose it"
(m3) · D10 3 raw keys on Review (M1) · D11 5 · D12 5 the screenshots · D13 5 axe 0, keyboard, 1024 px, 200 %, 400 px ·
D14 5 team tokens · D15 5 0.08–0.23 s · D16 4 one rule, and a test that fails without it; m1, m2 · D17 simulated only ·
D18 5 names the forms that need the answers · D19 4 configure, release, case titles; M2 · D20 simulated only.

## Graph (P-86)
`graph.mjs`: G3 9, G4 0, G5 0, G6 3. Nothing touches this item. C4.2 is named by 6 tests.

## Could not check
A real screen reader. An unaided walk by an intended user (D17 and D20 stay with the founder). The bare-six path
(QA-144). CI shards 2–6 (cancelled after shard 1 failed).

**Verdict: Block.** Fix B1 (CI red: Gate B, C4.2 exits 2 on the six), M1 (raw section keys and "does not use" on Review,
`validate.ts:100`) and M2 (`section_titles` outside the fingerprint, so a new title is never releasable). Minors m1–m4
can be fixed or listed in the PR.

## Round 2: diff-only check, 5e9c3fc6..64c5d01a
I re-ran everything on fresh copies (ports 4464–4466):
* `tests/check_c42_section_titles.ts`: **12/12**.
* The pack by its new run line (setup Visitor visa, then the pack): **10/10**.
* `tools/gate-b.mjs` locally: "fixture only … exit 0, 10/10 · Gate B: passed".

* **B1 closed.** The run line names `setup_visitor_visa.ts`, so Gate B runs the pack on its fixture and it passes.
* **M2 closed.** `section_titles` is hashed (`snapshot.ts:86`, `:224`). `diff()` lists "Section name" added or changed
  (`validate.ts:238-243`; `needs_sme: false`, the same as a chosen section's rename). `publishRow` publishes those
  sections (`studio.ts:1184`). The new check proves the full cycle: rename → one change line → released with the new
  title, the row PUBLISHED and nothing left to release; Preview shows the new title. The other hash readers are
  unchanged and consistent. The knock-on is acceptable: an older release with pulled sections shows one "Section name
  … added" until it is released again. That is truthful, because its cases show the key. The six on the demo had no
  pulled sections in my round-1 survey.
* **M1 narrowed, still open (Must).** The warning's words are now right: one per section, by title, in line with (B).
  But its `item` is the section key, and the Review and release tab prints the item. My screenshot of Visitor visa
  › Review and release reads: **"Questions · application_details: "About you (C4.2 test)" is not chosen …"**. Drift
  check 2 (`validate.ts:132-138`) gives a label only to field codes. So a raw ID is still on the main path (P-91,
  EXPERIENCE [M] line 46). The new test's "no release line names a section by its key" checks `message` only, which is
  why it passes. Fix (one line): give this warning `label: pulledTitle.get(id)` (or the section's title), and assert in
  the check that the rendered row (or the item and label) never carries the key. Screenshot:
  `/tmp/claude-0/-home-user-xpatready/c725ca3f-011d-569c-9440-2f68026325ee/scratchpad/keep/r2-review-key.png` (not committed).
* m1 closed (the one-form, several-form and no-form wordings are tested). m3 closed (the new words say where to add the
  section). m4 closed (SQL limited to the workspace). m2 is left as listed in the build notes, which is acceptable for
  a Minor.

**Round 2 verdict: Block.** One Must is left: M1's raw section key in the Review and release row prefix
(`validate.ts` new warning, `item` = section id with no `label`). Once that one-line fix and its test assertion are in,
nothing else is open from my side.

## Round 3: diff-only check, 64c5d01a..57a61a22 (the last round; tech lead ruling (a))
I re-ran on fresh copies (ports 4467–4468, US$0):
* `tests/check_c42_still_asked_browser.cjs`: **13/13**.
* `tests/check_c42_section_titles.ts`: **12/12**.

* **M1 closed.** The pulled-section warning now carries `label: <title>`, and its message starts "<title>: not chosen …"
  (`engine/validate.ts:104-105`). `review.tsx:21-22` `problemLine` prints the message alone when it starts with
  `<label>:`, so the row reads once: **"Questions · Personal details: not chosen for this combination, …"**. I confirmed
  this in my own run's screenshot (5-review-warning-1440.png). The key appears nowhere in the row. The API check
  asserts `label === title` and the start of the message. No other test or code relies on the old wording.
* m5 (new, Should; does not block): the browser step clicks the first "Show all" on the page. That is the sources
  panel's, so Validation of the draft stays at 8 of 22 rows, and "no row shows its key" covers only the rows shown.
  The API check covers the full list. Scope it to the validation panel's own "Show all 22".

**Round 3 verdict: Approve** on 57a61a22. No Blocker or Major is open. Minors: m2 (the browser check takes the section
out by API) as listed in the build notes, and m5 above.

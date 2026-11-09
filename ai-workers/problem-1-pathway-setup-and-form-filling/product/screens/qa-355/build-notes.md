# QA-355 — an added form never spoils the release's facts (C7.8, screens lane, 9 Nov)

Bug: qa's #1446, `product/qa/BUGS.md` QA-355, `product/qa/reports/2026-11-09-c78/`. Ruling: the tech lead on #1446 (P-294).

## What changed
* **(b), the cause.** `engine/options.ts` `namesNoValues`: a map note that names no values is read as no list, the same
  rule as QA-272's ranges: a range (`01..09`, `01-09 as listed`), a note naming the inventory or the PDF's own options
  (`inventory`, `options_resolved`), or **codes** said to be as listed elsewhere (`codes … as listed / as in / listed
  in|for`). Review m3: only codes are read that way, so a label such as "Same as in passport" stays a label (the first
  version also matched a bare `as in` or `this form`). `shapeOf` (`engine/runtime/case.ts`) uses it in place of
  `isCodeRange`. IMM 0008's `code_list:imm0008.country_of_birth (codes as listed in the inventory)` no longer becomes the
  only answer the shared country and language facts accept.
* **(a), the guard.** After (b), the reach check below still showed real value lists on other library forms that would
  close facts the release reads with no list, if those forms were added. So, as the ruling says, (a) is in this PR:
  `judgingMaps(s, form)` in `engine/runtime/case.ts`. A map marked `added` (the one join point, `withAdditions`) judges
  only its own copy: `checkValue(…, form)` from `engine/runtime/forms.ts` (a copy's coverage) passes the form; every
  other caller (the question, the case's checks, readiness, documents) gets the release's maps only. That covers the
  choice list, the `max N char` limit (an added form's shorter box limit also tightened the release's facts before) and
  the box formats (`snapshotFieldFormat`). The filtered snapshot is the same object per snapshot and form, so
  `snapshotFieldFormat`'s WeakMap cache still holds; with no added form the snapshot itself is used (no cost).
* No form number or combination key in code (P-319, P-425): added maps are told apart by the `added` flag the join sets.

## Reach check (why (a) was built), the configured checkpoint, after (b)
`reach_of_added_lists.ts` over the published library maps and the 6 release snapshots. Release facts read with no list
and no answer list that an addable form's real list could close:
* `person.current_residence_country`: IMM 5710 `only option: Canada=511` (5 of 6 releases): a Visitor visa applicant
  living in India would get "Choose one of: only option: Canada" on IMM 5257.
* `person.occupation_province_state`, `person.education_province_state`: IMM 1294 and IMM 5710 Canadian provinces
  (2 releases): a state outside Canada would become a fix on the release's own forms.
* `person.previous_residence_status`: IMM 5257, IMM 1294, IMM 5710 status lists (2 releases).
* `relationship.relationship_to_subject`: IMM 5406's sibling and children lists (1 release).
On today's checkpoint only IMM 0008 and IMM 5707 can be added as "fills" to the Visitor visa filing, so these are not
reachable there today; they become reachable as soon as one of those forms passes a fill trial. Unit tests cover them.

## (b) also opens two release-form notes (review m3, recorded)
The rule is not only for added forms: it reads every map note. On the configured checkpoint it changes two release lines,
both for the better:
* IMM 5257 SCH1's four country facts had the note "codes exactly as in options_resolved…": before, the fact was judged
  against fragments of that sentence (no real answer could match); now it is open, as the form's own list is what the
  filler uses.
* IRM 0002's sex identifier note "F Female / M Male / X Another gender; inventory does not separate code from label…"
  does name values, but not as a list: before, the only accepted answers were two fragments of that sentence (split at its
  comma); now the answer is
  open (up to its box length). Making it a real list ("Female=F, Male=M, Another gender=X") is a map fix for the forms
  lane, not this PR.

## Tests
* `tests/runtime/check_case_engine.ts`, QA-355 block: notes that name no values / real lists stay lists; the join with
  "codes as listed in the inventory" leaves the release's choices and check; (a) an added form's own list and limit never
  change the release's shape, check or options, and do judge its own copy; the same object per form. Each rule fails
  without its fix (shown in the PR: 80/81 without (b), 81/83 without (a)). After review: m1 (a copy's coverage judges the
  added form by its own list and the release form by the release's: fails when `forms.ts` stops passing the form), m2
  (on the added form's own copy "codes as listed in the inventory" is no list: fails without (b) in `shapeIn`), m4 (a
  release form's copy shares the case's view); each mutation measured 85/86.
* `acceptance/C7.8.test.ts` step **C7.8-19 "release forms unchanged by an add"**: every form that fills (picked from the
  panel's list by kind) is added and removed on an answered case; every release form's lines (written, to fix, ready /
  needs, open fields) are the same before, after the add and after removing; each added copy has `to_fix` 0.
  Before the fix: `C7.8-pack-before-fix.txt` (19/20, only C7.8-19 red, the step's first text, IMM 0008 only);
  `check_qa355-before-fix.txt` (1/2). The final step on main's engine files: `C7.8-pack-final-step-on-main-engine.txt`
  (C7.8-19 red; C7.8-16 red only from the reused copy, review m5).

## Walk (P-352), 1440 px, by screens
`walk_qa355.mjs` on a filing at Ready · 100% (qa's `walk_c78_setup.mts`): IMM 5257 and IMM 5645 read "111 of 166" and
"25 of 119" before and after adding IMM 0008 through "+ Add a form" (`walk/02`, `03`, `05`, `06`); Ready to file after
the add lists only IMM 0008's own lines (validate, mandatory fields, signature) and the review asked again, no fact line on
a release form (`walk/07`; qa's run had 4 + 3 CRITICAL fact lines); IMM 0008's row reads "Every fact it reads is
confirmed" (`walk/08`; qa's run: "Not yet: 4 facts to answer or confirm"). No page error.

## Seen, not changed (outside QA-355)
* IMM 0008 (a permanent residence form) as the Visitor visa filing's "fills" pick leaves 76 fields IRCC marks mandatory
  empty ("no question asks it yet"), so its Validate round trip is unlikely to pass without passing that line; qa's
  gate A (b) asks for "filled: validated, Filed". That is the pick of the library, not this bug.
* QA-356 (an added form reads "The combination's default.") stays open: Minor, a separate words fix.

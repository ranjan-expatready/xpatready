# BK-15 review: fees per family member as data (PR #1591 at 2ff49d6d2)

Reviewer (fresh context, did not build it), 11 Nov 2026. Money change. Evidence: suites and mutations on an extract of
2ff49d6d2 (`git archive`), and my own copy :4458 (`isolated.sh rvbk15`, started before the builder's uncommitted edits
in this clone at 18:58 UTC; server without watch, so it ran 2ff49d6d2), configured checkpoint loaded, cases opened by
the case officer. Never :4400. Live AI off, US$0. Journey report: `journey-test-reviewer-2026-11-11.md` (score 7/10).

**Verdict: Ship after fixes** (three Majors; the headline family and Visitor visa are right).

## What holds
* Headline family (student 30, spouse 31, child 15 who studies, child 9): 4 filings, "Study permit (outside Canada)",
  "Work permit", "Study permit", "Visitor visa"; CAD 150 + (155 + 100) + 150 + 100 + biometrics capped 170 (child of 9
  exempt) = **CAD 825**; answered No: **CAD 775**. Walked by keyboard in the Agent view (Edit, dialog, Yes, Save): the
  filing and total change at once; audit line "Case officer changed person.studies_six_months_or_more"; old answer kept.
* Visitor visa unchanged: `vv.single` has no `fees_by_role`, so `charged` falls back to the line's roles; family of 5 =
  CAD 500 "not above the family maximum", family of 6 capped at CAD 500, biometrics CAD 170; vv suite 61/61.
* Edges (pure, on the commit): family of 6 on Study permit (4 visitor visas = CAD 400, below the CAD 500 cap under any
  reading of "family of 5"); spouse 80 and child 5 exempt from biometrics; a child with no date of birth waits; a spouse
  or studying child not travelling files nothing; a spouse with no `fees_by_role` entry leaves the case unpriced, in words.
* Unsound `fees_by_role` (unknown line, never-applicant role, empty, duplicate, blank name): not derived, not guessed.
* No pathway or form name in engine code: B164 guard 52/52; the added lines name concepts only in comments.
* Data cited: Guide 5269 quote checked in the saved copy (`official-sources/ircc/instructions/guide-5269.html`); fee
  lines are the table's existing cited lines; OWP eligibility, visa-exempt child and CAQ are labelled Sample on the case.
* Server: `/prepare` 200 for the officer only (author, approver, client 403; no actor 401). No migration, no new route.

## Issues (ranked)
1. **Major (Must) — a child's fee is guessed when "6 months or more" is not answered** (BR-10 "Fees are never
   guessed", B5 BR-5 "a line waiting for a fact"). `engine/runtime/added-filings.ts:30` drops a rule that cannot be told
   yet (`applies !== true`), so the child is priced as a visitor visa with a total "worked out". Seen live: Child V never
   answered → "Visitor visa: Sample Child V", CAD 100, "Total for this submission: CAD 825"; an invalid "maybe" (saved
   with "Answer yes or no.") also priced CAD 100. The suite asserts the guess (`tests/check_bk15_fees_by_role.ts:49`
   "or is not answered"). Fix: an undecided rule makes that person's filing and fee lines wait ("Not counted yet",
   total "so far"), as the date of birth does; pass and fail lines for unanswered, invalid, Yes, No.
2. **Major (Must) — the release warns the author to overcharge on the shipped Study permit.** `engine/validate.ts:128`
   lists every line reaching the role, ignoring `fees_by_role`; the release's draft problems on :4458 say: "Work permit
   fee …, Open work permit holder fee …, Visitor visa fee … charge each child on this combination … Name them among the
   filing's fee lines". Following it would charge a studying child CAD 355 more. Fix: with `fees_by_role`, "missed" is
   only that role's own lines not named; a test that the shipped Study permit raises no such warning, and one that does.
3. **Major (Must) — a release whose child line is still `on_principal` prices a visitor visa on the student's study
   permit application.** Released v2 on :4458 with child On the principal's (saved with BR-7's warning only): "Study
   permit (outside Canada): Sample Student R" carries "Visitor visa fee · for Sample Child W CAD 100", total CAD 570
   "worked out", while the basis says each family member files their own. Any earlier Study permit release kept in a
   database (the checkpoint seeded `on_principal` until this PR) goes the same way. Fix (generic, as BK-13 C5 proposed):
   with `fees_by_role`, a person applying on someone else's application is not priced; `fees_why` says so (BR-10).
   Plus pass and fail lines.
4. Minor — `fees_by_role` bypasses a line's `roles` (`filings.ts:137` `sound`, `:301` `charged`): `work_permit` limited
   to `principal` was still charged to the spouse (pure check). The added-filing path refuses this (break M2). Fix: refuse
   a role's line whose `roles` excludes the role; one fail line.
5. Minor (words, D10) — the case shows decision codes "(P-486)", "(P-171)", "(FQ-7)" and author words "their line adds
   it" (`samples/fee-table.json:307`, basis). The visitor visa total says "the family maximum CAD 500 starts at 5 people
   applying together" under "One submission for 6 people applying" (`filings.ts:222`): it counts people paying that line;
   say "5 people applying for it together". A role with no entry falls back to the combination's name ("Study permit
   (outside Canada): Spouse", `:277`) on an unpriced case.
6. Minor (D16) — mutations that no test catches: dropping the principal check at release (`validate.ts`, now the only
   guard since `files_own` is allowed) and dropping `to !== "co_filed"` in `filingPlan`. Caught: `charged`,
   `unpricedRole`, labels, the plan change, the save and release reverts, the line and role guards (all failed as they
   should).
7. Minor — `samples/conditional-filings.json:8` indentation; PR body names `tests/runtime/check_bk15_fees_by_role.ts`
   (it is in `tests/`).

**M3-S2 rule change (save and release):** sound. One filing per person still holds (`filing-<subject>` keyed by owner);
never on the principal's line or a co-filing line (save, release and plan); a filing that names no fee lines leaves the
case unpriced in words (Visitor visa child: pure check). Safe for the other combinations as long as issue 2 is fixed
(the warning is the author's only guide to the lines an added filing must name).

**Gap for the tech lead, not counted (P-26, outside the row):** forms do not follow the filing. The spouse ("Work
permit") and Child V ("Visitor visa") each get IMM 1294 "Application for study permit made outside of Canada" marked for
filing (`/forms` on :4458). The new spouse line brings this. Proposed follow-up row: each person's forms follow their
filing's document.

## D1–D20 (1–5)
D1 3 (row met for the headline; BR-10 broken by issues 1, 3) · D2 3 (`fees_by_role` guarded, roles not) · D3 5 (one
table, no copy) · D4 3 (undecided rule decides a fee) · D5 4 (stale save 409 in words) · D6 4 (read dates, ruling) ·
D7 N/A (no AI) · D8 4 · D9 4 · D10 3 (codes, "their line") · D11 3 (no "not counted yet") · D12 4 · D13 4 (axe 0 on the
panel; 400, 720, 1024 px no sideways scroll; keyboard edit) · D14 4 · D15 4 (save 108 ms; page settles 1.7–2.5 s on a
dev server) · D16 3 (issue 6, and the guess is tested as right) · D17 simulated only · D18 4 (sources and Sample on the
case) · D19 4 (configure → release → case → fees on the checkpoint) · D20 simulated only.

## BIC (EXPERIENCE §6) — fees panel and filings
BIC-03 Met (answer change moves filing and fee at once, step above) · BIC-08 Met (4 filing cards by person, status) ·
BIC-11 Met (one action, "Record the submission…") · BIC-13 Partly ("Answer yes or no." kept, but the fee goes on as No)
· BIC-14 Met (each line's Why) · BIC-18 Partly (an undecided fee is not drawn as waiting, issue 1) · BIC-19 Met (1440,
1024) · BIC-20 Met (keyboard via the Edit dialog; axe 0 on the panel). BIC-01, 02, 04–07, 09, 10, 12, 15–17 N/A
(unchanged by this PR).

## Could not check
CI: only the guard ran (draft). Packs on the checkpoint (row's "packs green") not run by me. `graph.mjs` not run (it
rewrites `qa/GRAPH.md`, outside my two files). Screen reader and an intended user's walk (D17, D20). Official pages
live (cloud proxy): quotes checked against saved copies only.

**Verdict: Block** — fix issues 1, 2 and 3 with pass and fail lines, then re-review the new commit. Minors 4–7: fix
here or record as follow-up rows.

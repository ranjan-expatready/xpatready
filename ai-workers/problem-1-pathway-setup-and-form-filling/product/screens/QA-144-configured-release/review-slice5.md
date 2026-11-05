# Review: PR #1052, B79b (QA-144 slice 5): Family sponsorship › Spouse or common-law partner (`fs.spouse`)

Reviewer: independent Opus, diff-only (tech lead's rule P-348 (8)). Head reviewed: **5ca45b468**. Base 86b721eac.
Scope: only what this PR adds on top of #1050 (`git diff origin/claude/epic-heisenberg-dkr5mu -- <file>`). Not reviewed
(copied from #1050): `p1/xfa_headings.py`, `p1/inventory/imm5669e.headings.json`, `api/src/form-masters.ts`, and #1050's
parts of `form-setup.ts`, `demo.ts`, `pack2.ts` and `samples/form-setup.json`.
Run: isolated copy `rv1052` on :4456 (never :4400), live AI off, US$0, stopped afterwards. The psql path in the checks is
the Mac's, so I ran scratch copies with only that path changed, then deleted them.

## Verdict: **Approve**. No Blocker, no Major. 9 Minors below. None stops this commit.

## What I verified
1. **Quotes (AGENTS rule 4, P-170).** Every `fs.spouse` cite is word for word in `pdftotext -layout imm5533e.pdf`.
   IMM 1344 is p. 1 item 2; fee is p. 1 item 3; IMM 0008 p. 2 item 6; IMM 5406 p. 2 item 8; IMM 5669 p. 3 item 9;
   IMM 5532 p. 3 item 10; IMM 5476 p. 3 item 11; IMM 5475 p. 3 item 12; passport p. 5 Part B item 1; birth certificate
   p. 6 (item 1, continued); IMM 5604 p. 6 Part B item 3. The PDF's date is 2022-09-21, and the cites say so.
   The 4 Guide 5289 quotes are in `guide-5289.html`: "The sponsor must download…", "If you're sponsoring a spouse or
   partner…", "The principal applicant must fill out these digital forms online…" and "If sponsoring a dependent
   child…". Its `dcterms.modified` is 2026-04-23. The `[...]` cuts only "(opens in a new tab)" and list items.
   Every value is labelled Sample, Unconfirmed: expert.
2. **Who.** The DB holds 71 IMM 1344 boxes and 5 IMM 5532 boxes (76) with `person = subject_spouse_or_partner`, so the
   PR body's "76 boxes" is right. `sponsor` takes the role whether or not the sponsor applies (`engine/resolver.ts:39`).
   The sponsor's line is `co_files`, so it gets `applies: false` (`api/src/studio.ts:291`). The sponsor is therefore
   outside `each_applicant` and `principal_partner_adult_children`. Preview confirms it: the sponsor files only
   IMM 1344 and IMM 5532, with no IMM 5406, IMM 5669, passport line or birth certificate line.
3. **`form-setup.ts` (FormRule.channel, ruleFactOf, documentsCited).** Correct. A bad whole fact (key, rule, label,
   meaning, cite, valueType) fails the read with its key. An unknown string key still fails the read.
4. **`demo.ts:722-725` and `pack2.ts`.** `who` is kept on a conditional line. Only `fs.spouse` IMM 5604 has both a
   condition and a `who`, so no other combination changes. The channel goes through `Forms.setChannel`, or
   `PATCH …/forms/:line/channel` in the pack, after `saveForm`. If `saveForm` fails, the channel step is skipped. A
   channel refusal is recorded as "`<form>` channel: …". `setChannel` checks the author duty and IRCC's accepted channels.
5. **`form-part-placements.ts:51-53`.** Same line as B78 (`origin/claude/screens-b78-section-names`, review M1). An
   `edited` proposal lands under `decidedKey`, as an accepted one does (`proposals.ts:831,858`). Run on this head:
   Study permit check 24/24 passes. The red lines on Visitor visa and With an LMIA have other causes (Minor 6).
6. **New check on this head: 22/25**, as stated. The 3 red lines are the release line, row 10's refusal and "no
   validator error". All 10 errors are IMM 5532 sponsor facts nobody is asked (education years, employment and
   residence periods, client ID, previous partner, first meeting place, arranged marriage). This head measures 10.
   I did not re-measure main's 93.
7. **P-319.** No form or combination number in the added live code (comments only). Tests and data name them.
8. **No simulated Validate.** The release line reads `config_release`. The "no validator error" line reads the
   validator's own `draft.problems`. Spend is US$0 and no LIVE drafting job ran.

## Blockers
None.

## Majors
None.

## Minors (fix in this PR before step 4, or as follow-up rows; none needs new scope)
1. **`api/src/form-setup.ts:122`: `ruleFactOf` does not check `beside`, and no test fails without it.**
   Scenario: a data entry with `"beside": "person.date_of_birth"` (a string) passes the read. `demo.ts:761` then calls
   `at.map` outside any try, and the whole configured load fails with a 500 instead of a named refusal. The read also
   does not check that `rule` is one of this combination's rule forms. Fix: check `beside` is an array of `person.` or
   `case.` keys, check `rule ∈ rules[].form`, and add one failing check (a bad entry makes the read throw).
2. **`tests/check_qa144_fs_release.ts:52` and `:91-94`: two lines can pass with no data.**
   Scenario: GET `/combinations/:id` or `/preview` returns 500. `problems` becomes `[]`, so "the validator itself finds
   no error" passes. `no` also becomes `[]`, so "preview fail" passes. The run still fails overall only because the
   paired pass lines fail. Fix: require status 200 and non-empty lists before judging (P-172: waits fail loudly).
3. **The SME sign-off is claimed but not checked (`check_qa144_fs_release.ts:46`, `acceptance/C10.1.test.ts:59`).**
   Both labels say "signed by the SME" or "after the SME's sign-off". Neither checks a `review_signoff` row by user-C
   for this combination's submission, and S10 checks it only workspace-wide. Scenario: a loader change that skips the
   SME step for `fs.spouse` alone still passes. Fix: join `review_signoff` to `review_submission` on this combination.
4. **IMM 5476 and IMM 5475 never reach the sponsor (`samples/form-setup.json:67`).** IMM 5533 p. 3 item 11, the PR's
   own cite, names "the sponsor, the principal applicant, and/or any dependants 18 years of age or older" and says "The
   sponsor and principal applicant can sign the same form". The line uses the default `each_applicant`, which excludes
   the co-filing sponsor (Preview: 5476 and 5475 only for the principal and the child). Fix: say so in `about`, for the
   expert, like the B92 note. It is a who-model gap, not a wrong quote.
5. **The fee receipt is on the principal applicant (`samples/form-setup.json:104`).** IMM 5533 lists "Application
   Fees" under the **SPONSOR** heading (p. 1, items 2–3), and the cite leaves that heading out. Fix: add "Sponsor" to
   the cite and name it in the B92 note ("the sponsor's line, held on the principal until a sponsor holder exists").
6. **Existing checks are red on this head and the PR body still says "running".** Visitor visa check is 27/30, With
   an LMIA 21/23, Study permit 24/24. Four red lines are #1050's own test updates, not carried here: "at least three
   chosen" becomes "two", and two scope lines move to `FORM_SETUP`'s keys. The fifth is the Visitor visa QA-206 line,
   which flips because of this PR: IMM 5604's sections all wait for a name. `heldFacts`
   (`check_qa144_vv_release.ts:48`) is workspace-wide, so the check expects the Visitor visa to be blocked, but it is
   released. Both clear at stack steps 1–2. Fix: put these numbers and causes in the PR's Checks table, and re-run
   all four at step 4.
7. **A line's IRCC words are not on the line.** Forms tab › "Why it is here (IRCC's words)" shows "Added from the
   library by a person" for IMM 0008, 5406, 5669, 5475 and 5476. `combination_form.source_quote` holds "IMM 0008:
   added from the library". The IMM 5533 and Guide 5289 cites in the data never reach the product, because
   `demo.ts:722` sends no quote. This is pre-existing: `sp.outside` is the same. Fix: a follow-up row so the loader
   saves a rule's `cite` as the line's quote (P-170 trust).
8. **IMM 5604's age lives only in the answer.** The fact is "child under 18 whose other parent is not the sponsor",
   and the line has no age gate. Scenario: a dependent child of 20 answered "yes" by mistake is given IMM 5604.
   Fix: say in `about` that the age is in the question's words (Unconfirmed: expert).
9. **`b79b-held-section-names.json:76` (not live until stack step 2).** `IMM_5532[0].page1[0].yesNo[3]` is put on
   page 5 under the form's title "Relationship information and sponsorship evaluation". The stack note says Part C's
   page 5 is *inferred*, but `basis` says "printed". Fix: check this entry against the print at step 2, and mark it
   inferred where it is.

## Claims in the PR body
* "93 → 10": **10 confirmed on this head**. 93 on main not re-measured.
* "Release only after B78's names": consistent with what I saw. All 10 errors are IMM 5532 sponsor facts from
  unnamed parts. The 25/25 rehearsal (#1050 + #1062 + names) was not re-run.
* "76 boxes unfilled until B91": **confirmed (71 + 5)**. B91 is on main's BACKLOG.md.
* "Earlier releases kept": **true** (Visitor visa, Study permit and With an LMIA released on this head). Their checks
  are red for the stacking reasons in Minor 6.

## Journey score (reviewer, `journey-test`): **7.5 / 10, below the 8 pass on this head, no criterion at 0**
Walked headless (Playwright plus axe) as the configuration author on :4456: Forms, Preview, Documents, Review and
release, each at 1440, 1024 and 400 px. Screenshots are in the scratchpad, not committed. Paths: load checkpoint →
Forms (8 lines, 3 Online, IMM 5604 with its rule) → Preview (child of 11: IMM 5604 follows the new answer, no IMM 5406
or IMM 5669) → Review and release ("10 to fix", each in plain words with a Fix).
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Set up from its forms. Release refused (10), by design until B78 |
| Next step obvious | 1 | Review tab names each fix. Lines show "Step 3 of 6 · Review · Your step" |
| Plain words | 1 | "Sponsor: … is needed by IMM 5532, but nobody is asked for it. Fix: …" |
| Feedback and state | 1 | Tabs show "30 to do", "46 to do", "10 to fix". The Online warning names the browser extension |
| Correct data | ½ | Lines are exact in the DB. 76 boxes resolve to nobody (B91, known) |
| Error recovery | ½ | Refusal names each fix. Reload and two tabs not exercised |
| Accessibility and screen sizes | ½ | axe WCAG 2.2 A/AA: 0 violations at 3 widths, no sideways scroll. Keyboard-only not walked |
| Speed | 1 | Tabs 0.8–1.2 s. Checkpoint load 50.6 s |
| Visual quality | 1 | Team look, demo chrome separate (review-1024 screenshot) |
| Trust and sources | ½ | 5 of 8 lines show "Added from the library by a person", not IRCC's words (Minor 7) |
To raise it: (a) the release lands (stack steps 1–3) → task completed 1; (b) the line keeps its IRCC cite → trust 1.

## Could not check
The 25/25 stacked rehearsal, and main's 93 problems. A keyboard-only walk and a real screen reader. D17/D20: an
intended user's unaided walk stays with the founder. `graph.mjs` and `run-suites.sh --changed` are the builder's step 4.
I did not write a separate journey-test report, because the caller allowed this one file only.

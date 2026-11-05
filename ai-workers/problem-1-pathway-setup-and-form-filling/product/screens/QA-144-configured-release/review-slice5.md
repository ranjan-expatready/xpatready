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

## Round 2 (diff-only, 03c2a2933)
Opus, a fresh context (P-318 (1), P-293 round 2). Scope: merge `3c61c4049`, `6436ef3f3` and `03c2a2933` only. Round 1's
commits and #1050's own lines were not reviewed again. I read the code and data, extracted the XFA templates of
`official-sources/ircc/forms/imm5532e.pdf` and `imm5604e.pdf` (pypdf), read IMM 5533 p. 10 (pdftotext), and ran
`product/tools/typecheck.mjs` on the head. I re-ran no studio check; I read the builder's logs in its scratchpad `runs/`
(c10.1-configured 41/41, vv 35/35 with "all 59" passing, fs/sp/lmia/ee/C4.1/C4.8/C9.1 exit 0, C10.1 exit 1).

### What I verified
1. **The merge loses nothing and duplicates nothing.** `--remerge-diff` touches only the five files it names. For each,
   #1050's changes from the merge base (86b721eac) appear in `10227da17..3c61c4049`, and B79b's in `5ee192c6b..3c61c4049`,
   except lines both sides changed the same way (the `family?` lines in pack2 and demo, the "edited" fix,
   `SET_UP_FROM_FORMS` from the table). `form-setup.ts` keeps `NotOnFormMark`, `notOnForm` in `FormSetup`, `SetupData` and
   `fromData`, next to `ruleFactOf`, the `(string | RuleFact)[]` rule facts and `documentsCited`. In `form-setup.json`
   (parsed): `pnp.express_entry` deep-equals #1050's entry, with `notOnForm`, and `fs.spouse` deep-equals B79b's.
   `form-masters.ts` is the same on both sides. `pack2.ts` keeps #1050's `"field"` pass and its place-from-form-parts
   call. Only B78's comment is dropped in `form-part-placements.ts`, which is fine. Type check: no new errors (15 known).
2. **Section names.** The 30 appended entries deep-equal the held file round 1 read. The first 29 are unchanged, and no
   (form, first_field) pair appears twice. 29 of the 30 `printed` strings occur in their form's template. The page
   numbers match IMM 5533 p. 10 ("Page 3, question 9 (Declaration of sponsor)", "Page 4, question 5 (Declaration of
   applicant)"). The template order fits too: the sponsor's signature comes after "9. Declaration of sponsor", and
   `lastLive[1]` after Part C. The `basis` says Part C's page 5 is inferred. This closes round 1's m9.
3. **Counts 29 → 59.** Both are exact equalities, on the file (`names.size`, `raw.length`) and on the DB (edited and landed
   under the label). They can still fail.
4. **check_c10_1_configured.** The new Family sponsorship line (approved by user-B, named on row 10's shows) can fail.
   The drafts line fails if every combination is released (`drafts.length > 0`), or if any draft is missing from row 10's
   words. The K1-absent branch asserts zero undecided form-field maps not superseded (a real `DefinitionStatus` value).
   Because `sql` throws on a bad query, it cannot pass on a broken query. The X9a proof is still made: `C9.1.test.ts:95`
   asserts the K1 lines on IMM 5476 grow after accepting the new edition and carry no `[0]` path. `studio.ts:259-263`
   builds the example from a caption only.
5. **`03c2a2933`** deletes notes only. m19's re-measure (exit 1, the line is gone) is on #1052 ("m19 re-measured on the
   merged stack").

### Blockers
None.

### Majors
1. **An IMM 5604 entry quotes words the form does not print (`samples/section-names.json:358-365`).**
   `IMM_5604[0].Page1[0].forCICUseOnly[0].fileNo[0]` is named "For CIC use only", with `printed` "FOR CIC USE ONLY" and
   `basis` "printed". The 02-2023 template prints **"FOR OFFICE USE ONLY"** in that subform ("FOR OFFICE USE ONLY File
   no. … Date (YYYY-MM-DD)"). "CIC" appears only in the subform's internal name, `forCICUseOnly`. The PR, the file's
   `basis` and the commit all say the words are "from print". The loader writes that claim into the decision reason
   ("page 1) (Sample)"). That breaks AGENTS rule 4 and P-170, and B78's own rule against the PDF's internal part name,
   which `check_b78_section_names.ts`'s fail-guard regex does not catch. It went live in this commit; round 1 read it only
   as a held file and missed it. Fix: name it "For office use only", printed "FOR OFFICE USE ONLY", page 1. Add a fail
   line so each `basis: "printed"` entry's `printed` words must occur in its form's template text (whitespace collapsed,
   case-insensitive). That check flags exactly this 1 of the 30. Re-run `check_b78_section_names`, `check_qa144_vv_release`
   and fs.

### Minors
1. **The row-10 refused-draft example now proves less (`check_c10_1_configured.ts:126-128`).** On today's data its only
   draft is High-wage position ("not submitted, no form…"), which line 100 already covers. Its "Fix N problems" half is
   never reached. A validator-refused draft that keeps its words is now proved only conditionally (line 116, Visitor visa
   while a form is unplaced) and by the pure `check_c101_release_two_words.ts`. The commit says so, so this is not
   silent. Fix: say it in the line's comment, so a reader does not take it for the old guard.
2. **The line labelled "X9a fail-guard" (`:105`) cannot fail on today's data.** With no K1 words, row 10 holds no
   form-field words at all, so it guards only a future regression. The old guard's precondition (an undecided box with
   a raw path and no caption exists) now holds only on the K1 branch, and `C9.1:95` does not assert it for IMM 5476. Fix:
   rename it to a plain pass line, or have C9.1 assert that one undecided IMM 5476 box has an empty caption.

### Nits
* The fileNo box is office-use, so a separate section name for it may never reach a client. That is the expert's call,
  not this diff's.
* C10.1 25/27 (R12b, "every row done" listing rows 10 and 12): I did not judge it here. The row 10 "partial" question
  goes to the tech lead.

### Could not check
CI on `03c2a2933`: every job reads "skipped" on GitHub, so there is no green run to cite. I re-ran no studio check on my
own copy; I relied on the builder's logs.

**Verdict: Block.** To fix: Major 1 (the IMM 5604 "For CIC use only" entry, plus a fail line that `printed` words occur
in the form's print). Then re-run the three checks named there. The Minors can go in the PR or as follow-up rows.

## Round 3 (diff-only, 47d776203 + fe9a1e705)
Opus, a fresh context (P-293 (3), allowed once by the tech lead on #1052). Scope: `git show 47d776203` and
`git show fe9a1e705`, nothing else. On the head (fe9a1e705, clean tree) I re-ran `python3 prototype/p1/xfa_texts.py --names`:
`git diff` was empty afterwards. I extracted the 9 XFA templates myself with pypdf, ran `check_b78_section_names` and
`check_c101_row_ten` on a copy in my scratchpad with mutations, and ran `product/tools/typecheck.mjs`. I re-ran no
studio check that needs a server. I read the builder's `runs3/` logs: c10_1_configured 42/42 with the option A line
`{"status":"done","refusedWithForms":0,"drafts":["High-wage position"]}`, fs 28/28, and C10.1 25/27 (R12b, and "every row"
`["2 out","12 partial"]`).

### What I verified
1. **Major 1 is closed.** `section-names.json` names `IMM_5604[0].Page1[0].forCICUseOnly[0].fileNo[0]` "For office use
   only", printed "FOR OFFICE USE ONLY", page 1, `basis` printed. That is the 02-2023 template's own draw text. "CIC" occurs
   in none of the form's printed texts. Only the subform name `forCICUseOnly` has it, plus base64 image data.
2. **The texts files are what the PDF prints, as draw texts.** I extracted each template separately (pypdf, `draw` →
   `value` text, images skipped). For all 9 files, the set of texts equals the committed `texts` exactly: 0 missing, 0
   extra. The `edition` and `sha256` values match the manifest. A re-run reproduces the files byte for byte.
3. **The new lines can fail.** The pass line on mutated data:
   * The old entry ("FOR CIC USE ONLY") → 10/11, exit 1.
   * Another form's printed words changed (IMM 5532 "… SPONSOR ZZZ") → 10/11.
   * A stale texts checksum, the PDF's bytes changed, or the PDF and the manifest checksum changed together without
     regenerating the texts → 9/11 each (pass and fail lines both red).
   * A missing texts file → 9/11.
   * A texts file hand-edited to add "FOR CIC USE ONLY" → 10/11 (the fail line).

   **So a texts file left stale against a changed PDF is caught**, through the manifest checksum and the committed PDF's
   own bytes. Only when the PDF is absent does the line fall back to the manifest. PDFs are committed, so that does not
   apply today.
4. **The m2 relabel** (`check_c10_1_configured.ts:105`) now says the line is a standing guard with no planted case, and
   that C9.1 plants one. That closes round 2's Minor 2 as worded.
5. **fe9a1e705 follows the ruling exactly.**
   * `releaseRowTen` gives waiting when nothing is released, partial when any combination with forms is refused, and
     done otherwise. A formless combination never sets partial. It stays in `why` with the same sentence as before, as
     its own " · " segment after the refusals.
   * `demo.ts` sends a formless combination to `noForm` and a thrown release to `notReleased`. The old `blocked` list was
     read only by row 10 (`blocked` at `demo.ts:1084` is an unrelated local in `sweepOrphans`).
   * The readers of row 10's words (C10.1:61/72, fs, sp, lmia, vv) split on " · " or prefix-match `label: `. Both still
     hold. The web dialog shows `why` whatever the status (`App.tsx:266`), so a done row still shows the formless name.
   * The ruling's two fail tests are there.
     * (1) A refused combination with forms gives partial (`check_c101_row_ten` line 3). With partial removed it goes 5/6,
       exit 1.
     * (2) The formless name is in the words when the row reads done (line 2). Restoring the old rule makes line 1 fail,
       5/6. Dropping the formless words makes it 4/6. Removing waiting makes it 5/6. The real-load line in
       `check_c10_1_configured.ts:132` fails if the old rule comes back (partial with `refusedWithForms` 0).
   * Neither commit touches `acceptance/` (C10.1.test.ts unchanged, the "every row" line untouched) or any C4.11 file.
   * Type check: 15 known errors, 0 new.

### Blockers
None.

### Majors
None.

### Minors
1. **The B79b fail line never plants the old entry through the check's own rule (`check_b78_section_names.ts:35-36`).**
   It asserts the IMM 5604 texts file's content, not that the `unprinted` filter rejects a part-name quote. If the filter
   is mutated to `raw.filter((s) => false && …)`, the check still reads 11 passed, 0 failed. The pass line can then never
   fail, and the fail line does not notice. Fix: run the same predicate on a planted copy of the old entry
   (`{…5604 entry, printed: "FOR CIC USE ONLY"}`) and assert that it is flagged.
2. **A hand-edited texts file with the right checksum is caught only for the one CIC string.** No CI step re-derives
   `<form>.texts.json` from the PDF, so a forged or edited text on any other form would let a wrong `printed` name pass.
   A changed PDF *is* caught (point 3). Fix: a CI line that re-runs `xfa_texts.py --names` and fails on `git diff`. CI
   already runs Python. Otherwise, say in the check that the files are trusted as committed.
3. **The script's docstring says "every text a form prints", but it reads `draw` texts only, hidden ones included.**
   * Field captions are not read. "File no." and "Date (YYYY-MM-DD)" in the same office box are absent. That can only
     cause a false red.
   * Draws under `presence` hidden/invisible/inactive *are* read. IMM 1294, 5257 and 5710 each carry 3–6 such texts, for
     example "Date last validated". No printed name relies on one today, but a later name could pass on words the form
     never shows.
   * Fix: skip draws under a hidden ancestor, and say "draw texts" in the docstring.

### Nits
* The match is a substring test, so a short `printed` value ("SIGNATURE", "PASSPORT", "Full name") passes inside any
  longer text. All of them hit visible draws today.
* Row 10's words now list refusals first and formless combinations after, not in combination order. No reader depends on
  the order.
* Round 2's Minor 1 (the comment at `check_c10_1_configured.ts:126-128`) is unchanged. The new comment two lines down
  explains the formless case, which partly covers it.

### Could not check
CI on fe9a1e705. I did not run `check_c10_1_configured`, fs or the C10.1 pack on my own isolated copy. I relied on the
builder's `runs3/` logs, which agree with the code I read.

**Verdict: Approve.** No open Blocker or Major for 47d776203 + fe9a1e705. Minors 1–3 can go in the PR or as follow-up rows.

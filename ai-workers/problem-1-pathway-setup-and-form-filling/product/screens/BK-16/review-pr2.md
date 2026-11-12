# BK-16 PR 2 (#1632): review (Opus reviewer, 12 Nov 2026)

Reviewed: `git diff origin/main...452c5e8a0c4a80f001e8ff2c52395eb49bc5940f` (base de7f14bc6), branch claude/eloquent-curie-mrngib.
Checked against: the tech lead's rulings P-490 and P-491 (comments on #1614), `STANDARDS.md`, `EXPERIENCE.md` and AGENTS rule 4.
How: fresh isolated copies on :4456-:4459 only, live AI off, US$0. I compared the head with the base on the configured checkpoint, loading each side twice: the two loads on each side were identical (deterministic), so every difference below comes from this PR.
Overall (screen-review scale): **Rework**. The data does what QA-416 and QA-418 ask on the Study permit, but it changes four other combinations' releases and turns four existing suites red.

## What holds (verified)
- **The new suite is real.**
  - `check_bk16_family_forms_api.ts` passes 21/21 on a fresh head copy.
  - On a base-code copy it passes only 7/21, so it fails on origin/main.
- **B164:** `check_b164_no_engine_keys.ts` passes 52/52. The loader change in `085-conditional-filings.ts:60` names no form, combination or program.
- **Every cite matches word for word** (P-170). I checked each against the saved copies:
  - Guide 5269: "Family members must complete their own application forms.", the spouse and child sentences, and "six months or less".
  - Guide 5487 Step 2: "...(IMM 1295)".
  - Guide 5256: "...each person applying for a Temporary Resident Visa to visit Canada."
  - The IMM 1295 and IMM 5257 pages: "Last updated: September 2023". The IMM 5257 page also: "You don't need this form if you're applying: in the IRCC Portal".
  - Dates and editions match `manifest.json` (19 Oct, 27 Oct, 09-2023). Each rule is labelled Sample, Unconfirmed: expert.
- **QA-416 on a family of four:**
  - The student files IMM 1294.
  - The spouse files IMM 1295 and never IMM 1294.
  - A child answered Yes files IMM 1294; a child answered No files IMM 5257.
  - Flipping an answer moves the forms, and the fees follow: CAD 825, then CAD 775 after the officer flips Child S to No.
- **QA-418:**
  - The question is the client's, asked only of each child (never the student or the spouse), required and in plain second person.
  - A client answer for a minor child counts as confirmed (P-411).
  - The officer can still answer or correct it (PUT 200, "entered by staff") and Confirm section (`confirmed: 1`).
- **Combinations left unchanged:** the Visitor visa's release placements are identical to base. `check_bk15_study_family_api` 15/15, `check_bk12_sample_case` 34/34, and `check_qa144_lmia/ee/fs_release` 23/23, 26/26 and 28/28 all pass on the head.
- **Out of scope, as ruled:** "Why we ask" is stored on the placement and not shown. UX-10, P-491 (b).

## Blockers
- **B1: four existing suites fail on this head and pass on base. `select-suites.mjs` picks ALL for this diff, so CI will run them.** The PR's Checks list does not mention them.
  - `tests/check_bk10_form_rules_data.ts:26-31,53-57` (pure): 18/20. It pins the Study permit's form list "IMM 5646,IMM 5409,IMM 5476,IMM 5475".
  - `tests/check_qa144_sp_release.ts:71`: 26/27. "IMM 1294: every student files it" expects COMBINATION_MANDATORY; the line is now ANSWER_CONDITIONAL.
  - `tests/check_c10_1_configured.ts:65`: 47/48. It expects `jobs === 19` saved replays; IMM 1295 makes 20.
  - `tests/check_qa144_vv_release.ts:73-74`: 33/35. Row 7 is now "partial" (M2).
  - Fix:
    - For the first three, update the expectations to the ruled behaviour and say why in each.
    - For the fourth, fix the cause (M2), not the test.

## Majors
- **M1: adding `imm1295e.pdf` to the Study permit's sources changes other combinations' released questions.** This breaks P-491 (a), "every other placement unchanged". Where: `samples/wave1.json:24`.
  - IMM 1295's saved field map now enters the shared library while the Study permit is set up. That happens before With an LMIA, Express Entry and Family sponsorship are set up (the Visitor visa is set up first and is unaffected).
  - With an LMIA:
    - city of birth moves from Personal details (`person.birth_city`) to a part titled "Request for a change of sex or gender identifier" (`person.place_of_birth_city`);
    - four facts are renamed: education_from/to_date → education_start/end_date, employment_employer → employment_employer_name, work_location_address → intended_work_address, occupation_province_state → employment_province_state;
    - the question wordings change, and the SQR selection `details_of_intended_work_in_canada` is dropped.
  - Express Entry and Family sponsorship gain the same "Request for a change of sex or gender identifier" part asking city of birth. On Express Entry, Personal details already asks "City or town of birth" (BIC-01 ask once, BIC-02 asked for a reason).
  - The Study permit selects `live_in_caregiver_program`.
  - Failing scenario: open an Express Entry case as Client B. The list shows "Request for a change of sex or gender identifier · City or town where the person was born", after Personal details has already asked "City or town of birth". On base it does not.
  - Fix: in data, keep every other combination's release byte-identical to main, and add a check that compares the other combinations' placements before and after.
- **M2: IMM 1295's five unheaded sections stay on To review, so checkpoint row 7 drops from done to partial.**
  - B78 and B79b's contract (`check_qa144_vv_release.ts:73-74`) is that every unheaded section is named from the form's own words (`samples/section-names.json`, 59 today). The PR body calls the partial row expected; that contract says otherwise.
  - Failing scenario: Demo › Load configured. Row 7 reads "partial: 5 sections held on To review … Unnamed section 1 of IMM 1295 …".
  - Fix: name the five sections in `samples/section-names.json` from IMM 1295's printed words (Sample), as B78 did.

## Minors
- **m1: the Study permit family is asked IMM 1295 questions that do not fit an open work permit spouse, as required ones.**
  - Where: "About the application" now lists "Live-in caregiver program" (2 questions) and "Details of intended work in Canada" (LMIA or offer number, job title, employer address). They are case scope and `required: true`.
  - IMM 1295's own inventory marks these fields `required: false` (`p1/inventory/imm1295e.inventory.json`, `Page3.LCP.Caregiver`, `DetailsOfWorkCont.LMO`).
  - The spouse's filing reports "56 facts missing" starting with the caregiver ones.
  - This comes from the general "asked as required" behaviour, so it is for the tech lead, not a blocker here.
- **m2: the PR body's m1 claim is overstated.** It says an unanswered child's filing is "already blocked". In fact:
  - The CRITICAL line can be passed: it carries `unblocks: "Ready to file, once passed with a reason or fixed"`.
  - It says the firm owes the answer (`key …|staff|applies:IMM 5257`), though the client now answers it.
  - The test's own words, "not Ready to file … (CRITICAL)", are true. m1 stays with the tech lead.
- **m3: loading the configured checkpoint now rewrites a tracked file.** `prototype/p2/jobs/studio-fieldmap-imm1295e.json` changes from template v1 to v2, adds `known.form_edition` and raises the timeouts. Every clone's tree is dirty after a demo load. Fix: commit the refreshed job file. I restored it after my runs.
- **m4: `samples/form-setup.json:63` `about` still says "Its people are one student and a representative."** That contradicts the family rules in the same entry.
- **m5: the record does not show the claim.** `screenshots/bk16-pr2-02-case-1440.png` shows the top of the case only; "CAD 825" is not in it. My walk shows the total (journey report).
- **Note (an existing issue, not this PR's):** a child's IMM 1294 takes "Details of intended study in Canada" at case scope: the principal's school, DLI and tuition.

## D1–D20 (1–5; this PR's scope)
D1 Requirement fit 3 (QA-416 and QA-418 met on the Study permit; P-491 (a) broken, M1) · D2 Data integrity 3 (facts renamed in other releases, M1) · D3 Reuse 4 · D4 Rule integrity 4 (rules and conditions right; m2) · D5 Stability 4 (answers survive a reload and a flip) · D6 Governance 4 · D7 AI trust N/A
D8 Orientation 4 · D9 Flow 3 (73 parts, with caregiver and work parts, m1) · D10 Language 3 (city of birth under a sex or gender heading, M1) · D11 Feedback 5 · D12 Visual 5 · D13 Accessibility 4 (axe 0 at 1440 and 1024, keyboard, no sideways scroll; 200 % zoom not checked) · D14 Team look 5
D15 Speed 5 (save 95 ms) · D16 Testability 3 (the new suite fails on main; four suites left red, B1) · D17 simulated only · D18 Provenance 5 (every cite exact) · D19 End to end 3 (row 7 partial, M2) · D20 simulated only

## BIC (EXPERIENCE §6; the client page and case page, as walked)
BIC-01 **Not met**: Express Entry asks city of birth twice (M1) · BIC-02 **Partly**: the child's question appears only for children, but city of birth sits under a gender heading and caregiver questions are asked (M1, m1) · BIC-03 **Met**: the forms follow a flip; the officer's change goes on the Confirm list · BIC-04 **Met**: "Not started" for an unanswered part; a wait is never an error
BIC-08 **Met**: filings named Study permit, Work permit or Visitor visa per person · BIC-12 **Partly**: the wait can be passed and its line names staff (m2) · BIC-19 **Met**: one primary button per part · BIC-20 **Met**: axe 0 at 1440 and 1024; Tab then Space picks Yes · BIC-05 to 07, 09 to 11, 13 to 18: N/A, this diff does not touch them

## Graph (P-86)
`graph.mjs --check`: G1 0, G2 0. The diff adds no page or route.

## Not checked
The full CI shard set (I ran 8 server suites and 31 pure suites on both sides); Gate B packs C6.12 and C11.12 (the builder's runs); 200 % zoom and a screen reader; mutation runs on the new suite (the base run already shows it fails without the data).

Journey score (reviewer, the one score for this check): **8.5 / 10, pass**. See `journey-test-reviewer-2026-11-12-pr2.md`.

**Verdict: Block**
To fix: B1 (four red suites), M1 (other combinations' releases changed), M2 (row 7 partial: name IMM 1295's sections). m1 to m5 can follow; m1 and m2 go to the tech lead.

# BK-16 PR 1 (#1614): review (Opus reviewer, diff review, 12 Nov 2026)

Reviewed: `git diff origin/main...1709f2cd31d513c5e3a710cc8263425bb0859db6` (base 24b0b92a6). That is cf089d423 plus `git diff cf089d423..1709f2cd3` (tests/check_sh3_resolver.ts only).
Against: the tech lead's ruling P-490 (the comment on #1614), `STANDARDS.md`, `EXPERIENCE.md` and `QUALITY.md`. There is no concept.md: this row's concept is the ruling plus `question-2026-11-12.md`. Live AI off, US$0, :4456 only.
Overall (screen-review scale): **Ship after fixes**. All the fixes are Minor and none blocks; m1 needs a ruling from the tech lead.

## The ruling, checked
| Requirement | Result |
|---|---|
| One generic `who`, modelled on QA-221 | Met: `contracts/resolver.ts:130-134,147`, `engine/resolver.ts:44`, `engine/render.ts:72-85,133` |
| No form, combination or program in code (P-319, P-425) | Met: `check_b164_no_engine_keys.ts` 52 passed, 0 failed; the diff names only Sample "STUDY"/"OTHER", in its test |
| A test per rule, including a child with a missing or unanswered condition (no form, never an error) | Met: `check_bk16_children_when.ts` 20/20. I removed each rule in turn: 10 of 10 changes turned it red (below) |
| Other combinations unchanged | Met: `check_qa221_who_age.ts` 8/8 and `check_sh3_resolver.ts` 85/85; R6 holds; after a demo load no combination uses the value. Packs C4.1, C10.1, C7.7: builder's runs, not re-run (as briefed) |
| No migration; `api/src/case-prepare.ts` untouched | Met: no prisma or migration path in the diff; case-prepare.ts has no change |
| `web/src/pages/configuration.tsx` (outside the file list) | **Keep it.** Without it, `whoLabel` shows the raw key `principal_and_children_when` in the table (`web/src/pages/workspace/forms.tsx:160`), and the controlled select shows "Each applicant" for a line that is not. The PR body's reason is partly off: Save sends the drawer's state, which starts as `l.who` (`forms.tsx:299,329`), so a plain Save would not overwrite the line. The display problem alone justifies the line. |
| 1709f2cd3's change to `check_sh3_resolver.ts` | Sound: it reads every extra FORM_WHO value. It still fails if one of them is offered for documents or rules, and it fails (an empty list) if the line changes shape. |

## Q1: every reader of a form line's `who` or condition
I read every reader the brief listed: subjectsFor, lineHolders, lineCondition, formSigners, FORM_WHO, WHO_WORDS, `notNeededForms`, readiness, fill, signing, prepare and case-checklist.
- Each one takes applicability from render's rows (`applies`), or reads the line's condition only for rows render already decided. None treats an unanswered child as "cannot tell" by itself:
  - `api/src/case-prepare.ts:104-112` `notNeededForms`: only `applies === false` rows. For an unanswered child, `lineCondition` gives cannot_tell, so the child is not listed. A child answered No is listed with the answer. The principal is never false on the rule.
  - `api/src/fill-case.ts:207-216`: Forms list and kept copies.
  - `engine/runtime/forms.ts` `formCoverage` and readiness.
  - `engine/runtime/signing.ts:25`: signers, filtered by row.
  - `engine/render.ts:260-270`: signed scans, from the row's own `applies`.
  - `case-checklist.ts:200` and `sources.ts:55,279`: document lines, whose `who` is WHO only.
- Two readers still read the condition for the **principal** (m2, m3); both effects are small.
- One consequence of the choice reaches Ready to file (m1).

## Q2: an unanswered child gets applies=false, and its question is still asked
- The deciders are sound. `childrenWhen` keeps the unanswered result as `pending`, and `render.ts:220-225` adds its missing facts as deciding questions, on `pending.about`. So a `PRINCIPAL` or `SPOUSE` condition asks the right person (probe P2).
- The case view asks it, required, of each unanswered child (probe P6). An answered child keeps it through `keepAnswered`.
- The case words are right: "it is needed for a child only when … is Yes; their answer is not given yet" (`engine/runtime/forms.ts:103-106`), never read as a No.

## Q3: tests
- Every rule has a passing and a failing check.
- Each of these removals turned the suite red:
  - the principal reading the condition, 18/20;
  - no pending question, 18/20;
  - unanswered treated as cannot tell, 18/20;
  - no condition gives the child the form, 19/20;
  - the spouse included, 18/20;
  - the non-travelling child included, 18/20;
  - no warning, 19/20;
  - the warning as an error, 19/20;
  - the case-words branch removed, 18/20;
  - the gate off, 14/20.
- On origin/main's engine and contracts the suite exits 1.
- Gap: R1's fail-guard covers only an unanswered principal (m2).

## Blockers
None.

## Majors
None.

## Minors
- **m1 (for the tech lead; it does not block this PR): an unanswered child is dropped, where Break B3 holds a waiting form.**
  - Where: `engine/render.ts:72-78` (cannot tell becomes `applies: false`) against `api/src/readiness-inputs.ts:127-131` (Break B3).
  - Today, a form that waits on an answer stands as a CRITICAL "whether X applies" line on Ready to file. With this `who`, the unanswered child's form has applies=false, so it never becomes an item and never blocks.
  - Failing scenario: a combination with only this line reading "studies 6 months or more". A child's answer is left empty. The case reaches Ready to file, and is filed without that child's study permit form. The question shows only in the questionnaire.
  - PR 2's planned IMM 5257 line (`each_dependent_child`, DEPENDENT condition studies = false) reads the same answer and waits as "Cannot start yet". So the planned family Study permit stays guarded; any other combination that uses this `who` alone is not.
  - The ruling's "the child gets no form, never an error" was followed as written. Whether "no form" may also skip Ready to file is the tech lead's call; this review does not settle it.
  - Ask for PR 2: a pack step showing Ready to file blocked for an unanswered child.
- **m2: the condition is read for the principal when keeping answered questions.**
  - Where: `engine/render.ts:226` runs `keepAnswered` for every row, the principal's included.
  - Failing scenario (probe P1): the principal has an answer to the fact, for example given under an earlier release where the line was `each_applicant`, or asked in a selected section. Their question then stays, marked as deciding "whether STUDY applies to principal". That breaks R1 ("never read for them") and the words are untrue.
  - Fix: skip non-child rows of a `PRINCIPAL_CHILDREN_WHEN` line in that loop, and add an R1 check with the principal answered.
- **m3: the case words read the condition for the principal.**
  - Where: `engine/runtime/forms.ts:99,108-111`.
  - Failing scenario (probe P4): a line with this `who` and a minimum age of 18. The principal is under 18 and answered No. The kept copy reads "it is needed only when … is Yes; their answer is not Yes" instead of the age reason.
  - Fix: for a non-child on this `who`, use `rule = null`.
- **m4 (words, EXPERIENCE: one name everywhere): one value, two names.**
  - Where: `web/src/pages/configuration.tsx:20` "Principal, and each child only if", against `contracts/lines-bulk.ts:33` and `engine/validate.ts:150` "…while its condition holds".
  - The builder's reason (the select cut the label at 1440 px) is real. Either align the two wordings, or say in the warning that this is the "…only if" choice.
- **m5 (record): the screenshot does not show what the PR claims.**
  - `screenshots/bk16-02-saved-1440.png` does not show the "Who fills it" column (it is scrolled out of view), so it does not show the read-back the PR claims.
  - My walk shows it (journey report, journey 1).

## D1–D20 (1–5; this PR's scope)
D1 Requirement fit 4: every rule in the ruling is met and tested; m1 is open to the tech lead · D2 Data integrity 5: one DRAFT row, the published row kept, FORM_WHO refuses other values · D3 Reuse 5: one value, following QA-221 · D4 Rule integrity 4: the deciding question is always asked; m1, m2 · D5 Stability 4: survives reload and reopen · D6 Governance 5: the draft row versioned as before · D7 AI trust N/A: no AI · D8 Orientation 5: unchanged · D9 Flow 4: no hint in the drawer until Review · D10 Language 4: m4; otherwise plain words with no keys · D11 Feedback 5: toast and warning · D12 Visual 5: label fits · D13 Accessibility 4: axe 0, keyboard opens the drawer, 1024 and 400 px fine; 200 % zoom not checked · D14 Team look 5: existing Select · D15 Speed 5: save 505 ms, no new requests · D16 Testability 5: 10 of 10 removals caught · D17 simulated only · D18 Provenance 4: the case words say why · D19 End to end 3: closes only with PR 2's data · D20 simulated only.

## BIC (EXPERIENCE §6; no case screen changed: case behaviour checked on the engine)
- BIC-02 **Met**: the child's question carries "decides whether STUDY applies to child-open" (test R4, probe P6).
- BIC-04 **Met**: "not answered yet" is a state, never an error (test R4, case words).
- BIC-12 **Partly**: m1, Ready to file does not wait on the unanswered child for this `who`.
- BIC-13 **Met**: the release warning says what to do.
- BIC-01, 03, 05–11, 14–20: N/A, not touched by this diff.

## Graph (P-86)
`graph.mjs --check` exit 0 (G1 0, G2 0). No new page or route.

## Not checked
The Gate B packs (builder's runs); 200 % zoom and a screen reader; a family case in the browser (needs PR 2); two tabs saving the same line (an unchanged path).

Journey score (reviewer, the one score for this check): **8.5 / 10, pass**. See `journey-test-reviewer-2026-11-12.md`.

**Verdict: Approve 1709f2cd31d513c5e3a710cc8263425bb0859db6**
No open Blocker or Major. m2 to m5 can go in this PR or a follow-up. m1 goes to the tech lead before PR 2's pack is written.

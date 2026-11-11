# QA-400 review: "is the principal applicant" per person (P-485)

Reviewer: Opus, fresh context (did not build). 11 Nov 2026. Commit reviewed: **61e6261b2ffdca186e635aaacc9364ca2596c8cb** (`claude/screens-qa400`, draft PR #1586). Diff: `origin/main..origin/claude/screens-qa400`, 6 files. This is a bug fix, not a screen: there is no concept, so the bar is the tech lead's ruling P-485 (comment "Tech lead ruling on QA-400" on #1576, read in full), STANDARDS, EXPERIENCE and AGENTS rules 3-4.

## Ruling check (P-485, done-when)
| Ruling line | Result | Evidence |
|---|---|---|
| Per-person fact, worked out from role in `knownOf` (C7.7 pattern), never asked | Met | `engine/runtime/case.ts:315-327` (`principalOf`, set "confirmed", source "worked out: the person's role on the case"); `case.ts:405-406` leaves it out of `needed` |
| Names no form or program (P-319, P-425) | Met | Engine holds only the library key, as `HAS_CHILDREN` does; the SCH1 link lives in data (`samples/review-corrections.json`) |
| SCH1 map points at it via a new map/field version | Met in intent (deviation accepted, below) | Copy DB: `form_field_map` SCH1 `Schedule1[0].PrincipalApplicant[0]` → `person.is_principal_applicant`, `form_subject`, `yes_no_code:true/false`, PUBLISHED v1; field CLIENT_LEVEL, yes_no, PUBLISHED; no `case.subject_is_principal_applicant` field |
| Case-level question no longer asked | Met | Check D (agent and client); browser: "Indicate whether you are" absent on the case page and the client questionnaire at 1440 and 1024 px |
| Configured checkpoint and the demo's release carry it | Met for Visitor visa | VV Release 1 and 2 snapshots hold the new key, none the old (copy DB). The finished story runs the same checkpoint runner. `p3/releases/c1-v3` is not changed: judged below (m1) |
| No baton files | Met | `case-prepare.ts`, `schema.prisma` untouched |
| Family VV case: SCH1 principal / spouse / child 18+ read back from the PDF | Met | My run on my own copy :4485: `check_qa400_principal_per_person.ts` **18 passed, 0 failed** (2 min 23 s): principal "true", spouse "false", child 18+ "false" |
| C6.2 and C7.1 packs green | Not verified by me | The builder's background run; CI on ready |

**Deviation (no literal new version):** accepted. The rule it serves is "a published field's scope never changes": no case-level field is ever published in the checkpoint (040 runs before 070 approves anything), and a new PERSON field is created rather than the old one re-scoped. The CHANGED decision is the same door a person uses on the draft's page (`Sources.decide`), with the author's reason recorded. The return showcase still holds (copy DB: proposal choices 1 CHANGED, 1 RETURNED, 678 ACCEPTED), so DEMO row 4 keeps its one visible return.

## Questions asked
* **Side effects of a value for every person (children under 18 included):** none found. Readers of `knownOf` (forms, readiness, checklist, C6.9 `assessments.ts`, filings, stages, preview, answer keys) only use a fact a box, condition, check or rule names. Copy DB: 0 predicates, checks or derived fields name any `principal_applicant` key; the eligibility facts (`resolver.ts:134`) gain a key nothing reads. A child under 18 gets no SCH1, so the No is never read. Readiness: the SCH1 box now counts as a "confirmed fact" for each person, the intended change. No answer keys exist in the checkpoint.
* **Should `principalOf` exclude a role?** No. "Is this person the principal applicant" is truthfully No for every other role in `samples/wave1.json` (spouse or partner, child, sponsor, representative, a non-applying person); a form only reads it where its map says so. It relies on one principal per case; Make principal (C6.13) re-derives it from the new roles, which is better than a stored answer. The employer as "principal" (`lm.high_wage`) gets Yes, which no form reads.
* **Client questionnaire claim:** true. It is left out in `caseView`'s `needed` filter, which every questionnaire (agent, sqr, own link, PQR, Preview, Studio Questionnaires) goes through; check D and the browser walk confirm it.

## Findings
**Blocker:** none. **Major:** none.

**Minor**
* **m1, `p3/releases/c1-v3` (configuration.json:7881 map entry, :20202 form check) still reads the case-level fact.** Failure scenario: Demo › Reset to the six › Start With an LMIA from its reviewed release (`api/src/demo.ts` `releaseWithSources`) loads it as With an LMIA's draft; once a person releases it, a worker-and-spouse case asks the officer "Indicate whether you are" once, and both SCH1s print the same answer: QA-400 on another path. **Not blocking, in my judgement:** the ruling's done-when names the family Visitor visa case; the ruling's "the demo's release" answers the hand-over's open point (where the VV release takes its maps from), and the VV maps come from the checkpoint, not c1-v3; c1-v3 is a fingerprinted reviewed record (`release.json` configuration_sha256) that the six-path loader never releases by itself; the configured checkpoint's With an LMIA uses the library's corrected SCH1 map (field maps are per edition). Fix: record it in the PR as a known residual and open a qa row for a tech-lead call (apply `review-corrections.json` at import, or a c1-v4). The suites' fixture `tests/fixtures/screen01-work-permit-release.json` stays as it is until then.
* **m2, `engine/field-scope.ts:53`: adding to PERSON_ONLY has no test.** Remove it and all 18 lines still pass. Failure scenario: a later change offers Household or Application scope for the field and nothing goes red. Fix: one pass/fail line on the scope route refusing a non-person scope for `person.is_principal_applicant`.
* **m3, `api/src/features/checkpoint/040-field-map-review.ts:70`: matched on `payload.label` only.** There is no `kind === "field"` guard, and the match comes before the showcase branch: if the showcase form's first item were ever a corrected proposal, row 4 would show no return, and the check only asserts `status === "done"`. Fix: guard on kind, and assert `1 returned` in the qa400 check (or in the row-4 suite).
* **m4, words and counts for a worked-out fact.** Its section question keeps `collected_from: client_questionnaire` (copy DB `section_question indicate_whether_you_are`), so the Studio's Questionnaires coverage counts it as a client fact (`engine/runtime/questionnaires.ts:105`), and `caseView` counts it in `not_asked` (`case.ts:408`). This matches the `has_children` precedent and harms no client. Record it in the PR; no change needed here.
* **m5, the live demo.** :4400's current Visitor visa release pins the old map, so the fix shows only after Demo › Load the finished story (or the configured checkpoint). Say so in the PR. I could not check how the demo updates itself after a merge.

**Outside scope (for qa, not this PR):** the same defect class sits on IMM 0008 DEP `accompanyPAIndicator` → `case.accompanies_principal_applicant` (`form_subject`, `once_per_case`): every dependant gets one answer.

## Tests: does a rule's test fail when the rule is removed?
* 040 correction: yes (the builder found 11 fails with it stashed; I did not repeat this).
* `principalOf` / `knownOf` line: yes (A lines import it; C boxes go empty).
* `needed` filter: yes (D).
* PERSON_ONLY: no (m2).
* qa's `tests/qa/check_qa400_principal_flag_per_person.ts` (on #1579's branch) checks the map's shape and may need the new key; not on this branch.
* `check_qa144_vv_release.ts` key rename: correct (the fact is placed in "Indicate whether you are").

## Standards
* AGENTS rule 4: met. The correction file says "Sample review data, not an IRCC rule". The note paraphrases SCH1's printed choices, matching the saved AI run's evidence quote "*Indicate whether you are" (true = principal applicant; false = spouse, common-law partner or dependent child 18+).
* No personal names; no new technology; no migration.
* STANDARDS [M] lines touched: tests with pass and fail lines (met, except m2); no per-row requests added; server-side derivation (not client).

## D1-D20 (fix-relevant only; the rest N/A for a data/engine fix)
| D | Score | Evidence |
|---|---|---|
| D1 | 9 | Every ruling line met; c1-v3 residual (m1) |
| D2 | 9 | One field, one map row; old key gone from the library |
| D3 | 9 | One per-person fact any form can map |
| D4 | 9 | No hidden field a form needs (coverage gap none: the placement exists) |
| D7 | 9 | AI proposal corrected through the review door with a recorded reason |
| D16 | 8 | 18/18 reproduced; m2, m3 |
| D18 | 9 | The box's source reads "worked out: the person's role on the case" |
| D19 | 9 | Configure → release → family case → PDF read-back, on the configured checkpoint |
| D17, D20 | simulated only | |

## BIC (case side, §6)
* BIC-01 Ask once: **Met** (role known → never asked).
* BIC-02 Asked for a reason: **Met** (the question is absent; nothing reads the old one).
* BIC-09 Principal change: **Met by code reading** (re-derived on swap; not walked).
* BIC-19 and BIC-20: **Partly** (axe 0, no sideways scroll at 1440 and 1024 on the case page and client questionnaire; keyboard and 200 % zoom not walked; the screens themselves are unchanged).
* Others: N/A (no screen change).

## Journey score (the one score for this check)
**8 / 10, pass, no 0.** Report: `screens/QA-400/journey-test-reviewer-2026-11-11.md`.

## Could not check
* C6.2, C7.1, C10.1 and the full CI set (the builder's run).
* The graph tool: it writes `qa/GRAPH.md`, outside my two files.
* A keyboard-only walk, 200 % zoom, a real screen reader.
* An unaided user (D17, D20).
* The demo's update after merge.

Note: during the review the working copy showed 23 deleted `screens/R1-thin-slice/screenshots/r1c/*` files. These come from the builder's background C7.1 run (`tests/runtime/check_runtime_r1c.cjs` writes there), not from this review. I left them as they are.

**Verdict: Approve** (no open Blocker or Major), for commit 61e6261b2ffdca186e635aaacc9364ca2596c8cb. Minors m1 (record and open a qa row) and m5 (say in the PR) go in the PR body; m2 and m3 are small test hardenings, welcome in this PR or next.

## Re-review (11 Nov 2026): head f3d83d563b5fb763a193e803c782553a3a653c9c
Scope: `git diff 61e6261b2..f3d83d563 -- …/prototype/studio` (2 files). The other 2 files in the diff are this review's own records.

* **m3, closed.** The fix is at `040-field-map-review.ts:70-71`: a correction applies only when `payload.kind === "field"` (the SCH1 proposal's payload is `kind: "field"`, checked in my copy's database earlier). Check B now also asserts "1 edited, 1 returned with a reason". If a correction ever takes the showcase's first item, that line goes red.
* **m2, closed.** There are two new A lines on `scopeRefusal`. Mutation check, engine only with no server: as committed, both lines pass. With the `person.is_principal_applicant` entry removed from PERSON_ONLY (`field-scope.ts:53`), the household-refusal line fails and the ordinary-key line still passes. I then restored the file; it is unchanged in git.
* **Not re-run here:** the full check against the configured checkpoint. The builder reports 20/20. The packs reported are r1c 140/140, r1d 97/97, r1a 98/98, qa122 7/7, C10.1 28/28 and qa144 35/35; the R1 order re-run is still in progress.
* **Still open:** m1 (c1-v3: PR body plus a tech-lead question), m4 and m5 (PR body). The IMM 0008 DEP box goes to qa. None of them blocks.

**Verdict: Approve**, for head f3d83d563b5fb763a193e803c782553a3a653c9c.

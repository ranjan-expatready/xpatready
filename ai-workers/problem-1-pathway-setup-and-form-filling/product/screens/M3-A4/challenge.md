# M3-A4 (B106) Eligibility rules on the combination: fresh challenge

Independent challenger (did not draft the concept), 6 Nov, on main 52d2118b3 (concept commit; code as at 237baacd0) plus A1's branch (#1084, `claude/optimistic-newton-oblygl`) for the checkpoint's gates. `ai-workers/tools/freshness.sh` failed (no `code/` copy in this cloud clone), so the team-side claim "AG-03 has no gate-authoring screen" is **Unverified**.

## Verdict
**Build after these changes.** No Blocker. The core holds: every API, rule and record the screen needs already exists and was checked in code. One Major: the refusal test for "a second person releases" cannot be walked the way the concept writes it. The Minors are copy facts, numbers that must agree with the rest of the page, and round-trip tests.

## Objections

**Major 1: the "author releases their own change" test cannot happen; J-A4's refusal is enforced by duties and the SME signature, not BR-14.** *Needed for the proof.* Confidence: high (fact).
* Breaks: BR-6's fail test ("author's own release refused (409 words)") and J-A4's "Removing a gate without a second person is refused". The author (`user-A`, duties author+review) has no `approve` duty (`api/src/core.ts:40-42`). On screen, Approve and release is disabled for them with "Only the approver duty can release" (`web/src/pages/review.tsx:130`). By API it is a 403 from `need(actor,"approve")` (`studio.ts:1071`), never BR-14's 409. No simulated person holds both `author` and `approve`, so the BR-14 path (`studio.ts:1088-1091`) cannot be reached from this screen. A test written as specified either fails or quietly asserts the wrong thing.
* Example: the builder's Playwright step clicks Release as the author. The button is `disabled`, so the step times out or gets skipped.
* Fix: test J-A4's refusal as three checks. (a) The author removes "Passport number answered", saves and submits. Release is disabled for the author, and `POST …/approve` as author returns 403. (b) The approver releases before the content reviewer signs and gets 409 "1 change needs the content reviewer's SME sign-off." (`studio.ts:93-94`). (c) After the reviewer signs, the approver releases. Rewrite BR-6's text: the save counts as authoring for BR-14 because the PUT's audit row carries `combinationId` (`eligibility.ts:53`, collected by `draftAuthors` `studio.ts:1009-1012`). That is existing behaviour, already covered at API level, and not re-walked here.

**Minor 1: wrong fact in the remove-confirm copy and in BR-6's test.** *Needed for the proof.* Confidence: high. "Cases keep it until the change is released" implies open cases lose the gate at release. They do not: a case pins the newest release when it opens and never moves (`runtime.ts:99,121`, `PackWorkPin`; STANDARDS §3.7). Fix: "Cases already open keep it. Cases opened after this change is released do not have it." Assert in the test that a case opened *before* the release still lists the removed gate.

**Minor 2: "Released in Release 2" would show a number that disagrees with the page header.** *Needed for the proof.* Confidence: high on the code, medium that the two numbers differ on the checkpoint. GET eligibility-gates `released.release` is the combination's `configRelease.version` (`eligibility.ts:32`). The header's "In Release N" is the pack version (`combination.tsx:84`; `studio.ts:441` `release: r.packVersion?.version ?? r.version`). Fix: take the number from `GET /combinations/:id` `releases[0].release`, or drop it ("Released").

**Minor 3: the draft count may disagree with Review and release.** *Needed for the proof.* Confidence: medium. The concept compares the draft with `released` itself. Two problems: the draft's `disclaimer: null` against the release's default text (`snapshotEligibility` fills `DEFAULT_DISCLAIMER`) would read as a disclaimer change, and reorders and judgement lines are counted by other rules. Fix: count "Draft: N changes" from `draft.changes` where `kind === "Eligibility"` (`studio.ts:433,443`). That is the same `eligibilityChanges` list the reviewer signs. Mark gates by key only.

**Minor 4: no word when a submission is already waiting.** *Needed for the proof.* Confidence: high. A save while a submission is SUBMITTED is accepted. Release is then refused with "The draft changed after it was submitted: submit it again…" (`studio.ts:92`). Fix: when `submission.status === "SUBMITTED"` (already in `GET /combinations/:id`), the section's footer and the saved toast say "A submission is waiting for review: saving changes the draft, so it must be submitted again." Add one browser step for this.

**Minor 5: the dialog must round-trip what a save could lose.** *Needed for the proof.* Confidence: high on the rule; the field type of `person.criminal_history` is unverified. The PUT replaces the whole set. A missing `disclaimer` clears a saved one (`checkGates`, `input.disclaimer != null`). A gate sent without `whenNotMet` drops "needs_review" and silently turns S7's conviction gate into Not eligible (P-230 (1); the C6.9-7 behaviour). `ConditionBuilder.typed` converts only `yes_no` and `number` (`conditions.tsx:41-45`): a `declaration` fact would be sent as the text "false" and refused. Fix: add one pass test. Load the checkpoint, change only the label of "Passport number and expiry date answered (Sample)", and save. Then the GET equals the before state except that one label, `vv.no_convictions` still holds `needs_review`, and a saved disclaimer is unchanged. In the builder, treat `declaration` like `yes_no`. Both S7 gates are flat (`and` of two `exists`, and one `eq false`), so `isFlat` opens them in the simple editor without JSON (`conditions.tsx:35`), which is sound.

**Minor 6: the browser check and C6.9 must not share a copy.** *Needed for the proof.* Confidence: high. C6.9-4 asserts exactly 2 gates (`acceptance/C6.9.test.ts:33`). After J-A4 releases a third gate on the same copy, it fails. Fix: run C6.9 on a freshly loaded checkpoint (Demo › Reset, then Load), or run it before the browser check, and say which in §9.

**Minor 7: the mount point and the landing anchor do not match what the concept says.** *Needed for the proof.* Confidence: high. One line in `combination.tsx:152` puts the section after Rules, Checks and "Facts a rule needs" (`questionnaires.tsx:50-52`), not "after Questions for each person". The checklist sends Eligibility problems to `questionnaires:problems` (`engine/setup-checklist.ts:154`), where `PartProblems` already lists them (`part-problems.tsx:17`), so nothing ever lands on `questionnaires:eligibility`. Fix: accept the end-of-tab place in the concept text, or make the one line `questionnaires.tsx:50` (stream B takes it under H6). Drop the unused anchor, or link each PartProblems line to its gate. Do not add a second list of the same problems without saying so.

**Minor 8: the author check must not reuse the answer-key flags.** *Needed for the proof.* Confidence: high. `useDuties()` has no `author` field: `.key` and `.run` are author *or* expert (`answer-key-editors.tsx:28-29`). If the builder uses them, the content reviewer gets an Edit button and then a 403. Fix: read `duties.includes("author")` from the session.

**Minor 9: the key fallback is unstated.** *Needed for the proof.* Confidence: medium. A label with no Latin letters or digits after folding (for example one written only in another script) makes `gate.` plus nothing, and `KEY_PATTERN` refuses it (`engine/eligibility-gates.ts:24`) with "Give the gate a key", but the screen has no key field. Fix: fall back to `gate.rule_<n>`. Count a key as taken if it is in the draft or the newest release.

## What is sound
* A new case pins the newest release (`runtime.ts:99`), and the run reads that pin's `snapshot.eligibility` (`assessments.ts:64-67`). So "the next case check uses it" holds once the release is made.
* `draft.problems` carries `where: "Eligibility"`, `item: g.key` (`engine/eligibility-gates.ts:183-206`, `validate.ts:167`, `studio.ts:435,443`), so BR-7 can show each problem under its gate.
* A relabelled gate with the same key reads "changed", "old → new" (`engine/eligibility-gates.ts:225-231`). BR-4's reason is real: rule-set answer keys check gate keys (`engine/answer-keys.ts:220-222`) and fail with "(gate removed)" when a key goes (`:362-363`). The remove-confirm line about tests is therefore true. Released assessments store gate keys too.
* Permissions: GET and PUT go through `readerOf`, so case staff and clients get 403 "Not for case people" (`core.ts:66-69`, `eligibility.ts:72-73`). PUT also needs `author`. Release needs `approve`. Signing a submission needs `sme` for Eligibility lines, and the submitter cannot sign it (`studio.ts:1049-1056`).
* `route-has-screen.mjs` finds `api(\`/combinations/${id}/eligibility-gates\`, { method: "PUT", … })` once the method is written next to the call, so removing the allow-list line (`route-has-screen-allow.txt:18`) passes.
* On the checkpoint, the demo workspace with no rule-set key turns the answer-key gate into a warning (a Demo release), not a refusal (`engine/answer-key-gate.ts:53`). J-A4 can be walked. Q1–Q3's recommendations are right, and Q1 is needed: the builder offers `EACH_PERSON` and calculated values, which the server or the release check refuses.
* Scope matches the row: no migration, no route, no AI. "Not built" is drawn honestly: trying a gate before release, test counts, and reordering.

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Section (read) | `combination.eligibility`; newest `config_release.snapshot.eligibility` | GET `…/eligibility-gates`; GET `/combinations/:id` (problems, changes, submission, releases) | BR-2, BR-6, BR-7; Minors 2, 3, 4 | read-only as approver; marks by key; count = Review's Eligibility lines |
| Edit dialog (save) | same jsonb, version +1, audit row with `combinationId` | PUT `…/eligibility-gates` | BR-1, 3, 4, 5, 8, 9; Minor 5 | field errors; 409 keeps edits; round-trip of `whenNotMet`/disclaimer |
| Release | `review_submission`, `review_signoff`, `config_release` | submit / signoff / approve (unchanged) | needs_sme; approve duty; BR-14 via `draftAuthors` | Major 1 (a)–(c) |
| Case check | `pack_work_pin` → snapshot | POST `/runtime/cases/:id/assessments` | the new case pins the newest release | new case lists the gate; an open case keeps the removed one (Minor 1) |

## Questions for the founder
None: Q1–Q3 are the tech lead's, and the recommendations stand.

## Lead response
Tech lead (Lead 23), 6 Nov, PR #1172 comment 6689209645: **approved, to build after the challenge's changes.** Major 1 tested as (a), (b), (c) above; BR-6 reworded. Minors 1–9 as written (m2: the number from `GET /combinations/:id` `releases[0].release`; m6: C6.9 on its own freshly loaded checkpoint; m7: the end-of-tab place and the existing `questionnaires:problems` anchor; m8: `duties.includes("author")`). Q1 yes (additive, default off, the four users' suites run), Q2 yes, Q3 yes.

## Agreement
Builder (seat B-2) and tech lead agree: build as the revised concept (§10, §11) says; no founder question. If A1 (#1084) is not on `main` at the check, C6.9 runs on the fixture and the PR says so.

## Build discoveries
_(to be written by the builder)_

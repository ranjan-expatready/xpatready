# G4 Answer-key families and runner (C5.7): independent challenge

Challenger: a fresh agent that did not draft the concept, 2 Nov 2026 (skill screen-concept, part B). Read: `concept.md`; SA-01B v2.1 SA-1B-296, SA-1B-181, SA-1B-199 (name-free copy `domain/requirements-2026-11-02/`, dated today; `ai-workers/tools/freshness.sh` cannot run in this cloud copy because `code/` is absent, so the team's code claims inside the cards are Unverified); P-240, P-249; `STANDARDS.md`, `EXPERIENCE.md`; the app code named below at commit 12647032. The branch also holds uncommitted draft code (`engine/answer-keys.ts`, `engine/form-values.ts`, `api/src/fill.ts`, `prisma/schema.prisma`). I read it as evidence of intent. Several fixes below are already in it but not in the concept, and the concept is what gets approved and reviewed.

## Verdict
**Build after these changes.** No Blocker. The idea, the scope and the pure-engine split are right. As written, the concept would let a stale "Passed" stand, departs from the team in two places without saying so, and leaves the expected values' format and how they are entered undefined.

## Objections

### Major
**M1. BR-1 and BR-3 describe the preview fill, not the case filler that files forms.** *Needed for the proof.* Fact, high confidence. BR-3 says "family facts become confirmed known facts → `render` coverage → the value step". That is the configuration preview path (`api/src/fill.ts:85` `studio.preview`). A real case copy goes through `formCoverage` → `markNothingRecorded` → `writeForm` (`api/src/fill-case.ts:165-166, 212`), and those steps add three things the concept's path does not:
* `knownOf` reads numbers typed as text as numbers and works out `person.has_children` from the people on the case (`engine/runtime/case.ts:231, 238`).
* `formCoverage` refuses to write a confirmed value that fails its checks (`engine/runtime/forms.ts:24-29`).
* `markNothingRecorded` writes "N" in the "is anything recorded?" boxes only after a confirmed "none apply" for the group (`forms.ts:39-54`). For IMM 5257 that is post-secondary education and previous countries of residence (`tests/check_c72_imm5257_fill.ts:1-11`).

*Example:* a family with no education history. A real copy writes "N" in that box. A run that follows the concept leaves it blank, so a key that holds the correct "N" fails, and a broken none-apply rule goes unnoticed. The family shape in BR-1 has no way to say "none apply" either.
*Fix:* write the draft's path into the concept. BR-1 gains `none_apply[{about, group}]` and rows numbered from 0 with no gap. BR-3 becomes: the family is turned into a case (Participants, VERIFIED Answers, Rows, GroupAnswers), then `formCoverage` → `caseView` + `markNothingRecorded` → `formValues`, with **today = the family's `reference_date`**. The concept says only "the date", and ages (`render.ts` ageGate), `checkValue` and form `min_age` all read it. Draft: `engine/answer-keys.ts:100-115, 185-194`.

**M2. BR-5 fingerprints miss the family and much of what changes a result.** *Needed for the proof.* Fact, high confidence.
* *The family.* A run stores only the item fingerprint and the key version (BR-5; the draft's `runState`, `answer-keys.ts:227`, and `AnswerKeyRun` have no family version). *Example:* the author edits the family and changes the spouse's given name. Every key that uses the family still reads "Passed", and the signed expected values no longer match the facts they were signed for.
* *The item.* "Map: form, edition and entries; rule set: gates" leaves out the other inputs the run reads, and a change to any of them gives the stale Passed that BR-5 forbids. *Example:* the author renames a key in the country answer list. `codeForValue` now returns null and the box goes "by hand" (`fill.ts:53-54`), but the map entries are unchanged, so the result still reads Passed. The missing inputs are:
  * answer lists and their option maps (`fill.ts:38, 54`);
  * the form line's `who`, `condition`, `min_age` and `channel` (`render.ts:180-189`);
  * derived fields (`render.ts:110`);
  * whether a placement repeats once per case (`render.ts:121`);
  * field formats (`checkValue`);
  * the form field list, which the snapshot names only by its path (`engine/snapshot.ts:148`).
*Fix:* the run stores the family version too. BR-5 adds "and the whole snapshot's hash", as the draft's `inputs` already does (`answer-keys.ts:117`): this can mark runs Not run when nothing relevant changed, but never leaves a stale Passed. The API adds the form field list's sha256. A change to a family that a signed key uses sends the key back to Draft (Q3).

**M3. BR-7 departs from the team on who enters the expected values.** *Needed for the proof.* The team's rule is a fact, high confidence; the fix is my judgment. SA-1B-296 r2: "One answer key per item version and family, **entered and signed by the expert**". The concept has the author write the values and the expert sign them, and adds "the signer is never the key's last editor". The app has one expert (`user-C`, the only person with the `sme` duty, `api/src/core.ts:34`). So the team's flow (the expert types the values, then signs them) is blocked: the expert's own edit makes them the last editor (draft `signProblem`, `answer-keys.ts:236`). The team's independent check is the second person approving key changes with the draft (r2), which the concept itself leaves to G2 (Q3).
*Fix:* give the `sme` duty the right to enter and edit expected values (the author drafts families and may draft keys), drop "never the last editor", and record any remaining difference as a decision. Founder Q1.

**M4. The P-249 "lift-ready" claim is not met for the data shapes.** *Needed for the proof* (the done-means cites P-249). Facts high, severity medium. P-249 (1) makes contracts lift-ready "with the team's model names".
* *Names.* SA-1B-296 f.7 defines `TestFamily{familyKey, persons[{role, location, ageOnReferenceDate}], answers}`, `AnswerKey{itemRef, itemVersion, familyKey, expected, state DRAFT|SIGNED, signedByUserId, signedAt, changeReason}` and `AnswerKeyRun{itemRef, itemVersion, familyKey, result, failures[], ranAt}`. The concept and the draft use `answer_key_family`/`AnswerKeyFamily`, `people`, `facts`, `item_kind`, `lines`, `fingerprint`, `signedBy`, with no mapping.
* *Code outside the engine.* `engine/form-values.ts` imports `p5/transforms.ts` (and `engine/options.ts` does too), which sits outside `engine/`.
* *Personal-data tags.* Family facts are person-shaped (names, dates of birth, passport numbers) but carry no classification tag.

*Fix:* name the engine types and Prisma models `TestFamily`, `AnswerKey` and `AnswerKeyRun` with the team's field names. Our extra fields (reference_date, person id and label, none_apply, lines, fingerprints, version, item_kind) go in a "Team → ours" table, as C6.9 did for AG-03. List `p5/transforms.ts` in the lift package. Tag the family columns "made-up test data, no personal data".

**M5. BR-4 is workable, but the concept does not say what an expected value is or how one is entered.** *Needed for the proof* (part 2). Facts high; the burden estimate is medium confidence.
* *Why BR-4 holds.* The team requires it: "compares every box" (SA-1B-181 r3). In effect, a box the key does not list must stay blank, so a key covers the whole form.
* *How big a key is.* For IMM 5257, E1's checked complete fill (it passed Adobe Validate on 23 Oct) writes **67 boxes for one applicant** and leaves 191 blank (`prototype/evidence-lane/E1/imm5257/values.complete.json`). The app's Sample case fills 40 of the 46 mandatory boxes (C7.2). So a key is about 45 to 70 lines per applicant who files the form.
* *What a value looks like.* Each value is in the form's own encoding: "01" for English service, "VisitorVisa", the year, month and day boxes ("1962", "07", "08"), and "N".
* *What the concept leaves out.* It does not say that the expected value is the value as written, after transform, code and format. Section 4 shows results only and has no editor. Typing codes breaks STANDARDS §3.2 "Pick, don't type".

*Fix:* (a) BR-4 states that the expected value is the value as written in the form field, compared exactly. (b) Part 2 adds an Expected editor: every mapped box of the form for each person, in the form's own order, with its caption and whose fact it reads. A choice box picks from the form's own options and shows the label beside the code; a blank means "stays blank". (c) A box a person fills (signature, oath) cannot be given a value (refused 400).

### Minor
* **m1. The acceptance test should run the team's wrong-person case.** *Needed.* SA-1B-181's first test wires the spouse's given name to the principal. IMM 5257 reads the spouse on the principal's form (E1: the spouse's family name, given name and date of marriage). Use a principal plus a spouse who share a family name, and take the expected values from E1's 67 checked values, not from the runner's own output (otherwise the key only repeats what the code does).
* **m2. A family person has no `applies` flag.** *Not built* (unless m1's spouse does not travel). The draft sets `applies: true` for everyone (`answer-keys.ts:102`). E1's household, where the spouse stays home, cannot be expressed: the spouse's own IMM 5257 would then need a key too. `Participant` already has `applies`, so add it to the family person.
* **m3. Roles are hard-coded and do not match `aboutOf`.** *Not built.* The draft's `ROLES` (`answer-keys.ts:21`) is a code list, while roles come from the library's person roles (`render.ts:10`). A "parent" person is never read: the parent boxes read `<subject>/parent_1` (`render.ts:128`). There is no representative or sponsor role, so IMM 5476, the card's own example, cannot be tested. Fix: take roles from the combination's participants and allow `about` = `<person>/<relation>`.
* **m4. Contracts are not written first.** *Needed.* STANDARDS §6 asks for zod schemas in `contracts/`, used by the API and the web. The draft checks input by hand inside the engine.
* **m5. The fail line gives no reason.** *Needed.* Copy: "expected 'X', got blank: <the filler's reason>". The value step already returns `why`, e.g. "no code in this form field's option map".

## What is sound
* Families are made up, Sample until signed, and never linked to a case; nothing is written by AI and the cost is US$0 (SA-1B-296 f.4 and r1, P-240).
* The value step is moved out of `writeForm` unchanged, so one function serves both the real fill and the test. The draft's `formValues` matches `fill.ts:41-61` (main) line for line.
* The runner reuses the engine that cases use: the draft already goes through the case path (M1). `assess` is reused for rule sets.
* BR-4 "written, not expected" is how a wrong-person wire is caught. BR-6 (one key per edition), BR-8 (versioned saves, 409, audit without family values), signing on the version shown, and a one-line reason for changing a signed key all trace to the cards.
* Scoring is refused rather than faked (Q1). The tab and layout follow the list → detail pattern. Tests are named per rule.

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test (pass and fail) |
|---|---|---|---|---|
| Family | `TestFamily` (team names; facts, none_apply, reference_date, version) | `GET/POST /api/answer-keys/families`, `PUT /families/:id {version}` | BR-1, BR-8, m2, m3 | bad person, fact or row → 400 on the field; stale version → 409 |
| Key | `AnswerKey` (+family version, edition) | `POST /api/combinations/:id/answer-keys`, `PUT /answer-keys/:id {expected, version, reason?}` | BR-2, BR-6, M5(c), BR-7 reason | unknown box or gate → 400; a box a person fills → 400; changing a signed key without a reason → 400 |
| Sign | `AnswerKey.state`, signedByUserId, signedAt | `POST /answer-keys/:id/sign {version}` | BR-7 as M3 | expert → 200; author → 403; stale version → 409 |
| Run, map | `AnswerKeyRun` (+familyVersion, item, inputs and form field list hashes) | `POST /answer-keys/:id/run` | BR-3 as M1, BR-4 | the IMM 5257 family passes every line; the spouse's given name wired to the principal fails naming the box; a none-apply "N" is checked |
| Run, rules | `AnswerKeyRun` | same | BR-3 (`assess`) | outcome matches; one gate changed → that gate fails |
| Staleness | worked out when read | `GET /api/combinations/:id/answer-keys` | BR-5 as M2 | a family edit, an answer-list edit or a map edit → Not run |
| Value step | none | none | `engine/form-values.ts` | `check_c72_imm5257_fill.ts`, `check_forms_slice2.ts` and `check_forms_c31_*` stay green |

## Questions for the founder
1. **Who types the expected values?** Recommended: the immigration expert enters and signs them, as SA-1B-296 r2 says. The author writes the families. The independent check is the second person approving key changes with the draft (G2). Otherwise: the author types them and the expert signs, which needs a second expert or the rule "never the last editor" removed, and is recorded as a deviation from the team.
2. **Keys per combination or per form edition?** Recommended: per combination for G4, as the concept proposes, recorded as a deviation from SA-1B-296 f.7 (whose `AnswerKey` has no combination; our maps belong to the form edition and are shared, `prisma/schema.prisma:602`, `engine/snapshot.ts:96`). The cost: the expert signs IMM 5257 again in each combination that files it. Revisit when a second combination files a form that has a signed key.
3. **What happens to a signed key when its family changes?** Recommended: it returns to Draft with the family change as its reason, because the expert signed values for different facts. Otherwise: only its runs go to Not run, and a signature can stand on facts nobody checked.

## Lead response

## Agreement

## Build discoveries

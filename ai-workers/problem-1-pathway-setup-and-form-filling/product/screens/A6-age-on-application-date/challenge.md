# A6 (B102): age in whole years on the application date — fresh challenge

Challenger: a fresh agent that did not write the concept (skill screen-concept, part B), 7 Nov 2026, on `cd8973121` (concept) over `origin/main` `ecbd68301`. Read: `concept.md`, the sprint plan's Row A6, `STANDARDS.md` §3, `DECISIONS.md` (P-158, P-252, P-319, P-352), and the code it names. A builder's uncommitted draft was in this copy (`api/src/worked-out.ts`, a diff of step 325 and `samples/conditional-documents.json`). I read it only to check the design can be built. Line numbers below are from the committed code. `ai-workers/tools/freshness.sh` fails in the cloud (`code/README-copies.md` is missing), so the team's code is **Unverified**. canada.ca was not re-read. The Guide 5256 quote matches the committed capture word for word (`prototype/p1/inventory/guide-5256.text.inventory.json`, "Minors travelling alone"; manifest `downloaded_utc` 2026-10-19).

## Verdict
**Build after these changes.** The design can turn the C6.4 pack green. C3.6's door builds `case.application_date` from the label "Application date" with subject "case". Its scope is CASE_LEVEL, so the case reads it once (`proposals.ts:277`, `resolver.ts:64`). `evaluate` works the age out from the person's own facts and the case's facts (`resolver.ts:102-105`, `contracts/rules.ts:107-116`). The release check accepts a derived value whose reference is placed once per case. It would accept it just as readily if the reference were not placed at all (M1). That missing check, and the governance (M2), must be fixed before the build.

## Objections
### Blocker
None found.

### Major
**M1. The release check that BR-6 and Question 1 rely on does not exist. Needed for the proof.** *Fact (high confidence):*
* `checkCondition` accepts any derived id (`engine/validate.ts:40-47`).
* `reachability` checks only the conditions of question placements (`:213-229`).
* `derivedRead` is used only for the "no tested helper" warning (`:168`) and for withdrawn fields (`:76-77`).
* Gates refuse a derived value outright (`eligibility-gates.ts:213-214`).
* `snapshot.ts:191` pulls the inputs and reference into the release but never requires them to be asked.

The concept (BR-6) and the draft's header both say "the release check already refuses a worked-out value whose dates are not asked". Nothing does. *Example:* the application date is in the library but not placed, or its placement is retired. The release passes, and every child's five lines say "answer the application date first" with no question to answer. The answer can only be saved by calling the route directly (`case.ts` `checkType`). This breaks STANDARDS §3.6. *Fix:* in `validate()`, for each executable derived value in `derivedRead(s)`, each input and the reference must be placed or supplied by a document. Otherwise raise an error in words: "worked out from "Application date", which no question asks". Add one pass test and one fail test. This is one function in `engine/validate.ts`, with no migration.

**M2. Governance: the worked-out value is one person's free text, shared across the whole workspace and impossible to undo. Needed for the proof.** *Facts:*
* `derived_field` has no status, version or proposer (`prisma/schema.prisma:938-950`).
* Every combination's snapshot carries every derived value in the workspace (`snapshot.ts:220`).
* The release's change line for an added definition shows only `plain` (`validate.ts:330`). The inputs and the reference appear only on a "changed" line.
* By contrast, C3.6 facts need two people (`rule-facts.ts:1-6`, `:262`; P-252 (5): "the same second-person review"). STANDARDS §3.2 says new masters come only through a governed Add.

*Example:* the author picks On = "Intended stay from" but types "…on the application date". The Approver's Review shows "Derived definition added: The person's age … on the application date" and approves it. Minors are then judged on their arrival date while every screen says "application date". *Fix (judgment, adds no table):*
1. The server writes the words from the choices: "Age in whole years from Date of birth, on Application date". BR-6's 10–300 characters become an optional note.
2. The Review line for an added definition names its from and on dates by label.

With those two, Question 1's "release approval is the second person" holds: `canRelease` already refuses an author as approver (`contracts/rules.ts:29-40`), and the line is marked `needs_sme`.

**M3. The engine fixes the date's key, but BR-4 lets the author choose any date about the case. Needed for the proof.** *Facts:*
* `APPLICATION_DATE = "case.application_date"` sets the date ages are measured on (`case-checklist.ts:24`, `:123-126`).
* The 5-year guard applies only to that key (`case.ts:147-150`).
* The key is built from the typed name (`library-changes.ts:45-52`) and built again from the name as decided at accept (`rule-facts.ts:243-244`, `proposals.ts:600`).

*Example:* the author or the reviewer names it "Date of application", so the key becomes `case.date_of_application`. The minor lines work the age out on that date, but BR-8's Documents line says "(the application date)" and measures on the constant, or on today. The 18-or-older lines use today, and the 5-year guard is off. *Fix:* BR-8's age, its date and its words come from the release's derived value (`reference` and that field's label), never from the constant. Step 325 refuses a key that differs (the draft already does). This is STANDARDS §3.1: content is data.

### Minor
* **m1. The application date's source names a rule that does not read it. Needed for the proof.** `addForRule` never checks that the named rule reads the key; `add` does (`rule-facts.ts:179` vs `:227-229`). The proposal therefore quotes the letter-of-authorization line, which has no date (`:259`), and the reviewer checks a name against an unrelated sentence (P-158: "added by naming that rule"). *Fix:* the proposal's reason and `work` name the chain, for example "measured-on date for person.age_years, which <rule> reads".
* **m2. BR-5 misses waiting adds by name. Needed for the proof.** The draft (and C3.6's `waitingFor`, `rule-facts.ts:150-155`) matches `work.ruleFact` only. Proposals made by `addForRule` carry `work.keyPreview` (`:264`). A waiting "Age years" item, whose preview is `person.age_years`, slips through. `addForRule` also does not refuse a built key that is already worked out, which would leave one key both asked and worked out. *Fix:* match `keyPreview` too, and refuse a key that is in `derived_field`. Add one test each.
* **m3. Every combination shows the new definition. Not built.** The value is added to all snapshots (`snapshot.ts:220`), and `validate.ts:328-331` lists it, marked `needs_sme`, on combinations that never read it. Their fingerprints change. *Fix:* a follow-up row lists only `derivedRead(s)` on Review. Changing the snapshot now would move released fingerprints.
* **m4. J-A6 walks only the case officer. Needed for the proof.** The new screen belongs to the author: add the date, have it accepted and approved, place it, work the age out, release. P-352 and the breaker run (P-278) need that walk. *Fix:* add J-A6a, the author by screens, ending at "Release".
* **m5. Where the date is asked is unstated. Needed for the proof.** "Places it once per case" names no section and no "collected from" (the draft uses `staff_working_view`, beside `case.intended_stay_from`). While the date's proposal waits, the On list is empty and says "add it first", but it should say "waiting on To review" (`worked-out.ts` reads only DRAFT and PUBLISHED). *Fix:* put the section and who answers in `samples/conditional-documents.json`. "Answer the application date first" links to the case question (`Missing.on: "case"`).
* **m6. Copy in §5 contradicts itself. Needed for the proof.** The text "(today: … not answered yet) never used …" contradicts itself. With no date, `agesOnWhy` gives the 18-or-older lines an age on today (`case-checklist.ts:126`, `:169`), while the age line says "answer the application date first". The same person can show "17 on <today>" and "no age" on one page. *Fix:* when the date is missing, the age line names no age, and the 18-or-older reason says "on today's date" in the same words.

## What is sound
* **Data, not code.** The 18 stays in each line's condition (BR-9). The `worked_out` block is in the samples. Nothing hard-codes a combination or form number (P-319 clean). No migration.
* **C6.4 red steps.** The lines go in once their fact is known (step 325, lines 37-42). The two facts are then added (`:54-61`). `evalCondition` takes executable derived values (`render.ts:37-38`). C6.4-20 stays green because the same placements already pass in the fixture run (`acceptance/lib/setup_vv_m3.ts` S6a).
* **Labels (AGENTS rule 4).** The application date, 29 February and the reference date are labelled correctly: Sample, Unconfirmed: expert / no counsel (`contracts/rules.ts:74-77`). The Guide 5256 quote is verified in the capture.
* **No duplicates.** The engine work exists and is reused: `ageInYears`, `CALCULATIONS`, and "ask the inputs first" (B-M3). The new route is a new file, not `runtime.ts` (H6).

## Back-end plan (element → record → API → rule → test)
* **Application date** → `canonical_field case.application_date` (CASE_LEVEL) plus `section_question` once per case → `POST /combinations/:id/rules/:key/fact`, then `/review/proposals/decide`, `/library/changes/:id/approve`, `POST /library/fields/:key/placement` → BR-4, m1 → C3.6 checks, and a key-mismatch refusal in step 325.
* **Worked-out value** → `derived_field` (no migration; words built by the server, M2) → `GET`/`POST /combinations/:id/rule-facts/…/worked-out` → BR-1…BR-6, m2 → `tests/check_b102_worked_out.ts`, one pass and one fail per rule.
* **Release** → snapshot `derived_fields`, with the reference pulled in → `validate()` new dependency check (M1) and a Review line with from and on (M2) → pass/fail on an isolated copy.
* **Age on the person** → `caseChecklist` `people[].age` from the derived value's `reference` (M3) → `GET /runtime/cases/:id/checklist` → BR-7, BR-8 → engine tests (birthday eve, birthday, 29 February, birth after the date) and `acceptance/C6.4.test.ts` 30/30 on a fresh checkpoint; the fixture stays 30/30.
* **Screens** → `rule-facts.tsx` row and `checklist.tsx` age line → browser check, J-A6 and J-A6a, axe.

## Questions for the founder
1. **Who approves a worked-out value?** **Recommend:** the release's Approver, as the concept says, but only with server-built words and a Review line that names its dates (M2). A second-person library change would be a follow-up row if you want it. *Alternative:* route it through To review like C3.6 now (more work, but consistent with P-252 (5)).
2. **On which date does a minor's age count?** **Recommend:** the application date, labelled Sample, Unconfirmed: expert. The immigration expert confirms it or names the travel date; the answer is a data change only.
3. **Undo.** **Recommend:** no removal in this row. A follow-up row lets the author remove a worked-out value that no approved release reads, which STANDARDS §3.5 asks for.

## Builder response (for the tech lead; the Lead response stays the tech lead's)
* **M1, done in the route, not in `validate()`:** `POST …/worked-out` refuses a date the combination's questionnaire does not ask ("… is in the library but not asked in this combination's questionnaire: place it first"), with a pass and a fail in `tests/check_b102_worked_out.ts`. A release-wide check in `engine/validate.ts` is not added in this row: it is a shared engine file, and every snapshot carries every worked-out value of the workspace (m3), so a new error there could refuse other combinations' releases; proposed as a follow-up row with m3. A placement retired later is not caught (named here, not hidden).
* **M2, done:** the server writes the words from the choices ("Age in whole years from Date Of Birth, on Application Date."); typed words are refused. The Approver's Review line (`validate.ts:330`) shows those words, so it names both dates without touching `validate.ts`. Question 1 kept, with that.
* **M3, done for BR-8:** each person's age line reads the release's own worked-out value (its input and its reference date), never the constant; the words say "the application date" only when the reference is `case.application_date`, else the date's own question. The 18-or-older lines and the 5-year guard still use the constant (existing behaviour, not this row).
* **m2, done:** BR-5 also refuses while a proposal made by name (keyPreview) waits.
* **m5, done:** the checkpoint asks the date once per case in the staff working view, beside the intended stay dates; the "On" note now says to decide a waiting proposal on To review or place the date.
* **m1, m3, m6:** not changed (m1: C3.6's add by a rule's key does not require the rule to read the key, by design; m3 follow-up; m6: the 18-or-older lines' "today" fallback is existing behaviour, and the age line now says "answer the application date first" when the release measures age on it).
* **m4, done:** J-A6a (the author by screens) added to the concept and walked.
* **Build discovery:** on the checkpoint, "Application date" is close to the library's "Csq Application Date", so C3.6 asks for a reason; the sample data now carries it.

## Lead response

## Agreement

## Build discoveries

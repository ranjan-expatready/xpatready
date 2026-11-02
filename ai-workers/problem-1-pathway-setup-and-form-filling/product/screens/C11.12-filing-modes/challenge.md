# C11.12 Filing mode per role: fresh challenge (independent challenger, 2 Nov)

Read: `concept.md`, `board.html`; P-135, P-119, P-209, P-106, P-122, P-220; CAPABILITIES C11.12 and C6.12; ASSUMPTIONS C1, B4, C7; BACKLOG L1; r5c BR-1, BR-16, BR-18 (`origin/claude/m3-design-baf010`); the runtime and studio code listed below on the main copy (tip `bae3db4b`; the concept says `2c6cb092`, but the lines it cites are the same); `ircc_filing_units.md`; the six-combination research note (`origin/lead/2026-11-02-vv-research`); compliance-trace IRCC-P2-02, P2-03, P2-28; STANDARDS §5, EXPERIENCE §2. Nothing was run or committed, and nothing was spent.

## Verdict

**Build after these changes.** The core is right and needed: three filing modes per role (P-135), the editor's mode-dropping defect, the principal rule, a preview, and on-principal people becoming applicants on the principal's filing. The six-combination table matches the research and IRCC. But one Blocker would turn the M3 acceptance suite red on the first merge. The runtime plan misses four places in the stored prepare view that must change. The fee and Prepare views would show CAD 0 for combinations whose fees are not built. And the slice is about three PRs' worth of scope, some of it beyond C11.12.

## Objections

### Blocker

**B1. BR-3 refuses the setup helper that every M3 acceptance file uses.** *Needed for the proof.*
- **What breaks:** `acceptance/lib/setup_vv_m3.ts:49` saves every Visitor visa line with `filingMode: "files_own"`, the Representative line included (`people.map(...)` over all lines; the sample's `vv.single` has a Representative, `samples/wave1.json`). Main accepts this, because `engine/people.ts:28` checks only the principal. BR-3 ("a role with `mayBeApplicant: false` has no applicant mode") makes that save a 400. The helper's check at line 50–51 then fails, and so do the files that depend on it: `acceptance/C6.9.test.ts`, `acceptance/lib/m3.ts`, `run_pack4.sh`, `tests/check_vv_prepare_api.ts`, `tests/check_c69_gates.ts`.
- **Example:** a CI run on the merged slice. The setup step returns 400 "Representative takes part in the case but files no application", and pack 4 goes red.
- **Evidence:** fact, high confidence: `setup_vv_m3.ts:49–51`, `people.ts:26–31`, `studio.ts:223` (which stores `filingMode` whatever the role).
- **Fix:** in the same PR, change the helper to send `filingMode` only for roles that may be applicants. Also say what happens to drafts and releases already stored with a Representative `files_own` (from earlier setup runs and the demo database). Recommended: ignore it on read, and refuse it only on a new save.

### Major

**M1. The stored prepare view is not in the plan, and as written it would drop the forms of people on the principal's filing.** *Needed for the proof.*
- **What breaks:** the concept changes only `deriveFilings`, but `api/src/case-prepare.ts` stores filings and items keyed by each person's own filing:
  - `:112–113` creates a filing's applicant rows only when the filing is created, and never adds or changes them on an existing filing.
  - `:102` detects changes by comparing filings only, never applicants.
  - `:118–119` places each wanted item on `filingOf.get(subject)`, the person's own filing, and silently drops items for anyone without one (`.filter((w) => filingOf.has(w.subject))`).
  - `:142` writes the applicant `mode` as the **filing's** mode (`mode: f.mode`), so the API never says `declared_only`. That is already a contract mismatch on main: `FilingApplicant.mode` is `"applying" | "declared_only"` (`contracts/runtime.ts:224`).
  - `api/src/case-filings.ts:30–36` derives a second time, with its own role → mode map cast to `CaseFiling["mode"]`, so `declared_only` and `co_files` would pass into the filing mode unchecked.
- **Example:** Express Entry, principal + spouse + child. On the next read the spouse's and child's forms and documents vanish from Prepare, because they have no own filing. A child marked not coming still shows `mode: "files_own"` on its applicant row, so the BR-6 test cannot pass.
- **Evidence:** fact, high confidence: the lines cited above.
- **Fix:** add these to the back-end plan (below):
  - map each item to the filing the person is an applicant on;
  - upsert applicant rows and their mode on every sync, and compare them when detecting changes;
  - send the applicant's own mode;
  - map line modes to filing modes in one helper used by both `case-prepare.ts` and `case-filings.ts`.

**M2. The fee loop counts filings, not people, and reads only the first applicant.** *Needed for the proof.*
- **What breaks:** `engine/runtime/filings.ts:112–124` checks ages on `f.applicants[0]`, prices `familyFee(rule, paying.length)` with paying = filings, and names the payer from `applicants[0]`. Once a filing holds several applicants, the count, the age exemptions and the payer are all wrong.
- **Example:** BR-8 lets a Visitor visa child be saved On the principal's (with a warning). The board's preview says "Principal applicant, 3 people on it … pays the family maximum". The engine would charge 2 visa fees (2 filings) instead of 4 people, and would never exempt a 10-year-old child from biometrics.
- **Evidence:** fact, high confidence: `filings.ts:105–124`; board frame 1.
- **Fix:** count paying applicants (people), not filings: age per applicant, one fee line per applicant or one per filing with a per-person breakdown, and none for `declared_only` (r5c BR-18). Add a test: "VV child On the principal's → visa fee counted for 4 people".

**M3. Express Entry and Spouse sponsorship would show CAD 0, which reads as "free".** *Needed for the proof (it must not mislead).*
- **What breaks:** §6b adds Sample filing rules for `pnp.express_entry` and `fs.spouse` but labels their fees Not built. `deriveFilings` with an empty `fees` list returns groups with `total_cents: 0` and no "not worked out" signal. The concept's own test reads "the last declared only, CAD 0", which looks the same as "fees unknown". This goes against G15 ("nothing is guessed", `filings.ts:93`) and C6.12, which expects real fee lines.
- **Evidence:** fact for the engine behaviour (`filings.ts:107–131`); judgement for the risk, high confidence.
- **Fix:** when a combination has filing modes but no fee rules, return the filings and groups with the fees marked "Not worked out yet for <combination>; nothing is guessed" (no amounts). Test declared-only as "no fee line", not as CAD 0. Better still, follow the research note's direction (`visitor-visa-and-six-combinations-research` rows on `filings.ts:40`, `:42`): derive from any release that has modes, with no per-combination rule table in code. The code table then stays only as the `vv.single` fallback marked Sample.

**M4. The acceptance test changes are understated, and the response shape conflicts with the test.** *Needed for the proof.*
- **What breaks:** §6 says `acceptance/C11.12.test.ts` only needs its names updated, plus the BR-8 line. In fact:
  - (a) the test sends the field as `filing`, not `filingMode` (lines 39–41, 56–82);
  - (b) it reads `l.filing` as a string and compares it to the mode name (`:47–48`), while the concept makes `filing` an object `{mode, words, ifNotTravelling, filesAs}`;
  - (c) it expects the Representative's `filing == null` (`:49`), which an object with `words: "Files nothing"` breaks.
  - Separately, `tests/check_vv_prepare.ts:59–61` asserts that a child whose release mode is `on_principal` gets **its own** filing with mode `on_principal`. That is the opposite of BR-6 and the new engine, and the concept does not list it. The concept also cites `tests/check_vv_filings.ts`, which lives at `tests/runtime/check_vv_filings.ts`.
- **Evidence:** fact, high confidence: the lines cited.
- **Fix:**
  - Keep the mode as the plain string `filingMode` on each line (it is already in `PeopleLine`), and put the read-only words in separate fields (`filingWords`, `ifNotTravelling`, `fees`, `tip`).
  - Change the test's input and output field to `filingMode` in one reviewed edit to the test, recorded in `acceptance/PACK-2.md`.
  - Rewrite `check_vv_prepare.ts:59–61` to the new rule, and fix the path.
  - Under P-220 the acceptance test is the definition of done, so the BR-8 change (400 → warning) needs the decision recorded (question 2).

**M5. BR-6 leaves one state undefined: a person whose role defaults to Declared only, marked as travelling.** *Needed for the proof.*
- **What breaks:** the acceptance test makes Declared only a role mode (`C11.12.test.ts:75–79`). BR-6 defines only "On the principal's role + not travelling → declared only" and "Files own role + not travelling → no filing". It does not say what happens when a person of a Declared-only role is added as travelling, and `addPerson` defaults `applies: true` (`contracts/runtime.ts:56`). Equally undefined: a sponsor (`co_files`) marked "not travelling", since `updatePerson` (`runtime.ts:198–204`) accepts any role except the principal.
- **Example:** an RCIC sets Child = Declared only on Spouse sponsorship, then adds a child who is coming. Is the child applying or not? The fee and forms differ.
- **Fix:** one sentence of rule. Recommended:
  - "On the principal's filing" and "Declared only" both put the person on the principal's filing. The role's choice is only the starting value for a newly added person, and the case's travelling switch then decides applying or declared only.
  - Files own: not travelling means no filing.
  - Co-files: the switch is not offered, and the API refuses it with 422 in words.
  - Drop BR-6's fail example ("the case API asked to give that child their own filing"): no such API exists (`UpdatePerson` takes only `applies`), so it cannot be tested.

**M6. "Files as" (BR-7) is beyond C11.12 and contradicts r5c.** *Not built in this slice.*
- **What breaks:** C11.12 and P-135 say nothing about the linked combination a Files-own role files under. r5c BR-1 says it is the combination "the officer picks for that role" on the case, from the linked combinations the configuration lists. A single `filesAs` on the line cannot express the concept's own example: a student's child files "as visitor **or** study permit" (§7 row 2).
- **Fix:** take `filesAs` out of this slice (drop the field, the picker and BR-7). Keep the existing G15 sentence for roles whose real application is a different kind. Raise linked combinations as their own row after the founder's answer (question 3).

**M7. One slice holds about three PRs, so it misses "one small item = one PR".** *Judgement, medium-high confidence.*
- The slice spans configuration rules and the editor column, a pure preview, a runtime engine and stored-sync rewrite, a migration, sample changes in two files, an AI output change, plus Signs and Fees columns. CAPABILITIES puts C11.12 in M2 and C6.12 (runtime filings and fees, sponsorship as two filings) in M3.
- **Fix:** split it.
  - PR 1, runtime lane: the contract enum, `checkPeople` BR-1–BR-5 and BR-8, the release check, the preview from the same engine, `setup_vv_m3` (B1), `C11.12.test.ts` green.
  - PR 2, runtime lane: the engine and stored prepare view (M1, M2, M3), the migration, `check_vv_prepare` and `check_vv_filings`.
  - PR 3, screens lane: the Filing column, the preview panel, BR-9 in the editor.
  - Sponsor co-filing can go in PR 2 if question 2 of the concept is answered yes.

### Minor

- **m1. The migration is not minimal.** *Needed for the proof (STANDARDS §5).*
  - `co_filed_with UUID REFERENCES filing(id)` stores a fact the design already derives: the sponsorship and the PR application are both in the same stored submission group, and "cannot be split" follows from the release mode. `split()` (`case-prepare.ts:194–215`) can refuse on mode, so there is no reason to keep a second link in step.
  - The data step `UPDATE filing SET active = false WHERE mode = 'on_principal'` is redundant: the sync already deactivates a filing whose subject no longer files (`case-prepare.ts:116`). It also leaves those filings' items active until the next read, and `storedVersion` counts active items by case (`:338–339`).
  - Fix: drop both. Keep only the two check widenings. `filing_applicant_mode_check` gets `declared_only`. `filing_mode_check` keeps `on_principal`, for history rows and the rollback the 2 Nov migration recorded, and gains the co-filed value only if question 2 is yes. Add the rollback lines to the header.
  - State that a C11.6 channel choice on an item of a deactivated own filing does not carry over to the new item on the principal's filing. Likely none exist, because setup uses `files_own`.
- **m2. One thing has four names.** `PeopleLine.filingMode` uses `co_files`, the `filing.mode` check uses `co_filed`, the preview uses `kind: "own" | "family" | "co_filed"`, and `CaseFiling.mode` uses `files_own | on_principal`. Fix: one value list for the role (`files_own | on_principal | declared_only | co_files`), one for the filing (`files_own | co_filed`, plus history), and the mapping in one helper. *Needed for the proof.*
- **m3. Signs column: out of scope, and wrong data.** It lists "forms that name this person", which is not "who signs": IMM 1344 is signed by the sponsor and the sponsored person, and IMM 5476 by the applicant and the representative (`setup_vv_m3.ts:27`, `signedBy`). Part-level signers ("IMM 5532 (Part B, C)", board frame 2) exist nowhere in the data. Moving "Answered by" into a hover line (P-78) and having AI propose modes are also outside C11.12. The AI change alters a job's output, and only a live run can prove it, which needs a founder Go. Fix: drop Signs, keep Answered by as it is, and leave AI for a later row. The read-only Fees words can stay as one short line under Filing. *Not built.*
- **m4. The preview must come from the same engine.** A separate `previewFilings(lines)` can drift from `deriveFilings`. Fix: build the preview by calling `deriveFilings` on synthetic people made from each line's `preview` count. *Needed for the proof.*
- **m5. BR-8 covers only half of the contradiction.** The warning fires for "On the principal's" on a temporary-residence guide sentence, but the board also offers "Declared only" on Visitor visa, which is just as meaningless there. Fix: warn on both. *Needed for the proof.*
- **m6. A line saved before this slice has no mode.** BR-5 derives `applies` from the mode, but such a line uses the fallback table. A stored `applies: false` child on `vv.single` would then become an applicant. Fix: when there is no mode, keep the stored `applies`. *Needed for the proof.*
- **m7. Board facts.**
  - "Pays the family maximum" with 4 people is true only for biometrics (cap from 2), not for the visa (cap from 5). Say which line.
  - The P-119 tooltip is a founder-chosen sentence. The concept's "amended words" need a decision line, though the test's `/own forms, questions and documents/` still passes.
  - For PR roles, IRCC's word is "accompanying" / "non-accompanying". Use "Declared only (not accompanying)" rather than "(not coming)".
  *Not built (copy).*
- **m8. A sponsor line with no mode.** `C11.12.test.ts:66–72` expects 1 filing for Spouse sponsorship when the sponsor has no mode, while C6.12 and ASM B4 expect 2. Both can hold only if "a sponsor with no mode files nothing" is written down as a rule and the sample carries `co_files`. Write that rule in BR-4. *Needed for the proof.*
- **m9. Fixture risk.** Adding a Sponsor line to `programs.json fs.outside` (and to `wave1.json fs.spouse`) may change counts in the S5 and S7 load suites (`tests/check_s7_load.ts`, `check_s5_slice1.ts`). Run them in the same PR. *Needed for the proof.*

## What is sound

- **Facts the concept states correctly** (high confidence):
  - `deriveFilings` gives one filing per applying person whatever the mode (`filings.ts:105–106`), which is wrong for P-135.
  - The editor drops `filingMode`: `toLines()` (`questionnaires.tsx:49`), and also the AI "Use these lines" path (`:71`) and Add person (`:149`).
  - `PeopleLine.filingMode` is `files_own | on_principal` (`contracts/workspace.ts:52`).
  - The principal rule is at `people.ts:27–28`.
  - The check constraints are `files_own, on_principal` and `applying` only (2 Nov migrations).
  - The runtime refuses a role that is not listed or is over its maximum (`runtime.ts:153–195`).
  - Configuration lives in JSON, so it needs no migration, and old releases keep their fingerprint.
- **The unique keys survive:**
  - Filing per case and subject (`filing_case_id_subject_id_key`): the principal's filing is keyed by the principal, and a sponsorship filing by the sponsor.
  - Applicant per filing and subject: one row per person on the principal's filing.
  - "At most one FAMILY group per case" holds for a sponsorship placed in the family group.
- **The six-combination table matches the research and IRCC:**
  - Visitor visa: one filing per person, family caps at the same time and place (`ircc_filing_units.md` row 1; IRCC-P2-02, P2-28).
  - Study and work: one filing per person, the spouse on an open work permit (rows 2, 2b, 3).
  - Express Entry: one eAPR for the family, with non-accompanying members declared and paying nothing (row 4).
  - Spouse sponsorship: two applications in one submission that cannot be split (row 5; apply page 2026-09-11; research Q10).
  - LMIA: the employer's own filing (P-106).
  - "Follows" filings and PR fee amounts are correctly left Not built.
- **The rules stay inside the decisions:** BR-1, BR-2, BR-3 (minus B1's effect on stored data), BR-4, BR-5, BR-9 and BR-10 follow P-119 and P-135. Warning instead of blocking (BR-8) follows EXPERIENCE §2.9. The [C] flag on P-135 versus r5c BR-1 is real, and it is raised rather than settled silently.
- **The layout keeps the existing pattern:** the same card and table, a preview beside the editor (EXPERIENCE §2.4), a card layout on a phone and at 200% zoom, and a full list of states.

## Back-end plan (element → record → API → rule → test)

| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Filing per role | `Combination.participants[].filingMode` (JSON; enum `files_own · on_principal · declared_only · co_files`) | `PATCH /combinations/:id/people`; `GET …/workspace?tab=questionnaires` `lines[].filingMode` (string) plus words fields | BR-1–BR-5, m6, m8 in `checkPeople`; non-strict callers ignore a mode on a never-applicant role (B1) | `check_c1112_modes.ts` pass and fail per rule; `C11.12.test.ts` (field renamed, M4) |
| Mode-contradiction warning | none (worked out) | the save answer and the view carry `warnings[]` | BR-8 + m5 | `C11.12.test.ts:56–57` → saved with a warning (decision row) |
| Release check | release snapshot | "Missing before firms can use it" | an applicant role with no mode blocks a **new** release only | the release suite: missing mode → listed |
| Preview "What a case gets" | none | `people.filings[]`, `people.submissions[]` | `deriveFilings` on synthetic people from `preview` counts (m4); fees "Not worked out yet" where there is no rule (M3) | `C11.12.test.ts:50, 53, 72` |
| Case filings | `filing` (mode `files_own`, plus `co_filed` if question 2 is yes) | `GET /runtime/cases/:id/prepare`, `GET …/filings` | on-principal and declared-only people → applicant rows on the principal's filing; per-person fees (M2); co-filed cannot be split (refuse in `split()` by mode) | `tests/runtime/check_vv_filings.ts`: EE 1 filing, 4 applicants, last declared only, **no fee line**; `fs.spouse` 2 filings, `splittable: false`; VV child On the principal's → 4 people counted |
| Applicant rows | `filing_applicant.mode` (`applying · declared_only`) | `filings[].applicants[].mode` = the applicant's own mode (M1, fix `case-prepare.ts:142`) | sync upserts applicants and compares them in change detection (`:102`, `:112–116`) | `check_vv_prepare_store.ts` and `_api`: travelling switch → mode flips, ids kept |
| Items | `filing_item.filing_id` | items list | an item goes on the filing the person is an applicant on (`:118–119`); declared-only people get no forms until a "for non-applying people" marker exists (Not built, say so) | `check_vv_prepare.ts:59–61` rewritten |
| Migration | `filing_applicant_mode_check` += `declared_only`; `filing_mode_check` += `co_filed` (question 2); no new column, no data step (m1) | none | expand only, rollback in the header | migration applies on a copy with the 2 Nov rows |
| Editor keeps modes | none | none | BR-9 in `toLines`, AI apply, Add person, Undo | browser: set a mode, save, reload, Undo; keyboard only; axe; 375 px; 200% zoom |
| Setup helper | none | none | `setup_vv_m3.ts:49` sends a mode only for applicant roles (B1) | pack 4 and `C6.9.test.ts` stay green |

## Questions for the founder (recommendation first)

1. **Declared only: a starting value for the role, with each person's travelling switch deciding on the case?** Recommend **yes**: configuration offers the three P-135 choices, and on the case the switch moves a person on the principal's filing between applying and declared only (rule M5). It satisfies P-135, r5c BR-1 and the acceptance test. Alternative: configuration offers only two choices, which breaks `C11.12.test.ts:75–79`.
2. **May a temporary-residence role be saved as "On the principal's" with a warning, instead of being refused?** This changes an agreed acceptance line (`C11.12.test.ts:57`). Recommend **warn** (EXPERIENCE §2.9 "warn, don't block"; P-135 gives program types only as examples; no program-type field exists to block on). Alternative: keep the 400, which needs a program-type master that is not built.
3. **Linked combinations for Files-own family members** (a worker's spouse on an open work permit; a student's child on a visitor visa or study permit). Recommend a **later row**, picked by the officer on the case from a list the configuration gives (r5c BR-1). Alternative: store one "Files as" now (concept question 3), which cannot express "visitor or study permit".

## Lead response

All accepted and fixed in concept r2 (2 Nov): B1 (BR-3 drops a mode on never-applicant roles for stored lines and non-strict callers; helper fixed in PR 1); M1 (stored prepare view in §2/§6); M2 and M3 (BR-10: fees by person, "not worked out yet", never CAD 0); M4 (plain `filingMode` string; tests and paths listed); M5 (BR-6 rewritten; untestable fail removed); M6 ("Files as" removed to a later row); M7 (three PRs). Minors m1–m9 taken; the Fees words stay as a read-only column on the board. Founder questions: Q1 and Q2 as here (Q2 = this challenge's Q2 on warn vs refuse, kept as concept Q3); the concept's own Q2 (sponsorship as a co-filed filing) kept, because the migration and C6.12 depend on it; linked combinations become a later row, not a question.

## Agreement

## Build discoveries

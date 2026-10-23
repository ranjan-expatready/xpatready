# R1 thin slice — challenge of the Lead concept (fresh agent, skill screen-challenge, 23 Oct)

Written by a fresh agent that did not write the concept or the plan; recorded by the runtime lane, with the builder's verification notes marked **[builder check]**. Read: concept; PRODUCT, STANDARDS, EXPERIENCE, QUALITY, WORKFLOW; P-18, P-26, P-32, P-33, P-45…P-47, P-56, P-61…P-67, P-71…P-73; audit 23 Oct; CAPABILITIES; TAXONOMY §4; F1 concept, challenge and branch; studio schema, `fill.ts`, `studio.ts`, `ai.ts`, `main.ts`, `engine/render.ts`; IMM 5257 evidence (`fill-report.json`, `p1/inventory/imm5257e.inventory.json`); the team's `client-spine.prisma`, `country-pack-questionnaire.prisma`, `answer-store.ts` at 22f1d12.
**Freshness:** `freshness.sh` cannot run in a lane copy (`code/` is outside it); from the main copy it reports ERv2-sanitized UNVERIFIED (live `dev` has moved on). Every claim about the team's models is **Unverified**.

## Verdict: Build after these changes
The idea is right and most of the engine exists: configure and release (upload → replay of the saved draft at US$0 → submit → expert sign-off → a different approver), and `render.ts` already keys facts by person (`kkey`, `aboutOf`). As written the slice would prove far less than it claims: the released visitor visa asks almost nothing IMM 5257 needs; P-72 confirmation is not modelled; the team mapping is wrong where it matters; the never-overwrite states are undefined.

## Objections
**B1 Blocker — the visitor-visa questionnaire cannot fill IMM 5257** · *Needed for the proof* · high
* In the only (21 Oct) release, 60 mapped boxes have no question, 15 are "collected from a document" with no supported document type (passport number, dates, country), 14 are unmapped (9 are the previous spouse: no person role), only 32 are covered by a question. The 44/44 written were confirmed Sample facts (44 written, 123 not written, 7 blank).
* Under P-71 a form with missing facts is never "ready to file", so the journey cannot end ready.
* Fix: make "complete the visitor-visa questionnaire" an explicit R1 step: place every mapped fact, select sections, resolve the unmapped boxes or mark them "not a fact"; acceptance = every fact the Sample household needs is asked or listed "by hand" with a reason; label it scaffolding standing in for Screen 03's authoring UI (P-33).

**M1 Major — P-72 confirmation is not in the data or the journey** · *Needed* · high
* `fill.ts` writes only "confirmed fact", and only Sample facts are confirmed today. Needed: a status per answer mapped to the team's DECLARED → VERIFIED with `verifiedBy/At`; client's own typed answers confirmed for the client's fields; "Confirm section" in the agent view for everything else; fill writes confirmed values only and lists what it skipped.
* Open edge: with "answering for", is the principal's typing of the spouse's and child's answers "the client's own"? Founder question 1.

**M2 Major — "asked once" breaks in four places** · *Needed* · high for 1–3, medium for 4
1. People not on the case: the previous spouse has no role; parents become pseudo-ids (`principal/parent_1`).
2. Rows with no row number: the two contact rows read the same facts with no row. **[builder check: not so in the saved run — `Contacts_Row1` reads row 0 and `Contacts_Row2` row 1; recheck after replay.]**
3. Facts split on 21 Oct (current / previous / applying-from residence; phone type) are asked twice across IMM 1295 and IMM 5257.
4. A box with no person becomes a case fact (`aboutOf`), so every family member's IMM 5257 gets the same funds and stay dates. *Unconfirmed: immigration expert.*
* Fix: one AnswerSubject per person a fact is about (null party for people not on the case); stable row ids; ask the expert which visit facts are per applicant.

**M3 Major — the team mapping is wrong where it matters** · *Needed (retrofit)* · medium · Unverified
* `PackWorkPin` pins per party (`caseId` optional, ADOPT chain). `ClientCanonicalAnswer` is a standing answer per party, no `caseId`; case-specific values go to `CaseAnswerOverride`. `FormInstance` has PENDING · RENDERED · FAILED and immutable stamps, no Draft, Signed or Uploaded state.
* The concept leaves out `AnswerSnapshot` (what makes "stale" computable) and `ClientFactRecord`/`Value` for repeating groups (the studio stores rows as separate fields with a row index).
* TAXONOMY §4 case 2 is one case with three combinations: "one pin per case" breaks.
* Fix: pin per filing (person × combination) with `contentHash` = release sha; each household member a Party with an AnswerSubject; one FormInstance per generation with the person's party and a snapshot; rows shaped like ClientFactRecord; answers per party (team; reused across cases, TAXONOMY case 20), frozen by the snapshot.

**M4 Major — re-release mid-case** · *Needed* · high
* `studio.preview` and `fill.ts` read the newest `configRelease` (`orderBy version desc`): a v2 release would silently change an open case (STANDARDS §3.7, P-32 (3)). Merged F1 `FieldMerge`: new cases follow a merged-away key's redirect; pinned cases keep their keys.
* Fix: every runtime read takes the pin; test v2 → the v1 case unchanged, a new case gets v2. ADOPT Not built.

**M5 Major — never-overwrite states undefined** · *Needed* · high
* No owner or evidence for any transition (document upload Not built). "Signed" contradicts F1's derived signature (a PDF-upload line has "No signature in the file"). "Uploaded" mixes P-46 "validated copy uploaded back" with "uploaded to IRCC". "Submitted" (P-65 d) is missing. Automatic regeneration replaces a file that may be open in Adobe. Regeneration runs `execFile` (180 s) inside the web request (STANDARDS §4).
* Fix: Draft = computed view, no file; Generated = an immutable FormInstance row, new generation = new row, by a job on request; Locked = a person marks "validated copy uploaded back" or "filed"; Stale = snapshot ≠ current confirmed answers, locked rows never change; "ready to file" computed per P-71. Signed-PDF states stay M3 (less scope, not more).

**M6 Major — the IMM 5257 fill trial gates the checked PDF** · *Needed* · high
* P-65 (a); evidence order 1344 → 0008 → 5257, 5257 not started; E1a found "IMM 5257 3/4 runs unusable". "Answer sheet only" for a PDF form is defined nowhere (P-30 covers online forms). Under P-71 Validate is the gate, so R1 cannot reach "ready to file" without the trial. Fix: move IMM 5257 next in the evidence lane.

**M7 Major — collision with merged forms slice 1** · *Needed*
* F1 changed `fill.ts` (option maps; refuses a form filed Online) and `snapshot.ts`; R1 needs case facts and the pin in the fill and real parties, types and validation in render.
* F1's test captures IMM 5257's online screens for a Visitor visa ("the client signs the declaration in the portal"). If visitor visas are filed online, R1's PDF target is the wrong channel. *Unconfirmed: no counsel.* **[builder check: the online capture is a test fixture of F1, not a recorded channel decision; still a real expert question.]**
* Answer lists exist only for combinations 3 and 6; IMM 5257's ~30 choice fields have none; using the PDF's own codes as answers breaks P-62.
* Fix: a new `api/src/runtime/fill-case.ts` calling `p5/fill.py` unchanged and importing `engine/options.ts` read-only; render.ts changes declared to the Lead; answer lists for the choice fields R1 uses; channel question to the expert.

**M8 Major — question types miss what IMM 5257 needs** · *Needed*
* Phone (18 boxes `phone_part`), month-year (`date_part:MM/YYYY`), long text ≤ 200, money (`number_as_text (CAD)`), email; three or more repeating groups. The library's value types are only text, yes_no, date, code, country, address, number, so the renderer cannot get phone or name groups from the data. Fix: these P-47 types (already decided) as the shared field's value type.

**M9 Major — concurrent edits and client access** · *Needed*
* Client and officer edit the same fact: no optimistic concurrency (STANDARDS §4), no conflict state (EXPERIENCE §4), no server-side deny by default (STANDARDS §6). Fix: supersede with expected version, stale write 409 with the newer value; another case's client refused; pass and fail test each.

**Minor**
* m1 Release only via submit → sign-off → approve, never the shared Release page (QA-1 open); upload through the real endpoint, not `attachments/sample` (P-32 (4)).
* m2 Create the household on the case page; never copy SampleFact rows in as confirmed answers (P-33, P-72).
* m3 Record mismatch: P-65 §8 says the thin slice is on spousal sponsorship, P-67 says visitor visa; amend P-65.
* m4 Screen 03's "Preview by person" (P-56) uses the same renderer: one owner (runtime), shared path, recorded in LANES.
* m5 Prove "asked once" by also filling the spouse's IMM 5257 (same map, US$0). Audit never holds answer values (STANDARDS §5).
* m6 *Not built*: P-73 "Report a mapping problem" (M3/M4); R1 only shows which boxes each fact fills.

## What is sound
IMM 5257 is the only form already filled from Studio and read back (44/44, signatures intact); the append-only writer and transforms are reused unchanged; replay at US$0 and second-person release exist; `render.ts` evaluates show/hide/optional per person, adds deciding questions and keys facts by person; the Not-built list, lane folders, never-overwrite intent and no paid AI are right.

## Questions for the founder (from the challenger)
1. **P-72 and "answering for"**: are the principal's typed answers for the spouse and child confirmed as the client's own? *Recommend:* yes for a minor child; the adult spouse's section waits for the officer's "Confirm section".
2. **IMM 5257 Adobe trial next?** *Recommend:* the evidence lane does IMM 5257 before IMM 0008.
3. **Visitor-visa channel**: uploaded IMM 5257 PDF or online in the IRCC portal? *Recommend:* ask the immigration expert; meanwhile label IMM 5257 "Sample: PDF upload". *Unconfirmed: no counsel.*
The builder's handling of every point is in `plan.md` §3.

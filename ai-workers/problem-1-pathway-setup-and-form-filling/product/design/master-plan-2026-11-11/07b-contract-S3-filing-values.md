# S3 · Filing values service: contract (concept only, no code)

Master plan part 7 §2, row S3 (P-258 shared services; A19 (j)). Read-only analyst; every fact below is from `origin/main` fbfb263c7, app `ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/` (paths below are relative to `studio/`). **A proposal for the tech lead to agree, not a decision.** No code, no schema change. Roles only.

> **Analyst's note (master analysis, 11 Nov):** drafted by a read-only reader at my brief, checked by me against the code. Two findings are confirmed, and both are **suspected live defects for qa to reproduce**, not only design points:
> * **(a) "Nothing recorded" boxes differ between the PDF and the online answer sheet.** The PDF path stores boxes through `markNothingRecorded` (`api/src/fill-case.ts:322`). The answer sheet lays out the raw `cov?.boxes` (`api/src/case-prepare.ts:887`).
> * **(b) The sheet can lay out one edition's parts over another edition's values.** `fieldMapOf` returns the first map with that form number (`case-prepare.ts:894`).
>
> A third finding, not yet reproduced: an oath or signature box mapped to a fact raises only a release warning, so the answer sheet could list it. That matters for C7.3 now and for the extension later (P-245: never declarations or signatures).
>
> All three go to qa as a capability check on C7.3 (PR comment). **Status: contract for agreement, not started** (Lead 16, 11 Nov). Moving callers onto it needs the `case-prepare.ts` baton. **B170 row letters** follow its analysis v4 (c = adapter, e = barcode check, f = the form's own check), which differs from part 7's earlier letters.

Words used here:
* **Box**: one form field of a PDF edition (its data path).
* **Portal field**: one field on one IRCC portal screen (comes with the extension, E1).
* **Value key**: (fact, about, row). It is the same on the PDF and the portal, so it is how "the same box" is matched across channels.
* **Map version**: the version of a form edition's field map that a value was computed from.
* **Value step**: the code that turns a fact into what a box gets: transform, code, the form's own format, never-written rules.

---

## 1. Purpose and callers

**Purpose.** For one filed form of one person on one filing, give one ordered list of field values. Each value names its box (or portal field), its fact, whose fact it is, where the fact came from, its status, and why. Each list names the release, the form edition and the field-map version it came from. It is **one contract with one computation**. Callers read it and never compute a value themselves (P-258: "features call it and never copy it").

**Callers:**

| # | Caller | Today | Reads |
|---|---|---|---|
| a | **PDF filler**: a case copy (`api/src/fill-case.ts` generate/run), the release preview fill (`api/src/fill.ts`), the mandatory-box list (`fill-case.ts fieldsOpen`) | its own chain (§2) | `valuesFor(…, order "pdf")` |
| b | **Online answer sheet** (C7.3; M3-S5 #1507 made it general for any Online form) | its own chain (§2) | `valuesFor(…, order "portal-screen")` until screen maps exist |
| c | **Fill trials and proof records** (S6; F1 and F2; P-65 (a); P-46 read-back by position) | `api/src/fill-trials.ts` hashes the map, but no copy records it | `map_version` and `fingerprint` of the list a trial filled |
| d | **Chrome extension** (M6; P-245 E3 "fill this screen") | not built | `valuesByPortalScreen(…, screenVersion)` |
| e | Also moved later: answer-key runner (`engine/answer-keys.ts`), AI review sheet (`api/src/review-runs.ts`), submission record "filed with" (`api/src/submission.ts`) | own chains | `valuesFor` |

**Not in scope.** Deciding which forms apply (render and SH3), readiness (C7.6), Adobe Validate (P-46, P-171 (1)), barcode texts (B170e, B170g), writing the PDF file (`p5/fill.py`, S2's job service).

---

## 2. Today: the computation paths

### 2.1 What they share

Every path starts at **`engine/runtime/forms.ts:27` `formCoverage`**:
* It calls `render` (`engine/render.ts:82`). Render picks the map at `engine/render.ts:127`: the edition asked, else the PDF edition in use (`pdfMapInUse`, P-32), else the first map for the form. Render reads people and box owners through SH3 (`engine/render.ts:14`, `aboutOf`).
* On top of render it adds the box gates (B86, B107: `forms.ts:57-61`, "not needed"), the answer checks (QA-122 `checkValue`, `forms.ts:63-64`) and the gate contradictions (QA-165, `forms.ts:67-69`).
* `knownOf(..., { forForms: true })` (`engine/runtime/case.ts:294-308`) makes every declared answer "confirmed fact" to the renderer (P-242, P-411).

**So whose fact a box reads is already shared and goes through SH3.** What happens after `formCoverage` is not shared.

### 2.2 The paths after `formCoverage`

| Path | Chain after `formCoverage` | Map | What a value becomes |
|---|---|---|---|
| **P1 PDF copy** (case) | `fill-case.ts:319` coverage → `:322` `markNothingRecorded` (stored with the copy) → job `:382` `writeForm` → `fill.ts:46` `pdfMapInUse` → `fill.ts:55` `formValues` (`engine/form-values.ts:27-56`) | PDF edition in use, picked again **at job time** | `runTransform` + option-map code + `inFormFormat`. Signatures and the oath are never written (`form-values.ts:38-39`, `engine/form-steps.ts:52`). There is also "by hand", "not on this form", and the "Same as" row left empty (`form-values.ts:74`). |
| **P2 Answer sheet** (Online item) | `case-prepare.ts:743` coverage → `:745`/`:876-890` `sheetOf` → `engine/runtime/answer-sheet.ts:89-134`. Also built inside the prepare view at `case-prepare.ts:385`. | values: render's pick (PDF in use); **layout: `case-prepare.ts:894` `fieldMapOf` = the first map in the list** | the raw value through `copyText` (`answer-sheet.ts:56-65`), or a choice's words from `optionsOf` (`case-prepare.ts:889`). **No `markNothingRecorded`, no value step, no signature or oath rule.** |
| P3 Mandatory list | `fill-case.ts:120-124` `fieldsOpen` → `formValues` on boxes from `onFormOf` (`:137`, with `markNothingRecorded`) | `pdfMapInUse` | same as P1 |
| P4 Answer keys | `engine/answer-keys.ts:322` coverage of the key's edition → `:331` `markNothingRecorded` → `formValues` | the key's own edition | same as P1 |
| P5 AI review sheet | `api/src/review-runs.ts:126` coverage → `:139` `printedBoxes(…, cov.boxes)` → `:333` `formValues` | in use | as P1, but **without `markNothingRecorded`** |
| P6 Filed-with record | `api/src/submission.ts:144` and `case-prepare.ts:666` → `currentValues` (`engine/runtime/submission-record.ts:31`) | in use | the raw value of "confirmed fact" **and "answered on screen"** boxes |
| P7 Preview fill | `api/src/fill.ts:79-86` studio preview coverage → `writeForm` | in use | as P1, sample facts, no `markNothingRecorded` (no case view) |

**Four fingerprints over "what a form reads":**
* `inputHash` (`forms.ts:160`) over (box, fact, about, row, value);
* `sectionHash` (`answer-sheet.ts:69`) over (subject, fact, row, value);
* `mapVersion` (`api/src/fill-trials.ts:23`) over the map entries;
* `changedSince` (`submission-record.ts:34`) over box values.

Two of them are stored in **the same column**, `AnswerSnapshot.inputHash`, with different meanings: the copy's facts hash (`fill-case.ts:339`) and a sheet section's hash (`case-prepare.ts:778`).

### 2.3 What differs, with the drift risk

1. **"Nothing recorded" boxes differ between the PDF and the sheet.**
   * The PDF writes "N" for a Yes/No "is anything recorded?" box once "none apply" is answered (`forms.ts:84`, used at `fill-case.ts:322`, written at `form-values.ts:40-41`).
   * The sheet takes `cov.boxes` without `markNothingRecorded` (`case-prepare.ts:887`), so the same box is "waiting" or absent there.
   * The AI review sheet has the same gap (`review-runs.ts:139`). **Same box, same case, two answers.**
2. **The sheet can use another edition's layout.**
   * Values come from render's map: the PDF edition in use (`render.ts:127`).
   * The sheet's parts and form order come from `fieldMapOf` (`case-prepare.ts:894`, `.find` = the first map listed). P-32 says that is the oldest edition, and render's own comment says so too (`fill.ts:45`).
   * With two editions in a release, the sections and order come from one edition and the values from another. Boxes the old edition's parts do not group fall into "Other questions" (`answer-sheet.ts:105`).
3. **The sheet has no value step and no never-written rule.**
   * `copyText` (`answer-sheet.ts:56`) is a second formatter beside `runTransform` + `inFormFormat` (`form-values.ts:33, 51`).
   * Derived values (`derived:… equals …`, B99), the option-map code, "by hand" (two printed choices, `form-values.ts:45-46`), "not on this form" (`:47`) and the "Same as" emptied rows (`:74-96`) exist only on the PDF side.
   * The signature and oath rule (`form-steps.ts:52`) is applied only by `formValues`. A field map may map an oath box to a fact with only a release **warning** (`form-steps.ts:60-68`, "nothing is filled"). The sheet would list that answer. For the extension (P-245: never declarations or signatures) that is the gap that matters most.
4. **Choice words come from two sources.**
   * The sheet uses `optionsOf` (`engine/runtime/case.ts:161-175`): the label of **the first map of any form** that labels the code, else the answer list's label.
   * A PDF text box uses `labelForText` (`engine/options.ts:83`): the answer list's label.
   * The web keeps a third copy of the address and phone order (`web/src/runtime/answer-sheet.tsx:40-41`, "keeps its words here") beside `copyText`'s (`answer-sheet.ts:61-62`).
5. **The map version is not recorded anywhere a value is.**
   * `mapVersion` exists (`fill-trials.ts:23`), but only `trialFor` calls it (`:56`).
   * `samples/fill-trials.json`: **6 of 6 trials have `map_version: null`**, so they count "for their edition only" (`:58`).
   * A case copy stores `configReleaseId` and the facts (`fill-case.ts:339-340`), and its `resultJson` (`:387`) has no edition and no map version. `FormInstance` and `AnswerSnapshot` have no such column (`prisma/schema.prisma:1640-1677`).
   * A sheet tick stores neither.
   * The job picks the map again at run time (`fill.ts:46`). That is safe today because a release is frozen, but nothing proves which map a copy used.
   * `mapVersion` also leaves out the field list (inventory) and the value-step code (`p5/transforms.ts`, `inFormFormat`). A change there changes written values with the same map version.
6. **"Filed with" counts values the PDF never wrote.** `currentValues` (`submission-record.ts:31`) includes "answered on screen". `formCoverage` demotes an answer with a problem to that coverage, with a fix (`forms.ts:64`). `formValues` then writes nothing for it (`form-values.ts:41`).

**Evidence that drift is not caught:** no test compares PDF values with the sheet in general. The only cross-check is one BR-5 case in `tests/check_forms_b86_fill.ts:98-99` (a gated-off box absent from both).

### 2.4 How SH3 fits

SH3 (`contracts/resolver.ts`, implementation `engine/resolver.ts`) answers *whose* fact a box reads:
* R4: the box owner;
* R5 and R6b: the scope, and where a person's value is read from;
* R8: the keys;
* R7: the signers.

It is already used by render and therefore by every path above. S3 sits **after** SH3 and does not repeat it:
* every `FieldValue.person` is an SH3 about-key;
* filing-scope facts follow R1 (stored once per case on `FILING`, read by every filing);
* the value key is SH3's `factKey(about, fact, row)`.

When SH4 brings a filing id (R1 "a value per filing comes with SH4"), `valuesFor` already takes the filing and passes it through. No contract change.

---

## 3. The contract

### 3.1 Types (`contracts/filing-values.ts`, types and constants only, P-249 lift-ready)

```ts
import type { Subject } from "./resolver.ts"; // SH3

/** Which order the list is in. "pdf": the form's own field list order (its inventory), as the PDF prints it.
 *  "portal-screen": by portal screen, then field, from a saved screen map (P-245 E1); until one exists, by the form's
 *  own parts (today's sheet basis), and order_basis says so. */
export type ValuesOrder = "pdf" | "portal-screen";
export type OrderBasis = "form_field_list" | "form_parts" | "pdf_twin" | "portal_screen_map";

/** Where a value's fact came from. answer: declared, fills at once (P-242, P-411), still to confirm;
 *  confirmed: the case officer's Confirm or a confirmed record; derived: worked out by a rule from other facts
 *  (a transform's derived:, "nothing recorded" N, a code), never typed by anyone. */
export type ValueSource = "answer" | "confirmed" | "derived";
/** Who first gave it (today's answer-sheet.ts sourceOf). */
export type Origin = "Document" | "Client" | "Case officer";

/** ok: the box gets `display`. to-fix: no value until a person acts (why says what). blank-by-rule: left blank on
 *  purpose by a named rule (rule says which). */
export type ValueStatus = "ok" | "to-fix" | "blank-by-rule";

/** The closed list of rules that leave a box blank (each one exists today, file:line in §2). */
export const BLANK_RULES = {
  box_gate: "the box's own condition does not hold (B86 BR-5, B107)",
  same_as_row: "a 'Same as' answer is Yes, so the form asks this row only on No (B99)",
  signature: "a signature: the person signs it themselves (F2)",
  oath: "the oath block: completed at the declaration, by the person who administers it (F6, P-171 (2))",
  nobody: "the box is about a person who is not on this case (SH3 R4: null owner)",
  spare_row: "a repeating group's spare row: no entry for it (QA-309)",
  not_asked: "the release never asks this fact (no placement, no document)",
} as const;
export type BlankRule = keyof typeof BLANK_RULES;
export const TO_FIX = {
  no_answer: "no answer yet",
  answer_problem: "the answer fails its check (QA-122); not written",
  contradiction: "a Yes/No gate contradicts a recorded detail (QA-165)",
  by_hand: "the form prints two or more choices for this answer; the immigration expert decides (break M5)",
  not_on_form: "the form has no choice for this answer",
  no_code: "the answer has no code in this box's option map",
  unresolved_map: "the field map entry needs review",
} as const;
export type ToFix = keyof typeof TO_FIX;

export type FieldValue = {
  /** PDF: the box's data path. Portal: the portal field's key on its screen version. */
  target: { kind: "box"; box: string } | { kind: "portal_field"; screen: string; field: string };
  /** The value key: the same on the PDF and the portal (SH3 factKey). */
  fact: string; person: string /* SH3 about-key */; person_label: string; row: number | null;
  /** The fact's stored value (canonical: a key, ISO date, object), or null when status is not ok. */
  value: unknown;
  /** What a person reads or types: a choice's words, a date as YYYY-MM-DD, Yes or No, an address on one line.
   *  ONE formatter for every channel. "" when status is not ok. */
  display: string;
  /** PDF only: the exact string the box gets (code, form format); never shown alone. */
  written?: string;
  source: ValueSource; origin: Origin | null;
  /** Still waits for the officer's Confirm section (declared answers fill at once, P-411). */
  to_confirm: boolean;
  status: ValueStatus;
  rule?: BlankRule;  // required when status is blank-by-rule
  fix?: ToFix;       // required when status is to-fix
  why: string;       // plain words; never empty unless status is ok
  /** Never offered to the extension: a signature, the oath, or a declaration part (rule 5). */
  by_person_only?: true;
};

export type FilingValues = {
  case: string; filing: string; item: string /* filing_item id: one form for one person */;
  release: { id: string; version: number; sha256: string };
  form: string; edition: string; form_sha256: string;
  /** mapVersion over the map entries, the field list's sha256 and VALUE_STEP_VERSION (§8 Q1). Never null. */
  map_version: string;
  order: ValuesOrder; order_basis: OrderBasis;
  /** Present for order "portal-screen" with a screen map: the screen version the list was cut for. */
  screen_version?: string | null;
  values: FieldValue[];
  /** The values held back from this order on purpose (rule 5), with why: the extension shows them as "by you". */
  withheld: Pick<FieldValue, "target" | "fact" | "person" | "why">[];
  /** One hash over (target, fact, person, row, value, status) + map_version: what diffSince compares. */
  fingerprint: string;
};

export type PortalScreenValues =
  | { available: true; screen: string; screen_version: string; values: FieldValue[]; withheld: FilingValues["withheld"]; fingerprint: string; map_version: string }
  | { available: false; why: string /* "no saved screen map for this screen version (E1)" */ };

export type ValuesDiff =
  | { known: true; since: string; now: string; changed: { fact: string; person: string; row: number | null; was: string | null; now: string | null }[] }
  | { known: false; why: string /* the fingerprint is not one a copy, tick or trial kept */ };

/** The service. Pure over its inputs; the API wraps it with one read of the case state. */
export interface FilingValuesService {
  valuesFor(filing: string, form: string, person: string, opts?: { order?: ValuesOrder; edition?: string; today: Date }): FilingValues;
  valuesByPortalScreen(filing: string, form: string, person: string, screenVersion: string, opts: { today: Date }): PortalScreenValues;
  /** Against the list frozen with a copy, a sheet tick or a trial (AnswerSnapshot.factsJson); read only. */
  diffSince(filing: string, form: string, person: string, fingerprint: string, opts: { today: Date }): ValuesDiff;
}
export const VALUE_STEP_VERSION = "1"; // bumped by any change to transforms, formats or the never-written rules
```

`person` is added to the caller's `valuesFor(filing, form)`, because a form is filled per person (IMM 5257 per applicant; `formCoverage(…, form, subjectId)`). The filing item id is the one handle that carries filing, form and person together.

### 3.2 How it computes (one chain, `engine/filing-values.ts`)

1. **SH3 → render → `formCoverage`** (unchanged). This gives each box's fact, owner and coverage.
2. **`markNothingRecorded`** with the case view (the step P2 and P5 skip today).
3. **One value step.** `formValues` is split in two:
   * `valueOf` gives the status, the rule or fix, and the canonical `value` + `display` (one formatter, which takes over `copyText` and `optionsOf`'s choice words, §8 Q2);
   * `writtenOf` gives the PDF code and format (`runTransform`, option map, `inFormFormat`) for the PDF order only.
   * Signature and oath detection (`byAPerson`) runs for every order.
4. **Order:**
   * "pdf": the field list's order (as `layoutOf` already reads it, `case-prepare.ts:908-910`);
   * "portal-screen": the screen map (E1) when one exists; until then the form's own parts of **the same edition the values used** (fixes §2.3 item 2).
5. **Map version and fingerprint** are stamped on the list.

### 3.3 Operations

* **`valuesFor`**: the full list in the asked order. The PDF filler writes `values[status=ok].written`. The sheet shows `values` grouped by part, deduplicated on the value key (as `answer-sheet.ts:118` does today).
* **`valuesByPortalScreen`**: only the values whose value key appears on that screen version's saved map (P-245: "the match is saved per portal screen version"). **Signature, oath and declaration fields are never in `values`; they go to `withheld`.** A to-fix value is listed with `display: ""` and its why, so the extension never types a guess. With no saved map for that version it answers `available: false`, never a best guess.
* **`diffSince`**: compares the frozen list with today's on the value key. This takes over `changesOf` (sheet ticks) and `changedFacts` (copies) for new rows. An unknown fingerprint is `known: false`, never "no changes".

---

## 4. Rules (numbered, testable)

1. **One computation.** Every caller in §1 gets its values from `valuesFor` or `valuesByPortalScreen`. No caller calls `formValues`, `copyText`, `currentValues` or `optionsOf` for a box value.
   *Check:* a guard greps `api/src` and `web/src` for those calls outside `engine/filing-values.ts`.
2. **The PDF and the answer sheet show equal values for the same box.** For every value key present in both orders for the same filing item: equal `status`, equal `value`, equal `display`. The PDF's `written` maps back to the same `display` (code → words).
3. **Every value names its map version.**
   * `FilingValues.map_version` is never null or empty. It changes when a map entry, the field list or `VALUE_STEP_VERSION` changes.
   * A copy, a sheet tick, a fill trial and a proof row each store the `map_version` and `fingerprint` of the list they used.
4. **A blank-by-rule box says which rule.**
   * `status: "blank-by-rule"` ⇒ `rule` is one of `BLANK_RULES` and `why` is not empty.
   * `status: "to-fix"` ⇒ `fix` is one of `TO_FIX` and `why` is not empty.
   * `status: "ok"` ⇒ neither is set.
5. **No value for declarations or signatures is ever offered to the extension.**
   * Each box or portal field that is a signature, part of an oath block, or part of a declaration is marked `by_person_only` and goes to `withheld`. This holds even when a field map maps it to a fact.
   * `valuesByPortalScreen(...).values` never contains such a field (P-245).
   * The PDF never writes them (today's F2/F6 behaviour, kept).
6. **Read-only, no side effects.**
   * No database write, no file write, no audit line, no model call, no clock read (`today` is passed in), no network.
   * The same inputs give the same `fingerprint`.
7. **A to-fix value is never offered as a value.** `display` is "" and `value` is null. No channel types it, and the extension leaves the field empty with the why.
8. **The channel changes the order and the PDF code only, never the value.** Moving a form between Online and PDF upload (C11.6) gives the same `values` by value key.
9. **Every value names its source and person.**
   * `source` is answer, confirmed or derived. "answer" ⇔ `to_confirm`.
   * `person` is the SH3 about-key that `formCoverage` used.
   * A filing-scope fact (SH3 R5) has `person = "case"` and the same value on every form of the case.
10. **One edition per list.** The order (parts, field list) and the values come from the same `edition` and `map_version`.
11. **Old records stay readable.** Copies and ticks stored before S3 keep their `inputHash` and `sectionHash` and are compared as today. S3's `fingerprint` is a new key beside them, never a replacement of their meaning (otherwise every existing copy would turn "out of date" at once).

---

## 5. Migration path

Callers move one PR at a time. The order puts the files with no baton first.

1. **S3a: the contract and the engine module (no caller moves, no baton).**
   * Add `contracts/filing-values.ts` and `engine/filing-values.ts`, built from today's pieces (`formCoverage`, `markNothingRecorded`, `formValues` split into `valueOf`/`writtenOf`, `byAPerson`, `mapVersion` moved from `api/src/fill-trials.ts` into the engine, re-exported where it is today).
   * Contract tests (§6), including the PDF-vs-sheet equality test, **run against the new module and also against today's sheet**. That proves the drift in §2.3 with numbers and shows exactly which boxes will change on screen.
   * Untouched: `schema.prisma`, `case-prepare.ts`, `fill-case.ts`.
2. **S3b: the PDF side (no baton; `fill-case.ts` and `fill.ts` are busy files).**
   * `writeForm`, `fieldsOpen`, the answer-key runner and `review-runs.printedBoxes` read `valuesFor(order "pdf")`.
   * The copy stores `map_version`, `edition` and `fingerprint` inside its existing JSON (`AnswerSnapshot.factsJson`, `FormInstance.resultJson`). No migration.
   * The job checks that the map it writes with still has the stored `map_version` (refuse with words if not).
   * **Order:** after S2 (durable fill job) and after B170e and B170f, which also edit `fill-case.ts`. One holder of `fill-case.ts` at a time, agreed by the Lead.
3. **S3c: the answer sheet (the `case-prepare.ts` baton holder).**
   * `sheetOf` (`case-prepare.ts:876-890`) and `layoutOf`/`fieldMapOf` (`:894-913`) read `valuesFor(order "portal-screen")`. `fieldMapOf` is replaced by the edition the values used (rule 10).
   * A sheet tick stores `map_version` and `fingerprint` in its snapshot's `factsJson`.
   * `web/src/runtime/answer-sheet.tsx:40-41` reads the parts from the server instead of keeping its own order.
   * **Only the baton holder does this:** in the lane plan, after BK-8 → QA-165/318 → QA-315.
   * What the case officer will see change: "nothing recorded" boxes now show "No" on the sheet; a box that a signature or oath rule blanks is gone from the sheet; choice words may change (§8 Q2).
4. **S3d: proof and filed-with (with S6 and F1).**
   * `fill-trials.ts` records `map_version` from the list a trial filled. The 6 null rows stay "for their edition only" until re-run by F1.
   * `submission.ts:144` and `case-prepare.ts:666` read `valuesFor` instead of `currentValues` (status ok only). `case-prepare.ts:666` is baton work again: fold it into S3c if the holder has room.
5. **M6: the extension** reads `valuesByPortalScreen` only, after E1 saves screen maps. Nothing in S3a-S3d waits on M6.

---

## 6. Contract tests (each has a pass and a fail)

The file is `tests/check_s3_filing_values.ts`. It is pure (no database, no server, no model call, US$0) and runs on the finished story's case data and small made-up snapshots.

| # | Rule | Pass | Fail (must be refused or flagged) |
|---|---|---|---|
| T1 | 2 | Finished story, IMM 5257, principal: every value key in both orders has equal status, value and display | a "none apply" group: the sheet built the old way (no `markNothingRecorded`) shows the box waiting while the PDF has "N"; the test names the box |
| T2 | 2, 4 | A choice answer: the PDF code maps back to the same display as the sheet's | a release where two forms label one code differently: the display follows the one rule (§8 Q2), never "first map wins" |
| T3 | 3 | `map_version` is set and stable for the same map; it changes when one transform, the field list's sha256 or `VALUE_STEP_VERSION` changes | a list with `map_version` null or "" is refused by the contract's own check |
| T4 | 3 | A copy made after S3b stores `map_version` and `fingerprint`; `trialFor` matches it | a copy whose stored `map_version` differs from the map at job time: the job refuses with words, no file is written |
| T5 | 4 | Each blank-by-rule value has a rule from `BLANK_RULES` and a why; each to-fix value has a fix and a why | a gated-off box with no rule, or a why of "": refused |
| T6 | 5 | `valuesByPortalScreen` on a screen map holding a signature and an oath field: both in `withheld`, none in `values` | a field map that maps an oath box to a fact (allowed today with a warning): the value still never reaches `values` |
| T7 | 6 | Two calls with the same inputs and `today` give the same fingerprint; a read-only database proxy records 0 writes | a call without `today`: a type error; a hidden `new Date()`: caught by a guard grep |
| T8 | 7 | An answer that fails its check (QA-122): status to-fix, display "", value null | the old `currentValues` counted it as "filed with": the test shows the difference |
| T9 | 8, 10 | The same item moved Online → PDF upload: values equal by value key; a release with two PDF editions listed oldest first: the order and the values use the edition in use | today's `fieldMapOf` picks the oldest edition's parts: the test names the misplaced boxes |
| T10 | 9 | A filing-scope fact (`case.`): `person = "case"` and an equal value on IMM 5257 and IMM 5645 of the same case | a person-scope fact read on another person's form: refused (SH3 R6) |
| T11 | — | `diffSince`: no change gives an empty list; one changed answer gives exactly that value key; an unknown fingerprint gives `known: false` | an unknown fingerprint answered as "no changes": refused |
| T12 | 11 | Copies and ticks stored before S3 still read "current" when nothing changed | a fingerprint swapped into `inputHash`: every old copy turns out of date; the test catches it |

Also: every existing suite stays green, including `check_vv_answer_sheet`, `check_m3s5_sheet_only`, `check_qa317_sheet_browser`, `check_s2_fill_trials`, `check_sh3_resolver`, `check_forms_b86_fill` and the C7.1, C7.2 and C7.3 packs. The only changes allowed are the on-screen differences S3c lists in its PR (§5.3), each accepted by the Lead.

---

## 7. Rows, order, sizes; baton

| Row | What | Lane | Size | Baton | After |
|---|---|---|---|---|---|
| **S3a** | contract + engine module + tests T1-T12 against the module (T1, T9 also against today's sheet, as the drift report) | runtime, no baton | 1 session | none | this concept agreed |
| **S3b** | PDF callers read the contract; copies store `map_version` + `fingerprint` in JSON | runtime | 0.5-1 | none (but `fill-case.ts` single holder) | S3a; S2; B170e/f |
| **S3c** | answer sheet reads the contract; `fieldMapOf` fixed; sheet ticks store `map_version`; web stops keeping its own order | runtime, **case-prepare holder** | 0.5-1 | **case-prepare** | S3a; the holder's queue (BK-8 → QA-165/318 → QA-315) |
| **S3d** | trials and proof rows record `map_version`; filed-with reads the contract | evidence + runtime | 0.5 (inside S6/F1) | none (case-prepare part folded into S3c) | S3a; S6 |
| | **Total** | | **~2.5-3.5** (part 7 said 2: the extra half is the split for the batons) | | |

Each row is one PR from `origin/main` with an Opus reviewer. S3b and S3c touch the PDF and the case officer's sheet, so each also gets a breaker. **No `schema.prisma` change in any row**: everything is stored in the existing JSON columns. A real column waits for SH4/S4 under the schema baton.

---

## 8. Risks and open questions (each with a recommendation)

**Q1. What does "map version" cover?** Today `mapVersion` hashes only the map entries (`fill-trials.ts:23-27`). The field list (`max_chars`, choices, order) and the value-step code also change what is written, so a trial could count for a copy that writes differently.
*Recommend:* `map_version` = hash(entries, field-list sha256, `VALUE_STEP_VERSION`). Keep the 6 null trials as "edition only" (as today) until F1 re-runs them. Bump `VALUE_STEP_VERSION` in the same PR as any change to transforms or formats, checked by a guard. (Tech lead decides; no product change.)

**Q2. Whose words for a choice?** The sheet uses the first form's code-list label (`case.ts:161-175`); a PDF text box uses the answer list's label (`options.ts:83`). Rule 2 needs one.
*Recommend:* the label printed by **this form's own** code list, else the answer list's label. Never "the first form in the release". It keeps QA-317's intent (the officer copies what the form says) and makes the two channels equal. If the founder wants the portal's own words later, E1's screen map supplies them per screen version.

**Q3. Should the extension type values that are declared but not yet confirmed?**
* On the PDF they fill at once (P-242, P-411).
* On a live portal the representative checks every screen before Next (P-245).
* *Recommend:* yes, typed and marked "to confirm", with the screen check listing them first. Values to fix are never typed (rule 7).
* This is a product choice for the founder, asked through the Lead with M6's design, not before S3a.

**Risks.**
* (a) S3c changes what the case officer sees on the sheet (§5.3). List each change in the PR and walk it in a browser before review.
* (b) `fill-case.ts` has three lanes waiting (S2, B170e, B170f), so S3b may wait. S3a and S3c do not depend on it.
* (c) Legal: whether IRCC's terms allow automated portal filling is **Unconfirmed: no counsel** (P-245). S3 builds only the values, never the typing.

---

**Sources read (fbfb263c7):**
* master plan part 7 §1-§2 and §5 (`product/design/master-plan-2026-11-11/07-m4-and-on.md`);
* DECISIONS P-258, P-245, P-171, P-442, P-438 (2) via the Bake plan;
* P-46 (`product/decisions/P-43-P-47-journey-v3.md:8`);
* B170 analysis v4 (branch `claude/sleepy-yonath-3186af`, `product/design/xfa-reuse-analysis-2026-11-11.md` §2-§4). In v4 the letters are: a = source copy, c = adapter, e = barcode check, f = the form's own check. Earlier versions lettered them differently (its §9).
* Code at the file:line references above.

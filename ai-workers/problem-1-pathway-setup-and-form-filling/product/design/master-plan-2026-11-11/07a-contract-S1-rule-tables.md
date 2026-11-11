# S1 · Library rule-table service: contract (concept, no code)

Concept for the tech lead and the founder. Read-only on main `fbfb263c7`. Master plan part 7 §2 (S1) and §3 (A1-A7). Decisions: P-258, P-170, P-240, P-448, P-449, P-438 (2). Every immigration value below is an example and is **Sample**.

> **Analyst's note (master analysis, 11 Nov):** drafted by a read-only reader at my brief, checked by me against the code. Its key finding is confirmed: **fees are not part of a release** (`api/src/release-update.ts:23`, "Fees are not part of a release yet; they come from the fee table."). `engine/runtime/filings.ts:22` imports `samples/fee-table.json` when the code loads. So a fee change reaches every open case with no approval and no pin. Today that is acceptable, because all fees are Sample and the build is internal on sample data (P-455 (3)). It is the first thing S1 fixes. **Status: contract for agreement, not started** (Lead 16, 11 Nov). Moving fees needs **both** batons (schema and `case-prepare.ts:27, :690`), so it waits for the Bake's baton rows (M3-S4, BK-8, QA-165/318).

## 1. Purpose and callers

- **What it is:** one shared, versioned store for the small rule tables that today sit in seven JSON files.
- **What each row carries:** its source (page, link, quote, date read), a Sample mark, and who made and approved it.
- **How it reaches a case:** a release freezes the tables into its hash, and a case reads only the tables of the release it is pinned to.
- **Owning area:** runtime (schema baton holder). The contract lives in `contracts/rule-tables.ts`, with tests in `tests/check_s1_rule_tables.ts`. Callers never copy it (P-258).

**Who calls it:**

| Caller | Reads / writes | Through |
|---|---|---|
| M4 A1-A6 library screens (fees, box gates, script requirements, form roles, own Yes/No, fact expiry) | list, get, draft change, propose, approve | the API, then `To review` for the second person |
| M4 A7 (fill-trial status) | read only (S6 owns the proof rows; see §8 Q3) | `readForCase`, `list` |
| The case engine (fees and filings, checklist, readiness, fill, earlier facts) | `readForCase(releaseId, kind)` only | pure function over the pinned snapshot |
| Release (`api/src/studio.ts` releaseRows / publishRow) | `freeze` | same transaction as the release |
| M5 content freshness (correction vs rule change, "in force from") | list rows by `read_on`, propose with a new source | the same propose / approve door |
| M6 Chrome extension (fees and form roles) | `readForCase` only | the filing's pinned release (S4) |

## 2. Today, per table (evidence)

Loader lines are on `fbfb263c7`, under `prototype/studio/`.

| # | File | Loader (file:line) | Row shape | How it reaches a case | Problems (evidence) |
|---|---|---|---|---|---|
| 1 | `samples/fee-table.json` (11 lines, 4 combinations) | `engine/runtime/filings.ts:22` (static JSON import at module load) → `FEE_TABLE` `:41`. Also read by `engine/runtime/case-checklist.ts:23` (`DERIVED_FOR`, a module-load constant), `engine/validate.ts:100`, `api/src/source-register.ts:20-21` and `api/src/case-prepare.ts:27, :690`. Tests: `tests/check_r2_fee_table.ts`, `tests/check_b164_no_engine_keys.ts:118` | Top: `about, as_of, read, status, lines[], combinations{}`. Line: `key, label, status, basis (per_application / per_person_by_role / per_position / family_maximum), per_person_cad, family_max{cad, from_people}?, roles[]?, exempt{under_age, over_age, source}?, source{page, url, quote, quote_kind, read, checked}`. Combination: `label, lines[keys], checklist?, modes{role: files_own/co_files/on_principal}?, group_why?, co_filed_why?, each_files_own{says, source}?, basis_note?, note?` | **Read live, not in the release.** `api/src/release-update.ts:23` says it outright: "Fees are not part of a release yet; they come from the fee table." | (a) A fee edit changes every open case's total at the next restart, with no approval, no release and no pin. (b) The file also holds non-fee settings: filing modes, the "checklist worked out" flag, and the reasons. A10 will want those. (c) A quote may be "summary of the Lead-checked record", not IRCC's words (`contracts/runtime.ts:317`). (d) Sample status appears only in prose (`status`, `about`). |
| 2 | `samples/form-field-gates.json` (3 editions: 22 gates and 1 "filled by hand" group) | Seed step only: `api/src/features/checkpoint/045-form-field-gates.ts:22-23`. The service is `api/src/form-field-gates.ts:47` (propose), with an approval hook at `:42` | `editions[]{form, edition, file, gates[]{box, gate{op, field, value}, words, cite}, byHand[]{under, words, cite}}`. `cite` is one free-text string holding the page, quote and read date | **Already library rows, two-person, frozen.** An approval writes `FormFieldMap.conditionRule` (`prisma/schema.prisma:624`), and the release carries it as `condition_rule` (`engine/snapshot.ts:140`), so it is in the hash | (a) No screen: "No route: the configured checkpoint proposes them" (`form-field-gates.ts:7`). (b) The citation is a single string, so a machine cannot check its page, link or date. (c) The seed approves as the "second person" (`045-form-field-gates.ts:56`). |
| 3 | `samples/form-script-requirements.json` (1 edition, 2 rows) | `api/src/own-yes-no.ts:81` (readFileSync at module load) → `scriptRulesOf` `:83`. Used at fill and readiness time by `api/src/fill-case.ts:118, :124`, and also by `api/src/own-question.ts:191` and checkpoint step 230 `:103` | Top: `basis` (one citation paragraph for the whole file) and `editions[]{inventory (file name), fields[]{box, requiredWhen{box, equals[]}, words}}` | **Read live at fill time, not in the release.** Matched by the field-list *file name*, not by edition or SHA-256 | (a) No source per row. (b) A change alters "mandatory, still empty" on cases that already exist. (c) It lives in `own-yes-no.ts`, which is unrelated code. |
| 4 | `samples/form-roles.json` (2 rows) | Seed only: `engine/import.ts:21-23` (`applySampleFormRoles`, a direct `updateMany`). The product path: `POST library/forms/:code/role` (`api/src/form-library.ts:259, :532`) → LibraryChange `form_role` → second person → `api/src/lifecycle.ts:458` applyRole → `GovFormDef.formRole` | `about` (one citation for the file) and `roles{"IMM 5707": "family_information", …}` | **Already a library value, two-person, frozen.** The release carries `form_role` (`engine/snapshot.ts:237`) | (a) No screen: nothing in `web/src` calls the role route. (b) The column is not versioned: approval overwrites the live row. (c) The seed skips approval. |
| 5 | `samples/own-yes-no.json` (vv.single only, 10 boxes) | `api/src/own-yes-no.ts:110` (module load) → `OWN_YES_NO` `:116`. Used by `api/src/form-setup.ts:105`, checkpoint steps 140 and 230, and `acceptance/lib/pack2.ts:12` | Top: `basis, reason, near, combinations{key{application, boxes[]{dataPath, label, meaning, followUps[]?, question?, askedWhen{fact, equals}?, checkpointOnly?, field?, form?}}}` | **At set-up only.** The checkpoint turns each row into library questions and conditions (step 140 `OwnQuestions.ask`), and a release then carries those | (a) The citation sits inside `meaning` prose ("IMM 5257 p. 1, Question 2 A"), with no link and no read date. (b) A publisher cannot add a row for a new pathway without a file edit. |
| 6 | `samples/fact-expiry-rules.json` (3 rules) | `engine/runtime/earlier-facts.ts:11` (static import) → `EXPIRY_RULES` `:18`, the default of `expiryFlags` `:46`. Used by `api/src/earlier-facts.ts`, with the test `acceptance/C6.19.test.ts` | `rules[]{key, fact, kind (expires_before_today / expires_within_months / issued_more_than_months_ago), months?, blocks, covers[], words, source{page, url, quote, recorded, file, applies_to[]?} or {sample: true, why}}` | **Read live, not in the release** | (a) `police_certificate_old` is Sample with no source. (b) A change reaches every case. (c) The date field is spelt `recorded`, a fourth spelling. |
| 7 | `samples/fill-trials.json` (6 trials) | `api/src/fill-trials.ts:29-30` (`readTrials`, readFileSync on each call) → `trialFor` `:54`. Used by `api/src/fill-case.ts:162`, `api/src/form-additions.ts:88` and `tests/check_s2_fill_trials.ts` | `trials[]{form, edition, form_sha256, map_version, status_file, recorded_on, note}` | **Read live on each fill.** The verdict is parsed from an evidence `STATUS.md` by regex (`verdictPasses`) | (a) All six have `map_version: null`. (b) This is evidence, not a rule: there is no quote, because the proof is the trial. (c) BK-11 (status in the release) has not started, and S6 owns proof records. |

**What this means for S1:**
- Four of the seven tables are read live and skip the release: fees, script requirements, expiry and fill trials.
- Two are already approved, frozen library values with no screen: gates and roles.
- One is seed data turned into questions at set-up: own Yes/No.
- Citations come in six shapes. The `SourceEntry` model (`prisma/schema.prisma:2206`: url, page, quote, date, none published, sample) already has the shape S1 needs.

## 3. The contract (`contracts/rule-tables.ts`, types only, pure)

```ts
/** One kind per file today. */
export type RuleKind =
  | "fee_line"            // samples/fee-table.json lines[]
  | "combination_fees"    // samples/fee-table.json combinations{} (lines, checklist flag, modes, words)
  | "form_field_gate"     // samples/form-field-gates.json (stored on FormFieldMap.conditionRule: adapter)
  | "form_script_rule"    // samples/form-script-requirements.json
  | "form_role"           // samples/form-roles.json (stored on GovFormDef.formRole: adapter)
  | "own_yes_no"          // samples/own-yes-no.json
  | "fact_expiry_rule"    // samples/fact-expiry-rules.json
  | "fill_trial";         // samples/fill-trials.json (read only here; owned by S6)

export type TableStatus = "draft" | "approved" | "released";
export type RowStatus = "draft" | "waiting" | "approved" | "released" | "superseded" | "retired";

/** P-170: page, link, quote and read date. P-240: or "None published – set by ExpatReady" with a reason. */
export type RuleSource =
  | { kind: "cited"; page: string; url: string; quote: string;
      quote_kind: "official_words" | "lead_checked_summary" | "form_script";
      read_on: string /* YYYY-MM-DD */; file?: string /* our stored copy */ }
  | { kind: "none_published"; reason: string };

export type RuleRow<V = unknown> = {
  kind: RuleKind;
  key: string;              // unique within kind + scope, e.g. "visitor_visa"
  scope: string | null;     // combination key, form edition label, or null (applies to all)
  value: V;                 // the kind's row schema below
  source: RuleSource | null;
  sample: boolean;          // true = Sample (P-240: releases only as a Demo release)
  sample_why?: string;      // required when sample is true
  version: number;          // lineage version (as FormFieldMap); not hashed
  status: RowStatus;        // bookkeeping; not hashed
  made_by: string;          // actor id
  approved_by: string | null;
  approved_at: string | null;
  change_id: string | null; // the LibraryChange that carried it
};

export type RuleTable<V = unknown> = {
  kind: RuleKind;
  key: string;              // "fees", "expiry", … (one table per kind today)
  version: number;          // the release (PackVersion) it was last frozen in; 0 = never
  status: TableStatus;      // draft: has unapproved rows; approved: every changed row approved; released: frozen
  rows: RuleRow<V>[];
  hash: string;             // sha256 of canonical(content(rows)), the snapshot's own rule
};
```

**Row schemas per kind.** Each is the file's row as it stands today, so "same answer" holds. All values shown are Sample.

| Kind | `scope` | `value` |
|---|---|---|
| `fee_line` | null | `{ label, basis: FeeBasis, per_person_cad: number, family_max?: {cad, from_people}, roles?: string[], exempt?: {under_age, over_age, source: RuleSource} }`. Example: `{label: "Visitor visa fee", basis: "family_maximum", per_person_cad: 100 (Sample), family_max: {cad: 500 (Sample), from_people: 5}}` |
| `combination_fees` | combination key | `{ label, lines: string[], checklist?: boolean, modes?: Record<role, LineMode>, group_why?, co_filed_why?, basis_note?, each_files_own?: {says, source: RuleSource} }`. The modes and words stay here until A10 moves them |
| `form_field_gate` | form edition label | `{ box: string, gate: Condition } or { under: string, by_hand: true }` plus `words: string` |
| `form_script_rule` | form edition label (and its field-list file, kept for the match) | `{ box: string, required_when: {box: string, equals: string[]}, words: string }` |
| `form_role` | null | `{ form: string, role: "family_information" or another library role }` |
| `own_yes_no` | combination key | `{ application: string, data_path, label, meaning, question?, follow_ups?: string[], asked_when?: {fact, equals}, checkpoint_only?: boolean, field?, form? }` |
| `fact_expiry_rule` | null (or combination keys in `applies_to`) | `{ fact, kind: "expires_before_today" or "expires_within_months" or "issued_more_than_months_ago", months?, blocks: boolean, covers: string[], words }` |
| `fill_trial` | form edition label | `{ form, edition, form_sha256, map_version: string or null, status_file, recorded_on }`, read only through S1. S6 writes it |

**Operations.** Each is one call in `api/src/rule-tables.ts`, the only module that touches storage.

| Operation | Who | Does | Refuses (problem+json) |
|---|---|---|---|
| `list(kind, {scope?, mode: "draft" or "published"})` | any reader | the effective row per lineage (`engine/snapshot.ts` `effective()`) | none |
| `get(kind, key, scope)` | any reader | one row, with its history and any waiting change | 404 |
| `draftChange(actor, kind, key, scope, value, source, sample, sample_why?)` | author | validates the row against the kind's schema and the source rule; returns a preview (what changes, which combinations use it) | 400 for a schema break; 409 "Nothing changes" |
| `propose(actor, draft)` | author | writes one waiting `LibraryChange` (kind `rule_row`) plus an Activity line, in one transaction | 409 if a change already waits on this row |
| `approve(actor, changeId)` | a different person | re-checks that the row is as the proposal saw it, then writes a new DRAFT row version with `approved_by` set | 403 for the proposer or the maker; 409 if the row changed since |
| `freeze(tx, packVersion, combinationIds)` | called by release only | publishes the approved rows the combination uses; puts `rule_tables` in each `ConfigRelease.snapshot`, inside its sha256 | refuses the release if a used row is unapproved, or is Sample outside the demo workspace |
| `readForCase(configReleaseId, kind)` | engine and API | returns the kind's rows from that release's frozen snapshot; for a release made before S1, the baseline (rule 6) | 404 for an unknown release |

## 4. Rules (each with a passing and a failing contract test)

1. **Two people.** A row is approved only by a person who neither proposed it nor made the draft (`proposedBy`, `appliedBy`, as `LibraryChange` today). A release is made only by someone who changed none of its rows and did not submit it (BR-14, `api/src/studio.ts:1166-1176`). This includes the sample loader: it approves as a second loader identity, never as the proposer.
2. **Source or Sample.** A row is approved only if it has a `cited` source (page, url, quote, read_on, all non-empty, with `read_on` a real date not in the future) or a `none_published` reason. Otherwise it must have `sample: true` and a `sample_why`.
3. **Sample is demo only (P-240).** A release that uses a Sample row is allowed only in the demo workspace, and is then a "Demo release" (`engine/validate.ts:426` `isDemoSnapshot` also reads `rule_tables[*].rows[*].sample`). Anywhere else the release is refused and names the row.
4. **Frozen and hashed.** A released row is never edited or deleted. A change is a new version that waits for the next release. The release's `sha256` covers the `rule_tables` content (not `version` or `status`, as `content()` strips them today). A pinned release keeps its rows (`onDelete: Restrict`, as `PackWorkPin`).
5. **A case reads only its pin.** Case code calls `readForCase(pin.configReleaseId, kind)` and nothing else. No module imports or reads `samples/<seven files>` outside the seed loader. A guard test scans for it, as B164 does for keys.
6. **Same answer as today.** For every existing pack and acceptance test, fees, checklist flag, modes, gates, script rules, roles, own Yes/No, expiry flags and trial verdicts come out equal before and after S1. A release made before S1 has no `rule_tables`, so it reads the **baseline**: today's seven files, loaded once as released version 1, with their hash recorded in the migration.
7. **Fingerprints kept.** `rule_tables` is added to a snapshot only when the combination uses at least one row ("present only when any", `engine/snapshot.ts:64-69`). A combination that uses no row keeps its hash.
8. **One door.** Gates and roles keep their storage (`FormFieldMap.conditionRule`, `GovFormDef.formRole`). S1 reads and writes them through adapters to the same approval hooks. No second copy (P-258).

## 5. Data model sketch (named, not a migration)

- **`RuleRow`** (new, `rule_row`): `id, workspaceId, kind, rowKey, scope?, value Json, citationUrl?, citationPage?, citationQuote?, quoteKind?, citationDate? (Date), sourceFile?, nonePublished, nonePublishedReason?, sample, sampleWhy?, version, status DefinitionStatus, supersedesId?, madeBy, approvedBy?, approvedAt?, changeId?`.
  - Unique: `(workspaceId, kind, rowKey, scope, version)`.
  - Index: `(workspaceId, kind, status)`.
  - Lineage and statuses copy `FormFieldMap` (`DRAFT`/`PUBLISHED`/`SUPERSEDED`/`RETIRED` + `supersedesId`).
  - Source columns copy `SourceEntry`, with the same SQL check ("cited or none published, never both").
- **`RuleTable`** is **not** a model. It is computed per kind from rows (`effective()`), so there is no second state to keep in step.
- **Proposals** reuse `LibraryChange`: `kind: "rule_row"`, `key: "<kind>:<scope>:<rowKey>"`, actions `SET_RULE_ROW` / `RETIRE_RULE_ROW`, and an `APPROVAL_HOOKS` entry (the `form-field-gates.ts` pattern).
- **Freeze** reuses `ConfigRelease.snapshot` (new optional key `rule_tables`) and `publishRow`'s draft-to-published step. No new release table.
- **Baseline:** one `PackVersion` summary entry, `rule_baseline: {files: {name: sha256}, rows: n}`, written by the migration.

**Migration path:**
1. One schema PR adds `rule_row` and no other change (schema baton).
2. A one-off load reads today's JSON and writes rows for the generic kinds (fees, combination fees, script rules, own Yes/No, expiry). Each row is a draft proposed by the sample loader and approved by its second identity. Today's file-level citations are copied onto each row. `sample` is true wherever the file says Sample or "Unconfirmed: expert", which is all of them today.
3. Gates and roles are not loaded. They are read through adapters over their existing rows.
4. Fill trials are not loaded (S6).
5. Each caller switches to `readForCase`, one PR per table (fees first).
6. The five JSON files become **seed data only**: read by the sample loader and nothing else (rule 5's guard).

## 6. Contract tests (`tests/check_s1_rule_tables.ts`, pure where possible)

| Rule | Pass | Fail |
|---|---|---|
| 1 Two people | B approves A's proposal → row approved, `approved_by` = B | A approves A's own → 403; the maker of the draft approves → 403; the releaser who changed a row → 403 |
| 2 Source or Sample | cited row with all four parts → approvable; `none_published` with reason → approvable; no source + `sample: true` + why → approvable | no source and not Sample → 400; empty quote → 400; `read_on` in the future or not a date → 400; Sample without a why → 400 |
| 3 Sample demo only | demo workspace + Sample row → Demo release (`isDemoSnapshot` true) | non-demo workspace + Sample row → release refused, row named |
| 4 Frozen, hashed | change after release → new draft version; the old release's snapshot and sha256 unchanged; `snapshotHash(snapshot) === release.sha256` | editing a released row in place → refused; changing a row's value changes the next release's hash; a changed `version` or `status` alone does not |
| 5 Pin only | a case pinned to release 1 reads release 1's fee after release 2 changes it | guard scan: any import or readFileSync of the seven files outside the seed loader → test fails, naming file:line |
| 6 Same answer | all acceptance packs and `check_r2_fee_table`, `check_b107_*`, `check_qa165_*`, `check_p319_family_role`, `C6.19`, `check_s2_fill_trials` green with no expected value changed; the baseline hash equals the seven files' hash | a pre-S1 release with a changed baseline row → the test shows the difference |
| 7 Fingerprint | a combination using no row: sha256 equal before and after S1 | adding a fee row to a combination → its hash changes (and is reported) |
| 8 One door | a gate proposed through S1 lands in `FormFieldMap.conditionRule` and the release's `condition_rule` | a gate written to `rule_row` → refused (kind stored by adapter) |

## 7. Rows it creates, order, size, baton

| Order | Row | What | Sessions | Baton |
|---|---|---|---|---|
| 1 | **S1a contract** | `contracts/rule-tables.ts` + pure contract tests (rules 2, 4, 6, 7 on fixtures) | 0.5 | none (can start now) |
| 2 | **S1b store** | `rule_row` model + migration, `api/src/rule-tables.ts` (list, get, draft, propose, approve, freeze, readForCase), baseline load, adapters for gates and roles | 1-1.5 | **schema** |
| 3 | **S1c fees through S1** | `filings.ts`, `case-checklist.ts` (`DERIVED_FOR` becomes a function of the release), `validate.ts`, `source-register.ts`, `case-prepare.ts:690` read `readForCase`; `release-update.ts:23`'s sentence goes | 1 | **case-prepare** (short) |
| 4 | **A1 Fees screen** | list, edit, propose; `To review` approves | 1 | none |
| 5-7 | **A6 Expiry, A3 Script rules, A5 Own Yes/No** (parallel): caller switch + screen each | 1, 1-2, 1 | none (A3 touches `fill-case.ts`; check against S2) |
| 8-9 | **A2 Gates, A4 Roles** (parallel): screens over the adapters, no data move | 1-2, 1 | none |
| 10 | **A7 Fill-trial status**: screen over S6's proof rows, read through `readForCase` | 1 | after S6, BK-11 |

- **Total:** S1 is about 3 sessions, as the plan says. A1-A7 are about 7-10.
- **Schema baton (P-438 (2)):** only S1b holds it. Every kind stores its value as JSON in one table, so A1-A7 add no columns and need no schema baton. S1c needs the case-prepare baton for one call site. Ask for it at the same hand-over, or put S1c straight after the case-prepare holder's current row.

## 8. Risks and open questions (with a recommendation each)

1. **Where the frozen tables live.**
   - Per combination, inside `ConfigRelease.snapshot` (only the rows that combination uses), or once per `PackVersion`?
   - The combination snapshot is what a case is pinned to (`PackWorkPin.configReleaseId`), so `readForCase` stays one read.
   - The cost: every combination that uses fees changes its hash once, and outside the demo workspace its next release becomes a Demo release while the fees stay Sample (P-240). That is honest, but it is visible.
   - *Recommend:* per combination, "present only when any", with a one-time re-release noted in the S1c PR.
2. **Gates and roles are already approved, frozen library values.** Should S1 wrap them, or move them into `rule_row`?
   - Moving them would make a second copy or a data move with no gain for the user.
   - *Recommend:* adapters (rule 8). A2 and A4 then become screens only (smaller), and Configurable's "7 → 0" counts them once their screens exist.
3. **Fill trials are evidence, not rules.** Their proof is a trial and an Adobe check by a person, not a quote, and S6 and BK-11 already own them.
   - Putting them under S1's "source or Sample" rule would not fit.
   - *Recommend:* S1 defines the read shape (`fill_trial`) so a release and A7 show it, and S6 writes it. Ask the founder to confirm that "seven tables" counts fill-trial status as done when A7 shows S6's rows.

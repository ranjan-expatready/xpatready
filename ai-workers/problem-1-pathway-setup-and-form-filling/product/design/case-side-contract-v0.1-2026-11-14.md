# Case side: module contracts, v0.1 (for the release Lead to place in `design/`)

Type: D8 design and contract · Asked by: Lead 41 under P-575 (4), extended by Lead 42 (P-585 (2)) and ruled by Lead 42 (P-588) · Author: strategy desk 03 (v0 by desk 02) · Written 10:1x IST, 14 Nov 2026 (clock read 10:12 IST at the start of writing) · Private until placed (P-539). Read-only work: nothing in the repository was edited.
**What changed from v0:** P-588's six rulings and its three "also from the challenge" lines applied word for word (marked **[P-588 (n)]**); the fresh challenge's 14 Majors applied and 8 of its 9 Minors (marked **[Fn]**); per-finding disposition in §11. Section 9 has no open item.
Shape follows Lead B's `platform-and-front-office-contracts-2026-11-14.md` (branch `lead-b-front-office`, draft 4; its §7 is binding).

**What it rests on.** v0's inventory of `origin/main` at `f1d0d403e` (`case-side-inventory-2026-11-14.md`, this folder), the challenge's recount at the same commit (`case-side-contract-v0-challenge-2026-11-14.md`), and the desk's own reads of `origin/main` at `f1d0d403e` (fetched 10:0x IST 14 Nov; `main` had not moved): `engine/runtime/eligibility.ts`, `engine/render.ts`, `engine/eligibility-gates.ts`, `engine/answer-keys.ts`, `engine/snapshot.ts` import lines; `contracts/` imports; `api/src/runtime.ts` 245-304, 294, 960; `auditEvent.create` per file; `package.json` (no lint or import-boundary tool). Decisions read word for word: P-575, P-584, P-585, P-588. Paths are under `prototype/studio/` unless they start otherwise.
No immigration value is asserted. Regulatory points: Unconfirmed: no counsel.

---

## 0. Facts about today's case side that shape this contract (counts re-checked by the challenge)
1. **A firm key exists, as text, on three tables only:** `Case.firmKey` (default `sample-firm`), `CaseStage.firmKey`, `FirmCaseCounter.firmKey` (`prisma/schema/cases.prisma:30`, `:77`, `:164`). The other 45 firm-owned tables have none. The firm is worked out from the simulated person (`x-actor`, 338 lines outside tests in 70 files) through `samples/firms.json`; it is looked up in 13 call lines in 7 files (`firmOfActor(`, `firmByKey(`) **[F-recount]**. No firm table; 0 policy lines in 84 migrations.
2. **`workspaceId` is on 95 of 104 tables and is not a firm.** It is the boundary the demo reset deletes by; it stays. The firm is a separate column.
3. **There is no client on the case side.** A person (`Party`) is created new for every case, in one file (`api/src/runtime.ts:291`, `:435`; loaders aside) **[F15]**; `CaseParticipant.subjectId` is unique; the one who answers is a simulated login (`Case.clientActorId`).
4. **There is no event, outbox or webhook code.** The audit table is the only record; it has no firm and no case column. Audit writes: 215 lines in 62 files through `Audit.log` (`api/src/core.ts:136-141`, writing through its own `this.db`, outside the caller's transaction) **plus 25 direct `auditEvent.create` in 20 files** (desk's count today; the challenge said 19, one of them is `core.ts`'s own) **[F7]**. No insert-only trigger on `audit_event` in any migration **[F16]**.
5. **Eligibility today is "three outcomes, no score"** (stand-in SI-1). The rules live in `engine/runtime/eligibility.ts` (160 lines, pure); outcome codes `LIKELY_ELIGIBLE`, `POSSIBLY_ELIGIBLE`, `NOT_ELIGIBLE`, plus `ELIGIBLE_BELOW_CUTOFF` ("not used: P-236") (`contracts/case-check-words.ts:13-17`) **[F5]**.
6. **`engine/` and `engine/runtime/` already import each other.** 4 top-level engine files import `engine/runtime/` (`answer-keys.ts`, `render.ts`, `source-register.ts`, `validate.ts`); 20 runtime files import top-level engine files. So a folder split by owner is not free (see §2.6).
7. **Outside services have ports in two places only** (official pages with a recorded fake; AI with a fake launcher). Files go straight to local disk in five files; mail is a demo table; no malware scan.
8. **Facts the v0 left unverified, now read [F16]:** `Runtime.reach` refuses staff of another firm with 404 "No such case." (`api/src/runtime.ts:139-146`); the client path checks `clientActorId` only.

## 1. Ground rules (the case side adopts Lead B's §0 and adds five)
Lead B's §0 applies as written: fenced folders; every firm-owned table carries the firm; outside services behind ports with a fake; events through the one outbox (`module_event`, platform's, PF-3); permissions deny by default; one audit trail through `AuditPort`. Added:
1. **Three kinds of table.** *Platform-wide*: pathway, program, combination, library, form editions, field maps, releases, proposals, test families, sources. No firm column. **Pathway configuration is platform-wide and read-only to firms in the first build (P-585 (3), X-20), plus a write wall on the platform-wide tables** **[P-588 (1)]**: firms' staff may read; only platform configuration staff (the `system/configurator:*` keys of P-585 (3), the demo role picker until then) may write; the wall is a database grant (the app role that owns no table gets `SELECT` only on platform-wide tables; writes go through a configuration role), tested by the walls test. *Firm-owned*: everything under a case, a person or a client. *Mixed, by rule*: the audit trail (a configuration line has no firm; a case line has one).
2. **Existing code is not rewritten to fit.** Doors go in front of today's files; columns are filled by the database; a file moves only when its row touches it. The five busiest files are split only after the Bake's tag commit (P-499).
3. **One neutral ports folder: `prototype/studio/ports/`** **[F6, P-588 "also"]**. A sibling of `contracts/` and `engine/`, so the API, the engine and the web app can all import it. It holds every cross-module interface (`*.port.ts`), each port's fake (`fakes/*.fake.ts`), the event payload types, and the pure shared functions two modules must agree on (the match normaliser and score of 3.1). **It imports only `zod` and its own files** (not `contracts/`, which already imports `engine/`: `contracts/eligibility.ts` → `engine/eligibility-gates.ts`). Modules depend on `ports/` and on nothing of each other's. Implementations (adapters) live in the owning module's folder.
4. **The boundaries are tested, not stated** **[F6]**: one import-boundary check in CI with these rules: front office never imports `engine/` or case-side files (P-584 (7)); case-side files never import `api/src/front-office/` or client-money files; `ports/` imports nothing but `zod`; `engine/eligibility/` never reaches `engine/runtime/` (§2.6). Nothing on `main` checks imports today (`package.json` has no lint or boundary tool), so the tool goes through `STANDARDS.md` §1's gate; the desk recommends `dependency-cruiser` (a standard, widely used checker; P-502) over a home-made script. Its rule file names each rule's decision.
5. **Sample stays Sample.** Demo loaders and checkpoint steps seed only with the Sample setting on and only for the Sample firm in a demo workspace; the demo reset never touches a real firm's rows (P-571 (2), P-575 (3)) **[F19]**.

## 2. The modules
Owners are roles; all case-side build lanes sit under the release Lead. "Files today" is the inventory's grouping (Inferred from file names and first comments). Every one of the 104 tables has one owner **[F14]**: configurator 35 (34 plus `Route`), case delivery 47 (the challenge's 45, less `PersonPreference`, plus the three extension tables), documents 5, form engine 14, audit 1, platform 2 (`Workspace`, `PersonPreference`) = 104 today; case delivery adds four new tables (§2.2).

### 2.1 Configurator (`configurator`)
* **Job:** pathway set-up: hierarchy, combinations, library, rules and gates, sources, AI proposals, releases; **the eligibility rules and AS-1's ranking score and grid rules** (P-584 (7)).
* **Owns (platform-wide):** schema files `pathways` (7 models), `library` (12), `proposals` (3), `governance` less the audit table (6), `testing` (6), plus `Route` (from `cases`; a platform-wide route list) **[F14]**.
* **Files today:** 47 API files, about 12,400 lines; plus `engine/snapshot.ts`, `engine/eligibility-gates.ts`, `engine/resolver.ts`, and after §2.6 `engine/eligibility/`.
* **Publishes:** `release.published` { combination_id, release_id, version, content_hash }. Doors (adapters in its folder, interfaces in `ports/`): `ReleasePort`, `EligibilityPort`.
* **Listens to:** nothing.

### 2.2 Case delivery (`case-delivery`)
* **Job:** the client record, cases (open, decide or withdraw, reopen), people on a case, answers, stages, tasks, review, filings, signing steps, submission records; **the one owner of a client merge across the person and client records** (§3.3) **[P-588 "also"]**.
* **Owns (firm-owned):** schema files `cases` (less `Route`, `PersonPreference`), `answers` (8), `filings` (9), `review` (7), `submission` (6), `links` (4, including the `PersonLinkTry` counter), `ExtensionPairing`, `ExtensionSession`, `ExtensionCodeTry` **[F14]**; new: `case_client`, `case_client_merge`, `case_party_index`, `case_decision` (§5, §3.4).
* **Files today:** 34 API files, about 7,750 lines (`runtime` 1,039, `case-prepare` 1,015, …), plus `engine/runtime/` (39 files) **less `engine/runtime/eligibility.ts`, which moves (§2.6)**.
* **Publishes:** `client.created`, `case.opened` (P-560), `case.closed`, `case.reopened`, `client.merged` **[P-588 (6)]**. Doors: `PartySearchPort`, `ClientMergePort`, `CaseCountPort`, `CaseSummaryPort`.
* **Listens to:** `prospect.won`, `signing.completed`, `release.published`, `document.accepted`. (v0's `person.merged` listener is dropped: §3.3 **[F13]**.)
* **Calls:** `EligibilityPort` for its own case assessment (today `api/src/assessments.ts` imports `engine/runtime/eligibility.ts` directly; it switches to the port in the move row, §2.6); `EntitlementPort.check` at case opening (§3.4).

### 2.3 Form engine (`form-engine`, with the XFA engine package)
Unchanged from v0: form definitions, editions, field maps, filling, validation; no firm data; owns `forms` (13) and `RecaptureTask`; filled copies (`FormInstance`, `ValidatedCopy`) are case delivery's. `FormFillPort.fill / .validate / .fieldMapCheck`, fake = fixture forms and recorded results. The three engine files that import the database client (`snapshot.ts`, `channels.ts`, `import.ts`) belong to the configurator and move behind its doors (A50 rule 3).

### 2.4 Documents (`documents`)
Unchanged from v0: owns `evidence` (5); definitions are the configurator's; publishes `document.accepted`; `FilesPort` and `ScanPort` named (fakes: temp folder; always clean plus one always-refused file), not sized here (map rows 65, 66).

### 2.5 Audit (`audit`)
* `audit_event` moves to its own `audit.prisma`, gains `firm_id` (empty for a configuration line), `case_id`, and an insert-only trigger (none today).
* **How the firm and the case reach the line [F7]:** a request-scoped context (Node's `AsyncLocalStorage`, standard library) set by the guard that resolves the person (and, for link and extension sessions, by their guards, §8 step 5b) carries `{ firm_id, actor }`; `AuditPort.record(tx, …)` reads it. `case_id` is a parameter at case call sites, else derived where `entity`/`entityKey` names a case (as `case-feed.ts` parses today), else empty. `Audit.log` keeps its signature and becomes a caller of `AuditPort`, **but writes in the caller's transaction only where the caller passes `tx`**; the 215 call lines need no edit for the firm, and change only where a line must be atomic with the change.
* **Touch list (AUD-1's, and counted in the walls sizing, §8 step 5c, per P-588):** the 25 direct `auditEvent.create` writes in 20 files: `lifecycle.ts` 3; `document-supplies.ts`, `library-items.ts`, `must-verify.ts`, `review-rounds.ts` 2 each; `case-prepare.ts`, `core.ts`, `document-providers.ts`, `document-sets.ts`, `earlier-facts.ts`, `employer-link.ts`, `form-library.ts`, `forms-demo.ts`, `library-changes.ts`, `official-pages.ts`, `person-link.ts`, `readiness.ts`, `release-update.ts`, `review-stamp.ts`, `section-background.ts` 1 each.

### 2.6 Where eligibility and AS-1's scores live (no cycle with `engine/runtime/`) [F4, F5, P-588 "also"]
**The problem.** `assess` is in `engine/runtime/eligibility.ts` (case delivery's folder) and imports configurator files (`../eligibility-gates`, `../render`, `../snapshot`, `../resolver`); the configurator's `engine/answer-keys.ts:16` imports it back. A configurator door wrapping it would make a cycle.
**The placement.**
| What | Where | Imports allowed |
|---|---|---|
| `EligibilityPort` interface, its input and result types, **AS-1's score and grid-breakdown types**, the outcome codes as a type, the fake | `ports/eligibility.port.ts`, `ports/fakes/eligibility.fake.ts` | `zod` only |
| The pure eligibility rules today (`gateResult`, `outcomeOf`, `assess`, `rewriteMissing`, `restsOn`, `withUnconfirmedNow`, `inputsOf`, `outOfDate`, `nowOf`; 160 lines, moved unchanged) | `engine/eligibility/assess.ts` (configurator) | `prototype/contracts/rules.ts`, `engine/resolver.ts`, `engine/eligibility/condition.ts`, `engine/eligibility/gates.ts`, `ports/`; type-only `Snapshot` |
| `evalCondition` (today `engine/render.ts:36`, which also imports `engine/runtime/relatives.ts` and `compared.ts`) | extracted to `engine/eligibility/condition.ts`; `render.ts` re-exports it, so its callers do not change | `prototype/contracts/rules.ts` (`evaluate`, `CALCULATIONS`), `engine/resolver.ts` (`factsOf`) |
| `gateFacts` and the gate types (today in `engine/eligibility-gates.ts`, which imports `validate.ts` → `engine/runtime/case-checklist.ts`, `filings.ts`) | extracted to `engine/eligibility/gates.ts`; `eligibility-gates.ts` re-exports them | `prototype/contracts/rules.ts` |
| AS-1's Express Entry ranking score and Federal Skilled Worker grid **rules** (P-577 phase 1), as data on a release, each value cited (page, quote, date) else Sample | `engine/eligibility/scores.ts` (pure: reads the grid from the release snapshot, writes `scores[]`) | same as `assess.ts` |
| The adapter that implements `EligibilityPort` (loads the release snapshot, calls the pure rules) | the configurator's API folder (`api/src/configurator/eligibility.door.ts`, created by the move row; the configurator's existing files are not moved) | its module, `engine/eligibility/`, `ports/` |
| `engine/runtime/eligibility.ts` | stays one release as a re-export of `engine/eligibility/assess.ts`, then deleted when `api/src/assessments.ts` and `engine/answer-keys.ts` point to the new home | — |
**The rule that keeps it so:** nothing under `engine/eligibility/` may resolve, directly or through another file, to `engine/runtime/` (value imports; type-only imports of `Snapshot` allowed), checked by §1 rule 4's tool. Case delivery and the front office both reach the rules only through `EligibilityPort`. **Not attempted here:** untangling the other two-way imports between `engine/` and `engine/runtime/` (§0 fact 6); they are pure library code with no module door between them, and they wait for the post-Bake file split (P-499). **Unverified:** that `factsOf` in `resolver.ts` and the moved functions have no further import reaching `engine/runtime/` (the desk read import lines, not every function body); the move row proves it with the boundary check.

### 2.7 The eight tables v0 left without an owner [F14, P-588 (5)]
| Table | Kind | Owner | Firm set by |
|---|---|---|---|
| `AuditEvent` | mixed | audit | `AuditPort` from the request context (empty for configuration) |
| `ExtensionPairing`, `ExtensionSession` | firm-owned | case delivery (extension lane rows) | code, from the paired staff member (no case parent) |
| `PersonPreference` | firm-owned | platform identity (a staff member's setting; Lead B's PF-4s) | code, from the staff member |
| `ExtensionCodeTry`, `PersonLinkTry` | no firm: short-lived rate-limit counters, hashes only, cleared by age | case delivery | — ; **the walls test's only two named exceptions [P-588 (5)]** |
| `Workspace` | platform-wide (the demo boundary) | platform | — |
| `Route` | platform-wide | configurator | — |

## 3. Doors the case side offers (interfaces and fakes in `ports/`; each takes the firm from the caller's session, never an argument; another firm's data answers nothing, 404 not 403)

### 3.1 `PartySearchPort` (for FO-13c, the conflict-of-interest check)
* `search({ name?, email?, phone? })` → matches `{ kind: CLIENT | APPLICANT | FAMILY_MEMBER | SPONSOR | EMPLOYER | OTHER_PARTY, display_name, role_on_case, case_id, case_number, client_id, matched_on[], score }` plus `hidden_count`. Read-only; one audit line per search (who, terms, counts). The case-visibility rule is applied in the port.
* **Hidden matches [F18]:** when `hidden_count` > 0, the result cannot be recorded as `NO_CONFLICT` until a person who may see the matches (the file owner or a firm admin) confirms; the port returns `needs_confirmation_by_role` and FO-13c's screen enforces it. Legal duty as cited in FO-13: Unconfirmed: no counsel.
* **The index, `case_party_index` [F12]:** firm, case, subject, role, normalised name, lower-cased email, phone in international form. **Filled by database trigger** on the answer and profile tables (keys `person.*` name, email, phone; `organisation.*` name for employers; phone answers are stored as country code and number, BK-23's shape, so the trigger builds the international form without a library), not in code, so none of the 21 answer-write sites in 6 files changes. It has `firm_id` and the walls from day one. Dependencies: FO-9a's `pg_trgm` migration and the shared normaliser.
* **The shared match rules [F6]** (normalise email and phone; name similarity score) live in `ports/matching.ts`, pure; FO-9a's service and this port both call it. Neither side imports the other.
* Fake: five parties (client, spouse, sponsor, employer, one hidden).

### 3.2 `EligibilityPort` (the configurator's door; for AS-1 on the lead and for case delivery's case assessment)
* `listAssessable()` → `{ combination_id, name, release_id, version, content_hash }[]`.
* `requiredFacts(release_id)` → canonical answer keys the gates and grids read, with question wording and allowed values, **per role** (principal, spouse).
* `assess({ release_id, persons: [{ role, known }] })` → `{ outcome: LIKELY_ELIGIBLE | POSSIBLY_ELIGIBLE | NOT_ELIGIBLE, reasons[], missing_facts[], scores?: [{ grid, total, lines: [{ factor, points, max, source_ref }] }], rules_version: { release_id, content_hash }, disclaimer }` **[F5]**. `ELIGIBLE_BELOW_CUTOFF` stays out of the port while P-236 holds. `scores` is empty until AS-1's grid rules land; reserving it now keeps the port's shape fixed. `persons` replaces today's single `person` because a ranking score reads a spouse's facts.
* Pure and repeatable. Values stay out of the contract (P-577, AGENTS rule 4). The front office stores the result on the lead with `rules_version` and carries it on `prospect.won`; the case side runs its own and shows the lead's beside it. Override: the front office's record until the case opens, the case's after.
* Placement: §2.6. Fake: two Sample combinations with fixed answers, one with a Sample grid.

### 3.3 `ClientMergePort`: one client merge, owned by the case side, called by the front office [F13, P-588 "also"]
* **`case_client` stores the front office's person or company id** (`fo_person_id` or `fo_company_id`, one of them; nullable for a directly opened case) **[P-588 (2)]**.
* `mergeImpact(client_id)` → `{ cases, open_filings, signed_documents, fo_records }`: shown by the front office before anyone confirms.
* `mergeClients(tx, { survivor_client_id, loser_client_id, reason })`: **one operation across both records.** The front office confirms (FO-9b hands a match that involves a client with a case to this door); the case side then runs one in-process transaction (same database) that re-points the loser's cases to the survivor, calls the front office's person merge through its door for the two linked front-office records (`ports/person-merge.port.ts`, implemented by FO-9b), writes the merge record with the loser's full snapshot, and writes `client.merged` and the front office's `person.merged` in the same transaction. Returns `{ merge_id, moved_case_ids }`.
* `undoMerge(merge_id)`: mirrors it in one transaction (both records), allowed while no case was opened or closed on the survivor since.
* It re-points cases; it never merges case people, answers, documents or filed forms (people stay per case, P-588 (2)). Refused: across firms; two companies with different names; without the `client:merge` key.
* v0's `person.merged` listener is dropped: a front-office person merge that involves a client always comes through this door, so there is nothing to listen for.
* Fake: two clients with one case each, and a fake person-merge door.

### 3.4 `CaseCountPort` and the plan-limit check at opening (for PF-15; P-585 (2)) [P-588 (3), F1, F2, F3]
* `activeCounts()` → `{ individual: n, corporate: n }` for the caller's firm; counts only.
* **"Active" is the team's SA-3-47**: a case counts from its creation until its decision or withdrawal (SA-03 v2.29, name-free copy, line 386); a reopened case counts again. **Individual vs corporate is SA-3-4**: the case's group comes from its program's client type (SA-1-60; family cases count as individual; each linked worker's work-permit case under a corporate client counts as individual), i.e. **`Combination.clientType`** (`INDIVIDUAL` or `CORPORATE`, `prisma/schema/pathways.prisma:35-37`), never the client's kind.
* **Nothing on `main` records a decision or a withdrawal** (`Case.status` defaults `OPEN`, only `"OPEN"` is ever written, no close route), so every case would count forever. **New case-side row, `case_decision` (decision/withdrawal record), sized in §8 and in the 19 Nov count [P-588 (3)]:** record a case's decision or its withdrawal with who, when and the kind (a Sample list of kinds until the expert's list; no IRCC value asserted), reopen with a reason, `Case.status` moves `OPEN` → `CLOSED` → `OPEN`, writes `case.closed` / `case.reopened` once PF-3's outbox exists (the status change itself does not wait on PF-3). PF-15 waits on it.
* **The limit is checked inside the case-open transaction [P-588 (3), F3]:** `Runtime.createCase` (and FO-8's "Open a case?" path, which calls it) takes `pg_advisory_xact_lock` on the firm, then calls `EntitlementPort.check(firm, metric)` (the platform's, interface in `ports/`) with the count read inside the same transaction, before `runtime_next_case_number` (`api/src/runtime.ts:294`). Two opens at once cannot both pass. (The counter row the case number takes is per firm and year and its function body was not read, so the desk does not rely on it as the lock.) A refusal answers 409, as PF-15's Done when says.
* The platform also receives `case.opened`, `case.closed`, `case.reopened` (carrying `client_type`) to keep its own tally; the port reconciles.
* Fake: fixed numbers set by the test.

### 3.5 `CaseSummaryPort` (read-only, for the front office's timeline and client-money screens) [F22]
* `forClient({ client_id } | { fo_person_id } | { fo_company_id })` → `[{ case_id, case_number, combination_name, client_type, stage, opened_at, closed_at }]`. Nothing about answers, documents or filings. Accepting the front office's ids means client money (which keys on them, Lead B §8 `hasMoney(partyId)`) needs no mapping table.

### 3.6 `ReleasePort` (the configurator)
* `openable()`, `pin(release_id)`, `namesOnly()` (Lead B's §3 asks for names).

## 4. Events
All through `module_event` (PF-3), in the change's transaction, at least once, consumers idempotent by event id; every payload carries the envelope's `version` (Lead B §0.5) **[F23]**. Payload types live in `ports/events.ts`. **The case side's first row using an event waits on PF-3.**

| Event | Direction | Payload | The case side does |
|---|---|---|---|
| `prospect.won` | in, from front office | as Lead B's §2.6 and §7 (binding), including the assessment result when one exists and the identity-check result (P-584 (8)); the front office's duplicate result travels on it (preferred over the case side calling back a `DuplicateCheckPort`) **[F6]** | makes the client **once** (idempotent on the prospect id), storing `fo_person_id` or `fo_company_id`; writes `client.created`; offers "Open a case?" pre-filled. Opens nothing by itself (FO-8) |
| `signing.completed` | in | **as Lead B §7 §2.3-§2.4, quoted there, not restated here** (document kind, version, signer person ids, document and certificate keys; for a retainer the agreed total and currency) **[F17]** | a retainer for a client won before signing clears "Retainer not signed" on the client and its cases; a consultation: nothing |
| `client.created` | out | `{ firm_id, prospect_id, client_id, client_number }` (P-560) | |
| `case.opened` | out | `{ firm_id, prospect_id \| null, client_id, case_id, case_number, client_type }` (P-560 plus `client_id` and `client_type`; `prospect_id` null for a directly opened case) **[F11, F23]** | |
| `case.closed` | out **[P-588 (6)]** | `{ firm_id, client_id, case_id, client_type, reason: DECISION \| WITHDRAWAL }` | plan counts; front office timeline |
| `case.reopened` | out **[P-588 (6)]** | `{ firm_id, client_id, case_id, client_type, reason }` | plan counts; timeline |
| `client.merged` | out **[P-588 (6)]** | `{ firm_id, merge_id, survivor_client_id, loser_client_id, moved_case_ids }`, written with `person.merged` in one transaction (§3.3) | client money re-points its party |
| `release.published` | configurator, out | `{ combination_id, release_id, version, content_hash }` | offers "adopt the update" (exists) |
| `document.accepted` | documents, out | `{ firm_id, case_id, document_id, document_type }` | readiness |
| `filing.ready` | **held [P-588 (6)]** until a row consumes it | — | — |

Money is read, not listened to: an unpaid invoice shows as a warning through `ClientMoneyPort` (Lead B §8), never a block.

## 5. The client: the one new record the case side must own [P-588 (2), F11]
* `case_client`: firm, client number (per firm), display name, `fo_person_id` or `fo_company_id` (the front office's ids), the prospect it came from (unique per firm when present; makes `prospect.won` idempotent), file owner, contact as given at winning, created at. **No `kind` column is used for counting**: the case's group comes from `Combination.clientType` (SA-3-4). A display kind (person or company) follows which front-office id is set.
* **`Case.clientId` is never left unfilled.** A directly opened case (today's "Open a case", `api/src/runtime.ts:245-304`), the Sample loaders, the checkpoint steps and tests: `createCase` makes a client when none is given (prospect empty, no front-office id until one is linked) or picks the one chosen. The migration gives every existing case a client; a corporate combination's case (`api/src/employer-cases.ts`, `employer-link.ts`) gets a company client; `NOT NULL` is set only after the backfill, in the same migration, checked on the demo-data copy (`migrate diff` empty).
* `case_client_merge`: §3.3's merge record.
* **People stay per case.** Returning-client facts keep working as today (copied after re-confirmation, BR-3). A shared person is not needed by any row named so far.
* The simulated client login (`Case.clientActorId`) is replaced by the platform's client identity when the portal row lands (P-584 (4)).

## 6. Outside services on the case side
| Port (interface in `ports/`) | Fake | Real | Today |
|---|---|---|---|
| `FilesPort` | temp folder | private storage in Canada, firm-prefixed keys | none: local disk in 5 files |
| `ScanPort` | always clean, one always-refused file | the map's row 66 | none |
| `CanadaSource` | recorded pages | live reader, host allow-list | exists |
| AI launcher | fake launcher | guarded launcher, spend ledger, live switch off | exists |
| `FormFillPort` | fixture forms | the XFA package in a child process | one door file, no fake class |
| `MessagesPort` (platform, P-584 (1)) | platform's fake | email and WhatsApp behind the consent gate | demo table `DemoMessage` |
| `IdentityPort` (platform) | `local` stand-in | Cognito | `x-actor` header, 338 lines in 70 files |
| `EntitlementPort` (platform, PF-15) | allow-all, plus a fixed limit set by the test | PF-15's plans | none |

## 7. What each side needs from the other (all calls through `ports/`, both directions interface-only) [F3, F6]
| From | To | What | When |
|---|---|---|---|
| Platform (PF-3) | case side | `platform_firm`, `module_event`, the firm-scope helper | before any case-side row writes an event or a firm id |
| Platform (PF-4) | case side | the identity join (`actorOf` reads a platform session; `firms.ts` reads platform tables) | before §8 step 1 |
| Platform (PF-15) | case side | `EntitlementPort.check` | before PF-15's limit is switched on |
| Case side | platform | `CaseCountPort`; `case.opened`, `case.closed`, `case.reopened`; the decision/withdrawal row | before PF-15 |
| Case side (FO-8) | front office | `client.created`, `case.opened` | with FO-8 |
| Case side | front office | `PartySearchPort` | before FO-13c |
| Case side | front office | `ClientMergePort` (the case side owns the merge) | before FO-9b hands over a client merge |
| Front office (FO-9b) | case side | `PersonMergePort` (its own half, called inside the case side's merge transaction) | with `ClientMergePort` |
| Front office (FO-9a) | both | the match rules in `ports/matching.ts`; the duplicate result on `prospect.won` | with FO-8 |
| Configurator | front office, case side | `EligibilityPort` (after §2.6's move), `ReleasePort.namesOnly` | before AS-1; names before FO-2 |
| Client money | case side | `ClientMoneyPort` balances and warnings | when the case screen shows them |
| Platform | case side | `MessagesPort`, `AuditPort` (AUD-1) | before real firms |

**One-line hooks into existing case-side files (the written exception, P-584 (9)); each needs the release Lead's OK:** `core.ts` `actorOf` (identity join) and the request-context guard (§2.5); `firms.ts` (reads platform tables); `case-feed.ts` (PF-3's entities line, already approved); `runtime.ts` `createCase` (takes or makes `clientId`; the advisory lock and `EntitlementPort.check`, §3.4); the sending layer's channel registration (FO-11).

## 8. Sizing: walls on the case side, for the 19 Nov count [P-588 (4), F8, F9, F10, F21]
**In plain words.** 48 tables are a firm's; 3 carry a text firm key. 39 of the 48 reach a case by required links (that counts `Case` itself): **38 children** a database default or trigger can fill **[F15]**. The real unknown is making every database call run with the firm set, which the walls need.

**How the database fills the firm id, on P-588 (4)'s conditions:**
1. **A Prisma default on the column, not a required field** **[F10]**: `firmId String @default(dbgenerated("current_setting('app.firm_id')::uuid")) @db.Uuid` on the 38 children and the people chain, so Prisma omits it on create and none of the 38 files must pass it. The column default reads the firm the request set (step 5); where a child's parent is known, a trigger may instead copy the parent's firm. `NOT NULL` set only after the backfill.
2. **Consistency checks on the 24 multi-parent tables** (e.g. `ReviewRoundForm` 7 parents, `CaseTask` 4, `ReviewRoundFiling` 4, `Filing` 3, `CaseParticipant` 2) **[F9]**, because foreign-key checks ignore row-level security: composite foreign keys `(firm_id, parent_id) → (firm_id, id)` on each firm-owned parent (a unique `(firm_id, id)` on each parent), so a child cannot point at another firm's row. One cross-firm test per area file.
3. **Triggers run with the caller's rights** (`SECURITY INVOKER`), never as owner.
4. **The walls test runs with row-level security on under an app role that owns no tables** (today the app connects as `xr_studio`, which also runs migrations and owns the tables, `api/src/core.ts:17`: with that role, policies are bypassed and nothing is proven).
Roots set by code: `case_client`, `Case`, `Party` (`Party` in one file, `runtime.ts`).

| # | Step | What it is | Low | Likely | High | Waits on |
|---|---|---|---|---|---|---|
| 1 | Text firm key → platform firm id | `Case`, `CaseStage`, `FirmCaseCounter` gain the id from `platform_firm` by key (P-559 (4) keeps `sample-firm`, `sample-solo`); three unique rules re-keyed; 11 files reading the key and 7 looking the firm up switch | 2 | 3 | 4 | PF-3, PF-4 |
| 2 | The column on the tables under a case | per area file (`cases`, `answers`, `filings`, `review`, `submission`, `evidence`, `links`): column with the Prisma default, backfill from the case, index, `NOT NULL` after backfill | 4 | 7 | 10 | step 1; Bake tag for the busiest files (P-499) |
| 2a | **Multi-parent consistency (24 tables)** [F9] | `(firm_id, id)` uniques on parents, composite foreign keys on children, `SECURITY INVOKER`, a cross-firm test per area file | 2 | 3 | 4 | step 2, per area file |
| 3 | The people chain | `Party` gets the firm in code (1 file); its **7** dependants by default [F15] | 1 | 2 | 3 | step 1 |
| 4 | The tables of §2.7 | extension tables, preference (platform's), the two exceptions named in the walls test | 1 | 2 | 3 | — (ruled, P-588 (5)) |
| 5 | Every case-side database call runs with the firm set | the firm-scope helper around the database client (`SET LOCAL app.firm_id` in each transaction, as PF-12 does), then fix-ups where code opens its own transactions (162 `$transaction` in 62 files) or uses raw SQL (51 places); (5c) the audit context of §2.5 with its 25 direct writes in 20 files [P-588] | 2 | 5 | 12 | PF-12's pattern; the spike |
| 5b | **Sessions and work without a staff request** [F21 (a), (b)] | link sessions (`/api/link/*` bearer) take the firm from the link's case; extension sessions from the paired staff member (`api/src/core.ts:88-98`); in-process background runs (`ai.ts`, `finder.ts`, `sources.ts`, `demo.ts`, `sample-case.ts`, others) set the firm of the case or job they run for | 1 | 1 | 2 | step 5 |
| 6 | Loaders and Sample data | demo reset, 52 checkpoint step files and Sample cases run as the Sample firm; the reset proven unable to touch another firm | 1 | 3 | 5 | step 1 |
| 7 | The walls themselves | forced row-level policies on the 48 tables; **the write wall on platform-wide tables** [P-588 (1), F21 (c)]; **the app role that owns no tables, in `start.sh`, CI and every test database's set-up** [F21 (d)]; the release-gate test (PF-12's twin) with exactly two named exceptions | 1 | 3 | 5 | steps 2 to 5b |
| | **Total, small merged changes (Hypothesis until the spike)** | | **15** | **29** | **48** | |

**What the 15 / 29 / 48 now includes** (v0 was 12 / 24 / 40): v0's steps 1-7; plus multi-parent consistency (2a: +2 / +3 / +4); plus link and extension sessions and background work (5b: +1 / +1 / +2) and the platform-wide write wall and the app role's set-up (inside step 7: +0 / +1 / +2); the 25 direct audit writes are named inside step 5 (5c), whose range already spans "one central change" to "each file edited", so step 5's range is unchanged. This is the challenge's revised range, kept as P-588 carries it.

**Outside the total, each its own row or counted elsewhere (all Hypothesis):**
| Row | Low | Likely | High | Note |
|---|---|---|---|---|
| **Decision / withdrawal record (`case_decision`, close and reopen, `case.closed` / `case.reopened`)** [P-588 (3), F2] | 1 | 2 | 3 | schema (decision record, status values), route and staff action, events once PF-3 lands, tests; PF-15 waits on it; **new, added to the 19 Nov count** |
| Client on direct open and the backfill [F11] | 1 | 2 | 2 | with FO-8's row or its own |
| Eligibility move (§2.6) and `EligibilityPort` adapter | 2 | 2 | 3 | was "1-2 as a wrapper" in v0; now includes extracting `condition.ts` and `gates.ts` and switching two importers |
| Import-boundary check in CI (§1 rule 4) | 1 | 1 | 2 | after `STANDARDS.md` §1's gate |
| `case_party_index` (trigger-filled) and `PartySearchPort` | 2 | 3 | 4 | was 2-3; the trigger and the hidden-match rule add a little |
| `ClientMergePort` across both records | 2 | 3 | 4 | was 2; one transaction with FO-9b's door |
| `CaseCountPort`, the opening check and the events | 1 | 2 | 2 | after PF-3 and the decision row |
| AS-1's scoring rules | | 8-12 | | P-577's figure, unchanged |
| `FilesPort`, `ScanPort`; AUD-1's trigger and table move; the identity join | | | | the map's rows 65, 66; AUD-1; Lead B's hooks 2 and 3 |

**The spike that decides step 5 (about a day of one lane) [F8].** v0's half-day test would pass whatever the truth (no policies; the app's role owns the tables). Instead, on a scratch copy: a migration adding `firm_id` and `ENABLE` + `FORCE ROW LEVEL SECURITY` on 4 representative tables (`runtime_case`, `case_stage`, `filing`, `party`); a second database role that owns no table, used by the app; `SET LOCAL app.firm_id` in the wrapper; run the case-side suites, plus one link session, one extension session and one in-process background run; report failures by cause. The count of distinct causes, not of failing tests, sets step 5's figure.

**Order that costs least:** steps 1 and 3 with FO-8; the decision row before PF-15; the spike now; step 2 and 2a one area file at a time behind the schema baton, after the Bake's tag; 5b with step 5; steps 6 and 7 last, before the first real firm (P-575 (3)).

## 9. Rulings (all made; nothing open)
| # | Asked in v0 | Ruled (P-588, Lead 42, 10:0x IST 14 Nov) | Where applied |
|---|---|---|---|
| 1 | Pathway configuration platform-wide, read-only to firms | Yes (P-585 (3), X-20), **plus a write wall on the platform-wide tables** | §1 rule 1; §8 step 7 |
| 2 | Client a new case-side record, people per case | Yes, **with changes**: stores the front office's person or company id; a directly opened case also gets a client, so `clientId` is never unfilled; the client's kind comes from `Combination.clientType` (SA-3-4) | §5; §3.3; §3.4 |
| 3 | "Active" for the count | **SA-3-47** (creation to decision or withdrawal); individual vs corporate is **SA-3-4**; decision/withdrawal row sized in the 19 Nov count; limit checked inside the case-open transaction | §3.4; §8 (outside-total table) |
| 4 | Firm id filled by the database | Yes, on conditions: Prisma default (not required), consistency on the 24 multi-parent tables, triggers with the caller's rights, walls test under an app role that owns no tables | §8 conditions 1-4; steps 2a, 7 |
| 5 | The six tables | The desk's split accepted; the two rate-limit tables are the walls test's only named exceptions | §2.7 |
| 6 | Extra events | Add `case.closed`, `case.reopened`, `client.merged` now; hold `filing.ready` | §4 |
| also | `EligibilityPort` cycle | port and AS-1's scores and grid breakdown re-placed in a neutral ports folder | §1 rule 3 (`prototype/studio/ports/`); §2.6 |
| also | 25 direct audit writes in 19 files | counted in the sizing | §2.5 touch list; §8 step 5c (desk counts 20 files, see §0 fact 4) |
| also | Client merge owner | one owner across the person and client records: the case side, called by the front office | §2.2; §3.3 |

## 10. What is unverified
* The firm-owned / platform-wide split of the 104 tables is the inventory's reading of fields; §2.7's owners are the desk's proposal under P-588 (5) (`PersonPreference` to platform identity is new in v0.1: the Lead confirms with Lead B).
* §2.6: only import lines were read; that the moved code reaches no `engine/runtime/` file through a function body is proven by the move row's boundary check, not here. That `runtime_next_case_number` locks the counter row: its body was not read (so §3.4 uses an advisory lock).
* The 25 direct audit writes: the desk's grep at `f1d0d403e` finds 20 files (the challenge said 19); same 25 lines.
* SA-03 line numbers (376, 386, 585) are the challenge's citations from the name-free copy; the desk did not re-open SA-03.
* All sizes are estimates in small merged changes (Hypothesis until the spike); none is measured.
* Whether `dependency-cruiser` passes `STANDARDS.md` §1's gate: not checked.

## 11. Findings disposition (the fresh challenge, 0 Blocker, 14 Major, 9 Minor)
| ID | Sev. | Disposition | What changed (or why not) |
|---|---|---|---|
| F1 | Major | Applied | Count by `Combination.clientType` (SA-3-4, SA-1-60); `client_type` on `case.opened`, `case.closed`, `case.reopened`; client kind not used for counting (§3.4, §4, §5) |
| F2 | Major | Applied (P-588 (3)) | "Active" = SA-3-47, cited; decision/withdrawal row named and sized 1 / 2 / 3, added to the count (§3.4, §8) |
| F3 | Major | Applied | `createCase` takes a per-firm advisory lock and calls `EntitlementPort.check` inside its transaction before the case number; 409; in §7 and the hooks list (§3.4, §7) |
| F4 | Major | Applied (P-588 "also") | Pure rules move to `engine/eligibility/` (configurator) with `condition.ts` and `gates.ts` extracted so it never reaches `engine/runtime/`; adapter in the configurator; case delivery calls the port; boundary checked (§2.6) |
| F5 | Major | Applied | `scores?` with grid lines and `source_ref`, `persons[]`, outcome codes named from `case-check-words.ts` (§3.2); types in `ports/` |
| F6 | Major | Applied | Neutral folder `prototype/studio/ports/` (interfaces, fakes, event types, shared match rules), imports only `zod`; import-boundary check in CI; duplicate result on `prospect.won` preferred over a call back (§1 rules 3-4, §3.1, §4, §7). Placed at studio level, not `api/src/ports/` as the challenge suggested, so the engine and web can use it without importing the API |
| F7 | Major | Applied | `AsyncLocalStorage` request context; `case_id` by parameter or derived; the 25 direct writes listed (20 files); "no call site changes" replaced (§2.5); counted in step 5c per P-588 |
| F8 | Major | Applied | Spike with walls actually on, a non-owner role, link/extension/background runs; about a day (§8) |
| F9 | Major | Applied (P-588 (4)) | Composite foreign keys on the 24 multi-parent tables; `SECURITY INVOKER`; step 2a +2 / +3 / +4 (§8) |
| F10 | Major | Applied (P-588 (4)) | Prisma `@default(dbgenerated(...))` declaration, `NOT NULL` after backfill (§8 condition 1) |
| F11 | Major | Applied (P-588 (2)) | `createCase` makes or picks a client; `prospect_id` nullable; backfill kind from `clientType`, company clients for employer cases; sized 1 / 2 / 2 (§5, §4, §8) |
| F12 | Major | Applied | `case_party_index` filled by trigger, walls from day one, visibility in the port, dependencies named (§3.1) |
| F13 | Major | Applied (P-588 (2), "also") | `fo_person_id` / `fo_company_id` on `case_client`; one merge transaction owned by the case side calling FO-9b's person-merge door; both events together; undo mirrors; `person.merged` listener dropped (§3.3) |
| F14 | Minor | Applied | Every table owned; §2.2 and §2.7 consistent; `PersonPreference` to platform identity (to confirm with Lead B) |
| F15 | Minor | Applied | 38 children; people chain 7 dependants; `Party` made in one file (§0, §8) |
| F16 | Minor | Applied | `reach` refusal and absent audit trigger moved to facts (§0 fact 8, fact 4) |
| F17 | Minor | Applied | `signing.completed` points to Lead B §7 §2.3-§2.4 (§4) |
| F18 | Minor | Applied | Hidden matches block `NO_CONFLICT` until an owner or admin confirms (§3.1) |
| F19 | Minor | Applied | Re-cited P-571 (2) and P-575 (3) (§1 rule 5) |
| F20 | Minor | Applied | P-585 read; ruling 1 is a citation (§1 rule 1, §9) |
| F21 | Major | Applied | (a), (b) step 5b; (c) write wall in step 7 (P-588 (1)); (d) app role set-up in step 7 (§8) |
| F22 | Minor | Applied | `CaseSummaryPort` accepts the front office's ids (§3.5) |
| F23 | Minor | Applied | `client_type`, nullable `prospect_id`, envelope `version` (§4) |
| recount | — | Applied, one not taken | Firm look-ups now 13 lines in 7 files. Not taken: none of the 9 Minors is rejected; the one deviation is F6's folder location (studio level instead of `api/src/`), reason given above |

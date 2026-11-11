# S4 · Release and pin contract (SH4, with L-SA13): concept

A concept for the tech lead and the founder (as SA-01B product owner, P-316). No code is changed by this document. Read on origin/main `fbfb263c7`, 11 Nov 2026. Paths are under `ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/` unless they start with `product/` or `domain/`.

> **Analyst's note (master analysis, 11 Nov):** drafted by a read-only reader at my brief, checked by me against the code. Two findings are confirmed:
> * **Pins are per case and combination, never per filing or person:** `pack_work_pin` is unique on `[caseId, combinationId, revision]` (`prisma/schema.prisma:1392`).
> * **The stage key blocks repeatable stages:** `CaseStage @@unique([caseId, combinationId])` (`schema.prisma:1459`), and `engine/runtime/stages.ts:36` refuses a repeat: "repeatable stages are not built".
>
> So U1 ("upgrade": the family's next application) needs S4 first. **One tension with S1 (`07a`):** S1 freezes fees into each release, but SA-1B-251 reads fees at the date IRCC receives the application. They fit together if every dated fee row is frozen into the release for proof, and the case reads the row in force on its filing date (card 252, M5 row D1 in `07` §8). That rule is the founder's and the immigration expert's to confirm (Q2 below). **Status: contract for agreement, not started** (Lead 16, 11 Nov). It needs the schema baton.

**Built from:**
* P-258 (SH4: "the release and pin-per-filing contract together with L-SA13"; "release pins sit in four or more files");
* P-246 (2) (the case pin moves to the filing when ADOPT is built);
* P-316 (2) ("each filing is pinned to its release (SH4)");
* P-412 F10 (C9.5: the whole case moves now, refused once a filing is recorded; per-filing pins come with SH4);
* P-412 F13 (stages are a route list of combinations);
* P-65 (a changed fact marks signed, uploaded or submitted items stale and never changes them);
* P-406 (C9.5, C6.17, C7.8 in M3);
* P-240 (Demo release: marked, never counted as a real publish);
* BACKLOG SH4 (`:95`) and L-SA13 (`:335`) on `lead/2026-11-07-lead31`;
* master plan part 7 §2 (S4), §3 (U1, U2); part 4 §4 (U1-U5).

**The team's requirements, quoted (name-free copy, read-only):**
* **Dev hand-over** `domain/requirements-2026-11-02/02-functional-requirements/super-admin/DEV-HANDOVER_2026-10-18.md:224`: "One rules-version pin per filing and per person … 'Use newer rules' moves the whole filing."
* **Glossary** `shared/99-Phasing-and-Glossary_v2.25_2026-10-25.md:73`: "A client's work stays on the pack version in force when it started; moving it to newer rules is an explicit, audited adoption by firm staff, with a required reason."
* **AG-07**, `agent/AG-07-case-core-and-delivery_v3.12_2026-10-28.md`:
  * `:2133`: Start next stage; "The later filing reads the same person's answers; nothing is copied".
  * `:2135`: "The filing has no rules-version column. Its version is the version of its people's pins. A person on two filings has one pin on each."
  * AG-7-56 `:2182-2200`: rules 1-9; BR-21; "Nothing moves back".
* **SA-01B v2.1**, `super-admin/SA-01B-content-pack-configurator_v2.1_2026-10-27.md`:
  * SA-1B-250 `:4348-4378`: a filing reads one version; Start next stage takes the version current when pressed; a filing added later takes the principal filing's version.
  * SA-1B-251 `:4380`: one time rule. Structure is pinned. Fees, document validity and form editions are read at their own dates.
  * SA-1B-254 `:4542`: "What changes for this case"; forward only; a refused move names its reason.
  * SA-1B-255 `:4473`: corrections reach open filings without a click.

---

## 1. Purpose and callers

**Purpose.** Answer one question in one place: **"which frozen release applies here?"** Here can be a filing, a person on a filing, or a stage. Then record every change to that answer as an explicit, audited, forward-only step. Today the answer is a case-level pin chain, read and re-checked in many files (section 2). The contract makes a pin per filing and per person (P-316 (2), AG-7-56), keeps today's behaviour as its first policy (the whole case moves, P-412 F10), and gives the M4, M5 and M6 callers one door.

| Caller | What it needs from S4 | Today |
|---|---|---|
| **S1 library rule tables** (fees, box gates, script requirements, form roles, own Yes/No wording, fact expiry, review items) | each table version a combination reads is **frozen into the release and covered by its hash**, so a pin fixes it | 7+ JSON files in `samples/` read live, outside any release (§2, D7) |
| **Open a case** (C6.x), **import** (AG-7-56 r8) | first pin: the newest startable release, for each filing and person | `api/src/runtime.ts:261`, `:296` |
| **U1 routes and stages** (C6.17; repeatable stages; "Start next stage" in Needs you) | a stage pins the release current when it starts; a combination may repeat on a route | `api/src/case-stages.ts:63`, `:209-225`; repeats refused (`engine/runtime/stages.ts:36`) |
| **U2 linked case** (AG-07 `:346`, `:358`; Change stream) | a new case pins the current release; the link records the earlier case's release for history only | not built |
| **C9.5 Use newer rules** (B145) | preview "what changes for this case", then adopt with a reason; per filing later (SH4) | `api/src/release-update.ts:140-188`, `api/src/release-context.ts:51-60` |
| **C7.8 added forms** | an added form is frozen with its own hash and is part of the filing's answer | `api/src/form-additions.ts:216-230`, joined at `api/src/runtime.ts:159-163` |
| **Readers** (prepare, checklist, fill, assessments, readiness, review rounds, sign steps, documents) | `releaseFor(scope)` returning the frozen snapshot and its ref; one stale check under the lock | `c.pins[0]` in 10 files (§2, D4) |
| **Counts** (where-used, edition "kept by", change sets) | open pins per release, real and Demo apart | 3 separate queries (§2, D5) |
| **M6 extension** (E3 "Fill this screen") | the pinned release and the map version of a form, for one filing and person, with the hash verified | none |

**Not in S4:** the content of S1 tables, a correction overlay (SA-1B-255), withdrawn versions (SA-1B-257), the filing values service (S3). The contract leaves room for each (§8).

---

## 2. Today: every place that decides "which release applies"

### 2.1 How a release is made and frozen

* **Rows.** `ConfigRelease` is one frozen row per combination and version (`prisma/schema.prisma:1114-1138`, `@@unique([combinationId, version])`). `PackVersion` is the whole-pack number it was released in (`:1143-1156`).
* **Writing.**
  * The one release path is `api/src/studio.ts:1195-1210` (`newPackVersion`, `publishRow`). It builds the snapshot with `buildSnapshot(…, "draft")` and stores `snapshot` and `sha256`.
  * It marks the previous release `SUPERSEDED`. That is the only update to a release row (`:1206`).
  * The demo loader writes one release directly (`api/src/demo.ts:197`).
* **Hash.**
  * `sha256(canonical(content(...)))` over the snapshot without `row_versions` and `mode`.
  * The expression is written twice: `engine/snapshot.ts:86-89` (`snapshotHash`) and `engine/snapshot.ts:255-259` (`buildSnapshot`).
* **Frozen?**
  * Pins are guarded in SQL: no update (`prisma/migrations/20261023233000_runtime_r1_fix/migration.sql:30-32`), no delete (`…20261107220000_c95_pin_guards`).
  * `config_release` has **no** SQL guard. "Released means frozen" is a code convention.
* **Demo.**
  * Not stored. It is worked out on every read from the workspace key and the snapshot's content: `isDemoWorkspace() && isDemoSnapshot(snapshot)`.
  * This is written in 5 places: `api/src/answer-key-gate.ts:18`, `:37`; `api/src/studio.ts:445`, `:1240`; `api/src/release-context.ts:59`.

### 2.2 Where a case records its release

* **`PackWorkPin`** (`prisma/schema.prisma:1370-1393`).
  * One chain per **case and combination**: `@@unique([caseId, combinationId, revision])` (`:1392`).
  * `partyId` is always the principal's party. It is written at `api/src/runtime.ts:296` and copied at `api/src/release-update.ts:167` and `api/src/case-stages.ts:212,225`.
  * `purpose` defaults to `"SQR_ADVANCE"` (`:1379`), where the team asks for a "case delivery" purpose (SA-1B-250 field 3).
* **SQL trigger `runtime_pin_chain`** (`…20261107180000_c95_pin_revisions`, replaced in `…20261107220000_c95_pin_guards`). It checks five things:
  * the pin's release belongs to the pin's combination;
  * the pin's combination is the case's combination;
  * the hash equals the release's;
  * revision = previous + 1, and the version is strictly higher;
  * a reason of 3 or more non-space characters.
* **No `Filing`, `FilingApplicant` or `CaseStage` row holds a release.**
  * `Filing` holds `combinationKey` copied from the case (`schema.prisma:1869`; `api/src/case-prepare.ts:230`).
  * `CaseStage` holds `combinationId` and a frozen route `spec` (`:1436`), but no pin.
* **Rows that remember the release they were made on:**
  * `FormInstance.configReleaseId` (`:1669`);
  * `Assessment.configReleaseId` (`:2039`);
  * `FilingFormAddition.frozen` + `frozenSha256` (`:2703-2718`), a C7.8 form frozen from the **library**, not from a release;
  * `SubmissionGroup.recordedFees` (`:1845`), fees frozen at "Record the submission", because fees are not in a release.

### 2.3 The deciders (file:line)

| # | Decision | Where | How |
|---|---|---|---|
| 1 | Release a new case opens on | `api/src/runtime.ts:261`, startable check `:265`, pin `:296` | newest by combination version |
| 2 | Release a case reads | `api/src/runtime.ts:77` (REACHED, pins newest first), `:89-98` (`pinned()`: keep the current combination's pins, check the chain and each stored hash), `:165` `releaseSnapshotOf` = `pins[0]` | the newest revision of the current stage's combination |
| 3 | Release a case reads, joined with added forms | `api/src/runtime.ts:159-163` (`withAdditions`) | the release plus C7.8 frozen forms |
| 4 | Release the next stage starts on | `api/src/case-stages.ts:63` (preview), `:209` (re-read under lock), `:224` (case combination switched first, for the trigger), `:225` (pin) | newest by version at start (matches SA-1B-250 r2) |
| 5 | Release a case may move to | `api/src/release-context.ts:51-60` → `engine/runtime/release-update.ts:248-250` (`targetOf`); re-check `api/src/release-update.ts:160-161` | the newest higher version only (SA-1B-254 r1 allows any eligible one) |
| 6 | The move itself | `api/src/release-update.ts:167` (one pin, the principal's party), `:171-174` (added forms the new release holds are removed), `:176-178` (audit in the same transaction) | the whole case (P-412 F10) |
| 7 | Move refused | `api/src/release-update.ts:125-133` → `engine/runtime/release-update.ts:216-219` | recorded filing, fill running, type mismatch |
| 8 | Release an added form is frozen from | `api/src/form-additions.ts:79-80` (library's newest edition), `:114` (release holds it → refused), `:216-230` (frozen + own hash) | the library at the moment it is added |
| 9 | "Did the pin move since you read?" | `api/src/stage-scope.ts:15-19` (`newestPin`), used by `readiness.ts:93`, `fill-case.ts:331`, `review-rounds.ts:151`, `release-update.ts:160`; own queries in `case-prepare.ts:917-925` and `case-stages.ts:212`; own 409 words in `readiness.ts:59-60,94`, `fill-case.ts:332`, `review-rounds.ts:152` | 7 copies of one check |
| 10 | Which earlier releases count for a case's copies and runs | `api/src/release-context.ts:73` (`pinReleases`); `case-prepare.ts:316-319, 546-555, 570-574`; `assessments.ts:65, 75, 96, 143, 173, 177`; `fill-case.ts:201, 367-375, 403` | the current stage's pin chain |
| 11 | Open cases per release | `api/src/where-used.ts:239-256` (current combination filtered in code, newest revision by overwrite); `api/src/form-library.ts:494` (raw SQL, newest revision in SQL); `api/src/sample-validated.ts:83-84` (every revision of the current combination); `api/src/change-sets.ts:167` (through where-used) | 3 ways |
| 12 | Hash re-check of the snapshot itself | `api/src/case-prepare.ts:162` only | everywhere else compares two stored strings (`runtime.ts:93`) |
| 13 | Is it a Demo release | 5 places in §2.1 | derived per read, never on a pin |
| 14 | Newest release on the studio side | `eligibility.ts:46`, `fill.ts:82`, `workspace.ts:97,165`, `studio.ts:468,492,504,1026,1044,1204`, `programs.ts:131`, `runtime.ts:352,372`, `answer-key-gate.ts:85`, `person-checklist.ts:37` | version desc, except `person-checklist.ts:37` (`releasedAt` desc) |
| 15 | Values a release should fix but does not | fees: `engine/runtime/filings.ts:22`, `engine/runtime/case-checklist.ts:21`, `engine/filing-modes.ts:31`, `engine/source-register.ts:66` ("until R2 S7a puts fees in the release"); `api/src/release-update.ts:23` ("Fees are not part of a release yet"); box gates `engine/form-field-condition.ts`; script requirements `engine/runtime/mandatory.ts`; form roles `engine/form-completeness.ts`; person roles `engine/runtime/filings.ts`; fact expiry `engine/runtime/earlier-facts.ts`; filing numbers `engine/runtime/filing-record.ts`; review items `api/src/review-items.ts:14-19` (takes `release` and ignores it) | live JSON in `samples/` |
| 16 | Route a case follows | `api/src/runtime.ts:276` (`routesOf`, live `Route` table); frozen into `CaseStage.spec` at opening | not part of any release or hash |

### 2.4 Duplications and inconsistencies (evidence)

* **D1. The pin is per case, not per filing or person.**
  * Every pin carries the principal's `partyId` (`runtime.ts:296`, copied at `release-update.ts:167`, `case-stages.ts:225`).
  * Requirement: "one rules version record per person on each filing" (AG-7-56 BR-21, `:2199`). P-316 (2) says build it.
* **D2. The pin is keyed by combination, so a combination cannot repeat on a route (U1).**
  * `CaseStage @@unique([caseId, combinationId])` (`schema.prisma:1460`).
  * Pin chain `@@unique([caseId, combinationId, revision])` (`:1392`).
  * The trigger needs pin combination = case combination.
  * A repeated stage would continue the earlier stage's chain, and "forward only" would refuse the same release. `engine/runtime/stages.ts:36` refuses repeats for this reason.
* **D3. Two numbers are called "release".**
  * The label shows the **pack** version (`contracts/runtime.ts:339`, `releaseLabel`).
  * Forward-only, targets and the trigger use the **combination** version (`release-context.ts:52`, trigger).
  * A case can show "Release 7 → Release 9" while its row versions are 2 → 3. Correct, but nowhere written down.
* **D4. One stale check, seven copies** (row 9). Each 409 is worded on its own.
* **D5. Open-case counts three ways** (row 11).
  * `sample-validated.ts:84` keeps every revision.
  * The others keep the newest.
* **D6. Hash checks differ.**
  * `reach` compares `pin.contentHash` with `release.sha256` (both stored).
  * Only Prepare recomputes the snapshot hash (`case-prepare.ts:162`).
  * `config_release` has no SQL guard, so an edited snapshot is caught only on Prepare.
  * The hash expression is written twice (`engine/snapshot.ts:86-89`, `:255-259`).
* **D7. A pin does not fix the S1 tables** (row 15).
  * A fee, gate, role or expiry change reaches every open case at once, without adoption.
  * B152 had to freeze fees at record time (`schema.prisma:1845`) to protect what was filed.
* **D8. Demo is derived, not recorded** (row 13).
  * A pin cannot say it is on a Demo release.
  * The case screens show "Demo" only on the move panel's target (`release-update.ts:104`).
  * Counts do not split real from Demo.
* **D9. Added forms are a second freeze path** (row 8).
  * They are frozen from the library with their own hash, outside the release.
  * A later adopt removes them when the new release holds the form (`release-update.ts:171-174`). That is correct, but it is a rule only C9.5 knows.
* **D10. "Newest" has two orders.** `person-checklist.ts:37` uses `releasedAt`; every other place uses `version`.

---

## 3. The contract

Proposed file: `contracts/release-pin.ts`. It holds types and constants only, with no database, vendor or country value (as `contracts/resolver.ts`). Pure rules go in `engine/release-pin.ts`. The one service is `api/src/release-pins.ts`. Contract tests go in `tests/check_sh4_release_pin.ts`.

```ts
/** A frozen release, as every caller names it. Never built by a caller: only ReleasePins returns one. */
export type ReleaseRef = {
  release_id: string;            // config_release.id
  combination: string;           // combination key, e.g. "vv.single"
  release: number;               // the number people see: pack version ("Release 7"), D3
  version: number;               // the combination's own row version: the forward-only order, D3
  hash: string;                  // sha256 of the snapshot (every S1 table included, rule 8)
  demo: boolean;                 // P-240: recorded at release time, never worked out again
  released_at: string;           // ISO
};

/** Where a pin applies. A filing pin is the filing's version; each person on the filing has a person pin on that same
 *  release (AG-7-56 BR-21). A stage pin is the release the stage started on (SA-1B-250 r2). */
export type PinScope =
  | { kind: "stage"; case_id: string; stage_id: string }
  | { kind: "filing"; case_id: string; filing_id: string }
  | { kind: "person"; case_id: string; filing_id: string; subject_id: string };

export type PinReason =
  | { kind: "opened" }                       // new case, import, linked case (U2)
  | { kind: "stage_started"; from_stage: string | null }
  | { kind: "filing_added"; principal_filing: string } // AG-7-56 r3
  | { kind: "adopted"; words: string };      // ≥3 non-space characters (trigger today)

/** One revision of a pin. Insert-only; never updated, never deleted except with its case. */
export type Pin = {
  scope: PinScope;
  ref: ReleaseRef;
  revision: number;              // 1…n per scope, forward only
  pinned_at: string;
  reason: PinReason;
  by: string;                    // actor id (a person, never "system")
  adoption_id: string | null;    // the adoption that wrote it: the pins one click wrote share it
};

/** What a reader gets: the release that applies and its frozen content, already verified. */
export type Applicable = {
  ref: ReleaseRef;
  revision: number;              // the stale-check token (replaces pin_revision)
  snapshot: unknown;             // the release snapshot, hash recomputed on first read (D6)
  added_forms: { form: string; subject: string; frozen_hash: string }[]; // C7.8, joined for filing/person scopes
  history: Pin[];                // newest first: where earlier copies and runs were made
};

/** What one click would change (SA-1B-254 r2), computed without writing. */
export type WhatChanges = {
  from: ReleaseRef; to: ReleaseRef; scope: PinScope[];   // every pin the click moves
  forms: unknown[]; documents: unknown[]; questions: unknown[]; eligibility: unknown[]; money: unknown[];
  effects: { fill_again: number; filed_another_way: number; no_longer_required: number; withdrawn: number; kept_out_of_date: number };
  refused: { code: "recorded" | "fill_running" | "type_mismatch" | "demo_target" | "not_forward"; reason: string; item?: string } | null;
};

export type AdoptPolicy = "whole_case" | "per_filing";   // P-412 F10: "whole_case" until the founder switches it
```

**Operations** (`ReleasePins`; every write runs under the case's row lock, inside the caller's transaction where one is given):

| Operation | Does | Refuses (409 unless said) |
|---|---|---|
| `releaseFor(scope): Applicable` | the newest pin of the scope, its release verified (chain, stored hash, recomputed hash once per release per process), with added forms joined for filing and person scopes | chain broken or hash differs (500 "pin does not match its release", as `runtime.ts:93`) |
| `startingRelease(combination, at?): ReleaseRef` | the newest **startable** release of a combination: real only, or Demo in the demo workspace (rule 2) | none released; retired; not startable |
| `pin(scope, ref, reason, by)` | the first pin of a scope (revision 1). Opening a stage writes the stage pin, one filing pin per filing and one person pin per applicant | a scope already pinned; a Demo ref outside the demo workspace |
| `targets(scope): ReleaseRef[]` | releases the scope may move to: same combination, higher version, real unless the case is a Demo case, newest first (SA-1B-254 r1: not only the newest) | none |
| `whatChanges(scope, to): WhatChanges` | the difference and its effects, read only (today `ReleaseUpdates.compute`) | none (the refusal is a field) |
| `adopt({ scope, to, from_revision, reason, by })` | under the lock: re-check `from_revision` and the target, re-run the refusal. Write one new revision for **every pin the policy moves**: whole case = every filing and person pin of the current stage plus the stage pin; per filing = that filing and its people. Replace added forms the target holds. Write one audit line. All in one transaction. Returns the counts and words | stale revision; refused (`WhatChanges.refused`); reason under 3 characters (400) |
| `checkCurrent(tx, scope, revision)` | the one stale check (replaces the 7 copies, D4), one sentence for all 409s | moved since read |
| `history(scope): Pin[]` | every revision, newest first, with reasons and actors | none |
| `openPins({ combination?, release? })` | open cases per release on their newest revision, `{ real, demo }` apart (replaces D5's 3 queries) | none |

**"What changes for this case"** stays the C9.5 panel. The contract makes it a function of the scope, not of the case, so per-filing adoption is one policy switch, not a new screen.

---

## 4. Rules (numbered, testable)

1. **One pin per filing and per person.**
   * Each filing has one pin chain.
   * Each person on a filing has one person pin chain, always on the filing's release.
   * A person on two filings has one pin on each (AG-7-56 BR-21, `:2135`).
   * *Test:* a family case of 3 people on 2 filings has 2 filing pins and 3 person pins. Writing a person pin on another release than its filing is refused.
2. **First pin = the newest startable release now.**
   * Applies to a new case, an imported case, a linked case (U2) and a stage.
   * A filing added later in the same stage takes the **principal's filing's** release, not the newest (AG-7-56 r3).
   * *Test:* release 3 current, 4 published, no one adopted → a filing added now pins 3.
3. **A stage pins the release current when it starts** (SA-1B-250 r2).
   * The ended stage's pins never move again.
   * A combination may repeat on a route: pins are keyed by stage, not by combination.
   * *Test:* stage 1 on release 3; release 4 out; Start next stage → stage 2 on 4, stage 1 still 3. A route `A → B → A` loads, and its two A stages have separate chains.
4. **Adoption is explicit.**
   * Only a person with the adopt duty can adopt.
   * The adoption needs a reason of 3 or more non-space characters.
   * The move is forward only, within the same combination, and is never automatic or scheduled.
   * The click writes one audit line in the same transaction, naming from and to (release and revision), the scope and the counts. It never holds answer values (STANDARDS §5).
   * *Test:* no reason → 400 and nothing written; a lower version → refused; a write without an audit line is impossible (same transaction).
5. **One click moves its whole scope together.**
   * Policy `whole_case` (today, P-412 F10): every filing and person pin of the current stage moves, under one `adoption_id`.
   * Policy `per_filing` (SH4, founder's switch): one filing and its people move, and other filings stay.
   * *Test:* 2 filings, per_filing → only the chosen filing's pins get revision n+1.
6. **Signed or submitted items never change** (P-65; SA-1B-254 r6, SA-1B-255 r5).
   * A move is refused while any filing it covers is recorded as submitted.
   * A finished item (validated copy, signed scan, form entered in the portal, upload) is marked "out of date, not changed". It is never rewritten.
   * A form copy keeps the release it was filled on (`configReleaseId`).
   * Recorded fees stay as recorded.
   * *Test:* recorded filing → 409 `recorded`; a validated copy's bytes and hash are equal before and after a move.
7. **A Demo release is marked and never counted as real** (P-240).
   * `demo` is written once, when the release is made, and copied into every `ReleaseRef`.
   * Outside the demo workspace no Demo release exists and no Demo pin can be written.
   * A real case never adopts a Demo release.
   * `openPins` and every count report real and Demo apart.
   * The case header shows "Demo release" while a scope is on one.
   * *Test:* demo workspace, Sample release → `ref.demo = true` and counted under `demo`. Adopting a Demo release from a real release → 409 `demo_target`.
8. **The release hash covers every S1 table.**
   * Each S1 table version a combination reads is copied into the snapshot (fees, box gates, script requirements, form roles, own Yes/No wording, fact expiry, review items, and the route's stage list for a staged combination).
   * One function computes the hash (D6), so a change to any of them is a new release.
   * Dated rows keep their in-force dates inside the frozen table; which row applies on a date is SA-1B-251's rule (see §8 Q2).
   * *Test:* change one fee row → the draft shows "changed since release", and the new release's hash differs. A pinned case reads the old fee until adoption (or by Q2's exception, if the founder chooses it).
9. **Frozen means frozen.**
   * A release's snapshot, hash and `demo` never change. An SQL trigger refuses any update except the status mark.
   * Pins are insert-only and never deleted except with their case (already in SQL).
   * `releaseFor` recomputes the hash once per release per process. A mismatch is refused, never read.
   * *Test:* `UPDATE config_release SET snapshot = …` → refused. A hand-edited snapshot (trigger disabled in the test) → `releaseFor` refuses.
10. **One door.**
    * No file outside `api/src/release-pins.ts` and the migrations reads `pack_work_pin` or picks a case's release from `config_release`.
    * *Test:* a grep check in CI over `api/src` and `engine` (the allow-list is the service and the studio's release path).
11. **Added forms (C7.8) are part of the filing's answer.**
    * `releaseFor(filing | person)` includes them with their frozen hash.
    * An adoption that brings a release holding the same form removes the addition, with the reason naming the release (today's rule, `release-update.ts:171-174`).
    * *Test:* add IMM 5476 by hand; adopt a release that holds it → one line, not two, and the addition is marked removed.
12. **A linked case (U2) never inherits a release.**
    * It pins by rule 2.
    * The link stores the earlier case's `ReleaseRef` for history only.
    * *Test:* earlier case on 3, release 4 current → the linked case is on 4, and the earlier case is still on 3.
13. **The extension (M6) reads only through `releaseFor`.**
    * It gets the person's pinned release and the form's map version, and it refuses when the hash does not verify.
    * *Test:* the extension's "Fill this screen" on a case moved to release 4 reads release 4's map, and a stale revision → 409.

---

## 5. Migration path

Expand, then move callers, then contract the old reads. Every step is green on its own. No pack or snapshot content changes: "packs unchanged" (part 7 §2).

* **Step A: the contract and the service over today's table. No schema change.**
  * Write `contracts/release-pin.ts`, `engine/release-pin.ts` and `api/src/release-pins.ts`. The service implements `releaseFor({kind: "stage"})`, `checkCurrent`, `targets`, `whatChanges`, `adopt` (`whole_case`), `history` and `openPins` on `pack_work_pin` as it is.
  * Callers move first in this order. Each is a small diff with today's tests unchanged:
    1. `stage-scope.ts` `newestPin` and the 2 own queries (`case-prepare.ts:917-925`, `case-stages.ts:212`) → `checkCurrent`. The 7 copies of D4 go to 1.
    2. `runtime.ts` `pinned()`, `releaseSnapshotOf`, `snapshotOf` → `releaseFor`. The 10 `pins[0]` readers follow, file by file.
    3. Counts (`where-used.ts`, `form-library.ts:494`, `sample-validated.ts:83`) → `openPins` (D5).
    4. Pin writes (`runtime.ts:296`, `case-stages.ts:225`, `release-update.ts:167`) → `pin` and `adopt`.
    5. Demo derivation → one function, `demoOf(release)`, still derived until step B (D8).
    6. Hash → one function (D6).
* **Step B: schema (needs the schema baton, `prisma/schema.prisma`; expand only).**
  * `pack_work_pin` gets `scope` (`STAGE · FILING · PERSON`), `stage_id`, `filing_id`, `subject_id` (nullable) and `adoption_id`. The unique key becomes `(case_id, scope, stage_id, filing_id, subject_id, revision)`.
  * The trigger checks the chain per scope, keeps forward only, the reason and the hash, and checks that a person pin equals its filing pin's release.
  * `purpose` gets `CASE_DELIVERY` for new rows.
  * `config_release` gets `demo boolean`, filled once from today's derivation, plus an update guard that allows only the status mark.
  * `CaseStage @@unique([caseId, combinationId])` is dropped for `(caseId, ord)` only. That lets a combination repeat (U1).
  * Backfill:
    * each existing chain becomes the stage pins of the stage with that combination;
    * for each revision, one filing pin per filing and one person pin per `FilingApplicant`, with the same release, actor, time and reason;
    * the same `adoption_id` per revision.
  * The rollback is written in the migration header, as `c95_pin_revisions` does.
* **Step C: S1 tables in the snapshot.** This happens inside S1's row, not S4's. When fees move to the library table service, `buildSnapshot` copies the table version in and the one hash covers it. Each later S1 table follows as a data migration (part 7 §2 S1 exit).
* **Step D: policies the founder switches.** `per_filing` adoption (Q1), U1 repeatable stages, U2 linked case, and M6's reader all use the service. None of them adds a pin read of its own.

---

## 6. Contract tests (`tests/check_sh4_release_pin.ts`; pass and fail per rule)

| # | Pass | Fail (must be refused, nothing written) |
|---|---|---|
| T1 (r1) | 3 people, 2 filings → 2 filing pins, 3 person pins, same release | a person pin on another release than its filing |
| T2 (r2) | new case pins the newest startable release; a filing added later pins the principal filing's release | a case opened on a not-startable or retired combination |
| T3 (r3) | Start next stage pins the release current at the click; the ended stage's pins unchanged; route A → B → A keeps two chains | writing a pin on an ended stage |
| T4 (r4) | adopt with reason "Adopting the current rules" → revision n+1, one audit line, same transaction | no reason (400); reason "  a " (white space); a lower version; a stale `from_revision`; a client actor (403) |
| T5 (r5) | `whole_case` moves every pin of the current stage under one `adoption_id`; `per_filing` moves one filing and its people | `per_filing` leaving a person of that filing behind |
| T6 (r6) | a validated copy, signed scan and recorded fees unchanged by a move; finished items counted `kept_out_of_date` | a move with a recorded filing in scope → 409 `recorded`; a move while a fill runs → 409 `fill_running` |
| T7 (r7) | demo workspace + Sample → `demo: true`, counted under `demo`, header says "Demo release" | a Demo pin outside the demo workspace; a real case adopting a Demo release → 409 `demo_target` |
| T8 (r8) | a fee row change makes a new hash; a pinned case keeps its fee table | two code paths giving two hashes for one snapshot |
| T9 (r9) | `releaseFor` on an untouched release reads | `UPDATE config_release` on snapshot, hash or demo; a pin update or delete; a hand-edited snapshot read |
| T10 (r10) | grep finds `packWorkPin` / "newest release of a case" only in the service | any other file reading them |
| T11 (r11) | an added form the new release holds is replaced, one line | two lines for one form after a move |
| T12 (r12) | a linked case pins the current release; the earlier case keeps its own | the linked case inheriting the earlier pin |
| T13 (r13) | the extension's read names release and map version | a read with a stale revision (409) or a hash mismatch |
| T14 (equivalence) | before step B, every existing C9.5 and C6.17 check is green unchanged (`check_c95_release_update.ts`, `check_c617_stages.ts`, `check_c617_stages_migration.ts`, the browser ones) | any of them changed to pass |

---

## 7. Rows, order, sizes; baton

| Row | What | Area | Sessions | Baton | Depends on |
|---|---|---|---|---|---|
| **SH4a** | contract + engine rules + service over today's table; callers move (step A); T4-T7 (whole_case), T9 (read side), T10, T11, T14 | runtime | 1 | none: `runtime.ts`, `case-prepare.ts` and `case-stages.ts` are shared files, so it waits for the S3 (case-prepare) baton holder | this concept agreed |
| **SH4b** | schema step B: scoped pins, `demo` column, release update guard, stage key, backfill; T1-T3, T7-T9 | runtime | 1 | **schema** (write) | SH4a |
| **SH4c** | `per_filing` adoption switch on C9.5 (button per filing, AG-7-56) | runtime + screens | 0.5-1 | none | SH4b; founder's yes (Q1) |
| (in S1) | S1 tables enter the snapshot and the hash (step C); T8 | runtime | inside S1's 3 | schema (S1's) | SH4a |
| (U1, U2, M6) | call the service; no own pin reads | runtime | in their rows | | SH4b |

**Total S4: 2 sessions** (SH4a + SH4b), as part 7 §2 says, plus 0.5-1 if the founder switches on per-filing moves.

**Order:**
1. SH4a can start beside the Bake. It touches no schema, but it waits for the `case-prepare` baton if S3 holds it.
2. SH4b takes the schema baton when it frees, before U1.
3. S1's fee table lands after SH4a, so the hash is computed by one function.

**Baton:** SH4b alone writes `prisma/schema.prisma`. SH4a only reads it.

---

## 8. Risks and open questions (each with a recommendation)

**Q1 (founder, as product owner). Per-filing moves: switch on with SH4, or keep "the whole case moves"?**
* P-412 F10 chose the whole case now, with per-filing pins to come with SH4.
* The team's requirement moves one filing at a time (AG-7-56 r5-r7, SA-1B-254 r3).
* *Scenario:* Client B's work permit is recorded; Client D's study permit is not. With "whole case", Client D cannot get the newer rules until a new case is opened.
* **Recommendation:** store pins per filing and per person now (SH4b), and keep the `whole_case` policy. Switch on `per_filing` (SH4c) at U1, the first time a case holds filings that move at different times. It costs 0.5-1 session then, and no rework.

**Q2 (founder, with the immigration expert). Fees: fixed by the pin, or read at the date IRCC receives the application?**
* Part 7 §2 freezes S1 tables, fees included, into the release hash.
* SA-1B-251 says structure is pinned, but fees are read "on the date the authority receives the application", document validity at submission, and the form edition on submission day. It also says portal screens are never pinned.
* If the pin fixed fees, a fee change published after a case opened would not reach that case's quote.
* **Recommendation:** follow SA-1B-251 (the team's requirements rank first, AGENTS rule 2).
  * The fee table **is** frozen and hashed into each release, so a release can be proven and diffed.
  * A filing reads fees from the newest released table at the filing's fee date, shown "as at <date>".
  * Fees are frozen at "Record the submission" as B152 already does.
  * Rule 8's test then checks the hash, not the fee read.
  * Unconfirmed: no counsel; values Sample until the expert confirms.

**Q3 (risk, tech lead). Corrections (SA-1B-255) reach open filings without a click.**
* That cuts across rule 4 ("never changes without a person's click").
* The S1 item chains it needs do not exist yet.
* **Recommendation:** keep corrections out of S4. The contract leaves room for them: `releaseFor` may later lay a correction chain over the pinned snapshot, with its own hash in `Applicable`, so pins never change. Shape it as its own row after S1 has item versions. Until then, a correction is a new release that needs adoption, and that is the safe default.

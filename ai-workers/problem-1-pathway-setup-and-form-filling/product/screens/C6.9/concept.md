# C6.9 Staff eligibility page (M3-D): concept

Status: **DESIGN, revised after the independent challenge** (`challenge.md`, verdict "Ready after fixes"; answers in §11). There is no board, so it goes the P-223 (4) route: the tech lead approves, the founder looks next morning, and changes become follow-up rows. Written 2 Nov 2026 by a helper agent, branch `claude/runtime-c69-concept`. No code. Lane: runtime. Stand-in **SI-1** (P-164 (1)); **SI-2** stays deferred.

Done means:
* `prototype/studio/acceptance/C6.9.test.ts` (C6.9-1…15) is green on `main`;
* so are setup lines S7 and S8 of `acceptance/lib/setup_vv_m3.ts`. That file as a whole goes green only once S5 (M3-0) and S7a (the fee table, #325/#356) are merged too.

The contract row is `acceptance/M3-CONTRACT.md` C6.9.

## 1. Job and journey
**Job.** A case officer or the representative of record opens a Visitor visa case and wants an answer before preparing forms: *"From the facts on file, does each traveller clear this application's hard rules? If not, what is missing or what fails?"* The answer comes with the rules version it used, a disclaimer, who ran it and when. The person can correct the answer with a reason and mark it reviewed.

* **Who:** staff of the firm that owns the case (persona: case officer; the representative of record). The client and the prospect never see a verdict (P-77, r5c BR-14).
* **When:** after intake, once the travel document and background answers are in (M3 order: M3-C documents → **M3-D** → M3-E prepare and check). Again whenever a fact changes; the page then says the earlier run is out of date.
* **Why:** P-77 (2) asks for a staff eligibility page: each gate met, not met or not answered, what is missing, "rules as at" the release date, and a disclaimer. P-141 asks for a full page built from the team's AG-03. P-164 (1) says we consume AG-03's result shape and never rebuild it.
* **Team requirement:** AG-03 Pathway Assessment v1.4 (`domain/requirements-2026-10-19/02-functional-requirements/agent/AG-03-pathway-assessment_v1.4_2026-10-07.md`), §3.3, §3.7–3.9, §7 and §9, plus AG-3-1, -10…-13, -25, -28, -32…-35.
* **Our additions to AG-03** (record them for the team, AGENTS rule 2):
  * `gates[]` per result and `judgement[]` (P-77, FQ-5);
  * the review stamp's duty and licence (Q2);
  * the precedence of a failed gate over a missing fact, if the founder takes Q3's recommendation.

  For mapping:
  * `AssessmentProgramResult` (AG-03 §7) is stored inside `result_json`, not as rows;
  * our `label` is AG-03's `consultantOutcomeLabel`.

## 2. Layers: what exists, what the team has, what is new
| Layer | In the app (main) | Team (AG-03) | New in C6.9 |
|---|---|---|---|
| Data | `ConfigRelease.snapshot` (frozen JSON), `PackWorkPin` (the case's release), `ClientCanonicalAnswer` (a chain of rows; Confirm section writes a new row with the same value) | `Assessment`, `AssessmentProgramResult`, `AssessmentOverride` (§7) | Draft gates on the combination (part 1). Tables `assessment`, `assessment_override`, `assessment_review` (parts 2–3) |
| Rules | `prototype/contracts/rules.ts` `evaluate` and `validatePredicate`; `engine/render.ts` `evalCondition`; `engine/runtime/case.ts` `knownOf`, `checkValue` | the Qualifier engine (§3.3) | `engine/runtime/eligibility.ts`: a pure adapter from gates and known facts to AG-03's shape |
| Release | `engine/snapshot.ts` assemble; `engine/validate.ts` `validate`, `checkCondition`, `diff` | Country Pack versions (§3.2) | `snapshot.eligibility`, present only when set (fingerprints of other combinations stay the same). A change-summary kind "Eligibility". Release checks |
| API | `RuntimeService.reach(actor, case, "officer")` (firm isolation, BR-20) | `agent/assessment:*` keys (§10) | `api/src/eligibility.ts` with controller and service, registered in `api/src/features/eligibility.ts` (#363, P-214) |
| UI | `web/src/runtime/cases.tsx` CasePage (sections) | program-results panel (§3.3) | `web/src/runtime/eligibility.tsx` (the page plus a card component); one added line in `cases.tsx`, because C6.4, C6.12 and C7.x change it too |
| AI | — | none (rules only) | none. US$0, identical with AI off (C6.9-14) |

## 3. Business rules
Sources: **O** = official page quoted; **D** = a DECISIONS row; **FQ** = an open founder question whose recommendation the tests use (PACK-4); **T** = the team's requirement; **S** = Sample (with an ASSUMPTIONS row); **C** = the app's code.

**Gates as data (part 1)**
* **BR-1 Gates live on the release, as data.** `PUT /combinations/:id/eligibility-gates {gates[{key,label,condition}], judgement[], disclaimer?, version?}` saves them on the draft. Release copies them into `snapshot.eligibility` `{gates, judgement, disclaimer}`, frozen with the release. Nothing about any program is hard-coded in the engine. Sources: D P-77 (3); T AG-3-5, BR-1.
* **BR-2 Only a fact can settle a gate.** A gate needs an executable condition over library facts. Money, health, ties and leaving go to `judgement[]` as plain lines, never as conditions. The PUT refuses (400, on the field):
  * a gate with no condition;
  * a gate that reads an unknown fact;
  * a condition that `checkCondition` rejects, after BR-2a;
  * a duplicate key;
  * an empty label;
  * a judgement line that is empty or longer than 120 characters;
  * a disclaimer of 20 characters or fewer.

  Sources: FQ-5 (open; recommendation taken under P-223 (4); on the founder's list, §9 note). O VV-R01: canada.ca "Visitor visa: who can apply" lists the items. Money is the officer's because "the amount of money you will need depends on how long you will stay" (quoted in `compliance-trace.md` VV-R01, page date 2026-08-28; **not re-opened 2 Nov**, see §10).
* **BR-2a Gates are per person.** A condition with no root `subjectKind` is stored with `subjectKind: "PERSON"`, and only then checked: `validatePredicate` requires a root kind (`prototype/contracts/rules.ts:147`). S7 sends none, and S6 in the same file does send one. A root kind other than `PERSON` is refused 400 on the field: "Eligibility is checked per person". `case.*` facts still read through, because `evalCondition` gives each person the case's facts too (`render.ts` `factsOf`); `evalCondition` also strips the kind. Source: C.
* **BR-3 A stale save is refused.** The first save needs no `version`. A later save without the current version, or with an old one, gets 409 naming who saved last. Each save writes an audit row holding the list before it. Source: C (the S5 `participantsVersion` pattern). S7 is a first save.
* **BR-4 Gates are reviewed like any rule.** The change summary gets one line per gate added, changed or removed, plus one line for "Officer's judgement" and one for "Disclaimer". Kind "Eligibility", `needs_sme: true`. S8 signs them off and a second person approves. Source: C `validate.ts` `diff`; D P-116 (one change set).
* **BR-5 Release check.** A gate fact must be one a case actually asks: placed, and read by a form box or a rule (`validate.ts` derived-read ∩ placements, P-62). Otherwise it is an error: "This gate reads Passport number, which no case of this application is asked". Gate facts travel in the snapshot's used fields, so their labels go with the release. Source: C; D P-77 (2) (what is missing must be askable). Visitor visa: all three facts fill IMM 5257 boxes.
* **BR-6 The disclaimer is on the release.** It is text set with the gates. When the PUT gives none, the Sample default (§5) is written into the snapshot. It is frozen per release and never dismissible. Sources: T AG-3-32, BR-11; S (wording, ASSUMPTIONS C8). P-77 says "the firm's disclaimer": **Q1**.

**Runs (part 2)**
* **BR-7 Staff only, travelling people only.** Only staff of the case's firm may run or read a run (`reach(…, "officer")`). A client gets 403 on every route, and another firm's case gets 404. `person` must be a participant on the case; the case subject is refused 400. A participant with `applies: false` is refused 400: "Not travelling on this application". The client's pages show no eligibility at all. Sources: D P-77, r5c BR-14, P-209; C BR-20 in `runtime.ts reach`. (C6.9-1)
* **BR-8 One run = one frozen snapshot of AG-03's shape.** `POST /runtime/cases/:id/assessments {person, reason?}` writes one `assessment` row. Its `result_json` holds the whole envelope:
  * `releaseId`;
  * `packId`: the release's `packVersionId`, or `null`;
  * `packVersion`: the release version;
  * `rulesAsOfByProgram`: `{[combinationKey]: releasedAt date}`;
  * `disclaimerText` and `disclaimerLocale: "en-CA"`;
  * `createdBy` and `createdAt`;
  * `runType`: `MANUAL`, then `RERUN`;
  * `reason`;
  * `source: "stand-in"`;
  * `inputs[{fact, about, value, answerId}]`, with `value: null` when the fact is unanswered;
  * `results[]`.

  **The `assessment` row is never updated.** A database trigger refuses any update, as `FormInstance` does. Review and override are separate rows (BR-15, BR-16). Sources: T AG-3-1, AG-3-25, BR-10; D P-164 (1). (C6.9-2, C6.9-9)
* **BR-9 Gate state per person.** The adapter takes the facts from `knownOf` (`engine/runtime/case.ts`: number coercion, row facts, removed rows ignored). A value that fails its own check (`checkValue`; saved and flagged under P-47) counts as missing (AG-03 §9).
  * Each `exists f` leaf on a missing `f` is rewritten into a leaf that `evaluate` reads as *cannot tell* and lists `f` as missing (e.g. `{op:"eq", field:f, value:"__missing__"}`).
  * Then `evalCondition` decides: true is **Met**, false is **Not met**, cannot tell is **Not answered** (its missing facts are the gate's).

  So an "or" gate settles once one branch is true. Without the rewrite, `evaluate` returns *false* for `exists` on a missing fact (`prototype/contracts/rules.ts:105,121`), and an unanswered passport would read "Not eligible", a false NOT that AG-3-12 forbids. The shared `evaluate` is not changed (show/hide rules rely on it). An answered fact counts whether or not it is confirmed; the page marks it "Not confirmed yet". Sources: T AG-3-12; C. (C6.9-3, C6.9-4)
* **BR-10 Outcome.** With no gate Not met and none Not answered, the result is `LIKELY_ELIGIBLE`. With none Not met but some Not answered, it is `POSSIBLY_ELIGIBLE`. **Some Not met *and* some Not answered: `NOT_ELIGIBLE`** (the founder's answer to Q3, P-229 (3), 2 Nov; our addition to AG-3-13 for the team). The adapter's one switch, `FAIL_BEATS_MISSING`, is `true` (part 2); `false` would give AG-03 as written, `POSSIBLY_ELIGIBLE`. **A gate's own outcome when not met (P-230 (1), BACKLOG R4):** each gate may carry `whenNotMet` as data, `not_eligible` (the default, not stored) or `needs_review`. A `needs_review` gate not met is listed in `reviewGates` (ours), never in `failedGates`, and gives `POSSIBLY_ELIGIBLE` ("the representative reviews this"), never `NOT_ELIGIBLE`; the outcome set is unchanged and `FAIL_BEATS_MISSING` applies to `not_eligible` gates only. The Visitor visa background gate (`vv.no_convictions`) is `needs_review`: the IMM 5257 question covers committed, arrested, charged or convicted, and rehabilitation, record suspension and a temporary resident permit exist (researched 2 Nov, `research_notes/visitor-visa-and-six-combinations-research-2026-11-02.md` Q8). C6.9-7 changed with it (Not eligible → Possibly eligible, the gate for review). Either way, every result fills both `failedGates` (keys; the page shows labels) and `missingInputs` (fact keys, deduplicated, in gate order).

  A release with no gates gives **no result**: the run is refused 409, "This application's release has no eligibility rules yet". Zero gates never reads "Likely eligible". **Conflict, not settled here:**
  * AG-3-13 says: "When **all gate inputs are present** and any gate fails, the outcome SHALL be NOT_ELIGIBLE".
  * §3.3 step 1 lists first: "If a gate-deciding input is missing/insufficient to decide → the program outcome is POSSIBLY_ELIGIBLE".

  Gates are joined by AND, so no missing answer can rescue a failed gate. C6.9-7 answers every fact, so the test holds either way. Sources: T AG-3-10…13; D P-164 (1). (C6.9-3, C6.9-7, C6.9-8)
* **BR-11 The stand-in adapter never scores.** The adapter never gives `ELIGIBLE_BELOW_CUTOFF`. `score` and `maxScore` are `null`, `breakdown` is `{}` and `recommendations` is `[]`. The page keeps their places. The list says `stand_in: "SI-1"`. Sources: D P-164 (1); STAND-INS SI-1, SI-2. (C6.9-6, C6.9-15)
* **BR-12 Judgement lines are shown, never judged.** `judgement[]` is copied from the release onto every result, under "Officer's judgement, not checked by rules". It never changes the outcome. Source: FQ-5. (C6.9-5)
* **BR-13 Out of date compares values, worked out when read.** A run is out of date when any `inputs` fact now has a different canonical value (`canonical` in `rules.ts`; added, changed or removed), or when the case's pin is no longer the run's release. This is the `AnswerSnapshot` pattern. The answer id is kept for tracing only, so Confirm section (a new row with the same value, `runtime.ts:406`) never marks a run out of date. `out_of_date` and `changed[{fact, about, was, now}]` are computed on every read and never written. Sources: T AG-3-28, AG-3-29 (as it applies to a case; the firm-wide list is SI-5); D P-136. (C6.9-9)
* **BR-14 Running again needs a reason.** The first run for a person needs none. Every later run needs a non-empty `reason`, or it is refused 400 on the field `reason`. A run while nothing changed is allowed, with a reason. Sources: T AG-3-28; D r5c BR-14. (C6.9-10)

**Override and review (part 3)**
* **BR-15 Override sits beside the result.** `POST /runtime/assessments/:aid/override {programKey, fromOutcome, label, reason}` writes one `assessment_override` row and an audit row (actor, target, before/after outcome shown). It records who, their duty and licence, when, and whether the run was out of date. The engine's outcome never changes. The override is refused:
  * 400 on the field when the reason or the label is empty (label up to 80 characters, with suggestions);
  * 400 when `programKey` is not in the run;
  * 409 when `fromOutcome` is not the run's outcome.

  An override is allowed on an out-of-date run; the test needs it, since its latest run is already out of date. Sources: T AG-3-33, AG-3-35, BR-12. (C6.9-11, C6.9-12)
* **BR-16 Mark reviewed.** `POST /runtime/assessments/:aid/review {note?}` writes one `assessment_review` row: who, when, note, duty, licence, out of date. It also writes an audit row. It is unique per run, so a second review is refused 409 naming who reviewed and when. A licensed representative's stamp reads "Reviewed by"; a person with no licence reads "Seen by" (the case officer, as in C6.9-13). Who may: **Q2**. Source: T AG-3-34, AG-3-35. (C6.9-13)
* **BR-17 Rules only.** No model call, no spend ledger row, no AI control on the page. Source: D P-164 (1). (C6.9-14)
* **BR-18 M3 scope: the case's own combination only.** This follows from P-164 (1) and SI-2: cross-program ranking (AG-3-16) and scores come with the team's Qualifier, and only Visitor visa has gates. `results[]` stays a list, so nothing on the page changes later.

## 4. Layout (Workspace pattern, EXPERIENCE §3; team tokens; Visitor visa Sample data)
**Case page.** A card "Eligibility (staff only)" (its own component), under "People on this case". It shows one line per traveller (name · outcome pill · "out of date" when so) and a link "Open eligibility". The Stand-in chip carries `data-stand-in="SI-1"`; "SI-1" appears only there and in its tooltip.

**`/cases/:id/eligibility`.** Trail: Cases › ACC-… › Eligibility. Header: the case reference, "Visitor visa · release 2 · rules as at 2 Nov 2026", the Stand-in chip, and one primary action, **Run eligibility check** (or **Run again**, which opens the reason drawer).
```
┌ People (340px) ───────────────┐┌ Sample Client A — Visitor visa ────────────────────────────────┐
│ Sample Client A  [Possibly]   ││ [◐ Possibly eligible — needs 2 facts]  Score: none ⓘ           │
│  needs Passport, Convictions  ││ Rules checked                                                   │
│ Sample Spouse A  [Not run]    ││  ✓ Met          Has a valid travel document                     │
│ Sample Child A1  [Likely] ⟳   ││                 Passport number on file · expires 30 Jun 2035   │
│   out of date                 ││                 (Not confirmed yet)                             │
└───────────────────────────────┘│  ? Not answered Has no criminal or immigration-related          │
                                 │                 convictions · Convictions → Answer in case view │
                                 │ Officer's judgement, not checked by rules                       │
                                 │  · Has enough money for the stay · Is in good health · …        │
                                 │ ── Disclaimer (always shown) ──                                 │
                                 │ Run by Case officer · 2 Nov 2026 14:05 · Visitor visa rel. 2    │
                                 │ [Override result…] [Mark reviewed…]          History (3 runs) ▸ │
                                 └─────────────────────────────────────────────────────────────────┘
```
* Status uses shape and text, never colour alone: ✓ Met, ✕ Not met, ? Not answered.
* Each gate shows the values it read. The travel-document gate always shows the expiry date, because the rule checks only that one is on file (M4).
* Missing facts link to the person's question in the case view.
* **Drawers, never modals:**
  * *Run again*: a reason, required.
  * *Override*: the outcome being overridden (read-only); a label with suggestions "Refer to the representative", "Not advisable in practice", "Borderline: worth exploring"; a reason, required.
  * *Mark reviewed*: an optional note, with the stamp preview "Reviewed by" or "Seen by".
  * *History*: each run newest first, with outcome, who, when, reason, Out of date, Overridden, Reviewed.
* An override shows under the badge as "Officer's override: Refer to the representative — reason …". The engine's outcome stays visible.
* 36–44 px rows; 1024 px and 200 % zoom; keyboard: the people list is a listbox (↑↓), and every action is a real button.

## 5. States and copy
| State | What shows |
|---|---|
| Empty | "No eligibility check yet for Sample Client A. It reads the answers on file against this application's rules; nothing is sent anywhere." [Run eligibility check] |
| No gates on the release | "This application's release has no eligibility rules yet. An author adds them and a reviewer releases them." No button |
| Loading | skeleton rows; no percentage |
| Out of date | an orange band: "Out of date: Passport number changed from SAMPLEP12 to SAMPLEP13 on 2 Nov, after this check. Run again to see today's result." [Run again]. The old result stays readable |
| Error | on the field: "Give a reason for running again, such as 'Passport renewed'." · "Give a reason for the override." · pin mismatch: "This case's rules could not be read; nothing was run. Ask your administrator." |
| Conflict | override 409: "The result changed since you opened it. Reload to see it." · review 409: "Already reviewed by Representative on 2 Nov 14:20." |
| Read-only | after the case is recorded as filed (C9.2): runs stay readable, and Run is greyed with the reason "Filed on …: earlier checks are kept as they were" |
| Client view | nothing: no card, no route (403) |

**Copy.**
* "Likely eligible".
* "Possibly eligible — needs N facts".
* "Not eligible on this application's rules as written — fails: <label>; also needs: <facts>. The representative reviews this, and IRCC decides."
* "Eligible, below the cut-off" never appears from the stand-in.
* Score place: "No score: this application has no points score" (tooltip: "Programs with a points score show it here when the team's Qualifier is connected").
* Stand-in tooltip: "Today: our own checks on this application's rules, three outcomes and no score. Later: the team's AG-03 Qualifier fills this page and adds scores, cut-offs and advice."
* Judgement tooltip: "IRCC's officer decides these. Rules cannot check them, so they never change the result."
* **Default disclaimer** (Sample, ASSUMPTIONS C8; Unconfirmed: no counsel): "Indicative only. This check compares the answers on file with this application's rules as at the date shown. It is not a guarantee of approval: an IRCC officer decides, including on money, health, ties and leaving Canada."

## 6. Contract
Problem Details on every refusal (`type`, `title`, `status`, `detail`, `errors[{field, message}]` for field errors). Every route needs `x-actor`.

| Route | Request | Response | Refusals |
|---|---|---|---|
| `PUT /combinations/:id/eligibility-gates` (author) | `{gates[{key,label,condition,whenNotMet?}], judgement: string[], disclaimer?, version?}` | 200 `{gates (stored with subjectKind), judgement, disclaimer, version, savedBy, savedAt}` | 400 field (BR-2, BR-2a); 403 not an author; 404; 409 stale |
| `GET /combinations/:id/eligibility-gates` | — | the same, plus `released: {…}\|null` | 404 |
| `POST /runtime/cases/:id/assessments` | `{person, reason?}` | 201 Assessment | 400 `person` (BR-7) or `reason` (BR-14); 403 client; 404 another firm; 409 no gates or pin mismatch |
| `GET /runtime/cases/:id/assessments[?person=]` | `person` optional; omitted means every person on the case | 200 `{stand_in: "SI-1", assessments: Assessment[]}`, newest first | 403; 404 |
| `GET /runtime/assessments/:aid` | — | 200 Assessment | 403; 404 |
| `POST /runtime/assessments/:aid/override` | `{programKey, fromOutcome, label, reason}` | 201 `{id, programKey, fromOutcome, label, reason, by, duty, licence, at, outOfDate}` | 400 field; 403; 404; 409 |
| `POST /runtime/assessments/:aid/review` | `{note?}` | 200 `{reviewedBy, reviewedAt, reviewNote, duty, licence, stamp: "Reviewed"\|"Seen", outOfDate}` | 403; 404; 409 already reviewed |

**Assessment fields:**
* `id`, `caseId`, `person`;
* `releaseId`, `packId`, `packVersion`, `rulesAsOfByProgram`;
* `disclaimerText`, `disclaimerLocale`;
* `runType`, `reason`, `createdBy`, `createdAt`, `source: "stand-in"`;
* `out_of_date`, `changed[]`;
* `reviewedBy?`, `reviewedAt?`, `reviewNote?`, `overrides[]`;
* `results[]`, each with:
  * `programKey`, `programLabel`, `outcome`;
  * `score: null`, `maxScore: null`, `passMark: null`, `selectionModel: null`, `competitivenessBand: null`, `gapToPass: null`;
  * `failedGates[]`, `missingInputs[]`, `reviewGates[]` (ours, R4), `breakdown: {}`, `recommendations: []`;
  * `gates[{key, label, state, facts[], values{}, missing[], whenNotMet}]`;
  * `judgement[]`.

`out_of_date`, `changed`, `gates`, `judgement` and `releaseId` are ours; the rest uses AG-03's names.

**Storage. Migration: yes, proposed; the tech lead reads each one first.**
* **Part 1, `c69_eligibility_gates`:** one nullable column, `combination.eligibility jsonb` (`{gates, judgement, disclaimer, version, by}`). Precedent: `form_order` and `participants`. Rollback: drop the column.
  *Considered and rejected:* gates as `check_def` rows (no migration). A check fires when true, while a gate is met when true, and four readers would invert them silently (`render.ts:317`, `validate.ts:91`, `rule-facts.ts:49`, `library/checks`). `predicate` rows have the same problem (`render.ts:263` evaluates every rule as show/hide).
* **Part 2, `c69_assessments`:** the test reads these by SQL, so they cannot be avoided.
  * `assessment`: `id`, `workspace_id`, `case_id`, `subject_id`, `config_release_id`, `result_json`, `run_type`, `reason`, `created_by`, `created_at`. A trigger refuses UPDATE. Index `(case_id, subject_id, created_at)`.
  * `assessment_override`: `id`, `assessment_id`, `program_key`, `from_outcome`, `label`, `reason`, `stamp jsonb`, `created_by`, `created_at`.
  * `assessment_review`: `assessment_id` unique, `reviewed_by`, `reviewed_at`, `note`, `stamp jsonb`.

  Rollback: drop the trigger and the three tables. The two migrations go in sequence (one in flight at a time), or as one in part 1 if the tech lead prefers a single read.

## 7. Parts (one PR each, in order)
1. **Gates on the release:** BR-1…BR-6. The PR's first line says "migration" and names the shared `engine/snapshot.ts` and `engine/validate.ts` (`validate`, `diff`). Proof: the S7 and S8 lines green; other combinations' fingerprints unchanged.
2. **Runs:** BR-7…BR-14, BR-17. The pure adapter with unit tests, the routes, migration 2. Proof: C6.9-1…10, 14, 15.
3. **Override, review and the page:** BR-15, BR-16, BR-18, §4–§5. Proof: C6.9-11…13 and the journey (run → out of date → run again with a reason → override → reviewed), at 1024 px, keyboard only and 200 %. It may split into the API, then the page.

**Capability or scaffolding** (P-33):
* the page, the adapter, snapshots, override and review are **Capability**;
* the adapter is a **Stand-in** (SI-1, chip shown);
* gate conditions, labels and the disclaimer are **Sample** (ASSUMPTIONS C6, C8, C9).

**Not built** (P-26):
* a gate-authoring screen;
* Undo of a gate save;
* ranking, scores and advice (SI-2);
* the client summary (SI-4);
* the firm-wide out-of-date list (SI-5);
* pinning a run to an older release (AG-3-31);
* comparing runs (AG-3-30);
* a real passport-validity check against the stay dates (a fact C6.9-8 does not answer; for the immigration expert).

**Proposed to the tech lead (S7 belongs to the test writers):** relabel S7's gates to what they check: "Passport number and expiry date answered (Sample)" and "Answered no to the criminal history question (Sample)". No test reads labels (C6.9-5 matches keys).

## 8. Tests (one pass and one fail per rule)
| BR | Pass | Fail | Acceptance |
|---|---|---|---|
| 1 | S7 saves 2 gates and 4 lines; after S8 the snapshot holds `eligibility` | an older release has no `eligibility`, and its fingerprint is unchanged | S7, S8 |
| 2 | conditions over `person.passport_*` and `person.criminal_history` accepted | no condition, an unknown fact, a duplicate key, an empty label, or a 20-character disclaimer → 400 on the field | unit + API |
| 2a | a condition without `subjectKind` is stored as `PERSON` (S7's own body) | `subjectKind: "CASE"` → 400 "Eligibility is checked per person" | unit + S7 |
| 3 | first save without a version; then with the current version → 200 | a later save with no version or an old one → 409 | API |
| 4 | the change summary lists "Eligibility" lines with `needs_sme` | unsigned gate lines block approval | S8 |
| 5 | gate facts a case asks pass | a fact that is placed but read by nothing → error, submit refused | unit |
| 6 | no disclaimer given → the Sample default is in the snapshot | (BR-2's 20-character refusal) | C6.9-2 |
| 7 | the officer runs and reads | the client gets 403; another firm gets 404; the case subject or `applies: false` → 400 | C6.9-1 |
| 8 | the envelope carries pin, rules as at, disclaimer, who, `stand-in` | an UPDATE on `assessment` is refused by the trigger; `result_json` byte-identical | C6.9-2, C6.9-9 |
| 9 | answered facts → Met or Not met; `or(passport, refugee document)` with a passport only → Met | an unanswered passport → Not answered (never Not met), listed as missing; an invalid value → missing | C6.9-3, C6.9-4 |
| 10 | all met → Likely; a `not_eligible` gate failed with all answered → Not eligible; `vv.no_convictions` (needs review, R4) answered yes → Possibly eligible, in `reviewGates` | a fail plus a missing fact → Not eligible (the switch, `true`), with both lists filled; no gates → 409 | C6.9-7, C6.9-8 |
| 11 | score and breakdown empty or null | never `ELIGIBLE_BELOW_CUTOFF` | C6.9-6, C6.9-15 |
| 12 | 4 judgement lines | no gate about money, health, ties or leaving | C6.9-5 |
| 13 | a changed value → the earlier run is out of date, naming the change | **Confirm section on the facts a run read → `out_of_date` stays false** | C6.9-9 |
| 14 | a later run with a reason → 201 | a later run without a reason → 400 `reason` | C6.9-10 |
| 15 | override with a reason → 201, one row and one audit row, outcome unchanged | no reason → 400 on the field; wrong `fromOutcome` → 409 | C6.9-11, C6.9-12 |
| 16 | review → 200, a "Seen" stamp for the case officer, an audit row | a second review → 409 | C6.9-13 |
| 17 | `ai_batch` count unchanged | (invariant) | C6.9-14 |
| 18 | results only for `vv.single` | another released combination never appears | unit |
| list | GET with no `person` returns every person's runs, newest first | an unknown `person` → 400 | C6.9-9, C6.9-15 |

Scale: 4 people × 10 runs in under 300 ms, with two queries (the runs, then today's answers for out of date). Keyboard: the whole journey runs without a mouse.

## 9. Founder questions (at most three, recommendation first)
1. **Where does the disclaimer live?** P-77 says "the firm's disclaimer"; AG-03 (AG-3-32, BR-11) sources it from the stamped pack version.
   * **Recommend: on the release, set and reviewed with the gates,** so it is frozen with the rules it qualifies. A firm's own line is added once the team's firm settings exist (SI-9).
   * Taking this amends P-77 (2), so it needs a DECISIONS row.
   * *Scenario:* the expert tightens the wording for 2027. The new release carries it, and earlier runs keep their old words.
2. **Who may override a result and mark it reviewed?** AG-03 §10 separates the permissions, but M3 has no permission keys (SI-9).
   * **Recommend: any staff of the firm for M3.** The stamp names the person, their duty and their licence. It reads "Reviewed by" for a licensed representative and "Seen by" for anyone without a licence. The team's `agent/assessment:override` and `:review` keys plug in later.
   * Alternative: the representative of record only. That would change C6.9-12 and C6.9-13 with the tech lead.
3. **When one rule fails and another fact is still missing, does the person read *Not eligible* or *Possibly eligible*?** AG-3-13 gives Not eligible only "when all gate inputs are present", and §3.3 checks missing inputs first.
   * **Recommend: Not eligible, with the missing facts listed too.** No missing answer can undo a failed rule, so "Possibly" would mislead the officer.
   * Record it as our addition to AG-3-13 for the team.
   * *Scenario:* Client A answered yes to the criminal history question but has not given a passport. The page shows "Not eligible — fails: convictions; also needs: Passport number", not "Possibly eligible".
   * It is one switch in the adapter either way.

*Also open, and not re-asked here:* FQ-5 (the judgement items are never gates) stands on its PACK-4 recommendation, taken under P-223 (4); it is on the founder's list.

## 10. Sources not reached (2 Nov)
canada.ca could not be fetched from this cloud session: the host is outside the allowed network. The VV-R01 quotes come from `compliance-trace.md` (page date 2026-08-28) and were **not re-opened today**. Gate labels and conditions stay **Sample**, and their over-reach is a recorded risk (ASSUMPTIONS C9). The tech lead re-opens `https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eligibility.html` and the inadmissibility page on the Mac before part 1 merges. The disclaimer is Sample (C8). Legal points (the disclaimer's adequacy, criminality and rehabilitation): Unconfirmed: no counsel.

## 11. Challenge answers
* **B1, accepted:** BR-2a defaults to `PERSON` and refuses other root kinds; tests added.
* **M1, accepted:** `person` is optional on GET; list test added.
* **M2, accepted:** BR-13 compares values; ids kept for tracing; Confirm section fail test added.
* **M3, accepted:** the conflict is stated in BR-10 with both quotes, it is Q3, and the adapter has one switch.
* **M4, accepted:** values beside each gate, the expiry date always shown, Not eligible copy says IRCC decides, risk in C9. S7's relabel is proposed to the tech lead, not made.
* **Minors 1–5 and 9–11, accepted:**
  * 1: "or" gates via the `exists` rewrite.
  * 2: the release check uses placed ∩ read facts.
  * 3: facts come from `knownOf` and `evalCondition`; invalid values count as missing.
  * 4: the result row is never updated (trigger); review is its own row.
  * 5: override and review write audit rows.
  * 9: internal names are off the page copy.
  * 10: "Seen by" for an unlicensed officer.
  * 11: FQ-5 marked open; paths and model names fixed.
* **Minor 6, accepted:** `packId` = `packVersionId ?? null`, plus `releaseId`.
* **Minor 7, accepted:** the case subject and `applies: false` are refused.
* **Minor 8, accepted:** the disclaimer refusal moved into BR-2.
* **Minor 12, accepted:** part 1 proves the S7 and S8 lines; the whole file needs S5 and S7a.
* **Minor 13, accepted:** rollback per migration; two queries for the list.
* **Minor 14, accepted:** the card is its own component with one line in `cases.tsx`; the shared engine files are named in part 1's PR; the AG-03 mapping is in §1.
* **Minor 15, noted:** the length stays (AGENTS rule 8).

## Definition of ready
* Acceptance test `acceptance/C6.9.test.ts`, and setup S7 and S8.
* Row M3-D (`BACKLOG.md` line 59), split into parts 1–3.
* Q1–Q3 answered, or the recommendations taken under P-223 (4).
* The tech lead's OK on migrations 1 and 2 and on the S7 relabel.
* The challenge's Lead response and Agreement filled in `challenge.md`.

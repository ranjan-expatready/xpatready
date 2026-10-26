# Challenge — M3 "Prepare application" concept draft (fresh agent, 26 Oct)

Read against `main` today: `concept-draft.md`, the board, PRODUCT/STANDARDS/EXPERIENCE/QUALITY, `domain/*`, DECISIONS P-39–P-97, SA-01B redesign 16/16b/"Forms at launch", SA-1B-73/74, `DEMO.md`, and the app code (`prisma/schema.prisma`, `api/src/{runtime,fill-case,extension}.ts`, `engine/{channels,snapshot,runtime/*}.ts`, `web/src/runtime/*`). Team citations checked in `code/ERv2-frontend@5ccd9fa` and `code/ERv2-sanitized@fb76410`.
**Freshness:** `freshness.sh` — ERv2-frontend capture is STALE (live `dev` moved 23 Oct), ERv2-sanitized UNVERIFIED, Drive snapshot 19 Oct (Lead checks live Drive before citing requirements). Every team-code claim below is **Unverified**.

**Verdict: Build after these changes.** The concept is well grounded and most of its engine already exists; no Blocker, seven Majors. All Majors are *Needed for the proof*.

## Objections

**M1 — No Filing exists; the contract assumes one.** `/cases/:id/filings/:fid/prepare`, the filing record and read-only state need a record nothing provides: `runtime_case` has one `combination_id`, `pack_work_pin` is `@@unique(caseId, combinationId)`. TAXONOMY §4 rows 2 and 20 (three combinations in one case; one person on two programs) cannot be expressed at all today, and Q2's outcome changes the shape: household filing → filing ≈ case × pin (derive); filing per person → a record per subject. Example: DEMO row 18's "B reuses A's family facts" — same case or linked cases is undefined either way. Fix: answer in Q2 what a Filing *is* (minimum for the proof: `Filing = case × combination` on the pin, holding reference, submittedAt, read-only; persons via participants), then write it into §6. *Needed.* Confidence: high.

**M2 — The contract duplicates two shipped write paths.** `PATCH /cases/:id/facts/:fid` duplicates `PUT /cases/:id/answers/:subject/:field` (runtime.ts:373); `GET …/screens/:sid/fill` duplicates `POST /api/extension/cases/:id/forms/:form/:subject/fill-plans` (extension.ts:246 — live screen fingerprint in, fill plan + re-capture task out). A second fact-write path must re-implement supersede, verify and P-78 who-answered, or drift. Fix: extend the shipped endpoints (answers' response gains `markedStale`, `refilledDrafts`); reuse fill-plans verbatim; `POST /fill-events` may stay new (no analog) but the draft must say what it records beyond audit. *Needed.* High.

**M3 — BR-8 disables whole "background/declaration screens"; the shipped contract works per input.** Redesign 16 never fills declaration/background *questions*; F2 marks them per input (`person_answers_on_screen`, channels.ts:67) and `fillPlan` already returns "N to fill · M need you". A mixed screen (8 mapped inputs + 1 declaration box) loses every fill under a per-screen rule — weakening C7.4's proof. Fix: disable per input; "Fill this screen" off only when nothing on the screen is fillable. *Needed.* High.

**M4 — BR-6 depends on line fields that do not exist yet.** `CombinationForm` and the snapshot carry `who, channel, condition` — no `signedBy`, `signatureMethod`, `copies`, `minimumAge` (MASTERS §4; redesign "Who signs each form"). Those are on the runtime lane's unmerged Screen 03 S2. Who signs a child's copy, and how many copies, cannot be derived today. Fix: name the snapshot fields M3 reads and the fallback if S2 lands differently. *Needed* (demo rows 9, 14). High.

**M5 — Document items have no state model; `who: once` and step lines have no home.** BR-1 lists a Documents group, BR-6 closes only the signed-scan line. Nothing says a document item's states, who marks it received, or whether a missing required document blocks readiness (BR-3's hint omits documents). A `who = once` line ("marriage certificate once per couple", RULES-MODEL §3) is neither "form line × person" nor addressed; government/standard step lines (SA-1B-57; biometrics deadline) are never mentioned. Fix: give document items states and their owner (the case Documents tab — C6.4, runtime lane — is "not on this board"; name the dependency), decide warn vs block (recommend warn: P-71 + EXPERIENCE §2.9), resolve once-lines per filing, and declare step lines Not built here. *Needed* (demo row 15). High.

**M6 — "Changed after entry" is uncomputable from a bare tick.** BR-7 marks entered portal screens stale; `changedAfterEntry?` needs the answers the tick covered frozen at tick time (positions + values, the AnswerSnapshot pattern for PDFs). No record stores them. Fix: `POST …/screens/:sid/entered` writes the screen's resolved answers; staleness compares like `changedFacts`. *Needed.* High.

**M7 — The R1 forms panel is never retired.** The board adds a "Prepare application" case tab; `/cases/:id` already renders `FormsPanel` (PDF forms, copies, readiness — web/src/runtime/cases.tsx:163). Two surfaces listing the case's forms violates one-home-per-fact and confuses the officer. Fix: §4 must say the items list absorbs FormsPanel (removed or embedded) when the tab lands. *Needed.* High.

**Minors (all *Needed*):** m8 BR-4: in-app check runs our tier-1/2 engine (`checkValue`, snapshot `checks`), never IRCC's Validate script (Adobe only, P-46) — copy must not say "Validated" for an in-app pass. m9 BR-7 "refills drafts": generated copies are never auto-regenerated (fill-case.ts:156, "only when the officer asks") — say the live draft recomputes and copies go out-of-date, or officers will expect fresh copies. m10 No route/record to launch a review run (§6 has findings + acknowledge only); RULES-MODEL §7 requires an estimated cost per run and stub/replay. m11 Item identity: `filing-items/:id` is opaque while copies key on (form, subject) — define item = release line lineage × subject so copies, ticks and sign states share it. m12 "Fill this screen" in the demo runs on a saved portal twin (F2's Studio page): keep the P-33 scaffolding label on that path. m13 Team `recordSubmission` requires fileNumber non-empty and submittedOn ≤ today, per *case* (case-store.ts:221, Unverified) — adopt the same validations and state the per-person mapping is intentional. m14 `PATCH /filings/:id/record` + read-only: say what read-only covers (ticks, sign states, generation, the record) and whether a typo'd application number can ever be corrected after submit.

## What is sound

The ten-layer map is honest: pin to the release, confirmed-facts-only fill (P-72), never-overwrite copies with value-compare staleness (`changedFacts`/`changedGroups`), per-screen structure check + re-capture tasks, trial gate — all exist and the draft builds on them rather than rebuilding. BR-3 follows P-71 correctly and flags the P-39/journey-v2 conflict for the Lead instead of hiding it. BR-4/BR-5 implement P-46 and "Forms at launch" faithfully. Per-person application number + UCI matches SA-1B-74 and improves on the team's per-case model (mapping noted). The three questions are the right ones, recommendations first, and §7's capability/scaffolding labels are clean — including holding P-73's "hold for everyone" out of M3.

## Already built vs missing (against `main`)

| Draft element | Exists? |
|---|---|
| Pin to release; family on a case; answers once; Confirm section | Yes (R1: runtime.ts, PackWorkPin, append-only answers, P-78) |
| PDF items + checks + copies + stale | Mostly: `GET /cases/:id/forms`, `form-copies` generate/lock/file; readiness P-71; trial gate via evidence STATUS.md |
| Online screen structure check, re-capture task, fill plan | Yes (F2 fill-plans; RecaptureTask) |
| Items across all channels in one list; readiness blockers line | New (derive from release lines × participants; PDF list exists but is forms-panel shaped) |
| Entered ticks + changedAfterEntry; sign-state machine; signed scan; validated-copy upload; document items; filing record + submit/read-only; review runs + findings; mapping reports; `PATCH facts` staleness response | New records + endpoints (plan below; upload of any case file is wholly missing — no upload route exists today) |

## Back-end plan (element → record → API → rule → test)

| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Filing + items | `Filing` = case×combination on the pin (ref, submittedAt, submittedBy, readOnly; see Q2) | `GET /cases/:id/filings/:fid/prepare` | items = release lines × applies-participants, filtered by who/onlyIf; item id = lineage×subject | family of four → right items; conditional line hidden |
| Entered tick | `screen_entry` (item, screenKey, by, at, factsJson) | `POST …/screens/:sid/entered` | stores resolved answers; changedAfterEntry = value compare | fact change after tick → stale; unchanged → not |
| PDF item | reuse FormInstance/AnswerSnapshot + `form_upload` (sha, read_back) | `POST …/check`; `POST …/validated-copy`; existing generate/lock/file | check = checkValue + snapshot checks on facts the form reads; upload read back, compared by position | check error blocks ready; shifted value flagged |
| Signed PDF | `signed_copy` (item, state, by, at, file) | `POST …/sign-state`; `POST …/signed-scan` | order Prepare→Printed→Sent→Received→Uploaded; scan closes matching document line | jump refused; scan closes line |
| Documents | `case_document` (item, required, receivedBy/At, source) | inside prepare only | document_requirements × who/onlyIf; states per M5 | married → certificate line appears |
| Review | `review_run` (item, cost, status) + `review_finding` (severity, evidence, ack) | `POST …/review-runs`; `POST /review-findings/:id/ack` | advisory only (P-71); "Other" needs note | open finding → still ready; ack without note refused |
| Filing record/submit | fields on Filing | `PATCH /filings/:id/record`; `POST …/submit` | submittedOn ≤ today; app number required; submit warns never blocks, sets read-only | stale items → warning; writes after submit → 409 |
| Fact change | — | extend `PUT /answers` (+`markedStale`,`refilledDrafts`) | changed fact marks signed/uploaded/submitted/entered stale, never changes them | signed copy byte-identical + stale after change |
| Mapping report | `mapping_report` → content-team task | `POST /mapping-reports` | nothing on the case waits | task created, item untouched |
| Extension | — | reuse `POST …/fill-plans`; new `POST /fill-events` (counts only) | per-input disable (M3) | declaration input never filled |

## Slices (new files until Screen 03 merges — additive migration, new `api/src/prepare.ts`, `contracts/prepare.ts`, `web/src/runtime/` route; the only shared-file touch is an additive response field on `PUT /answers`, agreed with the runtime lane)

S1 filing shell (prepare read, items, readiness) → S2 portal sheet + ticks + staleness (extension reuse) → S3 PDF items incl. validated-copy upload/read-back → S4 signed-PDF + scan + documents (reads S2's signedBy/signatureMethod; fallback named) → S5 filing record + submit/read-only + review runs/ack + mapping reports (Q3).

## Questions for the founder (carried, sharpened)

1. **Does a stale item block "Ready to file"?** Recommend **yes** (draft's): a signed copy or entered screen behind a fact is a conflicting fact on that form (P-71); clears by re-do or undo. Alternative: warn only.
2. **One Prepare application per household or per person?** Recommend **household filing = case × combination on the pin** (per-person application number + UCI, SA-1B-74); consequence: the Filing record is minimal today and can grow if a case ever spans combinations (TAXONOMY 2 stays unresolved for the expert). Alternative: filing per person (TAXONOMY case 1's reading).
3. **"Report a mapping problem" in M3?** Recommend **yes, button + content-team task only**; hold-for-everyone and affected-cases list stay M4 (B28). Alternative: whole item in M4 as P-73 reads.

## Lead response
## Agreement
## Build discoveries

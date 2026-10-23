# Configurator AI placement and reliable execution

21 October 2026 · version 1 · Codex, founder-assigned research/planning coordinator · session 01a1598d-8aa1-7ea3-b353-5c5b5e1a9a18. D280 extends the D279 layout brief and upgrades the same maker assignment. Recommendation and implementation requirements, not a formal review, prototype-completion claim or production qualification.

## Recommendation

The parent row is the **program name**. Its combinations are separate configuration rows beneath it. Ordinary program naming is a human metadata edit at program scope; a combination-level action must not accidentally rename its program or change siblings.

Use several **scoped entry points to the same governed configuration workflow**. A top action selects the work; combination and source actions narrow it. They do not imply separate autonomous agents at each level, a new model/provider, or one giant model request across the whole catalogue. D193's wider AI organisation choice remains open.

| Placement | User action | Meaning and scope |
|---|---|---|
| Catalogue toolbar | **AI configuration…** → Draft for selected combinations / Update from changed sources | Opens a scope-and-work summary. Default to explicit selections and missing/changed work. All combinations is an explicit choice with the actual target list/count, never an implicit consequence of opening the screen |
| Program row menu | **AI for this program…** | Opens the same scope chooser filtered to this program's combinations. Program is a navigation/selection scope, not an inherited configuration or separate AI implementation |
| Combination row or workspace header | **Draft setup**, **Update draft**, **Review proposals**, or **View progress**, according to state | Acts on exactly one stable full configuration identity. Keep program/path, participants, source editions and draft/released state visible. Existing next-action control should reflect this state |
| Form/source row | **Read form**, **Reuse approved mapping**, **Draft field mapping**, **Retry failed step**, as applicable | Reading or exact approved reuse need not call a model. This is where a source can be fixed/retried without regenerating an entire combination |
| Proposal, field or rule editor | Evidence / reason, correct or return; optionally **Suggest a revision** where a concrete need exists | Explain the particular suggestion; retain original and human correction history. Do not add an AI call button to every cell or a mandatory chat panel. Optional targeted drafting still uses the same policy and review path |

Use action-specific labels. A provenance label such as **AI-proposed** opens evidence/explanation; it is not an ambiguous run/regenerate button. Show human-edited, reused approved content and new AI proposals distinctly. A completed AI job is not an accepted draft or a released configuration. Avoid decorative AI badges across the entire page when only particular items used AI.

## Before, during and after a run

**Before:** show affected programs/combinations, operation, eligible sources and editions, reused/skipped/changed work, expected effect, and an honest cost estimate or upper bound. Show why ineligible items cannot run. Selection across filters/pages must remain explicit. One broader launch authorizes only work within the existing input/route/model/run and total-spend limits; it does not authorize a new provider or processing scope. The confirmation is the product user's launch action, not a new founder planning approval at each step.

**During:** use the existing activity/job experience with a batch summary and per-combination/form results. Persist status so reload or navigation does not lose the task. Distinguish queued, reading/reusing, generating, validating, ready to review, failed, cancelled and completed where those states really exist. Do not invent a percentage or ETA from unknown model work. Keep unrelated editing usable; protect the exact draft/input snapshot being processed. Cancellation stops future work and prevents cancelled results applying; do not promise it reverses an already-sent request or guarantees no charge.

**After:** review one understandable change set: reused / proposed new / ambiguous / conflicting, source/page/field evidence and affected dependencies/persons. Users may correct, return or accept under existing duties, then apply permitted changes to the draft and preview the effect. No generated result silently overwrites a human change or released version. Mark a result stale if its configuration/library/source context has changed; require reconciliation before apply. A failed child does not discard successful siblings. Retry only eligible unfinished work; do not replay already-completed paid requests merely to rebuild a screen.

Configuration drafting reads approved official setup sources. The synthetic-only case document reader remains its separately governed input scope; a top-level button must not mix client facts, expected answers and public configuration drafting. Treat document content as untrusted evidence, never as instructions to execute or permission to modify records.

## Stable and efficient implementation

Reuse current React/NestJS/Prisma/PostgreSQL components, job records, guarded provider adapter, review/proposal records and shared renderer. Entry points submit a typed scoped operation through one policy-enforced service path. A batch groups small tracked jobs; it must not depend on an unbounded HTTP request or one enormous prompt. Select a queue/runtime only if current recovery needs justify it under D278.

Use a source/content plus context fingerprint for deduplication: source edition/hash, operation and reader/prompt/model versions, relevant library/configuration revision, and applicable person/meaning/language context. Source parsing may be reused; a mapping's applicability is not established by matching file bytes alone. Reuse approved references and rerun only affected work. Bound concurrency and retry attempts; reserve aggregate spend before scheduling, enforce it across workers, reconcile actual usage, and handle ambiguous provider outcomes without blind duplicate payment.

For important effects, enforce idempotency and concurrent-version checks in storage, not only disabled buttons. Apply a reviewed change set transactionally, recording who/what/source/version changed. Preserve original evidence, independent keys and experiment/spend history through resets; prevent an old job applying into a new reset workspace. Validate schema, references, applicant/meaning/date selection and supporting evidence; schema validity and model confidence are not semantic accuracy proof.

## What production requires, and what this prototype must demonstrate

| Area | Prototype evidence now required | Additional production qualification to report explicitly |
|---|---|---|
| Scope and authority | Server enforces the demo author's/reviewer's/approver's duties; wrong scope, stale results and direct API bypass refused | Real authentication, tenant isolation, authorization at every job/data boundary and service-account/secret management; simulated persona selection is not authentication |
| Recovery and consistency | Duplicate click/reload, changed draft, failed child, cancelled work and reset during pending work handled with recorded state; retry only unfinished work | Durable worker restart/recovery, crash/load tests, backups/restore, deployment compatibility and operational ownership for the actual environment |
| Accuracy and traceability | Source-linked proposals and controlled apply/release; independent expected-answer and negative cases retained | Representative document/language/edition coverage, critical-error and correction-effort targets, regression gates and monitored model/prompt upgrades |
| Data and cost | Approved input separation, model/route/caps, labelled replay/stub/live modes, limited logs and unchanged ledger controls | Agreed processing region, retention/deletion, privacy/security review, prompt-injection testing, supplier terms and actual operating/load cost evidence |
| Usability | Top-level and local actions identify the same work, preserve navigation, expose progress/errors and support keyboard use; 100-program selection tested in isolation | Real content-operator task testing and measured accessibility/performance on target devices and workloads |

These are acceptance criteria and production gaps, not a request to build a full production platform before the next demo. Implement the necessary reusable controls for the current outcome, identify remaining hardening work and avoid claiming production readiness from a prototype pass. No new infrastructure, processing permission or paid experiment is authorized here. Legal: Unconfirmed: no counsel (AIW-D94).

## Evidence and research

**Inspected, not executed this turn:** `prototype/studio/web/src/pages/sources.tsx` already exposes per-source read/draft/reuse, guarded live/replay/stub options and cost information. `job.tsx` has reuse/new/ambiguous/conflict review, corrections and apply-to-draft. `api/src/sources.ts` rejects a concurrently running draft for the attachment and marks running jobs failed on server restart. This inspection does not establish atomic duplicate prevention, durable resume, safe batch cancellation, 100-program bulk orchestration or production isolation. Exact inspected hashes are in `archive/ai-workers/before-configurator-ai-placement-2026-10-21/before.json`. Codex did not author this maker implementation.

**Official sources opened 21 October:** [Microsoft HAX Design Library](https://www.microsoft.com/en-us/haxtoolkit/library/), guidelines 1/4/7–11/14/16–18, supports discoverable contextual invocation, correction, scope, consequences, controls and change visibility. [Carbon for AI](https://www.carbondesignsystem.com/building-blocks/foundations/carbon-for-ai) supports visible AI provenance and explanation within the workflow. [Carbon AI label](https://www.carbondesignsystem.com/building-blocks/core/components/ai-label/guidelines), When not to use / Levels of visibility, distinguishes explanation indicators from generation actions and allows broad plus focused indicators. These inform the proposed interaction; they neither prove this exact layout is best nor require installing their components. The stability/efficiency measures above are explicit design recommendations, not vendor performance claims or audited current capabilities.

**Freshness and limits:** four live GitHub checks failed; current branch equivalence **Unverified**. Scoped Drive changed-after search returned no files, not a full content audit. No model call, UI/data mutation, installation or runtime test in this research. Prior exact-revision verdicts stand. The earlier layout example remains a synthetic navigation illustration and does not yet depict these new AI controls.

## One upgraded maker assignment

This refines the existing configuration MVP rather than replacing it or starting another session. Read D279/D280 and both linked briefs; preserve the previous UI and useful engine/editor/review behavior. Challenge the scoped-entry recommendation, then implement the simplest complete flow with honest capability labels. A field-map-only operation must not be advertised as already drafting all rules/documents/sections. Build authorized missing behavior or identify it explicitly.

Demonstrate a selected multi-combination action and a single-form action through the same service/review path, source reuse, visible scope/cost, duplicate prevention, one-child failure, reload, stale-result refusal and safe cancellation/reset. Use bounded offline/stub/labelled replay evidence for orchestration; distinguish it from actual permitted live-model evidence. Include correct person/meaning, human edits preserved, draft preview and existing separate release controls. Keep the 100-program scale fixture separate from five meaningful demos and report measured evidence/remaining production gaps in the normal exact-revision handoff. No extra review session or internal approval round. Founder relays the upgraded prompt; no other session was contacted and no maker agreement or formal approval is claimed.

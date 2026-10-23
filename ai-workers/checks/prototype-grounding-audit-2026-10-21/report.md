# Prototype grounding audit — 21 October 2026

**FAIL within the inspected configuration-alignment scope: four Material findings, no separate Minor findings.** This is not a reversal of earlier exact-revision P2/P3/P4 verdicts or a review of the entire unfinished product.

Independent reviewer: Codex, session `01a1598d-8aa1-7ea3-b353-5c5b5e1a9a18`. I did not author the implementation under review. I authored earlier advisory planning/control amendments; those amendments are not independently approved by this report. The founder specifically requested this proactive requirements-grounding audit.

## Revision and evidence

The maker's earlier 90-file handoff manifest is `eafdd3de28b1f1acdfb188f94fd866506c707d86c7f264a11ea9b5088f18d965`. At the audit freeze, **83/90 files matched**; seven had changed during the maker's ongoing work. Consequently this report identifies a **frozen working copy**, not a passing or failing recheck silently attributed to that old manifest.

Exact audit revision: `grounding-audit-frozen-2026-10-21T063943Z`; [audit manifest](audit-manifest.json), SHA-256 **`396e198ef0e98fd80a35fe63bf3e8489f65921a7d635d6b40b740d36867feebd`**. It lists 121 input files and four reviewer evidence files. All 118 originally frozen inputs were rehashed unchanged; three existing fixtures were added for offline reproduction. [Frozen inputs archive](frozen-review-inputs.tar.gz), SHA-256 `d63ed812f339bc91e1470aa2d8b1303a27692dfda9b0dd550a619def25bf5c31`. Dependency trees are external existing installations, not independently audited by this exercise.

**Executed:** the existing engine baseline passed **24/24** in the isolated copy; ten focused offline probes produced six defect observations grouped under findings 2–4, plus controls/observations. See [baseline output](engine-baseline-output.txt), [probe source](alignment-probes.mts) and [results](alignment-probe-results.json). No database, live browser, production service or model calls were made. No maker implementation, keys, expected answers or evidence were changed.

**Inspected:** hierarchy/API/renderer/validation/release code, demo definitions, accepted HTML draft 4.3, working HTML W1 and its authoring data, SA-01B v1.5 §3–7, the 18 October redesign input, relevant decisions, coverage record and maker handoffs/progress.

**Unverified:** full database release bypasses, populated UI/accessibility/100-program behavior, new IMM 5257 semantic accuracy/PDF execution and full P5/P6/P7 journeys. Four live code-freshness checks failed connectivity; current tracked-branch equivalence is Unverified. The Drive changed-after search in the two current master folders returned no files after the latest snapshot; this was not a complete Drive content audit.

**Later status check:** the maker continued API/catalogue UI work after the freeze. A narrow diff inspection found concurrency/permissions/editor changes; the frozen renderer, review-diff validator and three-program demo remained unchanged. See [post-freeze status](post-freeze-status.json), separate from the frozen audit manifest. No full newer revision was reviewed and no finding is closed by those ongoing edits.

## Numbered findings

### 1. Material — family composition is being used as the configuration identity without reconciling the required full path

**Requirement:** [SA-01B v1.5 §4–5](../../../sources/drive-snapshot-2026-10-19-1233/02-functional-requirements/super-admin/SA-01B-content-pack-configurator_v1.5_2026-10-18.md), SA-1B-50: “Pathway (who the client is — Individual or Corporate)”; SA-1B-55: “one row per full combination”; SA-1B-56: “Nothing flows down from a Pathway or a Program”. SA-1B-51 makes inside/outside Canada a case detail. Working one-pager W1 activity 1.1 states: “One row per full combination; nothing attaches above a full combination” ([authoring data](../../tools/s3-working/s3_data.py), around line 275). D279 expressly requires reconciliation of this identity mismatch.

**Observed, inspected:** `studio/web/src/pages/programs.tsx:12–20` offers Pathway/Program and says each composition of people gets one configuration; the seeded Pathway is “Temporary residence”. `studio/api/src/studio.ts:27–61` renders only pathways/direct children, accepts any existing parent without level-order validation, and attaches a composition/configuration to any program node. The sample configurations are family/single/representative variants. Merely having four enum values in the schema does not implement the required four-level authoring journey.

**Impact:** a successful family demo cannot establish the required program/category/sub-category configuration model. It risks duplicating rules by family shape and omitting genuine program variants.

**Required response:** reconcile business hierarchy, saved code terminology and prototype identity explicitly; prove terminal-row configuration, correct parent/level checks and role-based applicability. Preserve existing evidence/keys with an explicit adapter or migration. Do not silently reinterpret sources, merge records by display name or generalize the bounded outside-Canada trial to inland coverage. A material source/decision conflict goes to the founder with a concrete proposal.

### 2. Material — the review change list omits configuration that is included in the release content

**Requirement:** W1 activity 5.1: “Every new or changed item has a decision recorded with who and when.” Its action list includes new/changed document types and settings. Activity 5.3 requires an unchanged reviewed draft and a separate approver; D254 preserves author/submitter/approver separation.

**Observed, executed:** individually changing participants, a used document type's `supplies_facts`, or a derived definition's inputs changes the content hash but produces **zero review items**. An ordinary document-requirement change correctly produces one item requiring SME duty as the positive control.

**Mechanism, inspected:** `studio/engine/validate.ts:69–91` omits `composition`, `document_types` and `derived_fields` from semantic differences, while `snapshot.ts:101–119` includes them in released content. `studio.ts:347–359` also omits several configuration authorship categories; submission/release uses the incomplete list at lines 378–415. A database approval bypass was not executed, so this report does not claim one was reproduced.

**Required response:** cover every behavior-bearing released setting in the review difference and author/approval checks, including creation, change, removal and shared-definition impact. Prove change-only cases and clean unchanged controls through an isolated database release test. Keep nonbehavioral metadata distinctions explicit.

### 3. Material — conditional questions can be unreachable, and hiding a needed form input passes validation

**Requirement:** W1 activity 3.4: “Hiding a field that a form or rule reads is blocked at publishing.” Activity 3.5 requires a source-backed rule to change the right person's questions/forms/documents. D275 requires the common renderer and a visible rule-only question.

**Observed, executed:** an applicable form reads field A, whose question has SHOW if flag B is true. Both questions are placed in a selected section. With B unknown, A is hidden and **B appears in neither questions nor deciders**. Supplying B externally reveals A. A second probe uses HIDE with B=true: the form applies, A is hidden, and the publication validator returns **no problems**.

**Mechanism, inspected:** `render.ts:144–190` collects deciding inputs from forms/documents/rules but not question conditions, then creates questions only from those deciders and mapped form needs. `validate.ts:48–58` validates condition references but does not reject the demonstrated hiding conflict. No actual database publication was attempted.

**Required response:** resolve question-condition dependencies, including person scope, unknown values, chains/cycles and compatible form applicability; reject the demonstrated unreachable/hiding configuration before release. Include positive cases where a form truly does not apply. Separately reconcile the observed pruning of placed questions that no form/rule reads; that observation alone is not counted as an additional confirmed defect.

### 4. Material — the “five sample programs” claim counts participant variants as programs

**Requirement:** founder decisions D274/D275 and the [coverage/demo record](../../problem-1-pathway-setup-and-form-filling/prototype/requirement-coverage-2026-10-20.md), D275 item 1: “Five sample programs use the same mechanisms.”

**Observed:** `studio/api/src/demo.ts:24–47` calls its fixture five sample programs but defines **three program records and five compositions**. The offline source-count probe reproduces 3/5; the maker handoff's walkthrough also describes three programs. A browser suite passing against those fixture counts does not prove the five-program requirement.

**Required response:** provide five distinct, meaningful program records through the same normal path, or obtain an explicit founder amendment. Keep sourced content and illustrative examples labelled; do not invent specialist-verified immigration content to increase a count. The later 100-synthetic-program exercise is a separate usability check.

## What is deliberate, pending, or already supported

The accepted one-pager remains draft 4.3, hash `124df0a2b6ddafe23310f53db713d1705bc3ab33ed08d386d226400937728445`. W1 is `0cdb934e26bec4512f2b99d299d068a444d39c517d22fa86e005633ac9c75576`. Later recorded amendments are weighed explicitly, not treated as accidental drift: D251 section confirmation with per-fact records, D252 fact versus mapping corrections, D253 affected-form stops/warnings, D254 SME duty, D271 synthetic-reader exception, D275 human authoring, and D268 deferred portal/Chrome/signing/government responses. D279/D280/D283 usability work is planned; its absence is not reported here as an unexpected implementation regression.

Previous exact-revision P2 and P3/P4 checks remain evidence for their recorded slice. Existing D30 targeted proof and P0/broader P1 review remain separate pending work. The maker's 06:25:31Z record reports live-model access restored, IMM 5257 released/filled and US$26.72 committed of US$100; this audit did not independently rerun that paid/PDF work. An old blocked-access handoff must not trigger a duplicate paid run.

The existing 41-activity coverage register retains **7 Demonstrated / 12 Partial / 18 Pending / 4 Deferred**, where “Demonstrated” is its defined maker-executed label, not independent acceptance. This audit crosschecked the 41 IDs against the one-pager and examined the implemented configuration slice. It does **not** certify every clause of every team requirement or execute every branch.

Frozen disposition index, not a second editable backlog:

| W1 IDs (each appears once) | Grounding disposition in this audit |
|---|---|
| 1.1, 1.3 | Current upload/launch path inspected; identity finding 1 applies; paid execution not repeated |
| 1.2 | Explicitly deferred portal work |
| 2.1, 2.2 | Existing inventory/whole-text evidence reused; full passage extraction remains partial |
| 3.1, 3.2 | Existing limited mapping/reuse evidence; no full accuracy claim or new answer-key audit |
| 3.3 | Conditional checklist code inspected; not all conditions/person cases executed |
| 3.4, 3.5 | Finding 3; focused negative cases executed |
| 3.6 | Zero eligibility gates is already disclosed/pending |
| 3.7 | Engine controls passed; finding 3 prevents a completeness claim for all generated questions |
| 3.8 | Check data/evaluation inspected; full case validation unverified |
| 4.1 | Existing structure evidence plus engine baseline; hiding/dependency gap in finding 3 |
| 4.2, 4.3 | Previous scorer/expected-answer evidence reused for its exact slice; not rerun |
| 4.4 | Planned P7 dependency holds; no new execution |
| 5.1, 5.2, 5.3 | Finding 2; old P3 release verdict remains valid for its earlier revision/scope |
| 6.1, 6.2, 6.3 | Remaining connected P5 intake/identity/duplicates; not newly accepted |
| 7.1 | Remaining case/filing/participant integration; identity finding 1 must guide it |
| 7.2, 7.3 | Remaining connected P5 upload/intelligence journey; prior maker evidence is not a new Studio review |
| 8.1, 8.2, 8.3, 8.4, 8.5 | Remaining confirmation/conflict/form-review journey; no full execution here |
| 9.1 | Prior PDF component evidence and newer maker report; no PDF execution in this audit |
| 9.2, 9.3 | Integrated validation/form approval remains unverified here |
| 9.4, 9.5, 9.6 | Explicitly deferred signing/submission/government response work |
| 10.1, 10.3, 10.4 | Planned P7 source/open-case/support behavior |
| 10.2 | Existing limited change/release evidence; finding 2 affects the new Studio review path |

## Combination model recommendation and repair sequence

**Business model grounded in SA-01B:** country/pack context → Pathway (Individual/Corporate) → Program → Category → optional Sub-category. One full-combination row at the terminal category/sub-category has a stable identity and its own ordered configuration lines. The same row can apply rules to different people/family shapes; family membership, location and filing stage must not automatically manufacture extra hierarchy levels. A genuine content variant may justify a sub-category, with an explicit reason. Configuration identity, its released version, and a case/filing pinned to that version are different concepts.

**Recommendation, not a newly accepted schema:** reuse the team's existing versioned ProgramDef/line contracts and current stack; keep editable labels separate from stable keys. The saved code uses enum labels PATHWAY/PROGRAM/STREAM/CATEGORY while the business requirement names Category/Sub-category at levels 3/4. Verify the service contracts and record a clear adapter or escalate the semantic conflict; do not simply rename persisted enums. Preserve existing Composition records until an explicit mapping is tested. No new framework, vector database or autonomous-agent system is needed to fix these findings.

The maker should consume findings 1–4 within the current configuration outcome, challenge them with source/evidence where appropriate, fix confirmed behavior and trace each implemented requirement to its source/decision, screen/service and positive/adverse check in the **existing** coverage record. Update stale current status and give one exact manifest plus one consolidated response/handoff after the bounded fixes. Routine internal implementation steps need no extra founder approval. The independent checker then rechecks affected behavior once against that exact revision. Remaining P5/P6/P7 work continues in the recorded order; neither this audit nor the repair constitutes founder acceptance or production qualification.

**Maker relay:** Read this report and NEXT. Reconcile full-combination identity against SA-01B/W1 and the saved code; fix findings 2–4 and any confirmed identity drift, preserving originals, evidence and existing valid components. Use the existing coverage record for source/decision/behavior/test traces and label conscious changes, incomplete work and defects separately. Run focused positive/adverse checks in isolated state, refresh current status and supply one exact manifest/response for independent recheck. Do not repeat the successful live IMM 5257 run merely because the old handoff says blocked. Keep D282's US$100 total/US$5 per-run controls and existing input authority; no new sessions or remote writes.

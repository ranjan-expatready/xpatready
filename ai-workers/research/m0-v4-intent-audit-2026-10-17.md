# M0 v4: intent audit, solution boundaries and action plan

Version 1.0 · 17 Oct 2026 · Lead · local working audit, not acceptance or publication.

## 1. What the founder is trying to achieve

**Generate the product configuration instead of manually building it for each pathway/program combination. Use that first module to establish reusable AI capabilities and decide how the wider AI layer should work.** Two different problems are addressed together in one evolving design. They are neither two unrelated products nor proof that one architecture is already best.

The founder's latest clarification keeps PQR and SQR. It removes repeated manual configuration, not the client stages. Consistent terms: **form, PQR, SQR, OCR upload, agent, PDF, portal**. Agent means firm staff; AI skill means software help. OCR is optical character recognition, followed by extraction and agent confirmation; OCR alone does not verify a fact.

**Access limit:** the read-only adviser scanned the direct human prompts in 75 top-level Claude project session logs, excluding subagents, tool results and generated summaries. The Lead checked the cited configuration and sequencing excerpts directly. This Codex conversation supplies the latest clarifications. This is not access to every conversation in either account. Archived organisation material was read only for D193's comparison.

## 2. Repeated prompt evidence

Times are India time. Session IDs and JSONL line numbers identify the saved logs; no personal names are copied. Direct quotations are short; speech transcription errors remain inside quotes.

| Date and saved source | Exact words | Meaning for M0 |
|---|---|---|
| 9 Oct, 11:53 · session `775cd339-e804-4010-aed1-ddab8fc3af9c`, line 1024 | “task specific or the journey specific”; “the role specific or the entire product specific” | Organisation options were open from the beginning. |
| 11 Oct, 16:51 · `2561ebbc-63e5-4b40-92cb-b4224f1e30d9`, line 4756 | “exactly we know that which microservice or micro agent is failing” | Make a failed capability inspectable; do not assume a microservice architecture is required. |
| 12 Oct, 07:26 · `e310d042-4ca4-4f0a-b9fd-93a742a6c805`, line 7 | “more reliable and trustable and repeatable and consistent in their outputs” | Reliability and repeatability matter more than agent branding. |
| 16 Oct, 17:23 · `d58b28da-aba6-4243-9ab2-e54da378c0f1`, line 110 | “the moment I create a combination, there should be a button create the JSON files or SQR questions” | Generate structured configuration from the combination, not only form connections. |
| Same prompt | “some kind of a dump file, for example, JSON, and that can be rendered using the same template in SQR and PQR for all the clients” | Reusable generated definitions consumed by the product renderer. JSON is an example, not an approved replacement API contract. |
| Same prompt | “one-time activities when the product is getting configured” | Generate at setup, reuse at runtime, update changed content. |
| Same prompt | “not only to get a AI worker, but to get the configuration stuff done” | The business deliverable is useful configuration and case preparation. |
| 16 Oct, 17:41 · same session, line 337 | “Conditional document based on the answers. Conditional question based on the questions.” | Include conditions and document logic, not just visible PDF fields. |
| 16 Oct, 17:57 · same session, line 471 | “barcode should not be broken for the government forms” | Explain actual PDF formats and unresolved barcode route. |
| 16 Oct, 18:01 · same session, line 495 | “we will first solve the the entire SQR, PQR, form setting, uh, form filing, auto-population, PDF, online, all of those” | Module 1 supplies the foundation for the broader AI design. |
| 16 Oct, 19:57 · `1d635df9-8f63-49bb-aa06-48d816d710d1`, line 201 | “we are asking bare minimum in PQR, and then what is necessary from in SQR” | The stages remain different views of shared facts. |
| 16 Oct, 21:38 · `b6ae68c7-dfd4-4295-8271-4862d7bc2efc`, line 386 | “not creating any prototype, rather explaining the entire idea, scope, and functional and business solutions” | The interactive fact example explains the concept; it is not represented as a working product prototype. |
| 16 Oct, 23:03 · `c5001d83-9d21-44f6-ba0e-c5df51f6241f`, line 825 | “all of the feature which we are building today, we plan to build yesterday also”; “The main feature was what is the approach.” | Compare approaches to the same work; do not claim shared facts or rules were newly invented. |

The 17:23 exploratory prompt also proposed “we don't create any normalization”. Subsequent D170 retains one shared name per fact and D197 retains approved connections. The current clarification eliminates manual authoring. It does not reverse those decisions. The latest terminology request is applied to explanatory prose; exact quoted source words remain evidence.

## 3. High-level solution and corrections to the founder's proposed mechanism

1. **Input:** a combination, selected official forms, required documents and applicable official guidance. The specialist/content team confirms coverage. Forms alone omit some eligibility inputs, document rules and process tasks.
2. **Generate:** AI proposes structured fields, sections, tier flags, questions, conditions, document requirements, checks, task definitions and output connections. Reuse known approved content first. Generation produces data, not merely prose.
3. **Validate and release:** check the existing schema, references, types, conditions, sample branches and output connections. Content staff inspect new/unsure meaning; a second person releases the version. A generated file is not automatically published configuration.
4. **Store and render:** the existing database stores approved definitions and case values. The application renders PQR, SQR and agent views. A database does not itself render a UI or government PDF. The final payload/API contract is not selected in M0.
5. **Complete facts:** PQR/SQR answers, OCR upload and agent-only completion refer to the same facts. AI extraction is a proposal until confirmed. Missing/unreadable/conflicting evidence restores the relevant question and produces work to resolve it.
6. **Fill outputs:** approved output connections transfer confirmed facts to the right PDF box or portal control, including person, formatting, answer codes, repeated rows and overflow. One birth date may become three PDF boxes. JSON still needs those connections, or the filler must infer them again each time.
7. **Review and change:** rule checks/read-back compare expected and actual values; AI cross-checks propose findings. The agent fixes a wrong fact once. A wrong connection goes to content staff. Rebuild affected previews and void stale approvals. A submitted government application is not silently altered.

**Who creates master data?** The product already has canonical-field definitions and backend records. Content staff own the library. AI proposes additions and approved label connections during generation; people approve. Engineers integrate the generator with existing schemas/APIs. Start with one combination and grow the library incrementally. Do not create a new database for each combination or require every form worldwide to be mapped first. Cross-country reuse requires the same meaning; scoped requirements remain separate. Shared product definitions do not share client data across firms.

**What is a portal screen?** The live page the agent opens through the extension. It is captured input, not a second manually authored questionnaire. D197 calls for the extension's field list, with a screenshot as reviewer evidence. A screenshot alone does not establish persistent control identities, option values or safe write/read-back. On later fills check the target version, use released connections, read back, and stop if changed. Terms enablement and the person's session remain required. No unrecorded portal visit was made for this revision.

**PDF limits:** AcroForm is supported in the existing backend. XFA/barcode handling is not solved by AI, JSON or the word Acrobat. The team must select a compatible delivery route; an agent using the official form and its validation step remains a possible fallback, subject to the team's answer. No barcode correctness is claimed here.

## 4. Source evidence, exact wording

Source root: `../../sources/drive-snapshot-2026-10-13-1535/02-functional-requirements/`.

| File, version, section | Exact words | Implication |
|---|---|---|
| `super-admin/SA-01B-content-pack-configurator_v1.4_2026-10-12.md`, v1.4 §3.1, SA-1B-1 | “Every question asked anywhere is a canonical field in the library, defined once” | Reuse the existing field concept. |
| Same, §3.1, SA-1-17 | “Rules, scoring, questions and form maps all refer to the same canonical field catalogue.” | The configuration's views and outputs share fact meanings. |
| Same, §3.2, SA-1B-6 | “A field group is a named set of canonical fields that travel together” | Reuse sections/groups rather than duplicate per output. |
| Same, §3.5, SA-1B-35 | “AI never sets a value on a form at fill time.” | AI generates proposals; released rules transfer values. |
| Same, §3.4, SA-1B-21 | “printed on the document, a fixed period from issue, or a period before an event” | Validity needs a defined source and time anchor. |
| Same, §3.4, SA-1B-23 | “expiry only warns”; “ExpatReady warns, it does not block.” | No new blanket expiry submission block. |
| Same, §8, SA-1B-83 | “Each tier pre-fills the next, and no question is asked twice across the three.” | Keep PQR/SQR and eliminate repeated answers. |
| Same, §5, SA-1B-57 | “who (once for the application, or each person in these roles) → only if (a condition) → order” | Existing conditional content structure. |
| Same, §11, SA-1B-97 | “a to-do ExpatReady puts automatically on every case of that row” | Existing standard steps; dynamic missing-fact task details still need design. |
| Same, §0, SA1B-D28 | “Form autofill is parked for Release 1.” | Conflict with D186 remains recorded under D187. |
| Same, §12 | “A deterministic form-filling engine exists on the backend”; “fills AcroForm PDFs byte-identically” | The foundation exists; the complete proposed module does not. |
| `super-admin/SA-01-country-and-immigration-pack-management_v2.4_2026-10-12.md`, v2.4 §3.12 / SA1-D6 | Reference only; no direct excerpt copied here. D179 reconciles SA1-D6's second-person release. | Keep the existing release boundary. Exact SA1-D6 words are retained in that requirement and decision. |
| `../decisions.md`, D170 | “Answers are stored under one shared name per fact” | Keep logical fact reuse; do not infer a schema migration. |
| Same, D177 | “PQR: one per country with blocks”; “SQR: per combination” | Avoid describing PQR as a separate questionnaire per pathway. |
| Same, D182 | “every read value is a proposal until staff confirm it” | OCR/AI confidence never silently verifies a fact. |
| Same, D193 | “The organisation choice is reopened for a fair comparison” | No architecture winner has been proved. |
| Archived `handbook/ai-team-profiles.md` §1 | “Fixed product rules decide what happens next” | Old workers already had safeguards; do not invent a weak baseline. |
| Archived `concept.md` §4 | “Shared skills underneath” | The new design simplifies coordination/experience rather than inventing reuse. |

Immigration values: D50, supplied by the immigration specialist. A six-month example is deliberately unspecified and is not a universal passport rule. Legal: **Unconfirmed: no counsel (AIW-D94).**

## 5. Validation and task treatment

**AI generation:** explain the check, proposed scope, source, input facts, comparison date, condition and examples. Raise ambiguity instead of inventing a threshold. Exact types, references and fixed comparisons use product rules. Semantic inconsistencies can be AI findings; people resolve them. New task display/provenance/duplicate/completion details are a Proposal for M2 and not a claimed existing contract. Reuse existing task/standard-step records. Client task, agent task and permitted AI work are responsibilities, not three new worker products. Automatic-start/on-off defaults remain Q13.

**Do not add process:** no separate Validator service or approval layer has been created. Existing content release, fact confirmation and action-specific approval stay. The final mapping of generated rules/tasks to the current contracts is still to be checked with the team.

## 6. Options: what has actually been evaluated

**Configuration:** manual authoring; fresh AI fill per use; first-case-only connections; shared generated configuration and approved reusable output connections. D169/D197 retain the latter. Its benefit is repeatable transfer and reusable review; its cost is content ownership, testing and updates. Form filling and broader configuration are complementary parts, not competing formats.

**Coordination:** role workers, case-stage agents, shared skills in the case flow, co-pilot only. Each may use the same reader, facts, calculators, permissions and approvals, with/without a co-pilot overlay. Standing presentation is one assistant (D124); comparison reopened D193. Risks in the cards are Lead judgment, not measured findings. No external benchmark scores these four implementations. M1 must compare reliability, review effort, firm management, cost and comprehension on the same cases.

**Native agent frameworks/providers:** no framework/provider has been selected by this audit. M1 should compare the existing product invoking small tools directly, a fixed workflow, and an agent framework only where flexible coordination adds demonstrated value. Check permitted actions, resumption after failure, run records, tests, cost and provider/region constraints. Avoid adopting a framework solely because a vendor calls it an agent. This is a next-segment action, not a hidden M0 implementation choice.

**Document structure recommendation:** one sequential visual overview plus expandable mechanisms and indexed appendices. Keep M1's technical comparison a separate milestone artifact. Two independent pitch documents would obscure why the first module teaches the broader AI organisation. This recommendation can change if reader testing shows otherwise.

## 7. Competitor check, 17 Oct 2026

- [Visto public product page](https://visto.ai/): vendor claims include extension-based government web-form autofill from client profiles, supported-PDF filling, selected forms and conditional document/task lists. The public page does not establish its private schema, screenshot technique, saved-map architecture or measured reliability. This revision does not copy its implementation or content.
- [FormGoat extension page](https://formgoat.ai/chrome-extension): vendor claims semantic matching of documents/profile facts to differently named web fields. It does not establish our product's immigration coverage or safe execution.
- The founder supplied `pisto.ai`; direct retrieval failed. Do not silently substitute Visto or state they are the same company. Visto was already an explicit comparator in the project. No sign-in, trial or extension installation occurred.

## 8. Freshness, verification and next actions

Read-only checks during this revision (17 Oct India time): all four tracked code heads match their captures. Drive modified-after search found the same two non-requirement trackers only. SA-01B, SA-01 and AG-07 live metadata (IDs, names, sizes, modification times) match the current snapshot. No refreshed source capture was needed. Relevant live checks are recorded in `../checks/m0-v4-verification-2026-10-17.json`.

**M0 revision implemented:** connected overview; complete configuration explanation; master library ownership/growth; JSON illustration; PQR/SQR kept; agent/OCR/task flow; validation; PDF/portal mechanism; fair options; combined benefits; repaired card cells; progressive disclosure; indexed appendices; return-to-origin navigation. Existing depth remains: eight mechanisms, twelve appendices, 34 keyed skills.

**Completed verification:** static structure and all internal targets; script syntax; mock-DOM tests of all 49 internal links, back/forward restoring scroll/focus/open cards, three fact corrections/reset and print state; independent advisory review with no unresolved Material findings after fixes. All six external links were retrieved through the web tool. The two final Minor items (rules-only samples and saving the verification file) were applied.

**Still before acceptance:** local visual/interaction review and the separate Claude checker. The app's local-file browser restriction remains; do not bypass it. A code-level navigation test is not a visual browser pass. No external publishing or repository change is authorised.

**M1:** same-case organisation comparison; direct product workflow versus agent framework where justified; Q13; PDF/XFA and portal routes. **M2:** one sanctioned combination end to end, exact schema/API fit, generated PQR/SQR, OCR facts, agent view, dynamic task lifecycle and a filled output. **M4:** timed baseline, independent licensed safety review and measured cost. Actual Express Entry field inventory remains the specialist/content team's dependency; workload scenarios are not measured field counts.

**Quality:** rubric and before/after scores live in the concept page. They rate explanation coverage, not proven solution performance. Visual usability and architecture superiority remain unverified. After advisory review the explanation scores 26/35 (about 7.4/10); the retrospective v3 baseline is 11/35 on this rubric. Scores are Lead judgment, not the earlier buyer scores or proof of product performance. Do not promote an independently reviewed explanation to a measured product result.

## Change log

- 17 Oct 2026: saved the founder's clarifications, prompt evidence, corrections, implemented M0 scope and later actions. Naming Xpato/Xpartian remains parked. v3 page/builder/CSS archived unchanged before revision.

**Next-session model guidance (Lead judgment, 17 Oct):** GPT-6.1 Sol with high reasoning for the Lead. [Official model page](https://developers.openai.com/api/docs/models/gpt-6.1-sol) describes complex coding/professional work at lower cost than Astra; [model-selection guidance](https://developers.openai.com/api/docs/guides/model-selection) recommends task-specific comparison. The app exposes this model here. This is a work-session recommendation, not a selection of the product’s production provider. The separate checker remains as README §1 specifies.

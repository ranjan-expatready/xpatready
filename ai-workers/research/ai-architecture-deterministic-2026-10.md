# Deterministic shell, AI core: architecture research for Step R (AIW-D84)

**Date:** 11 Oct 2026. **Author:** research subagent for the Lead (maker). **Status:** research input for Step R; not yet through the adversarial checker. **Asked by:** the Lead, on the founder's direction AIW-D84 (`../decisions.md`), with the founder's later addition on structure and naming (section 9).

**What this is.** Best practice from 2025 to 2026 for building AI that sits inside a fixed, rule-driven product, mapped onto Expat Ready's existing parts: the Conductor (workflow engine), the Doers (Minder, Filler, Biller, Signer and the four AI Doers Reader, Sorter, Writer, Checker), "Needs you" (approval inbox), autonomy levels (AUTO, APPROVE, OFF), permission keys, Practice Packs and the audit log. It builds on, and does not repeat, `ai-in-regulated-work-2026-10.md` (regulators, failures, build patterns) and `../commercial/provider-and-cost.md` (providers and cost per file).

**How to read the evidence labels.**
- **[V]** Verified: read on the vendor's or standards body's own page, or in the primary paper.
- **[VC]** Vendor claim: the vendor says it about its own product; not independently checked.
- **[S]** Secondary: a third-party article, summary or forum post; treat as indicative.
- **[I]** Inferred: our own reasoning from the sources, not a sourced fact.

Numbers in square brackets, such as [12], point to section (e). Every web source was accessed on **11 Oct 2026**. No personal names are used (AIW-D35); authors are described by organisation.

---

## (a) Summary for the founder (12 lines, plus 3 on structure and naming)

1. The industry agrees with your direction: fixed rules and workflow for every step that must always come out the same; AI only to read, sort, write and check language. Anthropic, Google, Microsoft and OpenAI all say "start with a workflow, not a free-roaming agent".
2. No AI vendor guarantees a correct answer. Their "structured output" features guarantee only the *shape* of the answer, so our own rules must check every AI answer before a person sees it.
3. Our Conductor is already the right shell. We do not need to buy an agent framework: each AI call becomes one step in a Conductor recipe, with a fixed input and a fixed answer form.
4. A skill is a small, numbered-version recipe with its own test set, cost cap and health light. One Document reader skill serves every AI teammate that needs it.
5. The AI never holds permissions of its own. Each run carries a narrow, short-lived pass cut from the person's delegation, and the platform checks it at every step.
6. Text inside a client's document must never choose what the system does next. Industry security research says this is the only reliable defence against hidden instructions in documents.
7. Every skill run leaves a record: what was present, what was missing, which rule failed and why, the model used, tokens and cost. An open standard for these records exists.
8. Your "driving test" is standard practice: test set, then shadow, then live, with automatic drop back. Licensed experts must grade; AI graders only help, after being checked against experts.
9. Model cost for a typical prepared file is about two Canadian dollars on the one strong model we can run in Canada today. It is controlled with small models for sorting, re-used instructions (caching), and hard caps per call, per file and per firm.
10. Canada is the binding constraint. Google's own page (updated 9 Oct 2026) promises Canadian processing for only one current model, Gemini 3.5 Flash. Claude, OpenAI and Amazon's own models have no Canada-only option today.
11. This corrects our earlier provider file, which read a different Google page and listed newer Gemini models in Montréal. Back-up routes are Cohere running in Canada, or open models we host in Canada; both need testing.
12. What not to do: no free-roaming agents, no AI supervising AI, no second AI as the only checker, no parallel permission system, no big framework bet.
13. Leading products all use three levels: an agent per role, reusable abilities, then steps. Salesforce renamed its middle level to "subagents" in 2026; legal tools such as CoCounsel sell "skills".
14. Recommended structure: one central catalogue of versioned skills that the role AIs share; not separate code per AI, and not an AI manager routing work to other AIs.
15. Recommended names: "AI teammate" (shown as "Case Officer's AI"), "skill", "step". Avoid "agent", "worker", "assistant" and "persona", which already mean other things in our documents.

---

## (b) Findings and recommendations

### 1. Deterministic shell, probabilistic core

#### 1.1 The design guidance from the four big vendors

| Source | What it says | Label |
|---|---|---|
| Anthropic, "Building effective agents" (19 Dec 2024) [1] | Two kinds of system. **Workflows**: "LLMs and tools are orchestrated through predefined code paths". **Agents**: "LLMs dynamically direct their own processes and tool usage". Patterns: prompt chaining (with programmatic checks between steps), routing, parallelisation, orchestrator-workers, evaluator-optimiser, then autonomous agents. Advice: find the simplest solution and add complexity only when it demonstrably helps; start with direct API calls, because frameworks hide prompts and make debugging harder; design tools so they are hard to misuse. | [V] |
| OpenAI, "A practical guide to building agents" (2025) [16] | Start with a single agent; go multi-agent only when needed. Layered guardrails (relevance, safety, PII, rules-based blocklists and regex, tool risk ratings). Hand over to a person when failure thresholds are exceeded or for high-risk actions (refunds, payments). | [S] (summaries; original PDF not read) |
| Google Cloud, "Choose a design pattern for your agentic AI system" [15]; Agent Development Kit [17] | The first question is whether the task can be done in predefined workflow steps; agents are for open-ended problems. ADK offers **workflow agents** (Sequential, Parallel, Loop) as the deterministic spine and LLM agents for judgement steps. | [V] guide framing; [S] ADK article |
| Microsoft Agent Framework 1.0 (successor to Semantic Kernel and AutoGen, Apr 2026) [14][77] | **Agents** for open-ended reasoning; **workflows** are graph-based, "deterministic, repeatable processes" with type-safe routing, checkpointing and human-in-the-loop pauses. | [S] (docs mirrors and blogs) |

**Reading [I].** All four say the same thing in different words: put a fixed workflow around the model, and let the model loose only where the steps cannot be known in advance. Expat Ready's recipes are known in advance (they come from Practice Packs and the Conductor), so the product is a *workflow* system in Anthropic's terms, with AI calls at fixed points. Nothing in our scope needs an autonomous agent.

#### 1.2 The techniques, with what each guarantees and what it cannot

| Technique | What it guarantees | What it cannot guarantee | Label |
|---|---|---|---|
| **Structured outputs, Anthropic** (`output_config.format` JSON schema; `strict: true` on tools) [2] | Constrained decoding: "Always valid", "Guaranteed field types and required fields", no retries for schema violations. | Truth of the values. Not enforced: numeric `minimum`/`maximum`, string `minLength`/`maxLength`, array bounds beyond `minItems` 0 or 1, recursive schemas. On a **refusal** (`stop_reason: "refusal"`) or **`max_tokens`** the output "may not match your schema". Enum values may come back with **changed capitalisation** with no error. The schema itself is cached up to 24 hours. | [V] |
| **Structured outputs, OpenAI** (`strict: true`) [3][4] | Schema-conforming JSON; only a subset of JSON Schema; `additionalProperties: false` required. | Refusals are reported in a separate `refusal` field; truncation at the token limit gives non-conforming output; failures are "rarer but more catastrophic" (loops to the token limit). | [S] |
| **Structured outputs, Google Gemini** (`responseJsonSchema`) [5] | Since Nov 2025, standard JSON Schema on all supported Gemini models, including `anyOf`, `$ref`, `minimum`/`maximum`; key order preserved. | A third-party 2026 guide still calls it a subset; test any advanced keyword you rely on. | [V] announcement; [S] caveat |
| **Validator libraries** (Pydantic models; Guardrails AI) [6] | The checks you wrote run every time. Guardrails AI offers on-fail actions: re-ask, fix, filter, refrain, exception; all failures are logged. Its own docs recommend **exceptions** over re-asks once use cases get complex, so the application can route by error type. | Anything you did not encode. LLM-based validators are themselves probabilistic. | [V] |
| **Guardrail layers** (NVIDIA NeMo Guardrails) [7][8] | Five rail types: input, dialog (Colang flows), retrieval, execution (tool inputs and outputs), output. | Each rail that calls a model adds latency (third parties cite 100 to 500 ms) and false positives; one comparison shows five 90%-accurate guards in a row would wrongly flag about 41% of good requests if errors were independent. | [V] rail types; [S] numbers |
| **Rules engines checking AI output** [10]; AWS **Automated Reasoning checks** in Bedrock Guardrails [9] | Practice pattern: the model returns a typed proposal; code checks schema, then allowed values, state, permissions and business rules; one repair pass; then a person or a safe default. AWS's product checks answers against a policy written in formal logic; GA 6 Aug 2025 in US and EU regions. | AWS markets "up to 99%" verification accuracy (**vendor claim**, no independent benchmark found). AWS's own docs say it "will not protect against prompt injection attacks". Not listed for a Canadian region [I from the region list]. | [S] pattern; [V] GA and limits; [VC] 99% |
| **LLM as a function inside a durable workflow engine** (Temporal, Inngest, AWS Step Functions, Microsoft workflows) [11][12][13][14] | Orchestration code is deterministic and replayable; each model call is an *activity* or *step* with retries and backoff; completed results are stored, so a crash **replays the recorded model answer** instead of calling again (Temporal) or returns the memoised result (Inngest). Step Functions calls Bedrock directly and can pause for a person with a task token for up to one year. | The model call itself stays non-deterministic. Retries are at-least-once, so any step with a side effect must be idempotent [S]. | [V] product docs; [S] details |

#### 1.3 Recommendation for Expat Ready

1. **The Conductor is the deterministic shell. Do not add an agent framework [I].** Each AI Doer call (Reader, Sorter, Writer, Checker) is one step in a Conductor recipe, exactly like a Minder or Filler step. The recipe, not the model, decides what happens next. This is Anthropic's "workflow" and Google's "workflow agent" pattern.
2. **Every AI step returns a typed proposal through the provider's structured-output feature**, and the Conductor treats a refusal, a `max_tokens` stop or an unparseable answer as a *named failure*, never as data [2].
3. **Then three checks, in order, all deterministic code:** (a) our own schema validator, which re-checks the bounds providers do not enforce (lengths, ranges, enum case) [2]; (b) field rules (formats, dates, document-type rules); (c) the Practice Pack rules for that country and programme. Only a proposal that passes all three goes to "Needs you".
4. **One bounded repair at most.** If a check fails, the step may re-ask once with the exact rule IDs that failed; after that it stops and sends "could not prepare: rule X failed" to Needs you. Guardrails AI's own guidance favours this exception routing for complex cases [6].
5. **Store each AI step's answer in the run record before using it**, so a retry or crash recovery re-uses the stored answer instead of calling the model again (the Temporal/Inngest pattern) [11][12]. Whatever runtime the Conductor is built on should provide this; if it does not, add it to the Conductor, not beside it [I].
6. **Use an AI Checker only as an extra layer after the rule checks, never instead of them** (see section 2 and (d)).

---

### 2. Which tasks should go to AI

#### 2.1 A practical test (five questions) [I, built on [1][10][15][26]]

Ask in order; the first "yes" decides.

| # | Question | If yes |
|---|---|---|
| 1 | Does the result change a legal, financial or consent state, or reach a client, a government body or money? | **A person decides.** AI may only prepare a proposal (FD-16; AIW-D13). |
| 2 | Is there one right answer computable from structured data or a published rule? | **Rule or code** (Doer, Pack rule). No AI. |
| 3 | Is the input unstructured language, a scan or an image? | **AI may propose**, with a typed output and a rule check after it. |
| 4 | Can a wrong AI answer be caught cheaply by a rule, a cross-check or the person reviewing? | AI allowed at APPROVE. If not, keep it OFF until a test set shows it is reliable. |
| 5 | Must it behave the same every time (consistency, not just "usually right")? | Measure consistency (pass^k, section 5) before going live; otherwise keep to rules. |

Industry sources converge on the split "model for recognition, summarisation, classification and extraction; code for validation, calculation, permissions and final actions; confidence scores only for routing, never as facts" [10] [S]. OWASP's "Excessive Agency" entry adds: authorisation happens in the downstream systems, never by the model, and high-impact actions need a person's approval [26] [S].

#### 2.2 Examples from regulated document work

| Domain | Rules or code | AI may propose (person or rule confirms) | AI must never decide | Evidence |
|---|---|---|---|---|
| **Legal** | Deadline arithmetic; fee tables; form-field mapping; citation *format* | Extract dates, names and facts from letters; first drafts; summaries; labelling documents | Legal advice; eligibility; whether to file; any case-law citation without verification; a person's own evidence | Legal research AI tools hallucinated in 1 of 6 or more queries (Stanford, 2024) [69] [V]; IRB notice forbids AI writing or changing a person's evidence (see `ai-in-regulated-work-2026-10.md`) |
| **Finance** | Totals, tax, trust-account balances, payment posting | Matching a payment with a messy reference to an invoice; reading a receipt | Moving, refunding or recording money | Canada's bank regulator OSFI: Guideline E-23 (final 11 Sep 2025, in force 1 May 2027) explicitly covers AI/ML models with risk-based testing and monitoring across the model lifecycle [66] [V via law-firm summary] |
| **Health** | Drug-interaction tables, dosing limits, codes from a fixed list | Drafting a visit note from a recording (an "AI scribe") | Treatment; prescriptions | Ontario's Auditor General (May 2026) tested 20 approved AI scribes on simulated visits: tools invented treatment steps; **12 of 20 recorded a different drug** than the one prescribed; 17 of 20 missed mental-health details; accuracy was only 4% of the procurement score, and no sign-off feature was required [67] [V via press] |
| **Government decisions (Canada)** | n/a | n/a | n/a | The federal Directive on Automated Decision-Making (amended 24 Jun 2025) requires an impact assessment and published peer review before launch; existing systems had until 24 Jun 2026 to comply [68] [V]. It binds federal institutions, not Expat Ready, but shows how Canadian regulators think [I]. |

**Lesson from the health example [I]:** an approved tool that a professional "must review" still produced dangerous errors, and the review was not enforced in the product. For Expat Ready, the review in Needs you must be a recorded, enforced step, not advice.

#### 2.3 Recommendation for Expat Ready

1. **Classify every step in every recipe with the five questions** and record the answer in the skill's manifest (section 3). The carve-out register (`../design/ai-carve-out-register-2026-10-11.md`) is the right home for the results; this research supplies the test, not new rows.
2. **AI never verifies a value, converts a lead, files, signs, sends or moves money** (these are already decisions on record: FD-16, AIW-D13, AIW-D44). The Filler fills only from verified values; the Signer and Biller stay deterministic.
3. **AI proposes; Practice Pack rules check; a person confirms.** Pack rules are the "rules engine" of section 1.2; no new engine is needed [I].
4. **Default autonomy for any AI-produced output is APPROVE.** AUTO only for internal-only outputs, after shadow evidence (AIW-D71, AIW-D80). OFF until the skill passes its test set (AIW-D83).

---

### 3. Reusable skills or micro-agents

#### 3.1 How production systems package reusable abilities

| Mechanism | What it is | Versioning and sharing | Label |
|---|---|---|---|
| **Anthropic Agent Skills** (open spec at agentskills.io, Dec 2025) [18][19][20] | A folder with `SKILL.md` (YAML `name`, `description`; optional `license`, `compatibility`, `metadata`, experimental `allowed-tools`), plus `scripts/`, `references/`, `assets/`. **Progressive disclosure**: about 100 tokens of metadata always loaded; instructions under about 5,000 tokens loaded when triggered; files only when read; scripts run and only their output enters context. | Skills API: each new version is "a complete snapshot, not a delta"; pin `version` to an exact ID or use `"latest"`; Anthropic recommends exact versions; up to 20 skills per request; custom skills are shared workspace-wide, so use a workspace per tenant. **Not covered by zero data retention.** **Not supported on Google Cloud** (Vertex) [54]. Anthropic warns that a malicious skill can exfiltrate data: treat skills like installing software. | [V] |
| **Tool or function calling** [1][2] | The model asks the application to call a named function with typed arguments; the application runs it. `strict: true` validates arguments against the schema. | Versioned with the application code. Anthropic: write tool descriptions like docstrings for a junior developer and make tools hard to misuse. | [V] |
| **MCP (Model Context Protocol) servers** [21][22] | A standard way to expose tools and data to any model client. Spec 2025-11-25: for HTTP servers, authorisation is OAuth 2.1 with the MCP server as a *resource server*; incremental scope consent added. | MCP Registry is in **preview** ("breaking changes or data resets may occur"); each published `server.json` version is immutable; semantic versioning recommended. A registry listing "does not prove security or tool quality" [S]. | [V] spec; [V] registry |
| **OpenAI Agents SDK handoffs** [23] | A handoff appears to the model as a tool `transfer_to_<agent>`; the receiving agent takes over the conversation; `input_filter` controls what history it sees. **Agents-as-tools** (`Agent.as_tool`) keep the caller in control. | In code. | [V] |
| **LangGraph subgraphs** [24] | A compiled graph used as a node in another graph; share state keys, or map state in and out. Checkpointing per call (default), per thread, or stateless; interrupts for human approval propagate to the top graph. | In code. | [V] |
| **Prompt and skill registries with labels** (example: Langfuse) [25] | Each prompt version gets a number; **labels** (`production`, `staging`, tenant or experiment labels) point to versions; code fetches by label. | Promotion = move the `production` label; **rollback = move it back**, no redeploy. Traffic splits for A/B are in your own code. Protected labels are outside the open-source core [S]. | [V] |

#### 3.2 One skill, many AIs, each with its own permissions

Three verified building blocks combine into one pattern [I]:
- the skill holds **no** permissions of its own; Anthropic's subagents and skills restrict *tools*, not data rights [19][75];
- authorisation is enforced **downstream**, in the system the tool touches, "in the user's security context" (OWASP LLM06) [26] [S];
- the caller passes its identity and scope into each run; MCP and the IETF agent-delegation drafts do this with scoped OAuth tokens [21][47].

So a Document reader skill called by the Case Officer's AI runs with the case officer's delegated keys; the same skill called by the Intake AI runs with the intake person's keys. Same code and same version; different rights per run.

#### 3.3 Versioning and release (what the evidence supports)

- **Pin everything that changes behaviour together** [I from [20][38]]: model snapshot, prompt text, output schema, validators, referenced Pack rule versions and the test set. Behaviour of the "same" model has drifted between dated snapshots (GPT-4 prime-number accuracy fell from 84% to 51% between March and June 2023) [38] [V].
- **Exact versions in production; "latest" only in test** (Anthropic's own advice) [20] [V].
- **Release by label, roll back by label** [25] [V].

#### 3.4 Recommendation for Expat Ready

1. **Build our own skill registry as a platform table, not on Anthropic's Skills API or MCP, for Release 1 [I].** Reasons: the Skills API is not zero-data-retention and is not offered on Google Cloud [19][54]; the MCP Registry is still in preview [22]; and our skills are recipes over our own Doers, not files for a coding sandbox. The `SKILL.md` layout is a good *authoring format* for each skill's human-readable card (name, description, when to use, examples, edge cases).
2. **A skill = one versioned Conductor recipe template plus a manifest.** The manifest lists: inputs and preconditions; output schema; the steps and their types; the **maximum** permission keys it may ever use; Pack rules it calls; model route per step; token cap per step and per run; test set ID, pass bar and floor (AIW-D83); owner role.
3. **Version a skill as one bundle** (prompt, model snapshot, schema, validators, Pack rule versions, test set). Any change in the bundle is a new version and goes through the driving test (section 5), shortened where the change is small.
4. **Promotion and rollback by label** (`shadow`, `live`) per skill version, per firm if needed.
5. **No MCP inside the product for Release 1 [I].** Revisit when firms ask to plug outside tools in; then expose Expat Ready's own actions as an MCP server behind the same permission keys.

---

### 4. Observability and diagnosis per skill

#### 4.1 Tracing standards and tools

| Item | What it offers | Residency fit | Label |
|---|---|---|---|
| **OpenTelemetry GenAI semantic conventions** [27] | Standard span names and attributes for model calls, agents (`invoke_agent`) and tools (`execute_tool`), plus token-usage metrics. Moved to a dedicated repository; still **Development** status in 2026, so names may change: pin the version. | Neutral (a format, not a host). | [V] page and repo; [S] status |
| **Langfuse** [28][25] | Tracing (OpenTelemetry-based), prompt versions, datasets, LLM-as-judge and code evaluators. Core MIT-licensed and self-hostable since June 2025; acquired by ClickHouse in Jan 2026. | Self-host in Canada possible. | [VC] |
| **Arize Phoenix** [29] | Tracing on OpenTelemetry (OpenInference conventions), evaluators. Licence is Elastic License 2.0 (source-available), though the vendor calls it open source. | Self-host possible. | [S] |
| **LangSmith** [30] | Tracing and evaluation. Self-hosting requires an Enterprise plan; in its "Hybrid" mode the observability data sits in the vendor's control plane. | Full self-host only. | [S] |
| **Braintrust** [30] | Evaluation and logging. Hybrid mode keeps logs and experiments in your own data plane; the vendor hosts user identities in the US. | Hybrid or full deployment. | [V] docs |

#### 4.2 Failure taxonomies

- **MAST** (UC Berkeley and others, NeurIPS 2025) [31] [V]: 14 failure modes in three groups (system design or specification, inter-agent misalignment, task verification), from over 1,600 annotated traces of seven multi-agent frameworks; inter-annotator agreement kappa 0.88. Two of the three groups are about agents talking to agents or failing to verify, which a fixed recipe with rule checks removes by design [I].

#### 4.3 "What was missing, where and why"

Patterns that work [I, built on [2][6][10]]:
1. **A deterministic precondition step before every AI step**: are the required inputs present, readable, in an allowed format, and permitted for this person? If not, stop with `missing_input: <field>` before spending a token.
2. **Explicit "not found" in every output schema**: every field is `{value, source, confidence}` or `{not_found: true, reason: <enum>}`, so the model is never forced to invent.
3. **Provider stop reasons as named failures**: `refusal`, `max_tokens` [2].
4. **Validator failures carry the rule ID** that failed (schema, field rule, Pack rule) [6].

#### 4.4 Showing agent activity to end users

| Product | What the user sees | Label |
|---|---|---|
| GitHub Copilot coding agent [32] | A "View session" log per pull request: commands run, files changed, tests run, the agent's reasoning and tools used; also streamable from the command line. | [V] |
| ChatGPT agent [33] | Confirmation before high-impact actions; a person can take over the browser; "watch mode" on sensitive sites; no screenshots while the person is in control. | [V] |

#### 4.5 Recommendation for Expat Ready

1. **One run record per skill run, written to our own audit store in Canada**, with one child record per step. Fields: skill ID and version; AI teammate; person and delegation record ID; firm; file; trigger; preconditions checked (pass/fail per input); for AI steps, model and snapshot, region, tokens in/out, cached tokens, cost, latency, stop reason; validator results with rule IDs; Pack rule versions; outcome; who approved or rejected in Needs you and what they changed. Name fields after the OpenTelemetry GenAI conventions so a tool can read them later [27].
2. **One closed list of failure codes, shared by all skills** [I], so "why" is always one of: `missing_input`, `unreadable_input`, `not_permitted`, `budget_exceeded`, `provider_error`, `timeout`, `refusal`, `truncated`, `schema_failed`, `rule_failed:<rule ID>`, `pack_conflict:<rule ID>`, `low_confidence`, `person_rejected`, `person_edited:<fields>`.
3. **Health light per skill per firm**, computed by rule from run records: green, amber or red on accuracy (share of proposals the person accepted unchanged), failure rate by code, cost and latency. Red below the floor triggers the automatic drop to shadow (AIW-D83).
4. **If a tracing tool is wanted, self-host Langfuse (MIT core) in a Canadian region [I]**; do not send traces with client data to a US-hosted service.
5. **In Needs you, show each proposal with an expandable step view**: what it read, what it proposed and from which page, which rules passed, what failed and why, who approved. This matches what users now see in GitHub Copilot and ChatGPT [32][33] and AIW-D81.

---

### 5. Evaluation per skill

#### 5.1 What the evidence says

- **Three kinds of grader**: code-based, model-based and human; read transcripts to check the graders; distinguish **pass@k** (at least one of k tries succeeds) from **pass^k** (all k succeed). A worked example: 75% per try gives about 98% pass@3 but about 42% pass^3 (Anthropic, Jan 2026, as summarised) [34] [S].
- **LLM-as-judge is weaker in expert fields.** A 2026 scoping review of 49 healthcare studies found 26.5% used no expert validation and a median of three experts where they did; it rates gold-standard expert reference answers as the strongest validation [35] [V]. A legal benchmark paper warns judges favour their own model family [36] [V]. Position and verbosity biases are widely reported [S].
- **Shadow mode** is an established release practice: Amazon SageMaker copies a share of live requests to a shadow model that returns nothing to users; default 7 days, maximum 30; then promote or discard [37] [V].
- **Drift**: the "same" model changed behaviour between snapshots [38] [V]. Pin snapshots in CI, or results move when the vendor updates the model [39] [S].

#### 5.2 Tools

| Tool | Use | Note | Label |
|---|---|---|---|
| promptfoo [39] | Test cases and assertions in config; GitHub Action compares a pull request against the base branch; red-team scans. | OpenAI announced its acquisition in Mar 2026 and said the open-source project continues. Use pass-rate thresholds, not 100%, for model-graded checks. | [S] |
| Inspect (UK AI Security Institute) [40] | Python framework: datasets, solvers, scorers, tasks; MIT licence. | Runs locally against any provider. | [V] |
| OpenAI Evals and trace grading [41] | Graders on full agent traces; datasets. | Hosted by OpenAI, so client data leaves Canada. | [V] |
| Braintrust, LangSmith, Langfuse [28][30] | Datasets, experiments, LLM judges, production scoring. | See residency notes in 4.1. | [V]/[S] |

#### 5.3 Recommendation for Expat Ready (the driving test, AIW-D83, made concrete)

1. **Test set per skill**, written and graded by a licensed expert: real-file cases (de-identified), each with the expert's correct answer and the expected failure codes (including "not found"). The expert's answer is the reference; LLM judges may pre-sort but are calibrated against the expert and never decide pass or fail alone [35].
2. **Bars measured on the right metric**: field-level accuracy, rate of correct "not found", and **consistency (pass^k)** for any skill whose output reaches a client draft [34].
3. **Regression gate in CI**: any change to the skill bundle (prompt, model snapshot, schema, validator, Pack rule) re-runs the test set; merge is blocked below the bar. promptfoo or Inspect, run on our own infrastructure in Canada, both fit [39][40].
4. **Shadow 2 to 4 weeks** (AIW-D83): the skill runs on real files, nothing is shown; its proposals are compared, by rule, with the values the person finally verified.
5. **Live at APPROVE**, with the health light watching accepted-unchanged rate; **automatic drop to shadow** when the floor is breached over an agreed window (the Lead and the immigration specialist set window and floor).
6. **Drift watch**: a weekly re-run of a frozen slice of the test set against the pinned model; any provider model change is a new skill version.

---

### 6. Tokens and cost

#### 6.1 Prices in October 2026 (USD per million tokens, standard tier)

| Model and route | Input | Output | Cache read | Canada processing? | Label |
|---|---|---|---|---|---|
| Gemini 3.5 Flash, Vertex, regional ("non-global") | $1.65 | $9.90 | $0.165 | **Yes, Montréal** [53] | [V] [43] |
| Gemini 2.5 Pro, Vertex (prompts up to 200k) | $1.25 | $10.00 | $0.125 | Yes, Montréal, but retirement "not before 16 Oct 2026" [62] | [V] [43] |
| Gemini 2.5 Flash, Vertex | $0.30 | $2.50 | $0.03 | Yes, Montréal, same retirement window | [V] [43] |
| Gemini 3.5 Flash-Lite, Vertex, regional | $0.33 | $2.75 | $0.033 | **No** Canada commitment [53] | [V] |
| Claude Haiku 5.5 (prompts up to 100k) | $0.10 | $0.50 | $0.01 | No (global or US) [55] | [V] [42] |
| Claude Sonnet 5.5 | $2 | $10 | $0.10 | No | [V] [42] |
| Claude Opus 5.5 | $4 | $20 | $0.20 | No | [V] [42] |
| OCR: Google Document AI Enterprise OCR | $1.50 per 1,000 pages | | | Montréal is a "limited support" region [63] | [V] [46] |
| OCR: Amazon Textract plain text | about $1.50 per 1,000 pages (US); forms about $50 per 1,000 | | | Canada Central since 2020 [64] | [S] [46] |

Other verified price levers [42] [V]: Anthropic prompt-cache **reads cost 0.1x input** (0.05x on Opus and Sonnet 5.5), writes 1.25x (5-minute) or 2x (1-hour); the **Batch API halves** input and output prices; US-only processing on Anthropic costs **1.1x**; regional and multi-region endpoints on Google and Amazon carry a **10% premium**; Claude 4.7 and later use a tokenizer that produces **about 30% more tokens** for the same text.

#### 6.2 Proven cost controls

| Control | Evidence | Label |
|---|---|---|
| **Model routing** (small model for easy cases) | Learned routers kept 95% of the strong model's quality while cutting cost by over 85% on one benchmark (MT Bench), 45% on another; routers trained on one kind of data did poorly on out-of-distribution questions until given labelled examples [44]. | [V] |
| **Prompt caching** | Cache reads at 0.1x or less of the input price [42]. Our stable prefix (skill instructions plus Pack rules) is the cacheable part [I]. | [V] |
| **Batching** | 50% off for non-urgent work [42]; not available for Claude on Google Cloud [54]. | [V] |
| **Budgets per tenant, team, key** | LLM gateways such as LiteLLM support `max_budget` with a reset period at organisation, team, user and key level, soft-budget alerts, and reject requests once any budget is exceeded; by default no budget is enforced [45]. | [S] |

#### 6.3 Cost per prepared file, recomputed for the Canada route

Using the team's own typical file (`../commercial/provider-and-cost.md` §3.3: 435,000 input and 56,200 output tokens; 78 Reader page calls) with the verified Gemini 3.5 Flash regional price [43] [I arithmetic]:
- model: 0.435 × $1.65 + 0.0562 × $9.90 = **$1.27**;
- OCR: 78 pages × $1.50 per 1,000 = **$0.12**;
- total about **$1.39, about CAD 1.98** at the file's own rate of 1.4240 (no extra 10%: the regional price already includes it).

That is within the file's planning range (CAD 0.40 low, 2.20 typical, 14 high on a mid-tier model). Caching the instruction prefix and routing the Sorter to a cheaper model lower it further, but the cheaper Gemini models (Flash-Lite) have no Canada commitment today [53], so in Canada the routing saving is small until a second Canadian model exists [I].

#### 6.4 Recommendation for Expat Ready

1. **Budget at four levels, all enforced by the platform**: per step (`max_tokens` out, and an input ceiling checked before the call); per run (skill manifest); per file; per firm per month (plan limits). A breach is the named failure `budget_exceeded`, shown in Needs you; never a silent stop.
2. **Measure cost per prepared file from run records**: sum tokens × the price in force for each step's model and route, plus OCR pages, tagged by file ID and skill version. Report it beside the reviewer's minutes, which the team already calls "the real cost" (`../commercial/provider-and-cost.md` §3.5).
3. **Cache the stable prefix**: order every prompt as fixed skill instructions, then the Pack rules, then the file's data, so the first two are reused.
4. **Route by step type, not by model guesswork [I]**: Sorter and simple Reader fields to the cheapest model that passes the skill's test set; Writer and Checker to the strongest model available in Canada. The routing rule lives in the skill manifest, not in a model.
5. **Batch** non-urgent work (nightly re-checks, drift runs) where the chosen route supports it.

---

### 7. Access and permissions for agents

#### 7.1 Delegated authority

| Pattern | What it gives | Status | Label |
|---|---|---|---|
| **OAuth 2.0 Token Exchange (RFC 8693)** [47] | The agent swaps the person's token for a downstream token whose subject stays the person, with an `act` (actor) claim naming the agent. Only the current actor is enforced; nested actors are informational. | Published standard. | [S] (worked example) |
| **IETF drafts for AI agents** [47] | On-behalf-of user authorisation (`requested_actor`, `actor_token`; Aug 2025); credential delegation profile with ephemeral keys, capability-shaped tokens and cascading revocation (Jul 2026); delegation-chain attenuation (Sep 2026). A "splicing" weakness in RFC 8693 chains was disclosed to the OAuth working group on 26 Feb 2026. | Drafts only; none adopted as RFC. | [V] drafts |
| **Microsoft Entra Agent ID** [48] | Agents get identities with a human **sponsor** accountable for them; sponsorship passes to the sponsor's manager if they leave; agent on-behalf-of follows RFC 8693. | Product, 2026. | [S] |

#### 7.2 Policy engines

| Engine | Model | Evidence | Label |
|---|---|---|---|
| **Cedar** (AWS; Amazon Verified Permissions) [49] | Policy language; evaluator and validator **formally modelled and proved in Lean**, differential-tested against the production code. AWS published guidance (2026) to stop authority growing across multi-hop agent chains, using the originating user's verified claims. | Siemens reports about 590 million authorisation calls a month for its internal AI platform. | [V] proofs; [VC] scale |
| **OpenFGA** (Zanzibar-style relationship-based access) [50] | "Who can do what to which object" as relationships; CNCF Incubating since 28 Oct 2025. | Agents as first-class types is a community pattern, not a product feature. | [V] status; [S] agent pattern |
| **OPA** | General policy engine. | Not researched in depth for this file. | n/a |

#### 7.3 Preventing prompt-injection escalation

- **OWASP LLM06 "Excessive Agency"** [26] [S]: limit functions, permissions and autonomy; run tools in the user's context; authorise in downstream systems, not in the model; human approval for high-impact actions; restrict what a delegated agent can use.
- **Six design patterns** (Google, Microsoft, IBM, ETH Zurich and others, Jun 2025) [51] [V]: the safest are the **action-selector** (the model picks from a fixed list of actions and sees no tool output afterwards) and **plan-then-execute** (the plan is fixed before any untrusted data is read). A critique notes these protect *which* actions run, not the *values* passed to them [S].
- **CaMeL** (Google DeepMind, 2025) [52] [V]: a privileged model plans from the trusted request only; a **quarantined** model parses untrusted data into a fixed schema and has no tools; every value carries a **capability** (where it came from, who may receive it) checked before each tool call. It solved 67% of AgentDojo tasks with provable security, and fixes the gap in the older dual-LLM pattern where injected data could change arguments.

#### 7.4 Recommendation for Expat Ready

1. **Keep the existing permission keys as the single source of truth; no new policy engine for Release 1 [I].** What the AI teammate may do = the delegation record's keys ∩ the skill manifest's maximum keys ∩ the person's current keys at run time (a revoked key revokes the AI at once).
2. **Issue a short-lived run pass per skill run**: the intersection above, bound to one firm, one file and one run ID, expiring with the run. Every Doer and product action checks the pass, not the model's say-so. This is the RFC 8693 idea ("subject stays the person, actor is the AI") inside our own platform [47].
3. **Our recipes already are "plan-then-execute" [51]**: the Conductor fixes the steps before any document is read. Keep it so: **no AI output may choose the next step, the tool, the recipient or the permission.** Reader and Sorter act as quarantined models: they return values into typed fields only [52].
4. **Tag every extracted value with its source** (document, page, step, run) and let Pack rules restrict where a value may flow (for example, a value read from a client upload may fill a form field only after a person verifies it). This is CaMeL's capability idea in our terms [52] [I].
5. **Audit log entry per step**: run pass ID, delegation record ID, the person, the AI teammate, skill version, keys used, outcome. Record each delegation's human sponsor (the person) and give the firm Owner a one-click suspend, as Entra Agent ID does [48].

---

### 8. Models for this use, under Canada-only processing

#### 8.1 What can run in Canada (as of 9 to 11 Oct 2026)

| Route | Canada-only processing today? | Detail | Label |
|---|---|---|---|
| **Google Vertex, Gemini** | **Yes, for a short list.** | Google's data-residency page (updated 9 Oct 2026) commits ML processing in Montréal (`northamerica-northeast1`) for **Gemini 3.5 Flash**, Gemini 2.5 Flash, Gemini 2.5 Pro and two text-embedding models. **Not** for Gemini 3.8, 3.7 or 3.6 Flash, 3.5 Flash-Lite or 3.1 Flash-Lite. Endpoints not in the table carry "no guarantee" of processing location; global endpoints "may be processed in any Google Cloud location". Gemini 2.5 retires "not before 16 Oct 2026". A Canadian developer asked publicly in Jul 2026 for a Canadian replacement for 2.5 Flash; no reply was shown. | [V] [53][62]; [S] forum |
| **Claude on Google Vertex** | **No.** | Multi-region endpoints are `us` and `eu` only; specific regional endpoints serve Sonnet 4.6 and earlier; Google's partner-model residency table has no Canada column. Agent Skills, Batches and Files API are not supported there. | [V] [53][54] |
| **Anthropic API** | **No.** | `inference_geo` is `global` or `us`. | [V via search] [55] |
| **Claude on Amazon Bedrock** | **No.** | Canadian entry point with cross-region inference: "Data at rest remains in Canada; only transient inference processing occurs in destination regions." | [S mirror of AWS post] [56] |
| **Azure OpenAI** | **Not for current models.** | Microsoft moderator, Jul 2026: no published roadmap for GPT-5.x regional deployments in Canadian regions. | [S] [57] |
| **Cohere** | **Possible, by dedicated deployment.** | Model Vault: single-tenant, Cohere-managed; an Encrypted tier adds confidential computing. A Canadian region was reported on 23 Sep 2026 (aggregator); Cohere's docs say to confirm regions with Cohere. Bell named Cohere its preferred Canadian model provider. | [V] docs; [S] Canada launch; [VC] Bell |
| **Open-weight models we host in Canada** | **Yes, if we host them.** | Cohere **Command A+** released as open weights under **Apache 2.0** (May 2026): 218B mixture-of-experts, 25B active, 128k context, 48 languages, reported to run on two H100 GPUs. On a public index (Apr 2026) the best open models scored 52 to 54 against 57 to 60 for the best proprietary models (a 6-point gap); the leaders were China-origin; the best from outside China were Gemma 4 31B and NVIDIA Nemotron 3 Super. Canadian compute: Telus "sovereign AI factories" (Canadian-owned; more capacity through 2028), Bell AI Fabric, a DeepInfra Toronto site. | [S] [59]; [V] [60]; [VC] [61] |
| **OCR and document AI** | **Yes.** | Google Document AI: Montréal is a "limited support" region and some generative extractors are preview there; location cannot change after a processor is created. Amazon Textract: Canada Central since 2020. Azure Document Intelligence: Canada Central and Canada East per a Microsoft Q&A answer. | [V] [63][64]; [S] [65] |

**Important correction [I].** `../commercial/provider-and-cost.md` §2.6 lists Gemini 3.8 Flash, 3.7, 3.6, 3.1 Pro and others under Montréal, citing Google's *locations* page. Google's *data-residency* page, updated 9 Oct 2026, commits Canadian ML processing for only Gemini 3.5 Flash and the 2.5 models [53]. An endpoint being *available* in Montréal is not a promise that *processing* stays in Canada. The Lead should re-run the provider test (`../requirements/provider-test-script.md`) against the data-residency page and get the commitment in Google's contract terms. The cost table in that file prices Gemini 3.8 Flash and 3.1 Pro, which may not qualify; 6.3 above re-prices the file on Gemini 3.5 Flash.

#### 8.2 Which model family for which step

| Step type | Need | Best fit today with Canada-only processing | Fallback | Label |
|---|---|---|---|---|
| **Reader** (extraction) | OCR quality, field accuracy, saying "not found" | Canadian OCR (Document AI Montréal or Textract Canada) for text, then **Gemini 3.5 Flash** in Montréal for fields | Command A+ self-hosted in Canada | [I] |
| **Sorter** (classification) | Cheap, consistent | Rules first (sender, file reference); then Gemini 3.5 Flash; a small self-hosted open model if volume justifies it | Text-embedding model in Montréal plus nearest-neighbour rules | [I] |
| **Writer** (drafting) | Fluent English and French, follows templates | Gemini 3.5 Flash; the Writer only fills template slots and drafts that a person approves | Cohere Command A family (designed for enterprise RAG and citations [S]) | [I] |
| **Checker** | Independent second view | **Pack rules first**; an AI Checker only as an extra, preferably a *different model family* from the maker, since judges favour their own family [36] | Cohere or open model as the second family | [I] |

#### 8.3 Recommendation for Expat Ready

1. **Plan on Gemini 3.5 Flash in Montréal as the primary model for all four AI step types for Release 1**, subject to the provider test and written contract terms [53]. It is the only current model with a published Canadian processing commitment.
2. **Make the second route real before launch, not later [I]**: either Cohere in Canada (Model Vault or Command A+ self-hosted) or another open model on Canadian GPUs. It gives a different family for the Checker and protects against a Google retirement like the Gemini 2.5 one [62].
3. **Abstract the model per step type in the skill manifest** (route = provider, model snapshot, region), so a model change is a new skill version and goes through the driving test.
4. **Never call a global endpoint**: add a platform rule that refuses any model call whose endpoint is not on an approved Canadian list.
5. **Do not plan on Claude or OpenAI models for client data until a Canadian processing option is published** [54][55][56][57]. They remain fine for non-client internal work (for example, drafting Pack content from public pages), subject to the founder's AIW-D69 test.

---

### 9. Structure and naming of AI workers

#### 9.1 How leading frameworks and products organise the levels

| Framework or product | Level 1 | Level 2 | Level 3 | How they connect | Label |
|---|---|---|---|---|---|
| **Anthropic, Claude Agent SDK and Agent Skills** [75][19] | Agent | **Subagent** (own fresh context, own prompt, restricted tool list; only its final message returns) and **Agent Skills** (SKILL.md folders loaded on demand) | Tools | The model picks a subagent or skill by its description. | [V] |
| **OpenAI Agents SDK** [23] | Agent | **Handoff** to another agent (takes over the conversation) or **agent as tool** (caller keeps control) | Function tools; guardrails on input, output and tools | Handoffs are tools named `transfer_to_<agent>`. | [V] |
| **Google ADK** [17] | Root agent | **Sub-agents** in a tree, one parent each; or **AgentTool** (agent wrapped as a tool) | Tools | Workflow agents (Sequential, Parallel, Loop) run sub-agents in a fixed order; LLM agents delegate by description. | [V] overview; [S] detail |
| **Microsoft Agent Framework / Semantic Kernel** [14][77] | Agent | **Workflow** (graph of executors and edges) | **Plugins** (functions and prompt templates the model can call) | Agent Framework 1.0 (Apr 2026) merges Semantic Kernel and AutoGen, which are now in maintenance. | [S] |
| **LangGraph** [24] | Graph | **Subgraph** (graph as a node) | Nodes | Shared state or mapped state; checkpointing modes. | [V] |
| **CrewAI** [76] | **Crew** | **Agents** (each with role, goal, backstory) | **Tasks** | Process is sequential by default or hierarchical with a manager model; **Flows** own state and order above crews. | [V] |
| **Salesforce Agentforce** [70] | Agent | **Subagents** (renamed from "topics" in April 2026, "with no changes to functionality"), each with a description, scope and instructions | **Actions** (flows, Apex code, prompt templates) | A router picks the subagent; the subagent's instructions say when to call which action. | [V] |
| **Microsoft Copilot Studio** [71] | Agent | **Topics** (deterministic conversation flows); **child agents** (single task, same owner) and **connected agents** (separately owned) | **Tools/actions** (connectors, flows, prompts, MCP, REST) | Parent agent orchestrates; one consultancy advises topics for auditable, high-stakes flows. | [V] (official article via mirror); [S] advice |
| **ServiceNow AI Agents** [72] | **Agentic workflow** | **AI agents** | **Tools** (record operations, flows, searches) | The **Orchestrator** coordinates agents; built in AI Agent Studio. | [V] |
| **Harvey** [73] | Product areas: Assistant, Vault | **Workflow agents** | **Blocks** | Built in Workflow Builder; sharing levels Run, View, Edit, Full; admin approval notices. | [V] release notes |
| **Thomson Reuters CoCounsel** [74] | CoCounsel (one assistant) | **Skills** (Review Documents, Summarize, Extract Contract Data, Draft Correspondence...) grouped as review, summarise or draft; plus **guided workflows** and Deep Research | Steps within a workflow (not named publicly) | The user picks a skill or workflow; output is a table or draft with sources. | [V] |

**What the comparison shows [I].**
- Everyone has three levels: a **role-level agent**, a **reusable capability** (subagent, skill, topic, workflow agent) and the **unit of action** (tool, action, task, block, step).
- The middle level is converging on "**subagent**" in developer frameworks and on "**skill**" or "**workflow**" in products sold to lawyers. Legal buyers meet CoCounsel's "skills" and Harvey's "workflows", not "subagents".
- Enterprise products keep a **deterministic option at the middle level** (Copilot Studio topics, ADK workflow agents, Microsoft workflows), the same idea as our Conductor recipes.

#### 9.2 Which structure scales and stays maintainable for a compliance product

| | **A. Central registry of versioned skills, reused by role AIs** | **B. Bespoke code per AI** | **C. Supervisor AI routing to sub-agents** |
|---|---|---|---|
| **Failure isolation** | One skill fails; its health light drops it to shadow; every AI that uses it shows "skill paused"; others keep working (AIW-D83). | A shared bug is copied into each AI and fixed several times. | The supervisor's routing mistakes affect every sub-agent; MAST finds inter-agent misalignment is one of three main failure groups [31]. |
| **Testing** | One test set per skill, run once per version. | Each AI needs its own tests for the same ability. | Must test routing as well as each sub-agent; routing is non-deterministic, so tests need repeats (pass^k) [34]. |
| **Ownership** | One owner role per skill; one owner per AI teammate's configuration. | Ownership follows the AI, so the same ability has several owners. | Unclear: who owns a wrong route? |
| **Release** | Version and label per skill; rollback by label [25]. | Release per AI; a fix waits for every AI's release. | Release of the supervisor touches everything below it. |
| **Audit and diagnosis** | Run record names the skill version and the failed step. | Comparable only if each AI logs the same way. | The "why this sub-agent" decision is a model judgement, hard to explain to a regulator. |
| **Fit with AIW-D84** | Full: Conductor routes, AI only inside steps. | Partial. | Poor: an AI decides the workflow. |

**Verdict [I]:** **A**, with the AI teammate as a *configuration* (whose delegation, which skills switched on, which budget) rather than a model that decides. The Conductor does the routing that a supervisor AI would do in C. This is the same shape as Agentforce's agent → subagent → action and CoCounsel's assistant → skill, with the router made deterministic.

#### 9.3 The naming question

**Clashes in our own documents (given):** "agent" = the firm's staff console ("Agent plane", keys such as `agent/case:view`); "worker" = a foreign worker and background jobs; "persona" = a human job role; "assistant" = junior staff. Also note: "action" is already used for product actions and for autonomy "per action" [I]; "duty" is the team's current word for level 2 (AIW-D81).

**Recommended set [I, based on 9.1]:**

| Level | On screens | In documents | In code |
|---|---|---|---|
| 1 | "**Case Officer's AI**" (pattern: *role*'s AI); generic noun "**AI teammate**" | AI teammate | `ai_teammate` |
| 2 | "**Skill**" (for example "Document reader") | skill | `skill`, `skill_version` |
| 3 | "**Step**" (for example "Read passport page 2") | step; the step type names the Doer (Reader, Sorter, Writer, Checker, Minder, Filler...) | `skill_step`, `step_type` |

Why: "skill" is what Anthropic and the leading legal product (CoCounsel) call a reusable ability [19][74], so buyers and builders already know it; it clashes with nothing in our vocabulary. "Step" is what a Conductor recipe already has, so a skill's steps *are* recipe steps. "<Role>'s AI" is the founder's own wording (AIW-D81), says whose it is, and avoids all four clashing words. Keep the catalogue IDs (W-nn) as trace IDs only.

**Alternative 1: "AI aide", "skill", "step".** Short and distinct; "aide" also reads well in French. Trade-off: "aide" sounds like a junior human helper, close to the "assistant" clash, and is less common in software.

**Alternative 2: industry terms "AI agent", "subagent", "action"** (Agentforce, Copilot Studio). Trade-off: closest to developer frameworks, but clashes with the Agent plane and every `agent/...` permission key, and "action" clashes with product actions and autonomy per action; it would force renaming core permission keys. Not recommended.

#### 9.4 Recommended structure in one table

| Level | Name | Owns: permissions | Owns: test set | Owns: health | Owns: version | Owns: cost budget | Maps to the team's existing parts |
|---|---|---|---|---|---|---|---|
| 1 | **AI teammate** (shown as "Case Officer's AI") | A **delegation record**: a subset of one named person's permission keys; never more than the person holds now | An integration smoke test only (does each enabled skill run end to end) | Roll-up of its skills' lights | Configuration version (which skills, which delegation, which budget) | Per firm per month, per person per day | The **AI persona** in `../design/ai-organisation.md` (one per human role); AIW-D81 "persona = AI team member" |
| 2 | **Skill** | The **maximum** keys it may ever use (manifest); the run pass is the intersection with the delegation | Yes: expert-graded test set, pass bar, floor (AIW-D83) | Yes: its own light per firm; automatic drop to shadow | Yes: one bundle (prompt, model snapshot and region, schema, validators, Pack rule versions, test set) | Per run, plus per file | The **duty (W-nn)** in `../design/workers/catalogue.md`; implemented as a **Conductor recipe template**; release state Off, Shadow, Live, alongside the action's autonomy level (AUTO, APPROVE, OFF): the stricter of the two applies |
| 3 | **Step** | None of its own; checks the run pass before acting | Covered by the skill's test set; unit tests for its validator | Failure codes in the run record | Inherits the skill version | Per call: `max_tokens` and an input ceiling | A **Doer call** inside the recipe: an AI Doer (Reader, Sorter, Writer, Checker), a deterministic Doer (Minder, Filler, Biller, Signer), a product action, or a wait for a person in **Needs you** |

---

## (c) Reference architecture (one page)

```
                         PERSON (licensed user) ── owns ──> DELEGATION RECORD (subset of their permission keys)
                                                                     │
                                                                     ▼
┌──────────────────────────────── THE PLATFORM = DETERMINISTIC SHELL ────────────────────────────────────┐
│                                                                                                        │
│  TRIGGER (event, date from Minder, person's click)                                                     │
│     │                                                                                                  │
│     ▼                                                                                                  │
│  CONDUCTOR runs a recipe ──reads──> SKILL REGISTRY  (skill, version, label: off / shadow / live)        │
│     │                                 manifest: inputs, output schema, steps, max keys, Pack rules,    │
│     │                                 model route per step, token caps, test set, bar, floor, owner    │
│     ▼                                                                                                  │
│  ACCESS CHECK: run pass = delegation keys ∩ skill max keys ∩ person's current keys; one firm, one file, │
│                one run; expires with the run. No pass, no run ("not_permitted").                        │
│     │                                                                                                  │
│     ▼                                                                                                  │
│  BUDGET CHECK: per step, per run, per file, per firm. Over budget = "budget_exceeded".                 │
│     │                                                                                                  │
│     ▼                                                                                                  │
│  STEP 1  PRECONDITIONS (code): inputs present, readable, allowed?  ── no ──> "missing_input: X"         │
│     │                                                                                                  │
│     ▼                                                                                                  │
│  STEP 2  AI STEP (one of four types)          ┌──────────── AI CORE (only here) ─────────────┐         │
│          Reader | Sorter | Writer | Checker ──┤ model route from manifest, Canada endpoint   │         │
│          typed proposal, every value with     │ only; structured output; cached prefix       │         │
│          {value, source, confidence} or       │ (skill text + Pack rules) then file data     │         │
│          {not_found, reason}                  └───────────────────────────────────────────────┘         │
│     │    refusal / truncated / provider_error = named failure                                          │
│     ▼                                                                                                  │
│  STEP 3  VALIDATORS (code, in order):  schema re-check ─> field rules ─> PRACTICE PACK rules           │
│          fail = "rule_failed: <rule ID>"; at most ONE re-ask with the failed rule IDs, then stop       │
│     │                                                                                                  │
│     ▼                                                                                                  │
│  STEP 4  NEEDS YOU (person approves, edits or rejects; expandable step view)  ── or AUTO only for      │
│          internal-only outputs with shadow evidence                                                    │
│     │                                                                                                  │
│     ▼                                                                                                  │
│  STEP 5  DETERMINISTIC DOERS act on approved values only: Filler, Biller, Signer, sends via templates   │
│                                                                                                        │
│  AI output never chooses the next step, tool, recipient or permission (plan fixed before reading).     │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
     │ every step writes                                      ▲ drives
     ▼                                                        │
┌──────────── TRACING AND AUDIT (Canada) ─────────────┐   ┌──────────── EVALUATION GATE ("driving test") ──────────┐
│ run record + step records: skill version, person,   │   │ 1 TEST SET (expert-graded) ─ pass bar ─> 2 SHADOW       │
│ delegation, run pass, model, region, tokens, cost,  │──>│ (2-4 weeks, hidden, compared with verified values) ─>   │
│ stop reason, rule IDs, failure code, approver,      │   │ 3 LIVE at APPROVE ─ health light under floor ─>         │
│ edits. OpenTelemetry GenAI field names.             │   │ automatic DROP BACK to shadow. Any bundle change =      │
│ Health light per skill per firm.                    │   │ new version = CI regression gate first. Weekly drift.   │
└─────────────────────────────────────────────────────┘   └──────────────────────────────────────────────────────────┘
     │
     ▼
 COST CONTROL: cost per prepared file = Σ(step tokens × price of its route) + OCR pages, by file and skill version;
 shown beside reviewer minutes; firm and plan caps enforced by the platform.
```

---

## (d) What not to do: over-engineering traps for a compliance product

1. **Do not let a model run the workflow.** No autonomous agent, no "supervisor AI" routing to "sub-agent AIs". The Conductor routes; a regulator can read a recipe, not a model's choice [1][31].
2. **Do not buy a large agent framework to get started.** Anthropic advises direct API calls and simple code first, because frameworks hide prompts and slow debugging [1]. The Conductor already provides the workflow.
3. **Do not trust "structured output" as validation.** It guarantees the shape, not the truth, and does not enforce lengths or ranges [2].
4. **Do not use a second AI as the only checker.** Model judges favour their own family and are weaker in expert fields [35][36]. Rules first; AI checker as an extra; the expert's test set decides.
5. **Do not stack many AI guardrails.** Each adds latency and false positives that compound [8]. Prefer deterministic rules and Pack checks.
6. **Do not build a second permission system.** Use the existing keys, delegation records and audit log; add only the per-run pass (section 7).
7. **Do not adopt MCP, the Skills API or an external policy engine "for later" in Release 1.** Each is a new moving part with its own residency and versioning questions [19][22].
8. **Do not chase the newest model.** Pin snapshots; a model change is a new skill version with a fresh driving test [38]. In Canada the choice is narrow anyway [53].
9. **Do not send traces or test data to US-hosted tools** while client data is in them [30][41].
10. **Do not let reviews be optional.** The Ontario AI-scribe audit shows "must review" without an enforced sign-off fails [67].
11. **Do not over-split skills.** A skill should be one job a licensed expert can grade with one test set; finer pieces are steps, not skills [I].
12. **Do not measure success by "AI share".** Measure accepted-unchanged rate, time saved per file and cost per prepared file.

---

## (e) Sources

All accessed 11 Oct 2026. Labels refer to how each was used above.

1. Anthropic, "Building effective agents", 19 Dec 2024. https://www.anthropic.com/engineering/building-effective-agents
2. Anthropic, Structured outputs (Claude docs). https://platform.claude.com/docs/en/build-with-claude/structured-outputs
3. GIGAZINE, OpenAI structured outputs launch coverage, 7 Aug 2024. https://gigazine.net/gsc_news/en/20240807-openai-structured-outputs ; and an independent blog's notes quoting OpenAI staff. https://simonwillison.net/2024/Aug/6/openai-structured-outputs
4. "Structured Outputs Are Not a Solved Problem", 18 Apr 2026. https://tianpan.co/blog/2026-04-18-structured-output-json-mode-failure-modes
5. Google, "Improving Structured Outputs in the Gemini API", Nov 2025. https://blog.google/technology/developers/gemini-api-structured-outputs/
6. Guardrails AI, error remediation and on-fail actions. https://www.guardrailsai.com/docs/concepts/error_remediation ; https://guardrailsai.com/docs/concepts/validator_on_fail_actions
7. NVIDIA NeMo Guardrails documentation. https://docs.nvidia.com/nemo/guardrails/latest/index.html
8. Prem AI, "Production LLM Guardrails compared". https://blog.premai.io/production-llm-guardrails-nemo-guardrails-ai-llama-guard-compared
9. AWS, Automated Reasoning checks GA, Aug 2025. https://aws.amazon.com/about-aws/whats-new/2025/08/automated-reasoning-checks-amazon-bedrock-guardrails ; docs https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-automated-reasoning-checks.html ; AWS News Blog https://aws.amazon.com/blogs/aws/minimize-ai-hallucinations-and-deliver-up-to-99-verification-accuracy-with-automated-reasoning-checks-now-available/
10. "Agent vs Prompt+LLM: where should uncertainty live". https://www.besthub.dev/articles/agent-vs-prompt-llm-where-should-uncertainty-live-in-production-llm-systems-2b64ffbd2818
11. Temporal, durable agents with the AI SDK. https://temporal.io/blog/building-durable-agents-with-temporal-and-ai-sdk-by-vercel ; Temporal ADK integration https://docs.temporal.io/develop/go/integrations/google-adk
12. Inngest, AI inference steps. https://www.inngest.com/docs/features/inngest-functions/steps-workflows/step-ai-orchestration ; durable agents blog https://www.inngest.com/blog/ai-agents-inngest-durable-steps.md
13. AWS, Step Functions optimised Bedrock integration, 26 Nov 2023. https://aws.amazon.com/about-aws/whats-new/2023/11/aws-step-functions-optimized-integration-bedrock ; human approval with task tokens (secondary) https://oneuptime.com/blog/post/2026-02-12-build-human-approval-workflows-with-step-functions/markdown
14. Microsoft Agent Framework, workflows (Microsoft Learn, localised copy read). https://learn.microsoft.com/he-il/agent-framework/workflows/ ; secondary guide https://noqta.tn/en/blog/microsoft-agent-framework-1-0-multi-agent-orchestration-guide-2026
15. Google Cloud, "Choose a design pattern for your agentic AI system". https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system
16. Summary of OpenAI's "A practical guide to building agents". https://www.maginative.com/article/how-to-build-ai-agents-a-detailed-practical-guide-from-openai/
17. Google ADK, multi-agent systems. https://adk.dev/agents/multi-agents ; Google Cloud community article https://medium.com/google-cloud/llm-agents-vs-workflows-and-how-google-adk-gives-you-both-7301d6fb1c4c
18. Agent Skills specification. https://agentskills.io/specification
19. Anthropic, Agent Skills overview. https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
20. Anthropic, Using Agent Skills with the API. https://platform.claude.com/docs/en/build-with-claude/skills-guide
21. Model Context Protocol, authorization, spec 2025-11-25. https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization ; changelog https://modelcontextprotocol.io/specification/2025-11-25/changelog
22. MCP Registry, versioning. https://modelcontextprotocol.io/registry/versioning ; explainer https://atlan.com/know/ai-agent/what-is-an-mcp-registry/
23. OpenAI Agents SDK, handoffs. https://openai.github.io/openai-agents-python/handoffs/
24. LangGraph, subgraphs. https://docs.langchain.com/oss/python/langgraph/use-subgraphs
25. Langfuse, prompt version control. https://langfuse.com/docs/prompt-management/features/prompt-version-control
26. OWASP Top 10 for LLM 2025, LLM06 Excessive Agency (summaries). https://invicti.com/blog/web-security/owasp-top-10-risks-llm-security-2025 ; https://www.indusface.com/learning/owasp-llm06-excessive-agency/
27. OpenTelemetry, GenAI agent spans. https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans ; repository https://github.com/open-telemetry/semantic-conventions-genai ; status review https://www.greptime.com/blogs/2026-05-09-opentelemetry-genai-semantic-conventions
28. Langfuse, press page (MIT June 2025; ClickHouse, Jan 2026). https://langfuse.com/press
29. Arize Phoenix. https://phoenix.arize.com ; licence discussion https://inference.net/content/arize-phoenix-alternatives/
30. Braintrust, self-hosting (hybrid). https://braintrust.dev/docs/guides/self-hosting/advanced ; LangSmith self-hosted overview https://docs.langchain.com/langsmith/deploy-to-self-hosted-overview
31. "Why Do Multi-Agent LLM Systems Fail?" (MAST), arXiv 2503.13657, NeurIPS 2025. https://arxiv.org/abs/2503.13657
32. GitHub Docs, Copilot coding agent session logs. https://docs.github.com/en/copilot/using-github-copilot/coding-agent/using-the-copilot-coding-agent-logs ; https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/track-copilot-sessions
33. OpenAI Help, ChatGPT agent. https://help-lb.openai.com/en/articles/11752874-chatgpt-agent ; Atlas agent mode https://help.openai.com/en/articles/12628199-chatgpt-atlas-agent-mode
34. Anthropic, "Demystifying evals for AI agents" (read via summaries). https://anthropic.com/engineering/demystifying-evals-for-ai-agents ; summary https://www.beri.net/learning/anthropic-demystifying-evals-ai-agents
35. "A Scoping Review of LLM-as-a-Judge in Healthcare", arXiv 2604.25933. https://arxiv.org/pdf/2604.25933
36. LEXam legal benchmark, arXiv 2505.12864. https://arxiv.org/pdf/2505.12864
37. Amazon SageMaker AI, shadow tests. https://docs.aws.amazon.com/sagemaker/latest/dg/shadow-tests.html
38. "How Is ChatGPT's Behavior Changing over Time?" (Stanford and UC Berkeley), arXiv 2307.09009. https://arxiv.org/pdf/2307.09009.pdf
39. OpenAI to acquire Promptfoo, Mar 2026. https://securityboulevard.com/2026/03/openai-acquires-security-startup-promptfoo-to-fortify-ai-agents ; CI regression guide https://lucaberton.com/blog/llm-regression-testing-ci-promptfoo/
40. Inspect (UK AI Security Institute). https://inspect.aisi.org.uk ; scorers https://inspect.aisi.org.uk/scorers.html
41. OpenAI, trace grading. https://developers.openai.com/api/docs/guides/trace-grading
42. Anthropic, pricing. https://platform.claude.com/docs/en/about-claude/pricing
43. Google Cloud, Vertex AI generative AI pricing (page parsed 11 Oct 2026). https://cloud.google.com/vertex-ai/generative-ai/pricing
44. LMSYS, RouteLLM, 1 Jul 2024. https://lmsys.org/blog/2024-07-01-routellm/
45. LiteLLM, enterprise quickstart and budgets. https://docs.litellm.ai/docs/learn/enterprise_quickstart ; docs mirror https://litellm.docs.miniasp.com/en/docs/proxy/users
46. Google Document AI pricing. https://cloud.google.com/document-ai/pricing ; Amazon Textract prices (third party) https://erpresearch.com/erp-add-ons/ocr/amazon-textract/pricing
47. RFC 8693 for agent delegation, worked example. https://mojoauth.com/blog/oauth-2-0-token-exchange-rfc-8693-for-agent-delegation-a-worked-example ; draft on-behalf-of user https://datatracker.ietf.org/doc/html/draft-oauth-ai-agents-on-behalf-of-user-02 ; draft credential delegation (Jul 2026) https://www.ietf.org/archive/id/draft-sweeney-wimse-credential-delegation-00.html
48. Microsoft Zero Trust workshop, Entra Agent ID sponsors and OBO. https://microsoft.github.io/zerotrustassessment/docs/workshop-guidance/AI/AI_012 ; Entra docs changes 20 May 2026 https://entradiff.merill.net/2026-05-20.html
49. Lean, Cedar case study. https://lean-lang.org/use-cases/cedar/ ; AWS Security Blog, least privilege in multi-agent chains with Cedar https://aws.amazon.com/blogs/security/enforce-least-privilege-authorization-in-multi-agent-ai-chains-using-cedar/ ; Siemens case study https://aws.amazon.com/solutions/case-studies/siemens-gpt-case-study/
50. CNCF, OpenFGA becomes incubating, 11 Nov 2025. https://www.cncf.io/blog/2025/11/11/openfga-becomes-a-cncf-incubating-project/ ; project page https://openfga.dev/project
51. "Design Patterns for Securing LLM Agents against Prompt Injections", arXiv 2506.08837, Jun 2025. https://arxiv.org/pdf/2506.08837
52. "Defeating Prompt Injections by Design" (CaMeL), Google DeepMind (course copy). https://css.csail.mit.edu/6.858/2026/readings/camel.pdf
53. Google Cloud, Vertex AI generative AI data residency (last updated 9 Oct 2026; tables parsed 11 Oct 2026). https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency
54. Anthropic, Claude on Google Cloud (endpoints, unsupported features). https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai
55. Anthropic, data residency (via search results). https://platform.claude.com/docs/en/manage-claude/data-residency.md
56. AWS post mirrored: Canada cross-region inference, 24 Nov 2025. https://aws-news.com/article/2025-11-24-accelerate-generative-ai-innovation-in-canada-with-amazon-bedrock-cross-region-inference
57. Microsoft Q&A, Azure OpenAI options in Canada, Jul 2026. https://learn.microsoft.com/en-us/answers/questions/5935539/need-help-understanding-the-options-and-road-map-f
58. Cohere, Model Vault docs. https://docs.cohere.com/docs/model-vault ; Canada launch report https://alphasignal.ai/news/cohere-brings-model-vault-to-canada-for-enterprises-needing-data-sovereignty ; Bell partnership https://betakit.com/cohere-to-access-canadian-ai-infrastructure-and-new-clients-through-partnership-with-bell/
59. Cohere Command A+ open weights (press). https://the-decoder.com/cohere-open-sources-its-strongest-model-yet/ ; https://letsdatascience.com/news/cohere-releases-command-a-as-open-source-59ba98c7
60. Artificial Analysis, recent open-weights launches, 30 Apr 2026. https://www.artificialanalysis.ai/articles/recent-open-weights-model-launches
61. Telus, sovereign AI infrastructure, 11 May 2026. https://www.telus.com/en/about/news-and-events/media-releases/TELUS-and-Government-of-Canada-advance-work-to-scale-Canadas-sovereign-AI-infrastructure ; Bell AI Fabric https://www.rcrwireless.com/?p=419067
62. Google Cloud, Vertex model versions and retirement. https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions ; developer forum, Canadian residency after Gemini 2.5 Flash, 29 Jul 2026 https://discuss.google.dev/t/gemini-2-5-flash-migration-path-preserving-canadian-data-residency-in-northamerica-northeast1/385873
63. Google Document AI, regional support. https://docs.cloud.google.com/document-ai/docs/regions
64. AWS, Textract in Canada (Central), Oct 2020. https://aws.amazon.com/about-aws/whats-new/2020/10/amazon-textract-is-now-available-in-the-asia-pacific-seoul-and-canada-central-regions
65. Microsoft Q&A, Document Intelligence regions, Feb 2025. https://learn.microsoft.com/en-us/answers/a/1912475
66. Blakes, OSFI final Guideline E-23. https://www.blakes.com/insights/osfi-releases-final-guideline-e-23-for-model-risk-management-and-ai-use-by-frfis/
67. Canadian Healthcare Technology, Ontario Auditor General on AI scribes, 13 May 2026. https://www.canhealth.com/2026/05/13/ontario-ag-finds-flaws-in-ai-scribes/ ; HR Reporter https://www.hrreporter.com/focus-areas/automation-ai/ai-systems-used-by-doctors-hallucinate-auditor-general/394430
68. Government of Canada, amendments to the Directive on Automated Decision-Making. https://www.canada.ca/en/government/system/digital-government/policies-standards/policy-service-digital-announcements/amendments-directive-automated-decision-making.html
69. Stanford HAI, "AI on Trial", May 2024 (also cited in `ai-in-regulated-work-2026-10.md`). https://hai.stanford.edu/news/ai-trial-legal-models-hallucinate-1-out-6-queries
70. Salesforce, Agent Script reference (topics renamed subagents). https://developer.salesforce.com/docs/ai/agentforce/guide/ascript-reference.html ; legacy guide https://www.salesforce.com/agentforce/legacy-guide/ ; instructions blog https://developer.salesforce.com/blogs/2025/01/how-to-write-effective-natural-language-instructions-for-agentforce
71. Microsoft Copilot Studio, add other agents (official article). https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-add-other-agents ; Microsoft 365 Community Conference 2026 deck https://adoption.microsoft.com/files/microsoft-365-community-conference/2026/pdf/MS46%20-%20Demystifying%20Multiagent%20(Child%20_%20Connected)%20and%20Component%20Collection.pdf
72. ServiceNow, Explore Now Assist AI agents. https://www.servicenow.com/docs/bundle/zurich-intelligent-experiences/page/administer/now-assist-ai-agents/concept/exploring-ai-agents.html
73. Harvey, release notes (workflows). https://help.harvey.ai/release-notes/category/workflows ; getting started https://eu.help.harvey.ai/articles/getting-started-with-harvey
74. Thomson Reuters, Understanding CoCounsel skills. https://www.thomsonreuters.com/en-ca/help/cocounsel/legal/skills/understanding-cocounsel-skills.html ; CoCounsel Legal launch, Aug 2025 https://www.thomsonreuters.com/en/press-releases/2025/august/thomson-reuters-launches-cocounsel-legal-transforming-legal-work-with-agentic-ai-and-deep-research
75. Anthropic, Claude Agent SDK subagents. https://code.claude.com/docs/en/agent-sdk/subagents
76. CrewAI, crews. https://docs.crewai.com/en/concepts/crews
77. Semantic Kernel and its successor (secondary). https://atlan.com/know/ai-agent/microsoft/semantic-kernel/ ; Microsoft Agent Framework blog https://devblogs.microsoft.com/agent-framework/

**Internal files referred to (not restated):** `ai-in-regulated-work-2026-10.md`; `../commercial/provider-and-cost.md` (§2.6, §3.3 to §3.5); `../design/ai-organisation.md`; `../design/ai-carve-out-register-2026-10-11.md`; `../design/workers/catalogue.md`; `../requirements/provider-test-script.md`; `../decisions.md` (AIW-D13, D35, D44, D69, D71, D80 to D84).

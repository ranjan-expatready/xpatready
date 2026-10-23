# Can the AI be deterministic? Accuracy, repeatability and rule fidelity for AI teammates

> **Version pointer notice (13 Oct 2026):** this file was written on 11 or 12 Oct and cites AW-01 at v0.6 to v0.9, AW-02 at v0.8 to v1.1 and `sources/drive-snapshot-2026-10-11/` as its source. The current files are AW-01 v0.10, AW-02 v1.1 and `sources/drive-snapshot-2026-10-13/` (51 files; for example AG-07 v2.9). Where a citation here conflicts with a current file, the current file governs.

**Date:** 12 Oct 2026. **Author:** research subagent for the Lead (maker). **Status:** research input for Step R; fix round after hostile check R2 (`../checks/review-R2-2026-10-12.md`, verdict FAIL), re-checked R2-b; Lead fixes applied. **Asked by:** the founder, 12 Oct 2026: "Can we make the AI workers' results deterministic, always reflect the deterministic rules we build in the product, and be reliable, trustable, repeatable and consistent in output and quality?"

**What this is.** A gap file. It builds on, and does not restate, `ai-architecture-deterministic-2026-10.md` (11 Oct; cited below as **[A §n]**), which already covers the deterministic shell (the Conductor), structured outputs, validators, guardrail layers, durable replay, which tasks go to AI, skills, tracing, failure codes, evaluation (pass^k, shadow, drift), cost, permissions and Canada-only models. It also builds on the team's own requirements, cited by ID: AG-03 v1.4 (the Qualifier, pathway assessment), AG-09 v1.8 (document management and the Reader), AG-11 v1.12 (automation), and Workstream 2's AW-01 v0.6 and AW-02 v0.8. It sits under the founder's directions AIW-D84 (the platform is the guardrail) and AIW-D91 (the moat is the deterministic platform under the AI) in `../decisions.md`.

**One rule that governs everything below (AIW-D13; AG-09 v1.8 version note 1.4 and data model; AW-1-119).** Every value the AI proposes is approved by a person before it takes effect. **No colour, score, agreement signal or check in this file ever removes that approval.** Signals only decide the order in which a person reviews and how much attention each value gets. Any move to less review is a "lowering of a review level" under AW-1-119 and a founder decision.

**Evidence labels** (same as [A]):
- **[V]** Verified: read on the vendor's or standards body's own page, or in the primary paper (abstract or text).
- **[VC]** Vendor claim: said by a vendor about its own product, or a benchmark run by a company that competes on it.
- **[S]** Secondary: a third-party article, search summary, forum post; indicative only.
- **[I]** Our own inference or arithmetic.
- **Proposal / Assumption / Unknown**: as in README §0 rule 5.

Numbers in square brackets, such as [7], point to section (e). All web sources accessed **12 Oct 2026**. No personal names (AIW-D35); authors are described by organisation.

**Words used, in plain English.**
- *Deterministic*: same input, same output, every time.
- *Temperature, top-p, top-k*: settings that control how much randomness the model uses when picking each next word; lower means less random.
- *Seed*: a starting number for the random choices; same seed is meant to give the same choices.
- *Batch*: a group of different customers' requests that the provider's computer processes together to save money.
- *Kernel*: one small calculation program that runs on a graphics chip. *Batch-invariant kernels* give the same result whatever else is in the batch.
- *Graphics chips (GPUs), compute capability, H100*: the specialised computer chips AI runs on; "compute capability 8.0" is the chip generation number NVIDIA uses; H100 is one current model.
- *CUDA graphs, FlashInfer, FlashAttention 3, Triton*: technical options inside the AI server software; they matter only to engineers choosing settings.
- *Mixture-of-experts*: a model made of many sub-networks, each word being sent to a few of them.
- *Hash / fingerprint*: a short code computed from a file or text; any change to the file changes the code.
- *Log-probabilities ("logprobs")*: the model's own internal score for how likely each word was.
- *Calibrated*: when a system says "90% sure", it is right about 90% of the time.
- *Self-consistency / majority vote*: ask the same question several times and take the most common answer.
- *Few-shot / zero-shot*: giving the model a few worked examples in the request, or none.
- *Enumeration*: a fixed list of allowed answers.
- *Normalise*: put values in one standard form before comparing them (for example all dates as YYYY-MM-DD).
- *Vision-language model*: an AI model that reads images as well as text.
- *Value F1*: one combined score of how many values a system found and how many of those were right; not the same as "share of fields read correctly".
- *LegalBench*: a public set of legal reasoning test questions.
- *pass^k*: the share of cases where the AI is right on every one of k repeated tries (pass^3 = right all three times); it measures consistency.
- *OCR*: software that turns a scanned image into text.
- *Shadow*: the skill runs on real files but nobody sees its output; its answers are compared with what people decided.
- *Harness*: the test program that feeds test cases to the AI and scores the answers.
- *Alias*: a model name that the provider can point at a newer version without notice (for example "latest").
- *Frozen slice*: a fixed part of the test set kept unchanged so results can be compared week to week.
- **The Qualifier and Pack rules**: this file's one phrase for the team's deterministic side: the Qualifier (AG-03 v1.4, the eligibility and scoring engine) and the other Doers running the Country and Practice Pack rules, all run by the Conductor (AIW-D91).

---

## (a) Summary for the founder (12 lines)

1. **No: a hosted AI model call cannot be made exactly repeatable today, on our Canada route.** Google says its "temperature 0" is only "mostly deterministic" and its seed is "best effort"; Cohere says determinism "cannot be totally guaranteed".
2. **On Gemini 3.5 Flash we can lower the randomness, but Google advises against it for Gemini 3 models, and even at zero it is only "mostly" repeatable.** From Gemini 3.6 Flash the setting is ignored, so the next model will remove even that option.
3. **The cause is understood.** A Sept 2025 study ran one prompt 1,000 times at temperature 0 and got 80 different answers, because each request is processed together with other customers' requests. With special settings, all 1,000 were identical, at about 1.6 to 2 times the time. That fix is only possible on servers we run ourselves.
4. **So exact repeatability must come from the platform, not the model.** We store every AI answer with a fingerprint of the file, skill version, model version and Pack rule versions; the same file shows the stored answer, byte for byte. The team's specification already does this for eligibility results (AG-03); we extend it to AI.
5. **A fresh AI run can only be made *measurably consistent*, not identical.** We measure it: run each test case several times and publish how often all runs agree (pass^k, [A §5.1]).
6. **Accuracy rises when the AI must show the exact words it read each value from**, and our code checks those words are really in the document. A vendor-run 2026 benchmark found general AI models return no such evidence unless asked.
7. **The AI must never hold the rules.** The Qualifier and Pack rules decide; the AI may only explain their result and cite the rule ID; code checks every rule ID and every number it quotes against their output.
8. **Evidence supports this split.** Intuit's tax engine is "deterministic" and the AI explains; a 2026 study (by authors apparently linked to a rule-engine maker) found top AI models fail on "unless … except …" rules that a rule engine gets right, and changed behaviour silently under the same model name.
9. **The AI's own "I am 90% sure" cannot be relied on.** A 2024 study found models' stated confidence overconfident and, in its tests, only a little better than chance at flagging their own errors; newer models may do better, but no study shows it is reliable enough to lean on. A forum reply (role not shown) says Gemini 3.x no longer returns internal scores; unconfirmed with Google. We use our own checks and, where measured to help, agreement between runs.
10. **Our accuracy is Unknown until our own test set exists.** The only public figure for our model is 79.8% (87.9% on short documents) on a vendor-run benchmark of business documents, not immigration documents. Handwriting is much worse. Only our own expert-graded test set gives a number we may quote.
11. **Passports' machine-readable lines can be checked by arithmetic** (check digits), so a misread is usually caught by code. Something still has to read them; the check is a proposal to the team.
12. **Bottom line:** rules, numbers, dates, fees, points, checks and stored answers are exactly repeatable; AI reading, sorting and drafting are only measurably consistent, and a person approves every value; eligibility, rule choice and any final decision must never be AI.

---

## (b) Findings per topic

### 1. Can a hosted model call itself be made deterministic?

#### 1.1 What each provider promises (our routes first)

| Route | Temperature 0 / top-k 1 | Seed | Other | Label |
|---|---|---|---|---|
| **Gemini on Vertex AI** (our primary, [A §8.3 item 1]) | "A temperature of 0 means that the highest probability tokens are always selected"; responses are "mostly deterministic, but a small amount of variation is still possible". | "best effort to provide the same response"; "Deterministic output isn't guaranteed"; changing model or settings can change output even with the same seed. | **For Gemini 3.6 Flash and later**, custom `temperature`, `topP` and `topK` "aren't supported" and "are ignored if set". On 3.5 Flash they still work. | [V] [1] |
| **Gemini 3 guidance** | Google recommends keeping temperature at the default 1.0 for Gemini 3; lowering it may cause unexpected behaviour, loops or degraded performance, especially in complex reasoning or maths (our translation of the Spanish edition, which reads: "puede provocar un comportamiento inesperado, bucles"; the English page returned "not found"). Page updated 16 Sep 2026. **That this applies to Gemini 3.5 Flash is our inference**: the page says only "Gemini 3". | n/a | Suggests thinking level LOW for lower latency. | [V] wording [2]; [I] for 3.5 Flash |
| **Cohere** (back-up route) | Supported. | "best effort to sample tokens deterministically … determinism cannot be totally guaranteed". | | [V] [3] |
| **OpenAI** (context only; no Canada route, [A §8.1]) | Supported. | Seed plus a `system_fingerprint` (identifies the backend configuration); with all matching, outputs "mostly" identical; the fingerprint changes when the provider updates its infrastructure, "a few times a year". Users report outputs still diverge after a few words. | Cookbook dated Nov 2023. | [V] [4]; [S] user reports [4] |
| **Self-hosted vLLM** (back-up route with open models) | Supported. | Seed supported. | **Batch invariance mode** (`VLLM_BATCH_INVARIANT=1`): output "deterministic and independent of the batch size or the order of requests". **Beta.** NVIDIA chips of compute capability 8.0 or higher (latest and stable editions). Validated models include DeepSeek V3/R1, Qwen3, Llama 3.1/3.2, GPT-OSS, Mistral-7B and others; **no Cohere model is listed**. "May impact performance". | [V] [5] |
| **Self-hosted SGLang** | Supported. | Seed (default 42) keeps even non-zero temperature repeatable. | `--enable-deterministic-inference`, built on Thinking Machines Lab's batch-invariant operators; works with three back-end options. The SGLang team reports average overhead of 34.35% (against 61.5% for the original Thinking Machines kernels), most slowdowns between 25% and 45%. | [V] [6]; [VC] overhead |

**Reading [I].** On the only current model with a Canadian processing promise (Gemini 3.5 Flash, [A §8.3 item 1]), we can set temperature 0, but Google's guidance for Gemini 3 says not to, and the next model generation ignores the setting. Even where it is honoured, Google promises only "mostly". **Exact repeatability of a fresh model call is not available on our primary route and should never be promised.**

#### 1.2 Why temperature 0 is still not deterministic

- **Thinking Machines Lab, "Defeating Nondeterminism in LLM Inference" (10 Sep 2025)** [7] [V]. The usual explanation ("parallel arithmetic on graphics chips adds numbers in a different order") is incomplete. The main cause is the lack of **batch invariance**: the calculation for one request changes with how many other requests share its batch, and that depends on server load. Experiment: 1,000 completions at temperature 0 of one prompt on Qwen3-235B-A22B gave **80 distinct completions**; the most common appeared 78 times; all agreed for the first 102 tokens (word pieces) and split at the 103rd. With batch-invariant kernels, **all 1,000 were identical**. Cost (timed on a smaller model, Qwen3-8B on one chip, 1,000 sequences): 26 s normally, 55 s deterministic unoptimised (about 2.1×), 42 s with an improved kernel (about 1.6×).
- **Mixture-of-experts models** were the test model above, and Cohere Command A+ is one too ([A §8.1]). Routing decisions can flip when tiny numerical differences occur, so small differences become different words [I, consistent with [7]].
- **Other research.** A Jan 2026 paper (code under a Microsoft repository) proposes enforcing determinism only for the requests that need it, using a fast path plus a verify-and-roll-back loop, to avoid paying the overhead on all traffic [8] [V abstract].
- **The model also changes under the same name.** A Jul 2026 study measured one frontier model's accuracy on a construction-insurance rule set rising from 96.6% to 100% between March and April 2026 under the same model alias, with "no version bump", same prompt and harness [9] [V abstract]. Pinning a snapshot ([A §3.3]) is necessary but providers do not always expose one.

#### 1.3 Measured variance studies

| Study | What was measured | Result | Label |
|---|---|---|---|
| Non-determinism of "deterministic" LLM settings (arXiv 2408.04667, Aug 2024, revised Apr 2025) [10] | 5 models configured to be deterministic, 8 tasks, 10 runs each, zero-shot and few-shot | Accuracy varied **up to 15%** between runs; gap between best and worst possible run **up to 70%**; "none of the LLMs consistently delivers repeatable accuracy across all tasks, much less identical output strings". | [V] abstract |
| Thinking Machines [7] | 1 prompt × 1,000 runs, temperature 0 | 80 unique outputs; 1 unique with batch-invariant kernels | [V] |
| ReasonBENCH (arXiv 2512.07795, Dec 2025) [11] | Repeated runs of reasoning models and strategies | "Vast majority" show high instability; methods with similar average accuracy had confidence ranges up to 4× wider | [S] |

**What this means for us [I].** A single test run of a skill proves little. The driving test ([A §5.3]) must run each case several times and report the spread, and any number we publish should be "x% over k runs", not one run.

#### 1.4 Even perfect model determinism would not be enough [I]

A deterministic model gives the same output only for byte-identical input. Our input to the model includes the OCR text (which changes if the OCR engine is updated or the scan is re-uploaded), the prompt, the Pack rules in the prompt, and the model version. Any change gives a different answer, and a deterministic wrong answer is still wrong. Determinism is about repeatability, not correctness.

---

### 2. Repeatability at the product level when the model is not deterministic

**Built on:** AG-03 v1.4 §1 ("every assessment is **stamped with the exact pack/rules version** it was computed under … re-running against a newer version is an explicit, logged decision, never a silent overwrite"), the team's rule for the Qualifier; AG-09 v1.8 AG-9-43 and the `DocumentExtraction` data model (each proposed value already carries `provenance`, `confidence`, `modelId`, `promptVersion`); [A §1.3 item 5] (store each AI answer so a crash recovery re-uses it). **What is new here:** applying the team's AG-03 stamping-and-replay rule to every AI step, with a full input fingerprint.

#### 2.1 The pattern [I]

1. **Fingerprint every AI step's full input**, adding to the fields AG-09 already stores: hash of the source file bytes; OCR engine name and version and a hash of its text output; skill version (prompt, schema, validators); model, snapshot and region; parameter settings (temperature, thinking level); Pack rule set versions; example-set version.
2. **Store the answer against that fingerprint** in the run record, in Canada ([A §4.5 item 1]).
3. **Replay, do not re-run, whenever the fingerprint matches**: re-opening the file, an auditor's review, a complaint, a regulator's question. The stored answer is shown with the date it was produced and by which versions. This is exactly repeatable.
4. **Re-run only when something in the fingerprint changed**, or a person deliberately asks for a fresh read (for example a better scan). As in AG-03, a re-run is an explicit, logged **new** record; the old one is never overwritten. If the new answer differs from what the person approved earlier, the platform raises a "changed answer" item in Needs you instead of silently replacing it.
5. **Approved values are the record, not the AI answer.** Approving a Reader value is its verification (AG-09 v1.8, AG11-D10, "approve = verify"); downstream Doers use the verified value ([A §2.3 item 2]); the AI answer is kept only as evidence of what was proposed.

#### 2.2 When re-running is right, and when replay is right [I]

| Situation | Replay or re-run | Why |
|---|---|---|
| Audit, complaint, regulator review, "what did the AI say then?" | **Replay** | The question is about the past; a new run would rewrite history. |
| Crash or retry mid-run | **Replay** if the step completed | [A §1.2] durable workflow pattern. |
| New skill version, new model, new Pack rule version | **Re-run in shadow** on made-up test files and, once allowed, shadow files; never change live approved values | The point is to measure the new version against expert answers ([A §5.3]). |
| Better scan uploaded | **Re-run** (new fingerprint) | Different input. |
| Person doubts the answer | **Re-run once**, show both answers side by side | Disagreement between two runs is itself a useful warning (section 5). |

#### 2.3 What "same file, same answer" may honestly claim [I]

"For a given file and given versions, Expat Ready always shows the same stored AI proposal, and records which person approved what." It may **not** claim "the AI always produces the same answer"; that is false on every hosted model (section 1).

---

### 3. Raising accuracy and consistency

| Technique | What the evidence says | Cost and limits | Label |
|---|---|---|---|
| **Majority vote across k runs** (self-consistency) | Well established for reasoning and short answers [12]. For extraction, the evidence is thin: votes split when the same value is written differently ("2" vs "two", date formats), so values must be normalised by code before counting [12]. One 2026 workshop paper found voting **lowered** accuracy on hard questions for small models [12]. "Parallel thinking" (several short independent runs then a vote) beat one long thinking run by up to 20% on reasoning tasks [13]. | k runs cost k times the tokens for that step. A whole prepared file costs about USD 1.27 in model tokens ([A §6.3]); voting 3× on every call would make it about USD 3.81. Voting only on the few high-stakes fields costs a fraction of that [I arithmetic]. | [S] [12]; [V] [13]; [I] cost |
| **Two different models agree** | Already covered: [A §5.1, §8.2, §8.3 item 2] (judges favour their own family; a second Canadian route is needed first). Nothing new found. | | see [A] |
| **Extract, then quote the source** | Anthropic advises to "extract word-for-word quotes first" for long documents and, "If it can't find a quote, it must retract the claim" [14]. A "quote-gating" pattern requires every value to carry a verbatim span that code checks exists in the document [15]. A library that does this (Instructor) "allows up to 5 character errors by default", so it is fuzzy, not exact [15]. Models are still weak at pointing to the precise span [15]. ExtractBench (Aug 2026): "VLMs and coding agents return no evidence by default" [16]. | One extra field per value; cheap. A code check catches invented quotes, not a real quote that does not support the value; a person still checks meaning. | [V] [14][16]; [S] [15] |
| **Constrained choices** | Pack lists of allowed values (document types, relationship types, programme codes) passed as enumerations in the output schema. Changed capitalisation of enum values was seen on one provider [A §1.2]; the validator re-checks on every provider. | Removes a whole class of free-text errors. | [I] |
| **Break rules into small yes/no checks** | Structured rule application (each legal test split into yes/no conditions) raised GPT-4o's accuracy on LegalBench from 76.4% to 87.3% (+11 points); this is one model, and the paper's other two models showed different results [17]. | Supports "one small job per call". | [S] [17] |
| **Few-shot examples from the gold set** | Translating rules into logic plus retrieved worked examples "dramatically" improved tax reasoning (AAAI 2026) [18]. The variance study [10] found instability persisted in both zero-shot and few-shot. | Examples must be **made up** (AW-01 v0.6 AW-1-119: the evaluation set runs on synthetic samples; AW-02 v0.8 AW2-BR-9: "No real client's data is ever a pack sample"). | [V] [10][18] |
| **Reasoning ("thinking") settings** | More thinking widens the spread of answers [13]; reasoning setups are unstable across runs [11]. In the 2026 rule study, one frontier model matched a rule engine only **at low reasoning effort**; other configurations failed the same edge case [9]. Google suggests LOW thinking for latency [2]. | No study gives a general rule; the setting changes behaviour, so it must be pinned in the skill bundle and measured. | [S] [11]; [V] [2][9][13] |

**Reading [I].** For our step types: Reader and Sorter should use low thinking, constrained outputs, an exact-words source per value, and a vote only on high-stakes fields where shadow data shows it helps; Writer outputs are judged by a person, so voting adds little; Checker should be a different model family when one exists ([A §8.2]).

---

### 4. Making the AI "always reflect our rules"

#### 4.1 Evidence for "the engine decides, the AI explains"

| Domain | What is published | Label |
|---|---|---|
| **Tax (Intuit TurboTax)** | AWS case study (30 Jul 2024): Intuit Assist uses Claude via Amazon Bedrock to explain tax results, "underpinned by Intuit's proprietary tax engine", "backed by real-time accuracy checks" (not described), covering "15,000+ federal tax forms and state tax forms" [19]. Intuit's Vice President of AI, in VentureBeat (15 Jul 2024): "It's deterministic. We would never put a probabilistic system to do your taxes" [30]. | [V] case study [19]; [S] executive quote [30] |
| **Tax (research)** | "Language Models and Logic Programs for Trustworthy Tax Reasoning" (AAAI 2026): the language model translates rules into a logic program and a solver computes; this "dramatically" improves performance and lowers cost. | [V] abstract [18] |
| **Insurance, legal eligibility** | "Confidently Wrong: Exception Chain Collapse in Frontier LLM Rule Evaluation" (25 Jul 2026): frontier models fail on nested rules ("A is required unless B, unless C"); 225 scenarios in four regulated areas; on 20 adversarial insurance scenarios the rule engine scored 20/20 and three of four frontier configurations failed the same case; on 949 held-out LegalBench cases the engine was significantly more accurate than all three frontier models, by up to 41 points on curated multi-part tasks against the Anthropic models. **The authors appear linked to the engine's maker** (its repository sits under that organisation; the paper page gives no affiliations), so treat it as a vendor study. | [V] abstract; [VC] by nature [9] |
| **Public benefits (rules as code)** | Georgetown Beeck Center (2025): language models can help turn policy into code across seven US states, but "still require external knowledge and human oversight" for complex logic. A 2025 thesis used formal checks to catch agency explanations that "appear reasonable" but break the statute. | [S] [20] |
| **Automated reasoning products** | Covered in [A §1.2] (AWS Automated Reasoning checks: vendor claim "up to 99%", no independent benchmark, not in a Canadian region). New since: Feb 2026, policies can cite the source document. | [S] [21] |

**Reading [I].** Every credible example keeps the computation in code and uses the model only to translate (rule text to code, document to fields) or to explain. Immigration rules have the nested "unless" structure the 2026 study found models fail on (for example exemptions within exemptions in work-permit categories). This supports AIW-D91: the Qualifier and Pack rules decide.

#### 4.2 The mechanics [I]

**Built on:** AG-03 v1.4 §1 (the Qualifier returns "a **per-factor breakdown**" and is stamped with the pack/rules version); [A §1.3, §4.3, §4.5 item 2].

1. **Rules never live in the model's memory.** The model's general knowledge of Canadian immigration law is not a permitted source. Every rule-dependent statement must cite a Pack rule ID; a statement with no rule ID fails validation.
2. **The Qualifier and Pack rules compute; the AI never does.** Eligibility outcomes and points (AG-03), fees, deadlines, document lists and form-field mappings come from the Qualifier and the other Doers. The AI receives their result as structured input.
3. **The AI may explain, and only what the Qualifier and Pack rules produced.** The explanation schema has slots: outcome, rule IDs, the values used. Code checks: (a) every cited rule ID exists in the active Pack version; (b) every cited rule ID was actually applied for this file; (c) every number, date and outcome word in the text equals one of the Qualifier's output values (string match after normalising); (d) no outcome word contradicts the Qualifier (for example "eligible" when it said "not eligible"). Any failure is `rule_failed:<rule ID>` or a new code `explanation_mismatch` (extends the [A §4.5 item 2] list).
   - **Gap note, question for the team (Unknown):** check (b) needs the Qualifier to return the list of rule IDs it applied for each result. AG-03 v1.4 specifies a per-factor breakdown, not a list of rule IDs. Until the team answers, check (b) can only compare against the breakdown's factors. Per AIW-D87 this dependency is named, not designed by us.
4. **Rules are passed in, not remembered**: either as the cached prompt prefix ([A §6.4 item 3]) for reading tasks, or by the AI asking the Qualifier through a fixed tool call for explanation tasks. The Qualifier's answer is authoritative.
5. **Where the Pack has no rule, the AI says so.** "No rule covers this; a licensed person decides" ([A §2.1] question 1). It never fills the gap with its own view.
6. **When rules change**, the Pack version changes, which changes the fingerprint (section 2), which forces a re-run in shadow for affected skills.

---

### 5. Confidence: what to trust

**Built on:** AG-09 v1.8 AG-9-43 and the `DocumentExtraction` data model, which already give every proposed value a `confidence` field. **Question for the team (Unknown):** what that field holds. This file proposes it is filled from our own signals below, not the model's own words.

| Signal | Evidence | Usable on our route? | Label |
|---|---|---|---|
| **The model's stated confidence** ("I am 90% sure") | ICLR 2024 study (arXiv 2306.13063), tested on 2023-era models: verbalised confidence tends to be **overconfident**, "potentially imitating human patterns of expressing confidence"; the gap between method families is narrow, "e.g., 0.522 to 0.605 in AUROC" (example values; 0.5 is a coin toss); the same abstract reports calibration and failure prediction **improve as models get more capable**, and that all methods struggle on professional-knowledge tasks [22]. ICLR 2025: human-feedback training pushes models towards overconfidence [23]. | Available; **not reliable enough to lean on**; no study shows otherwise for current models. | [V] [22]; [S] [23] |
| **Token log-probabilities** | Introduced on Vertex for Gemini 2.5 (Jul 2025). A forum reply of 5 Aug 2026, from a person whose role is not shown, says: "This is currently WAI, logprobs are no longer returned for 3.X models" ("WAI" means "working as intended"). **Weak evidence; not confirmed with Google.** | Probably not on Gemini 3.x; yes on self-hosted vLLM [I]. To confirm in the provider test. | [S] [24] |
| **Agreement across k runs** | The ICLR 2024 study lists "consistency among multiple responses" as one way to reduce overconfidence [22]. For extraction the evidence is thin and voting can hurt (section 3). | Yes, where shadow data shows it helps per field; costs k× for that step. | [V] [22]; [S] [12] |
| **Our own validator results** | Check digit passes, quoted words found, Pack rule passes, cross-field match (passport visual zone vs machine-readable lines; same date across documents). | Yes; free; deterministic. | [I] |
| **OCR engine word confidence** | Google Document AI and Amazon Textract return a confidence per word or block (from their docs; not re-read today). | Yes. | [I] |

#### 5.1 Using signals to order a person's review, from measured data [I; Proposal]

**Every field still needs a person's approval.** The colour only sets the order and how much attention each field gets:
- **green**: approved together with the other green fields on that document, with the document regions visible under AW-01's approve-all safeguards (AW-1-33, AW1-D25);
- **amber**: opened and approved one by one;
- **red**: typed or confirmed by the person from the document.

How to set the colours:
1. In the driving test and later in shadow ([A §5.3 item 4]), record for each field: the signals (runs agreeing, quoted words found, validators passed, OCR confidence band) and whether the AI value matched the expert's or the approver's final value.
2. Group fields into buckets by signal combination (for example "3 of 3 agree + quoted words found + all validators pass"). Measure each bucket's observed error rate.
3. Set a **per-field bar** with the immigration specialist (Proposal; AIW-D83 sets the skill's floor for dropping back to shadow, not this). A bucket is green only if its measured error rate is at or below that bar. Everything else is amber or red.
4. **Sample sizes matter.** If a bucket shows zero errors in n cases, the honest 95% upper bound on its error rate is about 3/n (the "rule of three"). To claim "at most 1% wrong" with 95% confidence needs about **300 error-free cases** in that bucket; "at most 0.5%" needs about 600. Measure **per firm only**; pooling results across firms is a new use of client data and a question for counsel and the founder (**Unknown**). Until a firm reaches the sample size, its fields default to amber.
5. **Show colours with reasons, not percentages.** "Amber: two reads disagreed on the date of birth" is useful; "87% confident" invites false trust.
6. Recalibrate whenever the fingerprint inputs change (new skill, model or Pack version).
7. **Moving any field from "person approves" to anything less is out of scope here.** It would be a lowering of a review level under AW-1-119 and a founder decision.

---

### 6. Published accuracy figures for document extraction

| Benchmark | Date | What | Result | Label |
|---|---|---|---|---|
| **ExtractBench** (run by LlamaIndex, which sells an extraction product) [16] | 11 Aug 2026 | 370 business documents, 4,869 pages, 67 document types, 14 systems; score is value F1 | Best: 95.6% (the vendor's own system). General vision-language models 47.9 to 87.3%. **Gemini 3.5 Flash 79.8% overall; 87.9% on documents of 10 pages or fewer; 69.8% on 11 to 50 pages.** On documents over 50 pages every commercial vision-language model falls below 35% recall (it misses most values). No run-to-run consistency reported. | [V] page; [VC] by nature |
| **IDP Leaderboard v1.5** (run by Nanonets, a competitor) [25] | 2026 | 16 datasets, about 9,229 documents, 6 tasks | Key-information extraction around 80 to 91 for Gemini 3 Flash depending on snapshot; handwriting OCR capped at about 75.5% across every model tested; sparse tables under 55% for most. | [VC]; [S] for the cap |
| **Passport machine-readable zone** (MRZ, the two lines of `<<<` text) | 2026 | ICAO Doc 9303 check digits: weights 7-3-1, sum modulo 10, per field plus a composite digit [26] | A vendor whitepaper reports document number, birth date and expiry date all passing their check digits on 95.5% of 266 passports [26]. A misread can still pass a check digit by chance, so a pass is strong evidence, not proof [26]. | [VC] number; [S] method |

**Reading.**
- **Passport MRZ (Proposal, for the team; AG-09 v1.8 AG-9-43, AG11-D4).** The team's specification puts the passport MRZ in the Reader's Release 1 scope; this file does not change that. Proposal: after the Reader or OCR reads the MRZ lines, code checks the check digits and compares the result with the visual zone; a failed check or a mismatch is amber. Check digits validate characters; they do not read them [I].
- **Typed letters and forms (Assumption):** on business documents our model scored 79.8% value F1 overall and 87.9% on short documents [16]. We assume immigration letters behave similarly before our checks; this is not a field-accuracy figure and must not be quoted.
- **Handwriting, phone photos, poor scans:** expect much lower [25]; these should default to amber or red [I].
- **Language-test results, police certificates, bank letters:** no benchmark found (**Unknown**).
- **No published benchmark covers immigration documents.** Vendor benchmarks are not our accuracy and must never be quoted as such. Our figure comes only from our own expert-graded, made-up test set (AW-1-119).

---

### 7. What best-in-class regulated products publish to earn trust

| Source | What is published | Lesson for us | Label |
|---|---|---|---|
| **EU AI Act, Articles 15(3), 13(3)(b)(ii) and (v)** | High-risk systems must declare "levels of accuracy and the relevant accuracy metrics" in the instructions for use (15(3)); the instructions describe the accuracy tested and circumstances that may affect it (13(3)(b)(ii)) and, where appropriate, performance on specific groups (13(3)(b)(v)). No numeric threshold set. Not binding on Expat Ready in Canada [I]. | A ready template for an honest accuracy statement. | [S] (law text via reproduction site; check the Official Journal) [27] |
| **Vals Legal AI Report** (Feb 2025) | Independent study of four legal AI tools on seven tasks against a lawyer baseline. Example: Harvey 94.8% on document Q&A; CoCounsel 77.2% on summarisation; lawyers beat all tools on redlining (79.7%). Vendors could withdraw from tasks before publication, and an AI model graded answers against predefined elements. | Independent, task-level numbers with a human baseline earn trust; opt-outs and AI grading weaken it. | [V] [28] |
| **Harvey BigLaw Bench** (Aug 2024) | Own benchmark built from lawyers' real tasks, rubric per task, penalties for hallucinations, a separate "source reliability" score. | Score the evidence (sources) separately from the answer. | [VC] [29] |
| **Intuit** | "Real-time accuracy checks", not described publicly [19]. | Vendors often assert rather than publish. A published method is a differentiator. | [V] |

---

## (c) Recommendations for Expat Ready

Each is marked **NEW** or **EXTENDS [A §n]**, with the team requirements it is **built on**. All are proposals for the Lead; none is a decision until the founder ratifies. None removes a person's approval of any value (AIW-D13).

| # | Recommendation (plain English) | Tag | Built on |
|---|---|---|---|
| R1 | **Never promise "deterministic AI".** Promise "deterministic platform, measured AI": rules and stored answers are exact; AI proposals are measured and every value is approved by a person. Use this wording in the Handbook's "why this AI is different" section (AIW-D91). | NEW | AIW-D13, AIW-D91 |
| R2 | **Fingerprint and replay every AI step** (section 2.1): file hash, OCR version and text hash, skill version, model snapshot and region, settings, Pack rule versions, example-set version. Replay on any match; re-run only on change or a person's request, as a new logged record; never overwrite; raise "changed answer" in Needs you if it differs from what was approved. | EXTENDS [A §1.3 item 5, §4.5 item 1] | AG-03 v1.4 §1 (stamping and logged re-run pattern); AG-9-43 and AG-09 v1.8 `DocumentExtraction` (`modelId`, `promptVersion`, `provenance`) |
| R3 | **Model settings per skill, pinned and measured, not assumed**: on Gemini 3.5 Flash, test temperature 1.0 (Google's Gemini 3 advice) against a lower value on the skill's test set and pick by measured accuracy and pass^k; thinking level LOW for Reader and Sorter unless the test set says otherwise. Record the settings in the skill bundle. Plan for the next Gemini model ignoring these settings. | EXTENDS [A §3.4 item 3] | AG-09 v1.8 `promptVersion` |
| R4 | **If the back-up self-hosted route is built, run it in deterministic mode** (vLLM batch invariance or SGLang deterministic inference) and choose a model on the validated list; budget roughly 1.3 to 2× GPU time [I, from [6][7]]. This gives exact repeatability for fresh calls on that route only. Command A+ would need its own validation. | EXTENDS [A §8.3 item 2] | AIW-D74 (Canada for all AI) |
| R5 | **Every extracted value carries the exact words it was read from**, as well as document and page. Code checks the words exist in the OCR text after normalising spaces and quote marks; exact match only, no silent repair; a failed check is amber. "Not found" stays distinct from "not verified". The new part is only the exact words and the code check. | EXTENDS [A §4.3 item 2, §7.4 item 4] | AG-9-43 (provenance: document, version, location) |
| R6 | **Vote only where it pays**: for a short list of high-stakes fields per skill (for example identity numbers, dates of birth, expiry dates, names), run the Reader 3 times, normalise, and require agreement; disagreement is amber. Measure in the driving test whether voting actually reduces errors per field before keeping it (one study found it can hurt). | NEW | AG-9-43 |
| R7 | **The Qualifier and Pack rules decide, the AI explains, code checks the explanation** (section 4.2): rule IDs must exist and must have been applied; every number, date and outcome word must equal the Qualifier's output; new failure code `explanation_mismatch`. No rule, no AI statement. **Team question:** can the Qualifier return the rule IDs it applied for each result? | EXTENDS [A §2.3 item 3, §4.5 item 2] | AG-03 v1.4 (the Qualifier and its per-factor breakdown) |
| R8 | **Small, constrained calls**: one document and one job per call; allowed values from the Pack as enumerations; rule-like checks split into yes/no conditions that the Qualifier and Pack rules combine. | EXTENDS [A §1.3 item 2] | AG-9-43 (field lists are pack content) |
| R9 | **The `confidence` on a proposed value comes from our signals, not the model's words**: agreement across runs (where measured to help), quoted words found, validators, check digits, OCR confidence. Ignore model-stated confidence; do not depend on log-probabilities on Gemini 3.x. Signals set review order and attention only (section 5.1); every value is still approved by a person. **Team question:** what the field holds today. | NEW | AG-9-43 and AG-09 v1.8 `DocumentExtraction.confidence`; AW-1-33 |
| R10 | **Passport MRZ check by code (Proposal, for the team)**: after the Reader or OCR reads the MRZ lines, code checks the check digits and compares the result with the visual zone; a failed check is amber. The Reader's scope is unchanged. | NEW | AG-9-43, AG11-D4 |
| R11 | **Driving test reports spread, not one run**: each test case run k times (k = 5, Proposal); report field accuracy, correct "not found" rate, pass^k, and per-bucket error rates. The weekly drift re-run is already in [A §5.3 item 6]; the new point is that drift can happen under the same model name [9]. | EXTENDS [A §5.3 items 2 and 6] | AW-1-119 |
| R12 | **Publish an "AI accuracy sheet" per skill version (Proposal; extends AIW-D85, founder to decide)**, modelled on EU AI Act Articles 13 and 15: test set size and make-up, who graded it, accuracy per field type, not-found accuracy, consistency over k runs, model and date, conditions that lower accuracy (handwriting, phone photos, long files), and what the skill must never be used for. Firms see it on the AI team page. Counsel reads it before release. | NEW | AIW-D85, AW-1-119 |
| R13 | **Examples and test cases are made up and versioned**; no real client's data in prompts, examples or test sets. | NEW | AW-1-119, AW2-BR-9, AIW-D64, AIW-D68 |

### Bottom line, brutally honest

| Can be made **exactly repeatable** | Can only be made **measurably consistent** | Must **never be AI** |
|---|---|---|
| Every eligibility outcome and points score (AG-03, the Qualifier), Pack rule result, fees, deadlines, document lists, form mappings, permissions, workflow order (the Conductor, Doers and Packs). | Reading values from documents (Reader). | Deciding eligibility, points, fees, deadlines or which rule applies (AG-03). |
| Check-digit and format checks; validator results. | Sorting and classifying documents (Sorter). | Verifying a value (a person does; approve = verify, AG11-D10; AIW-D13). |
| The stored AI proposal for a given file and versions (replay), and the audit trail of who approved what. | Drafting letters and explanations (Writer). | Filing, signing, sending, moving money ([A §2.3 item 2]). |
| A fresh AI call **only** on a self-hosted model in deterministic mode, and only for byte-identical input. | The AI Checker's second view. | Using the model's own memory of immigration law as a source. |
| | The explanation text (its *facts* are code-checked against the Qualifier; its *wording* varies). | Skipping a person's review on any signal. |

**What we can honestly say to a firm [I]:** "The rules give the same answer every time. The AI reads and drafts; every value shows where it came from; our checks catch most errors; you approve everything; and we publish how accurate and how consistent each skill measured on expert-graded test files." **What we cannot say:** "The AI is deterministic", any accuracy percentage (until our own test set shows it), or "the AI follows the rules" without the code check of R7.

---

## (d) What not to do

1. **Do not market "deterministic AI".** It is untrue on every hosted model, including ours [1][3][7].
2. **Do not set temperature 0 on Gemini 3 and assume the job is done.** Google's Gemini 3 guidance warns against it [2], it is still only "mostly" deterministic, and newer Gemini models ignore it [1].
3. **Do not rely on the seed.** Every provider calls it "best effort" [1][3][4].
4. **Do not re-run old files and overwrite answers when a version changes.** Replay for audit; re-run as a new logged record (section 2; AG-03 v1.4 §1).
5. **Do not show or use the model's own confidence numbers** [22][23].
6. **Do not let the AI state any number, date, fee, point score or outcome that the Qualifier and Pack rules did not produce**, even in a friendly explanation (section 4.2).
7. **Do not vote k times on everything.** It multiplies cost and can lower accuracy; measure per field first [12].
8. **Do not quote vendor benchmarks as our accuracy.** ExtractBench and the IDP leaderboard are run by vendors and are not immigration documents [16][25].
9. **Do not accept fuzzy-matched quotes silently** as proof of where a value came from [15].
10. **Do not treat a check-digit pass as proof**; it is strong evidence that still needs the visual-zone comparison [26].
11. **Do not let any colour, score or signal remove a person's approval of a value** (AIW-D13, AW-1-119), and do not claim a bucket is reliable from a small sample (section 5.1).
12. **Do not assume a model name means fixed behaviour**; providers change behaviour under the same alias [9].
13. **Do not use real client data in examples, test sets or pooled statistics** (AW-1-119, AW2-BR-9).

**For the Lead (not changed here; this file is the only one written):** [A §5.3 item 1] says test cases are "real-file cases (de-identified)", which conflicts with AW-1-119 (synthetic samples); the checker also flags [A §8.3 item 5] against AIW-D74. Three team questions are raised above: the Qualifier's applied rule IDs (R7), the MRZ code check (R10), and what `confidence` holds (R9).

---

## (e) Sources

All accessed 12 Oct 2026. [A] = `ai-architecture-deterministic-2026-10.md` (11 Oct 2026), cited by section.

1. Google Cloud, Vertex AI, "Content generation parameters" (temperature, top-k, top-p, seed; Gemini 3.6 Flash and later ignore sampling parameters; last updated 9 Oct 2026). https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/content-generation-parameters
2. Google Cloud, Vertex AI, "Gemini 3 prompting guide" (temperature 1.0; thinking level; updated 16 Sep 2026; Spanish edition read, English edition returned "not found"). https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/gemini-3-prompting-guide?hl=es
3. Cohere, Chat API reference (`seed`). https://docs.cohere.com/reference/chat
4. OpenAI Cookbook, "How to make your completions outputs reproducible with the new seed parameter", Nov 2023. https://developers.openai.com/cookbook/examples/reproducible_outputs_with_the_seed_parameter ; user reports https://community.openai.com/t/seed-param-and-reproducible-output-do-not-work/487245
5. vLLM documentation, "Batch invariance" (latest and stable editions). https://docs.vllm.ai/en/latest/features/batch_invariance/ ; https://docs.vllm.ai/en/stable/features/batch_invariance/
6. SGLang documentation, "Deterministic inference". https://docs.sglang.io/advanced_features/deterministic_inference.html ; LMSYS blog, 22 Sep 2025 https://lmsys.org/blog/2025-09-22-sglang-deterministic/
7. Thinking Machines Lab, "Defeating Nondeterminism in LLM Inference", 10 Sep 2025. https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/
8. "LLM-42: Enabling Determinism in LLM Inference with Verified Speculation", arXiv 2601.17768, Jan 2026. https://arxiv.org/abs/2601.17768
9. "Confidently Wrong: Exception Chain Collapse in Frontier LLM Rule Evaluation", arXiv 2607.23386, 25 Jul 2026 (no affiliations on the page; repository under the engine maker's organisation). https://arxiv.org/abs/2607.23386
10. "Non-Determinism of 'Deterministic' LLM Settings", arXiv 2408.04667 (v5). https://arxiv.org/abs/2408.04667
11. "ReasonBENCH: Benchmarking the (In)Stability of LLM Reasoning", arXiv 2512.07795, Dec 2025. https://arxiv.org/abs/2512.07795v1
12. Self-consistency evidence: "Confidence Improves Self-Consistency in LLMs" (Findings of ACL 2025) https://arxiv.org/pdf/2502.06233 ; "Certified Self-Consistency" https://arxiv.org/html/2510.17472v1 ; COLM 2026 workshop paper on voting harming hard questions https://www.alphaxiv.org/abs/2608.11403.md
13. "Does Thinking More Always Help?", arXiv 2506.04210. https://arxiv.org/html/2506.04210v2
14. Anthropic, "Reduce hallucinations" (extract quotes first; retract unsupported claims). https://platform.claude.com/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
15. Quote-gating and span checks: Instructor CitationMixin https://python.useinstructor.com/concepts/citation/index.md ; "Explicit Evidence Grounding via Structured Inline Citation Generation", arXiv 2606.07130 https://arxiv.org/pdf/2606.07130 ; practitioner write-up https://alpeshnakrani.com/books/hallucination-mechanically/a-citation-is-not-proof/
16. LlamaIndex, "Introducing ExtractBench", 11 Aug 2026. https://llamaindex.ai/blog/introducing-extractbench
17. "When Condition Trees Help LLMs Apply Legal Rules: Three-Model Evidence from LegalBench", ICML 2026 listing. https://icml.cc/virtual/2026/80604
18. "Language Models and Logic Programs for Trustworthy Tax Reasoning", arXiv 2508.21051, AAAI 2026. https://arxiv.org/abs/2508.21051
19. AWS Machine Learning Blog, "Intuit uses Amazon Bedrock and Anthropic's Claude to explain taxes in TurboTax", 30 Jul 2024. https://aws.amazon.com/blogs/machine-learning/intuit-uses-amazon-bedrock-and-anthropic-claude-to-explain-taxes-in-turbotax-to-millions-of-consumer-tax-filers
20. Georgetown Beeck Center, "AI-Powered Rules as Code: Experiments with Public Benefits Policy" (summary). https://digitalgovernmenthub.org/library/ai-powered-rules-as-code-experiments-with-public-benefits-policy-summary-key-takeaways/ ; University of Maryland thesis, arXiv 2512.12109 https://arxiv.org/abs/2512.12109v2
21. AWS, Automated Reasoning policies include source-document references, Feb 2026 (French edition). https://aws.amazon.com/fr/about-aws/whats-new/2026/02/automated-reasoning-policies-include-references/
22. "Can LLMs Express Their Uncertainty? An Empirical Evaluation of Confidence Elicitation in LLMs", ICLR 2024, arXiv 2306.13063. https://arxiv.org/abs/2306.13063
23. "Taming Overconfidence in LLMs: Reward Calibration in RLHF", ICLR 2025, arXiv 2410.09724. https://arxiv.org/pdf/2410.09724
24. Google developer forum, "Missing logprobs support in the newest Gemini models (3.1 Pro, 3.6 Flash)", 29 Jul to 5 Aug 2026. https://discuss.ai.google.dev/t/missing-logprobs-support-in-the-newest-gemini-models-3-1-pro-3-6-flash-on-vertex-ai-and-ai-studio/176557 ; Google Developers Blog, logprobs on Vertex AI, Jul 2025 https://developers.googleblog.com/en/unlock-gemini-reasoning-with-logprobs-on-vertex-ai/
25. Nanonets, IDP Leaderboard v1.5. https://benchmarking.nanonets.com/ ; summary https://nanonets.com/blog/idp-leaderboard-1-5/ ; aggregator https://benchmarklist.com/benchmarks/idp_leaderboard/
26. iApp, "Passport OCR benchmark 2026" (vendor whitepaper). https://iapp.co.th/whitepapers/passport-ocr-benchmark-2026.pdf ; ID Analyzer, how to read a passport MRZ https://idanalyzer.com/ja/blog/how-to-read-a-passport-mrz
27. EU AI Act, Article 15 and Article 13 (reproduction of OJ L 2024/1689). https://artificialintelligenceact.eu/article/15/ ; https://artificialintelligenceact.eu/article/13/
28. Vals AI, Legal AI Report, 27 Feb 2025. https://www.vals.ai/industry-reports/vlair-2-27-25 ; coverage https://www.lawnext.com/2025/02/legal-ai-tools-show-promise-in-first-of-its-kind-benchmark-study-with-harvey-and-cocounsel-leading-the-pack.html
29. Harvey, "Introducing BigLaw Bench", Aug 2024. https://www.harvey.ai/blog/introducing-biglaw-bench ; coverage https://legaltechnology.com/the-gen-ai-llm-benchmarking-war-starts-here-harvey-releases-new-evaluation-framework/
30. VentureBeat, "Top ten ways Intuit is revolutionizing personalization with generative AI", 15 Jul 2024 (quote from Intuit's head of AI). https://venturebeat.com/ai/top-ten-ways-intuit-is-revolutionizing-personalization-with-generative-ai

**Internal files referred to (not restated):** `ai-architecture-deterministic-2026-10.md` (§1.2, §1.3, §2.1, §2.3, §3.3, §3.4, §4.3, §4.5, §5.1, §5.3, §6.3, §6.4, §7.4, §8.1 to §8.3); `../decisions.md` (AIW-D13, D35, D64, D68, D74, D83, D84, D85, D87, D91); team snapshot `../../sources/drive-snapshot-2026-10-11/`: AG-03 v1.4 §1, AG-09 v1.8 (version note 1.4, AG-9-43, `DocumentExtraction`, AG11-D4, AG11-D10), AG-11 v1.12; `../requirements/AW-01-firm-ai-assistants_v0.1.md` v0.6 (AW-1-33, AW1-D25, AW-1-119); `../requirements/AW-02-platform-ai-assistants_v0.1.md` v0.8 (AW2-BR-9); `../checks/review-R2-2026-10-12.md`.

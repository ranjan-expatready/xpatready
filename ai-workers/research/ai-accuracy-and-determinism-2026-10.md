# Can the AI be deterministic? Accuracy, repeatability and rule fidelity for AI teammates

**Date:** 12 Oct 2026. **Author:** research subagent for the Lead (maker). **Status:** research input for Step R; not yet through the adversarial checker. **Asked by:** the founder, 12 Oct 2026: "Can we make the AI workers' results deterministic, always reflect the deterministic rules we build in the product, and be reliable, trustable, repeatable and consistent in output and quality?"

**What this is.** A gap file. It builds on, and does not restate, `ai-architecture-deterministic-2026-10.md` (11 Oct; cited below as **[A §n]**), which already covers the deterministic shell (the Conductor), structured outputs, validators, guardrail layers, durable replay, which tasks go to AI, skills, tracing, failure codes, evaluation (pass^k, shadow, drift), cost, permissions and Canada-only models. It sits under the founder's directions AIW-D84 (the platform is the guardrail) and AIW-D91 (the moat is the deterministic platform under the AI) in `../decisions.md`.

**Evidence labels** (same as [A]):
- **[V]** Verified: read on the vendor's or standards body's own page, or in the primary paper (abstract or text).
- **[VC]** Vendor claim: said by a vendor about its own product, or a benchmark run by a company that competes on it.
- **[S]** Secondary: a third-party article, search summary, forum post; indicative only.
- **[I]** Our own inference or arithmetic.

Numbers in square brackets, such as [7], point to section (e). All web sources accessed **12 Oct 2026**. No personal names (AIW-D35); authors are described by organisation.

**Jargon used, in plain words.**
- *Deterministic*: same input, same output, every time.
- *Temperature, top-p, top-k*: settings that control how much randomness the model uses when picking each next word; lower means less random.
- *Seed*: a starting number for the random choices; same seed is meant to give the same choices.
- *Batch*: a group of different customers' requests that the provider's computer processes together to save money.
- *Hash*: a short fingerprint of a file or text; any change to the file changes the fingerprint.
- *Log-probabilities ("logprobs")*: the model's own internal score for how likely each word was.
- *Calibrated*: when a system says "90% sure", it is right about 90% of the time.
- *Self-consistency / majority vote*: ask the same question several times and take the most common answer.

---

## (a) Summary for the founder (12 lines)

1. **No: a hosted AI model call cannot be made exactly repeatable today, on our Canada route.** Google says its "temperature 0" is only "mostly deterministic" and its seed is "best effort"; Cohere says determinism "cannot be totally guaranteed".
2. **Worse, Google advises against the usual fix.** For Gemini 3 models Google says to keep temperature at 1.0, and from Gemini 3.6 Flash onward the randomness settings are ignored. We cannot "turn the randomness off" on the model we plan to use.
3. **The cause is understood.** A Sept 2025 study ran one prompt 1,000 times at temperature 0 and got 80 different answers; the cause is that each request is processed together with other customers' requests. With special settings on our own servers, all 1,000 were identical, but about 1.6 to 2 times slower.
4. **So exact repeatability must come from the platform, not the model.** We store every AI answer with a fingerprint of the file, skill version, model version and Pack rule versions. Opening the same file again shows the stored answer, byte for byte. That is "same file, same answer", and it is honest.
5. **A fresh AI run can only be made *measurably consistent*, not identical.** We measure it: run each test case several times and publish how often all runs agree (the pass^k measure in [A §5]).
6. **Accuracy rises when the AI must show where it read each value** (page and exact words), and our code checks those words are really in the document. A leading 2026 extraction benchmark found general AI models give no such evidence unless forced.
7. **The AI must never hold the rules.** The Pack rule engine decides; the AI may only explain the engine's result, cite the rule ID, and code checks every rule ID and every number it quotes against the engine's own output.
8. **Evidence supports this split.** Intuit's tax engine calculates and the AI explains; a 2026 study found top AI models fail on "unless … except …" rules that a rule engine gets right, and changed behaviour silently under the same model name.
9. **The AI's own "I am 90% sure" is not trustworthy.** Studies show it is overconfident and barely better than chance at predicting its own errors. Google also stopped returning internal scores for Gemini 3 models. We use agreement between runs and our own checks instead.
10. **Realistic accuracy: about 80 to 95%, not 99%.** Gemini 3.5 Flash scored 79.8% on a 2026 business-document benchmark (87.9% on short documents); the best specialised system 95.6%. Handwriting is much worse. Only our own expert-graded test set gives a number we may quote.
11. **Passports' machine-readable lines can be checked by arithmetic** (check digits), so those fields need code, not AI judgement.
12. **Bottom line:** rules, numbers, dates, fees, points, checks and stored answers are exactly repeatable; AI reading, sorting and drafting are only measurably consistent, with a person approving; eligibility, rule choice and any final decision must never be AI.

---

## (b) Findings per topic

### 1. Can a hosted model call itself be made deterministic?

#### 1.1 What each provider promises (our routes first)

| Route | Temperature 0 / top-k 1 | Seed | Other | Label |
|---|---|---|---|---|
| **Gemini on Vertex AI** (our primary, [A §8.3]) | "A temperature of 0 means that the highest probability tokens are always selected"; responses are "mostly deterministic, but a small amount of variation is still possible". | "best effort to provide the same response"; "Deterministic output isn't guaranteed"; changing model or settings can change output even with the same seed. | **For Gemini 3.6 Flash and later, custom `temperature`, `topP` and `topK` "aren't supported" and "are ignored if set".** | [V] [1] |
| **Gemini 3 guidance** (applies to Gemini 3.5 Flash) | Google recommends keeping temperature at the default 1.0; setting it below 1.0 "may lead to unexpected behavior, looping, or degraded performance", especially in reasoning tasks. Page updated 16 Sep 2026. | n/a | Suggests thinking level LOW for lower latency. | [V] [2] |
| **Cohere** (back-up route) | Supported. | "best effort to sample tokens deterministically … determinism cannot be totally guaranteed". | | [V] [3] |
| **OpenAI** (context only; no Canada route, [A §8.1]) | Supported. | Seed plus a `system_fingerprint` (identifies the backend configuration); with all matching, outputs are "mostly identical"; the fingerprint changes when the provider updates its infrastructure, "a few times a year". Users report outputs still diverge after a few words. | Cookbook dated Nov 2023. | [V] [4]; [S] user reports [4] |
| **Self-hosted vLLM** (back-up route with open models) | Supported. | Seed supported. | **Batch invariance mode** (`VLLM_BATCH_INVARIANT=1`): output "deterministic and independent of the batch size or the order of requests". **Beta.** NVIDIA GPUs of compute capability 8.0 or higher (other doc versions say 9.0, that is H100/H200 class); validated models include DeepSeek V3/R1, Qwen3, Llama 3.1/3.2, GPT-OSS, Mistral-7B and others. **Cohere Command A+ is not on the validated list.** "May impact performance". | [V] [5] |
| **Self-hosted SGLang** | Supported. | Seed (default 42) keeps even non-zero temperature repeatable. | `--enable-deterministic-inference`, built on the Thinking Machines kernels; works with FlashInfer, FlashAttention 3 and Triton back ends. The team reports 34% overhead with CUDA graphs. | [V] [6]; [VC] overhead |

**Reading [I].** On the only model with a Canadian processing promise today (Gemini 3.5 Flash, [A §8.1]), we can set temperature 0, but Google's own guidance says not to, and the next model generation removes the setting. Even where it is honoured, Google promises only "mostly". **Exact repeatability of a fresh model call is not available on our primary route and should never be promised.**

#### 1.2 Why temperature 0 is still not deterministic

- **Thinking Machines Lab, "Defeating Nondeterminism in LLM Inference" (10 Sep 2025)** [7] [V]. The usual explanation ("parallel arithmetic on graphics chips adds numbers in a different order") is incomplete. The main cause is the lack of **batch invariance**: the calculation for one request changes with how many other requests share its batch, and that depends on server load. Experiment: 1,000 completions at temperature 0 of one prompt on Qwen3-235B-A22B gave **80 distinct completions**; the most common appeared 78 times; all agreed for the first 102 tokens (word pieces) and split at the 103rd. With batch-invariant kernels, **all 1,000 were identical**. Cost: 26 s normally, 55 s deterministic unoptimised (about 2.1×), 42 s with an improved kernel (about 1.6×).
- **Mixture-of-experts models** (the model routes each word to some of many sub-networks) were the test model above, and Cohere Command A+ is one too ([A §8.1]). Routing decisions can flip when tiny numerical differences occur, so small differences become different words [I, consistent with [7]].
- **Other research.** A Jan 2026 paper (code under a Microsoft repository) proposes enforcing determinism only for the requests that need it, using a fast path plus a verify-and-roll-back loop, to avoid paying the overhead on all traffic [8] [V abstract].
- **The model also changes under the same name.** A Jul 2026 study measured one frontier model's accuracy on a construction-insurance rule set rising from 96.6% to 100% between March and April 2026 under the same model alias, "with no version change", same prompt and harness [9] [V abstract]. Pinning a snapshot ([A §3.3]) is necessary but providers do not always expose one.

#### 1.3 Measured variance studies

| Study | What was measured | Result | Label |
|---|---|---|---|
| Non-determinism of "deterministic" LLM settings (arXiv 2408.04667, Aug 2024, revised Apr 2025; workshop paper 2025) [10] | 5 models configured to be deterministic, 8 tasks, 10 runs each, zero-shot and few-shot | Accuracy varied **up to 15%** between runs; gap between best and worst possible run **up to 70%**; "none of the LLMs consistently delivers repeatable accuracy across all tasks, much less identical output strings". Rankings between models could flip. | [S] (abstract via search) |
| Thinking Machines [7] | 1 prompt × 1,000 runs, temperature 0 | 80 unique outputs; 1 unique with batch-invariant kernels | [V] |
| ReasonBENCH (arXiv 2512.07795, Dec 2025) [11] | Repeated runs of reasoning models and strategies | "Vast majority" show high instability; methods with similar average accuracy had confidence ranges up to 4× wider | [S] |

**What this means for us [I].** A single test run of a skill proves little. The driving test ([A §5.3]) must run each case several times and report the spread, and any number we publish should be "x% over k runs", not one run.

#### 1.4 Even perfect model determinism would not be enough [I]

A deterministic model gives the same output only for byte-identical input. Our input to the model includes the OCR text (which changes if the OCR engine is updated or the scan is re-uploaded), the prompt, the Pack rules in the prompt, and the model version. Any change gives a different answer, and a deterministic wrong answer is still wrong. Determinism is about repeatability, not correctness.

---

### 2. Repeatability at the product level when the model is not deterministic

[A §1.3 item 5] already stores each AI answer so a crash recovery re-uses it. This section extends that into an **audit-grade replay rule**.

#### 2.1 The pattern [I, built on [A §1.2] durable-workflow replay and [A §3.3] bundle versioning]

1. **Fingerprint every AI step's full input**: hash of the source file bytes; OCR engine name and version and a hash of its text output; skill version (prompt, schema, validators); model, snapshot and region; parameter settings (temperature, thinking level); Pack rule set versions; few-shot example set version.
2. **Store the answer against that fingerprint** in the run record, in Canada ([A §4.5]).
3. **Replay, do not re-run, whenever the fingerprint matches**: re-opening the file, an auditor's review, a complaint, a regulator's question, re-generating a form from approved values. The stored answer is shown with the date it was produced and by which versions. This is exactly repeatable.
4. **Re-run only when something in the fingerprint changed**, or a person deliberately asks for a fresh read (for example a better scan). A re-run is a **new** run record; the old one is never overwritten. If the new answer differs from what the person approved earlier, the platform raises a "changed answer" item in Needs you instead of silently replacing it.
5. **Approved values are the record, not the AI answer.** Once a person verifies a value, downstream Doers (Filler, Signer, Biller) use the verified value ([A §2.3]); the AI answer is kept only as evidence of what was proposed.

#### 2.2 When re-running is right, and when replay is right [I]

| Situation | Replay or re-run | Why |
|---|---|---|
| Audit, complaint, regulator review, "what did the AI say then?" | **Replay** | The question is about the past; a new run would rewrite history. |
| Crash or retry mid-run | **Replay** if the step completed | [A §1.2] durable workflow pattern. |
| New skill version, new model, new Pack rule version | **Re-run in shadow** on past files for the driving test; never change live approved values | The point is to measure the new version against expert-verified values ([A §5.3]). |
| Better scan uploaded | **Re-run** (new fingerprint) | Different input. |
| Person doubts the answer | **Re-run once**, show both answers side by side | Disagreement between two runs is itself a useful warning (section 5). |

#### 2.3 What "same file, same answer" may honestly claim [I]

"For a given file and given versions, Expat Ready always shows the same stored AI proposal, and records which person approved what." It may **not** claim "the AI always produces the same answer"; that is false on every hosted model (section 1).

---

### 3. Raising accuracy and consistency

| Technique | What the evidence says | Cost and limits | Label |
|---|---|---|---|
| **Majority vote across k runs** (self-consistency) | Well established for reasoning and short answers [12]. For extraction, the evidence is thin: votes split when the same value is written differently ("2" vs "two", date formats), so values must be normalised by code before counting [12]. One 2026 workshop paper found voting **lowered** accuracy on hard questions for small models [12]. "Parallel thinking" (several short independent runs then a vote) beat one long thinking run by up to 20% on reasoning tasks [13]. | k runs cost k times the tokens for that step. On the Canada route a whole prepared file costs about USD 1.27 in model tokens ([A §6.3]); voting 3× on every call would make it about USD 3.81. Voting only on the few high-stakes fields costs a fraction of that [I arithmetic]. | [S] [12][13]; [I] cost |
| **Two different models agree** | Strongest form of independent check; judges favour their own model family ([A §2, §8.2]). | Needs the second Canadian route ([A §8.3 item 2]), which does not exist yet. | [I] |
| **Extract, then quote the source** | Anthropic advises extracting word-for-word quotes first for long documents and retracting any claim without a supporting quote [14]. A "quote-gating" pattern requires every value to carry a verbatim span that code checks exists in the document [15]. A library that does this (Instructor) tolerates up to 5 character errors by default, so it is fuzzy, not exact [15]. Models are still weak at pointing to the precise span [15]. ExtractBench (Aug 2026): general vision-language models and coding agents "return no grounding evidence by default" [16]. | One extra field per value; cheap. A code check catches invented quotes, not a real quote that does not support the value; a person still checks meaning. | [V] [14][16]; [S] [15] |
| **Constrained choices** | Pack enumerations (document types, relationship types, programme codes) passed as allowed values in the output schema; [A §1.2] notes enum case may still change, so the validator re-checks. | Removes a whole class of free-text errors. | [I], [A §1.2] |
| **Break rules into small yes/no checks** | Structured rule application (each legal test split into binary conditions) raised one model's accuracy on LegalBench from 76.4% to 87.3% (+11 points) [17]. | Supports "one small job per call". | [S] [17] |
| **Few-shot examples from the gold set** | Translating rules into logic plus retrieved worked examples "dramatically" improved tax reasoning (AAAI 2026) [18]. The variance study [10] found instability persisted in both zero-shot and few-shot. | Examples must be de-identified; client data never goes into another firm's prompt [I]. | [V] [18]; [S] [10] |
| **Reasoning ("thinking") settings** | More thinking widens the spread of answers [13]; reasoning setups are unstable across runs [11]. In the 2026 rule study, one frontier model matched a rule engine only **at low reasoning effort**; other configurations failed the same edge case [9]. Google suggests LOW thinking for latency [2]. | No study gives a general rule; the setting changes behaviour, so it must be pinned in the skill bundle and measured. | [S] [11][13]; [V] [2][9] |

**Reading [I].** For our step types: Reader and Sorter should use low thinking, constrained outputs, a source span per value, and a vote only on high-stakes fields; Writer outputs are judged by a person, so voting adds little; Checker should be a different model family when one exists.

---

### 4. Making the AI "always reflect our rules"

#### 4.1 Evidence for "the engine decides, the AI explains"

| Domain | What is published | Label |
|---|---|---|
| **Tax (Intuit TurboTax)** | Intuit Assist uses Claude via Amazon Bedrock to explain tax results, "underpinned by Intuit's proprietary tax engine", with "real-time accuracy checks" that are not described (AWS case study, 30 Jul 2024). An Intuit executive is quoted that tax calculations use deterministic systems; Intuit says the engine encodes more than 100,000 pages of tax material. | [V] case study wording [19]; [S] executive quote and page count [19] |
| **Tax (research)** | "Language Models and Logic Programs for Trustworthy Tax Reasoning" (AAAI 2026): the language model translates rules into a logic program and a solver computes; this "dramatically" improves performance and lowers cost. | [V] abstract [18] |
| **Insurance, legal eligibility** | "Confidently Wrong: Exception Chain Collapse in Frontier LLM Rule Evaluation" (25 Jul 2026): frontier models fail on nested rules ("A is required unless B, unless C"); 225 scenarios in four regulated areas; on 20 adversarial insurance scenarios the rule engine scored 20/20 and three of four frontier configurations failed the same case; on 949 held-out LegalBench cases the engine was significantly more accurate than all three frontier models, by up to 41 points. **The authors sell the engine**, so treat as a vendor study. | [V] abstract; [VC] by nature [9] |
| **Public benefits (rules as code)** | Georgetown Beeck Center (2025): language models can help turn policy into code across seven US states, but "still require external knowledge and human oversight" for complex logic. A 2025 thesis used formal checks to catch agency explanations that "appear reasonable" but break the statute. | [S] [20] |
| **Automated reasoning products** | AWS Automated Reasoning checks: "up to 99%" (vendor claim, repeated Feb 2026 when source-document references were added); no independent benchmark; not in a Canadian region ([A §1.2]). | [VC] [21] |

**Reading [I].** Every credible example keeps the computation in code and uses the model only to translate (rule text to code, document to fields) or to explain. Immigration rules have exactly the nested "unless" structure the 2026 study found models fail on (for example exemptions within exemptions in work-permit categories). This strongly supports AIW-D91: the Pack rules are the engine.

#### 4.2 The mechanics [I, built on [9][18][19] and [A §1.3, §4.3]]

1. **Rules never live in the model's memory.** The model's general knowledge of Canadian immigration law is not a permitted source. Every rule-dependent statement must cite a Pack rule ID; a statement with no rule ID fails validation.
2. **The engine computes; the AI never does.** Eligibility outcomes, points, fees, deadlines, document lists and form-field mappings come from the Pack engine and the Doers. The AI receives the engine's result as structured input.
3. **The AI may explain, and only what the engine produced.** The explanation schema has slots: outcome, rule IDs, the values used. Code checks: (a) every cited rule ID exists in the active Pack version; (b) every cited rule ID actually fired in the engine's trace for this file; (c) every number, date and outcome word in the text equals one of the engine's output values (string match after normalising); (d) no outcome word contradicts the engine (for example "eligible" when the engine said "not eligible"). Any failure is `rule_failed:<rule ID>` or a new code `explanation_mismatch` ([A §4.5] failure list).
4. **Rules are passed in, not remembered**: either as the cached prompt prefix ([A §6.4 item 3]) for reading tasks, or by the AI asking the engine through a fixed tool call for explanation tasks. The engine's answer is authoritative.
5. **Where the Pack has no rule, the AI says so.** "No rule covers this; a licensed person decides." It never fills the gap with its own view ([A §2.1] question 2).
6. **When rules change**, the Pack version changes, which changes the fingerprint (section 2), which forces a re-run in shadow for affected skills.

---

### 5. Confidence: what to trust

| Signal | Evidence | Usable on our route? | Label |
|---|---|---|---|
| **The model's stated confidence** ("I am 90% sure") | ICLR 2024 study of five models: verbalised confidence is **overconfident**, "potentially imitating human patterns"; failure prediction barely above chance (AUROC 0.522 to 0.605, where 0.5 is a coin toss); all methods "struggle" on professional-knowledge tasks [22]. ICLR 2025: human-feedback training pushes models towards overconfidence [23]. | Available, **not trustworthy**. | [V] [22]; [S] [23] |
| **Token log-probabilities** | Introduced on Vertex for Gemini 2.5 (Jul 2025). Forum reply of 5 Aug 2026: "logprobs are no longer returned for 3.X models" ("working as intended"). | **No** on Gemini 3.x; yes on self-hosted vLLM [I]. | [S] [24] |
| **Agreement across k runs** | The ICLR 2024 study lists "consistency among multiple responses" as a way to reduce overconfidence [22]. | Yes; costs k× for that step. | [V] [22] |
| **Our own validator results** | Check digit passes, quoted span found, Pack rule passes, cross-field match (passport visual zone vs machine-readable lines; same date across documents). | Yes; free; deterministic. | [I] |
| **OCR engine word confidence** | Google Document AI and Amazon Textract return a confidence per word or block (from their docs; not re-read today). | Yes. | [I] |

#### 5.1 Setting per-field thresholds from measured data [I]

1. In shadow ([A §5.3 item 4]), record for each field: the signals (runs agreeing, span found, validators passed, OCR confidence band) and whether the AI value matched the value the person finally verified.
2. Group fields into buckets by signal combination (for example "3 of 3 agree + span found + all validators pass"). Measure each bucket's observed error rate.
3. Set the threshold per field type so that the "green" bucket's error rate is at or below the floor agreed with the immigration specialist (AIW-D83). Everything else is amber (person checks the field) or red (person enters it).
4. **Sample sizes matter.** If a bucket shows zero errors in n cases, the honest 95% upper bound on its error rate is about 3/n (the "rule of three"). To claim "at most 1% wrong" with 95% confidence needs about **300 error-free cases** in that bucket; "at most 0.5%" needs about 600. Small firms' shadow periods may not reach this; pool across firms for de-identified statistics, but set the light per firm ([A §4.5 item 3]).
5. **Show colours with reasons, not percentages.** "Amber: two reads disagreed on the date of birth" is useful; "87% confident" invites false trust.
6. Recalibrate whenever the fingerprint inputs change (new skill, model or Pack version).

---

### 6. Realistic accuracy figures for document extraction

| Benchmark | Date | What | Result | Label |
|---|---|---|---|---|
| **ExtractBench** (run by LlamaIndex, which sells an extraction product) [16] | 11 Aug 2026 | 370 business documents, 4,869 pages, 67 document types, 14 systems, value F1 (a combined score of values found and values correct), deterministic scoring | Best: 95.6% (the vendor's own agentic system). General vision-language models 47.9 to 87.3%. **Gemini 3.5 Flash 79.8% overall; 87.9% on documents of 10 pages or fewer; 69.8% on 11 to 50 pages.** Long-document models keep high precision but under 35% recall over 50 pages (they return correct values but miss many). No run-to-run consistency reported. | [V] page; [VC] by nature |
| **IDP Leaderboard v1.5** (run by Nanonets, a competitor) [25] | 2026 | 16 datasets, about 9,229 documents, 6 tasks | Key-information extraction around 80 to 91 for Gemini 3 Flash depending on snapshot; **handwriting OCR capped at about 75.5% across every model tested**; sparse tables under 55% for most. | [VC]; [S] for the cap |
| **Passport machine-readable zone** (MRZ, the two lines of `<<<` text) | 2026 | ICAO Doc 9303 check digits: weights 7-3-1, sum modulo 10, per field plus a composite digit [26] | A vendor whitepaper reports document number, birth date and expiry date all passing their check digits on 95.5% of 266 passports [26]. A misread can still pass a check digit by chance, so a pass is strong evidence, not proof [26]. | [VC] number; [S] method |

**Reading [I].**
- **Passport MRZ**: use a dedicated MRZ parser and the check digits (code), then compare with the visual zone the AI reads. Disagreement goes to a person. AI is not needed to decide MRZ values.
- **Typed letters and forms**: expect roughly 80 to 90% field accuracy before checks on our Canada model, higher on short clean documents, lower on long ones. Not 99%.
- **Handwriting, phone photos, poor scans**: expect much lower; these should default to amber or red.
- **Language-test results, police certificates, bank letters**: no benchmark found. Only our own expert-graded test set gives a number.
- **No published benchmark covers immigration documents.** Vendor benchmarks are not our accuracy and must never be quoted as such.

---

### 7. What best-in-class regulated products publish to earn trust

| Source | What is published | Lesson for us | Label |
|---|---|---|---|
| **EU AI Act, Articles 15(3) and 13(3)(b)(ii)** | High-risk systems must declare "levels of accuracy and the relevant accuracy metrics" in the instructions for use, plus circumstances that may affect accuracy and, where appropriate, performance on specific groups. No numeric threshold set. Not binding on Expat Ready in Canada [I]. | A ready template for an honest accuracy statement. | [S] (law text via reproduction site; check the Official Journal) [27] |
| **Vals Legal AI Report** (Feb 2025) | Independent study of four legal AI tools on seven tasks against a lawyer baseline. Example: Harvey 94.8% on document Q&A; CoCounsel 77.2% on summarisation; lawyers beat all tools on redlining (79.7%). Vendors could withdraw from tasks before publication, and an AI model graded answers against predefined elements. | Independent, task-level numbers with a human baseline earn trust; opt-outs and AI grading weaken it. | [S] [28] |
| **Harvey BigLaw Bench** (Aug 2024) | Own benchmark built from lawyers' real tasks, rubric per task, penalties for hallucinations, a separate "source reliability" score. | Score the evidence (sources) separately from the answer. | [VC] [29] |
| **Intuit** | "Real-time accuracy checks", not described publicly [19]. | Common vendor practice is to assert, not publish. A published method is a differentiator. | [V] |

---

## (c) Recommendations for Expat Ready

Each is marked **NEW** or **EXTENDS [A §n]**. All are proposals for the Lead; none is a decision until the founder ratifies.

| # | Recommendation (plain English) | Tag |
|---|---|---|
| R1 | **Never promise "deterministic AI".** Promise "deterministic platform, measured AI": rules and stored answers are exact; AI proposals are measured and approved by a person. Use this wording in the Handbook's "why this AI is different" section (AIW-D91). | NEW |
| R2 | **Fingerprint and replay every AI step** (section 2.1): file hash, OCR version and text hash, skill version, model snapshot and region, settings, Pack rule versions, example-set version. Replay on any match; re-run only on change or a person's request, as a new record; never overwrite; raise "changed answer" in Needs you if it differs from what was approved. | EXTENDS [A §1.3 item 5, §4.5 item 1] |
| R3 | **Model settings per skill, pinned and measured, not assumed**: on Gemini 3.5 Flash, test temperature 1.0 (Google's advice) against a lower value on the skill's test set and pick by measured accuracy and pass^k; thinking level LOW for Reader and Sorter unless the test set says otherwise. Record the settings in the skill bundle. Plan for the next Gemini model ignoring these settings altogether. | EXTENDS [A §3.4 item 3] |
| R4 | **If the back-up self-hosted route is built, run it in deterministic mode** (vLLM batch invariance or SGLang deterministic inference) and choose a model on the validated list; budget 1.3 to 2× GPU time. This gives exact repeatability for fresh calls on that route only, and is a selling point for audits. Command A+ would need its own validation. | EXTENDS [A §8.3 item 2] |
| R5 | **Every extracted value carries its source**: document, page and the exact words. Code checks the words exist in the OCR text after normalising spaces and quote marks; exact match only, no silent repair; a failed check is amber. "Not found" stays distinct from "not verified". | EXTENDS [A §4.3 item 2] |
| R6 | **Vote only where it pays**: for a short list of high-stakes fields per skill (for example identity numbers, dates of birth, expiry dates, names), run the Reader 3 times, normalise, and require agreement; disagreement is amber. Measure in shadow whether voting actually reduces errors per field before keeping it (one study found it can hurt). | NEW |
| R7 | **Engine decides, AI explains, code checks the explanation** (section 4.2): rule IDs must exist and must have fired; every number, date and outcome word must equal the engine's output; new failure code `explanation_mismatch`. No rule, no AI statement. | EXTENDS [A §2.3 item 3, §4.5 item 2] |
| R8 | **Small, constrained calls**: one document and one job per call; allowed values from the Pack as enumerations; split rule-like checks into yes/no conditions the engine combines. | EXTENDS [A §1.3 item 2] |
| R9 | **Confidence = our signals, not the model's words**: agreement across runs, span found, validators, check digits, OCR confidence. Ignore model-stated confidence; do not depend on log-probabilities on Gemini 3.x. Thresholds per field type from shadow data using section 5.1, with the rule-of-three sample sizes. | NEW |
| R10 | **Passport machine-readable lines by code**: MRZ parser plus check digits, compared with the AI's reading of the visual zone. | NEW |
| R11 | **Driving test reports spread, not one run**: each test case run k times (k = 5 suggested); report field accuracy, correct "not found" rate, pass^k, and per-bucket error rates. Re-run the frozen slice weekly to catch silent provider drift under the same model name (section 1.2). | EXTENDS [A §5.3 items 2 and 6] |
| R12 | **Publish an "AI accuracy sheet" per skill version**, modelled on EU AI Act Article 13/15 content: test set size and make-up, who graded it, accuracy per field type, not-found accuracy, consistency over k runs, model and date, conditions that lower accuracy (handwriting, phone photos, long files), and what the skill must never be used for. Firms see it on the AI team page (AIW-D85). Counsel reads it before release. | NEW |
| R13 | **Gold-set examples are de-identified and versioned**; never put one firm's client data in another firm's prompt. | NEW |

### Bottom line, brutally honest

| Can be made **exactly repeatable** | Can only be made **measurably consistent** | Must **never be AI** |
|---|---|---|
| Every Pack rule result, eligibility outcome, points, fees, deadlines, document lists, form mappings, permissions, workflow order (the Conductor, Doers and Packs). | Reading values from documents (Reader). | Deciding eligibility, points, fees, deadlines or which rule applies. |
| Check-digit and format checks; validator results. | Sorting and classifying documents (Sorter). | Verifying a value (a person does; FD-16, AIW-D13). |
| The stored AI proposal for a given file and versions (replay), and the audit trail of who approved what. | Drafting letters and explanations (Writer). | Filing, signing, sending, moving money ([A §2.3 item 2]). |
| A fresh AI call **only** on a self-hosted model in deterministic mode, and only for byte-identical input. | The AI Checker's second view. | Using the model's own memory of immigration law as a source. |
| | The explanation text (its *facts* are code-checked against the engine; its *wording* varies). | Using the model's stated confidence to skip human review. |

**What we can honestly say to a firm [I]:** "The rules give the same answer every time. The AI reads and drafts; every value shows where it came from; our checks catch most errors; you approve everything; and we publish how accurate and how consistent each skill measured on expert-graded files." **What we cannot say:** "The AI is deterministic", "the AI is 99% accurate" (until our own test set shows it), or "the AI follows the rules" without the code check of R7.

---

## (d) What not to do

1. **Do not market "deterministic AI".** It is untrue on every hosted model, including ours [1][3][7].
2. **Do not set temperature 0 on Gemini 3 and assume the job is done.** Google warns it can cause looping and worse results [2], and newer Gemini models ignore it [1].
3. **Do not rely on the seed.** Every provider calls it "best effort" [1][3][4].
4. **Do not re-run old files and overwrite answers when a version changes.** Replay for audit; re-run as a new record in shadow (section 2).
5. **Do not show or use the model's own confidence numbers** [22][23].
6. **Do not let the AI state any number, date, fee, point score or outcome that the engine did not produce**, even in a friendly explanation (section 4.2).
7. **Do not vote k times on everything.** It multiplies cost and can lower accuracy; measure per field first [12].
8. **Do not quote vendor benchmarks as our accuracy.** ExtractBench and the IDP leaderboard are run by vendors and are not immigration documents [16][25].
9. **Do not accept fuzzy-matched quotes silently** as proof of where a value came from [15].
10. **Do not treat a check-digit pass as proof**; it is strong evidence that still needs the visual-zone comparison [26].
11. **Do not claim a per-field threshold is safe from a small sample**; use the rule of three (section 5.1).
12. **Do not assume a model name means fixed behaviour**; providers change behaviour under the same alias [9].

---

## (e) Sources

All accessed 12 Oct 2026. [A] = `ai-architecture-deterministic-2026-10.md` (11 Oct 2026), cited by section.

1. Google Cloud, Vertex AI, "Content generation parameters" (temperature, top-k, top-p, seed; Gemini 3.6 Flash and later ignore sampling parameters). https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/content-generation-parameters
2. Google Cloud, Vertex AI, "Gemini 3 prompting guide" (temperature 1.0; thinking level; updated 16 Sep 2026; Spanish edition read). https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/gemini-3-prompting-guide?hl=es
3. Cohere, Chat API reference (`seed`). https://docs.cohere.com/reference/chat
4. OpenAI Cookbook, "How to make your completions outputs reproducible with the new seed parameter", Nov 2023. https://developers.openai.com/cookbook/examples/reproducible_outputs_with_the_seed_parameter ; user reports https://community.openai.com/t/seed-param-and-reproducible-output-do-not-work/487245
5. vLLM documentation, "Batch invariance" (latest and stable editions). https://docs.vllm.ai/en/latest/features/batch_invariance/ ; https://docs.vllm.ai/en/stable/features/batch_invariance/
6. SGLang documentation, "Deterministic inference". https://docs.sglang.io/advanced_features/deterministic_inference.html ; LMSYS blog, 22 Sep 2025 https://lmsys.org/blog/2025-09-22-sglang-deterministic/
7. Thinking Machines Lab, "Defeating Nondeterminism in LLM Inference", 10 Sep 2025. https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/
8. "LLM-42: Enabling Determinism in LLM Inference with Verified Speculation", arXiv 2601.17768, Jan 2026. https://arxiv.org/abs/2601.17768
9. "Confidently Wrong: Exception Chain Collapse in Frontier LLM Rule Evaluation", arXiv 2607.23386, 25 Jul 2026 (authors linked to the engine's vendor). https://arxiv.org/abs/2607.23386
10. "Non-Determinism of 'Deterministic' LLM Settings", arXiv 2408.04667 (v5). https://arxiv.org/abs/2408.04667
11. "ReasonBENCH: Benchmarking the (In)Stability of LLM Reasoning", arXiv 2512.07795, Dec 2025. https://arxiv.org/abs/2512.07795v1
12. Self-consistency evidence: "Confidence Improves Self-Consistency in LLMs" (Findings of ACL 2025) https://arxiv.org/pdf/2502.06233 ; "Certified Self-Consistency" https://arxiv.org/html/2510.17472v1 ; COLM 2026 workshop paper on voting harming hard questions https://www.alphaxiv.org/abs/2608.11403.md
13. "Does Thinking More Always Help?", arXiv 2506.04210. https://arxiv.org/html/2506.04210v2
14. Anthropic, "Reduce hallucinations" (extract quotes first; retract unsupported claims). https://platform.claude.com/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
15. Quote-gating and span checks: Instructor CitationMixin https://python.useinstructor.com/concepts/citation/index.md ; "Explicit Evidence Grounding via Structured Inline Citation Generation", arXiv 2606.07130 https://arxiv.org/pdf/2606.07130 ; practitioner write-up https://alpeshnakrani.com/books/hallucination-mechanically/a-citation-is-not-proof/
16. LlamaIndex, "Introducing ExtractBench", 11 Aug 2026. https://llamaindex.ai/blog/introducing-extractbench
17. "When Condition Trees Help LLMs Apply Legal Rules: Three-Model Evidence from LegalBench", ICML 2026 listing. https://icml.cc/virtual/2026/80604
18. "Language Models and Logic Programs for Trustworthy Tax Reasoning", arXiv 2508.21051, AAAI 2026. https://arxiv.org/abs/2508.21051
19. AWS Machine Learning Blog, "Intuit uses Amazon Bedrock and Anthropic's Claude to explain taxes in TurboTax", 30 Jul 2024. https://aws.amazon.com/blogs/machine-learning/intuit-uses-amazon-bedrock-and-anthropic-claude-to-explain-taxes-in-turbotax-to-millions-of-consumer-tax-filers ; Intuit tax knowledge engine https://www.intuit.com/blog/powering-prosperity/tech-talk-intuits-ai-powered-tax-knowledge-engine-boosts-filers-confidence/ ; VentureBeat https://venturebeat.com/ai/top-ten-ways-intuit-is-revolutionizing-personalization-with-generative-ai
20. Georgetown Beeck Center, "AI-Powered Rules as Code: Experiments with Public Benefits Policy" (summary). https://digitalgovernmenthub.org/library/ai-powered-rules-as-code-experiments-with-public-benefits-policy-summary-key-takeaways/ ; University of Maryland thesis, arXiv 2512.12109 https://arxiv.org/abs/2512.12109v2
21. AWS, Automated Reasoning checks GA (Aug 2025) and source references (Feb 2026), French editions. https://aws.amazon.com/fr/about-aws/whats-new/2025/08/automated-reasoning-checks-amazon-bedrock-guardrails/ ; https://aws.amazon.com/fr/about-aws/whats-new/2026/02/automated-reasoning-policies-include-references/
22. "Can LLMs Express Their Uncertainty? An Empirical Evaluation of Confidence Elicitation in LLMs", ICLR 2024, arXiv 2306.13063. https://arxiv.org/abs/2306.13063
23. "Taming Overconfidence in LLMs: Reward Calibration in RLHF", ICLR 2025, arXiv 2410.09724. https://arxiv.org/pdf/2410.09724
24. Google developer forum, "Missing logprobs support in the newest Gemini models (3.1 Pro, 3.6 Flash)", 29 Jul to 5 Aug 2026. https://discuss.ai.google.dev/t/missing-logprobs-support-in-the-newest-gemini-models-3-1-pro-3-6-flash-on-vertex-ai-and-ai-studio/176557 ; Google Developers Blog, logprobs on Vertex AI, Jul 2025 https://developers.googleblog.com/en/unlock-gemini-reasoning-with-logprobs-on-vertex-ai/
25. Nanonets, IDP Leaderboard v1.5. https://benchmarking.nanonets.com/ ; summary https://nanonets.com/blog/idp-leaderboard-1-5/ ; aggregator https://benchmarklist.com/benchmarks/idp_leaderboard/
26. iApp, "Passport OCR benchmark 2026" (vendor whitepaper). https://iapp.co.th/whitepapers/passport-ocr-benchmark-2026.pdf ; ID Analyzer, how to read a passport MRZ https://idanalyzer.com/ja/blog/how-to-read-a-passport-mrz
27. EU AI Act, Article 15 and Article 13 (reproduction of OJ L 2024/1689). https://artificialintelligenceact.eu/article/15/ ; https://artificialintelligenceact.eu/article/13/
28. Vals AI, Legal AI Report, 27 Feb 2025. https://www.vals.ai/industry-reports/vlair-2-27-25 ; coverage https://www.lawnext.com/2025/02/legal-ai-tools-show-promise-in-first-of-its-kind-benchmark-study-with-harvey-and-cocounsel-leading-the-pack.html
29. Harvey, "Introducing BigLaw Bench", Aug 2024. https://www.harvey.ai/blog/introducing-biglaw-bench ; coverage https://legaltechnology.com/the-gen-ai-llm-benchmarking-war-starts-here-harvey-releases-new-evaluation-framework/

**Internal files referred to (not restated):** `ai-architecture-deterministic-2026-10.md` (§1.2, §1.3, §2.1, §2.3, §3.3, §3.4, §4.3, §4.5, §5.3, §6.3, §6.4, §8.1 to §8.3); `../decisions.md` (AIW-D13, D35, D83, D84, D85, D91; FD-16).

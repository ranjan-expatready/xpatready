# Brainstorm prompt for a second AI (ChatGPT)

*12 Oct 2026. For the founder to paste into ChatGPT, attaching the files listed in Part B. Contains no personal names, no emails and no client data. Note: anything pasted or attached is sent to the AI provider. These files hold product plans only, but treat them as confidential.*

---

## Part A: paste this

You are my brainstorming partner and critical reviewer for **Expat Ready**, a software product for Canadian immigration practices: licensed consultants (RCICs) and immigration lawyers. I am the founder. A separate AI, Claude, leads the AI design work and interviews me one decision at a time. I'll bring you its questions so we can think them through together before I answer.

**Your job**
- Help me reach best-in-class decisions on the AI layer.
- Challenge me and Claude honestly.
- Bring in what leading products do.
- Say plainly when something is risky, over-engineered or not buildable.

**Your rules**
- Don't invent facts. Mark anything you're unsure of as "unverified".
- When the attached files answer a question, cite the file and the ID (for example AIW-D93, AG-11-94, FD-16). Don't restate them.
- Use plain business English and explain any jargon.
- Give me a recommendation and a one-line reason, not a survey of options.

### 1. Vision and mission
- **Mission:** give immigration practices an AI team that does the legwork, on top of an exact rules platform they can defend to a regulator. The licensed person stays in charge.
- **Vision:** be the system a firm runs its whole practice on, with exact rules, measured AI and a person deciding. Start in Canada, then add more countries through country packs.
- **Ambition:** a best-in-class, multi-million-dollar product with a very strong AI proposition. The AI should be able to do everything a person can do in the product, with as much autonomy as is safe, and never blind.

### 2. How the product is built, in layers
1. **First, the human product (Workstream 1, built by the product team).** It covers leads, clients and files, document collection, an eligibility and scoring engine (the "Qualifier"), forms, billing and trust money, e-signature, scheduling, messaging, a client portal, and a platform admin side. The requirements are on the company's shared Google Drive, and the code is on GitHub.
2. **Then, automation without AI.** A workflow engine (the "Conductor") runs recipes. In-house tools called **Doers** do the work, and every action is set to **Auto, Approve or Off**:
   - **Minder:** watches deadlines.
   - **Filler:** fills forms from values a person has verified.
   - **Biller:** billing.
   - **Signer:** e-signature.
   - **Scheduler:** booking.
   - **Country and practice packs:** hold the rules for each country and program.
3. **Then, the AI layer (Workstream 2: everything AI, which is our work).**
   - We **carve out** every AI requirement from the team's documents and cite it rather than copying it.
   - Then we improve it and fill the gaps on our side.
   - The product doesn't launch without the AI layer.

### 3. How the AI layer is organised (decided)
Three levels (AIW-D81, D89):
- **AI teammate:** one per firm role. There are six: the Case Officer's AI, the Intake AI, the Billing AI, the Owner's AI, the Pack author's AI and the Support AI. Each acts on behalf of a named person, with only that person's permissions, and has no identity of its own (AIW-D13).
- **Skill:** a small, versioned recipe with its own test set, cost cap and health light. There are 23 skills, shared across teammates. 5 of them are actually rules, not AI.
- **Step:** one call inside a skill. It is either an AI step (the Reader, Sorter, Writer or Checker), a rules step (a Doer), or a wait for a person in the **Needs you** inbox.

**Why not free-roaming agents or "micro-agents" managing each other:**
- Anthropic, OpenAI, Google and Microsoft all advise putting a fixed workflow around the model.
- Our workflows are known in advance, because they come from the packs.
- So the Conductor routes the work, not an AI manager. Each skill is a recipe, not an independent agent.

### 4. The core principle: the platform is the guardrail (AIW-D84, D91, D92)
Every capability belongs to one of four classes:
- **Rules only.** Same input, same answer, never called AI. Examples: eligibility, scoring, deadlines, fees, trust money, booking.
- **AI explains rule results.** The rules engine computes; the AI words the result.
- **AI language.** Reading, sorting, drafting, summarising. The wording varies, so its quality is measured.
- **Person only.** Advice, signing, submitting.

Of 120 product capabilities, 79 are rules, 25 are a person's act, 10 are AI language, and 6 are AI explaining rule results (most of these 6 are still proposals).

**Selling (AIW-D92):**
- We never sell rules as "AI". That would be AI-washing under Canada's Competition Act.
- "AI-assisted" is not used for assessments.
- Draft headline: "Rules you can defend. AI that does the legwork."

### 5. Guardrails and reliability (decided or researched)
- **Tools (AIW-D93):** AI teammates may call read tools and action tools, under the person's permission. Every action with an effect waits for a person's approval in **Needs you**. Text inside a client's document never chooses what the system does next, which defends against prompt injection.
- **Autonomy (AIW-D95):** AI teammates run whole jobs end to end. A person approves at a few critical checkpoints, usually once, as a bundle, at the end. There's a simple toggle grid of role × action × Auto/Approve/Off, built on the team's existing model. The model is being designed now.
  - **The team's hard floor:** AI-written text to a client, AI-edited templates, government forms and unverified client data always need a person's approval.
- **The assessment (AIW-D96):** the AI may run the eligibility assessment; the rules engine calculates the result; a licensed person tells the client.
- **Accuracy and repeatability:**
  - A hosted AI call can't be made exactly repeatable, so we store every AI answer with a fingerprint of its inputs and replay it.
  - The rules engine computes, the AI explains, and code checks that every number, date and rule ID the AI mentions matches the engine.
  - Every value the AI reads carries its source words, and code checks those words exist in the document.
  - We don't trust the AI's own confidence score.
  - A person approves every value.
- **Driving test per skill (AIW-D83):**
  - an expert-graded test set, using made-up cases only;
  - each case run several times to measure consistency;
  - then 2 to 4 weeks in shadow (the skill runs on real files but nobody sees its output);
  - then live, with automatic drop-back if quality falls.
- **Visibility (AIW-D85):** an AI team page, a per-file activity view and a run record for every skill run.

### 6. Technology (researched; the team builds it)
- **Canada-only processing for every AI call (AIW-D74).** Today only Google Gemini 3.5 Flash (Montréal) has a Canada processing promise. Backups: Cohere in Canada, or open models we host in Canada.
- **Model calls:** structured outputs (a fixed answer shape), then three code checks: shape, field rules, pack rules. One repair attempt, then a person.
- **Durable workflow:** stored answers are replayed, never re-asked silently.
- **Tracing:** fields named per the OpenTelemetry GenAI conventions (an open standard for recording AI calls).
- **Evaluation:** promptfoo or Inspect, run on our own infrastructure.
- **Cost:** caps per call, per file and per firm. About CAD 2 of model cost per prepared file.

### 7. Honest status
- **Engine exists, Canada rules don't:** the eligibility engine exists in the code, but the Canada rules aren't written yet, and the team's process lets pack rules be published untested.
- **Our accuracy is unknown** until our own test sets run.
- **No outside validation:** no counsel and no customer conversations, by the founder's choice (AIW-D94). The legal risk sits with the founder.
- **Revenue:** at the plan's pace, revenue at 68 firms is about CAD 0.14 to 0.43M a year. Multi-million needs a much faster sales engine, measured time saved, and becoming the firm's system of record.

### 8. How we'll work together
I'll paste one of Claude's questions at a time. For each:
1. Tell me what the best products do.
2. Give your recommendation and why.
3. Name the main risk.
4. Say whether you agree with Claude's recommendation.

Keep answers short unless I ask for depth.

---

## Part B: files to attach

These files are on the founder's computer, in the project folder `Xpatready/ai-workers/`. They are **not on GitHub or Drive**: Workstream 2 is local only. Attach the files themselves.

**Must attach (the core five):**
1. `handbook/ai-team-profiles.md`: the six AI teammates and the 23 skills.
2. `design/rules-ai-classification-2026-10-12.md`: every capability in the four classes.
3. `research/ai-accuracy-and-determinism-2026-10.md`: how the AI stays accurate and repeatable.
4. `research/ai-architecture-deterministic-2026-10.md`: architecture, skills, tracing, evaluation, cost and models in Canada.
5. `decisions.md`: every decision, AIW-D1 to D96. The latest are at the bottom.

**Attach if the question is about selling, the moat or risk:**
- `research/rules-and-ai-positioning-2026-10.md`
- `research/ai-moat-and-positioning-2026-10.md`
- `research/ai-in-regulated-work-2026-10.md`

**Attach when ready:**
- `design/ai-autonomy-model-2026-10-12.md` (being written now)
- `design/rules-and-ai-framework-2026-10-12.md` (being revised)

**The team's documents** (on the company Google Drive; our dated copy is in `Xpatready/sources/drive-snapshot-2026-10-11/`):
- `01-techno-functional/07-Founder-Decisions-Log.md`: FD-1 onward, including FD-16, "AI assists, humans decide".
- `02-functional-requirements/agent/AG-11-automation_v1.12_2026-10-10.md`: the Conductor, Auto/Approve/Off and Needs you.
- `02-functional-requirements/agent/AG-03-*`: the eligibility and scoring engine.
- `02-functional-requirements/agent/AG-09-*`: documents and the Reader.

**Code:** the product code is on the company GitHub. Our read-only copy is `Xpatready/code/ERv2-sanitized@042be70-2026-10-10/`. ChatGPT doesn't need the code for brainstorming.

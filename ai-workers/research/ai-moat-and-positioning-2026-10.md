# The moat and the selling story for Expat Ready's AI layer (Step R, AIW-D91)

**Date:** 11 Oct 2026. **Author:** research subagent for the Lead (maker). **Status:** research input for Step R; not yet through the adversarial checker; nothing here is a decision. **Asked by:** the Lead, on the founder's direction AIW-D91 (`../decisions.md`).

**What this is.** An honest test of the founder's thesis that "the moat is the deterministic platform under the AI" (AIW-D91): what investors and operators say makes vertical AI defensible, how rule-grounded AI is sold in legal, tax and health, where the thesis is weak, and how to sell it without overpromising. It builds on, and does not repeat:
- `ai-architecture-deterministic-2026-10.md` (how the platform acts as the guardrail; skills, run records, driving test, Canada models);
- `ai-in-regulated-work-2026-10.md` (failures, regulators, review quality, the "how not to overpromise" table in §7);
- `ai-coverage-vs-competitors-2026-10.md` (what VisaFlo, Navisa, Migrawise, Visto, CaseEasy and Immicase offer);
- `visaflo.md` §16; `../commercial/price-card.md`; `../../commercial/plan.md` v1.1.

**Evidence labels.**
- **[V]** Verified: primary text read (regulator, government page, statute, research paper) or an independent benchmark.
- **[VC]** Vendor claim: the company says it about itself.
- **[O]** Opinion: an investor's or practitioner's argument, read in their own words. It is a view, not a measured fact.
- **[S]** Secondary: press or a third-party summary; treat as indicative.
- **[Survey]** Self-reported answers; often run by a vendor.
- **[I]** Inferred: our own reasoning from the sources.
- **Proposal / Assumption / Unknown** as in README §5.

Every web source was accessed on **11 Oct 2026**; numbers in square brackets point to the source list at the end. No personal names are used (README rule 10): people are described by role and organisation. Product facts cite the newest snapshot, `sources/drive-snapshot-2026-10-11/`.

**Plain-English glossary**
- **Moat:** whatever stops a competitor from copying you and taking your customers.
- **Wrapper:** a product that is mostly a screen and some instructions on top of someone else's AI model.
- **System of record:** the software where a business keeps its official records and does its daily work (for a firm: clients, cases, documents, approvals, invoices).
- **Rule-grounded (sometimes called "neuro-symbolic") AI:** AI that works inside fixed rules written by people; the rules decide, the AI reads and writes.
- **Pack:** Expat Ready's maintained content. A *Country Pack* holds a destination's programs, scoring, forms and checklists; a *Practice Pack* holds the firm regulator's rules (FD-22).
- **Test set (eval):** a fixed set of real examples with known right answers, used to measure an AI skill every time it changes.

---

## Summary (8 lines)

1. Investors and operators agree: a thin layer on someone else's model is not a moat; what lasts is owning the system where the work and records live, maintained domain content, proof of quality, and trust in regulated work.
2. These arguments have failed before: wrappers collapsed when model makers shipped the same feature, "data moats" proved shallow, and in Feb 2026 a model maker's legal plugin knocked 13 to 18% off the big legal-content firms in one day.
3. In legal, tax and health, the leaders sell AI "grounded in our maintained content", with sources and a human checkpoint, inside a system the buyer already uses; buyers name accuracy as their top worry and most now prefer AI grounded in trusted sources.
4. Honest limit: IRCC rules are public and rivals already encode them (rule-based form filling, IRCC-trained assistants, CRS tools). The rules themselves are not our moat, and our Canada pack content is not yet written.
5. Rules change often (about 127 IRCC program-delivery updates in 2026 to 8 Oct). Keeping packs current is a real fixed cost, which rewards whoever spreads it across the most firms.
6. Better models will erode "knows immigration" and "drafts well". They will not supply the rules in force on a given date, the firm's own records, a named approver or Canada-only processing.
7. The defensible core is the combination: dated, two-person-reviewed packs; accuracy measured per skill; a per-file record of what the AI did and who approved it; and becoming the firm's system of record. None of it is built yet, and pack rules are not tested today (SA1B-D18).
8. Sell "it prepares the file inside your own system, on rules we keep current, and you approve". Price the approved prepared file (AIW-D60) and keep the platform AIs unpriced (AIW-D61). The strongest objection: "the software that already holds my records can add AI too."

---

## 1. What makes vertical AI defensible

### 1.1 What investors and operators argue (2025 to 2026)

| Source | The argument, in plain words | Label |
|---|---|---|
| A partner at Matrix (VC), "Vertical AI: beware what you wrap", 26 Mar 2025 [1] | The danger is not being a "ChatGPT wrapper" but being "a wrapper around a system of record". As intelligence gets cheaper, the industry's data model, the business's own data and its workflows become worth more. Software firms that already hold the system of record gain from AI; AI start-ups in markets with no modern incumbent can start with an AI wedge and build the system of record themselves. | [O] |
| Insight Partners, "Building a moat in the age of AI", 19 Nov 2025 [2] | Two real moats: **workflow depth** (becoming the system of record or engagement, embedding AI in core systems, integrations) and **proprietary data** (hard-to-get data, feedback loops). "The companies that will endure are the ones that build systems of record and engagement." Caveats in the same piece: model makers are moving into applications; feedback-loop moats are "still early to know"; first-mover advantage alone is no longer enough; examples come from its own portfolio. | [O] |
| NFX, "The AI Wrapper is Dead", Jul 2026 [3] | The "wrapper generation" (thin interfaces, one task, no data, workflow or distribution) collapsed once model makers productised their own models; what holds is owning the full workflow, the domain knowledge and the data that builds up with each case. "The factory is the product." | [O] |
| Sequoia Capital, "Services: The New Software", 5 Mar 2026 [4] | "A copilot sells the tool. An autopilot sells the work." The work budget in a profession dwarfs the tool budget. Professional licensing is named as a regulatory moat (the CPA example), and each new jurisdiction a tax product covers "deepens its data moat". | [O] |
| Andreessen Horowitz (a16z), "The Empty Promise of Data Moats", 2019 [5] | Data is not a moat by default: the advantage "tends to slow down, not speed up, with data scale". More defensible: scarce data access, **security and trust** with sensitive data, hard data-cleaning work, and **domain expertise in the long tail of edge cases**. Older than 2025; kept because it is still the standard reference for why data-moat claims fail. | [O] |
| a16z podcast page, 3 Dec 2025 [6] | Most AI start-ups building the same product will die; momentum is not a moat. Only a summary was readable. | [S] |
| Bessemer Venture Partners, vertical AI playbook, Jan 2026 [7] | Enter through a narrow workflow and expand to the core; "progressive delegation", keeping people in the loop until reliability is proven. Our reader could not open the PDF (HTTP 404); known from search summaries only. | [S] |
| Battery Ventures, via the *Boston Globe*, Feb 2026 [8] | Will back software firms with sector credibility and "fundamentally important business records", because customer trust is hard for quickly built AI apps to copy. | [S] |
| IDC, 23 Sep 2026 [9] | "AI is augmenting the system of record, not circumventing it." In IDC's 2026 studies, 32.8% of companies say they would pay at least 10% more for AI agents built into the applications they use (sample not stated). | [O]; [Survey] |
| SiliconANGLE, 10 Feb 2026 [10] | If "the model creator can cut you out with a plugin", the moat "was always temporary". Customers can "retune prompts in weeks" but cannot rebuild years of records quickly. | [S] |

### 1.2 Where these arguments failed

| Case | What happened | Lesson | Label |
|---|---|---|---|
| **AI writing wrappers (Jasper, 2023)** | After ChatGPT launched, the company cut its 2023 revenue forecast by at least 30%, laid off staff and cut its internal valuation by about 20% [3][11]. | Being first with a feature on someone else's model is a head start, not a moat. | [S] |
| **"Data network effects"** | a16z's own partners argued data advantages flatten with scale and go stale [5]. | Collecting more files does not, by itself, make us harder to copy. | [O] |
| **Content incumbents, Feb 2026** | On 3 Feb 2026 a model maker released a legal plugin (contract review, NDA triage, compliance tracking). In one day Thomson Reuters fell up to 18%, RELX 14% and Wolters Kluwer 13% [12][13]. Analysts said it threatened their *workflow* layer more than their *content*; a month later the debate was unresolved [12]. | Even firms with decades of maintained content were repriced. The market believes the workflow layer on top of content is the copyable part. | [S] |
| **"Our AI knows the law"** | In an independent October 2025 benchmark of 200 US legal research questions, a general chatbot scored 80% on accuracy against 79 to 81% for three legal-specific tools; the legal tools led only on citing authoritative sources (76% against 70%). The two biggest legal-content vendors did not take part [14]. | Domain knowledge baked into prompts erodes as general models improve. Sources and authority held up better. | [V] (independent benchmark, via press) |
| **"Systems of record are dead"** | Early 2026's software sell-off treated all software alike [10]; IDC later called the premise flawed [9]. | Contested both ways. Being the system of record still matters, but investors now ask how AI changes seat counts. | [S]; [O] |

### 1.3 Synthesis: what lasts, ranked [I]

| Layer | How durable | Why (sources) |
|---|---|---|
| Access to a model | None | Everyone can rent the same model [1][3]. |
| Prompts and "the AI knows the domain" | Low, and falling | General models catch up [14]; model makers ship vertical plugins [12]. |
| Workflow, **if you are the system of record** | High | Records, integrations and trained users are slow to rebuild [1][2][10]. |
| Workflow, if you are a layer on someone else's record | Low | "Cut out with a plugin" [10]; the record-holder can add "pretty good" AI [1]. |
| Maintained domain content with sources and dates | Medium to high, if kept current | Costly and slow to build; copyable with money and time [5][21][22]. |
| Proof of quality (expert test sets, published measured accuracy) | Medium, compounding | Hard to fake for a buyer who checks; copyable in principle (see §3.4). |
| Regulatory trust (records that let a licensed person defend the file) | Medium to high in regulated work | Licensing and record duties raise the bar for newcomers [4][5]. |
| Distribution and reputation | High, but not a product feature | Sector credibility [8]; in our case, the founder-led route to consultants (plan v1.1 §1). |

### What this means for Expat Ready
AIW-D91's thesis matches the mainstream view, with one important correction: **the moat is not "the rules"; it is being the system where the firm's files live, running on rules we keep current, with proof of how well the AI does** [I]. That correction has a hard consequence. Expat Ready is a *new* system of record trying to replace incumbents (Officio, CaseEasy and others, plan v1.1 §2). In the Matrix argument [1], the incumbent that holds the records gains from AI, and a newcomer must win the record first. So the AI layer is a strong **reason to switch**, but it becomes a moat only after firms run their files in Expat Ready [I]. Investor material should say so in one line rather than imply the moat already exists.

---

## 2. How rule-grounded AI is positioned and sold in legal, tax, compliance and health

### 2.1 What the leaders say they sell

| Company and product | How it is positioned | What sits underneath | Label |
|---|---|---|---|
| **Thomson Reuters, CoCounsel Legal** (5 Aug 2025) [15] | Research and guided workflows "grounded in Westlaw and Practical Law content"; reports with citations; "human oversight built in". Claims more than 20,000 firms and legal departments use CoCounsel. | Decades of edited legal content; Practical Law's "more than 650 attorney-editors"; "thousands of domain experts" named as one of three ingredients of reliable agentic AI. | [VC] |
| **Harvey, alliance with LexisNexis** (18 Jun 2025) [16] | The leading AI-native legal start-up chose to bring LexisNexis case law, statutes and citation checking into its product rather than rely on its models alone. | The content owner's citation graph. | [S] (press releases via search; integration status Unknown) |
| **Wolters Kluwer, UpToDate Expert AI** (24 Sep 2025) [17][18] | A generative layer on a clinical reference sold for about 30 years; answers only from its expert-written, peer-reviewed content, with reasoning and citations; sold to enterprise customers first. | The editorial pipeline; built into clinical record systems. | [S]; claims [VC] |
| **Avalara, "Avi" and compliance agents** (1 Jul and 3 Nov 2025) [19][20] | Answers "maintained by the Avalara tax research team", with citations; every agent "operates with built-in checkpoints for human review and approval"; a return is filed "only when you say 'go'". | "AI-curated, human-verified tax rules and rates for 195 countries" (its words). | [VC] |
| **Vertex** (investor deck, Mar 2025; rates report, Feb 2026) [21][22] | "AI Capabilities Strengthened with Humans In-the-Loop"; "100+ Tax Experts Worldwide"; an "SSAE 18 Certified Research Process" (an externally audited content process); "over 1 billion tax rules actively managed". | Constant rule maintenance: 681 US sales-tax rate changes and new rates, and 335 new taxing jurisdictions, in 2025 alone. | [VC] |
| **Health prior authorisation: the US rule** (CMS-0057-F) [23][24] | Federal rule requiring affected health plans to run standard prior-authorisation interfaces, with key dates in 2026 and 2027. Industry guides describe plans' documentation rules being written as machine-readable logic (questionnaires driven by a rule language) that software, including AI, fills in. | The payer's rules become data, versioned and executable: the same idea as a pack. | [V] fact sheet; [S] implementation detail |
| **Cohere Health** (US prior authorisation; May 2025) [25] | Says its AI makes a real-time decision in 85% of cases and nurses and doctors sign off the other 15%, and that "no claim is denied exclusively by AI". | Health plans' clinical policies encoded as rules. | [S]; figures [VC] |
| **California SB 1120** (in force 1 Jan 2025) [26] | The law lets insurers use AI in reviews, but a licensed physician or qualified provider must decide any denial based on medical necessity. | Regulation that makes "AI prepares, a licensed person decides" the legal shape of the product. | [V] |

### 2.2 The common pattern [I]

1. **"Grounded in our maintained content."** Nobody leads with the model. They lead with the content they keep current and who keeps it (attorney-editors, tax experts, a research team).
2. **Show the source.** Citations or the rule behind every answer.
3. **A named human checkpoint** before anything with consequences (filing, denial, advice).
4. **An audited content process** is itself sold (Vertex's externally audited research process).
5. **Inside the system the buyer already uses** (Westlaw, clinical record systems, the tax engine), not a separate chat window.
6. **Not the word "neuro-symbolic".** None of the pages read uses it in selling; they say "grounded", "expert content", "human in the loop".

### 2.3 What buyers in regulated professions say makes them trust and pay

- **Accuracy is the first barrier.** Thomson Reuters' 2026 survey of more than 1,500 professionals: "reliability and accuracy are cited as the leading reasons professionals hesitate" [28] [Survey, vendor-run]. A LexisNexis 2026 survey of 543 legal professionals: 83% name fabricated information as their top concern [29] [Survey, vendor-run].
- **Grounding in trusted sources is now what most lawyers prefer:** 81%, up from 70% a year earlier, in the same LexisNexis survey [29] [Survey, vendor-run].
- **Many still use general tools.** In Thomson Reuters' 2025 survey, 41% personally used public tools such as ChatGPT against 17% for industry-specific tools [27] [Survey, vendor-run]. Specialist tools have not won by default.
- **Non-users distrust quality.** Among in-house lawyers with no plans to use generative AI, 82% did not trust its quality or reliability (a small group, 2% of 657) [30] [Survey].
- **They will pay something for AI built into their system:** 32.8% would pay at least 10% more for agents built into their applications [9] [Survey, sample not stated].
- **They fear the checking cost.** 67% of senior legal professionals worry verification costs outweigh the gains (Morae 2026, in `ai-in-regulated-work-2026-10.md` §3.2) [Survey].
- Almost all of this evidence is from vendor-run surveys. I found no independent study of what makes an immigration consultant pay for AI (**Unknown**; the founder's ten conversations, AIW-D63, are the only route).

### What this means for Expat Ready
The rule-grounded story is **the normal way regulated AI is sold**, which helps: buyers already understand "grounded in maintained content, with a human checkpoint". It also means the story is **not unique**: every serious vendor tells it. What differs is proof. Thomson Reuters can point to editors and decades of content; Vertex to an audited research process. Expat Ready can point to the *design* of the same things (dated sources on every rule, SA-1B-39; two-person publishing, SA1-D6; per-skill driving tests, AIW-D83) but to **no content and no measured results yet** [I]. Say "rules first, AI second", never "neuro-symbolic", and lead with what a consultant can check on screen.

---

## 3. Honest limits of this moat

### 3.1 Can rivals, VisaFlo or Navisa encode the same IRCC program rules?

**Yes, and several already do something close** [I, from the evidence below].
- **The rules are public.** IRCC publishes the CRS criteria and offers its own CRS tool [31] [V]; program-delivery updates are public pages [32] [V].
- **Rivals already sell rule-based or IRCC-grounded features** (all [VC], from `ai-coverage-vs-competitors-2026-10.md` §2.2 rows 3, 8, 12 and 14, accessed 11 Oct 2026): Immicase says its form filling is *"Deterministic — no AI inference"*; CaseEasy offers rules-based PDF autofill and a CRS copilot; Migrawise sells CRS, Federal Skilled Worker and PNP analysers; Visto's copilot is described as *"trained exclusively on IRCC"* information; VisaFlo's regulatory monitor is "Launching soon"; Navisa claims a daily policy watch mapped to affected clients.
- **Our own pack is not written yet.** SA-01 v2.2 BR-15 says the "content values are authored and signed off by the Immigration SME and product owners", and §13 routes "all content values when the Canada pack is authored" to that specialist. The code checked on 22 Sep has "No source, date-checked or next-review fields on content, and no overdue queue" and "No assessment output" (SA-01B v1.2 §12, gaps list).

**So "a rival cannot reproduce the rules" (AIW-D91) is not true as stated.** What a rival cannot quickly reproduce is the rest of the machine: dated sources and review dates on every rule, two-person publishing, pinning each case to the rules it started under, and the per-file record that ties an AI proposal to a rule version and an approver [I]. VisaFlo and Navisa could build those too; nothing in their public pages shows they have (`ai-coverage-vs-competitors-2026-10.md` §2.2 row 19).

### 3.2 How fast do rules change, and what does maintaining them cost?

**Speed of change.**
- IRCC's program-delivery updates page lists **about 127 dated updates between 2 Jan and 8 Oct 2026** [32] [V page; the count was made by our page-reading tool and is approximate]. Many concern refugee, humanitarian or temporary measures rather than the economic programs a Canada pack scores, so the share that touches pack content is **Unknown**.
- Two recent examples that would change pack content: from 25 Mar 2025, Express Entry stopped giving CRS points for a job offer [33] [S]; in Feb 2026 IRCC announced new Express Entry categories and raised the minimum work experience in renewed categories from six months to one year [34] [S].
- Tax shows the scale such maintenance can reach: Vertex counted 681 US sales-tax rate changes and new rates in 2025 [21], and says it has "100+ Tax Experts Worldwide" [22] [VC].

**How the product is designed to absorb change** (cited, not restated):
- rule changes "without developers": edit, second-person approval, effective date (SA-01 v2.2 §1 outcome 1; SA1-D6);
- the rule version in force on a date applies (SA-01 v2.2 BR-3);
- "Every assessment, case and generated form records the pack version it used" (SA-01 v2.2 §1 outcome 2); packs are "versioned, effective-dated, draft→publish and pinned per case" (Founder Decisions Log v1.5, FD-22 consequence 3);
- a source, date checked and next-review date on every rule, with an overdue queue: "Content never expires silently" (SA-01B v1.2 SA-1B-39, SA-1B-40);
- a Rule-change Watcher that proposes and never publishes (AW-02 v0.8, AW-2-53 to AW-2-56).

**The gap that weakens the moat claim most.** Pack rules are **not tested**. SA1B-D18 (SA-01B v1.2 §0): "Rules and scoring are trusted by second-person approval alone — no mandatory test profiles, no test run at publish". The same row records it was the "Product owners' call, against the recommendation; the exposure is that a wrong gate or points row reaches clients in writing if the reviewer misses it." Research on reviewers says they catch only about 31% of errors that need knowledge of the rules (`ai-in-regulated-work-2026-10.md` §3.2). So "measured accuracy underneath" is true, by design, for the **AI skills** (AIW-D83) but **not for the rules** the skills are checked against [I]. See Proposal P2 in §7.

**What maintenance costs (Assumption).** A Canada Country Pack plus Practice Pack might need 20 to 40 specialist hours a month to track changes, update rules and keep review dates, plus 5 to 10 hours of a second reviewer. At the licensed-consultant median wage of CAD 42.56 an hour (Job Bank, NOC 41403, via `../commercial/provider-and-cost.md` §3.5), that is about **CAD 1,060 to 2,130 a month** before the first authoring of the pack. A contracted specialist will likely charge more than the median wage (rate **Unknown**). The Pack author's AI (AW-02) is meant to lower this; by how much is **Unknown** until it runs.

**Why this cost can become a moat [I].** The cost is fixed: one Canada pack serves every firm. At 50 firms the illustrative cost above is about CAD 21 to 43 a firm a month; at 200 firms about CAD 5 to 11. A rival with fewer firms pays the same cost per pack and spreads it thinner. That is a scale advantage, not a technical one, and it only exists once we have the firms.

### 3.3 What happens when foundation models get better at rules?

- **They are getting better at knowing the law** (§1.2: a general chatbot level with legal tools on accuracy [14]).
- **They are still weak at computing rules exactly.** In a July 2025 benchmark built from a tax-software company's test cases, leading models calculated "less than a third" of simplified US federal returns correctly; they "misuse tax tables, make errors in tax calculation, and incorrectly determine eligibility" [37] [V paper]. Newer models may do better; the paper's figures are for models of mid-2025.
- **What better models will erode for us [I]:** drafting quality as a selling point; "our AI understands immigration"; perhaps the need for the AI Checker as a second view.
- **What they will not supply [I]:** the rules in force *on a given date* with their government source (BR-3, SA-1B-39); the firm's own records and approvals; a named person who carries the licence (AIW-D13, AIW-D26); a re-runnable result for "what were the rules when we advised this client?" (SA-01 v2.2 §1 outcome 2; AG-03 v1.4 AG-3-39, "deterministic pure function"); and processing in Canada (AIW-D52, AIW-D74).
- **Better models also help us.** The model is a replaceable setting in each skill's manifest, and a model change is a new skill version that must pass its driving test (`ai-architecture-deterministic-2026-10.md` §8.3 item 3; AIW-D83). A model that becomes good at rules does not make a reproducible, auditable rule engine unnecessary; regulators and courts ask for the record, not the model's confidence (`ai-in-regulated-work-2026-10.md` §2.4, §3.3) [I].
- **The real threat** is the one shown in Feb 2026 [12]: a model maker (or a large practice-software vendor) ships "immigration file preparation" as a plugin to whatever system the firm already uses. Our defence is being that system (§1.3), not having better prompts [I].

### 3.4 Where the real defensibility comes from

| Candidate | What it is in our design (cited) | Can a rival copy it? | Durability [I] | State today |
|---|---|---|---|---|
| **Maintained packs with dated sources** | Source, date checked, next review on every rule (SA-1B-39, SA-1B-40); two-person publishing (SA1-D6; AIW-D75); pinning per case (FD-22) | Yes, with a specialist and 6 to 12 months (**Assumption**) | Medium; strong only if kept current and paired with tests | Not built (SA-01B §12); Canada content not authored (SA-01 §13); pack rules untested (SA1B-D18) |
| **Audit trail** | Every model call logged with "the Doer, model, prompt version, firm, record, time and outcome" (AG-11 v1.12, AG-11-72); audit as "immutable, append-only, tamper-evident proof of who did what" (AG-13 v1.12 §3.5 heading), with "integrity by hash-chain — TARGET" (AG-13 Visual Overview, diagram C); a run record per skill run (`ai-architecture-deterministic-2026-10.md` §4.5) | Yes; logging is ordinary engineering | Low alone; high as **history**: years of a firm's records do not move easily [10] | Specified; the hash chain sits on SCOPE-TRIAGE's "move later" list (`visaflo.md` §16 row 17) |
| **Accuracy measured per skill** | Expert-graded test set, shadow, live with a floor and automatic drop back (AIW-D83) | Yes in principle; slow, needs licensed graders; first to publish honest numbers earns trust | Medium, compounding as test sets grow from real failures | Not started; bars and floors set with the specialist before Step 4 (AIW-D83) |
| **Firm data and workflow lock-in** | One record from enquiry to filed case (plan v1.1 §2); AI on top of the same record (AIW-D85) | Only by winning the firm | High once won; zero before. Lock-in must come from usefulness, not from holding data: the firm data export stays (AIW-D70) | No firms yet |
| **Regulator-ready records** | The provenance view per file (AW-01 v0.6, AW-1-23); approval as verification (AG11-D10); records that let a licensee answer the IRB's and the Federal Court's AI-disclosure duties truthfully (`ai-in-regulated-work-2026-10.md` §3.3) | Yes, but few rivals publish anything comparable (`ai-coverage-vs-competitors-2026-10.md` row 19) | Medium; rises if the College or IRCC tighten AI rules | Specified, not built; CICC has no AI guidance (same file §2.4) |
| **Canada-only data posture** | No AI runs until a Canadian provider record and a passed test call exist (AG-11-73; AW-1-52; AIW-D52, D74) | Yes: rivals can use the same Google region; LexisNexis already says Canadian data is processed "within Canadian or EU borders" [38] [VC]; Clio bought a Canadian legal-data company to build Canadian AI [39] [S] | Low to medium: a trust signal that is quickly becoming normal | Only one current model has a published Canadian processing promise (`ai-architecture-deterministic-2026-10.md` §8.1) |
| **Spreading pack upkeep across many firms** | One pack, many firms (FD-22 consequence 7) | Only by matching our firm count | High once at scale | No firms yet |

### What this means for Expat Ready
The founder's thesis survives, but narrower and later than stated. **True today:** the design puts fixed rules in charge and the AI inside them, which is the right shape and easy to explain. **Not true today:** "a rival cannot reproduce the rules" (they are public and partly encoded already), and "measured accuracy underneath" (pack rules are untested by team decision SA1B-D18, and no skill is measured yet). **The real moat, if we earn it,** is the combination: being the firm's system of record, packs kept current with dated sources, accuracy measured per skill and shown honestly, and records a licensee can stand behind, with the upkeep cost spread across more firms than any rival [I]. Each piece is copyable; the combination, kept current for years, is not cheap to copy.

---

## 4. The selling story

### 4.1 One-sentence pitch (to a licensed consultant)
"Expat Ready prepares your files inside your own case system, using immigration rules we keep current with the government source and review date on each one, and nothing reaches a client or IRCC until the person you name approves it."

### 4.2 The 30-second pitch
"You already check everything your staff prepare, and you will check what our AI prepares too. The difference is what you are checking. Scoring, checklists and deadlines come from fixed rules, not from the AI, so the same file gives the same answer every time, and every rule shows its government source and the date it was last checked. The AI only does the reading and drafting: it reads the passport, sorts the letter, drafts the message. Every value it proposes shows the page it came from, and it says 'not found' rather than guess. You approve, and the file keeps a record of what the AI did and who approved it, so you can answer if a tribunal or the College asks. Client data is processed in Canada. Each skill has to pass a test set graded by a licensed expert before it is switched on, and we will show you those results, not promises."

*(Use the last two sentences only once the provider test (AIW-D69) has passed and test results exist; until then say "will be processed in Canada" and "we will publish the results of each skill's test".)*

### 4.3 Three proof points we can show without overpromising

| # | Proof point | What we can show now (prototype, AIW-D86) | What we can show only after the pilot | Never say |
|---|---|---|---|---|
| 1 | **Every rule carries its source and review date, and two people approved it** (SA-1B-39; SA1-D6) | A rule card in the prototype with source link, date checked, next-review date and the two approvers, clearly marked as illustrative data | The real Canada pack, with the overdue-review queue empty | "Always up to date"; "approved by IRCC" |
| 2 | **Same file, same answer, and you can replay the past** (AG-3-39; SA-01 v2.2 §1 outcome 2) | Run an assessment twice and show identical results stamped with the pack version; show a case staying on the rules it started with | The same on real files | "Guaranteed eligibility" |
| 3 | **Every AI proposal shows where it came from, and each skill has a measured score** (AW-1-23; AIW-D83) | The detail drawer: what was read, the page, the rule checks passed or failed, who approved (AIW-D85) | "On our test set of N de-identified files graded by a licensed expert, the Document reader got X% of fields right and said 'not found' Y% of the time" | Any accuracy figure or hours-saved figure before it is measured; "error-free" |

The full say / do-not-say table is in `ai-in-regulated-work-2026-10.md` §7 ("How not to overpromise"); it applies here unchanged.

### 4.4 The objections we will hear, and honest answers

| Objection | Honest answer |
|---|---|
| "It's just ChatGPT with a nicer screen." | "The AI is rented; the rules are not. Scoring, checklists and deadlines come from our maintained rules, not the AI. The AI only reads and drafts, and every proposal is checked against those rules before you see it." (AIW-D84) |
| "VisaFlo and Visto already have AI, and they're live." | "True. They are selling today and we are not yet. Compare what you can check: where each value came from, which rule version applied, who approved it, where the AI processed your data. Ask them to show you the same." (`ai-coverage-vs-competitors-2026-10.md` §1, row 19) |
| "IRCC rules are public. Anyone can code the CRS." | "Correct, and IRCC has its own calculator. What we sell is keeping every rule current with its source and review date, and tying your file to the version in force when you advised the client." |
| "If I still check everything, what am I saving?" | "We don't know yet, and we won't quote a figure until our pilot measures it on real files. The aim is that checking takes seconds, because every value shows its source page." (`price-card.md` page 3) |
| "Who's responsible if the AI is wrong?" | "You are, as with any assistant you supervise (Code of Professional Conduct s. 38, as read in `ai-in-regulated-work-2026-10.md` §2.4; confirm with counsel / RCIC). The product's job is to make checking easy and to keep the record that shows you did." |
| "What happens when the next AI model knows immigration better than your rules?" | "Then we put the better model inside the same skills, after it passes the same test. The model changes; the rules, your records and your approvals stay." |
| "My current software holds all my files. Why move?" | "Because the AI is only as good as the record it works on. We import your client records (plan v1.1 §2, GAP-17) and new matters start with us." This is the hardest one; it is a switching argument, not an AI argument. |
| "Rivals include AI for CAD 15 a case or CAD 29 a month." | See §4.5. |

### 4.5 How the AI-as-a-layer story fits pricing

**What is already decided.** The ten conversations lead with (a) a price per prepared file (CAD 25 to 40, Assumption) and (b) an allowance inside the plan; only the Case Officer's AI is costed; the others ride inside the plan for the pilot (AIW-D60). The Pack author's AI and Support AI are shown as Expat Ready's own team and never sold (AIW-D61). Practice answers is a product feature that works with AI off (AIW-D90); deadline watching is the product's, never sold as AI (AIW-D37). The base plan's shape (published CAD 199 per seat, or per firm) is still open (plan v1.1 §8 action 3, due 30 Oct; `price-card.md` page 1).

**How the moat story fits (Proposal, for the Lead and the founder).**
1. **Put the cost of the moat in the base plan, not in an AI price.** Pack upkeep, two-person publishing, the audit trail and the Canada posture serve every firm even with AI off. They are platform costs recovered by the subscription, whichever shape the founder picks. This keeps the AI price honest: it pays for prepared files, not for "access to rules".
2. **Price the AI on the governed unit:** the prepared file whose readiness report a named person approves (`price-card.md` page 1, IMP-18). That unit is where the value (review time saved, once measured) and our cost (model plus review) both sit. Revenue then tracks caseload, not seats, which is the safer story when investors fear AI shrinks seat counts [10].
3. **Market reference points for "pay per piece of governed work"** [VC]: Intercom charges USD 0.99 per AI outcome [35]; Salesforce charges USD 0.10 per agent action [36]. In immigration, Navisa charges USD 16 per case and Migrawise CAD 15 per AI case (`price-card.md` page 2; `ai-coverage-vs-competitors-2026-10.md` §2.1).
4. **Use the platform AIs in the investor story as the cost side of the moat:** the Pack author's AI is how a small team keeps packs current (AIW-D61) [I].
5. **Never price "accuracy" or "Canada".** They are reasons to trust the per-file price, not extras [I].

**The strongest pricing objection.** *"Rivals include AI for CAD 15 a case or CAD 29 a month. Why pay CAD 25 to 40 a file for something I still have to check?"* Honest answer: only if the pilot shows the prepared file saves more review time than it costs. Until then the allowance (b) is the safer pilot shape, as AIW-D60 already chose, and the per-file number stays an Assumption (`price-card.md` page 3, "What would make us wrong").

### What this means for Expat Ready
The story is easy to tell and fits the existing pricing decisions without changing them. Its weak spot is not the words but the evidence: two of the three proof points need the pilot, and the toughest objection ("my current software holds my files") is about switching, not AI. Sales material should lead with what a consultant can check on screen and hold every number until it is measured.

---

## 5. Why this AI is different (for the Handbook front page)

Expat Ready's AI team does not work from its own memory of immigration rules. Every step whose answer must always be the same, such as scoring a program, building a checklist or counting a deadline, is done by the product's fixed rules, the same way every time. Those rules live in packs that an immigration specialist keeps current, with the government source, the date it was checked and the date it is next due on each rule, and a second person approves every change before it reaches a firm. Each case stays on the rules it started with, so you can always show what the rules were when you advised a client. The AI teammates do only the parts that need reading or writing: reading a passport, sorting a letter, drafting a message. Every proposal is checked against the pack rules, shows where each value came from, says "not found" rather than guess, and waits for a named person in your firm to approve it. Each skill must pass a test set graded by a licensed expert before it is switched on, and its accuracy keeps being measured afterwards. Everything is recorded: what the AI read, what it proposed, which rules it was checked against, and who approved it. Client data is processed only in Canada. Anyone can rent the same AI model; what they cannot rent is the maintained rules, your firm's records and the measured results underneath.

*(Sources for the Lead's checker: AIW-D84, D89, D90; SA-1B-39, SA1-D6, AIW-D75; FD-22 consequence 3; AW-1-23; AIW-D83; AG-11-72; AIW-D52, D74. Before publishing to anyone outside the team: the Canada sentence needs the provider test passed (AIW-D69), and "measured" needs test results to exist.)*

---

## 6. What we must do to make the moat real

All rows are **Proposals** unless they cite a decision. Owners are roles (README rule 10).

| # | Action | Why it matters to the moat | Owner (role) | Depends on | State today |
|---|---|---|---|---|---|
| 1 | **Author the Canada Country Pack and Practice Pack** with a source, date checked and next-review date on every rule | Without content there is nothing to be grounded in | The immigration specialist authors; a second person approves (SA1-D6; AIW-D75); product owners sign off (SA-01 BR-15) | The team builds the source and review fields and the overdue queue (SA-1B-39, SA-1B-40; missing in code, SA-01B §12) | Not started; specialist not yet contracted (`NEXT.md` founder actions) |
| 2 | **A fixed test set of client profiles for every pack rule and scoring change**, run before publish | Turns "two people looked at it" into "measured"; closes the gap SA1B-D18 records | The immigration specialist writes the profiles; the team's product owner owns the change | Revisiting SA1B-D18 (a team decision; see P2) | Explicitly not required today (SA-1B-38) |
| 3 | **Driving test per skill**: expert-graded test set, bar, shadow, floor, automatic drop back | The "measured accuracy" half of the moat | The named licensed reviewer grades; the immigration specialist sets bars and floors with the Lead (AIW-D83); the team's tech lead runs the regression gate (`ai-architecture-deterministic-2026-10.md` §5.3) | Real de-identified files; counsel before real files (AIW-D68) | Designed; no test set exists |
| 4 | **Publish measured results per skill**, in plain words, with their limits | Proof the buyer can check; rivals publish none | The founder decides what is published; counsel reviews the wording | Rows 3 and 9 | Nothing to publish yet |
| 5 | **Audit trail end to end**: model-call log (AG-11-72), run records per skill, append-only audit; keep the tamper-evident chain in Release 1 | The record a licensee needs; history becomes switching cost | The team's tech lead; the founder decides the SCOPE-TRIAGE question on the hash chain | AG-13 build | Specified; hash chain marked "TARGET" and proposed for later by SCOPE-TRIAGE |
| 6 | **A per-file "AI use" record a licensee can rely on** for IRB and Federal Court declarations | Turns the audit trail into something a consultant values | The Lead designs it in the blueprint (AIW-D86); counsel confirms what it must hold | Row 5; counsel pack | Partly specified (AW-1-23 provenance view) |
| 7 | **Data posture**: pass the Canada provider test; make a second Canadian route real; get the processing promise in contract terms | A trust signal, and a launch gate | The team's tech lead runs the test (AIW-D69); the founder signs terms | Provider availability (`ai-architecture-deterministic-2026-10.md` §8.3) | Test due October 2026 |
| 8 | **Keep the firm data export**; earn lock-in by usefulness, not by holding data | Regulated buyers and investors distrust data hostage-taking | The team (existing design; AIW-D70 refers to the firm data export) | None | Specified |
| 9 | **Write down the pack research process** (sources watched, review cadence, two-person rule, what triggers an urgent change); consider an outside review of it later | Tax vendors sell an audited content process [22] | The founder decides; the immigration specialist writes it | Row 1 | Not started |
| 10 | **A rule-built list of the files a pack change affects**, per firm | Turns rule maintenance into something a consultant sees every week; rivals sell it as AI | The team builds; Workstream 2 adds the AI's summary only if needed | Stale-assessment flag (AG-03 v1.4 §3.7–3.8, as cited in `ai-coverage-vs-competitors-2026-10.md` §5) | Gap recorded there |
| 11 | **Win the system of record**: founding firms running new matters in Expat Ready | Without it, every other row is a feature, not a moat | The founder and the licensed founder-consultant (plan v1.1 §1, §8) | Launch (AIW-D66) | No firms yet |

---

## 7. Proposals for the Lead (for `../proposals.md`; this file edits nothing else)

| # | Type | Proposal |
|---|---|---|
| P1 | Decision (for the founder) | Restate AIW-D91's "hard to copy" in all outward material as: *the moat is the combination of being the firm's system of record, maintained and dated rules, measured accuracy per skill and records a licensee can stand behind; the rules themselves are public.* Reason: §3.1. |
| P2 | Rule / question to the team | Raise SA1B-D18 (pack rules trusted by second-person approval alone, no test profiles) with the founder and the team's product owner: the moat claim "measured accuracy underneath" depends on it, and reviewers catch only about a third of rule errors. Workstream 2 states the conflict and writes no change note, since packs are the team's subject (README rule 11). |
| P3 | Rule | Investor and sales material may say "measured" only next to a number from a driving test (AIW-D83), and may say "processed in Canada" only after the provider test passes (AIW-D69). |
| P4 | Plan | Add row 10 of §6 (files affected by a pack change, by rule) to the Step R blueprint as a NEW item: it is the visible face of pack maintenance. |
| P5 | Plan | Keep the base-plan versus AI-price split of §4.5 (moat costs in the subscription; AI priced per approved prepared file) as an input to the Step 5 commercial merge, without changing AIW-D60 or D61. |

---

## Sources

All web sources accessed **11 Oct 2026**. Labels as defined at the top.

**Investors and operators on moats**
1. Matrix partner, "Vertical AI: beware what you wrap", 26 Mar 2025. https://notes.mtb.xyz/p/vertical-ai-beware-what-you-wrap [O]
2. Insight Partners, "Building a moat in the age of AI", 19 Nov 2025. https://insightpartners.com/ideas/building-a-moat-in-the-age-of-ai [O]
3. NFX, "The AI Wrapper is Dead: 3 Approaches to Verticalization for Early-Stage Startups", Jul 2026. https://nfx.com/post/ai-wrapper-dead-verticalization-startups [O; Jasper figures S]
4. Sequoia Capital, "Services: The New Software", 5 Mar 2026. https://sequoiacap.com/article/services-the-new-software/ [O]
5. Andreessen Horowitz, "The Empty Promise of Data Moats", 9 May 2019. https://a16z.com/the-empty-promise-of-data-moats/ [O; older than 2025, kept as the standard reference]
6. Andreessen Horowitz podcast page, "Why AI moats still matter and how they've changed", 3 Dec 2025. https://a16z.com/podcast/why-ai-moats-still-matter-and-how-theyve-changed/ [S, summary only]
7. Bessemer Venture Partners, "Founders playbook for building in Vertical AI", Jan 2026 (PDF returned HTTP 404 to our reader; known from search summaries). https://bvp.com/assets/uploads/2026/01/Founders-playbook-for-building-in-Vertical-AI-january-2026-bessemer-venture-partners.pdf [S]
8. *Boston Globe*, Battery Ventures' new fund, Feb 2026. https://www.bostonglobe.com/2026/02/18/business/battery-ventures-new-vc-fund/ [S]
9. IDC, "SaaSpocalypse: Catchy Title, Flawed Premise", 23 Sep 2026. https://www.idc.com/?p=121066 [O; Survey, sample not stated]
10. SiliconANGLE, "SaaSpocalypse mispricing: markets getting the AI software shakeout wrong", 10 Feb 2026. https://siliconangle.com/2026/02/10/saaspocalypse-mispricing-markets-getting-ai-software-shakeout-wrong/ [S]
11. Maginative, "Jasper appoints new CEO and cuts internal valuation as AI growth slows" (2023). https://www.maginative.com/article/jasper-cuts-internal-valuation-as-ai-growth-slows/ [S, via search summary]

**Where moats were tested**
12. Legal.io, "Anthropic's Claude Legal Plugin: One Month On", 6 Mar 2026. https://www.legal.io/blog/5798487/Anthropic-s-Claude-Legal-Plugin-One-Month-On-the-Market-Fallout-and-What-It-Means-for-Legal-Teams [S]
13. Morningstar, "Thomson Reuters, RELX, and Wolters stocks crushed after Anthropic debuts Claude legal plug-in", Feb 2026 (page refused our reader, HTTP 403; figures via search summaries). https://global.morningstar.com/en-ca/stocks/reuters-relx-wolters-stocks-crushed-after-anthropic-debuts-claude-legal-plug-in [S]
14. LawNext, "Vals AI's latest benchmark finds legal and general AI now outperform lawyers in legal research accuracy", 23 Oct 2025. https://www.lawnext.com/2025/10/vals-ais-latest-benchmark-finds-legal-and-general-ai-now-outperform-lawyers-in-legal-research-accuracy.html [V, independent benchmark via press]

**Rule-grounded AI in legal, tax and health**
15. Thomson Reuters, press release, "Thomson Reuters launches CoCounsel Legal", 5 Aug 2025. https://www.thomsonreuters.com/en/press-releases/2025/august/thomson-reuters-launches-cocounsel-legal-transforming-legal-work-with-agentic-ai-and-deep-research [VC]
16. LexisNexis press room, "LexisNexis and Harvey announce strategic alliance", 18 Jun 2025. https://www.lexisnexis.com/community/pressroom/b/news/posts/lexisnexis-and-harvey-announce-strategic-alliance-to-integrate-trusted-high-quality-ai-technology-and-legal-content-and-develop-advanced-workflows [S, via search summaries; claims VC]
17. Fierce Healthcare, "Wolters Kluwer jumps into the AI market, rolls out gen AI version of UpToDate", Sep 2025. https://fiercehealthcare.com/ai-and-machine-learning/wolters-kluwer-rolls-out-gen-ai-version-uptodate-clinical-decision-support [S]
18. HIT Consultant, "Wolters Kluwer Health launches UpToDate Expert AI", 24 Sep 2025. https://hitconsultant.net/2025/09/24/wolters-kluwer-health-launches-uptodate-expert-ai-to-accelerate-clinical-decisions/ [S; claims VC]
19. CPA Practice Advisor, "Avalara launches Avi and a network of secure compliance agents", 3 Nov 2025. https://www.cpapracticeadvisor.com/2025/11/03/avalara-launches-avi-and-a-network-of-secure-compliance-agents-built-for-action-designed-for-human-oversight/172209/ [VC]
20. Avalara blog, "Avi for Avalara Tax Research", 1 Jul 2025. https://www.avalara.com/us/en/blog/avi-for-atr.html [VC]
21. Vertex, "U.S. sees record-level growth in sales tax rates and rules changes in 2025", 3 Feb 2026. https://www.vertexinc.com/node/8033 [VC]
22. Vertex, investor presentation (SEC Form 8-K, exhibit 99.1), 19 Mar 2025. https://www.sec.gov/Archives/edgar/data/1806837/000155837025003260/verx-20250319xex99d1.htm [VC]
23. US Centers for Medicare & Medicaid Services, fact sheet, Interoperability and Prior Authorization Final Rule (CMS-0057-F), 17 Jan 2024 (dates run to 2027). https://www.cms.gov/newsroom/fact-sheets/cms-interoperability-and-prior-authorization-final-rule-cms-0057-f [V, via search summary]
24. Health Samurai documentation, prior authorisation (documentation rules as questionnaires driven by rule logic). https://www.health-samurai.io/docs/payerbox/prior-auth [S]
25. Fierce Healthcare, "Cohere Health lands $90M series C round", May 2025. https://www.fiercehealthcare.com/ai-and-machine-learning/cohere-health-lands-90m-series-c-round-expand-ai-use-cases [S; figures VC]
26. California State Senate, District 13, press release on SB 1120, 9 Dec 2024 (in force 1 Jan 2025). https://sd13.senate.ca.gov/news/press-release/december-9-2024/landmark-law-prohibits-health-insurance-companies-using-ai-to [V]

**What buyers say**
27. Thomson Reuters Institute, "2025 Generative AI in Professional Services Report", 15 Apr 2025. https://www.thomsonreuters.com/en-us/posts/technology/genai-professional-services-report-2025/ [Survey, vendor-run]
28. Thomson Reuters Institute, "2026 AI in Professional Services Report", 7 Apr 2026. https://insight.thomsonreuters.com.au/legal/resources/resource/2026-ai-in-professional-services-report [Survey, vendor-run]
29. *Solicitors Journal*, "Lawyers increasingly prefer AI grounded in legal sources" (LexisNexis 2026 survey, 543 respondents), 2 Sep 2026. https://www.solicitorsjournal.com/sjarticle/lawyers-increasingly-prefer-ai-grounded-in-legal-sources-- [Survey, vendor-run]
30. *Canadian Lawyer*, ACC and Everlaw survey of 657 in-house professionals, 15 Oct 2025. https://www.canadianlawyermag.com/resources/legal-technology/in-house-professionals-who-dont-use-generative-ai-tools-cite-distrust-of-reliability-quality-survey/393210 [Survey]

**Immigration rules and their pace of change**
31. IRCC, "Express Entry: Comprehensive Ranking System" (operational instructions; links to IRCC's CRS tool). https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/permanent-residence/express-entry/comprehensive-ranking-system.html [V]
32. IRCC, "Program delivery updates" (list of dated updates; latest entry 8 Oct 2026). https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/updates.html [V; count approximate]
33. CIC News, "Canada removes bonus CRS points for arranged employment from Express Entry", Mar 2025. https://www.cicnews.com/2025/03/breaking-canada-removes-bonus-crs-points-for-arranged-employment-from-express-entry-0353251.html [S]
34. EIG Law, "Canada announces 2026 Express Entry categories", Feb 2026. https://eiglaw.com/canada-announces-2026-express-entry-categories-to-prioritize-top-global-talent/ [S]

**Pricing reference points**
35. Intercom, pricing page (Fin at USD 0.99 per outcome). https://www.intercom.com/pricing [VC]
36. Salesforce blog, "Flex Credits" (USD 0.10 per action), 23 May 2025. https://www.salesforce.com/blog/flex-credits/ [VC]

**Models and rules; Canadian data posture**
37. "TaxCalcBench: Evaluating Frontier Models on the Tax Calculation Task", arXiv 2507.16126 v1, 22 Jul 2025. https://arxiv.org/abs/2507.16126v1 [V]
38. LexisNexis Canada blog, "Regionalization in action: how Lexis+ AI prioritizes Canadian privacy and compliance", 12 Jun 2025. https://www.lexisnexis.com/blogs/en-ca/b/legal-ai/posts/regionalization-in-action-how-lexis-ai-prioritizes-canadian-privacy-and-compliance [VC]
39. Legal Technology, "Clio acquires Jurisage to accelerate Canadian legal AI innovation", 10 Jun 2026. https://legaltechnology.com/clio-acquires-jurisage-to-accelerate-canadian-legal-ai-innovation/ [S; figures VC]

**Expat Ready (files, newest snapshot `sources/drive-snapshot-2026-10-11/`)**
- `01-techno-functional/07-Founder-Decisions-Log.md`, document version 1.5: FD-22 consequences 2, 3 and 7; amendment A22-6.
- `02-functional-requirements/super-admin/SA-01-country-and-immigration-pack-management_v2.2_2026-09-22.md`: §1 business outcomes 1 to 3; SA1-D6; BR-3; BR-15; §13 routing of content values.
- `02-functional-requirements/super-admin/SA-01B-content-pack-configurator_v1.2_2026-10-05.md`: §0 SA1B-D18; §3.6 SA-1B-38 to SA-1B-40; §12 gaps list.
- `02-functional-requirements/agent/AG-03-pathway-assessment_v1.4_2026-10-07.md`: AG-3-39.
- `02-functional-requirements/agent/AG-11-automation_v1.12_2026-10-10.md`: §3.0 ("the Conductor is the brain; the Doers are the hands"); AG-11-54; AG-11-72; AG-11-73; AG11-D15.
- `02-functional-requirements/agent/AG-13-tasks-reminders-notes-and-activity-audit_v1.12_2026-10-07.md`: Visual Overview, diagram C ("integrity by hash-chain — TARGET"); §3.5 heading.
- `ai-workers/requirements/AW-01-firm-ai-assistants_v0.1.md`, document version 0.6: AW-1-23, AW-1-52. `AW-02-platform-ai-assistants_v0.1.md`, document version 0.8: AW-2-53 to AW-2-56.
- `ai-workers/decisions.md`: AIW-D13, D26, D37, D52, D60, D61, D63, D66, D68 to D70, D74, D75, D83 to D91.
- `commercial/plan.md` v1.1: §1, §2, §3, §6, §8. `ai-workers/commercial/price-card.md` pages 1 to 3; `provider-and-cost.md` §3.5.
- `ai-workers/research/`: `ai-architecture-deterministic-2026-10.md` §4.5, §5.3, §8; `ai-in-regulated-work-2026-10.md` §2.4, §3.2, §3.3, §7; `ai-coverage-vs-competitors-2026-10.md` §1, §2.1, §2.2, §5; `visaflo.md` §16.

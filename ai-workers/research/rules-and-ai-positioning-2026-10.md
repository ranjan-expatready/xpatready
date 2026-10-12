# Rules and AI: how to name, sell and price them honestly (founder ask, 12 Oct 2026)

**Date:** 12 Oct 2026. **Author:** research maker for the Lead. **Status:** research input; not yet through the adversarial checker; nothing here is a decision. **Asked by:** the founder, through the Lead, 12 Oct 2026.

**The ask, as the Lead relayed it.** Build eligibility, scoring and assessments as fixed (deterministic) rules, but present them to buyers "under the flavour of AI" for easy selling; use real AI for conversation, follow-ups, language and tool calling; and give a framework that makes this a multi-million-dollar product.

**Builds on, and does not repeat:**
- `ai-moat-and-positioning-2026-10.md` (moat, selling story §4, proof points §4.3, objections §4.4, pricing fit §4.5, proposals P1 to P5);
- `ai-in-regulated-work-2026-10.md` (DoNotPay §2.1; regulator guidance §2.4; "How not to overpromise" table §7, the say / do-not-say rows near line 370);
- `ai-coverage-vs-competitors-2026-10.md` (§1 summary, §2.2 matrix);
- `visaflo.md` (§3.1 agents, §12 AI direction);
- `../commercial/price-card.md` (options a, b, c; cost and value pages 1 and 3) and `../../commercial/plan.md` v1.1 (§2, §3).

**Evidence labels.** **[V]** verified primary (statute, regulator, court or the company's own legal page read directly). **[S]** secondary (law-firm note, press, third-party price tracker). **[VC]** vendor claim (the company about itself). **[Survey]** self-reported answers. **[I]** our inference. **Proposal / Assumption / Unknown** as in README §5. Every web source below was accessed on **12 Oct 2026** unless the earlier file is cited. No person is named (README rule 10): officials and executives are described by role.

**Plain-English glossary**
- **Deterministic / rules:** the same input always gives the same output, because a fixed rule written by a person computes it (for example, Express Entry points from age, language and education).
- **AI (in this file):** a large language model (LLM): software that reads and writes language and can be wrong in ways that vary from run to run.
- **Tool calling:** the AI does not compute the answer itself; it asks another piece of software (here, the product's rules) to compute it and passes the result on.
- **AI washing:** claiming more or different AI than a product really has. Regulators treat it as ordinary false advertising.
- **Substantiation:** the evidence a seller must hold *before* making a claim.
- **General impression:** under Canadian law, an advert is judged by the overall impression it leaves, not only its literal words.

---

## (a) Summary for the founder (12 lines)

1. **"Rules sold as AI" is the textbook example of AI washing.** A Canadian law firm's 2026 definition lists "presenting basic automation or rule-based software as AI" [5]; the Competition Bureau says AI claims are "treated the same as any other claims" and that sellers should say what they mean by AI [3].
2. **The legal exposure is real, not theoretical.** The Competition Act judges the "general impression", not just the words [2]; penalties for a company reach CAD 10 million or 3 times the benefit [2]; since 20 Jun 2025 competitors can ask the Tribunal for leave to bring their own deceptive-marketing cases [6].
3. **The US shows the pattern:** the FTC's sweep (2024 onward) says "there is no AI exemption from the laws on the books" [8]; the SEC fined two advisers for claiming AI they did not use [13]; a founder now faces criminal charges [14].
4. **Our own buyers carry the risk too.** RCICs must not make "false, misleading or inaccurate representations" (Code s. 44(2)(a)) and are responsible for work they delegate (s. 38(2)) [18]. Wrong labels also corrupt the AI-use record they need for Federal Court and IRB declarations.
5. **It would also sell worse.** In professional work, buyers' top conditions for trusting AI are confidential data (96%), grounding in authoritative content (94%) and reasoning they can explain and defend (90%) [31]. A US study found the words "artificial intelligence" *lowered* purchase intent, most for high-risk purchases [32].
6. **Best-in-class products do the opposite of "flavour".** TurboTax guarantees its *calculations* and calls the AI "guidance" [19][20]; Pega says critical steps "are executed by rules-based automation" [21]; Salesforce sells "deterministic control" next to the LLM [22]. They sell the rules as the reason to trust, not as AI.
7. **Your idea has a stronger honest version, and it keeps most of the selling power.** The AI genuinely runs the conversation, gathers the facts and *calls* the rules as a tool. So "Ask the AI to assess this client" is true; "the AI assessed this client" is not. The result is labelled as coming from the rules, with the rule version and source.
8. **The four honest classes:** rules only (never called AI); AI using rule tools (AI named, the rules named as the source of the answer); AI language (named AI, approve before it leaves); person only (the licensee's judgement).
9. **Headline story (Proposal):** "Rules you can defend. AI that does the legwork. You decide." Determinism is a selling point to this buyer, not something to hide.
10. **Pricing follows the classes:** rules and their upkeep sit in the subscription; AI is priced on the approved prepared file (AIW-D60), matching how Intercom, Salesforce and EvenUp price units of finished work [34][35][38].
11. **Multi-million path (Assumption):** about 500 firms at about CAD 529 a month (Practice plan plus ten prepared files) is about CAD 3.2 million a year; 1,000 firms is about CAD 6.3 million. It depends on winning the firm's records first, not on the AI label.
12. **Decisions needed:** adopt the four-class naming as a rule; withdraw "under the flavour of AI" from all material; have counsel read the phrase list before anything is published.

---

## (b) Findings

### 1. The legal line on calling rules "AI"

#### 1.1 Canada: the Competition Act

| What | Exact words or fact | Label |
|---|---|---|
| The general ban (civil, reviewable) | A person engages in reviewable conduct if they make "a representation to the public that is false or misleading in a material respect" (s. 74.01(1)(a)) [1] | [V] |
| Performance claims need a test first | A statement of "the performance, efficacy or length of life of a product that is not based on an adequate and proper test thereof, the proof of which lies on the person making the representation" (s. 74.01(1)(b)) [1] | [V] |
| Judged by overall impression | "the general impression conveyed by a representation as well as its literal meaning shall be taken into account" (s. 74.03(5), for ss. 74.01 and 74.02) [2] | [V] |
| Penalty for a company (after the 2024 amendments) | The greater of "$10,000,000 and, for each subsequent order, $15,000,000" and "three times the value of the benefit derived from the deceptive conduct", or, if that cannot be determined, "3% of the corporation's annual worldwide gross revenues" (s. 74.1(1)(c)) [2]. The Act page is current to 21 Sep 2026 [1]. | [V] |
| Private cases (Bill C-59) | Since 20 Jun 2025 private parties, such as a competitor, may seek the Tribunal's leave to bring a case under s. 74.01; leave for deceptive marketing needs a "public interest" test; no new money award for private applicants [6] | [S] |
| The Bureau on AI claims | The Bureau's deputy commissioner for deceptive marketing wrote (31 May 2023): "Claims that promote AI related abilities are treated the same as any other claims"; because AI has no standard definition, advertisers should explain what they mean; performance claims need "adequate and proper testing" done before the claim [3] | [V] (the Bureau's own words, published by the Canadian Marketing Association) |
| Same message repeated | The CMA's July 2025 playbook repeats the Bureau's position and lists red flags: "overstated performance promises, lack of transparency about human involvement, and the absence of verifiable performance data" [4] | [S] |
| Definition used by Canadian counsel | "AI washing occurs when claims exaggerate or misrepresent the implication of AI in a product or service", with the example "presenting basic automation or rule-based software as AI"; Quebec's Consumer Protection Act s. 219 also bans deceptive representations (BCF, 10 Apr 2026) [5] | [S] |
| Enforcement so far | I found **no** Competition Bureau case or consent agreement about an AI capability claim up to 12 Oct 2026. The Bureau's AI work has focused on AI-made fakes, deepfakes and algorithmic pricing [5][7]. | [I] from searches; **Unknown** whether any investigation is open |

**Is calling rules "AI" a "material" misstatement for our buyer? [I; confirm with counsel]** Probably yes. For a licensed consultant, *how* an eligibility result is produced changes what they must check, what they must declare to the Federal Court and the IRB (`ai-in-regulated-work-2026-10.md` §2.4), and how they explain the result to a client. A claim that changes a professional buyer's duties is hard to call immaterial. No case decides this yet; that is exactly why it belongs on counsel's list (AIW-D68).

#### 1.2 United States: FTC, SEC and the advertising self-regulator

| Body and case | What happened | Lesson for us | Label |
|---|---|---|---|
| **FTC, "Operation AI Comply"** (25 Sep 2024) | Five actions announced together, including DoNotPay ("world's first robot lawyer"; no testing against lawyers; US$193,000 and a ban on unsupported claims of substituting for professional services). The FTC Chair at the time: "there is no AI exemption from the laws on the books." [8] | AI claims need the same proof as any other claim; the legal-services case is the closest to ours. | [V] |
| **FTC business guidance, "Keep your AI claims in check"** (Feb 2023) | Asks "Does the product actually use AI at all?"; warns that FTC technologists "can look under the hood"; distinguishes "using an AI tool to develop the product" from having AI in it [9] | This is the founder's exact question. A regulator can inspect what really computes the result. | [S] (FTC page returned 404 to our reader; quotes via a law firm's summary) |
| **FTC follow-on cases, 2025 to 2026** | Workado: AI-detector "98%" accuracy claim, alleged real accuracy about 53%; order to stop accuracy claims (final Aug 2025). Click Profit: "AI-powered" storefront claims; ban and suspended judgments (2025). Air AI: AI said to replace human sales staff; settlement announced Mar 2026 with a business-opportunity ban and a largely suspended US$18 million judgment [10][11] | Enforcement continued under the new FTC leadership; accuracy and "replaces a person" claims draw action. | [S] |
| **FTC proposed policy statement on AI accuracy** (comment sought 1 Jul 2026) | Says AI firms that "steer the outputs of their AI systems toward unexpected objectives" are likely to deceive consumers [12] | Proposal only; shows the FTC still treats AI claims as consumer-protection matters. | [S] (Federal Register page blocked our reader) |
| **SEC, Delphia and Global Predictions** (18 Mar 2024) | Delphia claimed it used AI and machine learning on client data when it did not (US$225,000); Global Predictions called itself the "first regulated AI financial advisor" (US$175,000). The SEC Chair at the time: "Such AI washing hurts investors." [13] | **Investor material** is covered too. Saying "AI" where rules or people do the work is the exact fact pattern. | [V] |
| **SEC, Presto Automation** (Jan 2025) | First AI-washing case against a public company: the voice AI belonged to a third party and involved significant human intervention [14] | Hidden human or non-AI work behind an "AI" label is the target. | [S] |
| **SEC and DOJ, Nate founder** (9 Apr 2025) | Claimed automation "above 90 percent"; the rate was alleged to be "essentially zero"; about US$42 million raised; parallel criminal charges [14] | The worst case: founders are personally charged for AI claims made to investors. | [S] |
| **Builder.ai** (insolvent May 2025) | Marketed an AI assistant that wrote code; reports say about 700 engineers did the work; revenue reportedly overstated; investigations reported [15] | The reputational end state of "flavour of AI". | [S], allegations |
| **Advertising self-regulator (NAD), 2025 to 2026** | A baby monitor's "AI-powered" claim was found *supported* because the device really had AI detection; the claim that it could "ensure" safety was not [17]. Counsel note NAD has asked advertisers to fix claims about whether "smart" features were properly described as AI [16]. | "AI-powered" is fine when true of the feature named; outcome promises are the problem. | [S] |

#### 1.3 The licensee's side: CICC Code of Professional Conduct (SOR/2022-128)

| Section | Exact words [18] | What it means for vendor claims [I; confirm with counsel / RCIC] |
|---|---|---|
| s. 44(2)(a), (b) | A licensee must not "make false, misleading or inaccurate representations" or "guarantee the success of an application, expression of interest or proceeding" | If a consultant repeats our "AI eligibility assessment" line on their own website or to a client, *they* make the representation. A vendor's wrong label becomes the licensee's compliance problem. |
| s. 38(2) | The licensee "must supervise and assume professional responsibility for any work done by a person who assists"; supervision must be "adequate for the type of work in question" | Adequate supervision depends on knowing what produced the output. Rules need checking of inputs; AI output needs checking of the content. A wrong label leads to the wrong kind of checking. |
| s. 38(3) | Non-licensees must not "provide representation or advice" in contravention of IRPA s. 91 | A conversational AI that tells a prospective client "you are eligible" is the risk, whether the verdict came from rules or a model. The AI may collect facts and run the rules for the licensee; it must not deliver the verdict to the public. (Our design already keeps eligibility away from leads: `ai-coverage-vs-competitors-2026-10.md` §1 item 5.) |
| s. 19(2)(e) | Be able to deliver services "using technology that is appropriate and effective" | The licensee needs truthful information about the tool to judge whether it is appropriate. |

The CICC has published no AI guidance (`ai-in-regulated-work-2026-10.md` §2.4, searched 11 Oct; a fresh search on 12 Oct found none either) [I].

**Two more knock-on effects of a wrong label [I]:**
- **Court and tribunal declarations.** The Federal Court and the IRB require a declaration when AI produced content (`ai-in-regulated-work-2026-10.md` §2.4). If rules are labelled "AI", licensees may over-declare; if AI drafting is hidden behind "smart rules", they may under-declare, and the IRB can report counsel to their regulator. Our per-file record of what the AI did (AW-1-23, per `ai-moat-and-positioning-2026-10.md` §3.4) is only worth something if the labels are true.
- **Quebec Law 25 s. 12.1** (automated decisions) applies to *automated processing*, whether rules or AI (`ai-in-regulated-work-2026-10.md` §2.4). Calling rules "AI" changes no duty; it only confuses who must tell whom what.

#### 1.4 What exactly is safe to say when an AI calls the rules as a tool

The test regulators apply is: is each claim literally true, is the overall impression true, and do we hold the proof before saying it [1][2][3][9]. Applied to a design where an AI teammate (AIW-D89) talks to the user, gathers facts and calls the assessment rules (AG-3-39, "deterministic pure function", as cited in `ai-moat-and-positioning-2026-10.md` §3.3):

| Statement | Safe? | Why [I] |
|---|---|---|
| "Ask the Case Officer's AI to run an assessment; it gathers the facts and runs our Express Entry rules." | **Yes** | True of each part: the AI converses and calls the tool; the rules compute. |
| "The score comes from the rules, not the AI. Same facts, same score, every time." | **Yes**, once AG-3-39 is built | Determinism is a factual property we can demonstrate (proof point 2 in `ai-moat-and-positioning-2026-10.md` §4.3). |
| "AI-assisted assessment" | **Borderline** | Literally true if the AI gathered the facts; the general impression is that AI computed the result. Use only with the next sentence attached: "the result is computed by the rules". |
| "AI-powered eligibility assessment" / "our AI assesses eligibility" / "AI scoring" | **No** | The general impression is that a model decides eligibility. False for our design, contradicts "AI does not decide" (FD-16, as stated in `plan.md` v1.1 §2) and reads as advice (Code s. 38(3)). |
| "AI that never makes mistakes on scoring" | **No** | The AI does not score; and "never" is a performance claim that needs a test (s. 74.01(1)(b)); pack rules are not tested today (SA1B-D18, per `ai-moat-and-positioning-2026-10.md` §3.2). |
| "Built with AI" about the rules | **No** | The FTC separates using AI to *build* a product from having AI *in* it [9]. Even if the Pack author's AI (AW-02) helps draft rules, the shipped rule is not AI. |
| "Expat Ready AI" as an umbrella brand over everything | **Risky** | A brand name that covers rules, the deadline watch and AI together gives the impression all of it is AI. Contradicts AIW-D37 and AIW-D90 (deadline watch and Practice answers "never sold as AI"). |

### 2. How best-in-class products market a fixed core with an AI layer

| Product | What they lead with | How the fixed (rules) part is described | How the AI is described | Label |
|---|---|---|---|---|
| **TurboTax (Intuit)** | Outcome and guarantee | "100% Accurate Calculations Guarantee": if a "TurboTax calculation error" causes a penalty, Intuit pays it; separate "Expert-Approved" guarantees for human experts. **No guarantee mentions AI or Intuit Assist** [19] | "AI-powered guidance from Intuit Assist" for explanations and answers [20] | [VC] |
| **Pega** | "Predictable AI agents" | "Critical steps – like risk scoring – are executed by rules-based automation for 100% accuracy"; agents "must work inside defined workflows" (8 Dec 2025) [21] | Intelligence used "for judgment calls" | [VC] |
| **Salesforce Agentforce** | Reliable agents | "a graph runtime that marries LLM intelligence with deterministic control"; "LLM reasoning alone cannot carry enterprise load" [22]; Agent Script mixes fixed logic with prompts (developer blog, Feb 2026) [23] | Agents with "hybrid reasoning" | [VC] |
| **Avalara** | Compliance done | "AI-curated, human-verified tax rules and rates" (`ai-moat-and-positioning-2026-10.md` §2.1) | "Avi" with human checkpoints | [VC] |
| **Thomson Reuters CoCounsel** | Grounded professional AI | Content "grounded in Westlaw and Practical Law" (same file §2.1) | Agentic research with citations | [VC] |
| **Ramp** | Finance agents | The agent "applies your written expense policy" and cites "the exact policy text"; starts "in review-only mode" [24] | "Autonomous finance agents" with "a clear audit trail for every decision"; claims 99% accuracy | [VC] |
| **Docketwise (immigration, US)** | "Spend 75% less time on admin" | "Smart" forms auto-filled from a questionnaire | AI (8am IQ) "captures data to eliminate errors" [25]. Rules and AI are not separated; "eliminate errors" is an absolute claim. | [VC] |
| **Boundless (immigration, US)** | Journey and success rate | "smart technology with human expertise"; "four different reviews"; flat fees; "99.7%" success [26] | Not separated | [VC] |
| **Alma (immigration, US)** | "Hire the best talent. We'll handle immigration." | "attorney-led execution with structured workflows" | **The homepage does not mention AI at all** [27] | [VC] |
| **Visto (immigration, Canada)** | Speed | "advanced automation and AI technology" | "An AI chatbot trained exclusively on IRCC info" [28] | [VC] |
| **VisaFlo (immigration, Canada)** | "Make judgment calls, not hires." | "Guardrails" "built into the product, not written in a policy doc"; never says "deterministic" | "friendly AI agents"; "Agents draft; you release, sign and file" [29] | [VC] |
| **Immicase (immigration, Canada)** | AI add-on | Form filling described as *"Deterministic — no AI inference"* (`ai-coverage-vs-competitors-2026-10.md` §2.1) | Separate AI assistants | [VC] |
| **Lemonade (insurance), cautionary** | "AI" as the brand | — | In May 2021 it tweeted that its AI picks up "non-verbal cues" in claim videos; after a backlash it deleted the thread, called it "poorly worded" and said it does not use AI "to automatically decline claims" [30] | [S] |

**The pattern [I].**
1. **Regulated-work leaders never call the rules "AI".** They call them calculations, rules, policy, verified content or workflows, and put the guarantee or the accuracy claim *there*. The AI is named for language work: guidance, drafting, answering, orchestrating.
2. **Enterprise vendors now sell determinism as the headline.** Pega and Salesforce market "predictable" and "deterministic control" because buyers distrust a model doing everything. Determinism has become the premium story, not something to hide.
3. **Consumer-facing immigration players blur the line**, with absolute claims ("eliminate errors", "99.7%"). That is where the legal and trust risk sits, and it is a gap we can win by being precise.
4. **One AI-native immigration firm does not mention AI at all** and sells attorneys plus structured workflow (Alma). The buyer pays for the outcome, not the technology.
5. **Over-claiming AI has backfired publicly** (Lemonade [30]; Builder.ai [15]).

**Which framing wins buyers in regulated professions?**
- **Grounding and explainability beat "AI" as such.** Thomson Reuters' 2026 survey of 1,816 professionals in 62 countries (law, tax, audit, accounting, compliance, risk, trade; fieldwork Mar to Apr 2026) names three minimum conditions for trustworthy professional AI: safeguarding confidential data (96%), grounding outputs in authoritative content (94%), and explainable, defensible reasoning (90%). 47% say the individual professional bears final responsibility for an AI-assisted error; 41% of AI users lack tools that meet those conditions [31] [Survey, vendor-run].
- **The LexisNexis 2026 survey:** 81% of lawyers prefer AI grounded in legal sources, up from 70% (`ai-moat-and-positioning-2026-10.md` §2.3) [Survey, vendor-run].
- **The word "AI" can cost sales.** In experiments with more than 1,000 US adults, adding "artificial intelligence" to a product description lowered purchase intent through lower emotional trust, and the effect was stronger for high-risk products such as financial services. The lead author: "Emphasizing AI may not always be beneficial, particularly for high-risk products" and "avoid the AI buzzwords" (Washington State University release, 30 Jul 2024) [32] [S; consumers, not professionals, and older than 2025].
- **Use is high but specialist tools have not won by default.** Clio's 2025 report: 79% of legal professionals use AI in some form; one summary says 40% use legal-specific AI; solo and small firms lag [33] [S, Survey].
- **Immigration consultants specifically:** no study found (**Unknown**). The ten founder conversations (AIW-D63) are the only route; the script should test the naming directly (see §(c)5).

### 3. Buyer trust: what licensed professionals need first

| Need | Evidence | What we already design (cited, not restated) |
|---|---|---|
| Correct, grounded output | 94% grounding [31]; accuracy is the top hesitation (`ai-moat-and-positioning-2026-10.md` §2.3) | Rules with source and review date (SA-1B-39); per-skill driving test (AIW-D83) |
| Reasoning they can explain and defend | 90% [31] | Assessment shows its reasons (`plan.md` v1.1 §2); detail drawer (AIW-D85) |
| Confidentiality | 96% [31] | Canada-only processing gate (AIW-D52, D74) |
| Clear responsibility | 47% say the professional bears it [31]; Code s. 38(2) [18] | A named person approves (AIW-D13, D26) |
| An audit trail | Ramp sells "a clear audit trail for every decision" [24]; Pega "every decision is logged" (search summary of Pega's page) [21] | Model-call log AG-11-72; run records; provenance view AW-1-23 (as cited in `ai-moat-and-positioning-2026-10.md` §3.4) |
| Proof, not promises | Bureau: test before the claim [3]; TR: "almost right" is not good enough [31] | P3 in `ai-moat-and-positioning-2026-10.md` §7: say "measured" only next to a number |

**Is "deterministic / rules-verified" itself a selling point? [I]** Yes, for this buyer, on three conditions.
1. **Plain words.** Say "same facts, same answer, every time, with the rule and its government source", not "deterministic" or "neuro-symbolic" (no regulated-work leader uses the jargon in selling; `ai-moat-and-positioning-2026-10.md` §2.2).
2. **The rules must be right and current.** Today pack rules are trusted on second-person approval alone, with no test profiles (SA1B-D18). "Rules-verified" is only honest once rules are tested before publishing (P2 in the moat file). Until then say "rules reviewed by two people" (SA1-D6).
3. **Not as a substitute for AI.** Buyers also want the time saved; the AI layer earns that. The story is the pairing.

### 4. Pricing and packaging: how AI layers on a rules core are priced

| Model | Example and figure | Label |
|---|---|---|
| Per user, AI add-on | Salesforce: USD 125 a user a month for Agentforce add-ons on Sales or Service [34]; Clio: AI add-on reported at USD 39 to 59, now quote-only [40]; Harvey: reported about USD 1,200+ a seat a month with seat minimums [37]; CoCounsel: reported USD 104 to 639 a user a month [37] | [VC] for Salesforce; [S] others |
| AI gated to a higher tier | ServiceNow: AI only in "Pro Plus" or "Enterprise Plus" tiers, metered in "assists"; uplift reported at 30 to 70% [36] | [S] |
| Per action or per conversation | Salesforce Flex Credits about USD 0.10 an action; USD 2 a conversation (older model) [34] | [VC] |
| Per outcome | Intercom Fin: "$0.99 per outcome", counted when the customer confirms resolution, stops asking, or a workflow completes [35] | [VC] |
| Per case (legal) | EvenUp moved to "all-in-one per-case pricing" (May 2025 release); prices unpublished [38] | [VC]; amounts Unknown |
| Volume of rule calculations | Avalara: priced by transactions, states and modules; one tracker cites USD 79 a state a month for small firms [39] | [S] |
| Immigration niche | CaseEasy "from $25 per case"; Visto "Extra application CAD 29"; Navisa USD 16 a case; Migrawise and Immicase about CAD 29 a month for AI (`../commercial/price-card.md` page 2) | [VC] via the price card |

**The pattern [I].** The fixed core (calculations, rules, compliance content) is paid for in the platform subscription or by volume of calculations. The AI is either bundled to win seats, or priced on a unit of finished work. The newest, highest-value products price per outcome or per case, because seat counts may fall as AI does more work (`ai-moat-and-positioning-2026-10.md` §4.5 item 2). This supports the split already proposed: rules and pack upkeep in the plan, AI on the approved prepared file (AIW-D60, D61; moat file P5).

---

## (c) Framework and recommendations

### 1. Four classes, each with one honest name (Proposal)

Every capability in Expat Ready belongs to exactly one class. The class decides what we may call it, how it is labelled on screen and how it is priced.

| Class | What it is | Expat Ready examples (cited) | What we call it | On-screen label | May we say "AI"? | Priced in |
|---|---|---|---|---|---|---|
| **1. Rules only** | Fixed rules compute the result; no model involved | Pathway assessment and scoring (AG-3-39); checklists; deadline watching (AIW-D37); Practice answers (AIW-D90) | "rules", "the [Express Entry] rules", "calculated", "checked against the rules" | "Calculated from Canada pack v[n], rules reviewed [date]" | **No** | Subscription |
| **2. AI using rule tools** | An AI teammate talks, gathers facts, then *calls* the rules; the rules compute the answer; the AI explains or acts on it | The Case Officer's AI asking for missing facts, then running the assessment; a File Builder run that checks proposals against pack rules (AIW-D84) | "the AI gathers and runs the rules" | Two parts: "Facts gathered by Case Officer's AI (approve)" and "Result: from the rules, pack v[n]" | **Yes, for the gathering and orchestrating only** | AI price (per approved prepared file) |
| **3. AI language** | A model reads or writes; the output varies and can be wrong | Document reader, cross-checker, drafter, sorting (`ai-in-regulated-work-2026-10.md` §7, v1 scope) | "AI", "AI teammate", "AI draft", "AI reading" | "AI draft – check before use", with source page shown (AW-1-23) | **Yes, always disclosed** | AI price or included allowance |
| **4. Person only** | A judgement or act reserved to the licensee | Advice, strategy, final eligibility opinion to the client, signing and submitting (Code s. 38(3), s. 22(2)) | "your decision", "approved by [role]" | "Approved by [named person], [date]" | **Never** | Not priced |

**Three binding rules for the classes (Proposal for `../proposals.md`, type Rule):**
1. **One label per output.** Every visible result carries the label of the class that produced it. A class 2 result always shows both parts: what the AI did and what the rules computed.
2. **Verbs follow the class.** Rules *calculate, check, list, count*. AI *reads, drafts, suggests, gathers, summarises, runs [the rules]*. People *decide, advise, approve, sign*. The AI never "assesses", "decides", "determines eligibility" or "advises".
3. **Umbrella names never cross classes.** "AI team" and "AI teammate" (AIW-D89) cover classes 2 and 3 only. The product's rules and deadline watch are "Expat Ready", not "Expat Ready AI".

### 2. Approved and forbidden phrases

Builds on the say / do-not-say table in `ai-in-regulated-work-2026-10.md` §7 (still applies unchanged); these rows are new and specific to rules and AI.

| Use (Proposal) | Never use | Why |
|---|---|---|
| "Scores and checklists come from fixed rules, not from AI. Same facts, same answer, every time." | "AI-powered assessment", "AI eligibility check", "AI scoring", "smart AI rules" | General impression [2]; "rule-based software as AI" [5]; FD-16 |
| "Ask your AI teammate to run an assessment: it collects the facts and runs the rules for you." | "Our AI assesses your client", "the AI decides eligibility" | The AI does not compute or decide; Code s. 38(3) [18] |
| "Every rule shows its government source and the date it was last checked." | "AI that always knows the latest rules", "always up to date" | Performance claim needs a test [1]; overdue review is possible (SA-1B-40) |
| "Rules reviewed by two people before release." Later, once tests exist: "Rules tested against [N] client profiles before release." | "Rules verified", "AI-verified", "100% accurate" | SA1B-D18 today; Pega's "100% accuracy" is a vendor's own claim [21], not a model for us |
| "AI reads the passport and shows you the page each value came from." | "AI that eliminates errors" | Absolute claim (compare [25]); FTC accuracy cases [10] |
| "We use AI where language is involved: reading, drafting, conversation. We use rules where the answer must be exact." | "AI-native", "AI-first immigration platform" (as a category claim over the rules) | Overall impression; investor-material risk [13][14] |
| Investor line: "AI handles the language work; a maintained rules engine handles the decisions that must be exact; a licensed person approves." | Investor line: "Our AI assesses eligibility and scores profiles", any automation rate not measured | SEC AI-washing cases [13][14]; P3 of the moat file |
| "Built with help from AI tools" (only about our own development, if ever relevant) | Treating AI-assisted authoring as "AI in the product" | FTC distinction [9] |

### 3. The headline story (Proposal)

**Headline:** *"Rules you can defend. AI that does the legwork. You decide."*

**One paragraph for a consultant:** "In Expat Ready, anything that must be exact, such as program scoring, document checklists and deadlines, is calculated by fixed rules that show their government source and review date, so the same file gives the same answer every time and you can defend it to a client, the College or a tribunal. Your AI team does the language work: it talks with you, chases and reads documents, drafts messages, and runs the rules for you when you ask. Everything it does is labelled as AI, shows where it came from, and waits for your approval."

**Why this is stronger than "rules under the flavour of AI" [I]:**
- It **still sells the AI experience.** The user does type "assess this client" to an AI teammate, which really does gather facts and run the rules (class 2). That is most of the "flavour" the founder wants, and it is true.
- It **turns the rules into the trust argument**, which is what this buyer says they need (94% grounding, 90% defensible reasoning [31]) and what the market leaders guarantee (TurboTax [19], Pega [21], Salesforce [22]).
- It **makes the rivals' weakness visible.** Rivals blur rules and AI and make absolute claims ([25][26][28][29]). We can say, truthfully, "ask any vendor which of their answers come from rules and which from AI".
- It **protects the licensee's declarations** (Federal Court, IRB) and their own advertising duty (Code s. 44(2)(a)) [18].
- It **survives due diligence.** An investor's technical reviewer, like an FTC technologist [9], will look under the hood. A story that matches the code survives; a "flavour" does not.

**Wording note.** "You stay the decision maker" and "Make judgment calls, not hires" are VisaFlo's lines [29]; README §5 forbids reusing competitor wording, so "You decide" stands alone and the story leads with rules, which VisaFlo does not.

### 4. How this supports a multi-million-dollar path

All figures are **Assumptions** unless cited.

| Element | Recommendation | Basis |
|---|---|---|
| **Who buys first (ICP)** | Owners of 1 to 5 person CICC-licensed practices, mostly Express Entry and PNP files, in Ontario, BC and Alberta | `plan.md` v1.1 §2 (unchanged) |
| **Wedge** | The connected record plus **assessments the consultant can explain and defend** as the switching reason; the File Builder as the first paid AI duty; deadline watching free, never called AI | `plan.md` §2; AIW-D37; `price-card.md` page 1 |
| **Why the honest story is the wedge** | Rivals sell AI; few sell defensible rules with sources (`ai-coverage-vs-competitors-2026-10.md` §1 item 3) | [I] |
| **Pricing** | Rules and pack upkeep in the subscription (per firm or per seat, still open: `plan.md` §8 action 3); AI per approved prepared file or as an allowance (AIW-D60); platform AIs never sold (AIW-D61) | §(b)4 market pattern |
| **Proof** | (1) Rule cards with source, date and two approvers; (2) same-answer replay with pack version; (3) per-skill test results; later (4) rules tested before publishing | `ai-moat-and-positioning-2026-10.md` §4.3; P2 |
| **Expansion** | More AI duties per file; Practice Pack; more destination Country Packs (FD-22, as cited in the moat file §3.4); immigration lawyers as a second segment (size **Unknown**) | [I] |

**Illustrative revenue arithmetic (Assumption, not a forecast).** At the plan's Practice default of CAD 229 a firm a month plus ten prepared files at CAD 30 (the midpoint in `price-card.md` page 2, option a), a firm pays about CAD 529 a month, or about CAD 6,350 a year.
- 150 firms: about CAD 0.95 million a year.
- 500 firms: about CAD 3.2 million a year.
- 1,000 firms: about CAD 6.3 million a year.

Canada has about 12,500 licensed consultants and student advisers, and an estimated 3,900 to 7,800 practices (`plan.md` §2, the practice count is **Unknown**). So 500 firms is roughly 6 to 13% of practices, and 1,000 firms is 13 to 26%. Reaching CAD 5 million or more a year in Canada alone therefore needs a large share of a small market, or a second segment (lawyers) or a second country. The plan's own experiment expects about 12 founding firms at launch and 4 to 5 new firms a month after (`plan.md` §4). At that pace 500 firms is roughly nine years away ((500 − 12) ÷ 4.5 ≈ 108 months, with no firm leaving); the multi-million path needs either a much faster sales engine or higher revenue per firm from the AI layer, which only measured time saved can justify [I].

**What actually makes it multi-million [I].** Not the AI label. It is (1) winning the firm's records, so the AI has something to work on and switching is costly (moat file §1.3); (2) a per-file AI price that tracks caseload, so revenue grows with the firm's work, not its headcount; (3) proof numbers rivals cannot show; (4) spreading pack upkeep across more firms than any rival (moat file §3.2).

### 5. What to test in the ten conversations (Proposal for the validation script)

Add one question to `../commercial/validation-script.md` after the hours question, before the price card: show two versions of the same screen, (A) "AI eligibility assessment" and (B) "Assessment calculated from the Express Entry rules, pack v3, gathered by your AI teammate", and ask: "Which would you trust with a client's file, and which would you be comfortable mentioning on your own website?" Record which they pick and why. This is the only way to replace the consumer study [32] and the vendor surveys [31] with evidence from our own buyer.

### 6. Proposals for the Lead (for `../proposals.md`; this file edits nothing else)

| # | Type | Proposal |
|---|---|---|
| Q1 | Decision (for the founder) | Replace "rules under the flavour of AI" with the four-class naming in §(c)1 and the headline in §(c)3. Reason: §(b)1 legal exposure (Competition Act, FTC, SEC, Code s. 44) and §(b)2 market evidence. It follows the founder's own earlier choices for the deadline watch and Practice answers (AIW-D37, AIW-D90). |
| Q2 | Rule | Every output carries its class label; verbs follow the class; "AI team" covers classes 2 and 3 only (§(c)1 rules 1 to 3). Add to README §0 next to rule 9. |
| Q3 | Rule | The phrase table in §(c)2 joins the one in `ai-in-regulated-work-2026-10.md` §7 as the single say / never-say list; counsel reads it before any website, deck or sales sheet uses it (AIW-D68). |
| Q4 | Plan | Add the A/B naming question (§(c)5) to the validation script before the ten conversations. |
| Q5 | Plan | Investor material uses only the investor line in §(c)2 and states the automation share only once measured (SEC cases [13][14]). |
| Q6 | Question for counsel | Is labelling a rules-computed result "AI-assisted" a material misrepresentation to a licensed buyer under s. 74.01(1)(a) and s. 74.03(5)? Does a licensee who repeats a vendor's AI claim on their own website breach Code s. 44(2)(a)? |

---

## (d) What not to do

1. **Do not call the assessment, scoring, checklists, deadlines or Practice answers "AI"** anywhere: website, deck, demo, screen, contract, investor update. It is the defined form of AI washing [5], and it contradicts FD-16, AIW-D37 and AIW-D90.
2. **Do not use "AI" as an umbrella brand** over rules and AI together ("Expat Ready AI", "AI-native platform").
3. **Do not let the conversational AI give an eligibility verdict to a prospective client or the public**, even if the rules computed it. Code s. 38(3) [18]; our own design keeps eligibility away from leads.
4. **Do not make performance claims before the test exists:** "accurate", "error-free", "always current", "verified", any percentage or any hours saved (s. 74.01(1)(b) [1]; Bureau [3]; FTC Workado [10]).
5. **Do not quote an automation rate or "AI does X% of the work" to investors** until it is measured on real files (Nate [14]; Presto [14]; Builder.ai [15]).
6. **Do not copy rivals' lines or absolute claims** ("eliminate errors", success rates, "You stay the decision maker"). README §5; [25][26][29].
7. **Do not hide AI inside "smart" or "automated" wording** to avoid disclosure. The opposite mislabel is just as harmful: licensees may under-declare to the Federal Court or the IRB.
8. **Do not say "deterministic", "neuro-symbolic" or "hybrid reasoning" to consultants.** Say "same facts, same answer, every time, with the rule and its source".
9. **Do not price "accuracy", "rules" or "Canada"** as AI extras. They are reasons to trust the subscription (moat file §4.5 item 5).
10. **Do not publish any of this wording** before counsel reads it and the founder says yes (README §5).

---

## (e) Sources

All web sources accessed **12 Oct 2026**. Labels as defined at the top.

**Canada: law and regulator**
1. Justice Laws, *Competition Act* (R.S.C. 1985, c. C-34), Part VII.1, ss. 70 to 74.02 (current to 21 Sep 2026). https://laws-lois.justice.gc.ca/eng/acts/c-34/page-11.html [V]
2. Justice Laws, *Competition Act*, ss. 74.03 to 74.1 (s. 74.03(5) general impression; s. 74.1(1)(c) penalties). https://laws-lois.justice.gc.ca/eng/acts/c-34/page-12.html [V]
3. Competition Bureau, deputy commissioner for deceptive marketing practices, guest post "Decoding rules for online reviews, influencer marketing and AI deceptive marketing claims", Canadian Marketing Association, 31 May 2023. https://thecma.ca/topic/articles/2023/05/31/decoding-rules-for-online-reviews-influencer-marketing-and-ai-deceptive-marketing-claims [V, the Bureau's own words; older than 2025, kept because it is the Bureau's only located statement on AI claims]
4. Canadian Marketing Association, *AI Playbook 14: AI Washing*, July 2025. https://thecma.ca/docs/default-source/default-document-library/CMA-AI-Playbook_AI-Washing.pdf [S]
5. BCF, "Artificial intelligence or artificial claims? AI washing: the risk your company may be overlooking", 10 Apr 2026. https://www.bcf.ca/en/thought-leadership/case-studies/artificial-intelligence-or-artificial-claims-ai-washing-the-risk-your-company-may/ [S]
6. Fasken, "New private rights of action have come into force", Jun 2025. https://www.fasken.com/en/knowledge/2025/06/new-private-rights-of-action-have-come-into-force [S]
7. Competition Bureau, "Consultation on Artificial Intelligence and Competition: What We Heard" (via search summary and Baker McKenzie). https://competition-bureau.canada.ca/en/how-we-foster-competition/education-and-outreach/consultation-artificial-intelligence-and-competition-what-we-heard [S]

**United States: FTC, SEC, self-regulation**
8. US Federal Trade Commission, press release, "FTC Announces Crackdown on Deceptive AI Claims and Schemes", 25 Sep 2024. https://www.ftc.gov/news-events/news/press-releases/2024/09/ftc-announces-crackdown-deceptive-ai-claims-schemes [V]
9. Kelley Drye, "FTC Reminds Advertisers to Keep AI Claims in Check", 9 Mar 2023 (summarising the FTC business blog of Feb 2023; the FTC page returned 404). https://www.kelleydrye.com/viewpoints/blogs/ad-law-access/ftc-reminds-advertisers-to-keep-ai-claims-in-check [S]
10. Benesch, "One Year In, FTC's 'Operation AI Comply' Continues Under New Administration". https://www.beneschlaw.com/insight/one-year-in-ftcs-operation-ai-comply-continues-under-new-administration-signaling-enduring-enforcement-focus/ [S]
11. PYMNTS, "FTC Seeks to Ban Air AI From Marketing Business Opportunities", Mar 2026. https://www.pymnts.com/legal/2026/ftc-seeks-to-ban-air-ai-from-marketing-business-opportunities/ [S]
12. Federal Register, "Policy Statement Concerning the Suppression of Accuracy in Artificial Intelligence Systems", 7 Jul 2026 (page blocked our reader; via search summary and Consumer Finance Monitor, 14 Jul 2026). https://www.federalregister.gov/documents/2026/07/07/2026-13628/policy-statement-concerning-the-suppression-of-accuracy-in-artificial-intelligence-systems [S]
13. US Securities and Exchange Commission, press release 2024-36, Delphia and Global Predictions, 18 Mar 2024. https://www.sec.gov/newsroom/press-releases/2024-36 [V]
14. DLA Piper, "DOJ and SEC send warning on 'AI washing' with charges against technology startup founder", Apr 2025; Holland & Knight, "SEC and DOJ Warm Up to Enforcement over AI Washing", Jul 2025 (Presto). https://www.dlapiper.com/en/insights/publications/2025/04/doj-and-sec-send-warning-against-ai-washing-with-charges-against-technology-startup-founder ; https://www.hklaw.com/en/insights/publications/2025/07/sec-and-doj-warm-up-to-enforcement-over-ai-washing [S]
15. eWeek, "700 Engineers – Not AI – Developed Code at $1.5B Disruptor Filing Bankruptcy", 2025. https://www.eweek.com/news/builderai-bankruptcy-ai-developers-coding/ [S, allegations]
16. Debevoise & Plimpton, "AI Washing: The Latest False Advertising Battleground", May 2026. https://www.debevoise.com/insights/publications/2026/05/ai-washing [S]
17. Kelley Drye, "NAD Examines AI Claims"; National Law Review, "NAD Signals Increased Scrutiny of AI Advertising Claims". https://www.kelleydrye.com/viewpoints/blogs/ad-law-access/nad-examines-ai-claims ; https://natlawreview.com/article/nad-signals-increased-scrutiny-ai-advertising-claims [S]

**The licensee's code**
18. Justice Laws, *College of Immigration and Citizenship Consultants Code of Professional Conduct* (SOR/2022-128), ss. 19(2)(e), 38(2), 38(3), 44(2). https://laws-lois.justice.gc.ca/eng/regulations/SOR-2022-128/FullText.html [V]

**How products are marketed**
19. TurboTax, "Guarantees" page. https://turbotax.intuit.com/corp/guarantees/ [VC]
20. TurboTax online product page (Intuit Assist wording, via search summary). https://turbotax.intuit.com/personal-taxes/online/ [VC]
21. Pega blog, "Beyond the black box: Why your enterprise needs predictable AI agents", 8 Dec 2025. https://www.pega.com/node/458106 [VC]
22. Salesforce Engineering, "Agentforce's Agent Graph: Toward Guided Determinism with Hybrid Reasoning" (Oct, year not shown; image path suggests 2025). https://engineering.salesforce.com/agentforces-agent-graph-toward-guided-determinism-with-hybrid-reasoning/ [VC]
23. Salesforce Developers blog, "Intro to Agent Script Language Fundamentals", Feb 2026 (via search summary). https://developer.salesforce.com/blogs/2026/02/agent-script-decoded-intro-to-agent-script-language-fundamentals [VC]
24. Ramp, "Ramp agents" announcement, 9 Jul 2025; Ramp support, "Policy Agent Overview" (via search summaries). https://ramp.com/blog/ramp-agents-announcement ; https://support.ramp.com/hc/en-us/articles/44072387128979-Policy-Agent-Overview [VC]
25. Docketwise homepage. https://www.docketwise.com/ [VC]
26. Boundless homepage. https://www.boundless.com/ [VC]
27. Alma homepage. https://www.tryalma.com/ [VC]
28. Visto homepage. https://visto.ai/ [VC]
29. VisaFlo homepage. https://visaflo.ca/ [VC]
30. Bloomberg Law, "Lemonade's Use of AI to Study Claims Brings Uproar After Tweet", May 2021; Fortune, 26 May 2021. https://news.bloomberglaw.com/insurance/lemonades-use-of-ai-to-study-claims-brings-uproar-after-tweet ; https://www.fortune.com/2021/05/26/lemonade-insurance-ai-face-scanning-fraud [S; older than 2025, kept as the cautionary case]

**What buyers say**
31. Thomson Reuters Institute, *Future of Professionals Report 2026* (1,816 professionals, 62 countries, fieldwork Mar to Apr 2026). https://www.thomsonreuters.com/en/institute/future-of-professionals-2026/report [Survey, vendor-run]
32. Washington State University news, "Using the term 'artificial intelligence' in product descriptions reduces purchase intentions", 30 Jul 2024 (study in *Journal of Hospitality Marketing & Management*; paper itself not read). https://news.wsu.edu/?p=244668 [S; consumer study, older than 2025]
33. *Canadian Lawyer*, "Solos and small firms lag with AI adoption: Clio report" (2025 Legal Trends). https://canadianlawyermag.com/news/general/solos-and-small-firms-lag-with-ai-adoption-clio-report/392441 [S, Survey]

**Pricing**
34. Salesforce, "Agentforce Pricing" (via search summary of the page). https://www.salesforce.com/agentforce/pricing/ [VC]
35. Intercom, pricing page (Fin "$0.99 per outcome"). https://www.intercom.com/pricing [VC]
36. Redress Compliance, "Why Now Assist Pricing Is So Hard to Pin Down". https://redresscompliance.com/servicenow-now-assist-ai-pricing.html [S, buyer-side consultancy]
37. Vaquill, "Harvey, Legora, CoCounsel pricing reality 2026"; CostBench, CoCounsel pricing. https://www.vaquill.ai/blog/harvey-legora-cocounsel-pricing-reality-2026 ; https://costbench.com/software/ai-legal-tools/cocounsel [S]
38. EvenUp press release, "AI Drafts suite ... and case-based pricing", May 2025 (via Silicon UK). https://www.silicon.co.uk/press-release/evenup-launches-ai-drafts-suite-smart-workflows-medical-bill-summary-and-case-based-pricing-to-redefine-legal-automation-for-personal-injury-firms [VC]
39. Kintsugi, "Avalara Pricing in 2026". https://trykintsugi.com/blog/avalara-pricing [S]
40. AI Tools Bakery, "Clio Pricing (2026)". https://aitoolsbakery.com/blog/clio-pricing-2026/ [S]

**Expat Ready (files; product facts via the newest snapshot `sources/drive-snapshot-2026-10-11/` as cited in the files named)**
- `ai-workers/decisions.md`: AIW-D13, D26, D37, D52, D60, D61, D63, D68, D74, D83 to D85, D89 to D91.
- `commercial/plan.md` v1.1 (8 Oct 2026): §2 ("Assessments the consultant can explain and defend ... AI does not decide (FD-16)"), §3, §4, §8.
- `ai-workers/commercial/price-card.md` pages 1 to 3.
- `ai-workers/research/ai-moat-and-positioning-2026-10.md` §1.3, §2.1 to §2.3, §3.2 to §3.4, §4.3 to §4.5, §7 (citing AG-03 v1.4 AG-3-39; SA-01B v1.2 SA1B-D18, SA-1B-39, SA-1B-40; SA-01 v2.2 SA1-D6; AG-11 v1.12 AG-11-72; AW-01 v0.6 AW-1-23; Founder Decisions Log v1.5 FD-22).
- `ai-workers/research/ai-in-regulated-work-2026-10.md` §2.1, §2.4, §7.
- `ai-workers/research/ai-coverage-vs-competitors-2026-10.md` §1, §2.1, §2.2.
- `ai-workers/research/visaflo.md` §3.1, §12.

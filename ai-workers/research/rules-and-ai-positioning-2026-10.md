# Rules and AI: how to name, sell and price them honestly (founder ask, 12 Oct 2026)

**Date:** 12 Oct 2026, revised the same day after review R3 (`../checks/review-R3-2026-10-12.md`) with the Lead's rulings, and after re-check R3-b (`../checks/review-R3-b-2026-10-12.md` §5, fixes 1 to 8). **Updated 13 Oct 2026 after re-check R10-b** (n12, m15: two say/never-say rows merged from the pricing file §5; the Lead's note K12: summary point 7, the class 2 and class 4 rows, the old "you run it" statement and the selling argument reworded to AIW-D96 and AIW-D117: the AI team starts the assessment once the evidence check passes, the rules calculate, a licensed person shares the result). **Author:** research maker for the Lead. **Status:** research input; nothing here is a decision. **Asked by:** the founder, through the Lead, 12 Oct 2026.

**The ask, as the Lead relayed it.** Build eligibility, scoring and assessments as fixed (deterministic) rules, but present them to buyers "under the flavour of AI" for easy selling; use real AI for conversation, follow-ups, language and tool calling; and give a framework that makes this a multi-million-dollar product.

**Builds on, and does not repeat:**
- `ai-moat-and-positioning-2026-10.md` ("the moat file"): the one-sentence pitch §4.1, the 30-second pitch §4.2, proof points §4.3, objections §4.4, pricing fit §4.5, "Why this AI is different" §5, proposals P1 to P5. **Those sections stay the one source for the pitch text;** this file adds only the class naming, the verb rule, new phrases, the legal line and new pricing evidence.
- `ai-in-regulated-work-2026-10.md` (DoNotPay §2.1; regulator guidance §2.4; the say / do-not-say table in §7);
- `ai-coverage-vs-competitors-2026-10.md` (§1, §2.1, §2.2); `visaflo.md` (§3.1, §12);
- `../commercial/price-card.md` and `../../commercial/plan.md` v1.1;
- the design as specified: AW-01 (document version 0.6) AW-1-88; `../requirements/change-notes/CN-AG-03.md` change 1; `../decisions.md` AIW-D11, D37, D40, D41, D60, D61, D89, D90; Founder Decisions Log v1.5 FD-16, FD-18, FD-20 (`sources/drive-snapshot-2026-10-11/`);
- the sibling maker file `../design/rules-ai-classification-2026-10-12.md` (rows A15, A18, A21), for consistency.

**Evidence labels.** **[V]** verified primary (statute, regulator, or the company's own legal page read directly). **[S]** secondary (law-firm note, press, third-party price tracker). **[VC]** vendor claim. **[Survey]** self-reported answers. **[I]** our inference. **Proposal / Assumption / Unknown** as in README §5. **Every legal reading in this file is the maker's or the Lead's, not legal advice: for counsel to confirm** (README §5; AIW-D68). Web sources accessed **12 Oct 2026**. No person is named (README rule 10).

**Plain-English glossary**
- **Deterministic / rules:** the same input always gives the same output, because a fixed rule written by a person computes it.
- **AI (in this file):** a large language model: software that reads and writes language and can be wrong in ways that vary from run to run.
- **Tool calling:** an AI asking another piece of software to compute something. *Note:* the team's specification today says "models SHALL have no tool access" (AG-11 v1.12, AG-11-94); our reading is that the platform fetches results and gives them to the AI as data [I].
- **AI washing:** claiming more or different AI than a product really has.
- **Substantiation:** the evidence a seller must hold *before* making a claim.
- **General impression:** under Canadian law, an advert is judged by the overall impression it leaves, not only its literal words.
- **Competition Tribunal:** the specialised federal court that hears Competition Act cases.

---

## (a) Summary for the founder (12 lines)

1. **Selling rules "under the flavour of AI" matches a published example of AI washing.** A Canadian law firm's 2026 note lists "presenting basic automation or rule-based software as AI" [5]; the Competition Bureau says AI claims are "treated the same as any other claims" and sellers should say what they mean by AI [3].
2. **The exposure is legal as well as reputational.** No Canadian case on AI claims was found, but the law (judged on "general impression"), penalties up to the greater of CAD 10 million and three times the benefit, and private access to the Tribunal all exist [1][2][42][43]. For counsel to confirm.
3. **US regulators act on false AI claims:** the FTC's "no AI exemption" sweep [8]; SEC orders against two advisers for false or misleading claims about their use of AI [13] and against a public company whose "AI" ordering needed human intervention for most orders [41]; criminal charges against one founder [14].
4. **Our buyers carry the risk too.** RCICs must not make "false, misleading or inaccurate representations" (Code s. 44(2)(a)) [18]. A wrong label also spoils the AI-use declarations they make to the Federal Court and the IRB.
5. **It would also sell worse.** Professionals' conditions for trusting AI are confidential data (96%), grounding in authoritative content (94%) and defensible reasoning (90%) [31]; one US study found the words "artificial intelligence" lowered purchase intent, most for high-risk purchases [32].
6. **Leaders do the opposite of "flavour":** TurboTax guarantees its *calculations* and calls its AI "guidance" [19][20]; Pega and Salesforce sell rules-based, deterministic steps as the reason to trust [21][22].
7. **The honest version, on today's design:** for leads, the Intake AI notices an assessment is missing or out of date and proposes the task to the lead's owner (AW-1-88; CN-AG-03 change 1); for clients, the File Builder prepares the file; ~~a person presses "Assess"~~ *(updated 13 Oct 2026, AIW-D96, AIW-D117, the AIW-D106 note (a): the AI team starts the assessment once the evidence check passes)*; the rules give the exact answer with every factor shown (AG-3-21). That keeps visible AI legwork without claiming the AI assessed anyone. *Proposal, not approved:* the AI explaining that stored result to staff (sibling file row A21).
8. **Letting the AI run the assessment when asked would be a new founder decision** (it reopens AIW-D40), and "tool calling" by the model conflicts with the team's AG-11-94.
9. **The four classes:** rules only (never called AI); AI working with rule results; AI language work; person only. Each has its own label, verbs and pricing.
10. **FD-16 already allows "AI-assisted" in marketing.** This framework is stricter for assessments; that narrowing is part of your decision Q1, not settled.
11. **Money (Assumption):** at about 10 prepared files per firm a month, revenue per firm is about CAD 1,900 to 6,350 a year depending on the pricing option and the founding discount; 500 firms is about CAD 1.1 to 3.2 million a year; the plan's own model reaches about 68 firms by March 2028.
12. **Decisions needed:** Q1 (replace "flavour" with the four classes, and narrow FD-16's "AI-assisted" for assessments); the headline choice; counsel reads the phrase list before anything is published.

---

## (b) Findings

### 1. The legal line on calling rules "AI" (all readings for counsel to confirm)

#### 1.1 Canada: the Competition Act

| What | Exact words or fact | Label |
|---|---|---|
| The general ban (civil, reviewable) | "a representation to the public that is false or misleading in a material respect" (s. 74.01(1)(a)) [1] | [V] |
| Performance claims need a test first | A statement of "the performance, efficacy or length of life of a product that is not based on an adequate and proper test thereof, the proof of which lies on the person making the representation" (s. 74.01(1)(b)) [1] | [V] |
| Judged by overall impression | "the general impression conveyed by a representation as well as its literal meaning shall be taken into account" (s. 74.03(5), for ss. 74.01 and 74.02) [2] | [V] |
| Penalty for a company | Up to the greater of "$10,000,000 and, for each subsequent order, $15,000,000" and "three times the value of the benefit derived from the deceptive conduct", or, if the benefit cannot be determined, "3% of the corporation's annual worldwide gross revenues" (s. 74.1(1)(c)(ii)) [2]. Act current to 21 Sep 2026 [1]. | [V] |
| Private applications to the Tribunal | The Tribunal "may grant leave to make an application under section 74.1" … "if it is satisfied that it is in the public interest to do so" (s. 103.1(6.1)) [43]. The Bureau: a private applicant can obtain the remedies the Bureau could seek (stopping the conduct, a corrective notice, a penalty paid to the government) and "in limited circumstances … that purchasers of affected products get their money back", the refund applying to s. 74.01(1)(a) only [42]. In force from 20 Jun 2025 per Fasken [6]: **date not re-verified on 12 Oct** (Fasken returned 403; the Bureau's page gives no date). | [V] for leave and remedies; date [S], unverified |
| The Bureau on AI claims | The Bureau's deputy commissioner for deceptive marketing (31 May 2023): "Claims that promote AI related abilities are treated the same as any other claims"; because AI has no standard definition, advertisers should explain what they mean; performance claims need "adequate and proper testing" before the claim [3] | [V] (the Bureau's own words, published by the Canadian Marketing Association) |
| Same message repeated | The CMA's July 2025 playbook repeats the Bureau's position; red flags include "lack of transparency about human involvement, and the absence of verifiable performance data" [4] | [S] |
| One Canadian law firm's note | "AI washing occurs when claims exaggerate or misrepresent the implication of AI in a product or service", with the example "presenting basic automation or rule-based software as AI"; Quebec's Consumer Protection Act s. 219 also bans deceptive representations (BCF, 10 Apr 2026) [5]. This is commentary, not a legal definition. | [S] |
| Enforcement so far | No Competition Bureau case or consent agreement about an AI capability claim found up to 12 Oct 2026 [I, from searches]; whether any investigation is open is **Unknown**. | [I] |

**Would calling rules "AI" be "material" for our buyer? (Maker's reading, for counsel to confirm.)** It may well be. For a licensed consultant, how an eligibility result is produced changes what they must check, what they declare to the Federal Court and the IRB (`ai-in-regulated-work-2026-10.md` §2.4) and how they explain the result to a client. No case decides this; it is counsel question Q6 below.

#### 1.2 United States: FTC, SEC and the advertising self-regulator

| Body and case | What happened | Lesson for us | Label |
|---|---|---|---|
| **FTC, "Operation AI Comply"** (25 Sep 2024) | Five actions, including DoNotPay ("world's first robot lawyer"; no testing against lawyers; US$193,000 and a ban on unsupported claims of substituting for professional services). The FTC Chair at the time: "there is no AI exemption from the laws on the books." [8] | AI claims need the same proof as any other claim; the legal-services case is the closest to ours. | [V] |
| **FTC guidance, "Keep your AI claims in check"** (Feb 2023) | Asks "Does the product actually use AI at all?"; FTC technologists "can look under the hood"; separates "using an AI tool to develop the product" from AI in the product [9] | Exactly the founder's question: a regulator can inspect what computes the result. | [S] (FTC page returned 404; quotes via a law firm) |
| **FTC follow-on cases, 2025 to 2026** | Workado: AI-detector "98%" accuracy claimed, about 53% alleged; an order barring unsupported accuracy claims announced 2025 (the source calls it a proposed order) [10]. Click Profit: "AI-powered" storefront claims; ban and suspended judgments [10]. Air AI: claimed its AI could replace human customer service representatives; a **proposed** order, subject to court approval, announced 24 Mar 2026, with a business-opportunity ban and a largely suspended US$18 million judgment [11] | Accuracy and "replaces a person" claims draw action. | [S] |
| **FTC proposed policy statement on AI accuracy** (comment sought from 1 Jul 2026) | AI firms that "steer the outputs of their AI systems toward unexpected objectives" are likely to deceive consumers [12] | Proposal only. | [S] |
| **SEC, Delphia and Global Predictions** (18 Mar 2024) | Delphia claimed AI and machine learning on client data it did not have (US$225,000); Global Predictions called itself the "first regulated AI financial advisor" (US$175,000). "Such AI washing hurts investors." [13] | Investor material is covered: false or misleading claims about the use of AI. | [V] |
| **SEC, Presto Automation** (14 Jan 2025) | Presto Voice's speech recognition "was owned and operated by a third party", undisclosed; "the vast majority of drive-thru orders … required human intervention"; no civil penalty [41] | Hidden non-AI work behind an "AI" label is the target. | [V] |
| **SEC and DOJ, Nate founder** (9 Apr 2025) | Automation "above 90 percent" claimed; "essentially zero" alleged; about US$42 million raised; parallel criminal charges [14] | Founders can be personally charged for AI claims to investors. | [S] |
| **Builder.ai** (insolvent May 2025) | Reports say about 700 engineers did work marketed as AI; revenue reportedly overstated [15] | The reputational end state of "flavour of AI". | [S], allegations |
| **Advertising self-regulator (NAD)** | A baby monitor's "AI-powered" claim was found *supported* because it had real AI detection; its claim to "ensure" safety was not [17]. Counsel note NAD has asked advertisers to fix claims about whether "smart" features were properly described as AI [16]. | "AI-powered" is fine when true of the feature named; outcome promises are the problem. | [S] |

#### 1.3 The licensee's side: CICC Code of Professional Conduct (SOR/2022-128)

| Section | Exact words [18] | Maker's reading (confirm with counsel / RCIC) |
|---|---|---|
| s. 44(2)(a), (b) | Must not "make false, misleading or inaccurate representations" or "guarantee the success of an application, expression of interest or proceeding" | If a consultant repeats a vendor's "AI eligibility assessment" line to clients, the consultant makes the representation. |
| s. 38(2) | "must supervise and assume professional responsibility for any work done by a person who assists"; supervision "adequate for the type of work in question" | Adequate supervision depends on knowing what produced an output; a wrong label invites the wrong kind of checking. |
| s. 38(3) | Non-licensees must not "provide representation or advice" contrary to IRPA s. 91 | The section speaks of *persons*; applying it to software is our reading (the same one as `ai-in-regulated-work-2026-10.md` §7). The design already keeps AI away from applicants and keeps eligibility away from leads: AIW-D11 ("No applicant-facing AI Workers") and AIW-D41 ("No eligibility content … in any automatic or AI-drafted message to a lead"). |
| s. 22(2) | Must ensure documents are "properly prepared, signed and submitted" | Signing and submitting sit with the licensee in our class 4; whether the section reserves the acts themselves is for counsel. |
| s. 19(2)(e) | Deliver services "using technology that is appropriate and effective" | Judging that needs truthful information about the tool. |

The CICC has published no AI guidance (`ai-in-regulated-work-2026-10.md` §2.4; a new search on 12 Oct found none) [I].

**Two knock-on effects of a wrong label [I]:**
- **Court and tribunal declarations.** The Federal Court and the IRB require a declaration when AI produced content (`ai-in-regulated-work-2026-10.md` §2.4). Rules labelled "AI" invite over-declaring; AI hidden as "smart rules" invites under-declaring, which the IRB can report to the regulator. The per-file AI record (AW-1-23) is only worth something if labels are true.
- **Automated decisions.** FD-20 (Founder Decisions Log v1.5, line 56) already gives every assessment "an `isAutomatedDecision` flag, an immutable **factor snapshot** … a client-facing plain-language explanation" because of Quebec Law 25 s. 12.1. That duty follows automated processing whether rules or AI; a label changes nothing but the confusion.

#### 1.4 How each statement reads against today's design

Today's design (cited, not restated): a person runs the assessment ("The assistant SHALL NOT run the eligibility assessment … the run is the person's own act", AW-1-88; CN-AG-03 change 1; AIW-D40); the rules compute it (AG-03 v1.4 AG-3-39); each result carries "a structured, labelled breakdown (factor → points …)" (AG-3-21); models have "no tool access" (AG-11-94).

| Statement | Our reading, for counsel | Why [I] |
|---|---|---|
| ~~"For your leads, the Intake AI tells you when an assessment is due; you run it; the rules give the answer, factor by factor."~~ | ~~Accurate to the design~~ **Superseded by AIW-D96 (13 Oct 2026 update):** use the §(c)2 line "your Intake AI starts the assessment; the rules calculate every result; a licensed person shares the result" | AW-1-88 superseded; AW-1-131 |
| "Scores come from the rules, not the AI: same facts, same answer." | Accurate once AG-3-39 is built | A demonstrable property (moat file §4.3, proof point 2). |
| "AI-assisted assessment" | Allowed by FD-16; **this framework proposes not using it for assessments** (Q1) | Literally true when the AI prepared the file; the general impression is that AI computed the result. |
| "Ask the AI to assess this client" / "the AI runs the assessment for you" | **Not true today** | Contradicts AW-1-88 and AIW-D40; true only if the founder reopens AIW-D40 (§(c)3). |
| "AI-powered eligibility assessment", "AI scoring", "our AI assesses eligibility" | Likely misleading | General impression of a model deciding; FD-16: "it may not say the AI decides". |
| "AI that never makes mistakes on scoring" | Likely misleading | The AI does not score; "never" needs a test (s. 74.01(1)(b)); pack rules are not tested today (SA1B-D18). |
| "Built with AI" about the rules | Likely misleading | FTC separates building with AI from AI in the product [9]. |
| "Expat Ready AI" as an umbrella brand | Risky | Implies rules and the deadline watch are AI, against AIW-D37 ("described as the product's deadline watching, never as AI") and AIW-D90 ("a product feature, not an AI teammate"). |

### 2. How best-in-class products market a fixed core with an AI layer

| Product | What they lead with | How the fixed part is described | How the AI is described | Label |
|---|---|---|---|---|
| **TurboTax (Intuit)** | Outcome and guarantee | "100% Accurate Calculations Guarantee" for "a TurboTax calculation error"; separate expert guarantees; **no guarantee mentions AI or Intuit Assist** [19] | "AI-powered guidance from Intuit Assist" [20] | [VC] |
| **Pega** | "Predictable AI agents" | "Critical steps – like risk scoring – are executed by rules-based automation for 100% accuracy" (8 Dec 2025) [21]; agents are kept inside defined workflows (paraphrase) | Used for judgement inside the workflow (paraphrase) | [VC] |
| **Salesforce Agentforce** | Reliable agents | "a graph runtime that marries LLM intelligence with deterministic control"; "LLM reasoning alone cannot carry enterprise load" [22]; Agent Script mixes fixed logic with prompts [23] | "Hybrid reasoning" | [VC] |
| **Avalara** | Compliance done | "AI-curated, human-verified tax rules and rates" (moat file §2.1) | "Avi" with human checkpoints | [VC] |
| **Thomson Reuters CoCounsel** | Grounded professional AI | "grounded in Westlaw and Practical Law content" (moat file §2.1) | Research with citations | [VC] |
| **Ramp** | Finance agents | Applies "your written expense policy" and cites "the exact policy text"; starts "in review-only mode" [24] | Agents with "a clear audit trail for every decision"; claims 99% accuracy | [VC] |
| **Docketwise** | "Spend 75% less time on admin" | "Smart" forms from a questionnaire | AI that "captures data to eliminate errors" [25]; rules and AI not separated | [VC] |
| **Boundless** | Journey, success rate | "smart technology with human expertise"; "99.7%" [26] | Not separated | [VC] |
| **Alma** | "Hire the best talent. We'll handle immigration." | "attorney-led execution with structured workflows" | **Homepage does not mention AI** [27] | [VC] |
| **Visto** | Speed | "advanced automation and AI technology" | "An AI chatbot trained exclusively on IRCC info" [28] | [VC] |
| **VisaFlo** | "Make judgment calls, not hires." | "built into the product, not written in a policy doc"; never says "deterministic" | "friendly AI agents"; "Agents draft; you release, sign and file" [29] | [VC] |
| **Immicase** | AI add-on | *"Deterministic — no AI inference"* for form filling (`ai-coverage-vs-competitors-2026-10.md` §2.1) | Separate AI assistants | [VC] |
| **Lemonade, cautionary** | "AI" as the brand | — | 2021: claimed its AI read "non-verbal cues"; deleted after backlash, called "poorly worded" [30] | [S] |

**Pattern [I].** (1) Regulated-work leaders do not call the rules "AI"; they put the guarantee on the rules and name AI for language work. (2) Enterprise vendors now sell determinism as a headline. (3) Immigration players blur rules and AI and make absolute claims; precision is open ground for us. (4) One AI-native immigration firm does not mention AI at all. (5) Over-claiming AI has backfired [15][30].

**Which framing wins?**
- Thomson Reuters *Future of Professionals 2026* (fieldwork Mar to Apr 2026; our page reader read 1,816 professionals in 62 countries, which the checker could not confirm on the page): minimum conditions for trustworthy professional AI are confidential data (96%), grounding in authoritative content (94%) and explainable, defensible reasoning (90%); 47% say the individual professional bears final responsibility for an AI-assisted error [31] [Survey, vendor-run]. The moat file's "more than 1,500 professionals" (§2.3) is cited there to a different publication, its source [28], Thomson Reuters Institute's *2026 AI in Professional Services Report* (7 Apr 2026); whether the two draw on the same respondents is **Unknown**.
- LexisNexis 2026: 81% prefer AI grounded in legal sources (moat file §2.3) [Survey].
- Adding "artificial intelligence" to product descriptions lowered purchase intent in experiments with more than 1,000 US adults, more for high-risk products; "Focus on describing the features or benefits and avoid the AI buzzwords" (WSU, 30 Jul 2024) [32] [S; consumers, not professionals].
- Clio 2025: 79% of legal professionals use AI in some form; small firms lag [33] [S].
- Immigration consultants specifically: **Unknown**; test it in the ten conversations (§(c)5).

### 3. Buyer trust

| Need | Evidence | Design, cited |
|---|---|---|
| Grounded output | 94% [31] | SA-1B-39 sources and review dates; AIW-D83 driving tests |
| Defensible reasoning | 90% [31] | AG-3-21 factor breakdown; FD-20 factor snapshot; AIW-D85 detail drawer |
| Confidentiality | 96% [31] | AIW-D52, D74 Canada-only gate |
| Clear responsibility | 47% [31]; Code s. 38(2) [18] | AIW-D13, D26 named approver |
| Audit trail | Ramp sells it [24] | AG-11-72; AW-1-23 |
| Proof before claims | Bureau [3] | Moat file P3 |

**Is "rules-verified" a selling point? [I]** Determinism is, in plain words ("same facts, same answer, with the rule and its source"). **"Rules-verified" is not yet honest:** pack rules are trusted on second-person approval alone (SA1B-D18). *This differs from the Lead's 12 Oct position (`NEXT.md`, "call them 'rules-verified'"); reason SA1B-D18.* Until rules are tested before publishing (moat file P2), say "rules reviewed by two people" (SA1-D6), and only once that review is built.

### 4. Pricing evidence (new; the pattern itself is the moat file §4.5 items 1 and 2)

| Model | Example and figure | Label |
|---|---|---|
| Per user AI add-on | Salesforce USD 125 a user a month [34]; Clio AI add-on reported USD 39 to 59, now quote-only [40]; Harvey reported about USD 1,200+ a seat [37]; CoCounsel reported USD 104 to 639 a user [37] | [VC] Salesforce; [S] others |
| AI gated to a higher tier | ServiceNow "Pro Plus", metered in "assists"; uplift reported 30 to 70% [36] | [S] |
| Per action or conversation | Salesforce about USD 0.10 an action; USD 2 a conversation, still listed [34] | [VC] |
| Per outcome | Intercom Fin "$0.99 per outcome" [35] | [VC] |
| Per case (legal) | EvenUp "all-in-one per-case pricing" (May 2025), prices unpublished [38] | [VC] |
| Volume of rule calculations | Avalara by transactions, states, modules [39] | [S] |
| Immigration niche | `price-card.md` page 2 (not restated) | [VC] |

This evidence supports, and does not change, the moat file §4.5 split (rules and upkeep in the subscription; AI on a unit of finished work). Which AI price shape is used is **not decided**: AIW-D60 decides only what the ten conversations test (option (a) per prepared file and option (b) an allowance, with (c) shown last). *Superseded 12 Oct 2026: the shape is decided as workflow pricing (AIW-D111, D114 to D116); the conversations were dropped (AIW-D94).*

---

## (c) Framework and recommendations

### 1. Four classes, each with one honest name (Proposal)

| Class | What it is | Examples (cited) | Call it | On-screen label | "AI"? | Priced in *(superseded 12 Oct 2026: workflow pricing, AIW-D111, D114 to D116; every plan includes the AI team with a prepared-file allowance and extra prepared files, one per application; see `../commercial/workflow-pricing-2026-10-12.md`)* |
|---|---|---|---|---|---|---|
| **1. Rules only** | Fixed rules compute; no model | Assessment and scoring (AG-3-39) with its factor breakdown (AG-3-21; FD-20); checklists; deadline watching (AIW-D37); Practice answers (AIW-D90) | "rules", "calculated", "checked against the rules" | "Calculated from Canada pack v[n], rules reviewed [date]" (once SA-1B-39 is built) | **No** | Subscription |
| **2. AI working with rule results** (the founder's "AI using rule tools") | The AI prepares and words; ~~the platform runs the rules on a person's act~~ *(updated 13 Oct 2026, AIW-D96, AIW-D117, the AIW-D106 note (a))* the AI may start the rules run once the evidence check passes, and the rules compute every result; the AI never computes a rule result | ~~For leads, the Intake AI proposing the assessment task to the lead's owner (AW-1-88; CN-AG-03 change 1);~~ For leads and clients, the Intake or Case Officer's AI starting the assessment once the evidence check passes; missing inputs run as an incomplete result with named gaps, conflicting or stale evidence stops it and flags a person (AW-1-131, AW-1-132; AIW-D96, AIW-D117, the AIW-D106 note (a)); for clients, preparing the file (File Builder). *Proposal, not approved:* the AI explaining a stored per-factor result to staff (sibling file row A21, which is being corrected to drop any unsaved preview run; such a run would also meet AG-11-94). | ~~"the AI prepares; you run it; the rules decide"~~ "the AI team starts it once the evidence check passes; the rules calculate; a licensed person shares the result" (AIW-D96; AIW-D41) | Two parts: "Prepared by [AI teammate] (approve)" and "Result: from the rules, pack v[n], ~~run by [person]~~ run by [AI teammate] for [person]" (AW-1-131(d)) | **Yes, for the preparing and wording only** | The plan's prepared-file allowance and extra prepared files (workflow pricing, AIW-D111, D114); other class 2 work rides in the plan |
| **3. AI language work** | A model reads or writes | Document reader, cross-checker, drafter (`ai-in-regulated-work-2026-10.md` §7) | "AI", "AI teammate", "AI draft" | "AI draft – check before use", source page shown (AW-1-23) | **Yes, always disclosed** | As class 2 |
| **4. Person only** | A person's act; advice and signing by a licensed person | ~~Running the assessment, a person's act under the `agent/assessment:run` permission (AW-1-88);~~ *(superseded by AIW-D96: the AI may start it, AW-1-131)* advice and sharing eligibility with a lead (AIW-D41) by a licensed person; signing and submitting by a licensed person (Code s. 22(2), reading for counsel) | "your decision", "approved by [role]" | "Approved by [named person], [date]" | **Never** | Not priced |

**Three rules (Proposal for `../proposals.md`, type Rule):**
1. **One label per output.** Every visible result carries its class label; a class 2 result shows both parts.
2. **Verbs follow the class.** Rules *calculate, check, list, count*. AI *reads, drafts, suggests, prepares, summarises* (and *explains [a stored result]* only if the A21 Proposal is approved). People *run [the assessment], decide, advise, approve, sign*. The AI never "assesses", "runs the assessment", "decides" or "advises".
3. **Umbrella names never cross classes.** "AI team" and "AI teammate" (AIW-D89) cover classes 2 and 3 only.

**FD-16 and this framework (part of Q1).** FD-16 (Founder Decisions Log v1.5, line 52): "**"AI assists, humans decide."** The eligibility/scoring/workflow engine stays fully deterministic, versioned and explainable — no model output is ever a decision … Marketing may say "AI-assisted"; it may not say the AI decides." This framework is **stricter** than FD-16: it proposes not using "AI-assisted" for assessments, because the general impression is that AI computed the result. Narrowing a ratified decision needs the founder's yes; it is put to him in Q1, not treated as settled.

### 2. New phrases (adds to `ai-in-regulated-work-2026-10.md` §7 and moat file §4.3, which still apply)

| Use (unconfirmed Lead guidance; no counsel, AIW-D94) | Never use | Why |
|---|---|---|
| "Scores and checklists are calculated by fixed rules. Your AI team prepares the file around them." | "AI-powered assessment", "AI eligibility check", "AI scoring" | General impression [2]; FD-16 "may not say the AI decides" |
| "When a lead's facts are ready and the evidence check passes, your Intake AI starts the assessment; the rules calculate every result and show every factor; a licensed person shares the result." | "Ask the AI to assess your client", "AI eligibility", "the AI decides eligibility" | AIW-D96 (amends AIW-D40), the AIW-D106 note (a), AIW-D41, AIW-D92. *Updated 12 Oct 2026; the earlier "you run it" wording (AW-1-88, AIW-D40) is superseded* |
| Only once built and true: "Every rule shows its government source and the date it was last checked." | "AI that always knows the latest rules" | SA-1B-39, SA-1B-40 not built (SA-01B §12) |
| Only once built and true: "Rules reviewed by two people before release." Later, once tested: "Rules tested against [N] client profiles before release." | "Rules verified", "AI-verified", "100% accurate" | SA1B-D18; Pega's "100% accuracy" is a vendor's own claim [21] |
| "We use AI for language: reading and drafting. We use rules where the answer must be exact." | "AI-native" (meaning "built around AI from the start") as a claim over the rules | Overall impression; investor risk [13][41] |
| Investor line: "AI does the language work; a maintained rules engine does the exact calculations; the AI team starts the assessment once the evidence check passes, the rules calculate, and a licensed person shares the result and approves (AIW-D96, AIW-D106 note)." | Any automation rate not measured; "our AI assesses eligibility" | [13][14][41]; moat file P3 |
| *Pricing rows, added 12 Oct 2026 (AIW-D111, D114; merged from `../commercial/workflow-pricing-2026-10-12.md` §5; Unconfirmed: no counsel, AIW-D94):* "Workflow pricing"; "your plan includes your AI team" | "AI price", "AI fee", "AI surcharge", "AI add-on" | AIW-D92, D111: the prepared file is mostly rules work (AW-1-71, AW-1-72), AI only in parts (AW-1-73); the AI team is in the plan |
| "Prepared files", "extra prepared files" | "AI files", "per AI file", "AI usage", "AI credits", "AI tokens", "pay per AI" | The unit is a finished piece of work (one per application, AIW-D114), not AI consumption |
| "Counted once per application, when your case officer accepts the readiness report" | "Pay per approval", "pay only for approved files" | Acceptance is the submission for internal review (AG-7-93), not a licensed approval or a government decision |
| "Retries, failures, our own errors and re-runs on the same application are never counted" | "Pay only for results", "pay only when it works", "pay for outcomes" | An accepted file is not a promise the file is correct or will succeed; an outcome claim needs an adequate test (Competition Act s. 74.01(1)(b), §(b)1.1) |
| "We warn you at 80 % and before your first extra file"; "included in your plan" | "Unlimited AI", "unlimited prepared files", "free AI" | There is an allowance; the AI team is paid for by the plan price |
| On the invoice: "Extra prepared files, [month]: n × CAD [price]" | "Overage fee", "AI usage charge", "penalty" | Plain words; "overage" stays an internal word |
| "Deadline watching is part of your plan" | Any price, allowance or count on deadline watching; "AI deadline watch" | Deadline watching is the product's own, never priced and never AI (AIW-D37); merged from the pricing file §5, review R10 m15 |
| Time saved or "faster" only once measured on our own records, with the measure named | "Saves X hours", "faster", "pays for itself" before measurement | Performance claims need an adequate test (Competition Act s. 74.01(1)(b), §(b)1.1); value map rule; merged from the pricing file §5, review R10 m15 |

### 3. Headline and the selling argument on today's design

**Headline (Proposal):** *"Rules you can defend. AI that does the legwork."*
Two alternatives for the founder: *"Exact where it must be. AI where it helps."* and *"Same facts, same answer. An AI team for the paperwork."* "You decide" is dropped (VisaFlo says "You decide what each agent may touch" and "You stay the decision maker" [29]; README §5). The headline is a tagline only; the pitch text stays in the moat file §4.1, §4.2 and §5, which already say scoring comes from rules, not AI.

**Why the honest version keeps much of the selling power [I]:**
- **The AI is visible and busy:** for leads, the Intake AI flags a missing or out-of-date assessment and proposes the task (AW-1-88); for clients, the File Builder chases and reads the documents and prepares the file. The consultant sees an AI team working.
- **The assessment is automatic and exact:** ~~a person presses "Assess"~~ *(updated 13 Oct 2026, AIW-D96, AIW-D117, the AIW-D106 note (a))* the AI team starts it once the evidence check passes (a person may still run it); the rules give the result, with gaps named where facts are missing and a licensed person sharing it; the result is instant, the same every time, and shows every factor (AG-3-21; FD-20). That is what this buyer says builds trust [31] and what leaders guarantee [19][21][22].
- **Rivals' blur becomes our point:** "ask any vendor which answers come from rules and which from AI" ([25][26][28]).
- **It protects licensees** (declarations; Code s. 44(2)(a)) and **survives due diligence** [9].
- **What it gives up:** the "ask the AI to assess" demo moment. That costs about one click and a less magical story; we judge it worth paying [I].

**A new founder decision, if wanted (one line):** whether the AI may *run* the assessment when a person asks would reopen AIW-D40 (framed "for the pilot") and change AW-1-88, CN-AG-03 change 1, test R-I4 and counsel question CQ6. It would also need the team to revisit AG-11-94 ("models SHALL have no tool access"), which is the team's subject, so we state the conflict and write no change note (README rule 11).

### 4. The multi-million path (all figures Assumption unless cited)

- **First buyer and reason to switch:** as in `plan.md` v1.1 §2 (not restated); the honest rules story strengthens its "assessments the consultant can explain and defend".
- **Proof:** moat file §4.3 proof points 1 to 3, then rules tested before publishing (moat file P2).
- **Expansion (Proposal, input to Step 5):** more AI duties per file, more Country Packs (FD-22), lawyers as a second segment (size **Unknown**).

*Superseded in part, 12 Oct 2026: pricing is workflow pricing (AIW-D111, D114 to D116), an allowance in every plan plus extra prepared files at a listed price, with discounts on the plan price only. Option (b) below is the chosen shape; option (a) was considered, not chosen. Every figure is illustrative only; allowances and prices are set from total cost to serve and measured benefit (`../commercial/workflow-pricing-2026-10-12.md` §4).*

**Revenue per firm.** **Assumption, no source: about 10 prepared files per firm per month.** Base plan Practice CAD 229 a firm a month (plan default; per seat vs per firm still open, FD-18 and `plan.md` §8 action 3). Extra-prepared-file price CAD 30 (the price card's illustrative figure inside its CAD 25 to 40 range; the midpoint would be 32.50).

| Per firm, per year | Option (a) per file (not chosen, AIW-D111): 229 + 10 × 30 = 529 a month | Option (b) allowance of 10 inside Practice (chosen shape, AIW-D111): 229 a month |
|---|---|---|
| List, monthly billing | about CAD 6,350 | about CAD 2,750 |
| Annual prepayment ("12 months for the price of 10", plan §3), applied to the plan only (Assumption) | about CAD 5,890 | about CAD 2,290 |
| Founding firm (first 50, "30% off list for 24 months", plan §3), applied to the plan only (Assumption), monthly billing | about CAD 5,520 | about CAD 1,920 |

Option (a), not chosen (AIW-D111), could not be sold under today's rules either: "Nothing is sold outside a plan: there are no add-on prices in Release 1" (SA-04 v2.14 SA-4-44, via `price-card.md` page 1); it needs SA-4-44 amended.

| Firms | Revenue a year: low end (b; first 50 firms at the founding rate, the rest prepaid) to high end (a, list) |
|---|---|
| About 68, the plan model's figure for March 2028 (`plan.md` §5, "live firms … about 68", revenue about 30% of costs); most would still be founding firms, discounted for 24 months from go-live (plan §3, §4) | about CAD 0.14 to 0.43 million (low end: 50 × 1,920 + 18 × 2,290) |
| 500 | about CAD 1.1 to 3.2 million |
| 1,000 | about CAD 2.3 to 6.3 million |

About 12,500 licensed consultants and student advisers were in good standing in June 2025; practices number perhaps 3,900 to 7,800 (**Unknown**) (`plan.md` §2). 500 firms is 6 to 13% of that range; 1,000 is 13 to 26%. At the plan's pace (about 12 founding firms, then 4 to 5 a month, `plan.md` §4) and with no firm leaving, 500 firms is about nine years away ((500 − 12) ÷ 4.5 ≈ 108 months). So "multi-million" needs a faster sales engine, the higher-priced option proven by measured time saved, or a second segment or country. The AI label does none of these [I]. What does drive the path is set out in the moat file and not restated here: winning the firm's records and the switching cost that follows (§1.3), and AI revenue that tracks caseload rather than seats (§4.5 item 2).

### 5. What to test in the ten conversations (Proposal)

Add to `../commercial/validation-script.md`, before the price card: show (A) "AI eligibility assessment" and (B) "Assessment calculated by the Express Entry rules, pack v3; file prepared by your AI teammate; run by you", and ask which they would trust with a client's file and which they would be comfortable describing on their own website.

### 6. Proposals for the Lead (for `../proposals.md`; this file edits nothing else)

| # | Type | Proposal |
|---|---|---|
| Q1 | Decision (founder) | Replace "rules under the flavour of AI" with the four classes (§(c)1), **and** narrow FD-16's "Marketing may say 'AI-assisted'" so it is not used for assessments. Follows AIW-D37 and AIW-D90. |
| Q2 | Rule | Class labels, verb rule and umbrella rule (§(c)1), next to README rule 9. |
| Q3 | Rule | §(c)2 joins `ai-in-regulated-work-2026-10.md` §7 as one say / never-say list; counsel reads it before any use (AIW-D68). |
| Q4 | Plan | The A/B naming question (§(c)5) in the validation script. |
| Q5 | Plan | Investor material uses only the investor line in §(c)2. |
| Q6 | Counsel | Is "AI-assisted" on a rules-computed result a material misrepresentation to a licensed buyer (ss. 74.01(1)(a), 74.03(5))? Does a licensee who repeats a vendor's AI claim breach Code s. 44(2)(a)? Do ss. 38(3) and 22(2) apply to software? |
| Q7 | Decision (founder), only if wanted | Reopen AIW-D40: may an AI teammate run the assessment when a person asks? Put before the framework document is written (§(c)3). |

---

## (d) What not to do

1. **Do not call assessment, scoring, checklists, deadlines or Practice answers "AI"** anywhere. One Canadian law firm's commentary gives this as an example of AI washing [5]; it contradicts FD-16 ("may not say the AI decides"), AIW-D37 and AIW-D90.
2. **Do not demo or describe the AI running the assessment** unless the founder reopens AIW-D40 (AW-1-88).
3. **Do not use "AI" as an umbrella brand** over rules and AI ("Expat Ready AI").
4. **Do not claim performance before the test exists:** "accurate", "always current", "verified", any percentage or hours saved (s. 74.01(1)(b) [1]; [3]; [10]).
5. **Do not quote an automation rate to investors** until measured (Nate [14]; Presto [41]; Builder.ai [15]).
6. **Do not copy rivals' lines or absolute claims** ("eliminate errors", success rates, "You decide", "You stay the decision maker") [25][26][29].
7. **Do not hide AI inside "smart" or "automated" wording**; under-declaring harms licensees as much as over-claiming.
8. **Do not say "deterministic", "neuro-symbolic" or "hybrid reasoning" to consultants.**
9. **Do not price "accuracy", "rules" or "Canada" as AI extras** (moat file §4.5 item 5).
10. **Do not publish any wording** before counsel reads it and the founder says yes (README §5).

---

## (e) Sources

All web sources accessed **12 Oct 2026**.

**Canada: law and regulator**
1. Justice Laws, *Competition Act*, ss. 70 to 74.02 (current to 21 Sep 2026). https://laws-lois.justice.gc.ca/eng/acts/c-34/page-11.html [V]
2. Justice Laws, *Competition Act*, ss. 74.03 to 74.1 (s. 74.03(5); s. 74.1(1)(c)(ii)). https://laws-lois.justice.gc.ca/eng/acts/c-34/page-12.html [V]
3. Competition Bureau, deputy commissioner for deceptive marketing practices, guest post, Canadian Marketing Association, 31 May 2023. https://thecma.ca/topic/articles/2023/05/31/decoding-rules-for-online-reviews-influencer-marketing-and-ai-deceptive-marketing-claims [V; older than 2025, the Bureau's only located statement on AI claims]
4. Canadian Marketing Association, *AI Playbook 14: AI Washing*, July 2025. https://thecma.ca/docs/default-source/default-document-library/CMA-AI-Playbook_AI-Washing.pdf [S]
5. BCF, "Artificial intelligence or artificial claims? AI washing", 10 Apr 2026. https://www.bcf.ca/en/thought-leadership/case-studies/artificial-intelligence-or-artificial-claims-ai-washing-the-risk-your-company-may/ [S]
6. Fasken, "New private rights of action have come into force", Jun 2025 (source of the 20 Jun 2025 date; returned 403 on 12 Oct, not re-verified). https://www.fasken.com/en/knowledge/2025/06/new-private-rights-of-action-have-come-into-force [S]
7. Competition Bureau, "Consultation on Artificial Intelligence and Competition: What We Heard" (via search summary). https://competition-bureau.canada.ca/en/how-we-foster-competition/education-and-outreach/consultation-artificial-intelligence-and-competition-what-we-heard [S]
42. Competition Bureau, bulletin on private access to the Competition Tribunal. https://competition-bureau.canada.ca/en/how-we-foster-competition/education-and-outreach/publications/bulletin-private-access-competition-tribunal [V]
43. Justice Laws, *Competition Act* s. 103.1 (s. 103.1(6.1)). https://laws-lois.justice.gc.ca/eng/acts/C-34/section-103.1.html [V]

**United States**
8. FTC, "FTC Announces Crackdown on Deceptive AI Claims and Schemes", 25 Sep 2024. https://www.ftc.gov/news-events/news/press-releases/2024/09/ftc-announces-crackdown-deceptive-ai-claims-schemes [V]
9. Kelley Drye, "FTC Reminds Advertisers to Keep AI Claims in Check", 9 Mar 2023. https://www.kelleydrye.com/viewpoints/blogs/ad-law-access/ftc-reminds-advertisers-to-keep-ai-claims-in-check [S]
10. Benesch, "One Year In, FTC's 'Operation AI Comply' Continues", 21 Oct 2025. https://www.beneschlaw.com/insight/one-year-in-ftcs-operation-ai-comply-continues-under-new-administration-signaling-enduring-enforcement-focus/ [S]
11. PYMNTS, "FTC Seeks to Ban Air AI From Marketing Business Opportunities", 24 Mar 2026. https://www.pymnts.com/legal/2026/ftc-seeks-to-ban-air-ai-from-marketing-business-opportunities/ [S]
12. Federal Register, proposed "Policy Statement Concerning the Suppression of Accuracy in Artificial Intelligence Systems", 7 Jul 2026 (blocked; via search summary). https://www.federalregister.gov/documents/2026/07/07/2026-13628/policy-statement-concerning-the-suppression-of-accuracy-in-artificial-intelligence-systems [S]
13. SEC, press release 2024-36, 18 Mar 2024. https://www.sec.gov/newsroom/press-releases/2024-36 [V]
14. DLA Piper, Apr 2025, and Holland & Knight, 10 Jul 2025 (Nate). https://www.dlapiper.com/en/insights/publications/2025/04/doj-and-sec-send-warning-against-ai-washing-with-charges-against-technology-startup-founder ; https://www.hklaw.com/en/insights/publications/2025/07/sec-and-doj-warm-up-to-enforcement-over-ai-washing [S]
15. eWeek, Builder.ai, 2025. https://www.eweek.com/news/builderai-bankruptcy-ai-developers-coding/ [S, allegations]
16. Debevoise & Plimpton, "AI Washing: The Latest False Advertising Battleground", May 2026. https://www.debevoise.com/insights/publications/2026/05/ai-washing [S]
17. Kelley Drye, "NAD Examines AI Claims"; National Law Review on NAD. https://www.kelleydrye.com/viewpoints/blogs/ad-law-access/nad-examines-ai-claims ; https://natlawreview.com/article/nad-signals-increased-scrutiny-ai-advertising-claims [S]
41. SEC, administrative proceeding summary, Presto Automation Inc., 14 Jan 2025. https://www.sec.gov/enforcement-litigation/administrative-proceedings/33-11352-s [V]

**Licensee's code**
18. Justice Laws, CICC *Code of Professional Conduct* (SOR/2022-128), ss. 19(2)(e), 22(2), 38(2), 38(3), 44(2). https://laws-lois.justice.gc.ca/eng/regulations/SOR-2022-128/FullText.html [V]

**Marketing**
19. TurboTax guarantees. https://turbotax.intuit.com/corp/guarantees/ [VC]
20. TurboTax online. https://turbotax.intuit.com/personal-taxes/online/ [VC]
21. Pega blog, 8 Dec 2025. https://www.pega.com/node/458106 [VC]
22. Salesforce Engineering, Agent Graph (Oct; year not shown). https://engineering.salesforce.com/agentforces-agent-graph-toward-guided-determinism-with-hybrid-reasoning/ [VC]
23. Salesforce Developers, Agent Script, Feb 2026 (via search summary). https://developer.salesforce.com/blogs/2026/02/agent-script-decoded-intro-to-agent-script-language-fundamentals [VC]
24. Ramp, agents announcement 9 Jul 2025; Policy Agent help page (via search summaries). https://ramp.com/blog/ramp-agents-announcement ; https://support.ramp.com/hc/en-us/articles/44072387128979-Policy-Agent-Overview [VC]
25. Docketwise. https://www.docketwise.com/ [VC]
26. Boundless. https://www.boundless.com/ [VC]
27. Alma. https://www.tryalma.com/ [VC]
28. Visto. https://visto.ai/ [VC]
29. VisaFlo. https://visaflo.ca/ [VC]
30. Bloomberg Law and Fortune on Lemonade, May 2021. https://news.bloomberglaw.com/insurance/lemonades-use-of-ai-to-study-claims-brings-uproar-after-tweet ; https://www.fortune.com/2021/05/26/lemonade-insurance-ai-face-scanning-fraud [S]

**Buyers**
31. Thomson Reuters Institute, *Future of Professionals Report 2026*. https://www.thomsonreuters.com/en/institute/future-of-professionals-2026/report [Survey, vendor-run]
32. Washington State University news, 30 Jul 2024. https://news.wsu.edu/?p=244668 [S]
33. *Canadian Lawyer*, Clio 2025 report. https://canadianlawyermag.com/news/general/solos-and-small-firms-lag-with-ai-adoption-clio-report/392441 [S]

**Pricing**
34. Salesforce, Agentforce pricing. https://www.salesforce.com/agentforce/pricing/ [VC]
35. Intercom pricing. https://www.intercom.com/pricing [VC]
36. Redress Compliance, Now Assist pricing. https://redresscompliance.com/servicenow-now-assist-ai-pricing.html [S]
37. Vaquill; CostBench. https://www.vaquill.ai/blog/harvey-legora-cocounsel-pricing-reality-2026 ; https://costbench.com/software/ai-legal-tools/cocounsel [S]
38. EvenUp release via Silicon UK, 15 May 2025. https://www.silicon.co.uk/press-release/evenup-launches-ai-drafts-suite-smart-workflows-medical-bill-summary-and-case-based-pricing-to-redefine-legal-automation-for-personal-injury-firms [VC]
39. Kintsugi, Avalara pricing 2026. https://trykintsugi.com/blog/avalara-pricing [S]
40. AI Tools Bakery, Clio pricing 2026. https://aitoolsbakery.com/blog/clio-pricing-2026/ [S]

**Expat Ready files**
- Founder Decisions Log v1.5 (`sources/drive-snapshot-2026-10-11/01-techno-functional/07-Founder-Decisions-Log.md`): FD-16 (line 52), FD-18 (line 54), FD-20 (line 56), FD-22.
- AG-03 v1.4: AG-3-21, AG-3-28, AG-3-39. AG-11 v1.12: AG-11-72, AG-11-94. SA-01B v1.2: SA1B-D18, SA-1B-39, SA-1B-40. SA-01 v2.2: SA1-D6. SA-04 v2.14 SA-4-44 (via `price-card.md` page 1).
- AW-01 document version 0.6: AW-1-23, AW-1-88; test R-I4. `requirements/change-notes/CN-AG-03.md` change 1.
- `ai-workers/decisions.md`: AIW-D11, D13, D26, D37, D40, D41, D52, D60, D61, D63, D68, D74, D83, D85, D89, D90, D91.
- `commercial/plan.md` v1.1: §2, §3, §4, §5, §8. `ai-workers/commercial/price-card.md` pages 1 to 3.
- `ai-workers/research/`: moat file §1.3, §2.1, §2.3, §4.1 to §4.5, §5, §7 (and its source [28]); `ai-in-regulated-work-2026-10.md` §2.4, §7; `ai-coverage-vs-competitors-2026-10.md` §2.1. `ai-workers/design/rules-ai-classification-2026-10-12.md` rows A15, A18, A21.

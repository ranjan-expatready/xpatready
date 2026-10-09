# Field scan: immigration practice software and AI workers in professional services

**Wave W1, AI Workers workstream (ask B14 in `../brief-coverage.md`).** Writer: competitor-analyst (b), Claude. Date: 9 Oct 2026. Status: research input only. Nothing here is a decision.
**Companion file:** [`field-scan.csv`](field-scan.csv), one row per competitor and AI capability.
**Out of scope here:** VisaFlo itself (covered in [`visaflo.md`](visaflo.md)). It appears only as a pointer.

**Changelog**
- **v2, 9 Oct 2026.** Revised after `checks/review-W1-2026-10-09.md`:
  - B-1: §4 and §7 rebased on `sources/drive-snapshot-2026-10-09/`. The four AI Doers, the "Needs you" approval inbox, autonomy levels and AI floors are now cited.
  - AIW-D13 applied: the "FD-16 blocks the concept" conclusion is removed.
  - M-3: the audit trail is restated as a design strength, not a market lead.
  - M-4: LawFairy and Garfield.Law quotes re-attributed, and the analogy narrowed.
  - B-3: no claim of product-enforced *licensed* sign-off.
  - m-2: Guardrails AI is paraphrased. m-6: SA-11 is cited as v2.7.
- **v1, 9 Oct 2026.** First version, built on the 3 Oct snapshot.

## 0. How to read this

**Tags on every fact**
- **Verified** = reported by a source independent of the company (journalist, regulator, bar body, court).
- **Vendor claim** = the company's own page, press release, help article or marketplace listing it controls. Published prices are tagged this way too: the price is what the vendor publishes, not what firms actually pay.
- **Inferred** = my own reasoning from the facts. **Unknown** = not found.
- *(excerpt)* = the page refused our reader (HTTP 403 or a bot check), so the wording comes from the search engine's summary of that page. Treat it as weaker than a page we read in full.

**Dates.** Every web source was accessed **9 Oct 2026** unless it is marked **[R1]** or **[R4]**. Those facts come from earlier research files read on 7 Oct 2026. I reused them without fetching them again (see §0.2).

**Method.** Public pages only. No sign-in, no form, no trial, no contact with any vendor. Officio, Clio, BusinessWire and the Clio help centre refused automated reads (HTTP 403). Their facts come from [R1], from excerpts, or from independent coverage, and are marked that way.

**What "live" means.** **Live** = the vendor says customers can use it now. **Announced / preview** = the vendor says it is coming. **Beta** = the vendor says it is limited. I tested nothing myself.

### 0.1 Product facts used (Expat Ready)
- **Snapshot:** every Expat Ready citation in §4 and §7 comes from `sources/drive-snapshot-2026-10-09/`, the newest, and was checked word for word against the file named.
- **Inventory:** the W1 inventory (`ai-workers/design/inventory/ag-frs-1.md`, `ag-frs-2.md`, `foundation.md`, `sa-frs.md`, `doc4-portal.md`) was used to find them. Where only the inventory is cited, that is said.
- **Decisions:** Ranjan's workstream decisions are cited from `ai-workers/decisions.md`.
- **Unchanged since 3 Oct (per the 9 Oct manifest):** Founder Decisions Log v1.5, Doc 1 v1.3, SA-01 v2.2, SA-05 v2.2.
- The archive was not used.

### 0.2 Earlier research reused (not redone)
| File | What I reused | Freshness |
|---|---|---|
| `commercial/research/R1-competitors-and-pricing-2026-10-07.md` | Canadian product list, published prices for Officio, Visto, CaseEasy, Clio CA, Docketwise, Immicase, Navisa, Migrawise and IMMeFile, association channels, and the "Tracker" and MigrateCRM dead-ends | 2 days old. **Prices not re-checked today**, except Immicase, which the reviewer re-confirmed. |
| `commercial/research/R4-funding-options-and-intermediaries-2026-10-07.md` §5 | Clio Series G and the vLex, Jurisage and Learned Hand acquisitions; MyCase–Docketwise; Mitratech–INSZoom; Equifax–LawLogix; Thomson Reuters–Casetext | Transaction facts, 2 days old; still current |
| `commercial/research/R7-icp-licensee-profile-and-demand-2026-10-07.md` (row S5) | CICC plans a licensee AI-use survey | Single row; primary source |
| `ai-workers/research/visaflo.md` | Pointer to OpenVisa and "VisaFlow Pro" (studied here in §3.14); VisaFlo's "audit trails" claim (used in §7) | Same day |
| `commercial/research/R6-ai-tools-independent.md` | Not used. It covers business-plan tools, not this field. | — |
| `commercial/research/R2`, `R3`, `R5` | Not used. Searched for AI and competitor content: none relevant. | — |

---

## 1. Summary

1. **The Canadian immigration-software market is already selling AI, cheaply.** Officio sells AI drafting, and Visto sells a copilot and drafting tool trained only on IRCC (Immigration, Refugees and Citizenship Canada) material. Immicase charges CAD 29 a month for AI as an add-on. Navisa calls itself "AI Case Management" and charges per case. CAPIC's free IMMeFile tool advertises "AI-assisted" document tracking. (Vendor claims [R1]; Visto re-read today.) CaseEasy advertises "CaseEasy AI", but I found no list of its features.
2. **The big legal-software platform, Clio, has moved from assistant to agent.** Clio Duo was renamed **Manage AI** (Nov 2025). Clio Work gained agentic mode on 2 Apr 2026: it plans and runs multi-step tasks from one instruction, shows its reasoning live and can be interrupted (Verified, LawNext). Clio has ARR (annual recurring revenue) above US$500M (company claim, May 2026) and a US$5B valuation [R4].
3. **US immigration platforms add AI mainly through partners.** Docketwise (8am) bundles AI in its Pro tier and above. Mitratech INSZoom announced AI notice intake and a preview of an AI client portal, plus links to Visalaw AI, Lawfully and Candle (June 2026). None of them publishes AI as a separately priced item.
4. **The best-funded "AI workers" sell finished work, not software.** Crosby (contracts), Alma and Casium (US immigration), Lawhive and Eudia (law firms that run on AI) price per document, per case or a flat legal fee. Licensed lawyers review the output, and in Crosby's case malpractice insurance covers it. Harvey (about US$15.5–15.6B valuation, Sept 2026) and Legora (US$5.55B, Mar 2026) sell agents to law firms, priced through enterprise contracts.
5. **Tax and accounting run ahead on autonomy.** Basis (US$1.15B, Feb 2026) says its agent completed a full US partnership tax return (form 1065) on its own (vendor claim). Filed's own headline says "94% still needs professional review" (vendor's own framing).
6. **One relevant regulatory precedent, in England.** The Solicitors Regulation Authority (SRA, the regulator of solicitors in England and Wales; not a Canadian body) authorised LawFairy in Feb 2026. It covers UK immigration eligibility, and its founder calls it "a fully deterministic legal model" (Legal Futures). Artificial Lawyer reports it is not using generative AI. The SRA also authorised Garfield.Law (2025, small debt claims), where a rule-based system "has overall control" over the language model (IBA).
7. **Expat Ready's October requirements already specify an approve-first AI layer for Release 1:**
   - four AI Doers (Reader, Sorter, Drafter, Checker), "built but switched off" until a Canada-only, no-training provider is recorded;
   - a "Needs you" approval inbox;
   - autonomy levels, with floors no one can lower;
   - a log of every model call.
   It is specified, not built, and its release is contested by the Charter and a scope-triage proposal (§4, §7).
8. **New: a do-it-yourself product that skips the consultant.** OpenVisa (openvisa.ca) sells self-represented couples spousal-sponsorship forms for a one-time CA$49. It uses an "AI scanner" and a Chrome extension that fills the IRCC PR Portal. The Chrome Web Store lists the extension as **"Offered by VisaFlo"** (§3.14).
   - **"VisaFlow Pro"** (The Giant Reach) is a different, unrelated company.
   - **"Visafly"** in the founders' spec most likely misspells VisaFlo (§2).
9. **Gaps:** team sizes are mostly unknown. Real AI prices for Clio, Harvey, Legora, EvenUp and CoCounsel are not published. CaseEasy's AI features are unknown. I found no CICC (College of Immigration and Citizenship Consultants) guidance on AI for licensees.

---

## 2. Names from the founders' own spec, and "Visafly"

- **Source (product fact):** `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-13-er-doers-brand-naming-spec.md`, line 102, exact words: *"vs **Officio / Caseasy** (keep your records) and **Visto.ai / Visafly** (fill your forms): **"ER runs your firm.""*. The same pairing appears in `2026-06-14-er-product-ia-doers-model.md` line 16: *"the opposite of Officio / Caseasy module-navigation"*. Logged in `email-evidence.md` row E4.
- **"Caseasy"** = **CaseEasy 360** (caseeasy.ca, Toronto). The spec drops one letter. Profiled in §3.2.
- **"Visafly" = most likely a misspelling of VisaFlo (Inferred).** Evidence:
  - A web search for "Visafly" immigration software returned **no company of that name**. Every hit was VisaFlo (vflo.inblog.ai, caplight.com/company/visaflo).
  - visafly.ca does not resolve (DNS lookup failed).
  - visafly.com redirects (HTTP 301) to evisajet.com. That site would not load (connection reset). Its name suggests a consumer e-visa service, not practice software (Unknown, not confirmed).
  - The spec groups it with Visto under "fill your forms". IRCC form and portal auto-fill is VisaFlo's stated strength ([R1] §2.2; `email-evidence.md` E2).
  - **Not confirmed:** only the spec's author can confirm what they meant.

---

## 3. Profiles

### 3.1 Officio (Uniques Software Corp., North Vancouver)
- **Sells / to whom:** immigration practice management for Canadian RCICs (regulated Canadian immigration consultants) and lawyers. Plans cover 1 to 5 users. "over 400 forms including Federal, Quebec, Provincial Nominee Program…" [R1] (Vendor claim).
- **AI:** "AI Writer" drafts letters and emails (named on officio.ca, read 7 Oct [R1]; G2 listing, accessed 9 Oct). **Live** (Vendor claim). Intake scoring for eligibility (G2 / TechImply listings, Vendor claim). No agent features found.
- **Guardrails / review / audit:** no AI-specific statement found. Unknown.
- **Pricing:** per firm, CAD 69 / 99 / 129 a month (Solo, Pro, Ultimate). No separate AI price seen [R1] (Vendor claim). Whether AI Writer is in every plan: Unknown.
- **Funding / team / customers:** no public transaction [R4]. Team Unknown.
- **Recent changes:** none found. officio.ca returned HTTP 403 to us today.
- **Canada relevance:** core competitor. A CILA sponsor [R1]. Named in the founders' spec (§2).

### 3.2 CaseEasy 360 (Toronto)
- **Sells / to whom:** case management for Canadian firms. Claims "Trusted by 500+ Canadian immigration firms since 2017" [R1] (Vendor claim).
- **AI:** the homepage banner reads "Explore CaseEasy AI — discover the AI capabilities available today and see what we're building next" (caseeasy.ca, accessed 9 Oct). The linked feature list was not readable, so **the actual AI features are Unknown**. "Intelligent form autofill" of IRCC forms is **Live** (Vendor claim). Portal auto-fill is sold pay-as-you-go "from $25 per case" [R1].
- **Guardrails:** the founder's sponsored post on cila.co argues for "a harmonious blend of AI support and the indispensable human touch" *(excerpt)*. That is a positioning statement, not a product control.
- **Pricing:** Starter CAD 99 a month, Advanced CAD 199 a month, CAD 69 per extra user. Form fills capped per day [R1] (Vendor claim). CILA members get "30% de réduction sur vos 6 premiers mois" *(excerpt, French CILA page)*. AI price Unknown.
- **Funding / team:** Unknown. SOC 2 Type 1 [R1].
- **Canada relevance:** core. A CILA sponsor [R1]. Named in the founders' spec as "Caseasy".

### 3.3 Visto (Visto Tech Inc., Toronto)
- **Sells / to whom:** Canadian immigration software for professionals only. Founded by immigration lawyer Josh Schachnow [R1].
- **AI (all Vendor claim, visto.ai, accessed 9 Oct):**
  - **Copilot** for research, drafting and communication. "Trained exclusively on IRCC" information and "Kept up-to-date with the most recent immigration content and programs". **Live.**
  - **VistoBot** auto-drafts cover letters and study plans. **Live.**
  - Generates retainers. **Live.**
  - Chrome extension that auto-fills IRCC web portals (automation, not described as AI). **Live.**
  - No agents mentioned.
- **Guardrails:**
  - Scope is limited to the IRCC corpus (the body of IRCC material it draws on).
  - Maclean's reports the company saying the research tool **will not answer if it cannot find the answer in that data, and links to its source** *(excerpt; Vendor claim reported by an independent outlet)*.
  - "Algorithm is constantly improving with feedback from regulated professionals" (Vendor claim).
- **Pricing:** per firm, CAD 199 / 449 / 999 a month, sized by **applications per month** (10 / 25 / 55). Extra application CAD 29 [R1] (Vendor claim). **This is volume-metered pricing.** AI is not priced separately.
- **Data:** "an encrypted database inside Canada" (Vendor claim).
- **Canada relevance:** core. Named in the founders' spec.

### 3.4 Clio (Themis Solutions Inc.): Manage AI, Clio Work, Vincent
- **Sells / to whom:** practice management for law firms of all sizes. Has a Canadian site and a Canadian immigration-law page, but **no IRCC form feature was found** [R1].
- **AI:**
  - **Manage AI** replaced **Clio Duo** at ClioCon, Nov 2025 (Clio year-in-review *(excerpt)*, Vendor claim). Clio Duo is retired as a name.
  - The Clio help centre says an administrator can enable Manage AI on "Essentials, Advanced, and Expand subscriptions" *(excerpt)*. Clio's Australian page says AI is "included on Core and above" *(excerpt)*. **Plan names conflict by region. Treat as Unknown for Canada.**
  - Capabilities: document analysis, questions, catching up on a matter, and creating activities, events, notes and tasks (help centre *(excerpt)*). **Live.**
  - **Clio Work agentic mode, 2 Apr 2026** (LawNext, Verified):
    - handles "complex, multi-step legal tasks from a single natural-language prompt";
    - "displays real-time thinking traces";
    - users can "interrupt, redirect, or refine directions mid-task";
    - "applied automatically for all Clio Work users with no setup or configuration required". **Live.**
  - Vincent (legal research, from the vLex acquisition) launched as a mobile app the same day (LawNext, Verified).
  - GPT-5.5 support in Clio Work and Vincent (clio.com blog title, Vendor claim, date Unknown).
- **Guardrails / audit:**
  - Clio Work's control is to **watch and interrupt**. No approval step before an action was found (LawNext, Artificial Lawyer, Verified).
  - A third-party product page says Manage AI keeps an **AI event log for 90 days** (timestamp, user, event). **Not confirmed on a Clio page.**
- **Pricing:**
  - Canada: "Starting at $69/user" (Starter). Higher tiers: "Get pricing" [R1] (Vendor claim).
  - AI price: third-party sites give conflicting figures (US$39–59 extra; or included in Core and above). **Unknown.**
  - Clio Work price: not public. Unknown.
- **Funding / scale:**
  - Series G of US$500M at a US$5B valuation, and the US$1B vLex purchase completed 10 Nov 2025 [R4] (Vendor claim via investor repost).
  - Bought Jurisage (Canadian case-law AI, 10 Jun 2026) and Learned Hand (30 Sep 2026) [R4].
  - Passed US$500M ARR (LegalTech Monitor, 13 May 2026; company figure).
- **Canada relevance:** high as a platform and a channel threat. It is the one well-funded player with Canadian legal content. It does not serve IRCC forms (Inferred from [R1]).

### 3.5 8am DocketWise (formerly Docketwise; 8am / AffiniPay group)
- **Sells / to whom:** US immigration case management. No Canadian forms [R1].
- **AI (Vendor claim, docketwise.com, accessed 9 Oct):**
  - "DocketWise IQ" **writing assistant**: polishing, drafting and English–Spanish translation. **Live.**
  - "DocketWise IQ" **document assistant**: "Extract names, dates, and case details from scanned immigration documents" into USCIS forms. **Live.**
  - The ABA Journal reported that data capture was in closed beta at the time *(excerpt; date of article Unknown)*.
- **Partner AI:** a link with Candle AI that shows case data inside Gmail and Outlook, announced 18 Jun 2026 (LawNext, Verified).
- **Guardrails:** "All AI-generated outputs are optional, user-reviewed, and securely managed within the platform" (Vendor claim).
- **Pricing:** per user, US$80 / 100 / 120 (yearly view). **AI is included from Pro (US$100) up. There is no separate AI price** (pricing page, Vendor claim). AI is a reason to move up a tier.
- **Funding / ownership:** acquired by MyCase in 2022. The group now trades as 8am [R4].
- **Canada relevance:** low (US forms). It shows the "AI bundled in the middle tier" pattern.

### 3.6 Mitratech INSZoom
- **Sells / to whom:** immigration case management for law firms and corporate HR. Covers "U.S., Canadian, and global immigration" and claims "1,500+ immigration practices" [R1] (Vendor claim).
- **AI (press release, 16 Jun 2026, Vendor claim):**
  - "GovNoticeIDP" reads government notices and routes them into case records. **Live** (stated as built).
  - A client portal that uses AI to extract data from uploads. **Preview / announced.**
  - The wider "ARIES" AI layer gives "contextual insights and task execution".
  - Integrations: **Visalaw AI** (research and drafting), **Lawfully** (USCIS case tracking and approval-rate benchmarks) and **Candle AI** (email).
- **Guardrails:** "without sacrificing governance or control". Visalaw uses "verified, lawyer-vetted sources". No human-review control described (Vendor claim).
- **Pricing:** not published [R1].
- **Funding / ownership:** owned by Mitratech since 2020 [R4].
- **Canada relevance:** medium. It has a Canadian case-management page and sponsors CILA [R1]. It targets corporate and large-firm buyers.

### 3.7 Imagility (Cambridge, MA)
- **Sells / to whom:** US immigration software for attorneys, HR teams and individuals.
- **AI (imagility.co, Vendor claim):**
  - "Smart petition builder" with AI auto-fill;
  - OCR (reading text from scans) of passports and I-94s;
  - wage-level auto-detection;
  - "Built-in validation catches errors before filing";
  - RFE (request for evidence) response management.
  - **Live** as claimed.
  - "60%" faster preparation, with no method given.
- **Guardrails:** no human-review statement. SOC 2 Type II and GDPR badges (Vendor claim).
- **Pricing:** not published. Book a demo or "Register for a Free account".
- **User evidence:** one GetApp review from April 2026 rates it 2.0/5 and says "many promised features are not working properly" *(excerpt; a single review, not representative)*.
- **Canada relevance:** none found.

### 3.8 LawLogix (Equifax Workforce Solutions)
- **Sells:** US immigration case management, I-9 and E-Verify. Bought by Equifax in 2022 [R4].
- **AI:** none found in public listings. **Unknown.**
- **Pricing:** contact the vendor (Capterra listing, Vendor claim).
- **Canada relevance:** none found. Low priority. Kept only because it was on the list.

### 3.9 Low-cost Canadian tools that lead with AI (from [R1], not re-read)
| Product | AI positioning (vendor words) | How AI is priced |
|---|---|---|
| Immicase | AI add-on | **CAD 29 a month add-on** on top of CAD 49–99 per firm |
| Navisa | "AI Case Management for Canadian Immigration Consultants & Lawyers"; "human in the loop" | US$36 a month per firm **plus US$16 per case opened** |
| Migrawise | "AI that lives inside the platform…" | Included; CAD 29 a month for the whole firm. Its Chrome extension fills IRCC visitor and super-visa portal forms and "uses AI to map fields" (Chrome Web Store listing *(excerpt)*, accessed 9 Oct) |
| IMMeFile (CAPIC) | "AI-assisted document tracking and naming conventions"; "Client communication log with full audit trail" | Free with CAPIC membership |

Another IRCC portal auto-fill extension, "Meridian AutoFile", is listed for RCICs and fills forms from "Meridian case data" (extension directory *(excerpt)*). Its vendor was not identified. Unknown.

### 3.10 VisaFlo
Covered in [`visaflo.md`](visaflo.md). For context only ([R1], Vendor claim): an AI lead agent, 13-language intake, IRCC portal auto-fill, "human in the loop", priced by case volume with unlimited users. See §3.14 for OpenVisa, which the Chrome Web Store attributes to VisaFlo.

### 3.11 AI-native immigration services (US and UK)

**Casium (Seattle, founded 2024)**
- **Model:** "a licensed law firm, technology platform, and service partner in one" (casium.com, Vendor claim). Serves employers and individuals: TN, L-1, H-1B, O-1 and green cards. Claims "global mobility" in 90 countries.
- **AI:** agents scan public data such as papers and patents to build a candidate's profile. Lawyers and paralegals then review the file and suggest the visa (secondary coverage *(excerpt)*).
- **Guardrails:** "Best-in-class attorneys file your visas". Claims a 99% approval rate, with no method given (Vendor claim).
- **Pricing:** not published.
- **Funding:** US$5M seed, Oct 2025, led by Maverick Ventures (BusinessWire, Vendor claim; repeated by Pulse 2.0).
- **Canada:** TN visas for Canadians only.

**Alma (US)**
- **Model:**
  - Calls itself a "modern immigration law firm". Its own footer says "Alma is not a law firm and does not provide legal advice". Legal work is done by **Alma Legal Services, P.C.** (tryalma.com, Vendor claim).
  - Steps include "Attorney review & filing".
- **Pricing: flat fee per case type**, for example O-1 US$8,000, H-1B US$3,500, EB-1A US$10,000. The fee includes the RFE response and "One free refile in case of initial denial" (pricing page, Vendor claim). **This is close to outcome pricing.**
- **Funding:** US$17M Series A led by Bling Capital (law.com, 16 Sep 2026, via Dealroom; Verified).
- **Canada:** none.

**Boundless (Seattle)**
- **Model:** online immigration service. Legal work by Boundless Legal LLC (Arizona). Each application is checked by "an experienced Boundless Document Review Specialist" before submission. "Flat-rate pricing", money-back guarantee, and financing through Klarna (Aug 2026 press page) (boundless.com, Vendor claim).
- **AI:** none marketed on the homepage. Boundless says it uses **Parley** for O-1 and EB-1 work (boundless.com/parley, Vendor claim).
- **Funding:** the latest reliably dated round is the US$7.8M Series A (2019, own press). Later totals in trackers are unverified.
- **Canada:** none.

**Parley (YC, founded 2024)**
- **Sells:** AI petition writing inside Microsoft Word for US immigration law firms (O-1A first; H-1B, EB-1, NIW, L-1 listed). Also form filling, exhibit assembly and RFE drafting (YC page and trackers, Vendor claim).
- **Funding:** about US$500K (trackers, unverified).
- **Canada:** none.

**Visalaw AI (spin-off of Siskind Susser)**
- **Sells:** immigration research and drafting.
- **Pricing:** launch price **US$220 per user a month** billed annually (press release, Jan 2024, Vendor claim; may be stale).
- **Now:** integrated with INSZoom (June 2026).

**LawFairy (London)**
- **Status:** authorised in **Feb 2026** by the SRA, the regulator of solicitors in England and Wales. It is a technology-only law firm covering UK visa eligibility, sponsorship and citizenship (Artificial Lawyer, 24 Feb 2026; IBA, 20 Apr 2026; Verified).
- **How it works:**
  - Its founder describes "a fully deterministic legal model" (Legal Futures, Verified).
  - Artificial Lawyer reports it is not using generative AI (Verified).
  - The IBA reports that rule-based cases are handled by fixed logic, and that cases needing judgment (credibility, proportionality, protection claims) are flagged for human input. Users can bring in a regulated adviser at any stage (IBA, Verified).
- **Pricing:** eligibility report **£149**. Further advice goes to partner firms (Legal Futures / Artificial Lawyer, Verified).
- **Relevance (Inferred, narrow):** one regulator, in another country, authorised a rule-based firm for a narrow, standardised slice of immigration law. That is an illustration, not a precedent for Canada or the CICC.

**Immigify (US, Techstars 2025)**
- AI platform for immigrants and the professionals who serve them. More than US$1M pre-seed (Techstars blog, 7 Jul 2026, Vendor claim). Small; watch only.

### 3.12 Adjacent AI-agent players (legal, tax, accounting)

| Company | What it sells / to whom | AI and autonomy | Human review / trust | AI pricing model | Funding (tag) | Canada |
|---|---|---|---|---|---|---|
| **Harvey** | AI platform and agents for large law firms and in-house legal teams | Agents for research, diligence and drafting; first fine-tuned legal model (secondary, unverified) | Bought Guardrails AI, a start-up that makes security and behaviour-testing tools for AI agents, Sept 2026 (TheNextWeb, Verified; paraphrased) | Enterprise contract, not published; third parties report per-seat minimums (unverified) | US$550M at about US$15.5–15.6B, 9 Sep 2026; ARR above US$400M and 3,000+ organisations (company figures) (TheNextWeb, Verified) | Unknown |
| **Legora** | Collaborative AI and agents for law firms | "aOS" platform to orchestrate autonomous agents (May 2026), described as working "under supervision" (secondary) | Supervision framing only | Not published | US$550M Series D at US$5.55B, 10 Mar 2026 (SiliconANGLE, Verified); later extension to US$600M (secondary) | Unknown |
| **Thomson Reuters CoCounsel** | Legal AI tied to Westlaw | Agent-style "Deep Research" since Aug 2025 (secondary) | Citation-backed output (secondary) | Add-on to Westlaw subscriptions, sold through sales; pay-per-task mentioned, price unpublished (third parties) | Bought Casetext for US$650M in 2023 [R4] | Has Canadian legal products (not checked) |
| **EvenUp** | AI for US personal-injury firms (demand letters) | AI drafts, workflows, medical-bill summaries | Attorneys "review comprehensive drafts in minutes" (Vendor claim) | **Per case**: "One clear, predictable cost per case", no feature tiers (press release, 15 May 2025, Vendor claim) | US$150M Series E at over US$2B, Oct 2025 (Bloomberg Law *(excerpt)*, Verified) | None |
| **Eudia** | AI for corporate legal teams, plus "Eudia Counsel", called an "AI-augmented law firm" under Arizona's alternative business structure rules (Sept 2025) | Diligence and contracting | Regulated lawyers; acquired Johnson Hana (300+ lawyers) (secondary) | Service fees (not published) | "Up to" US$105M Series A, Feb 2025: US$30M upfront, the rest conditional (Verdict, Verified) | None |
| **Crosby** | "AI-powered law firm" for commercial contracts, sold to sales teams | "AI agents research, analyze, and draft" | "Expert attorneys review all work"; 50+ licensed attorneys; "full malpractice insurance" (crosby.ai, Vendor claim) | **Fixed fee per document** (Vendor claim); about US$400 per contract (third party, unverified) | US$60M Series B led by Lux and Index, Mar or Apr 2026 (trackers; date unclear) | None |
| **Lawhive** | AI platform plus owned law firms for consumers (UK and US) | AI paralegal "Lawrence" | Licensed lawyers in owned firms | Consumer legal fees | US$60M Series B, Feb 2026 (Fortune, Verified); buying US consumer firms, including immigration practices (BusinessWire, 18 Mar 2026, Vendor claim) | None |
| **Garfield.Law** | SRA-authorised firm (England) helping businesses recover small debts (claims up to £10,000); **not immigration** | LLM (large language model) drafting under a deterministic expert system that "has overall control" (IBA) | Users approve every document; a lawyer checks LLM drafts before issue (IBA, Verified) | Per-step fees (not checked) | Not checked | None |
| **Basis** | AI agents for accounting firms (accounting, tax, audit) | Says it ran the "first AI agent to autonomously complete an end-to-end 1065 tax return" (Vendor claim) | Not stated on the pages read | Not published | US$100M Series B at US$1.15B, 24 Feb 2026, led by Accel (BusinessWire, Vendor claim; CPA Practice Advisor, Verified) | Unknown |
| **Filed** | AI tax preparation and review for US CPA (chartered accountant) firms | Reads the client's document binder, fills the return, checks values against sources | "Your people keep the judgment"; own headline: "94% still needs professional review" (filed.com, Vendor claim) | Not published | US$17M pre-seed and seed, 2025 (Sifted via secondary) | None; US infrastructure |
| **Fieldguide** | Agentic AI for audit and advisory firms | Agentic audit and advisory workflows (secondary) | Investor quote: firms must "combine human judgment with AI-driven execution" (Goldman Sachs, secondary) | Not checked | US$75M Series C, 2 Feb 2026, led by Goldman Sachs Alternatives; about US$700M valuation; CEO says about 160 staff (Accounting Today *(excerpt)*, Verified) | Unknown |
| **Blue J** (Toronto) | Generative-AI tax research, including Canadian tax | Research answers | Not checked | Not published | US$122M Series D, Aug 2025 (Blue J release; The Logic, Verified) | **Canadian** |
| **Spellbook** (Toronto) | AI contract drafting in Word for lawyers | Drafting and review | Not checked | Not checked | US$50M at US$350M, Oct 2025 (Bloomberg *(excerpt)*, Verified) | **Canadian** |
| **AI receptionists / "AI employees" for law firms** (Reflekt Legal, CaseGen.ai, Smith.ai and others) | 24/7 phone answering, intake qualification, follow-up calls, synced to case systems | Live (Vendor claims) | Smith.ai routes complex calls to humans (roundup, Vendor claim) | Monthly fee; one vendor's roundup gives US$50–300 a month for AI against US$200–1,200 for human answering services | Unknown | Unknown |

### 3.13 Dropped or dead
- **"Tracker"** (redirects to Mitratech I-9 product) and **MigrateCRM** (site down): could not be verified as current products [R1].
- **Clio Duo:** the name is retired and replaced by Manage AI (§3.4).
- **"Visafly":** no such company found (§2).
- **Too thin to profile:** Imagility's 2026 activity (no news found), LawLogix AI (none found).

### 3.14 Two names flagged by the VisaFlo study

**OpenVisa (openvisa.ca): do-it-yourself spousal sponsorship for applicants**
- **Sells / to whom:** a web tool for couples preparing a Canadian spousal or common-law sponsorship **without a representative**.
  - Homepage FAQ: "Do I need a consultant or lawyer?" Answer: "No. You can apply on your own."
  - "OpenVisa is software, not a lawyer or RCIC."
  - "You submit your application yourself."
  - (openvisa.ca, Vendor claim)
- **AI:**
  - An "AI scanner" reads uploaded documents (past applications, résumés, travel records) and "suggests answers for your questionnaire, and you choose which ones to add". **Live** (Vendor claim).
  - A Chrome extension, "OpenVisa: PR Portal autofill", fills IMM 0008, 5406, 5562 and 5669 on IRCC's PR Portal from the user's OpenVisa answers. Version 1.0.6, updated 7 Oct 2026, 1 user, no ratings (Chrome Web Store, Vendor listing; re-confirmed by the W1 reviewer).
- **Guardrails:**
  - The user chooses which AI suggestions to accept.
  - The user files the application.
  - It states it is not affiliated with IRCC (Vendor claim).
- **Pricing:** **CA$49 one-time**, paid when downloading finished forms. Answering, the guide and the form preview are free (Vendor claim).
- **Who operates it:** the homepage names no company ("© 2026 OpenVisa"). **The Chrome Web Store listing says "Offered by VisaFlo", developer email info@vflo.app**, and support goes to hello@openvisa.ca.
  - **Inferred: OpenVisa is very likely a VisaFlo consumer product.** It is not confirmed on either company's own website.
  - Handed to the VisaFlo analyst; not profiled further here.
- **Canada relevance: high, as a channel signal (Inferred).** The same kind of form engine is sold directly to applicants as a substitute for paying an RCIC.

**"VisaFlow Pro" by The Giant Reach: a different company from VisaFlo**
- **It is not VisaFlo.** Different company (The Giant Reach), different site (thegiantreach-com.lovable.app). The pages read have no link to VisaFlo, no Canada mention and no IRCC mention (Vendor pages, accessed 9 Oct).
- **Sells / to whom:** a CRM, qualifying-form engine and case management for immigration consultants, visa agencies and study-abroad businesses.
  - Search excerpts of the "VisaFlow Pro" page describe "every enquiry is scored per visa type".
  - They also describe a Starter plan of "$29/month" for solo consultants with 5 active cases *(excerpt)*.
- **Product name is unstable.** Today the same URL shows a product called **"VisaByte"**, priced Starter $49 (15 cases), Professional $99 (50 cases), Firm $199 (150 cases), plus Enterprise (Vendor claim; currency not stated).
  - Inferred: the product was renamed or repackaged. Not confirmed.
- **AI:** none described for the live product. "Document AI", "Eligibility scoring" and a "Consultant copilot" are listed as "Future AI products" (Vendor claim). Status: **Announced.**
- **Funding / team / location:** Unknown.
- **Canada relevance:** low. Note it mainly so nobody confuses it with VisaFlo.

---

## 4. Capability comparison: what they do → how Expat Ready covers it → where we go further → where they are ahead

**Abbreviations used in this table**
- Product citations are from `sources/drive-snapshot-2026-10-09/`.
- "AG-11 v1.11" = `02-functional-requirements/agent/AG-11-automation_v1.11_2026-10-07.md`.
- "AG-10 v1.9" = `AG-10-communication-hub_v1.9_2026-10-07.md`.
- "AG-16 v1.12" = `AG-16-firm-settings-and-integrations_v1.12_2026-10-08.md`.
- "Agent Phasing v1.4" = `agent/99-Phasing-and-Glossary_v1.4_2026-10-05.md`.
- "AIW-D13" = `ai-workers/decisions.md`, Ranjan, 9 Oct 2026.
- **Proposal** = not yet in any requirement.

**Release status of all AI rows (applies to rows 1, 3, 4, 6):**
- **What the requirements say:** Agent Phasing v1.4 line 23: "The AI Doers (Reader, Sorter, Drafter, Checker) and WhatsApp … ship in Release 1 **built but switched off**".
- **The lock:** AG-11-93: "AI Doers SHALL be **off for every firm**, with the switch locked, until the Super Admin has recorded the provider, the processing region (Canada only, AG11-D15) and a no-training/no-retention agreement". AG-16-35 sets "one on/off setting for all four AI Doers", default "**Off**".
- **Scope is contested:**
  - Program Charter V1 line 107 still lists "AI-assisted features · Automation engine (AG-11) and its Doers" under Not in Release 1.
  - SCOPE-TRIAGE (5 Oct, "**not** a requirements document") line 149 proposes moving "The 4 AI Doers and their release gate" to Release 2.
  - Which document wins is open (review B-2).

| # | Their capability (who) | How Expat Ready's approach covers it (citation, exact words) | Where we go further | Where they are ahead (honest) |
|---|---|---|---|---|
| 1 | AI drafting of letters, cover letters, retainers (Officio, Visto, DocketWise, Parley, Visalaw) | **Drafter**, one of four AI Doers: AG-11 v1.11 AG11-D4, "Four AI Doers join the catalogue". AG-10 v1.9 AG11-D4 row: the Drafter is "AG-10's AI-assist drafter, callable by any recipe". AG-11-53: the system "SHALL NOT allow an autonomy level below `APPROVE` for: AI-written text sent to a client; a template whose body was edited by AI" | The approve-first floor cannot be lowered: "No one SHALL be able to lower an AI-text floor" (AG-11-53). FD-16 (Founder Decisions Log v1.5, unchanged) also requires provenance on AI-assisted output | Theirs are **live and switched on**. Ours is specified, not built, locked off until a provider is recorded (AG-11-93), and its release is contested (see note above) |
| 2 | IRCC PDF and portal auto-fill (Visto, CaseEasy, Officio, VisaFlo, Migrawise, OpenVisa) | Charter V1 speaker notes line 115: "Release 1 does not file electronically with the government and does not auto-fill government forms (parked by the team, SA1B-D28)". SCOPE-TRIAGE line 93 proposes moving the "Form auto-fill engine (the Filler)" to Release 2. AG-18 v1.2 line 147: "IRCC portal autofill or a browser extension", "not decided". AG-11-54: "No Doer action SHALL submit anything to a government authority, at any autonomy level." | A hard rule that nothing is submitted to IRCC automatically (AG-11-54). Proposal: if auto-fill is built, record which pack version produced each form | **Clearly ahead.** Auto-fill is table stakes in Canada [R1] and is now sold to applicants too (OpenVisa). We have none confirmed for launch |
| 3 | Document data extraction (DocketWise, Imagility, INSZoom preview, IMMeFile, OpenVisa "AI scanner") | **Reader** (AG11-D4): "extracts document data into proposed profile values with provenance and confidence". Release 1 covers identity documents including passport MRZ (machine-readable zone), "IRCC/government letters, language test results … and ECA reports". AG11-D10: "Approving a Reader-proposed value in its review view ... **is** the verification". AG-11-53 floor: no value enters "the client's verified profile without a human having looked at its source" | Every extracted value carries its source and confidence, and nothing enters the verified profile without a person approving it (requirement, not proposal) | Theirs are live. Ours is locked off until the provider gate; confidence thresholds are still open, so every Reader value routes to review (AG-11 §13 Q11, per `ag-frs-2.md` line 320) |
| 4 | Agents running multi-step work (Clio Work, Legora, Harvey, Basis) | **Identity:** AIW-D13, "Each AI Worker acts on behalf of a named licensed person, with only that person's permissions; nothing takes effect until a human approves it; everything is logged. No AI identity of its own. Ratified FD-16 unchanged." **Mechanics already in the FRs (functional requirements):** autonomy levels "**Send automatically**, **Ask me first** and **Off**" (AG-11-51); the **Needs you** approval inbox (AG-11-55), each item showing "what will happen", "why", "the provenance of every value and the confidence of any AI output" (AG-11-56); "A pending item SHALL **never** execute because time passed" (AG-11-59) | **Approve first**, against Clio Work's watch-and-interrupt (LawNext). Approving requires "the same permission the owning module requires for the same action done by hand" (AG-11-58) | Clio, Legora and Harvey run multi-step agents today. Our AI Workers are a W2 concept. The Release 1 automation builder is not there (Inferred, `ag-frs-2.md` line 558). The audit log records `actorUserId` only, so "AI prepared, person approved" has no single record yet (`ag-frs-2.md` X7) |
| 5 | Eligibility assessment (LawFairy rules engine; Officio and VisaFlo scoring; Casium profiling) | SA-01 v2.2 line 123: a Country Pack "version is an immutable bundle of versioned content areas". FD-20 (Founder Decisions Log v1.5): each assessment result carries "an immutable **factor snapshot**" and a "`REVIEW_OF_AUTOMATED_DECISION`" request "routing to a named human reviewer" | Fixed rules, versioned and explainable, with a client right to human review | Rivals' scorers are live. Canada pack content is not yet authored (`sa-frs.md` line 62), so ours has nothing to run on yet (Inferred) |
| 6 | Log of AI actions (Clio Manage AI: 90-day AI event log, unverified) | AG-11-72: "Every model call SHALL be logged with the Doer, model, prompt version, firm, record, time and outcome, so any AI proposal can be traced" (retention interim 1 year, AG-11-98). SA-11 v2.7 line 58: actions land "on one append-only, hash-chained spine" | **Design strength, not a market lead.** Every model call is traceable, and the audit is tamper-evident *if* the hash chain stays in Release 1 | Audit trails are common: IMMeFile "full audit trail" [R1]; VisaFlo claims "audit trails" (`visaflo.md`). SCOPE-TRIAGE line 174 proposes moving the "Tamper-evident hash chain + verifier" to Release 2. Clio's log is live; ours is not built |
| 7 | Licensed professional reviews all AI work (Crosby, Casium, Alma, Boundless, Filed) | **Approval by a named person, licensed by default.** AG-11-58: "AI-written client text SHALL, by default, be approved only by a licensed user". But AG-10 v1.9 line 430 (AG-10-44): the "Owner MAY allow other roles to approve", and "If **no licensed user is active**, the Owner MAY approve", recorded as "approved by Owner without a licensed user". SA-06 v3.1: "The permission system never checks licence" | The approver is always a named, logged person, and AI text cannot skip approval. **We do not claim product-enforced licensed sign-off.** AIW-D13 intends a licensed person; matching the FRs to that is Ranjan's decision (review B-3). Confirm with counsel / RCIC | **They take responsibility for the outcome**: in-house licensed lawyers, malpractice insurance (Crosby), refile guarantees (Alma). We sell software, so the firm carries the professional risk |
| 8 | Multi-country coverage (INSZoom "global", Casium "90 countries") | FD-22 (Founder Decisions Log v1.5) splits a destination **Country Pack** from a firm-regulator **Practice Pack**. FD-17: trust rules "resolve from the firm's Practice Pack … never hardcoded CICC" | Countries are added as data (packs), not code (Inferred: AI Doers would read the same packs) | **Ahead today.** FD-17: "every Practice Pack except Canada" is out of scope as content. Canada-only at launch |
| 9 | Closed source corpus that refuses when unsure (Visto Copilot per Maclean's; Visalaw; CoCounsel citations) | AG11-D4: "All four: output is a proposal with provenance + confidence; never fabricate". Country Pack versions are immutable (SA-01 v2.2) | Proposal: AI answers would cite the published pack version and decline where the pack is silent | **Ahead.** Visto's IRCC-wide corpus tool is live. Our Canada pack content "does not exist yet" (`sa-frs.md` line 62), so there is no corpus to ground answers on today |
| 10 | Multilingual AI intake (VisaFlo and OpenVisa: 13 languages; legal AI receptionists) | Doc 4 v1.3 CP-1-12: the portal "SHALL render fully in EN + Canadian French". CP-6-22: "no on-the-fly legal-text translation". AG-12 v1.2 AG-12-24: consent and legal copy "**authored per locale, never machine-translated**". Inbound matching by the **Sorter** (AG11-D4). WhatsApp inbound built but switched off (Agent Phasing v1.4 line 23) | A deliberate choice: legal text is never machine-translated, and French meets Quebec requirements | **Ahead on breadth.** VisaFlo's 13-language intake [R1] versus our two languages. Whether our choice wins buyers is Unknown |
| 11 | Pricing AI per case or outcome (EvenUp, Crosby, Alma, Navisa, Visto volume caps, OpenVisa CA$49 per application) | FD-18: "Per-seat tiers by firm size … plus metered add-ons for consumption rails". SA-04 v2.14 SA-4-44: "Nothing is sold outside a plan: there are no add-on prices in Release 1." AG-16-35: "which Doers or volumes are plan-gated is still open" | Pricing is a W3 question | Per-case pricing tracks what AI changes (more cases per person) (Inferred) |

---

## 5. How AI is priced in professional-services software (2026)

| Model | Who uses it (evidence) | What the buyer sees | Note |
|---|---|---|---|
| **A. Bundled into a higher seat tier** | DocketWise (AI from Pro, US$100 per user); Clio Manage AI (included from a mid tier, region-dependent *(excerpt)*); Visto (no separate AI price) | No AI line item; AI drives upgrades | The most common pattern in practice software (Inferred) |
| **B. Flat monthly add-on** | Immicase CAD 29 a month [R1]; Clio AI add-on reported at US$39–59 (third party, unverified) | Small, predictable extra | Cheap; frames AI as a feature |
| **C. Negotiated enterprise seats** | Harvey, Legora, CoCounsel (add-on to Westlaw) | Not published; sales-led; minimum seats reported (unverified) | Large-firm market |
| **D. Volume caps** | Visto: applications per month, CAD 29 per extra application [R1]; CaseEasy daily form-fill caps [R1]; VisaByte (The Giant Reach) active-case caps | Pay for throughput | A step toward usage pricing |
| **E. Per case or per matter** | EvenUp "one clear, predictable cost per case" (2025); Navisa US$16 per case [R1]; CaseEasy portal fill "from $25 per case" [R1]; OpenVisa CA$49 one-time per application (consumer) | Cost tracks the firm's revenue unit | Natural for immigration, where each file is a fee (Inferred) |
| **F. Per document, fixed fee** | Crosby (fixed fee per contract; about US$400 per third party) | Price per deliverable | The vendor carries the delivery risk |
| **G. Outcome or flat legal fee, with guarantee** | Alma (O-1 US$8,000 including RFE response and one free refile); Boundless flat fees and money-back guarantee; LawFairy £149 report | Pay for a result | Only possible when the vendor is, or owns, a regulated firm |
| **H. Usage credits** | Casefleet "usage-based billing" for its AI plan *(excerpt)*; Harvey credit plan (single unverified source) | Metered AI consumption | Rare in the immigration niche so far |

**Observations (Inferred):**
- In the immigration niche, **nobody publishes a price per AI task**. AI is either bundled, sold as a small add-on, or hidden inside per-case or flat fees.
- The highest valuations sit with companies that sell **finished work** (Crosby, Alma, EvenUp) or **enterprise agents** (Harvey, Legora), not seat-priced practice software.
- Regulators are watching how AI savings are passed on. The AICPA has asked the IRS to clarify guidance that suggests passing AI efficiency savings to clients (The Tax Adviser, Sept 2026 *(excerpt)*). This is a US tax-practice signal only.

---

## 6. Guardrail and trust patterns used by the leaders

1. **A rule-based core controls, or replaces, the AI.**
   - Garfield.Law (England, small debt claims): the expert system "has overall control" over the language model (IBA, Verified).
   - LawFairy (England, UK immigration eligibility): its founder describes "a fully deterministic legal model" (Legal Futures); it is not using generative AI (Artificial Lawyer). Judgment cases are flagged for humans (IBA).
   - The SRA allows AI-led delivery only in "narrow, standardised areas of law" (IBA, quoting a commentator).
   - **This is close to FD-16's "AI assists, humans decide" principle. It is an English regulator's view only, not a Canadian one.**
2. **A named licensed professional reviews or files.** Crosby ("Expert attorneys review all work"), Casium (attorneys file), Alma ("Attorney review & filing"), Boundless (document review specialist before submission), Eudia and Lawhive (owned regulated firms) (Vendor claims).
3. **Outputs are optional and reviewed by the user.** DocketWise: "optional, user-reviewed". EvenUp: attorneys review drafts. OpenVisa: the applicant chooses which AI-suggested answers to add (Vendor claims). This is the lightest pattern. In OpenVisa's case the reviewer is the lay applicant.
4. **Visible reasoning with an interrupt.** Clio Work: "real-time thinking traces" and "interrupt, redirect, or refine" (Verified). Watch-and-stop, not approve-first.
5. **A closed corpus with citations, and refusal when unsure.** Visto (IRCC-only, links its source, declines when not found, per Maclean's *(excerpt)*); Visalaw ("lawyer-vetted sources"); CoCounsel (citation-backed reports, secondary).
6. **Logs of AI actions.** Clio Manage AI: 90-day AI event log (unverified). Audit trails in general are widely claimed (IMMeFile, VisaFlo and others [R1]).
7. **Buying agent-safety tooling.** Harvey bought Guardrails AI, which makes tools to detect when agents stray from intended behaviour (TheNextWeb, Verified; paraphrased). Independent commentary (AllMind) says regulated buyers need "auditable controls, permissioning, and liability allocation" *(excerpt)*.
8. **Insurance and guarantees.** Crosby carries malpractice insurance. Alma offers a free refile; Boundless a money-back guarantee (Vendor claims).
9. **External rules on disclosure.** The Federal Court of Canada requires a declaration when filed material contains AI-generated content, and favours a "human in the loop" (practice notice Dec 2023, updated May 2024; law-firm summaries *(excerpt)*, not the notice itself). IRCC says its own AI tools "do not make immigration decisions" (secondary *(excerpt)*). **No CICC guidance on AI for licensees was found.** CICC plans a licensee AI-use survey ([R7] S5). Confirm with counsel / RCIC.

---

## 7. What this means for Expat Ready (all Inferred; observations, not decisions)

1. **The guardrail layer is already written into the October requirements.** It has:
   - four AI Doers that only propose, with source and confidence (AG11-D4);
   - floors that stop AI text, AI-edited templates, government forms and unverified profile values from ever running unapproved (AG-11-53);
   - one approval inbox (AG-11-55/56);
   - a log of every model call (AG-11-72);
   - a Canada-only, no-training gate before any AI runs (AG-11-93).

   With AIW-D13 ("Keep FD-16, delegate"), AI Workers can be designed in W2 on top of these mechanics without changing FD-16. **What is still open is release scope, not the concept.** The FRs say "built but switched off" in Release 1. The Charter V1 says not in Release 1. SCOPE-TRIAGE proposes Release 2. Ranjan needs to say which wins (review B-2).
2. **The honest contrast with Clio is approve-first against watch-and-interrupt.** Clio Work runs steps and lets a person stop it (LawNext). Expat Ready's requirements make AI output wait in "Needs you" and never execute "because time passed" (AG-11-59). It is a real design difference, but only on paper until built.
3. **Where rivals are ahead:**
   - their AI is live and switched on, while ours is specified, unbuilt and locked off until a provider is recorded;
   - IRCC form and portal auto-fill (ours undecided or proposed for Release 2);
   - language breadth (13 against EN + Canadian French);
   - a grounded research corpus (our Canada pack content is not authored yet);
   - Clio's multi-step agents.
4. **Design strengths to state carefully. None is a proven market lead:**
   - floors that no setting can lower;
   - per-value source and confidence;
   - fixed-rule assessments with factor snapshots and a right to human review (FD-20);
   - packs that add countries as data;
   - an audit trail designed to be tamper-evident.

   Audit trails as such are common (IMMeFile, VisaFlo), and SCOPE-TRIAGE proposes moving the hash chain to Release 2. "Tamper-evident" must not be claimed unless it stays in Release 1.
5. **Sign-off wording.** Say "**approval by a named person, licensed by default**". Do not say a licensed person always signs off. The FRs let the Owner widen approvers and approve when no licensed user is active, and never verify licences (AG-10-44, AG11-D11, SA6-D9). AIW-D11 and AIW-D13 intend a licensed person. Closing that gap means changing the FRs; that is Ranjan's call. Confirm with counsel / RCIC.
6. **The English regulatory example is an illustration, not a precedent.** LawFairy (immigration) and Garfield.Law (debt) show one regulator, the SRA in England and Wales, authorising rule-based delivery in narrow areas. It says nothing about the CICC or Canadian law societies. Use it, if at all, as "others are building trust the same way", without implying regulatory acceptance in Canada.
7. **Pricing.** Canadian rivals bundle AI or charge about CAD 29 a month for it [R1]. AI-native players charge per case or per outcome. In Release 1, Expat Ready sells nothing outside a plan (SA-4-44), so AI would sit inside plans. Which Doers or volumes are plan-gated is open (AG-16-35). Per-case or per-approved-task pricing is a W3 question against FD-18's per-seat shape.
8. **Clio is the threat that can reach us fastest.** It has Canadian legal content (Jurisage), live agents, more than US$500M ARR, and channel reach. It lacks IRCC forms today [R1].
9. **The "AI law firm" path (Alma, Crosby, Lawhive, Eudia) is a different business** that needs a regulated firm. In Canada only a licensed person may represent a client (AIW README §5). Do not copy it without counsel / RCIC advice.
10. **Do-it-yourself tools pull in the opposite direction.** OpenVisa sells AI-assisted forms to applicants at CA$49 as a substitute for an RCIC. AIW-D11 ("Firms only … No applicant-facing AI Workers") puts Expat Ready on the other side. Firms can show clients that a named person approves every AI step. This is a positioning observation only.

---

## 8. Gaps and open questions

- **Team sizes:** Unknown for almost everyone. Exceptions: Fieldguide's CEO says about 160 staff (secondary); EvenUp's "861 employees" figure (tracker, Aug 2026) is unverified and not used.
- **AI prices not public:** Clio Manage AI and Clio Work, Harvey, Legora, CoCounsel, EvenUp's actual per-case figure, Crosby, Basis, Filed, Officio AI Writer, CaseEasy AI.
- **CaseEasy AI feature list:** banner seen, details not readable.
- **Clio:** the Canadian plan that includes Manage AI, and whether the 90-day AI log is real.
- **CICC AI guidance:** none found. Ask counsel / RCIC.
- **Expat Ready:**
  - release scope of AI Doers and the Filler (review B-2);
  - licensed versus named approver (B-3);
  - whether the hash chain stays in Release 1;
  - who the audit log records when an AI Worker acts for a person (`ag-frs-2.md` X7);
  - which AI provider and region today's code uses (review open question).
- **"Visafly":** confirm with the spec's author that it meant VisaFlo.
- **OpenVisa ownership:** confirm; the Chrome Web Store says "Offered by VisaFlo", openvisa.ca names no company.
- **The Giant Reach:** whether "VisaFlow Pro" was renamed "VisaByte"; location, currency and funding are unknown.

---

## 9. Sources (accessed 9 Oct 2026 unless marked [R1]/[R4], which were read 7 Oct 2026)

| # | URL | Used for | How read |
|---|---|---|---|
| 1 | https://www.lawnext.com/2026/04/clio-adds-agentic-ai-capabilities-to-clio-work-also-launches-vincent-mobile-app.html | Clio Work agentic, 2 Apr 2026 | Direct |
| 2 | https://www.artificiallawyer.com/2026/04/08/clio-rolls-out-agents-for-work-and-vincent/ | Clio Work stop-and-refine | Excerpt |
| 3 | https://www.clio.com/about/press/clio-work-agentic-mode-small-law-firms/ | "applied automatically for all users" | Excerpt |
| 4 | https://www.clio.com/blog/clio-2025-year-in-review/ | Duo became Manage AI, ClioCon Nov 2025 | 403; excerpt |
| 5 | https://help.clio.com/hc/articles/29657814904475 | Manage AI plans | 403; excerpt |
| 6 | https://www.clio.com/au/?p=32 | "included on Core and above" (AU) | Excerpt |
| 7 | https://yespress.io/products/clio-duo.md | 90-day AI event log (third party) | Excerpt; unverified |
| 8 | https://www.legaltechmonitor.com/2026/05/clio-once-a-feisty-startup-says-it-has-now-surpassed-500m-in-annual-recurring-revenue/ | Clio ARR, 13 May 2026 | Direct |
| 9 | https://www.clio.com/blog/gpt-5-5-agentic-legal-work/ | GPT-5.5 support (title only) | Excerpt |
| 10 | https://docketwise.com/features/ai-for-law-firms | DocketWise IQ; "optional, user-reviewed" | Direct |
| 11 | https://www.docketwise.com/pricing/ | AI in Pro and Advanced; prices | Direct |
| 12 | https://www.lawnext.com/2026/06/candle-ai-partners-with-mitratechs-inszoom.html | Candle AI partnerships | Excerpt |
| 13 | https://www.abajournal.com/magazine/article/immigration-attorneys-are-turning-to-ai-to-help-with-an-abundance-of-cases | DocketWise data capture beta | Excerpt |
| 14 | https://mitratech.com/resource-hub/pressreleases/mitratech-showcases-expanded-immigration-ai-ecosystem-for-law-firms/ | INSZoom AI, 16 Jun 2026 | Direct |
| 15 | https://mitratech.com/resource-hub/blog/inszoom-lawfully-pro-ai-powered-immigration-practice/ | Lawfully partnership | Excerpt |
| 16 | https://imagility.co/ | Imagility features | Direct |
| 17 | https://www.getapp.co.uk/software/2055529/imagility | April 2026 review | Excerpt |
| 18 | https://www.legaltechnologyhub.com/vendors/lawlogix-by-equifax/ ; https://capterra.com/p/152926/Lawlogix-Edge/ | LawLogix | Excerpt |
| 19 | https://www.g2.com/products/officio/discuss | Officio AI Writer | Excerpt |
| 20 | https://officio.ca/ | — | 403 |
| 21 | https://caseeasy.ca/ | "Explore CaseEasy AI" banner; autofill | Direct |
| 22 | https://cila.co/ai-in-immigration-law-why-embracing-human-expertise-beats-the-hype/ (and /fr/) | CaseEasy founder position; CILA discount | Excerpt |
| 23 | https://visto.ai/ | Copilot, VistoBot, data in Canada | Direct |
| 24 | https://macleans.ca/society/canadian-immigration-has-an-ai-problem/ | Visto refuses when not found, links sources | Excerpt |
| 25 | https://www.casium.com/ | Casium model | Direct |
| 26 | https://www.businesswire.com/news/home/20251019809371/en/Casium-Raises-5M-to-Help-Employers-Hire-Global-Talent-Faster/ ; https://pulse2.com/casium-5-million-raised-to-transform-immigration-into-a-strategic-advantage-for-global-hiring | Casium seed | Excerpt |
| 27 | https://www.tryalma.com/ ; https://www.tryalma.com/pricing | Alma model and fees | Direct |
| 28 | https://dealroom.co/news/151371-ai-native-law-firm-alma-raises-17m-to-automate-immigration-cases/ | Alma Series A (law.com, 16 Sep 2026) | Direct |
| 29 | https://www.boundless.com/ ; https://www.boundless.com/parley ; https://www.boundless.com/es-mx/press/boundless-klarna-financing | Boundless | Direct / excerpt |
| 30 | https://www.ycombinator.com/companies/parley ; https://techindex.law.stanford.edu/companies/parley | Parley | Excerpt |
| 31 | https://www.webdisclosure.com/press-release/visalawai-nasdaq-visalawai-launches-gen-10-a-revolutionary-ai-powered-legal-research-tool-for-immigration-law-firms-eGcxtkAGSV9 | Visalaw price (2024) | Excerpt |
| 32 | https://www.ibanet.org/UK-SRA-takes-unprecedented-approach-in-authorising-AI-enabled-law-firms | Garfield.Law "has overall control"; LawFairy judgment cases flagged; "narrow, standardised areas of law"; 20 Apr 2026 | Direct |
| 33a | https://www.artificiallawyer.com/2026/02/24/lawfairy-technology-only-law-firm-gets-regulatory-approval/ | LawFairy authorised; not using genAI; £149 | Excerpt (re-confirmed by W1 reviewer) |
| 33b | https://www.legalfutures.co.uk/latest-news/non-ai-technology-only-law-firm-authorised-by-sra | LawFairy "fully deterministic legal model"; £149 | Excerpt (re-confirmed by W1 reviewer) |
| 34 | https://www.techstars.com/blog/startup-spotlight/immigify-raises-1m-to-build-50-million-ai-agents-for-every-immigrant-in-america | Immigify | Excerpt |
| 35 | https://thenextweb.com/news/harvey-550m-round-15-6bn-guardrails-acquisition | Harvey round and Guardrails AI | Direct |
| 36 | https://allmind.ai/news/0a7fa77096ac653688193663eeb15ff1ce0aa8662e35f779d94b0db8cca0bb8a | Commentary on auditable controls | Excerpt |
| 37 | https://www.siliconangle.com/2026/03/10/legora-raises-550m-fuel-u-s-expansion-ai-agents-automate-legal-work/ ; https://www.nonbillable.co.uk/news/legora-says-legal-ai-is-dead-new-operating-system-aos | Legora | Excerpt |
| 38 | https://www.silicon.co.uk/press-release/evenup-launches-ai-drafts-suite-smart-workflows-medical-bill-summary-and-case-based-pricing-to-redefine-legal-automation-for-personal-injury-firms | EvenUp per-case pricing, 15 May 2025 | Direct |
| 39 | https://news.bgov.com/esg/ai-legal-tech-evenup-raises-150-million-at-2-billion-valuation | EvenUp Series E | Excerpt |
| 40 | https://www.verdict.co.uk/eudia-raises-upto-105m-in-series-a-round/ ; https://www.fortune.com/2025/09/03/eudia-legal-tech-ai-startup-killing-billable-hour | Eudia | Excerpt |
| 41 | https://www.crosby.ai/ | Crosby model | Direct |
| 42 | https://www.tamradar.com/funding-rounds/crosby-series-b-60m ; https://www.eesel.ai/blog/crosby-ai-pricing | Crosby round; price estimate | Excerpt; unverified |
| 43 | https://dc.fortune.com/2026/02/05/lawhive-ai-law-firm-startup-series-b-venture-funding/ ; https://businesswire.com/news/home/20260318543850/en/Lawhive-Opens-New-York-Office-and-Assembles-Team-to-Lead-US-Law-Firm-Acquisition-Strategy | Lawhive | Excerpt |
| 44 | https://www.businesswire.com/news/home/20260224020999/en/ ; https://www.cpapracticeadvisor.com/2026/02/24/basis-raises-100-million-to-deploy-ai-agents-for-accounting-firms/178759/ | Basis | 403; excerpt |
| 45 | https://www.filed.com/ | Filed model | Direct |
| 46 | https://peopleofcolorintech.com/?p=42835 | Filed funding (citing Sifted) | Excerpt |
| 47 | https://www.bluej.com/blog/blue-j-announces-122m-series-d-financing-led-by-oak-hc-ft-and-sapphire-ventures ; https://thelogic.co/briefing/blue-j-raises-us122m-series-d-for-ai-tax-tools/ | Blue J | Excerpt |
| 48 | https://news.bloomberglaw.com/artificial-intelligence/keith-rabois-bets-on-legal-ai-technology-with-startup-spellbook | Spellbook | Excerpt |
| 49 | https://www.haqq.ai/blog/cocounsel-review-alternatives.html ; https://spellbook.com/learn/cocounsel-pricing | CoCounsel pricing (third parties) | Excerpt |
| 50 | https://reflektlegal.ai/ ; https://www.casegen.ai/ ; https://www.lawmatics.com/blog/best-ai-receptionists-for-law-firms | AI receptionists | Excerpt |
| 51 | https://support.casefleet.com/en/articles/12292109-ai-assistant-chat-overview | Usage-based AI billing example | Excerpt |
| 52 | https://www.thetaxadviser.com/news/2026/sep/aicpa-seeks-irs-clarity-on-ai-guidelines-cpa-fees/ | AICPA and IRS on AI savings | Excerpt |
| 53 | https://www.mondaq.com/canada/new-technology/1439218/federal-court-issues-practice-notice-and-interim-guidelines-regarding-the-use-of-artificial-intelligence-in-court-proceedings | Federal Court AI notice (summary) | Excerpt |
| 54 | https://newcanadianmedia.ca/?p=42739 | IRCC: AI tools do not decide | Excerpt |
| 55 | https://vflo.inblog.ai/officio-alternative ; https://www.caplight.com/company/visaflo | "Visafly" search returns VisaFlo | Excerpt |
| 56 | https://visafly.ca/ (DNS failure) ; https://visafly.com/ (301 to evisajet.com; target reset) | "Visafly" check | Direct |
| 57 | https://www.accountingtoday.com/news/fieldguide-announces-75-million-in-new-funding ; https://cpatrendlines.com/2026/02/02/goldman-bets-75-million-on-fieldguide-the-audittech-stack-comes-of-age/ | Fieldguide round, staff, investor quote | Excerpt |
| 58 | https://chromewebstore.google.com/detail/openvisa-pr-portal-autofi/nkkekgdhalfcclpecnjkpkfpoikokpbo | OpenVisa extension: "Offered by VisaFlo", info@vflo.app, v1.0.6 (7 Oct 2026), forms filled | Direct |
| 59 | https://openvisa.ca/ | OpenVisa offer, CA$49, AI scanner, "not a lawyer or RCIC" | Direct |
| 60 | https://chromewebstore.google.com/detail/aoimmmacpocjiidpnahemjmaldbfcjic ; https://extscope.org/extension/nifngijgapmlfkpfdhgclpdcdlfakime | Migrawise Autofill; Meridian AutoFile | Excerpt |
| 61 | https://thegiantreach-com.lovable.app/products/visaflow-pro ; https://thegiantreach-com.lovable.app/products | The Giant Reach: VisaByte (live page); "VisaFlow Pro" (excerpt) | Direct / excerpt |
| P | `sources/drive-snapshot-2026-10-09/`: AG-11 v1.11 (AG11-D4, AG11-D10, AG-11-51, -53, -54, -55, -56, -58, -59, -72, -93, -98); AG-10 v1.9 (line 430, AG-10-44); AG-16 v1.12 (AG-16-35); Agent Phasing v1.4 (line 23); SCOPE-TRIAGE 5 Oct (lines 3, 93, 149, 174); Charter V1 G1 expanded (lines 107, 115); SA-11 v2.7 (line 58); SA-06 v3.1; SA-04 v2.14 (SA-4-44); AG-12 v1.2 (AG-12-24); AG-18 v1.2 (line 147); Doc 4 v1.3 (CP-1-12, CP-6-22); SA-01 v2.2 (line 123); Founder Decisions Log v1.5 (FD-16, -17, -18, -20, -22) | Expat Ready product facts | Read 9 Oct 2026 |
| D | `ai-workers/decisions.md` (AIW-D11, AIW-D13); `ai-workers/design/inventory/ag-frs-2.md` (lines 320, 558, X7), `sa-frs.md` (line 62) | Ranjan's decisions; inventory findings | Read 9 Oct 2026 |
| R1 | `commercial/research/R1-competitors-and-pricing-2026-10-07.md` and its sources 3–39, 46–51 | Canadian products, prices, channels | Read 7 Oct 2026 |
| R4 | `commercial/research/R4-funding-options-and-intermediaries-2026-10-07.md` S49–S57 | Transactions | Read 7 Oct 2026 |
| R7 | `commercial/research/R7-icp-licensee-profile-and-demand-2026-10-07.md` S5 | CICC AI-use survey plan | Read 7 Oct 2026 |

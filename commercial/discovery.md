> **SUPERSEDED 8 Oct 2026.** Historical draft kept for reference. The current plan is [plan.md](plan.md) / plan.docx and the current model is model.xlsx. Do not use this file's funding figures.

> **Superseded on 7 Oct 2026 by `00-evidence-baseline.md`.** Kept unchanged below as the version Codex reviewed (`product/checks/codex-commercial-discovery-review-2026-10-07.md`). Do not use it for current facts.

# Expat Ready — commercial discovery (working file)

**Owner:** Ranjan (founder). **Maker:** Claude. **Started:** 6 Oct 2026. **Stage:** 1 — product understanding and founder interview.
**Scope:** commercial strategy only. This file does not change product requirements, decisions or shared product files (`product/`), and nothing here has been sent outside.

**Labels used throughout**

| Label | Means |
|---|---|
| **Source** | A project document says it (cited). It shows what was written, not that it is true in the market. |
| **Code** | Seen in the team's code copy. This was a static read on 29 Sep 2026: nothing was run, so it shows what code exists, not what works or is deployed. |
| **Ranjan** | Your answer in this interview. |
| **Assumption** | A working belief that has not been tested. |
| **Estimate** | A number worked out from stated assumptions. |
| **Proposal** | Claude's recommendation. Nothing is decided until you say yes. |
| **Open** | Not resolved. |

---

## 1. Product-understanding brief (Stage 1)

### 1.1 Who uses it, who buys, who approves, who influences

| Role | Beginning segment: solo and small licensed-consultant (RCIC) practices of 1–5 people (FD-19) | Larger firms (6+ people, law firms) | Basis |
|---|---|---|---|
| **Users** | Owner-consultant; possibly 1–4 staff (case officer, intake, billing); the firm's clients through the portal | Same roles with more specialists; for employer cases, the employer's HR (read-only view) | Source: `product/requirements/product.md`, personas; charter v6 slide 1 |
| **Buyer and budget approver** | The owner-consultant. Usually the same person who uses it and signs the cheque | Managing partner or owner; an operations manager evaluates | Assumption |
| **Influencers** | Staff who will use it daily; the bookkeeper or accountant (trust ledger, invoices); peers and professional associations; the vendor of the current tool, through switching cost | The above, plus IT, privacy and security reviewers, and procurement | Assumption |

### 1.2 Problem, what firms use today, why they might switch

- **Problem as written** (Source: RFP v2.0, 19 Jun 2026, §3): firms "lose leads through slow follow-up, miss eligibility opportunities through manual scoring, and carry compliance risk through fragmented record-keeping"; data is re-keyed across tools.
- **What firms use today, as written** (Source: RFP §2): "a patchwork of general-purpose CRM, email, spreadsheet, and standalone case-management tools". *This is the founder's claim. No customer research was found to support it.*
- **Likely alternatives, to verify in Stage 2.** These come from an unverified competitor table in the archive (web research, 2 Oct; §1.8) and from general knowledge. None of this is current research. Immigration practice software sold to Canadian consultants (for example Officio). Immigration case tools built for the US (for example Docketwise, INSZoom). General legal practice software (for example Clio). Generic sales-contact software (HubSpot, Zoho, GoHighLevel). Spreadsheets with Google or Microsoft tools. Doing nothing, or hiring an assistant.
- **Why a firm might switch** (all Assumptions):
  - one system instead of several;
  - less re-typing of client data;
  - faster eligibility checks before consultations;
  - retainer and trust records that hold up in a regulator's file review;
  - a client portal that cuts "where is my case?" emails;
  - English and French.
- **Why a firm might not switch** (all Assumptions):
  - moving client files part-way through cases;
  - the current tool may already fill government forms, which Release 1 may exclude (see conflict K-2);
  - solo practitioners are sensitive to price;
  - reluctance to trust a new vendor with sensitive client data;
  - liability if the platform's immigration rules are wrong;
  - the time it takes to learn a new system.

### 1.3 Differentiation: intended versus demonstrated

| Claim | Intended (Source) | Simulator (clickable prototype, no real back end) | Production code (Code, 29 Sep) | Customer evidence |
|---|---|---|---|---|
| Enquiry to filed case in one place | Charter v6, slide 1; mandate §1 | Partly: the questionnaire flow only (Delivery 1) | The revenue path is absent: sales pipeline (AG-2), booking (AG-4), retainers and e-signature (AG-5), billing (AG-6), case delivery (AG-7). Portal features CP-2 to CP-7 are absent | None found |
| Expat Ready keeps each country's immigration rules current; eligibility results are explained | Vision, `product.md`; FD-20 | Admin pack versions; the Express Entry pathway is planned in Delivery 1b and not yet built | Pack authoring (SA-1): substantial. Assessment engine: partial in the back end, with no screen (AG-3) | None |
| Compliance by design (trust-aware ledger, signatures with one-time passcodes and evidence, tamper-evident audit, Canadian hosting) | FD-17, FD-21; RFP §3 | Audit trail shown | Audit and isolation between firms: substantial. Trust ledger: absent. E-signature: absent. Production cloud account: not set up | None |
| Data entered once and reused | RFP §3 | Answers reused across consoles (simulated) | Shared client-data store: substantial | None |
| Client portal in English and French that works on a phone | Mandate §1; Q-21 | Portal questionnaire in English and French | Portal sign-in and MFA only | None |
| Serves firms outside Canada that sell Canadian immigration | FD-22 | No | Design only | None. Whether an unlicensed overseas firm may represent clients for a fee is a question for counsel or an RCIC |

The requirement for pathway assessment (AG-03 v1.1, 28 Aug) claims "three things no competitor combines". No competitor comparison was found in the sources to support this.

**In plain words:** the differentiation is real as an intention. None of it has been shown to customers yet, and most of what a buyer would look at in a demo is not yet built in the production code.

### 1.4 Readiness

- **Simulator** (Source: `product/NEXT.md`, 5 Oct):
  - Delivery 1, a connected questionnaire demonstration across the three consoles, is built.
  - It is waiting for Codex's second recheck. Your tour is still pending.
  - It proves nothing about the back end.
- **Production code** (Code: `product/reference/code-review-2026-09-29.md` §2 and §5):
  - Mostly built: the foundation (security, separation of each firm's data, sign-in) and much of the admin console.
  - Subscription billing to firms (SA-4) is scaffold only, so the product cannot yet charge a firm.
  - 13 of the 17 firm-console modules are absent or exist only as interface definitions.
  - The client portal has sign-in only.
  - There is no payment, e-signature or booking integration.
  - No production cloud account is set up.
  - 21 items are listed as must-fix before general availability.
  - No penetration test has been done.
- **Plan** (Source: charter v6 slides 1–2; `Program Charter V1 - G1 expanded.md`):
  - G2 (11 Dec) is the first full core journey on test-mode services.
  - G5 (26 Feb) is when pilot firms run real cases.
  - Market launch is targeted for 12 Mar 2027. The delivery team confirms the date on 9 Oct.
  - The charter calls the plan "back-loaded: about 12 modules in November and 12 more in the first 18 days of December".
  - Fallback rule: launch with pilot firms only, and move public sale to 30 Apr.
- **What this means commercially** (Assessment):
  - The earliest a prospect can use the real product on their own data is the pilot window, January–February 2027.
  - Until then, anything sold is sold on a prototype, a vision and your credibility.

### 1.5 Commercial evidence found

- **Customers, pilots, letters of intent, revenue, usage:** none found anywhere in the project (§1.8).
- **Plans and prices:**
  - The shape is decided: per-seat tiers named Solo, Small (2–5) and Firm (6+), with buy-up allowed (FD-18, ratified 2 Aug 2026).
  - The values are open. Q-11 (owner Ranjan) is due 30 Oct.
  - Monthly and yearly prices, in Canadian dollars only (SA-03 v2.13, SA3-D2/D2b).
  - Payment by card only. Pilots go on a discount or an internal $0 plan (SA-04 v2.7, SA4-D2).
  - In the code, the plan feature list is seeded empty.
- **Design partners:**
  - 2–3 firms are to be signed by 30 Oct (Q-12, owner Ranjan; charter row "Commercial readiness — Oct: Prices set; 2–3 pilot firms signed").
  - None are named in the sources.
- **Onboarding:**
  - Firms are set up with help from Expat Ready; there is no self-serve sign-up in Release 1 (roadmap v1.0, R-03, decided on your behalf on 29 Sep, overturnable).
  - Bulk import of existing clients is in scope. Bespoke per-firm data migration is out of scope (RFP §14).
- **Support and customer success:** the charter (Appendix B) says "Help and support content sits under commercial readiness". No support model was found.

### 1.6 Important unknowns

1. Do solo and small practices feel this pain enough to switch and pay? At what price?
2. What do they use today, and how hard is it to leave?
3. How many target firm owners can Ranjan reach personally?
4. Cash, monthly spending and runway.
5. Ambition: a profitable independent business or venture-scale growth. This decides whether outside investment matters at all.
6. Who is the licensed RCIC founder named in the RFP, and what is Sanjay's role?
7. Will the launch date and scope hold? (The team's plan is due 9 Oct.)
8. Will leaving out government form filling make the product hard to sell against incumbents?

### 1.7 Conflicts and stale information

| # | Conflict | Sources | Why it matters commercially |
|---|---|---|---|
| K-1 | Launch date: 12 Mar vs 3–4 Mar vs 28 Feb (production 23 Feb) | Charter v6 slides 1–3; `product/requirements/decisions.md` Q-06 | Sets when pilots convert and when public selling can start |
| K-2 | Government form filling: FD-5 (ratified) puts filled forms in version 1. Charter v6 says Release 1 "does not auto-fill government forms (parked by the team, SA1B-D28)". NEXT.md says "Q-01 answered (auto-fill in Release 1)" and Delivery 1b includes copy-assist and overlay filling | FD log v1.5; G1 expanded notes; NEXT.md | Form filling may be the feature small practices value most and may already have elsewhere |
| K-3 | Employer and LMIA cases: FD-19 says they are "not the first-release proving ground". Charter v6 puts AG-17 and CP-9 in Release 1. SA-03 v2.12 puts employer cases in every plan | FD log; charter; SA-03 | Builds beyond the beginning segment and competes for build time |
| K-4 | Add-ons: FD-18 includes metered add-ons. SA-04 SA4-D1 says "no add-ons" | FD log; SA-04 v2.7 | Affects pricing design |
| K-5 | Identity: the RFP says the founder is a licensed RCIC. The mandate is signed "founder sanjay@expatready.com". Drive decisions are recorded as "Sanjay". Memory records Ranjan as founder and Sanjay as a separate person | RFP §2 and §14; mandate; SA-03 changelog | Decides who can sell credibly as a practitioner, and who owns the company |
| K-6 | The RFP (June 2026) describes an outside vendor building at a fixed price per wave. The product is now built by an in-house team | RFP §11; team roster | The RFP's commercial terms are stale; cost and burn must come from current data |

| K-7 | Plan catalogue: a code seed says "2026-09-30 — FOUNDER-CONFIRMED CATALOG… three real plans Basic / Professional / Enterprise", with 3 / 10 / 500 seats and 0 trial days. Prices are still listed as owed on 30 Oct (Q-11; charter v3). Tier names differ across sources: Solo/Small/Firm, "two public plans", Basic/Professional/Enterprise, Starter/Growth/Scale | `code/ERv2-sanitized/apps/api/infra/14-sa3-seed.sql` lines 4–6 and 100–102; FD-18; roadmap v1.0 line 18; frontend mock fixtures | It is unclear whether any pricing has actually been decided |
| K-8 | Trial: FD log C-6 recommends a "14-day cardless trial". SA-04 requires a card at sign-up. The seed has 0 trial days | FD log line 292; SA-04 v2.6 line 114; seed | Affects how prospects try the product |
| K-9 | Sign-up: roadmap R-03 says firms are set up with help, and self-serve comes in R1.1. SA-04 marks sign-up-link checkout "Must now" | Roadmap v1.0 line 27; SA-04 v2.6 line 107 | Affects the sales motion at launch |

### 1.8 Archive sweep (customer, pricing and competitor evidence; 6 Oct)

Searched: `archive/`, `product/handover/`, `product/checks/`, `code/`. The key quotes were spot-checked by hand.

- **Customers, pilots, letters of intent, waitlist, demos, revenue, usage:** none found. Several records say so directly:
  - "No customer-market evaluation was independently completed" (`archive/…/requirements-review/state/workstreams/commercial-gtm.md:13`, 2 Oct).
  - "No customer data source today" (`…/audit/Sage-vision-and-capability-brief-2026-10-02.md:57`).
  - The only firm names are fictional: Maple Immigration in the simulator, and Northgate, Harbourview and Prairie Pathways in code mocks.
- **Money:** "No verified actual cash balance, burn, runway, revenue forecast or investor pipeline has been supplied" (`…/state/workstreams/finance-fundraising.md:5`). Team cost figures exist only in `~/Desktop/Resource Cost.xlsx`, which was not read.
- **Company:** nothing found on incorporation, jurisdiction, ownership or investors.
- **Team location:** the team appears to be in India. Commit timestamps are +05:30 (inference, not a stated fact).
- **Competitors:**
  - The archive has a web-research table dated 2 Oct 2026, labelled "Vendor claims are marketing and were not tested". US: Docketwise, INSZoom/Mitratech, Cerenade. Canada: Officio, VisaFlo, Visto (`archive/…/founder-deliverables/data/requirements-data_v1.0.json:5424–5452`).
  - It claims: "No immigration competitor found that offers governed, versioned rules with second-person approval…" (:5454).
  - It also notes: "Officio, Docketwise, INSZoom and Clio offer assisted migration" (:26569, unverified).
  - All of this must be re-verified in Stage 2.
- **Production:**
  - "The product cannot be handed to a firm" (`code/ERv2-sanitized/Docs/WORLD-CLASS-AUDIT-2026-08-27.md:928`, 27 Aug).
  - A staging environment is live at `test.expatready.ca` with synthetic data only. Production is not configured (`code/ERv2-sanitized/infra/lib/config/profile.ts:24–29`).
- **Go-to-market:**
  - A public marketing website is "not in scope" of the build (RFP line 213).
  - Support at launch is planned as a "shared support mailbox + logged read-only sessions" (roadmap R-15).
  - Go-to-market is owned by the founder (roadmap v1.0 line 67).
  - No sales, marketing or partnership plan exists.

---

## 2. Discovery brief (living; replace, don't append)

*As of 6 Oct 2026, before your first answers.*

- **Business:** a SaaS product for Canadian immigration practices. Release 1 covers Canada only (Express Entry and two provincial streams). Target launch is March 2027.
- **Beginning segment:** solo and small RCIC practices (FD-19). Per-seat pricing, values not set.
- **Stage:** pre-product, with no commercial evidence found yet. The product team is in place; there is no commercial team.
- **Your hypothesis:** hire a fundraising intermediary and one salesperson who handles most commercial work (A-10).
- **Biggest unknowns:** see §1.6.

## 3. Assumptions register

| ID | Assumption | Why it matters | Evidence today | How to test | Status |
|---|---|---|---|---|---|
| A-01 | Solo and small RCIC practices are the right first segment | Everything downstream | Founder decision FD-19; no customer data | 15–20 discovery interviews across solo, small and 6+ firms; design-partner sign-ups by segment | Open |
| A-02 | These firms feel acute pain from using several disconnected tools | Urgency to switch | RFP claim only | Interviews: current tool stack, hours lost, leads lost | Open |
| A-03 | They will pay a per-seat subscription at a price that supports the business | Revenue model | None | Price conversations; pilot-to-paid conversion | Open |
| A-04 | The buyer is the owner-consultant, and the sales cycle is weeks, not months | Sales design and cost | None | Measure time from discovery to decision with the first 10 prospects | Open |
| A-05 | Leaving out government form filling at launch will not block purchase | Release 1 sellability | None; conflict K-2 | Ask directly in interviews; check competitors' form features | Open, high risk |
| A-06 | Firms will move cases that are already under way into a new system | Onboarding effort; time to value | Bulk import is in scope | Pilot migrations | Open |
| A-07 | A March 2027 launch is achievable | Revenue start date; cash need | Charter target; code read shows firm and portal planes largely unbuilt; back-loaded plan | 9 Oct team plan; gates G1 (15 Nov) and G2 (11 Dec) | At risk |
| A-08 | The founder can open doors with target firms personally | Whether founder-led selling is possible | Unknown | Round 1, Q4 | Open |
| A-09 | The ambition is venture-scale growth | Decides whether outside funding matters | Unknown | Round 1, Q1 | Open |
| A-10 | A fundraising intermediary plus one salesperson are the right next commercial hires | Spending and sequence | Your hypothesis | Stage 2 comparison of alternatives | Open, under test |
| A-11 | Firms outside Canada selling Canadian immigration are a sizeable, lawful market | Expansion story | FD-22 calls them "an ordinary, common customer" | Counsel or RCIC view on authorised representation; market data | Open; confirm with counsel or RCIC |
| A-12 | Firms value and trust immigration-rule content kept current by the platform | Core differentiation; liability | None | Interviews; check competitors' content offers | Open |

## 4. Decision log (commercial)

| ID | Date | Decision | By | Source | Status |
|---|---|---|---|---|---|
| D-C01 | 2 Aug 2026 | Pricing shape: per-seat tiers by firm size (Solo, Small 2–5, Firm 6+); capabilities by plan; buy-up allowed | Founder accepted the architect's recommendation | FD-18, FD log v1.5 | Ratified; values open (Q-11) |
| D-C02 | 2 Aug 2026 | Beginning segment: solo and small RCIC practices, 1–5 people, Canada, Express Entry and provincial volume; design partners from this segment | Founder accepted | FD-19 | Ratified; untested (A-01) |
| D-C03 | 2 Aug 2026 | AI posture: "Marketing may say 'AI-assisted'; it may not say the AI decides". AI features are deferred from Release 1 (charter v6) | Founder accepted | FD-16; charter v6 | Ratified. Commercial consequence: no AI claims in Release 1 marketing |
| D-C04 | 29 Sep 2026 | Firms are set up with help from Expat Ready; self-serve sign-up comes in Release 1.1 | Decided on your behalf (overturnable) | Roadmap v1.0, R-03 | In force unless you overturn it |
| D-C05 | 18 Sep 2026 | Card payment only, in Canadian dollars; monthly and yearly prices; pilots on a discount or an internal $0 plan | Product owners | SA-04 v2.7 SA4-D2; SA-03 SA3-D2b | In force |
| CX-01 | 6 Oct 2026 | Commercial discovery lives in `commercial/`, separate from product requirements; no product or shared file is changed by this exercise | Claude (overturnable) | Your instruction | In force |
| CX-02 | 6 Oct 2026 | The intermediary-plus-salesperson idea is tested against alternatives, not assumed | Your instruction | Prompt, 6 Oct | In force |

## 5. Interview log

### Round 1 — asked 6 Oct 2026 (answers pending)

| # | Question | Tests | If unknown, how to find out |
|---|---|---|---|
| Q1 | Ambition: a profitable company you control, a venture-backed fast-growth company, or something else? What won't you trade for growth? | A-09 | Stage 2 sets out both paths side by side, with what each demands |
| Q2 | Cash today, monthly spending, months of runway, extra money you could add, and the loss you could accept. May Claude read `Resource Cost.xlsx` for totals only? | Funding need | Bank balance plus the cost sheet gives burn and runway in about an hour |
| Q3 | Firm owners spoken to in the last 12 months; demos; interest in a pilot; price signals; likely design partners | A-01 to A-04 | If none: Stage 2 starts with 15–20 discovery interviews |
| Q4 | Are you the licensed consultant the RFP describes? Your own practice; how many firm owners you could call this month; association roles | A-08, K-5 | Count RCICs among your contacts; the regulator's public register gives the full list |
| Q5 | Who does any commercial work today; Sanjay's role and shareholding; your weekly hours for customers over the next 3 months | Sales capacity | A week's diary of where your time goes |
| Q6 | Where the company is incorporated, who owns it, money raised so far and how, and how the team is employed | Funding options | Incorporation papers and your accountant |
| Q7 | What triggered the intermediary-plus-salesperson idea; whether specific people or terms are on the table; any deadline for money | A-10 | — |

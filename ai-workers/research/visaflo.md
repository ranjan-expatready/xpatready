# VisaFlo: competitor profile (W1, deliverable D1 part a)

**Current-comparison notice, 12 Oct independent audit:** §16's Expat Ready column describes the earlier design and is superseded by the current blueprint and AW-01 v0.8. Conversational lead sorting, letters and assisted portal filling are now agreed Release 1 scope, not absent/parked opportunities. Current VisaFlo public claims and comparison limits are in [commercial audit §3](../checks/audit-commercial-2026-10-12.md). A missing public engineering detail is Unknown, not proof a rival lacks a control. No vendor execution was tested.

**Prepared by:** competitor-analyst (W1), 9 Oct 2026. **Covers:** founder asks B13 (VisaFlo study) and part of B14.
**Access date for every web source below:** 2026-10-09, unless a different date is given.
**Rules followed:** public pages only, no sign-in. Their wording is quoted only in short attributed quotes (under 15 words). Their feature names are used only to identify what they sell, never as names for us. Sections 1–15 describe VisaFlo only. **Section 16 compares VisaFlo with Expat Ready** (added after review W1 flagged that ask B13 needed it). Section 17 covers OpenVisa, a consumer product that VisaFlo appears to run.

**Labels used on every claim**
- **Verified**: confirmed by a source VisaFlo does not control (app store counter, third-party directory, registry listing, our own mailbox). A note says when the independent source is weak, for example an unaudited aggregator.
- **Vendor claim**: VisaFlo's own website, blog, help guide, changelog, legal pages or LinkedIn page. These are dated statements by VisaFlo. They prove what VisaFlo *says*, not that the feature works.
- **Inferred**: our reading of the evidence. The reasoning is given.
- **Unknown**: we looked and could not find it.

---

## 1. Identity: confirmed, with three location names and a Korean legal entity

| Fact | Evidence | Label |
|---|---|---|
| Same company as the founder's competitor: VisaFlo, Canadian immigration software, website visaflo.ca, blog vflo.inblog.ai (also served at visaflo.ca/blog) | https://visaflo.ca/ ; https://vflo.inblog.ai ; https://visaflo.ca/blog | Vendor claim (identity matches AIW-D2) |
| The old domain **vflo.app** now redirects permanently (HTTP 301) to visaflo.ca. Staff email addresses still use @vflo.app (a general inbox and two personal addresses; names withheld under rule 10) | fetch of https://vflo.app returned a 301 redirect to https://visaflo.ca/ ; https://visaflo.ca/contact | Verified (server redirect observed) |
| Legal entity in the Terms: *"VisaFlo Inc., a corporation incorporated under the laws of the Republic of Korea"*, operating from British Columbia. Governing law is British Columbia and Canada | https://visaflo.ca/legal/terms-conditions (last updated 25 Sep 2026) | Vendor claim |
| A Korean startup database lists 주식회사 비자플로 (VisaFlo Co., Ltd.), founded **October 2023**, its named representative (a person; name withheld under rule 10), head office Pyeongtaek, Gyeonggi Province, with a Seed round | Search-engine snippet of https://thevc.kr/visaflo (the page itself returned 403) | Verified (third-party, seen only as a snippet) |
| Location has changed over time: **Coquitlam, BC** (2024 blog and FAQ; Caplight), **Vancouver, BC** (LinkedIn; VCBacked), **Burnaby, BC** (current site and contact page: 4185A Still Creek Dr #200, Burnaby, BC V5C 0B4; phone +1 236-785-9115) | https://vflo.inblog.ai/faq ; https://www.caplight.com/company/visaflo ; https://www.linkedin.com/company/visaflo/ ; https://visaflo.ca/contact | Vendor claim and Verified (mixed) |
| Founded 2023 | Caplight (https://www.caplight.com/company/visaflo) and the thevc.kr snippet | Verified (aggregators, unaudited) |

**Note for the founder (Inferred):** the site sells "Immigration Software Built in Canada", but the contracting company is a Korean corporation. Canadian data hosting is claimed separately (section 9). A careful buyer or regulator may ask which company holds the data and under which law.

---

## 2. What they sell, and to whom

- **Buyers:** Canadian RCICs (licensed immigration consultants) and immigration law firms. The current tagline is *"Make judgment calls, not hires."* (homepage). Another line used is *"The operating system for Canadian RCICs and immigration law firms"*. Source: https://visaflo.ca/ (Vendor claim). Since October 2026 they also appear to sell a do-it-yourself tool directly to applicants (OpenVisa, section 17).
- **Firm size targeted:** the demo form asks for firm size, from solo to more than 150 people, and annual case volume, from under 50 to more than 5,000. Source: https://visaflo.ca/ demo form (Vendor claim). *Inferred:* in practice they sell mainly to small firms. Both named customers are small or mid-size (section 7).
- **Access:** *"currently available by invitation"* (homepage FAQ, Vendor claim). The 2024 FAQ instead offered self-serve sign-up with a free trial (section 4).
- **Product shape in October 2026:** one workspace with these modules: lead CRM, intake, review, IMM PDF and IRCC portal autofill, retainers and e-signature, invoicing and payments, website chatbot, consultations, and a "Regulatory Monitor" that is launching soon. On top of these sits a layer of **AI agents** marketed as doing the casework end to end with a human releasing the result. Sources: https://visaflo.ca/ and the feature pages listed in section 3 (Vendor claim).
- **Case types claimed:** Express Entry and EE profiles, PNP, family sponsorship (spousal, child, parents and grandparents), work permits and LMIA, study permits, visitor visas and extensions, citizenship and PR cards, refugee and H&C, Start-up Visa, caregiver, Agri-Food Pilot. Sources: https://visaflo.ca/ FAQ; https://visaflo.ca/about ; changelog months 2024-08 to 2025-09 (Vendor claim).

---

## 3. Features, module by module (what is live, announced or in development)

The status column uses VisaFlo's own labels. "Live (claimed)" means the page presents the feature as available and does not mark it as coming soon. We have not used the product, so **no feature is independently confirmed as working**. The one exception is the Chrome extension, which is listed in a public store with an install count.

### 3.1 AI agents (the 2026 headline)
| Capability | Status | Evidence | Label |
|---|---|---|---|
| Three agents per case. A **lead agent** answers enquiries, qualifies leads and books consultations. A **case agent** runs intake, reads every upload, fills the checklist and chases missing items. A **filing and monitoring agent** fills IMM PDFs and portal fields from reviewed data, then watches letters, deadlines and rule changes after filing | Presented as live; product access by invitation only | https://visaflo.ca/ ("Meet the agents" section) | Vendor claim |
| Case created from a client email ("drop an email" framing). Client replies and attachments are pulled in from Gmail, Outlook and WhatsApp | Presented as live | https://visaflo.ca/ walkthrough | Vendor claim |
| Passport data read from the photo, with the machine-readable zone (MRZ) used to confirm the data | Presented as live | https://visaflo.ca/ | Vendor claim |
| Packet review: cross-checks identity, employment dates, funds and travel-history gaps | Presented as live on the homepage, but see the next row | https://visaflo.ca/ | Vendor claim |
| A whole-file AI review that reviews intake, documents and forms together, highlights *"inconsistencies with immigration rules"*, suggests missing information and gives a **pre-submission score** | **Coming soon** ("Ask about launch access") | https://visaflo.ca/review | Vendor claim |
| A **scanning agent** that reads client WhatsApp or email messages and drafts questionnaire answers, and a **review agent** that flags missing or inconsistent answers and drafts the request email, which the user sends | Announced as new on LinkedIn about 1 week before 9 Oct 2026 (relative date shown on the page) | https://www.linkedin.com/company/visaflo/ | Vendor claim |
| Retainer automation: when a lead is marked won, the retainer is filled, form IMM 5476 can be attached, the client signs on a phone, unsigned retainers are chased, and an invoice is sent after the firm counter-signs. Set up under an "Agents" settings area | Announced as new on LinkedIn about 1 week before 9 Oct 2026 | https://www.linkedin.com/company/visaflo/ | Vendor claim |
| Guardrails as marketed: human release before anything reaches a client or IRCC; agents run only workflows that are switched on; agents cannot send, file or charge alone; any agent can be paused; a private firm knowledge vault that, they say, trains no models; a government data layer that watches form editions, fees and program instructions daily | Presented as live | https://visaflo.ca/ ("Guardrails" section, five layers) | Vendor claim |
| Onboarding loads the firm's checklists, templates, precedent letters and house style into the vault. The firm sets what each agent may touch and where sign-off is required. The first live case is worked together with VisaFlo | Presented as live | https://visaflo.ca/ | Vendor claim |
| Logos of **Claude** and **ChatGPT** among the "channels". How they connect is not explained | Unknown | https://visaflo.ca/ | Vendor claim (logo only) |

### 3.2 Lead CRM and website chatbot
| Capability | Status | Evidence | Label |
|---|---|---|---|
| Lead pipeline (New, In progress, Pending, Scheduled, Converted), automatic lead profiles, assignment, linked email inbox history, tasks with owners and due dates, internal notes | Live (claimed) | https://visaflo.ca/crm ; changelog 2025-01 (lead pages, email templates), 2025-07 (CSV import), 2025-08 (status changes from the leads table), 2025-10 (task management), 2025-11 (kanban board) | Vendor claim |
| Custom lead intake forms on the firm's website, with automatic replies and assignment | Live (claimed) | https://visaflo.ca/crm ; help guide "Custom Lead Form" | Vendor claim |
| Embeddable CRS calculator widget (CRS is the Express Entry points score) and lead collection | Live (claimed); changelog entry under the 2024/october URL | https://visaflo.apidocumentation.com/updates/2024/october | Vendor claim |
| Website AI chatbot: one script tag; answers from source material the firm approves (PDFs, web pages); 13 languages; collects contact details with consent; creates a lead with a transcript; a disclaimer that cannot be removed; *"Never assesses individual eligibility"*; case-specific questions are routed to a consultation (they say this is enforced on the server) | Live (claimed); promoted on LinkedIn about 1 week before 9 Oct 2026 | https://visaflo.ca/chatbot ; https://www.linkedin.com/company/visaflo/ | Vendor claim |
| Eligibility scoring with a pathway recommendation | Claimed only in their own comparison tables (July 2026). Not described on any feature page | https://visaflo.ca/compare/officio ; /compare/clio | Vendor claim (no detail) |
| "Free CRM access" offered as an option on the contact form | Unknown terms | https://visaflo.ca/contact | Vendor claim |

**Note (Inferred):** the chatbot's stated limits (no eligibility assessment, a disclaimer that cannot be removed, consent before details are taken) show that VisaFlo knows the rules on unlicensed advice. The homepage's lead agent "qualifies leads". How qualifying fits with "never assesses eligibility" is not explained.

### 3.3 Consultations
| Capability | Status | Evidence | Label |
|---|---|---|---|
| Paid booking page: services with a set length and price; live availability in the firm's time zone; Stripe payment taken at booking; Google or Outlook calendar blocking; Zoom or Google Meet link created; reminders; each booking becomes a lead; automatic follow-up email | Live (claimed); promoted on LinkedIn about 1 week before 9 Oct 2026 | https://visaflo.ca/consultations ; https://www.linkedin.com/company/visaflo/ | Vendor claim |
| AI meeting notes: a bot joins the Zoom or Meet call, transcribes it and writes structured notes to the client record | Live (claimed) | https://visaflo.ca/consultations | Vendor claim |

### 3.4 Intake and documents
| Capability | Status | Evidence | Label |
|---|---|---|---|
| Questionnaires for each case type, with conditional logic; mobile-friendly; in 13 languages (English, French, Spanish, Chinese Simplified and Traditional, Korean, Japanese, Arabic, Hindi, Persian, Ukrainian, Russian, Polish) | Live (claimed). Languages were added over time per the changelog (Spanish Dec 2024, Arabic Jan 2025, Japanese Feb 2025, Hindi and French Jun 2025, Traditional Chinese Sep 2025) | https://visaflo.ca/intake ; changelog | Vendor claim |
| The firm can customise intake (add its own questions and document requests, save as templates) | Live (claimed) since 1 Dec 2025 | https://visaflo.ca/blog/custom-immigration-forms | Vendor claim |
| Document checklist; uploads; automatic renaming to IRCC's required format; compression; merging; Google Drive (Apr 2025) and OneDrive (Jun 2025) import; 30 MB upload limit (Aug 2025) | Live (claimed) | https://visaflo.ca/intake ; changelog 2025-04, 2025-06, 2025-08 ; help guide (Files) | Vendor claim |
| AI data extraction from passports, permits and IDs, from earlier IMM PDFs, and from the firm's own Word or Excel questionnaires, mapped into the client profile | Live (claimed). Timeline: changelog 2025-05 *"OCR + AI Analysis"*; 2025-06 Word/Excel support and AI document validation; 2025-07 multi-pass extraction and a screen to review extracted data; 2025-10 bug fix for AI document reading; 2025-11 "upgraded AI model" | https://visaflo.ca/intake ; changelog | Vendor claim |
| Visa-expiry reminders to the client and the firm; configurable reminders | Live (claimed) since 2024 | changelog 2024/july; https://visaflo.ca/blog/idea-immigration-transformation | Vendor claim |
| Client-facing questionnaire export to Word or PDF; webhook when a client submits a questionnaire | Live (claimed), 2025-11 | changelog 2025-11 | Vendor claim |
| Reception check-in tablets (built as custom work for one customer) | Custom work, 2024 | https://visaflo.ca/blog/idea-immigration-transformation | Vendor claim |

### 3.5 Review and quality control
| Capability | Status | Evidence | Label |
|---|---|---|---|
| Review mode: approve and lock answers by section, question or document; request changes (the client is notified); reviewer notes; a read-only view | Live (claimed). Changelog 2025-11 "Case Review Mode"; blog post 5 Dec 2025 | https://visaflo.ca/review ; https://visaflo.ca/blog/introducing-review-mode-your-immigration-case-quality-control-checkpoint-83474 | Vendor claim |
| Rule-based checks: gaps and overlaps in history dates, field-length limits, missing mandatory fields, dates sorted automatically | Live (claimed). History-gap alerts since 2024/september | https://visaflo.ca/review ; https://visaflo.ca/blog/managing-client-history | Vendor claim |
| AI document check: missing documents, wrong document type, blurry scans, review rules the firm can customise | Live (claimed) | https://visaflo.ca/review | Vendor claim |
| Whole-file AI review with a pre-submission score | **Coming soon** | https://visaflo.ca/review | Vendor claim |

### 3.6 IMM PDF forms and IRCC portals (their core strength)
| Capability | Status | Evidence | Label |
|---|---|---|---|
| IMM PDF autofill: claims a review-ready package *"in under a minute"*; Word appendix created when history overflows the form's rows; forms in English or French; firm or client contact details used as chosen; required forms chosen automatically by case type | Live (claimed) since 2024. Forms added or fixed in the changelog include IMM 0008, 0104, 1295, 1344, 5257/5257B, 5283, 5406, 5532, 5562, 5669 | https://visaflo.ca/autofill ; https://vflo.inblog.ai/faq (29 Jul 2024) ; changelog | Vendor claim |
| **Representative PR portal autofill**: started as a server-side beta. **Spousal sponsorship only** in Sep–Oct 2024, with Express Entry and H&C promised *"in the coming weeks"*. The firm had to register and validate its representative-portal credentials with VisaFlo | Beta in Sep–Oct 2024 | Blog 10 Sep 2024: https://vflo.inblog.ai/online-portal-autofill ; **email from a VisaFlo co-founder to the Expat Ready founder, 2 Oct 2024** (feature name "Online Representative Portal Autofill"; see `research/email-evidence.md` row E2); changelog 2024/october "Portal Validation" of credentials in real time | Verified that VisaFlo told us this on 2 Oct 2024 (first-party email in our mailbox). How well it worked: Vendor claim |
| Same feature, later history: Feb 2025 fixes for spousal cases with dependants; **Mar 2025 "Removes stored portal credentials for better security"**; **Apr 2025 portal autofill moved into a Chrome browser extension "for better reliability"**. The current site says users do not need to give VisaFlo their portal login | Changed from a server-side tool holding credentials (2024) to a browser extension with no stored credentials (2025 onward) | changelog 2025-02, 2025-03, 2025-04 ; https://visaflo.ca/autofill | Vendor claim; the change itself is Inferred from the dated entries |
| The 10 Sep 2024 blog post was **later rewritten** on visaflo.ca. It now says "Representative PR Portal and Express Entry workflows". The inblog.ai copy still says spousal sponsorship only | Old posts edited after publication | https://visaflo.ca/blog/online-portal-autofill vs https://vflo.inblog.ai/online-portal-autofill | Inferred (two copies compared on 9 Oct 2026) |
| Chrome extension "VisaFlo Autofill Extension": **203 users, one rating (5.0)**, version 1.0.6, updated **26 Sep 2026**. It fills the PR portal, Express Entry, citizenship and BC PNP portals, imports existing Express Entry profiles, and makes a review PDF. A VisaFlo account is required. The store lists the developer as a "non-trader" | Live | https://chromewebstore.google.com/detail/visaflo-autofill-extensio/kndagmebkjldnepmbmmkdnopohefghjh | **Verified** (store counters). Description: Vendor claim |
| The extension's own help guide (v0.0.4) warns that autofill *"can be sensitive to layout changes"*. The portal tab must stay active, and the user should be ready to finish manually | Live, fragile by their own account | https://visaflo.apidocumentation.com/guide/visaflo-extension/must-read-getting-started | Vendor claim |
| Express Entry profile and post-invitation application filled from one questionnaire; Express Entry profile import | Live (claimed); EE case type from 2024/august; EE profile autofill 2025-06 | https://visaflo.ca/autofill ; changelog | Vendor claim |
| A "Max Autofill" mode they say takes 15 seconds | Live (claimed) | https://visaflo.ca/autofill | Vendor claim |
| **US DS-160** questionnaire with form filling (a US visa form) | Live (claimed), changelog 2025-10 | https://visaflo.apidocumentation.com/updates/2025-10 | Vendor claim |

### 3.7 Drafting
| Capability | Status | Evidence | Label |
|---|---|---|---|
| AI draft writer and content suggestions | Released Mar 2025 per the changelog | https://visaflo.apidocumentation.com/updates/2025-03 | Vendor claim |
| AI letter drafts (explanation letters, submission letters, mismatch clarifications, work-history explanations) built from questionnaire answers, documents and past notes, in the firm's own structure and tone; an in-app immigration assistant in the sidebar that cites official sources | Announced 13 Nov 2025; the post does not say live or beta. Changelog 2025-11 "AI-Assisted Drafting" | https://visaflo.ca/blog/introducing-new-visaflo-ai-submission-letter-generator-79336 ; changelog 2025-11 | Vendor claim |

### 3.8 Retainers, e-signature, billing
| Capability | Status | Evidence | Label |
|---|---|---|---|
| Retainer and service agreement filled from lead data (firm template or VisaFlo default), sent, status tracked | Live (claimed) since 2024 | https://visaflo.ca/crm ; https://vflo.inblog.ai/faq | Vendor claim |
| E-signature inside VisaFlo, real-time notices, signed PDF filed automatically, certificate of authenticity | Live (claimed) since Feb 2025; redesigned Oct 2025 | https://visaflo.ca/crm ; changelog 2025-02, 2025-10 ; https://visaflo.ca/compare/officio | Vendor claim |
| PDF invoices and receipts, Stripe payments, balances, QuickBooks-ready CSV export (all on /crm, re-checked 9 Oct). Milestones, reminders and invoices to leads: not on /crm; attributed to a June 2025 changelog entry whose link was not recorded, so **Unknown** until the link is added | Live (claimed) | https://visaflo.ca/crm (9 Oct 2026); changelog 2025-06 (no link) | Vendor claim; partly Unknown (audit 9 Oct) |
| **Trust accounting** | "Launching in July" (comparison tables dated July 2026). Not confirmed as live as of 9 Oct 2026 | https://visaflo.ca/compare/caseeasy | Vendor claim; current status Unknown |

### 3.9 Monitoring after filing
| Capability | Status | Evidence | Label |
|---|---|---|---|
| Regulatory Monitor: checks chosen official IRCC and provincial pages twice a day; compares versions; plain-language summaries with a severity score; maps changes to live cases and affected clients; one-click client briefing; processing-time changes; questions answered with citations | **"Launching soon"**. The feed on the page is labelled a sample | https://visaflo.ca/monitor | Vendor claim |
| Watching IRCC letters and deadlines after filing (homepage example: a biometrics letter) | Presented as live on the homepage; no feature page describes it | https://visaflo.ca/ | Vendor claim (thin) |
| IRCC application-status tracking | Blog topic only (1 Jun 2026); not confirmed as a feature | https://visaflo.ca/blog/automate-ircc-application-status-tracking-2026 | Inferred: possible roadmap item |

### 3.10 Platform, integrations, administration
| Capability | Status | Evidence | Label |
|---|---|---|---|
| Integrations named: Gmail (Jul 2025), Outlook, Google Calendar, Google Drive, OneDrive, WhatsApp, Stripe, Zoom, Google Meet, QuickBooks (CSV file only), Paddle (their own subscription billing), webhooks, a **public API for creating clients and cases** (Oct 2025) | Mostly live (claimed). WhatsApp is shown on the homepage but no feature page describes it | https://visaflo.ca/ ; changelog 2025-07, 2025-10, 2025-11 | Vendor claim |
| Roles and permissions (Jan 2025), single sign-on (Nov 2025), white-label (logo, domain, email) in every plan, verified sender domains, custom case statuses and case ID numbers, dashboard statistics, recovery of deleted cases | Live (claimed) | changelog ; https://visaflo.ca/ | Vendor claim |
| Several firms per account ("multi-company setups") | Mentioned in a fix, 2025-04 | changelog 2025-04 | Vendor claim |
| "API documentation" site | It is actually a user help guide. Apart from changelog mentions, no API endpoint reference is public | https://visaflo.apidocumentation.com/guide/getting-started | Verified (page inspected) |
| Release pace: weekly releases (2024 FAQ). The public changelog runs monthly from July 2024 to **November 2025, then stops**. The 2026 changes appear only on the website and LinkedIn | — | https://vflo.inblog.ai/faq ; https://visaflo.apidocumentation.com/updates | Vendor claim; the gap is Verified |

**Changelog dating note:** the entries under the URLs `/updates/2024/july` to `/updates/2024/october` show "2025" in their page headings when fetched. We treat them as 2024 because of the URL path, the navigation group and their content (for example, Express Entry was "in progress" in the 29 Jul 2024 FAQ and is added in "August"). Label: Inferred.

---

## 4. Pricing and packaging

| Fact | Evidence | Label |
|---|---|---|
| **No public prices.** A demo is required | All pages checked | Verified (absence) |
| Pricing basis advertised: *"Unlimited users"*, "case-volume pricing", "Flat firm pricing", "no per-seat fee"; white-label in every plan | https://visaflo.ca/crm ; https://visaflo.ca/rcic-software ; https://visaflo.ca/compare/clio | Vendor claim |
| **Per-autofill charges exist.** They are not refundable once completed, and are rerun or refunded if VisaFlo is at fault. Renewals are refundable within 14 days only if no autofills were used that period. The first payment is refundable within 14 days. Payments are processed by Paddle | https://visaflo.ca/legal/refund-policy (effective 28 Jul 2026) | Vendor claim |
| The Terms mention *"usage-based charges"* and 30 days' notice before price changes | https://visaflo.ca/legal/terms-conditions (25 Sep 2026) | Vendor claim |
| Monthly or annual plans, *"with or without a dedicated manager"*; a 1-week free trial for first-time subscribers | https://visaflo.apidocumentation.com/guide/settings/manage-subscription | Vendor claim |
| History: "Beginner Plan" and a "Professional" tier (2024/november); new pricing tiers and annual plan changes, longer trial (Feb 2025); a 4-week free trial (FAQ, 29 Jul 2024); a 30-day money-back guarantee (blog, Jul 2024) | changelog ; https://vflo.inblog.ai/faq ; https://vflo.inblog.ai/caseeasy-crm-alternative | Vendor claim |
| A "Free CRM access" option and an "Enterprise" option on the contact form | https://visaflo.ca/contact | Vendor claim |
| Their capacity calculator example shows CAD 60,000 in "potential annual fees". This is a marketing estimate, not a price | https://visaflo.ca/compare/clio | Vendor claim |

**Inferred:** the packaging looks like a flat or case-volume subscription per firm (no seat count) plus a **metered charge per autofill run**, which is the costly part for them to deliver. "All included" in the comparison tables does not sit easily with per-autofill charges in the refund policy. The exact prices are **Unknown**.

---

## 5. Team, size and roles

| Fact | Evidence | Label |
|---|---|---|
| Leaders on the About page: a CEO (growth, product direction, support), a CTO, a CPO and a CMO (four named people; names withheld under rule 10). The page does not call them founders | https://visaflo.ca/about | Vendor claim |
| The CEO is listed as co-founder and CEO (Caplight). The CEO's LinkedIn headline (search snippet) reads "Co-Founder/CEO @ VisaFlo". A 2024 contact address at the vendor's earlier domain matches | https://www.caplight.com/company/visaflo ; search snippet of the CEO's LinkedIn profile (URL withheld under rule 10)117 (profile blocked, HTTP 999) | Verified (aggregator plus snippet) |
| **A VisaFlo co-founder** (name and address withheld under rule 10) wrote to our founder on 2 Oct 2024 and is the byline on the 2024 FAQ. **That person is not on the current About page.** It is Unknown whether they have left, changed role, or appear under another title | `research/email-evidence.md` E2 ; https://vflo.inblog.ai/faq | Verified (email); current role Unknown |
| Team size: **5** people (blog, 2 Aug 2024); **3** (Caplight); **2–10, 4 employees on LinkedIn**, 92 followers; 11–50 (ZoomInfo, seen only as a search snippet; the page returned 403) | https://vflo.inblog.ai/about-us ; https://www.linkedin.com/company/visaflo/ | Mixed. **Inferred: a very small team, about 4–6 people** |
| First-generation immigrants; McGill and BCIT graduates; features built in-house, *"no outsourcing"* (2024) | https://vflo.inblog.ai/faq ; https://visaflo.ca/about | Vendor claim |
| Almost every blog post since 2024 is written by the CMO (name withheld under rule 10), including legal-topic guides on procedural fairness letters, s.40 misrepresentation and GCMS notes | https://vflo.inblog.ai | Vendor claim (bylines) |
| **Job postings: none found** (search, LinkedIn jobs tab not reachable without sign-in, no careers page on the site) | searches on 9 Oct 2026 | Unknown. No hiring signal for AI roles |

---

## 6. Funding and backers

| Fact | Evidence | Label |
|---|---|---|
| Accelerator round on **13 Mar 2024**, investor **Primer** (a Korean accelerator) | https://www.caplight.com/company/visaflo | Verified (aggregator) |
| **USD 289K total**, Pre-Seed, June 2024, investors **Primer and MMSV** (MMSV not identified further); headquarters Vancouver; one-line description "Turbotax for Immigration Applications" | https://www.vcbacked.co/company/visaflo | Verified (aggregator, unaudited) |
| Pitched at **Primer's 23rd Demo Day (March 2024)** as automated document creation for immigration law firms targeting Canada and the USA | Search-engine snippet of https://wowtale.net/2024/03/14/73584/ (page returned 403) | Verified (press, snippet only) |
| "Venture-backed", backed by *"venture capital firms like Primer, among others"*; five unnamed backer logos on the About page | https://vflo.inblog.ai/faq ; https://visaflo.ca/about | Vendor claim |
| Said to be selected for the **AWS Jungle program for AI startups** (a Korean AWS startup program), from a post by the CEO | Search-engine snippet attributed to the CEO's LinkedIn. We could not open it, and AWS pages found do not name VisaFlo | Unverified; date Unknown |
| Any later round (seed or Series A) | None found | Unknown |

---

## 7. Customers and traction

| Fact | Evidence | Label |
|---|---|---|
| Named customers: **Kurzfeld Law Office** (Toronto; Ronen Kurzfeld, described as a founding member of CILA) and **Idea Immigration** (Surrey BC, with branches in Kelowna and Regina; moved from Officio) | https://visaflo.ca/blog/how-kurzfeld-law-enhanced-efficiency (3 Jan 2025) ; https://visaflo.ca/blog/idea-immigration-transformation (25 Jul 2024) ; homepage testimonials | Vendor claim |
| Kurzfeld: more than 100 cases, more than 50 hours saved, 30% less data entry (Jan 2025). The homepage now credits Kurzfeld with form filling cut *"60 to 5 minutes"* per case | same pages | Vendor claim; **the two figures do not agree** |
| Idea Immigration: form filling cut from about 60 to about 30 minutes per case, *"8+ hours"* saved a week. The case study and the homepage testimonial quote two different named people at the firm (names withheld under rule 10) | same pages ; https://visaflo.ca/compare/officio | Vendor claim |
| Customer count: **not published.** Best independent proxy: **203 Chrome extension users** (26 Sep 2026). The extension is needed for portal autofill, so this is a rough upper sign of active practitioner users, not firms | Chrome Web Store listing | Verified (the number). What it means: Inferred |
| LinkedIn reach: 92 followers; recent posts get 1 to 11 reactions | https://www.linkedin.com/company/visaflo/ | Verified (page counters) |

---

## 8. Positioning and messaging

- **2024:** forms first. *"Turbotax for Immigration Applications"* (VCBacked); IMM forms *"in less than 1-minute"*; "first Canadian immigration software" to autofill the representative portal (10 Sep 2024 post). Sources as cited above. (Vendor claim)
- **2025:** whole-practice CRM plus forms plus AI extraction and drafting. *"AI data extraction, IMM PDF autofill, and IRCC portal filing"* appears on every blog page. (Vendor claim)
- **2026:** an "AI-native practice" story built on agents. *"Powering AI-native immigration practices"*, *"Make judgment calls, not hires."*, *"You stay the decision maker."* The guardrails are said to be *"built into the product, not written in a policy doc"*. The pitch is labour replacement (fewer hires), with the licensed practitioner kept as the decision-maker. (Vendor claim, https://visaflo.ca/)
- **Named rivals:** Officio ("legacy"), CaseEasy, Visto ("just an assistant") and Clio (generic legal software). They publish side-by-side tables dated July 2026 with downloadable PDFs. (https://visaflo.ca/compare)
- **AI stance in the blog:** AI is assistive and the practitioner stays responsible. *"AI cannot assess risk, interpret intent, or provide regulated advice."* (13 Dec 2025 post). The Terms say automated features *"are aids only"*. (Vendor claim)
- **Third-party view:** a rival vendor's comparison (InfraBit, 9 Aug 2026) ranks VisaFlo as best for "filing-heavy practices", with less emphasis on marketing and the lead side. https://infrabit.co/best-immigration-crm-canada/ (Verified as an independent view, but written by a competitor)

---

## 9. Security and compliance claims

| Claim | Evidence | Label |
|---|---|---|
| Hosted on **Google Cloud Platform** in Canadian regions; encrypted in transit and at rest; role-based access; scheduled backups with alerts; *"regular security reviews"*; workspace isolated per firm | https://visaflo.ca/security ; https://visaflo.ca/ | Vendor claim |
| **No SOC 2, ISO 27001 or similar certification claimed.** PIPEDA is not named on the security page | https://visaflo.ca/security | Verified (absence) |
| A 2025 blog post claims end-to-end encryption, two-factor login, audit trails and consent tracking | https://visaflo.ca/blog/data-privacy-immigration-consultants-bc | Vendor claim (not repeated on the security page) |
| **AI model providers are not named** anywhere: security page, privacy policy or terms | same pages | Verified (absence) |
| The homepage says nothing in the firm's knowledge vault is used to train anyone's models. The privacy policy (25 Sep 2026) is **silent on AI training**; it says only that client data is never used for automated legal or eligibility decisions | https://visaflo.ca/ ; https://visaflo.ca/legal/privacy-policy | Vendor claim; the gap is Verified |
| Liability capped at fees paid in the last 12 months; the customer indemnifies VisaFlo for its professional services | https://visaflo.ca/legal/terms-conditions | Vendor claim |
| Independent of CICC and IRCC (disclaimer) | https://visaflo.ca/rcic-software | Vendor claim |

---

## 10. Multi-country support

- Built for Canada only: IRCC forms and portals, BC PNP. (Vendor claim)
- **One US form:** a DS-160 questionnaire with form filling was added in Oct 2025 (changelog). The Primer demo-day snippet (Mar 2024) mentions Canada **and the USA**. **Inferred:** a US expansion has been explored, but nothing on the 2026 site markets it.
- The Monitor tracks processing times "across programs and countries", which means the applicants' countries, not other destination countries. No country-pack or jurisdiction framework is described. (Vendor claim, https://visaflo.ca/monitor)

---

## 11. Weaknesses and gaps (from evidence, not opinion)

1. **No independent reviews.** We found no listing or reviews on G2 or Capterra (both blocked our checks with 403; search found none), no Reddit or Facebook discussion (Reddit could not be fetched; search found none), and only one rating on the Chrome store. Reputation rests on two named customers. (Verified absence, with the access limits noted)
2. **Very small team and little capital:** about 4–6 people and about USD 289K disclosed. They market a three-agent platform, a monitor, trust accounting, a chatbot, consultations and a public API at the same time. (Verified and Inferred)
3. **Much of the AI story is announced, not shipped:** the whole-file AI review is "coming soon", the Monitor is "launching soon", trust accounting was "launching in July", and the scanning and review agents were "new" in roughly the last week. Product access is by invitation. (Vendor claim)
4. **Inconsistent numbers and facts:** time savings of 60→5, 60→30 and 30%; three city names; customer contacts that differ between pages; a past blog post rewritten. (Verified by comparing pages)
5. **Portal autofill is fragile by their own account:** layout changes break it, the tab must stay open, and users should be ready to finish manually. It was rebuilt once (server-side to browser extension). (Vendor claim)
6. **Trust gaps for regulated buyers:** no security certification; AI provider not named; the privacy policy does not cover AI training; a Korean legal entity behind a "built in Canada" brand. (Verified absence)
7. **Pricing is opaque and mixed:** "all included" next to per-autofill charges, and the trial length has changed three times. (Vendor claim)
8. **The public changelog stopped in Nov 2025.** Product changes in 2026 cannot be checked month by month. (Verified)
9. **Their own guardrails and their AI features may conflict:** the chatbot "never assesses eligibility", yet the lead agent "qualifies leads" and the comparison tables claim "eligibility scoring with pathway recommendation". (Inferred)
10. **Possible channel conflict:** the same publisher appears to run OpenVisa, a CA$49 do-it-yourself spousal-sponsorship tool whose site says applicants do not need a consultant (section 17). Firms buying VisaFlo may see this as competing with them. (Verified listing; ownership Inferred)

---

## 12. Their AI direction (evidence-based)

**Timeline of AI items (all Vendor claim unless marked):**

| When | What appeared | Source |
|---|---|---|
| Mar 2024 | Pitched as automated immigration document creation (Primer Demo Day) | wowtale snippet (Verified, snippet) |
| Jul–Sep 2024 | Rule-based form automation, history gap checks, CRS calculator; homepage-era banner "AI data extraction" | 2024 FAQ, changelog |
| Sep–Oct 2024 | Representative-portal autofill beta (spousal sponsorship only; credentials held by VisaFlo) | blog 10 Sep 2024; email 2 Oct 2024 (E2, Verified) |
| Mar 2025 | AI draft writer and content suggestions; stored portal credentials removed | changelog 2025-03 |
| Apr 2025 | Portal autofill moved to a Chrome extension | changelog 2025-04 |
| May–Jul 2025 | Text recognition plus AI document reading and extraction; Word/Excel input; AI document validation; multi-pass extraction; review screen for extracted data | changelog 2025-05/06/07 |
| Oct–Nov 2025 | Public API, webhooks, "upgraded AI model", AI-assisted drafting, review mode | changelog 2025-10/11 |
| 13 Nov 2025 | AI letter drafts in the firm's own style, plus a sidebar assistant citing official sources | blog |
| Jul 2026 | Comparison tables: eligibility scoring, website AI chatbot, AI meeting notes, trust accounting "July", IRCC alerts "soon" | /compare pages |
| Late Sep – early Oct 2026 | Relaunched story: three agents per case, five guardrail layers, firm knowledge vault, scoped agents, agents created from email or WhatsApp; scanning and review agents; retainer-to-invoice automation under "Agents"; Claude and ChatGPT logos; Terms and Privacy updated 25 Sep; extension updated 26 Sep | homepage; LinkedIn; legal pages; Chrome store |
| 7 Oct 2026 | OpenVisa extension (consumer spousal-sponsorship tool, AI scanner, 13 languages) updated in the Chrome store under "Offered by VisaFlo" | section 17 |

**What they are building toward (Inferred, from the evidence above):**
1. **From tool to digital staff.** The 2026 message sells fewer hires. Agents own the end-to-end flow (enquiry → consultation → intake → document chase → review → forms and portal → monitoring after filing), and the practitioner approves at fixed release points. This is close to the AI Worker idea in our own brief. VisaFlo is **already marketing it**, even though several parts are still announced.
2. **Learning each firm's own practice.** The "knowledge vault" (checklists, precedents, tone) and drafting "in your style" point to per-firm tailoring of agent output, not one shared method.
3. **Messaging channels as intake.** Email and WhatsApp messages become questionnaire answers, follow-up emails are drafted automatically, and documents are read on arrival.
4. **Watching after filing.** Changes on official pages, processing times, letters and deadlines mapped to live cases, and a "pre-submission score". This would move them from preparing files toward managing a file's whole life.
5. **Paid by use.** Per-autofill charges and "usage-based charges" suggest that agent and AI work may be billed by use on top of a firm plan.
6. **Guardrails as a selling point.** Human release, scoped switch-on, a pause control, the chatbot's disclaimer that cannot be removed and its routing to consultations, and the claim that the boundary is built into the product.
7. **Reusing the same engine for applicants directly.** OpenVisa reuses the same pieces (questionnaire, AI scanner, 13 languages, PR-portal extension) for a do-it-yourself product sold to couples (section 17).

**What the evidence does *not* show (Unknown):** which AI models or providers they use; whether agent output is repeatable (same input, same result); whether there is an audit trail of agent actions (only a 2025 blog mention of "audit trails"); how signing-off is recorded; any evaluation or accuracy figures; any AI hiring; whether the agents are live for all customers or for a few.

---

## 13. Areas the comparison covers (see section 16)

- Lead capture, website chatbot and its advice limits; consultation booking with payment and AI notes
- Intake questionnaires by case type, languages, AI document reading
- Review, locking and validation rules; the planned whole-file score
- IMM PDF generation; IRCC portal filling (browser extension) and its fragility
- Retainer, e-signature, invoicing, trust accounting
- Agents: their scope switches, pause, human release, knowledge vault (to set against our Doers and Conductor and our AI Worker sign-off)
- Monitoring of official changes and letters after filing
- Security certifications, AI provider disclosure, audit trail, data residency, legal entity
- Multi-country support (to set against our country packs)
- Pricing basis: per firm with case volume plus per-use charges, against our CAD 199 per seat and the open per-firm decision

---

## 14. Blog posts: full list (57 on visaflo.ca/blog; the inblog.ai copy holds the same posts with dates a day apart in some cases)

"Read" means the post was opened for this study. "Title" means it was judged by title and listing only. Dates are as shown on visaflo.ca/blog. Base URL: https://visaflo.ca/blog/ (inblog copies are at https://vflo.inblog.ai/<same slug>).

| # | Date | Slug | What it reveals | Read |
|---|---|---|---|---|
| 1 | 3 Jun 2026 | spreadsheets-to-crm-immigration-practice-2026 | Targets firms still on spreadsheets; migration pitch | Title |
| 2 | 1 Jun 2026 | automate-ircc-application-status-tracking-2026 | Status changes triggering client messages and tasks; feature not confirmed (possible roadmap) | Read |
| 3 | 29 May 2026 | whatsapp-messages-client-file-immigration-2026 | Interest in WhatsApp capture; no feature described (it appeared on the homepage and LinkedIn by Oct 2026) | Read |
| 4 | 27 May 2026 | reduce-imm-form-preparation-time-2026 | Treats forms as a data structure; core autofill pitch | Title |
| 5 | 25 May 2026 | tracking-application-deadlines-immigration-consultants-2026 | Deadline calendar theme; ties to the monitoring agent | Title |
| 6 | 22 May 2026 | how-rcics-save-time-case-prep-2026 | Time breakdown of casework (marketing) | Title |
| 7 | 20 May 2026 | stop-retyping-client-info-ircc-forms-2026 | Re-entry problem; autofill pitch | Title |
| 8 | 18 May 2026 | managing-multiple-ircc-portal-logins-2026 | Portal login and MFA pain; no VisaFlo credential feature described | Read |
| 9 | 15 May 2026 | rcic-double-data-entry-ircc-2026 | Data re-entry; one-record pitch | Title |
| 10 | 13 May 2026 | case-management-software-small-immigration-firm-canada-2026 | SEO page for small firms | Title |
| 11 | 11 May 2026 | case-management-software-solo-rcic-2026 | SEO page for solo RCICs (main segment) | Title |
| 12 | 8 May 2026 | cicc-cpd-requirements-2026-rcic-compliance | Regulatory content for the RCIC audience | Title |
| 13 | 5 May 2026 | innocent-misrepresentation-irpa-s40-rcic-2026 | Legal guide written by the marketing lead | Title |
| 14 | 30 Apr 2026 | gcms-notes-rcic-atip-guide-2026 | Legal-process guide | Title |
| 15 | 22 Apr 2026 | procedural-fairness-letter-response-rcic-2026 | Legal-process guide; relevant to letter drafting | Title |
| 16 | 22 Apr 2026 | pgwp-eligibility-field-of-study-freeze-2026 | Policy news | Title |
| 17 | 23 Mar 2026 | cut-immigration-case-prep-time-in-half | Claims 40% from unnamed "operational data"; client portal, checklists, batch processing claimed as included | Read |
| 18 | 16 Mar 2026 | why-canadian-immigration-software-non-negotiable-2026 | Category marketing | Title |
| 19 | 8 Mar 2026 | building-your-immigration-practice-a-simple-tech-stack-guide-for-rcics-120237 | Tech-stack advice; positions VisaFlo as the core system | Title |
| 20 | 22 Feb 2026 | best-social-media-platforms-for-immigration-consultants-in-canada-108551 | Practice-marketing content | Title |
| 21 | 31 Dec 2025 | why-rcic-websites-dont-convert-89573 | Website conversion theme (lead to chatbot); no feature described | Read |
| 22 | 24 Dec 2025 | what-rcics-should-do-when-ottawa-changes-immigration-policy-a-practical-workflow-88484 | Policy-change workflow; leads into the Monitor; no feature described | Read |
| 23 | 13 Dec 2025 | why-immigration-consultants-need-to-adopt-ai-in-their-workflow-visaflo-85268 | AI stance: assistive, practitioner in control | Read |
| 24 | 9 Dec 2025 | modernize-your-immigration-practice-with-visaflo-crm-the-canadian-solution-84170 | CRM positioning; no pricing | Read |
| 25 | 5 Dec 2025 | introducing-review-mode-your-immigration-case-quality-control-checkpoint-83474 | Review-mode launch (approve, lock, request changes) | Read |
| 26 | 1 Dec 2025 | how-rcics-can-turn-every-consultation-into-powerful-marketing-content-82234 | Consultation-to-content marketing | Title |
| 27 | 1 Dec 2025 | custom-immigration-forms | Firm-customised intake and templates launched | Read |
| 28 | 21 Nov 2025 | google-business-profile-for-rcics-the-hidden-power-visaflo-80447 | Practice-marketing content | Title |
| 29 | 13 Nov 2025 | introducing-new-visaflo-ai-submission-letter-generator-79336 | AI letter drafts and the sidebar assistant | Read |
| 30 | 8 Nov 2025 | how-to-build-a-sustainable-referral-network-as-a-new-rcic-78551 | Targets new RCICs | Title |
| 31 | 31 Oct 2025 | how-to-get-found-on-google-nap-matters | Local SEO advice | Title |
| 32 | 23 Oct 2025 | the-hidden-bottlenecks-slowing-down-rcic-operations-and-how-to-fix-them-75251 | Operations pain points | Title |
| 33 | 16 Oct 2025 | how-to-build-a-recognizable-rcic-brand-that-clients-trust-74234 | Branding (links to the white-label offer) | Title |
| 34 | 11 Oct 2025 | rcics-learn-from-moumita-instagram | Social-media content | Title |
| 35 | 6 Oct 2025 | data-privacy-immigration-consultants-bc | Claims two-factor login, audit trails, consent tracking; no hosting detail | Read |
| 36 | 1 Oct 2025 | top-rcics-instagram | Social-media content | Title |
| 37 | 25 Sep 2025 | free-intake-questionnaires-immigration-practitioners | Free Word questionnaires used as lead magnet (by the CEO) | Title |
| 38 | 24 Sep 2025 | many-rcics-waste-time-repeated-tasks | Automation pitch | Title |
| 39 | 24 Sep 2025 | ai-immigration-human-expertise | AI stance: human judgment needed; bias warning | Read |
| 40 | 9 Sep 2025 | smarter-lead-capture-immigration | Lead-capture theme (before the chatbot) | Title |
| 41 | 3 Jan 2025 | how-kurzfeld-law-enhanced-efficiency | Kurzfeld case: 100+ cases, 50+ hours, 30% less data entry | Read |
| 42 | 1 Oct 2024 | attract-and-manage-new-clients | Digital channels for client acquisition | Title |
| 43 | 11 Sep 2024 | immigration-updates-september-2024 | IRCC news digest (early form of the Monitor idea) | Title |
| 44 | 10 Sep 2024 | online-portal-autofill | Portal autofill beta; the inblog copy says spousal only; the visaflo.ca copy was later rewritten | Read (both copies) |
| 45 | 3 Sep 2024 | autofill-contact-information | Firm vs client contact details in forms (now an autofill setting) | Title |
| 46 | 29 Aug 2024 | applications-manually | Forms-automation pitch, part 2 | Title |
| 47 | 23 Aug 2024 | client-information-management | Client data management, part 1 | Title |
| 48 | 19 Aug 2024 | addressing-mononyms | Handling single-name clients in forms (care for detail) | Title |
| 49 | 13 Aug 2024 | visaflo-api | API for firms with in-house systems; no endpoints | Read |
| 50 | 13 Aug 2024 | visaflo-vs-clio | 2024 comparison; portal autofill then "developing" | Read |
| 51 | 6 Aug 2024 | ircc-updates-and-trends-july-2024 | IRCC news digest | Title |
| 52 | 5 Aug 2024 | managing-client-history | History overflow appendix, sorting, gap detection | Read |
| 53 | 2 Aug 2024 | about-us | 5-person team, Coquitlam, Primer-backed | Read |
| 54 | 31 Jul 2024 | officio-alternative | Portal autofill "in development" in Jul 2024; 60→30 minute claim | Read |
| 55 | 29 Jul 2024 | faq | 4-week trial, weekly releases, CRS calculator, Coquitlam | Read (inblog copy) |
| 56 | 25 Jul 2024 | idea-immigration-transformation | Idea Immigration case: custom work, reminders, tablets | Read |
| 57 | 23 Jul 2024 | caseeasy-crm-alternative | 30-day money-back guarantee (2024) | Read |

The visaflo.ca index shows no posts between 3 Jan 2025 and 9 Sep 2025. In that period, product news appeared only in the changelog.

---

## 15. What we could not find or open (honest limits)

- **How the pages were read:** every page was read through an automated page reader that returns a summary. The short quotes above are as that reader returned them. Before any quote is used in investor material, check it against the live page.
- **LinkedIn:** the public company page was readable (posts shown with relative dates only). Personal profiles were blocked (HTTP 999), so CEO details come from search snippets. Exact post dates are Unknown.
- **G2, Capterra, ZoomInfo, thevc.kr, wowtale.net:** returned 403. Reddit could not be fetched. Facebook RCIC groups need sign-in, so they were not checked.
- **Not found anywhere:** prices, customer count, revenue, later funding, job postings, AI model provider, security certifications, podcasts or interviews with the founders, or any press beyond the demo-day snippet.
- **Not used:** the product itself (it is invitation-only; we never sign in).
- **Contradiction left open:** VisaFlo's current homepage and the extension listing describe portal autofill without stored credentials, while the 2 Oct 2024 email described registering credentials. The changelog suggests the change happened in Mar–Apr 2025 (Inferred).
- **For the wider study (B14):** a separate product called "VisaFlow Pro" (The Giant Reach) is easy to confuse with VisaFlo. It was not studied here. OpenVisa is covered in section 17.

---

## 16. VisaFlo vs Expat Ready

**Read this first (the honest frame).**
- **The two sides are not at the same stage.** On VisaFlo's side, most rows are features they say are live in a product sold today (Vendor claim). On Expat Ready's side, **every row is a written requirement. It is specified, not built or shipped.** The inventory itself records that "Case table and most of the case spine not built" (`design/inventory/ag-frs-1.md`, slice summary, citing AG-07 §12). Wherever VisaFlo has something live and we have it only on paper, we treat that as them being ahead today.
- **Sources for Expat Ready facts:** `sources/drive-snapshot-2026-10-09/02-functional-requirements/…`, reached through the W1 inventory files `ai-workers/design/inventory/ag-frs-1.md` (AG-01 to AG-09, Overview v1.11, Phasing v1.4), `ag-frs-2.md` (AG-10 to AG-18), `sa-frs.md` (SA-01 to SA-12), `doc4-portal.md` (CP-1 to CP-9) and `foundation.md` (Doc 1, ADR, Charter, SCOPE-TRIAGE). Each row gives file, version, requirement ID and a short exact quote as recorded there.
- **Who approves, in plain words.** Our requirements say AI work is **approved by a named person, licensed by default**. They do **not** promise a product-enforced licensed sign-off. AI-written client text needs approval that "SHALL NOT be lowered by the firm, by a recipe, or by any setting" (AG-10 v1.9, AG-10-44). By default the approver is a licensed user, but "the Owner may allow other roles" (Overview v1.11, AG11-D11). If no licensed user is active, the Owner may approve and this is recorded as approved without a licensed user (AG-10-44, SA6-D9). Also: "The permission system never checks licence" (SA-06 v3.1, SA6-D9). The founder's decision AIW-D13 (9 Oct 2026, `ai-workers/decisions.md`): each AI Worker *"acts on behalf of a named licensed person, with only that person's permissions"*, with no AI identity of its own, and FD-16 kept. Whether this is enough for regulated advice and filing: **confirm with counsel / RCIC**.
- **AI at launch.** The four AI Doers are Reader (reads documents), Sorter (files incoming messages), Drafter (writes drafts) and Checker (cross-checks values). They are in Release 1 but **built and switched off**: *"AI Doers SHALL be off for every firm, with the switch locked"* until the Super Admin records the provider, a Canada-only processing region and a no-training / no-retention agreement (AG-11 v1.11, AG-11-93). *"One firm switch covers all four AI Doers"* (AG-16 v1.12 §3.9, AG-16-35).
- **Scope risk that cuts against us.** SCOPE-TRIAGE (5 Oct 2026, which calls itself "not a requirements document") **proposes** moving several of our differentiators to a later release:
  - the Sorter and Drafter AI
  - "'Needs you' inbox + 'Done for you' home screen"
  - autonomy levels on every action
  - Team safeguards
  - licence-aware approval
  - "The 4 AI Doers and their release gate"
  - the "Tamper-evident hash chain + verifier"

  Source: `foundation.md`, notes on SCOPE-TRIAGE, AG-10/AG-11/AG-13 rows. The module requirements (AG-10 v1.9, AG-11 v1.11, 7 Oct) still keep them in Release 1. **Undecided.** Any "we go further" claim below that rests on these items holds only if Release 1 keeps them.

### 16.1 Comparison table

Column key: **VisaFlo** = what they do (status; label; source). **Expat Ready** = how our requirements cover it. **We go further** = only where our requirements clearly specify more. **They are ahead** = honest. **Our release** = R1, later, parked or not specified.

| # | Area | VisaFlo | Expat Ready (file, version, ID, short exact quote) | We go further | They are ahead | Our release |
|---|---|---|---|---|---|---|
| 1 | Lead capture and qualification | Lead CRM, website forms, CRS widget: live (claimed); Vendor claim; https://visaflo.ca/crm. Lead agent "qualifies leads": Vendor claim; https://visaflo.ca/ | Seven capture sources: manual, web form per language, inbound API, CSV import, referral, WhatsApp/social, booking page (AG-02 v1.9 §3.1). Duplicate handling: "never silently create a duplicate or silently merge" (AG-2-15). Eligibility by the **Qualifier**: "deterministic pure function over (resolved inputs, pack version)" (AG-03 v1.4, AG-3-39); "Scores and recommendations never become promises" (AG-02 v1.9 §3.7) | Eligibility is rule-based and reproducible: same inputs and same pack version give the same result, with the pack version stamped (AG-03 §3.7). A consent check runs at every send (AG-10 v1.9 §3.6). An unknown WhatsApp number becomes a lead only when "A person clicks it" (AG-02 §3.1) | Theirs is in use today; ours is specified only | R1 |
| 2 | Website AI chatbot | Live (claimed); answers from firm-approved sources in 13 languages, consent capture, fixed disclaimer, *"Never assesses individual eligibility"*; Vendor claim; https://visaflo.ca/chatbot | **Not specified.** No website chatbot appears in the W1 inventory of AG-01 to AG-18, SA-01 to SA-12 or CP-1 to CP-9 (Unknown: absent from requirements) | — | **Yes, clearly.** A visitor-facing AI that captures leads after hours. *Proposal:* candidate AI Worker for W2, bounded by our no-advice and consent rules | Not specified |
| 3 | Consultations | Paid booking, calendar blocking, Zoom/Meet links, reminders: live (claimed); **AI meeting notes**: live (claimed); Vendor claim; https://visaflo.ca/consultations | Scheduler (AG-04 v1.5): public booking page per language (§3.3); paid consults through the Biller (§3.10); Google/Outlook sync (§3.9); in-house video room by default, or the firm's Zoom/Meet/Teams (§3.6); consult record → proposal through Drafter → Signer (§3.12). The host writes the notes. "Live SMS / WhatsApp reminders (Phase-2)" (AG-04 §13) | In-house video room by default. One chain from consult to proposal to e-signature to invoice. Consent per language (CASL, Law 25) | **AI meeting notes**: we have no requirement for transcription or automatic notes. WhatsApp reminders: theirs today, ours Phase 2 | R1 (AI notes not specified) |
| 4 | Intake questionnaires and languages | Case-type questionnaires with branching; firm-customised intake; **13 languages**: live (claimed); Vendor claim; https://visaflo.ca/intake | Smart questionnaire (AG-08 v1.7 §3.4–3.12): version pinned per case, live branching, "Server-side validation of every answer" (AG-8-17), submit locks, targeted change requests. Client portal "SHALL render fully in EN + Canadian French" (CP-1-12). Legal and consent text "never machine-translated" (SA-05 v2.2, SA-5-15) | Questionnaire versions are pinned per case, so an answer is always read against the questions actually asked. Legal text is written by people in both languages | **Languages: 13 against our 2.** Launch languages beyond EN/FR are an open founder question (`doc4-portal.md`, CP-1 open questions). Note: SA-01 v2.2 SA1-D2 makes French optional for Canada while SA-05 requires it (conflict in `sa-frs.md`) | R1 (EN/FR) |
| 5 | AI document reading | AI extraction from IDs, earlier IMM PDFs and Word/Excel questionnaires; passport MRZ check: live (claimed) since May 2025; Vendor claim; https://visaflo.ca/intake ; changelog 2025-05 | **Reader** (AI): Reader values reach the profile "only when a person approves in the Reader's review view" (AG-08 v1.7 §3.6); "approval IS the verification" (AG-9-45, AG-8-44). Reads identity documents, IRCC letters (deadlines go to the Minder only after approval), language results and education credential reports (`ag-frs-1.md` summary). Gated by AG-11-93 | Every value shows its source and a confidence level next to the document region (AG-8-41). The approval itself is recorded as the verification. AI runs only with a recorded Canada-only, no-training provider. "Every AI path keeps its manual fallback" (Phasing v1.4, Release gate) | **Yes.** Theirs has been in use for more than a year (claimed). Ours is off at launch until a provider is recorded, and the confidence thresholds are still open: "until thresholds are set, every Reader value … routes to review" (AG-11 §13 Q11) | R1, built but off |
| 6 | Client messages, chasing, message-to-answer | WhatsApp and email pulled into the case (Vendor claim, https://visaflo.ca/). Agents that turn client messages into questionnaire answers and draft chase emails: **announced** about 2 Oct 2026; Vendor claim; https://www.linkedin.com/company/visaflo/ | **Sorter** (AI) matches incoming email and WhatsApp to files: "A match made only by the AI ... is never filed automatically" (AG-10 v1.9 §3.2). WhatsApp in and out in R1, "built and switched off until Super Admin records a provider" (AG-10-43). Missing-document chase recipe (AG-11 v1.11 §3.5). Drafter output is "always followed by a send action whose autonomy is at least APPROVE" (AG-11 §3.3) | Consent is checked at every send. Passport and financial numbers are "never put into the content of emails, WhatsApp messages or notifications" (AG-11 §11). One conversation per client across channels (AG-10 §3.4) | **Turning a client's free-text message into questionnaire answers is not specified** in our requirements (Unknown) | R1 (AI and WhatsApp gated; SCOPE-TRIAGE proposes moving Sorter/Drafter AI later) |
| 7 | Review, validation, whole-file check | Review mode (approve, lock, request changes), rule checks, AI document quality check: live (claimed). Whole-file AI review with a **pre-submission score**: **coming soon**; Vendor claim; https://visaflo.ca/review | AG-08 v1.7 §3.10–3.12: submit locks, targeted change requests. **Checker** (AI): cross-checks name, date of birth, document numbers and dates; "warnings — never a lock" (AG-11 v1.11 §3.0; AG-7-61). Rule-based Reviewer readiness and Deficiency Library (AG-07 v2.7 §3.6). Team safeguards: "four-eyes on government forms" (Overview v1.11), automatic at 5 or more staff. Passing a critical warning needs a permission and a reason (AG-5-51) | Rule-based checks sit underneath, and AI only adds warnings to the same list. A second person reviews government forms once a firm has 5 or more staff. Every waiver records who and why | Their AI document-quality checks (blurry scan, wrong document type) are live (claimed). The release scope of our Deficiency Library is **undecided**: "The spec keeps them in Release 1; SCOPE-TRIAGE (5 Oct) proposes Release 2 for each, undecided" (AG-07 §13 item 22) | R1 / undecided |
| 8 | IMM PDF form filling | Core strength; live (claimed) since 2024; many IMM forms; Vendor claim; https://visaflo.ca/autofill | **Parked for Release 1.** "Release 1 does not file electronically with the government and does not auto-fill government forms (parked by the team, SA1B-D28)" (Charter V2 notes, in `foundation.md`). Reason given: "a generated value on a signed form cannot be traced by a reviewer" (SA-01B v1.2, SA1B-D28). The Filler is specified in AG-07 but held back. *Inferred:* in R1, staff complete IRCC forms outside the product (`doc3-firm.md`) | Only a principle for now: every value must be traceable on a signed form. Nothing is built | **Yes, decisively. This is our biggest gap against them**, and the area their customers name first | Parked (later) |
| 9 | IRCC online portal filling | Chrome extension for PR, Express Entry, citizenship and BC PNP portals; live; **Verified** (203 users); https://chromewebstore.google.com/detail/visaflo-autofill-extensio/kndagmebkjldnepmbmmkdnopohefghjh | Not specified. Boundary: "No Doer action SHALL submit anything to a government authority, at any autonomy level" (AG-11 v1.11, AG-11-54). "Filing recorded" means staff file on the portal themselves and record it (Charter V2 notes, `foundation.md`) | The no-submission rule is written as a fixed rule (VisaFlo also says it never files on its own) | **Yes, fully.** We have no portal filling at all | Not in R1 |
| 10 | Letter and document drafting | AI draft writer: live (claimed, Mar 2025). AI submission and explanation letters in the firm's own style: announced 13 Nov 2025. Vendor claim; https://visaflo.ca/blog/introducing-new-visaflo-ai-submission-letter-generator-79336 | **Drafter** (AI) proposes client messages and never sends (AG-10 v1.9, AG-10-15, AG-10-44); it "never promises an outcome" (AG-10 §3.3). Template merge for documents (AG-09 v1.8 §3.7; AG-05). An `AiRunLog` for every model call (AG-11 audit) | The approval floor cannot be lowered by anyone. A no-guarantee rule applies to wording. Every model call is logged | AI drafting of **submission or explanation letters** is not specified in our requirements; Drafter covers client messages and templates (Unknown beyond that). Theirs is in use (claimed) | R1, built but off (letters not specified) |
| 11 | Retainer, e-signature, invoicing | Retainer from lead data, e-signature with certificate, Stripe invoices, QuickBooks CSV: live (claimed). Won → retainer → invoice automation: announced about 2 Oct 2026. Vendor claim; https://visaflo.ca/crm ; LinkedIn | **Signer** in-house: "tamper-evident hashing, and a certificate of completion — entirely in-house" (AG-05 v1.9 §1). Signing marks the prospect Won "and tells Biller to invoice" (AG-05 §3.11). **Biller** on the firm's own Stripe Connect: "The platform never holds client money" (AG-06 v1.7 §3.3). Dunning in the client's language (AG-06 §3.2). Paper-signature path needs a reason (AG-5-39) | Fingerprints (SHA-256) of both the original and the signed PDF. Client and firm sign in order. An unsigned retainer is flagged at submission (AG-5-51). The firm's own payment account | Their chain is in use (claimed). Ours is specified. They export to QuickBooks; ours is meant to replace it ("replaces QuickBooks", Overview v1.11) | R1 (refunds Phase 2, AG-6-23) |
| 12 | Trust accounting | "Launching in July" (2026); status Unknown; Vendor claim; https://visaflo.ca/compare/caseeasy | "SHALL NOT present itself as a regulator-compliant trust-accounting ledger" (AG-06 v1.7, AG-6-24). Records are tagged and exported for the firm's trust accountant | We are honest about the boundary until trust accounting is done properly | If they ship it, yes | Later (Phase 2/3) |
| 13 | AI agents and guardrails | Three agents, workflows switched on per scope, pause, human release, firm knowledge vault: presented as live; Vendor claim; https://visaflo.ca/ | **Conductor and Doers**: "the Conductor is the brain; the Doers are the hands" (AG-11 v1.11 §3.0). Three autonomy levels (Send automatically / Ask me first / Off) with floors; "The floor cannot be lowered by anyone" (§3.3). **Needs you** inbox shows what will happen, why and where each value came from: "the Doers prepare; the practitioner decides" (§3.13). "Nothing in it executes on timeout" (Overview v1.11). Dry run before acting (§3.7). Each action runs once only, with retry (§3.6). Run history (§3.9). One AI switch, locked off until provider terms are recorded (AG-16 §3.9, AG-11-93). Platform kill switch is pending (SA-12). AI Workers act on behalf of a named licensed person (AIW-D13) | The fixed floors, the dry run, run-once actions, an AI log per call and a full record of every approval are **written requirements we can test against**. VisaFlo publishes none of this. Underneath, the engines are rule-based (Qualifier, country packs), so the AI proposes and the rules decide. **We do not claim a product-enforced licensed sign-off** (see the frame above) | **They are selling it now; we have no AI Worker requirement yet** (Phase B). Our requirements do not cover a non-human user (AG-01 gap in `ag-frs-1.md`); AIW-D13 handles this by delegating to a named person. **Their firm knowledge vault (house style, precedents) has no equivalent in our requirements.** The automation builder is Release 2 (AG11-D3) | R1 minimal Conductor; AI Doers R1 but off; Needs you and autonomy R1 per AG-11 v1.11 (SCOPE-TRIAGE proposes later); AI Workers: Phase B |
| 14 | Deadlines, IRCC letters and rule changes after filing | Regulatory Monitor (watches official web pages, maps changes to cases): **launching soon**. Letter and deadline watching: shown on homepage. Vendor claim; https://visaflo.ca/monitor | **Minder**: "never miss a government deadline" (AG-11 v1.11 §3.4), driven by country-pack deadline definitions. R1 automations include a biometrics countdown and a PR card/status expiry watch (AG-11 §3.5). The Reader passes IRCC-letter deadlines to the Minder after approval. Rule changes arrive as **published country-pack versions**: "the version with the latest effective date on or before that date applies" (SA-01 v2.2 BR-3). Assessments are version-stamped with a stale flag (AG-03 v1.4 §3.7–3.8). "Rule update leaves open cases unchanged" (Charter V2, journey J9). Automatic re-run when a pack is published: Phase 2 (AG-03 §13) | Rule changes come in through a reviewed, versioned pack that a second person approves (Charter journey J1), not through AI summaries of web pages. Disputed results can be re-run exactly as they were (SA-11 v2.7 §3.9) | **Watching official web pages and mapping changes to live cases is not specified** in our requirements. They have designed it, though it is not launched | R1 (Minder, packs); web-page watching not specified |
| 15 | Client portal | Included; described only thinly; Vendor claim; https://visaflo.ca/compare/officio | CP-1 to CP-9: white-label, EN/FR, installable on a phone, works offline read-only, WCAG 2.2 AA (CP-1 §3.6). Client "you owe us" next actions (CP-2 §3.3). Rejection reasons shown in the client's language (CP-4 §3.5). Internal events "never in the client feed" (CP-2 §3.4) | A more detailed specification: accessibility, offline read-only, and internal vs client-visible events | None evident from public pages | R1 |
| 16 | Integrations | Gmail, Outlook, Google Drive, OneDrive, WhatsApp, Stripe, Zoom/Meet, QuickBooks CSV, webhooks, public API, SSO: mostly live (claimed); Vendor claim; changelog 2025 | In-house by design: outside providers only for AI/OCR, WhatsApp and mailbox connection, "each approved by Super Admin (SA-08)" (Overview v1.11). Gmail, Microsoft 365 and IMAP mailboxes, "all three in Release 1" (AG-10-4). Calendar sync (AG-04 §3.9). Stripe Connect (AG-06 §3.3). Inbound API for leads (AG-02 §3.1). Migration from Officio and CaseEasy (AG-18 v1.2) | Fewer outside processors of client data. Every outside service must declare its data location (SA-08 BR-16). Migration from the two main incumbents is specified | Breadth today: Drive/OneDrive import, webhooks and single sign-on are live (claimed). Equivalents for us are Unknown in the inventory | R1 (other adapters R2) |
| 17 | Security, data residency, audit, legal entity | GCP Canadian regions; no certification claimed; AI provider not named; privacy policy silent on AI training; Korean legal entity. Vendor claim and Verified absence; https://visaflo.ca/security ; /legal/terms-conditions | Canada region declared, with warnings for any service outside Canada (SA-11 v2.7 §3.6). AI only with a recorded Canada-only, no-training / no-retention agreement (AG-16 §3.9). Audit "append-only"; "No audit-edit/delete API exists" (AG-13 v1.12, BR-10). Hash-chained audit spine (Doc 1 §7.5; AG-13 BR-11). **But SCOPE-TRIAGE proposes moving "Tamper-evident hash chain + verifier" to a later release** (undecided). Personal data "never written to system logs or traces" (AG-11 §11). Certifications and our legal entity: Unknown (not in requirements) | The AI-provider conditions (Canada only, no training) are written as a hard gate. An append-only audit holds even without the hash chain. A record of where data lives is generated, with warnings | They host live data today. We have nothing running yet. **Neither side shows a certification** | R1 (hash chain possibly later, undecided) |
| 18 | More than one country | Canada; one US form (DS-160); no country framework described. Vendor claim; changelog 2025-10 | Country packs hold each country's rules as data (SA-01 v2.2; SA-01B v1.2), with checks and a test run before publishing (SA-1-51, SA-1-52). "A firm has exactly one country" (SA-03 v2.14, SA3-D1). R1 runs Canada only (SA-01 §3.1). More packs come "Later" (Phasing v1.4) | Adding a country is meant to be adding data, not rebuilding, with the same checks and version stamps | Neither side has a second country live. They already have one US form | Canada only in R1; more countries later |
| 19 | Pricing basis | Per firm by case volume, unlimited users, plus per-autofill charges; no public prices. Vendor claim; https://visaflo.ca/rcic-software ; /legal/refund-policy | CAD 199 per seat published (per `ai-workers/README.md` §2 D4; **not in the requirements snapshot**). Per-firm vs per-seat is open. The launch limits have no AI usage meter (`doc2-admin.md` item 9) | — (W3) | "No per-seat fee" is an attractive message to small firms compared with our per-seat price. **For W3** | W3 decision |
| 20 | Who the customer is | Firms; but see OpenVisa, a do-it-yourself tool for applicants (section 17) | AIW-D11: *"Firms only"*. No applicant-facing AI Workers (`ai-workers/decisions.md`) | A clear position: we work through licensed firms only | — | Decided (AIW-D11) |

### 16.2 Net position, in plain words

- **Where they are ahead (today):**
  - Filling IMM PDF forms and the IRCC online portals. For us these are parked, or not specified at all.
  - AI document reading and AI drafting that are in use, not just written down.
  - A website chatbot.
  - AI meeting notes.
  - Intake in 13 languages.
  - Turning a client's messages into questionnaire answers (announced).
  - Watching official web pages (designed, not launched).
  - A per-firm knowledge vault.
  - Above all, they are **in the market with paying firms**.
- **Where our requirements go further (on paper):**
  - Fixed approval floors that nobody can lower.
  - A dry run before acting, and actions that run only once.
  - A record of every approval and every AI call.
  - Rule-based eligibility and country packs underneath, so the same input gives the same result.
  - A Canada-only, no-training gate on any AI provider.
  - A consent check on every message.
  - Version-stamped results that can be re-run exactly.
  - A design built for more countries as data.

  Several of these sit on the SCOPE-TRIAGE "move" list. **They count only if Release 1 keeps them.**
- **What we must not claim:** product-enforced licensed sign-off. We have no such enforcement. Our approval rule is "approved by a named person, licensed by default"; the product never checks a licence. The exact limits: **confirm with counsel / RCIC**.

---

## 17. OpenVisa: a do-it-yourself product that VisaFlo appears to run

| Fact | Evidence | Label |
|---|---|---|
| Chrome extension "OpenVisa: PR Portal autofill" is listed as **"Offered by VisaFlo"**, with developer email info@vflo.app. It has 1 user, no ratings, version 1.0.6 and was updated 7 Oct 2026. It fills four spousal-sponsorship forms (IMM 0008, 5406, 5562, 5669) in the PR portal from OpenVisa answers | https://chromewebstore.google.com/detail/openvisa-pr-portal-autofi/nkkekgdhalfcclpecnjkpkfpoikokpbo | **Verified** (store listing). Ownership by VisaFlo is likely but **unconfirmed**: the description and support contacts point to openvisa.ca, and the openvisa.ca site does not mention VisaFlo |
| openvisa.ca sells a do-it-yourself spousal-sponsorship tool to couples: **CA$49 one time**, help in 13 languages, an AI scanner that suggests answers from uploaded documents. It answers "No. You can apply on your own" to whether a consultant is needed, and calls itself *"software, not a lawyer or RCIC"* | https://openvisa.ca | Vendor claim (OpenVisa) |

**Inferred:** VisaFlo seems to be reusing its firm product (questionnaire, AI scanner, portal extension) to sell straight to applicants. This could create channel conflict with the firms it sells to. It also contrasts with the founder's decision AIW-D11 ("Firms only"). Confirm the ownership before using this in investor material.

# R6 — Specialist AI tools for company planning: independent check

**Claude, 7 October 2026. Coverage row C43.** This is an independent check of [Codex's note](../../company-planning/research/ai-tools-2026-10-07.md).

**Method:** I used vendors' own pages, help articles, terms and pricing, plus dated benchmarks and papers. I created no accounts, started no trials, uploaded nothing and contacted no vendor, so **no tool has been tested**. Every quality statement below is either a vendor claim or a third party's finding. "Checked 7 Oct 2026" applies to every source in §8.

**Conflict of interest:** I am a Claude model. Some benchmarks below rank Claude models first. I have not used those rankings to recommend Claude products, and the test I propose uses a non-Claude tool, so the author of the plans is not grading its own work.

**Status:** this is research, not a decision. Any trial, purchase or upload of company material needs the founder's separate authorization.

---

## Conclusion

1. **No vendor proves its training claims.** None of the five vendors publishes a model card (a public technical description of the model), training method or evaluation. Two make training claims, and these remain claims. Plan Pilot says its system is "fine-tuned". Upmetrics says it runs a "proprietary GPT-4o layer – specifically trained", yet its terms name OpenAI and Anthropic as its providers.
2. **None of the five can produce our cash model.** We need a spreadsheet whose formulas still work after export, and none of them provides one:
   - Upmetrics exports values only.
   - LivePlan exports a CSV file (plain values).
   - PrometAI, Venturekit and Plan Pilot list no Excel export.
   - Plan Pilot also appears not to be running: its privacy page returns an error and its app does not load.
3. **The best independent evidence tested general models and Excel add-ins, not plan apps.** Five sources are dated and independent of the plan-app vendors (§2). In all of them, structure and formulas usually came out right, but the numbers often did not. No AI output was ready to hand to a client or investor without review.
4. **The smallest useful addition is a check, not a tool.** Add two steps to the workbook review:
   - plant known errors in a copy of the workbook and see whether the review finds them;
   - recalculate the key outputs independently and compare.
5. **Codex's comparison test is not worth running as designed.** If the founder wants one test, it should cover a single task: auditing a cleaned copy of the workbook with planted errors. The candidates would be ChatGPT for Excel (only if an existing subscription already includes it) and, optionally, Shortcut.

---

## 1. Verification of Codex's table

| Candidate | What Codex said | My verdict | Evidence, and what Codex missed |
|---|---|---|---|
| **Upmetrics** | Takes a website or document as input. Terms name OpenAI and Anthropic. Suggested as the first sample candidate. | **Agree on the facts. Disagree that it should be the first candidate.** | **Input:** confirmed. Website, document or chat (help page updated 2 Sep 2026). **Providers:** they are named only in **§6.4** of the terms ("currently OpenAI and Anthropic"), not in §3. **Missed training claim:** Upmetrics' "llm-info" page (Sep 2026) says "proprietary GPT-4o layer – specifically trained for business planning…". No method or evaluation is given, so this is a claim. **Missed export limit:** "When you download your finance report, the Excel sheet won't include any formulas" (help page, 14 Sep 2026). That rules it out as the cash model. **Other exports:** the plan exports to PDF or Word, the deck to PDF, PPT or PNG. **Data terms:** your content is "not used to train third-party AI models", but "anonymized prompts and metadata" may be used to improve the service. You own the AI output. Backup copies are typically overwritten within 90 days. **Price:** "$14 a month billed yearly" for the entry plan. |
| **LivePlan** | Its assistant suggests revenue and cost categories but does not create figures. | **Agree.** | The help page (9 Sep 2026) says the assistant "does not build your financial forecast" and "doesn't generate specific financial figures". **Missed:** the forecast exports "as a CSV file", so no formulas. The terms of service were last revised 18 Dec 2019 and contain no AI clauses. No AI provider is disclosed. A connector that lets outside AI assistants work inside LivePlan, launched as an "early access experiment" (20 Aug 2026), lets Claude, ChatGPT or Gemini read and write the plan, forecast and scenarios. In other words, LivePlan is positioning itself as the calculation engine underneath a general AI model, not as a better model. **Price:** US$15–30 a month billed annually. |
| **PrometAI** | Markets valuation and investor-ready output. Formulas need checking. | **Agree, and it is weaker than Codex implied.** | **Exports:** the pricing page lists PDF, and PowerPoint only on the top "Investor-Grade" plan. Excel is not listed. Its claim of "valuation models with the assumptions visible" therefore cannot be checked outside the app. **Data terms:** the terms (16 Jun 2026) give PrometAI "a limited, non-exclusive, royalty-free license to access, use, reproduce, modify, and display your content". De-identified, aggregated data may be used to improve services. No AI provider is disclosed. **Price:** our fetch showed prices in Indian rupees, so I could not confirm the US-dollar price on an official page. |
| **Venturekit** | Markets AI business-plan writing. No evidence of task-specific training. | **Agree.** | **Claims:** the vendor says "we do not use it to train our AI". "3x more likely to secure loans" and the endorsements it lists are unsupported marketing. **Fit:** the product is US-oriented ("SBA-approved format", US limited-company formation). **Export:** PDF is shown, no Excel. **Terms:** Venturekit Inc.; the terms have no AI clauses and no date. **Price:** free; Pro US$8 a month billed annually; Agency US$38 a month. |
| **Plan Pilot AI** | Says it is fine-tuned for business plans and claims no hallucinations. | **The quote is accurate, but the tool should be ruled out, not kept as a lead.** | The page does say "our system is fine-tuned specifically for creating structured, data-driven business plans" and "We've cracked the problem of AI hallucination." **Missed:** the privacy-policy link returns HTTP 404 and the app login (ai.planpilotai.com) returns HTTP 530 (the site's server is not answering). The footer says "© Copyright 2025" and names no legal entity. We cannot test it, cannot read its data terms and cannot contract with it. |

**Where I agree with Codex:**
- Its table of what "specialized" can mean.
- Its overall recommendation: keep the current workflow and buy nothing yet.
- Its point that OpenAI recommends this order: write tests that measure output, then improve instructions and context, and only then consider fine-tuning. I checked that guidance.

**Where I disagree:**
- **Upmetrics as first test candidate.** For our job its decisive limit is the values-only Excel export, which Codex did not find.
- **Plan Pilot as an "evidence lead".** A marketing sentence on a site that appears not to be running is not evidence.
- **Testing three outputs per vendor.** Most of those outputs fail basic requirements before any scoring (§5).

---

## 2. New candidates and stronger evidence

### 2a. Independent and dated evaluations

No vendor of a business-plan app has published a model card, named training method, evaluation method or independent benchmark. A search of Hugging Face found nothing relevant either. The useful evidence covers general models and Excel add-ins:

| Source (date) | What was tested | Finding relevant to us |
|---|---|---|
| **Vals AI, Excel Modeling Benchmark** (updated 6 Oct 2026) | 103 Excel financial-model tasks written and checked by experts, including "Operating" models with ARR (annual recurring revenue) and churn. Only base models were tested, no business-plan or financial-planning apps. | Top score 76.67%. The leading model passes "89% of formula… but only 64% of numerical checks". Even top scores are "substantial-but-incomplete… not client-ready". |
| **FrontierFinance**, Kensho / arXiv 2604.05912 (7 Apr 2026) | 25 long financial-modelling tasks (about 18 expert hours each). Graded by human experts. | Experts scored 77.2%, GPT-5.4 70.9%, Opus 4.6 61.8%. The AI agents "often replaced formulas with static values" (typed-in numbers), so models looked complete but could not be updated. They linked figures to the wrong periods and showed no "meaningful self-verification". |
| **BlueFin**, arXiv 2605.30907 (29 May 2026) | 131 finance spreadsheet tasks scored against 3,225 rubric points. | The strongest models scored "less than 50%", with "particular weaknesses in dynamic correctness" (whether results stay right when inputs change). |
| **Ankura, Office of the CFO** (23 Apr 2026) | Claude for Excel, Copilot Agent Mode, ChatGPT in Excel and Shortcut (free and Pro). Each built a long-range plan, a 13-week cash flow and a customer-profitability model from a single prompt. | "No tool produced a production-ready model". The formula mechanics needed rework. The authors note that working iteratively, over several prompts, would likely do better. |
| **Wall Street Prep** (page dated 29 Jun 2026) | The same four tools built Apple's three-statement model (income statement, balance sheet, cash flow). | Shortcut 5.9, Claude 5.5, Copilot 4.4, ChatGPT 2.5 out of 10. The weakest human analyst scored 6.4. Wall Street Prep sells training and runs an "AI Tools Advisory", which may colour its view. |
| **Csaszar, Ketkar & Kim**, arXiv 2408.08811 (Aug 2024) | General-purpose models drafting and evaluating startup strategies. | General models performed at a level "comparable to entrepreneurs and investors". The study is old and tested no specialist tools. |
| **DreamHost** (13 Mar 2025) | The vendor's own rubric for its business-plan generator, with the AI scoring its own drafts. | A published method, but it is not independent: the AI graded itself and humans did not check the scores. |

**What this shows:** the bottleneck is checking the numbers, not writing the prose or laying out the model. No evidence shows that any business-plan app is better on that bottleneck.

### 2b. AI tools that work inside the spreadsheet (formulas stay live)

| Tool | What the AI actually does | Formulas | Data terms | Price |
|---|---|---|---|---|
| **ChatGPT for Excel and Google Sheets** | Builds, updates and explains workbooks from a sidebar. Codex can also work on an open workbook. | Writes into the live workbook | Follows the ChatGPT plan's terms | Included in Free and Go (limited), Plus, Pro and Business plans |
| **Claude for Excel** | Explains models with clickable cell references, changes assumptions "while keeping formula relationships intact", finds errors and builds models. | Native Excel formulas | Inputs and outputs are deleted "within 30 days". The vendor says it is "not recommended for… final client deliverables without human review". | Included in Pro, Max, Team and Enterprise |
| **Excel Copilot Agent Mode** | Plans and edits workbooks over several steps. Users can choose OpenAI or Anthropic models, but Anthropic models need a commercial Copilot licence. | Native | In the home plans, "file contents… aren't used to train foundation models" | Microsoft 365 Personal C$115 a year (AI-credit limits apply); Premium C$270 a year |
| **Gemini in Google Sheets** | Builds whole spreadsheets from one prompt (launched 22 Apr 2026). | Native | Workspace content is not used to train Gemini | Launched "US-only in English", so probably not available in Canada (not confirmed) |
| **Shortcut** | AI assistant for Excel and Google Sheets (add-in, web, desktop). Ranked first by both Ankura and Wall Street Prep. Its AI provider is not disclosed. | Native | The "Help improve Shortcut" setting, which allows training on and partner sharing of your data, is **on by default** for Pro and Teams (privacy post, 10 Oct 2025). Enterprise data is never used for training. | Free tier (20 credits a week); Pro US$100 a month billed annually |

### 2c. Forecasting and financial-planning apps

| Tool | Status on 7 Oct 2026 | Relevance |
|---|---|---|
| Causal | Now part of Lucanet's "Extended Planning and Analysis" product. The pricing link redirects to Lucanet's enterprise page. | Ruled out: enterprise product |
| Finmark | finmark.com redirects to bill.com | Ruled out: discontinued as a standalone product |
| Fathom | US$450 a month for 25 companies; AI writes "commentary" on reports | Ruled out: built for accountants analysing past accounting data, which a pre-revenue company does not have |
| Brixx | US$20–60 a month; no AI on the pricing page; exports to Excel, but the help page does not say whether formulas are kept | Weak: no AI, formula export unknown |
| ProjectionHub | Excel templates (all templates US$499 one-time); built around US SBA lending; no AI | Weak |
| PlanGuru | Exports to PDF, Word and Excel; no AI mentioned | Weak |
| Hemrock (formerly Foresight) | Open-source startup financial models, pay-what-you-want. Its stated approach is "AI for judgment. Software for exact math." | Not an AI tool. Could serve as a free, formula-based reference to compare our workbook's structure against. |

### 2d. Investor-deck tools (only for producing the deck after the plan and model are reviewed)

| Tool | AI | Editable PowerPoint | Data use | Price |
|---|---|---|---|---|
| **Pitch** | Text from Anthropic, OpenAI and Google; images from fal.ai | Plus plan and above | "Your presentation data isn't used to train AI models" | Plus €10 a month billed annually |
| **Gamma** | Drafts decks from a prompt; AI actions use credits | Yes, with some formatting loss | Individual plans: **training on by default**, can be switched off. Team and Business plans: training off and locked. | Pricing page blocked our fetch (HTTP 403) |
| **Beautiful.ai** | Generates content, images and translations | "Editable PowerPoint export" | AI providers may not train on customer data; kept at most 30 days. This comes from a search excerpt; the help page itself blocked our fetch (HTTP 403). | Pro US$14.50 a month billed annually |

---

## 3. Assessment against the job

The five criteria are training evidence, end-to-end coverage, export, data terms and cost. The last column is the one task where each tool might beat our current workflow.

| Candidate | Training evidence | End-to-end coverage | Export | Data terms | Cost | Task where it might beat us |
|---|---|---|---|---|---|---|
| Upmetrics | Claim only ("GPT-4o layer… trained") | Plan, forecast, deck. Nothing on affiliate rules, Canadian fundraising intermediaries, sales or customer-success playbooks, or a data room. | Word and PPT yes. Excel values only. | Fair, but anonymized prompts are used | From US$14 a month | A conventional lender- or grant-style plan document |
| LivePlan | None disclosed | Plan and a standard forecast. Same gaps. | Word and PDF; PPT for the pitch; forecast as CSV only | Terms from 2019, no AI clauses | US$15–30 a month | Plan-versus-actuals tracking after launch, through its connector |
| PrometAI | None | Plan and valuation. Same gaps. | PDF; PowerPoint on top plan only | Broad licence over your content | Unconfirmed | None identified |
| Venturekit | None | Generic US small-business plan | PDF (Word not confirmed) | Says it does not train on your data | Free to US$38 a month | None identified |
| Plan Pilot | Claim only | Unknown | PDF or Word claimed | Privacy policy unreachable | Unknown | None: not testable |
| Excel add-ins (§2b) | Base models with dated public benchmarks | Workbook only | Native formulas | Plan-dependent | Often already included in a subscription | Helping the founder explore the workbook himself ("what if launch slips two months?") with cell-level explanations, and auditing it |
| Deck tools (§2d) | Not relevant | Deck only | Editable PowerPoint | Gamma trains by default on individual plans | About €10–15 a month | Visual polish of the investor deck |

---

## 4. What a fine-tuned model would and would not change

Fine-tuning means further training a model on examples of a task.

**What it would plausibly improve:**
- Consistent section structure, tone and format for conventional business plans.
- Lower cost and higher speed for the vendor.

OpenAI's guidance places fine-tuning after measuring output and improving instructions, and ties it mainly to consistent format or behaviour. Training data drawn from typical business plans would also push output toward small-business and SBA-loan conventions (Venturekit and ProjectionHub show that orientation).

**What it would not change for this job:**
- **Current Canadian facts.** It would not supply the rules on referral fees for RCICs (regulated Canadian immigration consultants) and lawyers, Canadian rules on fundraising intermediaries, or our own source documents. Those still come from primary sources, and legal points still go to counsel or an RCIC.
- **Correct numbers.** Every benchmark above finds that numbers, not structure, are where models fail. A tuned writing model does nothing for arithmetic linked across cohorts, deferred revenue and referral clawbacks.
- **Self-checking.** FrontierFinance found no meaningful self-verification.
- **Portability.** If the vendor's export drops formulas, the tool cannot be our single numeric model. The workflow forbids keeping a second, manually maintained forecast.

---

## 5. Recommendation and test design changes

**Smallest useful addition: none purchased.** Strengthen the current review instead:

- **(a) Planted-error check.** In a copy of the workbook (04-execution-team-financial-workbook.xlsx, currently 5,468 formula cells), plant about 10 errors of the kinds the benchmarks report. Examples:
  - annual prepayment cash counted again every month;
  - a referral commission counted twice;
  - a figure linked to the wrong month;
  - a formula overwritten with a typed-in number;
  - a wrong denominator.

  Record how many the Codex review finds.
- **(b) Independent recalculation.** Recompute about five headline outputs separately from the workbook (cash at month 12 after launch, the lowest cash point, ARR, gross margin and customer acquisition cost) and compare.

This targets the documented weak point at no cost.

**Is Codex's sample test worth running? Not as designed.**
- Every business-plan app fails the cash-model task before scoring, on export alone.
- Comparing three outputs per vendor mostly measures prose.

If the founder wants a test anyway:

- **One task:** audit a cleaned copy of the workbook that contains the planted errors. Use fictional figures only.
- **One or two candidates:**
  1. **ChatGPT for Excel**, only if an existing ChatGPT plan already includes it. It belongs to the reviewer's model family, so the author is not grading its own work.
  2. Optionally, **Shortcut**, which both third-party rankings placed first. Use the free tier and fictional data only, because training is on by default on paid individual plans.

  Claude for Excel could serve as a comparison point, but should not be the candidate.

**Proposed changes to Codex's scoring rubric:**
1. **Pass/fail gates before any scoring.** A candidate fails if any of these is true:
   - required formats are not editable;
   - no Excel export with live formulas for any numeric task;
   - inputs are used for training and this cannot be switched off;
   - deletion and output ownership are not stated;
   - no identifiable legal entity, or the service is not reachable;
   - the test would need confidential data.
2. **Measure numbers instead of rating them.** Replace the 0–5 "Economics and calculations" score with:
   - the share of planted errors found;
   - false alarms raised;
   - match to the independently recalculated outputs, within a stated tolerance;
   - the count of typed-in numbers in cells that should hold formulas.
3. **Run each prompt twice**, because AI output varies between runs, and report both results.
4. **Keep the grader independent.** No model grades its own family's output; the founder or a human reviewer settles disputes.
5. **Measure cost per accepted output.** Include correction time, not just the subscription price.
6. **Set the adoption bar in advance.** the founder should decide before the test what counts as success, for example "finds at least 3 planted errors that the Codex review missed".

---

## 6. Ruled out and why

| Tool | Reason |
|---|---|
| Plan Pilot AI | Privacy policy and app unreachable on 7 Oct 2026; no legal entity named; unsupported claims |
| PrometAI, Venturekit | No Excel export; nothing that covers our specific job; PrometAI takes a broad licence over user content |
| Upmetrics, LivePlan (as the numeric model) | Exports drop formulas (values or CSV only). Codex can still look at them for plan prose, but they are not test candidates. |
| Causal, Finmark | Moved into an enterprise product / discontinued as a standalone product |
| Fathom, Brixx, ProjectionHub, PlanGuru | No meaningful AI, built around past accounting data or SBA lending, or formula export unconfirmed |
| Gemini in Sheets | Launched US-only, English only |
| Deck tools | Deferred. Use only after the plan and model are approved, as an optional polish step. |

---

## 7. Remaining uncertainty

- **Nothing was tested hands-on.** Export behaviour, output quality and plan limits could differ from the documentation.
- **Information I could not confirm:**
  - prices for Gamma and PrometAI (pages blocked, or shown in another currency);
  - Beautiful.ai's AI data terms (help page blocked our fetch; the figures come from a search excerpt);
  - OpenAI's ChatGPT for Excel article (blocked our fetch; details come from the help-centre search excerpt);
  - Gemini in Sheets availability in Canada.
- **The benchmarks are not our task.** They test investment-banking and corporate-finance models, not a pre-launch SaaS cash plan. Vals' dataset is proprietary, Wall Street Prep has commercial interests, and Ankura ran single-prompt tests.
- **Not assessed:** mid-market financial-planning suites such as Abacum, Drivetrain and Cube, which are sized for finance teams that already have actual results.
- **Our own data terms are unconfirmed.** Which Claude and ChatGPT plans Expat Ready uses, and whether model-training settings are switched off, is unknown. On consumer Claude plans, keeping training on means data is retained for 5 years; switching it off means 30 days.

---

## 8. Sources (all checked 7 Oct 2026)

| URL | Page title | Date on page |
|---|---|---|
| https://upmetrics.co/terms-and-policies | Upmetrics Terms of Service (§6.1, §6.2, §6.4, §11.1) | 1 May 2026 |
| https://upmetrics.co/llm-info | Official Information About Upmetrics | Sep 2026 |
| https://help.upmetrics.co/article/186-create-your-business-plan-using-ai-assistance | Create your business plan using AI Assistant | 2 Sep 2026 |
| https://help.upmetrics.co/article/199-how-to-export-your-finance-forecasting-data-to-excel | How to export your finance forecasting data to Excel? | 14 Sep 2026 |
| https://help.upmetrics.co/article/267-sharing-your-ideas | Downloading and printing your business plan | 18 Nov 2025 |
| https://help.upmetrics.co/article/169-get-your-pitch-download | Get your pitch download | 25 Aug 2026 |
| https://upmetrics.co/features/ai-assistant | Upmetrics AI Assistants | none |
| https://upmetrics.co/pricing | Upmetrics pricing | none |
| https://help.liveplan.com/using-the-ai-liveplan-assistant | Using the AI LivePlan Assistant | 9 Sep 2026 |
| https://help.liveplan.com/using-the-liveplan-mcp-connector | Using the LivePlan MCP Connector | 20 Aug 2026 |
| https://www.liveplan.com/pricing | LivePlan pricing | none |
| https://www.liveplan.com/policies/terms-of-service | LivePlan Terms of Service | revised 18 Dec 2019 |
| https://www.liveplan.com/policies/privacy-policy | LivePlan Privacy Policy | 29 May 2026 |
| https://prometai.app/investor-ready-business-plan | PrometAI investor-ready business plan | none |
| https://prometai.app/pricing | PrometAI pricing | none |
| https://prometai.app/terms-and-conditions | PrometAI Terms and Conditions | 16 Jun 2026 |
| https://prometai.app/faq | PrometAI FAQ | none |
| https://prometai.app/blog/how-does-an-ai-business-plan-generator-work | How does an AI business plan generator work | 30 Oct 2025 |
| https://www.venturekit.ai/business-plan | Venturekit AI business plan | none |
| https://www.venturekit.ai/pricing | Venturekit pricing | none |
| https://www.venturekit.ai/terms | Venturekit Terms | none |
| https://planpilotai.com/ | Business Plan Creator – Plan Pilot | © 2025 |
| https://planpilotai.com/privacy-policy | (HTTP 404) | — |
| https://ai.planpilotai.com/login/ | (HTTP 530) | — |
| https://developers.openai.com/api/docs/guides/model-optimization | Model optimization | none |
| https://www.vals.ai/benchmarks/emb | Excel Modeling Benchmark | updated 6 Oct 2026 |
| https://arxiv.org/abs/2604.05912 (and /html/2604.05912v1) | FrontierFinance | 7 Apr 2026 |
| https://arxiv.org/abs/2605.30907 | BlueFin: Benchmarking LLM Agents on Financial Spreadsheets | 29 May 2026 |
| https://ankura.com/insights/putting-ai-to-the-test-how-5-tools-performed-across-3-financial-models | Putting AI to the Test | 23 Apr 2026 |
| https://wallstreetprep.com/knowledge/ranking-the-best-ai-tools-for-financial-modeling-2026 | Ranking the best AI tools for financial modeling (2026) | 29 Jun 2026 |
| https://arxiv.org/abs/2408.08811 | AI and Strategic Decision-Making: Evidence from Entrepreneurs and Investors | 16 Aug 2024 |
| https://www.dreamhost.com/news/announcements/ai-evaluation-framework-how-we-built-a-system-to-score-and-improve-ai-generated-business-plans/ | AI evaluation framework… business plans | 13 Mar 2025 |
| https://claude.com/docs/office-agents/excel | Use Claude for Excel | none |
| https://code.claude.com/docs/en/data-usage | Data usage | none |
| https://help.openai.com/en/articles/20001063-chatgpt-for-excel-and-google-sheets | ChatGPT for Excel and Google Sheets (search excerpt; direct fetch blocked) | none seen |
| https://support.microsoft.com/en-us/excel/choose-your-model-when-editing-with-copilot-in-excel | Choose your model when editing with Copilot in Excel | none |
| https://support.microsoft.com/office/copilot-in-microsoft-365-apps-for-home-your-data-and-privacy-6f0d8d80-f4bb-4c9f-989e-64a4adfd62e5 | Copilot in Microsoft 365 apps for home: your data and privacy (search excerpt) | none seen |
| https://www.microsoft.com/en-ca/microsoft-365/buy/compare-all-microsoft-365-products | Compare Microsoft 365 plans (Canada) | none |
| https://workspaceupdates.googleblog.com/2026/04/build-and-edit-complex-spreadsheets-with-Gemini-in-Google-Sheets.html | Build and edit complex spreadsheets with Gemini in Google Sheets | 22 Apr 2026 |
| https://support.google.com/docs/answer/14615114 | How Gemini in Workspace protects your data (search excerpt) | none seen |
| https://shortcut.ai/pricing | Shortcut pricing | none |
| https://shortcut.ai/blog/posts/privacy | Shortcut privacy | 10 Oct 2025 |
| https://www.causal.app/ ; https://causal.app/pricing → lucanet.com | Causal joins Lucanet | none |
| https://www.finmark.com → https://www.bill.com | (redirect) | — |
| https://www.fathomhq.com/pricing | Fathom pricing | none |
| https://brixx.com/pricing/ ; https://support.brixx.com/articles/how-to-export-reports | Brixx pricing; How to export reports | "over 12 months ago" |
| https://www.projectionhub.com/pricing | ProjectionHub pricing | none |
| https://www.planguru.com/ | PlanGuru | none |
| https://www.hemrock.com/ (from foresight.is) | Hemrock | none |
| https://pitch.com/pricing ; https://pitch.com/ai-in-pitch | Pitch pricing; How Pitch uses AI | none |
| https://help.gamma.app/en/articles/12281928-does-gamma-use-my-content-to-train-its-ai-features | Does Gamma use my content to train its AI features | "updated over a week ago" |
| https://help.gamma.app/en/articles/8022861-how-do-i-export-my-gamma | How do I export my gamma | "updated yesterday" |
| https://help.gamma.app/en/articles/8077107-gamma-pricing | Upgrading your Gamma subscription | "this week" |
| https://www.beautiful.ai/pricing ; https://support.beautiful.ai/hc/en-us/articles/37567933064973 | Beautiful.ai pricing; What Powers Beautiful.ai's Generative AI (search excerpt; direct fetch blocked) | none seen |

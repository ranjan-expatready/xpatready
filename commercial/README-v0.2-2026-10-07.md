> **SUPERSEDED 8 Oct 2026.** Historical draft kept for reference. The current plan is [plan.md](plan.md) / plan.docx and the current model is model.xlsx. Do not use this file's funding figures.

# Commercial work — index and artifact outlines

**Owner:** Ranjan. **Writer:** Claude (one writer). Research agents write only their own files in `research/`.
**Separate from product:** nothing here changes `product/requirements/`.
**Hard stops:** nobody is contacted, nothing is published, spent, hired, promised (equity included) or applied for without Ranjan's explicit instruction.

## Files

| File | What it is | Status (7 Oct, model v0.2) |
|---|---|---|
| `00-decision-summary.md` | One-page decision summary | v0.2, conditional draft |
| `00-evidence-baseline.md` | Every fact, decision, hypothesis, conflict and open question, held once | v1.3 |
| `01-` to `04-*.md` | The four artifacts; numeric tables are generated blocks | v0.2, conditional drafts |
| `04-execution-team-financial-workbook.xlsx` | The single numeric source: inputs, scenarios, actuals, six cases, checks, trackers | Model v0.2.0 |
| `review-dispositions.md` | Codex v0.1 findings CR-01 to CR-12 and their dispositions | Done |
| `coverage-map.md` | COVERAGE.md C01–C44 plus C45–C51 | v0.2 |
| `ready-for-review.md` | Handoff to Codex | Current |
| `tests/` | Acceptance-test reports | 23/23 at 19:15 |
| `tools/` | Model build, refresh, stale check, tests (see `tools/README.md`) | — |
| `workflow-review.md` | Claude's review of the company-planning workflow | Done; Codex dispositioned |
| `research/R1…R7-*.md` | Primary-source research | Done |
| `discovery.md` | Stage 1 file | Superseded |

**Rule for numbers:**
- Forecast figures appear only inside `<!-- GENERATED:… -->` blocks, written by `tools/refresh_reports.py`.
- Proposal values (prices, offers, hire dates) are workbook inputs. Prose may quote them as proposals, with their input IDs.
- Run `tools/check_reports.py` before sharing anything.

## Conventions for all four artifacts

- **Decision summary first.** One page across all four artifacts, written last.
- **Every recommendation as a row:** Decision | rationale/evidence (baseline IDs) | owner | timing/trigger | cost | success measure.
- **Each recommendation is tagged with when it can happen:**

| Tag | Meaning |
|---|---|
| **P** | Preparation during development |
| **C** | Customer conversations that need no demo |
| **F** | Optional prototype feedback, for one named purpose, clearly labelled as a prototype |
| **L** | Needs a working production product |
| **R** | Justified only after customer and channel results |

- **Facts by reference:** artifacts cite baseline row IDs and do not restate facts. Directories and research go in appendices.
- **No invented figures:** where evidence is missing, use explicit scenarios.

## Artifact 1 — Market and revenue strategy (outline)

1. Decision table.
2. **Segment and buyer.** Compare solo, 2–5, 6+, law firms and employer/LMIA-heavy practices against FD-19 (DEC-2, HYP-1). Name the buyer, approver and influencers for each.
3. **Customer problem and evidence.** What is claimed, what is known, and what interviews must establish (HYP-2).
4. **Competitive alternatives.** Why firms would choose us or reject us (R1, HIST-5).
5. **Positioning and a claim register.** Each public claim marked proven / demonstrable at launch / not in Release 1 / remove, with the evidence needed. This is the fix list for K-10, K-11 and K-12.
6. **Pricing.** Reconcile tiers, prices, add-ons and trial (K-4, K-7, K-8). Decide whether solo needs a plan. Founding-firm and pilot terms (DEC-7); annual versus monthly; whether migration is included; how to test price (HYP-3).
7. **Channels compared:**
   - founder network;
   - practitioner referral;
   - associations and events;
   - the 25,000 audience (QA-1);
   - content and inbound;
   - partners (accountants, educators, complementary vendors);
   - outbound;
   - paid advertising.

   Each is judged on fit with the likely contract value, sales cycle and budget.
8. **Reachable market, bottom-up.** Built from counts in R2 with stated assumptions. No top-down market claims.
9. **Revenue scenarios worked backwards:** revenue target → customers → qualified opportunities → meetings → activity. Includes capacity limits.
10. **Customer validation plan and commercial launch criteria.** These sit alongside the product gates G2 and G5; they do not replace them.
11. **Deliberately deferred.** For example: firms outside Canada (FD-22), enterprise features, paid campaigns, a reseller programme.

## Artifact 2 — Sales, affiliate and customer-success playbook (outline)

1. Decision table.
2. **Timing map.** What is allowed in each period, using the P/C/F/L/R tags.
3. **Pipeline.** Target account → qualification → discovery → demonstration (prototype or production) → pilot → proposal → negotiation → payment → onboarding. For each stage: entry and exit conditions, owner, evidence, next action, assumed elapsed time, loss reasons.
4. **Discovery interview guide and qualification rules.** For conversations that need no demo.
5. **Demonstrations.** Rules for a labelled prototype demo, the production demo script, and follow-up.
6. **Website and campaign needs.** Claim corrections first (K-10). Then the pages, proof, offers and forms needed, compliant with anti-spam law (R3).
7. **Referral, affiliate or reseller.** Compare the models. Then economics (commission or credit, rate, duration), attribution, cancellation and clawback, disclosure, the CICC, law-society and anti-spam limits, tax reporting (R3), recruitment and training.
8. **Ranked shortlist of communities, associations and partners.** Verified sites, public contact routes, fit, permission needed and next action (appendix from R2).
9. **Onboarding and migration.** Kickoff, import, configuration, training, the first customer outcome and time to reach it (HYP-8), and capacity per person.
10. **Support.** Support levels we can actually meet (versus the "4hr" claim), channels, incident messages to customers, status page.
11. **Customer success.** Health signals, renewals, expansion, when to ask for referrals.
12. **Feedback to the product team.** Intake → triage → product owner → decisions log. No feature promises made in sales.

## Artifact 3 — Funding and investor plan (outline)

1. Decision table.
2. **Starting position.** Cash, spending and runway (QA-2); company, ownership and ambition (QA-3).
3. **Options compared.** Customer-funded growth, founder money, grants and tax credits, accelerators, angels, strategic investors, venture capital, debt. For each, when it fits and when it does not (R4).
4. **When funding helps.** Milestone-based scenarios, with amounts taken from the Artifact 4 workbook.
5. **Fundraising help, kept distinct:** advisers, introducers, registered intermediaries, fractional finance help, ongoing investor relations. For each:
   - what they do;
   - published fees;
   - registration rules (R3);
   - candidates and sourcing channels (R4);
   - due diligence, reference checks and conflicts.

   This is where HYP-11 is tested.
6. **Investor targeting.** Who to approach, introductions, follow-up, and a pipeline tracker.
7. **Materials.** Pitch and data-room contents; investor reporting template.
8. **Funding-readiness criteria.** Evidence, metrics, team and legal housekeeping, not product quality alone.
9. Items for counsel.

## Artifact 4 — Execution, team and financial workbook (outline; Markdown summary plus spreadsheet)

1. **Phases:**

| Period | Phase |
|---|---|
| Now – Dec 2026 | Prepare and talk to customers |
| Jan – Feb 2027 | Pilots |
| Mar – Apr 2027 | Launch and onboarding |
| May – Sep 2027 | Repeatability |
| Oct 2027 – Mar 2028 | Scale decision |

   Founder hours per week are set for each phase.
2. **First 90 days.** Actions, owners, dependencies (team plan 9 Oct, counsel, prices, website fixes, product gates).
3. **Organisation by phase.** Which roles can be combined and which combinations conflict. Hiring triggers, scorecards, 30/60/90-day outcomes, pay assumptions and total cost (R5), and what stays with Ranjan.
4. **Budgets.** A lean and a higher-capacity version. Itemised, in CAD, with location, exclusions and gates that release spending.
5. **Cash and runway scenarios.** Needs QA-2.
6. **Weekly metrics scoreboard.**
7. **Risks and decision gates.**
8. **Launch operations:**
   - customer contract and data-processing agreement (counsel);
   - billing, cancellations and refunds (K-10);
   - privacy and security evidence;
   - incident handling;
   - data migration and export;
   - support;
   - the process for updating immigration content.

## Coverage check (run before delivery)

| Area | Covered in |
|---|---|
| Acquisition | 1 (sections 7–9), 2 (sections 3–8) |
| Conversion | 2 (sections 3–5), 1 (section 6) |
| Onboarding | 2 (section 9), 4 (section 8) |
| Retention | 2 (section 11) |
| Referrals | 2 (sections 7–8) |
| Staffing | 4 (section 3) |
| Operating readiness | 4 (section 8) |
| Funding | 3 |

Gaps are exposed, not hidden.

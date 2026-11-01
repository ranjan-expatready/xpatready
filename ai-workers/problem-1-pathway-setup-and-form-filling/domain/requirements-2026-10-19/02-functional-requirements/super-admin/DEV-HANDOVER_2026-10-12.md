# Developer hand-over: Super Admin requirements (10–12 Oct 2026)

> Updated 14 Oct: task count, AG-01/AG-16 decisions, reading list.
> Updated 17 Oct: writers and agents applying decisions follow `WRITER-BRIEF_2026-10-17.md`.
> Updated 18 Oct: **start from your epic's section "Decisions that change this epic"** — it lists every product decision (AG16-1 – AG16-94, 14–18 Oct) that changed your document, what it changed and where. The product-wide rules every epic follows have one home: Agent `00-Overview` → "Product rules every epic follows". The decision log index is at the top of "Product decisions AG16-1 – AG16-94" in `TEMPLATE-MAP-working_2026-10-10.md`. The "AG16" prefix is historical, not "AG-16 only".
> Updated 17 Oct: requirements written from now on use **build cards**, see `BUILD-CARD-STANDARD_2026-10-17.md` (what, why, where, Doer, AI or rules, AI-off behaviour, tests, non-goals, delivery mode). It is aligned with `ERv2-sanitized/AGENTS.md` "Feature truth before code".

Product owner: the product owner. Epics follow separately. This note explains **what changed in the last two days and why**, so the epics make sense.

## 1. What to read, in this order

1. **This note**, then `BUILD-CARD-STANDARD_2026-10-17.md` (how each requirement is written and how to hand a card to a coding agent).
2. `00-Overview_v3.11_2026-10-12.md` and `99-Phasing-and-Glossary_v2.20_2026-10-12.md`, which give the module map and the terms.
3. The module documents `SA-01` to `SA-12` (the latest version of each). Each starts with a change log. Items marked *(changed …)* or *(revised same day …)* cite the decision behind them.
4. `DEV-TASKS_2026-10-12.md`, the code changes that come straight out of these decisions, with file and line references.
5. **Only if you need the reasoning behind a decision:** `TEMPLATE-MAP-working_2026-10-10.md`, the decision log. Decision IDs in the documents (R-, SR-, G-, SA-Q, R9-, W-) point here.

Older versions are in `_archive/`. Do not build from them.

## 2. Five principles behind every change

| Principle | What it means for you |
|---|---|
| **Built for small firms** | The customers are immigration firms from one person up to 15–20 staff, run by non-technical owners. Every feature is full, but **configuration, permissions and admin depth are kept small**. Enterprise-grade knobs are parked, not built. |
| **Release 1 is full-featured** | Anything a firm does day to day is in Release 1. Only wish-list items (e.g. live telephony, AI-written content) are later. Do not defer day-to-day features to save time. Raise it instead. |
| **Built stays** | Before anything was parked or simplified, the code was checked. **If it was already built, it stays.** Several decisions reverse earlier "park" proposals for this reason. Where the spec says *spec follows code*, the code is the reference. |
| **The firm owns its legal compliance (rule 7)** | ExpatReady gives defaults and warnings. It **never locks legal wording, never blocks on a regulator's rule, never cites statutes** in product text. Expect "warn, don't block" throughout. The fixed exceptions are ExpatReady's own emails, security emails, unsubscribe and STOP handling, and the e-sign certificate. |
| **Rule 9: intuitive, zero setup** | A new firm works from day one on defaults, without opening settings. Every setting has a **stated default** and a **placement**, either the main screen or a collapsed **Advanced** section. Screens use plain language, never permission keys or technical terms. Each module now has a "Settings — defaults and placement" section. Build to it. |

## 3. Decisions that change what you build

**ExpatReady staff (SA-06, SA-07)**
- **Roles:** six, the ones already in code: Platform Owner, Admin, Support, Billing, Content publisher and Auditor. There is no staff-role editor; it is parked. The code registry is the master copy, seeded by release, and `check:seed-parity` must block a release on any drift.
- **Permission table:** SA-07 Appendix A is the **target** permission matrix. Where the code grants differently, that difference is a build task (`DEV-TASKS`, section A).
- **Owners:** at least **one** active Platform Owner, as built. Go-live creates two. Live plan and price changes need a second Owner, as built. With only one Owner they wait.
- **Owner-only actions:**
  - Publishing **ExpatReady's own emails**, which is the built single publisher.
  - Applying, lifting or closing a **security lock**.
  - Placing **legal holds**.
  - Owning the breach register.

**Firms (SA-06 and the firm-facing parts of every module)**
- **No two-person approvals for firms.** Four-eyes on government forms and the "Team safeguards" switch are **removed**. Escalation and at-risk marks are two plain settings, on by default, under Advanced.
- **No licence-based routing.** There is no "preferred" approver label. Approving AI-written client text uses the sending permission.
- **The firm's role editor** shows about 30 plain-language capabilities. An Advanced view shows the individual permissions.
- **Pack configuration is ExpatReady's.** Firms see only the **final questionnaire** and the **dynamic document checklist** for the case. They cannot add or edit questions, and there is no "who answers" switch. Extra documents are added **per case** with "Request a document", which is already built as a per-case checklist addition. Firms may hide standard items **without a deadline**. They can never hide deadline items or government steps, and they cannot reorder steps.

**Templates and messages (SA-05)**
- **Automatic messages run from day one** on ExpatReady's wording, with no review gate.
  - **Guard 1:** a message that needs a firm detail the firm hasn't filled in, such as payment instructions, is skipped. The firm sees a fixed dashboard note.
  - **Guard 2:** a one-time "your messages are on" notice.
- **Starters:** ExpatReady starter templates are published by the Content publisher, and firms get a 7-day notice. ExpatReady's own emails are published by the Platform Owner only. The "contains legal terms" flag is parked.
- **Consent:**
  - Unsubscribe and STOP are blocked on every route, per firm.
  - "No recorded consent" is skipped on shared email and on automatic marketing, and gives a warning on a manual send from the firm's own mailbox.
  - WhatsApp needs a **WhatsApp opt-in** consent purpose.

**Plans and billing (SA-03, SA-04)**
- **Payment account:** connecting the firm's **own payment account is on every plan**, not an extra.
- **Plan changes:** they stay one plan per request, as built.
- **Trials:**
  - No card is needed to start one.
  - Tax numbers are asked **at trial end**, at the card step.
  - During a trial the Owner may switch plan with no charge, but a downgrade still has to fit the plan's limits.
  - Staff extend trials 7 days by default, up to 90 days in total.
- **Billing notices:** they go to the billing email, the Owner and the Admins. Documents go to the billing email, or to the Owner if none is set. The account-deletion warnings follow the same rule.

**Phasing (Super Admin)**
- **Phase 1 (Must)** now explicitly includes:
  - ExpatReady's analytics "Business" page, with feature-usage events recorded from day one.
  - The "Open support session" link from a ticket.
  - ExpatReady's breach register.
  - Platform maintenance mode and the platform banner.
- The full Must / Should / Could split for every module is in `99-Phasing-and-Glossary_v2.20`.

**Data governance (SA-11, SA-12)**
- **The built governance code stays, and its parts are switched on:** data requests (dsr), consent, data disposal (erasure), legal holds, the breach backend and per-class retention.
- **Erasure:**
  - It runs only for an approved "delete my data" request.
  - The grace period is **7 days from approval**, with a Cancel option. Today it is counted from receipt, which is a code fix.
  - It is stopped by tripping the kill switch on the **"Data erasure"** flag.
- **Firm keep-period** ("keep closed files N years"): a **reminder and warning only**. It never locks anything and never deletes anything automatically in Release 1.
- **Activity log:** kept **7 years**, append-only, with no deletion path.

## 4. What is ready and what is not

| Ready for development now | Waits |
|---|---|
| **SA-01 to SA-12:** everything except the items in the column to the right. **SA-05:** the ExpatReady side only. **SA-08:** all of it. Each has a "Hand-over scope" block at the top. | **Firm-side template management** (SA-05 §13 rows 3–6, N1, N4, N10). This waits for the AG-12 review. |
| **`DEV-TASKS_2026-10-12.md`:** 52 tasks (sections A–C hold 39 rows, 4 of them "No change", so 35 tasks; section E adds 8; section F adds 9 for the 17 Oct decisions, 4 of them go-live or vendor tasks; section D is not code). *(Corrected 14 Oct: the earlier figure of 30 did not match the table.)* AG-01 and AG-16 decisions (13–14 Oct) are now in the AG epics and in DEV-TASKS section E. The largest is the **consent send-check alignment** (B3). The rest are mostly permission-seed changes and small fixes. | **Every "AG" knock-on row** in the §0.2 tables. These are applied during the Agent (firm console) review, which starts now with AG-01. |
| | **SA-04 §13 Q8** (undecided). Also the "Before go-live" tasks: SES production access, the WhatsApp provider contract, Google and Microsoft app registration, and the default e-sign wording. |

## 5. Working rules for the team

- **Raise contradictions, don't resolve them yourselves.** If the spec and the code disagree, or two documents disagree, raise it with the product owner.
- **Check before you change built code.** Where a decision changes built behaviour, the spec says so and cites the file. If it doesn't, assume the built behaviour stays and ask.
- **Settings follow the defaults table.** Every new setting starts at its stated default, in its stated placement. Do not add new settings or permissions without a decision.

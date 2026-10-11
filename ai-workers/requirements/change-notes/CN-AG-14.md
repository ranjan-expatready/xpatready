# CN-AG-14: change note to AG-14 Reporting and Analytics

| Field | Value |
|---|---|
| Module changed | AG-14 Reporting & Analytics (the Reporter) |
| Version and file | v1.11 of 10 Oct 2026, `02-functional-requirements/agent/AG-14-reporting-and-analytics_v1.11_2026-10-10.md` (Drive snapshot of 11 Oct 2026, `sources/drive-snapshot-2026-10-11/`; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 (second fix round, after re-check S3c-b) |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-14-35 to AG-14-39 (highest AG-14-34, L422); BR-17 (highest BR-16, L448); §13 item 8 (highest item 7, L680) |
| One home | This note is the home of the four rule-built Practice expert answers (AIW-D39) and of the firm's AI measures as `MetricDefinition` rows; AW-01 v0.1 cites them (AW-1-109, AW-1-121) and keeps only the expert's governance, summary line and question record. Expat Ready's platform-wide AI measures are SA-09's (CN-SA-09). |
| Companion files | AW-01 v0.1; `design/behaviours/practice-expert.md` §2.0 to §2.4 (the behaviour this note turns into reports); CN-SA-09 (platform AI measures); CN-SA-12 (spend caps, SA-12-33) |

**In plain words.** The founder decided on 11 Oct that the Practice expert's first version answers four fixed questions, picked from a menu, built by rule from four sources, with at most one optional AI summary line; and that the rule-built answers belong to the product team (Workstream 1) as reports. This note adds those four reports to AG-14. Workstream 2 keeps only the optional summary line. It also adds the firm's own AI measures, which the pilot needs, and records one open question the Firm assistant review raised about manager views.

**What the team changed on 10 Oct (v1.11).** Reports is a left-menu module on every plan; saved views, scheduled reports and export are the sellable *Advanced reports* extra (§3.12, L350 to L359). The four answers and the AI measures below are standard reports under that rule, not an extra; saving, scheduling or exporting them follows §3.12. Nothing proposed here was already made.

**Terms used.** *Holdout match rate*: when a person approves many AI values at once, a few values are hidden for the person to fill in themselves (AIW-D57); the match rate is the share of those the person filled the same as the AI had proposed. *Agreement alarm*: an alert when a person's rate of agreeing with AI proposals rises suddenly (AIW-D57). *Shadow mode*: the AI proposes in the background while a person does the work, so the two can be compared.

---

## 1. The Practice expert menu: four fixed questions answered by rule

1. **Where.** §4, new heading after AG-14-34 (L422); new requirements **AG-14-35 to AG-14-38**; new rule **BR-17**. Nearest existing text: AG-14-17 (L394) and AG-14-22 (L401).
2. **Current words.**
   > L394: "**AG-14-17.** The Reporter SHALL provide **deadline adherence %**, the **upcoming deadline** horizon and list — with at-risk items only where the firm has switched at-risk marks on (AG-16-32) — **SLA-breach** trends, and **audit-event volume** — `firm_id`-scoped, drill-through to the case/record."
   >
   > L401: "Every metric/segment/row SHALL be **drill-through** to the underlying operational list/detail, carrying the exact filter; the target module SHALL **re-enforce its own permission + firm_id** (no escalation via drill)"
3. **Proposed words.**
   > **Practice expert menu — four fixed questions answered by rule** *(new — AIW-D39)*
   >
   > **AG-14-35 (the menu).** The Reporter SHALL offer firm staff a menu of four fixed questions, each answered by rule as a report: (1) *at risk this week, and why*; (2) *what is missing on this file*; (3) *which rule is behind this item*; (4) *what is waiting on me*. The asker SHALL pick the question from the menu and the file, client or item with the product's permission-filtered search; version 1 SHALL accept no typed question. The menu is part of the Reports module feature (§3.12).
   >
   > **AG-14-36 (sources and permissions).** Each answer SHALL be built only from four sources — Minder watches (AG-11 §3.4), deficiencies (AG-07 §3.6), Needs you items (AG-11 §3.13) and pack rule text with its section and version — each read under the asker's own permissions at the moment of reading, as a drill-through is (AG-14-22, BR-8). Each answer SHALL list its sources (record and field, or pack section and version). With no source, the answer SHALL say so and stop. Restricted fields SHALL appear as status only (present, expired, missing). *All files I may see* SHALL be offered only to holders of `agent/report:view.all`; others are answered over their own and case-team files (BR-2).
   >
   > **AG-14-37 (dates and pack version).** *This week* SHALL mean the next seven calendar days from the moment of asking, in the firm's time zone (AG-11-40; BR-6); unmet deadlines already passed SHALL show first, under *Overdue*. A question about a file SHALL be answered from the pack version pinned to that file (AG-07 BR-21); a general question from the current published version; where they differ, the answer SHALL name both. Where the firm has at-risk marks off, the answer SHALL use watch statuses and SHALL NOT say *at risk* of a person's file (AG-11-49).
   >
   > **AG-14-38 (no model in the answer).** The four answers SHALL be built without a model and SHALL show with AI switched off. An optional one-line AI summary under an answer belongs to the AI layer (AW-01): it needs the firm's AI switch (AG-16-35), is labelled AI-written, and is never an input to another report or another assistant.
   >
   > **BR-17 (Practice answers are built by rule).** The four answers quote the product's own records and pack text; they never compute eligibility, a score, a fee or a deadline themselves (those come from the Qualifier, the Biller and the Minder), never cross firms (BR-1) and never rank staff (AG-11-49; BR-15).
4. **Why.** AIW-D39 (the founder, 11 Oct: "Practice expert version 1: four fixed questions from a menu, answers built by rule from four sources, one optional AI summary line … The rule-built answers go to Workstream 1 as a change note to AG-14"); AIW-D54 ("the expert's answers work with AI off"; "the expert's line display-only"); AIW-D25 (answers only, sources only); `proposals.md` rows of 9 Oct (expert version 1, the four shapes and sources) and 10 Oct (Practice expert: the menu with record pickers and the seven-day window; answering from the pinned pack version); IMP-20 rules 1 to 4; IMP-21. Behaviour, not restated here: `practice-expert.md` §2.0 rules 13 to 20 and §2.1 to §2.4; §9 G-25 to G-27, G-36.
5. **Knock-ons.** AG-11 Needs you and the Minder are read, not changed; the question record and the summary line's AI run log row are AW-01's (CN-AG-11 item 7 adds the link field); AG-16 hosts the summary-line switch (CN-AG-16 item 4); AG-16-39 firm export carries the question records (CN-AG-16 item 5); the screen label is the team's (AIW-D31 keeps "Practice expert" an internal name, never shown to a client).

## 2. The firm's own AI measures

1. **Where.** AG-14-4 (L371, `MetricDefinition` as data); new requirement **AG-14-39**.
2. **Current words.**
   > L371: "Metrics SHALL be declared as **`MetricDefinition`** data (source rollup, aggregation, money/FX treatment, drill target); adding a metric/dashboard tile is configuration, not bespoke controller code."
3. **Proposed words.**
   > **AG-14-39 (AI measures).** The Reporter SHALL provide, as `MetricDefinition` rows read from the AI run log, approval items, audit entries (AG-11 §7; AG-13 `AuditLog`), the assistants' run records and the Practice expert's question records (AW-01 §7), the firm's own AI measures, per AI assistant, per AI Doer and per item kind: acceptance (approved unedited, edited, rejected, with the rejection reasons); agreement in shadow mode (a person's own value matched the proposal); turnaround (prepared to decided) and the age of AI items in Needs you; stale, paused and cancelled items (with the pause mark or cancel reason, AG-11-112); items per file; override rate on Reader values and Checker findings; document-type accuracy (AG-9-11; AIW-D71); catch rate (deadlines and findings the AI found that a person then acted on); reliability (provider errors, fallback to the manual path); safety (the holdout match rate and the number of agreement alarms, firm-wide only); spend against the firm's caps (the caps are platform settings, SA-12-33 as proposed in CN-SA-12); time saved (labelled an assumption until measured against files done without AI); and, each month, how many AI items were approved by an Owner route, under either wording of AG-11-90 ("approved by Owner — no active holder of the approval permission"; "approved by Owner without a licensed user"). These measures SHALL be firm-wide figures under `agent/report:view.all` and SHALL NOT rank or name staff (AG-11-49; BR-15).
4. **Why.** IMP-29 (AI performance measures for AG-14; firm-side views follow AG-11-49: they show the firm its own AI, never rank its staff), relied on by `case-assistant.md` §9 G-19, `billing-assistant.md` §9 G-19, `firm-assistant.md` §9 G-16 and `intake-assistant.md` §9 GI-14; IMP-17(c) (the monthly Owner-route count), relied on by `case-assistant.md` §9 G-8; AIW-D71; AIW-D57 (holdout and alarm, provisional until counsel); AIW-D62 (spend-cap values are decided after the pilot); `00-step3-plan.md` "One home per rule" (a metric is data, so its home is AG-14; AW-1-121 cites this list) and "Pilot safeguard values, one home" (spend caps live in SA-12-33). The list matches AW-1-121 and counts both Owner-route wordings (review S3c M-9, m-20).
5. **Knock-ons.** SA-09 platform analytics carries Expat Ready's own AI measures, aggregated and de-identified across firms (CN-SA-09, Super Admin half); this list stays the firm's view of its own AI; the per-person agreement-rate alarm itself is AW-01's (AW-1-33) and is not a report here.

## 3. Open question: manager deadline views and "never report on staff unless the firm chose it"

1. **Where.** §13, new item **8**; AG-14-17 (L394).
2. **Current words.**
   > L394: "the **upcoming deadline** horizon and list — with at-risk items only where the firm has switched at-risk marks on (AG-16-32)"
3. **Proposed words.**
   > **8. Manager deadline views and AG-11-49.** Are the Minder's Active watches view (AG-11 §3.4: "per case and firm-wide for the manager") and the compliance view (AG-14-17, under `agent/report:view-compliance`), which show other file owners' deadlines firm-wide, consistent with AG-11-49 ("The platform SHALL NOT escalate, mark or report on a firm's staff unless the firm has chosen it") in a firm that has switched escalation off? The team decides, with counsel. The AI layer adds no list or filter of its own: the managers' deadline list is these two views (AIW-D37).
4. **Why.** `proposals.md` row of 10 Oct (Firm assistant, question for the team with counsel, withdrawn as a founder decision on 11 Oct); `firm-assistant.md` §9 G-6.
5. **Knock-ons.** AG-11 §3.4 if the answer changes the views.

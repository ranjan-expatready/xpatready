# Rules, AI, or both: one map of every capability

*Expat Ready, Workstream 2. Maker's draft, 12 Oct 2026.*

*Revisions:*
- *After hostile check R4 (`checks/review-R4-2026-10-12.md`): R4's fixes applied, with the Lead's ruling on M-3 (`PROGRESS.md`, R4 row of 12 Oct).*
- *After re-check R4-b (`checks/review-R4-b-2026-10-12.md`): its fixes applied.*
- *R4-c fixes 1 to 5 (same file, §9) applied.*
- *Brought in line with the founder's decisions AIW-D92 to AIW-D105 (`decisions.md`, 12 Oct). Where an earlier ruling or reading conflicts with those decisions, the decision wins and the change is noted in place.*
- *After hostile check R7 (`checks/review-R7-2026-10-12.md`): the AIW-D98 note (A21, V1 decided), D98 point (4) licensed review of explanations, and the Lead's rulings in the AIW-D106 note (AI-started assessment runs on Auto after the stop check; one skill = one job on one plane, so skills 21 and 22 are split; skill 13 moves to rules; V2 time slots in scope) applied; counts redone.*

*Asked by: the Lead, on the founder's ask of 12 Oct 2026 (`founder-brief.md`, "12 Oct 2026", second quote). In his words:*
> "we will be using AI for basically tool calling and all the rules and determinism is already baked out. Uh, from the from the eligibility and uh, score calculation, eligibility assessment point of view. Rest everything is, I think we can be a little bit more uh, non-deterministic the way we talk, the way we follow up, the way we use the language, the way we book the calendar management, so on and so forth. … let's mark it that it is basically rule engine, but we are sending under the flavor of AI. For easy selling, and then this is pure AI, this is pure determinism, and whatever the combination"

*The brief's reading note takes "sending" as "selling". The founder has since answered the selling question himself: AIW-D92 "Replaces the founder's 12 Oct idea of selling rule-engine work 'under the flavour of AI'".*

**What this is.** One table that puts every product capability and every AI skill into one of the four classes AIW-D92 sets:
- **rules only**, never called AI;
- **AI explains rule results**;
- **AI language**;
- **person only**.

The capabilities cover the firm side (AG-01 to AG-18), the platform side (SA-01 to SA-12) and the client portal (CP-1 to CP-9). The skills are the 26 teammate skills (23 before the AIW-D106 note split skills 21 and 22), the summary line and the three product AI calls. The map tests the founder's examples, records which decision answered each conflict, counts each class, and names what is over-AI'd and where an AI layer on top of rules would add real buyer value.

**What it is not.**
- It restates no requirement. Every capability is named in a few words and cited by ID, file and version; the requirement text stays in the team's documents (README §0 rule 3, AIW-D22).
- It designs no non-AI mechanics (memory `ws2-step3-scope-lesson`). Where a capability would need one, the need goes to the team as a question.
- It changes no decision.

**Sources (newest only).**
- Team requirements: `sources/drive-snapshot-2026-10-11/02-functional-requirements/`.
  - Agent side: Agent 00-Overview v1.12 "Detailed Scope Index"; AG-01 v1.18, AG-02 v1.9, AG-03 v1.4, AG-04 v1.5, AG-05 v1.9, AG-06 v1.7, AG-07 v2.7, AG-08 v1.7, AG-09 v1.8, AG-10 v1.10, AG-11 v1.12, AG-12 v1.2, AG-13 v1.12, AG-14 v1.11, AG-15 v1.7, AG-16 v1.13, AG-17 v0.6, AG-18 v1.2.
  - Platform side: Shared 00-Overview v3.9 "Detailed Scope Index"; SA-01 v2.2, SA-01B v1.2, SA-02 v2.21, SA-03 v2.17, SA-04 v2.17, SA-05 v2.4, SA-06 v3.3, SA-07 v2.12, SA-08 v2.4, SA-09 v2.2, SA-10 v2.5, SA-11 v2.7, SA-12 v2.7.
- Newest code copy: `code/ERv2-sanitized@042be70-2026-10-10/`, read only for the assessment engine.
- Client portal: the October CP-01 file is **not on Drive** (`sources/drive-snapshot-2026-10-11/08-client-portal/NOT-FOUND.md`). CP rows therefore cite the older `01-techno-functional/06-Doc-4-Client-Portal.md`, document version 1.3 (3 Jul 2026), and AG-15 v1.7 for the firm side. Where they differ, AG-15 wins (README §0 rule 11).
- Founder Decisions Log, document version 1.5 (`01-techno-functional/07-Founder-Decisions-Log.md`).
- Product Vision v1.0 (team document in `07-team-documents/`, frozen 2 Aug).
- Our files:
  - `founder-brief.md` (12 Oct).
  - `decisions.md`: AIW-D11, D13, D25, D37, D39 to D41, D44, D53 to D55, D71, D72, D77, D79, D81 to D105.
  - `handbook/ai-team-profiles.md` §2 and §4.
  - `design/ai-carve-out-register-2026-10-11.md`: the §1 summary and Registers A.1 to A.11, used as the ID index.
  - `research/ai-architecture-deterministic-2026-10.md` §2.1 (the five-question test), §5.1, §5.3, §7, §9 and part (c).
  - `research/ai-moat-and-positioning-2026-10.md` §3.1, §3.3 and §6.
  - `research/rules-and-ai-positioning-2026-10.md`.
- Web: arXiv 2507.16126v1, "TaxCalcBench", https://arxiv.org/abs/2507.16126v1, read by the R4 checker on 12 Oct 2026 and cited here through the moat research §3.3.

**Labels.**
- [I]: inferred by the maker from the sources.
- *Proposal — not approved*: a capability no requirement or decision contains.
- *Unknown* and *Assumption*: as in README §0 rule 5.

---

## Summary (for the founder)

1. **Product capabilities.** 122 are counted:

   | Class | Count | Notes |
   |---|---|---|
   | Rules only (R) | 80 | — |
   | Person only (H) | 25 | — |
   | AI language (A) | 11 | One is the conversational AI for leads, in Release 1 by AIW-D107: the AI sorts a question into a topic and a rule picks the approved answer (A123) |
   | AI explains rule results (T) | 6 | Free questions to Practice answers are decided for version 2 (AIW-D39); the staff explainer (A21) is decided by the AIW-D98 note; time slots in drafted replies (A27) are in scope by the Lead's ruling (AIW-D106 note (c)); the other three are *Proposals — not approved* |

   One more row, submitting to the government, is listed but not counted: the product never does it (AG-11-54).
2. **AI skills and calls.** Of the 30:
   - **18 are AI language (A)**.
   - **3 are AI explains rule results (T)**: skill 4, skill 14 and the summary line.
   - **9 are rules only (R)**: skills 13, 19 to 23, 21b, 22b and 22c (AIW-D106 note (b), (c)).
3. **The founder's examples now have decided answers.**
   - Eligibility and scoring are rules (AG-3-39, FD-16). An AI teammate may *run* the assessment, and the rules calculate it (AIW-D96). An AI-started run is automatic once the stop check passes (the Lead's ruling, AIW-D106 note (a)).
   - Follow-up timing is rules.
   - Follow-up wording comes from published templates, which send automatically, also inside an AI job (AIW-D105). Any AI-written or AI-edited text is approved before it is sent.
4. **Calendar.** Booking is rules (the Scheduler). An AI teammate may prepare a booking, move or cancellation through the product's own actions; a person approves it before it takes effect (AIW-D93). A conversational AI for booking is in Release 1 (AIW-D107, amending AIW-D102): the AI sorts the lead's question into a topic, a rule picks the approved answer, and booking goes through the Scheduler.
5. **Talking with leads** (AIW-D102):
   - At launch, templates and guided intake questions run automatically, and a chat interface may serve that approved content.
   - Newly AI-written replies need approval.
   - Eligibility is shared only by the consultant (AIW-D41).
6. **Tool calling** (AIW-D93):
   - AI teammates may call read tools and action tools under the delegated person's own permission.
   - Every action with an effect waits in Needs you until a person approves it.
   - The rules engine still computes every rule result.
   - This conflicts with the team's AG-11-94 ("models SHALL have no tool access"). That is the team's subject; the founder asks them to revisit it.
7. **"Already built."**
   - Workstream 2 assumes the rules engine and packs are complete and tested; rule correctness is Workstream 1's (AIW-D98).
   - The 10 Oct code has an assessment engine that creates, saves and replays results. No Canada rules are authored yet, and the team's SA1B-D18 (rules publish untested) is flagged for the team.
   - The AI stops when checks find missing, stale or conflicting evidence (AIW-D98).
   - Buyer material may not say Canada eligibility is built.
8. **Conflicts.** All eight (K1 to K8) are now answered by founder decisions (§6). K7 is answered by the standing AIW-D79.
9. **Over-AI'd.**
   - Skill 13 (sample clients) moves to rules (the Lead's ruling, AIW-D106 note (c)).
   - Skills 10, 11 and 16 should run rules first and use AI only for the rest.
   - A79 and A103 are rules in the team's own requirements.
   - Skills 13, 19 to 23, 21b, 22b and 22c are rules only and are never called AI (AIW-D92).
10. **Highest-value AI layers on rules:** a staff-only explainer of the assessment breakdown and levers (decided by the AIW-D98 note), and Scheduler time slots in drafted replies (in scope by the Lead's ruling, AIW-D106 note (c)).
11. **Headline for selling** (AIW-D99): "An AI team for your immigration practice."
    - Supporting line: "Prepare files, organise documents and draft communications—with maintained rules underneath and your team in control."
    - Supporting message: "Rules you can defend. AI that does the legwork."
    - Rules are never called AI, and "AI-assisted" is not used for assessments, scoring or any rules-only capability (AIW-D92).

---

## 1. The four classes (AIW-D92)

The short codes R, T, A and H are used in the tables. The names are AIW-D92's (README §0 rule 9, one word per thing).

| Code | Class name (AIW-D92) | Plain meaning | Who decides the outcome | Same input, same output? | Where AI is allowed |
|---|---|---|---|---|---|
| **R** | **Rules only** (never called AI) | The product's fixed rules do it: the rule engine, the Conductor (workflow engine), a Doer such as the Scheduler, Biller, Signer, Filler or Minder, or a pack. No model is called. | The rules, set by people in advance. | Yes. For assessments: "identical inputs + version ⇒ identical outputs" (AG-3-39). | Nowhere. An AI teammate may *start* a rules-only step through a product action, under the person's permission (AIW-D93, D96). The result is still R and is labelled as calculated by the rules. |
| **T** | **AI explains rule results** | The rules engine computes the result. The AI fetches it, either by a workflow step or by calling a read tool itself under the delegated person's permission (AIW-D93), and explains or words it with its sources and the pack version (AIW-D98). Explanations stay subject to licensed-person review (AIW-D98 point 4). | The rules. The AI only words the answer. | The result: yes. The wording: no. | Explaining and wording a rule result, subject to licensed-person review (AIW-D98 point 4). The AI never computes a rule result itself. It **stops** with a named failure, sent to a person, when checks find missing, stale or conflicting evidence (AIW-D98). |
| **A** | **AI language** | The AI reads, sorts, drafts, summarises or converses over unstructured input. Output varies from run to run. | A person, for anything with an effect. | No. | Reading, sorting, drafting, summarising, and preparing actions through the product (AIW-D93, D103). Every action with an effect waits for a person's approval first (FD-16; AIW-D13). The approval binds to the exact action previewed (AIW-D103). Exceptions: earned Auto for routine, reversible internal work (AIW-D104), and published-template sends (AIW-D105). |
| **H** | **Person only** | Licensed judgement, a legal act, or a consequential approval. AI may prepare it (AIW-D103) but never does it. | A named person, with their own permission. | — | Preparing material or the action for approval. Signatures stay with the signer (AIW-D103). |

**Tool rules (AIW-D93).**
- AI teammates may call read tools and write or action tools, always under the delegated person's own permission.
- Every action with an effect is a proposal in Needs you until a person approves it; then the platform performs it.
- Text inside client documents never chooses a tool or its inputs (`research/ai-architecture-deterministic-2026-10.md` §7).
- The AI cannot grant itself permissions or bypass product controls (AIW-D103, D101).
- This conflicts with the team's AG-11-94 ("models SHALL have no tool access"): the team's subject, raised by the founder, no change note.
- *Superseded:* the earlier "T-fixed only" ruling (`PROGRESS.md`, R4 row) is widened by AIW-D93.

**AI explains rule results against AI language.** A skill is T when its inputs are rule-built results (fetched by the workflow or by a read tool) and, at most, a staff question, and its job is to word them. It is A when it reads unstructured language or drafts free text from records [I].

**How a row gets its class.** A row's class is the class of whoever decides the outcome in that row. A capability may pass through several classes: for example, the Reader reads (A), a person verifies (H), and the Filler fills (R). Rules-only skills inside an AI teammate are marked *(rules, not AI)* wherever they appear in the "AI may" column.

**Earned Auto (AIW-D104).** Routine, reversible internal actions may run without a per-item approval once three conditions are met: the skill's tests have passed, checked examples from actual use exist, and the Owner has approved. Examples are draft internal notes, ordinary tasks and filing labels. The sample-check rate is set from evidence, the skill drops back to approval when quality falls, and any material change is retested (AIW-D104; `design/ai-autonomy-model-2026-10-12.md` c.6). Rows where this applies say "earned Auto".

**Presets and grid (AIW-D101).**
- Two presets: "Review each step" (the default) and "Review at checkpoints". A role-by-action grid sits under "Customise".
- Safety floors are locked.
- The grid controls autonomy only, within the delegated person's existing permissions; it never grants access.
- Checkpoint approval always happens before the action takes effect.

---

## 2. The test used for every row

The five questions are used exactly as worded in `research/ai-architecture-deterministic-2026-10.md` §2.1: "Ask in order; the first 'yes' decides."

| # | Question (short form) | If yes |
|---|---|---|
| Q1 | Does the result change a legal, financial or consent state, or reach a client, a government body or money? | "A person decides." AI may only prepare a proposal (FD-16; AIW-D13) |
| Q2 | Is there one right answer computable from structured data or a published rule? | "Rule or code (Doer, Pack rule). No AI." |
| Q3 | Is the input unstructured language, a scan or an image? | "AI may propose", with a typed output and a rule check after it |
| Q4 | Can a wrong AI answer be caught cheaply by a rule, a cross-check or the person reviewing? | "AI allowed at APPROVE." If not, off until a test set shows it is reliable |
| Q5 | Must it behave the same every time? | Measure consistency (pass^k) before going live; otherwise keep to rules |

**How Q1 is shown.** Where a rule-run step reaches a client or money, the "Why" column names *which person decides* and in which row, as "Q1 → person: … (row Ax, H); mechanism: Q2". For published-template sends, the firm's approval of the template and its defined automatic use counts as the human approval, also inside an AI job (AIW-D105). Other standing decisions sit in row A121. PR6 still proposes writing this into §2.1.

**Checks** (the "Check" column):
- **Rule test**, plus reproducibility where required (AG-3-26).
- **Driving test** (AIW-D83).
- **pass^k**, for anything that reaches a client draft (`research/ai-architecture-deterministic-2026-10.md` §5.3 item 2): "right every time, not right once".
- **Number check**: every number in AI text appears in the rule-built source.
- **Stop check** (AIW-D98): stop on missing, stale or conflicting evidence.
- **Person approval** in Needs you (AG-11-55 to AG-11-57), bound to the exact action previewed (AIW-D103).

**Buyer labels.** These follow FD-16 ("Marketing may say 'AI-assisted'; it may not say the AI decides"), **as narrowed by AIW-D92**: "AI-assisted" is not used for assessments, scoring or any rules-only capability. Each output carries its class label (AIW-D92).

**The four canonical labels** (the Lead's ruling after review R8; one word per thing, README §0 rule 9). Every output shows one or more of these, in this order:

| Label | Used for | Class |
|---|---|---|
| "Calculated by the rules, pack v[n]" | Any rule result (assessment, score, checklist, invoice amount, readiness). Never called AI (AIW-D92). For an assessment an AI teammate started, prefixed "Run by [AI teammate] for [person];" (AIW-D96) | R |
| "Prepared by [AI teammate]" | Anything an AI teammate prepared or explained: a draft, a reading, a suggestion, an explanation of a rule result, a prepared action | T, A |
| "AI draft: check before use" | Any AI-written or AI-read content not yet approved | T, A |
| "Approved by [person]" | Anything a person approved, verified or decided; Expat Ready keeps the record | H, and every approved T or A output |

The "Say to buyers" column in Tables A and B and the older wording ("AI-drafted, approved by you", "AI-read, rule-checked, verified by you", "AI-suggested, you confirm", "Prepared by AI, approved by you", "Your decision") map to these four: before approval, "Prepared by [AI teammate]" + "AI draft: check before use"; after approval, "Prepared by [AI teammate]" + "Approved by [person]". *The older wording in the table cells is superseded by these four labels (12 Oct 2026).*

**Headline and story order (AIW-D99).**
- Lead headline: "An AI team for your immigration practice."
- Supporting line: "Prepare files, organise documents and draft communications—with maintained rules underneath and your team in control."
- Supporting message: "Rules you can defend. AI that does the legwork."
- Story order: customer benefit first, then the proof (the rules, measured AI performance, the approval record). Measured performance is shown only once it has been measured.

---

## 3. The founder's examples, tested

### 3.1 Follow-up timing against follow-up wording
- **Timing is R.** Sequences and speed-to-lead (AG-2-31, AG-2-35), going cold (AG-2-39), waiting times (AG11-D17, AG-11-99) and repeats (AG-11-15). Q2 decides.
- **Wording is R first, then A.**
  - Published firm templates send automatically. The firm's approval of the template counts as the human approval, also inside an AI job (AIW-D105; AG11-D12).
  - Conditions for those sends: the template is chosen by rule, and merge fields hold only verified facts or approved engine results.
  - AI writes only when no template fits (skill 1). Any AI-written or AI-edited text, including text put into a merge field, needs approval before sending (AIW-D105; the team's floor in Agent 00-Overview v1.12).
- **Strategy [I].** "Follow-ups run on your rules and your templates; where none fits, AI drafts one and you approve it."

### 3.2 Calendar booking against proposing a slot
- **Booking is R:** the Scheduler (AG-4-1 to AG-4-8, AG-4-25, AG-4-26, AG-4-31 to AG-4-43; AG-4-36 to AG-4-39 and AG-4-46 for rescheduling, cancelling and refunds, FD-13). A lead books on the public page (AG-4-16, AG-4-22).
- **AI may prepare a booking action** (AIW-D93): a booking, a move or a cancellation, through the Scheduler's own action and under the person's permission. It waits in Needs you; the approval binds to the exact action (AIW-D103). A refund on cancellation is money (Q1) and needs approval.
- **Proposing slots in a draft** (A27) stays a *Proposal* for T.
- **Conversational booking** is in Release 1 (AIW-D107, amending AIW-D102): the AI sorts the request into the booking topic; the Scheduler books (A123).
- **Note on AIW-D44:** it was about draft invoices, not booking, and is now superseded by AIW-D103.

### 3.3 Eligibility and score
- **R.**
  - AG-3-39 makes the Qualifier "a **deterministic pure function**".
  - The rules and outcomes are pack-supplied (AG-3-5, AG-3-10, AG-3-17 to AG-3-20).
  - Explanation, recommendations and "what-if improvements" are also rule-built (AG-3-21 to AG-3-24).
  - FD-16: "no model output is ever a decision".
  - Models tested in mid-2025 computed rules badly (TaxCalcBench, via moat research §3.3).
- **Who runs it.** An AI teammate may run the assessment when the facts are ready or a person asks, under `agent/assessment:run` (AIW-D96, amending AIW-D40). The run is saved and stamped as AG-03 specifies. Label: "Run by [AI teammate] for [person]; calculated by the rules, pack v[n]".
- **Telling a lead or client the result** stays with a licensed person (AIW-D41, AIW-D96). A consultant overrides an outcome (AG-3-33).
- **How built it is:** see K6 and AIW-D98.

### 3.4 Conversation with leads (AIW-D102, amended by AIW-D107)
- **At launch:** approved templates and guided intake questions run automatically, and an interactive chat interface may serve that approved content (row A122, R).
- **Newly AI-written replies** need approval before sending (A9).
- **In Release 1 (AIW-D107, amending AIW-D102's "later"):** a conversational AI for administrative intake, FAQs and booking. The AI only sorts the lead's question into one approved topic; **a rule, never a model, picks the firm's published answer**; booking goes through the Scheduler; anything else, including eligibility, hands off to a person (row A123, A). No floor is lowered.
- **Limits:** eligibility is shared only by the consultant (AIW-D41); nothing the AI writes reaches a lead unapproved (AG11-D1; FD-16), and any automatic AI-written reply would still need a separate decision with the team.

### 3.5 Tool calling (AIW-D93)
- AI teammates may call read and action tools under the delegated person's permission.
- Actions with an effect are approved first.
- The rules engine computes every rule result.
- AG-11-94 is the team's to revisit.

### 3.6 Language
- **R:** choosing the template language (AG-12-23).
- **A:** drafting in the client's language (skill 1).
- **H:** legal and consent wording in another language (AG-12-24; SA-5-15), and pack French labels (AIW-D79).

---

## 4. Table A: product capabilities, by module

Column key:
- **Class:** R, T, A or H (§1).
- **Why:** the deciding question.
- **AI may / may not:** rules-only skill steps are marked *(rules, not AI)*.
- **Skill numbers [n]** point to Table B.

### 4.1 Firm side (AG-01 to AG-18)

| # | Capability | Where (ID, file version) | Class | Why | AI may / may not (rules-only steps marked) | Check | Say to buyers |
|---|---|---|---|---|---|---|---|
| A1 | Firm, staff, roles, seat limit | AG-1-1, AG-1-13 (AG-01 v1.18); SA-6-1 (SA-06 v3.3) | R | Q2 | No AI | Rule test | Rules only |
| A2 | Licensed-user link that sets who approves by default | AG1-D19 (AG-01 v1.18); Agent 00-Overview v1.12, country-awareness item 7 | R | Q2 | No AI. The product never checks a licence | Rule test | Automatic, on your settings |
| A3 | Lead capture from every source, duplicate check | AG-2-1, AG-2-2 (AG-02 v1.9) | R | Q2 | No AI | Rule test | Rules only |
| A4 | Routing a new lead to an owner | AG-2-12 (AG-02 v1.9) | R | Q2 | No AI | Rule test | Automatic, on your settings |
| A5 | Next-best action on a lead | AG-2-37 (AG-02 v1.9; "rule-based", Register A.11) | R | Q2 | The reason is listed by rule [22] *(rules, not AI)*. AI may not choose the action | Rule test | Rules only |
| A6 | **Follow-up timing**: speed-to-lead, sequences, going cold, waiting times | AG-2-31, AG-2-35, AG-2-39 (AG-02 v1.9); AG11-D17, AG-11-99 (AG-11 v1.12) | R | Q1 → person: the firm's standing decisions (A121); mechanism: Q2 | No AI | Rule test | Automatic, on your settings |
| A7 | **Follow-up wording** from a published firm template, also inside an AI job | AG-12-1 to AG-12-3 (AG-12 v1.2); AG-11-13, AG11-D12 (AG-11 v1.12); AIW-D105 | R | Q1 → person: the firm's approval of the template and its automatic use (AIW-D105; A121); mechanism: Q2 | No AI text. Template chosen by rule; merge fields only from verified facts or approved engine results (AIW-D105) | Rule test; recipient, consent, case-status and duplicate checks (AIW-D105) | Automatic, your templates |
| A8 | Follow-up wording when no template fits | AG-10-15 (AG-10 v1.10); skill [1] | A | Q1; then Q3 | May draft. May not send without approval, promise an outcome (AG-10 BR-10) or include eligibility (AIW-D41) | Person approval; pass^k; driving test | AI-drafted, approved by you |
| A9 | **Conversation with a lead** at launch: newly AI-written replies | AG-10-15, AG-10 BR-10 (AG-10 v1.10); AIW-D41, AIW-D102; skill [1] | A | Q1 | May draft each reply; approval before sending (AIW-D102). Any automatic AI-written reply needs a separate decision with the team | Person approval; pass^k; driving test | AI-drafted, approved by you |
| A10 | Lead marked Won when the retainer is signed | AG-2-28a (AG-02 v1.9) | R | Q2 (follows the signing, A32) | No AI | Rule test | Automatic |
| A11 | Lead marked Lost, with a reason | AG-2-27 (AG-02 v1.9) | H | Q1 | May prepare the move with a reason for approval (AIW-D93) | Person's act, audited | Your decision |
| A12 | New lead from an unknown WhatsApp number | AG-10-58 (AG-10 v1.10), "always a person's click, never AI"; SA8-D19 (team conflict, not ours) | H | Q1 | No AI (the team's own rule) | Person's act | Your decision |
| A13 | **Eligibility** outcome per program | AG-3-10 to AG-3-16, AG-3-39 (AG-03 v1.4); FD-16 | R | Q2, Q5 | No AI computes it | Rule test; reproducibility (AG-3-26) | Calculated by the rules, pack v[n] |
| A14 | **Score calculation** (CRS-type grids, language-level conversion) | AG-3-17 to AG-3-20 (AG-03 v1.4) | R | Q2, Q5 | No AI computes it | Rule test; reproducibility | Calculated by the rules, pack v[n] |
| A15 | Score breakdown and plain explanation | AG-3-21 (AG-03 v1.4); FD-20 | R | Q2 | No AI in the built explanation (see A21) | Rule test | Rules only |
| A16 | Recommendations and "what-if improvements" | AG-3-22 to AG-3-24 (AG-03 v1.4) | R | Q2 | No AI | Rule test | Rules only, indicative |
| A17 | Version stamp, explicit re-run, stale flag | AG-3-25, AG-3-26, AG-3-28, AG-3-29 (AG-03 v1.4) | R | Q2 | An AI teammate may request a re-run through the product (AIW-D96) | Rule test | Rules only, replayable |
| A18 | Running an assessment for a lead | AG-3-1 (AG-03 v1.4); AG-03 §13 Q10; AIW-D96 (amends AIW-D40) | R | Q2 (internal, rule-made) | **An AI teammate may run it** when the facts are ready or a person asks, under `agent/assessment:run`; the rules calculate; saved and stamped (AIW-D96). **Auto** once the stop check passes: internal, saved and rule-computed, so no approval is added (the Lead's ruling, AIW-D106 note (a)). Inputs: a lead's stated answers, labelled "stated by the lead, not verified", or a client's verified values (the Lead's G-2 ruling). Telling the result stays with a licensed person (A20; AIW-D41) | Rule test; stop check (AIW-D98) | "Run by [AI teammate] for [person]; calculated by the rules, pack v[n]" |
| A19 | Consultant override of an outcome | AG-3-33, AG-3-35 (AG-03 v1.4) | H | Q1 | No AI | Person's act, audited | Your decision |
| A20 | Telling a lead or client the eligibility result | AG-3-38 (AG-03 v1.4); AIW-D41, AIW-D96 | H | Q1 | No AI text in it (AIW-D41) | Person's act, audited | Your decision |
| A21 | Staff explainer of an assessment's breakdown and levers | **Decided by the AIW-D98 note** (framework F4 closed); sits on AG-3-21 and AG-3-22 | T | Q2 for the content | May fetch (read tool, AIW-D93) and explain the breakdown and levers the Qualifier computed, with sources and pack version (AIW-D98). May not compute a score or reach a lead (AIW-D41). Questions beyond the computed levers need a run that is not saved: *question for the team* (AG-3-1) | Number check; stop check; driving test; licensed-person review of explanations (AIW-D98 point 4) | AI explains rule results |
| A22 | Free slots and clash-proof booking | AG-4-1 to AG-4-8, AG-4-25, AG-4-26 (AG-04 v1.5) | R | Q2 | AI may prepare a booking, move or cancellation as an action for approval (AIW-D93) | Rule test; person approval of prepared actions | Rules only |
| A23 | Public booking page; the lead books their own slot | AG-4-16, AG-4-22 (AG-04 v1.5) | R | Q1 → person: the lead's own booking; mechanism: Q2 | No AI | Rule test | Automatic |
| A24 | Confirmations, reminders, calendar files | AG-4-31 to AG-4-35 (AG-04 v1.5) | R | Q1 → person: the firm's standing decisions (A121; AIW-D105); mechanism: Q2 | No AI | Rule test | Automatic |
| A25 | Sync with the firm's own calendar | AG-4-40 to AG-4-43 (AG-04 v1.5) | R | Q2 | No AI | Rule test | Automatic |
| A26 | Reschedule, cancel, no-show, refund on cancel | AG-4-36 to AG-4-39, AG-4-46 (AG-04 v1.5); FD-13 | R | Q1 → person: the firm's refund policy, or the platform default (FD-13; A121); mechanism: Q2 | AI may prepare a cancellation or refund for approval (AIW-D93) | Rule test; person approval | Rules only, your policy |
| A27 | **Proposing time slots** inside a drafted reply | **In scope by the Lead's ruling** (AIW-D106 note (c), under AIW-D93 and D102); sits on AG-4-5, AG-4-16 | T | Q2 for the slots; Q1 for the reply | Fetches Scheduler slots (read tool, AIW-D93) and places them with the booking link in a draft. Booking stays with the lead's link or an approved action | Number check; person approval; pass^k | AI explains rule results; reply approved by you |
| A28 | Consultation outcome, recommended pathway and fee | AG-4-49 (AG-04 v1.5) | H | Q1 | May summarise the consultant's typed notes [3]. May not record or transcribe (AIW-D62) | Person's act | Your decision |
| A29 | Proposal from a consultation, from a template | AG-4-50 (AG-04 v1.5) | R | Q2 | No AI (the Drafter here is the template tool, AIW-D53) | Rule test | Automatic |
| A30 | Retainer from a template with locked clauses | AG-5-4, AG-5-8 (AG-05 v1.9); AIW-D54 | R | Q1 → person: signing (A32); mechanism: Q2 | No AI text in the retainer (AIW-D54) | Rule test | Rules only |
| A31 | E-signature with passcode and evidence bundle | AG-5-29 to AG-5-31 (AG-05 v1.9); FD-21; AIW-D42 | R | Q1 → person: signing (A32); mechanism: Q2 | AI may prepare the signature workflow for approval (AIW-D103) | Rule test; person approval | Rules only |
| A32 | Signing and countersigning | Agent 00-Overview v1.12, permission model; AG-15-45 (AG-15 v1.7); AIW-D103 | H | Q1 | Signatures stay with the signer (AIW-D103); never "on behalf" | Person's act | Your decision |
| A33 | Invoice numbers, balances, partial payments | AG-6-5, AG-6-20, AG-6-21 (AG-06 v1.7) | R | Q1 → person: approving issue and recording (A36); mechanism: Q2 | No AI calculates (AIW-D103) | Rule test | Rules only |
| A34 | Overdue sweep and dunning sequence | AG-6-11, AG-6-12 (AG-06 v1.7) | R | Q1 → person: the firm's standing decisions (A121; AIW-D105); mechanism: Q2 | After dunning runs out, AI may draft one personal reminder [1] | Rule test; person approval of the draft | Automatic, on your settings |
| A35 | Trust ledger with running balance; reconciliation report | FD-17 parts (c) and (d); AIW-D72 as amended by AIW-D103 | R | Q1 → person: designations, moves and entries (A36); mechanism: Q2, rules from the Practice Pack | The report-due reminder is made by rule [22] *(rules, not AI)*. AI may **prepare proposed trust entries** for approval (AIW-D103). The rules engine computes balances | Rule test; person approval (the counsel gate was dropped by AIW-D94) | Rules only |
| A36 | Issuing invoices, recording payments, trust designation and moves, refunds | AG-6-19, AG-6-23 (AG-06 v1.7); FD-17 (a), (b); FD-12; AIW-D103 (supersedes AIW-D44; amends AIW-D72, D77) | H | Q1 | AI may **prepare** invoices, proposed trust entries and refunds through the product's own screens (AIW-D103). An authorised person approves before execution, bound to the exact action. The platform never moves money (FD-12) | Person's act; approval bound to preview | Prepared by AI, approved by you |
| A37 | Case steps from the pack | AG-7-9 (AG-07 v2.7) | R | Q2 | A milestone after a letter is prepared by rule [21] *(rules, not AI)* | Rule test | Rules only |
| A38 | Document checklist | AG-7-15 (AG-07 v2.7) | R | Q2 | No AI | Rule test | Rules only |
| A39 | Deficiencies raised and cleared by rule | AG-7-25, AG-7-30 (AG-07 v2.7) | R | Q2 | No AI | Rule test | Rules only |
| A40 | Readiness state | AG7-D14 (AG-07 v2.7) | R | Q2 | The AI may word the rule-built readiness report [4] (T) | Rule test | Rules only |
| A41 | **Government form filling** from verified values | AG-7-59, AG-07 BR-7 (AG-07 v2.7); SA1B-D16, SA-1B-35; FD-5; AIW-D43 | R | Q1 → person: form approval (A42); mechanism: Q2 | No AI fills a value (SA-1B-35). An AI cross-check may follow [7] | Rule test | Rules only (switched off until the form route exists, AIW-D43) |
| A42 | Approving a government form; four eyes | AG-7-65, AG-7-66 (AG-07 v2.7) | H | Q1 | No AI | Person's act | Your decision |
| A43 | Government fees on the case | AG-7-51 (AG-07 v2.7) | R | Q2 | No AI | Rule test | Rules only |
| A44 | Submitting to the government (**listed, not counted**) | AG-11-54 (AG-11 v1.12): "No Doer action SHALL submit anything to a government authority, at any autonomy level" | — | Q1 | No product step | — | You file; Expat Ready never does |
| A45 | Conditional questionnaire, pack defaults | AG-8-5, AG-8-10 (AG-08 v1.7) | R | Q2 | No AI | Rule test | Rules only |
| A46 | Questionnaire invitation; re-score on submit | AG-8-13, AG-8-33 (AG-08 v1.7) | R | Q1 → person: who assigns it; mechanism: Q2 | AI may prepare the assignment for approval (AIW-D93) | Rule test | Automatic |
| A47 | Values proposed from identity documents; answers checked against documents | AG-8-41, AG-8-42, AG-8-45 (AG-08 v1.7); AIW-D100 | A | Q3 | May propose and warn; values stay provisional until approved (AIW-D100). May not overwrite a verified value (AG-8-23) | One review sitting; explicit check of identity details and conflicts (AIW-D100); driving test | AI-read, rule-checked, verified by you |
| A48 | Verifying a value | AG11-D10; Agent 00-Overview v1.12 heading "Approving a Reader value is verifying it (AG11-D10)"; AG-08 BR-22; AIW-D100 | H | Q1 | No AI. Spot checks never count as checking every value (AIW-D100) | Person's act | Your decision |
| A49 | Upload, versions, virus scan, request from client | AG-9-6 (AG-09 v1.8) | R | Q1 → person: who requests; mechanism: Q2 | AI may prepare a document request for approval (AIW-D93) | Rule test | Automatic |
| A50 | Document type (a filing label) | AG-9-11, AG-9-42 (AG-09 v1.8); AIW-D71, AIW-D104 | A | Q3, Q4 | May propose a type. **Earned Auto** possible for filing labels (AIW-D104) | Driving test; checked examples; Owner approval for Auto | AI-suggested, you confirm |
| A51 | Values read from documents | AG-9-43, AG-9-46, AG-09 BR-19 (AG-09 v1.8); AIW-D100 | A | Q3 | May propose with source passage and confidence; provisional until approved. A correction refreshes affected drafts (AIW-D100) | One review sitting; explicit checks for consequential values; ask earlier when a deadline needs it (AIW-D100) | AI-read, rule-checked, verified by you |
| A52 | Dates read from government letters | AG-9-51, AG-09 BR-21; AG-11-108 | A | Q3; Q1 for the deadline | May propose. The date reaches the Minder only after approval; asked early when a deadline depends on it (AIW-D100) | Driving test; person approval | AI-read, verified by you |
| A53 | Documents generated from templates | AG-9-22 (AG-09 v1.8) | R | Q2 | No AI | Rule test | Automatic |
| A54 | One send path; consent; unsubscribe | AG-10-22, AG-10-24, AG-10 BR-1 (AG-10 v1.10) | R | Q1 → person: the recipient's consent (A119); mechanism: Q2 | No AI. Every AI send passes the same gate (AIW-D105) | Rule test | Rules only |
| A55 | Matching inbound messages by reply token, sender, alias | AG-10-10, AG-10-12 (AG-10 v1.10) | R | Q2 | No AI | Rule test | Automatic |
| A56 | Sorting the messages rules could not match (email, portal, WhatsApp) | AG-10-37, AG-10-38; AG-11-67, AG-11-94 | A | Q3, Q4 | May propose a file from a firm-scoped list. An AI-only match is never filed automatically | Driving test; person approval | AI-suggested, you confirm |
| A57 | WhatsApp templates, preferred channel, email fallback | AG-10-57, AG-11-105; SA8-D19 (team conflict, not ours) | R | Q1 → person: the firm's standing decisions (A121; AIW-D105); mechanism: Q2 | No AI | Rule test | Automatic |
| A58 | Choosing the template language | AG-12-23 (AG-12 v1.2) | R | Q2 | No AI | Rule test | Automatic |
| A59 | Legal and consent wording in another language | AG-12-24 (AG-12 v1.2); SA-5-15 (SA-05 v2.4) | H | Q1 | No machine translation | Person authors | Written by a person |
| A60 | Conductor recipes, triggers, conditions | AG-11-1, AG-11-10, AG-11-13 (AG-11 v1.12); Product Vision v1.0 line 292 | R | Q2, Q5 | No AI decides a rule step. AI teammates act only through tools under a person's permission (AIW-D93) | Rule test | Rules only |
| A61 | Autonomy levels, presets and product floors | AG11-D1 (AG-11 v1.12); Agent 00-Overview v1.12; AIW-D95, AIW-D101 | R | Q2 | No AI. Presets "Review each step" (default) and "Review at checkpoints", with a grid under "Customise"; floors locked; the grid never grants access (AIW-D101) | Rule test | Your settings |
| A62 | Approving in Needs you | AG-11-55 to AG-11-57 (AG-11 v1.12); AIW-D103 | H | Q1 | No AI approves. Approval binds to the exact action previewed (AIW-D103) | Person's act, audited | Your decision |
| A63 | Deadline watch (Minder) | AG-11-47, AG-11-48 (AG-11 v1.12); AIW-D37 | R | Q2, Q5 | No AI; never called AI (AIW-D37, D92) | Rule test | Rules only, deadline watching |
| A64 | Waiting times; approvals due before a deadline | AG11-D17, AG-11-99, AG-11-100 (AG-11 v1.12) | R | Q2 | No AI | Rule test | Automatic |
| A65 | AI switch lock; log of every model call | AG-11-93, AG-11-72; AG-16-35 | R | Q2 | Controls the AI; is not AI | Rule test | Rules only |
| A66 | Template library | AG-12-1 to AG-12-3 (AG-12 v1.2) | R | Q2 | No AI | Rule test | Your templates |
| A67 | Tasks, reminders, activity and audit | AG-13-10, AG-13-14, AG-13-65 (AG-13 v1.12); AIW-D104 | R | Q2 | Tasks inside AI teammates are made by rule [22] *(rules, not AI)*. Ordinary AI-proposed tasks may earn Auto (AIW-D104) | Rule test | Automatic |
| A68 | Notes written by staff | Agent 00-Overview v1.12 AG-13 row | H | Not one of the five questions: a person's own professional record | AI may draft an internal note [3]; **earned Auto** possible for draft internal notes (AIW-D104) | Person's act | Your notes |
| A69 | Dashboards and metrics | AG-14-1, AG-14-10 to AG-14-17 (AG-14 v1.11) | R | Q2 | The AI may word figures the rules computed [4] (T) | Rule test | Rules only |
| A70 | Free questions to Practice answers | **Decided for version 2** (AIW-D39; limits AIW-D25) | T | Q2 for the answer | Calls permission-checked read tools (AIW-D93; AG-14-22) and words the answer with sources. May not act (AIW-D25) | Rule test; number check; stop check; driving test | AI explains rule results |
| A71 | Portal setup, invites, nudges | AG-15-32 (AG-15 v1.7) | R | Q1 → person: the staff click, or the firm's standing decisions (A121); mechanism: Q2 | AI may prepare an invite or nudge for approval (AIW-D93) | Rule test | Automatic |
| A72 | "Done on behalf" of a client | AG-15-44, AG-15-45 (AG-15 v1.7) | H | Q1 | No AI | Person's act, marked and audited | Your decision |
| A73 | Firm settings, team safeguards, approval routing (the settings store; changing them is A121) | AG-16-32, AG-16-35, AG-16-49, AG-16-52 (AG-16 v1.13); AG11-D11 | R | Q2 | AI may prepare a settings change for approval (AIW-D103); it can never grant itself permissions (AIW-D101, D103) | Rule test | Your settings |
| A74 | Firm data export | AG-16-20, AG-16-21 (AG-16 v1.13); AIW-D103 | H | Q1 | AI may **prepare** an export for an authorised person's approval (AIW-D103) | Person's act, audited | Prepared by AI, approved by you |
| A75 | LMIA steps, recruitment log, automatic wage, hours and location check, dates | AG-17-26, AG-17-32, AG-17-73 (AG-17 v0.6) | R | Q2 | No AI in the automatic checks | Rule test | Rules only |
| A76 | Recruitment report; message to the employer | AG-17-28, AG-17-82 (AG-17 v0.6) | R | Q1 → person: who sends it; mechanism: Q2 | No AI | Rule test | Automatic |
| A77 | Judging a candidate; ticking the duties match | FD-7; handbook §3.1; AG-17-32 | H | Q1 | May note duty differences [5]. May not tick the match | Person's act | Your decision |
| A78 | Import engine: dry run, known-source adapters, duplicates, undo, quiet records | AG-18-8, AG-18-15, AG-18-43 (AG-18 v1.2); AG18-D9, AG18-D12 | R | Q2 | No AI | Rule test | Rules only |
| A79 | Suggested mapping of old program names | AG-18-10 (AG-18 v1.2): "exact or near match" | R | Q2 | No AI. Free-text column suggestions are skill [10] | Rule test; the Owner confirms | Rules-based suggestion, you confirm |
| A80 | Filing imported documents | AG-18-33 (AG-18 v1.2) | A | Q3, Q4 | May classify and propose a record; earned Auto possible for filing labels (AIW-D104) | Driving test; person review | AI-suggested, you confirm |
| A81 | Data-transfer attestation; verifying imported values | AG-18-49 (AG-18 v1.2); AG18-D10 | H | Q1 | No AI | Person's act | Your decision |
| A82 | Practice answers: four fixed questions | AIW-D39, AIW-D90; AG-14-22 | R | Q2 | One optional summary line [P] (T) | Rule test | Rules only; works with AI off |
| A121 | The firm's standing decisions that rules then carry out: approving its standard messages and their automatic use, turning recipes on, setting its refund policy | AG11-D12, AG-11-21 (AG-11 v1.12); FD-13; AIW-D105 | H | Q1 | No AI | The firm's choice (Owner or its chosen role), recorded; where it sets no refund policy, the founder's platform default (FD-13, ratified 3 Jul 2026) | Your rules, set once |
| A122 | Interactive chat interface at launch, serving approved templates and guided intake questions (*added for AIW-D102*) | AIW-D102; AG11-D1 template sends; AG-8-5 conditional questions | R | Q1 → person: the firm's approval of the content (A121; AIW-D105); mechanism: Q2 | No newly AI-written text in automatic replies (AIW-D102). R assumes a rule picks the answer (guided flow or menu), as the autonomy model does; a model picking among approved answers is open (autonomy E15; framework §9 question 1) | Rule test | Approved answers from your firm |
| A123 | Conversational AI for administrative intake, FAQs and booking (*added for AIW-D102; in Release 1 by AIW-D107*) | AIW-D102 as amended by AIW-D107; AW-1-46 (amended), AW-1-138; handbook skill 24 | A | Q1, Q3 | The AI only sorts the lead's question into one approved topic or *no topic*; **a rule picks the published answer** (AIW-D105); booking through the Scheduler; anything else, including eligibility (AIW-D41), hands off to a person. Any automatic AI-written reply still needs a separate decision with the team | Driving test; pass^k; boundaries tested | AI-sorted; approved answers from your firm |

### 4.2 Platform side (SA-01 to SA-12)

| # | Capability | Where (ID, file version) | Class | Why | AI may / may not (rules-only steps marked) | Check | Say to buyers |
|---|---|---|---|---|---|---|---|
| A83 | Pack versions, validation, pinning each case to its rules | SA-1-47, SA-1-58 (SA-01 v2.2); FD-1, FD-3 | R | Q2, Q5 | No AI | Rule test (rule correctness is Workstream 1's, AIW-D98) | Rules only, dated |
| A84 | Second-person approval to publish a pack | SA1-D6, SA-1-61 (SA-01 v2.2); FD-4 as amended by AIW-D48, AIW-D75 | H | Q1 | May never submit, approve or publish (handbook §3.5) | Person's act | Two people approve every change |
| A85 | Test run on a sample client; compare versions | SA-1-19, SA-1-26, SA-1-52, SA-1-53 | R | Q2 | AI may propose sample clients [13] | Rule test (SA1B-D18 conflict flagged to the team, AIW-D98) | Rules only |
| A86 | Source, date checked, next review, overdue queue on every rule | SA-1B-39, SA-1B-40 (SA-01B v1.2) | R | Q2 | No AI | Rule test | Every rule shows its source and date |
| A87 | Box-map draft from a government form | SA-1B-33 (SA-01B v1.2); skill [11] | A | Q3, Q4 | May draft and compare; a person approves before publishing; never fills at fill time (SA-1B-35) | Driving test; person approval | AI-suggested, you confirm (internal) |
| A88 | Immigration content values | SA-01 v2.2 BR-15 | H | Q1 | May draft rows from a recorded page [12]; never writes into a pack | Person's act | Written by an immigration specialist |
| A89 | Explaining why a test-run result changed | *Proposal — not approved*; would sit on SA-1-19 per-rule results | T | Q2 | Words the engine's per-rule difference. May not set an expected outcome (AW-2-50) | Number check; stop check; driving test | Internal only |
| A90 | Firm lifecycle, health, alerts | SA-2-4, SA-2-14, SA-2-14a (SA-02 v2.21) | R | Q2 | AI may draft outreach after an alert [17] | Rule test | Automatic |
| A91 | Support session inside a firm | SA-2-16 (SA-02 v2.21) | H | Q1 | No AI | Person's act, step-up and reason | Your decision |
| A92 | Plans, features, limits, downgrade check | SA-3-35, SA-3-40, SA-3-58 (SA-03 v2.17); catalogue row 30 | R | Q2 | No AI | Rule test | Rules only |
| A93 | Subscription billing and failed-payment schedule | SA-4-21 (SA-04 v2.17) | R | Q1 → person: the Owner's plan purchase and changes (A94); mechanism: Q2 | No AI | Rule test | Automatic |
| A94 | Plan change; applying a discount | SA-4-28, SA-4-43 (SA-04 v2.17); AIW-D59 | H | Q1 | A change note is prepared and checked by rule [21] *(rules, not AI)*; a second colleague checks it (AIW-D59) | Person's act | Your decision |
| A95 | Explaining a plan, limit or downgrade block to support staff | *Proposal — not approved*; would sit on SA-3-58, SA-4-68 | T | Q2 | Words the rule result. May not promise a credit or discount | Number check; stop check; driving test | Internal only |
| A96 | Global templates, "use until you edit" | Shared 00-Overview v3.9, SA-5 row | R | Q2 | No AI | Rule test | Templates from Expat Ready |
| A97 | Legal wording and French labels | SA-5-15 (SA-05 v2.4); AIW-D79 | H | Q1 | No AI wording (AIW-D79) | Person authors | Written by a person |
| A98 | Firm permission catalogue | SA-6-1 (SA-06 v3.3) | R | Q2 | AI borrows a person's permissions; never has its own (AIW-D13, D93) | Rule test | Rules only |
| A99 | Expat Ready staff accounts and step-up | SA-7-10, SA-7-13 (SA-07 v2.12) | R | Q2 | No AI | Rule test | Rules only |
| A100 | Outside services, the AI provider record, status page | SA-8-26, SA-08 BR-1 (SA-08 v2.4); AIW-D74 | R | Q2 | Controls the AI; is not AI | Rule test | Rules only |
| A101 | Platform metrics and queue health | SA-9-1, SA-9-13 (SA-09 v2.2) | R | Q2 | No AI | Rule test | Internal |
| A102 | Ticket routing by category; service levels | SA-10-6 (SA-10 v2.5) | R | Q2 | No AI | Rule test | Internal |
| A103 | Ticket category and priority suggestion | SA-10-7 (SA-10 v2.5): "from keywords" | R | Q2 | No AI in the team requirement. Skill [16] adds an AI layer (O10) | Rule test; support confirms | Internal |
| A104 | Ready-made replies | SA-10-10 (SA-10 v2.5) | R | Q2 | No AI; chosen first [17] | Rule test | Internal |
| A105 | Drafted ticket replies and help articles | Team: SA-10-23 (keyword suggestions, a rule). The AI drafting is Workstream 2's (AW-02; skills [17], [18]) | A | Q1, Q3 | May draft; may not send without approval or mention another firm | Person approval; pass^k for replies | Internal |
| A106 | Append-only, hash-chained audit log | SA-11-1 to SA-11-4 (SA-11 v2.7) | R | Q2 | Records the AI; is not AI | Rule test | Rules only |
| A107 | Data-residency declaration | SA-11-20 (SA-11 v2.7); AIW-D78 | R | Q2 | No AI | Rule test | Rules only |
| A108 | Retention, legal holds, deletion checks | SA-11-18, SA-11-28 (SA-11 v2.7); AIW-D103 | R | Q1 → person: approving a deletion (A109); mechanism: Q2 | AI may **prepare a deletion request** for approval (AIW-D103); never says "fully deleted" when some is kept | Rule test | Rules only |
| A109 | Breach decisions; identity checks on privacy requests; approving deletions | SA-11-24 to SA-11-26 (SA-11 v2.7); AIW-D103 | H | Q1 | A checklist is made by rule [22] *(rules, not AI)*; AI may draft a reply [1] and prepare a deletion request. AI never verifies identity | Person's act | Your decision |
| A110 | Feature flags; emergency switch | SA-12-1, SA-12-12, SA-12 BR-9 (SA-12 v2.7); AIW-D78 | R | Q2 | Controls the AI; is not AI | Rule test | Rules only |
| A111 | Explaining why an open file is affected by a pack change | *Proposal — not approved*. AG-3-29 only flags assessments as stale. A rule-built list of affected files is a *question for the team* | T | Q2 | If the list exists, words the reasons. May not re-pin anything without a person (FD-3); a re-run follows AIW-D96 | Number check; stop check | AI explains rule results |

### 4.3 Client portal (CP-1 to CP-9)

Source: Doc 4 v1.3 (July); the October CP-01 is not on Drive. The portal specification contains no AI. AIW-D11 rules out applicant-facing AI Workers; AIW-D102 governs what the chat interface may serve (A122, A123).

| # | Capability | Where | Class | Why | AI may / may not | Check | Say to buyers |
|---|---|---|---|---|---|---|---|
| A112 | Sign-in, activation, own-case-only access | CP-1-3 | R | Q2 | No AI | Rule test | Rules only |
| A113 | Case status, timeline, next actions | CP-2-1 | R | Q2 | No AI | Rule test | Automatic |
| A114 | Questionnaire fill and branching | Doc 4 v1.3 CP-3 §3.2 and BR-6 | R | Q2 | No AI in the portal; Reader values are firm-side (A47) | Rule test | Rules only |
| A115 | Uploads and checklist | CP-4-1 | R | Q2 | No AI in the portal; the firm-side upload check is rules only [19] *(rules, not AI)* | Rule test | Automatic |
| A116 | Invoices and online payment | CP-5-1; FD-12 | R | Q1 → person: issuing the invoice (A36) and the client's own payment; mechanism: Q2 | No AI | Rule test | Rules only |
| A117 | Signing | CP-6-1; FD-21; AIW-D103 | H | Q1 | Signatures stay with the signer | The client's act, passcode first | The client signs |
| A118 | Secure messaging | CP-7-1; FD-9 | R | Q2 | No AI talks to the client by itself. Portal messages are sorted firm-side (AG-11-67; A56); staff replies may be AI-drafted and approved [1] | Rule test | Messages from your firm |
| A119 | Profile, notifications, consent | CP-8-1 | H | Q1 (consent) | No AI | The client's act | The client decides |
| A120 | Employer portal | CP-9-1; AIW-D67, AIW-D73 | R | Q1 → person: the employer's own uploads, payments and signatures; mechanism: Q2 | No AI | Rule test | Rules only |

---

## 5. Table B: AI skills and product AI calls

Skill numbers, names and approvers come from `handbook/ai-team-profiles.md` §4. Under AIW-D93, skills may call read tools and prepare actions within the person's permission.

| # | Skill | Built on (team IDs, short) | Class | Why | What it does / may not | Check | Say to buyers |
|---|---|---|---|---|---|---|---|
| 1 | Client message drafter | AG-10-15; AG-11-68; AG-6-12 | A | Q1, Q3 | Drafts when no template fits; approved before sending (AIW-D105) | Person approval; **pass^k**; driving test | AI-drafted, approved by you |
| 2 | Letter drafter | AG-9-22, AG-10-15 | A | Q1, Q3 | Drafts from verified facts; "facts used" list built by rule | Licensed representative approves; pass^k | AI-drafted, approved by your licensed representative |
| 3 | Internal note drafter | AG-11-68; AG-4-49 | A | Q3 | Drafts notes nobody outside sees; **earned Auto** possible (AIW-D104) | Tests passed, checked examples, Owner approval for Auto | AI-drafted, for your eyes |
| 4 | Plain-words summary | AG-07 v2.7 §3.6; AG-14-15 | **T** | Q2: the figures are rule-built | Restates rule-built figures; computes nothing | Number check; stop check | AI explains rule results |
| 5 | Job-duties comparer | AG-17-32 | A | Q3 | Notes differences; never ticks the match | Person approval | AI-suggested, you confirm |
| 6 | LMIA document reader | AG-17-28, AG-17-80 | A | Q3 | Reads résumés and advert screenshots; never judges. **Whose AI call: to be confirmed by the team** | Person approval; driving test (no set yet for adverts) | AI-read, verified by you |
| 7 | Form preparation (cross-check) | AG-7-59; SA-1B-35 | A for the check; filling is R (A41) | Q3; Q2 | Checks a draft; never fills | Person approval; driving test | Rules fill, AI double-checks, you approve (switched off until the form route exists, AIW-D43) |
| 8 | Answer extractor | AG-8-23, AG-8-25 | A | Q3 | Only what the lead's reply states | Person accepts each, stored unverified | AI-suggested, you confirm |
| 9 | Old-note date reader | AG-9-51 | A | Q3 | Never completes a date | Person approves each date | AI-read, verified by you |
| 10 | Firm field mapper | AG-18-8, AG-18-10 | A, **partly R** (O4) | Q2 for known sources; Q3 for free-text columns | Suggests; the Owner confirms each column | Person approval; driving test | AI-suggested, you confirm |
| 11 | Rulebook field mapper | SA-1B-27, SA-1B-33 | A, **partly R** (O5) | Q2 for unchanged fields; Q3 for renamed fields | Suggests "needs review" | Author checks each | Internal |
| 12 | Official page reader | SA-1B-39 | A | Q3 | Drafts rows from a stored page | Author, specialist, second person | Internal |
| 13 | Sample-client proposer | SA-1-52, SA-1B-62 | **R** (moved by the Lead's ruling, AIW-D106 note (c); was A, O3) | Q2 | Picks made-up clients by rule; never sets an outcome | Rule test; author chooses | Internal |
| 14 | Release-note drafter | SA-1-25, SA-1-53; AW-2-51 | **T** | Q2: its input is the rule-built test-run comparison | Each sentence cites its rule, row or box; the author owns, edits and saves it (AW-2-51) | Author edits; each sentence cites its source (AW-2-51, EV-5); a live number check is a Proposal | Audience: *Unknown* (SA-1-67 is a Workstream 2 number, CN-SA-01 change 2); if firms see it, the author's approval stays mandatory |
| 15 | Page-change describer | SA-1B-39, SA-1B-40 | A | Q3 | Describes text differences the rules found | Author decides | Internal |
| 16 | Ticket sorter | SA-10-6, SA-10-7; AW-2-64, AW-2-65 | A, **partly R** (O10) | Q2 for category and priority; Q3 for the likely cause | Suggests from fixed lists; a rule maps cause to fix | Support confirms | Internal |
| 17 | Firm message drafter | SA-10-10; SA-4-43 | A | Q1, Q3 | Ready-made reply first; approved before sending | Sender approves; pass^k | Internal |
| 18 | Help-article drafter | SA-10-23 | A | Q3 | Names removed by rule first | Editor publishes | Internal |
| 19 | Upload and readiness check | SA-1B-18, SA-1B-21; AG-9-26 | R | Q2 | Rules the teammate's workflow runs; no model call | Rule test | Rules only (never "AI") |
| 20 | Message hand-off | AG-10-37, AG-11-74 | R | Q2 | Rules the teammate's workflow runs: routing only | Rule test | Automatic |
| 21 | Ready-to-save proposal (firm) | AG-6-19, AG-6-20; AG-3-10 | R | Q2 | Rules the teammate's workflow runs; a person approves in the product's screen | Rule test; person's act | Prepared by rules; you approve |
| 21b | Account change note (Expat Ready; split from 21 by the AIW-D106 note (b)) | SA-4-28 | R | Q2 | Rules the teammate's workflow runs; a second Expat Ready colleague checks it before someone allowed applies it | Rule test; person's act | Internal |
| 22 | List and reminder maker (internal, firm) | AG-13-10, AG-13-14; AG-6-9 | R | Q2 | Rules the teammate's workflow runs; never marks a deadline met | Rule test | Automatic |
| 22b | Lead fact request (split from 22 by the AIW-D106 note (b)) | AG-3-3, AG-3-12 | R | Q2 | A firm template asking a lead for missing facts, chosen by rule; follows the firm's message settings (AIW-D105) | Rule test; send checks (AIW-D105) | Automatic, your templates |
| 22c | Assessment run (split from 22 by the AIW-D106 note (b)) | AG-3-1; AIW-D96 | R | Q2 | Starts the Qualifier run under `agent/assessment:run`; Auto once the stop check passes (AIW-D106 note (a)); same as A18 | Rule test; stop check (AIW-D98) | "Run by [AI teammate] for [person]; calculated by the rules, pack v[n]" |
| 23 | Rulebook change check | SA-1-24, SA-1-30, SA-1-53 | R | Q2 | Rules the teammate's workflow runs: compares, test-runs, checks files | Rule test | Internal |
| P | Practice-answer summary line | AG-11-70, AG-14-22 | **T** | Q2 | One line; failing lines dropped | Number check; promise-word scan | AI explains rule results (off by default) |
| PA1 | Product AI: Reader on every clean upload | AG-9-42, AG-9-43; AIW-D100 | A | Q3 | Type and values proposed; provisional; reviewed in one sitting (AIW-D100) | Driving test; person approval | AI-read, verified by you |
| PA2 | Product AI: Sorter on every incoming message | AG-10-37, AG-11-67, AG-11-94 | A | Q3, Q4 | Proposes; AI-only matches never filed | Driving test; person approval | AI-suggested, you confirm |
| PA3 | Product AI: Checker cross-check in internal review | AG-7-61, AG-11-69 | A | Q3, Q4 | Warnings only, never locks | Driving test | AI double-check, you decide |

---

## 6. The founder's framing against ratified decisions: now answered

The founder's words are from `founder-brief.md`, "12 Oct 2026", second quote. Every conflict is now answered by a founder decision; the answers are recorded, not re-argued.

| # | The founder's framing (his words) | What it conflicted with | **Answered by** | The answer, in one line |
|---|---|---|---|---|
| K1 | "the way we talk" | AIW-D11; FD-16; AIW-D41; the team's AI-text floor | **AIW-D102**, amended by **AIW-D107** | At launch, templates and guided questions run automatically and a chat interface serves approved content (A122). Newly AI-written replies are approved first (A9). A conversational AI for intake, FAQs and booking is in Release 1 (AIW-D107): the AI sorts into a topic and a rule picks the approved answer (A123). Eligibility stays with the consultant. |
| K2 | "the way we book the calendar management" | FD-16; AIW-D13 | **AIW-D93**, **AIW-D102** | AI may prepare bookings, moves and cancellations through the Scheduler's actions, approved before they take effect (A22). Conversational booking is in Release 1 by AIW-D107 (A123). |
| K3 | "we will be using AI for basically tool calling" | AIW-D25; AIW-D39; AIW-D84; team AG-11-94; Product Vision line 292 | **AIW-D93** | Read and action tools under the person's permission; effects approved first; the rules engine computes. AG-11-94 is the team's to revisit (no change note). The earlier "T-fixed only" ruling is widened. |
| K4 | "Rest everything is, I think we can be a little bit more uh, non-deterministic the way we talk, the way we follow up, the way we use the language" | FD-16; AIW-D13 | **AIW-D105**, **AIW-D104** (FD-16 unchanged) | Template sends count as approved, also inside AI jobs (AIW-D105). Routine, reversible internal work may earn Auto (AIW-D104). Any AI-written client text is still approved first. |
| K5 | "tool calling" read as carrying out product actions | FD-16; AIW-D13; AIW-D25 | **AIW-D93**, **AIW-D103** | Actions are prepared and approved, with approval bound to the exact action. Invoices, proposed trust entries, exports, deletion requests, settings changes and signature workflows may be prepared (AIW-D103). Signatures stay with the signer. |
| K6 | "all the rules and determinism is already baked out … from the eligibility and uh, score calculation, eligibility assessment point of view" | Evidence: SA1B-D18; the Canada pack not authored | **AIW-D98** | Workstream 2 assumes the engine and packs are complete and tested; rule correctness is Workstream 1's, and SA1B-D18 is flagged to the team. The AI uses only approved engine results, cites sources and the pack version, and stops on missing, stale or conflicting evidence. No claim that the AI detects incorrect rules. **Code facts:** an assessment engine exists in the 10 Oct copy (`spine/pack-assessment.controller.ts` lines 139, 152, 165; `pack-assessment-result.ts` lines 24 to 30). Its fit with AG-03 is *Unknown*. No Canada rules are authored (SA-01 v2.2 BR-15); the only Canada file is a development fixture, and a code check keeps immigration content out of the code. **Say:** "an assessment engine exists in the code; the Canada rules are being authored". |
| K7 | "the way we use the language" | AIW-D79; team AG-12-24, SA-5-15 | **AIW-D79** (standing; no new decision) | Drafting in the client's language is allowed; translating templates, legal wording or pack labels by AI is not. |
| K8 | "let's mark it that it is basically rule engine, but we are sending [selling] under the flavor of AI. For easy selling" | FD-16; AIW-D37; AIW-D90 | **AIW-D92** (and the headline, **AIW-D99**) | Four classes, each output labelled; rules only is never called AI. **FD-16 narrowed:** "AI-assisted" is not used for assessments, scoring or any rules-only capability. The product is sold as "An AI team for your immigration practice" (AIW-D99). Evidence: `research/rules-and-ai-positioning-2026-10.md`. |

**Moat (decided).** AIW-D97 amends AIW-D91: the rules alone are not the moat. The moat is the combination of four things:
- dated packs reviewed by two people;
- accuracy measured per skill;
- a full record of every client file;
- being the system of record.

**A caution.** The deadline watch and Practice answers are product features with no AI, and are never called AI (AIW-D37, AIW-D90, AIW-D92).

---

## 7. Counts

**Table A (product capabilities: 123 rows listed, 122 counted)**

| Class (AIW-D92) | Count | Notes |
|---|---|---|
| R — Rules only | 80 | — |
| T — AI explains rule results | 6 | A70 is decided for version 2 (AIW-D39). A21 is decided by the AIW-D98 note. A27 is in scope by the Lead's ruling (AIW-D106 note (c)). A89, A95 and A111 are *Proposals — not approved* |
| A — AI language | 11 | A123 is in Release 1 by AIW-D107 (AI sorts, a rule picks the answer) |
| H — Person only | 25 | — |
| **Counted** | **122** | A44 is listed but not counted (AG-11-54) |

**By side:**

| Side | Rows counted | R | T | A | H |
|---|---|---|---|---|---|
| Firm (A1 to A82, A121 to A123, without A44) | 84 | 55 | 3 | 9 | 17 |
| Platform (A83 to A111) | 29 | 18 | 3 | 2 | 6 |
| Portal (A112 to A120) | 9 | 7 | 0 | 0 | 2 |

**Changes in this revision (AIW-D92 to D105):**
- A122 added as R (the AIW-D102 launch chat interface).
- A123 added as A (the conversational AI; in Release 1 by AIW-D107).
- No existing row changed class. AIW-D93, D96, D100, D101, D103, D104 and D105 changed what the AI may do, not who decides.

**Table B (AI skills and calls, 30 rows):** changed after R7: skill 13 moved from A to R, and three rules-only rows added by splitting skills 21 and 22 (AIW-D106 note (b), (c)). Old numbers are kept; the new rows are 21b, 22b and 22c.

| Class | Count | Rows |
|---|---|---|
| A — AI language | 18 | Skills 1, 2, 3, 5 to 12, 15 to 18, and PA1 to PA3 |
| T — AI explains rule results | 3 | Skills 4 and 14, and the summary line P |
| R — Rules only | 9 | Skills 13, 19, 20, 21, 21b, 22, 22b, 22c, 23 |

**Teammate skills (26):** 15 A, 2 T, 9 R.

**Do not add the two tables together:** the A rows in Table A repeat AI work that Table B also counts.

**Plain reading** (*Assumption: a share of rows as cut here, not of work*). Rules decide in 80 of 122 rows and a person in 25. AI language decides in 11, and the AI explains rule results in 6.

A caution: AIW-D93, D103 and D104 widen what the AI may *prepare and do* across many R and H rows, so the rows understate how much of the work an AI teammate now touches.

---

## 8. Marked AI in our files, but should be rules (over-AI'd)

| # | Item | Where it is marked AI | Why | Suggested change (*Proposal*) |
|---|---|---|---|---|
| O1 | Skill 4, plain-words summary | handbook §4 row 4 | Q2: the figures are rule-built; classed T | Pilot question (as AIW-D62): does the AI wording earn its place over the product's own text? |
| O2 | Summary line (P) | handbook §4 row P; AIW-D62 | Q2; classed T | Decide with AIW-D62's pilot data |
| O3 | Skill 13, sample-client proposer | handbook §4 row 13 | Q2, Q5 [I] | **Moved to rules** (the Lead's ruling, AIW-D106 note (c)). *Question for the team*: can the pack test-run (SA-1-52) supply sample clients for a changed rule? |
| O4 | Skill 10 for known sources | handbook §4 row 10 | Q2: known-source adapters and program names are rules already (A78, A79) [I] | Rules first; AI only for free-text columns |
| O5 | Skill 11 for unchanged fields | handbook §4 row 11 | Q2 [I] | Rules first; AI only for renamed or new fields |
| O6 | Skill 14, release note | handbook §4 row 14 | Q2: input is the rule comparison | Classed T; acceptable only because each sentence cites its source (AW-2-51) |
| O7 | Skills 19 to 23 inside AI teammates | handbook §4 rows 19 to 23 | Rules only | "Rules the teammate's workflow runs"; never called AI (AIW-D92) |
| O8 | The Filler listed among the AI Doers | AG-07 v2.7 BR-23 | Q2 | Team's subject; no change note |
| O9 | "Drafter" used both for an AI Doer and for the template engine | AG11-D4: "**Drafter** (AG-10's AI-assist drafter, callable by any recipe; never promises an outcome)"; Agent 00-Overview v1.12 "In-House by Design"; AG-4-50, AG-5-4 | The name clash | Our files use "Writer" (AIW-D53); the team renames (team's subject) |
| O10 | Skill 16: category and priority | handbook §4 row 16; AW-2-64 | Q2: SA-10-7 "from keywords" | Rules for category and priority; AI only for the likely cause (AW-2-65) |

**Checked and not over-AI'd:** the Sorter (rules first, AG-10-10), the Reader (Q3) and skill 15 (Q3, low value).

---

## 9. Rules capabilities where an AI layer (T) would add real buyer value

V1 is decided by the AIW-D98 note (explanations subject to licensed-person review, D98 point 4); V2 is in scope by the Lead's ruling (AIW-D106 note (c)); V3 is decided for version 2 (AIW-D39); V4 to V6 are *Proposals — not approved*. All call read tools under the person's permission (AIW-D93), stop on missing, stale or conflicting evidence (AIW-D98), and sit behind the driving test (AIW-D83).

| # | On top of | What the AI adds | Why a buyer would pay | Limits |
|---|---|---|---|---|
| V1 | Qualifier breakdown and levers (A15, A16; A21) | Explains the breakdown and the "what-if improvements" already computed (AG-3-21, AG-3-22); the "what if" itself is the team's | Consultation prep, from the firm's pinned pack version | Staff only (AIW-D41); computes nothing. A new saved run follows AIW-D96. A run that is not saved is a *question for the team* |
| V2 | Scheduler (A22; A27) | Real free times and the booking link in drafted replies | Speed to consultation (AG-2-35) | Reply approved; slots equal the Scheduler's; booking by link or approved action (AIW-D93) |
| V3 | Practice answers (A82; A70) | Free questions answered from permission-checked queries | The "expert co-pilot" (AIW-D19) | **Decided for version 2** (AIW-D39); answers only (AIW-D25) |
| V4 | Pack change (A85; A111) | Per affected file, the reason the new rules matter | Makes pack upkeep visible | Needs a rule-built list of affected files: *question for the team*. Re-pin only by a person (FD-3) |
| V5 | Plans and limits (A92; A95) | Reason for a downgrade block, for support staff | Faster support (AIW-D61) | No promises of credit or discount |
| V6 | Pack test run (A85; A89) | Why a sample result changed, rule by rule | Lowers pack upkeep cost (moat research §3.2) | Never sets an expected outcome (AW-2-50) |

**Not recommended for T:** money and trust explanations. AI may now *prepare* invoices and proposed trust entries for approval (AIW-D103), but every calculation stays with the rules engine and adds nothing to explain. The same applies to deadlines (AIW-D37) and to form filling (SA-1B-35).

---

## 10. For the Lead: proposals and open questions

This brief said to write only this file, so nothing was appended to `proposals.md` or `PROGRESS.md`.

| # | Type | Proposal |
|---|---|---|
| PR1 | Rule | Every capability in the blueprint carries its AIW-D92 class and the label from §2; rules only is never called AI. |
| PR2 | — | *Closed by AIW-D93* (tool access widened beyond T-fixed). |
| PR3 | *Settled by the Lead's ruling, AIW-D106 note (c)* | Skill 13 moves to rules (applied in Table B; the team question in O3 stays). Run the rule part first in skills 10, 11 and 16 (O4, O5, O10). Keep skill 4 and P as T, pending the pilot (AIW-D62). |
| PR4 | *Settled* | V1 is decided by the AIW-D98 note; V2 is in scope by the Lead's ruling in the AIW-D106 note (c) as an implementation choice inside the AI layer, not new scope. Both go into the blueprint as NEW items behind the driving test. |
| PR5 | Rule | Wherever a Workstream 2 file lets an AI output take effect through "a person or a Doer", read it as FD-16. The exceptions are earned Auto (AIW-D104, extending AIW-D71 and D80) and published-template sends (AIW-D105). |
| PR6 | Rule: amend `research/ai-architecture-deterministic-2026-10.md` §2.1 (not applied) | State how Q1 is met by a standing decision. AIW-D105 now settles this for template sends; the amendment would cover the rest (refund policy, recipe switches). |
| PR7 | Rule (from R4) | Code claims cite the newest copy in `code/` by file and line. |
| PR8 | Rule (from R4) | A rules-only skill is never listed under "AI may". |

**Lead's own items:**
- The moat research §3.1 still carries the stale "No assessment output" claim.
- AIW-D96 knock-ons (AW-1-88, CN-AG-03 change 1, test R-I4) and AIW-D103 knock-ons (AW-1-37 to AW-1-51, change notes, tests) are the Lead's to list.
- The handbook and the earlier rows of this map that cited AIW-D44 or AIW-D40 are now superseded in this file only.

**Open questions for the founder:** none left from K1 to K8; all are answered by AIW-D79, D92, D93, D98, D102, D103, D104 and D105. PR3 and PR4 are settled by the AIW-D98 note and the Lead's rulings in the AIW-D106 note; the founder may overrule them.

**Questions for the team:**
1. Does the 10 Oct assessment engine meet AG-03's four outcomes (AG-3-10) and its per-factor breakdown (AG-3-20, AG-3-21)?
2. Does the Qualifier offer a run that is not saved (A21, V1)?
3. Is a rule-built list of files affected by a pack change planned (A111, V4)?
4. Can the pack test-run supply sample clients (O3)?
5. Do firms see the pack release note (skill 14)?
6. Will AG-11-94 be revisited for AI tool access (AIW-D93)?
7. How will SA1B-D18 (rules publish untested) be resolved (AIW-D98)?

**Unknowns.** The CP-01 client-portal file (not on Drive).

---

## Sources

- `ai-workers/founder-brief.md`, "12 Oct 2026" (second quote).
- `ai-workers/PROGRESS.md`, R4 row of 12 Oct (the earlier "T-fixed only" ruling, now widened by AIW-D93).
- `ai-workers/README.md` §0 rules 3, 5, 9, 10, 11; §5.
- `ai-workers/decisions.md`: AIW-D9, D11, D13, D19, D21, D22, D25, D37, D39, D40, D41, D42, D43, D44, D48, D53, D54, D59, D61, D62, D67, D71, D72 (and corrections), D73, D74, D75, D77, D78, D79, D80, D81 to D106 (with the AIW-D98 and AIW-D106 notes).
- `ai-workers/checks/review-R4-2026-10-12.md`; `ai-workers/checks/review-R4-b-2026-10-12.md` (including §9, R4-c).
- `ai-workers/handbook/ai-team-profiles.md` §1 to §4, §7.
- `ai-workers/design/ai-carve-out-register-2026-10-11.md` §1; Registers A.1 to A.11.
- `ai-workers/research/ai-architecture-deterministic-2026-10.md` §2.1, §5.1, §5.3, §7, §9.2, part (c).
- `ai-workers/research/ai-moat-and-positioning-2026-10.md` §3.1 to §3.3, §6 row 10.
- `ai-workers/research/rules-and-ai-positioning-2026-10.md`.
- `ai-workers/requirements/AW-01-firm-ai-assistants_v0.1.md` (v0.6), AW-1-87.
- `ai-workers/requirements/AW-02-platform-ai-assistants_v0.1.md` (v0.8): AW-2-50, AW-2-51, AW-2-64, AW-2-65.
- `ai-workers/requirements/change-notes/CN-SA-01.md` change 2.
- Code, under `code/ERv2-sanitized@042be70-2026-10-10/apps/api/`:
  - `src/spine/pack-assessment.controller.ts`, lines 139, 152 and 165;
  - `src/spine/pack-assessment-result.ts`, lines 12 to 14 and 24 to 30;
  - `src/spine/pack-assessment-persistence.service.ts`;
  - `src/pack-authoring/__fixtures__/canada-dev-pack.fixture.ts`;
  - `tools/check-content-neutrality.ts`.
- Founder Decisions Log v1.5: FD-1, FD-3, FD-4, FD-5, FD-7, FD-9, FD-12, FD-13, FD-16, FD-17, FD-20, FD-21, FD-22.
- Doc 4 v1.3: CP-1-3, CP-2-1, CP-3 §3.2 and BR-6, CP-4-1, CP-5-1, CP-6-1, CP-7-1, CP-8-1, CP-9-1.
- `sources/drive-snapshot-2026-10-11/02-functional-requirements/` (files and versions at the top), including:
  - AG-03 v1.4 §3;
  - AG-11 v1.12 AG-11-54, AG-11-67, AG-11-94;
  - SA-10 v2.5 SA-10-7.
- `sources/drive-snapshot-2026-10-11/08-client-portal/NOT-FOUND.md`.
- Product Vision v1.0, line 292.
- arXiv 2507.16126v1, "TaxCalcBench" (via the moat research §3.3).

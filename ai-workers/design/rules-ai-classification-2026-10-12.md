# Rules, AI, or both: one map of every capability

*Expat Ready, Workstream 2. Maker's draft, 12 Oct 2026. Not yet through the adversarial checker. Asked by: the Lead, on the founder's ask of 12 Oct 2026 (relayed in the Lead's brief): "eligibility and score calculation are deterministic rules already built; AI is used for tool calling, talking, follow-up wording, language, calendar handling, and so on".*

**What this is.** One table that puts every product capability (firm side AG-01 to AG-18, platform side SA-01 to SA-12, client portal CP-1 to CP-9) and every AI skill (the 23 teammate skills, the summary line and the three product AI calls) into one of four classes: rules only, AI teammate using rule tools, AI language, or person only. It tests the founder's examples, lists where his framing conflicts with a ratified decision, counts each class, and names what is over-AI'd and where an AI layer on top of rules would add real buyer value.

**What it is not.** It restates no requirement. Every capability is named in a few words and cited by ID, file and version; the requirement text stays in the team's documents (README §0 rule 3, AIW-D22). It designs no non-AI mechanics (memory `ws2-step3-scope-lesson`). It changes no decision: conflicts are stated, not resolved.

**Sources (newest only).**
- Team requirements: `sources/drive-snapshot-2026-10-11/02-functional-requirements/` (Agent 00-Overview v1.12 "Detailed Scope Index"; AG-01 v1.18, AG-02 v1.9, AG-03 v1.4, AG-04 v1.5, AG-05 v1.9, AG-06 v1.7, AG-07 v2.7, AG-08 v1.7, AG-09 v1.8, AG-10 v1.10, AG-11 v1.12, AG-12 v1.2, AG-13 v1.12, AG-14 v1.11, AG-15 v1.7, AG-16 v1.13, AG-17 v0.6, AG-18 v1.2; Shared 00-Overview v3.9 "Detailed Scope Index"; SA-01 v2.2, SA-01B v1.2, SA-02 v2.21, SA-03 v2.17, SA-04 v2.17, SA-05 v2.4, SA-06 v3.3, SA-07 v2.12, SA-08 v2.4, SA-09 v2.2, SA-10 v2.5, SA-11 v2.7, SA-12 v2.7).
- Client portal: the October CP-01 file is **not on Drive** (`sources/drive-snapshot-2026-10-11/08-client-portal/NOT-FOUND.md`). CP rows therefore cite the older `01-techno-functional/06-Doc-4-Client-Portal.md`, document version 1.3 (3 Jul 2026), and AG-15 v1.7 for the firm side. Where they differ, AG-15 wins (README §0 rule 11).
- Founder Decisions Log, document version 1.5 (`01-techno-functional/07-Founder-Decisions-Log.md`).
- Product Vision v1.0 (team document in `07-team-documents/`, frozen 2 Aug).
- Our files: `decisions.md` (AIW-D11, D13, D25, D37, D39 to D41, D44, D53 to D55, D71, D72, D77, D79, D81 to D91); `handbook/ai-team-profiles.md` (§2 three kinds, §4 skill catalogue); `design/ai-carve-out-register-2026-10-11.md` (§1 summary, Registers A.1 to A.11 used as the ID index); `research/ai-architecture-deterministic-2026-10.md` §2.1 (five-question test), §5.1 and §5.3 (pass^k), §9, part (c); `research/ai-moat-and-positioning-2026-10.md` §3.1, §3.3, §6.

**Labels.** [I] = inferred by the maker from the sources, not stated in them. *Proposal — not approved* = a capability that no requirement or decision contains. *Unknown* and *Assumption* as in README §0 rule 5.

---

## Summary (for the founder)

1. Of 120 product capabilities mapped, **76 are rules only (R)**, **26 are a person's act (H)**, **12 use AI for language (A)**, and **6 would be an AI teammate using rule tools (T)**. All 6 T rows are *Proposals — not approved*: nothing in the requirements or decisions today is a T.
2. Of the 27 AI skills and calls, **22 make an AI call (A)** and **5 are rules only (R)**; none is T. So the founder's "tool calling" idea has no home in the current design yet.
3. The founder's examples mostly hold. Eligibility and scoring are rules (AG-3-39, FD-16). Follow-up **timing** is rules. Follow-up **wording** is a firm template first (rules); AI writes only when no template fits, and a person approves it before it is sent.
4. Calendar: **booking is rules** (the Scheduler). AI may at most propose free times from the Scheduler inside a drafted reply (T, Proposal). AI booking, moving or cancelling an appointment by itself conflicts with FD-16 and AIW-D13.
5. "Talking" with leads: AI may **draft** replies for a person to approve (A). An AI that chats with leads or clients by itself conflicts with AIW-D11, FD-16 and AIW-D41.
6. "Tool calling": the team's AG-11-94 says "models SHALL have no tool access". A T that only explains a result the Conductor already fetched fits; a T where the model picks its own tools does not [I].
7. "Already built" is not accurate today: the code check found "No assessment output" and the Canada pack is not authored (SA-01B v1.2 §12; SA-01 v2.2 BR-15), and pack rules are untested by team decision SA1B-D18. Design may assume it (AIW-D21); buyer claims may not.
8. Seven conflicts are listed in §6, unresolved, for the founder.
9. Over-AI'd: the plain-words summary (skill 4), the practice-answer summary line, the sample-client proposer (skill 13), and parts of the two field mappers (skills 10, 11) can be rules. The rules-only skills (19 to 23) must never be sold as AI.
10. Highest-value AI layers on rules: a staff-only "explain this assessment / what if" over the Qualifier, and time-slot proposals from the Scheduler in drafted replies. Both are Proposals.

---

## 1. The four classes

| Class | Plain meaning | Who decides the outcome | Same input, same output? | Where AI is allowed |
|---|---|---|---|---|
| **R — Rules only** | The product's fixed rules do it: the rule engine, the Conductor (the workflow engine), a Doer (an in-house tool such as the Scheduler, Biller, Signer, Filler or Minder), or a country or practice pack. No model is called. | The rules, set by people in advance (pack authors, the firm's settings). | Yes, always. For assessments this is a stated requirement: "identical inputs + version ⇒ identical outputs" (AG-03 v1.4, AG-3-39). | Nowhere. |
| **T — AI teammate using rule tools** | The AI understands a person's request, gets the answer from the rule engine or a product action, and explains it in words. The engine produces every number and outcome; the AI never computes a rule result itself. | The rules. The AI only words the answer. | The result: yes (it is the engine's). The wording: no, it varies. | Understanding the question and wording the answer. |
| **A — AI language** | The AI reads, sorts, drafts, summarises or converses. Output varies from run to run. | A person, for anything with an effect. | No. | Reading, sorting, drafting, summarising. Any effect (send, book, file, sign, money, stage change) needs a person's approval first (FD-16: "every output is human-approved before it has effect"; AIW-D13). |
| **H — Person only** | Licensed judgement or a legal act. AI may prepare material for it but never does it. | A named person, acting with their own permission. | Not applicable. | Preparing material only, where a skill allows it. |

**Two kinds of T** [I]. The difference matters because of AG-11-94 ("models SHALL have no tool access").
- **T-fixed.** A Conductor recipe calls the rule engine as a fixed step. It then passes the engine's result to the AI as data and asks for words. The model never chooses or calls a tool. This fits AG-11-94, AIW-D84 and the reference architecture ("AI output never chooses the next step, tool, recipient or permission", `research/ai-architecture-deterministic-2026-10.md` part (c)).
- **T-free.** The model decides which tool to call and with what inputs. This conflicts with AG-11-94 as worded (see §6, K3).

Every T row below is written as T-fixed unless it says otherwise.

**How a row gets its class.** A row's class is the class of whoever decides the outcome. Where a capability mixes classes (for example the Reader reads a value (A), a person verifies it (H), then the Filler uses it (R)), the row names the class that does the job in that row. The "AI may / may not" column shows the neighbours.

---

## 2. The test used for every row

The five questions from `research/ai-architecture-deterministic-2026-10.md` §2.1, asked in order; the first "yes" decides. The "Why" column cites the question number.

| # | Question (short form) | If yes |
|---|---|---|
| Q1 | Does the result change a legal, financial or consent state, or reach a client, a government body or money? | A person decides: class **H**, or **A** with a person's approval |
| Q2 | Is there one right answer computable from structured data or a published rule? | Class **R** (or **T** if a person asks for it in their own words) |
| Q3 | Is the input unstructured language, a scan or an image? | Class **A** may propose; a rule check follows |
| Q4 | Can a wrong AI answer be caught cheaply by a rule, a cross-check or the reviewer? | AI allowed at "Ask me first"; otherwise off until a test set shows it is reliable |
| Q5 | Must it behave the same every time? | Measure consistency (**pass^k**) before going live, or keep to rules |

**What makes a row trustworthy** (the "Check" column):
- **Rule test.** Ordinary software tests on the rule, plus reproducibility where the requirement asks for it (AG-3-26).
- **Driving test.** An expert-graded test set, then 2 to 4 weeks in shadow, then live with a health light that drops it back (AIW-D83).
- **pass^k.** The same case is run k times and *all* k runs must pass; it measures consistency, not luck. It is required for any skill whose output reaches a client draft (`research/ai-architecture-deterministic-2026-10.md` §5.1, §5.3 item 2). In plain words: "right every time, not right once".
- **Number check.** A rule that every number in the AI's text appears in the rule-built source (as the summary line already does, handbook §4 row P).
- **Person approval.** The item waits in Needs you (the staff approval list, AG-11-55 to AG-11-57).

**Buyer labels** (the "Say to buyers" column). FD-16: "Marketing may say 'AI-assisted'; it may not say the AI decides."
- **R:** "Rules-based: same answer every time" or "Automatic, on your settings". Never called AI (AIW-D37, AIW-D90 set this precedent).
- **T:** "AI-explained, rules-decided".
- **A, client-facing text:** "AI-drafted, approved by you".
- **A, reading:** "AI-read, rule-checked, verified by you".
- **A, sorting:** "AI-suggested, you confirm".
- **H:** "Your decision; Expat Ready keeps the record".

---

## 3. The founder's examples, tested

### 3.1 Follow-up timing against follow-up wording
- **Timing is R.** When to chase, how often and when to stop are rules: sequences and speed-to-lead (AG-2-31, AG-2-35), going cold after N days (AG-2-39), per-firm waiting times (AG11-D17, AG-11-99), repeats with stop conditions re-checked each time (AG-11-15, per Register A.1). Q2 answers yes.
- **Wording is R first, A second.** Most follow-ups are firm templates. Once the firm has passed "Review your standard messages" (AG11-D12), they send automatically with only merge fields filled. That is rules, not AI. AI writes only when no template fits (skill 1; handbook §3.1 "Firm templates come first"). AI-written client text can never send itself: it is a product floor "never lowered below `APPROVE`" (Agent 00-Overview v1.12, "Agent-native operation"). Q1 answers yes.
- **What this means for strategy [I].** "AI follow-up" is mostly a rules-and-templates feature with an AI exception. Selling it as "AI follow-up" would over-claim. The honest line is: "follow-ups run on your rules and your templates; where none fits, AI drafts one and you approve it".

### 3.2 Calendar booking against proposing a slot
- **Booking is R.** The Scheduler works out free times (AG-4-1 to AG-4-8). It re-checks and locks the slot at write time, so two bookings cannot clash (AG-4-25, AG-4-26). It also sends confirmations and calendar files (AG-4-31 to AG-4-35), syncs the firm's own calendar (AG-4-40 to AG-4-43) and applies the reschedule, cancel and refund policy (AG-4-36 to AG-4-39, AG-4-46; FD-13). A lead books their own slot on the public page (AG-4-16, AG-4-22). Q2 answers yes.
- **Proposing a slot could be T** (*Proposal — not approved*). A Conductor step asks the Scheduler for free times, and the AI puts two or three of them into a drafted reply with the booking link. The reply waits for approval like any AI client text. The lead still books through the link, so the Scheduler, not the AI, makes the booking.
- **The limits.** No AW requirement gives any AI teammate a booking duty (AW-01 v0.6 refers to bookings only as "the Scheduler's messages", AW-1-87). Booking, moving or cancelling for a person is an effect, so FD-16 and AIW-D13 apply. A cancellation can also trigger a refund (AG-4-46), which is money: Q1.
- **Note on the brief.** The brief asked us to note AIW-D44 for booking. AIW-D44 is about billing only ("An unsaved draft invoice counts as a billing entry: no assistant creates even a draft"). No ratified decision speaks to AI and booking directly; FD-16 and AIW-D13 are the governing decisions. The nearest analogy is AIW-D54 ("money: assistant proposes, person saves in the product's screen").

### 3.3 Eligibility and score
- **R, confirmed in the requirements.** The Qualifier is "a **deterministic pure function**" (AG-3-39). The pack supplies all program rules, gates and grids (AG-3-5). Outcomes come from a fixed list of four (AG-3-10). Scores come from the pack's grids, with a per-factor breakdown (AG-3-17 to AG-3-20). The rule-built explanation and recommendations are AG-3-21 to AG-3-24. FD-16 says: "The eligibility/scoring/workflow engine stays fully deterministic, versioned and explainable — no model output is ever a decision." Research backs this: models still compute rules badly (`research/ai-moat-and-positioning-2026-10.md` §3.3, TaxCalcBench).
- **The people around it are H.** A person starts an assessment for a lead (AIW-D40). A consultant overrides an outcome (AG-3-33) and decides whether to share it with the client (AG-3-38). No eligibility content goes into any automatic or AI-drafted message to a lead (AIW-D41).
- **"Already built" is not accurate today.** See §6, K6.
- **Where AI could help:** a staff-only "explain this result / what if" over the Qualifier (row A21, T, Proposal).

### 3.4 Conversation with leads
- **A, as drafts only.** The Intake AI prepares the next message from a template, drafting only when none fits, and a person approves it (handbook §3.2; skill 1). Asked "Am I eligible?", the draft offers a consultation instead (handbook §3.2, AIW-D41).
- **Not permitted: an AI that converses with leads or clients by itself** (a web chat bot, a WhatsApp auto-responder or a portal assistant). See §6, K1. The client portal specification has no AI at all; the only Doer it mentions is the Drafter rendering documents (Doc 4 v1.3, CP-6 diagram).

### 3.5 Tool calling
- See §1 (T-fixed and T-free) and §6, K3. Nothing in the current design is T. The closest thing is the AI's own skills, which receive rule-built facts as data: for example, the readiness summary restates the rule-built report (skill 4).

### 3.6 Language
- **Choosing the template language is R** (AG-12-23).
- **Drafting a reply in the client's language is A** (skill 1).
- **Legal and consent wording in another language is H.** It is "authored per locale, never machine-translated" (AG-12-24; SA-5-15). The Pack author's AI proposes no French wording in version 1 (AIW-D79).

---

## 4. Table A: product capabilities, by module

Column key: **Class** R / T / A / H. **Why** = the deciding question from §2. **Check** = what makes it trustworthy. Skill numbers [n] point to Table B.

### 4.1 Firm side (AG-01 to AG-18)

| # | Capability | Where (ID, file version) | Class | Why | AI may / may not | Check | Say to buyers |
|---|---|---|---|---|---|---|---|
| A1 | Firm, staff, roles, seat limit | AG-1-1, AG-1-13 (AG-01 v1.18); SA-6-1 (SA-06 v3.3) | R | Q2 | No AI | Rule test | Rules-based |
| A2 | Licensed-user link that sets who approves by default | AG1-D19 (AG-01 v1.18); Agent 00-Overview v1.12, country-awareness item 7 | R | Q2 | No AI. The product never checks a licence | Rule test | Automatic, on your settings |
| A3 | Lead capture from every source, duplicate check | AG-2-1, AG-2-2 (AG-02 v1.9) | R | Q2 | No AI | Rule test | Rules-based |
| A4 | Routing a new lead to an owner | AG-2-12 (AG-02 v1.9) | R | Q2 | No AI | Rule test | Automatic, on your settings |
| A5 | Next-best action on a lead | AG-2-37 (AG-02 v1.9; "rule-based", Register A.11) | R | Q2 | May word the reason in a list [22]; may not choose the action | Rule test | Rules-based |
| A6 | **Follow-up timing**: speed-to-lead, sequences, going cold, waiting times | AG-2-31, AG-2-35, AG-2-39 (AG-02 v1.9); AG11-D17, AG-11-99 (AG-11 v1.12) | R | Q2 | No AI | Rule test | Automatic, on your settings |
| A7 | **Follow-up wording** from a firm template | AG-12-1 to AG-12-3 (AG-12 v1.2); AG-11-13, AG11-D12 (AG-11 v1.12) | R | Q2 | No AI. Templates send after the firm's one-time review | Rule test; the firm's one review | Automatic, your templates |
| A8 | Follow-up wording when no template fits | AG-10-15 (AG-10 v1.10); skill [1] | A | Q1 then Q3 | May draft. May not send, promise an outcome (AG-10 BR-10) or include eligibility (AIW-D41) | Person approval; pass^k; driving test | AI-drafted, approved by you |
| A9 | **Conversation with a lead**: drafting replies | AG-10-15, AG-10 BR-10 (AG-10 v1.10); AIW-D41; skill [1] | A | Q1 | May draft each reply. May not converse by itself, send, or answer eligibility questions (§6, K1) | Person approval; pass^k; driving test | AI-drafted, approved by you |
| A10 | Lead marked Won when the retainer is signed | AG-2-28a (AG-02 v1.9) | R | Q2 | No AI | Rule test | Automatic |
| A11 | Lead marked Lost, with a reason | AG-2-27 (AG-02 v1.9) | H | Q1 | May not mark won or lost (handbook §3.2) | Person's act, audited | Your decision |
| A12 | New lead from an unknown WhatsApp number | AG-10-58 (AG-10 v1.10): "always a person's click, never AI" (Register A.2) | H | Q1 | No AI | Person's act | Your decision |
| A13 | **Eligibility** outcome per program | AG-3-10 to AG-3-16, AG-3-39 (AG-03 v1.4); FD-16 | R | Q2, Q5 | No AI | Rule test; reproducibility (AG-3-26) | Rules-based: same answer every time |
| A14 | **Score calculation** (CRS-type grids, language-level conversion) | AG-3-17 to AG-3-20 (AG-03 v1.4) | R | Q2, Q5 | No AI | Rule test; reproducibility | Rules-based |
| A15 | Score breakdown and plain explanation | AG-3-21 (AG-03 v1.4); FD-20 | R | Q2 | No AI in the built explanation (see A21) | Rule test | Rules-based, explained |
| A16 | Recommendations: what would raise the score | AG-3-22 to AG-3-24 (AG-03 v1.4) | R | Q2 | No AI | Rule test | Rules-based, indicative |
| A17 | Version stamp, re-run, stale flag | AG-3-25, AG-3-26, AG-3-28, AG-3-29 (AG-03 v1.4) | R | Q2 | No AI | Rule test | Rules-based, replayable |
| A18 | Starting an assessment for a lead | AG-3-28 (AG-03 v1.4); AIW-D40; AG-03 §13 Q10 (open) | H | Q1 (AIW-D40) | May propose a task asking a person to run it [22]. May not run it | Person's act | Your decision |
| A19 | Consultant override of an outcome | AG-3-33, AG-3-35 (AG-03 v1.4) | H | Q1 | No AI | Person's act, audited | Your decision |
| A20 | Sharing eligibility with the client | AG-3-38 (AG-03 v1.4); AIW-D41 | H | Q1 | No AI text in it (AIW-D41) | Person's act, audited | Your decision |
| A21 | Staff "explain this result" and "what if" on an assessment | *Proposal — not approved*; would sit on AG-3-21, AG-3-22 | T | Q2 for the result; Q3 for the question | May turn a staff question into Qualifier inputs, run the engine in an unsaved preview, and explain the engine's answer. May not compute a score, save an Assessment (AG-3-1) or reach a lead (AIW-D41) | Rule test on the engine; number check; driving test | AI-explained, rules-decided |
| A22 | Free slots and clash-proof booking | AG-4-1 to AG-4-8, AG-4-25, AG-4-26 (AG-04 v1.5) | R | Q2 | No AI | Rule test | Rules-based |
| A23 | Public booking page; the lead books their own slot | AG-4-16, AG-4-22 (AG-04 v1.5) | R | Q2 | No AI | Rule test | Automatic |
| A24 | Confirmations, reminders, calendar files | AG-4-31 to AG-4-35 (AG-04 v1.5) | R | Q2 | No AI | Rule test | Automatic |
| A25 | Sync with the firm's own calendar | AG-4-40 to AG-4-43 (AG-04 v1.5) | R | Q2 | No AI | Rule test | Automatic |
| A26 | Reschedule, cancel, no-show, refund policy | AG-4-36 to AG-4-39, AG-4-46 (AG-04 v1.5); FD-13 | R | Q1 (money) answered by a firm-set rule | No AI; may not cancel or refund | Rule test | Rules-based, your policy |
| A27 | **Proposing time slots** inside a drafted reply | *Proposal — not approved*; would sit on AG-4-5, AG-4-16 | T | Q2 for the slots; Q1 for the reply | May place Scheduler-computed slots and the booking link in a draft. May not hold, book, move or cancel (FD-16, AIW-D13) | Number check (slots equal the Scheduler's); person approval; pass^k | AI-drafted with live times from your calendar; approved by you |
| A28 | Consultation outcome, recommended pathway and fee | AG-4-49 (AG-04 v1.5) | H | Q1 | May summarise the consultant's typed notes [3]. May not record or transcribe (handbook §3.2; AIW-D62) | Person's act | Your decision |
| A29 | Proposal from a consultation, from a template | AG-4-50 (AG-04 v1.5) | R | Q2 | No AI (the Drafter here is the template tool, AIW-D53) | Rule test | Automatic |
| A30 | Retainer from a template with locked clauses | AG-5-4, AG-5-8 (AG-05 v1.9); AIW-D54 ("no AI text in the retainer") | R | Q1, Q2 | No AI text | Rule test | Rules-based |
| A31 | E-signature with passcode and evidence bundle | AG-5-29 to AG-5-31 (AG-05 v1.9); FD-21; AIW-D42 | R | Q2 | No AI | Rule test | Rules-based |
| A32 | Signing and countersigning | Agent 00-Overview v1.12, permission model (countersign); AG-15-45 (AG-15 v1.7) | H | Q1 | No AI; never "on behalf" for a signature | Person's act | Your decision |
| A33 | Invoice numbers, balances, partial payments | AG-6-5, AG-6-20, AG-6-21 (AG-06 v1.7) | R | Q2 | No AI | Rule test | Rules-based |
| A34 | Overdue sweep and dunning sequence | AG-6-11, AG-6-12 (AG-06 v1.7) | R | Q2 | After dunning runs out, may draft one personal reminder [1] | Rule test; person approval for the draft | Automatic, on your settings |
| A35 | Trust designation, ledger, reconciliation report | FD-17; AIW-D72 and its two corrections | R | Q1 answered by Practice Pack rules | May remind the reconciler that the report is due, with no figure [22]. May not post, move, tag or compute | Rule test; counsel before real money (AIW-D72) | Rules-based |
| A36 | Saving invoices, recording payments, trust moves, refunds | AG-6-19, AG-6-23 (AG-06 v1.7); AIW-D44, AIW-D72, AIW-D77 | H | Q1 | May open a pre-filled invoice screen [21]. May not create even an unsaved draft invoice (AIW-D44) | Person's act | Your decision |
| A37 | Case steps from the pack | AG-7-9 (AG-07 v2.7) | R | Q2 | May propose a milestone after a letter [21] | Rule test | Rules-based |
| A38 | Document checklist | AG-7-15 (AG-07 v2.7) | R | Q2 | No AI | Rule test | Rules-based |
| A39 | Deficiencies raised and cleared by rule | AG-7-25, AG-7-30 (AG-07 v2.7) | R | Q2 | No AI | Rule test | Rules-based |
| A40 | Readiness state | AG7-D14 (AG-07 v2.7) | R | Q2 | May add a summary line [4] | Rule test | Rules-based |
| A41 | **Government form filling** from verified values | AG-7-59, AG-07 BR-7 (AG-07 v2.7); SA1B-D16, SA-1B-35 (SA-01B v1.2); FD-5; AIW-D43 | R | Q1, Q2 | No AI fills a value (SA-1B-35). A cross-check may follow [7] | Rule test | Rules-based (switched off until the form route exists, AIW-D43) |
| A42 | Approving a government form; four eyes | AG-7-65, AG-7-66 (AG-07 v2.7) | H | Q1 | No AI | Person's act | Your decision |
| A43 | Government fees on the case | AG-7-51 (AG-07 v2.7) | R | Q2 | No AI | Rule test | Rules-based |
| A44 | Submitting to the government | Agent 00-Overview v1.12: "ExpatReady never submits anything to a government authority on its own" | H | Q1 | No AI | Person's act | Your decision |
| A45 | Conditional questionnaire, pack defaults | AG-8-5, AG-8-10 (AG-08 v1.7) | R | Q2 | No AI | Rule test | Rules-based |
| A46 | Questionnaire invitation; re-score on submit | AG-8-13, AG-8-33 (AG-08 v1.7) | R | Q2 | No AI | Rule test | Automatic |
| A47 | Values proposed from identity documents; answers checked against documents | AG-8-41, AG-8-42, AG-8-45 (AG-08 v1.7) | A | Q3 | May propose and warn. May not overwrite a verified value (AG-8-23) or lock anything (AG-08 BR-23) | Person approval; driving test | AI-read, rule-checked, verified by you |
| A48 | Verifying a value | AG11-D10 (AG-11 v1.12); AG-08 BR-22 | H | Q1 | No AI | Person's act ("approving … is verifying it") | Your decision |
| A49 | Upload, versions, virus scan, request from client | AG-9-6 (AG-09 v1.8); Agent 00-Overview v1.12 AG-9 row | R | Q2 | No AI | Rule test | Automatic |
| A50 | Document type | AG-9-11, AG-9-42 (AG-09 v1.8); AIW-D71 | A | Q3, Q4 | May propose a type. In the pilot every type goes to a person (AIW-D71) | Driving test; person approval | AI-suggested, you confirm |
| A51 | Values read from documents | AG-9-43, AG-9-46, AG-09 BR-19 (AG-09 v1.8) | A | Q3 | May propose with source and confidence. May not guess | Driving test; person approval | AI-read, rule-checked, verified by you |
| A52 | Dates read from government letters | AG-9-51, AG-09 BR-21 (AG-09 v1.8); AG-11-108 | A | Q3; Q1 for the deadline | May propose. The date reaches the Minder only after a person approves | Driving test; person approval | AI-read, verified by you |
| A53 | Documents generated from templates | AG-9-22 (AG-09 v1.8) | R | Q2 | No AI | Rule test | Automatic |
| A54 | One send path; consent; unsubscribe | AG-10-22, AG-10-24, AG-10 BR-1 (AG-10 v1.10) | R | Q1 answered by rule | No AI. Every AI draft passes the same gate | Rule test | Rules-based |
| A55 | Matching inbound messages by reply token, sender, alias | AG-10-10, AG-10-12 (AG-10 v1.10) | R | Q2 | No AI | Rule test | Automatic |
| A56 | Sorting the messages rules could not match | AG-10-37, AG-10-38 (AG-10 v1.10); AG-11-94 | A | Q3, Q4 | May propose a file from a firm-scoped list. An AI-only match is never filed automatically | Driving test; person approval | AI-suggested, you confirm |
| A57 | WhatsApp templates, preferred channel, email fallback | AG-10-57, AG-11-105; SA8-D19 (team conflict, not ours) | R | Q2 | No AI | Rule test | Automatic |
| A58 | Choosing the template language | AG-12-23 (AG-12 v1.2) | R | Q2 | No AI | Rule test | Automatic |
| A59 | Legal and consent wording in another language | AG-12-24 (AG-12 v1.2); SA-5-15 (SA-05 v2.4) | H | Q1 | No machine translation | Person authors | Written by a person |
| A60 | Conductor recipes, triggers, conditions | AG-11-1, AG-11-10, AG-11-13 (AG-11 v1.12); Product Vision v1.0 line 292 | R | Q2, Q5 | No AI decides a step ("no model output may trigger or decide an action") | Rule test | Rules-based |
| A61 | Autonomy levels and product floors | AG11-D1 (AG-11 v1.12); Agent 00-Overview v1.12 | R | Q1 answered by a fixed floor | No AI | Rule test | Automatic, on your settings |
| A62 | Approving in Needs you | AG-11-55 to AG-11-57 (AG-11 v1.12) | H | Q1 | No AI approves | Person's act, audited | Your decision |
| A63 | Deadline watch (Minder) | AG-11-47, AG-11-48 (AG-11 v1.12); AIW-D37 | R | Q2, Q5 | No AI; never sold as AI (AIW-D37) | Rule test | Rules-based deadline watching |
| A64 | Waiting times; approvals due before a deadline | AG11-D17, AG-11-99, AG-11-100 (AG-11 v1.12) | R | Q2 | No AI | Rule test | Automatic |
| A65 | AI switch lock; log of every model call | AG-11-93, AG-11-72 (AG-11 v1.12); AG-16-35 (AG-16 v1.13) | R | Q2 | Controls the AI; is not AI | Rule test | Rules-based |
| A66 | Template library | AG-12-1 to AG-12-3 (AG-12 v1.2) | R | Q2 | No AI | Rule test | Your templates |
| A67 | Tasks, reminders, activity and audit | AG-13-10, AG-13-14, AG-13-65 (AG-13 v1.12) | R | Q2 | May create tasks and lists by rule [22] | Rule test | Automatic |
| A68 | Notes written by staff | Agent 00-Overview v1.12 AG-13 row | H | Q1 (a professional record) | May draft an internal note [3]; in the pilot a person reviews each one (AIW-D80) | Person's act | Your notes |
| A69 | Dashboards and metrics | AG-14-1, AG-14-10 to AG-14-17 (AG-14 v1.11) | R | Q2 | May restate figures in words [4] | Rule test | Rules-based |
| A70 | Asking a free question of the firm's records and figures | *Proposal — not approved* as written; AIW-D39 makes free questions version 2 | T | Q2 for the answer; Q3 for the question | May turn a question into a fixed, permission-checked query (AG-14-22) and word the answer. May not act (AIW-D25) | Rule test; number check; driving test | AI-explained, rules-decided |
| A71 | Portal setup, invites, nudges | AG-15-32 (AG-15 v1.7); Agent 00-Overview v1.12 AG-15 row | R | Q2 | No AI | Rule test | Automatic |
| A72 | "Done on behalf" of a client | AG-15-44, AG-15-45 (AG-15 v1.7) | H | Q1 | No AI | Person's act, marked and audited | Your decision |
| A73 | Firm settings, team safeguards, approval routing | AG-16-32, AG-16-35, AG-16-49, AG-16-52 (AG-16 v1.13); AG11-D11 | R | Q2 | No AI | Rule test | Your settings |
| A74 | Firm data export | AG-16-20, AG-16-21 (AG-16 v1.13) | H | Q1 | No AI exports (handbook §3.4) | Person's act, audited | Your decision |
| A75 | LMIA steps, recruitment log, automatic wage, hours and location check, dates | AG-17-26, AG-17-32, AG-17-73 (AG-17 v0.6) | R | Q2 | No AI in the automatic checks | Rule test | Rules-based |
| A76 | Recruitment report; message to the employer | AG-17-28, AG-17-82 (AG-17 v0.6) | R | Q2 | No AI | Rule test | Automatic |
| A77 | Judging a candidate; ticking the duties match | FD-7; handbook §3.1 ("never judges or ranks a job candidate"); AG-17-32 | H | Q1 | May note duty differences [5]. May not tick the match | Person's act | Your decision |
| A78 | Import engine: dry run, known-source adapters, duplicates, undo, quiet records | AG-18-8, AG-18-15, AG-18-43 (AG-18 v1.2); AG18-D9, AG18-D12 | R | Q2 | No AI | Rule test | Rules-based |
| A79 | Suggested mapping for free columns and old program names | AG-18-10 (AG-18 v1.2: "suggestions flagged", Register A.10); skill [10] | A | Q3, Q4 | May suggest. The Owner confirms each column | Driving test; person approval | AI-suggested, you confirm |
| A80 | Filing imported documents | AG-18-33 (AG-18 v1.2) | A | Q3, Q4 | May classify and propose a record; unplaced files go to a review list | Driving test; person review | AI-suggested, you confirm |
| A81 | Data-transfer attestation; verifying imported values | AG-18-49 (AG-18 v1.2); AG18-D10 | H | Q1 | No AI | Person's act | Your decision |
| A82 | Practice answers: four fixed questions | AIW-D39, AIW-D90; AG-14-22 (AG-14 v1.11) | R | Q2 | One optional summary line [P] | Rule test | Rules-based; works with AI off |

### 4.2 Platform side (SA-01 to SA-12)

| # | Capability | Where (ID, file version) | Class | Why | AI may / may not | Check | Say to buyers |
|---|---|---|---|---|---|---|---|
| A83 | Pack versions, validation, pinning each case to its rules | SA-1-47, SA-1-58 (SA-01 v2.2); FD-1, FD-3 | R | Q2, Q5 | No AI | Rule test | Rules-based, dated |
| A84 | Second-person approval to publish a pack | SA1-D6, SA-1-61 (SA-01 v2.2); FD-4 as amended by AIW-D48, AIW-D75 | H | Q1 | May never submit, approve or publish (handbook §3.5) | Person's act | Two people approve every change |
| A85 | Test run on a sample client; compare versions | SA-1-19, SA-1-26, SA-1-52, SA-1-53 (SA-01 v2.2 and SA-01B v1.2) | R | Q2 | May propose sample clients [13] | Rule test (not mandatory at publish: SA1B-D18, SA-1B-38) | Rules-based |
| A86 | Source, date checked, next review, overdue queue on every rule | SA-1B-39, SA-1B-40 (SA-01B v1.2) | R | Q2 | No AI | Rule test | Every rule shows its source and date |
| A87 | Box-map draft from a government form | SA-1B-33 (SA-01B v1.2); skill [11] | A | Q3, Q4 | May draft and compare. A person approves before publishing; never fills at fill time (SA-1B-35) | Driving test; person approval | AI-suggested, you confirm (internal) |
| A88 | Immigration content values | SA-01 v2.2 BR-15 ("authored and signed off by the Immigration SME and product owners") | H | Q1 | May draft rows from a recorded page [12]. May never write into a pack | Person's act | Written by an immigration specialist |
| A89 | Explaining why a test-run result changed | *Proposal — not approved*; would sit on SA-1-19 per-rule results | T | Q2 for the result; Q3 for the question | May word the per-rule difference the engine produced. May not set an expected outcome (AW-2-50) | Number check; driving test | Internal only |
| A90 | Firm lifecycle, health, alerts | SA-2-4, SA-2-14, SA-2-14a (SA-02 v2.21) | R | Q2 | May draft outreach after an alert [17] | Rule test | Automatic |
| A91 | Support session inside a firm | SA-2-16 (SA-02 v2.21) | H | Q1 | No AI | Person's act, step-up and reason | Your decision |
| A92 | Plans, features, limits, downgrade check | SA-3-35, SA-3-40, SA-3-58 (SA-03 v2.17); SA-03 §3.3 catalogue row 30 | R | Q2 | No AI | Rule test | Rules-based |
| A93 | Subscription billing and failed-payment schedule | SA-4-21 (SA-04 v2.17) | R | Q2 | No AI | Rule test | Automatic |
| A94 | Plan change; applying a discount | SA-4-28, SA-4-43 (SA-04 v2.17); AIW-D59 | H | Q1 | May prepare a change note checked by rules [21]. A second colleague checks it (AIW-D59) | Person's act | Your decision |
| A95 | Explaining a plan, limit or downgrade block to support staff | *Proposal — not approved*; would sit on SA-3-58, SA-4-68 | T | Q2 for the result | May word the rule result. May not promise a credit or discount (handbook §3.6) | Number check; driving test | Internal only |
| A96 | Global templates, "use until you edit" | Shared 00-Overview v3.9, SA-5 row | R | Q2 | No AI | Rule test | Templates from Expat Ready |
| A97 | Legal wording and French labels | SA-5-15 (SA-05 v2.4); AIW-D79 | H | Q1 | No AI wording (AIW-D79) | Person authors | Written by a person |
| A98 | Firm permission catalogue | SA-6-1 (SA-06 v3.3) | R | Q2 | AI borrows a person's permissions; never has its own (AIW-D13) | Rule test | Rules-based |
| A99 | Expat Ready staff accounts and step-up | SA-7-10, SA-7-13 (SA-07 v2.12) | R | Q2 | No AI | Rule test | Rules-based |
| A100 | Outside services, the AI provider record, status page | SA-8-26, SA-08 BR-1 (SA-08 v2.4); AIW-D74 | R | Q2 | Controls the AI; is not AI | Rule test | Rules-based |
| A101 | Platform metrics and queue health | SA-9-1, SA-9-13 (SA-09 v2.2) | R | Q2 | No AI | Rule test | Internal |
| A102 | Ticket routing by category; service levels | SA-10-6 (SA-10 v2.5) | R | Q2 | No AI | Rule test | Internal |
| A103 | Ticket category and priority suggestion | SA-10-7 (SA-10 v2.5); skill [16] | A | Q3, Q4 | May suggest. Support staff confirm | Driving test; person confirms | Internal |
| A104 | Ready-made replies | SA-10-10 (SA-10 v2.5) | R | Q2 | No AI; chosen first [17] | Rule test | Internal |
| A105 | Drafted replies and help articles | SA-10-23 (SA-10 v2.5); skills [17], [18] | A | Q1, Q3 | May draft. May not send, or mention another firm | Person approval; pass^k for replies | Internal |
| A106 | Append-only, hash-chained audit log | SA-11-1 to SA-11-4 (SA-11 v2.7) | R | Q2 | Records the AI; is not AI | Rule test | Rules-based record |
| A107 | Data-residency declaration | SA-11-20 (SA-11 v2.7); AIW-D78 | R | Q2 | No AI | Rule test | Rules-based |
| A108 | Retention, legal holds, deletion checks | SA-11-18, SA-11-28 (SA-11 v2.7) | R | Q2 | May never say "fully deleted" when some is kept (handbook §3.4) | Rule test | Rules-based |
| A109 | Breach decisions; identity checks on privacy requests | SA-11-24 to SA-11-26 (SA-11 v2.7) | H | Q1 | May draft a checklist and a reply [22], [1]. May never verify identity | Person's act | Your decision |
| A110 | Feature flags; emergency switch | SA-12-1, SA-12-12, SA-12 BR-9 (SA-12 v2.7); AIW-D78 | R | Q2 | Controls the AI; is not AI | Rule test | Rules-based |
| A111 | List of files a pack change affects, with reasons | *Proposal — not approved*; the rule-built list is moat research §6 row 10 (itself a Proposal); AG-3-29 stale flag | T | Q2 for the list; Q3 for the reasons | May word why each file is affected, from the engine's own difference. May not re-run or re-pin anything (AG-3-28, FD-3) | Rule test; number check | AI-explained, rules-decided |

### 4.3 Client portal (CP-1 to CP-9)

Source: Doc 4 v1.3 (July); the October CP-01 is not on Drive. The portal specification contains no AI, and AIW-D11 rules out applicant-facing AI.

| # | Capability | Where | Class | Why | AI may / may not | Check | Say to buyers |
|---|---|---|---|---|---|---|---|
| A112 | Sign-in, activation, own-case-only access | CP-1-3 | R | Q2 | No AI | Rule test | Rules-based |
| A113 | Case status, timeline, next actions | CP-2-1 | R | Q2 | No AI | Rule test | Automatic |
| A114 | Questionnaire fill and branching | CP-3-5; Doc 4 CP-3 §3.2 ("server-authoritative") | R | Q2 | No AI in the portal. Reader values are firm-side (A47) | Rule test | Rules-based |
| A115 | Uploads and checklist | CP-4-1 | R | Q2 | No AI in the portal. The upload check is firm-side [19] | Rule test | Automatic |
| A116 | Invoices and online payment | CP-5-1; FD-12 | R | Q2 | No AI | Rule test | Rules-based |
| A117 | Signing | CP-6-1; FD-21 | H | Q1 | No AI | The client's act, passcode first | The client signs |
| A118 | Secure messaging | CP-7-1; FD-9 | R | Q2 | Staff replies may be AI-drafted firm-side [1]. No AI talks to the client | Rule test | Messages from your firm |
| A119 | Profile, notifications, consent | CP-8-1 | H | Q1 (consent) | No AI | The client's act | The client decides |
| A120 | Employer portal | CP-9-1; AIW-D67, AIW-D73 | R | Q2 | No AI | Rule test | Rules-based |

---

## 5. Table B: AI skills and product AI calls

Skill numbers, names and approvers are from `handbook/ai-team-profiles.md` §4, which this table cites rather than repeats. The "Kind" given there is shown where this map disagrees.

| # | Skill | Built on (team IDs, short) | Class | Why | AI may / may not (short) | Check | Say to buyers |
|---|---|---|---|---|---|---|---|
| 1 | Client message drafter | AG-10-15; AG-11-68; AG-6-12 | A | Q1, Q3 | Draft when no template fits; never send | Person approval; **pass^k**; driving test | AI-drafted, approved by you |
| 2 | Letter drafter | AG-9-22, AG-10-15 | A | Q1, Q3 | Draft from verified facts; "facts used" list built by rule | Person approval (licensed representative); pass^k | AI-drafted, approved by your licensed representative |
| 3 | Internal note drafter | AG-11-68; AG-4-49 | A | Q3 | Draft notes nobody outside sees | Person review in the pilot (AIW-D80) | AI-drafted, for your eyes |
| 4 | Plain-words summary | AG-07 v2.7 §3.6; AG-14-15 | A, **should be R** (§8) | Q2: the figures already exist | Restates rule-built figures | Number check (Proposal, handbook §4) | AI-summarised from your figures |
| 5 | Job-duties comparer | AG-17-32 | A | Q3 | Notes differences; never ticks the match | Person approval | AI-suggested, you confirm |
| 6 | LMIA document reader | AG-17-28, AG-17-80 | A | Q3 | Reads résumés and advert screenshots; never judges | Person approval; driving test (no test set yet for adverts, handbook §7) | AI-read, verified by you |
| 7 | Form preparation (cross-check) | AG-7-59; SA-1B-35 | A for the cross-check; filling is R (A41) | Q3 for the check; Q2 for the filling | The AI checks a draft; it never fills | Person approval; driving test | Rules fill, AI double-checks, you approve |
| 8 | Answer extractor | AG-8-23, AG-8-25 | A | Q3 | Only what the lead's reply states | Person accepts each, stored unverified | AI-suggested, you confirm |
| 9 | Old-note date reader | AG-9-51 | A | Q3 | Never completes a date | Person approves each date | AI-read, verified by you |
| 10 | Firm field mapper | AG-18-8, AG-18-10 | A, **partly R** (§8) | Q2 for known sources; Q3 for free columns | Suggests; Owner confirms each column | Person approval; driving test | AI-suggested, you confirm |
| 11 | Rulebook field mapper | SA-1B-27, SA-1B-33 | A, **partly R** (§8) | Q2 for unchanged names; Q3 for renamed fields | Suggests "needs review" | Author checks each; driving test | Internal |
| 12 | Official page reader | SA-1B-39 | A | Q3 | Drafts rows from a stored page | Author, specialist and second person | Internal |
| 13 | Sample-client proposer | SA-1-52, SA-1B-62 | A, **should be R** (§8) | Q2: boundary cases follow from the rule | Proposes made-up clients; never sets an outcome | Author chooses | Internal |
| 14 | Release-note drafter | SA-1-25, SA-1-53 | A, **partly R** (§8) | Q2 for the list of changes; Q3 for prose | Each sentence cites its row | Author edits | Internal |
| 15 | Page-change describer | SA-1B-39, SA-1B-40 | A | Q3 | Describes differences the rules found | Author decides | Internal |
| 16 | Ticket sorter | SA-10-6, SA-10-7 | A | Q3, Q4 | Suggests from fixed lists; a rule maps cause to fix | Support confirms | Internal |
| 17 | Firm message drafter | SA-10-10; SA-4-43 | A | Q1, Q3 | Ready-made reply first; never sends | Sender approves; pass^k | Internal |
| 18 | Help-article drafter | SA-10-23 | A | Q3 | Names removed by rule first | Editor publishes | Internal |
| 19 | Upload and readiness check | SA-1B-18, SA-1B-21; AG-9-26 | R | Q2 | Rules only | Rule test | Rules-based checks (never "AI") |
| 20 | Message hand-off | AG-10-37, AG-11-74 | R | Q2 | Routing only | Rule test | Automatic |
| 21 | Ready-to-save proposal | AG-6-19, AG-6-20; AG-3-10; SA-4-28 | R | Q2 | Prepares; a person saves in the product's screen | Rule test; person's act | Prepared by rules; you save |
| 22 | List and reminder maker | AG-13-10, AG-13-14; AG-6-9 | R | Q2 | Builds lists and tasks; never marks a deadline met | Rule test | Automatic |
| 23 | Rulebook change check | SA-1-24, SA-1-30, SA-1-53 | R | Q2 | Compares, test-runs, checks files | Rule test | Internal |
| P | Practice-answer summary line | AG-11-70, AG-14-22 | A, **should be R** (§8) | Q2: the answer already exists | One line; failing lines dropped | Number check; promise-word scan | Optional summary (off by default) |
| PA1 | Product AI: Reader on every clean upload | AG-9-42, AG-9-43 | A | Q3 | Type and values proposed | Driving test; person approval | AI-read, verified by you |
| PA2 | Product AI: Sorter on every incoming message | AG-10-37, AG-11-94 | A | Q3, Q4 | Proposes; AI-only matches never filed | Driving test; person approval | AI-suggested, you confirm |
| PA3 | Product AI: Checker cross-check in internal review | AG-7-61, AG-11-69 | A | Q3, Q4 | Warnings only, never locks | Driving test | AI double-check, you decide |

---

## 6. Where the founder's framing conflicts with a ratified decision

Stated, not resolved. Each one is for the founder.

| # | The founder's framing (12 Oct) | What it conflicts with | The conflict, in one line |
|---|---|---|---|
| K1 | AI is used for **talking** with leads | **AIW-D11** ("No applicant-facing AI Workers in the design or the investor story"); **FD-16** ("every output is human-approved before it has effect"); **AIW-D41** (no eligibility content in any AI-drafted message to a lead); team floor in Agent 00-Overview v1.12 (AI-written client text never below "Ask me first") | AI may draft each reply for a person to approve; an AI that converses with leads or clients by itself is ruled out by AIW-D11 and FD-16. |
| K2 | AI is used for **calendar handling** | **FD-16**; **AIW-D13** ("nothing takes effect until a human approves it") | If "handling" means the AI books, moves or cancels appointments, that is an effect without approval. Proposing Scheduler times in a draft (A27) does not conflict. (AIW-D44, cited in the brief, is about draft invoices, not booking.) |
| K3 | AI is used for **tool calling** | **AIW-D25** ("Expert co-pilot, no actions"); **AIW-D39** (version 1: four fixed questions; free questions are version 2); **AIW-D84** (the platform's own rules and workflow do every step whose result must always be the same); team requirement **AG-11-94** ("models SHALL have no tool access"); Product Vision v1.0 line 292 ("no model output may trigger or decide an action") | A T-fixed explainer (the Conductor calls the rule tool; the AI only explains) fits AIW-D25 and AIW-D84 but needs AIW-D39's version 2. A T-free agent that picks its own tools conflicts with AG-11-94 (a team requirement; changing it is the team's call) and with the reference architecture. |
| K4 | The Lead's brief defines class A as: an effect needs "a person or a deterministic Doer" | **FD-16**; **AIW-D13** | FD-16 needs a person's approval before any AI output has effect. A Doer acting on AI output with no person in between is allowed only for the internal carve-outs AIW-D71 (document labels) and AIW-D80 (internal notes), and in the pilot even those go to a person. This map uses the FD-16 reading. |
| K5 | The Lead's brief defines class T as calling "the rule engine **or product actions** as tools" | **FD-16**; **AIW-D13**; **AIW-D25** | A product action with an effect (stage change, send, booking, money) can only be prepared as a proposal for a person. A T that triggers actions directly would make the AI an actor, which FD-16 rules out ("AI is NOT a first-class actor"). |
| K6 | Eligibility and score calculation are "**already built**" | Not a decision conflict. It conflicts with the evidence: SA-01B v1.2 §12 code check ("No assessment output"; cited in `research/ai-moat-and-positioning-2026-10.md` §3.1); Canada content not authored (SA-01 v2.2 BR-15, §13); pack rules untested by team decision **SA1B-D18**. **AIW-D21** lets design assume it is built; **AIW-D9** (investor-grade) does not let buyer or investor material say so | Say "specified as a deterministic engine" until the code and the Canada pack exist. |
| K7 | AI is used for **language** | **AIW-D79** (no AI French wording for packs in version 1); team rules AG-12-24 and SA-5-15 (legal and consent copy never machine-translated) | Drafting a reply in the client's language is allowed (skill 1). Translating templates, legal wording or pack labels by AI is not. |

**Related, already pending with the founder.** Organising the strategy around "rules decide, AI writes" sits on AIW-D91 ("hard to copy … a rival … cannot reproduce the rules"). The moat research found the rules themselves are public (`research/ai-moat-and-positioning-2026-10.md` §3.1). Founder question 1 (moat as the combination) is open (`NEXT.md`); this map does not answer it.

**A caution, not a conflict.** "And so on" could pull in the deadline watch or Practice answers. Both are product features with no AI and are never sold as AI (AIW-D37, AIW-D90).

---

## 7. Counts

**Table A (product capabilities, 120 rows)**

| Class | Count | Of which Proposal — not approved |
|---|---|---|
| R — Rules only | 76 | 0 |
| T — AI teammate using rule tools | 6 | 6 (A21, A27, A70, A89, A95, A111) |
| A — AI language | 12 | 0 |
| H — Person only | 26 | 0 |
| **Total** | **120** | 6 |

By side: firm (A1 to A82) R 52, T 3, A 10, H 17; platform (A83 to A111) R 17, T 3, A 3, H 6; portal (A112 to A120) R 7, A 0, H 2.

**Table B (AI skills and calls, 27 rows)**

| Class | Count | Rows |
|---|---|---|
| A — AI language | 22 | Skills 1 to 18, P, PA1 to PA3 |
| R — Rules only | 5 | Skills 19 to 23 |
| T | 0 | — |
| H | 0 | — |

This matches the handbook's own split (§4: "18 make an AI call … and 5 are rules only", plus one AI line and three product AI calls). **Do not add the two tables together.** The A rows in Table A (for example A8, A51, A56) are the same AI work as skills 1, PA1 and PA2, seen from the module side.

**If §8 is accepted** (*Proposal*): teammate skills become 16 AI and 7 rules only, the summary line becomes rules, and Table B becomes 19 A and 8 R.

**Plain reading.** Across the whole product, AI does the language in 12 of 120 capabilities (10%) [I]. A person decides in 26, and rules do the other 76. That supports the founder's "rules decide, AI writes" story, but the AI share is smaller than "AI is used for tool calling, talking, calendar handling" suggests. It also matches the register's finding that "much less is model work than the name suggests" (register §1 item 4: 26 of 202 AW requirements call a model).

---

## 8. Marked AI in our files, but should be rules (over-AI'd)

| # | Item | Where it is marked AI | Why it should be R (five-question test) | Suggested change (*Proposal*) |
|---|---|---|---|---|
| O1 | Skill 4, plain-words summary (readiness summary, day-list reasons, money note, weekly note) | handbook §4 row 4, "AI writes" | Q2: every figure is rule-built already; a sentence template can say it. AI adds the risk of a misquoted number, which the handbook then tests for (E-7) | Rule-built sentence templates; keep AI off unless the pilot shows staff read the AI version more |
| O2 | Practice-answer summary line (P) | handbook §4 row P; AIW-D62 (decide after the pilot) | Q2: it restates an answer that exists; the safety rules already drop any line whose numbers do not match | A rule-built one-liner. Decide with AIW-D62's pilot data |
| O3 | Skill 13, sample-client proposer | handbook §4 row 13, "AI writes" | Q2, Q5: test clients for a changed gate or grid follow from the rule (just above, at, just below each threshold). A rule generates them the same way every time and covers every boundary [I] | Rule-generated boundary profiles; AI only to name them in plain words, if at all |
| O4 | Skill 10, firm field mapper, for known sources | handbook §4 row 10, "AI sorts" | Q2: Officio, CaseEasy and Expat Ready's own templates have fixed columns (AG18-D12); one mapping per adapter | Fixed adapter mapping by rule; AI only for free columns (A79) |
| O5 | Skill 11, rulebook field mapper, for unchanged fields | handbook §4 row 11, "AI sorts" | Q2: a field whose name and position are unchanged maps by exact match | Exact match by rule first; AI only for renamed or new fields |
| O6 | Skill 14, release-note drafter, the list of changes | handbook §4 row 14 | Q2: the list of what changed comes from the rule comparison (SA-1-53) | The list built by rule; AI only for a short plain-words lead-in |
| O7 | Skills 19 to 23 (rules only) counted inside AI teammates | handbook §4 rows 19 to 23 | Already rules, but they sit under "AI teammates" and could be sold as AI | Label them "automatic, by rules" on screens and in sales (the AIW-D37 precedent) |
| O8 | The Filler listed among the AI Doers | AG-07 v2.7 BR-23 (register §1 item 10) | Q2: filling is rule-based by its own definition and SA1B-D16 | Team's subject: state it, write no change note (README §0 rule 11) |
| O9 | "Drafter (AI writer)" in the team's documents | AG11-D4, AG-11-68 (AG-11 v1.12); Agent 00-Overview v1.12 "In-House by Design" | The same name is used for the template engine (AG-4-50, AG-5-4). Buyers may think retainers are AI-written, which AIW-D54 forbids | Already decided for our files (AIW-D53); the team's documents still need the rename (team's subject) |

Not over-AI'd, checked: the Sorter already matches by rule first (AG-10-10) and uses AI only for the rest (AG-10-37). The Reader works on scans and images (Q3). Skill 15 is weak value but correctly AI; the handbook already says it can run with no AI call ("changed, not summarised").

---

## 9. Rules capabilities where an AI layer (T) would add real buyer value

All *Proposal — not approved*, all T-fixed (§1), all behind the driving test (AIW-D83). Ranked by buyer value [I].

| # | On top of | What the AI adds | Why a buyer would pay | Limits that keep it safe |
|---|---|---|---|---|
| V1 | Eligibility and scoring (A13 to A16; row A21) | Staff ask "why is this below the cut-off?" or "what if the language score rises one band?" The Conductor runs the Qualifier in an unsaved preview; the AI explains the engine's answer | Consultants spend consultation prep on exactly this; rivals sell CRS tools (moat research §3.1). Here the explanation comes from the firm's own pinned pack version | Staff only (AIW-D41); preview is not an Assessment (AG-3-1); a real re-run stays explicit (AG-3-28); number check on every figure |
| V2 | Scheduler (A22; row A27) | Drafted replies carry two or three real free times and the booking link | Speed to consultation is the intake metric firms care about (AG-2-35 seeds speed-to-lead) | The lead still books by link; the reply is approved like any AI text; the slots must equal the Scheduler's |
| V3 | Practice answers and dashboards (A69, A82; row A70) | Free questions answered from fixed, permission-checked queries, with sources | It is the "expert co-pilot" shape the founder asked for (AIW-D19), done without a model computing anything | AIW-D39 makes this version 2; answers only (AIW-D25); same permissions as the asker (AG-14-22) |
| V4 | Pack change (A85, A111) | Per file: "this client's score moves from X to Y under the new rules, because …" | Makes pack upkeep visible each week; rivals sell policy watch as AI (moat research §3.1, §6 row 10) | Nothing is re-run or re-pinned without a person (FD-3, AG-3-28) |
| V5 | Plans and limits (A92; row A95) | Support staff get the reason for a downgrade block in plain words | Faster support; not sold to firms (AIW-D61) | Never promises a credit or discount (handbook §3.6) |
| V6 | Pack test run (A85; row A89) | The author sees why a sample client's result changed, rule by rule | Lowers the cost of keeping packs current (the moat's fixed cost, moat research §3.2) | Never sets an expected outcome (AW-2-50) |

Not recommended for T: fees, invoices, trust money and payment matching (Q1; AIW-D44, AIW-D72); deadlines (AIW-D37: product feature; Practice answers already covers "what is at risk"); form filling (SA-1B-35).

---

## 10. For the Lead: proposals and open questions

This brief said to write only this file, so nothing was appended to `proposals.md` or `PROGRESS.md`. The Lead may place these.

| # | Type | Proposal |
|---|---|---|
| PR1 | Rule | Every capability in the Step R blueprint carries one class letter (R, T, A, H) and the buyer label from §2; an R capability is never described as AI. |
| PR2 | Decision (founder) | Allow only **T-fixed** (the Conductor calls the rule tool; the AI explains). T-free would need the founder's decision and the team's change to AG-11-94. |
| PR3 | Decision (founder) | Move skill 4, the summary line (P) and skill 13 to rules; split skills 10, 11 and 14 into rule first, AI for the remainder (§8). |
| PR4 | Plan | Add V1 (assessment explainer, staff only) and V2 (slot proposals in drafts) to the blueprint as NEW items, behind the driving test. |
| PR5 | Rule | Wherever a Workstream 2 file says an AI output's effect may come from "a person or a Doer", correct it to FD-16's reading: a person's approval, except the AIW-D71 and AIW-D80 internal carve-outs. |

**Open questions for the founder** (one at a time, per the Lead's habit):
1. By "calendar handling", do you mean the AI books appointments by itself, or that it proposes times for a person to send? Only the second fits FD-16 (K2).
2. By "talking", do you mean an AI that chats with leads by itself? AIW-D11 rules that out today (K1).
3. Do you accept T-fixed only (K3, PR2)?

**Unknowns.** Whether the Release 1 code computes any assessment today (the last code check is dated 22 Sep and found none; a fresh check is the team's). The CP-01 client-portal file (not on Drive).

---

## Sources

- `ai-workers/README.md` §0 rules 3, 5, 10, 11; §5.
- `ai-workers/decisions.md`: AIW-D9, D11, D13, D19, D21, D22, D25, D37, D39, D40, D41, D42, D43, D44, D48, D53, D54, D59, D61, D62, D67, D71, D72 (and corrections), D73, D74, D75, D77, D78, D79, D80, D81 to D91.
- `ai-workers/handbook/ai-team-profiles.md` §1 to §4, §7.
- `ai-workers/design/ai-carve-out-register-2026-10-11.md` §1 items 4 and 10; Registers A.1 to A.11.
- `ai-workers/research/ai-architecture-deterministic-2026-10.md` §2.1, §2.3, §5.1, §5.3, §9.2, part (c).
- `ai-workers/research/ai-moat-and-positioning-2026-10.md` §3.1, §3.2, §3.3, §6 row 10.
- `ai-workers/requirements/AW-01-firm-ai-assistants_v0.1.md` (document v0.6), AW-1-87.
- `sources/drive-snapshot-2026-10-11/01-techno-functional/07-Founder-Decisions-Log.md` (v1.5): FD-1, FD-3, FD-4, FD-5, FD-7, FD-9, FD-12, FD-13, FD-16, FD-17, FD-20, FD-21, FD-22.
- `sources/drive-snapshot-2026-10-11/01-techno-functional/06-Doc-4-Client-Portal.md` (v1.3): CP-1-3, CP-2-1, CP-3-5, CP-4-1, CP-5-1, CP-6-1, CP-7-1, CP-8-1, CP-9-1.
- `sources/drive-snapshot-2026-10-11/02-functional-requirements/agent/` and `super-admin/` and `shared/`: files and versions as listed at the top; the Agent 00-Overview v1.12 sections "Detailed Scope Index", "Agent-native operation", "How Country-Awareness Works", "In-House by Design", "Agent Console Sub-Roles".
- `sources/drive-snapshot-2026-10-11/08-client-portal/NOT-FOUND.md`.
- Product Vision v1.0 (team document, `07-team-documents/`, frozen 2 Aug), line 292.

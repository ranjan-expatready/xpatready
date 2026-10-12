# Rules, AI, or both: one map of every capability

*Expat Ready, Workstream 2. Maker's draft, 12 Oct 2026, revised the same day after hostile check R4 (`checks/review-R4-2026-10-12.md`, verdict PASS WITH FIXES) and the Lead's rulings on M-1, M-2, M-3, M-4, M-5 and M-6. Asked by: the Lead, on the founder's ask of 12 Oct 2026 (relayed in the Lead's brief): "eligibility and score calculation are deterministic rules already built; AI is used for tool calling, talking, follow-up wording, language, calendar handling, and so on".*

**What this is.** One table that puts every product capability (firm side AG-01 to AG-18, platform side SA-01 to SA-12, client portal CP-1 to CP-9) and every AI skill (the 23 teammate skills, the summary line and the three product AI calls) into one of four classes: rules only, AI teammate using rule tools, AI language, or person only. It tests the founder's examples and lists where his framing conflicts with a ratified decision. It counts each class, and names what is over-AI'd and where an AI layer on top of rules would add real buyer value.

**What it is not.** It restates no requirement. Every capability is named in a few words and cited by ID, file and version; the requirement text stays in the team's documents (README §0 rule 3, AIW-D22). It designs no non-AI mechanics (memory `ws2-step3-scope-lesson`). Where a capability would need one, the need is put to the team as a question. It changes no decision: conflicts are stated, not resolved.

**Sources (newest only).**
- Team requirements: `sources/drive-snapshot-2026-10-11/02-functional-requirements/`:
  - Agent side: Agent 00-Overview v1.12 "Detailed Scope Index"; AG-01 v1.18, AG-02 v1.9, AG-03 v1.4, AG-04 v1.5, AG-05 v1.9, AG-06 v1.7, AG-07 v2.7, AG-08 v1.7, AG-09 v1.8, AG-10 v1.10, AG-11 v1.12, AG-12 v1.2, AG-13 v1.12, AG-14 v1.11, AG-15 v1.7, AG-16 v1.13, AG-17 v0.6, AG-18 v1.2.
  - Platform side: Shared 00-Overview v3.9 "Detailed Scope Index"; SA-01 v2.2, SA-01B v1.2, SA-02 v2.21, SA-03 v2.17, SA-04 v2.17, SA-05 v2.4, SA-06 v3.3, SA-07 v2.12, SA-08 v2.4, SA-09 v2.2, SA-10 v2.5, SA-11 v2.7, SA-12 v2.7.
- Newest code copy: `code/ERv2-sanitized@042be70-2026-10-10/` (read only for the assessment engine, M-1).
- Client portal: the October CP-01 file is **not on Drive** (`sources/drive-snapshot-2026-10-11/08-client-portal/NOT-FOUND.md`). CP rows therefore cite the older `01-techno-functional/06-Doc-4-Client-Portal.md`, document version 1.3 (3 Jul 2026), and AG-15 v1.7 for the firm side. Where they differ, AG-15 wins (README §0 rule 11).
- Founder Decisions Log, document version 1.5 (`01-techno-functional/07-Founder-Decisions-Log.md`).
- Product Vision v1.0 (team document in `07-team-documents/`, frozen 2 Aug).
- Our files:
  - `decisions.md`: AIW-D11, D13, D25, D37, D39 to D41, D44, D53 to D55, D71, D72, D77, D79, D81 to D91.
  - `handbook/ai-team-profiles.md`: §2 (three kinds) and §4 (skill catalogue).
  - `design/ai-carve-out-register-2026-10-11.md`: the §1 summary, with Registers A.1 to A.11 used as the ID index.
  - `research/ai-architecture-deterministic-2026-10.md`: §2.1 (the five-question test), §5.1 and §5.3 (pass^k), §9 and part (c).
  - `research/ai-moat-and-positioning-2026-10.md`: §3.1, §3.3 and §6.
- Web: arXiv 2507.16126v1, "TaxCalcBench", https://arxiv.org/abs/2507.16126v1, as read by the R4 checker on 12 Oct 2026 and cited through the moat research §3.3.

**Labels.** [I] = inferred by the maker from the sources, not stated in them. *Proposal — not approved* = a capability that no requirement or decision contains. *Unknown* and *Assumption* as in README §0 rule 5.

---

## Summary (for the founder)

1. **Product capabilities.** 120 are counted:
   - **79 are rules only (R)**;
   - **25 are a person's act (H)**;
   - **10 use AI for language (A)**;
   - **6 would be an AI teammate using rule tools (T)**. One of these, free questions to Practice answers (A70), is decided for version 2 (AIW-D39). The other five are *Proposals — not approved*.
   - One further row, submitting to the government, is listed but not counted, because the product never does it (AG-11-54).
2. **AI skills and calls.** Of the 27:
   - **19 make an AI language call (A)**;
   - **3 are T**: skill 4 (plain-words summary), skill 14 (release note) and the practice-answer summary line. In each, the workflow hands a rule-built result to the AI to word;
   - **5 are rules only (R)**.

   **On "tool calling":** a model that calls tools freely has no home in this design, but the safe form, T-fixed, already exists in these three skills.
3. **The founder's examples mostly hold.**
   - Eligibility and scoring are rules (AG-3-39, FD-16).
   - Follow-up **timing** is rules.
   - Follow-up **wording** is a firm template first (rules). AI writes only when no template fits, and a person approves it before it is sent.
4. **Calendar.** **Booking is rules** (the Scheduler). AI may at most put Scheduler-computed free times into a drafted reply (T, Proposal). AI booking, moving or cancelling an appointment by itself conflicts with FD-16 and AIW-D13.
5. **"Talking" with leads.** AI may **draft** replies for a person to approve (A). An AI that chats with leads or clients by itself conflicts with AIW-D11, FD-16 and AIW-D41.
6. **T here means T-fixed only** (the Lead's ruling on R4 M-3). The workflow (the Conductor) runs the rule engine; the AI only explains or words the engine's output; the model itself calls no tools. This is what the team's AG-11-94 requires ("models SHALL have no tool access").
7. **"Already built" is only partly true.**
   - **The engine exists.** The 10 Oct code has an assessment engine that creates, saves and replays assessments with eligibility and scoring output (`code/ERv2-sanitized@042be70-2026-10-10/apps/api/src/spine/pack-assessment.controller.ts` and `pack-assessment-result.ts`).
   - **Whether it meets AG-03 is a team question.** Its fit with AG-03's four outcomes and per-factor breakdown is *Unknown*.
   - **What is missing for Canada is the Canada rules.** No Canada pack is authored (SA-01 v2.2 BR-15; the only Canada file in the code is a development fixture), and pack rules are not tested before publishing (SA1B-D18).
   - So buyer material may not say Canada eligibility is built.
8. **Conflicts.** Seven are listed in §6, unresolved, for the founder.
9. **Over-AI'd.**
   - **Should be rules:** skill 13 (sample clients).
   - **Rule first, AI only for the rest:** skills 10, 11 and 16. Ticket category and priority already come from a keyword rule (SA-10-7).
   - **Moved from AI to rules in Table A:** A79 (old program names, an exact-or-near-match rule) and A103 (ticket category and priority).
   - **Now T, not A:** skill 4, skill 14 and the summary line.
   - **Never to be sold as AI:** skills 19 to 23, which are rules only.
10. **Highest-value AI layers on rules.** Both are Proposals:
    - a staff-only explainer of the assessment breakdown and the "what if" levers the Qualifier already computes (AG-3-21, AG-3-22);
    - Scheduler time slots placed into drafted replies.

---

## 1. The four classes

| Class | Plain meaning | Who decides the outcome | Same input, same output? | Where AI is allowed |
|---|---|---|---|---|
| **R — Rules only** | The product's fixed rules do it. That means the rule engine, the Conductor (the workflow engine), a Doer, or a country or practice pack. A Doer is an in-house tool such as the Scheduler, Biller, Signer, Filler or Minder. No model is called. | The rules, set by people in advance (pack authors, the firm's settings). | Yes, always. For assessments this is a stated requirement: "identical inputs + version ⇒ identical outputs" (AG-03 v1.4, AG-3-39). | Nowhere. |
| **T — AI teammate using rule tools (T-fixed only)** | The workflow (the Conductor) runs the rule engine, or reads a rule-built result, as a fixed step. It passes the output to the AI as data. The AI only explains it or words it. **The model itself calls no tools** (AG-11-94). A person's question may start the run, through a fixed menu or the workflow's own matching; the model never chooses the query. | The rules. The AI only words the answer. | The result: yes (it is the engine's). The wording: no, it varies. | Wording or explaining a rule result. |
| **A — AI language** | The AI reads, sorts, drafts, summarises or converses over unstructured input. Output varies from run to run. | A person, for anything with an effect. | No. | Reading, sorting, drafting, summarising. Any effect (send, book, file, sign, money, stage change) needs a person's approval first (FD-16: "every output is human-approved before it has effect"; AIW-D13). |
| **H — Person only** | Licensed judgement or a legal act. AI may prepare material for it but never does it. | A named person, acting with their own permission. | Not applicable. | Preparing material only, where a skill allows it. |

**What T is not.** A model that decides which tool to call, and with what inputs, is not a class in this map. It conflicts with AG-11-94 as worded and with the reference architecture: "AI output never chooses the next step, tool, recipient or permission" (`research/ai-architecture-deterministic-2026-10.md` part (c)). See §6, K3.

**T against A.** A skill is T when its only input is a rule-built result and its job is to word it. It is A when it reads unstructured language (a document, a message, a web page) or drafts free text from records [I, the maker's reading of the Lead's ruling].

**How a row gets its class.** A row's class is the class of whoever decides the outcome in that row. A capability can pass through several classes. For example, the Reader reads a value (A), a person verifies it (H), and then the Filler uses it (R). Each row names the class that does the job in that row, and the "AI may / may not" column shows its neighbours. Rules-only skills that sit inside an AI teammate are marked *(rules, not AI)* wherever they appear in that column (R4 M-6).

---

## 2. The test used for every row

The five questions are used exactly as worded in `research/ai-architecture-deterministic-2026-10.md` §2.1: "Ask in order; the first 'yes' decides." The "Why" column cites the question number.

| # | Question (short form) | If yes (the source's words, shortened) |
|---|---|---|
| Q1 | Does the result change a legal, financial or consent state, or reach a client, a government body or money? | "A person decides." AI may only prepare a proposal (FD-16; AIW-D13) |
| Q2 | Is there one right answer computable from structured data or a published rule? | "Rule or code (Doer, Pack rule). No AI." |
| Q3 | Is the input unstructured language, a scan or an image? | "AI may propose", with a typed output and a rule check after it |
| Q4 | Can a wrong AI answer be caught cheaply by a rule, a cross-check or the person reviewing? | "AI allowed at APPROVE." If not, off until a test set shows it is reliable |
| Q5 | Must it behave the same every time? | Measure consistency (pass^k) before going live; otherwise keep to rules |

**How Q1 is shown** (no change to the test). Some rule-run steps reach a client or money. For these, the "Why" column names *which person decides* and in which row: "Q1 → person: … (row Ax, H); mechanism: Q2". The row itself is the rule mechanism that carries out a person's decision. For example, A30 generates the retainer and A32 is the signing; A41 fills the form and A42 is the approval. For template sends and the refund policy, the person's decision is a standing one, taken once (row A121). The test as worded does not say whether a standing decision satisfies Q1. That is put to the Lead as a Proposal to amend §2.1 (PR6), not applied as a rule here.

**What makes a row trustworthy** (the "Check" column):
- **Rule test.** Ordinary software tests on the rule, plus reproducibility where the requirement asks for it (AG-3-26).
- **Driving test.** An expert-graded test set, then 2 to 4 weeks in shadow, then live with a health light that drops it back (AIW-D83).
- **pass^k.** The same case is run k times and *all* k runs must pass; it measures consistency, not luck. It is required for any skill whose output reaches a client draft (`research/ai-architecture-deterministic-2026-10.md` §5.1, §5.3 item 2). In plain words: "right every time, not right once".
- **Number check.** A rule that every number in the AI's text appears in the rule-built source, as the summary line already does (handbook §4 row P).
- **Person approval.** The item waits in Needs you, the staff approval list (AG-11-55 to AG-11-57).

**Buyer labels** (the "Say to buyers" column). FD-16: "Marketing may say 'AI-assisted'; it may not say the AI decides."
- **R:** "Rules-based: same answer every time" or "Automatic, on your settings". Never called AI; AIW-D37 and AIW-D90 set this precedent.
- **T:** "AI-explained, rules-decided".
- **A, client-facing text:** "AI-drafted, approved by you".
- **A, reading:** "AI-read, rule-checked, verified by you".
- **A, sorting:** "AI-suggested, you confirm".
- **H:** "Your decision; Expat Ready keeps the record".

---

## 3. The founder's examples, tested

### 3.1 Follow-up timing against follow-up wording
- **Timing is R.** The rules are: sequences and speed-to-lead (AG-2-31, AG-2-35); going cold (AG-2-39); waiting times (AG11-D17, AG-11-99); repeats with stop conditions (AG-11-15). Q2 applies.
- **Wording is R first, A second.**
  - Firm templates send under the firm's one-time review of its standard messages (AG11-D12). That is rules, not AI.
  - AI writes only when no template fits (skill 1; handbook §3.1).
  - AI-written client text has a product floor "never lowered below `APPROVE`" (Agent 00-Overview v1.12, "Agent-native operation"). Q1 applies.
- **What this means for strategy [I].** "AI follow-up" is mostly a rules-and-templates feature with an AI exception. The honest line is: "follow-ups run on your rules and your templates; where none fits, AI drafts one and you approve it".

### 3.2 Calendar booking against proposing a slot
- **Booking is R.** It runs on the Scheduler:
  - free slots and clash-proof booking (AG-4-1 to AG-4-8, AG-4-25, AG-4-26);
  - confirmations and calendar files (AG-4-31 to AG-4-35);
  - the firm's own calendar sync (AG-4-40 to AG-4-43);
  - reschedule, cancel and refund (AG-4-36 to AG-4-39, AG-4-46; FD-13);
  - the lead's own booking on the public page (AG-4-16, AG-4-22).
- **Proposing a slot could be T** (*Proposal — not approved*). The workflow gets free times from the Scheduler, and the AI puts them into a drafted reply with the booking link. The reply waits for approval. The lead books through the link.
- **Limits.**
  - No AW requirement gives any AI teammate a booking duty. AW-01 v0.6 mentions bookings only as "the Scheduler's messages" (AW-1-87).
  - Booking, moving or cancelling is an effect, so FD-16 and AIW-D13 apply.
  - A cancellation can trigger a refund (AG-4-46), which is money: Q1.
- **Note on the brief.** The brief cited AIW-D44 for booking, but AIW-D44 is about billing only: "An unsaved draft invoice counts as a billing entry: no assistant creates even a draft". The R4 checker confirmed this. FD-16 and AIW-D13 are the governing decisions; the nearest analogy is AIW-D54 ("money: assistant proposes, person saves in the product's screen").

### 3.3 Eligibility and score
- **R, confirmed in the requirements.**
  - The Qualifier is "a **deterministic pure function**" (AG-3-39).
  - The pack supplies all rules (AG-3-5); outcomes come from a fixed list (AG-3-10); scores come from the pack's grids (AG-3-17 to AG-3-20).
  - The explanation, recommendations and "what-if improvements" are rule-built too (AG-3-21 to AG-3-24; AG-03 v1.4 §3 says the Qualifier "computes **what-if improvements**").
  - FD-16: "The eligibility/scoring/workflow engine stays fully deterministic, versioned and explainable — no model output is ever a decision."
  - Models tested in mid-2025 computed rules badly ("less than a third" of simplified US tax returns; TaxCalcBench, via `research/ai-moat-and-positioning-2026-10.md` §3.3). Newer models may do better.
- **The people and limits around it.**
  - An assessment is started by staff or by an automatic run; whether it runs automatically is the team's open question (AG-3-1; AG-03 §13 Q10). The AI never starts it (AIW-D40).
  - A consultant overrides an outcome (AG-3-33) and decides on sharing it with the client (AG-3-38).
  - No eligibility content goes into any AI-drafted message to a lead (AIW-D41).
- **How built it is.** See summary item 7 and §6, K6.
- **Where AI could help:** a staff-only explainer of the rule-built breakdown and levers (row A21, T, Proposal).

### 3.4 Conversation with leads
- **A, as drafts only.** A template comes first; AI drafts only when none fits; a person approves (handbook §3.2; skill 1). Asked "Am I eligible?", the draft offers a consultation instead (AIW-D41).
- **Not permitted:** an AI that converses with leads or clients by itself (§6, K1). The portal specification contains no AI (Doc 4 v1.3). Portal messages are sorted on the firm side by the Sorter (AG-11-67; row A56).

### 3.5 Tool calling
- Only T-fixed is a class here (§1). It already exists in three skills: skill 4, skill 14 and the summary line P. In each, the workflow passes a rule-built result to the AI to word. A model that picks its own tools has no home (§6, K3).

### 3.6 Language
- **R:** choosing the template language (AG-12-23).
- **A:** drafting a reply in the client's language (skill 1).
- **H:** legal and consent wording in another language. It is "authored per locale, never machine-translated" (AG-12-24; SA-5-15). The Pack author's AI proposes no French wording in version 1 (AIW-D79).

---

## 4. Table A: product capabilities, by module

Column key:
- **Class:** R, T, A or H.
- **Why:** the deciding question from §2. For rule-run steps that reach a client or money, it names the person's row.
- **AI may / may not:** rules-only skill steps are marked *(rules, not AI)*.
- **Check:** what makes it trustworthy.
- **Skill numbers [n]** point to Table B.

### 4.1 Firm side (AG-01 to AG-18)

| # | Capability | Where (ID, file version) | Class | Why | AI may / may not (rules-only steps marked) | Check | Say to buyers |
|---|---|---|---|---|---|---|---|
| A1 | Firm, staff, roles, seat limit | AG-1-1, AG-1-13 (AG-01 v1.18); SA-6-1 (SA-06 v3.3) | R | Q2 | No AI | Rule test | Rules-based |
| A2 | Licensed-user link that sets who approves by default | AG1-D19 (AG-01 v1.18); Agent 00-Overview v1.12, country-awareness item 7 | R | Q2 | No AI. The product never checks a licence | Rule test | Automatic, on your settings |
| A3 | Lead capture from every source, duplicate check | AG-2-1, AG-2-2 (AG-02 v1.9) | R | Q2 | No AI | Rule test | Rules-based |
| A4 | Routing a new lead to an owner | AG-2-12 (AG-02 v1.9) | R | Q2 | No AI | Rule test | Automatic, on your settings |
| A5 | Next-best action on a lead | AG-2-37 (AG-02 v1.9; "rule-based", Register A.11) | R | Q2 | The reason is listed by rule [22] *(rules, not AI)*. AI may not choose the action | Rule test | Rules-based |
| A6 | **Follow-up timing**: speed-to-lead, sequences, going cold, waiting times | AG-2-31, AG-2-35, AG-2-39 (AG-02 v1.9); AG11-D17, AG-11-99 (AG-11 v1.12) | R | Q1 → person: the firm's standing decisions (A121); mechanism: Q2 | No AI | Rule test | Automatic, on your settings |
| A7 | **Follow-up wording** from a firm template | AG-12-1 to AG-12-3 (AG-12 v1.2); AG-11-13, AG11-D12 (AG-11 v1.12) | R | Q1 → person: the firm's one-time template review (A121); mechanism: Q2 | No AI | Rule test | Automatic, your templates |
| A8 | Follow-up wording when no template fits | AG-10-15 (AG-10 v1.10); skill [1] | A | Q1; then Q3 for the drafting | May draft. May not send, promise an outcome (AG-10 BR-10) or include eligibility (AIW-D41) | Person approval; pass^k; driving test | AI-drafted, approved by you |
| A9 | **Conversation with a lead**: drafting replies | AG-10-15, AG-10 BR-10 (AG-10 v1.10); AIW-D41; skill [1] | A | Q1 | May draft each reply. May not converse by itself, send, or answer eligibility questions (§6, K1) | Person approval; pass^k; driving test | AI-drafted, approved by you |
| A10 | Lead marked Won when the retainer is signed | AG-2-28a (AG-02 v1.9) | R | Q2 (follows the signing, A32) | No AI | Rule test | Automatic |
| A11 | Lead marked Lost, with a reason | AG-2-27 (AG-02 v1.9) | H | Q1 | May not mark won or lost (handbook §3.2) | Person's act, audited | Your decision |
| A12 | New lead from an unknown WhatsApp number | AG-10-58 (AG-10 v1.10), "always a person's click, never AI" (Register A.2); SA8-D19 (team conflict on WhatsApp timing, not ours) | H | Q1 | No AI | Person's act | Your decision |
| A13 | **Eligibility** outcome per program | AG-3-10 to AG-3-16, AG-3-39 (AG-03 v1.4); FD-16 | R | Q2, Q5 | No AI | Rule test; reproducibility (AG-3-26) | Rules-based: same answer every time |
| A14 | **Score calculation** (CRS-type grids, language-level conversion) | AG-3-17 to AG-3-20 (AG-03 v1.4) | R | Q2, Q5 | No AI | Rule test; reproducibility | Rules-based |
| A15 | Score breakdown and plain explanation | AG-3-21 (AG-03 v1.4); FD-20 | R | Q2 | No AI in the built explanation (see A21) | Rule test | Rules-based, explained |
| A16 | Recommendations and "what-if improvements" | AG-3-22 to AG-3-24 (AG-03 v1.4) | R | Q2 | No AI | Rule test | Rules-based, indicative |
| A17 | Version stamp, explicit re-run, stale flag | AG-3-25, AG-3-26, AG-3-28, AG-3-29 (AG-03 v1.4) | R | Q2 | No AI | Rule test | Rules-based, replayable |
| A18 | Starting an assessment for a lead (first run) | AG-3-1 (AG-03 v1.4; run type includes `AUTO`); AG-03 §13 Q10 (open: automatic or on request); AIW-D40 | R | Q2 (internal, rule-made) | AI may not start it (AIW-D40). A task asking a person to run it is made by rule [22] *(rules, not AI)* | Rule test | Rules-based |
| A19 | Consultant override of an outcome | AG-3-33, AG-3-35 (AG-03 v1.4) | H | Q1 | No AI | Person's act, audited | Your decision |
| A20 | Sharing eligibility with the client | AG-3-38 (AG-03 v1.4); AIW-D41 | H | Q1 | No AI text in it (AIW-D41) | Person's act, audited | Your decision |
| A21 | Staff explainer of an assessment's breakdown and levers | *Proposal — not approved*; would sit on AG-3-21 and AG-3-22 (the "what-if improvements" already computed) | T | Q2 for the content; the AI only words it | May explain, in answer to staff questions, the breakdown and levers the Qualifier already computed. May not compute a score, start or save a run, or reach a lead (AIW-D41). Questions beyond the computed levers need a run that is not saved: *question for the team* (AG-3-1 says every run creates a new Assessment) | Number check; driving test | AI-explained, rules-decided |
| A22 | Free slots and clash-proof booking | AG-4-1 to AG-4-8, AG-4-25, AG-4-26 (AG-04 v1.5) | R | Q2 | No AI | Rule test | Rules-based |
| A23 | Public booking page; the lead books their own slot | AG-4-16, AG-4-22 (AG-04 v1.5) | R | Q1 → person: the lead's own booking; mechanism: Q2 | No AI | Rule test | Automatic |
| A24 | Confirmations, reminders, calendar files | AG-4-31 to AG-4-35 (AG-04 v1.5) | R | Q1 → person: the firm's standing decisions (A121); mechanism: Q2 | No AI | Rule test | Automatic |
| A25 | Sync with the firm's own calendar | AG-4-40 to AG-4-43 (AG-04 v1.5) | R | Q2 | No AI | Rule test | Automatic |
| A26 | Reschedule, cancel, no-show, refund on cancel | AG-4-36 to AG-4-39, AG-4-46 (AG-04 v1.5); FD-13 | R | Q1 → person: the firm's refund policy, or the platform default (FD-13; A121); mechanism: Q2 | No AI; may not cancel or refund | Rule test | Rules-based, your policy |
| A27 | **Proposing time slots** inside a drafted reply | *Proposal — not approved*; would sit on AG-4-5, AG-4-16 | T | Q2 for the slots; Q1 for the reply | The workflow fetches Scheduler slots; the AI places them and the booking link in a draft. May not hold, book, move or cancel (FD-16, AIW-D13) | Number check (slots equal the Scheduler's); person approval; pass^k | AI-drafted with live times from your calendar; approved by you |
| A28 | Consultation outcome, recommended pathway and fee | AG-4-49 (AG-04 v1.5) | H | Q1 | May summarise the consultant's typed notes [3]. May not record or transcribe (handbook §3.2; AIW-D62) | Person's act | Your decision |
| A29 | Proposal from a consultation, from a template | AG-4-50 (AG-04 v1.5) | R | Q2 | No AI (the Drafter here is the template tool, AIW-D53) | Rule test | Automatic |
| A30 | Retainer from a template with locked clauses | AG-5-4, AG-5-8 (AG-05 v1.9); AIW-D54 ("no AI text in the retainer") | R | Q1 → person: signing (A32); mechanism: Q2 | No AI text | Rule test | Rules-based |
| A31 | E-signature with passcode and evidence bundle | AG-5-29 to AG-5-31 (AG-05 v1.9); FD-21; AIW-D42 | R | Q1 → person: signing (A32); mechanism: Q2 | No AI | Rule test | Rules-based |
| A32 | Signing and countersigning | Agent 00-Overview v1.12, permission model (countersign); AG-15-45 (AG-15 v1.7) | H | Q1 | No AI; never "on behalf" for a signature | Person's act | Your decision |
| A33 | Invoice numbers, balances, partial payments | AG-6-5, AG-6-20, AG-6-21 (AG-06 v1.7) | R | Q1 → person: saving and recording (A36); mechanism: Q2 | No AI | Rule test | Rules-based |
| A34 | Overdue sweep and dunning sequence | AG-6-11, AG-6-12 (AG-06 v1.7) | R | Q1 → person: the firm's standing decisions (A121); mechanism: Q2 | After dunning runs out, AI may draft one personal reminder [1] | Rule test; person approval for the draft | Automatic, on your settings |
| A35 | Trust ledger with running balance; reconciliation report | FD-17 parts (c) and (d); AIW-D72 and its two corrections | R | Q1 → person: designation and moves (A36); mechanism: Q2, with rules from the Practice Pack (FD-17) | A reminder to the reconciler that the report is due, with no figure, is made by rule [22] *(rules, not AI)*. AI may not post, move, tag or compute | Rule test; counsel before real money (AIW-D72) | Rules-based |
| A36 | Saving invoices, recording payments, marking each line trust or firm money, trust moves, refunds | AG-6-19, AG-6-23 (AG-06 v1.7); FD-17 parts (a) and (b); AIW-D44, AIW-D72, AIW-D77 | H | Q1 | A pre-filled invoice screen is prepared by rule [21] *(rules, not AI)*. AI may not create even an unsaved draft invoice (AIW-D44) or set a designation (AIW-D72) | Person's act | Your decision |
| A37 | Case steps from the pack | AG-7-9 (AG-07 v2.7) | R | Q2 | A milestone after a letter is prepared by rule [21] *(rules, not AI)* from a person-approved date (A52) | Rule test | Rules-based |
| A38 | Document checklist | AG-7-15 (AG-07 v2.7) | R | Q2 | No AI | Rule test | Rules-based |
| A39 | Deficiencies raised and cleared by rule | AG-7-25, AG-7-30 (AG-07 v2.7) | R | Q2 | No AI | Rule test | Rules-based |
| A40 | Readiness state | AG7-D14 (AG-07 v2.7) | R | Q2 | The AI may word the rule-built readiness report [4] (T) | Rule test | Rules-based |
| A41 | **Government form filling** from verified values | AG-7-59, AG-07 BR-7 (AG-07 v2.7); SA1B-D16, SA-1B-35 (SA-01B v1.2); FD-5; AIW-D43 | R | Q1 → person: form approval (A42); mechanism: Q2 | No AI fills a value (SA-1B-35). An AI cross-check may follow [7] | Rule test | Rules-based (switched off until the form route exists, AIW-D43) |
| A42 | Approving a government form; four eyes | AG-7-65, AG-7-66 (AG-07 v2.7) | H | Q1 | No AI | Person's act | Your decision |
| A43 | Government fees on the case | AG-7-51 (AG-07 v2.7) | R | Q2 | No AI | Rule test | Rules-based |
| A44 | Submitting to the government (**listed, not counted**: outside the product) | AG-11-54 (AG-11 v1.12): "No Doer action SHALL submit anything to a government authority, at any autonomy level"; Agent 00-Overview v1.12 | — | Q1 | No AI; no product step | — | You file; Expat Ready never does |
| A45 | Conditional questionnaire, pack defaults | AG-8-5, AG-8-10 (AG-08 v1.7) | R | Q2 | No AI | Rule test | Rules-based |
| A46 | Questionnaire invitation; re-score on submit | AG-8-13, AG-8-33 (AG-08 v1.7) | R | Q1 → person: the staff member who assigns it; mechanism: Q2 | No AI | Rule test | Automatic |
| A47 | Values proposed from identity documents; answers checked against documents | AG-8-41, AG-8-42, AG-8-45 (AG-08 v1.7) | A | Q3 | May propose and warn. May not overwrite a verified value (AG-8-23) or lock anything (AG-08 BR-23) | Person approval; driving test | AI-read, rule-checked, verified by you |
| A48 | Verifying a value | AG11-D10 (AG-11 v1.12); Agent 00-Overview v1.12 "Agent-native operation" heading "Approving a Reader value is verifying it (AG11-D10)"; AG-08 BR-22 | H | Q1 | No AI | Person's act | Your decision |
| A49 | Upload, versions, virus scan, request from client | AG-9-6 (AG-09 v1.8); Agent 00-Overview v1.12 AG-9 row | R | Q1 → person: the staff member who requests; mechanism: Q2 | No AI | Rule test | Automatic |
| A50 | Document type | AG-9-11, AG-9-42 (AG-09 v1.8); AIW-D71 | A | Q3, Q4 | May propose a type. In the pilot every type goes to a person (AIW-D71) | Driving test; person approval | AI-suggested, you confirm |
| A51 | Values read from documents | AG-9-43, AG-9-46, AG-09 BR-19 (AG-09 v1.8) | A | Q3 | May propose with source and confidence. May not guess | Driving test; person approval | AI-read, rule-checked, verified by you |
| A52 | Dates read from government letters | AG-9-51, AG-09 BR-21 (AG-09 v1.8); AG-11-108 | A | Q3; Q1 for the deadline | May propose. The date reaches the Minder only after a person approves | Driving test; person approval | AI-read, verified by you |
| A53 | Documents generated from templates | AG-9-22 (AG-09 v1.8) | R | Q2 | No AI | Rule test | Automatic |
| A54 | One send path; consent; unsubscribe | AG-10-22, AG-10-24, AG-10 BR-1 (AG-10 v1.10) | R | Q1 → person: the recipient's own consent (A119); mechanism: Q2 | No AI. Every AI draft passes the same gate | Rule test | Rules-based |
| A55 | Matching inbound messages by reply token, sender, alias | AG-10-10, AG-10-12 (AG-10 v1.10) | R | Q2 | No AI | Rule test | Automatic |
| A56 | Sorting the messages rules could not match (email, portal, WhatsApp) | AG-10-37, AG-10-38 (AG-10 v1.10); AG-11-67, AG-11-94 (AG-11 v1.12) | A | Q3, Q4 | May propose a file from a firm-scoped list. An AI-only match is never filed automatically | Driving test; person approval | AI-suggested, you confirm |
| A57 | WhatsApp templates, preferred channel, email fallback | AG-10-57, AG-11-105; SA8-D19 (team conflict, not ours) | R | Q1 → person: the firm's standing decisions (A121); mechanism: Q2 | No AI | Rule test | Automatic |
| A58 | Choosing the template language | AG-12-23 (AG-12 v1.2) | R | Q2 | No AI | Rule test | Automatic |
| A59 | Legal and consent wording in another language | AG-12-24 (AG-12 v1.2); SA-5-15 (SA-05 v2.4) | H | Q1 | No machine translation | Person authors | Written by a person |
| A60 | Conductor recipes, triggers, conditions | AG-11-1, AG-11-10, AG-11-13 (AG-11 v1.12); Product Vision v1.0 line 292 | R | Q2, Q5 | No AI decides a step ("no model output may trigger or decide an action") | Rule test | Rules-based |
| A61 | Autonomy levels and product floors | AG11-D1 (AG-11 v1.12); Agent 00-Overview v1.12 | R | Q2 | No AI | Rule test | Automatic, on your settings |
| A62 | Approving in Needs you | AG-11-55 to AG-11-57 (AG-11 v1.12) | H | Q1 | No AI approves | Person's act, audited | Your decision |
| A63 | Deadline watch (Minder) | AG-11-47, AG-11-48 (AG-11 v1.12); AIW-D37 | R | Q2, Q5 | No AI; never sold as AI (AIW-D37) | Rule test | Rules-based deadline watching |
| A64 | Waiting times; approvals due before a deadline | AG11-D17, AG-11-99, AG-11-100 (AG-11 v1.12) | R | Q2 | No AI | Rule test | Automatic |
| A65 | AI switch lock; log of every model call | AG-11-93, AG-11-72 (AG-11 v1.12); AG-16-35 (AG-16 v1.13) | R | Q2 | Controls the AI; is not AI | Rule test | Rules-based |
| A66 | Template library | AG-12-1 to AG-12-3 (AG-12 v1.2) | R | Q2 | No AI | Rule test | Your templates |
| A67 | Tasks, reminders, activity and audit | AG-13-10, AG-13-14, AG-13-65 (AG-13 v1.12) | R | Q2 | Tasks and lists inside AI teammates are made by rule [22] *(rules, not AI)* | Rule test | Automatic |
| A68 | Notes written by staff | Agent 00-Overview v1.12 AG-13 row | H | Not one of the five questions: a person's own professional record, written by that person | AI may draft an internal note [3]; in the pilot a person reviews each one (AIW-D80) | Person's act | Your notes |
| A69 | Dashboards and metrics | AG-14-1, AG-14-10 to AG-14-17 (AG-14 v1.11) | R | Q2 | The AI may word figures the rules computed [4] (T) | Rule test | Rules-based |
| A70 | Free questions to Practice answers | **Decided for version 2** (AIW-D39 keeps "the version 2 co-pilot"; limits AIW-D25) | T | Q2 for the answer | The workflow runs fixed, permission-checked queries (AG-14-22); the AI words the answer. How a free-text question reaches a fixed query without the model choosing it is a version 2 design question. May not act (AIW-D25) | Rule test; number check; driving test | AI-explained, rules-decided |
| A71 | Portal setup, invites, nudges | AG-15-32 (AG-15 v1.7); Agent 00-Overview v1.12 AG-15 row | R | Q1 → person: the staff click, or the firm's standing decisions (A121); mechanism: Q2 | No AI | Rule test | Automatic |
| A72 | "Done on behalf" of a client | AG-15-44, AG-15-45 (AG-15 v1.7) | H | Q1 | No AI | Person's act, marked and audited | Your decision |
| A73 | Firm settings, team safeguards, approval routing | AG-16-32, AG-16-35, AG-16-49, AG-16-52 (AG-16 v1.13); AG11-D11 | R | Q2 | No AI | Rule test | Your settings |
| A74 | Firm data export | AG-16-20, AG-16-21 (AG-16 v1.13) | H | Q1 | No AI exports (handbook §3.4) | Person's act, audited | Your decision |
| A75 | LMIA steps, recruitment log, automatic wage, hours and location check, dates | AG-17-26, AG-17-32, AG-17-73 (AG-17 v0.6) | R | Q2 | No AI in the automatic checks | Rule test | Rules-based |
| A76 | Recruitment report; message to the employer | AG-17-28, AG-17-82 (AG-17 v0.6) | R | Q1 → person: the staff member who sends it; mechanism: Q2 | No AI | Rule test | Automatic |
| A77 | Judging a candidate; ticking the duties match | FD-7; handbook §3.1 ("never judges or ranks a job candidate"); AG-17-32 | H | Q1 | May note duty differences [5]. May not tick the match | Person's act | Your decision |
| A78 | Import engine: dry run, known-source adapters, duplicates, undo, quiet records | AG-18-8, AG-18-15, AG-18-43 (AG-18 v1.2); AG18-D9, AG18-D12 | R | Q2 | No AI | Rule test | Rules-based |
| A79 | Suggested mapping of old program names | AG-18-10 (AG-18 v1.2): "MAY **suggest** a program for a group (**exact or near match**)" | R | Q2 | No AI. AI suggestions for free-text columns are Workstream 2's skill [10] (Table B), not this team requirement | Rule test; the Owner confirms | Rules-based suggestion, you confirm |
| A80 | Filing imported documents | AG-18-33 (AG-18 v1.2) | A | Q3, Q4 | May classify and propose a record; unplaced files go to a review list | Driving test; person review | AI-suggested, you confirm |
| A81 | Data-transfer attestation; verifying imported values | AG-18-49 (AG-18 v1.2); AG18-D10 | H | Q1 | No AI | Person's act | Your decision |
| A82 | Practice answers: four fixed questions | AIW-D39, AIW-D90; AG-14-22 (AG-14 v1.11) | R | Q2 | One optional summary line [P] (T) | Rule test | Rules-based; works with AI off |
| A121 | The firm's standing decisions that rules then carry out: approving its standard messages once, turning recipes on, setting its refund policy (*added after R4*) | AG11-D12, AG-11-21 (AG-11 v1.12); FD-13 (platform default where the firm sets none) | H | Q1 | No AI | Person's act (Owner or the firm's chosen role), recorded | Your rules, set once |

### 4.2 Platform side (SA-01 to SA-12)

| # | Capability | Where (ID, file version) | Class | Why | AI may / may not (rules-only steps marked) | Check | Say to buyers |
|---|---|---|---|---|---|---|---|
| A83 | Pack versions, validation, pinning each case to its rules | SA-1-47, SA-1-58 (SA-01 v2.2); FD-1, FD-3 | R | Q2, Q5 | No AI | Rule test | Rules-based, dated |
| A84 | Second-person approval to publish a pack | SA1-D6, SA-1-61 (SA-01 v2.2); FD-4 as amended by AIW-D48, AIW-D75 | H | Q1 | May never submit, approve or publish (handbook §3.5) | Person's act | Two people approve every change |
| A85 | Test run on a sample client; compare versions | SA-1-19, SA-1-26, SA-1-52, SA-1-53 (SA-01 v2.2 and SA-01B v1.2) | R | Q2 | AI may propose sample clients [13] | Rule test (not mandatory at publish: SA1B-D18, SA-1B-38) | Rules-based |
| A86 | Source, date checked, next review, overdue queue on every rule | SA-1B-39, SA-1B-40 (SA-01B v1.2) | R | Q2 | No AI | Rule test | Every rule shows its source and date |
| A87 | Box-map draft from a government form | SA-1B-33 (SA-01B v1.2); skill [11] | A | Q3, Q4 | May draft and compare. A person approves before publishing; never fills at fill time (SA-1B-35) | Driving test; person approval | AI-suggested, you confirm (internal) |
| A88 | Immigration content values | SA-01 v2.2 BR-15 ("authored and signed off by the Immigration SME and product owners") | H | Q1 | May draft rows from a recorded page [12]. May never write into a pack | Person's act | Written by an immigration specialist |
| A89 | Explaining why a test-run result changed | *Proposal — not approved*; would sit on SA-1-19 per-rule results | T | Q2 | The workflow passes the engine's per-rule difference; the AI words it. May not set an expected outcome (AW-2-50) | Number check; driving test | Internal only |
| A90 | Firm lifecycle, health, alerts | SA-2-4, SA-2-14, SA-2-14a (SA-02 v2.21) | R | Q2 | AI may draft outreach after an alert [17] | Rule test | Automatic |
| A91 | Support session inside a firm | SA-2-16 (SA-02 v2.21) | H | Q1 | No AI | Person's act, step-up and reason | Your decision |
| A92 | Plans, features, limits, downgrade check | SA-3-35, SA-3-40, SA-3-58 (SA-03 v2.17); SA-03 §3.3 catalogue row 30 | R | Q2 | No AI | Rule test | Rules-based |
| A93 | Subscription billing and failed-payment schedule | SA-4-21 (SA-04 v2.17) | R | Q1 → person: the Owner's plan purchase and changes (A94); mechanism: Q2 | No AI | Rule test | Automatic |
| A94 | Plan change; applying a discount | SA-4-28, SA-4-43 (SA-04 v2.17); AIW-D59 | H | Q1 | A change note is prepared and checked by rule [21] *(rules, not AI)*; a second colleague checks it (AIW-D59) | Person's act | Your decision |
| A95 | Explaining a plan, limit or downgrade block to support staff | *Proposal — not approved*; would sit on SA-3-58, SA-4-68 | T | Q2 | The workflow passes the rule result; the AI words it. May not promise a credit or discount (handbook §3.6) | Number check; driving test | Internal only |
| A96 | Global templates, "use until you edit" | Shared 00-Overview v3.9, SA-5 row | R | Q2 | No AI | Rule test | Templates from Expat Ready |
| A97 | Legal wording and French labels | SA-5-15 (SA-05 v2.4); AIW-D79 | H | Q1 | No AI wording (AIW-D79) | Person authors | Written by a person |
| A98 | Firm permission catalogue | SA-6-1 (SA-06 v3.3) | R | Q2 | AI borrows a person's permissions; never has its own (AIW-D13) | Rule test | Rules-based |
| A99 | Expat Ready staff accounts and step-up | SA-7-10, SA-7-13 (SA-07 v2.12) | R | Q2 | No AI | Rule test | Rules-based |
| A100 | Outside services, the AI provider record, status page | SA-8-26, SA-08 BR-1 (SA-08 v2.4); AIW-D74 | R | Q2 | Controls the AI; is not AI | Rule test | Rules-based |
| A101 | Platform metrics and queue health | SA-9-1, SA-9-13 (SA-09 v2.2) | R | Q2 | No AI | Rule test | Internal |
| A102 | Ticket routing by category; service levels | SA-10-6 (SA-10 v2.5) | R | Q2 | No AI | Rule test | Internal |
| A103 | Ticket category and priority suggestion | SA-10-7 (SA-10 v2.5): "Auto-triage suggests category and priority **from keywords**; the agent confirms" | R | Q2 | No AI in the team requirement. Workstream 2's skill [16] adds an AI layer (see O10) | Rule test; support confirms | Internal |
| A104 | Ready-made replies | SA-10-10 (SA-10 v2.5) | R | Q2 | No AI; chosen first [17] | Rule test | Internal |
| A105 | Drafted ticket replies and help articles | Team: SA-10-23 (SA-10 v2.5) gives a knowledge base with "contextual article suggestions by category/keywords", a rule. The AI drafting is Workstream 2's (AW-02; skills [17], [18]) | A | Q1, Q3 | May draft. May not send, or mention another firm | Person approval; pass^k for replies | Internal |
| A106 | Append-only, hash-chained audit log | SA-11-1 to SA-11-4 (SA-11 v2.7) | R | Q2 | Records the AI; is not AI | Rule test | Rules-based record |
| A107 | Data-residency declaration | SA-11-20 (SA-11 v2.7); AIW-D78 | R | Q2 | No AI | Rule test | Rules-based |
| A108 | Retention, legal holds, deletion checks | SA-11-18, SA-11-28 (SA-11 v2.7) | R | Q2 | May never say "fully deleted" when some is kept (handbook §3.4) | Rule test | Rules-based |
| A109 | Breach decisions; identity checks on privacy requests | SA-11-24 to SA-11-26 (SA-11 v2.7) | H | Q1 | A checklist is made by rule [22] *(rules, not AI)*; AI may draft a reply [1]. AI may never verify identity | Person's act | Your decision |
| A110 | Feature flags; emergency switch | SA-12-1, SA-12-12, SA-12 BR-9 (SA-12 v2.7); AIW-D78 | R | Q2 | Controls the AI; is not AI | Rule test | Rules-based |
| A111 | Explaining why an open file is affected by a pack change | *Proposal — not approved*. The team's AG-3-29 only flags assessments as stale. A list of affected files with their changes is a *question for the team* (moat research §6 row 10) | T | Q2 | If such a rule-built list exists, the workflow passes it and the AI words the reasons. May not re-run or re-pin anything (AG-3-28, FD-3) | Number check | AI-explained, rules-decided |

### 4.3 Client portal (CP-1 to CP-9)

Source: Doc 4 v1.3 (July); the October CP-01 is not on Drive. The portal specification contains no AI, and AIW-D11 rules out applicant-facing AI.

| # | Capability | Where | Class | Why | AI may / may not | Check | Say to buyers |
|---|---|---|---|---|---|---|---|
| A112 | Sign-in, activation, own-case-only access | CP-1-3 | R | Q2 | No AI | Rule test | Rules-based |
| A113 | Case status, timeline, next actions | CP-2-1 | R | Q2 | No AI | Rule test | Automatic |
| A114 | Questionnaire fill and branching | Doc 4 v1.3 CP-3 §3.2 and BR-6 ("One predicate contract, server-authoritative") | R | Q2 | No AI in the portal. Reader values are firm-side (A47) | Rule test | Rules-based |
| A115 | Uploads and checklist | CP-4-1 | R | Q2 | No AI in the portal. The upload check on the firm side is rules only [19] *(rules, not AI)* | Rule test | Automatic |
| A116 | Invoices and online payment | CP-5-1; FD-12 | R | Q1 → person: issuing the invoice (A36) and the client's own payment; mechanism: Q2 | No AI | Rule test | Rules-based |
| A117 | Signing | CP-6-1; FD-21 | H | Q1 | No AI | The client's act, passcode first | The client signs |
| A118 | Secure messaging | CP-7-1; FD-9 | R | Q2 | No AI talks to the client. Portal messages are sorted firm-side by the Sorter (AG-11-67; A56); staff replies may be AI-drafted firm-side [1] | Rule test | Messages from your firm |
| A119 | Profile, notifications, consent | CP-8-1 | H | Q1 (consent) | No AI | The client's act | The client decides |
| A120 | Employer portal | CP-9-1; AIW-D67, AIW-D73 | R | Q1 → person: the employer's own uploads, payments and signatures; mechanism: Q2 | No AI | Rule test | Rules-based |

---

## 5. Table B: AI skills and product AI calls

Skill numbers, names and approvers are from `handbook/ai-team-profiles.md` §4, which this table cites rather than repeats. The "Class" column shows where this map differs from the handbook's "Kind".

| # | Skill | Built on (team IDs, short) | Class | Why | What it does / may not (rules-only skills: what the workflow's rules do) | Check | Say to buyers |
|---|---|---|---|---|---|---|---|
| 1 | Client message drafter | AG-10-15; AG-11-68; AG-6-12 | A | Q1, Q3 | Drafts when no template fits; never sends | Person approval; **pass^k**; driving test | AI-drafted, approved by you |
| 2 | Letter drafter | AG-9-22, AG-10-15 | A | Q1, Q3 | Drafts from verified facts; the "facts used" list is built by rule | Person approval (licensed representative); pass^k | AI-drafted, approved by your licensed representative |
| 3 | Internal note drafter | AG-11-68; AG-4-49 | A | Q3 | Drafts notes nobody outside sees | Person review in the pilot (AIW-D80) | AI-drafted, for your eyes |
| 4 | Plain-words summary | AG-07 v2.7 §3.6; AG-14-15 | **T** (handbook: AI writes) | Q2: the figures are rule-built; the workflow passes them to the AI to word | Restates rule-built figures; computes nothing | Number check (Proposal, handbook §4) | AI-explained, rules-decided |
| 5 | Job-duties comparer | AG-17-32 | A | Q3 | Notes differences; never ticks the match | Person approval | AI-suggested, you confirm |
| 6 | LMIA document reader | AG-17-28, AG-17-80 | A | Q3 | Reads résumés and advert screenshots; never judges. **Whose AI call: to be confirmed by the team** (handbook §4 row 6) | Person approval; driving test (no test set yet for adverts, handbook §7) | AI-read, verified by you |
| 7 | Form preparation (cross-check) | AG-7-59; SA-1B-35 | A for the cross-check; filling is R (A41) | Q3 for the check; Q2 for the filling | Checks a draft; never fills | Person approval; driving test | Rules fill, AI double-checks, you approve (switched off until the form route exists, AIW-D43) |
| 8 | Answer extractor | AG-8-23, AG-8-25 | A | Q3 | Only what the lead's reply states | Person accepts each, stored unverified | AI-suggested, you confirm |
| 9 | Old-note date reader | AG-9-51 | A | Q3 | Never completes a date | Person approves each date | AI-read, verified by you |
| 10 | Firm field mapper | AG-18-8, AG-18-10 | A, **partly R** (O4) | Q2 for known sources and program names (A78, A79); Q3 for free-text columns | Suggests; the Owner confirms each column | Person approval; driving test | AI-suggested, you confirm |
| 11 | Rulebook field mapper | SA-1B-27, SA-1B-33 | A, **partly R** (O5) | Q2 for unchanged fields; Q3 for renamed fields | Suggests "needs review" | Author checks each; driving test | Internal |
| 12 | Official page reader | SA-1B-39 | A | Q3 | Drafts rows from a stored page | Author, specialist and second person | Internal |
| 13 | Sample-client proposer | SA-1-52, SA-1B-62 | A, **should be R** (O3) | Q2: test cases for a changed rule follow from the rule | Proposes made-up clients; never sets an outcome | Author chooses | Internal |
| 14 | Release-note drafter | SA-1-25, SA-1-53 | **T** (handbook: AI writes) | Q2: its input is the rule-built test-run comparison; the AI words it | Each sentence cites its row, rule or field | Author edits; number check | Internal |
| 15 | Page-change describer | SA-1B-39, SA-1B-40 | A | Q3 (government page text) | Describes differences the rules found in the text | Author decides | Internal |
| 16 | Ticket sorter | SA-10-6, SA-10-7; AW-2-64, AW-2-65 | A, **partly R** (O10) | Q2 for category and priority (keyword rule, SA-10-7); Q3 for the likely cause | Suggests from fixed lists; a rule maps cause to fix | Support confirms | Internal |
| 17 | Firm message drafter | SA-10-10; SA-4-43 | A | Q1, Q3 | Ready-made reply first; never sends | Sender approves; pass^k | Internal |
| 18 | Help-article drafter | SA-10-23 | A | Q3 | Names removed by rule first | Editor publishes | Internal |
| 19 | Upload and readiness check | SA-1B-18, SA-1B-21; AG-9-26 | R | Q2 | Rules the teammate's workflow runs; no model call | Rule test | Rules-based checks (never "AI") |
| 20 | Message hand-off | AG-10-37, AG-11-74 | R | Q2 | Rules the teammate's workflow runs: routing only | Rule test | Automatic |
| 21 | Ready-to-save proposal | AG-6-19, AG-6-20; AG-3-10; SA-4-28 | R | Q2 | Rules the teammate's workflow runs; a person saves in the product's screen | Rule test; person's act | Prepared by rules; you save |
| 22 | List and reminder maker | AG-13-10, AG-13-14; AG-6-9 | R | Q2 | Rules the teammate's workflow runs; never marks a deadline met | Rule test | Automatic |
| 23 | Rulebook change check | SA-1-24, SA-1-30, SA-1-53 | R | Q2 | Rules the teammate's workflow runs: compares, test-runs, checks files | Rule test | Internal |
| P | Practice-answer summary line | AG-11-70, AG-14-22 | **T** (handbook: AI writes) | Q2: the answer is rule-built; the workflow passes it to the AI to word | One line; failing lines dropped | Number check; promise-word scan | Optional AI summary of a rules-built answer (off by default) |
| PA1 | Product AI: Reader on every clean upload | AG-9-42, AG-9-43 | A | Q3 | Type and values proposed | Driving test; person approval | AI-read, verified by you |
| PA2 | Product AI: Sorter on every incoming message | AG-10-37, AG-11-67, AG-11-94 | A | Q3, Q4 | Proposes; AI-only matches never filed | Driving test; person approval | AI-suggested, you confirm |
| PA3 | Product AI: Checker cross-check in internal review | AG-7-61, AG-11-69 | A | Q3, Q4 | Warnings only, never locks | Driving test | AI double-check, you decide |

---

## 6. Where the founder's framing conflicts with a ratified decision

Stated, not resolved. Each one is for the founder.

| # | The founder's framing (12 Oct) | What it conflicts with | The conflict, in one line |
|---|---|---|---|
| K1 | AI is used for **talking** with leads | **AIW-D11**: "No applicant-facing AI Workers in the design or the investor story". **FD-16**: "every output is human-approved before it has effect". **AIW-D41**: no eligibility content in any AI-drafted message to a lead. Team floor in Agent 00-Overview v1.12: AI-written client text is never below "Ask me first" | AI may draft each reply for a person to approve. An AI that converses with leads or clients by itself is ruled out by AIW-D11 and FD-16. |
| K2 | AI is used for **calendar handling** | **FD-16**; **AIW-D13** ("nothing takes effect until a human approves it") | If "handling" means the AI books, moves or cancels appointments, that is an effect without approval. Proposing Scheduler times in a draft (A27) does not conflict. AIW-D44, cited in the brief, is about draft invoices, not booking. |
| K3 | AI is used for **tool calling** | **AIW-D25**: "Expert co-pilot, no actions". **AIW-D39**: version 1 is four fixed questions; free questions are version 2. **AIW-D84**: the platform's own rules and workflow do every step whose result must always be the same. Team requirement **AG-11-94**: "models SHALL have no tool access". Product Vision v1.0 line 292: "no model output may trigger or decide an action" | Under the Lead's ruling, T means T-fixed only. A model that picks and calls tools itself conflicts with AG-11-94 (a team requirement; changing it is the team's call) and with the reference architecture. T-fixed already exists (skills 4, 14, P). |
| K4 | The Lead's brief defines class A as: an effect needs "a person or a deterministic Doer" | **FD-16**; **AIW-D13** | FD-16 needs a person's approval before any AI output has effect. A Doer may act on AI output with no person in between only under two internal carve-outs: AIW-D71 (document labels) and AIW-D80 (internal notes). In the pilot even those go to a person. This map uses the FD-16 reading. |
| K5 | The Lead's brief defines class T as calling "the rule engine **or product actions** as tools" | **FD-16**; **AIW-D13**; **AIW-D25** | A product action with an effect (stage change, send, booking, money) can only be prepared as a proposal for a person. FD-16: "AI is NOT a first-class actor". |
| K6 | Eligibility and score calculation are "**already built**" | Not a decision conflict. **AIW-D21** lets design assume it is built; **AIW-D9** (investor-grade) limits what buyer and investor material may say. The evidence is in the next column | **The engine exists.** The 10 Oct code has an assessment engine that creates, saves and replays results with eligibility and scoring output. It is in `code/ERv2-sanitized@042be70-2026-10-10/apps/api/src/spine/`: `pack-assessment.controller.ts` (create, read and replay routes, lines 139, 152, 165), `pack-assessment-result.ts` (eligibility and scoring with factors, lines 24 to 30) and `pack-assessment-persistence.service.ts`. **Fit with AG-03 is *Unknown*.** Whether it meets AG-03's four outcomes (AG-3-10) and per-factor breakdown (AG-3-20, AG-3-21) is a team question. **What is missing for Canada is the Canada rules.** No Canada pack is authored (SA-01 v2.2 BR-15). The only Canada file in the code is `src/pack-authoring/__fixtures__/canada-dev-pack.fixture.ts`, and the engine is guarded by `tools/check-content-neutrality.ts`. Pack rules are not tested before publishing (**SA1B-D18**). Say "the engine is built and deterministic; the Canada rules are being authored", not "Canada eligibility is built". |
| K7 | AI is used for **language** | **AIW-D79**: no AI French wording for packs in version 1. Team rules AG-12-24 and SA-5-15: legal and consent copy is never machine-translated | Drafting a reply in the client's language is allowed (skill 1). Translating templates, legal wording or pack labels by AI is not. |

**About K4 and K5.** The quotes come from the Lead's brief given to the maker on 12 Oct (the session message). The maker checked them against that message. The brief is not filed in `ai-workers/`, so the R4 checker could not verify them (m-5). The Lead files it or confirms.

**Related, already pending with the founder.** Organising the strategy around "rules decide, AI writes" rests on AIW-D91, whose exact words are: "a rival can call the same model but not reproduce the rules, packs, audit trail and measured accuracy underneath". The moat research found the rules themselves are public (`research/ai-moat-and-positioning-2026-10.md` §3.1). Founder question 1 (moat as the combination) is open (`NEXT.md`); this map does not answer it.

**A caution, not a conflict.** "And so on" could pull in the deadline watch or Practice answers. Both are product features with no AI and are never sold as AI (AIW-D37, AIW-D90).

---

## 7. Counts

**Table A (product capabilities: 121 rows listed, 120 counted)**

| Class | Count | Notes |
|---|---|---|
| R — Rules only | 79 | — |
| T — AI teammate using rule tools (T-fixed) | 6 | A70 is decided for version 2 (AIW-D39). A21, A27, A89, A95 and A111 are *Proposals — not approved* |
| A — AI language | 10 | — |
| H — Person only | 25 | — |
| **Counted** | **120** | A44 (submitting to the government) is listed but not counted: no product step does it (AG-11-54) |

**By side:**

| Side | Rows counted | R | T | A | H |
|---|---|---|---|---|---|
| Firm (A1 to A82 and A121, without A44) | 82 | 54 | 3 | 8 | 17 |
| Platform (A83 to A111) | 29 | 18 | 3 | 2 | 6 |
| Portal (A112 to A120) | 9 | 7 | 0 | 0 | 2 |

**What changed since the first draft:**
- A79 and A103 moved from A to R (M-4).
- A18 moved from H to R (m-7).
- A44 was taken out of the count (m-14).
- A121 was added as H (M-2).

**Table B (AI skills and calls, 27 rows)**

| Class | Count | Rows |
|---|---|---|
| A — AI language | 19 | Skills 1, 2, 3, 5 to 13, 15 to 18, and PA1 to PA3 |
| T — AI wording of a rule result | 3 | Skill 4, skill 14, the summary line P |
| R — Rules only | 5 | Skills 19 to 23 |
| H | 0 | — |

Of the 23 teammate skills: 16 A, 2 T (skills 4 and 14), 5 R. The handbook's split "18 make an AI call … and 5 are rules only" still holds; T skills do make an AI call, but only to word a rule result.

**Do not add the two tables together.** The A rows in Table A (for example A8, A51, A56) are the same AI work as skill 1, PA1 and PA2, seen from the module side.

**If §8 is accepted** (*Proposal*): skill 13 moves to rules. The teammate skills become 15 A, 2 T and 6 R, and Table B becomes 18 A, 3 T and 6 R. Skills 10, 11 and 16 stay A, with their rule part done first.

**Plain reading** (*Assumption: a share of rows as cut in this map, not a share of work or effort*). AI language is the deciding class in 10 of 120 rows. The AI also words rule results in 6 T rows. Rules decide in 79 and a person in 25. This supports "rules decide, AI writes", and the AI share is small. It matches the register's finding that "much less is model work than the name suggests" (register §1 item 4: 26 of 202 AW requirements call a model).

---

## 8. Marked AI in our files, but should be rules (over-AI'd)

Each change below is the team's subject or a decision for the founder. This map does not design how the rule would work.

| # | Item | Where it is marked AI | Why (five-question test) | Suggested change (*Proposal*) |
|---|---|---|---|---|
| O1 | Skill 4, plain-words summary | handbook §4 row 4, "AI writes" | Q2: every figure is rule-built already. Under the Lead's ruling it is T, not A | Classed T here. Whether an AI wording earns its place over the product's own rule-built text is a pilot question (as AIW-D62 sets for the summary line) |
| O2 | Practice-answer summary line (P) | handbook §4 row P; AIW-D62 (decide after the pilot) | Q2: it restates an answer that exists. Now T | Classed T here; decide with AIW-D62's pilot data |
| O3 | Skill 13, sample-client proposer | handbook §4 row 13, "AI writes" | Q2, Q5: test cases for a changed gate or grid follow from the rule itself [I] | Should be rules. *Question for the team*: can the pack's test-run feature (SA-1-52) supply sample clients for a changed rule? |
| O4 | Skill 10, firm field mapper, for known sources | handbook §4 row 10, "AI sorts" | Q2: known-source adapters and program-name suggestions are already rules in the team's design (A78; AG-18-10, A79) [I] | Rules first; AI only for free-text columns |
| O5 | Skill 11, rulebook field mapper, for unchanged fields | handbook §4 row 11, "AI sorts" | Q2: an unchanged field maps by exact match [I] | Rules first; AI only for renamed or new fields (team's subject for the rule part) |
| O6 | Skill 14, release-note drafter | handbook §4 row 14, "AI writes" | Q2: the list of changes comes from the rule comparison (SA-1-53) | Classed T here, not A |
| O7 | Skills 19 to 23 (rules only), counted inside AI teammates | handbook §4 rows 19 to 23 | Already rules, but they sit under "AI teammates" and could be sold as AI | Describe them as "rules the teammate's workflow runs", on screens and in sales (the AIW-D37 precedent); never under "AI may" |
| O8 | The Filler listed among the AI Doers | AG-07 v2.7 BR-23 (register §1 item 10) | Q2: filling is rule-based by its own definition and SA1B-D16 | Team's subject: state it, write no change note (README §0 rule 11) |
| O9 | The name "Drafter" used both for an AI Doer and for the template engine | AG-11 v1.12 AG11-D4: "**Drafter** (AG-10's AI-assist drafter, callable by any recipe; never promises an outcome)"; Agent 00-Overview v1.12 "In-House by Design": "the four **AI Doers** — **Reader**, **Sorter**, **Drafter**, **Checker**"; but Drafter is the template tool in AG-4-50 and AG-5-4 | Buyers may think retainers are AI-written, which AIW-D54 forbids | Already decided for our files (AIW-D53, the AI writer is "Writer"); the team's documents still need the rename (team's subject) |
| O10 | Skill 16, ticket sorter: category and priority | handbook §4 row 16, "AI sorts"; AW-2-64 | Q2: the team's SA-10-7 already "suggests category and priority from keywords" | Rules for category and priority; AI only for the likely cause (AW-2-65) and its one-line reason |

**Checked and not over-AI'd.**
- The Sorter matches by rule first (AG-10-10) and uses AI only for the rest (AG-10-37).
- The Reader works on scans and images (Q3).
- Skill 15 reads government page text (Q3). It is low value, and the handbook already lets it run with no AI call ("changed, not summarised").

---

## 9. Rules capabilities where an AI layer (T) would add real buyer value

All are *Proposals — not approved* except V3. All are T-fixed (§1), and all sit behind the driving test (AIW-D83). They are ranked by buyer value [I].

| # | On top of | What the AI adds | Why a buyer would pay | Limits that keep it safe |
|---|---|---|---|---|
| V1 | The Qualifier's breakdown and levers (A15, A16; row A21) | Staff ask "why is this below the cut-off?" or "which lever matters most?" The AI explains the breakdown and the "what-if improvements" the Qualifier already computed (AG-3-21, AG-3-22). The "what if" itself is the team's, not new | Consultants prepare consultations from exactly this. The explanation comes from the firm's own pinned pack version | Staff only (AIW-D41); computes nothing; number check on every figure. Questions beyond the computed levers would need a run that is not saved: *question for the team* (AG-3-1) |
| V2 | The Scheduler (A22; row A27) | Drafted replies carry real free times and the booking link | Speed to consultation is the intake measure firms care about (AG-2-35 seeds speed-to-lead) | The lead books by link; the reply is approved like any AI text; the slots must equal the Scheduler's |
| V3 | Practice answers (A82; row A70) | Free questions answered from fixed, permission-checked queries, with sources | The "expert co-pilot" shape the founder asked for (AIW-D19), with no model computing anything | **Decided for version 2** (AIW-D39); answers only (AIW-D25); same permissions as the asker (AG-14-22) |
| V4 | Pack change (A85; row A111) | Per affected file, the reason the new rules matter, in plain words | Makes pack upkeep visible; rivals sell policy watch as AI (moat research §3.1, §6 row 10) | Needs a rule-built list of affected files, which does not exist today (AG-3-29 only flags assessments as stale): *question for the team*. Nothing is re-run or re-pinned without a person (FD-3, AG-3-28) |
| V5 | Plans and limits (A92; row A95) | Support staff get the reason for a downgrade block in plain words | Faster support; not sold to firms (AIW-D61) | Never promises a credit or discount (handbook §3.6) |
| V6 | Pack test run (A85; row A89) | The author sees why a sample client's result changed, rule by rule | Lowers the cost of keeping packs current (moat research §3.2) | Never sets an expected outcome (AW-2-50) |

**Not recommended for T:**
- Fees, invoices, trust money and payment matching (Q1; AIW-D44, AIW-D72).
- Deadlines: the deadline watch is a product feature (AIW-D37), and Practice answers already covers "what is at risk".
- Form filling (SA-1B-35).

---

## 10. For the Lead: proposals and open questions

This brief said to write only this file, so nothing was appended to `proposals.md` or `PROGRESS.md`. The Lead may place these.

| # | Type | Proposal |
|---|---|---|
| PR1 | Rule | Every capability in the Step R blueprint carries one class letter (R, T, A, H) and the buyer label from §2; an R capability is never described as AI. |
| PR2 | Decision (founder) | Confirm the Lead's ruling on R4 M-3: T means T-fixed only. A model that calls tools itself would need the founder's decision and the team's change to AG-11-94. |
| PR3 | Decision (founder) | Move skill 13 to rules (team question, O3). Do the rule part first in skills 10, 11 and 16 (O4, O5, O10). Keep skill 4 and line P as T, pending the pilot (AIW-D62). |
| PR4 | Decision (founder) | Add V1 (assessment explainer, staff only) and V2 (slot proposals in drafts) to the blueprint as NEW items, behind the driving test. This adds to Release 1 scope (AIW-D82), so it is the founder's call. |
| PR5 | Rule | Wherever a Workstream 2 file says an AI output's effect may come from "a person or a Doer", correct it to FD-16's reading: a person's approval, except the AIW-D71 and AIW-D80 internal carve-outs. |
| PR6 | Rule (amendment to `research/ai-architecture-deterministic-2026-10.md` §2.1, not applied) | State how Q1 is met when a person's decision is standing rather than per item. Examples: the firm's one-time template review (AG11-D12), its refund policy or the platform default (FD-13), its recipe switches (AG-11-21). Proposed wording: "Q1 is met by a recorded standing decision of an authorised person when the requirement says so; the rule then carries it out". Until amended, this map shows the person's act as its own H row (A121). |
| PR7 | Rule (from R4) | Any claim about what the code does cites the newest copy in `code/` by folder, file and line, never a team Reference Note older than that copy. |
| PR8 | Rule (from R4) | A rules-only skill is never listed under "AI may", in any file. |

**Lead's own items.**
- `research/ai-moat-and-positioning-2026-10.md` §3.1 carries the same stale "No assessment output" claim (R4 M-1).
- File the 12 Oct brief, so the K4 and K5 quotes can be checked (m-5).
- Add the 12 Oct ask to `brief-coverage.md`.

**Open questions for the founder** (one at a time):
1. By "calendar handling", do you mean the AI books appointments by itself, or that it proposes times for a person to send? Only the second fits FD-16 (K2).
2. By "talking", do you mean an AI that chats with leads by itself? AIW-D11 rules that out today (K1).
3. Do you confirm T-fixed only (K3, PR2)?

**Questions for the team.**
1. Does the 10 Oct assessment engine meet AG-03's four outcomes (AG-3-10) and per-factor breakdown (AG-3-20, AG-3-21)?
2. Does the Qualifier offer a run that is not saved (A21, V1)?
3. Is a rule-built list of files affected by a pack change planned (A111, V4)?
4. Can the pack test-run supply sample clients for a changed rule (O3)?

**Unknowns.** The CP-01 client-portal file (not on Drive).

---

## Sources

- `ai-workers/README.md` §0 rules 3, 5, 10, 11; §5.
- `ai-workers/decisions.md`: AIW-D9, D11, D13, D19, D21, D22, D25, D37, D39, D40, D41, D42, D43, D44, D48, D53, D54, D59, D61, D62, D67, D71, D72 (and corrections), D73, D74, D75, D77, D78, D79, D80, D81 to D91.
- `ai-workers/checks/review-R4-2026-10-12.md` (findings M-1 to M-6, m-1 to m-22).
- `ai-workers/handbook/ai-team-profiles.md` §1 to §4, §7.
- `ai-workers/design/ai-carve-out-register-2026-10-11.md` §1 items 4 and 10; Registers A.1 to A.11.
- `ai-workers/research/ai-architecture-deterministic-2026-10.md` §2.1, §2.3, §5.1, §5.3, §9.2, part (c).
- `ai-workers/research/ai-moat-and-positioning-2026-10.md` §3.1, §3.2, §3.3, §6 row 10.
- `ai-workers/requirements/AW-01-firm-ai-assistants_v0.1.md` (document v0.6), AW-1-87; `AW-02-platform-ai-assistants_v0.1.md` (document v0.8), AW-2-50, AW-2-64, AW-2-65.
- `code/ERv2-sanitized@042be70-2026-10-10/apps/api/src/spine/pack-assessment.controller.ts` (lines 139, 152, 165); `pack-assessment-result.ts` (lines 24 to 30); `pack-assessment-persistence.service.ts`; `apps/api/src/pack-authoring/__fixtures__/canada-dev-pack.fixture.ts`; `apps/api/tools/check-content-neutrality.ts`.
- `sources/drive-snapshot-2026-10-11/01-techno-functional/07-Founder-Decisions-Log.md` (v1.5): FD-1, FD-3, FD-4, FD-5, FD-7, FD-9, FD-12, FD-13, FD-16, FD-17, FD-20, FD-21, FD-22.
- `sources/drive-snapshot-2026-10-11/01-techno-functional/06-Doc-4-Client-Portal.md` (v1.3): CP-1-3, CP-2-1, CP-3 §3.2 and BR-6, CP-4-1, CP-5-1, CP-6-1, CP-7-1, CP-8-1, CP-9-1.
- `sources/drive-snapshot-2026-10-11/02-functional-requirements/` (`agent/`, `super-admin/`, `shared/`): files and versions as listed at the top. Sections used from Agent 00-Overview v1.12: "Detailed Scope Index", "Agent-native operation", "How Country-Awareness Works", "In-House by Design" and "Agent Console Sub-Roles". AG-03 v1.4 §3 ("what-if improvements"); AG-11 v1.12 AG-11-54, AG-11-67; SA-10 v2.5 SA-10-7.
- `sources/drive-snapshot-2026-10-11/08-client-portal/NOT-FOUND.md`.
- Product Vision v1.0 (team document, `07-team-documents/`, frozen 2 Aug), line 292.
- arXiv 2507.16126v1, "TaxCalcBench", https://arxiv.org/abs/2507.16126v1 (read by the R4 checker, 12 Oct 2026; cited via the moat research §3.3).

# Rules and AI: the framework for Expat Ready

*12 Oct 2026. Written by the Lead from three checked inputs. It answers the founder's two asks of 12 Oct (`founder-brief.md`, 12 Oct section; `brief-coverage.md` B27, B28). Status: **Lead's draft for the founder.** Nothing here is decided until the founder says yes to the decisions in §9.*

**Built on (cited, not restated):**
- `research/ai-accuracy-and-determinism-2026-10.md`: passed checks R2 and R2-b.
- `design/rules-ai-classification-2026-10-12.md`: passed checks R4 and R4-b; the last small fixes are being applied.
- `research/rules-and-ai-positioning-2026-10.md`: passed checks R3 and R3-b.
- Earlier: `research/ai-architecture-deterministic-2026-10.md` and `research/ai-moat-and-positioning-2026-10.md`.
- Decisions: FD-16 (Founder Decisions Log v1.5, line 52) and AIW-D13, D37, D40, D41, D83, D84, D89, D90 and D91.

**Words used:**
- **Rules engine:** the product's fixed rules: the Qualifier (eligibility and scoring, AG-03), the Conductor (the workflow engine, AG-11), the Doers (the Scheduler, Minder and others), and the country and practice packs. The same input always gives the same output.
- **AI:** a language model. It reads, sorts, drafts and summarises. Its wording can change from one run to the next.
- **AI-washing:** calling something "AI" that is not, or claiming more AI than there is.

---

## 1. The answer on one page

1. **The organising principle is yes, and we already decided it.** The rules decide, the AI does the language work, and a person approves. This is AIW-D84 ("the platform is the guardrail") and AIW-D91 ("the moat is the deterministic platform under the AI"). This framework applies it to every capability.
2. **Most of the product is rules.** Of 120 capabilities:
   - 79 are rules only;
   - 25 are a person's act;
   - 10 are AI language work;
   - 6 are AI explaining a rule result.

   Of our 23 AI teammate skills, 5 are really rules, so they must never be sold as AI.
3. **A single AI call can never be made exactly repeatable on our Canada model.** Google itself calls its settings only "mostly deterministic".
4. **The product can be exactly repeatable anyway.** Every AI answer is stored with a fingerprint of its inputs and replayed. Every rule result is stamped with the pack version. A re-run happens only when something changes, and it becomes a new record.
5. **Rules are never left to the AI's memory.** The rules engine computes. The AI only words the engine's result. Code then checks that every number, date and rule the AI mentions matches what the engine produced.
6. **A person approves every value.** No colour, score or signal ever removes that approval.
7. **Do not sell rules "under the flavour of AI".**
   - It matches a published example of AI-washing.
   - Canada's Competition Bureau treats AI claims like any other claim. The penalties are large, and competitors can now bring cases themselves.
   - Your buyers, licensed consultants, carry the risk too.
   - It also sells worse: professionals trust answers grounded in sources and reasoning they can defend.
8. **The honest version still sells.** Show an AI team that is visibly busy, and an exact, one-click rules result that shows every factor.
9. **Proposed headline:** "Rules you can defend. AI that does the legwork."
10. **The multi-million path depends on the sales engine, not the AI label.** At the plan's pace, 500 firms is about nine years away.

---

## 2. The four classes

The definitions and every row are in the classification file §1 and §4–5. In short:

| Class | What happens | Same input, same output? | Called "AI" to buyers? | Examples |
|---|---|---|---|---|
| **1. Rules only** | The rules engine computes. No AI. | Yes, always | **Never** | Eligibility and scoring (AG-3-39); deadlines (AIW-D37); fees, trust money, checklists, form filling from approved values; booking (the Scheduler); Practice answers (AIW-D90) |
| **2. AI explains rule results** | The workflow runs the rules engine as a fixed step, then hands the result to the AI as data. The AI only words or explains it. The AI never calls a tool, picks a rule or computes a result (AG-11-94: "models SHALL have no tool access"). | The result: yes. The wording: no. | Yes, for the wording only | The plain-words summary (skill 4); the release note (skill 14); the practice-answer summary line |
| **3. AI language** | The AI reads, sorts, drafts or summarises. Anything with an effect needs a person's approval first (FD-16; AIW-D13). | No; measured instead | Yes, always disclosed | Reading documents; sorting messages; drafting replies and follow-up wording when no firm template fits |
| **4. Person only** | A licensed or permitted person acts. The AI may prepare material. | Not applicable | Never | Running the assessment (AW-1-88); advice; telling a lead about eligibility (AIW-D41); signing; submitting |

**Your words "AI using rule tools" become class 2, in its safe form.** The workflow fetches the rule result, and the AI never calls tools on its own. That form already exists in three skills.

---

## 3. Your examples, tested

| Your example | Verdict | Why |
|---|---|---|
| Eligibility and score calculation | **Rules (class 1)**; a person runs it (class 4) | AG-3-39, FD-16, AIW-D40. **"Already built" is only partly true.** The 10 Oct code has an engine that creates, saves and replays assessments. But no Canada rules are written yet, and pack rules are published without being tested (SA1B-D18). |
| Follow-ups | **The timing is rules. The wording is a template first, then AI. A person approves the send.** | Classification §3.1 |
| Calendar | **Booking is rules (the Scheduler).** The AI may at most put real free times from the Scheduler into a drafted reply (a Proposal). | An AI booking by itself conflicts with FD-16 and AIW-D13 (classification §3.2, K2). |
| Talking with leads | **The AI drafts; a person sends** (class 3) | An AI chatting with leads by itself conflicts with AIW-D11, FD-16 and AIW-D41 (classification §3.4). This is your decision F2. |
| Tool calling | **Only the safe form (class 2)** | AG-11-94 (classification §3.5) |
| Language | **AI (class 3)** | Classification §3.6 |

---

## 4. How the AI stays accurate, repeatable and true to our rules

From the accuracy research, recommendations R1 to R13. Each mechanism and what it gives you:

| What you asked for | How we deliver it | Research reference |
|---|---|---|
| **Repeatable** | Store every AI answer with a fingerprint of its inputs: the file, skill version, model, settings and pack rule versions. The same file shows the same stored answer. A re-run happens only on a change, and becomes a new record, never an overwrite. This extends the stamping the team already specifies (AG-03 v1.4 §1). | R2; §2 |
| **Reflects our rules** | The rules engine decides and the AI explains. Code checks that every rule ID the AI cites exists and was applied, and that every number, date and outcome matches the engine. If they don't match, the answer is stopped with the failure code `explanation_mismatch`. | R7; §4.2 |
| **Accurate** | Every value the AI reads carries the exact words it came from. Code checks those words are really in the document. The AI also works in small calls that choose from allowed answers in the pack, not free text. | R5, R8 |
| **Consistent** | Each skill's driving test (AIW-D83) runs every case 5 times and reports how often the AI is right on all 5. For a few high-stakes fields, we read the value 3 times and require them to agree. | R6, R11 |
| **Trustworthy** | We never use the AI's own confidence: it barely predicts its own errors. We use our own signals instead. Every value is still approved by a person. | R9; §5 |
| **Honest about quality** | We publish an "AI accuracy sheet" for each skill version: test size, who graded it, accuracy, and known limits. | R12 (Proposal) |

**What this gives you:**
- **Exactly repeatable:** rules, numbers, dates, fees, points, stored AI answers and the audit trail.
- **Measured, not guaranteed:** the AI's reading, sorting and drafting.
- **Never AI:** eligibility, deciding which rule applies, approving a value, final actions, relying on the AI's own memory of the law, and skipping review on any signal.

**Our accuracy figure is unknown until our own test set measures it.** We quote no figure to anyone before then.

---

## 5. How we sell it

The full research is in the positioning file (§(c)); the pitch text is in the moat file (§4.1, §4.2 and §5).

- **Headline options:**
  - "Rules you can defend. AI that does the legwork."
  - "Exact where it must be. AI where it helps."
  - "Same facts, same answer. An AI team for the paperwork."
- **The story:**
  - Your AI team does the legwork: it chases and reads documents, prepares the file, flags when an assessment is due, and drafts messages.
  - You press "Assess", and the rules give an exact answer with every factor shown.
  - You approve what goes out.
- **The challenge to rivals:** "Ask any vendor which answers come from rules and which from AI." Several rivals blur the two. That is our opening.
- **Labels on screen:** every result carries its class.
  - "Calculated from Canada pack v[n]"
  - "Prepared by [AI teammate]"
  - "AI draft: check before use"
  - "Approved by [person]"
- **What we never say:** "AI eligibility", "AI scoring", "AI assesses", "deterministic AI", "100% accurate", "always current", "Expat Ready AI" as an umbrella over the rules, or any automation rate we haven't measured.
- **FD-16 already allows "AI-assisted" in marketing.** This framework would stop using it for assessments, because the overall impression is that AI computed the result. That narrowing is your call (F1).
- **Counsel reads the phrase list before anything is published** (AIW-D68).

---

## 6. The multi-million path, honestly

The positioning file §(c)4 has every figure. All of them are assumptions, including about 10 prepared files a month per firm.

| Firms | Revenue a year |
|---|---|
| About 68, the plan's March 2028 figure | about CAD 0.14 to 0.43 million |
| 500 | about CAD 1.1 to 3.2 million |
| 1,000 | about CAD 2.3 to 6.3 million |

Canada has perhaps 3,900 to 7,800 practices, so 500 firms is 6 to 13% of the market.

**What actually gets there:**
1. **A faster sales engine** than the plan's 4 to 5 firms a month.
2. **Measured time saved**, which justifies the higher price.
3. **Becoming the firm's system of record:** the firm runs its files, money and history in Expat Ready, so switching away is costly (moat file §1.3).
4. **AI revenue that grows with caseload**, not seats (moat file §4.5 item 2).
5. **A second segment or country:** lawyers, or more country packs (FD-22).

**The AI label does none of these.**

---

## 7. What must be true before any of this can be claimed

1. **The Canada rules are written and tested before publishing.** Today pack rules can be published untested (SA1B-D18). That is the team's subject, so we ask them to revisit it; we write no change note.
2. **The engine meets AG-03:** four outcomes and the per-factor breakdown. The team confirms this from the code.
3. **A Canada provider passes the provider test** (AIW-D69).
4. **Counsel has read the counsel pack and the phrase list** (AIW-D68).
5. **Each skill passes its driving test** (AIW-D83). Only then does it go live, and only then can we publish its accuracy sheet.

---

## 8. Conflicts with the team's documents (stated, not resolved)

1. **AG-11-94 ("models SHALL have no tool access")** rules out the model calling tools. Our class 2 respects it. Anything more is the team's subject.
2. **AIW-D40 and AW-1-88: a person runs the assessment.** Letting the AI run it would reopen AIW-D40 (decision F5, only if you want it).
3. **SA1B-D18: pack rules are untested before publishing.** Our AI checks rely on those rules.
4. **The full list of conflicts with your framing** is K1 to K8 in classification §6.

---

## 9. Decisions for the founder (asked one at a time)

| # | Decision | Lead's recommendation |
|---|---|---|
| F1 | Adopt the four classes in place of "rules under the flavour of AI", and stop using "AI-assisted" for assessments (narrowing FD-16) | **Yes** |
| F2 | When the AI "talks" with leads: (A) it drafts and a person sends; (B) it chats by itself; (C) drafts now, live chat later after tests and a new decision | **A now; C only if you want it later.** B conflicts with FD-16, AIW-D11 and AIW-D41. |
| F3 | Headline | "Rules you can defend. AI that does the legwork." Test it in the ten conversations, with the A/B naming question (positioning §(c)5). |
| F4 | Let the AI explain a stored assessment result to staff, factor by factor (classification A21) | **Yes**, staff-only, as class 2 |
| F5 | Reopen AIW-D40 so the AI may run the assessment when a person asks | **No.** It saves one click and costs a ratified decision, a team requirement and counsel's comfort. |
| F6 | Restate AIW-D91's "hard to copy" as the combination, not "the rules": packs reviewed by two people and dated; accuracy measured per skill; the record for every file; the system of record | **Yes**. IRCC's rules are public. |
| F7 | Ask the team to revisit SA1B-D18, so pack rules are tested before publishing | **Yes** |

---

## 10. What happens after the founder decides

- **Decisions:** the Lead records them in `decisions.md` (append only).
- **Handbook:** the Lead applies the held handbook fixes (review R1-b) on top of the decisions, then checks the changed lines. Skills 4, 13, 14 and 19 to 23 get their class labels.
- **Proposals:** they go into `proposals.md`. These are Q1 to Q7 (positioning §(c)6), PR1 to PR8 (classification §10), and the accuracy research's R2, R7 and R12.
- **Correction notes on older files**, appended rather than edited:
  - **Moat research §3.1:** its "no assessment output" claim is stale (the 10 Oct code has the engine).
  - **Architecture research §5.3 item 1:** say test cases are made up, per AW-1-119.
  - **Architecture research §8.3 item 5:** Canada-only processing applies to all AI calls, per AIW-D74.
- **README §1:** "the same input gives the same result" needs your yes to change it to "same facts, same rules, same answer; AI answers are stored and replayed". A fresh AI call is not exactly repeatable.
- **Then Step R continues:** the blueprint and the coded prototype (AIW-D86, D88), built on this framework.

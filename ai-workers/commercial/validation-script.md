# Validation script: 25–30 minutes with a licensed immigration consultant or lawyer

*Workstream 2, wave W3b. Written by the commercial-strategist agent on 9 Oct 2026. Draft for the Lead to merge; it changes nothing in `../../commercial/` on its own. Status of everything in this file: **Proposal** unless a line cites a file or URL. Companion file: [`price-card.md`](price-card.md) (the three options the conversation tests).*

**Why this exists.** The direction review says the riskiest assumption is untested and cheap to test: "Firms will pay per prepared file" has no evidence; "Five peers from your network, one demo, one price card, one hour each. Until then every pricing number is a guess" (`../design/direction-review-2026-10-09.md` §2 item 2). The business plan already schedules "20 problem conversations with warm contacts (guide and order form drafted first)" as action 5, marked † "Needs Ranjan's go-ahead before anyone is contacted" (`../../commercial/plan.md` v1.1 §8). This script is that guide, extended with the two AI Worker stories and the price test, so a firm is interviewed once, not twice (proposal logged in `../proposals.md`).

**Who runs it.** The plan proposes "the licensed founder-consultant sells Expat Ready personally to owners of small immigration-consultant practices" (`plan.md` §1). The same person runs this script. A second person takes notes so the interviewer can listen.

**Before the first call (checklist for the founder).**
1. Ranjan's go-ahead (plan.md §8, action 5 †).
2. Counsel has confirmed the outreach rules in `plan.md` §4 ("Contact warm contacts first … Do not scrape the CICC register … Always identify ourselves … Counsel confirms these rules before outreach starts").
3. Ten target rows filled in (§7 below). Names stay in a private file, never in this folder (proposal in `../proposals.md`).
4. The two stories in §3 rehearsed out loud. If the clickable File Builder demo in the simulator exists by then (direction review §6 step 4), show it, labelled "simulator — not the product" (`plan.md` §4). If it does not, tell the stories with the one-page storyboard in §3 and say so.
5. The price card printed, three options on one page, nothing else.
6. A copy of the scoring sheet (§6) per conversation, numbered F01 to F10.

---

## 1. The shape of the half hour

| Minute | Part | What you are trying to learn |
|---|---|---|
| 0–2 | Open, no pitch | Permission to take notes; set the tone |
| 2–9 | How a file gets built today | Hours per file, who checks what, what goes wrong, what software costs now |
| 9–15 | Two short stories | Does the way we work (prepare, trace, named person approves, record) land? |
| 15–20 | The hard claims, one by one | Which claims they believe, doubt or reject, and in what words |
| 20–25 | The price ladder | What they expect to pay, which option they pick, and why |
| 25–28 | The three regulator questions | Their view, recorded, not argued |
| 28–30 | Close | Pilot yes or no; who else to speak to |

Keep to the clock. If they talk at length in part 2, let them; cut part 4, never part 5 or 6.

---

## 2. Open, then how they build a file today (minutes 0–9)

**Say (opening):**
"Thanks for the time. I am not here to sell you anything today. We are building something for firms like yours and I want to understand how your work actually runs before we decide anything. May I take notes? Nothing you say goes anywhere with your name on it unless you tell me it can."

*Write down: yes or no to notes. If no, close the notebook and remember what you can.*

**Ask, in this order. Let silence do the work.**

1. "Walk me through the last file you finished, from the moment the client signed the retainer to the moment it was ready to submit. What happened first?"
2. "Roughly how many hours of staff time went into that file before you, as the licensed person, looked at it? And how many of your own hours?" *(Write both numbers. If they say "it depends", ask for the typical Express Entry or PNP file and the hardest one this year.)*
3. "Who does what? Who chases the client for documents, who checks the passport against the form, who checks the dates line up, who writes to the client when something is missing?"
4. "What goes wrong most often? What was the last mistake that cost you time, money or sleep?"
5. "What happens when a government deadline is close? How do you know it is close? Has one ever slipped?"
6. "What software do you pay for today, and roughly what does it cost you a month, all in?" *(Write the names and the number. If they name Officio, CaseEasy, Visto, VisaFlo or IMMeFile, ask what they use it for and what they do outside it.)*
7. "How many files does the firm open in a typical month? How many people work on them?"

**Do not say** what we do yet, even if asked. Say: "I will show you in a minute; I want your answers first so I do not lead you."

---

## 3. Two short stories (minutes 9–15)

Tell these as stories about a firm, not as features. Both stories describe what our requirements specify; the catalogue entries they rest on are `../design/workers/catalogue.md` §2.1 W-01 (File Builder) and W-02 (Deadline Guardian). Nothing in either story is live today (`../research/visaflo.md` §16: "every row is a written requirement. It is specified, not built or shipped"). Say that in one sentence before you start: "Neither of these exists yet. I am describing what we are building so you can tell me if it is worth building."

### Story one: the File Builder

"A client signs the retainer on Monday. From that moment, a worker inside the product starts building the file. It sends the document requests your firm already uses. When the client uploads a passport, it reads it and proposes the values into the questionnaire, each value with the page it came from and how sure it is. When something is missing, it writes the chase, but the chase waits for a named person in your firm to approve it before it goes, unless you have set that template to send on its own. It cross-checks the facts against each other and lists what does not line up. On Thursday it stops and hands your named person a one-page readiness report: every value, the document it came from, what is still missing, every message that went out. Your person reads it, fixes what they want, and approves. Nothing reaches the client or a form without that approval. The report and the approval are kept as a record, with who approved and when."

*Where this comes from: catalogue W-01 "Job", "New (Proposal) (a)" (readiness report), "Guardrails and approval point". The approval rule is AIW-D26 (`../decisions.md`): approval by a named person "whatever the firm selects to approve for that role", licensed by default.*

**Then ask:**
- "Who in your firm would be the named person who approves that report?"
- "What would you want to see on that one page before you trusted it?"
- "What would you still do by hand, no matter what the report said?"

### Story two: the Deadline Guardian

"Every file carries dates: biometrics, a letter with a response window, a passport expiry, a permit expiry. A second worker watches all of them across every file. When the product reads a government letter, it proposes the deadline it found, and the file owner confirms it before it is watched. When a date gets close, the right person is nudged. If your firm chose to escalate, the owner is told when it keeps slipping. The firm can show, for any file, when it reminded whom. It does not promise nothing is ever missed; it promises that every deadline you confirm is watched and every reminder is recorded."

*Where this comes from: catalogue W-02 "Job", "Guardrails and approval point" ("the file owner approves each extracted deadline (AG-9-51)"), "Why it sells" (the note that "never" is "a design aim per AG-11 §3.4, not a warranty"). The direction review proposes selling this one free to measure switch-on (`../design/direction-review-2026-10-09.md` §4 item 6).*

**Then ask:**
- "Would you switch that on for every file, or only some?"
- "What is the deadline you worry about most?"

*Scoring: give each story a 1–5 on the sheet ("1 = they would not use it, 5 = they asked when they can have it"), plus their exact words.*

---

## 4. The hard claims, one by one (minutes 15–20)

Read each claim as written. Ask: "On a scale of one to five, where one is 'I do not believe it' and five is 'that is exactly what I need', where are you, and why?" Write the number and the words. Do not defend the claim. If they attack it, say "that is useful, say more."

| # | Claim, in the words we may use | What stands behind it | What we may not say (see §8) |
|---|---|---|---|
| C1 | "The AI works inside our product, under the product's own rules. It can only do what the product lets a person with that role do, and every step is recorded." | README §1; AIW-D13 ("acts on behalf of a named licensed person, with only that person's permissions"); AG-11-94 "models SHALL have no tool access" (quoted in `provider-and-cost.md` §1) | "It is never wrong." "No hallucination." |
| C2 | "Nothing the AI prepares takes effect until a named person in your firm approves it. Your firm's settings decide who that person is for each kind of work; by default it is a licensed person." | AIW-D26; AG11-D11 and AG-10-44 as cited in `catalogue.md` §1.3; "The permission system never checks licence" (SA6-D9, quoted in `visaflo.md` §16) | "Only a licensed person can approve" (the product does not check licences). |
| C3 | "Every value the AI proposes shows the document and page it came from and how confident it is. The readiness report your person approves is kept as a record, with who approved and when." | Catalogue W-01 "New (a)"; AG-11-70 (every value "a proposal with provenance and confidence", cited in `provider-and-cost.md` §3.2 row A5) | "Same result every time" (true for the rules engine, not for the AI's wording: IMP-37). |
| C4 | "Our product rule says AI processing of client data happens only in Canada, and the AI stays switched off for every firm until we have recorded a provider that does that. Honestly: today the big US AI providers do not offer in-Canada processing for their current models. Google's Montréal region lists its own models. So we may launch on a model that is not the best-known name, or we may have to ask firms to accept US processing with safeguards and a client notice. How do you feel about that?" | AG11-D15 and AG-11-93 (quoted in `provider-and-cost.md` §1); provider pages checked 9 Oct 2026 (`provider-and-cost.md` §2.9 summary table) | Naming a provider as chosen; saying "Canadian AI" as if it were settled. |

**For C4, also ask:** "Would your clients care where the AI runs? Would you tell them? Has a client ever asked you about AI?"

*Scoring: four numbers, four sets of words. If they volunteer an objection you did not ask about, write it verbatim in the "objections" box.*

---

## 5. The price ladder (minutes 20–25)

The order matters. Expected price first, unprompted. Then the card. Then the choice. Never show the card before step 1.

**Step 1, expected price (card still face down).**
"Think about the File Builder story. Suppose it worked as described and your person still approved everything. What would you expect to pay for that, and how would you expect to be charged: per file, per month, per person, something else?"
*Write the number and the unit in their words. If they will not give a number, ask: "What would feel too cheap to trust? What would feel too expensive to consider?" Write both.*

**Step 2, the card.** Turn the price card over. Say: "Here are three ways we could charge. None is decided. Read them, then tell me which you would choose and why." Read the three headlines aloud, nothing more:
- (a) Per prepared file: CAD 25 to 40 for each file whose readiness report your person approves, on top of the plan.
- (b) An allowance inside the Practice plan: ten prepared files a month included, then per file above that.
- (c) Per AI Worker per month: a flat fee per worker for the firm, with a fair-use cap.

*The numbers on the card are proposals from `provider-and-cost.md` §3.6 and assumptions labelled on the card; do not explain the arithmetic unless asked.*

**Step 3, the choice.**
- "Which one would you choose?"
- "Why that one and not the other two?"
- "At what number would you say no?"
- "If I said the per-file price was CAD 60, what would you do? And CAD 15?" *(Watch for the point where trust drops: a price that is too low can read as 'not serious'.)*
- "Does it matter to you that the price is per file rather than per person? Your current software: is it per person or per firm?"

*Write every answer in their exact words. Circle the option on the sheet. If they say "I would want to see it work first", that is a pilot answer, not a price answer; note it and move on.*

---

## 6. The three regulator questions (minutes 25–28)

Say: "Three questions about the rules of the profession. I want your view, not a debate. We will take all of this to counsel."

| # | Question, as spoken | Why we ask | Record |
|---|---|---|---|
| R1 | "Under the College's conduct rules as you read them, is there anything that stops you delegating the preparation of a file to a tool like this, as long as you review and approve it? Have you seen any guidance from the College on AI?" | No CICC guidance on AI for licensees was found in the field scan (`../research/field-scan.md` §6 item 9: "No CICC guidance on AI for licensees was found. CICC plans a licensee AI-use survey"); a web search on 9 Oct 2026 for CICC guidance on artificial intelligence for licensees found none. The plan's legal research covers the Code's referral, conflict and marketing rules, not AI delegation (`../../commercial/research/R3-legal-and-regulatory-constraints-2026-10-07.md` §1). Lawyers: the Federation of Law Societies model code (R3 S4) is a different rule set; ask them the same question in their terms. | Their view, verbatim; any guidance they name (title, date) |
| R2 | "If the tool proposed a wrong value, your person approved it, and the client was harmed, who do you think is liable? Would that change whether you used it?" | The coached ask lists "who is liable when an AI Worker makes a mistake" as missing from the original brief (`../PROMPTS.md` §6 item 6). We have no answer yet; counsel question. | Their view, verbatim; whether they mention insurance |
| R3 | "Would you tell your client that AI is used to prepare their file? Would you ask for their consent, or just tell them? Does it matter to you where the data is processed?" | AG-11-93 requires that "the product SHALL supply client-notice wording the firm may use" (quoted in `provider-and-cost.md` §1). PIPEDA transparency and Quebec Law 25 points are in `provider-and-cost.md` §4 items 3 and 4, all "confirm with counsel". | Their view, verbatim; Quebec clients yes or no |

Do not correct them, even if they are wrong about the rules. Their belief is the data: it tells us what the sales conversation and the client notice must handle.

---

## 7. Close (minutes 28–30)

**The pilot ask, in these words:**
"Would you pilot this for one month at no charge, with a named person in your firm approving everything, once we have a version you can use? We would ask for your time, your honest reactions and your file counts, nothing else."

*Write yes, no or conditional, and the condition verbatim. Important for the founder, not for the consultant: the plan says "No real client data in pilots until production has tenant isolation, permissions, multi-factor sign-in, tested backups, monitoring, a breach register, a support procedure and signed pilot terms" (`plan.md` §6). A "yes" here is an intention we record; the pilot itself waits for those safeguards or runs on test files. Say so if they ask when.*

**The referral ask:**
"Who else should we speak to? Anyone who would hate this is as useful as anyone who would love it."
*Write names and why, in the private contact file, not here. Ask: "May we say you suggested we call them?" The plan's referral rules (peers only, never clients; `plan.md` §4) apply to any later reward, not to this ask, which carries no reward.*

**Thank them. Then, within 24 hours,** fill the scoring sheet while it is fresh, and send one line of thanks by the channel they used with you.

---

## 8. What we must not say

From README §5 ("Nothing invented … Don't copy competitors … Never claim product-enforced licensed sign-off"), `PROMPTS.md` §6 item 1 ("Say 'governed and auditable', not 'never wrong'"), AIW-D26, AIW-D27 (the challenge review's "assistants to the role" wording and "no unprovable superlatives"), IMP-37 (`../design/ws2-improvements.md`) and `plan.md` §6 ("no uptime, recovery or savings figures until measured").

| Never say | Say instead | Why |
|---|---|---|
| "It is never wrong", "no hallucination", "zero errors" | "Every value shows where it came from; your person decides" | PROMPTS §6 item 1; AIW-D9 investor-grade bar |
| "Same result every time" | "The rules engine gives the same answer for the same input and the same pack version; the AI's proposals are reviewed the same way every time" | IMP-37: true for rules, not for models |
| "Only a licensed person can approve", "licensed-only", "the product enforces licensed sign-off" | "Approved by a named person; your firm's settings decide who; licensed by default" | AIW-D26; the product never checks a licence (SA6-D9) |
| "It replaces your assistant / your clerk / your staff" | "It prepares; your people decide. It is an assistant to the role" | AIW-D27 (challenge review wording); the time saved is unmeasured (AIW-A6) |
| "It saves you N hours per file", any percentage saved | "We want to measure that with you in the pilot" | `plan.md` §6: no savings figures until measured; `catalogue.md` §1.5: all time-saved words are Assumption |
| "Never miss a deadline" | "Every deadline you confirm is watched by design, and every reminder is recorded" | catalogue W-02: "never" is a design aim, not a warranty |
| "It files for you", "it submits to IRCC", "it fills the forms" | "It builds the file to ready-for-review. It never submits anything to a government authority" | AG-11-54 (quoted in `visaflo.md` §16 row 9); form filling is parked for Release 1 (SA1B-D28, same table row 8) |
| "Canadian AI", "the AI runs in Canada" as a settled fact | The honest C4 wording in §4 | No Canada-processing provider is recorded yet (`provider-and-cost.md` §4 item 1) |
| "Better than VisaFlo / Officio / CaseEasy at X" | Nothing about competitors unless they raise them; then "we go further on traceability and the approval record; they are ahead on forms and portal filling today" | README §5 "Don't copy competitors"; `visaflo.md` §16.2 honest frame |
| "The product is ready", "live today" | "Specified, being built; here is what exists today" | PROMPTS §6 item 3; `visaflo.md` §16 frame |
| "Applicants can use it", anything applicant-facing | Firms only | AIW-D11 |
| Any price as "the price" | "Three options we are testing; none decided" | `plan.md` §3 "Proposals, not approved" |

---

## 9. Scoring sheet (one per conversation; copy this page)

**Conversation F__ · Date ______ · Interviewer ______ · Note-taker ______ · Notes permitted: Y / N**

| Field | Answer |
|---|---|
| Firm type | RCIC practice / law firm / mixed |
| Firm size (people on files) | ___ licensed · ___ unlicensed staff |
| Province(s) | |
| Files opened per month (typical / peak) | ___ / ___ |
| Main programs (EE, PNP, work permit, study, family, LMIA, other) | |
| Software today and monthly cost, all in (CAD) | |
| Staff hours per file before licensed review (typical / hardest) | ___ / ___ |
| Licensed hours per file (typical) | ___ |
| Who chases documents / checks values / checks dates / writes to the client | |
| Last costly mistake (their words) | |
| Deadline they fear most | |
| **Story one, File Builder: 1–5** | ___ · words: |
| Named approver in their firm (role) | |
| What they must see on the readiness report | |
| **Story two, Deadline Guardian: 1–5** | ___ · words: |
| **C1 governed AI inside the product: 1–5** | ___ · words: |
| **C2 named person approves: 1–5** | ___ · words: |
| **C3 every value traced: 1–5** | ___ · words: |
| **C4 Canada-only processing, honest status: 1–5** | ___ · words: |
| Would clients care where AI runs? Told or asked for consent? | |
| **Expected price, unprompted (number and unit, their words)** | |
| Too cheap to trust / too expensive to consider | ___ / ___ |
| **Option chosen: (a) per file · (b) allowance · (c) per worker** | ___ · why (verbatim): |
| Number at which they say no | |
| Per file vs per person: does it matter? | |
| **Objections, verbatim (all of them)** | |
| R1 College rules on delegating to AI (view, guidance named) | |
| R2 Liability when the AI is wrong (view; insurance mentioned?) | |
| R3 Client notice / consent / where processed (view; Quebec?) | |
| **Pilot: Y / N / conditional** | condition: |
| Referrals (count here; names in the private file) | ___ |
| Interviewer's one-line read (opinion, labelled) | |

**Comparing ten sheets.** Put the ten rows side by side: median hours per file, median expected price, count per option, count of pilot yes. Any claim with a median under 3 is a claim we must rewrite or drop before W3c. Any option chosen by fewer than 2 of 10 is out. If expected prices cluster below CAD 15 per file or above CAD 60, the card's range is wrong (see `price-card.md` "What would make us wrong").

---

## 10. Target list: ten rows, criteria, no names

Who qualifies (Proposal, from the task brief and `plan.md` §2's first-buyer profile: "the owner of a 1–5 person practice licensed by the College … English-first, based in Ontario, BC or Alberta, mostly handling Express Entry and provincial nominee files"):
1. Licensed: an RCIC in good standing with the College, or a lawyer in good standing with a provincial law society.
2. Firm of 2 to 20 people working on files (solo practitioners only if they employ at least one assistant; the stories need a second person who approves or is chased).
3. Canada-based practice, Canadian immigration files.
4. Currently pays for practice software (Officio, CaseEasy, Visto, VisaFlo, Immicase, IMMeFile, a generic CRM, anything), so "what you pay now" has an answer.
5. Mix the ten: at least 2 lawyers, at least 2 firms over 10 people, at least 1 Quebec firm, at least 2 who are known sceptics of AI.
6. Warm contacts first (`plan.md` §4). Real contacts the founders already know appear in `../research/email-evidence.md` L7 (a 29-minute meeting on 17 Jul 2026 with a firm); nothing more is recorded here.

| # | Qualifies on 1–4 (tick) | Mix role (lawyer / 10+ / Quebec / sceptic / none) | Warm or introduced by | Invited (date) | Done (date) | Sheet |
|---|---|---|---|---|---|---|
| F01 | | | | | | |
| F02 | | | | | | |
| F03 | | | | | | |
| F04 | | | | | | |
| F05 | | | | | | |
| F06 | | | | | | |
| F07 | | | | | | |
| F08 | | | | | | |
| F09 | | | | | | |
| F10 | | | | | | |

---

## 11. Open questions for Ranjan

1. Does this script replace the plan's "20 problem conversations" guide (`plan.md` §8 action 5), or run alongside it? Recommendation: replace, so each firm is asked once.
2. Who runs the calls: the licensed founder-consultant named in action 2 of `plan.md` §8 (still unnamed), Ranjan, or Sanjay? The regulator questions land better from a licensed peer.
3. Will the clickable File Builder demo (direction review §6 step 4) exist before the first call? If not, the stories go verbal with the storyboard; say so in the wave brief.
4. Lawyers: the three regulator questions are written for RCICs; counsel should confirm the equivalent law-society wording before a lawyer is interviewed.

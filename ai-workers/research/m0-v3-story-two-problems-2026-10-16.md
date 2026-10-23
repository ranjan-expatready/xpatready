# The main story: two problems, two solutions

Read-only research for the M0 v3 top slide. Plain business English, roles only. "Recorded" means a decision row or source says it. "Lead's reasoning" means it is inferred or written by the Lead and is not in a decision row. Client A: a software developer applying for permanent residence through Express Entry (Canadian Experience Class), with a spouse and one child. Forms: IMM 0008, IMM 5406, IMM 5669 and the IRCC portal. All numbers below are recorded; none are new.

---

## Problem 1: the same facts live in many places

**The problem, in plain words.** Client A's date of marriage is asked on the lead form, again in the assessment questions (PQR), again in the full questionnaire (SQR), read off the marriage certificate, typed into each government PDF form, and typed into the portal. Each place names it differently (a field called "marriage date", a box called "Date of marriage / Date du mariage"). Staff retype it; each retype is a chance for a wrong value, and a wrong value on a form risks a refusal. (Source: concept page section 1; the "before" week is the Lead's illustration, not measured.)

### Options on the table, in time order

| # | Approach | When and who | How it works | Good (functional) | Bad (functional) | Where it breaks on Client A |
|---|---|---|---|---|---|---|
| 1 | **Hand-built data model, no AI** (the team's SA-01B v1.4) | Team, 22 Sep 2026 (SA1B-D1 to D40) | Content staff create each canonical field by hand, group them into sections, set up forms and box maps, and author one PQR per country and the SQR. Three tiers by a field flag (lead, prospect, case). Second person releases. Family members each get their own row; shared answers asked once (SA1B-D9). | Deterministic and traceable; tested pattern; no AI cost; second-person approval; cases pinned to a pack version. Already handles a family. | All authoring is by people, per combination (one row per full combination, SA1B-D6). Form filling is parked to a later phase (SA1B-D28). The team's own reason: box maps point at fields not settled yet, "mapping now means mapping twice". So staff keep retyping into forms. IRCC's barcode (XFA) forms are refused by the existing filler. Lead's reasoning: the manual workload scales with the number of combinations. | In Release 1 the three IRCC forms and the portal are still typed by staff from the case screen. A new IMM 5669 edition means someone re-maps by hand. |
| 2 | **AI matches form boxes at every fill** (the founder's first idea) | Founder concept thread, 16 Oct | People pick forms and documents; AI builds the questionnaire once; at each fill the AI reads the form and decides where each stored fact goes. | Fast to start; no set-up per form; covers new forms at once. The market's "agentic" tools claim this (research brief Appendix G, pattern B). | Concept page: a different answer on different days; the reviewer must check every box every time, which cancels the saving; wrong-value risk; no test that can be shown to a regulator; unknown error rate; per-run model cost; unanswered question on portal terms (brief G2 point 5). | "Name at birth" may copy the current name; the country drop-down may get the wrong pick; extra jobs may be silently dropped; on a changed portal page it may type into a look-alike box. |
| 2b | **Fresh match at first fill, kept per case** | Same interview, 16 Oct | Match fresh on the first fill of each case, then keep it for that case. | Cheaper than every fill. | Concept page: still differs from case to case; no shared tested map. | Client A's map could differ from the next Express Entry file's. |
| 3 | **AI builds once in Pathway Studio, a person approves, saved maps fill every case by rules** (chosen) | Founder, AIW-D169 (16 Oct), spelled out in AIW-D197 | AI reads each form or portal and proposes the questions, conditions, document lists and a map from every box to one shared fact. A person checks only new or unsure matches; a second Content publisher releases. Every fill after that uses the saved map by rule, with read-back and stop on a changed screen. | One review at set-up, not on each file. Same result every time. A new edition re-matches only the changed boxes (AIW-D169, D185). A reviewer checks the few new facts, not every box. | Needs a content team and expert time (size not stated). The first combination has every label new. Needs the team to change their parked plan (conflict below). | For Client A the IMM 0008, 5406, 5669 maps are released before launch. If Client A were common-law, the rare form IMM 5409 is filled on the first file only after the firm's licensed reviewer checks every box (AIW-D174). |

Smaller choices inside option 3, each decided by the founder: shared name per fact over each form's own box names (D170); content team picks forms and documents (D176); one PQR per country with an AI-built SQR per combination (D177); eligibility scored by rules, AI only drafts the rules (D179); conditions drafted by AI in a fixed language (D183); facts belong to the person and are reused inside the same firm (D184); cases stay on their pack version until a person adopts a new one (D185).

### Chosen, when, why

- **Chosen:** option 3, on 16 Oct 2026. Rows: **AIW-D169** (AI drafts once, a person approves once, every fill reuses), **AIW-D197** (the founder asked again whether the AI could fill directly with no stored map, using the Chrome extension; he chose "AI maps once, reuse"), **AIW-D174** (launch forms approved up front; rare forms learned at first use under licensed-reviewer check), **AIW-D135** (mappings are versioned and rule-tested; one approval of the values carries to every target).
- **Why (recorded):** the founder's words in D169: "guardrail … as less as mistakes as possible. I don't want to cut corners … whatever is the most safest way." The founder's own challenge (concept page appendix C): "why store matches at all?" The answer recorded there: without saved matches the reviewer must check every box on every file, cancelling the saving, and two runs of the same AI can differ. The slogan: use AI to build the map, not to be the map.
- **The team's rule stays in the part it is right about:** AI never sets a value at fill time (SA-1B-35, SA1B-D16); the three-tier rule stands (D178). Where we differ: the team parks form filling to Phase 3 (SA1B-D28); the founder keeps it in Release 1 (AIW-D146, confirmed D186), and he chose to tell the team in one message (D187). A fourth tier flag, "staff" (AIW-D180), changes the team's three-tier rule and is also in that message.

### Still open (Problem 1)

- The team has not yet been told (TC-39 and TC-177 are "not yet sent", per D187). If the team cannot build full filling for Release 1, the decision returns to the founder (risk R-1).
- Route and date for IRCC's barcode (XFA) forms: no answer (TC-39, risk 1).
- What Pathway Studio does when the AI is down: older text says the author maps by hand, which contradicts "nobody maps by hand" (AW-2-30 against D197).
- How big the first combination's set-up job is: learned in module 1.
- Accuracy of AI reading and matching on real files: not measured; no provider test has run.
- The team's rule makes test families optional; ours requires one per branch.
- Legal points: no counsel (AIW-D94).

---

## Problem 2: how the AI is organised

**The problem, in plain words.** Once the AI exists, the firm has to meet it somehow. As one named "worker" per job? As an agent per case stage? As many small skills that start by themselves at the right moment? Or only a helper you ask? The choice decides who manages it, how many reviews it needs, what breaks, and how it sells.

### Options on the table, in time order

| # | Approach | When and who | How it works | Good (functional) | Bad (functional) | Where it breaks on Client A |
|---|---|---|---|---|---|---|
| A | **AI workers / role twins / an "AI team"** | Founder asked for it 9 Oct (AIW-D19, D24); Lead recommended and founder ratified 11 Oct (D81, D90) | One AI teammate per firm role (Case Officer's AI, Intake AI, Billing AI, Owner's AI, plus two at Expat Ready), each acting for one named person with a slice of that person's permissions, made of small skills. | Easy to explain and sell; maps onto job titles (concept page appendix H). Clear owner per teammate. | Concept page: the firm gets a team to manage; jobs and permissions overlap; more to review; can sound like AI doing the legal work. D82 recorded the cost: about three times the testing and expert review of a narrow launch. Needs delegation records per person (AW-01 §3, "specified, not built"). Founder's buyer is a solo or 1–5 person firm, where one person wears every hat (D122). | In a solo firm the consultant would "supervise" an intake AI, a case AI and a billing AI that all work on Client A, and approve all of them. |
| B | **Case-stage agents** (one agent per stage runs it end to end) | Research brief Appendix A "stages first" (13 Oct); in D193 (16 Oct) | An agent owns intake, then file build, then filing and after. | Clear hand-offs; follows the journey the person recognises. | Brief: rigid stages mishandle a reopened fact; case-only coverage misses unconverted leads, receivables, imports and privacy work; automatic hand-off when a file changes owner is not designed. Concept page: long free-running chains are less reliable (published benchmark CRMArena-Pro: about 35% success on multi-turn, 58% single-turn); harder to see what went wrong. | Client A's child ages out or a document turns up late in filing: the agent for "file build" has already finished. |
| C | **Many small skills in the case pipeline, started by the case stage; rules do the rest** | Research verdict 11 Oct (central registry of versioned skills); working choice since D124 (13 Oct), D192 and D196 (16 Oct) | Each skill does one job, has its own test set, version and cost cap, and starts when a stage event happens (for example "passport uploaded"). Orientation (intake, file build, filing and after) is worked out from states the product already keeps. | Small, tested, versioned; an error points to one skill and only that skill is paused (D83); no worker to manage; one review inbox. | Concept page: many pieces to catalogue and test; needs a clear on/off view (open, Q13, D188). | Client A's passport upload starts the document-reading skill; a staff confirmation re-fills the forms. |
| D | **Co-pilot only** (on request) | Founder D19/D25 (9 Oct): "Expert co-pilot, no actions"; compared in D193 | Nothing runs by itself; a person asks. | Simple; nothing runs unasked. | Concept page: the typing does not go away; little time saved. Brief: people should not have to discover features by prompting. | Staff would still ask, wait, copy and retype for each document and form. |

Each of A to D is to be scored "with and without one co-pilot on top" on the same made-up family cases (D193). That scored comparison (milestone M1) has **not** been done.

### Chosen, when, why (and what is only a working choice)

- **13 Oct, AIW-D124:** the founder approved the hybrid: one assistant in the work screen, orientation from existing states, one permission-filtered review inbox, roles for ownership and permissions, shared skills underneath, product rules for calculations and effects. In the Lead's earlier design comparison, six teammates scored 36 of 60, one assistant with three stages and record changes 35, one assistant on today's records 41 (the six criteria were on a page since deleted; the criteria themselves are not recoverable).
- **16 Oct, AIW-D192:** lean; "no extra worker for firm staff to manage; one review inbox".
- **16 Oct, AIW-D193:** the organisation is reopened for a fair comparison; "the analysis may still show that AI workers are better, in which case we return to them". D124 stands until the founder chooses.
- **16 Oct, AIW-D196:** five categories plus one trust layer (Pathway Studio, Case Flow, Firm Operations, Your assistant, Expat Ready Operations; trust layer AI Controls). **How the AI inside each category is organised stays open (D193).** Names: "AI worker" retired, "skill" the one word (D173).
- **Working choice:** C plus one co-pilot behind one assistant. It is not yet a formal choice.
- **Why (recorded):** the founder redirect of 13 Oct (D121): "completely simplify it. Nobody's going to read so many documents", and challenge whether the kind of agents "is right for our purpose or aligned with the industry standard or ... more simpler ... first principle". Industry practice checked 13 Oct: start with one assistant, add specialists only for a concrete benefit (Anthropic and OpenAI guidance). Wording risk: the founder, D173: "autopilot oversells to RCICs and the regulator".

### Still open (Problem 2)

- The scored comparison A to D, with and without a co-pilot (M1).
- Q13: who switches skills on or off, which start by themselves, how the drill-down works (D188, deferred to after M1).
- Whether per-skill charging is better than one charge per prepared file (hypothesis only, D189; AIW-A12).
- Whether a firm owner may require a licensed approver (proposal).

---

## (e) Why the Lead recommended AI workers, and what changed

**Recorded reasons for AI workers (9 to 12 Oct):**
1. **It was the founder's own idea.** AIW-D81 says: "the Lead's recommendation, which was the founder's own idea". D19 (9 Oct): "whatever humans were doing ... can it have a human twin"; D24: a role twin is "the users' twins ... an AI case processor". The Lead's job then was to design it, not to question it (D20 challenged only the risks: role twin as delegation, co-pilot answers only).
2. **Easy to sell.** The Lead's wedge page (9 Oct): "a prepared file for CAD X, no salary, no training, same quality every time" is a sentence a consultant understands; the File Builder is "already 80% specified" as a bundle of what exists; competitors market "agents per case". The founder's headline chose "An AI team for your immigration practice" (D99, 12 Oct), customer benefit first.
3. **Fits the existing design.** AIW-D81: persona = AI team member; duty = skill; each skill has its own run record, test set and health light, so a failure points to one skill. The architecture research (11 Oct) said: keep the teammate as a configuration over a shared catalogue of versioned skills, not separate code per AI, and not an AI manager routing work to other AIs.
4. **Honesty about what is AI.** D90: six teammates, not seven; Practice answers is a product feature.

**What changed (recorded):**
1. **13 Oct, D121:** the founder said the documents were too many and challenged the agent design; the Lead's comparison of A, B and C followed.
2. **Buyer fixed as a solo or 1–5 person licensed firm (D122):** one person wears every hat, so separate identities add navigation and explanation overhead (brief Appendix A "roles first").
3. **Selling risk:** "AI team" and "role twin" invite the regulator's question "are you replacing licensed judgement?" (challenge review, 9 Oct); the headline and "AI team" were retired for "your assistant" (D124 note, D130).
4. **16 Oct reset (D192):** lean; no worker for staff to manage.
5. Not recorded: any measured result showing AI workers performed worse. No test has run. The change rests on founder direction, buyer fit and review burden, not on evidence from running either design.

---

## The whole idea in one paragraph

Expat Ready's content team sets up each immigration pathway once in Pathway Studio: the AI reads the government forms and portal screens and drafts the questions, conditions, document lists, eligibility rules and a map from every form box to one shared fact; people test the draft on made-up families, one approves and a second releases. When Client A's case starts, the client answers only what documents cannot supply; the AI reads the uploads into proposed facts with their source; staff confirm each one, least certain first; the facts are stored once per person. Fixed rules then fill every form and each switched-on portal from those confirmed facts, a wrong value is fixed once and every form re-fills, and a licensed person approves, signs and submits. The AI is not a team of workers to manage: it is a set of small, tested skills that start at the right case stage, plus one assistant you can ask, all behind a single review inbox. Pending the M1 comparison, that organisation is the working choice. (Sources: AIW-D169, D170, D182, D181, D192, D196, D197, D124.)

---

## The final outcome: tangible business benefits, each traced

No time-saved or money-saved figure is claimed: the saving is "not yet estimated; measured at the first pilot" (AIW-D175, D190, D195). The only bars are: zero wrong values in submitted forms (confirmed by a second licensed check) and review minutes per file against a timed baseline at the pilot firm (D175).

**Firm owner**
- Each pathway is set up once and kept current for every firm; the firm does not build forms or questionnaires itself (D176; SA-01 pinning). A form or rule change reaches open cases as "what changes for this file", and a person decides when to adopt (D185).
- One assistant, one review inbox, no AI team to run (D124, D192); switching on or off is decided later (D188).
- A licensed person approves every step; the claim is the method, never the outcome (D190).
- One charge per prepared file per application, with re-runs and our own errors never counted (D114, D189).

**Consultant and case officer**
- Staff confirm facts instead of typing them: the AI reads every checklist document, each value is a proposal with its source, least certain first (D182, D170).
- One fix updates every form: a wrong fact is corrected once and every form and draft re-fills; old approvals are withdrawn (D181, AW-1-159).
- Forms and portals are filled from confirmed facts through released maps, with read-back and stop on a changed screen; Submit, Pay and Sign stay with the person (D169, D174, D186, D197).
- A form-shaped view shows each box with its value, source and status (D181).
- Judgement items (for example "genuine job offer") are shown as needing a licensed person's view, never scored by AI (D179).

**Client**
- Asked fewer questions: the lead form, PQR and SQR pre-fill each other, no question is asked twice (D178); the SQR asks only what documents cannot give, and a question returns if the document is missing or disagrees (D177).
- Only the questions that apply: married adds a spouse block and a marriage certificate; each child adds a block (D183).
- A returning client is asked "still true? add anything new", not everything again (D184).
- Nothing AI-written reaches the client unapproved (AIW-D93; D107).

**Expat Ready**
- The pathway library is the IP, not sold, and reused by every firm (D196).
- Failures are isolated: a failing skill stays off without blocking the others (D83); run log, kill switch and recall sit in AI Controls (D196).
- Lean support: no "worker" for staff to manage (D192).
- A claim that holds up with the regulator and rivals: filling runs from verified values; a rival can call the same model but not reproduce the packs, audit trail and measured accuracy (AIW-D91 as amended by D97; research brief G2).

---

## Citations

Decisions (ai-workers/decisions.md): D19, D24, D25, D81, D82, D83, D85, D88 to D90, D91, D99, D107, D114, D121, D122, D124, D130, D135, D146, D169 to D190, D192, D193, D195 to D197; AIW-D20 challenge review.
Team (sources/drive-snapshot-2026-10-13-1535/02-functional-requirements/super-admin/SA-01B v1.4): SA1B-D1, D6, D9, D16, D21, D28; SA-1B-1, 2, 33 to 35, 77 to 83.
Research: ai-workers/research/ai-approach-founders-brief-2026-10-13.md (Appendix A, G); ai-architecture-deterministic-2026-10.md §9; ai-in-regulated-work-2026-10.md (CRMArena-Pro).
History: archive/ai-workers-old-direction-2026-10-16/concept.md, handbook/ai-team-profiles.md; git HEAD ai-workers/archive/wedge-recommendation.md, challenge-review-2026-10-09.md, design/ai-organisation.md.
Current page: ai-workers/expat-ready-ai-concept.html (Appendix C options records, Appendix H).

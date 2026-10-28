# Questions and documents, document first — concept draft (Lead, 28 Oct)

Status: **Agreed 29 Oct** (founder: §8 Q1–Q3 as recommended → P-130, P-131, P-132). It builds on what is already decided. It does not replace it: P-47, P-62, P-72, P-76, P-77, P-97, P-110, P-119–P-121, P-123, P-129.
Inputs: two read-only surveys, 28 Oct, covering every design file, Devin's work, the team's requirements (drive snapshot 19 Oct) and the team's code (dev, 28 Oct).
Where it lands:
* the Combination workspace's **Questionnaires** and **Documents** tabs (S5, runtime lane);
* two more steps in the **W1-10** AI run (forms lane);
* every proposal goes into **S6's one review queue**.
Board: `design/draft-questions-and-documents.html`.

## 1. The idea in one line
Every fact the forms need is collected **once**, from the **cheapest reliable source**, in this order:

1. **A document** the client uploads (AI reads it, a person confirms).
2. **The client** answers it.
3. **The agent or case officer** enters it.

The founder's three sets follow from that (28 Oct):

| Set | What it is | Who sees it |
|---|---|---|
| **PQR** (pre-qualification) | the bare minimum facts to assess the prospect; the rules engine checks them, and the prospect sees no verdict (P-77) | prospect (after M3, P-129) |
| **SQR** (client questionnaire) | the PQR facts (pre-filled, "please confirm"), **plus** the facts only the client can give, **plus** the document checklist; not the facts a document already gives | client |
| **Agent view** = the full form | every fact every form needs: the SQR answers, plus facts read from documents, plus the agent's own entries; confirmed section by section (P-72) | agent / case officer |

So **PQR ⊂ SQR ⊂ Agent view**, and each fact has exactly one source. Nothing is asked twice. Nothing the client can upload is typed.

## 2. One record per fact (lean: two attributes, no new tier system)
For each fact a combination's forms need, per person role:
* **Comes from:**
  * **Document · \<type\>** (e.g. Passport, Marriage certificate), when a document type on this combination's checklist supplies it;
  * **Client**;
  * **Agent**, for the representative's, office's and case's own facts.
  * Declarations and background answers are always **Client** (P-97).
* **Pre-qualification:** a tick, allowed only on facts that come from the client or a document. It marks the PQR.
* **Only if:** the existing condition record (shared with documents, S6 M6).

**Fallback, said on the screen:** a document fact whose document is missing or unreadable is asked of the client in the SQR ("we could not read it from your passport").
**What is cut:**
* the three PQR markers become one per-combination record. This mirrors the team's `pqrCanonicalFieldKeys`; `SectionQuestion.tier` is only an AI hint;
* W1-08 BR-10's mixed "When it is asked" column is gone.

## 3. Screens (inside the Combination workspace; no new page)
1. **Questionnaires tab: "Questions and where each answer comes from".**
   * A strip at the top: **Full form 186 facts → from documents 74 · client 88 · agent 24 → PQR 12**. Sample numbers.
   * One table grouped by form section, with a person-role filter. Columns: Question · Comes from · Pre-qualification ☐ · Only if · Used by (forms).
   * Each row shows who proposed it: AI, Rules or Person.
   * The existing "Who can be in this application" card stays on top.
2. **Documents tab: "Documents each person gives".**
   * The checklist per person role, with Always / Only if, and **"supplies 9 facts"** per document (click to see them).
   * Alternatives ("passport **or** travel document") as one line with options. This is the team's alternative group; minimal.
3. **Preview** (existing): by person, three columns, **PQR · SQR · Agent view**. Each shows exactly what that person or agent sees for a sample family.
4. **AI run card**, the shared one from S4: "Draft questions and documents", in the steps of §4.

## 4. What AI does (one run, after the forms are attached; proposals only)
| Step | Does | How | Cost |
|---|---|---|---|
| 1 | Facts per person role from the forms' field maps (already in the library) | rules | US$0 |
| 2 | Documents per person and their conditions, read from IRCC's guide and checklist, with the quoted line | AI | live or saved |
| 3 | Which facts each document supplies (passport: name, birth date, number, expiry …) | rules first (the library's `suppliesFacts`), AI for new document types | mostly US$0 |
| 4 | Comes from per fact: document if one supplies it, agent for representative and office facts, else client; P-97 kept | rules | US$0 |
| 5 | Conditional questions: "if yes, give details" in the form, plus the guide's conditions, as conditions on the deciding fact | AI, with rules checking the form structure | live or saved |
| 6 | PQR picks: the facts the guide's eligibility section tests, with a reason and quote each (P-76) | AI | live or saved |
| 7 | Independent checker round (does not see the draft) plus rules checks, listed below | AI + rules | live or saved |

The rules checks in step 7:
* every form field has exactly one source;
* every deciding fact is asked before what depends on it;
* PQR ⊂ SQR;
* every document fact's document is on the checklist.

Results land in S6's queue as **Ready / Check / Decide** (P-121). High confidence needs the draft, the checker and the rules to agree. Saved results are per form edition (P-110 amended). Steps 2, 5, 6 and 7 are the only paid ones.

## 5. Who does what (AI never sets a value, P-62)
| Who | Does | Never |
|---|---|---|
| **AI** | proposes documents, conditions, PQR picks and sources, each with IRCC's quoted line; reads uploaded documents into *proposed* values (M3) | decides, releases, fills a form from an unconfirmed value |
| **Rules engine** | facts from field maps, source by precedence, coverage and order checks, the PQR gates | guesses |
| **Content publisher** | accepts, edits or rejects each proposal in To review; ticks PQR | approves their own library change |
| **Second person / immigration expert** | approves library changes; confirms Sample values (W2) | — |
| **Agent / case officer** (M3) | confirms document-read and client facts by section; enters agent facts | signs for the client |

## 6. How it gets better (lean; no model training)
1. **Saved per form edition:** a re-run on the same edition reuses accepted results at US$0.
2. **Corrections as examples:** every accept, edit or reject is stored with its reason. The next run on the same form family gets the last accepted items as examples in the prompt.
3. **Measured:** acceptance rate per step, shown on AI work. A step under 70 % accepted is flagged for a prompt fix by the Lead.
4. **Expert confirmation turns Sample into confirmed**, and confirmed items are never re-proposed.

## 7. Against the team's requirements
* **PQR per combination** (P-76) versus SA-1B-77's one PQR per country. We keep per combination: the team's own code does the same. The country PQR becomes a derived view. A written reply goes to the team.
* **SQR pre-fill from the PQR, "please confirm"** (P-77) versus redesign decision 9 (no pre-fill). We keep P-77; we tell the team.
* **No "upload question" type** (SA1B-D15): an upload is a checklist line, not a question. Capability C4.5 is reworded to match.
* **Documents follow AG-08** (a Reader in Release 1): we read documents in M3 (C6.5).

## 8. Questions for the founder (one at a time)
1. A fact a document supplies: **not asked in the SQR** (the client uploads the document, the agent confirms the read value; asked only if it cannot be read)? *Lead recommends yes: fewest questions, least typing.*
2. AI steps 5–7 (conditions, PQR picks, checker) join the W1-10 Visitor visa live trial: about +US$10 on the US$40 plan, saved after. *Lead recommends yes.*
3. Keep PQR **per combination** and answer the team's per-country requirement in writing? *Lead recommends yes.*

## 9. M3 preview (agent side, P-129; its own concept follows)
The **Agent view** is the same renderer showing the full form by section. Each fact shows its source (Document · Client · Agent) and its state (proposed · confirmed); the agent confirms a section in one action. The per-person document checklist is read from the release.

Lean cuts recommended (the team owns these):
* the eligibility page (the team's AG-03 Qualifier): we show only the gate inputs;
* AI form review (the team's AG-11 Checker): we show findings, acknowledged with a reason.

M3's first open question: **what is a Filing?** One combination per case, or several filings per case (the team's AG-7-45)?

## 10. How it builds up (after the founder's agreement; one slice at a time, each with an early look)
1. **Data, runtime lane, after S5 merges:** a per-combination record per fact (comes from, PQR tick) plus coverage rules (one source each, PQR ⊂ SQR, a document fact's document on the checklist). Rules-only drafting, US$0.
2. **Questionnaires tab, runtime:** the strip and the table (frame 2). Early look.
3. **Documents tab, runtime:** "supplies n facts" and alternatives (frame 3). Early look.
4. **Preview in three sets, runtime:** frame 4. Early look.
5. **AI steps 2, 5, 6 and 7 in W1-10, forms lane:** in the shared run card, into S6's queue. The live trial runs once on Visitor visa (P-131).
6. **qa:** after-merge on each slice; S8 walks it like a content publisher.

Parallel: slices 1–4 (runtime) and slice 5 (forms) touch different files, so they can run at the same time. Slice 5 needs the S6 queue, and S6 is the screens lane's next item.

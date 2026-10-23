You are a senior product architect and information designer. Produce a lean, visual solution blueprint that a founder, a chief product officer and a CTO read in 10 minutes and understand completely. It is a human document. It is not an audit file.

## How to work (follow in order)

1. First reply with the storyline only: one line per page (headline, the single message, the visual type). Then stop and wait for my approval.
2. After approval, build the full document in one go.
3. Before handing over, check every page against the rules at the end. Fix what fails, then deliver.

## Output

- A single self-contained HTML file, laid out as 10 landscape pages of 1280 × 720 each, like slides. It must print cleanly to PDF, one page per sheet.
- All diagrams are inline SVG drawn with care. Neutral palette, one accent colour, consistent shapes. Readable when screen-shared.
- Each page carries one visual, a headline that states the message as a full sentence, and 3 to 5 numbered callouts of at most 20 words each, keyed to numbers on the visual. An optional small "detail" strip holds at most 40 words.
- Total text outside the visuals: at most 1,200 words.

## Use proven notations, not invented layouts

Research and apply the documented method that fits each page:

- **Service blueprint** (frontstage actors, line of visibility, backstage systems, support processes) for the end-to-end journeys.
- **C4 container diagram** for the solution on one page.
- **Data flow diagram** for how information moves.
- **Decision table** for conditional logic.
- **Low-fidelity wireframes** for screens.
- **Requirements matrix** for what to build.

Diagram rules:
- At most 12 shapes per diagram and at most 6 words inside a shape.
- Every arrow is labelled with the data that moves.
- One colour means one thing, explained once in a small legend.

## The business

Expat Ready is case-management software for Canadian immigration consultants and their firms. Expat Ready's own content team sets up every immigration pathway once, for all firms. Firms then run client cases on those pathways.

A pathway combination has four levels:

- **Pathway:** individual or corporate.
- **Program:** for example work, study, visit, permanent residence, family sponsorship or employer.
- **Category:** for example work permit or Express Entry.
- **Sub-category:** for example employer-specific or Federal Skilled Worker.

Each full combination is one row in a configurator screen.

## The problem

1. **Every combination is set up by hand.** Someone reads every government form, instruction guide and document checklist. Then they list the facts and build the questions, document lists and conditions.
2. **The same facts are typed again and again.** Example: a married couple with one child applying for a work permit from outside Canada. Their forms include IMM 1295, IMM 5707, IMM 5409 if common-law, and IMM 5476 if a representative acts. Names, dates of birth, marital status and addresses repeat across forms, people and the government's online portal.
3. **The stakes are high.** A wrong value on a government form harms the client, and the licensed consultant answers for it.
4. **Forms change editions.** Open cases must not break when they do.

## The solution

### Set up once, by Expat Ready's content team

- **A person enters the base forms and documents.** On the configurator row, a person picks the base forms and base documents. The AI may suggest them from the official checklist.
- **The AI drafts everything else.** It works from the forms, the official document checklist PDF and the instruction guide:
  - **Master fields.** One shared name per fact. Existing fields are reused; only new ones are created.
  - **Sections.** Each new field is placed into a fixed section library, so a name always sits in "Personal details".
  - **Questionnaires.** The PQR blocks and the SQR (glossary below).
  - **Conditional rules.** Married adds the spouse block and a marriage certificate. Common-law adds IMM 5409 and proof of living together. Each child adds a child block and a birth certificate. A representative adds IMM 5476. Applying from inside Canada swaps the form.
  - **Validations**, taken from each form's own limits.
  - **Form maps.** Each box records whose fact it shows (applicant, spouse, child 2), which master field, and which format.
  - **Portal maps.** A browser extension captures each screen's fields.
  - **The agent screen layouts.**
- **People check, a second person releases.** A label seen before matches by rule, with no AI. A person checks only new or unsure items. A second person releases. Everything is versioned, and each case keeps the version it started on.
- **Form changes.** When a new form edition arrives, the AI lists only the changed boxes. A person checks them and a second person releases. Open cases are offered the new version, and must adopt it when the government sets a cut-off date.

### Every case, at the firm

1. **Lead form and PQR.** There is one PQR per country, in blocks that unfold from what the prospect wants. Rules give an indicative eligibility result.
2. **Duplicate check.** On email, phone or organisation name, the system asks "same person?" and never merges silently. A returning client starts with their confirmed facts, and only "still true?" items are asked again.
3. **Case opened.** The case opens on a combination, and each family member gets a role. In a corporate case the employer is the subject, and each worker has a linked case.
4. **SQR per person in the client portal.** It asks only the missing facts, and only the blocks the rules switch on. A parent answers for anyone under 18.
5. **Documents.** Each document is uploaded once. AI reads each value with its page reference, and staff confirm it. Nothing is auto-accepted.
6. **Agent working view.** One normalised screen per person shows every fact once, with its source. Conflicts are decided here, and staff-only facts are typed here once.
7. **Form check view.** Each government form is shown per applicant, in its own order, read-only and filled by rules. A wrong value is fixed on the fact, never on the box, and one fix re-fills every form.
8. **Outputs.**
   - Standard PDF forms are filled by rules.
   - IRCC barcode forms get their values written into the form's data; a person opens them in Adobe Reader and clicks Validate. The product never makes the barcode.
   - The IRCC portal is filled by a browser extension in the representative's session. It types the facts, reads them back, and stops if the screen changed.
   - The licensed representative approves and submits.
9. **The fact store.** It holds one current value per person per fact. A newer verified value replaces the older one and keeps history. A contradicting value raises a conflict for staff.

### Non-negotiables

- AI drafts and reads, rules fill, and people decide.
- AI never fills a form at the moment of filling.
- Client data is stored in Canada.

**Glossary:** PQR is the pre-qualification questionnaire. SQR is the full questionnaire for the chosen combination. Agent means firm staff. Master field means one shared fact definition.

## The ten pages

1. **Cover.** One sentence and one hero visual: set up once, ask once, fill everywhere.
2. **The problem.** A heat-map matrix of facts (rows) against forms and people (columns), showing how often each fact is typed today. Label the numbers "illustrative".
3. **The solution on one page.** A C4 container diagram covering the configurator, master library, released pathway version, fact store, PQR, client portal, agent working view, form check view, document reading, and the PDF, barcode and portal outputs.
4. **Setting up a combination.** A service blueprint with lanes for the content team, AI, rules and the second reviewer, running from row to release.
5. **A case end to end.** A service blueprint. Frontstage: client, agent, licensed representative. Then the line of visibility. Backstage: system and AI. Stages: inquire, pre-qualify, open case, questionnaire, documents, review, forms, submit.
6. **How information flows.** A data flow diagram with four sources (PQR, SQR, document read, agent entry), the fact store, and every screen and form that reads it. Show how a conflict is handled.
7. **Conditional logic.** A decision table (when, then, for whom), plus one family whose answers change the forms and documents.
8. **The screens.** Five wireframes: configurator grid, PQR, client portal SQR, agent working view, form check view. Under each, one line each for what it reads, what it writes and what is configured there.
9. **What we build.** A requirements matrix per component: business requirement, system requirement, configuration needed, built today or new. Medium detail, one line per cell.
10. **Change and scale.** A form edition change and its impact on open cases. Next to it, a chart showing master fields grow far more slowly than forms and combinations.

## Do not include

- Decision numbers, requirement IDs or source citations in the body.
- Who said what, meetings, or history of versions.
- Lists of open items, assumptions or unknowns, or confidence labels on every line.
- Filler words: seamless, robust, leverage, powerful, simply, very.
- Jargon without a gloss.
- Personal names. The example family is unnamed.

## Final check, per page

- [ ] One message, stated in the headline.
- [ ] One visual that follows its notation.
- [ ] No more than 12 shapes, 6 words per shape, 5 callouts, 20 words per callout.
- [ ] Every word carries a fact, an action or a consequence.
- [ ] A CTO could ask "how?" and find the answer on the page or in its detail strip.

## 1.1 Create the combination row and attach its sources
1.1
Create the combination row and attach its sources
Content publisher · View 1: Start and read
Screen: Pathway Configurator › Row in the team's design
INPUT
Combination chosen in the pathway tree; official checklist, guide and eligibility page
ACTION
Select base forms and base documents; attach the official sources
OUTPUT
Draft row with a fingerprinted source set
RECEIVING OWNER
Content publisher (portal decision, then Run)
What the person does. Picks the combination, selects base forms and base documents, and attaches the official sources.
Example · Client A
Source set for Client A's combination (Example)
Source	Entered as	Recorded
Application form IMM 1295 (barcode form)	base form	file fingerprint, read 17 Oct 2026
Family-information form (IMM 5707 or IMM 5645, pending the specialist)	base form	file fingerprint, read 17 Oct 2026
Document checklist IMM 5488	checklist	file fingerprint, read 17 Oct 2026
Instruction guide IMM 5487 and the eligibility page	guide and criteria	link, fingerprint, read 17 Oct 2026
Exception. The common-law declaration (IMM 5409) is not entered here. It is conditional, so the engine drafts it in 3.5 from the guide.
Immigration conditions, forms and values shown are examples, pending the immigration specialist.
Trigger
A new combination is needed. (A new form or edition, or a reported wrong mapping, goes through the change path, 10.4 and 10.2, not a new row.)
Prerequisites
The combination exists in the pathway tree; the required source set is known: form editions, document checklist, instruction guide, eligibility page.
Records read · updated
Reads Configuration library · updates Configuration library
Authority
Content publisher at Expat Ready. May edit a draft row; cannot release their own draft. Firms have no access.
Ready state
At least one form edition or a checklist attached; every source fingerprinted with the date read.
Return path
Combination missing from the tree: add it to the tree first. A required source missing: a named blocker before Run.
Acceptance
Normal: The example row saves with two base forms, the checklist, the guide and the eligibility page, each with a fingerprint and date.
Alternate: Starting a run with no form edition and no checklist is refused, naming what is missing.
Next owner
Record handed over
Draft row and its source set
Receiving condition
Run may start once the portal decision is made.
Actions (4)
Pick Pathway › Program › Category › Sub-category
Select base forms from the form library (upload the official PDF if an edition is missing)
Select base documents, or accept the engine's suggestions read from the checklist
Upload the official document checklist PDF; link the instruction guide and the eligibility page
Rules (6)
Proposal One row per full combination; nothing attaches above a full combination
Founder decision A person enters base forms and base documents only; conditional forms, documents and fields are drafted by the engine
Proposal Every source gets a file fingerprint and a date read
Proposal A row cannot run without at least one form edition or a checklist
Founder decision Firms do not create rows or request them in the product
Founder decision There is no feature for a firm to add a form to a case; new forms and editions reach cases through Expat Ready's change watch or a firm's support report, then release and adoption
Exceptions and return paths (2)
The combination is missing from the pathway tree: it is added to the tree first
Traces to the team's requirements
Content publisher role; second person releases	SA-01B v1.4 change log
Row points at the form, not the edition	SA-1B-26

## 1.2 Capture portal screens
1.2
Capture portal screens
Screen: Portal capture (browser extension, Expat Ready test account) proposed
Authorised test session on the government portal
Open each screen of the filing; the extension records its fields
Versioned portal screen field list; uncaptured branches listed
Content publisher (Run)
What the person does. Walks through each screen and each answer branch in Expat Ready's test session.
One portal screen (Example)
Screen 'Personal details' opened in the test account
Fields, labels, options and order recorded, with a fingerprint
Saved as screen version 1
Exception. Answering 'yes' to 'Have you been married before?' opens a 'Previous partner' block. If that branch is not captured, it is listed as not supported and never filled.
Only when the combination is filed through portal screens (gateway after 1.1); otherwise skipped.
An authorised test route exists; the portal's terms of use have been checked (legal: unconfirmed, no counsel).
May capture permitted test screens only: no submission, no client file.
Every screen of the filing captured, or each uncaptured branch listed as not supported.
A screen depends on earlier answers: each branch is captured; an uncaptured branch is listed and never filled.
Normal: Re-capturing an unchanged screen gives the same fingerprint and no new version.
Alternate: A branch that was not captured shows as not supported; filling never types into it.
Portal screen versions
The run treats each screen version like a form edition.
Actions (2)
Open each portal screen of the filing in a test session
The extension records each screen's fields, labels, types, options, order and a screen fingerprint
Rules (4)
Proposal Capture runs only in Expat Ready's test session, never on a client's file
Proposal Each captured screen is a portal screen edition and goes through the same read, build and check as a form edition
Proposal A portal is switched on only after its terms of use are checked (legal: unconfirmed, no counsel)
Proposal Capture does not imply permission to automate a portal
A screen depends on earlier answers: the publisher captures each branch; uncaptured branches are listed

## 1.3 Run the engine
1.3
Run the engine
Screen: Pathway Configurator › Row › Run proposed
Ready draft row, captured screens if any
Choose a full run or a run on changed sources only, then start
Run in progress with a status per stage: read, draft, check
Platform (reading)
What the person does. Starts the run and watches its status. Results are not edited here.
Full run or changed-only run (Example)
Choice	When	What is read and drafted again
Full run	a new combination row	every attached source
Changed sources only	a new edition of one form arrives	that edition and what depends on it; approved unchanged items are reused
The publisher selects Run.
Row ready (1.1); portal screens captured where needed (1.2); no other run active on this row.
May start draft jobs only; the AI has no release authority.
Run registered with source fingerprints, model version and prompt version.
A source cannot be opened: the run stops and names the file.
Normal: Starting the same run twice does not create two active runs.
Alternate: A new run on a row with an unreviewed draft supersedes it; the superseded draft is kept and marked.
Run request with its library snapshot
Reading starts for whatever is new.
Choose a full run or a run on changed sources only
Watch the run status: read, build, check
Rules (7)
Proposal A run writes only to a draft; it never touches a released version
Proposal Each run logs its sources, model version and prompt version
Proposal A change of AI model or prompt for any AI step is a change: the step is re-run against the expected answers before use, and the result is recorded
Proposal One run at a time per row; a new run supersedes an unreviewed draft
Proposal A form edition's run is shared: a second row that needs the same edition reuses that run; two proposals of one new field meet as a near-duplicate in review (5.1)
Proposal If AI is unavailable or a reading is unresolved, the draft is kept and the blocker named
Proposal One generation workflow: a reviewer's correction feeds the next run; there is no second, manual authoring mode
A source cannot be opened: the run stops and names the file

## 2.1 Read each new form edition
2.1
Read each new form edition
Platform · View 1: Start and read
Screen: Form edition › Fields (job result) proposed
Runs for each form edition not yet read
IMM 1295 PDF, not yet read (Example)
Code extracts every field and, for a barcode form, its template and scripts
Field inventory and form logic list for that edition
AI (field matching)
No human action at this step. People see its results later.
Rows of an inventory (Example: real internal names come from the real read)
Printed label	Heading on the form	Type	Kept with it
Family name	Personal details	text	length limit read from the file
Date of birth	Personal details	date	format read from the file
Current marital status	Personal details	choice	options as printed
Exception. A form script shows the partner block when marital status is common-law. It is kept as a candidate rule, with the script as its source, for 3.5.
The run finds a form edition with no inventory. If every edition was read before, this step completes at once.
The edition is identified by form number, edition date and file hash; the reader supports the format.
May read sources and write extraction records to the draft only.
Every widget on every page belongs to a read field; unread regions are named.
An unreadable part holds that edition and is named; other editions and sources continue.
Normal: Every widget on each page of the example edition belongs to a read field.
Alternate: A page region the reader cannot parse is listed with its page; the edition cannot be marked read.
Field inventory and logic list per edition
Drafting starts when every active reading branch has finished.
Actions (3)
For each form edition not yet read: extract every field with internal name, printed label, type, maximum length, options, required flag, page, position and reading order
For barcode (XFA) forms: read the template and every show, hide and calculate script
Check that every widget on every page belongs to a read field
Proposal A form edition is read once and shared by every combination that uses it
Proposal The edition is identified by form number, edition date and file hash
Proposal A fillable PDF publishes no independent field count, so completeness is checked page by page: every widget belongs to a read field, and unread regions are named
Proposal An unreadable part is named, never skipped
Proposal Each form script becomes a candidate rule with the script as its source
Proposal The form's own headings are kept as read-only data on the inventory, for the form check view
Build gap Today's reader reads standard fillable PDFs and rejects barcode (XFA) forms
An unreadable region: the edition is held and flagged for a person; other editions continue

## 2.2 Split the checklist, the guide and the eligibility page
2.2
Split the checklist, the guide and the eligibility page
Screen: Row › Sources (job result) proposed
Checklist IMM 5488, guide IMM 5487, eligibility page (Example)
Split into checklist items, condition passages and criterion sentences
Sourced items and passages, source text unchanged
AI (documents, rules, gates)
Three kinds of item (Example)
Source text	Kind	Used in
'Proof of relationship, if applicable'	checklist item with an 'if applicable' note	3.3 document list
'Fill out only if you are in a common-law relationship'	condition passage	3.5 rules
'Show that you will leave Canada at the end of your stay'	criterion sentence	3.6 gates
The run includes a checklist, guide or eligibility page that is new or changed.
Readable text, or a supported OCR path for a scanned PDF.
May extract source text; does not decide what a passage means.
Every item and passage links to its page or heading.
A scanned PDF without text goes through OCR; if still unreadable, that source is held and named, and the drafting that depends on it waits.
Normal: Each checklist item links to its page.
Alternate: A passage split across two pages stays one passage with both page references.
Checklist items, condition passages, criterion sentences
Checklist PDF into items: document name, who provides it, any 'if applicable' note
Guide into passages that say who must complete what, and when ('fill out only if…')
Eligibility page into criterion sentences
Proposal Every item and passage keeps its page or heading
Proposal Nothing is paraphrased at this stage; the source text is stored
Proposal AI is used only to untangle a messy layout; its output is still the source text, checked by a text match
Proposal Matching OCR text does not prove the source was understood; meaning is reviewed later
A scanned PDF without text: OCR first; if still unreadable, the source is held and named

## 3.1 Match each field to a canonical field, or propose a new one
3.1
Match each field to a canonical field, or propose a new one
AI in the product · View 2: AI drafts the setup
Screen: No screen (background; results appear in the review workbench) no screen
Runs for each new form edition or screen version
Field 'Date of birth' under 'Spouse/common-law partner' (Example)
Rule match on an approved label in the same context; otherwise AI proposes the closest canonical field, or a new one
Match: canonical field 'Date of birth', with reason and evidence
AI (mappings)
One definition, three values (Example)
Canonical field	Person	Value
Date of birth	Client A	12 Apr 1990
Date of birth	Client A's partner	3 Sep 1991
Date of birth	Client A's child	20 Jan 2017
Exception. The family-information form allows a fixed number of characters for the date. That limit is kept on the form's mapping, not on the 'Date of birth' definition, so other forms are not affected.
Field inventories are ready.
Library meanings and approved labels are available.
Drafts only. Every new match is reviewed in 5.1.
Every field has a match, a new-field proposal or an explicit 'not a fact' mark (for example 'for office use only').
A near-duplicate field is marked 'decide' and goes on to review (5.1); it cannot be released until a person merges or confirms it.
Normal: A partner-name field resolves to the name definition, never to Client A's name field.
Alternate: Two fields for the same person map to the same canonical field: flagged as a possible purpose split (lives here now, send post here).
Matches and new-field proposals
Mappings can be drafted for every matched field.
Rule match first: a label approved before, in the same context, matches without AI
Otherwise AI proposes the closest existing field with a confidence and a one-line reason
If nothing fits, AI proposes a new field: type, validation, whose fact, lifecycle tier, plain meaning
Rules (5)
Proposal Context means the form section and whose fact: 'Family name' under the spouse heading resolves to the one 'Family name' definition, and its mapping (3.2) records that the value is the partner's, never the applicant's
Proposal A new field is proposed only when no existing field fits; a near-duplicate is marked 'decide' and cannot be released until a person merges or confirms it in 5.1
Proposal A canonical field's meaning stays separate from one form's limits: a form's length or format limit is kept on that form's mapping (3.2)
Proposal Every proposal cites the field and page; during initial validation every new match is reviewed whatever its confidence; low confidence marks it for closer review
Proposal Runs per form edition, once, shared by every combination
Two fields on one form map to the same canonical field for the same person: flagged as a possible purpose split (home versus mailing address)
Every question is one canonical field	SA-1B-1

## 3.2 Generate form field mappings
3.2
Generate form field mappings
Screen: No screen (background) no screen
Matched fields of the family-information form (Example)
Write one mapping per form field: person, relationship, canonical field, purpose, target, format, conditions, row
Reusable mapping set for that form edition, every entry a draft
AI (sections), then review in 5.1
Same label, three people (Example)
Form field label	Heading on the form	Person (relative to the copy owner)	Canonical field	Format
Date of birth	Applicant	the copy owner: Client A	Date of birth	the form's date format
Date of birth	Spouse/common-law partner	the copy owner's partner	Date of birth	the form's date format
Date of birth (row 1)	Children	the copy owner's child, row 1	Date of birth	the form's date format
One mapping set, many combinations (Example)
Combination	Family-information form edition	Mapping
Work permit, outside Canada	same edition	reused
Study permit, outside Canada	same edition	reused
Visitor visa	same edition	reused
Exception. What needs a new mapping: a new form edition, or a field whose meaning differs. The same 'Date of birth' label under an unclear heading is marked uncertain and reviewed.
Field matches are available.
Each field's heading and page are known, so the person it is about can be resolved.
Drafts mappings only. During initial validation every new or changed entry is reviewed.
Every field has a mapping (its person may be a profile record, such as the selected representative) or an explicit 'not filled' mark.
A field whose person or meaning cannot be read from label and heading is marked uncertain with the page snippet.
Normal: The partner's date of birth fills both the partner field on Client A's copy and the applicant field on the partner's own copy, from one confirmed value.
Alternate: An answer-list entry with no matching form option is refused, never guessed.
Mapping set per form edition or screen version
Every combination that uses this edition can reference the set.
For each field: the source person or organisation, the relationship to the copy owner (self, partner, child 1), canonical field, purpose or time, target field, format, conditions and repeated row
Map each value-list entry to the form's own option text
Mark fields no client fact supplies with their 'collected from' source (staff working view or a profile record)
Founder decision One mapping set per form edition or portal screen version; every combination that uses that edition reuses it
Founder decision Mappings exist as data because filling needs them; the AI writes them; during initial validation a person reviews every new or changed entry; approved unchanged entries are reused
Founder decision Reusing a definition never merges different people's values
Proposal A value-list miss is refused, never guessed
Proposal Overflow is a continuation sheet or a flag, never silent truncation
Team requirement Mappings reference the field and purpose, never a questionnaire section, so moving a section cannot break a form
Build gap Today's mapping entry holds only the canonical field, the form field and a transform; it has no person, relationship, purpose or row
A field's meaning cannot be read from label or context: marked 'uncertain' with the page snippet
Box map: purpose plus field, transform, value map, overflow	SA-1B-27
Forms reference a purpose, never a section	SA-1B-12
AI may draft and diff box maps; a person approves	SA-1B-33

## 3.3 Build the document list
3.3
Build the document list
Checklist item 'Proof of relationship, if applicable' (Example)
Link each item to a reused or proposed document type; set who provides it and base or conditional, per person
Document lines, base and conditional
AI (rules, after the join)
Document lines (Example)
Checklist item	Document type	Provided by	Base or conditional
Passport	Passport	each applicant	base
Proof of relationship, if applicable	Proof of cohabitation	Client A and partner	conditional: common-law (rule drafted in 3.5)
Exception. One lease proves cohabitation for both partners: it is uploaded once and linked to both, after a check that both names appear on it.
Checklist items are ready.
Document-type library and person roles are available.
Drafts document lines; never invents immigration values.
Every checklist item is linked to a document line or explicitly dismissed with a reason.
An item naming a document type the library lacks: proposed as new, always reviewed.
Normal: A conditional line names whose document it is and keeps its source.
Alternate: An item with no known type appears as a proposed new type in 5.1.
Document lines
Rules can reference the lines.
Each checklist item becomes a document line linked to a reused or proposed document type
Set who provides it (client, employer, government) and whether it is base or conditional, per person and role
Proposal A document type is reused where one exists; a new one is proposed only when none fits
Proposal Base or conditional is per person: a form that is base for the principal can be conditional for a spouse or child
Proposal An 'if applicable' note becomes a drafted condition with the note as its source
Proposal One upload serves every person it applies to, after an identity and applicability check
A checklist item names no document type we know: proposed as new, always reviewed

## 3.4 Place fields in sections and draft where each value comes from
3.4
Place fields in sections and draft where each value comes from
Canonical fields the combination needs; the master section list
Reuse the section with the same meaning; propose a new one only when none fits; draft each placement's 'collected from'
Placements, 'collected from' settings, proposed new sections
AI (join, then rules)
Sections × combinations (Example)
Section	Work permit, outside Canada	Study permit, outside Canada	Visitor visa
Personal details	✓ reused	✓ reused	✓ reused
Common-law relationship	✓ proposed new	✓ proposed new	✓ proposed new
Employment	✓ reused
Children	✓ reused	✓ reused	✓ reused
Exception. No 'Common-law relationship' section exists yet. It is proposed as new and waits for review in 5.1; nothing uses it until it is approved.
Fields and mappings are drafted.
The master section list and placement rules are available.
Drafts placements; a new section needs a person's approval once.
Every field the combination needs is placed, with a 'collected from' setting.
A field that fits two sections: both proposed with reasons; a person picks once.
Normal: An approved field appears in its usual section on every combination that uses it.
Alternate: Hiding a field that a form or rule reads is blocked at publishing.
Placements and 'collected from' settings
Views can be assembled.
Select suitable master sections and their canonical fields for the combination
Propose a new library section only when none fits
Draft each placement's 'collected from' setting: client questionnaire, staff working view, a profile record, or a confirmed document or existing record
Proposal Sections are selected from the master section list the engine maintains; a new section needs a person's approval once
Team requirement Reuse the existing section for the same meaning; a field group may sit in different sections on different rows (a child's date of birth sits under 'Family member')
Team requirement A placement never changes a group's fields, checks or purposes
Team requirement Publishing blocks a placement that hides a field a form or a rule reads
Founder decision Lifecycle tier (lead, prospect, case), 'collected from' and visibility are three separate settings on one shared value
Build gap Placements and 'collected from' are not built today
A field fits two sections: both proposed with reasons; a person picks once
Sections are reusable sets	SA-1B-13
Placement limits	SA-1B-7, SA-1B-8
Publishing blocks hiding a read field	SA-1B-9

## 3.5 Draft the conditional rules
3.5
Draft the conditional rules
Guide passage 'Fill out only if you are in a common-law relationship' (Example)
Draft when / then / for whom / why shown / source
Rule with its source, per person and role
AI (gates)
If / then (Example)
When	Then	For whom	Result
Marital status is common-law	add the statutory declaration of common-law union (IMM 5409) and proof of cohabitation	Client A and partner	form and documents appear, with 'asked because you live common-law'
A child is on the case	add a child block on the family-information form	each child	one block per child
Exception. 'Additional documents may be requested by the officer' depends on a judgement: it becomes an agent request on the case, never a rule.
The draft join has finished (fields, mappings, placements and documents ready).
The product's condition language and the person and role vocabulary are available.
Drafts rules only; an ambiguous passage goes to the specialist.
Every condition passage ends in a rule, a document line, an agent request or a person's dismissal.
An ambiguous passage is marked uncertain with two readings; the specialist decides (5.2).
Normal: A source-backed rule changes the right person's questions, forms and documents in its test family.
Alternate: A passage that depends on an officer's judgement becomes an agent request, never a rule.
Rules with sources
Gates and views can read the rules.
From form scripts, guide passages and checklist notes draft rules that add fields, documents, forms or repeating blocks
Each rule: when (an answer about a person), then, for whom (once, or each person in a role), why shown, source
Proposal Rules are written only in the product's condition language (equals, in, exists, and, or, not) over master fields
Proposal Every conditional passage ends in exactly one of: a rule, a document line, an agent request, or a person's explicit dismissal; none is left open
Proposal A passage that depends on an officer's judgement ('if the officer requests') becomes an agent request, never a rule
Proposal Each rule shows the client its reason when it fires ('asked because you live common-law')
Proposal Whether every passage was found is checked independently in 4.3; the AI's own list is not proof
A passage is ambiguous: marked uncertain with two readings; the specialist decides
Condition language, hard and advisory rules	SA-1-16

## 3.6 Draft the eligibility gates
3.6
Draft the eligibility gates
Criterion sentence from the eligibility page (Example)
Draft yes/no gates over canonical fields; load points tables as rows with their source
Draft gates and tables, each with source, date checked and next review date
AI (views); the specialist confirms in 5.2
A gate reads facts (Example)
Gate	Reads	Client A's answer	Result
Has a job offer	job offer	yes	met
Passport valid long enough	passport expiry	not answered yet	cannot tell yet (not a fail)
Rules are drafted.
Criterion sources and canonical fields are identified.
Drafts gates and tables; the specialist confirms every immigration value.
Every gate reads only canonical fields and carries its source and dates.
A gate needs a fact no PQR block asks: a prospect-tier field is proposed for the block.
Normal: A missing answer gives 'cannot tell yet', never an invented pass or fail.
Alternate: An unconfirmed gate cannot release.
Draft gates and tables
The PQR view can show the gate result and the gap.
From the eligibility page and guide draft the yes/no gates for the combination over master fields
Load points grids from the official tables as table rows with their source
Rules (3)
Proposal Gates are indicative: they give a PQR result and the gap, never a legal opinion
Proposal Every gate and grid row carries its official source, the date checked and a next-review date
Founder decision The specialist approves every gate and value before release; an unconfirmed gate cannot release
A criterion needs a value the forms never ask: a prospect-tier field is proposed for the PQR block

## 3.7 Assemble the PQR view, the SQR and the staff working view
3.7
Assemble the PQR view, the SQR and the staff working view
Placements, rules, gates and 'collected from' settings
Build three views of one set of definitions
PQR view, SQR definition, staff working view, with validations and limits
Platform (checks, view 3)
Where each value comes from (Example)
Fact	Source	Collected from	Who sees it	Form field it fills
Representative's licence number	the selected representative's profile	profile record; no client question	staff working view	the representative form's licence field
Client A's previous application number	old permit, or Client A's answer	document read and confirmed by the agent, or the SQR	staff; Client A under existing permissions	the application form's previous-application field
Firm's internal file reference printed on a form	the firm	staff working view; left out of client questionnaires	staff	the relevant form field
Marital status	Client A	PQR; pre-filled, not re-asked, in the SQR	Client A and staff	IMM 1295 marital status
Exception. Client A has no old permit to upload, so the SQR asks 'Do you have a previous application number?'. The child's questions go to Client A as the parent; nothing is sent to the child.
Gates are drafted.
Lifecycle tiers and 'collected from' settings are drafted.
Drafts view definitions; needs no live client facts.
Every gate field is asked by a PQR block; every SQR question has a reason to be asked.
A gate reads a field no PQR block asks: flagged; the block is extended for a person to approve.
Normal: Marital status is asked once in the PQR, pre-filled in the SQR and shown in the staff working view: one stored value.
Alternate: The representative's licence number never appears in a client questionnaire.
View definitions
Checks can run on the complete draft.
PQR: report which country blocks this combination reads and flag gate fields no block asks
SQR: everything that applies to the filing, per person and role, minus what is already known or collected elsewhere
Staff working view: the full set, every tier, by library section
Show each field's allowed values, and each form's character limits from that form's mapping (the definition keeps only its meaning checks); field and consistency checks are drafted in 3.8
Team requirement One PQR per country, in blocks; the combination's PQR is a derived view of the blocks it reads
Proposal The SQR asks the fewest questions: minus facts already known, minus facts a confirmed document supplies, minus facts collected from the staff working view or a profile record
Founder decision Facts collected from staff or a profile record (for example the representative's licence number) are never asked of a client; not every application number is one (a previous application number may come from a document or the client)
Team requirement Nothing is asked twice across lead form, PQR and SQR
Build gap Today's code has per-programme question-set section selections with a marked PQR subset, and no field-level tier flag or 'collected from' setting
A gate reads a field no PQR block asks: flagged; the block is extended for a person to approve
Rows do not own the PQR; publishing warns when a rule reads a field no block asks	SA-1B-79
Each tier pre-fills the next	SA-1B-83

## 3.8 Draft field and consistency checks
3.8
Draft field and consistency checks
Fields, documents, rules, the form's own limits and scripts, official programme and document rules
Draft checks in five groups, each with applicability, inputs, condition, severity, source, timing and the user's action
Draft check set, each check with its source
Platform (checks, view 3); the specialist confirms immigration values
Checks on Client A's case (Example)
Check	Group	Severity	Result
Client A's date of birth is before the passport issue date	cross-record	block	pass
Partner's passport expires in 70 days	advisory readiness	warn	amber warning, not a block
Police certificate is recent enough	official document rule	set by the specialist	value pending the specialist; no threshold invented
Lease address matches the partner's SQR address	cross-record	warn	flagged in 8.4, before the representative sees the copy
Exception. A rule such as 'the employer's business must have operated for a period before the offer' may not fit the condition language: it is recorded as a named gap for the team.
Views are assembled (3.7).
The product's existing check kinds: field limits and patterns, field-group checks, hard and advisory rules, document expiry and what it must outlive, history coverage.
Drafts checks only in the product's existing check kinds; never invents an immigration value.
Every check states applicability, inputs, condition, severity (block, warn or advise), source, when it runs and what the user does; anything the rule language cannot express is a named gap.
A check the product cannot express is recorded as a gap, never written as free text; a value only the specialist can give waits for 5.2.
Normal: Client A's partner's passport, expiring in 70 days, gives an amber warning and never blocks.
Alternate: A history gap longer than the allowed gap blocks submission until it is explained.
Draft check set
Checks are tested in 4.3 and reviewed in 5.1 and 5.2.
Actions (5)
Form-native checks: the form's own required fields, lengths, formats, options and scripts
Official programme and document rules: what a document must show and outlive, from the checklist and guide
Cross-record consistency: facts checked against each other and against documents (dates in order, addresses agree)
Advisory readiness: warnings that help the agent, such as expiry inside the warning window
Read-back: every written value compared with the value expected after the mapping's transform (run in 9.1)
Proposal Each check carries applicability, inputs, condition, severity (block, warn or advise), source, when it is evaluated and the user's action
Team requirement Document expiry only warns, at 90 and 30 days by default; it never blocks
Team requirement A history gap longer than allowed blocks submission until it is explained
Proposal Checks run when a fact is confirmed (8.1) and when a copy is rendered (8.2); time-sensitive checks run again before signing (9.4) and before submission (9.5)
Proposal A check the rule language cannot express is a named gap, never free text
Founder decision Immigration values in a check (for example how recent a police certificate must be) come only from the specialist
Proposal Every check is part of the 4.3 test cases
Exceptions and return paths (1)
Field-group checks	SA-1B-6
Hard and advisory rules	SA-1-16
Expiry warns; 90 and 30 days	SA-1B-21 – SA-1B-23
History coverage blocks until explained	SA-1B-15

## 4.1 Check structure and references
4.1
Check structure and references
Platform · View 3: Check, review and release
Screen: Row › Check report proposed
Complete draft from view 2
Code checks coverage, references and consistency
Check report: blocking, for-review and advisory findings
AI recheck (4.2) and tests (4.3), side by side
Findings (Example)
Finding	Kind	Held
'Date of birth', Children, row 1, has no mapping	blocking	that mapping and the copies that read it
A rule reads 'previous marriage' but no PQR block asks it	advisory: publishing warns	nothing
Proposed new field 'Last name' beside the existing 'Family name'	for review: near-duplicate	nothing; the publisher decides in 5.1
Every drafting step has returned.
Inventories and references are present; extraction gaps are named.
Reads Configuration library · updates Configuration library, Review and approval records
May block progress; cannot vouch for meaning.
Report attached to the draft with every finding linked to its item.
A blocking finding holds the affected item and its dependents (4.4).
Normal: Deleting a required mapping produces a blocker naming the field and the views affected.
Alternate: The same draft gives the same report every time.
Draft and check report
The meaning recheck and the expected-answer tests both start.
Every field mapped or explicitly marked
Every checklist item linked
Every rule's fields exist and every condition can be true
Near-duplicate fields marked for review; no hidden field a form reads; every passage dispositioned; every gate field asked by a block
Proposal A blocking finding holds the affected item and its dependents; release waits until it is resolved
Proposal The check report becomes part of the package
Proposal Checks are code; they run the same way every time
Proposal Structure checks prove consistency, not meaning
Proposal Two classes of finding: a blocking finding (a structural break or a missing item) returns to drafting through 4.4; a for-review finding (a near-duplicate, an 'uncertain' mapping or reading) goes on to the reviewer marked 'decide' and cannot be released undecided
A required field is unmapped: blocking finding with the field and page

## 4.2 Recheck mapping meaning in a fresh context
4.2
Recheck mapping meaning in a fresh context
AI in the product · View 3: Check, review and release
Screen: No screen (results appear in the review workbench) no screen
Drafted mappings with field label, heading and page
A separate AI run, without the drafting run's reasoning, checks that each person and fact fit the field
Agree or disagree per mapping, with the reason
Platform (join, then the failed-check decision)
Recheck (Example)
Field	Drafted	Recheck
'Date of birth' under 'Spouse/common-law partner'	the copy owner's partner	agree
'Date of birth' under 'Spouse/common-law partner'	the copy owner (Client A)	disagree: the heading names the partner
The check report is attached (runs beside 4.3).
Mappings carry the field's label, heading and page.
Reads Configuration library · updates Review and approval records
Flags only; never approves or changes anything.
Every new or changed mapping has a recheck result.
A disagreement marks the item for focused review in 5.1.
Normal: A mapping that puts Client A's date of birth under the partner heading is flagged.
Alternate: The recheck never loops with the drafting run until they agree.
Recheck results
Reviewers see each disagreement beside the item.
Read each new or changed mapping with its label, heading and page
Say whether the person and the fact fit, with a one-line reason
Proposal Proposed; its added value over plain checks is measured in the real read
Proposal A meaning check, separate from structure checks and from read-back
Proposal Never loop models until they agree
Proposal A disagreement makes the item a focused-review item in 5.1; every new item is reviewed anyway
Proposal A disagreement is a for-review finding, never a failed check: it does not send the item back to drafting; the reviewer's recorded, evidence-backed decision closes it

## 4.3 Test against independent expected answers
4.3
Test against independent expected answers
Screen: Row › Test families proposed
Draft package; made-up families with expected answers checked by hand and signed by the specialist
Preview each family's questions, documents, forms and filled values; compare
Results in three labelled columns: proposed target, measured result, approved release criterion
Review and test results (Example)
Item	What happens	Result
Client A's own date-of-birth mapping on the application form	approved earlier, unchanged	reused; not reviewed again
Partner's date-of-birth mapping on the family-information form	new	reviewed in 5.1
Wrong-person test: the partner's field resolves to Client A's value	fails against the expected answer	that mapping is held (4.4); the rest stays usable
Corrected mapping (person = partner)	re-tested	passes; goes on to review
Three columns kept apart (Example)
Measure	Proposed target, with reason	Measured	Approved release criterion
Wrong-person values on a family file	zero: a wrong person's fact on a filed form is a serious error	to be measured	not yet approved
The check report is attached (runs beside 4.2).
Independent expected answers exist for the representative cases.
May report and hold; may not use the engine's own output as the expected answer.
Every representative case has a result; every failure names its item.
A failure holds the affected item and its dependents (4.4).
Normal: A deliberately missing conditional document is found against the expected answer.
Alternate: A favourable total never hides a single blocking failure.
Test results
The failed-check decision reads them.
One made-up family per rule branch (single, married, common-law, with children, inside or outside Canada)
Preview each person's questions, documents and forms
Compare with the independently checked expected answers; report measured results separately from the release criterion
Rules (9)
Proposal The answer key is written by hand and signed by the specialist before any engine step is trusted
Founder decision Representative cases: wrong-person matches, missing fields, repeated rows, conditional branches, formatting and changed instructions; one good form proves nothing about other forms
Founder decision Acceptance criteria come from business consequences, not from the first experiment's accuracy; measured results are reported separately and never become the standard by default
Founder decision Proposed target, measured result and approved release criterion are labelled separately; a target is never shown as achieved
Founder decision Approved, unchanged items are not re-tested unless something they depend on changed
Proposal One combined family tests rules together (common-law, a child, and the inside or outside Canada form choice), because errors hide in interactions
Proposal Expected answers are kept per form edition and rule branch and reused across combinations; the specialist signs each once
Proposal The field and consistency checks drafted in 3.8 are part of the test cases
Proposal Proposed change to the team's requirement: today publishing runs no test set for gates and grids
A branch produces no preview: the rule it depends on is listed as unreachable
No mandatory test profiles; publishing runs no test set	SA-1B-38 (proposed change)

## 4.4 Hold affected items and their dependents
4.4
Hold affected items and their dependents
Screen: Row › Held items proposed
A blocking finding, a reviewer's correction or an unconfirmed rule
Hold the item and everything that reads it; send them back to drafting with the evidence
Held list; rework of those items only
AI (view 2), changed items only
One failure (Example)
Partner's date-of-birth mapping fails the wrong-person test
Held, with the date check and the family-information copies that read it
Client A's own date-of-birth mapping stays approved
Corrected mapping re-tested, then reviewed in 5.1
A blocking finding from 4.1 or 4.3, a reviewer's correction (5.1) or an unconfirmed item (5.2). AI disagreements and near-duplicates are not held here; they go to review (5.1).
The dependency list for each item is known (which mappings, rules, views and copies read it).
May hold items; cannot release or switch off a whole step on its own.
Every held item lists its reason and its dependents.
Back to drafting; after the fix only the changed items are checked and reviewed again.
Normal: Holding the partner's date-of-birth mapping also holds the date check and the copies that read it, and nothing else.
Alternate: Released versions used by other combinations and open cases are untouched.
Held items with evidence
Drafting re-runs on the held items only.
Hold the failing item and its dependents
Keep every unaffected item's review and approval
Send the held items back to drafting with the finding
Founder decision Approved, unaffected work stays usable: other combinations and open cases keep their released versions
Founder decision Reviews already done on unchanged items are kept; only changed items are reviewed again
Proposal Release waits until held items pass
Proposal Review starts on a clean report, so the reviewer sees each item with its dependents settled; approvals given in earlier rounds to items that did not change are kept (a proposal; parallel review of unaffected items is possible later)
Founder decision A whole step is switched off only for a stated, concrete reason, recorded with who decided

## 5.1 Review every new or changed item
5.1
Review every new or changed item
Content publisher · View 3: Check, review and release
Screen: Review workbench proposed
New and changed fields, sections, document types, mappings and 'collected from' settings, with findings and recheck flags
Approve, correct or flag each, beside its source snippet
Reviewed structure, or corrections sent back
Immigration specialist (5.2)
What the person does. Compares each proposal with the highlighted source; chooses Approve, Correct or Flag; never types a mapping from scratch.
Review beside the source (Example; proposed interaction)
Source evidence	Proposed	Reviewer
Page 2, heading 'Spouse/common-law partner', label 'Date of birth' (highlighted)	the copy owner's partner · Date of birth	Approve
Page 3, heading 'Children', 'Date of birth' row 1	the copy owner's child, row 1 · Date of birth	Approve
New section 'Common-law relationship'	proposed new section	Correct the name, then approve
Near-duplicate: proposed 'Last name' beside the existing 'Family name'	decide: merge or keep both	Merge into 'Family name', then approve
AI recheck disagrees on 'Date of birth' under the partner heading; the source names the partner	the copy owner's partner · Date of birth	Approve, with the reason recorded; no re-draft
Two different problems (Example)
Problem	Who fixes it	Where
The partner's date-of-birth field points at Client A	content team	here: the mapping
The partner's date of birth was confirmed wrongly on the case	agent	8.1: the fact
No blocking finding is left; for-review findings (AI disagreements, near-duplicates, 'uncertain' items) arrive marked 'decide' (held items return here after re-drafting; unchanged earlier approvals are kept).
Evidence, check report and the exact draft version are available.
Reads Configuration library, Review and approval records · updates Review and approval records, Configuration library
May approve, correct or return draft structure; cannot release their own work.
Every new or changed item has a decision recorded with who and when.
A correction holds the item and its dependents (4.4) and sends it back to drafting.
Normal: Approved, unchanged items reused from other combinations show as reused and are not reviewed again.
Alternate: A correction removes release readiness until the corrected item is re-checked.
Reviewed structure
The specialist can confirm rules, gates and values.
See every new or changed field, section, document type, mapping and setting, beside its source snippet; rules and gates are also confirmed by the specialist (5.2)
Accept, edit or reject; submit the package when no blocking finding is left and every 'decide' item is decided
Founder decision During initial validation every new or changed item is reviewed; approved unchanged items are reused without another review
Founder decision Model confidence never exempts a new item; rule matches on a new edition are new mappings and are reviewed too, in a grouped list with their evidence
Proposal The reviewer chooses among proposals or sends an item back; nobody types a mapping from scratch
Proposal Every accepted label is saved on its field, so the next form matches it by rule
Proposal Every decision is logged with who and when
Proposal A wrong mapping is the content team's to fix; a wrong fact on a case is the agent's
Proposal A for-review finding is closed by the reviewer's recorded, evidence-backed decision; the models never have to agree; nothing marked 'decide' can be released undecided
Many rejections: the engine re-runs with the corrections as input

## 5.2 Confirm rules, gates, documents and values
5.2
Confirm rules, gates, documents and values
Immigration specialist · View 3: Check, review and release
Screen: Review workbench › Rules and gates proposed
Drafted and changed rules, gates, document conditions and values, with sources
Confirm, correct or resolve each reading
Confirmed rules and gates, each signed off with a date
Second publisher (5.3)
What the person does. Reads each rule and gate beside its official source; confirms or corrects; decides between conflicting readings.
Specialist decisions (Example)
Item	Specialist	Recorded
Rule: common-law → IMM 5409 and proof of cohabitation	confirms	sign-off with date
Gate 'Passport valid long enough'	corrects the reading of the criterion	held, re-drafted, confirmed
Exception. Family-information form IMM 5645 or IMM 5707? The guide points to 'the version listed in the application package for your country'. The conflict is shown with both sources; the specialist decides.
The publisher's review is complete.
Specialist authorised; official sources attached.
Reads Configuration library, Review and approval records · updates Review and approval records
Confirms rule meaning and immigration values; cannot bypass release.
Every new or changed rule, gate and value confirmed; nothing unconfirmed.
An unconfirmed or corrected item is held (4.4) and returns to drafting.
Normal: A rule with conflicting official sources stays blocked, with both sources kept, until decided.
Alternate: A confirmed rule that has not changed is not confirmed again in the next run.
Confirmed rules and gates
The package can be released.
Confirm or correct each drafted rule, gate, document condition and immigration value
Resolve each 'uncertain' passage reading
Founder decision Immigration values come only from the specialist
Proposal An unconfirmed rule or gate cannot release
Proposal Sign-off is recorded per item with the date
The official sources disagree (two pages name different forms): the conflict is shown and the specialist decides; the decision is recorded with both sources

## 5.3 Release the versioned package
5.3
Release the versioned package
Second publisher (releaser) · View 3: Check, review and release
Screen: Release proposed
Reviewed package, difference from the last version, check evidence
Release, or reject with a reason
Released version: new cases open on it; open cases see it as a change to adopt (10.3)
Firms' cases (shared record)
What the person does. Reads the difference and the check report; releases or rejects with a reason. Never edits.
Difference report (Example)
Change since the last version	Release decision
1 mapping changed: partner's date of birth (person corrected)	release
1 rule added: common-law → IMM 5409	release
Exception. The releaser is the author of the draft: release is blocked.
Both reviews are complete.
A different authorised person from the author; no blockers; the reviewed draft unchanged.
Reads Review and approval records, Configuration library · updates Released combination package, Review and approval records
Releases or rejects; editing sends the draft back to review.
Package version released and readable by firms' cases.
Rejected: back to the publisher (5.1) with the reason.
Normal: The author cannot release their own draft.
Alternate: A changed draft cannot reuse a stale approval.
Released combination package
New cases open on it; open cases adopt it through 10.3, including a copy waiting for this mapping.
Read the difference from the last version and the check report
Team requirement The releaser is a second person, never the author, and never edits
Proposal The package is imported as one pathway version; every item carries its own version
Proposal New cases open on the new version; open cases keep theirs until a person adopts
A fault is found: rejected with a reason; the author fixes and resubmits

## 6.1 Lead form and PQR
6.1
Lead form and PQR
Prospect, then client · View 4: Prospect to confirmed facts
Screen: Lead form → PQR (block 0, then the blocks for what they want) in the team's design
Client A opens the firm's lead form link
Answer the short lead form, then block 0 and the blocks for intent and status
Declared facts on Client A's record; an indicative result and the gap
Platform (possible duplicates)
What the person does. Client A answers. No staff action yet.
Client A's PQR (Example)
Marital status: common-law; job offer: yes
Stored once on Client A's record
Indicative result: likely to meet the criteria so far
Exception. Client A skips the passport question: that gate says 'cannot tell yet', not 'not eligible'.
A prospect opens the lead form.
Released PQR blocks and indicative gates exist for the country.
Reads Released combination package · updates Facts per person or organisation
The prospect declares facts; the platform runs released rules only.
Lead saved with declared facts and the indicative result.
The prospect stops midway: save and resume by link.
Normal: A missing required answer stays missing and never becomes a false result.
Alternate: Nothing asked on the lead form is asked again in the PQR.
Lead with declared facts
Duplicate check runs.
Answer the short lead form and get an indicative result
Answer block 0 and the blocks for intent and status; see the result and the gap
Team requirement Lead-flag fields stay within the cap
Proposal Blocks unfold from intent and status; 'not sure' unfolds permanent residence, work and study
Proposal Gates give an indicative result with the deciding rule in plain words and what would change it
Team requirement Facts are stored on the person once; nothing is asked twice across lead form and PQR
The prospect stops midway: save and resume by link
Lead form: lead-flagged fields within a cap; indicative result	SA-1B-80
PQR with save and resume	SA-1B-82

## 6.2 Find possible duplicates
6.2
Find possible duplicates
Platform · View 4: Prospect to confirmed facts
Screen: Lead › 'Same person?' proposed
New lead: name, email, phone
Match against existing people and organisations
Candidate matches for staff to decide
Agent (6.3)
Candidates (Example)
New lead	Existing record	Matched on	Shown to staff
Client A	Client A, earlier enquiry	email	yes
Another person named like Client A	none	nothing	no
A person or organisation is created anywhere (lead, family member, employer).
Firm-scoped matching on email, phone or organisation name.
Reads Facts per person or organisation · updates Facts per person or organisation
Proposes candidates only; staff decide.
Candidates listed, or 'none found'.
No candidates: the lead goes to review with 'none found'.
Normal: Two people sharing a name, with different email and phone, are not proposed as one.
Alternate: A family member added later gets the same check.
Lead with candidate matches
The agent can decide.
Match email, phone or organisation name against existing people
List candidates for staff
Proposal Nothing is merged at capture
Proposal The same check applies to leads, family members and organisations
Proposal Matching names or email alone never link two people; the check only proposes
Team requirement An existing client is offered instead of a second record; creating one anyway is an explicit, recorded choice

## 6.3 Review the lead: same person, and take the case?
6.3
Review the lead: same person, and take the case?
Agent · View 4: Prospect to confirmed facts
Screen: Lead › Review proposed
Lead with indicative result and any candidate matches
Decide same or different person; decide whether the firm takes the case
Identity decision; lead converted or closed
Agent (7.1), or the lead is closed
What the person does. Decides whether a candidate is the same person, and whether the firm takes the case.
Decision (Example)
Decision	What happens
Same person	Client A's confirmed facts carry over; only 'still true?' items are re-asked
Different person	two records stay
A lead is ready for review.
Staff may see the lead and the candidates.
Reads Facts per person or organisation · updates Facts per person or organisation, Review and approval records
Authorised staff decide identity; a merge is a recorded decision.
Identity resolved and the firm's decision recorded.
'Different person': two records stay; a later merge is a recorded decision.
Normal: Choosing 'same person' carries over Client A's confirmed facts; only 'still true?' items are re-asked.
Alternate: Closing the lead ends the process; nothing waits.
Resolved client
A case can be opened.
Decide 'same person?' for each candidate
Decide whether the firm takes the case
Proposal A returning person starts with confirmed facts; only 'still true?' items are re-asked
Proposal A later merge is a recorded decision
Proposal 'Same person' links the lead to the existing record; the case then reuses facts one at a time (7.1) and also asks for anything missing and any unresolved difference
Staff say 'different person': two records stay; a later merge is a recorded decision

## 7.1 Convert the lead and open the case
7.1
Convert the lead and open the case
Screen: Case wizard proposed
Resolved client (new or existing) and the chosen combination
Pick the combination (its released version is pinned); add family members with roles; the platform pre-fills from confirmed facts
Case with people, roles, forms, documents and pre-filled questions
Client and family (SQR)
What the person does. Picks the combination, adds the partner and the child with their roles, and sees what was pre-filled and what is still open.
Who gets what (Example)
Person	Role	Gets
Client A	principal applicant	SQR; IMM 1295; family-information form; IMM 5409
Partner	common-law partner	own SQR; signs IMM 5409 with Client A
Child, aged 9	dependent child	no questionnaire; Client A answers
Exception. If the partner does not apply, they get no forms of their own; their facts fill the partner fields on Client A's forms.
Reusing facts on a new case (Example: every value, case and date is invented)
Field	Available information	Selected value · status	Reason	Human action
Client A's date of birth	12 Apr 1990, confirmed from the passport on an earlier visitor-visa case (Example); no other value	12 Apr 1990 · confirmed · reused	Same person, same meaning, confirmed with a known source; identity facts are not re-asked	None; shown pre-filled and correctable, never re-typed
Client A's home address ('lives here now')	Address 1, confirmed on the earlier case; Address 2, confirmed in Mar 2026 as a move that replaces Address 1	Address 2 · current · 'still true?' pending until answered; Address 1 kept as history	A recorded replacement is history, not a conflict; addresses carry a re-confirmation rule	Client A confirms or corrects Address 2; the address-history question uses Address 1 for its own dates
Partner's passport	Passport confirmed on the earlier case (expires in 70 days); a new passport number the partner typed in this case's SQR, not yet confirmed	Stored: the confirmed passport · proposed: the new number, 'to review' · copies that read it: pending review	A newer unconfirmed answer never replaces a confirmed fact, and the confirmed value is not cleared for filing while the proposal is open	The partner uploads the new passport; in 8.1 the agent confirms the new number (the old one becomes history) or rejects the proposal with evidence; until then copies that read the passport cannot be approved
Partner's date of birth	3 Sep 1991 (passport, earlier case) and 4 Sep 1991 (an older enquiry record merged into the partner's record); both confirmed, no recorded replacement	No value selected · conflict	Competing confirmed values with no recorded resolution: nothing is guessed	The agent checks the passport and confirms one value with a reason; fields that read it wait
Job offer employer	The employer on the earlier case's job offer	Not reused · asked for this case	A fact of that application, not of the person	Client A answers for this case
Partner's police certificate	Uploaded and accepted on the earlier case	Offered for reuse · checked against this case's checklist line	A document is reused only if this case's requirements accept its type, person, country and date (values pending the specialist)	The agent accepts it for this line, or requests a new one
Who starts where, and what carries over (Example)
Starting point	How the case starts	Pre-filled	Asked	Never carried over
New client, no record	Lead form and PQR (6.1); duplicate check (6.2); the firm takes the case (6.3)	What they answered in the lead form and PQR	The rest of the SQR and the documents	Nothing to carry
Existing client, profile only (no earlier case)	The agent opens a case from the client's record; no new lead	Confirmed profile facts	Missing facts, 'still true?' items, and eligibility questions the new service needs that the record cannot answer	Nothing to carry
Existing client, one earlier case	The same: a new case on the same client record, on the current release	Each person's confirmed shared facts; documents this case's checklist accepts	Missing facts, 'still true?' items, differences	That case's approvals, signatures, receipts, decision, case-only facts and release version
Existing client, several closed or active cases	The same	Each fact resolved on its own from the shared record and its history, never 'the latest case'	As above, plus any conflict between confirmed values	As above; another active case changes only through the usual 'fact changed' review
Any start: a fact is missing	No change	Blank	The question	A guess
Any start: a fact is due for re-confirmation	No change	The current value, marked 'still true?' (pending)	'Still true? add anything new'; it counts only once answered	A silent carry-over
Any start: a newer value is proposed (not yet confirmed)	No change	The confirmed value and the proposed one, each with its status; copies that read it pending review	The agent confirms the new value or rejects the proposal with evidence (8.1)	A silent replacement
Any start: confirmed values compete (conflict)	No change	Both values shown as alternatives; none selected for any form	A person confirms one with a reason; fields that read it wait	A guess
A corporate case (Example)
Subject	Case	Gets
Client A's employer (the organisation)	employer case for the job offer	employer questionnaire; employer forms signed by the employer's signatory
Client A as the worker	own worker case, linked to the employer's position	worker questionnaire and forms, as above
The firm takes the case (6.3), or an existing client needs a new service and the agent starts a case from the client's record.
Identity resolved; a released version exists for the combination; the agent may open cases for this client.
Reads Released combination package, Facts per person or organisation · updates Facts per person or organisation
Creates cases and relationships; cannot change released configuration.
Every person has one role; each person's questions, documents and forms are resolved.
No released version for the combination: the case cannot open on it; the agent picks another or waits for release.
Normal: Adding the partner creates a separate person with their own values, never copies of Client A's.
Alternate: The child receives no questionnaire; Client A answers for them.
Case, roles and pinned version
Questionnaires go out per adult.
Pick the combination; its released version is pinned
Add spouse and children with roles; each gets a duplicate check
The rules decide each person's forms and documents
For an existing client, start from the client's record: no new lead, no repeat of the lead form or PQR
The platform resolves each required fact from each person's shared record and pre-fills it; missing, re-confirmation and conflicting items are listed
Rules (15)
Team requirement Every person on a case has one role; their questions, documents and forms are the row's lines filtered by role and conditions
Team requirement A family is one case; each applicant has their own forms, fee and decision
Team requirement Nothing is sent to a person under 18; a parent answers for them
Proposal Corporate: one case per labour market assessment, occupation and location; positions link to worker cases
Team requirement Each person's filing has its own row and role; a family case need not use one row for everyone
Proposal Each applicant's filing groups their copies, approvals, signatures, fee, receipt and decision; filings the route requires to be submitted together wait for each other (the specialist confirms which)
Team requirement An existing client's new service is a new case on the same client record, opened from that record, on the current release; opening it does not alter the earlier case; a later confirmed change to a shared fact follows the affected-case rules, and submitted copies never change
Proposal Only eligibility questions the new service needs and the record cannot answer are asked; the full lead form and PQR are not repeated
Proposal Each required fact is resolved on its own from the person's shared record (rules in Records: Facts per person or organisation); never by copying the latest case
Proposal Asked: missing facts, facts due for re-confirmation, and unresolved differences; everything else is shown pre-filled for correction
Proposal The new case's own rules decide its questions, documents, forms and checks again; nothing is inherited from an earlier case's setup
Team requirement A document on file is reused only if this case's checklist line accepts it (type, person, still valid); expiry warnings are unchanged
Proposal Never copied into a new case: approvals, signatures, submission receipts, decisions or an earlier release version
Proposal A fact confirmed on this case updates the shared record; another open case that reads it marks the affected copies 'fact changed', and they follow the usual rule (prepared again, approval withdrawn); submitted copies never change
Proposal Choosing among confirmed values is rules, not AI
Exceptions and return paths (4)
Spouse not applying: no forms of their own; their facts fill the principal's partner fields
Client A's filing is decided before the partner's: Client A's filing is recorded as decided; the case stays open until the partner's filing has its decision
Two confirmed values with no recorded replacement (for example after two records are merged): both shown with sources; the agent confirms one before fields that read it fill
One filing's row and one role per person	SA-1B-73
Under 18: a parent answers	SA-1B-76
A returning client's new service is a new case on the same client	AG-07 §3.0
No duplicate client; 'create anyway' is recorded	AG-7-73
A new case starts on the current version	AG-8-40
Reuse a valid document on file	AG-8-20
Person-level and case-level facts; re-confirm on a new case; case snapshot	Doc-1 §5.3–5.4

## 7.2 Complete the SQR and upload documents
7.2
Complete the SQR and upload documents
Screen: Client portal › Questionnaire in the team's design
Runs for each adult on the case
Each adult's questions, minus what is known
Answer; upload each document once
Declared answers and uploads
AI (document reading)
What the person does. Client A and the partner answer their own questions and upload documents; Client A answers for the child.
The partner's SQR (Example)
Marital status already known from the PQR: shown pre-filled, not asked again
Passport uploaded once
Reading starts for that upload
Exception. Client A flags the pre-filled employer name as wrong: a conflict goes to the agent; fields that read it wait.
Exception. Client A returns for a new service: the date of birth shows pre-filled and correctable; the home address shows 'still true?'; neither is typed again.
The case is open (7.1), or a question returns because a document could not be read.
The recipient may answer for the person; the pinned rules are available.
Reads Released combination package, Facts per person or organisation · updates Facts per person or organisation, Document evidence
Declares facts and uploads evidence; cannot confirm a value.
Each adult has submitted; every required fact is answered or will come from an upload. An answer supplies the fact, never the document: a required document line stays open until it has accepted evidence or an authorised disposition (9.5); a recorded reason alone does not clear it.
A client flags a pre-filled value as wrong: a conflict for staff.
Normal: Adding a second child adds a separate child block and keeps each child's answers.
Alternate: A question dropped because a document will supply it comes back if the document is missing.
Each upload is read.
Each adult answers only facts not already known
Answers switch conditional blocks and documents on, with the reason shown
Upload each document once
Rules (8)
Team requirement Shared household facts are asked once ('same as the principal applicant')
Proposal A client can flag a pre-filled value as wrong; that raises a conflict for staff
Proposal A question dropped because a document will supply it returns if the document is missing, unreadable or in conflict
Proposal An answered question supplies the fact only; the document line still needs accepted evidence or an authorised disposition (9.5)
Founder decision Facts collected from staff or a profile record are never asked
Proposal A question is pre-filled only from a confirmed value for the same person, meaning and date; the source and date are shown
Founder decision On a new case, fields with a re-confirmation rule show 'still true? add anything new'; other reused values are shown for correction, not re-typed
Proposal Each new case's own conditions decide which questions and documents appear; a pre-filled answer can switch blocks on or off
Exceptions and return paths (3)
A client's answer contradicts a verified fact: conflict; dependent fields wait
A newer answer differs from a confirmed fact: it waits as 'to review' for the agent (8.1); the confirmed value stays until then
List-shaped facts asked once; 'same as the principal applicant'	SA-1B-10

## 7.3 Read each uploaded document
7.3
Read each uploaded document
AI in the product · View 4: Prospect to confirmed facts
Screen: Client portal › Documents (status per document) proposed
Runs for each uploaded document
Partner's passport scan (Example)
Read the document; propose values with page; match it to its checklist line
Proposed facts with evidence, not yet confirmed
Agent (8.1)
Passport to proposed fact (Example)
Partner's passport scan
Proposed: date of birth 3 Sep 1991, page 2
Agent confirms in 8.1
Exceptions (Example)
What happened	Result
Scan unreadable	the partner's date-of-birth question returns to the partner's SQR; the passport line shows 're-upload needed'
The partner answered 4 Sep 1991; the passport says 3 Sep 1991	both shown with the page; the agent decides
Passport expires in 70 days	amber warning on the document line (inside the 90-day warning); not a block
Questionnaires are submitted; one reading per upload (none if nothing was uploaded).
Document linked to a person; processing permitted; the document type is supported.
Reads Document evidence, Facts per person or organisation · updates Document evidence, Facts per person or organisation
Proposes values; never overwrites a confirmed fact.
Every upload is read, unreadable, or for the wrong person, each with a status.
Unreadable or wrong person: its facts' questions return to the SQR (7.2), and its document line shows 're-upload needed'.
Normal: A conflicting date is flagged with its page and never replaces the confirmed value.
Alternate: An expiring passport is shown as a warning, never a block.
Proposed facts with page references
The agent can confirm them.
Read each uploaded document; propose values with confidence and page
Match the document to its checklist line
Proposal A read value is 'declared by document' until an agent confirms it; it never fills a form unconfirmed
Founder decision Processing in Canada or the United States only, under written no-training and zero-data-retention terms, with client notice (the same for every AI step)
Proposal A document that fails to read sends its questions back to the SQR; its document line shows 're-upload needed' until it has accepted evidence or an authorised disposition (9.5); a recorded reason alone does not clear it
Proposal A successful reading proposes values; it does not itself accept the document. When automated reading fails, the agent may accept readable evidence by looking at it, and that acceptance is recorded
Proposal Past filed cases may be read the same way to seed facts and to test mappings against an independently checked expected answer
Team requirement Expiry only warns, at 90 and 30 days by default; it never blocks
The document is for the wrong person or expired: flagged on the checklist line
Warning lead times 90 and 30 days; expiry only warns	SA-1B-23

## 8.1 Confirm every fact once in the working view
8.1
Confirm every fact once in the working view
Screen: Agent › Working view (by library section, per person) proposed
Declared answers, proposed facts with evidence, conflicts
Confirm, decide conflicts, enter facts collected from staff
Confirmed facts with history
Platform (each form copy)
What the person does. Confirms proposed values, least certain first; decides conflicts; enters facts that are collected from staff.
Confirming Client A's facts (Example)
Fact	Proposed from	After the agent
Partner's date of birth	passport, page 2: 3 Sep 1991	confirmed
Client A's 'send post here' address	SQR answer	confirmed; differs from 'lives here now', both kept
Representative's licence number	the representative's profile	nothing to enter
Exception. The partner answered 4 Sep 1991, the passport shows 3 Sep 1991: both shown with the page; the agent picks 3 Sep 1991 and the choice is logged.
Readings are done, or a copy reports a fact to correct.
Staff may edit the person and field; the evidence is visible.
Reads Facts per person or organisation, Document evidence · updates Facts per person or organisation, Review and approval records
Confirms permitted facts; mapping problems go to the content team.
Every fact a required copy reads is confirmed, with no conflict, no replacement 'to review' and no re-confirmation still unanswered; a fact no copy reads holds nothing.
A copy reports a wrong fact: it comes back here; correcting it re-renders the copies that read it.
Normal: Changing the partner's date of birth re-renders every copy that reads it and withdraws their approvals.
Alternate: Two documents that disagree are both shown with pages; the choice is logged.
Confirmed fact snapshot
Each form copy can be rendered.
Confirm proposed values, least certain first
Decide conflicts
Enter facts collected from the staff working view, once
Proposal One current value per person per field; a newer verified value supersedes with history; a contradicting value raises a conflict
Proposal Fields that read a fact in conflict are blocked until the agent decides
Proposal The working view is the only staff editing surface (clients answer in the portal); a change here re-renders every form that reads it and withdraws earlier approvals
Proposal A confirmed fact that changes which forms apply adds or removes copies from the filing's required set: the case asks for any new copy; a copy no longer required is withdrawn, never filed
Proposal A new value replaces the current one only when the agent confirms it as a correction or a change of circumstances; upload or edit time alone never decides
Proposal Values reused from the person's shared record show their source and date; the agent acts only on re-confirmation items, 'to review' values and conflicts
Proposal A confirmed value with a newer value 'to review' shows two statuses: the stored value stays confirmed, but copies that read it cannot be approved or submitted until the agent confirms the new value (the old one becomes history) or rejects the proposal with evidence; unrelated facts and copies continue
Proposal A value due for 'still true?' may show pre-filled, but it counts as re-confirmed only once it is answered; stable facts with no dispute and no re-confirmation rule need no review
Two documents disagree: both shown with pages; the agent picks and the choice is logged

## 8.2 Render the form copy from the facts
8.2
Render the form copy from the facts
Platform · View 5: Prepare each form copy
Screen: Agent › Form check view (each form, each applicant, in the form's own order) proposed
Confirmed fact snapshot; the released mapping set
Resolve each field to one confirmed fact through its mapping; run the field and consistency checks
Rendered copy with value, source, status and check results per field
AI meaning check (8.3), or the 'not yet supported' wait
Client A's family-information copy (Example)
Field	Resolves to	Value	Status
Date of birth (Applicant)	Client A · date of birth	12 Apr 1990	filled
Date of birth (Spouse/common-law partner)	Client A's partner · date of birth	3 Sep 1991	filled
Date of birth (Children, row 1)	Client A's child · date of birth	20 Jan 2017	filled
Mailing address	Client A · 'send post here'	(the confirmed address)	filled
Previous application number	Client A · previous application number		needs a fact
Exception. After a government cut-off, Client A's case must use a new edition of a form that Expat Ready has not mapped yet: that copy shows 'Not yet supported' with the date it started waiting. The other copies continue.
The case asks for this copy: when facts are confirmed, after a fact correction, or after adopting a new version (10.3).
Pinned rules and mappings; each field has a readiness status.
Reads Released combination package, Facts per person or organisation · updates Prepared and submitted outputs
Renders and flags; never invents a value or amends a mapping.
Every field filled, needs a fact, blocked by conflict, pending review, staff enters, or not yet supported.
The required form edition has no released mapping: 'Not yet supported'; the copy waits (showing how long) and the case's other copies continue.
Normal: A conflict blocks only the fields that read it; other fields stay visible.
Alternate: The same facts and versions give the same rendered values.
Rendered copy
The meaning check can read each field's person and fact.
Rules decide which copies exist: one per applicant who must complete the form, or one per application
Each field resolves through its mapping (person, relationship, canonical field, purpose, row) to one confirmed fact
Run the field and consistency checks drafted in 3.8
Show value, source and status per field
Founder decision No AI at render time
Proposal Field status: filled, needs a fact, blocked by conflict, staff enters, not yet supported
Proposal The agent fixes the fact, never the field; a field that shows the wrong fact is a mapping flag to the content team
Proposal A field whose fact has a replacement 'to review' or an unanswered 'still true?' shows the current value marked 'pending review'; the copy can be prepared and checked, but cannot be approved until the agent resolves it in 8.1
Proposal A value-list miss or an overflow follows its rule and is shown, never hidden
Founder decision 'Not yet supported' arises only when the case must use a form edition Expat Ready has not yet mapped (for example after a government cut-off); the case's other work continues
Founder decision A newly released mapping reaches this copy only when the case adopts the new version (10.3); the case keeps its pinned version until then
Build gap Today's filler holds one value per canonical field, so it cannot place two people's dates of birth on one form
The mapping version changed since the case opened: handled as a change (10.3)
Each box has a status; a form is not ready while a required box is unmapped or needs review	SA-1B-29
Every value traceable to an answer	SA-1B-28

## 8.3 Check the copy's meaning
8.3
Check the copy's meaning
AI in the product · View 5: Prepare each form copy
Screen: Form check view (flags) proposed
Rendered copy: each field's label, heading, the person and fact selected, the evidence
Check important and disputed fields: do the person and the fact fit the field?
Flags with reasons, in the form check view
Agent (8.4)
Two different checks (Example)
Situation	Read-back check (9.1)	Meaning check (here)
Partner field holds the partner's date of birth	pass	pass
Partner field holds Client A's date of birth because the mapping's person is wrong	pass: the selected value was copied exactly	flag: the heading names the partner; the value is Client A's
The form cut off part of a long address	fail	not its job
A copy is rendered on a supported form edition.
Fields carry label, heading, person, fact and evidence.
Reads Prepared and submitted outputs, Facts per person or organisation, Document evidence · updates Prepared and submitted outputs
Flags only; never changes a value or a mapping.
Every important (immigration-significant) and disputed field has a result.
A flag goes to the agent's review (8.4).
Normal: A partner field holding Client A's date of birth is flagged, even though read-back would pass.
Alternate: A field the checker agrees with is still reviewed by people when it is important.
Copy with meaning flags
The agent reviews the flags.
Read each important or disputed field with its label, heading, the selected person and fact, and the evidence
Flag a mismatch with a one-line reason
Proposal A meaning check, separate from read-back: read-back proves copying, this checks selection
Proposal Proposed; its added value over plain checks is measured in the real read; it is not removed because read-back succeeds
Proposal It never changes a value or a mapping
Proposal A change of AI model or prompt for this check is re-tested against the expected answers before use
Team requirement Important fields use the immigration-significant flag in the team's design
Build gap The immigration-significant flag is not in today's code
The checker is unavailable: its fields stay grey ('not checked by AI'), never green, and the copy goes to the agent's review (8.4) with the fallback marked; the agent completes a focused meaning review of those fields (person, fact, source) and records it; the approval records that the AI meaning check did not run; every other check still applies
Immigration-significant flag	SA-1B-1

## 8.4 Review the copy's statuses and flags
8.4
Review the copy's statuses and flags
Agent · View 5: Prepare each form copy
Screen: Form check view › Needs attention proposed
Copy with field statuses, check results and meaning flags
Work through the 'needs attention' list in the form's own order; decide each flag
Copy ready to fill, a fact to correct, or a mapping reported to support
Platform (9.1), the case (8.1) or Expat Ready's support
What the person does. Looks at every red, amber and flagged field, and every important field even when green; decides correct, wrong fact or wrong mapping.
Needs attention (Example)
Field	Colour	Why	Agent
Partner's passport expiry	amber	expires in 70 days (inside the 90-day warning)	acknowledges; warns, does not block
Partner's address against the lease	amber	consistency check: the lease shows another address	checks the fact in 8.1 before the representative sees it
Client A's date of birth (important)	green	filled and checked	still listed for focused review
Partner's date of birth	red	meaning flag: the value is Client A's	'wrong mapping': reported to support; the copy waits
Exception. If the agent finds the fact itself is wrong (the partner's date was confirmed as 4 Sep 1991), it goes back to 8.1; the copy re-renders after the correction.
The meaning check is done, or it was unavailable and the fallback is marked; the representative returned the copy; 9.2 found a fact or mapping problem; or the agent takes back a waiting copy.
The agent can see statuses, sources, check results and flags.
Reads Prepared and submitted outputs, Facts per person or organisation · updates Review and approval records
Decides flags; fixes facts in the working view, never a field or a mapping.
No blocked item left unresolved; every flagged item decided with a reason; if the AI meaning check did not run, every important field reviewed against person, fact and source, and that review recorded.
Wrong fact: back to 8.1 (the copy re-renders). Wrong mapping: reported to Expat Ready's support; the copy waits (showing how long) or is completed by hand if urgent.
Normal: An amber passport warning can be acknowledged and does not block.
Alternate: A green important field is still listed for focused review.
Reviewed copy
Filling may start.
Open the 'needs attention' list
Decide each flag: correct, wrong fact or wrong mapping
Acknowledge amber warnings
Report a wrong mapping to Expat Ready's support
Proposal Colours: grey means no check applies or not yet checked (not reviewed); red means blocked (a check with block severity failed: it must be resolved and checked again, never acknowledged) or flagged (a meaning or consistency flag the agent decides, with a reason); amber warning; green filled and checked; green does not mean approved
Proposal One order: the form's own order, plus a 'needs attention' list that jumps to items
Proposal The agent fixes the fact, never the field
Founder decision A wrong mapping is reported to Expat Ready's support; the copy waits until the case adopts the corrected version, or authorised staff complete it by hand if urgent
Proposal A waiting copy shows the date it started waiting, on the copy and in the agent's list; no turnaround is promised
Proposal A read-back mismatch caused by a format or transform is a wrong mapping; a field that refuses written data goes on the type-by-hand list
Proposal If the AI meaning check is unavailable, its fields stay 'not checked by AI' and the agent's focused review of them (person, fact, source) is completed and recorded; grey alone is a status, never a completed review; hard checks, missing facts, document lines, read-back and the final-file review still apply

## 8.5 Complete the form by hand
8.5
Complete the form by hand
Screen: Firm's existing process (outside the product's filling) outside the product
Copy waiting ('Not yet supported', or a mapping reported wrong), and the case is urgent
Authorised staff complete the form by hand
Hand-completed copy, recorded as completed by hand
Agent (9.2)
What the person does. Authorised staff complete the form through the firm's existing process.
A new edition not yet mapped (Example)
After a government cut-off, Client A's case must use a new edition
'Not yet supported', waiting since the day it was marked; the other copies carry on
Urgent: the agent completes it by hand
The representative approves it (9.3)
Exception. Not urgent: Expat Ready releases the mapping, the case adopts the new version (10.3), and the copy is prepared again and fills automatically.
The agent marks a waiting copy urgent.
The form edition and the confirmed facts are available to staff.
Reads Facts per person or organisation · updates Prepared and submitted outputs
Authorised firm staff; no firm-side mapping review and no second configurator.
Copy completed, marked as completed by hand, and uploaded as the final file.
If the case adopts a version that supports the form first, the waiting copy is replaced and prepared again automatically (10.3).
Normal: A hand-completed copy still needs the representative's approval.
Alternate: The case's other copies are not held while this one waits.
Hand-completed copy
Validation where the form needs it, then approval.
Complete the form by hand through the firm's existing process
Record the copy as completed by hand
Founder decision Used when a copy waits for a mapping (a new edition not yet mapped, or a mapping reported wrong) and the case is urgent
Founder decision No firm-side mapping review and no second configurator
Proposal Hand-entered values are recorded as hand-entered and still need the representative's approval

## 9.1 Fill each form type and read it back
9.1
Fill each form type and read it back
Screen: Form check view › Generate · government portal (extension) proposed
Reviewed copy, fact snapshot, mapping version, screen fingerprint
Write each value for the form type, then read every written value back
Filled PDF or typed portal screen, with read-back results
Agent (9.2) if anything needs a person; otherwise the representative (9.3)
One line per form type (Example)
Form type	Write	Read back	Expected
Standard fillable PDF	each field by name	each field	values match
Barcode form (IMM 1295)	the form's own data; template and scripts untouched	the data	values match; barcodes made later by Validate (9.2)
Validate-only form	the form's own data	the data	values match; no barcode expected
Portal screen	after the fingerprint check, each value typed	each value from the screen	values match
Exception. The barcode form refuses the partner's date value: the field goes on the type-by-hand list for 9.2; the rest of the copy stays filled.
The agent marks the copy correct (8.4).
Supported edition or screen version; required facts confirmed.
Reads Facts per person or organisation, Released combination package · updates Prepared and submitted outputs
Prepares and reads back; a person keeps final submission.
Every written value read back and matched, or listed to type by hand.
A read-back mismatch or refused value holds this copy (and its approval and submission) and goes to the agent in 9.2; other copies continue.
Normal: A changed portal screen fingerprint stops entry before any field is typed.
Alternate: The same facts and versions re-render byte-identically on a standard fillable PDF.
Filled copy with read-back results
Typing by hand and validation where needed; then approval.
Standard PDF: write each field
Barcode form: write the confirmed values into the form's own data; leave template and scripts untouched
Validate-only form: same data write
Portal: the extension checks the screen fingerprint, types each value, reads it back
Team requirement The product never generates a barcode
Proposal A changed portal screen stops the fill and raises a re-capture
Proposal Every filled value links to its fact, source and confirmer; the output is stamped with form edition, mapping version and fact snapshot
Proposal A per-edition 'type by hand' list covers fields that refuse written data
Proposal After writing, code reads every value back and compares it with the value expected after the mapping's approved transform (an equivalent the form itself is documented to produce also matches); a mismatch holds that copy and goes to the agent (9.2), while other copies continue
Proposal Read-back proves copying, not selection (meaning is checked in 8.3)
Team requirement AI never sets a value on a form at fill time
Build gap Today's filler fills standard fillable PDFs only; barcode forms and the portal are not built
A barcode form refuses a value: the field is listed to type by hand; the data-file import route is the fallback
Never a submission-ready barcode	SA-1B-31
AI never sets a value at fill time	SA-1B-35

## 9.2 Resolve read-back results, type refused fields, validate
9.2
Resolve read-back results, type refused fields, validate
Screen: Form check view › Read-back · Adobe Reader (Validate) proposed
Filled copy with read-back mismatches, its type-by-hand list and validation needs
Classify each mismatch; type listed fields; validate barcode forms in Adobe Reader
Validated final file with its read-back, or a fact or mapping problem sent back to 8.4
Licensed representative (9.3), or the agent's review (8.4)
What the person does. Classifies each read-back mismatch, types any listed fields by hand, runs the form's own Validate where needed, and uploads the validated form.
Read-back and validation (Example)
Finding	Agent's classification	Next
Partner's date expected 1991-09-03 after the mapping's transform, read back 03/09/91	format or transform: mapping problem	back to 8.4; reported to support
IMM 1295 refuses the partner's date value	field refuses written data	typed by hand here
IMM 1295 (barcode form)	validate in Adobe Reader	barcode page appears
Exception. Validate reports a format error in the partner's date, but the confirmed date, 3 Sep 1991, is right: the date is not changed; the format is reported as a wrong mapping through 8.4. If Validate instead reports a missing mandatory value (Client A's previous application number), the fact is entered in 8.1, the copy re-renders, and Validate runs again.
Read-back found a mismatch or a refused field, the form needs its own validation, or the copy was completed by hand.
Correct form edition and a supported validation environment.
Reads Prepared and submitted outputs · updates Prepared and submitted outputs
Classifies and validates; never fabricates a barcode, edits a mapping or bypasses a failed check.
Every mismatch and validation failure classified; validation result kept with the copy; nothing left to type; the final file uploaded and read back, or its unreadable and hand-entered fields listed.
Each failure goes to its cause. A wrong or missing fact, or a format or transform problem, goes back to the agent's review (8.4), which sends a wrong fact to 8.1 (the copy re-renders) and reports a wrong mapping to support. A Reader or edition issue is checked against the edition's known-issues list and validated again in a supported Reader; if it cannot be resolved and the case is urgent, the copy is completed by hand (8.5). A correct fact is never changed to satisfy a format.
Normal: A truncated value caused by the mapping's format is classed as a mapping problem and the copy is held.
Alternate: A validate-only form is checked against its expected result without a barcode.
Validated copy
The representative can approve.
Actions (6)
Classify each read-back mismatch: format or transform (mapping problem) or a field that refuses written data (type by hand)
Type the fields on the edition's type-by-hand list
Classify each validation failure by cause: wrong or missing fact, format or transform, or a Reader or edition issue
Open each barcode form in Adobe Reader, check it, click Validate; the form makes its barcodes
Upload the validated form
On upload, code re-runs the read-back on the final file where the form type allows; fields it cannot read and every hand-entered field are listed for the representative
Proposal Validation is done by a person, as the government intends
Proposal A validation failure is fixed at its cause: a wrong or missing fact in 8.1; a format or transform as a wrong mapping (8.4); a Reader or edition issue on the known-issues list. A correct fact is never changed to satisfy a format
Proposal Expected validation behaviour is defined per form edition; a barcode is expected only where that form type makes one
Proposal The copy stays held until every mismatch is classified and resolved
Validate shows no barcode: wrong Reader version or an unsupported field; both are on the edition's known-issues list
Barcode page created only when a person clicks Validate	SA-1B-31

## 9.3 Approve the copy
9.3
Approve the copy
Licensed representative · View 5: Prepare each form copy
Screen: Form check view › Approve proposed
The final file or portal screen with values, sources, statuses, its own read-back and validation results, and the hand-entered fields listed
Approve the exact final file, or return it with a reason
Approved copy ('copy approved' to the case)
The case (9.4), once every required copy of the filing is approved
What the person does. Reads each value against its source, including every hand-entered value; acknowledges every amber, flagged and important item; approves or returns. A blocked item cannot be acknowledged: the copy goes back.
Copies on Client A's case (Example)
Copy	Representative
Client A · IMM 1295	approved
Client A · family-information form	approved
Client A and partner · IMM 5409	returned: the representative disagrees with the agent's accepted address warning
Exception. The partner's address is corrected in 8.1 after approval: the IMM 5409 copy's approval is withdrawn; it re-renders and is approved again.
The final file is uploaded or the portal screen filled and, where needed, validated.
Licensed representative on the case.
Approves each copy; does not sign for the client.
Approval stamped with the final file's fingerprint, the versions and the fact snapshot it covered.
Returned: back to the agent's review (8.4).
Normal: Changing a fact after approval withdraws that copy's approval.
Alternate: A blocked item prevents approval even when acknowledged; an unacknowledged amber or flagged item also prevents it.
Approved copy
The case waits until every required copy of the filing is approved at its current version.
Approve each copy, each value traceable to its fact
Return a copy to the agent with a reason
Team requirement Nothing is filed without a licensed person's approval per copy
Proposal Approval is stamped with the final file's fingerprint, the versions and the fact snapshot it covered; a later fact change or any change to the approved content withdraws it
Proposal The expected signing or declaration step (9.4) does not withdraw it: the signed file is linked to the approved content version and its signature evidence, and keeps the approval only when its answers are shown to be unchanged. A signed file that cannot be matched, or whose answers changed, comes back to the representative and does not inherit the approval
Proposal One approval per copy, with explicit acknowledgement of every amber, flagged and important item; no blocked item may remain
Proposal The representative approves the final file, including hand-entered and form-calculated values; each hand-entered value is read against its confirmed fact; an earlier read-back never certifies a later edit
Proposal 'Every copy approved' counts the filing's current required copies at their current versions; a withdrawn or superseded approval does not count
Proposal A copy with any field 'pending review' cannot be approved
A fact changes after approval: approval withdrawn; the copy re-renders and is re-approved
The partner's date was mistyped as 3 Sep 1981 while typing refused fields in 9.2: the final file shows it against the confirmed 3 Sep 1991; the copy cannot be approved and returns to the agent
Nothing is signed without a person approving it	SA-1B-30

## 9.4 Sign and declare
9.4
Sign and declare
Prospect, then client · View 6: Sign, submit and record the response
Screen: Client portal › Sign proposed
Runs for each required signatory
Approved copies that need a signature or declaration
Each required signatory signs or declares
Signed copies and declarations
Licensed representative (9.5)
What the person does. Client A and the partner sign and declare their own parts.
Signatures (Example)
Signatory	Signs
Client A	IMM 1295; IMM 5409
Partner	IMM 5409
Child, aged 9	follows each form's rules
Exception. While signing IMM 5409 the partner reports that the address is out of date: nothing is signed; the case returns to 8.1, the address is corrected, the copy re-renders, the representative approves it again, and both partners sign.
Exception. Client A signs IMM 1295 and no answer changes: the signed file is linked to the approved version and the filing can be submitted. A signed upload that shows a different date of birth does not inherit the approval: it goes back to the representative.
Every required copy of the filing is approved at its current version.
Signatories identified for each copy.
Reads Prepared and submitted outputs · updates Prepared and submitted outputs, Review and approval records
Each signatory signs only their own part.
Every required signature and declaration present; each signed file linked to the approved content version it signs.
A signatory reports a wrong value, or a re-run time-sensitive check blocks: back to 8.1; the fact is corrected, affected approvals are withdrawn, the copies re-render, are approved again and signed again. A signatory is unavailable: submission waits; nobody signs for them.
Normal: The representative cannot sign for Client A.
Alternate: The partner reports the wrong address while signing IMM 5409: the case returns to 8.1, the copy re-renders and is re-approved and re-signed; unaffected copies keep their approvals.
Signed copies
Submission can start.
Actions (1)
Each required signatory signs or declares through the right route
Founder decision Submitting, paying, signing and declaring are always done by a person
Proposal The representative does not sign for the client
Proposal Answering is not signing: a parent answers for a child, but who signs follows each form's own rules
Proposal Changed signed or approved content needs the action renewed
Proposal Signing keeps the content approval only through a verified link: the signed file is matched to the approved content version (answers read back where the form type allows, otherwise compared by the representative); an arbitrary signed upload or a changed answer does not inherit the approval (9.3)
Proposal Before signing, the platform re-runs time-sensitive checks (3.8); a new block returns the case to 8.1
Proposal A signatory can report a wrong value instead of signing; that returns the case to 8.1

## 9.5 Submit and pay
9.5
Submit and pay
Licensed representative · View 6: Sign, submit and record the response
Screen: Government portal outside the product
Approved, signed copies and accepted document lines
The authorised submitter submits; the fee is paid by a person
Submitted application; receipt kept
Government; then the agent records responses
What the person does. Submits through the government route; the person paying pays the fee.
Submission (Example)
Submit
Receipt with an application number
Stored against the submitted snapshot
Exception. The portal times out after Submit: the account is checked first, so the application is not filed twice.
Exception. The partner's passport line still shows 're-upload needed': the partner's filing waits; the agent asks for a new scan.
Exception. Staff note 'police certificate not supplied yet': the line stays open and only that filing waits. If the specialist-confirmed checklist rule allows an alternative document, staff record the alternative with the rule and its evidence, and the line is resolved.
All signatures are in.
Authorised submitter; fee payer identified.
A person submits and pays; never the product.
Receipt stored against the submitted package.
An uncertain outcome (the portal timed out after Submit) is checked on the account before any retry. A time-sensitive check that blocks just before submission returns the case to 8.1. A required document line still open: that filing waits for accepted evidence or an authorised disposition; a recorded reason alone does not release it.
Normal: The submitted package is stored unchanged.
Alternate: A timed-out submission is never filed twice.
Application (message to the government)
The case waits for government messages.
Submit through the government route
Pay the fee
Proposal An uncertain submission outcome is reconciled before any retry
Proposal Time-sensitive checks (3.8) run again just before submission
Proposal The submitted package is kept unchanged
Proposal Every required document line of this filing is resolved: either evidence is accepted for it (right document, person and date, accepted by the agent, by reading or by looking at it when reading fails), or it has an authorised disposition the applicable checklist or rule permits (an alternative document or an exception the specialist has confirmed), recorded by authorised staff with that rule and its evidence
Proposal A recorded reason explains a gap; it never clears a required document line by itself. An answered question never stands in for a required document. Only the dependent filing waits; expiry still only warns; the representative's approval still applies
Proposal Before submission, each copy's form edition is checked as still accepted on that date; after a government cut-off the copy is blocked until the case adopts the new version (10.3)

## 9.6 Record each government message
9.6
Record each government message
Agent · View 6: Sign, submit and record the response
Screen: Case › Government messages proposed
Acknowledgement, biometrics request, request for documents or decision
Record it against the submitted package; turn a request into an agent request
Case record or assigned follow-up
Agent; the case ends when every filing is decided
What the person does. Records the message and assigns any follow-up.
Messages (Example)
Message	Recorded as	Then
Acknowledgement	receipt on the submitted package	wait
Biometrics request	task with its deadline	wait
Request for proof of funds	agent request on the case	wait
Request for an extra form for Client A	agent request: completed by hand, uploaded as a case document	wait
Decision	outcome per applicant	that filing ends; the case ends when every filing is decided
Two filings on one case (Example: an illustrative case with two applicants; whether a partner files separately depends on the route)
When	Client A's filing	Partner's filing	Case
Week 1	every copy approved, signed and submitted	one copy still being prepared	open
Week 2	waiting for the government	every copy approved; the partner signs; submitted	open
Later	decision recorded: this filing ends	still waiting for the government	open: one filing pending
Later still	decided	decision recorded	closes: every filing decided
A government message arrives.
Submission reference known.
Records external evidence; the product does not control government processing.
Message stored on the right case and package.
A request for documents becomes an agent request on the case; then the case waits again.
Normal: An acknowledgement is stored against the submitted snapshot.
Alternate: A decision is recorded per applicant.
Government message
Follow-up assigned; or that applicant's filing is decided, and the case closes when every filing is decided.
Record each message against the submitted package
Assign later requests to the right staff owner
Proposal Approval readiness, signing, submission and responses apply to each filing on its own; the case groups their outcomes. A filing still being prepared does not hold another filing unless the route requires joint submission (the specialist confirms which)
Proposal Each government step on the row has its deadline rule and usual timeline
Proposal A request for more documents becomes an agent request on the case, never a rule
Founder decision A form an officer requests for one applicant is an agent request: staff complete it by hand in their existing process and upload it as a case document; a recurring gap is reported to Expat Ready's support
Proposal Government processing is outside the product; submitted evidence is never rewritten
Proposal A decision closes only that applicant's filing; the case stays open while another filing is pending
A refusal ends or re-routes the journey as the route defines

## 10.1 Watch for change
10.1
Watch for change
Platform · View 7: Watch, triage, release and adopt a change
Screen: Change watch (scheduled job) › Impact list proposed
Official form pages, guides, eligibility pages, captured screens
Re-read, fingerprint and compare; trace what depends on each change
Change draft and impact list (combinations and open cases)
Content publisher (10.2)
A new edition of the family-information form (Example)
Reused	Rechecked	Goes stale
every mapping whose field did not change	4 changed fields, and 1 rule that reads one of them	Client A's approved family-information copy, once the case adopts
Exception. The government sets a cut-off date: adoption becomes required after it.
Scheduled check.
Registered sources with their previous versions.
Reads Configuration library, Released combination package · updates Configuration library
Detects and proposes; never changes a released package or an open case.
Every affected item, combination and open case listed.
A source cannot be reached: status 'not verified', never 'no change'.
Normal: A guide-only change produces an impact review even when no form field changed.
Alternate: Unchanged fields keep their mappings after a dependency check.
Change draft and impact list
Review covers changed items only.
Re-read official form pages, guides, eligibility pages and portal screens on a schedule
Fingerprint and compare
Re-run the form-edition pipeline on changed fields only; list affected combinations and open cases
Proposal Unchanged fields keep their mappings and approvals, after a dependency check
Proposal Only changed or new items enter review
Proposal A guide or rule change can affect an unchanged form field
Proposal A cut-off date from the government makes adoption required after it
Proposal A failed source check is 'not verified', never 'no change'
A new edition is a different form in all but name: treated as new; full review

## 10.2 Re-run and release the change
10.2
Re-run and release the change
Content publisher · View 7: Watch, triage, release and adopt a change
Screen: Review workbench › Changes · Release proposed
Change draft or triaged support report, with its impact list
Run views 1 to 3 on the changed items only: read, draft, check, review, specialist, release
New released version
Firms' open cases (adoption, 10.3)
What the person does. The publisher reviews changed items beside old and new source; the specialist confirms changed rules; a second person releases.
No separate example: It runs views 1 to 3 on the changed items only; their examples apply.
The change watch found a change (10.1), or a support report was triaged as a new form, a new edition or a wrong mapping (10.4).
Affected items and dependencies identified; a new edition is in the form library.
Reads Configuration library, Review and approval records · updates Released combination package, Review and approval records
Same two-person path as a first release.
New version released with its difference report.
Rejected: back to review with the reason.
Normal: Approved unchanged items are not reviewed again.
Alternate: Every changed field, rule and document is named in the difference report.
Open cases can see what changes for them.
Read and draft the changed items only (a new edition goes through 2.1, 3.1 and 3.2)
Review changed items beside old and new source
Second person releases
Proposal Same two-person path as a first release
Proposal The difference report names every changed field, rule and document
Founder decision Changed items are reviewed; approved unchanged items are reused
Founder decision A new form or edition is a form-edition path through reading, drafting, checks and release; it does not create a combination row
A changed field has no fit: proposed as new field, reviewed

## 10.3 Adopt the change on an open case
10.3
Adopt the change on an open case
Agent · View 7: Watch, triage, release and adopt a change
Screen: Case › 'What changes for this file' proposed
New released version that affects Client A's case
See what changes for this file; adopt now, or at the cut-off
Case on the new version; affected copies re-rendered
Agent and representative (copies again)
What the person does. Reads 'what changes for this file' and adopts now or at the cut-off; the deferral is recorded.
Client A's case (Example)
Copy	Before	After adoption
Family-information form	approved on version 1	re-rendered on version 2; approval withdrawn; approved again
IMM 1295	approved on version 1	unchanged; approval kept
Exception. A new rule needs a fact Client A never gave: the SQR re-opens that one question.
A released change affects this open case.
Old and new difference for the case is available.
Reads Released combination package, Facts per person or organisation · updates Facts per person or organisation, Review and approval records
Authorised staff adopt or record a permitted deferral; filed evidence is never rewritten.
Case pinned to the new version; affected approvals withdrawn.
The client's facts no longer satisfy a new rule: the SQR re-opens the missing questions.
Normal: Adoption re-renders the affected copies and withdraws only their approvals.
Alternate: An already-submitted package is not changed.
Case on the new version
Affected copies go through view 5 again.
See what changes for this file
Adopt now, or at the cut-off
Proposal A case keeps its version until a person adopts
Proposal Adoption re-renders affected forms and withdraws their approvals
Founder decision A newly released mapping (new edition or corrected mapping) reaches the case only through adoption; only the affected copy is prepared again and loses its approval
Proposal A copy waiting for that mapping is replaced by the newly prepared copy
Proposal The agent sees 'what changes for this file' before adopting
The client's facts no longer satisfy a new rule: the SQR re-opens the missing questions

## 10.4 Triage a support report
10.4
Triage a support report
Screen: Support inbox › Report proposed
A firm's support report: a form or edition not yet supported, or a mapping that looks wrong
Confirm what it is; register a new edition, or hold a wrong mapping and list every case that uses it
Triaged report: change to run, or 'mapping stands' answer
Content publisher (10.2), or support answers the firm
What the person does. Reads the report with the copy's evidence; decides new form or edition, wrong mapping, or mapping stands.
A reported wrong mapping (Example)
The agent reports: the partner field on Client A's family-information copy holds Client A's date of birth
Triage confirms the mapping's person is wrong; it is held, and three open cases using that edition are listed
10.2 re-drafts, checks, reviews and releases the corrected mapping
Each listed case adopts it (10.3)
Exception. The report turns out to be a wrong fact, not a wrong mapping: support answers the firm; the agent corrects the fact in 8.1.
A firm contacts Expat Ready's support about a form or a mapping.
The report names the case, the form and the field; the publisher can see the mapping and its evidence.
Reads Configuration library, Released combination package · updates Configuration library, Review and approval records
Expat Ready's content publisher; the firm never edits a mapping.
The report is classified; a wrong mapping is held with its dependents and the list of affected cases.
Mapping stands: support tells the firm, and the agent re-checks the fact.
Normal: A wrong-person mapping on the family-information form is held, and every open case using that edition is listed.
Alternate: A report about a form already supported is answered without any change.
Triaged report and impact list
The change path re-runs only the affected items.
Read the report beside the copy and the mapping's evidence
New form or edition: add it to the form library
Wrong mapping: hold it and its dependents; list every case that uses it
Mapping stands: answer the firm through support
Founder decision Support is the one channel from firms to Expat Ready for forms and mappings; there is no in-product request feature
Founder decision A wrong mapping is held with everything that depends on it; approved, unaffected work stays usable
Proposal A wrong mapping repeats across cases, so every open case using it is listed in the impact report
Proposal No turnaround is promised

## st-1 Gather the official material
Stage 1
Gather the official material
Set up once per combination and form edition · Stages 1–3
Content publisher SUPER ADMIN attaches the sources
Platform reads each new form edition
Receives
A combination to support, or a new form edition, checklist or guide
Does
The content publisher attaches the government's forms, checklist and guide, captures any portal screens, and starts the engine.
Hands over
Each new form edition read once; checklist and guide split into passages
To
AI drafting
A form edition is read once and reused by every combination that uses it
An unreadable source is held; the rest of the run continues
Runs:
once for each new form edition, checklist or guide
Client A's combination (Example)
Work permit from outside Canada
Forms: IMM 1295, IMM 5409, the family-information form; the document checklist; the guide
Each new form edition read once
Before it starts (1)
A combination row exists: Pathway › Program › Category › Sub-category
Founder decision Only Expat Ready's content team runs the engine; firms never run it
Proposal Every source is kept with its version and the date it was read
Proposal An unreadable source is held; the rest of the run continues
Build gap Barcode (XFA) forms are rejected by today's reader; the real read answers the proof question
In the detailed views
Each opens its full activity card here.
Activity 1.1 · Create row, attach sources · Content publisher · view 1
Activity 1.2 · Capture portal screens · Content publisher · view 1
Activity 1.3 · Run the engine · Content publisher · view 1
Activity 2.1 · Read each new form edition · Platform · view 1
Activity 2.2 · Split checklist, guide, criteria · Platform · view 1

## st-2 AI drafts the configuration
Stage 2
AI drafts the configuration
AI drafts the whole setup
Read forms, checklist and guide passages, and the master library
AI drafts the whole setup, reusing library fields and sections and creating new ones only when nothing fits.
A draft: fields, sections, form field mappings, documents, rules, eligibility gates, PQR, SQR, staff view and checks, each citing its source
Checks and reviewers
No manual mapping: AI picks library sections and fields and writes each mapping, citing its source
A new field or section only when nothing in the library fits
Side by side:
field matching and mappings run beside the document list; rules, gates and questionnaires follow
One field (Example)
IMM 5409 asks for the partner's date of birth
AI matches it to the library's 'date of birth' field, person = partner
The mapping cites the form page; a reviewer sees it beside the proposal
Proposal Every item cites file, version, page and field or passage
Proposal A mapping names whose fact fills the field: Client A, the partner or a child
Proposal A form edition's mappings are written once and reused by every combination that uses it
Proposal No AI at fill time: filling later uses these approved mappings
Activity 3.1 · Match fields to canonical fields · AI · view 2
Activity 3.2 · Generate form field mappings · AI · view 2
Activity 3.3 · Build the document list · AI · view 2
Activity 3.4 · Place fields in sections · AI · view 2
Activity 3.5 · Draft conditional rules · AI · view 2
Activity 3.6 · Draft eligibility gates · AI · view 2
Activity 3.7 · Assemble PQR, SQR, staff view · AI · view 2
Activity 3.8 · Draft field and consistency checks · AI · view 2

## st-3 Check, review and release
Stage 3
Check, review and release
Platform checks and tests
AI rechecks meaning
Content publisher SUPER ADMIN reviews
Immigration specialist SUPER ADMIN confirms rules and values
Second publisher SUPER ADMIN releases
The draft, with source snippets and test results
Code checks and tests the draft, AI rechecks mapping meaning, the publisher reviews every new or changed item, the specialist confirms rules and values, and a second person releases.
A released, versioned combination package
Every firm's new cases
Every new or changed item is reviewed beside its source; approved unchanged items are reused
A released version never changes; a change is a new version
code checks and the AI recheck; review starts when both finish
Decision:
Anything blocking or undecided?
No → a second publisher releases
Yes → only the affected items go back to stage 2
Proposal A blocking failure holds the affected items and everything that depends on them, and returns them to drafting
Proposal Near-duplicates, uncertain items and AI disagreements reach the reviewer marked 'decide'; they cannot be released undecided
Proposal AI steps are tested against independently checked expected answers; nothing is measured yet
Proposal A second person releases
Activity 4.1 · Check structure and references · Platform · view 3
Activity 4.2 · Recheck mapping meaning · AI · view 3
Activity 4.3 · Test against expected answers · Platform · view 3
Activity 4.4 · Hold affected items · Platform · view 3
Activity 5.1 · Review new or changed items · Content publisher · view 3
Activity 5.2 · Confirm rules, gates, values · Immigration specialist · view 3
Activity 5.3 · Release the package · Second publisher · view 3

## st-4 Open the case
Stage 4
Open the case
Every case, at a firm · Ways in A–B · stages 4–9
Agent FIRM opens the case and adds the family
Platform applies the release's rules
A resolved client record, new or existing, and the chosen combination
The agent opens the case on the current release and adds family members with their roles; each person is linked to one record.
A case with people, roles, forms and documents
Reuse (stage 5), then the family
The case is pinned to the release that is current when it opens
Each person has one record and one role; names or email never merge people
Before it starts (2)
Identity resolved: a new record, or the existing client's record
A released version exists for the combination
Team requirement An existing client's new service is a new case on the same client record, on the current release; opening it does not alter the earlier case; a later confirmed change to a shared fact follows the affected-case rules (7.1), and submitted copies never change
Exceptions (1)
No released version for the combination: the case cannot open on it; the agent picks another or waits for release
Activity 6.2 · Find possible duplicates · Platform · view 4
Activity 6.3 · Review the lead · Agent · view 4
Activity 7.1 · Open the case, add family · Agent · view 4

## st-5 Reuse confirmed information
Stage 5
Reuse confirmed information
Platform selects by rules, not AI
Each person's shared record: values with source, status, dates and history
The platform pre-fills each required question and form field from the applicable confirmed value, one fact at a time.
Pre-filled questions, and a short list of what is missing, due for 'still true?', to review or in conflict
The family and the agent
Each fact is chosen on its own (same person, meaning and date), never 'copy the latest case'
A newer unconfirmed value waits 'to review'; forms that read it cannot be approved until it is resolved
Team requirement One record per person or organisation inside one firm, shared by all their cases; a case reaches it through the person's resolved identity, never by matching a name or an email
Founder decision Facts belong to the person and are reused across that person's cases inside the same firm only, never across firms; the firm's and the role's permissions apply to every reuse
Team requirement Facts that belong to one application (a job offer, a case-only answer) stay on that case and are never reused as the person's value
Founder decision Household facts (marriage date, children, a shared address) are entered once and linked to both partners; each partner's personal and restricted values stay their own
Team requirement A replaced value is kept as history with its source and dates, never overwritten
Proposal Each required fact is resolved on its own: same person or organisation, same field meaning and purpose, and the right date or context; never by copying the latest case
Proposal The selected value is the current confirmed one: confirmed by a person, with a known source, and not replaced by a later confirmed value
Proposal A later case-open date, upload time or edit time does not by itself make a value more authoritative
Proposal A newer declared or document-read value that differs from a confirmed one waits as 'to review'; it never silently replaces the confirmed value, and until it is resolved the copies that read that fact cannot be approved or submitted
Proposal A value correctly replaced by a later confirmed one is history, not a conflict
Proposal Two current values with no recorded replacement between them (for example after two records are merged) are a conflict: both are shown with their sources and a person confirms one; nothing is guessed
Proposal A question about a past date (an address at an earlier application) is answered from the value true at that date; today's value never replaces it
Founder decision Each field's re-confirmation rule applies on every new case: identity facts are not re-asked unless a new document differs; addresses, jobs and travel are shown pre-filled with 'still true? add anything new'
Team requirement Each case keeps the set of facts it was assessed and filed on; a later change to the shared record never rewrites a submitted copy
Proposal Choosing among values already confirmed is rules, not AI; AI only proposes values read from new documents (7.3)
Activity 7.2 · Answer SQR, upload documents · Client and family · view 4
Activity 8.1 · Confirm every fact once · Agent · view 4

## st-6 Collect and confirm the gaps
Stage 6
Collect and confirm the gaps
Client and family CLIENT PORTAL answer and upload
AI proposes values from documents
Agent FIRM confirms each fact once
Open questions and documents still needed
Each adult answers only what is open and uploads documents; AI proposes values from documents; the agent confirms each fact once.
Form preparation
Only open questions are asked; facts that can change show 'still true?'
A value read by AI stays 'proposed' until the agent confirms it
once for each adult; one reading for each uploaded document
Every fact a form needs confirmed?
Yes → form preparation
No → only the forms that read it wait (missing, 'to review' or in conflict)
The partner's passport (Example)
Uploaded once
The agent confirms it
Passport expires in 70 days: an amber warning, not a block
Proposal An answer supplies the fact, never the document
Proposal A wrong fact found later comes back here; correcting it re-prepares every copy that reads it
Activity 7.3 · Read each uploaded document · AI · view 4

## st-7 Prepare and check each form
Stage 7
Prepare and check each form
Platform fills by rules and reads back
AI flags meaning doubts
Agent FIRM resolves flags
Confirmed facts and the release's form field mappings
Rules fill each form copy, checks run, AI flags meaning doubts, every written value is read back, and the agent resolves what is flagged.
Checked form copies, one for each person who must complete each form
The licensed representative
No AI writes a value; every written value is read back
A form edition not yet supported waits, showing since when; other forms continue
once for each required form copy, side by side
Anything wrong?
Wrong fact → back to stage 6; copies that read it are prepared again
Wrong mapping → support report to Expat Ready (stage 10)
All clear → to the representative
Proposal A blocked item must be resolved and re-checked; it cannot be acknowledged away
Proposal A wrong fact goes back to stage 6; a wrong mapping goes to Expat Ready as a support report
Proposal Refused fields are typed by staff and listed for the representative
Activity 8.2 · Render the copy · Platform · view 5
Activity 8.3 · Check the copy's meaning · AI · view 5
Activity 8.4 · Review statuses and flags · Agent · view 5
Activity 8.5 · Complete the form by hand · Agent · view 5
Activity 9.1 · Fill and read back · Platform · view 5
Activity 9.2 · Resolve read-back, validate · Agent · view 5

## st-8 Approve, sign and submit
Stage 8
Approve, sign and submit
Licensed representative FIRM approves the final file
Client and family CLIENT PORTAL sign and declare
Licensed representative FIRM submits and pays
Each filing's checked copies
The representative approves each final copy, the signatories sign and declare, and the representative submits and pays.
An application filed with the government
The government
A missing required document holds that filing; a recorded reason alone never clears it
Signing keeps the approval only if the signed file matches the approved answers
Per filing:
each applicant's filing moves on its own unless the route requires joint submission (the specialist confirms)
Representative approves the final copy?
Yes → sign, then submit
Returned → back to stage 7 with a reason
Proposal Approval covers the final file or portal screen
Proposal Submission checks the filing's required copies and document lines first (9.5)
Proposal Approvals, signatures and receipts belong to this filing only and are never copied to another case
Activity 9.3 · Approve the copy · Licensed representative · view 5
Activity 9.4 · Sign and declare · Client and family · view 6
Activity 9.5 · Submit and pay · Licensed representative · view 6

## st-9 Record the responses
Stage 9
Record the responses
Government OUTSIDE sends messages
Agent FIRM records each on its filing
The acknowledgement, requests and decision from the government
The agent records each government message on its filing; a request can reopen a fact or ask for a one-off form completed by hand.
Each filing's outcome on the case history
The case: it closes when every filing is decided
A request can reopen a fact (stage 6) or ask for a form completed by hand
Submitted copies are kept exactly as filed
Waits for:
the government's acknowledgement, requests and decision, for each filing
Every filing decided?
Not yet → keep waiting
Yes → the case closes
Activity 9.6 · Record government message · Agent · view 6

## st-10 Find the change
Stage 10
Find the change
When a form, guide or screen changes · Stages 10–12
Platform re-reads sources on a schedule
Content publisher SUPER ADMIN triages firms' support reports
A new form edition, guide or portal screen, or a firm's support report
A scheduled re-read finds what changed and what depends on it; the publisher triages support reports.
A list of changed items and what they affect
The content publisher
A source that cannot be checked is 'not verified', never 'no change'
Support is the firms' one channel for forms and mappings (from stage 7)
Anything changed?
No → nothing happens
Yes → only changed items go forward
Activity 10.1 · Watch for change · Platform · view 7
Activity 10.4 · Triage a support report · Content publisher · view 7

## st-11 Review and release the change
Stage 11
Review and release the change
AI re-drafts changed items
Immigration specialist SUPER ADMIN confirms
The changed items only
The same drafting, checks, review and release as setup run on the changed items.
A new released version
Firms with open cases
The same checks and two-person release as setup
Earlier versions stay unchanged; new cases start on the new one
Activity 10.2 · Re-run and release change · Content publisher · view 7

## st-12 Open cases adopt it
Stage 12
Open cases adopt it
Agent FIRM sees 'what changes for this file' and adopts
'What changes for this file'
The agent adopts the new version on an open case; only affected copies are prepared again, and only their approvals are withdrawn.
The case on the new version
Form preparation (stage 7)
Only affected copies are prepared again, and only their approvals are withdrawn
A government cut-off makes adoption required; submitted copies never change
the agent's adoption; the case keeps its version until then
Does it affect this open case?
Yes → adopt now, or by the cut-off
No → nothing changes
Activity 10.3 · Adopt on this case · Agent · view 7

## st-A New client
Way in A
New client
Client and family CLIENT PORTAL fills the lead form and PQR
Platform finds possible duplicates
Agent FIRM decides
Fills the firm's lead form and short PQR; the platform looks for possible duplicates; the agent decides 'same person?' and whether the firm takes the case.
A returning person who uses the lead form is matched to their record here
Same person as an existing client?
Yes → link to that record and continue as B
No → a new client record
Firm takes the case?
Yes → open the case
No → lead closed
Activity 6.1 · Lead form and PQR · Client and family · view 4

## st-B Existing client, new service
Way in B
Existing client, new service
Agent FIRM opens a new case from the client's record
The agent opens a new case from the client's record: no new lead, no repeat of the lead form or PQR; only the eligibility questions the new service needs, and the record cannot answer, are asked.
No new lead, and no repeat of the lead form or PQR
Only eligibility questions the new service needs, and the record cannot answer, are asked

## symbols Diagram symbols (BPMN 2.0)
Diagram symbols (BPMN 2.0)
User task
System or AI task
Runs for each item
Calls another view
Decision (one path)
Parallel (all paths)
Inclusive (paths that apply)
Wait for first event
Start · end
Message event
Link to another view
Sequence (same pool)
Message (between pools)
Record (data store)
Reads or writes a record
Content publisher Expat Ready · Super Admin role
Immigration specialist Expat Ready · Super Admin role (proposed)
Second publisher (releaser) Expat Ready · Super Admin: another Content publisher or the Platform Owner
AI in the product drafts, reads documents, checks meaning; never approves
Platform the product's code and rules
Prospect, then client client portal: family members or the employer's signatory
Agent firm staff: Case Manager or Case Officer
Licensed representative firm: RCIC, lawyer or paralegal
Government outside the product
A pool is one process (one run per combination, case or form copy). Sequence lines stay inside a pool; dashed message lines cross between pools; dotted lines read or write a shared record. Every activity has an eye button: click it, or the shape, for its full card. Diagrams are drawn at full size; on a narrow screen each view reads as a list. The form-copy pool is marked ||| because it runs once per copy, side by side; 'every copy of the filing approved' in view 6 stands for the current approvals of all that filing's required copies; a withdrawn or superseded approval does not count.

## actors Who is who
Who is who
Role names follow the team's design: six Expat Ready staff roles in the Super Admin console; firm roles Case Manager and Case Officer; representative types RCIC, lawyer or notary, paralegal. The immigration specialist is not one of today's staff roles: it is proposed.
Actor	Side · product role	Does	Never does
Content publisher	Expat Ready · Super Admin console
Super Admin role (the configurator)	Attaches official sources, runs the engine, reviews every new or changed item beside its source, triages firms' support reports	Releases its own draft; edits a firm's case
Immigration specialist	Expat Ready · Super Admin console
Super Admin role, proposed (the team's documents call this person the SME)	Confirms rules, eligibility gates, documents and values, and signs the expected answers that AI steps are tested against	Releases the package; gives a firm legal advice through the product
Second publisher (releaser)	Expat Ready · Super Admin console
Super Admin: another Content publisher or the Platform Owner, never the drafter	Releases the versioned package (the second person)	Edits what it releases; a fault goes back as a new draft
AI in the product	Inside the product
Steps inside the product; not a user or a role	Drafts the setup, proposes values read from documents, flags meaning doubts	Approves, confirms a fact, releases, or writes a value on a form
Platform	Inside the product
Code and rules; no AI judgement	Reads forms, checks and tests drafts, selects confirmed facts, fills forms and reads every value back	Decides anything a person must decide
Prospect, then client	Client · client portal
The prospect, then the client and family members, or an employer's signatory	Answers the lead form, PQR and SQR, uploads documents, signs and declares their own parts	Confirms a fact for the firm; sees another adult's restricted values
Agent	Firm · agency workspace
Firm role: Case Manager or Case Officer	Reviews leads, opens cases, confirms each fact once, resolves flags, records government messages, adopts new versions	Edits a mapping or the released configuration; approves a copy for filing
Licensed representative	Firm · agency workspace
Firm: an RCIC, lawyer or notary, or paralegal; usually holds the Case Manager role	Approves each final copy, submits and arranges payment	Signs for the client
Government	Outside the product
For example the immigration department that receives the forms	Receives the application; sends acknowledgements, requests and decisions	Is controlled by the product
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
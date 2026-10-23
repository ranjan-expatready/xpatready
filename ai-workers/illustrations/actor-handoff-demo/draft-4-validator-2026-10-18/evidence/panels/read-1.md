## 1.1 Create the configurator row and attach its sources
Activity 1.1
Create the configurator row and attach its sources
Person step · View 1: Start and read
Screen: Content Pack Configurator › Configurator row in the team's design
WHAT THIS ACHIEVES

Sets up one row for the combination with every official source it needs, so the engine reads a fixed, fingerprinted source set.

WHO ACTS

Content publisher SUPER ADMIN
Expat Ready · Super Admin role

Authority. Content publisher at Expat Ready. May edit a draft row; cannot publish their own draft. Firms have no access.

BEFORE IT STARTS
Starts when
A new combination is needed. (A new form or edition, or a reported wrong mapping, goes through the change path, 10.4 and 10.2, not a new row.)
Needs
The combination exists in the programme hierarchy; the required source set is known: form editions, document checklist, instruction guide, eligibility page.
Works on
Combination chosen in the programme hierarchy; official checklist, guide and eligibility page
HOW IT WORKS

Picks the combination, selects base forms and base documents, and attaches the official sources.

Pick Pathway › Program › Category › Sub-category
Select base forms from the form library (upload the official PDF if an edition is missing)
Select base documents, or accept the engine's suggestions read from the checklist
Upload the official document checklist PDF; link the instruction guide and the eligibility page
RESULT AND WHAT HAPPENS NEXT
Produces
Draft row with a fingerprinted source set
Next
Content publisher (portal decision, then Run)
Then: The run can start once the portal decision is made.
Done when
At least one form edition or a checklist attached; every source fingerprinted with the date read.
If not
Combination missing from the tree: add it to the tree first. A required source missing: a named blocker before Run.
Rules and exceptions (7)
Proposed here One row per full combination; nothing attaches above a full combination
Founder decision A person enters base forms and base documents only; conditional forms, documents and fields are drafted by the engine
Proposed here Every source gets a file fingerprint and a date read
Proposed here A row cannot run without at least one form edition or a checklist
Founder decision Firms do not create rows or request them in the product
Founder decision There is no feature for a firm to add a form to a case; new forms and editions reach cases through Expat Ready's change watch or a firm's support ticket, then publishing and adoption

EXCEPTIONS

The combination is missing from the programme hierarchy: it is added to the tree first
Example · Client A
Source set for Client A's combination (Example)
Source	Entered as	Recorded
Application form IMM 1295 (barcode form)	base form	file fingerprint, read 17 Oct 2026
Family-information form (IMM 5707 or IMM 5645, pending the SME)	base form	file fingerprint, read 17 Oct 2026
Representative form IMM 5476	base form	file fingerprint, read 17 Oct 2026
Document checklist IMM 5488	checklist	file fingerprint, read 17 Oct 2026
Instruction guide IMM 5487 and the eligibility page	guide and criteria	link, fingerprint, read 17 Oct 2026

Exception. The common-law declaration (IMM 5409) is not entered here. It is conditional: the engine drafts the rule that adds it in 3.5 from the guide, and reads and maps it in the same run.

Immigration conditions, forms and values shown are examples, pending the Immigration SME.

Acceptance checks (2)
Normal case. The example row saves with its three base forms, the checklist, the guide and the eligibility page, each with a fingerprint and date.
Alternate case. Starting a run with no form edition and no checklist is refused, naming what is missing.
Sources and detail
Record handed over	Draft row and its source set
Records read · updated	Reads Library · updates Library
Content publisher role; second person publishes	SA-01B v1.4 change log
Row points at the form, not the edition	SA-1B-26

## 1.2 Capture portal screens
Activity 1.2
Capture portal screens
Person step · View 1: Start and read
Screen: Portal capture (browser extension, Expat Ready test account) proposed
WHAT THIS ACHIEVES

Records each government portal screen and every answer branch, so portal filing is set up like a form; only for combinations filed through portal screens.

WHO ACTS

Content publisher SUPER ADMIN
Expat Ready · Super Admin role

Authority. May capture permitted test screens only: no submission, no client file.

BEFORE IT STARTS
Starts when
Only when the combination is filed through portal screens (gateway after 1.1); otherwise skipped.
Needs
An authorised test route exists; the portal's terms of use have been checked (legal: unconfirmed, no counsel).
Works on
Authorised test session on the government portal
HOW IT WORKS

Walks through each screen and each answer branch in Expat Ready's test session.

Open each portal screen of the filing in a test session
The extension records each screen's fields, labels, types, options, order and a screen fingerprint
Not built yet in today's code.
Portal capture and portal filling are not built. Proof question: can the extension capture every branch of a screen, within the portal's terms? Fallback: staff type the screen by hand (8.5).
Code references: Sources and detail, below.
RESULT AND WHAT HAPPENS NEXT
Produces
Versioned portal screen field list; uncaptured branches listed
Next
Content publisher, to start the run (1.3).
Then: The run treats each screen version like a form edition.
Done when
Every screen of the filing captured, or each uncaptured branch listed as not supported.
If not
A screen depends on earlier answers: each branch is captured; an uncaptured branch is listed and never filled.
Rules and exceptions (4)
Proposed here Capture runs only in Expat Ready's test session, never on a client's file
Proposed here Each captured screen is a portal screen edition and goes through the same read, build and check as a form edition
Proposed here A portal is switched on only after its terms of use are checked (legal: unconfirmed, no counsel)
Proposed here Capture does not imply permission to automate a portal
Example · Client A
One portal screen (Example)
Screen 'Personal details' opened in the test account
Fields, labels, options and order recorded, with a fingerprint
Saved as screen version 1

Exception. Answering 'yes' to 'Have you been married before?' opens a 'Previous partner' block. If that branch is not captured, it is listed as not supported and never filled.

Immigration conditions, forms and values shown are examples, pending the Immigration SME.

Acceptance checks (2)
Normal case. Re-capturing an unchanged screen gives the same fingerprint and no new version.
Alternate case. A branch that was not captured shows as not supported; filling never types into it.
Sources and detail
Record handed over	Portal screen versions
Records read · updated	Reads Library · updates Library
Build gap	Portal capture and portal filling are not built. Proof question: can the extension capture every branch of a screen, within the portal's terms? Fallback: staff type the screen by hand (8.5). (No match in the capture)

## 1.3 Run the engine
Activity 1.3
Run the engine
Person step · View 1: Start and read
Screen: Content Pack Configurator › Configurator row › Draft run proposed
WHAT THIS ACHIEVES

Starts a registered draft run on the row's sources; the run drafts, it never publishes.

WHO ACTS

Content publisher SUPER ADMIN
Expat Ready · Super Admin role

Authority. May start draft jobs only; the AI has no publishing authority.

BEFORE IT STARTS
Starts when
The publisher selects Run.
Needs
Row ready (1.1); portal screens captured if the combination is filed through portal screens (1.2); no other run active on this row.
Works on
Ready draft row, captured screens if any
HOW IT WORKS

Starts the run and watches its status. Results are not edited here.

Choose a full run or a run on changed sources only
Watch the run status: read, build, check
RESULT AND WHAT HAPPENS NEXT
Produces
Run in progress with a status per stage: read, draft, check
Next
Reading (2.1 and 2.2, the platform).
Then: Reading starts for whatever is new.
Done when
Run registered with source fingerprints, model version and prompt version.
If not
A source cannot be opened: that source is held and named for the publisher; the rest of the run continues.
Rules and exceptions (7)
Proposed here A run writes only to a draft; it never touches a published version
Proposed here Each run logs its sources, model version and prompt version
Proposed here A change of AI model or prompt for any AI step is a change: the step is re-run against the expected answers before use, and the result is recorded
Proposed here One run at a time per row; a new run supersedes an unreviewed draft
Proposed here A form edition's run is shared: a second row that needs the same edition reuses that run; two proposals of one new field meet as a near-duplicate in review (5.1)
Proposed here If AI is unavailable or a reading is unresolved, the draft is kept and the blocker named
Proposed here One generation workflow: a reviewer's correction feeds the next run; there is no second, manual authoring mode
Example · Client A
Full run or changed-only run (Example)
Choice	When	What is read and drafted again
Full run	a new configurator row	every attached source
Changed sources only	a new edition of one form arrives	that edition and what depends on it; approved unchanged items are reused
Acceptance checks (2)
Normal case. Starting the same run twice does not create two active runs.
Alternate case. A new run on a row with an unreviewed draft supersedes it; the superseded draft is kept and marked.
Sources and detail
Record handed over	Run request with its library snapshot
Records read · updated	Reads Library · updates Library

## 2.1 Read each new form edition
Activity 2.1
Read each new form edition
Automatic step · View 1: Start and read · Runs for each form edition not yet read
Screen: Form edition › Fields (job result) proposed
WHAT THIS ACHIEVES

Turns each new form edition into a complete list of its fields and form logic, read once and reused by every combination that uses it.

WHO ACTS

Platform
the product's code and rules

Authority. May read sources and write extraction records to the draft only.

BEFORE IT STARTS
Starts when
The run finds a form edition with no inventory: a base form of the row, or a form a drafted rule adds (3.5). If every edition was read before, this step completes at once.
Needs
The edition is identified by form number, edition date and file hash; the reader supports the format.
Works on
IMM 1295 PDF, not yet read (Example)
HOW IT WORKS
For each form edition not yet read: extract every field with internal name, printed label, type, maximum length, options, required flag, page, position and reading order
For barcode (XFA) forms: read the template and every show, hide and calculate script
Check that every widget on every page belongs to a read field
Not built yet in today's code.
Today's reader reads standard fillable PDFs and rejects barcode (XFA) forms
Code references: Sources and detail, below.
RESULT AND WHAT HAPPENS NEXT
Produces
Field inventory and form logic list for that edition
Next
Field matching (3.1, AI).
Then: Drafting starts when every active reading branch has finished.
Done when
Every widget on every page belongs to a read field; unread regions are named. For barcode (XFA) forms, how completeness is checked is for the team to confirm.
If not
An unreadable part holds that edition and is named; other editions and sources continue.
Rules and exceptions (7)
Proposed here A form edition is read once and shared by every combination that uses it
Proposed here The edition is identified by form number, edition date and file hash
Proposed here A fillable PDF publishes no independent field count, so completeness is checked page by page: every widget belongs to a read field, and unread regions are named
Proposed here An unreadable part is named, never skipped
Proposed here Each form script becomes a candidate rule with the script as its source
Proposed here The form's own headings are kept as read-only data on the inventory, for the form check view

EXCEPTIONS

An unreadable region: the edition is held and flagged for a person; other editions continue
Example · Client A
Rows of an inventory (Example: real internal names come from the real read)
Printed label	Heading on the form	Type	Kept with it
Family name	Personal details	text	length limit read from the file
Date of birth	Personal details	date	format read from the file
Current marital status	Personal details	choice	options as printed

Exception. A form script shows the partner block when marital status is common-law. It is kept as a candidate rule, with the script as its source, for 3.5.

Acceptance checks (2)
Normal case. Every widget on each page of the example edition belongs to a read field.
Alternate case. A page region the reader cannot parse is listed with its page; the edition cannot be marked read.
Sources and detail
Record handed over	Field inventory and logic list per edition
Records read · updated	Reads Library · updates Library
Build gap	Barcode (XFA) forms are rejected by the reader. Proof question for the team: can code write the form's own data, and does Validate then make the barcodes? The planned real read does not answer it: it reads each form's fields and measures matching only. Fallback: the data-file import route, else typed by hand. (apps/api/src/pack-authoring/pdf-acroform-inventory.ts:141-143)

## 2.2 Split the checklist, the guide and the eligibility page
Activity 2.2
Split the checklist, the guide and the eligibility page
Automatic step · View 1: Start and read
Screen: Row › Sources (job result) proposed
WHAT THIS ACHIEVES

Breaks the checklist, guide and eligibility page into small passages, unchanged and linked to their page, that drafting can cite.

WHO ACTS

Platform
the product's code and rules

Authority. May extract source text; does not decide what a passage means.

BEFORE IT STARTS
Starts when
The run includes a checklist, guide or eligibility page that is new or changed.
Needs
Readable text, or a supported OCR path for a scanned PDF.
Works on
Checklist IMM 5488, guide IMM 5487, eligibility page (Example)
HOW IT WORKS

Split into source checklist entries, condition passages and criterion sentences

Checklist PDF into items: document name, who provides it, any 'if applicable' note
Guide into passages that say who must complete what, and when ('fill out only if…')
Eligibility page into criterion sentences
RESULT AND WHAT HAPPENS NEXT
Produces
Sourced items and passages, source text unchanged
Next
Drafting of the document list, rules and gates (3.3, 3.5, 3.6; AI).
Then: Drafting starts when every active reading branch has finished.
Done when
Every item and passage links to its page or heading.
If not
A scanned PDF without text goes through OCR; if still unreadable, that source is held and named, and the drafting that depends on it waits.
Rules and exceptions (4)
Proposed here Every item and passage keeps its page or heading
Proposed here Nothing is paraphrased at this stage; the source text is stored
Proposed here AI is used only to untangle a messy layout; its output is still the source text, checked by a text match
Proposed here Matching OCR text does not prove the source was understood; meaning is reviewed later
Example · Client A
Three kinds of item (Example)
Source text	Kind	Used in
'Proof of relationship, if applicable'	source checklist entry with an 'if applicable' note	3.3 document list
'Fill out only if you are in a common-law relationship'	condition passage	3.5 rules
'Show that you will leave Canada at the end of your stay'	criterion sentence	3.6 gates

Immigration conditions, forms and values shown are examples, pending the Immigration SME.

Acceptance checks (2)
Normal case. Each source checklist entry links to its page.
Alternate case. A passage split across two pages stays one passage with both page references.
Sources and detail
Record handed over	Source checklist entries, condition passages, criterion sentences
Records read · updated	Reads Library · updates Library

## 3.1 Match each field to a canonical field, or propose a new one
Activity 3.1
Match each field to a canonical field, or propose a new one
Automatic step · View 2: AI drafts the setup · Runs for each new form edition or screen version
Runs automatically. Results appear in the review workbench (5.1), beside their source.
WHAT THIS ACHIEVES

Gives each form field one library meaning (a canonical field), reusing an existing one wherever it fits.

WHO ACTS

AI in the product
drafts, reads documents, checks meaning; never approves

Authority. Drafts only.

Checked by. Every new match is reviewed by the content publisher (5.1).

BEFORE IT STARTS
Starts when
Field inventories are ready.
Needs
Library meanings and approved labels are available.
Works on
Field 'Date of birth' under 'Spouse/common-law partner' (Example)
HOW IT WORKS
Rule match first: a label approved before, in the same context, matches without AI
Otherwise AI proposes the closest existing field with a confidence and a one-line reason
If nothing fits, AI proposes a new field: type, validation, whether it is about a person or an organisation, lifecycle tier, plain meaning
RESULT AND WHAT HAPPENS NEXT
Produces
Match: canonical field 'Date of birth', with reason and evidence
Next
Mapping (3.2, AI).
Then: Mappings can be drafted for every matched field.
Done when
Every field has a match, a new-field proposal or an explicit 'not a fact' mark (for example 'for office use only').
If not
A near-duplicate field is marked 'decide' and goes on to review (5.1); it cannot be published until a person merges or decides it.
Rules and exceptions (6)
Proposed here Context means the form section and whose fact: 'Family name' under the spouse heading resolves to the one 'Family name' definition, and its mapping (3.2) records that the value is the partner's, never the applicant's
Proposed here A new field is proposed only when no existing field fits; a near-duplicate is marked 'decide' and cannot be published until a person merges or decides it in 5.1
Proposed here A canonical field's meaning stays separate from one form's limits: a form's length or format limit is kept on that form's mapping (3.2)
Proposed here Every proposal cites the field and page; during initial validation every new match is reviewed whatever its confidence; low confidence marks it for closer review
Proposed here Runs per form edition, once, shared by every combination

EXCEPTIONS

Two fields on one form map to the same canonical field for the same person: flagged as a possible purpose split (home versus mailing address)
Example · Client A
One definition, three values (Example)
Canonical field	Person	Value
Date of birth	Client A	12 Apr 1990
Date of birth	Client A's partner	3 Sep 1991
Date of birth	Client A's child	20 Jan 2017

Exception. The family-information form allows a fixed number of characters for the date. That limit is kept on the form's mapping, not on the 'Date of birth' definition, so other forms are not affected.

Acceptance checks (2)
Normal case. A partner-name field resolves to the name definition; its mapping (3.2) takes the partner's value, never Client A's.
Alternate case. Two fields for the same person map to the same canonical field: flagged as a possible purpose split (lives here now, send post here).
Sources and detail
Record handed over	Matches and new-field proposals
Records read · updated	Reads Library · updates Library
Screen	None: it runs in the background
Every question is one canonical field	SA-1B-1

## 3.2 Generate form field maps
Activity 3.2
Generate form field maps
Automatic step · View 2: AI drafts the setup · Runs for each new form edition or screen version
Runs automatically. Results appear in the review workbench (5.1), beside their source.
WHAT THIS ACHIEVES

Records for each form field whose fact fills it and how, so forms are later filled by rules with no manual mapping.

WHO ACTS

AI in the product
drafts, reads documents, checks meaning; never approves

Authority. Drafts mappings only; never publishes.

Checked by. Every new or changed mapping is reviewed by the content publisher (5.1), beside its source.

BEFORE IT STARTS
Starts when
Field matches are available.
Needs
Each field's heading and page are known, so the person it is about can be resolved.
Works on
Matched fields of the family-information form (Example)
HOW IT WORKS
For each field: the source person or organisation, the relationship to the form's applicant (self, partner, child 1), canonical field, purpose or time, target field, format, conditions and repeated row
Map each answer-list entry to the form's own option text
Mark fields no client fact supplies with their 'collected from' source (staff working view or a profile record)
Not built yet in today's code.
Today's map entry holds only the canonical field, the form field and a transform; it has no person, relationship, purpose or row
Code references: Sources and detail, below.
RESULT AND WHAT HAPPENS NEXT
Produces
Reusable form field map for that form edition, every entry a draft
Next
Section placement (3.4, AI); reviewed in 5.1.
Then: Every combination that uses this edition can reference the set.
Done when
Every field has a mapping (its person may be a profile record, such as the selected representative) or an explicit 'not filled' mark.
If not
A field whose person or meaning cannot be read from label and heading is marked uncertain with the page snippet.
Rules and exceptions (6)
Founder decision One form field map per form edition or portal screen version; every combination that uses that edition reuses it
Founder decision Mappings exist as data because filling needs them; the AI writes them; during initial validation a person reviews every new or changed entry; approved unchanged entries are reused
Founder decision Reusing a definition never merges different people's values
Proposed here An answer-list miss is refused, never guessed
Proposed here Overflow is a continuation sheet or a flag, never silent truncation
Team requirement Mappings reference the field and purpose, never a questionnaire section, so moving a section cannot break a form
Example · Client A
Same label, three people (Example)
Form field label	Person (relative to the form's applicant)
Date of birth	the form's applicant: Client A

Heading on the form: Applicant
Canonical field: Date of birth
Format: the form's date format

Date of birth	the form's applicant's partner

Heading on the form: Spouse/common-law partner
Canonical field: Date of birth
Format: the form's date format

Date of birth (row 1)	the form's applicant's child, row 1

Heading on the form: Children
Canonical field: Date of birth
Format: the form's date format
One form field map, many combinations (Example)
Combination	Family-information form edition	Mapping
Work permit, outside Canada	same edition	reused
Study permit, outside Canada	same edition	reused
Visitor visa	same edition	reused

Exception. What needs a new mapping: a new form edition, or a field whose meaning differs. The same 'Date of birth' label under an unclear heading is marked uncertain and reviewed.

Immigration conditions, forms and values shown are examples, pending the Immigration SME.

Acceptance checks (2)
Normal case. The partner's date of birth fills both the partner field on Client A's form and the applicant field on the partner's own form, from one verified value.
Alternate case. An answer-list entry with no matching form option is refused, never guessed.
Sources and detail
Record handed over	Mapping set per form edition or screen version
Records read · updated	Reads Library · updates Library
Screen	None: it runs in the background
Box map: purpose plus field, transform, value map, overflow	SA-1B-27
Forms reference a purpose, never a section	SA-1B-12
AI may draft and diff box maps; a person approves	SA-1B-33
Build gap	A map entry holds only the canonical field, the form field and a transform: no person, relationship, purpose or repeated row. (packages/contracts/src/schemas/spine-masters.ts:169-175)

## 3.3 Build the document list
Activity 3.3
Build the document list
Automatic step · View 2: AI drafts the setup
Runs automatically. Results appear in the review workbench (5.1, 5.2), beside their source.
WHAT THIS ACHIEVES

Turns the checklist into document requirement lines: which document, who provides it, and when it applies.

WHO ACTS

AI in the product
drafts, reads documents, checks meaning; never approves

Authority. Drafts document requirement lines; never invents immigration values.

Checked by. Reviewed by the content publisher (5.1); document conditions are signed off by the Immigration SME (5.2).

BEFORE IT STARTS
Starts when
The source checklist entries are split into passages (2.2).
Needs
Document-type library and person roles are available.
Works on
Source checklist entry 'Proof of relationship, if applicable' (Example)
HOW IT WORKS
Each source checklist entry becomes a document requirement line linked to a reused or proposed document type
Set who provides it (client, employer, government) and whether it is base or conditional, per person and role
RESULT AND WHAT HAPPENS NEXT
Produces
Document requirement lines, base and conditional
Next
Rule drafting (3.5, AI), once every drafting branch is ready.
Then: Rules can reference the lines; on a case each becomes a checklist item.
Done when
Every source checklist entry is linked to a document requirement line or explicitly dismissed with a reason.
If not
An item naming a document type the library lacks: proposed as new, always reviewed.
Rules and exceptions (5)
Proposed here A document type is reused where one exists; a new one is proposed only when none fits
Proposed here Base or conditional is per person: a document that is base for the principal can be conditional for a spouse or child
Proposed here An 'if applicable' note becomes a drafted condition with the note as its source
Proposed here One upload serves every person it applies to, after an identity and applicability check

EXCEPTIONS

A source checklist entry names no document type we know: proposed as new, always reviewed
Example · Client A
Document requirement lines (Example)
Source checklist entry	Document type	Provided by	Base or conditional
Passport	Passport	each applicant	base
Proof of relationship, if applicable	Proof of cohabitation	Client A and partner	conditional: common-law (rule drafted in 3.5)

Exception. One lease proves cohabitation for both partners: it is uploaded once and linked to both, after a check that both names appear on it.

Immigration conditions, forms and values shown are examples, pending the Immigration SME.

Acceptance checks (2)
Normal case. A conditional line names whose document it is and keeps its source.
Alternate case. An item with no known type appears as a proposed new type in 5.1.
Sources and detail
Record handed over	Document requirement lines
Records read · updated	Reads Library · updates Library
Screen	None: it runs in the background

## 3.4 Place fields in sections and draft where each value comes from
Activity 3.4
Place fields in sections and draft where each value comes from
Automatic step · View 2: AI drafts the setup
Runs automatically. Results appear in the review workbench (5.1), beside their source.
WHAT THIS ACHIEVES

Places the combination's fields in reusable library sections and records where each value is collected from.

WHO ACTS

AI in the product
drafts, reads documents, checks meaning; never approves

Authority. Drafts placements only.

Checked by. Reviewed by the content publisher (5.1); a new section is approved once.

BEFORE IT STARTS
Starts when
Fields and mappings are drafted.
Needs
The library's sections and placement rules are available.
Works on
Canonical fields the combination needs; the library's sections
HOW IT WORKS
Select suitable library sections and their canonical fields for the combination
Propose a new library section only when none fits
Draft each placement's 'collected from' setting: client questionnaire, staff working view, a profile record, or a verified document or existing record
Not built yet in today's code.
Placements and 'collected from' are not built today
Code references: Sources and detail, below.
RESULT AND WHAT HAPPENS NEXT
Produces
Placements, 'collected from' settings, proposed new sections
Next
Rule drafting (3.5, AI), once every drafting branch is ready.
Then: Views can be assembled.
Done when
Every field the combination needs is placed, with a 'collected from' setting.
If not
A field that fits two sections: both proposed with reasons; a person picks once.
Rules and exceptions (6)
Proposed here Sections are selected from the library's sections the engine maintains; a new section needs a person's approval once
Proposed here A field whose placement and 'collected from' setting are already approved in the library is placed by rule; AI is asked only for fields with no approved placement
Team requirement Reuse the existing section for the same meaning; a field group may sit in different sections on different rows (a child's date of birth sits under 'Family member')
Team requirement A placement never changes a group's fields, checks or purposes
Team requirement Publishing blocks a placement that hides a field a form or a rule reads
Founder decision Lifecycle tier (lead, prospect, case), 'collected from' and visibility are three separate settings on one shared value
Example · Client A
Sections × combinations (Example)
Section	Work permit, outside Canada	Study permit, outside Canada	Visitor visa
Personal details	✓ reused	✓ reused	✓ reused
Common-law relationship	✓ proposed new	✓ proposed new	✓ proposed new
Employment	✓ reused		
Children	✓ reused	✓ reused	✓ reused

Exception. No 'Common-law relationship' section exists yet. It is proposed as new and waits for review in 5.1; nothing uses it until it is approved.

Immigration conditions, forms and values shown are examples, pending the Immigration SME.

Acceptance checks (2)
Normal case. An approved field appears in its usual section on every combination that uses it.
Alternate case. Hiding a field that a form or rule reads is blocked at publishing.
Sources and detail
Record handed over	Placements and 'collected from' settings
Records read · updated	Reads Library · updates Library
Screen	None: it runs in the background
Sections are reusable sets	SA-1B-13
Placement limits	SA-1B-7, SA-1B-8
Publishing blocks hiding a read field	SA-1B-9
Build gap	No field-level tier flag and no 'collected from' setting; the code has per-programme question-set section selections with a marked PQR subset. (spine-masters.ts (SqrSectionSelection.pqrCanonicalFieldKeys))
Build gap	Placements are not built. (Team design SA-01B §12)

## 3.5 Draft the conditional rules
Activity 3.5
Draft the conditional rules
Automatic step · View 2: AI drafts the setup
Runs automatically. Results appear in the review workbench (5.2), beside their source.
WHAT THIS ACHIEVES

Turns conditional wording in forms and the guide into rules that add fields, documents or forms for the right person.

WHO ACTS

AI in the product
drafts, reads documents, checks meaning; never approves

Authority. Drafts rules only.

Checked by. Signed off by the Immigration SME (5.2), who also decides ambiguous passages.

BEFORE IT STARTS
Starts when
The draft join has finished (fields, mappings, placements and documents ready).
Needs
The product's condition language and the person and role vocabulary are available.
Works on
Guide passage 'Fill out only if you are in a common-law relationship' (Example)
HOW IT WORKS
From form scripts, guide passages and checklist notes draft rules that add fields, documents, forms or repeating blocks
Each rule: when (an answer about a person), then, for whom (once, or each person in a role), why shown, source
RESULT AND WHAT HAPPENS NEXT
Produces
Rule with its source, per person and role
Next
Gate drafting (3.6, AI).
Then: Gates and views can read the rules.
Done when
Every condition passage ends in a rule, a document requirement line, a task or a person's dismissal.
If not
An ambiguous passage is marked uncertain with two readings; the SME decides (5.2).
Rules and exceptions (6)
Proposed here A form a drafted rule adds whose edition has no inventory is read (2.1) and mapped (3.1, 3.2) in the same run, before the checks; a form the guide names that cannot be found is held and named for the publisher
Proposed here Rules are written only in the product's condition language (equals, in, exists, and, or, not) over canonical fields
Proposed here Every conditional passage ends in exactly one of: a rule, a document requirement line, a task, or a person's explicit dismissal; none is left open
Proposed here A passage that depends on an officer's judgement ('if the officer requests') becomes a task, never a rule
Proposed here Each rule shows the client its reason when it fires ('asked because you live common-law')
Proposed here Whether every passage was found is checked independently in 4.3; the AI's own list is not proof
Example · Client A
If / then (Example)
When	Then	For whom	Result
Marital status is common-law	add the statutory declaration of common-law union (IMM 5409) and proof of cohabitation	Client A and partner	form and documents appear, with 'asked because you live common-law'
A child is on the case	add a child block on the family-information form	each child	one block per child

Exception. 'Additional documents may be requested by the officer' depends on a judgement: it becomes a task on the case, never a rule.

Immigration conditions, forms and values shown are examples, pending the Immigration SME.

Acceptance checks (2)
Normal case. A source-backed rule changes the right person's questions, forms and documents in its test family.
Alternate case. A passage that depends on an officer's judgement becomes a task, never a rule.
Sources and detail
Record handed over	Rules with sources
Records read · updated	Reads Library · updates Library
Screen	None: it runs in the background
Condition language, hard and advisory rules	SA-1-16
## 1.1 — Create the configurator row and attach its sources

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

## 1.2 — Capture portal screens

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
Portal capture and portal filling are not built. Proof question: can the extension capture every branch of a screen, within the portal's terms? Fallback: staff type the screen by hand (8.5; proposed, founder to confirm).
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
Build gap	Portal capture and portal filling are not built. Proof question: can the extension capture every branch of a screen, within the portal's terms? Fallback: staff type the screen by hand (8.5; proposed, founder to confirm). (No match in the capture)

## 1.3 — Run the engine

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

## 2.1 — Read each new form edition

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

## 2.2 — Split the checklist, the guide and the eligibility page

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

## 3.1 — Match each field to a canonical field, or propose a new one

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

## 3.2 — Generate form field maps

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

## 3.3 — Build the document list

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

## 3.4 — Place fields in sections and draft where each value comes from

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

## 3.5 — Draft the conditional rules

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

## 3.6 — Draft the eligibility gates

Activity 3.6
Draft the eligibility gates
Automatic step · View 2: AI drafts the setup
Runs automatically. Results appear in the review workbench (5.2), beside their source.
WHAT THIS ACHIEVES

Drafts the yes/no eligibility gates that give a prospect an indicative result.

WHO ACTS

AI in the product
drafts, reads documents, checks meaning; never approves

Authority. Drafts gates and tables; the SME confirms every immigration value.

Checked by. Signed off by the Immigration SME (5.2).

BEFORE IT STARTS
Starts when
Rules are drafted.
Needs
Criterion sources and canonical fields are identified.
Works on
Criterion sentence from the eligibility page (Example)
HOW IT WORKS
From the eligibility page and guide draft the yes/no gates for the combination over canonical fields
Load points grids from the official tables as table rows with their source
RESULT AND WHAT HAPPENS NEXT
Produces
Draft gates and tables, each with source, date checked and next review date
Next
Question-set assembly (3.7, the platform); the Immigration SME signs off the gates in 5.2.
Then: The PQR view can show the gate result and the gap.
Done when
Every gate reads only canonical fields and carries its source and dates.
If not
A gate needs a fact no PQR block asks: a prospect-tier field is proposed for the block.
Rules and exceptions (4)
Proposed here Gates are indicative: they give a PQR result and the gap, never a legal opinion
Proposed here Every gate and grid row carries its official source, the date checked and a next-review date
Founder decision The SME signs off every gate and value before publishing; a gate the SME has not signed off cannot be published

EXCEPTIONS

A criterion needs a value the forms never ask: a prospect-tier field is proposed for the PQR block
Example · Client A
A gate reads facts (Example)
Gate	Reads	Client A's answer	Result
Has a job offer	job offer	yes	met
Passport valid long enough	passport expiry	not answered yet	cannot tell yet (not a fail)

Immigration conditions, forms and values shown are examples, pending the Immigration SME.

Acceptance checks (2)
Normal case. A missing answer gives 'cannot tell yet', never an invented pass or fail.
Alternate case. An unconfirmed gate cannot publish.
Sources and detail
Record handed over	Draft gates and tables
Records read · updated	Reads Library · updates Library
Screen	None: it runs in the background

## 3.7 — Assemble the PQR view, the SQR and the staff working view

Activity 3.7
Assemble the PQR view, the SQR and the staff working view
Automatic step · View 2: AI drafts the setup
Runs automatically, by rules. Results appear in the review workbench (5.1).
WHAT THIS ACHIEVES

Builds the three question sets from one set of definitions: the short PQR, the full SQR and the staff working view.

WHO ACTS

Platform
the product's code and rules

Authority. Assembles view definitions by rules from the drafted placements, conditions, tiers and 'collected from' settings; makes no meaning choice and needs no live client facts.

Checked by. Reviewed by the content publisher (5.1).

BEFORE IT STARTS
Starts when
Gates are drafted.
Needs
Lifecycle tiers and 'collected from' settings are drafted.
Works on
Placements, rules, gates and 'collected from' settings
HOW IT WORKS

Build three views of one set of definitions

PQR: report which country blocks this combination reads and flag gate fields no block asks
SQR: everything that applies to the filing, per person and role, minus what is already known or collected elsewhere
Staff working view: the full set, every tier, by library section
Show each field's allowed values, and each form's character limits from that form's mapping (the definition keeps only its meaning checks); field and consistency checks are drafted in 3.8
Not built yet in today's code.
Today's code has per-programme question-set section selections with a marked PQR subset, and no field-level tier flag or 'collected from' setting
Code references: Sources and detail, below.
RESULT AND WHAT HAPPENS NEXT
Produces
PQR view, SQR definition, staff working view, with validations and limits
Next
Check drafting (3.8, AI).
Then: Check drafting (3.8) starts on the assembled views.
Done when
Every gate field is asked by a PQR block; every SQR question has a reason to be asked.
If not
A gate reads a field no PQR block asks: flagged and returned to AI drafting (3.6) to propose the field for that block; a person approves it (5.1).
Rules and exceptions (5)
Team requirement One PQR per country, in blocks; the combination's PQR is a derived view of the blocks it reads
Proposed here The SQR asks the fewest questions: minus facts already known, minus facts a verified document supplies, minus facts collected from the staff working view or a profile record
Founder decision Facts collected from staff or a profile record (for example the representative's licence number) are never asked of a client; not every application number is one (a previous application number may come from a document or the client)
Team requirement Nothing is asked twice across lead form, PQR and SQR
Proposed here Rules, not AI: assembling the views is a fixed projection of what 3.4 to 3.6 drafted; a placement or 'collected from' setting that is still unresolved goes back to AI drafting (3.4) as a proposal, never decided here
Example · Client A
Where each value comes from (Example)
Fact	Collected from
Representative's licence number	profile record; no client question

Source: the selected representative's profile
Who sees it: staff working view
Form field it fills: the representative form's licence field

Client A's previous application number	document read and verified by the agent, or the SQR

Source: old permit, or Client A's answer
Who sees it: staff; Client A under existing permissions
Form field it fills: the application form's previous-application field

Firm's internal file reference printed on a form	staff working view; left out of client questionnaires

Source: the firm
Who sees it: staff
Form field it fills: the relevant form field

Marital status	PQR; pre-filled, not re-asked, in the SQR

Source: Client A
Who sees it: Client A and staff
Form field it fills: IMM 1295 marital status

Exception. Client A has no old permit to upload, so the SQR asks 'Do you have a previous application number?'. The child's questions go to Client A as the parent; nothing is sent to the child.

Acceptance checks (2)
Normal case. Marital status is asked once in the PQR, pre-filled in the SQR and shown in the staff working view: one stored value.
Alternate case. The representative's licence number never appears in a client questionnaire.
Sources and detail
Record handed over	View definitions
Records read · updated	Reads Library · updates Library
Screen	None: it runs in the background
Rows do not own the PQR; publishing warns when a rule reads a field no block asks	SA-1B-79
Each tier pre-fills the next	SA-1B-83
Build gap	No field-level tier flag and no 'collected from' setting; the code has per-programme question-set section selections with a marked PQR subset. (spine-masters.ts (SqrSectionSelection.pqrCanonicalFieldKeys))

## 3.8 — Draft field and consistency checks

Activity 3.8
Draft field and consistency checks
Automatic step · View 2: AI drafts the setup
Runs automatically. Results appear in the review workbench (5.1, 5.2).
WHAT THIS ACHIEVES

Drafts the checks that catch missing, wrong or inconsistent facts, in the product's existing check kinds.

WHO ACTS

AI in the product
drafts, reads documents, checks meaning; never approves

Authority. Drafts checks only in the product's existing check kinds; never invents an immigration value.

Checked by. Tested in 4.3, reviewed in 5.1; immigration values signed off by the Immigration SME (5.2).

BEFORE IT STARTS
Starts when
Views are assembled (3.7).
Needs
The product's existing check kinds: field limits and patterns, field-group checks, hard and advisory rules, document expiry and what it must outlive, history coverage.
Works on
Fields, documents, rules, the form's own limits and scripts, official programme and document rules
HOW IT WORKS

Draft checks in five groups, each with applicability, inputs, condition, severity, source, timing and the user's action

Form-native checks: the form's own required fields, lengths, formats, options and scripts
Official programme and document rules: what a document must show and outlive, from the checklist and guide
Cross-record consistency: facts checked against each other and against documents (dates in order, addresses agree)
Readiness warnings: warnings that help the agent, such as expiry inside the warning window
Read-back: every written value compared with the value expected after the map entry's transform (run in 9.1)
RESULT AND WHAT HAPPENS NEXT
Produces
Draft check set, each check with its source
Next
Structure checks (4.1, the platform); the Immigration SME signs off immigration values in 5.2.
Then: Checks are tested in 4.3 and reviewed in 5.1 and 5.2.
Done when
Every check states applicability, inputs, condition, severity (block, warn or advise), source, when it runs and what the user does; anything the rule language cannot express is a named gap.
If not
A check the product cannot express is recorded as a gap, never written as free text; a value only the SME can give waits for 5.2.
Rules and exceptions (7)
Proposed here Each check carries applicability, inputs, condition, severity (block, warn or advise), source, when it is evaluated and the user's action
Team requirement Document expiry only warns, at 90 and 30 days by default; it never blocks
Team requirement A history gap longer than allowed blocks submission until it is filled; the explanation is recorded as a history entry (a fact) and the check runs again; it is not a waiver
Proposed here Checks run when a fact is verified (8.1) and when a form is rendered (8.2); time-sensitive checks run again before signing (9.4) and before submission (9.5)
Proposed here A check the rule language cannot express is a named gap, never free text
Founder decision Immigration values in a check (for example how recent a police certificate must be) come only from the SME
Proposed here Every check is part of the 4.3 test cases
Example · Client A
Checks on Client A's case (Example)
Check	Group	Severity	Result
Client A's date of birth is before the passport issue date	cross-record	block	pass
Partner's passport expires in 70 days	readiness warning	warn	amber warning, not a block
Police certificate is recent enough	official document rule	set by the SME	value pending the SME; no threshold invented
Lease address matches the partner's SQR address	cross-record	warn	shown as a warning in 8.4, before the representative sees the form

Exception. A rule such as 'the employer's business must have operated for a period before the offer' may not fit the condition language: it is recorded as a named gap for the team.

Immigration conditions, forms and values shown are examples, pending the Immigration SME.

Acceptance checks (2)
Normal case. Client A's partner's passport, expiring in 70 days, gives an amber warning and never blocks.
Alternate case. A history gap longer than allowed blocks submission until the gap is filled: the explanation is recorded as a history entry and the check runs again.
Sources and detail
Record handed over	Draft check set
Records read · updated	Reads Library · updates Library
Screen	None: it runs in the background
Field-group checks	SA-1B-6
Hard and advisory rules	SA-1-16
Expiry warns; 90 and 30 days	SA-1B-21 – SA-1B-23
History coverage blocks until explained	SA-1B-15

## 4.1 — Check structure and references

Activity 4.1
Check structure and references
Automatic step · View 3: Check, review and publish
Screen: Row › Validation report proposed
WHAT THIS ACHIEVES

Finds structural gaps and broken references in the draft before anyone spends time reviewing it.

WHO ACTS

Platform
the product's code and rules

Authority. May block progress; cannot vouch for meaning.

BEFORE IT STARTS
Starts when
Every drafting step has returned.
Needs
Inventories and references are present; extraction gaps are named.
Works on
Complete draft from view 2
HOW IT WORKS

Code checks coverage, references and consistency

Every field mapped or explicitly marked
Every document requirement line linked
Every rule's fields exist and every condition can be true
Near-duplicate fields marked for review; no hidden field a form reads; every passage dispositioned; every gate field asked by a block
RESULT AND WHAT HAPPENS NEXT
Produces
Validation report: blocking, for-review and advisory findings
Next
AI recheck (4.2) and tests (4.3), side by side
Then: The meaning recheck and the expected-answer tests both start.
Done when
Report attached to the draft with every finding linked to its item.
If not
A blocking finding holds the affected item and its dependents (4.4).
Rules and exceptions (6)
Proposed here A blocking finding holds the affected item and its dependents; publishing waits until it is resolved
Proposed here The validation report becomes part of the pack version
Proposed here Checks are code; they run the same way every time
Proposed here Structure checks prove consistency, not meaning
Proposed here Two classes of finding (advisory notes are listed but do not hold anything): a blocking finding (a structural break or a missing item) returns to drafting through 4.4; a for-review finding (a near-duplicate, an 'uncertain' mapping or reading) goes on to the reviewer marked 'decide' and cannot be published undecided

EXCEPTIONS

A required field is unmapped: blocking finding with the field and page
Example · Client A
Findings (Example)
Finding	Kind	Held
'Date of birth', Children, row 1, has no mapping	blocking	that mapping and the forms that read it
A rule reads 'previous marriage' but no PQR block asks it	advisory: publishing warns	nothing
Proposed new field 'Last name' beside the existing 'Family name'	for review: near-duplicate	nothing; the publisher decides in 5.1
Acceptance checks (2)
Normal case. Deleting a required mapping produces a blocker naming the field and the views affected.
Alternate case. The same draft gives the same report every time.
Sources and detail
Record handed over	Draft and validation report
Records read · updated	Reads Library · updates Library, Review and approval records

## 4.2 — Recheck mapping meaning in a fresh context

Activity 4.2
Recheck mapping meaning in a fresh context
Automatic step · View 3: Check, review and publish
Runs automatically. Its agree or disagree result appears beside each mapping in the review workbench (5.1).
WHAT THIS ACHIEVES

Gives each drafted mapping an independent second opinion on meaning, so the reviewer sees where it may be wrong.

WHO ACTS

AI in the product
drafts, reads documents, checks meaning; never approves

Authority. Flags only; never approves or changes anything.

Checked by. Its disagreements are decided by the content publisher (5.1); no model vote decides anything.

BEFORE IT STARTS
Starts when
The validation report is attached (runs beside 4.3).
Needs
Mappings carry the field's label, heading and page.
Works on
Drafted mappings with field label, heading and page
HOW IT WORKS

A separate AI run, without the drafting run's reasoning, checks that each person and fact fit the field

Read each new or changed mapping with its label, heading and page
Say whether the person and the fact fit, with a one-line reason
RESULT AND WHAT HAPPENS NEXT
Produces
Agree or disagree per mapping, with the reason
Next
The failed-check decision (the platform) once 4.3 has also finished; disagreements go on to review (5.1).
Then: Reviewers see each disagreement beside the item.
Done when
Every new or changed mapping has a recheck result.
If not
A disagreement marks the item for focused review in 5.1.
Rules and exceptions (5)
Proposed here Proposed; its added value over plain checks is to be measured on the real read's answer key
Proposed here A meaning check, separate from structure checks and from read-back
Proposed here Never loop models until they agree
Proposed here A disagreement makes the item a focused-review item in 5.1; every new item is reviewed anyway
Proposed here A disagreement is a for-review finding, never a failed check: it does not send the item back to drafting; the reviewer's recorded, evidence-backed decision closes it
Example · Client A
Recheck (Example)
Field	Drafted	Recheck
'Date of birth' under 'Spouse/common-law partner'	the form's applicant's partner	agree
'Date of birth' under 'Spouse/common-law partner'	the form's applicant (Client A)	disagree: the heading names the partner
Acceptance checks (2)
Normal case. A mapping that puts Client A's date of birth under the partner heading is flagged.
Alternate case. The recheck never loops with the drafting run until they agree.
Sources and detail
Record handed over	Recheck results
Records read · updated	Reads Library · updates Review and approval records
Screen	None: it runs in the background

## 4.3 — Test against independent expected answers

Activity 4.3
Test against independent expected answers
Automatic step · View 3: Check, review and publish
Screen: Row › Sample families proposed
WHAT THIS ACHIEVES

Tests the draft against made-up families whose correct answers were worked out independently.

WHO ACTS

Platform
the product's code and rules

Authority. May report and hold; may not use the engine's own output as the expected answer.

Checked by. Expected answers are signed by the Immigration SME; failures hold items (4.4).

BEFORE IT STARTS
Starts when
The validation report is attached (runs beside 4.2).
Needs
Independent expected answers exist for the representative cases.
Works on
Draft pack version; made-up families with expected answers checked by hand and signed by the SME
HOW IT WORKS

Preview each family's questions, documents, forms and filled values; compare

One made-up family per rule branch (single, married, common-law, with children, inside or outside Canada)
Preview each person's questions, documents and forms
Compare with the independently checked expected answers; report measured results separately from the acceptance criterion
RESULT AND WHAT HAPPENS NEXT
Produces
Results in three labelled columns: proposed target, measured result, approved acceptance criterion
Next
The failed-check decision (the platform) once 4.2 has also finished.
Then: The failed-check decision reads them.
Done when
Every representative case has a result; every failure names its item.
If not
A failure holds the affected item and its dependents (4.4).
Rules and exceptions (14)
Proposed here The answer key is written by hand and signed by the SME before any engine step is trusted
Founder decision Representative cases: wrong-person matches, missing fields, repeated rows, conditional branches, formatting and changed instructions; one good form proves nothing about other forms
Founder decision Acceptance criteria come from business consequences, not from the first experiment's accuracy; measured results are reported separately and never become the standard by default
Founder decision Proposed target, measured result and approved acceptance criterion are labelled separately; a target is never shown as achieved
Founder decision Approved, unchanged items are not re-tested unless something they depend on changed
Proposed here One combined family tests rules together (common-law, a child, and the inside or outside Canada form choice), because errors hide in interactions
Proposed here Expected answers are kept per form edition and rule branch and reused across combinations; the SME signs each once
Proposed here The field and consistency checks drafted in 3.8 are part of the test cases
Proposed here Proposed change to the team's requirement: today publishing runs no test set for gates and grids
Founder decision Historical comparison: where consented past filings exist for that exact form edition, their facts, verified by staff, are filled through the map and the result is compared field by field with the form actually filed, before publishing; the platform lists each difference and the content publisher classifies it as a mapping error, a changed fact, an intentional difference or a mistake in the earlier filed form
Founder decision Where no such past cases exist (a new edition, or before any firm has moved in), publishing may proceed once the other required checks pass; the publication record says 'Historical comparison unavailable' and nothing implies that evidence exists
Founder decision When suitable past cases become available after publishing, the content publisher runs the comparison; a suspected material mapping error is triaged as a wrong-mapping ticket (10.4): once confirmed, the mapping and its dependent work are held, and open cases' forms that use it are marked 'mapping under correction'; unrelated work stays usable

EXCEPTIONS

A branch produces no preview: the rule it depends on is listed as unreachable
A past filed form differs from the map's output because the person's fact changed since filing: classified as a changed fact, not a mapping error; the map is not held
Example · Client A
Review and test results (Example)
Item	What happens	Result
Client A's own date-of-birth mapping on the application form	approved earlier, unchanged	reused; not reviewed again
Partner's date-of-birth mapping on the family-information form	new	reviewed in 5.1
Wrong-person test: the partner's field resolves to Client A's value	fails against the expected answer	that mapping is held (4.4); the rest stays usable
Corrected mapping (person = partner)	re-tested	passes; goes on to review
Three columns kept apart (Example)
Measure	Proposed target, with reason	Measured	Approved acceptance criterion
Wrong-person values on a family file	zero: a wrong person's fact on a filed form is a serious error	to be measured	not yet approved
Historical comparison before publishing (Example: form editions and cases invented)
Form edition	Consented past filings, facts verified by staff	Publication record
Family-information form, current edition	40 cases from a firm that has moved in	compared field by field; 2 differences: 1 changed fact (address moved), 1 mistake in the earlier filed form; no mapping error
Family-information form, new edition	none yet	'Historical comparison unavailable'; published on structure checks, expected answers, review and second-person approval; compared once filed cases on this edition exist
Acceptance checks (2)
Normal case. A deliberately missing conditional document is found against the expected answer.
Alternate case. A favourable total never hides a single blocking failure.
Sources and detail
Record handed over	Test results
Records read · updated	Reads Library · updates Review and approval records
No mandatory test profiles; publishing runs no test set	SA-1B-38 (proposed change)

## 4.4 — Hold affected items and their dependents

Activity 4.4
Hold affected items and their dependents
Automatic step · View 3: Check, review and publish
Screen: Row › Held items proposed
WHAT THIS ACHIEVES

Stops only the failing items and what depends on them, and sends them back for re-drafting; other combinations, open cases and the approvals of unaffected items carry on.

WHO ACTS

Platform
the product's code and rules

Authority. May hold items; cannot publish or switch off a whole step on its own.

BEFORE IT STARTS
Starts when
A blocking finding from 4.1 or 4.3, a reviewer's correction or return (5.1), or an item the SME corrects or rejects (5.2); an item still waiting for the SME simply waits. AI disagreements and near-duplicates are not held here; they go to review (5.1).
Needs
The dependency list for each item is known (which mappings, rules, views and forms read it).
Works on
A blocking finding, a reviewer's correction or return, or a rule the SME corrected or rejected
HOW IT WORKS

Hold the item and everything that reads it; send them back to drafting with the evidence

Hold the failing item and its dependents
Keep every unaffected item's review and approval
Send the held items back to drafting with the finding
RESULT AND WHAT HAPPENS NEXT
Produces
Held list; rework of those items only
Next
Re-drafting (view 2, AI), for the held items only.
Then: Drafting re-runs on the held items only.
Done when
Every held item lists its reason and its dependents.
If not
Back to drafting; after the fix only the changed items are checked and reviewed again.
Rules and exceptions (5)
Founder decision Approved, unaffected work stays usable: other combinations and open cases keep their published versions
Founder decision Reviews already done on unchanged items are kept; only changed items are reviewed again
Proposed here Publishing waits until held items pass
Proposed here Review starts on a clean report, so the reviewer sees each item with its dependents settled; approvals given in earlier rounds to items that did not change are kept (a proposal; parallel review of unaffected items is possible later)
Founder decision A whole step is switched off only for a stated, concrete reason, recorded with who decided
Example · Client A
One failure (Example)
Partner's date-of-birth mapping fails the wrong-person test
Held, with the date check and the family-information forms that read it
Client A's own date-of-birth mapping stays approved
Corrected mapping re-tested, then reviewed in 5.1
Acceptance checks (2)
Normal case. Holding the partner's date-of-birth mapping also holds the date check and the forms that read it, and nothing else.
Alternate case. Published versions used by other combinations and open cases are untouched.
Sources and detail
Record handed over	Held items with evidence
Records read · updated	Reads Library · updates Library, Review and approval records

## 5.1 — Review every new or changed item

Activity 5.1
Review every new or changed item
Person step · View 3: Check, review and publish
Screen: Review workbench proposed
WHAT THIS ACHIEVES

A person decides every new or changed item beside its source before anything can be published.

WHO ACTS

Content publisher SUPER ADMIN
Expat Ready · Super Admin role

Authority. May approve, correct or return draft structure; cannot publish their own work.

BEFORE IT STARTS
Starts when
No blocking finding is left; for-review findings (AI disagreements, near-duplicates, 'uncertain' items) arrive marked 'decide' (held items return here after re-drafting; unchanged earlier approvals are kept).
Needs
Evidence, validation report and the exact draft version are available.
Works on
New and changed fields, sections, document types, mappings and 'collected from' settings, with findings and recheck flags
HOW IT WORKS

Compares each proposal with the highlighted source; chooses Approve, Correct or Return; never types a mapping from scratch.

See every new or changed field, section, document type, mapping and setting, beside its source snippet; rules and gates are also confirmed by the SME (5.2)
Approve; correct (pick another proposal, or state the correction as an instruction for the re-draft, never typing a mapping from scratch: the item and its dependents are held (4.4), re-drafted with the correction as input, checked again and shown again for approval); or return (no correction given: the item goes back to drafting with the reason, 4.4); submit the pack version when no blocking finding is left and every 'decide' item is decided
RESULT AND WHAT HAPPENS NEXT
Produces
Reviewed structure, or corrections sent back
Next
Immigration SME (5.2)
Then: The SME can confirm rules, gates and values.
Done when
Every new or changed item has a decision recorded with who and when.
If not
A correction or a return holds the item and its dependents (4.4) and sends it back to drafting; a correction is drafted in as given, a return is re-drafted from the reason.
Rules and exceptions (8)
Founder decision During initial validation every new or changed item is reviewed; approved unchanged items are reused without another review. No later relaxation is decided: any change needs measured evidence and the founder's yes
Founder decision Model confidence never exempts a new item; rule matches on a new edition are new mappings and are reviewed too, in a grouped list with their evidence
Proposed here The reviewer chooses among proposals or sends an item back; nobody types a mapping from scratch
Proposed here Every accepted label is saved on its field, so the next form matches it by rule
Proposed here Every decision is logged with who and when
Proposed here A wrong mapping is the content team's to fix; a wrong fact on a case is the agent's
Proposed here A for-review finding is closed by the reviewer's recorded, evidence-backed decision; the models never have to agree; nothing marked 'decide' can be published undecided

EXCEPTIONS

Many corrections or returns: the engine re-runs with the corrections and reasons as input
Example · Client A
Review beside the source (Example; proposed interaction)
Source evidence	Proposed	Reviewer
Page 2, heading 'Spouse/common-law partner', label 'Date of birth' (highlighted)	the form's applicant's partner · Date of birth	Approve
Page 3, heading 'Children', 'Date of birth' row 1	the form's applicant's child, row 1 · Date of birth	Approve
New section 'Common-law relationship'	proposed new section	Correct the name; approved when it comes back re-drafted and checked
Near-duplicate: proposed 'Last name' beside the existing 'Family name'	decide: merge or keep both	Correct: merge into 'Family name', then approve
AI recheck disagrees on 'Date of birth' under the partner heading; the source names the partner	the form's applicant's partner · Date of birth	Approve, with the reason recorded; no re-draft
Two different problems (Example)
Problem	Who fixes it	Where
The partner's date-of-birth field points at Client A	content team	here: the mapping
The partner's date of birth was verified wrongly on the case	agent	8.1: the fact
Acceptance checks (2)
Normal case. Approved, unchanged items reused from other combinations show as reused and are not reviewed again.
Alternate case. A correction removes publishing readiness until the corrected item is re-checked.
Sources and detail
Record handed over	Reviewed structure
Records read · updated	Reads Library, Review and approval records · updates Review and approval records, Library

## 5.2 — Confirm rules, gates, documents and values

Activity 5.2
Confirm rules, gates, documents and values
Person step · View 3: Check, review and publish
Screen: Review workbench › Rules and gates proposed
WHAT THIS ACHIEVES

The Immigration SME signs off the immigration meaning: rules, gates, document conditions and values.

WHO ACTS

Immigration SME SUPER ADMIN
Expat Ready · Super Admin role (proposed)

Authority. Confirms rule meaning and immigration values; cannot bypass publishing.

BEFORE IT STARTS
Starts when
The publisher has recorded a decision on every new or changed item (5.1).
Needs
SME authorised; official sources attached.
Works on
Drafted and changed rules, gates, document conditions and values, with sources
HOW IT WORKS

Reads each rule and gate beside its official source; confirms or corrects; decides between conflicting readings.

Confirm or correct each drafted rule, gate, document condition and immigration value
Resolve each 'uncertain' passage reading
Not built yet in today's code.
No immigration-SME role: today's six Expat Ready staff roles are Platform Owner, Admin, Support, Billing, Content publisher and Auditor, so nobody holds a 'confirm rules and values' permission separate from publishing.
Code references: Sources and detail, below.
RESULT AND WHAT HAPPENS NEXT
Produces
Confirmed rules and gates, each signed off with a date
Next
Second-person approver (5.3)
Then: The pack version can be published.
Done when
Every new or changed rule, gate and value signed off; nothing left unsigned.
If not
An item the SME corrects or rejects is held (4.4) and returns to drafting; an item not yet looked at waits.
Rules and exceptions (4)
Founder decision Immigration values come only from the SME
Proposed here An unconfirmed rule or gate cannot publish
Proposed here Sign-off is recorded per item with the date

EXCEPTIONS

The official sources disagree (two pages name different forms): the conflict is shown and the SME decides; the decision is recorded with both sources
Example · Client A
SME decisions (Example)
Item	SME	Recorded
Rule: common-law → IMM 5409 and proof of cohabitation	confirms	sign-off with date
Gate 'Passport valid long enough'	corrects the reading of the criterion	held, re-drafted, signed off

Exception. Family-information form IMM 5645 or IMM 5707? The guide points to 'the version listed in the application package for your country'. The conflict is shown with both sources; the SME decides.

Immigration conditions, forms and values shown are examples, pending the Immigration SME.

Acceptance checks (2)
Normal case. A rule with conflicting official sources stays blocked, with both sources kept, until decided.
Alternate case. A signed-off rule that has not changed is not confirmed again in the next run.
Sources and detail
Record handed over	Confirmed rules and gates
Records read · updated	Reads Library, Review and approval records · updates Review and approval records
Build gap	No immigration-SME role: today's six Expat Ready staff roles are Platform Owner, Admin, Support, Billing, Content publisher and Auditor, so nobody holds a 'confirm rules and values' permission separate from publishing. (packages/contracts/src/schemas/role-template.platform.ts:29-305; team design SA-06 SA6-D18)

## 5.3 — Approve and publish the pack version

Activity 5.3
Approve and publish the pack version
Person step · View 3: Check, review and publish
Screen: Pack version › Approve and publish in the team's design
WHAT THIS ACHIEVES

A second person, never the pack version's author or submitter, publishes the reviewed draft as a new pack version, or rejects it.

WHO ACTS

Second-person approver SUPER ADMIN
Expat Ready · Super Admin: another Content publisher or the Platform Owner

Authority. Approves and publishes, or rejects; never edits: any change sends the draft back to review.

BEFORE IT STARTS
Starts when
The publisher has decided every new or changed item (5.1) and the SME has signed off every new or changed rule, gate and value (5.2).
Needs
A different authorised person from the pack version's author and submitter; no blockers; the reviewed draft unchanged.
Works on
Reviewed draft, difference from the last version, check evidence
HOW IT WORKS

Reads the difference and the validation report; publishes or rejects with a reason. Never edits.

Read the difference from the last version and the validation report
Publish, or reject with a reason
RESULT AND WHAT HAPPENS NEXT
Produces
Published version: new cases open on it; open cases see it as a change to adopt (10.3)
Next
Firms' cases: new cases open on the published pack version; open cases adopt it through 10.3.
Then: New cases open on it; open cases adopt it through 10.3, including a form waiting for this mapping.
Done when
Pack version published and readable by firms' cases.
If not
Rejected: back to the publisher (5.1) with the reason.
Rules and exceptions (5)
Team requirement The approver is a second person, never the pack version's author or submitter (the content publisher who prepared it or submitted it for approval), and never edits
Proposed here The pack version is imported as one pathway version; every item carries its own version
Founder decision The publication record shows, per new or changed form edition, whether the historical comparison was run or is 'Historical comparison unavailable'
Proposed here New cases open on the new version; open cases keep theirs until a person adopts

EXCEPTIONS

A fault is found: rejected with a reason; the author fixes and resubmits
Example · Client A
Version comparison (Example)
Change since the last version	Publishing decision
1 mapping changed: partner's date of birth (person corrected)	publish
1 rule added: common-law → IMM 5409	publish

Exception. The approver is the author of the draft: publishing is blocked.

Acceptance checks (2)
Normal case. The author cannot publish their own draft.
Alternate case. A changed draft cannot reuse a stale approval.
Sources and detail
Record handed over	Published pack version
Records read · updated	Reads Review and approval records, Library · updates Published pack version, Review and approval records

## 6.1 — Lead form and PQR

Activity 6.1
Lead form and PQR
Person step · View 4: Prospect to verified facts
Screen: Lead form → PQR (block 0, then the blocks for what they want) in the team's design
WHAT THIS ACHIEVES

Captures the prospect's own answers and gives an indicative eligibility result before a firm takes the case.

WHO ACTS

Prospect, then client CLIENT PORTAL
client portal: family members or the employer's signatory

Authority. The prospect declares facts; the platform runs published rules only.

BEFORE IT STARTS
Starts when
A prospect opens the lead form.
Needs
Published PQR blocks and indicative gates exist for the country.
Works on
Client A opens the firm's lead form link
HOW IT WORKS

Client A answers. No staff action yet.

Answer the short lead form and get an indicative result
Answer block 0 and the blocks for intent and status; see the result and the gap
RESULT AND WHAT HAPPENS NEXT
Produces
Declared facts on Client A's record; an indicative result and the gap
Next
Duplicate check (6.2, the platform).
Then: Duplicate check runs.
Done when
Lead saved with declared facts and the indicative result.
If not
The prospect stops midway: save and resume by link.
Rules and exceptions (4)
Team requirement Lead-flag fields stay within the cap
Proposed here Blocks unfold from intent and status; 'not sure' unfolds permanent residence, work and study
Proposed here Gates give an indicative result with the deciding rule in plain words and what would change it
Team requirement Facts are stored on the person once; nothing is asked twice across lead form and PQR
Example · Client A
Client A's PQR (Example)
Marital status: common-law; job offer: yes
Stored once on Client A's record
Indicative result: likely to meet the criteria so far

Exception. Client A skips the passport question: that gate says 'cannot tell yet', not 'not eligible'.

Immigration conditions, forms and values shown are examples, pending the Immigration SME.

Acceptance checks (2)
Normal case. A missing required answer stays missing and never becomes a false result.
Alternate case. Nothing asked on the lead form is asked again in the PQR.
Sources and detail
Record handed over	Lead with declared facts
Records read · updated	Reads Published pack version · updates Facts per person or organisation
Lead form: lead-flagged fields within a cap; indicative result	SA-1B-80
PQR with save and resume	SA-1B-82

## 6.2 — Find possible duplicates

Activity 6.2
Find possible duplicates
Automatic step · View 4: Prospect to verified facts
Screen: Lead › 'Same person?' proposed
WHAT THIS ACHIEVES

Finds people or organisations the firm may already know, so nobody gets a second record by accident.

WHO ACTS

Platform
the product's code and rules

Authority. Proposes candidates only; staff decide.

BEFORE IT STARTS
Starts when
A person or organisation is created anywhere (lead, family member, employer).
Needs
Firm-scoped matching on email, phone or organisation name.
Works on
New lead: name, email, phone
HOW IT WORKS
Match email, phone or organisation name against existing people
List candidates for staff
RESULT AND WHAT HAPPENS NEXT
Produces
Candidate matches for staff to decide
Next
Agent (6.3)
Then: The agent can decide.
Done when
Candidates listed, or 'none found'.
If not
No candidates: the lead goes to review with 'none found'.
Rules and exceptions (4)
Proposed here Nothing is merged at capture
Proposed here The same check applies to leads, family members and organisations
Proposed here Matching names or email alone never link two people; the check only proposes
Team requirement An existing client is offered instead of a second record; creating one anyway is an explicit, recorded choice
Example · Client A
Candidates (Example)
New lead	Existing record	Matched on	Shown to staff
Client A	Client A, earlier enquiry	email	yes
Another person named like Client A	none	nothing	no
Acceptance checks (2)
Normal case. Two people sharing a name, with different email and phone, are not proposed as one.
Alternate case. A family member added later gets the same check.
Sources and detail
Record handed over	Lead with candidate matches
Records read · updated	Reads Facts per person or organisation · updates Facts per person or organisation

## 6.3 — Review the lead: same person, and take the case?

Activity 6.3
Review the lead: same person, and take the case?
Person step · View 4: Prospect to verified facts
Screen: Lead › Review proposed
WHAT THIS ACHIEVES

The agent settles who the person is and whether the firm takes the case.

WHO ACTS

Agent FIRM
firm staff: Case Manager or Case Officer

Authority. Authorised staff decide identity; a merge is a recorded decision.

BEFORE IT STARTS
Starts when
A lead is ready for review.
Needs
Staff may see the lead and the candidates.
Works on
Lead with indicative result and any candidate matches
HOW IT WORKS
Decide 'same person?' for each candidate
Decide whether the firm takes the case
RESULT AND WHAT HAPPENS NEXT
Produces
Identity decision; lead converted or closed
Next
Agent (7.1), or the lead is closed
Then: A case can be opened.
Done when
Identity resolved and the firm's decision recorded.
If not
'Different person': two records stay; a later merge is a recorded decision.
Rules and exceptions (3)
Proposed here A returning person starts with verified facts; only 'still true?' items, missing facts and differences are asked
Proposed here A later merge is a recorded decision
Proposed here 'Same person' links the lead to the existing record; the case then reuses facts one at a time (7.1) and also asks for anything missing and any unresolved difference
Example · Client A
Decision (Example)
Decision	What happens
Same person	Client A's verified facts carry over; only 'still true?' items, missing facts and differences are asked
Different person	two records stay
Acceptance checks (2)
Normal case. Choosing 'same person' carries over Client A's verified facts; only 'still true?' items, missing facts and differences are asked.
Alternate case. Closing the lead ends the process; nothing waits.
Sources and detail
Record handed over	Resolved client
Records read · updated	Reads Facts per person or organisation · updates Facts per person or organisation, Review and approval records

## 7.1 — Convert the lead and open the case

Activity 7.1
Convert the lead and open the case
Person step · View 4: Prospect to verified facts
Screen: Case wizard in the team's design
WHAT THIS ACHIEVES

Opens the case on the current pack version with every person in their role, pre-filled from what the firm has already verified.

WHO ACTS

Agent FIRM
firm staff: Case Manager or Case Officer

Authority. Creates cases and relationships; cannot change published configuration.

BEFORE IT STARTS
Starts when
The firm takes the case (6.3), or an existing client needs a new service and the agent starts a case from the client's record.
Needs
Identity resolved; a published version exists for the combination; the agent may open cases for this client.
Works on
Resolved client (new or existing) and the chosen combination
HOW IT WORKS

Picks the combination, adds the partner and the child with their roles, and sees what was pre-filled and what is still open. In one line: Pick the combination (its published version is pinned); add family members with roles; the platform pre-fills from verified facts.

Pick the combination; its published version is pinned
Add spouse and children with roles; each gets a duplicate check
The rules decide each person's forms and documents
For an existing client, start from the client's record: no new lead, no repeat of the lead form or PQR
The platform resolves each required fact from each person's shared record and pre-fills it; missing, re-confirmation and conflicting items are listed
Not built yet in today's code.
The current answer is chosen by replacement link and effective date only; confirmation status is not read, so a newer declared answer would replace a verified one. Re-asking re-confirmation fields on a new case is built.
Code references: Sources and detail, below.
RESULT AND WHAT HAPPENS NEXT
Produces
Case with people, roles, forms, documents and pre-filled questions
Next
Client and family (SQR)
Then: Questionnaires go out per adult.
Done when
Every person has one role; each person's questions, documents and forms are resolved.
If not
No published version for the combination: the case cannot open on it; the agent picks another or waits for publishing.
Rules and exceptions (18)
Team requirement Every person on a case has one role; their questions, documents and forms are the row's lines filtered by role and conditions
Team requirement A family is one case; each applicant has their own forms, fee and decision
Team requirement Nothing is sent to a person under 18; a parent answers for them
Proposed here Corporate: one case per labour market assessment, occupation and location; positions link to worker cases
Team requirement Each person's filing has its own row and role; a family case need not use one row for everyone
Proposed here Each applicant's filing groups their forms, approvals, signatures, fee, receipt and decision; filings the route requires to be submitted together wait for each other (the SME confirms which)
Team requirement An existing client's new service is a new case on the same client record, opened from that record, on the current pack version; opening it does not alter the earlier case; a later verified change to a shared fact follows the affected-case rules, and submitted forms never change
Proposed here Only eligibility questions the new service needs and the record cannot answer are asked; the full lead form and PQR are not repeated
Proposed here Each required fact is resolved on its own from the person's shared record (rules in Records: Facts per person or organisation); never by copying the latest case
Proposed here Asked: missing facts, facts due for re-confirmation, and unresolved differences; everything else is shown pre-filled for correction
Proposed here The new case's own rules decide its questions, documents, forms and checks again; nothing is inherited from an earlier case's setup
Team requirement A document on file is reused only if this case's checklist item accepts it (type, person, still valid); expiry warnings are unchanged
Proposed here Never copied into a new case: approvals, signatures, submission receipts, decisions or an earlier pack version
Proposed here A fact verified on this case updates the shared record; in another open case, the forms that read it are prepared again and their approvals withdrawn; submitted forms never change
Proposed here Choosing among verified values is rules, not AI

EXCEPTIONS

Spouse not applying: no forms of their own; their facts fill the principal's partner fields
Client A's filing is decided before the partner's: Client A's filing moves to After decision; the case stays open until every filing is closed (9.6)
Two verified values with no recorded replacement (for example after two records are merged): both shown with sources; the agent verifies one before fields that read it fill
Example · Client A
Who gets what (Example)
Person	Role	Gets
Client A	principal applicant	SQR; IMM 1295; family-information form; IMM 5409
Partner	common-law partner	own SQR; signs IMM 5409 with Client A
Child, aged 9	dependent child	no questionnaire; Client A answers

Exception. If the partner does not apply, they get no forms of their own; their facts fill the partner fields on Client A's forms.

Reusing facts on a new case (Example: every value, case and date is invented)
Field	Selected value · status
Client A's date of birth	12 Apr 1990 · verified · reused

Available information: 12 Apr 1990, verified from the passport on an earlier visitor-visa case (Example); no other value
Reason: Same person, same meaning, verified with a known source; identity facts are not re-asked
Human action: None; shown pre-filled and correctable, never re-typed

Client A's home address ('lives here now')	Address 2 · current · 'still true?' pending until answered (forms that read it are held at approval); Address 1 kept as history

Available information: Address 1, verified on the earlier case; Address 2, verified in Mar 2026 as a move that supersedes Address 1
Reason: A recorded replacement is history, not a conflict; addresses carry a re-confirmation rule
Human action: Client A confirms or corrects Address 2; the address-history question uses Address 1 for its own dates

Partner's passport	Stored: the verified passport · proposed: the new number, 'needs review' · forms that read it: needs review

Available information: Passport verified on the earlier case (expires in 70 days); a new passport number the partner typed in this case's SQR, not yet verified
Reason: A newer unverified answer never replaces a verified fact, and the verified value is not cleared for filing while the proposal is open
Human action: The partner uploads the new passport; in 8.1 the agent verifies the new number (the old one becomes history) or rejects the proposal with evidence; until then forms that read the passport cannot be approved

Partner's date of birth	No value selected · conflict

Available information: 3 Sep 1991 (passport, earlier case) and 4 Sep 1991 (an older enquiry record merged into the partner's record); both verified, no recorded replacement
Reason: Competing verified values with no recorded resolution: nothing is guessed
Human action: The agent checks the passport and verifies one value with a reason; fields that read it wait

Job offer employer	Not reused · asked for this case

Available information: The employer on the earlier case's job offer
Reason: A fact of that application, not of the person
Human action: Client A answers for this case

Partner's police certificate	Offered for reuse · checked against this case's checklist item

Available information: Uploaded and accepted on the earlier case
Reason: A document is reused only if this case's requirements accept its type, person, country and date (values pending the SME)
Human action: The agent accepts it for this checklist item, or requests a new one
Who starts where, and what carries over (Example)
Starting point	Pre-filled
New client, no record	What they answered in the lead form and PQR

How the case starts: Lead form and PQR (6.1); duplicate check (6.2); the firm takes the case (6.3)
Asked: The rest of the SQR and the documents
Never carried over: Nothing to carry

Existing client, profile only (no earlier case)	Verified profile facts

How the case starts: The agent opens a case from the client's record; no new lead
Asked: Missing facts, 'still true?' items, and eligibility questions the new service needs that the record cannot answer
Never carried over: Nothing to carry

Existing client, one earlier case	Each person's verified shared facts; documents this case's checklist accepts

How the case starts: The same: a new case on the same client record, on the current pack version
Asked: Missing facts, 'still true?' items, differences
Never carried over: That case's approvals, signatures, receipts, decision, case-only facts and pack version

Existing client, several closed or active cases	Each fact resolved on its own from the shared record and its history, never 'the latest case'

How the case starts: The same
Asked: As above, plus any conflict between verified values
Never carried over: As above; another active case's forms that read it are prepared again and their approvals withdrawn (7.1)

Any start: a fact is missing	Blank

How the case starts: No change
Asked: The question
Never carried over: A guess

Any start: a fact is due for re-confirmation	The current value, marked 'still true?' (pending)

How the case starts: No change
Asked: 'Still true? add anything new'; it counts only once answered: Client A's 'yes, still true' re-confirms it, a change waits as 'needs review' for the agent; forms that read it are held at approval until then
Never carried over: A silent carry-over

Any start: a newer value is proposed (not yet verified)	The verified value and the proposed one, each with its status; forms that read it: needs review

How the case starts: No change
Asked: The agent verifies the new value or rejects the proposal with evidence (8.1)
Never carried over: A silent replacement

Any start: verified values compete (conflict)	Both values shown as alternatives; none selected for any form

How the case starts: No change
Asked: A person verifies one with a reason; fields that read it wait
Never carried over: A guess
A corporate case (Example)
Subject	Case	Gets
Client A's employer (the organisation)	employer case for the job offer	employer questionnaire; employer forms signed by the employer's signatory
Client A as the worker	own worker case, linked to the employer's position	worker questionnaire and forms, as above

Immigration conditions, forms and values shown are examples, pending the Immigration SME.

Acceptance checks (2)
Normal case. Adding the partner creates a separate person with their own values, never forms of Client A's.
Alternate case. The child receives no questionnaire; Client A answers for them.
Sources and detail
Record handed over	Case, roles and pinned version
Records read · updated	Reads Published pack version, Facts per person or organisation · updates Facts per person or organisation
One filing's row and one role per person	SA-1B-73
Under 18: a parent answers	SA-1B-76
A returning client's new service is a new case on the same client	AG-07 §3.0
No duplicate client; 'create anyway' is recorded	AG-7-73
A new case starts on the current version	AG-8-40
Reuse a valid document on file	AG-8-20
Person-level and case-level facts; re-confirm on a new case; case snapshot	Doc-1 §5.3–5.4
Build gap	The current answer is chosen by replacement link and effective date only; confirmation status is not read, so a newer declared answer would replace a verified one. Re-asking re-confirmation fields on a new case is built. (apps/api/src/spine/answer-store.service.ts:432-436, 247-253; capture-once-resolver.service.ts:77-79)

## 7.2 — Complete the SQR and upload documents

Activity 7.2
Complete the SQR and upload documents
Person step · View 4: Prospect to verified facts · Runs for each adult on the case
Screen: Client portal › Questionnaire in the team's design
WHAT THIS ACHIEVES

Each adult answers only what is still open and uploads each document once.

WHO ACTS

Prospect, then client CLIENT PORTAL
client portal: family members or the employer's signatory

Authority. Declares facts and uploads evidence; cannot verify a value.

BEFORE IT STARTS
Starts when
The case is open (7.1), or a question returns because a document could not be read.
Needs
The recipient may answer for the person; the pinned rules are available.
Works on
Each adult's questions, minus what is known
HOW IT WORKS

Client A and the partner answer their own questions and upload documents; Client A answers for the child.

Each adult answers only facts not already known
Answers switch conditional blocks and documents on, with the reason shown
Upload each document once
Not built yet in today's code.
The current answer is chosen by replacement link and effective date only; confirmation status is not read, so a newer declared answer would replace a verified one. Re-asking re-confirmation fields on a new case is built.
Code references: Sources and detail, below.
RESULT AND WHAT HAPPENS NEXT
Produces
Declared answers and uploads
Next
Document reading (7.3, AI).
Then: Each upload is read.
Done when
Each adult has submitted; every fact asked of that adult is answered or will come from an upload. An answer supplies the fact, never the document: a required checklist item stays open until it has accepted evidence or an authorised disposition (9.5); a recorded reason alone does not clear it.
If not
A client flags a pre-filled value as wrong: it waits as 'needs review' for the agent (8.1).
Rules and exceptions (10)
Team requirement Shared household facts are asked once ('same as the principal applicant')
Proposed here A client can flag a pre-filled value as wrong; the flag or the new answer waits as 'needs review' for the agent; the verified value stays until then
Proposed here A question dropped because a document will supply it returns if the document is missing, unreadable or in conflict
Proposed here An answered question supplies the fact only; the checklist item still needs accepted evidence or an authorised disposition (9.5)
Founder decision Facts collected from staff or a profile record are never asked
Proposed here A question is pre-filled only from a verified value for the same person, meaning and date; the source and date are shown
Founder decision On a new case, fields with a re-confirmation rule show 'still true? add anything new'; other reused values are shown for correction, not re-typed
Proposed here Each new case's own conditions decide which questions and documents appear; a pre-filled answer can switch blocks on or off

EXCEPTIONS

A newer answer differs from a verified fact: it waits as 'needs review' for the agent (8.1); the verified value stays until then, and forms that read it cannot be approved or submitted
Two verified values with no recorded replacement between them: a conflict; fields that read it wait until a person verifies one
Example · Client A
The partner's SQR (Example)
Marital status already known from the PQR: shown pre-filled, not asked again
Passport uploaded once
Reading starts for that upload

Exception. Client A flags the pre-filled employer name as wrong: it waits as 'needs review' for the agent; forms that read it can be prepared but not approved until the agent decides.

Exception. Client A returns for a new service: the date of birth shows pre-filled and correctable; the home address shows 'still true?'; neither is typed again.

Acceptance checks (2)
Normal case. Adding a second child adds a separate child block and keeps each child's answers.
Alternate case. A question dropped because a document will supply it comes back if the document is missing.
Sources and detail
Record handed over	Declared answers and uploads
Records read · updated	Reads Published pack version, Facts per person or organisation · updates Facts per person or organisation, Document evidence
List-shaped facts asked once; 'same as the principal applicant'	SA-1B-10
Build gap	The current answer is chosen by replacement link and effective date only; confirmation status is not read, so a newer declared answer would replace a verified one. Re-asking re-confirmation fields on a new case is built. (apps/api/src/spine/answer-store.service.ts:432-436, 247-253; capture-once-resolver.service.ts:77-79)

## 7.3 — Read each uploaded document

Activity 7.3
Read each uploaded document
Automatic step · View 4: Prospect to verified facts · Runs for each uploaded document
Screen: Client portal › Documents (status per document) in the team's design
WHAT THIS ACHIEVES

Reads each upload and proposes values with their page, for the agent to verify.

WHO ACTS

AI in the product
drafts, reads documents, checks meaning; never approves

Authority. Proposes values; never overwrites a verified fact.

Checked by. Every proposed value is verified, or rejected, by the agent (8.1).

BEFORE IT STARTS
Starts when
A document is uploaded: one reading per upload, as soon as it arrives (none if nothing was uploaded).
Needs
Document linked to a person; processing permitted; the document type is supported.
Works on
Partner's passport scan (Example)
HOW IT WORKS
Read each uploaded document; propose values with confidence and page
Match the document to its checklist item
RESULT AND WHAT HAPPENS NEXT
Produces
Proposed facts with evidence, not yet verified
Next
Agent (8.1)
Then: The agent can verify them.
Done when
Every upload is read, unreadable, or for the wrong person, each with a status.
If not
Unreadable or wrong person: its facts' questions return to the SQR (7.2), and its checklist item shows 're-upload needed'.
Rules and exceptions (8)
Proposed here A read value is 'proposed from a document' until an agent verifies it; it never fills a form unverified
Founder decision Processing in Canada or the United States only, under written no-training and zero-data-retention terms, with client notice (the same for every AI step)
Proposed here A document that fails to read sends its questions back to the SQR; its checklist item shows 're-upload needed' until it has accepted evidence or an authorised disposition (9.5); a recorded reason alone does not clear it
Proposed here A successful reading proposes values; it does not itself accept the document. When automated reading fails, the agent may accept readable evidence by looking at it, and that acceptance is recorded
Founder decision Migration: when a firm moves in, its past filed forms are read the same way, with the firm's consent in the migration terms; every value read is a proposal that staff verify in 8.1; it is reused only for the same person in the same firm and never fills a new client's form directly
Founder decision Historical comparison: consented past filings, with their facts verified by staff, are also used to test mappings (4.3); a filed form is evidence, not automatically a correct answer
Team requirement Expiry only warns, at 90 and 30 days by default; it never blocks

EXCEPTIONS

The document is for the wrong person or expired: shown on the checklist item (wrong person: not accepted; expired: a warning)
Example · Client A
Passport to proposed fact (Example)
Partner's passport scan
Proposed: date of birth 3 Sep 1991, page 2
Agent verifies in 8.1
Exceptions (Example)
What happened	Result
Scan unreadable	the partner's date-of-birth question returns to the partner's SQR; the passport checklist item shows 're-upload needed'
The partner answered 4 Sep 1991; the passport says 3 Sep 1991	both shown with the page; the agent decides
Passport expires in 70 days	amber warning on the checklist item (inside the 90-day warning); not a block
Acceptance checks (2)
Normal case. A conflicting date is flagged with its page and never replaces the verified value.
Alternate case. An expiring passport is shown as a warning, never a block.
Sources and detail
Record handed over	Proposed facts with page references
Records read · updated	Reads Document evidence, Facts per person or organisation · updates Document evidence, Facts per person or organisation
Warning lead times 90 and 30 days; expiry only warns	SA-1B-23

## 8.1 — Verify every fact once in the working view

Activity 8.1
Verify every fact once in the working view
Person step · View 4: Prospect to verified facts
Screen: Agent › Working view (by library section, per person) proposed
WHAT THIS ACHIEVES

The agent turns declared and proposed values into verified facts, once per fact.

WHO ACTS

Agent FIRM
firm staff: Case Manager or Case Officer

Authority. Verifies permitted facts; mapping problems go to the content team.

BEFORE IT STARTS
Starts when
A fact has a declared answer or a value proposed from a document, a staff fact is needed, or a form reports a fact to correct; facts are verified one at a time, not after every reading is done.
Needs
Staff may edit the person and field; the evidence is visible.
Works on
Declared answers, proposed facts with evidence, conflicts
HOW IT WORKS
Verify proposed values, least certain first
Decide conflicts
Enter facts collected from the staff working view, once
Not built yet in today's code.
The current answer is chosen by replacement link and effective date only; confirmation status is not read, so a newer declared answer would replace a verified one. Re-asking re-confirmation fields on a new case is built.
Code references: Sources and detail, below.
RESULT AND WHAT HAPPENS NEXT
Produces
Verified facts with history
Next
Form rendering (8.2, the platform), for each form.
Then: Each form can be rendered.
Done when
A form whose facts are missing or in conflict can be rendered, but stops at 8.4 until they are resolved here. A form whose facts are 'needs review' or 'still true?' is prepared but held at approval and submission; a fact no form reads holds nothing.
If not
A form reports a wrong fact: it comes back here; correcting it re-renders the forms that read it.
Rules and exceptions (11)
Proposed here One current value per person per field; a newer verified value supersedes with history; a newer unverified value that differs waits as 'needs review'; two current verified values with no recorded replacement are a conflict
Proposed here Fields that read a fact in conflict are blocked until the agent decides
Proposed here The working view is the only staff editing surface (clients answer in the portal); a change here re-renders every form not yet submitted that reads it and withdraws their approvals; submitted forms never change
Proposed here A verified fact that changes which forms apply adds or removes forms from the filing's required set: the case asks for any new form; a form no longer required is withdrawn, never filed
Proposed here A new value supersedes the current one only when the agent verifies it as a correction or a change of circumstances; upload or edit time alone never decides
Proposed here Values reused from the person's shared record show their source and date; the agent acts only on re-confirmation items, 'needs review' values and conflicts
Proposed here A verified value with a newer value 'needs review' shows two statuses: the stored value stays verified, but forms that read it cannot be approved or submitted until the agent verifies the new value (the old one becomes history) or rejects the proposal with evidence; unrelated facts and forms continue
Proposed here A value due for 'still true?' may show pre-filled, but it counts as re-confirmed only once it is answered; stable facts with no dispute and no re-confirmation rule need no review
Founder decision A required fact collected from staff that is still blank is entered here by the agent, and a profile fact comes from the selected profile record; neither is ever sent to a client's SQR
Proposed here Readiness is per fact and per form: a missing client answer or document goes back to that client's SQR (7.2) as an open question, and only the forms that read the missing fact wait; other forms and other filings continue

EXCEPTIONS

Two documents disagree: both shown with pages; the agent picks and the choice is logged
Example · Client A
Verifying Client A's facts (Example)
Fact	Proposed from	After the agent
Partner's date of birth	passport, page 2: 3 Sep 1991	verified
Client A's 'send post here' address	SQR answer	verified; differs from 'lives here now', both kept
Representative's licence number	the representative's profile	nothing to enter

Exception. The partner answered 4 Sep 1991, the passport shows 3 Sep 1991: both shown with the page; the agent picks 3 Sep 1991 and the choice is logged.

Acceptance checks (4)
Normal case. Changing the partner's date of birth re-renders every form that reads it and withdraws their approvals.
Alternate case. Two documents that disagree are both shown with pages; the choice is logged.
Alternate case. Every client answer is complete but the firm's file reference printed on one form is blank: the agent enters it here; nothing is sent to the client, and only that form waits.
Alternate case. The partner's police certificate is missing for the partner's filing while Client A's filing is ready: only the partner's filing waits; Client A's filing goes on to approval.
Sources and detail
Record handed over	Verified answer snapshot
Records read · updated	Reads Facts per person or organisation, Document evidence · updates Facts per person or organisation, Review and approval records
Build gap	The current answer is chosen by replacement link and effective date only; confirmation status is not read, so a newer declared answer would replace a verified one. Re-asking re-confirmation fields on a new case is built. (apps/api/src/spine/answer-store.service.ts:432-436, 247-253; capture-once-resolver.service.ts:77-79)

## 8.2 — Render the form from the facts

Activity 8.2
Render the form from the facts
Automatic step · View 5: Prepare each form
Screen: Case › Forms › Form review (each form, each applicant, in the form's own order) proposed
WHAT THIS ACHIEVES

Builds each form from verified facts through its published map, showing every field's value, source and status.

WHO ACTS

Platform
the product's code and rules

Authority. Renders and flags; never invents a value or amends a mapping.

Checked by. Reviewed by the agent (8.4); approved by the lead representative (9.3).

BEFORE IT STARTS
Starts when
The case asks for this form: when the facts it reads are ready for preparation (a missing or held fact stops it at review, 8.4), after a fact correction, or after adopting a new version (10.3).
Needs
Pinned rules and mappings; each field has a readiness status.
Works on
Verified answer snapshot; the published form field map
HOW IT WORKS
Rules decide which forms exist: one per applicant who must complete the form, or one per application
Each field resolves through its mapping (person, relationship, canonical field, purpose, row) to one verified fact
Run the field and consistency checks drafted in 3.8
Show value, source and status per field
Not built yet in today's code.
Today's filler holds one value per canonical field, so it cannot place two people's dates of birth on one form
Code references: Sources and detail, below.
RESULT AND WHAT HAPPENS NEXT
Produces
Rendered form with value, source, status and check results per field
Next
AI meaning check (8.3), or the 'not yet supported' wait
Then: The meaning check can read each field's person and fact.
Done when
Every field filled, needs a fact, blocked by conflict, needs review, staff enters, or not yet supported.
If not
The required form edition has no published map: 'Not yet supported'; the agent raises a support ticket (10.4); the form waits (showing how long) and the case's other forms continue.
Rules and exceptions (8)
Founder decision No AI at render time
Proposed here Field status: filled, needs a fact, blocked by conflict, needs review, staff enters, not yet supported
Proposed here The agent fixes the fact, never the field; a field that shows the wrong fact is a mapping flag to the content team
Proposed here A field whose fact has a replacement 'needs review' or an unanswered 'still true?' shows the current value marked 'needs review' (one field status for both); the form can be prepared and checked, but cannot be approved or submitted until it is resolved in 8.1 or answered
Proposed here An answer-list miss or an overflow follows its rule and is shown, never hidden
Founder decision 'Not yet supported' arises only when the case must use a form edition Expat Ready has not yet mapped (for example after a government cut-off); the case's other work continues
Founder decision A newly published map reaches this form only when the case adopts the new version (10.3); the case keeps its pinned version until then

EXCEPTIONS

The map version changed since the case opened: handled as a change (10.3)
Example · Client A
Client A's family-information form (Example)
Field	Resolves to	Value	Status
Date of birth (Applicant)	Client A · date of birth	12 Apr 1990	filled
Date of birth (Spouse/common-law partner)	Client A's partner · date of birth	3 Sep 1991	filled
Date of birth (Children, row 1)	Client A's child · date of birth	20 Jan 2017	filled
Mailing address	Client A · 'send post here'	(the verified address)	filled
Previous application number	Client A · previous application number		needs a fact

Exception. After a government cut-off, Client A's case must use a new edition of a form that Expat Ready has not mapped yet: that form shows 'Not yet supported' with the date it started waiting. The other forms continue.

Acceptance checks (2)
Normal case. A conflict blocks only the fields that read it; other fields stay visible.
Alternate case. The same facts and versions give the same rendered values.
Sources and detail
Record handed over	Rendered form
Records read · updated	Reads Published pack version, Facts per person or organisation · updates Prepared and submitted outputs
Each box has a status; a form is not ready while a required box is unmapped or needs review	SA-1B-29
Every value traceable to an answer	SA-1B-28
Build gap	The filler holds one value per canonical field, so one form cannot carry Client A's and the partner's dates of birth. (apps/api/src/spine/filler.service.ts:94-101)

## 8.3 — Check the form's meaning

Activity 8.3
Check the form's meaning
Automatic step · View 5: Prepare each form
Screen: Case › Forms › Form review (flags) proposed
WHAT THIS ACHIEVES

An independent AI check of whether each important field holds the right person's right fact; it decides nothing.

WHO ACTS

AI in the product
drafts, reads documents, checks meaning; never approves

Authority. Flags only; never changes a value or a mapping.

Checked by. Its flags are decided by the agent (8.4); approval stays with the representative (9.3).

BEFORE IT STARTS
Starts when
A form is rendered on a supported form edition.
Needs
Fields carry label, heading, person, fact and evidence.
Works on
Rendered form: each field's label, heading, the person and fact selected, the evidence
HOW IT WORKS

Check important and disputed fields (disputed: the field's fact had a conflict, a 'needs review' value or a client flag on this case): do the person and the fact fit the field?

Read each important or disputed field with its label, heading, the selected person and fact, and the evidence
Flag a mismatch with a one-line reason
Not built yet in today's code.
The immigration-significant flag is not in today's code
Code references: Sources and detail, below.
RESULT AND WHAT HAPPENS NEXT
Produces
Flags with reasons, in the form check view
Next
Agent (8.4)
Then: The agent reviews the flags.
Done when
Every important (immigration-significant) and disputed field has a result.
If not
A flag goes to the agent's review (8.4).
Rules and exceptions (6)
Proposed here A meaning check, separate from read-back: read-back proves copying, this checks selection
Proposed here Proposed; its added value over plain checks is to be measured on the real read's answer key; it is not removed because read-back succeeds
Proposed here The meaning check never changes a value or a mapping
Proposed here A change of AI model or prompt for this check is re-tested against the expected answers before use
Team requirement Important fields use the immigration-significant flag in the team's design

EXCEPTIONS

The checker is unavailable: its fields stay grey ('not checked by AI'), never green, and the form goes to the agent's review (8.4) with the fallback marked; the agent completes a focused meaning review of those fields (person, fact, source) and records it; the approval records that the AI meaning check did not run; every other check still applies
Example · Client A
Two different checks (Example)
Situation	Read-back check (9.1)	Meaning check (here)
Partner field holds the partner's date of birth	pass	pass
Partner field holds Client A's date of birth because the map entry's person is wrong	pass: the selected value was copied exactly	flag: the heading names the partner; the value is Client A's
The form cut off part of a long address	fail	not its job
Acceptance checks (2)
Normal case. A partner field holding Client A's date of birth is flagged, even though read-back would pass.
Alternate case. A field the checker agrees with is still reviewed by people when it is important.
Sources and detail
Record handed over	Form with meaning flags
Records read · updated	Reads Prepared and submitted outputs, Facts per person or organisation, Document evidence · updates Prepared and submitted outputs
Immigration-significant flag	SA-1B-1
Build gap	The immigration-significant flag is in the team's design, not in the code. (SA-1B-1; no match in the capture)

## 8.4 — Review the form's statuses and flags

Activity 8.4
Review the form's statuses and flags
Person step · View 5: Prepare each form
Screen: Case › Forms › Form review › Fields to check proposed
WHAT THIS ACHIEVES

The agent resolves every blocked and flagged field and acknowledges each Critical warning, so a form goes on to filling only when its required checks pass and every flag is decided; a Held field goes on to filling but holds approval until 8.1 resolves it.

WHO ACTS

Agent FIRM
firm staff: Case Manager or Case Officer

Authority. Decides flags; fixes facts in the working view, never a field or a mapping.

BEFORE IT STARTS
Starts when
The meaning check is done, or it was unavailable and the fallback is marked; the representative returned the form; 9.2 found a fact or mapping problem; or the agent takes back a waiting form.
Needs
The agent can see statuses, sources, check results and flags.
Works on
Form with field statuses, check results and meaning flags
HOW IT WORKS

Looks at every blocked, warning, held and flagged field, and every important field even when it is filled and checked; decides correct, wrong fact or wrong mapping. In one line: Work through the 'fields to check' list in the form's own order; decide each flag.

Open the 'fields to check' list
Decide each flag: correct, wrong fact or wrong mapping
Acknowledge each Warning (Critical) with a reason; Advisory items need no reason
Report a wrong mapping to Expat Ready's support
Not built yet in today's code.
The immigration-significant flag is in the team's design, not in the code.
Code references: Sources and detail, below.
RESULT AND WHAT HAPPENS NEXT
Produces
Form ready to fill, a fact to correct, or a mapping reported to support
Next
Filling (9.1, the platform); a wrong fact goes to the agent's verification (8.1); a wrong mapping to Expat Ready's support.
Then: Filling (9.1) starts.
Done when
No blocked item left unresolved; every flagged item decided with a reason; if the AI meaning check did not run, every important and disputed field reviewed against person, fact and source, and that review recorded.
If not
Wrong fact: back to 8.1 (the form re-renders). Wrong mapping: reported to Expat Ready's support; the form waits (showing how long) or is completed by hand if urgent.
Rules and exceptions (7)
Proposed here Each field shows its state in words, the reason and the required action; the colour only supplements the words: Blocked (red): a block-severity check failed, or a fact is missing or in conflict; resolve it and check again, it is never acknowledged. Flagged (red): a meaning flag; the agent decides it with a reason. Warning (amber): a Critical warning, including warn-severity consistency checks; acknowledge it with a reason before approval. Advisory (amber, marked advisory): a Major or Minor warning; shown and listed, no reason needed, never blocks. The field statuses of 8.2 show as: 'needs a fact', 'blocked by conflict' and a blank 'staff enters' field → Blocked until resolved in 8.1; 'needs review' → Held; 'not yet supported' → grey; 'filled' → Filled and checked once the checks pass. Held (amber): 'needs review' or 'still true?' pending; it holds approval until 8.1 resolves it and cannot be acknowledged away. Not checked, no check applies, or form edition not yet supported (grey, with the date it started waiting): a status, never a completed review. Filled and checked (green): not the same as approved
Proposed here One order: the form's own order, plus a 'fields to check' list that jumps to items
Proposed here The agent fixes the fact, never the field
Founder decision A wrong mapping is reported to Expat Ready's support; the form waits until the case adopts the corrected version, or authorised staff complete it by hand if urgent
Proposed here A waiting form shows the date it started waiting, on the form and in the agent's list; no turnaround is promised
Proposed here A read-back mismatch caused by a format or transform is a wrong mapping; a field that refuses written data goes on the type-by-hand list
Proposed here If the AI meaning check is unavailable, its fields stay 'not checked by AI' and the agent's focused review of them (person, fact, source) is completed and recorded; grey alone is a status, never a completed review; hard checks, missing facts, checklist items, read-back and the final-file review still apply
Example · Client A
Fields to check (Example)
Field	State (colour)	Reason	Required action by the agent
Partner's passport expiry	Warning (amber)	expires in 70 days (inside the 90-day warning)	acknowledges; warns, does not block
Partner's address against the lease	Warning (amber)	consistency check: the lease shows another address	checks the fact in 8.1 before the representative sees it
Client A's date of birth (important)	Filled and checked (green)	filled and checked	still listed for focused review
Partner's date of birth	Flagged (red)	meaning flag: the value is Client A's	'wrong mapping': reported to support; the form waits

Exception. If the agent finds the fact itself is wrong (the partner's date was verified as 4 Sep 1991), it goes back to 8.1; the form re-renders after the correction.

Acceptance checks (2)
Normal case. An amber passport warning can be acknowledged and does not block.
Alternate case. A green important field is still listed for focused review.
Sources and detail
Record handed over	Reviewed form
Records read · updated	Reads Prepared and submitted outputs, Facts per person or organisation · updates Review and approval records
Build gap	The immigration-significant flag is in the team's design, not in the code. (SA-1B-1; no match in the capture)

## 8.5 — Complete the form by hand

Activity 8.5
Complete the form by hand
By hand, outside the product's filling · View 5: Prepare each form
Screen: Firm's existing process (outside the product's filling) outside the product
WHAT THIS ACHIEVES

Lets an urgent case go ahead by hand when the product cannot fill the form yet.

WHO ACTS

Agent FIRM
Authorised firm staff, through the firm's existing process.

Authority. Authorised firm staff; no firm-side mapping review and no second configurator.

Checked by. Validated where the form needs it (9.2) and approved by the representative (9.3), as any other form.

BEFORE IT STARTS
Starts when
The agent marks a waiting form urgent.
Needs
The form edition and the verified facts are available to staff.
Works on
Form waiting ('Not yet supported', or a mapping reported wrong), and the case is urgent
HOW IT WORKS
Complete the form by hand through the firm's existing process
Record the form as completed by hand
RESULT AND WHAT HAPPENS NEXT
Produces
Hand-completed form, recorded as completed by hand
Next
Agent (9.2)
Then: Validation where the form needs it, then approval.
Done when
Form completed, marked as completed by hand, and uploaded as the final file.
If not
If the case adopts a version that supports the form first, the waiting form is replaced and prepared again automatically (10.3).
Rules and exceptions (4)
Founder decision Used when a form waits for a mapping (a new edition not yet mapped, or a mapping reported wrong) and the case is urgent
Founder decision No firm-side mapping review and no second configurator
Proposed here This page also names the same hand route for an urgent case with an unresolved Adobe Reader or edition issue at Validate (9.2) and for a portal screen the product cannot fill yet (build gap); the founder's rule above covers waiting for a mapping, so these two uses need the founder's confirmation
Proposed here Hand-entered values are recorded as hand-entered and still need the representative's approval
Example · Client A
A new edition not yet mapped (Example)
After a government cut-off, Client A's case must use a new edition
'Not yet supported', waiting since the day it was marked; the other forms carry on
Urgent: the agent completes it by hand
The representative approves it (9.3)

Exception. Not urgent: Expat Ready publishes the mapping, the case adopts the new version (10.3), and the form is prepared again and fills automatically.

Acceptance checks (2)
Normal case. A hand-completed form still needs the representative's approval.
Alternate case. The case's other forms are not held while this one waits.
Sources and detail
Record handed over	Hand-completed form
Records read · updated	Reads Facts per person or organisation · updates Prepared and submitted outputs

## 9.1 — Fill each form type and read it back

Activity 9.1
Fill each form type and read it back
Automatic step · View 5: Prepare each form
Screen: Case › Forms › Form review › Generate · government portal (extension) proposed
WHAT THIS ACHIEVES

Writes the verified values into the actual form or portal screen and proves each one by reading it back.

WHO ACTS

Platform
the product's code and rules

Authority. Prepares and reads back; a person keeps final submission.

Checked by. Anything for a person goes to the agent (9.2); then the representative approves (9.3).

BEFORE IT STARTS
Starts when
The agent marks the form correct (8.4).
Needs
Supported edition or screen version; required facts verified.
Works on
Reviewed form, answer snapshot, map version, screen fingerprint
HOW IT WORKS

Write each value for the form type, then read every written value back

Standard PDF: write each field
Barcode form: write the verified values into the form's own data; leave template and scripts untouched
Validate-only form: same data write
Portal: the extension checks the screen fingerprint, types each value, reads it back
Not built yet in today's code.
Today's filler fills standard fillable PDFs only; barcode forms and the portal are not built
Code references: Sources and detail, below.
RESULT AND WHAT HAPPENS NEXT
Produces
Filled PDF or typed portal screen, with read-back results
Next
Agent (9.2) if anything needs a person; otherwise the representative (9.3)
Then: Typing by hand where a field refuses written data, and the form's own Validate where its form type has one; then approval.
Done when
Every written value read back and matched, or listed to type by hand.
If not
A read-back mismatch or refused value holds this form (and its approval and submission) and goes to the agent in 9.2; other forms continue.
Rules and exceptions (8)
Team requirement The product never generates a barcode
Proposed here A changed portal screen stops the fill and raises a re-capture
Proposed here Every filled value links to its fact, source and verifier; the output is stamped with form edition, map version and answer snapshot
Proposed here A per-edition 'type by hand' list covers fields that refuse written data
Proposed here After writing, code reads every value back and compares it with the value expected after the map entry's approved transform (an equivalent the form itself is documented to produce also matches); a mismatch holds that form and goes to the agent (9.2), while other forms continue
Proposed here Read-back proves copying, not selection (meaning is checked in 8.3)
Team requirement AI never sets a value on a form at fill time

EXCEPTIONS

A barcode form refuses a value: the field is listed to type by hand; the data-file import route is the fallback
Example · Client A
One line per form type (Example)
Form type	Write	Read back	Expected
Standard fillable PDF	each field by name	each field	values match
Barcode form (IMM 1295)	the form's own data; template and scripts untouched	the data	values match; barcodes made later by Validate (9.2)
Validate-only form	the form's own data	the data	values match; no barcode expected
Portal screen	after the fingerprint check, each value typed	each value from the screen	values match

Exception. The barcode form refuses the partner's date value: the field goes on the type-by-hand list for 9.2; the rest of the form stays filled.

Acceptance checks (2)
Normal case. A changed portal screen fingerprint stops entry before any field is typed.
Alternate case. The same facts and versions re-render byte-identically on a standard fillable PDF.
Sources and detail
Record handed over	Filled form with read-back results
Records read · updated	Reads Facts per person or organisation, Published pack version · updates Prepared and submitted outputs
Never a submission-ready barcode	SA-1B-31
AI never sets a value at fill time	SA-1B-35
Build gap	Barcode (XFA) forms are rejected by the reader. Proof question for the team: can code write the form's own data, and does Validate then make the barcodes? The planned real read does not answer it: it reads each form's fields and measures matching only. Fallback: the data-file import route, else typed by hand. (apps/api/src/pack-authoring/pdf-acroform-inventory.ts:141-143)
Build gap	Portal capture and portal filling are not built. Proof question: can the extension capture every branch of a screen, within the portal's terms? Fallback: staff type the screen by hand (8.5; proposed, founder to confirm). (No match in the capture)

## 9.2 — Resolve read-back results, type refused fields, validate

Activity 9.2
Resolve read-back results, type refused fields, validate
Person step · View 5: Prepare each form
Screen: Case › Forms › Form review › Read-back · Adobe Reader (Validate) proposed
WHAT THIS ACHIEVES

Clears what read-back and the form's own validation found, and produces the final file.

WHO ACTS

Agent FIRM
firm staff: Case Manager or Case Officer

Authority. Classifies and validates; never fabricates a barcode, edits a mapping or bypasses a failed check.

BEFORE IT STARTS
Starts when
Read-back found a mismatch or a refused field, the form needs its own validation, or the form was completed by hand.
Needs
Correct form edition and a supported validation environment.
Works on
Filled form with read-back mismatches, its type-by-hand list and validation needs
HOW IT WORKS
Classify each read-back mismatch: format or transform (mapping problem) or a field that refuses written data (type by hand)
Type the fields on the edition's type-by-hand list
Classify each validation failure by cause: wrong or missing fact, format or transform, or an Adobe Reader or edition issue
Open each barcode form in Adobe Reader, check it, click Validate; the form makes its barcodes
Upload the validated form
On upload, code re-runs the read-back on the final file where the form type allows; fields it cannot read and every hand-entered field are listed for the representative
Not built yet in today's code.
Re-reading the uploaded final file after typing and Validate is not built. Proof question: can code read back the final file for each form type? Fallback: the representative reads each hand-entered value against its verified fact.
Code references: Sources and detail, below.
RESULT AND WHAT HAPPENS NEXT
Produces
Validated final file with its read-back, or a fact or mapping problem sent back to 8.4
Next
Lead representative (9.3), or the agent's review (8.4)
Then: The representative can approve.
Done when
Every mismatch and validation failure classified; validation result kept with the form; nothing left to type; the final file uploaded and read back, or its unreadable and hand-entered fields listed.
If not
Each failure goes to its cause. A wrong or missing fact, or a format or transform problem, goes back to the agent's review (8.4), which sends a wrong fact to 8.1 (the form re-renders) and reports a wrong mapping to support. An Adobe Reader or edition issue is checked against the edition's known-issues list and validated again in a supported Adobe Reader; if it cannot be resolved and the case is urgent, the form is completed by hand (8.5; proposed, founder to confirm). A correct fact is never changed to satisfy a format.
Rules and exceptions (5)
Proposed here Validation is done by a person, as the government intends
Proposed here A validation failure is fixed at its cause: a wrong or missing fact in 8.1; a format or transform as a wrong mapping (8.4); a Reader or edition issue on the known-issues list. A correct fact is never changed to satisfy a format
Proposed here Expected validation behaviour is defined per form edition; a barcode is expected only where that form type makes one
Proposed here The form stays held until every mismatch is classified and resolved

EXCEPTIONS

Validate shows no barcode: wrong Reader version or an unsupported field; both are on the edition's known-issues list
Example · Client A
Read-back and validation (Example)
Finding	Agent's classification	Next
Partner's date expected 1991-09-03 after the map entry's transform, read back 03/09/91	format or transform: mapping problem	back to 8.4; reported to support
IMM 1295 refuses the partner's date value	field refuses written data	typed by hand here
IMM 1295 (barcode form)	validate in Adobe Reader	barcode page appears

Exception. Validate reports a format error in the partner's date, but the verified date, 3 Sep 1991, is right: the date is not changed; the format is reported as a wrong mapping through 8.4. If Validate instead reports a missing mandatory value (Client A's previous application number), the fact is entered in 8.1, the form re-renders, and Validate runs again.

Acceptance checks (2)
Normal case. A truncated value caused by the map entry's format is classed as a mapping problem and the form is held.
Alternate case. A validate-only form is checked against its expected result without a barcode.
Sources and detail
Record handed over	Validated form
Records read · updated	Reads Prepared and submitted outputs · updates Prepared and submitted outputs
Barcode page created only when a person clicks Validate	SA-1B-31
Build gap	Re-reading the uploaded final file after typing and Validate is not built. Proof question: can code read back the final file for each form type? Fallback: the representative reads each hand-entered value against its verified fact. (No match in the capture)

## 9.3 — Approve the form

Activity 9.3
Approve the form
Person step · View 5: Prepare each form
Screen: Case › Forms › Approve form in the team's design
WHAT THIS ACHIEVES

The representative approves the exact final file that will be signed and filed.

WHO ACTS

Lead representative FIRM
A holder of the firm's form-approve permission on the case: by default the firm's Owner and Case Manager roles hold it; on this page, normally the case's lead representative.

Authority. Approves each form; does not sign for the client.

BEFORE IT STARTS
Starts when
The final file exists (produced in 9.1, or uploaded after 9.2 or 8.5; validated where its form type has its own Validate) or the portal screen is filled; or a signed file that could not be matched to the approved version comes back from signing (9.4).
Needs
The approver holds the firm's form-approve permission on the case (by default the firm's Owner and Case Manager roles hold it; on this page, normally the case's lead representative).
Works on
The final file or portal screen with values, sources, statuses, its own read-back and validation results, and the hand-entered fields listed
HOW IT WORKS

Reads each value against its source, including every hand-entered value; acknowledges every Critical warning, flagged and important item (Advisory items are only listed; a Held field cannot be acknowledged); approves or returns. A blocked item cannot be acknowledged: the form goes back.

Approve each form, each value traceable to its fact
Return a form to the agent with a reason
Not built yet in today's code.
Re-reading the uploaded final file after typing and Validate is not built. Proof question: can code read back the final file for each form type? Fallback: the representative reads each hand-entered value against its verified fact.
Code references: Sources and detail, below.
RESULT AND WHAT HAPPENS NEXT
Produces
Approved form ('form approved' to the case)
Next
Signing (9.4) continues once every required form of the filing is approved; the signatories act next.
Then: The case waits until every required form of the filing is approved at its current version.
Done when
Approval stamped with the final file's fingerprint, the versions and the answer snapshot it covered.
If not
Returned: back to the agent's review (8.4).
Rules and exceptions (10)
Team requirement Nothing is filed without a person's explicit approval per form
Proposed here Approval is stamped with the final file's fingerprint, the versions and the answer snapshot it covered; a later fact change or any change to the approved content withdraws it
Proposed here The expected signing or declaration step (9.4) does not withdraw it: the signed file is linked to the approved content version and its signature evidence, and keeps the approval only when its answers are shown to be unchanged. A signed file that cannot be matched comes back to this check without the approval: if its answers match the approved version, the representative approves it again; if an answer changed, the new value goes to 8.1 as 'needs review' and the form follows that route
Proposed here One approval per form, with explicit acknowledgement of every Warning (Critical), flagged and important item; Advisory items are listed only; no blocked item may remain
Proposed here The representative approves the final file, including hand-entered and form-calculated values; each hand-entered value is read against its verified fact; an earlier read-back never certifies a later edit
Proposed here 'Every form approved' counts the filing's current required forms at their current versions; a withdrawn or superseded approval does not count
Proposed here A form with any field 'needs review' cannot be approved; a proposal or flag that arrives after approval holds that form's submission until 8.1 resolves it
Founder decision Whoever holds the firm's form-approve permission approves the form alone; when that person also prepared it, the record says 'Self-approved'; no second approver is required

EXCEPTIONS

A fact changes after approval: approval withdrawn; the form re-renders and is re-approved
The partner's date was mistyped as 3 Sep 1981 while typing refused fields in 9.2: the final file shows it against the verified 3 Sep 1991; the form cannot be approved and returns to the agent
Example · Client A
Forms on Client A's case (Example)
Form	Representative
Client A · IMM 1295	approved
Client A · family-information form	approved
Client A and partner · IMM 5409	returned: the representative disagrees with the agent's acknowledged address warning

Exception. The partner's address is corrected in 8.1 after approval: the IMM 5409 form's approval is withdrawn; it re-renders and is approved again.

Acceptance checks (2)
Normal case. Changing a fact after approval withdraws that form's approval.
Alternate case. A blocked item prevents approval even when acknowledged; an unacknowledged Warning (Critical) or flagged item also prevents it; Advisory items are listed and do not.
Sources and detail
Record handed over	Approved form
Records read · updated	Reads Prepared and submitted outputs, Facts per person or organisation · updates Review and approval records
Nothing is signed without a person approving it	SA-1B-30
Build gap	Re-reading the uploaded final file after typing and Validate is not built. Proof question: can code read back the final file for each form type? Fallback: the representative reads each hand-entered value against its verified fact. (No match in the capture)

## 9.4 — Sign and declare

Activity 9.4
Sign and declare
Person step · View 6: Sign, submit and record the response · Runs for each required signatory
Screen: Client portal › Signing room in the team's design
WHAT THIS ACHIEVES

Each required signatory signs or declares their own part of the approved forms.

WHO ACTS

Prospect, then client CLIENT PORTAL
Each required signatory: Client A, the partner, or an employer's signatory, each for their own part.

Authority. Each signatory signs only their own part.

BEFORE IT STARTS
Starts when
Every required form of the filing is approved at its current version.
Needs
Signatories identified for each form.
Works on
Approved forms that need a signature or declaration
HOW IT WORKS

Client A and the partner sign and declare their own parts.

Each required signatory signs or declares through the right route
RESULT AND WHAT HAPPENS NEXT
Produces
Signed forms and declarations
Next
Submission (9.5), by the authorised submitter.
Then: Submission can start.
Done when
Every required signature and declaration present; each signed file linked to the approved content version it signs.
If not
A signatory reports a wrong value, or a re-run time-sensitive check blocks: back to 8.1; the fact is corrected, affected approvals are withdrawn, the forms re-render, are approved again and signed again. A signed file that cannot be matched to the approved version: back to the representative's check (9.3), without the approval. A signatory is unavailable: submission waits; nobody signs for them.
Rules and exceptions (8)
Founder decision Submitting, paying, signing and declaring are always done by a person
Proposed here The representative does not sign for the client
Proposed here Answering is not signing: a parent answers for a child, but who signs follows each form's own rules
Proposed here Changed signed or approved content needs the action renewed
Proposed here Signing keeps the content approval only through a verified link: the signed file is matched to the approved content version (answers read back where the form type allows, otherwise compared by the representative); an arbitrary signed upload or a changed answer does not inherit the approval (9.3)
Proposed here Before signing, the platform re-runs time-sensitive checks (3.8); a new block returns that fact to 8.1, and only forms that read it lose their approval
Proposed here A signatory can report a wrong value instead of signing; that fact returns to 8.1, and only forms that read it lose their approval
Proposed here In view 6 the decision 'Problem when signing?' has two return routes: a signatory reports a wrong value, or a re-run check blocks, goes to 8.1 to correct the fact; a signed file that cannot be matched to the approved content goes back to the representative's check (9.3) without the approval. Unchanged facts are not sent to 8.1
Example · Client A
Signatures (Example)
Signatory	Signs
Client A	IMM 1295; IMM 5409
Partner	IMM 5409
Child, aged 9	follows each form's rules

Exception. While signing IMM 5409 the partner reports that the address is out of date: nothing is signed; the address returns to 8.1 and is corrected, the form re-renders, the representative approves it again, and both partners sign.

Exception. Client A signs IMM 1295 and no answer changes: the signed file is linked to the approved version and the filing can be submitted. A signed upload that shows a different date of birth does not inherit the approval: it goes back to the representative.

Immigration conditions, forms and values shown are examples, pending the Immigration SME.

Acceptance checks (2)
Normal case. The representative cannot sign for Client A.
Alternate case. The partner reports the wrong address while signing IMM 5409: the address returns to 8.1, the form re-renders and is re-approved and re-signed; unaffected forms keep their approvals.
Sources and detail
Record handed over	Signed forms
Records read · updated	Reads Prepared and submitted outputs · updates Prepared and submitted outputs, Review and approval records

## 9.5 — Submit and pay

Activity 9.5
Submit and pay
Person step · View 6: Sign, submit and record the response
Screen: Government portal outside the product
WHAT THIS ACHIEVES

Files the application with the government and pays the fee: people do both, never the product.

WHO ACTS

Lead representative FIRM
Authorised submitter: a person who holds the firm's submit permission on the case (normally the lead representative). Fee payer: the client, or the firm on the client's behalf, as recorded in the case's government fees.

Authority. People submit and pay; never the product.

BEFORE IT STARTS
Starts when
All signatures are in.
Needs
Authorised submitter; fee payer identified.
Works on
Approved, signed forms and accepted checklist items
HOW IT WORKS

The authorised submitter submits; the fee is paid by a person

Submit through the government route
Pay the fee
RESULT AND WHAT HAPPENS NEXT
Produces
Submitted application; receipt kept
Next
Government; then the agent records responses
Then: The case waits for government letters.
Done when
Receipt stored against the submission record.
If not
An uncertain outcome (the portal timed out after Submit) is checked on the account before any retry. A time-sensitive check that blocks just before submission returns that fact to 8.1; only forms that read it lose their approval. A required checklist item still open: that filing waits for accepted evidence or an authorised disposition; a recorded reason alone does not clear it.
Rules and exceptions (10)
Founder decision Submitting, paying, signing and declaring are always done by a person
Proposed here An uncertain submission outcome is reconciled before any retry
Proposed here Time-sensitive checks (3.8) run again just before submission
Proposed here The submission record is kept unchanged
Proposed here Every required checklist item of this filing is resolved: either evidence is accepted for it (right document, person and date, accepted by the agent, by reading or by looking at it when reading fails), or it has an authorised disposition the applicable checklist or rule permits (an alternative document or an exception the SME has confirmed), recorded by the agent with that rule and its evidence, and shown to the representative before submission
Proposed here A recorded reason explains a gap; it never clears a required checklist item by itself. An answered question never stands in for a required document. Only the dependent filing waits; expiry still only warns; the representative's approval still applies
Team requirement Before submission, open Critical warnings, an unsigned retainer among them, are listed for the representative
Proposed here Before submission, no form of this filing reads a fact with a replacement 'needs review' or an unanswered 'still true?'; if one appears after approval, that form waits until 8.1 resolves it
Proposed here Before submission, every form of this filing is still approved at its current version; a form marked 'mapping under correction' (10.4) is not submitted
Proposed here Before submission, each form's form edition is checked as still accepted on that date; after a government cut-off the form is blocked until the case adopts the new version (10.3)
Example · Client A
Submission (Example)
Submit
Receipt with an application number
Stored against the submitted answer snapshot

Exception. The portal times out after Submit: the account is checked first, so the application is not filed twice.

Exception. The partner's passport checklist item still shows 're-upload needed': the partner's filing waits; the agent asks for a new scan.

Exception. Staff note 'police certificate not supplied yet': the checklist item stays open and only that filing waits. If the SME-confirmed checklist rule allows an alternative document, staff record the alternative with the rule and its evidence, and the checklist item is resolved.

Acceptance checks (2)
Normal case. The submission record is stored unchanged.
Alternate case. A timed-out submission is never filed twice.
Sources and detail
Record handed over	Application (message to the government)
Records read · updated	Reads Prepared and submitted outputs · updates Prepared and submitted outputs

## 9.6 — Record each government letter

Activity 9.6
Record each government letter
Person step · View 6: Sign, submit and record the response
Screen: Case › Lifecycle (government steps and letters) in the team's design
WHAT THIS ACHIEVES

Keeps each government letter on the right filing, turns each request into a task, and moves a decided filing to After decision or opens the route's next filing.

WHO ACTS

Agent FIRM
The agent records letters and assigns tasks. A decision, or a withdrawal before it, is recorded by a holder of the firm's record-decision permission.

Authority. Records external evidence; the product does not control government processing.

BEFORE IT STARTS
Starts when
A government letter arrives.
Needs
Submission reference known.
Works on
Acknowledgement, biometrics request, request for documents or decision
HOW IT WORKS
Record each letter against the submission record
Assign later requests to the right staff owner
RESULT AND WHAT HAPPENS NEXT
Produces
Case record or assigned task
Next
Agent: a follow-up task, the filing's After decision steps, or the route's next filing
Then: Follow-up assigned; or that filing's decision is recorded: the filing moves to After decision, and a route level the government approved opens the next filing. The case closes when every filing is closed.
Done when
Letter stored on the right case and filing.
If not
A request for documents becomes a task on the case; then the case waits again.
Rules and exceptions (10)
Proposed here Approval readiness, signing, submission and responses apply to each filing on its own; the case groups their outcomes. A filing still being prepared does not hold another filing unless the route requires joint submission (the SME confirms which)
Proposed here Each government step on the row has its deadline rule and usual timeline
Proposed here A request for more documents becomes a task on the case, never a rule
Founder decision A form an officer requests for one applicant is a task: staff complete it by hand in their existing process and upload it as a case document; a recurring gap is reported to Expat Ready's support
Proposed here Government processing is outside the product; submitted evidence is never rewritten
Team requirement A decision moves only that applicant's filing to After decision, not to an end; its follow-up steps keep running; the case closes itself when every filing is closed, and staff holding the record-decision permission can also close it with a reason
Proposed here Open question for the team: may staff close a case while one of its filings is still open?
Team requirement Recording a decision, or withdrawing a filing before its decision, needs the firm's record-decision permission, which is distinct from the submit permission
Team requirement When the government approves a level of a route, the next filing opens on the same case and reuses each person's verified facts one at a time (stages 5 and 6); the platform applies its row's rules to give each person's new forms and documents, and only what is new or still open is asked. Like the rest of the case, it uses the case's pinned pack version unless the agent adopts a newer one (10.3)

EXCEPTIONS

A refusal moves the filing to After decision like any decision; then the route ends or re-routes the journey as it defines, and the next-step options (reconsideration, appeal or re-apply) are offered, never forced
Example · Client A
Messages (Example)
Message	Recorded as	Then
Acknowledgement	receipt on the submission record	wait
Biometrics request	task with its deadline	wait
Request for proof of funds	task on the case	wait
Request for an extra form for Client A	task: completed by hand, uploaded as a case document	wait
Decision	outcome per applicant, recorded by a holder of the record-decision permission	that filing moves to After decision; the case closes when every filing is closed
Two filings on one case (Example: an illustrative case with two applicants; whether a partner files separately depends on the route)
When	Client A's filing	Partner's filing	Case
Week 1	every form approved, signed and submitted	one form still being prepared	open
Week 2	waiting for the government	every form approved; the partner signs; submitted	open
Later	decision recorded: After decision (approval letter and entry date tracked)	still waiting for the government	open: one filing pending
Later still	entry date recorded: filing closed	decision recorded: After decision	open: one filing in After decision
Then	closed	entry date recorded: filing closed	closes: every filing closed
A route with two levels (Example: whether a route has levels, and which, depends on the programme and is confirmed by the SME)
The government approves the first-level filing; a holder of the record-decision permission records the decision
The next filing opens on the same case, reusing each person's verified facts
Its row adds the new forms and documents; only new or still-open questions are asked (stages 5 and 6)
The case stays open until every filing is closed

Immigration conditions, forms and values shown are examples, pending the Immigration SME.

Acceptance checks (4)
Normal case. An acknowledgement is stored against the submitted answer snapshot.
Alternate case. A decision is recorded per applicant.
Alternate case. Both filings of a case are decided, but an after-decision step (the partner's entry date) is still open: the case stays open in After decision.
Alternate case. The government approves the first level of a two-level route: the next filing opens on the same case, reusing the verified facts; the case does not close.
Sources and detail
Record handed over	Government letter
Records read · updated	Reads Prepared and submitted outputs · updates Prepared and submitted outputs

## 10.1 — Watch for change

Activity 10.1
Watch for change
Automatic step · View 7: Watch, triage, publish and adopt a change
Screen: Change watch (scheduled job) › Impact list proposed
WHAT THIS ACHIEVES

Finds changes to official forms, guides and screens, and what each change affects.

WHO ACTS

Platform
the product's code and rules

Authority. Detects and proposes; never changes a published pack version or an open case.

Checked by. Changed items are reviewed and published through 10.2.

BEFORE IT STARTS
Starts when
Scheduled check.
Needs
Registered sources with their previous versions.
Works on
Official form pages, guides, eligibility pages, captured screens
HOW IT WORKS

Re-read, fingerprint and compare; trace what depends on each change

Re-read official form pages, guides, eligibility pages and portal screens on a schedule
Fingerprint and compare
Re-read changed form editions (as in 2.1) only to find which fields changed; list affected combinations and open cases; drafting happens in 10.2
RESULT AND WHAT HAPPENS NEXT
Produces
Change list and impact list (combinations and open cases)
Next
Content publisher (10.2)
Then: Review covers changed items only.
Done when
Every affected item, combination and open case listed.
If not
A source cannot be reached: status 'not verified', never 'no change'.
Rules and exceptions (6)
Proposed here Unchanged fields keep their mappings and approvals, after a dependency check
Proposed here Only changed or new items enter review
Proposed here A guide or rule change can affect an unchanged form field
Proposed here A cut-off date from the government makes adoption required after it
Proposed here A failed source check is 'not verified', never 'no change'

EXCEPTIONS

A new edition is a different form in all but name: treated as new; full review
Example · Client A
A new edition of the family-information form (Example)
Reused	Rechecked	Goes stale
every mapping whose field did not change	4 changed fields, and 1 rule that reads one of them	Client A's approved family-information form, once the case adopts

Exception. The government sets a cut-off date: adoption becomes required after it.

Acceptance checks (2)
Normal case. A guide-only change produces an impact review even when no form field changed.
Alternate case. Unchanged fields keep their mappings after a dependency check.
Sources and detail
Record handed over	Change list and impact list
Records read · updated	Reads Library, Published pack version · updates Library

## 10.2 — Re-run and publish the change

Activity 10.2
Re-run and publish the change
Re-runs setup on the changed items · View 7: Watch, triage, publish and adopt a change
Screen: Review workbench › Changes · Publish proposed
WHAT THIS ACHIEVES

Runs the changed items through the same drafting, checks, review and publishing as setup, to produce a new pack version.

WHO ACTS
Content publisher
SUPER ADMIN
	Starts and coordinates the run on the changed items; once they are re-drafted and checked, reviews each changed item beside its old and new source (as in 5.1).
AI and platform	Re-read and re-draft the changed items, then check and test them (as in 2.1–4.4).
Immigration SME
SUPER ADMIN
	Signs off changed rules, gates and values (as in 5.2).
Second-person approver
SUPER ADMIN
	Publishes the reviewed version, or rejects it (as in 5.3). Never the change's author or submitter, nor the person who drafted or coordinated it.

Authority. Same two-person path as a first publication.

BEFORE IT STARTS
Starts when
The change watch found a change (10.1), or a support ticket was triaged as a new form, a new edition or a wrong mapping (10.4).
Needs
Affected items and dependencies identified; a new edition is in the form library.
Works on
Change list or triaged support ticket, with its impact list
HOW IT WORKS

Run views 1 to 3 on the changed items only: read, draft, check, review, SME sign-off, publishing

Read and draft the changed items only (a new edition goes through 2.1, 3.1 and 3.2)
Review changed items beside old and new source
Second person publishes
Not built yet in today's code.
No immigration-SME role: today's six Expat Ready staff roles are Platform Owner, Admin, Support, Billing, Content publisher and Auditor, so nobody holds a 'confirm rules and values' permission separate from publishing.
Code references: Sources and detail, below.
RESULT AND WHAT HAPPENS NEXT
Produces
New published version
Next
Firms' open cases (adoption, 10.3)
Then: Open cases can see what changes for them.
Done when
New version published with its version comparison.
If not
Rejected: back to review with the reason.
Rules and exceptions (5)
Proposed here Same two-person path as a first publication
Proposed here The version comparison names every changed field, rule and document
Founder decision Changed items are reviewed; approved unchanged items are reused
Founder decision A new form or edition is a form-edition path through reading, drafting, checks and publishing; it does not create a configurator row

EXCEPTIONS

A changed field has no fit: proposed as new field, reviewed

EXAMPLES (THIS STEP REUSES THE SETUP STEPS)

Example in 3.2 · Generate form field maps a drafted mapping, person by person
Example in 5.1 · Review new or changed items review beside the source
Example in 10.3 · Adopt on this case what changes for Client A's case
Acceptance checks (2)
Normal case. Approved unchanged items are not reviewed again.
Alternate case. Every changed field, rule and document is named in the version comparison.
Sources and detail
Record handed over	New published version
Records read · updated	Reads Library, Review and approval records · updates Published pack version, Review and approval records
Build gap	No immigration-SME role: today's six Expat Ready staff roles are Platform Owner, Admin, Support, Billing, Content publisher and Auditor, so nobody holds a 'confirm rules and values' permission separate from publishing. (packages/contracts/src/schemas/role-template.platform.ts:29-305; team design SA-06 SA6-D18)

## 10.3 — Adopt the change on an open case

Activity 10.3
Adopt the change on an open case
Person step · View 7: Watch, triage, publish and adopt a change
Screen: Case › 'What changes for this case' proposed
WHAT THIS ACHIEVES

Moves an open case to the new version deliberately, preparing again only the forms the change affects.

WHO ACTS

Agent FIRM
firm staff: Case Manager or Case Officer

Authority. Authorised staff adopt now or record a deferral (permitted until any government cut-off); filed evidence is never rewritten.

BEFORE IT STARTS
Starts when
A published change affects this open case.
Needs
Old and new difference for the case is available.
Works on
New published version that affects Client A's case
HOW IT WORKS

Reads 'what changes for this case' and adopts now, or later (the deferral is recorded); a government cut-off makes adoption required by that date, and after it the affected forms cannot be submitted until a person adopts.

See what changes for this case
Adopt now, or later; a government cut-off makes it required by that date
RESULT AND WHAT HAPPENS NEXT
Produces
Case on the new version; affected forms re-rendered
Next
Form preparation again (view 5) for the affected forms only: the agent reviews, the representative approves again. A new question or checklist item goes to the client and the agent (stage 6).
Then: Affected forms go through view 5 again.
Done when
Case pinned to the new version; its forms, checklist items, questions and readiness recomputed for the new version; affected approvals withdrawn.
If not
A new rule needs a fact the case does not have: the SQR re-opens that question. What the firm does when a client no longer meets a new eligibility rule is outside this solution.
Rules and exceptions (6)
Proposed here A case keeps its version until a person adopts
Proposed here Adoption re-renders affected forms and withdraws their approvals
Founder decision A newly published map (new edition or corrected mapping) reaches the case only through adoption; only the affected form is prepared again and loses its approval
Proposed here A form waiting for that mapping is replaced by the newly prepared form
Proposed here The agent sees 'what changes for this case' before adopting
Proposed here Adoption recomputes everything the new version changes for this case, not only forms: the required forms, the checklist items (documents), the questions and each filing's readiness; a new required document opens its checklist item and holds the filings that need it (9.5); a requirement that no longer applies is withdrawn, never filed
Example · Client A
Client A's case (Example)
Form	Before	After adoption
Family-information form	approved on version 1	re-rendered on version 2; approval withdrawn; approved again
IMM 1295	approved on version 1	unchanged; approval kept
Checklist: partner's proof of cohabitation (added by the guide only)	not required on version 1	required: checklist item opened for the partner; the partner's filing is held at submission until accepted evidence arrives

Exception. A new rule needs a fact Client A never gave: the SQR re-opens that one question.

Acceptance checks (3)
Normal case. Adoption re-renders the affected forms and withdraws only their approvals.
Alternate case. A form already submitted is not changed.
Alternate case. A guide-only change adds a required document for the partner: adoption opens that checklist item for the partner, and the partner's filing cannot be submitted until it has accepted evidence; no form re-renders and no form approval is withdrawn.
Sources and detail
Record handed over	Case on the new version
Records read · updated	Reads Published pack version, Facts per person or organisation · updates Facts per person or organisation, Review and approval records

## 10.4 — Triage a support ticket

Activity 10.4
Triage a support ticket
Person step · View 7: Watch, triage, publish and adopt a change
Screen: Support queue › Report proposed
WHAT THIS ACHIEVES

Sorts a firm's support ticket into a new form or edition, a wrong mapping, or a mapping that stands.

WHO ACTS

Content publisher SUPER ADMIN
Expat Ready · Super Admin role

Authority. Expat Ready's content publisher; the firm never edits a mapping.

BEFORE IT STARTS
Starts when
A firm contacts Expat Ready's support about a form or a mapping, or the content publisher raises a suspected mapping error from a historical comparison (4.3).
Needs
The report names the case, the form and the field; the publisher can see the mapping and its evidence.
Works on
A firm's support ticket: a form or edition not yet supported, or a mapping that looks wrong
HOW IT WORKS

Reads the report with the form's evidence; decides new form or edition, wrong mapping, or mapping stands. In one line: Confirm what it is; register a new edition, or hold a wrong mapping and list every case that uses it.

Read the ticket beside the form and the map entry's evidence
New form or edition: add it to the form library
Wrong mapping: hold it and its dependents; list every case that uses it
Mapping stands: answer the firm through support
RESULT AND WHAT HAPPENS NEXT
Produces
Triaged ticket: change to run, or 'mapping stands' answer
Next
Content publisher (10.2), or support answers the firm
Then: The change path re-runs only the affected items.
Done when
The ticket is classified; a wrong mapping is held with its dependents and the list of affected cases; in each listed open case the forms that use it are marked 'mapping under correction', with their approval withdrawn, before any submission.
If not
Mapping stands: support tells the firm, and the agent re-checks the fact.
Rules and exceptions (6)
Founder decision Support is the one channel from firms to Expat Ready for forms and mappings; there is no in-product request feature
Founder decision A wrong mapping is held with everything that depends on it; approved, unaffected work stays usable
Proposed here A wrong mapping repeats across cases, so every open case using it is listed in the impact report
Founder decision A listed impact is not enough: in every open case, a form that uses the held mapping is marked 'mapping under correction'; its approval is withdrawn and it cannot be submitted until the case adopts the corrected version (10.3) or authorised staff complete it by hand (8.5); forms that do not use the mapping keep their approvals
Proposed here Forms already submitted are never changed; the firm is told which submitted forms used the mapping, and any follow-up with the government is the firm's decision
Proposed here No turnaround is promised
Example · Client A
A reported wrong mapping (Example)
The agent reports: the partner field on Client A's family-information form holds Client A's date of birth
Triage confirms the map entry's person is wrong; it is held, and three open cases using that edition are listed; in one of them the form was already approved, so its approval is withdrawn and it cannot be submitted
10.2 re-drafts, checks, reviews and publishes the corrected mapping
Each listed case adopts it (10.3)

Exception. The report turns out to be a wrong fact, not a wrong mapping: support answers the firm; the agent corrects the fact in 8.1.

Acceptance checks (3)
Normal case. A wrong-person mapping on the family-information form is held, and every open case using that edition is listed.
Alternate case. A report about a form already supported is answered without any change.
Alternate case. Another firm's case already approved its family-information form with the wrong mapping but has not submitted: that form is marked 'mapping under correction', its approval is withdrawn and it cannot be submitted until the case adopts the corrected version or staff complete it by hand; the case's other forms keep their approvals.
Sources and detail
Record handed over	Triaged ticket and impact list
Records read · updated	Reads Library, Published pack version · updates Library, Review and approval records

## st-1 — Gather the official material

Stage 1
Gather the official material
Set up once per combination and form edition · Stages 1–3
WHAT THIS ACHIEVES

Get the government's official material into the product, read once.

WHO DOES WHAT, IN ORDER
Who	What happens	Result
Content publisher
SUPER ADMIN
	Creates the configurator row and attaches the forms, checklist, guide and eligibility page; captures portal screens if the combination is filed through them; starts the run	A fingerprinted source set and a registered draft run
Platform	Reads each new form edition and splits the checklist, guide and eligibility page	Field inventories and page-linked passages

RUNS

once for each new form edition, checklist or guide

STARTS WITH

A combination to support (new editions, checklists and guides arrive through stages 10–11)

Needs: The combination exists in the programme hierarchy: Pathway › Program › Category › Sub-category

RESULT AND WHAT HAPPENS NEXT

Hands over: Each new form edition read once; checklist and guide split into passages → AI drafting

GOOD TO KNOW
A form edition is read once and reused by every combination that uses it
An unreadable source is held; the rest of the run continues
Rules and exceptions (4)
Founder decision Only Expat Ready's content team runs the engine; firms never run it
Proposed here Every source is kept with its version and the date it was read
Proposed here An unreadable source is held; the rest of the run continues
Not built yet Barcode (XFA) forms are rejected by today's reader. The planned real read lists these forms' fields and measures matching; writing their data, Validate and the barcodes need their own proof by the team
Example · Client A
Client A's combination (Example)
Work permit from outside Canada
Base forms: IMM 1295, the family-information form, the representative form (IMM 5476); the document checklist; the guide. IMM 5409 is added by a rule drafted in stage 2 and read in the same run
Each new form edition read once

Immigration conditions, forms and values shown are examples, pending the Immigration SME.

DETAILED ACTIVITIES

Each opens its full description here; Back returns to this stage.

1.1 · Create row, attach sources · Content publisher · view 1
1.2 · Capture portal screens · Content publisher · view 1
1.3 · Run the engine · Content publisher · view 1
2.1 · Read each new form edition · Platform · view 1
2.2 · Split checklist, guide, criteria · Platform · view 1

## st-2 — AI drafts the configuration

Stage 2
AI drafts the configuration
Set up once per combination and form edition · Stages 1–3
WHAT THIS ACHIEVES

Draft the whole setup for the combination, with a source for every item.

WHO DOES WHAT, IN ORDER
Who	What happens	Result
AI	Matches fields to library fields, writes each form field map, builds the document list and places fields in sections	Draft fields, sections, maps and document lines
AI	Then drafts the rules and eligibility gates	Draft rules and gates, each citing its source
Platform	Assembles the PQR, SQR and staff working view by rules from what was drafted	Three question sets from one set of definitions
AI	Drafts the field and consistency checks	A draft of every item the combination needs, each citing its source

SIDE BY SIDE

field matching and mappings run beside the document list; rules, gates and questionnaires follow

STARTS WITH

Read forms, checklist and guide passages, and the library

RESULT AND WHAT HAPPENS NEXT

Hands over: A draft: fields, sections, form field maps, documents, rules, eligibility gates, PQR, SQR, staff working view and checks, each citing its source → Checks and reviewers

GOOD TO KNOW
No manual mapping: AI picks library sections and fields and writes each mapping, citing its source
A new field or section only when nothing in the library fits
Rules and exceptions (4)
Proposed here Every item cites file, version, page and field or passage
Proposed here A map entry names whose fact fills the field, relative to the form's applicant: self, partner, or child row 1
Proposed here A form edition's mappings are written once and reused by every combination that uses it
Proposed here No AI at fill time: filling later uses these approved mappings
Example · Client A
One field (Example)
IMM 5409 asks for the partner's date of birth
AI matches it to the library's 'date of birth' field, person = partner
The mapping cites the form page; a reviewer sees it beside the proposal
DETAILED ACTIVITIES

Each opens its full description here; Back returns to this stage.

3.1 · Match fields to canonical fields · AI · view 2
3.2 · Generate form field maps · AI · view 2
3.3 · Build the document list · AI · view 2
3.4 · Place fields in sections · AI · view 2
3.5 · Draft conditional rules · AI · view 2
3.6 · Draft eligibility gates · AI · view 2
3.7 · Assemble PQR, SQR, staff view · Platform · view 2
3.8 · Draft field and consistency checks · AI · view 2

## st-3 — Check, review and publish

Stage 3
Check, review and publish
Set up once per combination and form edition · Stages 1–3
WHAT THIS ACHIEVES

Publish only a draft that is checked, reviewed and signed off.

WHO DOES WHAT, IN ORDER
Who	What happens	Result
Platform	Checks structure and references; tests against independent expected answers and, where consented past filed cases exist, compares them (facts verified by staff)	A validation report, test results and the historical comparison, or 'Historical comparison unavailable'
AI	Rechecks each mapping's meaning in a fresh context	Agree or disagree for each mapping
Content publisher
SUPER ADMIN
	Reviews every new or changed item beside its source; decides the items marked 'decide'	Approved, corrected or returned items
Immigration SME
SUPER ADMIN
	Signs off rules, gates, document conditions and values	Signed-off immigration content
Second-person approver
SUPER ADMIN
	Approves and publishes, or rejects with a reason	A published pack version

SIDE BY SIDE

expected-answer tests and the AI recheck, after the structure check; review starts when both finish

STARTS WITH

The draft, with source snippets and test results

RESULT AND WHAT HAPPENS NEXT

Hands over: A published pack version → Every firm's new cases

DECISIONS

DECISION

Any blocking check failure?

Yes→ only the affected items go back to stage 2
No→ review; uncertain items and AI disagreements arrive marked 'decide' and the reviewer decides each with a reason; only a correction is re-drafted

DECISION

Corrected, returned, or rejected by the SME?

Yes→ only those items go back to stage 2
No→ to the approver

DECISION

Approver publishes?

Yes→ published; nothing undecided remains
Rejected→ back to review with the reason
GOOD TO KNOW
Every new or changed item is reviewed beside its source; approved unchanged items are reused
A published version never changes; a change is a new version
Rules and exceptions (5)
Proposed here A blocking failure holds the affected items and everything that depends on them, and returns them to drafting
Proposed here Near-duplicates, uncertain items and AI disagreements reach the reviewer marked 'decide'; they cannot be published undecided
Proposed here AI steps are tested against independently checked expected answers; nothing is measured yet
Proposed here A second person approves and publishes
Founder decision Where consented, staff-checked past filed cases exist for a form edition, they are compared with the map's output before publishing; where none exist, the publication record says 'Historical comparison unavailable'
DETAILED ACTIVITIES

Each opens its full description here; Back returns to this stage.

4.1 · Check structure and references · Platform · view 3
4.2 · Recheck mapping meaning · AI · view 3
4.3 · Test against expected answers · Platform · view 3
4.4 · Hold affected items · Platform · view 3
5.1 · Review new or changed items · Content publisher · view 3
5.2 · Confirm rules, gates, values · Immigration SME · view 3
5.3 · Approve and publish · Second-person approver · view 3

## st-4 — Open the case

Stage 4
Open the case
Every case, at a firm · Two ways in · stages 4–9
WHAT THIS ACHIEVES

Open the case on the current pack version with the right people in the right roles.

WHO DOES WHAT, IN ORDER
Who	What happens	Result
Agent
FIRM
	Opens the case and adds family members with their roles	A case pinned to the current pack version
Platform	Applies the pinned version's rules for each person	Each person's forms, documents and questions
STARTS WITH

A resolved client record, new or existing, and the chosen combination

Needs: Identity resolved: a new record, or the existing client's record; A published version exists for the combination

RESULT AND WHAT HAPPENS NEXT

Hands over: A case with people, roles, forms and documents → Reuse (stage 5), then the family

GOOD TO KNOW
The case is pinned to the pack version that is current when it opens
Each person has one record and one role; names or email never merge people
Rules and exceptions (5)
Team requirement An existing client's new service is a new case on the same client record, on the current pack version; opening it does not alter the earlier case; a later verified change to a shared fact follows the affected-case rules (7.1), and submitted forms never change
Team requirement An existing client is offered instead of a second record; creating one anyway is an explicit, recorded choice
Team requirement A family is one case; each applicant has their own forms, fee and decision
Team requirement Nothing is sent to a person under 18; a parent answers for them

EXCEPTIONS

No published version for the combination: the case cannot open on it; the agent picks another or waits for publishing
DETAILED ACTIVITIES

Each opens its full description here; Back returns to this stage.

6.2 · Find possible duplicates · Platform · view 4
7.1 · Open the case, add family · Agent · view 4

## st-5 — Reuse verified information

Stage 5
Reuse verified information
Every case, at a firm · Two ways in · stages 4–9
WHAT THIS ACHIEVES

Use what the firm has already verified, one fact at a time, so nobody is asked twice.

WHO DOES WHAT, IN ORDER
Who	What happens	Result
Platform	Selects each required fact's current verified value, by rules, not AI	Pre-filled questions and form fields
Platform	Lists what it cannot select	Missing facts, 'still true?', 'needs review' and conflicts, for the family and the agent
STARTS WITH

Each person's shared record: values with source, status, dates and history

RESULT AND WHAT HAPPENS NEXT

Hands over: Pre-filled questions, and a short list of what is missing, due for 'still true?', to review or in conflict → The family and the agent

GOOD TO KNOW
Each fact is chosen on its own (same person, meaning and date), never 'copy the latest case'
A newer unverified value or an unanswered 'still true?' waits; forms that read it cannot be approved or submitted until it is resolved
Rules and exceptions (15)
Team requirement One record per person or organisation inside one firm, shared by all their cases; a case reaches it through the person's resolved identity, never by matching a name or an email
Founder decision Facts belong to the person and are reused across that person's cases inside the same firm only, never across firms; the firm's and the role's permissions apply to every reuse
Team requirement Facts that belong to one application (a job offer, a case-only answer) stay on that case and are never reused as the person's value
Founder decision Household facts (marriage date, children, a shared address) are entered once and linked to both partners; each partner's personal and restricted values stay their own
Team requirement A superseded value is kept as history with its source and dates, never overwritten
Proposed here Each required fact is resolved on its own: same person or organisation, same field meaning and purpose, and the right date or context; never by copying the latest case
Proposed here The selected value is the current verified one: verified by a person, with a known source, and not superseded by a later verified value
Proposed here A later case-open date, upload time or edit time does not by itself make a value more authoritative
Proposed here A newer declared or document-read value that differs from a verified one waits as 'needs review'; it never silently replaces the verified value, and until it is resolved the forms that read that fact cannot be approved or submitted
Proposed here A value correctly superseded by a later verified one is history, not a conflict
Proposed here Two current values with no recorded replacement between them (for example after two records are merged) are a conflict: both are shown with their sources and a person verifies one; nothing is guessed
Proposed here A question about a past date (an address at an earlier application) is answered from the value true at that date; today's value never supersedes it
Founder decision Each field's re-confirmation rule applies on every new case: identity facts are not re-asked unless a new document differs; addresses, jobs and travel are shown pre-filled with 'still true? add anything new'; the client's 'yes, still true' re-confirms the value; until it is answered, forms that read it are held at approval and submission
Team requirement Each case keeps the set of facts it was assessed and filed on; a later change to the shared record never rewrites a submitted form
Proposed here Choosing among values already verified is rules, not AI; AI only proposes values read from new documents (7.3)
Example · Client A
Reusing facts on a new case (Example: every value, case and date is invented)
Field	Selected value · status
Client A's date of birth	12 Apr 1990 · verified · reused

Available information: 12 Apr 1990, verified from the passport on an earlier visitor-visa case (Example); no other value
Reason: Same person, same meaning, verified with a known source; identity facts are not re-asked
Human action: None; shown pre-filled and correctable, never re-typed

Client A's home address ('lives here now')	Address 2 · current · 'still true?' pending until answered (forms that read it are held at approval); Address 1 kept as history

Available information: Address 1, verified on the earlier case; Address 2, verified in Mar 2026 as a move that supersedes Address 1
Reason: A recorded replacement is history, not a conflict; addresses carry a re-confirmation rule
Human action: Client A confirms or corrects Address 2; the address-history question uses Address 1 for its own dates

Partner's passport	Stored: the verified passport · proposed: the new number, 'needs review' · forms that read it: needs review

Available information: Passport verified on the earlier case (expires in 70 days); a new passport number the partner typed in this case's SQR, not yet verified
Reason: A newer unverified answer never replaces a verified fact, and the verified value is not cleared for filing while the proposal is open
Human action: The partner uploads the new passport; in 8.1 the agent verifies the new number (the old one becomes history) or rejects the proposal with evidence; until then forms that read the passport cannot be approved

Partner's date of birth	No value selected · conflict

Available information: 3 Sep 1991 (passport, earlier case) and 4 Sep 1991 (an older enquiry record merged into the partner's record); both verified, no recorded replacement
Reason: Competing verified values with no recorded resolution: nothing is guessed
Human action: The agent checks the passport and verifies one value with a reason; fields that read it wait

Job offer employer	Not reused · asked for this case

Available information: The employer on the earlier case's job offer
Reason: A fact of that application, not of the person
Human action: Client A answers for this case

Partner's police certificate	Offered for reuse · checked against this case's checklist item

Available information: Uploaded and accepted on the earlier case
Reason: A document is reused only if this case's requirements accept its type, person, country and date (values pending the SME)
Human action: The agent accepts it for this checklist item, or requests a new one
Who starts where, and what carries over (Example)
Starting point	Pre-filled
New client, no record	What they answered in the lead form and PQR

How the case starts: Lead form and PQR (6.1); duplicate check (6.2); the firm takes the case (6.3)
Asked: The rest of the SQR and the documents
Never carried over: Nothing to carry

Existing client, profile only (no earlier case)	Verified profile facts

How the case starts: The agent opens a case from the client's record; no new lead
Asked: Missing facts, 'still true?' items, and eligibility questions the new service needs that the record cannot answer
Never carried over: Nothing to carry

Existing client, one earlier case	Each person's verified shared facts; documents this case's checklist accepts

How the case starts: The same: a new case on the same client record, on the current pack version
Asked: Missing facts, 'still true?' items, differences
Never carried over: That case's approvals, signatures, receipts, decision, case-only facts and pack version

Existing client, several closed or active cases	Each fact resolved on its own from the shared record and its history, never 'the latest case'

How the case starts: The same
Asked: As above, plus any conflict between verified values
Never carried over: As above; another active case's forms that read it are prepared again and their approvals withdrawn (7.1)

Any start: a fact is missing	Blank

How the case starts: No change
Asked: The question
Never carried over: A guess

Any start: a fact is due for re-confirmation	The current value, marked 'still true?' (pending)

How the case starts: No change
Asked: 'Still true? add anything new'; it counts only once answered: Client A's 'yes, still true' re-confirms it, a change waits as 'needs review' for the agent; forms that read it are held at approval until then
Never carried over: A silent carry-over

Any start: a newer value is proposed (not yet verified)	The verified value and the proposed one, each with its status; forms that read it: needs review

How the case starts: No change
Asked: The agent verifies the new value or rejects the proposal with evidence (8.1)
Never carried over: A silent replacement

Any start: verified values compete (conflict)	Both values shown as alternatives; none selected for any form

How the case starts: No change
Asked: A person verifies one with a reason; fields that read it wait
Never carried over: A guess
DETAILED ACTIVITIES

Each opens its full description here; Back returns to this stage.

7.1 · Open the case, add family · Agent · view 4
7.2 · SQR answers and uploads · Client and family · view 4
8.1 · Verify every fact once · Agent · view 4

## st-6 — Collect and verify the gaps

Stage 6
Collect and verify the gaps
Every case, at a firm · Two ways in · stages 4–9
WHAT THIS ACHIEVES

Close the gaps and turn every needed value into a verified fact.

WHO DOES WHAT, IN ORDER
Who	What happens	Result
Client and family
CLIENT PORTAL
	Each adult answers only open questions and uploads documents	Declared answers and uploads
AI	Reads each upload	Values proposed from documents, with their page
Agent
FIRM
	Verifies each fact once and decides conflicts	Verified facts with history

RUNS

once for each adult; one reading for each uploaded document

STARTS WITH

Open questions and documents still needed

RESULT AND WHAT HAPPENS NEXT

Hands over: Verified facts with history → Form preparation

DECISIONS

DECISION

Every fact a form needs verified?

Yes→ form preparation
Missing or conflict→ only the forms that read it wait: they can be prepared but stop at review (8.4); a client's answer or document is asked of that client, a staff fact is entered by the agent
'Needs review' or 'still true?'→ prepared, but not approved or submitted until resolved
GOOD TO KNOW
Only open questions are asked; facts that can change show 'still true?'
A value read by AI stays 'proposed' until the agent verifies it
Rules and exceptions (4)
Team requirement Shared household facts are asked once ('same as the principal applicant')
Proposed here An answer supplies the fact, never the document
Team requirement Expiry only warns, at 90 and 30 days by default; it never blocks
Proposed here A wrong fact found later comes back here; correcting it re-prepares every form not yet submitted that reads it
Example · Client A
The partner's passport (Example)
Uploaded once
Proposed: date of birth 3 Sep 1991, page 2
The agent verifies it
Passport expires in 70 days: an amber warning, not a block
DETAILED ACTIVITIES

Each opens its full description here; Back returns to this stage.

7.2 · SQR answers and uploads · Client and family · view 4
7.3 · Read each upload · AI · view 4
8.1 · Verify every fact once · Agent · view 4

## st-7 — Prepare and check each form

Stage 7
Prepare and check each form
Every case, at a firm · Two ways in · stages 4–9
WHAT THIS ACHIEVES

Produce each form from verified facts and prove what was written.

WHO DOES WHAT, IN ORDER
Who	What happens	Result
Platform	Renders each form through its published map and runs the checks	Each field's value, source and status
AI	Checks the meaning of important and disputed fields	Flags with reasons; it changes nothing
Agent
FIRM
	Resolves flags: correct, wrong fact or wrong mapping	A form ready to fill
Platform	Fills the form and reads every value back	A filled form, proven field by field
Agent
FIRM
	Types refused fields, validates and uploads the final file	The final file, for approval

RUNS

once for each required form, side by side

STARTS WITH

Verified facts and the pinned pack version's form field maps

RESULT AND WHAT HAPPENS NEXT

Hands over: Checked forms: one for each person who must complete a form, or one per application → The lead representative

DECISIONS

DECISION

Anything wrong?

Wrong fact→ back to stage 6; forms that read it are prepared again
Wrong mapping→ support ticket to Expat Ready (stage 10)
All clear→ to the representative
GOOD TO KNOW
No AI writes a value; every written value is read back
A form edition not yet supported waits, showing since when; other forms continue
Rules and exceptions (3)
Proposed here A blocked item must be resolved and re-checked; it cannot be acknowledged away
Proposed here A wrong fact goes back to stage 6; a wrong mapping goes to Expat Ready as a support ticket
Proposed here Refused fields are typed by staff and listed for the representative
DETAILED ACTIVITIES

Each opens its full description here; Back returns to this stage.

8.2 · Render the form · Platform · view 5
8.3 · Check the form's meaning · AI · view 5
8.4 · Review statuses and flags · Agent · view 5
8.5 · Complete the form by hand · Agent · view 5
9.1 · Fill and read back · Platform · view 5
9.2 · Resolve read-back, validate · Agent · view 5

## st-8 — Approve, sign and submit

Stage 8
Approve, sign and submit
Every case, at a firm · Two ways in · stages 4–9
WHAT THIS ACHIEVES

Approve, sign and file each filing, with people taking every legal step.

WHO DOES WHAT, IN ORDER
Who	What happens	Result
Lead representative
FIRM
	Approves each final form (the firm's form-approve permission)	Approved forms
Client and family
CLIENT PORTAL
	Each required signatory signs and declares their own part	Signed files linked to the approved versions
Lead representative
FIRM
	The authorised submitter (normally the lead representative) submits; the government fee is paid by the client, or by the firm on the client's behalf	A filed application with its receipt

PER FILING

each applicant's filing moves on its own unless the route requires joint submission (the SME confirms)

STARTS WITH

Each filing's checked forms

RESULT AND WHAT HAPPENS NEXT

Hands over: An application filed with the government → The government

DECISIONS

DECISION

Representative approves the final form?

Yes, every form of the filing→ signing
Returned→ back to stage 7 with a reason

DECISION

Problem when signing?

No: the signed file matches the approved answers→ submission
Signed file does not match→ back to the representative's check; approval not inherited
Wrong value reported, or a re-run check blocks→ back to stage 6 to correct the fact
GOOD TO KNOW
A missing required document holds that filing; a recorded reason alone never clears it
Signing keeps the approval only if the signed file matches the approved answers
Rules and exceptions (3)
Proposed here Approval covers the final file or portal screen
Proposed here Submission checks the filing's required forms and checklist items first (9.5)
Proposed here Approvals, signatures and receipts belong to this filing only and are never copied to another case
DETAILED ACTIVITIES

Each opens its full description here; Back returns to this stage.

9.3 · Approve the form · Lead representative · view 5
9.4 · Sign and declare · Client and family · view 6
9.5 · Submit and pay · Lead representative · view 6

## st-9 — Record the responses

Stage 9
Record the responses
Every case, at a firm · Two ways in · stages 4–9
WHAT THIS ACHIEVES

Keep every government response on the right filing, record each decision, and hand each decided filing to its next step.

WHO DOES WHAT, IN ORDER
Who	What happens	Result
Government
OUTSIDE
	Sends acknowledgements, requests and decisions	Letters for each filing
Agent
FIRM
	Records each letter on its filing; turns requests into tasks	The filing's history and tasks
Agent
FIRM
	A holder of the record-decision permission records each decision	The filing in After decision; a route level the government approved opens the next filing, back at stages 5 and 6
Agent
FIRM
	Completes the after-decision steps in the existing case workflow	Each filing closed; the case closes when every filing is closed

WAITS FOR

the government's acknowledgement, requests and decision, for each filing

STARTS WITH

The acknowledgement, requests and decision from the government

RESULT AND WHAT HAPPENS NEXT

Hands over: Each filing's outcome on the case history, and the route's next filing where the government approves a level → The existing After decision steps of the case; the case closes when every filing is closed

DECISIONS

DECISION

Decision recorded on this filing?

Not yet→ keep waiting
Yes→ the filing moves to After decision; its follow-up steps run in the existing case workflow
Yes, and the government approved a level of a route→ also: the next filing opens on the case's pinned pack version, reusing verified facts (stages 5 and 6)

DECISION

Every filing closed?

No→ the case stays open
Yes→ the case closes itself; staff may also close it with a reason
GOOD TO KNOW
A request becomes a task: it may need a document, a corrected fact (stage 6) or a form completed by hand
A decision is not the end of the case: After decision follows, and a route with levels opens its next filing when the government approves a level
Rules and exceptions (5)
Team requirement A decision moves its filing to After decision, not to an end: its follow-up steps (for example the approval letter, entry date or permit check) keep running; the case closes itself when every filing is closed, or staff close it with a reason
Proposed here Open question for the team: may staff close a case while one of its filings is still open?
Team requirement Recording a decision, or withdrawing a filing before its decision, needs the firm's record-decision permission; recording other letters does not
Team requirement When the government approves a level of a route, the next filing opens on the same case, on its pinned pack version, and reuses verified facts one at a time; its row supplies the new forms and documents
Proposed here Submitted forms are kept exactly as filed
DETAILED ACTIVITIES

Each opens its full description here; Back returns to this stage.

9.6 · Record government letter · Agent · view 6

## st-10 — Find the change

Stage 10
Find the change
When a form, guide or screen changes · Stages 10–12
WHAT THIS ACHIEVES

Find what changed in the official sources, or what a firm reported, and what it affects.

WHO DOES WHAT, IN ORDER
Who	What happens	Result
Platform	Re-reads the official sources on a schedule and compares	Changed items with their impact, or 'not verified'
Content publisher
SUPER ADMIN
	Triages each firm's support ticket	A change to run, or 'mapping stands'
STARTS WITH

A new form edition, guide or portal screen, or a firm's support ticket

RESULT AND WHAT HAPPENS NEXT

Hands over: A list of changed items and what they affect → The content publisher

DECISIONS

DECISION

Anything changed?

No→ nothing happens
Yes→ only changed items go forward
Could not be checked→ 'not verified', shown and checked again; never 'no change'
GOOD TO KNOW
A source that cannot be checked is 'not verified', never 'no change'
Support is the firms' one channel for forms and mappings (from stage 7)
DETAILED ACTIVITIES

Each opens its full description here; Back returns to this stage.

10.1 · Watch for change · Platform · view 7
10.4 · Triage a support ticket · Content publisher · view 7

## st-11 — Review and publish the change

Stage 11
Review and publish the change
When a form, guide or screen changes · Stages 10–12
WHAT THIS ACHIEVES

Publish a new version for the changed items only, with the same safeguards as setup.

WHO DOES WHAT, IN ORDER
Who	What happens	Result
Content publisher
SUPER ADMIN
	Starts and coordinates the run on the changed items	A run on the changed items only
AI	Re-drafts the changed items; the platform checks and tests them	Drafted and checked changes
Content publisher
SUPER ADMIN
	Reviews each changed item beside its old and new source	Reviewed changes
Immigration SME
SUPER ADMIN
	Signs off changed rules and values	Signed-off changes
Second-person approver
SUPER ADMIN
	Approves and publishes; never the change's author or submitter, nor the person who drafted or coordinated it	A new published version
STARTS WITH

The changed items only

RESULT AND WHAT HAPPENS NEXT

Hands over: A new published version → Firms with open cases

GOOD TO KNOW
The same checks and two-person approval and publishing as setup
Earlier versions stay unchanged; new cases start on the new one
DETAILED ACTIVITIES

Each opens its full description here; Back returns to this stage.

10.2 · Re-run and publish · Content publisher · view 7

## st-12 — Open cases adopt it

Stage 12
Open cases adopt it
When a form, guide or screen changes · Stages 10–12
WHAT THIS ACHIEVES

Move each affected open case to the new version deliberately.

WHO DOES WHAT, IN ORDER
Who	What happens	Result
Agent
FIRM
	Reads 'what changes for this case' and adopts now or by the cut-off	The case on the new version
Platform	Prepares only the affected forms again and withdraws only their approvals	Affected forms back at preparation (stage 7)

WAITS FOR

the agent's adoption; the case keeps its version until then

STARTS WITH

'What changes for this case'

RESULT AND WHAT HAPPENS NEXT

Hands over: The case on the new version → Form preparation (stage 7); new questions or documents to stage 6

DECISIONS

DECISION

Does it affect this open case?

Yes→ adopt now, or later (by the cut-off, if there is one)
No→ nothing changes
GOOD TO KNOW
Only affected forms are prepared again, and only their approvals are withdrawn
A government cut-off makes adoption required; submitted forms never change
DETAILED ACTIVITIES

Each opens its full description here; Back returns to this stage.

10.3 · Adopt on this case · Agent · view 7

## st-A — New client

Way in · start
New client
Every case, at a firm · Two ways in · stages 4–9
WHAT THIS ACHIEVES

Establish who the client is and whether the firm takes the case.

WHO DOES WHAT, IN ORDER
Who	What happens	Result
Client and family
CLIENT PORTAL
	Answers the firm's lead form and short PQR	Declared answers and an indicative result
Platform	Looks for people the firm may already know	Possible matches, never an automatic merge
Agent
FIRM
	Decides 'same person?' and whether the firm takes the case	A resolved client record, or a closed lead
RESULT AND WHAT HAPPENS NEXT

Accepted: open the case (stage 4). A returning person is linked to their record, and only what is still open is asked.

Open: Stage 4 · Open the case

DECISIONS

DECISION

Same person as an existing client?

Yes→ link to that record; then the firm decides
No→ a new client record

DECISION

Firm takes the case?

Yes→ open the case
No→ lead closed
GOOD TO KNOW
A possible duplicate always needs the agent's decision: names or email never merge people.
A returning person who uses the lead form is matched to their record here
DETAILED ACTIVITIES

Each opens its full description here; Back returns to this way in.

6.1 · Lead form and PQR · Client and family · view 4
6.2 · Find possible duplicates · Platform · view 4
6.3 · Review the lead · Agent · view 4

## st-B — Existing client, new service

Way in · start
Existing client, new service
Every case, at a firm · Two ways in · stages 4–9
WHAT THIS ACHIEVES

Start a new service for a client the firm already has, with no new lead.

WHO DOES WHAT, IN ORDER
Who	What happens	Result
Agent
FIRM
	Opens a new case from the client's record	A new case on the current pack version; the earlier case is not changed
Platform	Pre-fills each fact from the client's verified record (stage 5)	Only missing facts, 'still true?' items, differences and the new service's own eligibility questions are asked
RESULT AND WHAT HAPPENS NEXT

Open the case (stage 4), then reuse verified information (stage 5).

Open: Stage 4 · Open the case Stage 5 · Reuse verified information

GOOD TO KNOW
No new lead, and no repeat of the lead form or PQR
Only eligibility questions the new service needs, and the record cannot answer, are asked
DETAILED ACTIVITIES

Each opens its full description here; Back returns to this way in.

7.1 · Open the case, add family · Agent · view 4

## symbols — Diagram symbols (BPMN 2.0)

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
Immigration SME Expat Ready · Super Admin role (proposed)
Second-person approver Expat Ready · Super Admin: another Content publisher or the Platform Owner
AI in the product drafts, reads documents, checks meaning; never approves
Platform the product's code and rules
Prospect, then client client portal: family members or the employer's signatory
Agent firm staff: Case Manager or Case Officer
Lead representative firm: RCIC, lawyer or notary, or paralegal
Government outside the product

A pool is one process (one run per combination, case or form). Sequence lines stay inside a pool; dashed message lines cross between pools; dotted lines read or write a shared record. Every activity has an eye button: click it, or the shape, for its full card. Diagrams are drawn at full size; on a narrow screen each view reads as a list. The form pool is marked ||| because it runs once per form, side by side; 'every form of a filing approved' in view 6 stands for the current approvals of all that filing's required forms; a withdrawn or superseded approval does not count.

## actors — Who is who

Who is who

Role names follow the team's design: six Expat Ready staff roles in the Super Admin console; firm roles Case Manager and Case Officer; representative types RCIC, lawyer or notary, paralegal. The Immigration SME is not one of today's staff roles: it is proposed.

Actor	Side · product role	Does	Never does
Content publisher	Expat Ready · Super Admin console
Super Admin role; works in the Content Pack Configurator	Attaches official sources, runs the engine, reviews every new or changed item beside its source, triages firms' support tickets	Publishes its own draft; edits a firm's case
Immigration SME	Expat Ready · Super Admin console
Super Admin role, proposed (the team's documents call this person the SME)	Confirms rules, eligibility gates, documents and values, and signs the expected answers that AI steps are tested against	Publishes the pack version; gives a firm legal advice through the product
Second-person approver	Expat Ready · Super Admin console
Super Admin: another Content publisher or the Platform Owner, never the pack version's author or submitter	Approves and publishes the pack version (the second person)	Edits what it publishes; a fault goes back as a new draft
AI in the product	System · inside the product
Steps inside the product, named in the team's design Drafter, Reader (documents) and Checker (cross-checks); not a user or a role	Drafts the setup, proposes values read from documents, flags meaning doubts	Approves, verifies a fact, publishes, or writes a value on a form
Platform	System · inside the product
Code and rules, named in the team's design Filler (forms) and Reviewer (what is missing); no AI judgement	Reads forms, checks and tests drafts, selects verified facts, fills forms and reads every value back	Decides anything a person must decide
Prospect, then client	Client · client portal
The prospect, then the client and family members, or an employer's signatory	Answers the lead form, PQR and SQR, uploads documents, signs and declares their own parts	Verifies a fact for the firm; sees another adult's restricted values
Agent	Firm · agency workspace
Firm role: Case Manager or Case Officer	Reviews leads, opens cases, verifies each fact once, resolves flags, records government letters, adopts new versions	Edits a form field map or the published configuration; approves a form without the firm's form-approve permission
Lead representative	Firm · agency workspace
Firm: the case's lead representative ('Lead RCIC' in the product), an RCIC, lawyer or notary, or paralegal; approves through the firm's form-approve permission and submits through its submit permission	Approves each final form and normally submits the application; the government fee is paid by the client, or by the firm on the client's behalf, as recorded on the case	Signs for the client
Government	Outside the product
For example the immigration department that receives the forms	Receives the application; sends acknowledgements, requests and decisions	Is controlled by the product

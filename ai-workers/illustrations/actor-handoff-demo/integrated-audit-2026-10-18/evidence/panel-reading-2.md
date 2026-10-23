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

Authority. Drafts placements; a new section needs a person's approval once.

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
Rules and exceptions (5)
Proposed here Sections are selected from the library's sections the engine maintains; a new section needs a person's approval once
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

Authority. Drafts rules only; an ambiguous passage goes to the SME.

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

## 3.6 Draft the eligibility gates
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
Question-set assembly (3.7, AI); the Immigration SME signs off the gates in 5.2.
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

## 3.7 Assemble the PQR view, the SQR and the staff working view
Activity 3.7
Assemble the PQR view, the SQR and the staff working view
Automatic step · View 2: AI drafts the setup
Runs automatically. Results appear in the review workbench (5.1).
WHAT THIS ACHIEVES

Builds the three question sets from one set of definitions: the short PQR, the full SQR and the staff working view.

WHO ACTS

AI in the product
drafts, reads documents, checks meaning; never approves

Authority. Drafts view definitions; needs no live client facts.

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
Then: Checks can run on the complete draft.
Done when
Every gate field is asked by a PQR block; every SQR question has a reason to be asked.
If not
A gate reads a field no PQR block asks: flagged; the block is extended for a person to approve.
Rules and exceptions (4)
Team requirement One PQR per country, in blocks; the combination's PQR is a derived view of the blocks it reads
Proposed here The SQR asks the fewest questions: minus facts already known, minus facts a verified document supplies, minus facts collected from the staff working view or a profile record
Founder decision Facts collected from staff or a profile record (for example the representative's licence number) are never asked of a client; not every application number is one (a previous application number may come from a document or the client)
Team requirement Nothing is asked twice across lead form, PQR and SQR
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

## 3.8 Draft field and consistency checks
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
Advisory readiness: warnings that help the agent, such as expiry inside the warning window
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
Partner's passport expires in 70 days	advisory readiness	warn	amber warning, not a block
Police certificate is recent enough	official document rule	set by the SME	value pending the SME; no threshold invented
Lease address matches the partner's SQR address	cross-record	warn	flagged in 8.4, before the representative sees the form

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

## 4.1 Check structure and references
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

## 4.2 Recheck mapping meaning in a fresh context
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
Proposed here Proposed; its added value over plain checks is measured in the real read
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

## 4.3 Test against independent expected answers
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
Rules and exceptions (10)
Proposed here The answer key is written by hand and signed by the SME before any engine step is trusted
Founder decision Representative cases: wrong-person matches, missing fields, repeated rows, conditional branches, formatting and changed instructions; one good form proves nothing about other forms
Founder decision Acceptance criteria come from business consequences, not from the first experiment's accuracy; measured results are reported separately and never become the standard by default
Founder decision Proposed target, measured result and approved acceptance criterion are labelled separately; a target is never shown as achieved
Founder decision Approved, unchanged items are not re-tested unless something they depend on changed
Proposed here One combined family tests rules together (common-law, a child, and the inside or outside Canada form choice), because errors hide in interactions
Proposed here Expected answers are kept per form edition and rule branch and reused across combinations; the SME signs each once
Proposed here The field and consistency checks drafted in 3.8 are part of the test cases
Proposed here Proposed change to the team's requirement: today publishing runs no test set for gates and grids

EXCEPTIONS

A branch produces no preview: the rule it depends on is listed as unreachable
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
Acceptance checks (2)
Normal case. A deliberately missing conditional document is found against the expected answer.
Alternate case. A favourable total never hides a single blocking failure.
Sources and detail
Record handed over	Test results
Records read · updated	Reads Library · updates Review and approval records
No mandatory test profiles; publishing runs no test set	SA-1B-38 (proposed change)
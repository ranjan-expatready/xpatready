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

## 3.7 Assemble the PQR view, the SQR and the staff working view
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
Founder decision Historical comparison: where consented past filings exist for that exact form edition, their facts, verified by staff, are filled through the map and the result is compared field by field with the form actually filed, before release; each difference is classified as a mapping error, a changed fact, an intentional difference or a mistake in the earlier filed form
Founder decision Where no such past cases exist (a new edition, or before any firm has moved in), release may proceed once the other required checks pass; the release record says 'Historical comparison unavailable' and nothing implies that evidence exists
Founder decision When suitable past cases become available after release, the content publisher runs the comparison; a suspected material mapping error is triaged as a wrong-mapping ticket (10.4): once confirmed, the mapping and its dependent work are held, and open cases' forms that use it are marked 'mapping under correction'; unrelated work stays usable

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
Historical comparison at release (Example: form editions and cases invented)
Form edition	Consented past filings, facts verified by staff	Release record
Family-information form, current edition	40 cases from a firm that has moved in	compared field by field; 2 differences: 1 changed fact (address moved), 1 mistake in the earlier filed form; no mapping error
Family-information form, new edition	none yet	'Historical comparison unavailable'; released on structure checks, expected answers, review and second-person approval; compared once filed cases on this edition exist
Acceptance checks (2)
Normal case. A deliberately missing conditional document is found against the expected answer.
Alternate case. A favourable total never hides a single blocking failure.
Sources and detail
Record handed over	Test results
Records read · updated	Reads Library · updates Review and approval records
No mandatory test profiles; publishing runs no test set	SA-1B-38 (proposed change)

## 4.4 Hold affected items and their dependents
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

## 5.1 Review every new or changed item
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
Near-duplicate: proposed 'Last name' beside the existing 'Family name'	decide: merge or keep both	Merge into 'Family name', then approve
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

## 5.2 Confirm rules, gates, documents and values
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

## 5.3 Approve and publish the pack version
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
Founder decision The release record shows, per new or changed form edition, whether the historical comparison was run or is 'Historical comparison unavailable'
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
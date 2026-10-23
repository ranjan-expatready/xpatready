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
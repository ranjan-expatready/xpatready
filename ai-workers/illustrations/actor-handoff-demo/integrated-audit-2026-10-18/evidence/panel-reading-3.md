## 4.4 Hold affected items and their dependents
Activity 4.4
Hold affected items and their dependents
Automatic step · View 3: Check, review and publish
Screen: Row › Held items proposed
WHAT THIS ACHIEVES

Stops only the failing items and what depends on them, and sends them back for re-drafting; everything else carries on.

WHO ACTS

Platform
the product's code and rules

Authority. May hold items; cannot publish or switch off a whole step on its own.

BEFORE IT STARTS
Starts when
A blocking finding from 4.1 or 4.3, a reviewer's correction (5.1) or an item the SME has not signed off (5.2). AI disagreements and near-duplicates are not held here; they go to review (5.1).
Needs
The dependency list for each item is known (which mappings, rules, views and forms read it).
Works on
A blocking finding, a reviewer's correction or an unconfirmed rule
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

Compares each proposal with the highlighted source; chooses Approve, Correct or Flag; never types a mapping from scratch.

See every new or changed field, section, document type, mapping and setting, beside its source snippet; rules and gates are also confirmed by the SME (5.2)
Accept, edit or reject; submit the pack version when no blocking finding is left and every 'decide' item is decided
RESULT AND WHAT HAPPENS NEXT
Produces
Reviewed structure, or corrections sent back
Next
Immigration SME (5.2)
Then: The SME can confirm rules, gates and values.
Done when
Every new or changed item has a decision recorded with who and when.
If not
A correction holds the item and its dependents (4.4) and sends it back to drafting.
Rules and exceptions (8)
Founder decision During initial review every new or changed item is reviewed; approved unchanged items are reused without another review
Founder decision Model confidence never exempts a new item; rule matches on a new edition are new mappings and are reviewed too, in a grouped list with their evidence
Proposed here The reviewer chooses among proposals or sends an item back; nobody types a mapping from scratch
Proposed here Every accepted label is saved on its field, so the next form matches it by rule
Proposed here Every decision is logged with who and when
Proposed here A wrong mapping is the content team's to fix; a wrong fact on a case is the agent's
Proposed here A for-review finding is closed by the reviewer's recorded, evidence-backed decision; the models never have to agree; nothing marked 'decide' can be published undecided

EXCEPTIONS

Many rejections: the engine re-runs with the corrections as input
Example · Client A
Review beside the source (Example; proposed interaction)
Source evidence	Proposed	Reviewer
Page 2, heading 'Spouse/common-law partner', label 'Date of birth' (highlighted)	the form's applicant's partner · Date of birth	Approve
Page 3, heading 'Children', 'Date of birth' row 1	the form's applicant's child, row 1 · Date of birth	Approve
New section 'Common-law relationship'	proposed new section	Correct the name, then approve
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
The publisher's review is complete.
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
An unconfirmed or corrected item is held (4.4) and returns to drafting.
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

A second person, never the drafter, publishes the reviewed draft as a new pack version, or rejects it.

WHO ACTS

Second-person approver SUPER ADMIN
Expat Ready · Super Admin: another Content publisher or the Platform Owner

Authority. Approves and publishes, or rejects; never edits: any change sends the draft back to review.

BEFORE IT STARTS
Starts when
Both reviews are complete.
Needs
A different authorised person from the author; no blockers; the reviewed draft unchanged.
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
Rules and exceptions (4)
Team requirement The approver is a second person, never the author, and never edits
Proposed here The pack version is imported as one pathway version; every item carries its own version
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

## 6.1 Lead form and PQR
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

## 6.2 Find possible duplicates
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

## 6.3 Review the lead: same person, and take the case?
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

## 7.1 Convert the lead and open the case
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
Proposed here A fact verified on this case updates the shared record; another open case that reads it marks the affected forms 'fact changed', and they follow the usual rule (prepared again, approval withdrawn); submitted forms never change
Proposed here Choosing among verified values is rules, not AI

EXCEPTIONS

Spouse not applying: no forms of their own; their facts fill the principal's partner fields
Client A's filing is decided before the partner's: Client A's filing is recorded as decided; the case stays open until the partner's filing has its decision
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
Never carried over: As above; another active case's affected forms are marked 'fact changed', prepared again and their approvals withdrawn (7.1)

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
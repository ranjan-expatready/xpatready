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

## 7.2 Complete the SQR and upload documents
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
Each adult has submitted; every required fact is answered or will come from an upload. An answer supplies the fact, never the document: a required checklist item stays open until it has accepted evidence or an authorised disposition (9.5); a recorded reason alone does not clear it.
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

## 7.3 Read each uploaded document
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

## 8.1 Verify every fact once in the working view
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

## 8.2 Render the form from the facts
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

## 8.3 Check the form's meaning
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

## 8.4 Review the form's statuses and flags
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
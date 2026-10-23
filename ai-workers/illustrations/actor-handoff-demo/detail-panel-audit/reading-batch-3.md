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
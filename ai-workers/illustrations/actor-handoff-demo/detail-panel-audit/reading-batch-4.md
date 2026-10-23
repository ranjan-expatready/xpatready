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
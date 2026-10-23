## 8.5 Complete the form by hand
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
Proposed here This page also names the same hand route for an urgent case with an unresolved Reader or edition issue at Validate (9.2) and for a portal screen the product cannot fill yet (build gap); the founder's rule above covers waiting for a mapping, so these two uses need the founder's confirmation
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

## 9.1 Fill each form type and read it back
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
Build gap	Portal capture and portal filling are not built. Proof question: can the extension capture every branch of a screen, within the portal's terms? Fallback: staff type the screen by hand (8.5). (No match in the capture)

## 9.2 Resolve read-back results, type refused fields, validate
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
Classify each validation failure by cause: wrong or missing fact, format or transform, or a Reader or edition issue
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
Each failure goes to its cause. A wrong or missing fact, or a format or transform problem, goes back to the agent's review (8.4), which sends a wrong fact to 8.1 (the form re-renders) and reports a wrong mapping to support. A Reader or edition issue is checked against the edition's known-issues list and validated again in a supported Reader; if it cannot be resolved and the case is urgent, the form is completed by hand (8.5). A correct fact is never changed to satisfy a format.
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

## 9.3 Approve the form
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

Reads each value against its source, including every hand-entered value; acknowledges every amber, flagged and important item; approves or returns. A blocked item cannot be acknowledged: the form goes back.

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

## 9.4 Sign and declare
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

## 9.5 Submit and pay
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
Rules and exceptions (9)
Founder decision Submitting, paying, signing and declaring are always done by a person
Proposed here An uncertain submission outcome is reconciled before any retry
Proposed here Time-sensitive checks (3.8) run again just before submission
Proposed here The submission record is kept unchanged
Proposed here Every required checklist item of this filing is resolved: either evidence is accepted for it (right document, person and date, accepted by the agent, by reading or by looking at it when reading fails), or it has an authorised disposition the applicable checklist or rule permits (an alternative document or an exception the SME has confirmed), recorded by the agent with that rule and its evidence, and shown to the representative before submission
Proposed here A recorded reason explains a gap; it never clears a required checklist item by itself. An answered question never stands in for a required document. Only the dependent filing waits; expiry still only warns; the representative's approval still applies
Team requirement Before submission, open Critical warnings, an unsigned retainer among them, are listed for the representative
Proposed here Before submission, no form of this filing reads a fact with a replacement 'needs review' or an unanswered 'still true?'; if one appears after approval, that form waits until 8.1 resolves it
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

## 9.6 Record each government letter
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
Rules and exceptions (9)
Proposed here Approval readiness, signing, submission and responses apply to each filing on its own; the case groups their outcomes. A filing still being prepared does not hold another filing unless the route requires joint submission (the SME confirms which)
Proposed here Each government step on the row has its deadline rule and usual timeline
Proposed here A request for more documents becomes a task on the case, never a rule
Founder decision A form an officer requests for one applicant is a task: staff complete it by hand in their existing process and upload it as a case document; a recurring gap is reported to Expat Ready's support
Proposed here Government processing is outside the product; submitted evidence is never rewritten
Team requirement A decision moves only that applicant's filing to After decision, not to an end; its follow-up steps keep running; the case closes itself when every filing is closed, and staff can also close it with a reason. Whether staff may close a case while a filing is still open is not stated in the team's design: an open question for the team
Team requirement Recording a decision, or withdrawing a filing before its decision, needs the firm's record-decision permission, which is distinct from the submit permission
Team requirement When the government approves a level of a route, the next filing opens on the same case carrying the verified answers forward; the platform applies its row's rules to give each person's new forms and documents, and only what is new or still open is asked (stages 5 and 6). Which pack version the next filing uses is not stated in the team's design: an open question for the team

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
The next filing opens on the same case, carrying the verified answers forward
Its row adds the new forms and documents; only new or still-open questions are asked (stages 5 and 6)
The case stays open until every filing is closed

Immigration conditions, forms and values shown are examples, pending the Immigration SME.

Acceptance checks (4)
Normal case. An acknowledgement is stored against the submitted answer snapshot.
Alternate case. A decision is recorded per applicant.
Alternate case. Both filings of a case are decided, but an after-decision step (the partner's entry date) is still open: the case stays open in After decision.
Alternate case. The government approves the first level of a two-level route: the next filing opens on the same case with the verified answers carried forward; the case does not close.
Sources and detail
Record handed over	Government letter
Records read · updated	Reads Prepared and submitted outputs · updates Prepared and submitted outputs

## 10.1 Watch for change
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

## 10.2 Re-run and publish the change
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

## 10.3 Adopt the change on an open case
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
Form preparation again (view 5) for the affected forms only: the agent reviews, the representative approves again.
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
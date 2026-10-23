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
Questionnaires are submitted; one reading per upload (none if nothing was uploaded).
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
Rules and exceptions (7)
Proposed here A read value is 'proposed from a document' until an agent verifies it; it never fills a form unverified
Founder decision Processing in Canada or the United States only, under written no-training and zero-data-retention terms, with client notice (the same for every AI step)
Proposed here A document that fails to read sends its questions back to the SQR; its checklist item shows 're-upload needed' until it has accepted evidence or an authorised disposition (9.5); a recorded reason alone does not clear it
Proposed here A successful reading proposes values; it does not itself accept the document. When automated reading fails, the agent may accept readable evidence by looking at it, and that acceptance is recorded
Proposed here Past filed cases may be read the same way to seed facts and to test mappings against an independently checked expected answer
Team requirement Expiry only warns, at 90 and 30 days by default; it never blocks

EXCEPTIONS

The document is for the wrong person or expired: flagged on the checklist item
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
Readings are done, or a form reports a fact to correct.
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
A form whose facts are missing or in conflict may render, but stops at 8.4 until they are resolved here. A form whose facts are 'needs review' or 'still true?' is prepared but held at approval and submission; a fact no form reads holds nothing.
If not
A form reports a wrong fact: it comes back here; correcting it re-renders the forms that read it.
Rules and exceptions (9)
Proposed here One current value per person per field; a newer verified value supersedes with history; a newer unverified value that differs waits as 'needs review'; two current verified values with no recorded replacement are a conflict
Proposed here Fields that read a fact in conflict are blocked until the agent decides
Proposed here The working view is the only staff editing surface (clients answer in the portal); a change here re-renders every form that reads it and withdraws earlier approvals
Proposed here A verified fact that changes which forms apply adds or removes forms from the filing's required set: the case asks for any new form; a form no longer required is withdrawn, never filed
Proposed here A new value supersedes the current one only when the agent verifies it as a correction or a change of circumstances; upload or edit time alone never decides
Proposed here Values reused from the person's shared record show their source and date; the agent acts only on re-confirmation items, 'needs review' values and conflicts
Proposed here A verified value with a newer value 'needs review' shows two statuses: the stored value stays verified, but forms that read it cannot be approved or submitted until the agent verifies the new value (the old one becomes history) or rejects the proposal with evidence; unrelated facts and forms continue
Proposed here A value due for 'still true?' may show pre-filled, but it counts as re-confirmed only once it is answered; stable facts with no dispute and no re-confirmation rule need no review

EXCEPTIONS

Two documents disagree: both shown with pages; the agent picks and the choice is logged
Example · Client A
Verifying Client A's facts (Example)
Fact	Proposed from	After the agent
Partner's date of birth	passport, page 2: 3 Sep 1991	verified
Client A's 'send post here' address	SQR answer	verified; differs from 'lives here now', both kept
Representative's licence number	the representative's profile	nothing to enter

Exception. The partner answered 4 Sep 1991, the passport shows 3 Sep 1991: both shown with the page; the agent picks 3 Sep 1991 and the choice is logged.

Acceptance checks (2)
Normal case. Changing the partner's date of birth re-renders every form that reads it and withdraws their approvals.
Alternate case. Two documents that disagree are both shown with pages; the choice is logged.
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
The case asks for this form: when facts are verified, after a fact correction, or after adopting a new version (10.3).
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
The required form edition has no published map: 'Not yet supported'; the form waits (showing how long) and the case's other forms continue.
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
Proposed here Proposed; its added value over plain checks is measured in the real read; it is not removed because read-back succeeds
Proposed here It never changes a value or a mapping
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

The agent resolves everything the form flagged, so only a correct form goes on to filling.

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

Looks at every red, amber and flagged field, and every important field even when green; decides correct, wrong fact or wrong mapping. In one line: Work through the 'fields to check' list in the form's own order; decide each flag.

Open the 'fields to check' list
Decide each flag: correct, wrong fact or wrong mapping
Acknowledge amber warnings
Report a wrong mapping to Expat Ready's support
Not built yet in today's code.
The immigration-significant flag is in the team's design, not in the code.
Code references: Sources and detail, below.
RESULT AND WHAT HAPPENS NEXT
Produces
Form ready to fill, a fact to correct, or a mapping reported to support
Next
Filling (9.1, the platform); a wrong fact goes to the agent's verification (8.1); a wrong mapping to Expat Ready's support.
Then: Filling may start.
Done when
No blocked item left unresolved; every flagged item decided with a reason; if the AI meaning check did not run, every important and disputed field reviewed against person, fact and source, and that review recorded.
If not
Wrong fact: back to 8.1 (the form re-renders). Wrong mapping: reported to Expat Ready's support; the form waits (showing how long) or is completed by hand if urgent.
Rules and exceptions (7)
Proposed here Status colours: red = blocked (a block-severity check failed, or a fact is missing or in conflict: resolved and checked again, never acknowledged) or a meaning flag the agent decides with a reason; amber = a warning (Critical, Major or Minor, including warn-severity consistency checks) acknowledged with a reason, or a hold ('needs review', 'still true?' pending) that cannot be acknowledged away and holds approval until 8.1 resolves it; grey = no check applies, not yet checked (not reviewed), or form edition not yet supported (with the date it started waiting); green = filled and checked, which does not mean approved
Proposed here One order: the form's own order, plus a 'fields to check' list that jumps to items
Proposed here The agent fixes the fact, never the field
Founder decision A wrong mapping is reported to Expat Ready's support; the form waits until the case adopts the corrected version, or authorised staff complete it by hand if urgent
Proposed here A waiting form shows the date it started waiting, on the form and in the agent's list; no turnaround is promised
Proposed here A read-back mismatch caused by a format or transform is a wrong mapping; a field that refuses written data goes on the type-by-hand list
Proposed here If the AI meaning check is unavailable, its fields stay 'not checked by AI' and the agent's focused review of them (person, fact, source) is completed and recorded; grey alone is a status, never a completed review; hard checks, missing facts, checklist items, read-back and the final-file review still apply
Example · Client A
Fields to check (Example)
Field	Colour	Why	Agent
Partner's passport expiry	amber	expires in 70 days (inside the 90-day warning)	acknowledges; warns, does not block
Partner's address against the lease	amber	consistency check: the lease shows another address	checks the fact in 8.1 before the representative sees it
Client A's date of birth (important)	green	filled and checked	still listed for focused review
Partner's date of birth	red	meaning flag: the value is Client A's	'wrong mapping': reported to support; the form waits

Exception. If the agent finds the fact itself is wrong (the partner's date was verified as 4 Sep 1991), it goes back to 8.1; the form re-renders after the correction.

Acceptance checks (2)
Normal case. An amber passport warning can be acknowledged and does not block.
Alternate case. A green important field is still listed for focused review.
Sources and detail
Record handed over	Reviewed form
Records read · updated	Reads Prepared and submitted outputs, Facts per person or organisation · updates Review and approval records
Build gap	The immigration-significant flag is in the team's design, not in the code. (SA-1B-1; no match in the capture)

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
Rules and exceptions (3)
Founder decision Used when a form waits for a mapping (a new edition not yet mapped, or a mapping reported wrong) and the case is urgent
Founder decision No firm-side mapping review and no second configurator
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
Then: Typing by hand and validation where needed; then approval.
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
Build gap	Barcode (XFA) forms are rejected by the reader. Proof question: can code write the form's own data, and does Validate then make the barcodes? The real read answers it. Fallback: the data-file import route, else typed by hand. (apps/api/src/pack-authoring/pdf-acroform-inventory.ts:141-143)
Build gap	Portal capture and portal filling are not built. Proof question: can the extension capture every branch of a screen, within the portal's terms? Fallback: staff type the screen by hand (8.5). (No match in the capture)
## 10.4 Triage a support ticket
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

## st-1 Gather the official material
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

## st-2 AI drafts the configuration
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

## st-3 Check, review and publish
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
No→ review; uncertain items and AI disagreements arrive marked 'decide' and the reviewer decides them, with no re-draft

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
Founder decision Where consented, staff-checked past filed cases exist for a form edition, they are compared with the map's output before release; where none exist, the release record says 'Historical comparison unavailable'
DETAILED ACTIVITIES

Each opens its full description here; Back returns to this stage.

4.1 · Check structure and references · Platform · view 3
4.2 · Recheck mapping meaning · AI · view 3
4.3 · Test against expected answers · Platform · view 3
4.4 · Hold affected items · Platform · view 3
5.1 · Review new or changed items · Content publisher · view 3
5.2 · Confirm rules, gates, values · Immigration SME · view 3
5.3 · Approve and publish · Second-person approver · view 3

## st-4 Open the case
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

## st-5 Reuse verified information
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
DETAILED ACTIVITIES

Each opens its full description here; Back returns to this stage.

7.1 · Open the case, add family · Agent · view 4
7.2 · SQR answers and uploads · Client and family · view 4
8.1 · Verify every fact once · Agent · view 4

## st-6 Collect and verify the gaps
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

## st-7 Prepare and check each form
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

## st-8 Approve, sign and submit
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

## st-9 Record the responses
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
Yes, and the government approved a level of a route→ also: the next filing opens with the verified answers carried forward (stages 5 and 6); which pack version it uses is an open question for the team

DECISION

Every filing closed?

No→ the case stays open
Yes→ the case closes itself; staff may also close it with a reason (whether while a filing is open is an open question for the team)
GOOD TO KNOW
A request becomes a task: it may need a document, a corrected fact (stage 6) or a form completed by hand
A decision is not the end of the case: After decision follows, and a route with levels opens its next filing when the government approves a level
Rules and exceptions (4)
Team requirement A decision moves its filing to After decision, not to an end: its follow-up steps (for example the approval letter, entry date or permit check) keep running; the case closes itself when every filing is closed, or staff close it with a reason (whether staff may do so while a filing is open is an open question for the team)
Team requirement Recording a decision, or withdrawing a filing before its decision, needs the firm's record-decision permission; recording other letters does not
Team requirement When the government approves a level of a route, the next filing opens on the same case carrying the verified answers forward; its row supplies the new forms and documents (which pack version it uses is an open question for the team)
Proposed here Submitted forms are kept exactly as filed
DETAILED ACTIVITIES

Each opens its full description here; Back returns to this stage.

9.6 · Record government letter · Agent · view 6
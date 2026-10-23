## overview
End to end: the process at a glance

A plain-language process map, not BPMN. Read each band left to right: setup happens once and is reused, every case reads the published setup, and a change is published and then adopted. Each stage shows who acts and with what authority, what to know, and the decision that ends it. The eye opens the full contract (receives, does, hands over, rules, exceptions); Example opens Client A's example; hover any mark or tag for its meaning. Stage numbers 1–12 belong to this map; the detailed BPMN views below are numbered 1–7 and their activities 1.1–10.4.

ONCEStages 1–3
1
Gather the official material
2
AI drafts the configuration
3
Check, review and publish
EACH CASETwo ways in · stages 4–9
TWO WAYS IN
New client
Existing client
4
Open the case
5
Reuse verified information
6
Collect and verify the gaps
7
Prepare and check each form
8
Approve, sign and submit
9
Record the responses
ON CHANGEStages 10–12
10
Find the change
11
Review and publish the change
12
Open cases adopt it
ONCE
Set up once per combination and form edition
Stages 1–3
Expat Ready

Not repeated for each client: every case reads the published result. Detailed in views 1–3.

1
Gather the official material

WHO ACTS

Content publisher SUPER ADMIN
attaches the sources
Platform
reads each new form edition

GOOD TO KNOW

A form edition is read once and reused by every combination that uses it
An unreadable source is held; the rest of the run continues

RUNS

once for each new form edition, checklist or guide

Example
then, handing over:
Read forms and passages
2
AI drafts the configuration

WHO ACTS

AI
drafts the whole setup

GOOD TO KNOW

No manual mapping: AI picks library sections and fields and writes each mapping, citing its source
A new field or section only when nothing in the library fits

SIDE BY SIDE

field matching and mappings run beside the document list; rules, gates and questionnaires follow

Example
then, handing over:
Draft with sources
3
Check, review and publish

WHO ACTS

Platform
checks and tests
AI
rechecks meaning
Content publisher SUPER ADMIN
reviews
Immigration SME SUPER ADMIN
signs off rules and values
Second-person approver SUPER ADMIN
approves and publishes

GOOD TO KNOW

Every new or changed item is reviewed beside its source; approved unchanged items are reused
A published version never changes; a change is a new version

SIDE BY SIDE

expected-answer tests and the AI recheck, after the structure check; review starts when both finish

DECISION

Any blocking check failure?

Yes
→ only the affected items go back to stage 2
No
→ review; uncertain items and AI disagreements arrive marked 'decide' and the reviewer decides them, with no re-draft

DECISION

Correction, or a rule not signed off?

Yes
→ only those items go back to stage 2
No
→ to the approver

DECISION

Approver publishes?

Yes
→ published; nothing undecided remains
Rejected
→ back to review with the reason
then, handing over:
Published configuration

End. Pack version published: it joins the shared record below

Published pack version
Shared and read-only. Each new case reads the pack version that is current when it opens; nothing is regenerated or sent for each client.
Read, not sent: each new case reads it when it opens (stage 4)
EACH CASE
Every case, at a firm
Two ways in · stages 4–9
Firm and client

Starts on the pack version that is current when the case opens. Detailed in views 4–6.

TWO WAYS IN
START
New client

WHO ACTS

Client and family CLIENT PORTAL
fills the lead form and PQR
Platform
finds possible duplicates
Agent FIRM
decides

GOOD TO KNOW

A returning person who uses the lead form is matched to their record here

DECISION

Same person as an existing client?

Yes
→ link to that record; then the firm decides
No
→ a new client record

DECISION

Firm takes the case?

Yes
→ open the case
No
→ lead closed
START
Existing client, new service

WHO ACTS

Agent FIRM
opens a new case from the client's record

GOOD TO KNOW

No new lead, and no repeat of the lead form or PQR
Only eligibility questions the new service needs, and the record cannot answer, are asked
then, handing over:
Resolved client
4
Open the case

WHO ACTS

Agent FIRM
opens the case and adds the family
Platform
applies the pinned pack version's rules

GOOD TO KNOW

The case is pinned to the pack version that is current when it opens
Each person has one record and one role; names or email never merge people
then, handing over:
People, roles, pinned pack version
5
Reuse verified information

WHO ACTS

Platform
selects by rules, not AI

GOOD TO KNOW

Each fact is chosen on its own (same person, meaning and date), never 'copy the latest case'
A newer unverified value or an unanswered 'still true?' waits; forms that read it cannot be approved or submitted until it is resolved
Example
then, handing over:
Unresolved facts
6
Collect and verify the gaps

WHO ACTS

Client and family CLIENT PORTAL
answer and upload
AI
proposes values from documents
Agent FIRM
verifies each fact once

GOOD TO KNOW

Only open questions are asked; facts that can change show 'still true?'
A value read by AI stays 'proposed' until the agent verifies it

RUNS

once for each adult; one reading for each uploaded document

DECISION

Every fact a form needs verified?

Yes
→ form preparation
Missing or conflict
→ only the forms that read it wait
'Needs review' or 'still true?'
→ prepared, but not approved or submitted until resolved
Example
Verified facts (stage 6 → stage 7)
7
Prepare and check each form

WHO ACTS

Platform
fills by rules and reads back
AI
flags meaning doubts
Agent FIRM
resolves flags

GOOD TO KNOW

No AI writes a value; every written value is read back
A form edition not yet supported waits, showing since when; other forms continue

RUNS

once for each required form, side by side

DECISION

Anything wrong?

Wrong fact
→ back to stage 6; forms that read it are prepared again
Wrong mapping
→ support ticket to Expat Ready (stage 10)
All clear
→ to the representative
then, handing over:
Checked forms
8
Approve, sign and submit

WHO ACTS

Lead representative FIRM
approves the final file
Client and family CLIENT PORTAL
sign and declare
Lead representative FIRM
submits; the client, or the firm for them, pays the fee

GOOD TO KNOW

A missing required document holds that filing; a recorded reason alone never clears it
Signing keeps the approval only if the signed file matches the approved answers

PER FILING

each applicant's filing moves on its own unless the route requires joint submission (the SME confirms)

DECISION

Representative approves the final form?

Yes, every form of the filing
→ signing
Returned
→ back to stage 7 with a reason

DECISION

Problem when signing?

No: the signed file matches the approved answers
→ submission
Signed file does not match
→ back to the representative's check; approval not inherited
Wrong value reported, or a re-run check blocks
→ back to stage 6 to correct the fact
then, handing over:
Submitted application
9
Record the responses

WHO ACTS

Government OUTSIDE
sends letters
Agent FIRM
records each on its filing

GOOD TO KNOW

A request can reopen a fact (stage 6) or ask for a form completed by hand
Submitted forms are kept exactly as filed

WAITS FOR

the government's acknowledgement, requests and decision, for each filing

DECISION

Every filing decided?

Not yet
→ keep waiting
Yes
→ the case closes
then, handing over:
Each filing's decision

End. The case closes when every filing is decided

Between the bands
Down, stage 7 → 10: a firm's support ticket about a form or a mapping.
Up, stage 12 → 7: after the agent adopts a new published version, only the affected forms are prepared again.
ON CHANGE
When a form, guide or screen changes
Stages 10–12
Expat Ready, then the firm

Reviewed and published like setup; open cases adopt the new version through the agent. Detailed in view 7.

10
Find the change

WHO ACTS

Platform
re-reads sources on a schedule
Content publisher SUPER ADMIN
triages firms' support tickets

GOOD TO KNOW

A source that cannot be checked is 'not verified', never 'no change'
Support is the firms' one channel for forms and mappings (from stage 7)

DECISION

Anything changed?

No
→ nothing happens
Yes
→ only changed items go forward
then, handing over:
Changed items
11
Review and publish the change

WHO ACTS

AI
re-drafts changed items
Content publisher SUPER ADMIN
reviews
Immigration SME SUPER ADMIN
signs off changed rules
Second-person approver SUPER ADMIN
approves and publishes

GOOD TO KNOW

The same checks and two-person approval and publishing as setup
Earlier versions stay unchanged; new cases start on the new one
then, handing over:
New published version
12
Open cases adopt it

WHO ACTS

Agent FIRM
sees 'what changes for this case' and adopts

GOOD TO KNOW

Only affected forms are prepared again, and only their approvals are withdrawn
A government cut-off makes adoption required; submitted forms never change

WAITS FOR

the agent's adoption; the case keeps its version until then

DECISION

Does it affect this open case?

Yes
→ adopt now, or by the cut-off
No
→ nothing changes
then, handing over:
Affected forms

End. Affected forms go back to stage 7; only their approvals are withdrawn

## overview-bpmn
Technical view: the end-to-end BPMN overview For the delivery team: four pools, one collapsed sub-process per detailed view, and who does what by view. Open

## view-v1
SET UP
Expat Ready, once per combination
View 1 · Start and read
Map stages 1

The publisher creates the row and starts the run; code reads only what is new.

Starts: A new combination is needed. (New forms, editions and reported mappings go through the change path, view 7.) · Ends: Continues in view 2: the AI drafts the setup.

Diagram
List
Diagram symbols
Expat Ready: combination setup and change
SUPER ADMIN
SYSTEM
Content publisher
Platform
New combinationneeded
1.1Create row, attach sources
Filed through portal screens?
1.2Capture portal screens
1.3Run the engine
What is new toread?
2.1Read each new form edition
2.2Split checklist, guide, criteria
To view 2
No
Yes
Forms
Checklist, guide
Nothing new
What happens in this view (5 activities · each opens its card)
1.1
Create the configurator row and attach its sources
Content publisher SUPER ADMIN
Select base forms and base documents; attach the official sources
1.2
Capture portal screens
Content publisher SUPER ADMIN
Open each screen of the filing; the extension records its fields
1.3
Run the engine
Content publisher SUPER ADMIN
Choose a full run or a run on changed sources only, then start
2.1
Read each new form edition
Platform
Code extracts every field and, for a barcode form, its template and scripts
Runs for each form edition not yet read
2.2
Split the checklist, the guide and the eligibility page
Platform
Split into source checklist entries, condition passages and criterion sentences

## view-v2
SET UP
Expat Ready, once per combination
View 2 · AI drafts the setup
Map stages 2

One drafting pipeline in the platform; each step drafts only new or changed items and completes at once if there are none. Field matching, mappings and placements run beside the document list.

Starts: From view 1, or held items returned from view 3. · Ends: Continues in view 3: check, review and publish.

Diagram
List
Diagram symbols
Expat Ready: combination setup and change
SYSTEM
AI
From view 1
Held items (view 3)
3.1Match fields to canonical fields
3.3Build the document list
3.2Generate form field maps
Library
3.4Place fields in sections
3.5Draft conditional rules
3.6Draft eligibility gates
3.7Assemble PQR, SQR, staff view
3.8Draft field and consistency checks
To view 3
What happens in this view (8 activities · each opens its card)
3.1
Match each field to a canonical field, or propose a new one
AI
Rule match on an approved label in the same context; otherwise AI proposes the closest canonical field, or a new one
Runs for each new form edition or screen version
3.3
Build the document list
AI
Link each item to a reused or proposed document type; set who provides it and base or conditional, per person
3.2
Generate form field maps
AI
Write one mapping per form field: person, relationship, canonical field, purpose, target, format, conditions, row
Runs for each new form edition or screen version
3.4
Place fields in sections and draft where each value comes from
AI
Reuse the section with the same meaning; propose a new one only when none fits; draft each placement's 'collected from'
3.5
Draft the conditional rules
AI
Draft when / then / for whom / why shown / source
3.6
Draft the eligibility gates
AI
Draft yes/no gates over canonical fields; load points tables as rows with their source
3.7
Assemble the PQR view, the SQR and the staff working view
AI
Build three views of one set of definitions
3.8
Draft field and consistency checks
AI
Draft checks in five groups, each with applicability, inputs, condition, severity, source, timing and the user's action

## view-v3
SET UP
Expat Ready, once per combination
View 3 · Check, review and publish
Map stages 3

Code checks and expected-answer tests run beside a fresh AI recheck. A blocking failure holds only the affected items and what depends on them; AI disagreements and near-duplicates go to the reviewer to decide.

Starts: From view 2. · Ends: Pack version published: new cases open on it (view 4); open cases adopt it as a change (view 7).

Diagram
List
Diagram symbols
Expat Ready: combination setup and change
SYSTEM
SUPER ADMIN
Platform
AI
Content publisher
Immigration SME
Second-person approver
From view 2
4.1Check structureand references
4.3Test against expected answers
4.2Recheck mapping meaning
Any blocking failure?
4.4Hold affected items
5.1Review new or changed items
To view 2
Corrections?
5.2Confirm rules, gates, values
All confirmed?
5.3Approve and publish
Published packversion
Published?
Pack versionpublished
A blocking failure holds only the affected items and what depends onthem
Yes
No
Yes
No
No
Yes
Yes
Rejected
Firm: prospect and case (views 4 and 6)
New version published (open cases adopt it, view7)
What happens in this view (7 activities · each opens its card)
4.1
Check structure and references
Platform
Code checks coverage, references and consistency
4.3
Test against independent expected answers
Platform
Preview each family's questions, documents, forms and filled values; compare
4.2
Recheck mapping meaning in a fresh context
AI
A separate AI run, without the drafting run's reasoning, checks that each person and fact fit the field
4.4
Hold affected items and their dependents
Platform
Hold the item and everything that reads it; send them back to drafting with the evidence
5.1
Review every new or changed item
Content publisher SUPER ADMIN
Approve, correct or flag each, beside its source snippet
5.2
Confirm rules, gates, documents and values
Immigration SME SUPER ADMIN
Confirm, correct or resolve each reading
5.3
Approve and publish the pack version
Second-person approver SUPER ADMIN
Publish, or reject with a reason

## view-v4
PROSPECT AND CASE
Every lead and case, at a firm
View 4 · Prospect to verified facts
Map stages A, B, 4–6

One value per fact: declared by the client, proposed from documents, verified once by the agent.

Starts: A prospect opens the firm's lead form; or an existing client needs a new service and the agent starts from the client's record; or a form reports a fact to correct (from view 6). · Ends: Continues in view 6, which asks for each form (view 5).

Diagram
List
Diagram symbols
Firm: prospect and case
CLIENT
FIRM · AGENCY
SYSTEM
Client and family
Agent
AI
Platform
Lead form opened
6.1Lead form andPQR
6.2Find possible duplicates
6.3Review the lead
Firm takes the case?
Lead closed
7.1Open the case, add family
Existing client, newservice
Published packversion
7.2Answer SQR, upload documents
7.3Read each uploaded document
Required factsavailable?
8.1Verify every fact once
Fact to correct (view6)
To view 6
Forms that read a fact 'needs review' or 'still true?' are prepared but cannot be approved or submitted
Yes
No
Yes
No: back to the SQR
What happens in this view (7 activities · each opens its card)
6.1
Lead form and PQR
Client and family CLIENT PORTAL
Answer the short lead form, then block 0 and the blocks for intent and status
6.2
Find possible duplicates
Platform
Match against existing people and organisations
6.3
Review the lead: same person, and take the case?
Agent FIRM
Decide same or different person; decide whether the firm takes the case
7.1
Convert the lead and open the case
Agent FIRM
Pick the combination (its published version is pinned); add family members with roles; the platform pre-fills from verified facts
7.2
Complete the SQR and upload documents
Client and family CLIENT PORTAL
Answer; upload each document once
Runs for each adult on the case
7.3
Read each uploaded document
AI
Read the document; propose values with page; match it to its checklist item
Runs for each uploaded document
8.1
Verify every fact once in the working view
Agent FIRM
Verify, decide conflicts, enter facts collected from staff

## view-v5
PREPARE AND FILE
Every form and application
View 5 · Prepare each form
Map stages 7–8

Runs once per form, side by side. Field and consistency checks and a meaning check run before filling; every written value is read back after.

Starts: The case asks for this form (view 6, or again after adopting a new version in view 7). · Ends: Form approved, or a fact to correct (messages to the case, view 6); or the form is replaced after the case adopts a new version.

Diagram
List
Diagram symbols
Firm: each form · runs once per form, side by side
SYSTEM
FIRM · AGENCY
Platform
AI
Lead representative
Agent
Prepare this form
8.2Render the form
Form edition supported?
8.3Check the form's meaning
8.4Review statuses and flags
Review result
Fact to correct
Raise a support ticket
9.1Fill and read back
Agent takes it back
Replaced afteradoption
Form replaced
Anything for a person?
Marked urgent
9.2Resolve read-back, validate
8.5Complete the form by hand
Signed file to check
9.3Approve the form
Fact or mapping problem?
Approved?
Form approved
AI checker unavailable: fields stay 'not checked by AI'; the agent reviews them in 8.4
Yes
No: not yet supported
Correct
Wrong fact
Wrong mapping
Yes
No
No
Yes
Yes
Returned
Firm: prospect and case (views 4 and 6)
Expat Ready: combination setup and change (views 1 to 3)
Prepare each form
Fact to correct
Support ticket (wrong mapping, or form not yetsupported)
Form approved
What happens in this view (7 activities · each opens its card)
8.2
Render the form from the facts
Platform
Resolve each field to one verified fact through its mapping; run the field and consistency checks
8.3
Check the form's meaning
AI
Check important and disputed fields: do the person and the fact fit the field?
8.4
Review the form's statuses and flags
Agent FIRM
Work through the 'fields to check' list in the form's own order; decide each flag
9.1
Fill each form type and read it back
Platform
Write each value for the form type, then read every written value back
9.2
Resolve read-back results, type refused fields, validate
Agent FIRM
Classify each mismatch; type listed fields; validate barcode forms in Adobe Reader
8.5
Complete the form by hand
Agent FIRM
Authorised staff complete the form by hand
9.3
Approve the form
Lead representative FIRM
Approve the exact final file, or return it with a reason

## view-v6
PREPARE AND FILE
Every form and application
View 6 · Sign, submit and record the response
Map stages 8–9

The case asks for every form of each filing. Signing, submission and the government's responses then run for each filing on its own, inside the dashed boundary; the case groups their outcomes and closes when every filing is decided.

Starts: From view 4: facts verified. · Ends: Each filing ends when it is decided; the case closes when every filing is decided. Back to 8.1 (view 4) when a form or a signatory reports a wrong fact, or a re-run check blocks; a signed file that does not match the approved version goes back to the representative's check (9.3, view 5).

Diagram
List
Diagram symbols
Firm: prospect and case
FIRM · AGENCY
CLIENT
FIRM · AGENCY
Agent
Client and family
Lead representative
From view 4
Ask for each form
Every form of afiling approved
Fact to correct
9.4Sign and declare
To 8.1 (view 4)
Problem when signing?
To the representative's check
9.5Submit and pay
Government letter
9.6Record government letter
This filing decided?
This filing decided
A required checklist item needs accepted evidence or an authorised disposition; a reason alone never clears it
Wrong value or checkblocks
Signed file does not match
No
Yes
Not yet
Firm: each form (view 5)
Government
Repeats for each filing: each is signed, submitted and decided on its own
Prepare each form
Form approved (each)
Signed file to check (9.3)
Application
Acknowledgement, requests, decision
What happens in this view (3 activities · each opens its card)
9.4
Sign and declare
Client and family CLIENT PORTAL
Each required signatory signs or declares
Runs for each required signatory
9.5
Submit and pay
Lead representative FIRM
The authorised submitter submits; the fee is paid by a person
9.6
Record each government letter
Agent FIRM
Record it against the submission record; turn a request into a task

## view-v7
CHANGE
Whenever a form, guide or screen changes
View 7 · Watch, triage, publish and adopt a change
Map stages 10–12

New forms, editions and corrected mappings come from Expat Ready's daily change watch or from a firm's support ticket. Only changed items are re-run; each open case adopts with 'what changes for this case'.

Starts: A scheduled check, or a firm's support ticket. · Ends: New version published; each affected open case adopts it, and its affected forms are prepared again.

Diagram
List
Diagram symbols
Expat Ready: combination setup and change
SYSTEM
SUPER ADMIN
Firm: prospect and case
FIRM · AGENCY
Platform
Content publisher
Agent
Scheduled check
10.1Watch for change
Anything changed?
No change
10.2Re-run and publish change
New versionpublished
Support ticket
10.4Triage a support ticket
Ticket is about?
Mapping stands: support answers thefirm
No
Yes
Change
Mapping stands
When a published change affects this case
New version
10.3Adopt on this case
Case on the newversion
Firm: each form (view 5)
Prepare affected formsagain
Waiting form replaced
What happens in this view (4 activities · each opens its card)
10.1
Watch for change
Platform
Re-read, fingerprint and compare; trace what depends on each change
10.2
Re-run and publish the change
Content publisher SUPER ADMIN
Run views 1 to 3 on the changed items only: read, draft, check, review, SME sign-off, publishing
10.4
Triage a support ticket
Content publisher SUPER ADMIN
Confirm what it is; register a new edition, or hold a wrong mapping and list every case that uses it
10.3
Adopt the change on an open case
Agent FIRM
See what changes for this case; adopt now, or at the cut-off

## controls
Controls that run through every view
Validation
Five groups, drafted in 3.8: form-native checks, official programme and document rules, cross-record consistency, advisory readiness, read-back. Document expiry warns at 90 and 30 days by default and never blocks; history gaps block submission until filled with a recorded history entry and checked again. Checks run at verification and render; time-sensitive ones again before signing and submission. In the team's words: block = a failed hard check (red, stops approval, never waived); warn = a Critical warning (amber, acknowledged with a reason); advise = a Major or Minor warning. AI drafts checks only in the existing kinds; anything else is a named gap. Records: Library, Facts per person or organisation.
Review and approval
Initial review: every new or changed item is reviewed beside its source, whatever the AI's confidence; approved unchanged items are reused. The SME confirms rules, gates and values; a second person approves and publishes; the representative approves each form; people sign, pay and submit. Records: Review and approval records.
When a check fails
A blocking failure holds the affected item and everything that depends on it for correction and re-testing. AI disagreements, near-duplicates and uncertain items go to the reviewer marked 'decide', never back to drafting until the models agree. Approved, unaffected work stays usable. A whole step is switched off only for a stated, concrete reason. Records: Review and approval records, Library.
Versions
Every item is versioned. A case pins the version it opened on and adopts a newer one only through 10.3. Outputs are stamped with form edition, map version and answer snapshot; approvals are bound to the versions they covered. A change of AI model or prompt for any AI step is a change: the step is re-run against the expected answers before use. Records: Published pack version, Prepared and submitted outputs.
AI processing
Every AI step (drafting, document reading, meaning checks) must process client data in Canada or the United States only, under written no-training and zero-data-retention terms, with client notice; client data must be stored in Canada (a requirement; legal: unconfirmed, no counsel). Records: Document evidence, Facts per person or organisation.
Change
A scheduled re-read finds changes; only changed items go through the same review and publishing; open cases adopt with 'what changes for this case'; a government cut-off makes adoption required. Records: Library, Published pack version.
Two different kinds of check
Check	What it shows	How	Where	What it does not show
Write and read-back check	The selected value was copied correctly into the form or screen.	Code reads every written value back and compares it with the value expected after the map entry's approved transform.	9.1	Does not show that the right person or fact was selected.
Field and consistency check	The facts satisfy the form's, the programme's and common-sense rules (dates in order, addresses agree, documents recent enough).	Checks drafted in 3.8, tested in 4.3, run at verification and render, and again before signing and submission.	3.8 · 4.3 · 8.2 · 8.4 · 9.4 · 9.5	Does not show the field holds the right person's fact.
Meaning check	The right person and the right fact were selected for the field.	Setup: review beside the source, independent expected answers, a fresh-context AI recheck. Case: an AI recheck of important and disputed fields, the agent's review, the representative's approval.	4.2 · 4.3 · 5.1 · 8.3 · 8.4 · 9.3	Does not show the value was written correctly. The AI checker is proposed; its added value is measured in the real read.

At setup

AI drafts
→
code checks structure and references
→
a fresh-context AI recheck of drafted mappings, beside independent expected-answer tests
→
the publisher reviews every new or changed item
→
the SME confirms rules, gates and values
→
a second person approves and publishes

At case time

AI proposes values from documents
→
the agent verifies each fact once
→
rules render each form from published mappings and run the field and consistency checks
→
an AI meaning check flags important or disputed fields
→
the agent reviews flags; code fills and reads every value back
→
the representative approves each form
→
people sign, pay and submit
Principles
Repeatable code, with named limits
Reading, counting, matching approved labels, checking, filling and read-back are code. AI drafts where judgement is needed: new labels, guide prose, placements, rules, gates. People decide.
Reuse first
A field, section or document type that exists is reused. A new one is created only when nothing fits, and a person approves it once.
Every item cites its source
File, version, page and field or passage, with the date read. A reviewer sees the snippet beside the proposal.
Tested before trusted
AI steps are tested against independently checked expected answers. Acceptance criteria come from business consequences; measured results are reported separately. Nothing is measured yet.
Versioned, pinned, reproducible
Every item has a version. A case pins the version it opened on. The same versions and facts give the same values; byte-identical re-rendering is to be proven on standard fillable PDFs (9.1 acceptance); nothing is measured yet.
No AI at fill time
Filling is rules over approved mappings and verified facts. The same facts always give the same form.
Expat Ready runs the engine
Only the content team configures and publishes. Firms consume published combinations; they never author pack content or run the engine.

## records
Shared records

The six places where information is kept. They are data stores, not services: activities read and change them. Click an activity number to open its card; hover it for a one-line preview.

Where each rule comes from:
Team requirement Already in the team's requirement documents; this page follows it.
Founder decision Decided by the founder; changes only with the founder's yes.
Proposed here This solution's proposal; the team decides whether to adopt it.
Not built yet Today's code cannot do this; the evidence is in the Evidence section.
Shared record	In plain words, what it holds and its rules	Read by	Changed by
Library	

The master library of reusable building blocks (fields, sections, documents, forms and their maps) that every combination is assembled from.

Canonical fields, field groups, sections and placements, document types, answer lists, form editions with their field inventories and mappings, portal screen versions, rules and gates; draft and published versions.

Rules (8)
	

Set up (views 1, 2, 3); Change (view 7)

1.11.21.32.12.23.13.23.33.43.53.63.73.84.14.24.34.45.15.25.310.110.210.4	

Set up (views 1, 2, 3); Change (view 7)

1.11.21.32.12.23.13.23.33.43.53.63.73.84.14.45.110.110.4
Published pack version	

The frozen, approved setup that cases use. Nobody edits it; a change is a new version.

One version at a time. For each combination: references to library item versions, its lines (sections, documents, forms) each with who and only-if, rules, gates, views and check evidence.

	

Prospect and case (view 4); Prepare and file (view 5); Change (view 7)

6.17.17.28.29.110.110.310.4	

Set up (view 3); Change (view 7)

5.310.2
Facts per person or organisation	

Everything the firm knows about each person or organisation, with where each value came from and who verified it.

One shared record per person or organisation at the firm, used by every case they are on: one current value per field, with source, status (declared, proposed from a document, verified), verifier, dates and history. Facts that belong to one application stay on that case.

Rules (15)
	

Prospect and case (view 4); Prepare and file (view 5); Change (view 7)

6.26.37.17.27.38.18.28.38.48.59.19.310.3	

Prospect and case (view 4); Change (view 7)

6.16.26.37.17.27.38.110.3
Document evidence	

The documents each person uploaded and what was read from them.

Uploads, read results with page references, the checklist item each one meets, per person.

	

Prospect and case (view 4); Prepare and file (view 5)

7.38.18.3	

Prospect and case (view 4)

7.27.3
Review and approval records	

Who reviewed, signed off, published or approved what, and on which version.

Every review decision, SME sign-off, publication and form approval, bound to the exact versions it covered.

	

Set up (view 3); Change (view 7)

5.15.25.310.2	

Set up (view 3); Prospect and case (view 4); Prepare and file (views 5, 6); Change (view 7)

4.14.24.34.45.15.25.36.38.18.49.39.410.210.310.4
Prepared and submitted outputs	

The forms prepared for each case, their checks, and what was submitted and received back.

Rendered forms, filled PDFs, portal entries, read-back and validation results, submission receipts and government letters.

	

Prepare and file (views 5, 6)

8.38.49.29.39.49.59.6	

Prepare and file (views 5, 6)

8.28.38.59.19.29.49.59.6

## cases
Individual · Family · Corporate

Same engine and package shape; the subjects, filings, answerers, repeats and signing differ.

	Individual	Family	Corporate
Configure and build	Forms the principal completes	Also per-person forms, family schedules, fields about others (partner, child 1, mother)	Employer forms and employer guide; the organisation as a subject
Rules	Answers of one person	Scoped by role and age; repeated per child; a spouse applying or not	Stream, occupation, location; positions as a list
Questionnaires	One SQR	One SQR per adult; a parent answers for a child; shared household facts once	Employer questionnaire; each worker answers in their own linked case
Documents	Base plus conditional	Per person; one upload serves every person it applies to	Business documents reused across the employer's cases
Forms and mappings	One instance of each form	One form per person who must complete it; fields about others filled through the map entry's person and relationship	Employer forms; worker forms in linked cases
Case	One case, one role	One case, a role per person, each with their own fee and decision	One case per assessment, occupation and location; positions link to worker cases
Returning client	A new case from the client's record; each verified fact reused on its own; gaps, 'still true?' items and differences asked	Each family member's own record reused; a new member is added with a duplicate check; household facts stay linked to both partners	A returning employer's next assessment opens as a new case on the same organisation record; business documents reused if this case accepts them
Signing (pending the SME)	The applicant	Each applicant signs their own forms; both partners sign the common-law declaration	The employer's signatory signs employer forms

## evidence
Evidence status

Proposed targets, measured results and approved release criteria are kept apart. Nothing is measured yet: the real read of the official forms comes next.

Measure	Scope	Proposed target	Measured	Approved release criterion
Fields read per form edition	IMM 1295, 5707 (or IMM 5645 if the SME so decides), 5409, 5476	every widget on every page belongs to a read field (completeness)	to be measured	not yet approved
Fields matched by rule, by AI, proposed new	per form edition	no target: describes the work	to be measured	—
Items a person reviews per combination	new or changed fields, mappings, rules, gates	no target during initial review: every new or changed item	to be measured	—
Correctness per AI step	against the independently checked answer key, including wrong-person cases	zero wrong-person values on a family file (a wrong person's fact on a filed form is a serious error)	to be measured	not yet approved
Fields typed by hand per family file	known exceptions: each edition's type-by-hand list	zero outside the known list	to be measured	not yet approved
SME time to sign expected answers	per form edition and rule branch, reused across combinations	no target until measured; watched because it could grow with every combination	to be measured	—
Hours to configure one combination	by hand and with the engine	no target until a baseline exists	baseline not yet measured	—
Runtime AI filling, tested once as the challenger	one form edition, same answer key: family ambiguity, omissions, conditions, repeated rows	whole-form correctness, review time, errors left, cost and time per fill	to be measured	the route changes only on that evidence and with the founder's yes
Added value of the AI meaning checker	flags that plain checks missed, and false alarms	to be set from the business consequence of a missed wrong-person value	to be measured	not yet approved
What today's code cannot do yet
Gap	Evidence	Activities
No immigration-SME role: today's six Expat Ready staff roles are Platform Owner, Admin, Support, Billing, Content publisher and Auditor, so nobody holds a 'confirm rules and values' permission separate from publishing.	packages/contracts/src/schemas/role-template.platform.ts:29-305; team design SA-06 SA6-D18	5.2 · 10.2
A map entry holds only the canonical field, the form field and a transform: no person, relationship, purpose or repeated row.	packages/contracts/src/schemas/spine-masters.ts:169-175	3.2
The filler holds one value per canonical field, so one form cannot carry Client A's and the partner's dates of birth.	apps/api/src/spine/filler.service.ts:94-101	8.2
Barcode (XFA) forms are rejected by the reader. Proof question: can code write the form's own data, and does Validate then make the barcodes? The real read answers it. Fallback: the data-file import route, else typed by hand.	apps/api/src/pack-authoring/pdf-acroform-inventory.ts:141-143	2.1 · 9.1
No field-level tier flag and no 'collected from' setting; the code has per-programme question-set section selections with a marked PQR subset.	spine-masters.ts (SqrSectionSelection.pqrCanonicalFieldKeys)	3.4 · 3.7
Placements are not built.	Team design SA-01B §12	3.4
The immigration-significant flag is in the team's design, not in the code.	SA-1B-1; no match in the capture	8.3 · 8.4
Portal capture and portal filling are not built. Proof question: can the extension capture every branch of a screen, within the portal's terms? Fallback: staff type the screen by hand (8.5).	No match in the capture	1.2 · 9.1
The current answer is chosen by replacement link and effective date only; confirmation status is not read, so a newer declared answer would replace a verified one. Re-asking re-confirmation fields on a new case is built.	apps/api/src/spine/answer-store.service.ts:432-436, 247-253; capture-once-resolver.service.ts:77-79	7.1 · 7.2 · 8.1
Re-reading the uploaded final file after typing and Validate is not built. Proof question: can code read back the final file for each form type? Fallback: the representative reads each hand-entered value against its verified fact.	No match in the capture	9.2 · 9.3
Proposed changes to the team's requirements
Requirement	Today	Proposed
Agent glossary · AG-07 (Critical warning)	A Critical warning is never a lock; a holder of the waive permission passes it with a reason.	Keep that for advisory warnings; a failed hard check (form-native or official rule, or a wrong-person value) blocks approval until it is fixed and checked again, and cannot be waived.
SA-06 SA6-D18	Six Expat Ready staff roles; the SME's confirmation of content values is not a role or permission.	Add an Immigration SME role (or a confirmation permission held by that person) for confirming (signing off) rules, gates, documents and values and signing expected answers; it cannot publish.
SA-1B-27	A box map holds purpose, field, transform, value map and overflow.	Add the source person or organisation, the relationship to the form's applicant and the repeated row.
SA-1B-7	A placement sets wording, help, requiredness and hidden optional fields.	Add one 'collected from' setting: client questionnaire, staff working view, profile record, or verified document or record.
SA-1B-38	Gates and grids are trusted by second-person approval; no mandatory test profiles; publishing runs no test set.	AI-generated content is tested against independently checked expected answers before publishing.
SA-1B-35 · SA-1B-28	AI never sets a value on a form at fill time; nothing on a form is generated.	Kept as written.
Doc-1 §5.4	A new answer supersedes the prior one; the current answer is the latest un-superseded one by effective date.	State that a declared or document-read answer that differs from a verified one waits for review and replaces it only when a person verifies it; two current answers meeting after a merge raise a conflict.
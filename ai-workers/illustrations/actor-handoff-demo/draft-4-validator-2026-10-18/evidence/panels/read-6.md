## st-10 Find the change
Stage 10
Find the change
When a form, guide or screen changes · Stages 10–12
WHAT THIS ACHIEVES

Find what changed in the official sources, or what a firm reported, and what it affects.

WHO DOES WHAT, IN ORDER
Who	What happens	Result
Platform	Re-reads the official sources on a schedule and compares	Changed items with their impact, or 'not verified'
Content publisher
SUPER ADMIN
	Triages each firm's support ticket	A change to run, or 'mapping stands'
STARTS WITH

A new form edition, guide or portal screen, or a firm's support ticket

RESULT AND WHAT HAPPENS NEXT

Hands over: A list of changed items and what they affect → The content publisher

DECISIONS

DECISION

Anything changed?

No→ nothing happens
Yes→ only changed items go forward
Could not be checked→ 'not verified', shown and checked again; never 'no change'
GOOD TO KNOW
A source that cannot be checked is 'not verified', never 'no change'
Support is the firms' one channel for forms and mappings (from stage 7)
DETAILED ACTIVITIES

Each opens its full description here; Back returns to this stage.

10.1 · Watch for change · Platform · view 7
10.4 · Triage a support ticket · Content publisher · view 7

## st-11 Review and publish the change
Stage 11
Review and publish the change
When a form, guide or screen changes · Stages 10–12
WHAT THIS ACHIEVES

Publish a new version for the changed items only, with the same safeguards as setup.

WHO DOES WHAT, IN ORDER
Who	What happens	Result
Content publisher
SUPER ADMIN
	Starts and coordinates the run on the changed items	A run on the changed items only
AI	Re-drafts the changed items; the platform checks and tests them	Drafted and checked changes
Content publisher
SUPER ADMIN
	Reviews each changed item beside its old and new source	Reviewed changes
Immigration SME
SUPER ADMIN
	Signs off changed rules and values	Signed-off changes
Second-person approver
SUPER ADMIN
	Approves and publishes; never the change's author or submitter, nor the person who drafted or coordinated it	A new published version
STARTS WITH

The changed items only

RESULT AND WHAT HAPPENS NEXT

Hands over: A new published version → Firms with open cases

GOOD TO KNOW
The same checks and two-person approval and publishing as setup
Earlier versions stay unchanged; new cases start on the new one
DETAILED ACTIVITIES

Each opens its full description here; Back returns to this stage.

10.2 · Re-run and publish change · Content publisher · view 7

## st-12 Open cases adopt it
Stage 12
Open cases adopt it
When a form, guide or screen changes · Stages 10–12
WHAT THIS ACHIEVES

Move each affected open case to the new version deliberately.

WHO DOES WHAT, IN ORDER
Who	What happens	Result
Agent
FIRM
	Reads 'what changes for this case' and adopts now or by the cut-off	The case on the new version
Platform	Prepares only the affected forms again and withdraws only their approvals	Affected forms back at preparation (stage 7)

WAITS FOR

the agent's adoption; the case keeps its version until then

STARTS WITH

'What changes for this case'

RESULT AND WHAT HAPPENS NEXT

Hands over: The case on the new version → Form preparation (stage 7)

DECISIONS

DECISION

Does it affect this open case?

Yes→ adopt now, or later (by the cut-off, if there is one)
No→ nothing changes
GOOD TO KNOW
Only affected forms are prepared again, and only their approvals are withdrawn
A government cut-off makes adoption required; submitted forms never change
DETAILED ACTIVITIES

Each opens its full description here; Back returns to this stage.

10.3 · Adopt on this case · Agent · view 7

## st-A New client
Way in · start
New client
Every case, at a firm · Two ways in · stages 4–9
WHAT THIS ACHIEVES

Establish who the client is and whether the firm takes the case.

WHO DOES WHAT, IN ORDER
Who	What happens	Result
Client and family
CLIENT PORTAL
	Answers the firm's lead form and short PQR	Declared answers and an indicative result
Platform	Looks for people the firm may already know	Possible matches, never an automatic merge
Agent
FIRM
	Decides 'same person?' and whether the firm takes the case	A resolved client record, or a closed lead
RESULT AND WHAT HAPPENS NEXT

Accepted: open the case (stage 4). A returning person is linked to their record, and only what is still open is asked.

Open: Stage 4 · Open the case

DECISIONS

DECISION

Same person as an existing client?

Yes→ link to that record; then the firm decides
No→ a new client record

DECISION

Firm takes the case?

Yes→ open the case
No→ lead closed
GOOD TO KNOW
A possible duplicate always needs the agent's decision: names or email never merge people.
A returning person who uses the lead form is matched to their record here
DETAILED ACTIVITIES

Each opens its full description here; Back returns to this way in.

6.1 · Lead form and PQR · Client and family · view 4
6.2 · Find possible duplicates · Platform · view 4
6.3 · Review the lead · Agent · view 4

## st-B Existing client, new service
Way in · start
Existing client, new service
Every case, at a firm · Two ways in · stages 4–9
WHAT THIS ACHIEVES

Start a new service for a client the firm already has, with no new lead.

WHO DOES WHAT, IN ORDER
Who	What happens	Result
Agent
FIRM
	Opens a new case from the client's record	A new case on the current pack version; the earlier case is not changed
Platform	Pre-fills each fact from the client's verified record (stage 5)	Only missing facts, 'still true?' items, differences and the new service's own eligibility questions are asked
RESULT AND WHAT HAPPENS NEXT

Open the case (stage 4), then reuse verified information (stage 5).

Open: Stage 4 · Open the case Stage 5 · Reuse verified information

GOOD TO KNOW
No new lead, and no repeat of the lead form or PQR
Only eligibility questions the new service needs, and the record cannot answer, are asked
DETAILED ACTIVITIES

Each opens its full description here; Back returns to this way in.

7.1 · Open the case, add family · Agent · view 4

## symbols Diagram symbols (BPMN 2.0)
Diagram symbols (BPMN 2.0)
User task
System or AI task
Runs for each item
Calls another view
Decision (one path)
Parallel (all paths)
Inclusive (paths that apply)
Wait for first event
Start · end
Message event
Link to another view
Sequence (same pool)
Message (between pools)
Record (data store)
Reads or writes a record
Content publisher Expat Ready · Super Admin role
Immigration SME Expat Ready · Super Admin role (proposed)
Second-person approver Expat Ready · Super Admin: another Content publisher or the Platform Owner
AI in the product drafts, reads documents, checks meaning; never approves
Platform the product's code and rules
Prospect, then client client portal: family members or the employer's signatory
Agent firm staff: Case Manager or Case Officer
Lead representative firm: RCIC, lawyer or notary, or paralegal
Government outside the product

A pool is one process (one run per combination, case or form). Sequence lines stay inside a pool; dashed message lines cross between pools; dotted lines read or write a shared record. Every activity has an eye button: click it, or the shape, for its full card. Diagrams are drawn at full size; on a narrow screen each view reads as a list. The form pool is marked ||| because it runs once per form, side by side; 'every form of a filing approved' in view 6 stands for the current approvals of all that filing's required forms; a withdrawn or superseded approval does not count.

## actors Who is who
Who is who

Role names follow the team's design: six Expat Ready staff roles in the Super Admin console; firm roles Case Manager and Case Officer; representative types RCIC, lawyer or notary, paralegal. The Immigration SME is not one of today's staff roles: it is proposed.

Actor	Side · product role	Does	Never does
Content publisher	Expat Ready · Super Admin console
Super Admin role; works in the Content Pack Configurator	Attaches official sources, runs the engine, reviews every new or changed item beside its source, triages firms' support tickets	Publishes its own draft; edits a firm's case
Immigration SME	Expat Ready · Super Admin console
Super Admin role, proposed (the team's documents call this person the SME)	Confirms rules, eligibility gates, documents and values, and signs the expected answers that AI steps are tested against	Publishes the pack version; gives a firm legal advice through the product
Second-person approver	Expat Ready · Super Admin console
Super Admin: another Content publisher or the Platform Owner, never the pack version's author or submitter	Approves and publishes the pack version (the second person)	Edits what it publishes; a fault goes back as a new draft
AI in the product	System · inside the product
Steps inside the product, named in the team's design Drafter, Reader (documents) and Checker (cross-checks); not a user or a role	Drafts the setup, proposes values read from documents, flags meaning doubts	Approves, verifies a fact, publishes, or writes a value on a form
Platform	System · inside the product
Code and rules, named in the team's design Filler (forms) and Reviewer (what is missing); no AI judgement	Reads forms, checks and tests drafts, selects verified facts, fills forms and reads every value back	Decides anything a person must decide
Prospect, then client	Client · client portal
The prospect, then the client and family members, or an employer's signatory	Answers the lead form, PQR and SQR, uploads documents, signs and declares their own parts	Verifies a fact for the firm; sees another adult's restricted values
Agent	Firm · agency workspace
Firm role: Case Manager or Case Officer	Reviews leads, opens cases, verifies each fact once, resolves flags, records government letters, adopts new versions	Edits a form field map or the published configuration; approves a form without the firm's form-approve permission
Lead representative	Firm · agency workspace
Firm: the case's lead representative ('Lead RCIC' in the product), an RCIC, lawyer or notary, or paralegal; approves through the firm's form-approve permission and submits through its submit permission	Approves each final form and normally submits the application; the government fee is paid by the client, or by the firm on the client's behalf, as recorded on the case	Signs for the client
Government	Outside the product
For example the immigration department that receives the forms	Receives the application; sends acknowledgements, requests and decisions	Is controlled by the product
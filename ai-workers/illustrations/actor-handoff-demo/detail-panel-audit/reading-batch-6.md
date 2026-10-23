## st-10 Find the change
Stage 10
Find the change
When a form, guide or screen changes · Stages 10–12
Platform re-reads sources on a schedule
Content publisher SUPER ADMIN triages firms' support reports
A new form edition, guide or portal screen, or a firm's support report
A scheduled re-read finds what changed and what depends on it; the publisher triages support reports.
A list of changed items and what they affect
The content publisher
A source that cannot be checked is 'not verified', never 'no change'
Support is the firms' one channel for forms and mappings (from stage 7)
Anything changed?
No → nothing happens
Yes → only changed items go forward
Activity 10.1 · Watch for change · Platform · view 7
Activity 10.4 · Triage a support report · Content publisher · view 7

## st-11 Review and release the change
Stage 11
Review and release the change
AI re-drafts changed items
Immigration specialist SUPER ADMIN confirms
The changed items only
The same drafting, checks, review and release as setup run on the changed items.
A new released version
Firms with open cases
The same checks and two-person release as setup
Earlier versions stay unchanged; new cases start on the new one
Activity 10.2 · Re-run and release change · Content publisher · view 7

## st-12 Open cases adopt it
Stage 12
Open cases adopt it
Agent FIRM sees 'what changes for this file' and adopts
'What changes for this file'
The agent adopts the new version on an open case; only affected copies are prepared again, and only their approvals are withdrawn.
The case on the new version
Form preparation (stage 7)
Only affected copies are prepared again, and only their approvals are withdrawn
A government cut-off makes adoption required; submitted copies never change
the agent's adoption; the case keeps its version until then
Does it affect this open case?
Yes → adopt now, or by the cut-off
No → nothing changes
Activity 10.3 · Adopt on this case · Agent · view 7

## st-A New client
Way in A
New client
Client and family CLIENT PORTAL fills the lead form and PQR
Platform finds possible duplicates
Agent FIRM decides
Fills the firm's lead form and short PQR; the platform looks for possible duplicates; the agent decides 'same person?' and whether the firm takes the case.
A returning person who uses the lead form is matched to their record here
Same person as an existing client?
Yes → link to that record and continue as B
No → a new client record
Firm takes the case?
Yes → open the case
No → lead closed
Activity 6.1 · Lead form and PQR · Client and family · view 4

## st-B Existing client, new service
Way in B
Existing client, new service
Agent FIRM opens a new case from the client's record
The agent opens a new case from the client's record: no new lead, no repeat of the lead form or PQR; only the eligibility questions the new service needs, and the record cannot answer, are asked.
No new lead, and no repeat of the lead form or PQR
Only eligibility questions the new service needs, and the record cannot answer, are asked

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
Immigration specialist Expat Ready · Super Admin role (proposed)
Second publisher (releaser) Expat Ready · Super Admin: another Content publisher or the Platform Owner
AI in the product drafts, reads documents, checks meaning; never approves
Platform the product's code and rules
Prospect, then client client portal: family members or the employer's signatory
Agent firm staff: Case Manager or Case Officer
Licensed representative firm: RCIC, lawyer or paralegal
Government outside the product
A pool is one process (one run per combination, case or form copy). Sequence lines stay inside a pool; dashed message lines cross between pools; dotted lines read or write a shared record. Every activity has an eye button: click it, or the shape, for its full card. Diagrams are drawn at full size; on a narrow screen each view reads as a list. The form-copy pool is marked ||| because it runs once per copy, side by side; 'every copy of the filing approved' in view 6 stands for the current approvals of all that filing's required copies; a withdrawn or superseded approval does not count.

## actors Who is who
Who is who
Role names follow the team's design: six Expat Ready staff roles in the Super Admin console; firm roles Case Manager and Case Officer; representative types RCIC, lawyer or notary, paralegal. The immigration specialist is not one of today's staff roles: it is proposed.
Actor	Side · product role	Does	Never does
Content publisher	Expat Ready · Super Admin console
Super Admin role (the configurator)	Attaches official sources, runs the engine, reviews every new or changed item beside its source, triages firms' support reports	Releases its own draft; edits a firm's case
Immigration specialist	Expat Ready · Super Admin console
Super Admin role, proposed (the team's documents call this person the SME)	Confirms rules, eligibility gates, documents and values, and signs the expected answers that AI steps are tested against	Releases the package; gives a firm legal advice through the product
Second publisher (releaser)	Expat Ready · Super Admin console
Super Admin: another Content publisher or the Platform Owner, never the drafter	Releases the versioned package (the second person)	Edits what it releases; a fault goes back as a new draft
AI in the product	Inside the product
Steps inside the product; not a user or a role	Drafts the setup, proposes values read from documents, flags meaning doubts	Approves, confirms a fact, releases, or writes a value on a form
Platform	Inside the product
Code and rules; no AI judgement	Reads forms, checks and tests drafts, selects confirmed facts, fills forms and reads every value back	Decides anything a person must decide
Prospect, then client	Client · client portal
The prospect, then the client and family members, or an employer's signatory	Answers the lead form, PQR and SQR, uploads documents, signs and declares their own parts	Confirms a fact for the firm; sees another adult's restricted values
Agent	Firm · agency workspace
Firm role: Case Manager or Case Officer	Reviews leads, opens cases, confirms each fact once, resolves flags, records government messages, adopts new versions	Edits a mapping or the released configuration; approves a copy for filing
Licensed representative	Firm · agency workspace
Firm: an RCIC, lawyer or notary, or paralegal; usually holds the Case Manager role	Approves each final copy, submits and arranges payment	Signs for the client
Government	Outside the product
For example the immigration department that receives the forms	Receives the application; sends acknowledgements, requests and decisions	Is controlled by the product
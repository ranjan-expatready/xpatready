#!/usr/bin/env python3
"""Content-level ledger for the Solution 1 one-pager cohesion pass: draft 3 (archived) → draft 4 (18 Oct 2026).
Run: python3 tools/s3/cohesion_ledger.py. Compares every string in the archived s3_data.py, s3_panels.py and s3_views.py with
the current files. Every draft 3 string that no longer appears word for word must match one disposition below (finding, kind,
where the content is now and why); the script fails if any does not. Writes checks/one-pager-draft-4-content-ledger-2026-10-18.md.
'Corrected' changes behaviour to match a source or founder decision; 'clarified' rewords the same behaviour; 'layout' is
diagram geometry with no reader-facing meaning. Nothing is listed as removed: no content was deleted without a replacement."""
import ast, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ARCH = os.path.join(ROOT, "..", "archive", "ai-workers", "solution-1-v3-draft3-before-cohesion-2026-10-18", "ai-workers", "tools", "s3")

# (substring of the draft 3 string, kind, finding, where it is now and why)
D = [
    ("v3 · one-pager draft 3", "clarified", "Version", "VERSION: 'v3 · one-pager draft 4: cohesion and correction pass; draft 3 archived whole · 18 Oct 2026'."),
    # M1
    ("closes when every filing is decided", "corrected", "M1", "AG-07 v2.9 BR-20/BR-31: a decision moves a filing to After decision; the case closes when every filing is closed. Now in the overview end marker, stage 9, 9.6 and view 6."),
    ("ends when every filing is decided", "corrected", "M1", "As above (BR-20/BR-31); 9.6 receiver, rules and examples now name After decision and closure when every filing is closed."),
    ("A decision closes only that applicant's filing", "corrected", "M1", "9.6 rule now: the decision moves only that filing to After decision; follow-up steps keep running; the case closes when every filing is closed (BR-20, BR-31)."),
    ("Follow-up assigned; or that applicant's filing is decided", "corrected", "M1", "9.6 receiving condition names After decision and the route's next filing (SA-1B-67)."),
    ("Each filing's outcome on the case history", "corrected", "M1/S3", "Stage 9 hands over the filing's outcome and, where the government approves a level, the route's next filing (SA-1B-67)."),
    ("The case: it closes when every filing is decided", "corrected", "M1", "Stage 9 'to': the existing After decision steps; closure when every filing is closed."),
    ("Every filing decided", "corrected", "M1", "Stage 9 decision and BPMN overview end now 'Decision recorded on this filing?' / 'Every filing closed?' and 'Every filing closed'."),
    ("records each on its filing", "clarified", "M1", "Stage 9 who-line adds that a decision needs the record-decision permission (AG-07 BR-10)."),
    ("Keep every government response on the right filing until each filing is decided", "corrected", "M1", "Stage 9 purpose: record each decision and hand each decided filing to its next step."),
    ("Keeps each government letter on the right filing and turns each request into a task", "clarified", "M1", "9.6 purpose adds After decision and the route's next filing."),
    ("outcome per applicant", "clarified", "M1", "9.6 example: 'outcome per applicant, recorded by a holder of the record-decision permission'."),
    ("that filing ends", "corrected", "M1", "9.6 example: 'that filing moves to After decision; the case closes when every filing is closed'."),
    ("decision recorded: this filing ends", "corrected", "M1", "9.6 two-filings example: After decision with the approval letter and entry date tracked; a further row shows each filing closing."),
    ("closes: every filing decided", "corrected", "M1", "9.6 example's last row: 'closes: every filing closed'."),
    ("decision recorded", "clarified", "M1", "9.6 example cell now 'decision recorded: After decision'."),
    ("decided", "clarified", "M1", "9.6 example rows rewritten around After decision and filing closure (cells 'decided' / 'decision recorded' replaced)."),
    ("This filing decided?", "corrected", "M1", "View 6 gateway renamed 'Decision recorded?' (inclusive): After decision, and for an approved route level the next filing."),
    ("This filing decided", "corrected", "M1", "View 6: inclusive gateway 'Decision recorded?' → 'After decision (case workflow)' and, for an approved route level, 'Next filing (view 4)'."),
    ("Each filing ends when it is decided", "corrected", "M1", "View 6 'ends' text: After decision, next filing of a route, closure when every filing is closed."),
    ("The case asks for every form of each filing.", "clarified", "M1", "View 6 subtitle: a decision moves its filing to After decision; the case closes when every filing is closed."),
    # M2
    ("Required facts available?", "corrected", "M2", "View 4: the readiness question now follows the agent's verification (8.1) as 'What is still open?'; staff-collected facts are entered in 8.1."),
    ("No: back to the SQR", "corrected", "M2", "View 4: only 'Client answer or document missing' returns to the SQR; a form whose facts are verified goes on (per-form readiness)."),
    ("only the forms that read it wait", "clarified", "M2", "Stage 6 decision names the owner: a client's answer or document is asked of that client; a staff fact is entered by the agent."),
    ("A prospect opens the firm's lead form; or an existing client", "clarified", "M1/M2", "View 4 'starts' adds the next filing of a route (from view 6)."),
    ("gTTTgTTTgTg", "layout", "M2", "View 4 column pattern changed so 8.1 precedes the readiness gateway."),
    ("lane:case.ai", "layout", "M2", "The removed SQR loop was routed under the AI lane; the new client-gap loop routes above the client lane."),
    # M3
    ("Past filed cases may be read the same way", "corrected", "M3", "7.3 now carries both D215 jobs as amended by D245: migration with consent and staff verification; historical comparison where consented, staff-checked past cases exist. 4.3, 5.3 and stage 3 carry 'Historical comparison unavailable'."),
    ("Checks structure and references; tests against independent expected answers", "clarified", "M3", "Stage 3 story adds the historical comparison where consented past filed cases exist (D245)."),
    ("A validation report and test results", "clarified", "M3", "Stage 3 story result adds the historical comparison or 'Historical comparison unavailable'."),
    # M6
    ("The real read answers it", "corrected", "M6", "Build gap: the planned real read does not answer the XFA writing/Validate question; it reads fields and measures matching only (D229 scope). New 'What each kind of proof establishes' table in Evidence."),
    ("the real read answers the proof question", "corrected", "M6", "Stage 1 rule: the real read lists fields and measures matching; writing, Validate and barcodes need the team's own proof."),
    ("its added value is measured in the real read", "clarified", "M6", "Checks table: 'to be measured on the real read's answer key' (planned, not done)."),
    ("Proposed; its added value over plain checks is measured in the real read", "clarified", "M6", "4.2 and 8.3 rules: 'to be measured on the real read's answer key'."),
    ("flags that plain checks missed, and false alarms", "clarified", "E1", "Meaning-checker measure now counts extra errors caught against false alarms, reviewer time, cost and waiting time; notes that a fresh context does not guarantee independent errors."),
    ("Hours to configure one combination", "clarified", "E1", "Measure renamed 'Time to an accepted result: AI-assisted versus manual authoring': same library, controls and units; all effort counted, not hours alone."),
    ("by hand and with the engine", "clarified", "E1", "Same measure: scope now names both routes and the three fair units (new edition, new combination, change)."),
    ("no target until a baseline exists", "clarified", "E1", "Same measure: the target cell lists every cost counted and errors left after review."),
    # I2
    ("Drafts view definitions; needs no live client facts", "corrected", "I2", "3.7 is now a platform rules step: it assembles views from what 3.4–3.6 drafted and makes no meaning choice (D92 rules-only work is never called AI)."),
    ("Question-set assembly (3.7, AI)", "corrected", "I2", "Next step names the platform, not AI."),
    ("Runs automatically. Results appear in the review workbench (5.1).", "clarified", "I2", "3.7 header: 'Runs automatically, by rules.'"),
    ("Then drafts the rules, eligibility gates, PQR, SQR, staff working view and checks", "corrected", "I2", "Stage 2 story split: AI drafts rules and gates; the platform assembles the PQR, SQR and staff working view by rules; AI drafts checks."),
    ("A complete draft, every item citing its source", "clarified", "I2/L7", "Stage 2 story's last result: 'A draft of every item the combination needs, each citing its source' (removes the vague 'complete')."),
    ("One drafting pipeline in the platform;", "clarified", "I2", "View 2 subtitle adds that the question sets are assembled by rules, not AI; 3.7 drawn in the Platform lane."),
    ("Drafts placements; a new section needs a person's approval once", "clarified", "I3", "3.4 authority 'Drafts placements only.'; the approval of a new section stays in Checked by and in the rules."),
    # I3
    ("Drafts only. Every new match is reviewed in 5.1.", "clarified", "I3", "3.1 authority 'Drafts only.'; review is stated once, in Checked by."),
    ("Drafts mappings only. During initial review every new or changed entry is reviewed.", "clarified", "I3", "3.2 authority 'Drafts mappings only; never publishes.'; review is stated once, in Checked by and the rules."),
    ("Drafts rules only; an ambiguous passage goes to the SME.", "clarified", "I3", "3.5 authority 'Drafts rules only.'; the SME's decision on ambiguous passages stays in Checked by."),
    ("Approve, Correct or Flag", "clarified", "I3", "5.1 uses one vocabulary: Approve, Correct or Return."),
    ("Approve, correct or flag each", "clarified", "I3", "5.1 action line: 'Approve, correct or return each, beside its source snippet'."),
    ("Accept, edit or reject;", "clarified", "I3", "5.1 step: Approve, correct (pick another proposal or edit; checked again) or return to drafting with the reason."),
    ("Coordinates the run on the changed items; reviews them beside", "corrected", "I3", "Stage 11 story in order: coordinate, re-draft and check, review, SME sign-off, publish."),
    ("Coordinates the run on the changed items; reviews each changed item", "clarified", "I3", "10.2 role: starts and coordinates; reviews once items are re-drafted and checked."),
    ("It runs views 1 to 3 on the changed items only", "clarified", "L7", "'10.2 runs views 1 to 3…' (no unexplained 'It')."),
    ("It never changes a value or a mapping", "clarified", "L7", "'The meaning check never changes a value or a mapping'."),
    # I4
    ("points at a library item, never at a form", "corrected", "I4", "Library rule: everything references versioned library items (including form editions and their mappings), never a questionnaire section's position. Forms are library items, so 'never at a form' was wrong."),
    # I5
    ("so only a correct form goes on to filling", "clarified", "I5", "8.4 purpose names the observable conditions: required checks pass and every flag is decided."),
    ("Looks at every red, amber and flagged field", "clarified", "I5", "8.4 person line uses the state words (blocked, warning, held, flagged, filled and checked)."),
    ("Status colours: red = blocked", "clarified", "I5", "8.4 rule restructured: state in words, reason and required action; colour only supplements. Every state and consequence is kept."),
    ("Colour", "clarified", "I5", "8.4 example column 'State (colour)'."),
    ("amber", "clarified", "I5", "8.4 example cells now 'Warning (amber)'."),
    ("green", "clarified", "I5", "8.4 example cell now 'Filled and checked (green)'."),
    # S4 / S5
    ("The ticket is classified; a wrong mapping is held with its dependents and the list of affected cases.", "corrected", "S4", "10.4 done-when adds the effective hold: forms using the held mapping in listed open cases are held before submission (D245 hold of dependent work)."),
    ("Triage confirms the map entry's person is wrong; it is held, and three open cases", "clarified", "S4", "10.4 example adds an already-approved form whose approval is withdrawn."),
    ("Case pinned to the new version; affected approvals withdrawn.", "corrected", "S5", "10.3 done-when: forms, checklist items, questions and readiness recomputed; affected approvals withdrawn."),
    # L7 language
    ("Run may start once the portal decision is made.", "clarified", "L7", "'The run can start…' (possibility, not permission)."),
    ("portal screens captured where needed (1.2)", "clarified", "L7", "'if the combination is filed through portal screens (1.2)'."),
    ("captures portal screens where needed", "clarified", "L7", "Stage 1 story: 'if the combination is filed through them'."),
    ("Checks can run on the complete draft.", "clarified", "L7", "3.7: 'Check drafting (3.8) starts on the assembled views.'"),
    ("The publisher's review is complete.", "clarified", "L7", "5.2 trigger: the publisher has recorded a decision on every new or changed item (5.1)."),
    ("Both reviews are complete.", "clarified", "L7", "5.3 trigger names both completed reviews (5.1 decisions, 5.2 sign-offs)."),
    ("may render, but stops at 8.4", "clarified", "L7", "8.1: 'can be rendered, but stops at 8.4'."),
    ("Filling may start.", "clarified", "L7", "8.4: 'Filling (9.1) starts.'"),
    ("Typing by hand and validation where needed", "clarified", "L7", "9.1: typing by hand where a field refuses written data; the form's own Validate where its form type has one."),
    ("runs the form's own Validate where needed", "clarified", "L7", "9.2: 'where its form type has one'."),
    ("The final file is uploaded or the portal screen filled and, where needed, validated", "clarified", "L7", "9.3 trigger: validated where the form type has its own Validate."),
    ("Agent; the case ends when every filing is decided", "corrected", "M1", "9.6 receiver: a follow-up task, the filing's After decision steps, or the route's next filing."),
    # Lens 7 independent read of all 57 panels (L7-n = item n of that read, recorded in the maker response §5)
    ("No manual mapping. The engine reads the government's own forms", "clarified", "L7-8", "ANSWER: 'During initial validation' (D236's word), not the ambiguous 'initial review'."),
    ("Initial review: every new or changed item is reviewed beside its source", "clarified", "L7-8", "Controls: 'Initial validation'; 5.1 rule adds that no later relaxation is decided."),
    ("no target during initial review", "clarified", "L7-8", "Measure: 'during initial validation'."),
    ("during initial review every new match", "clarified", "L7-8", "3.1: 'during initial validation'."),
    ("during initial review a person reviews", "clarified", "L7-8", "3.2: 'during initial validation'."),
    ("F|During initial review every new or changed item is reviewed", "clarified", "L7-8", "5.1: 'During initial validation…'; adds that any later relaxation needs measured evidence and the founder's yes (D236 left it open)."),
    ("Five groups, drafted in 3.8", "corrected", "L7-18", "Controls: advise (Major, Minor) is shown and listed, needs no reason and never blocks; only Critical warnings must be fixed or passed (AG-07 AG-7-27). 8.4 states and 9.3 aligned."),
    ("or the Platform Owner, never the drafter", "corrected", "L7-9", "Second person: never the pack version's author or submitter (team SA1-D6)."),
    ("A second person, never the drafter, publishes", "corrected", "L7-9", "5.3 purpose: never the author or submitter (SA1-D6)."),
    ("R|The approver is a second person, never the author, and never edits", "corrected", "L7-9", "5.3 rule names author and submitter as in SA1-D6."),
    ("A different authorised person from the author;", "corrected", "L7-9", "5.3 prerequisite: different from the author and the submitter (SA1-D6)."),
    ("Never the person who drafted or", "corrected", "L7-9", "10.2 role: never the change's author or submitter, nor the person who drafted or coordinated it."),
    ("Approves and publishes; never the person who drafted", "corrected", "L7-9", "Stage 11 story: same wording as 10.2."),
    ("Checklist items are ready.", "clarified", "L7-26", "3.3 trigger: 'The source checklist entries are split into passages (2.2)': distinguishes source entries from a case's checklist items."),
    ("A blocking finding from 4.1 or 4.3, a reviewer's correction (5.1) or an item the SME has n", "corrected", "L7-1/L7-10", "4.4 trigger: correction or return (5.1), or an item the SME corrects or rejects; an item still waiting for the SME waits."),
    ("A correction holds the item and its dependents (4.4) and sends it back to drafting.", "clarified", "L7-1", "5.1 'If not': correction and return both go back to drafting through 4.4; a correction is drafted in as given. Keeps draft 3's rule."),
    ("An unconfirmed or corrected item is held (4.4) and returns to drafting.", "corrected", "L7-10", "5.2 'If not': only an item the SME corrects or rejects is held; one not yet looked at waits."),
    ("Correction, or a rule not signed off?", "corrected", "L7-1/L7-10", "Stage 3 decision: 'Corrected, returned, or rejected by the SME?'."),
    ("Corrections?", "clarified", "L7-1", "View 3 gateway: 'Corrected or returned?'."),
    ("All confirmed?", "corrected", "L7-10", "View 3 gateway 'All signed off?', its back branch labelled 'Corrected or rejected'."),
    ("Approved, corrected or held items", "clarified", "L7-1", "Stage 3 story result: 'Approved, corrected or returned items'."),
    ("Many rejections: the engine re-runs", "clarified", "L7-1", "5.1 exception uses the review vocabulary: corrections or returns."),
    ("Correct the name, then approve", "clarified", "L7-1", "5.1 example: approved when it comes back re-drafted and checked."),
    ("Questionnaires are submitted; one reading per upload", "corrected", "L7-3", "7.3 starts when a document is uploaded (per upload), consistent with 7.2 and per-fact readiness."),
    ("Readings are done, or a form reports a fact to correct.", "corrected", "L7-3", "8.1 starts per fact, not after every reading is done."),
    ("The required form edition has no published map:", "clarified", "L7-35", "8.2 'If not' names the support ticket the diagram shows (10.4)."),
    ("An uncertain outcome (the portal timed out after Submit)", "clarified", "L7-23", "9.5 'If not': the blocked fact returns to 8.1; only forms that read it lose approval."),
    ("Change draft and impact list", "clarified", "L7-12", "10.1 output 'Change list and impact list': drafting happens in 10.2."),
    ("Re-run the form-edition pipeline on changed fields only", "clarified", "L7-12", "10.1 step: re-read changed editions only to find changed fields; drafting happens in 10.2."),
    ("adopts now or at the cut-off; the deferral is recor", "clarified", "L7-14", "10.3: adopt now or later; a cut-off makes it required by that date; after it, affected forms cannot be submitted until a person adopts (as 9.5 says)."),
    ("adopt now, or at the cut-off", "clarified", "L7-14", "10.3 action line: 'adopt now, or later and at the latest by the cut-off'."),
    ("Adopt now, or at the cut-off", "clarified", "L7-14", "10.3 step: 'Adopt now, or later; a government cut-off makes it required by that date'."),
    ("The client's facts no longer satisfy a new rule", "corrected", "L7-21", "10.3: a new rule needing a missing fact re-opens that question; a client no longer meeting a new eligibility rule is named as outside this solution."),
    ("Rules fill each form, checks run, AI flags meaning doubts", "clarified", "L7-31", "Stage 7 'does' in process order: render and check, AI flags, agent resolves, code fills and reads back."),
    ("Checked forms, one for each person who must complete each form", "clarified", "L7-32", "Stage 7 hands over 'one for each person who must complete a form, or one per application' (as 8.2)."),
    ("The example row saves with two base forms", "corrected", "L7-33", "1.1 acceptance: three base forms, matching its own example and stage 1."),
    ("A partner-name field resolves to the name definition, never to Client A's name field.", "clarified", "L7-29", "3.1 acceptance: the definition is shared; its mapping takes the partner's value."),
    ("If nothing fits, AI proposes a new field: type, validation, whose fact", "clarified", "L7-29", "3.1 step: a field definition says person or organisation; whose fact belongs to the mapping."),
    ("Base or conditional is per person: a form that is base", "corrected", "L7-28", "3.3 rule is about document lines: 'a document that is base'."),
    ("Client A's filing is decided before the partner's", "corrected", "L7-4", "7.1 exception: After decision; the case stays open until every filing is closed (9.6)."),
    ("flagged on the checklist item", "clarified", "L7-27", "7.3 exception: shown on the checklist item (wrong person: not accepted; expired: a warning)."),
    ("The working view is the only staff editing surface", "clarified", "L7-24", "8.1 rule: re-renders forms not yet submitted; submitted forms never change."),
    ("Check important and disputed fields:", "clarified", "L7-17", "8.3 step defines 'disputed'."),
    ("a new block returns the case to 8.1", "clarified", "L7-23", "9.4 rule: the fact returns to 8.1; only forms that read it lose approval."),
    ("that returns the case to 8.1", "clarified", "L7-23", "9.4 rule: same."),
    ("and seen by the representative at approval", "corrected", "L7-15", "9.5 rule: an authorised disposition is shown to the representative before submission (it can be recorded after form approval). Whether that needs re-approval is not decided."),
    ("A refusal ends or re-routes the journey as the route defines", "clarified", "L7-20", "9.6 exception merged: a refusal moves the filing to After decision (BR-20), then the route ends or re-routes (SA-1B-68)."),
    ("A wrong fact found later comes back here; correcting it re-prepares every form", "clarified", "L7-24", "Stage 6 rule: forms not yet submitted."),
    ("A request can reopen a fact (stage 6) or ask for a form completed by hand", "clarified", "L7-34", "Stage 9 pointer: a request becomes a task that may need a document, a corrected fact or a form completed by hand (as 9.6)."),
    ("flagged in 8.4, before the representative sees the form", "clarified", "L7-27", "3.8 example: 'shown as a warning in 8.4' ('flagged' is kept for meaning flags)."),
    ("accepted address warning", "clarified", "L7-27", "9.3 example: 'acknowledged address warning'."),
    ("Stops only the failing items and what depends on them", "clarified", "L7-38", "4.4 purpose: other combinations, open cases and unaffected approvals carry on (review of this draft waits for a clean report)."),
    ("From view 4: facts verified.", "clarified", "L7-2", "View 6 starts: facts ready for form preparation; a missing or held fact stops only the forms that read it."),
    ("A form's facts verified", "clarified", "L7-2", "View 4 exit 'Facts ready for forms'."),
    # Lens 7 recheck leftovers (same item numbers; A–F = new issues found by the recheck)
    ("Every widget on every page belongs to a read field; unread regions are named.", "clarified", "L7-37", "2.1 done-when adds that the completeness test for barcode (XFA) forms is for the team to confirm."),
    ("Checklist items, condition passages, criterion sentences", "clarified", "L7-26", "2.2 hands over 'Source checklist entries…' (not a case's checklist items)."),
    ("A gate reads a field no PQR block asks: flagged; the block is extended", "corrected", "L7-16", "3.7 (a rules step) returns the gap to AI drafting (3.6) to propose the field; a person approves it (5.1)."),
    ("The case asks for this form: when facts are verified", "clarified", "L7-2", "8.2 starts when the facts it reads are ready for preparation; a missing or held fact stops it at review."),
    ("Authorised staff adopt or record a permitted deferral", "clarified", "L7-E", "10.3 authority: a deferral is permitted until any government cut-off."),
    ("adopt now, or by the cut-off", "clarified", "L7-E", "Stage 12 decision: 'adopt now, or later (by the cut-off, if there is one)'."),
    ("A firm contacts Expat Ready's support about a form or a mapping.", "clarified", "L7-D", "10.4 also starts when the content publisher raises a suspected error from a historical comparison (4.3)."),
    ("Checklist item 'Proof of relationship, if applicable' (Example)", "clarified", "L7-26", "3.3 works on a 'Source checklist entry'."),
    ("A blocking finding, a reviewer's correction or an unconfirmed rule", "corrected", "L7-10", "4.4 works on: correction or return, or a rule the SME corrected or rejected."),
    ("Acknowledge amber warnings", "corrected", "L7-A", "8.4 step: acknowledge each Critical warning with a reason; Advisory items need no reason (AG-7-27)."),
    ("an unacknowledged amber or flagge", "corrected", "L7-A", "9.3 acceptance: an unacknowledged Critical warning or flag prevents approval; Advisory items do not."),
    ("explicit acknowledgement of every amber, flagged and important", "corrected", "L7-A", "9.3 rule: every Warning (Critical), flagged and important item; Advisory items listed only."),
    ("the case returns to 8.1, the", "clarified", "L7-23", "9.4 exception: the address returns to 8.1 (not the whole case)."),
    ("nothing is signed; the case returns to 8.1", "clarified", "L7-23", "9.4 example: the address returns to 8.1."),
    ("Change draft or triaged support ticket", "clarified", "L7-12", "10.2 works on a 'Change list' (10.1 no longer drafts)."),
    ("fills by rules and reads back", "clarified", "L7-31", "Stage 7 who-line: renders by rules, later fills and reads back."),
    # diagram label geometry (M5)
    ("Answer SQR, upload documents", "clarified", "M5", "7.2 short diagram label 'SQR answers and uploads': two lines, clear of the multi-instance mark. The full title is unchanged."),
    ("Read each uploaded document", "clarified", "M5", "7.3 short diagram label 'Read each upload': clear of the multi-instance mark. The full title is unchanged."),
    ("Agent takes it back", "clarified", "M5", "View 5 conditional event 'Taken back by the agent', on two lines beside its event."),
    ("To the representative's check", "clarified", "M5", "View 6 event 'Back to approval (9.3)': the old label broke mid-word; its message flow still reads 'Signed file to check (9.3)'."),
    ("When a published change affects this case", "clarified", "M5", "View 7 sub-process title 'When a change affects this case' on two lines, clear of the message flow; its start event still reads 'New version'."),
    # Draft 4.1: the checker's minor fixes (checks/one-pager-draft-4-checker-review-2026-10-18.md, m1–m15)
    ("The master library of reusable building blocks", "clarified", "C4-m11", "Records: 'The library of reusable building blocks…' (retired term 'master')."),
    ("Portal capture and portal filling are not built. Proof question", "clarified", "C4-m7", "Build gap: the hand-typing fallback is marked 'proposed, founder to confirm', as 8.5 states."),
    ("As above; another active case's affected forms are marked 'fact changed'", "clarified", "C4-m14", "Scenario table: the forms that read it are prepared again and their approvals withdrawn (the undefined label 'fact changed' replaced by its consequence)."),
    ("Each adult has submitted; every required fact is answered", "clarified", "C4-m13", "7.2 done when: 'every fact asked of that adult' (staff and profile facts are never asked)."),
    ("Each failure goes to its cause. A wrong or missing fact", "clarified", "C4-m7/m15", "9.2 if not: 'Adobe Reader'; the hand route there is marked 'proposed, founder to confirm'."),
    ("Reads each value against its source, including every hand-entered value; acknowledges ever", "corrected", "C4-m2", "9.3: acknowledges every Critical warning, flagged and important item; Advisory items are only listed; a Held field cannot be acknowledged (matches 8.4 and 9.3's rule)."),
    ("Form preparation (stage 7)", "clarified", "C4-m4", "Stage 12 hands over to stage 7, and new questions or documents to stage 6 (adoption recomputes them, 10.3)."),
    ("Advisory readiness: warnings that help the agent", "clarified", "C4-m12", "3.8 group renamed 'Readiness warnings': its checks carry warn severity, so 'advisory' read as the Advisory state."),
    ("advisory readiness", "clarified", "C4-m12", "3.8 example and Controls: 'readiness warning(s)'."),
    ("A fact verified on this case updates the shared record; another open case that reads it ma", "clarified", "C4-m14", "7.1 rule: in another open case the forms that read it are prepared again and their approvals withdrawn."),
    ("Classify each validation failure by cause: wrong or missing fact, format or transform, or ", "clarified", "C4-m15", "9.2 action: 'an Adobe Reader or edition issue' (Reader alone also names the team's AI reading step)."),
    ("Merge into 'Family name', then approve", "clarified", "C4-m15", "5.1 example: 'Correct: merge into…' (one review vocabulary: Approve / Correct / Return)."),
    ("review; uncertain items and AI disagreements arrive marked 'decide' and the reviewer decid", "clarified", "C4-m15", "Stage 3: the reviewer decides each 'decide' item with a reason; only a correction is re-drafted (agrees with 5.1)."),
    ("Form preparation again (view 5) for the affected forms only", "clarified", "C4-m4", "10.3 next adds: a new question or checklist item goes to the client and the agent (stage 6)."),
    ("Re-run and publish change", "layout", "C4-m9", "10.2 short label 'Re-run and publish' so the call-activity mark no longer sits on the text; the full title is unchanged."),
    ("Form approved, or a fact to correct (messages to the case, view 6)", "clarified", "C4-m11", "View 5 end: 'both sent to the case' (retired term 'messages')."),
]

def strings(path):
    out = []
    for n in ast.walk(ast.parse(open(path).read())):
        if isinstance(n, ast.Constant) and isinstance(n.value, str) and len(n.value) > 3: out.append(n.value)
    return list(dict.fromkeys(out))

def run():
    rows, errs, added = [], [], 0
    for f in ("s3_data.py", "s3_panels.py", "s3_views.py"):
        old, new = strings(os.path.join(ARCH, f)), strings(os.path.join(HERE, f))
        sn, so = set(new), set(old); added += sum(1 for s in new if s not in so)
        for s in old:
            if s in sn: continue
            hit = next((d for d in D if (d[0] == s if len(d[0]) < 20 else d[0] in s)), None)
            if not hit: errs.append(f"{f}: no disposition for '{s[:90]}'"); continue
            rows.append((f, s, *hit[1:]))
    return rows, errs, added

if __name__ == "__main__":
    rows, errs, added = run()
    from collections import Counter
    c = Counter(r[2] for r in rows); fnd = Counter(r[3] for r in rows)
    L = ["# One-pager draft 3 → draft 4: content-level ledger", "",
         "18 October 2026 · generated by `tools/s3/cohesion_ledger.py`. Draft 3 sources are archived whole in "
         "`archive/ai-workers/solution-1-v3-draft3-before-cohesion-2026-10-18/` (HTML `401457aa…71af`).", "",
         f"Every draft 3 string in `s3_data.py`, `s3_panels.py` and `s3_views.py` was compared with draft 4. **{len(rows)} no longer appear word for word**: "
         + ", ".join(f"{k} {v}" for k, v in sorted(c.items())) + f". **Removed without replacement: 0.** {added} strings are new (corrections, examples, acceptance checks, proof scope). "
         "Unchanged strings are kept word for word. Builder text changes (not in these files): the checks table heading 'Two different kinds of check' → "
         "'Checks and what each establishes' (I4); the Evidence introduction now states the bounded real read and links the new proof-scope table (M6). "
         "Display-only changes (label placement, phone records layout, table cue, tooltip dismissal, compact map decisions, dark actor colours) change no content and are in the cohesion record.", "",
         "By finding: " + ", ".join(f"{k} {v}" for k, v in sorted(fnd.items())) + ".", "",
         "'Corrected' changes behaviour to match a team source or founder decision; 'clarified' rewords the same behaviour; 'layout' is diagram geometry.", "",
         "| File | Draft 3 wording | Kind | Finding | Where it is now, and why |", "|---|---|---|---|---|"]
    L += [f"| {f} | {s.replace('|', '/').replace(chr(10), ' ')} | {k} | {fd} | {w.replace('|', '/')} |" for f, s, k, fd, w in rows]
    out = os.path.join(ROOT, "checks", "one-pager-draft-4-content-ledger-2026-10-18.md")
    open(out, "w").write("\n".join(L) + "\n")
    print(f"{len(rows)} changed strings dispositioned ({dict(c)}); {added} added; wrote {os.path.relpath(out, ROOT)}")
    if errs: print("UNDISPOSITIONED:"); [print("  - " + e) for e in errs]; sys.exit(1)

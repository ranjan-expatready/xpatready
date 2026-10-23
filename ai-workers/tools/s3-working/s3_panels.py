# Solution 1 one-pager: the detail panels' reading layer (18 Oct 2026).
# The facts stay in s3_data.py. This file adds only what a reader needs first and the data did not hold as such:
# what each item achieves, who does what in a stage (with its result), plain next-step labels, where an automatic
# step's results appear, and the composite roles of 10.2. Nothing here is a new rule, approval, role or screen.
# Every original string that a panel no longer shows word for word is listed in CHANGED with its reason; the build
# fails if any original string is neither shown nor listed (see check_preservation in build_one_pager.py).

# ------------------------------------------------------------------ activities: what this achieves (one sentence each)
PURPOSE = {
    "1.1": "The content publisher creates the combination's configurator row and attaches its base government forms, document checklist, guide and eligibility page, so the engine reads a fixed, fingerprinted source set; conditional forms are added later by the drafted rules (3.5), not found by hand.",
    "1.2": "Records each government portal screen and every answer branch, so portal filing is set up like a form; only for combinations filed through portal screens.",
    "1.3": "Starts a registered draft run on the row's sources; the run drafts, it never publishes.",
    "2.1": "Turns each new form edition into a complete list of its fields and form logic, read once and reused by every combination that uses it.",
    "2.2": "Breaks the checklist, guide and eligibility page into small passages, unchanged and linked to their page, that drafting can cite.",
    "3.1": "Gives each form field one library meaning (a canonical field), reusing an existing one wherever it fits.",
    "3.2": "Records for each form field whose fact fills it and how, so forms are later filled by rules with no manual mapping.",
    "3.3": "Turns the checklist into document requirement lines: which document, who provides it, and when it applies.",
    "3.4": "Places the combination's fields in reusable library sections and records where each value is collected from.",
    "3.5": "Turns conditional wording in forms and the guide into rules that add fields, documents or forms for the right person.",
    "3.6": "Drafts the yes/no eligibility gates that give a prospect an indicative result.",
    "3.7": "Builds the three question sets from one set of definitions: the short PQR, the full SQR and the staff working view.",
    "3.8": "Drafts the checks that catch missing, wrong or inconsistent facts, in the product's existing check kinds.",
    "4.1": "Finds structural gaps and broken references in the draft before anyone spends time reviewing it.",
    "4.2": "Gives each drafted mapping an independent second opinion on meaning, so the reviewer sees where it may be wrong.",
    "4.3": "Tests the draft against made-up families whose correct answers were worked out independently.",
    "4.4": "Stops only the failing items and what depends on them, and sends them back for re-drafting; other combinations, open cases and the approvals of unaffected items carry on.",
    "5.1": "A person decides every new or changed item beside its source before anything can be published.",
    "5.2": "The Immigration SME signs off the immigration meaning: rules, gates, document conditions and values.",
    "5.3": "A second person, never the pack version's author or submitter, publishes the reviewed draft as a new pack version, or rejects it.",
    "6.1": "Captures the prospect's own answers and gives an indicative eligibility result before a firm takes the case.",
    "6.2": "Finds people or organisations the firm may already know, so nobody gets a second record by accident.",
    "6.3": "The agent settles who the person is and whether the firm takes the case.",
    "7.1": "Opens the case on the current pack version with every person in their role, pre-filled from what the firm has already verified.",
    "7.2": "Each adult answers only what is still open and uploads each document once.",
    "7.3": "Reads each upload and proposes values with their page, for the agent to verify.",
    "8.1": "The agent turns declared and proposed values into verified facts: flagged items first, then one confirmation per reviewed section.",
    "8.2": "Builds each form from verified facts through its published map, showing every field's value, source and status.",
    "8.3": "An independent AI check of whether each important field holds the right person's right fact; it decides nothing.",
    "8.4": "The agent resolves every blocked and flagged field and passes each Critical warning only with the waive permission and a recorded reason, so a form goes on to filling only when its required checks pass and every flag is decided; a Held field goes on to filling with its verified value but holds approval and submission until 8.1 resolves it.",
    "8.5": "Lets an urgent case go ahead by hand when the product cannot fill the form yet.",
    "9.1": "Writes the verified values into the actual form or portal screen and proves each one by reading it back.",
    "9.2": "Clears what read-back and the form's own validation found, and produces the final file.",
    "9.3": "The representative approves the exact final file that will be signed and filed.",
    "9.4": "Each required signatory signs or declares their own part of the approved forms.",
    "9.5": "Files the application with the government and pays the fee: people do both, never the product.",
    "9.6": "Keeps each government letter on the right filing, turns each request into a task, and moves a decided filing to After decision or opens the route's next filing.",
    "10.1": "Finds changes to official forms, guides and screens, and what each change affects.",
    "10.2": "Runs the changed items through the same drafting, checks, review and publishing as setup, to produce a new pack version.",
    "10.3": "Moves an open case to the new version deliberately, preparing again only the forms the change affects.",
    "10.4": "Sorts a firm's support ticket into a new form or edition, a suspected wrong mapping or a question; holds a suspected wrong mapping at once while it is investigated, then confirms it or records that it stands.",
}

# Who else acts on this item's result, where that is a different person from the performer (shown under "Who acts").
CHECKED_BY = {
    "3.1": "Every new match is reviewed by the content publisher (5.1).",
    "3.2": "Every new or changed mapping is reviewed by the content publisher (5.1), beside its source.",
    "3.3": "Reviewed by the content publisher (5.1); document conditions are signed off by the Immigration SME (5.2).",
    "3.4": "Reviewed by the content publisher (5.1); a new section is approved once.",
    "3.5": "Signed off by the Immigration SME (5.2), who also decides ambiguous passages.",
    "3.6": "Signed off by the Immigration SME (5.2).",
    "3.7": "Reviewed by the content publisher (5.1).",
    "3.8": "Tested in 4.3, reviewed in 5.1; immigration values signed off by the Immigration SME (5.2).",
    "4.2": "Its disagreements are decided by the content publisher (5.1); no model vote decides anything.",
    "4.3": "Expected answers are signed by the Immigration SME; failures hold items (4.4).",
    "7.3": "Every proposed value is verified, or rejected, by the agent (8.1).",
    "8.2": "Reviewed by the agent (8.4); approved by the lead representative (9.3).",
    "8.3": "Its flags are decided by the agent (8.4); approval stays with the representative (9.3).",
    "8.5": "Validated where the form needs it (9.2) and approved by the representative (9.3), as any other form.",
    "9.1": "Anything for a person goes to the agent (9.2); then the representative approves (9.3).",
    "10.1": "Changed items are reviewed and published through 10.2.",
}

# Performer wording where the lane name alone would be wrong or incomplete (shown first under "Who acts").
PERFORMER = {
    "9.3": "A holder of the firm's form-approve permission on the case: by default the firm's Owner and Case Manager roles hold it; on this page, normally the case's lead representative.",
    "9.4": "Each required signatory: Client A, the partner, or an employer's signatory, each for their own part.",
    "9.5": "Authorised submitter: a person who holds the firm's submit permission on the case (normally the lead representative). Fee payer: the client, or the firm on the client's behalf, as recorded in the case's government fees.",
    "8.5": "Authorised firm staff, through the firm's existing process.",
    "9.6": "The agent records letters and assigns tasks. A decision, or a withdrawal before it, is recorded by a holder of the firm's record-decision permission.",
}

# Composite activity: who does which part (10.2 only).
ROLES = {
    "10.2": [("pub", "Content publisher", "Starts and coordinates the run on the changed items; once they are re-drafted and checked, reviews each changed item beside its old and new source (as in 5.1)."),
             ("ai", "AI and platform", "Re-read and re-draft the changed items, then check and test them (as in 2.1–4.4)."),
             ("spec", "Immigration SME", "Signs off changed rules, gates and values (as in 5.2)."),
             ("rel", "Second-person approver", "Publishes the reviewed version, or rejects it (as in 5.3). Never the change's author or submitter, nor the person who drafted or coordinated it.")],
}

# Where an automatic step's results appear (replaces "No screen (background)").
RESULT_AT = {
    "3.1": "Runs automatically. Results appear in the review workbench (5.1), beside their source.",
    "3.2": "Runs automatically. Results appear in the review workbench (5.1), beside their source.",
    "3.3": "Runs automatically. Results appear in the review workbench (5.1, 5.2), beside their source.",
    "3.4": "Runs automatically. Results appear in the review workbench (5.1), beside their source.",
    "3.5": "Runs automatically. Results appear in the review workbench (5.2), beside their source.",
    "3.6": "Runs automatically. Results appear in the review workbench (5.2), beside their source.",
    "3.7": "Runs automatically, by rules. Results appear in the review workbench (5.1).",
    "3.8": "Runs automatically. Results appear in the review workbench (5.1, 5.2).",
    "4.2": "Runs automatically. Its agree or disagree result appears beside each mapping in the review workbench (5.1).",
}

# Plain next-step labels. The original labels named a system part or "the case" (a record, not a person); these say
# where the work continues and who acts next. Each original stays in CHANGED below.
NEXT = {
    "1.2": "Content publisher, to start the run (1.3).",
    "1.3": "Reading (2.1 and 2.2, the platform).",
    "2.1": "Field matching (3.1, AI).",
    "2.2": "Drafting of the document list, rules and gates (3.3, 3.5, 3.6; AI).",
    "3.1": "Mapping (3.2, AI).",
    "3.2": "Section placement (3.4, AI); reviewed in 5.1.",
    "3.3": "Rule drafting (3.5, AI), once every drafting branch is ready.",
    "3.4": "Rule drafting (3.5, AI), once every drafting branch is ready.",
    "3.5": "Gate drafting (3.6, AI).",
    "3.6": "Question-set assembly (3.7, the platform); the Immigration SME signs off the gates in 5.2.",
    "3.7": "Check drafting (3.8, AI).",
    "3.8": "Structure checks (4.1, the platform); the Immigration SME signs off immigration values in 5.2.",
    "4.2": "The failed-check decision (the platform) once 4.3 has also finished; disagreements go on to review (5.1).",
    "4.3": "The failed-check decision (the platform) once 4.2 has also finished.",
    "4.4": "Re-drafting (view 2, AI), for the held items only.",
    "5.3": "Firms' cases: new cases open on the published pack version; open cases adopt it through 10.3.",
    "6.1": "Duplicate check (6.2, the platform).",
    "7.2": "Document reading (7.3, AI).",
    "8.1": "Form rendering (8.2, the platform), for each form.",
    "8.4": "Filling (9.1, the platform); a wrong fact goes to the agent's verification (8.1); a wrong mapping to Expat Ready's support.",
    "9.3": "Signing (9.4) continues once every required form of the filing is approved; the signatories act next.",
    "9.4": "Submission (9.5), by the authorised submitter.",
    "10.3": "Form preparation again (view 5) for the affected forms only: the agent reviews, the representative approves again. A new question or checklist item goes to the client and the agent (stage 6).",
}

# Example control: an activity with no example of its own links to an existing one instead of an empty button.
EXAMPLE_LINKS = {
    "10.2": [("3.2", "a drafted mapping, person by person"), ("5.1", "review beside the source"), ("10.3", "what changes for Client A's case")],
}

# ------------------------------------------------------------------ stages and ways in: purpose and ordered story
# story rows: (actor key, what happens, result). The map card keeps its short who-list; the panel tells the story.
STAGE = {
    "A": dict(purpose="Establish who the client is and whether the firm takes the case.",
              story=[("cli", "Answers the firm's lead form and short PQR", "Declared answers and an indicative result"),
                     ("sys", "Looks for people the firm may already know", "Possible matches, never an automatic merge"),
                     ("agt", "Decides 'same person?' and whether the firm takes the case", "A resolved client record, or a closed lead")],
              next="Accepted: create the case (stage 4); a rejected enquiry stops here, before any case exists. A returning person is linked to their record, and only what is still open is asked.",
              important="A possible duplicate always needs the agent's decision: names or email never merge people.",
              links=[("st-4", "Stage 4 · Create the case and assign participants")]),
    "B": dict(purpose="Start a new service for a client the firm already has, with no new lead.",
              story=[("agt", "Opens a new case from the client's record", "A new case on the current pack version; the earlier case is not changed"),
                     ("sys", "Pre-fills each fact from the client's verified record (stage 5)", "Only missing facts, 'still true?' items, differences and the new service's own eligibility questions are asked")],
              next="Create the case (stage 4), then pre-fill from each person's verified facts (stage 5).",
              links=[("st-4", "Stage 4 · Create the case and assign participants"), ("st-5", "Stage 5 · Pre-fill from each person's verified facts")]),
    "1": dict(purpose="Get the combination's base government forms and instructions into the product, each read once.",
              story=[("pub", "Creates the configurator row and attaches the forms, checklist, guide and eligibility page; captures portal screens if the combination is filed through them; starts the run", "A fingerprinted source set and a registered draft run"),
                     ("sys", "Reads each new form edition and splits the checklist, guide and eligibility page", "Field inventories and page-linked passages")]),
    "2": dict(purpose="Draft the whole setup for the combination, with a source for every item.",
              story=[("ai", "Matches fields to library fields, writes each form field map, builds the document list and places fields in sections", "Draft fields, sections, maps and document lines"),
                     ("ai", "Then drafts the rules and eligibility gates", "Draft rules and gates, each citing its source"),
                     ("sys", "Assembles the PQR, SQR and staff working view by rules from what was drafted", "Three question sets from one set of definitions"),
                     ("ai", "Drafts the field and consistency checks", "A draft of every item the combination needs, each citing its source")]),
    "3": dict(purpose="Publish only a draft that is checked, reviewed and signed off.",
              story=[("sys", "Checks structure and references; tests against independent expected answers and, where consented past filed cases exist, compares them (facts verified by staff)", "A validation report, test results and the historical comparison, or 'Historical comparison unavailable'"),
                     ("ai", "Rechecks each mapping's meaning in a fresh context", "Agree or disagree for each mapping"),
                     ("pub", "Reviews every new or changed item beside its source; decides the items marked 'decide'", "Approved, corrected or returned items"),
                     ("spec", "Signs off rules, gates, document conditions and values", "Signed-off immigration content"),
                     ("rel", "Approves and publishes, or rejects with a reason", "A published pack version")]),
    "4": dict(purpose="Open the case on the current pack version with the right people in the right roles.",
              story=[("agt", "Opens the case and adds family members with their roles", "A case pinned to the current pack version"),
                     ("sys", "Applies the pinned version's rules for each person", "Each person's forms, documents and questions")]),
    "5": dict(purpose="Use what the firm has already verified, one fact at a time, so nobody is asked twice.",
              story=[("sys", "Selects each required fact's current verified value, by rules, not AI", "Pre-filled questions and form fields"),
                     ("sys", "Lists what it cannot select", "Missing facts, 'still true?', 'needs review' and conflicts, for the family and the agent")]),
    "6": dict(purpose="Close the gaps and turn every needed value into a verified fact.",
              story=[("cli", "Each adult answers only open questions and uploads documents", "Declared answers and uploads"),
                     ("ai", "Reads each upload", "Values proposed from documents, with their page"),
                     ("agt", "Reviews flagged items first, decides each conflict and confirms each section", "Verified facts with history")]),
    "7": dict(purpose="Produce each form from verified facts and prove what was written.",
              story=[("sys", "Renders each form through its published map and runs the checks", "Each field's value, source and status"),
                     ("ai", "Checks the meaning of important and disputed fields", "Flags with reasons; it changes nothing"),
                     ("agt", "Resolves flags: correct, wrong fact or wrong mapping", "A form ready to fill"),
                     ("sys", "Fills the form and reads every value back", "A filled form, proven field by field"),
                     ("agt", "Types refused fields, validates and uploads the final file", "The final file, for approval")]),
    "8": dict(purpose="Approve, sign and file each filing, with people taking every legal step.",
              story=[("rep", "Approves each final form (the firm's form-approve permission)", "Approved forms"),
                     ("cli", "Each required signatory signs and declares their own part", "Signed files linked to the approved versions"),
                     ("rep", "The authorised submitter (normally the lead representative) submits; the government fee is paid by the client, or by the firm on the client's behalf", "A filed application with its receipt")]),
    "9": dict(purpose="Keep every government response on the right filing, record each decision, and hand each decided filing to its next step.",
              story=[("gov", "Sends acknowledgements, requests and decisions", "Letters for each filing"),
                     ("agt", "Records each letter on its filing; turns requests into tasks", "The filing's history and tasks"),
                     ("agt", "A holder of the record-decision permission records each decision", "The filing in After decision; a route level the government approved opens the next filing, back at stages 5 and 6"),
                     ("agt", "Completes the after-decision steps in the existing case workflow", "Each filing closed; the case closes when every filing is closed")]),
    "10": dict(purpose="Find what changed in the official sources, or what a firm reported, and what it affects.",
               story=[("sys", "Re-reads the official sources on a schedule and compares", "Changed items with their impact, or 'not verified'"),
                      ("pub", "Triages each firm's support ticket; holds a suspected wrong mapping at once while it is investigated", "A change to run, or 'mapping stands' with the hold released")]),
    "11": dict(purpose="Publish a new version for the changed items only, with the same safeguards as setup.",
               story=[("pub", "Starts and coordinates the run on the changed items", "A run on the changed items only"),
                      ("ai", "Re-drafts the changed items; the platform checks and tests them", "Drafted and checked changes"),
                      ("pub", "Reviews each changed item beside its old and new source", "Reviewed changes"),
                      ("spec", "Signs off changed rules and values", "Signed-off changes"),
                      ("rel", "Approves and publishes; never the change's author or submitter, nor the person who drafted or coordinated it", "A new published version")]),
    "12": dict(purpose="Move each affected open case to the new version deliberately.",
               story=[("agt", "Reads 'what changes for this case' and adopts now or by the cut-off", "The case on the new version"),
                      ("sys", "Prepares only the affected forms again and withdraws only their approvals", "Affected forms back at preparation (stage 7)")]),
}

# ------------------------------------------------------------------ preservation: originals not shown word for word
# key: (item id, field) → (disposition, where it went or why). Fields: io0 input, io1 action, io2 output, io3 receiver,
# human, screen, does, who. "merged" = its content is in the named place; "clarified" = reworded there, with the reason.
CHANGED = {}
for _a, _t in NEXT.items():
    CHANGED[(_a, "io3")] = ("clarified", "Result › Next: '" + _t + "' Says where the work continues and who acts next.")
for _a in RESULT_AT:
    CHANGED[(_a, "screen")] = ("clarified", "Header: '" + RESULT_AT[_a] + "' Replaces 'No screen (background)' with where the results appear.")
CHANGED[("10.2", "no_example")] = ("clarified", "Example: links to the existing examples in 3.2, 5.1 and 10.3 instead of an empty Example button.")

# Stage summaries: the one-sentence 'does' and the map card's short who-lines are told, in order, by the panel's story
# table. Each was read against its story; where a detail sits elsewhere in the first view, that place is named.
_STORY = "Who does what, in order"
for _k, _rows, _extra in [
    ("st-1", "rows 1 and 2 (content publisher; platform)", ""), ("st-2", "rows 1 and 2 (AI)", " 'Creating new ones only when nothing fits' is in Good to know."),
    ("st-5", "row 1 (platform)", " 'One fact at a time' is in What this achieves."), ("st-6", "rows 1 to 3 (client and family; AI; agent)", ""),
    ("st-7", "rows 1 to 5", ""), ("st-8", "rows 1 to 3; the fee payer is named as the client or the firm on the client's behalf", ""),
    ("st-9", "rows 1 and 2 (government; agent)", " A request that asks for a document or a form completed by hand is in Good to know."),
    ("st-10", "rows 1 and 2", ""), ("st-12", "rows 1 and 2 (agent; platform)", ""), ("st-A", "rows 1 to 3 (client; platform; agent)", "")]:
    for _f in ("does", "who"):
        CHANGED[(_k, _f)] = ("merged", _STORY + ", " + _rows + "." + _extra)

# Desktop and language pass (draft 4.2, 18 Oct 2026): the 'runs' line's label is shown in plainer words; its text is unchanged.
for _k, _old, _new in [("st-1", "Runs", "Repeats"), ("st-2", "Side by side", "In parallel"), ("st-3", "Side by side", "In parallel"),
                       ("st-6", "Runs", "Repeats"), ("st-7", "Runs", "Repeats")]:
    CHANGED[(_k, "runs")] = ("clarified", f"Label '{_old}' shown as '{_new}': names the processing frequency or the parallel activities (functional-language review); the line's text is unchanged.")

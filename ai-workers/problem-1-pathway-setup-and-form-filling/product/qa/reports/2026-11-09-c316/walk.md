# Gate A walk of C3.16 by screens, main cfaa199f4, 9 Nov 2026, 18:22–18:25 IST (the clean run)

One command, `scripts/run_all.sh 4471`: a fresh isolated copy `qa_c316` on :4471, started and stopped in that command (ttl 60). Data: Demo › Reset to the six (P-322). Playwright headless, 1024 px, one pass. Live AI off, US$0 (`run.txt`: "spent (US$): 0"). Two earlier runs of the same script on fresh copies stopped at a script fault of qa's (log truncation, then set-up order); this record is the third, complete run. An exploratory pass before them on the same steps gave the same results.

## What was set-up and what was by screens
* **Set-up, not under test (`scripts/setup_c316.mts`, the people's steps the screens call, as the pack does; no SQL write):** Reset to the six; Visitor visa's people (each filing their own) and the questions of Visitor visa and of With an LMIA – inside Canada from their forms (so the two fields are drafts, "about each person"); release 1 of each through its own steps: checklist, source answers, submit by the author (user-A), the SME's sign-off (user-C), approval by a different person (user-B).
* **Set-up by screens (`walk2`):** the work permit's checklist has no saved AI reading on the six ("No saved AI reading of IMM 5556 (03-2024) yet") and live AI is off, so its release was refused "No document line yet". The author added one line by hand on its Documents tab (Passport information page copy). Screenshots 05a, 05b.
* **By screens:** everything a person decides in C3.16 and the next step: the author's "Asked about" choice, opening each case, adding people, the employer-case copy, the answer, the copies of the forms.

## C3.16 by screens: the configuration author (Library › Fields)
* Searched "union", opened **Union start date** (`relationship.union_start_date`, draft v1). "Asked about": Person (about each person) chosen; Filing refused under it: "Not built: a person's fact asked once for the application. Ask it as an application fact instead."; Household and Organisation open. Picked Household: a warning "Changing this moves the saved AI results of 1 combination (6 saved runs); they replay only after a new run." Save as draft. The pill reads "once for the household". 01a–01d.
* Searched "employer", opened **Employer Name** (`organisation.employer_name`). Household refused under it: "This is the employer's fact: choose Organisation, not Household." Picked Organisation, Save as draft; pill "once for the employer". 03a–03d.
* Underneath: both v1 DRAFT, stored HOUSEHOLD and ORGANISATION; the audit lines "Configuration author set "Union Start Date" to be asked once for the household (was about each person; draft v1; goes out with the next release)" and the same for Employer Name.
* Each release carries the marks: Visitor visa release 1 `relationship.union_start_date:household`; the work permit's release 1 `organisation.employer_name:organisation, relationship.union_start_date:household`.

## The next capability's first step: C1.3 on a worker's case (case officer)
* Open a case › With an LMIA – inside Canada · release 1, "QA-C316-W2", Client A. The case header: "Offered: the With an LMIA – inside Canada forms read 2 employer facts; you can copy them from an employer case." 06a, 06b.
* Before the copy, The application tab asks **Name of the prospective employer** once, tagged "About the employer", "Read for: Client A" (07a). Client A's own tab has no question of its own for it; the unmarked "Complete address of the prospective employer" is asked on Client A (07b).
* **C1.3's first step:** Choose employer case… › "Sample employer case: Sample Employer Ltd (Sample)": "Copied to Client A's case once, now (the forms read these 3)": LMIA number, the employer's address, the employer's name, each "New". Copy 3 facts. 08a. Toast: "Copied 3 facts from Sample employer case: Sample Employer Ltd (Sample). Confirm them in their section." Header: "facts copied 9 Nov 2026; later changes there are not copied" (08b).
* The application tab: "Name of the prospective employer · About the employer · Read for: Client A · Sample Employer Ltd (Sample) · Entered by staff · to confirm · Employer case · fills IMM 5710 for Client A" (08c). Client A's tab, read-only: "Name of the prospective employer: Sample Employer Ltd (Sample) · Answered for the employer by Case officer · 9 Nov, 12:54 · Change it in About the employer" (08d).
* Underneath: `organisation.employer_name` on the case's own record ("case"), `case.lmia_or_offer_number` on the case, the unmarked `organisation.employer_address` on the principal; all DECLARED.
* **Its output used one step further (C7.7's first step):** Generate a copy of IMM 5710 for Client A: "Copy of 9 Nov, 12:50 · 3 form fields written · read back and checked" (09). The copy's XFA data: `<Employer><Name>Sample Employer Ltd (Sample)</Name>…` and `<LMO>SAMPLE-0000000</LMO>`; box `Employer[0].Name[0] = written`.

## The household part on Visitor visa (case officer)
* Open a case › Visitor visa · release 1, "QA-C316-H1", Client A; Add spouse or partner "Client B"; Add child "Child C": "3 filings" (10a).
* The application tab asks **Date the person married or began the common-law relationship…** once: "For the household · Read for: Client A, Client B" (11a). Underneath: 1 question, on The application.
* Add: "The application · fills IMM 5257 for 2 people (2 form fields)"; Day 30, Month 6, Year 2012; Save (11b): "30 Jun 2012 · Entered by staff · to confirm · fills IMM 5257 for 2 people" (11c). Underneath: 1 current answer, on the case's own record.
* Client A's and Client B's tabs, read-only: "Answered once for everyone it concerns · … 30 Jun 2012 · Answered for the household by Case officer · … · Change it in For the household", no Add or Edit of their own (12). Child C: nothing, no Add or Edit.
* Generate a copy of IMM 5257 for each: Client A and Client B "1 form fields written · read back and checked", Child C "0 form fields written" (13). XFA: principal and spouse `<DateOfMarriage>2012-06-30</DateOfMarriage>`, child `<DateOfMarriage />`.

## Noted on the way (not C3.16's rules)
* An earlier, exploratory try typed "2012-06-30" into the Day box alone; Save kept "--20" as a Declared answer, shown with "Enter a real date as day, month and year." and not written to the forms ("answered but needing a fix stays blank"). Generic date entry, not scope.
* The field page's "Where it is asked" still reads "Repeats: For each person the form asks about" beside "Asked about: Household" (01d); the case asks it once.
* The case dialog says "release 1" and the case header "Release 2" (QA-140, open).
* The IMM 5710 address box ends "canada" in lower case (09's XFA line).

## Not covered
One pass, 1024 px, headless; not 400/1440 px, keyboard-only, 200% zoom or axe. Filing as a scope and list entries' stable ids (C3.16-4, C3.16-6) and every refusal are the pack's (59/59), not walked. The client's own questionnaire was not opened. IMM 5257's visible date boxes (`MarriageDate` FromYr/FromMM/FromDD sit beside `DateOfMarriage`) were not read in Adobe. The release steps and the case openings' team defaults were set-up or form defaults, not judged.

# J3 — Draft the rest of a combination's masters (P-220 pack 2)

**Who:** the configuration author (`user-A`), then the approver (`user-B`) as the second person. **Combination:** Visitors › Visitor visa (`vv.single`) of the six (Demo menu › Load sample) first. Then part A again on the other five of the six — Study permit outside Canada (`sp.outside`, IMM 5483), Work permit with an LMIA inside Canada (`wp.lmia_inside`, IMM 5556), Spouse sponsorship (`fs.spouse`, IMM 5533 and IMM 5589); Express Entry PNP (`pnp.express_entry`) and the corporate High-wage position (`lm.high_wage`) have no checklist attached, so part A says "No official checklist on this combination yet": the same expected results with each checklist's own lines and quotes.
**Capabilities:** C2.6, C3.4, C11.13, C3.6, C4.11, C3.11. **API checks:** `acceptance/C2.6.test.ts`, `C3.4.test.ts`, `C11.13.test.ts`, `C3.6.test.ts`, `C4.11.test.ts`, `C3.11.test.ts`. **IRCC rules:** `product/compliance-trace.md`, Pack 2 (IRCC-P2-01 … P2-25).
**Money:** Saved and Rules only (US$0). A step offering Live shows its cost and stays greyed on any copy without the founder's Go; the builder's browser check never clicks it (memory rule: no priced-button clicks).
**Start:** a fresh isolated copy; Demo menu › Reset, then Load sample (the six). Visitor visa then has Who can be set (principal, spouse or partner, child, representative) and its form lines (IMM 5257, IMM 5257 Schedule 1, IMM 5707, IMM 5645, IMM 5409, IMM 5476, IMM 5475). **Needs first:** the saved runs of Visitor visa's AI steps, recorded once in the founder-approved live trial (P-131), committed with the build; without them parts A, B and D offer Rules only.

Each step: what the person does → what they must see (and what the data must hold). A builder turns these into a browser check (`tests/check_j3_*_browser.cjs`), at 1440 and 1024 px and at 400 px for steps 3, 8 and 17 (no sideways scroll, nothing cut), axe clean, keyboard only for at least steps 4, 7 and 12.

## A. Documents from the official checklist (C2.6)
1. **Open Visitor visa › Documents.** → The page names the official checklist **IMM 5484 (05-2026)** under Sources, with a button **Draft document lines from the checklist** and the choice *Saved AI result (date, US$0)* · *Rules only* · *Live (about US$…; needs the founder's Go)*, Live greyed.
2. **Choose Saved, click Draft.** → A progress line, then "n document lines proposed from IMM 5484. Nothing is in the combination until you accept." The Review link carries the count. Data: proposals of kind `requirement_line`, group `combination:<vv>`, cost US$0.
3. **Open the review queue for Visitor visa.** → Items under three headings *Ready to accept · Check · Decide*. Each row: the document name, who gives it (Principal applicant, Spouse or partner, Child — the people of Who can be), *Always* or *Only if …*, and IMM 5484's own words beside it with the page.
4. **Check the list against IMM 5484.** → Present: passport information page (Always, each applicant), proof of financial support (Always), proof of payment (Always), two photos (*Only if* no biometrics), proof of legal status in the country of residence (*Only if* it differs from citizenship), US visa copy (*Only if* the person has one). Under **Decide** (the checklist says "Refer to the responsible visa office"): custody documents or authorization for a minor travelling alone or with one parent, marriage licence or certificate, purpose of travel; also "Any additional documents required by the responsible visa office". Absent: IMM 5257, IMM 5707, IMM 5409, IMM 5476, IMM 5475 (those are form lines) and every Super visa document of page 2 (letter of invitation, LICO proof, medical insurance).
5. **Click Draft again.** → The same draft opens; no second set of items appears.
6. **Accept the passport line.** → The row leaves the queue with Undo for 10 s; Documents shows the line as *Draft*, with "From IMM 5484: …" and its quote. Nothing is released (Overview still says not released).
7. **Reject one line without a reason.** → Refused in words: "Say why it is rejected (3 characters or more)…". With a reason it leaves the queue; nothing is added.

## B. Library masters from the form (C3.4, C11.13)
8. **Open IMM 5257 in the Form library and click Draft sections, lists, document types and checks (Saved).** → One edition group *IMM 5257 (09-2023)* in the queue: sections (each listing the form fields it groups), answer lists, document types (each says what it proves), form checks (each with 2–3 worked examples marked *Not confirmed yet*).
9. **Open the marital-status answer list.** → Its values are the form's own choices: Annulled Marriage, Common-Law, Divorced, Legally Separated, Married, Single, Unknown, Widowed (IRCC-P2-25).
10. **Open the Passport document type.** → *Identity document · read from its coded lines*; no option to read it with AI vision (P-134).
11. **Find an item the library already has (e.g. Family name).** → It says **Reuse existing: Family Name (person.family_name)**, never *New*. An item close to an existing one says **Close to: Family Name** and shows its one-line reason; it is under **Check**, not Ready.
12. **Accept a new section.** → It is added as *Draft, waiting for a second person*. As the approver, **Library changes** shows it in the batch, with the near reason where there is one. The Release page's library list shows the same reason.

## C. The fact a rule needs (C3.6) — after part D
13. **After part D (Visitor visa then has rules), on Visitor visa › Rules open a rule and choose Add the fact this rule needs.** → A dialog asks for the fact in words (name, meaning, answer type, who it is about). There is no key box.
14. **Type the name of an existing field (Family Name) and save.** → Refused in words, naming *Family Name (person.family_name)* and where it is used (its combinations or forms); offers to use it instead.
15. **Type a new fact and save.** → "Proposed: waits in the review queue". The queue shows it as *From the rules · rests on rule R-…*, marked *not meaning-checked*. The library has nothing yet.

## D. Draft questions and documents (C4.11)
16. **On Visitor visa › Questionnaires, click Draft questions and documents.** → A plan with 7 steps in order: Facts per person · Documents per person and when · Facts each document supplies · Where each fact comes from · Conditional questions · PQR picks · Independent check. Each shows *Saved (date, US$0)*, *Rules only* or *Live (usual … · at most …)*; Live greyed without the founder's Go.
17. **Run with Saved and Rules only.** → Each step ticks in turn with its count; the run ends "US$0.00". Clicking Run twice starts one run.
18. **Open the queue.** → Items from each step, each naming its step; AI items show both readings (draft and checker) or *One reading only*. Checker findings appear as *Check* items: a PQR pick for a fact no question asks; a fact from a document that is not on the checklist.
19. **Accept one item of each kind.** → Each lands in the combination's draft (Documents, Questionnaires, PQR tab) and appears on Review as a change in words.

## E. Signed scans (C3.11)
20. **On Visitor visa › Forms, set IMM 5257 to PDF upload, signed by hand and scanned.** → Documents shows, for each person applying (principal, spouse or partner, child), *IMM 5257 signed by hand and scanned* with "Because IMM 5257 is filed as PDF upload, signed by hand and scanned" (IRCC-P2-01, P2-07); it has no Move or Remove buttons.
21. **Look at the child's line, then set Signed by to "A parent, for a minor".** → By default the child has their own line (not set = the person signs); with "a parent, for a minor" the child's scan is asked of the principal and adults still sign their own (main's Sample rule). G5256 says a parent or legal guardian signs (IRCC-P2-06): which of the two is right is the founder's open question. The representative never has an IMM 5257 scan; a scan has no Move or Remove of its own, and the last own document cannot move below it.
22. **Set IMM 5257 back to PDF upload with no signature.** → Every signed-scan line of IMM 5257 is gone at once.

## F. Wrong person, same pages
23. **As the approver (`user-B`), open Visitor visa › Documents and the queue.** → *Draft document lines from the checklist* and *Draft questions and documents* are not offered (or disabled, saying "Only an author drafts"); a direct API call answers 403. Accept and Reject are available (the approver holds the review duty) but a new library item still needs a second person.
24. **As the content reviewer (`user-C`), try Add the fact this rule needs.** → Not offered; the API answers 403.
25. **As a client (`user-P`), open any configuration URL.** → "This page is for the configuration people".

**Done when:** every step's expected result holds on `main`, the API checks named above are green and moved into `tests/`, and qa has walked J3 like a person.

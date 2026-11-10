# Visitor visa (outside Canada) — answer key for the Sample family case

**Status: Sample. Unconfirmed: expert. Legal points: Unconfirmed: no counsel.** Made-up family, never a client, never submitted (P-455 (3): sample and test data only). How to mark each row: `README.md` in this folder.

## What this key is

For each official form the app fills on the Visitor visa (`vv.single`), box by box: the value the app writes for each person, the client answer (fact) or rule it comes from, how it is written, and the official instruction behind the question. The immigration expert marks each row Confirmed, Corrected (with source) or Unsure.

**How the values were read (reproducible, US$0, live AI off):** an isolated copy of the reference app built from `main` at `8fc65d0b9` (10 Nov 2026), Demo › Load the finished story (`POST /api/demo/checkpoints/finished-story`, 174 s), then the family case `SAMPLE-VV-FAMILY-1`'s generated copies read from the database (`form_instance.result_json`) and each copy's fill request (`<copy>.request.json`, the exact values sent to the official PDF). Nothing was typed by hand into this key; the copy was stopped and dropped afterwards.

* **IMM 5257:** the four copies made on Visitor visa **release 1**, the same four copies the Lead validated with the form's own Validate button in Adobe on 6 Nov 2026 (`prototype/studio/samples/validated-imm5257.json`: 63 values each, read back equal, no mismatches). The IMM 5257 field map is identical on releases 1 and 2 (242 entries, 0 differences, checked on this copy).
* **Schedule 1, IMM 5645, IMM 5476:** the copies made on Visitor visa **release 2**, the release the case is on after the finished story's move (C9.5).

## The Sample family (from `prototype/studio/samples/sample-family-imm5257.json` and `api/src/sample-case.ts`)

| Person (column) | Born | Marital status | Occupation | Notes |
|---|---|---|---|---|
| Principal ("Client A (Sample)") | 1990-04-12 | married (since 2014-02-14) | accountant | citizen of India, lives and applies in India |
| Spouse ("Partner (Sample)") | 1991-09-03 | married | teacher | same |
| Child 18+ ("Child 18 or over (Sample)") | 2007-03-14 | single | student | answers for themselves; their IMM 5257 is on Paper with a reason on release 2 |
| Child <18 ("Child (Sample)") | 2016-05-20 | single | student | answered by the principal; under 14, so no biometrics |

The case: family visit, 2027-06-01 to 2027-08-31, CAD 5,000 available, visiting a brother in Toronto; represented by the Sample firm's representative (licence "R000000", Sample), so IMM 5476 applies.

## Which forms the release fills, and for whom

Release 2's form lines (from the release snapshot) and the rule behind each (`api/src/form-setup.ts` `VV_FORM_RULES`, `FAMILY_FORM_BY_CHANNEL`; each rule's quote is in the app):

| Form | Who | Rule | Official words the rule rests on | Filled for this family? |
|---|---|---|---|---|
| IMM 5257 | each applicant | always; channel **Online** on release 2 (filed in the IRCC account), so a PDF copy is made only for a person moved to Paper with a reason | [G5256]: "This form must be completed by each person applying for a Temporary Resident Visa to visit Canada." | yes, 4 copies (release 1) |
| IMM 5257 SCH1 | principal, spouse, children 18 or older | always, minimum age 18 | [S1] p. 1: "The principal applicant, his or her spouse or common-law partner, if applicable, and all dependent children aged 18 years or older listed in the application for temporary residence must complete their own copy of this form." | yes, 3 copies |
| IMM 5645 | each person 18 or older | always on the online channel (IMM 5707 on paper) | [F5645]: "This form must be completed by each person, 18 years of age or older, applying for a Temporary Resident Visa, a study or work permit outside Canada." | yes, 3 copies |
| IMM 5476 | principal, spouse, children 18 or older | when the case uses a representative | IMM 5484 (05-2026) p. 1: "Complete this form only if you used the services of a representative, or if you are appointing or cancelling a representative."; [F5476]: "Separate authorization forms are required for a spouse or common-law partner even if they are included in the same application." | yes, 3 copies |
| IMM 5409 | each applicant | when marital status is common-law | [G5256] Q10: "If you are in a common-law union, you must also request and fill out the Statutory Declaration of Common-law Union [IMM 5409] form" | no (married) |
| IMM 5475 | each applicant | when the applicant authorizes release to a designated individual | IMM 5484 p. 1: "Complete this form only if you authorize … (IRCC) and the Canada Border Services Agency (CBSA) to release information from your case file to someone other than yourself." | no on release 2 |
| IRM 0002 | each applicant | when the chosen gender identifier differs from earlier documents | [G5256] Personal Details Q3 note (quoted in the app) | no (answered No for all four) |

The expert confirms both the rule (who and when) and each box below.

## Sources (our saved official copies; canada.ca could not be reached from the cloud session on 10 Nov 2026, so nothing was re-read live)

* **[G5256]** Guide 5256, Applying for a visitor visa, paper instructions: canada.ca page `…/application-forms-guides/guide-5256-applying-visitor-visa-temporary-resident-visa.html`, page date 2026-03-31, saved 19 Oct 2026 (`official-sources/ircc/instructions/guide-5256.html`).
* **[S1]** IMM 5257 SCH1 (09-2023), the form itself, saved 19 Oct 2026 (`official-sources/ircc/forms/imm5257_1e.pdf`).
* **[F5645]** canada.ca "Family Information (IMM 5645)" page, page date 2024-06-21, saved 19 Oct 2026 (`official-sources/ircc/web-pages/page-imm5645.html`).
* **[F5476]** canada.ca "Use of a Representative Form (IMM 5476)" page, page date 2025-12-12, saved 19 Oct 2026 (`official-sources/ircc/web-pages/page-imm5476.html`). It describes the **11-2025** edition.
* IMM 5484 (05-2026), Document checklist, visitor visa, saved 19 Oct 2026 (`official-sources/ircc/checklists/imm5484e.pdf`); IMM 5881 E (05-2026), New Delhi visa office additional checklist (`official-sources/ircc/checklists/IMM5881E.pdf`, text in `prototype/expected/source-text/IMM5881E.txt`).

## ⚑ Placeholder values: read this before marking

The finished story answers every question release 2 asks. Where the Sample record holds no answer, it writes **a placeholder by kind of answer** (`prototype/studio/samples/finished-story.json` `by_kind`): text "SAMPLE", date 2024-01-15, month 2024-01, expiry 2035-06-30, number 5000, digits "0000000001", phone 91 9800000002, address "Sample Road, Sample City, Canada", Yes/No "No", a list's first choice. A row marked **⚑** carries such a placeholder (or a value whose fact is not in the Sample record). **For a ⚑ row, judge only the mapping (is this the right fact for this box, written the right way?), not the value.** IMM 5257 has no ⚑ value; Schedule 1 has 6, IMM 5645 most, IMM 5476 6.

## What the lead wants the expert to look at first (ranked by impact)

1. **IMM 5476 is filled on the 11-2021 edition** (field map "IMM 5476 (11-2021)"). [F5476]: "A new version of this form is available (11-2025). Make sure you are using the most recent version. We will continue to accept the previous versions of the form until March 12, 2026." On 10 Nov 2026 the edition the app fills is past that date. The demo keeps 2021 on purpose for its new-edition story (`product/DEMO.md` row 17, C9.1), but **no real release may use it**; the 11-2025 edition (`official-sources/ircc/forms/imm5476e.pdf`, held in the library) needs its own map and key. The 2021 form's section letters (A–D) differ from the 11-2025 page's (A–E).
2. **IMM 5645's values are mostly placeholders, so its key cannot be confirmed by value yet.** The applicant's own name reads "SAMPLE" and present address "Sample Road, Sample City, Canada" (the family lives in New Delhi): Section A reads `person.full_name` and `person.present_address`, facts the questionnaire asks separately instead of reusing the name and residential address the same person gave for IMM 5257. Parents, children and siblings are not drawn from the case's people (open bug QA-153, `api/src/finished-story.ts` `HELD.family`), so the principal's two children, who are on the case, show as "SAMPLE". Ask the expert to confirm the map only.
3. **Schedule 1 says the principal is not the principal applicant.** "Indicate whether you are … the principal applicant" (`case.subject_is_principal_applicant`) is written "false" on all three copies, including the principal's: a placeholder, where the person's role on the case already gives the answer. The same copies write UCI "0000000001" while IMM 5257 leaves UCI blank as [G5256] says for a first application ("If this is your first time dealing with us you will not have a UCI").
4. **When Schedule 1 is needed.** The release requires it for every applicant 18 or older ([S1]'s header). IMM 5881 E (05-2026), the New Delhi checklist, says: "If you have answered “yes” to any of the background information questions on the application form, provide a completed and signed Schedule 1 form". Which governs for an applicant in India, and for the online channel?
5. **Which family form.** Release 2 picks IMM 5645 because IMM 5257 is filed online; IMM 5484 and IMM 5881 E name IMM 5707; [G5256] says "the Family Information form (IMM 5707 or IMM 5645) listed in the application package for your country" (`product/compliance-trace.md` IRCC-P2-04a: the sources differ).
6. **A paper IMM 5257 for one person.** The finished story puts the child 18+'s IMM 5257 on Paper with a reason to show the Adobe step (C11.6). Canada.ca "Apply for a visitor visa" (page date 2026-08-28): "You must apply online." with paper only in listed cases (`compliance-trace.md` VV-R02). The expert confirms that a real case may file paper only with one of those reasons.
7. **IMM 5476 gaps on the copy:** "Type of application" and the appoint/cancel tick are left to a person (their transforms are not executable yet); "Name of office" is a placeholder; the app treats IMM 5476 as a hand-signed scan, while [F5476] also lists e-signature ("Typed name") for forms submitted through a portal or secure account.
8. **Questions not mapped yet (filled by hand):** IMM 5257 Q11 previous spouse rows and Background Q1c details, Schedule 1 Q5 event rows, IMM 5645 marital status and the siblings' Yes/No ticks. Blank is right for this family; a family that answers Yes needs them mapped before a real release.


## 1. IMM 5257 — Application for Temporary Resident Visa (each applicant)

Who fills it: each applicant ([G5256]). Signed by the person if 18 or older, by a parent or legal guardian under 18 ([G5256], "To complete your form"); the app never writes a signature. On release 2 the line is **Online** (the answers go into the IRCC account through the portal sheet, C7.3); these PDF copies are release 1's, validated in Adobe. Values are the form's own codes (for example service language "01" = English, sex code, country codes) as the field map writes them; the "How written" column names the code list.


Field map: **IMM 5257 (09-2023)**, 242 form fields: 166 filled from a fact, 9 by a person, 65 form helpers (not facts), 2 never filled (signatures, office use). Copies read: Principal `e27da5d2`, Spouse `52b8666f`, Child 18+ `054a45e1`, Child <18 `e9235783`.


**IMM 5257 top, Question 1 (UCI)** — official instruction: “Type your universal client identification number (UCI), if known. Otherwise, leave it blank.” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 1 | UCI | `person.uci`<br>when: Only if the person already has a UCI; max 10 characters | as_is | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | ☐ |

**IMM 5257 top, Question 2 (service language)** — official instruction: “From the list, select the language (English or French) in which you would like to receive your service.” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 2 | * I want service in | `case.service_language` | code_list:imm5257.service_in (English=01, French=0 | 01 | 01 | 01 | 01 | ☐ |

**IMM 5257 top, Question 3 (visa requested)** — official instruction: “From the list, select the type of visa you are applying for: Visitor visa … Transit Visa” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 3 | * Visa requested | `case.visa_type_requested` | code_list:imm5257.visa_type (VisitorVisa, Transit) | VisitorVisa | VisitorVisa | VisitorVisa | VisitorVisa | ☐ |

**Personal Details, Question 1 (full name)** — official instruction: “Type your family name (surname) exactly as shown on your passport or travel document (even if the name is misspelled). Do not use initials.” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 4 | *Family name (as shown on your passport or travel document) | `person.family_name`<br>when: Max 100 characters | as_is | EXAMPLE | EXAMPLEP | EXAMPLE | EXAMPLE | ☐ |
| 5 | Given name(s) (as shown on your passport or travel document) | `person.given_names`<br>when: Max 100 characters | as_is | CLIENTA | PARTNER | SECOND CHILD | CHILD | ☐ |

**Personal Details, Question 2 (other names)** — official instruction: “Check the box to tell us if you have ever used any other name. This could include your birth name, maiden name, married name, nickname, etc.” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 6 | Family name | `person.other_family_name`<br>when: Only when AliasNameIndicator = Y; one name only on the form | as_is | _not written_: Not needed: "Whether the person has ever used another name ( | _not written_: Not needed: "Whether the person has ever used another name ( | _not written_: Not needed: "Whether the person has ever used another name ( | _not written_: Not needed: "Whether the person has ever used another name ( | ☐ |
| 7 | Given name(s) | `person.other_given_names`<br>when: Only when AliasNameIndicator = Y; one name only on the form | as_is | _not written_: Not needed: "Whether the person has ever used another name ( | _not written_: Not needed: "Whether the person has ever used another name ( | _not written_: Not needed: "Whether the person has ever used another name ( | _not written_: Not needed: "Whether the person has ever used another name ( | ☐ |
| 8 | Question 2 A Have you ever used any other name such as a nickname, maiden name or alias? | `person.has_used_other_name` | derived:any(person.other_family_name, person.other | N | N | N | N | ☐ |

**Personal Details, Question 3 (gender)** — official instruction: “Choose your gender (F-Female, M-Male, U-Unknown or X-Another gender).” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 9 | *Sex | `person.sex` | code_list:imm5257.sex (Female, Male, Unknown, Unsp | Male | Female | Female | Male | ☐ |

**Personal Details, Question 4 (date of birth)** — official instruction: “Enter your date of birth. If your entire date of birth is unknown, please use ‘*’ … to fill in the spaces for the year, month or day, where applicable.” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 10 | DD | `person.date_of_birth` | date_part:DD | 12 | 03 | 14 | 20 | ☐ |
| 11 | MM | `person.date_of_birth` | date_part:MM | 04 | 09 | 03 | 05 | ☐ |
| 12 | YYYY | `person.date_of_birth` | date_part:YYYY | 1990 | 1991 | 2007 | 2016 | ☐ |

**Personal Details, Question 5 (place of birth)** — official instruction: “if your city, town, country or territory of birth is indicated in your passport or your travel document, please record it as it appears in the document.” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 13 | * City/Town | `person.birth_city`<br>when: Max 30 characters | as_is | NEW DELHI | NEW DELHI | NEW DELHI | NEW DELHI | ☐ |
| 14 | * Country or Territory | `person.birth_country` | code_list:imm5257.country_birth | 205 | 205 | 205 | 205 | ☐ |

**Personal Details, Question 6 (citizenship)** — official instruction: “If you are a citizen of more than one country or territory, choose the country or territory that issued the passport you will be using for this trip.” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 15 | Citizenship | `person.citizenship`<br>when: Single box: if the person holds more than one citizenship the reviewer must choose which one | code_list:imm5257.citizenship | 205 | 205 | 205 | 205 | ☐ |

**Personal Details, Question 7 (current country of residence)** — official instruction: “The name of the country or territory you live in, if you have been lawfully admitted … Your immigration status … The dates (From – To) you have been living in your country or territory of residence.” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 16 | * | `person.current_residence_country` | code_list:imm5257.country_residence | 205 | 205 | 205 | 205 | ☐ |
| 17 | Question 7 D The start date of your immigration status in your current country of residence in YYYY-MM-DD form | `person.current_residence_status_from` | date:YYYY-MM-DD | _not written_: Not needed: written only when the immigration status in the  | _not written_: Not needed: written only when the immigration status in the  | _not written_: Not needed: written only when the immigration status in the  | _not written_: Not needed: written only when the immigration status in the  | ☐ |
| 18 | Question 7 C If your immigration status is other, please give details. | `person.current_residence_status_other`<br>when: Only when current status = Other (06); max 30 characters | as_is | _not written_: Not needed: written only when the immigration status in the  | _not written_: Not needed: written only when the immigration status in the  | _not written_: Not needed: written only when the immigration status in the  | _not written_: Not needed: written only when the immigration status in the  | ☐ |
| 19 | * | `person.current_residence_status` | code_list:imm5257.immigration_status (Citizen=01,  | 01 | 01 | 01 | 01 | ☐ |
| 20 | Question 7 E The end date of your immigration status in your current country of residence in YYYY-MM-DD format | `person.current_residence_status_to`<br>when: Leave empty if the status has no end date | date:YYYY-MM-DD | _not written_: Not needed: written only when the immigration status in the  | _not written_: Not needed: written only when the immigration status in the  | _not written_: Not needed: written only when the immigration status in the  | _not written_: Not needed: written only when the immigration status in the  | ☐ |

**Personal Details, Question 8 (previous countries of residence)** — official instruction: “Check the box to tell us if during the past five years, you have lived in any other country or territory other than your country of citizenship or your current country or territory of residence … for more than six months?” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 21 | Question 8 A. During the past 5 years have you lived in any country other than your country of citizenship or  | `person.previous_residence_country` | derived:any previous residence in past 5 years, ov | N | N | N | N | ☐ |
| 22 | Question 8 B Row 1 Country or Territory. If you replied Yes to question 8 A, please give your previous country | `person.previous_residence_country`<br>when: Only when PCRIndicator = Y; row 0 = first previous residence | code_list:imm5257.country_residence | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | ☐ |
| 23 | Question 8 B Row 1 Status From Date. The start date of your immigration status in your previous country of res | `person.previous_residence_from`<br>when: Only when PCRIndicator = Y | date:YYYY-MM-DD | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | ☐ |
| 24 | Question 8 B Row 1 Other Details. If your immigration status was other, please give details. | `person.previous_residence_status_other`<br>when: Only when this row's status = Other (06); max 30 characters | as_is | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | ☐ |
| 25 | Question 8 B Row 1 Status. Your immigration status in your previous country of residence | `person.previous_residence_status`<br>when: Only when PCRIndicator = Y | code_list:imm5257.immigration_status (Citizen=01,  | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | ☐ |
| 26 | Question 8 B Row 1 Status To Date. The end date of your immigration status in your previous country of residen | `person.previous_residence_to`<br>when: Only when PCRIndicator = Y | date:YYYY-MM-DD | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | ☐ |
| 27 | Question 8 B Row 2 Country or Territory . If you have more than one previous country of residence, please give | `person.previous_residence_country`<br>when: Only when PCRIndicator = Y and a second previous residence exists | code_list:imm5257.country_residence | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | ☐ |
| 28 | Question 8 B Row 2 Status From Date. The start date of your immigration status in your previous country of res | `person.previous_residence_from`<br>when: Only when a second previous residence exists | date:YYYY-MM-DD | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | ☐ |
| 29 | Question 8 B Row 2 Other Details. If your immigration status was other, please give details. | `person.previous_residence_status_other`<br>when: Only when this row's status = Other (06); max 30 characters | as_is | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | ☐ |
| 30 | Question 8 B Row 2 Status. Your immigration status in your previous country of residence | `person.previous_residence_status`<br>when: Only when a second previous residence exists; inventory shows a stored default of Student (05) in this box, wh | code_list:imm5257.immigration_status (Citizen=01,  | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | ☐ |
| 31 | Question 8 B Row 2 Status To Date. The end date of your immigration status in your previous country of residen | `person.previous_residence_to`<br>when: Only when a second previous residence exists | date:YYYY-MM-DD | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | ☐ |

**Personal Details, Question 9 (applying from)** — official instruction: “Check the box to tell us if you are applying from the country or territory you live in.” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 32 | Question 9 A. Is the country from where you are applying the same as your current country of residence? | `person.applying_from_country` | derived:person.applying_from_country equals person | Y | Y | Y | Y | ☐ |
| 33 | Question 9 A. Is the country or territory from where you are applying the same as your current country or terr | `person.applying_from_country`<br>when: Only when SameAsCORIndicator = N; caption in inventory appears shifted (shows question 9 A text) but the box i | code_list:imm5257.country_residence | _blank_: Not needed: "Is the country from where you are applying the  | _blank_: Not needed: "Is the country from where you are applying the  | _blank_: Not needed: "Is the country from where you are applying the  | _blank_: Not needed: "Is the country from where you are applying the  | ☐ |
| 34 | Question 9 B. Status From Date. The start date of your immigration status in the country from where you are ap | `person.applying_from_status_from`<br>when: Only when SameAsCORIndicator = N | date:YYYY-MM-DD | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | ☐ |
| 35 | Question 9 B Other Details. If your immigration status is other, please give details. | `person.applying_from_status_other`<br>when: Only when SameAsCORIndicator = N and status = Other (06); max 30 characters | as_is | _not written_: Waiting for "Immigration status in the country from which th | _not written_: Waiting for "Immigration status in the country from which th | _not written_: Waiting for "Immigration status in the country from which th | _not written_: Waiting for "Immigration status in the country from which th | ☐ |
| 36 | Question 9 B Country. If you replied No to question 9 A, please give the country from where you are applying. | `person.applying_from_status`<br>when: Only when SameAsCORIndicator = N; caption appears shifted (describes the country) but the box offers status op | code_list:imm5257.immigration_status (Citizen=01,  | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | ☐ |
| 37 | Question 9 B Status To Date. The end date of your immigration status in the country from where you are applyin | `person.applying_from_status_to`<br>when: Only when SameAsCORIndicator = N | date:YYYY-MM-DD | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | _not written_: Personal details | ☐ |

**Personal Details, Question 10 (marital status)** — official instruction: “Enter the date (year, month and day) you were married or you entered into your current common-law relationship. Type the family names and given names of your current spouse or common-law partner.” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 38 | Date | `relationship.union_start_date`<br>when: Only when marital status is Married (01) or Common-Law (03) | date:YYYY-MM-DD | 2014-02-14 | 2014-02-14 | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | ☐ |
| 39 | Family name | `person.family_name`<br>when: Only when marital status is Married (01) or Common-Law (03); max 100 characters | as_is | EXAMPLEP | EXAMPLE | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | ☐ |
| 40 | Given name(s) | `person.given_names`<br>when: Only when marital status is Married (01) or Common-Law (03); max 100 characters | as_is | PARTNER | CLIENTA | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | ☐ |
| 41 | * a) Your current marital status | `person.marital_status` | code_list:imm5257.marital_status (Annulled Marriag | 01 | 01 | 02 | 02 | ☐ |

**Personal Details, Question 11 (previous relationship)** — official instruction: “Check the box to tell us if you have ever been married or in a common-law relationship. If you checked “Yes”, enter … All family names, All given names, Date of birth, Type of relationship … Dates (From – To)” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 42 | Question 11 A. Have you previously been married or in a common law relationship? | `relationship.previously_married_or_common_law` | yes_no_code:Y/N | N | N | N | N | ☐ |
| 43 | Family name | `by a person (not mapped yet)`<br>when: Only when PrevMarriedIndicator = Y |  | _blank_ | _blank_ | _blank_ | _blank_ | ☐ |
| 44 | DD | `by a person (not mapped yet)`<br>when: Only when PrevMarriedIndicator = Y |  | _blank_ | _blank_ | _blank_ | _blank_ | ☐ |
| 45 | MM | `by a person (not mapped yet)`<br>when: Only when PrevMarriedIndicator = Y |  | _blank_ | _blank_ | _blank_ | _blank_ | ☐ |
| 46 | YYYY | `by a person (not mapped yet)`<br>when: Only when PrevMarriedIndicator = Y |  | _blank_ | _blank_ | _blank_ | _blank_ | ☐ |
| 47 | Given name(s) | `by a person (not mapped yet)`<br>when: Only when PrevMarriedIndicator = Y |  | _blank_ | _blank_ | _blank_ | _blank_ | ☐ |
| 48 | From | `by a person (not mapped yet)`<br>when: Only when PrevMarriedIndicator = Y |  | _blank_ | _blank_ | _blank_ | _blank_ | ☐ |
| 49 | To | `by a person (not mapped yet)`<br>when: Only when PrevMarriedIndicator = Y |  | _blank_ | _blank_ | _blank_ | _blank_ | ☐ |
| 50 | d) Type of relationship | `by a person (not mapped yet)`<br>when: Only when PrevMarriedIndicator = Y |  | _blank_ | _blank_ | _blank_ | _blank_ | ☐ |

**Languages, Question 1** — official instruction: “Choose your native language (mother tongue). … Choose English, French or both as your language of communication … Check “Yes” or “No” to tell us if you have taken a test from a designated testing agency to test your abilities in English or French.” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 51 | 1d. Have you taken a test form a designated testing agency to assess your proficiency in English or French? | `person.language_test_taken` | yes_no_code:Y/N | N | N | N | N | ☐ |
| 52 | *b) Are you able to communicate in English and/or French? | `person.official_language_ability` | code_list:imm5257.able_to_communicate (English, Fr | English | English | English | English | ☐ |
| 53 | c) In which language are you most at ease? | `person.preferred_official_language`<br>when: Normally answered only when the person communicates in both; no presence script in the inventory confirms this | code_list:imm5257.language_at_ease (English=01, Fr | _not written_: Not needed: written only when the person is able to communic | _not written_: Not needed: written only when the person is able to communic | _not written_: Not needed: written only when the person is able to communic | _not written_: Not needed: written only when the person is able to communic | ☐ |
| 54 | *a) Native language/Mother Tongue | `person.native_language` | code_list:imm5257.native_language | 321 | 321 | 321 | 321 | ☐ |

**Passport, Questions 1–6** — official instruction: “Type your valid passport or travel document number exactly as shown on the document. Make sure there is no space between each number or letter. … Enter the date your passport or travel document was issued. … will expire.” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 55 | * Country or territory of issue | `person.passport_country_of_issue`<br>when: Several entries share a prefix (e.g. three CHN codes 202/200/198); reviewer must confirm the exact issuing aut | code_list:imm5257.passport_country | 205 | 205 | 205 | 205 | ☐ |
| 56 | * Expiry date | `person.passport_expiry_date` | date:YYYY-MM-DD | 2029-05-09 | 2029-05-09 | 2029-05-09 | 2029-05-09 | ☐ |
| 57 | Question 1d. Have you taken a test form a designated testing agency to assess your proficiency in English or F | `person.national_israeli_passport`<br>when: Only when CountryofIssue[0] holds 206 ("ISR (Israel)"): the form's own script requires it only then. | yes_no_code:Y/N | _not written_: Not needed: its condition is not met | _not written_: Not needed: its condition is not met | _not written_: Not needed: its condition is not met | _not written_: Not needed: its condition is not met | ☐ |
| 58 | * Issue date | `person.passport_issue_date` | date:YYYY-MM-DD | 2019-05-10 | 2019-05-10 | 2019-05-10 | 2019-05-10 | ☐ |
| 59 | * Passport number | `person.passport_number`<br>when: Max 20 characters; data path sits under MaritalStatus but the Passport group is the applicant's passport secti | as_is | Z7000001 | Z7000002 | Z7000004 | Z7000003 | ☐ |
| 60 | Question 1d. Have you taken a test form a designated testing agency to assess your proficiency in English or F | `person.taiwan_passport_with_personal_id_number`<br>when: Only when CountryofIssue[0] holds 203 ("TWN (Taiwan)"): the form's own script requires it only then. | yes_no_code:Y/N | _not written_: Not needed: its condition is not met | _not written_: Not needed: its condition is not met | _not written_: Not needed: its condition is not met | _not written_: Not needed: its condition is not met | ☐ |

**National Identity Document, Questions 1–5** — official instruction: “Check “Yes” or “No” to tell us if you have a national identity document. … Enter your national identity document number exactly as shown on the document.” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 61 | Country or territory of issue | `person.national_id_country_of_issue`<br>when: Only when natIDIndicator = Y | code_list:imm5257.passport_country | _not written_: Not needed: "Whether the person holds a national identity do | _not written_: Not needed: "Whether the person holds a national identity do | _not written_: Not needed: "Whether the person holds a national identity do | _not written_: Not needed: "Whether the person holds a national identity do | ☐ |
| 62 | Document number | `person.national_id_number`<br>when: Only when natIDIndicator = Y; max 20 characters | as_is | _not written_: Not needed: "Whether the person holds a national identity do | _not written_: Not needed: "Whether the person holds a national identity do | _not written_: Not needed: "Whether the person holds a national identity do | _not written_: Not needed: "Whether the person holds a national identity do | ☐ |
| 63 | Expiry date | `person.national_id_expiry_date`<br>when: Only when natIDIndicator = Y | date:YYYY-MM-DD | _not written_: Not needed: "Whether the person holds a national identity do | _not written_: Not needed: "Whether the person holds a national identity do | _not written_: Not needed: "Whether the person holds a national identity do | _not written_: Not needed: "Whether the person holds a national identity do | ☐ |
| 64 | Issue date | `person.national_id_issue_date`<br>when: Only when natIDIndicator = Y | date:YYYY-MM-DD | _not written_: Not needed: "Whether the person holds a national identity do | _not written_: Not needed: "Whether the person holds a national identity do | _not written_: Not needed: "Whether the person holds a national identity do | _not written_: Not needed: "Whether the person holds a national identity do | ☐ |
| 65 | National Identity Document Section Question 1. Do you have a national identity document? | `person.has_national_id` | derived:person.national_id_number recorded -> yes_ | N | N | N | N | ☐ |

**US PR Card, Questions 1–3** — official instruction: “Check “Yes” or “No” to tell us if you are a lawful Permanent Resident of the United States with a valid alien registration card (green card).” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 66 | National Identity Document Section Question 1. Do you have a national identity document? | `person.us_permanent_resident`<br>when: Caption in inventory is copied from the national ID question; the heading gives the real question | derived:valid person.us_green_card_number recorded | N | N | N | N | ☐ |
| 67 | Document number | `person.us_green_card_number`<br>when: Only when usCardIndicator = Y; max 20 characters | as_is | _not written_: Not needed: "Whether the person is a lawful permanent reside | _not written_: Not needed: "Whether the person is a lawful permanent reside | _not written_: Not needed: "Whether the person is a lawful permanent reside | _not written_: Not needed: "Whether the person is a lawful permanent reside | ☐ |
| 68 | Expiry date | `person.us_green_card_expiry_date`<br>when: Only when usCardIndicator = Y | date:YYYY-MM-DD | _not written_: Not needed: "Whether the person is a lawful permanent reside | _not written_: Not needed: "Whether the person is a lawful permanent reside | _not written_: Not needed: "Whether the person is a lawful permanent reside | _not written_: Not needed: "Whether the person is a lawful permanent reside | ☐ |

**Contact Information, Question 1 (mailing address)** — official instruction: “Type your current mailing address (where information should be mailed). … Street name. Do not abbreviate words (Street, Avenue, Boulevard, Drive, etc.) except for directions” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 69 | Apt/Unit | `person.mailing_address`<br>when: Max 10 characters | address_part:apt_unit | _blank_: address has no apt_unit | _blank_: address has no apt_unit | _blank_: address has no apt_unit | _blank_: address has no apt_unit | ☐ |
| 70 | P.O. box | `person.mailing_address`<br>when: Max 15 characters | address_part:po_box | _blank_: address has no po_box | _blank_: address has no po_box | _blank_: address has no po_box | _blank_: address has no po_box | ☐ |
| 71 | Street no. | `person.mailing_address`<br>when: Max 10 characters | address_part:street_number | 12 | 12 | 12 | 12 | ☐ |
| 72 | * Street name | `person.mailing_address`<br>when: Max 100 characters | address_part:street_name | EXAMPLE ROAD | EXAMPLE ROAD | EXAMPLE ROAD | EXAMPLE ROAD | ☐ |
| 73 | * City/Town | `person.mailing_address`<br>when: Max 30 characters | address_part:city | NEW DELHI | NEW DELHI | NEW DELHI | NEW DELHI | ☐ |
| 74 | * Country or Territory | `person.mailing_address` | address_part:country -> code_list:imm5257.country_ | 205 | 205 | 205 | 205 | ☐ |
| 75 | District | `person.mailing_address`<br>when: Max 30 characters | address_part:district | _blank_: address has no district | _blank_: address has no district | _blank_: address has no district | _blank_: address has no district | ☐ |
| 76 | Postal code | `person.mailing_address`<br>when: Max 10 characters | address_part:postal_code | 110001 | 110001 | 110001 | 110001 | ☐ |
| 77 | Province/State | `person.mailing_address`<br>when: Option list holds Canadian provinces and territories only; leave empty when the address is outside Canada | address_part:province_state -> code_list:imm5257.p | _blank_: address has no province | _blank_: address has no province | _blank_: address has no province | _blank_: address has no province | ☐ |

**Contact Information, Question 2 (residential address)** — official instruction: “Check the box to tell us if the address you live at is the same as your mailing address. If “No”, type the following information” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 78 | Question 2 Is your residential address the same as your mailing address? | `person.residential_address` | derived:person.residential_address equals person.m | Y | Y | Y | Y | ☐ |
| 79 | Apt/Unit | `person.residential_address`<br>when: Only when SameAsMailingIndicator = N; max 10 characters | address_part:apt_unit | _blank_: address has no apt_unit | _blank_: address has no apt_unit | _blank_: address has no apt_unit | _blank_: address has no apt_unit | ☐ |
| 80 | City/Town | `person.residential_address`<br>when: Only when SameAsMailingIndicator = N; max 30 characters | address_part:city | _blank_: Not needed: "Is your residential address the same as your ma | _blank_: Not needed: "Is your residential address the same as your ma | _blank_: Not needed: "Is your residential address the same as your ma | _blank_: Not needed: "Is your residential address the same as your ma | ☐ |
| 81 | Street name | `person.residential_address`<br>when: Only when SameAsMailingIndicator = N; max 100 characters | address_part:street_name | _blank_: Not needed: "Is your residential address the same as your ma | _blank_: Not needed: "Is your residential address the same as your ma | _blank_: Not needed: "Is your residential address the same as your ma | _blank_: Not needed: "Is your residential address the same as your ma | ☐ |
| 82 | Street no. | `person.residential_address`<br>when: Only when SameAsMailingIndicator = N; max 10 characters | address_part:street_number | _blank_: Not needed: "Is your residential address the same as your ma | _blank_: Not needed: "Is your residential address the same as your ma | _blank_: Not needed: "Is your residential address the same as your ma | _blank_: Not needed: "Is your residential address the same as your ma | ☐ |
| 83 | Country or Territory | `person.residential_address`<br>when: Only when SameAsMailingIndicator = N | address_part:country -> code_list:imm5257.country_ | _blank_: Not needed: "Is your residential address the same as your ma | _blank_: Not needed: "Is your residential address the same as your ma | _blank_: Not needed: "Is your residential address the same as your ma | _blank_: Not needed: "Is your residential address the same as your ma | ☐ |
| 84 | District | `person.residential_address`<br>when: Only when SameAsMailingIndicator = N; max 30 characters | address_part:district | _blank_: address has no district | _blank_: address has no district | _blank_: address has no district | _blank_: address has no district | ☐ |
| 85 | Postal code | `person.residential_address`<br>when: Only when SameAsMailingIndicator = N; max 10 characters | address_part:postal_code | _blank_: Not needed: "Is your residential address the same as your ma | _blank_: Not needed: "Is your residential address the same as your ma | _blank_: Not needed: "Is your residential address the same as your ma | _blank_: Not needed: "Is your residential address the same as your ma | ☐ |
| 86 | Province/State | `person.residential_address`<br>when: Only when SameAsMailingIndicator = N; Canadian provinces only, leave empty outside Canada | address_part:province_state -> code_list:imm5257.p | _blank_: address has no province | _blank_: address has no province | _blank_: address has no province | _blank_: address has no province | ☐ |

**Contact Information, Questions 3–5 (telephone, other telephone, fax)** — official instruction: “Check the correct box to tell us if the telephone number is from Canada, the United States (US) or Other (any other country). Choose the type of telephone … Type your telephone number including the country code” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 87 | Canada/US | `person.alternate_telephone_number`<br>when: Only if an alternate number exists; shows NANumber boxes | derived:country code of person.alternate_telephone | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | ☐ |
| 88 | No. | `person.alternate_telephone_number`<br>when: Only when Other is checked for the alternate number | phone_part:international_number_without_plus | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | ☐ |
| 89 | No. | `person.alternate_telephone_number`<br>when: Only when Canada/US is checked for the alternate number | phone_part:nanp_area_code | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | ☐ |
| 90 | Question 4 3 digit Exchange Number | `person.alternate_telephone_number`<br>when: Only when Canada/US is checked for the alternate number | phone_part:nanp_exchange | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | ☐ |
| 91 | Question 4 3 digit Subscriber Number | `person.alternate_telephone_number`<br>when: Only when Canada/US is checked for the alternate number | phone_part:nanp_subscriber | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | ☐ |
| 92 | Country Code | `person.alternate_telephone_number`<br>when: Only if an alternate number exists | phone_part:country_code | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | ☐ |
| 93 | Ext. | `person.alternate_telephone_number`<br>when: Only if the alternate number has an extension | phone_part:extension | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | ☐ |
| 94 | Other | `person.alternate_telephone_number`<br>when: Only if an alternate number exists; shows IntlNumber | derived:country code of person.alternate_telephone | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | ☐ |
| 95 | Type | `person.alternate_telephone_type`<br>when: Only if an alternate number exists | code_list:imm5257.phone_type (Residence=01, Cellul | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | ☐ |
| 96 | Canada/US | `person.telephone_number`<br>when: Checking it shows the NANumber boxes and hides IntlNumber | derived:country code of person.telephone_number is | 0 | 0 | 0 | 0 | ☐ |
| 97 | No. | `person.telephone_number`<br>when: Only when Other is checked; max 20 characters | phone_part:international_number_without_plus | 9800000001 | 9800000001 | 9800000001 | 9800000001 | ☐ |
| 98 | No. | `person.telephone_number`<br>when: Only when Canada/US is checked | phone_part:nanp_area_code | _blank_: not a North American number | _blank_: not a North American number | _blank_: not a North American number | _blank_: not a North American number | ☐ |
| 99 | Question 3 3 digit Exchange Number | `person.telephone_number`<br>when: Only when Canada/US is checked | phone_part:nanp_exchange | _blank_: not a North American number | _blank_: not a North American number | _blank_: not a North American number | _blank_: not a North American number | ☐ |
| 100 | Question 3 4 digit Subscriber Number | `person.telephone_number`<br>when: Only when Canada/US is checked | phone_part:nanp_subscriber | _blank_: not a North American number | _blank_: not a North American number | _blank_: not a North American number | _blank_: not a North American number | ☐ |
| 101 | Country Code | `person.telephone_number`<br>when: Max 4 characters | phone_part:country_code | 91 | 91 | 91 | 91 | ☐ |
| 102 | Ext. | `person.telephone_number`<br>when: Only if the number has an extension; max 5 characters | phone_part:extension | _blank_: no extension | _blank_: no extension | _blank_: no extension | _blank_: no extension | ☐ |
| 103 | Other | `person.telephone_number`<br>when: Checking it shows IntlNumber and hides NANumber | derived:country code of person.telephone_number is | 1 | 1 | 1 | 1 | ☐ |
| 104 | Type | `person.telephone_type` | code_list:imm5257.phone_type (Residence=01, Cellul | 02 | 02 | 02 | 02 | ☐ |

**Contact Information, Questions 5–6 (fax, e-mail)** — official instruction: “If you have one, type your e-mail address … By giving us your e-mail address, you are hereby authorizing us to send your correspondence, including file and personal information electronically to this address.” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 105 | E-mail address | `person.email`<br>when: Max 100 characters | as_is | client.a@example.com | partner@example.com | child.two@example.com | client.a@example.com | ☐ |
| 106 | Canada/US | `person.fax_number`<br>when: Only if a fax number exists; shows NANumber boxes | derived:country code of person.fax_number is 1 ->  | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | ☐ |
| 107 | No. | `person.fax_number`<br>when: Only when Other is checked for the fax number | phone_part:international_number_without_plus | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | ☐ |
| 108 | No. | `person.fax_number`<br>when: Only when Canada/US is checked for the fax number | phone_part:nanp_area_code | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | ☐ |
| 109 | Question 5 3 digit Exchange Number | `person.fax_number`<br>when: Only when Canada/US is checked for the fax number | phone_part:nanp_exchange | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | ☐ |
| 110 | Question 5 3 digit Subscriber Number | `person.fax_number`<br>when: Only when Canada/US is checked for the fax number | phone_part:nanp_subscriber | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | ☐ |
| 111 | Country Code | `person.fax_number`<br>when: Only if a fax number exists | phone_part:country_code | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | ☐ |
| 112 | Ext. | `person.fax_number`<br>when: Only if the fax number has an extension | phone_part:extension | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | ☐ |
| 113 | Other | `person.fax_number`<br>when: Only if a fax number exists; shows IntlNumber | derived:country code of person.fax_number is not 1 | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | _not written_: Contact information | ☐ |

**Details of Visit to Canada, Questions 1–4** — official instruction: “From the list, indicate the purpose of your visit to Canada … Enter the dates (From – To) that you plan to stay in Canada. … Type the amount of funds (money) in Canadian dollars … Type the following information about the person(s) or institution(s) … you intend to visit” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 114 | * Address in Canada | `case.visit_contact_address_in_canada` | address_single_line (max 150 characters) | 100 SAMPLE STREET, TORONTO, ON M5V 0A1, Canada | 100 SAMPLE STREET, TORONTO, ON M5V 0A1, Canada | 100 SAMPLE STREET, TORONTO, ON M5V 0A1, Canada | 100 SAMPLE STREET, TORONTO, ON M5V 0A1, Canada | ☐ |
| 115 | * Name | `case.visit_contact_name`<br>when: Row 0 is required; max 150 characters | as_is | SAMPLE RELATIVE | SAMPLE RELATIVE | SAMPLE RELATIVE | SAMPLE RELATIVE | ☐ |
| 116 | Relationship to me | `case.visit_contact_relationship`<br>when: Max 50 characters | as_is | BROTHER | BROTHER | BROTHER | BROTHER | ☐ |
| 117 | * Funds available for my stay (CAD) | `case.funds_available_cad` | number_as_text (CAD, max 12 characters) | 5000 | 5000 | 5000 | 5000 | ☐ |
| 118 | * From | `case.intended_stay_from` | date:YYYY-MM-DD | 2027-06-01 | 2027-06-01 | 2027-06-01 | 2027-06-01 | ☐ |
| 119 | * To | `case.intended_stay_to` | date:YYYY-MM-DD | 2027-08-31 | 2027-08-31 | 2027-08-31 | 2027-08-31 | ☐ |
| 120 | b) Other | `case.visit_purpose_other`<br>when: Only when purpose = Other (03); max 50 characters | as_is | _not written_: Not needed: written only when the purpose of the visit is Ot | _not written_: Not needed: written only when the purpose of the visit is Ot | _not written_: Not needed: written only when the purpose of the visit is Ot | _not written_: Not needed: written only when the purpose of the visit is Ot | ☐ |
| 121 | * a) Purpose of my visit | `case.visit_purpose` | code_list:imm5257.visit_purpose (Business=01, Tour | 08 | 08 | 08 | 08 | ☐ |

**Details of Visit to Canada, Question 4 (second contact)** — official instruction: “Name … Relationship you have with this person or institution … Their address in Canada (street number, street name, city or town and postal code).” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 122 | Address in Canada | `case.visit_contact_address_in_canada`<br>when: Only if a second person or institution will be visited | address_single_line (max 150 characters) | _not written_: Details of visit to Canada | _not written_: Details of visit to Canada | _not written_: Details of visit to Canada | _not written_: Details of visit to Canada | ☐ |
| 123 | Name | `case.visit_contact_name`<br>when: Only if a second person or institution will be visited; inventory heading 'SIGNATURE' is a mechanical misattri | as_is | _not written_: Details of visit to Canada | _not written_: Details of visit to Canada | _not written_: Details of visit to Canada | _not written_: Details of visit to Canada | ☐ |
| 124 | Relationship to me | `case.visit_contact_relationship`<br>when: Only if a second person or institution will be visited | as_is | _not written_: Details of visit to Canada | _not written_: Details of visit to Canada | _not written_: Details of visit to Canada | _not written_: Details of visit to Canada | ☐ |

**Education** — official instruction: “Check the box to tell us if you have any post-secondary education (including university, college or apprenticeship training). … If you checked “Yes”, give us full details of your highest level of post-secondary education” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 125 | City/Town | `person.education_city`<br>when: Only when EducationIndicator = Y; max 30 characters | as_is | _not written_: Education | _not written_: Education | _not written_: Education | _not written_: Education | ☐ |
| 126 | Country or Territory | `person.education_country`<br>when: Only when EducationIndicator = Y | code_list:imm5257.country_address | _not written_: Education | _not written_: Education | _not written_: Education | _not written_: Education | ☐ |
| 127 | Field of study | `person.education_field_of_study`<br>when: Only when EducationIndicator = Y; max 30 characters | as_is | _not written_: Education | _not written_: Education | _not written_: Education | _not written_: Education | ☐ |
| 128 | MM | `person.education_from_date`<br>when: Only when EducationIndicator = Y | date_part:MM | _not written_: Education | _not written_: Education | _not written_: Education | _not written_: Education | ☐ |
| 129 | YYYY | `person.education_from_date`<br>when: Only when EducationIndicator = Y; one row only, reviewer chooses which education record (normally the highest  | date_part:YYYY | _not written_: Education | _not written_: Education | _not written_: Education | _not written_: Education | ☐ |
| 130 | Province/State | `person.education_province_state`<br>when: Only when EducationIndicator = Y; Canadian provinces only, leave empty outside Canada | code_list:imm5257.province_ca | _not written_: Education | _not written_: Education | _not written_: Education | _not written_: Education | ☐ |
| 131 | School/Facility name | `person.education_school_name`<br>when: Only when EducationIndicator = Y; max 75 characters | as_is | _not written_: Education | _not written_: Education | _not written_: Education | _not written_: Education | ☐ |
| 132 | MM | `person.education_to_date`<br>when: Only when EducationIndicator = Y | date_part:MM | _not written_: Education | _not written_: Education | _not written_: Education | _not written_: Education | ☐ |
| 133 | YYYY | `person.education_to_date`<br>when: Only when EducationIndicator = Y | date_part:YYYY | _not written_: Education | _not written_: Education | _not written_: Education | _not written_: Education | ☐ |
| 134 | Education Section Question 1. Have you had any post secondary education including university, college or appre | `person.education_school_name` | derived:any post-secondary education record exists | N | N | N | N | ☐ |

**Employment, Questions 1–2** — official instruction: “Enter the following information about your employment for the past 10 years. If you are retired, give information about the 10 years before your retirement. … If you do not work, describe what you are currently doing (retired, not working, going to school, etc.)” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 135 | * City/Town | `person.occupation_city`<br>when: Current activity row; max 30 characters | as_is | NEW DELHI | NEW DELHI | NEW DELHI | NEW DELHI | ☐ |
| 136 | * Country or Territory | `person.occupation_country`<br>when: Current activity row | code_list:imm5257.country_address | 205 | 205 | 205 | 205 | ☐ |
| 137 | * Company/Employer/Facility name | `person.occupation_employer`<br>when: Current activity row; max 75 characters | as_is | EXAMPLE TRADERS | EXAMPLE SCHOOL | EXAMPLE COLLEGE | EXAMPLE PRIMARY SCHOOL | ☐ |
| 138 | * MM | `person.occupation_from_date`<br>when: Current activity row | date_part:MM | 07 | 06 | 07 | 04 | ☐ |
| 139 | * YYYY | `person.occupation_from_date`<br>when: Row 0 is the current activity (required); rows 1-2 are previous activities, most recent first | date_part:YYYY | 2018 | 2016 | 2025 | 2022 | ☐ |
| 140 | * Current Activity/Occupation | `person.occupation_title`<br>when: Current activity row; max 75 characters | as_is | ACCOUNTANT | TEACHER | STUDENT | STUDENT | ☐ |
| 141 | Province/State | `person.occupation_province_state`<br>when: Current activity row; Canadian provinces only, leave empty outside Canada | code_list:imm5257.province_ca | _not written_: Employment | _not written_: Employment | _not written_: Employment | _not written_: Employment | ☐ |
| 142 | MM | `person.occupation_to_date`<br>when: Current activity row; leave empty if ongoing | date_part:MM | _not written_: Employment | _not written_: Employment | _not written_: Employment | _not written_: Employment | ☐ |
| 143 | YYYY | `person.occupation_to_date`<br>when: Current activity row; leave empty if ongoing | date_part:YYYY | _not written_: Employment | _not written_: Employment | _not written_: Employment | _not written_: Employment | ☐ |
| 144 | City/Town | `person.occupation_city`<br>when: Only if a previous activity exists; max 30 characters | as_is | _not written_: Employment | _not written_: Employment | _not written_: Employment | _not written_: Employment | ☐ |
| 145 | Country or Territory | `person.occupation_country`<br>when: Only if a previous activity exists | code_list:imm5257.country_address | _not written_: Employment | _not written_: Employment | _not written_: Employment | _not written_: Employment | ☐ |
| 146 | Company/Employer/Facility name | `person.occupation_employer`<br>when: Only if a previous activity exists; max 75 characters | as_is | _not written_: Employment | _not written_: Employment | _not written_: Employment | _not written_: Employment | ☐ |
| 147 | MM | `person.occupation_from_date`<br>when: Only if a previous activity exists | date_part:MM | _not written_: Employment | _not written_: Employment | _not written_: Employment | _not written_: Employment | ☐ |
| 148 | YYYY | `person.occupation_from_date`<br>when: Only if a previous activity exists (most recent previous) | date_part:YYYY | _not written_: Employment | _not written_: Employment | _not written_: Employment | _not written_: Employment | ☐ |
| 149 | Previous Activity/Occupation | `person.occupation_title`<br>when: Only if a previous activity exists; max 75 characters | as_is | _not written_: Employment | _not written_: Employment | _not written_: Employment | _not written_: Employment | ☐ |
| 150 | Province/State | `person.occupation_province_state`<br>when: Only if a previous activity exists; Canadian provinces only | code_list:imm5257.province_ca | _not written_: Employment | _not written_: Employment | _not written_: Employment | _not written_: Employment | ☐ |
| 151 | MM | `person.occupation_to_date`<br>when: Only if a previous activity exists | date_part:MM | _not written_: Employment | _not written_: Employment | _not written_: Employment | _not written_: Employment | ☐ |
| 152 | YYYY | `person.occupation_to_date`<br>when: Only if a previous activity exists | date_part:YYYY | _not written_: Employment | _not written_: Employment | _not written_: Employment | _not written_: Employment | ☐ |
| 153 | City/Town | `person.occupation_city`<br>when: Only if a second previous activity exists; max 30 characters | as_is | _not written_: Employment | _not written_: Employment | _not written_: Employment | _not written_: Employment | ☐ |
| 154 | Country or Territory | `person.occupation_country`<br>when: Only if a second previous activity exists | code_list:imm5257.country_address | _not written_: Employment | _not written_: Employment | _not written_: Employment | _not written_: Employment | ☐ |
| 155 | Company/Employer/Facility name | `person.occupation_employer`<br>when: Only if a second previous activity exists; max 75 characters | as_is | _not written_: Employment | _not written_: Employment | _not written_: Employment | _not written_: Employment | ☐ |
| 156 | MM | `person.occupation_from_date`<br>when: Only if a second previous activity exists | date_part:MM | _not written_: Employment | _not written_: Employment | _not written_: Employment | _not written_: Employment | ☐ |
| 157 | YYYY | `person.occupation_from_date`<br>when: Only if a second previous activity exists | date_part:YYYY | _not written_: Employment | _not written_: Employment | _not written_: Employment | _not written_: Employment | ☐ |
| 158 | Previous Activity/Occupation | `person.occupation_title`<br>when: Only if a second previous activity exists; max 75 characters | as_is | _not written_: Employment | _not written_: Employment | _not written_: Employment | _not written_: Employment | ☐ |
| 159 | Province/State | `person.occupation_province_state`<br>when: Only if a second previous activity exists; Canadian provinces only | code_list:imm5257.province_ca | _not written_: Employment | _not written_: Employment | _not written_: Employment | _not written_: Employment | ☐ |
| 160 | MM | `person.occupation_to_date`<br>when: Only if a second previous activity exists | date_part:MM | _not written_: Employment | _not written_: Employment | _not written_: Employment | _not written_: Employment | ☐ |
| 161 | YYYY | `person.occupation_to_date`<br>when: Only if a second previous activity exists | date_part:YYYY | _not written_: Employment | _not written_: Employment | _not written_: Employment | _not written_: Employment | ☐ |

**Background Information, Question 1 (health)** — official instruction: “All questions in this section must be answered or the application will be considered incomplete and will be returned. … you or any of your family members have ever had tuberculosis of the lungs or been in close contact with a person with tuberculosis within the past two years. … any physical or mental disorder that would require social and/or health services other than medication” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 162 | Background Information Section Question 1 A. Within the past two years, have you or a family member ever had t | `person.tuberculosis_in_past_two_years` | yes_no_code:Y/N | N | N | N | N | ☐ |
| 163 | Question 1 B Do you have any physical or mental disorder that would require social or health services, other t | `person.health_condition_requiring_services` | yes_no_code:Y/N | N | N | N | N | ☐ |
| 164 | c) If you answered "yes" to question 1a) or 1b), please provide details and the name of the family member (if  | `by a person (not mapped yet)`<br>when: Only when 1a or 1b is Yes |  | _blank_ | _blank_ | _blank_ | _blank_ | ☐ |

**Background Information, Question 2 (immigration history)** — official instruction: “remained beyond the validity of your status, attended school without authorization or worked without authorization in Canada. … been refused a visa or permit, denied entry or ordered to leave … Applied previously to enter or remain in Canada.” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 165 | Question 2 B. Have you ever been refused any kind of visa, admission, or been ordered to leave Canada or any o | `person.previously_applied_to_canada`<br>when: Inventory caption is copied from question 2b; the heading gives the real question | yes_no_code:Y/N | N | N | N | N | ☐ |
| 166 | d) If you answered “yes” to question 2a), 2b), or 2C please provide details. | `person.immigration_history_details`<br>when: Only when 2a, 2b or 2c is Yes | as_is (max 200 characters) | _not written_: Not needed: written only when the person answered Yes to Bac | _not written_: Not needed: written only when the person answered Yes to Bac | _not written_: Not needed: written only when the person answered Yes to Bac | _not written_: Not needed: written only when the person answered Yes to Bac | ☐ |
| 167 | Question 2 A. Have you ever remained beyond the validity of your status, attended school without authorization | `person.overstayed_or_unauthorized_in_canada` | yes_no_code:Y/N | N | N | N | N | ☐ |
| 168 | Question 2 B. Have you ever been refused any kind of visa, admission, or been ordered to leave Canada or any o | `person.refused_visa_entry_or_removed` | yes_no_code:Y/N | N | N | N | N | ☐ |

**Background Information, Question 3 (criminality)** — official instruction: “Check the box to indicate if you have ever: committed, been arrested for, or been charged with or convicted of any criminal offence in any country or territory.” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 169 | Question 3 A. Have you ever committed, been arrested for, been charged with or convicted of any criminal offen | `person.criminal_history` | yes_no_code:Y/N | N | N | N | N | ☐ |
| 170 | b) If you answered “yes” to question 3a) above, please provide details. | `person.criminal_history_details`<br>when: Only when 3a is Yes | as_is (max 200 characters) | _not written_: Not needed: written only when the person answered Yes to Bac | _not written_: Not needed: written only when the person answered Yes to Bac | _not written_: Not needed: written only when the person answered Yes to Bac | _not written_: Not needed: written only when the person answered Yes to Bac | ☐ |

**Background Information, Question 4 (military)** — official instruction: “Check the box to indicate if you have ever served in any military, militia, civil defence unit, served in a security organization or police force” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 171 | Question 4 A. Did you serve in any military, militia, or civil defence unit or serve in a security organizatio | `person.military_service` | yes_no_code:Y/N | N | N | N | N | ☐ |
| 172 | b) If you answered yes to question 4a), please provide dates of service and countries or territories where you | `person.military_service_details`<br>when: Only when 4a is Yes | as_is (max 200 characters) | _not written_: Not needed: written only when the person answered Yes to Bac | _not written_: Not needed: written only when the person answered Yes to Bac | _not written_: Not needed: written only when the person answered Yes to Bac | _not written_: Not needed: written only when the person answered Yes to Bac | ☐ |

**Background Information, Question 5 (organizations)** — official instruction: “Check “Yes” or “No” to indicate if you have ever been a member or associated with any political party, or other group or organization which has engaged in or advocated violence” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 173 | Question 5. Are you, or have you ever been a member or associated with any political party, or other group or  | `person.violent_organization_association` | yes_no_code:Y/N | N | N | N | N | ☐ |

**Background Information, Question 6 (ill treatment)** — official instruction: “Check “Yes” or “No” to indicate if you have ever witnessed or participated in the ill treatment of prisoners or civilians, looting or desecration of religious buildings.” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 174 | Question 6. Have you ever witnessed or participated in the ill treatment of prisoners or civilians, looting or | `person.ill_treatment_of_prisoners_or_civilians` | yes_no_code:Y/N | N | N | N | N | ☐ |

**Consent and signature (research contact consent; signature never written)** — official instruction: “If you are 18 years of age or older, you must sign and date in the boxes provided at the bottom of the page. If you are less than 18 years of age, your form must be signed by one of your parents or a legal guardian.” — [G5256]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Child <18 | Mark |
|---|---|---|---|---|---|---|---|---|
| 175 | Question 6. Have you ever witnessed or participated in the ill treatment of prisoners or civilians, looting or | `person.consents_to_research_contact` | yes_no_code:Y/N | N | N | N | N | ☐ |

175 rows; ⚑ marks 0 values that are placeholders (see the placeholder note above): mark their mapping, not the value.

## 2. IMM 5257 Schedule 1 — Application for Temporary Residence: background (each applicant 18 or older)

Who fills it: the principal applicant, the spouse and each dependent child 18 or older ([S1] header), so no copy for the child under 18. The official instruction for each question is the form's own question text (first column); Guide 5256 has no Schedule 1 section. Rows "Question 4/6/7/8" are the Yes/No answer and its detail rows; this family answers No to each, so the detail rows are not written.


Field map: **IMM 5257 SCH1 (09-2023)**, 57 form fields: 42 filled from a fact, 8 by a person, 7 form helpers (not facts), 0 never filled (signatures, office use). Copies read: Principal `ae72c5a9`, Spouse `4e190336`, Child 18+ `09707e76`.


**Schedule 1, header (who completes)** — official instruction: “The principal applicant, his or her spouse or common-law partner, if applicable, and all dependent children aged 18 years or older listed in the application for temporary residence must complete their own copy of this form.” — [S1]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Mark |
|---|---|---|---|---|---|---|---|
| 1 | Question 2 Date of Birth Day in DD format | `person.date_of_birth` | date:DD | 12 | 03 | 14 | ☐ |
| 2 | Question 2 Date of Birth Month in MM format | `person.date_of_birth` | date:MM | 04 | 09 | 03 | ☐ |
| 3 | *Date of birth | `person.date_of_birth` | date:YYYY | 1990 | 1991 | 2007 | ☐ |
| 4 | *Family name (as shown on your passport or travel document) | `person.family_name` | as_is (max 100 chars) | EXAMPLE | EXAMPLEP | EXAMPLE | ☐ |
| 5 | Given name(s) (as shown on your passport or travel document) | `person.given_names` | as_is (max 100 chars) | CLIENTA | PARTNER | SECOND CHILD | ☐ |
| 6 | Government Positions Activities and/or positions held | `person.government_position_activities`<br>when: Only when Question 7 is answered Yes; each further government position adds a row. | as_is (max 50 chars; no abbreviations) | _not written_: Government positions | _not written_: Government positions | _not written_: Government positions | ☐ |
| 7 | Government Positions Country or Territory. The country or territory of the government position held | `person.government_position_country`<br>when: Only when Question 7 is answered Yes; each further government position adds a row. | code_list:imm5257_1e.CountryCode (codes exactly as | _not written_: Government positions | _not written_: Government positions | _not written_: Government positions | ☐ |
| 8 | Government Positions Department/Branch. The department or branch of the government position held | `person.government_position_department`<br>when: Only when Question 7 is answered Yes; each further government position adds a row. | as_is (max 100 chars; no abbreviations) | _not written_: Government positions | _not written_: Government positions | _not written_: Government positions | ☐ |
| 9 | Government Positions From Date Month. The month of the start of the government position held in MM format | `person.government_position_start_date`<br>when: Only when Question 7 is answered Yes; each further government position adds a row. | date:MM | _not written_: Government positions | _not written_: Government positions | _not written_: Government positions | ☐ |
| 10 | Government Positions From Date Year. The year of the start of the government position held in YYYY format | `person.government_position_start_date`<br>when: Only when Question 7 is answered Yes; each further government position adds a row. | date:YYYY | _not written_: Government positions | _not written_: Government positions | _not written_: Government positions | ☐ |
| 11 | Government Positions Level of jurisdiction. The level of jurisdiction of the government position held (Example | `person.government_position_jurisdiction_level`<br>when: Only when Question 7 is answered Yes; each further government position adds a row. | as_is (max 50 chars) | _not written_: Government positions | _not written_: Government positions | _not written_: Government positions | ☐ |
| 12 | Government Positions To Date Month. The month of the end of the government position held in MM format | `person.government_position_end_date`<br>when: Only when Question 7 is answered Yes; each further government position adds a row. | date:MM | _not written_: Government positions | _not written_: Government positions | _not written_: Government positions | ☐ |
| 13 | Government Positions To Date Year. The year of the end of the government position held in YYYY format | `person.government_position_end_date`<br>when: Only when Question 7 is answered Yes; each further government position adds a row. | date:YYYY | _not written_: Government positions | _not written_: Government positions | _not written_: Government positions | ☐ |
| 14 | Question7 Government Positions. Have you ever held any government positions (such as civil servant, judge, pol | `person.has_held_government_position` | derive: true if any government position is recorde | false | false | false | ☐ |
| 15 | Question 6 Membership or Association with Organizations. Are you, or have you ever been a member or associated | `person.violent_organization_association` | yes_no_code:true/false | false | false | false | ☐ |
| 16 | Organizations Activities and/or positions held within organization | `person.organization_activities_positions`<br>when: Only when Question 6 is answered Yes, and only for memberships within the scope of Question 6; each further me | as_is (max 50 chars) | _not written_: Membership or Association with Organizations | _not written_: Membership or Association with Organizations | _not written_: Membership or Association with Organizations | ☐ |
| 17 | Organizations Country or Territory. The country or territory of the organization | `person.organization_country`<br>when: Only when Question 6 is answered Yes, and only for memberships within the scope of Question 6; each further me | code_list:imm5257_1e.CountryCode (codes exactly as | _not written_: Membership or Association with Organizations | _not written_: Membership or Association with Organizations | _not written_: Membership or Association with Organizations | ☐ |
| 18 | Organizations From Date Month. The month of the start of the membership or association in MM format | `person.organization_membership_start_date`<br>when: Only when Question 6 is answered Yes, and only for memberships within the scope of Question 6; each further me | date:MM | _not written_: Membership or Association with Organizations | _not written_: Membership or Association with Organizations | _not written_: Membership or Association with Organizations | ☐ |
| 19 | Organizations From Date Year. The year of the start of the membership or association in YYYY format | `person.organization_membership_start_date`<br>when: Only when Question 6 is answered Yes, and only for memberships within the scope of Question 6; each further me | date:YYYY | _not written_: Membership or Association with Organizations | _not written_: Membership or Association with Organizations | _not written_: Membership or Association with Organizations | ☐ |
| 20 | Organizations Name of Organization | `person.organization_name`<br>when: Only when Question 6 is answered Yes, and only for memberships within the scope of Question 6; each further me | as_is (max 100 chars) | _not written_: Membership or Association with Organizations | _not written_: Membership or Association with Organizations | _not written_: Membership or Association with Organizations | ☐ |
| 21 | Organizations Province. The province of the organization | `person.organization_province`<br>when: Only when Question 6 is answered Yes, and only for memberships within the scope of Question 6; each further me | as_is (max 50 chars) | _not written_: Membership or Association with Organizations | _not written_: Membership or Association with Organizations | _not written_: Membership or Association with Organizations | ☐ |
| 22 | Organizations To Date Month. The month of the end of the membership or association in MM format | `person.organization_membership_end_date`<br>when: Only when Question 6 is answered Yes, and only for memberships within the scope of Question 6; each further me | date:MM | _not written_: Membership or Association with Organizations | _not written_: Membership or Association with Organizations | _not written_: Membership or Association with Organizations | ☐ |
| 23 | Organizations To Date Year. The year of the end of the membership or association in YYYY format | `person.organization_membership_end_date`<br>when: Only when Question 6 is answered Yes, and only for memberships within the scope of Question 6; each further me | date:YYYY | _not written_: Membership or Association with Organizations | _not written_: Membership or Association with Organizations | _not written_: Membership or Association with Organizations | ☐ |
| 24 | Military Service Country or Territory. The country or territory of your military service | `person.military_service_country`<br>when: Only when Question 4 is answered Yes; each further service period adds a row. | code_list:imm5257_1e.CountryCode (codes exactly as | _not written_: Military service | _not written_: Military service | _not written_: Military service | ☐ |
| 25 | Military Service From Date Month. The month of the start of the Military Service in MM format | `person.military_service_start_date`<br>when: Only when Question 4 is answered Yes; each further service period adds a row. | date:MM | _not written_: Military service | _not written_: Military service | _not written_: Military service | ☐ |
| 26 | Military Service From Date Year. The year of the start of the Military Service in YYYY format | `person.military_service_start_date`<br>when: Only when Question 4 is answered Yes; each further service period adds a row. | date:YYYY | _not written_: Military service | _not written_: Military service | _not written_: Military service | ☐ |
| 27 | Military Service Location/Place where stationed. The location or place of your military service | `person.military_service_location`<br>when: Only when Question 4 is answered Yes; each further service period adds a row. | as_is (max 100 chars) | _not written_: Military service | _not written_: Military service | _not written_: Military service | ☐ |
| 28 | Military Service Province. The province of your military service | `person.military_service_province`<br>when: Only when Question 4 is answered Yes; each further service period adds a row. | as_is (max 50 chars) | _not written_: Military service | _not written_: Military service | _not written_: Military service | ☐ |
| 29 | Military Service To Date Month. The month of the end of the Military Service in MM format | `person.military_service_end_date`<br>when: Only when Question 4 is answered Yes; each further service period adds a row. | date:MM | _not written_: Military service | _not written_: Military service | _not written_: Military service | ☐ |
| 30 | Military Service To Date Year. The year of the end of the Military Service in YYYY format | `person.military_service_end_date`<br>when: Only when Question 4 is answered Yes; each further service period adds a row. | date:YYYY | _not written_: Military service | _not written_: Military service | _not written_: Military service | ☐ |
| 31 | Question 4 Military Service. Did you serve in any military, militia, or civil defence unit or serve in a secur | `person.has_military_or_security_service` | derive: true if any military/militia/civil defence | false | false | false | ☐ |
| 32 | Previous Travel Country or Territory. The country or territory where your previous travel took place | `person.travel_country`<br>when: Only when Question 8 is answered Yes, and only for trips within the Question 8 window to countries other than  | code_list:imm5257_1e.CountryCode (codes exactly as | _not written_: Previous travel | _not written_: Previous travel | _not written_: Previous travel | ☐ |
| 33 | Previous Travel From Date Month. The month of the start of your previous travel in MM format | `person.travel_start_date`<br>when: Only when Question 8 is answered Yes, and only for trips within the Question 8 window to countries other than  | date:MM | _not written_: Previous travel | _not written_: Previous travel | _not written_: Previous travel | ☐ |
| 34 | Previous Travel From Date Year. The year of the start of your previous travel in YYYY format | `person.travel_start_date`<br>when: Only when Question 8 is answered Yes, and only for trips within the Question 8 window to countries other than  | date:YYYY | _not written_: Previous travel | _not written_: Previous travel | _not written_: Previous travel | ☐ |
| 35 | Previous Travel Location. The location where your previous travel took place | `person.travel_location`<br>when: Only when Question 8 is answered Yes, and only for trips within the Question 8 window to countries other than  | as_is (max 50 chars) | _not written_: Previous travel | _not written_: Previous travel | _not written_: Previous travel | ☐ |
| 36 | Previous Travel Purpose of Travel. | `person.travel_purpose`<br>when: Only when Question 8 is answered Yes, and only for trips within the Question 8 window to countries other than  | as_is (max 50 chars) | _not written_: Previous travel | _not written_: Previous travel | _not written_: Previous travel | ☐ |
| 37 | Previous Travel To Date Month. The month of the end of your previous travel in MM format | `person.travel_end_date`<br>when: Only when Question 8 is answered Yes, and only for trips within the Question 8 window to countries other than  | date:MM | _not written_: Previous travel | _not written_: Previous travel | _not written_: Previous travel | ☐ |
| 38 | Previous Travel To Date Year. The year of the end of your previous travel in YYYY format | `person.travel_end_date`<br>when: Only when Question 8 is answered Yes, and only for trips within the Question 8 window to countries other than  | date:YYYY | _not written_: Previous travel | _not written_: Previous travel | _not written_: Previous travel | ☐ |
| 39 | Question 8 Previous Travel. Since the age of 18 or during the past five years, whichever is more recent, have  | `person.travel_country` | derive: true if any recorded trip, starting after  | false | false | false | ☐ |
| 40 | *Indicate whether you are | `case.subject_is_principal_applicant` | yes_no_code:true/false | false ⚑ | false ⚑ | false ⚑ | ☐ |
| 41 | UCI | `person.uci`<br>when: Only when the subject has been issued a UCI; otherwise leave blank. | as_is (max 10 chars) | 0000000001 ⚑ | 0000000001 ⚑ | 0000000001 ⚑ | ☐ |
| 42 | Question 5. Have you ever witnessed or participated in the ill treatment of prisoners or civilians, looting or | `person.ill_treatment_of_prisoners_or_civilians` | yes_no_code:true/false | false | false | false | ☐ |
| 43 | Question 5 Country or Territory. The country or territory of the event | `by a person (not mapped yet)`<br>when: Only when Question 5 is answered Yes; each further event adds a row. |  | _blank_ | _blank_ | _blank_ | ☐ |
| 44 | Details: | `by a person (not mapped yet)`<br>when: Only when Question 5 is answered Yes; each further event adds a row. |  | _blank_ | _blank_ | _blank_ | ☐ |
| 45 | Question 5 From Date Month. The month of the start of the event in MM format | `by a person (not mapped yet)`<br>when: Only when Question 5 is answered Yes; each further event adds a row. |  | _blank_ | _blank_ | _blank_ | ☐ |
| 46 | Question 5 From Date Year. The year of the start of the event in YYYY format | `by a person (not mapped yet)`<br>when: Only when Question 5 is answered Yes; each further event adds a row. |  | _blank_ | _blank_ | _blank_ | ☐ |
| 47 | Question 5 Location. The location of the event | `by a person (not mapped yet)`<br>when: Only when Question 5 is answered Yes; each further event adds a row. |  | _blank_ | _blank_ | _blank_ | ☐ |
| 48 | Question 5 Province. The province of the event | `by a person (not mapped yet)`<br>when: Only when Question 5 is answered Yes; each further event adds a row. |  | _blank_ | _blank_ | _blank_ | ☐ |
| 49 | Question 5 To Date Month. The month of the end of the event in MM format | `by a person (not mapped yet)`<br>when: Only when Question 5 is answered Yes; each further event adds a row. |  | _blank_ | _blank_ | _blank_ | ☐ |
| 50 | Question 5 To Date Year. The year of the end of the event in YYYY format | `by a person (not mapped yet)`<br>when: Only when Question 5 is answered Yes; each further event adds a row. |  | _blank_ | _blank_ | _blank_ | ☐ |

50 rows; ⚑ marks 6 values that are placeholders (see the placeholder note above): mark their mapping, not the value.

## 3. IMM 5645 — Family Information (each applicant 18 or older, online channel)

Who fills it: each person 18 or older applying from outside Canada ([F5645]); it lists the person's spouse, parents, children and brothers and sisters, travelling or not. **Read the ⚑ note above first: most values on these copies are placeholders**, so mark the mapping (fact and how written), not the value. Sections B and C repeat one block per child and per sibling row; the "when" column says which row.


Field map: **IMM 5645 (01-2021)**, 139 form fields: 119 filled from a fact, 14 by a person, 0 form helpers (not facts), 6 never filled (signatures, office use). Copies read: Principal `2d2ccd64`, Spouse `0bf353a4`, Child 18+ `f75ce2d9`.


**Section A (applicant, spouse, parents)** — official instruction: “You must answer all questions. If a section does not apply to you, … “N/A”” — [F5645]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Mark |
|---|---|---|---|---|---|---|---|
| 1 | Present address | `person.present_address` | address_single_line_text | Sample Road, Sample City, Canada ⚑ | Sample Road, Sample City, Canada ⚑ | Sample Road, Sample City, Canada ⚑ | ☐ |
| 2 | Country of birth: | `person.birth_country` | country_name_text | India | India | India | ☐ |
| 3 | Date of birth | `person.date_of_birth` | date:YYYY-MM-DD | 1990-04-12 | 1991-09-03 | 2007-03-14 | ☐ |
| 4 | Name | `person.full_name` | as_is | SAMPLE ⚑ | SAMPLE ⚑ | SAMPLE ⚑ | ☐ |
| 5 | Present occupation: | `person.present_occupation` | as_is | SAMPLE ⚑ | SAMPLE ⚑ | SAMPLE ⚑ | ☐ |
| 6 | Marital status: | `by a person (not mapped yet)` |  | _blank_ | _blank_ | _blank_ | ☐ |
| 7 | Marital status: | `person.marital_status` | code_list:imm5645.parent_marital_status{Annulled m | 1 | 1 | 1 | ☐ |
| 8 | Present address | `person.present_address`<br>when: If the father is deceased the form's instructions expect a deceased notation instead of an address; reviewer t | address_single_line_text | Sample Road, Sample City, Canada ⚑ | Sample Road, Sample City, Canada ⚑ | Sample Road, Sample City, Canada ⚑ | ☐ |
| 9 | Country of birth: | `person.birth_country` | country_name_text | SAMPLE ⚑ | SAMPLE ⚑ | SAMPLE ⚑ | ☐ |
| 10 | Date of birth | `person.date_of_birth` | date:YYYY-MM-DD | 2024-01-15 ⚑ | 2024-01-15 ⚑ | 2024-01-15 ⚑ | ☐ |
| 11 | Name | `person.full_name` | as_is | SAMPLE ⚑ | SAMPLE ⚑ | SAMPLE ⚑ | ☐ |
| 12 | No | `relationship.accompanies_subject_to_canada`<br>when: Caption gives only 'No'; the question (accompany to Canada) is inferred from the form layout and should be con | derived:checked_if_false:1/0 | 1 | 1 | 1 | ☐ |
| 13 | Present occupation: | `person.present_occupation` | as_is | SAMPLE ⚑ | SAMPLE ⚑ | SAMPLE ⚑ | ☐ |
| 14 | Yes | `relationship.accompanies_subject_to_canada`<br>when: Caption gives only 'Yes'; the question (accompany to Canada) is inferred from the form layout and should be co | derived:checked_if_true:1/0 | 0 | 0 | 0 | ☐ |
| 15 | Marital status: | `person.marital_status` | code_list:imm5645.parent_marital_status{Annulled m | 1 | 1 | 1 | ☐ |
| 16 | Present address | `person.present_address`<br>when: If the mother is deceased the form's instructions expect a deceased notation instead of an address; reviewer t | address_single_line_text | Sample Road, Sample City, Canada ⚑ | Sample Road, Sample City, Canada ⚑ | Sample Road, Sample City, Canada ⚑ | ☐ |
| 17 | Country of birth: | `person.birth_country` | country_name_text | SAMPLE ⚑ | SAMPLE ⚑ | SAMPLE ⚑ | ☐ |
| 18 | Date of birth | `person.date_of_birth` | date:YYYY-MM-DD | 2024-01-15 ⚑ | 2024-01-15 ⚑ | 2024-01-15 ⚑ | ☐ |
| 19 | Name | `person.full_name` | as_is | SAMPLE ⚑ | SAMPLE ⚑ | SAMPLE ⚑ | ☐ |
| 20 | No | `relationship.accompanies_subject_to_canada`<br>when: Caption gives only 'No'; the question (accompany to Canada) is inferred from the form layout and should be con | derived:checked_if_false:1/0 | 1 | 1 | 1 | ☐ |
| 21 | Present occupation: | `person.present_occupation` | as_is | SAMPLE ⚑ | SAMPLE ⚑ | SAMPLE ⚑ | ☐ |
| 22 | Yes | `relationship.accompanies_subject_to_canada`<br>when: Caption gives only 'Yes'; the question (accompany to Canada) is inferred from the form layout and should be co | derived:checked_if_true:1/0 | 0 | 0 | 0 | ☐ |
| 23 | Marital status: | `by a person (not mapped yet)`<br>when: Only when the form subject has a spouse or common-law partner |  | _blank_ | _blank_ | _blank_ | ☐ |
| 24 | Present address | `person.present_address`<br>when: Only when the form subject has a spouse or common-law partner | address_single_line_text | Sample Road, Sample City, Canada ⚑ | Sample Road, Sample City, Canada ⚑ | _not written_: that person is not part of this combination; the form field  | ☐ |
| 25 | Country of birth: | `person.birth_country`<br>when: Only when the form subject has a spouse or common-law partner | country_name_text | India | India | _not written_: that person is not part of this combination; the form field  | ☐ |
| 26 | Date of birth | `person.date_of_birth`<br>when: Only when the form subject has a spouse or common-law partner | date:YYYY-MM-DD | 1991-09-03 | 1990-04-12 | _not written_: that person is not part of this combination; the form field  | ☐ |
| 27 | Name | `person.full_name`<br>when: Only when the form subject has a spouse or common-law partner | as_is | SAMPLE ⚑ | SAMPLE ⚑ | _not written_: that person is not part of this combination; the form field  | ☐ |
| 28 | No | `relationship.accompanies_subject_to_canada`<br>when: Only when the form subject has a spouse or common-law partner; the caption gives only 'No', the question (acco | derived:checked_if_false:1/0 | 0 | 1 | _not written_: that person is not part of this combination; the form field  | ☐ |
| 29 | Present occupation: | `person.present_occupation`<br>when: Only when the form subject has a spouse or common-law partner | as_is | SAMPLE ⚑ | SAMPLE ⚑ | _not written_: that person is not part of this combination; the form field  | ☐ |
| 30 | Yes | `relationship.accompanies_subject_to_canada`<br>when: Only when the form subject has a spouse or common-law partner; the caption gives only 'Yes', the question (acc | derived:checked_if_true:1/0 | 1 | 0 | _not written_: that person is not part of this combination; the form field  | ☐ |

**Section B — Children** — official instruction: “You must answer all questions. If a section does not apply to you, … “N/A” … any of your children who have been adopted by others; … any of your children who are in the custody of an ex-spouse” — [F5645]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Mark |
|---|---|---|---|---|---|---|---|
| 31 | Present address | `person.present_address`<br>when: Only when the subject has at least 1 child. | address_single_line_text | Sample Road, Sample City, Canada ⚑ | Sample Road, Sample City, Canada ⚑ | Sample Road, Sample City, Canada ⚑ | ☐ |
| 32 | Country of birth: | `person.birth_country`<br>when: Only when the subject has at least 1 child. | country_name_text | India | India | India | ☐ |
| 33 | Date of birth | `person.date_of_birth`<br>when: Only when the subject has at least 1 child. | date:YYYY-MM-DD | 2016-05-20 | 2016-05-20 | 2016-05-20 | ☐ |
| 34 | Marital status: | `person.marital_status`<br>when: Only when the subject has at least 1 child. | code_list:imm5645.marital_status (1=Annulled marri | 6 | 6 | 6 | ☐ |
| 35 | Name | `person.full_name`<br>when: Only when the subject has at least 1 child; the form has 4 fixed child rows (Child[0]-Child[3]); children beyo | as_is | SAMPLE ⚑ | SAMPLE ⚑ | SAMPLE ⚑ | ☐ |
| 36 | No | `relationship.accompanies_subject_to_canada`<br>when: Only when the subject has at least 1 child. Reviewer: inventory caption is only 'No'; question text (believed  | check_if_no:1/0 | 0 | 0 | 0 | ☐ |
| 37 | Present occupation: | `person.present_occupation`<br>when: Only when the subject has at least 1 child. | as_is | SAMPLE ⚑ | SAMPLE ⚑ | SAMPLE ⚑ | ☐ |
| 38 | Relationship | `relationship.relationship_to_subject`<br>when: Only when the subject has at least 1 child. | as_is | SAMPLE ⚑ | SAMPLE ⚑ | SAMPLE ⚑ | ☐ |
| 39 | Yes | `relationship.accompanies_subject_to_canada`<br>when: Only when the subject has at least 1 child. Reviewer: inventory caption is only 'Yes'; question text (believed | check_if_yes:1/0 | 1 | 1 | 1 | ☐ |
| 40 | Present address | `person.present_address`<br>when: Only when the subject has at least 2 children. | address_single_line_text | Sample Road, Sample City, Canada ⚑ | Sample Road, Sample City, Canada ⚑ | Sample Road, Sample City, Canada ⚑ | ☐ |
| 41 | Country of birth: | `person.birth_country`<br>when: Only when the subject has at least 2 children. | country_name_text | India | India | India | ☐ |
| 42 | Date of birth | `person.date_of_birth`<br>when: Only when the subject has at least 2 children. | date:YYYY-MM-DD | 2007-03-14 | 2007-03-14 | 2007-03-14 | ☐ |
| 43 | Marital status: | `person.marital_status`<br>when: Only when the subject has at least 2 children. | code_list:imm5645.marital_status (1=Annulled marri | 6 | 6 | 6 | ☐ |
| 44 | Name | `person.full_name`<br>when: Only when the subject has at least 2 children. | as_is | SAMPLE ⚑ | SAMPLE ⚑ | SAMPLE ⚑ | ☐ |
| 45 | No | `relationship.accompanies_subject_to_canada`<br>when: Only when the subject has at least 2 children. Reviewer: question text not in inventory; confirm it asks wheth | check_if_no:1/0 | 1 | 1 | 1 | ☐ |
| 46 | Present occupation: | `person.present_occupation`<br>when: Only when the subject has at least 2 children. | as_is | SAMPLE ⚑ | SAMPLE ⚑ | SAMPLE ⚑ | ☐ |
| 47 | Relationship | `relationship.relationship_to_subject`<br>when: Only when the subject has at least 2 children. | as_is | SAMPLE ⚑ | SAMPLE ⚑ | SAMPLE ⚑ | ☐ |
| 48 | Yes | `relationship.accompanies_subject_to_canada`<br>when: Only when the subject has at least 2 children. Reviewer: question text not in inventory; confirm it asks wheth | check_if_yes:1/0 | 0 | 0 | 0 | ☐ |
| 49 | Present address | `person.present_address`<br>when: Only when the subject has at least 3 children. | address_single_line_text | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | ☐ |
| 50 | Country of birth: | `person.birth_country`<br>when: Only when the subject has at least 3 children. | country_name_text | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | ☐ |
| 51 | Date of birth | `person.date_of_birth`<br>when: Only when the subject has at least 3 children. | date:YYYY-MM-DD | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | ☐ |
| 52 | Marital status: | `person.marital_status`<br>when: Only when the subject has at least 3 children. | code_list:imm5645.marital_status (1=Annulled marri | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | ☐ |
| 53 | Name | `person.full_name`<br>when: Only when the subject has at least 3 children. | as_is | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | ☐ |
| 54 | No | `relationship.accompanies_subject_to_canada`<br>when: Only when the subject has at least 3 children. Reviewer: question text not in inventory; confirm it asks wheth | check_if_no:1/0 | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | ☐ |
| 55 | Present occupation: | `person.present_occupation`<br>when: Only when the subject has at least 3 children. | as_is | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | ☐ |
| 56 | Relationship | `relationship.relationship_to_subject`<br>when: Only when the subject has at least 3 children. | as_is | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | ☐ |
| 57 | Yes | `relationship.accompanies_subject_to_canada`<br>when: Only when the subject has at least 3 children. Reviewer: question text not in inventory; confirm it asks wheth | check_if_yes:1/0 | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | ☐ |
| 58 | Present address | `person.present_address`<br>when: Only when the subject has at least 4 children. | address_single_line_text | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | ☐ |
| 59 | Country of birth: | `person.birth_country`<br>when: Only when the subject has at least 4 children. | country_name_text | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | ☐ |
| 60 | Date of birth | `person.date_of_birth`<br>when: Only when the subject has at least 4 children. | date:YYYY-MM-DD | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | ☐ |
| 61 | Marital status: | `person.marital_status`<br>when: Only when the subject has at least 4 children. | code_list:imm5645.marital_status (1=Annulled marri | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | ☐ |
| 62 | Name | `person.full_name`<br>when: Only when the subject has at least 4 children; further children need an additional sheet. | as_is | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | ☐ |
| 63 | No | `relationship.accompanies_subject_to_canada`<br>when: Only when the subject has at least 4 children. Reviewer: question text not in inventory; confirm it asks wheth | check_if_no:1/0 | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | ☐ |
| 64 | Present occupation: | `person.present_occupation`<br>when: Only when the subject has at least 4 children. | as_is | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | ☐ |
| 65 | Relationship | `relationship.relationship_to_subject`<br>when: Only when the subject has at least 4 children. | as_is | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | ☐ |
| 66 | Yes | `relationship.accompanies_subject_to_canada`<br>when: Only when the subject has at least 4 children. Reviewer: question text not in inventory; confirm it asks wheth | check_if_yes:1/0 | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | _not written_: that person is not part of this combination; the form field  | ☐ |

**Section C — Brothers and Sisters** — official instruction: “You must answer all questions. If a section does not apply to you, … “N/A”” — [F5645]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Mark |
|---|---|---|---|---|---|---|---|
| 67 | Present address | `person.present_address`<br>when: Only when the subject has at least 1 sibling; fixed row 0 of 7 sibling rows. | address_single_line | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 68 | Country of birth: | `person.birth_country`<br>when: Only when the subject has at least 1 sibling; fixed row 0 of 7 sibling rows. | country_name_text | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 69 | Date of birth | `person.date_of_birth`<br>when: Only when the subject has at least 1 sibling; fixed row 0 of 7 sibling rows. | date:YYYY-MM-DD | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 70 | Marital status: | `person.marital_status`<br>when: Only when the subject has at least 1 sibling; fixed row 0 of 7 sibling rows. | code_list:imm5645.marital_status (Annulled marriag | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 71 | Name | `person.full_name`<br>when: Only when the subject has at least 1 sibling (brother, sister, half- or step-sibling); fixed row 0 of 7 siblin | as_is | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 72 | No | `by a person (not mapped yet)`<br>when: Only when the subject has at least 1 sibling; fixed row 0 of 7 sibling rows. |  | _blank_ | _blank_ | _blank_ | ☐ |
| 73 | Present occupation: | `person.present_occupation`<br>when: Only when the subject has at least 1 sibling; fixed row 0 of 7 sibling rows. | as_is | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 74 | Relationship | `relationship.relationship_to_subject`<br>when: Only when the subject has at least 1 sibling; fixed row 0 of 7 sibling rows. | as_is | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 75 | Yes | `by a person (not mapped yet)`<br>when: Only when the subject has at least 1 sibling; fixed row 0 of 7 sibling rows. |  | _blank_ | _blank_ | _blank_ | ☐ |
| 76 | Present address | `person.present_address`<br>when: Only when the subject has at least 2 siblings; fixed row 1 of 7 sibling rows. | address_single_line | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 77 | Country of birth: | `person.birth_country`<br>when: Only when the subject has at least 2 siblings; fixed row 1 of 7 sibling rows. | country_name_text | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 78 | Date of birth | `person.date_of_birth`<br>when: Only when the subject has at least 2 siblings; fixed row 1 of 7 sibling rows. | date:YYYY-MM-DD | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 79 | Marital status: | `person.marital_status`<br>when: Only when the subject has at least 2 siblings; fixed row 1 of 7 sibling rows. | code_list:imm5645.marital_status (Annulled marriag | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 80 | Name | `person.full_name`<br>when: Only when the subject has at least 2 siblings; fixed row 1 of 7 sibling rows. | as_is | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 81 | No | `by a person (not mapped yet)`<br>when: Only when the subject has at least 2 siblings; fixed row 1 of 7 sibling rows. |  | _blank_ | _blank_ | _blank_ | ☐ |
| 82 | Present occupation: | `person.present_occupation`<br>when: Only when the subject has at least 2 siblings; fixed row 1 of 7 sibling rows. | as_is | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 83 | Relationship | `relationship.relationship_to_subject`<br>when: Only when the subject has at least 2 siblings; fixed row 1 of 7 sibling rows. | as_is | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 84 | Yes | `by a person (not mapped yet)`<br>when: Only when the subject has at least 2 siblings; fixed row 1 of 7 sibling rows. |  | _blank_ | _blank_ | _blank_ | ☐ |
| 85 | Present address | `person.present_address`<br>when: Only when the subject has at least 3 siblings; fixed row 2 of 7 sibling rows. | address_single_line | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 86 | Country of birth: | `person.birth_country`<br>when: Only when the subject has at least 3 siblings; fixed row 2 of 7 sibling rows. | country_name_text | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 87 | Date of birth | `person.date_of_birth`<br>when: Only when the subject has at least 3 siblings; fixed row 2 of 7 sibling rows. | date:YYYY-MM-DD | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 88 | Marital status: | `person.marital_status`<br>when: Only when the subject has at least 3 siblings; fixed row 2 of 7 sibling rows. | code_list:imm5645.marital_status (Annulled marriag | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 89 | Name | `person.full_name`<br>when: Only when the subject has at least 3 siblings; fixed row 2 of 7 sibling rows. | as_is | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 90 | No | `by a person (not mapped yet)`<br>when: Only when the subject has at least 3 siblings; fixed row 2 of 7 sibling rows. |  | _blank_ | _blank_ | _blank_ | ☐ |
| 91 | Present occupation: | `person.present_occupation`<br>when: Only when the subject has at least 3 siblings; fixed row 2 of 7 sibling rows. | as_is | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 92 | Relationship | `relationship.relationship_to_subject`<br>when: Only when the subject has at least 3 siblings; fixed row 2 of 7 sibling rows. | as_is | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 93 | Yes | `by a person (not mapped yet)`<br>when: Only when the subject has at least 3 siblings; fixed row 2 of 7 sibling rows. |  | _blank_ | _blank_ | _blank_ | ☐ |
| 94 | Present address | `person.present_address`<br>when: Only when the subject has at least 4 siblings; fixed row 3 of 7 sibling rows. | address_single_line | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 95 | Country of birth: | `person.birth_country`<br>when: Only when the subject has at least 4 siblings; fixed row 3 of 7 sibling rows. | country_name_text | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 96 | Date of birth | `person.date_of_birth`<br>when: Only when the subject has at least 4 siblings; fixed row 3 of 7 sibling rows. | date:YYYY-MM-DD | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 97 | Marital status: | `person.marital_status`<br>when: Only when the subject has at least 4 siblings; fixed row 3 of 7 sibling rows. | code_list:imm5645.marital_status (Annulled marriag | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 98 | Name | `person.full_name`<br>when: Only when the subject has at least 4 siblings; fixed row 3 of 7 sibling rows. | as_is | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 99 | No | `by a person (not mapped yet)`<br>when: Only when the subject has at least 4 siblings; fixed row 3 of 7 sibling rows. |  | _blank_ | _blank_ | _blank_ | ☐ |
| 100 | Present occupation: | `person.present_occupation`<br>when: Only when the subject has at least 4 siblings; fixed row 3 of 7 sibling rows. | as_is | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 101 | Relationship | `relationship.relationship_to_subject`<br>when: Only when the subject has at least 4 siblings; fixed row 3 of 7 sibling rows. | as_is | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 102 | Yes | `by a person (not mapped yet)`<br>when: Only when the subject has at least 4 siblings; fixed row 3 of 7 sibling rows. |  | _blank_ | _blank_ | _blank_ | ☐ |
| 103 | Present address | `person.present_address`<br>when: Only when the subject has at least 5 siblings; fixed row 4 of 7 sibling rows. | address_single_line | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 104 | Country of birth: | `person.birth_country`<br>when: Only when the subject has at least 5 siblings; fixed row 4 of 7 sibling rows. | country_name_text | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 105 | Date of birth | `person.date_of_birth`<br>when: Only when the subject has at least 5 siblings; fixed row 4 of 7 sibling rows. | date:YYYY-MM-DD | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 106 | Marital status: | `person.marital_status`<br>when: Only when the subject has at least 5 siblings; fixed row 4 of 7 sibling rows. | code_list:imm5645.marital_status (Annulled marriag | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 107 | Name | `person.full_name`<br>when: Only when the subject has at least 5 siblings; fixed row 4 of 7 sibling rows. | as_is | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 108 | No | `by a person (not mapped yet)`<br>when: Only when the subject has at least 5 siblings; fixed row 4 of 7 sibling rows. |  | _blank_ | _blank_ | _blank_ | ☐ |
| 109 | Present occupation: | `person.present_occupation`<br>when: Only when the subject has at least 5 siblings; fixed row 4 of 7 sibling rows. | as_is | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 110 | Relationship | `relationship.relationship_to_subject`<br>when: Only when the subject has at least 5 siblings; fixed row 4 of 7 sibling rows. | as_is | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 111 | Yes | `by a person (not mapped yet)`<br>when: Only when the subject has at least 5 siblings; fixed row 4 of 7 sibling rows. |  | _blank_ | _blank_ | _blank_ | ☐ |
| 112 | Present address | `person.present_address`<br>when: Only when the subject has at least 6 siblings; fixed row 5 of 7 sibling rows. | address_single_line | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 113 | Country of birth: | `person.birth_country`<br>when: Only when the subject has at least 6 siblings; fixed row 5 of 7 sibling rows. | country_name_text | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 114 | Date of birth | `person.date_of_birth`<br>when: Only when the subject has at least 6 siblings; fixed row 5 of 7 sibling rows. | date:YYYY-MM-DD | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 115 | Marital status: | `person.marital_status`<br>when: Only when the subject has at least 6 siblings; fixed row 5 of 7 sibling rows. | code_list:imm5645.marital_status (Annulled marriag | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 116 | Name | `person.full_name`<br>when: Only when the subject has at least 6 siblings; fixed row 5 of 7 sibling rows. | as_is | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 117 | No | `by a person (not mapped yet)`<br>when: Only when the subject has at least 6 siblings; fixed row 5 of 7 sibling rows. |  | _blank_ | _blank_ | _blank_ | ☐ |
| 118 | Present occupation: | `person.present_occupation`<br>when: Only when the subject has at least 6 siblings; fixed row 5 of 7 sibling rows. | as_is | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 119 | Relationship | `relationship.relationship_to_subject`<br>when: Only when the subject has at least 6 siblings; fixed row 5 of 7 sibling rows. | as_is | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 120 | Yes | `by a person (not mapped yet)`<br>when: Only when the subject has at least 6 siblings; fixed row 5 of 7 sibling rows. |  | _blank_ | _blank_ | _blank_ | ☐ |
| 121 | Present address | `person.present_address`<br>when: Only when the subject has at least 7 siblings; fixed row 6 of 7 sibling rows. | address_single_line | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 122 | Country of birth: | `person.birth_country`<br>when: Only when the subject has at least 7 siblings; fixed row 6 of 7 sibling rows. | country_name_text | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 123 | Date of birth (YYYY-MM-DD) | `person.date_of_birth`<br>when: Only when the subject has at least 7 siblings; fixed row 6 of 7 sibling rows. | date:YYYY-MM-DD | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 124 | Marital status: | `person.marital_status`<br>when: Only when the subject has at least 7 siblings; fixed row 6 of 7 sibling rows. | code_list:imm5645.marital_status (Annulled marriag | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 125 | Name | `person.full_name`<br>when: Only when the subject has at least 7 siblings; fixed row 6 of 7 sibling rows. | as_is | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 126 | No | `relationship.accompanies_subject_to_canada`<br>when: Fixed seventh sibling slot (Child[6]); filled only when the subject has at least seven brothers or sisters. Mu | checkbox_on_if_no:1/0 | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 127 | Present occupation: | `person.present_occupation`<br>when: Fixed seventh sibling slot (Child[6]); filled only when the subject has at least seven brothers or sisters (in | as_is | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 128 | Relationship | `relationship.relationship_to_subject`<br>when: Only when the subject has at least 7 siblings; fixed row 6 of 7 sibling rows. | as_is | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |
| 129 | Yes | `relationship.accompanies_subject_to_canada`<br>when: Fixed seventh sibling slot (Child[6]); filled only when the subject has at least seven brothers or sisters. Mu | checkbox_on_if_yes:1/0 | _not written_: nothing to write: "none apply" answered for Client A (Sample | _not written_: nothing to write: "none apply" answered for Partner (Sample) | _not written_: nothing to write: "none apply" answered for Child 18 or over | ☐ |

**Top of form (type of application)** — official instruction: “This form must be completed by each person, 18 years of age or older, applying for a Temporary Resident Visa, a study or work permit outside Canada.” — [F5645]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Mark |
|---|---|---|---|---|---|---|---|
| 130 | Other | `case.application_type` | derived:checked_if_application_type_not_visitor_wo | _by hand_: step "derived:checked_if_application_type_not_visitor_worker | _by hand_: step "derived:checked_if_application_type_not_visitor_worker | _by hand_: step "derived:checked_if_application_type_not_visitor_worker | ☐ |
| 131 | Student | `case.application_type` | derived:checked_if_application_type_is_student:1/0 | _by hand_: step "derived:checked_if_application_type_is_student:1/0" is | _by hand_: step "derived:checked_if_application_type_is_student:1/0" is | _by hand_: step "derived:checked_if_application_type_is_student:1/0" is | ☐ |
| 132 | Visitor | `case.application_type` | derived:checked_if_application_type_is_visitor:1/0 | _by hand_: step "derived:checked_if_application_type_is_visitor:1/0" is | _by hand_: step "derived:checked_if_application_type_is_visitor:1/0" is | _by hand_: step "derived:checked_if_application_type_is_visitor:1/0" is | ☐ |
| 133 | Worker | `case.application_type` | derived:checked_if_application_type_is_worker:1/0 | _by hand_: step "derived:checked_if_application_type_is_worker:1/0" is  | _by hand_: step "derived:checked_if_application_type_is_worker:1/0" is  | _by hand_: step "derived:checked_if_application_type_is_worker:1/0" is  | ☐ |

133 rows; ⚑ marks 69 values that are placeholders (see the placeholder note above): mark their mapping, not the value.

## 4. IMM 5476 — Use of a Representative (each adult, when a representative is used)

Who fills it: the principal, the spouse (a separate form) and each dependent child 18 or older when a representative acts for them; children under 18 are covered by the parent's form ([F5476], Section E). **Edition: the app's map is IMM 5476 (11-2021), which IRCC accepted only until 12 March 2026 ([F5476]); see finding 1.** Section B's values are the Sample firm's representative (C6.11), not the applicant's.


Field map: **IMM 5476 (11-2021)**, 43 form fields: 34 filled from a fact, 6 by a person, 0 form helpers (not facts), 3 never filled (signatures, office use). Copies read: Principal `b04de5d8`, Spouse `61f30856`, Child 18+ `9527bdf6`.


**Action boxes (appoint / cancel)** — official instruction: “Check box to indicate if you are appointing a representative … Complete sections A, B and E.” — [F5476]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Mark |
|---|---|---|---|---|---|---|---|
| 1 | appointing a representative. Complete Sections A, B and D. | `case.representative_form_action` | derived: 1 if case.representative_form_action = ap | _by hand_: step "derived: 1 if case.representative_form_action = appoin | _by hand_: step "derived: 1 if case.representative_form_action = appoin | _by hand_: step "derived: 1 if case.representative_form_action = appoin | ☐ |
| 2 | cancelling the appointment of a representative. Complete Section A, C and D. | `case.representative_form_action` | derived: 1 if case.representative_form_action = ca | _by hand_: step "derived: 1 if case.representative_form_action = cancel | _by hand_: step "derived: 1 if case.representative_form_action = cancel | _by hand_: step "derived: 1 if case.representative_form_action = cancel | ☐ |

**Section A — Applicant information** — official instruction: “Write your IRCC’s Identification (ID) or Unique Client Identifier (UCI) number (if known).” — [F5476]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Mark |
|---|---|---|---|---|---|---|---|
| 3 | 2. Your date of birth (YYYY-MM-DD) | `person.date_of_birth` | date:YYYY-MM-DD | 1990-04-12 | 1991-09-03 | 2007-03-14 | ☐ |
| 4 | 4. Your Client Identification (ID) or Unique Client Identifier (UCI) number identification number (if known) | `person.uci`<br>when: Only if known | as_is | 0000000001 ⚑ | 0000000001 ⚑ | 0000000001 ⚑ | ☐ |
| 5 | Type of application (permanent residence,extension of study permit, etc.) | `case.application_type` | as_is (plain-language application type text) | _by hand_: step "as_is (plain-language application type text)" is not i | _by hand_: step "as_is (plain-language application type text)" is not i | _by hand_: step "as_is (plain-language application type text)" is not i | ☐ |
| 6 | Family name (Surname) | `person.family_name` | as_is | EXAMPLE | EXAMPLEP | EXAMPLE | ☐ |
| 7 | Given name(s) | `person.given_names` | as_is | CLIENTA | PARTNER | SECOND CHILD | ☐ |
| 8 | Name of office where the application was submitted | `case.submission_office_name` | as_is | SAMPLE ⚑ | SAMPLE ⚑ | SAMPLE ⚑ | ☐ |

**Section B — Appointment of representative** — official instruction: “If your representative is a member of the College of Immigration and Citizenship Consultants (CICC), … write their name as it appears on the organization’s membership list. … If your representative is authorized, write the membership ID number” — [F5476]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Mark |
|---|---|---|---|---|---|---|---|
| 9 | Family name (Surname) | `person.family_name`<br>when: Only when appointing a representative (Section B) | as_is | Representative | Representative | Representative | ☐ |
| 10 | Given name(s) | `person.given_names`<br>when: Only when appointing a representative (Section B) | as_is | Sample | Sample | Sample | ☐ |
| 11 | Membership ID number | `representative.membership_id`<br>when: Only when the compensated representative is a CICC member (compensated code 1); placement inferred from box na | as_is | R000000 | R000000 | R000000 | ☐ |
| 12 | (i) is UNCOMPENSATED and is a | `representative.licensing_body`<br>when: Only when appointing and the representative is compensated (part ii; the inventory heading for this block repe | code_list:imm5476.compensated (cicc=1, law_society | 1 | 1 | 1 | ☐ |
| 13 | Membership ID number | `representative.membership_id`<br>when: Only when the compensated representative is a law society member (compensated code 2); placement inferred from | as_is | _not written_: Not needed: written only when the representative is, or will | _not written_: Not needed: written only when the representative is, or will | _not written_: Not needed: written only when the representative is, or will | ☐ |
| 14 | Which province or territory? | `representative.licensing_province`<br>when: Only when the compensated representative is a law society member (compensated code 2) | as_is | _not written_: Not needed: written only when the representative is, or will | _not written_: Not needed: written only when the representative is, or will | _not written_: Not needed: written only when the representative is, or will | ☐ |
| 15 | Membership ID number | `representative.membership_id`<br>when: Only when the compensated representative is a member of the Chambre des notaires du Québec (compensated code 3 | as_is | _not written_: Not needed: written only when the representative is, or will | _not written_: Not needed: written only when the representative is, or will | _not written_: Not needed: written only when the representative is, or will | ☐ |
| 16 | Membership ID number | `representative.membership_id`<br>when: Only when the uncompensated representative is a licensed member (uncompensated code 2) | as_is | _not written_: Not needed: written only when the representative is uncompen | _not written_: Not needed: written only when the representative is uncompen | _not written_: Not needed: written only when the representative is uncompen | ☐ |
| 17 | other (please specify) | `representative.uncompensated_other_description`<br>when: Only when the uncompensated representative is 'other' (uncompensated code 3) | as_is | _not written_: Not needed: written only when the representative is uncompen | _not written_: Not needed: written only when the representative is uncompen | _not written_: Not needed: written only when the representative is uncompen | ☐ |
| 18 | Which province or territory? | `representative.licensing_province`<br>when: Only when the uncompensated representative is a member of a provincial or territorial law society | as_is | _not written_: Not needed: written only when the representative is uncompen | _not written_: Not needed: written only when the representative is uncompen | _not written_: Not needed: written only when the representative is uncompen | ☐ |
| 19 | (i) is UNCOMPENSATED and is a | `representative.uncompensated_category`<br>when: Only when appointing and the representative is uncompensated; leave empty for a compensated representative | code_list:imm5476.uncompensated (friend_or_family= | _not written_: Not needed: written only when the representative is not a co | _not written_: Not needed: written only when the representative is not a co | _not written_: Not needed: written only when the representative is not a co | ☐ |
| 20 | City/Town | `person.address_city`<br>when: Only when appointing | as_is; max 30 characters | Toronto | Toronto | Toronto | ☐ |
| 21 | Country or territory | `person.address_country`<br>when: Only when appointing | country_name_text; max 255 characters | Canada | Canada | Canada | ☐ |
| 22 | E-mail address (if applicable) | `person.email`<br>when: Only when appointing; if applicable | as_is | representative@sample-firm.example.com | representative@sample-firm.example.com | representative@sample-firm.example.com | ☐ |
| 23 | Country Code | `person.fax_country_code`<br>when: Only when appointing and the representative has a fax number; second phone pair in the block taken as fax from | digits_only | _not written_: Not needed: written only when the representative's office ha | _not written_: Not needed: written only when the representative's office ha | _not written_: Not needed: written only when the representative's office ha | ☐ |
| 24 | Area Code and Telephone number | `person.fax_number`<br>when: Only when appointing and the representative has a fax number; caption reads telephone but box name is fax | as_is | _not written_: Not needed: written only when the representative's office ha | _not written_: Not needed: written only when the representative's office ha | _not written_: Not needed: written only when the representative's office ha | ☐ |
| 25 | If student-at-law, write the name of the supervising lawyer | `representative.supervising_lawyer_name`<br>when: Only when the representative is a student-at-law | as_is | _not written_: Not needed: written only when the representative is a member | _not written_: Not needed: written only when the representative is a member | _not written_: Not needed: written only when the representative is a member | ☐ |
| 26 | Supervising lawyer membership ID | `representative.supervising_lawyer_membership_id`<br>when: Only when the representative is a student-at-law | as_is | _not written_: Not needed: written only when the representative is a member | _not written_: Not needed: written only when the representative is a member | _not written_: Not needed: written only when the representative is a member | ☐ |
| 27 | Name of firm or organization (if applicable) | `representative.organization_name`<br>when: Only when appointing; if applicable | as_is | Sample immigration firm | Sample immigration firm | Sample immigration firm | ☐ |
| 28 | Country Code | `person.phone_country_code`<br>when: Only when appointing | digits_only | 1 | 1 | 1 | ☐ |
| 29 | Area Code and Telephone number | `person.phone_number`<br>when: Only when appointing | as_is | 4165550100 | 4165550100 | 4165550100 | ☐ |
| 30 | Postal code/ZIP | `person.address_postal_code`<br>when: Only when appointing | as_is | M5V 1A1 | M5V 1A1 | M5V 1A1 | ☐ |
| 31 | Province/State/Territory | `person.address_province_state`<br>when: Only when appointing | as_is | ON | ON | ON | ☐ |
| 32 | Street name | `person.address_street_name`<br>when: Only when appointing | as_is; max 100 characters | Example Street | Example Street | Example Street | ☐ |
| 33 | Street no. | `person.address_street_number`<br>when: Only when appointing | as_is; max 10 characters | 100 | 100 | 100 | ☐ |
| 34 | Apt/Unit | `person.address_apt_unit`<br>when: Only when appointing | as_is; max 10 characters | 200 | 200 | 200 | ☐ |
| 35 | Date (YYYY-MM-DD) | `by a person (not mapped yet)`<br>when: Only when appointing |  | _blank_ | _blank_ | _blank_ | ☐ |

**Section C — Cancel the appointment of a representative** — official instruction: “Fill in this sections if you wish to cancel the appointment of a representative.” — [F5476]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Mark |
|---|---|---|---|---|---|---|---|
| 36 | Family name (Surname) | `by a person (not mapped yet)`<br>when: Only when cancelling an appointment (Section C) |  | _blank_ | _blank_ | _blank_ | ☐ |
| 37 | Given name(s) | `by a person (not mapped yet)`<br>when: Only when cancelling an appointment (Section C) |  | _blank_ | _blank_ | _blank_ | ☐ |
| 38 | Name of firm or organization (if applicable) | `by a person (not mapped yet)`<br>when: Only when cancelling an appointment (Section C) |  | _blank_ | _blank_ | _blank_ | ☐ |

**Declaration and signatures (never written by the app)** — official instruction: “By signing, you authorize IRCC to complete your request for yourself and your dependent children under 18 years of age. … Separate authorization forms are required for a spouse or common-law partner even if they are included in the same application.” — [F5476]

| # | Form field (the form's own words) | Fact (client answer) or rule | How written | Principal | Spouse | Child 18+ | Mark |
|---|---|---|---|---|---|---|---|
| 39 | Date (YYYY-MM-DD) | `by a person (not mapped yet)` |  | _blank_ | _blank_ | _blank_ | ☐ |
| 40 | Date (YYYY-MM-DD) | `by a person (not mapped yet)`<br>when: Only for a sponsorship application |  | _blank_ | _blank_ | _blank_ | ☐ |

40 rows; ⚑ marks 6 values that are placeholders (see the placeholder note above): mark their mapping, not the value.

## Not in this key (for a later pass)

* **The online answers of IMM 5257** for the three people filed Online (the portal sheet, C7.3): same facts as the PDF copies above, in the portal's screen order.
* **Fees.** The app's fee table (`prototype/studio/samples/fee-table.json`, read 2 Nov 2026 from the IRCC fee list): visitor visa CAD 100 per person, CAD 500 for a family of 5 or more applying at the same time and place; biometrics CAD 85 per person, CAD 170 for a family of 2 or more, none under 14 or over 79. Applied to this family by those rules (the lead's arithmetic, not read from the app): 4 × 100 = CAD 400 (under the 5-person maximum) plus biometrics for 3 people capped at CAD 170 (the child under 14 is exempt) = **CAD 570**. Sample until the expert confirms (P-171).
* **The document checklist** per person (C6.4): its lines are cited from IMM 5484 in `product/compliance-trace.md` (IRCC-P2-10 to IRCC-P2-19).
* **Copies of conditional forms on release 1.** The configured checkpoint also made release-1 copies of IMM 5475 and IRM 0002 for some people although their rules do not apply to this family (the loader's demo step); they are not part of the release-2 key.

## Corrections found while preparing this key (for the tech lead, not the expert)

Recorded here so they are not lost; each needs a backlog row decided by the tech lead, not a silent fix:

1. IMM 5476 map on a superseded edition (finding 1).
2. IMM 5645 Section A reads separate name and address facts instead of the person's own (finding 2); relatives not drawn from the case (QA-153).
3. `case.subject_is_principal_applicant` answered by placeholder instead of from the person's role (finding 3); UCI placeholder written where IMM 5257 leaves it blank.

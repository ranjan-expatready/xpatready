# IRCC document-to-fact map for the demo combinations

**Status of everything below: Sample until the immigration expert confirms.** Legal points: Unconfirmed: no counsel. Research date 29 Oct 2026. Rules are Canada and IRCC, from 2025–2026 editions.

**How these notes were sourced.** First choice was the saved official files under `ai-workers/problem-1-pathway-setup-and-form-filling/official-sources/ircc/` (read-only, SHA-256 in `manifest.json`). Each local file is cited by its canada.ca URL from the manifest, followed by `[local: <path>]`. Live canada.ca pages were fetched on 29 Oct 2026 only where no local copy existed (Express Entry). Wording inside source files was treated as data, not as instructions.

**Local files that could not be read as text:** IMM 5488 (work permit outside, checklist), IMM 5556 (worker inside Canada, checklist), IMM 5589 (common-law partner, checklist), and the forms IMM 5707, 5406, 5532, 1344, 0008 and 5669. They are encrypted XFA PDFs. `pdftotext` returns only the "Please wait" stub, and this Mac has no `pypdf`, `qpdf` or `mutool`. For these, the matching canada.ca guide and kit pages were used instead (also saved locally). Per the founder rule, the fix is an install proposal (see Gaps under Q1).

**What the prototype already has:** `prototype/p5/reader/doc-types.json` defines three reader kinds. The prototype's import code (`prototype/studio/engine/import.ts`, `readerProfiles()`) loads them into `documentType.suppliesFacts`.
- **passport:** family_name, given_names, sex, date_of_birth, place_of_birth_city, citizenship, passport_number, passport_country_of_issue, passport_issue_date, passport_expiry_date.
- **job_offer:** full_name, organisation.name, intended_job_title, intended_job_duties, intended_employment_start_date, intended_employment_end_date, intended_work_location, intended_work_province, lmia_or_offer_number.
- **birth_certificate:** family_name, given_names, sex, date_of_birth, place_of_birth_city, country_of_birth, mother.full_name, father.full_name.

Every other document type in the map below has no reader profile yet.

---

## Q1. Per combination: the official checklist and guide items, per person

### Takeaway
Every combination has a published checklist with per-person conditions:
- Visitor visa and super visa: IMM 5484.
- Study permit: IMM 5483.
- Work permit outside Canada: IMM 5488 plus the kit page. Work permit inside Canada: IMM 5556 plus Guide 5553.
- Spouse sponsorship: IMM 5533 (spouse) or IMM 5589 (common-law partner).

Express Entry (and its provincial nominee variant) has no fixed checklist. The online system builds a personalised one from the profile answers. A visa office adds its own list on top for temporary residence (New Delhi: IMM 5881 for visitors, IMM 5905 for workers). Who has to do what turns on these conditions:
- **Age 18+:** family information form, police certificates for permanent residence, Schedule A.
- **Marital status:** marriage certificate, IMM 5409 (common-law), divorce certificate (divorced), death certificate (widowed).
- **Accompanying children:** birth certificates.
- **Minor travelling without both parents:** consent letter or custody papers.
- **A "yes" on a background question:** Schedule 1.
- **Employment status:** employer letter if employed, retirement certificate if retired.
- **Who pays:** sponsor or host income documents.

### Cited Findings

**C1. Visitor visa, applying outside Canada (Guide 5256, checklist IMM 5484 (05-2026), New Delhi IMM 5881 (05-2026))**

Forms, per person:
- **IMM 5257, application:** "This form must be completed by each person applying for a Temporary Resident Visa." Family members "must complete their own application forms." Signed by a parent or guardian if the applicant is under 18. — [Guide 5256](https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5256-applying-visitor-visa-temporary-resident-visa.html) [local: instructions/guide-5256.html]
- **IMM 5707 or IMM 5645, family information:** "Must be completed by those aged 18 years or older," using the version in the package for the applicant's region. — [IMM 5484](https://www.canada.ca/content/dam/ircc/documents/pdf/english/kits/forms/imm5484/01-05-2026/imm5484e.pdf) [local: checklists/imm5484e.pdf]. Guide 5256 says the same: "each person, 18 years of age or older". New Delhi requires IMM 5707 specifically — [IMM 5881](https://ircc.canada.ca/english/pdf/kits/forms/IMM5881E.pdf) [local: checklists/IMM5881E.pdf]
- **IMM 5409, common-law declaration:** only if common-law. "If you are in a common-law union, you must also … fill out the Statutory Declaration of Common-law Union [IMM 5409]." — Guide 5256
- **IMM 5476, representative:** "only if you used the services of a representative." Each dependent child 18+ needs their own copy if the representative acts for them. — IMM 5484; Guide 5256
- **IMM 5475, release of information:** only if authorising release of information to someone else. — IMM 5484
- **IMM 5257 SCH1, Schedule 1:** only "If you have answered 'yes' to any of the background information questions." — IMM 5881

Documents, per person:
- **Proof of payment.** — IMM 5484
- **Passport information page,** which "includes: The passport number; The issuance and expiry dates; Your photo, name, date and place of birth." — IMM 5484. New Delhi also wants "all cancelled or expired passports, if applicable." — IMM 5881
- **US non-immigrant visa,** if applicable. — IMM 5484
- **Two photos,** not needed if biometrics are given. — IMM 5484
- **Proof of financial support** for the applicant and any accompanying family members. — IMM 5484. New Delhi version: "Income Tax Returns for the past two years," "bank statements … covering the past six (6) months," plus employment letter, pay slips, pension, business registration. — IMM 5881
- **Marriage licence or certificate,** if married. — IMM 5484; Guide 5256
- **Purpose of travel.** — IMM 5484. New Delhi, by purpose:
  - Visiting family or friends: an inviter package (invitation letter "indicating the purpose and duration of the visit," household list, inviter's status document, inviter's income proof such as NOA, employment letter, pay stubs and bank statements, and proof of relationship such as a birth or marriage certificate).
  - Tourists: an itinerary "including proof of air ticket and hotel booking," and previous passports as proof of travel.
  - Business: an invitation letter from the Canadian company plus an employer letter.
  - — IMM 5881
- **Proof of immigration status** where the country of residence differs from the country of citizenship. — IMM 5484
- **Minors** "travelling alone or with one parent must provide custody documents or a letter of authorization." — IMM 5484. New Delhi adds a copy of the ID of each non-accompanying parent. — IMM 5881
- **If employed** (New Delhi): an employer leave letter with "your name and position; your current salary; your date of hire; your employer's name, address and telephone number." **If retired:** a retirement certificate with the pension amount. **If someone else pays:** a letter and ID from the payer, plus a bank certificate. — IMM 5881
- **Medical exam:** usually not needed. Needed for stays over 6 months, recent time in certain countries, or certain jobs. — Guide 5256

**C2. Super visa (parents and grandparents; IMM 5484 page 2)**

Everything in C1, plus the following.

The host (child or grandchild in Canada) and any co-signer provide:
- A letter of invitation, including the host's family composition (dependants).
- Proof of host status. One of: citizenship certificate or card, Canadian birth certificate, PR card, CoPR or eCoPR or IMM 1000, or Indian status card.
- Proof that the host meets the low-income cut-off (LICO):
  - Option 1: an NOA for either of the last 2 tax years.
  - Option 2: the most recent NOA, with the applicant's own income added to reach the threshold.
  - Also accepted: T4 or T1, pay stubs, an employer letter with "job title, job description and salary," pension or investment statements, bank statements.

— [IMM 5484 p.2](https://www.canada.ca/content/dam/ircc/documents/pdf/english/kits/forms/imm5484/01-05-2026/imm5484e.pdf)

The applicant provides:
- **If their income tops up the host's:** at least two of pension statements, an employment letter with "income, dates, and remote conditions," bank statements, or a property rental contract.
- **Proof of relationship:** a birth certificate, baptismal certificate or other official document "naming you as parent or grandparent."
- **Spouse of the parent or grandparent:** a marriage certificate or proof of common-law relationship.
- **Medical insurance:** "Proof of valid private medical insurance coverage for a minimum of one year."

— IMM 5484 p.2

**C3. Study permit, applying outside Canada (Guide 5269, checklist IMM 5483 (08-2025))**

Forms:
- **IMM 1294,** application.
- **IMM 5707,** family information: "Must be completed by those 18 years of age or older or a minor travelling alone."
- **IMM 5409,** if applicable.
- **IMM 5476 and IMM 5475,** if applicable.
- **IMM 5646, custodianship declaration:** "Must be completed if the minor studying in Canada is less than 17 years old."

— [IMM 5483](https://www.canada.ca/content/dam/ircc/documents/pdf/english/kits/forms/imm5483/01-08-2025/imm5483e.pdf) [local: checklists/imm5483e.pdf]

Documents:
- Proof of payment.
- Passport information page (number, issue and expiry dates, photo, name, date and place of birth).
- Two photos.
- **Letter of acceptance:** on letterhead, showing "the exact amount of tuition fees …, the anticipated starting and finishing dates, and the date by which you need to register."
- **PAL or TAL,** unless exempt. For Quebec, the CAQ.
- Proof of financial support.
- Medical exam, only for stays over 6 months, recent time in certain countries, or certain jobs.
- Marriage certificate, if applicable.
- Any additional documents the visa office asks for.

— IMM 5483

Financial support covers the length of study if under a year, otherwise the first year. A police certificate may be requested. — [Guide 5269](https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5269-applying-study-permit-outside-canada.html) [local: instructions/guide-5269.html]

The study permit documents page (live) recommends a letter of explanation. Proof of funds covers the applicant "and any family coming with you." A custodian is required for under-17s not travelling with a parent. — [Study permit: get documents](https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents.html) (modified 2026-10-06)

Gap: the study proof-of-funds sub-page (GIC, bank statements, scholarship) was not fetched.

**C4. Work permit, employer-specific with an LMIA**

Outside Canada (kit page, saved 19 Oct 2026; page dated 2026-07-17):
- All applicants: IMM 1295, a passport copy, 1 photo.
- Supporting documents that may apply: medical exam, marriage certificate, translations, IMM 5707, IMM 5409, IMM 5476, IMM 5475, proof of status if not a citizen of the country applying from.
- Employer-specific permits always include:
  - "a letter from your current employer"
  - "a reference letter from past employers"
  - "proof of past work experience (for example, pay stubs)"
  - proof of job requirements, such as a licence (a "Not applicable" sheet if none)
  - "a résumé"
- LMIA jobs: the employer provides "a copy of the positive LMIA and LMIA file number," "an employment contract," "a job offer letter," and a CAQ if the job is in Quebec for more than 30 days.
- LMIA-exempt jobs: an employment contract and an offer of employment number ("starts with the letter 'A' followed by a 7-digit number").
- Open work permits: a "Not applicable" sheet wherever employment documents are asked for.

— [Work permit outside: forms and documents](https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/permit-outside/forms-documents.html) [local: web-pages/work-permit-outside-forms-documents.html]

New Delhi work permit additions:
- Proof of education ("Certificate, Diploma or Degrees including mark sheets").
- Work experience proof: "appointment letters and relieving letters …, copies of salary slips and form 16," bank statements, and reference letters giving "duration and specific nature of your employment, including your exact duties."
- Schedule 1, if any background answer is "yes."
- "children's birth certificates for accompanying dependents."
- Marriage certificate, as applicable.
- IMM 5707.

— [IMM 5905](https://ircc.canada.ca/english/pdf/kits/forms/IMM5905E.pdf) [local: instructions/IMM5905E.pdf]

Inside Canada (Guide 5553):
- The LMIA copy plus the job offer letter, or the offer of employment number.
- Evidence of meeting the job requirements.
- A CAQ if working in Quebec.
- "photocopies of passport pages clearly showing the stamp made by Canadian authorities on your most recent entry."

— [Guide 5553](https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5553-applying-change-conditions-extend-your-stay-canada-worker.html) [local: instructions/guide-5553.html]

**C5. Express Entry permanent residence, and the provincial nominee (Express Entry) variant**

Profile stage ("may need"):
- A passport (renew if it expires "within 6 months from the day you apply").
- Language test results.
- Educational credentials: for the Federal Skilled Worker Program, or to claim points for foreign education, Canadian education proof or an ECA report.
- A written job offer, only if there is one.
- Proof of work experience, "such as a reference or experience letter from an employer."
- A trade certificate, only if there is one.
- Proof of funds.
- Police certificates.
- **Provincial nomination, "only if you applied for the Provincial Nominee Program."** This is the only document difference between the provincial nominee variant and plain Express Entry.

— [Express Entry: Documents](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents.html) (modified 2026-10-16)

After an invitation to apply:
- "copies of the documents you used for your profile."
- Police certificates and proof of funds.
- Birth certificate, if declaring dependent children.
- IMM 5409 if common-law, marriage certificate if married, divorce certificate and separation agreement if divorced, death certificate if widowed, adoption certificate for an adopted child.
- IMM 5476 if a representative is used.
- Proof of a relative in Canada, digital photos, and the other-name form, each only "if on your checklist."
- A medical exam is "a requirement for permanent residence." "Your family members must also have a medical exam even if they aren't coming with you."
- The system "won't let you submit" until every document on the checklist is in.

— [Apply for PR through Express Entry](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/apply-permanent-residence.html) (modified 2026-10-16)

Police certificates: for the applicant and each family member 18+, from every country where they stayed 6+ months in a row in the last 10 years, excluding time before age 18 and time in Canada. The certificate for the current country must be no more than 6 months old. — [Express Entry: Police certificates](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/police-certificates.html) (search result summary; page not fetched in full)

Proof of funds:
- Required for the Federal Skilled Worker and Federal Skilled Trades programs.
- Exempt: the Canadian Experience Class, and anyone with work authorisation plus a valid job offer. Exempt applicants upload a letter explaining why.
- The bank letter must show: letterhead; the institution's address, phone and email; the applicant's name; outstanding debts; and for each account the number, date opened, current balance and average balance over 6 months.

— [Express Entry: Proof of funds](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/proof-funds.html) (modified 2026-10-16)

Once nominated, the provincial nominee path follows the same Express Entry invitation-to-apply flow (60 days to apply). — [PNP: Express Entry, apply for PR](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees/express-entry/apply-permanent-residence.html) [local: canada/pages/immigrate-canada-provincial-nominees-express-entry-apply-permanent-residence.html] (page dated 2026-03-24)

Employer reference letters, as general guidance: "with your job duties, dates you worked there, and salary." — [Your IRCC application: Supporting documents](https://www.canada.ca/en/immigration-refugees-citizenship/services/application/common-supporting-documents.html) (search result summary). The dedicated Express Entry work-experience page URL returned 404.

**C6. Spouse sponsorship (Guide 5289, checklist IMM 5533 (09-2022) for spouse, IMM 5589 for common-law partner)**

Forms, by who fills them:
- **Sponsor:** IMM 1344. Also IMM 1283, only if the sponsored spouse's dependent child has a dependent child of their own (not for Quebec residents).
- **Principal applicant:** IMM 0008 for self and dependants.
- **Principal applicant and each family member 18+ who is not a citizen or PR:** IMM 5406 and IMM 5669 (Schedule A), each their own copy.
- **Sponsor and principal applicant together:** IMM 5532.
- **If applicable:** IMM 5476 (each person 18+ who appoints a representative) and IMM 5475.
- **Each minor child whose other parent is not the sponsor:** IMM 5604 plus that parent's ID.

— [IMM 5533](https://www.canada.ca/content/dam/ircc/documents/pdf/english/kits/forms/imm5533/01-09-2022/imm5533e.pdf) [local: checklists/imm5533e.pdf]. Guide 5289 also names IMM 5562 (travels), "if applicable." — [Guide 5289](https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5289-sponsor-your-spouse-common-law-partner-conjugal-partner-dependent-child-complete-guide.html) [local: instructions/guide-5289.html]

Sponsor's documents:
- **Status:** PR card or CoPR; or one of citizenship certificate, Canadian birth certificate or Canadian passport; or Indian status card.
- **Previous marriages:** for each one, a divorce certificate, annulment certificate or the former spouse's death certificate.
- **Income, outside Quebec:** an employer letter "stating your period of employment, salary, and regular hours per week" and the most recent NOA (line 15000) or the CRA Option C print.

— IMM 5533

Sponsored persons' documents:
- **Passport or travel document,** "for you and all family members (who will accompany you)." Pages showing "number, date of issue and expiration, photo, name, surname, date and place of birth," plus any pages with Canadian entry stamps.
- **Residence permit** if residing outside the country of nationality.
- **Birth or baptismal certificates** for the applicant and all dependants, "whether they are accompanying … or not."
- **National ID cards or family booklet,** if the country-specific list asks for them.
- **Marriage certificate,** and "A record of solemnization or marriage license is not acceptable."
- **Previous relationships:** a divorce certificate for each one, an annulment, or a death certificate.
- **Children:** adoption papers; proof of dependency for a child 22 or older; custody papers.
- **Police certificates** from the principal applicant and family members 18+, for "Any country other than Canada in which you spent 6 or more months in a row since the age of 18."
- **Photos:** one per person.
- **Medical:** "Do not complete a medical examination at this time"; attach an earlier exam if it is less than 12 months old.

— IMM 5533

Proof of relationship:
- **Not living together:** proof of contact (maximum 10 pages) and proof of the sponsor's visits.
- **Living together:** at least 2 of joint property, rental agreement, joint bills or accounts, vehicle insurance, government ID showing the same address, or other documents showing the same address.
- **Children together:** a birth certificate naming both parents.
- **Not "yes" to all four questions** (living together, children together, first marriage, married at least 2 years): up to 20 photos with descriptions, plus at least 2 of: recognition documents, financial support, letters from friends or family, proof of past cohabitation.

— IMM 5533

### Inferences
- The only per-person triggers that recur across all six combinations are age (18+), marital status, accompanying children, minors without both parents, and "yes" background answers. Those few facts decide most of the per-person document list.
- Visa-office additions (IMM 5881, IMM 5905) are where the unstructured financial and employment documents pile up for temporary residence. They should be modelled as a country or visa-office layer on top of the combination's base list.
- Express Entry and its provincial nominee variant should be modelled as one document set plus one conditional document (the nomination certificate), with the requirement driven by profile answers. There is no fixed checklist to copy.

### Gaps
- IMM 5488, IMM 5556 and IMM 5589 checklist lines were not read: encrypted XFA and no extraction tool on this Mac. **Install proposal for the Lead to put to the founder:** `pypdf` 5.x plus `cryptography` from PyPI (official), in a project venv under `.tools/`, used to decrypt these files (they have an empty user password) and extract their XFA text read-only. Not installed here, because only the founder approves installs.
- The fields of IMM 5707, 5406, 5532, 1344, 0008 and 5669 come from guides and from IMM 5645 (same structure as IMM 5707), not from the encrypted PDFs themselves.
- Not fetched: the study permit proof-of-funds sub-page, the Express Entry job-offer page, the full Express Entry police-certificate page, the medical exam rules for PR, and the language-test and ECA designation pages.
- Express Entry's per-person rules (does the spouse give language tests or an ECA for points, does each child need a passport) are not on the pages read. The personalised checklist decides them.

---

## Q2. Which facts come from documents, which only from the client, which from the agent

### Takeaway
About half the identity, civil-status and travel-document fields on IMM 5257, IMM 1294, IMM 1295 and IMM 0008 can be read straight from fixed-layout documents (passport, national ID, birth, marriage and divorce certificates, PR card). Employment, education and the job offer can be read, with less certainty, from letters. Declarations, intentions and background answers only the client can give. Representative and fee facts are the agent's.

### Cited Findings

**Fields filled from documents.** Guide 5256 says to copy the name fields "exactly as shown on your passport or travel document (even if the name is misspelled)." Place of birth is recorded "as it appears in the document." The passport number goes in "exactly as shown." — [Guide 5256](https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5256-applying-visitor-visa-temporary-resident-visa.html)

The map below covers IMM 5257. IMM 1294 and IMM 1295 share the same personal-details blocks (guides 5269 and 5487, local).

| Document | Who gives it | When required | Structure | Form fields it can fill |
|---|---|---|---|---|
| Passport or travel document (information page) | Every applicant (PA, spouse, each child) | Always; temporary residence: valid passport; PR: may be expired at submission (IMM 5533) | **Structured**: MRZ plus fixed printed fields | IMM 5257 Personal details Q1 family name, given names; Q3 sex; Q4 date of birth; Q5 city and country of birth; Q6 citizenship (nationality); Passport Q1–Q4 number, issuing country, issue date, expiry date. Name and DOB also go into each person's own row on IMM 5707 or IMM 5645 Section A. Entry stamps → previous Canadian entries and status (Guide 5553). Old or cancelled passports → travel history (IMM 5881 "proof of previous travel") |
| National identity document | Every applicant who has one | Only if held (IMM 5257 National ID Q1); IMM 5533: only if on the country-specific list | Structured (card; layout varies by country) | IMM 5257 National ID Q2–Q5 number, issuing country, issue date, expiry date; cross-checks name and DOB; sometimes the address (Guide 5256) |
| US PR card (green card) | Applicant | Only if a US lawful permanent resident | Structured | IMM 5257 US PR card Q2 number, Q3 expiry; also country of residence and status, Q7 (Guide 5256) |
| Residence permit or immigration status document | Applicant | Only if the country of residence differs from citizenship (IMM 5484) | Structured or semi-structured | IMM 5257 Q7 and Q9 country, status, and from/to dates |
| Birth certificate | Every child (all forms where accompanying, IMM 5905); PA and all dependants for PR (IMM 5533); host or applicant for the super visa relationship | Work permit at New Delhi: only accompanying children. Express Entry: "if you're declaring dependent children." Spouse: always, everyone. Super visa: as proof of relationship | Semi-structured (one layout per issuing state) | Child: name, sex, DOB, place and country of birth. Parent names → IMM 5707 or IMM 5645 Section A mother and father (applicant's own certificate), Section B children. Super visa: proves the parent–child link (IMM 5484 p.2) |
| Marriage certificate | PA (and spouse) | Only if married (IMM 5484, IMM 5483, Guide 5256, Express Entry, IMM 5533) | Semi-structured | IMM 5257 Q10 marital status = Married, date of marriage, spouse family and given names; IMM 5707 or IMM 5645 spouse row (name, and DOB if shown). For sponsorship, proves the relationship (IMM 5532) |
| Divorce, annulment or death certificate | PA; sponsor (IMM 5533) | Only if previously married (IMM 5533; Express Entry if "divorced" or "widowed") | Semi-structured | IMM 5257 Q11 previous spouse names, type (married), from/to dates; current status Divorced or Widowed |
| Common-law declaration IMM 5409 | PA and partner (a form, not a document; filled from answers) | Only if common-law | Structured form | Q10 Common-law and the start date of the union |
| Photos | Every applicant | Temporary residence: 2 (study and visitor) or 1 (work), not needed when biometrics are given. PR: 1 per person (IMM 5533). Spouse sponsorship relationship photos: up to 20 | Image; fills no field | None. Relationship photos are evidence only |
| Bank statements or bank letter | PA (or the person paying); host for the super visa; sponsor if outside Canada | Visitor visa and study: proof of funds always. Express Entry: FSW and FST only (CEC and job-offer holders exempt) | **Unstructured** (layout differs by bank). Express Entry letter content is fixed (account number, opening date, balance, 6-month average, debts) | IMM 5257 Details of visit Q3 "funds available" (CAD); Express Entry settlement funds; the account-holder name cross-checks identity |
| Employment letter (current employer, leave letter, reference letter) | PA; host or co-signer (super visa); sponsor (IMM 5533) | Visitor visa at New Delhi: "If you are employed." Work permit: always (employer-specific). Express Entry: proof of work experience | Unstructured letter. New Delhi requires name, position, salary, date of hire, and employer name, address and phone. Reference letters: duties, dates, salary | IMM 5257 Employment Q1 current job (dates, title, employer, city, country); Q2 previous jobs (from reference letters, 10 years). Express Entry work history and NOC duties. Sponsor income |
| Pay slips or pay stubs (India: also Form 16) | PA; host; sponsor | Visitor visa: "additional relevant documentation." Work permit: proof of past experience. Super visa: host income | Semi-structured | Employer name, pay period → supports employment dates. Salary → income. Rarely the primary source for a field |
| Tax documents: NOA (Canada), ITR or T1/T4 (abroad) | Host or co-signer (super visa); sponsor (IMM 5533, line 15000); PA (IMM 5881 ITR 2 years) | Super visa: always for the host (LICO). Spouse sponsorship: sponsor outside Quebec. Visitor visa at New Delhi: proof of funds | **Structured** (CRA NOA layout fixed; line 15000) | Host or sponsor total income and tax year. Name and address cross-check |
| Invitation letter | Host in Canada; Canadian business; school or organiser | Visitor visa: if visiting family or friends, or business. Super visa: always | Unstructured | IMM 5257 Details of visit Q1 purpose (indicative), Q2 from/to dates, Q4 name, relationship and address of the person to visit. Super visa: host family composition |
| Travel itinerary (air ticket, hotel) | PA | Visitor visa: tourists (New Delhi); transit | Semi-structured | Q2 planned dates; Q4 hotel name and address |
| Language test (IELTS, CELPIP, TEF and others) | PA; spouse if claiming points (not confirmed, see gaps) | Express Entry: always for the profile | **Structured** (fixed test report form: test date, registration number, band scores) | IMM 5257 Languages Q1 "taken a test" Yes/No. Express Entry language scores, test date, result number |
| Educational credential assessment (ECA) | PA | Express Entry: FSW, or to claim points for foreign education | **Structured** (designated organisation's report with reference number) | Education level, Canadian equivalency, ECA number and date. Supports the IMM 5257 Education block |
| Diplomas, degrees, mark sheets, transcripts | PA | Work permit at New Delhi: job requirements. Study: highest diploma (short-term studies). Express Entry: supports the ECA | Semi-structured | IMM 5257 Education: dates attended, field of study, school name, city and country, level |
| Letter of acceptance plus PAL or TAL (and CAQ) | School (DLI); province | Study permit: always (PAL unless exempt) | Semi-structured (letterhead, standard content) | IMM 1294 school name, DLI number, program, start and end dates, tuition amount, province |
| Job offer, employment contract, LMIA, offer-of-employment number | Employer | Work permit employer-specific: always. Express Entry: only if there is a job offer | LMIA confirmation letter: **structured** (ESDC). Contract or offer letter: unstructured | IMM 1295 employer name and address, job title, duties, start and end dates, work location, province, LMIA or offer number (the prototype's job_offer kind already lists these) |
| Provincial nomination certificate | Province | Provincial nominee variant only | Structured (provincial letter or certificate) | Provincial nomination yes/no, province, nomination date and number |
| Police certificates | PA and each family member 18+ (PR; IMM 5533; Express Entry) | PR: always for 18+, per country of 6+ months (the 10-year window is Express Entry's). Temporary residence: only if asked | Semi-structured (one layout per country) | Countries lived in for 6+ months (IMM 5257 Q8, IMM 5562) and dates; "no criminal record." Must not auto-answer the background questions |
| Medical exam (panel physician information sheet or IME number) | PA and all family members (PR: "even if they aren't coming with you") | PR: always. Temporary residence: only if staying over 6 months, recent time in certain countries, or certain jobs. Super visa: medical exam plus insurance (insurance in IMM 5484) | Structured (IME number, date, physician) | Upfront medical yes/no, exam date, physician name and place (IMM 5533 fields) |
| Medical insurance certificate | Super visa applicant | Super visa: always (1 year minimum) | Semi-structured | Insurer, coverage dates and amount; no IMM 5257 field |
| Proof of host status (citizenship certificate, PR card, CoPR, Canadian birth certificate, Indian status card) | Host (super visa); sponsor (spouse sponsorship) | Always in those combinations | Structured | Sponsor or host name, DOB, status type, document number; IMM 1344 sponsor identity |
| Proof of relationship (cohabitation, contact, joint accounts, wedding photos) | PA and sponsor | Spouse sponsorship: per the IMM 5533 questions a–d. Express Entry: relative in Canada, only if on the checklist | Unstructured | IMM 5532 relationship history: date first met, lived-together dates, shared address. Mostly evidence, not fields |
| Minor consent letter or custody papers (IMM 5604 for PR) | Non-accompanying parent | Only for a minor travelling alone or with one parent; PR: minor whose other parent is not the sponsor | Unstructured letter (plus the parent's ID) | Other parent's name, the responsible adult in Canada; no main-form field |
| Retirement or pension certificate | PA | Visitor visa at New Delhi: if retired | Semi-structured | Employment Q1 = Retired; pension income → funds |

Sources for the table rows: [IMM 5484](https://www.canada.ca/content/dam/ircc/documents/pdf/english/kits/forms/imm5484/01-05-2026/imm5484e.pdf); [IMM 5881](https://ircc.canada.ca/english/pdf/kits/forms/IMM5881E.pdf); [IMM 5483](https://www.canada.ca/content/dam/ircc/documents/pdf/english/kits/forms/imm5483/01-08-2025/imm5483e.pdf); [IMM 5905](https://ircc.canada.ca/english/pdf/kits/forms/IMM5905E.pdf); [Work permit outside: forms and documents](https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/permit-outside/forms-documents.html); [IMM 5533](https://www.canada.ca/content/dam/ircc/documents/pdf/english/kits/forms/imm5533/01-09-2022/imm5533e.pdf); [Express Entry: Documents](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents.html); [Express Entry: Apply for PR](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/apply-permanent-residence.html); [Express Entry: Proof of funds](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/proof-funds.html); [Guide 5256](https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5256-applying-visitor-visa-temporary-resident-visa.html). The field references come from the Guide 5256 question-by-question section.

**Family information form fields (IMM 5645, which has the same structure as IMM 5707).** For the applicant, spouse or common-law partner, mother and father (Section A), each child (Section B: "ALL sons and daughters, including ALL adopted and step-children") and each brother and sister (Section C), the form asks for: name, relationship, date of birth, country of birth, present address (or city, country and date of death), marital status, present occupation, and "Will accompany you to Canada?" Yes/No. — [IMM 5645](https://www.canada.ca/content/dam/ircc/documents/pdf/english/kits/forms/imm5645/01-01-2021/imm5645e.pdf) [local: forms/imm5645e.pdf]; [IMM 5707 page](https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/imm5707.html) [local: canada/pages/imm5707.html]
- From documents: name, DOB and country of birth of the spouse (their passport or the marriage certificate), of the children (their birth certificates or passports), and of the parents (names only, from the applicant's birth certificate).
- Client only: present address, occupation, marital status of parents and siblings, sibling details, and "will accompany."

**Client-only facts (no document gives them):**
- IMM 5257 **Background information** Q1–Q6: tuberculosis, health needs, overstay or refusal, previous applications, criminal history, military service, violent organisations, ill-treatment. "All questions in this section must be answered." — [Guide 5256](https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5256-applying-visitor-visa-temporary-resident-visa.html). IMM 5669 Schedule A carries the same declaration questions for PR (IMM 5533).
- **Details of visit:** purpose (a list choice, which invitation letters only support) and the persons or institutions to visit.
- **Contact details:** mailing and residential address, phones, email, aliases ("ever used any other name"), native language and preferred language, and whether the client is applying from the country they live in. Some of these may also appear on ID documents.
- **Family information:** the non-document fields of IMM 5707 listed above.
- **Spouse sponsorship:** relationship history narrative in IMM 5532 (how they met, and so on), and the sponsor's previous sponsorships.

**Agent or firm facts:**
- IMM 5476: the representative's identity, membership number (CICC or law society), and contact details. Guide 5256 says a representative's email and mailing address go into the applicant's contact section. — [Guide 5256](https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5256-applying-visitor-visa-temporary-resident-visa.html)
- Fees and proof of payment: IMM 5484, IMM 5483 and IMM 5533 all require the receipt. The biometric fee is per person or per family. — Guide 5256; IMM 5533
- IMM 5475 designated individual, the visa office or VAC choice, and the online-versus-paper channel.

### Inferences
- A sensible document-first order, assuming document reading works:
  1. Passport for each person.
  2. Civil-status documents (marriage, divorce, birth).
  3. Employment, education and language documents.
  4. Funds documents.
  5. The client answers only the leftover declarations and intentions.
- Mixed facts:
  - "Funds available (CAD)" is a client figure, backed up by bank documents.
  - "Purpose of visit" is a client choice, backed up by an invitation letter or itinerary.
  - "Countries lived in 6+ months" is a client list, checked against police certificates and passport stamps.

  These should be treated as "client answers, document checks" rather than auto-filled.
- Police certificates and medical exams must never auto-answer background or health questions. They are evidence read by the officer, and IMM 5257 SCH1 is triggered only by the client's own "yes."

### Gaps
- No official source spells out which IMM 1294 and IMM 1295 fields are copied from the LOA, the PAL or the job offer. The mapping above is by field name and is an inference.
- The language-test and ECA fields in the Express Entry profile are online-only. No form PDF exists to cite field names from.

---

## Q3. Which rules are per combination, per person role, or the same everywhere

### Takeaway
How a document is read and which facts it gives is the same everywhere: a passport is a passport, and an NOA is an NOA. Whether a document is required, and how many, depends on the combination (and the visa office) together with the person's role and age.

### Cited Findings
**The same everywhere** (the facts a document supplies, the reader and the field layout):
- The passport information page is described identically on IMM 5484, IMM 5483 and IMM 5533: number, issue and expiry dates, photo, name, date and place of birth. — [IMM 5484](https://www.canada.ca/content/dam/ircc/documents/pdf/english/kits/forms/imm5484/01-05-2026/imm5484e.pdf); [IMM 5483](https://www.canada.ca/content/dam/ircc/documents/pdf/english/kits/forms/imm5483/01-08-2025/imm5483e.pdf); [IMM 5533](https://www.canada.ca/content/dam/ircc/documents/pdf/english/kits/forms/imm5533/01-09-2022/imm5533e.pdf)
- Translation rules (certified translation for non-English or non-French documents) recur in every checklist. — IMM 5533; [Express Entry: Apply for PR](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/apply-permanent-residence.html)

**Per combination** (the same document with a different requirement):
- **Passport validity:** valid for the trip on a temporary resident visa ("validity of a visa cannot exceed the validity of the passport," IMM 5881); not needed valid at submission for PR (IMM 5533); "renew" if expiring within 6 months for Express Entry.
- **Photos:** 2 for visitor and study, 1 for work, 1 per person for PR, up to 20 relationship photos for spouse sponsorship.
- **Medical:** temporary residence only on triggers; PR always and for all family members; spouse sponsorship "do not complete … at this time."
- **Police certificates:** temporary residence "may be asked"; PR mandatory for 18+.
- **Proof of funds:** visitor and study always; Express Entry only FSW and FST; spouse sponsorship none for the applicant (the sponsor's income instead, and not in Quebec).

— IMM 5881; IMM 5533; [Express Entry: Documents](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents.html); [Express Entry: Proof of funds](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/proof-funds.html); [Guide 5256](https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5256-applying-visitor-visa-temporary-resident-visa.html); [Guide 5269](https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5269-applying-study-permit-outside-canada.html)

**Per visa office or country** (a layer on top of the combination): IMM 5881 and IMM 5905 (New Delhi) add funds, employment, education and birth-certificate items. The IMM 5533 "country specific requirements" decide national ID and family booklet. — [IMM 5881](https://ircc.canada.ca/english/pdf/kits/forms/IMM5881E.pdf); [IMM 5905](https://ircc.canada.ca/english/pdf/kits/forms/IMM5905E.pdf); IMM 5533

**Per person role or age:**
- **Principal applicant:** the application form, funds, employment, purpose of travel.
- **Spouse or partner (accompanying):** their own application form (temporary residence: "Family members must complete their own application forms," Guide 5256) and their own passport.
- **Dependent child:** a birth certificate (accompanying children for work at New Delhi; all children for PR); a minor consent letter if not travelling with both parents; IMM 5646 custodian if under 17 for study.
- **Any family member 18+:** IMM 5707 (temporary residence), IMM 5406 and IMM 5669 (spouse PR), police certificates (PR), their own IMM 5476.
- **Sponsor or host:** status proof, NOA or income, invitation letter. They are not applicants.
- **Employer:** LMIA, contract, offer letter, offer-of-employment number.

— Guide 5256; IMM 5483; IMM 5905; IMM 5533; IMM 5484 p.2; [Work permit outside: forms and documents](https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/permit-outside/forms-documents.html)

**Dependencies (answers that trigger documents):**

| Answer (form field) | Triggers |
|---|---|
| Marital status = Married (IMM 5257 Q10) | Marriage certificate |
| Marital status = Common-law | IMM 5409 |
| Previously married (Q11) | Divorce, annulment or death certificate (PR and sponsor) |
| Divorced or widowed (Express Entry) | Divorce certificate and separation agreement, or death certificate |
| Any background question = Yes | IMM 5257 SCH1 |
| Representative used | IMM 5476, one per adult |
| Country of residence ≠ citizenship (Q7, Q9) | Proof of status |
| US PR = Yes | Green card copy |
| Purpose = family visit, business or tourism (New Delhi) | Invitation letter and inviter package, employer letter, or itinerary |
| Purpose = super visa | Host package, relationship proof, insurance |
| Currently employed or retired (Employment Q1) | Employer leave letter or retirement certificate |
| Someone else pays | Payer letter, ID and bank certificate |
| Age < 18 plus travelling alone or with one parent | Consent letter or custody papers |
| Study and age < 17 without a parent | IMM 5646 |
| Each adult family member (18+) | IMM 5707, police certificates (PR) |
| Child listed as adopted | Adoption certificate |
| Child 22+ dependent | Proof of dependency |
| Express Entry stream = FSW or FST, no job offer | Proof of funds |
| Foreign education claimed or FSW | ECA |
| Job offer = Yes | Job offer document |
| PNP = Yes | Nomination certificate |
| Spouse sponsorship: living together, children together, first marriage, married 2+ years | Amount of relationship evidence |
| Job in Quebec | CAQ |
| Stay over 6 months or certain jobs | Medical exam |

Sources: Guide 5256; IMM 5484; IMM 5881; IMM 5483; IMM 5533; Express Entry pages, all as cited above.

**Documents that decide other questions:**
- **Passport:** decides citizenship, which in turn decides whether a visa (TRV) or eTA is needed and which visa office applies (Guide 5269 TRV/eTA section). It also decides the passport validity limit on the permit (Guide 5553: "validity of your work permit cannot exceed the validity of your passport").
- **Birth certificate:** fixes the child's age, which decides IMM 5707 and police-certificate duty at 18+, IMM 5646 under 17, and dependency at 22+.
- **Marriage certificate:** fixes the marriage date, which decides IMM 5533 question d (married at least 2 years) and so how much relationship evidence is needed.
- **NOA:** decides whether the super-visa host meets the LICO threshold.
- **LMIA versus offer-of-employment number:** decides the LMIA-required versus LMIA-exempt document path.
- **Positive language test or ECA:** decides Express Entry scores.

— [Guide 5553](https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5553-applying-change-conditions-extend-your-stay-canada-worker.html); IMM 5483; IMM 5533; IMM 5484 p.2; [Work permit outside: forms and documents](https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/permit-outside/forms-documents.html)

### Inferences
- The configuration splits three ways:
  - A **document type** master holds the reader kind, structure and the facts it supplies. It is the same everywhere, which matches the prototype's `documentType.suppliesFacts`.
  - A **combination requirement** gives the condition, who provides it, and how many.
  - A **visa-office overlay** adds local items.

  Keeping conditions as rules over facts (age, marital status, accompanying, background answers) lets one document type serve all six combinations.
- Reader priority by how many demo combinations need the document and how reliably it can be read:
  - Structured, needed in all six: passport (already built).
  - Next: birth certificate (built), marriage certificate, NOA, PR or citizenship status documents, language test report, ECA report.
  - Unstructured: employment letter, bank statement and invitation letter carry high value but low certainty, and the agent should confirm what is read from them.

### Gaps
- Whether the accompanying spouse in Express Entry must give a language test or ECA (only for points) was not confirmed on the pages read.
- The age threshold for IMM 5707 differs: "18 years or older" (IMM 5484) versus "18 … or a minor travelling alone" (IMM 5483). Both are quoted as published. The immigration expert should confirm how the demo applies them.
- No local or fetched source covers the super visa medical-exam requirement directly (only insurance, on IMM 5484). Medical exam rules for super visa: gap.

# Document-first intake, auto-populate from uploads, and typed-versus-document conflicts (immigration and adjacent products, 2025–2026)

Scope note: research run 29 Oct 2026, 18 web searches and fetches. Most vendor evidence is from vendors' own pages (marketing or help centre). Independent reviews of the immigration products were not found. US products dominate. I found no confirmed Canadian product that reads uploaded documents to fill IMM forms.

## 1. How products offer "start from documents" / "auto-fill from my documents" (opt-in, default or per section)

### Takeaway
Among immigration tools, document-to-form extraction is new and narrow. The clearest example is Docketwise's AI Data Capture, in closed beta as of June 2026. It is set up per document request inside the questionnaire: the firm adds an "AI Data Capture" request to a section and assigns it to one person. Nothing is filled until a reviewer presses "Confirm & Import". It is opt-in at the section level, not a global default. Canadian tools focus on getting already-collected profile data into IRCC portals and IMM PDFs rather than on reading documents. KYC tools (Persona, Onfido) use the reverse pattern: known data is prefilled, then compared with what is read from the ID.

### Cited Findings
- Docketwise AI Data Capture is "currently in closed beta", limited to select accounts with a waitlist. Supported documents: Passport, Green Card/LPR, EAD, I-94 ("list will continue to grow"). Article dated 23 Jun 2026. — [Docketwise Support: Docketwise IQ Smart Docs](https://supportcenter.docketwise.com/en/articles/10247778-docketwise-iq-smart-docs)
- Setup: in a Smart Form's Documents step the firm clicks Create Document Request, picks the AI Data Capture type and assigns it to a contact on the form. The request then appears under that contact's questions. Upload is by file picker or drag-and-drop, and processing starts on upload. — [Docketwise Support](https://supportcenter.docketwise.com/en/articles/10247778-docketwise-iq-smart-docs)
- Review: "Review & Edit" opens a modal listing extracted values field by field. The reviewer can edit a field or "ignore" it so it is skipped. Data is written to the contact and the Smart Form only on "Confirm & Import". Confirming an I-94 also creates a new US entry record (period of stay) on the contact, so one document can create a history row, not just fill fields. — [Docketwise Support](https://supportcenter.docketwise.com/en/articles/10247778-docketwise-iq-smart-docs)
- Docketwise markets the feature as cutting client friction by avoiding repeat questions and re-entry (vendor claim). — [Docketwise AI legal document extraction](https://docketwise.com/features/ai-legal-document-extraction)
- Docketwise Smart Forms combine many forms into one client questionnaire, which is the "client questionnaire, then agent full form" split. — [Docketwise immigration forms](https://www.docketwise.com/features/immigration-forms/)
- Visto (Toronto) offers a Chrome extension that fills IRCC web forms such as the PR Portal and Express Entry from client profiles, plus per-client document checklists and PDF merge, compress and rename tools. No source found showing that Visto reads uploaded documents to fill fields. — [Search summary of Visto materials; Canadian Lawyer 2023](https://www.canadianlawyermag.com/practice-areas/immigration/vistoai-using-chatgpt-ai-as-a-first-step-to-enhance-visa-application-process/374471); [Business Wire 2023 (older)](https://www.businesswire.com/news/home/20230228005270/en/Canadian-Immigration-Technology-Pioneer-Visto-Leverages-Artificial-Intelligence-to-Expedite-Applications-for-Student-Visas)
- VisaFlo (Canadian) says it generates IMM forms from collected client information and offers IRCC portal autofill, with wider online-form support "planned" (vendor blog). — [VisaFlo blog](https://inblog.ai/vflo/applications-manually)
- Officio (Canadian immigration practice management) lists automated form processing and AI-assisted writing. No passport OCR found. — [Techjockey: Officio](https://www.techjockey.com/detail/officio)
- Envoy Global's questionnaire lets employees upload supporting documents while filling it in, but no source says the uploads fill fields. Its AI page lists "data validation" and document generation. — [Envoy AI capabilities](https://www.envoyglobal.com/ai-technology-capabilities/); [Envoy onboarding guide PDF](https://www.envoyglobal.com/resources/PDF/Envoy-Sponsored-Employee-Onboarding-Guide.pdf)
- Boundless is questionnaire-first: answers become completed forms, and the platform guides document gathering and checks the application "for consistency and completeness". Attorney review comes in higher tiers. No document-to-field extraction is described. — [Boundless how it works](https://www.boundless.com/how_it_works); [Boundless FAQs](https://www.boundless.com/boundless-faqs)
- TurboTax W-2 photo import: the user photographs the W-2 and the app "should automatically import your information, or direct you to type it in if there's a problem". The photo itself is not kept. It is opt-in per form, with manual entry as the fallback. — [TurboTax help](https://ttlc.intuit.com/questions/2942107)
- Persona recommends the reverse order for KYC. Prefill known name and birthdate when creating the inquiry, then the Inquiry Comparison check confirms that values read from the ID match them. Without prefill, the check falls back to the user's own extracted submission, which Persona says "can be less reliable, especially if a user submits blurry or dark images". — [Persona: Inquiry comparison check](https://help.withpersona.com/articles/1qEE7AZz4NfDuCFqCBF7ZE/); [Persona: Using Inquiry Prefill](https://help.withpersona.com/articles/79Y8gi2c0QnOzDax63LfDF/); [Persona API guide](https://docs.withpersona.com/integration-guide-gov-id-via-api)
- GOV.UK guidance says to avoid uploads where possible: first ask whether the information is needed at all, or whether an API or another department can supply it. When an upload is needed, check it automatically and tell users exactly what is wrong. — [GOV.UK design notes: tips for uploading (2017, older)](https://designnotes.blog.gov.uk/2017/02/14/some-design-tips-for-uploading-things)
- The cross-government upload pattern has three steps: ask for the file, use the native file browser, then show the upload and ask the user to confirm it. It covers single files, multiple files one at a time, and several at once. It is marked "to be reviewed". — [MoJ design patterns: Upload files](https://design-patterns.service.justice.gov.uk/patterns/upload-files); [GOV.UK file upload component](https://design-system.service.gov.uk/components/file-upload)
- DWP is researching a fuller upload pattern on top of the GOV.UK component: clear expectations about file types and sizes, a button plus drag-and-drop, and multiple files. — [DWP Design System: file upload](https://design-system.dwp.gov.uk/contribute/file-upload)

### Inferences
- The leading pattern is opt-in per document request, placed inside the questionnaire section it feeds (for example, the passport request inside "Identity" for one named person), with a single confirm step before anything is written. No product found makes extraction the silent default.
- "Upload first, then answer the rest" is a choice the questionnaire designer makes per section, not a global mode. A design that offers "Do you want to fill this section from your passport?" at the start of the section matches current practice.
- For Canada, the market gap is document-to-IMM-field extraction. Competitors move profile data outward (to portals and PDFs) rather than pulling data in from documents.

### Gaps
- No public documentation found for INSZoom/Mitratech, LawLogix or Alma document-extraction user flows.
- No mortgage loan origination system (Encompass etc.), insurance claims or HR onboarding help pages were fetched, so those adjacent flows rest only on the Ocrolus and Plaid items in section 2.
- No NN/g or Baymard article on prefill-from-document was retrieved. The secondary summaries found are not cited as NN/g findings.

## 2. Order of entry and conflict handling (typed first vs document first; what wins; low confidence)

### Takeaway
Where conflict handling is documented (KYC, lending), the system compares declared data with document data and raises a flag or caution. It does not silently overwrite. A person or a rule then decides, and a mismatch is not treated as fraud by default. Docketwise's immigration flow documents only field-level edit or ignore at import and nothing about existing values. The best-practice rule "verified document wins as the proposed value, but the conflict is always shown and resolved by a named person" is an inference from these sources, not a published standard.

### Cited Findings
- Onfido (now Entrust) checks whether data on the document matches data the user entered, using first and last name. Fuzzy, Levenshtein-style matching is available but switched off by default. — [Signicat: Onfido matching](https://developer.signicat.com/docs/id-document-and-biometric-verification/services/matching/)
- In the Onfido Document report, a name mismatch gives a "Caution" result, not a fraud result. Caution applies when other checks fail "but they don't necessarily point to a fraudulent document (for example, the name provided by the applicant doesn't match the one on the document)". — [Onfido Document report](https://developers.onfido.com/guide/document-report/)
- A middle name that is on the document but not typed by the user can fail an Onfido comparison, so field-level matching needs rules for name parts. — [Signicat: Onfido matching](https://developer.signicat.com/docs/id-document-and-biometric-verification/services/matching/)
- Persona's comparison check can be "required", where a mismatch fails verification, or not required, where it is only an alert. Fields compared and match tolerances are set through Persona support. A second ID can be checked against the first. — [Persona: Configuring Inquiry Comparison](https://help.withpersona.com/articles/2zXa85BILxtncnwdIj8jge/)
- Persona's Account comparison check compares a new ID against the most recent values on a stored account record. This is a "returning person" pattern. — [Persona: Account comparison check](https://help.withpersona.com/articles/h6kxly8QuyORcWYQFeaEw/)
- Lending: Ocrolus compares extracted document data with the loan application (Form 1003) and flags discrepancies, "including mismatched names, address history gaps, and income inconsistencies". This comes from a consultant's page, not Ocrolus documentation. — [Chrisman Commentary: Ocrolus](https://www.chrismancommentary.com/services/ocrolus)
- Plaid document income (2021, older): Ocrolus extracts income from uploaded documents and Plaid verifies it by matching transactions in bank data. This is a second-source cross-check. — [Philadelphia Fed symposium slides, Ocrolus 2021](https://philadelphiafed.org/-/media/FRBP/Assets/Events/2021/Banking/ocrolus-fintech-partnership-symposium-slides.pdf)
- TurboTax places responsibility on the user: when using import, "the customer is responsible for verifying the accuracy of the information imported". Community threads show imported W-2 values that differed from the paper copy, because the employer-issued electronic copy was an updated version. The advice was to confirm with the employer which is correct, so the "document" is not always the truth. — [TurboTax community: import W-2](https://ttlc.intuit.com/community/taxes/discussion/import-w-2/00/2439261); [TurboTax community: "we found something wrong"](https://ttlc.intuit.com/community/get-your-taxes-done-using-turbotax-6/w2-we-found-something-wrong-with-your-info-22001)
- Docketwise's documented conflict control is limited to edit or ignore per field in the review modal. How it treats a value that differs from one already on the contact is not documented. — [Docketwise Support](https://supportcenter.docketwise.com/en/articles/10247778-docketwise-iq-smart-docs)
- Confidence thresholds: AWS A2I routes only predictions below a confidence threshold to people, or routes a random sample for audit. Its Textract tutorial uses a key-specific threshold of 99 and a general threshold of 90. — [AWS A2I console get started](https://docs.amazonaws.cn/en_us/sagemaker/latest/dg/a2i-get-started-console.md)
- AWS Bedrock Data Automation with SageMaker human review (Aug 2025) shows multi-page documents routed to review when field confidence is low. — [AWS ML blog](https://aws.amazon.com/blogs/machine-learning/process-multi-page-documents-with-human-review-using-amazon-bedrock-data-automation-and-amazon-sagemaker-ai)
- Thresholds per field, tiered by the cost of an error, are recommended (vendor glossary, opinion). — [Klearstack glossary](https://klearstack.com/glossary/data-extraction-confidence-score)

### Inferences
- **Typed first, document later.** Run a field-level comparison (Persona/Onfido pattern). Show typed and extracted values side by side with the document page. Keep both values until a named person, the agent and not the client, resolves the conflict. Name and date-of-birth mismatches should read as "check", not "fraud" (Onfido "Caution").
- **Document first.** Show the extracted value as proposed, not as fact. It is written to the case only on explicit confirm (Docketwise "Confirm & Import"; GOV.UK "show and confirm"). Even confirmed document values should still be checked against other documents and earlier IRCC submissions (Persona Account comparison).
- **What wins.** For identity fields (name, date of birth, passport number, dates), the current passport is the proposed source for IRCC forms because IRCC compares form data with the passport. The TurboTax case shows documents can also be wrong or out of date, so "document wins" should mean "document is proposed and the conflict is still shown", never an automatic overwrite.
- **Low confidence.** Use per-field thresholds, stricter for passport number, date of birth, names and document expiry. Below the threshold, ask the agent for a field review. Above it, still require at least a section-level confirmation. Add random-sample audits (A2I) to catch confidently wrong values.

### Gaps
- No vendor publishes a confidence number that end users see in immigration tools. Whether showing percentages helps reviewers was not found.
- No primary Ocrolus or Plaid documentation on the discrepancy flag was retrieved.

## 3. Re-upload and updates (new passport, expired document, conflicting second document, post-confirm edits, provenance, staleness)

### Takeaway
Only fragments are documented publicly. Persona compares against "most recent" account values and supports a second-ID cross-check. IRCC says a translation remains valid unless the original document changes or expires, which is a ready-made staleness rule. Docketwise shows that one document can create a history row (I-94 entries). No product documented field-level provenance (document, page, confidence, confirmer) in a way users can see.

### Cited Findings
- Persona Account comparison checks a new ID against the most recent values on the account, which requires each inquiry to carry an account reference. — [Persona: Account comparison check](https://help.withpersona.com/articles/h6kxly8QuyORcWYQFeaEw/)
- Persona Inquiry comparison flags inconsistent name or birthdate across attempts within one inquiry and can be applied to a second ID. — [Persona: Inquiry comparison check](https://help.withpersona.com/articles/1qEE7AZz4NfDuCFqCBF7ZE/)
- IRCC: "A translation remains valid indefinitely unless the original document changes or expires". If the translator's or notary's own signature later expires, the translation stays valid as long as the certification was valid when signed. — [IRCC: Translation of supporting documents](https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/standard-requirements/translation.html) (the fetch reported a "Date modified" of 2027-01-10, which is impossible on 29 Oct 2026; treat the date as unverified)
- Docketwise: confirming an I-94 adds a new period-of-stay entry to the contact, so a new document adds history rather than overwriting it. — [Docketwise Support](https://supportcenter.docketwise.com/en/articles/10247778-docketwise-iq-smart-docs)
- TurboTax: when an imported form disagrees, users delete it and re-import or enter it by hand from the W-2 review screen. There is no merge, only replace. — [TurboTax community](https://ttlc.intuit.com/community/taxes/discussion/import-w-2/00/2439261)

### Inferences
- Model documents as versions per person and type: an active passport and superseded passports. A new passport should (a) propose new values for passport-sourced fields, (b) keep old passport data where forms need history (IRCC asks for previous passports and travel), (c) mark every form, translation and checklist item built on the old values as needing review.
- Each field value should carry: source (typed by client, typed by agent, extracted), document and version, page, region, extraction confidence, who confirmed it and when. An edit after confirmation should create a new value with its own provenance, not overwrite the old one.
- Expiry is a status on the document (expired or expiring before a set date). It should drive a checklist flag, and through the IRCC rule above, the translation linked to it.

### Gaps
- No public product documentation found on automatically marking generated forms as stale after a source document changes. This is a design choice to be made, not copied.

## 4. Per-person flows for families (principal, spouse, children; reuse; parent uploading for a minor)

### Takeaway
Immigration tools assign document requests per named person on the case (Docketwise assigns each request to a contact). IRCC requires a parent or guardian to sign for under-18s (official for citizenship; a law-firm source says the same for PR dependants). This supports a "parent uploads and answers for minor, child aged 18 or over gets their own access" rule.

### Cited Findings
- A Docketwise AI Data Capture request is assigned to a specific contact on the Smart Form and appears under that contact's questions. This means one request per person per document. — [Docketwise Support](https://supportcenter.docketwise.com/en/articles/10247778-docketwise-iq-smart-docs)
- Visto builds document checklists tailored to each client. — [Canadian Lawyer 2023](https://www.canadianlawyermag.com/practice-areas/immigration/vistoai-using-chatgpt-ai-as-a-first-step-to-enhance-visa-application-process/374471)
- IRCC (citizenship online signature): "If you're under the age of 18, your parent or guardian must sign your form for you". The typed name must match the application form exactly. — [IRCC Help Centre](https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=740)
- Secondary source: in PR and sponsorship files, dependants aged 18 or over sign their own forms, and the principal applicant signs for those under 18. — [LawyerInfo guide](https://lawyerinfo.ca/guides/immigration-visas/family-sponsorship/does-a-handwritten-vs-digital-signature-matter-for-ircc-sponsorship/)
- Persona's Account comparison is a reusable per-person record, so the same ID is compared across inquiries. This is a pattern for reusing documents across cases. — [Persona: Account comparison](https://help.withpersona.com/articles/h6kxly8QuyORcWYQFeaEw/)

### Inferences
- One checklist per person, with each document owned by a person and linked to one or more cases. A returning client's valid passport can be offered for reuse, subject to the expiry check in section 3.
- For minors, the uploader (parent) and the subject (child) are different people. Provenance should record both.

### Gaps
- No source found describing how immigration tools handle a single document covering several family members, such as a marriage certificate or a birth certificate naming both parents.

## 5. Human-in-the-loop review patterns and accuracy users accept

### Takeaway
Standard practice routes by per-field confidence plus random audit sampling, with explicit confirmation before data is committed. A 2026 experiment found that reviewers of AI-extracted values accept more wrong values when correcting is effortful. So the review UI must make correcting as cheap as accepting, and should not invite rubber-stamping.

### Cited Findings
- "Bias in the Loop" (Harvard Data Science Review, 2026; 2,784 participants reviewing AI-extracted values from emissions reports): when flagging an error also required typing the corrected value, participants made fewer corrections and accepted more incorrect suggestions. People sceptical of AI found more errors, while people favourable to automation accepted more wrong values. Bonuses and early AI accuracy did not meaningfully change performance. — [HDSR: Bias in the Loop](https://hdsr.mitpress.mit.edu/pub/nrcn4h7d); [arXiv 2509.08514](https://arxiv.org/abs/2509.08514v1)
- AWS A2I: route by confidence threshold, by random sample for model audits, or both. Specific keys can have their own threshold (99 vs 90 in the example). — [AWS A2I](https://docs.amazonaws.cn/en_us/sagemaker/latest/dg/a2i-get-started-console.md); [AWS Augmented AI overview](https://aws.amazon.com/documentation-overview/augmented-ai/)
- Calibration caveat: Bedrock Data Automation claims calibrated scores, but commentary warns that high scores can accompany hallucinated or mis-mapped values, so validate against sampled ground truth (commentary, lower quality). — [Opper roundtable](https://opper.ai/ai-roundtable/questions/aws-bda-provides-confidence-scores-of-times-right-for-1ccef333)
- Docketwise uses field-level review (edit or ignore per field) followed by one commit for the document. — [Docketwise Support](https://supportcenter.docketwise.com/en/articles/10247778-docketwise-iq-smart-docs)
- Boundless runs every application through "four different reviews" for quality (vendor claim). — [Boundless FAQs](https://www.boundless.com/boundless-faqs)
- Passport-extraction vendors advertise "99%" accuracy (vendor claim, not independent). — [Docsumo passport](https://www.docsumo.com/solutions/documents/passport)

### Inferences
- Use the field-review, then document-commit pattern. Put critical identity fields always in front of the agent. Let low-risk fields batch-confirm per section when confidence is above the threshold.
- Make "correct" a single in-place edit beside the document image, and record accept vs edit vs ignore per field in the audit trail.
- Show the image crop of the source region next to each value, so the reviewer compares against the document rather than trusting the number.

### Gaps
- No published figure on the error rate users or regulators accept for immigration form data. The vendor "99%" claims are not independent.

## 6. Practitioner pitfalls (OCR over-trust, transliteration, dates, MRZ vs visual zone, multi-page, handwriting, translations)

### Takeaway
The passport's machine-readable zone (MRZ) and its printed visual zone legitimately differ, through transliteration, truncation and punctuation rules. A naive mismatch check will produce false alarms, so compare using the ICAO conversion rules first. IRCC translation rules are strict: no self, family or representative translations, and translations tied to the original or a certified copy. Extraction should therefore treat translated documents as paired items.

### Cited Findings
- ICAO 9303: the visual zone must carry a Latin-script name when the native script is not Latin. MRZ name characters are restricted to A–Z and "<". — [ICAO Doc 9303 Part 3](https://icao.int/publications/Documents/9303_p3_cons_en.pdf)
- ICAO working papers note that Arabic names have been transcribed to the MRZ under several schemes, causing mismatched names across databases. — [ICAO TAG-MRTD working paper](https://www.icao.int:443/Meetings/TAG-MRTD/Documents/Tag-Mrtd-20/TagMrtd-20_WP017_en.pdf)
- MRZ names are fixed length and may be truncated. Apostrophes are omitted (O'CONNOR becomes OCONNOR) and hyphens become filler characters (secondary summary). — [SEVIS name standards](https://studyinthestates.dhs.gov/sevis-help-hub/sevis-basics/system-data-entry-standards/name-standards); [ICAO Doc 9303 Part 3](https://icao.int/publications/Documents/9303_p3_cons_en.pdf)
- A mismatch between the visual zone and the MRZ, or a failed check digit, is a forgery signal in KYC. — [Neurovision MRZ verification](https://neurovision.ru/en/articles/passport-machine-readable-zone-verification-how-the-mrz-helps-detect-forgeries-in-kyc/)
- Vendor note: passport extraction that scores well on clean test images degrades on production passports, often because reconciling the visual zone with the MRZ is left out. — [LlamaIndex passport OCR](https://www.llamaindex.ai/blog/passport-ocr)
- A single wrong digit in a passport number can break a KYC verification. — [Klippa passport data extraction](https://www.klippa.com/en/blog/information/passport-data-extraction/)
- IRCC translations: documents not in English or French need an official translation of the original or of a certified copy. If a certified copy is used, the translator stamps both the copy and the translation. Stamps and seals must also be translated. — [IRCC translation page](https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/standard-requirements/translation.html)
- IRCC: applicants, their family members (parent, guardian, sibling, spouse, partner, grandparent, child, aunt, uncle, niece, nephew, first cousin) and their representatives or consultants may not translate, even if they are certified translators. Without a certified translator, an affidavit sworn before an authorised commissioner or notary is required. Missing translations make the application incomplete and it is returned. — [IRCC translation page](https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/standard-requirements/translation.html)
- IRCC may request a retranslation by a different translator if accuracy is doubtful. — [IRCC translation page](https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/standard-requirements/translation.html)
- Multi-page documents: AWS shows a pipeline that splits multi-page documents and sends low-confidence pages or fields to human review (2025). — [AWS ML blog](https://aws.amazon.com/blogs/machine-learning/process-multi-page-documents-with-human-review-using-amazon-bedrock-data-automation-and-amazon-sagemaker-ai)
- Imported values can legitimately differ from the paper copy because a newer version was issued (TurboTax W-2c case). — [TurboTax community](https://ttlc.intuit.com/community/taxes/discussion/import-w-2/00/2439261)

### Inferences
- Read both zones of the passport. Use the MRZ (check digits) for number, dates and sex, and the visual zone for the full Latin-script name. Flag only differences that the ICAO rules cannot explain. Keep native-script names separately if forms ask for them.
- Dates: passports and MRZ use different formats (MRZ is YYMMDD with an ambiguous century). Normalise and show the date in one unambiguous display format, such as 12 Mar 1990, at confirmation.
- For a non-English or non-French document, the data source for extraction should be the certified translation, linked to the original. The platform should block translations by the applicant, family or representative, a rule stated directly by IRCC. Treat the translation as stale when its original is replaced or expires.
- Handwritten documents and civil records from abroad should default to field-level agent review, never section-level batch confirmation.

### Gaps
- No quantitative source found on OCR error rates for handwriting or non-Latin civil documents in immigration contexts.
- Legal points on translations and signatures: Unconfirmed: no counsel. Program-specific IRCC checklists were not checked.

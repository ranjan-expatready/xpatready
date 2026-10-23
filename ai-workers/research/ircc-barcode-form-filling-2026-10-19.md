# How others fill IRCC barcode (XFA) forms, and what can go wrong

19 October 2026 · research by a delegated research agent for the Lead (Claude Code), web sources only; checked against our own Adobe test the same day (`problem-1-pathway-setup-and-form-filling/prototype/p1/p1-report-2026-10-19.md` §4). **Revised 19 Oct (P1 revision 3):** general statements narrowed to the sources inspected; barcode result restated by position. Labels: **[O]** Official (IRCC, Adobe) · **[VD]** Vendor documentation · **[VC]** Vendor claim · **[U]** User report · **[?]** Unknown or low quality. Legal: Unconfirmed: no counsel (AIW-D94).

## 1. How vendors do it

| Vendor | What they do | Label |
|---|---|---|
| INSZoom (Mitratech) | Data checked in INSZoom → PDF downloaded → opened in Adobe Reader 10+ → Validate → barcodes appear. Telephone and alternate telephone must be re-entered by hand "due to technical constraints"; edits in the PDF do not sync back; 8 forms supported. [Help article](https://success.mitratech.com/INSZoom/Help_Articles/Case%2F%2FMatter_Module/Canada_Barcode_Forms) | VD |
| CaseEasy (4 Dec 2025) | Maps each PDF field to its questionnaire; tests each form in Adobe and by uploading to IRCC. The user opens the file in Adobe and holds TAB through every field "to trigger the PDF's internal logic", then Validate; skipping it "can sometimes cause IRCC to reject the upload". [Article](https://support.caseeasy.ca/en/articles/12988132-ircc-pdf-autofill-behind-the-scenes) | VD |
| Visto | "Fills every single PDF required by IRCC"; its Chrome extension fills web portals, not PDFs; Validate not described. [visto.ai](https://visto.ai/) | VC |
| VisaFlo | "Autofills all major IMM PDFs", "review-ready PDFs"; Validate not mentioned; also portal autofill. [visaflo.ca/autofill](https://visaflo.ca/autofill) | VC |
| Officio, ImmiCRM, Immigration Tracker, Avalon, Cerenade, Docketwise, Clio | No public method found | ? |

**Pattern, within the sources inspected:** the vendors whose method is documented here (INSZoom, CaseEasy) fill the data, then a person validates in Adobe; the others make claims without a method, or none was found. None of these sources documents its own viewer or server-side barcode creation (research agent's inference; a vendor may do more than it publishes).

## 2. Known failure modes

| Problem | Cause and source |
|---|---|
| "Please wait…" or blank page | Browser, Preview or Microsoft viewers cannot render XFA; open in Adobe Reader 10+ [O, IRCC qnum 660](https://www.ircc.canada.ca/english/helpcentre/answer.asp?qnum=660), [CICNews 2024](https://www.cicnews.com/2024/05/six-common-issues-with-ircc-applications-and-how-to-fix-them-0544161.html) |
| Version | IRCC still recommends Reader 11.0.09 for IMM 0008, 1344, 5669 [O, qnum 660]; "Bad Encrypt Dictionary" = Reader 7 or older [O, qnum 766](https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=766&top=23) |
| Validate does nothing / no barcodes | Old Reader, mobile, empty mandatory field, wrong date format or conflicting dates, **special characters or a stray space**, JavaScript off, **Reader DC on Mac**; after changing settings, download a fresh form and re-enter [O, qnum 767](https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=767&top=23) |
| Missing barcodes, unresolved | IMM 5257 SCH1 reports 2024–2025 [U, Adobe community](https://community.adobe.com/t5/acrobat-discussions/barcode-does-not-show-in-government-ircc-form/m-p/15415212); Mac/DC differences 2015–2018 [U](https://pvtistes.net/forum/la-demande-de-pvt-canada/170914-code-barre-non-genere-sur-formulaire-imm-5257-sch1.html) |
| Portal upload rejected | "Validation error: You have not completed the mandatory fields…"; the **portal reads the PDF's data and compares it with the online questionnaire**, including the UCI; no scanned copies [O, qnum 1312](https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=1312&top=23); outdated edition rejected; never "Save As / Print to PDF" [U](https://go4visa.com/2024/07/19/common-pdf-uploading-issues-imm5710-imm5709-imm5257-application-form-in-ircc-portal/) |
| "Extended features … has been changed" | Usage-rights signature broken by a non-append save (Foxit, Google Drive) [U/VD, BFO](https://bfo.com/blog/2012/06/05/reader_extensions_and_why_they_break/), [iText KB](https://kb.itextpdf.com/itext/why-do-i-get-an-error-saying-that-use-of-extended-) |
| "Uniqueness" / one-time validation | **No official source found.** The barcode is "unique" only in the sense that it holds this application's data. Sites making stronger claims (ircc.com, visavio.ca) are unreliable [?] |

## 3. What IRCC requires

- "You must always click the Validate button on 2D barcode forms, **whether you submit your application online or by mail**." Online: do not print, save, then upload. Paper: print including the barcode page, then sign [O, qnum 1523](https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=1523&top=4).
- The barcodes carry "all of the data entered" for IRCC's case system, per a 2012 bulletin [O, 2012 bulletin](https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/bulletins-2012/325b-february-6-2012.html).
- Our test qualifies the bulletin for IMM 1295 (09-2023): the form's own barcode manifests omit some answers, for example the Question 2 A yes/no and background Question 6, which stay only in the saved form data (P1 report §4).
- In the IRCC pages inspected (qnum 660, 766, 767, 1312, 1523 and the 2012 bulletin), nothing addresses third-party software filling the forms; other IRCC guidance was not searched exhaustively.

## 4. Adobe-native alternatives

| Option | Finding |
|---|---|
| Acrobat Pro `importXFAData()` (Action Wizard, folder script) | Forum guidance only; reports of reset variables and of it stopping working in 2023 [U](https://community.adobe.com/questions-18/importxfadata-stopped-working-with-acrobat-pro-dc-609815) |
| Adobe PDF Services API | "Dynamic XFA format is not supported" [O](https://developer.adobe.com/document-services/docs/overview/pdf-services-api/howtos/import-pdf-form-data/) |
| AEM Forms | Merges XML into an XFA template on a server [O](https://experienceleague.adobe.com/en/docs/experience-manager-learn/forms/document-services/render-interactive-form-using-api); a re-render would produce a new PDF and lose IRCC's own certification (inference, untested); enterprise pricing |

## 5. Libraries that write the data

| Library | Finding |
|---|---|
| iText 7 | Knowledge base shows our exact method: append mode + `fillXfaForm()`, "Reader enabling will be preserved" [VD](https://kb.itextpdf.com/itext/how-to-fill-xfa-form-using-itext-without-breaking-). pdfXFA add-on flattens: unsuitable |
| Aspose.PDF | Only incremental save keeps rights; user reports of lost rights with dynamic XFA [U/VD](https://forum.aspose.com/t/extended-rights-still-not-preserving/226423) |
| Apryse | "Very limited support for XFA" [VD](https://docs.apryse.com/dotnetcore/faq/xfa-lifecycle-support/) |
| Foxit SDK | XFA add-on with data import [VD](https://developers.foxit.com/add-ons/xfa-forms/); usage-rights preservation not documented |

None of the vendor or library sources inspected documents certification, usage rights and dynamic XFA surviving together; here the only evidence is our own test (P1 §4: one Mac, one Adobe version line, two forms).

## 6. Risks to test, and status after our Adobe test (19 Oct)

| # | Risk | Status |
|---|---|---|
| 1 | Field logic that runs only on user events (CaseEasy's TAB; INSZoom's phone) | **Tested on IMM 1295 (revision 3, by position):** all 186 barcode slots match the data Adobe saved (180 exact, 6 months without the leading zero); the calculated phone +919800000000 and the split dates come from the form's own rules; one value cleared by the form's rule (correct); two answers are not in any barcode. Other forms not yet decoded |
| 2 | Portal acceptance (data compared with the online questionnaire) | **Not testable here**: needs a practitioner with an IRCC account; the sources inspected document no test-account route |
| 3 | Stray spaces or special characters | Not yet run: add a negative-test set |
| 4 | Mac | Tested on macOS with Acrobat 26.002.22031 (free mode): Validate and barcodes worked; barcode records "Full.MAC". Windows and Reader 11.0.10 not tested |
| 5 | Forms needing Reader 11.0.09 (IMM 0008, 1344, 5669) | Not in combinations 1–2; not tested |
| 6 | Signatures after the user saves | **Tested:** after Adobe's save, IRCC's DocMDP and UR3 signatures still verify; validated flag "Yes" |
| 7 | Edition drift | Design: check edition before filling (manifest hash); not yet automated |
| 8 | Opened in the wrong viewer, then saved | Not yet run |

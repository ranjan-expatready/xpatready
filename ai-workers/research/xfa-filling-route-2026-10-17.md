# Filling IRCC barcode (XFA) forms without breaking the barcode

Version 1.0 (corrected 17 Oct: Reader 11.0.09 is required, not recommended, per the checker) · 17 Oct 2026 · Lead (Claude Code). The founder asked: "I want the PDF to be just typed as a human would have typed, and validation would be done by the human only. Is there any mechanism to do that without breaking the barcodes?" **Answer: yes.** It is a known technique, and at least one commercial product publishes this exact flow. Evidence labels: **[V]** verified from a primary or vendor-documentation source; **[VC]** vendor claim; **[A]** Lead assessment.

## 1. What the barcode is

- IRCC's barcode forms carry a **Validate** button. A person clicks it, the form checks the formats, and the form itself then generates the 2D barcodes. IRCC: forms needing the button "use special encoding"; Adobe Reader 10 or higher is required, and IMM 0008, IMM 1344 and IMM 5669 need Acrobat Reader 11.0.09: "you need to use version 11.0.09 of Acrobat Reader to fill it out" [V] ([IRCC help centre](https://www.ircc.canada.ca/english/helpcentre/answer.asp?qnum=660)).
- **We never create a barcode.** The form creates it when a person validates. This matches the team's SA1B-D16: "The platform produces values, never a submission-ready barcode." [V]
- Validation fails on missing mandatory fields, dates not in YYYY-MM-DD, or special characters [V] ([CIC News, 2024](https://www.cicnews.com/2024/05/six-common-issues-with-ircc-applications-and-how-to-fix-them-0544161.html)). Our published checks must apply the same formats before handing over the form.

## 2. Who already does it

| Product | What is public | Label |
|---|---|---|
| INSZoom (Mitratech) | The form is completed in the software and downloaded. The user opens it in Adobe Reader 10+, clicks Validate, and "the barcodes appear on the last page". Limits: some fields (telephone numbers) may need manual re-entry; eight form editions supported; edits to the PDF don't flow back. ([help article](https://success.mitratech.com/INSZoom/Help_Articles/Case%2F%2FMatter_Module/Canada_Barcode_Forms)) | [V] vendor documentation |
| Visto | Advertises selected-PDF filling and a Chrome extension for the portals; the method for barcode PDFs is not disclosed | [VC] |

## 3. The routes

| Route | How it works | Barcode safe? | Effort and risk | Verdict |
|---|---|---|---|---|
| **R1. Write the form's own data** | Put the confirmed values into the form's data section (the XFA "datasets"), leave the form's template and scripts untouched, and save as an append-only update so Adobe's usage-rights signature stays valid. The person opens it in Adobe Reader, checks it and clicks Validate. | Yes. The form's own script makes the barcode | Medium. A known library technique (iText `fillXfaForm` in append mode) [V] ([iText knowledge base](https://kb.itextpdf.com/it5kb/how-to-fill-xfa-form-using-itext-without-breaking-)). Must be tested on every edition; some fields may refuse values, as INSZoom reports | **Chosen (AIW-D211)** |
| R2. Data file the person imports | Generate an XML data file; the person opens the blank form in Adobe Reader and uses Import Data, then Validate | Yes | Low build, one extra step for the person; also proves the data is right when R1 fails [V] (iText thread reports Import Data works) | **Fallback** |
| R3. Type into Adobe Reader by automation | A desktop robot types each box, like a person | Yes | High: slow, breaks with screen or version changes, needs a desktop agent | Not chosen |
| R4. Flattened overlay | Print values over a flat copy of the form | **No.** A flattened copy has no Validate button and no barcode | Low, but unusable for barcode forms | Rejected (it was FD-5's earlier idea) |

## 4. What the team must build and prove [A]

1. An XFA filling adapter beside today's standard-PDF filler. Today's filler and box inventory both refuse XFA (`pdf-form.adapter.ts`, `pdf-acroform-inventory.ts`).
2. A box inventory for XFA editions, read from the form's template, so connections can be generated as for standard PDFs.
3. A test per form edition: fill, open in the recommended Adobe Reader, Validate, and confirm the barcodes appear and match. Keep a list of fields that must be typed by hand, if any, as INSZoom does.
4. The agent's step: open, check, Validate, save, upload. A licensed person still signs and submits.

## 5. What changes on the page

"Route open", "refused" and "the biggest open question" are replaced by: **the route is decided (AIW-D211); the team builds and tests it.** The risk moves from "no route" to "build and test on each edition".

## Change log

- 17 Oct 2026: first version, at the founder's request.

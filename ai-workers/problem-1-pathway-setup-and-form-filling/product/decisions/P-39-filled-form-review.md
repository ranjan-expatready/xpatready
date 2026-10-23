# P-39 — Agent view, filled forms and validation (revised 21 Oct, P-45)

Founder's model (R-47, R-50). Supersedes the first P-39 design (box inspector, "this form only", in-product validation).

## One place for facts, edited anywhere
* **Agent view** (case, case officer): every fact once, section by section, per person; PQR questions marked "Pre-qualification"; each section shows its check status; each fact shows its source and which form boxes it fills.
* **Edit anywhere, updates everywhere.** A change in the agent view, or typed straight into a box of any form, changes the one fact; every form and the agent view update; a message says exactly what changed and where ("Date of marriage updated in 4 places: …") with Undo. No per-form overrides; form-specific formats live in the box map, never with the officer.
* **Dynamic document checklist** beside the agent view: built from the answers; an answer change adds or removes documents with the reason ("Because: previously married = Yes"); upload per item; AI reads uploads and proposes facts; the officer confirms.

## The forms (safe path, P-46)
* Click a form: ExpatReady shows the filled IRCC form (its own rendering). **The PDF file is only ever written by the server's proven writer and by Adobe Reader, never by a browser viewer** (P1 E5/E10: data written append-only, original bytes and IRCC signatures kept).
* **Check this form**: ExpatReady's checks (the same rules as the form's Validate: required, formats, conditions) show their messages on the form; fix there or in the agent view; run again.
* **Independent review** (side panel): AI checks data entry, documents against answers and consistency across forms, by a different method; never changes data; run as often as wanted; every run kept with its result; issues flag the box.
* **Validate with IRCC's barcodes**: download → open in Adobe Reader → Validate → save → upload back. ExpatReady reads the copy back, decodes the barcodes and compares every value with the facts by position (P1 E11 method: 180/186 exact on IMM 1295, 6 known month formats); anything changed in Adobe updates the facts and other forms, with a message.
* **Ready to file** = form checks pass, latest review clean, validated copy read back with 0 unexplained differences.
* **Acceptance per form edition** (03b demo run): fill → Adobe Validate → barcode decode-and-compare. Proven so far on IMM 1295 only (one Mac, one Adobe line); IMM 0008, 1344 and 5669 are the forms IRCC ties to Reader 11.0.09, so test them first.

## Optional later: Validate inside the browser (spike S-1)
Not on the critical path. Only if a web viewer can render IRCC dynamic XFA, run its Validate script and save a file that still validates in Adobe with identical barcodes; tried on copies only, never on client files.

## Super Admin side
The combination's "Sample filled forms" list shows each form filled from the sample family with mapped / unmapped boxes, to check the mapping before release. No validation there.

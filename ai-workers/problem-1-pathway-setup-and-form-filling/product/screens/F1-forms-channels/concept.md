# F1 — Forms channels (Milestone 2 backend + Forms library parts) · Lead concept, 23 Oct

**Job:** make PDF and online forms two channels of one form, both mapped to the same shared fields, so every combination can be PDF only, online only, mixed, or online with signed PDFs. Decisions: `decisions/P-61-online-forms.md`, `decisions/P-62-setup-model.md`, P-63 (words).

## What gets built (needed for the proof)
1. **Data:** online version of a form (portal, screens in order, captured date, source file); portal list; each form line's channel (PDF upload · Online · Signed PDF upload) and signature method; combination filing method derived from its lines; answer-list option map per channel. Migrations keep existing records.
2. **Intake for online sources:** a saved portal page (web page file) is read by code into screens and inputs (label, type, options, element id); IRCC instructions are kept as sources. Same identity and hold rules as PDFs (checksum, held until approved, P-57).
3. **Screen map drafting:** reuse the PDF twin's field map first (no AI); AI matches only leftovers through the repaired guarded path; a person accepts. Online-only forms draft like PDFs.
4. **Validator checks (no AI):** every form field and online input mapped or "not a fact"; every option mapped in every channel; online version within its re-check date.
5. **Words (P-63):** "box" → "form field", "box map" → "field map" on every screen and message.
6. **Screen 01 hooks only:** the row and combination page show each form's channel; the Forms library shows both channels. (Full UI for review lives in Screens 02–04, screens lane.)

## Not built here
Portal sheet, Prepare application view, extension capture-and-fill proof (Milestone 3) · logging into portals · scraping · unattended filling.

## Ownership (to confirm in the challenge)
This lane owns the form ingestion and drafting backend (intake, sources, AI drafting, `prototype/p2/`, form contracts and form models). The screens lane owns the pages. A change to the other lane's files is proposed in the block, not made.

## Tests
Each rule: one pass and one fail. Spousal sponsorship (mixed) and Express Entry (online only) as the sample proofs; a saved portal page fixture with a three-part date and a dropdown whose codes differ from the PDF's.

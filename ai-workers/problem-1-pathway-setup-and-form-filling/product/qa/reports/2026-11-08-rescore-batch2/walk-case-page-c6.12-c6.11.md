# Screen read, 8 Nov 2026, 08:48–08:52 IST (qa lane; browser pane; copy qa_c612w :4472; product code main 152759210; US$0)

**Setup, not under test (P-33):** Reset, then Load the configured checkpoint (both 201). A Visitor visa family case was opened by the pack helper `openCase(vv, FAMILY)` (`scripts/c612_case.mts`): case 404ef223, "Sample Client A" with a spouse and two children, on Release 6, represented by Representative (Sample) · CICC R000000.

**Acting as:** Case officer · Sample firm (the "Acting as (simulated)" selector). The pane was hidden, so the page was read as text (`get_page_text`, and the page's own text through the inspector). No screenshot.

## C6.12-25: filings and fees on the case page
The page text, word for word:
* "Visitor visa: Sample Client A · Visitor visa fee CAD 100 · CAD 100 for Sample Client A. · Biometrics fee CAD 170 · Family maximum CAD 170 for the 3 people applying together, paid on this filing."
* "Visitor visa: Sample Spouse A · Visitor visa fee CAD 100 … Biometrics fee CAD 0 · Covered by the family maximum, paid by Sample Client A on Sample Client A's filing."
* "Visitor visa: Sample Child A1 · Visitor visa fee CAD 100 … Biometrics fee CAD 0 · Under 14: no biometrics (When to give biometrics: temporary residents: "a child under the age of 14; an applicant over the age of 79")."
* "Visitor visa: Sample Child A2 · … Biometrics fee CAD 0 · Covered by the family maximum …"
* "Visitor visa fee: CAD 400 · Per person, with a family maximum of CAD 500 from 5 people applying together · 4 × CAD 100 = CAD 400 …"
* "Biometrics fee: CAD 170 · … 3 people applying together: the family maximum CAD 170 applies instead of 3 × CAD 85 = CAD 255."
* "Total for this submission: CAD 570 · Sources: IRCC fee list (read 2026-11-02) … Sample until the immigration expert confirms (P-171). … Paying is not built."

These are the figures C6.12-25 asks for (visitor visa CAD 100 each, biometrics CAD 170 for the family).

## C11.6 on the same page (read only, nothing changed)
Per person and form: "IMM 5476 · Channel: PDF upload · Signature: Signed by hand and scanned · IRCC accepts: PDF upload · Change channel · The combination's default." and "IMM 5257 · Channel: Online · … IRCC accepts: Online · PDF upload · Paper". The portal line reads "Filed through APR Portal: set by the combination, not on the case".

## C6.11 / QA-296, QA-299, QA-300: IMM 5476 to the print step
* **IMM 5476 for Sample Client A:** "Checked copy, not for filing · 8 facts to answer or confirm before filing". The list (opened) holds the family name, given names, date of birth (not confirmed), UCI, the IRCC office, the type of temporary residence application, appoint or cancel, and the "Personal details" entries. **None is about the representative** (on 7 Nov the same item waited for 17 representative facts).
* **"Generate a copy"** pressed for IMM 5476 (POST …/forms/IMM%205476/…/generate → 202). The copy's XFA data (`walk-imm5476-copy-152759210.txt`) holds:
  * SectionB: the representative's name, `compensated` = 1;
  * `questionII.ICCRCMember` = R000000, the only membership box filled;
  * question 7: the firm, its address, phone and e-mail.
* Sign and scan block, word for word: "1. Printed: next · Generate a copy of IMM 5476 above first: the copy printed is named here." Printed, signed and uploaded were walked on 8 Nov for C8.1 (J-B3, `2026-11-08-m3-rescore/walk.md`); they were not walked again here.

**Not walked:**
* IMM 5475 (by check only);
* the client's own view;
* a reassign and re-print;
* an Adobe render;
* 400 or 1440 px;
* axe.

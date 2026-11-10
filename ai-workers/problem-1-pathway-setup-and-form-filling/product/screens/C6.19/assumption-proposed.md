# C6.19 — proposed ASSUMPTIONS.md row (for the tech lead to add; builders do not edit ASSUMPTIONS.md)

The Sample values C6.19 uses, in the table's shape (next free id after C10 on main, 9 Nov):

| ID | Assumption | Basis | Confidence | Risk if wrong |
|---|---|---|---|---|
| C11 | Expiry rules for facts brought from an earlier case (C6.19 BR-6, `prototype/studio/samples/fact-expiry-rules.json`): a police certificate issued more than 6 months ago cannot be reused; the two passport rules quoted from the Visitor visa page (valid, not expired; valid at least 6 months from travel) also run on other combinations, labelled "Sample on this combination" | Sample: no canada.ca page stating a police certificate's age limit is committed (the Express Entry police certificates page appears only as a search summary in `research_notes/Document first intake and OCR choice/ircc_document_fact_map.md` l.179); the passport quotes are word for word from `official-sources/ircc/canada/pages/visit-canada-apply-visitor-visa.html` (recorded 27 Oct 2026), a Visitor visa page. canada.ca not reachable from the cloud session on 9 Nov. Unconfirmed: expert | 60 | Medium: a reusable value refused, or an old certificate reused on a program with another limit; the police certificate fact is not in the library yet, so the rule shows on no demo case |

# C7.2 evidence — the app's own IMM 5257 against E1's Adobe pass (2 Nov 2026, Mac, evidence lane)

Sample facts only (made up; never submit). Immigration values are Sample; legal: Unconfirmed: no counsel. US$0, no model call.

## What was run
* Isolated copy `c72` on :4425 (never the :4400 demo): `setup_visitor_visa.ts` released Visitor visa (`vv.single`) release 1.
* `make_case.ts` opened a case for the Sample family (`client-a-family`: Client A as principal, the partner for the spouse boxes), answered and confirmed every fact IMM 5257 reads, and generated the copy through `api/src/fill.ts` → `prototype/p5/fill.py`. Facts the family record lacks (passport, visit, sex, place of birth) are added in the script, Sample too.
* Compared with E1's passing run (`prototype/evidence-lane/E1/imm5257/STATUS.md`, 23 Oct: Validate passed first press, 5/5 barcodes, 186/186 slots). Result: `app-path-check.json`.

## Result
| Check | App copy (today) | E1 run (23 Oct) |
|---|---|---|
| Written, read back equal | 64 / 64 | 67 / 67 |
| Original bytes kept, nothing else changed, poppler errors | yes, 0 changed, 0 | yes, 0 changed, 0 |
| DocMDP and UR3 signatures | verified | verified |
| **Mandatory fields filled (of 46)** | **32** | 46 (45 at the inventory's path; consent sits at `Signature.Consent0` in E1's values) |
| Adobe Validate | **not run** (Acrobat access declined in this session) | "Validation completed successfully." |
| Barcodes decoded vs facts | not run (no barcode page without Validate) | 5/5, 186/186 slots |

**Verdict: the app path writes a sound file (same writer, signatures intact) but not a complete one.** 19 boxes E1 filled are empty in the app's copy, 14 of them mandatory, so Validate would stop on missing fields; E1 proves the writer and the form accept all of them.

## Why the 19 boxes are empty (from the copy's own result; `app-path-check.json` lists each)
1. **Transform not in the filler's executable set (7 boxes, marked "by hand"):** `phone_part:country_code`, `phone_part:international_number_without_plus`, `derived:country code … is not 1` (phone: 3 boxes); `number_as_text` (funds); `address_single_line` (address in Canada); `derived:… equals …` (same country as residence, same as mailing address). The release maps them; the executable set in `prototype/p5/transforms.ts` (`runTransform`, called by `fill.ts`) does not run them.
2. **Month-and-year dates not split (2 boxes):** the current job's start `2021-06` → "not a full date"; the history asks month precision, `p5/transforms.ts` wants a full date for `date_part` (the questionnaire takes YYYY-MM, `engine/runtime/case.ts`). All twelve date boxes of the three job rows have the same cause.
3. **Yes/No switches derived from "nothing recorded" never written (5 boxes):** other names used, lived elsewhere in 5 years, national identity document, US card, post-secondary education. They are "not written" when the fact is empty or "none apply", though the form needs "N". The national identity switch has its own reason: "collected from a document, but no supported document type supplies it" (a document-source gap).
4. **Published as "not a fact" (5 boxes):** the release map holds them with no fact mapped (`outcome: not_a_fact`, set by a person): Taiwan PIN, Israel passport, background question 1a (tuberculosis contact), background question 6 (witnessed or took part in ill-treatment; its internal name is `GovPosition`), research-contact consent. The Sample family holds an answer for one of them (`person.tb_history_or_contact`); its `person.has_held_government_position` is a different question with no box on this IMM 5257.

## Product finding
* The questionnaire requires an end month on every job row (`person.employment_to_date` is required, and `readiness()` in `engine/runtime/forms.ts` checks a required fact on every row: "not answered"), so a current job cannot be left open; the form says to leave it empty. `make_case.ts` ends the current row in this month (the date is not written to the form today anyway: cause 2).

## Still open from E1 (not tested by either run)
Long values, accents, a "yes" background answer (V3), a Canada/US phone number (finding F1), reopening the saved file, Windows, Reader 11.0.10, portal upload.

## To finish C7.2 (J6.4 steps 4–9)
After causes 1–4 are fixed (runtime/forms rows), re-run `make_case.ts`, open the copy in Adobe Acrobat Reader on the Mac, Validate once, save, decode with `p1/decode_barcodes.py`, compare with `E1/tools/barcode_compare.py` and `values.json` (written by `make_case.ts` from the copy's request file), and write `result.json` for `acceptance/C7.2.test.ts` part 2.

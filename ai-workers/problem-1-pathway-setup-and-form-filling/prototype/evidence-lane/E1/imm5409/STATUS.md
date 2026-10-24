# IMM 5409 (01-2023) — E1b status (team trial list 3/4), 24 Oct 2026

Sample facts only (made up; never submit). Immigration values are Sample; legal: Unconfirmed: no counsel.

## Verdict
**The product's part passes. Validate needs one person step: the oath details.** Every value we write (both declarants, the place, 11 continuous years from 2015-06-01 to 2026-10-24, the Yes/No evidence answers, the names in the declaration) shows in its box, and the form's Validate accepts all of it. Validate also requires the block filled in at the oath (place declared, the administrator's name and title, day, month, year). With Sample values typed there, as the notary or commissioner would, Validate passed silently (its pass). All 18 written values were unchanged after Adobe's save, and the Reader-rights signature (UR3) verifies. No barcodes on this form.

**New finding F5:** this is a *static* form, so its page fields hold the visible values. Our writer fills only the form data. The as-written file therefore shows **empty** in any viewer that doesn't run the form's XFA (Preview, browsers, possibly an upload checker) until it is opened and saved in Adobe. Adobe's save filled all 26 page fields. IMM 5476 (next) is the other static form; the dynamic forms (1295, 1344, 0008, 5257, 5707) render only in Adobe anyway.

## Before Adobe
| Step | Result | Evidence |
|---|---|---|
| Edition | `official-sources/ircc/forms/imm5409e.pdf`, SHA-256 b9ad80be…e0b3; static XFA (58 page fields), signed for Reader rights (UR3) only; 0 fields marked mandatory; P1's inventory | `p1/inventory/imm5409e.inventory.json` |
| Sample values | 18 values: Client A and common-law partner EXAMPLEP PARTNER (combination 1, as on IMM 1295 and 5707), New Delhi, together since 2015-06-01. Joint lease Yes, joint other property No, joint accounts Yes, declared under the Canadian Income Tax Act No, life insurance No/No; names repeated in the declaration | `make_values.py` → `values.complete.json` |
| Not written | Both signatures and everything done at the oath (place declared, administrator's name, title, date and signature) | — |
| Writer check | PASS: 18 of 18 read back, original bytes kept, nothing else changed, UR3 verifies, poppler 0 | `runs/complete-v1.fill-report.json` |

## Adobe (Acrobat 26.002.22031, free Reader mode, macOS, computer use)
| # | What happened | Evidence (`evidence/`) |
|---|---|---|
| 1 | Opened: every written value in its box and every Yes/No tick shown. The page has Save, Reset Form, Print Form and **Validate** buttons. P1's inventory doesn't list them because they sit in the page header | `imm5409e-v1-opened.jpg` |
| 2 | First Validate press: every Acrobat tab closed (the document, plus the three earlier forms, all already saved), no message, file unchanged. The background click carries the Command key; most likely the cause, not reproduced | — |
| 3 | Reopened; Validate: "SOLEMN DECLARATION — Declared before me at (City, Town, Village) must have a value". The template's `fieldsToCheck` covers every declarant field (all passed) and the oath block (Section5 City, AdminDecl, Province, Country, Day, Month, Year, Title); it doesn't check signatures | `imm5409e-v1-validate-1-declared-before-me.jpg`, `…-section5-empty.jpg` |
| 4 | **Person step (the oath):** typed NEW DELHI / SAMPLE NOTARY / DELHI / INDIA / 24 / OCTOBER / 2026 and ticked Notary Public | `imm5409e-v1-section5-oath-entered.jpg` |
| 5 | Validate: no message, which is this form's pass (the same script complained a step earlier) | — |
| 6 | Saved with File > Save in place | `imm5409e.complete-v1.adobe.pdf` (SHA-256 fc58f16e…dc28, 1,498,178 bytes) |

## After the save (`evidence/imm5409e-v1-saved-readback.json`)
| Check | Result |
|---|---|
| Written values | **18 of 18 unchanged** |
| Entered in Adobe | the 8 oath values, as typed |
| Signature | UR3 **verifies**, same byte range; official bytes kept as the prefix |
| poppler | 0 syntax errors |
| Page fields (what non-XFA viewers show) | as-written: **0** real values (7 unticked boxes at their "/Off" default); after Adobe's save: 26 filled |

## Findings for the forms lane (proposals via the Lead)
* **F5 Static forms need their page fields filled too.** On IMM 5409 (and IMM 5476), writing only the form data leaves the visible page fields empty outside Adobe. Either the writer also sets the page-field values (with their appearances), or the product treats "opened and saved in Adobe" as a required step before the file is shared. Check how the upload portal reads these forms.
* **F6 Oath details are part of Validate on IMM 5409.** Validate can't pass until the place, the administrator and the date of the solemn declaration are typed. The product should leave them to the oath (person step), like signatures (F2). Expert question: may the representative pre-fill the place and date before the appointment? *Unconfirmed: no counsel.*

## Note
No isolated app copies were started in this stage (Adobe only), so there were none to stop.

## Next
IMM 5476 (trial list 4/4, static form: F5 applies).

# IMM 5707 (01-2023) — E1b status (team trial list 2/4), 24 Oct 2026

Sample facts only (made up; never submit). Immigration values are Sample; legal: Unconfirmed: no counsel.

## Verdict
**Passes from the product's file alone, with zero person steps, and repeats P1.** This form makes no barcodes, so the check is fill → Validate → save → read back. P1's 39 family values went through today's writer, and every value showed in its box, including the child row the writer adds. The form's own Validate gave no message; its script speaks only when a person's row is partly filled, so silence is its pass. All 39 values were unchanged after Adobe's save, and the form's one signature (UR3) still verifies.

## Inputs (unchanged from P1)
| Item | Value |
|---|---|
| Official form | `official-sources/ircc/forms/imm5707e.pdf`, SHA-256 6e59d350…20ef (the same file as P1's `adobe-test/imm5707e.original-copy.pdf`); 0 mandatory fields, no barcodes; signed for Reader rights (UR3) only, so no IRCC certification banner |
| Values | `values.family.json` = `p1/e5-family-values.json` → `imm5707e` (39 values: Client A, partner EXAMPLEP, Parent 1 EXAMPLE MOTHER, Parent 2 EXAMPLE FATHER, one child; its hash is recorded in the file) |
| Writer check | PASS: 39 of 39 read back, original bytes kept, nothing else changed, UR3 verifies, poppler 0 (`runs/family-v1.fill-report.json`) |

## Adobe (Acrobat 26.002.22031, free Reader mode, macOS, computer use)
| # | What happened | Evidence (`evidence/`) |
|---|---|---|
| 1 | Opened: every value in its box. Marital statuses show as labels (Common-law, Married, Single). The spouse block is shown by the form's own condition. The added child row (Daughter, EXAMPLE CHILD, 2017-01-20, Student) is followed by the form's 3 empty default rows | `imm5707e-v1-opened-page1.jpg`, `…-after-validate-page1.jpg`, `…-page2-children.jpg` |
| 2 | The form's Validate button: no message. Template: `validEntry.validateFields()` warns only for a partly filled person row ("Personal Information"); fully empty rows are skipped, except the applicant's | — |
| 3 | Section C (certification) and the "no spouse" / "no children" notes are lines signed by hand on the printout, not form fields | `imm5707e-v1-page3-certification.jpg` |
| 4 | Saved with File > Save in place | `imm5707e.family-v1.adobe.pdf` (SHA-256 6d1fcfa2…2442, 2,366,439 bytes) |

## After the save (`evidence/imm5707e-v1-saved-readback.json`)
| Check | Result |
|---|---|
| Written values | **39 of 39 unchanged** (before and after the save) |
| Signature | UR3 **verifies**, same byte range as the official file |
| Bytes | Adobe rewrote the file from byte 1,931,738; the signed range ends at 1,931,678, so every signed byte is kept. Neither the official file nor the as-written file is a prefix of the saved file (the certified forms kept the official prefix) |
| poppler | 0 syntax errors |

## Note for the Lead
The mother's Sample birth date here is 1962-06-15 (P1's family values), while IMM 5257 used 1962-07-08 from `expected/combination-2.json`. This was flagged on IMM 5257 and is still open.

## Next
IMM 5409 (trial list 3/4), then 5476.

# C3.1 field formats (P-162): build notes

**What it is.** Each shared field's format is read from the official forms that ask it and enforced by a fixed set of checks in code.
* **Reader:** `prototype/p1/xfa_formats.py` reads each XFA form's box `maxChars`, its picture clauses and the validation function its own script calls. The form's own error message is kept as the quote. The output is `prototype/p1/inventory/<form>.formats.json` (10 forms, checksums equal to the inventories).
* **Checks:** `engine/field-format.ts`, `FORMAT_CHECKS`, 20 checks.
  * Each form function maps to one check (`checkForFunction`).
  * A function with no check is listed as "not checked on answers here", with why.
  * So is a rule on a piece the stored answer does not have: the phone's area code, exchange and line number, which the form splits out.
  * So is a rule on a whole address or phone written as one line, or a rule comparing two dates of the form.
* **Enforced:** `engine/runtime/case.ts` `checkValue` runs the type check, then `checkFormat`.
* **Shown:**
  * The Fields list has a "Format:" line under each field's meaning.
  * Each field page has a Format panel.
  * API: `GET /library/fields/:key/format`, `POST …/format-check` (needs a known person).

**Deviation from P-162's wording (recorded for the tech lead and the founder, review m6).**
* P-162 says formats in the form's instructions are "read by AI with quotes, proposed and checked like any library proposal".
* For PDF forms this build reads the form's own validation scripts instead: exact official quotes, deterministic, no AI, US$0.
* No AI output goes live unreviewed.
* Still open, as a later item: an AI read of formats stated only in guides and instructions (for example "UCI 8 or 10 digits"), proposed through To review.

**Review 1 (Block, 4 Majors) and what changed**
* **M1:** "select primary phone;" transforms are read by their part. The phone's national number is the answer's `number`.
* **M2:** nothing is shown as checked unless `checkFormat` applies it. Date rules compare month answers at month precision.
* **M3:** the letters are the forms' own: a to z and the French accents only. A curly apostrophe is refused with "Type the apostrophe as '". No `+` is allowed in an email.
* **M4:** a passing and a failing case for each of the 20 checks, one test per form-function mapping, the phone and address cases, and the browser check `tests/check_forms_c31_formats_browser.cjs`.
* **Minors:**
  * m1: a Canadian postal code with a hyphen passes.
  * m2: no "maxChars" in the words; the parts are named in words.
  * m3: duplicate year rules are merged.
  * m4: format-check needs a known person.
  * m5: the message names English or French letters.
  * m7: the test reruns on the same copy.

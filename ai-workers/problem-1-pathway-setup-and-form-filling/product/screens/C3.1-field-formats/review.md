# Review: C3.1 field formats (P-162)

**Current verdict: Approve, for commit 67449245** (branch `claude/vigilant-curie-kd2ngw`). See Review 3 at the end.

Reviewer (fresh context, did not build it), 1 Nov 2026. Each review ran on a clean `git archive` export of the exact commit, with its own web build, its own database and its own port in the lane's range. I checked each port was free before using it, never used :4400, never turned on live AI (US$0), and stopped each copy and dropped its database afterwards. The full text of Reviews 1 and 2 is in git history (commits cf5a8da4 and 67449245); below they are trimmed to their finding lines.

Spec: P-162; the C3.1 row's Missing line; plan-p158 item 6 and its "Folded in" note. Journey test: `journey-test-reviewer-2026-11-01.md` (7.5 / 10 at 56789164; re-scored 8.5 at cf5a8da4, and 9 at 67449245, see Review 3).

## The deviation: the form's scripts read without AI
**Acceptable for C3.1, not a Major.**
* The validation script inside the official XFA form is a stronger source than AI reading the guide. It is the form's own rule, its quote is the form's own error message (P-170), it is deterministic and US$0 (P-156), and the code is the guard (P-153).
* No AI output goes live, so the second-person review (P-121, P-158) is not bypassed. The mapping table is code, reviewed in the PR, and every mapping now has its own test.
* Still open: the half of P-162 that reads the form's *instructions* (for example "UCI 8 or 10 digits", or dates in order taken from the guide). It is not built, and it is listed as not built.

## Review 1 (ab8bb1ae, re-checked at 56789164): Block
* **M1** Transforms that start with "select …;" were not parsed (`partOf`, `datePart`, the exclusions). The phone field got 5 rules no answer could meet, and `format-check` refused every phone.
* **M2** Rules were shown as "checked on every answer" but skipped at runtime: date order (no other date passed), the phone's area code, exchange and line (not parts of the stored answer), whole-address rules, and month answers.
* **M3** The character checks were looser than the forms' own regex: they accepted ñ, á, ß, ø, ’, « », `|`, and "+" in an email. "O’Brien" passed and then failed the form's own check.
* **M4** Only 4 of 20 checks had a pass and a fail test. There was no test per mapping and no browser test.
* **Minors:**
  * m1: the Canadian postal code "K1A-0B1" was refused.
  * m2: words ("box", "maxChars", raw part names).
  * m3: duplicate year rules.
  * m4: `format-check` worked without a known person.
  * m5: the name message ("Use letters" for ễ).
  * m6: the deviation was not recorded.
  * m7: the test could not be re-run on the same copy.
* Held from the start: passport, USCIS, UCI, PhoneNAN, AreaCode, IntlNum and Funds match the form's regex exactly. Unmapped form checks are shown as not checked. axe was clean and keyboard and 1024 / 200 % worked.

## Review 2 (cf5a8da4): Block
* M1–M4 and m1–m7 were fixed. Tests: 98/98 twice and browser 15/15. Removing a check made its own test fail. The audit found 0 rules shown but skipped across 164 fields.
* **M5 (new)** The phone `number` rule "digits and spaces" refused "613-555-1234". But the type check accepts hyphens (`case.ts:147`) and the filler writes digits only (`p5/transforms.ts:95`). Through QA-122, that refusal also stopped the phone being written.
* **m8** The panel said "no format beyond the type" above rules listed as not checked.
* **m9** `whole` was keyed on the value type, but the phone fields are type "text" with a phone-shaped answer.

## Review 3 (67449245)
**Verdict: Approve.** No Blocker or Major is open.

**Setup:** :4450, after checking it was free. Ports 4451 and 4457–4459 were held by other copies, and 4452–4456 are the builder's. Database `xr_studio_rev_c31z`, now dropped. US$0.

**Delta:** cf5a8da4..67449245 touches only `engine/field-format.ts`, `web/src/pages/library.tsx` (one Notice) and the test (+2 cases).

**Checks run:**
* `check_forms_c31_formats.ts`: **100/100**, run twice on the same copy.
* `check_forms_c31_formats_browser.cjs`: **15/15**.
* Field list: identical to cf5a8da4 for all 164 fields.
* Audit of rules shown versus applied by `checkFormat`: **0 skipped**.
* axe: 0 violations on both panels checked.

**The fixes:**
* **M5 fixed.** A phone piece is compared as digits after removing spaces, hyphens, dots and brackets, as the filler does. "613-555-1234" and "613 555 1234" pass. The extension "12a" is still refused; "1-2" passes (the filler writes "12").
* **m8 fixed.** `organisation.address` now reads "No rule is checked on answers here; what its forms say is listed below."
* **m9 fixed.** `whole` is true when any form field writes a part. With today's data there is no change in output, and the audit is still 0.

**Not caused by this item (for the runtime lane, no action here):** the older phone type check (`case.ts:147`) strips only spaces and hyphens. It still refuses "(613) 555-1234" and "613.555.1234", which the filler and the new format check would both accept.

**Journey score at 67449245: 9 / 10.**
* Correct data, trust, error recovery and feedback each score 1.
* Plain words stays ½: the "not checked" line is dense.
* Next step stays ½: "not read yet" names no action.

## D1–D20 at 67449245 (1–5)
D1 4: P-162's form part is built and enforced; the instruction part is still open · D2 4 · D3 4 · D4 n/a · D5 4 · D6 3: sha-tied, no checked date · D7 4: no AI · D8 4 · D9 4 · D10 4 · D11 4 · D12 4 · D13 5 · D14 4 · D15 5 · D16 4: a pass and a fail per check, each mutation caught · D17 simulated only · D18 4: a source and the form's quote per rule · D19 4 · D20 simulated only.

## Could not check
* A real screen reader.
* A walk by an intended user (D17, D20).
* Adobe's own refusal of ’ in a filled PDF (inferred from the form's regex, not observed).
* Validator bodies outside IMM 1295 (they share `util.validateFormat`).

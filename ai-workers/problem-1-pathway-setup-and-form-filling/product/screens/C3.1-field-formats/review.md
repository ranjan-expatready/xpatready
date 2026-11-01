# Review: C3.1 field formats (P-162), commit 56789164

**Commit reviewed: 56789164** (branch `claude/vigilant-curie-kd2ngw`). It was first reviewed at ab8bb1ae. The delta to 56789164 (0c45bc2f, 106cf71e, 56789164) is words and list layout only: `field-format.ts` (part words, quote text) and `library.tsx`. `api/`, `engine/runtime/`, `contracts/` and `tests/` are identical. I re-ran everything that the delta could affect on a clean 56789164 export.

Reviewer (fresh context, did not build it), 1 Nov 2026. Branch `claude/vigilant-curie-kd2ngw`, diff `origin/main...56789164`. The builder kept committing in the shared clone while I worked (HEAD went 0c45bc2f → 106cf71e → 56789164), so every result below comes from a clean `git archive` export (ab8bb1ae, then 56789164) in /tmp. That export had its own web build, its own database `xr_studio_rev_c31x` and its own API on :4452 (this lane's range). I never used :4400, never turned on live AI and never clicked a priced button. US$0. The copies are now stopped and their databases dropped.

Spec: P-162; the C3.1 row's Missing line ("each field's format from its source (maximum length, date pattern, UCI and similar), enforced in code"); plan-p158 item 6 and its "Folded in" note. Journey test: `journey-test-reviewer-2026-11-01.md`, **7.5 / 10** (below the pass bar). This is the one score for this check.

**Verdict: Block.** Four findings are Major. The right foundation is in place: the form's own checks, a fixed set of checks, quotes, US$0 and no AI. But some rules shown as enforced are wrong or are never enforced, and most checks have no test.

## Checks run
* `tests/check_forms_c31_formats.ts` passes **26/26** on a fresh copy, at both ab8bb1ae and 56789164. At 56789164, `GET /library/fields` still gives the same phone rules, and `format-check` still refuses "6135551234" with 3 problems. I did not re-run `check_s6_library_pages_browser.cjs` (the builder reports 33/33); my own walk covers the list at 1024. A second run on the same copy fails at setup ("Reset the demo first"), so the test cannot be re-run without a fresh copy (m7).
* `tsc -p web` is clean. `tsc -p api` shows only 2 old errors (ajv in the /tmp export, and `check_c18_age_case.ts:59`), neither from this diff.
* `graph.mjs`: G1 0 · G2 0 · G3 1 · G4–G6 0. `GET …/format` and `POST …/format-check` are used by no page, only by the test.
* Runtime probe: 42 realistic answers through `checkValue` against the real release snapshot from `config_release`.
* The form's own validators, read from `official-sources/ircc/forms/imm1295e.pdf` (`util.validateFormat`, `isCanadianPostalCode`, `validatePhoneNAN` …) and compared one by one with `FORMAT_CHECKS` and `BY_FUNCTION`.
* Playwright: list and field page at 1440, 1024, 1024 at 200 % and 400 px; axe WCAG 2.2 AA; keyboard only; timings.

## Deviation: the form's scripts read without AI, instead of "read by AI with quotes, proposed and checked"
**Acceptable for C3.1, not a Major.**
* The validation script inside the official XFA form is a stronger source than AI reading the guide. It is the form's own rule, its quote is the form's own error message (P-170), it is deterministic and US$0 (as in P-156), and the code is the guard (P-153).
* No AI output goes live, so the second-person review (P-121, P-158) is not bypassed. The mapping table is code, reviewed in the PR.
* Two conditions, both in m6:
  * The deviation must be recorded (challenge.md or the PR).
  * The half of P-162 that reads the form's *instructions* stays open and must be said to stay open. Examples are "UCI 8 or 10 digits" and dates in order taken from the guide text.
* M1 shows the cost of unreviewed derivation. M4 (tests per check) is what contains that risk.

## Findings
**M1 Major: transform parsing ignores the "select …;" prefix, so the phone field gets five rules that contradict each other.**
* Where: `engine/field-format.ts:127` (`partOf` is anchored at `^address_part|phone_part`), `:149` (`datePart` anchored at `^date`) and `:150` (`^(yes_no|code_list|date)`). All 16 IMM 1295 phone transforms begin "select primary phone; phone_part:…".
* Result: `person.phone_number` reads "At most 3 characters · Digits only · Digits and spaces only · Exactly 4 digits · 3 digits, not starting with 0 or 1", in the Fields list and in the panel. No value can satisfy all five.
* `POST /library/fields/person.phone_number/format-check {"value":"6135551234"}` → 3 problems; `"613"` → "Use exactly 4 digits."
* The same anchoring misfires for every "select …" row (residence dates, status, country code lists).
* Fix: parse the transform after the last `; `. Add a pass and a fail test for a phone part.

**M2 Major: rules are shown as "checked on every answer" (`library.tsx:119`), but some are never checked.**
* Date order ("After / On or after the start date beside it on the form", for example `person.residence_status_to_date`): `case.ts:104` passes only `{ today }` and never `otherDate`, so `date_after` with the other date always returns null at runtime. The probe confirmed it: "2001-01-01" is accepted.
* Phone and fax parts (`nanp_area_code`, `nanp_exchange`, `nanp_subscriber`, `national_number`, `country_calling_code`): none of them is a key of the stored Phone answer (`contracts/runtime.ts:83`: type, country_code, number, extension). They are skipped, and only `extension` is ever checked.
* A rule without a part on an answer stored as an object (`organisation.address`, the `address_single_line` boxes) is skipped (`field-format.ts:181`).
* `not_future` and `date_after` skip answers given by month only (`isoDay`).
* Fix: list these under "not checked here yet" (the honest path the code already has), or wire them in (pass the paired date, derive the NANP parts), and test each one.

**M3 Major: the character checks are looser than the form's own rule. P-162 asks for "the Latin characters IRCC forms accept".**
* The form's rule:
  * Open text and Name allow only a-z, A-Z and é à è ù â ê î ô û ë ï ö ü æ ç œ (and their capitals).
  * They do not allow ’, « », `|`, or "+" in an email.
* Our rule: `LATIN` at `field-format.ts:17` (U+00C0–U+00FF) plus ’ « » `|`, used by `english_french`, `name_characters`, `place_characters` and `email` (`:39–42`). It accepts ñ, á, ß, ø and ’.
* Effect: "O’Brien" (an iPhone keyboard's default apostrophe) passes our check. It is then written to the PDF, where the form's own check refuses it. Nothing in `p5/` or `fill.ts` normalises it.
* Fix: use the form's own character class (`xfa_formats.py` can read it from `util.validateFormat`), or normalise ’ to ' before the check and before filling. Test both.

**M4 Major: the [M] rule "a rule's test fails when the rule is removed" (STANDARDS §7; WAY-OF-WORKING rule 3) is not met.**
* Only `max_length`, `digits_only`, `letters_digits` and `postal_code` have a pass and a fail test. Removing `validateOpenText`, `validateName`, `validateEmail`, `validateAreaCode`, `validatePhoneNAN`, `validateDate…` or any other check in `BY_FUNCTION` fails no test (grep `tests/`).
* There is no browser test for the Format column or the Format panel.
* M1 and M3 are exactly what such tests would have caught.

**Minor**
* **m1 A Canadian postal code with a hyphen is refused.** "K1A-0B1" gets "looks like A1A 1A1", but the form accepts it (`isCanadianPostalCodeWithDash`) and fixes it. Through QA-122 (`engine/runtime/forms.ts:25`), that refusal stops the whole confirmed address being written.
* **m2 Words (P-63, PRODUCT §4):** at 56789164, "box" is gone and most part names are plain words. What remains:
  * The quote "The form field holds at most 10 characters (maxChars 10)" still has "maxChars".
  * Two `PART_WORD` keys (`national_number_without_country_code`, `country_code`, at `field-format.ts:168`) match no real part, so "national number" and "country calling code" are still shown raw.
  * The "The form says" column shows our own sentence as a quote, and shows "—" for the date-order rules.
* **m3 Rules that read twice or clash:** "Year 1900 to this year · Year 1900 or later" (employment from date); "On or after … · After …" (residence status to date).
* **m4 Authorisation:** `POST …/format-check` (`main.ts:69`) has no `actorOf`. It answers with no actor or an unknown one, while the GETs return 401. It is read-only, but STANDARDS says deny by default [M].
* **m5 Name refusal message:** "Use letters, hyphens, apostrophes and spaces only" for "Nguyễn". ễ is a letter. Say "letters used in English or French".
* **m6 The deviation is not recorded:** there is no challenge.md and no PR note. `qa/built/C3.1.md` does not say that the instruction-reading half of P-162 is still to do.
* **m7 Test:** it is not re-runnable on the same copy. The "not checked here yet" line runs the quotes together into one sentence.

## Held up well
* **The source:** maxChars, picture clauses and the validator calls are read from the template, matched by SOM path, and checksum-tied to the inventory. Unmapped validators (LMIA, military year, "<= today") are shown as not checked, never claimed.
* **Mappings that match the form's regex exactly:** passport ("^[ a-zA-Z0-9]+$"), USCIS, UCI and digits, PhoneNAN, AreaCode, IntlNum and Funds.
* **No false refusal from the four suspected areas.** UCI with a hyphen, "St. John", "a@b.company", and curly quotes or dashes in open text are refused, but the form refuses them too. Phone answers are objects and are not refused (no check applies, see M2). `date_after` against today does not reach expiry dates: those are date-part boxes, which the code skips. Canada is matched as CA, CAN, Canada or 511, and other countries are left alone.
* **UI (re-checked at 56789164):** every row has a format or the reason it has none. The format line now sits under the meaning: the table is 750 px wide at 1024 with no overflow, and the Status column is visible. axe found 0 violations in 8 states. There is no sideways scroll at 400, 1024 or 200 %. Keyboard only: search (16 tabs) → UCI link (3 tabs) → panel. List 0.4–0.7 s, field 0.3–0.45 s.

## D1–D20 (1–5)
D1 3: the format is shown with its source, but M1 and M2 · D2 3: M3 lets in characters the form refuses · D3 4: one format per field, merged across forms · D4 n/a · D5 4 · D6 3: sha-tied, no checked date · D7 4: no AI · D8 4 · D9 4 · D10 3: m2 (improved at 56789164) · D11 4: four honest states · D12 4 · D13 5 · D14 4 · D15 5 · D16 2: M4 · D17 simulated only · D18 3: sources per rule; "The form says" is partly ours · D19 3: runtime is only partly enforced (M2) · D20 simulated only.

## Could not check
* A real screen reader.
* A walk by an intended user (D17, D20).
* Adobe's own refusal of ’ in a filled PDF. I inferred it from the form's regex and did not observe it.
* Forms other than IMM 1295: I compared validator bodies only there, and they share `util.validateFormat`.

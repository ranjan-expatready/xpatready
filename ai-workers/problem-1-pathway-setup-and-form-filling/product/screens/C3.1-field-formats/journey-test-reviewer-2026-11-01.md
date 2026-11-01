# Journey test (reviewer): C3.1 field formats, commit 56789164

I walked everything at ab8bb1ae, then repeated the UI walk, axe, the widths, keyboard and the C3.1 suite on a clean 56789164 export. The delta is words and list layout only. The results match, except that the words improved.

1 Nov 2026. Reviewer role, the one score for this check. Clean `git archive ab8bb1ae` export, its own web build, database `xr_studio_rev_c31x`, API on :4452. Sample inputs loaded. US$0, no live AI. Playwright Chromium was headless (no visible browser pane in this cloud session); I walked as a person would (click, type, read) and replayed the steps as scripted checks.

## Journeys
1. **Main.** Configuration author, goal "what may a client type for UCI, and who says so?". Fields → search "uci" → open UCI → Format panel. *Expected:* type, rules and the form's quote. **Held.** "At most 10 characters · Digits only", from IMM 1295 and IMM 5257 SCH1, quote "The correct format is: Numeric characters". Keyboard only: 16 tabs to search, 3 to the link, Enter.
2. **Alternate.** The same author checks the phone field. *Expected:* country code, area code and number rules, each by part. **Failed.** Five whole-value rules that cannot all be met ("At most 3 characters … Exactly 4 digits"). Review M1.
3. **Alternate.** The author reads the date order on "status to date". *Expected:* the rule, and it is enforced. **Shown, but not enforced.** The runtime accepts any order, and the rule has no quote ("—"). M2, m2.
4. **Empty.** A field on no form (Application date) → "On no form"; a list field with nothing on its form → "No format on its forms"; an unread form → "Format: not read yet" in orange. **Held.**
5. **Error.** A client enters a UCI "12AB5678", a passport number "AB-123#", and a Canadian postal code "12345" with country Canada. *Expected:* refused on the field in plain words. **Held** (engine with the real release, and `format-check`).
6. **Error, false refusal hunt.** A client in Canada types the postal code "K1A-0B1" → refused, but the form accepts it (m1). "Nguyễn" → "Use letters…", which is confusing (m5).
7. **Error, under-check.** A client types the family name "O’Brien" with an iPhone apostrophe. **Accepted, and written to the PDF, where the form's own Name check refuses it** (M3).
8. **Wrong role.** GETs with no actor or an unknown actor → 401. `POST …/format-check` with no actor → answers (m4).
9. **Recovery.** Reload on the field page shows the same panel. A second run of the test on the same copy fails at setup (m7).
10. **Screen boundary.** Library format → case answer (`checkValue`) → filled PDF (QA-122: a confirmed answer with a problem is not written). The chain is joined. A false refusal there also blocks the fill (m1).

## Automated replay
| Check | Result |
|---|---|
| axe WCAG 2.2 A/AA: list and Format panel, 1440 / 1024 / 1024 at 200 % / 400 px | 0 violations (8 states) |
| Sideways scroll, same widths | 0 px |
| Console and page errors | none |
| Fields list first view | 0.40–0.69 s (164 rows, one request) |
| Field page | 0.30–0.45 s |
| `check_forms_c31_formats.ts` | 26/26 on a fresh copy; 25/26 when re-run on the same copy |

## Data underneath
* `GET /library/fields` → 164 rows, none blank: 71 read, 63 none on their forms, 30 on no form.
* I found no write path in C3.1: it only reads, so nothing changes.
* Runtime probe: 42 answers through `checkValue` with the release snapshot from `config_release`. Results are in review.md.

## Score (0 / ½ / 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 and J4 complete by keyboard |
| Next step obvious | ½ | "Format: not read yet" does not say what makes it read |
| Plain words | ½ | at 56789164 "box" is gone; "maxChars", "national number" and "country calling code" remain (m2) |
| Feedback and state | 1 | four honest states, warning colour only for "not read" |
| Correct data | ½ | phone rules are wrong (M1); character set is looser than the form (M3) |
| Error recovery | ½ | messages are plain and on the field, but the postal-code hyphen is falsely refused (m1) |
| Accessibility and screen sizes | 1 | axe 0, no sideways scroll at 400 / 1024 / 200 %, keyboard path |
| Speed | 1 | under the 1 s budget |
| Visual quality | 1 | team table and card; the not-checked line is dense |
| Trust and sources | ½ | a source per rule and "no AI" stated, but "checked on every answer" is not true for every rule (M2), and "The form says" holds our own sentence |

**Total 7.5 / 10. Below the pass bar (8), no criterion at 0.**

Fixes that would raise it, most valuable first:
1. Correct data: parse the transform after the "select …;" prefix, and use the form's exact character class (M1, M3).
2. Trust: move the rules that are not enforced to "not checked here yet", or wire them in (M2).
3. Plain words: drop "maxChars", and fix the two `PART_WORD` keys that match no part (m2).
4. Error recovery: accept "A1A-1A1" (m1).

## Not tested
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* A filled PDF opened in Adobe to watch the form refuse ’ (inferred from the form's regex).

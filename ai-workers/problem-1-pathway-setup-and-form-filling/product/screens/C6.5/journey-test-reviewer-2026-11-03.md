# C6.5 part 1 journey test (reviewer, 3 Nov 2026), commit `63ab2f262`

Scope: an engine row with no screen and no route (Confirm & use is held as L-SA7, the collapse rule as L-SA9, P-251). There is nothing to walk in a browser, so each journey is walked as the engine call the future screen will make: `readPassport` on Sample PDFs from `acceptance/lib/fixtures.ts`, then the result is read the way a case officer would read the review. Node 24.21.0, US$0, no server, no port, no AI. The probe scripts are in my scratch folder, not the repo.

## Journeys (persona · goal · steps · expected → seen)
1. **Main path.** Case officer: "read Client A's passport into the form." Upload a text-layer passport, read it. Expected: 8 proposals about the holder, each with document, page 1, reader `mrz` and a confidence; number, date of birth and expiry collapsed; names expanded; one Confirm & use. **Seen: as expected** (C6.5-E1/E2; reader suite 25/25).
2. **Alternate, compressed text layer.** The same passport with a FlateDecode stream. **Seen: same values.**
3. **Error, bad check digit.** The number's check digit is wrong. Expected: number unreadable with a reason, nothing collapsed, names still proposed. **Seen: as expected** (E4, 18b). The date-of-birth variant also holds, and an O read in place of a 0 is never corrected.
4. **Empty.** Not a PDF, a PDF with no text, a letter with no coded lines. Expected: nothing proposed, every fact unreadable, with plain reasons. **Seen: as expected.**
5. **Wrong person, two passports on one scan.** Expected: nothing proposed, "upload each person's passport on their own line." **Seen: as expected for two clean zones** (E5, M5 tests). **Broken** when the second zone's line is one character short, or has one character outside the coded-line alphabet: all of A's values are proposed, number, date of birth and expiry collapsed (review M2).
6. **Header text above the zone.** A printed 44-letter sentence directly above the coded lines. Expected: the real zone is read, or nothing is proposed. **Seen: misread.** Proposed `family_name=EPRESENTTHISPASSPORTATTHEBORDERGATESNOW`, `citizenship=ED`, `passport_country_of_issue=EAS`; the real zone is lost (review M1).
7. **Typed versus document.** The client typed SAMPLEDE, the passport reads SAMPLED. Expected: a conflict, never an overwrite; the same name in lower case agrees. **Seen: as expected** (`compareWithAnswers`).
8. **Whose fact (R11).** A marriage certificate on the principal's line supplies the spouse's birth name to the spouse; with no spouse on the case it goes to nobody. **Seen: as expected** (E6/E7, SH3 R11).
9. **Recovery, a PDF writer's quirks.** An indirect `/Length 12 0 R`, and a watermark form stream before the page. **Seen:** the first fails safe (unreadable, review m1). The second cites page 2 on a one-page document (review m2).
10. **Across the boundary.** The read is handed to Confirm & use (L-SA7). The contract (`M3-CONTRACT.md` C6.5 row, pack steps C6.5-9 to -12) matches the engine's `review` shape. The route is not built, so this is not walkable (expected, held).

## Break-it (15 min)
Same zone printed twice: one person (correct). Same person with a good zone and a bad zone: "2 people" (fails safe, wrong words, m4). Empty given names: given names listed unreadable (acceptable). Sex `<`: read as X (ICAO). Truncated name proposed as complete (m3). Hex-encoded text: unreadable (fails safe). Speed: 0.018 ms per read.

## Score (each 0 / ½ / 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Main path works on Sample documents; journeys 5 and 6 give wrong proposals |
| Next step obvious | 1 | Reasons say what to do ("read by hand from the passport page", "upload each person's passport on their own line") |
| Plain words | 1 | Reasons in plain English; "2 people" wording wrong in one fails-safe case (m4) |
| Feedback and state | 1 | `proposed`, `collapsed`/`expanded` and `unreadable` with a reason on every fact |
| Correct data | ½ | Journey 6 proposes garbage; journey 5 attributes the wrong zone |
| Error recovery | ½ | Fails safe on most bad input; two paths that should flag do not |
| Accessibility and screen sizes | ½ | Not testable: no screen in this row (no credit given either way) |
| Speed | 1 | 0.018 ms per read; suites run in seconds |
| Visual quality | ½ | Not testable: no screen in this row |
| Trust and sources | ½ | Document, reader `mrz`, Sample confidence on every value; page can be wrong (m2) |
| **Total** | **7 / 10** | Below the pass (8); no criterion at 0 |

**Verdict: below pass.** The fixes that raise it, most valuable first: (1) review M1, pair the zone correctly and drop a zone where every check failed (raises correct data and task completed); (2) review M2, flag unpaired coded-line candidates (raises error recovery); (3) m2 page citation (raises trust and sources). With those three fixed the engine-scope score would be 8.5. The two screen criteria are scored when L-SA7's screen is built.

## Not tested
A real browser, keyboard, axe or screen widths (no UI). A real screen reader. Real passports or scanner text layers (Sample only, P-133). The full pack against a server (routes held). D17 and D20 stay with the founder or an intended user.

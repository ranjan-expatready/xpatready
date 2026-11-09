# B138 · C6.16 Adult privacy and "Send to …": journey test (reviewer, 9 Nov 2026)

Reviewer role. This session did not build the screen. Commit e15959989a58953eb8817898716d506691ba094c, on fresh isolated copies on :4443 (`isolated.sh rev_c616 4443`), each one stopped after use. Headless Chromium (`/opt/pw-browsers/chromium`). Live AI was off; cost US$0. My scripts are kept outside the repo (scratchpad `walk.cjs`, `probe.ts`, `counts.cjs`). Screenshots: builder's `screenshots/01-15`, plus mine (r1-r5, not committed).

## Journeys (persona · goal · result)
1. **Main path. Client A at 390 px:** "My partner should answer their own questions." Client A presses Send to Sample Partner…, sees the field error, types the address and sends. **Held:** the line reads "Sent to p•••@example.com on 9 Nov… you can still answer for them" and offers Resend, Send to another address…, Take back. The page was ready in 272 ms.
2. **Main path. Partner at 390 px, in another browser:** Partner opens the link from the demo inbox, presses Send me a code, types it as `123-456`, reads the consent card and saves a value. **Held:** the token leaves the address bar, "Part 1 of 22", "Saved", and a reload keeps the session.
3. **Main path. Client A again:** **Held:** the card says "Sample Partner is answering on their own link · 1 of 22 parts done (1 optional)". Partner's value appears nowhere in the page HTML. Only Resend and Take back are offered.
4. **Officer at 1024 px:** the officer opens Own links and privacy, opens Keep private… on the child of 19 with the keyboard (focus lands in the reason field), cancels, opens Send to a new address…, then takes Partner's link back by keyboard with a reason. **Held:** the row reads "Taken back 9 Nov · still private from Client A". No sideways scroll; axe found nothing.
5. **Recovery. Partner reloads after the take back:** **Held:** "This link no longer works. This link was taken back on 9 Nov. Ask whoever sent it for a new one." No person is named.
6. **Alternate. Client A takes the link back before Partner opens it, then resends:** **Held:** the dialog said "You can send a new one later". Resend needs one press and goes to the same address.
7. **Error. Bad input by API:** a long address gives 400 on the field; a missing code gives 400 with both fields named; an unknown token gives 404 that names nobody; a bad Bearer gives 401 in words; a configuration person gets 403; take back with no link gives 409 in words. **Not held:** a NUL in the address gives 404 "Not found (it may have been removed by a reset)".
8. **Wrong role. After C6.13 Make principal (officer swaps Client A and Partner):** **Not held.** The client's own row offers Send to Sample Client A… (to Client A) and Keep private… (to staff). After either one, Client A loses their own parts, and every save on them is refused (403) with "Sample Client A's answers are private to them and the firm". The setting cannot be switched off (trigger, P-412). Partner, now principal, is refused a link with "The principal answers on their own family link".
9. **Data underneath:** GETs on privacy, inbox and questionnaire left the audit count unchanged (415 before and after). Tokens and codes are stored as sha256 only (pack C6.16-12).

Automated replay: builder browser check **44/44** (keyboard-only, 200 %, axe on 13 states), pack **57/57**, unit **35/35**. Each was rerun here on a fresh copy.

## Findings
| Sev | Finding | Evidence |
|---|---|---|
| Major | After Make principal, the client is treated as an ordinary adult: their own Send and tick lock them out of their own questions for good | journey 8; `privacy.ts:23-29`, `person-link.ts:100`, `privacy.tsx:92,147-150` |
| Minor | The same adult has two different progress counts: Client A sees 22 parts, the officer 14 | journey 3 vs 4; `person-link.ts:94` filters `x.subjectId === p.subjectId`, `runtime.ts` clientView uses `ownerOf` |
| Minor | After their own take back, Client A reads the adult's dead-link words "Ask whoever sent it for a new one" | journey 6 (region "About Sample Partner") |
| Minor | Focus goes to the page body, not back to Send to …, when the dialog closes with Escape at 390 px | journey 1 (`document.activeElement` = body) |
| Minor | A NUL in the address is answered as "Not found … removed by a reset" instead of a field error | journey 7; `contracts/person-link.ts:17` |

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | journeys 1-5 end to end across three roles |
| Next step obvious | 1 | one primary per card: Send me a code, Continue, Continue to my questions (05-08) |
| Plain words | ½ | journey 6 wording to the principal; journey 8 refusal; "Declared: the person's own answer…" under the part heading (r2) |
| Feedback and state | 1 | sent line, "Saved", error summary on a wrong code (06), progress card (10) |
| Correct data | ½ | journey 8 (lockout after Make principal); two progress counts |
| Error recovery | 1 | tries left, lock, dead link says why (13, r5); one-press resend |
| Accessibility and screen sizes | ½ | axe clean, no sideways scroll at 390/1024/1440 and 200 %; focus not returned after a dialog closes |
| Speed | 1 | page ready in 272 ms at 390 px; one request per panel |
| Visual quality | 1 | team Dialog, Table and Pill; panel at 1024 px reads cleanly (r3) |
| Trust and sources | 1 | Stand-in chips (proposed), "Unconfirmed: no counsel", masked address with who gave it, age marked Sample |
| **Total** | **8.5 / 10** | Pass (8 or more, no 0). The data finding still blocks in the review. |

Fixes that would raise the low criteria, most valuable first:
1. Treat the case's client person (C6.13 `client` flag) as the principal in `adultCheck`, `privateFrom` and the UI.
2. Count progress once, with `ownerOf`.
3. Give the principal its own words after a take back.
4. Return focus to the dialog's opener.

## Not tested
- A real screen reader.
- An intended user's unaided walk (D17 and D20 stay with the founder).
- Real email delivery (stand-in SI-20).
- Two physical devices.
- A clock past 15 minutes or 14 days (the pack's expired-code step covers the code).

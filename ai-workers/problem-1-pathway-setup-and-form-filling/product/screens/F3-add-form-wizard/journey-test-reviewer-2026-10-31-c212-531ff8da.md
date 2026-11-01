# Journey test: F2 C2.12 slice 1 (forms on To review items, `?form=`) · reviewer · 31 Oct 2026 · commit `531ff8da`

I did not build this. It is a backend slice. The screen that will read it (the rail, and `?form=` on To review) is F3b, a later slice. So I walked each journey through the API, the way that future screen will call it, and then read the data underneath. No UI file changed since 9f2132bd, so the To review browser results from the last round still apply.

Setup: copies came from /tmp `git archive` on ports 4450–4453. Each had a fresh database, filled by the suite and `fillAllKinds` with all 9 kinds and 54 items. Every database was dropped afterwards. Cost: US$0.

## Journeys (persona · goal · steps · expected → what happened)
1. **Main path. The author (user-A) asks "what still waits on IMM 1295?"**
   - Call: `?filter=all&form=IMM 1295`.
   - Got: 4 items, counts {needs 2, waiting 2, all 4}. The kinds are the kinds of that set.
   - **Held.**
2. **Alternate. The number is typed loosely: `imm1295`, ` imm  1295 `.**
   - Got: the same 4 items each time.
   - **Held.**
3. **Empty. A form with nothing waiting.**
   - The suite's check passes: an empty list with zero counts, never the whole list.
   - **Held.**
4. **Error. Bad input: `form=` empty, two spaces, or 41 characters.**
   - Got: 400 Problem Details with `errors[{field:"form"}]`, in plain words: "Give a form number, such as IMM 5257." and "A form number has at most 40 characters."
   - **Held (fixed since the last round).**
5. **Wrong role. The case officer (user-O) and Client A (user-P) ask for a form.**
   - Got: 403, "works on cases; the configuration is read in the Product Studio".
   - **Held.**
6. **Second person. The approver (user-B) and the content reviewer (user-C) ask for the same form.**
   - Got: the same 4 items. Each item's state is their own (needs 4).
   - **Held.**
7. **The author changes who fills a shared field (`case.service_language`).**
   - Got: [IMM 1295, IMM 5257]. It is listed under `?form=IMM 1295` (with `kind=`, the kinds still count the form's whole set, as BR-5 asks).
   - Then I made the IMM 1295 mapping's newest version drop the key. The item became [IMM 5257].
   - **Held (fixed).**
8. **The author removes a released form from a combination.**
   - The combination change no longer lists that form (suite check, and its mutation is caught).
   - **Held (fixed).**
9. **The AI reads the demo's IMM 5475 file** (Form "IMM 5475 (12-2022)", the same checksum as the library's "IMM 5475 (05-2021)").
   - Expected: the AI item and the running batch belong to IMM 5475.
   - Got: the AI item says "IMM 5475: 242 form fields…" but has `forms: []`. `?form=IMM 5475` lists only 2 library changes.
   - The repro used a copied job row and a queued step; the product's replay route refused this file.
   - **Major** (review Major 1).
10. **The step across the boundary: To review itself.**
    - I compared main and this commit on the same database: 136 responses, 508 items, **0 differences** with `forms` removed.
    - The neighbouring suites are green.
    - **Held.**

## Data underneath
I checked each kind's `forms` against the records with the suite's SQL oracle and my own queries (`combination_form` newest version, `form_field_map` newest version, `intake_item.code`, edition joins). All matched, except journey 9. Linking files by checksum instead resolves every demo Form, checklist and guide file to its form (SQL join, the review's Major 1). The slice only reads, so there is no audit line to expect.

## Break it (15 min)
- `<script>`, Cyrillic "ИММ 5257" and `IMM 5257';--` all gave 200 with an empty list. Nothing was echoed.
- Snapshots taken again at rest, from the same server, came back the same once the runner had finished the inserted STUB jobs.
- Speed: 64 ms on this commit against 68 ms on main, for 54 items.
- Mutations: 21 of 24 caught. The missed ones are proposals by combination, a held file with a code, and field-map versions (review Major 2 and Minor 1).

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | One form's items work (J1–J3, J7, J8). An item on the demo's IMM 5475 file is missing from that form (J9) |
| Next step obvious | 1 | `next` is the same as main for 4 people × 17 queries (J10) |
| Plain words | 1 | The `form` errors are in plain words now (J4) |
| Feedback and state | 1 | Counts and kinds are those of the filtered set. An empty set reads as zero (J3) |
| Correct data | ½ | Correct for every kind on the filled database, except a file whose label differs from its edition's (J9) |
| Error recovery | 1 | 400 with the field named. Snapshots are stable (J4, J10) |
| Accessibility and screen sizes | 1 | No UI change since 9f2132bd. Last round's axe runs at 1024 and 1440 px still apply |
| Speed | 1 | Same as main. Reads are batched, with no read per item |
| Visual quality | 1 | Unchanged |
| Trust and sources | 1 | No form is guessed for an unreadable file. Where the form is unknown, the list is empty, not a guess (J9 is a miss, not a wrong form) |
| **Total** | **8.5 / 10** | **Pass** (8 or more, no 0) |

To raise it, most valuable first:
1. Link a file to its form by checksum, with the label as fallback (J9).
2. Add failing tests for proposals by combination, held files with a code, and field-map versions.

## Could not test
- A visible-browser walk: there is no screen yet (F3b).
- A real screen reader.
- An intended user's unaided walk: D17 and D20 stay with the founder.
- Live-AI drafting, or a product-made AI draft of IMM 5475 (the replay was refused). J9 used copied rows.

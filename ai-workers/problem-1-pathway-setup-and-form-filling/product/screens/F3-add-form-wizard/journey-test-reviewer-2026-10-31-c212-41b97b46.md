# Journey test: F2 C2.12 slice 1 (forms on To review items, `?form=`) · reviewer · 31 Oct 2026 · commit `41b97b46`

I did not build this. It is a backend slice. The screen that will read it (the rail, and `?form=` on To review) is F3b, a later slice. So I walked each journey through the API, the way that future screen will call it, and then read the data underneath. No UI file has changed since 9f2132bd, so the To review browser results from the earlier rounds still apply.

Setup: copies came from /tmp `git archive` on ports 4450–4453. Each one had a fresh database: the demo load, the suite, or `fillAllKinds` (all 9 kinds, 54 items). Every database was dropped afterwards. Cost: US$0.

## Journeys (persona · goal · steps · expected → what happened)
1. **Main path. The author (user-A) asks "what still waits on IMM 5257?"**
   - Call: `?filter=all&form=imm5257` on the filled database.
   - Got: 43 items. The counts and kinds are those of that set. Each item's forms match its records (the suite's oracle, all 15 kinds).
   - **Held.**
2. **The AI reads the demo's IMM 5475 file** (labelled "IMM 5475 (12-2022)"; the library's edition with the same checksum is "IMM 5475 (05-2021)").
   - Got: the item reads "IMM 5475: 242 form fields…", has `forms: ["IMM 5475"]`, and is listed under `?form=IMM 5475`.
   - A queued step for that file in a running batch adds IMM 5475 to the batch's forms (suite check).
   - **Held (fixed since the last round).**
3. **Alternate. A file whose checksum no edition has, labelled with an edition's label.**
   - Got: the label fallback gives [IMM 5257].
   - **Held.** No test covers it (Minor 1).
4. **Empty. The loaded demo, before any AI work, asks for `?form=IMM 5475`.**
   - Got: 200, an empty list, zero counts.
   - **Held.**
5. **Error. The form number is empty, or two spaces.**
   - Got: 400 "Give a form number, such as IMM 5257." with `errors[{field:"form"}]`.
   - 41 characters → "A form number has at most 40 characters." (suite check).
   - **Held.**
6. **Wrong role. The case officer (user-O) and Client A (user-P) ask for a form.**
   - Got: 403 "… works on cases; the configuration is read in the Product Studio by its own people."
   - **Held.**
7. **Held file with a code, and a proposal group by combination.**
   - Each lists its form (from the intake code, and from the combination's newest lines). Both rules now have failing tests.
   - **Held.**
8. **A form's newest mapping drops a shared field.**
   - That form leaves the who-fills change (suite check, and its mutation is caught).
   - **Held.**
9. **Recovery. Reload and restart.**
   - The same database was served by branch, main, branch, main, branch in turn. At rest, the snapshots match each other.
   - **Held.**
10. **The step across the boundary: To review itself.**
    - I compared main and this commit on the same database: 136 responses, 508 items, **0 differences** with `forms` removed.
    - The neighbouring suites are green: 61, 53, 73, 26 and 20.
    - **Held.**

## Data underneath
I read the database with SQL. 7 demo files have a label that differs from their edition's. All 7 resolve by checksum to the library's form. Each of the 15 editions has its own checksum, so no file can match two forms. The lookup is scoped to the workspace. The slice only reads, so there is no audit line to expect.

## Break it (15 min)
- `<script>` as the form number → 200 with an empty list. Nothing was echoed.
- The product route can't make an AI draft of IMM 5475. Replay is refused: "IMM 5475 is already in this combination's configuration." So J2 used a copied job row, as the suite does.
- Speed: 20–42 ms for `?form=` on the loaded demo. There is one batched edition read (checksum or label), and no read per item.
- Mutations: 26 of 29 caught. Missed:
  - the label fallback (Minor 1);
  - two mutations that give the same result on every data the product makes today (label before checksum, and the `codeOf` parse).

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | One form's items are complete, including the demo's IMM 5475 file (J1, J2) |
| Next step obvious | 1 | `next` is the same as on main for 4 people × 17 queries (J10) |
| Plain words | 1 | The `form` errors are in plain words and name the field (J5) |
| Feedback and state | 1 | The counts and kinds are those of the filtered set. An empty set reads as zero (J4) |
| Correct data | 1 | Every kind matches its records. Files are matched by checksum (J2, data underneath) |
| Error recovery | 1 | 400 with the field named. Stable across restarts (J5, J9) |
| Accessibility and screen sizes | 1 | No UI change since 9f2132bd. The earlier axe runs at 1024 and 1440 px still apply |
| Speed | 1 | Same as main, with batched reads |
| Visual quality | 1 | Unchanged |
| Trust and sources | ½ | No form is guessed for an unreadable file. But the label fallback, the one path where a display label still decides a form, has no failing test (Minor 1) |
| **Total** | **9.5 / 10** | **Pass** (8 or more, no 0) |

To raise it: add a failing test for the label fallback (J3).

## Could not test
- A visible-browser walk: there is no screen yet (F3b).
- A real screen reader.
- An intended user's unaided walk: D17 and D20 stay with the founder.
- Live-AI drafting.
- A product-made AI draft of IMM 5475: J2 used a copied row.

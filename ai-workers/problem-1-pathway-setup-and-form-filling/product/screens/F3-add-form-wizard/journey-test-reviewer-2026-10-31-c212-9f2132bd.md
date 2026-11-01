# Journey test — F2 C2.12 slice 1 (forms on To review items, `?form=`) · reviewer · 31 Oct 2026

Commit `9f2132bd`. I did not build it. This is a backend slice. The screen that will read it (the rail, and `?form=` on To review) is F3b, a later slice. So each journey is walked through the API as the person's future screen would call it. Then the data underneath is read, and To review's own screens are checked through the green browser suites. Copies ran on ports 4450–4453 with fresh databases (all dropped afterwards). US$0.

## Journeys (persona · goal · steps · expected → what happened)
1. **Main: author (user-A), "what still waits on IMM 5257?"** I filled one database with all 9 kinds (54 items) and called `?filter=all&form=IMM 5257`. Expected: only items that touch IMM 5257, with counts and kinds of that set. → 41 items, each with `IMM 5257` in `forms`; counts {needs 4, waiting 37, all 41}; kinds: ai_proposals, proposals, release, new_edition and 37 library_change. Held.
2. **Alternate: the number typed loosely:** `imm5409`, ` imm  5409 `, `imm 5257 sch 1`. → Each gives the same set as the library spelling (IMM 5409: 2 items; IMM 5257 SCH1: 1). Held.
3. **Empty: a form with nothing waiting** (`IMM 1295` on the suite's data). → An empty list with zero counts, never the whole list. Held.
4. **Error: bad input:** `form=` empty, a space, or 41 characters. → 400 Problem Details with `errors[{field:"form"}]`, but in zod's words ("Too small: expected string to have >=1 characters"). **Minor.**
5. **Wrong role:** Client A (user-P) and the case officer (user-O) ask for `?form=IMM 5257`. → 403 "Not for case people". Held.
6. **Second person: approver (user-B) and content reviewer (user-C), same form.** → The same item ids as the author's. `forms` does not depend on who asks; each item's state and next step is the person's own, the same as on main. Held.
7. **Recovery: reload, repeat.** 136 responses taken twice from the same server came back byte for byte the same (once the runner had finished my inserted jobs). Held.
8. **The step across the boundary: To review itself.** With `forms` added, the To review page and the S6 queue still render and pass axe at 1024 and 1440 px (`check_screen02_slice1` 63/63, `check_s6_queue_browser` 28/28). Main and this commit give the same items with `forms` removed (136 responses, 526 items, 0 differences). Held.
9. **Author removes a form, then retires the combination** ("With an LMIA", IMM 5409 off). Expected: the retire item no longer counts IMM 5409. → It still does, because the form had been released (v1 PUBLISHED kept). A form removed before any release is left out. **Minor** (review Minor 2).
10. **Author changes who fills a shared field** (`case.service_language`, read by IMM 1295 and IMM 5257). Expected under D2's field rule: listed for both forms. → `forms: []`, so it is missing under `?form=IMM 5257`. **Minor** (review Minor 1).

## Data underneath
I checked each kind's `forms` against `combination_form`, `form_field_map → form_edition → gov_form_def`, `intake_item.code` and `source_attachment.edition` (review table). All were correct except journeys 9 and 10. The slice writes nothing (read only), so there is no audit line to expect.

## Break it (15 min)
`<script>`, Cyrillic "ИММ 5257", `IMM 5257';--` and 40 × "I" all give 200 with an empty list, with nothing echoed and no error. `filter=bogus` and an extra key give 400 (the existing rules). Speed: 46–50 ms on this commit against 41–43 ms on main for 54 items, with no per-item query. A label that does not parse: `IMM 5881 E (05-2026), …` gives `IMM 5881 E`, not the library's `IMM 5881`. Nothing shows this today, because AI batches take Form files only (review Minor 3). **No Blocker or Major found by use.** The one Major, missing tests, comes from the mutations and is in the review.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | One form's items, counts and kinds work (J1–J3). The removed form and the who-fills change are wrong (J9, J10) |
| Next step obvious | 1 | `next` is identical to main for 4 people × 17 queries (J6, J8) |
| Plain words | ½ | The item words are unchanged. The `form` errors are zod defaults (J4) |
| Feedback and state | 1 | States and counts are those of the filtered set. An empty set reads as zero, not as everything (J3) |
| Correct data | ½ | 12 kinds checked against the database. Minors 1–3 (J9, J10, the label parse) |
| Error recovery | 1 | 400 with the field named. Reloads are stable (J4, J7) |
| Accessibility and screen sizes | 1 | No UI change. axe at 1024 and 1440 px passes in both To review browser suites (J8) |
| Speed | 1 | About +5 ms. Reads are batched |
| Visual quality | 1 | Unchanged. The slice1 and slice1b screenshots were taken again by the suites and then restored |
| Trust and sources | 1 | An unreadable held file is never given a guessed form. An AI item names the file AI read |
| **Total** | **8.5 / 10** | **Pass** (8 or more, no 0) |

To raise it, most valuable first: tag placement_fills with its field's forms (Minor 1); use the newest line version (Minor 2); look up the edition's form, not the label (Minor 3); write the `form` errors in plain words (Minor 4).

## Could not test
A visible-browser walk by a person: there is no screen for this yet (F3b). A real screen reader. An intended user's unaided walk (D17 and D20 stay with the founder). Live AI batches (no `*_LIVE` allowed): the running items came from inserted rows.

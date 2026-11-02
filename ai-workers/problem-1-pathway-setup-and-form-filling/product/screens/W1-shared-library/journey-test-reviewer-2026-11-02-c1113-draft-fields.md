# Journey test (reviewer): C11.13 "Draft fields" at 7396ca5a, 2 Nov 2026

Isolated copy `rev_c1113` on :4473 (fresh, Reset + Load sample), US$0, no model call. Saved readings were written with `tests/field_draft_fixtures.ts` and removed afterwards. The walk ran in headless Playwright (no visible browser pane here), using only what a person sees: menu, drawer, button, link. The data was read through the API and psql afterwards. Screenshots are in the reviewer's scratchpad and are not committed. Review: `review-c1113-draft-fields.md`.

## Journeys
1. **Main path, content publisher (user-A).** Goal: "get this form's fields drafted so I can review them". Steps: Shared library › Forms › IMM 5409 ⋯ › "Draft fields with AI…" → drawer → "Draft fields with AI (saved draft, US$0)" → "Open its fields on To review › Proposals". Result: **held.** The toast reads "Saved AI draft … 5 fields proposed on To review, read by both rounds". The group opens with 2 Ready and 3 Decide, and the reasons are in plain words.
2. **No saved draft (empty).** Opened IMM 5409 and IMM 5707 before any saved reading existed. Result: **held.** The drawer gives the cost of a live run (about US$0.81 · at most US$1.63), the button is greyed, and the reason shows on the page and in a tooltip.
3. **Error: form not read.** Opened IMM 5475. Result: **mostly held.** It says there is "no box reading of exactly this file on this computer … read the form first". There is no button and no path to follow, and the GET answers 409, which logs a console error.
4. **Wrong role.** Opened the saved draft as the Approver (user-B). Result: **held.** The drawer says "Read-only: a person with the author duty drafts the fields." On the server, POST as user-B or user-C gets 403, and live as user-B also gets 403 because the role check comes first.
5. **Recovery: double click, reload, parallel clicks.** Result: **held.** A double click gives one job and 5 proposals, with a second honest toast ("already drafted"). After a reload the drawer shows the drafted state. The suite's two parallel POSTs share one job.
6. **Across the boundary: queue → library → second person.** I accepted every item from the IMM 5707 draft. Result: **wrong data.** A drafted `sponsor.family_name` landed as **`sponsor.family_name_sponsor`**, waiting for approval as an ADD (Major). `person.surname`, "The person's family name", was Ready as new beside the library's `person.family_name` (Minor). `case.email` was matched to `person.email` by name, as Decide (acceptable).
7. **Break it.** I used a 600-character French meaning with accents: it was stored and the queue row cuts it to one line, which is fine. An array body was treated as replay and got 201 (Minor). An unknown mode gets 400 and lists both choices. Live gets 409 before anything is sent.

## Automated replay
* `check_c1113_draft_fields.ts` **29/29** (11 s). My own walk script ran on a stale port first and then on my copy, with the same results.
* axe WCAG 2.2 A/AA: **0** violations on no-saved, saved, drafted and the queue group.
* No sideways scroll at 1440, 1024, 720 (the 200 % zoom stand-in) or 400 px. Keyboard path (menu → Enter → drawer → Tab) works.
* Speed: the drawer section answers in 26–66 ms, and draft → link takes 294 ms.
* Rule spot-check: when the quote rule is removed, a check fails. When the near rule is removed, all checks still pass (Major).
* Console: one 409 error, from the IMM 5475 GET.

## Data underneath
* One `drafting_job` (field_map_edition, REPLAY, COMPLETED, US$0) per edition.
* One audit line: "Configuration author drafted IMM 5707 (01-2023)'s fields from the saved AI draft (5 proposals, US$0)".
* Proposals stay `waiting` until accepted. Accepting one writes a WAITING library change for the second person.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1: drafted and handed to the queue in two clicks |
| Next step obvious | 1 | The single link goes to the edition's group; the greyed button explains itself |
| Plain words | ½ | "box reading … on this computer"; the label "Family name · case.family_name" shows a system name |
| Feedback and state | 1 | Toast, "5 fields, 5 still waiting", greyed button with its reason |
| Correct data | ½ | `sponsor.family_name_sponsor` key; synonym Ready as new |
| Error recovery | ½ | J3 gives no path; GET 409 logs a console error; double click shows two toasts |
| Accessibility and screen sizes | 1 | axe 0; 400/720/1024/1440 px; keyboard path |
| Speed | 1 | Under 0.3 s |
| Visual quality | 1 | Team drawer and queue patterns (shots 02, 05, 06) |
| Trust and sources | 1 | AI pill, both readings, quote found or not, Sample, US$0 stated |
| **Total** | **8.5 / 10** | **Pass** (8 or more, no criterion at 0) |

What would raise the score, most valuable first:
1. Build keys without the area twice, and test it.
2. Return a `not_read` state as 200, with the action that fixes it.
3. Mark Check when two fields of one draft quote the same words.
4. Keep system names out of labels.

## Not tested
* A real screen reader.
* Real browser 200 % zoom (a 720 px viewport was used instead).
* A visible headed browser.
* The live path (off by design).
* An intended user's unaided walk: D17 and D20 stay with the founder.

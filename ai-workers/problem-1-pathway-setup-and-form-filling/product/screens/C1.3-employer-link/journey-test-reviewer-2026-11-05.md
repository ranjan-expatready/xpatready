# C1.3 + C11.5 part 2 — journey test, reviewer role, 5 Nov (commit da3032f87)

Skill journey-test, reviewer role: this is the one journey score for this check. Copy `rv_c13` on :4433, configured checkpoint loaded on a blank database by the builder's check through the Demo menu's route. Headless Playwright (`/opt/pw-browsers/chromium`) with screenshots read by eye, plus API and SQL reads underneath. US$0, no AI. Screenshots are in the reviewer's scratchpad (not committed); the builder's six are in `screenshots/`.

## Journeys (written from concept r2 before the walk)
| # | Persona · goal | Steps | Expected | Result |
|---|---|---|---|---|
| J1 main | Case officer: "fill the employer's details from the employer case, keyboard only" (1024 px) | open WP case → Tab to Choose employer case… → Enter → Tab to Copy 3 facts → Enter | 3 facts copied, header names the employer case, Agent view shows "Employer case" beside "To confirm" | **held**: 9 Tabs to the button, drawer facts in 74 ms, copy + header in 323 ms; the three answers are DECLARED, `linked_file`, name and address on the principal, LMIA number on The application. **Focus falls to `<body>` after Copy** |
| J2 alternate | Representative at 200 % zoom (512 px): name already typed the same, LMIA number "A123" | open drawer → tick "Use the employer case's value" (Space) → double-click Copy 2 facts | Name Same (not written), LMIA number replaced, address New; one link | **held**: states same/different/new; one audit event despite the double click; the name answer stays `agent_view`, the LMIA number becomes SAMPLE-0000000 and the address `linked_file`; no sideways scroll, axe clean |
| J3 empty | Officer: all three already equal | open drawer | "Link without copying", the line "Nothing needs copying" | **held** |
| J4 error | Officer: the client answers while the drawer is open | Copy → Reload | "Changed since you looked: <label>", nothing copied, Reload re-reads | **held** (builder's browser check, 22/22 on my copy) |
| J5 wrong role | Client A opens the case page; client, author and solo-firm POSTs | — | client sees "This page is for the case officer"; 403, 403, 404 | **held**; no actor 401 |
| J6 recovery | Officer: Escape, reload after link, back | — | focus back on the button after Escape; after reload the button is gone and the line stays | **held** |
| J7 boundary | Officer: confirm the copied facts, then Prepare application | Confirm section (twice: principal and application) → `GET /runtime/cases/:id/forms` | the copies become VERIFIED; IMM 5710's draft writes them | **held**: VERIFIED with `answered.channel = linked_file`; IMM 5710 `draft.written_now = 3` |
| J8 two tabs | Officer: tab B links first, tab A presses Link | — | tab A refused, told why, can recover | **partly**: the Notice says "already relies on … (linked **4** Nov 2026)" while tab B's header says "facts copied **5** Nov 2026"; no Reload; tab A's page still offers "Choose employer case…"; a danger toast repeats the Notice and covers the primary button |
| J9 not offered | Officer: Visitor visa case | open the case | "Not offered: the Visitor visa has no employer facts.", no button | **held** (the C11.5 fix by person: VV and SP not offered, WP counts 2) |

## Break it (15 min)
5000-character key → 400 · `<script>` key → 404 "No such employer case." (never echoed) · bad `seen` id → 400 · array body → 400 · unknown `replace` fact ignored · omitted `seen` on a fresh case → all New, copied (correct) · **4 parallel POSTs on an all-Same case with the row lock removed (mutation) → linked 2–4 times in 4 of 5 cases**: the lock is needed and the race test does not catch its removal (review Major 2). With the lock in place: 201 + 409s only.

## Automated replay
The builder's `check_c13_employer_link_browser.cjs` covers J1 at 1440 px, J4 and J6, with axe at 1440 and 390 px. I added 1024 px, 512 px (200 %) and the J2/J3/J8/J9 states in my own walk: axe clean on the case page, drawer and linked page at 1024 and 512 px; no sideways scroll; no console or page errors. I ran each script once on the commit (the builder's check also ran green earlier on the same copy), so flakiness was not checked by a second run.

## Data underneath
Each link: exactly one `audit_event` "relied on employer case" (actor, date, fact keys only, no values); one answer row per copied fact; a replaced value superseded, not deleted. The Sample firm sees only `sample-employer-1`, the solo firm only `sample-solo-employer-1`.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J2, J7 end to end |
| Next step obvious | 1 | one button; the toast says "Confirm them in their section" |
| Plain words | 1 | New · Same as on this case · Different — on this case: A123; the Sample label; no IDs on the path |
| Feedback and state | ½ | busy button and counts are good; the error is shown twice and the toast covers the primary button (screenshot 6, J8) |
| Correct data | 1 | subjects, status, channel, history and the single event all checked in SQL/API |
| Error recovery | ½ | stale → Reload works; already linked from another tab has no Reload or refresh (J8) |
| Accessibility and screen sizes | ½ | axe clean at 1440/1024/512/390; **focus lost after Copy** (WCAG 2.4.3) |
| Speed | 1 | 556 ms page, 74 ms drawer, 323 ms copy |
| Visual quality | 1 | team pills and tokens, clean at 200 % |
| Trust and sources | ½ | "Employer case" beside "To confirm", the header date; the source tooltip is `title`-only and leaves out the employer case's name; two dates for one link |

**Score: 8 / 10, no criterion at 0: pass.** Fixes that would raise it, most valuable first: return focus to the linked line after Copy · one date function in one time zone · no duplicate toast, and refresh the view on a 409 · source tooltip reachable by keyboard and naming the employer case.

## Not tested
A real screen reader; a headed browser walked by a person; a true browser zoom (a 512 px viewport stood in); the "no employer case in this firm" state (every Sample firm has one); D17/D20 (they stay with the founder or an intended user).

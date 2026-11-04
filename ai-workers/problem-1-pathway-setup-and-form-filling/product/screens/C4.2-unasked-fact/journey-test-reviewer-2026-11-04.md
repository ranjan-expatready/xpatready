# C4.2 journey test: reviewer, 4 Nov 2026

PR #866 at 5e9c3fc6 (code identical at e3679c44). I used isolated copies on ports 4460–4463, US$0, with live AI off. The
browser was Chromium from /opt/pw-browsers, run headless with a screenshot at each decision point. Persona: the
configuration author (content publisher), plus the content reviewer and the client where the pack covers them.

## Journeys
1. **Main: a form pulls questions from sections the combination never chose.** Study permit has no sections chosen.
   Forms › "Add from library" on IMM 5707 → Smart questionnaire (SQR). Expected: each pulled section says why it is
   asked. Seen: 3 sections read "Still asked: IMM 5707 needs these answers. The section is not chosen …". Remove is
   hidden on them. **Held.**
2. **Alternate: a section taken out still asks what six forms need** (wp.family Personal details; builder's check).
   Seen: "Still asked: IMM 1295, IMM 5257 SCH1, IMM 5409, IMM 5475, IMM 5476 and IMM 5707 need these answers." The
   title stays "Personal details" on the tab and in Preview. **Held** (12/12).
3. **Error: tick the PQR on a fact no question asks.** Seen: the release error "… is needed by IMM 1295, but nobody is
   asked for it" and 422 "No question asks …". **Held** (pack, 3 runs).
4. **Wrong role:** the content reviewer marking the PQR gets 403, and a client reading the country PQR gets 403. **Held.**
5. **Recovery:** two saves at once give 200 and 409 in words. A stale tab gives 409 "Reload, then choose again". After a
   reload the line is still there. **Held.**
6. **Across the boundary: Review and release after journey 1.** Expected: warnings in words that agree with "Still
   asked". Seen: 24 warnings such as "Placed in section background_declarations, which this combination's
   questionnaire does not use." **Failed** (review M1, `engine/validate.ts:100`).
7. **Across the boundary: release, then rename a pulled section in the library.** Expected: a change to submit. Seen:
   the tab shows "About you", while the combination matches its release, the change list is empty and Submit says
   "Nothing has changed since the released version". The release keeps "Personal details". **Failed** (review M2).
8. **Put back:** the section is chosen again and the line goes. **Held.**

## Automated replay
* `tests/check_c42_still_asked_browser.cjs` 12/12 on a fresh copy. My own scripts were scratch, not committed:
  axe WCAG 2.2 A/AA gave 0 violations on the SQR tab in state 1. There was no sideways scroll at 1440, 1024, 512
  (200 % zoom of 1024) or 400 px. Keyboard only, Tab ×48 reached "Family members", Enter collapsed it, and the 2 px
  focus outline was visible. No page or console errors.
* Speed: the questionnaires view answers in 0.08–0.13 s on Study permit and 0.15–0.23 s on wp.family (STANDARDS §9: first
  view under 1 s).

## Data underneath
The probe fact exists once with `placed:false`. The PQR tick is on this combination's rows only (`mine 1, others 0`).
The release v2 snapshot carries `section_titles` with "Personal details"; its fingerprint does not (M2). The country PQR
shows no draft tick before release (P-132).

## Break it
Two saves at once and a stale tab: refused in words (pack). A rename of a pulled section after release: the new title
cannot be released (Major, M2). A wrong role by API: 403. I did not try long or non-English text, because nothing in
this item takes typed input.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | journeys 1–5 held |
| Next step obvious | ½ | the line does not say how to give the section a place (m3); Review contradicts it (M1) |
| Plain words | ½ | raw section keys on Review and release (M1) |
| Feedback and state | 1 | the line appears and goes with the choice; refusals in words |
| Correct data | ½ | a renamed pulled section is never releasable; the release keeps the old title (M2) |
| Error recovery | 1 | 409s say "Reload"; Undo on removal is unchanged |
| Accessibility and screen sizes | 1 | axe 0, keyboard, 1024 px, 200 %, 400 px |
| Speed | 1 | 0.08–0.23 s |
| Visual quality | 1 | screenshots: a full line under the header, team tokens |
| Trust and sources | 1 | names the forms that need the answers; the probe is labelled Sample |

**8.5 / 10, pass (8 or more, no 0).** To raise it, most valuable first: fix M2 (hash `section_titles`, list the change,
publish the section); fix M1 (title and words in `validate.ts:100`); fix m3 (say how to choose the section).

## Could not test
A real screen reader. An intended user's unaided walk (D17 and D20 stay with the founder). The bare six (QA-144).
Screenshots from my walk are in the reviewer's scratchpad only, not committed:
`/tmp/claude-0/-home-user-xpatready/c725ca3f-011d-569c-9440-2f68026325ee/scratchpad/keep/`
(c-sqr-1440.png, d-sqr-1024.png, e-sqr-200pct.png, f-review.png).

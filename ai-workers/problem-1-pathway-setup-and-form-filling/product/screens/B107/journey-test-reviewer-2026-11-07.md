# B107 journey test (reviewer), 7 Nov 2026

Commit `7a673ee57` (product code = `5e5cdd86b`). Builder's copy :4450 (`xr_studio_fb107`, configured checkpoint) and my own copy `rvb107` on :4456, started and stopped in one command. Live AI off, US$0, no priced button. Headless Chromium (`/opt/pw-browsers/chromium`) with axe-core. I could not run a visible browser pane: these are scripted walks of what a person sees, plus database reads. My scripts and shots (scratch, not committed) are under `/tmp/claude-0/-home-user-xpatready/fd440909-3e27-519b-8c5d-6089638f1c00/scratchpad/`: `rv-walk.cjs`, `approve-exp.sh`, `rv/`, `walk/`, `ja2/`.

## Journeys
| # | Persona · goal | Steps | Expected | Result |
|---|---|---|---|---|
| 1 | Case officer: "the representative's part fills itself" | Open a represented Visitor visa case › The representative tab | Every line comes from the firm record, question 7 included; no designated-individual section | **Held** (walk 8/8, shot `walk/02-…question-7`) |
| 2 | Case officer: "print a correct IMM 5476" | Prepare application › Generate a copy (IMM 5476) | The CICC number is in ICCRCMember only; office, phone, e-mail filled; no fax, student-at-law or uncompensated box | **Held** (B107-C2…C6, qa 7/7; PDF data read field by field) |
| 3 | Case officer: "IMM 5475 doesn't name us" | Generate a copy (IMM 5475) | Part 5/6 empty and listed as by hand; nothing of the firm anywhere | **Held** (C7–C10; shot `walk/04-…imm5475`: "0 form fields written") |
| 4 | Firm admin: change of representative | Case team › reassign with a reason › new IMM 5476 | The second representative's number in the CICC box only | **Held** (C15, C16; J-A2 19/19) |
| 5 | Case officer: "what do I still owe?" | Prepare › IMM 5476 readiness | No line tells the client it owes a representative fact | **Held** (C14, C14b; Prepare shows "8 facts", all the applicant's) |
| 6 | Approver: read the gate decision before trusting it | To review › a released IMM 5476 / IMM 5475 change | Plain heading, the decision stated correctly, the cite | **Fails on words:** heading "SET_FORM_FIELD_GATE …", "Filled only when filled only when …"; by-hand "Filled only when filled by hand: …" (shots `rv/gate-change-1440.png`, `rv/byhand-change-1024.png`). Cite, Sample and Unconfirmed are shown. |
| 7 | Wrong role: author approves own gate change | Approve route as the proposer | Refused | **Held:** 403 "A different person decides" |
| 8 | Stale view: the form field changed after proposing | Change the transform › approver opens the card › Approve | Card warns before the click; approval refused | **Held:** card re-check "This form field changed after this was proposed…"; approve 409; after reverting, 201 with the draft authored by the proposer |
| 9 | Author tries B86's door on a gated box | B86 list and propose for `representative.membership_id` | The gated box isn't B86's | **Held:** `rows: []`, propose 404 |
| 10 | Recovery: load the checkpoint again | (code read) `applyGates` with the same decisions already held | Nothing proposed twice | **Held by code** (`kept`, 045-form-field-gates.ts:80); not re-run |

## Automated checks (run twice where a browser was used: J-A2 and the walk passed on the builder's run and on mine)
* axe WCAG 2.2 A/AA on the change page at 1440 and 1024 px: no violations. No sideways scroll at either width. Tab order reaches the header, menu and page with focus visible. No page or console errors.
* Timings: the change page 0.6–1.7 s (first load cold); the checkpoint load 79 s (demo loader, not a person's path).
* Not run: 400 px and 200 % zoom on these pages; axe on the case pages (J-A2 covers their behaviour, not axe).

## Data underneath
26 library changes (`SET_FORM_FIELD_GATE` 13, `SET_FORM_FIELD_BY_HAND` 13), all RELEASED, each proposed by user-A and decided by user-B. IMM 5475's 15 part-5 rows are `by_hand` with no fact or person. IMM 5476's 13 gated rows hold `{gate, words, cite}`. No IMM 5475 row is about `representative`. IMM 5476 (11-2021) is the only edition, of 19, with any row about `representative`.

## Break it (about 15 min)
Self-approval (refused) · stale approval (refused, said before the click) · B86 over a gate (404) · a gate over B86 (refused in code, :223, untested: review m1) · the six's saved IMM 5475 runs (firm record kept off by the map guard). Found: M1 (words); latent m3 and m4 (see review.md).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J2–J5 by PDFs and screens |
| Next step obvious | 1 | Prepare lists by-hand parts; facts to answer counted |
| Plain words | ½ | J6: raw code and a wrong sentence on the approval card |
| Feedback and state | 1 | Re-check said before the click (J8); "Checked copy, not for filing" kept |
| Correct data | 1 | Field-by-field PDF reads; qa 7/7 |
| Error recovery | 1 | 409 tells what to do ("Return it; it can be proposed again") |
| Accessibility and screen sizes | ½ | axe clean, 1440/1024; 400 px, 200 % and screen reader not tested |
| Speed | 1 | Under 1 s warm; 1.7 s cold first view |
| Visual quality | ½ | Four-line H1 carrying a code; `\"open\"` backslashes in the reason |
| Trust and sources | 1 | Every decision cites page, quote, date; Sample, Unconfirmed: expert |
| **Total** | **8.5 / 10** | **Pass** (8+, no 0). It does not override the Major in review.md |

Fixes that would raise the low criteria, most valuable first: (1) ACTION_WORD entries and a gate/by-hand sentence on the card (plain words, visual quality); (2) plain quotes in the cites; (3) walk the card at 400 px and 200 %.

Could not test: a visible-browser walk by a person, a real screen reader, rendering in Adobe, an intended user's unaided walk (D17, D20 stay with the founder).

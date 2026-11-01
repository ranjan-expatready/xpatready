# Journey test (reviewer): C11.1 "Online (later wave)" on each Preview line

Reviewer: a fresh context that did not build it, 1 Nov. Commit **0c511652** (branch `c111-later-wave`, on origin/main 4ffb5e80), worktree `/home/user/ci-wt`, web build containing `data-later-wave-pill`. Isolated copies `rev_c111` on :4491 and `rev_c111b` on :4492. US$0, no AI.

## Journeys
1. **Main path: the content publisher checks what a person gets.** Persona: content publisher (user-A). Goal: "Before I release, show me which of the principal's forms the product fills and which it does not." Steps: load the sample, set IMM 1295 to Online on the Forms tab's route, open Preview › Principal applicant › Forms. Expected: the Online line itself says it is a later-wave line, and nothing presents it as filled today. **Held.** The line reads "IMM 1295 Application for work permit made outside of Canada · **Online (later wave)**". The group note under "Filled on the portal (Online)" gives the full words. The count reads "1 filled on the portal (later wave)". The line has no Fill PDF (`/tmp/rev_c111_shots/online-group-1440.png`).
2. **Alternate: the spouse.** The spouse's own IMM 1295 under Online carries the pill as well: 1 pill on 1 line.
3. **Alternate: an Online line filed once for the couple.** IMM 5409 is set to Online. **Held, but the words differ.** The line keeps its "Online" pill (no "later wave"), and the sub-line underneath reads "Online: Typed into the IRCC account … in a later wave." (`/tmp/rev_c111_shots/couple-online-1440.png`). See finding m1.
4. **Fail guard: lines filed another way.** No Paper or PDF upload line carries the pill (test step "C11.1 fail").
5. **Empty: no Online line.** With PDF upload only, there is no Online group and no pill (C4.6 fail step, still green).
6. **Error and recovery: someone tries to fill an Online line.** The Studio fill of an Online IMM 5707 is refused with 409 and the words "…needs the browser extension (later wave), so the product does not fill it. File it as a PDF upload to fill its PDF." (qa check, 55/55).
7. **Across the screen boundary.** The Forms tab names the same channel "Online (later wave)" (6 occurrences). A case names it "IMM 5707 · filed Online (later wave)" (QA-40 step, green). The pill's words come from that same constant (`contracts/runtime.ts:182`).
8. **Wrong role.** Not changed by this PR. The approver is read-only on the channel (C4.6 review, still green in `check_c46_preview_channels_browser.cjs`).

## Automated replay (`/tmp/rev_c111_scripts/walk.cjs`, `couple.cjs`; outside the repo)
| Width | Preview open | Sideways scroll | Pill fits on the line |
|---|---|---|---|
| 1440 | 525 ms | no | yes |
| 1024 | 415 ms | no | yes |
| 400 | 408 ms | no | yes; wraps after the title (`online-group-400.png`) |
| 720 at 2x (200 % zoom) | 406 ms | no | yes |

- **axe (WCAG 2.2 A/AA):** 0 violations in light and in dark mode.
- **Page errors:** none.
- **Keyboard:** the pill is not in the tab order. That is correct for a status. Its visible text says everything a keyboard user needs. The `title` only repeats the group note.
- **Accessible tree:** the list item reads "… Online (later wave) always required for this combination". The `title` adds the full later-wave sentence as a description, which the group paragraph just above already says (m2).

**Suites re-run on this commit (fresh copies):**
- `check_c46_preview_channels_browser.cjs` 25/25
- `qa/check_qa_am_1027.cjs` 55/55 (A :4491 empty, B :4492 with `setup_visitor_visa.ts` 13/13)
- `check_preview_sets_browser.cjs` 24 passed, 0 failed
- `check_s5_slice1_browser.cjs` 52/52
- graph `--check`: G1 0 · G2 0 · G3 1 (the existing `GET /attachments/:id/file`, not this PR) · G4–G6 0

## Data underneath
Preview is read-only, so no record changes. The pill's title equals `laterWave` from the engine (`engine/runtime/preview.ts:157`). It is the same sentence as the group note: one source, no copy.

## Break it
- **Remove the rule:** with no pill, the ONLINE line's text holds no "later wave" (the sub-line is skipped when `g.key === "ONLINE"`, `preview.tsx:152`). So the "C11.1 pass" step and qa's Preview step both fail. I reasoned this from the code and did not rebuild.
- **Very narrow width:** the pill is `whitespace-nowrap`, 113 px wide, and fits at 400 px.
- **Long titles:** a long title wraps before the pill, so nothing is cut.
- **No `laterWave` from the server:** the title becomes `undefined` (no tooltip) and the visible text stays.

## Score (the one score for this check)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Every Online line in the Online group says "Online (later wave)"; qa's gap is closed (55/55) |
| Next step obvious | 1 | The note says the case officer types it from the answer sheet |
| Plain words | ½ | The couple and application Online lines still say plain "Online" on the pill (m1) |
| Feedback and state | 1 | The pill is on the line; the count and the note agree |
| Correct data | 1 | One source sentence; only Online lines get the pill (fail step) |
| Error recovery | 1 | The fill of an Online line is refused in words with the way out (409) |
| Accessibility and screen sizes | 1 | axe 0 (light and dark), no sideways scroll at 400/1024/1440/200 %; minor duplicate description (m2) |
| Speed | 1 | Preview opens in 406–525 ms, no extra request |
| Visual quality | 1 | Team Pill, same row as the other pills, wraps cleanly |
| Trust and sources | ½ | The purple `ai` tone marks a status that is not AI. This existed before the PR on the channel pill (m3) |

**9 / 10, pass** (8 or more, no criterion at 0).

## Could not test
- A real screen reader.
- An intended user's unaided walk: D17 and D20 stay with the founder.
- Real IRCC portal behaviour: Sample until the immigration expert confirms.

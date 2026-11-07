# B117 journey test — reviewer, 6 Nov 2026 (commit reviewed eba4db3db; walk also run at d1c10d58b)

API-only change (runtime lane). Proportionate to the brief: the one person-facing path is the case page at 1440 px
showing the representative of record from the case team. Isolated copies on :4437 (this branch) and :4438 (the
base runtime.ts from a45b4aee7, started from a scratch copy), both stopped and dropped afterwards. Live AI off, US$0.

## Journeys
1. **Main — case officer (Sample firm):** opens a With an LMIA case with the representative of record chosen in the case
   team; the case page names that representative and fills IMM 5476's representative block from the firm record.
2. **Error — case officer, by URL/API:** asks the people route for a representative; expects a refusal in words that says
   where the representative is chosen, nothing added.
3. **Wrong role — client (user-P):** asks the same; expects a refusal before anything else.
4. **Recovery — double press:** the same request twice with one idempotency key; expects the same refusal, nothing added.
5. **Bad input:** empty name, "Representative" in capitals, padded " representative ".
6. **Across the boundary:** a listed role (child) still adds after the refusal.

## What held
* J1: `check_qa_am_1101c_runtime_walk.cjs` (scratch copy, screenshots redirected to the scratchpad so no tracked file
  changed) at d1c10d58b: 21/21, exit 0. Header chip "Representative (Sample) · CICC R000000"; Agent view tab "The
  representative" with every answer marked "From the firm record"; "Case team" button beside the chip. axe clean on `main`.
* J1 at eba4db3db (the reviewed commit's walk): **19/20, exit 1** — "a sentence or label never starts with lower-case
  representative" counted 1: the firm record's e-mail `representative@sample-firm.example` on its own line. Fixed by
  d1c10d58b (`(?!@)` in the walk's regex); see review.md M1.
* J2: 422 "The representative is not added as a person: the case's representative of record comes from its case team
  ("Case team" on the case page). This application can add: spouse or partner, child." People stay case, principal.
* J3: 403 "Only the case officer can do this." (reach comes first). J4: 422 both times, no participant.
* J5: 400 "Give the person a display name."; 400 "Choose who the person is (a person the release lists)."; padded → 422
  (trimmed by the contract). J6: child 201; GET people: case, principal, child.
* Data underneath: `case_participant` with role representative = 0 on the new copy; on the base copy the same suite left 1
  (the defect B117 removes). Case team representative id unchanged before/after (user-R).

## Findings on the path (not caused by B117; already logged by the builder in notes.md at d1c10d58b)
* Firm-record answers on the case page, C7.7 (visible now that the walk uses the case team): telephone shows
  `[object Object]` with "Enter text."; the firm's own e-mail carries "Enter an email address like name@example.com";
  country shows `canada` with "No fixed list for this answer yet". Severity for C7.7: Major (can reach IMM 5476); for
  B117: out of scope, needs its own row.

## Score (journey-test §6)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Representative of record named in the header and Agent view (screenshot 04, walk 21/21 at d1c10d58b) |
| Next step obvious | 1 | Refusal names "Case team" on the case page; the button is beside the chip |
| Plain words | ½ | Refusal plain and true, no internal role key; page shows `[object Object]` (pre-existing C7.7) |
| Feedback and state | 1 | 422 with the reason; nothing added; team unchanged |
| Correct data | ½ | No representative participant; team intact; firm-record phone/e-mail values wrong (pre-existing) |
| Error recovery | 1 | 403/400/422 in order; idempotent retry refused the same way |
| Accessibility and screen sizes | 1 | axe WCAG 2.2 A/AA clean at 1440 (case page) and 200 %/1024 (questionnaire) |
| Speed | ½ | Not timed against STANDARDS §9; the refusal returns before any write |
| Visual quality | 1 | Case page layout unchanged; no new chrome |
| Trust and sources | 1 | Every representative answer marked "From the firm record" with date and forms it fills |

**8.5 / 10, no 0 — pass.** To raise: fix the firm-record value shapes (C7.7 row); time the 422 against §9.

## Not tested
A real screen reader; an intended user's unaided walk (D17/D20 stay with the founder); the Mac demo (:4400 never used);
cases stored on the Mac demo before B117 (query in review.md).

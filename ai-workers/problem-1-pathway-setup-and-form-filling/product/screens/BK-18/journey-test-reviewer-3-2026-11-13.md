# BK-18 (QA-448) — journey test, reviewer (round 3), 13 Nov 2026

Branch `claude/screens-true-record` at `ab6505fbdcfd64122c9b1e67a329b2ebe5467322`, PR #1691. My own fresh isolated copies
**:4447** (`review3`) and **:4448** (`review3b`, one clean suite run); 4446–4449 checked free first (`/api/health` → 000).
Browser at 1440/1024/400 px and 200 %; shots in my scratchpad, not the repo. Both copies stopped afterwards.
Personas: the **Representative of record** (licensed, professionally responsible, P-154), the **Case officer**, the
**Second representative**. Goal in their words: "when I sign off a filing, the line it carries must say who really did it."

## Journeys walked

| # | Persona · goal | What happened | Verdict |
|---|---|---|---|
| J1 | Representative: open a case, do the work, review and approve it myself | The Approve dialog asks "I prepared and reviewed this filing myself" before anything is recorded; the record reads `Self-reviewed by Representative (Sample) (licence R000000), Nov 13, 2026, 01:15 p.m.`; the idle Case officer is never named (row check `check_qa447_self_review_record.cjs 4447` all passed; `walk.cjs` all passed, exit 0) | Held |
| J2 | Case officer prepares, Representative reviews | `Prepared by · Reviewed by: Case officer (Sample) · reviewed by Representative (Sample) (licence R000000), …`, never a self-review; the representative who only sent it for review is not refused (walk 7, 7a) | Held |
| J3 | Empty: the officer opens a case, nobody works, the Representative reviews | `… nobody recorded · reviewed by Representative (Sample) (licence R000000), Nov 13, 2026, 01:28 p.m.` — honest and reachable (case `62d9523e-…`, `E1-nobody-recorded-1440.png`) | Held (round 1 m2 / breaker B5 closed) |
| J4 | Wrong role, by URL and by actor | Review refused 403 for the case officer, 403 for the client, 403 for the configuration author, 403 for a representative not of record, 404 for the other firm | Held |
| J5 | **Representative: decide the findings on the review page, then approve** | **Add finding** → **Send for review** → **Approve** answers *"Nothing was recorded — You prepared this filing with another case officer: a review by you would read as a second person's…"*. The representative typed nothing. **Waive** (the action reserved to the representative of record) and **Acknowledge** do the same. Cases `d072bd01-…`, `1d386cd7-…`, `4905e34e-…`; `F1-add-finding-1440.png`, `F2-approve-refused-1440.png` | **Blocker** |
| J6 | Case officer decides how a form is filed (paper, with a reason); Representative reviews | The decision is invisible to the work record: the Representative is asked for and signs "I prepared and reviewed this filing myself" and the record reads `Self-reviewed by Representative (Sample)` though a second person made a filing decision (case `ae8813d0-…`) | **Major** |
| J7 | Hand the review over (the escape the 409 offers) and read the record | `Prepared by · Reviewed by: Case officer (Sample), Representative (Sample) · reviewed by Second representative (Sample) (licence R000002), …` — the Representative only added a finding (case `232130f8-…`, shots at 1440/1024/400/200 %) | **Blocker (same root as J5)** |
| J8 | Keyboard only, main path | 47 tabs to "Review the filing"; Enter; the 400 in words; the self box with Space; "Confirm the review"; the record line reads as in J1 | Held |
| J9 | Sizes and assistive tech | axe WCAG 2.2 A/AA **0 violations** at 400, 1024, 1440 px and 200 % (1024 → 512 CSS px); no sideways scroll; no console or page errors; the record line wraps on one line at every size | Held |
| J10 | Recovery: a refusal mid-flow, then reload | The refusal says "Nothing was recorded" with a Reload link; reloading shows the filing unchanged and no review row | Held |

## Data underneath
After each journey: one `filing_review` row per approval, `kind` matching the words on screen, `prepared_by` frozen to the
review's own time (a later officer act did not rewrite a recorded self-review), audit lines present for each act, roles
enforced on the server (J4). `psql` on `xr_studio_review3`. The one disagreement between screen and store is carried
(C8.2's fallback to a case-team officer on a case holding nobody's work).

## Break-it pass (15 min)
Two tabs reviewing at once (`POST /runtime/filings/:id/review`): both 200 `self_reviewed`, two review rows — the same as
pressing the button twice in sequence, which this route allows as a re-review (unchanged by this PR; the screen shows the
newest, `prepared_by` unchanged) · a 401-character note and a note with a hidden direction mark: refused in words
("Keep the note to 400 characters.", "Remove the control or invisible characters from the note."), nothing cut · a
principal named in full-width Latin, German, Arabic and Chinese letters reviews and records normally, the record line
wraps at 400 px with no sideways scroll · the client's own answers never count as the firm's preparation (`staff` filter) ·
`GET …/prepare` 114–151 ms bare, 0.71–0.84 s on the 5-person sample case · the audit branch is still a sequential scan
(3 921 rows, 0.95 ms a read) — carried for the Lead.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | J1–J3 complete; J5 blocks the two-person review the moment the reviewer uses the review panel |
| Next step obvious | ½ | J5's refusal offers two escapes, both wrong here (hand the case over, or lose the review) |
| Plain words | 1 | One line, no ids, "nobody recorded" said plainly; refusals name what was not recorded |
| Feedback and state | 1 | Statement asked before anything is recorded; toasts; "Nothing was recorded" with Reload |
| Correct data | **0** | J6 hides a second person's decision; J5/J7 name a person who typed nothing |
| Error recovery | 1 | Reload, stale tab, double click all answered; nothing half-written |
| Accessibility and sizes | 1 | axe 0 at four sizes, keyboard-only path completes (J8, J9) |
| Speed | 1 | 0.12 s bare, 0.71–0.84 s on the sample case, under the §9 budget |
| Visual quality | 1 | One heading, one line, one type size, wraps at 400 px and 200 % |
| Trust and sources | ½ | Licence and time shown, AI/rules findings marked, but the record never says which act made someone a preparer |
| **Total** | **7.5 / 10 — fail** | below 8, and "correct data" is 0 |

**Fixes that would raise the low criteria, most valuable first:** (1) the review's own acts (findings added or decided by
the reviewer, review ticks and stamps) never count as preparation — raises correct data, task completed and next step;
(2) item-keyed audit lines belong to their case (or `filing_item.channel_by` joins the UNION) — raises correct data;
(3) say what each name did ("typed 12 facts", "made the copies") — raises trust.

## Could not test
A real screen reader; an intended user's unaided walk (D17/D20 stay with the founder); C8.2's printed record end to end on
a case with two preparers (needs a validated barcode copy for every form). Nothing was fixed and no scope was added (P-26).

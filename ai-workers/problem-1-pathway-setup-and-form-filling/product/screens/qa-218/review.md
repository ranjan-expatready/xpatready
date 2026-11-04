# QA-218 — review (PR #929, commit 2db26cc18), 4 Nov 2026

Reviewer: did not build this. Scope: `git diff origin/main...2db26cc18` only (`ai-launch.tsx` FormMasters, `forms.tsx` +3 lines,
the new browser check, notes.md). Bar: the QA-218 row in `qa/BUGS.md` (no concept.md for a bug row), P-138, P-149 (1), P-120,
P-175, P-227, STANDARDS, EXPERIENCE. Walked on my own copy `rev218` :4486, reset to the six; journeys and data in
`journey-test-reviewer-2026-11-04.md` (score **8.5 / 10, pass**).

## Done-when, as written in the row
Met. On a fresh copy reset to the six, at 1440 px, the author sees "Saved · US$0" beside IMM 5257 (09-2023) and Guide 5256 page
and on no other row (server plan: only those two have `saved.available`, checked on all 22 recognised attachments of the six).
Each starts with one click (or Enter), posts `{mode:"replay"}` to the one door, makes one REPLAY job at US$0, and its 47 / 13
proposals land in To review (edition group / combination group). Builder's check 17/17, `acceptance/C3.4.test.ts` 20/20 on my copy.

## Code
* Correct: Saved is shown only where the server plan says `saved.available`; the server re-plans and refuses otherwise (409,
  tested). Server authorisation unchanged and holds (plan and draft 403 for approver and content reviewer, 401 with no actor).
  Once-per-edition and the advisory lock hold under a three-request race (1 × 201, 2 × 409 plain words, one job, 13 proposals).
  Double click: busy button, one job. No priced path: no Live button, no `planSha256`, never `{mode:"live"}`. No migrations.
* The check fails when its rules are removed: Saved on every row breaks "IMM 5707 has no Saved"; a non-replay post breaks
  "REPLAY|COMPLETED|0"; a second draft breaks "proposes nothing more". It measures spend and LIVE jobs in the database.

## Issues, ranked
1. **Major (Must) — one request per row.** `web/src/components/ai-launch.tsx:160–162`: `useQueries` posts
   `/attachments/:id/draft-masters/plan` once per recognised non-checklist attachment (8 per Visitor visa Forms view, 6 on With an
   LMIA), each reading saved run files on the server, refetched on every remount and window focus (`staleTime: 0`). STANDARDS §5
   [M] "one request per screen view, not per row", §9 "no request per row", D15. The precedent beside it, Checklists, reads one
   `/combinations/:id/checklist-readings`. Fix: one per-combination read of the saved masters state (attachment id, kind
   form/guide, available, why); Saved still posts `{mode:"replay"}` to the same door, which re-checks.
2. **Minor (Should) — probing by error.** `ai-launch.tsx:160`: non-PDF attachments are probed to learn whether they are a guide;
   on With an LMIA the guide 5553 page answers 400 and Chromium logs "Failed to load resource … 400" on the Forms tab. Fix: comes
   with issue 1 (the server says which attachments are forms or the guide).
3. **Minor (Should) — focus lost after Saved.** `ai-launch.tsx:173–181` with the shared `Button` (disabled while busy): after Enter
   on Saved, focus drops to BODY and the next Tab starts at the top of the page; the result's "Open Proposals" is ~95 Tab stops
   away. EXPERIENCE #12 (keyboard path). Fix: keep focus on the button (aria-disabled while busy) or move it to the result line.
4. **Minor (Should) — no drafted state after reload.** `ai-launch.tsx:187–190`: once a saved run is drafted, a reload shows the
   same blue "Saved · US$0" as before; only a click says "Already drafted with AI". EXPERIENCE (one clear state), D11. Fix: when a
   completed AI masters job exists for the row, say "Drafted · Open Proposals" (the server already knows it under its lock).
5. **Minor (Should) — Live not shown greyed, unlike the plan and the row.** The row expects "with Live greyed and its cost while the
   switch is off"; notes.md plan item 3 says "Live stays off, shown greyed, never clickable here". The code shows only words
   (`ai-launch.tsx:189`), as the Checklists panel does. Not in "Done when", so not blocking, but it is a silent deviation from the
   builder's own plan: record it in notes.md or a challenge.md (P-227 asks for both choices, cost first).
6. **Minor (Should, needs a concept line) — placement.** `pages/workspace/forms.tsx:177`: reusing the existing panel under the
   Sources line is acceptable for the bug (the guide had no other door, the Draft setup panel opens only at Map forms). But it is
   now the last block of a ~3 700 px Forms tab, 93 Tab stops in, the step card does not lead to it, and the tab now always carries
   the rules-pass buttons for every form, which no concept describes. Record the placement in the forms screen's concept (or a
   challenge.md) so the lead can confirm it; no new scope asked.

## D1–D20 (this change only)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | Done-when met; Live-greyed part of the row not done (issue 5) |
| D2 Data integrity | 5 | One job, no duplicates under a three-request race and a double click |
| D3 Reuse | 5 | Reuses the existing plan route, door and panel; no new endpoint, no copy of rules in the browser |
| D4 Rule integrity | n/a | No rules or questions change |
| D5 Stability and recovery | 4 | Reload, second click, rules-after-Saved all answer plainly; issue 4 |
| D6 Freshness and governance | 4 | Job `started_by` user-A, audit +2 lines; no change to governance |
| D7 AI trust | 5 | "Saved AI draft (US$0)", AI pill and Sample on To review; a person accepts, a second approves |
| D8 Orientation | 4 | Inside the combination's Forms tab, breadcrumbs intact; the guide row is labelled "Guide" |
| D9 Flow | 3 | Open Proposals right after the run; panel hard to reach and not pointed to (issue 6) |
| D10 Language | 4 | Plain words per PRODUCT §4; "Guide 5256 page · Guide" repeats itself |
| D11 Feedback and state | 3 | Busy, result, refusal shown; no drafted state after reload (issue 4) |
| D12 Visual quality | 4 | Same look as Checklists at 1440 / 1024 / 200 % |
| D13 Accessibility | 3 | axe 0, keyboard path works, no sideways scroll at 400–1440 px; focus lost (issue 3) |
| D14 Team look | 4 | Team buttons and tokens; demo chrome untouched |
| D15 Speed | 3 | Settled in 414 ms, Saved 811 ms, but one request per row (issue 1) |
| D16 Testability | 4 | Browser check proves the rules it relies on; it ignores console errors (would miss issue 2) |
| D17 First use | simulated only | No intended user walked it |
| D18 Provenance | 5 | US$0 and Saved on the button and the result; To review keeps the AI's source words |
| D19 Capability closure | 4 | Screen → To review closes; Accept is existing C3.4 behaviour (pack 20/20) |
| D20 Pain and wow | simulated only | No intended user walked it |

## P-33 / P-26 / P-86
P-33: the step now works through the product's own screen; the API-only door is closed for both saved runs. P-26: nothing asked
beyond the row. P-86: I did not run `product/tools/graph.mjs`: it rewrites `product/qa/graph.json`, and this review may write only
this file and the journey report. The plan route is named by `check_forms_c34_ai.ts`, `check_forms_c34_ai_live.ts` and the new check.

## Could not check
A real screen reader; a headed browser pane (walk was headless with screenshots); Live (never clicked, by rule); the 1024 px /
200 % walk as the approver beyond "no panel shown"; an intended user's unaided walk (D17, D20).

**Verdict: Block** (one open Major). To fix:
1. Issue 1 (Major): replace the per-row plan requests with one per-combination read of the saved masters state.
Should, not blocking: issues 2–6 (2 goes away with 1).

## Round 2 (048bc1cfe)
Diff-only: `git diff 2db26cc18..048bc1cfe` (`form-masters.ts` readings routes, `ai-launch.tsx`, the check, notes.md; 913441be9
adds only screenshots, and this file and the journey report unchanged). Own copy `rev218` :4486 at 048bc1cfe, reset to the six,
stopped after. Live off; no priced button.

* **M1, fixed.** One `GET /combinations/:id/masters-readings` per Forms view (Visitor visa and With an LMIA: exactly one masters
  request; panel settled in 1.0 s on the loaded machine; route 25–110 ms on each of the six); the Library dialog sends one
  `GET /attachments/:id/masters-reading`. After Saved: the draft POST plus one re-read. `aiDraft` uses the same `aiContext` and
  `usableDone` (same JSON filters as before), so the screen's "drafted" and the door's once-per-source rule cannot drift.
  **No author check: acceptable.** It returns title, saved/drafted booleans and the queue group only (no run file, no cost, less
  than `checklist-readings`, which also returns a run file); the global actor guard still applies (401 with no actor), an
  approver may read it (200) and still cannot draft (403); bad ids give 404.
* **m2, fixed.** With an LMIA: guide 5553 is left out on the server (`[]` for it alone), one request, no console error.
* **m3, fixed.** Keyboard: after Enter on Saved, focus is on that row's "Open Proposals"; Enter on it opens
  `/review/proposals?group=edition:IMM 5257 (09-2023)`.
* **m4, fixed.** After a reload both rows read "Drafted with AI (Saved, US$0): its proposals are on To review. Open Proposals"
  and offer no Saved button; the Library dialog shows the same. No second job (2 REPLAY jobs, US$0, 47 + 13 proposals).
* **m5, m6:** recorded as deviations with recommendations in notes.md; for the tech lead, not blocking.
* Evidence: builder's check 21/21, exit 0 (its four fail→pass steps pass); `acceptance/C3.4.test.ts` 20/20 after a fresh reset;
  axe 0 on the panel after drafting; no sideways scroll at 400, 720 (200 %), 1024, 1440 px; approver sees no panel; 0 page or
  console errors.

New, both Minor (Should, not blocking):
7. **Minor — "Saved" claimed for any AI draft.** `web/src/components/ai-launch.tsx:190` always says "Drafted with AI (Saved,
   US$0)", but `readings` (`api/src/form-masters.ts:196`) counts any completed usable AI masters job, Live included. On a copy
   with the live switch on, a form drafted by a paid Live run would read "Saved, US$0". Fix: return the job's mode (and cost)
   and say "Drafted with AI (Live, US$x.xx)" for those.
8. **Minor — one query per source inside the read.** `api/src/form-masters.ts:191–196` loops the combination's sources and runs a
   `draftingJob.findFirst` (plus file reads) for each: N+1 against STANDARDS §5's wording, but N is one combination's sources
   (≤ 9 on the six) inside one request of 25–110 ms, so no user-visible cost at sample scale (§9). Fix when convenient: one
   `findMany` of the workspace's completed AI masters jobs for the listed contexts, matched in memory.

Round 2 journey score: 9 / 10 (next step obvious stays ½: placement m6; feedback and state and accessibility now 1).

**Verdict: Approve** (no open Blocker or Major; Minors 5–8 for the builder or the tech lead).

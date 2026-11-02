# UX-A part 2: break report (commit 59fbccf1, diff f9a5880a..59fbccf1)

Claim (P-273, UX baseline finding 2): To review's Needs you lists one "Setup step" row for each started combination that is not retired. Each row gives the next step and the problems that block release, with the same count as the Review and release tab's "to fix". The row is under Needs you for the person whose step it is and under Waiting for others for everyone else. A person who cannot fix a blocked release never reads a bare "Nothing waits for you". Steps that have their own rows are not repeated. The menu's number equals Needs you.

Setup: isolated copy `brk_uxa2`. Port 4447 was taken by another agent's copy (`rev_uxa2b`, same worktree), and its start stopped mine, so I used **:4471**. I tested the six (reset-to-six) and the demo sample (reset + load), as user-A (author+review), user-B (approver) and user-C (reviewer+expert). The browser was headless Chromium. Nothing was priced (US$0), no `*_LIVE` setting was used, and :4400 was not touched.

## Breaks

**B1 (Blocker): Needs you now lists steps that no screen lets the listed person take.**
- Steps, demo sample, user-C: `GET /api/review-queue?filter=needs` returns 6 needs. All 6 are Setup step rows: "Choose the checklist page" / "Confirm the checklist page" (×5) and "Confirm who can apply" (×1). user-A gets 2 "Confirm the checklist page" rows. I opened each link:
  - `/c/<id>/forms?focus=pages:record` lands on a read-only text line ("Official pages: … · Choose the checklist page") with no control. No web code calls `/official-pages/confirm`. `before-forms.tsx:2` says the line is "read only until … its Confirm land".
  - `?focus=people:card` as user-C shows the people table with **no button**. `PATCH /combinations/:id/people` as user-C returns **403** ("does not hold the author duty"; `studio.ts:241`).
- The reverse also happens. On Express Entry (six), user-A reads "Waiting for the immigration expert: Confirm who can apply", but user-A's own people save marked the step done.
- Expected: Needs you holds only steps the person can take on screen. `engine/setup-checklist.ts:52-55` keeps confirm_people, confirm_pages and choose_pages out of Needs you because "a mark nobody can clear is noise".
- Actual: `review-queue.ts:288-289` (and the `next` pick at :277) puts any `forViewer(...).filled` step in Needs you, so these rows bypass that rule. The menu badge counts them. user-C can never empty Needs you on the demo, and the founder's demo opens on dead ends.
- Screenshot: scratchpad `shots/people-user-C.png`; the repo's own `uxa2-01` shows the same "Confirm the checklist page" as the author's next step.

**M1 (Major): the row's count differs from the Review tab's "to fix".**
- Steps (six): on Visitor visa I set IMM 5409's channel to Paper (`PATCH …/forms/IMM%205409/channel`, allowed because the form had no record). I proposed "IRCC accepts IMM 5409: PDF upload" as user-A and approved it as user-B.
- Expected: the row and the tab show the same number.
- Actual: the row says "**6** problems block release" with "Fix 6 form problems". The tab says "Review and release **7** to fix" and "7 problems to fix". The 7th is "IMM 5409 is filed as Paper, but the Form library records that IRCC accepts it only as a PDF upload".
- Cause: `programs.ts:183` calls `validate()` without `acceptsOf(...)`, while the Review tab's `studio.ts:389` passes it. The new `blockers` (`programs.ts:245`) inherit the gap.
- From the code, not run: a combination whose only error is this one gets no `:blocked` row, so a non-author can read a bare "Nothing waits for you" while its release is blocked.

**M2 (Major): a release blocker hides another person's next step.**
- Steps (six, fresh), Visitor visa: 6 errors, and the next step is "Choose the checklist page" (expert tier).
- Expected: user-C has the step under Needs you, and the author has the fix.
- Actual: user-C gets **Waiting**: "The configuration author fixes them." The same row reads "Next step · Official pages: Choose the checklist page". For user-A it is Needs you with the "Fix 6 form problems" link, and its text names a step that is not theirs.
- Demo sample, With an LMIA (Live): `PATCH …/people` with spouse filing null. user-C's "Confirm the checklist page" row moves to Waiting and their Needs you drops from 6 to 5.
- Cause: `review-queue.ts:278-284` gives every blocked row to the author only (`continue` at :284). The next step is dropped for everyone else.

**m1 (Minor): setup rows drop the pathway type from the title, so search misses them.**
- One combination has two titles: "Visitors › Visitor visa" on its setup row and "Temporary residence › Visitors › Visitor visa" on its AI-proposals row.
- `q=Temporary residence` finds 6 AI rows and **0** setup rows.
- Cause: `programs.ts:262` uses `r.leaf.path`, while the other rows use `pathOf` (`review-queue.ts`).

**m2 (Minor): plural wording.** user-B, demo sample: "Nothing waits for you, but 5 combinations' releases are blocked" is followed by "**Its** problems are fixed by someone else". "Its" is used for any number (`to-review.tsx:100`).

**m3 (Minor): two sessions disagree for a while.** user-C has /review open (badge 15). user-A creates a blocker. After in-app navigation away and back, and after back/forward, the list says "Needs you · 14" but the badge still says 15. Only a reload or the 15 s poll fixes it (`App.tsx:39`).

**m4 (Minor, from reading the code; not reproduced, needs mapped forms or AI).** Take an empty draft ("Nothing to release yet") whose next step has its own row (review_proposals, view_ai), so `next` is null:
- It falls into the blocked branch (`review-queue.ts:276-285`).
- The author gets an extra "See 1 problem" row pointing to the Review tab.
- Others read "The configuration author fixes it" while the real step is the AI proposals row.

**Observations, not counted**
- With a submission waiting, user-C has two Needs you rows for LMIA: "Confirm the checklist page" (setup) and "Review and sign". This is allowed, because the next step is not sign.
- A stale submission's "Submit again" is Needs you for user-B and user-C, who cannot submit. That row was there before this diff.
- At 400 px the Next step column is off-screen inside the table's own scroll box. This is baseline finding 9 (group C).

## What held
- **Count matches the tab** in every other case (6 + 6 combinations, and after the filing blocker); "Nothing to release yet" is counted the same way.
- **One row per combination.** No setup row repeats AI proposals, sign or release. Rows have `forms: []`, so the guided path (`form-progress.ts` filters by form) and `?form=` exclude them, and `blocked` is 0 under `?form=`.
- **Retired combinations are not listed**, including one under a retired name. I set retired_at by SQL in my own database and restarted, because an approved retire waits for a library release.
- **Real blocker** (`PATCH /people`, filing null) shows "1 problem blocks release of its next version (first: Filing for Spouse or partner: Filing not set)". "Fix 1 problem" lands focused on the people card. user-B and user-C read "The configuration author fixes it."
- **user-B's empty Needs you** names the blocked releases and offers "Show Waiting for others"; it is never bare.
- **Menu badge equals "Needs you · N"** for A, B and C at 1440, 1024, 720 (200 %) and 400 px.
- **Layout and accessibility:** no sideways page scroll, axe 0 violations at 1440 for all three, keyboard Tab reaches the row's link (24 presses), no page or console errors.
- **API guards:** case people get 403 and nobody gets 401. `q` over 120 characters, an unknown `kind`, and `combination` without `form` each get 400. A Hindi `q` works. Kind filter shows "Setup step (6)".
- **Speed:** `/api/review-queue` on the six takes 88 ms cold and 15 ms warm.

## Verdict
**Not ready.**
- B1: on the demo, the expert's whole Needs you, and the menu badge, consists of steps nobody can take on screen. This reverses a recorded rule without saying so.
- M1: the promised "same number as the tab" fails once a "what IRCC accepts" error exists.
- M2: a blocker hides the expert's own step.

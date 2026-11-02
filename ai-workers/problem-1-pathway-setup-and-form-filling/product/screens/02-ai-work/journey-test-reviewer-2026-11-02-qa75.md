# Journey test (reviewer): QA-75, AI job page in plain words, 2 Nov 2026

Commit **e5efc549** (branch claude/festive-turing-gvqe2b). Isolated copy `rev_qa75` on :4466. Live AI off; no priced button clicked; US$0.
This is a bug-fix check, not a full screen: the journeys cover the job page `/c/:id/jobs/:id` only.

## Journeys
1. **Main (content publisher):** opens a field-map step that waits for a person (from AI work). Goal: "what stopped, and what do I do?" Expected: status in words, form named, the step to take, a way back to Forms.
2. **Alternate:** the same with no form linked. Expected: no bare "Form:", says no form is linked.
3. **Rules step:** opens a read_form step. Expected: not called an AI field map; says no AI was called.
4. **Completed field map (regression):** the compare notice, "Compare again (no AI call)" and the Apply bar still show.
5. **Applied field map (regression):** the bar says applied, offers Preview the draft.
6. **Checklist draft (regression):** trail "<combination> › Forms › Checklist draft".
7. **Boundary:** the trail's "Forms" opens the combination's Forms tab; the Forms drawer's reading steps (ModePill/StatusPill in `sources.tsx:69`) still read "Read · Rules only, no AI · Completed".

## What held
* J1: "With an LMIA › Forms › AI field-map draft"; heading "IMM 1295 (09-2023): AI-proposed field map"; pill "Needs you"; notice "Needs you" with the step's message and "Open the Forms tab". No `NEEDS_PERSON`, no "prototype-only exception", no "below" without proposals (`check_forms_qa75_job_page_browser.cjs`, 16/16 twice on :4466).
* J2: heading "AI-proposed field map" plus "No form is linked to this step."
* J3: "IMM 1295 (09-2023): Rules read the form's fields · Rules only, no AI · Completed · Rules did this step; no AI was called."
* J4/J5: walked at 1024 px on the Super visa IMM 5257 replay job (status set to COMPLETED in the isolated database, then back to APPLIED): compare notice, Compare again, "All proposals decided … Apply to draft" bar; APPLIED shows "Applied to the draft … Preview the draft". Layout matches the other pages.
* J6: "Super visa › Forms › Checklist draft".
* Regression suite `check_screen02_slice2_browser.cjs`: 62 PASS, "all passed" on :4466 (its rewritten screenshots were reverted; nothing kept).
* No page errors. axe WCAG 2.2 AA clean on the job page; no sideways scroll at 400 px.

## Findings
* Minor: one status, two words. AI work list (`web/src/pages/ai.tsx:15`) and run card (`components/run-card.tsx:27`) say "Waiting for you", "Done", "Added to draft", "Not needed". The job page opened from that row now says "Needs you", "Completed", "Applied to draft", "Skipped" (`web/src/pages/combination.tsx:189`). The first two pairs were already different; the fix adds two new ones.
* Minor: the fail test's own state (a `field_map` job in mode LOCAL) shows "AI-proposed field map" with the chip "Rules only, no AI". No code creates such a job, so a person will not see it, but the test passes a contradictory page.
* Minor: other job kinds (`rule_fact`, form masters) fall back to the heading "A step of AI work" while the line under it says "Rules did this step; no AI was called" (`web/src/pages/job.tsx:25,59`).

## Score (each 0, ½, 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1: the step to take and the button that leads there |
| Next step obvious | 1 | Notice action "Open the Forms tab" / "Open the AI work" |
| Plain words | ½ | Codes and internal words gone; status words differ from the AI work list |
| Feedback and state | 1 | Status pill plus notice; COMPLETED/APPLIED bars intact |
| Correct data | 1 | Trail label = `combination.label` from the API; form = edition |
| Error recovery | 1 | BLOCKED/FAILED now link to Forms, not the retired Sources |
| Accessibility and sizes | ½ | axe clean, 400 px OK; 200 % zoom and a full keyboard-only walk not done |
| Speed | 1 | Pages ready under 1 s on :4466 |
| Visual quality | 1 | Screenshot at 1024 px matches the house layout |
| Trust and sources | 1 | AI marked (sparkle only on AI maps), replay and rules runs labelled |

**9 / 10, no 0: pass.**

Not tested: a real screen reader; a NEEDS_PERSON job made by the product itself (none is created in code today; only inserted rows); an intended user's walk (D17/D20 stay with the founder).

## Round 2 (aaa1bb3a)
Same copy (:4466), web rebuilt. Journeys 1–7 walked again, plus: 8. running rules step; 9. queued AI step; 10. step with no combination, empty edition, completed map with nothing proposed.
* J1 now reads "Waiting for you" (pill and notice). J3 unchanged. J8: "The rules are working", no step codes. J9: "Waiting to start", no spinner. J10: trail "AI work › A rules step"; heading "imm1295e.pdf: AI-proposed field map"; "Nothing was proposed, so there is nothing to apply." with Apply disabled.
* Fail test 21/21; slice2 suite all passed. Keyboard-only: Tab to "Open the Forms tab", Enter opens Forms. 720 px and 400 px: no sideways scroll. Ready in about 0.4 s.
* Findings (Minor): "Open the Forms tab" on a step with no combination still goes to the address's combination (`job.tsx:67,86-87`); "Preview the draft" uses the address (`job.tsx:116`); "Completed"/"Applied to draft" vs "Done"/"Added to draft" on the AI work list.

| Criterion | Score | Change |
|---|---|---|
| Plain words | ½ | Two status pairs still differ from the AI work list |
| Accessibility and sizes | 1 | Keyboard-only walk and 200 % width now done; axe clean |
| All others | 1 | As round 1 |

**9.5 / 10, no 0: pass.** Not tested: a real screen reader; an intended user's walk (D17/D20 stay with the founder).

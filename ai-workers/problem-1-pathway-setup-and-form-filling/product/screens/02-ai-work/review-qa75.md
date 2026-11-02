# Review: QA-75 fix (AI job page in plain words)

Commit **e5efc549178630cd3d0cc633d104d66924cb88e8**, branch claude/festive-turing-gvqe2b. Diff `origin/main..e5efc549`: `web/src/pages/job.tsx`, `web/src/pages/combination.tsx` (ModePill, StatusPill), `api/src/sources.ts` (`job()` returns `combination {id,label}`), new `tests/check_forms_qa75_job_page_browser.cjs`. Isolated copy `rev_qa75` on :4466; US$0; live AI off.
Bug-fix review: the points of QA-75 and their regressions only, not a full D1–D20 screen review.

## QA-75 points, one by one
| Bug point | Now | Held |
|---|---|---|
| Status `NEEDS_PERSON` | Pill "Needs you" (warn) plus a "Needs you" notice with the step's message and "Open the AI work" / "Open the Forms tab" | yes |
| "Form: AI-proposed field map" | "IMM 1295 (09-2023): AI-proposed field map"; with no form linked, "AI-proposed field map" plus "No form is linked to this step." | yes |
| Chip "On this computer" | "Rules only, no AI" (tooltip "Rules ran on this server; no AI call") | yes |
| "prototype-only exception … provider route" | Gone; basis line in plain words, by mode | yes |
| "the comparison below" with nothing below | That sentence only shows when there are proposals | yes |
| Trail "Sources and forms" | "<combination> › Forms › <step>"; BLOCKED/FAILED now say "Open the Forms tab" instead of "Back to sources" | yes |

Fail test: 16/16, run twice on :4466. Each check fails on the old code (old chip, old basis line, old trail, raw code).

## Regressions checked
* **Completed field map:** the compare notice, "Compare again (no AI call)" and the "Apply to draft" bar still show. Checked at 1024 px with the Super visa IMM 5257 replay job set to COMPLETED in the isolated database, then put back. APPLIED shows "Applied to the draft … Preview the draft". The new `isMap &&` guards only hide these for kinds that never had proposals.
* **Checklist draft:** trail "Super visa › Forms › Checklist draft" (was "Combination › Checklist draft"). The heading and the stub notice are unchanged.
* **Other pill users:** `sources.tsx:69` (the Forms drawer's reading steps) now reads "Read · Rules only, no AI · Completed". It is fine. An unknown status now shows in lower-case words, never as a code.
* **Tests that assert the old wording:** `check_screen02_slice2_browser.cjs:90,126` and `tests/qa/check_qa_explore_1025.cjs:138` wait for "AI-proposed field map". This is still right for field_map jobs, and slice2 ran 62 PASS / "all passed" on :4466. No test asserts "On this computer" or "Back to sources". `check_s5_slice1:55` ("Sources and forms" redirect) is unrelated.
* **Server:** one more `findUnique` per job read, not per row; it is read-only. Authorisation is unchanged.

## Issues
**Blockers:** none.
**Majors:** none.
**Minors:** the builder may fix these now or log them.
1. **One status, two words (PRODUCT §4 one word per thing).** The AI work list (`web/src/pages/ai.tsx:15`) and run card (`components/run-card.tsx:27`) say "Waiting for you", "Not needed", "Done", "Added to draft". The job page reached from that row says "Needs you", "Skipped", "Completed", "Applied to draft" (`web/src/pages/combination.tsx:189`). "Needs you"/"Skipped" are new with this fix. Fix: use the AI work list's words in StatusPill, or log a follow-up to align all three.
2. **The fail test passes a page that contradicts itself.** Its main case inserts a `field_map` job in mode LOCAL, which renders "AI-proposed field map" with the chip "Rules only, no AI" (`tests/check_forms_qa75_job_page_browser.cjs:28-29`). No code creates a LOCAL field map, so users never see it. Fix: insert the case as LIVE or REPLAY.
3. **Unnamed job kinds are called AI work while saying no AI ran.** Kinds missing from `STEP_NAME` (`rule_fact`, form masters, both LOCAL) get the heading "A step of AI work" above "Rules did this step; no AI was called." (`web/src/pages/job.tsx:25,59-60,74`). Fix: use a neutral fallback ("A setup step"), or "AI work" only when the mode is not LOCAL.
4. **Out of this diff, noted only:** "Sources and forms" is still visible text in `web/src/components/ai-launch.tsx:93` and `web/src/pages/ai.tsx:27` (empty states). These are not QA-75 points.

## Journey score
**9 / 10, pass** (`journey-test-reviewer-2026-11-02-qa75.md`). Plain words and accessibility/sizes got ½; everything else got 1.

## Not checked
200 % zoom; a full keyboard-only walk of the job page; a screen reader; a NEEDS_PERSON field-map job made by the product itself (only inserted rows exist; no code path creates one today).

**Verdict: Approve** for e5efc549. No open Blocker or Major; Minors 1–3 are optional or a follow-up.

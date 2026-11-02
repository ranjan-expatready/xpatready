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

## Round 2 (aaa1bb3a)
Diff `e5efc549..aaa1bb3a`: `job.tsx`, `combination.tsx` (ModePill, StatusPill), `ai.tsx` (empty state), the fail test, records. Isolated copy `rev_qa75` on :4466, web rebuilt at aaa1bb3a; US$0, live AI off. `ai-launch.tsx` untouched, as agreed.

| Break point | Now | Held |
|---|---|---|
| M1 running/queued notice | RUNNING rules step: "The rules are working · This page updates by itself", no step or exit code; QUEUED: "Waiting to start", no spinner; AI steps still "The AI is drafting" | yes |
| m1 trail follows the job | Job opened under another combination's address: trail and "Open the Forms tab" go to the job's own combination | yes |
| m2 unnamed kinds | rule_fact/upload LOCAL: "A rules step"; finder_propose LIVE: "A step of AI work"; failed non-map: "This step failed"; error "This step could not be opened" | yes |
| m3 no combination | Trail "AI work › A rules step" | yes (see 1) |
| m4 checklist heading | No attachment: "Proposed document requirements"; Sparkles `shrink-0` | yes |
| m5 unknown mode/status | "weird mode", empty status "No status" | yes |
| m6 waiting message | WAITING/SKIPPED show the step's message | yes |
| m7 empty edition | `edition = ''` falls back to "imm1295e.pdf: AI-proposed field map" | yes |
| m8 Apply with 0 proposals | "Nothing was proposed, so there is nothing to apply." and Apply disabled | yes |
| m9 fixture | Main case now REPLAY; LOCAL chip check moved to the read_form case | yes |
| Round 1 minor 1 (status words) | "Waiting for you", "Not needed" now match the run card | partly (see 3) |
| `ai.tsx` empty state | "…or a form on its Forms tab." | yes |

Fail test 21/21 on :4466. Regression `check_screen02_slice2_browser.cjs` "all passed" on :4466 (its screenshots and stub-pass run files were reverted). No test asserts the removed words. Keyboard walk: Tab reaches the crumbs and "Open the Forms tab", Enter opens the Forms tab. 720 px (200 % of 1440) and 400 px: no sideways scroll. No page errors.

**Blockers:** none. **Majors:** none.
**Minors** (fix now or log):
1. **A step with no combination still links to the address's Forms tab.** The trail now goes to AI work, but `cid` falls back to the URL id (`job.tsx:67`), so the "Waiting for you" / Blocked / Failed action "Open the Forms tab" (`:86-87`) opens `/c/<address>/forms`. Seen on an upload_identity job with no combination. Fix: when there is no combination, link to AI work (or the batch).
2. **"Preview the draft" still uses the address** (`job.tsx:116,125`, `nav(/c/${id}/preview)`), the one link m1 did not move to `cid`. The checklist view also gets `combinationId={id!}` (`:64`); its trail is fine because JobTrail uses `combination.id`.
3. **Status words still differ in two pairs.** The job page says "Completed" and "Applied to draft"; the AI work list and run card say "Done" and "Added to draft". `ai.tsx:15` itself still says "Skipped" where the run card and job page say "Not needed".
4. Noted only: a checklist step in NEEDS_PERSON shows the pill and message but no "Waiting for you" notice with an action. A STUB field map while running says "The AI is drafting" although a stub pass has no AI content.

Journey score: **9.5 / 10, pass** (`journey-test-reviewer-2026-11-02-qa75.md`, Round 2). Plain words got ½.

**Verdict: Approve** for aaa1bb3a. No open Blocker or Major; Minors 1–4 are optional or a follow-up.

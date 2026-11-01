# Review: C4.7, AI drafts a combination's PQR picks; a person accepts or removes each (commit 4ec178e8)

**Verdict: Block (Changes needed)** for 4ec178e8 (branch `claude/forms-c47-pqr-picks`; HEAD b591ff3f adds only screenshots). There are four open Majors. Screen-review verdict: **Ship after fixes**.

Reviewer: an independent session that did not build this. I used isolated copies `rv_c47` on :4463 (started with `STUDIO_AI_LIVE=approved` together with `STUDIO_FAKE_LAUNCHER`, as the check's usage line pairs them) and `rv_c47b` on :4464. I did not use :4400, :4461 or :4462. No model was called (US$0). 1 Nov.
Note: the qa lane's `break-report-c47.md` was written in parallel in this same working tree. Its saved run files briefly made the browser suite's replay step fail (20/21). I reran the suite once those files had been removed, and it passed 21/21. Every number below comes from servers that loaded 4ec178e8 before the later uncommitted edits to `pqr-drafts.ts`, `proposals.ts` and `pqr-picks.ts` appeared in the tree.

## What I re-ran
* `check_forms_c47_pqr_picks.ts 4463 xr_studio_rv_c47`: **40/40**.
* `check_forms_c47_pqr_picks_browser.cjs 4464 xr_studio_rv_c47b`: **21/21**. The screenshots it rewrote were restored with `git checkout`.
* `tsc --noEmit`: the web build is clean. The API has one error, in an unrelated test (`tests/check_c18_age_case.ts:59`), and it was already there.
* `tools/graph.mjs` (it writes only the gitignored `graph.json`): there is no gap for C4.7. Both `pqr-picks` routes are reached by the suites. The only G3 gap is `/attachments/:id/file`, which is unrelated.
* I did not run a rule-removal (mutation) test because I was told not to edit code. Reading the check, each rule R1 to R5 has a fail case that would turn red if its guard were removed (for R2, "Country of birth" with a quote that is not in the guide). The checks prove their labels, but R2 and R5 are only proven at the length and concurrency the tests use (see M1 and M3).

## Concept fit (concept-draft step 6, P-76, P-121, P-130, P-149)
These hold:
* There is one door: picks become `pqr_pick` items on To review.
* The plan states its steps and cost before it runs, and AI now is greyed out with the reason.
* Rules only is never labelled AI.
* A pick is Ready only when both rounds agree, and a one-round pick goes to Decide with both readings.
* Accepting writes a draft tick (AI_PROPOSAL or CODE_MATCH) with the reason, inside the queue's transaction.
* Undo works for 10 s and puts back the person's own draft row.
* Reject needs a reason.
* Retired combinations are refused with 409 in words.
* The approver and content reviewer get 403 when they try to draft. Nobody (no person chosen) gets 401.
* The audit lines name the person, the cost and the reason.

## D1–D20 (1–5)
D1 Requirement fit 4: every step-6 element is present. Rules only is the honest stand-in until P-131 · D2 Data integrity 2: M1, M4 · D3 Reuse 4: a pick ticks an existing fact, never a new one · D4 Rule integrity 3: M3 (R2 can be passed with a one-letter quote) · D5 Stability and recovery 3: Undo works, but bulk accept fails with a 500 (M2) · D6 Governance 4: audit lines name who, how and the cost; M4 records a wrong origin · D7 AI trust 3: quotes and both readings are shown, but a quote of "a" shows as "found" (M3) · D8 Orientation 4: the To review group shows the combination's full path · D9 Flow 5: Draft, then Open To review, then Accept, in 4 key presses from the chip · D10 Language 3: system keys and decision ids reach the screen (m2, m3) · D11 Feedback 4: per-band counts and an Undo toast; "210 questions" misleads (m6) · D12 Visual 4: team components; the dialog reads cleanly at 1024 and 1440 px · D13 Accessibility and responsive 3: axe is clean, but focus is lost after Esc or Accept, and To review scrolls sideways at 400 px and 200 % zoom (m4) · D14 Team look 4 · D15 Speed 3: plan 34 ms, draft 211 ms, but accepting 40 picks takes 4.2 s (M2) · D16 Testability 4: 61 checks; no race test and no length test · D17 simulated only · D18 Provenance 3: M4 · D19 not in scope · D20 simulated only.

## Majors (must fix)
1. **M1. Duplicate picks under a race (R5).** Two `POST …/pqr-picks/draft` calls (rules only) at the same moment left 62 waiting picks for 31 facts. A batch accept that includes both copies then fails as a whole with "already asked". The cause is that the "already waiting" read (`api/src/pqr-drafts.ts:172`) runs outside the insert transaction, and the database has no unique key on waiting picks (`schema.prisma` ProposalItem has only `@@index([workspaceId, kind, identityKey])`).
   *Fix:* a partial unique index on (combination_id, kind, identity_key) WHERE status='waiting', or a per-combination advisory lock around the read and the insert. Add a race check.
2. **M2. Bulk accept of Ready picks times out.** Each pick builds the snapshot 2 to 3 times inside decide's interactive transaction (`proposals.ts:255` with no timeout set, `fact-sources.ts acceptPqrPick`).
   * 40 Ready picks took **4,157 ms**.
   * 80 picks returned **500 after 5,027 ms** (Prisma "Transaction already closed", timeout 5000). Nothing was accepted and the person saw "Something went wrong".
   * `BATCH_MAX` is 200. P-121 requires bulk accept for High items. STANDARDS §9 says no work per row.
   *Fix:* build the snapshot once per batch, or once per combination, and pass it in. Or land the picks in one write after the checks. Add a check that accepts more than 50 Ready picks.
3. **M3. R2 can be passed with a trivial quote.** A saved answer with `quote: "a"` and `quote: "the"` was proposed as **Ready**, shown as "IRCC's words … found", and could be accepted together (`engine/pqr-picks.ts:418`, `text.includes(sameText(p.quote))`). P-153 says code is the guard, and P-121 says the quote must be found in its source.
   *Fix:* require a sentence-sized quote (for example 20 characters and 4 words or more) that sits on word boundaries. Add a fail case to the check.
4. **M4. Edit lands any fact for any person, recorded as the rules' pick.** `decide {action:"edit", payload:{kind:"pqr_pick", role:"child", factKey:"person.family_name"}}` on the rules pick `principal|person.citizenship` ticked the child's family name. The tick has origin `CODE_MATCH`, the item keeps identity `principal|person.citizenship`, and its decided key is `child|person.family_name`. That is wrong provenance in what is released.
   *Fix:* refuse an edit that changes role or factKey, or land it as a person's tick (origin HUMAN) with the new identity (`proposals.ts:270-273`, `landPqrPick :213`).

## Minors (should fix)
1. **The plan is readable by a client.** `POST …/pqr-picks/plan` as `user-P` (Client A) returned 200 with the configuration (candidates, guide, cap left). `GET …/fact-sources` refuses the same person with 403. *Fix:* use `readerOf(a)` (`pqr-drafts.ts:191`).
2. **System keys on screen.** This change's Undo refusal says "tick for \"principal|person.criminal_history\"" (`proposals.ts:273`). Already-existing queue messages on this path also show keys: the bulk refusal "\"principal|person.citizenship\"" and the toast "landed as principal|…". *Fix:* use the pick title.
3. **Decision ids and rule keys shown to a person.** The dialog shows "(P-110, P-131)" (`pqr-drafts.ts:77,82`). The side panel shows "pqr subset of sqr", "quote found" and the inventory JSON file path, and the Kind column says "Program question pick" (`contracts/review-proposals.ts:19`) while the button says "pre-qualification".
4. **Focus is lost.** After Esc on the draft dialog, focus goes to BODY: the dialog is mounted with `open` always true, so Radix has no trigger to return focus to (`pqr-draft.tsx:26`). After Accept or Reject in the side panel focus is also lost; that part already existed. To review scrolls sideways at 400 px and 200 % zoom (the group card, 614 px wide); that layout already existed.
5. **Removed picks come back.** Picks removed with a reason come back as new picks on the next draft, with no trace of the removal (`pqr-drafts.ts:172` excludes only waiting picks). Reject's own words say "the producer learns from it".
6. **The plan's count misleads.** It says "210 questions a prospect could be asked", but rules only then proposes 32 (`pqr-drafts.ts:129`).
7. **R3 checks length only.** `why: "..."` passes (`pqr-picks.ts:420`).
8. **A drafting job can stay RUNNING.** If a round throws (instead of returning `ok:false`), the job is never closed (`pqr-drafts.ts:148-178`). I read this in the code and did not run it.

## What I could not check
* A real screen reader.
* A headed (visible) browser: the walk was headless Chrome with keyboard only.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* A real saved AI run (none exists until P-131).
* Rule-removal runs (no code edits allowed).

The journey score is in `journey-test-reviewer-c47-2026-11-01.md`: **7/10, fail**.

**Verdict: Block.** To fix: M1, M2, M3, M4.

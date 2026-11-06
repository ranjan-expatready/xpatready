# C7.6 — B2 Ready to file by screens: independent review (PR #1171)

**Commit reviewed:** `804c044306eb0fdb80eb1f4c08fe2a5953d50f51` (branch `claude/sweet-knuth-ap2gza`), 6 Nov 2026. Reviewer: a fresh session that did not build it (skills `screen-review` and `journey-test`, reviewer role).
**Bar:** sprint row B2 and journey J-B2 (`design/m3-sprint-plan-2026-11-06.md` on `claude/plan-m3-sprint-cd84b8`, sections 4 and 6); `screens/M3-design-2026-11-04/prepare-tab/concept-draft.md` r2, BR-8 and BR-11 only; `STANDARDS.md`, `EXPERIENCE.md`, `QUALITY.md`. Out of scope as briefed: the rest of the Prepare application tab, History, P-380, concept change (a), the unchanged API routes (reviewed on #861).
**How:** isolated copy `rv_b2` on :4434 (web build current for this commit). The builder's check `tests/check_c76_ready_browser.ts` run twice: 46/46, exit 0, both times (2 min 38 s). Two walks of my own in Playwright (scratch scripts, not committed): a second single-adult case on the configured checkpoint, walked as the case officer, the representative of record and the client, plus a break pass. Journey report: `journey-test-reviewer-2026-11-06.md` (score **8.5/10**, pass).

## Done-when, line by line
| Done when | Result | Evidence |
|---|---|---|
| Officer and representative take one filing from not ready to Ready to file by screens only, each warning passed with a recorded reason | Met | Builder's check steps 4–40; my walk: 8 open lines → 7 passed by the officer, review by user-R → Ready to file in 480 ms. `readiness_pass` holds one row per pass with `passed_by` and the reason; the screen shows "— passed by Case officer (Sample), Nov 6, 2026, 03:25 p.m." The case and its facts are set up by the pack's helper (C6.1 and C4 have their own screens), so "by screens" starts at "not ready" |
| A pass without a reason refused on the field | Met | Empty and "1234" refused, `aria-invalid="true"` with the server's words "Say why this warning is passed…", 0 rows stored; a 360-character reason refused on the field with "Keep it to 300 characters." |
| Screen and `GET /prepare` show the same state in the same words | Met | `same()` in the check compares the pill with `filings[].status` and every open line with `readiness[].blocks/warns[].words`, at four states |
| `route-has-screen.mjs` passes without the three QA-229 lines | Met | 51 routes, 42 with a screen, 9 allowed, 0 with neither; the three calls are at `readiness.tsx:83, :164, :210` |
| axe clean, no sideways scroll at 1024 px | Met | axe (WCAG 2.2 A/AA) 0 on 7 states; scrollWidth equals the width at 400, 1024 and 512 px (1024 at 200 %) |
| `acceptance/C7.6.test.ts` unchanged | Met | `git diff origin/main...804c04430 -- acceptance/C7.6.test.ts` is empty |
| QA-229: the form rows' own "Ready to file" pill and "What blocks filing" go | Met (one Minor below) | `forms.tsx:139-141`, `:148`; no "What blocks filing" left in `web/src` |

## Concept fit (BR-8, BR-11) and roles
* BR-8: the panel reads `readiness[]` and `filings[].status` and computes nothing. Lines are grouped by `owes` in the engine's ORDER (`readiness.tsx:28`, `:124`), never a percentage (the count line counts the server's lines).
* P-155: "Review the filing" shows only when the person acting is `readiness.representative` (`:100`, `:108`). The case officer does not see it (check step 8, my walk); the server answers 403 to the officer's POST, and 403 to a client's pass. A block cannot be passed: no button (`:180`), and the server answers 409 "No validated copy read back blocks Ready to file and cannot be passed: fix it instead."
* BR-11: the client never reaches the panel ("This page is for the case officer"). A 409 on Ready to file and on review shows its own `detail`; on a pass it does not stay on screen (m1).
* Data underneath: a double click on Pass stores one row; two tabs passing the same line store one row (the server's row lock); the review stores `reviewed_by` user-R, kind `reviewed`, for the facts hash read.

## D1–D20 (1–5)
D1 Requirement fit 4: every J-B2 step is met; a block's no-pass path has no test (m5) · D2 Data integrity 5: one row per pass under a double click and two tabs; the review is bound to `facts_hash` · D3 Reuse 4: team `Pill`/`Field`/`Notice`, but the status-words map is a copy of `submission.tsx:21` (m6) · D4 Rule integrity 4: the server decides everything; the header paraphrases `status_rule` (m3) · D5 Stability 4: a refusal clears itself once lines change; reload is safe; focus is lost after a 409 on a pass (m1) · D6 Governance 5: who, when and the reason are shown and stored, with the licence on the review · D7 AI trust n/a (no AI) · D8 Orientation 4: a section under Prepare application, one block per named filing · D9 Flow 4: one action per line, Ready to file always offered (J-B2 wants the refusal) · D10 Language 3: "Critical warning" pill beside "CRITICAL: …"; "before filing" left on form rows; no tooltips on the status pills (m2, m4, m7) · D11 Feedback 4: toasts, errors on the field, refusal listing the lines; m1 · D12 Visual 4: team look; toasts stack over the passed list at 1440 (`w4` in my walk) · D13 Accessibility 5: axe 0, keyboard path, focus moved to the field, back to the opener, to the heading after Ready · D14 Team look 4 · D15 Speed 4: the panel shows in 0.3–0.5 s on a warm page (1.8 s on a cold first page load), Ready in 0.5 s, one `/prepare` and one `/team` read per case · D16 Testability 4: 46 checks, pass and fail per rule; the block path untested (m5) · D17 simulated only · D18 Provenance 4: server words, who and when · D19 Closure 4: ends at C8.2's first step (Record the submission enabled, missing number refused) · D20 simulated only.

## Findings
No Blocker. No Major.

* **m1 (Minor, Should): a 409 on a pass is never seen, and focus is lost.** `readiness.tsx:168-171`. Fail scenario: two case officers open the same line; A passes it; B presses Pass. The server answers 409 "There is no open "A missing signature" warning on this filing to pass. Reload.". `err.form` is set, then the invalidate re-reads `/prepare`, the line leaves `warns[]` and `OpenLine` unmounts with its message (no alert after 200 ms, no toast). B's reason is dropped without a word and the focus lands on `body`. Data stays right (one row, A's). Fix: on a 409 also push a toast with the problem's `detail` (BR-11 "a 409 shows the problem's own detail") and focus the filing heading.
* **m2 (Minor, Should): form rows still say "before filing" next to a filing that is Ready to file.** `forms.tsx:141` ("1 fact to answer or confirm before filing") and the Filed reason "Not yet: n facts to answer or confirm before filing". Fail scenario (my walk): the filing reads "Ready to file" with the missing-facts warning passed with a reason, while IMM 5257 and IMM 5257 SCH1 each still say "1 fact to answer or confirm before filing". That is two states for one thing (EXPERIENCE "one clear state", P-238). The safe direction, so Minor. Fix: drop "before filing" ("1 fact to answer or confirm"), or point to the readiness panel.
* **m3 (Minor, Should): the panel writes its own rule sentence instead of the server's.** `readiness.tsx:54` paraphrases `readiness[].status_rule` (`api/src/readiness-inputs.ts:102`). If the rule changes (P-172 adds an Express Entry block), the screen goes wrong. Fix: show `status_rule` (it is already in the read).
* **m4 (Minor, Should): "Critical warning" said twice.** `readiness.tsx:32` and `:178` add a "Critical warning" pill before server words that already start with "CRITICAL: ". Fix: keep one (for example, the pill plus the words with the prefix stripped, or the words alone).
* **m5 (Minor, Should): the block path has no test.** Remove `l.severity !== "block"` at `readiness.tsx:180` and no check fails: the checkpoint's filing has no block. The server still refuses (409). Fix: one step on a PDF-upload barcode form with no validated copy: "Blocks: fix it" shown, no Pass button.
* **m6 (Minor, Should): duplicated status words.** `readiness.tsx:30-31` copies `submission.tsx:21`'s map ("no duplicated logic between web and API" / one source for words). Fix: export one map and import it in both.
* **m7 (Minor, Should): no tooltip on the status and severity pills.** `readiness.tsx:106`, `:178` (EXPERIENCE §2.10 "tooltips on every status"); the form rows' pills have `title`. Fix: a `title` per status ("Not started: what stands is listed below"…).
* **m8 (Minor, Could): the reason field allows 400 characters, the server 300.** `readiness.tsx:185` `maxLength={400}` against `passProblem` (300). It is refused on the field, so Could: set `maxLength={300}`, or add a hint.
* Note (not a finding): "Not started" is `/prepare`'s own word for a filing with every fact filled. Done-when asks for the server's words, so the screen is right. Whether the server should say "Not ready to file" is a question for the tech lead (J-B2 says "not ready").
* Note: the PR body still reads "In progress" under Checks, On the demo and Questions. Its Plan item 5 says `tests/runtime/`; the check is in `tests/` for the CI reason in the brief. Update the body before merge.

## Could not check
A real screen reader; an intended user's unaided walk (D17, D20 stay with the founder); the self-reviewed path (a representative who is also the officer: only read in code, `readiness.tsx:217`, `:228-233`, which looks right); a second representative who is not of record (read in code only, `:100`). `graph.mjs` runs clean (G1 0, G4 0, G5 0); it does not map runtime case pages, so the three routes show `viaBrowser: false` there, a tool limit that predates this PR. While I worked, other processes on this machine (a `roles.ts` on :4435 and other copies) rewrote tracked screenshots under `screens/C6.1-open-case/`, `K13-sqr-names/` and `W1-questions-and-documents/`. I did not change them, and nobody should commit them with this review.

**Verdict: Approve** — commit `804c044306eb0fdb80eb1f4c08fe2a5953d50f51`. No open Blocker or Major; m1–m8 are Minor (m1 and m2 first if the builder takes any).

## Re-review (diff 43ecdeecd..a391f5dc1)
**Scope:** only `git diff 43ecdeecd..a391f5dc12d859d4a556389a1ae429b6233ef16e`, which changes `web/src/runtime/readiness.tsx`, `tests/check_c76_ready_browser.ts`, the breaker's `B2-break-report.md` and the B2 screenshots. Rebuilt `web/dist` at a391f5dc1, isolated copy `rv_b2` on :4434, live AI off.
**Runs:** the builder's check gave 53/53, exit 0, including the new F1 and F2 checks and their focus checks. My own re-walk used scratch scripts, not committed. I did not re-run the old-code failure proof the builder reports (4 FAIL with 43ecdeecd's panel). I read the new steps: each checks a state the old code could not reach (the F1 notice after the refresh; the F2 form closed and 0 reviews), so it can fail.

| Change | Result | Evidence |
|---|---|---|
| F1: a stale tab's Ready to file refusal | Fixed | `refused()` re-reads the view, then sets the notice keyed to the lines open now (`readiness.tsx:95-102`). The effect at `:92` clears it only when that key changes. Check: the notice stays and lists the lines open now. |
| F2: a review after a facts-changed 409 | Fixed | `read` holds the `facts_hash` taken when the form opened (`:242`, `:230`). A refusal that is not about a field closes the form (`:239`). Check: refused, form closed, 0 rows; a second "Review the filing" records 1 row. |
| My m1 (F3, F4): a pass 409 never seen, focus lost | Fixed | Two tabs: tab 2 shows "Not passed: There is no open "A missing signature" warning on this filing to pass. Reload." under the filing, with the focus on the filing heading. The notice goes once tab 2 passes another line. axe 0 and no sideways scroll at 1024 px in that state. |
| F6: Review when the review warning was passed | Fixed | `canReview` reads `!r.reviewed` (`:120`). `reviewed` is null unless the representative of record reviewed these facts (`api/src/readiness-inputs.ts:99`, `:103`). Walk: the officer passed the review warning, user-R still saw Review the filing, reviewed (1 row), then the button left; the officer never sees it. |
| F8: Escape closes the forms | Fixed | Keyboard path: Escape in the reason box returns focus to its "Pass with a reason…" (focus events traced). Escape in the review form behaves the same. |
| My m8 (F9): the reason length | Fixed | `maxlength="300"`, with the hint "Up to 300 characters." |
| My m4 (F7c), my m7 | Fixed | No tag on CRITICAL lines (their words say "CRITICAL:"). Pills have a `title`, e.g. "Not started": "Not marked Ready to file yet". |
| F10: the shared `/prepare` key | Fine | The key no longer includes the actor (`:53`, `:58`), the same key as `submission.tsx:50`. `/prepare` is the same for every staff member; who may review is still worked out from the actor (`:120`), and the server still refuses (403). |

**Still open, all Minor, reasons accepted:**
* m2: "before filing" comes from the shared `notReady()`.
* m3: `status_rule` carries a decision code, which EXPERIENCE §5 keeps off the main path.
* m5: there is no block on the checkpoint's filing by screens.
* m6: the status-words map is still a copy.

None blocks; I raise no new scope.

**New, Minor (Could):**
* n1: after a refused pass or review the page has already re-read the view, yet the server's words still end "Reload." (`api/src/readiness.ts:95`, `:74`; the other-tab case can also get `:106`; the screen shows them as given, BR-11). A later API change could say "This was passed meanwhile". This PR need not change it.

No Blocker, no Major. My score stays 8.5/10. Feedback and state is better now (the refused passes show), but the open plain-words points (m2, m3) keep it at ½.

**Verdict: Approve** — commit `a391f5dc12d859d4a556389a1ae429b6233ef16e`.

# B3 — Sign and scan by screens (C8.1): review

PR #1221, branch `claude/blissful-rubin-fn9ymy`, **reviewed commit `d7837f605`** (diff `origin/main...d7837f605`). Reviewer agent, fresh context; 7 Nov, ~14:40 IST. Isolated copy `rev_b3` on :4444 (stopped). Journey test: `journey-test-reviewer-2026-11-07.md` (**9/10, pass**).
Note: during the review the branch moved to `b145f0e79` (allow-list lines put back). That head is not reviewed. On it, `route-has-screen.mjs` exits 1 ("ALLOW-LIST LINE NOT NEEDED", lines 9 and 10). With `d7837f605`'s allow file it passes (0 misses, 0 stale).

**Verdict: Block** (one open Major). Skill wording: Ship after fixes.

## Runs
* `tests/check_c81_sign_browser.ts 4444 xr_studio_rev_b3`, three runs on the same copy: **53/55 (exit 1) · 55/55 · 53/55 (exit 1)**. Run 1 failed the BR-8/M1 fail-guard and M2. Run 3 failed M2 and "keyboard: after the refusal the focus is back on the upload button".
* `tests/check_c81_signing.ts` 18/18 · `web` `tsc --noEmit` exit 0 · `graph.mjs --check` exit 0 (C8.1 named by 5 tests) · `select-suites.mjs` picks the new browser check for this diff, so CI and the merge queue run it.
* My own walk (scratch script; screenshots in my scratchpad): a new case, then Generate, double-click Printed, double-click Signed by hand, then a scan whose 190-character Cyrillic/Japanese/Latin name is stored exactly. Result in the database: one row per step. 3 audit lines, each with who.

## Concept fit
Every BR is present and behaves as written. BR-1: who signs is shown on every row, including "nobody" and "not set". BR-2: no block on IMM 5257. BR-3: one button. The waiting words equal the 409 because `sign-order.ts` is moved unchanged and re-exported (diff checked line by line). BR-4: the copy id is stored, and the fill trial is warned, not blocked (seen in the walk). BR-6: a refusal stays on the field and nothing is stored. The checksum sits behind a "Checksum" disclosure you can reach by keyboard. BR-7: "Go to Ready to file" moves focus to the panel, and the panel is in view. BR-8 follows the server's `restart`. BR-9: the client gets 403 on GET and POST, another firm 404 "No such case.", and the client view has no block. BR-10: read-only once recorded. The challenge's M1, M2 and M3 are all addressed.

## Issues, ranked
**Major 1 (Must): the J-B3 check is not repeatable (red in 2 of 3 runs).** It is in CI's selected set, so it would turn a merge batch red. It would then be quarantined (WAY-OF-WORKING "a test failing without a code cause"), and the M1 and M2 proof would be lost. Two causes:
* (a) Test: `open()` waits only for `[data-readiness]`, no `aria-busy` and no `.animate-spin` (`check_c81_sign_browser.ts:66,70`). The block's item read shows a `Skeleton` (`animate-pulse`, `sign-steps.tsx:187`), and while it loads there is no `[data-sign-again]` or `[data-sign-readonly]`. The instant `isVisible()` at `:124` and `:217` then fails. The run-1 failure text, captured a moment later, already shows the sign-again box, and my screenshot of the read-only state is correct. *Fix:* in `open()`, wait for `[data-sign-block] [data-step]` (or `waitFor` the expected element) before asserting.
* (b) Product: after the server refuses a scan, `focusLater(...querySelector("button"))` runs while `busy` is still true (`sign-steps.tsx:112`; `setBusy(false)` comes later, in `finally`, `:114`). The button is `disabled`, so focus is sometimes lost to `<body>` (EXPERIENCE §2.12 [M] keyboard path). The step path already waits for `!busy` (`:88-92`). *Fix:* use the same `focusNext`-style effect, or clear `busy` before focusing.
* *Proof:* run the check 3 times in a row, all green.

**Minor (Should)**
1. The sign-again box says "The signed IMM 5476 is out of date … The earlier scan is kept." even when only Printed is done (`sign-steps.tsx:193`; screenshot `B3-03-printed-copy-out-of-date-1440.png`). Nothing is signed and there is no scan, so the words are untrue. Say "The printed copy is out of date…", and add "the earlier scan is kept" only when a scan exists.
2. With no copy, the Printed step shows both "Download the copy above, print it, then record it here." and "Generate a copy of IMM 5476 above first…" (`:146`; `B3-01-not-printed-1024.png`). Show the download hint only when there is a `current` copy.
3. STANDARDS §5 [M] "one request per screen view, not per row" is not met. There is one `GET /runtime/items/:id` per hand-signed row (`:80`). The challenge accepted this at two rows. Follow-up for the runtime lane: put the steps and scans on `/prepare`'s items.
4. The client-role check waits a fixed 1.5 s, then counts 0 blocks (`check:239-240`). It passes even if the page never loaded. Wait for the client's page to render first.
5. The fill-trial warning (BR-4 "warned, not blocked", `[data-unproven]`) has no assertion (STANDARDS §3.10: every rule has a passing and a failing test).
6. `nameOf` falls back to the raw actor id (`:84`). That would put an ID on the main path (EXPERIENCE §5) for a user not on the team or firm list.
7. At 400 px the label column keeps `min-w-48`, so the detail column is about 90 px wide (walk screenshot). There is no sideways scroll. 1024 px and 720 px (200 % of 1440) are fine; 400 px is below the [M] bar.
8. Records: the concept has no retrofit mapping to the team's code (skill item 6). Graph G3 lists `POST /runtime/items/:id/signed-scan` as reached by no test. That is a false positive, because the graph does not see `FormData`/`sendFile` calls; this check and the C8.1 pack reach the route.

Not counted, as the brief said: the server does not refuse steps on a recorded application, a stale tab after a restart (Not built), and "refused" vs "prevented" wording in J-B3/J7 5.7. I agree with all three as follow-ups.

## [M] lines
**STANDARDS:** §3.4 checked twice: met (order, copy, duplicate 409 on the server; a double click stores one row). §3.10 pass and fail tests: met, except Minor 5. §4 concurrency: met (unique step, 409 in words; two scans at once roll back by reading `:144-148`). §5 no migration: met; one request per view: not met (Minor 3). §6 server authorisation: met (403/404). §6 field-level errors: met. §6 zod contracts: types are local by the prepare-tab §2 ruling. §7 no duplicated logic: met (`sign-order.ts`), no `any`. §7 axe on every state: met on 9 states (my walk too); not run on loading or could-not-load. §7 a rule's test fails when the rule is removed: by reading, `:100` (BR-3 vs 409), `:124` (BR-8), `:163` (BR-7) and `:217` (M2) would fail; I ran no mutation. §8 uploads: met (bytes, size, app folder).
**EXPERIENCE:** §1 status by shape and text, one primary action, demo chrome separate: met. §2.5 one next action: met. §2.8 prevent: met. §2.9 warn: met. §2.10 errors on the field and a status tooltip: met. §2.12: not fully met (Major 1b). §4 states (empty, loading, error with Retry, long content, read-only, conflict): met. §5 no hashes on the main path: met (Minor 6 edge).

## D1–D20
| D | Score | Evidence |
|---|---|---|
| D1 | 4 | Every BR and J-B3 through to "Record the submission" enabled |
| D2 | 4 | Order, copy and duplicates refused by the server; one row per step after a double click; append-only scan |
| D3 | 5 | One order rule for web and API; reuses the copy block, `MAX_DOCUMENT_MB`, the upload door |
| D4 | 4 | Steps only on HAND_SCANNED; BR-8 equals the server's `restart` |
| D5 | 3 | Reload keeps the state; stale tab gives a 409 in words; but the check is not repeatable and focus is lost after a refusal (Major 1) |
| D6 | 4 | An audit line per step and per scan, with who; who and when on screen |
| D7 | n/a | No AI on this screen |
| D8 | 4 | Inside the form's own row, under its copy |
| D9 | 5 | One button; every waiting step says why |
| D10 | 4 | Server words throughout; Minors 1–2 |
| D11 | 4 | Toasts, done lines, state pill, busy button, refusal notice |
| D12 | 4 | Team tokens and components; matches the copy block |
| D13 | 3 | axe clean on 9 states; 1024 and 200 % pass; focus race (Major 1b) |
| D14 | 4 | Same components and words as the prepare tab |
| D15 | 4 | Steps 0.35 s, upload 0.8 s, Generate to the Print button 1.3 s; one request per row (Minor 3) |
| D16 | 3 | Pass and fail per BR, but 2 of 3 runs red |
| D17 | simulated only | No intended user walked it |
| D18 | 4 | Copy named, signers named, recorded by and when, checksum |
| D19 | 4 | Generate, sign and scan, Ready to file, Uploaded to IRCC and Done all by screens; recording via the API in the check (C8.2's) |
| D20 | simulated only | — |

## Could not check
A real screen reader. Real browser zoom (I used a 720 px viewport). Mac Chrome (I used Linux Chromium). A mutation run. An intended user's unaided walk (D17, D20).
Side effect: my copy's runs rewrote tracked evidence files (`prototype/p2/runs/stub-pass/*`, `p2/screening/canary-digest.json`, `studio/evidence/ai-orchestration/check_ai_orchestration.json`) and the committed B3 screenshots. I restored all of them with `git checkout`.

**Verdict: Block** on `d7837f605`. To fix: Major 1 (a) and (b), then three green runs of `check_c81_sign_browser.ts`. The Minors can be fixed or listed in the PR.

## Round 2 (diff only, P-293): `d7837f605..29f605b05`, 7 Nov ~15:30 IST
Reviewed: `git diff d7837f605..29f605b05`. `b145f0e79` only puts the allow-list file back to main's version. Its two lines are the tech lead's to remove (asked on the PR), so `route-has-screen.mjs` exits 1 until then; this is not counted against the row. `29f605b05` adds only screenshots.
**Runs (my copy `rev_b3` :4444, at `29f605b05`, stopped afterwards; the screenshots it rewrote were restored):** `check_c81_sign_browser.ts` three runs in a row: **57/57, 57/57, 57/57 (exit 0 each)**. `web` `tsc --noEmit` exit 0.
* **Major 1 (a), closed.** `settle()` also waits until there is no `[data-sign-block] .animate-pulse`. `open()` waits for `[data-sign-block] [data-step]`. `[data-sign-again]` and `[data-sign-readonly]` are each waited for before they are asserted (`check:67,71-74,135,230`).
* **Major 1 (b), closed.** All focus moves now go through one `focusTo` effect, which runs only once `busy` is false (`sign-steps.tsx:89-94`). That covers each step, each refusal, the browser's size and empty checks, and the server's file refusal. "Focus back on the upload button after the refusal" passed in all three runs.
* **Breaker M1, closed.** The done "Signed by hand" line no longer names today's signers. It shows only who recorded it, which is all the record holds. The fail-guard is at `check:155`.
* **Breaker M2, closed on the screen.** `printedCopyStale()` runs before "Signed by hand" and before the scan. It refetches the forms query (prefix `["runtime","view",caseId,"forms"]`, which matches `forms.tsx:27`'s key). On an out-of-date printed copy it refuses in words and sends nothing. Tested at `check:129-133` (nothing recorded), and the screen matches. `refetchOnWindowFocus` is set on the item read. The server half (STANDARDS §3.4, "checked twice") is the runtime lane's follow-up, together with breaker M3. Both are asked on the PR and are not this row's file.
* **Minors 1, 2, 4, 5, 6, 7, closed.**
  * 1: "The printed copy of IMM 5476 is out of date: a fact on it changed. Print a new copy and have that one signed." when there is no scan (seen in my run's B3-03).
  * 2: the Download hint shows only when there is a current copy.
  * 4: the client check waits for the page to render.
  * 5: pass and fail for the fill-trial warning (`check:112,117-118`).
  * 6: no raw id.
  * 7: `sm:min-w-48`.
  * Also: once recorded, the reason line is hidden (breaker m7).
  * 3 and 8 are follow-ups listed in the PR.
* **New, Minor (Should):** while the team or firm list is still loading, `nameOf` shows "a person no longer on the firm's list" (`:84`), which is wrong for that moment. Show nothing until the lists have loaded. Not gating.
* **Not changed by this round:** the concept's §5 still says "Signed by {who signs} · recorded by …". Breaker M1 overturns that line, so it belongs in `concept.md`'s build discoveries (never deviate silently). This is a records step for the builder; it does not gate.
**Scores changed:** D5 4 (reload, double click, stale tab and stale page all hold; the check is repeatable). D13 4 (the focus race is gone). D16 4 (pass and fail per BR; 3 of 3 green, run by someone other than the maker). Journey score 9.5/10: accessibility is now 1, plain words stay ½ (the loading-name Minor).

**Verdict: Approve** on `29f605b054d65fff25990552fa2129f68438b969`. No open Blocker or Major in this row's code. The server-side halves (breaker M2 server, M3, refusals on a recorded application) are runtime-lane follow-ups on the PR.

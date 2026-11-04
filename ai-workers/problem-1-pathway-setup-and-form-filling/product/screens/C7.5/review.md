# Review: C7.5 part 1, rules cross-checks and Review findings (runtime lane, M3-E), branch `claude/runtime-cross-checks`

**Reviewed commit 9d654e170** (base origin/main 48954b537; `git diff origin/main...9d654e170`). The reviewer did not build this. 3 Nov, IST. US$0: no live switch, no priced button, `ai_batch` unchanged (its 1 row is the setup's REPLAY, US$0.00).
**Head moved during the review:** from 23:49 IST the worktree had uncommitted edits to `api/src/findings.ts`, `contracts/findings.ts`, `engine/runtime/cross-checks.ts`, the migration, `web/src/runtime/findings.tsx` and the three C7.5 suites. Every run below was on 9d654e170. My copy started at 23:40, the server never restarted and the web bundle was built at start. Re-check the next commit against this list.

## Runs (own copy `rev_c75` on :4437, fresh database; never :4400)
* `check_c75_cross_checks.ts` **18/18** · `check_c75_findings_api.ts` **39/39** on the fresh copy. It runs the pack and needs C7.5-1…4 and 10…14.
* Pack `acceptance/C7.5.test.ts` **9/16**: 1–4 and 10–14 pass. 5–9 and 15 fail with 404, because the review-runs route is part 2, as the row says.
* `check_c75_findings_browser.cjs` **flaky: 4 of 8 runs failed**: "timed out waiting for 1 resolved" in runs 2, 4, 5 and 6, while runs 1, 3, 7 and 8 passed 23/23. See M1.
* `graph.mjs`: G1 0, G2 0. All 5 findings routes are reached by `check_c75_findings_api.ts`, and none of them is in G3. C7.5 is still "Not built", as expected until part 2.
* Typecheck (api and web tsconfig): no error in the new files. Forbidden files are untouched (proposals, validate, programs, form-completeness, studio, screen02, api programs, contracts/runtime). `cases.tsx` has 1 import and 1 line.
* Reviewer probes (curl, psql, Playwright): the GET takes 16–19 ms warm and the page makes 1 findings request. Client 403, author 403. A reason of spaces, of 1001 characters, or a body that is not JSON: 400. `?source=rules&source=ai`: 400 in words. Three parallel reads: 1 row. Two tabs acknowledging the same finding: the second gets "This finding is acknowledged already…" on the field. Hostile `<img onerror>` in a note is shown as text. **Double-click on "Add finding": 2 rows** (M2).

## Builder's decisions, judged
* **Rules reconcile inside GET (a read writes):** agree. The result depends only on the facts, it costs US$0, it is fast, and the partial unique index keeps parallel reads to one row (tested). The panel shares the questionnaire's query key: fixing the spouse's passport in the agent view resolved the finding with no reload (walk).
* **Dismiss refused for CRITICAL:** agree. Otherwise Dismiss would get around the waive permission.
* **Waive only by the current LEAD_REPRESENTATIVE:** agree as BR-19's "permission" (Sample). The UI still offers Waive… to people who cannot waive (m4).
* **Resolved rows keep the earlier reason:** agree, but the wording is wrong in some cases (m3).
* **Severity checked before the reason:** agree; it matches C7.5-12.
* **Audit entity "case":** agree. The detail carries the finding id, and no value or typed reason is logged (tested).
* **Pack edited by the builder** (steps 10–13 fall back to rules findings when there is no saved AI run): the change is sound. The AI path is unchanged and comes back by itself in part 2. But `acceptance/README.md:13` says "the tech lead changes it, never silently": state it in the PR's first line and have the tech lead ratify it (m1).

## Issues, ranked
**M1 (Major, Must) The order of findings is random, so the browser suite fails about half the time.** Rules findings created in one read share `created_at`. The API orders by `[createdAt, id]` (`api/src/findings.ts:43`), so the tie is broken by a random UUID. The web sorts only by live state and severity (`web/src/runtime/findings.tsx:36`). The walk acts on the first row it reaches by Tab and assumes that row is the spouse's. In failing run 2 the database showed Child A2 acknowledged and the spouse dismissed, so fixing the spouse's passport resolved nothing. A ~50% flaky suite will fail merge batches. **Fix:** a stable order (filing, then person order, then rule order: this also gives M3's grouping), and have the walk pick rows by their text.

**M2 (Major, Must) Adding a finding by hand is not idempotent (STANDARDS §4 [M] "Idempotent creates"; D2, D5).** Double-clicking the dialog's "Add finding" created two manual findings (1 → 3 rows). `add()` (`api/src/findings.ts:125`) has no idempotency key, and `busy` does not stop the second click (`findings.tsx:112`). **Fix:** an idempotency key per dialog opening, with a unique index on (case_id, idempotency_key), as case creation does. Add a test that two identical POSTs make one row.

**M3 (Major, Must) BR-19 and P-141 ask for a Review page listing findings per filing and person. A flat panel was built, and the change is not recorded anywhere.** The concept says "A case tab listing findings per filing and person". P-141 says "full pages"; board frame 13 shows the page grouped by person, with a "Done" group; GRAPH lists C7.5 as "a full page… (P-141)". At 9d654e170 the list is one flat list in the middle of the case page: the panel starts at y=1854 of 3259 px at 1440. On the walked family case, four people's findings are mixed and sorted only by severity. There is no build-notes.md or challenge.md in `screens/C7.5/`. **Fix:** group the list per filing and person (shared root cause with M1). Then either give it its page, as Eligibility has `cases/:id/eligibility` (card on the case page plus a page), or record the panel choice in `screens/C7.5/challenge.md` for the tech lead to accept before merge.

**S1 (Should) Not all of the concept's cross-checks are built.** The concept's BR-19 cross-checks cover "name, date of birth, document numbers and dates across documents… filled form fields (read-back)". The BR-19 test also asks for "a name mismatch between passport and certificate → one MAJOR rule finding". Built: 5 date-consistency rules on the facts. The cross-document rules need the C6.5 reader, which is not built yet; read-back differences live in C7.7. **Fix:** list both as not built in the PR (with what each waits for), so C7.5 is not scored as if they were there.

**Minors (Should):**
* m1. Ratify the builder's pack change (see above).
* m2. Facts are named from their key, not from the question: "National id issue date" where the question reads "Issue date of the national identity document" (`findings.tsx:22`). Use the question's label (PRODUCT §4 words).
* m3. Wording on resolved rows:
  * "Resolved by the rules when the fact was fixed" also appears when the fact changed to another value that still disagrees (the old fingerprint resolves and a new Open finding appears). Say "when its facts changed".
  * "(acknowledged earlier…)" would be wrong for a waived row that later resolves (`findings.tsx:77`).
  * On resolve, `stateBy` is overwritten with "rules" (`findings.ts:65`), so the row loses who acknowledged it. The audit line keeps it.
* m4. Waive… is shown to a case officer who is not the representative of record, and is refused only after they type a reason (`findings.tsx:84`; EXPERIENCE §2.8 "prevent errors"). Show it to the representative of record only, or disabled with the reason as a tooltip.
* m5. After Dismiss… or Waive… the row leaves the list and keyboard focus falls to `BODY`, so a keyboard user starts again from the top (WCAG 2.4.3). Return focus to the panel or to the next row.
* m6. Double-clicking Acknowledge saves once (good), but the person then sees a red toast, "Someone changed this finding after you read it", for their own action. Field errors also show twice (on the field and in a toast, from the shared `useAction`).
* m7. The rule words state an immigration requirement with no source: "The passport must still be valid on the last day of the visit." (`engine/runtime/cross-checks.ts:38`). Mark the rule Sample, as the severity already is, and add the ASSUMPTIONS row the header promises (AGENTS rule 4).
* m8. There is no build-notes.md recording the mapping to the team's model (the AG-11 Finding and AG-07 deficiency fields compared with the `review_finding` columns; check (6) of screen-review).

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | Finding states, sources, severities, reasons and CRITICAL-only waive are as BR-19 says. Page and grouping (M3) and the cross-document rules (S1) are missing |
| D2 Data integrity | 3 | DB checks: waive only on CRITICAL, reason with who and when. 3 parallel reads give 1 row; 2 acks give one 200 and one 409. Double-click add gives a duplicate (M2) |
| D3 Reuse | 4 | Reuses `reach`, `Audit`, zod contract, `Pill`, `Dialog`, `StandIn`, `Tip`; the rules engine is pure |
| D4 Rule integrity | 4 | Rules stay silent on missing or invalid dates; fingerprint test; property test with 300 pairs |
| D5 Stability and recovery | 3 | Reload and two tabs are fine; double-click add duplicates; the browser suite is flaky (M1) |
| D6 Governance | 4 | Who, when and why on every move; audit without values (tested); only the acknowledger's name is lost on resolve (m3) |
| D7 AI trust | 4 | AI is part 2; the "AI off" state is stated in words and rules and manual findings still work (AG-11-71) |
| D8 Orientation | 3 | The panel is mid-page on a 3259 px page, with no tab or page of its own (M3) |
| D9 Flow | 3 | No way from a finding to the fact to fix it (board frame 13: "Fix the fact"); Waive… offered to the wrong person (m4) |
| D10 Language | 4 | Quotes name both dates in words; facts are named from their key (m2) |
| D11 Feedback and state | 4 | Counts update live; errors on the field; duplicate and misleading toasts (m6) |
| D12 Visual quality | 4 | Team tokens and pills; calm rows; one flat list for a family of 4 (M3) |
| D13 Accessibility | 4 | axe clean on every state; no sideways scroll at 400, 720 (200 % zoom), 1024 and 1440 px; keyboard path; focus lost after a move (m5) |
| D14 Team look | 4 | Same shell, components and words as the case page |
| D15 Speed | 5 | GET 16–19 ms warm; findings shown 0.9 s after reload; one request per view |
| D16 Testability | 3 | Each rule has a pass and a fail test; the browser suite is flaky 4/8 (M1) |
| D17 First use | simulated only | No intended user walked it |
| D18 Provenance | 4 | Rule tooltip, both facts quoted, form and person named, Severity Sample, SI-6 chip |
| D19 Closure | 3 | A fixed fact resolves its finding with no reload; the readiness warning (C7.5-9) waits for part 2 |
| D20 Pain solved | simulated only | No intended user walked it |

**Journey score (reviewer, the one score for this check): 7/10, below the pass mark of 8.** Report: `journey-test-reviewer-2026-11-03.md`.

## Could not check
A real screen reader. An intended user's unaided walk (D17, D20 stay with the founder). Mutation testing by editing the code: the worktree was being edited by another session, so a rule was not removed to see its test fail; I read the tests instead (each guard has a failing assertion). `break-report.md` in this folder belongs to another session and was not used.

**Verdict: Block** (3 open Majors). Fix before Approve: **M1** a stable, grouped order and a walk that picks rows by text · **M2** idempotent add-by-hand with a test · **M3** grouping per filing and person, plus either the page or a challenge.md the tech lead accepts. Then S1 and m1–m8 as the builder sees fit, each stated in the PR.

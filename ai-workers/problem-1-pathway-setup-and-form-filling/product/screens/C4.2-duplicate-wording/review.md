# Review: C4.2 duplicate wording (QA-125), head 1955a99e0

Reviewer: independent. API-only change (no screen). Ports 4457/4458, US$0, no live AI.

**Verdict: Approve** (no Blocker, no Major; 3 Minors).

## What I ran
* `acceptance/C4.2.test.ts 4457 xr_studio_rv42 wp.family`: 9/10. The one FAIL is "a fact no question asks cannot be marked" (see Q1). The QA-125 check passes: statuses [200, 409], text names the question.
* `tests/check_pqr.ts` on a fresh copy: 40/0 (QA-125 pass: exactly one kept, v0 = 1, now = 1; fail: 409 in words). A second repeat did not start (my script reused the copy name), so flakiness is one run only.
* Read the diff `origin/main...1955a99e0` (3 files).

## Points you asked about
1. **Is catching P2025 safe?** Yes. Inside the transaction the only call that can raise P2025 is `tx.factSource.delete` of the newest DRAFT (`fact-sources.ts` ~101). It means that draft was already replaced, which is what a concurrent winner does (Postgres read-committed: the second delete waits, then finds 0 rows). A reset that removed the whole combination would surface as an FK error (P2003) or at `this.combination(id)` earlier (404), not here. So it cannot hide a real "removed" except a reset deleting only that draft mid-save; "someone else changed it, reload" is still true there. P2002 covers two creates of the same version on a PUBLISHED newest (no delete). Both give 409.
2. **Version in the 409 body from a second query?** Yes, `findFirst` outside the transaction (~108). It can race with a third save, but only toward a newer version, so the client reloads anyway. Harmless. Minor m1 below.
3. **Plain words, names the question?** Yes: `Someone else saved where "<label>" comes from at the same moment. Reload to see their choice, then choose again.` No "database", "removed", "reset" (tested). The global P2002 fallback (`main.ts:197-198`) reads plainly and is generic by necessity.
4. **Test strength:** the fail check asserts 409, label present and banned words absent; remove the catch and it fails (statuses would be 409 with old text or 500). The pass check `versions() === v0` is weak (the unique key already prevents two) but harmless.

## Q1: leaving "a fact no question asks cannot be marked" out
Right not to block. This change is scoped to QA-125 wording/concurrency; the other failing check is a conflict between the pack's assumption and the engine's written design (`snapshot.ts:167-181` carries any placement a form uses; `render.ts:232-237`). With the fact still asked, P-76 (PQR within SQR) holds, so ticking it is not a wrong result. Changing the engine here would be a runtime item with wide count effects. It does need a ruling, and the open item must stay visible (BACKLOG/STATE), since the pack will keep reading 9/10.
Your recommendation (B: keep the engine, fix the pack, fix the raw-key title "personal_details") is sound. Add: the raw-key title is a real P-91 defect on its own and should get its own item now, not wait for the ruling. Also the pack's "setup" line says "so its client facts are asked by no question"; in B that wording and PACK-2.md line 21 change together with a genuinely unasked fact (a form box on a fact with no library question).
Caution on (A): the release error ("no question asks it") would then fire for forms whose facts sit only in a taken-out section, which makes releases harder; the PR rightly defers it.

## Findings
* **Minor m1** `fact-sources.ts` ~108: the current version comes from a second, un-transacted read; fine, but a short comment that it may be newer is enough.
* **Minor m2** `fact-sources.ts` ~106: any P2002 in the save (not only the version key) is told as "same moment". Today the only unique key there is the version, so true; say so in the comment if more keys appear.
* **Minor m3** PR body: the "Reviewer: REVIEW" and "RESULTS" placeholders must be filled before posting; mention that the unchanged 9/10 is expected, so the next re-test is not read as a regression.

## Not checked
Browser two-tab walk (no UI change; builder ran check_pqr_browser 20/0), the other suites the builder listed (taken as reported), real screen reader. D-scores not given: no screen.

## Journey score (reviewer, API journeys only): 8/10
Main path (tick PQR, list shows it) pass. Alternate: Two saves at once: one 200, one 409 with words naming the question. Error: stale tab 409, case-officer fact 422, content reviewer 403, all in words. Wrong role handled. Recovery: the 409 carries the version so reload then choose again works. Boundary to release: draft tick not in country PQR (P-132) pass.
| Criterion | Score |
|---|---|
| task completed | 1 |
| next step obvious | 1 ("Reload ... then choose again") |
| plain words | 1 |
| feedback and state | 1 |
| correct data | 0.5 (a fact no question asks... is still asked; tickable; unresolved Q1; raw-key section title) |
| error recovery | 1 |
| accessibility and sizes | 0.5 (not walked, no UI change) |
| speed | 1 |
| visual quality | 0.5 (not walked; raw key section title seen in Q1 evidence) |
| trust and sources | 0.5 (basis "Sample" shown; origin not walked) |
No criterion at 0. Pass.

**Verdict: Approve**

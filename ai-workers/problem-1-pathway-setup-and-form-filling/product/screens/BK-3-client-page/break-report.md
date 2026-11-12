# BK-3 PR 3: client page, break report

Breaker (fresh context), 11 Nov 2026, on `ef1038a29` (draft #1570). Isolated copy `screens_bk3b` on :4445, configured checkpoint, then 4 cases from the browser check's body (A1, A2 for Client A, B1 for Client B, S1 for Client A at the solo firm), 100 more Client A cases (`BULK-001..100`), a 64-character reference with a 118-character Greek/Devanagari/Japanese principal, and a sponsorship case with a sponsor. Copy stopped. Scope: the concept's §2-§6 (BR-1..BR-8). "Not built" (a Client column on Cases, readiness per case) was not checked. Paths are under `prototype/studio/`.

**Verdict: no Blocker. 1 Major, 6 Minor.** The firm and role checks on the server hold under every trick tried. The one Major is on the screen: Load more rows survive a switch of the simulated person.

## Findings

**M1 (Major): after "Load more", switching "Acting as" to the solo representative still shows the Sample firm's cases of Client A (BR-2 on screen, BR-5 count wrong).**
* Steps: as Case officer, open `/cases/clients/user-P` with more than 100 Client A cases at the Sample firm, press **Load more** (103 shown), then set Acting as to "Solo representative · Sample solo firm".
* Expected: only the solo firm's case (`BK3X-S1`), "1 case shown at Sample solo practice".
* Actual: `BK3X-A2`, `BK3X-A1` and `SAMPLE-VV-FAMILY-1` (Sample firm, with their people's names) stay listed next to `BK3X-S1`, and the line says "4 cases shown at Sample solo practice". A Load more that is still in flight during the switch adds rows the same way.
* Cause: `more` (`web/src/runtime/cases.tsx:203`) is never reset when `actor` (or `clientKey`) changes. Only page 1 is keyed by actor (`:202`). The pattern is copied from the case list (`:103`), which does the same (54 rows, 50 of them the Sample firm's, after the same switch), but BR-2 is this page's own rule. The browser check never presses Load more.
* Fix direction (not done): key `more` by `actor` and `clientKey`, or remount the page on `key={actor+clientKey}`.

**m1 (Minor): a failed Load more is silent.** I made `?after=` answer 500. Nothing is shown, the count stays at 100, and an uncaught `boom` page error is logged (`cases.tsx:213`: `try/finally` with no `catch`). Retrying works. EXPERIENCE "never a silent short list". Inherited from `:109`.

**m2 (Minor): a 200 response that is not a list reads as a false empty state.** A proxy HTML body, or `{"cases":null}`, for `?client=user-Q` shows "0 cases shown · Client B has no cases at Sample immigration firm yet" (`cases.tsx:216-224`). The dialog already handles this ("Break m2": a body that is not a list reads as could not load).

**m3 (Minor): BR-7 "sends no request" is not literally true, and every view makes two requests.** `useFirm()` (`cases.tsx:200`) runs before the key and role checks:
* `/cases/clients/user-Z` still sends `GET /api/runtime/firm`.
* Client A at `/cases/clients/user-P` sends it too and gets a 403, logged as a console error.
* A normal view sends `firm` plus `cases?client=`.

No case read leaks. The browser check counts only list reads.

**m4 (Minor): role words differ from the case page.** On sponsorship case `BK3X-SPONS`, the client page shows "Spons Sponsor · sponsor" (lower case, raw role, `cases.tsx:190`). The case page shows "Sponsor", and the release's `role_label` is "Sponsored spouse or partner". The list row carries only `role`, not the release's words.

**m5 (Minor): `?client=` is not validated.**
* `?client=user-P&client=user-Q` and `?client[]=user-Q` silently drop the filter and return the whole firm list without `people` (`api/src/runtime.ts:941`). This stays firm-scoped, so it is not a leak.
* `?client=%00` answers 404 "Not found (it may have been removed by a reset)".

STANDARDS §8 asks for validation. The concept says the filter is optional; a wrong-shaped filter should give a 400, not "everything".

**m6 (Minor, inherited): keyboard focus is lost when the dialog closes.** After Escape or Cancel on "Open a case for Client B", focus lands on `<body>`, not on the button. The `/cases` dialog does the same, because the dialog is unmounted (`cases.tsx:244`). The 720 px view (1440 at 200 %) with a 64-character reference puts the Opened column inside the table's scroll region. That region is focusable and labelled, so it is acceptable.

Pre-existing, not counted: `GET /runtime/cases?take=1.5` answers 500 (Prisma needs an integer; the `take` line did not change). `check_c611_team.ts` gave 69/70 on this copy. The one failure is about IMM 5475 designated-individual keys, a test this PR does not touch, so I do not attribute it to this PR.

## What held (tried and passed)
* **Roles (BR-1):** `?client=user-P` as user-P, user-Q, user-A and user-B answers 403; unknown or empty `x-actor` answers 401. Client A or B at `/cases/clients/*` sees the refusal with "Switch to the case officer…", sends no case read, shows "Your application" and no Back. A configuration person arriving is switched to the officer (existing rule).
* **Firm scope (BR-2), API:**
  * The solo representative gets only `BK3X-S1`.
  * `after=` set to another firm's case id lists only the viewer's firm; `after=` set to another client's case id lists only the asked client.
  * A cursor that does not exist answers 404.
  * `take` set to 0, -1, abc, 1e3 or 20 digits is clamped to 1..100.
  * Another login (`user-O`, `USER-P`, `user-P/../`) returns `[]`.
  * A 100 000-character key gets 431.
* **BR-3:** every row of `?client=user-P` has `client:"user-P"`, and Client B's case never appears.
* **BR-4 / C6.16:** after "Keep private" on the family case's partner (reason "SECRET-WHY"), the row still holds only `{label, role}`. The keys are `client, combination, created_at, id, people, reference, status`. No "private", reason, answer or progress shows in the body or on screen. The "case" subject is left out.
* **BR-5:** page 1 is one list read; `?client=user-P&take=100` with 103 cases answered in about 7 ms; Load more appends with no duplicates; the count matches the rows.
* **BR-6:** the header link "Client: Client A" is plain. Ctrl-click opens a new tab and the original tab stays on the officer. Ctrl-click on a row works the same way. Case → client → Back → Back returns to `/cases`. As user-R the header link is right. User-S on a Sample case gets "No such case" and no link.
* **BR-7 / where-line:**
  * `/cases/clients` and `/cases/clients/` go to `/cases`.
  * `/cases/clients/x/y` and `/user-P/questionnaire` show "Cases › Client › No such page", Back to `/cases/clients/<key>`.
  * `user%2FP`, `..%2F..%2Fstudio`, `%20user-P`, `USER-P`, `user-O`, `questionnaire`, a 3000-character key and `%E0%A4%A` all show "No such client" with Back to Cases and no list read.
  * `%2e%2e` resolves to `/cases`.
* **BR-8:** from Client B's page the dialog has Client B chosen and the case is created as `user-Q`. Double-click, a forced second click and Enter make one POST and one case. Cancel, Escape on a clean dialog, reload and browser Back all stay on, or return to, the page with no dialog. A dirty Escape is guarded.
* **Layout and a11y:** at 375 and 1024 px, and at 720 px with devicePixelRatio 2, axe finds 0 WCAG A/AA violations on both client pages and in the dialog, with no sideways scroll. Long non-English names and references wrap in the 375 px cards. Tab order: Acting as › Back › Cases › Product Studio › Open a case for Client B › table region › rows.
* **Old callers:** `/cases` keeps 50 rows plus Load more (to 108 here); rows only gain `client`, never `people`; `check_bk3_frame.ts` passes 147/147; the list checks in `check_c611_team.ts` pass.

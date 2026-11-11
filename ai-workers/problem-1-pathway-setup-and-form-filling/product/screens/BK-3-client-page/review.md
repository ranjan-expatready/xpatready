# BK-3 PR 3 (client page, linked both ways): independent review

PR #1570 (draft) · commit **ef1038a29d2a7298be179789de94b08e5b730e87** (branch claude/awesome-pascal-jyx0lw) · diff `git diff origin/main...ef1038a29` · the reviewer did not build it · 11 Nov 2026.
Judged against `concept.md` (approved, Lead 19, conditions B1 (a), M1-M3), `challenge.md`, STANDARDS, EXPERIENCE, QUALITY, the code and my own copy **screens_bk3r on :4444** built from this commit (stopped; database and files removed). Live AI off, US$0. Journey test: `journey-test-reviewer-2026-11-11.md` (**8.5/10, pass**).

## Checks run
- `check_bk3_client_browser.cjs 4444`: **65/65**, exit 0 (2 min 46 s on a shared CPU). Its PNGs rewrote byte-identical files; tree clean.
- `check_bk3_frame.ts`: **147/147**. **Mutation:** the where.ts `clients` branches removed in a scratch copy → **12 FAILs** (the M2 rows catch the wrong Back `/cases/clients/questionnaire`). The builder's count holds.
- `tsc --noEmit` on web and api: no error in cases.tsx, where.ts or runtime.ts. `graph.mjs`: G1 0, G2 0; `GET /runtime/cases` is reached by 3 suites plus this one; no new route, page or capability without a test (G3 33 / G6 13 are elsewhere).
- My walk (Playwright, headless; screenshots read by eye) at 1440, 1024, 720 (200 % zoom of 1440) and 375 px: axe 0 violations on `main` at all four widths, no sideways scroll, case link 24 px tall at every width.

## Concept conditions
- **B1 (one read): Met.** One `GET /runtime/cases?client=user-P&take=100` per page view (request log); people come from one `caseParticipant.findMany({caseId: {in}})`, not one per row (runtime.ts:943-944). Unknown key and refused client send no read.
- **M1 (client from the page): Met.** Client B's page opens the dialog with `user-Q`; the saved case's `client` is `user-Q`; Cancel and Escape stay on `/cases/clients/user-Q`.
- **M2 (where.ts clients branch, check catches a wrong Back): Met** (mutation above). **M3: gone** with B1; the line counts only rows shown.

## API diff (tech lead asked; runtime.ts list())
- **Firm scope (C6.11): Met.** `clientActorId` sits inside the existing `workspaceId` + `firmKey` filter; the solo representative gets only BK3C-S1; opening another firm's case from a URL stays 404 (`reach`).
- **403 for clients: Met.** Client A 403, Client B 403, a configuration person 403, no actor 401 (`need(actor,"case")` unchanged).
- **No N+1: Met.** **Personal data:** rows add `client` (the login) and, only when filtered, `people: [{label, role}]` without the "case" subject; no `keep_private`, answers or progress (checked in the body).
- Additive: without `client` the rows only gain `client`; no test asserts the old row keys exactly. See m5 for the array case.

## D1-D20 (1-5)
D1 4: BR-1-BR-8 behave as written, one word off (m1) · D2 4: read-only; double-click on "Open case" from the page made one case · D3 n/a · D4 n/a · D5 4: reload, browser Back, double click fine; Load more failure is silent (m2) and loaded-more rows survive a person switch (m3) · D6 n/a · D7 n/a · D8 5: "Cases › Client A", Back → Cases, "Client: Client A" in the case header · D9 5: one click each way, one filled button · D10 4: "Simulated client login" in visible words; "sponsor" in internal form (m1) · D11 4: skeleton, empty, error and honest count drawn; m2 · D12 4: quiet surfaces, blue only for the button and links · D13 5: keyboard (6 Tabs to the button, Enter opens, first field focused), axe 0 at four widths · D14 4: team Table, Notice, Pill, Button, Dialog · D15 5: page drawn 67 ms after the click, one request · D16 5: one pass and one fail per BR, mutation proven · D17 simulated only · D18 4: the grouping is labelled Simulated · D19 4: case → client → other case → new case for the client closes the Bake walk's step · D20 simulated only.

## BIC (EXPERIENCE §6; client page and case header link)
| Check | Result | Evidence |
|---|---|---|
| BIC-08 | Met (within scope: readiness per case is on the concept's "Not built" line) | each row: reference, people by name and role, status (`screenshots/pr3-client-page-1440.png`, my 1024 walk) |
| BIC-11 | Met | one filled button "Open a case for Client A/B" at 1440/1024/375 |
| BIC-13 | Partly (Should) | error notice says what, not how to fix (m4) |
| BIC-14 | Met | no hover-only help; the Simulated note is visible text (challenge m2) |
| BIC-18 | Met | skeleton while loading; empty "Client B has no cases at Sample solo practice yet" with the button |
| BIC-19 | Met | one heading, one button; "{n} cases shown at {firm}" counts the rows shown |
| BIC-20 | Met | keyboard path, visible focus, 1024 px and 720 px with no sideways scroll |
| BIC-01-07, 09, 10, 12, 15-17 | N/A | no questions, documents, filing or review on this page |

## [M] lines touched
STANDARDS §5 "no N+1; one request per screen view" Met · "personal data minimised" Met · §6 "authorisation on the server, deny by default" Met · "read paths indexed" Partly: the filter rides the `(workspaceId, firmKey, …)` unique index, `clientActorId` has none; the Lead ruled no schema change and §9 leaves scale to the team, so no finding · §7 "a rule's test fails when removed" Met (M2 mutation; BR-2/BR-3 assert exact rows) · EXPERIENCE §2.1 path, §2.5 one next action, §2.7 counts, §2.12 accessible: Met · §4 states: Met except the error's fix (m4) · §5 copy: Met except m1.
Capability or scaffolding (P-33): the page, the link and Open a case work through the product's own screens; grouping by login is labelled Simulated scaffolding for M4's client record (concept §6b). Retrofit mapping: concept §2 (M4 client record); the team's client screen stays Unverified (challenge).

## Blockers / Majors
None.

## Minors (Should: fix, or list in the PR with a follow-up row)
- **m1 Role in internal words.** Failing case: a Spouse or common-law partner case with a sponsor reads "Sample Sponsor Seven · **sponsor**" on the client page, "Sponsor" on the case page (QA-135: the release's words, never the internal name). Cause: `personLine` falls back to `p.role.replace(/_/g," ")` (cases.tsx, ClientCasesPage). Fix: return the release's role word with each person from the same read, or at least the same fallback as `roleOf`.
- **m2 Load more fails silently.** Failing case (take forced to 1, the after-page answering 500): no message, the count stays "1 case shown", the page logs an unhandled rejection. Cause: `loadMore` has `try … finally` only (copied from CaseList, pre-existing there). Fix: catch and say "More cases could not be loaded. Try again." with the button kept.
- **m3 Loaded-more rows survive a person switch.** Failing case (take forced to 1): Load more as the case officer, then Acting as → Solo representative: "2 cases shown at Sample solo practice" lists BK3C-A1, a Sample-firm case (opening it is 404, so the server holds). Needs >100 cases of one client, so not on the demo path. Fix: reset `more` on actor or client change (e.g. `key={clientKey + actor}`), and the same on CaseList.
- **m4 Error without a fix.** "This client's cases could not be loaded" shows the server's detail and no way to retry (EXPERIENCE §4 "error … with the fix"). Fix: a "Try again" button (refetch).
- **m5 Array query drops the filter.** `GET /runtime/cases?client=user-P&client=user-Q` as the officer answers 200 with the firm's whole list (8 rows, both clients, no people) instead of a 400. Not a leak (firm filter and role check hold), but a filter that silently disappears. Fix: 400 "client is one login" when `client` is not a single string.
- **m6 Records.** The PR body still says "PR 3 of 4", "no API change", "web/src only", "Checks: To come". Update it before ready: the API change, the checks above, and that BK-3 closes here.
- **Not this PR:** focus goes to `body` after the dialog closes (Escape or Cancel), the same on /cases (shared Dialog mounted conditionally). A client at `/cases/clients/…` gets the refusal with no Back, only the copy pointing to the switch, as at /cases since PR 1 (frame check HOMES). Accepted per BR-1 and challenge m1.

## Bake plan row 3: complete with this PR?
Row 3: "Set-up screens and case screens share one frame: a 'where am I' line, a way back from every screen, a small client page, and links both ways between a case and its client."
- One frame, where-am-I line, a way back from every screen: **PR 1 (#1519)**, on main (fbfb263c7); frame check now 147 rows including the client routes.
- Set-up ↔ case links: **PR 2 (#1525)**, on main (9960493b5).
- Small client page, links both ways case ↔ client: **this PR** (header link → client page; each row → its case; Open a case for the client).
- **BK-3 closes with this PR; nothing of the row is left for a PR 4.** The draft's "PR 4" (header link and Open a case) was folded into PR 3 by the approved concept, so "PR 3 of 4" (PR body) and "four PRs" (plan's lane line) are stale words, not open work. The open Shoulds (PR 2's release-number words, PR 1's Back-to-Studio note for BK-4, m1-m6 here) are follow-up rows, not row 3's done-when.

## Not checked
The builder's full `run-suites.sh --changed` (257 suites) and CI. A visible (headed) browser: the walk was headless Playwright with screenshots. A real screen reader. Dark theme. More than 100 real cases for one client (only simulated by rewriting `take`). An intended user's unaided walk (D17, D20 stay with the founder).

**Verdict: Approve** (commit ef1038a29d2a7298be179789de94b08e5b730e87; no open Blocker or Major). m1-m6 are Shoulds: fix them, or list them in the PR with follow-up rows.

# BK-3 PRs 3-4: client page, fresh challenge (skill screen-concept, B)

Fresh challenger, 11 Nov 2026, on `concept-draft.md` and `design/draft-client-page.html` at `69bea74a0`. Paths under `prototype/studio/` unless they say otherwise. **F** = fact read in the code (confidence given); **J** = judgment. `ai-workers/tools/freshness.sh` cannot run in the cloud copy (`code/README-copies.md` missing), so the team's own client screen stays **Unverified**, as the draft says.

## Verdict
**Build after these changes.** The page is the right small answer to the founder's complaint, and the rules on firm scope and privacy hold. The data plan breaks a mandatory standard without saying so (B1). The one next step would open a case for the wrong client (M1). Two smaller traps sit in the address and the counts (M2, M3).

## Objections

**B1 (Blocker). One read per row breaks STANDARDS §5 [M], and the draft does not say it does.** Needed for the proof.
* *What breaks:* STANDARDS.md:35 says "no N+1; one request per screen view, not per row" (also :56, "no request per row"). The plan is one list read plus one `GET /cases/:id` for every case the firm has (draft §2), not just this client's cases. CLAUDE.md says "never deviate silently".
* *Example:* a firm with 30 cases and Client A on 2 makes 31 requests. Each one runs `reach` (heavy include: pins with the **release row, its snapshot JSON included**, participants, stages), plus `teamLine` (2 queries) and `linkedOf` (F, high: `api/src/runtime.ts:77-83, 138-145, 321-342, 378-384`). The answers are small, but the server load grows with the firm's case count.
* *Fix (A, recommended):* one small read in the runtime lane first. `GET /api/runtime/cases?client=<key>` filters `clientActorId` inside the firm scope that already exists (`runtime.ts:936`). Its rows add `client`, and only on that filtered read also `people` [{label, role}] without the "case" subject. PR 3 then makes one request, and M3's partial state goes away. *(B):* a written Bake exception to §5 (the Lead or the founder), with the timing the draft already asks for and a follow-up row. Either way, write the choice into the concept.

**M1 (Major). "Open a case for Client A" is not an existing pre-fill. As drawn, it opens a case for the wrong client.** Needed for the proof (draft Q2).
* *What breaks:* `/cases` reads only `?open=` (`web/src/runtime/cases.tsx:96-99`). The dialog's client is hard-set to `clientActor: "user-P"` (`:141`), and `:175` is just the select. Nothing reads `?client=` (F, high).
* *Example:* on Client B's page, pressing the button opens the dialog with "Client A (simulated)" selected. An officer who does not look saves a case on the wrong login. Cancel also leaves the officer on Cases instead of the client page (`close` only drops `open`, `:99`).
* *Fix:* open `NewCaseDialog` in place on the client page with a `client` prop that sets `clientActor`. Cancel stays on the page; a created case goes to `/cases/<id>` as now. *Test:* from Client B's page the new case's `client` is `user-Q`, and Cancel keeps `/cases/clients/user-Q`.

**M2 (Major). `/cases/clients/…` collides with the case branch of `where.ts`, and the frame check cannot see it.** Needed for the proof.
* *What breaks:* `whereFromAddress` treats `s[1]` as a case id (`web/src/components/where.ts:24-29`). In the client area it builds Back to `/cases/<s[1]>/questionnaire` (`:21-22`). The check's `opens()` turns `:id` into `[^/]+` (`tests/check_bk3_frame.ts:31`), so `/cases/clients` and `/cases/clients/questionnaire` count as real routes. Case ids are UUIDs (`prisma/schema.prisma:1266`). A non-UUID id answers 404 "Not found (it may have been removed by a reset)" (`api/src/main.ts:213`) (F, high).
* *Example:* without a `clients` branch, `/cases/clients/x1/nothing` gets the crumb "Case" pointing to `/cases/clients`. That address opens CasePage, which says "This case could not be opened: Not found (it may have been removed by a reset)", yet the check stays green. Client A can reach the client page in the walk: staff client page → case → "Open it as Client A" → browser Back twice. Client A would then get Back to `/cases/clients/questionnaire`, a dead end.
* *Fix:* put a `s[1] === "clients"` branch first in both the cases and client branches. The fail-side rows assert exact targets: `/cases/clients/x1/nothing` → Back `/cases/clients/x1`; a bare `/cases/clients` → Back `/cases`. Add a `clients` index route that redirects to `/cases`.

**M3 (Major while B1 keeps per-row reads). The partial-read notice counts the firm's cases but sits on one client's page.** Needed for the proof.
* *What breaks:* the client of an unreadable case is unknown, because `client` comes only from `get()` (`runtime.ts:328`). "{k} of {n} cases could not be read" then mixes in other clients' cases. The board's "The cases below are complete" cannot be known (board state 4). This breaks EXPERIENCE.md:24 and BIC-19 ("counts say what they count") and the draft's own BR-5.
* *Fix:* "{k} of your firm's cases could not be read, so Client A may have more cases than shown. Reload to try again." Drop "complete", and the subline says "on {n} cases shown". The state disappears with B1 fix A.

**m1 (Minor). The new links' effect on the simulated person is not specified.** Needed for the proof.
* *What breaks:* "Open it as Client A" switches the actor (`cases.tsx:216`). Nothing says that "Client: Client A", the page's case links and its button must not. The client-area refusal copy has no way back for a demo walker. Compare the case list's 403, which says "Switch to the case officer…" (`:110`). P-447 (1) asks for no dead end.
* *Fix:* plain `<Link>`s with no `setActor`. The browser check reads "Acting as" before and after each new link (unchanged), and checks that "Open it as Client A" still switches. Refusal: add "Switch to the case officer to see it."

**m2 (Minor). The "Simulated client login" tooltip is a `title` attribute.** Needed for the proof.
* *What breaks:* BIC-14 (EXPERIENCE.md:75) asks for hover **and keyboard focus**; a `title` attribute gives neither on keyboard or touch.
* *Fix:* use `web/src/components/ui/tooltip.tsx`.

**m3 (Minor). Some draft evidence is wrong.** Not built.
* `runtime.ts:946` is not the list's refusal: that is `need(actor,"case")` at `:934`. `cases.tsx:175` does not pre-fill (M1). C6.19's "same client" also needs a principal of the same name (`api/src/earlier-facts.ts:55-56`, `sameName`).
* *Fix:* correct these in `concept.md`. One more fact for Q3: the dialog defaults to Client A (`:141`), so in the demo Client A's page will hold most firm cases, with different principals. The People column is what tells them apart, so keep it.

## What is sound
* **Firm scope (F, high).** `list` filters `firmKey` (`runtime.ts:936`), `reach` returns 404 for another firm's case (`:145`), and a client gets 403 on the list (`:934`). BR-1 and BR-2 hold on the server, not only on the screen.
* **Privacy (F, high; J on the conclusion).** `get()` returns every participant to staff, with no keep-private filter (`:333-336`). Keep-private is "from the client" (`hiddenFromClient`, `:199-203`), and the case page already shows those names to staff. Names and roles on a staff-only page leak nothing new, as long as no answers, progress or privacy words appear (BR-4).
* **Routing (F, high).** `clients/:clientKey` does not shadow any two-segment case route, and no case id can be "clients" (UUID).
* **The grouping key.** `Case.clientActorId` is what the data holds. It is labelled Simulated and stands in for M4's client record (P-33 table honest). No new record, which fits P-447's "no new capabilities".
* **Draft Q1** (keep `Cases › VV-0001`, add the header link): PR 1's checks stand, and `/prepare` has no client.
* **Style (P-473).** One filled button, 375 px cards, every state drawn, no orange, Sample marks.

## Back-end plan (with B1 fix A)
| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Client's case rows | `Case.clientActorId`, `firmKey` (no migration) | `GET /api/runtime/cases?client=<key>` (runtime lane, `list()` + 3 lines) | BR-2, BR-3: firm and login filter in the query | api check: officer gets A's 2 Sample-firm cases; solo rep gets only the solo case; Client A gets 403 |
| People per row | `CaseParticipant` + `AnswerSubject.label` | same read, only with `client=` (personal data minimised, §5) | BR-4: names and roles only; "case" subject left out | no `keepPrivate`, answer or progress key in the body |
| Header link | `get().client` (exists, `:328`) | none | BR-6 | round trip; "Acting as" unchanged |
| Open a case for the client | existing `POST /runtime/cases` | none | `clientActor` validated (`:271-272`) | new case's `client` = the page's key |
| Unknown key | `PEOPLE` in `cases.tsx:32-39` | no request | BR-7 | `user-Z` → "No such client" |

## Questions for the founder
1. **How the client page reads its cases (B1).** *Rec: a small runtime-lane read first (`?client=` on the case list); the page then makes one request.* Alternative: build web-only now under a recorded Bake exception to STANDARDS §5, with a follow-up row.
2. **The one next step.** *Rec: keep "Open a case for Client A", opened in place with the client filled (M1).* Alternative: list only, no button.
3. **What a client is.** *Rec: as the draft (the login that answers, marked Simulated).* Make sure the founder knows that in the demo most cases fall under Client A.

## Lead response
Tech lead (Lead 19, series 2, ~20:2x IST 11 Nov), on #1570: **Go with B1 fix (a)**: the small additive `?client=` filter on the existing case list in `api/src/runtime.ts`, in this PR (no schema, no new endpoint; runtime.ts is not a baton file); the Lead reads that API diff before the label. Concept approved (P-223 (4)) on condition that B1 and M1-M3 are fixed as written here.

## Agreement
Builder: all of B1 (a), M1, M2, M3 (gone with B1) and m1-m3 taken into `concept.md`.

## Build discoveries

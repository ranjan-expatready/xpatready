# BK-3 PR 3: a small client page, linked both ways with its cases (concept, approved)

Row: bake plan row 3 (`design/bake-plan-2026-11-10.md`), P-447 (2), held for a concept by P-457; style P-473. Drafted by a helper context (`concept-draft.md`, board `design/draft-client-page.html`), challenged by a fresh context (`challenge.md`: Build after these changes, B1, M1-M3, m1-m3). **Approved by the tech lead (Lead 19, series 2, 11 Nov ~20:2x IST, P-223 (4)), on condition that B1 and M1-M3 are fixed as the challenger said, and with option (a) for B1.** This file is the draft with those fixes. Paths below are under `prototype/studio/`.

## 1. Job and journey
* **Job:** a firm's staff member on any case gets to the case's client in one click, sees that client's cases at the firm with the people on each, opens any of them, or opens a new case for that client. The founder's words (after-29 plan): "If I go to the case run view area, I can't come back to the client."
* **Persona:** firm staff (Case officer, Representative); staff wording. A client at the address is refused.
* **Journey:** the Bake walk (P-447 (1)): case → its client → another case of the same client → back.

## 2. Ten layers
* **Master:** no client record exists. A client today is the simulated login that answers a case, `Case.clientActorId` (`prisma/schema.prisma:1272`); each case makes its own Party (`api/src/runtime.ts:290`). The page groups cases by that login and says "Simulated client login" in visible words (scaffolding for M4's client record, P-33). C6.19's "same client" is also the login plus the firm, and a principal of the same name (`api/src/earlier-facts.ts:51-56`) (m3).
* **Contract (B1, option (a), Lead's Go):** one additive read. `GET /api/runtime/cases` takes an optional `client=<login>`; the filter sits inside the existing firm filter (`runtime.ts:936`). Every row now also carries `client` (the login). Only on the filtered read, each row also carries `people: [{ label, role }]` (names and roles, the "case" subject left out). No schema change, no new endpoint, no case-prepare change. Without `client` the answer is as before plus `client`.
* **Screen:** routes `clients` (redirects to `/cases`) and `clients/:clientKey` in `web/src/runtime/cases.tsx`; their words in `web/src/components/where.ts` (a `clients` branch first in both the cases and the client branches, M2).
* **Configuration, rules engine, AI assist, governance:** none touched (read-only page; nothing written but the existing Open case).

## 3. Business rules
| BR | Rule | Source |
|---|---|---|
| BR-1 | Staff only. A client at the address sees "This page is for the firm's staff" with the way back, and no case read is sent. | `runtime.ts:934` (`need(actor,"case")`, 403) |
| BR-2 | Firm scope: only the viewer's firm's cases; another firm's case of the same login never shows. | C6.11 BR-20, `runtime.ts:936`, `:145` |
| BR-3 | A case shows on exactly its own client's page; another client's case never does. | `schema.prisma:1272` |
| BR-4 | Names and roles only: no answers, progress, documents or privacy settings (C6.16: keep-private hides people from the client, never from staff; staff already see these names on the case page). | `runtime.ts:199-203, 333-336` |
| BR-5 | Honest counts: "{n} cases shown" counts the rows on the page; more pages load with "Load more", never a silent short list. One request per page view (STANDARDS §5 [M]). | EXPERIENCE §2.7, BIC-19, STANDARDS.md:35 |
| BR-6 | Links both ways: each row opens its case; the case header names its client and links to this page. Neither link changes the simulated person (m1). | P-447 (2) |
| BR-7 | A key that is not a client login reads "No such client" with Back to Cases, and sends no request. | EXPERIENCE §4 |
| BR-8 | "Open a case for {client}" opens the existing Open a case dialog in place, with that client chosen; Cancel stays on the page (M1). | `cases.tsx:141` (was hard-set to Client A) |

## 4. Layout (Workspace, light: header + one list)
* **Address** `/cases/clients/<login>` (`user-P`, `user-Q`). Line `Cases › Client A`, Back → Cases. A bare `/cases/clients` goes to `/cases`.
* **Header:** H1 the client's name; one visible line "Simulated client login: the prototype has no client records yet · {n} cases shown at {firm}" (m2: visible words, not a hover-only tooltip); one filled button **Open a case for Client A**.
* **List "Cases"**, newest first: Reference (link) · Combination · People (name · role) · Status · Opened. Below 640 px one card per case (reference, status, combination and date, people), as the board draws; the table from 640 px.
* **Case header:** "Client: Client A" link under the reference line, at every width. The "Open it as Client A (simulated)" box stays and is the only link that switches the person.
* **States:** loading (skeleton) · several cases · none at your firm (empty, with the button) · could not load (danger notice) · refused (client) · not found (unknown key). M3's "some reads failed" state no longer exists (one read).
* Quiet surfaces (P-473): blue only for the one button, links and focus; no orange.

## 4b. Best in class (public product knowledge, not re-checked today)
Clio (a contact lists its matters; the matter names its client as a link; New matter from the contact fills it) · Docketwise, INSZoom, LawLogix (the client profile lists every case; each case links back) · CRMs (a related list and a lookup link back). Copied: client link in the case header, related list, new case with the client filled. BIC checks that matter: BIC-08, BIC-11, BIC-18, BIC-20; the rest are N/A (questions, documents, filing).

## 5. Copy
* Empty: "Client A has no cases at {firm} yet." Refused: "This page is for the firm's staff" · "Clients open their questionnaire from the link their officer sends. Switch to the case officer to see this client's cases." Not found: "No such client" · "Back to cases".

## 6. Contract and tests
* **API check** (`tests/check_bk3_client_api.ts` style, in the browser test's setup): officer with `client=user-P` gets only Client A's Sample-firm cases with people; the solo representative gets only the solo case; Client A gets 403; no `keep_private`, answer or progress key in a row.
* **Code check** `tests/check_bk3_frame.ts`: the new routes pass through; fail side asserts exact targets: `/cases/clients/x1/nothing` → Back `/cases/clients/x1`; `/cases/clients` → Back `/cases`; the client area's `/cases/clients/x1` has no Back to a case address (M2).
* **Browser check** `tests/check_bk3_client_browser.cjs` at 1440 and 375 px, axe, no sideways scroll: one pass and one fail per BR; one request per page view (counted); "Acting as" unchanged across the new links; Open a case from Client B's page makes a Client B case; Cancel stays on the page.

## 6b. Capability or scaffolding; Needed for the proof
Client page, case-header link, Open a case for the client: capability, needed for the proof (the walk). Grouping by login: scaffolding for a client record (M4), labelled Simulated. Not built: a Client column on Cases, readiness per case.

## 7. Questions (answered by the tech lead, 11 Nov)
1. Case's line stays "Cases › VV-ref"; the client link goes in the case header. **Yes.**
2. One next step: Open a case for the client, in place. **Yes** (M1 fix).
3. A client is the simulated login that answers. **Yes**; in the demo most cases fall under Client A (the dialog's default), so the People column tells them apart.

## Definition of ready
Acceptance tests named above; row text "BK-3 PR 3: client page at /cases/clients/<login>, linked both ways (API: ?client= on the case list)"; decisions P-447 (2), P-457, P-473; challenge done; tech lead approval recorded. Ready.

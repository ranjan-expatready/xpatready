# BK-3 PRs 3-4: the client page and links both ways between a case and its client (concept DRAFT)

Drafter's draft (skill screen-concept, A steps 1-7), 11 Nov 2026, for the tech lead; not `concept.md`. Row: bake plan row 3 (`design/bake-plan-2026-11-10.md`), P-447 (2), held for a concept by P-457; style P-473. A screen, not a capability (after-29 plan §3, 1a). Board: `design/draft-client-page.html`. Paths below are under `prototype/studio/`.

## 1. Job and journey
* **Job:** a case officer, on any case screen, gets to the case's client in one click, sees that client's cases and people at their firm, and opens any of them. The founder's complaint: "If I go to the case run view area, I can't come back to the client."
* **Persona:** firm staff (Case officer, Representative). Staff wording. Not a client page *for* the client.
* **Journey:** the Bake walk (P-447 (1)), steps "family case" and "representative review": case → client → another case of the same client → back.

## 2. Ten layers (what exists, what is new)
* **Master:** no client record exists. A client today is the simulated login that answers a case: `Case.clientActorId` (`prisma/schema.prisma:1272`). Each case creates its own `Party` for the principal (`api/src/runtime.ts:290`), so no party spans cases. C6.19 already treats "same client" as same login + same firm (`api/src/earlier-facts.ts:51-55`). **New: nothing.** The page groups cases by `clientActorId`.
* **Links:** case → client is `clientActorId`; case → firm is `firmKey` (`schema.prisma:1280`). No new link.
* **Configuration, rules engine, AI assist, governance:** none touched (read-only page; nothing released, nothing written, nothing audited). Skipped on purpose.
* **Contract:** existing only (§6). `GET /api/runtime/cases` returns `id, reference, combination, status, created_at` and no client (`api/src/runtime.ts:933-938`); `GET /api/runtime/cases/:id` returns `client` and `people[]` (`runtime.ts:321-342`, `client` at :328).
* **Screen:** new route `clients/:clientKey` in `web/src/runtime/cases.tsx` (routes :72-81); its where-words in `web/src/components/where.ts` (cases branch :24-29, client branch :19-23).
* **Team's code:** the team's client spine (Party, PartyProfile) is mirrored in our schema (`schema.prisma:1468-1497`); `code/` is not in the cloud copy, so the team's own client screen is **Unverified** today.

**API change: not needed.** Web-only: one list read (`?take=100`, the API's maximum) plus one `GET /cases/:id` per listed case, at most 4 at a time, kept by `useApi` under `["runtime","client",key,actor]`, filtered on `client === key`. At sample scale (1-3 seeded cases, a few more in a demo) this is a handful of reads. **Limit:** cost grows with the firm's cases, not the client's; past 100 cases the page says it looked at the newest 100 (BR-5). Load estimate not measured: the builder times 1, 10 and 30 cases and records it. A follow-up runtime-lane row (not this one) would add `client` to list rows and a `?client=` filter: one read, and a Client column on Cases.

## 3. Business rules
| BR | Rule | Source |
|---|---|---|
| BR-1 | Staff only. A client (Client A, Client B) at a client page's address sees "This page is for the firm's staff", no name, no count, and no case read is sent. | `runtime.ts:946` (list refuses non-staff, 403); `cases.tsx:110, :198` (same pattern) |
| BR-2 | Firm scope. Only the viewer's firm's cases appear; another firm's case of the same login never does. | C6.11 BR-20: list filters `firmKey` (`runtime.ts:937`), each read checks it (`runtime.ts:145`) |
| BR-3 | A client is the login that answers (`clientActorId`); a case shows on exactly one client page; another client's case never shows. | `schema.prisma:1272`; `earlier-facts.ts:51-55` |
| BR-4 | Names and roles only: no answers, progress, documents or privacy settings. Kept-private people (C6.16) stay private: staff already see the same names on the case page. | `cases.tsx:222`; `web/src/runtime/privacy.tsx` |
| BR-5 | Honest counts. "N cases" counts the rows shown; if more than 100 firm cases exist, or some could not be read, the page says so; never a silent short list. | EXPERIENCE §2.7; UX rule 4 (`design/ux-2026-11-11/04-ux-standard-skill.md`) |
| BR-6 | Links both ways: each row opens its case; each case page names its client and links to this page. | P-447 (2); bake plan row 3 |
| BR-7 | An address with a key that is not a client login reads "No such client", with Back to Cases. | EXPERIENCE §4 (states) |

## 4. Layout (pattern: Workspace, light: header + one list; no side preview)
* **Address:** `/cases/clients/<clientKey>` (the stored key, e.g. `user-P`; no second mapping to keep). Where-line from the address: `Cases › Client`, then the page names it: **`Cases › Client A`**; Back → Cases. Client area: `Your application`, no Back (added to the check's homes).
* **Header:** H1 "Client A"; one line "Simulated client login · answers the questionnaire on 2 cases at Sample firm"; one filled button **Open a case for Client A** (Q2).
* **List "Cases"** (newest first): Reference (link) · Combination · People (name · role, the person who answers first) · Status · Opened. At 375 px the table becomes one card per case.
* **Case page link (PR 4):** in the case header, beside the team chip (`cases.tsx:209`): `Client: Client A` as a link. The "Client questionnaire" box (`:213-217`, "Open it as Client A (simulated)") stays as is.
* **States:** loading (skeleton in the final layout) · one case · several cases · none at your firm (empty, teaches "Open a case for Client A") · some reads failed (warn notice, rows that loaded stay) · more than 100 (notice) · refused (client viewer) · not found (unknown key).
* Quiet surfaces: brand blue only for the one button, links, focus; no orange (nothing "needs you" here); Sample marks kept.

## 4b. Best in class (from public product knowledge, not re-checked today)
* **Clio:** a contact's page lists its matters; the matter header names the client as a link; "New matter" from the contact fills the client.
* **Docketwise / INSZoom / LawLogix:** a client (beneficiary) profile lists every case or petition; each case header links back to the profile; new cases start from the profile.
* **CRMs (Salesforce, HubSpot):** "related list" on a record (Account → Cases) and a lookup link back.
* **Copy:** client link in the case header, related list on the client page, new case with the client filled. **Beat:** nothing typed twice (client filled), firm scope enforced by the server, honest counts.
* **BIC checks that matter:** BIC-08 (each case with its people by name and role), BIC-11 (one filled button, named), BIC-18 (states drawn, skeletons), BIC-20 (keyboard, 375 px, contrast). The other sixteen are about questions, documents and filing: N/A.

## 5. Copy
* Subline: "Simulated client login · answers the questionnaire on {n} case(s) at {firm}". Tooltip on "Simulated client login": "The prototype has no client records yet: a client is the login that answers a case."
* Empty: "Client A has no cases at Sample firm yet." + Open a case for Client A.
* Partial: "{k} of {n} cases could not be read. Reload to try again." More: "Showing Client A's cases among your firm's newest 100."
* Refused (client): "This page is for the firm's staff. You open your questionnaire from the link your officer sends." Not found: "No such client" + "Back to cases".

## 6. Contract and tests
* **Contract:** no new endpoint, no new field. Reads only; `Open a case for Client A` opens the existing dialog through `/cases?client=user-P` (pre-fills "Client login that answers", `cases.tsx:175`).
* **Code check:** `tests/check_bk3_frame.ts` picks up `clients/:clientKey` from the route list; staff: line names the place, Back → `/cases`; client: a home; fail side: `/cases/clients/x1/nothing` → "No such page", Back still leads out.
* **Browser check** `tests/check_bk3_client_browser.cjs` (1440 and 375 px, axe, no sideways scroll, keyboard to every case link). Seed: 2 Sample-firm cases for Client A, 1 for Client B, 1 solo-firm case for Client A.

| BR | Pass | Fail side |
|---|---|---|
| BR-1 | Case officer sees Client A's page | Client A and Client B at the address see the refusal; no `/runtime/cases` request; no reference on screen |
| BR-2 | Solo representative sees only the solo case | Case officer never sees the solo case |
| BR-3 | Client A's page lists exactly A's 2 cases | Client B's case absent from A's page |
| BR-4 | People shown by name and role | No answer value, progress figure or "Keep private" word on the page |
| BR-5 | "2 cases" equals the rows | One read answered 500 (routed): warn notice, the other row stays; list with `next`: the 100 notice |
| BR-6 | Case header → client page → other case, round trip | Each row's link opens a real case page (never "could not be opened") |
| BR-7 | `user-P` named | `user-Z` reads "No such client", Back → Cases |

## 6b. Capability or scaffolding; Needed for the proof
| Element | P-33 | P-26 |
|---|---|---|
| Client page (header, list, states) | Capability (screen over existing reads) | Needed for the proof (the walk) |
| Case header "Client: Client A" link | Capability | Needed for the proof |
| Open a case for Client A (pre-filled) | Capability (existing dialog) | Needed (Q2) |
| Client grouping by login | Scaffolding: stands in for a client record (M4) | Needed; marked "Simulated" |
| Client column on Cases; readiness per case | n/a | Not built (needs the runtime row / N more reads) |

## 7. Questions (recommendation first)
1. **Case's where-line.** **Rec: keep "Cases › VV-0001", add the "Client: Client A" link in the case header** (Clio's way; Back keeps one meaning; PR 1's checks stand). Alternative: "Cases › Client A › VV-0001" on every case screen: Back from a case goes to its client, but every case sub-page needs the client (`/prepare` lacks it: one more read or an API field) and PR 1's browser check changes.
2. **One next step on the client page.** **Rec: "Open a case for Client A"**, the existing dialog with the client filled (and C6.19 then offers Client A's earlier facts). Alternative: no button, the list only.
3. **What "a client" is.** **Rec: the login that answers (`clientActorId`), marked Simulated**; it is what the data holds and what C6.19 uses. Alternative: a person matched by name across cases needs a client record: a new capability, so M4, not the Bake.

## Definition of ready
* Acceptance tests: `tests/check_bk3_frame.ts` (extended) and `tests/check_bk3_client_browser.cjs`, one pass and one fail per BR above.
* Row text: "BK-3 PR 3: client page at /cases/clients/<key> (web only). PR 4: case header links to its client; Open a case for the client."
* Decisions answered: Q1-Q3 above; fresh challenge (skill B) done; tech lead approval (P-223 (4)).

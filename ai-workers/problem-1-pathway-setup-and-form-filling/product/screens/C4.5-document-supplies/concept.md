# C4.5 · Facts this document supplies (a person's step, US$0) — concept

Status: **concept, waiting for the tech lead's approval after an independent challenge (P-223 (4)).** No board: the part sits inside two existing screens. API and pack are built first (allowed by the brief); the UI waits for approval.

## 1. Job and journey
* **Job:** the configuration author says which facts a library document type shows, with the official words that say so, so those facts leave the Smart questionnaire (SQR) for every combination whose checklist names it; a second person approves (P-130, P-149 one door).
* **Persona:** Super Admin · configuration author (user-A); the approver or content reviewer decides on To review.
* **Why now:** every document type on the six is made with no facts (`api/src/checklist.ts` `docTypeOf`), so the SQR reads "0 from documents" and C4.5 is Partial. Nothing else writes supplies (hand-over note, 5 Nov).

## 2. Layers (STANDARDS §2)
| Layer | Exists | New |
|---|---|---|
| Data | `document_type.supplies_facts`, `supplies_about` | none (no migration) |
| Rules | `engine/sources.ts` `documentFacts`: a document on the person's checklist that supplies a fact is its source | none |
| Governance | `library_change` + `decideChange` (second person), `afterApprove`, `publishLibraryChanges` | kind `document_supplies`, action `SET_SUPPLIES` (`api/src/document-supplies.ts`), same path as "who fills" (C4.9) |
| API | — | `POST /api/library/document-types/:key/supplies` `{facts:[{fact, about, source, quote}], reason}` (contract `contracts/document-supplies.ts`) |
| Preview | "From X's documents" box, "asked instead if missing" sentence | `missing:<person>|<type>` try-out key; `sets.sqr.missing[]` |
| UI | Library › Document types column "Facts it can supply"; Documents drawer "Facts it supplies · from the library document type … a second person approves" | the editor panel below; one link from the drawer; a "Try it missing" toggle in Preview; To review words |

## 3. Business rules
* **BR-1** Only an author proposes; never the approver or reviewer (403). Source: P-53, BR-9.
* **BR-2** A second person approves; never the proposer (403, `decideChange`). Nothing changes before approval. Source: P-149, P-53.
* **BR-3** Every fact cites the official words that say the document shows it: source (form, edition, page) and quote (P-170, AGENTS.md rule 4). Sample, Unconfirmed: expert.
* **BR-4** Facts are shared fields only, not retired, not merged; each once; whom it is about: the holder (default), the holder's spouse or partner, or parent (`DOCUMENT_ABOUTS`).
* **BR-5** One open change per document type; at approval the type's current facts must equal the "before" the author saw, else 409 "Changed since".
* **BR-6** Approval makes a draft version of the type; the next release that carries it publishes it and marks the change released.
* **BR-7** A supplied fact keeps its question placed; it is not asked while the document is needed on that person's checklist, and is asked when the document is missing or unreadable (P-130). Preview lets the author try "missing".
* **BR-8** No combination or form number in code (P-319): the six's Sample supplies live in `samples/document-supplies.json`, used only by the packs as the person's step.

## 4. Layout (EXPERIENCE §3: side panel on a list row, as "Change who fills")
* **Library › Document types:** each row's actions gain **Change the facts it supplies…** (author only). A **Panel** opens, title the type's name, description "Used by N combinations · goes to a second person".
  * Top: the current facts as chips (or "None: filed as is").
  * A table, one row per fact: Fact (picker over shared fields, by meaning, with search) · About whom (select, default "The holder") · Official words (quote, textarea) · Source (form, edition, page; one line) · Remove.
  * "Add a fact" below the table. Reason (required). Footer: Cancel · **Send for approval**.
  * Waiting: the panel shows "Waiting for a second person on To review" with the proposed list, read only; the author can Withdraw.
* **Documents tab drawer:** the existing sentence becomes a link: "Change it in the library" → the panel above for that type.
* **To review › change page:** before → after (added and removed by name), each new fact's quote and source, used by N, reason, Sample; Approve or Return (the existing change page).
* **Preview › Client questionnaire:** under "From X's documents", each document gets a checkbox **Try it missing or unreadable**; checked, its facts are asked in the phone frame and the box shows "Missing (tried): its N answers are asked instead".

## 5. Copy
* Panel help: "List the facts this document shows, with the official words that say so. A second person approves; it changes every combination whose checklist names it."
* Empty: "None: filed as is." · Waiting: "A change of the facts \"X\" supplies already waits on To review or for the next release."
* Errors (API words): "Quote the official words that say the document shows it." · "This is not in the shared library: …" · "Each fact is listed once." · "\"X\" already supplies exactly these facts."

## 6. Contract and tests
* Route above; answer `{id, status, label, supplies: SuppliesView}`; `changeView` adds `supplies`; To review `what` reads `suppliesWords`.
* **Pack `acceptance/C4.5.test.ts`** (20 steps, C4.5-1…20) on Reset to the six: pass and fail per BR-1…BR-7, Preview missing, quotes found in the committed official text, US$0.
* After the UI: a browser check of the panel (open, add, send, waiting, withdraw), keyboard and 1024 px.

## 6b. Capability or scaffolding
Every element is capability. `samples/document-supplies.json` is test data for the person's step (P-319), never read by the product. The Preview toggle is the M2 stand-in for a case's "document missing" (C6.5, M3).

## 7. Questions for the tech lead
1. **Where the editor lives:** Library › Document types (recommended: supplies are library data, and the drawer already says so) or also inline on the combination's Documents tab?
2. **Preview "Try it missing":** keep it in this PR (recommended: it is what proves "asked when missing" in M2) or a follow-up row?

Definition of ready: pack C4.5 named · row C4.5 text as in `qa/CAPABILITIES.md` · decisions P-130, P-149, P-170, P-319, Lead 9's option 1.

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

## 4. Layout (EXPERIENCE §3: side panel, 480–560 px; revised after the challenge, M4, M5, m5)
* **Where:** it opens **in place from the Documents tab drawer** ("Facts it supplies" → **Change the facts it supplies…**, author only), where the author sees the gap; Library › Document types row actions open the **same panel** as the second way in.
* **The panel** (title: the type's name; description "Used by N combinations · a second person approves"):
  * **Cards, one per official line** (the challenge's fix for retyping: the passport's 9 facts rest on 4 lines). A card holds: Source (form, edition, page, one line) · Official words (quote, 2–3 lines) · Date read (today by default) · its **facts as chips**. The first card is prefilled from the checklist line's own quote and source (IMM 5484, its line).
  * Under each card, "Add facts": a search over shared fields by meaning; **suggested first** (rules, US$0): facts this combination's forms ask for the line's people that no document supplies yet, whose form box caption names the document ("as shown on your passport").
  * A chip is about the holder; its ⋯ menu offers "About the holder's spouse or partner / parent" and Remove.
  * "Add another official line". Reason (required). Footer: Cancel · **Send for approval**. A warning line under any fact no question asks yet (API `warnings`).
  * The API stays: the cards flatten to one cite per fact.
* **States:** none ("None: filed as is"); editing; **waiting** (read only, "Waiting for a second person on To review", Withdraw); **returned** (the reason, "Withdraw, then propose again"); **approved, not released** ("In every combination's draft and Preview now; goes out with each one's next release"); error (API words).
* **To review › change page:** before → after by name, each new fact's official words with source and date read, used by N, reason, Sample; Approve or Return (existing page).
* **Preview › Client questionnaire:** each document under "From X's documents" gets **Try it missing (Preview only)**; checked, its facts are asked and the box says "Tried as missing: its N answers are asked instead. At a case this comes with the document reader (M3)" (M3 honesty).
* **Copy fixes:** the Documents tab's sentence (done, M3) and the Library subtitle (m8: "approved by a second person; Sample until the immigration expert confirms").

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
1. **Approve this concept** (after the challenge's changes, §8) so the UI is built in this PR (recommended), or label the API and pack now and build the UI as the next row?
2. **C4.5 in M2:** scored on the Smart questionnaire tab plus Preview's try-out, with a case's own skipping arriving with the reader in M3 (challenge Q1; recommended).
3. **"Place of birth" supplies both birth city and birth country** (Sample, ask the immigration expert; challenge Q2, recommended: keep both).

## 8. Builder response to the challenge (challenge.md)
* M1 dated cites: `readOn` per fact (required, not in the future), shown on To review. Done.
* M2 tests: pack steps 21–25 (listed twice, date read, Nothing changes, Changed since, withdraw); `tests/check_c45_supplies_release.ts` on the fixture for BR-4 (merged, about the spouse) and BR-6 (released, published, snapshot). Done.
* M3: Documents tab sentence fixed; pack step 16 needs every fact back; Preview toggle words above. Done or in §4.
* M4, M5: layout above. m1: citizenship's source names the legal-status line; Q2 asks about place of birth. m2: the release line names facts (`engine/validate.ts`). m3, m4: released only when the published type carries the approved facts. m5, m8: §4. m6: `warnings`. m7: words at approval and on To review. Done.


Definition of ready: pack C4.5 named · row C4.5 text as in `qa/CAPABILITIES.md` · decisions P-130, P-149, P-170, P-319, Lead 9's option 1.

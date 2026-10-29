# W1-15 Questions and documents (P-130–P-132) — build notes (runtime lane)

## Outside review items (29 Oct, Lead note; Devin backbone review DV-bb-3, DV-bb-6a)
* **DV-bb-3:** "Add a form from the library" said "Upload an IRCC PDF below" with nothing below. With no form or no match it now says a new form enters the library first and links to the Form library ("upload it in the Form library"), where Upload PDF is. The older panel that has an upload under the picker keeps "Upload the IRCC PDF below" (`FormPicker uploadBelow`). `web/src/components/forms.tsx`.
* **DV-bb-6a:** the default people and the sample combinations called the child role "Dependent child"; they now use the shared library's label, "Child" (P-108). A label typed on purpose ("Child (travelling)") is kept (L7). `contracts/programs.ts` DEFAULT_PARTICIPANTS, `samples/programs.json`.
* Test `tests/check_dv_backbone_browser.cjs` 8/8 (port 4433): a pass and a fail for each.

## Slice 1: data and rules (BUILD, 29 Oct) → EARLY-LOOK
Agreed plan: `plan.md`, challenge and Lead response: `challenge.md`. No screen in this slice; the evidence is the API and the engine. AI US$0 (rules only).

**What it does**
* **Comes from, worked out by rules** (`engine/sources.ts` `factSources`): every fact a combination's forms need, per person role, with its source by precedence: a client-only section (P-97) › a document on **that role's** checklist that supplies the fact › the agent's own facts (`representative.*`, `organisation.*`, a representative's facts, staff working view, existing record) › the client. Proposed by **Rules**. On With an LMIA (Load sample): 245 facts by role; 32 from documents, 178 from the client (58 of them client-only), 35 from the agent.
* **Who a supplied fact is about** (Lead's addition to M6): `DocumentType.suppliesAbout` lists the facts not about the holder (`holder.spouse`, `holder.parent`); the rest are about the holder, the person the checklist line names. Two documents supplying one fact: the always-needed one first, then by key; the others are "also supplied by" (m1).
* **Coverage per role** (M3, `engine/coverage.ts`, `engine/render.ts` via `documentFacts`): a document covers a fact only for the people its checklist line names. A passport asked of the principal no longer covers the spouse's passport number.
* **FactSource** (M1; table `fact_source`, migration `20261029090000_w115_fact_sources`): only a person's choice over the rules (Comes from, with its document) and the Pre-qualification tick are stored; choosing the rules' own source stores nothing but the tick. A draft until the combination's release publishes it; the author undoes their own draft at once; a released choice is never undone ("Released since"); a retired combination is refused; a stale version is 409. Routes (`api/src/fact-sources.ts`): `GET /combinations/:id/fact-sources` (counts, each fact, the PQR), `PUT …/fact-sources/:role/:fact` (author; `source`, `documentTypeKey`, `prequalification`, `reason`, `version`), `DELETE …` (Undo, own draft).
* **Release rules (C4.10)** in `engine/validate.ts` (`factSourceProblems`), each naming the person, the fact in words and the fix; the same rules refuse at save (422 on the field):
  * a chosen document that is not on that person's checklist or does not supply the fact: error;
  * a document fact with no fallback question: **warning** when the document is always needed, **error** when it is asked only in some cases (Lead Q3);
  * Client chosen with no question, Agent chosen with nowhere to enter it: error;
  * Document or Agent on a client-only fact (P-97): error;
  * Pre-qualification on an Agent fact, or on a fact no question asks: error. A tick on a document fact with a question is allowed (Lead Q1): PQR ⊂ SQR ∪ the client's checklist documents;
  * a choice on a fact no form needs any more: warning.
* **Snapshot and Review** (M5): `fact_sources` joins the snapshot only when a combination has a choice; a placement in a client-only section carries `client_only`, a document type with subjects carries `supplies_about`, each only when set. Each choice and tick is one line on Review, "Where an answer comes from", needing the immigration expert's sign-off (P-76).
* **Sample library data** (M6, m2; `samples/questions-and-documents.json`): the client-only sections (Background declarations, Medical background, Service and government positions) and the marriage certificate's facts. It is applied while the sample library is imported, before Release 1 of With an LMIA is recorded, so that release includes it and the draft still equals it after Load sample (no new change appears).

**C4.9 reworded (Lead Q2; the Lead updates CAPABILITIES):** "Where each answer comes from (Document · type, Client, Agent) is worked out by rules from the library's placements and each document's supplied facts; a person may choose otherwise for one combination, and that choice is reviewed at that combination's release by a second person. Sections marked client-only (P-97) stay Client: release refuses Document or Agent there."

**Also in this pass**
* **QA-69:** the Forms tab offers no Undo for a change made before the combination's latest release, and the forms Undo refuses it ("Released since"), as people Undo does (L6). `api/src/workspace.ts`, `api/src/form-library.ts`; tests in `check_s5_leadcheck.ts` (49/49).
* **Devin Review on PR #71:** "In the library" only when the shown file's own edition has a field map (a newer, unmapped edition keeps Draft with AI); "AI now" follows the server's plan (`live.approved`, `live.why`), the API stays the guard. `check_s5_leadcheck_browser.cjs` 21/21, `check_s5_live_approval_browser.cjs` 5/5 (a copy started with the approval set).

**Checks:** `tests/check_w115_slice1.ts` 39/39 (port 4434; engine on the sample's own draft snapshot changed in memory, and the API); record `tests/check_w115_slice1.json`. Labels name C4.10 and C4.2.

**Not in this slice (named):** the client view still asks every placed fact, including those a document supplies (`engine/render.ts`): slice 4, Preview in three sets, with a test that a case on an older release keeps asking as before. Facts about a person who is not on the case (a parent named on a birth certificate) are attributed to that person's place (`child-1/parent_1`), as form fields are today; nothing more until the immigration expert needs it.

## Fixes: Lead check after the founder's early look (29 Oct, W1–W3)
* **W1:** Review's "Where an answer comes from" lines use the fact's words and the role's label, never system keys: "Date of birth (Principal applicant): comes from the client", "…: pre-qualification", a document by its name ("comes from the Passport"). `engine/validate.ts` diff, with `factWords` and `who` from `engine/sources.ts`.
* **W2:** an Undo by anyone but the draft's author answers "Only the person who made this draft can undo it." (403 without the author duty, 409 for another author), never the duty name. `api/src/fact-sources.ts`.
* **W3:** no decision code in a user-facing message: the client-only refusal at save and the release check drop "(P-97)". Swept `api/src/fact-sources.ts` and `engine/sources.ts` (factSourceProblems): no other code left.
* Tests, a pass and a fail each: `tests/check_w115_slice1.ts` 47/47 (8 new "Lead check W…" steps); `check_engine` 38/38. US$0.

## Slice 2: the Questionnaires tab to board v2 (29 Oct; P-147, plan.md "Slice 2 against board v2", agreed by the Lead)
**Built**
* **Strip** (C4.10): Full form facts = From documents + Client answers + Agent enters, Pre-qualification, and "✓ Every fact has one source" or "n release checks to fix". Counts are the server's (`GET …/fact-sources`).
* **Chips:** the person chips as built; source chips All · Document n · Client n · Agent n; "Needs you · n" (the release checks on this person's rows; AI checks join in slice 5).
* **Rows of five things:** Question · Comes from · Pre-qualification · Only if · Status, with a tick box and a ⋯ menu. Status is the newest saved choice: Rules (nothing changed), Changed here (a draft), Released (changed and released), or Release check. A lock on a declaration; "⚠ No fallback question" on a document fact no question asks. Facts no question asks (read from a document, or entered by the agent) are listed under "Answered without a question". Facts about the case itself (file number, office) show where their question sits, and with the principal applicant otherwise.
* **⋯ menu (P-147 Q1):** Open details; Change where it comes from…; Back to the rules' default; Change in the library…; Move up or down (greyed: "The order is set in the library section … Change it there."); Retire (greyed: "A question line is not retired here. Retire the question in the library."). Each greyed item keeps its reason as visible text. An approver sees every change greyed with "Read only: you do not hold the author duty."
* **Side drawer:** where the answer comes from (each supplying document, Client, Agent; a greyed choice says why), the fallback "reachable", "Also supplied by" (information only), "an override for this combination only, reviewed in this combination's release"; Pre-qualification with its reason; when it is asked, kind of answer, where it sits, used by, status and history, and the system name (only here). Save shows on the row; one Undo toast.
* **Bulk bar (P-147 Q2):** only while rows are ticked, floating at the bottom of the content so the rows never move under the pointer. Set where it comes from (Client, Agent, Back to the rules' default) and Pre-qualification on or off. The server re-checks every row; refused rows are listed in words with their question; the rest are saved together under one batch id; one Undo per bulk change. No bulk remove, delete or retire. Accept and Reject of AI proposals come with slice 5 (the Lead agreed).
* **Who can be in this application** folded to one line by default ("Show and edit" opens the built card) (P-147 §3).

**API and data**
* `GET …/fact-sources` now gives each row's `change` (DRAFT or PUBLISHED, by, at, batchId) and `problems` (the release checks, each with its person `role`).
* `POST …/fact-sources/bulk` `{ items: [{ role, fact, version }], source?: CLIENT | AGENT | DOCUMENT | RULES, prequalification? }` → `{ saved, batchId, what, refused[] }`; `POST …/fact-sources/bulk/undo` `{ batchId }` → `{ undone, kept[] }`. Undo by anyone but the author: 403 "Only the person who made this draft can undo it."; after a release: 409 "Released since"; twice: 409 "Nothing to undo"; a row changed again afterwards keeps that later change.
* Migration `20261029150000_w115_bulk_batch`: `fact_source.batch_id` (expand only).
* **Lock added from the board (frame 1):** Agent is offered only for a fact the rules give the agent. A save or bulk change of Agent on a client or document fact is refused: "Not offered: the agent enters only the representative's, the office's and the case's own facts. Choose the client or a document." (Slice 1 allowed it when the agent had a place to enter it; the board says not offered.)

**Not in slice 2:** Documents tab (slice 3; Copies, Translation, Validity window read-only Sample there), Preview in three sets (slice 4), AI proposals with Accept, Reject and Decide side by side (slice 5).

**Tests:** `tests/check_w115_slice2.ts` 26/26 (API: bulk, locks, batch Undo, row status, Needs you role, release; a pass and a fail each); `tests/check_w115_slice2_browser.cjs` 46/46 (1440 and 1024, axe on 8 states; screenshots in `screenshots/slice2/`). The older S5 browser tests open "Show and edit" first. US$0.

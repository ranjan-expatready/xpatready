# W1-15 Questions and documents, slice 1 — plan (runtime lane, PLAN, 29 Oct)

Concept: `concept-draft.md` §2, §4, §10 (agreed 29 Oct; P-130–P-134; on the Lead's branch `lead/2026-10-28-r7`, not on main yet). Fresh re-check (R-109) and challenge: `challenge.md` (a fresh agent; verdict **Build after these changes**, 0 Blocker, 6 Major, 2 Minor). I checked its main claims in the code: a placement is one per fact per workspace (`api/src/studio.ts` savePlacement, `lineageKey` = fact key), `SectionQuestion.tier` is the only PQR marker, document facts are combination-wide (`engine/coverage.ts:22`), and only the imported work-permit document types have `suppliesFacts`. **I agree with all eight points.** Slice 1 below is the challenge's shape. Nothing is built until the Lead answers.

## What slice 1 builds (data and rules, US$0, no screen)
1. **Comes from, worked out by rules** (`engine/sources.ts`, pure): for each fact a combination's forms need, per person role, precedence **Document › Client › Agent**:
   * Document · type, when a document on **that role's** checklist lists the fact in `suppliesFacts`;
   * Client for a fact in a section marked client-only (P-97: declarations and background) and for everything else the client can give;
   * Agent for the representative's, office's and case's own facts (`representative.*`, staff working view, existing record).
   Proposed by: **Rules**.
2. **`FactSource` table**, versioned like document requirements (draft → published at release; the author's own draft deleted at once, with Undo): only what a person sets over the rules' default — an override of Comes from (with its document type and reason) and the **Pre-qualification tick**. Key `combination` + `role|fact` + version. Nothing is stored for a fact left at its default, so new forms or documents never leave stale rows and old releases need no rows.
3. **`LogicalSection.clientOnly`** (P-97): marked on the sample declaration and background sections in `samples/`; changed only through the library-change path.
4. **Sample `suppliesFacts`** for the sample document types (passport, marriage certificate, birth certificate …) in `samples/` as Sample data, so "document first" has something to derive on Visitor visa and Super visa (today it derives Client everywhere outside the work-permit import).
5. **Coverage per role** (fix first): document facts per role from the requirement's `who`, in `engine/coverage.ts` and `engine/render.ts`. Sample data that then shows a gap gets fixed, never the rule.
6. **Release rules (C4.10)** in `engine/validate.ts`, each in words naming the fact, the person and the fix:
   * the primary source must be reachable: Document → that role's checklist has the document and it supplies the fact; Client → a question is placed; Agent → a question is placed or the fact is the representative's (**error**);
   * a document fact with no fallback question: **warning** when the document is always needed, **error** when it is conditional or one of alternatives (nobody would be asked on a case without it);
   * Pre-qualification only on a Client or Document fact that has a client question (**error** on an Agent fact or with no question); PQR ⊂ SQR is read as "PQR ⊂ SQR plus the client's checklist documents" (Lead question 1);
   * never Document or Agent on a client-only (P-97) fact (**error**).
7. **Snapshot and Review:** `fact_sources` joins the snapshot only when the combination has rows (the S5 `min_age` pattern), so every released fingerprint stays as it is; a `diff()` entry names each override and tick on Review, needing the immigration expert's sign-off (P-76).
8. **API:** the Questionnaires tab view gains `source`, `document`, `proposedBy`, `prequalification` per fact and role (read); `PUT /combinations/:id/fact-sources/:role/:fact` (author, with version: a stale one is 409), `DELETE` for Undo of one's own draft.

Not in slice 1 (named so it is not lost): the case still asks every placed fact (`engine/render.ts:221`); skipping document-sourced facts in the client view belongs with slice 4 (Preview in three sets), with a test that a case on an older release keeps asking as before. Facts a document supplies about **another** person (a marriage certificate's spouse) wait for the immigration expert.

## Back-end table
| Element | Record | API | Rule | Pass test · fail test |
|---|---|---|---|---|
| Default source | none (worked out) | read in `…/workspace?tab=questionnaires` | `sourceOf()` precedence, per role, P-97 | passport fact of the principal → Document · Passport · no supplier → Client; `representative.*` → Agent · a client-only fact is never Agent |
| Override | `FactSource` draft row | `PUT …/fact-sources/:role/:fact`, `DELETE` (Undo) | override must be reachable | Client override saved · Document whose type is not on the role's checklist → 422 at save, error at release; stale version → 409 |
| Pre-qualification tick | `FactSource.prequalification` | same `PUT` | PQR rules above | tick a Client fact · tick an Agent fact → 422 |
| Coverage per role | — | — | `coverage.ts`, `render.ts` | a passport for each applicant covers the spouse · a principal-only passport gives the spouse's passport number a coverage error |
| Release gate (C4.10) | — | existing submit and release | `validate.ts` as in 6 | each refusal in words (fact label, person, fix) · a reachable configuration releases |
| Fingerprint and Review | snapshot key only with rows | — | `diff()` entry | every sample and the imported c1-v3 keep their fingerprint · one override changes it and is one named Review line |
Tests: `tests/check_w115_slice1.ts` (API and engine, its own runtime port); labels name C4.10 and C4.2 (P-86). US$0.

## Team model
* The team's `pqrCanonicalFieldKeys` is per combination: our Pre-qualification tick on `FactSource` is the same thing, versioned (P-76, P-132; the country PQR is a view later).
* `SectionQuestion.collectedFrom` stays the library's default way of asking; `tier` stays an AI hint (P-130).
* `DocumentType.suppliesFacts` is the team's reader profile list (AG-08); editing it stays a governed library change (S6 / W1-10 step 3).

## Ownership
Runtime lane: engine (`sources.ts`, `coverage.ts`, `render.ts` coverage only, `validate.ts`, `snapshot.ts`), the migration (`FactSource`, `LogicalSection.clientOnly`), the API, `samples/` data, tests. The Lead: C4.10 in `qa/CAPABILITIES.md` and C4.9's rewording (P-74), the questions below. Forms lane: nothing in slice 1 (W1-10 steps come in slice 5).

## Questions for the Lead (from `challenge.md` §5; I recommend yes to each)
1. Allow a Pre-qualification tick on a fact a document supplies (the PQR asks it; the document read is later compared with it, a check, not an overwrite)? Otherwise the PQR cannot ask citizenship or date of birth.
2. P-97 with per-combination Comes from: the library's placement stays the default, a per-combination override is reviewed at that combination's release by a second person; C4.9 reworded?
3. A document fact with no fallback question: a warning when the document is always needed, an error when it is conditional or an alternative?

## Slice 2 against board v2 (P-147): fit check of slice 1 (runtime lane, 29 Oct, before any slice 2 code)
Board v2 (`design/draft-questions-and-documents-v2.html`, notes `concept-draft-v2-notes.md`, agreed P-147 on Lead PR #77) needs no change to slice 1's data model: `fact_source` (one choice or tick per role and fact, versioned, draft until release), the clientOnly marker, supplies-facts with About whom, and the C4.10 release checks all hold. Slice 2 (Questionnaires tab, frames 1, 2, 7, 8) adds the following, on the Go after the founder's early look of slice 1:
* **Rows carry 5 things** (Question · Comes from · Pre-qualification · Only if · Status). The fact-source view gains `onlyIf` (the placement's or question's condition, in words) and `status` (Released · Changed here · Rules; AI · High/Check/Decide comes with slice 5). Today it has `proposedBy` only.
* **"Needs you"** counts release checks per row: the C4.10 problems gain the person role (today they carry the fact only), so a check lands on its row and its role chip.
* **Bulk bar** on ticked rows: Set where it comes from, Pre-qualification on or off, in slice 2; Accept (High only) and Reject arrive with the AI proposals (slice 5). One new route applies a bulk change: each row re-checked against the locks (clientOnly, no tick on an Agent fact, Document not on the role's checklist, someone else saved), refused rows listed in words, the rest saved together with one batch id; one Undo per bulk change (the author's own draft rows go at once; a row released since stays, "Released since"). No bulk Remove, Delete or Retire.
* **⋯ menu and drawer footer** with each greyed action's reason under it: "Back to the library default" is the existing PUT with the rules' own source (stores only the tick); "Move up or down" greyed with "The order is set in the library section … Change it there"; Retire greyed with "Retire the question in the library"; Change in the library opens S6's library edit.
* **Drawer:** where the answer comes from (rules default, override "for <combination> only, reviewed in this combination's release"), fallback "reachable" (`placed`), "Also supplied by" as information only (`also`), pre-qualification with its reason, Used by, status and history.
* **"Who can be in this application"** folded to one line by default; the built table behind "Show and edit".
* Not in slice 2: Documents tab (slice 3; Copies, Translation, Validity window read-only Sample there), Preview in three sets (slice 4), AI proposals and Decide side by side (slice 5).
Files: `engine/sources.ts` (view fields, problem role), `api/src/fact-sources.ts` (bulk and batch Undo), `web/src/pages/workspace/questionnaires.tsx` and a new drawer component; none of the P-143 channel files. Tests: a new `check_w115_slice2.ts` (API: bulk, locks, batch Undo, pass and fail each) and `check_w115_slice2_browser.cjs` (1440 and 1024, axe).

## Slice 3: the Documents tab to board v2 frame 3 (runtime lane, 29 Oct; the Lead's Go after the slice 2 early look)
Fit check against today's data: a checklist line is a `document_requirement` (type, who, base or conditional, provided by, IRCC's words); the type says which facts it supplies and about whom (slice 1). Two things on the board have no data yet, so slice 3 adds them, expand only, each in the snapshot only when set (the fingerprint pattern, so released combinations keep theirs):
* **Checklist order per person** ("Move up or down: changes the checklist order for <person> at once, with a History line"): `document_requirement.position`. A move changes the draft line at once (no second person), with a History line, and goes out with the next release like any draft change.
* **Alternatives, any one counts** ("Passport · or Travel document"): `document_requirement.alternatives` (library document type keys). Shown in the row ("or …") and the drawer, set in Edit. In slice 3 the facts a line supplies are its own type's; an alternative that supplies fewer facts is named in the drawer ("the client is asked the rest when this one is given"). Using alternatives in the case runtime belongs with slice 4 (Preview) or later; named so it is not lost.
**Builds:**
* `GET …/checklist`: per person role, each line with Document · Who · When · Supplies ("9 facts · 2 about the spouse") · Status, and for the drawer: provided by, alternatives, the facts it supplies with about whom and whether each is taken out of the questionnaire (slice 1's source for that person and fact is this document), IRCC's words, status and history. The rules: one engine function beside `documentFacts` (engine/sources.ts), so Questions and Documents agree.
* The tab: person chips with counts; All · Always · Only if; "Needs you" (the release checks on Documents and slice 1's checks that name a document); Find a document…; rows of five things with a ⋯ menu (Open details; Move up or down; Remove from checklist, warning "n facts move to the client questionnaire", own draft at once with Undo, released at the next release; Change the document type in the library…; Retire greyed with "A checklist line is removed, not retired. Retire the document type in the library."). The drawer per frame 3, with Copies, Translation and Validity window read-only, Sample, "not set: the immigration expert's list" (P-147 Q3). "+ Add a document" is the existing add dialog, library type first.
* Undo of an own-draft removal: a small route that takes back the author's own Removed-in-draft line (403 "Only the person who made this draft can undo it."; 409 "Released since").
* Not in slice 3: library document type edits (S6), AI proposals (slice 5), Preview (slice 4), the P-143 channel files.
* Tests: `check_w115_slice3.ts` (API: checklist per person, supplies and about whom, taken out, order, alternatives, remove and its Undo, locks; a pass and a fail each) and `check_w115_slice3_browser.cjs` (1440 and 1024, axe).

## PQR (M2 queue item 2; C4.2, C4.7, C4.8; P-76, P-130, P-132): runtime lane, 29 Oct, fresh session
**Already there (slices 1–2):** the per-combination PQR tick is a `fact_source` row (one PQR record per combination, P-132). Save, bulk change and release refuse a tick on a Case officer fact or on a fact no question asks (PQR ⊂ SQR ∪ checklist documents, Lead Q1). Each tick is a Review line with `needs_sme` and goes out in the combination's one release (P-76). The row shows "Ask"; the strip counts the ticks.

**What this pass adds (US$0, no AI call):**
| Element | Record | API | Rule | Test (pass / fail) |
|---|---|---|---|---|
| C4.2 the combination's PQR as a set: a "Pre-qualification n" chip on the Questionnaires tab shows only that person's ticked questions | `fact_source` (no change) | `GET …/fact-sources` (exists) | PQR ⊂ SQR ∪ documents (exists) | the chip lists exactly the ticked rows / an unticked row is not listed |
| C4.2 country PQR (P-132): assembled from released combinations, never stored | `config_release.snapshot.fact_sources` | `GET /api/pqr/country` | newest release per combination; a draft tick is not in it until released | a released tick appears with the combinations that ask it / a draft-only tick does not |
| C4.8 one review and release | none | release (exists) | a tick or untick is a Review line in words with `needs_sme`; there is no PQR-only approval route | Review names the tick; the released snapshot carries it / an untick after release shows as removed |
| C4.7 AI picks with a reason, accept or remove each | **question below** | intake for W1-10 step 7 | identity = fact + role (W1-10 plan (2)); the same refusals as a tick | — |

**Question for the Lead (C4.7, before it is built):** the producer is W1-10 step 7 (forms lane, `W1-ai-drafting/plan.md` slice 4), and the queue-item contract has every producer write into S6's queue (screens lane), which no branch has built. Board v2 shows the pick on the Questionnaires row ("AI proposal · not yet accepted", Accept / Reject, reason and quote in the drawer). Where does a pending pick live until S6's queue exists? *Recommend:* runtime adds a small per-combination pick record (fact + role, reason, quote, producer, Pending / Accepted / Removed) with an intake route taking the agreed `ProposalPayload` `pqr_pick` + `ProposalSource`. Accept writes the tick through the same save (origin AI_PROPOSAL, reason kept), so it joins the one release; Remove keeps who and when; a pending pick changes nothing. S6's queue later lists these rows instead of copying them. Until W1-10 step 7 runs, a rules producer proposes picks (the facts a rule of the combination reads, "Proposed by Rules"), never labelled AI.

**Lead's answer (29 Oct): no runtime pick store.** P-149 is one door: every proposal lives in S6's one `ProposalItem` table (S6 slice 1, right after PR #90). A second store would mean a migration and two review lists. **Order:**
1. C4.2 and C4.8 now: done (`check_pqr.ts`, `check_pqr_browser.cjs`).
2. The C4.7 producer and Accept path against contract v2, not put into any queue yet: done. `engine/sources.ts pqrPicksByRules` makes `pqr_pick` items with origin "rules" and no `ProposalSource`, never labelled AI, until W1-10 step 7 runs. `api/src/fact-sources.ts acceptPqrPick` writes the tick through the same draft row and refusals; it has no route of its own. **Wiring into S6's queue waits until S6 slice 1 is on main.**
3. While C4.7 waits: queue item (3) who fills (C4.9), then (4) Preview; then back to C4.7 to wire it into the queue.

## Who fills (M2 queue item 3; C4.9; P-97, P-23): short plan for the Lead, 29 Oct (no code yet)
**What C4.9 means now.** Lead Q2 (slice 1) already split C4.9 into two parts:
* **Built (slices 1–2):** the per-combination override (Comes from, reviewed at that combination's release) and the client-only lock on background and declaration sections.
* **Not built: the library default.** P-97 says that changing who fills a question for every combination is a library change: a second person approves it on To review, and it goes out with the next release.

**Finding: the library page breaks P-97 today.** On the library field page (`web/src/pages/library.tsx`), "Collected from" saves straight to a draft placement version (`POST /library/fields/:key/placement`, `api/src/studio.ts placeField`). No second person approves it, and it is published with the next release like any draft.

**The plan (US$0; reuses the existing library-change pattern, no new table):**
| Element | Record | API | Rule | Test (pass / fail) |
|---|---|---|---|---|
| Propose: "Change who fills, for every combination", from the Questionnaires drawer, with a reason and "used by n combinations" | `library_change` kind `placement_fills`, action `SET_FILLS`, `matches` {before, after} | `POST /api/library/fields/:key/fills` {to: client · case_officer, reason} | Only Client ↔ Case officer. Refused: a client-only section (P-97), no change, one already waiting, a fact with no placement, a retired field; author duty | Proposal saved as WAITING, the placement unchanged / each refusal in words |
| Approve on To review by a second person | the same row | the existing `decideChange` (proposer and draft applier refused) | Approval writes a DRAFT placement version with the new `collectedFrom` (origin HUMAN); nothing changes before approval | Approved → draft version / the proposer approving → 403 |
| Out with the next release | `publishLibraryChanges` (existing: APPROVED → published, RELEASED in the pack) | release (existing) | Each affected combination's Review names it once, in words, with `needs_sme`; a per-combination override (C4.10) stays in place and still wins | Released snapshot's placement carries it; the Comes from rules follow it / an override keeps its own source |
| Lock the direct edit | — | `placeField` | Changing `collectedFrom` on an existing placement is refused with "Who fills is changed with a second person: use Change who fills". A new placement may still set it. | Direct change → 409 / new placement → 200 |
| Shown | — | `GET …/fact-sources` adds `fillsChange` {to, by, status} | The row and drawer say "Waiting for a second person: Case officer for every combination" | Browser: propose, see Waiting, approve as the second person, then see the draft |

**Questions for the Lead:**
1. **Files.** To review (`api/src/review-queue.ts`, `contracts/review-queue.ts`), approval and publish (`api/src/library-changes.ts`, `api/src/lifecycle.ts`) and the library page (`library.tsx`) are the screens and forms lanes' files. *Recommend:* runtime makes the narrow additions: one kind in the To review list and words, the apply step at approval, the propose route, and the lock in `placeField`. The Lead tells the screens lane, so S6 slice 1 does not collide. The other way is that screens adds the kind and runtime builds only the drawer, the route and the lock.
2. **Values.** Only Client ↔ Case officer (P-97's words)? The other values (verified document, profile record, existing record) stay as they are and are not offered. *Recommend yes:* "from a document" is per combination now (Comes from, P-130).
3. **The library field page.** Make its "Collected from" read-only for an existing placement, with the same "Change who fills" door? *Recommend yes;* otherwise P-97 has a side door.

**Size:** medium: one route, one apply step, one lock, a drawer section, two checks (API and browser). It does not wait on S6.

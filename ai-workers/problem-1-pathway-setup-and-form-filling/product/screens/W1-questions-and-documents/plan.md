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

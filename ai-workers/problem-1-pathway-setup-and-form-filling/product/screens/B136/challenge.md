# C6.14 (B136) fresh challenge of concept r1 (independent challenger, 9 Nov)

Read: `concept.md` r1 (no `design/` folder), SA-1B-151 (SA-01B v2.1 :1485), SA-1B-214 (:3765), SA-1B-215 r2 (:3797), SA-1B-57 r2, SA-1B-75 r4, J1 step 2, AG-7-15 r1 and r6 (KNOCK-ONS :155, :157); app code on 3ca14d19a. `ai-workers/tools/freshness.sh` fails in this copy (no `code/` capture), so team-code claims are **Unverified**. The working tree already holds uncommitted build work (schema, migration, `engine/runtime/case-checklist.ts` :241-258). It is cited only where it shows a concept rule in code.

## Verdict
**Build after these changes.** There are no Blockers. Three Majors, all cheap to fix: the library change path, the age rule, and the proof path.

## Objections
**M1 Major: the library change skips the second person (standards, governance). Needed for the proof.**
* **What breaks:** Q1 recommends a direct author edit of a published type's draft. P-253 (DECISIONS :164) says "rule changes and anything in a released combination need a second person", and BIC-17 (EXPERIENCE :78) says "a configuration change set is never approved by its author". Every other document-type change already takes the propose → approve path: supplies (`api/src/document-supplies.ts:1-8`) and sets (`api/src/document-sets.ts:1-8`).
* **The cited precedent does not apply:** C3.16 allows a direct edit "only while no version of the field was ever published" (`api/src/field-scope.ts:2`, SA-1B-130 r4).
* **Example:** "Marriage certificate copy" is published and used by vv.single's release. One author could change who provides it with nobody checking.
* **Fix:** take the document-sets.ts path: a new library-change kind, the whole ordered list with a reason, approval on To review by someone other than the proposer, and the draft version written at approval. Drop Q1. The GET/PUT contract becomes GET plus propose (POST), as `/sets`.

**M2 Major: BR-4 reads age differently from the requirement and treats unknown ages as adult. Needed for the proof.**
* **The rule:** SA-1B-151 r3 measures age "on the day the resolver runs", and SA-1B-75 r4 runs the age check at case opening, form approval and submission. The concept uses the application date, which can be in the future, so a 17-year-old who turns 18 by that date is named today. That deviation is not stated.
* **The assumption:** BR-4 also keeps a person whose age is unknown in any "adult-only role". That is an immigration value with no source (AGENTS rule 4). It also breaks AG-7-15 r6: a check missing an input says "can't check", never a pass.
* **Evidence in the drafted code:** `mayProvide` (`case-checklist.ts:252-255`, working tree) passes every non-child role with "age not answered yet", which includes any custom workspace role.
* **A gap:** an officer's stored provider is re-checked only for leaving the case. A corrected birth date that makes them 16 leaves them named.
* **Fix:** use today's date (or record the deviation as the founder's choice). An unknown age is never a provider: the line says "can't check: <person>'s date of birth" and BR-5 applies. Apply BR-4 again on read to stored choices. Add one test for each.

**M3 Major: the proof path is not stated (back end, P-33). Needed for the proof.**
* **What breaks:** the checkpoint's vv.single release carries no roles, and a case stays on the release it is pinned to. Roles reach a case only through a new release and a new case. Without that path written down, the builder may seed roles into the checkpoint data (a stand-in posing as the capability), or test only the fallback.
* **Precedent:** `acceptance/C6.15.test.ts:36-130` shows the path: propose, approve, `release()`, then a new case.
* **Fix:** write this path into §6 and the demo steps. Set the vv.single applicant's marital status so the conditional line is Needed. Add a test that a case pinned to the earlier release still falls back to the holder (SA-1B-20 r4 pattern).

**Minor (all *Not built* unless marked)**
* m1 **`case` on a files-own case.** SA-1B-215 r2 keeps a "once for the application" line "once per filing". The engine puts `case` once, on the principal's list only (`case-checklist.ts:179`), so `shared: "application"` would claim one item where the requirement has one per filing. No release uses `case`, so the concept should say this is unresolved and test only `couple_once` (founder Q2).
* m2 **Two fallbacks in the requirement.** SA-1B-151 §1 says "falls back to the principal applicant" and AG-7-15 r1 says "default principal applicant". SA-1B-151 r1 and SA-1B-214 r1 say "the filing's first applicant". On vv.single these are different people (principal or spouse), and BR-5 picks one without naming the conflict (founder Q1). *Needed for the proof.*
* m3 **Rules with no source.** Excluding the representative and capping the list at 4 are not in SA-1B-151. Label them as the concept's own guards. Also, the BR-6 dialog lists every person on the case, which can include a representative that BR-1 excludes: use the same rule in both places.
* m4 **Officer actions on waiting lines.** A `checklist_line` row exists only once a line is Needed (`api/src/case-checklist.ts:87-88`, :138-139). Changing providers on an Answer-first line answers 409. Write this into BR-6 and add one test.
* m5 **Retrofit mapping.** The team's shape has only `ONCE_FOR_APPLICATION` and `EACH_PERSON` (SA-1B-57 r2); `couple_once` is ours. Add one line: couple_once ≈ ONCE_FOR_APPLICATION placed on the partner's filing; `providers[].subject` ≈ `personId`; `receivedDocumentIds` Not built (BR-7).
* m6 **P-425** is cited but not in `DECISIONS.md`. Record it before the PR names it.

## What is sound
* The line's "whose document" decides whether a line is shared, not the type (BR-2). This matches SA-1B-214 §3, which puts the field on the line, and keeps P-425: no combination key in engine code.
* Matching runs across everyone on the case, applying or not (BR-3). That is SA1B-D73(a), and the test is J1 step 2's own case.
* The snapshot adds the key only when the list is not empty, so existing releases keep their fingerprint.
* The migration is additive, with a rollback note and a reason CHECK. Stand-ins are named (BR-7), and the scope stays inside the row.

## Back-end plan
| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Roles on the type | `document_type.default_provider_roles` (draft version written at approval) plus a `library_change` of the new kind | GET `/library/document-types/:key/providers`; POST propose; existing decide on To review | BR-1, M1 | proposer cannot approve; unknown, retired or non-participant role refused; fingerprint unchanged when empty |
| Release carries them | `engine/snapshot.ts:229` `document_types[].default_provider_roles` | existing release | BR-1 | C6.15-style `release()` puts the roles in the snapshot |
| Providers on the line | derived in `engine/runtime/case-checklist.ts` from the snapshot and the case's people | GET checklist, additive fields | BR-2 to BR-5, M2 | pass and fail per rule; unknown age is "can't check"; pinned case unchanged (M3) |
| Officer's choice | `checklist_line.providers`, reason, by, at | POST `/runtime/checklist-lines/:id/providers` | BR-6, m4 | 400, 403, 409 (stale or waiting), 422; audit line; a stored minor dropped on read |
| UI | `web/src/runtime/checklist.tsx` row and dialog; library panel | none | §3 | keyboard and 1440 px journey, as C6.4-screen |

## Questions for the founder
1. **When nobody is set or matched, who provides a shared document?** The requirement says both (m2). **Recommended: the filing's first applicant**, as SA-1B-151 r1 and SA-1B-214 r1 state as rules. The alternative is the principal applicant, as the outcome lines and AG-7-15 r1 say. On a Visitor visa, the marriage certificate then falls to the spouse rather than the principal.
2. **On a case where each person files their own application, is a "once for the application" line one item per case or one per filing?** **Recommended: record it as open now and decide when a release first uses it**, because no release uses `case` today. The alternative is one item per filing with "Already on file" later (SA-1B-215 r2).

## Lead response
*(The builder's answers, runtime lane, 9 Nov; the tech lead's approval comes on the PR.)*
* **M1 accepted.** The library side is now a library change like C6.15's sets: the author proposes the ordered roles with a reason (`POST /library/document-types/:key/providers`), a second person approves on To review (never the proposer, P-253), the type gets a draft version, and it goes out with the next release (`api/src/document-providers.ts`; wired into approve, withdraw, release and To review). Q1 dropped.
* **M2 accepted.** Age is measured on the day the checklist is read (UTC), not the application date; an unknown age is "can't check", never a provider; a stored choice is checked again on every read (dropped and named when now under 18 or off the case). Pack steps C6.14-17, -18, -28; engine checks BR-4.
* **M3 accepted.** The pack takes the product's path: propose → approve → release → a new case; the case pinned to the earlier release keeps the fallback (C6.14-12). Marital status is answered so the conditional line is Needed. No SQL write.
* m1: recorded as a limit (concept BR-2): a `case` line is once per case on the principal's list; no release uses it yet. m2: the fallback is the filing's first applicant (SA-1B-151 r1, SA-1B-214 r1), the person the item is for on this slice; named in the concept. m3: the representative exclusion is kept (source kind client, SA-1B-151 r1) and the case side uses the same set (`NEVER_PROVIDES`); the limit of 4 roles is removed (no source). m4: a line still waiting for an answer has no providers to change yet (409, said in the concept). m5: mapping line added to the concept. m6: P-425 is on the Lead's branch (`lead/2026-11-07-lead31`), cited as such.

## Agreement

## Build discoveries
* The officer's dialog first read the release's age (on the application date), so with no application date everyone read "age not known". Fixed: the checklist now says per person whether they may provide today (`may_provide`, the server's rule) and the dialog shows its words. Found on the 1440 px walk's screenshot 07.

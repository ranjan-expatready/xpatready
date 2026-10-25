# Screen 04 — Shared library · challenge (fresh challenger, 25 Oct)

Read: `concept.md` (Lead decisions agreed), `design/draft-library.html`, SCREENS row 04, DECISIONS (P-11, P-12, P-14, P-23, P-28, P-32, P-34, P-37, P-51–P-53, P-57, P-59, P-61–P-65, P-70, P-79, P-80, P-89), `decisions/P-52-library-lifecycle.md`, `decisions/P-34-library-authoring.md`, STANDARDS, EXPERIENCE, QUALITY, `domain/RULES-MODEL.md` §7, `domain/TAXONOMY.md` §4, the agreed concepts of Screens 02 and 03, and the app (`prisma/schema.prisma`, `api/src/studio.ts`, `forms.ts`, `sources.ts`, `main.ts`, `engine/import.ts`, `engine/snapshot.ts`, `web/src/pages/library*.tsx`).
**Not available in this cloud copy:** `sources/` (SA-01B, team requirements) and `code/` (team code). `ai-workers/tools/freshness.sh` fails here (`code/README-copies.md` missing). The concept's team-code column ("Canonical fields, form editions", `form-field-maps`, "Approval dialog") and the SA-1B trace are **Unverified** in this challenge. Every point below rests on our own decisions and our app.

## Verdict
**Build after these changes.** The job, the list-plus-drawer pattern, the server-side guard and the scope cuts are sound. One Blocker: as the app works today, a library-only change has no release path, so slices 2 and 3 cannot meet BR-8 / P-52 L4. Slice 1 can start once M1 and M2 are settled.
Counts: **1 Blocker · 10 Major · 9 Minor.**

## Objections

### Blocker

**B1. A library-only change (retire, restore, a new item no combination uses yet) can never be released, and approval of a library item has no record of its own.** *Needed for the proof.* Confidence: high (fact).
* **What breaks:** BR-8 (concept.md:37) and P-52 L4 say "a different person approves; release publishes". In the app, library rows are published only as a side effect of one combination's release, and only when that combination's snapshot contains them: `publishRow` publishes `canonicalField`, sections and document types filtered by `snapshot.canonical_fields`, `snapshot.sections` and `snapshot.document_requirements` (`api/src/studio.ts:632-635`). A retire is allowed only when *nothing* uses the item (L3), so no snapshot contains it and no release ever publishes it. Submitting a combination to carry it is refused anyway: "Nothing has changed since the released version." (`studio.ts:496`). Library RETIRED rows are not handled on release at all; only requirement, rule and form lines are (`studio.ts:641`).
* **Second half:** there is no "Waiting for a second person" record for library items. `DefinitionStatus` is DRAFT · PUBLISHED · SUPERSEDED · RETIRED (`schema.prisma:21-26`). Today a new field used by combination X is published by X's release, so whoever releases X (`draftAuthors`, `studio.ts:465`) approves it without ever seeing AI's verdict, the matches or the author's reason, which P-53 item 4 requires. If the approval were stored on `CanonicalField.status` instead, approving would change X's snapshot (it carries `status` and `origin`, `engine/snapshot.ts:143`). X's pending submission would then go stale without anyone touching X.
* **Example:** an author retires "Relative's relationship to applicant" after removing it from 2 combinations and the IMM 5406 form fields (P-52's own scenario). The reviewer approves. Nothing can release it: it stays visible in pickers or vanishes unreleased, depending on which code reads it (today `updateField` sets RETIRED on the draft row at once, `studio.ts:298-300`, and pickers filter on that, e.g. `forms.ts:355`).
* **Fix:** (1) Add one record, `LibraryChange {kind, key, action: ADD|DELETE|RETIRE|RESTORE, reason, aiVerdict, matches, meaningChecked, status: WAITING|APPROVED|RETURNED|RELEASED, proposedBy, decidedBy, decisionNote, version}`, kept outside the snapshot (the same shape as `FieldMerge`, `schema.prisma:419`). (2) The shared release (`POST /pack/release`, P-23 "one release for everything") also publishes every APPROVED library change into the new `PackVersion`; the Release page shows them as a "Library changes" group (P-58). DELETE needs no release (L1: never released). (3) Retire takes effect only at that release: until then the item stays in pickers, marked "Retire waiting". (4) The release validator refuses a combination that uses an item whose ADD is still WAITING ("waiting for a second person on To review"), so a combination release cannot skip the item review. Tests: retire approved → still visible → pack release → hidden, and earlier snapshots unchanged; release of X with a WAITING field → 409. See founder question 1.

### Major

**M1. Shared fields have no name and no group, yet the list, Describe and the exact-duplicate rule all need them.** *Needed.* Fact, high.
* `CanonicalField` stores key, meaning, type and aliases, with no label column (`schema.prisma:352-383`). BR-6 (concept.md:35) and P-34 Layer 1 block "same normalised name within subject and group" and a key built as `subject.group.attribute`. Today's keys are `area.name` (`studio.ts:278`, the `newKeyProblem` message), with no group. The list must put a plain identifier first while "keys only under Details" (BR-16, PRODUCT §4). The copy's "Relationship to principal applicant" has no column to live in.
* **Fix:** an expand → migrate → contract migration (STANDARDS §5): `label` (required after back-fill) and `groupKey` on `CanonicalField`. Back-fill existing rows from their first alias, or from the key if they have none, marked for a person to check. Unique index on (workspace, subjectKind, groupKey, normalisedLabel). One key generator shared with Screen 02 BR-7. Keep `label` out of the snapshot hash, or accept one recorded re-baseline: otherwise every combination looks changed after the migration (`snapshot.ts:143`).

**M2. "Origin" and "Reused / New here" have no data behind them on today's data; the sample loader would stand in for the capability (P-33).** *Needed.* Fact, high.
* BR-2 (concept.md:31) shows two origins, "AI · from IMM 5257 · accepted 18 Oct" and "Person · described". The enum also has `IMPORTED_RELEASE` and `CODE_MATCH` (`schema.prisma:61-67`). Every seeded item is `IMPORTED_RELEASE` (`engine/import.ts:39, 44, 52, 66`), which is most of slice 1's "today's data". BR-4 (concept.md:33) needs "the first combination that brought the item in", and no column records it. `sourceRef` is free text (`sources.ts:586`).
* **Fix:** add `introducedInCombinationId` (nullable) and `introducedAt` on version 1 of each library item. Screen 02's apply sets them from `job.combinationId`; Describe sets them when opened from a combination (Screen 03 BR-10); the sample loader sets them in import order. Null means "before any combination" and counts as Reused. Show `CODE_MATCH` as "Matched without AI · accepted by …". Show `IMPORTED_RELEASE` as "Sample: imported", labelled Scaffolding on the board and never as a capability. The totals "146 · 112 reused · 34 new" stay Sample until slice 1 measures them.

**M3. The in-use guard (BR-9, L3, L6) is not defined per kind, and two kinds of use are missing.** *Needed.* Fact and judgment, high.
* P-52's list of uses is generic, and §2 Engine (concept.md:23) says "one pure function". Uses that exist or are coming but are not named:
  * a fact carried by a combination link (P-59, Screen 03 BR-12 `facts[]`, `documents[]`). TAXONOMY §4 cases 4 and 7: the LMIA link carries the LMIA number;
  * a derived field's inputs (`DerivedField.inputs`, `schema.prisma:623`);
  * a document type's `suppliesFacts` (`schema.prisma:557`);
  * a placement in a section no combination selects;
  * field maps on a form edition that is no longer current. `FormEdition` has no status or current flag (`schema.prisma:221-249`), so maps on old editions would block a retire for ever, or be silently ignored.
* "Latest release" lives inside `ConfigRelease.snapshot` JSON, so the guard must read the newest RELEASED row per combination as well as the draft tables.
* **Fix:** write the table in the concept (kind → uses counted → read from → link target). For a field: draft placements, field maps on the current PDF edition and current online version per form, rules and checks, document requirement conditions, `suppliesFacts`, derived inputs, link facts, and the newest released snapshot of every combination. Define "current edition" as the newest approved edition per form and channel. One pass test and one fail test per row.

**M4. Merged-away fields are stored as RETIRED, so the Retired filter and Restore would include them.** *Needed.* Fact, high.
* An applied merge closes the merged-away field with `status: "RETIRED", mergedIntoKey` (`forms.ts:911-912`). BR-10 (concept.md:39) lists retired items under "Retired" with Restore. Restoring a merged-away field would bring back a second definition of one meaning and break the redirect promised by BR-16 and P-65.
* **Fix:** the calculated status puts `mergedIntoKey` first: "Merged into …", with no Restore and no Delete. The guard refuses restore with 409 "merged into …; open that field". Add a pass test and a fail test.

**M5. The old direct write routes stay open, so the guard is not on "every direct call".** *Needed.* Fact, high.
* The P-52 page's API row demands one guard on every screen and every direct call. Gaps:
  * §6 (concept.md:60) removes only the typed-key `POST /library/fields`. It keeps `PATCH /library/fields/:key`, whose `retire: true` flag retires with no in-use check (`studio.ts:288-300`; the P-52 page "Built today" names it).
  * `POST /library/sections` keeps the inline add with an exact-title check only (`studio.ts:334-343`).
  * `POST /library/fields/:key/placement` stays an edit (`studio.ts:304`).
  * `saveRequirement` still creates a document type silently from `newTypeName` (`studio.ts:386-388`). Screen 03 BR-10 forbids that, but neither concept removes the route.
* **Fix:** in §6, remove `retire` from the PATCH body, `POST /library/sections` and `newTypeName`. Say who keeps `PATCH /library/fields/:key` (Screen 03 BR-9 `filledBy` only) and `placement` (see M10). Add fail tests: PATCH with `retire` → 400, and POST sections → 404 or 405.

**M6. One record, one key generator and one queue kind for new library items, shared with Screen 02, is not named.** *Needed.* Judgment, high.
* Screen 02 BR-7 creates new shared fields from field-map proposals ("key generated, exact duplicate refused, advisory verdict, reason, a different person approves"), and P-79's To review lists "new shared fields". Screen 04 BR-5 to BR-8 do the same from Describe. Only the `similar` route is declared shared (concept.md:9, 60). Screen 02 is built first by the same lane: unless the record from B1 and the generator from M1 are agreed now, slice 2 will rebuild them. That breaks STANDARDS §7 (no duplicated logic), and the To review queue (`GET /review-queue`, Screen 02 §6) will not know the Screen 04 kinds.
* **Fix:** in both concepts: `LibraryChange` (B1) and `keyFor(subject, group, label)` (M1) are built in Screen 02 slice 2 and reused by Screen 04. The queue reads `LibraryChange` rows of every action; the To review row opens the Screen 04 drawer in approver state (K2).

**M7. The Describe AI call is drawn as a synchronous request outside the guarded AI path.** *Needed.* Fact, medium-high.
* §6 `POST /library/:kind/similar {description} → {draft, matches[], verdict, reason, costUsd}` is a web request that calls AI, and the board's failure state reads "AI did not answer within 30 seconds" (`draft-library.html:226`). That breaks STANDARDS §4 [M] (background work in the worker, never inside a web request; idempotent launches) and §8 (cost estimated and capped; prompt and model versions recorded). The existing guarded path cannot take it as is: `DraftingJob.combinationId` is required (`schema.prisma:669`) and Describe on the library has no combination.
* **Fix:** Describe launches a one-step job through the existing worker and ledger (`api/src/ai.ts:205-214`), making `combinationId` nullable or adding job kind `describe`. Return 202 with the job id; the panel polls. Make it idempotent by `idempotencyKey`. Layer 1 (BR-6) runs before the launch with no AI and no cost. Add replay and stub fixtures for tests (Scaffolding).

**M8. Several Checks list columns have no data, and drawing them would show empty or invented values.** *Needed (the list); the empty columns are scope.* Fact, high.
* BR-15 (concept.md:44) has kind · what it reads · value per combination · when it runs · where used · origin. Problems:
  * `Check` is stored per combination with `checkGroup`, `severity`, `predicateJson` and `message` (`schema.prisma:637-664`). There is no value column and no stage.
  * The imported groups are `cross_record`, `official_rule`, `read_back` and `readiness_warning`. `form_native`, tier 1, is skipped on import (`engine/import.ts:102`). No mapping to the four kinds exists.
  * AI review objectives (RULES-MODEL §7 tier 3) have no model at all.
* **Fix:** one row per `checkKey` across combinations. Kind comes from a written mapping of `checkGroup` (an unmapped group shows "Other", labelled). "What it reads" comes from the predicate's fields. "Value per combination" is the predicate sentence per combination. Mark "When it runs" and the AI review kind as Not built ("No AI review objectives yet") until a screen creates them. No new masters (do not add scope).

**M9. Substitute sets: existing document types have no source, and Screen 04 depends on a schema the runtime lane builds in parallel.** *Needed by Screen 03.* Judgment, medium-high.
* K4 (concept.md:7) drafts sets only inside Describe for a *new* document type. Screen 03 BR-11 has every document line "pick one of its type's named substitute sets", and Screen 03 §2 adds the sets to `DocumentType` (runtime lane). The seeded types (Passport and the others, `engine/import.ts:66`) then have no sets and no path to get one. The likely stand-in is seeding them, which is scaffolding in place of a capability (P-33).
* **Fix:** name the source: Screen 02 K2 (AI drafts document requirements from checklists) proposes sets with the checklist quote, accepted on To review, and Screen 04 shows them read-only. Until then Screen 03 offers "this document alone" as the default set. State in both concepts that the set's schema is the runtime lane's and that Screen 04 slice 2's document-type Describe waits for it.

**M10. With BR-1, nobody can change a question's condition or placement by hand anywhere.** *Needed for the proof (AI off and correction).* Judgment, medium; needs the founder.
* BR-1 (concept.md:30) removes the field page's edit forms, including `placeField` with its condition builder (`studio.ts:304-323`, `library.tsx` ConditionBuilder). Screen 03 BR-8 says conditions on questions come from library rules, "read-only here, Open in the library", and Screen 04 is read-only. A fact rule therefore can only come from an AI proposal (Screen 02 K2), and once accepted it can only be removed by retiring the item.
* That conflicts with P-37 ("Rules: on each library field/section … edits happen in place"), P-34 §4 ("Wording, help text: direct edit, versioned") and STANDARDS §4 [M] ("Works by hand with AI off"). P-28 and SCREENS 04 say no rule authoring on Screen 04, so the fix belongs on another screen.
* **Example:** AI drafts "Ask Marriage date only if marital status is Married" and misses Common-law. The author can reject the proposal on Screen 02 but has no way to write the correct sentence.
* **Fix:** founder question 2.

### Minor

**m1. The board contradicts K6.** The short form is labelled Not built (`draft-library.html:225`, "Short form is the team's per P-34 page"), while K6 builds it. Change the label to Capability · Needed. The concept wins, but the founder walks the board at M2.
**m2. C3.7 is marked "(Not built)" in §1 (concept.md:14) while slice 3 builds it, and Screen 02 §6b points "retire execution (C3.7)" to Screen 04.** Mark C3.7 Needed in §1.
**m3. "Filled by" (Screen 03 BR-9, `PATCH /library/fields/:key {filledBy}`) changes a shared field from Screen 03.** BR-1's list of where changes come from leaves it out, and the drawer's Definition section does not show it. Add both, and say whether that change goes through `LibraryChange` (the founder's "a different person approves" suggests yes).
**m4. "Published" per edition has no column.** `FormEdition` has `editionLabel` only, and the published date sits on `IntakeItem.published` as text (`schema.prisma:268`). Join by checksum, or add `publishedOn` (P-41 needs both dates).
**m5. "Forms are retired, never deleted" (BR-12), but `GovFormDef` has no status (`schema.prisma:203-218`), and no slice lists form retire.** Put it in slice 3 with the same guard (a form line or attachment in any current setup counts as a use), or mark it Not built.
**m6. Which duty approves library changes is not named.** All three studio actors hold `review` (`api/src/core.ts:32-34`), so "a different person" must be checked on identity, not on duty. Name the duty (`review`) and test that the maker gets 403 even while holding it.
**m7. One `similar` route, two shapes.** Screen 02 sends a form field's label, meaning and type; Screen 04 sends free text. Define a zod union `{description} | {label, meaning, type, formField}` in contracts now (Screen 02 §6, concept.md:60).
**m8. Where-used per row must be one pass.** `field()` stringifies every rule, check, requirement and form line for one key (`studio.ts:257-262`). Repeating that for every row breaks STANDARDS §5 (no N+1) and §9 (< 200 ms). Build a key → uses index once per request.
**m9. Restore must run Layer 1 again.** A field can be retired and a new one with the same label added afterwards. Restoring the old one then needs the exact-duplicate refusal (BR-6) with a link to the newer field.

## What is sound
* One home per job: no edit, merge or rule authoring here, merges kept on Screen 02 (K5), and approval from the To review row (K2, P-79). This avoids a second approval page.
* Guard rules taken from P-52 without loss (L1 to L6, AI-made items included) as one pure engine function on the server.
* The exact-duplicate block runs without AI and AI never blocks (P-53 item 5, P-14). The short form with AI off (K6) is right: P-53 item 6 and STANDARDS §4 [M] outrank the "Not built (team)" lines of the P-34 and P-52 pages.
* Add forms reuses Screen 01's `FormIntake` and `POST /intake` (door 2 = no `combinationId`, `schema.prisma:255`). The five intake outcomes already exist in `IntakeItem.outcome`. Re-check due reuses `FormEdition.recheckBy` and `POST /captures/:id/confirm` (`forms.ts:973`).
* Every pattern and state is taken from EXPERIENCE §3 and §4 (Library list, right panel, in-page confirmation, 409 Reload). The words follow P-63. Slices are ordered so that EARLY-LOOK (P-89) sees real data after slice 1.
* Not built is honest: Replace with…, translations, meaning-change impact, accept rate.

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test (pass / fail) |
|---|---|---|---|---|
| Five lists | `CanonicalField` (+`label`, `groupKey`, `introducedIn*`, M1, M2), `LogicalSection`, `DocumentType`, `GovFormDef` (+status, m5), `Check` per key (M8) | `GET /library/:kind?q=&section=&origin=&status=&combination=&cursor=` (one request, one-pass where-used, m8) | BR-2, BR-3, BR-4 | search by alias and by form code finds the field / an unknown term → "nothing matches"; reuse totals for a combination match a hand count |
| Drawer | same + `LibraryChange` history | `GET /library/:kind/:key` | BR-14, BR-16 | merged-away → "Merged into …", no Restore (M4) / retired lists its earlier releases |
| Describe | `DraftingJob` kind `describe` (nullable combination, M7) | `POST /library/:kind/similar` → 202 job; `GET /jobs/:id` | BR-5, BR-7 | replayed verdict shown with cost / over the cap → refused, nothing spent |
| Exact duplicate | unique (subject, group, normalised label), alias set | `POST /library/:kind` → 409 `{existingKey}` | BR-6 (no AI) | "Relationship  To Principal applicant" → 409 with no job / a new label → 201 WAITING |
| Add, delete, retire, restore | `LibraryChange` (B1) | `POST /library/:kind` · `…/:key/{delete,retire,restore}` · `…/{approve,return}` | BR-8, BR-9, BR-10, L1–L6; guard per M3 | maker approve → 403, reviewer → 200 / retire with one draft use → 409 listing it; pack release publishes an approved retire |
| Release of library changes | `PackVersion` carries APPROVED changes | `POST /pack/release` (extended) | B1 (4) | combination using a WAITING field → 409 / approved retire hidden only after release |
| Forms | `GovFormDef`, `FormEdition` (+published, m4), `IntakeItem` | `POST /intake` (no combination), `GET /library/forms`, `…/:code/editions` | BR-11, BR-12, BR-13 | five fixture files → five outcomes, nothing attached / the same file again → "already in the library" |
| Checks, Rules | `Check`, `Predicate`, `SectionQuestion.predicateJson` (read-only) | `GET /library/checks`, `GET /library/rules` | BR-15, Q3 | a check used in 2 combinations shows both values / no write route exists (405) |
| Old routes | — | remove `retire` from PATCH, `POST /library/sections`, `newTypeName` (M5) | P-52 API row | each refused / Describe works |

## Questions for the founder (recommendation first)
1. **When does a library-only change take effect (a retire, a restore, a new item no combination uses yet)?** *Recommend:* after the second person approves it on To review, at the next shared release, shown on the Release page as "Library changes" (P-23, P-52 L4 "release publishes"). Until that release the item keeps working, marked "Retire waiting". *Alternative:* effective the moment the second person approves. That is simpler, but it is a second release path outside the Release page, and a retire would reach pickers before any release is reviewed. *Scenario:* "Relative's relationship to applicant", now unused, is retired and approved on Tuesday. With the recommendation it disappears from pickers at Thursday's release; with the alternative, on Tuesday.
2. **Where does a person fix a question's condition (fact rule) or its placement by hand?** *Recommend:* in place on Screen 03's SQR tab panel ("Edit condition"), saved as a library change that shows "changes it in N combinations" and goes to a second person. That follows the pattern of "Filled by" (Screen 03 BR-9) and P-37 "edits happen in place", and Screen 04 stays read-only (P-28). *Alternative:* only through AI proposals on Screen 02 (as drawn today). With AI off, or after a wrong acceptance, a condition can then only be fixed by retiring the field.

## Lead response
25 Oct (Lead, cloud). Every objection accepted; the concept's Lead decisions carry them.
* **B1 → accept the fix.** One `LibraryChange` record outside the snapshot (ADD · DELETE · RETIRE · RESTORE · EDIT_RULE, reason, AI verdict and matches, meaning-checked, WAITING · APPROVED · RETURNED · RELEASED). The shared release publishes every APPROVED change under "Library changes" (P-23, P-58). DELETE needs no release (L1). A retire takes effect at that release ("Retire waiting" until then). A combination release that uses an item whose ADD is WAITING gets a 409.
* **M1 → accept.** Name and group by migration, back-filled, not in the snapshot hash; `keyFor(subject, group, label)`.
* **M2 → accept.** The first combination is recorded on version 1. Today's imported items show "Imported (Sample)".
* **M3 → accept.** The builder's PLAN gives the guard's table per kind: links (Screen 03), derived-field inputs, document-type facts, and field maps on every edition still used. It reads the draft and the latest released snapshot.
* **M4 → accept.** Merged-away fields show "Merged into …", never under Retired, with no Restore.
* **M5 → accept.** Each old write route closes in the slice that replaces it, with a refusal test: PATCH `retire`, inline section add and `newTypeName` close in slices 2–3; the placement condition builder closes with M10's edit.
* **M6 → accept.** `LibraryChange` and `keyFor` are built once in Screen 02 slice 2 and reused here. The To review queue reads every action (line added to Screen 02's Lead decisions).
* **M7 → accept.** Describe is a one-step job through the worker and ledger (job kind `describe`, no combination): 202 with a job id, idempotency key, replay and stub fixtures. The exact-duplicate layer runs before it, free.
* **M8 → accept.** One row per check key; kind from a written `checkGroup` mapping ("Other" when unmapped). "When it runs" and AI review objectives are labelled Not built.
* **M9 → accept.** Sets come from Screen 02 K2 (checklist drafts with the quote), accepted on To review and shown read-only here. Until then Screen 03 offers "this document alone". The set schema is the runtime lane's, and slice 2's document-type Describe waits for it (Lead note to runtime).
* **M10 → decided by P-37, not a founder question:** "rules on each library field/section … edits happen in place". The field and section drawer's "Rules and checks" gets "Edit condition" (the existing condition builder moved there). It is saved as a `LibraryChange` EDIT_RULE showing "changes it in N combinations" and approved by a second person. Screen 03 BR-8 already says "Open in the library". Placement wording stays on Screen 03. P-28's "no rule authoring" yields to P-37 and P-70.
* **Founder question 1 → settled by P-52 L4 ("release publishes") and P-23:** at the next shared release, as recommended. **Founder question 2 → settled by P-37:** in the library drawer (M10). No founder question open.
* **Minors m1–m9 → accept.** The board's short form is relabelled Needed. C3.7 is built in slice 3. BR-1 lists "Filled by" (Screen 03) as a change source and the drawer shows it. Editions get a published-date column (from the intake) and forms a status (retire in slice 4). The content reviewer approves: the `review` duty, never the author. One zod union serves `similar`. Where used is computed in one pass per request. Restore re-runs the exact-duplicate layer.

## Agreement
Agreed 25 Oct (Lead, under P-89). Build after the screens lane finishes Screen 02 slice 2, which provides `LibraryChange` and `keyFor`.

## Build discoveries

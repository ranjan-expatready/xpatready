# F2 — Browser extension: portal capture and fill · forms lane PLAN (25 Oct 2026)

Concept `concept.md` (Lead decisions 25 Oct at its top: Q1 pairing code, Q2 a capture adds to the current version, Q3 "You answer this on screen"). Decisions P-61, P-62 §3–§8, P-65, P-66, P-68, P-71–P-73, P-89, P-90; team redesign decisions 16 and 16b. Backend path: PLAN → BUILD → CHECK → FIX → MERGE, plus one new surface (the extension's side panel). Capabilities C2.9, C7.4, C9.3 (task part). Immigration values (portal hosts, screens, option codes) are **Sample** until the immigration expert confirms; every legal point is "Unconfirmed: no counsel", including a representative using automation on IRCC or ESDC portals. No paid AI anywhere in F2 (filling and identity are never AI, P-62 §4): **US$0**.

## 1. Challenge (fresh agent, skill screen-challenge) — full text in `challenge.md`
CHALLENGE_SUMMARY

## 2. What the builder measured in the code (lane copy, main 8360565)
| # | Fact (evidence) | Consequence |
|---|---|---|
| F-1 | The capture record is one JSON per capture (`PortalCapture.record`, `schema.prisma` 443–483); screens are keyed by **order** (`s01`, `s02`…, `engine/capture.ts` `buildRecord` l.32–37) | A screen's identity changes when a capture skips one (Q2). F2 keys a screen by the portal's own page identity (§5 E-1), never by order |
| F-2 | The fingerprint covers the whole record (`contracts/portal-capture.ts` `structure`, `fingerprint` l.29–34); `difference()` compares two whole records and reports every input missing from the new one as `removed` (`capture.ts` l.43–60) | Per-screen fingerprint and a per-screen difference are new pure functions beside the old ones (§5); the whole-record fingerprint stays the online version's identity (FormEdition.contentSha256) for F1 |
| F-3 | The saved-page reader is **Python** (`tools/read_portal_capture.py`, 413 lines, run by `forms.ts` l.134) and **refuses** a screen that holds an answer (l.6); its client-detail patterns are three regexes (l.31–36) | The extension reader is TypeScript in the browser and must **ignore** values rather than refuse (capture during real work). Two readers, two languages: one shared rules file (types, skipped types, custom controls, client-detail patterns) read by both, and a conformance test on every fixture (BR-2) |
| F-4 | `POST captures/:id/screens` takes files only (`forms.ts` l.969); capture endpoints need the `author` duty (`forms.ts` l.117 ff.); no "capture" duty exists (`core.ts` l.32–41) | New `extension-screens` endpoint takes one screen's structure (JSON), runs the same server checks; capture duty = `author` in the prototype (Sample), named in the token's modes |
| F-5 | People are simulated by an `x-actor` header (`core.ts` `actorOf` l.45, deny by default) | The extension token resolves to the same Actor; the API's guard accepts either the header (Studio) or a valid token (extension), never both; a token names its person, firm, modes and extension id |
| F-6 | There is no "filing" record: a case (`runtime_case`, `schema.prisma` 907) works from its pinned release; forms are `FormInstance` rows per PDF copy; `Runtime.reach(actor, caseId, want)` is the case guard (`runtime.ts` l.41); `fill.ts` refuses an ONLINE line (l.30) | "Filing" in the concept = (case, online form line of its pinned release). Fill plans are keyed by case + form, guarded by `reach(…, "officer")`. No new filing table |
| F-7 | Confirmed facts and the "confirmed" rule exist (`engine/runtime/case.ts` `knownOf` l.153, `confirmation` l.45); option codes per channel exist (`engine/options.ts` `codeForValue` l.57, REFUSE on no code); transforms per input type (`engine/twin.ts` `transformFor` l.50) | `fillPlan()` is a pure function over (screen map rows, known facts, option maps): no new fact logic, BR-8 and BR-10 reuse the runtime's and F1's rules |
| F-8 | An online version's map rows already carry `screenKey`, `screenOrder`, `inputOrder` and the page's element id in `dataPath` (`schema.prisma` 336–339) | Fill compares the live screen to the twin's screen by element id; the "You answer this on screen" marker is a map outcome (`person_answers_on_screen`), no new column |
| F-9 | An unpacked MV3 extension loads in the pre-installed Chromium through Playwright (`launchPersistentContext`, `--load-extension`, headless): service worker, `storage.session` and the side-panel page all work (probe in the lane copy, 25 Oct) | The extension is testable in CI with the existing Playwright; no new browser |
| F-10 | `@types/chrome` (npm, MIT) is available; no other package needed; Vite 8.1 builds the extension's pages and scripts as a second build config, no plugin | Technology gate as approved (P-90); the Lead records it in ENVIRONMENT.md when installed |
| F-11 | The F1 Sample portal fixtures exist: `tests/fixtures/portal/imm5257-online-s1…s4`, `s1-personal-reworded`, `-with-answers`, `-resaved`, seven `hostile-*` | Fill, compare and the conformance test run on them; the local fixture server serves them on port 4459 (lane range 4450–4459) |

## 3. Builder's response: what changes from the concept
BUILDER_RESPONSE

## 4. Records (team names where the team has one; `workspaceId` stands in for `firmId`)
| Record | Key columns and constraints |
|---|---|
| `ExtensionPairing` | workspace, person, modes, `codeHash` (sha256 of the 8-character code), expiresAt (5 min, Sample), usedAt; one use; a used or expired code → 401; at most 5 open codes per person |
| `ExtensionSession` | workspace, person, modes (`capture` · `fill`), `tokenHash` (sha256 of the opaque 32-byte token; the token is never stored), extensionId, createdAt, expiresAt (8 h, Sample), revokedAt; the token is checked by hash, constant-time; revoke = `revokedAt` set |
| `PortalCapture` (exists) | `way: extension`; `record.screens[]` gains `page` (the portal's page identity, E-1), `fingerprint` (per screen) and `seen` (date) — a contract version `portal-capture/v2` with v1 records read as before; `revision` (exists) guards concurrent adds |
| `RecaptureTask` | workspace, formEditionId (the approved online version), screenPage, kind (`changed` · `not_captured`), status OPEN · DONE, differences (structure only), affected (combination ids, open case count), openedAt, updatedAt, closedBy (the capture that approved the re-capture); **partial unique** one OPEN per (edition, screenPage, kind) in raw SQL; a second mismatch updates it |
| `FillEvent` | workspace, caseId, formEditionId, screenPage, planId, inputId, outcome (`filled` · `not_accepted` · `left_alone` · `not_filled`), reason code, actor, at; **no value, no label text with client data** (BR-14); insert-only |
| `FillPlan` | not stored: held in the API's memory for 5 min, keyed by an opaque plan id bound to the session token (BR-13); outcomes for an unknown or expired plan → 404 |
One expand-only migration after R1's, recorded rollback (drop the four new tables). Indexes: tasks by (edition, status), events by (case, at).

## 5. Engine (pure, `engine/extension/`, property tests where marked)
* **E-1 `screenIdentity(page)`**: the portal page's identity = the normalised page heading plus the form's own step id when the page carries one (Sample: the F1 fixtures' `data-step`); never the order. A capture that sees s1 and s3 keys them s1 and s3 (Q2).
* **E-2 `screenStructure`, `screenFingerprint`**: one screen's normalised structure (the same normalisation as `structure()`, per screen), checksum. Property test: reordering screens never changes a screen's fingerprint; any label, type, rule or option change does.
* **E-3 `screenDifference(approved, live)`**: added, removed, reworded, type, required, rules, options for one screen, by element id (the F1 `difference()` limited to one screen).
* **E-4 `mergeCapture(current, seen)`** (Q2): screens seen are compared; unseen = "not seen this time" (kept, `seen` unchanged); new = "added"; the result's whole-record fingerprint becomes the new version's identity. Property test: merging a capture of exactly the approved screens, unchanged, gives the same fingerprint.
* **E-5 `fillPlan(mapRows, known, confirm, optionMaps, liveScreen)`**: per input `{id, label, value?, source, status}`, status `fill` · `not_confirmed` ("Confirm <section> in the case first") · `no_answer` · `you_answer` (marker or declaration) · `no_code` (REFUSE) · `left_alone` (BR-12, decided at the content script with the live value, which never leaves the page). Every output says why.
* **E-6 `readerRules`** (`contracts/portal-reader-rules.json`): types, skipped types, custom controls, client-detail patterns — read by `tools/read_portal_capture.py` and by the content script, so the two readers cannot drift (BR-2, F-3).

## 6. Contracts (zod, `contracts/extension.ts`; Problem Details errors)
`ExtensionScreen` (one screen: page, title, inputs as `CaptureInput` — `.strict()`, no value keys, `noAnswers` again) · `Pairing` · `Session` (modes, person, expiresAt) · `FillPlanRequest {caseId, form, screen: ExtensionScreen}` · `FillPlan {match: true, planId, person, inputs[]}` | `{match: false, differences, task}` | `{match: false, notCaptured: true, task}` · `FillOutcomes {inputs[{id, outcome, reason?}]}` (no values; a `value` key → 400).

## 7. Back-end table (element → record → API → rule → test)
API under `/api/extension` (new module `api/src/extension.ts`) plus the capture endpoints that exist. The extension sends `Authorization: Bearer <token>`; the Studio sends `x-actor`.
| Element | Record | API | Rule | Tests (pass · fail) |
|---|---|---|---|---|
| Pairing code (Studio panel) | ExtensionPairing | `POST /api/extension/pairings` (x-actor) → code, expiresAt | XT-1 signed-in Studio person only; code shown once, stored hashed; 5 min; one use | code works once · second use 401; expired 401; unknown actor 401 |
| Session | ExtensionSession | `POST /api/extension/sessions {code, extensionId}` → token, modes, person · `DELETE …/sessions/current` | XT-2 token opaque, hashed, bound to person, firm, modes, extension id; revocable; 8 h | token works · revoked 401; other extension id 401; expired 401; token from firm B on firm A's case 403 |
| CORS and origin | — | every `/api/extension/*` | XT-3 only the fixed extension origin (`chrome-extension://<id>`, config) gets CORS headers; no credentials mode; Studio routes unchanged | fixed origin allowed · other origin gets no CORS headers |
| Capture start | PortalCapture | `POST /api/captures` (exists) `way: extension` | XT-4 capture mode in the token (= author duty, Sample) | capturer starts · fill-only token 403 |
| Capture this screen | PortalCapture.record | `POST /api/captures/:id/extension-screens {screen, revision}` | BR-1 structure only: contract, `noAnswers`, the shared client-detail patterns, length caps; any problem refuses the **whole** screen, nothing kept · BR-4 a screen already in this capture (same page identity) → "already captured" · revision guard 409 | s1 typed into, captured → same fingerprint as saved blank s1 · `hostile-label-answer`, `-option-passport`, `-title-identifier` refused; `value` key → 400; `-aria-unread` → "not read"; duplicate page → already captured; stale revision 409 |
| Two readers agree | — | — | BR-2 the content script and the saved-page reader give identical per-screen structure for every fixture | conformance test over all fixtures · changing one shared rule on one side only fails it |
| Finish, approve | PortalCapture → FormEdition ONLINE | finish, approve (exist) | XT-5 Q2 merge (E-4); approver ≠ capturer (exists, server side); approving a re-capture closes its tasks | s1+s3 capture → s2 "not seen this time", version keeps s2 · capturer approves → 403 |
| Never-filled marker | FormFieldMap outcome | screen-map review (exists) with outcome `person_answers_on_screen` | BR-9/Q3 set by the immigration-expert role, approved by a second person; a screen with any declaration or background input not yet decided fills nothing | marked input listed "You answer this on screen" · unmarked background screen → nothing filled |
| Fill this screen | in-memory FillPlan | `POST /api/extension/fill-plans {caseId, form, screen}` | BR-7 compare first (E-3): any difference → nothing returned to fill, task opened or updated (XT-6) · BR-8 confirmed facts only · BR-10 portal codes, no code → not filled · BR-15 fill mode and `reach(officer)` | s1 match → plan with values and sources · `s1-reworded` → match false, differences list "Surname" and the added option; unconfirmed passport not in the plan; Client B's case 403; capture-only token 403 |
| Re-capture task | RecaptureTask | opened by fill-plans; `GET /api/extension/recapture-tasks` (Studio, review duty) | XT-6 one OPEN task per (version, screen, kind); a second mismatch updates it (concurrent: one row) · unknown screen → `not_captured` | second mismatch → same task, `updatedAt` moved · two parallel mismatches → one row (DB unique) |
| Write and read back | content script | — | BR-6 one screen per click; never Next, Save, Submit, password, hidden · BR-11 read back each value, a difference → "Not accepted by the screen" · BR-12 an input already holding a different answer is left alone and listed | written values read back equal · fixture rejecting a code shows "Not accepted"; pre-filled input left alone; `submit`, `requestSubmit` and button clicks spied: zero |
| Outcomes | FillEvent | `POST /api/extension/fill-plans/:id/outcomes {inputs[{id, outcome}]}` | BR-14 no value accepted or stored; ids must belong to the plan | events stored without values · a `value` key 400; an id not in the plan 422; a plan of another session 404 |
| Keep nothing | — | — | BR-13 plan dropped on navigation, panel close, 5 min; no `storage.local`; values never logged (pino redaction of `inputs[].value`) | `storage.local` empty after a fill; log search for a Sample value finds none; plan id after 5 min 404 |
| Manifest | build | — | XT-7 production manifest: `sidePanel`, `storage` only; host permissions = the exact portal hosts (config, Sample until the expert confirms) and the API origin; no `<all_urls>`, no wildcard host, no localhost, no `externally_connectable`, CSP without `unsafe-eval` | production manifest check passes · a dev build manifest fails the production check |
| Side panel | — | — | EXPERIENCE §3 side panel at 360 px, every state of concept §4, keyboard and axe | each state reached by a scripted check; Tab+Enter for every action; axe clean |
Audit: pairing, session revoke, capture screen added or refused, task opened or updated, fill (counts only): `AuditEvent` summaries never carry a value or a label holding client data.

## 8. Mapping to the team's model
Team code has no extension, no portal model and no case table (F1 challenge and R1 plan §7; `code/` is not in this cloud copy, so these are **Unverified** against the newest capture). `ExtensionSession` maps to the team's API token or device session (to ask the team: they may already have personal access tokens); `RecaptureTask` maps to the team's task or work-item if one exists, else stays ours; `FillEvent` is the input of the M3 Form health view (P-66 §4). All four are additive; nothing in the team's spine changes. Listed for the retrofit: AG-10's non-goal "no browser extension" (AG16-41) is partly reversed by decision 16 and P-66 [C].

## 9. Slices inside BUILD (one commit each; BUILD ends at CHECK)
| Slice | Contents | Done when |
|---|---|---|
| F2a Readers and capture | shared reader rules (E-6) used by the Python reader; content-script reader; per-screen engine E-1…E-4; contract v2; `extension-screens`; finish merge; fixture server :4459; conformance test | BR-1, BR-2, BR-4, BR-5 pass and fail; F1 suites still green |
| F2b Pairing and sessions | migration (4 tables); pairing, session, revoke; guard accepting token or header; CORS | XT-1…XT-3, BR-15 pass and fail on real PostgreSQL |
| F2c Fill | `fillPlan` (E-5); fill-plans, outcomes, recapture tasks; marker outcome; content-script writer and read-back | BR-6…BR-14, XT-6 pass and fail; spies show no submit |
| F2d Side panel and journey | React + Vite panel (team tokens), both modes and every state; Studio "Connect the browser extension" panel; production manifest check; proof script §9 of the concept as a scripted Playwright journey with the unpacked extension | journey green, axe clean, US$0 |

## 10. File ownership
Forms lane writes: `extension/` (new, under `prototype/studio/`: manifest, panel, content script, background), `api/src/extension.ts`, `engine/extension/`, `contracts/extension.ts`, `contracts/portal-reader-rules.json`, `tools/read_portal_capture.py` (rules moved to the shared file, behaviour unchanged), `engine/capture.ts` and `contracts/portal-capture.ts` (additive), `prisma/migrations/<date>_forms_f2/` and the F2 block appended to `prisma/schema.prisma`, `tests/forms/f2_*`, this item's `plan.md`, `challenge.md`, `build-notes.md`, `lanes/forms.md`. Shared-file requests to the Lead: **S-1** `api/src/main.ts` register the extension module and CORS for the extension origin only · **S-2** `api/src/core.ts` let the guard resolve a Bearer token to an Actor (one function, with a test) · **S-3** the Studio pairing panel: owner to settle with the screens lane (concept §2); the forms lane can build it as one small page under `web/src/pages/extension.tsx` if granted · **S-4** `package.json` add `@types/chrome` (dev) and an `extension` build script; ENVIRONMENT.md record (Lead) · **S-5** `engine/runtime/case.ts` read-only use of `knownOf` and `confirmation` (no change).

## 10b. Screen 02 needs it: list purpose and overflow on a field map (Lead note; Screen 02 concept Q3 → yes, BR-15)
Screen 02 chooses a list field's purpose and overflow in the field-map proposal, so the F1 field-map contract carries them. A small additive slice **F1-P**, built first in BUILD (before F2a) so the screens lane is not held:
| Element | Record | API | Rule | Tests (pass · fail) |
|---|---|---|---|---|
| List purpose | `FormFieldMap.listPurpose Json?` `{kind, overflow}` (expand-only column, version row like every map change) | the field-map decision and edit endpoints (exist) accept `purpose {kind, overflow}`; field-map reads return it | LP-1 only on a map row whose fact is a repeating group (row-level map); kind one of the five fixed kinds; overflow `extra_sheet` · `flag_officer`, never a silent cut; a list row with no purpose reads "Purpose: not set" and is listed by the release validator as a warning | set on a list row, read back · on a single-value row 422; unknown kind 422; missing overflow 422 |
The five kinds are named in SA-1B-11, 12, 27, which this cloud copy does not hold (`sources/` is Mac-only): **the Lead names them** (or the screens lane passes them in its plan); until then the contract takes them from one constant, Sample.

## 11. Questions
FOUNDER_QUESTIONS

## Lead response

## Agreement

## Build discoveries

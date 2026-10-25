# Screen 02 — AI work and reviews · builder's feasibility challenge (DESIGN, 25 Oct)

Read: `concept.md` (Lead decisions 25 Oct), `design/draft-ai-work.html`, the app on main 8360565 (`api/src/{ai,sources,forms,intake}.ts`, `prisma/schema.prisma`, `web/src/pages/*`), `lanes/forms.md`, SCREENS row 02. Facts are checked in the code or the sample database (`xr_studio_s01ui` after `demo/load`); judgment is marked. Short form as asked (top 5 points, P-89).

## Verdict
**Build after these changes.** Slice 1 (To review page + AI work log on today's data) can start as is: every row it lists already has a record and an endpoint. Points 1–3 must be settled before slice 2; 4–5 shape slices 2–3.

## Objections (ranked)

### 1. Major · Needed — who builds the back end, and the combination page belongs to Screen 03
* **What breaks:** §6 gives most new endpoints to the forms lane ("forms lane unless marked": decision kinds, job items of five kinds, impact, similar, A4 parts). The forms lane is now on F2 PLAN (`lanes/forms.md`, 25 Oct). Slices 2–3 would wait on it with no date. "Draft setup" and "Review proposals" open from the combination page, whose tabs are the runtime lane's (P-89; Lead note: "do not touch its tabs").
* **Evidence (fact):** `lanes/forms.md` current note; `concept.md` §6 "New (forms lane unless marked)"; `web/src/pages/combination.tsx` holds the tab bar; the review page is already a separate route and file (`/c/:id/jobs/:jobId` → `web/src/pages/job.tsx`).
* **Fix:** the screens lane builds Screen 02's back end in its own files (`api/src/review-queue.ts`, `api/src/impact.ts`, decision kinds in `sources.ts` job items). The forms lane adds only the purpose/overflow to the F1 field-map contract (Q3, already in its note). On the combination page Screen 02 adds **one entry point** (the existing "Setup"/next-step button opens Draft setup as a right panel, P-48) and no tab; everything else lives on `/c/:id/jobs/:jobId`, `/review` and `/ai`. One file shared with the runtime lane (`combination.tsx`, one button): agreed by the Lead before BUILD.

### 2. Major · Needed — K1 "only undecided form fields block release" against today's data
* **What breaks:** the released sample maps already hold form fields with no decision: **40 `unresolved`** and **23 `never_filled`** (of 377 published rows, `form_field_map` in the sample data). If "undecided blocks release" reads these rows, the next release of every combination using those editions is blocked: Screen 01's Live and Not ready rows and its release tests (QA-1 gate) change, against the Lead's "Screen 01 releases stay unblocked". `never_filled` is a fourth outcome the concept does not name.
* **Evidence (fact):** `engine/ai-run.ts:111`, `engine/parts.ts:110` write `unresolved` with a reason; `engine/import.ts:95` imports released maps as PUBLISHED; the counts come from the query above.
* **Fix (recommended):** the block applies to **form fields of an edition changed in this draft** (a new or re-drafted field map) that have no decision; a released map's `unresolved` rows show as "Not decided yet (from the release before this decision)" on the review page, a warning and not a blocker, until that edition is drafted again. `never_filled` displays as "not a fact" (same meaning: nothing is filled from case facts). No data migration. Test: a re-release of Super visa with its carried leftovers passes; a new draft with one undecided form field is refused.

### 3. Major · Needed — K2 proposals of five kinds need a different record and a first real run
* **What breaks:** a proposal today is field-shaped: `NormalizationItem` has `proposedKey`, `proposedMeaning`, `proposedType`, `matchedKey`, `boxes` (schema.prisma `NormalizationItem`). A document requirement, rule or check proposal does not fit those columns. Drafting refuses checklists today ("This is a checklist or instructions, not a fillable form", `api/src/sources.ts:95`); the only AI operations are `draft_field_maps` and `screen_map` (`api/src/ai.ts:115, 293`). There is no saved checklist run, so "replay and stub first" can only stub until one live run exists.
* **Fix:** one migration: `NormalizationItem.kind` (default `field`), `payload Json`, `sourceQuote`; applying an accepted item writes through the existing writers (`POST combinations/:id/requirements`, `/rules`, `/sections/:key`, checks), so the release gate and versioning stay one path. New operation `draft_from_checklist` on the same guarded route and ledger. **AI cost:** one live run on one official checklist already in the manifest (`official-sources/ircc/checklists/imm5483e.pdf`) to make the saved replay: expected under US$0.50 (Sample estimate; the plan states the real one), capped at US$5 (BR-3); stated again before the run, only at slice 3.

### 4. Minor · Needed — the approved source list is a committed file, so held-file approval (P-80) needs a record
* **What breaks:** intake decides "held" by checking the file's checksum against the official-sources manifest (`api/src/intake.ts:110`, `engine/import.ts manifest()`). An approval made in the product cannot write that manifest (committed, read-only to the app; P-31).
* **Fix:** a table `ApprovedSource {sha256, kind, code, edition, irccPage, uploadedBy, approvedBy, approvedAt}`; intake treats "on the manifest or approved in the product" as approved. Approver ≠ uploader on the server (BR-9). Test: same person → 403; second person → the file is accepted on its next upload and the held row closes.

### 5. Minor · Needed — A4 progress is mostly built already (smaller than the concept says)
* **Fact:** per-part plan and status already exist: `DraftingJob.detail.a4.parts` with status ("not started", failed, done) and messages (`api/src/sources.ts:287, 296`; `api/src/ai.ts:31, 39`; retry per part, QA-32). The concept lists `parts[]` on `GET /ai/batches/:id` as new forms-lane work.
* **Fix:** slice 2 exposes that shape read-only on `GET /ai/batches/:id` (screens lane, no engine change) and draws the part table. What is genuinely new in slice 2 is the **edition comparison field by field** (no engine for it yet; intake only detects `new_edition_held`) and the impact view.

## What is sound
* Slice 1 has real data today: pending job items (`jobs/:id`), captures awaiting a second person (`/captures`), proposed merges (`/library/merges`), held files (`/intake/held`), submitted combinations (`combinations/:id/review`). `GET /review-queue` is an aggregation, no new record.
* Every "Exists" endpoint in §6 is present (checked in `api/src/main.ts`, `forms.ts`).
* BR-1, BR-3, BR-8, BR-9, BR-10 are already enforced on the server and tested (launch paths, guard, captures suites); Screen 02 shows them, it does not rebuild them.
* Scaffolding is labelled (saved answer, stub, Demo menu) and kept off the main path (P-33).

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test (pass / fail) |
|---|---|---|---|---|
| To review rows | existing (job items, captures, merges, intake, submissions) | `GET /review-queue?filter=&kind=` (new, screens) | BR-9 role decides the next step | approver sees Approve; capturer sees no action |
| Draft setup | `AiBatch.plan` | `POST /ai/plan`, `/ai/batches` (exist) | BR-2, BR-3 | worst case over the cap → refused, nothing queued |
| Part progress | `DraftingJob.detail.a4.parts` (exists) | `GET /ai/batches/:id` + `parts[]` | BR-4 | a failed part keeps its good entries |
| Decisions | `NormalizationItem.decision` + `NOT_A_FACT`, `BY_HAND{reason}` | `POST /jobs/:id/items/:item` | BR-6, K1 (point 2) | by hand without a reason → 400 |
| Five proposal kinds | `NormalizationItem.kind/payload/sourceQuote` (migration) | `jobs/:id/apply` per kind | BR-1, BR-12 | accepted rule lands as DRAFT, release still gated |
| New edition impact | comparison computed, no new table | `GET …/editions/:id/impact`, `POST …/impact/accept` | BR-12 | unchanged fields carry their map; nothing changes before accept |
| Held file approval | `ApprovedSource` (new table) | `POST /intake/held/:id/approve|reject` | BR-9, P-80 | uploader approves → 403 |
| Advisory duplicate | none | `POST /library/fields/similar` | BR-7 | exact duplicate refused without AI |

## Questions for the founder
None: points 1–5 are Lead decisions (ownership, K1 reading, record shape).

## Lead response
25 Oct (Lead, cloud). All five accepted.
* **1 → accept.** The screens lane builds Screen 02's back end in its own files (`review-queue.ts`, `impact.ts`, decision kinds in `sources.ts`). The forms lane adds only purpose and overflow to the F1 field-map contract. On the combination page Screen 02 adds **one entry point**: the existing Setup / next-step button opens Draft setup as a right panel, with no tab. This is the one line in `combination.tsx` shared with the runtime lane, agreed now; the runtime lane's note says so.
* **2 → accept the recommended reading of K1.** Release is blocked only by undecided form fields of an edition changed in this draft. Carried `unresolved` rows show as "Not decided yet (from an earlier release)", a warning. `never_filled` reads "not a fact". No data migration. Screen 01 releases stay unblocked, and both tests are as proposed.
* **3 → accept.** `NormalizationItem.kind` (default `field`), `payload` and `sourceQuote`; an accepted item writes through the existing writers, and `draft_from_checklist` goes on the same guarded route and ledger. **AI cost:** the one live run on IMM 5483 (Sample estimate under US$0.50, cap US$5) waits for the founder's OK, which the Lead asks for at slice 3 with the plan's real estimate. Until then, stub only.
* **4 → accept** `ApprovedSource`. Intake treats a file as approved when it is on the manifest or approved in the product; approver ≠ uploader on the server.
* **5 → accept.** Slice 2 exposes `detail.a4.parts` read-only. What is new is the edition comparison field by field and the impact view.
* Also in this lane's slices: `LibraryChange` + `keyFor` with one publisher for both release paths (slice 2; concept Lead decisions, Screen 04 B1/M6). qa's QA-41 (dialogs open on Close) and QA-42 (seed note on a Live combination) ride slice 1.

## Agreement
Agreed 25 Oct (Lead, under P-89). BUILD slice 1.

## Build discoveries


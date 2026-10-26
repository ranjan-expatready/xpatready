# W1-structure-programs (W1-03/04/05) — build notes

## Slice 1 (BUILD, 27 Oct): data and API
The contract is `concept.md` §3, §5, §9, §10, §10b and the addendum A1–A5 as the Lead answered it on 26 Oct (`challenge.md`). The slice has no page, so it has no board and no screenshots. Slices 2–4 draw the Structure, Immigration programs and New combination pages on this API.

### What was built
| Element | Record | API | Rule | Tests (`tests/check_w1_structure.ts`, 83/83) |
|---|---|---|---|---|
| Pathway type is a fixed value; several Pathways per type | `program_def.client_type` on PATHWAY rows; the unique index is now per parent **and type** (migration `20261027090000_w1_structure`, with its rollback) | `POST /structure/nodes` level `pathway` | BR-1, B1 | same name in both tabs accepted · twin in one tab 409 · two Retail Pathways listed and pickable · no row for the type |
| `ensurePathways` / `PATHWAY_NODES` removed | — | every read | B1 | a read on an empty workspace creates 0 rows · Reset leaves 0 and reads create none |
| Every Pathway read | — | `GET /catalogue` (`sections` per Pathway, `tree` across all of them), `GET /path-options` (`pathways`), `POST /combinations/path` (`pathwayKey`, or the program's own Pathway), `POST /path-proposal` | B1 | second Retail Pathway reachable; a new program with two Pathways needs `pathwayKey` (400) |
| Structure outline data | `program_def` + `version`, `retired_at`, `retired_by` | `GET /structure?pathwayType=` | BR-1, BR-2 | empty state; counts; pending changes; meaning-check flag |
| Add a name | — | `POST /structure/nodes` | BR-3/4/5, M5, P-26 | 4 adds at once store 1 · close name 409 `close_names`, then `add_anyway` 201 with an audit line · `category_has_setup` 409 · levels and the other type 400 · locations default Both, a sub-category takes its category's |
| Did you mean (free) | pure `engine/structure.ts` `checkName` | `POST /structure/name-check` | BR-5 | "Visiter visa" warns with the trail; an unrelated name does not; the other type is never offered |
| AI meaning check | — | `POST /structure/meaning-check` → 403 `paid_runs_off` | BR-5, P-95 | no AI job, US$0; every name `meaningChecked: false` |
| Rename and locations | `version` (optimistic) | `PATCH /structure/nodes/:key` | BR-6, M1, M5 | key kept · stale 409 with the current row · twin 409 · a rename gives exactly **one** name-only change (`needs_sme` false) on a released combination; the release keeps the old name; a location edit needs the expert tick |
| Reorder | `display_order` | `POST /structure/reorder` | P-116 (applies at once, audit line) | order kept on Structure and Programs sections · a stale list 409 |
| Where used, remove, retire, restore | `LibraryChange` kinds `structure_node`, `combination`; `combination.retired_at` | `GET …/uses`, `DELETE`, `POST …/retire`, `…/restore` on `/structure/nodes/:key` and `/combinations/:id` | P-52 L1–L6, A1, A2 | full list in "Lifecycle" below |
| Approval and release | existing To review approve / withdraw; the one library publisher | `POST /library/changes/:id/approve|withdraw`, `POST /pack/release` | L4 | proposer cannot approve (403) · checked again at approval (409) · an approved delete applies at once · retire and restore take effect with the release |
| Retired-combination guard | — | `POST /runtime/cases` | A2 | no new case on a retired combination (409); the open case still opens; cases open again after restore |
| Setup steps, Filed, trail | calculated | `GET /catalogue` leaf: `trail[5]`, `progress`, `filed`, `retired`, `pathwayKey/Label/Type`; filter `retired` | BR-7, A3, A4, BR-13 | Not started = step 1 "No forms yet" · released sample Live, all four steps, "PDF" · pure checks for every step and for "PDF + answer sheet (later wave)" |
| Roles | — | every write | BR-15 | the approver gets 403 on add, rename, reorder and remove; an unknown caller gets 401 |

**Lifecycle checks:** removing an unused draft name: waiting → approved → gone. Removing a program with names under it, or a name whose combination has setup: 409 with each use and its link. Approving a removal after the name gained a sub-category: 409, then the author withdraws it. A never-released combination is removed when approved. A Live combination can be retired, because its own release and open case are listed but do not block; deleting it is refused. The retire waits on To review with its reason, and the release carries it. Retired combinations leave "All" and show under "Retired"; they leave pickers and no new case opens on them. A category with a sub-category that is not retired cannot be retired (leaf first). The sub-category itself can be retired and is then hidden from pickers, and nothing new goes under it. A combination is restored only after its name: name first, then the combination, each with approval and release.

### Files
New: `api/src/structure.ts` (service and routes), `api/src/lifecycle.ts` (the shared guard W1-06, W1-08 and W1-09 import), `contracts/structure.ts`, `engine/structure.ts`, `prisma/migrations/20261027090000_w1_structure/`, `tests/check_w1_structure.ts`.
Changed (small, each marked W1-03 in a comment): `programs.ts` (no `ensurePathways`; every Pathway; leaf trail/progress/filed/retired; sections; retired filter; `leafStates`), `studio.ts` (no one-Pathway-per-type 409; Pathway twins compared within the type; a retired parent or node refused; session counts any name), `demo.ts` (Pathways come from `samples/programs.json` `pathways`; "structure exists" counts any name), `library-changes.ts` (nouns; publisher calls `publishLifecycle`; withdraw goes to `withdrawLifecycle`), `screen02.ts` (re-check at approval; delete at approval; proposal carries its Pathway), `review-queue.ts` (Pathway name in the trail; nouns), `runtime.ts` (retired guard), `contracts/programs.ts` (leaf fields, `sections`, `retired` filter, `pathwayKey`), `schema.prisma`, `main.ts`, `samples/programs.json`, `tests/check_grounding_db.ts` (the "two fixed pathways" check now says the opposite).

### Team-name mapping, real and mock
The team's `ProgramDef` and `ProgramNodeKind` stay (PATHWAY › PROGRAM › STREAM = Category › CATEGORY = Sub-category). The Pathway type is the team's `clientType` on the PATHWAY row; no new kind and no new table. `LibraryChange` is the existing second-person record. Everything is real data on the isolated copy. "Sample" applies to names and locations only. The meaning check is off (no AI path is built in this slice).

### Checks run
* `check_w1_structure.ts` 83/83 · `check_grounding_db.ts` 31/31 · API and web `tsc` clean · any-ratchet 434 = baseline · `graph.mjs --check` exit 0 (G3 1 is the earlier `GET /attachments/:id/file`) · full `run-suites.sh`: see the Paste to Lead block.
* STANDARDS: contract first (zod), RFC 9457 with field errors, server-side duty checks (§6), migration with rollback (§5), names compared ignoring case/spaces/punctuation (§3.2), released means frozen (§3.7: a rename changes the draft, never a release).

### Known gaps and choices (for the Lead)
1. **Open cases do not block retiring a structure name.** The addendum A2 said they did; P-52 L3 says "open cases do not count". I followed L3: open cases are listed, not blocking. Written under Build discoveries.
2. The type switch on the current Programs page still says "Individual". Slice 3 redraws the page with "Retail"; the API trail already says "Retail".
3. Pickers (`/path-options`) stay alphabetical; the Structure outline and the Programs sections follow the reorder.
4. The old path builder still accepts new names (`{create}`) and "Linked to"; slice 4 replaces it (BR-3, P-106).
5. Release of a lifecycle change does not check that the releaser did not propose it (BR-14 is checked for combination rows only, as for library field changes today). Approval by a second person is enforced.
6. **qa lane files:** `tests/qa/check_qa14_name_race.ts`, `check_qa14_variants.ts`, `check_qa5_stored_times.ts` and `check_qa_m2_journeys.cjs` add programs under `individual` on a copy with no sample data. That Pathway no longer exists by itself, so they need a Pathway made first (`POST /structure/nodes`). They are not in `run-suites.sh`.

### Self-score (slice 1, API only; D-dimensions with a page wait for slices 2–4)
Data integrity 9 (index per type, optimistic version, re-check at approval) · rules 9 (a pass and a fail per BR) · contract 8 (zod and Problem Details; `uses` and `close` carry links) · governance 9 (second person, release publishes, audit lines) · performance not measured beyond the existing scale suite. AI cost US$0.

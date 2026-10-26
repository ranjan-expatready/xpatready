# W1-structure-programs (W1-03, W1-04, W1-05) — challenge of the Lead's concept draft

Challenger: a fresh agent that did not write the draft (26 Oct). Read: `concept-draft.md`, the three boards (rendered headless at 1280 px), `WAVE-1.md`, `DECISIONS.md` P-24, P-26, P-49, P-95, P-101–P-110, `domain/TAXONOMY.md`, `STANDARDS.md`, `EXPERIENCE.md`, `screens/W1-form-library/forms-for-5-combinations.md` Part B, the W1-06 / W1-08+W1-11 / W1-09 concept drafts, the code (`api/src/programs.ts`, `studio.ts`, `demo.ts`, `screen02.ts`, `engine/snapshot.ts`, `engine/validate.ts`, `contracts/programs.ts`, `prisma/schema.prisma` + migration `20261024090000_program_name_unique`, `web/src/pages/programs.tsx`, `new-combination.tsx`) and the "before" pictures `W1-baseline/01–03`. Not run: `freshness.sh`. The SA-1B rows cited were not re-read in `sources/`, so the SA-1B claims below are Unverified.

## Verdict: **Build after these changes**
The product shape holds: five levels with Pathway type as a stored attribute, one Structure page that adds names through one checked entry point, and a New combination page where names are only picked. Two things must change before BUILD. First, the data option is not yet a working data design: the database and seven places in the code still assume one Pathway per type. Second, renaming and the migration interact with release snapshots in a way the concept does not describe. The rest are fixes to make while building.

## Objections

### Blocker
**B1. Option 1 conflicts with the existing database index and with an invariant built into the code: "one Pathway per type".** *Needed for the proof.* Confidence high (read in code).
* What breaks: (a) The existing unique index `program_def_parent_name_key` is on (`workspace_id`, `COALESCE(parent_node_key,'')`, `name_key`), and Pathways have no parent. So "Temporary residence" under Retail and "Temporary residence" under Corporate collide, and Load sample fails on Sample row 6. The concept adds a new index but never changes this one. (b) `studio.ts:60-64` refuses a second PATHWAY with the same `clientType` (409 "pathway already exists"). The following all take *the one* PATHWAY of a type: `programs.ts:379` `pathOptions`, `:403` `createPath`, `:204` and `:183` `catalogue`, and `screen02.ts:134` (the rules path proposal), all via `.find(...)`. (c) `programs.ts:67-73` `ensurePathways` recreates the nodes "Individual" and "Corporate and employers" whenever no PATHWAY of that type exists. Reset deletes every `programDef` (`demo.ts:164`), so after every Reset (P-108) two Pathways named "Individual" and "Corporate and employers" would appear in the Structure. (d) Labels and counts drop the PATHWAY level: `programs.ts:46,117,121`, `review-queue.ts:60` and `engine/snapshot.ts:140` skip it, and `demo.ts:54` / `studio.ts:43` count "programs" as `nodeKind != PATHWAY`. The five-part trail and the "is the workspace empty" checks then come out wrong. (e) W1-08's BR-15 says Reset keeps "structure below the two Pathway types", which means it still assumes two stored rows (its own "Missing" line asks about this).
* Fix: Make §3 say all of the following. Replace the old index with one keyed on (`workspace_id`, `COALESCE(parent_node_key,'')`, `COALESCE(client_type,'')`, `name_key`), as one migration with its rollback. Delete `PATHWAY_NODES`/`ensurePathways`: Pathway type is the enum `PATHWAYS`, never a row. Remove the 409 in `studio.ts:63`. Make `pathOptions`, `createPath`, `catalogue` and `proposePath` walk *every* PATHWAY of the type. Count "structure exists" as any node. Put PATHWAY labels into the trail. Record in W1-08/W1-11 that after Reset the Structure is empty under both tabs. Add tests: same Pathway name in both tabs is accepted; a second Pathway in one tab is accepted; after Reset there are 0 nodes and a read creates none.

### Major
**M1. Renames and the migration change every release diff below them, so Live combinations show waiting changes.** *Needed for the proof.* Confidence high.
* Fact: `engine/validate.ts:152-153` flags "Row details changed" whenever the snapshot's `pathway`, `path` or `client_type` differs from the release. `engine/snapshot.ts:140-141` writes all three. Renaming the Program "Visitors" therefore puts a change on every combination under it. Re-parenting under a new Pathway changes `path` for *every* combination. A Live row then gets "Review and release", which contradicts BR-6 and the Rename tooltip on the board ("The new name shows everywhere at once").
* Judgment: STANDARDS §3.7 ("released means frozen") favours treating names as release content. The concept has to choose, not leave it implicit.
* Fix: State it in BR-6. Recommended: the new name shows at once in drafts, lists and the Structure. Each affected combination shows one name-only change. The next release carries it, and cases keep their release's names. Rewrite the tooltip to: "The new name shows in setup at once; firms see it after the next release." Test: a rename gives exactly one name-only change per affected combination, with `needs_sme` false (see Founder Q1).

**M2. The migration is more than it needs to be and puts immigration content in code.** *Not built* beyond a minimal step (P-26 lists migrations as the team's work; P-108 empties everything anyway). Confidence high.
* The lookup table (Visitors → Temporary residence …) puts immigration values into a migration (STANDARDS §3.1). It also re-parents every node, which triggers M1 for every row, and it stops on any program it does not know. Moving data is not needed at all: today's two rows are *already* valid Option 1 Pathway nodes (`clientType` INDIVIDUAL/CORPORATE).
* Fix: Run expand → contract only: the index change (B1) and `linkLabel` left unused. Existing rows stay as they are, as a Pathway named "Individual" with its programs under it, until a person renames it or runs Reset. No lookup table, no re-parenting, no stop. Test: after the migration every combination still opens and its trail has five parts.

**M3. The sample names (§4, boards) disagree with the Lead's own research, which is now written, and both disagree with the decisions.** *Needed for the proof.* Confidence high on the mismatch; the immigration content needs the expert.
* Part B of `forms-for-5-combinations.md` exists. It differs on four of the six rows. Row 3 is "Employer-specific work permit › With an LMIA – inside Canada", not "…(LMIA) › From inside Canada". Row 4 is "Provincial Nominee Program › Express Entry stream (PR application) › —", with the province as a case fact and no "Ontario". Row 5 has both "Outside Canada (Family class)" and "In Canada" siblings. Rows 2 and 5 also differ in wording.
* Part B is itself out of date. It uses "Pathway: Retail" in the old sense (pre-P-104), has no Pathway level, and has a "Supported by Corporate › LMIA" link column (pre-P-106).
* Concept row 4 ("Permanent residence application (Express Entry)" as a *category* under Provincial nominees) also conflicts with P-24 (Express Entry is one category with route sub-categories) and with TAXONOMY §4 row 9 (category = province, sub-category = stream). P-109 configures it from the paper forms (IMM 0008 …) while the name says Express Entry.
* W1-06 and W1-11 already copy these names ("Retail › Temporary residence › Visitors › Visitor visa" in the W1-06 lens), so a split now spreads to three lanes.
* Fix: Make one table the master (Part B rewritten with the five levels, link column dropped). The concept, boards, W1-06 copy and W1-11's loader cite it. Settle P-24 against row 4 (Lead or expert). Remove "Ontario" unless the expert confirms it (P-109 and Part B both lean that way).

**M4. The new Pathway level has no definition or test.** *Needed for the proof.* Confidence medium.
* TAXONOMY §1 still defines Pathway as "Who is the applicant: a person or an employer?". That is now Pathway type. The concept flags only §2 and PRODUCT §4. With no test, people will add Pathways freely, and the Corporate case already shows the problem: an LMIA is an ESDC labour-market application, not an IRCC temporary-residence application, yet Sample row 6 files it under "Temporary residence".
* Fix: Add one row for Pathway in TAXONOMY §1, "the government outcome the application leads to" (temporary status, permanent status, citizenship, an employer's authorisation to hire), plus its test, and re-run the 20 cases in §4 against five levels. Name the Corporate Pathway from that test (suggestion: "Hiring foreign workers"; the expert confirms) instead of leaving a [GAP].

**M5. Nobody sets where a case may be opened (allowed locations) any more.** *Needed for the proof* (the case-opening step reads `allowed_locations` from the snapshot). Confidence high.
* `studio.ts:73-75` requires allowed locations on every category and sub-category. `programs.ts` defaults to both inside and outside Canada. The New combination board says "Allowed locations / people: stay on the combination page", but the W1-08 concept never mentions locations. A sub-category "From outside Canada" would therefore allow inside-Canada cases by default, which is a contradiction in the data.
* Fix: The Structure "Add category/sub-category" panel gets one control, "Cases may be opened: Inside Canada · Outside Canada · Both", defaulting from the parent and Sample-labelled. Add it to the `POST /structure/nodes` body. Test: a sub-category saved as outside-only refuses inside on the case (W4).

**M6. "Combination" means two different things.** *Needed for the proof.* Confidence high.
* Fact: `programs.ts:113-128` already lists every leaf node without setup as a "Not started" row. So adding a leaf on the Structure page makes a combination row appear in Immigration programs straight away, and New combination with picking only is mostly "open the leaf's setup".
* BR-13 ("every configured combination") and BR-11 never say whether such leaves are listed or whether "Create" is what makes them a combination.
* Fix: State it in BR-2/BR-13. Recommended: every last-level node *is* a combination (SA-1B-55, Unverified), listed as "Not started" from the moment it is added. Create only opens or starts its setup, and "Will be created as" becomes "Opens" when the leaf already exists (see Founder Q2).

### Minor
* **m1. Missing states** (EXPERIENCE §4). Structure: read-only for an approver, with reasons on the "+ Add"/"Rename" buttons; "Add sub-category" refused because the category already has setup (the P-26 rule in `programs.ts:309`), not drawn although the rule stays; tree search with no match; long names in the tree. New combination: the AI proposes a path in the *other* Pathway type, which the read-only chip cannot accept, so it should offer "Switch to Corporate and employers". *Needed.*
* **m2. Accepting an AI path with new names writes several things in a row** (nodes via `/structure/nodes`, then `/combinations/path`). A failure halfway leaves new nodes behind. That is acceptable (nodes may exist without setup, M6), but say so and show which names were added. *Needed.*
* **m3. AI meaning check by default.** P-95 keeps it off behind the paid-run switch, but BR-5 reads "AI meaning check on Save" as if always on. Add "when the paid-run switch is on; otherwise 'not meaning-checked'". *Needed.*
* **m4. Row trail.** BR-7 puts the *program* in bold, but rows in one group then all start with the same bold "Work permits". Bold the last level, mute the first two parts (the tab and group row already show them), and when truncating keep the end of the trail. Five pickers, each with "+ Add to structure", are tight at 1024 px: check the layout at that width. *Needed.*
* **m5. Losing "Needs work" (BR-13) removes the task-first view** (EXPERIENCE §0). Keep it as a Status filter option even though it is not the default, and record that this amends P-49. *Needed.*
* **m6. `linkLabel` going away also drops the Express Entry route-step line** ("Step 1 of 2", P-24, baseline 01). Say that this is intended until route steps return. *Not built.*
* **m7. The words "Pathway" and "Pathway type"** sit side by side (control and "Pathway: All"). Add both to PRODUCT §4 with one-line tooltips. *Needed.*

## What is sound
* Option 1 (Pathway type as a fixed attribute on the team's PATHWAY node) fits the existing `clientType` column and the team's four node kinds, and needs no new kind. Option 2 rightly loses.
* Names entered only through the Structure, with the same check from both places (Structure page and shortcut), meets STANDARDS §3.2 and turns founder decision P-104 into one checked path. Keeping "Will be created as" is right.
* Add and rename states: exact duplicate refused, close names warned, AI same/none/stopped/off, stale 409. The contract has `version` and RFC 9457. Tests come in pass and fail pairs per rule. Remove, move and reorder are honestly marked Not built.
* P-106 is applied cleanly (`link` rejected with 400). The mode dropdown follows P-105. AI runs go through W1-07 (P-110).
* Simplicity: the Programs list option A is close to today's page (baseline 01: search, type switch, flat rows), so the redesign is a moderate change, not a rebuild. Option A for the Structure page is the right default.

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Pathway type tab | `PATHWAYS` enum; `program_def.client_type` on PATHWAY | `GET /structure?pathwayType` | BR-1, B1 | Corporate node never under Retail |
| Pathway names unique per type | index changed (B1) | `POST /structure/nodes` | BR-4 | same name in both tabs accepted; twin in one tab refused 409 |
| Several Pathways per type | remove `ensurePathways`, `studio.ts:63` | `pathOptions`, `createPath`, `catalogue`, `proposePath` | B1 | 2 Pathways in Retail both listed and pickable |
| Add / rename | `program_def` (+ `version` column, new) | `POST`/`PATCH /structure/nodes` | BR-4/5/6 | stale 409; rename keeps key |
| Rename and releases | snapshot `path` | — | M1 | one name-only change per combination |
| Allowed locations | `allowed_locations` | in `POST /structure/nodes` | M5 | outside-only stored and shown |
| Did you mean | — (pure function) | `POST /structure/name-check` | BR-5 | "Visiter visa" warns; unrelated name does not |
| Meaning check / AI path | `drafting_job` (W1-07) | `meaning-check`, `/path-proposal` + `mode` | BR-9/10, P-95 | Rules only = 0 AI calls |
| Leaf = combination | `program_def` leaf ± `combination` | `GET /catalogue` | M6 | new leaf listed as "Not started" |
| Reset | all `program_def` | demo | B1, P-108 | after Reset 0 nodes, none recreated |

## Questions for the founder (recommendation first)
1. **Renaming a name used by a Live combination:** **the new name shows in setup at once and reaches firms with the next release; cases keep their names (Recommended: released stays frozen)**, or it reaches firms at once without a release?
2. **A category or sub-category added on the Structure page:** **listed straight away in Immigration programs as "Not started" (Recommended: one meaning of combination, nothing hidden)**, or listed only after someone presses Create in New combination?

## Lead response

## Agreement

## Build discoveries

# G-CORE — one guarded change pipeline (concept v2, awaiting the tech lead's approval, P-223 (4))

Row: BACKLOG G-CORE (P-253, P-255, P-258) · area: forms · no board: a backend core plus one preview panel on screens that exist, so the tech lead approves after the independent challenge (`challenge.md`, verdict "Build after these changes"; v2 makes those changes, see the end). SA-01B: SA-1B-292 (guarded Add, held under P-251 on C2; Unverified in the cloud copy, no `code/`). This concept changes no approved SA1B decision.

## 1. Job and journey
**Every change to a shared-library item, by a person or by the AI, is a change set. It passes the same fixed rules, shows what it touches, gets the review its risk needs, and records who made it.** Persona: an author (C3.15 rename), a reviewer (merge approval, To review), the AI as a proposer (P-121 rounds). First users (P-253 "Now"): the shared library's **rename** (field, section), **merge** (field) and **AI proposals** (`proposals.ts decide`: field, section, answer list, document type, condition). Held, with only the seam designed: hand-made **create** (P-252 (3)), the co-pilot's **drafting** (L-SA11) and **bulk accept** (SA1B-D77), all under P-251. Bulk accept stays as built: one change set per item, as P-121's "one approval per item".

## 2. Layers: what exists, what is new (reuse, never rebuild)
| Layer | Exists today | New in G-CORE |
|---|---|---|
| Second person | `LibraryChange` WAITING → approved by a different person; `FieldMerge` PROPOSED → approve | the tier picks which of these a change set opens; no new queue |
| AI door | `proposals.ts insertProposals / decide / LANDERS / undo`, `sameInLibrary`, P-121 two rounds | `decide` builds a change set per item and runs the check before the lander; Undo also removes its change sets |
| Rules | duplicate checks in rename (own group), sections (all titles, retired too), `sameInLibrary` (workspace); `valueProblems`; `askedInOrder` before/after (`qd-conditions.ts`) | `engine/change-set.ts checkChangeSet`: R1–R8 (§3) in one pure module; R6 and R7 are new code |
| Where used | **SH2**, own PR first: `engine/where-used.ts` (pure) + `api/src/where-used.ts`, used by impact, form-uses, library-sources, library-items | the preview reads it |
| Expert | release review: `validate.ts diff` marks rules, document rules, checks and AI-made items `needs_sme`; `studio.ts` requires the `sme` duty | unchanged: the tier says it in words |
| Made by | `Origin` on every row | the chip is derived from `Origin` plus the change set's "edited by a person" flag (one source of truth) |
| Store | — | table `change_set` (made_by, edited, items, tier, fingerprint, status, links to library_change / field_merge / proposal batch, before-image for a rename). **Migration: one new table only (P-228).** |

**Lift-ready (P-249):** `engine/change-set.ts` imports nothing with I/O. R8's snapshots and R7's answer lists are read by the API and passed in, so the module never imports `validate.ts` (it reads files at load). The purity scan follows the module's imports, not just the file.

## 3. Business rules
* **BR-1 One door.** The rename handlers, `proposeMerge`/`approveMerge` and `decide` each call `ChangeSets.check(...)` and then `record(...)` inside their own transaction. A scan test asserts that these entry functions call it. The existing URLs stay the only confirm doors: there is no second public write door.
* **BR-2 Fixed rules check.** All rules run, and any error refuses. Rules by what they really are:
  * **R1 Type and format.** Kind, action, key shape, value type known, a name of 1–120 characters with at least 3 letters.
  * **R2 Source and reason.** Required for anything new or a meaning change (P-252 (3), P-170). AI items carry it from their run.
  * **R3 No exact duplicate.** One engine table keyed by action and kind, keeping today's scopes and words:
    * a field rename checks its own group;
    * a section rename checks every section title, retired ones too;
    * a new AI item checks the whole library (`sameInLibrary`);
    * a merge checks that both fields are active and not merged.
  * **R4 References intact.** A merge target exists, is active, and has the same value type and the same answer list (new: today only the type is compared). Every field a condition reads exists and is neither retired nor merged.
  * **R5 Rule conflict (exists).** Using `valueProblems`: a value of the wrong type, or one fact asked to equal two values under "and".
  * **R6 Redundancy (new, small).** A condition identical after `canonical()` to one already on the same target, or a sibling repeated under "and"/"or".
  * **R7 A condition that can never be true (new).** A value not on the fact's answer list; this reuses the list match in `qd-conditions.ts`. It is not a decision-table coverage gap.
  * **R8 Loop or unreachable (exists).** The `askedInOrder` before/after diff, run on the draft snapshot of each combination that selects the section. Only new problems count.
  * R5–R8 run on every condition the change writes, and for a merge on every condition the swap rewrites (before and after the swap: only new problems count). **Not checked**, said in the panel: ranges that cannot meet, contradictions across or/not, and coverage gaps.
  * The checks run again when the second person approves, and a change that fails is refused with words, nothing written (as `approveMerge` and `applyCondition` do today).
* **BR-3 Preview before confirm (P-253 step 4).** Per item, it lists:
  * the touched **sections** (questions placed in it);
  * the **forms** (current editions mapping the field);
  * the **rules** (conditions reading it, from SH2 `fieldUses`);
  * the **combinations**;
  * the **releases** carrying it (unchanged, listed);
  * the **open cases**, counted per pinned release ("3 open cases stay on release 2; nothing changes for them"). Every case pins at open (`runtime.ts`); SH2's `openCases` is refined to group by pin.
  * the item's **before → after**.

  The existing URLs take an optional `expected` fingerprint and answer 409 "look again" when it is present and stale. The three web hosts always send it, and a test proves they do.
* **BR-4 Review by risk, fixed in code (`riskOf()`, pure, one table).**
  * **Direct:** wording, label, alias. Applied as a draft version and logged. Listed in the release review's diff (it lists field changes today), which is the "listed on To review" of P-253.
  * **Second person:** a new item, a meaning or value-type change, a merge, any rule or condition change, a retire. Opens a WAITING `LibraryChange` / `FieldMerge`.
  * **Expert:** the existing release-review SME sign-off for rules, document rules, checks and AI-made items. The panel says "the immigration expert signs it at release". There is no new gate at approval.
  * An AI change set is never direct (as today: every lander writes WAITING).
* **BR-5 Made by.** Person · AI · AI, edited by person (an AI item a person changed with "edit" in `decide`). Shown on the library rows and in the preview.
* **BR-6 Versioned; rename roll-back.** A direct rename stores its before-image. "Undo rename" is a new change set through R1–R8: a name taken since is refused by R3, and a newer change since refuses with words. Releases are never touched (L2). Roll-back of merges and AI landings is not built: see Q2.
* **BR-7 Held seam (P-251).** The `ChangeItem` type has `action: "create"` and `made_by: "ai_draft"`, and `riskOf` has their rows, but no endpoint accepts them. A by-hand create stays the existing 410 (`noFreeAdd`). There are no engine tests for held paths beyond the type.

## 4. Layout (no new screen)
One shared panel, **"What this change touches"** (`web/src/ChangePreview.tsx`), in the existing rename dialog, the merge approval and the AI review row. It shows:
* the checks ("Checks passed", or each problem in words, plus the "Not checked" line);
* the tier in words ("Applies now; shown at the next release review" / "Waits for a second person" / "… the immigration expert signs it at release");
* the groups Sections · Forms · Rules · Combinations · Releases · Open cases, each with a count and links.

A made-by chip goes on library rows. Accessibility: the panel is a region with a heading, the lists are plain lists, and there is no hover-only text.

## 5. Copy (samples; names, never codes or decision numbers)
* Duplicate: "\"Last name\" is already the name of the field Family name in this group. If they mean the same, merge them; otherwise choose another name."
* Conflict: "The condition asks Marital status to be both Married and Single at once: it can never be true."
* Never true: "The condition asks Country of birth to be \"Atlantis\", which is not on its list."
* Merge: "Merging would make the check \"Spouse's passport\" ask Family name to be two values at once."
* Stale: "What this change touches changed since you opened it. Look at it again, then confirm."

## 6. Contract and tests
**Contract.** `contracts/change-set.ts` (zod) defines:
* `ChangeItem {kind, action: rename|alias|merge|set_condition|accept_proposal (create held), key, before?, after, source?, reason?}`
* `ChangeSet {made_by, edited, items[], proposal_id?}`
* `CheckResult {problems[], not_checked[], tier, tier_words, preview, fingerprint}`

**API (additive).** `POST /api/change-sets/check` (no write; the preview). The existing rename, merge and `decide` URLs get an optional `expected`. `POST /api/change-sets/:id/undo-rename`.

**Tests.** `tests/check_gcore_*.ts`, labelled `G-CORE: …`, with a pass and a fail per BR and per R3 row. The acceptance tests:
* `G-CORE: an AI change set with a duplicate is refused`;
* `… with a rule conflict is refused`. This one is a planted proposal: today's AI producer writes only single `eq` trees.

  Both go through `decide`, write nothing, and return the reason.
* `G-CORE: person and AI go through one door` (the scan, plus the same `checkChangeSet` result for the same action and items);
* `G-CORE: preview lists every section, form, rule, combination, release and open case` on the six combinations' sample;
* `G-CORE: a merge that would make a condition never true is refused`;
* `G-CORE: tier follows the risk table` (table-driven);
* a property test (STANDARDS §7): checking never mutates its input, and its result does not depend on the order of the items;
* the engine purity scan.

The C3.15, merge, proposal, C4.11 condition and C11.9 suites stay unchanged and green.

## 6b. Capability, scaffolding, proof
* **Capability, needed for the proof:** one door, R1–R8, preview, tier, made-by.
* **Small, in the brief:** rename roll-back.
* **Not built:** create by hand, co-pilot drafting, meaning-based search, merge roll-back, a change-set history screen or counts endpoint (the impact report D1 can count `Origin` and `made_by` later), and other libraries adopting the core (M3).
* **Scaffolding:** none.

## Build: B0 + three PRs
* **B0 SH2:** its own PR (no approval needed).
* **B1:** engine + contract + `change_set` table + the `check` endpoint; R1–R8 and tier tests.
* **B2:** rename and merge through the door; the panel; `expected`; made-by; rename roll-back.
* **B3:** AI proposals through the door (the acceptance tests), and Undo removing its change sets.

Files: `engine/change-set.ts`, `contracts/change-set.ts`, `api/src/change-sets.ts`, edits in `library-sources.ts`, `forms.ts`, `proposals.ts`, `where-used.ts`, `studio.ts` (additive), one migration, `web/src/ChangePreview.tsx` and its three hosts. The challenger's m5: C11.9's retire and restore stay on `lifecycle.ts` until M3, so its BACKLOG line "goes through G-CORE" needs the tech lead's update.

## 7. Questions for the tech lead (founder-level where marked; recommendation first)
1. **(Founder) A rename of a field a released combination uses: direct or second person?** P-96 says a rename is direct; P-253 says "anything used by a released combination" needs a second person. *Recommend direct* (P-96): the release is frozen, the next release review lists the rename, and the panel says so. Otherwise almost every rename waits for a second person.
2. **Roll-back scope.** The brief names "versioned with roll-back"; P-253's "Now" does not. *Recommend: rename roll-back now (a stored before-image, small), merge and AI-landing roll-back in M3* with "each library adopts the core". A merge moves sample facts and derived fields in place and needs full before-images.
3. **(Founder) Where the immigration expert signs.** P-253 cites P-96, which has no expert clause. *Recommend at release review, as today*, with no extra gate at library approval.

## Definition of ready
* **Acceptance tests named:** §6.
* **Row text:** BACKLOG G-CORE.
* **Decisions answered:** P-253, P-255, P-258, P-249, P-96.
* **Open:** Q1–Q3. B1 does not depend on them. B2's tier for released renames waits on Q1, and its roll-back on Q2.

## Changes after the challenge (v1 → v2)
* **M1:** the expert tier is the release SME sign-off, with Q1 and Q3 put to the founder.
* **M2:** R3 is a table keeping each flow's scope.
* **M3:** optional `expected` on the existing URLs, plus a re-check at approval.
* **M4:** a merge checks the conditions it rewrites, and the answer lists must match.
* **M5:** R5–R8 are labelled as they really are, with a "Not checked" line.
* **M6:** the public POST, the history and the counts are cut. Roll-back is narrowed to renames (Q2): the brief names it, so it is kept small rather than cut.
* **Minors m1–m9:** taken.

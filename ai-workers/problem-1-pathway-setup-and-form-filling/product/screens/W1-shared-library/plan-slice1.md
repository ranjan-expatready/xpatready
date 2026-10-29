# S6 Shared library: (2b) and slice 1 plan (screens lane, 29 Oct)
This plan builds on contract v2 on main (deda0e6b, `contracts/proposal-item.ts`). It covers C11.13, C11.14 and C3.2, and P-158 items 2, 3 and 5. US$0: replay and stub only.

**What is on main today:**
* There is **no `ProposalItem` table and no producer**.
* Field proposals live in `NormalizationItem` (`sources.ts:545-760`). They are decided per item, and `apply` writes the draft field and a WAITING `LibraryChange`.
* To review is built from records (`review-queue.ts`). Its `ai_proposals` row comes from `DraftingJob`.

**What the slice builds, in three PRs so each can be checked on its own:**

| Part | What | Needs | Cost |
|---|---|---|---|
| **1a Table and door** | (1) `ProposalItem` Prisma model mirroring the contract: JSON payload, source, rounds, rules, identity, revision and decision; indexed status, kind, combination, edition, run and batch. (2) A migration that copies `NormalizationItem` rows onto it (field, section, answer_list, check, document_requirement → contract kinds), drops the `rule` rows and logs the count (Q-L4), then drops the old table. The readers switch (demo, programs, library-changes, sources, review-queue, ai). (3) `api/src/proposals.ts`, the one door: `insertProposals(items)` parses the contract and checks identity at write; `decide(ids, accept / edit / reject, reason)`; `undo(batchId)` within 10 s. Accepting a library item runs that kind's lander: a draft row plus a WAITING `LibraryChange` carrying the batch id and the item id. The identity check runs again at approval. (4) The guard: a source scan refuses `canonicalField / logicalSection / answerList / documentType .create` outside `proposals.ts` (allowlist: version revisions, the P-65 merge, release publish) | nothing new | US$0 |
| **1b Queue page** | (1) `GET /review/proposals`, grouped by form edition or combination, in Ready · Check · Decide. (2) A side panel with both readings, the quote and the rules. (3) Bulk accept for Ready only, never a rules item landing on the library, at most 200 per batch, with one Undo. (4) On To review, `ai_proposals` becomes one `proposals` row per group, linking to the queue. (5) Grouped second-person approval: `GET /review/changes?group=batch` and `POST /review/changes/batch/:id`, each row under `decideChange`'s guards. (6) "Draft fields with AI" on the form row, through the runner's `field_map_edition` step (slice R), replay or stub | 1a | US$0 |
| **1c Hook-ups** | **pqr_pick:** the lander for `pqr_pick` is runtime's `acceptPqrPick`, and `pqrPicksByRules` items enter through `insertProposals`. **Add the fact this rule needs** (P-158 item 5): a field item with origin rules, sourced to the rule; without a rule it is 400 | runtime PR #94 on main; forms' rule reference in `ProposalSource` | US$0 |

**How runtime's two pieces plug in:**
* **`acceptPqrPick`** (PR #94, `fact-sources.ts`): it lands on a combination, not the library, so it has no `LibraryChange`. The queue's lander registry (`LANDERS[kind]`) calls it inside the decide transaction, and the queue writes the item's status and decision. Runtime's change: `acceptPqrPick` takes a transaction client and is exported for the registry. The pick's "Accept" button moves into the queue, so there is one Accept everywhere.
* **`placement_fills`** (PR #94, `who-fills.ts`): it changes who fills an existing question. That is a decision about an item already in the library, not a new item from a source, so it stays a `LibraryChange` (P-97) on To review. It goes into the scan's allowlist (only ADD must come through the door), and grouped approval treats it like any change. After #94 merges, the field page's "Collected from" becomes read-only for an existing placement, with a "Change who fills" button (library.tsx).

**Tests:**
* `tests/check_s6_p149.ts` (API) and `check_s6_queue_browser.cjs`, a pass and a fail per rule.
* Guards:
  * the free-add scan;
  * identity at write and at approval;
  * no in-place edit of an approved row;
  * bulk refuses Check, Decide and rules→library;
  * Undo after 10 s is refused;
  * the same person cannot approve their own batch;
  * a pqr_pick accept fails as a whole when the fact is no longer needed (the item stays waiting).
* The (2a) checks keep their seed helper until 1a; the seeds then go through `insertProposals`.

**Needs from the Lead:**
* **N-1 (forms):** contract v2 still has `origin: person` and `addReason`, which P-158 item 1 drops, and `ProposalSource` has no rule reference (item 5). Proposed forms change: drop `person` and `addReason`, and add `rule: { key, sentence } | null` beside file and quote, with a test. 1c's item 5 waits for it; 1a and 1b do not.
* **N-2 (runtime):** `acceptPqrPick(tx, actor, item)` takes a transaction client and is exported, so the item's status and the fact source change together. The pick's own Accept is removed once the queue calls it.
* **N-3 (carried from 2a):** sections in a workspace started without the sample. Proposed: the forms' parts give section proposals in slice 2, as planned, with no stop-gap. Until then the checks seed sections.

# UX-A part 3 — diff-only re-review of the replay (r4), PR #622, head 0452905b

Scope: only what the replay onto today's main changed. The part's product code was approved on dec065a3 (review-part3*.md). Sonnet per P-278; US$0; port 4447, db xr_studio_rev_622, stopped.

1. **Conflict in `review.tsx` (`inv`)** — Met. Line 36 holds this part's `combination-summary`, `draft`, `catalogue` together with G1's `["sources", id]`, and still the original six (`review`, `combination`, `programs`, `preview`, `config`). Nothing dropped, no duplicate. `submit`, `sign` and `approve` all use the one list. G1's walk (sign/release, then the block) and part 3's "after a real change the bar, header and Review agree" both pass on it.
2. **Commit 0452905b (inferred type for `draftChanges`)** — Met. `const draftChanges = changesCount === 0 || counting ? [] : v.draft.changes;` is now typed from `v.draft.changes` (which is `any`, so `any[]`). Uses unchanged: `changes` (line 53, annotated), step-1 text, Submit's `!draftChanges.length`. `tsc --noEmit` in `studio/web` is clean. Behaviour is the same (empty while counting or 0, else the draft's list); the 0-change and counting cases pass in the browser walk.
3. **G1's Review block vs part 3's counting/failed states** — No conflict. `UnsourcedNumbers` fetches its own data (`["sources", id]`) and is given only `id` and `blocking={unsourced > 0}`, with `unsourced` from `v.draft.problems` errors (`gate === "no-source"`). It never reads `draftChanges` or `changes`, so part 3 emptying the list while counting, or the "could not be counted / Try again" state, cannot hide it. The "Validation of the draft" notice and `AnswerKeyBlock` also read `v.draft.problems` and `v.draft.answer_keys`. The only shared point is Submit: disabled by `!draftChanges.length || errors.length`, so an unsourced number blocks it as before, and during the short counting moment it is disabled with "Counting draft changes" shown (the intended part 3 behaviour, not a regression). The sources-error "Try again" (Devin on #615) and the count's "Try again" are separate buttons for separate failures.

Re-runs on my own fresh database copies (psql path swapped to /usr/local/bin in a scratch copy, removed after):
- `check_uxa3_status_words_browser`: 23 passed, 0 failed, exit 0.
- `check_g1_source_register_browser`: 60/60 passed, exit 0 (includes the Review block, Submit offered when every number is sourced, the sources-error state).

Leftover screenshots stashed (`leftovers`); worktree clean. Journey score: not re-scored (diff-only; the part's journey score stands from the earlier reviews).

Findings: no Blocker, no Major, none open.

**Verdict: Approve**

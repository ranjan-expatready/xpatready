# Review: B112 (QA-256, C4.5), PR #1100, commit bfa10621f

Independent reviewer; I did not build this. **Summary: the fix is correct on the merge path it changes, but there are two Majors. Ship after fixes.**

**How this was checked:** code, the PR text and the three screenshots. On instruction I started no test copy, browser or suite, so every finding is read from code, not run. Live AI off, US$0.

## Issues

### Major 1 (Must): the merge card says "Checks passed." and the merge is then refused
* **Where:** `api/src/forms.ts:505`; `api/src/change-sets.ts:43` reads no `suppliesFacts` or `suppliesAbout`; `engine/change-set.ts:261` (the merge rules) has no such rule.
* **Evidence:** the PR's own `b112-3-refused-1440.png` shows green "Checks passed." beside the refusal. The fingerprint hashes items, problems, tier and preview (`change-sets.ts:124`), so it cannot carry this.
* **Fail case:**
  1. A document supplies K (holder) and G (spouse).
  2. An author proposes G into K: accepted, and the field page warns of nothing.
  3. The second person opens the card: "Checks passed."
  4. They click Approve: 409.
* **Bar missed:** G-CORE BR-2 ("All rules run, and any error refuses"; the same check runs at proposal and at approval) and BR-3 (preview before confirm). No data is harmed, but the decision screen states something false and the proposer is never told.
* **Fix:**
  * Read the two columns at `change-sets.ts:43`, pass them through `Library.documentTypes`, and add the rule under R4 in the merge branch of `engine/change-set.ts`.
  * `proposeMerge` and the card then say it through the existing guard, and the fingerprint moves with it.
  * Keep the check at `forms.ts:505` as the guard against a race.
  * Test: `POST /library/merges` is refused and `POST /change-sets/check` answers `ok: false`.
  * Neither of these two files is in #1036's list.

### Major 2 (Must): the refusal's advice leads to a route where one fact silently becomes about the wrong person
* **Where:** `api/src/forms.ts:503` (the early return looks only at the newest version); `api/src/document-supplies.ts:165-167` (withdraw writes `before`); `document-supplies.ts:180` (`Object.fromEntries` on merged keys: last one wins, no check).
* **Fail case (read from code, not run):**
  1. Type T supplies K (holder) and G (spouse): `about {G: spouse}`.
  2. As the refusal says, "Change what it supplies first": propose facts [K]; a second person approves. The change stays APPROVED with `before [K,G]`, `beforeAbout {G: spouse}`, and the draft is [K].
  3. Merge G into K: not refused, because the newest row has no G.
  4. The proposer withdraws the change. `after` reads [K], matches the draft and passes. `before` through merges is facts [K], about `{K: spouse}`, which is written to the draft.
* **Result:** the holder's own K now reads as the spouse's, with no message. That is QA-256 in reverse, and the guess the PR says it refuses to make. With two non-holder people, whichever key comes last wins.
* **Origin:** `throughMerges` is unchanged and on main. It is still in this row, because the row's rule ("one fact about two people: refused") does not hold on this route and the new words send people to it.
* **Fix, staying out of #1036's files:** in `approveMerge`, also apply the same refusal to any APPROVED supplies change on the type whose `matches.before` holds both fields about different people. Test: steps 1 to 4 with the merge refused. If the fix goes in `withdrawApprovedSupplies` instead, that file is in #1036, so order the two PRs.

### Minor (Should)
1. Test gaps: `tests/check_b112_merge_supplies_about.ts` has no case for:
   * two fields about the same person merging (changing `!== whom` to always refuse fails no test in this file; I did not search every other suite);
   * `DbNull` when nothing is left;
   * the published row unchanged;
   * a released snapshot unchanged;
   * `about` after a withdraw (`tests/check_c45_supplies_release.ts:86` compares facts only).
2. "The refused merge changes nothing" (`check_b112_merge_supplies_about.ts:54`) reads only the type row and `merged_into_key`; the walk adds the merge status. Form fields, question placements and the change set are not asserted. The code is right; the test would not notice a write outside the transaction.
3. `forms.ts:499` picks a type if any version carried the field. A published newest row that dropped it gets a no-change draft and counts in "document supplies" (`forms.ts:503`). On main too.
4. The refusal shows only in a dismissable toast; the card behind it does not change. Major 1's fix settles this.
5. The card's "What moves" line and "What this change touches" do not mention documents, so the second person cannot see that a document's facts move. BR-3 does not list documents, so this is not a standard miss.
6. The official-words line drops after a merge (`document-supplies.ts:69-70`, reads `cites` by the old key). The PR states it, but no row exists yet.

## The checks asked for
| Check | Finding |
|---|---|
| Newest no longer carries the field | Correct: about is left alone, no refusal. See Major 2 and Minor 3 |
| `supplies_about` null | Correct: `?? {}`, whom is holder, ends in `DbNull` |
| `DbNull` when nothing is left | Correct, and overrides the copied null; `snapshot.ts:210` and `sources.ts:28` read null safely; untested |
| Published row gets a draft | Correct through `revise` (`core.ts:142`); the published row is not updated; proved only by the walk |
| Released snapshot untouched | Correct: `approveMerge` writes no snapshot. Untested here |
| Refusal moves nothing | **Correct.** `conflict` throws inside `$transaction`, so the claim, field, aliases, form fields, placements and conditions roll back. The change set update and audit come after the throw; `guard` writes nothing |
| Words, and shown on the card | Plain, names the document, seen in `b112-3`; status stays Proposed. Shown as a toast (Minor 4) |
| Other readers of `suppliesAbout` | `snapshot.ts:210`, `sources.ts:28`, `document-supplies.ts:69` all read by fact key, so they now agree. `import.ts:79` only writes |
| Withdraw after a merge, about moved | Agrees in the ordinary case: both sides read through merges, and `{K: spouse}` returns correctly. Fails only on the collision in Major 2 |
| Release marking (`document-supplies.ts:195`, facts only when merged) | No disagreement: the merge moves about the same way `throughMerges` maps it, and only one change can be open, so nothing else writes about in between. Safe as it stands |
| Proposal check says beforehand | **No.** Major 1 |
| Tests fail when the behaviour goes | Yes for both rules: without the move, the two `about` checks fail; without the refusal, both refusal checks fail. Gaps in Minor 1 and 2 |
| Walk's facts written by SQL | Acceptable: stated in the PR, test copy only, setup not a demo step (P-33 not hit), and the API check uses the product's routes. I did not check its reason in the panel code. It is the only proof of the published-to-draft path |
| No file #1036 changes | **True now:** the diff's file list and #1036's have no path in common. Only `forms.ts` is changed code |
| Later commits add only the walk | True: from 0a1a742a4 to bfa10621f only tests and screenshots change, so the pack's result still applies to `forms.ts` |

## PR checks seen (at bfa10621f, mergeable)
`types` pass · `kind` pass · Devin Review pass · shards 1 to 6 **pending** · `regression`, `regression-plan` and both Mergify checks skipping. Green CI is not yet shown.

## Evidence given to me, not re-run
Fail test on main 91a62168e exit 1, with the fix 5/5; walk 7/7; C4.5 26/26 on the six (run 42001000008).

## D1 to D20 (1 to 5, this change only)
* D1 Requirement fit 3: QA-256 fixed; BR-2 and BR-3 missed (Major 1).
* D2 Data integrity 3: main path right; Major 2 route open.
* D3 Reuse 5: no new definition.
* D4 Rule integrity 3: new rule sits outside the rules check.
* D5 Stability and recovery 4: rollback sound; merge stays Proposed and can be retried.
* D6 Governance 4: merge audit unchanged.
* D7 AI trust: not touched.
* D8 Orientation 4: unchanged.
* D9 Flow 3: the problem appears only at the last click.
* D10 Language 4: refusal is plain.
* D11 Feedback 2: "Checks passed." contradicts the refusal.
* D12 Visual 4 and D14 Team look 4: screenshots, no new element.
* D13 Accessibility: not checked; no new control.
* D15 Speed: not measured.
* D16 Testability 3: both rules fail when removed; Minor 1 and 2 remain.
* D17: simulated only.
* D18 Provenance 3: the person is kept, the quoted source is lost after a merge (Minor 6).
* D19 Closure 3: same as D2.
* D20: simulated only.

## Journey score: 6.5/10, from the desk, not a walk
On instruction I walked nothing, so this reads the screenshots, the code and the builder's scripted 7/7. Treat it as provisional. **Below the pass of 8.**

Journeys read: second person approves a merge; a document's panel afterwards; refused merge; change, merge, then withdraw.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | `b112-2`: panel keeps the spouse |
| Next step obvious | ½ | Told only after clicking Approve |
| Plain words | 1 | Refusal text in `b112-3` |
| Feedback and state | ½ | "Checks passed." beside the refusal |
| Correct data | ½ | Major 2 |
| Error recovery | ½ | Retry works, but the suggested route is unsafe |
| Accessibility and sizes | ½ | Not measured; 1440 px only |
| Speed | ½ | Not measured |
| Visual quality | 1 | Screenshots, team look |
| Trust and sources | ½ | Quoted source lost after a merge |

Fixes that raise it, most valuable first: Major 1, then Major 2.

## Not done
* Ran no app, browser, suite, keyboard, 1024 px or 200 % zoom pass, and no break-it pass.
* No separate journey-test report: on instruction I write only this file.
* `graph.mjs` not run, to stay within that one-file limit and today's token limit.
* Not read: the panel's words while a change is open, beyond the PR's statement. Not measured: whether a real test run reproduces Major 2.

**Verdict: Block** (changes needed). Fix: **Major 1** (rule into the check, so the card and the proposal say it), **Major 2** (no silent wrong person through change, merge, withdraw).

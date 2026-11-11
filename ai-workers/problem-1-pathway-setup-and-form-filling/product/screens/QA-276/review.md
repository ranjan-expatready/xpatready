# Review: QA-276 (C5.1, C4.11), Bake row 7 "Release goes through": a moved question releases

Reviewer: independent agent, did not build it, 11 Nov. PR #1531, head **`db2bf9cfe1e972c768d1c6bc39006634a4362a8e`**, branched from origin/main `fbfb263c7` (no newer main commit in the diff). US$0, live AI off, copy `rev_qa276` on :4458 only, one at a time, stopped each time; never :4400. No code edited.

**In short: Changes needed.** 0 Blocker, **1 Major**, 4 Minor. Journey score **8.5/10** (`journey-test-reviewer-2026-11-11.md`). The bug is fixed and the fingerprint check stands; but the new publish rule also publishes a shared question's draft that no reviewer saw, when a question leaves the draft for another reason (Major 1). The fix is one filter plus a fail test.

## Runs on this head
| What | Result |
|---|---|
| `tests/check_forms_qa276_section_move.ts` | **20/20**, 64 s |
| qa's `tests/qa/check_qa276_section_move.ts` | **13/13** |
| B114's `check_forms_b114_condition_other_combination.ts` | **64/64** |
| `product/tools/typecheck.mjs` | no new type errors (api 15 known, web 0) |
| `graph.mjs` (no `--write`) | G1, G2, G4, G5 = 0; both QA-276 checks name C4.11 and C5.1 |
| Builder's "13/20 on main" | **not re-run** (no code edits allowed); consistent with qa's row (11/13 on main) and with my reading |
| Browser walk (Playwright, headless) | journey 1 below: Released version 2, axe 0, keyboard release, 0 console errors |
| PR state | draft; every CI job skipped at this head, so no CI evidence yet |

## The five questions
1. **Diagnosis: right.** `engine/snapshot.ts:216` places a lineage only if its effective row's section is chosen or its fact is used; the moved DRAFT row is neither, so the draft leaves it out, `publishRow` published only the draft's lineages, the old PUBLISHED row (in a chosen section) kept it in the published copy, and `studio.ts:1233` refused every press. **Publishing the move is the right fix** over refusing or warning at Submit: a refusal would leave no way to release a move out of the only chosen section except undoing it or choosing the section, while the reviewer does see the removal ("Field removed", "Question placement removed", `3-submitted-1440.jpg`). It matches how shared placements already publish: a release publishes the shared rows it changes, which alters other combinations' published view but never their frozen releases (walked: a move into Visitor visa's section, Visitor visa 0 releases before and after, its published view now places the question). Cases read frozen releases only.
2. **Can it publish something unreviewed? Yes, in one way: Major 1.** `movedOut` takes *every* lineage the published copy places and the draft does not, not only moves. A question dropped because a form or rule stopped reading it, whose words have an unrelated draft edit, has that edit published. A change waiting for a second person is not published: condition and who-fills changes write their draft only at approval (`question-condition.ts:79`, `who-fills.ts:107`), and an approved one is marked released with it, as for placed lineages. Other combinations: as answer 1.
3. **Fingerprint check: still refuses.** Unchanged in the diff (`studio.ts:1230-1233`); the trigger case gives 409 in the same words, 0 new releases, the move back still a draft (ran). The trigger edits an in-snapshot question in place, not through a draft; an acceptable labelled stand-in. A concurrent edit to a moved-out question that keeps it out is not caught: Minor 2.
4. **BR-14: correct for the mover.** Ran: release 2's `author_id` is `user-A`, the person who moved it; with the old author set it would be empty (read: the placement audit line has no combination and the lineage is in no key list). The Release page (`programs.ts:445`) gets the same set, so its "You changed it" line agrees with the server. Cost: one extra published `buildSnapshot` per call, 16–17 ms on the six; releases 335–416 ms by API, 809 ms on screen, far inside `RELEASE_TX` 30 s. Minor 3 for the Release page.
5. **Tests: good on the bug, two gaps.** The new check reproduces the row, fails on main (builder: 13/20), covers recovery and the concurrent edit. It does not cover Major 1, and no line fails if the author widening is removed (Minor 1).

## Issues
**Major 1, Must (new in this PR, data integrity).** `api/src/studio.ts:1265-1268` with `:1217`. A release publishes the draft of any shared question its draft stopped placing, not only one it moved out of a chosen section.
* **Ran** (scratch script, isolated copy): Sample field placed in "applicant" (not chosen by Study permit), read only by a Study permit rule; released. Then its question words edited ("EDITED words nobody reviewed?") and the rule retired. The reviewer is shown only Field / Question placement / Rule "removed". Approve and release: 201, rows `1:SUPERSEDED:Original words? | 2:PUBLISHED:EDITED words nobody reviewed?`. On main the edit stays a draft and the release still succeeds (read: once the rule's retirement is published, the published copy no longer places it).
* Why Major, my judgement (the tech lead may re-rank): it breaks the release's own invariant, "what is now published must be exactly the frozen, reviewed snapshot" (`studio.ts:1230`), and the B114 rule that a release publishes only what its snapshot carries, with ordinary screen steps and no race. The library then shows the edit as released, it leaves the draft counts, and its editor becomes an author of an unrelated combination (BR-14). Mitigation: no case sees it until a combination that carries the question releases, and that release's diff shows it.
* Fix: keep only lineages whose **published placement sits in a section this combination chose**, e.g. `const chosen = new Set(pub.snapshot.sections.map((s) => s.id)); … .filter((p) => !placed.has(p.lineage) && chosen.has(p.section_id))`. Only those stay placed by their old row; a question dropped by a form or rule falls out once those lines publish. Fail test: the steps above, expecting 201 and the newest row still `DRAFT`.

**Minor 1, Should.** `tests/check_forms_qa276_section_move.ts`: the BR-14 widening (`studio.ts:1013-1016`, 1028) has no test that fails if removed (read). Add: release 2's `author_id` is `user-A`.

**Minor 2, Should list in the PR (inherent to publishing a row the snapshot does not carry).** An edit to a moved-out question saved after Submit (or during the release) is published by this release without appearing in its diff: neither the submitted fingerprint nor the post-publish check covers a question the draft no longer places. Its author is counted (BR-14). Related, pre-existing: `applyFills` records the approver as the draft's author (`who-fills.ts:107`), so an approved who-fills change on a moved-out question now makes the approver an author of this combination too.

**Minor 3, Should.** `api/src/programs.ts:445`: the Release page calls `draftAuthors` per changed row, and each call now builds one more full published snapshot (≈17 ms on the six; page 71 ms warm with 2 rows). Fine at sample scale (§9); batch with `buildSnapshots` if rows grow.

**Minor 4, Should (pre-existing words).** The approver sees "removed" twice; nothing says the release moves a shared question to another section for every combination that chooses it, and the placement row shows the raw key (`3-submitted-1440.jpg`).

## Dimensions (1–5; no screen code changed)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | Row 7: 201 after the move (ran); Major 1 |
| D2 Data integrity | 3 | Move published exactly, one release; Major 1 publishes an unreviewed edit |
| D3 Reuse | 5 | One shared row per question, unchanged |
| D4 Rule integrity | 5 | B114 64/64; fingerprint check intact |
| D5 Stability and recovery | 5 | Concurrent edit 409 and rolled back; move back releases; reload holds |
| D6 Governance | 4 | Release names the mover; Major 1 marks an unreviewed edit released |
| D7 AI trust | 5 | No AI path touched |
| D8 Orientation | 5 | Full path and tabs on Review and release |
| D9 Flow | 4 | Submit, sign, release work; Minor 4 |
| D10 Language | 4 | The false "changed while it was being released" is gone; Minor 4 |
| D11 Feedback | 5 | "Released version 2", draft matches the release |
| D12 Visual | 5 | Unchanged |
| D13 Accessibility | 5 | axe 0 at 1024 and 1440; no sideways scroll at 720–1440; keyboard release |
| D14 Team look | 5 | Unchanged |
| D15 Speed | 5 | 809 ms on screen; Minor 3 |
| D16 Testability | 3 | Bug line fails on main; Major 1 and the author widening untested |
| D17 First-use | simulated only | No intended user walked it |
| D18 Provenance | 5 | Demo release and Sample labels; author / submitter / approver |
| D19 Capability closure | 5 | Move, submit, sign, release on screens |
| D20 Pain solved | simulated only | Founder's walk |

**BIC-01–BIC-20:** N/A (Studio-side fix, no case-side screen). **Concept and retrofit:** no `concept.md` (fix row); judged against QA-276, the B114 review's Minor 1, C5.1 and STANDARDS; retrofit mapping does not apply. **[M] lines:** only §9 and accessibility bear on this diff, both met. **Scaffolding (P-33):** setup by route and one labelled SQL insert; the move and release use the product's own screens.

## What I could not check
Main's 13/20 (no code edits); a real screen reader; a headed browser; an intended user's walk; the full suite set; CI (skipped on the draft); interaction with the QA-237/239 `engine/snapshot.ts` change in flight (this PR only calls `buildSnapshot`).

**Verdict: Changes needed** for `db2bf9cfe1e972c768d1c6bc39006634a4362a8e`. Blockers: none. Majors: Major 1 (publish only moves out of a chosen section, with a fail test). Minors: 1–4 (fix or list in the PR).

# B154 review: author route for a library section's "Background answers" mark (P-97, P-244)

Reviewer (Opus, fresh context, did not build it). Commit reviewed: **d81e53821** (PR #1272) against origin/main. The branch later got 591b5110a, which adds only the breaker's `break-report.md`. Own copies only: rv154 on :4433 (d81e53821) and a separate worktree of d81e53821 plus #1246 merged without a commit on :4434. That merge was aborted, the worktree and its database removed, and both copies stopped. Live AI off, US$0.

**Verdict: Block** (3 Majors open). Ship after fixes.

## What I ran
- Rules suite `tests/check_b154_section_background.ts 4433`: **41/41** (own reset and checkpoint load).
- Schedule 1 pack `acceptance/C6.18-schedule1.test.ts` on d81e53821 + #1246 (B140), fresh checkpoint: **16/16**. (My first run went 9/16 only because my copy's `STUDIO_VAR` sat outside the solution folder, so IMM 5645's saved AI run was not found. My setup, not the PR.)
- Break probes through the API, a headless Playwright walk at 1440 / 1024 / 400 / 720 px (author, then approver) with axe WCAG 2.2 A/AA, and the graph (`graph.mjs`: the new route is not listed untested).
- No concept.md or build-notes for B154. Scope is the row text: the author sets the mark through the product, a second person approves, and Schedule 1's parts then behave as background answers.

## What held (evidence)
- **Second person.** Only `author` proposes (O, B, P and unknown are refused 403/401). `decideChange` refuses the proposer (403) and anyone without `review`. `afterApprove` failure puts the change back to WAITING (`screen02.ts` decideLibraryChange). The batch door takes ADD only.
- **Concurrency.** 5 parallel proposals gave one 201 and four 409. The partial unique index `library_change_one_open` plus the global P2002 → 409 handler (`main.ts:203`) cover the race.
- **Approval re-checks the mark** (`section-background.ts:121`, suite "changed meanwhile" 409). Release publishes the section draft only through a combination whose snapshot carries it (`studio.ts:1206`). After that, `releaseBackground` marks the change RELEASED (suite and pack: 3 RELEASED in the pack).
- **Rename.** A direct rename draft v3 plus an approved unmark gives one draft holding both. Review shows "no longer background answers" and the "Section name" line separately. An open mark blocks retire (`library-items.ts` pending kinds).
- **Diff.** One "Background answers" line per section, needs_sme. The `continue` fires only when the placement differs by `client_only` alone, so other placement edits still show (but see m1).
- **Other combinations.** The mark is library-wide by design. The change says "used by N" (Government positions: 3), and `sourced` lists combinations whose Comes from goes elsewhere. No hard-coded section or form in product code (P-319). Text says "Unconfirmed: expert, no counsel".
- **Screen.** axe shows no violations on the Sections page, the dialog, the dialog error state and the change page. Keyboard: focus plus Enter opens the dialog with focus in the textarea. No sideways page scroll at 1024 / 400 / 720 px. Send takes 340 ms.

## Issues (ranked)
**M1 Major (Must): a background section can hold a question "filled by the case officer"; the case then gets stuck.** `section-background.ts:77-84` (propose) and `:116-122` (applyBackground) never look at who fills the section's questions in the library: neither the newest placement's `collectedFrom` nor an open `placement_fills` change. `applyFills` (`who-fills.ts:87-93`) does not re-check the section either. Reproduced on :4434 with B140 merged:
1. Propose "Previous travel" question `person.travel_location` → filled by the case officer.
2. Propose "Previous travel" as background answers.
3. Approve both (user-C), then release Visitor visa (201).
4. On a new case the question is `background: true, collected_from: staff_working_view`. The officer's answer is `awaits_client: true`, but the client's questionnaire does not show it, and re-confirm or answer gives **403 "The officer enters this fact from a document or record."** So the answer waits for the client forever.
5. Recovery through the product is refused: who-fills now answers 409 "Always the client". The same happens if the who-fills change was released before marking. (The breaker's M4 is the same library state; this adds the runtime result.)

Fix: when marking, refuse in words, or list the questions and set them back to the client in the same draft, if a question is officer-filled or has an open who-fills change. Check again in `applyBackground`. Make `applyFills` refuse CASE_OFFICER for a question whose newest section version is client-only. Add a fail test per order.

**M2 Major (Must): approval does not re-run the P-244 declaration check or the "asks nothing" check.** `applyBackground` (`section-background.ts:116-122`) re-checks only the mark and retirement. If a declaration question is placed in the section between proposal and approval, an approved unmark goes through, which breaks "Declarations stay client-only". Same finding as the breaker's M2. Fix: share one check between propose and apply, and add a fail test that places a declaration after proposing.

**M3 Major (Must): a returned background change can be sent again through the API, with any label.** `resubmitChange` (`library-changes.ts:190-197`) refuses `form_role`, supplies, form field and rename changes, but not `section_background`. `POST /library/changes/:id/resubmit` therefore puts it back to WAITING with a new free-text `label` (the To review heading the second person reads) and the old reach counts. The UI says it "is not sent again from here" (`review-items.tsx:138`). Same finding as the breaker's M1. Fix: add `BACKGROUND_KIND` to those refusals, with a test.

**m1 Minor (Should): a raw key on Review.** When a placement changes both who fills it and its section's mark, `engine/validate.ts:264-271` adds a generic "Question placement" line labelled `person.travel_location`. Each `continue` nulls only its own field. Seen in the probe's change summary. Fix: compare with both fields nulled.

**m2 Minor (Should): focus is lost when the dialog closes.** After Escape or Cancel, focus lands on `<body>`, not the "Background answers…" button (`library.tsx:318`, dialog mounted from state). The button's meaning is only in `title`, which keyboard users cannot reach; the dialog does say it in full.

**m3 Minor (Should): the cited ruling is missing.** P-412 F11 is cited in code, but it is not in `DECISIONS.md` on main or on the branch. BACKLOG on the branch still says "held for the immigration expert … built only if the expert says". Record the ruling (Lead 31) before merge.

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | Row done for Schedule 1 (pack 16/16); P-244 guard has gaps (M2) |
| D2 Data integrity | 2 | Contradictory library state reachable (M1), resubmit label (M3); race held |
| D3 Reuse | 5 | One library flag, used by every combination; no per-combination copy |
| D4 Rule integrity | 2 | Officer-filled background answer unreachable for the client (M1) |
| D5 Stability/recovery | 3 | Apply failure goes back to WAITING; M1 state cannot be undone through who-fills |
| D6 Governance | 4 | Reason, proposer, approver, audit lines, released-in pack; P-412 not recorded (m3) |
| D7 AI trust | N/A | No AI |
| D8 Orientation | 4 | Breadcrumb "To review › Previous travel · background answers…"; row links to the change |
| D9 Flow | 4 | Waiting → Approved "from the next release" → pill; one next action each |
| D10 Language | 4 | Plain words throughout; one raw key on Review (m1) |
| D11 Feedback/state | 5 | Waiting / Returned / Approved said on the row; error inline with role=alert |
| D12 Visual quality | 4 | Team components; walk screenshots 01–08 |
| D13 Accessibility | 4 | axe clean in 4 states, keyboard opens it; focus return (m2) |
| D14 Team look | 4 | Same Dialog/Button/Pill as Rename and Retire |
| D15 Speed | 5 | Send 340 ms; Sections list one request (`openBackgroundChanges` once) |
| D16 Testability | 4 | Pass and fail per rule; no test for M1 to M3 orders |
| D17 / D20 | simulated only | No intended user walked it |
| D18 Provenance | 4 | Reason, proposer and "Unconfirmed: expert, no counsel" on the change page |
| D19 Closure | 4 | Author → second person → release → case behaviour, with B140 merged |

## BIC-01–BIC-20
N/A: a configuration screen whose row does not choose the §6 scorecard (EXPERIENCE §6 scope). The case-side behaviour belongs to B140.

## Journey score
**8/10, pass** (`journey-test-reviewer-2026-11-07.md`). Halves: plain words (m1), correct data (M1), error recovery (M1), accessibility (m2).

## Could not check
A real screen reader; a true 200 % browser zoom (approximated by a 720 px viewport); an intended user's unaided walk (D17/D20, the founder's).

**Verdict: Block.** Fix M1, M2 and M3, each with a fail test, then a diff-only re-review.

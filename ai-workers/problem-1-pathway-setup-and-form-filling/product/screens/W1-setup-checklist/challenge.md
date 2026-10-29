# W1 setup checklist (P-157): challenge of the concept draft

Fresh agent for the Lead, 29 Oct. Read: `concept-draft.md`, `design/draft-setup-checklist.html`, DECISIONS P-157, P-156, P-130, P-118, P-50 (and P-155, P-79 for roles), `W1-journey-review/review-2026-10-29.md`, `W1-shared-library/research-ai-layering.md` (M1), and the code: `engine/programs.ts` (`setupActionOf`, `missingItems`, `nextActionOf`, `waitsForPerson`), `engine/structure.ts` (`setupProgress`, `progressFollows`), `api/src/programs.ts` (`rows()`, `summary()`), `api/src/core.ts` (ACTORS), `engine/coverage.ts`, `prisma/schema.prisma`. Looked at :4400 with GET only (`/api/catalogue`). No paid AI, nothing committed.

## Verdict
**Build after these changes.** The core idea is right and overdue: one pure function replacing five that disagree, steps named after parts of the setup rather than kinds of action, one button with a fixed place. But step 1 is built on a record that does not exist yet, the "who must act" rule is not defined for the three real roles, and the Live/Not ready/Retired states are only half covered. Fix those five Majors before the founder sees it.

## Objections

### Major

**M1. Step 1 depends on data that does not exist, and turns every existing card back to "Step 1".** *Needed for the proof.* Confidence: high (fact).
- Facts: no official-pages record exists anywhere in the app (no `officialPage`/`applyPage`/`checklistPage` in schema, API or engine). It is research item M1 (P-156 (2)), owned by the forms lane, not built. Step 3's "Review n form picks" (P-156 (3)) and "Upload n forms" after a failed download (P-156 (4)) are not built either.
- What breaks: with "done when = confirmed record exists", the Live LMIA High-wage and Visitor visa cards become "Next: confirm the checklist page" on day one. The board's card E ("All 6 done") and the BR-6 test "a Live card never shows Step 1" both contradict the step 1 rule.
- "A later rules proposal that differs reopens it": nothing says when rules run again (P-156 says no run-time page pick). That is an undefined trigger.
- Fix: (a) make the pages record a build precondition: the forms lane lands it first, and the checklist slice waits for it, or ships behind it in the same merge. (b) Backfill: for every existing combination, rules propose its pages from what is already attached (finder results, manifest), stored as *proposed*. A Live combination with proposed-but-unconfirmed pages shows step 1 as an open item "Confirm the checklist page" without taking away the Live chip (same pattern as a held edition). (c) Drop "a later rules proposal reopens it" until there is an index refresh that produces such a proposal (*Not built*). (d) Tag "Review n form picks" and "Upload n forms" as depending on P-156 (3)(4); until then step 3 keeps today's "Find forms" / "Map n forms".

**M2. The one-button rule is not defined per role, and the roles in the concept are not the app's roles.** *Needed.* Confidence: high (fact) / medium (fix).
- Facts: the app has three configuration people (`api/src/core.ts` ACTORS): Configuration author (duties author, review), Content reviewer with the Immigration SME duty (review, sme), Approver (review, approve). **All three hold "review".** There is no read-only "viewer" persona (none needed; do not add one).
- What breaks: BR-3 says filled when "proposals to review, pages or people to confirm" but not *for whom*. Either all three see the same filled buttons (then "2 need you" is the same for everyone and means nothing), or the choice is made ad hoc in the UI. AGENTS rule 4 says immigration values come from the immigration expert; which IRCC checklist page belongs to a combination is exactly such a value, yet BR-3 gives "Confirm the checklist page" to the author.
- Fix: add one table to the concept: **open item → duty that acts** (pages: sme; people: author proposes / sme confirms, or author, founder to say; form picks, documents, questions proposals: author; Submit: author; Review and sign: sme; Release: approve and not an author of the changes). Filled iff the viewer holds that duty and the second-person rule allows it; otherwise outline with "Waiting for the immigration expert …". The server refuses with 403 on the same table (BR-9). Test each of the three personas on every board state.

**M3. Live is handled; Not ready, Retired and "Just added" are not.** *Needed.* Confidence: high (fact).
- Facts: today's status reads the **release** (`statusOf(released, missingItems(relSnap…))`: In setup · Not ready · Live), and the checklist reads the **draft** (`basis: "draft"`). The concept never mentions Not ready, Retired or Just added.
- What breaks: a released combination whose release fails its own check (for example a library field it reads was retired) is Not ready, so firms cannot open cases. Yet its draft checklist can be all ✓, so the card shows outline "Open", the worst possible signal. A retired combination would show a bar and a button.
- Fix: the chip still comes from the release. **Not ready** adds the release's problems as open items on their steps (filled, with "Firms cannot open cases until this is fixed"), and they come before any draft item. **Retired**: no bar and no Next line, outline "Open". **Just added** stays a note. Also, "Step 3 of 6 · Forms" next to "4 done" (board card F) reads as a contradiction once steps can reopen: say "4 of 6 done · Next: Forms".

**M4. "One counts object" names the cure but not the cause of 6 vs 8.** *Needed.* Confidence: medium-high (code read, not run).
- Facts: the card's `forms` merges draft snapshot lines **plus attached source forms not yet in the snapshot** (`api/src/programs.ts` rows()); `summary()` counts `combinationForm` lines from a separate query. Questions are `rowCounts` on the card and a different walk on Preview. Two definitions mean two numbers, whichever function owns them.
- Fix: in §6, write each count's definition once (forms = current draft form lines, excluding retired and superseded; source files not yet set up are an open item of step 3, not a form). Same for people (applicant roles that file), questions (BR-10 rule), documents. Make `summary()` and Forms/Questionnaires/Preview headers read `setup.counts`. The BR-1 contract test should compare all four surfaces on all six sample combinations, not only LMIA.

**M5. Cheap per card, but the whole catalogue is recomputed on every edit; the scale test is too small.** *Needed.* Confidence: medium (judgment from code; timing seen only warm: `timing_ms.rows` 72 on ~20 combinations).
- Facts: `rows()` caches per workspace and any audit event clears it. Each rebuild validates every combination twice (draft and release, including the coverage render), `await`s `structureProblems(c.id)` one combination at a time, and diffs each snapshot. The new rules add proposal counts by kind, the pages record, document-type approval and exactly-one-source.
- Judgment: each "done when" is a count over data already loaded, which is cheap. The cost is the N rebuilds and serial queries, and the per-viewer `needsYou` (the cache is viewer-free today).
- Fix: compute the steps viewer-free and cache them per combination keyed by its draft sha256 plus release id, so one edit rebuilds one combination. Apply the viewer's duties as an overlay after the cache. Batch the new reads (one `groupBy` combination × proposal kind, one `findMany` for pages; batch `structureProblems`). Test at **150 combinations cold < 1.5 s and warm < 200 ms**, not "50 cards < 1 s".

### Minor

**m1. BR-7's "not on Forms → step 5" misfiles errors.** Validator `where` values in code: Forms, Questions, Questionnaires, Documents, Rules, Checks, Derived fields, Library, Row. Under the draft, Documents errors land on Questions, and Library errors (fixed in Shared library, not in the combination) land on step 5. Fix: an explicit where → step table (Documents → 4; Questions, Questionnaires, Rules, Checks, Derived fields → 5; Library → step 5 with a link to the library row; Row → 6) and a test that every `where` in code has a row. *Needed.*

**m2. Step 5 "exactly one source" needs W1-15 slice 2, which is not merged.** Today `engine/coverage.ts` checks *at least one* source (asked, or filled by the case officer). Fix: step 5 uses today's coverage gaps until "Comes from" (P-130) lands, and the concept says so. *Needed.*

**m3. "Start setup" does nothing defined after P-156.** Card A says "Next: confirm IRCC's apply page…" but the button is "Start setup", and nothing says what it now does (P-123's finder run is amended by P-156). Fix: one line saying Start setup creates the combination and runs the rules proposal for its pages (US$0, no AI), then lands on step 1. *Needed.*

**m4. Precedence of ◐ / ⧗ against ● is not stated.** For example, AI is running on step 4 while step 2 has a people proposal waiting. Fix: the button is always the first open step's item; ◐ marks only its own segment; "View AI progress" is the button only when the running step *is* the first open step. Test it. *Needed.*

**m5. Step 4 "a document line per applicant role" may be too strict.** It may not hold for a role that is listed but files nothing personally (low confidence; check with skill immigration-structure, TAXONOMY §4). Fix: "per role that files", with an expert-marked "no documents for this role" as a valid done. *Needed* (small).

**m6. Q3 (tab order) is not a founder question.** P-130 already decided documents first, so the order follows from it and the Lead can apply it. The free slot should go to M2's open point (below).

## Is there a simpler design?
Yes, for steps 4 and 5. One W1-15 run feeds both, W1-15 merges them into one "Questions and documents" tab, and P-130 orders them inside it. As two steps they produce in-between states that teach nothing ("Documents ✓, Questions ●" a minute after one run). **Five steps:** Official pages · Who can be in this application · Forms · Questions and documents · Review and release. This keeps every rule, removes one segment and the Q3 tab question, and matches W1-15. I would not merge steps 1 and 2: they are confirmed by different people (M2) and step 1 lands later (M1). The rest of the design is already as simple as it should be. Do not add owners, due dates, manual ticks or bulk actions (the draft rightly marks them Not built).

## What is sound
- Steps derived on every read, nothing stored. This removes the `progressFollows` patch, which only exists because `setupProgress` and `nextActionOf` disagree (code comment "Review m1").
- Steps are parts of the setup, not kinds of action. The review's action list leaves out pages and people, and "Review AI proposals" spans four steps. The draft's §7 GAP reasoning is correct.
- Reopening a single step (a new edition reopens Forms while Documents stays done) is honest and matches P-32 / P-116.
- Click → tab + `?focus=` + 2 s outline with no pop-up follows P-50. Overview stays report-only and links out (P-118 Q5).
- The capability/scaffolding and Needed/Not built tags are complete. Time estimates are correctly left out.

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Step 1 pages | new `CombinationOfficialPages` (forms lane, M1) + backfill as proposed | in `rows()` batch; confirm endpoint (forms lane) | done = confirmed; Live keeps chip | Live + proposed pages → open item, chip Live |
| Step 2 people | `combination.participants`, `participantsBy` (exist) + people proposals | existing | done = applicant role saved by a person, no proposal | proposal waiting → "Review n people proposals" |
| Step 3 forms | snapshot forms, field maps, intake HELD (exist); form picks (P-156 (3), not built) | `rows()` | as draft, minus picks until built | held edition reopens 3 only |
| Steps 4–5 | document_requirements, placements, AI proposal kinds (schema line ~941) | one `groupBy` per kind | m1 where→step table; m2 coverage | every `where` mapped |
| Step 6 | releases, `releaseGates` (exist) | existing | M3 Not ready first | Not ready + draft ✓ → filled fix |
| Viewer overlay | ACTORS duties | `x-actor` on catalogue and summary | M2 duty table, 403 | 3 personas × 6 states |
| Counts | — | `setup.counts` read by summary and tabs | M4 definitions | 4 surfaces × 6 combinations equal |
| Scale | per-combination cache by sha | — | M5 | 150 combinations cold/warm |

## Questions for the founder (≤3, recommendation first)
1. **The steps:** Official pages → Who can be in this application → Forms → Questions and documents → Review and release (**Recommended:** five parts of the setup, documents first inside step 4 per P-130; one AI run moves one step). Or six steps with documents and questions apart, as in the draft. Or the review's action steps.
2. **Who confirms a combination's official pages (and who can be in it):** the immigration expert confirms and the author proposes (**Recommended:** it is an immigration value, AGENTS rule 4). Or the configuration author confirms alone.
3. **Where steps 1 and 2 are done:** at the top of Forms, "Before forms: official pages · who can be in this application" (**Recommended**, as the draft: keeps Overview report-only). Or on Overview (amends P-118 Q5). Or a new "Setup" tab.

## Lead response

## Agreement

## Build discoveries

---

## Fresh challenge, 29 Oct evening (screens lane, against concept-draft v2)

Fresh screens session, skill screen-challenge, top five points. Read: `concept-draft.md` v2, `design/draft-setup-checklist.html` (now five steps), the challenge above (M1–M5, m1–m6 are not repeated), DECISIONS **P-161** (board answers, after v2 was written), P-174, P-157, P-156, P-158, and on main `0aeb22d7`: `contracts/proposal-item.ts`, `api/src/core.ts` ACTORS, `api/src/programs.ts` `rows()`, `engine/programs.ts`, `engine/structure.ts`, the `where:` values in `engine/`, `web/src/pages/workspace/`, `lanes/forms.md`, `lanes/runtime.md`, `qa/CAPABILITIES.md`. No app run, no AI, US$0.

### Verdict
**Build after these changes, and in slices.** v2 took the first challenge well and P-161 has since answered Q1 and Q2 exactly as recommended. Two things are now out of date (the duty table against P-161 (3), step 4 against P-174 and contract v2), and two are about delivery (step 1's record is not scheduled before this slice; half the screen is in runtime's files). The concept needs a v3 from the Lead before the founder's early look; the plan (`plan.md`) slices it so the engine can start without waiting.

### Objections

**F1 (Major). §4's duty table contradicts P-161 (3), and P-161 (3) does not fit step 1 as written.** *Needed for the proof.* Fact, high.
- §4 (and the board's "Waiting for the immigration expert to confirm …") gives the expert both confirmations. P-161 (3), decided after v2: **the configuration author confirms** official pages and people when both AI rounds agree with quotes (High); disagreement, low confidence or an unusual rule goes to the expert.
- Contract v2 already carries what the rule needs: `agreement` (`agreed · differ · one_round · rules_only`) and `confidence` (`ready · check · decide`; there is no "High"). People come from two AI rounds (`api/src/people-ai.ts`: "only lines both rounds agree on"), so the rule applies directly. **Official pages are rules-only by P-156 (2)** ("rules propose … no AI picks a page"): "both AI rounds agree" can never hold, so read literally every page goes to the expert, which is not what P-161 meant.
- "An unusual rule" has no definition anywhere.
- Fix: §4 reads the item, not a fixed role. Author acts when `agreement = agreed` and `confidence = ready`, **or** (pages only) `agreement = rules_only` with exactly one match on the index ("rules sure", the concept's own §3 case); everything else (differ, one_round, check, decide, "Choose the checklist page", "Suggest with AI" taken) → expert. "Unusual" = a rules flag on the item (proposed for the Lead: a role or `max` outside `domain/TAXONOMY.md` §4's cases), else drop the word. Who confirmed and on which tier is stored with the confirmation (`participantsBy` exists; the pages record needs `confirmedBy` + `confirmedAs: author | expert`), so `participantsConfirmedBy` (runtime) is **not** needed. Board: card states with "Waiting for the immigration expert to confirm …" become author-filled unless the item is low.

**F2 (Major). Step 1's record is still not on main and not scheduled ahead of this slice.** *Needed.* Fact, high.
- No `officialPage`/`applyPage`/`checklistPage` anywhere in schema, API, engine or web (grep on `0aeb22d7`: 0 hits). In `lanes/forms.md` it is queue item (2) (P-156), after (1) slice 1 channels; not started.
- v2 §2 makes it a precondition ("this slice waits for it or merges with it"). Waiting blocks the whole checklist behind forms' channels; merging with it puts two lanes in one PR, which the RETRO line of 29 Oct (shared contract changes merge with their dependent lanes' fixes) allows only for contracts.
- Fix (in `plan.md`): slice A builds the engine, contract, counts and cache with step 1 reading the record through one reader that the forms lane fills; the visible card, Overview and buttons switch in slice B once the record is on main. Lead ask to forms: land the pages record first in its item (2) (table, back-fill as proposed, confirm endpoint carrying F1's tier), before the AI pick of P-156 (3).

**F3 (Major). Half of the screen is in runtime's files.** *Needed.* Fact, high (file owners), judgment on the split.
- The "Before forms" block, the people card move, the tab badges and `?focus=` landing live in `web/src/pages/workspace/forms.tsx`, `questionnaires.tsx` (and the Documents tab in runtime PR #94). The Lead's note says combination tabs are runtime's. Runtime's own M2 queue (PQR, who fills, preview, Load sample) edits the same files now.
- The people card is in **two** places on main today: `workspace/questionnaires.tsx` and `workspace/overview.tsx`. P-161 (2) wants one, on Forms; the Overview copy must also go (Overview reports only, P-118).
- Fix: screens owns `engine/setup-checklist.ts`, the API, the Programs card, the Overview strip, and two small shared pieces (`useFocusItem(focus)`: scroll, focus, 2 s outline, the "done since you opened it" line; `StepBadge`). Runtime wires them into its tabs and moves the people card in its own slice, or the Lead hands `forms.tsx` to screens for one slice. Lead decides; either way, written in both lane files before slice B.

**F4 (Major). Step 4 was written before P-174 and contract v2.** *Needed.* Fact, high.
- v2 step 4b: "every applicant role has questions … no question proposal waiting". P-174: what a client is asked comes from the forms and rules; there is no `question` kind in `PROPOSAL_KINDS` (field, answer_list, section, document_type, form_check, person_role, condition, requirement_line, cross_check, comes_from, pqr_pick). "Has questions" is then automatic once forms are mapped, and says nothing.
- v2's open items ("Review n people / document / question proposals", opening "that tab") also predate the one review queue (S6 slice 1b, `proposals.tsx`, P-149): proposals are decided there.
- Fix: 4b done when no fact a form or rule reads is asked of nobody (`engine/sources.ts` gaps), no waiting proposal of the 4b kinds, no problem located there. Add a **kind → step** table beside the `where` → step table, with the same "every value has a row" test: person_role → 2 · form_check, field, answer_list → 3 (field-map and library items are decided on the forms' page, 1b rule) · document_type, requirement_line → 4a · section, condition, comes_from, cross_check, pqr_pick → 4b. "Review n … proposals" opens the review queue filtered to this combination and step, not a tab.

**F5 (Minor). Capability rows already claim it.** *Needed (bookkeeping, Lead's file).* Fact, high.
- `qa/CAPABILITIES.md` C11.10 is **Works** (f7cb40d9) with "one derived setup checklist drives the bar, one button … (P-157, P-161)" appended; none of that is built. C11.16 still says Start setup offers "Find forms with AI", which v2 §3 (no AI before steps 1–2, P-156) replaces.
- Fix: the Lead splits C11.10 (today's bar: Works; the P-157/P-161 checklist: Not built) and rewords C11.16 when slice B lands. Also small: §5's `Row` has no literal in `engine/` (the eight `where` values are Checks, Derived fields, Documents, Forms, Library, Questionnaires, Questions, Rules); keep "any other → 5" as the fallback, the test enumerates the eight. §7's "library change counter" does not exist; the cache key is built from what `rows()` already reads (audit events, jobs, proposals, intake), per combination.

### What is sound
Five steps, documents first, "n of 5 done · Next", the derived-not-stored rule, Not ready before draft items, the precedence of ◐, the four surfaces reading one counts object, per-combination cache with the viewer overlay after it, and the 150-combination timing test: all stand, and P-161 (1)(2) confirmed the first two.

### Questions for the founder (≤3; for the Lead to route)
1. **Who confirms an official page proposed by rules alone:** the author when the rules found exactly one match, the expert otherwise (**Recommended:** the closest reading of P-161 (3) for a rules-only item) · or always the expert.
2. **"An unusual rule":** a role or count outside the documented cases is flagged and goes to the expert (**Recommended**) · or drop the word.

### Lead response

### Agreement

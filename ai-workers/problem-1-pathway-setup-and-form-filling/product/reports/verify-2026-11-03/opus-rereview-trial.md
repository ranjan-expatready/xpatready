# Opus re-review of the PRs merged during the Sonnet reviewer trial (3 Nov)

**Asked by:** the tech lead (Lead 3 · 3 Nov), on the founder's quality-first decision on models (P-303). The decision text is the Lead's; its row is not on main yet.
**Window:** P-278's reviewer pilot, from 2 Nov 16:35 UTC to 3 Nov about 10:30 UTC. By their titles, 49 of the PRs merged in that window are product PRs, counting #693, which merged at 10:32 UTC with a Sonnet review. The brief's count of 58 also includes some records PRs. Lead, records, notes and qa records PRs are left out.
**Scope (the brief):** every product PR in the window that touches one of these:
* AI: prompts, rounds, the checker, field maps or bulk accept (C3.2, C3.4, C4.7, C4.11, C11.7, C11.8, C11.13, C11.14, C11.15);
* money or the paid-run ledger;
* the schema or a migration;
* permissions;
* release or signing gates (C5.4, C5.5, C8.1).

That is **30 PRs**. The other 19 product PRs only change screens, words, tests or tooling and were not re-reviewed (they are listed at the end).

**How:**
* Five Opus reviewers worked in fresh contexts, never on "sonnet", each on one group of PRs. This builder session coordinated them, also on Opus.
* For each PR the reviewer read the body, the diff and the founder decisions it cites, word for word, against `.claude/skills/screen-review/SKILL.md`. It then checked the same code on today's main.
* Pure engine functions were run on scratch copies (no database, no AI). Suites that need a database were not re-run.
* This session confirmed every Major again by reading main's code itself.

**Cost:** US$0: live AI off, no paid run, no code changed.
**Main:** reviewed on 762dbae6. Every file and line below was rechecked on bbe60d7b, the main this PR starts from: none of the cited files changed in between.

## Verdict in one line

| | |
|---|---|
| **Would an Opus reviewer have refused any of them?** | **Yes, 6 of 30**: #566, #585, #636, #640, #647, #568. That is 8 Majors in all, all still on main and none logged before this. **No Blocker or Critical.** |
| **Money and live AI** | **Sound everywhere.** No path in these PRs can call a paid model without the live switch. Every field-map live call refuses at `Sources.launchOnce` (`api/src/sources.ts:473`), and the masters and Redo paths refuse first. No paid run lacks its Go or its ledger line. |
| **Schema and migrations** | **Sound.** #556, #569 and #617 only add tables, match `schema.prisma` and have their roll-back written. |
| **Permissions** | **Sound.** No author approves their own change, and every write route has its duty check. One wording point: "Details (for admins)" is not a restriction (Minor). |
| **Release gates** | **2 Majors on #568.** Both concern what "outside the demo workspace" means. They were sent to the tech lead at about 10:35 UTC for a fix builder. |

## Table: PR → verdict → defects

Paths are relative to `ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/`. Severity follows `qa/BUGS.md`: Blocker = data at risk or the proof cannot run; Critical = a capability gives a wrong result; Major = a real gap or a misleading message.

| PR | Capability · what it did | Verdict | Defects (severity · where on main · logged) |
|---|---|---|---|
| #556 | C11.13 G-CORE B1: change_set migration, rules check R1–R8 | Sound | none. The near rule being too narrow is already **QA-159** |
| #602 | C11.13/C11.14 G-CORE B2: rename and merge through the change-set door | Sound | none. One approval race was noted but not reproduced, so it is not counted |
| #626 | C11.14 QA-176: nothing is Ready without both rounds and the rules | Sound | none. `tests/check_p121_rating.ts` 16/16 |
| #636 | C11.14 G-CORE B4: the field-map blind checker round | **Defect found** | **Major** · `api/src/sources.ts:624` and `:633` · new **QA-191**. Minor · `sources.ts:618` (the checker's own conversion is dropped, so a false "read it differently" can appear; it always errs toward caution) |
| #640 | C11.13: a near duplicate's reason shown at release | **Defect found** | **Major** · `api/src/proposals.ts:515-581`, and the PR's own test `tests/check_c1113_near_release.ts:43-48` · new **QA-192** |
| #647 | C11.14 G-CORE B5: Ready field-map items ticked in bulk | **Defect found** | **Major** · `api/src/sources.ts:856` · new **QA-193**. Minor · `proposals.ts:537-540` (one failure stops the whole batch and only the first failure is named; P-121 says failures stay queued with their reason) |
| #673 | C11.14: replay checker rounds recorded as completed_with_unresolved | Sound | none |
| #693 | C11.14: a live round recorded completed_with_unresolved is used, not paid for and refused (money path) | Sound | none. Re-reviewed in this session: `isFinishedRun` (`engine/rounds.ts`) accepts only the two plain-text statuses p2 writes, and every refusal path and its counted cost in `api/src/rounds.ts` `StepRunner.launch` is unchanged. Its listed m3 (a run's `cost_usd` is not validated) is as before, a candidate ledger follow-up |
| #563 | C11.7 QA-163: a form listed without a field map is drafted (Saved) | Sound | Minor · `api/src/demo.ts:434`: checkpoint row 12 still says IMM 5257 has no saved map. Already logged by the qa lane as **QA-189** (open PR #720). Doubled proposals on a second replay is the existing **QA-175** |
| #565 | C11.15: Redo with AI per stage | Sound | none. Note: the PR's question about P-123 (read and match run one pass) has no recorded answer on main |
| #570 | C11.8: field-map AI follows the one door rule | Sound | Minor · `api/src/ai.ts:367-374`: `POST /ai/overrides` has no door, so on a copy without the switch a Continue is still recorded (ledger and audit line) for a start that will always be refused. Nothing is spent. **QA-154** is fixed by this PR, but its row is still Open; open PR #716 adds the last tests |
| #576 | C11.7 / R-146: unique data paths in unnamed XFA subforms | Sound | none. The reader was checked on synthetic templates; the other 18 inventories are byte-identical |
| #603 | R-146: saved field map of IMM 5532 (paid US$1.61) | Sound | none. The Go, the caps and the P-227 Saved check were all in place; 314 boxes on 314 unique paths; cost recorded |
| #566 | C4.7, C4.11 QA-162: saved picks and conditions by a tolerant match | **Defect found** | **Major** · `engine/fact-words.ts:14`, `:76-79` and `engine/pqr-picks.ts:50` · new **QA-194**. Minor · `fact-words.ts:71` (the one-word gate counts role words: "Spouse country" matches on "country" alone) |
| #585 | C3.4: AI step for a form's checks and document types (Live or Saved) | **Defect found** | **Major** · `engine/masters-ai.ts:197` · new **QA-195**. **Major** · `api/src/proposals.ts:576-577` · new **QA-196**. Minor · `masters-ai.ts:269` (the two readings "agree" even when one says block and the other advise; harmless until a lander exists). Paid-call gating is sound |
| #661 | C3.2: bulk accept only High, one Undo per batch | Sound | none. Rows are locked, the batch has one id, Undo restores exactly the batch; the pack failed 18/22 on the old code |
| #574 | C2.6: checklist lines decided on the review queue (one door) | Sound | Minor, unconfirmed (needs a database) · `proposals.ts:317-322`: two lines accepted at the same moment that share one new document type can give a raw 500. It rolls back and a retry works |
| #558 | C5.4 G1 part 1: the pure source-register engine | Sound | none. 15 quote-states-number cases were run and are all right |
| #569 | C5.4 G1: source_entry migration | Sound | none |
| #587 | C5.4 G1 PR 2a: release refused while a number has no source | Sound (latent Minor) | Minor · `engine/snapshot.ts:214`: fee numbers are not frozen into `snapshot.sources`. A fee line without its own fee-table source would read "cited" while Submit stays refused. It cannot be reached today, because every fee-table line has a full source |
| #615 | C5.4 G1 PR 2b: shared source-register contract | Sound | prefill words: already **QA-177** |
| #627 | C5.4 G1 PR 2c: Source panel entry points | Sound | none. It only changes the screen; the server keeps every rule |
| #676 | C5.4: release with its sources from the Demo menu | Sound (Minor) | Minor · `api/src/demo.ts:122-164`, `:134`. In the demo workspace one author click writes a real Release 1, recorded as approved by the Approver, who never acted. That release becomes the answer-key gate's baseline, so its maps without a key are only warnings on Release 2. This is scaffolding (P-33) in the demo workspace only |
| #568 | C5.5 G2: release refused without a passing signed answer-key test | **Defect found** | **Major** · `api/src/demo.ts:70` → `:191` → `:134` · new **QA-197**. **Major** · `engine/validate.ts:266-272` with `api/src/studio.ts:399`, `:1168` · new **QA-198** |
| #562 | S4: a case opens only on a startable release | Sound | none. Cases are created in only one place, which runs the check first; the test fails without the code |
| #617 | C8.1: migration for signed PDFs, sign steps in order, append-only scans | Sound (Minor) | Minor, not reproduced · `api/src/sign-steps.ts:47`, `:66-98`, `:122`: recording a step does not take the case lock that a channel change takes (`case-prepare.ts:350-358`). In a narrow race a step can stay current after the channel changed. The order rules, officer-only access, the upload checks and the UPDATE trigger all hold |
| #643 | UX-A 4: identifiers behind Details | Sound (Minor) | Minor · `web/src/components/details.tsx:14`: the label "Details (for admins)" suggests a restriction that does not exist (every configuration person opens it; there is no admin-only role). The new route is read-only and configuration-only |
| #637 | UX-A: Needs you goes to the review duty | Sound | the remaining count mismatch is already **QA-179** |
| #666 | C4.6: child and representative signing (preview) | Sound | none. It only builds the preview and uses the same signing rule as C8.1 |
| #553 | C8.2 slice 1: application number and UCI | Sound | none. Officer only, format checked, a stale value gets 409 and the audit keeps before and after. Unconfirmed and outside the slice: the UCI's 10-digit rule (AG-7-95 r2) and the same-UCI warning (r4) |

**Totals:**
* Blocker 0 · Critical 0 · **Major 8** (#636 1, #640 1, #647 1, #566 1, #585 2, #568 2) · Minor 12 (2 of them already logged as QA-189 and QA-179).
* The 8 Majors are QA-191 to QA-198 in `qa/BUGS.md`. QA-180 to QA-190 were taken by the open qa records PR #720, so the numbers start at 191.

## The eight Majors

Each is confirmed by reading main's code. The reviewer's probe runs are noted where they were made.

### QA-191 (#636, C11.14): field-map items are rated Ready on two shape rules; "quote found" is assumed, never checked
* **Where:** `api/src/sources.ts:624`. `quoteOf` writes `quoteFound: true` for any quote. At `:633` the only rules are `mapRules` (key shape, and the fields being on the form) on each round.
* **Scenario:** the saved draft and a recorded checker run both map a field to the same boxes, and each box's quote is any text of 2 characters or more. `p121Rating` returns Ready, and since #647 the item can be ticked in bulk. Nothing compares the quote with the form's own caption. P-121's other rules (coverage, duplicates, type and options) do not run on field-map items.
* **Breaks:** P-121, "the rules check (quote found in its source, coverage, references, duplicates, type and options) runs on both. High = rules pass and both rounds agree".
* **Not yet live:** no field map has a recorded checker run today (QA-176), so nothing is Ready this way yet. The first saved checker runs will meet it (PR #671, paid).

### QA-192 (#640, C11.13): a near duplicate is accepted and approved with no person's reason
* **Where:** `decide()` in `api/src/proposals.ts:515-581` never asks for a reason on an item with `identity.near`. `withNearReason` (`:280-283`) only appends the rule's own words. The PR's test `tests/check_c1113_near_release.ts:43-48` asserts that such an accept succeeds, and the page only warns "ask before approving" (`web/src/components/near-line.tsx:23`).
* **Scenario:** an author adds "Surname given at birth", which has the same meaning as a waiting field, and gives no reason. The door marks it near, a reviewer accepts it (200), and a second person can approve it.
* **Breaks:** P-120, "a near duplicate needs a one-line reason, shown to the second person at release"; P-149 (2), "run at proposal and again at approval; … a near one needs a reason".

### QA-193 (#647, C11.14): the second person cannot see what was bulk-accepted
* **Where:** `api/src/sources.ts:856`. When a form's draft is applied, each new field's library change is written with `batchId: null`. Nothing joins `proposal_item.batch_id` to the library changes the approver sees.
* **Scenario:** 12 Ready field-map items are ticked and accepted together, then the draft is applied. The approver sees 12 separate changes, with no mark that they were one bulk accept.
* **Breaks:** P-121, "the second person at release sees what was bulk-accepted" (applied to field-map items by P-288 (2)).
* **History:** the page's older "accept together" (C3.2) already had this gap; #647 widened it.

### QA-194 (#566, C4.7 and C4.11): the "never guesses" matcher guesses
* **Where:** `engine/fact-words.ts:14`, where the stop words include "to", and `:76-79`, where a tie goes to the key whose words are all in the pick. The rule line in `engine/pqr-picks.ts:50` then says "no other question has them all".
* **Scenario** (the reviewer ran main's `findFact` on the library's own labels):
  * "Intended stay dates" goes to `case.intended_stay_to`, never `_from`;
  * "Previous residence" goes to `person.previous_residence_to` (an end date), not the country.
  * Even "Purpose of visit", on To review today, claims no other question fits, while `case.visit_purpose_other` holds every word.
* **Reach:** the same matcher picks the questions for C4.11 conditions (`engine/qd-conditions.ts`). The items stay at Check, so they are never bulk accepted, but a person is shown one question as if it were the only fit.
* **Breaks:** the PR's own R5 and QA-162's fix ("listed, never guessed"); P-76.
* **Also:** QA-162's row records the C4.7 part as fixed "by a tolerant match that never guesses".

### QA-195 (#585, C3.4): whether a passport counts as an identity document still depends on what the AI says
* **Where:** `engine/masters-ai.ts:197`. A document type is an identity document only when a reading flags it or its category contains "identity". The name is never checked, unlike C2.6 (`api/src/checklist.ts:138-139`, `/passport|travel document/`).
* **Scenario** (run by the reviewer on main's code): both rounds return "Passport" with category "travel", reader "letter_or_record" and identity_document false. The result is a document type rated Ready and agreed, with an AI reader. The rule `identity_not_read_by_ai` passes, so it can be bulk accepted.
* **Breaks:** P-134, "AI never reads identity documents"; P-153 (code is the guard, not the prompt).

### QA-196 (#585, C3.4): AI form checks and guide checks reach To review but cannot be accepted
* **Where:** `api/src/proposals.ts:576-577`. `LANDERS` (`:367`) has no `form_check` or `cross_check`, so Accept answers 409, "A form check proposal is accepted with its own step, not yet on this queue."
* **Scenario:** a saved masters replay puts Ready form checks on To review, and Accept on any of them gives 409. C3.4's acceptance accepts only a section.
* **Breaks:** P-120 (AI drafts a form's checks as proposals a person accepts); P-149 (1) (one door).
* **Records:** this was noted only as review Minor 3 in `product/screens/C3.4-ai-step/review.md`.

### QA-197 (#568, C5.5): Load sample writes a real release in any workspace, skipping both gates
* **Where:** `api/src/demo.ts:70`. `load()` has only `need(actor, "author")` and no `isDemoWorkspace()` check. With no body it runs the suites' fixture, `fromReviewedRelease` (`:191`). That writes `configRelease` with status RELEASED directly (`:134`), with the approver and submitter copied from `p3/releases/c1-v3`.
* **Scenario:** a copy started with `STUDIO_WORKSPACE_KEY=firm` and an empty Structure; the author sends `POST /api/demo/load` with no body. "With an LMIA" Release 1 is now a real release:
  * no source-register gate and no answer-key gate;
  * no submit and no sign-off;
  * the Approver is recorded without acting.
* **Context:** #676's newer control (`demo.ts:147`) does refuse outside the demo workspace, so the guard was intended. #568's firm suite takes this path through `tests/runtime/setup_visitor_visa.ts:128` but checks only that Visitor visa did not release. `resetToSix` and `reset` have no workspace check either.
* **Breaks:** P-240, "Only the POC's own demo workspace may release Sample content … a map … without a passing signed test, blocks a real release"; P-279 (the source gate).

### QA-198 (#568 with G3 C5.6): Sample content releases outside the demo workspace and is then labelled "Demo release"
* **Where:** `engine/validate.ts:266-272`. `isDemoSnapshot` counts illustrative checks and Sample sources as Sample content, but no step refuses them when the workspace is not the demo. The gate's `demoRelease` (`api/src/answer-key-gate.ts:18`) is false there, so Approve goes through. The release lists then label it from its content alone (`api/src/studio.ts:399`, `:1168`), and `realBaseline` (`answer-key-gate.ts:37`) skips it.
* **Scenario:** in the firm copy, Visitor visa carries two seeded illustrative checks (`tests/runtime/setup_visitor_visa.ts:249-251`). With every number sourced and both keys signed, Approve answers 201: the last assertion of `tests/check_g2_answer_key_gate_firm.ts` expects exactly this. The firm's release page then calls it a Demo release, and the next release measures "new or changed" maps against nothing.
* **Breaks:** P-240, "A Sample value … blocks a real release … a 'Demo release' … never counted as a real publish"; G2 concept BR-3 (every release outside the demo workspace is real).

## What the trial shows

* **Safety held; decisions slipped.** The cheaper reviewer approved nothing that spends money, skips the live switch, loses data in a migration, or lets one person approve their own change. Every Major is a founder decision applied only in part: P-120, P-121, P-134 and P-240, together with the PRs' own "never guesses" and "demo only" rules. All eight sit in AI rating, matching and gate scope. In 4 of the 8 the PR's own test asserts the wrong behaviour as correct (#640, #568 twice), or has no case that would show it (#566).
* **Most of the window was sound.** 24 of the 30 PRs re-reviewed are sound, or have only Minors.
* **This is not a cost comparison.** No reviewer was run twice on the same PR.

## Not re-reviewed (out of scope: screens, words, tests, tooling)

#552, #564, #557, #579, #584, #573, #572, #554, #592, #616, #622, #659, #677, #663, #683, #674, #675, #680, #688. #572 and #592 (QA-165 parts 1 and 2) touch the fill-and-validate path, not AI, money, the schema, permissions or a gate.

## Evidence

* The five reviewers' full notes stayed in this session's scratchpad, outside the repo. Their findings are carried above in full.
* Each reviewer read the code on `origin/main` 762dbae6. The probe runs:
  * `tests/check_p121_rating.ts` 16/16;
  * `findFact` on the IMM 5257 from/to labels;
  * `formMastersFromRounds` and `guideMastersFromRounds` on hand-made rounds;
  * `statesValue` on 15 quotes;
  * the IMM 5532 run file checked with node, 314/314;
  * `tests/check_forms_c118_words.ts` 7/7.

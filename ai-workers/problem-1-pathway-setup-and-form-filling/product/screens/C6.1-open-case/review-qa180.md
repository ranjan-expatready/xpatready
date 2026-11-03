# Review: QA-180 (Critical), one rule for release and Open a case (C6.1, C5.1 gate)

Reviewer (did not build), 4 Nov 2026. Commit **c9b910ae7** on `claude/runtime-qa180-one-gate`, against origin/main debbf3fc8. Own copies only: `rv8_qa180` :19400, `rv8_b1` :19401, US$0, no STUDIO_*_LIVE, never :4400. Journey test: `journey-test-reviewer-2026-11-04.md` (this folder), **7.5/10, fail**.

**Verdict (skill wording): Ship after fixes.** One Major is open: the golden journey in the row's Done-when does not pass at this commit.

## What I checked, with evidence
* **The rule.** `formsWithoutFieldMap` (engine/programs.ts:165) is the only place the rule lives now. Three readers use it: release (engine/validate.ts:62, :72), Open a case (missingItems at engine/programs.ts:66, reached through startableMissing at api/src/programs.ts:310) and the setup count (api/src/programs.ts:248). `pdfMapInUse` excludes online maps (P-102) and picks the newest printed edition (P-32). A document form never needs a map.
* **Fails before, passes after.** `tests/check_qa180_one_rule.ts` gives 22/22 on the branch. Against main's engine (copied to scratch) it gives 11/22. Hole 4 (3 checks) and the words check fail on main for a real reason. The 7 "one rule" checks fail on main only because the export does not exist: on main both gates already refused the same forms in all 7 variants. Removing the shared call from either gate makes `one rule (newerEmpty)` fail, so the test does guard the rule. `tests/qa/check_qa180_two_gates.ts` gives 8/8.
* **Import cycle.** validate.ts → programs.ts is a new edge. programs.ts → validate.ts is `import type` only, so it is erased at runtime. programs.ts imports at runtime contracts/programs, engine/resolver, contracts/status-words and engine/setup-checklist, and none of them imports validate.ts. channels.ts already imported programs.ts inside validate's graph. Every suite below loads, and the type check passes: `product/tools/typecheck.mjs` reports 0 new errors (15 known).
* **Where the new `label` shows.** The title now appears in:
  * review.tsx `problemLine`. The `startsWith` dedupe does not fire, because the message does not start with the label, so the form is named once.
  * the submit and release refusals (refusal.ts:34, studio.ts:48 and :1056–1125, through `problemWords`).
  * `errors[]` on the Release page (api/src/programs.ts:500).

  It does not change: the Forms tab (forms.tsx:396 filters out `waitsForMap`), form progress (form-progress.ts:89, same filter), `firstError`/`firstHold` (they use `item`), the setup checklist, or PartProblems (documents and questions only). No test expects the old text: B1 gives 14/14, C2.12 54/54.
* **Other copies of the old predicate.** api/src/answer-keys.ts:189 and engine/answer-key-gate.ts:22 list mapped PDF editions for answer-key tests, which have a different purpose, so leaving them is correct. tests/check_b1_release_unmapped.ts:22 keeps a copy on the test side; it is the same as the rule on built snapshots.
* **Plain words (P-63).** No "box" and no codes or keys in the new line. On screen: "Forms · IMM 5707 (Family Information): No form fields mapped yet: a case could not fill this form, … Map its form fields (Draft setup), or remove the form."
* **Suites, all green.** These run without a server, each 100 %:

  | Suite | Result |
  |---|---|
  | check_screen01_rules | 67/67 |
  | check_engine | 43/43 |
  | check_gcore_engine | 137/137 |
  | check_c1112_modes | 44/44 |
  | check_edition_in_use | 20/20 |
  | check_review_item_words | 7/7 |
  | check_vv_checklist | 62/62 |
  | check_sh3_resolver | 78/78 |

  On my own copy at :19401: check_b1_release_unmapped 14/14, check_s4_startable 10/10, check_forms_c212_progress 54/54.

## Issues
**M1 — Major, Must: the golden journey "configure and release Visitor visa → open a family case" does not pass (Done-when).** I ran the committed `v3_golden_replay.cjs` with only its port guard relaxed, twice.
* **Run 2:** step 2f does name IMM 5409, 5476 and 5707 by number and title (the QA-180 part works). Then step 2 FAILs with "blocking errors 2", and step 3 crashes on the disabled "Submit for review" ("Fix the problems first"). The two errors left (from GET /combinations/:id/review):
  1. "IMM 5707 (Family Information) is in this combination's application package but not in its forms. IRCC returns an application without it…" This comes from engine/form-completeness.ts:41 (C3.8, 013eda4f2, 3 Nov).
  2. "IMM 5257: 14 form fields have no decision": the replay's decide loop (v3_golden_replay.cjs:65–66) did not decide them.
* **Run 1** crashed earlier, at step 2, on the IMM 5409 Change dialog. The replay is flaky.

So the commit's recovery (remove 5409, 5476 and 5707, v3_golden_replay.cjs:113–116) can never release, because removing IMM 5707 is itself refused. It also departs from **P-297 (3)**: "V3's replay maps IMM 5707 with its Saved draft instead of removing forms". The comment "No Saved field map exists for them" is not true for IMM 5707: the builder's own uncommitted working copy now applies IMM 5707's Saved draft.

**Fix:**
* Apply IMM 5707's Saved draft (P-297 (3)) and remove only 5409 and 5476.
* Make the IMM 5257 decide step reliable.
* Attach a replay log where step 3 releases (2xx) and step 4 opens the family case on release 1 at the first try (no 409).
* Anything pushed after c9b910ae7 needs a diff-only re-review.

**m1 — Minor, Should: "or remove the form" leads nowhere for a form the package needs.** The new line offers "Map its form fields (Draft setup), or remove the form" for IMM 5707. Removing it gives the package error above. Fix: for a form that form-completeness requires, offer only "Map its form fields (Draft setup)".

**m2 — Minor, Should: hole 4, and the edition wording, cannot be reached from built snapshots.** engine/snapshot.ts:165 (`.filter((m) => m.entries.length)`) drops every edition with no entries. So in a built or released snapshot, `pdfMapInUse` never returns an empty map. Holes 2 and 4, and the edition message at validate.ts:74, are reached only by hand-built snapshots. Imports go through the database and buildSnapshot too (engine/import.ts:106). Keeping it as a defence is fine, but the PR should say so. It should not claim "a case filled an empty map", which real data cannot produce. Also, for a single edition with 0 entries, the message still says "(an older edition's map is not used)" even when there is no older edition. Fix: add that clause only when an older mapped edition exists.

**m3 — Minor, Should: one form is named two ways in one list.** On Review and release the condition line reads "IMM 5409: Turn …", and the line just below reads "IMM 5409 (STATUTORY DECLARATION OF COMMON-LAW UNION): No form fields mapped yet …" (screenshot from my copy). The submit refusal also nests brackets: "IMM 5257 (Application for visitor visa (temporary resident visa)): …". This is EXPERIENCE (one term per thing). Fix: name the form the same way on every Forms line, or drop the title when it already has brackets.

## D1–D20 (scored on this change)
| Dimension | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | One rule, the form named in words, a test per hole. The golden journey in Done-when is not met (M1). |
| D2 Data integrity | 5 | B1: release 2 is refused while release 1 still opens cases. |
| D3 Reuse and normalisation | 5 | One predicate instead of three. |
| D4 Rule integrity | 4 | The two gates cannot disagree. "Remove the form" leads to a second error (m1). |
| D5 Stability and recovery | 3 | The replay is flaky across 2 runs (M1). |
| D6 Freshness and governance | n/a | Not touched. |
| D7 AI trust | n/a | Not touched. |
| D8 Orientation | 4 | Each line starts with "Forms ·" and the form. |
| D9 Flow of information | 3 | m1. |
| D10 Language and guidance | 4 | Plain words, no "box"; m3. |
| D11 Feedback and state | 5 | Error pill; Submit disabled with "Fix the problems first". |
| D12 Visual quality | 4 | Team list; lines wrap. |
| D13 Accessibility and responsive | 4 | axe: none. 0 px sideways at 400, 1024, 1440 and at 200 % of 1024. Keyboard not re-walked: the change is text only. |
| D14 Looks like the team's product | n/a | Not touched. |
| D15 Speed | 3 | Review page 3.6 s on my copy after heavy setup (existing behaviour). No per-row requests added. |
| D16 Testability | 4 | Fail-before shown. 7 of its 22 checks only test that the export exists. |
| D17 First-use intuitiveness | — | Simulated only. |
| D18 Information provenance | n/a | Not touched. |
| D19 End-to-end capability closure | 2 | The golden journey stops at release (M1). |
| D20 User pain solved | — | Simulated only. |

**Graph (P-86):** not run. With no `--write` it still writes qa/graph.json, which is outside what I was allowed to write. The change adds no page or route.

**Not checked:** a real screen reader; an intended user's unaided walk (D17/D20); the builder's uncommitted replay edits (not committed, not reviewed); the CI full-suite run (select-suites says ALL, because engine/ changed).

**Verdict: Block** — fix M1 (and list m1–m3 in the PR or fix them), then a diff-only re-review on the new commit.

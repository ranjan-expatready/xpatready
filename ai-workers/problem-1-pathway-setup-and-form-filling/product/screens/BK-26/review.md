# BK-26 review — dependent lists from the form's own datasets (PR #1749, head c6d3f3e14)

Independent reviewer (P-303), 14 Nov 2026. Forms-lane engine/data row, no concept file: reviewed against the BK-26 row, `STANDARDS.md`, `RULES.md` and correctness. Diff `origin/main...c6d3f3e14`: 20 files, +522/−20 (about 124 of them generated list lines): within the ~800-line PR size.

## What I re-ran (not the builder's word)
* Pure: `check_bk26_dependent_lists.ts` 19/19; `prototype/tests/check_p5_engine` 35/35, `check_qa180_one_rule` 27/27, `check_screen01_rules` 72/72, and every other pure suite that imports a touched file and needs no server: green. CI type check (`product/tools/typecheck.mjs`): no new errors (15 known).
* Lists files: regenerated from the official PDFs; byte-identical to the committed `imm{0008,1294,1295,5710}e.lists.json`.
* Fresh isolated copy `forms_bk26r` on :4458 (forms range), reset + configured load by BK-13, stopped by trap: **BK-13 45/45 exit 0** (IMM 1294 73 written, read back, no badChoice; nothing by hand). **BK-24 exit 0, no F1 gap**: IMM 1294's only open box is the consent (F2); the rest are F2–F5 (BK-25). **Walk 8/8.** A second fresh copy ran my probe walk (journey report beside this file).
* All 22 inventoried forms scanned for `setDDLFromLOV(... + ...)`: only IMM 0008, 1294, 1295 and 5710 have them. The second call in each (`oCity`, `oProv.formattedValue` in `validateDetails…`) is the same box pair, so no list is missed.

## Checks asked for
* **XFA scope of the target box:** correct. Search goes from the source's container upward, with unnamed subforms left out. Results: 1294 `ProvinceState.Prov` → `PurposeRow1.CityTown.CityTown`, 5710 `Location.Prov` → `Location.City`, 0008 `q6.Prov` → `q6.CityTown`, 1295 intended location: all the right boxes.
* **Label/code key:** correct. The form's `setDDLFromLOV` adds `(oListItem.value, oListItem.lic)`, and `formattedValue` is the shown text. The province box's items are `[AB, 09]…`, so the written code 06 maps back to its label ON, which is the dataset group name.
* **Order:** the dependent box is worked out after all others, from `values[depends_on]`. If the province goes by hand, is blank or is refused, the city goes by hand with a reason (test c and d). `sameAsLeavesRowEmpty` blanks whole rows, and in all four forms the city is in its province's row, so both are blanked together. A city and province in different rows would leave the city stale. No form has that today; noted for later.
* **`refused` Outcome:** it is only returned when `box.options_scope` is set, and only `form-values.ts` sets it. `compared.ts`, `stepsNotRun` and the tests pass `{}`. `p5/engine.ts` passes inventory boxes without `options_scope`. No caller is broken.
* **Form numbers in engine strings:** none. BK-13's scan passes, and the mentions are in comments only; `code_list:imm1294.city` is sample data.
* **IMM 0008 / IMM 5710:** no committed answer key or test expects their city boxes by hand (searched samples, tests, keys).
  * IMM 0008 (`code_list`) now writes or refuses by province. Before, it used the form's static Alberta default, so a city outside Alberta went by hand and an Alberta city was written whatever the province.
  * IMM 5710's saved map is `as_is`. It writes the text as before, so the list is loaded but not applied. This is outside the six forms; it is a note, not a finding.
* **Answer-key fingerprints:** `inventoryHash` leaves `dependent_lists` out (tested). The inventories are unchanged, so saved replays still match on sha256.
* **Sample-loader `proposed: null`:** it applies only while the box is still unresolved with no key, is idempotent ("corrected already"), and writes one audit line.

## Findings
**M1 (Major) — 286 cities that are on the form are refused, with words that say they are not.**
* About 7% of the form's cities carry a province suffix in their label ("Hamilton, ON", "Waterloo, ON", "Kingston, ON", "Sherbrooke, QC", "Saint John, NB", "Windsor, NS"; 286 of 4,016). `codeFor` compares the whole label or its first word. "hamilton," (with the comma) never equals "hamilton", so the address's "Hamilton" is refused.
* Live on :4458 the case page said: `"Hamilton" is not in the form's own list of choices for "Province" ON … check the answer.` The same happened for Waterloo, as a keyboard-only run at 1024 px. Screenshots: probe shots `hamilton-1440.png` and `waterloo-1024-1024.png`. Pure repro: Kingston, Sherbrooke and Saint John are refused too; only "Hamilton, ON" is written (3324).
* The statement about the official form is false (P-170). The officer is told to fix an answer that is right, and the only way through is to type the form's own spelling into the school address. These are among the largest study cities, so the "refused in words" rule would fire on correct answers.
* Fix: on a dependent list, a label also matches with a trailing `, <the list's own key>` removed. This is generic, because the suffix is the dataset group name. Add a pass test (Hamilton/ON → 3324) and a fail test (Hamilton/QC refused).

**m1 (Minor) — separator items are kept as choices.**
* Each list keeps the form's `---------------` items, which have an empty code: 487 in total, 127 in ON. They inflate the words ("CityList.ON.City: 971 entries"; ON has 844 cities) and the test name ("4503 cities with codes"; there are 4,016).
* A value of `---------------` is reported "written" with code "".
* Fix: drop items with an empty code when building the choices or the lists file, then fix the count and the test name.

**m2 (Minor) — a first-word match is a guess on a city list.**
* "Pierrefonds" is written as 1740 "Pierrefonds Est", although "Pierrefonds Ouest" is also on the list (`codeFor`'s first-word rule, now applied to city lists).
* "Quebec" → "Quebec City" is fine, because only one label starts with that word.
* Fix: when the box has `options_scope` and more than one label shares the first word, refuse or send the box by hand rather than take the first match.

**m3 (Minor) — the officer's line has internal names (EXPERIENCE: no jargon on the main path).**
* "(its datasets, CityList.ON.City: 971 entries)" is an internal path; plain words would be e.g. "the form's own list of cities for ON (844)".
* "Montréal" (QC) is refused because the form spells it "Montreal". Folding accents would help here, but it is optional.
* "of The application" is existing wording, not this PR's.

**m4 (Minor, standard) — `engine/field-format.ts` `dependentListsFor` reads a file.** STANDARDS §4 says the engine has no I/O. It follows the existing `formatsFor` beside it, and `form-values.ts` stays pure. Leave as is or move to the API side with `formatsFor` later.

**m5 (Minor, standard) — no property-based test although the engine changed (§6 [M]).** The repo has no property-based test library (adding one goes through the §1 gate). The example tests do fail when the rule is removed: with the refusal line gone, test b fails; with the ordering gone, test a fails.

Note (process): the builder's evidence copy used :4461, which is outside the forms range 4450–4459 (WAY-OF-WORKING). Not a code finding.

## Scorecard (engine row; person-facing surface = the case page's copy lines)
D1 Requirement fit 3: every done-line met for the Sample; M1 breaks "refused only when not in the list" · D2 Data integrity 4: nothing wrong is written, except m2 · D3 Reuse 5: one reader, one lists file per form, no copies · D4 Rule integrity 3: M1 · D5 Stability 4: regenerate and reload hold; ordering is safe today · D6 Freshness 4: lists carry the file's sha256 and its quote · D7 AI trust N/A: no AI · D8 Orientation N/A · D9 Flow 3: "check the answer" sends the officer in the wrong direction on M1 · D10 Language 3: m3 · D11 Feedback 4: "1 not on this form" in the copy line · D12 Visual 4: the warning line, team look · D13 Accessibility 4: keyboard Enter, 1024 px, 200 % zoom, no sideways scroll, axe clean on the walk's settled states · D14 Team look 4 · D15 Speed 4: a copy in about 1.1 s · D16 Testability 4: pass and fail tests; M1 untested · D17 and D20 simulated only · D18 Provenance 4: the form's own quote and list are named · D19 Closure 4: BK-13 45/45, BK-24 F1 closed.

BIC (EXPERIENCE §6): 04 Partly (M1 refuses valid input) · 12 Met (the copy line lists what is not written) · 13 Partly (says what but not the right fix on M1) · 19 Met · 20 Met (keyboard, 1024 px, 200 %) · 01–03, 05–11, 14–18 N/A (this row changes no question, document, case structure, channel, signing or review).

Journey score (reviewer, the one for this check): **7.5/10, below the pass mark of 8**: `journey-test-reviewer-2026-11-14.md`.

## Could not check
* Adobe Validate on a copy with the city written (the tech lead's BK-20).
* A real screen reader, and an intended user's unaided walk (D17/D20).
* The graph tool (P-86): not run, because it rewrites `qa/GRAPH.md` and this row adds no screen element or route.
* One axe `color-contrast` hit was caught mid-generation, with the button spinning, in my probe. The walk's settled states are clean. I could not tie the hit to this PR.

**Verdict at c6d3f3e14: Block**

To fix (at c6d3f3e14):
1. **M1 (Major):** match a dependent list's labels with their own `, <key>` suffix removed; add a Hamilton/ON pass test and a Hamilton/QC fail test.
2. Minor (fix in the same PR if cheap, otherwise as follow-ups): m1 drop empty-code separators and correct the counts and the test name · m2 ambiguous first-word match on a dependent list is refused, not guessed · m3 plain words for the list path in the officer's line · m4 and m5 as noted.

## Re-review, diff only (P-277): c6d3f3e14..6cedecd59
The diff: `p5/transforms.ts` (+27/−12), `check_bk26_dependent_lists.ts`, the walk's expected words, two refreshed screenshots, and this review and the journey report, committed by the builder.

**What changed:**
* **M1, fixed.** `dependentChoices` adds an alias for each label ending in the list's own key, "Hamilton, ON" becoming "Hamilton" with the same code. It is generic: the suffix is the dataset group name and no form is named.
  * I checked all four lists files: after accent folding and the aliases, no value maps to two codes, so no alias creates a clash.
* **m1, fixed.** Items with no code or a blank label are dropped. The count in the words excludes the aliases (844 for ON, 846 for QC).
* **m2, fixed.** On a dependent list only, `dependentCode` replaces `codeFor`. It matches the label letter for letter, ignoring case, accents and repeated spaces, or the code itself; two codes for one value gives no answer.
  * Boxes that are not dependent keep `codeFor` unchanged: the ternary's else branch is the old expression.
  * Side effect, accepted: "Quebec" (QC) is now refused because the form lists "Quebec City". The words stay true, and the officer can answer with the form's spelling.
* **m3, fixed.** The words now read `"MONTREAL" is not among the 844 choices the form lists for "Province" ON, so nothing is written and nothing is guessed: check the answer.` "Montréal" is written as the form's "Montreal" (1694). "of The application" is existing wording.
* **m4 and m5:** kept, with the builder's reason (the `formatsFor` pattern; no property-test library behind the §1 gate). Accepted as Minor.

**What I re-ran:**
* Pure: BK-26 22/22. The new tests fail when their rule is removed: drop the alias and Hamilton/ON fails; put `codeFor` back and Pierrefonds fails; keep the separators and the separator test fails.
* My own pure probe on the new head:
  * Hamilton, Waterloo, Kingston, Sherbrooke and Saint John are written (3324, 3900, 3414, 2140, 0850), and "Sainte-Thérèse Ouest" (2432).
  * Hamilton/QC, Pierrefonds and the separator are refused.
  * "Toronto " with a trailing space and the code "3812" both give 3812.
* Other pure suites: `check_bk22_filler_steps` 41/41, `check_b107` green, `check_qa395` 22/22, `check_bk23` 28/28, `check_screen01_rules` 72/72, `p5 check_p5_engine` 35/35. Type check: no new errors (15 known).
* Fresh isolated copy on :4458, stopped by trap: **BK-13 45/45 exit 0; BK-24 exit 0**, with IMM 1294's only open box being the consent (F2), so F1 is closed; **walk 8/8**, with the new words on the case page. This agrees with the builder's :4452 log.

**Journey score at 6cedecd59: 9.5/10 (pass).** I re-scored from the automated re-walk and the probes; I did not redo the full visible walk.
* Task completed, correct data, next step and plain words go up to 1: the cities the form lists are written, and the refusal words are true and plain.
* Error recovery stays ½: when the answer is a near spelling ("Quebec" for "Quebec City"), the line does not name the form's nearest choice.
* The other criteria are as in `journey-test-reviewer-2026-11-14.md`.

**Open:** no Blocker or Major. The only open items are Minors m4 and m5, accepted as they are.

**Verdict: Approve** (for 6cedecd59a9804121bb5f728f87db5bba69c6766)

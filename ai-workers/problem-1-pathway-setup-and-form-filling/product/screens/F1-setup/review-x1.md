# Review: X1 / W1 setup checklist slice C2 (tab badges, `?focus=` on Documents and Questionnaires), commit c7bb6ab0

Reviewer agent, 1 Nov, fresh context. Own copy `screens_rev5` on :4447 from `/tmp/wt-x1` (web built, demo loaded). The builder's check was copied to /tmp and pointed at :4447: **19/19 pass**. Judged against `W1-setup-checklist/concept-draft.md` §B/§C, §6, §7, §8 and the board `design/draft-setup-checklist.html`. To get the states the sample does not have, I edited only my isolated database: (a) a document line's condition names an unknown field, which gives a draft "Documents" error; (b) a library field that the With an LMIA release reads is retired, which makes it **Not ready**.

## What holds
* `tabCounts` reads `summary.setup` and never recounts (§8). The badge is aria-hidden digits with sr-only words, so the tab's name is "Documents, 1 setup item open". No badge shows when the count is 0.
* `documents:lines` lands on the checklist section, or on the empty state for Super visa. The section is focused, has the ring for 2 s and the address is cleared. `questionnaires:gaps` and `questionnaires:problems` land on their elements. An unknown key breaks nothing. Axe found nothing at 400, 512 (1024 px at 200 % zoom), 1024 and 1440 px. With the keyboard alone, Tab and then Enter on the Documents tab works. The landing takes about 450–530 ms.
* The hooks run before the early returns, and no hook order changed.

## Findings (most important first)
1. **Major: Not ready step-4 problems land nowhere and are not counted.** `engine/setup-checklist.ts:110` `problemsItem(…, "questions_documents", true)` gives the focus `questions_documents:problems`. This is the first item and the card's **Resume setup** target: href `/c/<id>/documents?focus=questions_documents%3Aproblems`. Walked on the Not ready With an LMIA card: Resume setup opens Documents with nothing focused or outlined, and `?focus` stays in the address (`/tmp/rev5/shots/lmia-notready-resume.png`). `tabOfFocus` returns null for that key, so its "Fix 5 problems: firms cannot open cases…" is on no badge (Documents 1, Questionnaires 1). This is the only focus key for these tabs that still lands nowhere. The concept says Resume setup lands on the first open item (§7) and Not ready items come first (§6). Fix: the engine emits the part key per release problem (`documents:problems` / `questionnaires:problems` through `stepOfWhere(...).part`), or both tabs map the key. Add a Not ready pass and fail to the check.
2. **Major: `documents:problems` and `questionnaires:problems` land on a place that contradicts the item.** The engine counts validator errors with `where: "Documents"` (`engine/validate.ts:86-87`, a document line's condition). The tab's `needs` (documents.tsx:68) reads `checklist.problems`, which are fact-source problems with `where: "Questions"` (`engine/sources.ts:148`, `api/src/person-checklist.ts:50`), matched by a regex on words. In the walk, "Fix 2 problems" landed on the "When it is needed" chips reading **"Needs you · 0"**. The broken line, "Employment contract (LMIA-exempt job)", shows "Released" and is not targeted (`lmia-docs-problems.png`). When `firstNeed` does exist, it is a line tied to a *questions* problem, so it is the wrong line. "Fix 3 problems" on Questionnaires lands on chips that read "Needs you · 0" too: Rules, Checks, Derived fields, Library and condition errors are not in that chip. The concept's §6 says "Documents · the line" and "Questionnaires · the row". In addition, the row target's outline is never seen. `data-[focused]:outline` (documents.tsx:123) loses to the unlayered `:focus-visible { outline: none }` (`web/src/styles/index.css:19`). Measured on a focused row: `outline-style: none`. C1 uses `FOCUS_RING` for exactly this reason. Fix: target the line whose `document_type` equals the first draft error with `where: "Documents"` (the summary's `draft.problems`), and use `FOCUS_RING` on it. On Questionnaires, land on the first row named by a step-4b error, else on the chips, but not on a chip that shows 0.
3. **Major: the badge number differs from the board, and the deviation is not recorded.** The board's "Forms 5" is 3 forms found + 1 proposal + 1 form problem, the sum of the items' `count`. Counting open items would give 3 there, and this code gives 2 because `review:*` proposals map to no tab. The §7 table says proposals, problems and held editions are read by the tab badges. Today, on Study permit, Forms shows 3 where the board's rule gives 5 (Add 3 forms found plus pages plus people). Fix: sum `count` per tab, with `review:people|forms` → Forms, `review:documents` → Documents and `review:questions` → Questionnaires, together with finding 1. Otherwise record the open-item rule in `challenge.md` for the Lead before merge.
4. Minor: at 400 px the page scrolls sideways (434/400). The badge's `sr-only` span is absolutely positioned and escapes the tablist's `overflow-x-auto`. Removing the sr-only spans brings it back to 400. Fix: `relative` on the tab `Link` or on `StepBadge`. 1024 px and 200 % zoom are fine, so the [M] line is met.
5. Minor: Documents and Questionnaires pass `done=[]`, so "This was done since you opened it" (concept §B, part of `useFocusItem`) never shows there. A stale `documents:lines` link lands without a word. Pass the done keys from `setup.steps[3].parts` the way C1 does.
6. Minor: `questionnaires:gaps` counts gaps across all people, but it lands on the selected person. When that person has none, it lands on the coverage line and the gaps sit behind another person's chip. Selecting the first person who has gaps would close this.
7. Minor: the check's step names carry no capability ID. P-86 and plan.md line 27 expect `C11.10: …` / `C11.16: …`, as C1's check has.

**The Overview's "Missing before firms can use it" counts differently.** This does not block. The list is the pre-existing `row.missing` reader, which §7 names for replacement by the strip in C3. The badges already read the one counts object. It should be listed in C3's done-when: badges equal the strip.

## D scores (this slice only)
D1 2 (findings 1–3) · D2 n/a (read only) · D4 n/a · D5 4 (reload and Back do not jump, an unknown key is harmless) · D8 4 · D9 2 (Resume setup lands nowhere when Not ready; problems land on "· 0") · D10 4 · D11 3 (the row outline is invisible) · D12 4 (the pill matches the board) · D13 4 (axe clean, keyboard, 512 px fine; 400 px scrolls) · D14 4 · D15 5 · D16 3 (19/19 pass, but there is no Not ready case, no real "Documents" error, and the outline check reads an attribute, not what is drawn) · D17, D20: simulated only · D18 4 · others n/a.

## Journey test (reviewer, the one score for this check)
Journeys walked as the configuration author (user-A): J1 Study permit tabs show badges, and the Documents link lands on its checklist. J2 Super visa's empty Documents gets the landing. J3 a Not ready card, Resume setup. J4 "Fix 2 problems" on Documents. J5 "Fix 3 problems" on Questionnaires. J6 an unknown key. J7 keyboard only, and 400/512/1024/1440 px. Screenshots are in `/tmp/rev5/shots/` (not committed).

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | J1, J2 and J6 hold; J3 lands nowhere |
| Next step obvious | ½ | J4 and J5 land on "Needs you · 0" |
| Plain words | 1 | "1 setup item open" |
| Feedback and state | ½ | the row outline is invisible; J3 gives no feedback |
| Correct data | ½ | badges leave out proposals and Not ready problems (finding 3) |
| Error recovery | 1 | an unknown focus is harmless; reload does not jump again |
| Accessibility and screen sizes | ½ | axe clean, keyboard OK; 400 px scrolls sideways |
| Speed | 1 | landed in about 0.5 s |
| Visual quality | 1 | badge as on the board |
| Trust and sources | 1 | counts come from the engine; no AI |
| **Total** | **7.5 / 10** | below 8, so it fails. The fixes that raise it most: findings 1, 2, 3, 4 |

Not checked: a real screen reader, an intended user's unaided walk, the Forms-side keys (C1, already merged).

**Verdict: Block** (commit c7bb6ab0). Fix: (1) the `questions_documents:problems` landing and its count; (2) the problems landings target the right line or row, with a visible ring; (3) the badge number follows the board's rule, or a recorded challenge accepted by the Lead. Should also fix: 4–7.

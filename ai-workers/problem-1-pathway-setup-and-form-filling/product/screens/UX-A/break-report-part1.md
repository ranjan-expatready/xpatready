# UX-A part 1 — break report (commit 9f2229e3, "one definition per count")

Breaker, 2 Nov 2026. Isolated copies only: `brk_uxa1` on :4447 (the six, `POST /api/demo/reset-to-six`) and `brk_uxa1b` (demo sample, `reset` + `load`), first on :4448, then on :4442. At 15:19 another session (a `screens_uxa2` copy from a different worktree) took port :4448 and stopped mine. Every result from :4448 after that point was thrown away and run again on :4442. From 15:25 another session also edited this checkout without committing (programs.ts, counts.ts, setup-checklist.ts, forms.tsx and others). My servers started at 15:12 and 15:20 without watch, and the web build is from 15:12, so every result here comes from commit 9f2229e3's code. The web build matched the commit (same bundle hash after `vite build`). US$0: replay plans only, no priced button, no `*_LIVE`. Probes: `/summary`, `/workspace?tab=forms|questionnaires|preview`, `/fact-sources`, `POST /draft-qd/plan {"mode":"replay"}`, and a Playwright walk that reads every count on screen. Screenshots are in `/tmp/claude-0/-home-user-xpatready/d1a19a26-d4f8-5a0b-9a61-250603ccb5cc/scratchpad/shots/` (not committed).

## Verdict
**Not yet.** The default states agree on every screen: the demo sample's Visitor visa and LMIA, the six, and Remove/Undo/Add from the library. Three reachable states still make screens disagree (3 Major), and there are 3 Minor wording or definition gaps.

## Breaks

**B1 — Major. A person role the combination allows disappears from every question count, but the form facts still count it.**
Steps: LMIA (demo sample), `PATCH /people`: Spouse or partner max 0, Child stays 0–4.
Expected: Child keeps its chip. Questions total = sum of chips including Child. Facts and questions name the same people.
Actual:
* Overview tile: "Questions 96 across all people: Principal applicant 81 · Representative 15".
* Setup strip: "22 documents · 96 questions".
* Questionnaires chips: Principal 81 and Representative 15 only, so there is no way to open Child.
* Preview chips: Principal and Representative only.
* Source strip: "98 Form facts".
* Draft questions and documents dialog: "98 form facts: Principal applicant 48 (13 …) · **Child 35** · Representative 15".

The `people` count also says 3 roles, but the questions cover 2.
Cause: `questionCounts` and `questionnairesView` read the people from `largest(s)` (engine/runtime/questionnaires.ts:21-37). That uses the fixed Sample families (single, couple, couple + 1 or 2 children), so a single parent with children never appears, while fact-sources counts by participant line. Screens: `lmia-nospouse-*-1440.png`.

**B2 — Major. A form removed and then released is counted again as "attached, not set up", and the next step tells the author to add it back.**
Steps: LMIA (released): `DELETE /forms/IMM 1295` → every screen says 7 forms, "Removed in this draft" (held) → submit as user-A, approve as user-B (Release 2).
Expected: the released removal counts nowhere, like the draft removal. Release 2 has 7 forms.
Actual: the strip, Overview tile, Forms filing line and finder line all say "8 forms · 7 set up". The Forms tab also shows:
* the badge "Forms 2 to do";
* a pending row and the line "Not set up yet: 1 form can be added from the library now";
* `nextAction` = "Add 1 form from the library: IMM 1295", while the status reads "Live · Release 2".

Cause: `removedInDraft` only excludes lines retired after the last release (contracts/counts.ts:150-154, used at api/src/programs.ts:184 and api/src/workspace.ts:95). After a release the file is "attached" again (programs.ts:185). Screens: `lmia-after-release-forms-1440.png`, `lmia-after-release-overview-1440.png`.

**B3 — Major (rare trigger). The Forms tab lists forms by a different rule than the count it prints.**
Steps: demo Visitor visa, 6 parallel `POST /attachments/sample {"officialFile":"imm5409e.pdf"}`. Two of them answer "Attached", which creates two IMM 5409 attachments.
Expected: IMM 5409 once on every screen.
Actual: the strip, Overview tile, filing line and finder line say "4 forms · 0 set up". The same tab draws 5 pending rows, and its own sentence says "Not set up yet: 4 forms can be added … ; 1 form needs reading" (5 forms).
Cause: the tab's list is `pendingForms`, which neither de-duplicates by code nor filters `recognised` (web/src/pages/sources.tsx:78-80). The count uses only `recognised` attachments, de-duplicated by code (api/src/programs.ts:185,193). The race itself is older: `findFirst` then `create` with no unique key (api/src/sources.ts:130-131, 157).
The same split applies, by reading the code, to a P-80 form approved in the product (stored `recognised: false`): it would be listed on the tab but left out of every count. That one was not reproduced, because a changed copy of a library edition is refused ("cannotApprove") and no other edition was available. Screen: `demo-vv-race-forms-1440.png`.

**B4 — Minor. The Preview person chips are per Sample family but use the Questionnaires chip's words.**
Steps: LMIA Preview, family by family.
Expected: same number as the Questionnaires chip for the same role, or words saying it is for this family.
Actual:
| Family | Preview chip | Questionnaires chip |
|---|---|---|
| Couple, two children (default) | Child 2 · 108 questions | Child · 109 |
| Couple, no children | Principal applicant 144 · Spouse or partner 111 | 143 · 110 |
| Single | Principal applicant 136 | 143 |

The differences come from family-dependent questions: `person.has_children` (only when there are no children), `relationship.child_relationship_type` (Child 1 only) and 7 `relationship.*` facts (only with a partner). Cause: engine/runtime/preview.ts:105-109 counts the chosen family; web/src/pages/workspace/preview.tsx:70.

**B5 — Minor. The tab badge adds unlike things and its tip calls them "setup items".**
The six's Visitor visa shows the badge "Forms 44 to do" with the tip "44 setup items open on Forms".
The setup strip shows 5 items: choose page, confirm people, "Map 7 forms", "Review 29 proposals", "Fix 6 form problems". The 29 proposals are worked on To review, not on Forms.
The same 6 problems are counted "to do" on Forms and "6 to fix" on Review and release.
Cause: contracts/setup-checklist.ts:107-118 (tabCounts sums item counts); web/src/pages/combination.tsx:404-412.

**B6 — Minor. A second live forms count on the Forms tab.**
The six's Visitor visa shows "AI found 7 forms for this combination, 1 to decide" above "Filing: PDF only · 8 forms · 7 set up". After removing IMM 5257 they read "AI found 6 forms" and "7 forms · 6 set up". The finder sentence follows the draft, so it is a second forms count with another definition, and the baseline listed this exact line as a disagreement. Cause: web/src/pages/workspace/finder.tsx:134,150.

## What held
* **The six (all six combinations) and the demo sample, by API:** the summary counts, row list, strip words, Overview, Forms lines, Questionnaires chip sum and Preview default chips agree, within the B4 limit.
* **Remove, Undo, re-add:** remove, then Undo, then remove, then `POST /forms {"formKey"}` from the library, on Visitor visa (no release) and on LMIA (released, draft removal). Every count moved together: 8 → 7 → 8, "Removed in this draft" listed, Undo restored. The same was done with the keyboard only at 1024 px (Actions menu, Enter, dialog, Undo, back, reload). The only mismatch was the refetch window, under 150 ms.
* **Same file attached twice in a row:** de-duplicated ("Already attached").
* **Codes:** all 22 official form editions in the manifest are already in normalised form, so line and attachment codes match. The Instructions file "IMM 5905 E" stays a source and is not counted.
* **Changing people:** Child max 0 gives 270 = 144 + 111 + 15 everywhere, and facts 236 = dialog. Adding Sponsor (0 questions) shows 0 on the chips, Overview and Preview, and the dialog leaves it out (0 facts).
* **Form facts per person:** the Questionnaires facts line equals the dialog for every role. That held at 120 (22 of them for the application) / 101 / 97 / 15, and after changes at 56 (19) / 39 / 35 / 15. The total equals the source strip (333, 145). The chip equals the "N questions for …" line for every role.
* **Simulated people:** user-A, user-B and user-C see the same numbers. No `x-actor` gets 401, including on `/draft-qd/plan`.
* **Tab names:** each tab's accessible name equals its visible text ("Forms 2 to do", "Review and release 6 to fix"), and the tip says it in full. Numbers are the same at 1440, 1024 and 400 px. No badge wraps at 400 px (`vv-overview-400.png`).
* **Budget (STANDARDS §9, sample data):** catalogue 8–25 ms warm and 245 ms on a cold rebuild, so it holds. Note: `questionCounts` adds about 30 ms per content-rich combination to each catalogue rebuild (LMIA, measured with tsx).
* **Not reached:**
  * The 100-program fixture fails on Linux (`spawnSync psql E2BIG`, tests/fixtures/scale_100.ts:64), so there is no scale figure. Scale is the team's work per §9.
  * A retired combination: the retire was approved, but the combination stays "Live · Release 2" and there was nothing to release. That is not a counting finding.

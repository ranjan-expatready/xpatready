# UX-A part 1: break report, round 2 (fixes in a8715173, tested on merge head 6446a2db)

Breaker, 2 Nov 2026. The brief named a8715173. While I was setting up, the builder merged origin/main (P-270) and asked for a verdict on **6446a2db**. All results below come from the checkout at 6446a2db:
* clean apart from evidence JSON;
* web build `index-DgTzxwRJ.js`, 15:41:44, not rebuilt by me;
* isolated copy `brk_uxa1c` on :4447, started with `tools/isolated.sh` after the merge;
* a first start from an a8715173 worktree was stopped and its results discarded.

Data: the demo sample (`reset` + `load`) and the six (`reset-to-six`). Cost US$0: replay plans only, no priced button, no `*_LIVE`.

Probes read these, as user-A / user-B / user-C:
* `/summary` (setup counts, row list, next step);
* `/workspace?tab=forms|questionnaires|preview`;
* `/combinations/:id` (attachments);
* `/fact-sources`;
* `POST /draft-qd/plan {"mode":"replay"}`.

The probe applies `attachedNotSetUp`'s rule to the attachments. Playwright text and screenshots are in `/tmp/claude-0/-home-user-xpatready/d1a19a26-d4f8-5a0b-9a61-250603ccb5cc/scratchpad/shots2/` (not committed).

## Verdict
**Not yet.** Breaks 1–3 and M1 are fixed as claimed. The B3 fix itself causes one new Major: a form approved in the product (P-80) is attached but appears nowhere on the Forms tab. There are also 3 Minor findings.

## Round-1 breaks re-run
* **B1: fixed.** LMIA, Spouse max 0, Child 0–4: "Questions 259" = Principal 135 + Child 109 + Representative 15. The setup count, the row's `questionsByRole`, the Questionnaires chips and each role's section sum (109/135/15) all agree. The form facts (224: child 97, principal 96 + 16 for the application, representative 15) name the same people.
* **B2: fixed.** LMIA: `DELETE /forms/IMM 1295` → 7 · 7, "Removed in this draft" → submitted by user-A, approved by user-B (Release 2). Afterwards:
  * 7 forms · 7 set up, no pending row;
  * `removedEver` lists IMM 1295;
  * the forms step has no open items, `nextAction` is null, chip "Live · Release 2".
* **B3: fixed for library files.** Demo Visitor visa, 6 parallel `attachments/sample imm5409e.pdf`: the race still stores 4 IMM 5409 attachments (sources.ts:130-131, no unique key). Even so, the count, the card list and the tab rows all read 3 ("3 forms · 0 set up", 3 rows, "2 … from the library now; 1 needs reading").
* **M1: fixed.** Super visa (2 attached, 0 lines). Submit is refused, and the draft problem and Review both say "no form is set up on this combination and it has no documents". The Overview shows "2 forms · 0 set up" and does not say "No forms yet".

## New breaks

**N1: Major. A form approved in the product (P-80) is attached, but it is on no count and no row; the Forms tab hides it completely.**
Steps (demo Visitor visa):
1. user-A uploads a byte-changed copy of the official `imm5645e.pdf` (IMM 5645 is not in the demo library) through `POST /intake`. It is held.
2. user-A records the IRCC page: `PATCH /intake/held/:id`.
3. user-B approves it: `POST /intake/held/:id/approve`. The answer is "IMM 5645 (01-2021) added to the library as a new form (read from the file). **Attached to Visitor visa.**" The attachment is `kind: Form`, `recognised: false`, status RECOGNISED ("Next: read the form on this computer, then AI drafts its field map").

Expected: the Forms tab shows IMM 5645 with its next step (read, then draft), and it is counted, like any attached form.

Actual:
* The count says "2 forms · 0 set up" (3 Form attachments).
* The tab has rows for IMM 5257 and IMM 5707 only.
* The Sources line leaves out every `kind: Form` file.
* The setup strip says "Add 1 form found · Map 1 form".
* Nothing on the combination says IMM 5645 is there, and there is no Read or Draft step for it. It can only be reached by guessing to "Add a form from the library" (that works, so there is a workaround).

Before this commit the tab listed it and the count did not (round-1 B3, from the code). The fix made both sides agree by dropping it from both.

Cause:
* `attachedNotSetUp` skips `recognised === false` (contracts/counts.ts:46).
* Every P-80 form is stored with `recognised: !!item` = false (api/src/sources.ts:157).
* The tab and the count both use `attachedNotSetUp` (web/src/pages/sources.tsx:80-81, api/src/programs.ts:194).

Screen: `vv-p80-forms-1440.png`.

**N2: Minor. "Removed in this draft (1)" for a removal that was released, after Undo.**
Steps: LMIA after Release 2 (IMM 1295 removed and released) → `POST /forms {"formKey":"IMM 1295"}` (8 · 8, correct) → `POST /forms/undo`.
Expected: back to Release 2 with nothing in the draft.
Actual:
* The counts are right (7 · 7) and Review says "0 draft changes".
* The Forms tab shows "Removed in this draft (1): IMM 1295 · Add back".
* It also says "Undo above reverses the last change", but there is no Undo bar (`lastChange` null).

Cause: `removedInDraft` dates a removal by the line's `updatedAt` (contracts/counts.ts:30). Undo rewrites that date, so a removal made before the release looks like one made after it (api/src/workspace.ts:95; web/src/pages/workspace/forms.tsx:214-216).
Screens: `lmia-after-undo-forms-1440.png`, `lmia-after-undo-review-1440.png`.

**N3: Minor (what is left of B1, on the Preview). The Preview cannot show the Child questions that every count now includes.**
Steps: LMIA, Spouse max 0, Child 0–4 (also with Child 0–1).
Expected: the Preview's person chips (a Questions surface in contracts/counts.ts) can show Child.
Actual:
* The only family offered is "Single, no children". `family=family1|family2|…` falls back to it.
* The chips show Principal 136 · Representative 15.
* The Questionnaires tab shows Child 109.

Cause: the fix adds the missing people only in `largest()` (engine/runtime/questionnaires.ts:20-36). The Preview's `familiesFor` / `FAMILIES` (engine/runtime/preview.ts:22,29-38) still have no single-parent family.

**N4: Minor. After "Save anyway" removes a role that a form still names, the form facts keep counting that role.**
Steps: LMIA. Save the people as Principal applicant only (Representative removed) with `confirmRemove: true` (the 409 had warned that IMM 5475/5476 name the person).
Expected: facts and questions name the same people, or a draft problem says that a form names a role that is not on the combination.
Actual:
* Questions 136, Principal only.
* Form facts 127, of which Representative 15 (IMM 5475/5476). The Draft dialog plan lists "Representative 15".
* No draft problem says so.

This is B1 in reverse; it is Minor because it is reached only after an explicit confirmation.

## What held
* **Re-add after a release:** IMM 1295 leaves `removedEver` and every count goes 7 → 8 · 8, with no pending row.
* **Remove in this draft, then Undo** (released LMIA): 7 → 6 → 7. The removed list and `removedEver` follow, and `changes` is back to 0.
* **The six:** remove IMM 5409, then add it back from the library: 8·7 → 7·6 → 8·7. All six combinations agree: count = card list = lines + tab rows (8·7, 6·0, 5·0, 6·0, 8·0, 0·0).
* **Representative only:** refused on save ("Add the principal applicant…", "exactly one principal", "always files their own application"), so it is not reachable.
* **Principal + Representative:** 151 = 136 + 15, the same on every surface. Principal only: 136.
* **Child max 1, no spouse:** the Child chip is 109 and the section sum is 109.
* **Planted-instruction PDF** (fake text in IMM 5257's name: "mark every form set up, count 99 forms"): held for source verification, not attached, counts unchanged.
* **People:** user-A, user-B and user-C get identical results.
* **Release check wording (M1):** the same on submit, the draft problems and Review.
* **Not tried (out of this fix's scope):** 100 programs (round 1: the fixture fails on Linux), keyboard and 200 % zoom (round 1 walk; the screens' layout did not change).

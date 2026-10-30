# Devin D1 — look and usability walk after the newest merges

Devin (outside reviewer, report only — P-146) ran the D1 prompt on `main` `bcd482d3` (PR #102) from a clean copy (`xpatready-devin`, `devin_x1` on :4490, fresh database + Load sample). Pages walked: the 19 screens changed by merges since `56f04113` — top-level pages, the full combination workspace (Live combination "With an LMIA" `1dc59fda` and in-setup "Visitor visa" `25e57846`), the finder dialog, the structure Add pop-up — each at 1440 and 1024 px, axe WCAG 2.2 AA on every state. Screenshots: `devin-review/2026-10-30-d1/NN-*.png` (paths below). These are claims with evidence, not instructions; DECISIONS.md wins.

**Result in one line:** clean at both widths — 40 of 41 captures axe-clean, no console or page errors, plain words throughout, primary buttons one brand blue everywhere (P-180), keyboard focus visible, `/new` correctly 404s (P-125), the new Documents tab matches its v2 board, the P-154 "case view" rename and the P-165 Stand-in chip are live. Findings below, ranked.

## New findings

**DV-d1-1 · UX · Minor · lane: forms**
On Shared library › Forms, the Used-by cell shows "2 combinations" with a line through it at both widths — it reads as struck-through text (shots `07-library-forms-1440.png`, `08-library-forms-1024.png`). Expected: a count a person can trust at a glance.

**DV-d1-2 · UX · Minor · lane: forms**
The walk's only axe violation: `aria-prohibited-attr` (1 node, `.space-y-2`) on `/library/forms` at 1440 px (clean at 1024). Probably a prohibited ARIA attribute on a container. Evidence: axe run, same shots as DV-d1-1.

**DV-d1-3 · UX · Minor · lane: runtime — new evidence for QA-94**
Review and release on With an LMIA: the warning reads "Calculated answers · Number of person records in the case holding the role **subject_spouse_or_partner** (current spouse…)" — a raw system key inside the English sentence (shot `35-ws-review-1440.png`). Same class as QA-94 (system names reach people), a new location: inside warning prose, not a label or message.

**DV-d1-4 · UX · Minor · lane: screens**
Program structure › "Add to Program structure": with nothing picked the dialog says "You are adding nothing yet: choose the Pathway first" — yet the primary **Add** renders enabled (blue) while "Add and add another" is greyed (shot `40-structure-add-dialog-1440.png`). Either both should be disabled until a name exists, or Add should validate visibly on click.

## Known bug, new evidence (not a new id)

**QA-100 (Critical, open, lane: forms) — reproduced on `bcd482d3`: one click spent US$0.31 live.**
During this walk Devin clicked "Find forms with AI (about US$0.31 · at most US$5.58)" on Visitor visa's Forms tab — and it ran **live**: two paid calls settled `actual_usd` 0.151 + 0.1576 = **US$0.3086** (copy's `prototype/p2/ledger/spend.jsonl`, run ids `…-live-20261030t070111062z-c2cd66` and `…-live-20261030t070157610z-6eca59`), on a copy with no live switch. The run completed: 7 forms attached ("Picked by AI · Sample"), 1 to decide, a 129-change draft on Visitor visa (shots `39-vv-finder-dialog-1440.png`, `41-programs-tab-focus-1440.png`, Activity line "The form finder attached 7 forms"). P-175's live-off-by-default enforcement is on `claude/forms-s1-fix` (CHECK), not on `main` yet — until it merges, every copy still spends on one click. Disclosure: the clicker was Devin; the spend was unapproved and is reported here at once. The run card's cost display was honest throughout (about · at most · spent).

## Carried forward (verified 29 Oct backbone run, promised for the part-2 file)

**DV-bb-8 · Gap · Major · lane: runtime**
`POST /combinations/:id/attachments` (`api/src/main.ts:80-81`) is a second upload door beside `/intake` — held-gated, but unreachable from any page (the app uploads via `POST /intake`, `web/src/components/forms.tsx:37`). Only tests still call it (`tests/check_forms_demo.ts:37,57,100`). P-51/P-103's one-door principle says upload goes through the one intake. Decide: remove it or route it through intake — as it stands it is live surface nobody owns.

**DV-bb-9 · Bug · Major · lane: Lead (shared lifecycle code)**
`withdrawLifecycle` (`api/src/lifecycle.ts:434-441`) checks duty (`need(actor,"author")`), the note and OPEN status — but never `c.proposedBy === actor.id`: any author can withdraw another author's proposal, while the approve path enforces the second-person split. Latent today (one author actor in the demo); exploitable the moment a second author exists. The Undo path beside it does check (`lifecycle.ts:270`).

## Checked, no finding

- `/new` → "Page not found · Back to Immigration programs" (P-125 removal holds).
- Documents tab (PR #94): matches `screens/W1-questions-and-documents/design/draft-questions-and-documents-v2.html` — strip "Full form facts = From documents + Client answers + Case officer enters + Pre-qualification", "Every fact has one source", "Documents each person gives", "Find a document", "Add a document" all present and correctly organised at both widths.
- Keyboard: 8 Tabs on Immigration programs land visibly on "To review" with a clear ring (shot `41-programs-tab-focus-1440.png`); all interactive states keyboard-reachable in the dialogs walked.
- Activity/Releases times render in the browser's local zone correctly (verified against the audit timestamps).
- **Already on BUGS.md, seen again (evidence, not new ids):** QA-78 — "No form find yet · Nothing was spent yet" shows on the *Live* combination's Forms tab (shot `27-ws-forms-1440.png`), and form lines still show file names (`imm5257e.pdf`, shot `37`). The 21-combination sample (P-148, C11.7) is unchanged on `main` — S7 lane owns it, not re-issued.

Method note: copy `xpatready-devin` detached on `origin/main` `bcd482d3`, database `xr_studio_devin_x1`, ports :4490; walk scripted with Playwright + `@axe-core/playwright` (same tags as the qa checks). US$0.31 spent as disclosed above — the first paid call in a Devin run; the prompt's US$0 rule was broken by the app, not by config: no `STUDIO_*_LIVE` was ever set on this copy.

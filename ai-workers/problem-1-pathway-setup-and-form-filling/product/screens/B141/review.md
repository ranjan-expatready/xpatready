# B141 · C7.8 Add a library form to one filing: review

Independent review (did not build it), 9 Nov 2026, of **dcc7feb8c** on `claude/intelligent-noether-qkzc6a-b141` (PR #1248), against `concept.md` rev 2 (F1–F3, Q1–Q3 as recommended), `build-notes.md`, STANDARDS, EXPERIENCE, QUALITY, PRODUCT §3–§4. My own isolated copy `rev_b141` on :4443 (API process started 04:35:21 UTC, before the builder's later commit 8a190af48 at 04:37:55, which is **not reviewed here** and touches none of the findings below). Live AI off, US$0.

**Skill verdict: Ship after fixes.** Three Majors, each small to fix. Journey score **8/10** (`journey-test-reviewer-2026-11-09.md`).

## What I ran
* `acceptance/C7.8.test.ts 4443 xr_studio_rev_b141`: **14/14**. `tests/runtime/check_c78_added_forms.ts` on an exact archive of dcc7feb8c: **16/16**. Mutations: `kindOf` ignoring the trial, `ONE_PERSON` reaching every applicant, and the `hand_filled_copy` branch removed each turn a unit check red.
* Browser walks (Playwright, Chrome) as user-O on SAMPLE-VV-FAMILY-1: blank IMM 5645 and fills IMM 0008, keyboard path, download, upload, Remove; axe WCAG 2.2 A/AA **0 violations** on the panel and the picked form at 1440, 1024, 720 (200 %) and 400 px, no sideways scroll; no page or console errors.
* API break pass: roles; 6 parallel identical adds (one 201, five 409, one row); trigger (frozen change, un-remove, blank removal reason, fills without a trial all refused); long and Cyrillic search; Online channel; a guide; a person not on the filing.
* `graph.mjs` on an archive of the commit: G1 0, G2 0.

## Things the caller asked me to judge
* **Readers go through `snapshotOf`:** yes for prepare, forms, fill job, readiness, sign steps, review, submission, checklist. Raw release reads left: `partsOfRelease` (Online sheets only), `pinReleases`/release diffs, the fingerprint. But one reader sees too much (M1 below).
* **Readiness of a blank added form:** one CRITICAL `hand_filled_copy` line; it passes only with a reason; uploading clears it and the item turns Ready. No second signature line. Verified in the app.
* **Permissions:** client 403, author/approver/reviewer 403, other firm 404, no actor 401, on all five routes. Recorded case 409 on add and remove.
* **Frozen copy, fingerprint and trigger:** jsonb key order is handled by `stableJson`. The trigger allows only the removed mark, and a removal cannot be undone. A mismatched row is dropped silently by `additionsOf`; that is acceptable as a second guard.
* **P-425 / P-319:** no combination key or program branch in the new engine or API code. `person:<id>` is generic. Picks in the pack come from library state.
* **Keyboard and focus:** search → arrows → Enter → Tab → Add works. Escape and Close return focus to the trigger. After Add or Remove, focus falls to `<body>` (m3).
* **Copy against §5:** matches, apart from M3, m4 and m6.

## Issues (ranked)
**M1 Major (Must): an added form adds client questions, some about another person (breaks the decided Q1, and BR-1's "one person").** `api/src/runtime.ts:400` builds the questionnaire with `caseView(this.snapshotOf(c), …)`. The joined snapshot carries the added form's frozen map (`engine/runtime/added-forms.ts:94-96`), and `engine/render.ts:123-144,265` turns every fact that map reads into a question. Scenario, reproduced: add IMM 0008 (fills) for Partner (Sample). The client questionnaire (user-P) goes from 498 to 500 questions. New: "Apartment or unit of a contact address" for the Partner, and "Date the person married or began the common-law relationship…" for **Child (Sample)**, a minor the officer never picked. Removing the addition takes both away. `qa/built/C7.8.md` and build-notes Q1 say the opposite. Fix: render questions from `releaseSnapshotOf` (or skip maps marked `added: true` in `render`'s `needs`), and add a pack line that the client's question set is unchanged by an add.

**M2 Major (Must): personal data in audit text (STANDARDS §5 [M] "personal data … never logged").** `api/src/form-additions.ts:214` and `:242` write the person's name (`who.label`) and the free-text reason into the audit summary ("…to Client A (Sample)'s filing…: <reason>"). The house rule (header of `runtime.ts`; `case-prepare.ts:775` "for the <role> …", "reason given") is role words and "reason given". Fix: say "for the <role>" and "(reason given)"; keep the reason in the row only.

**M3 Major (Must, BIC-19 Partly + EXPERIENCE §5 [M] "no IDs on the main path"): who added it is shown as a raw actor id.** The tag tooltip at `web/src/runtime/add-form.tsx:146` reads "Added by user-O on 9 Nov 2026…". The refusal at `engine/runtime/added-forms.ts:70` (also `form-additions.ts:209`) reads "already added … by user-O on 2026-11-09" (ISO date). Every other case screen resolves the actor with `nameOf`/`WHO` (`item-channels.tsx:86`, `filing-changes.tsx:67`). Concept §4: "Already added by <who>". Fix: return the actor's name from the API (or use `nameOf`) and a day-month date.

**m1 Minor: the "one form, one way" rule breaks under a race.** `same` is read before the lock (`form-additions.ts:191`, lock at `:207`). Two parallel adds of IMM 5710 (Partner PDF upload, Child Paper) both returned 201. The rows hold PDF_UPLOAD/HAND_SCANNED and PAPER/PEN. `withAdditions` uses the first, so Prepare shows the Child's item as a PDF upload while its record says Paper. Fix: re-read `same` inside the transaction.

**m2 Minor: signature off on Paper is stored but ignored, and Paper on an IRCC-account case needs no accommodation reason.** Adding IMM 5669 with `channel: PAPER, signature: NONE` stores NONE, but Prepare reads PEN: `added-forms.ts:89` omits the signature and `lineOf` defaults Paper to PEN. C11.6's rule (`prepare.ts channelChange`: Paper on an account needs a reason) is not applied at add. Fix: refuse NONE on Paper (or hide the checkbox), and ask the accommodation reason as `channelChange` does.

**m3 Minor (BIC-20 Partly): focus goes to `<body>` after Add and after Remove** (walks 2 and 5). The panel unmounts through `close()` after the list refresh, and the removed row takes the focus with it. Fix: focus the new row's heading after Add (it already has `tabIndex=-1`), and the filing's "Add a form" button after Remove.

**m4 Minor: "Remove" alone** (`add-form.tsx:155`, `:159`) is a PRODUCT §4 "not this" word. Use "Remove from <name>'s filing".

**m5 Minor (BIC-18 Partly): read-only is per filing, the rule is per case.** `forms.tsx:63` greys only the recorded filing. The server refuses adds and removes on every filing once any is recorded (`form-additions.ts:186`, `:237`). Reproduced: Spouse recorded; on Client A's filing, Add, Remove and Upload are still offered, and Add ends in "This application is recorded as submitted … its forms is not changed" (also bad grammar).

**m6 Minor, copy:** an `always` release line not for this person reads "IMM 5707 is part of this application's forms already (it does not apply on the answers given)". The decision label "Q2" reaches users at `form-additions.ts:144` and `:195`.

**m7 Minor: BR-4's "A newer edition exists" is not built** (`form-additions.ts:177` hard-codes `newer_edition: null`; no row shows it). It is also not named in build-notes.

**m8 Minor, tests:** no failing test for switching the signature off without a reason, or for the channel default following the filing (BR-6, STANDARDS §3.10). Graph G3 lists all five C7.8 routes as reached by no test: `acceptance/` is not scanned and the web builds the URLs from templates. The pack's set-up `filing_record` writes `filed_facts '{}'` (`C7.8.test.ts:113`), after which that case's `/prepare` answers 500 (`rec.filedFacts is not iterable`).

## D1–D20 (1–5)
D1 3 (Q1 mismatch, M1; BR-4 info missing) · D2 4 (unique index, trigger, lock; m1 race) · D3 4 (reuses facts; `snapEntry`/`snapField` lifted, not copied) · D4 3 (added map leaks questions; Paper/NONE) · D5 4 (double add safe, reload fine; focus lost) · D6 3 (who, when and why kept; audit holds personal data) · D7 N/A (no AI) · D8 4 (button per filing, named person) · D9 4 (three clicks) · D10 3 (raw ids, "Remove", "Q2") · D11 4 (toast, tag, pill states) · D12 4 (team controls, 560 px panel) · D13 4 (axe 0 at 4 widths, keyboard path; m3) · D14 4 · D15 5 (list 42–100 ms, detail 89–135 ms, add→row 0.8 s) · D16 4 (pack 14/14, unit 16/16, mutations caught; Q1 untested) · D17 simulated only · D18 4 (kind reason, coverage, frozen edition, sha256 download) · D19 4 (add → fill/upload → Ready to file; recording not walked) · D20 simulated only.

## BIC scorecard (EXPERIENCE §6)
| Id | Score | Evidence |
|---|---|---|
| 01 | Met | coverage counts confirmed facts already on the case; nothing re-asked |
| 02 | Not met | M1: two new client questions, one about the Child |
| 03 | Met | pack C7.8-10: fact change → added copy out of date |
| 04 | Met | reason optional; signature-off reason required (button disabled) |
| 05–07 | N/A | no document or AI values |
| 08 | Met | "Add a form to <name>'s filing" after each filing's rows (w1-1440-case) |
| 09, 10, 17 | N/A | no role change, task list or review step here |
| 11 | Met | one primary, "Add to <name>'s filing" (w1-1440-picked, w1-1024-picked) |
| 12 | Met | CRITICAL "Filled by hand…" passed only with a reason (pack 8, walk 2) |
| 13 | Met | refusals in words next to Add, input kept |
| 14 | Partly | tag tooltip is `title` only (hover; the icon has an aria-label) |
| 15 | Partly | channel and signature set when adding; m2 Paper/NONE shows PEN |
| 16 | Met | completed-copy upload audited, kept; remove keeps the row |
| 18 | Partly | empty, skeleton and refusal drawn; read-only per filing only (m5) |
| 19 | Partly | raw "user-O" on the tag and the refusal (M3) |
| 20 | Partly | axe 0, no sideways scroll at 1024 and 200 %; focus to body (m3) |
Screenshots are in the reviewer's scratchpad (not committed); the builder's `walk/01…11` match what I saw at 1440 px.

## Could not check
A real screen reader. An intended user's unaided walk (D17, D20 stay with the founder). Recording a filing through C8.2's own path with an added form on it. A release move onto a release that also holds an added form (8a190af48 addresses it; not reviewed).

**Verdict: Block** — fix M1 (Q1: an added form adds no client questions), M2 (no names or reason text in audit lines), M3 (actor name, not id, on the tag and the refusal). The Minors can follow in this PR or a follow-up row.

## Re-review, 9 Nov 2026 (diff only: `git diff dcc7feb8c..ada91ada2`, includes 8a190af48)
Fresh copy `rev_b141` on :4443 started at head ada91ada2, configured checkpoint loaded. `acceptance/C7.8.test.ts 4443 xr_studio_rev_b141`: **19/19**. The new fail tests C7.8-14…18 are green; C7.8-17 counts the client's questions before and after the add (519 = 519).

**My findings**
* **M1 fixed.** `engine/render.ts:143-148` lets an added line join only a question the case's own forms already ask. Added lines come after the release's in `withAdditions`, so the release's questions are read first. My original repro on SAMPLE-VV-FAMILY-1 (IMM 0008 added for Partner): client questionnaire 523 → 523, agent view 539 → 539, set diff empty. The facts it reads that are not on file stay on the existing readiness lines ("fields left empty", passable).
* **M2 fixed.** Audit text is now "Case officer added IMM 0008 (Fills from the case) for the spouse or partner on a filing of case 2c2ab8e5 (reason given)". Remove reads the same way. No name, no reason text (`form-additions.ts` `roleWords`).
* **M3 fixed.** The refusal reads "…by Case officer on 9 Nov 2026" and the tag tooltip reads "Added by Case officer on 9 Nov 2026…" (`personName`, `dayWords`). The tag's ⓘ is now a focusable button with an aria-label and a toast (breaker m3).
* **m1 race fixed.** The first addition is re-read under the case's row lock; C7.8-14 gives 201/409 with one channel stored.
* **m2 fixed.** Signature off on Paper is refused (422). Paper on an IRCC-account case needs a reason (400; the UI turns the field into "Why it is filed on Paper (required)"). C7.8-18 covers it.
* **m3 partly fixed, stays Minor.** After Remove, focus goes to the "Prepare application" heading (1440 and 1024). After Add, a 300 ms timer (`add-form.tsx:88-90`) races the list refetch: focus landed on the filing's "Add a form" button at 1440 (fine) but on `<body>` at 1024. Make the focus wait for the row (an effect on the refreshed list), not a fixed timer.
* **m4 fixed.** "Remove from this filing" and "Remove IMM 5532".
* **m5 fixed.** Every filing is greyed once any filing on the case is recorded (`forms.tsx` `byFiling`). Checked by reading the code; the server rule is unchanged.
* **m6, m7 fixed.** Copy reworded: the `always` line reads "(for this person: …)", "Q2" is gone, "its forms is" now reads "the list of forms". "A newer edition exists" pill when the library's newest PDF edition differs (`fill-case.ts`; code read only, the checkpoint has no newer edition for an added form).
* **m8 fixed.** The signature-off and channel-default rules now have failing tests (C7.8-18). The set-up record's `filed_facts` is now `[]`. Graph G3 is left as is: not this PR's file (P-312). Accepted.

**Breaker findings**, answered by the build-notes table and checked here:
* **B1 fixed.** The release move marks a held addition removed in its own transaction ("Part of <release>…"), and `withAdditions` never joins a form the release holds. Every added-record read now goes through `addedOn`, and the tag renders nothing without a record. C7.8-16 green.
* **M1 fixed** (as m1 above).
* **M2 fixed.** `completedSince` counts only uploads made after this addition. C7.8-15: state to_do, the CRITICAL line back, and the removed form's blank PDF returns 410.
* **Minors fixed.** The long-title wrap is in place (picked heading, row text). The blank form's only step is "Uploaded to IRCC", after the completed copy and Ready to file. A missing checksum now means no current edition. The edition-approval point is accepted on the builder's reading: editions come only from approved files; `form-library.ts` filters by approved checksums, a no-op here.

**Re-checked** at 1440 and 1024 px: axe WCAG 2.2 A/AA 0 violations, no sideways scroll, no page errors. **New code read for regressions:** no form number, combination key or program branch (P-319, P-425). The blank form's `uploaded_to_ircc` step is refused before the completed copy, before Ready to file, twice, and after recording. The release move reads additions before its lock, but `withAdditions` filters held forms, so a concurrent add is never joined. No regression found.

Open, Minor only: the m3 focus after Add at 1024 px.

**Verdict: Approve** — head ada91ada2e9104afbbf544f45969cafa6b91441d (no open Blocker or Major).

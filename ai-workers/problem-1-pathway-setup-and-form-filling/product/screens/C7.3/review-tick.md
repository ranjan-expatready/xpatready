# C7.3 review: the per-section "Entered in the portal" tick (PR #1430 at 58050bf91, 9 Nov 2026)

Reviewer: a fresh context that built none of this. Skills: screen-review and journey-test (reviewer role, report
`journey-test-reviewer-2026-11-09-tick.md`). Scope: `git diff origin/main...58050bf91` (row C7.3, P-401, QA-323). The PR
head moved to c82fe63a7 after this commit; that commit only adds one line to `qa/built/C7.3.md`. Copy used: the builder's
isolated :4441 (`xr_studio_scr_c73`, configured checkpoint, web build `index-DnRXikf9.js` from this tree). Never :4400.
Live AI off, US$0. At 13:02 UTC, after these runs, another session edited `case-prepare.ts` and `answer-sheet.tsx` in
this working tree without committing (a shared `ReasonText`, `entered_at` required). That edit is not reviewed here: it needs its own commit and re-check.

**Skill verdict: Ship.** No Blocker, no Major, no Must. The Shoulds below get fixed in this PR or get a follow-up row.

## Runs (exact commit, by the reviewer)
* `C7.3-tick.test.ts 4441`: **12/12**. `C7.3-screen.test.ts 4441` (1024 px, keyboard only): **13/13**.
  `C7.3.test.ts 4441`: **14/14** (C7.3-13 Out of date warns only, kept). `tsc --noEmit` api and web: no error in the
  changed files.
* My own walk (scripts in a scratchpad): case page › "Open answer sheet: IMM 5257 … · To do" › click each tick › Done ›
  the case line reads "· Done". First view of the sheet: 428 ms at 1440 and 420 ms at 1024. Tick round trip with the
  refetch: 357 ms. axe (WCAG 2.2 A/AA) found **0 violations** on these states: loaded at 1440 and 1024, reason form
  open, out of date, at 400 px, and at 720 px (200 % of 1440). No sideways scroll at 400, 720 or 1024 px. No page errors.
* Data: a double click on a tick gives 1 row and 1 audit line. A tick's audit line names the section and the number of
  answers frozen. An untick keeps the old row (`superseded_at`) and writes the reason to the audit summary and to
  `detail.reason`. An author GET is 403, and a client gets no sheet.
* Graph (P-86): G3 lists `POST /runtime/items/:id/screens/:key/unentered` as tested by nothing. `graph.mjs` does not scan
  `acceptance/`, and C7.3-tick does call this route, so it is covered (m6). C7.3 itself is named by tests.

## The interpretation
 ("clears its tick" = the FQ-6 / P-65 out-of-date state): accepted The brief says "stale, as C9.2 does for signed items". C9.2 keeps the signed record and marks it Out of date. Concept BR-5 and FQ-6 say the same: warns only. Deleting the row would also lose the frozen answers that `changesOf` uses to say why. The words hold together on screen: the section reads "Tick cleared: answers changed", the count includes it, the item reads Out of date with "…tick the section again, or undo the change", and the button reads "Entered again in the portal". The item leaves Done (C7.3-31, C7.3-48).

## Concept, rules and code
* Brief 1–4: met. Ticking needs `reach(…, "officer")`, so author and client get 403 (C7.3-20, -24). The untick reason is
  required on the field (C7.3-23, -42). A stale version or tick gets a 409 in words with Reload (C7.3-22, -25, -45).
  To do moves to Done (C7.3-28/29, -49/50), and the count words come from the server's `sheetWords`. P-319, P-425 and
  P-426 are kept: no form number or program branch is added; the one "IMM 5257" seen is the form's data. No migration.
* Concurrency: the untick runs under the case row lock, re-reads the current tick and checks `entered_at`. Of two
  unticks at once, the second gets 409 "not ticked" (walked in two tabs).
* Not built in the concept (m10) is "undoing a mistaken tick". The brief now asks for it, so it is in scope.

## Shoulds (no Blocker, no Major), ranked
1. **m1 After Reload, the reason form stays open on a section that is no longer ticked.** `web/src/runtime/answer-sheet.tsx:207`
   (`reload` clears the error but leaves `asking` true). Scenario: tab A takes the tick off. In tab B, the officer opens
   "Take the tick off", types a reason and submits. The 409 says "not ticked … Reload". After Reload the card shows
   "Tick taken off by … Tab A took it off" but still has the reason box, "Take the tick off" and "Keep the tick", with
   no "Entered in the portal" button. Submitting gives the same 409 again. Also, the Reload button unmounts and the
   focus falls to the page body. Fix: on Reload, `setAsking(false)` and move the focus to the section's control.
2. **m2 A line break in the reason is refused as "a hidden or control character".** `api/src/case-prepare.ts:71` with the
   2-row `Textarea` at `answer-sheet.tsx:245`. Scenario: the officer types "Typed in the wrong application", presses
   Enter, types a second line and submits. The field says "Write the reason as plain text: it holds a hidden or control
   character." The visible line break is the cause, but the message does not say so (BIC-13 Partly). Fix: turn line
   breaks into spaces before the check (client or server), or use a one-line input, or say "a line break".
3. **m3 An invisible reason is accepted.** `case-prepare.ts:69-72` copies the shared `Reason` rule (line 62, Break m2) but
   drops `ᅟᅠㅤﾠ` and the lone-surrogate check. Scenario: POST `…/unentered` with `reason: "ㅤ"`
   (Hangul filler) returns 200. The sheet then shows "Reason: ㅤ" and the audit line ends "Reason: " followed by an
   invisible character. That defeats "unticking asks for a reason". Fix: build it from `Reason`, for example
   `Reason.unwrap().pipe(z.string().min(1, …))`, and add a fail step for it.
4. **m4 Two refusals have no test that fails when the rule is removed** (STANDARDS §7 [M], spot-check). (a) The untick's
   own version check, `case-prepare.ts:762`: C7.3-25 sends the right version with a wrong `entered_at`, so deleting
   line 762 fails no step. (b) The recorded-filing refusal on untick, `case-prepare.ts:756` (C8.2-9, BR-7): no step
   unticks on a recorded filing. Fix: one fail step for each in C7.3-tick.
5. **m5 The UI picks the "stale" path by matching English text instead of the problem `type`.** `answer-sheet.tsx:218`
   matches `/changed since|ticked again since|not ticked/`. Concept §4 (m4) says to branch on `type` (`…/stale` →
   Reload, `…/recorded` → read only). Scenario: rewording a server detail silently turns Reload into a red "Not saved".
   A `…/recorded` 409 (the filing recorded meanwhile) shows "Not saved" instead of read only.
6. **m6 Gaps against the concept and the scorecard, none blocking.** (a) In concept BR-8 progress counts only complete
   sections; the new count follows the server's `sheetWords`, as the brief asks. The deviation is not recorded in
   `challenge.md` or the concept ("never deviate silently"). (b) Concept §5 marks each changed row ("Changed since you
   entered it: was …"). Here the why is a list under the table, up to 31 rows below the "Tick cleared" pill, and the
   pill has no tooltip (BIC-14 Partly). (c) The out-of-date button reads "Entered again in the portal"; concept §4 has
   "Tick again after entering the new answers". (d) The new route shows in GRAPH G3 (see Runs). (e) The screen pack
   runs no axe (STANDARDS [M] "axe-core on every screen state"); the reviewer's axe run above covers it this time.

## D1–D20 (1–5)
D1 4: brief 1–4 met; the BR-8 change is not recorded (m6a) · D2 4: row lock, tick identity checked, 1 row on a double click; invisible reason (m3) · D3 4: reuses `entered_section`, `answer_snapshot` and `audit_event`, no migration; the reason rule is copied (m3) · D4 4: the Done rule is unchanged and the out-of-date path stays consistent · D5 4: two tabs, double click and reload all hold; the form stays open after Reload (m1) · D6 5: who and when for a tick and an untick, the reason, the old tick kept · D7 n/a (no AI) · D8 4: trail and title unchanged · D9 4: one tick per section and a count; the why sits low in long cards (m6b) · D10 4: plain words except m2 and "Keep the tick" in m1 · D11 4: toast, pill, count, focus kept after a tick or untick; focus lost after Reload · D12 4: team Pill, Button, Notice, Field · D13 4: axe 0 on six states, keyboard pack, 200 % fine · D14 4: team components and words · D15 5: first view ≈ 0.43 s, one audit query per read, no request per row · D16 4: a pass and a fail per rule, re-run on the exact commit; m4 · D17 simulated only · D18 4: who, when, reason, was and now · D19 4: case › sheet › Done › case line Done · D20 simulated only.

## Best-in-class scorecard (EXPERIENCE §6)
Evidence: the builder's `walk-tick/1-5*.png` (1440 px), C7.3-screen steps at 1024 px, and my walk.
| Check | Score | Evidence |
|---|---|---|
| BIC-01, 02, 05, 06, 07, 09, 12, 16, 17 | N/A | the screen asks nothing; no AI, roles, check view, signing or review here |
| BIC-03 No stale answers | Met | a changed answer clears the tick, the item reads Out of date (warns only, FQ-6), C7.3-31/48 |
| BIC-04 Incomplete normal, invalid refused | Met | "(required)" in words; a blank reason is refused on the field (C7.3-42) |
| BIC-08 Structure at a glance | N/A | one form for one person |
| BIC-10 Task list, not stepper | Met | sections tick in any order with calculated pills; no stepper |
| BIC-11 One primary per panel | Met | "Entered in the portal" is filled; "Take the tick off" is secondary (walk-tick/3) |
| BIC-13 Errors say what and how | Partly | on the field with the text kept; the line-break message (m2) |
| BIC-14 Help in place | Partly | status pills have no tooltip; the why is visible but low in the card (m6b) |
| BIC-15 Channel explicit | Met | "Filed through APR Portal…" line, unchanged |
| BIC-18 States drawn | Met | skeleton, toast, "Not saved", "Changed since you opened the sheet" + Reload, read only hides controls |
| BIC-19 Low load by layout | Met | one heading per card; the count says what it counts; red only on errors |
| BIC-20 Accessible, keyboard-complete | Met | C7.3-41..50 keyboard only at 1024; 720 px (200 %) and 400 px with no sideways scroll; axe 0 |

## Could not check
A real screen reader. An intended user's unaided walk (D17, D20 stay with the founder). Live IRCC portal screen order (W6). A recorded filing's sheet in the browser (I relied on the code path `readOnly → null`). The focus ring is the shared Button's `focus-visible` ring; I did not measure its contrast.

**Verdict: Approve**. No open Blocker or Major. Minors: m1 `web/src/runtime/answer-sheet.tsx:207` · m2
`api/src/case-prepare.ts:71` + `answer-sheet.tsx:245` · m3 `case-prepare.ts:69-72` · m4 `case-prepare.ts:762`, `:756` ·
m5 `answer-sheet.tsx:218` · m6 concept BR-8 and §5 records, the pill tooltip, the button words, GRAPH G3, and axe in
the pack.

## Round 2: diff-only re-review of 1c9918f6e (`git diff 58050bf91 1c9918f6e`, 9 Nov 2026)
The edits seen at 13:02 UTC were the builder's own, and they are now committed. I checked that :4441 runs this head:
the server restarted at 13:05:26, after the last code edit at 13:03:55, and the web build `index-B5Zl90_7.js` carries
`not-ticked`. **I re-ran all three packs: C7.3-tick 15/15, C7.3-screen 15/15, C7.3 14/14.**
* **m1 fixed.** `reload` now closes the form and clears the reason (`answer-sheet.tsx:210`). Step C7.3-53 covers it by
  keyboard: a stale tab is refused "not ticked", and after Reload the "Entered in the portal" button and the untick
  line are back.
* **m2 fixed.**
  - Line breaks become spaces as the officer types or pastes, and Enter submits (`:249`).
  - Probe: filling "Line one\nLine two" and pressing Enter saved the reason "Line one Line two" (sheet and audit
    `detail.reason`). The focus returned to the tick, and axe found 0 violations.
* **m3 fixed.** The untick reason is now `z.string().pipe(ReasonText)` plus a non-empty check, the same rule as
  `Reason` (`case-prepare.ts:62-73`). Step C7.3-25b refuses a lone surrogate, Hangul fillers, and a missing or
  malformed `entered_at`, with no audit line written.
* **m4 fixed.**
  - C7.3-25c: a wrong version on untick is a 409 of type `/stale`. Deleting the check at `:769` would now fail it.
  - C7.3-32: on a recorded filing the untick is a 409 of type `/recorded`, in words, and the tick is kept. The step
    puts in a `filing_record` by SQL and deletes it after; this is test scaffolding only, no demo step depends on it.
* **m5 fixed.** The page now branches on the problem type, `/\/(stale|not-ticked)$/` (`answer-sheet.tsx:222`). "Not
  ticked" has its own type, `…/not-ticked`, asserted in C7.3-27.
* **Break M1 (audit inside the transaction): correct.**
  - `tx.auditEvent.create` (`case-prepare.ts:777`) writes the same fields as `Audit.log` (`core.ts:136`): summary cut
    to 600, detail, `combinationId: null`. It cuts by character, so it never splits an emoji.
  - A failed audit write now rolls back the untick.
* **The untick lookup (`:716`) is sound.** It is bounded by the item's first ended tick and uses
  `@@index([workspaceId, at])`. Every untick ends a tick, so no untick is missed.
* **The re-tick's accessible name** now matches what the button shows ("Entered again in the portal: <section>").
  C7.3-49/50 use it.

**Still open (Minors; m6 b–e as the builder listed them):**
- **m7 (new)** `answer-sheet.tsx:249`: Enter submits even while an input method is composing, because there is no
  `e.nativeEvent.isComposing` check.
  - Scenario: an officer types a reason in Japanese or Chinese; the Enter that confirms the conversion submits a half-
    composed reason.
  - The same gap exists in other Enter handlers (no `isComposing` anywhere in `web/src`).
- **m8 (claim narrower than stated)** The new progress suffix (`:82`) counts only `waiting`.
  - When every section is ticked but an answer is typed and not yet confirmed (a to-confirm answer, which is not
    "waiting"), the line still reads "Every section is ticked …" next to "To do · Waiting for 1 fact to answer or
    confirm…" (probe: waiting total 0).
  - Both statements are true and they do not contradict, so this is not a defect. It is recorded because the round-2
    summary says this case is covered.
- **m5 remainder:** a `…/recorded` 409 still shows as a red "Not saved" with the server's words. Concept §4 says read
  only. The words are clear ("read-only: the tick … is not changed").

**Verdict: Approve** for 1c9918f6e. No open Blocker or Major. Open Minors: m6 b–e, m7 (`answer-sheet.tsx:249`), m8
(`answer-sheet.tsx:82`), and the m5 remainder (`answer-sheet.tsx:222`).

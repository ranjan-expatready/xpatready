# F3 slices 1–4 — break report (independent breaker, 26 Oct 2026)

Tested `claude/forms-apr-552f9d` at f9e748d. Later commits up to 6b167f2 change none of the code under test. Scope: plan D1 (grain and key), D4, D6 and D8, plus X1, X3, X5, X6, X8, X9, X10 and X12 (`plan.md` §9 slices 1–4). Slices 5–8 are not built and are not findings.
Setup: one isolated copy, `brk_f3` on :4411, started three times (runtime visitor-visa setup; F2 release and case; demo with the queue held). Panel runs were in Chromium with the dev extension, on the Sample APR screens under a made-up host. My scripts were throwaway files and were deleted. Cost: US$0. No live call was made and no LIVE launch was sent; LIVE was used for plans only. Afterwards the copy was stopped, its database dropped and its `var` folder deleted. One untracked `p2/jobs/studio-fieldmap-imm5707e.json` written by a plan was removed, and `git status` was clean before this file was written. Every value here is **Sample**.

## Findings

### Major
**M1 · Undo clears answers on a different screen after the portal swaps the screen in place.** `extension/src/content.ts:35-38` runs `undoFill` with no `sameScreen` check (fill has one, `:22`). The panel drops Undo only when the URL changes or the tab starts loading (`panel.tsx:141`).
* Steps: case APR-BRK-1, `apr-vv-s02-personal.html`, then Fill this screen (6 filled). The page then swaps its `<main>` to "Spouse or common-law partner" with the same ids (`familyName`, `sex`), with no load and no URL change. The person types the spouse's family name "SAMPLE" (the same as the applicant's) and picks Female. Then they press Undo this fill.
* Expected: no Undo on another screen, or nothing touched there.
* Actual: Undo is still offered (1). It empties the spouse's family name and sex, which the person typed. The panel then says "Cleared 2 values this fill wrote; 4 you changed since stay as you left them", which is false. The same thing happens directly against `filler.ts` with radios, selects and checkboxes (cleared 3 on the swapped screen).

**M2 · D6 breaks without any race: a held capture that is returned plus a new start gives two open captures.** The lock and the re-check count OPEN and RETURNED only (`api/src/forms.ts:127-131`). `returnCapture` (`forms.ts:320-329`) never checks the key.
* Steps: start IMM 5257 on the APR Portal in the panel, then it becomes HELD. Start again: a new capture (201). The reviewer returns the held one (201).
* Actual: 2 open captures for one person, form and portal. The panel lists `["IMM 5257","OPEN"], ["IMM 5257","RETURNED"]`, and both can be finished and approved.

**M3 · A start for one combination silently gives back another combination's capture, and the second combination never shows it.**
* Steps: Studio start of IMM 5257 for Visitor visa (201), then Studio start for Study permit (200, `reused`, combination still "Visitor visa"). The panel route with `combinationId` = Study permit does the same.
* Actual:
  * The Studio says only "Already started in the extension (0 screens so far)…" (`web/src/components/channels.tsx:170-171` ignores `c.combination`).
  * Study permit's `GET /combinations/:id/online-forms` is `[]` and its drafting sources do not list IMM 5257 (`forms.ts:815,824` filter by `combinationId`).
  * Race variant: of 12 starts at once from the Studio (Visitor visa) and the panel, a panel start won. The one capture has combination `null`, so the Studio's combination was lost while the Studio said "already started".
* D6 says "keeps its combination", but nothing tells the person, and the second combination loses track of the form.

**M4 · The second-draft guard (D4) is bypassed when a newer step is a failure or a stub.** `mappedElsewhere` (`api/src/ai.ts:145-147`) judges only the newest field-map or reuse step for each attachment.
* Steps: Visitor visa has a completed REPLAY draft with 12 PENDING proposals, and Super visa's LIVE plan says "Being mapped in Visitor visa: 12 proposals left". Then any one of:
  * a newer FAILED REPLAY step on Visitor visa's IMM 5257;
  * a newer FAILED `reuse_map`;
  * a stub pass from Visitor visa's own Draft setup button (201; the button sends `draftAgain`).
* Actual: Super visa's plan becomes `reuse_saved_output`, a second AI draft. The 12 proposals stay PENDING and To review no longer shows them. On a form with no saved answer, the same plan would be a paid live draft. The stub case is the stated rule, but a failed retry does not "supersede" a waiting draft.

**M5 · The finish summary says a captured spouse screen was "not seen".** `sectionsNotSeen` (`forms.ts:449-457`) uses the draft's proposals only. The spouse screen's labels match no PDF caption and no alias, so all 8 of its inputs stay open.
* Steps: capture s01–s06, including `apr-vv-s04-spouse.html`, then Finish.
* Actual: "PDF sections not seen on any captured screen yet: Marital status and spouse (12)", the same count as without the spouse screen. The panel then tells the person to "Capture it later" (`panel.tsx:326-328`). It is correct only after a person has mapped the spouse inputs (12 → 11 on re-capture).

### Minor
* **m1 · Two launches of the same two files in opposite order deadlock and return HTTP 500 instead of a 409 in words.** Visitor visa queues IMM 5257 then IMM 5707; Super visa (attachment order swapped) queues IMM 5707 then IMM 5257. Both are replays, sent at the same moment.
  * Actual: 6/6 rounds give 201 + 500 "Something went wrong" (log: `40P01 deadlock detected`, Prisma P2010).
  * `ai.ts:213` takes the locks in target order and `:226` catches only P2002. No duplicate job was made (2 jobs).
* **m2 · Spelling only joins forms that are in the library.** "ABC 123" and "ABC123" become two open captures (`forms.ts:118-123`).
* **m3 · Panel X3 marks a different screen "already captured".** `panel.tsx:25` `ident` has no checksum fallback (`engine/twin.ts:57-61` has one). After capturing a screen titled "—", a screen titled "•••" shows "Already captured: •••. It is screen 1", and Capture opens no check. The server accepts both as different screens (201, 201).
* **m4 · The X3 prompt goes stale after an in-place change.** The heading changed to "Contact details" but the panel still says "New screen: Application details". It reads only on `status: complete` (`panel.tsx:263`).
* **m5 · X10 outline and Undo details:**
  * The page's own inline outline (`1px dashed red`) is overwritten, then set to "" by Undo (`content.ts:13,28`).
  * A checkbox filled with "false" (already unticked) counts as "filled", is outlined, and is counted in "Cleared" (`filler.ts:66`, `:111`).
* **m6 · A capture token can receive a client's name.** D8 returns `differences` as stored. `idLooksLikeClientDetail` (`engine/extension/screens.ts:72`) catches numbers, emails and passport codes but not names. A seeded task with input `dependant-MARIA-LOPEZ-GARCIA` reaches the capture token through `/extension/capture/recapture-tasks` (`extension.ts:261-263`; STANDARDS §5).
* **m7 · Wording for a "not captured" task.** The button reads "Capture A screen that is not in the approved version again · IMM 5257", and the note says to go to "A screen that is not in the approved version" (`panel.tsx:278,286`). The person has no screen to look for.
* **m8 · "Check before sending" (X5) is not everything that is sent.** Element ids and `pattern` are not listed. The server accepts the id `pp_AB1234567` and an email in `pattern` (201 each).
* **m9 · Coverage can use an older PDF edition.** The PDF edition is chosen by sorting labels as text, newest first (`forms.ts:435`), so "(12-2019)" sorts before "(09-2023)". Read in the code only; the demo has one IMM 5257 PDF edition.

## What held
* **D6 under concurrency:** 12 starts at once (Studio and panel mixed) gave one capture (201 + 11 × 200). A return and a start at the same moment left 1 open.
* **Form and portal input:** 8 spellings ("imm5257", " Imm-5257 ", "IMM  5257"…) gave one "IMM 5257"; "IMM 5257 SCH 1" and "IMM5257SCH1" are the same form. Portal "APR_PORTAL", "apr_portal ", "__proto__" → 400.
* **Combination checks:** a random uuid → 404, a non-uuid → 400, another workspace's combination → 404, from both the Studio and the panel.
* **Roles and tokens:**
  * A fill-only token gets 403 on starting a capture, on the capture list and on capture-mode tasks. A capture token gets 403 on cases.
  * The Studio header on extension routes → 401; no Origin → 401. The officer gets 403 on Studio tasks; the reviewer cannot start a capture (403).
  * Another person's capture is 404 for reading and finishing, and never appears in my list.
  * The D8 body has no `affected` and no case reference.
* **Coverage key:** a spouse screen mapped by hand covers only the spouse; Personal details stays at 37. A heading changed only in case or spacing keeps its same-path matches. The repeated row (`Contacts_Row2`) is keyed by fact. Labels are plain; an unlabelled group shows "Other questions of …".
* **Hostile screens:** refused when a choice's value carries a passport number, when help text has a long number, or when a label has text after its colon. Arabic, 300-character and punctuation-only titles are stored correctly.
* **D4, other cases:**
  * A program-wide plan drafts once; the other combination gets "Same form as in Visitor visa".
  * A waiting draft is skipped in stub, replay and live, including from the form's own Draft setup button.
  * A file whose proposals were all rejected keeps waiting until someone adds them to the draft.
  * Scale: a program plan over 402 combinations (804 targets) takes about 0.9–1.1 s, with or without a waiting draft.
* **Undo on the same screen:** edits to a radio or a select are kept and the rest are cleared. After a URL change Undo is gone.
* **Keyboard:** Tab reaches every capture control in order.

Not run: Studio dialog at 1024 px and 200 % zoom. The panel at 180 CSS px (200 % of 360 px) scrolls sideways because the page is 320 px wide; that width predates F3.

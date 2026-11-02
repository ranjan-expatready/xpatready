# C3.6, the part not held: review, round 2 (replaces the Block on #523)

Commit reviewed: **97d8f71a** on `claude/lucid-franklin-vb923y` (PR #573, base `origin/main` 55376830). Reviewer: independent, did not build it. Date: 2 Nov.
Journey score: **8/10** (`journey-test-reviewer-2026-11-02-round2.md`). Live AI off, US$0.
**The working tree of this folder changed under me** (uncommitted edits in `studio.ts`, `proposals.ts`, `document-type-names.ts`, two tests, and a `break-report.md` here, from another agent). Everything below ran on a clean `git archive` of 97d8f71a (own copies on :4458 and :4459). The uncommitted edits are NOT reviewed. A fix must be committed, then re-reviewed.

**Verdict: Block** (0 Blockers, 2 Majors open). In skill terms: *Ship after fixes*.

## Round-1 findings, one by one
- **B1 (three suites): fixed.** On the clean commit: `check_screen02_fix` 62/62, `check_vv_checklist_api` 28/28, `check_c119_library_items_browser` 30/30.
- **M1 (duplicate types): partly fixed, and the fix opened two new holes (Major 1 below).** Accented, long and non-Latin names are now reused across combinations; a case and spacing twin is refused while it waits; `proves` no longer names the combination. These cases pass (`check_forms_c36_requirement_type.ts` 24/24).
- **M2 (silent setups): fixed.** `setup_vv_m3.ts`, `check_screen01_release_race.ts` and `scale_100.ts` now propose, accept and assert. The race suite now prints "late add 201 → DRAFT" (real lines). `scale_100` still does not check its line adds (not new).
- **M3 (`studio.ts` additive only): answered.** PR #573's first paragraph names `studio.ts saveRequirement` as a behaviour change and asks the tech lead to read it. Not a code finding.
- **m1 (edit message): fixed.** PATCH with an unknown name is a 409 in words; the line keeps its type.
- **m2 (line details lost): partly fixed.** `attachMode` is validated before proposing and `pendingRequirement` is gone. The dialog stays open with the details. But the link in the notice leaves the page, which closes the dialog (Minor 1).
- **m3 (stale texts): fixed** (`check_s6_p149` OWED entry, `check_forms_c36_acceptance` header).
- **m4 (author accepts own proposal): answered, see "Challenged choices" (5).**

## Majors
**Major 1. One name is one type is still wrong: reuse matches on the lander's key, and the waiting check does not.**
- `api/src/document-type-names.ts:17,21` reuses a type when `keyFor(name)` OR the old slug equals the *key* of any type. Two different names can have one key.
  - Repro (clean 97d8f71a, `POST /combinations/<wp>/requirements`):
    1. Name "Паспорт 2024" (Passport 2024), accept as user-B. It lands with key `2024`.
    2. Name "Брак 2024" (Marriage 2024) on the same or another combination. Answer **201**: the line is written with type "Паспорт 2024". No proposal, no warning. A requirement for the wrong document, silently.
  - Same with two long names that share their first 60 characters ("Official statement of funds held in a Canadian bank account for the year 2023" then "...2024"): the second line is added to the 2023 type, no proposal.
- `studio.ts:715` waiting twin check is by `identityKey` prefix, which is accent-sensitive (`normalizeLabel` keeps "é"), while the lander's key strips accents. Repro: "Café receipt" (one combination) and "CAFE receipt" (another) both answer 202; accepting both lands `cafe_receipt` and `cafe_receipt_2`, two types with one name. That is round-1 M1's accent case, still open while both wait.
- Fix: match reuse by the name alone (one comparison form for reuse and for the waiting check, accents on Latin letters ignored if that is wanted), never by key. Add a failing case for each repro above. The 24 current cases all pass, so they would not catch it.
- Design choice (1) (OR of name, lander key, slug key) is the cause; (2) the prefix check is sound for `|` (normalizeLabel strips it) but must use the same form as (1).

**Major 2. Undo of the accept removes a type a line already uses.** `api/src/proposals.ts:451-468` (`undo`) has no check for lines.
- Repro: user-A names "Undo probe doc" (202); user-B accepts; user-A adds the line with the landed key (201); within 10 s user-B calls `POST /review/proposals/undo/<batch>` → 201 `{undone:1}`. Result: the document type row is gone, the line (`document_requirement`, not retired) still names it.
- Undo gaps for document types exist already, but this change makes the window real: the author's open dialog chooses the accepted type within 5 s (measured 5.4 s) and the approver is offered Undo for 10 s. A dangling line in a draft checklist is a data-integrity fault (D2).
- Fix: Undo refuses (409, in words) when a live line uses the type or lists it as an alternative; test that fails without the rule.

## Challenged choices (the five you named)
1. **OR of name, lander key and slug key: Major 1.** The name match is right; the key matches are the fault.
2. **Prefix on `identityKey`: sound, but accent-inconsistent** with (1) (Major 1). The advisory lock is per name; an AI drafting insert does not take it (very small window, not filed).
3. **PATCH with a new name is a 409: right.** It is in words and nothing is written. A PATCH with a name the library has still swaps the type, as before.
4. **The namer stays the ADD's proposer: holds.** `LibraryChange.proposedBy` = namer, `appliedBy` = accepter, and both are refused on approve (`library-changes.ts:86-88`, `review-proposals.ts:130`). Tested: user-A and user-B each get 403 on the ADD; a third person is needed. Spoofing: the namer is read from the server's own `requirement_type` DraftingJob (`startedBy`) through the proposal's `runId`; `step` and `runId` are set only in `saveRequirement`. Posting `startedBy`, `proposedBy`, `step` in the body changed nothing (job stayed user-A). Only the author duty can name one (user-B and user-C got 403).
5. **The namer may accept their own proposal (m4): does not matter for the second-person rule.** Then the ADD is proposed and applied by one person, who cannot approve it, so a different person still approves it. The notice says "waits for a second person", which is only true of the ADD. Recorded, not filed.

## Minors
1. The notice's link "Open To review › Proposals" is a same-tab link: the dialog and its kept details are lost. The text "kept while this stays open" is honest, but a one-browser demo (Acting as) cannot use it. Same text appears in the toast and the notice.
2. Notice states go stale: if the approver edits the name when accepting, or rejects, the dialog still says "waits" (case 1 and 3 in my run; the new type is in the select, not chosen).
3. A non-string `proves` or `sourceQuote` in the body is a 500 (`studio.ts:707,709`); a number as a name is proposed as "123".
4. `documentTypeName` and `proves` are API inputs no screen sends: small reach toward the held guarded Add (P-251, P-252). Not a stray in behaviour: no search-first, no required reason or source, no co-pilot.
5. At 1280 px the To review row for this item wraps its reason into a 20-line column and clips "Open"; the toast sits over the dialog's Save button. Cosmetic.
6. `check_s6_p149.ts` needs `--tsconfig api/tsconfig.json` (usage line omits it); it fails with a transform error without it.

## Checks I ran on 97d8f71a (clean export, serial, fresh copies)
`check_forms_c36_requirement_type.ts` 24/24 · `…_browser.cjs` 13/13 · `acceptance/C3.6.test.ts … wp.family` 18/18 · `check_c119_library_items_browser.cjs` 30/30 · `check_studio_browser.cjs` 53/53 · `check_screen02_fix` 62/62 · `check_vv_checklist_api` 28/28 · `check_grounding_db` 33/33 · `check_c313_reuse` 21/21 · `check_s6_p149` 73/73 · `check_screen01_release_race` PASS. All match the builder's numbers. (A first run with two suites at once on one machine failed several suites on shared state; serial runs pass. Not a code finding.)

## D1–D20 (this change only)
D1 4: waits as a proposal, nothing written by hand · D2 2: wrong-type reuse, dangling line on Undo · D3 2: reuse by key over- and under-matches · D4 n/a · D5 4: 409s keep the dialog; reject and rename leave a stale notice · D6 4: audit line, job at US$0 · D7 n/a: no AI, marked Rules and Sample · D8 5 · D9 4: link, kept details, auto-choice work; link leaves the dialog · D10 5: plain words, no technical 409 left on tested paths · D11 4: toast plus notice; stale on reject · D12 4: see Minor 5 · D13 5: axe 0, no sideways scroll at 400, 640 (200 %), 1024, keyboard path works · D14 5 · D15 5: save to notice 292 ms · D16 3: new rules tested, but no case for key collision or Undo · D17 simulated only · D18 4: quote carried to the second person; "proves" says not stated · D19 4: propose, accept, add works in two browsers · D20 simulated only.

## Could not check
`graph.mjs` (needs a git repo; I used an export, and running it on the shared tree rewrites `qa/GRAPH.md`). A real screen reader. A headed browser. An intended user's unaided walk. The uncommitted fixes in the shared tree. The full `run-suites.sh`.

**Verdict: Block.** Fix list: (1) Major 1: one comparison for reuse and waiting twin, by name, not key; add failing cases for "Брак 2024" after "Паспорт 2024", two long names sharing 60 characters, and "Café"/"CAFE" across combinations. (2) Major 2: Undo refuses while a line uses the type; add the failing case.

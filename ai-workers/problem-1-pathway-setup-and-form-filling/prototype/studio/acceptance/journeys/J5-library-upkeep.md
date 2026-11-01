# J5 — Keep the shared library tidy and reuse lines across combinations (pack 3, P-220)

**Capabilities:** C3.13, C3.14, C3.15, C11.9 (backlog F5), C1.5 (X2), C9.1 (new edition). **API tests:** `acceptance/C3.13.test.ts`, `C3.14`, `C3.15`, `C11.9`, `C1.5`, `C9.1`. **IRCC rules:** `product/compliance-trace.md`, pack 3 section (IRCC-P3-01 to IRCC-P3-06).

**How to read this.** Numbered steps a person does in the app, each with what must be true afterwards. The builder turns each journey into a browser check (`tests/check_<item>_browser.cjs`, Playwright, as the existing browser checks) in the PR that makes the capability work, and moves the API test into the suites. Every step also holds at 400 px, 1024 px and 1440 px with no sideways scroll, passes axe, and works from the keyboard (Tab, Enter, Escape returns focus to where the person was); the words are plain (no field codes, no enum names). Values are Sample.

**Set-up (every journey):** an isolated copy (`zsh studio/tools/isolated.sh accept 4448 start`), then `tsx studio/tests/runtime/setup_visitor_visa.ts 4448 xr_studio_accept` (the suites' fixture with With an LMIA released, then the Visitor visa configured and released on top). People: Configuration author (user-A), Content reviewer with the SME duty (user-C), Approver (user-B), case officer (user-O).

## J5.1 The library lists say where each item is used, who made it and what state it is in (C3.13)
1. Author opens Shared library › Fields. **Expect:** the fields are grouped under their section headings; each row shows the name first, "Used by" as counts that say what they count ("3 forms · 2 combinations"), the origin in words ("AI · from IMM 5257 · accepted 18 Oct", "Person · described" or "From a reviewed release") and the status last (Released · Draft · Waiting for a second person · Retired). No row shows PUBLISHED, AI_PROPOSAL or a key as its title.
2. Author types an alias of "Country of birth" in the search. **Expect:** that field is found; then types "IMM 5707": only the fields that IMM 5707 fills remain. A search that matches nothing says so, with a way to clear it.
3. Author chooses **Combination ▾ Visitor visa** (PR #289: `GET /library/reuse/:kind`). **Expect:** a total line ("46 · 39 reused · 7 new", numbers from the data); each row is marked "Reused" (in the library before the Visitor visa used it) or "New here". A field released earlier on With an LMIA is "Reused".
4. Author opens Sections, then Document types, with the Visitor visa still chosen. **Expect:** the same columns and the same kind of totals.
5. A field with a change waiting for the Approver (made in J5.4 step 5) reads "Waiting for a second person". A retired field is not in the list until the person chooses the "Retired" status chip, where it reads Retired.

## J5.2 Checks and rules are listed, read-only, with where used and source (C3.14)
1. Author opens Shared library › Checks. **Expect:** every check of every combination, each with its kind (Field validation · Consistency · Document validity · AI review), what it reads in words, when it runs, where it is used, its origin and its source passage ("No source recorded" when none). Kinds as PR #294 words them: answers compared and read-backs are Consistency, readiness warnings Document validity, any other group Other with its group named (the Visitor visa's two seeded section checks are Other · "section check", unsourced, Sample). A check held by two combinations is one row; when their wording differs the row says "Differs by combination".
2. Author filters by kind Consistency, then by Combination Visitor visa (filtering happens on the screen). **Expect:** only those rows; the counts on the chips agree with the rows.
3. Author opens Shared library › Rules. **Expect:** each rule as a sentence ("When the person is 18 or older at the application date, then IMM 5707 is needed") with where it lives (combination and tab, or section), the fields it reads and its IRCC passage ("No source recorded" flagged); the conditions on form lines and checklist lines are listed too; no JSON, no "op".
4. **Expect throughout:** no Add, Edit or Delete on these two lists (read-only); a rule or check is changed in place in its combination or field drawer (P-37). A person without the author duty sees the same lists.

## J5.3 Rename a shared field; a change of meaning goes to a second person (C3.15)
1. Author opens "Country of birth" in the Fields list (right panel). Edits its name to "Country or territory of birth" and saves. **Expect:** saved at once ("Renamed: draft version 2; goes out with the next release"), the History section shows the old and new name with who and when; no second person is asked (P-96).
2. Author renames it to the name of another field in the same group, typed in capitals with extra spaces. **Expect:** refused on the field in words that name the other field and offer to merge; nothing saved.
3. Author tries a name that is waiting in an open library change. **Expect:** refused the same way, naming the waiting change.
4. Another tab renamed the field meanwhile; the author saves from the old panel. **Expect:** "Changed since you opened it" with Reload; nothing overwritten.
5. Author edits the **meaning**, giving a reason. **Expect:** "Waiting for a second person"; the field keeps its old meaning until approved; To review shows the change to the Approver.
6. Author opens the change in To review. **Expect:** no Approve for the person who proposed it (the reason in words). Approver approves with a note. **Expect:** a new version with the new meaning; earlier releases and open cases keep the old version.
7. Content reviewer and case officer open the field. **Expect:** no Rename or Edit meaning control; the reason is shown as text.

## J5.4 Remove, retire, restore and reorder (C11.9)
1. Author opens a field used by the Visitor visa. **Expect:** "Where used" is the first section of the panel, each use linked; Delete is greyed with the reason as visible text ("used by IMM 5257 on Visitor visa"), Retire is offered.
2. Author chooses Retire on it. **Expect:** refused, listing every use that blocks it (the latest release and any draft), each linked; nothing changes.
3. Author's own never-released, unused draft field: Delete, with a reason. **Expect:** gone at once, a toast with Undo; Undo brings it back as it was; a second Undo says it was already undone.
4. A released field used nowhere: Retire with a reason. **Expect:** "Waiting for a second person"; still listed as Released until approved.
5. Author cannot approve their own retire (no Approve, reason shown). Approver approves. **Expect:** Retired; hidden from pickers and AI proposals; shown under the Retired chip; Restore offered, which goes to the second person in the same way.
6. Same for a section and a document type in use: Retire refused, every use listed.
7. Visitor visa › Forms tab: author drags IMM 5707 above IMM 5257 (or uses Move up / Move down from the keyboard). **Expect:** the filing order is saved at once with a History line, the draft's forms list and Preview follow it. There is no "Move to another program" anywhere (P-116: no move).

## J5.5 Copy one line, add or remove it across many (C1.5)
1. Author opens With an LMIA › Forms › IMM 5476 › **Add to other combinations…**, ticks Visitor visa and Study permit. **Expect:** a preview, one row per combination with its full trail and one outcome ("Will be added", "Already has it", "Has it with a different 'only if'", "Cannot …" with the reason, "Waits"); only "Will be added" and "Waits" can be ticked; "Nothing changes until you choose Add."
2. Author chooses Add. **Expect:** toast "IMM 5476 added to 2 combinations (draft changes in each)." with Undo; each combination's Forms tab shows IMM 5476 as a draft line with the same who, "only if", channel, signature, minimum age, signer and copies, and its origin "Copied from Temporary residence › Work permits › …"; no AI origin.
3. Author chooses Undo. **Expect:** the line goes from both combinations at once. Repeat the Add; change Study permit's IMM 5476 line; Undo the batch. **Expect:** "Study permit was changed after the copy (IMM 5476 changed, by Configuration author at hh:mm UTC). Nothing was undone."
4. Approver tries to undo the author's batch. **Expect:** not offered (only the person who made it).
5. From Visitor visa › Forms › IMM 5476 › **Remove from other combinations…** with Study permit and Super visa. **Expect:** Super visa "Does not have it"; Study permit "Will be removed"; Remove makes a removing draft there.
6. High-wage position › Forms › **Copy a line from another combination…** › With an LMIA › IMM 5476. **Expect:** the line arrives as a draft with the same settings; copying onto With an LMIA itself is refused in words.
7. Case officer: none of these menu items is shown.

## J5.6 A new edition: compare, see the impact, decide, release (C9.1)
1. Load the configured checkpoint (J6.2). To review lists "New edition: review impact" for IMM 5476 (2021 → 11-2025), naming Visitor visa and With an LMIA.
2. Author opens it. **Expect:** both editions named as printed ("IMM 5476 (11-2025)"); counts (unchanged · reworded · new · removed, totalling the new edition's boxes); each reworded box shows was → now; the combinations that use the form; the sections, document types, rules and checks a removed or reworded box touches, each saying why and where; open cases ("1 case stays on release 1").
3. **Expect:** opening the review starts no AI. "Draft the 23 new and reworded boxes with AI (about US$x · at most US$y)" is offered and runs only on a click; without the live switch a paid run is refused in plain words (P-175). No saved answer for IMM 5476 11-2025 exists yet, so nothing replays (tech lead on #295); the replay case waits for a founder-approved run.
4. Author accepts the impact. **Expect:** nothing released changes (same release number and fingerprint); the new edition's boxes appear as draft decisions.
5. Author submits the Visitor visa with boxes still undecided. **Expect:** refused (K1), naming the boxes by their captions (no raw `IMM_5476[0].page1…` path).
6. After every box is decided, submit → SME sign-off → Approver releases. **Expect:** release 2 carries IMM 5476 (11-2025); the family case on release 1 still shows release 1 and its old edition (P-67), and, because IRCC's accepted-until date for the previous IMM 5476 (12 March 2026, IMM 5476 page) has passed, its Ready to file is blocked with "Adopt update" and that date in words (P-151 (1), P-168).

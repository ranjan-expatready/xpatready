# S4 Form library: break report, round 4 (independent breaker, 27 Oct 2026)

**What was tested.** Commit e7cb63c on `forms/2026-10-27-s4-form-library`, isolated copy `brk4_s4` on :4462 with the sample loaded (web build matches the commit). Scope: the round 3 fixes (R3-1, R3-2, m1–m6) and a quick regression on N1–N8. Earlier rounds are in git history. Paths are relative to `prototype/studio/`.
* **Spend: US$0.** A stub probe reached `var/isolated-brk4_s4/fake-launch.log` (5 stub lines) before any finder run. Every finder run was a replay; no live call was made. canada.ca came from the recorded copies (`STUDIO_CANADA` unset).
* **Left as found.** `p2/jobs`, `p2/runs` and `p2/ledger` are byte-identical to before. The source attach in R4-1 had read IMM 5645 into 5 job files and 4 `p2/parts` files; nothing was launched, and I removed them. The copy is stopped, its database dropped and its `var` folder removed.
* **Setup steps that went straight to the database:** one removed line set back to DRAFT (IMM 5802 on With an LMIA, to reach the release re-check), one long title (IMM 5905) and one empty library row (IMM 9876). Everything else went through the API or the browser.

## Major
**R4-1 · Uploading a form's file on a combination still gives a retired or retiring form a new use, and the release retires it anyway (R3-1 is fixed for form lines, not for sources).**
* **Steps, approved retire:**
  1. Remove IRM 0002 from both Visitor visa lines.
  2. user-A asks to retire it; user-B approves.
  3. user-A `POST /api/intake` with the stored `irm0002e.pdf` and `combinationId=<Super visa>`. The combination's own upload, the "door 1" in `web/src/components/forms.tsx:34`, answers "Already in the library… **Attached to Super visa.**" (status RECOGNISED, "Next: AI drafts its field map").
  4. user-B `POST /pack/release` returns 201: release 2 retires IRM 0002.
* **Broke:** Uses lists "Visitors › Super visa — its file is attached here as a source", and the list row shows **Retired**, Used by Super visa. That is the state P-116 forbids.
* **Steps, waiting retire:** while the IMM 5645 retire was WAITING, the same upload attached it to Super visa and Study permit.
  * The approval was then refused: "Used meanwhile: Visitors › Super visa".
  * No route removes a source attachment (no `sourceAttachment.delete` outside demo reset). The form can never be retired, although Uses says "remove it there first".
* **Cause:**
  * `api/src/intake.ts:241-243` (`attach` inside `one`) calls `sources.attach` (`api/src/sources.ts:99`), which checks neither `retiredAt` nor `closingChange`.
  * The same path runs when a second person approves a held file: `intake.ts:174` re-runs the intake on the file's combination.
  * The release re-check (`api/src/lifecycle.ts:222`) counts `combination_form` lines only. `formUses` (`form-uses.ts:45-49`) counts source attachments as blocking uses.

## Minor
**R4-2 · The replay rule ("the last two names") is not sound as the build notes state it.**
* **Steps:** I created Individual › Permanent residence › Visitors › Visitor visa, and Citizenship › Proofs › a category named "Visitors › Visitor visa".
* **Broke:** Both replayed the real Visitor visa answers ("saved answer, US$0"). 6 and 5 forms were attached automatically as "Picked by AI".
* **Why it matters:** the claim "another combination still never gets them" is false. The answers are about the same canada.ca pages, and the lines are drafts, so the harm is small. But:
  * the AI was given a different `combination_trail`;
  * a name may contain " › " (`finder.ts:52` splits on it);
  * for a three-level trail the program *is* one of the last two levels, so renaming the program (the code comment's example) loses replay, and only a pathway rename keeps it.
* **Also:** Super visa on the visitor-visa page is refused with "No saved AI answer for these exact pages" (`finder.ts:466`), although the pages are identical and only the name differs.
* For the Lead: keep the rule and reword the claim, or key replay by the combination itself.

**R4-3 · A release that hands a retire back is empty and silent.**
* **Steps:** with IMM 5802's retire approved and a line listing it again, user-B releases.
* **Broke:**
  * The response `{pack:3, rows:[], library:[]}` does not mention the handed-back retire.
  * Activity says "Approver released Release 3: " with nothing after the colon.
  * The form's History ends at "approved"; no line says it was handed back.
  * The change is correctly RETURNED.
* **Cause:** `api/src/library-changes.ts:174` `continue`s, and `lifecycle.ts:223` writes no audit line.

**R4-4 · m6 is only partly fixed.**
* Attach while a change is RETURNED now works.
* **Still wrong:**
  * the list still shows a RETURNED retire as **"Retire waiting"**, with the tooltip "waits for a second person on To review" (`form-library.ts:61` still includes RETURNED; `web/src/pages/library-forms.tsx:109`). Seen on IMM 5645 and IMM 5802 at 1024 px.
  * a guide used as a source is still refused with "its fields are read from it" (`form-uses.ts:49`).

**R4-5 · m3 is only partly fixed.**
* The `refused[].file` field is UTF-8 now.
* **Still wrong:**
  * the page shows only `refused[].why` (`library-forms.tsx:155`), and `why` is built from the raw latin1 name (`api/src/upload-run.ts:55`). An empty "फ़ॉर्म-签证.pdf" still reads "à¤«à¤¼à¥à¤°à¥à¤®-ç­¾è¯.pdf is empty…"; "café-Ünïcode.pdf" reads "cafÃ©-ÃnÃ¯code.pdf".
  * when every file is refused, the 400 detail is garbled the same way.

**R4-6 · Undo after the workspace "+ Add" undoes an older change** (raised in R3-1, not fixed).
* **Steps:** on a fresh combination, hand attach IMM 5707, then `POST /combinations/:id/lines` with IMM 1295 (it becomes a form line), then Undo.
* **Broke:** the answer is `{undone:"attach", codes:["IMM 5707"]}`; IMM 1295 stays.
* **Cause:** `programs.ts:359-375 addLine` records no Undo step and does not run inside `oneAtATime`.

**R4-7 · A retired form the finder skips is reported as NOT_FOUND** (`finder.ts:657`, `/forms/find/latest`).
* **Seen:** retired IRM 0002 was shown as not found on a fresh combination.
* **Why it matters:** S5 will draw "not found: upload its PDF", which leads the person to the upload that R4-1 lets through.

## What held (fixes confirmed)
* **R3-1:**
  * **While IMM 5645's retire was WAITING:**
    * a hand attach gives 409 "Being retired";
    * Undo of its removal gives 409, in words;
    * "+ Add" (`/lines`) gives 409; the guard sits before both the form-line and the source branch;
    * upload for a combination's row (`/intake` forForm) says "Not attached to the combination: …open on To review";
    * the library Upload PDF with forCombination starts its run.
  * The finder never attached retired IRM 0002.
  * By code reading: `reuseForm` and the AI apply go through the `addFormLine` guard (`form-lines.ts:30-34`).
  * **Release re-check:** IMM 5802 (planted line) went back as RETURNED, "Not retired: a combination lists this form again", and the form was not retired.
* **R3-2:**
  * Visitor visa replays the committed real answers: both rounds "saved answer, US$0", PARTIAL, 6 attached.
  * Super visa gets nothing, with or without the visitor-visa page.
* **m1:** 10 parallel DELETEs in 5 id spellings gave one 200 and one Undo step; the rest were 409 or 404, with no developer wording. PATCH `imm5707` and `IMM  5707` both work.
* **m2:** with the lines held for 12 s from another session, Undo answered 409 "Busy" at 4.01 s. A PATCH waited 7 s and succeeded. A later Undo was exact.
* **m4:** at 1024 px every table tab stop shows a ring (89 tab stops walked). Only the app shell's nav links show none, and they are outside S4.
* **m5:** with a 120-character title containing one long unbroken word (German, CJK and Devanagari):
  * at 1024 px the table ends at 999 px, inside its 1000 px box, and ⋯ ends at 987;
  * at 1280 px they are 1255 and 1256;
  * there is no page scroll at 1024, at 1280, or at 640 px (200 %).
* **m6 (part):** attach while a retire is RETURNED gives 201.
* **Regression:**
  * **N5:** 20 parallel Removes gave 1 × 200 and 19 × 409, with one Undo step.
  * **N6:** 5 parallel edit + Undo pairs: no 500s.
  * **N7:** `Guide%205256`, `guide5256` and `GUIDE   5256` all open.
  * **N2:** attaching an empty row with a Delete open gives 409. The approved Delete then applied cleanly.
  * **Roles:** attach, "+ Add" and Undo give 403 for user-B, user-C and user-P, and 401 with no actor or an unknown one.
  * N1, N3 and N8 were not re-run: their code is unchanged since round 3, which confirmed them.

# S4 Form library: break report, round 5 (independent breaker, 28 Oct 2026)

**What was tested.** The drift-check fixes on `forms/2026-10-27-s4-form-library` at a660f7b. The app code is identical at d6469ca. Scope:
1. The merge with main (8cfc043).
2. Delete vs Remove (P-123 with QA-46).
3. Load sample from the Sample fixtures, including migration `20261028090000_s4_sample_fixture_basis`.
4. Replay keyed by the combination.

Earlier rounds are in git history. Paths are relative to `prototype/studio/`.

**How it was tested.**
* **Copies.** `fxb_s4` on :4478 ran the real code with the sample loaded. The full suites were running in this copy at the same time, so the hostile-fixture and planted-run attacks ran in a scratch mirror instead: `fxb_s4m` on :4479, a copy of `api/engine/contracts/samples/prisma` with links to the rest, plus its own `p2/runs` folder. The only change to the mirror's code was to let the reset walk symlinked folders (`demo.ts walk`); without it, reset failed with EISDIR on the links.
* **Changes to the repo.** None. `samples/form-library-sample.json`, `official-sources/` and `p2/runs` in the repo were never touched.
* **Spend: US$0.** Both copies used `STUDIO_FAKE_LAUNCHER`, and neither copy logged a single launch. Every finder run was a replay.
* **Clean-up.** Both copies are stopped, both databases dropped, `var/isolated-fxb_s4` and the mirror removed.
* **Set up directly in the database.** One empty library row (IMM 9876), so that a Delete could be asked for.

## Major
**R5-1 · Replay can return a stub-pass record as "saved answer, US$0" for any combination whose names contain the word "live".**
* **Steps (mirror):**
  1. Create Visitors › "Live-in caregiver visit" and its combination.
  2. Put the pair of records a real live pass leaves in `p2/runs`, both carrying this combination's key: `…-live-in-caregiver-vi-<h>-live-<ts>.json` (the real answer, 10 forms) and the earlier `…-stub-<ts>.json` (`forms: []`, "stub caller: no model was called").
  3. Replay with the visitor-visa page.
* **Broke:**
  * Both rounds say "AI listed 0 forms (saved answer, US$0)".
  * The run is **COMPLETED**: nothing attached, nothing missing.
  * `drafting_job.detail.run_file` points at the `-stub-` files.
  * The paid answer is never used.
* **Cause:**
  * `finder.ts:489`: the replay filter `^…-.+-live-.+\.json$` also matches a stub file whose name contains "-live-".
  * `finder.ts:57` `newestFirst` sorts from `lastIndexOf("-live-")`, which for the stub file is the name itself, so the stub sorts first ("-live-in…" > "-live-2026…").
  * A stub record passes `same` (completed, contract_valid, same template, inputs and key; `finder.ts:485`).
* **Note:** keying by the combination does not prevent this; any record whose job id contains "live" is affected.

**R5-2 · History lines still use the wrong word (P-123, QA-46), and one shows a raw code.** To review, the approval page and the Release page are right (see What held). The Activity and History lines are not:
* **Library form deleted:**
  * `lifecycle.ts:196` writes "Approver approved **removing** "IMM 9876 · …": **removed** (never released, used nowhere)". That reads as if the form stays in the library, which is the meaning clash drift #2 was about.
  * `lifecycle.ts:192`: an approval with no note is stored as "**Removed** at approval".
* **Structure name removed:**
  * `lifecycle.ts:125` writes "proposed to **delete** "Temporary residence › …"".
  * `screen02.ts:110` writes "approved "…" (**delete**)".
  * `lifecycle.ts:209` writes "withdrew "**delete** …"".
  * QA-46 says "Remove, never Delete". These lines show in the Structure panel's History and in Activity.
* **What IRCC accepts:** `screen02.ts:110` writes "Approver approved "IMM 1295 · IRCC accepts: Online" (**set_accepts**): ok" in the form's History drawer and in Activity. The same line says "(edit_rule)" for a check.
* **Reproduction:** on :4478, ask to delete IMM 9876, remove a new structure name and set IRCC accepts on IMM 1295. Approve each as user-B, then read `audit_event` (all quoted above).
* **Root cause:** these lines use `action.toLowerCase()` or hard-coded words instead of `actionWord(action, kind)` (`library-changes.ts:17`).

## Minor
**R5-3 · The Sample fixtures are not checked. One bad line breaks the whole Load sample, and a broken file is skipped without a word** (`finder.ts:135-141`, `:776`).
* **One bad value:** `"channels": "BOGUS"` or a numeric `quote` gives a 500 ("Loading stopped … violates check constraint" or "fixed.quote.slice is not a function"). The Structure is half-loaded and needs a reset.
* **Unreadable JSON:**
  * the load gives 201;
  * IRCC accepts is set for 1 of 7 forms;
  * there are 2 guides, not 4;
  * IMM 5881 and IMM 5905 have no page;
  * the log never says the fixture file could not be read.

**R5-4 · A recorded copy is trusted on the fixture's own checksum, not the manifest** (`finder.ts:143-149`, `:723`, `:753-754`). Build notes: "used only while its manifest checksum matches".
* **A link out of the folder is followed:** a link `instructions/evil-link.html` → `/etc/hosts`, with that file's checksum, was stored as **Guide 5487** and as an `official_download`.
* **The recorded file is not checked against the URL:** `instructions/guide-5553.html` given with guide 5487's URL was stored as Guide 5553 (inside Canada) with 5487's (outside Canada) page.
* **Fixture `pages` URLs are never checked against the canada.ca allow-list:**
  * `javascript:alert(…)` and `https://evil.example.com/…` were stored and shown as "Its page on canada.ca";
  * React 19 neutralises the `javascript:` link, but the other host is a live link.
* **An off-host guide URL** is caught by the `official_download_https_canada` CHECK, but it stops the whole load with a 500 instead of skipping that one guide.
* `..` and absolute paths are refused (see What held).

**R5-5 · The approval page's "Now" is the value when the change was proposed, not the value now.**
* **Steps:** propose IMM 5707 → "PDF upload · Online" before Load sample, then load.
* **Broke:**
  * The library shows "PDF upload · Sample · canada.ca words · Change waiting".
  * To review and the approval page still say "**Now: Not set yet** → PDF upload · Online" (screenshot at 1024 px).
  * "Now" never says the value is Sample.
* **Cause:** `form-library.ts:109` (`matches.before`) and `library-changes.ts acceptsView`.

**R5-6 · Two fixture quotes do not say how the form is filed, yet they set "PDF upload".**
* **The two quotes:**
  * IMM 5257 SCH1's quote is the download link's label ("Download the form Schedule 1 … (PDF, 0.5 MB)");
  * IMM 5409's is "fill out your forms on a computer and validate them".
* **Why it matters:** this goes against the finder's own rule (FINISH (2): "no line, no value"). Both are labelled Sample, so the immigration expert decides; flagged so it is not taken as IRCC's word.
* **Where:** `samples/form-library-sample.json`.

**R5-7 · At 1024 px the "Sample · canada.ca words" pill runs into the Used by column.** It touches "With an LMIA · Work permits …" on IMM 5257 SCH1 and IMM 5409, and "Set by a person · Sample" does the same on IMM 1295 (`library-forms.tsx:137`). There is no page scroll.

**R5-8 · Other wording.**
* `library-changes.ts:72` says "You proposed this **what IRCC accepts**, so…" for a form_accepts change and "this library form" for a delete.
* The Delete dialog help says "it is then **removed** with its files" (`library-forms.tsx:200`).
* A withdrawn library-form change is logged with the entity "combination" (`lifecycle.ts:209`).

## What held
* **Merge (1):**
  * main's QA-46 is intact: `ACTION_WORD.DELETE` is "Remove", and `structure.tsx`, `programs.tsx`, `engine/structure.ts` and `core.ts` are byte-identical to 8cfc043. The S4 additions to `main.ts` and `programs.ts` are additive.
  * To review reads "Delete the library form", "Remove the structure name" and "What IRCC accepts for IMM 5707: … → …".
  * The API's `action_word` is "Delete" for library_form and "Remove" for structure_node.
  * The Release page uses `action_word` (a delete never reaches a release).
* **Load sample (3):**
  * a fresh load sets 7 of 7 data forms (6 SAMPLE_FIXTURE, IMM 5257 AI_SAMPLE from the saved answer) and adds guides 5256, 5269, 5289 and 5487;
  * the LMIA log line says why there is no guide;
  * a person's approved value (IMM 1295 Online, PERSON_SAMPLE, set before the load) is not overwritten;
  * three parallel loads give one 201 and two 409 "already loading", and a later load gives 409.
* **Fixture paths:**
  * a wrong checksum leaves that guide out, and the log gives the reason;
  * `/../../etc/hosts` and `//etc/hosts` are refused;
  * a 300-word Devanagari/CJK quote is cut to 400 characters;
  * a `null` accepts entry is skipped.
* **Migration:**
  * the CHECK refuses `BOGUS` and lower-case `sample_fixture`;
  * the recorded rollback (run in a transaction) clears only the 5 SAMPLE_FIXTURE rows, keeps AI_SAMPLE and PERSON_SAMPLE, and restores the old constraint, with no value left without a basis;
  * as with the other migrations, the `_prisma_migrations` row stays.
* **Labels:** "Sample · canada.ca words", "AI · Sample" and "Set by a person · Sample" show in the list at 1440 and 1024 px, with no page scroll, and the footer says the values are Sample.
* **Replay (4):**
  * after renaming Visitor visa to "Tourist visa ✈ 观光" and Visitors to "Visiting Canada", replay still gives 10/10 forms, US$0, with the page chosen;
  * without a chosen page, the step that picks the page asks a person, because the rules no longer match the new name; this is not a key leak;
  * Super visa on the same pages gets "No saved AI answer";
  * a deleted Visitor visa recreated on the same node gets a new key, and nothing is replayed;
  * the 27 Oct stub records (trail, not on the legacy list) are never replayed.
* **Roles:** user-A approving their own change gives 403 ("A different person decides"); user-P approving gives 403; user-C proposing IRCC accepts gives 403; no actor gives 401.

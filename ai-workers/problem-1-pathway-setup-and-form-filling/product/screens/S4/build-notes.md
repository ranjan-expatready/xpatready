# S4 (BACKLOG; SA-1B-90): startable at case opening

* **Rule:** `POST /runtime/cases` opens a case only when the combination's newest release is startable (Live). It is read exactly as Immigration programs reads it:
  * the new `Programs.startableMissing(combinationId, release)` runs `missingItems` over the release's snapshot, with the combination's structure problems and every rule checked against the live library (`validate`);
  * the catalogue uses the same pieces (`api/src/programs.ts`).
* **The refusal:** 409, title "Not ready for cases". The detail reads ""<label>" is released but not ready for cases (Not ready in Immigration programs): <the catalogue's missing lines>". A `missing[{code, text, step}]` list carries the same lines and the step that fixes each.
* **What stays the same:**
  * cases already open keep reading their pinned release;
  * a case may still open on a release that is Live;
  * the earlier refusals still apply: retired (409), never released (409), no such combination (404).
* **Separate from P-248 (release):** this checks only case opening, never what may be released.
* **Shared file:** `api/src/runtime.ts` (`Runtime` now injects `Programs`, provided in the same module).
* **Tests:** `tests/check_s4_startable.ts`, 8/8 on a fresh copy. Without the S4 code the same test gives 4/8.
  * A Live combination opens.
  * Retiring a library field the release reads (`case.funds_available_cad`) makes it Not ready. Opening is then refused 409 with the catalogue's own lines (`rule_problem`), and no case is written.
  * A case already open still reads.
  * Restoring the field makes the combination Live again, and a case opens.
* **Every suite that opens cases still passes** on fresh copies:
  * runtime R1 c/d/a: 125, 86 and 98;
  * `check_vv_prepare_api` 38, `check_vv_prepare_store_api` 34, `check_vv_checklist_api` 28, `runtime/check_vv_filings_api` 13;
  * `check_c44_part2` 31, `check_c44_question_types` 44, and their browser checks 19 and 33;
  * `check_c72_imm5257_fill` 38, `check_forms_qa53` 20, `check_s5_slice1` 57, `check_w1_structure` 81;
  * `runtime/check_c115_employer` 20, `runtime/check_qa122_generate` 7, `runtime/check_c611_team` 59;
  * `check_c69_runs` 98, `check_c69_page_browser` 43, acceptance C6.9 15.
* **A note for tests:** the catalogue's cache key is the audit log. A test that changes the library by SQL writes an audit row, as the library screen does.

## Review round 1 (ea7f28b2): Block, two Majors, and the fixes
* **M1, draft work blocked new cases:** `startableMissing` now reads the release alone: the row-level structure lines and the rules against the live library, never the draft's undecided form fields (K1).
  * Test: a field left undecided in the next draft never stops a case (201). The same line fails on ea7f28b2 (409).
  * The catalogue still mixes them in for its status; that is raised, not changed, in `challenge.md` (screens lane).
* **M2, the officer's words:** the refusal's `detail` is now one plain sentence: ""<label>" is not ready for new cases: N item(s) to fix in Immigration programs, by the people who set it up. Cases already open are not affected."
  * The catalogue's full lines, with field paths and steps, stay in `missing[]` for authors.
  * The toast text wraps (`min-w-0`, `[overflow-wrap:anywhere]`) in both toasters, and Dismiss stays in place.
  * Tests: the sentence, and the absence of field paths, keys or step codes.
* **Minors:**
  * 2: the catalogue's JSDoc is back on `catalogue()`.
  * 4: the test restores the field and removes its draft row in `finally`.
  * 1 is noted: `startableMissing` passes no setup state. The status is the same; a setup-waiting line's step words can differ from the catalogue's, and only authors read them.
* **Not walked in a browser after the fix:** the toast change is CSS only, and the long tokens are gone from the officer's sentence.
* **Tests:** `check_s4_startable` 10/10.

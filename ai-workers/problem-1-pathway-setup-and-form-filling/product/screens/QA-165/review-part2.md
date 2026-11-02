# QA-165 part 2 — reviewer verdict (PR #592, runtime lane)

**Verdict: Block** (Ship after fixes): 2 Major, 6 Minor. Reviewed commit **ac3b72f3** (head after f23edbd0 → 57b05d3f → ac3b72f3; each delta reviewed and re-run). Reviewer agent, 2 Nov 2026; not the builder.

**The ask:** "each mandatory form field is either written from a fact or listed as 'needs an answer' before the file is offered" (C7.2, C7.6; P-237, P-238). Also dd21684b, the fixes for the #572 Minors m-1 to m-4.

## How it was checked
* **Setup.** A separate git worktree, pinned to each head. The isolated copy ran on **:4439** (`xr_studio_rev592`), with the steps of `isolated.sh` done by hand, since `pg_ctl` cannot read the scratch path. It had its own `node_modules` copy, so the Prisma client was generated without touching the builder's folder. A fresh database for each suite. No live AI, US$0.
* **Suites at ac3b72f3, all passing:**
  * `check_qa165_mandatory` 21/21 and `check_qa165_form_validation` 29/29.
  * `check_c72_imm5257_fill` 41/41: exactly the 6 empty fields of 46.
  * Setup 13/13; `check_runtime_r1c.cjs` 130/130; `check_runtime_r1d` 96/96.
  * `graph.mjs --check` exit 0.
* **Acceptance C7.6 at 57b05d3f:** it now runs to the end (3/23, red by design, as `acceptance/README.md` says). `validateRoundTrip` passes (C7.6-10), and there is no "asValidated is not defined". The m3.ts fix is right: `export { x } from` binds no local name.
* **Mutation:** the `UNASKABLE` branch removed → 18/21 (caught).
* **My own probes:**
  * every line through the API, for each person and form;
  * the words of all 46 mandatory IMM 5257 fields from the real field map;
  * render's coverage of those 46 fields for principal, spouse and child;
  * "none apply" confirmed on the spouse's employment;
  * a cost benchmark.

## Answers to the lead's questions
* **Written or listed, with no false omissions:** yes.
  * Nothing written gives 46 lines, each field once. On the answered case: 6 = 6.
  * IMM 5257 marks no signature or oath field mandatory; the `byAPerson` exclusion is tested on a synthetic list. Buttons are excluded.
  * Fields in repeating rows are listed: only `OccupationRow1` is mandatory.
  * The other people on the case get their own card each (spouse 34 lines, child 36).
  * Forms whose field list marks nothing mandatory show no list (IMM 5707, 5645, 5406, 5476: no `nullTest="error"` in IRCC's template), so the empty state is correct.
  * Online copies (P-145) now list their fields too (r1d: 46).
* **The reasons:**
  * At f23edbd0, "needs an answer" covered render's "no question placement", "not in the library" and "person not on the case", which no answer can fill. This was not reached on the Visitor visa release (its only unresolved cause on the 46 fields is the document one, 13 per person). **Fixed in ac3b72f3**, with tests.
  * Still not true: **M-2** below.
  * "no question asks it yet" is true for alias, national ID and US card: their transforms are non-group "recorded" Yes/No, and no question records a No. It holds today only by the wording of the transform (m-2).
* **The words:** **M-1** below. No raw field path is shown, but some lines name the wrong field or none at all.
* **Cost:**
  * `formValues` plus `mandatoryOpen` take 4.7 ms per form per person. The inventory parse takes 3 ms, once per file.
  * The forms list on a 7-person case took 270–460 ms in one request. There are no per-row requests (STANDARDS §9 met).
* **Screen states:**
  * Empty: no element. One line: "asks for it". Many lines: collapsed, with the count (14, 34, 36).
  * No sideways scroll at 390, 720 (200 % of 1440), 1024 and 1440 px. axe on the whole page: 0 violations.
  * Keyboard: Enter on the summary opens it. No console errors.
* **Not blocking "Ready to file": sound.**
  * P-237: "The only hard stop is a barcode form failing its own Validate."
  * P-238: missing facts "no longer block Ready to file. They are a CRITICAL warning that staff pass with a recorded reason". It supersedes P-71's block.
  * The CRITICAL warning with its recorded reason is row L-SA3 (BACKLOG), not this item. Listing now does not contradict it.
  * Words: `contracts/runtime.ts:188` cites P-71 for "does not block"; cite P-237/P-238 (m-6).

## Findings (open at ac3b72f3)
* **M-1 (Major) Wrong or empty words for the officer.**
  * Where: `engine/runtime/mandatory.ts:23-33` (the evidence quote first) and `web/src/runtime/forms.tsx:23,33` (field-name suffix).
  * On the r1c case at 390 px, the spouse's card shows **"Date of birth (form field: Country)"** and **"Date of birth (form field: Status)"**. These two boxes are the *current country of residence* and its *status*: their map evidence quote is "* Date of birth", which is wrong data.
  * "**YYYY**" and "**MM**" (employment start) carry no words.
  * "**Education Section Question 1.**": the 25-character sentence rule cuts off the question itself, so the PR's own "Question 1d." guard fails here.
  * The new suffix shows XFA names ("DOB Year", "Place Birth Country", "Israel Passport Indicator"). The contact and employment lines are both "City/Town (form field: City Town)", so the suffix tells nothing apart.
  * The principal's default card still shows the language-test question for Taiwan PIN and Israel passport (forms-lane data, listed in the PR).
  * Fix: for a mapped fact, name the line by the case's own question label. That is the `labels` map (fact → question) already built in `list()` (`api/src/fill-case.ts:134`) and used for by-hand lines (`:166`, "named by their question … never by their keys"). Show the form's words only for unmapped and not-a-fact fields. Drop the XFA-name suffix. Add a fail test: no line reads "YYYY"/"MM"/"Date of birth" for a residence field.
  * List the residence quotes for the forms lane next to Taiwan PIN and Israel passport.
* **M-2 (Major) "not answered yet" after a confirmed "none apply".**
  * Where: `engine/runtime/mandatory.ts:56`.
  * In the builder's own r1c state, Sample Applicant's employment has "none apply" confirmed. The card still says "YYYY / MM / Current Activity/Occupation / Company… — needs an answer: **not answered yet** (…: Employment and activity history)". I reproduced it on the spouse.
  * IRCC's row 1 is mandatory, so an entry is needed, but the officer did answer. The line contradicts a confirmed answer, and the next step (take back "none apply" and add the activity, or complete it in Adobe) is not said.
  * Fix: when the box's group is settled as "none apply" (the same test as `markNothingRecorded`), give that why. Add a fail test.
* **m-1** `mandatory.ts:56`: a document-sourced "needs an answer" says only "not answered yet (Sample Spouse D)", with no where (13 lines per person). Fix: name where the officer types it (the agent view section).
* **m-2** `mandatory.ts:50`: "recorded Yes/No has no No" is decided by the regex `/^derived:.*\brecorded\b/`, not by `p5/transforms.ts recordedDerivation` plus whether a "none apply" group covers its facts. Fix: decide it from the group.
* **m-3** `mandatory.ts:35`: `UNASKABLE` matches render's English detail strings, so a reworded detail silently brings back the false reason. Fix: a coded flag on `BoxRow` set in `render.ts`.
* **m-4** `api/src/fill-case.ts:81-87`: the inventory cache is never refreshed, while `writeForm` reads the file fresh. The list and the copy can differ after a field list changes, until a restart. Fix: key by mtime, or share one reader.
* **m-5** The consent line is cut mid-sentence ("…to a") with no "…": its evidence quote is 120 characters in the map (forms-lane data).
* **m-6** `contracts/runtime.ts:188`: cite P-237/P-238, not P-71.
* **dd21684b (#572 m-1 to m-4): fixed.** Docstring corrected. The "has not finished" words are checked in r1d. The `Barcodes.DateLastValidated` probe fails (29/29). The row is inserted before the rename, so a failed rename rolls back. `kept_by_form` from template bytes stays as it was (not reachable).
* **ac3b72f3 `solutionFile`:** a `.json` inside the solution folder only, tested. Symlinks are not resolved (author data; noted, not a finding).

## Scores D1–D20 (out of 5)
D1 Requirement fit 4 (every field listed; words and one why wrong) · D2 Data integrity 5 (read-only, same value step as a copy) · D3 Reuse 4 (`formValues` shared; the question labels not reused) · D4 Rule integrity 3 (M-2, m-2, m-3) · D5 Recovery 5 (refreshes on answer change and reload) · D6 Freshness 4 (m-4) · D7 AI n/a · D8 Orientation 4 (under the form card; count in the summary) · D9 Flow 3 (M-2: no next step after "none apply") · D10 Language 2 (M-1) · D11 Feedback 4 · D12 Visual 4 (dense at 34–36 lines, collapsed) · D13 Accessibility 5 (axe 0, 4 widths, keyboard) · D14 Team look 5 · D15 Speed 5 · D16 Testability 4 (property and mutation; words tested only against field paths) · D17 simulated only · D18 Provenance 4 (each line says why; the wrong quotes undercut it) · D19 Closure 4 · D20 simulated only.

## Journey test (reviewer role, the one score for this check): **8/10, pass (bare)**
* **Persona:** the case officer.
* **Journeys:**
  1. Main: open the case, then IMM 5257, then open the list by keyboard, then read the reasons.
  2. Empty: IMM 5707 shows no list.
  3. Many lines: the spouse (34) and the child (36) at 390 px.
  4. Wrong role: client and author get 403 on `/forms`.
  5. Recovery: an answer changed, then reload, and the count moves (12 → 13: the edit unconfirms it).
  6. "None apply" confirmed (M-2).
  7. Across the boundary: the same list on the Online copy (r1d).
* Walked headless in Chrome on :4439, twice. Console clean. Screenshots are in the reviewer's scratchpad (not committed).
* **Scores:** task completed 1 (6 = 6 on the answered case) · next step obvious ½ (M-2, m-1) · plain words ½ (M-1) · feedback and state 1 · correct data ½ (M-2's false "not answered") · error recovery 1 · accessibility and sizes 1 · speed 1 (case page 0.7 s; list ≤ 0.46 s) · visual quality ½ (3 identical long Yes/No whys; long lists) · trust and sources 1.
* **Raise first:** M-1 (plain words, visual), then M-2 (next step, data).

## Could not check
* A real Acrobat Validate on a copy (no Acrobat here), so whether IRCC's Validate asks exactly these 46 fields comes from the template's `nullTest`, not from a run.
* Forms with mandatory fields outside Visitor visa (IMM 0008/1294/1295/5710/1344): no case release with them in my copy.
* A real screen reader. D17/D20 (intended user).

**Verdict: Block** — commit **ac3b72f3**. To fix: **M-1** (name mapped lines by their question; no XFA names; fail test), **M-2** (the "none apply" why; fail test). Fix the Minors m-1 to m-6 or list them in the PR.

## Round 2 — b3881cfb and d75d5510 (reviewer, 2 Nov 2026)
**Verdict: Block** on **d75d5510**: 1 Major (a flaky check, new this round in my record, but present since f23edbd0). M-1 and M-2 are fixed.
* **How it was checked:** a fresh worktree pinned to b3881cfb, then d75d5510; its own `node_modules`; :4439 by hand; a fresh database for each suite.
  * At d75d5510: `check_qa165_mandatory` 37/37 (when it passes; see R2-M1), `check_qa165_form_validation` 30/30, `check_c72_imm5257_fill` 41/41 (at b3881cfb; its code paths are unchanged since), setup 13/13, r1c 132/132, r1d 96/96.
  * My walk again: 1440, 1024, 720 and 390 px with no sideways scroll; axe 0 on the page; keyboard opens the list; client and author 403; list 254–282 ms; console clean.
* **M-1 fixed.**
  * A line a question fills now reads the case's question words: "Country or territory where you live now" and "Your status in the country where you live now" (were "Date of birth"); "Start date of a period of activity or occupation (2 form fields)" (was "YYYY"/"MM").
  * The education line is no longer cut at "Question 1.".
  * Derived, unmapped and not-a-fact lines keep the form's words. Checked live for principal, spouse and child.
* **M-2 fixed.**
  * Rows of a group whose "none apply" is confirmed now read "fill it in Adobe: "none apply" is confirmed for "Employment and activity history", but IRCC's form requires this field: complete it in Adobe, or take back "none apply" and add the entry".
  * Checked on the principal in the r1c state.
* **#572-era Minors:** m-4 (mtime cache) and m-6 (P-237/P-238 cite) fixed. The breaker's `solutionFile` (realpath, no node_modules) and the date-with-a-year check (30/30) read correctly.
* **d75d5510 (`open-lines.ts`):** lines are grouped by caption alone, with a qualifier unique across the group. The new 500-run property never failed in 30 runs. The unit cases (reasons differ; three City/Town) hold.

### Findings (open at d75d5510)
* **R2-M1 (Major) The new check is flaky:** `tests/check_qa165_mandatory.ts:112`.
  * The property's names come from `/^[A-Z][a-z]{2,8}$/`. A name ending in "sig" or "sign" (counterexample `{"name":"Asig","required":true,…}`) is a signature to `isSignatureBox` (`engine/form-steps.ts:26`), so it is rightly never listed. The property expects it listed.
  * It failed **2 of 30** runs at b3881cfb, **2 of 30** at d75d5510, and 1 of 16 before that: about 7 %.
  * `run-suites.sh` runs every `tests/check_*.ts`, so CI and `main` go red at random ("`main` always works").
  * Fix: keep generated names clear of the signature and oath rules (e.g. `.filter((n) => !/sig(n|nature)?$/i.test(n))`), or derive the expectation with `byAPerson`. Run the check 30 times as proof.
* **R2-m1 (Minor)** `api/src/fill-case.ts:140` / `engine/runtime/mandatory.ts:56`: "none apply" settles *every* question of the section, not only its row questions.
  * Employment holds "Your present occupation" (`person.occupation`), still asked after "none apply". No mandatory IMM 5257 field reads it today, so this is latent.
  * If a mandatory field mapped it, the officer would be told "fill it in Adobe" for a question they can answer.
  * Fix: settle only row boxes (`b.row != null`), or only the group's row questions.
* **R2-m2 (Minor)** `engine/runtime/open-lines.ts:37`: one question filling several boxes still shows XFA names ("Current mailing address (form field: Streetname / City Town / Country)"). Readable, not the form's words. Listed for a later pass.
* **Still open from round 1, listed in the PR (accepted as Minors):**
  * m-1: a document-sourced line has no "where".
  * m-2 and m-3: wording regexes.
  * m-5: consent quote truncated.
  * The forms-lane captions of Taiwan PIN and Israel passport still show the language-test question.

### Journey score, round 2 (the one score for this check): **8.5/10, pass**
* task completed 1
* next step obvious ½ (document-sourced lines have no where)
* plain words ½ (Taiwan PIN/Israel captions; XFA suffixes)
* feedback and state 1
* correct data 1
* error recovery 1
* accessibility and sizes 1
* speed 1
* visual quality ½ (a two-line summary; long lists)
* trust and sources 1

**Verdict: Block** — commit **d75d5510**. To fix: **R2-M1** (the flaky property, with 30 green runs as proof). Then Approve on that head if nothing else changes.

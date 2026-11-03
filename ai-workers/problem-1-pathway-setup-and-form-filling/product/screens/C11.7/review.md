# C11.7 intake (P-297 (2)): review of commit ea9e3a507 (branch claude/funny-ride-h3nvar)

Reviewer: a fresh session that did not build it. Brief: tech-lead ruling P-297 (2), read word for word. This is not a new screen, so the D1–D20 table does not apply. Scope: the code change against its brief, the project rules and the existing suites.
Note: while this review ran, the builder pushed 170b2061a on top (two test files only, `check_s7_load.ts` and `check_c10_1_configured.ts`). The app code is identical, so every run below holds for ea9e3a507's code.

## What I checked, and what held
- **The reader, old against new, on every official file** (36 PDFs and 51 HTML pages in `official-sources/`, with the venv python `-I`). Exactly 3 outputs change. `imm5669e.pdf` goes from "no edition" to `IMM 5669 (05-2021)`, from `form_template`. `imm0008depe.pdf` goes from code `IMM 0008` with no edition to `IMM 0008 DEP (10-2024)`, `printed`. The canada.ca page `canada/pages/imm0008-dep.html` now reads code `IMM 0008 DEP` where it used to read `IMM 0008`. That third change is a correction, but the builder said every other file reads as before, and this one does not. Every other file is byte-identical apart from the new `edition_from` key.
- **Template `Version` against the printed edition.** 18 official PDFs carry a Version variable. On all 17 that also print an edition, the two agree. The builder's note says 15 (`read_form_identity.py:22`). A stale Version is possible in principle, but the printed edition always wins and the source is recorded as `form_template`.
- **DEP.** `(?![A-Za-z])` stops words like DEPENDANT and DEPARTMENT from matching. Plain IMM 0008 keeps `IMM 0008 (05-2026)`. `IMM 0008 DEP` is spelled the same way as `engine/canada.ts:51 normaliseCode` and `contracts/form-library.ts:13`, so the finder, the routes and the field-map job's `knownOk` all accept it.
- **Manifest rule** (`intake.ts:57-66`). The manifest's edition is taken only when the file is that entry (same SHA-256) **and** the entry's plain edition names the same code. The value is fixed to "en", which is safe because the manifest has no French entry. A matching entry with any other edition gives nothing, and the person decides. A mismatch is refused before any library write. The refusal runs only when the reader found a code but no edition. A file approved in the product cannot reach this branch, because `cannotApprove` never approves a file with no edition.
- **New suite** `check_c117_intake_edition.ts` on my own copy (:4441): **17/17**. Reset to the six adds both forms (origin SAMPLE, via the intake; nothing held). The audit lines record `edition_from` as printed and form_template.
- **Job files.** `field-map-new-jobs.ts` on that copy selects imm5645e, imm0008depe and imm5669e. All 6 jobs it makes are **byte-identical** to the committed files, and both inventory SHA-256 values match. All 5 new jobs pass `p2/launch.ts --stub` (exit 0, US$0). I ran them in a scratch copy with a scratch ledger, because the shared working tree is being used by the builder's suites. Prices: IMM 5645 US$0.53 usual / US$3.14 worst for each round, IMM 0008 DEP 0.98 / 3.61, IMM 5669 1.28 / 6.49 (draft) and 1.28 / 6.50 (checker). The IMM 5669 worst case is above the US$5 job budget; the builder has raised this as a question.
- **Other suites, on fresh copies (:4442–4449).**
  - Green: `check_c1113_near_release` 20/20, `check_forms_channels` 105/105, `check_forms_demo` 23/23, `check_qa163_listed_form_saved` 12/12, `check_forms_c24_same_and_new` 15/15, `check_forms_c312_field_map` 61/61, `check_gcore_b5_field_map_bulk` 19/19.
  - Green with 170b2061a's test text: `check_s7_load` 23/23 and `check_c10_1_configured` 27/27. At ea9e3a507 itself, those two assertions still expected only IMM 5645 to be waiting, so both suites were red.
  - Red, unrelated to this change: `acceptance/C11.7` 18/21 (part B, the Provincial nominee lines, which the builder has deliberately left out) and `acceptance/C10.1` 13/23 (release and case rows not built yet).
- `check_forms_s4_runs.ts:84` expects the founder's IMM 5669 record to keep waiting. I did not run that suite because it needs `STUDIO_AI_LIVE`. A plain `/demo/load` (the suite's own load) still logs "IMM 5669, IMM 5406 … wait for the form", because that load does not include imm5669e, so the check is unaffected.

## Blocker
1. **`tests/check_forms_pdf_hardening.ts` goes red: 41 passed, 8 failed, on ea9e3a507 and still on 170b2061a.**
   - Line 101 still requires the official IMM 5669 to be *held* ("could not read the edition of IMM 5669"). The intake now *adds* it, which is the very change this PR is for.
   - Because IMM 5669 now adds a row to the library, the `beforeRows() === rows` comparison fails in the next 7 checks (lines 103, 105, 108, 112, 123, 127, 134). The behaviour those 7 checks test is unchanged; they fail only because of the extra row.
   - Done-when requires "existing suites stay green". The merge queue runs every suite, so this PR cannot merge green.
   - Fix: change line 101 to the new rule (the official IMM 5669 is added with `editionFrom: "form_template"`, and the PDF-hardening "dynamic XFA" case moves to a file with neither a printed edition nor a Version). Take the row baseline after that upload. Rule from WAY-OF-WORKING: "when a decision changes behaviour, its pack changes in the same PR."

## Majors
None.

## Minors
1. **The run card contradicts the refusal** (`api/src/upload-run.ts:124`, `:129`). I walked it in Chromium on :4441: Form library › Upload PDF, then a mismatched `imm5669e.pdf`.
   - Step "Read what this file is" says the file "waits for a person to check it".
   - Step "Compare with canada.ca" says "the form number is not known", even though the reader found IMM 5669.
   - Step "Add it to the library" then says "Refused … Nothing was added".
   - The person is told two different outcomes, and is sent looking in To review for a file that is not there.
   - The card's read step runs the reader without the P-297 (2) rule. So in the manifest case it would also say "waits for a person" for a file that is then added.
   - Fix: give that step the outcome of `editionFromManifest`.
2. **The plain-IMM-0008 guard is not pinned by a test.** I removed the `(?!\s?DEP)` lookahead (`read_form_identity.py:136`) and `check_c117…:44` still passes: the official imm0008e only prints "IMM 0008DEP" without an edition next to it. Add a made PDF titled IMM 0008 whose text prints `IMM 0008DEP (10-2024)` and no plain edition. Likewise, no test fails if the "exactly one Version" condition (`:145`) is removed.
3. **The checksum path is tested only as a pure function.** No request goes through `one()` with `listed.use` (the audit `edition_from: "manifest"` and its message are untested), because no real file reaches it any more. This is acceptable given that the rule is pure, but say so in the PR.
4. **The refusal wording is wrong for a newer official edition.** Take a newer official IMM 5669 that prints no edition and has no Version (for example one the finder downloaded from canada.ca). It is refused with "Upload the official PDF from IRCC", although it *is* official. Before this change it was held, and it could never be approved anyway, so the outcome is the same. Only the words mislead; something like "…or, if this is a newer edition, ask the tech lead" would fix it.
5. **IMM 5669's two jobs are over the US$5 budget at worst** (US$6.49 / 6.50). `p2/runner.ts` reserves the worst case for each attempt, so the first attempt (about US$3.25) runs and the retry is refused before any call. The builder raised this; it needs a ruling (raise the budget, or split into parts as imm1344e-p1of5 does) before the Go.

## Nits
- In `check_c117…:82`, the `missing` test `/imm5669e|imm0008depe/` checks a form code, never a file name, so that part can never fail. The `intake_item` and `form_edition` counts are the real check, and they hold, because Reset rebuilds the library from SAMPLE.
- The `waitingForms` query (`field-map-new-jobs.ts:33-35`) is not limited to one workspace. That is fine on a single-workspace copy, but worth saying in the tool's header.
- The record facts in the builder's account and code comment: the HTML page's code changed, and there are 17 files with both editions, not 15.

## Journey test (reviewer role; API and one browser walk; persona: the content author)
Journeys walked:
1. Reset to the six: both forms come in, with no held file.
2. Upload the official IMM 0008 DEP and IMM 5669: both added, each saying where its edition came from.
3. Upload a copy coded IMM 5669 that prints no edition: refused in words, nothing written.
4. Upload an unlisted code with no edition: still held for a person.
5. The library list shows `IMM 0008 DEP` and `IMM 5669` as "Not mapped yet".

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | journeys 1–5 hold (suite 17/17; library screenshot) |
| Next step obvious | ½ | the refused card also says "waits for a person" (Minor 1) |
| Plain words | ½ | the same contradiction; otherwise plain |
| Feedback and state | ½ | the card's steps disagree with its final state |
| Correct data | 1 | form_edition rows, audit `edition_from`, no row on refusal |
| Error recovery | 1 | refused leaves nothing; upload the official file again → added |
| Accessibility and screen sizes | ½ | axe WCAG 2.2 A/AA: 0 violations; 400 px: no sideways scroll; keyboard-only and 200 % zoom not walked |
| Speed | ½ | answer within about 2–6 s (my wait included a fixed 4 s); not measured against §9 |
| Visual quality | 1 | unchanged team look |
| Trust and sources | 1 | edition source recorded and said; checksum rule shown in the words |

**Score: 7.5/10**, below the pass mark of 8. The most valuable fix is Minor 1, which raises the next-step, words and feedback criteria together.
Not tested: a real screen reader; an intended user's unaided walk; `check_forms_s4_runs` (needs a *_LIVE switch); the full suite set.

**Must fix before Approve:** Blocker 1. Minors 1–2 are strongly advised in the same PR; Minor 5 needs a tech-lead ruling.

Verdict: Block

---

## Round 2 (P-293, last round): diff-only, `git diff ea9e3a507..4cd02eece` (170b2061a + 4cd02eece)

Note: 4cd02eece also commits this review file (round 1 text unchanged).

**Checked**
- **Blocker 1 is fixed.** `check_forms_pdf_hardening.ts:100-104`:
  - now expects the official IMM 5669 to be `added` as `IMM 5669 (05-2021)`, with `editionFrom: "form_template"` and plain words;
  - takes the row baseline again after that upload;
  - still keeps a held case for a coded XFA form with no edition (IMM 9998).
  - Run on a fresh copy: **49/49**.
- **Minor 1 is fixed.** `upload-run.ts:119-122` applies `editionFromManifest` straight after the read, the same rule as the intake.
  - A mismatch makes the read step FAILED with "not the official imm5669e.pdf … It will be refused" (`:130`), and the compare step now runs whenever a code was read (`:136`).
  - A source-list or template edition says where it came from (`:129`). The card and the result now agree.
  - New card check in `check_c117…`; it would fail on the old card, which said "waits for a person".
- **Minor 2 is fixed.**
  - Template Version: a new pass check (one Version) and a fail check (two different Versions give no edition).
  - DEP guard: the `(?!\s?DEP)` guard is removed, and the reasoning holds. After the digits the edition pattern allows only `\s?-?[EF]?\s*\(`, so "IMM 0008DEP (10-2024)" can never give plain IMM 0008 an edition.
  - I re-ran the round-1 reader against the round-2 reader on every official file (87 PDFs and HTML pages): **0 differences**.
- **Minor 4 is fixed.** `intake.ts:312`: the refusal now adds "if this is a newer edition, it needs its own row on the source list first".
- **Minor 3 is accepted as left.** The checksum path stays a pure-rule test; a test-only manifest override would weaken the trust anchor. It is named in the PR.
- **Minor 5** is a tech-lead question in the PR; it is not a code defect.
- **Suites on fresh copies (:4441–4448), on 4cd02eece:**
  - `check_c117_intake_edition` 20/20
  - `check_forms_pdf_hardening` 49/49
  - `check_forms_c24_same_and_new` 15/15
  - `check_forms_channels` 105/105
  - `check_s7_load` 23/23
  - `check_c10_1_configured` 27/27
  - `acceptance/C11.15` 37/37
  - `acceptance/C3.12` 17/17
  - Not run by me: `check_forms_s4_runs`, which needs a *_LIVE switch. The builder reports 91/91.

**New findings:** none. No Blocker or Major is open.

**Journey score, revised:** the contradiction in the card is gone (next step, plain words and feedback each go from ½ to 1). Accessibility and speed are unchanged at ½. **9/10**, which passes, and no criterion is at 0.

Verdict: Approve

---

## Round 3 (CI fix): diff-only, `git diff 41bc8c020..49b4c86e5`

**Checked: the fix is real, not a test bent to pass**
- **Formats files (P-162).** I copied `p1/` to a scratch folder, deleted every `.formats.json` and ran `p1/xfa_formats.py` (no AI).
  - All 21 formats files came out **byte-identical** to the committed ones, including the two new ones: `imm0008depe` (39 boxes with a format, 0 unmatched) and `imm5669e` (0 with a format, 91 unmatched).
  - Their `sha256` equals each inventory's `summary.sha256` and each official file's checksum.
  - `check_forms_c31_formats` on a fresh copy (:4441): **107/107**.
- **R-146 list.** `check_r146_whole_form_output.ts:28` rewrites the list only. The independent check above it (`:27`, every committed job equals what `wholeFormOutput` gives its inventory) is unchanged, and it passes.
  - imm5669e has 295 fields with a data path, which is at least 240, so 128k / 1,500 s follows from the rule; it is not a choice.
  - imm0008depe has 74 fields, so it stays at 64k.
  - Run: **7/7**.

**Finding (Minor, already logged by the builder as a follow-up): IMM 5669's formats file records 0 boxes with a format and 91 unmatched.**
- The cause is that the reader's path matching fails on this form, so the file says "no format rules" when the truth is "not read".
- Nothing uses IMM 5669's formats yet: it has no field map until its paid run.
- It should be fixed, or the file marked as not read, before IMM 5669's field map is accepted.
- Not a Blocker for this PR.

No new Blocker or Major.

Verdict: Approve

---

## Round 4 (usage line): diff-only, `git diff 827b45489..ed30c8a6b`

**Checked**
- **Scope.** Only the comment header of `tests/check_c117_intake_edition.ts` changes. The usage line is now the standard `isolated.sh c117 4452 start && tsx studio/tests/…`, plus a "(by hand: tsx --tsconfig …)" note.
- **The matcher.** I applied `run-suites.sh`'s own server-suite pattern (`:196`) in bash to the usage line it picks (`:183`, the first line naming the file).
  - New line: **matches** (name c117, port 4452, tool tsx, arguments `4452 xr_studio_c117`).
  - Old line (827b45489): **does not match**. That explains CI's ECONNREFUSED: the suite ran with no isolated copy.
  - `run-suites.sh` runs tsx as `$TSX` (`:68`), which already carries `--tsconfig api/tsconfig.json`, so dropping the flag from the usage line loses nothing.
- **The other suite files this PR touches** (`git diff origin/main...ed30c8a6b`). All server suites match the pattern:
  - `check_c10_1_configured` (runtime_c101 4431)
  - `check_forms_pdf_hardening` (forms_pdf 4450)
  - `check_s7_load` (runtime_s7 4435)
  - `check_r146_whole_form_output` does not match, which is correct: it is offline (no database, no server) and runs without a copy.
  - `acceptance/C11.7.test.ts` changes only an assertion; its usage line is untouched.
  - No other suite file has the problem.
- **Run.** I started the copy the way `run-suites.sh` does (isolated copy on :4441, `tsx --tsconfig api/tsconfig.json <file> <port> <db>`): **20/20**.

No new Blocker or Major.

Verdict: Approve

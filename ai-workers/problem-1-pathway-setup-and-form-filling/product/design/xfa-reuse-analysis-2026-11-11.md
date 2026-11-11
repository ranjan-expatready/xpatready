# Adopting the team's XFA engine: analysis and plan (row B170, founder ask A16)

Written 11 Nov 2026 by the Fable planner for B170 (read-only: no product code changed). Brief: `xfa-engine-reuse-brief-2026-11-11.md`. Records only. **Fourth version**, after the founder's rulings P-464 to P-467 (what changed since the earlier ones: section 9).

**In one paragraph.** The founder ruled (P-464 to P-467): we own this code; the engine's source is copied unchanged into our repository as its own package with its tests in our CI; **each part is then judged head to head against ours on the same inputs. The better one wins, a tie keeps ours, and where theirs is the better base with a gap we adopt it and fix it.** Nothing is force-fitted and nothing good is left behind. Measured result (section 3): **ours stays** for writing the PDF, reading it, the field lists, the signature check, the "validated in Adobe" check and the barcode check on a validated copy. **Theirs wins** for two things we do not have: pressing the form's own Validate before download (same answer as Adobe on our own copy, in 0.2 seconds) and showing the filled form in the app (our own form drawn as pages in 1.5 seconds). **Theirs is the better base but needs a fix** for the barcode text (3 of 5 equal to Adobe's today) and for form coverage: its form-script part reads **2 IRCC forms (IMM 5257 and IMM 1295)** and refuses 18 of the other 19 blank forms in the share. The writer is a measured tie, so ours stays until a trial measures the two numbers still missing.

Words used here: **engine** = the team's TypeScript package `xfa-engine`. **Form's own check** = the Validate button's script that IRCC ships inside the PDF. **Barcode text** = the characters a barcode holds (the form builds them; Adobe then draws them as a picture). **Adapter** = one small file on our side that calls the engine and turns its answer into our words. **Switch** = a setting that turns one engine feature on in the app; every switch starts off and is turned on by the row that proves it. **Head to head** = ours and theirs run on the same form and the same data, numbers side by side.

---

## 0. The founder's rulings (P-464 to P-467, 11 Nov) and what they change

His words, as the Lead passed them on: "it is a production grade development ... subject to testing and validating whether it meets all our standards"; "adopt the entire code without writing from the scratch ... save token ... we know that it is tested ... move fast, speed, quality"; "there's no approval required from any team ... we are the owner ... we can use it the way we want"; the report to the team says "from your POC, this is what we have used, that's why we used, and if there's any element which we don't want to use ... why".

He chose: the engine's source, unchanged, in our repository as its own package (`packages/xfa-engine/`), with a note of where it came from (the team's version), its tests in our CI, one thin adapter, and our fixes kept small so newer team versions can be taken in. The share's "do not push" note is overridden by the owner. Test PDFs stay out of git.

**P-465 (his words):** "make sure that you're not force fitting any XFA. If any of our functionality is better ... don't force fit it, but don't leave anything good. Analyze, evaluate, don't assume anything, and then pick up the best ... I don't want you to start force-fitting and using the XFA and throw away our good stuff." So: a measured head to head per part; the better wins; a tie keeps ours; the copied source stays only if at least one part wins, and only winning parts go live.

**P-466:** Q2 answered, "Yes, small row now": "View form" (read-only) comes right after the source copy, outside the Bake's count; it counts only after a look in a real browser and a side-by-side with Acrobat; no editing in the browser now.

**P-467 (his words):** "there may be better in XFA, but it has some improvement required or small adjustment required. So they will pick up from XFA and improve it if it is missing in our existing POC." So a third verdict: theirs is the better base but needs a fix; we adopt it and improve it, small and recorded against the team's version, listed in the team report.

What this changes from my first version, and what I think of it:
* **Framing:** from "reuse where it makes sense" to "bring the whole source in, judge each part head to head, switch on only what wins". Some parts are simply off, with the reason and what would turn them on.
* **The head to head corrected my own plan in one place:** reading the barcode text Adobe stores in a validated copy needs no engine at all; our own reader does it (measured, 5 of 5). Row e now uses ours for that and the engine only for the text expected before Adobe.
* **Packaging:** I had recommended one built package file with no source. The founder's choice is better for three reasons I can show: the tests come with it and run in our CI; the page writer (a helper script outside the built package) comes with it, so the read-only view needs nobody's OK; and a small fix such as the barcode number format (finding T1) becomes possible. Its one cost is drift from the team's copy, handled by the rules in 4.2.
* **"We know that it is tested": true for two forms.** Section 1 is the measured boundary. The founder's own condition ("subject to testing and validating whether it meets all our standards") is what the switches and the rows' "Done when" lines carry out.

---

## 1. What arrived, and what is proven versus planned

Source: `ERv2-xfa-full.bundle` (sha256 `897c25bf7641aa31…`), branches `feat/xfa-engine` (head `db9b47ae`) and `feat/xfa-viewer` (head `a0119727`, 20 Oct 2026, the newer one; it contains the first). The engine is `packages/xfa-engine/`: 512 files, about 24,500 lines of source and about 200 test files (63,000 lines in all, 3.3 MB), written 18 to 20 Oct in 56 commits. Looked at in a scratch clone outside the repository; nothing from it is committed here.

### 1.1 What I ran (11 Nov, scratch copy, our own Node 24.21.0)

| Check | Result |
|---|---|
| Build (`tsc`) | exit 0 |
| The engine's own unit tests (201 files, 3,369 tests) | **3,367 pass, 1 fails, 1 skipped** in a full run on Node 24.21.0 (a "hostile script too large" limit test failed) and again on Node 23.11.0 (a different one failed, a compressed-stream junk test). **Run alone, both pass, twice.** So they are limit tests sensitive to machine load, not form behaviour and not a Node-version fault. The team reports all green on its Node 24.15.0. |
| The team's real-form suite ("corpus", 401 tests) | **Not run here**: it needs the tool `qpdf`, which is not installed on this Mac. The team reports 401 passed, 1 skipped. Not re-confirmed. |
| Open every IRCC form in the share (24 files: 21 blank forms, 3 Adobe-saved) and read its inside parts | **24 of 24 open** (all are encrypted; the engine decrypts them) |
| Load the form through the form-script part | **2 of 21 blank forms fully supported: IMM 1295, IMM 5257.** A third (IMM 5645) loads but is a static form (1 page; not checked further). The other 18 are refused at once with a named reason (table in 1.3). |
| Our own copy: the finished story's Paper IMM 5257 (copy `9c00dbfc`, written by our Python writer, **before** Adobe) → engine runs the form's own Validate | **"Validation completed successfully"**, flag Yes, 5 barcode texts built. Load 0.7 s, Validate 0.2 s. Adobe gave the same sentence on the same copy on 10 Nov (C10.2's record). |
| Same copy: the engine's list of problem boxes | **Exactly 2: Taiwan PIN and Israel passport**, the same two boxes QA-165's list names today (they are marked mandatory in the form but the form's own script asks for them only for two issuing countries, so Validate still passes). |
| Adobe-validated copies (the team's IMM 5257 and IMM 1295, and **our** `paper-9c00dbfc-validated.pdf`): the engine rebuilds the 5 barcode texts and I compare them with the texts Adobe itself stored in the file | **3 of 5 identical on every file. The other 2 differ in one piece each: a month written "03" by the engine and "3" by Adobe** (on ours also "07" against "7"). Everything else in those two barcodes is identical (they have 63 and 39 pieces; one piece differs in each). This is a real difference from Adobe; see 5 (finding T1). |

Probe scripts are in the planner's scratchpad (`probe/breadth.mjs`, `parity.mjs`, `validate.mjs`); builders re-create them as real tests in rows b, e and g. Copies are in the shared notes folder.

### 1.2 Part by part

| Part of the engine | What it does | Proven by | Still only planned |
|---|---|---|---|
| **PDF reading** (about 2,000 lines) | Opens an encrypted IRCC PDF (AES, the kind IRCC uses), reads its inside parts | Unit tests; the team's match against `qpdf`; **my run: 24 of 24 open** | Other kinds of encryption are refused on purpose |
| **PDF writing** | Adds the changed data to the end of the file, encrypted, original bytes untouched | Unit tests; the team's owner opened the result in Adobe Reader for both forms (18 Oct) | It does not check signatures itself (ours does, with `openssl`) |
| **Form model** (6,500 lines) | Builds the live form from template and data; finds any box by its path | Unit tests; both forms | Repeating sections, shared ("global") boxes, most FormCalc, some input patterns: refused (1.3) |
| **Script sandbox** (2,500 lines) | Runs the form's own JavaScript inside a locked box (QuickJS) with time and memory limits | Unit tests, including attack tests | One known gap the team lists: a giant pattern written straight into script code |
| **Run-time** (3,600 lines) | Load events, set a value, press Validate, build barcode texts, list problem boxes, save | Unit tests; the team's Adobe checks on 2 forms; **my runs on our own copy** | Barcode texts equal to Adobe's: **not yet** (finding T1). Drawing the barcode picture: not started (their "Plan B") |
| **Page layout** (8,300 lines) | Works out pages, boxes and text positions as data a screen can draw | Unit tests; page counts match the saved forms (5 and 6 pages) | The owner's side-by-side with Acrobat was still pending on 20 Oct; barcodes are empty placeholders |
| **Browser worker** (1,100 lines) | Runs one form in a killable background worker, with replay | Unit tests; a measured kill-and-replay proof | Nothing on screen uses it yet |
| **Viewer screens** (React) | Open, fill, validate, download in the browser | **Nothing built.** The share has plans (wave 4, tasks T17 to T25), 19 open questions and 11 mock-up pages. The team's front-end branch has one commit with no screens. | All of it |
| **HTML page dump** | A script that turns the layout into one HTML page per form page | Used for the renders in the share | It is a helper script, not part of the package's public surface |

### 1.3 Why 18 forms are refused today (measured at the newest commit)

| Reason the engine gives | Forms |
|---|---|
| Repeating or optional sections | IMM 0008, 5406, 5444, 5481, 5562, 5707, 5768 |
| A box shared across the form ("global" binding) | IMM 1283, 5490, 5532 |
| FormCalc beyond a plain reference | IMM 1344, 5409 |
| Input patterns the engine does not know (letters in postal codes, "zero") | IMM 1294, 5476, 5708, 5709, 5710 |
| No data part in the blank file | IMM 5669 |

This matches the team's own note of 19 Oct ("0 of 19 load fully"). **Of our four barcode forms (IMM 5257, 0008, 1344, 1295) the engine covers two.** IMM 1294 (Study permit, the Bake's exit pathway) is refused, so nothing in this plan may sit on the Bake's exit path.

### 1.4 Licence and third-party code

* The engine is the team's own code, marked `UNLICENSED` and private: it belongs to the company, with no outside licence on it.
* It depends on six libraries, **all MIT**: `quickjs-emscripten-core` and `@jitl/quickjs-wasmfile-release-sync` 0.32.0 (the script sandbox), `@noble/hashes` 2.2.0, `@xmldom/xmldom` 0.9.12, `acorn` 8.17.0, `zod` 4.4.3. Our app already uses the same `zod` and TypeScript versions; **five libraries are new to us** (and Vitest, which the engine's tests use) and go through the technology gate (`STANDARDS.md` §1) in row B170a.
* A few layout defaults follow Mozilla's pdf.js (Apache-2.0); the team's build adds the notice and licence text to the built package. Nothing copyleft.
* The share's README asks that its branches are not pushed without the team lead's OK. **The founder, as owner, overrode this on 11 Nov (P-464):** the source goes into our repository as its own package. Our rule 1 still keeps `code/` (the share as it arrived) out of git.
* The IRCC forms themselves are never committed (crown copyright; our push guard refuses PDFs). CI already fetches official forms from canada.ca.

---

## 2. Our side today (facts, with where they live)

| What we do | How | Size | Proof |
|---|---|---|---|
| Write values into the PDF (C7.1) | The API starts a Python script (`p5/fill.py` → `p1/e5_roundtrip.py`, `p5/page_fields.py`): data added at the end of the file, re-encrypted with the form's own key, signatures checked with `openssl` | about 680 lines of Python, using private parts of the `pypdf` library; the file's own note calls the writer "demonstration-only" | C7.1 Works; C10.2 Works: Adobe Validate passed and 75 of 75 values read back equal |
| Know a copy was validated | `studio/tools/read_validated.py` reads the flag and date Adobe wrote; the field names are fixed in the Python | 93 lines | QA-165 part 1 |
| List empty mandatory boxes before download (QA-165) | `engine/runtime/mandatory.ts` from the form's "required" marks, plus a **hand-kept** file of script conditions (`samples/form-script-requirements.json`: Taiwan, Israel) | 102 lines + the data file | 2 of 46 listed on IMM 5257 |
| Check barcodes (C7.2) | **Mac only, by hand:** Adobe draws the page, a screenshot or print is taken, `p1/decode_barcodes.py` reads the pictures, `evidence-lane/E1/tools/barcode_compare.py` compares | 41 + 165 + 272 lines | Not in the app: the upload door reports `barcode_checked: false`; C7.2's pack step for the barcode report fails; C7.2 is **Partial** |
| Show the filled form on screen | Not done: download only | | |

---

## 3. Ours against theirs, measured (P-465, P-467)

Rule: the better one wins; **a tie keeps ours**; where theirs is the better base but has a gap, we adopt it and fix it (small, recorded); nothing is assumed. Every cell is a measured number or says "not measured yet" with the row that measures it. Same inputs on both sides: the blank IMM 5257 from canada.ca (sha256 `0dc03b24…`), the data of our finished-story Paper IMM 5257 (copy `9c00dbfc`, 483 KB of form data), its Adobe-validated twin, and the team's test forms. Scripts: `h2h_ours.py`, `h2h_engine.mjs` and the earlier probes, in the shared notes folder.

The four verdicts: **Ours wins** · **Theirs wins as is** · **Theirs is the better base, needs a fix** · **Not used**. One more, honest one: **Not decided (ours stays)**, where a number that could change the result is not measured yet.

### 3.1 Where both sides have something

| Part | Ours | Theirs | Verdict |
|---|---|---|---|
| **H1 · Write values into the PDF** | Python (`e5_roundtrip.py`, `page_fields.py`, `fill.py`, about 680 lines) on the `pypdf` library's private internals; its own note says "demonstration-only" | Own TypeScript writer (PDF layer about 2,000 lines, 26 test files) | **Not decided: a tie on everything measured, so ours stays.** Row i measures the two missing numbers. |
| · original bytes kept | yes (the copy starts with the blank's exact bytes) | yes | tie |
| · DocMDP and UR3 signatures (our `openssl` check) | verified, verified | verified, verified | tie |
| · encryption kept; the other side's reader reads it back equal | yes; the engine reads our copy equal | yes; our reader reads the engine's copy equal | tie |
| · bytes added for the same data | 87,660 | 87,901 | tie |
| · time for the write itself (5 runs) | 89 to 107 ms | 36 to 76 ms, opening included | theirs, but neither is felt by a person; the app's whole fill step is not measured yet (row i) |
| · same input gives the same file | not shown: my re-run differs from the app's copy after the blank's bytes (the app also runs its page-fields step; not looked into) | yes, twice identical | theirs |
| · Adobe Validate on a copy of **our** data | **passed** (10 Nov; 75 of 75 values read back) | **not measured yet** (row i). The team's owner passed Adobe on their own made-up data (18 Oct) | ours, until measured |
| · forms it has written and proven | every Paper form the app fills today | IMM 5257 here; the other forms **not measured yet** (row i) | ours, until measured |
| · upkeep | Python environment, `openssl`, `pdftotext`, private library internals that can change under us | no outside tool; one package | theirs |
| **H2 · Open the PDF and read its data** | `pypdf` (reading the data: 11 ms); field lists exist for 38 forms | 24 of 24 files in the share open (30 to 39 ms) | **Tie: ours stays** for our own reading. Each side reads the other's copy and gets the same data. Theirs is used only inside its own features. |
| **H3 · Field list per form** (boxes, required marks, labels) | 38 forms; feeds 18 saved field maps | no such output | **Ours wins** (nothing to compare) |
| **H4 · Signature check** | DocMDP and UR3 verified with `openssl` on every copy | none | **Ours wins** |
| **H5 · "Was this copy validated in Adobe?"** | Reads the flag and date on all 4 barcode forms (English and French, two date shapes) | Reads the flag only on the 2 forms it can load; same answer as ours on our validated copy | **Ours wins** (4 forms against 2, same correctness) |
| **H6 · Which mandatory boxes are still empty, before download** | Required marks plus a hand-kept list of script conditions. On our finished-story IMM 5257: **2 of 46 listed**, both boxes the form's own script does not ask for | Presses the form's own Validate: **"Validation completed successfully", as Adobe said**; 0.2 s; names the first missing box and the form's message when it fails | **Theirs wins as is, on the forms it reads (2). Ours stays for the others** (38 forms with a field list). |
| **H7 · Do the barcodes match the facts?** | Picture decode of the barcode Adobe drew: the truth by definition, but by hand on the Mac, minutes per copy, not in CI. Any barcode form. **Also measured now: our own reader finds the 5 barcode texts Adobe stored in our validated copy (5 of 5, no picture needed).** | Builds the form's barcode text itself: 0.2 s, in CI, 2 forms; **3 of 5 equal to Adobe's, 2 differ by a number format** | **Split.** For a validated copy: **ours wins**, with a small addition to our reader (row e, no engine). For the text expected before Adobe, which we do not have at all: **theirs is the better base, needs a fix** (row g). Same for IMM 0008 and IMM 1344: not measured yet (row e). |
| **H8 · A stand-in for Validate in tests** | Writes the flag by hand (test only), any form | Runs the real script, 2 forms | **Tie: ours stays** in tests. The real script is H6. |

### 3.2 Where only theirs exists

| Part | Measured | Verdict |
|---|---|---|
| **N1 · The form's own Validate before download** | Same answer as Adobe on our copy; 0.2 s | **Theirs wins as is** (2 forms). Row f. |
| **N2 · The form's own barcode text before Adobe** | 3 of 5 equal to Adobe on three validated copies | **Better base, needs a fix** (month "03" against "3"). Rows e and g. |
| **N3 · See the filled form in the app ("View form")** | Our own form drawn as 5 and 6 pages in 1.5 s; barcodes are placeholders. Real-browser look and Acrobat side-by-side: **not measured yet** (row d) | **Theirs wins**; the founder said yes (P-466), and it counts only after those two measures. If the side-by-side finds differences, it becomes "needs a fix". |
| **N4 · Reading more of our forms** | 2 of 21 blank forms load; 18 refused with a named reason (1.3); 2 of our 4 barcode forms | **Better base, needs a fix** (P-467). Row j sizes each reason first; fix rows follow, small ones ours, large ones agreed with the team (Q4). |
| **N5 · A validated copy with no Adobe step** | Works technically on our copy (0.2 s). Against an Adobe-validated copy of the same case: **not measured yet** (row h) | **Not decided.** Adobe stays the proof (P-442); **Unconfirmed: no counsel**; Q5. |
| **N6 · The machinery under N1 to N3** (form model, box paths, script sandbox, events, safe XML, reading Adobe's saved state, fonts, layout) | 3,367 of 3,369 unit tests; nothing unsupported on the two forms | **Comes in with the winners.** Nothing of ours competes. |
| **N7 · Browser worker; clear-button, user-access and host-request reports** | Unit tests only | **Not used**: only a fill-and-edit screen needs them, and our forms are filled from case facts. |

### 3.3 What this means for the copy (P-464, P-465)

At least three parts win (N1, N3, and N2 after its fix), so the source copy stays. **Only these go live, each behind its switch, each by its row:** the form's own check (row f), the expected barcode text (row e, then g), View form (row d). **Ours stays** for writing, reading, field lists, signature checks, the validated flag, and the barcode check on a validated copy. Everything else in the package is present, tested in CI and off.

### 3.4 Every feature in the share, and when it goes live

The same result, feature by feature, so nothing in the share is left unjudged. Each line carries one of the four verdicts (**ours wins** · **theirs as is** · **theirs + fix** · **not used**) with its number or "not measured yet" and the row that measures it, then when it goes live. **On now** = part of a winner (or the machinery under one), switched on by one of the first rows (B170a to f). **On after …** = waits for the named row or ruling. **Not used** = copied and tested with the rest, switch off, with the reason and what would change it. Everything in `packages/xfa-engine/` is copied whatever its verdict.

#### Reading and writing the PDF

| # | Feature | Proven by | Verdict and when | Why · what it moves |
|---|---|---|---|---|
| F1 | Open the PDF: objects, cross-reference tables and streams, object streams, compression | Unit tests; the team's match against `qpdf`; my run: 24 of 24 open | **Theirs as is**, inside its own features (24 of 24 open). For our own reading a tie keeps ours (H2). When: **On now** (inside every engine feature, from row c) | It is the engine's front door. Head to head H2 and H3: a tie on reading, and ours wins on field lists, so our own reading stays ours. |
| F2 | Decrypt the kind of encryption IRCC uses (AESV2); refuse every other kind with a named error | Unit tests; all 24 files are encrypted and open | **Theirs as is** (24 of 24 encrypted files open). When: **On now** | Same door. Refusing other kinds is right for us too. |
| F3 | Pull out the form's inside parts (template, data, saved form state) | Unit tests; 24 of 24 | **Theirs as is** (24 of 24). When: **On now** | Needed by everything below. |
| F4 | Pull out the fonts embedded in the PDF | Unit tests; used by the page dump | **Theirs as is** (fonts drawn in the pages of section 8; real-browser look not measured yet, row d). When: **On after B170d** (view) | Only drawing pages needs it. |
| F5 | Write changed data back as an addition at the end of the file, re-encrypted, original bytes untouched | Unit tests; the team's owner opened results in Adobe Reader for both forms (18 Oct) | **Ours wins (a tie keeps ours, H1).** Adobe Validate on an engine-written copy of our data: not measured yet, row i. When: **On after B170i** (writer trial); until then our Python writer stays | Head to head H1: a tie on everything measured, and a tie keeps ours. Ours is proven by Adobe on our data (C7.1 fill, C10.2 finished story); theirs is not measured on our data yet. If it wins: about 680 Python lines, `pypdf` private internals, and the Python step leave the fill path. The engine does not check signatures; our `openssl` check stays either way. |
| F6 | Safe XML reading (refuses document-type tricks; cleans illegal characters on write) | Unit tests | **Theirs as is** (unit tests; nothing of ours to compare). When: **On now** (inside) | Defence we get for free. |

#### Understanding and running the form

| # | Feature | Proven by | Verdict | Why · what it moves |
|---|---|---|---|---|
| F7 | Form model with a gate that refuses what it cannot model, naming the reason | Unit tests; 2 forms pass, 18 refused cleanly (1.3) | **Theirs + fix** (2 of 21 blank forms pass the gate; row j sizes the 18 refusals). When: **On now** | The gate's reason becomes our line "not available for this form yet: …". Never a silent pass. |
| F8 | Merge template and data: values, choice lists, date/number/text patterns | Unit tests; both forms; the team's check of every value against three Adobe-saved copies (270, 270 and 268 values identical) | **Theirs + fix** (values equal to Adobe's on 270, 270 and 268 leaves; barcode number format 3 of 5, row g; 5 forms refused for input patterns, row j). When: **On now** | Lets the engine read a copy written by our writer or saved by Adobe. |
| F9 | Find any box by its path | Unit tests; all 186 barcode references on both forms | **Theirs as is** (186 of 186 barcode references found, the team's number). When: **On now** | Used by the checks. |
| F10 | Read the state Adobe saves with a form (so a saved copy reopens as Adobe left it) | The team's Adobe-copy tests | **Theirs as is** (our Adobe-validated copy loads with 5 of 5 stored barcode texts). When: **On now** | Needed to read validated copies in row e. |
| F11 | Script sandbox (QuickJS in WebAssembly): time, memory and pattern limits, attack tests | Unit tests including hostile scripts; one gap the team lists (a giant pattern written straight into script code) | **Theirs as is** (attack tests pass; one gap the team lists). When: **On now** | Our inputs are official IRCC forms, not hostile ones; we still run it in a separate process with a time limit. |
| F12 | Event engine: load events, calculations, click, exit, change, before-save | Unit tests; both forms load with nothing unsupported | **Theirs as is** (0 unsupported calls on both forms). When: **On now** | Runs the form as Adobe would. |
| F13 | Set a value the way a person types it (the form's own scripts react) | Unit tests; the team's fill sample | **Not used** for now (on our data: not measured yet, row h). When: **On after B170h** (validate in the app) | Our forms are filled from case facts by our writer; the checks read that copy. Typing through scripts is how an engine-made copy would be filled, so it waits for that trial. |
| F14 | Press the form's own Validate and report the result | Unit tests; **my run on our copy: same sentence as Adobe, 0.2 s** | **Theirs as is** (same answer as Adobe on our copy, 0.2 s; ours lists 2 of 46 false alarms, H6). When: **On now** (row f) | QA-165's list stops guessing which conditional boxes count; the officer learns before opening Adobe. |
| F15 | Build the form's own barcode texts | Unit tests; my runs: 3 of 5 equal to Adobe, 2 differ by a number format (T1) | **Theirs + fix** (3 of 5 equal to Adobe; row g). When: **On now as "expected"** (row e); **as equal to Adobe after B170g** | Row e compares barcode pieces with the facts on every copy. Calling it Adobe-equal waits for the fix. |
| F16 | List every problem box | Unit tests; my run: 2 boxes, the same two QA-165 lists | **Theirs as is**, with care (2 boxes listed, the same two as ours). When: **On now, with care** (row f) | It over-reports boxes the form marks mandatory but asks for only sometimes (T4). Validate decides; the list explains. |
| F17 | Record the form's messages and where it moves focus | Unit tests | **Theirs as is** (the form's message read on our copy). When: **On now** (row f) | The form's own message is what we show. |
| F18 | Clock, time zone and reader identity passed in, never fixed in code | Unit tests | **Theirs as is** for clock and zone; reader identity **not used** until row h. When: **Clock and zone on now; reader identity on after B170h** | The validated date depends on the zone. Reader identity matters only for an engine-made validated copy (T8). |
| F19 | Save the engine's data into the PDF | Unit tests; the team's Adobe reopen | **Ours wins (a tie keeps ours, H1)**; engine-saved copies not measured yet on our data (rows h, i). When: **On after B170h / B170i** | Same reason as F5 and F13. |
| F20 | Clear-form button report, "may the user do this" checks, record of host requests | Unit tests | **Not used.** When: **Not used** | Only a screen where a person types into the form needs them. On if fill-and-edit in the browser is ever wanted. |
| F21 | Form descriptor: five or six box names per form (Validate button, flag, flag value, first-missing note, barcode group, clear button) | The two descriptors in the tests work on our copies | **Theirs as is** (the 2 descriptors work on our copies). When: **On now, as data on our form record** (row c) | Forms stay data (P-319, P-449). Later replaces the names fixed inside `read_validated.py`. |
| F22 | Made-up data files for both forms and the way to apply them | Tests | **Theirs as is**, in tests. When: **On now, in tests** | CI can prove "a complete form passes" with no client data. |

#### Drawing the form

| # | Feature | Proven by | Verdict | Why · what it moves |
|---|---|---|---|---|
| F23 | Page layout: units, font measures, plain and rich text, boxes, flow, page breaks, lines, images | Unit tests (56 files); page counts match saved forms; **my run on our copy: 5 and 6 pages in 1.5 s** (section 8) | **Theirs as is**, pending two measures (real browser, Acrobat side-by-side: not measured yet, row d); a difference found there makes it theirs + fix. When: **On after B170d** (view) | The team's own side-by-side with Acrobat was pending on 20 Oct, so row d includes one. |
| F24 | Render tree: the pages as checked data a screen can draw | Unit tests | **Theirs as is** (same two measures pending, row d). When: **On after B170d** | The contract between engine and screen. |
| F25 | HTML page writer (one static page per form page, no script) | Used for the renders in the share and mine | **Theirs as is** (same two measures pending, row d). When: **On after B170d** | A helper script, now inside our copy, so no extra OK is needed. |
| F26 | Drawing the barcode picture | **Not in the share** (the team's "Plan B", not started) | **Not used** (nothing to adopt). When: nothing to adopt | Adobe draws barcodes. The view shows placeholders with a caption. |
| F27 | Browser worker: one form per killable background worker, replay, watchdog | Unit tests; a measured kill-and-replay proof | **Not used.** When: **Not used** | We run the engine on the server in a separate process. On if the engine ever runs in the browser. |
| F28 | Viewer screens (open, fill, validate, download in the browser) | **Not in the share**: plans (9 tasks), 19 open questions, 11 mock-up pages | **Not used** (nothing to adopt). When: nothing to adopt; mock-ups kept as reference | Our forms are filled from facts; see section 8 for what the founder's example really needs. |

#### Around the engine

| # | Item | Verdict | Why |
|---|---|---|---|
| F29 | The engine's unit tests (201 files, 3,369 tests) | **Theirs as is** (3,367 of 3,369 in a full run; the 2 others pass alone). When: **On now, in our CI** (row a) | The founder's condition. |
| F30 | The real-form suite (401 tests on IMM 5257 and IMM 1295, some on Adobe-saved copies) | **Theirs as is**; our own run not measured yet (row b). When: **On after B170b** | The two blank forms are **byte-identical to the copies our CI already fetches from canada.ca** (same sha256), so the blank-form part can run in CI. The Adobe-saved copies cannot be fetched and are PDFs, so that part runs on the Mac. |
| F31 | A made-up XFA form built by the tests (`fixtures/synthetic`) | **Theirs as is.** When: **On now** | Lets our adapter tests run with no IRCC file at all. |
| F32 | Sample scripts: write, fill, render, measure layout, measure isolation | **Theirs as is** for render (row d); fill **not used** until row h; the measuring scripts **not used**. When: **Fill and render on after rows h and d; the others not used** | Fill is the pattern for row h, render for row d. |
| F33 | The team's scripts that build one package file for their front end | **Not used.** When: **Not used** | With the source in our repository we build from source. |
| F34 | Specification, plans, owner decisions, open questions | **Not used** as code; reference. When: **Reference** | Their decision "Validate runs again inside Approve & download" points where row h points. |
| F35 | Test forms and Adobe checks (24 PDFs, renders) | **Theirs as is**, on the Mac only. When: **Used on the Mac only; never in git** | Evidence for rows b, g and h. |
| F36 | The rest of the team's repository inside the bundle (their API, worker, contracts) | **Not used** (outside this ask). When: **Outside this ask** | The newest capture under `code/` is the read-only reference for it (AGENTS rule 3). |

---

## 4. The plan

### 4.1 Rows (text for the Lead to add to BACKLOG; Opus builders; each one PR from `origin/main`)

Order and who can run beside whom: **a** first. Then **c** (small) with **d** right behind it in the screens lane (P-466; the lane writes d's concept while c lands), and **b** beside them. After c: **e then f** (one runtime lane, both touch `fill-case.ts`). **g** after b. **h** after e, f and g. **i** and **j** when a lane is free. Letters changed from the earlier versions of this page: the map is in section 9.

**B170a · the engine's source in our repository, its tests green in our CI (no app change).**
* What: copy `packages/xfa-engine/` unchanged from the team's commit `a0119727` to `packages/xfa-engine/` at our repository's root, plus the team's `tsconfig.base.json` at the root (the package's settings point at it). Add `packages/xfa-engine/PROVENANCE.md` (source commit, bundle checksum `897c25bf…`, date, the six MIT libraries, the pdf.js notice, how to take a newer version) and `PATCHES.md` (our changes to the copy: empty). Add an npm lockfile for the package with the exact versions the team pinned. One new CI job: Node 24.21.0, install, build, the unit tests; it runs when `packages/xfa-engine/**` changes and nightly. The technology-gate record (`STANDARDS.md` §1) for the five new libraries and Vitest goes in the PR.
* Done when: a tree comparison of `packages/xfa-engine/` with the bundle's commit shows **0 differences** apart from the listed additions; the CI job is green **three runs in a row** (two limit tests are sensitive to load, 1.1); the studio app is untouched (nothing imports the engine yet, `npm ci` and the existing shards unchanged); the push guard is clean (see the Lead's question L1 on the four made-up test PDFs and the made-up e-mail in the fixtures).
* Review: a provenance check (the comparison above, the lockfile, the CI job), not a line-by-line read of 63,000 lines. The PR breaks the ~800-line habit on purpose; the Lead records the exception (L2). It touches `.github/`, so the Lead reads that diff (P-423).
* Cost: 1 builder session. Notes for the builder: `pnpm` 12 could not lock its store inside the sandbox; `npm install` needed `--legacy-peer-deps` (npm 10.9.2 stops with an internal error without it); build and tests then ran as they are.

**B170b · the real-form tests in CI, and the Mac-only list.** After a.
* What: run the team's real-form suite on the blank IMM 5257 and IMM 1295 that our CI already fetches from canada.ca by address and checksum (the files are byte-identical to the team's: sha256 `0dc03b24…` and `57fc256e…`); install `qpdf` on the runner for it. The tests that need Adobe-saved copies run from a script on the Mac against `code/xfa-share-2026-11-11/…/xfa-acrobat/` and our own validated copy; the result file is committed, the PDFs never are.
* Done when: the CI job reports the suite's count with 0 failures and names the tests that are Mac-only; the Mac script's result is recorded (count, date, who ran it); a changed form edition on canada.ca fails the fetch loudly, never silently.
* Cost: 1 session. Risk: `qpdf` is one more tool on the runner (gate note in the PR).

**B170c · one adapter and the switches (all off).** After a.
* What: `studio/engine/xfa/` with one file our code may import. It runs the engine in a separate process with a time limit and returns a typed answer: `passes` · `stops at` (box, the form's message) · `barcode texts` · `pages` · or `not available` with the engine's reason. Switches in our existing features list, all off: form's own check, barcode check, view form, validate in the app, engine writer. The descriptor's box names become fields of the form record, filled for IMM 5257 and IMM 1295 from the team's two files.
* Done when: on CI, with the made-up form from the engine's fixtures and with the fetched blank IMM 5257, the adapter returns "not complete" with the form's own first missing box and message; a form the engine refuses returns `not available` with the reason and exit 0; no form number or box name appears in the adapter or the engine (checked by the existing guard, extended to `packages/xfa-engine/src`); with every switch off the app behaves exactly as today.
* Cost: 1 session.

**B170d · "View form": the filled form in the app, read-only (the founder's "opens the PDF in the browser").** Right after a and c; screens lane; the founder said yes (P-466), outside the Bake's count. **It counts only after a look in a real browser and a side-by-side with Acrobat.**
* What: one API route that returns the engine's drawing of one page of a form copy (static HTML with its own no-script policy, made on the server through the adapter), and a "View form" action on the copy's row that opens the pages in a framed panel with "page 1 of N" and next/previous. Read-only: no typing, no Validate button, no change to Download. Forms the engine cannot read keep Download only, with the quiet reason line. The barcode page shows grey placeholders with the caption "Adobe draws the barcodes".
* Done when: on the finished story's IMM 5257 the panel shows 5 pages (6 for a validated copy) with the case's values in place (name, date of birth, passport: a Playwright test against the facts); a page opens in under 3 seconds; the frame runs no script (checked); axe passes on the panel; a refused form shows no "View form"; a walk by screens in a real browser before review (P-352) with pictures beside Acrobat's for every page of IMM 5257 and IMM 1295, each difference listed and either accepted by the Lead or fixed as a recorded patch (P-467).
* Moves: one download removed per look at a form, for 2 forms; form pictures for qa and packs without Acrobat. It does **not** remove the download and re-upload around Adobe Validate (that is row h).
* Cost: 1 to 2 sessions. Browser bundle: +0. A page is 0.3 to 1.7 MB of HTML (page 1 carries the form's fonts and images).

**B170e · barcode check (C7.2: the form passes Adobe Validate and its barcodes match the facts).** After c.
* What: (1) on an uploaded validated copy, read the barcode texts **Adobe stored in the file** with **our own reader** (head to head H7: ours wins here; no engine; measured 5 of 5 on our validated IMM 5257), split them into pieces and compare each with the case facts written into the form; fill the contract's `barcodes` block (`checked`, `expected`, `decoded`, `matched`). Where the texts sit is data on the form record, for all four barcode forms; IMM 0008 and IMM 1344 are measured in this row. (2) On a generated copy of a form the engine reads, before download, ask the engine for the form's own barcode texts and compare the same way, labelled "expected". (3) One test compares engine texts with Adobe's on the recorded sample and **expects the known month difference by name** (T1), so it turns red the day row g lands.
* One-time proof first (in the PR, from evidence we already hold): the texts stored in the file equal the texts decoded from the drawn barcodes, using the evidence lane's existing IMM 1295 and IMM 5257 decodes. If they are not equal, stop: part (1) falls back to today's picture decode and only part (2) ships.
* Done when: the barcode-report step of `acceptance/C7.2.test.ts` passes on GitHub's runners (today it fails because the `barcodes` block is absent; the pack stands at 2 of 10). QA-315 (IMM 5257 filed Online on the checkpoint, so the upload step is refused) and the pack's own "never ready" step are separate debts this row does not claim; a wrong fact in one barcode piece makes the copy "not ready" with the piece named; on forms the engine refuses, the line reads "barcode check not available for this form yet: <reason>" and today's behaviour is kept.
* Moves: C7.2's barcode step from "not done" to green in CI; with QA-315 fixed and the Mac's Adobe evidence (already recorded for C10.2's copy) the row can reach Works by qa's verdict; three hand steps on the Mac (capture, decode, compare) removed for IMM 5257 and IMM 1295; about 480 lines of Python barcode tooling become evidence-only.
* Cost: 1 to 2 sessions. Risk: touches `fill-case.ts` (busy file) and the contract: reviewer plus breaker.

**B170f · the form's own check before download (QA-165: empty mandatory boxes).** After e (same lane, same file).
* What: before a Paper copy is offered, run the form's own Validate and show one line on the copy's row: "The form's own check passes" or "The form's own check stops at <our label for the box>: <the form's own message>". Keep today's empty-box list; where the engine is available, the form's script decides which conditional boxes count (the Taiwan and Israel boxes stop being listed when the script does not ask for them), and the hand-kept condition file is used only for forms the engine cannot read.
* Start in shadow for one day: record the engine's answer beside today's answer on the checkpoint data, change nothing on screen; switch on when they agree on every copy or each difference is explained in the PR.
* Done when: on the finished story's IMM 5257 the line reads "passes" and the empty-box list shows 0 of 46 (today 2 of 46); a copy with a missing passport number shows the form's own message for that box; a refused form shows today's list unchanged; the word "validated" is still used only for Adobe's result.
* Cost: 1 to 2 sessions (engine layer, then the screen line).

**B170g · barcode text equal to Adobe's (finding T1; "better base, needs a fix", P-467).** After b.
* What: the smallest change in our copy of the engine that makes a number box with a leading zero come out as Adobe writes it ("3", not "03"), with a unit test on a made-up form; listed in `PATCHES.md` and sent to the team with the evidence.
* Done when: on the Mac, the engine's five barcode texts equal Adobe's on all three validated copies we hold (today 3 of 5 on each); row e's "known difference" test is updated; the engine's own tests stay green.
* Cost: 1 session, if the rule is as simple as the evidence suggests; the builder stops and reports if Adobe's rule turns out wider (decimals, signs).

**B170h · validate in the app, no download and re-upload (trial and decision gate, not a switch-on).** After e, f and g; needs the founder's ruling on Q5.
* What: for a form the engine reads, run the form's own Validate on the server and write the result with the engine's writer; compare that copy with an Adobe-validated copy of the same case: flag, date, every value, and the barcodes Adobe prints from each.
* Done when: a report shows the two copies side by side for IMM 5257 and IMM 1295 with every difference named, and Adobe opens the engine-validated copy as validated. The founder then rules, with counsel and the immigration expert, whether the engine's result may stand for Paper or PDF-upload copies. Until then Adobe stays the proof (P-442); **Unconfirmed: no counsel**.
* Moves, if ruled yes: the download, Adobe, save and re-upload steps go away for those forms. This is the step the founder's example is really about.

**B170i · writer trial: the two numbers the head to head still lacks (decision gate, not a swap).** Needs Q3.
* Already measured (H1): bytes kept, both signatures, read-back, size and time are a tie on IMM 5257.
* Done when: a report adds (1) Adobe Validate on an engine-written copy of our finished-story data, and (2) both writers on every Paper form the app fills, read back equal with signatures intact, plus the app's whole fill step timed on both and the lines and tools a swap would remove. If theirs then wins, the swap is a later row; if it is still a tie, ours stays.

**B170j · which refused forms a fix would open (read-only sizing; "better base, needs a fix", P-467).** Fix rows follow it; who does the large ones is Q4.
* What: for the 18 refused forms, size each reason. First look: the five refused for input patterns (IMM 1294 Study permit, IMM 5710, 5476, 5708, 5709) may be a small addition; repeating sections (IMM 0008 and six more), shared boxes (3) and FormCalc (2) look large.
* Done when: a one-page table: reason, forms, size (small or large), what the team already plans. No engine change in this row.

**Report for the team** (planner, records only, at the end): `design/xfa-reuse-report-<date>.md`: what we switched on and where, what is off and why, numbers before and after, our patches, and the findings in section 5.

### 4.2 Engineering choices

1. **Copied unchanged, changed rarely, every change listed.** `PATCHES.md` names each change we make to the copy, why, and whether the team has it. Taking a newer team version = replace the tree with their commit, re-apply the listed patches, run the tests. A long patch list is the warning that we have started rebuilding.
2. **One adapter, one direction.** Our code imports the adapter; only the adapter imports the engine.
3. **Switches, off first.** "Adopt all" puts all the code in the repository on day one; a feature reaches a person only when its row's "Done when" is green.
4. **Fail closed, say why.** The engine refuses what it cannot read with a named reason; the adapter passes that on as "not available", never as a pass and never as a new block.
5. **Check first, gate later.** The engine starts as a second opinion (shadow, then a visible line). It gates only facts-against-barcode mismatches, which are true whatever the engine's own gaps.
6. **Separate process, time limit.** Same pattern as today's Python call. Measured cost: under 1 second for the checks, about 1.5 seconds to draw a form.
7. **Forms stay data.** Descriptor names live on the form record. No form number, box name or combination key in the adapter or the engine (P-319, P-449); the engine's own rule is the same ("no form name in engine source"). Whether the engine reads a form is found by asking it, and may be stored beside the fill-trial status.

### 4.3 DevOps

* **Layout:** `packages/xfa-engine/` is its own package with its own lockfile and its own CI job; the studio's install and shards do not change until row c adds the adapter.
* **CI cost:** build about 20 seconds, unit tests about 1 to 2 minutes on a runner, only when the package changes and nightly. The real-form suite (row b) adds the same order again.
* **TypeScript and Python:** no new Python. The engine sits on the TypeScript side, where the API already is. Python keeps doing what is proven (writing, reading back) until rows h and i earn a change.
* **Test PDFs:** never in git. Blank forms come from canada.ca by address and checksum, as today. Adobe-saved copies stay on the Mac; their tests run there and only the result is committed.
* **Guards:** the "no form number in engine code" guard and the Bake's "no code change" list should gain `packages/xfa-engine/src` (L3).

### 4.4 Method

* Small PRs after row a, each with one number before and after. Shadow run before a visible change (row f).
* The planner writes briefs and reviews plans read-only; Opus builds and reviews (P-303, P-455 (5)).
* Anything in the engine that looks wrong is written down for the team; a fix here is a listed patch, never a silent edit.

### 4.5 Milestones

* Rows e and f move **C7.2 (Adobe Validate and barcodes) toward Works** and close most of **QA-165 (empty mandatory boxes)** on IMM 5257. They fix existing capabilities, so they fit beside the Bake without adding to its count, and they are **not** on the Bake's exit path (Study permit's IMM 1294 is refused by the engine today; that pathway keeps today's behaviour).
* "Fill trials on every form" (P-460) is the engine's natural home later: each form the engine learns to read gets its checks and its view through the same adapter, with no new code on our side.
* Row h is the one that could change the journey (no Adobe round trip). It belongs in the next milestone plan as a founder decision with counsel.

### 4.6 UI

* "View form" (row d): a read-only panel, not called a viewer or an editor. One line on the copy's row for the form's own check (row f) and the barcode line on the validated copy (row e), with existing components and our own labels for boxes.
* The form's own message is shown word for word, marked as the form's words.
* "Validated" stays Adobe's word. The engine's result is "the form's own check".
* When the engine cannot read a form: one quiet line with the reason, no warning colour.

---

## 5. Worth telling the team (goes into the final report)

With the source in our repository, T1 becomes our small patch (row g) and still goes to the team; the others are theirs to weigh.

| # | Finding | Evidence |
|---|---|---|
| T1 | **Barcode text differs from Adobe's in number boxes with a leading zero.** The engine writes the month as "03"; Adobe writes "3". 2 of 5 barcodes on every validated copy we tried, including their own two. Their plan lists this as a risk "not in the corpus"; it is in the corpus. | `parity.mjs` on `imm5257-adobe-validated.pdf`, `imm1295-adobe-validated.pdf` and our `paper-9c00dbfc-validated.pdf`: 3 of 5 equal; barcode 1 piece 9 and barcode 3 piece 12 differ |
| T2 | The engine reads and validates a copy written by a different writer (ours, Python) and reaches the same result as Adobe. Their reading and run-time parts do not depend on their own writer. | `validate.mjs` on `orig-9c00dbfc.pdf` |
| T3 | Two limit tests are sensitive to machine load: each failed once in a full parallel run (one on Node 24.21.0, the other on 23.11.0) and both pass when run alone. In CI they will fail now and then. | `free-names.test.ts` (hostile syntax tree), `filters.test.ts:112` (trailing junk) |
| T9 | The team's two blank test forms are byte-identical to the editions on canada.ca today (sha256 `0dc03b24…` IMM 5257, `57fc256e…` IMM 1295), so the real-form suite can run in any CI that fetches them. | `shasum` on both copies |
| T4 | The list of problem boxes over-reports boxes the form marks mandatory but its script asks for only sometimes (Taiwan PIN, Israel passport on IMM 5257), while Validate passes. A caller needs to know which answer to trust. | `validate.mjs`: 2 problems listed, Validate complete |
| T5 | Coverage decides the engine's value to us: 2 of our 4 barcode forms today. In our order of need: repeating sections (IMM 0008 and six more), FormCalc (IMM 1344), postal-code and "zero" patterns (IMM 1294, 5710 and three more), shared boxes (3 forms). | `breadth.mjs`, table 1.3 |
| T6 | A supported way to get one HTML page per form page would let others reuse the layout without the viewer. | `scripts/lib/render-html.mjs` is outside the package |
| T8 | For engine-validated copies the team's owner chose to write Adobe's own program identity into the form's reader-information box (their decision O-1, against their planner's advice). If such a copy is ever filed, a file not made by Adobe would say it was. Worth counsel's view before any use. | `plans/xfa-engine-runtime/OVERVIEW.md`, open decisions |
| T7 | Adobe keeps each barcode's text in the saved file as well as drawing it, so a validated copy can be checked without reading pictures. | Their test `restore-calculate.test.ts`; our validated copy |

---

## 6. Questions and challenges

### 6.1 For the founder, through the Lead, one at a time

| # | Question | My recommendation and why |
|---|---|---|
| **Q1** | How may the engine reach our repository and CI? | **Answered by the founder, P-464:** the source, unchanged, as its own package; we are the owner; no approval needed. (I had recommended a built package with no source; his choice is better, section 0.) |
| **Q2** | Show the filled form inside the app, read-only, as a small row now? | **Answered by the founder, P-466: yes, small row now** (B170d), outside the Bake's count; it counts only after a real-browser look and an Acrobat side-by-side; no editing in the browser. |
| **Q3** | "Head to head, our writer and the engine's are a tie on everything measured so far. Keep ours and run one trial (row i) for the two numbers still missing, or leave the question closed?" | **Keep ours (a tie keeps ours) and run the trial when a lane is free.** The missing numbers are Adobe Validate on an engine-written copy of our data, and all our forms. The reason to look at all: ours rests on private library internals and its own note says "demonstration-only". |
| **Q4** | "The engine reads 2 of 21 forms. P-467 says we improve it where it is the better base. Who does the large pieces (repeating sections, shared boxes, FormCalc): we, in our copy, or the team?" | **Small fixes ours, after the sizing in row j; large ones agreed with the team first.** We own the code, so we may; but two teams extending the same engine apart is how a copy becomes a rebuild, and "fixes stay small" is the founder's own line. |
| **Q5** | "May the form's own Validate, run by the engine in our app, stand in for Adobe Validate, so nobody downloads and re-uploads?" | **Not yet: Adobe stays the proof (P-442); Unconfirmed: no counsel. Run the trial (B170h) so the ruling rests on a side-by-side.** Two blockers to settle first: T1 (barcode text) and T8 (the copy would carry Adobe's program identity). |

### 6.2 For the Lead (pipeline, not product): all four accepted by the Lead, 11 Nov

| # | Point | My recommendation |
|---|---|---|
| L1 (accepted: by path and checksum only, after the builder shows the guard's output from a scratch clone) | The copied package holds four made-up test PDFs (not IRCC forms: `fixtures/synthetic/synthetic-form.pdf` and three encryption samples) and a made-up e-mail address in two data files. The push guard refuses PDFs and personal details. | Allow those four files by path and checksum (they are test data the unit tests need), after the builder shows the guard's output from a scratch clone. The alternative, leaving them out, breaks "unchanged" and some tests. |
| L2 (accepted: tree comparison with `a0119727`, 0 differences, plus the reviewer's read of what our CI runs; one-time) | Row a is about 512 files and 63,000 lines. | Record a one-time exception to the ~800-line habit; review it as provenance (tree comparison), not line by line. |
| L3 (accepted: in row a or c) | Guards. | Add `packages/xfa-engine/src` to the "no form number in engine code" guard and to the Bake's "no code change" list once row a lands. |
| L4 (accepted: in the Lead's records PR) | AGENTS rule 1 says `code/` is never committed; P-464 puts a copy of team code at `packages/xfa-engine/`. | One line in AGENTS by the Lead so the next agent does not read the package as a mistake. |

### 6.3 Challenges, and where they stand

1. **To the brief:** "the barcode payload check with the engine closes the C7.2 gap without Adobe." Measured, the engine's barcode text is not yet equal to Adobe's (T1). The plan closes the gap by reading Adobe's own stored text (row e), fixes the difference (row g), and keeps Adobe Validate as the proof (P-442).
2. **From the Lead, on the viewer** (section 8): accepted in part. A read-only view is row d. Fill-and-edit stays out: nothing to adopt, and our forms are filled from facts.
3. **To the founder's "we know that it is tested":** tested, yes, on two forms. Eighteen are refused today. The head to head (section 3) and the "Done when" lines are how his own conditions ("subject to testing and validating", "don't assume anything") are met.
4. **To my own second version:** I had the engine read Adobe's stored barcode text. The head to head shows our reader does that already; using the engine there would have been force-fitting. Corrected in row e.
5. **On our own writer:** its own note says "demonstration-only" and it uses private library internals. That risk is why the writer trial (row i) is worth the founder's look even though nothing is broken.

---

## 7. What was not confirmed

* The team's real-form suite (401 tests) was not re-run by me: `qpdf` is not installed on this Mac. Row b runs it. Install on the Mac, if the Lead wants it sooner: `brew install qpdf` (official formula), used read-only by the engine's test script.
* The team's owner checks in Adobe (round trips, 18 Oct) are taken from their plan files, not repeated.
* That the text stored in the file equals the drawn barcode is the first step of row e, not yet shown.
* The look of the drawn pages in a real browser and beside Acrobat (row d).
* IRCC's acceptance of anything not made by Adobe: **Unconfirmed: no counsel**.

---

## 8. The Lead's challenge on the viewer (11 Nov 12:4x IST): evidence and answer

The founder's example, as the Lead passed it on: "the PDF is there; now in our application you have to download and re-upload. I have given the XFA code, which opens the PDF in the browser itself ... so easy and so fancy and modern." The Lead asked three things, with evidence.

**(1) Does it draw our own filled form? Yes, for IMM 5257.**
* The team's page-dump script on our finished-story copy `9c00dbfc`: **5 pages for the generated copy, 6 for the Adobe-validated one (the sixth is the barcode page), in 1.5 to 1.6 seconds each**, process start included. Page 1 reads like the real form: government header, title, the Validate and Clear Form buttons drawn, and the Sample person's values in their boxes (family name, given names, sex, date of birth, place of birth, citizenship, marital status, ticked boxes).
* The barcode page shows five grey boxes marked "barcode": the engine does not draw barcodes (the team's "Plan B", not started).
* IMM 1295: we have no finished-story copy of it; the team's own Adobe-validated IMM 1295 drew 6 pages in 2.2 seconds.
* How I looked: the sandbox here cannot start a headless browser, and the built-in browser would not open a local file, so I flattened the page's drawing layers to one picture with `rsvg-convert` (system fonts, not the form's own embedded fonts, which a real browser would use). Pictures: shared notes folder, `b170-render/pictures/`; the HTML pages beside them. **Not confirmed:** the look in a real browser, and a side-by-side with Acrobat (the team's own was pending on 20 Oct). Both are in B170d's "Done when".

**(2) Cost: read-only view against editing in the browser.**

| | Read-only view (row d) | Fill and edit in the browser |
|---|---|---|
| What exists on the team's side | Layout in the package; a 304-line page writer as a helper script (inside the copied source) | Layout and a worker protocol; **no screens** (9 planned tasks, 19 open questions, mock-ups) |
| Where the engine runs | On our server, in the adapter's separate process | In the browser, in a background worker with a watchdog |
| Added to the browser | Nothing: static HTML pages with no script, in a frame | About 1.1 MB of engine code (0.3 MB compressed) + 0.5 MB sandbox (WebAssembly) + 0.5 MB of libraries, plus worker and WebAssembly set-up in the build |
| Our new code | One route, one framed panel, tests | Field widgets, message boxes, focus, save and replay, limits, accessibility: weeks, and it would be us building what the team planned |
| Sessions | 1 to 2 | Not estimated; not reuse |

**(3) Does it remove download and re-upload? Not by itself.**
* The read-only view removes the download an officer makes only to look at the form. That is real but small.
* The download and re-upload the founder means is the round trip through Adobe: download the copy, press Validate in Adobe, save, upload the validated copy. That step exists because Adobe Validate is our proof (P-442), not because the form cannot be shown. Showing the form does not remove it.
* What would remove it is the engine pressing the form's own Validate on the server and writing the validated copy (features F13, F14, F19). **No editing viewer is needed for that**, because our forms are filled from case facts. Measured today it already works technically on our own copy (Validate in 0.2 s, 5 barcode texts). It is blocked by three things that are not engineering on our side: the barcode text is not yet equal to Adobe's (T1); the reader-identity choice (T8); and whether IRCC accepts it (**Unconfirmed: no counsel**). The team's own decisions of 20 Oct point the same way ("Validate runs again inside Approve & download"). Row B170h turns this into a side-by-side the founder can rule on.

**Answer.** The read-only view is a row (B170d) and "no fill-and-edit screens" stays. Since P-464 the page writer comes with the copied source, so row d needs nobody's OK. Order: a (source and tests) → b and c → d (view) beside e and f (checks) → g → h (trial for validate in the app) → the founder's ruling on Q5.

---

## 9. How this page changed (so no verdict moves silently)

| Version | When | What changed |
|---|---|---|
| 1 | 11 Nov, first push (`07a40a279`) | "Reuse where it makes sense": the form-script part behind an adapter, as one built package with no source; view and viewer "not now". |
| 2 | 11 Nov (`313a6cff3`) | After the Lead's challenge and a run on our own copy: read-only view became a row; a validate-in-the-app trial was added. |
| 3 | 11 Nov (`de6baeef4`) | After the founder's ruling P-464: adopt the whole source as `packages/xfa-engine/`, tests in our CI, switch features on where tests prove them. Every feature now has a verdict (section 3). The two "failing" tests were re-run alone and pass (load, not Node version). The team's two blank test forms were found byte-identical to ours. New rows for the source copy, real-form tests, the barcode-text fix and form-coverage sizing. |

| 4 | 11 Nov, this version | After P-465 to P-467: a measured head to head, ours against theirs (new section 3: writer, reader, validated flag, mandatory boxes, barcodes), four verdicts, Q2 answered. The writer was measured both ways on the same form and data: a tie, so ours stays. Row e now reads Adobe's stored barcode text with our own reader. |

Row letters, old to new: package row (old a) → **a** source copy and **c** adapter; barcode check (old b) → **e**; form's own check (old c) → **f**; view (old d) → **d**; writer trial (old e) → **i**; validate-in-the-app trial (old f) → **h**; new: **b** real-form tests, **g** barcode text equal to Adobe, **j** coverage sizing.

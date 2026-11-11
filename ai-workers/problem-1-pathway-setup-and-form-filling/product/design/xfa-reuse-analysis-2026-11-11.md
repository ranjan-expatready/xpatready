# Reusing the team's XFA engine: analysis and plan (row B170, founder ask A16)

Written 11 Nov 2026, 12:3x IST, by the Fable planner for B170 (read-only: no product code changed). Brief: `xfa-engine-reuse-brief-2026-11-11.md`. Records only.

**In one paragraph.** The team's engine is real, well tested and safe to run, but narrower than its plans read: its form-script part works today on **2 IRCC forms (IMM 5257 and IMM 1295)** and refuses 18 of the other 19 blank forms in the share with a clear reason. On those two forms it does the one thing we could not do without Adobe: it runs the form's own Validate and builds the form's own barcode texts in under a second, on a server, with no screen. On our own finished-story copy of IMM 5257 it gave the same answer Adobe gave. So the plan is small and exact: **reuse the engine's form-script part as it is, behind one thin adapter, as a check**; keep our proven writer; do not build the browser viewer now (the team has not built its screens either); and send the team a measured list of what we found.

Words used here: **engine** = the team's TypeScript package `xfa-engine`. **Form's own check** = the Validate button's script that IRCC ships inside the PDF. **Barcode text** = the characters a barcode holds (the form builds them; Adobe then draws them as a picture). **Adapter** = a small file on our side that calls the engine and turns its answer into our words; no engine code is changed.

---

## 1. What arrived, and what is proven versus planned

Source: `ERv2-xfa-full.bundle` (sha256 `897c25bf7641aa31…`), branches `feat/xfa-engine` (head `db9b47ae`) and `feat/xfa-viewer` (head `a0119727`, 20 Oct 2026, the newer one; it contains the first). The engine is `packages/xfa-engine/`: about 24,500 lines of source and about 200 test files, written 18 to 20 Oct in 56 commits. Looked at in a scratch clone outside the repository; nothing from it is committed here.

### 1.1 What I ran (11 Nov, scratch copy, our own Node 24.21.0)

| Check | Result |
|---|---|
| Build (`tsc`) | exit 0 |
| The engine's own unit tests (201 files, 3,369 tests) | **3,367 pass, 1 fails, 1 skipped** on Node 24.21.0 (the failing one is a "hostile script too large" limit test); on Node 23.11.0 also 3,367 pass with a different single failure (a compressed-stream junk test). The team reports all green on its Node 24.15.0. Both failures are tests of safety limits that depend on the Node version, not of form behaviour. |
| The team's real-form suite ("corpus", 401 tests) | **Not run here**: it needs the tool `qpdf`, which is not installed on this Mac. The team reports 401 passed, 1 skipped. Not re-confirmed. |
| Open every IRCC form in the share (24 files: 21 blank forms, 3 Adobe-saved) and read its inside parts | **24 of 24 open** (all are encrypted; the engine decrypts them) |
| Load the form through the form-script part | **2 of 21 blank forms fully supported: IMM 1295, IMM 5257.** A third (IMM 5645) loads but is a static form (1 page; not checked further). The other 18 are refused at once with a named reason (table in 1.3). |
| Our own copy: the finished story's Paper IMM 5257 (copy `9c00dbfc`, written by our Python writer, **before** Adobe) → engine runs the form's own Validate | **"Validation completed successfully"**, flag Yes, 5 barcode texts built. Load 0.7 s, Validate 0.2 s. Adobe gave the same sentence on the same copy on 10 Nov (C10.2's record). |
| Same copy: the engine's list of problem boxes | **Exactly 2: Taiwan PIN and Israel passport**, the same two boxes QA-165's list names today (they are marked mandatory in the form but the form's own script asks for them only for two issuing countries, so Validate still passes). |
| Adobe-validated copies (the team's IMM 5257 and IMM 1295, and **our** `paper-9c00dbfc-validated.pdf`): the engine rebuilds the 5 barcode texts and I compare them with the texts Adobe itself stored in the file | **3 of 5 identical on every file. The other 2 differ in one piece each: a month written "03" by the engine and "3" by Adobe** (on ours also "07" against "7"). Everything else in those two barcodes is identical (they have 63 and 39 pieces; one piece differs in each). This is a real difference from Adobe; see 5 (finding T1). |

Probe scripts are in the planner's scratchpad (`probe/breadth.mjs`, `parity.mjs`, `validate.mjs`); a builder re-creates them as real tests in row B170b.

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
* It depends on six libraries, **all MIT**: `quickjs-emscripten-core` and `@jitl/quickjs-wasmfile-release-sync` 0.32.0 (the script sandbox), `@noble/hashes` 2.2.0, `@xmldom/xmldom` 0.9.12, `acorn` 8.17.0, `zod` 4.4.3. Our app already uses the same `zod` and TypeScript versions; **five libraries are new to us** and go through the technology gate (`STANDARDS.md` §1) in row B170a.
* A few layout defaults follow Mozilla's pdf.js (Apache-2.0); the team's build adds the notice and licence text to the built package. Nothing copyleft.
* **One real restriction:** the share's README says its branches must not be pushed without the team lead's OK, and our own rule 1 never commits `code/`. So the engine cannot reach GitHub, and therefore CI, until that OK is given. This is question Q1.
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

## 3. Verdicts: one per part

| # | Part | Verdict | Why (cost · risk · the number it moves) |
|---|---|---|---|
| V1 | Form-script run-time (with the reading, model and sandbox parts it stands on): Validate, barcode texts, problem list | **Reuse with a thin adapter** | Cost: 3 small PRs (B170a to c). Risk: low while it is a check and never a gate on forms it cannot read. Moves: C7.2's barcode step from "by hand on the Mac" to "every copy, in CI" for 2 of our 4 barcode forms; the screenshot, picture-decode and compare steps go away for those forms; QA-165's hand-kept condition file is no longer needed for them. |
| V2 | The team's form descriptors (five box names per form: Validate button, flag, flag value, first-missing note, barcode group) | **Reuse as is, as data** | They are data, not code, which is our rule too (P-319, P-449). They become fields of our form record. Later they replace the names fixed inside `read_validated.py`. |
| V3 | PDF reading | **Reuse as is, inside V1 only** | It is the engine's front door. We do **not** move our own form reading and field lists to it: ours feed 18 saved field maps and work. No number would move. |
| V4 | PDF writing | **Not now. One trial row later (B170e)** | Ours is proven by Adobe and by signature checks on the forms that count; swapping it risks two Works rows (C7.1, C10.2) for no new capability. But ours leans on private library internals and needs Python, `openssl` and a hand-made environment. A side-by-side trial can earn the swap: same values through both writers, same data read back, signatures intact, one Adobe Validate. Only then decide. If it wins: about 680 Python lines and the Python step leave the fill path. |
| V5 | Barcode texts as **proof equal to Adobe's** | **Not now** | Measured: 2 of 5 texts differ from Adobe's by a number format (T1). Until the team fixes it, the engine's text is an early warning, and Adobe's stored text stays the truth. |
| V6 | Engine-made "validated" Paper copies with no Adobe step | **Not now** | Whether IRCC accepts barcodes made outside Adobe is **Unconfirmed: no counsel**. Adobe Validate stays the proof for Paper copies (P-442). The engine's result is never called "validated" in our app. |
| V7 | Page layout and HTML page dump (a read-only picture of the filled form) | **Not now; first candidate after the Bake** | Real and tested for 2 forms, but the team's own Acrobat side-by-side was pending, barcodes are placeholders, and the dump is a helper script, not a supported part. Possible later use: a read-only preview and qa pictures without Acrobat. Ask the team to make the dump a supported part first. |
| V8 | Browser worker | **Not now** | Only a browser viewer needs it. On the server we isolate with a separate process, as we do for Python today. |
| V9 | Viewer screens (fill in the browser) | **Not now: there is nothing to reuse yet** | The team has plans and mock-ups, no screens. Building them here would be building, not reusing, and the team's own first open question is whether the viewer or the answer sheet is the product. Their mock-ups are a good reference when we get there. |
| V10 | The team's build-and-verify scripts for the package | **Reuse as is** (on the Mac, in the scratch clone) | They make the single package file we pin in B170a, with the notice files. |
| V11 | The team's test data (made-up people for both forms) and attack tests | **Reuse as is, where they run** | The made-up data lets our CI prove "a complete form passes" with no client data. Their unit tests stay in their repository. |
| V12 | Extending the engine to the 18 refused forms | **Not ours** | That is the team's coverage plan. Doing it here would fork their code, the opposite of reuse. We send the measured list (5). |

---

## 4. The plan

### 4.1 Adoption rows (text for the Lead to add to BACKLOG; Opus builders; one small PR each from `origin/main`)

**B170a · the engine arrives as one pinned package (no behaviour change).** Blocked on Q1.
* What: build the package file from commit `a0119727` with the team's own script; add it under `studio/vendor/` with its sha256, source commit and notice files recorded; add it and nothing else to `package.json`; write the technology-gate record (`STANDARDS.md` §1: problem, options, upkeep, licence, when to reconsider) in the PR; one adapter file `studio/engine/xfa/form-check.ts` with a typed result (`passes`, `stops at`, `the form's message`, `barcode texts`, or `not available: <the engine's reason>`); run it in its own process with a time limit.
* Done when: on CI, a test opens the blank IMM 5257 fetched from canada.ca, loads it, and gets "not complete" with the form's own first missing box and message; a form the engine refuses returns `not available` with the reason and exit 0; no form number or box name appears in the adapter (the descriptor comes from data); `npm ci` on a clean clone works; app behaviour unchanged (no screen, no route).
* Cost: 1 builder session. Risk: the push guard or lockfile may need a line for the package file; if the guard refuses it, stop and ask, do not widen it.

**B170b · barcode check with the engine (C7.2: barcodes match the facts).** After B170a.
* What: (1) on an uploaded validated copy, read the barcode texts **Adobe stored in the file**, split them into their pieces and compare each with the case facts written into the form; fill the contract's `barcodes` block (`checked`, `expected`, `decoded`, `matched`). (2) On a generated copy, before download, ask the engine for the form's own barcode texts and compare the same way, labelled "expected". (3) Descriptor fields added to the form record as data for IMM 5257 and IMM 1295 (V2). (4) One test that compares engine texts with Adobe's on the recorded sample and **expects the known month difference by name** (T1), so it turns red the day the team fixes it and we update.
* One-time proof first (in the PR, from evidence we already hold): the texts stored in the file equal the texts decoded from the drawn barcodes, using the evidence lane's existing IMM 1295 and IMM 5257 decodes. If they are not equal, stop: part (1) falls back to today's picture decode and only part (2) ships.
* Done when: the barcode-report step of `acceptance/C7.2.test.ts` passes on GitHub's runners (today it fails because the `barcodes` block is absent; the pack stands at 2 of 10). QA-315 (IMM 5257 filed Online on the checkpoint, so the upload step is refused) and the pack's own "never ready" step are separate debts this row does not claim; a wrong fact in one barcode piece makes the copy "not ready" with the piece named; on forms the engine refuses, the line reads "barcode check not available for this form yet: <reason>" and today's behaviour is kept; nothing is gated on engine-equals-Adobe.
* Moves: C7.2's barcode step from "not done" to green in CI; with QA-315 fixed and the Mac's Adobe evidence (already recorded for C10.2's copy) the row can reach Works by qa's verdict; three hand steps on the Mac (capture, decode, compare) removed for IMM 5257 and IMM 1295; about 480 lines of Python barcode tooling become evidence-only.
* Cost: 1 to 2 builder sessions. Risk: touches `fill-case.ts` (busy file) and the contract: reviewer plus breaker.

**B170c · the form's own check before download (QA-165).** After B170a; can run beside B170b in another lane if files do not overlap.
* What: before a Paper copy is offered, run the form's own Validate in the engine and show one line on the copy's row: "The form's own check passes" or "The form's own check stops at <our label for the box>: <the form's own message>". Keep today's empty-box list; where the engine is available, the form's script decides which conditional boxes count (the two Taiwan and Israel boxes stop being listed when the script does not ask for them), and the hand-kept condition file is used only for forms the engine cannot read.
* Start in shadow for one day: record the engine's answer beside today's answer on the checkpoint data, change nothing on screen; switch on when they agree on every copy or each difference is explained in the PR.
* Done when: on the finished story's IMM 5257 the line reads "passes" and the empty-box list shows 0 of 46 (today 2 of 46); a copy with a missing passport number shows the form's own message for that box; a refused form shows today's list unchanged; the word "validated" is still used only for Adobe's result.
* Moves: QA-165's list from 2 false alarms to 0 on IMM 5257; fewer failed Adobe sessions (the officer learns before opening Adobe).
* Cost: 1 to 2 builder sessions (engine layer, then the screen line). UI: one line on an existing row, existing component, no new screen.

**B170d · report for the team** (planner, records only): `design/xfa-reuse-report-<date>.md` after a to c merge, with before and after numbers and the findings in 5.

**B170e · writer trial (decision gate, not a swap).** Only after a to c, and only if the founder wants it (Q3).
* Done when: a report shows, for IMM 5257 and IMM 1295 on the same values, both writers' outputs read back equal, signatures intact on both, Adobe Validate passed once on the engine-written copy, and the lines and tools a swap would remove. The swap itself would be a later row.

**Not rows now:** the read-only page preview (V7) and the browser viewer (V9): revisit at the next milestone plan, when the team has shipped screens or a supported page dump.

### 4.2 Engineering choices

1. **Use it as a package, never as pasted source.** One built file, pinned by checksum and source commit. No local patches: a patch is a fork, and a fork is a rebuild. Bugs go to the team (5); we take their next package.
2. **One adapter, one direction.** Our code calls `form-check.ts`; nothing else imports the engine. If the engine changes shape, one file changes.
3. **Fail closed, say why.** The engine already refuses what it cannot read with a named reason. The adapter passes that on as "not available", never as a pass and never as a new block.
4. **Check first, gate later.** The engine starts as a second opinion (shadow, then a visible line). It becomes a gate only for facts-versus-barcode mismatches, which are true whatever the engine's own gaps.
5. **Separate process, time limit.** Same pattern as today's Python call: a crash or a slow script cannot hurt the API. Measured cost is under 1 second per form.
6. **Forms stay data.** The five descriptor names live in the form record. No form number, box name or combination key in the adapter or the engine (P-319, P-449). "Does the engine support this form" is found by asking it, and may be stored beside the fill-trial status.

### 4.3 DevOps

* **CI:** the new tests run inside the existing shards on Node 24; no Adobe, no Python, no new service. Forms come from canada.ca as today. The engine's own 3,369 unit tests stay in the team's repository; we run only our adapter tests. Budget: seconds.
* **TypeScript and Python:** no new Python. The engine sits on the TypeScript side, where the API already is. Python keeps doing what is proven (writing, reading back). The boundary moves only if B170e earns it.
* **Packaging and upgrades:** `studio/vendor/` holds the package file plus a short note (commit, checksum, date, who built it). An upgrade is one PR that replaces the file and re-runs the adapter tests and the T1 test.
* **Node version:** two of the engine's limit tests are sensitive to the Node version (1.1). We pin 24.21.0; the team builds on 24.15.0. Told to the team (T3).

### 4.4 Method

* Small PRs, each with one number before and after, as now. Shadow run before a visible change (B170c).
* The planner writes briefs and reviews plans read-only; Opus builds and reviews (P-303, P-455 (5)).
* Anything in the engine that looks wrong is written down for the team, never patched here.

### 4.5 Milestones

* B170a to c move **C7.2 (Adobe Validate and barcodes) toward Works** and close most of **QA-165 (empty mandatory boxes)** on IMM 5257. They are fixes to existing capabilities, not new ones, so they fit beside the Bake without adding to its count, and they are **not** on the Bake's exit path (Study permit's IMM 1294 is refused by the engine; that pathway keeps today's behaviour).
* "Fill trials on every form" (P-460) is the natural home for the engine later: when the team's coverage grows, each newly supported form gets its own check for free through the same adapter.
* The viewer belongs in the plan of the milestone after the Bake, if at all (Q2).

### 4.6 UI

* No new screen. One line on the form copy's row (B170c) and the barcode line on the validated copy (B170b), using existing components and our own labels for boxes.
* The form's own message is shown word for word, marked as the form's words.
* "Validated" stays Adobe's word. The engine's result is "the form's own check".
* When the engine cannot read a form: one quiet line with the reason, no warning colour.

---

## 5. Worth telling the team (goes into the final report)

| # | Finding | Evidence |
|---|---|---|
| T1 | **Barcode text differs from Adobe's in number boxes with a leading zero.** The engine writes the month as "03"; Adobe writes "3". 2 of 5 barcodes on every validated copy we tried, including their own two. Their plan lists this as a risk "not in the corpus"; it is in the corpus. | `parity.mjs` on `imm5257-adobe-validated.pdf`, `imm1295-adobe-validated.pdf` and our `paper-9c00dbfc-validated.pdf`: 3 of 5 equal; barcode 1 piece 9 and barcode 3 piece 12 differ |
| T2 | The engine reads and validates a copy written by a different writer (ours, Python) and reaches the same result as Adobe. Their reading and run-time parts do not depend on their own writer. | `validate.mjs` on `orig-9c00dbfc.pdf` |
| T3 | Two limit tests depend on the Node version: one fails on 24.21.0, a different one on 23.11.0. | `free-names.test.ts` (hostile syntax tree), `filters.test.ts:112` (trailing junk) |
| T4 | The list of problem boxes over-reports boxes the form marks mandatory but its script asks for only sometimes (Taiwan PIN, Israel passport on IMM 5257), while Validate passes. A caller needs to know which answer to trust. | `validate.mjs`: 2 problems listed, Validate complete |
| T5 | Coverage decides the engine's value to us: 2 of our 4 barcode forms today. In our order of need: repeating sections (IMM 0008 and six more), FormCalc (IMM 1344), postal-code and "zero" patterns (IMM 1294, 5710 and three more), shared boxes (3 forms). | `breadth.mjs`, table 1.3 |
| T6 | A supported way to get one HTML page per form page would let others reuse the layout without the viewer. | `scripts/lib/render-html.mjs` is outside the package |
| T7 | Adobe keeps each barcode's text in the saved file as well as drawing it, so a validated copy can be checked without reading pictures. | Their test `restore-calculate.test.ts`; our validated copy |

---

## 6. Questions and challenges (each also sent to the Lead, one at a time)

| # | Question | My recommendation and why |
|---|---|---|
| **Q1** (blocks B170a) | How may the engine reach our GitHub repository and CI? The share says its branches are not to be pushed without the team lead's OK; our rule 1 never commits `code/`. | **Ask the team lead (through the founder) to OK one built package file, with no source, in our private repository.** Without it the engine works only on the Mac and the main gain (every copy, in CI) is lost. Alternative: Mac-only until the team publishes the package itself. |
| **Q2** | Browser viewer now, or after the Bake? | **After, and a read-only preview first.** The team has no screens to reuse; the engine reads only 2 forms; the Bake is running. |
| **Q3** | Should the engine's writer replace our Python writer, or sit beside it? | **Beside it. A trial row (B170e) after a to c, swap only on evidence.** Ours is proven where it counts; theirs is cleaner but proven on fewer copies. |
| **Q4** | Who extends the engine to the other forms? | **The team.** We send the measured list (T5) in priority order. We do not fork. |
| **Q5** | May an engine-validated copy stand in for Adobe Validate on Paper copies? | **No change: Adobe stays the proof (P-442). Unconfirmed: no counsel.** Revisit with counsel and the immigration expert. |

**Challenges to the brief (for the Lead to answer or accept):**
1. The brief's first row was "barcode payload check with the engine closes the C7.2 gap without Adobe". Measured, the engine's barcode text is not yet equal to Adobe's (T1), so it cannot close the gap alone. The plan closes it by reading Adobe's own stored text and using the engine as the early check. C7.2 still needs the Mac's Adobe Validate evidence (P-442).
2. The brief lists "the viewer if the founder agrees" as a likely row. There is no viewer to reuse; I recommend it is not a row at all for now.
3. The brief says "maybe nothing" for the writer. I agree for now, but our writer's own note says "demonstration-only" and it depends on private library internals; that is a risk worth one trial row, which the founder should see.

---

## 7. What was not confirmed

* The team's real-form suite (401 tests) was not re-run: `qpdf` is not installed. Install proposal if the Lead wants it re-run: `qpdf` 12.x from Homebrew (`brew install qpdf`), official formula, used read-only by the engine's test script.
* The team's owner checks in Adobe (round trips, 18 Oct) are taken from their plan files, not repeated.
* That the text stored in the file equals the drawn barcode is the first step of B170b, not yet shown.
* IRCC's acceptance of anything not made by Adobe: **Unconfirmed: no counsel**.

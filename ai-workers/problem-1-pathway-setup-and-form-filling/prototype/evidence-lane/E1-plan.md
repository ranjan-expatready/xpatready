# E1 plan — every form passes Adobe, and a free AI scoring set

23 Oct 2026 · evidence lane (builder) · stage DESIGN · decisions P-46, P-64, P-60. No app code, no paid AI. All facts are **Sample** (made up); immigration points are for the immigration expert to confirm. Legal: Unconfirmed: no counsel.

## In plain words
* We fill a copy of each official form with the writer already proven in P1 (`p5/fill.py`), open it in Adobe on this Mac, press the form's own **Validate**, save, and compare the barcodes Adobe makes with the facts we wrote, slot by slot. One form at a time; each pass is saved as evidence.
* **Only four of the nine forms make barcodes** (scan of the official files today, table below). The other five get the same fill-open-save-read-back check; "barcode compare" does not apply to them.
* Every AI result we already paid for is kept. We score them again, offline, against an answer key, at US$0. Each form that passes Adobe gives us a proven answer key for that form.

## 1. Forms in order (lane order) and what each needs
Scan of `official-sources/ircc/forms/` (all dynamic XFA, usage-rights signed, read-only): "required" = the form's own mandatory flags.

| # | Form (edition) | Barcodes | Validate button | Required | Group | Prior evidence |
|---|---|---|---|---|---|---|
| 1 | IMM 5257 visitor visa (09-2023) | 5 | yes | 46 | A | studio slice-1 field map (AI) only |
| 2 | IMM 1344 sponsorship (09-2024) | 5 | yes (+ validated flag) | 41 | A | 6 live AI field maps, none checked in Adobe |
| 3 | IMM 0008 generic application (05-2026) | 10 | yes | 94 | A | none |
| 4 | IMM 5669 Schedule A (05-2021) | 0 | none found | 0 | C | none |
| 5 | IMM 5532 relationship (02-2021) | 0 | none found | 0 | C | none |
| 6 | IMM 5406 additional family (05-2026) | 0 | yes | 0 | B | none |
| 7 | IMM 5476 representative (11-2025) | 0 | none found | 0 | C | P1 write/read-back only |
| 8 | IMM 1295 work permit (09-2023) | 5 | yes | 43 | A | **passed in Adobe 19 Oct** (P1 §4) — rerun as regression |
| 9 | IMM 5707 family (01-2023) | 0 | yes | 0 | B | shown in Adobe 19 Oct (family copy) — rerun |

**Order question for the Lead:** P-46 and `LEAD.md` say "IMM 0008, 1344, 5669 first"; the lane file starts with IMM 5257. This plan keeps the lane order. Since 5669 has no barcodes, I recommend 1344 → 0008 → 5257 for the first slice (demo 3's barcode forms first).

Group A = Validate + barcodes (full method). B = Validate, no barcodes. C = no Validate, no barcodes ("none found" is confirmed by eye in Adobe).

## 2. Sample facts (all Sample, synthetic, never submitted)
* **One made-up household**, given names that name the role (as in P1) so a wrong-person write shows at a glance: the Sponsor (Canadian citizen, Toronto ON); Client A, the principal applicant (sponsor's spouse, citizen of India, New Delhi); their child aged 9; Client A's mother and father; a paid representative (Sample licence number).
* Forms 2–7 use the spouse-sponsorship case (demo 3); form 1 uses Client A's mother as visitor (combination 2, `expected/combination-2.json`); forms 8–9 reuse the existing combination-1 sets (`p1/adobe-complete-1295-values.json`, `p1/e5-family-values.json`).
* Who fills which form (e.g. IMM 5406 and 5669 per adult family member) is taken from each form's own title and instructions and marked **Sample — immigration expert to confirm**.
* Two value sets per form: **complete** (every mandatory field, repeating rows two deep) and **edge** (maximum lengths, accents, apostrophes, hyphens, stray spaces — negative tests P1 left untested).
* Codes come only from the form's own option lists (inventory), including dependent lists (province → city code, as found in P1).

## 3. Method per form
1. **Inventory** the edition (fields, codes, rows, barcode manifests) with `p1/xfa_inventory.py`'s functions, written to `evidence-lane/E1/<form>/` (the P1 script writes to `p1/`, so a thin wrapper here imports it; `p1/` is not touched). Existing inventories: 1295, 1344, 5257, 5476, 5707; new: 0008, 5669, 5532, 5406.
2. **Values file** `values.<set>.json`: data path → value, each tagged with fact, person and "Sample".
3. **Fill a copy** with `p5/fill.py` unchanged; keep its report (read-back, signatures, poppler, original bytes).
4. **Adobe** (Acrobat DC on this Mac, free Reader mode): open the copy → screenshot banner and pages → Validate → record the message → fix the *values* (never the form) and refill until it passes; log every iteration and the form rule it taught us.
5. **Save in Adobe**, then read the saved copy back: official bytes still a prefix, both signatures verify, validated flag, values kept or cleared by a named form rule.
6. **Barcodes (group A)**: capture the barcode page (Adobe print-to-PDF then 300 dpi render; fall back to zoomed screenshots), decode with `p1/decode_barcodes.py` (zxing-cpp), compare slot by slot with a per-form copy of `p1/barcode_positions.py` logic (it is hard-wired to IMM 1295 v6), exit 1 on any unexplained slot.
7. **Result** `E1/<form>/result.json` + one evidence line in `E1/RESULTS.md`.

## 4. Pass criteria (per form, complete set; every line must hold)
| Check | Pass |
|---|---|
| Writer report | all written values read back equal; nothing else changed; original bytes kept; UR3 (+ DocMDP) verify; poppler 0 errors |
| Adobe opens | IRCC certification banner, no "changed" warning; every person-identifying value and every repeating row in the right field; conditional sections shown as the facts require |
| Validate (A, B) | "Validation completed successfully" (A); no error message (B). C: recorded as not applicable |
| Barcodes (A) | all generated and decoded; **0 unexplained slots**; every non-exact slot classed: calculated, cleared by form rule, format (e.g. month without zero), not encoded |
| After Adobe save | prefix kept; signatures verify; validated flag Yes where the form has one |
Edge set: writer, Adobe-opens and barcode checks must hold; Validate messages are findings, not failures. Every finding (rule, code, format) goes to the forms lane as a proposal via the Lead.

## 5. What needs the founder
* **Adobe on this Mac**: Acrobat DC is installed (26.002, free Reader mode, used in P1). Choose one: allow me to drive Adobe by computer use (open, Validate, save, screenshot), or click Validate and Save yourself (~2 minutes per form, I prepare each copy and say exactly what to click). No Adobe account, sign-in or trial; updates left as they are and the version recorded.
* **Not testable here** (decide if needed): Windows; Reader 11.0.10 (IRCC's Mac advice); IRCC portal upload.
* Immigration expert: who fills each form, and whether the Sample household is plausible.

## 6. Free AI scoring set (US$0, no network)
* **Runs**: the 35 live runs in `p2/runs/` (plus 10 reconverted copies): combination 1 field maps for 6 forms (IMM 1295 and 5707 five trials each; 5257 Schedule 1, 5409, 5475, 5476 two each), checks, requirements ×2, sections, three probes; Studio field maps IMM 1344 ×6 and IMM 5257 ×4 (two of them ~4 KB, kept as failure cases). Stub runs are harness controls only.
* **Answer key**: `expected/slice-1-field-map.v2.json` (91 entries), `combination-1.v2.json`, `combination-2.json`, `fact-aliases-c1.json`, `tests/p2-acceptance.v2.json`, referenced by hash, never copied or edited. Each form that passes E1 adds a **proven key** (fact → field → exact value) built only from the official form and the Adobe evidence, never from an AI run (independence rules of `expected/README.md`); kept in `evidence-lane/scoring-set/keys/` and proposed to the Lead for `expected/`.
* **Scorer**: reuse `tests/score_p2.ts` and `tests/rescore_p2.ts` (same `drafting-run/v0` contract, Studio runs included); a manifest lists every run file with its SHA-256. Guard: the runner clears any API key from its environment and fails on any network attempt.
* **Self-check first**: reproduce `p2/scores/v2/rescore-summary.json` (layers A–D) exactly before scoring anything new.
* **Measures per run**: right fact, right person, exact transform, wrong person, invented, unresolved, contract valid; per form across trials: how often the answers agree.
* **Use**: any later prompt or model change is scored on this set first at US$0; a paid run only when the set cannot answer.

## 7. Build order (next stage, BUILD)
E1a scoring set + self-check (needs no Adobe, can start at once) · E1b forms 1–3 (all three barcode forms) · E1c forms 4–7 · E1d regression of 8–9. One commit per slice; nothing in `p1/`, `p5/`, `expected/` or the app is changed.

## Risks
The writer uses pypdf private internals (demonstration-only); the forms lane may change the filler, then E1 reruns. Barcode capture by screen depends on zoom; print-to-PDF tried first. IMM 0008 (10 barcodes, 94 required) will need the most iterations.

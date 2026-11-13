# Writer trial: our writer against the team's engine, on every Paper form (B170i)

**Row:** B170i (P-469, P-464, P-465, P-467, P-470, P-474, P-506 (D6)); spec word for word in `design/xfa-reuse-analysis-2026-11-11.md`, "B170i · writer trial". A decision gate, not a swap: nothing in the app's fill step (`prototype/studio/api/src/fill.ts`) or the engine (`packages/xfa-engine/`) changed. **Run:** 13 Nov 2026, ~11:56 IST (06:26 UTC), forms lane, cloud. **Status of the numbers:** measured, except Adobe Validate on the engine copy (section 6), which only the Mac can make.

## 1. In one paragraph

On all **18 Paper form editions** the released pathways fill on the configured checkpoint (the six fill-trial forms and twelve more), both writers wrote the **same data: 0 differences** over 2,693 written values (145 Sample facts on 22 form-and-person pairs, the finished story's 75 values on IMM 5257, and 2,473 made-up values in every box), compared leaf by leaf with **both** readers (ours and the engine's). **Both signatures stay intact on every copy** (25 of 25 on each side), the original bytes are kept and nothing else changes on both. Theirs is faster (the app's fill step: ours 204 to 380 ms, theirs 9 to 128 ms; neither is felt by a person) and writes the same file every run (ours does not). On IMM 5257 the form's own Validate passes on both copies and its five barcode texts are identical. **One real difference: on the 5 static forms (IMM 5409, 5476, 5604, 5645, IRM 0002) the engine sets no page fields, so its copy shows no values outside Adobe (0 of 249 against ours 226 of 249, every box).** Verdicts: **theirs equal or better on the 13 dynamic forms; ours better on the 5 static forms.** A swap would remove **no Python line** unless the engine first learns to write page fields (a large addition, not a small fix), and even then about 129 of our 679 writer lines: the Python step stays for the checks (signatures, read-back). So under P-469 our writer stays in our app; the open number is Adobe Validate on the engine copy (section 6).

## 2. What was run, on what

* **The app, as on the demo:** an isolated copy (`isolated.sh forms_b170i 4471`) of `origin/main` at `2f7d6695`, then Demo › Load the finished story (the configured checkpoint, then the family case to a recorded submission; 3 min 30 s). The latest release of each of the 5 combinations (vv.single, sp.outside, wp.lmia_inside, fs.spouse, pnp.express_entry), profile `client-a-family`.
* **Paper forms:** every form line of those releases that is not Online or Not needed and has a mapped PDF edition: 18 editions (IMM 5257, 0008, 5406 and 5669 are Online on some releases; 5406 and 5669 only Online, so not in the trial).
* **Ours:** the app's own step `writeForm` (value step, then `p5/fill.py`: pypdf incremental write, page fields on a static form, read-back, `openssl` signature check, poppler). **Theirs:** the same value step and the same data, then `openXfaPdf` + `withPacket("datasets", …)` from `packages/xfa-engine` (commit `a0119727`, unchanged; built from its own lockfile). The data part is built for the engine by a 20-line TypeScript copy of our `new_datasets` on the engine's own XML parser (the engine has no such step outside its form-script part, which reads only 4 of these forms).
* **Three input sets, all Sample:** (1) the Sample facts the app writes on each (release, form, person) the profile gives: 22 pairs, 145 values; on IMM 1344 and 5532 the profile confirms none (0 values; the write is still compared). (2) The finished story's Paper IMM 5257 (C10.2, Child 18 or over, copy `6d080797`): 75 values, from the app's own request file. (3) Every box: the E1 fill trials' inputs (`p1/e5_roundtrip.py` `generic_values`, two rows of each repeating box), 2,473 values on the 18 editions, so the forms the profile does not reach (IMM 5257, 1295, 5409, 5604) are tested too.
* **Checks on both copies by the same code:** `studio/tools/xfa_writer_trial_check.py` (our reader: every data leaf, read-back, signatures with `openssl cms -verify`, original bytes, other parts, poppler, page fields) and the engine's reader (every data leaf). The two readers agree on every copy (0 disagreements). Barcodes: the engine's form-script part (fixed clock 2026-11-13 12:00 UTC, America/Toronto) presses the form's own Validate and makes the barcode texts on each copy of the forms it reads with a recorded descriptor (IMM 5257, 1295).
* **Time:** median of 5 runs, one after the other, 4-CPU cloud machine, Node 24.21.0. "The app's fill step" is the whole of `writeForm` for ours, and the same step with the engine's write for theirs (bare, and with the engine reading its copy back). Of ours, starting Python and loading the writer takes 108 to 119 ms.
* **Re-run:** `cd prototype/studio && DATABASE_URL=… STUDIO_URL=http://localhost:<port> TSX_TSCONFIG_PATH=api/tsconfig.json node --import tsx tools/xfa-writer-trial.ts --out <dir> --runs 5` (2 minutes). The filled PDFs stay out of git.

## 3. Summary, one line per form

| Form | Kind | Values written (all sets) | Differences | Signatures intact (ours · theirs) | Bytes kept | Bytes added, every box (ours · theirs) | App step, median ms (ours · theirs) | Barcodes | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| IMM 0008 | dynamic | 307 | 0 | 2 of 2 · 2 of 2 | yes · yes | 89,915 · 90,108 | 375.5 · 127.7 | engine refuses form | theirs equal or better |
| IMM 1295 | dynamic | 242 | 0 | 2 of 2 · 2 of 2 | yes · yes | 88,042 · 88,267 | writer 347.2 · 115.7 | equal (none made) | theirs equal or better |
| IMM 1344 | dynamic | 233 | 0 | 2 of 2 · 2 of 2 | yes · yes | 87,866 · 88,107 | 343.4 · 112 | engine refuses form | theirs equal or better |
| IMM 5257 | dynamic | 317 | 0 | 2 of 2 · 2 of 2 | yes · yes | 88,012 · 88,253 | writer 355.8 · 150.2 | 5 texts equal | theirs equal or better |
| IMM 5409 | static | 32 | 0 | 1 of 1 · 1 of 1 | yes · yes | 30,463 · 874 | writer 314.2 · 12.7 | none | **ours better** (page fields: theirs 0 of 32) |
| IMM 5707 | dynamic | 78 | 0 | 1 of 1 · 1 of 1 | yes · yes | 1,078 · 1,078 | 238.7 · 18 | none | theirs equal or better |
| IMM 0008 DEP | dynamic | 79 | 0 | 1 of 1 · 1 of 1 | yes · yes | 77,644 · 77,856 | 265.7 · 95.5 | none | theirs equal or better |
| IMM 1294 | dynamic | 268 | 0 | 2 of 2 · 2 of 2 | yes · yes | 88,042 · 88,283 | 344.1 · 118.9 | none | theirs equal or better |
| IMM 5257 SCH1 | dynamic | 101 | 0 | 2 of 2 · 2 of 2 | yes · yes | 85,866 · 86,107 | 315.7 · 109.9 | none | theirs equal or better |
| IMM 5475 | dynamic | 39 | 0 | 1 of 1 · 1 of 1 | yes · yes | 886 · 902 | 238.8 · 21.5 | none | theirs equal or better |
| IMM 5476 | static | 68 | 0 | 1 of 1 · 1 of 1 | yes · yes | 28,693 · 1,096 | 263.2 · 10.6 | none | **ours better** (page fields: theirs 0 of 43) |
| IMM 5532 | dynamic | 314 | 0 | 1 of 1 · 1 of 1 | yes · yes | 1,991 · 1,991 | 288.8 · 61.1 | none | theirs equal or better |
| IMM 5562 | dynamic | 29 | 0 | 1 of 1 · 1 of 1 | yes · yes | 948 · 932 | 204.4 · 13.9 | none | theirs equal or better |
| IMM 5604 | static | 19 | 0 | 1 of 1 · 1 of 1 | yes · yes | 18,362 · 810 | writer 289.8 · 22.7 | none | **ours better** (page fields: theirs 0 of 19) |
| IMM 5645 | static | 148 | 0 | 1 of 1 · 1 of 1 | yes · yes | 94,332 · 1,324 | 379.9 · 16.4 | none | **ours better** (page fields: theirs 0 of 139) |
| IMM 5646 | dynamic | 148 | 0 | 1 of 1 · 1 of 1 | yes · yes | 1,222 · 1,222 | 239.9 · 23.1 | none | theirs equal or better |
| IMM 5710 | dynamic | 254 | 0 | 2 of 2 · 2 of 2 | yes · yes | 88,090 · 88,347 | 361.1 · 118.4 | none | theirs equal or better |
| IRM 0002 | static | 17 | 0 | 1 of 1 · 1 of 1 | yes · yes | 13,230 · 778 | 249.8 · 13.2 | none | **ours better** (page fields: theirs 0 of 16) |

"App step" for the four forms the Sample profile does not reach is the writer alone on every box (ours with its checks). Signatures: seven forms carry DocMDP and UR3 (IMM 0008, 1294, 1295, 1344, 5257, 5257 SCH1, 5710), eleven UR3 only; every one verifies on both copies (25 of 25 each side).

## 4. Per form

The fill-trial six first, then the others in form order.

#### IMM 0008 (imm0008e.pdf, dynamic, fill-trial form; Paper on pnp.express_entry)
| | Ours | Theirs |
|---|---|---|
| Values read back equal | Sample facts 9 of 9; every box 298 of 298 | Sample facts 9 of 9; every box 298 of 298 |
| **Differences between the two copies** (every data leaf, both readers) | **0** | |
| Signatures | DocMDP verified · UR3 verified | DocMDP verified · UR3 verified |
| Original bytes kept; nothing else changed; poppler 0 errors | yes | yes |
| Size, every box: bytes added to the blank | 89,915 | 90,108 |
| The app's fill step, Sample facts (median ms) | 375.5 | 127.7; 260.3 with its read-back |
| The writer, every box (median ms; ours with its checks) | 371.5 | 127.3 |
| Barcodes | barcode form; not checkable in the cloud: the engine refuses the form (repeating or optional occur (min="0") at form1.Page1.dependants.#occur) | |

**Verdict: theirs equal or better** (same data, signatures and bytes kept, faster, same file each run). Not proven in Adobe: only IMM 5257 gets the Mac run.

#### IMM 1295 (imm1295e.pdf, dynamic, fill-trial form; Paper line on sp.outside; the Sample profile gives it to no person, so every box only)
| | Ours | Theirs |
|---|---|---|
| Values read back equal | every box 242 of 242 | every box 242 of 242 |
| **Differences between the two copies** (every data leaf, both readers) | **0** | |
| Signatures | DocMDP verified · UR3 verified | DocMDP verified · UR3 verified |
| Original bytes kept; nothing else changed; poppler 0 errors | yes | yes |
| Size, every box: bytes added to the blank | 88,042 | 88,267 |
| The writer, every box (median ms; ours with its checks) | 347.2 | 115.7 |
| Barcodes (the engine reads the form) | every box: Validate not complete (made-up values), no texts | the same; equal |

**Verdict: theirs equal or better** (same data, signatures and bytes kept, faster, same file each run). Not proven in Adobe: only IMM 5257 gets the Mac run.

#### IMM 1344 (imm1344e.pdf, dynamic, fill-trial form; Paper on fs.spouse)
| | Ours | Theirs |
|---|---|---|
| Values read back equal | Sample facts 0 of 0; every box 233 of 233 | Sample facts 0 of 0; every box 233 of 233 |
| **Differences between the two copies** (every data leaf, both readers) | **0** | |
| Signatures | DocMDP verified · UR3 verified | DocMDP verified · UR3 verified |
| Original bytes kept; nothing else changed; poppler 0 errors | yes | yes |
| Size, every box: bytes added to the blank | 87,866 | 88,107 |
| The app's fill step, Sample facts (median ms) | 343.4 | 112; 190.5 with its read-back |
| The writer, every box (median ms; ours with its checks) | 368.2 | 136.5 |
| Barcodes | barcode form; not checkable in the cloud: the engine refuses the form (FormCalc script that is not a bare SOM reference at form1.barcodeValues.TextField1.#calcul) | |

**Verdict: theirs equal or better** (same data, signatures and bytes kept, faster, same file each run). Not proven in Adobe: only IMM 5257 gets the Mac run.

#### IMM 5257 (imm5257e.pdf, dynamic, fill-trial form; Paper line on sp.outside and the finished story's case; the Sample profile gives it to no person, so every box only)
| | Ours | Theirs |
|---|---|---|
| Values read back equal | finished story 75 of 75; every box 242 of 242 | finished story 75 of 75; every box 242 of 242 |
| **Differences between the two copies** (every data leaf, both readers) | **0** | |
| Signatures | DocMDP verified · UR3 verified | DocMDP verified · UR3 verified |
| Original bytes kept; nothing else changed; poppler 0 errors | yes | yes |
| Size, every box: bytes added to the blank | 88,012 | 88,253 |
| The writer, every box (median ms; ours with its checks) | 355.8 | 150.2 |
| The writer, finished story's 75 values (median ms; ours with its checks) | 344.4 | 115.1 |
| Barcodes (finished story: the form's own Validate and its 5 barcode texts, by the engine) | Validate complete; 5 texts | Validate complete; **5 texts identical to ours** |

**Verdict: theirs equal or better** on everything the cloud measures (same data, same barcode texts, faster, same file each run). Adobe Validate on the engine copy: the Mac number, still open.

#### IMM 5409 (imm5409e.pdf, static, fill-trial form; Paper line on vv.single, sp.outside, wp.lmia_inside; the Sample profile gives it to no person, so every box only)
| | Ours | Theirs |
|---|---|---|
| Values read back equal | every box 32 of 32 | every box 32 of 32 |
| **Differences between the two copies** (every data leaf, both readers) | **0** | |
| Page fields shown outside Adobe | every box 32 of 32 | **every box 0 of 32** (no page-field writer) |
| Signatures | UR3 verified | UR3 verified |
| Original bytes kept; nothing else changed; poppler 0 errors | yes | yes |
| Size, every box: bytes added to the blank | 30,463 | 874 |
| The writer, every box (median ms; ours with its checks) | 314.2 | 12.7 |
| Barcodes | none on this form | |

**Verdict: ours better.** Same data, but theirs leaves every page field empty, so the copy shows no values outside Adobe; adding a page-field writer to the engine is not a small fix.

#### IMM 5707 (imm5707e.pdf, dynamic, fill-trial form; Paper on sp.outside, wp.lmia_inside)
| | Ours | Theirs |
|---|---|---|
| Values read back equal | Sample facts 28 of 28; every box 50 of 50 | Sample facts 28 of 28; every box 50 of 50 |
| **Differences between the two copies** (every data leaf, both readers) | **0** | |
| Signatures | UR3 verified | UR3 verified |
| Original bytes kept; nothing else changed; poppler 0 errors | yes | yes |
| Size, every box: bytes added to the blank | 1,078 | 1,078 |
| The app's fill step, Sample facts (median ms) | 238.7 | 18; 47.9 with its read-back |
| The writer, every box (median ms; ours with its checks) | 230.7 | 35.3 |
| Barcodes | none on this form | |

**Verdict: theirs equal or better** (same data, signatures and bytes kept, faster, same file each run). Not proven in Adobe: only IMM 5257 gets the Mac run.

#### IMM 0008 DEP (imm0008depe.pdf, dynamic; Paper on pnp.express_entry)
| | Ours | Theirs |
|---|---|---|
| Values read back equal | Sample facts 6 of 6; every box 73 of 73 | Sample facts 6 of 6; every box 73 of 73 |
| **Differences between the two copies** (every data leaf, both readers) | **0** | |
| Signatures | UR3 verified | UR3 verified |
| Original bytes kept; nothing else changed; poppler 0 errors | yes | yes |
| Size, every box: bytes added to the blank | 77,644 | 77,856 |
| The app's fill step, Sample facts (median ms) | 265.7 | 95.5; 160.1 with its read-back |
| The writer, every box (median ms; ours with its checks) | 258.2 | 99.2 |
| Barcodes | none on this form | |

**Verdict: theirs equal or better** (same data, signatures and bytes kept, faster, same file each run). Not proven in Adobe: only IMM 5257 gets the Mac run.

#### IMM 1294 (imm1294e.pdf, dynamic; Paper on sp.outside)
| | Ours | Theirs |
|---|---|---|
| Values read back equal | Sample facts 23 of 23; every box 245 of 245 | Sample facts 23 of 23; every box 245 of 245 |
| **Differences between the two copies** (every data leaf, both readers) | **0** | |
| Signatures | DocMDP verified · UR3 verified | DocMDP verified · UR3 verified |
| Original bytes kept; nothing else changed; poppler 0 errors | yes | yes |
| Size, every box: bytes added to the blank | 88,042 | 88,283 |
| The app's fill step, Sample facts (median ms) | 344.1 | 118.9; 189.3 with its read-back |
| The writer, every box (median ms; ours with its checks) | 344.4 | 141 |
| Barcodes | none on this form | |

**Verdict: theirs equal or better** (same data, signatures and bytes kept, faster, same file each run). Not proven in Adobe: only IMM 5257 gets the Mac run.

#### IMM 5257 SCH1 (imm5257_1e.pdf, dynamic; Paper on vv.single)
| | Ours | Theirs |
|---|---|---|
| Values read back equal | Sample facts 6 of 6; every box 95 of 95 | Sample facts 6 of 6; every box 95 of 95 |
| **Differences between the two copies** (every data leaf, both readers) | **0** | |
| Signatures | DocMDP verified · UR3 verified | DocMDP verified · UR3 verified |
| Original bytes kept; nothing else changed; poppler 0 errors | yes | yes |
| Size, every box: bytes added to the blank | 85,866 | 86,107 |
| The app's fill step, Sample facts (median ms) | 315.7 | 109.9; 228.3 with its read-back |
| The writer, every box (median ms; ours with its checks) | 316.5 | 104.4 |
| Barcodes | none on this form | |

**Verdict: theirs equal or better** (same data, signatures and bytes kept, faster, same file each run). Not proven in Adobe: only IMM 5257 gets the Mac run.

#### IMM 5475 (imm5475e.pdf, dynamic; Paper on fs.spouse, sp.outside, vv.single, wp.lmia_inside)
| | Ours | Theirs |
|---|---|---|
| Values read back equal | Sample facts 12 of 12; every box 27 of 27 | Sample facts 12 of 12; every box 27 of 27 |
| **Differences between the two copies** (every data leaf, both readers) | **0** | |
| Signatures | UR3 verified | UR3 verified |
| Original bytes kept; nothing else changed; poppler 0 errors | yes | yes |
| Size, every box: bytes added to the blank | 886 | 902 |
| The app's fill step, Sample facts (median ms) | 238.8 | 21.5; 51.6 with its read-back |
| The writer, every box (median ms; ours with its checks) | 227.3 | 35.8 |
| Barcodes | none on this form | |

**Verdict: theirs equal or better** (same data, signatures and bytes kept, faster, same file each run). Not proven in Adobe: only IMM 5257 gets the Mac run.

#### IMM 5476 (imm5476e-2021.pdf, static; Paper on fs.spouse, pnp.express_entry, sp.outside, vv.single, wp.lmia_inside)
| | Ours | Theirs |
|---|---|---|
| Values read back equal | Sample facts 25 of 25; every box 43 of 43 | Sample facts 25 of 25; every box 43 of 43 |
| **Differences between the two copies** (every data leaf, both readers) | **0** | |
| Page fields shown outside Adobe | every box 43 of 43; Sample facts 25 of 25 | **every box 0 of 43; Sample facts 0 of 25** (no page-field writer) |
| Signatures | UR3 verified | UR3 verified |
| Original bytes kept; nothing else changed; poppler 0 errors | yes | yes |
| Size, every box: bytes added to the blank | 28,693 | 1,096 |
| The app's fill step, Sample facts (median ms) | 263.2 | 10.6; 18.1 with its read-back |
| The writer, every box (median ms; ours with its checks) | 277.1 | 8.9 |
| Barcodes | none on this form | |

**Verdict: ours better.** Same data, but theirs leaves every page field empty, so the copy shows no values outside Adobe; adding a page-field writer to the engine is not a small fix.

#### IMM 5532 (imm5532e.pdf, dynamic; Paper on fs.spouse)
| | Ours | Theirs |
|---|---|---|
| Values read back equal | Sample facts 0 of 0; every box 314 of 314 | Sample facts 0 of 0; every box 314 of 314 |
| **Differences between the two copies** (every data leaf, both readers) | **0** | |
| Signatures | UR3 verified | UR3 verified |
| Original bytes kept; nothing else changed; poppler 0 errors | yes | yes |
| Size, every box: bytes added to the blank | 1,991 | 1,991 |
| The app's fill step, Sample facts (median ms) | 288.8 | 61.1; 101 with its read-back |
| The writer, every box (median ms; ours with its checks) | 274 | 72.6 |
| Barcodes | none on this form | |

**Verdict: theirs equal or better** (same data, signatures and bytes kept, faster, same file each run). Not proven in Adobe: only IMM 5257 gets the Mac run.

#### IMM 5562 (imm5562e.pdf, dynamic; Paper on pnp.express_entry)
| | Ours | Theirs |
|---|---|---|
| Values read back equal | Sample facts 2 of 2; every box 27 of 27 | Sample facts 2 of 2; every box 27 of 27 |
| **Differences between the two copies** (every data leaf, both readers) | **0** | |
| Signatures | UR3 verified | UR3 verified |
| Original bytes kept; nothing else changed; poppler 0 errors | yes | yes |
| Size, every box: bytes added to the blank | 948 | 932 |
| The app's fill step, Sample facts (median ms) | 204.4 | 13.9; 18.8 with its read-back |
| The writer, every box (median ms; ours with its checks) | 212.5 | 12.4 |
| Barcodes | none on this form | |

**Verdict: theirs equal or better** (same data, signatures and bytes kept, faster, same file each run). Not proven in Adobe: only IMM 5257 gets the Mac run.

#### IMM 5604 (imm5604e.pdf, static; Paper line on fs.spouse; the Sample profile gives it to no person, so every box only)
| | Ours | Theirs |
|---|---|---|
| Values read back equal | every box 19 of 19 | every box 19 of 19 |
| **Differences between the two copies** (every data leaf, both readers) | **0** | |
| Page fields shown outside Adobe | every box 19 of 19 | **every box 0 of 19** (no page-field writer) |
| Signatures | UR3 verified | UR3 verified |
| Original bytes kept; nothing else changed; poppler 0 errors | yes | yes |
| Size, every box: bytes added to the blank | 18,362 | 810 |
| The writer, every box (median ms; ours with its checks) | 289.8 | 22.7 |
| Barcodes | none on this form | |

**Verdict: ours better.** Same data, but theirs leaves every page field empty, so the copy shows no values outside Adobe; adding a page-field writer to the engine is not a small fix.

#### IMM 5645 (imm5645e.pdf, static; Paper on vv.single)
| | Ours | Theirs |
|---|---|---|
| Values read back equal | Sample facts 9 of 9; every box 139 of 139 | Sample facts 9 of 9; every box 139 of 139 |
| **Differences between the two copies** (every data leaf, both readers) | **0** | |
| Page fields shown outside Adobe | every box 118 of 139; Sample facts 5 of 9 | **every box 0 of 139; Sample facts 0 of 9** (no page-field writer) |
| Signatures | UR3 verified | UR3 verified |
| Original bytes kept; nothing else changed; poppler 0 errors | yes | yes |
| Size, every box: bytes added to the blank | 94,332 | 1,324 |
| The app's fill step, Sample facts (median ms) | 379.9 | 16.4; 50.1 with its read-back |
| The writer, every box (median ms; ours with its checks) | 554.4 | 32.4 |
| Barcodes | none on this form | |

**Verdict: ours better.** Same data, but theirs leaves every page field empty, so the copy shows no values outside Adobe; adding a page-field writer to the engine is not a small fix.

#### IMM 5646 (imm5646e.pdf, dynamic; Paper on sp.outside)
| | Ours | Theirs |
|---|---|---|
| Values read back equal | Sample facts 12 of 12; every box 136 of 136 | Sample facts 12 of 12; every box 136 of 136 |
| **Differences between the two copies** (every data leaf, both readers) | **0** | |
| Signatures | UR3 verified | UR3 verified |
| Original bytes kept; nothing else changed; poppler 0 errors | yes | yes |
| Size, every box: bytes added to the blank | 1,222 | 1,222 |
| The app's fill step, Sample facts (median ms) | 239.9 | 23.1; 65.6 with its read-back |
| The writer, every box (median ms; ours with its checks) | 232 | 22.1 |
| Barcodes | none on this form | |

**Verdict: theirs equal or better** (same data, signatures and bytes kept, faster, same file each run). Not proven in Adobe: only IMM 5257 gets the Mac run.

#### IMM 5710 (imm5710e.pdf, dynamic; Paper on wp.lmia_inside)
| | Ours | Theirs |
|---|---|---|
| Values read back equal | Sample facts 12 of 12; every box 242 of 242 | Sample facts 12 of 12; every box 242 of 242 |
| **Differences between the two copies** (every data leaf, both readers) | **0** | |
| Signatures | DocMDP verified · UR3 verified | DocMDP verified · UR3 verified |
| Original bytes kept; nothing else changed; poppler 0 errors | yes | yes |
| Size, every box: bytes added to the blank | 88,090 | 88,347 |
| The app's fill step, Sample facts (median ms) | 361.1 | 118.4; 186.7 with its read-back |
| The writer, every box (median ms; ours with its checks) | 364 | 149 |
| Barcodes | none on this form | |

**Verdict: theirs equal or better** (same data, signatures and bytes kept, faster, same file each run). Not proven in Adobe: only IMM 5257 gets the Mac run.

#### IRM 0002 (irm0002e.pdf, static; Paper on vv.single)
| | Ours | Theirs |
|---|---|---|
| Values read back equal | Sample facts 1 of 1; every box 16 of 16 | Sample facts 1 of 1; every box 16 of 16 |
| **Differences between the two copies** (every data leaf, both readers) | **0** | |
| Page fields shown outside Adobe | every box 14 of 16; Sample facts 1 of 1 | **every box 0 of 16; Sample facts 0 of 1** (no page-field writer) |
| Signatures | UR3 verified | UR3 verified |
| Original bytes kept; nothing else changed; poppler 0 errors | yes | yes |
| Size, every box: bytes added to the blank | 13,230 | 778 |
| The app's fill step, Sample facts (median ms) | 249.8 | 13.2; 22 with its read-back |
| The writer, every box (median ms; ours with its checks) | 278.6 | 30.9 |
| Barcodes | none on this form | |

**Verdict: ours better.** Same data, but theirs leaves every page field empty, so the copy shows no values outside Adobe; adding a page-field writer to the engine is not a small fix.

## 5. What a swap would remove, and what it would add

Our writer today: `p5/fill.py` (59 lines), `p5/page_fields.py` (257), `p1/e5_roundtrip.py` (363): 679 lines, the "about 680" of the analysis. Most of it is not the writing; it is the checks and the readers, and other tools and tests use them too (37 other files in the repository use `e5_roundtrip` or `page_fields`).

| Swap | Python lines removed | Tools leaving the fill path | Added |
|---|---|---|---|
| **Theirs on the 13 dynamic forms only** (ours kept for static forms) | **0**: `write_filled` still writes the 5 static forms, and `fill.py`'s checks stay | none (pypdf's private parts still write the static forms) | ~20 TypeScript lines (the data-part builder) plus the adapter; two writers to keep |
| **Theirs on all 18**, after the engine gains a page-field writer | about **129**: `write_filled` 33, `set_page_fields` 42, `drawable` 21, `_font` 9, `encrypt_changes` 15, `new_datasets` 9 | pypdf's private internals (`_root_object`, `_objects`, `_original_hash`, the incremental `PdfWriter`) | the page-field writer in the engine: find each page field, set its value, draw its appearance with the form's font, add new encrypted objects (today `withPackets` only redefines existing XFA streams). **Not a small fix** (P-467's bar); a listed patch in `PATCHES.md` if ever chosen (P-470) |
| **And** the checks moved to TypeScript | the rest of the 679, as far as nothing else uses them | the Python step, pypdf, poppler; `openssl` stays unless signatures are checked another way | a TypeScript read-back, a CMS signature check (the engine has none) and a "nothing else changed" check |

The Python step, pypdf, `openssl` and `pdftotext` stay on the fill path in the first two cases: `fill.py`'s checks (read every value back, both signatures, other parts unchanged, poppler) are what make a copy "intact", and the engine checks none of them.

## 6. Adobe Validate on the engine copy: the Mac number

The cloud wrote the engine copy of the finished story's data: `story-engine.pdf`, sha256 `2f185acdaa55757008a4931cf8115701d59dea9fee5033249c5dd77100da0c7b`, 1,453,340 bytes, 75 of 75 values equal to the app's copy (`211f1c7b…`, 1,453,131 bytes), both signatures verified, the form's own Validate complete in the engine, barcode texts equal. The cloud cannot hand that file to the Mac (test PDFs stay out of git), so the Mac makes the same file again: the engine writes the same bytes from the same data every time (5 of 5 runs here; same sha256 in two separate runs).

**On the Mac, in the BK-20 session (the founder):**
1. Demo › Load the finished story on :4400; wait until it is done.
2. `zsh ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/tools/xfa-writer-trial-mac.sh` (builds the engine once from its own lockfile if needed; writes `story-engine.pdf` and its request beside it into the validated folder, `STUDIO_VALIDATED_DIR` or `.tools/solution-1-prototype/validated-imm5257/`).
3. In Adobe: open `story-engine.pdf`, follow the copy's person steps (as for the app's copy), press the form's own Validate until it passes, save as a new file `story-engine-validated.pdf` in the same folder.
4. `zsh …/xfa-writer-trial-mac.sh --read`: prints one line, "Adobe Validate on the engine copy: passed | flag … | date … | values read back … of 75".
5. That line goes into this report's section 6 (a records change by the tech lead) and decides F5's "Not decided" cell.

The script's two halves were run in the cloud: step 2 wrote the same sha256 as the trial; step 4 was run once on a copy marked validated by `tools/simulate_validate.py` (test only, no Adobe; the file was deleted), only to prove the read works. **That is not the result.**

If Adobe passes it, IMM 5257's verdict stays "theirs equal or better" with the Adobe number in place; if it fails, IMM 5257 becomes "ours better" and the reason is recorded for a fix row.

## 7. P-474's 18 refused forms: which our pathways use

The engine's form-script part (not its writer) refuses 18 of the share's blank forms (analysis section 1.3; P-474 is not yet in `DECISIONS.md` on main, so this uses that list). Measured again here on our blanks with the engine at `a0119727`:

| Refused form (reason) | Our pathways (latest releases) |
|---|---|
| IMM 0008 (repeating sections) | **Paper** on pnp.express_entry; Online on fs.spouse |
| IMM 1294 (input pattern "zero") | **Paper** on sp.outside (the Bake's exit pathway) |
| IMM 1344 (FormCalc) | **Paper** on fs.spouse |
| IMM 5409 (FormCalc) | **Paper** on vv.single, sp.outside, wp.lmia_inside |
| IMM 5476 (input pattern "A9A 9A9") | **Paper** on all 5 |
| IMM 5532 (shared "global" box) | **Paper** on fs.spouse |
| IMM 5562 (repeating sections) | **Paper** on pnp.express_entry |
| IMM 5707 (repeating sections) | **Paper** on sp.outside, wp.lmia_inside |
| IMM 5710 (input pattern "X9X9X9") | **Paper** on wp.lmia_inside |
| IMM 5406 (repeating sections) | Online only (pnp.express_entry, fs.spouse) |
| IMM 5669 (no data part in the blank) | Online only (pnp.express_entry, fs.spouse) |
| IMM 1283, 5444, 5481, 5490, 5708, 5709, 5768 | not used |

**11 of the 18 are used: 9 on Paper, 2 Online only; 7 are not used.** Five more of our Paper forms, not in that share, are refused too: IMM 5257 SCH1 (an explicit bind), 5475 (input pattern "A9 9AA"), 5646 (repeating sections), 0008 DEP and 5604 (a script object the engine's parser rejects). The engine's form-script part reads **4 of our 18 Paper editions**: IMM 5257, 1295, 5645, IRM 0002. Its **writer** is not affected: it wrote all 18. Sizing each reason is B170j.

## 8. Findings (for the founder's report, P-470; none changed here)

1. **No page-field writer in the engine** (the only difference that matters). On a static form our writer also sets each box's page field with its appearance, so the copy shows its values outside Adobe (evidence lane F5, F1 slice 2b); the engine's copy shows none. On IMM 5645 ours shows 118 of 139 and on IRM 0002 14 of 16 with the made-up values (the others are values the page field does not take: a code outside its list, signature boxes); theirs shows 0 everywhere.
2. **The engine writes the same file every time; ours does not** (17 of 18 forms differ run to run; not looked into: likely random values in pypdf's encryption of the new objects). Same data either way.
3. **Size:** on dynamic forms theirs adds 0 to 257 bytes more than ours (one form 16 fewer): different compression of the same data. On static forms theirs adds far less only because it writes no page fields.
4. **The data part differs only in form, not content:** our writer rewrites XML prefixes and adds an XML declaration (Python's ElementTree); the engine keeps the file's own prefixes. Both readers read the same values from both copies.
5. **Barcode texts carry the host's name.** The engine's IMM 5257 barcode text ends with its host identity ("xfa-engine.0.headless…"), where Adobe writes its own; this trial compares the engine's texts on the two copies (equal), not against Adobe's (rows e and g).
6. **The engine checks nothing of what we check** (signatures, read-back, other data unchanged); a swap keeps our checks (section 5), as the analysis said for F5.

## 9. Verdict and what it means

* **13 dynamic forms: theirs equal or better.** Same data (0 differences), same signatures, bytes kept, faster, same file every run.
* **5 static forms (IMM 5409, 5476, 5604, 5645, IRM 0002): ours better.** Theirs shows nothing outside Adobe; the fix is not small.
* **IMM 5257:** theirs equal or better on everything the cloud measures; Adobe Validate on the engine copy is the open Mac number (section 6).
* **For our app (P-469):** not a clear win. A swap removes no Python line unless the engine gains a page-field writer, and then about 129 of 679; the speed gain (about 0.1 to 0.3 s per form) is not felt. **Ours stays in our app.** No swap row follows from this trial.
* **For the team's product (strategy desk's option A):** their writer writes our data as ours does on every dynamic form, and keeps the signatures; on static forms it leaves the page fields empty. If the Mac number passes, using theirs in their product holds for dynamic forms; static forms need a page-field writer or are filled with values shown only in Adobe. The founder decides with this report.

## 10. Not measured here

* Adobe Validate on any engine copy (section 6: IMM 5257 on the Mac; the other forms have no Adobe run on either side in this trial).
* Barcodes on IMM 0008 and 1344: the engine refuses both forms, and neither writer draws barcodes (Adobe does at Validate).
* Time on the Mac, and under load; the numbers are one cloud machine, runs in sequence.

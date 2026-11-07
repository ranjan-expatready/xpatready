# qa findings closed on 6 Nov 2026 (moved word for word from `qa/BUGS.md`, AGENTS.md rule 8)

## QA-285 — closed 6 Nov 2026 (C10.1 final walk)

Closed by the qa lane on main **fd29643aa** (fixed by #1156, the tech lead's ruling on the founder's "Files stay on the Mac"; verdict by a fresh reader, P-360 (3)). On a Mac copy with `STUDIO_VALIDATED_DIR` set (an absolute path to the four Adobe-saved files), the configured checkpoint sends each file through the product's own upload door; by screens, Prepare application › Download of each of the four validated IMM 5257 copies gives **200**, `IMM5257-validated-….pdf`, `%PDF-`, its sha256 the saved `validated_sha256` (Client A `1a2aa8d8…`, Partner `c8547b02…`, Child `377f96bd…`, Child 18 or over `995faaa9…`). `acceptance/C10.1.test.ts` on that copy: exit 0, 28/28, **R12c PASS**. Without the folder: each copy and row 12 say "Validated in Adobe on the Mac and read back equal (Sample): the validated file is kept on the Mac, not in these working files"; Download 409 in those words, no PDF, no "validate again" (R12d PASS; R12c HELD, red, naming QA-285). The upload door accepts the Adobe file for a copy with no validated row (201, then 200 with the saved sha256). GitHub: nightly run 42175798473 on `fd29643aa`, `GATE_B_DATA: checkpoint`, exit 0, 28/28 with the HELD line, gate B passed. Evidence `qa/reports/2026-11-06-c101-final.md` and `2026-11-06-c101-final/walk.md`.

From `qa/BUGS.md`:

| QA-285 | Bug · Major (qa lane, C10.1 walk on main after #1123, 6 Nov ~09:55 IST; rated Major by the fresh reader, P-360 (3)) | C10.1 row 12b (route C7.2, C-9) · P-171, P-274, P-322 | main ea8e35763 | On the configured checkpoint the case's four IMM 5257 copies show "Validated copy read back", but **Download is refused for all four**: `GET …/form-copies/:id/file` 404, toast "This copy's validated file is missing from the working files; validate the copy again and read it back." The loader (`api/src/sample-validated.ts:65`, #1123) writes each `validated_copy` with `path: "samples/validated-imm5257.json (the validated PDF stays on the Mac)"`, which is not a file, and `file()` (`api/src/fill-case.ts`) rightly serves a current validated copy's file before the product's copy. Sending the four Adobe-saved files back through the upload door ("Read back again") is refused 409 "already read back … nothing was added". The only way by screens is Generate a new copy, which is "Not validated yet". Expected: the validated file downloads (200, its `validated_sha256`), the checkpoint bringing the bytes in through the product's own upload route. Holds C10.1 (Partial). Evidence `reports/2026-11-06-c101/6-imm5257-download-refused-1024.jpg`, `walk.md` step 5 | forms (B99's lane): tech lead assigns; where the bytes come from is the tech lead's call (AGENTS rule 1: no PDFs in git) | Open |

## QA-250 — closed 6 Nov 2026 (C1.3 and C11.5 re-score)

Closed by the qa lane on main **d52071876** (verdict by a fresh reader, P-360 (3)). The C11.5 fix in #1051 (the representative's own firm, IMM 5475, is no longer an employer fact) answers the question: on the configured checkpoint the Open a case dialog says "Not offered: the Visitor visa has no employer facts." (and the same for Express Entry), while With an LMIA – inside Canada is "Offered: … forms read 2 employer facts". Facts: `qa/reports/2026-11-06-b120/walk.md` step 3; `C1.3.test.ts` asserts it ("C11.5 fail (m1): the Visitor visa on the checkpoint is not offered the link"), 54/54 in nightly run 42266431383.

From `qa/BUGS.md`:

| QA-250 | Ambiguity · Minor (cloud qa's M3 re-score, #1069, 5 Nov; copied by the qa lane ~12:11 IST) | C11.5, C1.3 · P-106 | main ffcfb45c8, 344e08699 (cloud) | A Visitor visa case offers "Relies on an employer case" (1 employer fact). Should it, or is this QA-152's organisation question showing again? | the tech lead | Open |

From `qa/reports/bugs-open-detail.md`:

| QA-250 | Ambiguity · Minor (cloud qa's M3 re-score, #1069, 5 Nov; copied by the qa lane ~12:11 IST) | C11.5, C1.3 · P-106 | main ffcfb45c8, 344e08699 (cloud) | A Visitor visa case offers "Relies on an employer case" (1 employer fact). Should it, or is this QA-152's organisation question showing again? | the tech lead | Open |


# M2 independent re-test, 3b0d4d64 (3 Nov 2026)

Verifier V2 (P-291 (1), the tech lead's request of 10:00 UTC). Every M2 row of `qa/CAPABILITIES.md` at `3b0d4d64`; each acceptance pack on its own fresh isolated copy (port 4470), following the setup its own header names; capabilities without a pack are judged by the checks their evidence names, from the full `run-suites.sh` run on the same commit. Live AI off, US$0. Exit 0 = every check passes.

## Summary

* **43 of 52 rows scored Works are confirmed** by a green pack on main (the 3 Nov build review: 36 of 52).
* agrees: 6; confirmed Works: 43; not confirmed: 9; pack green, scored Partial: 2.

## Capability by capability

| Capability | Scored | What ran and its exit code | Reading | Build review 3 Nov |
|---|---|---|---|---|
| C1.1 | Works | no acceptance pack; its named checks in the full run: `check_screen01_smallfix.cjs` PASS | confirmed Works |  |
| C1.2 | Works | no acceptance pack; its named checks in the full run: `check_w1_programs_r3.cjs` PASS | confirmed Works |  |
| C1.4 | Works | no acceptance pack; its named checks in the full run: `check_setup_checklist.ts` PASS | confirmed Works |  |
| C1.5 | Works | acceptance/C1.5.test.ts: exit 0 (18 PASS, 0 FAIL · 1 s · setup=vv arg=none) | confirmed Works | 16/18 red |
| C1.6 | Works | acceptance/C1.6.test.ts: exit 0 (23 PASS, 0 FAIL · 13 s · setup=none arg=none) | confirmed Works |  |
| C1.8 | Works | no acceptance pack; its named checks in the full run: `check_c18_copies.ts` PASS, `check_c18_copies_browser.cjs` PASS, `check_c18_age_case.ts` PASS, `check_qa_am_1101_api.ts` not in run | confirmed Works |  |
| C2.1 | Works | no acceptance pack; its named checks in the full run: `check_forms_pdf_hardening.ts` PASS | confirmed Works |  |
| C2.2 | Works | no acceptance pack; its named checks in the full run: `check_forms_p80_guard.ts` PASS | confirmed Works |  |
| C2.3 | Works | no acceptance pack; its named checks in the full run: `check_forms_p80_guard.ts` PASS, `check_forms_pdf_hardening.ts` PASS, `check_qa_dv_1029.cjs` not in run | confirmed Works |  |
| C2.4 | Works | acceptance/C2.4.test.ts: exit 1 (21 PASS, 1 FAIL · 4 s · setup=none arg=none) | **not confirmed: pack red** | 21/22 red |
| C2.6 | Works | acceptance/C2.6.test.ts: exit 0 (32 PASS, 0 FAIL · 23 s · setup=none arg=none) | confirmed Works |  |
| C2.12 | Works | acceptance/C2.12.test.ts: exit 0 (16 PASS, 0 FAIL · 12 s · setup=none arg=none) | confirmed Works |  |
| C3.1 | Works | no acceptance pack; its named checks in the full run: `check_forms_c31_acceptance.ts` PASS, `check_forms_c31_formats.ts` PASS, `check_forms_c31_formats_browser.cjs` PASS, `check_forms_pdf_hardening.ts` PASS | confirmed Works |  |
| C3.2 | Works | acceptance/C3.2.test.ts: exit 0 (22 PASS, 0 FAIL · 15 s · setup=none arg=none) | confirmed Works | 19/22 red |
| C3.3 | Works | no acceptance pack; its named checks in the full run: `check_ai_drafting.ts` PASS, `check_forms_c33_acceptance.ts` PASS, `check_forms_c33_failed_run_browser.ts` PASS, `check_forms_w102_fix.ts` PASS | confirmed Works |  |
| C3.4 | Partial | acceptance/C3.4.test.ts: exit 1 (7 PASS, 9 FAIL · 22 s · setup=none arg=none) | agrees (Partial, pack red) |  |
| C3.5 | Works | no acceptance pack; its named checks in the full run: `check_forms_channels.ts` PASS, `check_screen02_slice2.ts` PASS, `check_screen02_slice2_browser.cjs` PASS | confirmed Works |  |
| C3.6 | Works | acceptance/C3.6.test.ts: exit 0 (18 PASS, 0 FAIL · 9 s · setup=none arg=wp.family (the pack's own fallback after exit 2)) | confirmed Works |  |
| C3.7 | Works | no acceptance pack; its named checks in the full run: `check_forms_s4_library_browser.cjs` PASS, `check_w1_structure.ts` PASS, `check_qa_am_s4_1028.cjs` not in run, `check_qa_am_r69_1028.cjs` not in run | confirmed Works |  |
| C3.8 | Works | acceptance/C3.8.test.ts: exit 1 (9 PASS, 2 FAIL · 13 s · setup=none arg=none) | **not confirmed: pack red** | 9/11 red |
| C3.10 | Works | acceptance/C3.10.test.ts: exit 1 (7 PASS, 1 FAIL · 49 s · setup=none arg=none) | **not confirmed: pack red** | no check named |
| C3.11 | Works | acceptance/C3.11.test.ts: exit 0 (12 PASS, 0 FAIL · 23 s · setup=none arg=none) | confirmed Works |  |
| C3.12 | Works | acceptance/C3.12.test.ts: exit 0 (17 PASS, 0 FAIL · 13 s · setup=none arg=none) | confirmed Works |  |
| C3.13 | Works | acceptance/C3.13.test.ts: exit 0 (23 PASS, 0 FAIL · 1 s · setup=vv arg=none) | confirmed Works |  |
| C3.14 | Works | acceptance/C3.14.test.ts: exit 0 (16 PASS, 0 FAIL · 0 s · setup=vv arg=none) | confirmed Works |  |
| C3.15 | Works | acceptance/C3.15.test.ts: exit 1 (7 PASS, 4 FAIL · 2 s · setup=vv arg=none) | **not confirmed: pack red** | 7/11 red |
| C4.9 | Works | no acceptance pack; its named checks in the full run: `check_who_fills.ts` PASS, `check_who_fills_browser.cjs` PASS | confirmed Works |  |
| C4.1 | Works | acceptance/C4.1.test.ts: exit 0 (18 PASS, 0 FAIL · 12 s · setup=none arg=wp.family) | confirmed Works | 15/16 red |
| C4.2 | Works | acceptance/C4.2.test.ts: exit 1 (9 PASS, 1 FAIL · 11 s · setup=none arg=wp.family) | **not confirmed: pack red** | 8/10 red |
| C4.7 | Works | acceptance/C4.7.test.ts: exit 1 (13 PASS, 2 FAIL · 221 s · setup=none arg=wp.family (the pack's own fallback after exit 2)) | **not confirmed: pack red** | hung, needs a saved paid run |
| C4.8 | Works | acceptance/C4.8.test.ts: exit 0 (12 PASS, 0 FAIL · 12 s · setup=none arg=wp.family) | confirmed Works | 5/10 red |
| C4.3 | Works | no acceptance pack; its named checks in the full run: `check_preview_sets.ts` PASS, `check_preview_sets_browser.cjs` PASS | confirmed Works |  |
| C4.5 | Works | no acceptance pack; its named checks in the full run: `check_w115_slice3.ts` PASS, `check_w115_slice3_browser.cjs` PASS | confirmed Works |  |
| C4.10 | Works | no acceptance pack; its named checks in the full run: `check_w115_slice1.ts` PASS, `check_w115_slice3.ts` PASS, `check_qa_qn_1029.cjs` not in run | confirmed Works |  |
| C4.11 | Partial | acceptance/C4.11.test.ts: exit 1 (4 PASS, 19 FAIL · 22 s · setup=none arg=none) | agrees (Partial, pack red) |  |
| C4.6 | Works | acceptance/C4.6.test.ts: exit 0 (17 PASS, 0 FAIL · 22 s · setup=none arg=none) | confirmed Works | 11/17 red |
| C5.1 | Partial | no acceptance pack; its named checks in the full run: `check_f8_empty_release.ts` PASS, `check_s5_slice1.ts` PASS | **pack green, scored Partial** |  |
| C5.3 | Works | no acceptance pack; its named checks in the full run: `check_qa_am_1101_browser.cjs` not in run, `check_screen02_slice2.ts` PASS, `check_screen02_slice2_browser.cjs` PASS, `check_screens_qa_1029_browser.cjs` PASS | confirmed Works |  |
| C5.2 | Works | acceptance/C5.2.test.ts: exit 0 (32 PASS, 0 FAIL · 7 s · setup=vv arg=none) | confirmed Works | walk script only |
| C5.4 | Works | acceptance/C5.4.test.ts: exit 0 (22 PASS, 0 FAIL · 33 s · setup=none arg=none) | confirmed Works |  |
| C5.5 | Works | no acceptance pack; its named checks in the full run: `check_g2_answer_key_gate.ts` PASS | confirmed Works |  |
| C5.6 | Works | no acceptance pack; its named checks in the full run: `check_g3_demo_release_browser.cjs` PASS | confirmed Works |  |
| C5.7 | Works | no acceptance pack; its named checks in the full run: `check_g4_answer_keys.ts` PASS | confirmed Works |  |
| C9.1 | Partial | acceptance/C9.1.test.ts: exit 1 (3 PASS, 13 FAIL · 49 s · setup=none arg=none) | agrees (Partial, pack red) |  |
| C10.1 | Partial | acceptance/C10.1.test.ts: exit 1 (13 PASS, 10 FAIL · 39 s · setup=none arg=none) | agrees (Partial, pack red) |  |
| C11.1 | Works | acceptance/C11.1.test.ts: exit 0 (16 PASS, 0 FAIL · 28 s · setup=vv arg=none) | confirmed Works | walk script only |
| C11.2 | Works | no acceptance pack; its named checks in the full run: `check_forms_s4_library_browser.cjs` PASS, `check_forms_s4_canada.ts` PASS, `check_s5_slice3_browser.cjs` PASS, `check_qa_am_s4_1028.cjs` not in run | confirmed Works |  |
| C11.3 | Works | acceptance/C11.3.test.ts: exit 1 (26 PASS, 1 FAIL · 25 s · setup=none arg=none) | **not confirmed: pack red** | 26/27 red (held part) |
| C11.7 | Partial | acceptance/C11.7.test.ts: exit 1 (18 PASS, 3 FAIL · 53 s · setup=none arg=none) | agrees (Partial, pack red) |  |
| C11.8 | Partial | no acceptance pack; its named checks in the full run: `check_forms_c118_acceptance.ts` PASS, `check_cost_override.ts` PASS, `check_cost_warning_browser.cjs` PASS, `check_forms_rounds.ts` PASS | **pack green, scored Partial** |  |
| C11.9 | Works | no acceptance pack; its named checks in the full run: `check_c119_acceptance.ts` PASS, `check_c119_library_items_browser.cjs` PASS, `check_qa_am_r3_1028.cjs` not in run, `check_qa_am_r69_1028.cjs` not in run | confirmed Works |  |
| C11.10 | Works | acceptance/C11.10.test.ts: exit 0 (15 PASS, 0 FAIL · 23 s · setup=none arg=none) | confirmed Works |  |
| C11.11 | Works | acceptance/C11.11.test.ts: exit 1 (21 PASS, 5 FAIL · 12 s · setup=none arg=none) | **not confirmed: pack red** | 21/26 red |
| C11.12 | Works | acceptance/C11.12.test.ts: exit 0 (20 PASS, 0 FAIL · 23 s · setup=none arg=none) | confirmed Works |  |
| C11.13 | Works | acceptance/C11.13.test.ts: exit 0 (15 PASS, 0 FAIL · 24 s · setup=none arg=none) | confirmed Works |  |
| C11.14 | Partial | acceptance/C11.14.test.ts: exit 1 (10 PASS, 3 FAIL · 26 s · setup=none arg=none) | agrees (Partial, pack red) |  |
| C11.15 | Works | acceptance/C11.15.test.ts: exit 0 (37 PASS, 0 FAIL · 41 s · setup=none arg=none) | confirmed Works |  |
| C11.16 | Works | acceptance/C11.16.test.ts: exit 0 (25 PASS, 0 FAIL · 5 s · setup=none arg=none) | confirmed Works |  |
| C11.17 | Works | acceptance/C11.17.test.ts: exit 1 (23 PASS, 1 FAIL · 39 s · setup=none arg=none) | **not confirmed: pack red** | walk script only |
| C11.18 | Works | no acceptance pack; its named checks in the full run: `check_qa_am_ch_1030.cjs` not in run, `check_forms_s4_library_browser.cjs` PASS, `check_qa_am_s4_1028.cjs` not in run | confirmed Works |  |

## Why each row scored Works is red, in plain words

| Capability | What fails on 3b0d4d64 | Reading |
|---|---|---|
| C2.4 | An older edition (IMM 5476 11-2021) sent after the newer one is called "already in the library" instead of "older edition, not used" (AT-9). | Defect. Its fix #698 merged after 3b0d4d64: re-run below. |
| C3.8 | A Background question marked "not a fact" is accepted (AT-3); no error when the Visitor visa lacks IMM 5707 (AT-8). | Defect. Its fix #691 merged after 3b0d4d64: re-run below. |
| C3.10 | 18 messages the app can show still say "box", "boxes", "box map" or "canonical". | Wording defect. On F6's pack list tonight. |
| C3.15 | A meaning change sent without a reason is accepted (200, should be 400). Three more failures follow from P-266 (a rename of a field a released combination uses now waits for a second person, 202): the pack still expects a direct rename (P-96), and its duplicate-name check then meets the waiting rename instead. | One defect (reason required); three are the pack older than P-266. No fix PR found for C3.15. |
| C4.2 | A fact no question asks can still be marked (should be 422 "No question asks …"). | Defect. #688 merged the wording half; its title says the unasked-fact half waits for the tech lead's answer. |
| C4.7 | Exit 2 on its usual setup (no questions on the Visitor visa until C4.11); on its own fallback (`wp.family`): a setup step is refused by the later rule that only the client gives a background answer, so its refusal check cannot run; two checks wait for a saved paid run. | Pack older than the rule, plus US$0 cannot test the saved run. Not confirmed either way. |
| C11.3 | The AI "did you mean" says "the check is off", not "AI is switched off on this copy" (AT-5). | The held part (P-265, P-284); the row is scored "Works, held part excluded". Agrees with its score. |
| C11.11 | Checklist forms (IMM 5484) shown as filed lines; LMIA sample lists IMM 5488/5905 as filed lines; online-only form listed as no file (5 checks). | Defect, known since 1 Nov. Its fix #689 merged after 3b0d4d64: re-run below. |
| C11.17 | A name over 120 characters gets its message somewhere other than under its own field. | Defect (field-level message). |

C3.6 stopped with exit 2 ("setup missing: Visitor visa needs C4.11 first") and is green (18/18) on the fixture its own message names (`wp.family`); counted confirmed on that basis.

Partial rows (C3.4, C4.11, C9.1, C10.1, C11.7, C11.14): every pack is red, as their score says. C5.1 and C11.8 have no pack; their named checks are green in the full run, which shows the built part works, not that the row is complete.

The full run on 3b0d4d64 (`run-suites.sh`, every suite): exit 1. 263 suites PASS, 1 FAIL, 1 skipped by design (`check_studio_browser.cjs` resets the :4400 demo). The failure is `check_forms_c34_ai.ts` (C3.4, scored Partial): "fetch failed: other side closed" right after "C3.4 S fail: Saved never uses a recorded run of another edition". It is the same on 877acf66 and when run alone on a fresh copy (port 4474, exit 1, 37 checks passed first). The server stays up and logs nothing, so the request is dropped, not the process. Not settled whether CI on the Mac sees it; a forms row should look at the Saved masters replay request.

## Re-run after 3b0d4d64 (the tech lead's list)

Pending: C11.11 (#689), C3.8 (#691), C2.4 (#698), C6.12 (#686), C11.14 (#693, #699, #700) and F2's B1 release gate, each on a fresh copy of main once merged.


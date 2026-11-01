# qa after-merge 6 — main 25cefb67 (1 Nov 2026)

**Run:** `git log --first-parent 6b424941..25cefb67`. Product PRs: #242 (forms, Form library check waits), #252 (runtime QA-78 free part), #249 (forms C2.4 same file / newer edition), #254 (screens X2b slice (a), preview), #216 (screens QA-119, one next step), #257 (runtime QA-122), #259 (forms C3.12 field map in the Forms list), #261 (forms C11.15 download link), #247 (forms X1 Forms tab landings). Records only: #248, #263. **Not on main yet:** #113, #256 (so QA-120 and QA-121 are not retested).
**Copies (cloud, isolated, no STUDIO_*_LIVE, US$0):** qa_wk :4472 (Load sample), qa_rt :4473 (`setup_visitor_visa.ts`), one fresh copy per builder check (:4474–:4479). The shared demo :4400 in this cloud copy is freshly started and empty, so the read-only walk on accumulated data was not possible here.
**Not run on purpose (the brief):** full suite set, graph, c8, live AI.

## Verdict
**Ready.** Every merged product PR works on main as a person sees it and underneath; two findings closed (QA-119 Major, QA-122 Major), QA-78 narrowed, one new Minor (QA-131, API words only). 0 Blocker · 0 Critical · 0 Major · 1 Minor new.

## What works (evidence on 25cefb67)
| PR | Capability | Builder's check here | qa walk |
|---|---|---|---|
| #216 | C11.10 | — | `tests/qa/check_qa_am_1101c_walk.cjs` 16/16 then 15/15: header "Next step · …" equals the strip's ● Next on every combination in setup; wrong role by URL refused; 200 % zoom and 1024 px clean. **QA-119 closed.** |
| #257 | C7.6 | — | `tests/qa/check_qa_am_1101b_api.ts` 7/7: "tomorrow" in an optional date → IMM 5257 "needs a fix"; empty optional still does not block. **QA-122 closed.** |
| #252 | C11.15 | `check_qa78_words_browser.cjs` 4/4 | With an LMIA (Live, 8 forms): "8 forms on this combination · Added without an AI find"; no "No form find yet". QA-78 narrowed to "Online (later wave)" and file names. |
| #259 | C3.12 | `check_forms_c312_field_map.ts` 26/26 | Shared library › Forms: Field map column at 1440, line under the title at 1024 and 400, no sideways scroll, axe clean on list and drawer; drawer "Field map: Not mapped yet" with its reason. |
| #242, #259 | C11.11, C3.12 | `check_forms_s4_library_browser.cjs` 101/101 (fresh copy) | A second run on the same database fails 4/7 (it expects a fresh copy; not a product fault). |
| #249 | C2.4 | `check_forms_c24_same_and_new.ts` 15/15 (official IMM 5476 PDFs) | Row moved to Works; Upload PDF as a person: next round. |
| #254 | C1.5 | `check_x2b_bulk_preview.ts` 54/54 | `tests/qa/check_qa_am_1101e_walk.cjs` (new): With an LMIA's IMM 1295 to 4 other combinations → 4 "Will be added"; Content reviewer, Case officer, Client A → 403 "… does not hold the author duty"; empty list → "Choose at least one combination."; two at once the same; nothing written (activity unchanged, the target still has no IMM 1295). Non-JSON body → QA-131. |
| #261 | C11.15 | `check_forms_c1115_download_link.cjs` 12/12 (fixture canada-c1115) | — |
| #247 | C11.10 | `check_forms_focus_landings_browser.cjs` 26/26 | `?focus=forms:lines` focuses the table, clears the address, Tab goes on inside the table. `?focus=forms:held` with nothing held: focus on the body, `?focus=` kept, no message (QA-121, seen again). |

My new check: `tests/qa/check_qa_am_1101e_walk.cjs 4472` — 23/24 twice (the one red is QA-131, fails until fixed).

## Findings
* **New QA-131** (UX · Minor, screens): `POST /lines/bulk/preview` with a non-JSON body answers "Invalid input: expected object, received undefined". No screen sends it yet; slice (c)'s screen will.
* **Closed:** QA-119 (#216), QA-122 (#257); moved word for word to `history/qa-bugs-closed-2026-11-01.md`.
* **Narrowed:** QA-78 (the "No form find yet" part fixed).
* **Seen again:** QA-121 on the new `forms:held` landing; QA-129 (now the header too says "Confirm the checklist page" on a Live combination — the question stands).
* Not retested (no fix merged): QA-120, QA-121 (#256), QA-123–125, QA-126–128, QA-130.

## Progress (`tools/progress.sh`)
Before: M2 21 of 56 work (37%) · 18 partial · 16 not built. After: **M2 22 of 56 (39%) · 18 partial · 15 not built** (C2.4 Partial → Works, C1.5 Not built → Partial). R1 6 of 8 unchanged.

## Could not test
* The read-only walk on accumulated demo data (the cloud demo is empty).
* A person's Upload PDF walk for C2.4 (the builder's API check covers it); slice (b)–(d) of X2b (not built).

## Questions for the Lead
* QA-129 stands: should a Live combination's header and strip offer "Confirm the checklist page" as the next step?

## Suggestions
* *Later · Scaffolding:* builder browser checks that need a fresh copy (`check_forms_s4_library_browser.cjs`) could say so in their header line, so a rerun on the same copy is not mistaken for a flake.

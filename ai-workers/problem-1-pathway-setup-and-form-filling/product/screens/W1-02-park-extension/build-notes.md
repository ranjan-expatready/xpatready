# W1-02 Park the browser extension — build notes (forms lane)

Decisions: P-102 (extension parked, forms come in only as PDFs), P-107 (what IRCC accepts per form; Online stays
selectable and says it needs the browser extension, later wave), P-101 (wave 1). Lead note 2026-10-26 evening.
The parked code is on branch `lead/parked-extension-2026-10-26` (identical to `main` at b44f568, before this item).
US$0: no live AI, every AI path in the checks is a stub or a replayed saved answer.

## What left the app

| Where | Removed |
|---|---|
| `extension/`, `engine/extension/`, `engine/capture.ts`, `api/src/extension.ts`, `contracts/extension.ts`, `contracts/portal-reader-rules.json`, `tools/read_portal_capture.py`, `samples/portal-capture-template.csv`, `package.json` scripts `extension`, `extension:dev` | The extension, its build, pairing codes and sessions, portal reading, online fill and re-capture tasks |
| `api/src/main.ts`, `core.ts` | The extension controller and module, its CORS rule for `/api/extension`, the capture upload limits, the extension token reader |
| `api/src/forms.ts` (1,172 → ~360 lines) | Captures (saved pages, template, extension), approval/return/abandon/confirm of captures, the review document, online versions' screen maps (no-AI draft, accept, map an input, the guarded AI `screen_map` job and its second-draft reuse), the portal choice, "use the default" (portal-based), the online-forms list, what drafting reads (PDF first / online only) |
| `api/src/forms-demo.ts`, `check_forms_demo.ts` | DEMO rows 2 (APR capture) and 13 (filed Online on the APR Portal); rows 1 and 7 stay |
| `api/src/review-queue.ts`, `contracts/review-queue.ts` | "Portal capture" and "Screen map" items and kinds in To review |
| `api/src/screen02.ts`, `contracts/screen02.ts` | The screen-map read for board view 5 and the capture/screen-map view types |
| `api/src/programs.ts`, `contracts/programs.ts` | Portal, default channel and online forms in the combination summary; "+ Add" of a form the library holds only online |
| `api/src/sources.ts` | Online versions in the Forms library list (PDF editions only) |
| `api/src/ai.ts` | The screen-map exception in AI work retry |
| `engine/twin.ts` | Screen-map drafting (no AI and AI proposals) and online screen coverage; kept: label normalising and PDF section groups and labels |
| `engine/snapshot.ts`, `engine/validate.ts` | Online editions, portal, re-check and screen keys in a configuration's snapshot (configurations without online lines keep their fingerprint: checked) |
| `web/` | The Extension page and its menu entry, "Add an online form" panel, online-forms list, portal select, "File these Online", drafting-sources table, capture review page (view 6), screen-map page (view 5) |
| tests | `check_forms_apr`, `_f2a`, `_f2a_api`, `_f2b`, `_f2c`, `_f2c_fill`, `_f2d`, `_f3c`, `_f3c2`, `forms_f2_setup.ts`, fixtures `portal/`, `portal-apr/`, `portal-fill/`, `portal-server.mjs` |

## What stays (PDF, and the data idea of channels)
* The one intake, recognition, held files and second-person approval (P-80), new-edition impact, AI field mapping with
  the cross-combination second-draft guard (F3a-1c), field maps, option maps and list purposes, the validator, PDF fill.
* Channels per line (PDF upload · Online · Signed PDF upload), the derived filing method, signatures per channel. A new
  line is a PDF upload. **Online** is still selectable: the line shows "Needs the browser extension (later wave)" and the
  validator gives one **warning** (never an error that blocks release): "IMM 5257 is filed Online: it needs the browser
  extension (later wave), so the product does not fill it yet. File it as a PDF upload to fill its PDF." A line filed
  Online is still never filled as a PDF (unchanged), and it still needs its PDF form fields mapped (an online form is read
  from its PDF twin, P-102) — the "No form fields mapped yet" line now counts Online lines too.
* The intake still refuses a saved portal screen, now saying forms come in only as their official PDF.
* Reset still empties the dormant tables (portal captures, re-capture tasks, extension sessions and codes) so an older
  database is emptied too (P-108).

## Technical choices (small, here rather than silent)
1. **No schema change.** The tables and columns (`portal_capture`, `extension_*`, `recapture_task`,
   `combination.portal_key`, `form_edition.channel/portal_key/captured_on/recheck_by`, `form_field_map.screen_*`,
   `gov_form_def.draft_from`) stay, dormant and unread by the app. Why: the unpark in W6 restores the code without
   re-creating tables, and no migration races the runtime lane's. If the Lead prefers them dropped now, it is one
   migration (I can do it as a follow-up).
2. **Where "what IRCC accepts per form" lives** (P-107) is W1-06's design (library columns); this item keeps only the
   channel per line and the later-wave wording (`contracts/forms.ts ONLINE_LATER`).
3. `@types/chrome` stays in `devDependencies` (removing it rewrites the lockfile; nothing imports it now).
4. `check_screen01_smallfix` break K1: headless Chrome on the Mac opens a closed select's popup on ArrowDown instead of
   changing it (the old check only passed after the Portal select's popup had been opened), so an arrow press is now a
   key event on the select followed by the change it makes.
5. Two saved portal pages kept as `tests/fixtures/intake/` (Sample) for the intake refusal check.
6. Screens-lane checks that used a portal capture as their "second person" example (Screen 02 slices 1 and 2) now use
   the merge proposal; their screenshots were not committed from this lane (the test runs rewrote them; restored).

## Checks (isolated copies on forms ports, US$0)
Rewritten or trimmed for this item: `check_forms_channels` 53/53 (incl. parked routes answer 404, P-107 warning, PDF
option maps, answer lists, merges), `check_forms_demo` 25/25, `check_forms_f3a0` 7/7, `check_forms_slice2` 41/41,
`check_forms_slice2b` 36/36, `check_forms_f1p` 16/16, `check_ai_launch_paths` 39/39, `check_screen01_channels` 16/16,
`check_screen01_api` 135/135, `check_screen01_rules` 67/67, `check_screen02_slice2` 56/56, `check_screen01_browser`
129/129, `check_screen01_smallfix` all, `check_screen02_slice1` all, `check_screen02_slice2_browser` all.
PDF regression (unchanged suites): see the lane log line.

## Not done here (for the Lead)
* qa lane's own checks that drive parked routes or code: `tests/qa/check_qa_s2_probe.ts` (imports `screenMapProposals`,
  now parked), `check_qa_f1_probe.ts`, `check_qa_s01_channels.cjs`, `check_qa_explore_1025.cjs`; the qa lane drops or
  parks those parts. `tests/scout/` has none. `node product/tools/graph.mjs --check` exits 0.
* Capability rows C1.7, C2.10, C2.11, C3.9 still read as current in `qa/CAPABILITIES.md`; they are parked with the
  extension (W6) like C2.5/C2.7–C2.9.

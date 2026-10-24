# Lane: forms — PDF and online forms (P-61–P-63)

## From the Lead
2026-10-24 22:00 (Lead, cloud): slice 2 checked and **merged** (`screens/F1-forms-channels/lead-check.md`). Lead decision B3: paid parts stay one at a time. Set stage BUILD, owner Builder, **slice 2b**: (1) **F5** from the evidence lane — on static forms (IMM 5409, 5476) the writer also sets the page fields' values with appearances, so the as-written file shows its values outside Adobe (today 58 page fields, 0 values on IMM 5409; verify with a page-field read-back and ask the evidence lane for one Adobe re-check); (2) **F6** — the oath block of IMM 5409 (place, administrator, title, date) is a person step like signatures (F2): never filled, listed for the person; (3) **QA-15** (any case for form codes at capture start); (4) **D3** a second live screen-map start after a completed one pays again for the same inputs: reuse its proposals at US$0 or refuse until they are decided, with a test (`screens/F1-forms-channels/lead-check.md`). Then CHECK (reviewer + breaker) → owner Lead. F2 (working extension) after 2b. The US$12 paid drafts wait for the founder. Sync main first (Screen 01 small FIX, runtime R1a and the suite-runner fix are in). Stop isolated copies at the end of the stage.

Command: `/next forms` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_item: F1-forms-channels
stage: CHECK
owner: Lead
next_action: Lead check of slice 2 on the merged commit (main and Screen 01 merged in; conflicts in fill.ts, forms.ts, sources.ts, check_forms_channels.ts resolved: this lane's code with main's P-63 words and both import lists): build-notes "Slice 2" and "Slice 2 fixes", review-slice2.md, break-report-slice2.md; rerun the suites (slice 2 server with STUDIO_PART_PAUSE_MS=3000). Decide: parallel paid parts need a ledger change; founder go for the IMM 0008/5669/5406 paid drafts. Next FIX pass: QA-15, QA-18.
blocked_by: none
updated: 2026-10-23

## Log (last 10 lines)
- 2026-10-24 · F1 · CHECK (slice 2) · applied Lead note 2026-10-24: merged main (Screen 01, 1cb174a6), resolved 4 conflicts; all suites green on lane ports: guard 75, launch 53, slice 2 52, F1 106, engine 38, rules 65, drafting 48, API 130, channels 42, release race pass, grounding 29, orchestration 22; explicit any back to 437; lane copies stopped. US$0. Owner → Lead.
- 2026-10-23 · F1 · FIX → CHECK (slice 2) · every review Must/Major and break Blocker/Major fixed with a test, most minors too; all suites green: guard 75, launch 53, slice 2 52, F1 106, engine 38, rules 54, drafting 48, API 94, grounding 29, orchestration 22 (lane copy). US$0. Owner → Lead.
- 2026-10-23 · F1 · FIX (slice 2) · slice 2 suite 52/52 (evidence committed); final full run in progress.
- 2026-10-23 · F1 · FIX (slice 2) · cancel stops the parts not yet started and the step ends CANCELLED (it stayed RUNNING); launch 53/53; slice 2 rerunning.
- 2026-10-23 · F1 · FIX (slice 2) · full run: guard 75, engine 38, rules 54, drafting 48, F1 106, API 94, grounding 29, orchestration 22; launch and slice 2 test fixes (ledger lock is not a ticket clash; a test-only pause between parts for the cancel check).
- 2026-10-23 · F1 · CHECK → FIX (slice 2) · reviewer: ship after fixes, journey 6/10, 1 Must + 5 Major; breaker: 3 Blocker + 4 Major + 13 Minor; fixes written with tests (guard 75/75); suites running. US$0.
- 2026-10-23 · F1 · CHECK (slice 2) · F1 suite rerun 106/106 after the test-client fix; waiting on reviewer and breaker.
- 2026-10-23 · F1 · BUILD → CHECK (slice 2) · suites: guard 64/64, launch 53/53, slice 2 38/38, engine 38, rules 54, drafting 48, API 94, grounding 29, orchestration 22/22 (QA-8 fixed); F1 rerun after a test-client keep-alive fix; reviewer and breaker launched. US$0.
- 2026-10-23 · F1 · BUILD (slice 2) · built QA-8 (--preserve-symlinks), per-run launch tickets (two launches at once collided), guarded parts and screen inventories, A4 reuse-first parts with progress and merge flags, screen_map job, evidence F1–F4 in the filler, runtime-lane option-map defect; guard 64/64, launch 53/53, slice 2 34/35 before the ticket fix; full run in progress. US$0.
- 2026-10-23 · F1 · CHECK → BUILD (slice 2) · applied Lead note 2026-10-23 17:05 (slice 1 merged d795b019).

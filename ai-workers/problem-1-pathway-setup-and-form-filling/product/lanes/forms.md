# Lane: forms — PDF and online forms (P-61–P-63)

## From the Lead
2026-10-24 22:00 (Lead, cloud): slice 2 checked and **merged** (`screens/F1-forms-channels/lead-check.md`). Lead decision B3: paid parts stay one at a time. Set stage BUILD, owner Builder, **slice 2b**: (1) **F5** from the evidence lane — on static forms (IMM 5409, 5476) the writer also sets the page fields' values with appearances, so the as-written file shows its values outside Adobe (today 58 page fields, 0 values on IMM 5409; verify with a page-field read-back and ask the evidence lane for one Adobe re-check); (2) **F6** — the oath block of IMM 5409 (place, administrator, title, date) is a person step like signatures (F2): never filled, listed for the person; (3) **QA-15** (any case for form codes at capture start); (4) **D3** a second live screen-map start after a completed one pays again for the same inputs: reuse its proposals at US$0 or refuse until they are decided, with a test (`screens/F1-forms-channels/lead-check.md`). Then CHECK (reviewer + breaker) → owner Lead. F2 (working extension) after 2b. The US$12 paid drafts wait for the founder. Sync main first (Screen 01 small FIX, runtime R1a and the suite-runner fix are in). Stop isolated copies at the end of the stage.

Command: `/next forms` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_item: F1-forms-channels
stage: CHECK
owner: Lead
next_action: Lead check of slice 2b after its FIX and the Lead note on QA-34/QA-30: build-notes "Slice 2b" and "Slice 2b fixes" (last two bullets), review-slice2b.md, break-report-slice2b.md; rerun run-suites.sh (new suite check_ai_launch_paths.ts starts its copy with STUDIO_FAKE_LAUNCHER). Ask the evidence lane for one Adobe re-check of an F5 file. Then F2; the US$12 paid drafts wait for the founder.
blocked_by: none
updated: 2026-10-24

## Log (last 10 lines)
- 2026-10-24 · F1 · CHECK (slice 2b) · applied Lead note 19:10 (QA-34, QA-30): fake-launcher suite check_ai_launch_paths 29/29 (every live-draft refusal at US$0; parts provider limit now BLOCKED), capture and fill refusals in slice 2b 57/57; api coverage 95.73/79.09 (floor 95/79), engine 99.12/87.24; QA-30 a plain 400; all suites green. US$0. Owner → Lead.
- 2026-10-24 · F1 · CHECK → FIX → CHECK (slice 2b) · breaker: 0 Blocker, 2 Major, 7 Minor; every Major and most Minors fixed with a test (page fields set only when drawn exactly, read back from the drawing; sign step on static forms; D3 under-lock race; static read from the file); slice 2b 44/44, all suites green, qa probe 26/0, any 437. US$0. Owner → Lead.
- 2026-10-24 · F1 · CHECK (slice 2b) · reviewer: ship after fixes, journey 7.5/10, 0 Must, 2 Major (page fields drawn with ? or cut off still reported shown; no sign step on static forms), 5 Minor; breaker running. US$0.
- 2026-10-24 · F1 · BUILD → CHECK (slice 2b) · all suites green on lane ports: slice 2b 28/28, forms channels 106/106 (capture check updated for QA-15), slice 2 52/52, guard 75, launch 53, engine 38, drafting 48, orchestration 22, grounding 29, Screen 01 API 135, channels 42, rules 67, browser 136, race pass, runtime 85, case engine 20; qa F1 probe 26/0 (QA-15 fixed); explicit any 437. US$0. Reviewer and breaker launched.
- 2026-10-24 · F1 · BUILD (slice 2b) · F5, F6, QA-15, D3 built (521945f); slice 2b 28/28; full suite run in progress (drafting 48, orchestration 22, engine 38, slice 2 52/52; forms channels check updated for QA-15). US$0.
- 2026-10-24 · F1 · CHECK → BUILD (slice 2b) · applied Lead note 2026-10-24 22:00 (slice 2 merged; cloud clone merged main cd97cb6, cloud-setup.sh run).
- 2026-10-24 · F1 · CHECK (slice 2) · applied Lead note 2026-10-24: merged main (Screen 01, 1cb174a6), resolved 4 conflicts; all suites green on lane ports: guard 75, launch 53, slice 2 52, F1 106, engine 38, rules 65, drafting 48, API 130, channels 42, release race pass, grounding 29, orchestration 22; explicit any back to 437; lane copies stopped. US$0. Owner → Lead.
- 2026-10-23 · F1 · FIX → CHECK (slice 2) · every review Must/Major and break Blocker/Major fixed with a test, most minors too; all suites green: guard 75, launch 53, slice 2 52, F1 106, engine 38, rules 54, drafting 48, API 94, grounding 29, orchestration 22 (lane copy). US$0. Owner → Lead.
- 2026-10-23 · F1 · FIX (slice 2) · slice 2 suite 52/52 (evidence committed); final full run in progress.
- 2026-10-23 · F1 · FIX (slice 2) · cancel stops the parts not yet started and the step ends CANCELLED (it stayed RUNNING); launch 53/53; slice 2 rerunning.

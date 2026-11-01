# S7 Reset + Load sample — runtime lane plan (29 Oct)

Item: M2 queue (5), WAVE-1 S7. Agreed design: `design/walkthrough-s3-s7.html` §S7 v2 (founder OK 27 Oct, P-123).
Decisions it follows: P-108 (Reset empties everything; the sample is a starting point; masters arrive as AI proposals),
P-109 and P-112 (names; the Provincial nominee combination is IRCC's PR application from the paper forms), P-148 (only
the agreed six), P-121/P-120 (no demo shortcut past the rules), P-138 (library drafts start on a click), P-158 (one door,
contract v2.1). Capabilities: C10.1 (Reset), C11.7 (Load sample).

## What is there today (main a9fe60c0)
* `api/src/demo.ts` Reset deletes the workspace's rows and keeps the evidence (fingerprinted). Two workspace tables are
  missed: `official_download` and `form_line_action` keep the old workspace's rows (orphans).
* Load sample reads `samples/programs.json`: 5 Pathways, 13 programs, 7 set-up combinations (Super visa among them, names
  older than P-112) and 23 "Not started" rows. The work permit imports the reviewed release c1-v3 straight into the
  library (a shortcut P-108 removes). 60 test files call `/demo/load`; 36 rely on that work-permit release.

## Plan
| Step | What | Where | Test |
|---|---|---|---|
| 1 | Reset empties every table that has a workspace id (adds `official_download`, `form_line_action`; `proposal_item` once the one door is on main). Built-in person roles stay (P-108, 27 Oct). | `api/src/demo.ts` | pass: after Reset, no table holds a row of the old workspace (read from the database's own column list, so a new table cannot be missed); fail: a row planted in a new table is reported |
| 2 | `samples/wave1.json`: the six combinations with P-112 names (Retail: Temporary residence › Visitors › Visitor visa; › Study permits › Study permit › Outside Canada; › Work permits › Employer-specific work permit › With an LMIA – inside Canada; Permanent residence › Provincial nominees › Express Entry stream; › Family sponsorship › Spouse or common-law partner. Corporate: Temporary residence › Labour market impact assessment › High-wage position), each with its people and IRCC's files from the coverage table (forms, checklists, guides). Every value Sample. | `samples/wave1.json` | pass: exactly six combinations, names equal P-112's; fail: a seventh row or a Super visa is refused by the check |
| 3 | Load sample: structure through the Structure services, files through the normal intake into the Form library, the Form finder replayed per combination (forms picked, waiting for Confirm, US$0). A missing file shows "Not found · Upload PDF". No release import, no direct library rows. | `api/src/demo.ts` | API journey: Reset → Load → six combinations, 0 library fields, forms waiting for Confirm, every file present or shown missing |
| 4 | Library drafts: for each form with a saved AI run on exactly that file, the run is replayed through the one door (`insertProposals`, contract v2.1) as waiting proposals. A form without one shows its "Draft with AI" (paid, on a click, P-138); listed in the load log. | `api/src/demo.ts` calling the replay in `api/src/sources.ts` | pass: proposals waiting in the queue, origin ai, from "replay"; fail: no library row is written by Load |
| 5 | The two Demo menu dialogs with the design's words (what Reset empties and keeps; what Load brings). | demo menu (web) | browser: both dialogs, the counts after each |
| 6 | Suites: the old sample stays as a test-only fixture (`POST /demo/load {"fixture":"suites"}`), never in the menu, so other lanes' 60 suites keep running until each lane moves to the six. | `api/src/demo.ts`, `samples/programs.json` kept | the suites that load the sample pass unchanged |

Order: 1 now (independent). Step 4 needs the one door (`api/src/proposals.ts`), which is on Lead branch
`lead/2026-10-29-s2a` and not yet on main: the builder syncs that branch, or builds 4 once it merges.

## Product questions (for the hand-back; the build does not wait on them)
* After Load sample nothing is released, so no case can be opened until someone accepts the proposals, a second person
  approves and the combination is released. Visitor visa is the end-to-end case (P-67, P-148): is that the demo's path, or
  should Load sample also be able to start the Visitor visa from a reviewed release?
* Saved AI runs exist for IMM 5257, 5257 SCH1, 1295, 5707, 5409, 5475, 5476, 1344 only. IMM 1294, 5710, 0008, 5669,
  5406, 5532 and others would need paid drafts (about US$1–5 each). Built as P-138: they wait for a click.

## Built (29 Oct, fresh runtime session; branch claude/runtime-s7-6d5965)
* Synced Lead branch `lead/2026-10-29-s2a` for the one door (step 4); its three conflicts were unions (imports, module lists, KIND_NOUN).
* Step 2: `samples/wave1.json`, the six with P-112's names, pages and files. Step 3–4: `Demo.loadSix` (api/src/demo.ts):
  names through the Structure services; files through `intake.sample` (forms read on this computer); the form finder in
  replay mode on each combination's recorded canada.ca page (`FixtureCanada`, US$0); the field-map batch in REPLAY mode
  (`Ai.plan`/`Ai.launch`, the same path as "Use saved answers"), which lands through `insertProposals`. No release import,
  no direct library row, no live call. Step 5: the two dialogs in `web/src/App.tsx` with the design's words. Step 6: no
  sample named = the suites' fixture (the older sample), so the 60 suites run unchanged; the menu sends `{"sample":"six"}`.
* Tests: `check_s7_load.ts` 16/16, `check_s7_dialogs_browser.cjs` 12/12, `check_s7_reset.ts` 4/4.
  `check_studio_browser.cjs` loads the fixture through the API (the menu now loads the six) and presses "Reset everything".
* Found while building (for the Lead):
  * The intake holds IMM 5669 and IMM 0008 DEP for a person: it cannot read their edition dates (forms lane's intake).
    Load shows both as "Not found · Upload PDF" with the intake's words.
  * The form finder has saved answers only for the Visitor visa. On the other four it reads the pages and stops with
    "AI did not finish" (no live call, R-143). Their forms are attached as sources; finding them needs a paid run or a
    person.
  * Combination participants take no Sponsor role (contracts/programs.ts allows principal, spouse_or_partner, child,
    representative, parent), and Parent "never joins a case". So the spouse sponsorship has no Sponsor and the study
    permit no Parent. P-171 (4), the two filings of a sponsorship, is where this is settled.
  * "Not found" on the Forms tab comes only from a finder run. The LMIA's EMP5626 is shown in the Load result and the
    log, not as a Forms tab row.
  * `tests/qa/check_qa_m2_journeys.cjs` (qa lane) clicks "Load sample inputs" and "Reset demo": the qa lane updates it.

## Technical choices
* The suites' fixture (step 6) keeps today's sample as test data only; the six are what a person loads.
* The sample family (Client A) stays: it is preview test data, not configuration.

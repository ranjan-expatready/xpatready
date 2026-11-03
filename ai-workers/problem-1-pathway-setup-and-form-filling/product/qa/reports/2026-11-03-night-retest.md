# qa night re-test — C9.1, C11.8, C11.14, C4.11, C3.2 (then C11.7, C3.4) on main 83f846a52 (3 Nov)

**Brief:** founder at 22:05 IST, through Lead 5: re-test the M2 AI capabilities merged tonight but never re-scored, on the newest `origin/main`: C9.1 (#732), C11.8 (#746), C11.14 (#728), C4.11 (#744), C3.2 (#699, #740; QA-193). Then C11.7 (#762) and C3.4 (#771), each once it merges. The tester built none of these.

**How (P-290, P-291):**
* main at 83f846a52 (tree 42f1841e).
* Each check ran on its own freshly started isolated copy (`studio/tools/isolated.sh … start`), twice. The web was rebuilt from main by the start script (QA-181).
* Live AI was off on every copy: no `STUDIO_*_LIVE` was set. US$0. No priced "with AI" button was clicked.
* Judged by exit codes.
* Person walks ran on own copies (:4479, :4475), headed through the browser pane and Playwright at 1440 px. The shared demo (:4400) was not touched.
* Checks that turn the live switch on themselves (on a stand-in launcher) were **not** run by qa, per the brief. Instead, their results are read from CI's merge-queue run 41665283716, whose tree equals main's (42f1841e): 0 FAIL in all four parts.
* All scoring judgments are Opus (P-303).

## Verdicts

| Row | Verdict | Why |
|---|---|---|
| C3.2 Reviewer accepts, edits or rejects; bulk only for clean reuse; Undo | **Works** (was Partial) | P-296 (1) holds on both doors (probe and walk below). QA-193 is closed. Only Minors are open (QA-190, QA-136) |
| C11.14 Draft + checker round + rules; High only when all agree; bulk for High | **Partial** | QA-176 (Major) is open: no checker round is recorded for any field map, so AT-2 to AT-4 are red. QA-191, QA-193 and QA-159 are closed tonight |
| C11.8 AI runs show steps, cost, Stop; Live off by default; Saved replays (P-227) | **Partial** | On main, IMM 5645's saved four-part result (#746) is not offered as Saved: "No saved AI answer for this form yet". #762 fixes it, and it is in the queue. QA-154 is closed |
| C9.1 New edition: comparison and AI impact | **Partial** | The comparison, impact tabs, accepted-until date and greyed AI offer work. There is no saved AI run of the comparison (PR 2, paid), so no AI impact is shown at US$0. Pack part 2 needs the configured checkpoint (#732 Q1) |
| C4.11 Draft questions and documents (7 steps) | **Partial** | QA-162 (Major, narrowed: 6 of 20 conditions land, was 2) and QA-144 (Major) are open |
| C11.7 | *pending* | #762 not merged at the time of writing (see the bottom of this report) |
| C3.4 | *pending* | #771 not merged at the time of writing |

**M2: 43/60 Works** (was 42/60 on 83f846a52; +C3.2).

## Runs (exit code · tests passed)

| Check | Round 1 | Round 2 |
|---|---|---|
| `acceptance/C3.2.test.ts` | 0 · 22/22 | 0 · 22/22 |
| `tests/check_s6_p149.ts` | 0 · 89/89 | 0 · 89/89 |
| `tests/check_gcore_b5_field_map_bulk.ts` (alone) | 0 · 22/22 | 0 · 22/22 |
| `tests/check_forms_qa193_batch_mark.ts` | 0 · 18/18 | 0 · 18/18 |
| `acceptance/C11.14.test.ts` (alone) | 1 · 11/14 | 1 · 11/14 |
| `tests/check_gcore_b4_field_map_check.ts` | 0 · 32/32 | 0 · 32/32 |
| `tests/check_gcore_engine.ts` (no server) | 0 · 137/137 | 0 · 137/137 |
| `tests/check_forms_c118_words.ts` (no server) | 0 · 7/7 | 0 · 7/7 |
| `tests/check_c91_impact_ai.ts` (no server) | 0 · 24/24 | 0 · 24/24 |
| `tests/check_c91_impact_browser.cjs` | 0 · all passed | 0 · all passed |
| `acceptance/C9.1.test.ts` | 1 · 7/16 | 1 · 7/16 |
| `tests/runtime/setup_visitor_visa.ts` + `acceptance/C4.11.test.ts` | 0, then 1 · 15/23 | 0, then 1 · 15/23 |
| `tests/check_forms_qa162_saved_matching.ts` | 0 · 26/26 | 0 · 26/26 |

**From CI on main's tree** (not run by qa; each restarts its copy with the live switch on a stand-in launcher):

| Check | Result |
|---|---|
| `check_c91_impact_api.ts` | 33/33 |
| `check_forms_c118_acceptance.ts` | 22/22 |
| `check_cost_override.ts` | 72/72 |
| `check_forms_c411_contract.ts` | 35/35 |
| `check_forms_c411_draft_qd.ts` | 77/77 |
| `check_forms_c411_draft_qd_browser.cjs` | 50/50 |
| `check_forms_c34_ai_live.ts` | 8/8 |

**Disclosures:**
1. My first runner pass refused copy names containing a dot (C9.1, C4.11, C3.2, C11.14): START_FAIL, the tester's error. The checks were re-run, and the rounds above are those re-runs.
2. The no-server C9.1 check first failed before any Prisma client was generated (setup), then passed twice.
3. Run in parallel with other checks, C11.14 read 13/14 and b5 hit ECONNRESET twice. Run alone, C11.14 was 11/14 twice and b5 22/22 twice. The 13/14 was a leak from another check's planted checker run: QA-202.

## Probes and walks

**C3.2 / C11.14: the bulk door** (author, own copy after Load sample).
* `POST /api/review/proposals/decide` with two Ready AI new fields of IMM 5257 answered **409**: "Only Ready items are accepted together. 2 items cannot be: "person.education_city" (A new shared field is decided on its own …). Nothing was accepted."
* The queue's `bulk_why` on each Ready new field says the same. On the IMM 5257 AI field-map page, "Accept High exact reuse (0)" is disabled with "No exact reuse match is waiting.", and no bulk button exists for new definitions (`c32-fieldmap-imm5257.jpg`).
* The "Ready" items on that copy came from QA-202's leak. The refusal is still the rule under test.

**QA-159** (fresh Load sample, `proposal_item`).
* `person.citizenship_country` is Decide with near `person.citizenship`.
* `person.email_address` is Decide with near `person.email`.
* `person.given_name` is Decide with near `person.given_names`.
* None of these is Ready.

**C11.8** (Visitor visa › Forms, IMM 5645 "Read: ready for AI drafting" › Draft with AI).
* The dialog offers Live, pre-selected, and Saved, greyed: "No saved AI answer for this form yet".
* Start Live is enabled although live AI is off on this copy, and the dialog has no off notice (QA-138, open). It was not clicked. Cancel.
* `c118-imm5645-dialog-main.jpg`.

**C9.1** (`c91-impact-1440.png`).
* Path: Demo › Reset demo, then Forms › Upload PDF `official-sources/ircc/previous-editions/imm5476e-2021.pdf` (rules only, US$0), then Load sample.
* To review lists "New edition · IMM 5476 (11-2025) … it touches Visitor visa · Review impact".
* The review page shows:
  * IMM 5476 (11-2021) → (11-2025);
  * "Previous edition accepted until 2026-03-12", with IRCC's sentence and "form page, saved 2026-10-19";
  * "Draft with AI (about US$0.43 · at most US$2.00)", disabled, with "live AI is off … Nothing was sent and nothing was charged. Use a saved AI run (US$0), or a person maps each new and reworded box";
  * 30 · 7 · 16 · 6;
  * the tabs Comparison, Impact on library (0), Components touched (0), Combinations (1).
* Raw paths are shown as box names: QA-203.

**C4.11** (Visitor visa from `setup_visitor_visa.ts`; `c411-dialog-1440.png`, `c411-run-view-1440.png`).
* Questionnaires › Draft questions and documents: Live (not open), "each paid run is approved first", and Saved, with its 7 steps and "Cost: US$0".
* Draft with Saved (US$0) gave "7 steps · 7 done · US$0.00 / US$0.00" on AI work.
* Step 5: "0 conditions for To review …; 6 already waiting there; 14 left out with the reason". This second run did not double the waiting items.
* All four rules pass.

## Bugs

* **Closed** (moved to `qa/BUGS-CLOSED.md`): QA-193 (#740), QA-191 (#728), QA-159, QA-154 (#716).
* **Narrowed:** QA-162 (6 of 20 conditions land on Visitor visa; still Major).
* **New:**
  * QA-202 (Bug · Minor, test isolation: planted checker runs in the shared `p2/runs` leak into other copies);
  * QA-203 (UX · Minor, C9.1 raw form-field paths).
* Count: 0 Blocker · 0 Critical · 0 Major · 2 Minor new.

## Not tested

* Coverage (c8): not run this round.
* 400 px, 200% zoom and keyboard on these screens, beyond the browser checks (the C9.1 check covers axe at 1440/1024 and no sideways scroll at 1024/400).
* QA-176's checker rounds need paid runs. Not attempted (US$0).

## Question for the tech lead

1. #740's reviewer note: field-map **reuse** matches accepted in bulk land as field-map rows, not library changes, so the approver and the release see no bulk mark on them. Does P-121's "the second person sees what was bulk-accepted" cover mappings? qa closed QA-193 on the library-change part only.
2. QA-202: should checks plant runs only in their copy's `STUDIO_VAR`? Until then, qa runs field-map checks one at a time.
3. C4.11: #744 says 8 of 22 conditions land, but qa sees 6 of 20 on the pack's Visitor visa setup. Likely another setup (the six with IMM 5257's map applied). Which setup is the one to judge by?

## Suggestions

* *Needed for the proof · Capability:* the C9.1 paid run (PR 2) and the C11.14 checker rounds, on the tech lead's Go. Without them, both rows cannot reach Works at US$0.
* *Later · Scaffolding:* the C4.11 pack still reads the older contract (`usd` object; the step names `checklist_draft` and `qd_conditions`). Updating it would make 15/23 tell the truth.

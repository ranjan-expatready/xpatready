# qa after-merge (round 4) — 1 Nov 2026, main 63168762

**Scope:** `git log --first-parent 751cbc42..origin/main`: #210 (X1 C3, the Overview's setup strip, screens), #230 (a section add or removal that changes nothing writes no history line, runtime), #233 and #163 (records). Not merged at the time of writing: #216 (queued; QA-119's fix), #241 (C2.12 slice 3), #243 (focus ring), #246 (previous qa records, approved). So QA-119 is retested **before** its fix. QA-120 to QA-125 have no fix on main yet.
**How:** isolated copies qa_wk :4472 (Load sample), qa_rt :4473 and qa_r1d :4476 (`setup_visitor_visa.ts` 13/13), qa_c48 :4474, qa_x1 :4475; no STUDIO_*_LIVE; US$0. Built on #246's branch so its checks (`check_qa_am_1101b_*`) are here. `lane.sh setup` switched to the old lane branch `claude/qa-l10-e3c849` again; I went back to the session's branch (as #246 said). The shared demo :4400 holds no accumulated data in a cloud copy: not counted.

## Verdict
**Ready for what merged.** #210 and #230 do what they say, through their own checks and a person's walk. Exploring the evidence area found three Minor findings on the validated-copy read back (QA-126 to QA-128). There is also one question on Live combinations (QA-129). No Blocker, Critical or Major is new. QA-122 (Major) is still open: its fix is routed after #113.

## Suites and checks (underneath)
| Check | Result |
|---|---|
| `tests/check_x1_overview_strip_browser.cjs` (#210) | 28/28 |
| `tests/check_c48_sqr_release.ts` (#230) | 25/25 |
| `tests/runtime/check_runtime_r1d.ts` (C-9, evidence explore) | 80/80 |
| `tests/qa/check_qa_am_1101b_api.ts` (QA-122) | 6/7: QA-122 still red, not fixed |
| `tests/qa/check_qa_am_1101b_walk.cjs` (QA-76, QA-123–125) | 35/41: the same 6 red lines as round 3 (none fixed yet) |
| `tests/qa/check_qa_am_1101c_walk.cjs` (new: #210 by a person) | 15/16: the red line is QA-119 |
| `tests/qa/check_qa_am_1101c_validated.ts` (new: C-9 explore) | 5/9: the red lines are QA-126 (2), QA-127, QA-128 |
| `tests/qa/check_qa_am_1101c_runtime_walk.cjs` (new: runtime walk) | 16/19: the red lines are QA-76 ("forms slice 2") and the focus ring (2, retest after #243) |

* Full suite set, graph and c8 not run (brief; partial c8 allowed until the weekly nightly). #210 adds one component and changes no route; #230 changes one service method.
* `decision-impact.sh`: no product decision without a row (P-210 to P-214 are workflow, exempt).

## What works (like a person, then underneath)
* **#210, the Overview's setup strip, as the configuration author.**
  * At 200 % zoom (720 × 450) and at 1024 px: no sideways scroll, and Tab reaches the first open link with a visible ring. Axe is clean.
  * Following a strip link, then Back, shows the same strip; a reload does too.
  * The immigration expert sees the strip with its legend.
  * The case officer and the client, opening the address directly, get "This page is for the configuration people" in words, with no strip.
* **#230.** Adding a section already chosen, or removing one not chosen or not existing, answers 200 and writes no history line. Not covered: two removals at once can both read "had" and write two lines (no lock). It changes nothing, so I logged no row.
* **C-9 validated copy read back (P-144), explored through the API.**
  * One value changed after Validate is refused (422) and nothing is recorded.
  * The configuration author gets 403 in words.
  * A good validated copy reads back 47/47 equal and the copy says "Validated copy read back". The builder's r1d covers no file, wrong file, blank form, the unchanged copy, the client, on-disk tampering and out of date after a fact changes.
* **Runtime walk.**
  * A With an LMIA case with a representative, as the case officer: the representative is named "Representative R", and no sentence starts with lower-case "representative" (QA-76's word is fixed). Axe is clean.
  * The client's questionnaire by keyboard only, at 200 % zoom and at 1024 px:
    * Enter on Start; Space answers a choice; Enter on Save and continue; typing into a text answer.
    * "Save and come back later" stores the typed answer exactly; the case officer's view reads it back.
    * The focused answer is in view, nothing scrolls sideways, and axe is clean.

## Retests
| Finding | Result on 63168762 |
|---|---|
| QA-119 (Major) | **Still open.** The header and the strip disagree on all 5 sample combinations in setup, e.g. Visitor visa: header "Add 1 form from the library", strip "● Confirm the checklist page". #216 is queued; retest when it merges (the line in `check_qa_am_1101c_walk.cjs`). |
| QA-120, QA-121 | No fix merged (screens list after X2b slice a). |
| QA-122 (Major) | Still open (6/7); routed after #113. |
| QA-123, QA-124, QA-125 | Still open (same lines red). |
| QA-76 | "representative" is now fine. Still open: "No answer list yet (forms slice 2)" on each person tab. |

## New findings (detail in `bugs-open-detail.md`)
* **QA-126 · UX · Minor (runtime):** a validated copy over 20 MB is told "larger than 25 MB… up to 25 MB each". Two files are told "Add at most 20 files at a time". The global upload filter (`api/src/main.ts:161`) uses the intake limits for every upload.
* **QA-127 · UX · Minor (runtime):** "Not read back: 1 of the 47 values … differ" never says which value.
* **QA-128 · Bug · Minor (runtime):** a double send records two validated copies and two audit lines.
* **QA-129 · Ambiguity · Minor (screens):** With an LMIA is Live, yet its strip marks "● Next: Confirm the checklist page" and Forms shows a badge 2, while the header says "Nothing to do". Should a Live combination show steps 1 and 2 as open work?
* **Focus ring (not a new row):** on the client's questionnaire, no Tab stop shows focus (links, the person picker, Start, the section rows, inputs). This is what open #243 fixes (WCAG 2.4.7); retest with the two lines in `check_qa_am_1101c_runtime_walk.cjs`.

## Could not test
* The C2.12 screens: #241 is not merged.
* The fill trial (P-65) as a person: there is no screen for it. r1d's "review M1" line (a form whose trial passed is fileable; no trial record is not) is green.
* The shared demo with real data (cloud copy). Live AI (never).

## Questions for the Lead
1. QA-129: on a Live combination, are unconfirmed steps 1 and 2 open work (header and badge say so), or "done, not confirmed" without a Next mark? #216 will make the header say "Confirm the checklist page" on With an LMIA.
2. QA-128: should a second send of the same validated file answer with the first record (idempotent), or 409?

## Suggestions
* *Needed for the proof · Capability:* a validated-copy refusal that lists the differing fields in the form's words (QA-127). `read_validated.py` already returns `mismatches`.
* *Later · Scaffolding:* per-route upload limits in the global filter's words (QA-126), so every upload says its own limit.

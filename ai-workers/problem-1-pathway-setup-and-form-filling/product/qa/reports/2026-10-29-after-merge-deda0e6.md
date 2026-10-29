# qa after-merge on main deda0e6b (29 Oct 2026)

Run by a fresh qa session on branch `claude/qa-after-merge-deda0e6`. The branch was cut from `claude/qa-coverage-1029` and synced with main.
* Copies: qa_am :4471 for the retest checks; qa_s3b, qa_s2r and qa_w115 for the suite reruns; qa_live :4478 for the live plans.
* :4400 was only read.
* Spend: US$0; no live call was sent (§4).

## Verdict
**Ready.** The merged fixes hold:
* PR #91 (screens wording batch, Stand-in chip);
* PR #90 (forms runner: AI paths, budgets, usage limit, request id).

14 open bugs close and 3 narrow. One new Minor finding (QA-96, a flaky runtime suite). No suite fails on deda0e6b when run alone, except that flaky one.

**The live smoke was not run:** the product reserves a larger worst case than the approved US$3.24 (§4).

## 1. Suites on the exact commit
* **Why I ran them myself:** CI for PR #90 ran on its merge with 54f25ae4, i.e. without PR #91 (log of run 40889503148: "Merge 638d1573 into 54f25ae4"). No CI run covered deda0e6b itself, so I ran `run-suites.sh` here (no `--demo`).
* **Result:** 68 PASS, 3 FAIL at load 9–20 (other lanes busy on this Mac). Each failing suite rerun alone:

| Suite | In the run | Alone |
|---|---|---|
| `check_w1_programs_s2.cjs` | Status change over 200 ms (known load step) | **87/87** |
| `check_w1_start_setup_browser.cjs` | sample load timed out at 30 s | **39/39**, the three "S3 fix 4" cost-words steps pass (the Lead's question on PR #94) |
| `check_w115_slice2_browser.cjs` | "Undo pass: the row goes back to the passport" | 1 pass in 3 runs → **QA-96** (Minor, runtime) |

## 2. Retest of the merged fixes
qa checks, each on a freshly loaded copy:
* `check_qa_ai_paths.ts` **21/21** (was 10/21);
* `check_qa_am_r3_1028.cjs` **69/69**;
* `check_qa_am_s3_1029.cjs` **39/39**;
* `check_qa_am_s4_1028.cjs` 62/62;
* `check_qa_am_s5_1029.cjs` 51/51;
* `check_qa_am_r69_1028.cjs` **33/33**, after one step moved: the person menu now shows the name only (QA-80), so it selects "Approver";
* `check_qa_dv_1029.cjs` 24/25 (copies per line not built, as before);
* `check_qa_qn_1029.cjs` 31/40 (QA-92–95 open; runtime's fix is not on main);
* wording sweep: 38 pages × 2 widths, texts in `2026-10-29-after-merge-deda0e6/wording/`.

**Closed (moved to `BUGS-CLOSED.md`):**
* QA-39: Fields lead with words; no "Canonical fields", no `yes_no`; nothing cut at 1024 px.
* QA-48: "1 retired, not shown (Status: Retired)".
* QA-70: menu focus ring.
* QA-71: no keys on Document types or Sections.
* QA-72: Checks page in plain words.
* QA-79: "39 rules · 64 checks", "today at 8:34 p.m.".
* QA-81: no "agent" on any page.
* QA-83, QA-84: schemas accepted.
* QA-85: the who_can_be stub exists.
* QA-86: refusals are US$0.
* QA-87: a 529 is not reported as over the cap; a 429 is not retried at once.
* QA-88: plain words, request id in Details.
* QA-89: the checker round runs only after a good first round (`finder.ts` 290, 357).

QA-84 and QA-85 were listed for runtime, but pass on main through #90.

**Narrowed:**
* **QA-73 (Major, screens):** the warnings are in words now. The changes table's Item column is still the key alone (`person.age_years` and 12 more on Visitor visa), and "IMM 1295: IMM 1295: 37 rows" remains.
* **QA-74 (Major → Minor, screens):** Releases and Activity are fixed. The combination's Review and release › versions table still has a Fingerprint column (`b228b666d2cff378`) and "10/29/2026, 8:34:03 PM".
* **QA-80 (Minor, screens + runtime):** titles, one name per person, header at 1024 and the AI work heading are fixed. `/release` and the five case pages still show the plain title "Product Studio".

**Still open, not part of these merges:** QA-75 (`NEEDS_PERSON` on a field-map job page), QA-76, 77, 78 (runtime), QA-82 (the questions still read as definitions), QA-90, QA-91, QA-92–95.

## 3. Walked like a person
On my copy:
* **Releases:** the Stand-in chip sits beside the heading; its tip reads "Today: … Later: … Row SI-11 of the stand-ins register".
* **Checks:** points to each combination's Questionnaires tab.
* **Fields:** words first, the key small under them.
* **Immigration programs at 1024 px:** the header fits, with "Prototype · demo workspace" shown (screenshot `2026-10-29-after-merge-deda0e6/programs-1024.png`).

**Shared demo (:4400), read only:** it is empty. No combinations, fields or releases; one audit line: "Configuration author reset the demo … 0 rows remain" at 12:58 today, before this run. The Lead's note said "data kept". A backup from 12:38 exists in `.tools/db-backup-2026-10-29/`. So the real-data walk could not be done (question 1).

## 4. Live smoke (founder approved US$3.24 worst, steps 1–4): stopped before any call
Every figure below comes from the product's own plans (US$0) on qa_live, Study permit, main deda0e6b:

| Step | Smoke plan (worst) | Product reserves | Note |
|---|---|---|---|
| 1+2 finder (page pick + list forms, draft + checker) | US$1.38 | **US$5.58** (4 rounds, 2 paid attempts each; "about US$0.31") | US$3.39 if the guide page is given, but that skips step 1's AI round |
| 3 Who can be, AI now | US$0.50 | **US$0.91** | refused with 409 "AI now waits for the founder's Go (P-110)" unless the server starts with `STUDIO_PEOPLE_AI_LIVE=approved` |
| 4 field map IMM 5475 | US$1.36 | US$0, no call | plans "reuse_library" even with draftAgain: the map is already in the library, so no live path exists for this form |

* Worst case for steps 1–3: US$6.49 (US$4.30 with the page given), against the approved US$3.24.
* By the rule (stop before any step that would pass the plan), nothing was launched. The ledger in this copy has no live line.
* The options went to the Lead (question 2).

## Graph and decisions
* `graph.mjs --write`: G1–G6 unchanged (G3: the same 2 attachment routes, API-only).
* `decision-impact.sh`: P-163–P-174 each have a capability row or are workflow-only.

## Capability statuses changed
* C3.10: Partial → Works.
* C11.8: Not built → Partial (offline only; live progress, Stop and cost not seen).
* Re-dated to deda0e6b with evidence: C11.2, C11.6, C11.9, C11.10, C11.11, C11.12, C11.15.

## Coverage
* Not rerun: this after-merge pass ran the suites plainly.
* Last figures (52117004): api 97.49% lines / 82.52% branches, engine 99.45% / 89.65%.
* Since then #90 added `field-drafts.ts` (no route yet, API-only plan step) and the round sizing. Both are covered by `check_s6_field_drafts.ts` and `check_forms_rounds.ts`, which pass.

## Could not test
* The live AI steps (§4).
* Real data on :4400 (empty).
* `field-drafts.ts` through a page (not routed yet).

## Questions for the Lead
1. :4400 was reset at 12:58 today (0 rows). Was that intended, or should the 12:38 backup go back before the founder's next look?
2. Live smoke: approve US$6.49 for steps 1–3? Or US$4.30 with the guide page given (step 1 untested)? Or step 3 alone now (US$0.91)? Step 4 needs a form that is not yet in the library.

## Suggestions
* *Needed for the proof · Scaffolding:* CI for a Lead PR should run on the merge with the latest main. Two PRs merged within 15 minutes (#91, then #90) left main's combined code untested by CI.
* *Needed for the proof · Capability:* each AI step's plan should show the same worst case the smoke plan uses. Here the run reserves 2 paid attempts per round across 4 rounds; the founder approves money in the plan's words.

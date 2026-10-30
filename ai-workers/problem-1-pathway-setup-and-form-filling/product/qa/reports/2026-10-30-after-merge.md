# After-merge — main 5f6c8deb (PR #94: Documents tab, FIX passes 1–2, PQR part 1, who fills, Preview by person and channel, QA-99), 30 Oct 2026

Branch `claude/qa-after-merge-5f6c8de` (the explore branch merged in). Copies: suites with the qa prefix (ports +16000); qa_qn :4479, qa_w2 :4472, qa_ex :4478. **US$0**: the ledger grew only by 28 stub reserve/settle pairs (US$0 each) during the suites; no button that names a price was clicked; `check_qa_explore_1029.cjs` stops if the ledger grows (603 → 603).

## Verdict
**Ready for the next merges.** #94 closes QA-92–96 (Questionnaires drawer and Remove fixes; slice 2 browser suite now repeatable) and fixes QA-99 in the stub path; its live retest waits for the founder. No Blocker or Critical is new. Six Minor findings are new (QA-112–117), all runtime, one shared with screens (table width).

## Suites (`run-suites.sh` on 5f6c8deb)
90 suites, 89 pass. `check_w115_slice3_browser.cjs` 34/35 once ("Undo pass"), then 35/35 three times alone: QA-116 (the Undo-bar timing family of QA-96). `check_studio_browser.cjs` skipped (resets :4400). New suites on main all green: `check_pqr` 38/38 + browser 20/20, `check_preview_sets` 27/27 + browser 24/24, `check_who_fills` 26/26 + browser 19/19, `check_qa92_95_browser` 23/23, `check_qa99_who_can_be_trail` 3/3. By-products (screenshots, stub runs, launch tickets, evidence, the ledger) restored to HEAD.

## Retests
| Finding | Result | How |
|---|---|---|
| QA-92 Major | **Closed** | `check_qa_qn_1029.cjs` 39/41 (:4479): the drawer saves Official language under 'case' |
| QA-93 Major | **Closed** | Remove only where it changes something; 18 sections say why in words; confirm, Keep, Undo in runtime's `check_qa92_95_browser` 23/23 (sample data has no removable section, so my check now records that) |
| QA-94 Minor | **Closed** | no system name in the drawer, 404 or 409 |
| QA-95 Minor | **Closed** | 3 characters → "Write at least 5 characters: why the case officer enters it.", linked to the box |
| QA-96 Minor | **Closed** | `check_w115_slice2_browser.cjs` 56/56 in the full run and 3 of 3 alone (was 1 in 3) |
| QA-99 Critical | Fixed (stub) | `check_qa99_who_can_be_trail` 3/3 on all six combinations, `check_qa_ai_paths` 21/21, `check_s5_people_ai` 15/15; live call not retested (US$0) |
| QA-100–111 | Still open | `check_qa_explore_1029.cjs` 70/74: QA-105, 106, 108, 110 fail as on a9fe60c0 (none were in #94) |

## Walked like a person (author and approver, 1024 px, With an LMIA)
* **Documents tab (C4.5, Works):** per person (Principal 21 · Spouse 9 · Child 1), Always / Only if / Needs you, "10 facts" or "none · filed as is", the rule that a document takes its facts out of the questionnaire, Move up/down. Fits at 1024 px. Sample words disagree with the lines: QA-115.
* **Preview (C4.3 Works, C4.6 Partial):** five people with counts, three sets per person, the client set's 19 sections add up to 84, documents first, "Cannot tell yet because …" on conditional documents. Fits at 1024 px. Portal screens are parked, so only PDF channels show.
* **Who fills (C4.9, Works):** empty reason refused on the field; with a reason it waits for a second person (author: Waiting for others; approver: Needs you with before → after, uses, reason); approval makes a placement draft. API: two at once → one saved, one 409; approver proposing 403; 301 characters 400; unknown question 404, all in words. Words: QA-113 (doubled heading), QA-114 (library value shown as changed before the release). No message confirms the approval; the page returns to the list.
* **Country PQR view (C4.2, Partial):** author and approver 200, client 403, nobody 401, unknown or malformed id 404 in words. Picks on the combination are not routed yet (C4.7 waits for S6 slice 1).
* **Drawer words on a case fact (C4.10):** QA-112.

## Bugs
New: QA-112, QA-113, QA-114, QA-115 (Ambiguity), QA-116, QA-117 — all Minor. Closed: QA-92, 93, 94, 95, 96. Open in total: 0 Blocker · 3 Critical (QA-90, 99 fixed-but-not-live-retested, 100) · 7 Major · 20 Minor (`qa/BUGS.md`).

## Coverage
Not run this pass (c8 under the suites needs a second full run; machine load 5–7). Last floor unchanged.

## Not tested
Release refused for a fact with no source or two (C4.10 rule); "Fill this from my documents" (P-134, not built); Preview per channel by hand; the live Who can be call (waits for the founder); :4400 read-only walk (restarting on 5f6c8deb after the Lead's backup).

## Questions for the Lead
1. **Port clash:** the forms lane's copy (`forms-s1-fix`) runs on :4471, inside the qa range (4470–4479, skill `qa`). `isolated.sh start` stops whatever server holds the port, so my three runs on :4471 stopped the forms copy's server, and theirs stopped mine (two of my runs met another database). Please tell the forms lane to restart its copy, and give lanes fixed hand-run port ranges (as `run-suites.sh` already does with slots), or make `isolated.sh` refuse a port held by another worktree.
2. QA-115: which documents should the sample With an LMIA carry, and should its note change?

## Suggestions
* `isolated.sh`: refuse to stop a server started from another worktree (*Needed for the proof* — runs break each other; *Scaffolding*).
* To review: say "Approved: … goes out with the next release" after Approve, as the drawer does (*Later*, *Capability*).

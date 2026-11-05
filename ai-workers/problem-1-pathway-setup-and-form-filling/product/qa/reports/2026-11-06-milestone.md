# qa milestone: M2's last walk on main, 6 Nov 2026, 02:10–02:45 IST

**Commit tested: `bf12209f1`** (origin/main head). For the tech lead (Lead 19). Live AI off, US$0: no `STUDIO_*_LIVE`, no priced button, every pack's ledger line US$0. Verdict by a fresh reader that did not walk (P-360 (3), P-290). Facts and exit codes: `2026-11-06-milestone/walk.md`.

## Verdict
**M2: 58/60 on qa's records, with known Majors** (P-360 (2)). C4.5 and C4.11 move to **Works**. C4.6 stays **Partial**, held by QA-270's file half. C10.1 was not in this walk (row 12b, QA-271, QA-272).

| Row | Status on `bf12209f1` | Machine run | Holds it |
|---|---|---|---|
| C4.5 | **Works** (was Partial) | `C4.5.test.ts` 26/26, GitHub run 42097532123, the six; Mac copy 26/26 | nothing; QA-255 closed |
| C4.6 | **Partial** (unchanged) | `C4.6.test.ts` 22/22, run 42097532123, the six; Mac copy 22/22 | QA-270 (the file route) |
| C4.11 | **Works** (was Partial) | `C4.11.test.ts` 30/30 + `C4.11-spread.test.ts` 8/8, run 42097532123, the six; Mac copies the same (spread twice) | nothing on the exit list; QA-262, QA-263 closed |

**The commit point (P-339):** run 42097532123 ran on `35045aef9` (#1068's merge). Main's head `bf12209f1` adds only #1112's records: `git diff --stat 35045aef9 bf12209f1 -- …/prototype` is empty. So the run tested main's code, by tree, not by sha. Job lines: the end of `2026-11-06-milestone/walk.md`. A fresh run on main's sha was not started: my `workflow_dispatch` was refused by this session's permission check. The scheduled nightly had not started at 02:40 IST.

## The exit list and the bugs rated
| Item | Result on `bf12209f1` | Evidence |
|---|---|---|
| **QA-255** (C4.5, C4.11) | **Closed** | `check_b83_undo_withdraw.ts` exit 0, 173/173: release refused by name while a listed document supplies a waiting field (M7), or a check reads one (M8); Submit refuses by name (M5). By route, on the configured checkpoint |
| **QA-262** (C4.11, C5.1; B114 #1115) | **Closed** | `check_qa262_row4.ts` exit 0, 45/45 (Visitor visa last), 32/32 (first): every release 201, each draft = its release. **By screens:** with 354 conditioned questions in force, Study permit then Visitor visa, Submit › sign 158 / 176 › Approve and release: "Released version 1", "The draft is identical to the released version". Next step: a case opened on Visitor visa's release by screens |
| **QA-263** (C4.11; #1068) | **Closed** | `check_forms_b88_qa263.ts` exit 0, 18/18: no activity line holds either typed reason, read underneath too |
| **QA-270** (C4.6; #1114) | **Open: half fixed** | Fill route: client, another firm, case officer 403 by route; by screens "This page is for the configuration people", no Fill button. **File route still open:** `GET /artifacts/:id/file` gives 200 (939 KB) with no person, to a client and to another firm. QA-270's own row names this, and #1114 did not touch it, so the fresh reader keeps the row open |
| #1114's same-minute overwrite | **QA-275, Bug · Major**, hardening | By screens: Fill pressed twice 14 s apart writes one file; the first artifact's stored sha256 `e40641…` now serves `7fde25…`. `check_qa275_fill_overwrite.ts` exit 1, 5/8. Does not hold C4.6 (tech lead's ruling on #1114) |
| #1115's Minor 1 (section move) | **QA-276, Bug · Major**, hardening | `check_qa276_section_move.ts` exit 1, 11/13: 409 "was changed while it was being released" with nobody editing; moving the question back recovers, told nowhere. Setup by route; Minor if no screen can make the move |
| `api/src/lifecycle.ts:543`, `api/src/document-supplies.ts:190` | **QA-277, Bug · Minor** (QA-273's class) | `check_qa277_withdraw_reason_feed.ts` exit 1, 9/11: both typed reasons reach another firm's `GET /activity`; a client gets 403. Older lines, not newly exposed as QA-263's were |
| #1121's open-case items | **#1121's suite passes; QA-278, Bug · Major** beyond it, hardening | `check_open_cases_at_once.ts` exit 0, 10/10. 48 opens at once: `check_qa278_open_48.ts` exit 1: 23 × 201, 25 × 500; refused opens leave no pin and no audit line |
| Words met on the walk | **QA-279, UX · Minor** | Stale empty-field messages on Open a case; "Outside Canada · release 1" with no program name; "Sign 359" beside "176 of 176 … signed"; UTC minute in a PDF's file name |

**60, with known Majors:** QA-162, QA-234, QA-237, QA-239 (C4.11; gate A PASS by screens on the stack's head on 5 Nov, not re-walked by screens on main), QA-275, QA-276, QA-278, plus the rest of qa/BUGS.md's Majors outside M2's rows.

## Every offered option pressed (lessons of 5 Nov)
* **Preview by person** (the six): all four household choices, every person button (principal, spouse, children 1 and 2, representative), "Every form field and a Sample filled PDF". On the studio view: the draft and released picker, the known-facts picker, the counts, and all four tabs. No Fill on the six (no applied field maps).
* **Fill** (Sample fixture): pressed as the author twice; opened by address as a client and as another firm.
* **Release** (two combinations): Submit, Select all I can sign, Sign, Approve and release.
* **Open a case:** empty press, then a real open.
* **C4.5:** SQR counts; the Documents tab; "Change the facts it supplies…" on an approved change, which says withdraw first.

## What could not be tested, and why
* **Headless Playwright at 400/1024/1440 px, axe, `check_qa270_preview_browser.cjs`:** this session's sandbox refuses Chrome a Mach port and socket. The screens were walked in the app's browser pane at 1024 px only, so there is no claim here for 400 or 1440 px and none for accessibility.
* **Copies:** started through an untracked copy of `tools/isolated.sh`, deleted afterwards. It changed two lines: `pg_isready` in place of `pg_ctl status`, and `node --import tsx` in place of the `tsx` CLI. The sandbox refuses the database's signal check and the CLI's socket. Code, migrations and the web build are the same.
* **Not Reset-to-release by screens alone (P-348 (2)).** The release copy's setup went through routes: the spread pack and the row-4 check's own setup steps. The C4.5 and C4.6 copies were set up by their packs. The verdicts rest on the pack runs plus the screens of each capability's own steps.
* **Ten test copies are still running on :4470–:4479.** The sandbox refuses to signal a server started by an earlier command, so `isolated.sh stop` cannot end them from here. Disk was 9.2 GB free at the start. See the question below.

## Questions for the tech lead
1. **QA-270's file route** (recommendation first): rule it a separate find, QA-270b, for the hardening pass. No screen leads a client or another firm to an artifact id, so under P-360 (2) it would not hold, and C4.6 then counts Works on run 42097532123 (M2 59/60). The other way: keep it in QA-270, as the fresh reader did, and a one-guard fix brings C4.6 to Works. Which?
2. **The ten copies on :4470–:4479:** stop them from a session outside this sandbox (`zsh studio/tools/isolated.sh <name> <port> stop` for qa_m2walk 4470, qa_c45 4471, qa_c46 4472, qa_c411 4473, qa_r4last 4474, qa_r4first 4475, qa_fill_overwrite 4476, qa_section_move 4477, qa_reason_feed 4478, qa_open48 4479), or let `prune-test-dbs.sh` take them?
3. **A fresh run on main's sha:** dispatch `nightly.yml` with capabilities "C4.5 C4.6 C4.11" on main, or accept the tree-identical run?

## Suggestions
* *Needed for the proof · Scaffolding:* the qa skill's local copies need a variant for a sandboxed session (`pg_isready`, `node --import tsx`), or qa sessions without the sandbox. Otherwise no browser check runs.
* *Later · Capability:* QA-275, QA-276, QA-278 and the QA-270 file route belong in the hardening pass (P-358), with QA-277 in the row on configuration reasons.

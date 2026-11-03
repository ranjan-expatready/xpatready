# qa — after-merge + explore M2, 3 Nov 2026 (~10:05–11:00 UTC), main `762dbae6`

Independent cloud qa tester (skill `qa`, P-290/P-291 re-run): I built and scored none of tonight's changes. Fresh clone of `origin/main` 762dbae6 (no merge to main while I worked; checked at the end), isolated copies on :4470–4472 and :4477 (helpers :4473–4476), never :4400. Live AI off, no `STUDIO_*_LIVE`, no priced button: **US$0**. Helpers: two Sonnet sessions (launched before the Lead's P-303) collected browser and API evidence; every finding below was judged and, unless marked "seen by a helper", reproduced by me.

## Verdict
**M2 is not ready.** Of the merged capabilities, 9 are confirmed Works (pack green twice on main, re-run by someone who did not score them); 3 rows that were Works drop to Partial on their own new packs (C3.10, C11.17, C4.2). **One Critical stays open: QA-180 (V3 B1)** — a combination can be released that no firm can open a case on. The configured checkpoint still releases 0 combinations (QA-144, now 386 problems on Visitor visa).

**Careful: a first pass was on a stale web build (QA-181).** The lane setup built the web from the qa lane's 30 Oct branch before I switched to main; packs with a browser part ran against old screens (C5.4 0/2, C11.1 15/16). I rebuilt `web/dist` from 762dbae6 and re-ran every pack from scratch; only the second set counts.

## Acceptance packs (fresh copy each run, two runs each, on the rebuilt web)
| Capability | PR(s) | Pack | Run 1 · run 2 | Score |
|---|---|---|---|---|
| C3.2 bulk accept only High, one Undo | #661 | `acceptance/C3.2.test.ts` | 22/22 · 22/22 | **Works (confirmed)** |
| C4.6 child and representative signing | #666 | `C4.6.test.ts` | 17/17 · 17/17 | **Works (confirmed)** |
| C1.5 copy route | #683 | `C1.5.test.ts` after `setup_visitor_visa.ts` (13/13) | 18/18 · 18/18 | **Works (confirmed)** |
| C5.4 release with sources from the Demo menu | #676 | `C5.4.test.ts` (drives Demo › Reset to the six, Demo › Start With an LMIA) | 22/22 · 22/22 | **Works (confirmed)** |
| C5.2 Release page cannot bypass | #675 pack | `C5.2.test.ts` after VV setup | 32/32 · 32/32 | **Works (confirmed)** |
| C11.1 Wave 1, no extension paths | #675 pack | `C11.1.test.ts` after VV setup | 16/16 · 16/16 | **Works (confirmed)** |
| C11.13 near-duplicate reason at release | (built file) | `C11.13.test.ts` | 15/15 · 15/15 | **Works (confirmed)** |
| C4.1 SQR per role, section order | #674 | `C4.1.test.ts … wp.family` | 18/18 · 18/18 | **Works (confirmed, on the suites' fixture)**; on the six it stops (exit 2, "no questions yet": QA-144) |
| C4.8 one review and release | #674 | `C4.8.test.ts … wp.family` | 12/12 · 12/12 | **Works (confirmed, on the fixture)**; same exit 2 on the six |
| C4.2 PQR marking | #688 | `C4.2.test.ts … wp.family` | 9/10 · 9/10 | **Partial**: QA-125 fixed (plain duplicate words); the unasked-fact tick waits for #688's Question 1 (as #688 said) |
| C3.10 never "box" | #675 pack | `C3.10.test.ts` | 7/8 · 7/8 | **Partial**: 18 messages still say box (QA-182) |
| C11.17 Add to structure | #675 pack | `C11.17.test.ts` | 23/24 · 23/24 | **Partial**: over-long name message not under its field (QA-183) |
| C11.14 rounds, High, bulk | #673 | `C11.14.test.ts` | 10/13 · 10/13 | **Partial** (unchanged): AT-2/3/4 need the saved checker rounds (#671 open; QA-176) |
| C7.7 deliverables list (M3) | #680 part 1 | `C7.7.test.ts` stops (exit 2: VV M3 setup) | — | **Partial** (unchanged). Part 1's own checks: `check_sh3_resolver.ts` 78/78, `check_vv_checklist.ts` 62/62 |
| SH3 shared resolver (no row) | #659 | `check_sh3_resolver.ts` | 78/78 | refactor, no capability row; contract green |
| C10.1 configured checkpoint | — | API walk | released 0 | **Partial** (unchanged; QA-144, QA-189) |

Logs: one per run, `<cap>.run<n>.log` (kept in the session scratchpad; the lines quoted here are from them).

## Browser walks
Headless Chromium (no headed browser in the cloud), as the person named, on fresh copies; screenshots in `qa/reports/2026-11-03-after-merge/`. Page errors: 0 on every walk.
* **C3.2 (author, the six, Study permit › IMM 1294 AI field-map page)** 1440/1024/400: "Accept High exact reuse (0)", disabled, tooltip "No exact reuse match is waiting."; no "Accept clean new definitions" button; Client A gets "This page is for the configuration people". **Defect (QA-190):** each new-definition button reads "Create person.applying_from_country as a new definition" (raw key), and at 400 px those buttons push the page 60 px sideways. The High path itself (accept, one Undo, second Undo refused) is proven by the pack's Sample checker round; on the six no item is High.
* **C1.5 (author, Visitor visa › Forms)**: "Copy a line from another combination" says nothing changes until Add and one Undo takes all back; combinations with nothing new say "It has no line this combination does not already have" and Add stays disabled ("Add 0 lines"); from With an LMIA 30 lines; one ticked, Add **double-clicked** → exactly one line (IMM 1295) and the toast "1 line copied here from … (draft changes). Undo"; Undo → IMM 1295 gone. Pass.
* **C4.6 (author, Visitor visa › Preview by person)** 1440 and 400: each form says "Signed by: …"; principal and spouse "themselves"; each child under 18 "A parent or legal guardian, for them (under 18)"; no sideways scroll. The scripted Visitor visa sets no signing method and no age 18 on IMM 5707, so the representative's IMM 5476 lines and the age gate were proven by the pack, not on screen. Pass for what the screen shows.
* **C4.2 (author, API, Visitor visa)**: two saves at once → 200 and 409 "Someone else saved where "Funds available for the stay, in Canadian dollars" comes from at the same moment. Reload to see their choice, then choose again."; a stale third save → 409 "Someone changed … after you looked." **QA-125 closed.** Two browser tabs not walked.
* **C5.4**: its pack is itself a walk through the Demo menu and Review and release (22/22 twice). The Live result then reads as unfinished (QA-184).

## Explore M2 (charter: wiring and plumbing across screens — roles, recovery, error messages, data consistency)
**Start: V3's Critical break.** Reproduced at the engine level and in the code on 762dbae6 (not yet fixed; P-297 (3) gives it to F2): Review and release treats "No field map yet: the form cannot be filled" as a warning (`engine/validate.ts:67`), Open a case blocks on it (`engine/programs.ts:66` via `api/src/programs.ts:303`). Found a second hole: a field map with 0 entries passes release without a word and still blocks the case. New replayable check `tests/qa/check_qa180_two_gates.ts`: 4/6 today, both failures are the bug. **QA-180 (Critical).**
**"The Demo menu releases 0 combinations":** Demo › Load the configured checkpoint on a blank copy (41 s, US$0) → `released: []`; Visitor visa "Fix 386 problems before submitting" (177 on 6d5d751c); the form finder says "AI did not finish (failed)" on 4 of 6 combinations during a US$0 replay. Only Demo › Start With an LMIA (C5.4) reaches a release from the menu. QA-144 updated; row 12's fixed text contradicts row 3 (QA-189).

New findings (most severe first): QA-180 Critical · QA-181 Major (qa tooling) · **QA-184 Major**: a Live combination reads as unfinished on every screen ("0 of 5 done", "Needs you · Resume setup", next step Official pages, "31 to fix" beside "Fix 14 problems" on one page, catalogue "Step 2 of 4") · QA-185 Minor: question, form and document counts differ across screens with no unit (272 / 195 / 165 / 77 / 153 questions for one combination) · QA-186 Minor: Review and release counts library changes twice (177) · QA-187 Minor: raw validator words ("Invalid input: expected string, received undefined") on ~30 write routes; "does not hold the author duty"; body checked before the person on retire/restore/delete · QA-188 Minor (judgement): `/api/releases` open to Client A, `/api/activity` gives configuration events to case staff · QA-182, QA-183, QA-189, QA-190 Minor. **Closed:** QA-125 (#688).

**Held up:** every studio GET (33 routes) refused to the case officer, representative and client with words; 22 write routes refuse wrong people with 403 in words; second person enforced (author cannot approve, approver cannot submit); every studio page shows "This page is for the configuration people" to case people (17 URLs); double retire/restore → stable 409 in words; after Reset, an old combination id says "Not found (it may have been removed by a reset)"; duplicate case reference 409 in words; fuzz of ~175 write routes (empty, wrong types, 5000 characters, emoji, Arabic): no 5xx, no stack, no database words, every 4xx is Problem Details; Open a case lists only released combinations and refuses others in words.

## Underneath
* **Graph** (`qa/GRAPH.md`, regenerated on 762dbae6): G1 0 · G2 0 · G3 10 (+3: `POST /demo/release-with-sources` is reached only by the C5.4 acceptance pack, which the graph does not read; `POST /runtime/items/:id/signed-scan` and `GET /combinations/:id/sources/:kind/:key` have no page yet: API-only, M3 / G1 work in progress) · G4 0 · G5 0 · G6 3 (unchanged).
* `tools/decision-impact.sh`: no product decision without a capability row.
* Suites: not re-run as a whole here; main's merge-queue CI ran them for each merge (P-291 (3)). Coverage (c8): **not run** this round.

## Not tested
The shared demo :4400 (on the Mac, not reachable from a cloud copy) · headed browser (cloud: headless Chromium only) · c8 coverage · double click on Submit/Approve/Release on a person-reachable release (none can be submitted from the screens: QA-144) · two tabs on one combination's rules/requirements (stale revision exists, not triggered) · V2's independent M2 re-run report: not in `reports/verify-2026-11-03/` yet, so these scores rest on this run alone.

## Questions for the Lead
1. QA-188: should Client A read `/api/releases` (author and approver names), and should case staff read configuration events in `/api/activity`? The page refuses them; the API serves them.
2. QA-181: who fixes the qa lane's bind/setup (it is a Lead/infra tool)? Until then a qa session must rebuild `web/dist` after checking out main.
3. C4.1 and C4.8 are green only on the suites' fixture (`wp.family`); on the six their packs stop at "no questions yet" (QA-144). I scored them Works (confirmed, on the fixture). Say if the scorecard should count them only once the six reach them.

## Suggestions
* `isolated.sh` refuses to start when `web/dist` is older than the last commit touching `web/src` — *Needed for the proof*, *Scaffolding* (it would have stopped QA-181 here).
* One "startable" rule module called by both the release gate and Open a case — *Needed for the proof*, *Capability* (QA-180).

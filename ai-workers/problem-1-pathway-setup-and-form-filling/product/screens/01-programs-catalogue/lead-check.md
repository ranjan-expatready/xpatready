# Screen 01 — Lead checks (from 23 Oct; earlier Lead checks are in `review.md`)

## Lead check of the small FIX after the merge (24 Oct, cloud Lead) — **Result: MERGED (8726714 on the session branch)**; DONE after the qa retest
How checked: diff `main...910ee40` (45 files; migration `20261024090000_program_name_unique`, `programs.ts`, `contracts/programs.ts`, `fmtWhen`, tests); build-notes "Small FIX after the merge" and "CHECK round 3" (reviewer Ship 9/10, breaker 0 Major); no CI run existed for the lane's commit (pushed before the CI suites job, P-85), so the Lead ran `tools/run-suites.sh --demo` on main + this lane in a cloud clone (fresh databases, US$0).
* **Suites (main + screens):** 11/11 green — rules 67 · engine 38 · AI drafting 48 · orchestration 22/22 · API 135 · channels 42 · release race safe · forms channels 106 · **grounding 29/29** (L1 closed) · Screen 01 browser **136/136** (L2 closed, QA-21 is the same wait) · studio browser 40/40. Re-run after forms, runtime and evidence merged in: still green (see the F1 and R1 checks).
* **QA-14 closed, independently:** qa's own `check_qa14_name_race.ts` on an isolated copy: 20 names × 4 at once → exactly one 201 and three 409 each. (In a clean clone the qa and runtime test folders needed `"type": "module"`, added by the Lead, test-only.)
* **Migration read:** the SQL key (lower case, ASCII letters and digits) equals `normalizeLabel` for printable ASCII; other scripts are keyed by the app at start; earlier duplicates keep a null key and stay listed by the query in the migration. Rollback written. Accepted.
* **QA-17, L3:** dates on steps when not today; `tsc -p api/tsconfig.json` 0 errors (command now named).
* Capability or scaffolding (P-33): the database uniqueness and the dated steps are capability; the database guard in the checks is scaffolding.
* **Open, not blocking:** QA-20 (combination page 13 px too wide at 400 px) → the screens lane's next pass. QA-19 (old step texts and early times on :4400) clears with a demo reset: founder's OK, before the walk.
**Next:** the qa lane's `/qa after-merge` on the new main; Screen 01 is DONE when it passes.
**Result 24 Oct 20:20: DONE** (the founder's DEMO of 23 Oct ended in "close Screen 01 in one FIX pass, qa retest, then DONE"; this is that retest). qa after-merge on main db468e3 (`qa/reports/2026-10-24-after-merge-2.md`): QA-14, QA-17, QA-21 closed; M2 journeys 47/47 in 2 of 4 runs (one qa check timing, fixed; one QA-22); Screen 01 journey 9/10, no 0, no Major in scope. Open Minors QA-20, QA-22 and lane-copy QA-4 → screens small FIX. D17/D20 stay with the intended user's walk.

## Lead check of the closing fix pass and the forms decisions (24 Oct) — **Result: MERGED (1cb174a6)**; DONE after the qa retest
How checked: diff `main...4d12036b` (145 files); build-notes "Fixes", "CHECK → FIX", "Extension (P-74)", "CHECK round 2"; reviewer rounds 1–2 (Ship after fixes, journey 8.5 and 8/10) and break reports; every suite rerun by the Lead on the exact commit in an isolated copy (`.claude/worktrees/lead-check-s01`, ports 4420–4429, fresh databases, no model call, US$0); Lead walk on a fresh sample copy.

| Suite (exact commit 4d12036b) | Lead result | Lane claim |
|---|---|---|
| rules · engine · AI drafting | 65/65 · 38/38 · 48/48 | same |
| Screen 01 API · channels · release race | 130/130 · 42/42 · 7/7 rounds safe | same |
| forms channels · scale fixture + catalogue | 106/106 · 17/17 | same |
| Screen 01 browser | 134/135: C2.7 list check read before the list refreshed (machine load ~15); the screenshot taken next shows "IMM 5707 … Awaiting a second person" | 135 |
| older studio browser | 38/40: A4 download (QA-4, dot-folder copy) and A8 AI step (QA-8) | — |
| AI orchestration | 19/22 (QA-8, lane copies) | 19/22 |
| grounding | 28/29: "finding 3 at release" gets 404 on submit; **the same on main** (pre-existing) | 29/29 |
| type check | web clean; api 6 errors, all in `tests/check_screen01_api.ts` (main had 39) | "clean" |

**Lead walk (fresh sample copy, 1440 px):** Visitor visa → "Add 1 form from the library" adds IMM 5707 (QA-13 path) → "Filing: PDF only", "Filed as" offers PDF upload (default) · Online · Signed PDF upload → Portal IRCC Portal → IMM 5707 Online: "Filing: Online only", "The client signs the declaration in the portal", and release blocked with a plain reason and next step (no approved online version from that portal: capture it or file as PDF). Matches P-61 and P-62.

**Capability or scaffolding (P-33):** channel per line, filing method, portal, default channel, Add an online form, drafting source, release gate, words: Capability (content publisher, combination page and Sources tab). Sample portals label and Demo menu: Scaffolding.

**Handed back (Minor, next pass):** L1 grounding "finding 3 at release" 404 on submit (also on main: find the cause, fix the check or the code); L2 browser C2.7 step waits for the online-forms list to refresh before asserting; L3 six type errors in `check_screen01_api.ts` (a build note said "type check clean": report the command and count). Lane's own open Minor items stay listed (deny by default without `x-actor`; two saves with the same `baseRevision` at once; planted-instruction PDF intake wording). Stored step logs from 21 Oct still say "data boxes" (history text, not a screen string; leave).

**Suites on main after the merge (1cb174a6, main copy, fresh databases):** rules 65 · engine 38 · AI drafting 48 · API 130 · channels 42 · race safe · forms channels 106 · scale 17/17 · **older studio browser 40/40 and AI orchestration 22/22** (so QA-4 and QA-8 are lane-copy only) · grounding 28/29 (L1, pre-existing) · Screen 01 browser 133/135 at machine load ~30 (C2.7 list and P-50 header path: timing, L2) · types web clean, api test-file errors (L3). Test outputs restored afterwards; nothing committed from the run.

**After merge:** main migrated (`20261023210000`), client generated, web rebuilt; :4400 restarted on 1cb174a6 with the founder's OK (backup `xr_studio_demo-before-screen01-merge-20261024-0939.dump`); data unchanged (21 + 8). qa lane: `/qa after-merge` on 1cb174a6; Screen 01 is DONE when it passes (founder decision 23 Oct).

## Lead recheck of the AI drafting repair (23 Oct) — **Result: DEMO**
How checked: build-notes "Fixes (FIX after the Lead's AI drafting check)"; code (`prototype/contracts/fact-key.ts`, entry contract, v2 output schema, `studio/web/src/pages/sources.tsx`); the AI drafting suite run by the Lead; the shared :4400 restarted on the repaired code (data unchanged) and asked for its AI plan read-only; the founder's two live runs from today. No paid call by the Lead.

**Confirmed fixed**
* **A1** One naming rule in `fact-key.ts`, carried verbatim by the entry contract, the released-configuration map, the v2 output schema and prompt; the studio's key checks call it. Lead run of `check_ai_drafting.ts`: all nine A1 checks pass; replays of the old refused answers now keep all 233 form fields. **Lead confirms the builder's choice: digits allowed** (the library already allows them).
* **A2** Plain FAILED messages; BLOCKED only for a provider limit.
* **A3** :4400's plan for IMM 1344 offers "Use the saved AI answer (no model call, US$0)", and the dialog selects it by default when a saved answer exists.
* **A6** The intake's printed edition goes to the AI as a known fact.
* **Real-world proof:** the founder's two live IMM 1344 runs today (12:01 and 13:27, US$2.94) both passed the checks: 162–163 of 233 form fields mapped, 48–50 proposals (about 15 reuse, 31 new, 4 ambiguous).

**Why the founder paid twice:** :4400 had been started at 10:48, before the repair (11:27–11:44), so it never offered the saved answer. Restarted at 13:40 on the repaired code.

**New findings (none blocks the walkthrough)**
1. **Major — the restart script stops every copy of the app** (`studio/tools/restart-api.sh` stops all studio API processes), which now kills the lanes' test copies. Fix: restart only the process on its own port. Owner: screens lane, with the next fix pass.
2. **Minor — the AI drafting suite assumes exactly four saved IMM 1344 answers** and crashes when newer valid runs exist (today's two). Fix: select the four refused runs by name. Owner: forms lane (it now owns `prototype/p2/` and AI drafting).
3. **Minor — "boxes" still on screen** ("Its boxes are not mapped yet"). Covered by P-63 in the forms lane's F1 item 5.
4. **Observation — a sponsor form (IMM 1344) was attached to Express Entry › Profile** with no hint that it is unusual for that program (a test by the founder). Content meaning is the expert's; an advisory hint belongs in the Screen 02 concept, never a block.

**A4 decision (speed and progress)**
Accepted as the builder proposed: reuse first, split by section groups through the existing bounded queue, per-part progress, a deterministic merge that flags near-duplicate names for a person. Placement: the backend in the **forms lane** (F1), the progress screen in **Screen 02** (screens lane). Before switching, one measured split live run of IMM 1344 against the saved single-call answers (estimate US$1.6–1.9, worst US$5) needs the founder's go. Not a Screen 01 blocker.

**Next:** DEMO. The founder walks Screen 01 on :4400 as author and as reviewer: catalogue, a combination page, add a form through the intake, the saved AI answer, the review of AI proposals, the release guard. D17/D20 evidence is recorded here.

## RCIC walkthrough
**25 Oct — accepted.** The founder (author and RCIC reviewer, P-17) has walked Screen 01 and considers it done (R-104). No new findings; any later finding becomes a FIX item. D17/D20 still wait for the intended user's unaided walk (gate item 4).

## Lead check of the small FIX after DONE (24 Oct, cloud Lead) — **Result: MERGED**
QA-4 (downloads under a dot-folder; a gone file a plain 404), QA-20 (Portal select fits at 400 px), QA-22 (Programs waits for the person before author-only words), CHECK round K1 and m1–m5; `check_screen01_smallfix.cjs` 23/23 (system Chrome since 1072a06, CI green). Lead run with the other lanes: 20/20 suites green.

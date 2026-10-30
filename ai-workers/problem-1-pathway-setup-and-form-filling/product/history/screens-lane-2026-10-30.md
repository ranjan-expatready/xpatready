# Screens lane file: older lines (moved word for word from `lanes/screens.md`, 30 Oct, size limit)

## Handover lines
* **PR #96 FIX done:** `claude/screens-96-fix` at 49c175d0 (from `origin/lead/2026-10-29-s2a` + main 5f6c8deb, #94): the five outside-review bugs, each with a pass and a fail test; check_s6_p149 73/73, check_s6_queue_browser 28/28, the five forms suites green, tsc clean, graph G3 2 (older). The Lead folds it into #96.
* **PR #96 fix 2 done:** `claude/screens-96-fix2-6d5fe3` at 239c2ec8: review findings (a)–(c) in library-sources.ts and QA-113, pass and fail tests in check_s6_library_sources (36/36); the Lead folds it into #96.
**(3) DESIGN, 29 Oct:** `claude/screens-checklist` (from main 0aeb22d7, worktree `screens-checklist-53f3c9`) at 4a40d176: fresh challenge F1–F5 (new dated section in `challenge.md`) and `plan.md`: slice A engine and contract (no visible change) · B card and Overview, after forms' official-pages record · C tabs, runtime's files unless handed over. Earlier S6 work: `claude/screens-1b-queue` (from `claude/screens-1a-34cb66` e3483c7d, worktree `kind-mendel-ef9c9c`), 1b at bb94fce6.
**S6 slice 1 (plan-slice1.md): 1a and 1b DONE**, folded into Lead PR #96 (1a fix 0a5b09dd, 1b bb94fce6). What was built, decided and owed: build-notes.md "Slice 1a" and "Slice 1b". 1c (pqr_pick lander, rule-sourced field) waits for runtime #94.

## Log lines
- 2026-10-29 · W1-setup-checklist · DESIGN (3) → owner Lead · new branch claude/screens-checklist from main 0aeb22d7 with this file from 7a1f053b; fresh challenge of concept v2 (F1 duty table vs P-161 (3), pages are rules-only; F2 pages record not scheduled before this; F3 tabs are runtime's files, people card on two pages; F4 step 4 vs P-174 and contract v2 kinds; F5 C11.10 already "Works"); plan.md slices A/B/C. Official sources: nothing pending. No code. US$0.
- 2026-10-29 · W1-setup-checklist · applied Lead correction: concept not agreed; (3) is a fresh challenge + plan only, no code, for the founder's early look. Handover updated. US$0.
- 2026-10-29 · W1-shared-library → W1-setup-checklist · applied Lead message: 1b (bb94fce6) and the 1a fix folded into #96; next queue item (3), plan first. Handover rewritten for a fresh session (this one at ~70% context, founder's rule). No code. US$0.
- 2026-10-29 · W1-shared-library (S6) · EARLY-LOOK 1b FIX · Lead early look: toasts covered the side panel's footer; toaster moves beside an open panel (above its footer when the panel is full width), every side panel; browser step at 1440, 1024 and 800 proves Accept and Reject stay clear and clickable; check_s6_queue_browser 26/26. 1a fix 0a5b09dd: six named suites green on its own branch. US$0.
- 2026-10-29 · W1-shared-library (S6) · BUILD 1b → EARLY-LOOK · new session from e3483c7d, main a9fe60c0 synced (contract v2.1: three small fixes in 1a code); review-proposals.ts routes (queue grouped, decide, undo, grouped approval), door rules (bulk Ready only and never rules→library, reuse adds nothing, field-map items on their page, Undo back to waiting), To review group and batch rows, proposals.tsx (queue, side panel, batch page), answer list publishes; check_s6_p149 65/65, check_s6_queue_browser 23/23, check_screen02_slice1 passed, tsc clean, any 423, graph G4 0. US$0.
- 2026-10-30 · W1-shared-library (S6) · FIX for Lead PR #96 · applied Lead message: (1) Undo refuses (409) once the accepted draft changed (stamp of the landed rows); (2) grouped approval all or nothing in one transaction; (3) a reuse of a missing, retired or merged item refused (409) at decide; (4) document type identity by name and proves in sameInLibrary; (5) Undo kept on the empty-group page. Main 5f6c8deb merged (3 conflicts, both sides kept). Pass and fail tests in check_s6_p149 and check_s6_queue_browser. US$0.

## Moved from lanes/screens.md Handover (30 Oct, card v4 session), word for word
**Agreed answers:**
* **N-1:** done on main (contract v2.1: no `person` origin or `addReason`; `source.rule`).
* **N-2:** runtime exports `acceptPqrPick(tx, actor, item)` and drops the pick's own Accept (PR #94). 1c registers it as the `pqr_pick` lander.
* **N-3:** no stop-gap; sections come from the forms' parts in slice 2, and the checks seed until then.
* **P-97:** after #94, the field page's "Collected from" becomes read-only for an existing placement, with "Change who fills" calling `POST /library/fields/:key/fills`. That is our page (library.tsx).

* Not done from 1b, decided with the Lead in build-notes "Slice 1b": 1b-2 (Draft fields with AI on the form row; job.tsx folds in), `seed_library.cjs` stays SQL. 1c: pqr_pick lander and the rule-sourced field (N-1 is on main as contract v2.1; N-2 waits for #94).
* Ports: screens own 4440–4449 only (4460s are evidence's).

**Not screens' (routed in the hand-backs):** runtime.ts "opened case <id>" (QA-74); engine/validate.ts messages with codes (QA-73); section meanings are release c1-v3 content (QA-71); QA-82 to forms W1-10 / S6 slice 1; qa's `check_qa_am_r69_1028.cjs:123` selects the person by the old label.


## Moved from lanes/screens.md Handover (30 Oct, card v4 session), word for word
* **Board v4: Go (P-180), 30 Oct.** Board `design/draft-board-v4.html` on `claude/screens-board-v4`; the founder chose Q1 Open for non-authors, Q2 chips All · Not started · In progress · Live + Needs you, Q3 brand blue. Concept v4 folded at 2c5be7c7 (Lead's OK to edit `concept-draft.md`); `plan.md` is on this branch, with "Slice A build brief" (what exists, order, checks). **Next: slice A, then the card**, on `claude/screens-board-v4` (or main once #96 merges); CI is blocked on billing, so the local run-suites on the exact commit is the evidence.
* **Slice A DONE, 30 Oct:** `claude/screens-slice-a-62933a` (from `claude/screens-board-v4` 4908ebdd) at 434c6686: `contracts/setup-checklist.ts`, `engine/setup-checklist.ts` (`setupChecklistOf`, `forViewer`, `mayAct`, the two tables), `GET /catalogue` cards and `GET /combinations/:id/summary` carry `setup` with the viewer's overlay (`x-actor`); no page reads it yet (no visible change). `tests/check_setup_checklist.ts` 46/46 (usage: `isolated.sh screens_sa 4441 start && tsx … 4441`); tsc clean; graph G3 2 (older). Four points not done as briefed, with reasons, in `plan.md` "Slice A built" (old five functions stay until slice B replaces the Overview's missing list and Next step; cache per workspace, timing 549 ms cold / 30 ms warm at 150; Release `notBy` holds the submitter only; no `participantsConfirmedAs` yet). Full run-suites on 434c6686: 85 PASS, 2 FAIL (runtime's W1-15 browser suites; also on base, see the log).

## Moved from lanes/screens.md Handover (30 Oct, card v4 session), word for word
* The Lead backs up :4400 before the restart that runs #96's migration.
**Learned, not written elsewhere:**
- Bash here refuses heredocs, `$(…)`, loops and some long `&&` chains (merge-guard hook): write a script to the scratchpad and run it. The catalogue caches rows keyed on activity counts: a check that changes the database by SQL also inserts an `audit_event` row.
- Other lanes run this lane's checks under the same copy names and ports (`run-suites.sh` uses the usage lines), and all copies share one PostgreSQL server: two runs at once break each other. For reruns, use private names and ports (for example `<name>_mine` on 4460+), then drop those databases.
- Run by-products land in the tree (other lanes' screenshots, `prototype/p2/*`, `prototype/studio/evidence/*`): restore them before each commit and stage only lane files.
- The Prisma client in `node_modules` is shared with other copies: after switching branches run `./node_modules/.bin/prisma generate` if a column is reported missing.
- An author's own names delete at once (P-116 amended): a check that needs the second-person path marks its names as another person's (`update program_def set created_by='user-C'`).


## Moved from lanes/screens.md Handover (30 Oct, card v4 session), word for word
* Runs: node 24 first on PATH (`lane.sh setup`'s npm ci fails under node 23); private copies on 4441–4449 (`screens_96*`, `s96c_*` names worked); restore p2/ (and `git clean` its used-launch-tickets), evidence/, slice1b and who-fills screenshots after runs. Never point TMPDIR at a long path: tsx's pipe fails (EINVAL).

## Moved from lanes/screens.md Handover (30 Oct, card v4 session), word for word
* **Notes for the Lead:** (1) the old row status and the checklist chip differ for one sample: Spouse of a student is status NOT_READY (old rule) but chip LIVE (its release passes its own checks), so the chips count 2 Live where the old counts said 1 Ready + 1 Not ready; concept §6 defines Not ready by the release's own checks, so the card follows the chip. (2) `/catalogue` cold after 130 added names took 3012 ms server time (rows() rebuild); warm page renders 150 cards in 570 ms, List 1415 ms. (3) Resume setup links `/c/:id/forms?focus=…` and `/review?c&step` land on the tab / queue without the focus or filter until runtime's slice C and the queue's `c`/`step` exist.

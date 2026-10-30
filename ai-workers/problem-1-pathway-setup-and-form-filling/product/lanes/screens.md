# Lane: screens — Milestone 2 screens

## From the Lead

2026-10-29 (Lead, eighth chat; P-173 parallel build, no scope cut): Stage BUILD, owner Builder. **Your M2 queue, in order (one slice = build, own named checks, hand back; CI is the full check):** (1) S6 slice 1, the one review queue on contract v2 (one `ProposalItem` table; C11.13, C11.14, C3.2) — starts when the Lead merges forms PR #90; (2) library lists with where used, origin, rename and the P-158 "from a source, no free add" door (C3.13, C3.14, C3.15, C3.6); (3) one setup checklist per combination driving cards and Overview (P-157, P-161; C11.16, C11.10); (4) linking combinations and copying a line across combinations (C1.3, C1.5). **Split of (2) agreed by the Lead (29 Oct):** (2a) now — drop the Add buttons, 410 on POST /library/fields, /sections, /answer-lists with the checks that use them updated, GET /library/:kind/:key/sources, where used and rename on the library pages, one line per page on where its items come from; (2b) the P-158 door through `ProposalItem` after PR #90, together with S6 slice 1. Your files: Program structure, Immigration programs, Shared library pages and drawers, review queue, Overview. Not yours: forms library and channels (forms), combination tabs, PQR, Load sample (runtime). A slice that turns out heavy: tell the Lead before building it. Context above ~70%: write the Handover, tell the Lead.

Command: `/next screens` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

## Handover (screens lane, 30 Oct, kept current; a fresh session resumes from this file alone)
**30 Oct, this session stopped (Lead moved to a fresh chat).** Everything is pushed.
* **PR #96 FIX done:** `claude/screens-96-fix` at 49c175d0 (from `origin/lead/2026-10-29-s2a` + main 5f6c8deb, #94): the five outside-review bugs, each with a pass and a fail test; check_s6_p149 73/73, check_s6_queue_browser 28/28, the five forms suites green, tsc clean, graph G3 2 (older). The Lead folds it into #96.
* **Next: (3) setup checklist board v4** per `screens/W1-setup-checklist/founder-feedback-2026-10-30.md` (on main; read it first), building on the fresh challenge F1–F5 and `plan.md` on `claude/screens-checklist` (4a40d176). **Then slice A** (engine and contract, no visible change; plan.md) only after the founder's Go. No code before that Go.
* Start a fresh `claude/screens-*` branch from main once #96 is merged (else from `claude/screens-96-fix`), and bring in `screens/W1-setup-checklist/challenge.md` and `plan.md` from `claude/screens-checklist` if main does not have them yet.
* Runs: node 24 first on PATH (`.tools/node-v24.21.0/bin`; `lane.sh setup`'s npm ci fails under node 23), `npm ci`, `prisma generate`, `vite build` in web/; private copies on 4441–4448 (`screens_96*` names worked); restore p2/, evidence/ and slice1b screenshots after runs.

**(3) DESIGN done, 29 Oct evening: branch `claude/screens-checklist` (from main 0aeb22d7; worktree `screens-checklist-53f3c9`), pushed.** Fresh challenge F1–F5 in `screens/W1-setup-checklist/challenge.md` (new dated section) and `plan.md` (slices A engine and contract, no visible change · B card and Overview, after forms' official-pages record · C tabs, runtime's files unless handed over). No code. Waiting for the Lead and the founder's early look. In this copy `lane.sh setup`'s `npm ci` fails under node 23 (EBADENGINE): put `.tools/node-v24.21.0/bin` first on PATH before any build.
**Earlier: branch `claude/screens-1b-queue` (from `claude/screens-1a-34cb66` e3483c7d; worktree `kind-mendel-ef9c9c`), pushed; main a9fe60c0 synced.** AI spent US$0.
* Node: `.tools/node-v24.21.0`, since Prisma refuses Homebrew's node 23. A fresh worktree needs `npm ci` with that node on PATH, then `prisma generate`, then **`vite build` in `web/`** (without it, every browser suite times out).
* (2a) and **1a passed the Lead check** and are folded into Lead PR #96 (merges on green CI). The Lead backs up :4400 before the restart that runs the migration.

**S6 slice 1 (plan-slice1.md): 1a and 1b DONE**, folded into Lead PR #96 (1a fix 0a5b09dd, 1b bb94fce6). What was built, decided and owed: build-notes.md "Slice 1a" and "Slice 1b". 1c (pqr_pick lander, rule-sourced field) waits for runtime #94.

**Agreed answers:**
* **N-1:** done on main (contract v2.1: no `person` origin or `addReason`; `source.rule`).
* **N-2:** runtime exports `acceptPqrPick(tx, actor, item)` and drops the pick's own Accept (PR #94). 1c registers it as the `pqr_pick` lander.
* **N-3:** no stop-gap; sections come from the forms' parts in slice 2, and the checks seed until then.
* **P-97:** after #94, the field page's "Collected from" becomes read-only for an existing placement, with "Change who fills" calling `POST /library/fields/:key/fills`. That is our page (library.tsx).

**Next for a fresh session: queue item (3), one setup checklist per combination driving the cards and Overview (P-157, P-161; C11.16, C11.10).** Lead, 29 Oct: start it while 1c waits for runtime PR #94 (`acceptPqrPick`) on main. **Lead correction (29 Oct): the concept is NOT agreed yet.** Write only (a) a fresh challenge (skill screen-challenge) of `concept-draft.md`, as a new dated section in `screens/W1-setup-checklist/challenge.md` (an earlier challenge is there; read it, do not repeat it), and (b) a short plan in `plan.md` from the concept, the challenge and design/. No code. Hand both back; the Lead takes them to the founder's early look.
* Start a new `claude/screens-*` branch from main once #96 has merged (1a, (2a), 1b are in it); until then from `claude/screens-1b-queue` (bb94fce6).
* Not done from 1b, decided with the Lead in build-notes "Slice 1b": 1b-2 (Draft fields with AI on the form row; job.tsx folds in), `seed_library.cjs` stays SQL. 1c: pqr_pick lander and the rule-sourced field (N-1 is on main as contract v2.1; N-2 waits for #94).
* Running the checks: `/private/...` scratch scripts are gone with this session. Put node 24 on PATH (`.tools/node-v24.21.0/bin`), run `tsx --tsconfig api/tsconfig.json` for `.ts` checks (without it the decorators fail), and rebuild `web/` before browser checks. The five suites the forms replay touches (`check_ai_orchestration`, `check_forms_channels`, `check_forms_demo`, `check_forms_pdf_hardening`, `check_forms_slice2`) are the ones a door change can break.
* Ports: screens own 4440–4449 only (4460s are evidence's).

**Queue after (3) (P-173):** (4) linking combinations and copying a line (C1.3, C1.5).

**Not screens' (routed in the hand-backs):** runtime.ts "opened case <id>" (QA-74); engine/validate.ts messages with codes (QA-73); section meanings are release c1-v3 content (QA-71); QA-82 to forms W1-10 / S6 slice 1; qa's `check_qa_am_r69_1028.cjs:123` selects the person by the old label.

**Learned, not written elsewhere:**
- Bash here refuses heredocs, `$(…)`, loops and some long `&&` chains (merge-guard hook): write a script to the scratchpad and run it. The catalogue caches rows keyed on activity counts: a check that changes the database by SQL also inserts an `audit_event` row.
- Other lanes run this lane's checks under the same copy names and ports (`run-suites.sh` uses the usage lines), and all copies share one PostgreSQL server: two runs at once break each other. For reruns, use private names and ports (for example `<name>_mine` on 4460+), then drop those databases.
- Long or multi-line Bash commands (heredocs, `$(…)` in some forms, loops) are refused by the merge guard hook (`gh pr merge*` matcher); put edits in a script file in the scratchpad and run it with a short command.
- Run by-products land in the tree (other lanes' screenshots, `prototype/p2/*`, `prototype/studio/evidence/*`): restore them before each commit and stage only lane files.
- The Prisma client in `node_modules` is shared with other copies: after switching branches run `./node_modules/.bin/prisma generate` if a column is reported missing.
- An author's own names delete at once (P-116 amended): a check that needs the second-person path marks its names as another person's (`update program_def set created_by='user-C'`).

current_screen: W1-setup-checklist (3); #96 FIX handed back (49c175d0)
stage: FIX — Lead's PR #96 outside-review bugs (1)–(5), branch claude/screens-96-fix from origin/lead/2026-10-29-s2a + main 5f6c8deb (#94); done at 49c175d0, every named check green
owner: Lead
next_action: Lead folds claude/screens-96-fix (49c175d0) into #96; fresh screens session: (3) board v4 per founder-feedback-2026-10-30.md, then slice A after the founder's Go. (3), for the Lead: concept v3 (F1 P-161 (3) duties, F4 P-174 + contract v2 kinds), F1's two questions, F3 who builds slice C, F2 ask forms for the pages record first; then the founder's early look; on OK, slice A
then: (3) build after the Lead's OK → 1c (#94 is now on main) → 1b-2 → (4)
blocked_by: nothing
updated: 2026-10-30

## Log (last 10 lines)
- 2026-10-30 · W1-setup-checklist · applied Lead message: Lead moves to a fresh chat; Handover rewritten (#96 FIX done at 49c175d0; next board v4 per founder-feedback-2026-10-30.md, then slice A after the founder's Go); session stopped. US$0.
- 2026-10-30 · W1-shared-library (S6) · FIX for Lead PR #96 · applied Lead message: (1) Undo refuses (409) once the accepted draft changed (stamp of the landed rows); (2) grouped approval all or nothing in one transaction; (3) a reuse of a missing, retired or merged item refused (409) at decide; (4) document type identity by name and proves in sameInLibrary; (5) Undo kept on the empty-group page. Main 5f6c8deb merged (3 conflicts, both sides kept). Pass and fail tests in check_s6_p149 and check_s6_queue_browser. US$0.
- 2026-10-29 · W1-setup-checklist · DESIGN (3) → owner Lead · new branch claude/screens-checklist from main 0aeb22d7 with this file from 7a1f053b; fresh challenge of concept v2 (F1 duty table vs P-161 (3), pages are rules-only; F2 pages record not scheduled before this; F3 tabs are runtime's files, people card on two pages; F4 step 4 vs P-174 and contract v2 kinds; F5 C11.10 already "Works"); plan.md slices A/B/C. Official sources: nothing pending. No code. US$0.
- 2026-10-29 · W1-setup-checklist · applied Lead correction: concept not agreed; (3) is a fresh challenge + plan only, no code, for the founder's early look. Handover updated. US$0.
- 2026-10-29 · W1-shared-library → W1-setup-checklist · applied Lead message: 1b (bb94fce6) and the 1a fix folded into #96; next queue item (3), plan first. Handover rewritten for a fresh session (this one at ~70% context, founder's rule). No code. US$0.
- 2026-10-29 · W1-shared-library (S6) · EARLY-LOOK 1b FIX · Lead early look: toasts covered the side panel's footer; toaster moves beside an open panel (above its footer when the panel is full width), every side panel; browser step at 1440, 1024 and 800 proves Accept and Reject stay clear and clickable; check_s6_queue_browser 26/26. 1a fix 0a5b09dd: six named suites green on its own branch. US$0.
- 2026-10-29 · W1-shared-library (S6) · BUILD 1b → EARLY-LOOK · new session from e3483c7d, main a9fe60c0 synced (contract v2.1: three small fixes in 1a code); review-proposals.ts routes (queue grouped, decide, undo, grouped approval), door rules (bulk Ready only and never rules→library, reuse adds nothing, field-map items on their page, Undo back to waiting), To review group and batch rows, proposals.tsx (queue, side panel, batch page), answer list publishes; check_s6_p149 65/65, check_s6_queue_browser 23/23, check_screen02_slice1 passed, tsc clean, any 423, graph G4 0. US$0.
- 2026-10-29 · W1-shared-library (S6) · applied Lead message: 1a Lead check PASS (folded into Lead PR #96); next 1b. Handover rewritten for a fresh session (1b steps, what 1a gives it, owed items); this session's context is spent. No code. US$0.
- 2026-10-29 · W1-shared-library (S6) · BUILD 1a → CHECK · full run-suites 74 PASS 0 FAIL on 3d006452 (the first run's browser failures were this new copy's missing web build); check_s6_p149 37/37; graph G3 2 (older); migration clean on a copy of :4400 (no proposal rows there; the seeded replay covers every kind). US$0.
- 2026-10-29 · W1-shared-library (S6) · BUILD 1a · merged origin/claude/screens-2a-22c0e2 and main c545f84e; 50224b01: proposal_item table + migration (copies, drops rule rows, logs both; clean on a copy of :4400), proposals.ts one door (insertProposals, decide with landers, undo 10 s), readers switched; check_s6_p149 37/37; full run-suites running. US$0.

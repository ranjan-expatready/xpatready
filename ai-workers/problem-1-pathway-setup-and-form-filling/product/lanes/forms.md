# Lane: forms — PDF and online forms (P-61–P-63)

## From the Lead
2026-10-24 (Lead): Screen 01 merged into main (1cb174a6) and touches files you also changed (`api/src/forms.ts`, `engine/channels.ts`, contracts). Before the Lead check: sync main, resolve any conflict, rerun all your suites on lane ports, commit, and set CHECK owner Lead again with the new commit. Add to your next FIX pass: QA-15 (any case for form codes at capture start), QA-18 (engine branch coverage back above 85%: tests for twin.ts and the other new engine files). Stop isolated copies at the end of the stage.

Command: `/next forms` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_item: F1-forms-channels
stage: CHECK
owner: Lead
next_action: Lead check of the fixes on the exact commit: `build-notes.md` "Fixes" (finding → fix → test), `review.md`, `break-report.md`; rerun `zsh studio/tools/isolated.sh <name> <port> start && tsx studio/tests/check_forms_channels.ts <port> xr_studio_<name>` (106 checks, US$0) and the other suites. Decide: `id@screen-title` for reused element ids (F2 extension splits at "@"). Then merge (with `prisma generate` + `migrate deploy` of both F1 migrations on main) and set slice 2.
blocked_by: none
updated: 2026-10-23

## Log (last 10 lines)
- 2026-10-23 · F1 · FIX → CHECK · all review (1 Must, 10 Major) and break (9 Major) findings fixed with a test each, most minors too; F1 106/106, engine 38, rules 54, drafting 48, API 94, grounding 29, orchestration 19/22 (lane guard, slice 2); second migration (revision, checks, one pending merge) proven on a demo copy with its rollback. Owner → Lead.
- 2026-10-23 · F1 · CHECK → FIX · reviewer: ship after fixes, journey 5.5/10, 1 Must + 10 Major; breaker: 0 Blocker, 9 Major, 16 Minor (`review.md`, `break-report.md`).
- 2026-10-23 · F1 · EARLY-LOOK → CHECK · applied Lead note 2026-10-23 (backend path P-68; fresh lane copy bound to forms, own studio packages; reviewer :4451, breaker :4452).
- 2026-10-23 · F1 · BUILD → EARLY-LOOK · Slice 1 built (no UI, AI US$0): migration (additive; proven on a copy of today's data), capture contract, page and template readers, refusal of answers, second-person approval, fingerprint identity + difference, portal twin + review PDF, screen map without AI (PDF twin, aliases), channels + portal + derived filing method, validator rules, answer list `sex` end to end, aliases and reviewed merges, intake guard, check_ai_drafting fix. Tests: F1 66/66, engine 38, rules 54, drafting 48, API 94, grounding 29, orchestration 19/22 (lane double-link, not slice), browser 100/101 (200 ms budget under load). Owner → Lead.
- 2026-10-23 · Lead: challenge answered (all five accepted; P-65 aliases and merges added; A4 backend into slice 2); founder decided P-66 (extension both modes, structure-only capture, portal twin, form health). Set BUILD slice 1, owner Builder. F2 (working extension on saved screens) follows.
- 2026-10-23 · F1 · DESIGN · Founder asked (in this session) to fix the repeated hand-back block: renamed "Paste to Lead" → "Report to Lead", once per stage (CLAUDE.md, next, lead, screen-build, LANES, WORKFLOW); stop and session-start hooks now check the session's own copy (hook input cwd), so lane sessions no longer get the main copy's reminders. Lead files: merge needed to take effect. No stage change.
- 2026-10-23 · F1 · DESIGN · Builder challenge written: P-57 blocks captured portal screens (Blocker); online version = FormEdition with channel ONLINE and identity by content fingerprint; answer lists missing (mirror the team's EnumSet + ENUM map); portal per combination and a validator rule for each line's channel; PDF twins for IMM 0008/5669/5406 do not exist yet; ownership table and 3 slices. Owner → Lead. No code; AI US$0.
- 2026-10-23 · Lead: two items added for F1 after the AI repair recheck: (a) A4 speed and progress backend (reuse first, split by section groups, per-part progress, merge with near-duplicate flags; measured paid run needs the founder's go); (b) make `check_ai_drafting.ts` select the four refused IMM 1344 runs by name (it crashes when newer valid runs exist).
- 2026-10-23 · F1 · DESIGN · Lane created (P-64); concept written by the Lead.

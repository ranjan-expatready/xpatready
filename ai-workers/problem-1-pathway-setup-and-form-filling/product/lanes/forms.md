# Lane: forms — PDF and online forms (P-61–P-63)

## From the Lead
2026-10-23 (Lead): slice 1 early look done; from now on the **backend path** (P-68, `WORKFLOW.md`). Set stage CHECK: launch screen-reviewer and screen-breaker in parallel on slice 1 (contracts, data, migration on a data copy, roles and second-person rules, concurrency, hostile capture files, values refused); fix every Must/Blocker/Major; then owner Lead (the Lead reruns the suites on your exact commit and merges). Choices 1–5 and 7 accepted; 4: the PDF "mapped or not a fact" rule waits for the Screen 02/03 review UI; 6 goes to the screens lane. Slice 2 adds the evidence lane's IMM 1344 findings (`prototype/evidence-lane/E1/imm1344/STATUS.md`): F1 save the phone boxes' shown state or flag "a person ticks Canada/US", F2 never type signatures (validate after the person signs), F3 write values in the form's own format (postal code `A1A 1A1`); and the guard's link-hop fix (`p2/guard.ts`, with a test). The Lead tidies `concept.md` items 2 and 4 and fixes the shared database client in `lane.sh setup`.

Command: `/next forms` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_item: F1-forms-channels
stage: CHECK
owner: Builder
next_action: screen-reviewer and screen-breaker on slice 1 (backend path: contracts, data, migration on a data copy, roles and second-person rules, concurrency, hostile capture files, values refused); fix every Must/Blocker/Major; then owner Lead.
blocked_by: none
updated: 2026-10-23

## Log (last 10 lines)
- 2026-10-23 · F1 · EARLY-LOOK → CHECK · applied Lead note 2026-10-23 (backend path P-68; fresh lane copy bound to forms, own studio packages; reviewer :4451, breaker :4452).
- 2026-10-23 · F1 · BUILD → EARLY-LOOK · Slice 1 built (no UI, AI US$0): migration (additive; proven on a copy of today's data), capture contract, page and template readers, refusal of answers, second-person approval, fingerprint identity + difference, portal twin + review PDF, screen map without AI (PDF twin, aliases), channels + portal + derived filing method, validator rules, answer list `sex` end to end, aliases and reviewed merges, intake guard, check_ai_drafting fix. Tests: F1 66/66, engine 38, rules 54, drafting 48, API 94, grounding 29, orchestration 19/22 (lane double-link, not slice), browser 100/101 (200 ms budget under load). Owner → Lead.
- 2026-10-23 · Lead: challenge answered (all five accepted; P-65 aliases and merges added; A4 backend into slice 2); founder decided P-66 (extension both modes, structure-only capture, portal twin, form health). Set BUILD slice 1, owner Builder. F2 (working extension on saved screens) follows.
- 2026-10-23 · F1 · DESIGN · Founder asked (in this session) to fix the repeated hand-back block: renamed "Paste to Lead" → "Report to Lead", once per stage (CLAUDE.md, next, lead, screen-build, LANES, WORKFLOW); stop and session-start hooks now check the session's own copy (hook input cwd), so lane sessions no longer get the main copy's reminders. Lead files: merge needed to take effect. No stage change.
- 2026-10-23 · F1 · DESIGN · Builder challenge written: P-57 blocks captured portal screens (Blocker); online version = FormEdition with channel ONLINE and identity by content fingerprint; answer lists missing (mirror the team's EnumSet + ENUM map); portal per combination and a validator rule for each line's channel; PDF twins for IMM 0008/5669/5406 do not exist yet; ownership table and 3 slices. Owner → Lead. No code; AI US$0.
- 2026-10-23 · Lead: two items added for F1 after the AI repair recheck: (a) A4 speed and progress backend (reuse first, split by section groups, per-part progress, merge with near-duplicate flags; measured paid run needs the founder's go); (b) make `check_ai_drafting.ts` select the four refused IMM 1344 runs by name (it crashes when newer valid runs exist).
- 2026-10-23 · F1 · DESIGN · Lane created (P-64); concept written by the Lead.

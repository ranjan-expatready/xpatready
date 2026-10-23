> **History since 21 Oct 2026.** These rules no longer apply. Current rules: `AGENTS.md` (root) and `problem-1-pathway-setup-and-form-filling/product/WORKFLOW.md`.

# Workstream 2: the AI layer of Expat Ready

**Owner:** the founder. **Maker:** Claude Code (the Lead, AIW-D204). **Formal checker:** a separate fresh Claude Code or Codex session assigned by the founder (AIW-D247).
**Reset on 16 Oct 2026 (AIW-D192 to D194).** Start with [`NEXT.md`](NEXT.md). The current Solution 1 reading entry is the [one-pager](problem-1-pathway-setup-and-form-filling/solution-1-one-pager.html); its acceptance status is in delivery control. Project-wide access rules are in `../AGENTS.md`.

**Solution delivery, 18 October 2026:** follow the [reusable process](../playbook/solution-delivery.md). Solution 1's current artifact versions, integrated audit/correction status and acceptance gate are in its [delivery control](problem-1-pathway-setup-and-form-filling/delivery-control.md); read it before creating or reviewing derived artifacts. Each later solution gets the same lightweight control, with its own chosen format. The founder authorised this local process/discovery setup; Claude remains Lead and the formal checker role is unchanged. This does not start Solution 2 or accept any artifact.

## 0. Rules (every session, every agent)

1. **The direction (AIW-D192).** AI built into the product. **One module first:** pathway setup (Product Studio → Pathway Configurator, AIW-D200), the lead form, PQR and SQR, shared facts, document reading into confirmed facts, and PDF and portal filling. The AI layer grows from what this module teaches. Keep it lean: firm staff never get a new "worker" to manage.
2. **Every milestone ends with one visual artifact** the founder can take to the co-founder or the team to confirm decisions (§2). Fewer words, more pictures; plain business language; one made-up family as the example. Detail goes in an appendix, never in the main view.
3. **Decisions.** `decisions.md` is the record, append-only (a correction is a new row). A founder decision changes only with the founder's yes. Ask decisions **one at a time as selectable questions** (the interview tool): each option's consequence, one concrete example, and the Lead's recommendation marked (AIW-D127).
4. **The organisation of the AI is open (AIW-D193).** AI workers, case-stage agents, small skills in the case pipeline, or a co-pilot only: the options analysis compares them fairly. AIW-D124 (one assistant with shared skills) stands until the founder chooses.
5. **Current words (AIW-D173, amended by AIW-D200 and D201).** Expat Ready AI (the overall heading), Product Studio (the broad internal authoring area), Pathway Configurator (its first component), Case Flow, your assistant, the co-pilot, skill. The old words listed in `../archive/ai-workers-old-direction-2026-10-16/README.md` are never used in new work.
   **D202 explanation terms:** form, PQR, SQR, OCR upload, agent, PDF, portal. Agent means firm staff; distinguish an AI skill. PQR/SQR remain; repeated manual configuration is what the generated setup replaces. D203 amends the presentation: explain configuration/filling and wider AI organisation as independently readable propositions; state actual dependencies without forcing one pitch. Exact quoted source words stay exact.
6. **Truth.** Every fact cites its source: the team's requirement documents (newest `../sources/drive-snapshot-*`), the team's code (newest `../code/` copy), `decisions.md`, or `research/` with its evidence label. Anything else is labelled Proposal, Assumption or Unknown. Legal points: "Unconfirmed: no counsel" (AIW-D94). Immigration values come from the immigration specialist (AIW-D50). Never invent; never copy competitor content. **On the concept page (AIW-D209):** the main reading path carries no inline codes; each section ends with one grey sources line, the appendices keep every citation, and "Unconfirmed: no counsel (AIW-D94)" sits at each legal point. Content claims about the team's design are checked against the source documents before they go on the page (17 Oct audit).
7. **The archive is history.** `../archive/` is never current. Permitted reads: the archived AI-worker design for the organisation comparison (AIW-D193), and saved concept versions for the preservation audit (AIW-D203). Restored review copies remain historical references.
8. **Local only.** No commits, pushes, pull requests or issues; nothing written to Drive, email or any shared place (`../AGENTS.md`, enforced in settings). Publishing an artifact needs the founder's yes each time.
9. **No personal names** in any file: roles only (the founder, the co-founder, the team's product owner, a licensed consultant, Client A).
10. **Coach, don't follow blindly.** Challenge weak asks and our own earlier choices, briefly and with a recommendation.
11. **Checkpoint** at the end of each milestone, or when the chat grows long: about 30 to 40% of the context used, wherever the app shows it (AIW-D194). Then start a fresh chat with the line below. At a checkpoint: replace `NEXT.md` (under 500 words: what is done, the one next outcome, open items with owners), append one line to `PROGRESS.md`, then give the founder the fresh-chat line. End every final message with: **Continue Workstream 2 from ai-workers/NEXT.md. Work only on its next outcome.**
12. **Missing tools are never a limit (AIW-D258 and its correction).** If a tool, runtime, library or install is missing, never deliver lower quality, work around it silently or call something unconfirmable. Ask the founder at once with a concrete proposal (exact version, official source, checksum where published, location, purpose) and install on the founder's yes.

13. **Technology research and value (D278).** Follow `../AGENTS.md` → Technology decisions (the policy's single home). The [21 Oct comparison](research/technology-fit-and-adoption-2026-10-21.md) records current options, evidence classes and adopt/test/defer triggers. Recheck relevant rows when the decision changes; this is not a reason to restart the current outcome or add approvals.

## 1. Maker and formal checker (AIW-D194, maker amended by AIW-D198 and AIW-D204; review clarified by AIW-D247)

| | Maker: Claude Code (the Lead) | Formal checker: separate fresh Claude Code or Codex session |
|---|---|---|
| **Job** | Builds each milestone artifact, records decisions, keeps the files; supplies the exact revision and reviewer prompt at handoff | Reviews the saved revision within its stated scope; did not author that revision and does not inherit the maker's chat |
| **Writes** | Every project file (the only writer) | Only its own verdict line in `PROGRESS.md` |
| **Checks for** | Its own work against `decisions.md` before handing over | Invented or unsourced facts; contradictions with `decisions.md`; old words; anything a non-technical reader can't follow; missing edge cases |
| **Verdict** | Fixes every Material finding, then logs "ready"; never marks reviewed or accepted on its own | PASS, PASS WITH FIXES or FAIL on the exact revision; record session identity, tool/model if available, scope, evidence and numbered Material/Minor findings with file and line. Recheck material fixes on their new exact revision. |
| **Never** | Lets the checker's notes change a founder decision | Edits the maker's files, or re-opens a founder decision |

**The loop for every milestone:**
**Current demo direction (AIW-D269/D270, 20 Oct):** follow `NEXT.md` and the prototype's one requirement-coverage record. Show configuration/release → early document upload and proposed facts → remaining conditional questions → staff confirmation → inline form review → checked PDF download, then existing-client/case reuse. The founder authorised Codex to align planning records for this instruction; implementation remains the maker's work. Codex must not formally approve its own planning edits. No additional reviewer session or general implementation write lease is created. Demo priority: ASAP, no fixed date, full core behavior with solution/code/technology quality; no corner-cutting, full product rebuild or unnecessary framework work.

**Core demonstration priority (D272, 21 Oct):** document intelligence must turn mixed client/agent uploads into a source-linked, review-ready case-update proposal; staff confirmation then updates the shared facts and affected questionnaires, checklist and forms. Prove cross-document reconciliation and incremental uploads, not just OCR text. Keep the implementation and review rhythm lean. Detail lives in the one coverage/demo record; D271 canonically references the synthetic-reader approval previously also numbered D270-reader.

**Stack and maker handoff (D276/D277, 21 Oct):** use the current verified Expat Ready stack by default; saved captures show React/Vite/admin/form components and NestJS/Prisma/PostgreSQL, with live-branch equivalence still Unverified after failed checks. New technology needs a concrete gap and existing installation controls. One fresh Claude Code maker replaces the prior maker after its checkpoint/stop; the founder starts it and relays one consolidated assignment. This Codex reviewer reads saved exact-revision outputs. No extra maker/reviewer, automatic delegation or claim a session has started.

**First deliverable (D275, 21 Oct):** complete the dynamic configuration MVP first: real database-backed Super Admin authoring of canonical fields/sections/document requirements/conditions/checks, AI-assisted addition of another form with reuse/new/ambiguous normalization, human add/update/review/release and the common configuration-driven renderer. Show actual persisted records, rule-driven questionnaire/checklist/form changes and a supported PDF read-back example. Five sample programs and D274 sample/reset controls apply. Then finish the connected P5/P6/P7 persona journey. Choose technology by evidence and team reuse; full production readiness/equal effort remains unproven. Detail and acceptance stay in the one coverage/demo record.

**Product-experience completion (D274, 21 Oct):** the whole agreed prototype must work through the relevant Super Admin/configuration author, content/SME duty, separate approver, client/applicant and firm-agent screens using shared saved records. P5 starts with pathway/program/composition setup, form attachment and on-screen guarded AI invocation; it ends with confirmed facts and a checked PDF download. Five representative sample programs and labelled sample-input loading use normal application paths; scoped Reset removes demo-generated state/artifacts and preserves the engine, source evidence and append-only cost/review history. Product-quality interaction and layout are part of the existing milestone outcome; static P4 pages are intermediate evidence. Full screen/acceptance/reset detail stays in the one coverage/demo record. P6/P7 reuse/update proof remains. This local planning assignment does not transfer implementation ownership or approve the planning author's own edits.

**Current assignment (AIW-D267, 20 Oct 2026, amends the reviewer part of AIW-D266):** one maker session (Claude Code) and **one independent reviewer, the Codex chat that recorded the 15:36:18Z verdicts**, the sole formal checker; the separate Cowork reviewer session is no longer assigned. Earlier verdicts remain valid evidence. **AIW-D266 (history):** a Cowork reviewer session had been assigned for R4-M1, the P2 response and P3 + P4. Only the founder starts replacement sessions; the maker creates, forks, delegates to or messages no other session or subagent without the founder's explicit instruction, and at a checkpoint saves state and gives the founder one resume prompt. **Earlier assignment (D248), history:** Codex is the review coordinator for now; Claude Code remains maker. The founder relays prompts. Codex reviews saved maker outputs, reports material gaps and gives the next maker prompt; it requests a fresh reviewer session at the existing context checkpoint, when context is unreliable or where independence requires it. The root Codex session may not formally approve process instructions it authored. The [autonomous delivery procedure](../playbook/autonomous-delivery.md) replaces mandatory founder stops at internal planning/build/check steps; decision, access and milestone review requirements stand. At each handoff state Completed, Evidence/limits, Next owner/action and any Decision needed.

1. The maker builds the artifact and logs "ready for the formal checker" in `PROGRESS.md`. The handoff gives the exact artifact revision/hash, review scope, known conflicts/limits, evidence links and a copyable reviewer prompt. Its next action hands off to the assigned independent reviewer; it does not ask the maker to self-review.
2. The founder chooses Claude Code or Codex and relays the handoff to the already separate reviewer context, or starts a fresh review session or explicitly authorises fresh delegation when needed. D248 allows the assigned independent reviewer context to continue until the existing checkpoint, unreliable context or independence requires a fresh session. Record which session is acting. The same computer is sufficient; no remote host is required. A fresh delegated review was authorised for the draft 4.3 check. An extra peer review is optional, not a prerequisite or mandatory third session; a contributor who authored the revision cannot formally check it.
3. The formal checker reports its findings and appends its verdict, exact revision, scope, evidence and session identity to `PROGRESS.md`. The maker marks the review complete only from this recorded evidence; a missing or unverified check stays unverified. A passing review is not founder acceptance.
4. The maker fixes the Material findings.
5. The founder shares the artifact with the co-founder or the team.
6. The founder brings back their answers.
7. The maker records them as decisions, one question at a time.
8. The next milestone starts.

**Maker bootstrap (a new Claude Code chat in this folder; Opus, high effort):**
> Continue Workstream 2 from ai-workers/NEXT.md. Work only on its next outcome.

**Formal-checker bootstrap (a fresh Claude Code or Codex session with this folder connected; not the maker session):**
> You are the formal independent checker for Expat Ready Workstream 2, folder /Users/ranjansingh/Desktop/Xpatready. Read AGENTS.md, ai-workers/README.md sections 0 to 2, ai-workers/NEXT.md, the latest maker handoff in ai-workers/PROGRESS.md, and the decisions.md rows the artifact cites, including D246 as clarified by D247. Confirm your fresh session identity and that you did not author the revision. Review only the exact artifact revision and scope named by NEXT and delivery control; do not turn a targeted fix recheck into a general audit. Verify the revision/hash, inspect the applicable saved sources, reproduce relevant checks and inspect the UI where required. Distinguish inspected, executed and unverified evidence. Report PASS / PASS WITH FIXES / FAIL, numbered Material/Minor findings with file and line, evidence and limits. Append one verdict line to ai-workers/PROGRESS.md with UTC time from `date -u`, "Formal checker", your tool/model if available, session identity, revision/hash, scope and evidence. Write no other project files; do not edit maker files, change founder decisions or claim founder acceptance.

**Change log, 17 Oct 2026 (afternoon):** the Codex independent reviewer stopped at 12:05 UTC (credit); the separate Claude checker (the Cowork reviewer) continues the review role with the checker bootstrap above. No other rule changes.

**Change log, 19 Oct 2026 (AIW-D247):** the formal checker may be Claude Code or Codex in a separate fresh session. Maker handoff and recorded review evidence now identify the exact revision and reviewer session. One formal check is required; no mandatory third peer session. Earlier tool-specific wording remains history, not the current assignment rule.

**Change log, 19 Oct 2026 (AIW-D248):** founder assigns Codex review coordination and asks for researched autonomous execution. Current assignment and shared operating procedure added; Claude Code remains maker. No product acceptance or general authority to change founder decisions.

## 2. Milestones and the artifact each one gives the founder

The M0–M7 table is the broader workstream roadmap, not the prototype execution checklist. Current P0–P8 scope/status lives in delivery control, NEXT and the one coverage/demo record. Under D274, each in-scope persona must be able to complete its part of the same product journey; component test passes do not establish that outcome.

| # | Milestone | Artifact for the team or co-founder | Decides |
|---|---|---|---|
| M0 | **The concept** | Since AIW-D216, two documents, one per problem: `problem-1-pathway-setup-and-form-filling/solution-1-pathway-setup-to-form-filling.html` (active, Solution 1, AIW-D226) and `problem-2-ai-across-case-and-business/ai-across-case-and-business.html` (parked). v5 is archived | Direction agreed with the co-founder |
| M1 | **Options analysis** | One comparison page: how the AI is organised (AI workers, case-stage agents, skills, co-pilot), routes for filling PDFs and portals, what Visto really does, per-file vs per-use pricing | The organisation (AIW-D193, Q13); the filling route to ask the team for |
| M2 | **Module 1 solution** | Visual solution for Pathway Configurator, questionnaires and forms: every flow, screen sketch, use case and edge case | The team confirms the design |
| M3 | **Module 1 requirements (AW-03)** | The requirement pack for the team (stories, acceptance, change notes) with a one-page summary | The team's questions answered |
| M4 | **Module 1 proof plan** | Test sets, the timed pilot baseline, the AI-provider test | What "working" means before build |
| M5 | **Module 2: Case Flow skills** | Skills across the case lifecycle: what starts by itself, on/off, drill-down | The skills catalogue |
| M6 | **Module 3: the co-pilot** | What it can see and do, by role | The co-pilot scope |
| M7 | **Module 4: firm-wide and internal** | Leads, billing help, imports, reports, the internal support assistant | The remaining scope |

## 3. Current files and their purpose

Status lives in one place per subject: Solution 1's revision, audit, limitations and acceptance in its `delivery-control.md`; the next action in `NEXT.md`; events in `PROGRESS.md`; decisions in `decisions.md`. Generated pages are rebuilt from their authoring home, never edited by hand. Superseded files moved on 19 Oct 2026 are listed, with checksums, in `../archive/ai-workers/working-set-cleanup-2026-10-19/MOVES.md`.

| File or folder | Purpose |
|---|---|
| `NEXT.md` · `PROGRESS.md` · `decisions.md` · `assumptions.md` · `terminology-register.md` · `START-HERE.md` | The one next outcome · milestone history and append-only log · founder decisions, append-only · assumptions and accepted risks · one name per thing · a short entry page |
| `problem-1-pathway-setup-and-form-filling/` | **Active.** `delivery-control.md` (status home), `CLAUDE.md` (context list), `README.md`, `solution-1-one-pager.html` (the generated v3 spine), `truth-review-2026-10-17.md`, `inputs/` (raw, never edited). The v2 pack, workbook and prototype stay as reference material for the detailed pack; they are not aligned with v3 |
| `tools/s3/` | **Authoring home of the one-pager:** `s3_data.py` (content and rules), `s3_views.py` (diagram layout), `s3_terms.py`, `s3_panels.py`, `build_one_pager.py`. Checks `check_*.cjs` (`check_draft_4_3.cjs` targets the current corrections); one ledger script per revision (`*_ledger.py`); `make_publish_copy.py` and `publish/` (the copy behind the hosted link) |
| `tools/s2/` | Authoring home of the v2 outputs (`build_s2.py`). It also reads `tools/build_solution1.py` (styles), `tools/solution1-prototype.html` and the archived v8 page, so those stay; `solution1-main.html` and `solution1-open.html` stay beside the v1 builder |
| `tools/` (root) | Hooks: `session-start.sh`, `snapshot.sh` (never-lose copies into `../archive/ai-workers/snapshots/`), `stop-check.sh`, `exchange-count.sh`, `prompt-log.sh`, `freshness.sh`. `scrum-monitor-state.json` (the scheduled monitor's own state). `check_tests.py`, `check_evaluation_cases.py` and their latest JSON (for `requirements/tests/`). Kept as evidence for the parked Problem 2 page: `split_v5_into_problems.py`, `split_check.py`, `preservation_ledger.py`. `rea-research-freshness-2026-10-16.json`: unreferenced freshness record of founder-requested pilot research, kept (uncertain) |
| `checks/` | Review evidence. Current: `one-pager-draft-4-3-correction-2026-10-19.md`, its ledger and `one-pager-draft-4-3-evidence/`. Earlier draft responses, ledgers and check JSON (the suites rewrite the JSON on each run); screenshots cited by the audits; M0, v5 and v6 evidence |
| `illustrations/actor-handoff-demo/` | `evaluation-framework-2026-10-17.md` (the scoring rubric), `solution-1-deliverables-clarification-2026-10-18.md` (scope), `bpmn-viewer-18.16.0.min.js` (embedded by the builder). Frozen review evidence, never edited: `draft-4-validator-2026-10-18/` (Codex reviews, including `final-audit-4.2.md`, and the frozen 4.2 inputs), `integrated-audit-2026-10-18/`, and the earlier audits, notes and reviews it cites |
| `problem-2-ai-across-case-and-business/` | Parked (AIW-D216) |
| `requirements/` · `research/` · `commercial/` | Reference bank written before the reset (pre-reset words; `decisions.md` wins) · evidence with labels · pricing and cost work |

**Change log, 16 Oct 2026:** AIW-D198 changes the maker to Codex; the separate checker and local-only rules stand.

**Change log, 16 Oct 2026:** D200 delegates practical naming: Product Studio contains Pathway Configurator; scope and the other categories stand.

**Change log, 16 Oct 2026:** D201 confirms the Expat Ready AI heading, five areas and shared AI Controls; Q1–Q3 are answered.

**Change log, 17 Oct 2026:** D202 keeps PQR/SQR and clarifies complete configuration generation, terminology, client/agent/AI work and the connected story. M0 v4 uses the same active concept-page path; v3 page, builder and styles are archived. Intent audit: `research/m0-v4-intent-audit-2026-10-17.md`; current verification: `checks/m0-v4-verification-2026-10-17.json`. M1 comparison remains unperformed.

**Change log, 17 Oct 2026:** D203 records the preservation/terminology audit and recommends two independent propositions for v5. Findings: `checks/concept-content-preservation-2026-10-17.md`; names/aliases: `terminology-register.md`; restored references: `review/`. Active v4 is unchanged and frozen. Version rules remain in `../AGENTS.md`.

**Change log, 17 Oct 2026:** AIW-D204 makes Claude Code the maker after the Codex session stopped mid-checkpoint; Codex no longer writes shared files. The separate checker and local-only rules stand.

**Change log, 17 Oct 2026 (night):** M0 v5 built and passed the independent checker (three passes). Founder decisions D206–D211: two independent parts; build now, Drive later; hooks; clean main path; filler removed; barcode forms filled through their own data with a person validating.

**Change log, 17 Oct 2026 (day):** AIW-D212–D216. The v5 page and the engine page are split, unchanged, into one document per problem, each in its own folder with its own `CLAUDE.md` and `README.md`. `pitch-plan.md`, `m0-improvement-plan.md` and `review/` are archived. The working method for every workspace is `../playbook/README.md`. Always open Claude Code at the project root.

**Change log, 21 Oct 2026 (D274):** founder-authorised planning alignment by Codex for complete persona-based product experience, visible admin/AI setup, sample inputs, reset and five sample programs with their compositions. One coverage record and existing P5–P8 rhythm; no implementation, paid call or formal verdict.

Change log, 21 Oct 2026 (D275): founder-authorised Codex planning alignment prioritises the dynamic database-backed configuration MVP, form-addition normalization, human rule/definition authoring and common renderer as the first deliverable. Full persona journey and previous evidence retained; production reuse is a quality target, not qualification or equal-effort evidence.

Change log, 21 Oct 2026 (D276/D277): founder specifies current product stack as default and requests one fresh replacement Claude Code maker handoff. Saved stack inspected, live code equivalence Unverified; no installation, session creation or implementation performed by this planning update.

**Change log, 21 Oct 2026 (D278):** standing technology research/value gate linked to root instructions and the current advisory comparison. No implementation, paid comparison or new formal verdict.

---
name: qa
description: Independent tester for the Pathway Configurator - tests the merged app like a person (every capability, validation and error message, roles, recovery) and underneath (API, data, code coverage), explores for gaps, logs bugs and suggestions, and asks questions through the Lead. Modes /qa after-merge, /qa milestone, /qa capability <name>, /qa explore <area>, /qa with-me. Use when the founder or Lead types /qa, asks to test like a human, find bugs, check what works, or at a merge or milestone gate.
---

# /qa — independent testing, like a person and underneath

Home: `ai-workers/problem-1-pathway-setup-and-form-filling/product/` (P). Lane rules: P/`LANES.md`. Bars: P/`QUALITY.md`, P/`EXPERIENCE.md`, P/`STANDARDS.md`. Scoring per screen: skill **journey-test**. You never built what you test; you never fix app code.

## 0. Guard (first)
`bash P/tools/lane.sh whoami`:
* `lead` (main copy) → you are the Lead routing a founder request: continue the qa session (`SendMessage`) or start one, prompt `/qa <mode>` (Mac: `start_session`, own worktree, `source_branch` main; cloud: `create_session`, `source_revision` and `outcome_branch` = the qa lane's branch); tell the founder it is running. Stop.
* `unbound` → `lane.sh bind qa`. Another lane → "This is the <x> lane; /qa runs in the qa copy." Stop.
* `qa` → `lane.sh setup`, `lane.sh sync` (you test what is on `main`), read P/`lanes/qa.md` and its "From the Lead" note.

## 1. Modes
| Mode | Trigger | Scope |
|---|---|---|
| `after-merge` | Lead, after every merge of app code into `main` | Smoke of every Works capability + full test of the capabilities the merge touched (`git diff --stat <last tested commit>..main`) |
| `milestone` | Lead, before a milestone gate (WORKFLOW.md) | Every capability in P/`qa/CAPABILITIES.md` for the milestone, every role, coverage report, all suites rerun |
| `capability <name>` | Lead or founder | One capability or screen, in depth |
| `explore <area>` | Founder, Lead, or when time allows | Charter-based exploration (60 min): what a real author, RCIC, officer or client would try |
| `with-me` | Founder opens this session | Explore together: ask the founder one question at a time (AskUserQuestion, recommendation first), test what they point at, report as you go |

## 2. Test like a person: headed first, then headless (isolated copy, and the shared demo read-only)
Start your own copy: `zsh P/../prototype/studio/tools/isolated.sh qa_<run> <4470-4479> start`; load data through the product's own screens (Load sample only where the capability is not under test, P-33). Never touch :4400.
For each capability row: first walk it **headed** as its persona (browser pane or Playwright headed), using only what a person sees; then replay the same journey **headless** (Playwright) at 400, 1024 and 1440 px, twice, to catch flakiness. Also walk the main path **read-only on the shared demo (:4400)**: real accumulated data finds bugs a fresh copy cannot (QA-13); never create, release or reset there. Check: the task completes · every validation message appears on the field that caused it, in plain words · wrong input, empty, very long, non-English, duplicate, wrong role by URL, double click, reload and back mid-action, two tabs · the next step is obvious · data and audit line underneath (API or database) exactly as entered · keyboard only, 1024 px and 200% zoom, axe clean · timings vs STANDARDS §9.
Screenshot each decision point and every defect (`P/qa/reports/<date>-<mode>/`).
**Against requirements and decisions:** every capability row names its sources (SA-1B / one-pager IDs from P/`history/TRACE-SA01B-2026-10-23.md`, P-decisions). For each, check the behaviour against the requirement and against our decision; where our decision differs, ours applies (P-70) and is what you test. Run `bash P/tools/decision-impact.sh`: a product decision with no capability row is a Gap finding (P-74).

## 3. Test underneath
* Rerun every suite on the exact commit (`bash P/tools/run-suites.sh`, or read the CI run of the Lead pull request that merged it, P-85); report red suites first, with the failing check.
* **Graph** (P-86): `node P/tools/graph.mjs --write`, commit P/`qa/GRAPH.md`; every gap new since your last report becomes a P/`qa/BUGS.md` row (Gap) or one line in the report saying why it stays (API-only slice, scaffolding). Name capability ids (`C1.6:`) in your checks' labels.
* API probes: each endpoint the capability uses, valid and invalid payloads, wrong role, stale version, concurrency (two requests at once); Problem Details shape and message.
* **Coverage** (c8, P-69): run the API server under c8 while the API and browser suites click through it, then `c8 report`. Report line and branch % for `api/src` and `engine/`, and list business rules (concept BR-n, decisions) with no failing test. The floor may only rise; a fall is a Major finding.
* Turn every bug you find into a replayable check in `prototype/studio/tests/qa/` (Playwright or API script) that fails today and passes when fixed.

## 4. Record
* **P/`qa/CAPABILITIES.md`** — one row per capability: status Works / Broken / Partial / Not built / Not tested, last tested commit and date, evidence. Keep under 100 lines; detail goes in reports.
* **P/`qa/BUGS.md`** — open findings only: QA-n · **type** (Bug: built but wrong · Gap: requirement or decision not met or not built · Conflict: behaviour, requirement and decision disagree · Ambiguity: the requirement or decision is unclear, phrased as a question · UX: works but confusing, slow or unclear words) · severity (Blocker, Critical, Major, Minor) · capability · requirement or decision ID · steps · expected · actual · evidence · found on commit · owning lane (your best guess; the Lead assigns). Closed bugs move to P/`history/`. Before a new row, check P/`scout/FINDINGS.md`: a scout finding already there gets your evidence, not a second row.
* **Report** `P/qa/reports/<date>-<mode>.md` (under 150 lines): verdict, what works, bugs, coverage, journey scores where a screen was walked, what you could not test, **Questions for the Lead**, **Suggestions** (each labelled *Needed for the proof* or *Later* (P-26) and *Capability* or *Scaffolding* (P-33); never build them).
* D17 and D20 need an intended user: you may simulate, never award them.

## 5. Hand back
Update P/`lanes/qa.md` (stage WAITING, owner Lead, next action, one log line), commit on your branch (`qa: <mode> — <summary>` + attribution line) and push it (P-82), end with one block:
```
Paste to Lead
Lane: qa · Run: <mode> on main <short hash> · Commit: <short hash>
Verdict: <ready / not ready, one line>
Bugs: <n Blocker · n Critical · n Major · n Minor> (new: QA-…)
Coverage: api <l>% lines / <b>% branches · engine <l>% / <b>% (floor <x>%)
Questions: <one line each, or none>
```
Blocker or Critical → the Lead stops the affected lane's next merge or DEMO until fixed and retested.

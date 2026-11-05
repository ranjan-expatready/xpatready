---
name: qa
description: Independent tester for the Pathway Configurator - tests the merged app like a person (every capability, validation and error message, roles, recovery) and underneath (API, data, code coverage), explores for gaps, logs bugs and suggestions, and asks questions through the Lead. Modes /qa after-merge, /qa milestone, /qa capability <name>, /qa explore <area>, /qa with-me. Use when the founder or Lead types /qa, asks to test like a human, find bugs, check what works, or at a merge or milestone gate.
---

# /qa — independent testing, like a person and underneath

Home: `ai-workers/problem-1-pathway-setup-and-form-filling/product/` (P). The way of working: P/`WAY-OF-WORKING.md`. Bars: P/`EXPERIENCE.md`, P/`STANDARDS.md`. Scoring per screen: skill **journey-test**. You never built what you test; you never fix app code.

## 0. Guard (first)
`bash P/tools/lane.sh whoami`:
* `lead` (main copy) → you are the Lead routing a founder request: continue the qa session (`SendMessage`) or start one, prompt `/qa <mode>` (Mac: `start_session`, own worktree from main; or a cloud session from main); tell the founder it is running. Stop.
* `unbound` → `lane.sh bind qa`. Another lane → "This is the <x> lane; /qa runs in the qa copy." Stop.
* `qa` → `lane.sh setup`, then `git fetch origin && git merge --no-edit origin/main` (you test what is on `main`); read the message that started you and the open `qa/BUGS.md` rows.

## 1. Modes
| Mode | Trigger | Scope |
|---|---|---|
| `after-merge` | Lead, after every merge of app code into `main` | Smoke of every Works capability + full test of the capabilities the merge touched (`git diff --stat <last tested commit>..main`); re-score in the same round every row the merged PRs name in their titles or mark in `qa/built/` (P-219, P-221); delete each `qa/built/<ID>.md` you re-score |
| `milestone` | Lead, before a milestone gate | Every capability in P/`qa/CAPABILITIES.md` for the milestone, every role, coverage report, all suites rerun |
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
* **P/`qa/CAPABILITIES.md`** — one row per capability: status Works / Broken / Partial / Not built / Not tested, or "Built, awaiting qa" (set by a builder, P-219; only qa moves it on), last tested commit and date, evidence. **A row moves to Works only when its pack is green on main's head on GitHub's runners on the data its verdict counts on (the six for setup rows, the configured checkpoint for release and case steps, P-322), with that run id in the row (P-339). The protected set must run it on that same data; until it can (B77), hold a checkpoint row from the six run ("<id> checkpoint row (P-322): not run on the six; red on the six in run <six run id>; Works on checkpoint run <checkpoint run id>" (works-set.mjs reads a hold only when it says "red" and names a run id or QA-nnn)) instead of demoting it. A Works row red on main on its own data is held in P/`qa/REGRESSION-HELD.md` and re-scored.** Keep under 100 lines; detail goes in reports.
* **P/`qa/BUGS.md`** — open findings only: QA-n · **type** (Bug: built but wrong · Gap: requirement or decision not met or not built · Conflict: behaviour, requirement and decision disagree · Ambiguity: the requirement or decision is unclear, phrased as a question · UX: works but confusing, slow or unclear words) · severity (Blocker, Critical, Major, Minor) · capability · requirement or decision ID · steps · expected · actual · evidence · found on commit · owning lane (your best guess; the Lead assigns). Closed bugs move to P/`history/`. Before a new row, check P/`scout/FINDINGS.md`: a scout finding already there gets your evidence, not a second row.
* **Report** `P/qa/reports/<date>-<mode>.md` (under 150 lines): verdict, what works, bugs, coverage, journey scores where a screen was walked, what you could not test, **Questions for the Lead**, **Suggestions** (each labelled *Needed for the proof* or *Later* (P-26) and *Capability* or *Scaffolding* (P-33); never build them).
* D17 and D20 need an intended user: you may simulate, never award them.

## 5. Hand back
**Report to the current Lead (founder, 6 Nov):** after each step, label, blocker or question, SendMessage the current Lead one line: its session id and title come from `bash P/tools/current-lead.sh` (else ListAgents' highest "Lead N ·" that is not "(ended)" or "standby"). The PR comment stays the record; a cloud lane that lists no Lead posts the comment only.
Commit your report and `qa/BUGS.md` rows on a branch `claude/qa-<word>` from main (`qa: <mode> — <summary>` + attribution line), push, open a PR (`gh pr create --base main`) and label it `review: approved` (records only; it merges by itself on green CI). Reply once, briefly: the run (mode, main commit), verdict (ready or not, one line), bugs (n Blocker · n Critical · n Major · n Minor, new QA-…), coverage, questions.
A Blocker or Critical goes to the top of the backlog: the tech lead holds merges in that area until it is fixed and retested.
**Finish the round, then hand over (P-218):** from 60% context start no new round, finish the one in hand, write a Handover comment on your records PR and stop; hard stop at 80%. Commit your own checks with the records PR, never in a stash (cloud copies are lost).

## Gate A (P-317, P-348 (3))
A PR that claims Works is labelled only after your PASS on its own isolated copy, on the data its verdict counts on (P-322). The walk is by screens only and ends at the **next capability's first step**, not at the row's own last assertion: a green pack whose output the next step cannot use is a FAIL. A Major with no failing step still names its nearest capability, so gate B sees it.

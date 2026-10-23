# Checker prompt: Solution 1 one-pager, draft 4 (cohesion and correction pass)

Paste the block below into the existing separate checker session (the Cowork reviewer, README §1), with the folder `/Users/ranjansingh/Desktop/Xpatready` connected.

---

You are the independent checker for Expat Ready Workstream 2, folder /Users/ranjansingh/Desktop/Xpatready. Read AGENTS.md, ai-workers/README.md sections 0 to 2, ai-workers/NEXT.md, the latest Lead line in ai-workers/PROGRESS.md, and decisions AIW-D215, D229, D233, D235, D236, D244 and D245 in ai-workers/decisions.md.

**Target:** `ai-workers/problem-1-pathway-setup-and-form-filling/solution-1-one-pager.html`, v3 draft 4. Verify first that its SHA-256 equals the hash in the latest Lead line of PROGRESS.md; if not, stop and report the mismatch. A verdict covers only that exact revision.

**Inputs to check against:** the integrated audit (`ai-workers/illustrations/actor-handoff-demo/integrated-audit-2026-10-18/report.md`, `intent-and-source-coverage.md`, `panel-review.md`); the maker's response (`ai-workers/checks/one-pager-draft-4-maker-response-2026-10-18.md`); the content ledger (`ai-workers/checks/one-pager-draft-4-content-ledger-2026-10-18.md`); the evaluation framework, now seven lenses (`ai-workers/illustrations/actor-handoff-demo/evaluation-framework-2026-10-17.md`); the team sources the corrections cite (AG-07 v2.9 BR-10/BR-20/BR-31/AG-7-45, SA-01B v1.4 SA-1B-67, in `sources/drive-snapshot-2026-10-13-1535/`).

**Do:**
1. Recheck each Material finding M1–M6 on the new revision, and S4/S5: closed, partly closed or open, with file and line or panel id. Challenge the maker's dispositions and the audit itself; say where either is wrong.
2. Read all 57 detail panels (extracted text: `ai-workers/checks/one-pager-draft-4-panels/all-panels.md`; or open them) for regressions and for cross-level agreement between the overview map, the BPMN views, panels, rules, examples, exception paths and acceptance checks.
3. Apply lens 7, functional language and consistency: precise actor/action/object/condition/result; one term per thing (section, field definition, person's value, mapping, form, case, filing); consistent obligation and certainty (required/optional, proposed/agreed, implemented/unverified); clear references ("it", "they", "latest", "complete", "approved"); no repetition. Test: could two reasonable readers derive materially different behaviour?
4. Visual regressions: inspect screenshots at 1440, 1280, 768 and 375px in light and dark (overview, Shared records at 375px, all seven views and the BPMN overview at natural size, a few panels, tooltips, tables on a phone). Passing tests do not establish visual quality. You may run `node ai-workers/tools/s3/check_one_pager.cjs`, `check_panels.cjs`, `check_cohesion.cjs` and `check_diagram_geometry.cjs`; they write only into `ai-workers/checks/`.
5. Score the whole page on the seven lenses (1–10 each, with evidence, gap and smallest next action), plus the three headline summaries (solution, communication, high/medium requirements). No average; a material defect is not hidden in a score.

**Write:** one verdict line appended to `ai-workers/PROGRESS.md` (UTC time from `date -u`, "Independent checker", PASS / PASS WITH FIXES / FAIL, findings numbered Material or Minor with file and line, the seven scores). If the findings do not fit one line, also write `ai-workers/checks/one-pager-draft-4-checker-review-<date>.md` and link it from the line. Write nothing else; never edit other files; never re-open a founder decision.

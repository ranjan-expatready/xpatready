# How we work (lean model, P-224, from 1 Nov night)

The one page a builder reads; it replaces the swarm (P-220), the team board and the where-checks-run rows (P-181…P-215). Why (1 Nov): 81–85% of PR time was queue wait, 37% of batches failed, 39% of commits were records.

## Roles
| Role | Who | Owns |
|---|---|---|
| **Product owner** | the founder | direction, product decisions, money |
| **Tech lead** (no app code) | one Lead chat on the Mac (`/lead`) | shapes rows ahead, answers questions in batches, reads diffs touching migrations, money or permissions, updates records daily, talks to the founder |
| **Builders** | cloud sessions the tech lead starts, one fresh per row (`/next <area>`) | one row each, end to end |
| **Reviewer** (never builds) | fresh agent `screen-reviewer`; plus `screen-breaker` for screens, money, permissions, schema | Approve or Block, once per PR |
| **qa** (never fixes) | one cloud session (`/qa <mode>`) | tests `main` like a person; `qa/BUGS.md`, `qa/CAPABILITIES.md` |
| **Evidence** | Mac session, when needed | official forms, Adobe checks, `sources/`, `code/` |
| **Outside check** | Devin, weekly | report-only findings into `inbox/` |

The Mac runs only the tech lead and the :4400 demo (plus evidence work on request). No fixed builder count: the tech lead adds builders while batch failures stay under 10% and approved-to-merged under 1 hour, and removes them when either breaks. Areas (screens · forms and AI · runtime · evidence) are file ownership; row owners are at the top of `BACKLOG.md`. Ports: tech lead 4420–4429 · runtime 4430–4439 · screens 4440–4449 · forms 4450–4459 · qa 4470–4479. The demo is :4400 and is never used for tests.

## The loop, one row at a time
1. **Ready.** The row has its acceptance test, its text ("Done when") and every founder decision it needs answered; no build on an open question. A new screen part needs a board and the founder's early look, or the tech lead's approval after an independent challenger when there is no board (P-223 (4); skill **screen-concept**).
2. **Build.** Own worktree, own branch from `origin/main`, own files. Read → plan in the PR body → implement. Never build on an unmerged PR; split anything bigger than a row (unfinished work merges switched off).
3. **Check.** Locally `bash P/tools/run-suites.sh --changed origin/main..HEAD` exits 0 (judge by the exit code, not the output). The PR's own GitHub check then runs its affected suites.
4. **Review.** The reviewer agent once, at the end, on the exact commit; the breaker too for screens, money, permissions, schema. Fix every Blocker and Major with a fail test; fix the Minors or list them in the PR.
5. **Merge.** Merge `origin/main` in, re-run the touched suites, push, then add the label `review: approved`: Mergify queues and merges it. Any later push needs a new review and the label again. Records-only PRs are merged by the tech lead directly.
6. **Done.** The row's acceptance test is green on `main`, the demo shows it, and qa has passed it: no row counts as Works without qa (quality is never traded for speed).

**WIP:** a builder starts a new row only when its last one has merged; meanwhile it fixes its red checks and review findings.

## Every PR
* **Title** names the capability IDs it moves (`forms: C11.15 — …`); the first line says "migration" or names a changed shared contract.
* **Body:** what and why, the plan, checks and results, before/after screenshots for anything visible, "On the demo:" (page at :4400 and what to try), the cost (US$0 unless approved), context share, "Questions" with your recommendation.
* Adds `qa/built/<ID>.md` per capability it finishes (one line: the PR and what a person can now do; P-221).
* **Builders never edit** `STATE.md`, `DECISIONS.md` or `qa/CAPABILITIES.md`; status goes in the PR body; the tech lead updates the records daily.
* Every business rule has a passing and a failing test; check labels name the capability IDs they prove (`C1.6: …`); `node P/tools/graph.mjs --check` passes; explicit `any` must not rise (`count-any.mjs`).
* A wait a test relies on fails loudly when it times out (no `.catch(() => undefined)` after a wait).
* Screens use skill **screen-build**. Minor bugs go in one PR per area per day.

## Shared files
Schema: one migration in flight at a time, read by the tech lead. `contracts/`: owned by the area that created each (`contracts/workspace.ts`: the forms-in row owner). `api/src/studio.ts`: additive only. Changes to any of them are named in the PR's first line.

## Where checks run
Every PR and every merge-queue batch runs its affected suites on 4 GitHub Linux machines at once (free: the repository is public). The nightly full run judges speed budgets (P-215); it stays on the Mac until moved to GitHub. Mergify checks up to 3 batches at once (up to 6 PRs each, 2-minute fill). Fallbacks, repository variables: `PR_RUNNER=mac`, `BATCH_RUNNER=mac`.

**A test failing without a code cause is quarantined at once** in `tools/run-suites.sh` (`QUARANTINE`) with its evidence and fix row; nightly still runs it (P-205).

## Questions and stuck
Never wait for a human: put the question in the PR under "Questions" with your recommendation and carry on with what is not blocked; stuck for 10 minutes, ask rather than retry blindly. The tech lead answers in batches, product questions going to the founder one at a time. Disagree with evidence in the PR or in `screens/<item>/challenge.md`; never deviate silently.

## Spend tokens like money (founder, 1 Nov)
Read only the line ranges you need; run only your files' suites; one reviewer run per commit; helpers only for real parallel work; cheaper models for read-only searches; one PR comment per change of state.

## How the tech lead handles a founder ask (founder, 31 Oct)
(1) **Restate** the ask and the decision it serves; if unclear, one question at a time, with a recommendation. (2) **Evidence first:** all our history, not one sample; outside claims from primary sources; evidence marked apart from estimate. (3) **Challenge:** say no, name knock-on effects on other screens, areas or rows, or "no clean solution as asked". (4) **Recommend** with trade-offs, in plain words. (5) **Act** on agreement for anything bigger than a small fix; record it in `DECISIONS.md` or the backlog.

Principles: don't follow blindly; evidence, not vanity numbers; simple, no quality cut; feature by feature, in users' order; small justified spend (about US$5–10 a month).

## Product rules (still in force)
* `main` always works: a red check on `main`, a failed demo update or a qa Blocker is fixed before anything else.
* **Reuse, never rebuild:** filling and barcodes (`prototype/p5/fill.py` via `studio/api/src/fill.ts`; `prototype/evidence-lane/E1/tools/`); research on filling, reading or AI drafting starts from `E1/*/STATUS.md`, `prototype/p1`–`p5`, `prototype/expected/source-text/`, `research_notes/`, `reports/`.
* Capability or scaffolding for every element (P-33); the scope test for every finding (P-26); no control cut (P-60). Re-check an agreed but unbuilt screen against `main` before building it (R-109).
* **Demo story** (P-93, `DEMO.md`): a feature is done only when it shows in the story.
* D17 and D20 need an intended user: the scores are never self-awarded.
* **Disk:** below 10 GB free, remove finished copies whose work is pushed (`tools/disk.sh`); never the main copy, the demo copy, `.tools`, `sources/` or `code/`.
* Decisions go in `DECISIONS.md`, one line each, appended, never rewritten. **Process frozen until 15 Nov** (P-224): a change before then needs measured evidence and the founder's OK; after that, at most one a week. Instruction files stay short (skills and agents under 100 lines, 10 KB).

## Daily measures (tech lead)
Rows reaching Works · median approved-to-merged time · batch failure rate (target under 10%) · bugs found after merge · AI spend. Rising bugs after merge send the cause back. Demos and briefs on demand; unasked only for a decision, risk or spend.

## Guards (unchanged)
* **Push guard** (`.githooks/pre-push`, CI): never commit `sources/`, `code/`, `archive/`, PDFs, databases, logs or secrets.
* **Merge guard:** no merge without green CI and the reviewer's Approve on the current commit.
* **Live AI is off on every copy.** Never set `*_LIVE=approved` by hand (only through `run-suites.sh` or a test's usage line, which pair it with the fake launcher, P-192); never click a priced button. A paid run needs the founder's Go with the cost stated first; every call goes through the spend ledger.
* **Official sources:** immigration values cite page, quote and date (P-170), or come from the immigration expert; anything else is labelled Sample with a row in `ASSUMPTIONS.md` the same day. Legal points: "Unconfirmed: no counsel".
* **No personal names** in files; roles only.
* `sources/`, `code/` and `archive/` are read-only references.
* **Never force-push** or rewrite history; commit and push only on your own branch.
* **New technology** only through `STANDARDS.md` §1 with the founder's OK, recorded in `ENVIRONMENT.md`.

## Where things live
The file map is in `PRODUCT.md`; the bar is `STANDARDS.md`, `EXPERIENCE.md`, `QUALITY.md`. `lanes/` and `history/` are history.

# Devin prompts — the founder pastes one into Devin when the Lead says so (P-182)

Devin is the outside checker, report only (P-146): it never edits app code or rules, never pushes `main`, writes no fixes. The Lead picks its report up from `inbox/` at the start of every `/lead` chat, or when the founder says "check Devin". Each prompt below is complete: paste it as it is. Work given to Devin is checking that tools and patterns do well (running suites, scanners, screen walks, list comparisons); product judgement stays with the Lead and the founder.

**Every prompt starts with this block (paste it first):**
> This repository (xpatready on GitHub), newest `main`. Read `AGENTS.md` and `ai-workers/problem-1-pathway-setup-and-form-filling/product/inbox/README.md` and follow its drop format exactly. Report only: change no file except your one inbox file; push one branch `devin/<yyyy-mm-dd>-<topic>` from `main` with that file; open no pull request. Never set any `STUDIO_*_LIVE` variable or any AI API key: every check is US$0 with the saved answers. Set up with `bash ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/cloud-setup.sh`. Every finding cites evidence (file and line, failing command and its output, or a screenshot path in your branch) and a suggested lane (screens, forms, runtime, qa). Plain business words; no personal names. Check `qa/BUGS.md` first: a known bug gets your evidence, not a new id.

## D1 · Look and usability walk (after each merge to `main` that changes screens)
Start the app (`zsh ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/start.sh`, then Demo › Reset and Load sample). Walk every page the newest merges changed (list them from `git log -5 --stat main`), as a content publisher who has never seen it, at 1024 and 1440 px wide. For each page compare with its board under `product/screens/*/design/` and its concept: words a basic user understands, one clear next step, nothing cut off or overlapping, the same button colour and sizes everywhere (P-180: brand blue `--color-primary`), keyboard reachable, focus visible. Run axe on each page. Report each difference with a screenshot of the page and of the board.

## D2, D3 · parked until the product goes to production (founder, 31 Oct)
The security and technology review (D2) and hard testing on Linux (D3) wait until the end-to-end product is being readied for production; their full text is in git history (this file before 31 Oct).

## D4 · Capability gap check (before each milestone gate)
For every row of `product/qa/CAPABILITIES.md` with status Works or Partial: find the page, the API route and the test that prove it (`product/tools/graph.mjs` helps). For every decision in `product/DECISIONS.md` from P-149 on: find the capability row that cites it. Report rows with no test, decisions with no capability, and capabilities marked Works whose test does not check what the row says.

## D5 · Explorer: a 3–4 hour independent bug and gap hunt (on demand; runs without approvals)
You are an extra pair of hands for the tech lead: a junior tester and reviewer who forms an independent view. Do not trust our notes or test results; check everything yourself against the running app and the code. Work alone for 3–4 hours without asking anyone anything: when unsure, choose the safer reading, write the doubt down as a question, and carry on.

**Set up (once):** `bash ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/cloud-setup.sh`, then `zsh ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/start.sh`; open http://localhost:4400 in a headless browser (Playwright is in `prototype/studio/node_modules`). Use Demo › Reset, then Load sample. If a step fails, record the exact command and output as finding 1 and keep going with whatever works.

**Save as you go:** create your inbox file at the start and push your branch `devin/<yyyy-mm-dd>-explorer` after each part below, so nothing is lost if you stop early.

**Part 1 · Walk the product like its users (about 90 min).** Read `product/PRODUCT.md` (what the product is and its words) and the Features table in `product/BACKLOG.md`. Then, as a content publisher who has never seen the app, try to do each feature marked done or in progress: set up a combination from Program structure to release; bring a form into the library; review and release; open a case, answer as the client on the family link, confirm facts as the officer, fill a form. Try the unhappy paths too: empty fields, very long text, the back button, two tabs at once, a second person approving their own change, reloading mid-way. For every problem: what you did, what you expected, what happened, a screenshot path in your branch, and how serious it is for a real user (Blocker, Major, Minor).

**Part 2 · Check our claims (about 60 min).** For each row of `product/qa/CAPABILITIES.md` marked Works: try it yourself in the app and say whether it really works as the row says. For rows marked Partial or Not built that the app seems to do already, say so. Check `product/qa/BUGS.md` first: for a known bug add your evidence, never a new id.

**Part 3 · Look for surprises before they happen (about 45 min).** Read the newest 30 merged pull requests (`git log --merges -30 main`) and look for: two features that will collide, pages whose words disagree, places where one change will break another screen, tests that do not check what their name says, and anything slow (any page that takes over 1 s to show).

**Part 4 · Review how we work (about 30 min).** Read `AGENTS.md`, `CLAUDE.md`, `product/WAY-OF-WORKING.md`, `.claude/skills/lead/SKILL.md`, `.claude/skills/next/SKILL.md`, the newest 20 lines of `product/DECISIONS.md` and `product/STATE.md`. As an outside engineer, list what will slow us down or let bugs through (for example: one Mac runs every check one at a time; cloud builders cannot message the tech lead; small PRs each wait for a check), and propose up to five concrete changes, each with the evidence that it would help and its cost.

**Report:** your inbox file, newest findings first, grouped by Part, each with evidence and a suggested owner (screens, forms, runtime, qa, tech lead). End with a top-10 list of what the tech lead should look at first. The tech lead reads it, keeps what holds up, and turns it into backlog rows; you do not fix anything.

## When the Lead asks for which
D1 after a screens merge · D4 before each milestone gate · D5 whenever the founder has Devin free for a few hours (bypass mode is fine: the common block keeps it report-only and US$0). The Lead says "send Devin D<n>" in its reply; the founder pastes the common block plus that prompt.

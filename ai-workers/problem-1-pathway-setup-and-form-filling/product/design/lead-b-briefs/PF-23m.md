# Brief: PF-23m, plain error-message log calls onto the structured logger (cloud builder lane; row owner Lead B)

Start **after PF-23 (#1759) has merged, and only when no open PR touches any file on your list.** Check this at start (step 0 below). BK-25 and BK-26 merge first, and `api/src/case-prepare.ts` needs the release holder's baton. These are case-side files; the release holder OK'd the touch list as their owner (Lead 48, 14 Nov) on three conditions, which are binding here. Paste into a new cloud session on the repository (default branch `main`):

---
You are a builder for the Expat Ready Pathway Configurator. Run `/next runtime PF-23m` and take **one row, PF-23m**, end to end on a fresh branch from `origin/main`, one PR.

**The row:** `product/BACKLOG.md` row **PF-23m** (rows rev 16.1). Read only these with it: #1759's reviewer comment 6878168159 (its "also open" paragraph), and on `main` `api/src/platform/observability/` (`logPort`, `redact.ts`) plus each call site you change.

**Step 0, before any edit:**
1. List every call site: `git grep -nE "console\.(log|error|warn|info)\(.*(e|err|error)\.message" -- 'prototype/studio/api/src'`. Leave out `api/src/platform/`, which PF-23 already covers.
2. For each file on that list, check the open PRs (GitHub API: each open PR's files). **If any open PR touches a listed file, stop and post a comment headed "Question for the tech lead"** naming the PR and file. Don't start until it has merged.
3. **`api/src/case-prepare.ts`:** ask the release holder for its baton in that comment, and don't touch it before the answer.
4. Paste the list and the open-PR check into the PR body.

**What to build (the release holder's three conditions):**
1. **One-line call-site changes only, no logic moves.** Each `console.*(… e.message …)` becomes `logPort.error("<event-name>", e, { <ids only> })`, where the event name is a short kebab-case name for that site and the ids are the record ids already in scope there. Never a name, an email, a message body or an answer. Add an import line only where the file has none. A site that can't be changed in one line → leave it, and list it in the PR body.
2. **A check that keeps them out:** `tests/check_pf23m_log_calls.ts` runs the step-0 grep and fails on any hit outside the listed exceptions (pass: today's tree; fail: a seeded file with `console.error(e.message)`). Then, at each moved site, a seeded person's name in a thrown error never reaches the captured output. Where a site can't be reached from a test, the PR says so.
3. **Diff-only re-reviews** (P-277).

**Touch list (nothing else):** the step-0 call sites (one line each, plus an import line where needed), `tests/check_pf23m_log_calls.ts`.

**Must still be true:** every existing suite, the demo reset, the checkpoint load (C10.1) and PF-23's no-personal-data CI check pass unchanged. No behaviour change: same exit codes, same HTTP answers.

**Duplicate check (P-526):** BACKLOG, open PRs (`logPort`, `console.error`), BUGS; one `Duplicate check:` line.

**Reviewer only (no breaker).**

**Rules (standard, every PF/FO brief):** P-559: firm tables, real sign-in and billing are ours in the PF/FO modules (amends P-335/P-357). One row, one session, one PR; new files only outside the one migration folder. Opus reviewer (P-303); re-review reads only the diff (P-277); label `review: approved` only after `Reviewer: Approve <sha>` and green CI (P-277, P-385); merge `main` only on a conflict (P-270). **Before asking for the label (rows rev 16, Lead 47: 4 of 4 labelled PRs went red after the label on 14 Nov):** run, on `main` merged into your branch, the suites of every CI part that was red on any earlier head of this PR, plus every suite in the shard that shares the demo database with yours, and paste the result lines in the PR. Live AI off, US$0, never a priced button (P-175). No real keys anywhere. Push after every step (P-557). Questions as a PR comment headed "Question for the tech lead"; report to the current Lead (`tools/current-lead.sh`) for the merge queue and to **Lead B** (row owner, branch `lead-b-front-office`, hand-over `product/design/lead-b-state.md`) for the row. Cross-module port interfaces, their fakes and shared event payload types go in `prototype/studio/ports/` (`zod` only; case-side contract v0.1 §1 rule 3); adapters stay in the module's folder; never import `engine/` or case-side files (rows rev 14.1). Event names come from `prototype/studio/ports/events.ts` (`EVENT.*`, FO-1a); add a new name there, never a string literal (rev 15.1). A database function in your migration carries your area's prefix (`fo_sales_`, `fo_booking_`, `fo_compliance_`, `fo_signing_`, `fo_retainer_`, `money_`, `msg_`, `plat_`, `platform_`), never a bare `fo_` name another area may also use, and your migration's stamp is later than the newest on `main` when it merges (rows rev 15.2, the FO-1a/FO-1b clash). Every token earns its outcome (P-556): read only the files named here and the code you change.
---

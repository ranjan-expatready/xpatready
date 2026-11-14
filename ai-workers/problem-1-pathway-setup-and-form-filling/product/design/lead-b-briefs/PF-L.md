# Brief — PF-L, gate-approved libraries in one PR (cloud builder lane; row owner Lead B)

Start only after **PF-4 has merged** (it adds `aws-jwt-verify`). Paste into a new cloud session on the repository (default branch `main`):

---
You are a builder for the Expat Ready Pathway Configurator. Run `/next runtime PF-L` and take **one row, PF-L**, end to end on a fresh branch from `origin/main`, one PR.

**The row:** `ai-workers/problem-1-pathway-setup-and-form-filling/product/BACKLOG.md`, row **PF-L** (rows rev 11). Read with it only: `product/design/tech-gate-platform-front-office-2026-11-14.md` (PF-2's gate: versions, licences, dates) and `product/STANDARDS.md` §1.

**What to do:** (1) add two entries to the gate file in its existing shape: **`pg-boss`** (background jobs on our PostgreSQL, no second data store; needs Node 22.12+, our image is Node 24) against BullMQ and graphile-worker, and **`libphonenumber-js`** (phone normalisation to E.164 for duplicate checks) against Google's `libphonenumber` port; each with the problem, options, pick, upkeep, licence **read at its source** (URL, date, name), data location, exact version and publish date (at least 14 days old), when to reconsider; (2) add to `package.json` and the lockfile, at the gate's exact versions: `stripe`, `docxtemplater`, `pizzip`, `date-fns`, `@date-fns/tz`, `pg-boss`, `libphonenumber-js`. No code uses them in this PR.

**Touch list (nothing else):** `package.json`, the lockfile, the gate file.

**Done when:** every library is at its exact gate version; `npm ci` and every suite pass unchanged; `npm audit` shows no high or critical advisory for the added packages (paste the summary); the PR lists each package, version, publish date and licence URL.

**Duplicate check (P-526):** BACKLOG, open PRs (any other PR touching `package.json`?) and `main`'s `package.json`; one `Duplicate check:` line in the PR. If another open PR edits the lockfile, say so and wait for it rather than racing (P-576 (4)).

**Reviewer only (no breaker).** The release holder reads the diff (P-423: dependencies).

**Rules (standard, every PF/FO brief):** P-559: firm tables, real sign-in and billing are ours in the PF/FO modules (amends P-335/P-357). One row, one session, one PR; new files only outside the touch list. Opus reviewer (P-303); re-review reads only the diff (P-277); label `review: approved` only after `Reviewer: Approve <sha>` and green CI (P-277, P-385); merge `main` only on a conflict (P-270). Live AI off, US$0, never a priced button (P-175). No real keys or secrets anywhere; outside services only through fakes and test keys in CI. Push after every step (P-557). Questions as a PR comment headed "Question for the tech lead"; report to the current Lead (`tools/current-lead.sh`) for the merge queue and to **Lead B** (row owner, branch `lead-b-front-office`, hand-over `product/design/lead-b-state.md`) for the row. Every token earns its outcome (P-556): read only the files named here and the code you change.
---

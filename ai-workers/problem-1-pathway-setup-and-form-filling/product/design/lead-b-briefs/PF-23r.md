# Brief: PF-23r, redaction hardening (cloud builder lane; row owner Lead B)

Start **after PF-23 (#1759) has merged.** No schema. Paste into a new cloud session on the repository (default branch `main`):

---
You are a builder for the Expat Ready Pathway Configurator. Run `/next runtime PF-23r` and take **one row, PF-23r**, end to end on a fresh branch from `origin/main`, one PR.

**The row:** `product/BACKLOG.md` row **PF-23r**, the same as `product/design/lead-b-rows-2026-11-14.md` section "Rev 16.1". Read only these with it: #1759's reviewer comment 6878168159 (minors 1-4), and on `main` `api/src/platform/observability/*.ts` and `tests/check_pf23_observability.ts`.

**What to build:** the row's four fixes, each with a pass and a fail test in `tests/check_pf23_observability.ts`.

**Also (FO-13 breaker break 11, rows rev 16.2):** `logPort` and the API's error mapper strip PostgreSQL `DETAIL` lines and Prisma's error `meta` values, which repeat a refused row's values. Test with a pass and a fail: a refused insert of a seeded name logs and answers without the name.

**Touch list (nothing else):** `api/src/platform/observability/*.ts`, `tests/check_pf23_observability.ts`.

**Must still be true:** every existing suite, the demo reset and C10.1 pass unchanged; PF-23's no-personal-data CI check stays green.

**Duplicate check (P-526):** BACKLOG, open PRs (`redact`, `alertIds`), BUGS; one `Duplicate check:` line.

**Reviewer only (no breaker).**

**Rules (standard, every PF/FO brief):** P-559: firm tables, real sign-in and billing are ours in the PF/FO modules (amends P-335/P-357). One row, one session, one PR; new files only outside the one migration folder. Opus reviewer (P-303); re-review reads only the diff (P-277); label `review: approved` only after `Reviewer: Approve <sha>` and green CI (P-277, P-385); merge `main` only on a conflict (P-270). **Before asking for the label (rows rev 16, Lead 47: 4 of 4 labelled PRs went red after the label on 14 Nov):** run, on `main` merged into your branch, the suites of every CI part that was red on any earlier head of this PR, plus every suite in the shard that shares the demo database with yours, and paste the result lines in the PR. Live AI off, US$0, never a priced button (P-175). No real keys anywhere. Push after every step (P-557). Questions as a PR comment headed "Question for the tech lead"; report to the current Lead (`tools/current-lead.sh`) for the merge queue and to **Lead B** (row owner, branch `lead-b-front-office`, hand-over `product/design/lead-b-state.md`) for the row. Cross-module port interfaces, their fakes and shared event payload types go in `prototype/studio/ports/` (`zod` only; case-side contract v0.1 §1 rule 3); adapters stay in the module's folder; never import `engine/` or case-side files (rows rev 14.1). Event names come from `prototype/studio/ports/events.ts` (`EVENT.*`, FO-1a); add a new name there, never a string literal (rev 15.1). A database function in your migration carries your area's prefix (`fo_sales_`, `fo_booking_`, `fo_compliance_`, `fo_signing_`, `fo_retainer_`, `money_`, `msg_`, `plat_`, `platform_`), never a bare `fo_` name another area may also use, and your migration's stamp is later than the newest on `main` when it merges (rows rev 15.2, the FO-1a/FO-1b clash). Every token earns its outcome (P-556): read only the files named here and the code you change.
---

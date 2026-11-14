# Brief: FO-2b, Corporate prospects (cloud builder lane; row owner Lead B)

Start only after **FO-2 has merged**. Sales lane: FO-1a → FO-2 → FO-2b → FO-9a → FO-9b (P-576). No schema change (FO-1a's tables hold companies, contacts and the Corporate pipeline). Paste into a new cloud session on the repository (default branch `main`):

---
You are a builder for the Expat Ready Pathway Configurator. Run `/next runtime FO-2b` and take **one row, FO-2b**, end to end on a fresh branch from `origin/main`, one PR.

**The row:** `ai-workers/problem-1-pathway-setup-and-form-filling/product/BACKLOG.md`, row **FO-2b** (rows rev 3; the founder's 22:3x 13 Nov "build both": the Corporate pipeline in month one). Read with it, and only these: `product/design/platform-and-front-office-contracts-2026-11-14.md` §2.1, §2.6 and **§7 (binding)**; the AG-02 cards the row cites (AG-2-52, -53, -75, -76, -77, -79; `domain/requirements-2026-11-02/02-functional-requirements/agent/AG-02-…`, those cards only); on `main`: `prisma/schema/front-office-sales.prisma` (FO-1a), `api/src/front-office/sales/*.ts` and `api/src/features/front-office-sales.ts` (FO-2), `api/src/features/README.md`.

**What to build (API only):**
* **Engage as Corporate:** company name required; company match by normalised name, offered as a pick, **never linked by itself**; pick or create; the enquirer linked as `PRIMARY` contact and still labelled Lead; the prospect enters the Corporate pipeline's Engaged stage.
* Add, change and end company contacts with roles; one person may hold two roles at one company.
* **Change type** (Individual ↔ Corporate) until a signature exists: keeps number, owner and history; after a signature → refused.
* The boards: the Corporate board lists only Corporate prospects, the Individual board only Individual.
* `prospect.won` with `subject: COMPANY`, carrying the company and its contacts (the case side reads it, contracts §2.6).
* Every change through `AuditPort.record(tx, …)`; outbox row last. Register in new `api/src/features/front-office-corporate.ts`. Test `tests/check_fo2b_corporate.ts` covering every line of the row's Done when, a pass and a fail each, including the forced-audit-failure rollback.

**Touch list (nothing else):** new `api/src/front-office/sales/corporate/*.ts`, `api/src/features/front-office-corporate.ts`, `tests/check_fo2b_corporate.ts`. If Engage's shared handler in FO-2's files needs one branch for the Corporate type, that one call is OK'd by Lead B (owner of both rows, 14 Nov); list the lines in the PR.

**Must still be true:** every existing suite, the demo reset and the checkpoint load (C10.1) pass unchanged; FO-2's suite passes unchanged.

**Duplicate check (P-526):** BACKLOG, open PRs, `main`'s code (`git grep -i 'corporate\|fo_company'` under `api/src`) and BUGS; one `Duplicate check:` line.

**Rules (standard, every PF/FO brief):** P-559: firm tables, real sign-in and billing are ours in the PF/FO modules (amends P-335/P-357). One row, one session, one PR; new files only outside the touch list. Opus reviewer (P-303); **breaker no (no new door; reviewer only)**; re-review reads only the diff (P-277); label `review: approved` only after `Reviewer: Approve <sha>` and green CI (P-277, P-385); merge `main` only on a conflict (P-270). Live AI off, US$0, never a priced button (P-175). No real keys anywhere. Push after every step (P-557). Questions as a PR comment headed "Question for the tech lead"; report to the current Lead (`tools/current-lead.sh`) for the merge queue and to **Lead B** (row owner, branch `lead-b-front-office`, hand-over `product/design/lead-b-state.md`) for the row. Cross-module port interfaces, their fakes and shared event payload types go in `prototype/studio/ports/` (`zod` only; case-side contract v0.1 §1 rule 3); adapters stay in the module's folder; never import `engine/` or case-side files (rows rev 14.1). Event names come from `prototype/studio/ports/events.ts` (`EVENT.*`, FO-1a); add a new name there, never a string literal (rev 15.1). A database function in your migration carries your area's prefix (`fo_sales_`, `fo_booking_`, `fo_compliance_`, `fo_signing_`, `fo_retainer_`, `money_`, `msg_`, `plat_`, `platform_`), never a bare `fo_` name another area may also use, and your migration's stamp is later than the newest on `main` when it merges (rows rev 15.2, the FO-1a/FO-1b clash). Every token earns its outcome (P-556): read only the files named here and the code you change.
---

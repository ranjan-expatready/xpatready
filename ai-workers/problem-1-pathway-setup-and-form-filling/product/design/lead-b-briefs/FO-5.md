# Brief — FO-5, retainer agreements (cloud builder lane; row owner Lead B)

Start only after **FO-1a, PF-4 and PF-L have merged**, and while no other PR holds a migration stamp that collides (P-348 (8)). Paste into a new cloud session on the repository (default branch `main`):

---
You are a builder for the Expat Ready Pathway Configurator. Run `/next runtime FO-5` and take **one row, FO-5**, end to end on a fresh branch from `origin/main`, one PR (split schema → API if over ~800 lines, P-436 (4)).

**The row:** `ai-workers/problem-1-pathway-setup-and-form-filling/product/BACKLOG.md`, row **FO-5** (rows rev 6.2, 9 and 10 part 2: template and request are kind-aware, `RETAINER | CONSULTATION`). Read with it, and only these: `product/design/platform-and-front-office-contracts-2026-11-14.md` §2.3, §2.6 and **§7 (binding)**; the concept `product/screens/fo-5s-retainer-signing/concept.md` r2 §3 (BR-1 to BR-11, BR-17) and §6, because FO-5s's screens call these routes; `product/design/lead-b-trace-2026-11-14/t5-retainer-sign.md`; the AG-05 cards the row cites (`domain/requirements-2026-11-02/02-functional-requirements/agent/AG-05-…`, those cards only); on `main`: `prisma/schema/front-office-sales.prisma` (FO-1a), `api/src/platform/*.ts` and `api/src/platform/identity/*.ts`, `api/src/features/README.md`.

**What to build:** the row's tables in a new area file `prisma/schema/front-office-retainers.prisma` (one migration folder): templates (kind-aware), retainers, versions with the bound merge values and fee rows (minor units, CAD), `original_sha256`; `FilesPort` in `api/src/front-office/files.ts` (firm-prefixed keys, a local folder in the reference app, short-lived checked download links); `DocumentRenderPort` on `docxtemplater` + `pizzip` (PF-L added them); the routes, permission keys (AG-05 C5), rules and events in the row, including the known-placeholder list, the starter template built at run time from a committed text source (no binary in git), the missing-placeholder warning, the unreadable-file error, Edit and resend from Declined or Expired, the no-signatory warning (AG-5-50: never a block), the representative's read access, and Signed offline (PDF, AG-5-47's limit, cannot be undone). Every change through `AuditPort.record(tx, …)` (or `audit_event` until AUD-1, say which); outbox row last. Register in new `api/src/features/front-office-retainers.ts`. Test `tests/check_fo5_retainers.ts` covering every line of the row's Done when, with a pass and a fail each.

**Touch list (nothing else):** the new area file and one migration folder; new `api/src/front-office/retainers/*.ts`, `api/src/front-office/files.ts`, `api/src/features/front-office-retainers.ts`, `tests/check_fo5_retainers.ts`; a committed text source for the starter template under `samples/`.

**Must still be true:** every existing suite, the demo reset and the checkpoint load (C10.1) pass unchanged; no real document or personal data committed.

**Duplicate check (P-526):** BACKLOG, open PRs, `main`'s code (`git grep -i 'retainer\|docxtemplater\|FilesPort'` under `api/src`; old fixture words are not duplicates) and BUGS; one `Duplicate check:` line.

**Breaker: yes (schema, money: fee rows, uploads).** The release holder reads the migration first (P-423).

**Rules (standard, every PF/FO brief):** P-559: firm tables, real sign-in and billing are ours in the PF/FO modules (amends P-335/P-357). One row, one session, one PR; new files only outside the touch list. Opus reviewer (P-303); re-review reads only the diff (P-277); label `review: approved` only after `Reviewer: Approve <sha>` and green CI (P-277, P-385); merge `main` only on a conflict (P-270). Live AI off, US$0, never a priced button (P-175). No real keys or secrets anywhere; outside services only through fakes and test keys in CI. Push after every step (P-557). Questions as a PR comment headed "Question for the tech lead"; report to the current Lead (`tools/current-lead.sh`) for the merge queue and to **Lead B** (row owner, branch `lead-b-front-office`, hand-over `product/design/lead-b-state.md`) for the row. Every token earns its outcome (P-556): read only the files named here and the code you change.
---

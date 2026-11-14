# Brief: PF-0p, shared port contracts and fakes (cloud builder lane; row owner Lead B)

**Start now** (rows rev 16, P-599). It needs nothing beyond `main`. It is the first of the start-now rows and the smallest; the others import from it. No schema, no route, no screen. Paste into a new cloud session on the repository (default branch `main`):

---
You are a builder for the Expat Ready Pathway Configurator. Run `/next runtime PF-0p` and take **one row, PF-0p**, end to end on a fresh branch from `origin/main`, one PR. Aim to open it for review within about 3 hours: other lanes import these files.

**The row:** `product/design/lead-b-rows-2026-11-14.md`, section "Rev 16" (the PF-0p row). Read only these with it:
* `product/design/platform-and-front-office-contracts-2026-11-14.md` §0 and **§7 (binding)**;
* the case-side contract v0.1 §1 (the `ports/` folder rule; on `lead/2026-11-07-lead31`, `product/design/case-side-contract-v0.1-2026-11-14.md`);
* on `main`: `prisma/schema/governance.prisma` (`AuditEvent`), `prisma/schema/platform.prisma`, `api/src/platform/firm-scope.ts`;
* on PR #1744 (PF-4, not merged): `api/src/platform/identity/keys.ts` (`StaffContext`) and `identity/audit.ts`. Read them only to copy their shapes; never import from them.

**What to build:** in `prototype/studio/ports/` (`zod` and types only; no Prisma, Nest or app import), one file per port. Each has the interface, its zod payload schemas, and a **fake** that tests use:
* `audit.ts`:
  * `AuditEntry` = { firmId, actor (`staff:<id>` | `system:<door>` | `seed:<row>`), action, entity, entityKey, summary (≤ 600 characters), detail (no personal data: ids only) };
  * `AuditPort.record(tx, entry)`, inside the caller's transaction;
  * `fakeAudit({ failOn?: (e) => boolean })`: records in memory, and throws when `failOn` matches, so each row can prove "a forced audit failure rolls the change back".
* `staff.ts`:
  * `StaffContext`, exactly PF-4's shape: staffId, firmId, firmKey, roles, keys, duties, authTime, via;
  * `fakeStaff(partial)`.
  * Rows write services that take a `StaffContext` argument. PF-4's guard supplies it on routes.
* `clock.ts`: `ClockPort.now()`; `FakeClock` with `set` and `advance`.
* `jobs.ts`:
  * `JobPort` with `enqueue(name, payload, { key, firmId })` (a key never queues twice), `schedule(name, at, payload, opts)`, `cancel(key)` and `recurring(name, cron, zone)`;
  * `fakeJobs(clock)`: runs due jobs when the clock advances. PF-14 builds the pg-boss adapter.
* `mail.ts`:
  * `MailPort.send({ firmId, to, replyTo, subject, text, html?, attachments?, class: TRANSACTIONAL | SERVICE | MARKETING, templateKey? })`;
  * `fakeMail()` keeps a list, the demo inbox's shape. PF-4b builds the SES adapter.
* `files.ts`:
  * `FilesPort.put(firmId, key, bytes, contentType) → { key, sha256 }`, plus `get` and `exists`;
  * an in-memory fake.
* `render.ts`:
  * `DocumentRenderPort.render(templateKey, data) → { bytes, contentType }`;
  * a fake that returns deterministic bytes.

**The one real adapter here:** `api/src/platform/audit/audit-event.ts` implements `AuditPort` by writing `audit_event` the way PF-4 does (its platform-audit workspace; never reset). It is the interim until AUD-1, which is the release holder's: AUD-1 swaps the adapter and the port stays. List it in the PR for the release holder (P-423).

**Reserved lines in `platform.prisma`:** comments only, which changes no schema and leaves `migrate diff` empty. Inside `PlatformFirm` and `PlatformStaff`, add one comment line per area that will add a back-relation, **each separated by a blank line**: `// back-relation slot: messages (PF-19a)`, `… money (FO-7a)`, `… compliance (FO-13)`, `… register (PF-21)`, `… retainers (FO-5)`, `… web address (PF-25)`. Each later row replaces only its own line, so parallel PRs don't collide in git.

**Test `tests/check_pf0p_ports.ts`:** a pass and a fail for each fake: `failOn` throws and a rolled-back transaction leaves no audit row (real adapter on a test database); a job key never queues twice; a scheduled job runs only after `advance`; the fake inbox keeps the order; `put` returns the sha256 of the bytes; the zod schemas refuse a missing `firmId`.

**Touch list (nothing else):** new files under `prototype/studio/ports/` except `events.ts` (FO-1a's; never touch it); new `api/src/platform/audit/audit-event.ts`; comment lines in `platform.prisma`; `tests/check_pf0p_ports.ts`.

**Must still be true:** every existing suite, the demo reset and C10.1 pass unchanged; `migrate diff` is empty.

**Duplicate check (P-526):** BACKLOG, open PRs (#1742 creates `ports/events.ts`, #1744 has PF-4's own identity files), `main` (`git grep -i 'AuditPort\|JobPort\|MailPort\|FilesPort'`) and BUGS; one `Duplicate check:` line.

**Reviewer only (no breaker):** no door, no data change.

**Rules (standard, every PF/FO brief):** P-559: firm tables, real sign-in and billing are ours in the PF/FO modules (amends P-335/P-357). One row, one session, one PR; new files only outside the one migration folder. Opus reviewer (P-303); re-review reads only the diff (P-277); label `review: approved` only after `Reviewer: Approve <sha>` and green CI (P-277, P-385); merge `main` only on a conflict (P-270). **Before asking for the label (rows rev 16, Lead 47: 4 of 4 labelled PRs went red after the label on 14 Nov):** run, on `main` merged into your branch, the suites of every CI part that was red on any earlier head of this PR, plus every suite in the shard that shares the demo database with yours, and paste the result lines in the PR. Live AI off, US$0, never a priced button (P-175). No real keys anywhere. Push after every step (P-557). Questions as a PR comment headed "Question for the tech lead"; report to the current Lead (`tools/current-lead.sh`) for the merge queue and to **Lead B** (row owner, branch `lead-b-front-office`, hand-over `product/design/lead-b-state.md`) for the row. Cross-module port interfaces, their fakes and shared event payload types go in `prototype/studio/ports/` (`zod` only; case-side contract v0.1 §1 rule 3); adapters stay in the module's folder; never import `engine/` or case-side files (rows rev 14.1). Event names come from `prototype/studio/ports/events.ts` (`EVENT.*`, FO-1a); add a new name there, never a string literal (rev 15.1). A database function in your migration carries your area's prefix (`fo_sales_`, `fo_booking_`, `fo_compliance_`, `fo_signing_`, `fo_retainer_`, `money_`, `msg_`, `plat_`, `platform_`), never a bare `fo_` name another area may also use, and your migration's stamp is later than the newest on `main` when it merges (rows rev 15.2, the FO-1a/FO-1b clash). Every token earns its outcome (P-556): read only the files named here and the code you change.
---

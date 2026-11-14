# Brief — FO-2, leads and Individual prospects API (cloud builder lane; row owner Lead B)

Start only after **FO-1a, PF-4 and PF-19a have merged** (FO-1a's sales tables; PF-4's guard and permission keys; PF-19a's `ConsentPort`, rows rev 14). Paste into a new cloud session on the repository (default branch `main`):

---
You are a builder for the Expat Ready Pathway Configurator. Run `/next runtime FO-2` and take **one row, FO-2**, end to end on a fresh branch from `origin/main`, one PR.

**The row:** `ai-workers/problem-1-pathway-setup-and-form-filling/product/BACKLOG.md`, section "Full MVP: platform (PF) and front office (FO)", row **FO-2**. Read with it, and only these: `product/design/platform-and-front-office-contracts-2026-11-14.md` §0, §2.1, §2.6 and **§7 (binding)**; the concept `product/screens/fo-4-sales/concept.md` r2 §3 (business rules) and §6 (contract), because FO-4's screens call these routes; the AG-02 cards the row cites (`domain/requirements-2026-11-02/02-functional-requirements/agent/AG-02-…`, grep the card ids, read those cards only); on `main`: `prisma/schema/front-office-sales.prisma` and `api/src/front-office/firm-seed.ts` (FO-1a), `api/src/platform/identity/*.ts` (PF-4), `api/src/platform/firm-scope.ts` and `settings.ts` (PF-3), `api/src/features/README.md`.

**What to build (API only; no screens, no schema change):** the routes, rules and events in the row: the public form read and submission (form token, allowed sites with `frame-ancestors`, honeypot, minimum fill time, rate limit, size limits; one transaction writing receipt, person, lead, attribution and consent (consent through PF-19a's `ConsentPort.record`, subject kind `FO_PERSON`, in the same transaction; no front-office consent table, rows rev 14); the answer never reveals whether the person is known); Add a lead by hand; Unassigned leads, Take it, Assign to; close and Reopen with a reason; Engage (Individual); stage moves with a cause (no person moves into a WON stage); Mark lost with a reason; Convert to client and Undo convert while the client is empty; Log a call (seven outcomes) and Add a note; the activity timeline as a read view over `audit_event`, `module_event` and the activity rows; web-form settings and reasons (Owner, Admin); the events listed. Every route declares its permission keys (PF-4's decorator); every change through `AuditPort.record(tx, …)` if AUD-1 has merged, else `audit_event`'s existing columns in the same transaction (say which in the PR). Register in new `api/src/features/front-office-sales.ts`. Test `tests/check_fo2_leads_prospects.ts` covering every line of the row's Done when, with a pass and a fail each.

**Touch list (nothing else):** new `api/src/front-office/sales/*.ts`, `api/src/features/front-office-sales.ts`, `tests/check_fo2_leads_prospects.ts`. A needed edit elsewhere → "Question for the tech lead" on the PR, to Lead B.

**Outbox (PF-3 review m8):** write any `module_event` row **last** in its transaction.

**The seeds (Lead B's answer on #1742, rev 15.1).** FO-2 is the first row that serves a front-office page, so it wires the seeds.
* **Demo reset:** it runs PF-3's `seed-sample-firms.ts`, then FO-1a's `seedSampleFirmsFrontOffice`. These are one-line hooks in the reset, a shared file: the release holder's OK; list them under "Shared-file lines".
* **New firms:** FO-1a's `seedCreatedFirms` (catch-up over `module_event` by `seq`, idempotent) runs once at start. If PF-14 is on `main`, it is also a `JobPort` recurring job (Sample: every minute); if not, PF-14's first user moves it onto `JobPort`.
* Match `EVENT.FIRM_CREATED` from `ports/events.ts`, never a string.
* **The web form's message** (#1742 review m12) is the lead's first note (`fo_note`, `INTERNAL`).
* Add a version column for the stale-save rule only where an edit form needs it (m8).
* Tests: after a demo reset, both Sample firms have both pipelines; a new `firm.created` seeds that firm once, and a second run adds nothing.

**Must still be true:** every existing suite, the demo reset and the checkpoint load (C10.1) pass unchanged; firm A never reads or writes firm B's rows (`firmScope`).

**Duplicate check (P-526):** before building, search BACKLOG, open PRs, `main`'s code (`git grep -i 'fo_lead\|engage\|take it'` under `api/src`) and BUGS; one `Duplicate check:` line in the PR.

**Breaker: yes (public door, permissions).** The release holder reads the diff first (P-423: permissions).

**Rules (standard, every PF/FO brief):** P-559: firm tables, real sign-in and billing are ours in the PF/FO modules (amends P-335/P-357). One row, one session, one PR; new files only outside the touch list. Opus reviewer (P-303); re-review reads only the diff (P-277); label `review: approved` only after `Reviewer: Approve <sha>` and green CI (P-277, P-385); merge `main` only on a conflict (P-270). Live AI off, US$0, never a priced button (P-175). No real keys or secrets anywhere; outside services only through fakes and test keys in CI. Push after every step (P-557). Questions as a PR comment headed "Question for the tech lead"; report to the current Lead (`tools/current-lead.sh`) for the merge queue and to **Lead B** (row owner, branch `lead-b-front-office`, hand-over `product/design/lead-b-state.md`) for the row. Cross-module port interfaces, their fakes and shared event payload types go in `prototype/studio/ports/` (`zod` only; case-side contract v0.1 §1 rule 3); adapters stay in the module's folder; never import `engine/` or case-side files (rows rev 14.1). Event names come from `prototype/studio/ports/events.ts` (`EVENT.*`, FO-1a); add a new name there, never a string literal (rev 15.1). Every token earns its outcome (P-556): read only the files named here and the code you change.
---

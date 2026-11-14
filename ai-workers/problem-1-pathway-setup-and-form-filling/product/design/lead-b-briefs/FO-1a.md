# Brief — FO-1a, front-office sales tables (cloud builder lane; row owner Lead B)

Paste into a new cloud session on the repository (default branch `main`), **after PF-3 has merged** (it needs `platform_firm`):

---
You are a builder for the Expat Ready Pathway Configurator. Run `/next runtime FO-1a` and take **one row, FO-1a**, end to end on a fresh branch from `origin/main`, one PR.

**The row:** `ai-workers/problem-1-pathway-setup-and-form-filling/product/BACKLOG.md`, section "Full MVP: platform (PF) and front office (FO)", row **FO-1a** (rows rev 3.1). Read with it, and only these: `product/design/platform-and-front-office-contracts-2026-11-14.md` §0, §2.1, §2.6 and **§7 (binding)**; `product/design/lead-b-requirements-trace-2026-11-14.md` §A; the AG-02 cards the row cites (`domain/requirements-2026-11-02/02-functional-requirements/agent/AG-02-…`, grep the card ids; read those cards only); `prototype/studio/DEVELOPING.md` "Database schema: one file per area (DB-SPLIT)".

**What to build (schema and seed only; no routes, no screens):**
* New file `prototype/studio/prisma/schema/front-office-sales.prisma`, its one-line rule first ("front-office-sales.prisma — leads, prospects, companies, contacts, pipelines, calls, notes, consent, web forms, services. Owner: Lead B (front office)"); never edit another area's file; a back-relation needed on `platform.prisma` is one line you ask Lead B for in the PR.
* The tables in the row: `fo_person`, `fo_arrival_receipt`, `fo_lead` (no stage, type or value), `fo_lead_attribution` (write-once), `fo_company`, `fo_company_contact`, `fo_prospect`, `fo_stage` (Individual and Corporate pipelines, AG-02's eight keys each), `fo_reason` (AG-02's own lists: AG-2-80 rule 2, AG-2-44 rule 2), `fo_call`, `fo_note` (`visibility`, add-only), `fo_stage_move`, `fo_web_form` (it keeps a reference to the consent wording version), `fo_service`; per-firm `L-`/`P-` numbers safe under concurrency.
* `api/src/front-office/firm-seed.ts`: on `firm.created` (and once for the two Sample firms) seed the two pipelines, reasons, one web form (off) and the services list from released combinations' names; idempotent.
* Test `tests/check_fo1a_sales_schema.ts` covering every line of the row's Done when, a pass and a fail each.
* **Also (Lead 38):** fix the one stale line in `prototype/studio/DEVELOPING.md` (line ~29, "one migration in flight at a time") to say two module schema rows may run at once when each touches only its own area file and migration folder, the second re-stamping and showing `migrate diff` empty (P-559 (3), P-228).
* One migration folder with its own stamp later than the newest on `main` (P-348 (8)); triggers in its SQL.

**Side by side (Lead 38 ruling, P-559 (3), WAY-OF-WORKING P-228):** FO-1a and FO-1b run at the same time after PF-3 merges, each touching only its own area file and its own migration folder. Whichever merges second re-stamps its migration on top of `main`'s and shows `npx prisma migrate diff` empty in its PR.

**Rows rev 14 (P-584 (1)):** `fo_consent` and `fo_consent_wording` are **not** built here: the consent store is the platform's (`msg_consent`, `msg_consent_wording` in PF-19a's `platform-messages.prisma`). If BACKLOG's FO-1a row still lists them, this brief wins (Lead B, 14 Nov).

**Must still be true:** the demo reset, the checkpoint load (C10.1) and every existing suite pass unchanged; `tests/check_prisma_schema.ts` passes with the new file.

**Rules (standard, every PF/FO brief):** P-559: firm tables, real sign-in and billing are ours in the PF/FO modules (amends P-335/P-357). One row, one session, one PR; new files only outside the one migration folder. Opus reviewer (P-303); **breaker yes (schema)**; re-review reads only the diff (P-277); label `review: approved` only after `Reviewer: Approve <sha>` and green CI (P-277, P-385); merge `main` only on a conflict (P-270). You hold the **schema baton** (one builder at a time on schema; release it in the PR when merged). Live AI off, US$0, never a priced button (P-175). No real keys anywhere. Push after every step (P-557). Questions as a PR comment headed "Question for the tech lead"; report to the current Lead (`tools/current-lead.sh`) for the merge queue and to **Lead B** (row owner, branch `lead-b-front-office`) for the row. Cross-module port interfaces, their fakes and shared event payload types go in `prototype/studio/ports/` (`zod` only; case-side contract v0.1 §1 rule 3); adapters stay in the module's folder; never import `engine/` or case-side files (rows rev 14.1). Every token earns its outcome (P-556): read only the files named here and the code you change.
---

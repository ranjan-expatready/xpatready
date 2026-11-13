# Brief — FO-1a, front-office sales tables (cloud builder lane; row owner Lead B)

Paste into a new cloud session on the repository (default branch `main`), **after PF-3 has merged** (it needs `platform_firm`):

---
You are a builder for the Expat Ready Pathway Configurator. Run `/next runtime FO-1a` and take **one row, FO-1a**, end to end on a fresh branch from `origin/main`, one PR.

**The row:** `ai-workers/problem-1-pathway-setup-and-form-filling/product/BACKLOG.md`, section "Full MVP: platform (PF) and front office (FO)", row **FO-1a** (rows rev 3.1). Read with it, and only these: `product/design/platform-and-front-office-contracts-2026-11-14.md` §0, §2.1, §2.6 and **§7 (binding)**; `product/design/lead-b-requirements-trace-2026-11-14.md` §A; the AG-02 cards the row cites (`domain/requirements-2026-11-02/02-functional-requirements/agent/AG-02-…`, grep the card ids; read those cards only); `prototype/studio/DEVELOPING.md` "Database schema: one file per area (DB-SPLIT)".

**What to build (schema and seed only; no routes, no screens):**
* New file `prototype/studio/prisma/schema/front-office-sales.prisma`, its one-line rule first ("front-office-sales.prisma — leads, prospects, companies, contacts, pipelines, calls, notes, consent, web forms, services. Owner: Lead B (front office)"); never edit another area's file; a back-relation needed on `platform.prisma` is one line you ask Lead B for in the PR.
* The tables in the row: `fo_person`, `fo_arrival_receipt`, `fo_lead` (no stage, type or value), `fo_lead_attribution` (write-once), `fo_company`, `fo_company_contact`, `fo_prospect`, `fo_stage` (Individual and Corporate pipelines, AG-02's eight keys each), `fo_reason` (AG-02's own lists: AG-2-80 rule 2, AG-2-44 rule 2), `fo_call`, `fo_note` (`visibility`, add-only), `fo_stage_move`, `fo_consent`, `fo_consent_wording` (versioned, hashed, write-once), `fo_web_form`, `fo_service`; per-firm `L-`/`P-` numbers safe under concurrency.
* `api/src/front-office/firm-seed.ts`: on `firm.created` (and once for the two Sample firms) seed the two pipelines, reasons, one web form (off) and the services list from released combinations' names; idempotent.
* Test `tests/check_fo1a_sales_schema.ts` covering every line of the row's Done when, a pass and a fail each.
* One migration folder with its own stamp later than the newest on `main` (P-348 (8)); triggers in its SQL.

**Must still be true:** the demo reset, the checkpoint load (C10.1) and every existing suite pass unchanged; `tests/check_prisma_schema.ts` passes with the new file.

**Rules (standard, every PF/FO brief):** P-559: firm tables, real sign-in and billing are ours in the PF/FO modules (amends P-335/P-357). One row, one session, one PR; new files only outside the one migration folder. Opus reviewer (P-303); **breaker yes (schema)**; re-review reads only the diff (P-277); label `review: approved` only after `Reviewer: Approve <sha>` and green CI (P-277, P-385); merge `main` only on a conflict (P-270). You hold the **schema baton** (one builder at a time on schema; release it in the PR when merged). Live AI off, US$0, never a priced button (P-175). No real keys anywhere. Push after every step (P-557). Questions as a PR comment headed "Question for the tech lead"; report to the current Lead (`tools/current-lead.sh`) for the merge queue and to **Lead B** (row owner, branch `lead-b-front-office`) for the row. Every token earns its outcome (P-556): read only the files named here and the code you change.
---

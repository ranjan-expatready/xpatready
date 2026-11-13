# Brief — PF-3, platform tables (cloud builder lane; row owner Lead B)

Paste into a new cloud session on the repository (default branch `main`):

---
You are a builder for the Expat Ready Pathway Configurator. Run `/next runtime PF-3` and take **one row, PF-3**, end to end on a fresh branch from `origin/main`, one PR.

**The row:** `ai-workers/problem-1-pathway-setup-and-form-filling/product/BACKLOG.md`, section "Full MVP: platform (PF) and front office (FO)", row **PF-3** (copied from rows rev 3.1). Read with it, and only these: `product/design/platform-and-front-office-contracts-2026-11-14.md` §0, §1.1, §1.2 and **§7 (binding; it overrides earlier lines)**; `product/design/lead-b-requirements-trace-2026-11-14.md` §A rows "Firm states", "Subscription", "Seats", "Firm record", "Roles" (cards cited there are in `domain/requirements-2026-11-02/`, read only the cards you need); `prototype/studio/DEVELOPING.md` "Database schema: one file per area (DB-SPLIT)".

**What to build (schema and seed only; no routes, no screens):**
* New file `prototype/studio/prisma/schema/platform.prisma`, its one-line rule first ("platform.prisma — firms, plans, subscriptions, staff, roles, settings, sign-up links, webhook receipts, module events. Owner: Lead B (platform)"); never edit another area's file. If a back-relation is needed on another area's model, ask in the PR ("Question for the tech lead").
* The tables in the row: `platform_firm`, `platform_setting_definition`, `platform_firm_setting`, `platform_plan`, `platform_subscription`, `platform_signup_link`, `platform_staff` (with `actor_id`), `platform_staff_credential`, `platform_role_grant`, `platform_role_permission`, `platform_invitation`, `platform_session_revocation`, `webhook_receipt`, `module_event`. **No audit table** (one trail: the existing `audit_event`, owned by the release holder, AUD-1).
* One migration folder under `prisma/migrations/` with its own stamp later than the newest on `main` (P-348 (8)); triggers (immutable `country_code`, insert-only `module_event`) in the migration SQL.
* `api/src/platform/firm-scope.ts` (the one firm filter), `api/src/platform/settings.ts` (register a key with a zod schema and default; read with default; write refused when the value fails its schema), `api/src/platform/seed-sample-firms.ts` (reads `samples/firms.json` only; Sample firms keep keys `sample-firm`, `sample-solo`; users keep `actor_id` `user-R`, `user-O`, `user-T`, `user-S`; `user-R` and `user-S` get a Case Manager grant and a licence record; idempotent).
* Test `tests/check_pf3_platform_schema.ts` covering every line of the row's Done when, with a pass and a fail each.

**Must still be true:** the demo reset and the checkpoint load (C10.1) and every existing suite pass unchanged; platform rows survive or are re-seeded by the reset (say which in the PR); `tests/check_prisma_schema.ts` passes with the new file.

**Rules (standard, every PF/FO brief):** P-559: firm tables, real sign-in and billing are ours in the PF/FO modules (amends P-335/P-357). One row, one session, one PR; new files only outside the one migration folder. Opus reviewer (P-303); **breaker yes (schema)**; re-review reads only the diff (P-277); label `review: approved` only after `Reviewer: Approve <sha>` and green CI (P-277, P-385); merge `main` only on a conflict (P-270). You hold the **schema baton** (one builder at a time on schema; release it in the PR when merged). Live AI off, US$0, never a priced button (P-175). No real keys anywhere. Push after every step (P-557). Questions as a PR comment headed "Question for the tech lead"; report to the current Lead (`tools/current-lead.sh`) for the merge queue and to **Lead B** (row owner, branch `lead-b-front-office`) for the row. Every token earns its outcome (P-556): read only the files named here and the code you change.
---

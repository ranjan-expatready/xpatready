# Brief: FO-1k, front-office keys to the platform (cloud builder lane; row owner Lead B)

Start **after FO-1a (#1742) has merged**, in the next free schema slot after PF-19a and FO-7a and ahead of FO-13 (Lead 45, 14 Nov). This closes FO-1a's review m2 and break B5. Paste into a new cloud session on the repository (default branch `main`):

---
You are a builder for the Expat Ready Pathway Configurator. Run `/next runtime FO-1k` and take **one row, FO-1k**, end to end on a fresh branch from `origin/main`, one PR.

**The row:** `ai-workers/problem-1-pathway-setup-and-form-filling/product/BACKLOG.md`, row **FO-1k** (rows rev 15.1). Read only these with it:
* Lead B's answer on #1742 (comment 6875438964);
* `product/design/platform-and-front-office-contracts-2026-11-14.md` §9 (one-line hooks);
* `prototype/studio/DEVELOPING.md`, "Database schema: one file per area (DB-SPLIT)";
* on `main`: `prisma/schema/platform.prisma`, `prisma/schema/front-office-sales.prisma`, and FO-1a's migration (its triggers `fo_sales_setup_firm_exists` and `fo_owner_in_firm`).

**What to build:**
* **`platform.prisma`, three one-line hooks** (Lead B owns both files, so this is the contracts §9 exception; list them under "Shared-file lines"):
  * `frontOfficeSales FoSalesSetup?` on `PlatformFirm`;
  * `ownedLeads FoLead[] @relation("LeadOwner")` and `ownedProspects FoProspect[] @relation("ProspectOwner")` on `PlatformStaff`.
* **`front-office-sales.prisma`:** the matching relation fields only.
* **One migration folder**, with its own stamp later than the newest on `main` (P-348 (8)):
  * `fo_sales_setup (firm_id) → platform_firm (id)`;
  * `(firm_id, owner_id) → platform_staff (firm_id, id)` on `fo_lead` and `fo_prospect`;
  * all ON DELETE RESTRICT and ON UPDATE RESTRICT;
  * then drop the two stand-in triggers and their functions.
* **Test `tests/check_fo1k_keys.ts`**, a pass and a fail each:
  * deleting a firm that has a setup row → refused;
  * deleting a staff member who owns a lead or prospect → refused;
  * an owner from another firm → 23503;
  * migration on empty and demo-data copies;
  * `npx prisma migrate diff` empty.

**Keys left by rows that merged before FO-1a (rows rev 16.2):** add the foreign keys each such PR lists under "Keys FO-1k adds", with their back-relation lines on `front-office-sales.prisma`, in this one migration. Known so far:
* **FO-7a #1758:** `(person_id) → fo_person(id)` and `(company_id) → fo_company(id)` on `money_invoice`, `money_trust_request` and `money_trust_entry` (six keys).
* **PF-19a #1754:** `fo_web_form (firm_id, consent_wording_version_id) → msg_consent_wording (firm_id, id)`, if it shipped without it.
* **FO-13 #1755 and FO-5:** any `fo_person`, `fo_company` or `fo_prospect` keys their PR bodies list.

Read each merged PR's body for its list at start. A key whose PR hasn't merged yet stays that PR's.

**Touch list (nothing else):** the three `platform.prisma` lines, the matching fields on `front-office-sales.prisma`, one migration folder, `tests/check_fo1k_keys.ts`.

**Side by side (P-559 (3)):** PF-19a also adds lines to `platform.prisma` and `front-office-sales.prisma`. Whichever merges second re-applies its lines on `main`'s files, re-stamps its migration and shows `migrate diff` empty.

**Re-stamp step (P-600, schema rows in parallel):** your migration folder's stamp must be later than `main`'s newest when you ask for the label. Whenever another migration merges to `main` before yours: (1) merge `main`; (2) rename your folder to a stamp later than `main`'s newest; (3) show `npx prisma migrate diff` empty and `migrate reset` clean on `main` + your branch; (4) re-run CI and the suites of every red part; (5) a diff-only re-Approve. P-600's five conditions apply: own schema file and migration folder; add only to your own tables (a shared model changes only through your own slot line); area-prefixed functions and triggers; the later stamp; the release holder reads your migration diff before the label.

**Must still be true:** FO-1a's, FO-1b's and PF-3's suites, every other suite, the demo reset (`check_s7_reset`, `check_d1_reset_to_six`) and the checkpoint load (C10.1) pass unchanged.

**Duplicate check (P-526):** BACKLOG, open PRs, `main`'s schema (`git grep -n 'LeadOwner\|frontOfficeSales'`) and BUGS; one `Duplicate check:` line.

**Breaker: yes (schema).** The release holder reads the migration first (P-423).

**Rules (standard, every PF/FO brief):** P-559: firm tables, real sign-in and billing are ours in the PF/FO modules (amends P-335/P-357). One row, one session, one PR; new files only outside the one migration folder. Opus reviewer (P-303); re-review reads only the diff (P-277); label `review: approved` only after `Reviewer: Approve <sha>` and green CI (P-277, P-385); merge `main` only on a conflict (P-270). **Before asking for the label (rows rev 16, Lead 47: 4 of 4 labelled PRs went red after the label on 14 Nov):** run, on `main` merged into your branch, the suites of every CI part that was red on any earlier head of this PR, plus every suite in the shard that shares the demo database with yours, and paste the result lines in the PR. Live AI off, US$0, never a priced button (P-175). No real keys anywhere. Push after every step (P-557). Questions as a PR comment headed "Question for the tech lead"; report to the current Lead (`tools/current-lead.sh`) for the merge queue and to **Lead B** (row owner, branch `lead-b-front-office`, hand-over `product/design/lead-b-state.md`) for the row. Cross-module port interfaces, their fakes and shared event payload types go in `prototype/studio/ports/` (`zod` only; case-side contract v0.1 §1 rule 3); adapters stay in the module's folder; never import `engine/` or case-side files (rows rev 14.1). Event names come from `prototype/studio/ports/events.ts` (`EVENT.*`, FO-1a); add a new name there, never a string literal (rev 15.1). A database function in your migration carries your area's prefix (`fo_sales_`, `fo_booking_`, `fo_compliance_`, `fo_signing_`, `fo_retainer_`, `money_`, `msg_`, `plat_`, `platform_`), never a bare `fo_` name another area may also use, and your migration's stamp is later than the newest on `main` when it merges (rows rev 15.2, the FO-1a/FO-1b clash). Every token earns its outcome (P-556): read only the files named here and the code you change.
---

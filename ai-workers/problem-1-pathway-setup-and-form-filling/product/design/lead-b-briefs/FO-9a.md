# Brief: FO-9a, duplicate warning on key fields (cloud builder lane; row owner Lead B)

Start only after **FO-2 and PF-L have merged** (FO-2 brings the routes that call the check; PF-L adds `libphonenumber-js`). Sales lane: FO-1a → FO-2 → FO-2b → FO-9a → FO-9b (P-576); it edits `front-office-sales.prisma`, so no other row may hold that file at the same time. Paste into a new cloud session on the repository (default branch `main`):

---
You are a builder for the Expat Ready Pathway Configurator. Run `/next runtime FO-9a` and take **one row, FO-9a**, end to end on a fresh branch from `origin/main`, one PR (split schema → API if over ~800 lines, P-436 (4)).

**The row:** `ai-workers/problem-1-pathway-setup-and-form-filling/product/BACKLOG.md`, row **FO-9a** (rows rev 10, P-574 (2)). Read with it, and only these: `product/design/platform-and-front-office-contracts-2026-11-14.md` §2.1 and **§7 (binding)**; `product/design/tech-gate-platform-front-office-2026-11-14.md` (the `libphonenumber-js` entry, PF-L); the AG-02 cards the row cites (AG-2-16, -78, -96, -97, -98, -99; `domain/requirements-2026-11-02/02-functional-requirements/agent/AG-02-…`, those cards only); on `main`: `prisma/schema/front-office-sales.prisma`, `api/src/front-office/sales/*.ts` (FO-2), `api/src/features/README.md`.

**What to build:**
* In `front-office-sales.prisma` with one migration folder (**you hold the schema baton for this file**): enable `pg_trgm` in the migration's SQL; trigram indexes on person and company names; a normalised phone column on `fo_person` (E.164 by `libphonenumber-js`, default region CA) and a lower-cased email index; backfill existing rows in the migration.
* One match service in new `api/src/front-office/duplicates/*.ts`: email exact, phone exact, name similarity at or above a **Sample** threshold 0.6; a score 0-100 with its reasons.
* `POST /api/front-office/duplicates/check`, used by Add a lead, Engage, add contact and the arrival path; it returns only matches the caller may see, each with "use the existing one" (which links the new activity to the existing person and creates nothing).
* `DuplicateCheckPort` that the case side calls when it creates a client (warn only, never a block).
* **The public form never reveals a match** (FO-2's rule stands): it answers the same with or without one.
* Register in new `api/src/features/front-office-duplicates.ts`. Every change through `AuditPort.record(tx, …)`; outbox row last. Test `tests/check_fo9a_duplicates.ts` covering every line of the row's Done when, a pass and a fail each: `+1 (416) 555-0101` and `416.555.0101` match; the same first name alone scores below the threshold; a match the viewer may not see is never named; "use the existing one" creates nothing; the public form answers the same either way; 20 parallel checks stay under the speed budget on Sample data at 100 firms.

**Touch list (nothing else):** `prisma/schema/front-office-sales.prisma` (the column and indexes only) and one migration folder; new `api/src/front-office/duplicates/*.ts`, `api/src/features/front-office-duplicates.ts`, `tests/check_fo9a_duplicates.ts`; **plus one call each** in FO-2's Add a lead, Engage, add-contact and arrival handlers under `api/src/front-office/sales/` (OK'd by Lead B as owner of both rows, 14 Nov; list the lines in the PR).

**Must still be true:** every existing suite, the demo reset and the checkpoint load (C10.1) pass unchanged; FO-1a's and FO-2's suites pass unchanged.

**Duplicate check (P-526):** BACKLOG, open PRs, `main`'s code (`git grep -i 'pg_trgm\|libphonenumber\|duplicate'` under `api/src` and `prisma`) and BUGS; one `Duplicate check:` line.

**Rules (standard, every PF/FO brief):** P-559: firm tables, real sign-in and billing are ours in the PF/FO modules (amends P-335/P-357). One row, one session, one PR; new files only outside the touch list. Opus reviewer (P-303); **breaker yes (schema)**; re-review reads only the diff (P-277); label `review: approved` only after `Reviewer: Approve <sha>` and green CI (P-277, P-385); merge `main` only on a conflict (P-270). The release holder reads the migration first (P-423). Live AI off, US$0, never a priced button (P-175). No real keys anywhere. Push after every step (P-557). Questions as a PR comment headed "Question for the tech lead"; report to the current Lead (`tools/current-lead.sh`) for the merge queue and to **Lead B** (row owner, branch `lead-b-front-office`, hand-over `product/design/lead-b-state.md`) for the row. Every token earns its outcome (P-556): read only the files named here and the code you change.
---

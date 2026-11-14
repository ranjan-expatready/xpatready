# Brief: PF-19a, the messages schema and the consent store (cloud builder lane; row owner Lead B)

**Start now** (rows rev 16, P-599). Its own area file. The `fo_web_form` foreign key FO-1a left: if FO-1a is on `main` when you reach the migration step, add it as this brief says; otherwise leave it, and **FO-1k adds it**. Your firm back-relation replaces PF-0p's "messages (PF-19a)" slot line in `platform.prisma`. Use the `ports/` files from PF-0p (`audit`, `staff`, `jobs`, `clock`, `mail`, `files`, `render`). If PF-0p isn't on `main` yet, code to its brief's signatures and merge `main` when it lands; never create those files yourself. (Earlier start line, kept for the record: Start **as soon as FO-1a (#1742) has merged.** PF-3 is on `main` (11:25 IST 14 Nov). PF-19a takes the next schema slot and **FO-2 waits on it** (rows rev 14, P-584 (1)). Under P-559 (3) it may run beside one other module schema row; whichever merges second re-stamps its migration.) Paste into a new cloud session on the repository (default branch `main`):

---
You are a builder for the Expat Ready Pathway Configurator. Run `/next runtime PF-19a` and take **one row, PF-19a**, end to end on a fresh branch from `origin/main`, one PR. If it goes over ~800 lines, split schema → `ConsentPort` (P-436 (4)).

**The row:** `ai-workers/problem-1-pathway-setup-and-form-filling/product/BACKLOG.md`, row **PF-19a** (rows rev 14). Read only these with it:
* `product/design/lead-b-rows-2026-11-14.md`, sections "Rev 14" and "Rev 15" (PF-18n later adds `msg_notification` to your file: leave room, build nothing for it);
* `product/design/platform-and-front-office-contracts-2026-11-14.md` §0, **§7 (binding)** and **§9 (module homes: the consent store is the platform's)**;
* the cards the row cites: AG-10-22 to AG-10-27 in `domain/requirements-2026-11-02/02-functional-requirements/agent/AG-10-communication-hub_v1.26_2026-10-27.md`, AG-2-83 in the AG-02 file, and SA-11-29 in the SA-11 file (grep the ids, read those cards only);
* `prototype/studio/DEVELOPING.md`, "Database schema: one file per area (DB-SPLIT)";
* on `main`: `prisma/schema/platform.prisma` (PF-3) and `prisma/schema/front-office-sales.prisma` (FO-1a; `fo_web_form.consent_wording_version_id`).

**What to build:**
* **New file `prototype/studio/prisma/schema/platform-messages.prisma`.** Its one-line rule comes first: "platform-messages.prisma: consent, consent wording, suppression, templates, outbox, delivery events, send counters (later notifications). Owner: Lead B (platform, contracts §9)". Nothing outside `api/src/platform/messages/` writes these tables.
* **The tables in the row:**
  * `msg_consent`: subject kind `FO_PERSON | CASE_PARTY | STAFF` plus id; channel `EMAIL | WHATSAPP`; purpose `SERVICE | MARKETING`; wording version; given at; withdrawn at; source and evidence.
  * `msg_consent_wording`: per firm, versioned, text hashed, **write-once**; `@@unique([firmId, id])`.
  * `msg_suppression`: reason `HARD_BOUNCE | COMPLAINT | UNSUBSCRIBE | STOP | STAFF`.
  * `msg_template` and `msg_template_version`: owner `PLATFORM | FIRM`; versions write-once.
  * `msg_outbox`: class `TRANSACTIONAL | SERVICE | MARKETING`; state `QUEUED | SENT | DELIVERED | BOUNCED | FAILED | SUPPRESSED`.
  * `msg_event`: insert-only.
  * `msg_send_counter`: firm, day.
  * `firm_id` first in every index; times `timestamptz`.
  * A `PLATFORM`-owned template has no firm.
  * Every firm-owned row is covered by PF-12's walls later. Name the tables in the PR so PF-12 can list them.
* **Triggers in the migration's SQL:** wording versions and template versions refuse update and delete; `msg_event` refuses update and delete; a consent's `withdrawn_at` is set once and never cleared; a consent row names a wording version of its own firm.
* **The foreign key FO-1a left for you:** `fo_web_form (firm_id, consent_wording_version_id) → msg_consent_wording (firm_id, id)`, ON DELETE and ON UPDATE RESTRICT, in your migration. Its back-relation is **one line on `front-office-sales.prisma`'s `FoWebForm`**. That line is a one-line hook, OK'd by Lead B, who owns both files (contracts §9); list it in the PR body under "Shared-file lines". There is no other edit to that file. Any back-relation on `platform.prisma` follows the same rule.
* **`ConsentPort`** (interface and fake in `prototype/studio/ports/consent.ts`, `zod` only; the adapter in `api/src/platform/messages/consent/`):
  * `record(tx, consent)` and `withdraw(tx, …)` run inside the caller's transaction (FO-2 calls `record` at capture).
  * `allows(subject, channel, purpose, class)`: marketing needs a live consent; transactional is allowed unless suppressed; a suppression stops every class.
  * `publishWording(firm, text)` returns the new version.
  * Every change goes through `AuditPort.record(tx, …)`.
  * Register it in new `api/src/features/platform-consent.ts`.
* **Test `tests/check_pf19a_messages_schema.ts`:** every line of the row's Done when, a pass and a fail each. That includes:
  * the migration on empty and demo-data copies, with `migrate diff` empty;
  * a web form pointing at another firm's wording → refused;
  * a forced audit failure rolls back a `record`.
* **One migration folder**, with its own stamp later than the newest on `main` (P-348 (8)).

**Touch list (nothing else):**
* the new area file and one migration folder;
* the one `FoWebForm` back-relation line (plus any `platform.prisma` back-relation line, listed);
* new `ports/consent.ts`, `api/src/platform/messages/consent/*.ts`, `api/src/features/platform-consent.ts` and `tests/check_pf19a_messages_schema.ts`.

**Must still be true:** the demo reset, the checkpoint load (C10.1) and every existing suite pass unchanged, FO-1a's and PF-3's suites included; `tests/check_prisma_schema.ts` passes with the new file; the case side's tables are untouched.

**Duplicate check (P-526):** BACKLOG, open PRs, `main`'s schema and code (`git grep -i 'consent\|suppression\|msg_'` under `prisma/` and `api/src`; FO-1a's comments naming PF-19a are not duplicates) and BUGS; one `Duplicate check:` line.

**Breaker: yes (schema, consent).** The release holder reads the migration first (P-423).

**Rules (standard, every PF/FO brief):** P-559: firm tables, real sign-in and billing are ours in the PF/FO modules (amends P-335/P-357). One row, one session, one PR; new files only outside the touch list. Opus reviewer (P-303); re-review reads only the diff (P-277); label `review: approved` only after `Reviewer: Approve <sha>` and green CI (P-277, P-385); merge `main` only on a conflict (P-270). **Before asking for the label (rows rev 16, Lead 47: 4 of 4 labelled PRs went red after the label on 14 Nov):** run, on `main` merged into your branch, the suites of every CI part that was red on any earlier head of this PR, plus every suite in the shard that shares the demo database with yours, and paste the result lines in the PR. Live AI off, US$0, never a priced button (P-175). No real keys anywhere; no mail or WhatsApp call (sending is PF-19b). CASL reading: Unconfirmed: no counsel. Push after every step (P-557). Questions as a PR comment headed "Question for the tech lead"; report to the current Lead (`tools/current-lead.sh`) for the merge queue and to **Lead B** (row owner, branch `lead-b-front-office`, hand-over `product/design/lead-b-state.md`) for the row. Cross-module port interfaces, their fakes and shared event payload types go in `prototype/studio/ports/` (`zod` only; case-side contract v0.1 §1 rule 3); adapters stay in the module's folder; never import `engine/` or case-side files (rows rev 14.1). Event names come from `prototype/studio/ports/events.ts` (`EVENT.*`, FO-1a); add a new name there, never a string literal (rev 15.1). A database function in your migration carries your area's prefix (`fo_sales_`, `fo_booking_`, `fo_compliance_`, `fo_signing_`, `fo_retainer_`, `money_`, `msg_`, `plat_`, `platform_`), never a bare `fo_` name another area may also use, and your migration's stamp is later than the newest on `main` when it merges (rows rev 15.2, the FO-1a/FO-1b clash). Every token earns its outcome (P-556): read only the files named here and the code you change.
---

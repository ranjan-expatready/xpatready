# Brief — FO-3, booking API (cloud builder lane; row owner Lead B)

Start only after **FO-1b, FO-2, PF-4 and PF-14 have merged** (booking tables, the arrival path, the guard, and the job runner for reminders). Paste into a new cloud session on the repository (default branch `main`):

---
You are a builder for the Expat Ready Pathway Configurator. Run `/next runtime FO-3` and take **one row, FO-3**, end to end on a fresh branch from `origin/main`, one PR (split public door → staff routes if over ~800 lines).

**The row:** `ai-workers/problem-1-pathway-setup-and-form-filling/product/BACKLOG.md`, row **FO-3**. Read with it, and only these: `product/design/platform-and-front-office-contracts-2026-11-14.md` §2.2, §2.6 and **§7 (binding)**; `product/design/lead-b-trace-2026-11-14/t4-booking.md`; the AG-04 cards the row cites (`domain/requirements-2026-11-02/02-functional-requirements/agent/AG-04-…`, those cards only); on `main`: `prisma/schema/front-office-booking.prisma` (FO-1b), `api/src/front-office/sales/*.ts` (FO-2's arrival path), `api/src/platform/jobs/*.ts` (PF-14's `JobPort` and fake clock), `api/src/platform/settings.ts`, `api/src/features/README.md`.

**What to build (API only; no screens, no schema change):** everything in the row: public slots and booking (first name, last name, email; phone in phone mode; consent with the firm's wording), staff create, reschedule and cancel, self-service by token (several live, all voided on change, expiring at meeting end, the 4 h limit), slots honouring hours, time off, closed days, gaps, shortest notice, window, interval, DST (skip a missing time, offer a doubled one once) and active hosts only, the `.ics` invite (stable UID, SEQUENCE, METHOD:CANCEL; our own ~100 lines, per PF-2's gate), reminders 24 h and 1 h **on `JobPort`**, mail sent after commit through the sending layer and never losing a booking, the attendance question 30 min after the end answered by a person, the arrival path keyed `booking:<id>`, the one-open-prospect move to Consult with its cause, the events. Times with `date-fns` and `@date-fns/tz` (PF-L). **No money is taken at booking** (card at booking is held, map row 44). Every change through `AuditPort`; outbox row last. Register in new `api/src/features/front-office-booking.ts`. Test `tests/check_fo3_booking.ts` covering every line of the row's Done when, with a pass and a fail each, on the fake clock.

**Touch list (nothing else):** new `api/src/front-office/booking/*.ts`, `api/src/features/front-office-booking.ts`, `tests/check_fo3_booking.ts`.

**Must still be true:** every existing suite, the demo reset and the checkpoint load (C10.1) pass unchanged.

**Duplicate check (P-526):** BACKLOG, open PRs, `main`'s code (`git grep -i 'booking\|\.ics\|VEVENT'` under `api/src`) and BUGS; one `Duplicate check:` line.

**Breaker: yes (public door).**

**Rules (standard, every PF/FO brief):** P-559: firm tables, real sign-in and billing are ours in the PF/FO modules (amends P-335/P-357). One row, one session, one PR; new files only outside the touch list. Opus reviewer (P-303); re-review reads only the diff (P-277); label `review: approved` only after `Reviewer: Approve <sha>` and green CI (P-277, P-385); merge `main` only on a conflict (P-270). Live AI off, US$0, never a priced button (P-175). No real keys or secrets anywhere; outside services only through fakes and test keys in CI. Push after every step (P-557). Questions as a PR comment headed "Question for the tech lead"; report to the current Lead (`tools/current-lead.sh`) for the merge queue and to **Lead B** (row owner, branch `lead-b-front-office`, hand-over `product/design/lead-b-state.md`) for the row. Cross-module port interfaces, their fakes and shared event payload types go in `prototype/studio/ports/` (`zod` only; case-side contract v0.1 §1 rule 3); adapters stay in the module's folder; never import `engine/` or case-side files (rows rev 14.1). Every token earns its outcome (P-556): read only the files named here and the code you change.
---

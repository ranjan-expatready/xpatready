# Build card standard: how every requirement is written

> Version 1.1 · 2026-10-17 · Product owner: the product owner · Applies to all FINAL-Agent-FR and FINAL-SuperAdmin-FR documents from 17 Oct 2026. *Same-day fixes (17 Oct): AG16-83 – AG16-88 — dedupe wording in the worked example (byte-identical PDFs only).* *v1.1 (17 Oct, second pass): worked example fixed (AG16-54 #13); field 10 gains "Person decides" and the AG16-60 line; "Clicks" line added to field 12 (AG16-63(4)); AG16-76 added to the writing rules.*

## Why this exists

Most developers on ExpatReady build with coding agents (Claude, Codex). An agent builds exactly what it is told and guesses the rest. A build card removes the guessing: it says **what**, **why**, **where**, **how**, **which Doer**, **AI or no AI**, and **how to prove it works**.

The card follows the repo's own gate, `ERv2-sanitized/AGENTS.md` → "Feature truth before code" (actor and outcome; states; data owner, tenant boundary, permission or entitlement; audit/event facts; non-goals; smallest proving test; delivery mode). An agent can copy a card into its plan, or into `speckit-specify`, without rewriting it.

## Where cards live

- **One card per requirement or decision**, inside the owning epic (the single-home rule, AG16-11). There is no separate file per card. Other epics link to it in one line.
- New cards go in a section **"Build cards"** at the end of the epic's requirements section, ordered by requirement ID.
- `DEV-TASKS` lists the cards to build and links to them. It does not repeat them.

## The card (fill every field; write "None" rather than leave one out)

```
### <REQ-ID> — <short name>            Decision: <AG16-xx, …>   Status: Built | Partly built | Not built

1. Outcome      <Actor> can/gets <result>. One sentence.
2. Why          The user problem, with evidence (data, source, decision).
3. Where        Owning module and service; screens; API/worker; existing code as `path:line`, or NEW.
4. Engine       Rules (no AI) | AI | Rules + AI.
                Doer(s): <Mailer, Tasker, Minder, Messenger, Reminder, Biller, Binder, … | Reader, Sorter, Writer, Checker>.
                For AI: plan-gated (AG16-34); locked until provider recorded (AG11-D13); behaviour when AI is OFF: <exact>.
5. Rules        Numbered steps in execution order: patterns/regex, matching order, defaults, limits, clocks
                (calendar vs working days, AG16-6). Each step has a worked example:  input → expected output.
6. States       States and transitions (e.g. Suggested → Confirmed | Dismissed). "None" if stateless.
7. Data         New/changed entities and fields with types; tenant boundary (firm_id); retention.
8. Access       Permission keys (exact, e.g. `agent/communication:resolve-unmatched`) and plan entitlement.
9. Events       Audit entries and domain events emitted/consumed.
10. Safety      Confirm-before-commit (AG16-31); Quiet by default (AG16-42); privacy (what is never logged);
                warn-never-block (Rule 7).
                Person decides: <what the person still decides or does; ExpatReady only prepares, shows or reminds> (AG16-76).
                Duplicate beats a miss (AG16-60): where a client, deadline, money or broken connection could be
                missed, accept a duplicate for what staff can see (lists, tasks, staff reminders, records), and leave
                a visible alternative to any suppression. Never extra automatic messages to clients.
11. Tests       Given / When / Then. Always include: the happy path, one failure state, and the AI-OFF case
                when AI is involved. Name the fixture file when one exists.
12. Edge cases  Case → simplest answer.
                Clicks: added / removed for the person doing it, e.g. "removes 1 manual forward per letter; adds 0" (AG16-63(4)).
                A change that adds routine clicks needs a stated reason.
13. Non-goals   What NOT to build (stops agents over-building).
14. Mode        THIN SLICE | HARDEN (per AGENTS.md: HARDEN when it touches schema, tenancy, auth,
                payment, PII, worker/async, export or destructive actions).
```

## Writing rules

- **Plain English, exact values.** "Due in 2 days", not "soon". "`\b[A-Z]{1,2}\d{8,9}\b`", not "an application-number pattern".
- **No assumption words.** Replace "probably", "should", "typically" with a citation or an open question (CLAUDE.md evidence rule).
- **Built stays.** If code exists, cite `path:line` and describe the change against it. Never ask an agent to rebuild what exists.
- **AI is always optional.** Every AI step states what happens without AI. Rules are the floor on every plan (AG16-33).
- **Doer names are exact** (Glossary): Reader, Sorter, Writer, Checker are AI; all others are everyday (rules). "Drafter" means only the non-AI document generator.
- **One home.** A card is written once, in its owning epic.
- **Fixtures for rule engines.** Rule-based matchers (letter library, payment notices, form notifications) ship with de-identified test fixtures. Source: `research_notes/Mailbox connection design for ExpatReady/` (`ircc_email_samples.md`, `ircc_pdf_letters.md`, `inbox_mix_snapshot.md`). No real names or unmasked numbers in fixtures.
- **Help people, don't replace them; do, don't overdo (AG16-76).** ExpatReady prepares, shows and reminds staff; people decide and act, especially toward clients. No new client-facing automation without the product owner's approval; no follow-up chains beyond the firm's own Automatic messages rows (AG-12). Every card states what the person still decides (field 10). A duplicate beats a miss (AG16-60) applies to what staff can see, never to extra messages to clients.
- **Open questions** go to the epic's open-questions list with an owner, never into the card as a guess.

## Worked example (shortened; the requirement ID is illustrative)

```
### AG-10-70 — Recognise and match government mail      Decision: AG16-27, AG16-42   Status: Not built

1. Outcome      Case officer gets each IRCC/provincial email filed to the right case, without forwarding it by hand.
2. Why          58% of a sample firm's incoming mail is government mail; 44 manual forwards in 14 days
                (research_notes/…/inbox_mix_snapshot.md).
3. Where        AG-10 §3.2 inbound matcher; worker job after mailbox sync; NEW service `GovernmentMailMatcher`;
                existing matcher order described at AG-10 line 247 (not built in code).
4. Engine       Rules. Doer: Mailer. Rules read a PDF's text layer. AI optional: Reader (plan-gated) is used only for
                scanned PDFs with no text layer;
                AI OFF → a scan with no number in subject, body or file name goes to Unmatched marked "Government mail".
5. Rules        1) Sender domain in `GovernmentDomain` list (cic.gc.ca, notification.canada.ca, …) → government mail.
                   e.g. donotreply@cic.gc.ca → yes; noreply@docusign.net → no.
                2) Unwrap "Fwd:" (original From/Date/Subject from the body header block); dedupe only for
                   byte-identical PDFs (hash) (fix 17 Oct — AG16-83 item 2, AG16-64).
                3) Application number `\b[A-Z]{1,2}\d{8,9}\b` in subject → body → attachment file name → PDF text layer;
                   match `Case.applicationNumbers`.  e.g. subject "…W30•••••••" → case with that number.
                4) Else UCI (10 digits or NN-NNNN-NNNN, hyphens stripped) → person → their single open case;
                   several open cases → Unmatched with candidates.
                5) Else provincial file number. 6) Else Unmatched ("Government mail").
6. States       Synced → Filed | Unmatched → Filed (manual) | Dismissed.
7. Data         Case.applicationNumbers: string[]; Person.uci: string?; Case.provincialFileNumbers: string[];
                GovernmentDomain{domain, kind} (pack content). Firm-scoped rows carry firm_id.
8. Access       Filing: system. Unmatched: `agent/communication:resolve-unmatched`.
9. Events       message.received (existing); audit "government mail filed (rule: application number)".
10. Safety      Filing is silent (AG16-42). Subjects, bodies and file names are personal data: never logged.
                Person decides: which case an Unmatched item belongs to. A duplicate item is kept visible, not hidden (AG16-60).
11. Tests       Given a donotreply@cic.gc.ca email whose subject holds a case's application number,
                when sync runs, then it is filed to that case and no alert is raised.
                Given the number is only inside a scanned PDF (no text layer) and AI is OFF, then the item is in Unmatched marked
                "Government mail".  Fixture: fixtures/government-mail/*.eml (de-identified).
12. Edge cases  Same letter emailed and staff-forwarded → one item. One application, two UCIs (family) → same case.
                Clicks: removes 1 manual forward per government email; adds 0 (Unmatched items need 1 pick).
13. Non-goals   No IRCC portal login, no scraping, no browser extension (AG16-41).
14. Mode        HARDEN (worker, PII).
```

## Audit after writing

Each updated epic is checked against this standard. Every new card must have all 14 fields; every AI step must state its AI-OFF behaviour; every built claim must have `path:line`.

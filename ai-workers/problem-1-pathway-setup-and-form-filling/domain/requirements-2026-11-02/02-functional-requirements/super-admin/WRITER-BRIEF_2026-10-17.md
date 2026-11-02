# Writer brief: applying decisions to the requirement documents

> *21 Oct 2026 (final hand-over check of AG-02): the "Let the firm manage its own work" line in §2 updated for AG02-D1 and AG02-D9(2).*
>
> Version 2.1 · 2026-10-17 · Product owner: the product owner. Replaces the 14 Oct brief. Use this brief whenever approved decisions are written into the AG and SA documents, by a person or by a coding/writing agent. *v2.1 (17 Oct, later the same day): adds the second pass, AG16-54 – AG16-82, and three standing rules (AG16-60, AG16-63, AG16-76); see §1a.*

Workspace: `/Users/team-member/Documents/team-workspace`. Product: ExpatReady, SaaS for Canadian immigration firms (RCICs and lawyers), solo to 15–20 staff, non-technical owners; clients are often abroad. These are high-stakes requirement documents.

## 1. Decision sources (read before writing)

- `FINAL-SuperAdmin-FR/TEMPLATE-MAP-working_2026-10-10.md` is the decision log. This round applies section **"## AG-16 review — decisions"**, entries **AG16-24 to AG16-53** (AG16-1 – AG16-23 are already applied in the 14 Oct versions). Use the map text exactly; never invent a decision.
- **Later wins.** Where two decisions conflict, the later one wins. Inside this round, corrections are marked in the map: AG16-44 corrects AG16-27, -32, -41, -42 (no automatic merge or de-duplication by judgement); AG16-51 trims AG16-45 (no escalation by office), AG16-48 (checklist is a plain list) and AG16-49 (08:00–20:00 window fixed, no setting); AG16-53 supersedes AG16-52's knock-on (`agent/integration-calendar:create` is withdrawn). Struck-through text in the map is not a requirement.
- **Standing rules** (apply everywhere, cite them where a card relies on them): AG16-31 *ExpatReady suggests, the firm decides*; AG16-33 *AI reads, rules check, a person confirms*; AG16-42 *quiet by default*; AG16-44 *never quietly judge*.
- Terminology: "home screen" (not "My work"; AG17-D61). The AI Doers are **Reader, Sorter, Writer, Checker**; all other Doers are everyday (rules). "Drafter" means only the non-AI document generator.

## 1a. Second pass (17 Oct): AG16-54 – AG16-82

- Apply map entries **AG16-54 – AG16-82** to every document named in each entry's "To apply" line. **Later wins:** these entries change earlier ones where they say so (e.g. AG16-57 replaces the separate "possible new enquiries" list; AG16-62 removes the masked sentence; AG16-75 removes "Remind [client] until they confirm"; AG16-77 replaces SA5-D54's countdown points; AG16-78 removes "All chats" and the "Past chat" mark of AG16-57(3); AG16-79 removes the December item and the per-day tick of AG16-46; AG16-80 removes the Admin's AI-off right of AG16-20; AG16-81 removes AI drafting of letter entries; AG16-82 replaces the WhatsApp-only failure rule of AG16-48(5)).
- **AG16-54** lists 25 consistency fixes; apply each one that touches your file.
- **AG16-55:** close each open question your file lists in the AG16-55 ranges with the default its writer recommended, citing AG16-55. A question with no stated default stays open and is reported. Where a default overlaps a decision AG16-56 – AG16-82, the decision wins. A default that would move a day-to-day feature to Release 2 is not accepted; report it.
- **New standing rules** (cite where a card relies on them): **AG16-60** a duplicate beats a miss — for what staff can see (lists, tasks, staff reminders, records); never extra automatic client messages. **AG16-63** design checks. **AG16-76** help people, don't replace them; do, don't overdo: ExpatReady prepares, shows and reminds staff; people decide and act; no new client-facing automation without the product owner's approval.
- Build cards: every new or changed home requirement gets a full 14-field card (§4). Each card adds one line under field 12 or 13: **"Clicks: added / removed for the person"** and under field 10: **"Person decides: …"** (AG16-63, AG16-76).

## 2. Product rules every edit must respect

- **Written to be understood (X-1, 18 Oct):** epic order Start here → build cards → rules and tests → appendix; plain English for non-native readers (one idea per sentence, ~20 words, simple words, every term defined, one word per concept, worked examples); no struck or historical text in the build path (appendix); after any rewrite, script-check that every requirement ID, number, permission key and field name is unchanged.

- **Product-wide rules have one home (18 Oct):** Agent `00-Overview` → "Product rules every epic follows". **Every epic keeps a complete table "Decisions that change this epic"** (decision, what was decided, what it changes here, where): when you apply a decision to a document, add or update its row in that table. New decisions use the epic prefix (e.g. AG07-D1) or X-n, with "Home:" and "Epics affected:".

- **Email-first (AG16-92, 18 Oct):** the portal is optional; anything the client must do or know is emailed (or sent on their preferred channel) and doable without a login (reply with attachments, or a no-login link). Never measure client engagement by portal logins. **Let the firm manage its own work (AG16-89):** assign / take it / file; no routing rules or conditions; lead sharing is one setting (AG02-D1); labels on people only (AG02-D9(2)).

- **Rule 7:** the firm owns its legal compliance; ExpatReady warns, never blocks; **no regulator or statute names in product text**.
- **Rule 8 / Rule 9:** small firms; zero setup, defaults first, Advanced collapsed, plain language, one screen one job.
- **Release 1** is full-featured for day-to-day work; never move a day-to-day feature to Release 2.
- **Built stays:** if code exists, the spec follows the code unless a decision says otherwise. Cite `path:line` only when you opened the file or the map gives it.
- **Single-home rule (AG16-11):** each rule or screen is specified in exactly one document; every other document refers to it in one line and adds no control of its own. Homes for this round:

| Topic | Home |
|---|---|
| Mailbox rules: connect flow, roles, filing order, government mail, Unmatched, "Not brought in", Waiting on us, "Not on this case", thread actions, Translate/Summarise, quiet hours sending window, WhatsApp inbound filing and history import | **AG-10** |
| Home screen sections, engine of Doers, AI gating notes, deadline reminder recipients, clocks | **AG-11** |
| Tasks from email, "Overdue by person" | **AG-13** |
| Settings placement: Connections, My account (email, calendar, video), closed days screen, office time zone screen, WhatsApp connect screen | **AG-16** |
| `Office.timezone` field | **AG-01** |
| Leads from form notifications, lead duplicates | **AG-02** |
| Video links, bookable slots | **AG-04** |
| Payment-notice suggestions, "Payments to record" | **AG-06** |
| Case numbers (application number, UCI, provincial file number), related contact with relationship, `Contact.timezone` | **AG-07** |
| PDF upload runs the letter library, attachment fulfils a request | **AG-09** |
| Automatic messages page | **AG-12** |
| Letter library entries, holiday reference list, "New letter patterns" review queue | **SA-01** (pack content) |
| Template wording for letter notes ("Tell the client"), journey-stage tag on automatic messages | **SA-05** |
| Plan catalogue | **SA-03** · Permissions **SA-06** · ExpatReady staff access **SA-07** · Providers and go-live **SA-08** · Audit and privacy logging **SA-11** |

## 3. How to write

1. **Version bump:** copy the current file to the next version with date `2026-10-17` (e.g. `AG-10-communication-hub_v1.14_2026-10-17.md`), edit the **new** file, then move the old file into that folder's `_archive/`. Update the "Document control" line and the "Previous version" pointer. `DEV-TASKS_2026-10-12.md` is edited in place (new dated section).
2. Add **one change-log row** at the top: version, `2026-10-17`, a plain summary, the decision IDs.
3. Mark changed requirements inline in the file's own style, e.g. *(changed v1.14 — AG16-26)*; withdrawn: strike through or "Withdrawn v1.14 — AG16-53". Keep requirement IDs stable; new requirements take the next free ID. Close open questions the decisions answer, citing the decision.
4. **Edit surgically.** Change only what the decisions require. Never delete history rows.
5. Plain English, short sentences, exact values.
6. A contradiction you cannot resolve from the map: **do not guess**. Leave the text, add a row to the document's open-questions list, and report it.
7. Do not touch files outside your assignment. Do not edit the decision map.
8. **Call out, don't fix (the product owner, 17 Oct).** While writing, look for conflicts, redundancy, noise, low-value or over-engineered requirements, in your file and against other epics. Do not resolve them by judgement. List each under "For the product owner to decide" in your report: item, `file:line`, why (conflict / redundancy / noise / over-engineering), and a simpler recommended option.

## 4. Build cards

Every **new or changed requirement in its home document** is written as a build card per `FINAL-SuperAdmin-FR/BUILD-CARD-STANDARD_2026-10-17.md`: all 14 fields, exact values, worked input → output examples, engine (Rules / AI / Rules + AI), exact Doer, AI-OFF behaviour for every AI step, permission keys, Given/When/Then tests (happy path, one failure, AI-OFF when relevant), edge cases, non-goals, mode (THIN SLICE / HARDEN). Cards go in a **"Build cards"** section at the end of the requirements section, ordered by requirement ID; the numbered requirement line points to its card. Pointer documents get one line, not a card.

## 5. Report back (concise)

For each file: new path, archived path, requirement IDs added / changed / withdrawn, build cards written, open questions closed, and any unresolved contradiction or question for the product owner (with line numbers). No summaries of unchanged content.

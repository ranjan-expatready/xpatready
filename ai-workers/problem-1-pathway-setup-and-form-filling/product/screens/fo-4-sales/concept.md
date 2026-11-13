# FO-4 — The firm's sales screens, thin (concept, draft 1, Lead B, 13 Nov 2026)

Board: `design/board.html` (five screens, Sample data). Contracts: `../../design/platform-and-front-office-contracts-2026-11-14.md` §2.1, §2.6. Row: FO-4 in `../../design/lead-b-rows-2026-11-14.md`. Source requirement: AG-02 v2.6 (`domain/requirements-2026-11-02/02-functional-requirements/agent/AG-02-…`), cards named below. Every name, number and time is Sample.

## 1. Job and journey
**Job:** a firm turns a stranger's enquiry into a prospect it is working, without losing anyone, and hands a won prospect to the case side. **Personas:** the case officer (takes, calls, engages), the representative (consults, sends the retainer), the owner (form, reasons). The visitor fills the public form. **Journey (AG-02 A4 1-6, thin):** form → Unassigned leads → Take it → Log a call → Engage → board → (FO-3 booking moves to Consult; FO-5/6 retainer moves to Retainer sent and Won) → "Open a case?" (case side). **Requirement ids:** AG-2-5, AG-2-84, AG-2-83, AG-2-13c, AG-2-80, AG-2-75, AG-2-18, AG-2-26, AG-2-44, AG-2-47, AG-2-94, AG-2-37, AG-2-37a.

## 2. Ten layers (STANDARDS §2)
Data, rules, engine, API: FO-1 and FO-2 (new tables and routes, fenced). Contract: zod shapes in `web/src/modules/front-office/contract.ts` mirroring FO-2's responses. UI: this row, new folder through PF-1's seam. AI: none (AG-2-94: rules, no AI; AI off is identical). Governance: every change is a timeline entry and an event (FO-2). In the app today: nothing for sales; the shell, tokens and components exist and are reused. Not built here: booking UI (FO-3's screens), retainer and signing UI (FO-5/6), the Corporate pipeline, Link/Merge, follow-ups, saved views, bulk bar, reports.

## 3. Business rules (each tested pass and fail)
* **BR-1** A lead has no stage, type or value; its screen shows the label Lead and an Engage action (AG-02 BR-22).
* **BR-2** Every enquiry becomes a lead at once, even a repeat; a possible match is shown, never linked (AG-2-84; AG16-60).
* **BR-3** The visitor's page never says whether they are known; a form that is off says "This form is not available" (AG-2-5 rules 10-11).
* **BR-4** Unassigned leads lists open leads with no owner, oldest first, with waited time in the firm's open hours (AG-2-13c rule 6; AG-2-37a rule 6). Firm hours: Sample Mon-Fri 09:00-17:00 until the firm sets them.
* **BR-5** Take it on a lead someone else just took is refused with their name, and the row refreshes (conflict state).
* **BR-6** A logged call never moves a stage; the first logged call is the first response, once (AG-2-37a rules 5, 7).
* **BR-7** Engage makes one prospect in Engaged, Individual only in month one; the clicker becomes owner when the lead has none (AG-2-75).
* **BR-8** No drop onto Won – client; Won only by an executed retainer, Signed offline or Convert to client (with its warning), once (AG-2-26, AG-2-47).
* **BR-9** Mark lost needs a reason from the firm's list; the note is optional (AG-2-44). Close lead needs a reason too (AG-2-80).
* **BR-10** Buttons show only to people allowed and only when the state allows; no "coming soon" buttons (AG-2-94 rule 10d and §2). In a one-user firm, Take it, Assign and Unassigned leads are hidden (X-4).

## 4. Layout
* **Web form** (screen 1): hosted page plus an iframe snippet; five inputs and one tick (BIC-19's client limit); phone first.
* **Leads** (screen 2): pattern *Catalogue* (filter chips Unassigned · Mine · All open · Closed, a table, side panel on select is replaced by opening the record, AG-2-94 being a full screen); counts on chips say what they count.
* **Pipeline** (screen 3): a **board** with a List toggle. Not one of EXPERIENCE §3's seven patterns: AG-2-18 requires it, and it is the proven pattern for staged sales work; recorded as a deviation for the challenger. Lost and Nurture are actions, not columns.
* **Record** (screen 4): pattern *Workspace*: header with label and context chips; left rail person, centre timeline with composer, right rail next step and actions (AG-2-94 rules 1-10). One primary per panel: Engage on a lead, the next step's action on a prospect.
* **Panels** (screen 5): Engage, Log a call, Close lead, Mark lost, Assign, Add a lead are right panels; Convert to client is a yes/no confirm.
* **States:** empty (screen 2's empty text; board: "No prospects yet. Engage a lead to start one."), loading skeletons, long names (one line, full on hover), refused move (message on the card), possible match (amber line, by text not colour alone), conflict (BR-5), read-only (a deactivated owner's items show "Owner no longer active · Assign to…"), form off.

## 4b. Best in class (Lead B's study, product pages and own use; **Unverified until the challenger checks sources**)
Sales tools that set the bar: a contact record in three columns (properties, timeline, associations) — kept (AG-2-94 has the same shape); "days in stage" and a required next step on every deal so nothing stalls — kept as the right rail's next step and days in stage; a call-first queue for new leads with "speed to lead" — kept as Unassigned leads with waited time; legal intake tools that run enquiry → consult → retainer → matter in one pipeline — kept as the stage keys and the "Open a case?" hand-over. **Where we beat them:** nothing typed twice to the case (answer keys travel, §2.6); every stage move says its cause; no stage can be skipped to Won by a drag.

## 4c. Scorecard (EXPERIENCE §6; a sales screen, chosen to use it)
BIC-01 the person's details travel to the case as answer keys, never retyped · BIC-02 N/A (no questions asked of the client beyond the form's five) · BIC-03 N/A · BIC-04 form: "(optional)" in words; staff panels mark optional fields · BIC-05/06/07 N/A (no documents or AI) · BIC-08 chips show every lead and prospect of the person · BIC-09 N/A · BIC-10 next step is a calculated status with its reason · BIC-11 one primary per panel, verb + object ("Engage as Individual", "Save the call") · BIC-12 N/A · BIC-13 errors on the field and in a summary; typed input kept · BIC-14 tooltips on waited time, days in stage, the match line · BIC-15/16/17 N/A · BIC-18 states listed in §4 · BIC-19 board and record checked at 1440 and 1024 px · BIC-20 keyboard move on the board, visible focus, 200 % zoom (board scrolls inside itself, never the page).

## 5. Copy (plain, sentence case)
Leads subtitle: "People who showed interest. Take one to work it, or Engage it when it is a real opportunity." · Waited tooltip: "Time since the enquiry arrived, counting only your open hours." · Match line: "Possible match: same email as <name> (<lead number>). Nothing is linked by itself." · Refused drop: "Won needs a signed retainer or Convert to client." · Convert confirm: "Retainer not signed. Work can start. Invoices will warn you, and the case will show a warning." · Take-it conflict: "<name> took this lead a moment ago." · Lost reason error: "Choose why it was lost."

## 6. Contract and tests
Reads and writes only FO-2's routes (contracts §2.1). Browser checks in `tests/check_fo4_sales_browser.ts`: the journey of the row's Done when; one pass and one fail per BR-1…BR-10; keyboard-only move on the board; 200 board cards render without the page scrolling sideways; axe-core clean; screenshots at 375 (form), 1024 and 1440 px.

## 6b. Capability or scaffolding
All five screens are capability (*Needed for the proof*). The firm-hours setting is scaffolding (Sample hours) until the firm settings screen (PF-9). The "Book a consult" next-step button appears only once FO-3's booking screen is live (BR-10); until then the next step reads "Book a consult" with no button.

## 7. Questions for the founder (recommendation first)
1. **Month one has the Individual pipeline only; employers (Corporate, LMIA) come later.** Recommend yes (P-553 thin month; AG-02 S6 puts the employer track last).
2. **The web form ships as a hosted page link and an iframe snippet; the script embed with campaign capture comes later.** Recommend yes: firms without a web developer can share a link the same day.

## Definition of ready
Acceptance test named (`tests/check_fo4_sales_browser.ts`); row text FO-4 (rows rev 2); decisions: Q1, Q2 answered or proceeded on recommendation (reversible, P-390); fresh challenge in `challenge.md` with every Blocker and Major answered; Lead B's approval (P-223 (4)) recorded in the Lead response.

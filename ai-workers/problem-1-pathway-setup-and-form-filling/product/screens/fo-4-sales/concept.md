# FO-4 — The firm's sales screens (concept r2, Lead B, 14 Nov 2026; r1 13 Nov)

Board: `design/board.html` (r2 Sample). Challenge: `challenge.md` (fresh agent; verdict "Build after these changes", 2 Blockers, 7 Majors, 12 Minors; all answered below and in its Lead response). Contracts: `../../design/platform-and-front-office-contracts-2026-11-14.md` §2.1, §2.6, **§7 (binding)**. Rows FO-4, FO-4b (and FO-4c if split) in `../../design/lead-b-rows-2026-11-14.md` rev 3. Requirements: **AG-02** v2.6 (cards below) and **AG-04** v2.1 (the consult next step, AG-4-63; booking screens are FO-3's). Every name, number and time is Sample.

## 1. Job and journey
**Job:** a firm turns an enquiry into a prospect it is working, Individual or Corporate, loses nobody, and hands a won prospect to the case side. **Personas:** Case Officer (takes, calls, engages), Case Manager (consults, retainer), Owner/Admin (form, reasons). The visitor fills the public form. **Journey (AG-02 A4 1-6, 8-9):** form → Unassigned leads → Take it → Log a call → Engage (Individual or Corporate) → board → (FO-3 booking moves to Consult; FO-5/6 to Retainer sent and Won) → "Open a case?" (case side). **Cards:** AG-2-4, -5, -8a, -13c, -18, -26, -37, -37a, -44, -47, -49, -52, -53, -75, -76, -77, -79, -80, -83, -84, -86, -94; AG-4-63.

## 2. Ten layers (STANDARDS §2)
Data, rules, API: FO-1a, FO-2, FO-2b (fenced). Contract: zod shapes in `web/src/modules/front-office/contract.ts` mirroring FO-2's responses. UI: this row through PF-1's seam, in its own `Frame` (area "Sales", menu Leads · Pipeline · Settings: Web form, Reasons; the Studio `Shell` turns case people away, App.tsx:113). AI: none (AI off is identical). Governance: every change audited (contracts §7). Not built here: booking screens (FO-3's), retainer and signing (FO-5/6), Link/Merge, Nurture, follow-ups, saved views, bulk bar, reports, the Quick LMIA Check.

## 3. Business rules (each a pass and a fail test)
* **BR-1** A lead has no stage, type or value; its screen shows the label Lead and Engage (BR-22).
* **BR-2** Every enquiry is a lead at once, even a repeat; a possible match is shown, never linked; the match line names only people the viewer may see, else "Possible match with a person you cannot see" (AG-2-84, AG-2-94 §12).
* **BR-3** The visitor's page never says whether they are known; a form that is off says "This form is not available"; the hosted and iframe page is shown only on the firm's allowed sites (`frame-ancestors`) (AG-2-5 rules 10-11, AG-2-49).
* **BR-4** Unassigned leads: open leads with no active owner (including a deactivated owner's, shown "(Inactive) Name"), oldest first, waited time in the firm's open hours; seen by people who may see all or assign (AG-2-13c rules 6, 9).
* **BR-5** Take it on a lead someone just took is refused: "<name> already has this lead", and the row refreshes (AG-2-86 rule 3).
* **BR-6** A logged call never moves a stage; the first logged call (its "When", default now, editable) is the first response, once (AG-2-37a rules 2, 5, 7).
* **BR-7** Engage makes a prospect per request (a second Engage of the same lead is allowed and says so); the prospect goes to the lead's owner, or the clicker when none (AG-2-75 rules 9, 12).
* **BR-8** No move into Won by a person: it comes from a signature or Convert to client; a stale move (someone moved it first) is refused with a reload (AG-2-26 rules 2-3, §12). "Signed offline" is FO-6's, not drawn here.
* **BR-9** Close lead and Mark lost need a reason from AG-02's own lists (lead: Not interested, Junk or spam, Cannot reach, Outside what we do; prospect: AG-2-44 rule 2's seven); lost prospects are found under the Lost filter; a closed lead can be reopened (AG-2-44, AG-2-80).
* **BR-10** Buttons follow permission keys and state (table in §6); no button for a module not yet live; in a one-user firm, Take it, Assign, Unassigned leads, owner lines, owner on cards and the owner filter are hidden (AG-2-94 rules 3d, 10d; AG-2-18 rule 3; X-4).
* **BR-11** Convert to client asks a yes/no with AG-02's warning; Undo convert is offered only while the client has no case, invoice or signed retainer, with a reason (AG-2-47 rule 18).
* **BR-12** Corporate Engage needs a company name, offers matches, links nothing by itself; the enquirer is `PRIMARY` and stays labelled Lead; Change type until signed (AG-2-75, -76, -77, -79).

## 4. Layout
* **Web form (hosted page, screen 1):** five inputs and one tick: given names, family name, email, phone (optional), "Interested in" (optional, the firm's services list). The free message is dropped (AG-2-5's short form; BIC-19's five). Phone first.
* **Web form settings (right panel, screen 2b):** On/off, the link to copy, the iframe snippet and (FO-4b) the script snippet, allowed sites, consent wording (versioned; picking a new version never edits the old), thank-you text (AG-2-5 rules 1, 13). Owner/Admin.
* **Leads (screen 2, pattern Catalogue):** search (name, email, phone), chips Unassigned leads · Mine · All open · Closed, a table; the menu badge reads "3 unassigned". Add a lead is a right panel (checks for a known person before saving; the adder owns it).
* **Pipeline (screen 3, a board with a List toggle):** not one of EXPERIENCE §3's patterns; AG-2-18 requires it; the List is the accessible route; recorded here and in the review notes. Individual / Corporate switch (AG-2-53). Cards: name, Interested in or company, owner, value, days in stage, next-step dot. Column header: count and value total; columns page with "Load more". Moves by a **Move to…** menu (keyboard and mouse) on the app's existing dropdown: no drag library in month one (STANDARDS §1).
* **Record (screen 4, pattern Workspace):** AG-2-94's header (name, label, context chips), left rail (person or company and contacts), centre timeline (one page at a time) with Log a call and Add a note, right rail (next step with its reason, days in stage, actions). One primary per panel.
* **Panels (screen 5):** Engage, Log a call, Add a note, Close lead, Mark lost, Assign, Add a lead, Contacts: right panels; Convert and Undo convert: yes/no confirms.
* **Next step:** AG-2-37's rules for the modules that are live; "Book a consult" is not shown until FO-3's booking is live (AG-2-38 rule 7's precedent: a rule waits for its module). The callback-task offer after "No answer" waits for tasks (AG-13); until then the call note is the record.
* **States:** empty (Leads: "No unassigned leads. New enquiries from your web form land here until someone takes them." + Copy your form link; Board: "No prospects yet. Engage a lead to start one."), loading skeletons, long names, refused move, stale move, possible match, form off, not found for a record the viewer may not see (AG-2-94 rule 16), read-only for Read-only people.

## 4b. Best in class (**Unverified**: the challenger did not check sources; to verify at review)
Three-column contact record, days in stage and a required next step, a call-first queue for new leads with speed-to-lead, and one pipeline from enquiry to retainer to matter: all kept. Where we beat them: nothing retyped to the case (answer keys travel, §2.6), every move names its cause, no drag into Won.

## 4c. Scorecard (EXPERIENCE §6, chosen)
BIC-01 details travel to the case as answer keys · BIC-02/03 N/A · BIC-04 "(optional)" in words · BIC-05/06/07 N/A · BIC-08 chips show every lead and prospect · BIC-09 N/A · BIC-10 next step calculated with its reason · BIC-11 one primary per panel, verb + object · BIC-12 N/A · BIC-13 errors on the field and in a summary, input kept · BIC-14 tooltips on waited time, days in stage, the match line · BIC-15/16/17 N/A · BIC-18 states in §4 · BIC-19 five inputs on the form; panels checked at 1440/1024 · BIC-20 keyboard path via Move to…, 200 % zoom (the board scrolls inside itself).

## 5. Copy (AG-02's own words where it has them)
Leads subtitle: "People who showed interest. Take one to work it, or Engage it when it is a real opportunity." · Waited tooltip: "Time since the enquiry arrived, counting only your open hours." · Refused Won: AG-2-26 rule 3's text. · Take-it conflict: "<name> already has this lead." · Engage panel: "Starts a prospect on the <Individual/Corporate> pipeline in Engaged. <Owner> stays its owner. Nothing is sent to <name>." · Convert: "Retainer not signed. Work can start. Invoices will warn you, and the case will show a warning." · Consent tick (Sample, AG-2-83 marketing purpose; Unconfirmed: no counsel): "Send me news and offers from <firm> by email. I can stop at any time." · Lost reason error: "Choose why it was lost."

## 6. Contract and tests
Routes: FO-2 (incl. `GET /api/public/forms/:token`, web-form settings, reasons, Reopen, Undo convert, Lost filter) and FO-2b. **Who may do what (BR-10):** view leads/prospects `agent/prospect:list` (Unassigned also needs see-all or `:assign`); Take it, Log a call, Note, Engage, Move, Close, Mark lost `agent/prospect:edit`; Assign `agent/prospect:assign`; Convert and Undo convert `agent/prospect:convert`; web form `agent/prospect:configure-form`; reasons `agent/prospect:configure-source` (Owner, Admin) — names per AG-02's keys, checked by the builder against SA-06's matrix. Tests in `tests/check_fo4_sales_browser.ts`: the row's journey; BR-1…BR-12 pass and fail; keyboard-only; 200 cards per column page without sideways page scroll; axe-core; screenshots 375/1024/1440.

## 6b. Capability or scaffolding
All screens capability (*Needed for the proof*). Firm hours: from firm settings (PF-3), Sample Mon-Fri 09:00-17:00 until PF-9's settings screen.

## 7. Questions for the founder
None open. Corporate and the embed were answered (22:3x). The challenger's two: **Undo convert** is AG-02's own rule (AG-2-47 rule 18), followed; the **consent wording** follows AG-2-83's marketing purpose as Sample, Unconfirmed: no counsel.

## Definition of ready
Acceptance test `tests/check_fo4_sales_browser.ts` (and `check_fo4b_embed_browser.ts`); rows FO-4, FO-4b rev 3; no open decision; challenge answered (Lead response in `challenge.md`); **approved by Lead B after the independent challenge (P-223 (4)), 14 Nov**; the founder's look next morning, changes become follow-up rows.

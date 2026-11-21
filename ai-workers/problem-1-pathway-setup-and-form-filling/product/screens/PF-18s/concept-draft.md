# PF-18s — Notifications, Offices, the "?" button, Help & support: concept DRAFT (helper, steps 1–7; not `concept.md`)

Row PF-18s + "PF-18s (rev 16.78 amendment)" (BACKLOG); owed lines from Lead B's brief (`lead-b-briefs/PF-18s.md` on `lead-b-front-office`). Source: AG-16-10, AG-16-63, AG-16-68, AG-16 §3.3, AG-1-74 (requirements-2026-11-02). No board (P-223 (4)): layout in `design/draft-layout.html`. Studio paths below are under `prototype/studio/`. Every list value shown is the API's; nothing here is a new immigration value.

## 1. Job and journey
* **Job:** a staff member chooses which notices reach them; an Owner or Admin keeps the firm's offices and who works in each; anyone asks us for help from the page they are stuck on and follows the answer.
* **Personas and keys** (`prisma/migrations/20261114015002_pf3_platform_tables/migration.sql`): all six roles hold `agent/notification:manage-preferences` (:840-845), `agent/settings:list` (:1093-1098), `agent/support-ticket:create` and `:list` (:1137-1148). Owner and Admin also hold `agent/settings:edit` (:1091-1092) and `agent/staff:manage` (`identity/keys.ts:49`).
* **Journeys:** J1 a Case Officer turns off Mentions emails and saves. J2 an Owner adds a Calgary office; its zone shows pre-filled; she places a colleague in it. J3 anyone on a page presses "?", writes one line, sends; later sees "Waiting on firm" in Help & support and replies once, even with a double click.
* Activity / SA-01B ids: not known.

## 2. Ten layers
| Layer | On main (or approved) | New here |
|---|---|---|
| Rules, data | `NotificationSettings` (PR #2304 `api/src/platform/settings/notifications/service.ts`, approved, not merged); `Offices` incl. `setStaffOffice` (`settings/offices/service.ts:148-168`); `SupportService` (`support/support.ts`) | none |
| Contract | `GET\|PUT /api/platform/me/notifications` (#2304 `routes.ts:9-15`); `GET\|POST /api/platform/offices`, `PATCH /:id` (`offices/routes.ts:10-18`); `/api/platform/support/*` (`support/routes.ts:28-56`); `GET /api/platform/staff` (`staff-read/routes.ts:11`) | `PUT /api/platform/staff/:staffId/office` (owed line 1); reads G1, G2 (§6, Q2) |
| Screen | PF-6 frame (`web/src/modules/platform/frame.tsx`), menu `account-sections.ts:5-13` | `web/src/modules/platform/settings/*`; three menu lines; the "?" slot in the frame's `controls` (`frame.tsx:92`) |
| Team's code | not read for this draft (`code/` is Mac-only); to check at challenge | — |

## 3. Business rules (the screen shows them; the server decides)
* BR-1 Only the groups that can reach the person are listed; the API already filters (`notifications/service.ts:38-41`). Case Officer: groups 1-5; Team watch needs `agent/case:assign`; Payments `agent/invoice:list`; Firm and connections Owner/Admin (`samples/notification-groups.json:29-40`, AG-16-10 tests 6-8).
* BR-2 Security emails always on, no switch (`security.switchable:false`, service.ts:19; §3.3).
* BR-3 Payments' email switch covers payment failed and invoice overdue only; received, sent, refund, dunning are in-app only (json:33-37, AG-16-10 test 7). Shown as the group's `whatIsInIt`, verbatim.
* BR-4 A save names `version`; stale → 409 with `current` (service.ts:60); a group that cannot reach the person or a repeat → 400, nothing written (:53-55).
* BR-5 One office → the list answers `multipleOffices:false` and one implicit office; no zone field (`offices/service.ts:49, 67-75`; AG-16-68, AG-1-74 rule 1).
* BR-6 A new office's zone is pre-filled from its province, else the firm's; editable; answer says `timeZoneFrom` (service.ts:77, `zones.ts:19-22`; AG-1-74 rule 2). Bad zone → "Choose a time zone from the list" (service.ts:18).
* BR-7 Office change carries `version`; stale → 409 with `current` (service.ts:128). Add/edit: `agent/settings:edit` (AG-1-74 §8).
* BR-8 Placing a person: same firm, existing office or none (null); another firm's person or office → 404 (service.ts:149-166). Proposed key `agent/settings:edit` (AG-1-74 §8 "No new key").
* BR-9 Tickets: one text box (max 5,000), up to 3 files (10 MB each, Sample), no priority; page = app path, query and fragment dropped, max 300 (`support.ts:28-31, 70-72`; AG-16-63).
* BR-10 Each person sees their own tickets; Owner and Admin all, and may reply on any (`support.ts:124-125`, `list` :170 answers `allFirm`). Statuses: Open, Waiting on firm, Waiting on support, Closed (`prisma/schema/platform-support.prisma:16-21`). Closed takes no message: 409 (`support.ts:55`).
* BR-11 No double reply (owed line 2): Send is disabled from the first press until the answer; Enter while sending does nothing; a failure re-enables Send and keeps the text. Pattern: complaints' `sending` ref set before `mutate`, cleared `onSettled` (`complaints/record-drawer.tsx:33, 55, 77`; `action-drawer.tsx:40, 76, 106`, #1998). No server key in PF-18s.

## 4. Layout (`design/draft-layout.html`: boards A-E at 1440 and 375)
* **Placement (recommendation, Q1):** three new lines in the one menu, `ACCOUNT_SECTIONS`: Notifications `/account/notifications` (key `agent/notification:manage-preferences`), Offices `/platform/offices` (`agent/settings:list`), Help & support `/platform/support` (`agent/support-ticket:list`). Why: it is the only menu, already holds firm settings (Team, Security, Terms) and is built to take a line per row with no frame edit (`account-sections.ts:1-2`). The page subtitle carries the requirement's words ("Advanced → Offices", "Settings → Help & support") so the mapping is visible.
* **A. Notifications (Workspace-lite, one card):** title + subtitle; a table of the person's groups: Group (label + `whatIsInIt`) · In app · Email, each a native checkbox styled as a switch (`role="switch"`, label "Email for Mentions"); a last row "Security emails (new sign-in, password change)" with the text "Always on", no control (BR-2). **One Save** for the page (recommended: one PUT with only the changed groups, one version; per-switch saves would race their own versions and AG-16's settings use an explicit Save, AG-16-59 §10). Save is disabled until something changes; leaving with unsaved changes asks once. Saved → toast "Notification settings saved"; groups whose switches equal the defaults show "Default" quietly.
* **B. Offices, one office:** one card: "{firm name} — your firm's one office. Its hours, closed days and time zone are the firm's own." Owner/Admin: "Add an office" (filled). Others: same card, no button, "Only an Owner or Admin can add an office."
* **C. Offices, two or more:** table Name · Where (province, country) · Time zone · Hours (Mon–Fri 09:00–17:00 style summary, read-only) · Edit (Owner/Admin). Below, Owner/Admin only: **"Who works where"** table Person · Office · Change (dialog: radio list of offices + "No office", Save → PUT). Right after the second office is added: notice "N people have no office yet: their times use the firm's zone until you place them." (AG-1-74 §12).
* **Add / edit office drawer (Side panel, 520 px):** Name · Country (Canada default) · Province or territory (list) · Time zone (edit only; on add it is filled by the server and shown after save with "Pre-filled from Alberta. Change it here." in the edit drawer). Field errors from 400 `issues` on each field + summary.
* **D. "?" button and Raise panel:** an icon button "?" (accessible name "Get help with this page", tooltip the same) in the frame's controls on every PF-6 page. Opens a Side panel "Ask for help": one textarea "What do you need help with?", Attach files (up to 3), the line "We'll note the page you're on: /platform/complaints/3f2a…" (the `pathname` only, shown before sending; never the query, hash, title or any field value), Send. Sent → "Ticket sent. We'll answer in Help & support." with a link; `emailed:false` changes nothing for the person.
* **E. Help & support:** Library list: "Raise a ticket" (filled) · table Raised (link) · From page · Status (shape + word; Waiting on firm in orange: the one "needs you") · Raised by (Owner/Admin only, names from `GET /api/platform/staff`) · Last change. Ticket page: header (page, status), messages oldest first (You / {name} / "ExpatReady support"), files as links (signed link per click), reply box with Send at the bottom (BR-11); closed → no box, "This ticket is closed. Raise a new one if you still need help."
* **States drawn:** loading skeleton; empty (each page); read-only (B for a Case Officer); 409 conflict (A, C); field error (drawer, raise); refused 403; not found (ticket); sending (Send busy and disabled); send failed (text kept); long content (120-char office name, 5,000-char message). 375 px: tables become stacked rows, the page never scrolls sideways; the "?" stays in the header.

## 4b. Best in class (Unverified: vendor pages could not be fetched from this session, 403 at the proxy; named practice only)
* Per-channel matrix (GitHub, Slack, Jira notification settings): one row per kind, columns per channel, locked rows for security mail. Copied: the matrix, the locked row. Beaten: only kinds that can reach you are listed.
* In-app help widgets (Intercom, Zendesk): a help button on every page that attaches the page address. Copied; beaten: the person sees exactly what is noted before sending, and nothing else is.
* Multi-location settings (Google Workspace, Clio): zone per location, defaulted. Copied: pre-filled zone; beaten: hidden entirely until a second office exists.

## 4c. Scorecard
N/A as a whole: firm and personal settings, not a case-side screen (§6 scope). Met in spirit: BIC-11 (one filled button per page), BIC-13 (errors on the field + summary), BIC-18 (states), BIC-19 (orange only for Waiting on firm), BIC-20 (keyboard, 375/1024/1440).

## 5. Copy
* Notifications subtitle: "Choose how you hear about your work. You only see the groups that can reach you." 409: "Your notification settings were changed elsewhere since you opened them." (service.ts:21) + "We've loaded the latest; your unsaved changes are kept on top. Save again." 400: the service's `detail`, then reload.
* Offices subtitle: "Advanced → Offices. Each office keeps its own time zone and hours once you have more than one." 409: "Someone changed this office since you opened it." (service.ts:128) + Reload.
* Place dialog: "Which office does {name} work from?" · "No office (uses the firm's time zone)".
* Help subtitle: "Settings → Help & support. Ask us anything; we reply here." Empty: "No tickets yet. Press ? on any page, or Raise a ticket here." Owner empty: "No one in the firm has raised a ticket yet."
* Send failed: "Not sent. Your message is still here; try again." 409 closed: the service's words (support.ts:55).
* Status tooltips: Waiting on firm "We've answered and are waiting for you." Waiting on support "We have your message." Open "Sent; we haven't answered yet." Closed "No more messages on this ticket."

## 6. Contract and tests
* **Owed 1:** `PUT /api/platform/staff/:staffId/office` body `{officeId: uuid | null}` → 200 `{staffId, officeId}` via `Offices.setStaffOffice`; key `agent/settings:edit`; a second controller in `offices/routes.ts`. Tests (API suite): pass place, move, take out (null); fail no key 403, another firm's staff 404, another firm's office 404, bad id 404, extra field 400; one audit line each (service.ts:164).
* **G1 (Q2) placements read:** none exists (staff rows have no office, `staff-read/service.ts:39-40`). Proposed `GET /api/platform/staff/offices` → `{placements:[{staffId, officeId}]}`, `agent/settings:edit`.
* **G2 (Q2) ticket preview:** the list has no words of the ticket (`support.ts:170-173`). Proposed `preview` (first 80 characters of the first message) on list items; without it the list names the page only.
* **Browser journeys** `tests/check_pf18s_settings_browser.ts`, `PF-18s DWn`, seeded through the API:
  * DW1 Case Officer sees groups 1-5 and the locked security row (fail: Team watch, Payments, Firm absent); Owner sees 8; Billing sees Payments with its in-app-only items.
  * DW2 Mentions email off → Save → reload shows off; a second tab's save → 409 words, latest loaded, edit kept.
  * DW3 One office: Case Officer sees the card, no zone, no button; Owner adds "Calgary", AB → edit drawer shows `America/Edmonton` pre-filled; a forced bad zone shows "Choose a time zone from the list"; stale edit → 409.
  * DW4 Owner places a Case Officer in Calgary → reload shows it; "Who works where" absent for the Case Officer.
  * DW5 "?" on `/platform/complaints/:id?view=x` → ticket's `page` equals the path without `?view=x`; focus returns to "?" on close.
  * DW6 Case Officer sees only own tickets; Owner sees all with names and replies on another's; closed ticket has no reply box.
  * DW7 (owed 2) double click on Send and double Enter (Enter on the focused Send; Ctrl/⌘+Enter in the box) → exactly one new message in `GET tickets/:id`; fail: the same two sends made straight to the API land two messages, so the guard is what stops the second. A failed send (route returns 500 once) keeps the text and re-enables Send.
  * Keyboard only through J1-J3; axe-core on every state; 375/1024/1440, no sideways page scroll.

## 6b. Capability or scaffolding
All four pages, the "?", the PUT route and G1: capability, *Needed for the proof*. Editing office hours and closed days (AG-16-75), Default lead representative (AG-16-68), Notifications → All (PF-18ns): *Not built* here. The "?" on frames that are not PF-6's (sales, Studio, case pages): *Not built* here (Q3). Proposed split (P-610, < 800 lines): part 1 PUT + G1 + Notifications; part 2 Offices; part 3 "?" + Help & support + G2.

## 7. Questions (recommendation first)
1. **Founder — where Offices and Help & support live.** Recommend: three lines in today's My account menu now, with the requirement's path in each subtitle; a separate Settings area becomes one row when AG-16's other Settings pages arrive (AUD-4s already names "Settings → Security & your data"). Alternative: split now into My account and Settings (a PF-6 frame change, Lead B's file).
2. **Lead — two reads no route gives (G1 placements, G2 ticket preview).** Recommend: both in PF-18s's runtime part beside the owed PUT. Without G1 the Owner cannot see who is where; without G2 the list shows only pages.
3. **Lead — "?" on every screen (AG-16-63) vs "PF-6's frame" (row).** Recommend: PF-18s ships it in PF-6's frame; a one-line follow-up row adds the same button to the sales frame and the Studio frame.

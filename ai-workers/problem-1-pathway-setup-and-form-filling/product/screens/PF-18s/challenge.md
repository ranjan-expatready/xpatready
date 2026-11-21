# PF-18s — fresh challenge of `concept-draft.md` and `design/draft-layout.html`

Challenger: a fresh context that did not draft the concept and will not build it (skill screen-concept part B). Read: BACKLOG `PF-18s` + rev 16.78 amendment; Lead B's owed lines (`lead-b-briefs/PF-18s.md` on `lead-b-front-office`); `trace-requirements.py --brief PF-18s` (AG-16-10, -63, -68); AG-16 §3.0, §3.3, §3.15, §3.18, AG-16-75; AG-01 AG-1-74; PRODUCT, STANDARDS, EXPERIENCE, QUALITY, TEAM-PATTERNS; studio code on `origin/main` (a518388f2) and the notifications API on `origin/claude/runtime-pf18a-notif-prefs` (#2304). Paths below are under `prototype/studio/` unless they start with `product/` or `domain/`.
**Freshness:** `ai-workers/tools/freshness.sh` fails here (`code/README-copies.md` missing: `code/` is Mac-only). The team's code was not read: every retrofit point (side 6) is **Unverified**. Best-in-class vendor pages were not fetched either (the draft says the same).

## Verdict
**Build after these changes.** No Blocker. Seven Majors, all fixable inside the row without new scope: two are requirement fits on Offices (who sees it; the person confirms the pre-filled zone), one is the owed double-send test, two are on the Help pages' words and names, one is test seeding that the API cannot do, one is the part order.

## Objections

### Blocker
None.

### Major
**M1 — Offices is shown to every staff member, and shown with one office.** *Needed for the proof.*
* **Fact:** the menu line is keyed `agent/settings:list` (draft §4), which all six roles hold (`prisma/migrations/20261114015002_pf3_platform_tables/migration.sql:1093-1098`); board B gives a Case Officer an "Offices" page with "your firm's one office".
* **Requirement:** AG-16 §3.0 puts Offices under Advanced, "Owner and Admin unless a row says otherwise" (`domain/…/AG-16-…md:499`). §3.18 says "A firm has one office automatically and never sees 'office'" (:752). AG-16-75 rule 1 says "The Offices page and its fields appear only once a second office exists… With one office nothing changes" (:1287), and its test says one office means no time-zone or per-office fields (:1298). AG-1-74 §8 "Reading: all staff" (`AG-01…md:673`) covers reading the zone through the API, not the page.
* **Breaks:** with one office, a Case Officer meets the word "office" in the menu and on a page that the requirement says does not exist for them.
* **Fix:** key the menu line `agent/settings:edit`. With one office, an Owner or Admin sees only the "Add an office" entry and its one-line explanation (no office card, no zone). Everyone else sees no Offices line. DW3 then gets a fail: the Case Officer has no Offices menu line and `/platform/offices` shows the no-access state. The API's `GET /api/platform/offices` stays on `settings:list` for other readers.

**M2 — The person never confirms the pre-filled time zone, and the province list has no source.** *Needed for the proof.*
* **Fact:** in the add drawer the Time zone field is hidden. The server fills it, and it is shown afterwards only in a separate edit drawer (draft §4 "Add / edit office drawer"; board C2 note).
* **Requirement:** AG-16-75 §10 says "the time zone is pre-filled, the person confirms or edits it" (AG16-90, :1297). AG-1-74's test says "when the Admin adds a Calgary office … then the new office's time zone shows `America/Edmonton`, pre-filled and editable" (`AG-01…md:676`). Its §10 says the zone is saved only by an explicit Save (:675).
* **Breaks:** the office is saved, and its clocks run, on a zone nobody looked at. There is also a hidden gap: the drawer's "Province or territory (list)" has no source. The codes live only in `samples/province-time-zones-ca.json`, read by `settings/offices/zones.ts:198`, and no route exposes them. The web would have to copy the pack (STANDARDS §3.1, §7 "no duplicated logic"). The board also shows "Alberta (AB)", but the pack holds codes only, so the names are unsourced.
* **Fix:** add one small read, `GET /api/platform/offices/provinces` → `{provinces:[{code, zone}]}` from `zones.ts` (`agent/settings:edit`, about 10 lines plus 2 tests). The add drawer then shows Time zone pre-filled as soon as a province is picked, editable through the zone picker that `booking-public/time.ts:15` `allZones()` already offers (as `availability-page.tsx:131` does). Send `timeZone` only when the person changed it, so the audit keeps `timeZoneFrom: "province"` (`offices/service.ts:129-131`). Show codes, or add names to the pack with their source; do not type them in the web. This read is needed. G1 and G2 are judged in m1 and M5.

**M3 — The owed double-send test is not the one Lead B asked for, and Raise has the same hole.** *Needed for the proof.*
* **Fact:** DW7's fail case is "the same two sends made straight to the API land two messages" (draft §6). The owed line says: "**fail:** with the guard removed, the same test sees two messages" (`lead-b-briefs/PF-18s.md`, owed 2).
* **Breaks:** two ways.
  * The draft's fail case only shows that the server does not deduplicate (`support.ts:242-255` has no key). It does not show that the browser test catches a missing guard. Against a local API that answers in a few ms, the second click can arrive after the first answer, so the pass test can go green with no guard at all: a test that cannot fail.
  * Raise (`POST /support/tickets`, `support.ts:194-225`) has no key either. A double click on "Send" in the Ask-for-help panel makes two tickets and two emails to the support inbox. BR-11 and DW7 cover replies only. QUALITY D5 ("survive … double click") is the bar here, so this is not added scope.
* **Fix:**
  * In DW7, hold the first POST with `page.route` until the second click, or the second Enter on the focused Send, has been dispatched. Then assert one POST seen at the network and one new message in `GET tickets/:id`.
  * Run the same test once with the guard line removed and record its red result (two POSTs, two messages) in the build notes and the PR. That is the owed fail, and STANDARDS §7 "a rule's test fails when the rule is removed".
  * Apply the same guard and the same held-response test to Raise: one ticket.

**M4 — Names on Help pages have no source for most people, and cost a per-person provider call.** *Needed for the proof.*
* **Fact:** the draft takes names from `GET /api/platform/staff` (draft §4 E). That route needs `agent/staff:manage` (`staff-read/routes.ts:11`), held by Owner and Admin only. It also calls the identity provider's two-step check once per person (`staff-read/service.ts:49-51, 64`). Ticket messages carry only `authorKind` and `authorId` (`support.ts:166-169`).
* **Breaks:** an Owner or Admin may reply on anyone's ticket (AG-16-63; `support.ts:182`). When the Case Officer who raised it opens it, the Owner's message has no name to show ("{name}" on board E2 cannot be filled), because the Case Officer cannot call `GET /staff`. Also, the Owner's list makes two requests per screen view, one of them N provider calls (STANDARDS §5 "one request per screen view").
* **Fix:** in `support.ts`, the server answers `raisedByName` on list items and `authorName` on `FIRM_STAFF` messages. Both come from `platform_staff.display_name` in the firm, in the same query. AG-01 AG01-28 already says "colleague names in pickers and on records need no key" (`AG-01…md:13`). Do this in the same small `support.ts` change as G2 (M5). The Help pages then never call `GET /staff`.

**M5 — Paths with ids are the main identifier of a ticket, so G2 is needed, not scope creep.** *Needed for the proof.*
* **Fact:** board E1's "From page" column shows `/platform/complaints/3f2a…`. Board E2's heading is "Ticket from /platform/complaints/3f2a…". Without G2 the draft says "the list names the page only" (§6).
* **Rule:** EXPERIENCE §5 [M] says "no hashes, IDs … or file paths on the main path"; QUALITY D10 says "No hashes, IDs or jargon on the main path". AG-16 §3.15 already treats "the first line as the subject" (in support's queue, :725).
* **Fix:** keep G2, defined as the **first line** of the first message, cut to 80 characters (the requirement's own subject rule). Use it as the list's link text and the ticket's heading. Move the page to a muted secondary line ("Raised from …") on the ticket page and drop the column from the list. The Raise panel may keep showing the exact path that will be sent: it is a disclosure of what leaves, not an identifier (judgment).

**M6 — "Waiting on firm" and "Closed" cannot be seeded "through the API".** *Needed for the proof (scaffolding to name).*
* **Fact:** `WAITING_ON_FIRM` is set only by `SupportService.replyAsSupport` (`support.ts:259-269`), which has no route ("PF-17's console calls it", :70; PF-17 is not built, BACKLOG :664). No code anywhere sets `CLOSED`: there is no close method or route.
* **Breaks:** J3 ("later sees 'Waiting on firm' … replies once"), DW6 ("closed ticket has no reply box") and DW7 all need these states, but the draft says the journeys are "seeded through the API" (§6).
* **Fix:** say it in the concept. The test seeds support's reply by calling `replyAsSupport` inside a transaction from the test process, and sets Closed with one SQL update. Both are labelled scaffolding standing in for PF-17 (P-33). The demo's sample firm gets one seeded "Waiting on firm" ticket the same way, labelled Sample.

**M7 — The three parts are in the wrong order, and the row still says one PR.** *Needed for the proof.*
* **Fact:** P-610 caps a PR at 800 changed lines, tests included (DECISIONS :131), so three parts are right for four pages, a route and three browser journeys. But part 1 is "PUT + G1 + Notifications" (draft §6b):
  * The PUT and G1 have only one consumer, the Offices page in part 2, so part 1 would ship a route with no screen.
  * Notifications is the one page whose API is not on `main`. It is on #2304, approved but not merged.
  * The row's size line still reads "**size:** 1 PR" (BACKLOG :378).
* **Fix:**
  * **Part 1:** Offices, with the PUT, placements (m1) and provinces (M2). Its API is all on `main`; it adds `frame.tsx` nothing.
  * **Part 2:** the "?" button, Help & support, and the `support.ts` reads (M4, M5).
  * **Part 3:** Notifications, after #2304 merges.
  * Each part about 500–750 lines. The Lead amends the row's size and Touch lines (m6).

### Minor
* **m1 — G1 belongs on the existing staff read; the PUT's key and audit.** *Needed for the proof.*
  * G1 is needed. Without it "Who works where" cannot show anyone's office, and DW4's "reload shows it" cannot pass. But the table also needs names, which come from `GET /api/platform/staff`. Add `officeId` to that read's rows (`staff-read/service.ts:63-65`, one `include`) instead of a new `GET /staff/offices`: one request per view (STANDARDS §5), and AG-16 §3.18 puts "the office field … in staff profiles" (:752).
  * Placing a person is a staff-profile change. AG-1-74 §8 covers "add or edit an office", not placing a person. `agent/staff:manage` is the closer key. It has the same holders today; record the choice.
  * `setStaffOffice` writes an audit line even when nothing changes, for a repeat placement or taking out someone who has no office (`offices/service.ts:175-184`). `change` refuses that (:154). Pin "no change, no audit line" in the PUT's tests.
  * The PUT has no version, so two Admins placing the same person means the last one wins, and both are audited. Accept it, and give the reason in the build notes (STANDARDS §4).
* **m2 — The 409 merge on Notifications is not specified, and "asks once on leaving" has no mechanism.** *Needed for the proof.*
  * The version is a hash of all the person's saved rows (#2304 `notifications/service.ts:34, 60`), and the 409 answers `current`. Define the overlay:
    * re-apply only the groups the person changed from the view they loaded;
    * drop any group missing from `current.groups`, because a role change removed it; otherwise the next Save is a 400 `NOT_YOURS` that refuses everything (:54-55);
    * the next save carries `current.version`;
    * Save stays enabled only while a difference remains.
  * DW2's 409 case must assert that a group the second tab changed, and the person did not, shows the second tab's value.
  * The app uses `BrowserRouter` (`web/src/App.tsx:43`), so there is no `useBlocker`. Use `beforeunload` while unsaved, as `availability-page.tsx:125-128` does, and say that an in-app menu click is not blocked.
* **m3 — Switch styling against one Save; the security row.** *Needed for the proof.*
  * **Fact:** `role="switch"` on `<input type="checkbox">` is allowed by ARIA in HTML and passes axe. The checked state is native, so no `aria-checked` is needed.
  * **Judgment (medium confidence; NN/g toggle guidance, Unverified here):** a switch reads as "takes effect now", but this page saves only on Save. Use plain checkboxes, keeping the per-cell name "Email for Mentions", or keep the switch look and also state "Changes apply when you press Save" next to the Save bar.
  * Board A1's security row says "Not in app" and "Always sent, so you know if someone else uses your account". Neither is in §3.3 or the API (`security: {label, email:true, switchable:false}`). Show only "Always on".
* **m4 — Enter, and focus while sending.** *Needed for the proof.*
  * Write down that plain Enter in the reply box (and the Raise box) inserts a new line and never sends.
  * "Double Enter" is Enter on the focused Send, the complaints pattern (`complaints/action-drawer.tsx`, form `onSubmit` + `sending` ref). The draft adds Ctrl/⌘+Enter (board E2: "Ctrl or ⌘ + Enter sends"), which the pattern does not have and nobody asked for. Drop it, or test it as a third path.
  * `Button busy` sets `disabled` (`components/ui/controls.tsx:36`), so a focused Send loses focus mid-send. On failure, focus the error summary or the box; on success, focus the new message.
* **m5 — The "Change" placement is a centred dialog.** *Needed for the proof.* TEAM-PATTERNS "Overlays" says "Any pane that collects a value is a right panel, never a centred modal". Use the `Panel` (`components/ui/controls.tsx:100`), as the office drawer does.
* **m6 — The "?" while terms are pending; the row's Touch line.** *Needed for the proof.*
  * The frame renders controls whenever someone is signed in (`frame.tsx:92`), including over the terms page. Every guarded route answers 428 TERMS_PENDING there (`identity/guard.ts:13`), so Raise would fail. Hide the "?" while `pending.terms` is set.
  * The row's Touch line names only `settings/*` and the test. Add `frame.tsx` (one slot; Lead B's file) and `support.ts` / `staff-read/service.ts` (M4, M5, m1).
* **m7 — Can `location.pathname` leak personal data? Not on these pages; guard the follow-up.**
  * **Fact:** the only parameterised route inside `PlatformFrame` is `/platform/complaints/:id`, a UUID (`complaints/routes.tsx`). The query and fragment are dropped by the screen and again by the server (`support.ts:129`). `APP_PATH` refuses `@`, spaces and `//` (:128).
  * **But:** `/front-office/web-form/:token` carries a secret in the path. The Q3 follow-up that puts the "?" on other frames must never note a public or token route. Write that rule in the concept now. *Not built* here.
* **m8 — Two paths on one page.** `PlatformFrame` prefixes every crumb with "My account" (`frame.tsx:62`), while the subtitles say "Advanced → Offices" and "Settings → Help & support". Settle it with Q1, using one wording, such as "In Settings: Advanced → Offices".
* **m9 — Error shapes differ.**
  * Offices and Notifications refuse with 400 and `issues` as "path: message" strings (`offices/service.ts:53`; #2304 `service.ts:23`). Support refuses with 422 and a `fields` map (`support.ts:112`).
  * The draft's "400 `issues` on each field" needs the prefix split for Offices. Raise errors read `fields`, as complaints does (`record-drawer.tsx:69-70, 79`).
* **m10 — Known residual.** A reply whose answer is lost, then retried, still lands twice: there is no server key, as Lead B accepted. Write it in the concept with its trigger: a PF-18b `Idempotency-Key` row if qa sees it.

## What is sound
* **The job, the four pages and the scope edges.** Hours editing (AG-16-75), Default lead representative, the bell (PF-18ns) and "?" on other frames are all *Not built*, which keeps the row small.
* **BR-1 to BR-10 match the code.** Each line cited was checked: the group filter, the security row and Payments' words (#2304 `notifications/service.ts:19, 38-41`, `samples/notification-groups.json:33-37`); the implicit office, the zone pre-fill and the 409s (`offices/service.ts:68, 86-93, 124-131, 147`); ticket visibility, limits and Closed (`support.ts:28-31, 113, 182`).
* **The owed PUT.** Its body, its 404 cases and its tests match `setStaffOffice`'s rules (`offices/service.ts:168-186`).
* **One Save sending only changed groups with one version.** It fits the service's whole-person version and AG16-31's explicit Save. Per-switch saves would race their own versions.
* **The disclosure line in the Raise panel.** It shows exactly what is sent and nothing else. Combined with the server's own cut, this beats the usual help widget.
* **The complaints pattern for the guard.** Reusing `sending` ref + `onSettled` from #1998, rather than inventing one, is right.
* **Q1 is a real founder question.** The one menu already mixes personal and firm pages (`account-sections.ts:5-13`).
* **The states list and the 375 px stacked tables.**

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test (pass / fail) |
|---|---|---|---|---|
| Place a person (owed 1) | `platform_staff_office` (exists) | `PUT /api/platform/staff/:staffId/office` `{officeId: uuid\|null}` strict → `Offices.setStaffOffice` | same firm; office exists or null; key per m1 | place, move, take out / 403 no key, 404 other firm's staff, 404 other firm's office, 404 bad id, 400 extra field; one audit line per real change, none for a repeat |
| Who works where | same | `officeId` added to `GET /api/platform/staff` rows (m1) | firm-scoped; `agent/staff:manage` | placed person shows office / other firm's placement never appears |
| Province list + pre-fill (M2) | `samples/province-time-zones-ca.json` (exists) | `GET /api/platform/offices/provinces` → `{provinces:[{code, zone}]}` | from `zones.ts` only; `agent/settings:edit` | AB → `America/Edmonton` / Case Officer 403 |
| Add office, zone confirmed | `platform_office` (exists) | `POST /api/platform/offices` (exists), `timeZone` only if changed | AG-1-74 rule 2; explicit Save | untouched → audit `timeZoneFrom: province`; changed → `chosen`; "Mountain" → 400 "Choose a time zone from the list" |
| Ticket subject (G2) | `platform_support_message` (exists) | `subject` (first line, ≤ 80) on `GET /support/tickets` items | visible tickets only | first line shown / another person's ticket never listed for a Case Officer |
| Names on records (M4) | `platform_staff` (exists) | `raisedByName` on list items; `authorName` on `FIRM_STAFF` messages in `GET tickets/:id` | firm-scoped join, no key (AG01-28) | Case Officer sees the Owner's name on a reply / another firm's name never appears |
| Reply and Raise guard (M3, owed 2) | — (screen) | existing POSTs | one in flight per form | held response: one POST, one message, one ticket / guard removed: two (recorded run) |
| Waiting on firm, Closed (M6) | `platform_support_ticket` | none; test seeds via `replyAsSupport` and SQL, labelled scaffolding for PF-17 | — | reply box absent when Closed; "Waiting on firm" orange with its tooltip |
| Notifications | `platform_notification_preference` (#2304) | `GET\|PUT /api/platform/me/notifications` (#2304) | version, 409 overlay (m2) | Mentions email off persists / second tab → 409, overlay as m2 |

No migration in PF-18s. Server changes stay small, in files the row should name: `offices/routes.ts` (+PUT, +provinces), `staff-read/service.ts` (+`officeId`), `support.ts` (+`subject`, +names).

## Questions for the founder (≤3, recommendation first)
1. **Where Offices and Help & support live until Settings exists.** Recommend: the draft's Q1. Use three lines in today's My account menu: Notifications for everyone; Offices for Owner and Admin only (M1); Help & support for everyone. Each subtitle says where the page sits in the full product ("In Settings: Advanced → Offices"). A Settings area becomes one row when AG-16's other Settings pages arrive. Alternative: split the menu now into My account and Settings, a PF-6 frame change in Lead B's file.

(The draft's Q2 and Q3 are the Lead's. Q2 is answered above: G1 yes, as `officeId` on the staff read; G2 yes, as the first-line subject; plus the provinces read and the names. Q3 is fine as drafted, with m7's rule added to the follow-up row.)

## Lead response

## Agreement

## Build discoveries

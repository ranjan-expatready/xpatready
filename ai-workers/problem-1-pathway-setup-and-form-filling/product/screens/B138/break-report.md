# B138 · C6.16 Adult privacy and "Send to …": break report

Breaker (did not build), 9 Nov 2026, commit **e15959989a58953eb8817898716d506691ba094c** on `claude/exciting-mccarthy-up4u21-b138`. Scope: permissions, schema, the new screens (concept "What gets built"; the staff untick, a second parent's view of a minor, adult logins and SMS are Not built, so they are not findings). Four fresh isolated copies `break_c616` on :4444 (Visitor visa set up with `setup_visitor_visa.ts` + `setup_vv_m3.ts`), each stopped by a trap, plus one with `STUDIO_WORKSPACE_KEY=firm`. Probes: API scripts (about 120 requests per run), direct SQL, Playwright (`/opt/pw-browsers/chromium`). Live AI off, US$0. `PL` = `prototype/studio/api/src/person-link.ts`, `RT` = `…/api/src/runtime.ts`, `PV` = `prototype/studio/engine/runtime/privacy.ts`.

## Verdict
**No Blocker. 4 Major, 8 Minor.** On every client route listed in the concept, Client A got no private value back. The Majors are about the edges: the staff reason, the age check at the code, Make principal, and the demo inbox.

## Major
**M1. Client A can read the staff reason for "Keep private".**
* Repro: as `user-O`, `PUT /api/runtime/cases/:id/people/<child 20>/private {"reason":"Safety concern …: disclosed to officer, keep from principal"}` → 200. Then, as `x-actor: user-P`, `GET /api/runtime/cases/:id/people/privacy` → 200, and that person's entry has `"private":{"on":true,"by":"Case officer","why":"Safety concern …: disclosed to officer, keep from principal"}`.
* Expected: the principal sees only that the person is private and their progress. The reason belongs in the case history (challenge m2; BR-7).
* Cause: `PL:97` returns `private.why`/`by` to every viewer. The client screen does not show it (`web/src/runtime/privacy.tsx:149` is in the officer panel), but the API persona receives it, and privacy is promised on that persona (SI-21, P-33).

**M2. A person corrected to under 18 after the link is sent can still accept it, and privacy then switches on for a child, for good.**
* Repro: Client A sends to Child 22 (born 22 years ago) → 201. The officer corrects their date of birth to 12 years ago → 200. `people/privacy` now says `adult:false`, "under 18 … no own link and no privacy tick", but the link stays `sent` with `take_back:true`. The child presses Send me a code → 200, enters the code → 200. `case_participant.keep_private = t`, and Client A's questionnaire lists the child under `private_people` with no parts.
* Expected: BR-1 / AG07-D23 say a minor gets no link and no privacy. Staff ticking the same person gets 409. The code step should refuse, or the age change should kill the link.
* Cause: `verify()` never runs `adultCheck` (`PL:245-294`; privacy is set at `PL:284`). The migration's trigger refuses an untick and no untick is built, so nobody in the app can undo this.

**M3. Make principal (C6.13) with privacy on: the rules go by role, not by who the client is.**
* Repro: Partner accepts their link (private). The officer runs `POST …/filing-changes {kind:"make_principal", subject:Partner}` → 200. Roles are now Partner = `principal`, keep_private=t; Client A = `spouse_or_partner`. `people/privacy` still says `principal: "Client A"`.
* Effect 1: Client A's own line now has `adult:true, can.send:true`. Client A sends a link for their own person → 201, enters the code → 200. `keep_private` on Client A's own participant = t, Client A's questionnaire has 0 of their own parts, and `PUT` on their own answer → 403. The officer can also tick Client A's own person private → 200, with the same lock-out.
* Effect 2: Partner can no longer be resent a link, even by staff (409 "The principal answers on their own family link"), while their old session stays live.
* Answer to "who is the principal afterwards": by role, Partner. For privacy and the words, Client A. For BR-1's "never the principal", nobody.
* Cause: `PV:26` (`role === "principal"`) and `PV:16-20` ignore the C6.13 `client` flag (`RT` `peopleOf`).

**M4. The demo inbox keeps the link email after the code is used, so Client A can always get back into Partner's private answers.**
* Repro: Partner accepts on `partner.x@example.com`. Then, with no x-actor, `GET /api/demo/inbox?address=partner.x@example.com` → `["link"]` (only the code email was deleted).
* Client A typed that address, so Client A can take the token from the link email and call `POST /api/link/code/send`, then read the code from the inbox. `POST /api/link/code` → 200. `POST /api/link/consent`, then `GET /api/link/cases/:id/people/:partner/questionnaire` returns Partner's private values (`SECRET-…` found).
* Expected: concept §2 says `demo_message` is "deleted when the code is used or expires". Challenge M6 names exactly this path.
* Cause: `PL:286` deletes only `kind:"code"`. The link email lives until the link dies (14 days). The fix stays within the stand-in: delete the link email at the first right code.

## Minor
* **m1. Two people can be given the same address if both sends happen at the same moment.** One after the other: 201 then 409 (held). At the same moment, Child 21 and Child 23 sent the same address by Client A: 201/201 in 5 of 5 trials. `PL:131-136` locks only the sender's own participant row, and no database rule covers the address per case.
* **m2. One source can lock every adult out of the code step.** 125 tries with a made-up token from 127.0.0.2 get 429 from the 31st on. A real right code from 127.0.0.3 then gets 429 "Too many codes are being tried right now". Cause: every try, refused or not, is written before the limits are checked (`PL:248-252`), so a source that is already blocked keeps filling the per-server cap of 120 (ASVS anti-automation lockout).
* **m3. Resend fails after staff send to a new address.** Staff send to a new address → 201. Client A's Resend (no address; the line has `can.resend_kept:true`, and the button shows at `privacy.tsx:97/158`) → 403 "already uses p•••". `PL:115` resends to the newest link's address, not the kept one, contrary to build-notes improvement 1.
* **m4. Two different progress counts for the same private adult.** The questionnaire's `private_people` says `1/22`; `people/privacy` says `1/14`. `PL:94` counts the person's own parts only; `RT:427` adds their parents' parts (`ownerOf`).
* **m5. Long names and narrow screens.** "Send to <long name>…" does not wrap and scrolls sideways at 390 px (principal; name "Sample Partner With A Very Long Name Indeed Ñandú Østergård"). The link page header is 322 px wide at 320 px (200 % of 640).
* **m6. Reload loses the code step.** A reload on the code step goes back to "Check it's you". The next press sends a new code and uses one of the 6 sends allowed per 15 minutes.
* **m7. Focus is lost after Escape.** Escape on the Take back dialog does not return focus to the Take back button; focus goes to the page container (WCAG 2.4.3).
* **m8. A Client A write can land just after privacy switches on (seen in code, not reproduced).** `refusePrivate` reads `keepPrivate` from the participants loaded by `reach()` before the write transaction (`RT:480-487` vs `RT:543`). A Client A save that races the adult's first right code can still be saved after privacy is on.

## What held
* **Client A on every listed route:**
  * The sqr and pqr questionnaires carry no private value, part, follow-up or check; agent mode → 403.
  * Answers PUT → 403 before any read, including with a stale `expectedId` (no 409 body, no value). An upper-case subject id → 404.
  * Partner's `parent_1` answers and sibling rows → 403. None-apply, rows POST and DELETE → 403. An existing and a missing row give the same 403 (no way to tell which rows exist).
  * Re-confirm of a current or a superseded Partner answer → 403.
  * Uploads → 403: the checklist line and the case-level upload (lower- and upper-case id; test PDF with planted instructions).
  * checklist/forms/prepare/findings/checks/proposals/filings/filing-changes/team/release-update/employer-cases/assessments/filing-record, and activity → 403.
  * Timing: refused PUTs on an answered, an unanswered and a made-up field take about 10-12 ms each.
  * Progress gave nothing away: across 5 choice questions with every option tried, done/asked/optional never changed.
* **Who may do what:**
  * Configuration person 403; Client B and the solo firm 404; the client's tick 403.
  * Minor and no-date-of-birth Send → 409 in words; principal 409; case subject 404.
  * Staff tick on a minor, on no date of birth or on the principal → 409.
* **The link session:**
  * Bearer with `x-actor`, even empty → 400. Bearer on `/api/runtime/*` (with or without x-actor) and on the inbox → 403. Malformed, made-up and lower-case `bearer` → 401.
  * Another person → 403; the case subject (write) → 403; another case → 404. Before consent → 403.
  * The link view holds only the adult's own parts, their parents' parts and the application's; no principal value.
  * After /end, take back, resend (superseded), session expiry or link expiry → 401, in words that name no one.
* **Tokens and codes:**
  * A replayed right code and a replaced code → "No code is waiting". An expired code is explained and not counted.
  * Six wrong codes at once → `wrong_tries` 5, locked, then the right code → 410, inbox emptied, privacy not switched on.
  * Per-address sends: the 7th → 429. Two sends at once → one code email, one code that works.
  * Unknown token → 404 naming nothing.
  * No token, code or full address in history or `api.log`; the fragment token is cleared, no request URL carries it, `Referrer-Policy: no-referrer` on `/link` and `/api/link/*`, session in sessionStorage only, no cookie.
* **Re-sends:** Client A to a new address after acceptance → 403 with words; duplicate address (any case, with spaces) → 409; three resends at once → 1 open link, 1 email.
* **Demo inbox:** 404 with `STUDIO_WORKSPACE_KEY=firm`; not under any case route.
* **Migration:**
  * `20261109100000_c616_person_link`, expand only, dated after `origin/main` 967388518's newest (`20261108090000`), with a written rollback.
  * A direct SQL race of two open links for one person: the second fails on `person_link_one_open`.
  * The trigger refuses an untick. Constraints refuse a short reason, `wrong_tries` 6, an unknown `void_why`, an upper-case address, `voided_at` without `void_why`, and `demo_message.kind 'sms'`.
* **Screens:**
  * The consent card shows the BR-6 wording with "Unconfirmed: no counsel".
  * Keyboard only: the Send dialog takes focus and sends on Enter; the officer reaches Take back in 14 Tabs.
  * No sideways scroll on the officer page at 1440 and 720 px or on the principal's progress card at 320 px.
  * The dead-link page names no person and no reason.
  * Reload keeps the consent and question steps.

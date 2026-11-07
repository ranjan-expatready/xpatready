# B138 · C6.16 Adult privacy and "Send to …": fresh challenge

Independent challenger (did not draft), 7 Nov 2026, branch `claude/exciting-mccarthy-up4u21-b138` at 426b3b281. Read: `concept.md`, `design/draft-send-to-adult.html`, `best-in-class-sources-2026-11-07.md`, row B138 (`origin/lead/2026-11-07-lead30` BACKLOG l.48), B8 / RD-12b, AG-15-56, AG-07 C3.5 / AG-7-79 / AG-7-107 / Q71, SA-1B-269 and SA-01B's summary of the same rule, P-40, P-78, P-169, P-406, STANDARDS §5–8, and the app code below. `ai-workers/tools/freshness.sh` fails in this copy (no `code/` capture): the 2 Nov requirement copy is read as given; anything newer is Unverified. `studio/` = `prototype/studio/`; `REQ/` = `domain/requirements-2026-11-02/02-functional-requirements/`.

## Verdict
**Build after these changes.** The job, the adults-only rule, the token rules and the P-78 confirm flow hold up. But the principal can still read a private adult's answers (B1). The privacy setting is derived from link state and age when it should be stored (M1). The link session is a second way of signing in that the concept never defines (M2). The leaking routes are not listed (M3). Take back leaks private answers through follow-up questions (M4). The pack cannot run on the checkpoint case (M5), and the email stand-in shows the code to people who must not see it (M6).

## Objections

### Blocker
**B1. The principal can read an adult's private answers by sending the link to themselves.** *Needed for the proof.*
* **What breaks:** the principal types the address (BR-2) and may Resend "to the kept or a corrected address" (BR-7). The code check only proves control of an address the principal chose. Each new session shows the adult's own sections with their values (BR-4).
* **Example:** Partner answers privately on 9 Nov. Client A presses Take back, then Resend to Client A's own address, enters the code and reads every one of Partner's answers. The same works before acceptance: Client A sends the link to their own address and answers "as Partner". Those answers then count as Partner's own (BR-5, P-78), the officer sees "With Partner … private from Client A", and the RCIC relies on statements Partner never saw (SA-1B-269 rule 10: "only the person ticks a declaration or signs").
* **Evidence:** `concept.md` BR-2, BR-4, BR-5, BR-7; `decisions/P-74-P-78.md:7`; `REQ/super-admin/SA-01B-content-pack-configurator_v2.1_2026-10-27.md:4956`.
* **Fix:**
  * Once a link has been accepted, only staff may change the address or send to a new one. The principal may resend only to the kept address (403 in words).
  * Refuse an address already held by another person on the case (409).
  * The officer's chip says what the code proves: "Answered on the link sent to p•••@example.com (address given by Client A)".
  * Tests: the principal resends to a new address after acceptance → 403; the kept address → sent.

### Major
**M1. Privacy is worked out from link state and today's age instead of being stored once per adult.** *Needed for the proof.*
* **What breaks:** the team keeps one setting per adult, "Keep private from the principal", on the person on the case (AG-7-107 rule 8 and §7; Q71). It is "switched on by 'Send to <name>' or by staff; taking a tab back keeps it on until staff untick it" (SA-01B l.5862, l.6072). The concept switches it on at the code check, never switches it off, offers staff no way to set it, and works out "who is an adult today" from a date of birth answer (`privacy.ts`, BR-1).
* **Example:** Child 18 or over (born 2007-03-14) has answered privately. A typo or a staff edit changes that date to 2010. The child is now a minor, AG07-D23 shows a minor's answers to both parents, and Client A reads them. A date of birth not yet answered gives an age of `null` (`engine/runtime/case.ts:45`), and the concept does not say whether Send is offered then.
* **Evidence:** `REQ/agent/AG-07-case-core-and-delivery_v3.12_2026-10-28.md:1132,1142,7735`; `REQ/super-admin/SA-01B-content-pack-configurator_v2.1_2026-10-27.md:5862,6072`; `concept.md` BR-1, BR-6, Q1.
* **Fix:**
  * Store the team's setting on `CaseParticipant` (Q71 option B): on, when, by whom, why. Every filter reads that stored setting and never recomputes it from age.
  * With no date of birth: no Send, and the screen says why.
  * A staff change of date of birth that crosses 18 leaves the setting as it is.
  * When it switches on, and whether it ever switches off, go to the founder as one question (Q1 below), named as a divergence from SA-01B.

**M2. The link session adds a second way of signing in on the same routes, and the concept never defines it.** *Needed for the proof.*
* **What breaks:** "the questionnaire routes accept a link session". Today:
  * every case read passes the global guard only with a known `x-actor` (`studio/api/src/core.ts:94`);
  * the web client sends `x-actor` from localStorage on every call, defaulting to `user-A` (`studio/web/src/lib/api.ts:7,19`);
  * no actor stands for an adult (`core.ts:46-55`).
* **Example:** in the demo, the founder opens Partner's link in the same browser where `xr-actor=user-P`. If `x-actor` wins, Partner's saves are recorded as Client A's. If the session wins, the session also travels with Client A's own requests.
* **Evidence:** the removed pairing refused this mix: "The extension's routes take only the extension's own sign-in, never the Studio's", and it checked the session again on every request (`git show d57515064^:…/studio/api/src/extension.ts`, `signed()`).
* **Fix:**
  * A separate `/api/link/…` controller with its own guard. The token travels as a Bearer header from sessionStorage, never a cookie.
  * A request that carries `x-actor` is refused (400).
  * Every request checks again that the link is live (not taken back, superseded or expired), the session is not revoked, and the person is still on the case.
  * Runtime is called as a scoped person: answer source `{channel: "own_link", actor: "person:<subject>"}`. `confirmation()` must treat that source as the person's own: today any other channel reads "entered by the case officer" (`engine/runtime/case.ts:60`).
  * STAND-INS records that `x-actor` stays simulated: the privacy holds on Client A's screens and API persona, not against someone who types `x-actor: user-O` (P-33).

**M3. "The same filter on every client route" does not list the routes, and four leak today.** *Needed for the proof.*
* **Routes a client reaches:**
  * `GET …/questionnaire` (sqr) and `?mode=pqr` (`studio/api/src/runtime.ts:295,304`).
  * `PUT …/answers/:subject/:field`: its 409 body returns the current value and who gave it (`runtime.ts:359`, and the unique-error catch below it).
  * `PUT …/none-apply`: returns the group.
  * `POST` and `DELETE …/rows`: Client A can remove a private adult's entries (`runtime.ts:412-449`).
  * `POST checklist-lines/:id/documents`: Client A can upload to Partner's line and gets the line back with Partner's documents (`studio/api/src/case-checklist.ts:156-185`).
* **Already closed:** the checklist list, forms, eligibility, prepare and findings all reach the case as "officer".
* **Fix:**
  * One check, `privateFrom(actor, case, subject)`, runs before any value is read: 403 on reads of values and on every write (answers, none-apply, rows, uploads) for a private person.
  * The `caseView` filter applies before `fills` and `from_documents`.
  * One failing test per route listed here.

**M4. After take back, Client A may answer the "empty questions", and which follow-ups exist reveals private answers.** *Needed for the proof.*
* **What breaks:** a question shows or becomes required depending on that person's own answers (`engine/runtime/case.ts:312-313`). Medium confidence on the exact UI exposure.
* **Example:** Client A sees an empty "Details of the refusal" on Partner's tab, and so learns that Partner answered Yes to an earlier refusal. The board draws no frame for this mixed state.
* **Team rule:** privacy stays on after take back, and "read-only" means progress only (SA-1B-269 rule 2; SA-01B l.5862).
* **Fix:**
  * After take back Client A keeps progress only, with no edits. The ways forward are Resend (to the kept address) or staff.
  * Step 7 becomes: a PUT by Client A on an empty Partner question → 403.

**M5. The pack cannot run every step on the checkpoint's Sample family case, and running it would change that case.** *Needed for the proof.*
* **What breaks:**
  * The checkpoint case's answers are all entered by the officer and section-confirmed (`studio/api/src/sample-case.ts:64,109,142`). So step 6 has no "answered by Client A", and B99 leaves Partner almost nothing empty.
  * With privacy one way, a second run starts from a private Partner.
  * The run would change Client A's view of the case that other checks and the demo read (`tests/check_c10_1_configured.ts`, `tests/qa/check_qa231_walk.cjs`).
* **Fix:**
  * Open a fresh case per run with `acceptance/lib/m3.ts` `openCase`, using a family of Client A, an adult spouse, a child of 19 and a child of 10. The default `FAMILY`'s child of 15 is not an adult (`m3.ts:73-78`).
  * Client A answers one Partner question as `user-P` before Send.
  * Leave the checkpoint case untouched.

**M6. The email stand-in shows the code to people who must not see it.** *Needed for the proof.*
* **What breaks:** "Sent messages (demo)" is shown "on the case". If Client A can open it, Client A reads Partner's code and the code check means nothing. If staff can, staff can accept on Partner's behalf. Keeping the code in plain text in `demo_message` makes hashing it pointless. A 6-digit code is protected by its 15 minutes and 5 tries, not by its hash. Step 1 ("the API returns neither") contradicts a list route that returns both.
* **Fix:**
  * A demo inbox looked up by address, demo workspace only (`isDemoWorkspace`, `core.ts:24`), outside every case and client route, and 404 elsewhere.
  * The message is deleted once the code is used or expires.
  * A STAND-INS row says it replaces AG-10's sending.

### Minor
* **m1. The token sits in the URL path, and opening the link sends a code.** *Needed for the proof.* A `GET /link/:token` that sends a code lets mail scanners and link previews trigger codes and log the link as "opened", and the token stays in browser history and in any proxy log. Fix: put the token in the fragment (`/link#t=…`) and exchange it by POST; make "Send me a code" a button (POST); clear the fragment with `history.replaceState`; send `Referrer-Policy: no-referrer`.
* **m2. Dead-link words name the principal.** *Needed for the proof.* This breaks BR-9: the board says "Client A took this link back on 10 Nov" and "Ask Client A or the firm". Fix: "This link was taken back on 10 Nov. Ask whoever sent it for a new one." The staff reason appears only in the case history.
* **m3. "4 of 7 parts done" is partly counted per device.** *Needed for the proof.* A part with nothing required counts as done only once it is passed on that device (`studio/web/src/runtime/questionnaire.tsx:363-373`, localStorage), and Client A's device never holds Partner's passes. Fix: count done parts on the server (nothing missing, nothing invalid) and say how optional parts count.
* **m4. The adult's "Confirm" has no route.** *Needed for the proof.* `confirmSection` is for the officer only and writes VERIFIED (`runtime.ts:453-454`). Fix: Confirm saves the same value again through the link's PUT, with the `expectedId` of the answer on screen (a new DECLARED version, channel `own_link`).
* **m5. Age 18 for privacy and consent is a legal point.** *Needed for the proof (labels only).* The age of majority is 19 in BC, NS, NB, NL and the three territories (high confidence; no official source cited here). Fix: mark `MINOR.underAge` "Sample; Unconfirmed: no counsel" for this use (`contracts/runtime.ts:14`; AGENTS rule 4).
* **m6. A second parent's read-only view of a minor is not built.** *Not built.* The team gives the other parent a read-only view of a minor's tab through their own sent link (SA-01B l.5862, SA1B-D99(f); AG07-D23). The app records only links from the principal to each person (`runtime.ts:33,241`), so there is no parent link to check. Fix: say so in §6b and BR-4, instead of "every other person refused" as if that were the team's rule.
* **m7. The board draws per-person tabs that the built C6.2 does not have.** *Needed for the proof.* C6.2 shows an overview with an "About <person>" list and one part per screen (`questionnaire.tsx:375-410`). Fix: put "Send to Partner…" and the progress card under "About Partner".

## What is sound
* **Job and scope:** adults only and no link for a minor (AG07-D23, AG-15-56). Staff always see and edit (SA-1B-269 rule 10). Consent wording is marked Unconfirmed: no counsel. AI off, US$0. Logins for adult family members stay Not built (CP1-D9); P-40 and P-406 cover the link.
* **Token and code rules:** a 32-byte token stored hashed, a code valid for 15 minutes, 5 wrong tries void the link, a throttle, and a dead link that explains itself. These follow OWASP, GOV.UK and the removed pairing.
* **Access and history:** access starts only when the person accepts (HMRC). History never stores the token or the code. The confirm flow ("answered by Client A", then Confirm) uses the P-78 words already in `contracts/runtime.ts:102-107`.
* **Code claims checked and true:**
  * `RUNTIME_ACTORS` (`core.ts:46-55`) and `reach()` (`runtime.ts:63-71`);
  * the client-field refusal (`runtime.ts:342`) and `confirmSection` for the officer only (`runtime.ts:453`);
  * `confirmation()` (`case.ts:57-69`) and the sqr filter by field kind only (`case.ts:310`);
  * `contactChannelsJson` unused anywhere in the API, engine or web;
  * the pairing tables still in the schema (`prisma/schema.prisma:1607-1656`) with their code removed.

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Privacy setting | `case_participant` + keep_private, at, by, why (migration, expand only) | read by every client route | M1, BR-6 | engine unit tests; C6.16-4 |
| Link | `person_link` (case, subject, address, masked address, token hash, state, sent by and at, accepted at, voided at and why, superseded by) | `POST` / `DELETE /runtime/cases/:id/people/:subject/link` | BR-1, BR-2, BR-7, B1 (Client A: kept address only once accepted) | C6.16-1, 7, 8, 9; B1 fail |
| Code | code hash, expiry, wrong tries on the link; tries table as `ExtensionCodeTry` | `POST /api/link/code/send`, `POST /api/link/code` | BR-3, m1 | C6.16-2, 11 |
| Session | `person_link_session` (token hash, link, expires, revoked) | Bearer header on `/api/link/*` only; `x-actor` refused | BR-4, M2 | C6.16-3, 10; an `x-actor` + session mix → 400 |
| Adult's answers | `client_canonical_answer`, source `own_link` / `person:<subject>` | `PUT /api/link/answers/:field` (Confirm = same value) | P-78, m4 | C6.16-6 |
| Client A's filter | none | sqr, pqr, answers, none-apply, rows, upload | M3, M4 | C6.16-4 plus one fail per route |
| Email stand-in | `demo_message` (demo workspace only, deleted on use) | demo inbox by address | M6, new SI row | C6.16-1 |
| History | `audit_event`, masked address only | none | BR-8 | C6.16-12 |

## Questions for the founder (≤3, recommendation first)
1. **When does an adult's privacy switch on and off?** (Unconfirmed: no counsel.) **Recommend: on when the adult first enters the code, so a mistyped address never locks Client A out; off only by staff with a reason, as the team's untick (SA-01B l.5862), not built in M3.** M3 then behaves one way while keeping the team's model. The consent card adds "The firm can change this." Alternative: the concept's "never off", which diverges from SA-01B.
2. **After take back, what does Client A see?** **Recommend: progress only, no edits (team rule; M4).** Alternative: Client A answers the empty questions, which reveals private answers through the follow-ups.
3. **Who may send an accepted adult's link to a new address?** **Recommend: staff only; Client A resends only to the kept address (B1).** Alternative: Client A as well, which lets Client A read the private answers.

## Lead response
*Drafter's changes, 7 Nov, for the tech lead to confirm (the drafter is not the Lead):* every objection taken into `concept.md`. B1: the principal resends only to the kept address after acceptance, a new address is staff only, duplicate address 409, the chip names who gave the address (BR-3, test 8). M1: the team's setting stored on `case_participant`, on at the first right code or a staff tick, kept after take back, untick not built in M3 (BR-2, Q1); no date of birth → no Send. M2: separate `/api/link/*` controller, Bearer from sessionStorage, `x-actor` refused, re-checked per request; `own_link` counts as own; SI row for the simulated `x-actor` (BR-5, §6b). M3: `privateFrom` before any value on sqr, pqr, answers (409 body), none-apply, rows, upload (BR-7, test 4). M4: after take back progress only, no edits (BR-8, test 7). M5: a fresh case per run via `openCase`, checkpoint untouched (§6). M6: demo inbox by address, outside case routes, deleted on use (§2, §6b). m1 fragment token, "Send me a code" button, no-referrer (BR-4); m2 dead-link words name no person; m3 server-counted progress; m4 Confirm = the same value on the link; m5 age 18 Sample, Unconfirmed: no counsel; m6 second parent's view Not built; m7 under "About Partner", board fixed. Founder questions: Q1 and Q3 of this file became concept Q1 and Q2; Q2 of this file is settled as the team rule (M4).

## Agreement

## Build discoveries

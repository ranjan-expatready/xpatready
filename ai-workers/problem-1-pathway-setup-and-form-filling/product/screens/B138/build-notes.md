# B138 · C6.16 Adult privacy and "Send to …": build notes

Screens lane, branch `claude/exciting-mccarthy-up4u21-b138` (draft PR #1257). Spec: `concept.md` (BR-1..BR-10, §6 pack) with every objection of `challenge.md` (B1, M1-M6, m1-m7) and the founder's F12 ruling (P-412). AI off, US$0.

## Top 5 production improvements over the board
1. Resend is one press (no address typed): the server resends to the newest address, the kept one after acceptance, so the principal never retypes a masked address.
2. The code step has GOV.UK's error summary ("There is a problem") linked to the field, as well as the message on the field.
3. The token leaves the address bar on arrival (`history.replaceState`), lives in sessionStorage only, and the page and its API send `Referrer-Policy: no-referrer`.
4. The officer's row says what the code proved: "answered on the link sent to p•••@example.com (address given by Client A)".
5. The client's view is worked out without the private person's answers at all, so no follow-up, check or form can reveal them (M4), not just filtered afterwards.

## What was built (files)
* **Migration (expand only)** `prisma/migrations/20261107190000_c616_person_link`: `case_participant.keep_private` (+ at, by, why; a check and a trigger: once on it stays on); `person_link` (token and code as sha256, partial unique index: one non-dead link per person; `send_key` for idempotency); `person_link_try`; `person_link_session`; `demo_message`. Rollback written in the file. `tests/check_prisma_schema.ts` passes (schema = migrations).
* **Rules (pure)** `engine/runtime/privacy.ts`: `privateFrom`, `adultCheck`, `sendRefusal` (B1), `normalAddress`/`maskAddress`/`normalCode`, `linkState`/`deadWords` (no names), `codeCheck`, `overLimit`, `progressOf` (server-counted, m3), `officerWords`. `engine/runtime/case.ts`: channel `own_link` counts as the person's own (P-78); `answer-sheet.ts` reads it as Client.
* **Contract** `contracts/person-link.ts` (zod shapes, words, limits); `contracts/runtime.ts` adds `CONFIRM_WORDS.person_own` and the m5 note on `MINOR` (Sample; Unconfirmed: no counsel).
* **API** `api/src/person-link.ts` (feature `features/person-link.ts`): `GET …/people/privacy`, `POST`/`DELETE …/people/:subject/link`, `PUT …/people/:subject/private`; `/api/link/*` (open, code/send, code, me, consent, end, questionnaire, answers, rows, none-apply) behind `LinkOnlyGuard` (x-actor → 400) and `signed()` (session, link and person re-checked per request; other case 404, other person 403); `GET /api/demo/inbox` (demo workspace only). `core.ts`: a Bearer token anywhere but `/api/link/*` is 403. `runtime.ts`: one write path (`Writer`) for staff, client and link; `refusePrivate` runs before any value is read on answers PUT (the 409 body), none-apply, rows POST/DELETE; `clientView` for sqr and pqr; `linkView`. `case-checklist.ts`: the client's upload to a private person 403. `main.ts`: `/link` page sends no referrer.
* **Screens** `web/src/runtime/privacy.tsx` (principal line under "About <person>", progress card, Send/Take back/Keep private dialogs, officer panel "Own links and privacy"), `web/src/runtime/link-page.tsx` (`/link`: Check it's you → code → consent → own parts, reusing the client questionnaire through `QuestionnaireIoContext`; `/inbox` demo inbox), `questionnaire.tsx` (the io context, private people in the overview, Confirm on the link), `cases.tsx`, `App.tsx`.
* **Tests** `tests/check_c616_privacy.ts` (35 lines, pass + fail per BR), `tests/check_c616_privacy_browser.cjs` (33 lines, journey + axe), `acceptance/C6.16.test.ts` (53 lines, C6.16-0..12).

## Mock vs real
Real: links, codes, sessions, the stored setting, every filter and refusal, history. Stand-ins: email (demo inbox, proposed **SI-20**) and the adult's sign-in by link and code while staff and the principal stay simulated by `x-actor` (proposed **SI-21**). STAND-INS.md is the tech lead's file: the two rows are proposed on PR #1257; until they land the two chips render with the Stand-in look as `ProposedStandIn` (no `data-stand-in`), and become `<StandIn id="SI-20|21">` in the PR that adds the rows.
* **SI-20 (proposed):** Email to an adult on the case → demo inbox by address (`/inbox`), demo workspace only (404 elsewhere; Send refuses in words there); code message deleted when used or replaced, all messages of a link when it dies; anyone who knows an address can read it. Owner: the team's AG-10. Plugs in: Send and "Send me a code" hand the message to AG-10. Decided: P-412 (Q3).
* **SI-21 (proposed):** An adult family member's own sign-in → link (token in fragment) + 6-digit code, 8-hour session on `/api/link/*` only; staff and the principal stay simulated (`x-actor`), so privacy holds on Client A's screens and persona, not against someone who picks another simulated person (P-33). Owner: the team's logins for adults (Release 2, CP1-D9; AG-15-56). Decided: P-412 (Q3), challenge M2.

## Checks run (STANDARDS)
§3.10 pass+fail per BR (unit 35/35, pack 53/53, browser 33/33) · §4 409s for stale Confirm and concurrent sends, every lock wait or unique clash worded (`inTx`, `lock_timeout` 5 s) · §5 expand-only migration with rollback, audit lines in the same transaction, masked addresses only · §6 zod, Problem Details, deny by default (config 403, other firm 404, other case 404, other person 403, x-actor on link 400, Bearer elsewhere 403) · §7 strict TS, no new `any` (count-any 418 = base), no web/API logic duplicated except the progress line words · §8 OWASP token rules (32 random bytes, sha256, single-use code, 15 min, 5 tries, limits per address and per network, no-referrer, no-store). Race guards each have a failing test: same right code twice (one session), five wrong codes at once (all counted), same Send key twice (one link), three resends at once (one live link) plus the DB refusing a second open link.

## BIC scores (client pages: BIC-04, 11, 13, 14, 18, 19, 20)
| Check | Score | Evidence |
|---|---|---|
| BIC-04 | Met | "Code (required)", "<person>'s email (required)"; the questions are C6.2's own fields (screenshot 09) |
| BIC-11 | Met | one primary per card: Start / Send me a code / Continue / Continue to my questions / Send to … in the dialog (01-09) |
| BIC-13 | Partly | code errors inline + summary with link (06); the Send dialog shows its one error on the field only (no top summary) |
| BIC-14 | Partly | ⓘ tip and Stand-in chip open on focus; the officer's "Private from Client A" pill tells its reason by `title` only |
| BIC-18 | Met | skeletons while loading, empty inbox, dead/expired/locked/taken-back pages say why (13), saving buttons busy |
| BIC-19 | Met | at most 1 input per client page, red only for errors, one heading per card (390 px shots) |
| BIC-20 | Partly | axe clean on 13 states, no sideways scroll at 390/1440; a full keyboard-only walk and 200 % zoom not done |

## Deviations and why
* The pack's family has a fifth person (a child with no date of birth) to prove BR-1's "no date of birth → no Send" (openCase answers every given date).
* Staff tick and staff Send work for any adult; the principal's view of the tick is the same progress card.
* Progress counts a part with nothing required as done (and says "(n optional)"), as BR-7 states; the principal's overview count no longer includes a private person's parts.
* The client view is computed without the private person's answers, so a principal's own question that depended on Partner's answer is computed as unknown for Client A (staff unchanged).
* The link view's conditions are worked out with everyone's answers (only Partner's and the application's parts are returned): a follow-up shown to Partner can depend on a principal's answer.
* Rate limits are per email address for code sends (6 per 15 min) and per network address and server for tries (30 and 120 per minute): product choices.

## Known gaps
Staff untick (Q1, not built in M3); a second parent's read-only view of a minor (SA1B-D99(f)); SMS codes; the link's dead-word dates are in UTC; a keyboard-only and 200 % walk; D1-D20 self-score is left to the reviewer (D17/D20 need an intended user).

## Self-score (honest, D1-D20 in short)
Function, rules, permissions, data: strong (tests above). Look: board followed with the team's components; the officer table is dense but readable at 1440. Copy: plain, front-loaded; consent marked Unconfirmed: no counsel. Not self-scored: D17, D20.

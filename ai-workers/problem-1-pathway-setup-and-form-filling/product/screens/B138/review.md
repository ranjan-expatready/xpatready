# B138 · C6.16 Adult privacy and "Send to …": review

Reviewer: a fresh session that did not build the screen (skill screen-review). Exact commit: **e15959989a58953eb8817898716d506691ba094c** (PR #1257). Review date: 9 Nov 2026. Diff: `origin/main...e15959989` (merge base fc49dc5a4).

**Inputs read:** concept BR-1 to BR-10, challenge and its Lead response, the board, build notes, screenshots 01-15, the founder's ruling P-412 (F12), and the approved stand-in Q3.

**Run** (fresh isolated copies on :4443 only, each stopped after use): pack `acceptance/C6.16.test.ts` **57/57** (exit 0) · `tests/check_c616_privacy.ts` **35/35** · `tests/check_c616_privacy_browser.cjs` **44/44** (exit 0) · my own API probe, walk at 390 / 1024 px, and the graph tool. Journey score: **8.5/10** (`journey-test-reviewer-2026-11-09.md`).

**Verdict: Block**, for e15959989. One Major is open; see M1 below. In the skill's terms: Ship after fixes.

## Checks the tech lead asked for
- **Merge kept main's intent: holds.** `REACHED` has the same include as main's `reach()` (newest pin first, participants, the first `make_principal`). `pinned()` is main's C9.5 check word for word, and `reachByLink` uses it too. Also kept: C6.18 (`OFFICER_ENTRY` and `recordedForClient` in `saveAnswer`), B128/B155 (`subjectFor`, the relation routes on both controllers) and the C6.13 `filingChanges` include.
- **`refusePrivate` / `privateFrom` coverage: holds on every client route that returns or writes a person's facts.** The check runs before any value is read on: answers PUT (with relative routes and its 409 body); none-apply, row add and row remove (with relatives); re-confirm (`runtime.ts`, before `newer()`); the checklist-line and case-level uploads (`case-checklist.ts:137`, `case-documents.ts:177`). sqr and pqr go through `clientView`; `get()` returns labels only; every other client-reachable `reach(…,"read"|"answer")` route is officer-only (grep of `api/src`).
- **Tokens and codes: hold.** Token: 32 random bytes, sha256, in the `/link#t=` fragment, exchanged by POST, cleared with `replaceState`, with `no-referrer` and `no-store`. Code: 6 digits, sha256, 15 minutes, spent once under its own row (the race test gives one session); the fifth wrong code locks the link. Limits per address (6 per 15 min), per network (30/min) and per server (120/min). The session lasts 8 hours, can be revoked, and its link and person are re-checked on every request; `x-actor` gives 400, a Bearer anywhere else 403.
- **Refusals in words:** every probe answered problem+json with words, and none gave a 500. One answer has the wrong words (m3).
- **Audit in the same transaction:** every person-link change writes its history inside `inTx`. Answer and row history stays after the transaction, as on main; that is not a regression.
- **A GET writes nothing:** the audit count was 415 before and after the privacy, inbox and questionnaire GETs. `open`, `me` and `inbox` read only.
- **Assertions not weakened:** no existing test file is changed. The new `mark === "by_principal"` checks also hold `!confirmed`, plus a `why` regex or an exact `byPrincipalFor()`. That is equal to or stronger than the old sentence.
- **Screenshots:** only `screens/B138/screenshots/*` are in the diff.

## Builder's open risks, judged
1. **Client view computed without private answers:** acceptable. It is the safer reading of BR-7 and M4, and staff views are unchanged.
2. **C6.13 combined with privacy untested:** this is where the Major is (M1).
3. **Link view conditions use everyone's answers:** acceptable. The principal's own facts are not promised private (SA-1B-269 rule 2), and only Partner's and the application's parts are returned.
4. **Code-try limit on reruns:** by design. The pack's usage line should say "fresh copy or wait a minute" (m6).
5. **No test of its own for the row lock:** acceptable. The three-resends race and the partial unique index cover the outcome.
6. **`refusePrivate` in each route:** this is not deny-by-default, but every current route is covered. Keep the per-route fail tests (C6.16-4 and the post-merge ones).

## Issues
**Major (Must)**

**M1. After C6.13 Make principal, the case's client is treated as an ordinary adult, and can be locked out of their own questions for good.**
- **Where:** `adultCheck` and `privateFrom` decide by `role` only (`engine/runtime/privacy.ts:15-29`); `people()` offers `can.send` and `can.tick` from that (`api/src/person-link.ts:90,100`); the UI hides Send only for `role === "principal"` (`web/src/runtime/privacy.tsx:92,147-150`). C6.13 keeps the client the same person (`clientPersonOf` / `peopleOf(c)[].client`), so after a swap Client A's row is "spouse or partner".
- **Probe (fresh case, Make principal on the spouse):** Client A's own row comes back `can.send: true` (and `can.tick: true` for staff). Client A sends a link to themselves and enters the right code; `keep_private` turns on for Client A. Their questionnaire then has **0** of their own sections (`private_people: ["Sample Client A"]`), and a PUT on their own question is **403** "Sample Client A's answers are private to them and the firm…". A staff tick on Client A does the same. The trigger forbids switching it off (P-412: no untick in M3), so the lockout cannot be undone. The new principal, Partner, is refused a link with "The principal answers on their own family link", which is untrue for them.
- **Fix:** decide "the principal" for BR-1 and BR-7 by the case's client person (`peopleOf(c)` `client`, else role principal) in `adultCheck`, `privateFrom`, `people()`, `clientView`/`refusePrivate`, and the officer and principal UI lines; add one pass and one fail step to the pack after a Make principal.

**Minor (Should)**
- **m1. Two progress counts for the same adult.** Client A's card reads `private_people`, counted with `ownerOf` (Partner's parents included): "1 of 22 parts". The officer panel and `GET …/people/privacy` count `x.subjectId === p.subjectId` (`person-link.ts:94`): "1 of 14". The adult's own link says "Part 1 of 22". Fix: use `ownerOf` in `people()`.
- **m2. Client A reads the adult's dead-link words after their own take back.** Under About Sample Partner, Client A sees "This link was taken back on 9 Nov. Ask whoever sent it for a new one." Client A is the sender. Fix: use the officer-style line, "Taken back 9 Nov · Resend".
- **m3. A NUL in the email address gets the wrong refusal.** It answers 404 "Not found (it may have been removed by a reset)" (Postgres 22021, mapped in `main.ts:211`). Fix: apply the existing no-control-characters text rule (`contracts/runtime.ts`) in `SendLink` (`contracts/person-link.ts:17`), so it becomes a 400 on the field.
- **m4. Focus is lost when a dialog closes.** Closing Send to … with Escape at 390 px puts focus on `body`, not the opener, at the top of a long page. Fix: return focus to the opener (`onCloseAutoFocus`) for the C6.16 dialogs.
- **m5. Graph G3 reports 16 of its 32 untested-route gaps as C6.16 routes.** These are `/link/*` and `GET …/people/privacy`. They are exercised by the pack, but the graph cannot see `lcall` or the `/api/link${path}` template. Fix: make them visible to `graph.mjs`, or record why in the PR.
- **m6. The pack header does not mention the 429 on a rerun within a minute.** Add it to the usage line.
- **m7. The builder's own Partlys stand as Should rows:** BIC-13 (the Send dialog has no top summary) and BIC-14 (the "Private from Client A" pill gives its reason by `title` only). Known and not done: the parents' parts on the link are headed "About Sample Partner's first parent", and dead-link dates are in UTC.

**Note (not a finding):** origin/main (967388518) now conflicts with this commit in `questionnaire.tsx`. The re-merge is a new commit and needs its own look.

## D1-D20 (1-5)
| D | Score | Evidence |
|---|---|---|
| D1 | 3 | Every BR behaves and is tested, but BR-1 and BR-7 break after a Make principal (M1) |
| D2 | 4 | Races: one session, one live link, five wrong codes all counted, partial unique index; m3 |
| D3 | 4 | Reuses the C6.2 questionnaire through `QuestionnaireIoContext`; one `Writer` path for staff, client and link |
| D4 | 3 | Rules resolve, but progress differs by route (m1) |
| D5 | 4 | Reload keeps the session; idempotent Send; a dead link explains itself |
| D6 | 4 | History for send, code, wrong code, lock, consent, take back and tick, masked, in the same transaction |
| D7 | N/A | No AI |
| D8 | 4 | Under "About Sample Partner"; the link page names the case reference |
| D9 | 4 | Send in 3 steps; Resend is one press |
| D10 | 3 | m2; M1 refusal words; "Declared: …" under the part heading |
| D11 | 4 | Sent line, Saved, error summary on the code, progress card |
| D12 | 4 | Team components; the 1440 panel is dense but aligned (11) |
| D13 | 4 | axe clean (builder 13 states, mine 3), 200 % and 1024 px without sideways scroll; m4 |
| D14 | 4 | Dialog, Table, Pill, Notice and StandIn look from the team set |
| D15 | 4 | Page ready in 272 ms; no request per row |
| D16 | 4 | Pass and fail per BR; the C6.13 combination is untested; m5 |
| D17 | — | Simulated only |
| D18 | 4 | "answered on the link sent to p•••@example.com (address given by Client A)" |
| D19 | 4 | Send → accept → answer → progress → take back across three roles |
| D20 | — | Simulated only |

## BIC scorecard (EXPERIENCE §6)
| Check | Score | Evidence |
|---|---|---|
| 01 | Met | The adult sees the principal's earlier answer with Confirm and is not asked again (09) |
| 02, 03 | N/A | No new questions (C6.2's) |
| 04 | Met | "Code (required)", "Sample Partner's email (required)" (02, 06) |
| 05-07 | N/A | No document reads |
| 08, 09 | N/A | Not this screen; the C6.13 interplay is M1 |
| 10 | Met | The link lists the adult's parts with statuses, in any order (08) |
| 11 | Met | One primary per card (01-09) |
| 12, 15-17 | N/A | No signing or filing here |
| 13 | Partly | Code: inline plus summary (06); Send dialog: field only (m7) |
| 14 | Partly | ⓘ tip opens on focus; the pill's reason is by `title` (m7) |
| 18 | Met | Skeletons, empty inbox, dead / locked / expired pages say why (13, r5) |
| 19 | Met | At most one input per client page; one heading per card (390 px, 1440 px 11, 1024 px r3) |
| 20 | Partly | Keyboard path and 200 % hold (builder 14, 15); focus is lost when a dialog closes (m4) |

## Graph (P-86)
G1, G2, G4, G5 and G6: none for C6.16; G3: see m5. Every element serves C6.16. The demo inbox is the approved stand-in SI-20 (Q3, P-412), not P-33 scaffolding: Send and the link work through the product's own screens.

## What I could not check
A real screen reader · an intended user's walk (D17, D20) · real email · clock-dependent expiry beyond the pack's expired-code step · the 310 suites the builder left to the PR check · STAND-INS rows SI-20 and SI-21, which are not on main (the chips stay `ProposedStandIn`, as agreed).

## Round 2 (55358fff5)
Exact head: **55358fff5724b16173f7abddfe8236af77072bcc**. Diff reviewed: `e15959989..55358fff5`, i.e. 1f4cb2e68 (merge) and the fix commits after it. Last round (P-293 (3)).

**Run** (fresh copies on :4443 only, each started and stopped in one command): pack **68/68** (exit 0) · unit **42/42** · browser **50/50** (exit 0) · `check_c69_page_browser.cjs` **55/55** (exit 0) · my round-1 probe again. The C6.9 screenshots that check rewrites were restored, not kept.

**Merge 1f4cb2e68: both sides kept.** The only conflict was `questionnaire.tsx`. Main's exported `refusal` and `WHO` stay exported, and main's C6.5 `document_read` and `checked_against_document` channels are in `CHANNEL`. C6.16's `own_link` channel and its `person:` name are kept beside them (remerge diff). This head merges cleanly with current main 967388518.

**Fixes verified:**
- **M1 (= break M3), fixed.** `Runtime.clientSubjectOf` reads C6.13's client person. `adultCheck`, `privateFrom` (`&& !isClient`), `people()` (`is_client`), send, tick, `hiddenFromClient` (rows, uploads, `clientView`, re-confirm) and the screens (`privacy.tsx` keyed on `is_client`) all use it. My probe after Make principal:
  - Client A's row: `can.send` and `can.tick` are false, with why_not "…they are the client on this case".
  - Client A's self-send and the staff tick on Client A are each 409 in words.
  - Client A keeps their 14 own sections.
  - The new principal by role is an adult and can be sent a link (201).
  - Pack C6.16-13 checks all of this, pass and fail.
- **Break M1, fixed.** The client gets `by` and `why` as null; staff get both (C6.16-9). The client's `words` hold no reason.
- **Break M2, fixed.** `stillAdult` runs on every written use: `liveLink` in code send and verify kills the link with `not_adult` and a history line, in one transaction. `open` and `signed()` only refuse, so they write nothing. The void check and the migration accept `not_adult`; the migration is not on main yet, so editing it is safe. Privacy stays off for the child of 12 (C6.16-13).
- **Break M4, fixed** as far as the stand-in allows. At the right code the inbox loses every message of the link, and a client `x-actor` gets 403 in words. The rest (no header, or another persona) is the SI-20/SI-21 limit the tech lead is choosing on; it is not a finding here.
- **Minors, fixed and tested:**
  - one progress count (`ownerOf` in `people()`, C6.16-4 compares the two routes);
  - the principal's own take-back words (`principalLinkWords`);
  - NUL in the address gives 400 on the field (probe and C6.16-8);
  - focus returns to the opener on Escape (browser);
  - the usage line notes the rerun limit;
  - a case-row lock plus the partial unique index on (case, address) (race C6.16-13);
  - per-source try limits (`serverTries`, unit);
  - Resend goes to the kept address (C6.16-8);
  - long names wrap and the 320 px header fits (browser);
  - the code step survives a reload (browser);
  - BIC-13 top summary and BIC-14 visible reason (browser);
  - "About your first parent";
  - a client save re-reads the setting under `FOR SHARE` (`runtime.ts` saveAnswer).
- **Panel move:** "Own links and privacy" now sits below the case panels. `check_c69_page_browser.cjs` is unchanged and passes.

**Assertions:** none weakened. The unit `isClient` arguments keep each old check; `prin` is still refused, now as the client. Each browser line that was replaced is stronger: the summary is counted twice; focus is waited for, not sampled; the `ok(…, true)` placeholder became a real check.

**Screenshots:** only `screens/B138/screenshots/*` are in the diff against main.

**Still open, not blocking:**
- Minor: the share-lock re-read covers the answer PUT only, not rows, none-apply or re-confirm. The race window is narrow and each is refused once the setting is visible.
- Recorded and known: the M4 stand-in choice (tech lead); SI-20 and SI-21 rows (chips stay `ProposedStandIn`); dead-link dates in UTC; the "Declared: the person's own answer…" line under a part heading on the link.

**Journey score: 9.5/10** (was 8.5). Plain words ½ (the "Declared…" line); every other criterion 1: correct data (M1 fixed, one count), accessibility (focus returns, summary on the dialog).

**BIC changes:** BIC-13, BIC-14 and BIC-20 move to Met.

**Verdict: Approve** for 55358fff5724b16173f7abddfe8236af77072bcc. No open Blocker or Major.

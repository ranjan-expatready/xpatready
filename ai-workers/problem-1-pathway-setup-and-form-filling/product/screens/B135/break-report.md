# B135 · C6.13 Filing changes while preparing: break report

Breaker: a fresh context that did not build the screen, 7 Nov 2026. Branch `claude/intelligent-noether-qkzc6a` at `5c5f72659`. Isolated copy `brk135` on :4447, seeded with `setup_visitor_visa.ts` and `setup_vv_m3.ts`. The pack `acceptance/C6.13.test.ts` passes 24/24 there, and the unit checks pass 23/23. Scope is the concept's "What gets built" (r2, BR-0 to BR-11). Anything on its "Not built" line is left out. Paths are relative to `prototype/studio/`. The attack scripts were throwaway scratch files and are not committed. The copy has been stopped.

## Verdict
**Fix 4 Majors, then merge.** The server holds where it matters most: who may call it, forged bodies, races, stale bases, the recorded-case refusal, and the per-answer confirmation (BR-3b). What breaks is on the edges:
* what the client is told after a swap;
* the PATCH door;
* one missing line in the preview;
* the stale-preview message in the dialog.

## Major
**M1. After Make principal, the client questionnaire tells the client that they are the other person (BR-3b).**
* **Steps.** Open a Visitor visa case with Client A as principal and Sample Spouse A as spouse. Apply Make principal on the spouse. Open `/cases/:id/questionnaire` as user-P (Client A) and open each person's "Personal details".
* **Expected.** Client A's own part still reads "(you)".
* **Actual.** Before the swap: "Answering for Sample Client A (you)" and "Answering for Sample Spouse A (spouse or partner)". After: "Answering for Sample Client A (spouse or partner)" and "Answering for **Sample Spouse A (you)**". The login that BR-3b says "stays the same person" is now told that it is the spouse. It is invited to type the spouse's facts as its own. The confirmation flags are right; the words are wrong.
* **Cause.** `web/src/runtime/questionnaire.tsx:533` picks "(you)" by `role !== "principal"`.
* **Related, same cause.**
  * The badge at `questionnaire.tsx:628` matches `/principal/` against the "why" text. So the new principal's answers, typed by the client, now show "To confirm" instead of "Answered by …".
  * An adult child's words (`engine/runtime/case.ts:70`, `by_principal`) still say "Answered by the principal" when the client is no longer the principal.
* **Fix.** Send the person's `client` flag (from `Runtime.peopleOf`) in the case and questionnaire views, and key "(you)" and the badge on it. Add a pack line: after the swap, "(you)" stays on the client's person.

**M2. The PATCH door is not the same service (BR-10). It leaves a filing "Ready to file" after its fees changed.**
* **Steps.** Use a case with a principal, a spouse and a child of 15. Bring all three filings to Ready to file (`readyToFile`). Then `PATCH /runtime/cases/:id/people/<child> {applies:false}` → 200.
* **Expected (BR-6 M2, BR-10).** The principal's and the spouse's filings go back to Not started, as the POST route does.
* **Actual.**
  * Biometrics move from principal CAD 170 to principal CAD 85 plus spouse CAD 85, yet both filings stay `READY_TO_FILE`, in the database and in `GET …/prepare`.
  * BR-0 is not checked on this door either. This is a code read: no on_principal case is seeded.
* **Cause.** `api/src/runtime.ts:257-279` only adds a `travelling_flag` row.
* **Fix.** Send `updatePerson` through `FilingChanges`: run `applyChange` and the Ready-to-file reset, with a fixed reason and no basis. Applying BR-0 to this door would also refuse C11.12's "declared only" switch on on_principal releases. That is the tech lead's call: either record it as a ruling, or exempt that one switch and say so.

**M3. The stale-preview message never shows: the dialog reloads silently (BR-8, STANDARDS §4 "409 with what changed").**
* **Steps.** Open Remove filing on the spouse. The preview says "2 other filings depend…", CAD 570 → 470. Through the API, change Child A2's date of birth to 13. Type a reason and press Remove filing.
* **Expected.** "This case changed since you opened this. Look again." above the new preview.
* **Actual.** The server answers 409 and nothing changes (good). But the dialog swaps in the new preview ("No other filing changes", CAD 570 → 385) with no message. A second press applies it. The officer who already read the first preview gets no cue that it changed.
* **Cause.** `web/src/runtime/filing-changes.tsx:123` sets the refusal, then calls `load()`, which clears it at `:109` in the same batch.
* **Fix.** Keep a separate `stale` notice that `load()` does not reset, and clear it on the next apply.

**M4. The preview leaves out "Marked Ready to file → Not started" for a child whose filing changes only by its signer, yet apply resets that filing (BR-4).**
* **Steps.** Use the same ready case (principal, spouse, child of 15). Preview Make principal on the spouse.
* **What the preview says.** The principal's and the spouse's lines each say "Marked Ready to file → Not started". Child A2's line says only "Signed for as their parent by Sample Spouse A…".
* **What apply does.** All three filings, the child's included, go to `NOT_STARTED`.
* **Cause.** `api/src/filing-changes.ts:93-94` builds the "changed" set from `diffFilings` without the extra signer words. Apply (`:133-134`) resets every person in `view.changes`, which does include them.
* **Fix.** Work out the signer words first, then take "changed" as the people in the diff plus everyone with extra words. Add a pack line for it.

## Minor
* **m1. The append-only rule covers UPDATE only.**
  * Concept §2 says the "trigger refuses update and delete", but the migration has only `BEFORE UPDATE` (`migration.sql:43`). `DELETE` and `TRUNCATE` both succeed.
  * The table now carries BR-3b: deleting a case's make_principal rows by SQL changed the confirmation of 6 answers. The build notes do not list this as a difference from the concept.
  * Fix: add a `BEFORE DELETE` trigger that raises while the case row still exists (so the cascade still works; check this), plus a `BEFORE TRUNCATE` trigger.
* **m2. The database check lets a typed change have no reason.** `INSERT … kind='remove_filing', reason NULL` succeeds, because a CHECK on NULL passes. A reason of `'\t'` also passes, because `btrim` strips spaces only (`migration.sql:36`). Fix: `"reason" IS NOT NULL AND char_length(btrim("reason", E' \t\r\n')) BETWEEN 1 AND 500`.
* **m3. Invisible and reversing reasons are accepted.** A reason that is only `U+200B` is stored, and the row shows `“​”`. `U+202E…` is stored and shows reversed (`api/src/filing-changes.ts:34,118`). Fix: refuse `\p{Cf}`, or require at least one letter or digit.
* **m4. Undo breaks on a long reason.** Remove with a 500-character reason → 200. Undo sends "Undo: " plus that reason (506 characters) → 400 "Keep the reason under 500 characters." (`filing-changes.tsx:52`, `api/src/filing-changes.ts:28`). Fix: shorten the prefixed reason to 500.
* **m5. Refused menu items cannot be reached by keyboard.**
  * Radix skips `disabled` items. On the principal's menu, focus stays on the menu container (the one item has `tabindex=-1`). On a child's menu, ArrowDown reaches only "Remove filing…", so "Make principal" and its reason are never focused (`filing-changes.tsx:89-92`). A screen-reader user never hears the reasons.
  * The Role ⓘ tip cannot be focused either (`:56`).
  * Fix: make the refused items focusable, with `aria-disabled` and a no-op select.
* **m6. Focus goes to `<body>` after apply or Cancel, not back to the row** (concept §4). Fix: in the Dialog's `onCloseAutoFocus`, focus the row's ⋯ button, or the Undo line after a change.
* **m7. Long names overflow.** With a 120-character unbroken name (the add-person limit):
  * at 1024 px, the dialog title and description run past the dialog's edge (`components/ui/controls.tsx:85-86`);
  * at 512 css px (200 % zoom), the done line is cut off (`filing-changes.tsx:51`);
  * the swap note (`:64`) has no `overflow-wrap` either.
  * Table cells wrap correctly.
* **m8. Validation runs before authorisation.** A client or configuration actor sending a malformed body gets 400, not 403 (`api/src/filing-changes.ts:112-115`, STANDARDS §6 deny by default). Fix: call `reach` first.
* **m9. BR-0 is not stated in the menu before the click (code read).** On a combination with on_principal people, the menu still offers Make principal and Remove filing, and the words come only after the click, in the dialog. BR-0 says "the menu and the API say".

## What held
* **Who.**
  * The two clients (user-P, user-Q) and the three configuration users (user-A, user-C, user-B): 403 on POST and GET.
  * user-S, the other firm: 404.
  * No actor, or an unknown actor: 401. A malformed case id: 404.
  * user-T, firm staff not on the case team, is allowed. This matches BR-9 ("the case's firm") and `Runtime.reach`; there is no per-team rule in the app.
* **Forged bodies.**
  * Another case's subject, the case subject: 404.
  * The principal: 422 for both Make principal and Remove filing.
  * Unknown kind, `travelling_flag`, `preview:"true"`, an array or null body: 400.
  * A basis from another case, another subject or another kind: 409.
  * A reason of 501 characters, or 300 emoji: 400. Control characters: 400.
  * A lone surrogate is stored as U+FFFD. Newlines, CJK, Arabic and ✓ are kept and read back.
* **Races.**
  * Four applies at once on one basis: one 200, three 409, one row.
  * Make principal together with the PATCH door: 409 and 200, consistent.
  * Recording the group together with Make principal: the record got 409 and nothing was recorded; the swap applied.
* **Stale previews.** A date of birth changed, or a submission group split, between preview and apply: 409, nothing changed. An unrelated answer: 200, by design.
* **BR-3b, the Blocker.** With 28 answers in the agent view and 13 in the client view, the client's none-apply on 13 groups, and children of 10 and 15: no confirmed flag changed with the swap, and Undo restored every answer's state exactly. After a split and then a swap, the preview total equals Prepare's (CAD 655).
* **Database.** The UPDATE trigger works. The CHECKs refuse a travelling_flag row with a reason or another subject, a make_principal row without another subject, a blank reason and an unknown kind. The audit holds no reason text.
* **Doors.** The PATCH door refuses the new principal after a swap (404).
* **Budgets.** Preview takes 15-27 ms and the list about 10 ms; no request is made per row.
* **Accessibility and layout.** axe-core (WCAG 2.1 AA) finds 0 violations on the table, the principal's menu and the Make principal dialog. At 1024 px the table fits (974/974 px). At 200 % zoom it fits its container.
* **Reload.** After a reload the Undo line is gone (it is local state), but the reason stays on the row and the menu offers the way back.

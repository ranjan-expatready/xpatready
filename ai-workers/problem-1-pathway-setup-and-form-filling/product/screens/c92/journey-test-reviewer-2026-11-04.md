# Journey test: C9.2 Out of date and Undo (reviewer role, 4 Nov 2026)

Commit 53686fb58c035fccd450a698cf4d0f551987fc69. Isolated copy `rv_c92` on :4430, Chromium (Playwright, `/opt/pw-browsers/chromium`), axe-core WCAG 2.2 A/AA. Persona: the case officer (`xr-actor = user-O`) on `/cases/<id>`, where the list sits in "Prepare application". Preconditions came from other capabilities' built routes: IMM 5257 validated and read back (C7.7), IMM 5476 signed and scanned (C8.1). Live AI off, US$0.

## Journeys
1. **Main path.** Case officer: "the passport shows a new family name; what do I redo?" Agent view → Sample Client W → Edit Family name → type SAMPLEWZ → Enter → Confirm section → Prepare application. Expected: the finished items that read the name are Out of date, each with the change, and an Undo.
2. **Undo (keyboard).** Tab to "Undo… back to SAMPLE" → Enter. Expected: the earlier value returns, the items are current, and the list goes away.
3. **Two changes since the item was finished.** SAMPLE → VONE → VTWO, then Undo. Expected: the button's promise ("back to SAMPLE") is kept.
4. **Two tabs (recovery and stale).** Both tabs show the list. Undo in tab 1, then Undo in tab 2. Expected: tab 2 is refused with "Reload".
5. **Wrong role.** The client opens the case URL. Expected: no list and no Undo.
6. **Scope.** The spouse's finished items when the principal's name changes. Expected: only items that read the name.
7. **Screen sizes.** 400, 1024, 1440 px and 200 % zoom. Expected: no sideways scroll.
8. **Printed, not yet signed.** Change a fact after Print only. Expected: nothing goes Out of date, and Print again is allowed.

## What happened
* J1 held. The Edit field took focus, Enter saved ("Saved. It fills IMM 5257 for 2 people…"), and Confirm section was enabled. The list then read "Out of date (3): changed after they were finished" (the spouse's IMM 5257, the principal's IMM 5257, the principal's IMM 5476), each entry naming the fact, the person, "SAMPLE" → "SAMPLEWZ", "on 4 Nov 2026" and the next step. It took about 1.5 s after confirming. Page load (network idle) took 1.9 s at 1440.
* J2 held. Tab reached the Undo button with a visible ring; Enter ran Undo, and the toast and the list cleared in under 2 s. Data: a new SAMPLE VERIFIED row, the earlier rows kept. **But** focus fell to BODY, and the toast reads "Undone: **person.family_name** is back to its earlier value…" (a raw key).
* J3 failed. Undo restored **VONE**. The items stayed Out of date ("changed from SAMPLE to VONE"), and the same "back to SAMPLE" button came back. *Major.*
* J4 failed. Tab 2's "back to SAMPLE" **re-applied SAMPLETAB**, with no 409. Database: SAMPLETAB VERIFIED is the current row. *Major.*
* J5 held: no list for the client.
* J6 held. The spouse's validated IMM 5257 went Out of date (it reads the principal's family name); the spouse's signed IMM 5476 stayed Ready.
* J7: at 400 px the Undo button overflows its card (scrollWidth 487). 1024, 1440 and 200 % zoom are fine. axe: `label-content-name-mismatch` on 3 buttons at 1440 and 400. *Major (axe) and Minor (400 px).*
* J8 held: the item stayed To do, and Print again returned 200.
* Break-it (15 min): a client, reviewer or approver Undo gets 403; another firm gets 404; a bad body gets 400 on the field; nothing to undo gets 409 with no write; a stale `expectedId` gets 409. Two concurrent re-prints are refused by the unique index (code). A double click is guarded by `busy`. I found no console or page errors.
* Data underneath: append-only throughout; the audit line "…undid the last change to person.family_name…" carries no values; the restored row keeps its earlier status and verification.

## Score (QUALITY.md "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 and J2 through the screen, end to end |
| Next step obvious | 1 | each reason ends with "Prepare it again … or undo the change before filing" |
| Plain words | ½ | raw key `person.family_name` in the toast; long question text as the fact name |
| Feedback and state | ½ | toast and list update; focus lost; the button repeats a wrong promise (J3) |
| Correct data | ½ | append-only and scope correct; J3 and J4 write a value the officer did not ask for |
| Error recovery | ½ | no 409 or Reload from a stale tab (J4); buttons that always fail on list entries and declarations (code) |
| Accessibility and screen sizes | ½ | keyboard and ring OK; axe 2.5.3 failure; 400 px overflow; focus loss |
| Speed | 1 | `GET …/prepare` 80 to 150 ms; Undo under 2 s including the refetch |
| Visual quality | 1 | team tokens, warn border, consistent with the Prepare panel |
| Trust and sources | 1 | old and new value with the date; items kept "exactly as they were"; no AI |
| **Total** | **7.5 / 10** | **Fail (below 8)** |

Fixes that would raise it, most valuable first: (1) Undo restores exactly what its button says, and the screen sends `expectedId` (J3, J4); (2) the button's accessible name contains its visible words, and the button wraps at 400 px; (3) the fact's label, not its key, in the toast and refusals; (4) focus moves to a heading after Undo; (5) no Undo button for list entries or declarations.

Could not test: a real screen reader; an intended user's unaided walk (D17, D20 stay with the founder); the "submitted" items (C8.2); Ready to file (C7.6).

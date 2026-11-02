# UX-A part 5: break report, round 2 (d658e76a)

**What was tested:** commit d658e76a (diff from 2a43062d), web rebuilt (`index-BFwwhRBo.js`), in a fresh isolated copy `brk_uxa5` on :4472 with the demo reset and loaded as user-A. US$0: no AI call, nothing priced; :4400 and :4446 untouched.
**How:** Chromium through Playwright, with touch emulation at 400×860 (`hasTouch`, `isMobile`) and a 1440 desktop. Probes and screenshots are in `/tmp/claude-0/-home-user-xpatready/d1a19a26-d4f8-5a0b-9a61-250603ccb5cc/scratchpad/b5r2/` (`r2probe.cjs`, `r2b.cjs`, `r2-*.png`). The committed screenshots were restored after each check run.

## Round 1 findings re-tested
| Round 1 | Now |
|---|---|
| m1 "question s" | **Fixed.** The tip and the description come from one string (`removeWhy`); the check covers it. |
| m2 a phone tap shows nothing | **Fixed on all three screens.** At 400 px, one tap shows the reason: Forms "Attached from the Form library…", Questionnaires "Not here: its 7 questions…", Structure "Can't retire yet…". A tap opens no panel and no dialog. |
| m3 Enter hides the reason | **Fixed.** Enter, Enter, Space, Space keeps the tip open and focus in place, and opens no panel or dialog. Escape closes it and keeps focus; Enter opens it again; Tab away closes it. |
| m4 the approver has no description | **Fixed.** As user-B, the description exists ("Only a configuration author deletes, retires or restores names. …") and a click shows it. |
| m5 "not available" three times | **Fixed.** The name is now "Remove from questionnaire: <section>", and aria-disabled plus the description carry the rest. |
| m6 records | Handed to the PR and the tech lead (not re-tested). |
| m7 flaky check | **Fixed.** `check_uxa5_tooltips_browser.cjs 4472 xr_studio_brk_uxa5` passed 33/33 on 3 runs out of 3. |

## New findings
**Blocker:** none. **Major:** none.

**n1 Minor: two tips can be open at once.** Steps (1440): Tab to a greyed control, press Escape, hover a plain tip elsewhere (on Structure, the next row's "Not released yet…" chip; on Questionnaires, the source strip), then press Enter. Both tips stay open and can overlap (`r2-structure-two-tips.png`, `r2-questionnaires-two-tips.png`). Cause: `ExplainTip` opens with its own `setOpen(true)` (`web/src/components/status.tsx`, the `onClick` of `ExplainTip`), not through Radix's own open. Radix sends its "another tip opened" message (`tooltip.open`) only through its own open, so the hovered plain tip is never told to close. Other orders hold: a plain tip that opens after the explained one does close the explained one. Cosmetic only.

**n2 Minor: after a mouse click, the tip stays open when the pointer leaves.** Steps (1440): click a greyed Retire, Remove or "Attached, not set up yet", then move the mouse away. The tip stays open until Escape, a click elsewhere, Tab, a scroll, or hovering another tip. This is how a toggletip is supposed to behave, and it is what fixed m2 and m3. It is noted because the longest Structure reason (433 characters, about 160 px tall) then covers part of the filter row until it is dismissed. No action needed if this behaviour is intended.

**n3 Minor (code reading, not reproduced): if a control switches between greyed and enabled while it has focus, focus is lost.** `Tip` returns `<ExplainTip>` when `explain` is set and a plain `<Tooltip>` otherwise. RowAction passes `explain={!!why}` (`components/lifecycle/index.tsx:31`). When `why` changes, the button is unmounted and mounted again, and focus falls to the page body. In this tab that happens only after an in-tab refresh, because `refetchOnWindowFocus` is false (`lib/api.ts:29`). I found no keyboard path that reaches it while the control has focus. Questionnaires already switched elements before this round.

## Attacks that held
- **Touch at 400 px, on all three screens:**
  - Tapping the same control again keeps the tip open; tapping a second greyed control moves the tip to it.
  - Tapping elsewhere closes it.
  - On Structure and Questionnaires, scrolling the page closes it. On Forms, scrolling the table sideways closes it (the button moved to x = −113, no tip left floating).
  - A plain tip that is not marked `explain` (StatusChip) still opens nothing on a tap: unchanged.
- **Mouse:** clicking A and then B on Structure and Forms leaves only B's tip open. On Questionnaires, clicking A and then B leaves none open, which is harmless.
- **Structure keyboard:** the Delete key on a greyed row's Edit now shows the action's reason, with focus kept on Edit and no impact panel. ArrowDown moves to the next row and closes it. A mouse-wheel scroll closes an open tip.
- **Plain tips elsewhere:**
  - Hovering Edit shows its tip as before.
  - Other greyed controls whose only reason is a plain tip are unchanged: Structure details Move up/down and Save (`structure.tsx:558-576`), Add for readers (`:205`), `add-to-structure.tsx:220-221`, `draft-fields.tsx:40`. They still open nothing on touch, but they are outside finding 3's three screens.
- **Form library:** it uses RowAction, so `explain` now applies there too. A click on a greyed action shows "Still used: …" and opens no panel. Its visible line stays (round 1 m6).
- **Unchanged since round 1:** no page errors on phone or desktop; the check's axe passes at 1440, and its no-sideways-scroll and no-long-sentence checks pass at 1024 and 400 px.

## Verdict
**Pass.** All round 1 findings that were to be fixed in code (m1–m5, m7) are fixed and covered by a check that is now reliable. Round 2 found only three Minors, all edge cases (n1 two tips at once, n2 the tip stays open after a click, n3 focus could drop in a case I could not reproduce). Nothing blocks the merge. m6 stays with the PR and the tech lead.

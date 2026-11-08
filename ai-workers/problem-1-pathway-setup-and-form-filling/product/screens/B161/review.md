# B161: Paper line steps by screens (Printed, Signed in pen): review

PR #1340, branch `claude/runtime-b161-pen-steps`, **reviewed commit `f3278cd4c`** (diff `origin/main...f3278cd4c`). Reviewer agent, fresh context, 8 Nov. Concept: B3 Sign and scan block (`screens/B3/concept.md`), reused for Paper and pen. My own copies: gate B on :4460 (`rev_b161`), and a walk copy `rev_b161w` on :4462, loaded with the configured checkpoint. Both copies are stopped. Journey test: `journey-test-reviewer-2026-11-08.md` (**8/10**).

**Verdict: Block** (one open Major). In the skill's words: Ship after fixes.

## Runs
* Gate B (`GATE_B_DATA=checkpoint`, :4460): `C7.6-screen.test.ts` exit 0, **6/6**. `C7.6.test.ts` exit 1, **23/25**: C7.6-12 and -19 fail, as expected until #1334 merges. Not judged here.
* `C7.6-screen.test.ts`, run twice more on :4462: 6/6 and 6/6 (exit 0).
* My journeys (a scratch Playwright script, four new cases, 1440 / 1024 / 720 / 400 px): main path by keyboard; a fact changed after Printed; a newer validated copy read back after Printed; a non-barcode form (IMM 5645) moved to Paper; the client role; printing twice.
* `graph.mjs --check`: G1 0, G2 0, G4 0, G5 0; the sign-step routes are not among the G3 untested routes. All runs: the pack is repeatable.
## The six questions
1. **HAND_SCANNED unchanged: yes.** `SignBlock` has three edits (`sign-steps.tsx:148, 228, 236`), all type-only (`as readonly …[]`, `as SignStepKey`), so the emitted JS is the same. `SignSteps` adds one new mount line (`:79`) for `PEN`. I did not re-run the C8.1 browser check.
2. **Print copy, `again`, `nextKey` against the server: not fully.**
   * Matches: the barcode copy offered is the current validated copy (`:283`), as the server's `copy !== validated.copy` refusal (`api/src/sign-steps.ts:141`) requires. `again` for "a newer validated copy was read back" matches `restart` (J4: re-print recorded on V2, then Signed in pen offered and accepted). Signed in pen sends the printed copy (B130).
   * Does not match: a barcode form whose validated copy goes **out of date after Printed** (a fact changed). See Major 1.
3. **Refusals in the server's words: yes.** `run` shows the error's message under "Not recorded" (`:267-271`). In my J3 walk, the text on screen equalled the 409 `detail` word for word. "Cannot start yet" uses `penRefusal`, the server's function. The screen writes its own words only for the non-barcode "generate a copy above first" line, as `SignBlock` does.
4. **Fail side: real by reading, and the waits are loud.** Remove the block: `open()`'s `waitFor` throws, `main` records a "crashed" FAIL, and the run exits 1. A Signed in pen button shown out of order makes -10d red. A refusal not shown makes -10g's `waitFor` throw. -10d's `.catch(() => "")` (test `:44`) leaves an empty string, which fails `!!shownWhy`. I ran no mutation. Gap: no check covers `again` or a validated copy going out of date (Minor 4).
5. **Keyboard, focus, screen reader: met at 1440 and 1024 px.**
   * Printed is reached by Tab (36 presses) and pressed with Enter. Focus then moves to the "Signed in pen" button. Enter records it, and focus goes to the block heading.
   * axe finds nothing in the block before or after.
   * Each step has sr-only text: ": done", ": next" or ": not yet". The refusal Notice is `role="alert"`.
   * No sideways scroll at 1024, 720 (200 % zoom) or 400 px.
6. **Plain words: mostly.** Minor 1 (two dates for one copy). Minor 5 (the server's refusal is untrue in J3).

## Issues, ranked
**Major 1 (Must): on a barcode form, a fact changed after Printed leaves "Signed in pen" offered, and the server refuses it.** This is a normal C9.2 flow.
* Steps: Printed on validated copy V1, then a fact the form reads changes (journey J3 in the journey test; my screenshot `r4-fact-changed-refused-1440.png`). `/prepare` now gives `validated.current: false`, state Out of date, and Paper steps `print: false, sign_in_pen: false` (`case-prepare.ts:396` counts pen steps only on the current validated copy).
* `PenBlock` takes done from the raw item read instead (`:299`). So Printed shows ✓ and `nextKey` is `sign_in_pen` (`:287`). `again` is false because `v.current` is false (`:285`). Result: an active **Signed in pen** button under an "Out of date" pill.
* Pressing it gets the 409 from `sign-steps.ts:127-128`. The button stays offered afterwards. The block (Printed ✓) also disagrees with the line, readiness and the pill.
* *Fix:* on a barcode form, count Printed and Signed in pen only when `v?.current && done.print?.copy === v.copy`, the same rule as `penDone` in case-prepare.ts:396 (or use the line's own `s.done`). While `v` is not current, show the line's reason and no button: Printed waits with `penRefusal("print", {}, form, {barcode, validated: false})`. Once a new copy is read back, the existing `again` path offers a new print.
* *Proof:* add a fail check next to -10g: change a fact after Printed, then expect no `[data-step-action="sign_in_pen"]` and Printed not ticked.

**Minor (Should)**
1. One copy, two dates. The button says "Printed: the validated copy of 8 Nov, 06:03", which is `v.at`, the read-back time (`:283`). The done row says "Copy of 8 Nov, 06:02", which is `copyOf(r.copy).created_at` (`:305`). See the builder's `4-stale-tab-refused-1440.png`. Use the same date in both places.
2. Non-barcode print (`:282-283, 292`) drops `SignBlock`'s BR-4 reasons. Missing: "being generated", "this copy is out of date", "the file is missing", "Copy, not for filing", and the fill-trial warning. Any of these shows "generate a copy … first" even when a copy exists, and a copy stamped "Copy, not for filing" would be offered. On this release that last case cannot happen: no non-barcode line is Online. Reuse `SignBlock`'s `printAction` reasons.
3. Before Signed in pen, a non-barcode form gets no stale-copy guard. `SignBlock` has one (`printedCopyStale`, B3 Break M2), and the server does not check whether a pen-signed print is out of date (`sign-steps.ts:116`). So a stale tab can record Signed in pen on an out-of-date print. Mirror the guard. The server half is a runtime-lane follow-up for the tech lead.
4. STANDARDS §3.10: the `again` / restart mirror and the out-of-date case have no pass or fail check in `C7.6-screen.test.ts`. J4 passed only in my walk.
5. For the tech lead, not this PR: the 409 at `sign-steps.ts:128` says "a newer validated copy was read back" when the real cause is a changed fact (J3). Once Major 1 is fixed, screens can no longer reach it.

## [M] lines (the ones this change touches)
STANDARDS:
* §3.4 server-checked order and copy: met. A second Printed gets 409 "Printed is already done for IMM 5257."
* §3.10 pass and fail: met for -10d to -10h, except Minor 4.
* §4 concurrency: met (stale tab 409, `copy` named on Signed in pen).
* §5 one request per view: not met, as in `SignBlock` (one item read per row). B3 Minor 3 accepted this as a follow-up.
* §6 authorisation: met (client 403 on GET and POST).
* §7 one rule for web and API: met for `penRefusal`, broken by Major 1 for done and next. No `any`.

EXPERIENCE:
* §2.5 one next action and §2.8 prevent before message: not met in J3 (Major 1).
* §2.12 keyboard: met.
* §4 states: loading, could-not-load (Retry), read-only and conflict are present, as in `SignBlock`.
* §5 no ids on the main path: met.

## D1–D20
| D | Score | Evidence |
|---|---|---|
| D1 | 4 | Done-when met: Printed then Signed in pen by screens at 1440 px; out of order refused in the server's words; checks next to C7.6-10c |
| D2 | 4 | One row per step; the copy recorded is the validated copy; audit line per step; server refuses the wrong copy |
| D3 | 4 | `penRefusal` and `SignBlock`'s layout reused; BR-4 reasons not reused (Minor 2) |
| D4 | 3 | Done and next on a barcode form disagree with `/prepare` and the server after a fact change (Major 1) |
| D5 | 4 | Reload keeps state; stale tab 409 in words; double press 409 |
| D6 | 4 | "recorded by {name}, {when}"; audit lines |
| D7 | n/a | No AI |
| D8 | 4 | Under the form's own card and copy block |
| D9 | 3 | One button and "Cannot start yet" on the main path; wrong next step in J3 |
| D10 | 4 | Plain; Minor 1 |
| D11 | 3 | Toasts, ✓, pill, busy; but ✓ Printed under an Out of date pill (J3) |
| D12 | 4 | Team components; same as `SignBlock` |
| D13 | 4 | Keyboard path, focus to next, axe clean, 1024 / 720 / 400 px with no sideways scroll |
| D14 | 4 | Same components and words as the prepare tab |
| D15 | 4 | A step plus re-read about 0.8 s; one item read per row |
| D16 | 3 | Six checks, repeatable 3 of 3; no check on `again` or out-of-date (Minor 4) |
| D17 | simulated only | No intended user walked it |
| D18 | 4 | Copy named; who and when; the line's reason shown |
| D19 | 3 | Printed and Signed in pen by screens; Mail not recorded (a known gap, its own row) |
| D20 | simulated only | — |

## BIC (EXPERIENCE §6)
| BIC | Result | Evidence |
|---|---|---|
| 01, 02, 04–09, 17 | N/A | No questions, input, AI, roles or review on this block |
| 03 No stale answers | Partly | Server refuses a signature after a fact change, but the screen offers it (Major 1, `r4-…png`) |
| 10 Task list | Met | Numbered steps, "Cannot start yet" with a reason (`1-before-1440.png`) |
| 11 One primary action | Met | One filled button per state; named for the act |
| 12 Check before it leaves | N/A | Ready to file panel (B2), not this block |
| 13 Errors say what and how | Partly | Server words shown; J3's words are untrue (Minor 5) |
| 14 Help in place | Met | Pill title; hint line under the heading |
| 15 Channel per form | Met | "On Paper, signed in pen", who signs, next step |
| 16 Signing recorded | Met (scope) | Printed and Signed in pen with who and when; Mail is its own row |
| 18 States | Met | Skeleton, Retry, read-only, refusal |
| 19 Layout | Met | `5-done-1024.png`, my `r2-block-1024.png` |
| 20 Accessible | Met | Keyboard walk; 200 % (720 px) with no sideways scroll |

## Not checked
A real screen reader; an intended user's unaided walk (D17, D20); the read-only state after a recorded submission on a Paper line (not walked; same code as `SignBlock`'s); C7.6 27/27 (after #1334, the builder's); a mutation run of the pack.

**Verdict: Block.** Fix Major 1, with its fail check. Minors 1–4 are Should. Minor 5 is for the tech lead.

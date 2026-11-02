# Review: C11.14 Select all / Deselect all (forms-c1114 @ eeff3f40)

Reviewer (fresh context, also standing in for the breaker). Own copy `rev_c1114` on :4467, live AI off (replay only, US$0).
Diff: `web/src/pages/proposals.tsx` +2 (a ghost "Clear the choice" button beside "Choose all N" in the Ready band),
`tests/check_s6_queue_browser.cjs` +3 steps, `qa/built/C11.14.md` (new). Screenshots rewritten by the suite were reverted.

## Verdict: Block (one Major, a one-line record fix; the button itself is right)

## What I checked
- Builder suite `check_s6_queue_browser.cjs 4467 xr_studio_rev_c1114`: **31 PASS, 0 FAIL**, no page errors.
- Rule test fails when the rule is removed: yes, without the button the new steps' `getByRole("button", { name: "Clear the choice" })` finds nothing.
- Load sample claim: `POST /api/demo/load {sample:"six"}` (author, 17.9 s) → `drafts.replayed 6`, `proposals_waiting 139`,
  `cost_usd 0`; `proposal_item` holds 139 `waiting`; 6 edition groups. Replay goes `ai.launch(REPLAY)` → `form-masters.ts:126`
  `insertProposals` (the one door). Already named by `check_s7_load.ts:71` and `check_queue_tx.ts:41`. **Claim holds as written.**
- My own walk (seeded data, `tests/seed_proposals.ts`, two editions), as the content reviewer (user-C):
  - Keyboard only: Choose all 2 (Enter) → "2 items chosen"; Tab → Clear the choice; Enter → 0 chosen, status reads
    "2 can be accepted together" (aria-live), Accept off.
  - Partial manual pick (1 of 2) → Clear on, Accept 1 item; Clear → 0, Accept off. Choose all, untick one, Clear → 0.
  - Group switch with a pick open → picks dropped (`useEffect` on `asked`); a group with no acceptable Ready item shows no
    bulk band. Browser Back → first group, 0 picked, Clear off. Double-click Clear → 0, no error.
  - axe WCAG 2.2 A/AA: 0 violations at 1440 (partial pick), 1024 and 400 (all chosen). No sideways scroll at 1440, 1024,
    720 (200 % zoom) and 400; at 400 the buttons wrap under the count. Queue opens in 398 ms. No console or page errors.
- Server: the button is client state only; nothing new reaches the API (no authorisation, race or migration surface).
- `graph.mjs` runs clean; C11.14 is named by 7 test lines.

## Findings
**M1 (Major) — the row's Select all / Deselect all is not visible on the demo's own data, and the record reads as if it were.**
After Load sample six, all 139 proposals are `step = field_map` (120 Ready, 19 Check). `bulkWhy` (`api/src/proposals.ts:300`)
gives every one "It is decided on its form-field page.", so `readyOk` is empty in every group and the Ready band shows no
Choose all, no Clear the choice and no Accept (`proposals.tsx:85`, `readyOk.length` guard). The new button is reached only
with `tests/seed_proposals.ts` data: a demo step that works only through scaffolding (P-33). `qa/built/C11.14.md` says the
Load sample part "needed no build" and lists 139 waiting, which qa will read as the row's demo path; qa's own note
("no Select all / Deselect all within a filter seen") will still be true after this PR.
*Fix (record, no new scope):* in `qa/built/C11.14.md` say plainly that after Load sample the bulk band shows in no group
(every replayed item is a field-map item decided on its form-field page, `ON_ITS_PAGE`), so Select all / Deselect all is
shown only on queue-decided proposals (seeded in the suite); the row stays Partial on that point until the field-map step
folds into the queue (deferred in slice 1b build-notes) or the lead rules otherwise. Raise it to the lead in the PR.

**m1 (Minor, Should) — focus drops to `<body>` after Clear the choice.** The button disables itself on click
(`proposals.tsx:91`), so keyboard focus is lost (Chrome's next Tab does continue to the table; a screen reader loses its
place). Fix: on clear, focus the "Choose all N" button (a ref), or keep the button enabled and make it a no-op when empty.

**m2 (Minor, Should) — the suite does not cover a partial manual pick or the reset on group switch.** Both pass by hand
(above). Fix: one step each in `check_s6_queue_browser.cjs` (tick one box → Clear → 0; pick, switch group, back → 0).

Break-it: double click, Back, group switch, 400 px, 200 % zoom: nothing broke. No server change, so two-tab and
wrong-role cases are unchanged from the merged suite (decide/undo guards re-checked by its 31 steps).

## Journey score (reviewer, the one score for this check): 9 / 10 — pass
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Works on a queue-decided group; never offered after Load sample (M1) |
| Next step obvious | 1 | Clear sits beside Choose all; Accept off once cleared |
| Plain words | 1 | "Clear the choice", "2 items chosen", "2 can be accepted together" |
| Feedback and state | 1 | Live count text; Clear off when nothing chosen |
| Correct data | 1 | Client state only; Accept after Clear sends nothing |
| Error recovery | 1 | Group switch and Back drop picks; double click harmless |
| Accessibility and sizes | ½ | axe 0 at 1440/1024/400, no sideways scroll; focus lost after Clear (m1) |
| Speed | 1 | Queue 398 ms; Clear instant |
| Visual quality | 1 | Ghost button, team controls, wraps cleanly at 400 px |
| Trust and sources | 1 | AI / Rules pills and "Decide on its form-field page" unchanged |

Journey report: `journey-test-reviewer-2026-11-02.md` (this folder).

## Could not check
A real screen reader; an intended user's unaided walk (D17/D20 simulated only); a Ready group over 200 items
("Choose the first 200" with Clear) on real data.

**Verdict: Block** — fix M1 (record wording in `qa/built/C11.14.md`); m1 and m2 are Should.

## Round 2 (16b08b2e)
Diff `eeff3f40..16b08b2e`, web rebuilt, own copy `rev_c1114` on :4467. Suite `check_s6_queue_browser.cjs 4467 xr_studio_rev_c1114`: **32 PASS, 0 FAIL**, no page errors (run twice).
- **M1 — fixed.** `qa/built/C11.14.md` now says "part … Still Partial": after Load sample every item is a field-map proposal decided on its form-field page, so no group offers Choose all / Clear the choice on the demo's data; fix is folding the field-map step into the queue. Matches the finding; qa will not read Load sample as the demo path. The lead still needs it raised in the PR.
- **m1 — fixed.** Clear the choice focuses the band's `data-choose-all` button on the next frame (`proposals.tsx:91`, scoped by `closest("[data-band]")`, line 108); new suite step "focus moves to Choose all after clearing" passes.
- **m2 — open, Should,** listed for the PR as agreed; does not block.

Journey score unchanged in substance: Accessibility and sizes now 1 (focus kept); Task completed stays ½ (demo data, M1 recorded as Partial). **9.5 / 10 — pass.**

**Verdict: Approve** (for 16b08b2e; no open Blocker or Major; m2 Should, in the PR).

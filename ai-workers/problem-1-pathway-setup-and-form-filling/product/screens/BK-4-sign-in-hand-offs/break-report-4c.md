# BK-4c break report (case hand-offs), commit 5a13935ed

Breaker, screens lane, 11 Nov 2026. Branch `claude/screens-bk4c-handoffs` at 5a13935ede2d7721e36fb611e42fa473f8658f06 (PR #1589; 4c's own diff `975779226..5a13935e`). Isolated copy `screens_bk4cb` on :4462 (web built from this commit at 19:12 UTC, stopped after), finished story (C10.2) loaded, plus: a round sent on SAMPLE-VV-THIN-1 (Client B) and a solo-firm case opened by user-S. Playwright chromium, axe WCAG 2.2 AA. Live AI off, US$0, no priced button pressed. Scope: concept §5 "4c", BR-1..BR-8 as they apply to 4c.

Note: at 19:25 UTC uncommitted edits to `cases.tsx`, `hand-off.tsx`, `questionnaire.tsx`, `readiness.tsx` (`handedFrom`, `rememberFrom`) and a `review-4c.md` appeared in this working tree from another session. They were not built or tested. Every finding below is against 5a13935.

## Findings

### Major
**M1. The case page's "Next: Client A answers…" hand-off shows whatever the case's state (BR-2).** `cases.tsx:224` renders it whenever the case has a known client.
- Steps: as user-O open SAMPLE-VV-FAMILY-1 (finished story: 90 of 90 parts answered, "Recorded as submitted to IRCC … A recorded submission is read-only"). The Client questionnaire card still says "Next: Client A answers on their phone, for everyone travelling. [Hand to Client A (simulated) →]". The walk does the same: the client presses "Hand back to the Case officer" and lands on this card, which again says the client is next.
- Steps 2: SAMPLE-VV-THIN-1 with round 2 sent. The page shows two contradictory next steps at once: "Next: Client B answers on their phone…" (top card) and "Sent for review (round 2) · Next: Second representative (Sample) checks each form…" (Ready to file).
- Expected (BR-2; concept §5 "States: … hidden (you are next, or nothing next)"): a hand-off shows only when the next step belongs to that person, computed from the step's state.
- Actual: it is always shown. On the main walk the page states a false "Next".

### Minor
**m1. A hand-back is offered to a firm person who cannot open the case (BR-3, BR-4).** `questionnaire.tsx:458` checks only `isFirmStaff(from)`.
- Steps: as user-P open `/cases/<family>/questionnaire?from=user-S`. The page shows "Next: Solo representative reviews your answers. [Hand back to the Solo representative (simulated) →]". Pressing it makes the person user-S on `/cases/<family>`, which reads "This case could not be opened · No such case."
- With a repeated parameter, `?from=user-S&from=user-O`, the first value wins and gives the same result.
- Expected: no hand-off to a target the server refuses (BR-3: "is not refused by the server"; BR-4: no dead end).
- Actual: a dead end, and the person is changed. Only a hand-edited or crafted address reaches it, since the officer's own button always carries an id that can open the case.

**m2. After another session changes the representative, the representative hand-off still names the old one.** `readiness.tsx:76` (rounds query, not refetched) and `:93`.
- Steps: user-O opens SAMPLE-VV-THIN-1 while round 1 waits; the button reads "Hand to the Representative". In another session, `PUT …/team/representative {userId:"user-T"}` as user-R returns 200. Without a reload the button still targets user-R (`data-handoff-to=user-R`). Clicking it makes the person user-R on the round page, which reads "Representative of record: Second representative … You can read this review. Only the representative of record approves or sends back."
- Expected: the hand-off goes to the representative of record (BR-3).
- Actual: it goes to the former representative. Rights hold (the page is read-only) and a reload corrects the target (user-T). A change made in the same tab invalidates `["runtime"]` and is fine.

**m3. Each hand-off flashes the old page as the new person for about one frame.** `hand-off.tsx:40` calls `setActor(p.id)` before `nav(go)`, and the route change renders after the person change.
- Sampled per animation frame:
  - Case page → client: URL `/questionnaire` with "This page is for the case officer" (CasePage drawn as the client), then the questionnaire.
  - Hand-back: URL `/cases/<id>` with "This is the Client questionnaire" and its "Hand to Client A" button (ClientPage drawn as the officer), then the case page.
- A Playwright locator waiting for `[data-handoff=client]` after the hand-back caught and read that flashed button ("Next: Client A answers this questionnaire.").
- Expected: the next page appears without a refusal-worded intermediate. Actual: a one-frame flash of a refusal notice, plus a clickable hand-off for one frame.

**m4. Browser Back after "Hand to Client A" leaves the client on an officer notice whose link drops `from`.** `cases.tsx:206`.
- Steps: as user-O press "Hand to Client A", then Back. The person stays user-P (good, BR-1), on "This page is for the case officer. As a client, open your Client questionnaire."
- That link goes to `/cases/<id>/questionnaire` without `?from=`, so when every part is answered the "Hand back to the Case officer" never shows. Recovering takes Forward or the picker.

**m5. The hand-off words do not match the concept's copy.**
- Hand-back: "Next: Case officer reviews your answers." has no "the" (concept §7: "Next: the Content reviewer signs…"; the button itself says "Hand back to the Case officer"). It also repeats the notice's own sentence just above it, "Your officer reviews your answers…" (`questionnaire.tsx:458`).
- Ready to file: the text says "Next: Representative (Sample) checks each form…" (the firm record's name), but the button says "Hand to the Representative (simulated)". Likewise "Second representative (Sample)" next to "the Second representative" (`readiness.tsx:93`).

**m6. The hand-off's tip is a `title` only, so a keyboard or touch user never sees it.** `hand-off.tsx:39`. Concept §7 asks for a tip "keyboard too": "You act as … in this tab. Use the person picker to come back." Focusing the button with Tab shows nothing.

No Blocker found.

## What held
- **`from` values.** These show no hand-back: user-A (Studio), user-P and user-Q (clients), user-Z (unknown), `%20user-O`, `user-o`, `user-O%00x`, `<script>` (encoded), no `from`. Text is escaped; there is no injection. user-O, user-R and user-T (same firm; user-T is not on the team but reaches the case) give a working hand-back to the case page.
- **`from` across navigation.** It survives Next between parts (part=2 → 3), Back, Forward and reload. The client's part page has no other link that drops it. It never leaks into the case page's address after the hand-back.
- **Case's own client.** Client B's case questionnaire address hands to Client B (`data-handoff-to=user-Q`); the family case hands to Client A. Firm staff opening the questionnaire address get a hand-off with their own id as `from`, not the address's. user-S (other firm) and user-A (BR-8 notice) on that address get no hand-off and no person change.
- **Modified clicks.** Ctrl, Shift, Alt and Meta clicks, middle and right click, Shift+Enter and Ctrl+Enter change nobody, move nowhere and open no tab. Enter and Space hand off. A double click on each of the three hand-offs ends as the intended person on the intended page, with no stray second action.
- **Round states (thin case).** Sent and under_review show "Sent for review (round N)" to user-O and user-T, and not to the representative themself. sent_back hides it for everyone. After a resend, round 2 is shown and goes to the new representative of record (user-T), hidden for user-T and shown for user-R. The target round page loads for the representative.
- **Solo firm.** On user-S's own case with a round sent, there is no representative hand-off; the client hand-off goes to Client A with `from=user-S`.
- **Rights (BR-5).** The server answers 404 to Client B on Client A's case, 403 to a client on a review round, 404 to user-S on another firm's round, and 403 to a client on the agent view. After a hand-off the client reaches no officer page's data (`/cases`, `/review`, `/representative-review`, another client's case).
- **Notice and person changes.** "Now: <name> (simulated)" appears exactly once per hand-off (client, back, representative). No person change happened other than by a hand-off button: Back after a hand-off changes nobody. `tests/check_bk4c.ts` passes 13/13 and `check_bk4a.ts` 22/22.
- **Widths and accessibility.** At 375, 400, 1024, and 720 px at 2× (200% of 1440): no sideways scroll; the words keep ≥ 272 px and the button wraps under them. axe finds 0 violations on all three hand-offs. Keyboard: the case hand-off is reached in 10 Tabs, with a visible focus ring.

## Not tested
- An older round still waiting while a newer round waits too (the code shows only the newest).
- The configured checkpoint itself (the builder's run covers it; the finished story was used here).
- `/link` with `?from=`, which is held by code only: `!link` at `questionnaire.tsx:458`, and `LinkApp` strips the query on entry.

**Verdict on 5a13935ede2d7721e36fb611e42fa473f8658f06: not ready to merge as is. There is 1 Major (M1, BR-2: the client hand-off always says the client is next) and 6 Minor. There is no Blocker, and rights hold on the server.**

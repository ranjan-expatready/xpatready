# BK-4c: case hand-offs — build notes

**Row:** BK-4c (concept `concept.md` §4, §5 "4c", §8, §10; approved by the tech lead at 2fa228923, rulings P-484; P-481). PR #1589, screens lane, cloud, 12 Nov 2026. Web only. **Stacked on BK-4a (#1580)**: it needs 4a's `setActor` notice, `plainClick`, `lib/simulated-people.ts` and `tests/check_bk4a.ts`'s allowed list. It does not need BK-3 PR 3 (#1570); both edit `runtime/cases.tsx` in different places.

## What a person sees
* **Case page (officer):** the Client questionnaire card reads "Next: Client A answers on their phone, for everyone travelling." with a secondary button **"Hand to Client A (simulated) →"**. The client comes from the case (Client B's case: Client B). The button opens the questionnaire as the client with `?from=<officer>`.
* **Questionnaire address opened by firm staff:** the same hand-off to the case's own client. It replaces "Act as Client A", which used a literal `user-P`.
* **Client, every part answered:** under "Every part is answered", "Next: Case officer reviews your answers." and **"Hand back to the Case officer (simulated) →"**, to the case page.
  * Shown only when `from` is a firm person.
  * Never on a person's own link, and not without `from`. A Studio person, an unknown id or a client in `from` shows nothing.
  * `from` stays while the client moves between parts.
* **Ready to file (officer):** while a review round waits (a filing sent or under review) and the representative of record is someone else, the panel shows "✓ Sent for review (round N) · Next: <representative> checks each form and approves it or sends it back." with **"Hand to the Representative (simulated) →"**, to that round.
  * It is worked out from the rounds, so it shows after a reload.
  * It does not show for the representative themself, or on a solo firm (where "Review now" already opens the review).
* **How it behaves:** one component (`runtime/hand-off.tsx`) changes the person, then moves. A Ctrl, Cmd, Shift or Alt click changes nobody (build notes 4a; BR-7). The frame's "Now: <name> (simulated)" notice follows (BK-4a).

## Files
`web/src/runtime/hand-off.tsx` (new), `runtime/cases.tsx`, `runtime/questionnaire.tsx`, `runtime/readiness.tsx`; tests: `check_bk4a.ts` (allowed list: `cases.tsx` 4 → 2, `hand-off.tsx` 1), new `check_bk4c.ts` (source, 4c's own scope `runtime/`), new `check_bk4c_browser.cjs`, `check_bk4a_browser.cjs` (one wait now looks for the hand-off).

## Build discoveries
1. **The questionnaire's part navigation dropped every search parameter** (`Sqr`'s `go` set `{part}` only), so the hand-back's `from` would be lost after the first part. It now keeps `from`.
2. **No checkpoint has a fully answered case except the finished story** (the configured family case: Client A 30 of 81 parts done). So the hand back is tested and walked on the finished story (90 of 90). On the configured checkpoint the client keeps answering and can return by the picker (BR-1 allows it). See the question below.
3. **C11.1's pack on the configured checkpoint fails in its own setup.** The server answers "IMM 5707 was removed from this combination" when the pack sets IMM 5707 to Online on Visitor visa's draft. On its scoring data (the six) it passes 17/17. The failure is a server refusal before any screen is read, so this web-only change is not its cause.

## Deviations
* A hand-off is a `Button` (BR-7). Its words are "Hand to <who> (simulated)", with "(simulated)" kept as BK-4a's frame links do. A modified click is ignored instead of opening a tab, since there is no link to open.

## Review and break round 1 (on 5a13935), fixed at 950c168
* **Break M1 (BR-2):** the case page's client hand-off showed in every state. It now says "Next: <client> answers…" only while the case has required questions not answered and no review round waits.
  * Every required question answered: a quieter line ("has answered every required question and can still check the answers"), with no "Next". The button is kept so the officer can still let the client check.
  * A round waiting: the card says the round is with the representative of record, and there is no button. There is never a second "Next".
* **Review m3 / break m1:** a hand-typed `?from=` of someone who did not hand over in this tab gives no hand back. The hand-off button records who handed the case's questionnaire to its client, per tab (`sessionStorage`), and the hand back shows only for that person. The client's view carries no case team, so this record is the proxy for "on this case's team".
* **Review m4 / break m4:** after Back, the officer page's notice for a client links back to the questionnaire with the recorded `from`.
* **Review m2 / break m6:** the tip is a Tooltip, so it also shows on keyboard focus.
* **Review m5 / break m5:** one way of naming people ("Next: the Representative checks…", "Next: the Case officer picks up from here."); no sentence repeated.
* **Break m3:** the person and the page now change in one React transition, so neither page shows to the wrong person for a frame.
* **Not fixed: break m2 (Minor).** If another session changes the representative, an open page hands to the old one until it reads the rounds again. That person lands on the round, where the server lets them only read (BR-5). A reload shows the new representative. Recorded as a known limit.

## Checks
See the PR body. US$0, live AI off.

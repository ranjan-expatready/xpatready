# B138 · C6.16 QA-359 (P-441): review of the fix

- **Reviewer:** a fresh session that did not build the fix (skills screen-review and journey-test, reviewer role).
- **Commit:** **b31ea790149835799df02ff6cafcda7007c53c3b** (PR #1453, branch `claude/determined-planck-ma697t`). The diff is `origin/main...b31ea7901`: 6 app files, +84/−25, no schema or migration file.
- **PR head:** the PR head is now 4bbb61de0. It adds only `qa/built/C6.16.md` (2 lines) and five screenshots, and changes no app file. This verdict is for b31ea7901.
- **Ruling:** P-441 (`lead/2026-11-07-lead31`), from P-412 F12 (b).

**Run** (isolated :4443, configured checkpoint, stopped after use):
- pack `acceptance/C6.16.test.ts`: **71/71**, exit 0
- `tests/check_c616_privacy.ts`: **47/47**
- my browser walk and API probes (scratchpad `walk.cjs`, `tb.mjs`, screenshots r1-r6)
- a unit mutation check in a throwaway worktree

**Journey score: 9/10** (`journey-test-reviewer-2026-11-09-qa359.md`). In the screen-review skill's terms: **Ship** (Minors to a follow-up row).

## Done-when, checked
1. **Resend goes to the staff's address, and the staff link stays live: met.** After staff re-address, Client A's Resend on the screen (keyboard) puts a second copy of the same token in the new inbox and nothing in the first. The link opens `live`, and no person_link row is added. Client A's line says where it goes: "The firm sent Sample Partner's link to n•••@example.com. Resend sends it there again; only the firm can change the address." The toast says "… again. It still works." Pack: C6.16-8 QA-359 ×4. Walk: journey 2, r2, r3.
2. **Client A still cannot choose or change the address: met.**
   - The first address gets 403, and so does any other address. Both use the new words.
   - No Send-to-another-address button is offered to Client A.
   - The full staff address is in neither Client A's page nor their privacy JSON. Masking also keeps a staff-chosen address from the principal, which matters if the new address is meant to be away from them.
   - The other C6.16 paths are unchanged: the pack's 1-7 and 9-12 pass as before. `sendRefusal` and the Resend target change only once a link has been accepted.
3. **Pack green on the configured checkpoint: met** (71/71).
4. **Under ~800 lines, no schema change: met.**

## Design and security judgement
- **"Does not end the staff's link":** the client's Resend re-delivers the staff's own email (same token) instead of minting a link that supersedes it. The alternatives are a second token (two open links per person, which breaks the one-open-link guard and index) or a new link at the staff address (which ends the staff's link, against P-441). Re-delivery is the only one of these that fits the ruling and the schema, so I accept it.
- **Who can deliver what where:**
  - Client A can only cause the email staff wrote to be sent again to the address staff set. They cannot choose its address or its content (`b.address` must equal the current address, and the email goes to `open.address`).
  - Once the staff link is dead, Client A's Resend sends a new link, still only to that address, never back to their first one.
  - Another client's persona gets 404, and staff behaviour is unchanged.
  - The row lock still holds under a race: three Resends at once give 201 ×3, 1 open link, live.
- **The gap:** see m3 (the demo inbox stand-in carries the token).

## Issues (none Blocker or Major)
**m1 (Should). Wrong "address given by" when Client A's Resend makes a new link at the staff's address.**
- **When:** after the staff link expired, was locked, or Client A took it back.
- **Evidence:** the officer row reads "Link sent 9 Nov to s•••@example.com (address given by Client A)". The history reads "… to s•••@example.com (address given by Client A)", for an address only staff gave and Client A never saw unmasked. Walk journeys 8-9.
- **Where:** `api/src/person-link.ts:163` (`addressGivenBy: actor.id`) and `:167`.
- **Why it matters:** BR-3's chip ("what the code proves") and BR-9's history should be true. Before the fix this path went to Client A's own address, so the line was true. The same pattern already existed for pre-acceptance resends of a staff address.
- **Fix:** when the address equals the newest link's address, carry that link's `addressGivenBy` into the new row and the history line. Add one pack assertion (Client A Take back → Resend → "address given by Case officer").

**m2 (Should). The same-link path ignores `idempotencyKey`.**
- **Evidence:** the same key sent twice gives 201 ×2 and **2** emails. Replay looks only at `person_link.send_key`, and the same-link path writes no row.
- **Where:** `person-link.ts:130-139`, `:152-160`.
- **Fix:** remember the key for this path too (for example on the `demo_message` or an audit key), or document that a same-link resend is not keyed.

**m3 (Should). The same-link resend reads the token-bearing email back out of `demo_message` (`person-link.ts:155-156`).**
- **Why it matters:** this works only because stand-in SI-20 keeps the sent email. With real email the server keeps only the token hash (BR-4), so the path would need a readable token or another design.
- **Fix:** record this in the build notes and with the SI-20 stand-in. Its 409 "cannot be sent again" branch is unreachable in practice, because the link email is deleted only when the link dies or is accepted, and both turn this path off.

## D1-D20 (the dimensions this fix touches; the others are as in `review.md`)
| D | Score | Evidence |
|---|---|---|
| D1 | 4 | P-441 behaviour exactly; m1 attribution on a side path |
| D2 | 4 | under the per-case and per-person row locks; race leaves one live link; m2 |
| D4 | 5 | one rule (`resendsSameLink`) used by both the screen's `resend` and the server's send |
| D5 | 4 | expired or dead staff link → new link to the same address; m2 retry |
| D6 | 4 | "sent the same link again … it still works" history line in the same transaction; m1 |
| D10 | 5 | where-line, toast and 403 in plain short sentences |
| D17, D20 | simulated only | no intended user walked it |
Others: no change. D7: N/A (no AI).

## BIC (this change's scope; 1440 = builder's `screenshots/qa359/01-05`, 1024/390/512 = my r1-r6)
| Check | Result | Evidence |
|---|---|---|
| BIC-11 one primary, named | Met | Resend and Take back only, secondary (r2, 02) |
| BIC-13 errors say what and how | Met | 403 "The firm sent … Only the firm can change the address." |
| BIC-14 help in place | Met | the where-line is visible text; the officer's Resend tip comes from `resendWords` |
| BIC-18 states | Met | same-link vs new-link words follow the server's `resend` (expired → "A new link …") |
| BIC-19 low load | Met | one muted line added to the existing card |
| BIC-20 accessible | Met | keyboard Resend; axe clean; 390 / 512 (200 %) / 1024 px, no sideways scroll |
| BIC-01-10, 12, 15-17 | N/A | not touched by this change |

## Code checks
- **Server authorisation:** unchanged (`reach(…,"answer")`).
- **Records:** no per-row requests, no migration. `sendRefusal`'s new `current` is optional, and its only caller passes it.
- **Do the rules' tests bite?** Yes:
  - removing `current` fails 2 unit checks
  - making `resendsSameLink` false fails 1 unit check
  - in the pack, r8e asserts `created:false`, the same token, `live` and the row count, so it would fail too.
- **Pack C6.16-8 "break m3":** replaced as P-441 directs, not weakened. The new assertions are stricter (inboxes, token, row count, history).

## Not checked
- A real screen reader.
- Real email.
- A real 14-day expiry (simulated in SQL).
- A server-side mutation run of the pack.
- `graph.mjs`: not run, because it rewrites `qa/GRAPH.md` and this change adds no page or route.
- PR CI: the draft head shows only the guard (success). The full check runs when the PR is marked ready.

**Verdict: Approve** (commit b31ea790149835799df02ff6cafcda7007c53c3b). No open Blocker or Major. Should-fix follow-ups: m1 (attribution), m2 (idempotency key on the same-link path), m3 (record the SI-20 dependence).

## Re-review 7998304dd (diff only, P-277)
**Scope:** `git diff b31ea7901..7998304dd`, new head **7998304dd5b507cab88e0d134330caeaa8dc1122**. It covers the breaker's M1, M2 and m1-m4 (`break-report-qa359.md`) and my earlier m1 and m2. App: 6 files, +38 lines against b31ea7901; against main +122/−31, still no schema file. The rest of the diff is notes and screenshots.

**Run** (fresh isolated copy :4443 started from a throwaway worktree at 7998304dd; configured checkpoint loaded in 102 s; copy stopped and worktree removed after):
- pack `acceptance/C6.16.test.ts`: **74/74**, exit 0
- `tests/check_c616_privacy.ts`: **48/48**
- `tests/check_c616_privacy_browser.cjs`: **50/50**
- my walk `walk2.cjs`: ui 10/10, api 6/6, races 2/2
- unit mutation: `resendKind` returning "new" for a dead staff link fails the M1 unit check (47/48).

**Fixes, each checked:**
- **M1 (firm only once the staff link is dead): fixed.**
  - Expired, locked (5 wrong codes), staff Take back, and Client A's own Take back each give 409 "The firm's link to n•••@example.com no longer works. Only the firm can send Sample Partner a new one." Nothing is sent to either address, and the list returns `kind: "firm"` with `resend_kept: false`.
  - On the screen, Resend is gone and "You can resend it" is dropped. The firm-only line shows instead. axe is clean, with no sideways scroll at 390, 512 (200 %) and 1024 px (my b2, b3).
  - Typing the first address is still 403.
  - The officer's one-press Resend then makes a new link at the staff address, and Client A's kind goes back to "same".
  - This 409 goes past P-441's literal words. It is the stricter reading of F12 (b) ("only staff send"), and I accept it. The tech lead should know that Client A's own Take back of the firm's link now leaves only the firm able to send.
- **M2, my earlier m1 (who gave the address): fixed.**
  - The officer's Resend of a link at a staff address records "address given by Case officer" (U4).
  - The officer's Resend of Client A's address keeps "Client A" (pack C6.16-8 M2).
  - The path I flagged (Client A Take back → Resend) is now refused (M1), so no false attribution can arise.
- **Races, breaker m1 and m2: fixed.**
  - Right code at the new address together with Client A's Resend, 8 trials: never a link email left on the accepted link, never a 500. 6 ran as "same" first, 2 as "new" after acceptance (the existing BR-3 path).
  - 5th wrong code together with Resend, 4 trials: locked, nothing left in the inbox.
  - The new `person_link … FOR UPDATE` takes locks in the opposite order to the right-code transaction (participant → link versus link → participant). A deadlock would come back as 409 "Busy" in words (`inTx`). None happened in 12 trials. Not a finding.
- **Breaker m3, my earlier m2 (repeat presses and the idempotency key): fixed.** The same key twice gives one copy. Ten presses at once give one copy and one "resent" history line. The firm's own email does not count.
- **Breaker m4 (toast follows the server's answer): fixed.**
- **My earlier m3 (depends on the demo inbox):** it goes to the tech lead as a PR question, as agreed. No code change was expected.

**New finding**
- **n1 (Minor, Should):** a second press of Resend within the minute sends nothing, but the toast still says "The firm's link was sent to Sample Partner at n•••@example.com again. It still works." (U2, my b1). The server answers `created: false` both when it sent a copy and when it held one back, so the screen cannot tell them apart. `api/src/person-link.ts` returns early on the held-back path; `web/src/runtime/privacy.tsx` `useResend` maps `created:false` to the "sent again" words. Fix: return a flag such as `sent: false` on the held-back path and say "It was sent less than a minute ago; nothing more was sent." This is harmless in effect, because an identical email went out seconds earlier.

**Journey re-score: 9.5/10.**
- Correct data: ½ → 1 (attribution right; dead staff link refused).
- Trust: ½ → 1 (the SI-20 point is handed to the tech lead).
- Feedback: 1 → ½ (n1).
- Everything else as before.

**Verdict: Approve** (commit 7998304dd5b507cab88e0d134330caeaa8dc1122). No open Blocker or Major. Should-fix follow-up: n1. My earlier m3 (SI-20) stays with the tech lead as the PR question.

# B138 · C6.16 QA-359: journey test (reviewer, 9 Nov 2026)

Reviewer role; this session did not build the fix. Commit **b31ea790149835799df02ff6cafcda7007c53c3b** (PR #1453), on an isolated copy on :4443 (`isolated.sh rv_q359 4443`, the configured checkpoint loaded in 111 s), stopped after use. Headless Chromium (`/opt/pw-browsers/chromium`). Live AI off, US$0, no priced button. My script and screenshots stay outside the repo: scratchpad `walk.cjs`, `tb.mjs`, `shots/r1-r6`. Each journey ran on a fresh case (Client A, Sample Partner aged 38). Setup was by API and is covered by the pack: Client A sends to `partner.*` (masked p•••) and Partner accepts with the right code, so privacy is on.

## Journeys (persona · goal · result)
1. **Case officer, 1440 px:** "Partner's address changed; send it there." Own links and privacy → Partner's row → **Send to a new address…**. The dialog says "A new address replaces it; the old link stops working". The officer types `newbox.*` (n•••) and presses **Send to the new address**. **Held:** the row reads "Link sent 9 Nov to n•••@example.com (address given by Case officer) · private from Client A". The new inbox has the link, and the first link is dead (r1).
2. **Main path. Client A, 1024 px, keyboard:** "Partner says they lost the email; send it again." Under About Sample Partner: "The firm sent Sample Partner's link to n•••@example.com. Resend sends it there again; only the firm can change the address." The only buttons are Resend and Take back (r2). Focus on Resend, then Enter. **Held:** the message reads "The firm's link was sent to Sample Partner at n•••@example.com again. It still works." (87 ms, r3). Data: the n••• inbox holds 2 copies of the **same** token, the p••• inbox holds 0, the link opens `live`, and there are still 2 person_link rows. The history line is "Client A sent the same link again … to n•••@example.com (address given by Case officer); it still works". The page was ready in 467 ms.
3. **Across the boundary. Partner, 390 px, a separate browser:** opens the n••• demo inbox (2 emails) and presses Open your link on the newest. **Held:** "Check it's you", so the link works (r4).
4. **Officer again:** **Held:** the row is unchanged ("Link sent … address given by Case officer"), and the officer's own Resend still sends a new link (`same_link: false`, pack C6.16-8).
5. **Screen sizes:** Client A at 390 px and at 512 px (200 % zoom) has no sideways scroll, and the where-line wraps cleanly (r6). axe found no WCAG A/AA violation at 1024 px. There were no page or console errors.
6. **Error. Client A by API, wrong address:** the first address p••• gets 403 and so does their own address. Both say "The firm sent Sample Partner's link to n•••@example.com. Only the firm can change the address." The staff address typed in capitals is accepted as the same link. Another client's persona gets 404 "No such case." Client A's page and privacy JSON never hold the full staff address.
7. **Recovery. Double press and race:** three Client A Resends at the same moment all get 201. One link stays open and it stays `live`. The same idempotency key sent twice delivers **2** emails (Minor below).
8. **Alternate. The staff link expired:** Client A's preview changes to "A new link to n•••; the earlier one stops working", and Resend makes a new link at n•••. That is right, but the row and history then say "**address given by Client A**" (Minor below).
9. **Alternate. Client A presses Take back on the firm's link, then Resend:** a new link at s••• (the staff's address), recorded again as "address given by Client A" (`tb.mjs`).

Automated replay: pack `acceptance/C6.16.test.ts` **71/71** on the configured checkpoint (exit 0); unit `tests/check_c616_privacy.ts` **47/47**; my walk 15/15 after two fixes to my own SQL. Mutation check (in a throwaway worktree): removing `current` from `sendRefusal` fails 2 unit checks, and making `resendsSameLink` always false fails 1. Both rules have tests that bite.

## Findings
| Sev | Finding | Evidence |
|---|---|---|
| Minor | When Client A's Resend makes a **new** link at the staff's address, it records "address given by Client A". This happens after the staff link expired, was locked, or after Client A's own Take back. Client A never saw that address unmasked. BR-3's chip ("what the code proves … address given by") and the BR-9 history are wrong for this path. Before the fix this path went to Client A's own address, so the attribution was true. The same pattern already existed before acceptance. | journeys 8-9; `api/src/person-link.ts:163` `addressGivenBy: actor.id` and `:167` "(address given by ${actor.name})" |
| Minor | The same-link path ignores `idempotencyKey`. A retried request with the same key sends a second email, although the contract says the key makes Send safe to retry. | journey 7; `person-link.ts:130-139` (replay looks only at `person_link.send_key`), `:152-160` |
| Minor | Re-sending "the same link" copies the token-bearing email body out of `demo_message` (`person-link.ts:155-156`). That works only because stand-in SI-20 keeps the sent email. With real email the server holds only the token hash (BR-4), so this path would need the token kept readable, or another design. This is not recorded in the build notes or with the SI-20 stand-in. | code read |

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | journeys 1-3: Client A's Resend reaches Partner at the staff's address and the link works |
| Next step obvious | 1 | the line says where Resend goes; only Resend and Take back are offered (r2, r6) |
| Plain words | 1 | where-line, toast and 403 are each one or two short sentences, with no jargon |
| Feedback and state | 1 | the toast says where it went and that it still works; the officer row stays true |
| Correct data | ½ | right link, right inbox, no new row, history line right; but "address given by Client A" on journeys 8-9 |
| Error recovery | 1 | refusals in words (403), expiry handled by a new link to the same address |
| Accessibility and screen sizes | 1 | keyboard Resend; axe clean; 390 / 512 (200 %) / 1024 / 1440 px with no sideways scroll |
| Speed | 1 | page 467 ms, Resend 87 ms |
| Visual quality | 1 | one muted line in the existing card, team Button and toast (r2, r6) |
| Trust and sources | ½ | masked addresses and who-gave-it shown, but wrong who-gave-it on journeys 8-9; the stand-in dependence is not recorded |
| **Total** | **9 / 10** | Pass (8 or more, no 0) |

Fixes that would raise the low criteria: keep the newest link's `addressGivenBy` when the client re-sends to the newest link's address (both the row and the history line), with one pack assertion; record the SI-20 dependence of the same-link resend.

## Not tested
- A real screen reader.
- An intended user's unaided walk (D17 and D20 stay with the founder).
- Real email delivery (stand-in SI-20).
- A real 14-day expiry: I simulated it by moving `expires_at` back in SQL.
- A server-side mutation run of the pack: only the unit checks were mutated.

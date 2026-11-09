# Gate A walk of C6.16 (an adult's privacy and "Send to …"), main 1d07807c8, 9 Nov 2026, ~16:44–17:00 UTC

Playwright with the image's Chrome, headless, deviceScaleFactor 2, one pass. Fresh isolated copy `qa_c616a` on :4472 (ttl 90; stopped by qa at the end: "database and files removed"). Three separate browser contexts: **Client A** (`user-P`, 390 px), **Partner** (390 px, **no simulated person**), and the **case officer** (`user-O`, 1440 px). Every press is a Playwright click or keyboard entry on what the page shows. The only API calls in the walk scripts are reads marked `[under]` in the logs (`walk/walk-log.txt`, `walk/walk-log-part2.txt`, `walk/walk-log-dialogs.txt`).

## Data
* Author (`user-A`), **Demo › Load the configured checkpoint… › Load the configured checkpoint**: "Configured checkpoint loaded in 133.0 s" (`walk/00`; `scripts/walk_c616_load.mjs`).
* Setup, not under test (`scripts/walk_c616_setup.mjs`, the same steps as the builder's `tests/check_c616_privacy_browser.cjs`): a new Visitor visa case `QA-C616-mw9i0e5c` (Release 6) for Client A, with Sample Partner (38), Sample Child 19 and Sample Child 10, and their dates of birth answered by staff. A first case (`QA-C616-mw9hxn7h`) was left after the walk script stopped on a wrong selector for the demo inbox (it has no `main`). That was qa's script, not the product; the case is not used below.

## C6.16 by screens
**A. Client A, 390 px (`walk/01`–`04`)**
1. Questionnaire: "Send to Sample Partner…" under About Sample Partner, and "Send to Sample Child 19…". There is none for Sample Child 10 (`01`).
2. Contact information for Sample Partner ("Answering for Sample Partner (spouse or partner)"): Client A types Partner's e-mail address `by.client.a.…@example.com` and presses Save and come back later (`02`).
3. Send to Sample Partner… opens a dialog: "Sample Partner gets a link and a code by email. Once they open it, you will see how far they have got, not their answers."
   * Send with an empty box: "There is a problem · Enter their email address." at the top and on the field (`03`).
   * "not an address": "Enter an email address like name@example.com."
   * A real address: the line reads "Sent to p•••@example.com on 9 Nov. Sample Partner has not opened it yet; you can still answer for them." with Resend, Send to another address… and Take back (`04`). Before acceptance the principal may still change the address (F12 (b) limits that to after acceptance).

**B. Partner, own browser, 390 px (`walk/05`–`13`)**
4. Demo inbox (stand-in SI-20): "Answer your own questions for your application (Sample) … Opening it sends nothing" (`05`). Open your link: "Check it's you · We will send a 6-digit code to p•••@example.com. Opening this page sent nothing." The address bar shows `/link`, with no token (`06`).
5. Send me a code. The inbox page then shows "Your code is 255 006. It works for 15 minutes." (`07`). A wrong code gets "There is a problem · That code is not right. You have 4 tries left." on the field too (`08`).
6. `[under]` Before the right code, Client A's questionnaire still carries Partner's e-mail (true): a mistyped address never locks Client A out (F12 (a)).
7. The right code, typed with a space, opens "Before you start · Your answers go to the firm handling this application. The person who started it will see how far you have got, not your answers. The firm can change this. **Unconfirmed: no counsel**" (`09`).
8. "Your questions": "0 of 26 parts done", About you, About your mother and father. No other person is named (`10`).
9. Contact information shows "Answered by Client A. Keep it as your answer, or change it above. [Confirm]" under the e-mail (`11`). **QA-358:** the part's header also says "Answered by the principal for Sample Partner: declared, it fills Sample Partner's forms now and is confirmed before filing (the officer's "Confirm section")." These are staff words on the adult's own page.
10. Confirm: "Confirmed: it is now your own answer." Partner types the city of their mailing address, `Privatetown…` (`12`), and presses Save and come back later. The part reads "Needs fixing" (`13`). That is right: underneath, the address has "Enter the street." and "Enter the country.", because qa typed only the city. `[under]` Staff see the private city (true).

**C. Client A again (`walk/14`, `15`)**
11. About Sample Partner now shows only "Sample Partner is answering on their own link · 0 of 26 parts done · last saved 9 Nov, 16:51 · Their answers are private to them and the firm." with buttons **Resend | Take back**. "Send to another address…" is gone after acceptance (F12 (b)). Neither of Partner's values is anywhere in the page's HTML (`14`).
12. Wrong part by URL (`?part=43`, Partner's Contact information before): the numbering now has 74 parts, and part 43 is Sample Child 19's. Partner's parts cannot be reached (`15`). `[under]` Client A's questionnaire API carries neither value.

**D. Case officer, 1440 px (`walk/16`–`21`)**
13. "Own links and privacy" (`16`):
    * Partner: "Private from Client A · Since 9 Nov · the person on their own link: Switched on when the person first entered the right code… answered on the link sent to p•••@example.com (address given by Client A)", with Resend, Send to a new address… and Take back….
    * Child 19: Send… and Keep private….
    * Child 10: "under 18: … no own link and no privacy tick (the age is Sample; Unconfirmed: no counsel)".
14. Take back… with no reason is refused on the field: "Say why the link is taken back (at least 5 characters)." (`17`, retaken as a viewport shot, then cancelled). With a reason, the row reads "Taken back 9 Nov · **still private from Client A**" (`18`).
15. Client A after the take back: still progress only. "The link was taken back on 9 Nov. You can resend it to p•••@example.com, or ask the firm." The only button is **Resend** (`19`). F12 (a): privacy stays on after take back.
16. Partner's page: "This link no longer works · This link was taken back on 9 Nov. Ask whoever sent it for a new one." No one is named (`20`).
17. F12 (b): Send to a new address… (staff) says "Sample Partner already answers on p•••@example.com. A new address replaces it; the old link stops working". Empty is refused (`21`). Sent: "Link sent 9 Nov to p•••@example.com (address given by Case officer) · private from Client A". `[under]` A link message is in the new address's inbox.

**F. The staff tick path of F12 (a) (`walk/23`–`25`)**
18. Client A first answers Child 19's e-mail. The officer's Keep private… on Child 19 with no reason: "Say why this person's answers are kept private (at least 5 characters)." (`23`, retaken on a fourth adult, Sample Child 22, then cancelled). With a reason, the row reads "Private from Client A · Since 9 Nov · Case officer: <reason>" (`24`).
19. Client A's card for Child 19 shows progress only and no buttons. `[under]` The value is gone from Client A's API. **QA-357:** the card says "**Sample Child 19 is answering on their own link**", but no link was ever sent (`25`).

## Next capability's first step: C7.1, a copy of Partner's form made from Partner's own answers (`walk/26`, `27`)
20. Case page › Prepare application › "IMM 5257 for Sample Partner": "Declared or confirmed answers for 4 of 166 form fields; 9 answered but needing a fix stay blank" (`26`). Generate a copy gives "Generated · Copy of 9 Nov, 16:53 · 4 form fields written · read back and checked · Download" (`27`).
21. `[under]` (`api-partner-imm5257-copy.json`): status GENERATED, intact, written 4. The PDF's XFA data has `Email = by.client.a.…@example.com`: the answer Client A gave and Partner confirmed on their own link fills Partner's form. It also has Partner's date of birth. The incomplete private address is not written, as the rule for answers needing a fix says.
22. Page errors and 5xx answers during the walk: none.

## Underneath, after the walk (`probe-client-reads.txt`, `scripts/probe_c616_client_reads.mjs`)
Every GET route under `/runtime/cases/:id` in the controllers (19 without a sub-id) was called as Client A and as the officer. The probe looked for Partner's e-mail, Partner's private city, Child 19's e-mail and the officer-given new address.
* Client A: 200 with none of them on `cases/:id`, `people/privacy`, `questionnaire` and `questionnaire?mode=pqr`. Every other route is 403, `?mode=agent` included.
* The officer's questionnaire carries all three answers.

## Not covered
* One headless pass. No headed walk, and the shared demo (:4400) was not walked (no demo runs in this cloud copy).
* Client A at 390 px, and the officer at 1440 px only. 1024 px, keyboard-only, 200% zoom and axe are not qa's own walk; the builder's `check_c616_privacy_browser.cjs` covers them and was re-run on this copy: 50/50, exit 0 (`check_c616_privacy_browser-output.txt`).
* Not walked:
  * the 5-wrong-codes lock and the 15-minute expiry (pack C6.16-2, -11);
  * Client A's own Take back;
  * Make principal (C6.13) with a link;
  * a correction to a minor (pack C6.16-13).

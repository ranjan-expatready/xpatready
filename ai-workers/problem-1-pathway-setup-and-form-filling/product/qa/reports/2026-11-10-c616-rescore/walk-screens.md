# C6.16 re-score after #1453 (QA-359 fix, P-441): gate A walk by screens, main df52c9fc6, 9 Nov 2026 ~21:33–21:35 UTC (10 Nov ~03:05 IST)

Main's head is df52c9fc6: #1453 merged as a487d2c81, then #1262 (B139, C6.17). Records branch `claude/qa-2026-11-09-c616` with origin/main merged (b605b2c6d, records only).

**Copy.** Playwright with the image's Chrome, headless, deviceScaleFactor 2, one pass. Fresh isolated copy `qa_c616r` on :4472 (ttl 90; stopped by qa: "database and files removed").

**Browsers.** Three separate browser contexts:
* **Client A** (`user-P`), 390 px;
* **Partner**, 390 px, **no simulated person**: one browser for the first link, a second, new browser for the re-entry;
* **the case officer** (`user-O`), **1024 px**.

**Presses and reads.** Every press is a Playwright click or keyboard entry on what the page shows. API calls are reads marked `[under]` in `walk/walk-log.txt`. Script: `scripts/walk_c616_qa359.mjs`.

## Data
* Author: **Demo › Load the configured checkpoint**, "Configured checkpoint loaded in 129.5 s" (`walk/00`; `scripts/walk_c616_load.mjs`).
* Setup, not under test (`scripts/walk_c616_setup.mjs`, as on 9 Nov). Case `QA-C616-mw9s40ui` on Release 6: Client A, Sample Partner (38), a child of 19 and a child of 10, with their dates of birth answered (`walk/case.json`).

## Walk
1. **Client A sends to address A.** Client A answers Partner's e-mail (Contact information), then Send to Sample Partner… → address A (`partner.<run>@…`). The card reads "Sent to p•••@example.com … Resend · Send to another address… · Take back" (`01`).
2. **Partner enters on link A.**
   * Partner, in their own browser, uses the inbox page → Open your link → Check it's you → Send me a code → the code read on the inbox page, typed with a dash (`02`).
   * Consent is marked "Unconfirmed: no counsel" (`03`). "Your questions": 0 of 26 (`04`).
   * Partner confirms Client A's e-mail and types a private street name, `Privatestreet<run>`, then Save and come back later.
3. **The officer re-addresses (1024 px).**
   * Before: "With Sample Partner since 9 Nov · private from Client A · answered on the link sent to p•••@example.com (address given by Client A)" (`05`).
   * Send to a new address… → B (`new.partner.<run>@…`) (`06`). After: "Link sent 9 Nov to **n•••@example.com (address given by Case officer)** · private from Client A" (`07`).
   * `[under]` Link emails: A 0 (deleted at the first right code, by design), B 1.
4. **QA-359 retest: Client A's Resend.**
   * Client A's card now says: "**The firm sent Sample Partner's link to n•••@example.com. Resend sends it there again; only the firm can change the address.**" The buttons are only **Resend | Take back** (`08`).
   * Resend shows the toast "**The firm's link was sent to Sample Partner at n•••@example.com again. It still works.**" (`09`).
   * `[under]` Link emails at A: 0 → **0**. At B: 1 → **2**, the same link both times.
   * `[under]` The officer's list: state sent, given by Case officer, n•••. Staff's own Resend is `kind: new`.
5. **Re-entry on the resent link (the 9 Nov verdict's gap).**
   * Partner, in a **new browser**, opens the newest email at B → Check it's you ("We will send a 6-digit code to n•••@example.com") → code → consent again (`10`, `11`) → "Your questions", their own parts only, no one else named (`12`).
   * Contact information still holds their private street (`13`).
   * Partner's first browser (link A) now reads "This link no longer works · This link was replaced by a newer one sent on 9 Nov. Use the newest email." (`14`).
6. **Client A's own Take back (the 9 Nov verdict's gap).**
   * Client A's card shows progress only, and neither value is in the page HTML.
   * Take back opens "Take back Sample Partner's link? Sample Partner's link stops working now. Their answers stay private. Nothing else changes." (`15`). After it, the card reads "The link was taken back on 9 Nov. You can resend it to n•••@example.com, or ask the firm. [Resend]" (`16`): the firm's address, not A.
   * Partner's page: "This link was taken back on 9 Nov. Ask whoever sent it for a new one." (`17`).
   * `[under]` Client A's API carries neither value.
   * The officer's row: "Taken back 9 Nov · still private from Client A · … (address given by Case officer)" (`18`). It still shows the adult's words "Ask whoever sent it for a new one." (QA-360 (1), still open).
7. **Next capability's first step, C7.1, at 1024 px.**
   * "IMM 5257 for Sample Partner" → Generate a copy → "Generated · Copy of 9 Nov, 21:34 · 4 form fields written · read back and checked" (`19`).
   * `[under]` Person Sample Partner, status GENERATED, intact, written 4 (`walk-log.txt` line 7).
8. Page errors and 5xx answers during the walk: none.

## Underneath, after the walk
* **Probe** (`probe-client-reads.txt`). Every GET route under `/runtime/cases/:id` without a sub-id, 21 now, called as Client A and as the officer. Client A: no response carries Partner's e-mail or private street; the officer's questionnaire carries both.
* **Builder's browser journey**, re-run on this copy: 50/50, exit 0 (`check_c616_privacy_browser-output.txt`).

## Not covered
* One headless pass. No headed walk, and the shared demo (:4400) was not walked.
* No 1440 px this round (9 Nov walked the officer at 1440 px).
* QA-357, QA-358 and QA-360 were not in #1453's scope. Their checks still fail (`check_qa357_qa358-output.txt`, 0/3), and walk/18 still shows QA-360 (1).
* The XFA values of the C7.1 copy were not re-read: 9 Nov showed `Email` written from Partner's confirmed answer.

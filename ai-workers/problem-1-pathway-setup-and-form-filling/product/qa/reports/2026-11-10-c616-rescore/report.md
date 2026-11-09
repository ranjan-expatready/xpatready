# qa re-score of C6.16 after #1453 (QA-359 fix, P-441), main df52c9fc6, 10 Nov 2026 (~03:05 IST)

**Verdict (fresh Opus reader that ran nothing, P-303; `verdict.md`): gate A PASS · C6.16 Partial, ready for Works: all green except P-339 (no GitHub run id) · QA-359 fixed and closed.** US$0, live AI off. Asked by the tech lead, Lead 5 (series 2). Records branch `claude/qa-2026-11-09-c616` (#1452), with origin/main merged twice (keeping both sides).

## Runs
* **GitHub's runners: none yet.** Cloud lanes get 403 when they dispatch. **Question 1** asks for `nightly.yml` with capabilities=C6.16 and data=checkpoint.
* **Local stand-in, not a P-339 run:** `gate-b.mjs`, GATE_B_DATA=checkpoint, on a fresh isolated copy in this cloud container (main df52c9fc6): "C6.16.test.ts on the checkpoint: exit 0, **74/74** passed", "Gate B: passed", exit 0 (`local-gateb-C6.16-df52c9fc6.txt`). The pack grew from 68 to 74 with #1453's QA-359 steps.
* The pack run directly on the walk copy: 74/74, exit 0 (`pack-C6.16-steps-checkpoint.txt`; QA-359 steps at lines 41–48).
* The builder's browser journey on the walk copy: 50/50, exit 0 (`check_c616_privacy_browser-output.txt`).

## QA-359: fixed, closed
* **Its check** `tests/qa/check_qa359_resend_after_staff_readdress.cjs`: **2/2** (it was 1/2 on 1d07807c8).
* **By screens:**
  * Client A's card says "The firm sent Sample Partner's link to n•••@example.com. Resend sends it there again; only the firm can change the address." (`walk/08`).
  * Resend's toast: "The firm's link was sent to Sample Partner at n•••@example.com again. It still works." (`09`).
  * Underneath: link emails at the first address 0 → 0, at the staff's 1 → 2 (the same link).
  * Partner re-enters on that email in a new browser, sees their own parts only, and their private answer is kept (`10`–`13`).
* **Matches** P-441 as the builder's note words it, and F12 (b).
* Client A typing the first address is refused (403, in words) by the pack only: the screen offers no address field.
* Moved word for word to `history/qa-bugs-closed-2026-11-10.md`.

## Gate A by screens (`walk-screens.md`, `walk/00`–`19`)
The checkpoint was loaded through Demo › Load the configured checkpoint. The case setup was by script, not under test.
* Client A (390 px) sends to address A; Partner enters there and answers privately.
* The officer, at **1024 px**, sends Partner's link to a new address B. The row says "address given by Case officer".
* Client A's Resend goes to B. **Re-entry:** Partner comes back in on B.
* **Client A's own Take back:** privacy stays on, and the dead-link page names no one.
* **On to C7.1's first step:** Generate a copy of Partner's IMM 5257 reads "4 form fields written · read back and checked" (intact).
* Errors and 5xx: none.
* **Underneath:** Client A's reads on 22 case routes carry no private value (`probe-client-reads.txt`).
* **Closed since 9 Nov** (the reader's list): Resend → re-entry, Client A's own Take back, 1024 px.
* **Still missing:**
  * the GitHub run;
  * Partner saving a new answer after re-entry;
  * Client A taking back an unaccepted firm link (QA-369);
  * Client A at 1024 px, a headed pass, and the shared demo;
  * the XFA values of the C7.1 copy were not re-read (9 Nov read `Email`).

## Bugs: 0 Blocker · 0 Critical · 0 Major open on C6.16 (QA-359 closed) · 5 Minor open (2 new)
* **QA-357, QA-358 (UX · Minor):** still open. Their check fails 0/3 (`check_qa357_qa358-output.txt`), and `walk/16` still shows "is answering on their own link" above "The link was taken back".
* **QA-360 (UX · Minor):** still open, now widened. (1) shows on `walk/18`. (2), the identical masks, is now also on Client A's "where Resend goes" line. qa's new address started with "n", which hid it; the pack's two addresses both read p•••.
* **QA-368 · UX · Minor, new.** Found by the reader from the code and the log; not pressed by screens.
  * Once Partner accepts the firm's link, Client A's Resend turns "new". The "where Resend goes" line goes away.
  * One press then supersedes Partner's working link and ends their session, with no words and no confirm.
  * Not a regression: 9 Nov's kept-address Resend did the same.
* **QA-369 · Ambiguity · Minor, new, for the founder:** may Client A take back the link the firm sent to a new address, before the adult accepts it?
  * Nothing is disclosed, but it cuts the channel the firm chose.
  * Neither the walk nor the pack covers it.

## What moves C6.16 to Works
1. A green `nightly.yml` run (capabilities=C6.16, data=checkpoint) on main's head, with its run id in the row (P-339). No open Major or worse names C6.16, so gate B no longer holds C6.16 product PRs.
2. **Records:** P-412 (F12) and P-441 go in DECISIONS.md (main stops at P-411), and STATE row F12 is closed.

## Coverage, graph, suites
Not run for this row (no c8, no `graph.mjs`, no full suite rerun).

## Questions for the Lead
1. Please dispatch `nightly.yml` on main (head df52c9fc6 or later; #1453 is a487d2c81) with capabilities=C6.16 and data=checkpoint, so the run id goes in the row (P-339).
2. QA-369, for the founder: is taking back the firm's unaccepted link the principal's to do (as built), or staff's only?
3. Records: P-412 and P-441 are not in DECISIONS.md on main, and STATE F12 still reads "open".

## Suggestions
* Pack: a step for Client A's take back of the firm's link before acceptance, whatever the founder rules (*Needed for the proof*, *Capability*).
* Pack or browser check: Client A's Resend after the firm's link is accepted (QA-368) (*Later*, *Capability*).

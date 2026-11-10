# qa capability C6.16: an adult's privacy and "Send to …" (row B138, #1257), main 1d07807c8, 9 Nov 2026

**Verdict (fresh Opus reader that ran nothing, P-303; `verdict.md`): gate A PASS with limits · C6.16 Partial (was Not built). Not Works: no GitHub run id (P-339), and one new Major (QA-359, a Conflict for the founder).** US$0, live AI off. The founder's decisions under test: P-412 F12 (a) and (b).

## Runs
* **GitHub's runners: none.** No nightly run has ever run C6.16's pack, records PRs skip gate B, and cloud lanes get 403 when they dispatch Actions. **Question 1.**
* **Local stand-in, not a P-339 run.** `studio/tools/gate-b.mjs`, GATE_B_DATA=checkpoint, on a fresh isolated copy in this cloud container on main 1d07807c8: "C6.16.test.ts on the checkpoint: exit 0, **68/68** passed (147 s: copy 10, Load the configured checkpoint 128, run 9)", "Gate B: passed", exit 0 (`local-gateb-C6.16-1d07807c8.txt`).
* The same pack run directly on qa's walk copy, after Demo › Load the configured checkpoint: 68/68, exit 0, every step line in `pack-C6.16-steps-checkpoint.txt`.
* The builder's browser journey `tests/check_c616_privacy_browser.cjs`, re-run on the same copy: "50/50 passed", exit 0 seen by qa's shell (`check_c616_privacy_browser-output.txt`). It covers keyboard only, 200% zoom and axe at 390, 1440, 320, 720 and 512 px. There is no 1024 px viewport.
* The data the verdict counts on is the configured checkpoint (P-322: a case-step row), the same data as C6.13, C6.14 and C6.15.

## Gate A by screens (`walk-screens.md`, `walk/00`–`27`)
Fresh copy `qa_c616a` (:4472, ttl 90, stopped by qa). The checkpoint was loaded through **Demo › Load the configured checkpoint** (133.0 s). The case setup was by script and is not under test: a Visitor visa case for Client A with Partner (38), a child of 19 and a child of 10, dates of birth answered.
* **Client A (390 px):**
  * "Send to Sample Partner…" and "Send to Sample Child 19…" show; there is none for the child of 10.
  * Client A answers Partner's e-mail address.
  * Send refuses an empty address and "not an address" on the field and in a summary.
  * After the send: "Sent to p•••@example.com … has not opened it yet; you can still answer for them".
* **Partner, own browser, no simulated person:**
  * The demo inbox (SI-20) leads to "Check it's you", with no token in the address bar. "Send me a code" works, and a wrong code gets "4 tries left" on the field.
  * The right code, typed with a space, opens the consent card, marked **Unconfirmed: no counsel**. "Your questions" names no one else.
  * Confirm on Client A's answer gives "Confirmed: it is now your own answer". Partner then types a private city.
* **Client A after acceptance:**
  * Partner's card shows progress only. Neither value is on the page, and Client A has Resend and Take back but no "Send to another address".
  * Client A's 19 case GET routes (sub-id routes excluded) carry no private value (`probe-client-reads.txt`).
* **The case officer (1440 px):**
  * "Own links and privacy" says what the code proved and who gave the address.
  * Take back needs a reason, then reads "Taken back · still private from Client A". Client A still sees progress only, and Partner's page says why without naming anyone.
  * Send to a new address and Keep private… on the child of 19 (with a reason) both work. Client A then sees only progress for the child of 19.
* **Next capability's first step (C7.1):** Prepare application › "IMM 5257 for Sample Partner" › Generate a copy reads "4 form fields written · read back and checked". The copy's XFA data holds `Email`, the answer Partner confirmed on their own link, and Partner's date of birth. The incomplete private address stays blank, by the rule for answers needing a fix. The next step can use the output.
* **Limits (the reader's):**
  * No Resend was pressed by screens, and Partner never came back in on a resent or re-addressed link. Client A's own Take back was not walked.
  * The setup was by script. One headless pass, no headed walk, and the shared demo (:4400) was not walked.
  * The value that reached C7.1 is Client A's answer that Partner confirmed, not one Partner typed.

## F12 (P-412)
* **(a) Met.** Privacy is off before the right code: Client A still reads Partner's answer. It turns on at the first right code, or at a staff tick with a reason. It stays on after take back, and there is no untick: the database refuses one (pack C6.16-9), and the dialog says "It stays on (no untick yet)".
* **(b) Met as worded.** After acceptance Client A has no new-address option; the API answers 403 in words (C6.16-8 B1). Staff can send to a new address.
* **QA-359:** after a staff re-address, Client A's Resend goes back to the old address.

## Bugs (0 Blocker · 0 Critical · 1 Major · 3 Minor, all new)
* **QA-359 · Conflict · Major (for the founder): after staff send an accepted adult's link to a new address, Client A's one-press Resend sends it back to the old address and kills the staff's link.**
  * Reproduced on a fresh copy: Resend gives 201, a new link email reaches the old address, and the staff link is dead (`check_qa359-output.txt`).
  * The pack asserts this as intended (C6.16-8 "break m3", `acceptance/C6.16.test.ts:183-184`). It was the builder's fix for the breaker's m3, where Resend failed in this state.
  * Staff re-address precisely when the old mailbox is not the adult's alone. In one click Client A can undo that and receive the code, which reopens challenge B1, the risk Q2 / F12 (b) closed.
  * Recommendation (the reader's, and qa agrees): after a staff re-address, "the kept address" is the staff's new address.
  * Check: `tests/qa/check_qa359_resend_after_staff_readdress.cjs` (1/2 today).
* **QA-357 · UX · Minor:** Client A's card always says "<person> is answering on their own link". This is false after a staff tick with no link sent (`walk/25`), and after a take back (`walk/19`). Cause: `privacy.tsx:42`.
* **QA-358 · UX · Minor:** the adult's own part shows staff words: "… is confirmed before filing (the officer's "Confirm section")" (`walk/11`). B138's reviewer already noted this as known (review.md:134,136); it is now a row.
* QA-357 and QA-358 share one check, `tests/qa/check_qa357_qa358_c616_words.cjs`: 0/3 on a checkpoint copy today.
* **QA-360 · UX · Minor:** the officer's row after a take back says the adult's words, "Ask whoever sent it for a new one." The old and new addresses also mask the same (`p•••@example.com`), so staff cannot check a re-address on the page (`walk/18`, `21`).
* Not logged as rows:
  * The info label "<person> answers their own questions" beside Send shows while Client A still answers for them. It is a tooltip label for what Send does; qa judges it fine.
  * A possible leftover error toast after a successful send could not be confirmed from a full-page shot.
  * The minors that #1257's body lists as open, not re-tested by qa: `x-actor: client` past the inbox's 403; the share-lock re-read covers answers only; dead-link dates in UTC; graph G3; the link reads "accepted" after a correction to a minor until its next use.
  * The demo inbox residual: with no persona, Resend plus the inbox opens Partner's answers. This is the SI-20 stand-in's own limit (Question 2).

## What moves C6.16 to Works (reader, all four)
1. The founder rules on QA-359 ("kept address" after a staff re-address). Then a fix with a pack step that inverts C6.16-8 "break m3", or the row closes as intended.
2. P-412 F12 is recorded in DECISIONS.md, and STATE row F12 is closed. Main's DECISIONS.md stops at P-411, and STATE F12 still reads "open".
3. A screens walk on the checkpoint: Resend → the adult opens the new link → code → back in their own parts, still private; and Client A's own Take back.
4. A green `nightly.yml` run (capabilities=C6.16, data=checkpoint) on main's head, with its run id in the row.

## Coverage, graph, suites
Not run for this row: no c8, no `graph.mjs`, no full suite rerun. This capability round covered the pack, gate A, the browser journey re-run, the client-read probe and the new checks.

## Questions for the Lead
1. **Please dispatch `nightly.yml` on main with capabilities=C6.16 and data=checkpoint.** This cloud qa lane gets 403. Ideally do it after QA-359 is ruled on and, if needed, fixed, so the run id can go in the row (P-339).
2. **QA-359 for the founder:** after staff send an accepted adult's link to a new address, should Client A's Resend go to the staff's new address (recommended), or stay as built (to the address Client A first gave)?
3. **Records:**
   * P-412 is missing from DECISIONS.md on main.
   * SI-20 (email → demo inbox) and SI-21 (the adult's own sign-in) are not in STAND-INS.md; the chips still read "proposed".
   * The demo inbox residual (break report round 2) has no recorded decision.

   May qa cite P-412 from #1257's body until then?

## Suggestions
* Pack C6.16-8: invert "break m3" once QA-359 is ruled on (*Needed for the proof*, *Capability*).
* Pack or browser check: a Resend → re-entry step on a resent link, and Client A's own Take back, by screens (*Needed for the proof*, *Capability*).
* The browser check: add a 1024 px pass (*Later*, *Scaffolding*).

# C7.6 B2 — break report (Ready to file panel, PR #1171)

The code tested is commit 804c04430. HEAD later moved to 43ecdeecd, but that commit adds only the reviewer's records, so the
code is the same. The copy ran on its own port: isolated `bk_b2` on :4435, the configured checkpoint, loaded by the
builder's walk (`tests/check_c76_ready_browser.ts`, **46/46**). Playwright drove the screens and the API was called
directly. The test cases were Visitor visa cases a–e (representative of record user-R, case officer user-O), a solo-firm
case (user-S) and a 6-person family case. Scope: the readiness panel and its seam with the server (BR-8, BR-11 only).
Live AI was off and no priced button was pressed. The copy was stopped at the end.

## Findings

**F1 — Major. A refusal of "Ready to file" from a stale tab is wiped from the screen at once.**
* What I did: tabs A and B as user-O; passed a warning in A; in B (still listing it) pressed Ready to file.
* Expected: the server's 409 detail and lines stay on screen (BR-11). Actual: "Not ready to file — 6 open warnings … stand before Ready to file." shows for about 200 ms, then disappears.
  No toast is left, and focus is on `<body>`. The click looks as if nothing happened.
* Cause: `ready()` sets the notice and then refreshes (readiness.tsx:88–90). The refresh changes `openKey`, and the effect
  at :78–79 clears the notice. A pressed Ready to file leaves the notice standing only when the tab was already fresh
  (seen with tab A). The N3 refusal ("Something changed while this filing was being marked…") goes the same way, because
  its lines change too.

**F2 — Major. After a "changed after you read it" 409, a second press of Confirm reviews facts the representative never reloaded.**
* What I did: user-R opened Review the filing; a fact was then changed (`person.national_id_number`). First Confirm: 409 "This filing changed after you read it. Reload and review it again." The form stays open.
* Second press, with no reload: 200, and the filing is stored as reviewed for the new facts.
* Cause: the 409 refetches /prepare (:219), and the form sends `facts_hash` from the live `r` prop (:210), not from what
  was on screen when the form opened. The server's N1 guard ("never stamped as reviewed for facts nobody saw") is
  bypassed by the screen. Any refresh of the case view while the form is open (an answer saved on the same page also
  invalidates it) swaps in the new fingerprint silently.

**F3 — Minor. Focus is lost after every refusal that is not tied to a field.**
* After a Ready to file refusal (fresh tab too), a stale pass 409, a review 409 or 403, focus ends on `<body>`.
* Cause: the busy button becomes disabled (controls.tsx:36). `focusLater` then targets a `<p role="alert">` that
  cannot take focus (:171, :220), and `ready()` does not move focus at all on a 409 (:86–90).
* What held: field errors (400) correctly put focus on the textarea or the checkbox.

**F4 — Minor. A stale pass 409 leaves no trace on the screen.**
* Passing the same line in a second tab: "There is no open … warning … Reload." flashes. The refetch then removes the line, and its form and the
  message unmount with it (the line is keyed by code|key, :129). Nothing tells the user that someone else passed it.
* Same cause, found by reading the code (not run): a reason being typed is lost silently whenever the line's key
  changes underneath it, for example a `missing_facts` line after another fact is confirmed.

**F5 — Minor. The panel keeps showing "Review the filing" to someone who is no longer the representative of record.**
* user-R opened the review form; the representative was changed to user-T (PUT …/team/representative). Confirm returns 403, and the form shows it. But only a 409 refetches (:219), so after Cancel user-R still sees
  "Review the filing" until a reload. The server refuses every attempt, so no permission leaks.

**F6 — Minor. "Review the filing" disappears once anyone passes the review warning, though the server still accepts a review.**
* After user-O passed `representative_review` with a reason, user-R no longer has a Review button, because it shows only while that warning is open (:101, :108). A
  review sent through the API was still accepted (200, "Reviewed by …"). The representative has no way left on screen
  to record their own review.

**F7 — Minor. Some panel words are the screen's own, not the server's.**
* The count line `standing()` (:36–39), for example "6 open warnings stand before Ready to file.", is the screen's
  sentence. For the same state the server's 409 says "6 open warnings (pass each with a reason, or fix them) stand
  before Ready to file." (api/src/readiness.ts:117).
* "Prepared by · Reviewed by: {current officers}" (:135) is the screen's guess from today's officer list. The server
  returns only who reviewed; R2 records that "who prepared it" is not built.
* The severity tag "Critical warning" (:32) sits next to server words that already begin "CRITICAL:", so it is said twice.

**F8 — Minor. Escape does not close the pass or review form (:183, :225).** The concept's keyboard line asks for
"Esc closes". Cancel works, and it returns focus to the button that opened the form.

**F9 — Minor (polish). The reason box accepts 400 characters (:185), but the server allows 300.** A 450-character paste
is cut to 400 without notice, then refused with "Keep it to 300 characters." Nothing wrong is ever stored, and there is
no counter.

**F10 — Minor (speed). The case page reads /prepare twice on each load and after each invalidation.** The panel's query
key includes the actor (:45); the Submission panel's does not (submission.tsx:50). On the 6-person case: /prepare took
about 230 ms, and the page showed its first filing after 1.1 s with 4 filings and 26 lines.

## What held
* **Roles on screen:** only the representative of record (user-R, and user-T once made representative) sees "Review
  the filing"; user-O, and user-T while not the representative, do not. user-S (solo firm) gets "This case could not be
  opened" (404). Clients user-P and user-Q get the client notice, no panel. user-A, user-B and user-C are switched to
  "Case officer" by the app's area switch and see only what the case officer sees.
* **Roles on the API:** review by user-O or user-T: 403. Clients, user-A and user-B on review, pass, ready and /prepare:
  403. user-S: 404. Pass and Ready to file are open to staff of the case's firm, per the settled ruling.
* **Reasons:** empty, spaces, "1234", "....", five emoji, a zero-width space (U+200B), a control character (BEL), a
  right-to-left override (U+202E) and 301 characters are each refused on the field, in the server's words.
  `aria-invalid` is set, focus stays in the field and nothing is stored. "ठीक है" is refused too; that is the server
  rule already recorded as R3, not new here.
* **Double click on Pass:** exactly one pass row is stored.
* **Layout:** a 300-character reason with no spaces, mixed with Japanese, wraps at 1024 px, at 512 px with
  deviceScaleFactor 2 (200 % zoom of 1024) and at 640 px with deviceScaleFactor 2. No page scrolls sideways.
* **A fact changed after the review:** the reopened line has the same words on screen as in /prepare ("The filing
  changed after it was reviewed on …"). The reviewed line goes and "Review the filing" comes back.
* **Ready to file, then a fact changed:** after a reload, both the screen and /prepare say Not started, with the same
  lines. The same page refreshes through the shared `["runtime","view",case]` key (seen in the code). A tab that is
  not reloaded keeps showing "Ready to file" without the button until it reloads; there is no polling, by design.
* **Submitted filing:** the panel is read-only. It shows "Recorded as submitted…", has no buttons, and keeps the
  passed list collapsed. Pass, review and ready all get 409.
* **Solo self-review:** the first Confirm brings up the checkbox with its error and puts focus on it. After the box is
  ticked, the panel and the server both say "Self-reviewed by Solo representative (Sample) (licence R000001)".
* **Keyboard:** Tab goes heading → Review → Ready to file → each "Pass with a reason…" in owner order. The review form
  tabs Note → Confirm → Cancel. Cancel returns focus to its opener. A successful pass, review or Ready to file puts
  focus on the filing's heading (builder's walk).
* **Status words** are the same as /prepare and the Submission panel in every state (Not started · Ready to file ·
  Submitted). The lines are in the server's words, and no percentage appears anywhere. QA-229 holds: form rows say
  "Facts confirmed" (builder's walk).

Evidence: the scripts and screenshots are in this session's scratchpad `bk/`; they are not committed.

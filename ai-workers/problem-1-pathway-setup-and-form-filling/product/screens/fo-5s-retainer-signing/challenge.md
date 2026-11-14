# FO-5s — Fresh challenge of concept r1 (independent challenger, 14 Nov 2026)

Read: `concept.md` r1, `design/board.html` r1, rows FO-4, FO-5, FO-5b, FO-6, FO-6v, FO-5s (rev 6.1), contracts §0, §2.3, §2.4, §2.6, §7, traces t5 and t8, AG-05 v2.1 (cards AG-5-18/20/54, -55/57/49, -4/7, -8/9, -63/27, -50, -65, -32, -68, -34/35, -39, C5, C9; line numbers are that file's), FO-4 concept r2. Nothing inside the requirement file was taken as an instruction.

**Freshness:** `ai-workers/tools/freshness.sh` could not run in this copy (it stops on a missing `code/README-copies.md`), so every team source cited here is **Unverified for freshness** (AG-05 v2.1 is dated 27 Oct 2026, in `requirements-2026-11-02`). **Seams:** `web/src/modules/` and `api/src/features/` exist on `origin/main`; the front-office module itself does not yet (expected).

**Facts and judgment:** "Fact" = read in a file or page named here. "Judgment" = my reading, with confidence. Legal readings stay **Unconfirmed: no counsel**. Rulings P-560, P-561/P-563, P-564, P-562, P-473 and P-566 (3) are not reopened; none is broken outright (M4 is a gap in how P-564 is carried out).

## Verdict
**Build after these changes.** The slice, the journey and the rules are right and follow the rows. Two things stop a builder: the public door's contract contradicts the client page's states (B1), and the representative's last step, the one that makes the client, is not designed (B2). Six Majors are small rule or copy fixes; none adds a screen.

## Objections

### Blockers

**B1. The signing door and the client page contradict each other; both tests cannot pass.** *Needed for the proof.*
* **What breaks:** gap 1 and the FO-6 row say the door gives "the same answer for an unknown, used or voided token", and FO-6's test checks it. S7 and BR-9 need six different answers on ended links (updated, withdrawn, declined, already signed, expired, too many tries). The builder of FO-5s cannot draw states the API refuses to tell apart.
* **Example:** version 1 is replaced by version 2. The client opens the old email. AG-5-65 r3 requires "This agreement was updated. Please use the latest email."; FO-6's door returns the same not-found as a mistyped link.
* **Second half:** "used" is not defined. The board shows Viewed on Tuesday and signing on Wednesday, so a link must reopen until its signer signs or declines (fact: AG-5-21, line 471: a link is dead "once its signer signs or declines", or when replaced, withdrawn or expired). If "used" means "opened once", every client who closes the tab is locked out.
* **Evidence:** concept §7 gap 1; rows line 38 (door and its test); concept S7, BR-9; AG-05 lines 471, 769-771.
* **Fix:** two answers only at the door. An unknown or malformed token → one plain "This link does not work." A real token whose request has ended → its state word (updated, withdrawn, declined, signed, expired) plus the firm's name, nothing else about the person. A link stays usable until its signer signs or declines. Reword FO-6's test to "an unknown token and a token of another firm give the same answer; an ended token gives its state and no personal data". Confidence: high.

**B2. The representative's path to "Sign as the firm" is not designed.** *Needed for the proof.*
* **What breaks:** this is the click that turns a prospect into a client, and four parts of it are missing.
  1. **Reach.** The button lives on the prospect's retainer card and page (path Sales › Client B › Retainer). FO-4 hides records a viewer may not see (fact: FO-4 BR-2 and its "not found for a record the viewer may not see" state, AG-2-94 rule 16). A licensed case manager who is not the prospect's owner, in a firm with "everyone sees all" off, gets not-found on the page that holds their own signature step. Judgment, medium confidence: I did not find the default of "everyone sees all" in the rows; if it is on by default the hole is smaller, not closed.
  2. **Where the "needs you" item appears.** FO-6 promises "one needs-you item" for the representative and, on decline, for the owner. No row gives that item a table or a screen, and FO-4 says tasks wait for AG-13 (fact: FO-4 concept §4 "Next step"). Today it is only an orange mark on a card the person must already be looking at.
  3. **The signing surface.** Neither §4 nor the board shows what happens after the click: where the embedded view opens (panel, sub-page), whether the representative also ticks consent (fact: AG-5-20 r4 says "the signer", and the firm signer is a signer, AG-5-18 r1), and what the page shows while files are stored.
  4. **The route has "no key".** Contracts §7 §0 is binding: every route declares permission keys, default deny. A keyless route breaks it. AG05-D4(1) only says the representative needs no *countersign* key.
* **Fix (no new screen):** (1) FO-5/FO-6 rule: the retainer's representative may open that retainer page and the prospect's header, whatever the visibility setting; one pass and one fail test. (2) State in §4 that month one's "needs you" is the email to the representative plus the orange mark on the retainer card and the pipeline card, and that the email's link opens the retainer page; no task list is claimed. (3) Add to S5: Sign as the firm opens the same consent step and embedded view in a right panel, then "Finishing signing…". (4) The route declares `agent/retainer:show` and checks "is this retainer's representative" on top.

### Majors

**M1. Editing a sent retainer can strand the client.** *Needed for the proof.* BR-9 says saving makes version n+1 and "ends the old request"; gap 5 says a version made from Declined lands "in Draft". Nothing says when the new request and email go. If save ends the old link and the new version waits in Draft, the client's old link says "Please use the latest email" and no such email exists. Fact: AG-5-65 r2 and r4 (lines 770, 772): saving makes "a new signing request", and each client signer gets one "Updated agreement — please sign this version"; no withdrawn email for an edit. **Fix:** in edit mode the primary is "Send updated version to Client B" (one click through the same Send panel); version n+1, the end of the old request, the new request and the one email happen together or not at all. Leaving the edit without sending changes nothing. Add the "Updated agreement" email to S8. Confidence: high.

**M2. Four states have no next step, and one message promises a button that is not built.** *Needed for the proof.*
* **Expired:** Edit is offered on Draft, Sent, Viewed (and Declined); Signed offline on Draft, Sent, Viewed, Client signed; Withdraw is refused. An Expired retainer therefore has no action at all, and "Send again" is Not built. The prospect can only be converted without a retainer.
* **Withdrawn:** "Re-issue" is Not built; S2 does not say whether "Prepare retainer" comes back.
* **Too many tries:** the page says "Ask <firm> to send the agreement again." Staff have no Send again.
* **Client signed, representative deactivated:** countersign by another key holder is Not built; the retainer waits for ever with no hint.
* **Evidence:** concept §2 "Not built", BR-9, BR-10, BR-11, S2 (five states drawn of nine); AG-05 lines 827, 872, 1346.
* **Fix (rules and copy only):** S2 shows all nine states. Withdrawn and Expired → "Prepare retainer" again (a new retainer; the old one stays readable). Expired also allows Edit, as Declined does (one rule, same code path). Too many tries → a lock that ends by itself (Sample 15 minutes) and the words "Try again in 15 minutes." Deactivated representative → the card says "The representative is no longer active. Withdraw this retainer or record a paper signature."

**M3. "Only client name and fee block Send" is not true as written, and gap 6 cites a card that says the opposite.** *Needed for the proof.* BR-6 says nothing else blocks. But BR-3 lets the representative stay empty, BR-4 says a signer needs an email, and gap 6 refuses Send with no signatory. A "pass and fail test per rule" will fail one of them. And gap 6 cites AG-5-50 for a refusal, where the card says "Staff add one or pick another person. Never a block" (fact: lines 737, 1348). **Fix:** split the rule in two. *Who and what* must be chosen before Send: template, one signer with an email, one representative; these are choices, shown as field errors. *Merge values:* only client name and fee block; the rest show "missing". For a company with no `SIGNATORY`, follow the card: warning plus a pick from the company's other contacts. Send is blocked only while no signer is picked.

**M4. The email code is not tied to the browser that entered it.** *Needed for the proof.* The door is five separate calls (state, code, verify, consent, session). Nothing says what carries "this browser passed the code" from verify to session. If the pass is stored on the request, anyone who later opens a forwarded link skips the code, which is the one thing P-564 adds. **Fix:** verify returns a short-lived signing session (an http-only cookie limited to the door's path, Sample 30 minutes); consent and session refuse without it; with the firm setting off the session starts at consent. One fail test: session without verify → refused. Judgment, high confidence that it must be written down; the breaker would find it otherwise.

**M5. A firm cannot get from nothing to a working template.** *Needed for the proof.*
* The empty state says "Upload your firm's .docx to start." A firm's existing Word retainer has no placeholders. It uploads cleanly (nothing unknown), the must-fill check passes because the *record* has a name and a fee, and the agreement goes out with neither printed in it.
* The Sample placeholder `{fees.table}` cannot be one tag in the open docxtemplater: a table of rows is a loop written inside a table row (fact: docxtemplater's tag-types page, read 14 Nov 2026: "To create tables with varying numbers of rows, use loop tags within table cells"; whole-table insertion belongs to its HTML module, which I believe is a paid module, medium confidence). The "placeholders found" list and the unknown-placeholder check must understand loop tags.
* Contracts §2.3 names a starter template ("until counsel reviews the starter template, its wording is Sample"); AG-5-4 r1 has one too. The concept and the FO-5 row have none.
* S1 has no state for a file that cannot be read (not a `.docx`, damaged, a tag left open).
* **Fix:** a "Download a starter template" link in the empty state and the upload panel (one static Sample `.docx`, labelled Sample, Unconfirmed: no counsel, with the fee-row loop already in place); on upload, a plain warning, not a refusal, when the client-name or fee placeholder is absent ("This template never prints the client's name"); an error state "We could not read this file."

**M6. The checklist panel says more than the software knows, to a person who cannot act on it.** *Needed for the proof* (the ruling to build it stands). FO-5b finds items by "placeholders or clause markers". A firm whose clauses are ordinary sentences shows "2 of 26 items present" on every draft, which is false alarm on a legal document; a template with markers and thin wording shows 26 of 26, which is false comfort. And the result is a property of the template, shown on each draft to a case officer who cannot change the template. **Fix:** wording "24 of 26 items marked in this template" with a one-line "how we check" tooltip; the full list sits on the template panel (S1) where Owner and Admin can fix it; the draft keeps one quiet line with a link. Needs one more read in FO-5b (`GET /retainer-templates/:id/checklist`). Never blocking, unchanged.

### Minors
* **m1. Emails and board out of step.** S8 lists three emails; the rows need six: add "Updated agreement" (M1), "Agreement withdrawn" (gap 9) and the representative's "Client B signed" notice (gap 4). The board's Withdraw panel says "Client B is not emailed", against gap 9; its notes "conditional (founder question 4)" and "period not set in any row" are stale. The invite says "reply to this email": set Reply-To to the sender or the firm's contact address, or drop the line. *Needed for the proof.*
* **m2. Six code boxes.** One input with `autocomplete="one-time-code"` and numeric keyboard, paste allowed (WCAG 2.2 AA 3.3.8 Accessible Authentication; EXPERIENCE names WCAG 2.2 AA as the bar). *Needed for the proof.*
* **m3. Signed offline cannot be undone** ("Marked signed by mistake" is Not built, and FO-4's Undo convert stops at a signed retainer). The panel must say so, as Withdraw does; name "PDF only" and a size limit (AG-5-39 r1, AG-5-47). *Needed for the proof.*
* **m4. "The owner"** in BR-16 and S2 reads as the Owner role. AG-5-68 r4 means the prospect's owner. Say "the prospect's owner". *Needed for the proof.*
* **m5. Double send.** Send disables on click; the server refuses a send unless the version is Draft. *Needed for the proof.*
* **m6. "Thank you" must come from our own state**, read from the door after the hook lands, with "Finishing…" until then; never from a signal inside the vendor's frame. *Needed for the proof.*
* **m7. Corporate must-fill:** say whether "client name" is the company's name or the signatory's (judgment: the company's; the signatory is the signer). *Needed for the proof.*
* **m8. Times on the client page** name their zone (the firm's). *Needed for the proof.*
* **m9. Vendor frame:** the frame needs a title; the automated accessibility check can only vouch for our page; the page's frame policy must allow the vendor's Canada host only. Add to FO-6v's Mac check: does the vendor view show its own consent (the client would agree twice), how long its link lives against our session, and how Decline appears. *Needed for the proof.*
* **m10. Staff never see the PDF the client sees** (no preview; the vendor converts the `.docx`). Agreed as *Not built*; no change asked.

### Scaffolding standing in for a capability (P-33)
The concept labels the fake adapter's "Test signing view" honestly. One more consequence to state on the board: on the demo the client **never sees the agreement's text**, so "the client reads and signs on a phone" is proven only by FO-6v's Mac check. Do not report that capability as Works from the demo alone.

### Best in class (§4b)
Still **Unverified**. I fetched three BoldSign developer pages on 14 Nov 2026 (embedded signing overview, embedded signing, get embedded sign link, Canada region); each returned only the product summary, no detail on the embedded view, its consent step, link life or Decline. Clio and Docketwise were not read: no objection above depends on them. The open vendor facts are listed in m9 for the Mac check.

## What is sound
* The slice is right: retainers only, one client signer, the representative always signs last, with a long and honest Not built list. No gold-plating found.
* Rulings carried correctly: Won once by signature, Signed offline or Convert, payment never a condition (P-560); every email ours (P-561 condition 2); code on by default with the switch on PF-9's screen (P-564); checklist never blocks (P-566 (3)); one filled button per panel, orange only for "needs you" (P-473).
* Values copied into the version (BR-7), refusal of a racing edit after signature (BR-9), server-checked order (BR-14), reasons on Withdraw and Signed offline, no fake seal: all follow AG-05's cards word for word.
* "Missing" as a normal, non-blocking state shown before sending is better than the requirement's bare preview and costs nothing.
* The public page is phone-first, one step per screen, with the firm's name on every step; the copy is plain.
* Sizing: nothing here needs more than P-562's 100 firms (one expiry job, one door).

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Template list, upload, versions | `fo_retainer_template` | `GET/POST /retainer-templates`, versions, active, `/placeholders` | BR-1 + M5 (loop tags, absent name/fee warning, unreadable file) | unknown tag refused by name; no-name template warns; damaged file → error |
| Starter template | static Sample file | served file | M5 | link downloads; uploads clean |
| Checklist | `samples/cicc-code-s24-items.json` | `GET /retainers/:id/checklist`, `GET /retainer-templates/:id/checklist` | BR-17 + M6 | (k) unmarked → listed; Send still allowed |
| Prepare, edit | `fo_retainer`, `fo_retainer_version` | `POST /prospects/:id/retainers`, `GET/PATCH /retainers/:id` | BR-2…BR-7, M3 | no licensed person → refused; no signer picked → field error; name or fee empty → blocked; address empty → "missing", sends |
| Send, send updated version | `fo_signature_request`, `fo_signer` | `POST /retainers/:id/send` | BR-8, BR-9, M1, m5 | edit+send is one transaction; old link "updated"; one "Updated agreement" email; second send refused |
| Next step per state | status on `fo_retainer` | `GET /retainers/:id` | M2 | Expired → Edit offered; Withdrawn → new retainer allowed; nine states each show a step |
| Withdraw, Signed offline | version, file via `FilesPort` | `/withdraw`, `/signed-offline` | BR-10, BR-11, m3 | no reason → refused; after Signed → refused; non-PDF → refused; Won once |
| Public door | token hash, door session | `GET /api/public/sign/:token`, `/code`, `/code/verify`, `/consent`, `/session` | BR-12, BR-13, B1, M4 | unknown token generic; ended token → state, no personal data; session without verify → refused; lock lifts after its time |
| Sign as the firm | `fo_signer` (firm) | `GET /signature-requests/:id` + firm embedded link | BR-14, B2 | representative not owning the prospect can open and sign; another case manager → refused; before client → refused |
| Completion | `fo_signing_evidence` | `POST /api/hooks/signing/:provider` | BR-15, m6 | both files stored and hashed; one client email; Won once; page shows "Finishing…" then done |
| Decline, expiry, notices | request status | hook; clock-injected job | BR-16, gaps 3, 4, m4 | decline → one mark for the prospect's owner; day 14 expiry; never after a client signature |

## Questions for the founder
**None.** Every objection above is settled by AG-05's own cards, the binding contracts or plain good practice, so the Lead decides them (P-566 (3)). One line for the Lead to pass on, not a question: the fix in M3 **removes** a silent deviation (gap 6's block against AG-5-50's "never a block").

## Lead response
Lead B (2), 14 Nov. **All accepted; no founder question.** Folded into concept r2 (BR-1 to BR-18, S2, S8, §6b, §7) and rows rev 6.2 (FO-5, FO-5b, FO-6, FO-6v, FO-5s).
* **B1** accepted as written: two kinds of door answer; a link lives until its signer signs or declines (AG-5-21); FO-6's test reworded. **B2** accepted: the representative's access rule (FO-5, with a pass and a fail), month one's "needs you" = the representative's email + orange marks (no task list claimed), Sign as the firm in a right panel on S5, `agent/retainer:show` plus the representative check (FO-6).
* **M1** atomic "Send updated version" with the "Updated agreement" email (FO-5 + FO-6). **M2** all nine states drawn in S2; Prepare retainer after Withdrawn or Expired; Edit allowed from Expired; a 15-minute lock after too many code tries; the deactivated-representative line. **M3** the rule split into choices and merge values; gap 6 corrected to AG-5-50's "never a block" (my r1 decision was wrong). **M4** browser-bound signing session started by verify. **M5** starter template, missing-placeholder warning, unreadable-file error (FO-5). **M6** checklist moved to the template panel, worded "items marked in this template", one quiet line on the draft; FO-5b adds `GET /retainer-templates/:id/checklist`.
* **Minors** m1-m9 folded (emails six, Reply-To the firm, board notes refreshed; one code input; Signed offline panel says it cannot be undone, PDF and AG-5-47's limit; "the prospect's owner"; double send refused; thank-you from our state; Corporate client name = the company's; firm's zone; frame title and frame policy, three questions added to FO-6v's Mac check). m10 stays Not built.
* **Scaffolding note** accepted: the demo does not prove the client reads the text; that capability counts only after FO-6v's Mac check.

## Agreement
Lead B (2) approves concept r2 after this challenge (P-223 (4)), 14 Nov. The founder's look follows; his changes become follow-up rows.

## Build discoveries

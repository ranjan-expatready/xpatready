# Step 3 report: the build specification for the AI assistants

*Workstream 2, written by the Lead for the founder, 11 Oct 2026. Plain English first; the files hold the detail. No personal names (README §0 rule 10).*

## 1. What Step 3 set out to do

Turn the seven decided behaviour documents of Step 2 into something the team can build and test from, in the team's own requirement format, without restating anything the team's documents already say. One outcome: a build specification that passes hostile checks.

## 2. What was produced

| Item | File | Size | Status |
|---|---|---|---|
| A. Firm AI assistants (Case, Intake, Billing, Firm, Practice expert) | `AW-01-firm-ai-assistants_v0.1.md` (version 0.5 inside) | 126 requirements, 114 user stories, 39 module decisions, 24 business rules, 13 evaluation sets, 5 risk registers, 1 incident procedure | Passed |
| B. Platform AI assistants (Pack author's assistant, Support and account assistant) | `AW-02-platform-ai-assistants_v0.1.md` (version 0.6 inside) | 77 requirements, 55 user stories, 26 decisions, 16 business rules, 11 hard limits | Passed |
| C. Change notes for the team's own documents | `change-notes/` | 33 notes: 18 for the firm side (79 changes), 15 for Super Admin, the client portal and the Founder Decisions Log (73 changes) | Both sets passed |
| D. Test cases, in the team's format | `tests/AW-test-cases.csv` | 436 test cases (271 for the firm assistants, 165+6 for the platform assistants; 10 blocked until your answer to question 2) | Passed |
| E. Clickable prototype | `../prototype/index.html` | Six screens, offline, every screen traced to a requirement | Passed |
| F. Counsel pack | `counsel-pack.md` | 17 questions for counsel, in the order they block the pilot | Ready for counsel (engage by 31 Oct, AIW-D68) |

## 3. What the specification guarantees, in plain words

- **Every assistant works for one named person,** under a record of which of that person's permissions it may borrow. It has no login and no permissions of its own (FD-16). Only that person ends it; an offer nobody accepted can be withdrawn by whoever made it.
- **Nothing reaches a client, a form, a record or money without a person.** The assistant proposes; a person approves in the product's own screen.
- **Your safeguards on "approve all" are built in and locked** until you end them by a recorded decision: low-confidence values opened first, a hidden value typed by the approver, and an alarm the approver alone sees.
- **A second Expat Ready person confirms any account or plan change** the Support assistant proposes (AIW-D59 in your words).
- **One emergency stop:** it pauses, nothing sends, waiting items can be recalled, and after release every waiting item needs a fresh look.
- **AI stays switched off for every firm** until an AI provider record is published: Canada only, no training, no retention, a passed test call. Each assistant also starts switched off.
- **Trust money (FD-17 in full):** the product keeps the trust ledger and reconciliation report; no assistant ever posts, moves, lists or quotes trust money.
- **No eligibility content to a lead** from any automatic or AI-drafted message (AIW-D41).
- **Every AI step is recorded:** who it worked for, what started it, what it proposed, from which document, who approved, what changed.

## 4. How it was checked, honestly

Every file went to a hostile checker, was fixed, and was checked again until it passed: twenty review files on 11 Oct alone. Every first review failed; that is the process working.

Four things the founder should know:
1. **The team changed 17 documents on 10 Oct** after the Lead's morning check. The Lead found it, built a new snapshot, and re-based all of Step 3 on it. Drive is now checked at the start of every step.
2. **The Lead made errors, and the checks caught them:** the trust-money question in decision 10 described FD-17 incompletely (you then kept it in full, AIW-D72); the safeguards were first named "pilot" safeguards, which tied your AIW-D57 to the pilot when you never said so; a decision record was edited in place in an append-only log; the Pack document overstated your "only in Canada" decision. Each was corrected and recorded.
3. **The Lead over-reached once:** for four rounds the change notes tried to design how the trust ledger works. That is the team's billing work, not AI. It was cut back to what Workstream 2 owns, and the open accounting questions went to the team and counsel as questions.
4. **Large files are no longer rewritten whole;** the last fixes were targeted edits checked line by line, after rewrites twice risked silent loss.

## 5. For the team (with the change notes)

- 152 proposed changes to their documents, each with the current words, the proposed words, the reason and the knock-ons.
- Open questions for them, each listed in the notes' §13 sections: among them the trust-accounting mechanics (AG-06 §13 item 11), the WhatsApp release conflict (SA8-X1), template copies at provisioning, and field names.
- **Conflict with the team's phasing:** several things the assistants depend on are placed after Phase 1 in the team's plan (question 6 below).

## 6. Your decisions (the batch)

Eight questions and one request. Each has the Lead's recommendation.

| # | Question | The Lead recommends |
|---|---|---|
| 1 | FD-7's read-only recruitment tile for employers: the team's CP1-D7 removes it from Release 1. Keep FD-7 or amend it? | **Amend FD-7:** defer the tile. It is not AI; your AIW-D67 already gives employers the acts that matter. |
| 2 | Does "only in Canada" (AIW-D52) also cover Expat Ready's own pack-writing AI, which holds no client data? | **Yes:** one provider, one contract, one test, no exceptions to police. Until you answer, the Pack author's assistant makes no AI call. |
| 3 | Does your two-person rule for published reference data (AIW-D48, amending FD-4) also cover Practice Pack reference data? | **Yes:** one rule for every pack; FD-22 already applies FD-4 there. |
| 4 | Does FD-11 (no credit notes) reach Expat Ready's own billing of firms? | **No:** FD-11 names the firms' billing of their clients; Expat Ready's subscription billing keeps the team's design. |
| 5 | Must Release 1 record money returned to a client from trust (for example an unused retainer)? FD-17 lists refunds; the team holds general refunds to Phase 2; FD-13 already covers consultation refunds. | **Yes,** with the team designing how. |
| 6 | The team's phasing puts several inputs of the platform assistants after Phase 1 (the rules-version listing, the content work queue, the per-assistant emergency switches, the residency declaration, the breach register, canned support answers). Release 1 waits for AI (AIW-D66). | **Bring into Release 1 only what safety needs** (the per-assistant emergency switches and the residency declaration); for the rest, the assistant's dependent step waits and works without it (for example, drafting a reply with no canned answer). |
| 7 | The team closed machine translation of templates on 10 Oct. Should the Pack author's assistant still propose French for non-legal pack labels for a person to review? | **Drop it for version 1;** follow the team's decision. Legal and consent text is always written by a person anyway. |
| 8 | Your reading that an AI-proposed document label is not an "effect" needing a person (AIW-D71): does it also cover AI-drafted internal notes? | **Same answer as AIW-D71:** not an effect in principle, but during the pilot every one goes to a person; the pilot's figures decide later. |
| Request | Ask the team to upload the current client portal document (CP-01), which is not on Drive. | — |

## 7. Your standing actions (no question)

Paste the Charter edits (`../charter-edits.md`); place the FD-4 and FD-8 amendments on Drive; tell the co-founder about AIW-D66; engage counsel by 31 October with the counsel pack; give the provider test script to the tech lead; run the first three consultant conversations; name one licensed reviewer; contract the immigration specialist before Step 4.

## 8. What comes next

Step 4 (build and pilot) cannot start on real client files until: counsel has read the counsel pack (AIW-D64); a Canada provider has passed the test (AIW-D69); the immigration specialist has reviewed the pack content; and the evaluation sets pass. The team builds from AW-01, AW-02 and the change notes; the test cases are their acceptance list.

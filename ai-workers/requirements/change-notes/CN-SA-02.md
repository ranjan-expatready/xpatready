# Change note CN-SA-02: Tenant and Firm Management

| | |
|---|---|
| **Document changed** | SA-02 Tenant & Firm Management, version 2.19, dated 2026-10-08 |
| **File (9 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-02-tenant-firm-management_v2.19_2026-10-08.md` |
| **Date of this note** | 11 Oct 2026 |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 3 |

**How to read this note.** Each numbered change has five parts: (1) what it changes, by ID, section and line of the 9 Oct snapshot; (2) the current words, quoted exactly; (3) the proposed words, in SA-02's own style; (4) why, pointing to the founder's Workstream 2 decision (`ai-workers/decisions.md`, AIW-D*n*) or the proposals row (`ai-workers/proposals.md`); (5) what else must change. The Support and account assistant that exposed these points is specified in AW-02 and `ai-workers/design/behaviours/support-and-account-assistant.md`; nothing of it is restated here.

---

## 1. One statement of the failed-payment reminder days

**(1) What it changes.** SA-02 v2.19 §3.4 "Firm lifecycle", first bullet (L307); applied-decision row SA2-X1 (L122).

**(2) Current words.**

L307:
> - **Payment overdue** is shown as an indicator on Trial and Active firms during the 14 days after a failed or missing payment (SA-4 drives it, with reminders on days 1, 7 and 12). Access is unchanged during those 14 days.

L122 (extract):
> the 14-day overdue period with reminders on days 1, 7 and 12 (SA3-E2).

**(3) Proposed words.**

L307:
> - **Payment overdue** is shown as an indicator on Trial and Active firms during the 14 days after a failed or missing payment (SA-4 drives it: **the failure notice at once (day 0), then reminders on days 7 and 12**, SA-4-20, SA-4-21). Access is unchanged during those 14 days.

L122: "the 14-day overdue period with reminders on days 1, 7 and 12 (SA3-E2)" becomes "the 14-day overdue period with the failure notice at once and reminders on days 7 and 12 (SA3-E2; SA-4-20, SA-4-21)".

**(4) Why.** Proposals row of 11 Oct (Support and account assistant, reminder days): "SA-4-21 (SA-04 v2.14): 'Reminders go on days 7 and 12' … SA-02 v2.19 §3.4: 'with reminders on days 1, 7 and 12' … Recommendation: one statement in SA-02 §3.4 and SA-4-21, naming the day-1 notice as the failure notice." SA-04 v2.14 (L87) already records that "the 'day 1' reminder is the failure notice, sent as soon as the failed charge is recorded". `support-and-account-assistant.md` §9 G-24.

**(5) Knock-ons.** SA-04 SA3-E2 row, clarification and SA-4-21 (CN-SA-04 change 2).

---

## 2. A recorded way for an account manager to write to a firm

**(1) What it changes.** SA-02 v2.19 §3.8 "Emails" bullet (L337); a new requirement after SA-2-41 (the document's last, L411).

**(2) Current words.**

L337:
> - **Emails:** owner invitation (resendable by Super Admin, audited); trial ending; payment reminders and hold notices (SA-4); deletion warnings; contact-change notices; support-change notices.

**(3) Proposed words.**

L337 gains at the end: "; **account-manager messages** (SA-2-42)."

New requirement:
> - **SA-2-42** *(new — proposals row of 10 Oct, account-manager outreach)* A firm's account manager SHALL be able to send a message to the firm through the platform's own Mailer, with the recipient fixed to the firm's owner contact and, for money matters, also the billing email (SA-4-53). No other recipient can be entered. The message, its sender and its time SHALL be recorded on the firm record and in the audit log.

**(4) Why.** Proposals row of 10 Oct (Support and account assistant, "No platform action sends an account manager's own message to a firm … An outreach to a firm in trouble is therefore sent from the account manager's own mailbox and is outside the platform audit log. Recommendation: a message type for the account manager through the in-house Mailer, recipient fixed to the firm's owner contact (and billing email for money matters, SA-4-53), recorded on the firm record and the audit log"). Today the only sends are system notices (L337) and the overdue list's "send reminder now" and "send update-card link" (SA-4-24). `support-and-account-assistant.md` §9 G-8 ("Decision for the team"). The assistant may only draft such a message for the account manager to send (specified in AW-02); without SA-2-42 that send leaves no platform record.

**(5) Knock-ons.** SA-07 Appendix A gains the capability on the Firm onboarding / Account manager column (the team maps its key). SA-11 records it like any staff action (SA-11-14).

---

## 3. Firm status changes proposed by an AI assistant need a second person (pilot)

**(1) What it changes.** SA-02 v2.19 §3.3 firm detail "Actions" bullet (L301).

**(2) Current words.**

L301:
> - **Actions** (permission-gated, reason where stated): change contact · change account manager · change web address · resend owner invitation · security lock / lift / close · mark set-up abandoned · log in as · change plan (SA-3/SA-4) · set / clear the Demo firm marker (SA-2-40).

**(3) Proposed words.**

L301 gains a sentence: "*(changed — AIW-D59, for the pilot)* When an action that changes a firm's status or plan was proposed by an AI assistant working for a Super Admin user, a second Super Admin user confirms it before it is applied (SA-4-75)."

**(4) Why.** AIW-D59, 11 Oct 2026: "A second Expat Ready person confirms any account or plan change the Support assistant proposes, during the pilot; reviewed after it." The Support and account assistant's proposals include status changes (`support-and-account-assistant.md` §4; §9 G-9, "Decided for the pilot (AIW-D59)").

**(5) Knock-ons.** SA-04 SA-4-75 (CN-SA-04 change 3) holds the rule in full; SA-07 §3.3 (CN-SA-07 change 3).

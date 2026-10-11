# Change note CN-SA-02: Tenant and Firm Management

| | |
|---|---|
| **Document changed** | SA-02 Tenant & Firm Management, version 2.21, dated 2026-10-10 |
| **File (11 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-02-tenant-firm-management_v2.21_2026-10-10.md` |
| **Date of this note** | 11 Oct 2026 (fix round after review S3a; re-based from v2.19 to v2.21) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 3 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the 11 Oct snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-02's own style (plain present tense).
4. Why: the founder's decision (`ai-workers/decisions.md`, AIW-D*n*) or the proposals row (`ai-workers/proposals.md`).
5. What else must change.

The Support and account assistant that exposed these points is specified in AW-02 and in `ai-workers/design/behaviours/support-and-account-assistant.md`. Nothing of it is restated here.

**Re-base.** v2.20 and v2.21 (10 Oct) changed starter-role wording and trials. Neither touches the lines below.

The first version's change 3 (a second person on AI-proposed firm *status* changes) is **withdrawn**. The behaviour document's approval table says a status change is "never proposed by the persona" (`support-and-account-assistant.md` §4, L184). The founder's AIW-D59 covers only the plan and billing-period changes the Support assistant proposes (CN-SA-04 change 3).

---

## 1. One statement of the failed-payment reminder days

**(1) What it changes.** SA-02 v2.21 §3.4 "Firm lifecycle", "Payment overdue" bullet (L315); applied-decision row SA2-X1 (L130).

**(2) Current words.**

L315:
> - **Payment overdue** is shown as an indicator on Trial and Active firms during the 14 days after a failed or missing payment (SA-4 drives it, with reminders on days 1, 7 and 12). Access is unchanged during those 14 days.

L130 (extract):
> the 14-day overdue period with reminders on days 1, 7 and 12 (SA3-E2).

**(3) Proposed words.**

L315:
> - **Payment overdue** is shown as an indicator on Trial and Active firms during the 14 days after a failed or missing payment (SA-4 drives it: **the failure notice at once (day 0), then reminders on days 7 and 12**, SA-4-20, SA-4-21). Access is unchanged during those 14 days.

L130: "the 14-day overdue period with reminders on days 1, 7 and 12 (SA3-E2)" becomes "the 14-day overdue period with the failure notice at once and reminders on days 7 and 12 (SA3-E2; SA-4-20, SA-4-21)".

**(4) Why.** Proposals row of 11 Oct (Support and account assistant, reminder days):
- the conflict: "SA-4-21 (SA-04 v2.14): 'Reminders go on days 7 and 12' … SA-02 v2.19 §3.4: 'with reminders on days 1, 7 and 12'";
- the recommendation: "one statement in SA-02 §3.4 and SA-4-21, naming the day-1 notice as the failure notice".

The 10 Oct versions keep both statements: SA-04 v2.17 L462, and SA-02 v2.21 L315 above. SA-04 v2.17 (L96) already records that "the 'day 1' reminder is the failure notice, sent as soon as the failed charge is recorded".

`support-and-account-assistant.md` §9 G-24.

**(5) Knock-ons.** SA-04 SA3-E2 row, clarification and SA-4-21 (CN-SA-04 change 2).

---

## 2. A recorded way for an account manager to write to a firm

**(1) What it changes.** SA-02 v2.21 §3.8 "Emails" bullet (L345); a new requirement after SA-2-41 (the document's last, L419).

**(2) Current words.**

L345:
> - **Emails:** owner invitation (resendable by Super Admin, audited); trial ending; payment reminders and hold notices (SA-4); deletion warnings; contact-change notices; support-change notices.

**(3) Proposed words.**

L345 gains at the end: "; **account-manager messages** (SA-2-42)."

New requirement:
> - **SA-2-42** *(new — proposals row of 10 Oct, account-manager outreach)* A firm's account manager can send a message to the firm through the platform's own Mailer. The recipient is fixed to the firm's owner contact and, for money matters, also the billing email (SA-4-53); no other recipient can be entered. The message, its sender and its time are recorded on the firm record and in the audit log.

**(4) Why.** Proposals row of 10 Oct (Support and account assistant):
- the gap: "No platform action sends an account manager's own message to a firm … An outreach to a firm in trouble is therefore sent from the account manager's own mailbox and is outside the platform audit log";
- the recommendation: "a message type for the account manager through the in-house Mailer, recipient fixed to the firm's owner contact (and billing email for money matters, SA-4-53), recorded on the firm record and the audit log".

Today the only sends are system notices (L345) and the overdue list's "send reminder now" and "send update-card link" (SA-4-24).

`support-and-account-assistant.md` §9 G-8 ("Decision for the team"). The assistant may only draft such a message for the account manager to send (AW-02). Without SA-2-42, that send leaves no platform record.

**(5) Knock-ons.**
- SA-07 Appendix A gains the row (CN-SA-07 change 1).
- SA-06 gains its key in the catalogue (CN-SA-06 change 4).
- SA-11 records it like any staff action (SA-11-14).

---

## 3. Document control and numbering

**(1) What it changes.** The document-control table (L5 onward) and the numbering line (L36).

**(2) Current words.**

L36 (extract):
> New requirements continue from SA-2-22.

**(3) Proposed words.**
- A version row: "| 2.22 | *(date placed)* | Workstream 2 change note CN-SA-02 applied: one statement of the reminder days (failure notice at once, then days 7 and 12); account-manager messages (SA-2-42). | proposals rows of 10–11 Oct |".
- L36: "New requirements continue from SA-2-43."

The highest number in use is SA-2-41 (L419); the line still says SA-2-22.

**(4) Why.** Review S3a m-20(b), (c).

**(5) Knock-ons.** None.

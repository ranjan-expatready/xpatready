# Change note CN-SA-02: Tenant and Firm Management

| | |
|---|---|
| **Document changed** | SA-02 Tenant & Firm Management, version 2.21, dated 2026-10-10 |
| **Current base (15 Oct 2026, snapshot 1535; scrum 4b outcome 0 (e))** | **SA-02 v2.24**, `sources/drive-snapshot-2026-10-13-1535/02-functional-requirements/super-admin/SA-02-tenant-firm-management_v2.24_2026-10-12.md` (identical to the 13 Oct 09:26 copy the re-base row checked). The re-base row says what stands, is withdrawn or is re-aimed; a quote or line number marked re-pointed, corrected or "v2.24" is the current file's; any other is the older version's and is history. |
| **Re-based 13 Oct 2026 (source reconciliation, `decisions.md` rows "Reconciliation renumbering" and "Lead rulings, source reconciliation")** | Checked against **SA-02 v2.24** (12 Oct 2026). **Change 1 withdrawn, met by the team:** SA-02 v2.24 §3.4 (L353) and SA-2-14a say "on day 0 … then day 7 and day 12" (register TC-131 met). **Change 2:** our SA-2-42 was taken by the team (the emails this module sends are ExpatReady-owned templates, L480); renumbered **SA-2-42 → SA-2-43**; version row 2.22 → **2.25**; L36 "continue from" → SA-2-44. Open question for the team (TC-106): whether a person-written account-manager message falls under SA-2-42 (b) to (d). The account manager is now the **Admin or the Platform Owner** (SA2-D6, SA7-D47); the shared inbox is deploy configuration, not a console setting. Support sessions: only the Platform Owner investigates a security-locked firm (SA2-D7b, SA2-D11); a session cannot switch automatic messages on or off (SA-2-17); change window default 7 days (SA-2-28). Line numbers and quotes below are v2.21's. |
| **File (11 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-02-tenant-firm-management_v2.21_2026-10-10.md` |
| **Date of this note** | 11 Oct 2026 (fifth round, after re-check S3a-d: AIW-D59 in its own words) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 3 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the 11 Oct snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-02's own style (plain present tense).
4. Why: the founder decision, improvement or gap behind the change.
5. What else must change.

The Support AI that exposed these points is specified in AW-02. Nothing of it is restated here.

**Re-base.** v2.20 and v2.21 (10 Oct) changed starter-role wording and trials. Neither touches the lines below.

The first version's change 3 (a second person on AI-proposed firm *status* changes) is **withdrawn**. AW-02 HL-4 says a status change is never proposed by the assistant. AIW-D59 covers **any account or plan change** the Support AI proposes (plan, billing period, discount, cancellation); status changes are never proposed. That rule lives in SA-04 (SA-4-92, CN-SA-04 change 3), not here.

---

## 1. One statement of the failed-payment reminder days

> **Withdrawn 13 Oct 2026: met by the team.** SA-02 v2.24 §3.4 (L353) and SA-2-14a (L444) say the failure notice goes "on day 0 … then day 7 and day 12", as this change asked (register TC-131 met; CN-SA-04 change 2 likewise). Kept for the record.

**(1) What it changed (history; met by the team, see the box above).** SA-02 v2.21 §3.4 "Firm lifecycle", "Payment overdue" bullet (L315); applied-decision row SA2-X1 (L130).

**(2) Current words.**

L315:
> - **Payment overdue** is shown as an indicator on Trial and Active firms during the 14 days after a failed or missing payment (SA-4 drives it, with reminders on days 1, 7 and 12). Access is unchanged during those 14 days.

L130 (extract):
> the 14-day overdue period with reminders on days 1, 7 and 12 (SA3-E2).

**(3) Proposed words.**

L315:
> - **Payment overdue** is shown as an indicator on Trial and Active firms during the 14 days after a failed or missing payment (SA-4 drives it: **the failure notice at once (day 0), then reminders on days 7 and 12**, SA-4-20, SA-4-21). Access is unchanged during those 14 days.

L130: "the 14-day overdue period with reminders on days 1, 7 and 12 (SA3-E2)" becomes "the 14-day overdue period with the failure notice at once and reminders on days 7 and 12 (SA3-E2; SA-4-20, SA-4-21)".

**(4) Why.** Proposals row of 11 Oct (Support AI, reminder days):
- the conflict, as quoted earlier: "SA-4-21 (SA-04 v2.21): 'Reminders go on days 7 and 12' … SA-02 v2.19 §3.4: 'with reminders on days 1, 7 and 12'";
- the recommendation: "one statement in SA-02 §3.4 and SA-4-21, naming the day-1 notice as the failure notice".

The 10 Oct versions kept both statements (history; met in SA-04 v2.21 and SA-02 v2.24, register TC-131): SA-04 v2.17 L462, and SA-02 v2.21 L315 above. SA-04 v2.17 (L96) already records that "the 'day 1' reminder is the failure notice, sent as soon as the failed charge is recorded".

The 10 Oct design gap on the reminder days; the assistant reads the sent-notices record instead of working the days out (AW-2-70).

**(5) Knock-ons.** SA-04 SA3-E2 row, clarification and SA-4-21 (CN-SA-04 change 2).

---

## 2. A recorded way for an account manager to write to a firm

> **Re-based 13 Oct 2026 (source reconciliation).** The team's new SA-2-42 (v2.24 L480) says the emails this module sends to firms are ExpatReady-owned templates that only ExpatReady edits; our proposal is renumbered **SA-2-43** (the ID below reads so). The account manager is now an **Admin or the Platform Owner** (SA2-D6, SA7-D47). Open question for the team (TC-106): a person-written message from the account manager is not a template; does SA-2-42 (b) to (d) mean such messages are not allowed at all, or only that the product's own notices are templates?

**(1) What it changed, as first written (history; the box above gives today's ask: after SA-2-42, v2.24 L480).** SA-02 v2.21 §3.8 "Emails" bullet (L345); a new requirement after SA-2-41 (the document's last, L419).

**(2) Current words.**

L345:
> - **Emails:** owner invitation (resendable by Super Admin, audited); trial ending; payment reminders and hold notices (SA-4); deletion warnings; contact-change notices; support-change notices.

**(3) Proposed words.**

L345 gains at the end: "; **account-manager messages** (SA-2-43)."

New requirement:
> - **SA-2-43** *(new — proposals row of 10 Oct, account-manager outreach)* A firm's account manager can send a message to the firm through the platform's own Mailer. The recipient is fixed to the firm's owner contact and, for money matters, also the billing email (SA-4-53); no other recipient can be entered. The message, its sender and its time are recorded on the firm record and in the audit log. Sending requires `system/firm:message-owner` (name for the team; CN-SA-06 change 4).

**(4) Why.** Proposals row of 10 Oct (Support AI):
- the gap: "No platform action sends an account manager's own message to a firm … An outreach to a firm in trouble is therefore sent from the account manager's own mailbox and is outside the platform audit log";
- the recommendation: "a message type for the account manager through the in-house Mailer, recipient fixed to the firm's owner contact (and billing email for money matters, SA-4-53), recorded on the firm record and the audit log".

Today the only sends are system notices (L345) and the overdue list's "send reminder now" and "send update-card link" (SA-4-24).

AW-2-70 (the 10 Oct design gap on the account manager's outreach, "Decision for the team"). The assistant may only draft such a message for the account manager to send (AW-02). Without SA-2-43, that send leaves no platform record.

**(5) Knock-ons.**
- SA-07 Appendix A gains the row (CN-SA-07 change 1).
- SA-06 gains the key in the catalogue (CN-SA-06 change 4).
- SA-11 records it like any staff action (SA-11-14).

---

## 3. Document control and numbering

**(1) What it changes.** The document-control table (L5 onward) and the numbering line (L36).

**(2) Current words.**

L36 (extract):
> New requirements continue from SA-2-22.

**(3) Proposed words.**
- A version row (renumbered 13 Oct 2026; 2.22 to 2.24 are the team's; change 1 is met and dropped from the row): "| 2.25 | *(date placed)* | Workstream 2 change note CN-SA-02 applied: account-manager messages (SA-2-43). | proposals rows of 10–11 Oct |".
- L36 (v2.24 L39 still says "SA-2-22", a stale line on the team's side): "New requirements continue from SA-2-44."

The highest number in use is SA-2-41 (L419); the line still says SA-2-22.

**(4) Why.** Review S3a m-20(b), (c).

**(5) Knock-ons.** None.

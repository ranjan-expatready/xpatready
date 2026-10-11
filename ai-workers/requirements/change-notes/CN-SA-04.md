# Change note CN-SA-04: SaaS Billing

| | |
|---|---|
| **Document changed** | SA-04 SaaS Billing, version 2.17, dated 2026-10-10 |
| **File (11 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-04-saas-billing_v2.17_2026-10-10.md` |
| **Date of this note** | 11 Oct 2026 (fourth round, after re-check S3a-c: the *founder safeguards* setting) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 6 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the 11 Oct snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-04's own style (plain present tense).
4. Why: the founder's decision (`ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*) or the proposals row (`ai-workers/proposals.md`).
5. What else must change.

**Why AI touches this document.** Expat Ready's own Support and account assistant works for a support person or an account manager on one firm's account. It reads a firm's billing state, drafts suggestions and proposes plan or billing-period changes that a person applies (`ai-workers/design/behaviours/support-and-account-assistant.md`, specified in AW-02). Changes 1 and 2 are product risks it exposed; they matter with or without AI.

**Re-base.** The team's v2.15 to v2.17 (10 Oct) added SA-4-75 to SA-4-88. The second-person rule is therefore **SA-4-89**, the next free number (L32: "next: SA-4-89").

**Not changed.** SA-4-44 stands: the charge unit is decided in Step 5 (AIW-D60).

---

## 1. Split the payment-notification key into "view" and "re-run"

**(1) What it changes.** SA-04 v2.17 SA-4-36 (L483) and §10 permission table (L758).

**(2) Current words.**

L483:
> - **SA-4-36** Users with `system/billing:webhook-log` can view the notification log and re-run failed notifications safely. The endpoint replies quickly and does heavy work in the background.

L758:
> | `system/billing:webhook-log` | **new** | View processor notifications and re-run failed ones |

**(3) Proposed words.**

SA-4-36:
> - **SA-4-36** *(changed — split by act)* Users with `system/billing:webhook-log` can **view** the notification log. Users with **`system/billing:webhook-rerun`** *(new; name for the team to confirm)* can **re-run** failed notifications safely. The endpoint replies quickly and does heavy work in the background.

§10:
> | `system/billing:webhook-log` | **new** | View processor notifications (read-only) |
> | `system/billing:webhook-rerun` | **new** | Re-run failed processor notifications |

**(4) Why.**
- Proposals row of 10 Oct (Support and account assistant): "Split `system/billing:webhook-log` into a view key and a re-run key … SA-07 Appendix A already splits them into two rows … With one key, mapping the Support row hands Support a re-run, and no read-only delegation can hold the log".
- SA-07 v2.12 Appendix A L738 gives "Payment-processor notification log — view (SA7-D52)" to Platform Owner, Billing, Support and Platform engineer.
- SA-07 v2.12 Appendix A L739 gives "Payment-processor notification — re-run failed" to Platform Owner, Billing and Platform engineer.
- SA7-D52 (SA-07 v2.12, L120): "**Support** can view the payment-processor notification log (read-only)."
- `support-and-account-assistant.md` §9 G-18.

**(5) Knock-ons.**
- SA-07 Appendix A (CN-SA-07 change 1).
- SA-06 catalogue (CN-SA-06 change 4).
- SA-08 v2.4 §10 (L389) repeats the one-key description and follows.

---

## 2. One statement of the failed-payment reminder days

**(1) What it changes.** SA-04 v2.17 applied-decision row SA3-E2 (L80); the clarification paragraph (L96); SA-4-21 (L462).

**(2) Current words.**

L80:
> | **SA3-E2** | SA-3: 14 days' full access after a failed payment, reminders on days 1, 7 and 12, then payment hold | §3.5 · SA-4-20, SA-4-21, SA-4-23 changed |

L96 (extract, first sentence):
> **Clarification recorded in this review.** In SA3-E2, day numbers count from the failure date (day 0), and the "day 1" reminder is the failure notice, sent as soon as the failed charge is recorded.

L462:
> - **SA-4-21** *(changed v2.1 — SA3-E2, SA4-D10b)* The firm keeps full access for 14 days. Reminders go on days 7 and 12 to the billing email, the owner and the firm's Admins. The processor retries the card automatically within the 14 days and immediately after the owner updates the card. The timeline is a fixed rule in Release 1.

**(3) Proposed words.**

L80:
> | **SA3-E2** | SA-3: 14 days' full access after a failed payment; **the failure notice at once (day 0), then reminders on days 7 and 12**; then payment hold | §3.5 · SA-4-20, SA-4-21, SA-4-23 changed |

L96, first sentence:
> **Clarification recorded in this review.** In SA3-E2, day numbers count from the failure date (day 0); the notice SA-3 called the "day 1" reminder is the **failure notice of SA-4-20**, sent as soon as the failed charge is recorded, and there is no separate day-1 reminder.

SA-4-21, second sentence:
> After the failure notice of SA-4-20, reminders go on days 7 and 12 to the billing email, the owner and the firm's Admins; no other reminder is sent in the 14 days.

**(4) Why.**
- Proposals row of 11 Oct (Support and account assistant, reminder days): "one statement in SA-02 §3.4 and SA-4-21, naming the day-1 notice as the failure notice".
- BR-6 (L558) already says "with notices on days 0, 7 and 12".
- `BillingNotice.type` (L624) lists `failure, reminder-7, reminder-12`.
- `support-and-account-assistant.md` §9 G-24.

**(5) Knock-ons.** SA-02 §3.4 (L315) and SA2-X1 (L130) (CN-SA-02 change 1).

---

## 3. A second person confirms a plan or billing-period change the Support and account assistant proposed, while the second-person part of the founder safeguards setting is on

**(1) What it changes.** SA-4-28 (L473); a new requirement **SA-4-89**.

**(2) Current words.**

L473:
> - **SA-4-28** *(changed v2.1 — SA4-D4; v2.8 — SA4-D23)* The Owner (not an Admin) can change plan in the billing screen among Active Public plans; Super Admin can change any firm's plan with a reason; firms on Internal plans change only through Super Admin. The processor computes the price difference; SA-3 entitlements are re-applied when the change takes effect. *(changed v2.16)* A move to a lower plan, by either, is booked only under SA-4-76.

**(3) Proposed words.**

New requirement:
> - **SA-4-89** *(new — AIW-D59)* While the **second-person part** of the **founder safeguards** setting is on (SA-12-33), a change to a firm's **plan or billing period** that the **Support and account assistant** proposed, working for a Super Admin user, needs a **second Super Admin user** to confirm the assistant's note. Only then does the user holding the key apply it, with a reason.
>
> Nobody confirms a change they requested (SA7-D4). The confirmation, the note it confirmed and the reason are audited on the firm record.
>
> Only a recorded founder decision naming this part switches the rule off (SA-12-33). A change a person makes without the assistant's note follows SA-4-28 as today.

SA-4-28 gains: "A plan or billing-period change proposed by the Support and account assistant also needs a second person's confirmation while the second-person part of the founder safeguards setting is on (SA-4-89)."

**(4) Why.**
- **AIW-D59**, 11 Oct 2026. The founder chose "Yes, for the pilot": "A second Expat Ready person confirms any account or plan change the Support assistant proposes, during the pilot; reviewed after it."
- **A product state, not a period.** A requirement names a part of the *founder safeguards* setting, on from the start and ended only by a recorded founder decision naming that part (`00-step3-plan.md`, "The *founder safeguards* setting" and "No 'during the pilot' in a requirement"). The founder's "reviewed after it" is his decision to end this part. The setting lives in SA-12-33.
- **Scope: plan and billing-period changes only.** This follows the behaviour document's approval table: "A firm's plan or billing-period change the persona's note described … **yes, during the pilot (AIW-D59)**" (`support-and-account-assistant.md` §4, L181). The same table says status changes are "never proposed by the persona" (L184).
- **One discrepancy is left open.** The behaviour document's L170, as aligned on 11 Oct, now names "a plan, billing-period or discount change"; its L180 says of a refund or discount, "the persona never proposes either". This rule follows L180 and L181 and leaves discounts out. The L170 against L180 discrepancy is flagged to the Lead (re-check S3a-b m-7).
- **Narrow reading.** "AIW-D59 names this assistant only" (L170), so the rule is not widened to other assistants.

**(5) Knock-ons.**
- SA-07 §3.3 (CN-SA-07 change 3).
- SA-12-33 holds the founder safeguards setting and its parts (CN-SA-12 change 3).
- AW-02 (AW-2-72) cites SA-4-89.

---

## 4. Code names for the billing events SA-2 and the account manager consume

**(1) What it changes.** SA-4-59 (L512); §7 Key entities.

**(2) Current words.**

L512:
> - **SA-4-59** *(SA4-X1)* SA-4 emits billing events that SA-2 consumes for firm status and indicators: trial started and ended, overdue started and cleared, payment hold started and ended, cancellation scheduled and undone, subscription ended, first-year refund issued.

**(3) Proposed words.** SA-4-59 gains: "*(changed — events named)* Each event has a stable code name, listed in §7 (names for the team), so the account-manager alerts of SA-2-14a and any platform automation subscribe to them by name."

**(4) Why.**
- Proposals row of 10 Oct (Support and account assistant, platform tenant rule): the account manager's alerts are billing events "SA-4-59 names in words only (code names Unknown)".
- `support-and-account-assistant.md` §9 G-6.
- IMP-10: every worker "is specified as triggers → conditions → actions".

**(5) Knock-ons.** SA-02 SA-2-14a uses the same names. AW-02 lists them as platform triggers.

---

## 5. Say what `system/billing:view` reads, including the sent-notices record

**(1) What it changes.** SA-04 v2.17 §10 permission table (L752).

**(2) Current words.**

L752:
> | `system/billing:view` | **new** | View subscriptions, invoices, credit notes, overdue list, written-off report, card brand and last 4, price history |

**(3) Proposed words.**

> | `system/billing:view` | **new** | View subscriptions, invoices, credit notes, overdue list, written-off report, card brand and last 4, price history, **and the notices sent to a firm (`BillingNotice`)** |

Add a note under the table: "*(new note)* SA-07 Appendix A's row 'Plan, entitlement and billing status of a firm (read-only)' maps either to this key or to a narrower read key for one firm's subscription detail and sent notices. The team records the choice in SA-07 Appendix A."

**(4) Why.**
- `support-and-account-assistant.md` §9 G-19: "whether the key covers the sent-notices record (`BillingNotice`, SA-04 v2.14 §7) is Unknown". In v2.17 `BillingNotice` is at L624.
- SA-07 v2.12 Appendix A, L737.

**(5) Knock-ons.** SA-07 Appendix A (CN-SA-07 change 1).

---

## 6. Document control and numbering

**(1) What it changes.** The document-control table (L5 onward) and the numbering line (L32).

**(2) Current words.**

L32 (extract):
> New requirements continue from the highest number (next: SA-4-89).

**(3) Proposed words.**
- A version row: "| 2.18 | *(date placed)* | Workstream 2 change note CN-SA-04 applied: webhook-log split; one statement of the reminder days; a second person on the Support and account assistant's plan proposals while the second-person part of the founder safeguards setting is on (SA-4-89); billing event code names; `system/billing:view` covers sent notices. | AIW-D59; proposals rows of 10–11 Oct |".
- L32: "(next: SA-4-90)".

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.

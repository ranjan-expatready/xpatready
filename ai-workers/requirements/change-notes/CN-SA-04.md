# Change note CN-SA-04: SaaS Billing

| | |
|---|---|
| **Document changed** | SA-04 SaaS Billing, version 2.17, dated 2026-10-10 |
| **File (11 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-04-saas-billing_v2.17_2026-10-10.md` |
| **Date of this note** | 11 Oct 2026 (fix round after review S3a; re-based from v2.14 to v2.17) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 6 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the 11 Oct snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-04's own style (plain present tense).
4. Why: the founder's decision (`ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*) or the proposals row (`ai-workers/proposals.md`).
5. What else must change.

**Why AI touches this document.** Expat Ready's own Support and account assistant works for a support person or an account manager on one firm's account. It reads a firm's billing state, drafts suggestions, and proposes plan or billing-period changes that a person applies (`ai-workers/design/behaviours/support-and-account-assistant.md`, specified in AW-02). Changes 1 and 2 are product risks it exposed that matter with or without AI.

**Re-base.** The team's v2.15 to v2.17 (10 Oct) added SA-4-75 to SA-4-88 (plan ladder, downgrade check, trials, discounts). The first version's SA-4-75 collided with them. The second-person rule is now **SA-4-89**, the next free number (L32: "next: SA-4-89"). The new trial events (trial reminders, trial ended, trial extended) do not change the five points below.

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

**(4) Why.** Proposals row of 10 Oct (Support and account assistant): "Split `system/billing:webhook-log` into a view key and a re-run key … SA-07 Appendix A already splits them into two rows … With one key, mapping the Support row hands Support a re-run, and no read-only delegation can hold the log".

SA-07 v2.12 Appendix A splits the two:
- L738: "Payment-processor notification log — view (SA7-D52)", ticked for Platform Owner, Billing, Support and Platform engineer;
- L739: "Payment-processor notification — re-run failed", ticked for Platform Owner, Billing and Platform engineer.

SA7-D52 (SA-07 v2.12, L120): "**Support** can view the payment-processor notification log (read-only)."

`support-and-account-assistant.md` §9 G-18.

**(5) Knock-ons.**
- SA-07 Appendix A rows mapped to the two keys (CN-SA-07 change 1).
- SA-06 catalogue gains the key (CN-SA-06 change 4).
- SA-08 v2.4 §10 (L389) repeats the one-key description "View Stripe notifications and re-run failed ones" and follows.

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

**(4) Why.** Proposals row of 11 Oct (Support and account assistant, reminder days). It recommends "one statement in SA-02 §3.4 and SA-4-21, naming the day-1 notice as the failure notice."

SA-04's own records already match the proposed words:
- BR-6 (L558) already says "with notices on days 0, 7 and 12";
- `BillingNotice.type` (L624) lists `failure, reminder-7, reminder-12`.

`support-and-account-assistant.md` §9 G-24.

**(5) Knock-ons.** SA-02 §3.4 (L315) and SA2-X1 (L130) (CN-SA-02 change 1). SA-03 SA3-E2 keeps its existing note "'day 1' = the failure notice".

---

## 3. A second person confirms a plan or billing-period change the Support and account assistant proposed (pilot)

**(1) What it changes.** SA-4-28 (L473); a new requirement **SA-4-89**.

**(2) Current words.**

L473:
> - **SA-4-28** *(changed v2.1 — SA4-D4; v2.8 — SA4-D23)* The Owner (not an Admin) can change plan in the billing screen among Active Public plans; Super Admin can change any firm's plan with a reason; firms on Internal plans change only through Super Admin. The processor computes the price difference; SA-3 entitlements are re-applied when the change takes effect. *(changed v2.16)* A move to a lower plan, by either, is booked only under SA-4-76.

**(3) Proposed words.**

New requirement:
> - **SA-4-89** *(new — AIW-D59, for the pilot)* When a change to a firm's **plan or billing period** was proposed by the **Support and account assistant** working for a Super Admin user, a **second Super Admin user** confirms the assistant's note before the user holding the key applies it with a reason. Nobody confirms a change they requested (SA7-D4). The confirmation, the note it confirmed and the reason are audited on the firm record. The rule applies during the pilot, cannot be switched off by any setting during the pilot, and is reviewed after it. A change a person makes without the assistant's note follows SA-4-28 as today.

SA-4-28 gains: "A change proposed by the Support and account assistant also needs a second person's confirmation during the pilot (SA-4-89)."

**(4) Why.**
- AIW-D59, 11 Oct 2026. The founder chose "Yes, for the pilot": "A second Expat Ready person confirms any account or plan change the Support assistant proposes, during the pilot; reviewed after it."
- The behaviour document's approval table names what the assistant proposes: "A firm's plan or billing-period change the persona's note described … **yes, during the pilot (AIW-D59)**" (`support-and-account-assistant.md` §4, L181).
- The same document says "AIW-D59 names this assistant only" (L170). So the rule is not widened to other assistants or other acts (review S3a m-1; the Lead's call 8).
- The same document lists "A firm flag override, a security lock, a status change | never proposed by the persona" (L184). Its L170 also names "status", so the two lines disagree. This note follows L181 and L184 and flags the inconsistency to the Lead.
- The pilot safeguards cannot be switched off during the pilot (`00-step3-plan.md` shared rule).
- The gap is the one the proposals row of 10 Oct (Support and account assistant, second person) records: "The product asks for a reason only".

**(5) Knock-ons.**
- SA-07 §3.3 lists this among the per-action rules (CN-SA-07 change 3).
- AW-02 (AW-2-72) cites SA-4-89, not SA-4-75.

---

## 4. Code names for the billing events SA-2 and the account manager consume

**(1) What it changes.** SA-4-59 (L512); §7 Key entities.

**(2) Current words.**

L512:
> - **SA-4-59** *(SA4-X1)* SA-4 emits billing events that SA-2 consumes for firm status and indicators: trial started and ended, overdue started and cleared, payment hold started and ended, cancellation scheduled and undone, subscription ended, first-year refund issued.

**(3) Proposed words.** SA-4-59 gains: "*(changed — events named)* Each event has a stable code name, listed in §7 (names for the team), so the account-manager alerts of SA-2-14a and any platform automation subscribe to them by name."

**(4) Why.** Proposals row of 10 Oct (Support and account assistant, platform tenant rule). The assistant's triggers are SA-10's events "and the alerts to the account manager, whose billing events SA-4-59 names in words only (code names Unknown)".

`support-and-account-assistant.md` §9 G-6 (Unknown). A trigger with no name cannot be written as a recipe (IMP-10: every worker "is specified as triggers → conditions → actions").

**(5) Knock-ons.** SA-02 SA-2-14a (alerts) uses the same names. AW-02 lists them as platform triggers.

---

## 5. Say what `system/billing:view` reads, including the sent-notices record

**(1) What it changes.** SA-04 v2.17 §10 permission table (L752).

**(2) Current words.**

L752:
> | `system/billing:view` | **new** | View subscriptions, invoices, credit notes, overdue list, written-off report, card brand and last 4, price history |

**(3) Proposed words.**

> | `system/billing:view` | **new** | View subscriptions, invoices, credit notes, overdue list, written-off report, card brand and last 4, price history, **and the notices sent to a firm (`BillingNotice`)** |

and, under the table: "*(new note)* SA-07 Appendix A's row 'Plan, entitlement and billing status of a firm (read-only)' (ticked for Platform Owner, Account manager, Billing, Support, Security & audit) maps either to this key or to a narrower read key for one firm's subscription detail and sent notices; the team records the choice in SA-07 Appendix A."

**(4) Why.** `support-and-account-assistant.md` §9 G-19 ("Decision for the team (Step 3 mapping); Unknown"): "`system/billing:view` is broader than the Appendix A row it serves … whether the key covers the sent-notices record (`BillingNotice`, SA-04 v2.14 §7) is Unknown". In v2.17 `BillingNotice` is at L624.

The assistant reads the sent-notices record rather than calculating what a firm was told (change 2; `support-and-account-assistant.md` §2.2 step 3). That depends on this key covering the record.

SA-07 v2.12 Appendix A, L737.

**(5) Knock-ons.** SA-07 Appendix A mapping (CN-SA-07 change 1).

---

## 6. Document control and numbering

**(1) What it changes.** The document-control table (L5 onward) and the numbering line (L32).

**(2) Current words.**

L32 (extract):
> New requirements continue from the highest number (next: SA-4-89).

**(3) Proposed words.**
- A version row: "| 2.18 | *(date placed)* | Workstream 2 change note CN-SA-04 applied: webhook-log split; one statement of the reminder days; second person on the Support and account assistant's plan proposals in the pilot (SA-4-89); billing event code names; `system/billing:view` covers sent notices. | AIW-D59; proposals rows of 10–11 Oct |".
- L32: "(next: SA-4-90)".

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.

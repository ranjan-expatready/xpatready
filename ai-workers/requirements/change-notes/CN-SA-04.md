# Change note CN-SA-04: SaaS Billing

| | |
|---|---|
| **Document changed** | SA-04 SaaS Billing, version 2.14, dated 2026-10-08 |
| **File (9 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-04-saas-billing_v2.14_2026-10-08.md` |
| **Date of this note** | 11 Oct 2026 |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 5 |

**How to read this note.** Each numbered change has five parts: (1) what it changes, by ID, section and line of the 9 Oct snapshot; (2) the current words, quoted exactly; (3) the proposed words, in SA-04's own style; (4) why, pointing to the founder's Workstream 2 decision (`ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*) or the proposals row (`ai-workers/proposals.md`); (5) what else must change.

**Why AI touches this document.** Expat Ready's own Support and account assistant works for a support person or an account manager on one firm's account. It reads a firm's billing state, drafts suggestions, and proposes account changes that a person applies (`ai-workers/design/behaviours/support-and-account-assistant.md`, specified in AW-02). Three of the changes below are things it needs; two (changes 1 and 2) are product risks it exposed that matter with or without AI.

**Not changed.** SA-4-44 ("Nothing is sold outside a plan: there are no add-on prices in Release 1") stands: the founder's pilot arrangement is an allowance inside the plan and the charge unit is decided in Step 5 (AIW-D60).

---

## 1. Split the payment-notification key into "view" and "re-run"

**(1) What it changes.** SA-04 v2.14 SA-4-36 (L456) and §10 permission table (L692).

**(2) Current words.**

L456:
> - **SA-4-36** Users with `system/billing:webhook-log` can view the notification log and re-run failed notifications safely. The endpoint replies quickly and does heavy work in the background.

L692:
> | `system/billing:webhook-log` | **new** | View processor notifications and re-run failed ones |

**(3) Proposed words.**

SA-4-36:
> - **SA-4-36** *(changed — split by act)* Users with `system/billing:webhook-log` can **view** the notification log. Users with **`system/billing:webhook-rerun`** *(new; name for the team to confirm)* can **re-run** failed notifications safely. The endpoint replies quickly and does heavy work in the background.

§10:
> | `system/billing:webhook-log` | **new** | View processor notifications (read-only) |
> | `system/billing:webhook-rerun` | **new** | Re-run failed processor notifications |

**(4) Why.** Proposals row of 10 Oct (Support and account assistant, "Split `system/billing:webhook-log` into a view key and a re-run key … SA-07 Appendix A already splits them into two rows … With one key, mapping the Support row hands Support a re-run, and no read-only delegation can hold the log"). SA-07 v2.10 Appendix A (L734–L735) gives "Payment-processor notification log — view (SA7-D52)" to Platform Owner, Billing, Support and Platform engineer, and "Payment-processor notification — re-run failed" to Platform Owner, Billing and Platform engineer only; SA7-D52 (SA-07 v2.10 L118): "**Support** can view the payment-processor notification log (read-only)." With one key the read-only grant to Support cannot be built as signed off. `support-and-account-assistant.md` §9 G-18 ("Decision for the team").

**(5) Knock-ons.** SA-07 Appendix A rows mapped to the two keys (CN-SA-07 change 1). SA-06 catalogue gains the key (owning module SA-04).

---

## 2. One statement of the failed-payment reminder days

**(1) What it changes.** SA-04 v2.14 applied-decision row SA3-E2 (L72); the clarification paragraph (L87); SA-4-21 (L435).

**(2) Current words.**

L72:
> | **SA3-E2** | SA-3: 14 days' full access after a failed payment, reminders on days 1, 7 and 12, then payment hold | §3.5 · SA-4-20, SA-4-21, SA-4-23 changed |

L87:
> **Clarification recorded in this review.** In SA3-E2, day numbers count from the failure date (day 0), and the "day 1" reminder is the failure notice, sent as soon as the failed charge is recorded. A charge failing on 1 March therefore gives notices on 1, 8 and 13 March, payment hold on 15 March, SA-2's deletion warnings on 31 March, 30 April and 6 June, and deletion on 13 June — matching SA-2 US-3.

L435:
> - **SA-4-21** *(changed v2.1 — SA3-E2, SA4-D10b)* The firm keeps full access for 14 days. Reminders go on days 7 and 12 to the billing email, the owner and the firm's Admins. The processor retries the card automatically within the 14 days and immediately after the owner updates the card. The timeline is a fixed rule in Release 1.

**(3) Proposed words.**

L72:
> | **SA3-E2** | SA-3: 14 days' full access after a failed payment; **the failure notice at once (day 0), then reminders on days 7 and 12**; then payment hold | §3.5 · SA-4-20, SA-4-21, SA-4-23 changed |

L87, first sentence:
> **Clarification recorded in this review.** In SA3-E2, day numbers count from the failure date (day 0); the notice SA-3 called the "day 1" reminder is the **failure notice of SA-4-20**, sent as soon as the failed charge is recorded, and there is no separate day-1 reminder.

SA-4-21, second sentence:
> After the failure notice of SA-4-20, reminders go on days 7 and 12 to the billing email, the owner and the firm's Admins; no other reminder is sent in the 14 days.

**(4) Why.** Proposals row of 11 Oct (Support and account assistant, reminder days): "The failed-payment reminder days are given two ways in two files dated 8 Oct, so README rule 11 ('newer file wins') does not settle it … Recommendation: one statement in SA-02 §3.4 and SA-4-21, naming the day-1 notice as the failure notice." SA-04's own BR-6 (L511) already says "with notices on days 0, 7 and 12", and `BillingNotice.type` (L574) lists `failure, reminder-7, reminder-12`, so the proposed words match what SA-04 builds. `support-and-account-assistant.md` §9 G-24 ("Decision for the team"): until fixed, the assistant reads the sent-notices record instead of calculating what a firm was told.

**(5) Knock-ons.** SA-02 §3.4 (L307) and SA2-X1 (L122) say "days 1, 7 and 12" (CN-SA-02 change 1). SA-03 SA3-E2 (L82) keeps its wording and its existing note "'day 1' = the failure notice".

---

## 3. A second person confirms any account change an AI assistant proposed (pilot)

**(1) What it changes.** SA-4-28 (L446); a new requirement after SA-4-74 (the document's last, L500).

**(2) Current words.**

L446:
> - **SA-4-28** *(changed v2.1 — SA4-D4; v2.8 — SA4-D23)* The Owner (not an Admin) can change plan in the billing screen among Active Public plans; Super Admin can change any firm's plan with a reason; firms on Internal plans change only through Super Admin. The processor computes the price difference; SA-3 entitlements are re-applied when the change takes effect.

**(3) Proposed words.**

New requirement:
> - **SA-4-75** *(new — AIW-D59, for the pilot)* When a change to a firm's account — plan, billing period, cancellation or undo, an approved discount, or a firm status change in SA-2 — was **proposed by an AI assistant** working for a Super Admin user, a **second Super Admin user** SHALL confirm it before the user holding the key applies it with a reason. Nobody confirms a change they requested (SA7-D4). The confirmation, the proposal it came from and the reason are audited on the firm record. This rule applies during the pilot and is reviewed after it.

SA-4-28 gains: "A change proposed by an AI assistant also needs a second person's confirmation (SA-4-75)."

**(4) Why.** AIW-D59, 11 Oct 2026, the founder chose "Yes, for the pilot": "A second Expat Ready person confirms any account or plan change the Support assistant proposes, during the pilot; reviewed after it." The proposals row of 10 Oct (Support and account assistant, second person) states the gap: "The product asks for a reason only: 'Super Admin can change any firm's plan with a reason' (SA-4-28)", and names the nearest existing pattern, "Nobody can approve their own request — enforced per action (SA7-D4)". `support-and-account-assistant.md` §4 and §9 G-9 ("Decided for the pilot (AIW-D59)").

**(5) Knock-ons.** SA-02 §3.3 firm actions (status changes) point to SA-4-75 (CN-SA-02 change 3). SA-07 §3.3 lists this among the per-action rules (CN-SA-07 change 3). The proposal itself, and the fact that the assistant never applies a change, are specified in AW-02.

---

## 4. Code names for the billing events SA-2 and the account manager consume

**(1) What it changes.** SA-4-59 (L485); §7 Key entities (an event list).

**(2) Current words.**

L485:
> - **SA-4-59** *(SA4-X1)* SA-4 emits billing events that SA-2 consumes for firm status and indicators: trial started and ended, overdue started and cleared, payment hold started and ended, cancellation scheduled and undone, subscription ended, first-year refund issued.

**(3) Proposed words.**

SA-4-59 gains: "*(changed — events named)* Each event SHALL have a stable code name, listed in §7 (names for the team), so the account-manager alerts of SA-2-14a and any platform automation subscribe to them by name."

**(4) Why.** Proposals row of 10 Oct (Support and account assistant, platform tenant rule): the persona's triggers are SA-10's events "and the alerts to the account manager, whose billing events SA-4-59 names in words only (code names Unknown)". `support-and-account-assistant.md` §9 G-6 (Unknown: "SA-4-59 names the billing events in words, with no code names"). A trigger with no name cannot be written as a recipe (IMP-10: every worker "is specified as triggers → conditions → actions").

**(5) Knock-ons.** SA-02 SA-2-14a (alerts) uses the same names. AW-02 lists them as platform triggers.

---

## 5. Say what `system/billing:view` reads, including the sent-notices record

**(1) What it changes.** SA-04 v2.14 §10 permission table, first row (L686).

**(2) Current words.**

L686:
> | `system/billing:view` | **new** | View subscriptions, invoices, credit notes, overdue list, written-off report, card brand and last 4, price history |

**(3) Proposed words.**

> | `system/billing:view` | **new** | View subscriptions, invoices, credit notes, overdue list, written-off report, card brand and last 4, price history, **and the notices sent to a firm (`BillingNotice`)** |

and, under the table: "*(new note)* SA-07 Appendix A's row 'Plan, entitlement and billing status of a firm (read-only)' (ticked for Platform Owner, Account manager, Billing, Support, Security & audit) is either mapped to this key or to a narrower read key for one firm's subscription detail and sent notices; the team records the choice in SA-07 Appendix A."

**(4) Why.** `support-and-account-assistant.md` §9 G-19 ("Decision for the team (Step 3 mapping); Unknown"): "`system/billing:view` is broader than the Appendix A row it serves … whether the key covers the sent-notices record (`BillingNotice`, SA-04 v2.14 §7) is Unknown, since its description does not name it". The assistant's rule of reading the sent-notices record rather than calculating (change 2; `support-and-account-assistant.md` §2.2 step 3) depends on this key covering it. SA-07 v2.10 Appendix A, L733.

**(5) Knock-ons.** SA-07 Appendix A mapping (CN-SA-07 change 1).

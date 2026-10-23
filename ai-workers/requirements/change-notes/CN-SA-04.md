# Change note CN-SA-04: SaaS Billing

| | |
|---|---|
| **Document changed** | SA-04 SaaS Billing, version 2.17, dated 2026-10-10 |
| **Current base (15 Oct 2026, snapshot 1535; scrum 4b outcome 0 (e))** | **SA-04 v2.21**, `sources/drive-snapshot-2026-10-13-1535/02-functional-requirements/super-admin/SA-04-saas-billing_v2.21_2026-10-12.md` (identical to the 13 Oct 09:26 copy the re-base row checked). The re-base row says what stands, is withdrawn or is re-aimed; a quote or line number marked re-pointed, corrected or "v2.21" is the current file's; any other is the older version's and is history. |
| **Re-based 13 Oct 2026 (source reconciliation, `decisions.md` rows "Reconciliation renumbering" and "Lead rulings, source reconciliation")** | Checked against **SA-04 v2.21** (12 Oct 2026). **Change 3:** our SA-4-89 was taken by the team ("every billing email is an ExpatReady-owned kind-1 template", L612); renumbered **SA-4-89 → SA-4-92** everywhere in our files (the team's header says "next: SA-4-92", L36); version row 2.18 → **2.22**; L32 "next" → SA-4-93. Change 3 now also covers **a cancellation or its undo** (AIW-D119, 13 Oct 2026) and its applier is **a Billing-role user or the Platform Owner** (SA7-D50: the Admin, the usual account manager, holds no billing-change key). **Change 2 withdrawn, met:** SA-4-21 and §3.5 state the failure notice at day 0 and reminders on days 7 and 12 (TC-131). **Change 1 partly met (corrected 14 Oct 2026 against snapshot 1535; register TC-132):** the requirement asks for a separate re-run key or check, but the key table (L838) still lists one key for view and re-run, so the named re-run key is still asked. SA-4-36 v2.21 says re-running "needs a separate key or check, held by the Owner, Admin and Billing; Support views only" (one built key covers both today, a developer task); our key name `system/billing:webhook-rerun` is a name for the team (TC-132). Billing notices go to two recipient sets (SA-4-53: documents to the billing email; every other notice to billing email, Owner and Admins. *Corrected 14 Oct 2026 against snapshot 1535:* this settles only who receives notices; the two allowance notices TC-56 asks for are not in `BillingNotice` (L693), so TC-56 is **not met** and stays to send). Invoices are viewable by Owner, Admin and Billing (SA4-D35). Line numbers and quotes below are v2.17's. |
| **File (11 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-04-saas-billing_v2.17_2026-10-10.md` |
| **Date of this note** | 11 Oct 2026 (fifth round, after re-check S3a-d) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 6 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the 11 Oct snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-04's own style (plain present tense).
4. Why: the founder decision, improvement or gap behind the change.
5. What else must change.

**Why AI touches this document.** Expat Ready's own Support AI works for a support person or an account manager on one firm's account. It reads a firm's billing state, drafts suggestions and proposes account or plan changes that a person applies (specified in AW-02). Changes 1 and 2 are product risks it exposed; they matter with or without AI.

**Re-base.** The team's v2.15 to v2.17 (10 Oct) added SA-4-75 to SA-4-88. The second-person rule is therefore **SA-4-92**, the next free number (L32: "next: SA-4-92").

**Not changed.** SA-4-44 stands: the charge unit is decided in Step 5 (AIW-D60).

---

## 1. Split the payment-notification key into "view" and "re-run"

> **Partly met (13 Oct 2026; corrected 14 Oct 2026, snapshot 1535: one key still covers view and re-run, L838; register TC-132).** SA-04 v2.21 SA-4-36 and §10 (L545, L826 to L836): re-running "needs a separate key or check, held by the Owner, Admin and Billing; Support views only"; the screen is "Payment events" under Advanced; "One built key covers both today (developer task)". Our key name `system/billing:webhook-rerun` is a name offered to the team, not a requirement (register TC-132). Default holders of the re-run: Owner, Admin, Billing (no Platform engineer).

**(1) What it changed, as first written (history; the box above gives today's state).** SA-04 v2.17 SA-4-36 (L483) and §10 permission table (L758).

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
- Proposals row of 10 Oct (Support AI): "Split `system/billing:webhook-log` into a view key and a re-run key … SA-07 Appendix A already splits them into two rows … With one key, mapping the Support row hands Support a re-run, and no read-only delegation can hold the log".
- SA-07 v2.15 Appendix A L833 gives "Payment-processor notification log — view (SA7-D52; "Payment events" under Advanced)" to Platform Owner, Admin, Support and Billing.
- SA-07 v2.15 Appendix A L834 gives "Payment-processor notification — re-run failed" to Platform Owner, Admin and Billing.
- SA7-D52 (SA-07 v2.15, L123): "**Support** can view the payment-processor notification log (read-only); Owner, Admin and Billing view **and re-run** failed ones."
- AW-2-60 (the 10 Oct design gap on the one notification-log key).

**(5) Knock-ons.**
- SA-07 Appendix A (CN-SA-07 change 1).
- SA-06 catalogue (CN-SA-06 change 4).
- SA-08 v2.7 §10 (L533) repeats the one-key description and adds "Support: read-only view; re-run: Owner, Admin and Billing" as a developer task.

---

## 2. One statement of the failed-payment reminder days

> **Withdrawn 13 Oct 2026: met by the team.** SA-04 v2.21 SA-4-21 (L524) and §3.5 state the failure notice at day 0 and reminders on days 7 and 12; SA-02 v2.24 §3.4 agrees (register TC-131 met). Kept for the record.

**(1) What it changed (history; withdrawn 13 Oct, see the box above).** SA-04 v2.17 applied-decision row SA3-E2 (L80); the clarification paragraph (L96); SA-4-21 (L462).

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
- Proposals row of 11 Oct (Support AI, reminder days): "one statement in SA-02 §3.4 and SA-4-21, naming the day-1 notice as the failure notice".
- BR-6 (L558) already says "with notices on days 0, 7 and 12".
- `BillingNotice.type` (L624) lists `failure, reminder-7, reminder-12`.
- AW-2-70 (the 10 Oct design gap on the reminder days).

**(5) Knock-ons.** SA-02 §3.4 (L315) and SA2-X1 (L130) (CN-SA-02 change 1).

---

## 3. A second person confirms any account or plan change the Support AI proposed, while the second-person part of the founder safeguards setting is on

> **Re-based 13 Oct 2026 (source reconciliation; AIW-D119).** The team's SA-4-89 (v2.21 L612) is "every billing email is an ExpatReady-owned kind-1 template"; our requirement below is **SA-4-92** (old placeholder SA-4-89 = proposed SA-4-92, replaced in every Workstream 2 file). Two additions from the founder's AIW-D119 (13 Oct 2026): (a) the rule covers **a cancellation and its undo** prepared by the platform AI, under SA-04 §3.9's own reason, access-end date, undo window and notices, with no refund implied; (b) the note is prepared only under the delegating user's own key, so the applier and the person for whom it was prepared are a **Billing-role user or the Platform Owner** (SA7-D50: the Admin holds no billing-change key); the confirmer is any other Expat Ready person, and confirmation lends no execution key (AW-02 AW-2-72, AW-2-78). SA-4-28, SA-4-43 and §3 "Cancellation" are unchanged in v2.21 (SA-4-31 adds the "Cancellation confirmation" email to recipient set 2).

**(1) What it changes.** SA-4-28 (L473); §3 "Cancellation" (L388); SA-4-43 (L496); a new requirement **SA-4-92**.

**(2) Current words.**

L473:
> - **SA-4-28** *(changed v2.1 — SA4-D4; v2.8 — SA4-D23)* The Owner (not an Admin) can change plan in the billing screen among Active Public plans; Super Admin can change any firm's plan with a reason; firms on Internal plans change only through Super Admin. The processor computes the price difference; SA-3 entitlements are re-applied when the change takes effect. *(changed v2.16)* A move to a lower plan, by either, is booked only under SA-4-76.

L388 (extract, last sentence):
> Super Admin can cancel or undo on a firm's behalf with a reason.

L496 (extract):
> - **SA-4-43** *(SA4-D1, SA4-D10g)* Super Admin can apply one approved discount to a firm, with a reason

**(3) Proposed words.**

New requirement:
> - **SA-4-92** *(new — AIW-D59)* While the **second-person part** of the **founder safeguards** setting is on (SA-12-37), **any change to a firm's account or plan** that the **Support AI** proposed, working for a Super Admin user, needs a **second Super Admin user** to confirm the assistant's note before the change is applied. This covers a change of **plan** (SA-4-28), of **billing period**, an **approved discount** (SA-4-42, applied under SA-4-43 by a Billing-role user) and a **cancellation or its undo** made on a firm's behalf (§3 "Cancellation"). The user holding the key then applies it, with a reason. The assistant never makes a discount entry itself and never proposes a refund.
>
> Acts that change no account need no second person: re-running a failed notification (SA-4-36) and sending an update-card link (SA-4-24). The assistant never proposes a firm status change.
>
> The person the assistant worked for, who asked for the change, cannot confirm it (SA7-D4, "Nobody can approve their own request"). The confirmation, the note it confirmed and the reason are audited on the firm record.
>
> Only a recorded founder decision naming this part switches the rule off (SA-12-37). A change a person makes without the assistant's note follows SA-4-28, §3 "Cancellation" and SA-4-43 as today.

SA-4-28, SA-4-43 and the §3 "Cancellation" paragraph each gain: "A change of this kind proposed by the Support AI also needs a second person's confirmation while the second-person part of the founder safeguards setting is on (SA-4-92)."

**(4) Why.**
- **AIW-D59**, 11 Oct 2026. The founder chose "Yes, for the pilot": "A second Expat Ready person confirms any account or plan change the Support assistant proposes, during the pilot; reviewed after it."
- **AIW-D59 in its own words.** The Lead's call of 11 Oct (`00-step3-plan.md`, "AIW-D59 in its own words", after AW-02 re-check S3b-c N-15): the rule covers **any account or plan change** (plan, billing period, discount, cancellation); re-running a failed notification or sending an update-card link changes no account and needs no second person; status changes are never proposed. The earlier version of this change covered plan and billing period only; it is widened to the founder's words.
- **Discounts.** The Lead's call of 11 Oct (`00-step3-plan.md`, "Discounts"): on the account manager's request the assistant may write an internal note naming an **approved** discount (SA-4-42), confirmed by a second Expat Ready person before a Billing-role user applies it; it never makes a discount entry and never proposes a refund. The same call says no version 1 recipe drafts a cancellation or its undo; SA-4-92 still covers one if it is ever proposed.
- **Who may confirm.** SA-07's SA7-D4 already says "Nobody can approve their own request — enforced per action" (SA-07 v2.15, L393). The person the assistant worked for asked for the change, so that person cannot confirm it. No further rule (for example that the confirmer must differ from whoever applies the change) is added.
- **A product state, not a period.** A requirement names a part of the *founder safeguards* setting, on from the start and ended only by a recorded founder decision naming that part (`00-step3-plan.md`, "The *founder safeguards* setting" and "No 'during the pilot' in a requirement"). The founder's review after the pilot is where he may end this part by a recorded decision. The setting lives in SA-12-37.
- **Narrow reading.** AIW-D59 names the Support AI only, so the rule is not widened to other assistants.

**(5) Knock-ons.**
- SA-07 §3.3 (CN-SA-07 change 3) uses the same words.
- SA-12-37 holds the founder safeguards setting and its parts (CN-SA-12 change 3).
- AW-02 (AW-2-72) cites SA-4-92.
- *Overtaken 15 Oct 2026:* the behaviour document was folded into AW-02 and deleted (AIW-D152); AW-2-71 and AW-2-72 state the wider scope (cancellation added; discounts as the Lead's "Discounts" call).

---

## 4. Code names for the billing events SA-2 and the account manager consume

**(1) What it changes.** SA-4-59 (L512); §7 Key entities.

**(2) Current words.**

L512:
> - **SA-4-59** *(SA4-X1)* SA-4 emits billing events that SA-2 consumes for firm status and indicators: trial started and ended, overdue started and cleared, payment hold started and ended, cancellation scheduled and undone, subscription ended, first-year refund issued.

**(3) Proposed words.** SA-4-59 gains: "*(changed — events named)* Each event has a stable code name, listed in §7 (names for the team), so the account-manager alerts of SA-2-14a and any platform automation subscribe to them by name."

**(4) Why.**
- Proposals row of 10 Oct (Support AI, platform tenant rule): the account manager's alerts are billing events "SA-4-59 names in words only (code names Unknown)".
- AW-2-69 (the 10 Oct design gap on the alert trigger names).
- IMP-10: every worker "is specified as triggers → conditions → actions".

**(5) Knock-ons.** SA-02 SA-2-14a uses the same names. AW-02 lists them as platform triggers.

---

## 5. Say what `system/billing:view` reads, including the sent-notices record

**(1) What it changes.** SA-04 v2.21 §10 permission table (L832; `system/billing:view` still does not name the sent notices).

**(2) Current words.**

L752:
> | `system/billing:view` | **new** | View subscriptions, invoices, credit notes, overdue list, written-off report, card brand and last 4, price history |

**(3) Proposed words.**

> | `system/billing:view` | **new** | View subscriptions, invoices, credit notes, overdue list, written-off report, card brand and last 4, price history, **and the notices sent to a firm (`BillingNotice`)** |

Add a note under the table: "*(new note)* SA-07 Appendix A's row 'Plan, entitlement and billing status of a firm (read-only)' maps either to this key or to a narrower read key for one firm's subscription detail and sent notices. The team records the choice in SA-07 Appendix A."

**(4) Why.**
- AW-02 §10 (the 10 Oct design gap on `system/billing:view`): "whether the key covers the sent-notices record (`BillingNotice`, SA-04 v2.14 §7) is Unknown" (quoted as written earlier). In SA-04 v2.21 `BillingNotice` is at L693.
- SA-07 v2.15 Appendix A, L832 (Owner, Admin, Support, Billing and Auditor).

**(5) Knock-ons.** SA-07 Appendix A (CN-SA-07 change 1).

---

## 6. Document control and numbering

**(1) What it changes.** The document-control table (L5 onward) and the numbering line (L32).

**(2) Current words.**

L32 (extract):
> New requirements continue from the highest number (next: SA-4-92).

**(3) Proposed words.**
- A version row (renumbered 13 Oct 2026; 2.18 to 2.21 are the team's; change 2 is met and dropped): "| 2.22 | *(date placed)* | Workstream 2 change note CN-SA-04 applied: webhook-log split; one statement of the reminder days; a second person on any account or plan change the Support AI proposes while the second-person part of the founder safeguards setting is on (SA-4-92); billing event code names; `system/billing:view` covers sent notices. | AIW-D59; proposals rows of 10–11 Oct |".
- L32 (v2.21 L36 says "next: SA-4-92"): "(next: SA-4-93)".

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.

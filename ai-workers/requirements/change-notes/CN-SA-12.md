# Change note CN-SA-12: Feature Flags and Platform Configuration

| | |
|---|---|
| **Document changed** | SA-12 Feature Flags & Platform Configuration, version 2.7, dated 2026-10-08 |
| **File (9 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-12-feature-flags-and-platform-configuration_v2.7_2026-10-08.md` |
| **Date of this note** | 11 Oct 2026 |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 2 |

**How to read this note.** Each numbered change has five parts: (1) what it changes, by ID, section and line of the 9 Oct snapshot; (2) the current words, quoted exactly; (3) the proposed words, in SA-12's own style; (4) why, pointing to the founder's Workstream 2 decision (`ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*) or the proposals row (`ai-workers/proposals.md`); (5) what else must change. What each AI assistant does when it stops is specified in AW-01 and AW-02 and the behaviour documents; this note gives SA-12 the switches.

**Plain words used here.** *Kill switch*: SA-12's emergency brake that forces a feature off for every firm at once. *AI persona*: one AI assistant to one human role (Case, Intake, Billing, Firm, Practice expert summary line; and Expat Ready's own Pack author's and Support and account assistants). *Needs you*: the firm's inbox where anything prepared without a person present waits for a person to approve, edit or reject.

---

## 1. AI emergency stops: one for the four AI Doers, one per AI assistant

**(1) What it changes.** A new requirement after SA-12-30 (the document's last, L404–L410); §3.4 "Kill-switch (the emergency brake)" (L235); the `FeatureFlag` catalogue seed (SA-12-1, L342).

**(2) Current words.**

L361:
> - **SA-12-12:** A `killSwitchEligible` flag can be tripped at PLATFORM scope, forcing OFF below all other scopes (precedence 0), with a **mandatory reason**; tripping invalidates cache, audits, notifies the Platform Owner, and pauses in-flight feature work *(changed v2.5 — AG17-D69: for a flag covering client records the kill-switch makes existing records read-only and never pauses reminders; SA-12-30)*. Untripping is a separate audited action. Kill actions require `system/flag:kill`.

L354 (extract):
> - **SA-12-9:** A feature executes only when **entitlement (SA-3) AND flag (SA-12)** both pass, evaluated entitlement-first. Entitlement-deny → `403 FEATURE_NOT_ENTITLED` (commercial/upsell). Flag-deny → `FEATURE_DISABLED` / hidden (operational).

SA-12 names no AI flag anywhere.

**(3) Proposed words.**

New requirement:
> **AI emergency stops** *(added — AG-11 §0.2 SA-12 row; IMP-8)*
> - **SA-12-31:** The catalogue SHALL carry `killSwitchEligible` flags for AI: **one for the four AI Doers together** (Reader, Sorter, Writer, Checker) and **one for each AI assistant** (the five firm assistants and Expat Ready's two platform assistants), keys named by the team. Tripping an AI flag (SA-12-12, mandatory reason) SHALL:
>   - (a) stop new AI work covered by the flag at once and pause queued AI jobs;
>   - (b) end running assistant runs at the next safe point, **never in the middle of a send**;
>   - (c) leave every item already waiting in Needs you **visible and approvable by a person**, marked "AI paused by Expat Ready on <date>: <reason>", because it is a proposal a person still owns — an exception to SA-12-9's hide-or-refuse for this flag family;
>   - (d) show the firm's Owner a banner, and show the stop and its reason beside the firm's own AI switch (AG-16-35);
>   - (e) never affect the product's own deadline and expiry reminders (SA-3-35; the Minder has no AI), nor the Practice expert's rule-built answers, which work with AI off; only the Practice expert's optional summary line sits behind an AI flag.
>
>   The firm's own AI switch and any per-assistant firm setting sit below these flags; a platform stop always wins (SA-12-4).
> - **SA-12-32:** A separate, audited platform action **"Withdraw AI proposals"** SHALL exist for a safety recall: it withdraws chosen waiting AI-prepared items (by firm, assistant, AI Doer or date range), records a reason, audits each withdrawn item, and tells the item's owner it was withdrawn and why. It SHALL never touch anything a person has already approved. Its permission is new, with blast radius **High (all firms)**; the team names the key and its holders (§10; SA-07 Appendix A).

§3.4, after the kill-switch paragraph, add: "For the AI flags (SA-12-31) the kill-switch pauses AI work but never hides waiting proposals: a person can still approve, edit or reject them, and a separate recall action withdraws them (SA-12-32)."

**(4) Why.** The team's AG-11 v1.11 lists this as a pending knock-on (§0.2, L55: "| **SA-12** | Platform kill switch for the AI Doers | Pending |"). IMP-8 specified the stops ("(a) Define the SA-12 switches: one for all four AI Doers and one per AI Worker, each an emergency stop at platform level with a mandatory reason; (b) tripping one pauses queued AI jobs and ends running delegations at the next safe point (never in the middle of a send); (c) items already waiting in Needs you stay visible and approvable by a person, marked 'AI paused by Expat Ready on <date>: <reason>' … a separate platform action, **withdraw AI proposals**, exists for a safety recall and is audited per item; (d) the Owner sees a banner …"), and the passed behaviour documents rely on it: the Support and account assistant's start condition is "The persona's own flag is on and not kill-switched … one flag per persona is IMP-8 (Proposal)" (`support-and-account-assistant.md` §1), the Pack author's assistant's kill switch sits under `system/flag:kill` (`pack-authors-assistant.md` §4), and the Case, Intake and Firm documents measure "items withdrawn (IMP-8)" (§6 of each). Point (e) follows AIW-D37 (the deadline watch "is the product's own Minder … never as AI") and AIW-D54 item 10 ("the expert's answers work with AI off").

**(5) Knock-ons.** AG-16-35 and AG-16 §13 Q7 and Q9 (what the Owner sees; what happens to waiting items) close against SA-12-31 (CN-AG-16). AG-11 §0.2 SA-12 row marked applied (CN-AG-11). SA-07 Appendix A maps the new keys (row "Integration credentials · feature flags · operational settings" for the flags; the recall key named by the team). SA-08 SA-8-38 (withdrawing the provider entry stops AI the same way; CN-SA-08 change 2). AW-01 and AW-02 specify each assistant's stop behaviour.

---

## 2. Permission row for the recall action

**(1) What it changes.** SA-12 v2.7 §10 permission table (L559–L569) and its role-mapping paragraph (L571).

**(2) Current words.**

L564:
> | `system/flag:kill` | Trip/untrip a PLATFORM kill-switch | **High (all firms)** |

L571 (extract):
> Platform Engineer holds toggle/rollout, config-manage (operational settings), maintenance, and kill (kill possibly gated by an extra confirmation, Q3).

**(3) Proposed words.**

Add a row below `system/flag:kill`:
> | *(new key, name to assign)* | Withdraw waiting AI-prepared items for a safety recall (SA-12-32), with reason; audited per item | **High (all firms)** |

Role mapping gains: "The AI recall key is held by the Platform Owner; whether the Platform Engineer also holds it is the team's call, recorded in SA-07 Appendix A."

**(4) Why.** IMP-8(c) (the recall is "a separate platform action … audited per item"); SA-12's own rule that permissions are "split by **blast radius** (viewing ≠ toggling ≠ killing ≠ maintenance)" (L557). Holding it on the Platform Owner follows SA-12's existing pattern that the Platform Owner "holds everything plus the confirmation authority on the most dangerous switches" (L571).

**(5) Knock-ons.** SA-07 Appendix A row (CN-SA-07 change 1). SA-06 catalogue gains the key (owning module SA-12).

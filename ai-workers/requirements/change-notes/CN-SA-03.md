# Change note CN-SA-03: Subscription Plans and Entitlements

| | |
|---|---|
| **Document changed** | SA-03 Subscription Plans & Entitlements, version 2.14, dated 2026-10-07 |
| **File (9 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-03-subscription-plans-and-entitlements_v2.14_2026-10-07.md` |
| **Date of this note** | 11 Oct 2026 |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 2 |

**How to read this note.** Each numbered change has five parts: (1) what it changes, by ID, section and line of the 9 Oct snapshot; (2) the current words, quoted exactly; (3) the proposed words, in SA-03's own style; (4) why, pointing to the founder's Workstream 2 decision (`ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*) or the proposals row (`ai-workers/proposals.md`); (5) what else must change.

**Plain words used here.** *Product map*: SA-03's master list of every firm-app module, tab and action, switched on or off per plan (SA3-D3). *Limit row*: one `(metric, limit, mode, unit?)` entry on a plan (SA-3-4). *Spend cap*: a ceiling on what AI model calls may cost per firm, per person or per run. *Prepared file*: one Case assistant run on one case whose readiness report the case officer accepted (IMP-18; the pricing unit itself is decided in Step 5, AIW-D60).

**What is not changed.** No price and no add-on is proposed: SA-4-44 ("Nothing is sold outside a plan: there are no add-on prices in Release 1") stands, and the founder's pilot arrangement is an allowance inside the plan (AIW-D60). The always-on list (SA3-D3a, SA-3-35) is unchanged: the deadline watch is the product's own Minder, with no AI (AIW-D37), so it stays always on and is never behind an AI item.

---

## 1. Product-map items for AI

**(1) What it changes.** A new requirement after SA-3-49 (the document's last, L405); §3.3 "The product map" (L263 onward); §0.2 SA3-X3 (L86).

**(2) Current words.**

L390:
> - **SA-3-31** *(SA3-D3)* Each plan version holds an on/off state for every product-map item, editable by Super Admin without a code release. No item is hardcoded as included, except the always-on items of SA-3-35.

L397:
> - **SA-3-38** *(SA3-D3d; changed v2.12 — AG17-D59)* Except the corporate-case items, which are always on (SA-3-35), an item newly added to the product map is off on every existing plan, even where its parent is on, and is listed under "New — needs a decision" with reminders until decided on every plan. A release never changes the state of an existing item on any plan.

The product map has no AI item today (IMP-9).

**(3) Proposed words.**

New requirement:
> - **SA-3-50** *(new — IMP-9; AIW-D37, AIW-D54, AIW-D61)* The product map SHALL hold these AI items, each a module-level item with declared dependencies (SA-3-37):
>   - **AI Doers** (Reader, Sorter, Writer, Checker): one item;
>   - one item per **firm AI assistant**: Case assistant, Intake assistant, Billing assistant, Firm assistant, each depending on *AI Doers*;
>   - **Practice expert summary line**: one item, depending on *AI Doers*. The Practice expert's rule-built answers are a reporting item of AG-14, not an AI item, and work with AI off.
>
>   Like every new item they start **off on every plan** and appear under "New — needs a decision" (SA-3-38). A plan item says only that the firm *may* use the feature; the firm's own one-time AI switch (AG-16-35) stays a separate consent act by the Owner and is not an entitlement. Expat Ready's own AI assistants (Pack author's, Support and account) are not firm-facing and have no product-map item. The standard deadline and expiry reminders stay always-on (SA-3-35) and are never placed under an AI item.

§0.2 SA3-X3 (L86) note: "AI items registered by Workstream 2 (SA-3-50)."

**(4) Why.** IMP-9: "Put AI on the product map as items (SA-3-31): the four AI Doers as one item, each AI Worker as its own item, the co-pilot as its own item; each off on existing plans until added (SA-3-38) … Keep the one firm **consent** switch (AG-16-35) as a consent act, not an entitlement." The team's AG-11 v1.11 lists it as pending (§0.2, L56: "| **SA-03** | Which AI Doers / volumes are plan-gated (standard deadline reminders stay never-gated, AG-11-48) | Pending |"); SA-03's own SA3-D3 already closed the "entitlement tiers" question for AG-11 (L42), so only the items are missing. The Practice expert's document relies on it ("Whether the expert is on at all (a product-map item on the plan)", `practice-expert.md` §4, IMP-9), and AIW-D62 records that who may ask the expert is "any staff the firm allows". The split between the rule-built answers and the summary line is the founder's AIW-D39 ("The rule-built answers go to Workstream 1 as a change note to AG-14; Workstream 2 keeps the summary line") and AIW-D54 item 10 ("the expert's answers work with AI off"). The deadline watch staying always-on is AIW-D37. The platform assistants are "never sold" (AIW-D61). FD-16 (Founder Decisions Log v1.5, L52) already says "AI features are ordinary capabilities in the Capability Registry (`cap.ai.*`), plan-gated, per-tenant opt-in", which these items implement.

**(5) Knock-ons.** AG-11 §0.2 SA-03 row and AG-11-39 ("AI Doers and AI volumes MAY be plan-gated once SA-03 decides") point to SA-3-50 (CN-AG-11). AG-16-35 (the one firm AI switch) is unchanged. AG-14 owns the Practice expert's rule-built answers (CN-AG-14). Which plans get which item is the product owners' launch configuration (§13 note, L662) with the founder's Step 5 pricing.

---

## 2. AI usage measures and spend caps as limit rows

**(1) What it changes.** SA-3-4 (L347); a new requirement after SA-3-50 (change 1).

**(2) Current words.**

L347:
> - **SA-3-4** *(changed v2.8 — SA3-A5)* Each plan version carries limits as `(metric, limit, mode, unit?)` entries for at least: staff users; individual clients; corporate clients; active cases by group (individual / corporate; the group comes from the program's client type, SA-1-60; family cases count as individual); auto-prefilled forms and retainer agreements by group; document storage (value + MB/GB/TB); tasks; messages; time-and-activity entries. `null` = unlimited; `0` = none allowed.

L593:
> - **Limits as rows:** a new metered metric is configuration, not a migration.

**(3) Proposed words.**

SA-3-4: the list of metrics gains "**AI usage: model calls; pages read by the Reader; prepared files (Case assistant); Practice expert summary lines; AI spend per firm per month (in CAD)** *(changed — IMP-9, IMP-36)*".

New requirement:
> - **SA-3-51** *(new — IMP-9, IMP-36; AIW-D60, AIW-D62)* The AI usage metrics of SA-3-4 SHALL be counted for every firm from the first AI call, whatever the plan says, so usage is measured during the pilot. Their limits default to `null` (unlimited) until the founder sets them after the pilot. The **AI spend** metric is a **spend cap**: when set, it warns the firm at 80 % and stops new AI work at 100 %, after which the work falls back to the manual path (AG-11-71); a per-person daily cap for Practice expert summary lines and a per-run cap follow the same rule. A spend cap never stops the product's own non-AI work, deadline and expiry reminders included (SA-3-35).

**(4) Why.** IMP-9: "Add usage measures as SA-03 limit rows: model calls, pages read, prepared files, co-pilot questions"; IMP-36: spend caps "per firm per month (a warning at 80 %, a hard stop at 100 %, then the manual path, AG-11-71), per co-pilot user per day, per worker run … Caps are SA-03 limit rows so plans can carry them (IMP-9)". The passed behaviour documents rely on both ("the caps are plan limit rows (IMP-9). The cap values per firm and per person are decided after the pilot, with today's defaults meanwhile (decided 11 Oct 2026, AIW-D62)", `case-assistant.md` §6; also `practice-expert.md` §6, `billing-assistant.md` §6, `firm-assistant.md` §6). AIW-D60: "Only the Case assistant is costed; the others ride inside the plan for the pilot, usage measured." AIW-D62: spend caps are "Decided after the pilot, with today's defaults meanwhile". SA-03's own §11 (L593) says a new metered metric is configuration. The prepared-file metric counts; pricing it is Step 5 (AIW-D60; IMP-18 defines the unit).

**(5) Knock-ons.** SA-04 is unchanged until Step 5 decides the charge unit (SA-4-44 stands). AG-11-71 (manual path) is the fallback named here. SA-09 platform analytics may show the same counts (not covered by this note). The per-run cap and the run record are specified in AW-01.

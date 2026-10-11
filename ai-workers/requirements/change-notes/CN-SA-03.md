# Change note CN-SA-03: Subscription Plans and Entitlements

| | |
|---|---|
| **Document changed** | SA-03 Subscription Plans & Entitlements, version 2.17, dated 2026-10-10 |
| **File (11 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-03-subscription-plans-and-entitlements_v2.17_2026-10-10.md` |
| **Date of this note** | 11 Oct 2026 (fix round after review S3a; re-based from v2.14 to v2.17) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 4 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the 11 Oct snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-03's own style (plain present tense).
4. Why: the founder's decision (`ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*) or the proposals row (`ai-workers/proposals.md`).
5. What else must change.

**What changed on 10 Oct, and what that does to this note.** SA-03 v2.16 and v2.17 replaced the product map with a **feature catalogue**. A feature is one module, or a named "extra" inside a module (SA3-D10, §3.3). The four AI Doers are already in it, as one sellable extra with one firm switch:
> row 30 (L345): "| 30 | AI Doers (Reader, Sorter, Drafter, Checker — one switch, AG-16-35) | extra · Company settings *(corrected: one firm switch for all four)* | Sellable — locked off until the provider terms are recorded (AG11-D13) | AG-10, AG-11, AG-16 |"

The team also limited plans to **four limits** (SA3-D14, L74: "**Four limits only:** staff seats, active individual cases, active corporate cases, document storage.").

So:
- the first version's "AI product-map items" become a proposal **inside** the catalogue (change 2), not a parallel map;
- the first version's "AI usage measures and spend caps as limit rows" are **withdrawn** from this note. SA3-D14 is a later team decision, and IMP-9 and IMP-36 were only proposals. AG-11 v1.12 records the same: "volumes are not plan limits (SA3-D14)" (§0.2, L57).
- AI usage is counted in platform analytics (CN-SA-09); spend caps are platform settings (CN-SA-12 change 3).

AW-01 AW-1-54 ("caps SHALL be plan limit rows") and AW-1-57 ("its own item on the platform's product map") are to be corrected to match. Where a change note and AW differ, the change note wins (`00-step3-plan.md`, "One home per rule").

**Not changed.**
- SA-4-44 / the plan prices: the charge unit is decided in Step 5 (AIW-D60).
- Row 2 (Minder, always on) stays as it is: the deadline watch is the product's own, with no AI (AIW-D37).
- Row 26's WhatsApp part is Phase 2 (SA-08 v2.4 SA8-X11, the team's own pending knock-on); no AI change relies on it.

---

## 1. Row 30 names the AI writer Writer

**(1) What it changes.** §3.3 Release 1 catalogue, row 30 (L345).

**(2) Current words.** Row 30, quoted above.

**(3) Proposed words.** "AI Doers (Reader, Sorter, **Writer**, Checker — one switch, AG-16-35)", with "*(changed — FD-8 as amended; AIW-D53)*".

**(4) Why.** AIW-D53, the founder chose "Writer": "The AI Doer that drafts messages and letters for a person to approve is named **Writer**; the four AI Doers are Reader, Sorter, Writer, Checker. *Drafter* stays the template engine." The FD-8 amendment is in CN-FDL change 2.

**(5) Knock-ons.** AG-10, AG-11 and AG-16 rename the same way (CN-AG-10, CN-AG-11, CN-AG-16).

---

## 2. Proposal: the AI assistants as extras in the feature catalogue

**(1) What it changes.** §3.3 Release 1 catalogue (after row 30, L345); §3.3 "Rules" (L349–L354); a new requirement after SA-3-62 (the document's last, L544).

**(2) Current words.**

L351:
> - **Extras follow their module (SA-3-51).** An extra is off whenever its module feature is off; an extra cannot be switched on while its module is off.

L352 (extract):
> a feature newly added to the catalogue is off on every existing plan and appears in a **"New — needs a decision"** list with a reminder until each plan has a decision.

**(3) Proposed words.** *Proposal.*

Five catalogue rows:
> | 31 | Case assistant | extra · Company settings | *Step 5 decides (AIW-D60)* — works only while row 30 is on | AW-01 |
> | 32 | Intake assistant | extra · Company settings | *as row 31* | AW-01 |
> | 33 | Billing assistant | extra · Company settings | *as row 31* | AW-01 |
> | 34 | Firm assistant | extra · Company settings | *as row 31* | AW-01 |
> | 35 | Practice expert summary line | extra · Reports | *as row 31* — the Practice expert's rule-built answers are part of Reports (row 19) and work with AI off | AW-01, AG-14 |

New requirement:
> - **SA-3-63** *(new — IMP-9; proposal)* An AI assistant extra (rows 31–35) resolves off whenever the AI Doers extra (row 30) is off, and cannot be switched on while it is off, in addition to SA-3-51. Expat Ready's own AI assistants (Pack author's, Support and account) are not firm features and have no row.

Like every new feature, rows 31–35 start off on every plan (SA-3-38).

**(4) Why.**
- IMP-9 proposed one plan item per assistant beside the four AI Doers, keeping "the one firm **consent** switch (AG-16-35) as a consent act, not an entitlement". It is relied on by the Practice expert's document ("Whether the expert is on at all (a product-map item on the plan)", `practice-expert.md` §4). The Lead's call of 11 Oct places it inside the new catalogue.
- AIW-D60: "Only the Case assistant is costed; the others ride inside the plan for the pilot, usage measured". Whether rows 31–35 are sellable or in every plan is therefore a Step 5 decision, not proposed here.
- AIW-D39 and AIW-D54 item 10: the expert's rule-built answers go to AG-14 and work with AI off.
- AIW-D61: the platform assistants are "never sold".

**(5) Knock-ons.** AG-16 holds the per-assistant firm switches under the one AI switch (CN-AG-16). AW-01 AW-1-57 is corrected to cite rows 31–35 and SA-3-63. SA-06: every assistant's keys name their feature (SA-3-52).

---

## 3. An AI assistant's delegation takes no seat

**(1) What it changes.** SA-3-41 (L517); §3.2 "Seat counting" (L296).

**(2) Current words.**

L517:
> - **SA-3-41** *(SA3-U2; changed v2.9 — AG1-D3)* Seats count active users, suspended users and pending invitations; deactivated and deleted users do not count. A suspended user keeps the seat until reactivated or deactivated; deactivating frees it, and deleting a deactivated user never takes a seat back. Sending an invitation that would exceed the seat limit is refused; a cancelled or expired invitation frees its seat.

**(3) Proposed words.** SA-3-41 and L296 each gain: "*(changed — AIW-D33; IMP-1)* An AI assistant's delegation is not a user and never counts as a seat."

**(4) Why.**
- AIW-D33: the delegation record has "no identity and no permissions of its own" and is consistent with FD-16.
- IMP-1 rule 3: "a delegation **takes no seat** and is metered by the work it does, not per delegation".
- The Agent-plane note CN-AG-01 change 1 adds the same sentence to AG-1-13 and names this requirement as its Super Admin half.

**(5) Knock-ons.** AG-01 AG-1-13 (CN-AG-01).

---

## 4. Document control and numbering

**(1) What it changes.** The document-control table (L5 onward) and the numbering line (L32).

**(2) Current words.**

L32 (extract):
> New requirements continue from SA-3-27.

**(3) Proposed words.**
- A version row: "| 2.18 | *(date placed)* | Workstream 2 change note CN-SA-03 applied: row 30 names the Writer; AI assistant extras (rows 31–35, SA-3-63), proposal; a delegation takes no seat (SA-3-41). | AIW-D33, AIW-D53, IMP-9 |".
- L32: "New requirements continue from SA-3-64."

The highest number in use is SA-3-62 (L544).

**(4) Why.** Review S3a m-20(b), (c).

**(5) Knock-ons.** None.

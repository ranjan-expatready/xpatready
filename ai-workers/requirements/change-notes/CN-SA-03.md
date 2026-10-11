# Change note CN-SA-03: Subscription Plans and Entitlements

| | |
|---|---|
| **Document changed** | SA-03 Subscription Plans & Entitlements, version 2.17, dated 2026-10-10 |
| **File (11 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-03-subscription-plans-and-entitlements_v2.17_2026-10-10.md` |
| **Date of this note** | 11 Oct 2026 (second fix round, after re-check S3a-b) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 5 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the 11 Oct snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-03's own style (plain present tense).
4. Why: the founder's decision (`ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*) or the proposals row (`ai-workers/proposals.md`).
5. What else must change.

**What changed on 10 Oct.** SA-03 v2.16 and v2.17 replaced the product map with a **feature catalogue** (SA3-D10, §3.3). A feature is either a module or a named *extra* inside one. The four AI Doers are one sellable extra, row 30:

> row 30 (L345): "| 30 | AI Doers (Reader, Sorter, Drafter, Checker — one switch, AG-16-35) | extra · Company settings *(corrected: one firm switch for all four)* | Sellable — locked off until the provider terms are recorded (AG11-D13) | AG-10, AG-11, AG-16 |"

Plans have **four limits** only (SA3-D14, L74). As a result, AI usage measures and spend caps are not plan limits:
- AI usage is counted in platform analytics (CN-SA-09);
- spend caps are platform settings (CN-SA-12 change 3).

AW-01 AW-1-54 and AW-1-57 are corrected to match (`00-step3-plan.md`, "One home per rule").

**Not changed.**
- SA-4-44 and plan prices: the charge unit is decided in Step 5 (AIW-D60).
- Row 2 (Minder, always on): the deadline watch is the product's own, with no AI (AIW-D37).
- Row 26's WhatsApp part is Phase 2 (SA-08 v2.4 SA8-X11, the team's own pending knock-on). No AI change relies on it.

---

## 1. Row 30 names the AI writer Writer

**(1) What it changes.** §3.3 Release 1 catalogue, row 30 (L345).

**(2) Current words.** Row 30, quoted above.

**(3) Proposed words.** "AI Doers (Reader, Sorter, **Writer**, Checker — one switch, AG-16-35)". Annotate the row: *(changed — FD-8 as amended; AIW-D53)*.

**(4) Why.** AIW-D53. The founder chose "Writer": "The AI Doer that drafts messages and letters for a person to approve is named **Writer**; the four AI Doers are Reader, Sorter, Writer, Checker. *Drafter* stays the template engine." The FD-8 amendment is in CN-FDL change 2.

**(5) Knock-ons.** AG-10, AG-11 and AG-16 rename the same way (CN-AG-10, CN-AG-11, CN-AG-16).

---

## 2. Proposal: the AI assistants as extras in the feature catalogue

**(1) What it changes.**
- §3.3 Release 1 catalogue (after row 30, L345);
- §3.3 "How it works", the extras sentence (L306);
- §3.3 "Rules" (L351);
- a new requirement after SA-3-62 (the document's last, L544).

**(2) Current words.**

L306 (extract):
> An extra is off whenever its module feature is off; that is the only parent rule.

L351:
> - **Extras follow their module (SA-3-51).** An extra is off whenever its module feature is off; an extra cannot be switched on while its module is off.

**(3) Proposed words.** *Proposal.*

Five catalogue rows:
> | 31 | Case assistant | extra · Company settings | *Step 5 decides (AIW-D60)* — works only while row 30 is on | AW-01 |
> | 32 | Intake assistant | extra · Company settings | *as row 31* | AW-01 |
> | 33 | Billing assistant | extra · Company settings | *as row 31* | AW-01 |
> | 34 | Firm assistant | extra · Company settings | *as row 31* | AW-01 |
> | 35 | Practice expert summary line | extra · Reports | *as row 31*; the Practice expert's rule-built answers are part of Reports (row 19) and work with AI off | AW-01, AG-14 |

New requirement:
> - **SA-3-63** *(new — IMP-9; proposal)* An AI assistant extra (rows 31–35) resolves off whenever the AI Doers extra (row 30) is off, and cannot be switched on while it is off, in addition to SA-3-51. Expat Ready's own AI assistants (Pack author's, Support and account) are not firm features and have no row.

L306 becomes: "… that is the only parent rule, except SA-3-63 (an AI assistant extra also follows the AI Doers extra)."

L351 gains: "AI assistant extras also follow row 30 (SA-3-63)."

Like every new feature, rows 31–35 start off on every plan (SA-3-38).

**(4) Why.**
- IMP-9 proposed one plan item per assistant beside the AI Doers, keeping "the one firm **consent** switch (AG-16-35) as a consent act, not an entitlement". The Practice expert's document relies on it ("Whether the expert is on at all (a product-map item on the plan)", `practice-expert.md` §4). The Lead's call of 11 Oct places it inside the catalogue.
- AIW-D60: "Only the Case assistant is costed; the others ride inside the plan for the pilot, usage measured". Whether rows 31–35 are sellable is a Step 5 decision.
- AIW-D39 and AIW-D54 item 10: the expert's rule-built answers go to AG-14 and work with AI off.
- AIW-D61: the platform assistants are "never sold".
- The parent-rule exception at L306 answers re-check S3a-b m-8.

**(5) Knock-ons.**
- **Disagreement for the Lead.** CN-AG-16 change 4 (AG-16-57) calls the per-assistant switches "firm settings inside the one AI Doers extra, not plan features (SA-03 catalogue row 30)". This change proposes them as catalogue extras. The two notes must say one thing. If the Lead keeps AG-16-57's reading, this change is withdrawn and row 30 alone gates the assistants.
- AW-01 AW-1-57 cites rows 31–35 and SA-3-63, or AG-16-57, whichever the Lead keeps.
- SA-06: every assistant key names its feature (SA-3-52).

---

## 3. An AI assistant's delegation takes no seat

**(1) What it changes.** SA-3-41 (L517); §3.2 "Seat counting" (L296).

**(2) Current words.**

L517:
> - **SA-3-41** *(SA3-U2; changed v2.9 — AG1-D3)* Seats count active users, suspended users and pending invitations; deactivated and deleted users do not count. A suspended user keeps the seat until reactivated or deactivated; deactivating frees it, and deleting a deactivated user never takes a seat back. Sending an invitation that would exceed the seat limit is refused; a cancelled or expired invitation frees its seat.

**(3) Proposed words.** SA-3-41 and L296 each gain: "*(changed — AIW-D33; IMP-1)* An AI assistant's delegation is not a user and never counts as a seat."

**(4) Why.**
- AIW-D33: the delegation record has "no identity and no permissions of its own".
- IMP-1 rule 3: "a delegation **takes no seat**".
- CN-AG-01 change 1 names this requirement as its Super Admin half.

**(5) Knock-ons.** AG-01 AG-1-13 (CN-AG-01).

---

## 4. Extra employer seats are in Release 1 (AIW-D67)

**(1) What it changes.**
- SA3-D20 (L80);
- §0.1 deferral row (L90);
- §0.2 SA3-X8 (L112);
- §3.3, the paragraph after the catalogue (L347).

**(2) Current words.**

L80:
> | **SA3-D20** | **Extra corporate portal seats** (more employer contacts with portal access — AG-15-12) are **not in Release 1** (AG17-D38); when built they become one on/off extra, not a fifth limit. | §3.3 · §0.2 SA3-X8 |

L90:
> | Extra corporate portal seats as a plan extra *(added v2.16)* | SA3-D20 — not in Release 1 (AG17-D38) | AG-15-12 is built |

L112 (extract, requirement text and status):
> Custom portal domain, advanced portal branding and portal auto-nudge playbooks are named extras in the feature catalogue. Extra corporate seats are not in Release 1; when built they become one on/off extra. | **Applied in AG-15 v1.7** |

L347 (extract):
> Extra corporate portal seats are not in Release 1 (SA3-D20).

**(3) Proposed words.**
- **SA3-D20:** "**Extra corporate portal seats** (more employer contacts with portal access — AG-15-12) **are in Release 1** *(Release 1 timing changed by AIW-D67, the founder, 11 Oct 2026; was "not in Release 1", AG17-D38)*; they are one on/off extra, not a fifth limit."
- **§0.1 (L90):** the row is removed from the deferral table and kept as a struck line: "~~Extra corporate portal seats as a plan extra — not in Release 1~~ *(withdrawn — AIW-D67)*".
- **SA3-X8 (L112):** "Extra corporate seats are in Release 1 (AIW-D67) as one on/off extra." Status: "Pending — AG-15 to re-apply (CN-AG-15)".
- **L347:** "Extra corporate portal seats are one on/off extra, available from Release 1 (SA3-D20, AIW-D67)."
- **The catalogue** gains a row for the seats extra: "| 36 | Extra corporate portal seats | extra · Client portal | *the team decides at launch configuration (SA-3-38)* | AG-15 |".

**(4) Why.**
- AIW-D67, 11 Oct 2026. The founder chose "Full employer actions at launch": "the employer actions the client portal document specifies (upload, pay, sign, seat management) in Release 1".
- AG17-D38 is a team decision. A team file never overrides a founder decision (README §0 rule 11).
- CN-AG-15 changes 1 and 2 apply the decision in AG-15 and name SA-03 as the Super Admin half (SA3-D20 annotated "Release 1 timing changed by AIW-D67").
- SA3-D20's shape (one on/off extra, not a limit) is kept, because the founder decided the timing, not the price. Whether a launch plan includes the extra is the team's launch configuration (SA-3-38; §13 note L662).
- Re-check S3a-b R-1.

**(5) Knock-ons.**
- AG-15 (CN-AG-15).
- AG-17 AG17-D38 (the Agent-plane note).
- **Unknown:** where the corporate portal seat keys live. SA-06 v3.3 §10c lists no `portal/corporate:*` key and points portal keys to CP-01 (`FINAL-ClientPortal-FR/CP-01-client-portal-app_v0.1_2026-10-05.md`), which is not on Drive (`08-client-portal/NOT-FOUND.md`). They are named once CP-01 is found.
- The charter edit for AIW-D67 is in `ai-workers/charter-edits.md` §3.

---

## 5. Document control and numbering

**(1) What it changes.** The document-control table (L5 onward) and the numbering line (L32).

**(2) Current words.**

L32 (extract):
> New requirements continue from SA-3-27.

**(3) Proposed words.**
- A version row: "| 2.18 | *(date placed)* | Workstream 2 change note CN-SA-03 applied: row 30 names the Writer; AI assistant extras (rows 31–35, SA-3-63; proposal); a delegation takes no seat (SA-3-41); extra corporate portal seats in Release 1 (SA3-D20, row 36; AIW-D67). | AIW-D33, AIW-D53, AIW-D67, IMP-9 |".
- L32: "New requirements continue from SA-3-64."

The highest number in use is SA-3-62 (L544).

**(4) Why.** Review S3a m-20(b), (c).

**(5) Knock-ons.** None.

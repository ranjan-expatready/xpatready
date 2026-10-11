# Change note CN-SA-03: Subscription Plans and Entitlements

| | |
|---|---|
| **Document changed** | SA-03 Subscription Plans & Entitlements, version 2.17, dated 2026-10-10 |
| **File (11 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-03-subscription-plans-and-entitlements_v2.17_2026-10-10.md` |
| **Date of this note** | 11 Oct 2026 (fourth round, after re-check S3a-c) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 4 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the 11 Oct snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-03's own style (plain present tense).
4. Why: the founder's decision (`ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*) or the proposals row (`ai-workers/proposals.md`).
5. What else must change.

**What changed on 10 Oct, and what that does to this note.** SA-03 v2.16 and v2.17 replaced the product map with a **feature catalogue** (SA3-D10, §3.3). The four AI Doers are **one sellable extra with one firm switch**, row 30:
> row 30 (L345): "| 30 | AI Doers (Reader, Sorter, Drafter, Checker — one switch, AG-16-35) | extra · Company settings *(corrected: one firm switch for all four)* | Sellable — locked off until the provider terms are recorded (AG11-D13) | AG-10, AG-11, AG-16 |"

Plans have **four limits** only (SA3-D14, L74).

**Not proposed: catalogue rows per assistant.** Each firm assistant is a firm setting under Advanced (AG-16-57, CN-AG-16), not a catalogue row. The two earlier versions of this note proposed rows 31–35 and SA-3-63; both are **withdrawn**. SA-3-63 had no job without those rows. Pricing per assistant is decided after the pilot (AIW-D60, D62; `00-step3-plan.md`, "Assistants are firm switches, not plan features").

**AI usage and spend caps** are not plan limits:
- usage is counted in platform analytics (CN-SA-09);
- the spend caps and the approve-all safeguard values are platform settings (CN-SA-12 change 3).

**Not changed.**
- SA-4-44 and plan prices (AIW-D60).
- Row 2, the Minder, always on (AIW-D37).
- Row 26's WhatsApp part is Phase 2 (SA-08 v2.4 SA8-X11, L103, the team's own pending knock-on).

---

## 1. Row 30 names the AI writer Writer

**(1) What it changes.** §3.3 Release 1 catalogue, row 30 (L345).

**(2) Current words.** Row 30, quoted above.

**(3) Proposed words.** "AI Doers (Reader, Sorter, **Writer**, Checker — one switch, AG-16-35)", marked *(changed — FD-8 as amended; AIW-D53)*.

**(4) Why.** AIW-D53. The founder chose "Writer": "The AI Doer that drafts messages and letters for a person to approve is named **Writer**; the four AI Doers are Reader, Sorter, Writer, Checker. *Drafter* stays the template engine." The FD-8 amendment is in CN-FDL change 2.

**(5) Knock-ons.** AG-10, AG-11 and AG-16 rename the same way (CN-AG-10, CN-AG-11, CN-AG-16).

---

## 2. An AI assistant's delegation takes no seat

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

## 3. Extra employer seats are in Release 1 (AIW-D67)

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
- **§0.1 (L90):** the row is struck and kept: "~~Extra corporate portal seats as a plan extra — not in Release 1~~ *(withdrawn — AIW-D67)*".
- **SA3-X8 (L112):** "Extra corporate seats are in Release 1 (AIW-D67) as one on/off extra." Status: "Pending — AG-15 to re-apply (CN-AG-15)".
- **L347:** "Extra corporate portal seats are one on/off extra, available from Release 1 (SA3-D20, AIW-D67)."
- **The catalogue gains one row:** "| 31 | Extra corporate portal seats | extra · Client portal | *the team decides at launch configuration (SA-3-38)* | AG-15 |". It follows the client portal module (SA-3-51); no new parent rule.

**(4) Why.**
- AIW-D67, 11 Oct 2026. The founder chose "Full employer actions at launch": "the employer actions the client portal document specifies (upload, pay, sign, seat management) in Release 1".
- AG17-D38 is a team decision; a team file never overrides a founder decision (README §0 rule 11).
- CN-AG-15 changes 1 and 2 apply the decision in AG-15 and name SA-03 as the Super Admin half.
- SA3-D20's shape (one on/off extra, not a limit) is kept: the founder decided the timing, not the price.
- Whether a launch plan includes the extra is the team's launch configuration (SA-3-38; the §13 note at L829: "Not an open requirement — launch plan configuration").
- Re-check S3a-b R-1; `00-step3-plan.md`, "Extra employer seats".

**(5) Knock-ons.**
- AG-15 (CN-AG-15); AG-17 AG17-D38 (the Agent-plane note).
- **Seat keys: gated by E-1, now on the Release 1 path.** Doc 4 names the key: CP-9-10 (L3066) says "A seat holding `portal/corporate:seat-manage` SHALL invite/list/capability-grant/request-removal of seats under the SAME organisation only". CN-AG-15 change 1 cites the same key. SA-06 v3.3 does not yet catalogue it, and the Founder Decisions Log's E-1 (L362–L367, an item for the human architect) says: "SA-6 does not yet catalog `portal/corporate:*` keys or portal-corporate role templates" and "**Blocks build?** Yes". Because of AIW-D67, E-1 now gates Release 1 seat management. **Unknown:** where the keys live (SA-06 §10c, or the team's portal module CP-01, which is not on Drive: `08-client-portal/NOT-FOUND.md`). That is the team's and the architect's question.
- `ai-workers/charter-edits.md` §3.

---

## 4. Document control and numbering

**(1) What it changes.** The document-control table (L5 onward) and the numbering line (L32).

**(2) Current words.**

L32 (extract):
> New requirements continue from SA-3-27.

**(3) Proposed words.**
- A version row: "| 2.18 | *(date placed)* | Workstream 2 change note CN-SA-03 applied: row 30 names the Writer; a delegation takes no seat (SA-3-41); extra corporate portal seats in Release 1 (SA3-D20, row 31; AIW-D67). | AIW-D33, AIW-D53, AIW-D67 |".
- L32: "New requirements continue from SA-3-63." The highest number in use is SA-3-62 (L544), and this note adds no requirement.

**(4) Why.** Review S3a m-20(b), (c).

**(5) Knock-ons.** None.

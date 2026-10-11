# CN-AG-15: change note to AG-15 Client Portal Management

| Field | Value |
|---|---|
| Module changed | AG-15 Client Portal Management |
| Version and file | v1.7 of 10 Oct 2026, `02-functional-requirements/agent/AG-15-client-portal-management_v1.7_2026-10-10.md` (Drive snapshot of 11 Oct 2026, `sources/drive-snapshot-2026-10-11/`; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 (new in the fix round after review S3c) |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | none (the changes reword existing text; the highest are AG-15-51, L416, and BR-17, L438) |
| Companion files | CN-AG-17 item 3 (the same change on the corporate side); CN-CP-portal ("Checked and not changed: the employer portal (AIW-D67)"); CN-FDL ("Checked and not changed", FD-7); `charter-edits.md` §3 |

**In plain words.** This is not an AI change. On 11 Oct the founder decided that employers get their full portal actions at launch: upload, pay, sign and seat management, so an employer can add colleagues as extra seats from day one. AG-15 v1.7, written a day earlier, says the opposite: only the employer's primary contact in Release 1, extra seats later and sold as an extra. A module never overrides a founder decision (README §0 rule 11), so this note brings AG-15 to the decision. How extra seats are priced is not decided here.

---

## 1. Extra employer seats are in Release 1

1. **Where.** Decision row AG17-D38 (L33); §3.2 (L213, L222, L225, L227); AG-15-12 (L355); §6 corporate identity lifecycle (L475); §7 `CorporatePortalSeat` (L485); US-6 (L530); §13 item 1 (L692).
2. **Current words.**
   > L355: "**Release 1: only the employer's primary contact has portal access; additional seats come in a later release.** *(v1.7 — SA3-D20: when built, additional seats are one on/off plan extra, not a counted limit.)*"
   >
   > L213: "**Release 1: only the employer's primary contact gets portal access; more seats arrive later** (AG17-D38)."
   >
   > L530: "- **Given** Release 1, **When** I try to add a second employer contact as a seat, **Then** it is not offered (seats come later); revoking the company revokes the primary contact's access."
   >
   > L692: "1. **Corporate seats in Release 1?** *(Settled v1.3 — AG17-D38: Release 1 gives the employer's primary contact portal access; more seats later.)*"
3. **Proposed words.** AG-15-12: "**Release 1 includes additional seats** *(changed — AIW-D67, the founder, 11 Oct 2026)*: the firm grants, suspends and revokes additional named contacts under the organisation party, each with a firm-set visibility scope, and a seat holding the seat-management capability may invite or ask to remove seats under the same organisation, the firm minting and binding each seat (Doc 4 CP-9-10). A new seat starts view-only; giving it upload, pay or sign is an explicit, audited act (CP-9-12). *(SA3-D20 stands for the shape: additional seats are one on/off extra, not a counted limit; whether a plan includes it at launch is SA-03's.)*" §3.2 L213: "**Release 1: the employer's primary contact and any additional seats the firm grants get portal access** (AIW-D67)." The "later release" wording in §3.2 (L222, L225, L227), §6 (L475) and §7 (L485, "*later release*") is removed. US-6 last criterion: "**Given** Release 1, **When** I add a second employer contact as a seat, **Then** it is created view-only under the organisation, I may give it upload, pay or sign, and revoking the company revokes every seat." §13 item 1: "*(Changed 11 Oct 2026 — AIW-D67: Release 1 gives the primary contact and additional seats portal access; supersedes AG17-D38's 'more seats later'.)*" The AG17-D38 row (L33) is annotated the same way.
4. **Why.** AIW-D67 (the founder, 11 Oct: "Full employer actions at launch … The Charter's "CP-9 Employer view (read-only)" becomes the employer actions the client portal document specifies (upload, pay, sign, seat management) in Release 1"); Doc 4 v1.3 CP-9-10 (L3066: "A seat holding `portal/corporate:seat-manage` SHALL invite/list/capability-grant/request-removal of seats under the SAME organisation only; the actual credential mint/activation and the `CorporatePortalSeat` binding SHALL be performed firm-side by AG-15") and CP-9-12 (L3068: "A new seat SHALL default to the least-privilege capability (view-only)"); README §0 rule 11 (AG-15 v1.7's later wording does not override the founder's decision). Not an AI decision; the coordinator asked for this note in the fix round.
5. **Knock-ons.** AG-17 AG17-D38, AG17-D51 and the Release 2 list (CN-AG-17 item 3); SA-03 (whether the seats extra is in a plan at launch; SA3-D20; Super Admin half); the employer's upload, pay and sign through the portal already exist in Doc 4 (CP-9-6, CP-9-7, CP-9-9; CN-CP-portal); FD-7 is not touched (CN-FDL); `agent/portal:configure-corporate` (L611, "Manage corporate scope + seats") already covers the firm's act; the email passcode before signing applies to a signing seat (CN-AG-05 item 1; CN-CP-portal CP-6-25).

## 2. The plan-gating rule names seats as available from Release 1

1. **Where.** BR-17 (L438); §11 plan gating bullet (L643); decision row SA3-D20 (L55).
2. **Current words.**
   > L438: "additional corporate seats are not in Release 1 and, when built, become one on/off extra"
   >
   > L643: "(extra corporate seats: not Release 1; one on/off extra when built — SA3-D20)"
3. **Proposed words.** BR-17: "additional corporate seats are one on/off extra, available from Release 1 (AIW-D67)". §11: "(extra corporate seats: one on/off extra, available from Release 1 — SA3-D20, AIW-D67)". The SA3-D20 row (L55) is annotated "Release 1 timing changed by AIW-D67".
4. **Why.** AIW-D67 as in item 1; SA3-D20 kept for the shape, since the founder decided the timing, not the price.
5. **Knock-ons.** SA-03 v2.17 §3.3 feature catalogue (the seats extra row; Super Admin half).

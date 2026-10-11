# Change note CN-CP-portal: the client portal (no change proposed; where the portal points went)

| | |
|---|---|
| **Documents looked at** | Doc 4 Client Portal, document version 1.3, last updated 2026-07-03 (`sources/drive-snapshot-2026-10-11/01-techno-functional/06-Doc-4-Client-Portal.md`, unchanged since 9 Oct); the current client-portal module CP-01 v0.1 (5 Oct), **not on Drive** (`sources/drive-snapshot-2026-10-11/08-client-portal/NOT-FOUND.md`) |
| **Date of this note** | 11 Oct 2026 (fix round after review S3a) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | **0.** No change is proposed against Doc 4. |

**Why there are no changes here.** The first version of this note edited Doc 4's signing room (CP-6). The team's newer files have moved signing out of the portal, so that edit would have changed a ceremony the team no longer specifies (review S3a, B-1):
- AG-05 v1.9 (7 Oct), decision CP1-D4 (L46): "Signing from the client portal hands off to the AG-05 signing page (consent, fields, certificate) and returns the client to the portal; the portal never renders its own signing step."
- AG-5-53 (L453): "The portal SHALL NOT render its own signing step: consent, fields and the certificate of completion stay on the AG-5 signing page, and the same engine serves portal and emailed links."

Under README §0 rule 11 the newer module file wins over Doc 4. So Doc 4 CP-6 is superseded on this point.

**Where the two portal points now live.**

1. **The email passcode before every signature** (FD-21, kept by the founder: AIW-D42, "Keep the email passcode"). It belongs on the AG-05 signing page and is carried by the Agent-plane change note **CN-AG-05**, not here.
2. **The employer portal** (AIW-D67, "Full employer actions at launch"). The first version of this note said no portal change was needed. **That was wrong** (review S3a, B-2). The newer team files limit the Release 1 employer portal:
   - AG-15 v1.7 AG-15-12 (L355): "only the employer's primary contact has portal access".
   - AG-15-51 (L416): "In Release 1 the employer portal SHALL show nothing about recruitment candidates (no list, no counts, no notes)".
   
   The founder's AIW-D67 asks for "the employer actions the client portal document specifies (upload, pay, sign, seat management) in Release 1". A team file never overrides a founder decision (rule 11). The change note that applies AIW-D67 is the Agent-plane **CN-AG-15** (and AG-17's AG17-D38). The conflict between FD-7's recruitment summary and CP1-D7 is recorded for the founder in CN-FDL.

**For the founder to locate.** The team's current client-portal module, `FINAL-ClientPortal-FR/CP-01-client-portal-app_v0.1_2026-10-05.md`, is cited by eleven files in the 11 Oct snapshot, including AG-15 v1.7, AG-17 v0.6 and SA-06 v3.3. It is not on Drive for the account used for the snapshot (`08-client-portal/NOT-FOUND.md`: "Ask the requirement authors to upload `FINAL-ClientPortal-FR/` to the `Functional Requirement with Version Control` folder, then take a new snapshot"). Once it is on Drive, the passcode (FD-21) and the employer portal (AIW-D67) are checked against CP-01, and any portal change is written against CP-01's own numbering (CP-1-n), never against Doc 4.

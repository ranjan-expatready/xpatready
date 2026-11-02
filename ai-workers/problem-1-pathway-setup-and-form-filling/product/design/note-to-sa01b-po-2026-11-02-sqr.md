# Note for the SA-01B product owner: Smart questionnaire names and the prospect runtime (P-271, 2 Nov)

For the founder's next reply to the product owner of SA-01B (P-251). Roles only, no names.

## 1. Names
The POC now uses the team's AG-08 names: the module and tab are **Smart questionnaire (SQR)**, with three views: **Prospect questionnaire (PQR)**, **Client questionnaire** and **Agent view**. Earlier POC wording ("Case view") is retired.

## 2. What the POC builds and what the team builds
* **POC (configuration):** which questions of a combination's SQR are PQR questions (C4.2), and the AI draft of those picks with a reason per pick, accepted or removed by a person (C4.7). Stored per combination and released with it.
* **Team builds:** the prospect runtime: the prospect answering the PQR, the firm's next step, and carrying the PQR's personal details into the SQR as "please confirm" (POC rows C6.7 and C6.8 are not built by the POC). The team's PQR screen reads the PQR marking per combination from the released configuration.
* **POC (already built, reference):** every case has its own client questionnaire and agent view, pinned to the release the case was opened on (C6.1–C6.3).
* **Team builds:** the client's secure link, login, email and WhatsApp delivery, multi-tenancy and tenant isolation.

## 3. The client link: shape the team's link should have (AG-8-12)
| Property | Requirement |
|---|---|
| Scope | one link per filing (not per firm or per person) |
| Version | pinned to the release the case was opened on; a later release never changes what the link asks |
| Token | unguessable (random, not derived from case or person ids) |
| Lifetime | expiring; a new link can be issued, the old one stops working |
The POC's family link (C6.2) is a reference for the flow only (one group at a time, save and resume, each fact asked once), not for security.

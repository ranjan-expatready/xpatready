# Research — staff, agent, representative and the solo practitioner (M3), 29 Oct

Research only, for the Lead. Founder's question (29 Oct): what is the difference between staff and agent; is the representative only the assigning authority; what do competitors have that we miss; how a one-person firm fits.
**Our model read:** PRODUCT.md §1 and §4, WORKFLOW.md, DECISIONS.md (P-17, P-97, P-101, P-106, P-129, P-130, P-135, P-142, P-149), the P-01–P-36 page, `screens/M3-prepare-application/` (concept, research), `prototype/studio/api/src/core.ts` (ACTORS) and `samples/person-roles.json`.
**Legal points are Unconfirmed: no counsel.** Immigration values stay Sample until the immigration expert confirms.

## 0. What we have today (plain facts)
* The app has two separate worlds of people. **Configuration** (our content team): author, content reviewer with the immigration-expert duty, approver ("second person"). **Case** (a firm): one "Case officer · firm staff" plus two clients. Nobody holds both (core.ts comment).
* Our documents use four words for the firm's people without a rule: *case officer*, *agent*, *staff* (P-142 D3), *representative* (P-56 "representative preview", person role in person-roles.json). "Agent view" is the full-form screen (P-76).
* "Representative" today is only a **person role on a case** (IMM 5476, never an applicant). There is no firm, no firm user list, no licence number, no "who is the representative of record" on a case.
* Every enforced second-person rule (P-15, P-80, P-97, P-121, P-149) is on the **content team** side. The firm side has none; P-142 D6 and the correction rule ask for a reason, not a second person.

## 1. Glossary — our words against the industry's
| Our role | What it is, in plain words | Industry words | Recommended product word |
|---|---|---|---|
| **Content team** (author, immigration-expert reviewer, approver) | ExpatReady's own people who build and release programs, forms and rules for every firm | none in firm tools (vendors keep form libraries internally: Docketwise, INSZoom, Officio all advertise "updated forms") | keep: "content publisher", "second person" |
| **Firm owner / admin** | Runs the firm's account: adds and removes users, settings, billing, who works which case | "Administrator" (Clio, Docketwise "User Access"), "account administrator" | **Firm admin** (a duty, not a person) |
| **Licensed representative** | The CICC licensee (RCIC) or law-society lawyer or paralegal, or Quebec notary, named on IMM 5476; the person IRCC deals with; professionally responsible for the work | "Attorney of record" (US), "responsible attorney" (Clio), "RCIC", "authorized paid representative" (IRCC) | **Representative** |
| **Case officer** (unlicensed staff) | Firm employee who prepares the case under the representative's supervision; may not give immigration advice | "paralegal", "case manager" (INSZoom), "caseworker" (eImmigration), "staff" | **Case officer** |
| **Staff** | Everyone who works for the firm (representative, case officers, admin) | "firm users", "team members" | umbrella word only, never a role |
| **Agent** | Today: a loose synonym for case officer *and* representative | In Canada "agent" often means an unlicensed recruiter or "ghost consultant"; in the team's requirements AG-xx means an **AI agent** (AG-03 Qualifier, AG-11 Checker) | **retire as a role name** (see Q1) |
| **Client and family** | Principal applicant, spouse or partner, children (under 18 answered by the principal), sponsor | "client", "foreign national", "beneficiary" | keep person roles |
| **Employer** | The company whose LMIA or offer supports a worker; its own case (P-106) | "corporate client", "petitioner", "HR portal user" (LawLogix, INSZoom) | **Employer contact** (later wave) |
| **Designated individual** | Someone the client lets IRCC tell about status (IMM 5475); cannot act | same | not a firm user; a case contact (later) |

**Answer to "staff vs agent":** they should not be two roles. "Staff" is the umbrella; inside it there are exactly two kinds of case worker that the law tells apart: the **representative** (licensed) and the **case officer** (unlicensed). "Agent" adds nothing and collides with IRCC's warnings and with the team's AI agents.
**Answer to "the representative is the assigning authority":** not quite. Assigning work is the **firm admin's** duty (often the same person in a small firm). The representative is the person of record: IRCC deals only with them on that application (one representative per application, IMM 5476), they declare and transmit in the APR Portal, and under the CICC Code they supervise and "assume professional responsibility" for assistants' work (s.38(2)) and must ensure documents are "properly prepared, signed and submitted" (s.22(2)). That is a responsibility, not a permission to hand out tasks.

## 2. Who may do what, per role
Legend: Y yes · R yes with a written reason and history · — no. "Agent-type facts" = the representative's, the office's and the case's own facts (proposal P-130 "Comes from: Agent").
| Action | Content team | Firm admin | Representative | Case officer | Client / adult family | Employer | AI |
|---|---|---|---|---|---|---|---|
| Be the **source** of agent-type facts (name, licence number, firm address, file number) | sets *that* a fact is agent-type | — | Y | Y | — | — | proposes only |
| Be the source of a client fact (document or client by default) | sets "Comes from" | — | R, reviewed at release (our proposal) | R, same | Y | — | proposes from documents |
| Be the source of an employer fact | sets it | — | R | R | — | Y via linked employer case (P-106) | proposes |
| Be the source of a **declaration** (background, criminality, health, truth) | — | — | **never** | **never** | Y, own only (P-97) | — | never |
| **Correct** an answer on a case | — | — | R (any answer, history kept) | R (any non-declaration answer) | own answers; re-confirms a changed declaration (P-97) | own employer facts | proposes |
| Mark "**checked against the document**" | — | — | Y | Y (P-142 D3 "staff") | — (own confirmation is a declaration) | — | never; flags mismatches |
| Resolve a typed-vs-document mismatch (P-142 D6) | — | — | R | R | sees "please check" | — | — |
| Review the filing before it goes | — | — | **Y, required** (recommended, Q2) | prepares; cannot sign off | — | — | AI review warns (P-71) |
| **Sign** | — | — | IMM 5476 representative part; APR "Transmit" declaration; PR portal declaration tick | nothing to IRCC | each applicant's forms (pen on paper; e-sign in the PR client portal); IMM 5476 client part | ESDC/Employer Portal steps, outside our product | never |
| **Submit** to IRCC | — | — | Y (the representative's portal account) | prepares, uploads into the case; records numbers | self-filed cases only (later) | — | never |
| Manage firm users and case assignment | — | Y | Y if also admin | — | — | — | — |

**Basis and precedent (read 29 Oct 2026):**
* IRCC IMM 5476 page (modified 2025-12-12): paid representatives must be CICC members, law-society lawyers or paralegals (and students-at-law under their supervision), or Quebec notaries; "only one (1) representative at a time for each application"; a designated individual (IMM 5475) gets status only — https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/imm5476.html
* CICC Code of Professional Conduct (SOR/2022-128): s.38(1) assistants must know the Code and not do what the licensee could not; s.38(2) the licensee supervises and takes professional responsibility, supervision suited to the work; s.38(3) work may be delegated to a non-licensee but nobody may give representation or advice in breach of IRPA s.91; s.22(2) documents properly prepared, signed and submitted; s.24(2) verify client identity and check for another representative; s.37 reliable office records — https://laws-lois.justice.gc.ca/eng/regulations/SOR-2022-128/FullText.html. The Code does **not** say a licensee must personally review every form; our "representative review" is a product safeguard built on s.22(2) and s.38(2) (Unconfirmed: no counsel).
* IRCC representative portals (our research-agent-view.md §1, read 26 Oct): the representative signs with name and security answer, then "Transmit"; cannot e-sign for the client or use the client's login; one APR account per representative. Whether case officers may use the representative's account is not stated on the pages read (Unconfirmed: no counsel).
* Industry: firm tools set *access*, not legal roles. Docketwise's role is a free-text title shown on the matter; admins manage users; "User Permission Groups" restrict who sees a contact or matter; global rights for delete, export, archive, reassign — https://support.docketwise.com/en/articles/6333616-user-roles , https://supportcenter.docketwise.com/en/articles/9372149-managing-users . Clio has five standard roles, every user has one, several roles give the most permissive; groups restrict matters; a "responsible attorney" field per matter — https://help.clio.com/hc/en-us/articles/40062980685467 . INSZoom sets access rights per user, assigns case managers per foreign national, and has "vendor case manager" logins for outside firms — https://success.mitratech.com/INSZoom/Help_Articles/Settings/How_do_I_define_user_access_rights%3F . eImmigration lists caseworker and client portals and "access controls" (no detail public) — https://www.getapp.com/legal-law-software/a/eimmigration . LawLogix Edge: client and HR portals; no public role documentation found — https://www.capterra.com/p/152926/Lawlogix-Edge/reviews .
* **No tool found enforces a second person on a firm's own case work**; attorney sign-off is a task or habit, not a server rule. That is a gap we can fill, carefully.

## 3. The solo practitioner
One person holds representative + case officer + firm admin (Officio's listed "Solo" plan is one user with unlimited clients, USD 69/month; Docketwise is marketed to solo attorneys; third-party listings, prices unconfirmed: https://www.techjockey.com/detail/officio , https://www.selecthub.com/p/legal-case-management-software/docketwise/ ).
**Rule of thumb:** one person can hold many *duties*, but a check that needs a *different* person is either kept at platform level or turned into a logged self-confirmation at firm level. Never pretend a second person looked.

| Rule | Level | Solo behaviour |
|---|---|---|
| Content second person: approve proposals, held PDFs, "Filled by" changes, releases (P-15, P-80, P-97, P-121, P-149) | **Platform** (our content team) | Unaffected: a firm never authors the shared library, so a solo firm never meets these. If firms later get private content, they must not get self-release (the industry does not let firms edit vendor forms either) |
| "Agent offered as source for a non-agent fact, with a reason, reviewed at release" | **Platform** (a combination setting) | Unaffected |
| Correct any answer with a reason and history | Firm | Same; reason required; history shows the one person |
| Mark "checked against the document" (P-142 D3) | Firm | Same; the representative is staff. D5 fields (names, birth date, passport) still go field by field |
| Resolve a mismatch (P-142 D6) | Firm | Same, with a reason |
| Client re-confirms a changed declaration (P-97) | Client | Unaffected: the client is always a second person. This is our strongest safeguard for a solo firm |
| **Representative review before filing** (recommended, Q2) | Firm | With staff: the representative confirms a filing a case officer prepared (recorded "Prepared by · Reviewed by"). Solo, or when the preparer *is* the representative: the same step shows "I prepared and reviewed this filing myself" with a tick, name, licence number and time logged; the record says "Self-reviewed" and never "Second person" |
| Firm admin duties (users, assignment) | Firm | Held by the same person; no check needed |
| Supervision of assistants (Code s.38) | Firm | Not applicable while the firm has one user; applies the moment a case officer is added |

Detect "solo" from the firm, not from a setting someone can tick: when the person who prepared the filing is the case's representative, self-review applies; adding a case officer changes nothing on old filings and asks for review on new ones.

## 4. What we are missing against competitors (max 8)
1. **Firm and firm users** — firm record, invite and deactivate users, duties per user (representative · case officer · admin, several per person). Clio, Docketwise, INSZoom. *Wave 1 (M3, minimal: Sample firm with 2 users + a solo firm)*.
2. **Representative of record per case** — one representative per application, licence body and number, IMM 5476 filled from it, a "change of representative" event that asks for a new IMM 5476. Clio "responsible attorney". *Wave 1 (M3)*.
3. **Case team and assignment** — responsible representative + assigned case officers shown on the case; reassign with history. Docketwise, INSZoom. *Wave 1 (M3, view only) → Wave 2 (reassign)*.
4. **Case-level access limits** — only the case team (and admins) see a case. Docketwise groups, Clio groups. *Wave 2*.
5. **Representative review step and "Prepared by · Reviewed by" record** — our differentiator; no competitor enforces it. *Wave 1 (M3, with Q2)*.
6. **Client portal basics** — status, messages, document upload, e-signature of agreements. Officio, eImmigration, CaseEasy, LawLogix. *Wave 2 (W5 family link)*.
7. **Engagement paperwork the Code requires** — written consultation and service agreements, identity check, "other representative?" check (Code ss.23–24). ImmiPractice, CaseEasy. *Later wave (team's CRM; we link, not build)*.
8. **Outside users** — employer HR contact on the employer case (LawLogix, INSZoom HR portals) and co-counsel or vendor logins (INSZoom). *Later wave*.
Not missing on purpose: billing and trust accounting (the team's systems), and AI that "advises" a client (s.38(3) and IRPA s.91 make advice a licensed act).

## 5. Founder questions (one at a time, recommendation first)
**Q1. One word per role?** Recommend: **Representative** (licensed, of record) and **Case officer** (unlicensed staff); "staff" only as the umbrella; retire "agent" as a role and rename "agent view" to "**case view**" (or "full form"). Why: the law separates exactly these two; "agent" means an unlicensed recruiter to IRCC's audience and an AI agent in the team's AG-xx requirements. Alternative: keep "agent" as the founder's word and add "licensed" as a tick — rejected, because rights then hang on a tick, not a role.
**Q2. Must the representative review every filing before it is recorded as submitted?** Recommend yes: a required "Reviewed by the representative" step, server-enforced to the case's representative, with self-review logged for a solo firm. Why: Code s.22(2) and s.38(2) put the accuracy and the assistants' work on the licensee; competitors leave it to habit (Unconfirmed: no counsel).
**Q3. May a case officer alone mark the D5 identity fields "checked against the document"?** Recommend yes (P-142 D3 holds), with the representative's review in Q2 showing every D5 field and who checked it. Alternative: representative only for D5 — safer, but it makes the case officer useless on the most common fields and a solo firm gains nothing.

*Not found (said so rather than guessed):* an "Avalon" immigration product; Officio's and Cerenade's own role documentation; LawLogix role documentation; a source for configurable self-approval (one vendor allows it for single-checker accounts: https://dokasaas-support.surecomp.com/hc/en-us/articles/7076838509329 ; the general pattern is at https://en.wikipedia.org/wiki/Maker-checker ). All web pages read 29 Oct 2026.

# Change note — Roles & Permissions (SA-06 v3.0 → v3.2)

**From:** the product owner (decided 2026-10-07) · **For:** every FR document owner, the Corporate / LMIA sessions, and the development team
**Source of truth:** `FINAL-SuperAdmin-FR/SA-06-rbac_v3.4_2026-10-10.md` (v3.0 on 7 Oct; v3.1 on 8 Oct by another session; v3.2 and v3.3 on 10 Oct; v3.4 on 10 Oct — template permissions aligned) — decision table SA6-D1 – SA6-D11, §10 catalogue, Appendix B (rename map), Appendix C (starter roles).
**Status:** all document changes below are **applied** (new versions written, old versions in `_archive/`). SA-06 v3.0 was then verified end to end (rules against decisions and code; every role tick by script) and the review's decisions were applied. Section 3 is the code work — **item 1 is a security bug**. Section 4 is what is still open.

---

## Update — 12 Oct: decisions of 10–12 Oct applied (SA-06 v3.5)

**Current version: `FINAL-SuperAdmin-FR/SA-06-rbac_v3.5_2026-10-12.md`.** The v3.4 path named in the header above is now in `_archive/`. Nothing below was an open question; where something is still undecided, SA-06 §13 says so (Open Questions 13 – 19).

- **Firms still build their own roles (R1), and the screen is simpler (R2).** The role editor shows 30 plain-language capabilities (for example "Work on invoices and payments", "Give refunds", "Change billing settings"). Ticking one gives the role everything in it. An **Advanced** switch shows every individual permission, in Release 1. The permissions themselves, the checks and the audit trail do not change. SA-06 has a new Appendix D listing what is in each capability.
- **A reason on role changes is now optional (R36).** The audit log still records who, when and before / after. A written reason is needed only when someone is made an Owner or stops being an Owner.
- **No supervised client messages and no licence-based approvals (R5).** AI-written client text is approved by a person who holds the approval permission, whoever that is. An item waiting for professional approval goes to everyone who holds that permission, and to the Owner if nobody does (the SA-06 rule stands; AG-07, AG-10, AG-11, AG-16 are to follow it). Any representative type in the country pack counts as a licence, so a lawyer's law-society number works like a CICC number; the wording is "licence number" and "Lead representative".
- **Admin and Billing / Finance can now view the firm's subscription invoices (R37).** Cancelling, upgrading, downgrading and changing billing details stay with the Owner.
- **Template permissions are settled.** Firms no longer have "adopt", "re-sync" or "archive" permissions, and the old "manage templates" communication permission is folded into the template permissions. Confirming "Review your automatic messages" belongs to whoever may publish templates (Owner and Admin). Hiding ExpatReady's standard checklist items belongs to the case-pack setting (Owner and Admin). A new permission, **Manage legal settings** (retainer clause locks, e-sign consent text, client consent screen, keep-period, shareable document types), is held by the Owner only; the Owner can give it to a custom role, for example an office manager's. ExpatReady's own nine template permissions are listed, and only the Platform Owner can mark an urgent correction.
- **The only Owner of a firm can no longer be deactivated or suspended.** Today the screen warns about it but the server does not check. The server must refuse it (new requirement SA-6-44; a developer item, see the code note below).
- **ExpatReady's own staff roles are the six already in the product** (owner, admin, support, billing-ops, content-publisher, auditor). The screen for editing staff roles is parked. The editor for firm starter roles (SA6-D12) is kept as decided; it is not built yet, and the mock screens that exist follow an older design and need redoing.
- **Counts:** SA-06 now lists **256** firm permissions (was 259). Owner 256, Admin 238, Case Manager 157, Case Officer 105, Billing / Finance 45, Read-only 39.
- **Developers:** (1) add the server guard for the only active Owner (`deactivate-lifecycle.service.test.ts:189-200` currently asserts there is none for firms); (2) rename the template permissions and add the new ones as listed in SA-06 §10a and §12; (3) seed `agent/subscription-invoice:view` on Admin and Billing / Finance; (4) build the capability map as code beside the permission catalogue.
- **Still open (not decided):** whether the "preferred" mark for licensed approvers stays; which permission approves AI-written client text; which permission sets the keep-period; how the AG-level decisions R17 – R20 touch their permissions; who renames a government step's client name; who is the second approver with six staff roles; whether the starter-role editor uses the same capability view.

---

## Update — 10 Oct: starter roles are configured in Super Admin (SA-06 v3.2, SA6-D12)

- **Nothing about starter roles is hard-coded.** Expat Ready manages them in a new Super Admin **Starter roles** screen (SA-06 §3.9): create, edit, rename and retire starter roles — e.g. add "Sales / Intake". The code only seeds the first version (today's six).
- **Firms see every published starter role** and use it as is, or copy it and customise the copy. A firm's copy doesn't change when the starter role changes.
- **Safeguards, because a change reaches every firm:** draft → a second person approves → publish; impact preview (how many firms and users hold the role); version history and restore; reason required; all audited. The Owner role always exists, holds everything and can't be edited or retired. Retiring a role stops new assignments; current holders keep it until their firm reassigns them.
- **Edge cases (accepted 10 Oct):** a change applies from the person's next action; retiring a role never removes it from a firm's last Admin; restoring an old version flags permissions added since; two drafts on one role must be reconciled before approval; "retired" is its own state (holders keep the role); version states Draft / Published / Superseded / Rejected (SA-06 §6 B, §7, §9).
- **New Super Admin permission:** `system/starter-role:manage` (Platform Owner by default; the approver must be a different person).
- **Release 1.** For developers: runtime roles move from the code registry (`role-template.ts`) to the database (the registry becomes the seed only); the boot check validates against stored roles; the deferrals-register "SA-6 template builder" row is now Release 1.
- **Updated:** SA-06 v3.2 · AG-01 v1.17 · SA-02 v2.20 · SA-03 v2.15 · SA-07 v2.11 · SA glossary v2.15 · SA overview v3.7 · Agent overview v1.12.

**Current versions (10 Oct) — use these, not the versions in the table below:** Super Admin — SA-02 v2.20, SA-03 v2.15, SA-04 v2.15, SA-06 v3.2, SA-07 v2.11, SA-10 v2.5, SA-11 v2.7, SA-12 v2.7, overview v3.7, glossary v2.15. Agent — AG-01 v1.17, AG-02 v1.9, AG-03 v1.4, AG-04 v1.5, AG-05 v1.9, AG-06 v1.7, AG-07 v2.7, AG-08 v1.7, AG-09 v1.8, AG-10 v1.9, AG-11 v1.11, AG-12 v1.2, AG-13 v1.12, AG-14 v1.10, AG-15 v1.6, AG-16 v1.12, AG-17 v0.5, AG-18 v1.2, overview v1.12. *(Some of these were moved on by other working sessions on 8–10 Oct.)*

---

## 1. What was decided (plain English)

Example used throughout: **Maple Immigration**, 12 staff — Client V (Owner), Client C (Admin, office manager), Client Y (Case Manager, RCIC), Client T (Case Officer), Client F (Billing / Finance).

| # | Decision | In practice |
|---|---|---|
| SA6-D1 | **Everyone sees everything by default; a firm can make any role "own only".** The "see all" permissions for clients, cases, prospects and tasks are on all six starter roles. | Client T sees every client. If Maple removes "see all clients" from the Case Officer role, Client T sees only clients he owns or is on the case team of. |
| SA6-D2 | **Four professional approvals sit with Owner and Case Manager by default:** override a critical warning, approve a government form, sign off a file, countersign a retainer. No "licensed representative" role. The firm may give them to any role; every use is logged. | Client Y and Client V can sign off and override; Client C and Client T cannot unless Client V adds it to their role. |
| SA6-D3 | **Firms can build their own roles.** A person can hold several roles. Owner and Admin edit roles; an Admin can never create a role stronger than their own; nobody edits the Owner role; only an Owner makes someone Owner; nobody changes their own roles. The six starter roles are fixed — firms copy one and edit the copy. A firm role can only ever contain firm permissions (checked by the server on every save). Deleting a role asks for a replacement only if someone would be left with no role. | Client V copies Case Officer into "Senior Paralegal"; Client T holds Case Officer + Billing / Finance. |
| SA6-D4 | **One permission system, two role sets that never mix** — Expat Ready staff roles and firm roles. (Already how ERv2 is built.) | Support staff and firm staff pass the same guard but can never hold each other's permissions. |
| SA6-D5 | **Six starter roles:** Owner, Admin, Case Manager, Case Officer, Billing / Finance, Read-only. Case Manager runs cases only (no staff or role management). **Five Owner-only actions:** allow Expat Ready support to make changes; cancel the subscription; edit the firm's legal profile; export all firm data; connect the payment account. Admin = all other administration (not the professional approvals). **Licence numbers:** each licensed person keeps their own CICC number on their profile; Owner or Admin can also edit it. | Client Y enters her own CICC number; no waiting for Client V. A front-desk role is a copy Maple makes itself. |
| SA6-D6 | **Anything attached to a client or case follows its visibility** (documents, notes, tasks, reminders, time). Prospects have their own "own vs all". Unassigned items are seen by "see all" holders and people allowed to assign work. | If Client T can't see the restaurant's case, he can't see its documents or tasks either. |
| SA6-D7 | **Every plan gets the same six starter roles.** Plans differ by limits and features, not by role lists. | — |
| SA6-D8 | **Super Admin side:** access by job (SA-07's staff roles); no "assigned to me" limits; no Individual / Corporate view in the Super Admin console. | — |
| SA6-D9 | **Licensed user = a person, not a role.** The system never blocks on licence; it shows a reminder when approval rights go to someone without a licence number, sends items awaiting approval to licensed staff first, and lets the Owner approve if no licensed user is active. | Maple gives Client C form approval → Client V sees "Client C has no licence number on file". |
| SA6-D10 | **One naming rule for permissions** — exactly the code's rule `agent/<thing>:<action>`, with `view.own` / `view.all` for visibility. 63 invalid names renamed, duplicates merged (Appendix B). | `agent/billing/invoice:create` → `agent/invoice:create`; `agent/client:view-all` → `agent/client:view.all`. |
| SA6-D11 | **Audit log is firm-wide** for holders of `agent/audit:read` (Owner and Admin by default). | — |

**Added after the review (same day, folded into the decisions above):**
- **Dashboards (D1):** "see everything" is about opening files, not firm-wide reporting. Firm-wide dashboards: Owner, Admin, Case Manager; everyone else sees their own numbers; Billing / Finance sees firm-wide *financial* reports.
- **Giving roles (D3):** an Admin can only give or remove a role whose permissions the Admin holds — so only the Owner hands out the approvals. Only an Owner removes an Owner; the last active Owner can't be removed. Deleting a custom role follows the edit rule.
- **Owner-only (D5):** the five Owner-only actions can never be put on a custom role, even by the Owner. "Connect the payment account" = the account clients' payments are paid out to.
- **Subscription billing screen (D5, SA-04 v2.8 SA4-D23):** Admin may update the card and pay an overdue bill; upgrades, invoices and credit notes, billing details, downgrades and cancellation are Owner-only.
- **Licence (D9):** the permission system never checks licence; AG-11's "AI-written client text needs a licensed approver" is a firm setting, on by default.
- **Visibility edge cases (D6):** a task on a file you can't open shows its title with the file marked "restricted", and you can still complete it; imported files not yet linked are visible to the importer, see-all holders and import holders.
- **Default role permissions:** all defaults in SA-06 §10b were reviewed and accepted (e.g. Case Officers approve client uploads but don't delete documents).

**Closing decisions (same day):**
- **Payment emails:** card-declined, failed-payment, overdue and payment-hold emails also go to the firm's Admins (SA-04 v2.9).
- **Reasons:** a written reason is **required** for every role create / edit / delete and every role assignment or removal.
- **Document disposal:** Owner-held by default; the Owner may put it on a custom role.
- **Approvals queue:** an item awaiting approval (form, AI-written or supervised client message, override, sign-off, countersign) is shown to **all** holders of that permission at once; licensed staff are marked "preferred"; the first decision closes it; if nobody holds the permission, the Owner approves.
- **All permission-naming questions closed** (N1–N21) — e.g. one `agent/security-policy:manage` for MFA, session timeout and IP allow-list; one `agent/integration-<name>:manage` per integration; time tracking gets real permissions (`agent/time-entry:*`); the platform staff-role editor key is `system/super-admin-role:manage`. SA-06 now lists **259** firm permissions; Appendix B maps every old name.

---

## 2. Documents updated (all applied today)

| Document | Now | Previous (archived) | What changed | Decisions |
|---|---|---|---|---|
| **SA-06 RBAC** | v3.0 | v2.5 | Full review: rewritten against ERv2 code; decisions D1–D11 (+ review extensions); 259-key firm catalogue with accepted default roles; rename map; role summary; open questions 1–9 closed; verified end to end | all |
| SA-02 Firm management | v2.18 | v2.16 → v2.17 | Firms seeded with the six standard roles (not "from the plan"); sign-off key renamed in the support-session block list | D7, D10 |
| SA-04 SaaS billing | v2.10 | v2.7 | Firm subscription screen: Admin may update the card and pay; the rest Owner-only (new SA4-D23, SA-4-67); five new subscription permissions | D5 |
| SA-03 Plans | v2.14 | v2.13 | Per-plan starter role set withdrawn (SA-3-15, Roles tab, `PlanRoleTemplate`, `system/plan-role-set:manage`); amendment SA3-A6 | D3, D5, D7 |
| SA-07 Platform users | v2.9 | v2.7 | "Starter roles per plan" removed from Appendix A | D7 |
| SA 99 Glossary | v2.13 | v2.12 | Role Template definition; SA-6 phasing row; push-to-firms withdrawn | D3, D5, D7 |
| AG-01 Firm set-up | v1.15 | v1.9 → v1.12 | Six code roles replace the old list; several roles per person; fixed starter roles + copy-and-edit; Owner/Admin editing and giving rules; last-Owner rule; five never-delegable Owner-only actions; subscription screen split; licence self-maintenance; see-all seeding; renames | D1, D2, D3, D5, D7, D9, D10 |
| AG-02 Prospects | v1.9 | v1.7 → v1.8 | Prospect own-vs-all (`prospect:view.own` / `view.all`); unassigned queue rule; renames | D1, D6, D10 |
| AG-03 Assessment | v1.4 | v1.2 | Prospect key renamed | D10 |
| AG-04 Booking | v1.5 | v1.4 | 16 `agent/booking/*` keys renamed; default roles added | D10 |
| AG-05 Retainers | v1.9 | v1.7 | Countersign held by Owner and Case Manager by default | D2 |
| AG-06 Billing | v1.7 | v1.5 | 18 `agent/billing/*` keys renamed; default roles added | D10 |
| AG-07 Case core | v2.7 | v2.3 → v2.4 → v2.5* | `case:view.all` added; attached records follow parent; four approvals' default holders; client/case/sign-off keys renamed | D1, D2, D5, D6, D10 |
| AG-08 Questionnaire | v1.7 | v1.5 → v1.6 | Approval seeding; role names; two keys renamed | D2, D5, D10 |
| AG-09 Documents | v1.8 | v1.5 → v1.6 | Documents follow their client/case/prospect; legal-hold and retention keys merged | D6, D10 |
| AG-10 Communications | v1.9 | v1.6 | Consent key merged; role names | D10 |
| AG-11 Automation | v1.11 | v1.8 | Form-approval seeding; role names | D2, D5 |
| AG-13 Tasks & audit | v1.12 | v1.8 → v1.10 | Attached-record visibility; task own/all keys; audit log firm-wide; restricted-parent tasks | D1, D6, D10, D11 |
| AG-14 Reporting | v1.10 | v1.7 → v1.8 | Firm-wide dashboards for Owner, Admin, Case Manager; Billing gets financial reports; renames; role names | D1, D6, D10 |
| AG-16 Firm settings | v1.11 | v1.6 → v1.9 | ~27 `agent/settings/*` and `agent/integration/*` keys renamed or merged; five Owner-only actions; payout-account definition; subscription screen split; licence rule; audit rule | D2, D5, D10, D11 |
| AG-17 Corporate / LMIA | v0.5 | v0.3 → v0.4 | Default holders of the approvals; visibility; sign-off key renamed | D1, D2, D5, D6, D10 |
| AG-18 Data import | v1.2 | v1.1 | Approval seeding; "Firm Admin" → "Admin" | D2, D5 |
| Corporate `DECISION-LOG.md` | D83 added | — | Default holders of the four approvals; D9 / D17 annotated | D2 |

\* **AG-07 v2.5 was written by another session during this work** (a "gap-closure pass", 00:38 on 7 Oct, built on v2.4). v2.6 applies only the renames on top; v2.5's content is unchanged.

Also aligned (role names, overview wording, audit key): **Super Admin 00-Overview v3.6**, **Agent 00-Overview v1.11** (job personas mapped to the six starter roles), **SA-11 v2.7** (firm audit key `agent/audit:read`; register keys), **SA-10 v2.5**, **SA-04 v2.10**. Also updated: **AG-12 v1.2** (`agent/template:render` removed — not a grantable permission). No change needed: AG-15.

Version numbers above are the final versions of 7 Oct; intermediate same-day versions are in `_archive/`.

---

## 3. For the development team — code to change

From SA-06 v3.0 §12 (file references are in `ERv2-sanitized/`):

1. 🔴 **Security bug — fix first.** Today an Admin can give the Owner role, even to themselves: `role-assignment.service.ts` has no "only an Owner gives Owner", no "nobody changes their own roles" and no "Admin can only give roles whose permissions they hold" check (firm-admin holds `agent/role:assign`, `role-template.ts:222`; platform-admin holds `system/role:assign`). Also add the last-active-Owner guard on the firm side.
1a. **Drop Admin from `agent/subscription:upgrade`** (`role-template.ts:211, 268`) and add the five new subscription keys (SA-04 v2.8).
1b. **Remove the reveal permissions** (contradict "no masking anywhere", AG7-D10): `agent/pii:reveal`, `agent/audit-ip:reveal` (`permission-catalog-rows.ts:419, 431`, seeded in `role-template.ts`), `portal/pii:reveal-own` (`:442`).
2. **Add the missing keys** from SA-06 §10b, starting with: client, case, prospect and task `view.own` / `view.all`; `agent/case:waive-deficiency`, `:form-approve`, `:review-approve`; `agent/retainer:countersign`; `agent/firm-credential:manage`; `agent/sqr:verify`; a key for connecting the payment account.
3. **Fix starter-role seeding:** Case Officer needs the see-all keys (today only `party:view.own`, `role-template.ts:318`); Billing / Finance is a placeholder with no billing keys (`:333-353`).
4. **Rename keys** to match Appendix B as each module is built (the code has 38 firm keys; the documents ~257; no exact matches today).
5. **Build firm custom roles** (SA6-D3) with the must-have server-side check that a firm role holds only `agent/*` keys, plus the Admin "no stronger than yourself" rule and Owner-role protection. Build the several-roles screen (storage already supports it).
6. **Retire** `system/role-template:push` and `system/plan-role-set:manage`; the per-plan role table should not be read as a choice.
7. **Platform staff roles:** code has 6 templates, SA-07 has 9 (Account manager and Platform engineer missing; Content author and approver share one template).
8. **Close** the "SA-6 template builder" row in `Docs/DEFERRALS-REGISTER.md` (it uses "SA-6" for a different thing).

---

## 4. Still open

Nothing. All review items are closed. The last one (reasons for role changes the system makes) was decided on 2026-10-07: the system records an automatic reason — "Firm created", or "Staff member deactivated by <name>: <their deactivation reason>" (SA-06 BR-23, Open Question 11).

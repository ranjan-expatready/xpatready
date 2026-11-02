# Complexity register — founder lens (11–12 Oct 2026)

> Booking rows superseded by AG-04 v2.0 (21 Oct).

**What this is.** A working register, not a requirements document. Nine read-only reviews (11 Oct) of every AG, SA and CP module, listing each **Control** item (roles, permissions, approvals, visibility) and **Configuration** item (settings, knobs, editors, dashboards) with a Keep / Simplify / Park suggestion for a 1–10 person firm, plus a code-build check (12 Oct).

**How to use it.**
- **Decisions** live in `TEMPLATE-MAP-working_2026-10-10.md` → section "Complexity review (founder lens, rule 8) — decisions" (R1 onward). This file holds the evidence and the suggestions, not the decisions.
- **SA modules:** cuts decided with the product owner (R1 – R22). **AG modules:** suggestions only — brought module by module during the product owner's AG review, each with what the AG says, its build state, and a recommendation.
- **Rule (the product owner, 12 Oct):** before recommending to park or simplify, check the code (`ERv2-sanitized` backend, `ERv2-frontend` frontend). **If it is already built, it stays.**
- Line references point at the module versions current on 11 Oct; SA-05 v3.1 and AG-12 v2.1 are the 11 Oct rewrites.

---

## The lens


## Who we're building for

ExpatReady's first market is immigration firms from **solo practitioners up to 15–20 staff, run by non-technical owners** *(widened 12 Oct; was 1–10)*. Even at 15–20 staff these firms behave like a small team:
- one or two decision-makers;
- everyone wears several hats;
- nobody configures settings for fun.

Typical firms:
- **Solo:** one RCIC plus an assistant.
- **4-person:** 2 consultants, a case manager, and an admin who also does billing.
- **10-person:** 3 consultants, 4 case officers, an office manager, intake/marketing, and the Owner.
- **15–20 person:** several consultants and case officers, an office manager, billing and intake staff — still one or two decision-makers, non-technical.

Release 1 stays **full-featured for day-to-day work**: no real capability is cut.

## The three layers of every feature

| Layer | Question it answers | Small-firm rule |
|---|---|---|
| **Capability** | What does the product do? | Keep it full. **Not in scope of this register.** |
| **Control** | Who may see, do or approve it? (roles, permissions, approval chains, supervision, visibility scopes, delegation) | Few, opinionated roles. Fine-grained keys may stay under the hood (data and code), not on screen. |
| **Configuration** | How many knobs change its behaviour? (settings, policies, per-office / per-role / per-type variants, thresholds, toggles, editors, admin dashboards, governance workflows) | Strong defaults, minimal knobs. Add a knob only when firms ask for it repeatedly. |

## The three-question test (Control and Configuration only)

1. Would a 4-person firm **notice** if this knob or control didn't exist?
2. Is there a **default that 80% of firms would keep**?
3. Can we **add it later without changing the data model**?

If the answers are **no, yes and yes**: ship the default and **park** the knob.

## Verdicts

- **Keep:** a firm in the target market (solo up to 15–20 staff, non-technical owner) needs it in Release 1. Also keep anything that protects the firm or ExpatReady even at small size: security floors, consent and unsubscribe, money integrity, who can sign or see billing, licence rules already decided.
- **Simplify:** keep a smaller version. Say exactly what the smaller version is.
- **Park:** don't build in Release 1. The default behaviour applies. It goes on the "Parked for later" list with a reason.

## Rule 9 — Intuitive for non-technical owners (12 Oct)

Kept features must not add cognitive load: zero setup (works on ExpatReady's defaults from day one); defaults first, knobs hidden (beyond the basics → collapsed "Advanced"); plain language (no permission keys or technical terms; settings describe outcomes); one screen, one job (grouped by what the owner wants to achieve). **Test for every screen and setting:** "Could a non-technical solo RCIC set this up alone in 15 minutes without calling support?" Each kept setting gets a stated default and a placement (main screen or Advanced); screens failing the test are flagged.

## Data-foundation rule

Park **depth**, never **data foundations**. If parking would force a data-model change later, flag it "keep in data, hide in UI":
- permission keys in code;
- ownership and audit fields;
- version records;
- office ids if multi-office is ever likely.

---

## Code-build check of parked / simplified items (12 Oct)

Backend `ERv2-sanitized` @ dev db646bf7 (10 Oct); frontend `ERv2-frontend` @ dev 8511b27e (11 Oct). Local checkouts, not fetched.

Read-only check of `ERv2-sanitized` (dev) and `ERv2-frontend` (dev). Nothing was written, and no git commands that change state were run.

**Paths used below.** B = `/Users/team-member/Documents/team-workspace/ERv2-sanitized`, F = `/Users/team-member/Documents/team-workspace/ERv2-frontend`.

**How to read the frontend column.** Many frontend screens are clearly marked mock. They have "MOCK BOUNDARY" comments, `*-fixtures.ts` data and `mock-surface-note.tsx`, and they make no API calls. "Built" there means the screen uses the real API through `getPoolClient` with a matching backend controller.

## Items that may need un-parking (built, partly built, or frontend only)

**BUILT (backend and frontend)**
- **R9 — second-person plan/price approval.** Fully done.
- **R10 — per-firm plan version and removal at renewal.** Fully done, including a worker re-pin step and a notice to firms.
- **R22.7 — firm web address change with 90-day redirect.** Built, but only as a Super Admin action. There is no firm self-service screen.

**PARTIAL**
- **R13.** The audit hash chain, its verify job, WORM off-site anchoring and the legal-hold API are built and wired. The compliance and investigation console is mock only. Two-person audit deletion does not exist.
- **R14.** Only part of this is built: on/off flags for the whole platform or one firm, kill switch, per-firm pin, history and revert, plus a global settings store with revisions. All of it is wired to the real API. Percentage rollouts, sticky hashing, allow/deny lists, user and country scopes, per-plan/firm/environment overrides, and per-firm rate and upload limits are not built. Maintenance with bypass tokens and per-firm banners exist as frontend mocks only.
- **R22.6 — support access for 1/7/30 days.** The backend is fully built and the Super Admin session screen is real. The firm-side screen where a firm grants access was not found.
- **R8.** Six platform roles ship (not four, not nine), and staff role assignment works for real. The role editor is a frontend mock with no backend route.
- **R17.** Only the client-MFA switch is real. `PortalVisibilityConfig` exists as a model but is unwired: the access check throws on every call. The six per-case switches and the portal policy screen do not exist.
- **Template version history / restore.** Built for Super Admin system email templates (backend routes and frontend history plus rollback). I am not sure this is the "template" module the 11-Oct decision meant.

**FRONTEND ONLY (mock)**
- **R11 — analytics console.** All tabs are mock. The backend has only an operations-counts overview and an FX service that nothing calls.
- **R18 — client invoicing settings.** All mock; no backend for firm-to-client invoicing.
- **R19 — forecast, quota, leaderboard, win probability per stage.** All mock. The pipeline screens call `/prospects/*` routes that do not exist in the backend.
- **Only-Owner protection.** The frontend has a mock "last owner" rule. The backend has no guard for firms: the platform-owner guard exists, and owners are exempt from seat-reduction suspension, but nothing stops deactivating the only firm Owner.

**NOT BUILT (either side):** R5, R12 (the analytics "Support" tab is mock tiles only), R20, Q14, Q18, template reach count, missing-French monthly counts, WhatsApp template variants with Meta status, the 7-day update notice, and the SA-01B startable check.

## Table

| Item | Backend state + evidence | Frontend state + evidence | Verdict |
|---|---|---|---|
| R5 supervised messages / licensed approver for AI text / "who may approve" setting / licensed approval for imported client | **None.** No messaging, approval-queue or AI-text model in the Prisma models list. There is no messaging controller (full controller list checked). Searches for supervised/licensed/AI-written/approval matched nothing relevant; "licence" hits are regulator config only. The import module (B/apps/api/src/import/) has no activation or approval step. | **None.** Messenger and communication run on fixtures only (F/src/features/messenger/messenger-fixtures.ts). No approval UI. | NOT BUILT |
| R8 staff-role editor; 9 vs 4 roles | **Partial.** Roles are a frozen registry: B/packages/contracts/src/schemas/role-template.ts:131 (`createFrozenRegistry`). Six platform roles: role-template.platform.ts:29,180,226,243,261,305 (owner, admin, support, billing-ops, content-publisher, auditor). There are `RoleTemplate`/`PlatformUserRole` models (authorization.prisma:96,158), but no template-write route; the `system/super-admin-role:manage` key exists only in the catalogue (permission-catalog-rows.superadmin-spine.ts:220). Assigning and changing staff roles is real (platform-user-lifecycle.controller.ts). | **Editor is a mock:** F/src/features/admin/rbac-catalog/components/role-templates/platform-sub-role-editor.tsx:30-41 says "as a MOCK… There is no template-write route". The role card list is real (from the registry). The staff screens mix real (`staff-api.ts`) and mock (`staff-mock-store.ts`, `use-staff-mock.ts`). | PARTIAL (editor = FRONTEND ONLY mock; 6 roles shipped) |
| R9 second-person approval for plan/price changes | **Built.** `PlanChangeRequest` model (entitlements-platform.prisma:260, requestedBy/reviewedBy). Self-approval blocked at B/apps/api/src/entitlements/plan-change.service.ts:412-413 (`SELF_APPROVAL`). Routes: plan-change-admin.controller.ts:70,86,108,136 (approve/reject/get/list, permission `system/plan:approve-change`). Price change requests: plan-price-change.controller.ts:44. | **Built, real API:** F/src/features/admin/plan-admin-catalogue/components/plan-approval-queue-panel.tsx:60 ("Wired to the real GET /plan-admin/change-requests…"); request-price-change-dialog.tsx. | BUILT |
| R10 per-firm plan version, removal at renewal | **Built.** `FirmPlanHistory.pinnedVersionId` (entitlements-platform.prisma:319). Resolver returns `applicableVersionId` (entitlements.service.ts:340). renewal-repin.service.ts (moves the pin at the renewal boundary). Called from lifecycle-convergence.service.ts:137 and worker saas-billing.lane.ts:167. Firm notice: entitlement-reduction-notice.service.ts. | **Built, real API:** F/src/features/admin/firm-detail/firm-entitlements/scheduled-reductions-panel.tsx (via use-firm-entitlements.ts, `getPoolClient('platform')`). Firm side: F/src/features/firm-billing/components/plan-entitlements-tab.tsx:56 (pendingReduction). | BUILT |
| R11 SA analytics (MRR/ARR, FX, per-country, alert rules, metric catalogue, role dashboards, health) | **Mostly none.** No MRR/ARR code. `GET /billing/overview` returns operations counts only (B/packages/contracts/src/api/routes/sa4-billing-overview.ts:45-55). FX: `FxRateSnapshot` model plus B/apps/api/src/fx/fx-rate.service.ts with a manual source adapter, but no controller and no caller outside fx/. No analytics, alert or metric controllers. | **Mock:** all of F/src/features/admin/analytics-console/* runs on `*-fixtures.ts`. use-analytics-business.ts:11 says "Mock boundary. Replace when the API lands." This covers alerts/rules-section, exports/metric-catalogue, countries/, health/ and analytics-roles.ts. | FRONTEND ONLY (mock); FX plumbing in backend, unused |
| R12 support tool (SLA, escalation, routing, canned replies, KB, CSAT, metrics, settings) | **None.** No ticket, SLA or KB models or controllers. "ticket" appears only as a reference string on impersonation sessions (B/apps/api/src/auth/impersonation/*). | **None,** apart from a mock "Support volume" tile tab in the analytics console (F/.../analytics-console/components/analytics-support-panel.tsx:1-7, fixture-backed). No support route in the admin routes. The SLA/routing hits are CRM prospect features, not a support desk. | NOT BUILT |
| R13 audit hash chain, verify job, sealed off-site copies, two-person deletion, investigation console, compliance dashboard, legal hold | **Mostly built.** Chain: B/apps/api/src/audit/chain-append.service.ts, chain-verify.service.ts, platform-chain-*.ts. Jobs: B/apps/worker/src/jobs/chain-verify.job.ts and worm-anchor.job.ts, wired in worker bootstrap/governance-verify.lane.ts:174-201. `WormAnchorHead` model (security-governance.prisma:471, S3 key/version). Legal hold: `LegalHold` model plus legal-hold.controller.ts:59,82,105 (place/release/list). Cross-firm audit read: audit-read.controller.ts:92-135. Two-person audit deletion: none found. | **Mock:** F/src/features/admin/compliance-console/* (every panel imports fixtures; components/audit/audit-verify.ts and audit-integrity-banner.tsx are mock). No legal-hold UI on the real API. | PARTIAL (backend largely built; UI mock; no two-person deletion) |
| R14 feature flags / settings registry / per-firm limits, maintenance, banners | **Core only.** B/packages/contracts/src/schemas/feature-flag.ts:15-17 says: "USER/COUNTRY/PLAN scopes, %-rollout, PlatformSetting, maintenance mode, and banners are OUT of this slice". `FlagScopeSchema = ['PLATFORM','FIRM']` (line 23). On/off values only (`PlatformFlagValue`/`FirmFlagValue`, entitlements-platform.prisma:378,406). Kill switch and firm pin: flag-admin.controller.ts:146-278. Global `PlatformSetting` + revision (platform-setting.controller.ts:70-91), with no overrides. No per-firm rate or upload limit code. No maintenance or banner backend. | **Real** for flags: F/src/features/admin/platform-flags/components/flag-api.ts. **Mock:** maintenance with per-firm scope and bypass token (platform-maintenance/components/hooks/use-maintenance.ts: "(mock) maintenance store"; maintenance-bypass-token-panel.tsx) and per-firm announcements (platform-announcements/components/announcement-api.ts:4 "MOCK BOUNDARY"). | PARTIAL (simple flags built; rollouts/scopes/overrides/limits none; maintenance and banners FRONTEND ONLY mock) |
| R17 portal: six per-case visibility switches + firm portal policy screen | **Model only, unwired.** `PortalVisibilityConfig {firmId, entity_type, isVisible}` (identity-auth.prisma:578) is a firm-level entity allow-list, not per case. B/apps/api/src/tenancy/assert-portal-ownership-chain.ts:14-21 says "reserved SEAM… throws unconditionally". Client MFA policy is real: mfa-policy-admin.controller.ts. | **None** for the switches or the policy screen. The portal itself runs on mock data (F/src/features/client-portal/portal-mock-data.ts). The client-MFA switch is real (F/src/features/mfa-settings/mfa-settings-page.tsx:52-187). | NOT BUILT (only client MFA exists) |
| R18 invoice numbering, tax profile editor, reporting currency + FX, payment-plan mode, plan templates | **None** for firm-to-client invoicing. `billing/invoices/*` is SaaS billing of firms by ExpatReady. `FxRateSnapshot` is unused (see R11). | **Mock:** F/src/features/invoicing/settings-page.tsx (reporting currency, `MOCK_FX_RATES`, tax profiles, numbering); invoicing-store.ts imports `MOCK_*`. Per-office numbering format and reset cycle: F/src/features/settings/office-location/invoice-configuration-dialog.tsx:33-55 (no API). Plan mode `DRAW / SINGLE_INVOICE`: invoicing-types.ts:242. Payment-plan templates: not found. | FRONTEND ONLY (mock); templates NOT BUILT |
| R19 forecast, commit/best case, quotas, leaderboard, win probability, load targets, role dashboards, report configure | **None.** No forecast or quota code ("quota" hits are rate limits). No `/prospects` routes exist in the backend. | **Mock:** F/src/features/pipeline/crm/forecast-panel.tsx:169-201 (weighted, commit vs best case vs quota, `useCrmFixtures`, CrmMockNote). prospects/rep-leaderboard.tsx:7 ("from the mock"). crm/stage-config-section.tsx:25-54 (winProbability). prospect-reports-page.tsx:74 ("fixture-backed"). Load targets, six role dashboards and metric definitions: not found. Note: pipeline-api.ts calls `/prospects/board` etc., which have no backend. | FRONTEND ONLY (mock), partial coverage |
| R20 notification matrix, quiet hours, digest | **None.** No quiet-hours, digest or notification-preference code ("digest" hits are hash digests). | **None.** settings/reminder-notification is a mock UI-only slice (reminder-notification-view.tsx:1). No matrix screen. | NOT BUILT |
| R22.6 support changes allowed for 1/7/30 days | **Built.** `FirmSupportGrant` (tenancy-core.prisma:792, expiresAt). `durationDays` limited to 1, 7 or 30 (B/packages/contracts/src/schemas/firm-support-access.ts:93-110). Expiry computed in firm-support-access.service.ts:245. Routes: firm-support-access.controller.ts:90,98 and the revoke controller:55. Consumed by auth/authcore/support-policy.ts. Session mode READ_ONLY / WITH_CHANGES (firm-support-access.ts:60). | **Super Admin side real:** F/src/features/admin/support-access/* (support-access-api.ts, WITH_CHANGES mode). **Firm-side grant screen: not found** (only the permission keys in settings/components/role-authority.ts:24-25). | PARTIAL (backend built; firm grant UI missing) |
| R22.7 firm web address change + 90-day redirect | **Built, platform-operated.** `POST firms/:firmId/slug` (B/apps/api/src/firm/firm.controller.ts:366, `system/firm:edit`, platform pool). firm-slug-change.ts:160 creates the `FirmSlugRedirect` (90 days, `FIRM_SLUG_REDIRECT_DAYS`, tenancy-core.prisma:807-813). Availability check: firm.controller.ts:247. Unclear: I found only the label reservation and claim check, no live old→new redirect resolver. | **Built, real API,** Super Admin only: F/src/features/admin/firm-detail/components/firm-profile/firm-web-address-api.ts. No firm self-service screen. | BUILT (SA-side; firm self-serve not built) |
| Q14 urgent-correction route | None (no matches). | None. | NOT BUILT |
| Q18 questionnaire "who answers" switch | None (no respondent or answerer fields in models or contracts). | None. | NOT BUILT |
| Template version history / restore UI | **Built for system email templates:** system-mail-template.controller.ts:88 (versions), 149 (revert), 162 (versions/:versionId/rollback). | **Built, real API:** F/src/features/admin/system-mail-templates/components/history/version-history-panel.tsx, dialogs/rollback-dialog.tsx. The firm template-management tabs are mock and have no versions. | BUILT for system email templates (unclear if this is the module meant) |
| Template reach count | None. | None. | NOT BUILT |
| Missing-French monthly counts | None. Only a publish-time hard gate on a missing fr-CA body (system-mail-template-admin.service.ts:370). | None. | NOT BUILT |
| WhatsApp variants per template + Meta approval status | None. | None. Only mock messenger copy about the 24-hour window (messenger-types.ts:59). | NOT BUILT |
| ExpatReady 7-day update notice | None. | None. | NOT BUILT |
| SA-01B "startable" check needing form box maps | **None.** No "startable" concept anywhere. Field-map checks only validate transform types on existing maps (B/apps/api/src/pack-authoring/internal/pack-graph-validation.transform-checks.ts; arms.ts:493 `form-field-maps`); they are not a startability gate. | None. | NOT BUILT |
| Block deactivating/suspending the only firm Owner | **Not guarded for firms.** The last-owner guard is platform-only (B/apps/api/src/auth/lifecycle/platform-owner-guard.ts:15). deactivate-lifecycle.service.test.ts:189-200 asserts "the FIRM arm never asks the owner-count question". Owners are exempt from seat-reduction suspension (firm-seat-selection.service.ts:27, NON-owner staff only). No guard on revoking the firm-owner role in role-assignment.service.ts. | **Mock rule:** F/src/features/settings/components/role-authority.ts:164-168 (`lastOwner`); deactivate-user-dialog.tsx:108; the error is thrown by a mock in settings-api.ts:123. | FRONTEND ONLY (mock); backend gap |

## Points to watch
- **Only-Owner gap.** The UI suggests the only firm Owner is protected, but the API accepts deactivating them. This needs a backend guard whatever is decided about parking.
- **Pipeline routes.** `F/src/features/pipeline/components/pipeline-api.ts` calls `/prospects/*` routes that do not exist in this backend checkout.
- **R14 was already cut.** It was scoped down on 2026-08-04 according to the comment in `feature-flag.ts:15-17`, so parking it matches what is in the code.
---

## Review: SA-06-AG-16-AG-01

## Complexity register: SA-06 v3.4, AG-16 v1.14, AG-01 v1.18

I read all three documents in full and changed no files. File paths, relative to the base folder:
- `FINAL-SuperAdmin-FR/SA-06-rbac_v3.4_2026-10-10.md`
- `FINAL-Agent-FR/AG-16-firm-settings-and-integrations_v1.14_2026-10-10.md`
- `FINAL-Agent-FR/AG-01-firm-setup-and-onboarding_v1.18_2026-10-10.md`

Line numbers below refer to these files.

**Headline:** the permission data model is sound and cheap to keep. Most of the complexity sits in three places:
- the role editors (one for firms, one for Super Admin);
- the AG-16 "Advanced" governance layer (Team safeguards, autonomy per automation, timings, the notification matrix);
- the rule that every role change needs a written reason.

All three can shrink to defaults without changing any table.

---

### SA-06 — RBAC (verified counts)

- **Firm keys:** 259 `agent/*` keys (SA-06:228). I recounted them by script from the §10b tables and got 259. Only 38 exist in code today (SA-06:228, :1154).
- **Starter roles:** 6 seeded (SA-06:258, SA-6-31). Keys each holds by default: Owner 259, Admin 241, Case Manager 157, Case Officer 105, Billing / Finance 44, Read-only 39 (SA-06:1360-1367).
- **Owner-only:** 5 actions, which use 6 keys (SA-06:1369).
- **Owner + Case Manager only:** 5 keys, the 4 professional approvals plus `case:reopen` (SA-06:1375).
- **Settings-type keys:** 54 of the 259 are configure / manage / policy / template / publish keys (my grep of §10b). That is roughly a fifth of what a custom-role picker would show.
- **Super Admin staff roles** (internal): 9 starter roles, with an editor the Platform Owner uses with no second approval (SA-6-19, SA-6-20). This creates no firm-facing complexity, so it is not scored.

| # | Item | Where | Layer | Who it serves | Verdict | Smaller version / default | Data foundation to keep? | Reason |
|---|---|---|---|---|---|---|---|---|
| S1 | 259 firm keys offered in a role editor | :228, §10b | Control | Large | Simplify | Keys stay in code and are never shown to firms | Yes: the key catalogue, plus each key naming its feature | No 1–10 firm reads 259 ticks; the AND check with the plan works without any UI |
| S2 | Six starter roles | :258, SA-6-31 | Control | 4–10 | Keep (rename) | Rename Case Manager to "Consultant (signs off)" so the role holding approvals matches what an immigration firm calls it | Yes: role keys `firm-*` | Six is already small; the label is the only mismatch |
| S3 | Firm custom-role editor (copy or build from scratch, the Admin ceiling, delete with replacement) | §3.5 :318-338, SA-6-12, SA-6-13, SA-6-32 | Control | Large | **Park** | Fixed starter roles plus two add-ons (see the proposal below) | Yes: `FirmUserRole` by key and several roles per person (built, :204); keep the planned `FirmRole` design | The doc names unbuilt custom roles as the platform's main escalation risk (:168, :1107). Parking it removes the risk outright |
| S4 | Several roles per person, access is the sum | SA-6-28, BR-2 | Control | 4–10 | Keep | — | Yes, already built (`authorization.prisma:173-183`) | People in small firms wear several hats. This is also what makes the add-on idea work |
| S5 | Own/all visibility for clients, cases, prospects and tasks; open by default; narrowing only by copying a role | SA6-D1 :24, SA-6-24 | Control | 10-person | Simplify | Add a starter-role variant "Case Officer — own files only". Remove nothing at run time: BR-1 is additive with no deny list | Yes: the `view.own` / `view.all` keys | Narrowing today requires the custom-role editor (S3). A variant gives the same result with no editor |
| S6 | Attached records follow their parent; "restricted parent" for tasks; who sees unlinked imported files | SA-6-25 | Control | All | Keep (no UI) | Rules live in code only | Yes | These are rules with no knob, and they prevent leaks |
| S7 | Dashboards split own/all, plus a separate financial-reports key | SA-6-24, :283 | Control | 10-person | Keep (no UI) | Seeded once; no knob | Yes: the keys | Invisible to firms; cheap |
| S8 | Four approval keys, "grantable to any role" | SA6-D2, SA-6-26 | Control | All | Simplify | Grant by giving a person the "Sign-off" add-on role, not by editing a role | Yes: the 4 keys | Delegating sign-off is the one grant a 4-person firm actually needs |
| S9 | Approval routing: shown to all holders, licensed holders marked "preferred", Owner as fallback | SA6-D9 :32, SA-6-27 | Control | All | Simplify | One rule shared with AG-16 BR-22 (see open question 4) | No | It currently conflicts with AG-16's "route to the Owner when no licensed user is active" |
| S10 | Informational note when an approval key goes to someone without a credential | :289, AC5.2 | Control | Large | Park | No note | No | Cosmetic; nobody would miss it |
| S11 | Five Owner-only actions, which the server refuses on any custom role | SA6-D5, SA-6-13 | Control | All | **Keep** | — | Yes | Protects the firm and ExpatReady at any size |
| S12 | Subscription billing screen: Admin may update the card and pay; upgrades, downgrades, invoices and billing details are Owner-only | :271, :1078-1084 | Control | Solo / 4-person | Simplify | Let the Admin also view and download subscription invoices; keep cancellation and downgrades Owner-only | Yes: the keys | In a 4-person firm the admin does the billing and cannot download the firm's own invoice (open question 8) |
| S13 | Disposing of documents: Owner by default, Owner may delegate it | :271, Appendix C | Control | Large | Keep (no UI) | Owner only | Yes | Delegating it needs custom roles (S3) |
| S14 | Admin may give or remove a role only if the Admin holds every key in it | SA6-D3 :26, SA-6-29 | Control | All | Keep, server-side | The UI explains it in one line: "Only the Owner can give roles that can sign off" | Yes | This is the escalation guard; without S3 it applies only to assignment |
| S15 | Only an Owner gives or removes the Owner role; the last active Owner is protected; nobody changes their own roles | BR-18, SA-6-29 | Control | All | **Keep** | — | Yes | Security floor. There is a gap in how an Owner can be locked out (open question 3) |
| S16 | A written reason is required for every role create, edit, delete, give and remove | BR-23 :534, SA-6-18 | Config | Large | Simplify | Always audit who, when and before/after; the reason is optional except when the Owner role changes | Yes: a reason field on the audit record | A solo or 4-person firm typing a reason to onboard a hire is pure friction |
| S17 | Starter-role editor in Super Admin: drafts, second-person approval, impact preview, versions, restore, retire with firm notices | SA6-D12 :35, §3.9, SA-6-34 to SA-6-43 | Config (internal, with firm-facing effects) | ExpatReady | **Park** | Starter roles change through a reviewed code release, as before v3.2 | Yes: keep `RoleTemplate` / `RoleTemplatePermission` as data, plus a nullable `versionId` | The firm-facing side effects (retired-role state, notices, "retired — reassign") are complexity for firms that never asked for it |
| S18 | A new firm permission is held by Owner only until Super Admin ticks it onto other roles | SA-6-41 | Control | All | Simplify | Every release ships its default role ticks | Yes | Otherwise staff silently miss new features |
| S19 | Firm-wide audit log for Owner and Admin | SA-6-33 | Control | All | Keep | — | Yes | Needed for accountability |
| S20 | Support sessions limited to read-only or limited-write, and need Owner consent | :377, :441 | Control | All | **Keep** | — | Yes | Protects the firm |
| S21 | Read-only starter-role viewer with "Copy to a new role" | :300 | Config | 10-person | Simplify | Plain-language list with no Copy button | No | Copy only exists to feed S3 |

**What a 1–10 person firm should see** (all keys stay in code):
- **Roles:** Owner, Admin, Consultant (today's Case Manager), Case Officer, Billing / Finance, Read-only.
- **Two add-ons**, built only from things that already exist (several roles per person summed, BR-2; grants by template key, SA-6-28):
  - "Can sign off": a small role holding the 4 approval keys plus `case:reopen`, given alongside a person's main role.
  - "Own files only": a Case Officer variant without the `view.all` keys. It has to be a variant, because BR-1 forbids taking access away at run time.
- **Switches:**
  - Turn sign-off on per person: give or remove the "Can sign off" add-on.
  - Own files only: pick the "own files only" variant for that person.
  - Admin may download subscription invoices (S12).

Nothing else is visible. This needs no new table.

---

### AG-16 — Firm settings and integrations

| # | Item | Where | Layer | Who it serves | Verdict | Smaller version / default | Data foundation to keep? | Reason |
|---|---|---|---|---|---|---|---|---|
| A1 | Locale, timezone and business-hours profile | :207, AG-16-3 | Config | All | Simplify | Seeded from the country; business hours as one weekly schedule | Yes | Clocks need it; keep the knob minimal |
| A2 | Reporting currency plus a choice of FX source (manual or provider) | :207, AG-16-4, Q1 :848 | Config | 10-person | Simplify | Reporting currency = the country's currency (editable); one platform FX source, no choice offered | Yes: `FxRateSnapshot`, `fxSource` | A firm in one country rarely needs to choose an FX source |
| A3 | Invoice numbering per office: format placeholders, reset cycle, start number | :222, AG-16-6 | Config | Large (multi-office) | Simplify | One firm-level series: prefix plus yearly reset | Yes: nullable `officeId` | Multi-office is rare at 1–10 people |
| A4 | Tax and terms defaults; invoice currency overridable per office; bilingual footer | :223, AG-16-8 | Config | All / large | Simplify | One firm tax profile and terms; park the per-office currency override | Yes: nullable `officeId` | Firms need tax and terms; the per-office override is a large-firm need |
| A5 | Firm notification matrix (event × channel × audience), quiet hours, digest | :237, :243, AG-16-9, AG-16-33 | Config | Large | **Park** | Code defaults; urgent events always go out | Yes: `FirmNotificationPolicy` (optional) | A 4-person firm won't notice it is missing; 80% keep the defaults; it can be added later |
| A6 | Each user's notification preferences capped by the firm policy, plus language | :238, AG-16-10, BR-6 | Config | All | Simplify | Each user sets on/off per category plus language; no cap while A5 is parked | Yes | Personal control is enough |
| A7 | Own-account accounts (email, calendar, payment, WhatsApp) with health monitoring | AG-16-12 to AG-16-19, AG-16-38 | Capability / Config | All | Keep | — | Yes: `FirmConnection` | Capability; health alerts protect the firm |
| A8 | Separate key for "test connection" | :758 | Control | None | Park | Covered by the `integration-<rail>:manage` key | No | A key with no separate job |
| A9 | Payment fallback (hold, or route through the platform per plan) | AG-16-17, BR-8, Q2 :849 | Config | All | Keep, no knob | Always hold | Yes | Money integrity; the open question shouldn't become a setting |
| A10 | MFA requirement (none / privileged / all) plus factors | AG-16-24, :577 | Config | All | Simplify | MFA required for all staff, no knob (or a single on/off) | Yes | Security floor (open question 5) |
| A11 | IP allow-list with self-lockout guard | AG-16-25, BR-10 | Config | Large | Park | None | Yes: the `ipAllowlistCidrs` field | No 1–10 firm uses one; the lockout risk exceeds the value |
| A12 | Audit log viewer | AG-16-26 | Control | All | Keep | — | Yes | Accountability |
| A13 | Individual / Corporate view switch | AG-16-30 | Config (per user) | All | Keep | — | No | Decided, and costs little |
| A14 | Team safeguards: one switch with four parts; turns on automatically at 5 staff; one-time 7-day grace; only the Owner may switch it off, with a reason; quarterly reminder; banner when the firm crosses 5 again; per-part toggles (Owner, with reason); backup approver | §3.10 :349-369, AG-16-40 to AG-16-45, AG-16-49, BR-19 | Config / governance | Large | **Simplify (largest win)** | Two plain switches, default off: "Escalate missed deadlines" and "Second approver on government forms". Park the automatic turn-on, grace, reminders, banner, per-part reasons, at-risk marks, routing to supervisors and the backup approver | Yes: the `FirmTeamSafeguards` booleans | About 9 sub-rules govern one switch; a 10-person firm behaves like a team of 3–5 |
| A15 | Supervised client messages: turns on automatically when an unlicensed user who can message clients exists; only the Owner switches it off, with a reason; one-time notice to switch it back on | §3.11, AG-16-47 | Control | 4–10 | Simplify | One Owner switch; no reason prompt and no re-enable notice; the default is your call | Yes: `FirmSupervisedMessages` | By default every edited message from a 4-person firm's case manager waits for the RCIC (open question 7) |
| A16 | Who may approve AI-written client text (licensed only, or licensed plus named roles) | AG-16-46 | Config | 10-person | Park | Licensed users, with the Owner as fallback | Yes: `FirmAiTextApproval.policy` | A small firm won't notice |
| A17 | AI Doers switch: locked until provider terms are recorded; Owner acknowledges once | AG-16-35, BR-18 | Config | All | **Keep** | — | Yes | Protects ExpatReady as the data processor |
| A18 | "Send automatically / Ask me first" per automation, plus locked floor rows | :341, AG-16-36, AG-16-50 | Config | 10-person | Simplify | One firm switch, "Send standard messages automatically"; the floors appear as one static line | Yes: `FirmRecipeAutonomy` | Per-automation tuning is a large-firm need; the floors are enforced in code anyway (BR-17) |
| A19 | "Review your standard messages" one-time confirmation | §3.12, AG-16-48 | Config / gate | All | **Keep** | — | Yes | Stops seeded templates going out unreviewed under the firm's name |
| A20 | Reminders and waiting times: 5 values with limits | §3.13, AG-16-51 to AG-16-53 | Config | 10-person | **Park** | Defaults fixed in code: 5 / 7 / 4 / 2 / 2 | Yes: keep the `FirmAutomationTimings` columns, or add them later (additive) | It passes the three-question test: nobody would notice, there is an 80% default, and it can be added later |
| A21 | List of approved WhatsApp templates mapped to firm templates | AG-16-54 | Config | All using WhatsApp | Keep | — | Yes | The provider requires it |
| A22 | Main settings screen plus "Advanced", and Owner-only checks that have no permission key | :335, :751-754 | Config | — | Simplify | With A14 to A20 trimmed, "Advanced" nearly empties | — | Owner checks without a key are hidden control logic (SA-06:1379); fewer is better |

---

### AG-01 — Firm setup and onboarding

| # | Item | Where | Layer | Who it serves | Verdict | Smaller version / default | Data foundation to keep? | Reason |
|---|---|---|---|---|---|---|---|---|
| F1 | Seat counting: active users and pending invitations count; suspended users keep their seat | AG-1-13, BR-6 | Control | All | **Keep** | — | Yes | Money integrity |
| F2 | Work handover: one new owner per type of work, eligibility checked by permission, licensed-only for lead RCIC, pop-up when nobody is eligible | AG-1-48, AG-1-49, BR-17 | Control | 4–10 | Simplify | Default "Hand everything to [person]", with an optional change per type | Yes | Small firms hand over to one person |
| F3 | Admin-lockout guard (tied to an undefined "RBAC-admin permission") | AG-1-22, BR-5 :486 | Control | All | Keep, clarify | Name the key | Yes | Floor; but undefined (open question 6) |
| F4 | Offices assigned per user; settings scoped per office | AG-1-16, :250 | Config | Large | Simplify | Offices hidden until a second office exists | Yes: `officeId` | Multi-office is rare |
| F5 | Starter roles published in Super Admin, shown as "retired — reassign" | AG-1-17, AG-1-61 | Control | — | Park (follows S17) | Fixed starter roles | Yes | Follows S17 |
| F6 | Custom roles: copy or scratch, plan-limited picker, role-in-use reassignment | AG-1-18, AG-1-20, AG-1-23, AG-1-60, AG-1-62, :286 | Control | Large | **Park** (follows S3) | The two add-ons | Yes | Follows S3 |
| F7 | Capability preview at invite and in the role editor | :245, AG-1-24 | Control | All | Simplify | Keep at invite (plain-language list); drop it with the editor | No | Cheap at invite |
| F8 | Reason required on invite, edit, delete and reassignment | AG-1-66, :252 | Config | Large | Simplify (follows S16) | Optional reason; audit always | Yes | Every invite costs a 4-person firm a typed justification |
| F9 | Professional approvals seeded on Owner and Case Manager | AG-1-63 | Control | All | Keep, via the add-on | — | Yes | — |
| F10 | Each person maintains their own credential, plus `firm-credential:manage` for anyone's | AG-1-64, AG-1-31 | Control | All | **Keep** | — | Yes | The solo RCIC must be able to do it |
| F11 | Every *view* of a credential is audited | :310, BR-10 | Config | Large | Simplify | Audit edits only | — | Logging every screen view adds noise, not value |
| F12 | Firm MFA policy (required for all / required for admins / optional); proposed launch default "optional" | AG-1-40, Q4 :812 | Config | All | Simplify | MFA required for all staff, or a single switch (open question 5) | Yes | — |
| F13 | One session at a time; no short idle timeout (28 days unused → sign in again); password change ends other sessions | AG-1-55, AG-1-56, AG-1-67 | Config (platform rule) | All | Keep | — | — | Already a platform rule with no knob, which is the right pattern |
| F14 | Step-up re-authentication | AG-1-42, Q9 | Control | Large | Park | — | No | Already marked as a fast-follow |
| F15 | Onboarding checklist, required vs optional steps, two hard gates, "I work solo" | AG-1-35 to AG-1-38 | Config | Solo / 4-person | **Keep** | — | Yes | Shortens the path to a first client |
| F16 | Separate permissions for RBAC, credentials, payment and security | AG-1-21, BR-4 | Control | All | Keep (no UI) | Keys only | Yes | Costs nothing once keys are hidden |

---

### (a) The five highest-leverage simplifications

1. **Park the firm custom-role editor** (SA-06 S3, AG-01 F6) and replace it with six roles plus two add-ons. This removes the risk SA-06 itself names ("not safe to sell", :168), a whole screen set, and about 10 requirements. No data change is needed: `FirmUserRole` already grants by key and allows several roles per person.
2. **Park the Super Admin starter-role editor** (S17 / SA6-D12). It removes about 10 requirements, a new versions table, an approval queue, and every firm-facing "retired role" state, while keeping starter roles as data.
3. **Cut Team safeguards down to two plain switches** (A14). It removes the automatic turn-on at 5 staff, the grace period, quarterly reminders, the banner, per-part reasons and the backup approver: about 9 rules on one setting.
4. **Park the firm notification matrix, quiet hours and digest** (A5), plus **Reminders and waiting times** (A20). Defaults in code; the tables are additive later.
5. **Make the role-change reason optional** (S16 / F8) and **replace per-automation sending settings with one switch** (A18). Both are high-frequency friction for small firms with no safety loss, because audit before/after stays.

### (b) Must stay even for a solo firm

- The five Owner-only actions, which the server refuses on custom roles (S11).
- Owner-role protection and the rule that nobody changes their own roles (S15).
- Support-session limits and Owner consent (S20).
- The AI Doers lock until provider terms are recorded, with the Owner's acknowledgement (A17).
- Human approval of AI-written client text, enforced in code (AG-16 BR-17).
- The standard-messages review (A19).
- Each person maintaining their own credential, and a departed person's licence never going on new documents (F10, AG-1-51).
- Seat counting (F1).
- Holding payments rather than silently routing them through the platform (A9).
- Encrypted, write-only connection secrets (AG-16-18).
- The audit log (S19 / A12).
- The onboarding checklist and its two hard gates (F15).

### (c) Open questions for you

1. **Parking custom roles reverses SA6-D3 and SA3-D18** (AG-01:88: custom roles "in every plan"), and **parking the starter-role editor reverses SA6-D12**, decided on 10 Oct. Confirm both reversals.
2. **Would "Can sign off" and "Own files only" as extra starter roles** be acceptable in place of firm-built roles?
3. **Gap: there is no guard on deactivating or suspending the only Owner.** BR-18 and SA-6-29(c) protect only removing the Owner *role*. AG1-D15 and BR-5 protect only the last *admin*. An Admin holding `agent/staff:manage` could suspend or deactivate the sole Owner while the Admin remains as "an admin". That would leave the five Owner-only actions and the Owner approval route with nobody (AG-1-14, AG-1-22).
4. **Two approval-routing rules disagree:**
   - SA-06 (SA6-D9, :290): show the item to all holders of the approval key; licence is only a "preferred" label; the Owner steps in only if nobody holds the key.
   - AG-16 (BR-22 :524, AG-16-47): when no licensed user is active, the item goes to the Owner.

   SA-06 itself says AG-7-68 and AG-11-89 are "to be aligned" (:32). Which rule wins?
5. **MFA default and where the setting lives:**
   - AG-01 Q4 (:812) proposes MFA "optional" at launch, but SA3-D18 calls MFA part of the security floor (AG-01:88).
   - The setting is stored twice: `FirmConfig.mfaPolicy` (AG-01:562) and `FirmSecurityPolicy.mfaRequired` (AG-16:577).
6. **"RBAC-admin permission" is never named** (AG-1-22, BR-5). Which key is it: `agent/role:assign`?
7. **Supervised client messages default to on** whenever an unlicensed user who can message clients exists (AG-16-47). Is that the default you want for a 4-person firm?
8. **Subscription invoices are Owner-only** (SA4-D23, SA-06:1084), so the Admin who does billing cannot download them. Do you want to relax this?
9. **The data models disagree.** AG-01 §7 specifies `Role` / `RolePermission` / `UserRole` tables with `isStarter` (AG-01:566-568). SA-06 §7 says ERv2 has no `Role` table: roles are granted by template key through `FirmUserRole`, and `FirmRole` is still to build (SA-06:586, :604). Which one is canonical?
10. **Stale text to fix** (it gives no new decisions but will mislead builders):
    - AG-16-54 cites `agent/integration-whatsapp:edit`; the key is now `:manage` (AG-16:497).
    - AG-16 §10 cites "SA-06 open question N6", which is closed (AG-16:763).
    - AG-01's ER diagram says a user "holds one" role (AG-01:165).
    - SA-06 still describes starter roles as code-owned or "the same six" in places that contradict SA6-D12: BR-13 (:524), BR-6 (:517), §11 (:1119), and the §2 Billing row (:184).
    - AG-16:59 records that AG-17 still says escalation and at-risk marks are "off by default", against AG11-D9's automatic turn-on at 5 staff.

**Confidence:** high on the counts and line citations; I read every line, and the 259 count was re-verified by script. The verdicts are judgement calls against the lens. The two reversals (open question 1) need your decision because they overturn items marked as decided.
---

## Review: SA-02-03-04-07

## Founder-lens review: SA-02, SA-03, SA-04, SA-07 (read-only, no files touched)

I read all four documents in full, plus the lens. Line numbers below are `file:line` in `FINAL-SuperAdmin-FR/`. Short forms: **S2** = SA-02 v2.22, **S3** = SA-03 v2.18, **S4** = SA-04 v2.19, **S7** = SA-07 v2.13.

**Headline.** Two kinds of depth are mixed together in these modules:
- **Money and legal depth (S4 tax, invoices, retention; S2 deletion and notices) is mostly justified.** Keep it.
- **Internal governance depth is built for a larger operations team than the 4–6 staff S7 itself assumes (S7:40, S7:294).** This covers the nine staff roles plus a role editor, second-person approval queues, a scheduled per-firm plan-version machine, the handover prompt, and discount offer windows.

One item is firm-facing friction, not just internal weight: **one session at a time for firm users** (S7:156 point 8, S7:472). It sits in an SA module but every firm will feel it.

---

### SA-02 — Tenant / firm management

| # | Item | Where | Layer | Who it serves | Verdict | Smaller version / default | Data to keep? | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | Two routes in: Super Admin creates the firm, or a private sign-up link | S2:46, S2:281-282, SA-2-22 | Capability / Control | Small firm | Keep | — | — | The link lets a firm pick its plan itself. Both routes now start a trial without a card, so they cost about the same. |
| 2 | Sign-up link states (sent / **opened** / used / expired / revoked) and a links list | S2:293, S2:477 | Config | Large ExpatReady team | Simplify | Track used / expired / revoked only; drop "opened" tracking | Keep the `status` enum | Open-tracking is sales-ops telemetry. |
| 3 | Firm directory with 9 filters (status + hold reason, plan, country, manager mine/unassigned, over-limit, overdue, trial ending in N days, date range) | SA-2-3 (S2:365), S2:299 | Config | Large ExpatReady team | Simplify | Name search + status + "needs attention" (overdue / over-limit / trial ending) | Indexed columns | At launch there are tens of firms and one country (S3:57 says no existing firms), so country and date filters are noise. |
| 4 | Optional account manager per firm, falling back to a shared inbox | S2:52, SA-2-26 | Control | Large ExpatReady team | Simplify | All alerts go to the shared inbox; account manager is a plain field, editable from the firm record | Keep `accountManagerUserId` | With 4–6 staff, one inbox is the real routing. |
| 5 | Account-manager handover prompt at staff deactivation, plus an "account manager inactive" badge | SA-2-26 (S2:405), AG1-D13 (S2:99), S2:550 | Control | Large ExpatReady team | **Park** | Firms fall back to the shared inbox automatically; reassign later from the firm record | Audit of fallback | The fallback already makes it safe. The prompt is UI for someone leaving with 30 firms (S7:605). |
| 6 | Support "log in as": read-only anytime, reason, step-up, blocked-action list, banner, owner history | SA-2-16/17/29, S2:331-338 | Control | Small firm (trust) | **Keep** | — | `SupportSession` | Security floor and the Law 25 accountability basis (S2:60). |
| 7 | Firm toggle "Allow support to make changes" for **1, 7 or 30 days** | SA-2-28, S2:53, S2:154 (Should now) | Config (firm-facing) | Small firm | Simplify | One fixed window (e.g. 7 days), revocable | `FirmSupportPermission.expiresAt` | Three durations is a knob a 4-person firm never tunes. |
| 8 | Support session length "60 min, configurable" | SA-2-18, S2:335 | Config | Large ExpatReady team | Simplify | Fixed at 60 min | — | No one needs this setting. |
| 9 | Security-lock investigation sessions limited to Platform Owner or Security & audit, flagged | SA-2-30, S2:55 | Control | Both | Keep | — | `investigation` flag | Fraud and breach handling is a floor, even when one person holds both roles. |
| 10 | Supervised export for a closed security-locked firm (request → identity check → expiring link) | SA2-D11, SA-2-37 | Capability / Control | Small firm (CICC duty) | Simplify | A documented manual runbook: an audited export job run by an Owner. No request/verify UI. Already "Should now" (S2:156). | `FirmDataExport` (`SUPERVISED`) | The duty is real (CICC s. 7.2, S2:61), but it will be rare. |
| 11 | Web address change after creation, with a 90-day redirect and reservation | SA-2-27, S2:56 | Config | Large firm / rare | **Park** | Address fixed after creation; an engineer changes it on request | Keep the `FirmSlugRedirect` shape | Rebrands are rare at 1–10 firms of this size. |
| 12 | Switch the owner contact to another active staff member | SA-2-20 | Control | Small firm | Keep | — | — | Needed when an owner leaves. |
| 13 | Demo firm marker (Internal plan only) | SA-2-40 | Config | Small ExpatReady team | Keep | — | `isDemoFirm` | Cheap, and it carries the staff-email boundary (S7:474). |
| 14 | 7 firm states + Abandoned + transition guards + reason + audit | SA-2-4/5, S2:448-462 | Capability | Both | Keep | — | — | Money integrity. |
| 15 | 90-day deletion, 35-day backup purge, deletion record, re-delete after restore | SA-2-21 | Capability (legal) | ExpatReady itself | Keep | — | `FirmDeletionRecord` | Law 25 / PIPEDA promise in the terms (S2:60). |
| 16 | Record-keeping notice on cancellation, hold and deletion screens | SA-2-38 | Capability (notice) | Small firm | Keep | — | — | Protects the RCIC. Cheap. |
| 17 | GST/HST/QST numbers or "not registered" at creation | SA-2-25 | Capability (tax) | ExpatReady (legal) | Keep | — | Tax fields | The accountant's rule (S4:54-55). |
| 18 | Alerts (over-limit, trial ending in 3 days, overdue, cancellation) | SA-2-14a | Config | Small ExpatReady team | Keep | Route to the one inbox | — | Cheap and useful. |
| 19 | 12 `system/firm:*` keys | S2:576-590 | Control | — | Keep in data, hide in UI | Collapse into roles (see SA-07) | Keys in code | Data-foundation rule. |

**Contradictions in SA-02 (it is v2.21/2.22 but parts still describe the old card-first flow):**
- Visual B, S2:208-209: "enters details + card" and "payment method accepted".
- Lifecycle, S2:183: "sign-up link paid".
- §6 first row, S2:450: "after payment method accepted".
- SA-2-22, S2:401: "the firm is created only after SA-4 accepts the payment method".
- All of these contradict S2:282 / SA-2-23 (no card for trial plans). Facts, high confidence.

---

### SA-03 — Plans and entitlements

| # | Item | Where | Layer | Who it serves | Verdict | Smaller version / default | Data to keep? | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | Plan editor: Draft / Active / Retired, clone, Public / Internal | SA-3-1/2/3/23 | Capability | Small ExpatReady team | Keep | — | — | Basic. Internal is needed for $0 plans. |
| 2 | **Every live-plan change becomes a request approved by an Owner who is not the requester; Billing never approves; ≥2 Owners required** | SA3-D8b (S3:56), SA-3-44, S3:413, edge S3:701 | Control | **Large ExpatReady team** | **Simplify** | An Owner edits directly, behind a confirm screen showing affected firms + step-up. Every change audited. Second approver parked. | Keep `PlanChangeRequest` as the audit record | With two founders, one founder can never adjust pricing without the other being online. Four-eyes protects against insider fraud you don't have at 4–6 staff. The firm-protecting parts (notice, timing) stay in row 3. |
| 3 | **Removals and lowered limits apply per firm at its first renewal ≥30 days after approval; per-firm applicable plan version; notices** | SA3-D8 (S3:55), SA-3-43, S3:415, S3:385-388 | Config / engine | Large ExpatReady team | **Simplify** | Rule: "never remove from a live plan — create a new plan and retire the old one". Retired plans are already frozen (S3:434). Additions still apply at once. | Keep `PlanVersion` and `applicableVersionId` | Removes scheduled per-firm removals, cache eviction on renewal, and notice batches. Firms keep what they bought, which is fairer. |
| 4 | Plan ladder: positions, additions flow up automatically, refusal rules, renumbering on retire | SA3-D12, SA-3-53–56 | Config | Large ExpatReady team | Simplify | Keep the position and a **validation** that refuses an inconsistent save. Drop auto-propagation. | `ladderPosition` | Launch has 2–3 plans. The invariant matters (drives the "Everything in X, plus…" display, S4:74); the automation doesn't. |
| 5 | Higher plan must cost more | SA-3-57, SA-4-75 | Validation | — | Keep | — | — | One check. |
| 6 | Feature catalogue (~30 features, module + extras, always-on locks) | SA3-D10, S3:316-347 | Capability | Small firm | Keep | — | `Feature` | Firms see tiers only: no add-ons (SA-4-44), always shown locked with the plan that includes it (SA-3-34). |
| 7 | "New — needs a decision" list **with reminders** | SA3-D3d, SA-3-38 | Config | Large ExpatReady team | Simplify | New features default to off; list shown in the editor; no reminders | `decided` flag | Two founders don't need nagging. |
| 8 | Stable feature keys + CI check + mapping on merge/split via an approved change request | SA3-D21, SA-3-52, SA-3-63 | Data foundation | — | Keep, simplify approval | Mapping reviewed as a code migration, not a console approval | Keys | The foundation is right. Approval routing follows row 2. |
| 9 | Four limits, fixed modes, storage warning then hard after 14 days | SA3-D14/15, SA-3-39/40 | Config | Small firm | Keep | — | — | Already the simplified version. |
| 10 | Downgrade check: usage must fit, no override, lower limits from booking, features at renewal | SA3-D17, SA-3-58–61 | Capability (firm-facing) | Small firm | Keep | — | `pendingDowngrade` | Prevents over-limit states. Clear list of what to reduce. |
| 11 | Downgrade + monthly→yearly combined waits for renewal (exception rule) | SA-3-60, SA-4-77 | Config | Large firm | **Park** | One change at a time: refuse the combination and ask for two steps | — | It is an exception to an exception (S4:71, S4:533). |
| 12 | Over-limit list + per-firm entitlement panel | SA-3-20 | Capability (support) | Small ExpatReady team | Keep | — | — | Answers "why can't I use X". |
| 13 | Internal side-by-side plan comparison | SA-3-33 | Config | Small ExpatReady team | Simplify | The firm-facing comparison (SA-4-88) is enough | — | Duplicate screen. |
| 14 | Trial days per plan, default 14, max 90 | SA-3-46 | Config | Small firm | Keep | — | — | Single field. |
| 15 | 8+ `system/plan:*` keys incl. `approve-change` | S3:744-757 | Control | — | Keep in data, hide in UI | One "manage plans" capability | Keys | Data-foundation rule. |

**Stale text in SA-03:**
- S3:371 still says a starter-role change "needs a second person's approval before it is published". That is governance depth, see SA-07 row 20.
- S3:785 still budgets "dependency computation for the editor". The dependency graph was withdrawn at S3:49.

---

### SA-04 — SaaS billing

| # | Item | Where | Layer | Who it serves | Verdict | Smaller version / default | Data to keep? | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | One monthly + one yearly CAD price; automatic push to Stripe | SA-4-1/2 | Capability | Small firm | Keep | — | `PlanPrice` | Core. |
| 2 | Price change on a live plan: Owner-approval queue (not the requester); existing firms move at first renewal ≥30 days, emailed | SA4-D5, SA-4-48 | Control + notice | Approval: large ExpatReady team. Notice: small firm. | Simplify | Keep the 30-day notice and renewal timing (contractual, S4:837). Drop the second approver, as in SA-03 row 2. | Keep `PriceChangeRequest` | The firm-facing promise matters; the internal queue doesn't at this size. |
| 3 | **Approved-discount machinery**: percent/amount, monthly-only vs yearly-only, 1–36 months, offer window with auto-retire, counts now/ever, 100% only monthly ≤3 months, ends on interval switch, kept on plan change, one per firm, reason | SA4-D1, SA4-D30 (S4:73), SA-4-42/43/83–87 | Config | **Large ExpatReady team** | **Simplify** | Percent or amount, **monthly only**, 1–12 months, one per firm, reason. Read usage counts from Stripe. Park yearly discounts (the yearly price is already discounted, SA-4-71) and offer windows. | Keep `billingPeriod` and `availableUntil?` columns | Removes the "this discount applies to monthly only" and "your discount will end" warnings firms would otherwise see (S4:674, 676). |
| 4 | Trials: no card to start; no card at the end → payment hold; extension ≤90 days | SA4-D29 a–c, SA-4-78–80 | Capability | Small firm | Keep | — | `TrialExtension` | The extension replaces a special pilot plan. A net simplification. |
| 5 | "Start my subscription now" (early start, failure keeps the trial) | SA4-D29d, SA-4-81 | Capability (firm-facing) | Large firm / rare | **Park** | Trial runs to its end; the firm adds a card any time | — | Extra Stripe flow plus a failure path, for little benefit. |
| 6 | Trial banner (amber last 3 days) + reminders 7/3/1 + trial-ended | SA4-D29f, SA-4-82 | Notice | Small firm | Keep | — | `BillingNotice` | Prevents surprise holds (no grace period after a no-card trial ends). |
| 7 | Fixed 14-day failed-payment timeline, notices days 0/7/12, Stripe retries | SA-4-20–23 | Capability | Both | Keep | — | — | Money integrity. Already fixed, not configurable. |
| 8 | Payment hold enforced on the server; coming back = overdue invoice + new period | SA-4-25/26/47 | Capability | Both | Keep | — | — | Money integrity. |
| 9 | Plan-change timing: one rule (money up = now, otherwise renewal) shown as a 6-row case table | SA4-D24, S4:353-360 | Config (firm-facing) | Small firm | Keep the rule, cut cases | Rows 4 and 5 vanish once row 11 here and SA-03 row 11 are parked | — | The rule is sound. The exceptions add the weight. |
| 10 | Super Admin converts yearly→monthly mid-term into non-refundable account credit | SA4-D26, SA-4-74 | Control | Large ExpatReady team | **Park** | Handle a genuine case manually in the Stripe dashboard (credit balance), with an audit note | — | An exception tool for a case that doesn't exist yet. |
| 11 | Refunds: none, plus 3 exceptions (Super Admin, discontinued service, first-year 30 days) | SA4-D6, SA-4-49/50 | Capability + terms | Small firm | Keep | — | `Refund`, `CreditNote` | Clear contract. Credit notes are a tax requirement (SA4-D15). |
| 12 | Sales tax via Stripe Tax; GST/HST/QST numbers; no-tax statement; full CRA list on every invoice | SA4-D7/11–14, SA-4-51/52/60/61 | Capability (legal) | ExpatReady itself | **Keep** | — | Tax snapshot on invoice | Legal duty. |
| 13 | Own copy of invoice PDFs in Canada, 6-year retention, write-off at deletion | SA4-D18/22, SA-4-64/66, SA-4-63 | Capability (legal) | ExpatReady itself | Keep, simplify reporting | Missing copy → operational alert only, no daily exception report. Write-off list from Stripe's uncollectible invoices. | Retention fields | CRA rule (S4:65). The reports are dressing. |
| 14 | Bilingual terms and invoices, French first; versioned terms acceptance recorded | SA4-D19, SA-4-65 | Capability (legal) | ExpatReady itself | Keep | — | `TermsAcceptance` | Quebec Charter (S4:62). |
| 15 | Billing emails split by risk into 4 recipient sets | SA4-D8, SA-4-53 | Config (firm-facing) | Small firm | Simplify | Two sets: invoices / receipts / refunds → billing email (or owner); **every other** billing notice → billing email + Owner + Admins | — | Card-expiring and price-change are the only ones that leave out Admins today; one rule is easier to build and explain. |
| 16 | Firm billing screen: Owner vs Admin split, 7 `agent/subscription:*` keys | SA4-D23, SA-4-67 | Control (firm-facing) | Small firm | Keep | — | Keys | "Who can sign or see billing" is a lens Keep. |
| 17 | Overdue list with "send reminder now" / "send update-card link" | SA-4-24 | Config | Small ExpatReady team | Simplify | List only; reminders are automatic; keep the update-card link | — | Manual nudges duplicate the timeline. |
| 18 | In-app processor notification log with safe re-run (Should now) | SA-4-36, S4:152 | Config | Large ExpatReady team | **Park the screen** | Use Stripe's dashboard (deliveries + resend). Keep signature check and once-only processing (Must now). | `ProcessorEvent` | Duplicates the processor's own tooling. |
| 19 | Proration by day (Stripe setting) | SA4-D27 | Config | Both | Keep | — | — | One setting; explainable invoices. |
| 20 | Plans side by side, "Everything in X, plus…" | SA4-D31, SA-4-88 | Capability | Small firm | Keep | — | — | Right firm-facing simplicity. |
| 21 | 7 `system/billing:*` keys | S4:753-763 | Control | — | Keep in data | Collapse into roles | Keys | Data-foundation rule. |

**Contradictions in SA-04:**
- §3.11 (S4:411) still says pilots get "an Internal plan with long trial days". This contradicts SA4-D29c (S4:72), where pilots use a trial extension.
- Visual C (S4:214-227) still shows a card step before firm creation for every plan. This contradicts S4:296.
- Both are facts, high confidence.

---

### SA-07 — Platform users (ExpatReady's own staff)

| # | Item | Where | Layer | Who it serves | Verdict | Smaller version / default | Data to keep? | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | **Nine starter roles** (Owner, Staff manager, Content author, Content approver, Onboarding/AM, Billing, Support, Security & audit, Platform engineer) | SA7-D8, Appendix A (S7:702-758) | Control | **Large ExpatReady team** | **Simplify** | 4 visible roles: **Owner** (also staff, billing approval, security); **Operations** (onboarding + billing + support); **Content author**; **Content approver**. Engineer keeps deploy access outside the console. | Keep all `system/*` keys and `RoleTemplate` as data | 4–6 people (S7:40), each wearing several hats (S7:294). Nine roles is a 50-person org chart. |
| 2 | **Role editor**: Owner ticks permissions, creates roles (Must now) | SA7-D2, SA-7-27, S7:202 | Config | Large ExpatReady team | **Park** | Fixed roles seeded as data. The editor can be added later without a model change. | Roles stored as data | Not built (S7:663, 672). Pure build cost. |
| 3 | Separate "Staff manager" role and `platform-user:manage` delegation | SA7-D5, S7:706 | Control | Large ExpatReady team | Park the role | Owners manage staff | Key stays | With two Owners, delegation adds nothing. |
| 4 | Country limits on content roles from R1; Phase 2 for others | SA7-D9, SA-7-13 | Control | Large ExpatReady team | Simplify | Keep the built server check; hide the country field while there is one country | `PlatformCountryAssignment` | Already built (S7:652). Don't extend it. |
| 5 | Invite: 72 h, single use, company-domain allowlist | SA-7-5/6 | Control (security) | Both | Keep | Allowlist is the only setting worth having | — | Cheap floor. |
| 6 | Mandatory second step (passkey / app / codes, no SMS), at every sign-in | SA7-D20, SA-7-8 | Security | Both | **Keep** | — | — | Floor. Built. |
| 7 | Password rules: 12+, breached-list check, **character mix, last-5 reuse** | SA7-D24, SA-7-9 | Config | Large ExpatReady team | Simplify | 12+ and the breached-list check (built, S7:656). Park mix and history (not built, S7:673). | `passwordHistory` optional | With mandatory MFA, mix and history rules add friction for little gain. *Judgment, medium-high confidence; this follows current NIST guidance, which the docs do not cite.* |
| 8 | Reset MFA by a staff manager, with identity check, never on oneself | SA7-D21, SA-7-31 | Control (security) | Both | Keep | Performed by an Owner | — | The only recovery path. "No DB edits" (SA7-D43) is right. |
| 9 | Step-up before support session, access changes, refunds, settings; the **5-minute window is a platform setting** | SA7-D35/36, SA-7-10 | Control + Config | Both | Keep step-up; simplify the window | Fixed 5 minutes in code | — | The mechanism is a floor; the setting is a knob. |
| 10 | Staff auto-logout 60 min / 12 h, never off in production, warnings; values are settings | SA7-D28–34, SA-7-18/37 | Security + Config | Both | Keep; simplify | Constants in config, not Owner-editable settings (S7:123, S7:756) | — | Same floor, fewer screens. |
| 11 | **One session at a time — staff AND firm users** (newest sign-in wins) | SA7-D30–32, SA7-D67(8) (S7:156), SA-7-36 | Control (**firm-facing**) | Staff: fine. Firm users: **friction for small firms.** | **Simplify** | Keep for staff. For firm users, **park** single-session: allow several devices and show "active sessions — sign out others". | `FirmSession` already per-session | An RCIC on laptop and phone gets kicked out repeatedly. The stated justification (S7:129) covers only staff not filling forms. |
| 12 | Activity tab (plain list) | SA-7-20/42 | Capability | Small ExpatReady team | Keep | — | Reads the audit trail | Already stripped (S7:136). |
| 13 | Two Owners at go-live; never zero; removing the Owner role refused below 2 | SA7-D41/56, SA-7-25 | Control (security) | Both | Keep | — | — | Bus factor plus stolen-account cut-off. Fits two founders. |
| 14 | Two staff emails (Owner gained/lost; MFA reset / password change required) | SA7-D61, SA-7-40 | Notice | Both | Keep | — | — | Already minimal. |
| 15 | **Handover prompt** "Account manager for N firms → choose new or skip" (Must now) | SA7-D64/65, SA-7-47 | Control | Large ExpatReady team | **Park** | Auto-fallback to the shared inbox. Tickets returning to the queue stays (automatic, SA-7-46). | Audit of fallback | Same as SA-02 row 5. |
| 16 | Staff email only inside Demo firms | SA7-D18, SA-7-38 | Control (security) | Both | Keep | — | — | Keeps support sessions the only door (BR-17). |
| 17 | Deactivate destroys password and factors; reactivate starts from scratch | SA7-D10/11, SA-7-22/23 | Security | Both | Keep | — | — | Floor. |
| 18 | "Require password change at next sign-in" | SA-7-41 | Control | Large ExpatReady team | Park | Use Reset MFA or deactivate | `passwordChangeRequired` | Overlaps existing tools. |
| 19 | Content approver ≠ author for production packs | SA1-D6, SA7-D48/49, S7:717 | Control | Firms (accuracy of immigration content) | **Keep** | — | — | The one four-eyes rule that protects firms directly. High stakes per project CLAUDE.md. |
| 20 | Firm starter-role editor with approve-publish by a different person; legal-template approve "never own submission" | S7:626, S7:709, S7:746-747 | Control | Large ExpatReady team | Simplify | Starter roles seeded in code / data and changed by release. For legal templates, keep the recorded expert check; the second person is optional. | `system/starter-role:manage` key | Owned by SA-06 / SA-05; flagged because SA-07 carries the permission. |

---

### (a) The 5 highest-leverage items

1. **Staff roles: nine roles plus a role editor → four fixed roles, no editor.** (S7 rows 1–3; SA7-D2 / D8 are Must now at S7:202.) The editor is entirely unbuilt (S7:672), and nine roles assume a team that does not exist (S7:40).
2. **Live plan and price governance → Owner confirms with step-up, plus "never remove from a live plan; retire and replace".** (S3 rows 2–3, S4 row 2.) This deletes the approval queue, the two-Owner dependency for every price tweak (S3:701), and per-firm scheduled removals with renewal-time cache eviction. The firm-protecting 30-day price notice stays.
3. **One session at a time for firm users → park it.** (S7 row 11.) This is the only item in these four modules that will annoy every small firm daily. It was re-confirmed on 8 Oct (S7:156) without a firm-side justification.
4. **Discounts → monthly percent/amount, N months, one per firm.** (S4 row 3.) This parks offer windows, yearly discounts, the 100% special rules and usage-count UI (Stripe has the counts), and removes the warnings firms would see.
5. **Billing exception paths → park.** These are: Super Admin yearly→monthly credit (SA-4-74), downgrade + monthly→yearly combo (SA-4-77 / SA-3-60), "Start my subscription now" (SA-4-81), the in-app webhook log (SA-4-36), and the account-manager handover prompt (SA-7-47 / SA-2-26). Each is small, but each adds a Stripe flow or state branch that has to be tested with test clocks (S4:131).

### (b) Must stay even at the smallest scale

- **Security floor:**
  - Tenant isolation and support sessions as the only way in, with reason, step-up, blocked list (including the four professional actions, SA-2-17), banner and owner-visible history (SA-2-16/17/29).
  - Security lock (SA-2-34).
  - Mandatory staff MFA (SA-7-8); deactivation destroys factors (SA-7-22).
  - Never zero Owners (SA-7-25); staff email only in demo firms (SA-7-38); staff auto-logout on in production (SA-7-18).
  - Content approver ≠ author for production packs (SA1-D6).
- **Money integrity:**
  - Server-enforced payment hold (SA-4-25); fixed 14-day timeline (SA-4-20–23).
  - Signed, once-only processor notifications (SA-4-33/34); exactly-once firm creation (SA-4-8).
  - Card data never stored (SA-4-18); downgrade usage-fit check (SA-3-58); all money actions audited (SA-4-39).
  - 30-day notice for price changes to existing firms (SA-4-48, minus the second approver).
- **ExpatReady's own legal duties:**
  - CRA invoice content and tax numbers via Stripe Tax (SA-4-51/52/60/61); credit notes reversing tax (SA-4-62).
  - Invoice copies kept in Canada for 6 years after fiscal year-end (SA-4-64/66).
  - Bilingual, French-first terms and invoices, with recorded, versioned acceptance (SA-4-65).
  - Data-processing clause (SA2-D10).
  - 90-day deletion plus 35-day backup purge, with a deletion record (SA-2-21).
  - Record-keeping notice to departing firms (SA-2-38).
  - Supervised export for closed locked firms — the duty stays, but a manual runbook is enough (SA-2-37).

### (c) Open questions for the founder

1. **Who are the Owners on day one, and how many staff in total?** If it is two founders, the "Owner other than the requester" rule (SA3-D8b, SA-4-48) means neither founder can change a live plan or price alone. Is that intended?
2. **Do you expect to remove a feature from, or lower a limit on, a live plan in year one?** If not, "retire and replace" (S3:434) can replace the scheduled per-firm removal engine (SA-3-43).
3. **Single session for firm users (SA7-D67(8)):** was this tested against how RCICs work (laptop + phone + home)? What is the actual risk it mitigates for firm users, as opposed to staff?
4. **How many plans at launch?** With 2–3, does the ladder need auto-propagation (SA-3-54), or just a validation?
5. **Is there a real launch offer that needs yearly discounts or an offer window (SA4-D30a/b)?** If not, park both.
6. **The first-year 30-day full refund (SA4-D6c):** is this a deliberate commercial promise? It is the only refund a firm can claim as of right.
7. **Write-mode support access (SA-2-28, Should now):** do you want it in Release 1? Read-only only would remove the firm-side toggle entirely.
8. **Sign-up link vs Super Admin creation:** both now start a trial with no card, so is the link route needed at launch, or is onboarding fully sales-led? The card-first leftovers listed under SA-02 and SA-04 above need fixing either way.

---

## Review: SA-05-AG-12-SA-01-01B

## Complexity register: templates and pack (read-only, no files touched)

I read all five sources in full, plus the lens and map:388–416. Citations use `file:line`. Short names: **SA05** = SA-05 v3.1, **AG12** = AG-12 v2.1, **SA01** = SA-01 v2.2, **SA01B** = SA-01B v1.2, **MAP** = TEMPLATE-MAP-working.

Key for "who it serves": **S** = solo, **4** = 4-person, **10** = 10-person, **L** = large firm, **ER** = ExpatReady staff.

---

### Blockers found while reading (contradictions, not complexity)

1. **The startable check makes nothing startable while form autofill is parked.**
   - SA-1B-90 (SA01B:330) and SA1B-D24 (SA01B:48) require "every form with an edition and a box map".
   - SA1B-D28 (SA01B:53) parks box maps. The v1.1 change list (SA01B:8) did not touch §10.
   - SA-1B-63 (SA01B:288, "flags a form with no box map") and SA-1B-92's "form boxes filled automatically" (SA01B:332) also assume maps exist.
   - As written, no Canada category can be opened in Release 1. Fix: change SA-1B-90 to "every form line has a form with a current edition".
2. **Stale pack rules still contradict rule 7, Q17 and Q18.** These stay wrong until SA5-X17 and SA5-X18 are applied (both Pending, SA05:179–180):
   - SA1-D9 (SA01:33), BR-7 (SA01:335) and SA-1-34 (SA01B:346) still say firms "cannot remove" pack items.
   - SA1-D9 still says firms never change "questionnaire content or regulator text".
   - SA-1-38 (SA01B:347) lets firms relabel and reorder a "pipeline", but pipelines were withdrawn in favour of government steps (SA01B:243–244).
   - SA-1B-48 (SA01B:248) says assessment wording is "not removable by a firm". That conflicts with SA5-X18(c).
   - `PackTenantExtension` (SA01:373) only covers "checklist additions and stage relabel / reorder". It cannot hold hide flags, a questionnaire layer or the "who answers" switch.
3. **The AI-edited mark is a trap for small firms.**
   - SA-5-75 (SA05:665) and O31 (MAP:412): every send from an AI-edited version goes to approval, and the mark clears only on reset or a rewrite without AI.
   - Example: a solo Owner who polishes a chase with AI and publishes it gets every chase message stuck in "Needs you", indefinitely.
   - See the top-5 list.

---

### SA-05 — ExpatReady side (rules plus internal governance)

| # | Item (plain words) | Where | Layer | Serves | Verdict | Smaller version / default | Data to keep? | One-line reason |
|---|---|---|---|---|---|---|---|---|
| 1 | Three firing classes; class 3 held until the firm reviews | SA05:315–327, SA-5-87 :588 | Config | S/4/10 | **Keep** | — | Firing class on each send (SA05:764) | Stops ExpatReady chasing a firm's clients in wording the firm never saw |
| 2 | Release on confirm: one catch-up per sequence | SA05:337, SA-5-91 :592 | Config | 4/10 | **Keep** | Simpler option for the founder: no catch-up, sequences continue from today | — | Few held sequences at a brand-new firm; modest cost |
| 3 | Count preview before confirming ("4 now, 18 scheduled") | SA05:336 | Config | 10/L | **Simplify** | Static line: "Only the latest missed reminder per client will be sent now" | — | Needs a side-effect-free dry run of the release job; near-zero counts at new firms |
| 4 | New class-3 messages added after the review start held (O6) | SA-5-92 :593 | Config | S/4/10 | **Keep** | — | Same flag | Same consent logic, no extra machinery |
| 5 | Firms that existed before AG-12 v2.0 see the review once (O7) | SA05:339 | Config | ? | **Park (if no live firms)** | Delete the requirement | — | Dead if no production firms exist yet (question D2) |
| 6 | Switch off any automatic message; 2 are edit-only; warning on a Must; recorded | SA05:341–346, SA-5-93 :594 | Config | S/4/10 | **Keep** | — | who/when | Every firm needs an off switch |
| 7 | "Use until you edit"; firm version; reset | SA05:348–358 | Config | S/4/10 | **Keep** | — | Immutable firm version rows | Core model |
| 8 | 7-day update notice (Keep my wording / Use new now; screen + email; second publish restarts the 7 days; hidden → screen only; firm created mid-notice) | SA05:382–397, SA-5-58 :620, O2/O3/O5 | Config | 10/L | **Simplify** | One flow: apply at publish to unedited users, plus a screen notice, one email, and "Go back to my previous wording" for 7 days. This removes RUNNING/KEPT/USED_NEW_EARLY, restart logic, O2, O3 and O5. | `TemplateUpdateNotice` with outcome APPLIED/REVERTED | Biggest state machine in the module, built for ExpatReady's rare edits |
| 9 | Urgent correction (Platform Owner, reason, applies at once, go back for 7 days) | SA05:399–404, SA-5-94 :624 | Control + Config | S/4/10 | **Keep, or fold into #8** | If #8 is simplified, every publish works this way and the urgent flag and key disappear | Notice `kind` | A broken link must not wait 7 days |
| 10 | Retire a starter (unedited users get a frozen firm copy) | SA05:406–412, SA-5-95 :625 | Config | ER | **Park** | Default: no starter retired in Release 1 | Template status Active/Retired | No Release 1 need; three-path fan-out |
| 11 | Reach count before publishing (4-week average) | SA05:378, :489, SA-5-77 :667 | Config | ER/10 | **Park** | — | Send-record template and version | Computable later from send records |
| 12 | Counts-only report to ExpatReady after a publish | SA-5-97 :626 | Config | ER | **Park** | — | `TemplateUpdateNotice` rows | Analytics; data already stored |
| 13 | Legal sentences in ExpatReady's own emails: sentence-level markers; a Platform Owner who is not the drafter publishes | SA05:533, SA-5-56 :612, key :841 | Control | ER | **Simplify** | Mark whole emails as "legal" (e.g. cancellation confirmation); publishing one needs a Platform Owner | Flag on the template | Sentence diffing is real build; email-level gives the same protection. Risks a deadlock if there is one Platform Owner (D6) |
| 14 | Must-keep fields in ExpatReady emails | SA05:532, SA-5-57 :613 | Config | ER | **Keep** | — | — | Cheap check; protects ExpatReady facts such as trial-end date |
| 15 | No second approver; Content author publishes | SA05:375, SA-5-55 :611 | Control | ER | **Keep** | — | — | Right for a small team |
| 16 | Rollback = new version with a reason | SA05:376, SA-5-24 :615 | Config | ER | **Keep** | — | Version rows | Trivial |
| 17 | ExpatReady library screen filters (kind, class, module, status, French missing, WhatsApp) | SA05:362, SA-5-3 :583 | Config | ER | **Simplify** | Search plus status | — | "Tens of templates" (SA05:851) |
| 18 | Nine `system/template:*` keys | SA05:831–845 | Control | ER | **Keep in code** | Two roles on screen (Platform Owner, Content author) | Keys | Fine as long as they stay under the hood |
| 19 | Purpose (service/marketing) and the sending-rules matrix | SA05:451–467, SA-5-98 :657 | Control + Config | S/4/10 | **Keep** | — | Purpose on each send | Consent and sending reputation (the lens says keep these) |
| 20 | Unsubscribe and STOP: fixed, cannot be removed | SA05:469–471 | Control | all | **Keep** | — | — | ExpatReady's own protection |
| 21 | WhatsApp version for every short client message; auto-submit all on connect; per-firm status; resubmit on publish | SA05:473–481, SA-5-73 :662, SA-5-99 :663 | Config | 4/10 | **Simplify** | Opener plus about 5 messages (booking confirmed, appointment reminder, upload reminder, payment reminder, case update); the rest go by email under the existing fallback | `FirmWhatsAppTemplateStatus` | About 40 Meta submissions per firm is mostly approval noise |
| 22 | Four fixed conditional sections; no firm-made ones | SA05:430–439, SA-5-69 :645 | Config | S/4/10 | **Keep** | — | — | Already the minimal version |
| 23 | Language fallback; client-record note; monthly count notice | SA05:441–449, SA-5-70 :653 | Config | 4/10 | **Simplify** | "FR missing" badge plus the client-record note; no monthly count | `languageFellBack` | The count is derivable later |
| 24 | AI-edited mark; every send goes to approval; clears only on reset or a non-AI rewrite | SA05:487, SA-5-75 :665 | Control | S/4 | **Simplify** | Approval happens once, when a human publishes the AI-edited version | `aiEdited` on version and send | As written it turns a polished chase into permanent manual work |
| 25 | Must-fill marks, ExpatReady-set on starters | SA05:426, SA-5-66 :642 | Config | S/4/10 | **Keep** | — | `mustFillFields[]` | Retainer name and fee |
| 26 | Default timings fixed in code (O26) | SA05:524–526 | Config | — | **Keep** | — | — | Already the parked form |
| 27 | Extras switched off → templates read-only, sends fall back | SA05:564–567 | Config | S/4/10 | **Keep** | — | `readOnlyReason` | A state flag, not a feature |
| 28 | Paid consultation: 30-minute hold, firm-editable | SA5-X22(d) :184 | Config | 10 | **Simplify** | Fixed at 30 minutes | — | Nobody tunes this |

---

### AG-12 — Firm side

| # | Item | Where | Layer | Serves | Verdict | Smaller version / default | Data? | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | Three lists plus filters by module, channel, language, purpose, class, state | AG12:187–199, AG-12-42 :342 | Config | 10/L | **Simplify** | Search plus a filter for the 7 states | — | About 45 starters total |
| 2 | Read-only "Sent by ExpatReady" list (O12) | AG12:197, AG-12-38 :333 | Config | — | **Park** | — | — | No firm would notice it missing |
| 3 | Firm version history browse and restore any version | AG12:205, AG-12-68 :378 | Config | 10/L | **Simplify** | One draft and one published on screen, plus Reset | Immutable version rows (needed by SA-5-74 and frozen documents) | Agrees with the map suggestion, but the data stays |
| 4 | "ExpatReady updated this": two-way compare (firm vs new, old vs new), Keep mine / Reset | AG12:206, AG-12-46 :344 | Config | 4/10 | **Simplify** | Show ExpatReady's new wording, with Dismiss and Reset | — | One compare is enough |
| 5 | Reach shown in the Reset confirmation and notice panel ("sent about 12 times a week") | AG12:207, :226 | Config | 10 | **Park** | Plain confirmation text | — | Goes with SA05 #11 |
| 6 | Review screen: 3 groups; per-row preview, edit, test and switch; banner | AG12:209–221, AG-12-52–57 :353–358 | Config | S/4/10 | **Simplify** | List held class-3 rows with on/off, plus Start sending; link class 1 and 2 to Templates | Review record | Keep the consent moment; don't build a second editor surface |
| 7 | Confirm the review = `template:publish` holders; one-line notice to the Owner | AG-12-55 :356 | Control | 4/10 | **Keep** | — | who/when | Cheap |
| 8 | Banner audience (open question) | AG12:220, Q1 :707 | Control | — | **Keep the recommendation** (publish holders only) | — | — | — |
| 9 | Class-2 "Starts ticked / unticked" setting per message | AG12:274–279, AG-12-102 :433 | Config | 10 | **Park** | ExpatReady sets defaults: **"Decision: refused" and LMIA refused start unticked**; all others ticked | Per-template default in the catalogue | The real risk (a refusal emailed before the consultant calls) is fixed by a default, not a knob |
| 10 | Switch off / Edit only / Must warning | AG-12-103 :434 | Config | S/4/10 | **Keep** | — | — | Same as SA05 #6 |
| 11 | Firm ticks must-fill per field | AG-12-74 :387 | Config | 10/L | **Park** | Starters arrive with ExpatReady's must-fill set; the missing-value warning (AG-12-73) covers the rest | `mustFillFields[]` | Turns a warning into a block; few firms would set it |
| 12 | Purpose control; marketing → service warning | AG-12-81 :400 | Control | S/4/10 | **Keep** | — | Purpose | Firm-created templates need a purpose anyway |
| 13 | Where used; delete block; hide blocked while referenced | AG12:256–261, AG-12-87 :409 | Control | S/4/10 | **Keep** | — | `TemplateUsageRef` | Prevents broken automations |
| 14 | Hide ExpatReady starters (library) | AG-12-50 :348 | Config | S/4/10 | **Keep** | — | Hidden flag | Cheap |
| 15 | Preview with a real client; Send me a test | AG12:263–266 | Capability | all | **Keep** | — | — | Out of scope |
| 16 | Starter-wording label | AG-12-51 :349 | Config | all | **Keep** | — | — | Rule 7 protection, cheap |
| 17 | WhatsApp status per row; Edit and resubmit | AG-12-83 :402 | Config | 4/10 | **Keep** (on the reduced set from SA05 #21) | — | Status table | — |
| 18 | Nine `agent/template:*` keys | AG12:623–641 | Control | — | **Keep in code** | On screen: "Manage templates" (Owner, Admin) vs "Use templates" (everyone) | Keys | Lens: fine-grained keys stay under the hood |
| 19 | New "Manage legal settings" key (Owner, can be delegated) | AG12:640, SA5-D47 SA05:60 | Control | 4/10 | **Keep the key**; question the scope | Clause locks and "shareable document types" are candidates to park (D4) | Key seeded to the Owner | Who signs and sees legal terms; uses SA-06's generic grant machinery |
| 20 | Support session cannot confirm, keep or switch (O25) | AG-12-104 :435 | Control | all | **Keep** | — | — | Protects the firm, cheap guard |
| 21 | Extras off → read-only rows | AG-12-108 :436 | Config | S/4 | **Keep** | — | — | Same as SA05 #27 |

---

### SA-01 — Pack container (mostly ExpatReady internal, largely built)

| # | Item | Where | Layer | Serves | Verdict | Smaller / default | Data? | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | Two-person approval for production packs | SA1-D6 :30, SA-1-61 :302 | Control | ER | **Keep** | — | author/submitter | The *only* control on rules and scoring (SA1B-D18, SA01B:42); already built (SA01:485). Needs at least 2 qualified people (D6) |
| 2 | Scheduled publish in the country's timezone | SA-1-48 :284 | Config | ER | **Keep** | — | — | Built |
| 3 | Rollback with a reason | SA-1-49 :285 | Control | ER | **Keep** | — | — | Built; the emergency path |
| 4 | Completeness profiles: versioned, need approval, 3 keys | SA-1-63 :304, :451 | Config | ER | **Keep but freeze** | No new work in Release 1 | — | Built; generic for one country |
| 5 | Validation, diff, dry run, import/export | SA01:249–255 | Config | ER | **Keep** | — | — | Built; needed to load content |
| 6 | "Newer rules available": adoption is required before new work, with a reason, audited | SA1-D3 :27, SA-1-58 :298, US-5 :398 | Control | S/4/10 | **Simplify** | One click; reason optional (prefilled "Rules updated <date>"); audit kept | Pin and revision chain (`PackWorkPin` :371) | A forced reason per client after every CRS change is friction; the stamp already gives reproducibility |
| 7 | "Who is on which version" (Super Admin counts; firm's own list) | SA-1-62 :303, :246 | Config | ER/10 | **Park** | — | Pins | Not built (SA01:494); data already exists |
| 8 | Suspend / re-enable a country from the console | SA-1-5 :273 | Control | ER | **Park the screen** | Backend only | Lifecycle | One country in Release 1 |
| 9 | Firm additions limited to checklist items and stage relabel/reorder | SA1-D9 :33, BR-7 :335, :373 | Control | — | **Rewrite** (blocker 2) | Replace with: hide plus add (checklists), the questionnaire layer, and renaming a step's client-facing name | Extension table must hold hides and the layer | Contradicts MAP:24, Q17 and Q18 |

---

### SA-01B — Pack content (internal plus firm overlays)

| # | Item | Where | Layer | Serves | Verdict | Smaller / default | Data? | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | Firm adds its own questions (firm-owned fields) | SA-1B-93 :340, Q18 MAP:402 | Config | 4/10 | **Simplify** | One "Additional questions from <firm>" section at the end, limited to text, date, yes/no and choice | Firm field table, never feeding scoring | Free placement inside pack sections causes merge pain on every pack update |
| 2 | Firm hides optional pack questions | SA-1B-93, SA-1B-7 :147 | Config | S/4 | **Keep** | — | Layer row `(firm, questionKey, hidden)` | A shorter client form is felt by every firm |
| 3 | Firm reorders optional questions | SA-1B-93 | Config | L | **Park** | Pack order | — | Breaks on every section change |
| 4 | "Who answers" switch (client or staff, including required questions) | MAP:402, SA5-X18(h) SA05:180 | Config | 4/10 | **Park** | Staff fill any answer on the case (to confirm in AG-08, D5) | `answeredBy` provenance on answers | Not yet in SA-01B; new layer semantics |
| 5 | Hide standard checklist items and steps firm-wide (Owner/Admin; new cases only; government deadline steps not hideable) | MAP:24, Q17 MAP:401, SA5-X17 :179 | Control + Config | S/4/10 | **Keep** | — | Hide record: who, when, `hiddenAtPackVersion` | Without it, "not applicable" on every case for a solo firm |
| 6 | "ExpatReady updated an item you've hidden. Review?" | MAP:24 | Config | 10 | **Park** | The "Show hidden" list shows the pack item's last-updated date | `hiddenAtPackVersion` | Lets the notice be added later without a data change |
| 7 | Firm renames a government step's client-facing name | SA5-X18(a) :180, SA05:1103 | Config | 4/10 | **Keep (rename only)**; park reorder (SA-1-38) | — | — | Order comes from the pack; delivery steps are platform-standard (SA01B:239) |
| 8 | Assessment "required wording" a firm cannot remove | SA-1B-48 :248 | Control | — | **Rewrite** per SA5-X18(c) | Editable starter paragraph | — | Contradicts rule 7 |
| 9 | Source, date checked and next-review date on every rule-bearing item | SA-1B-39 :207 | Config | ER | **Keep (fields)** | — | Yes | The only freshness signal besides approval |
| 10 | Overdue-review work queue | SA-1B-40 :208, Should :111 | Config | ER | **Simplify** | A sortable "next review" column plus the publish warning | — | Small team, one country |
| 11 | Reference-table designer (types and columns in the console, approved) | SA-1B-41–44 :225–228 | Config | ER | **Simplify (medium confidence)** | Extend the 5 built generic shapes (SA01B:373) to Canada's tables; keep bulk upload | Versioned rows | New table types are rare; changes to rows are frequent. Check first: CI bans immigration tokens in code (SA01B:366) |
| 12 | Copy from another row; add/remove one item across many rows | SA-1B-61 :286 | Config | ER | **Keep** | — | — | Forced by "one row per full combination" (SA1B-D6) |
| 13 | Per-row preview for a sample family | SA-1B-62 :287 | Config | ER | **Keep** | — | — | The only test, since rule tests were dropped (SA1B-D18) |
| 14 | Startable check | SA-1B-90 :330 | Control | all firms | **Keep, fix** (blocker 1) | Remove the box-map clause | — | Protects firms from half-built categories |
| 15 | Completeness view incl. "form boxes filled automatically" | SA-1B-92 :332 | Config | ER | **Simplify** | Startable list only | — | That metric is dead while autofill is parked |
| 16 | Warn on an answer value not mapped to a form option; flag a form with no box map | SA-1B-5 :138, SA-1B-63 :288 | Config | ER | **Park with autofill** | — | Mapping column | Pure noise in Release 1 |
| 17 | List of sections used by nothing | SA-1B-17 :161 | Config | ER | **Park** | — | — | Housekeeping |

---

### (a) Five highest-leverage changes

1. **Merge the 7-day notice and urgent correction into one flow (SA05 #8 and #9).**
   - The flow: apply to unedited users at publish, plus a notice, plus "Go back to my previous wording" for 7 days.
   - This removes the RUNNING/KEPT/USED_NEW_EARLY states, O2, O3, O5, the urgent flag and key, and notice-start WhatsApp timing.
   - Trade-off: firms no longer see a wording change before it reaches their clients. This is a judgment call that reverses SA5-D23; medium confidence.
2. **Approve AI-edited versions once, when a human publishes them, not on every send (SA05 #24).** As written, it defeats AI help for exactly the small firms it is meant for. This conflicts with the AG11-D1 floor, which needs revisiting.
3. **Questionnaire overlay: ship add-questions in one firm section and hide-optional; park reorder and "who answers" (SA01B #1–4).** This avoids a per-firm merge engine over a live, versioned pack.
4. **WhatsApp: opener plus about 5 messages (SA05 #21).** This cuts Meta submission and status noise by an order of magnitude; email fallback already exists.
5. **Park every count and analytics knob, but keep the raw send record.** That covers reach (SA05 #11, AG12 #5), post-publish counts (SA05 #12), the monthly French count (SA05 #23), the review preview count (SA05 #3) and "who is on which version" (SA01 #7). All five are derivable later from the version, `languageFellBack` and pin data.

### (b) Items that would hurt even a solo firm if parked

- **Hold class 3 until review** (SA05 #1). Otherwise ExpatReady wording chases the firm's clients unseen.
- **Switch off automatic messages** (SA05 #6).
- **Urgent fixes reach firms within hours.** Either keep urgent correction or adopt the merged flow from (a)1. Parking it alone leaves a broken portal link live for 7 days.
- **Edit, reset, use until you edit** (SA05 #7).
- **Firm-wide hide of standard checklist items** (SA01B #5), and hiding optional questions (SA01B #2).
- **Delete-in-use block and where-used** (AG12 #13).
- **Purpose, consent skip, unsubscribe and STOP** (SA05 #19–20).
- **Startable check** (SA01B #14), once fixed.
- **Version id on every send** (SA-5-74). This is a data foundation; parking it is unrecoverable for past sends.

### (c) Verdict on the 9 parked suggestions (MAP:416)

1. **Q14 urgent-correction route → park: disagree as stated.**
   - If the 7-day notice stays, urgent correction must stay; otherwise error fixes wait 7 days (SA05:401).
   - Parking it is only safe if the normal flow becomes "apply now, go back for 7 days" (leverage #1). Then it is moot rather than parked.
2. **Q18 "who answers" switch → park: agree, with two conditions.**
   - Staff must be able to fill or edit any questionnaire answer on the case (AG-08, unverified here).
   - Keep an `answeredBy` field on answers.
3. **Firm version history and restore → one firm version plus reset: agree on screen only.**
   - Firm versions must stay immutable rows. The send record stores a version id (SA05:764) and signed documents are frozen (SA-5-76).
   - "One version" must not mean overwriting in place. Keep one draft slot so drafts never send (AG-12-65).
4. **Reach count → park: agree.** Also drop it from the Reset confirmation and notice panel (AG12:207, :226). Computable later from send records.
5. **Missing-French monthly counts → badge: agree.** Keep `languageFellBack` and the client-record note "Sent in English — no French version" (SA05:446).
6. **"ExpatReady updated an item you've hidden" → park: agree.** Store `hiddenAtPackVersion` on the hide record, and show the item's last-updated date in the hidden list as a free mitigation.
7. **WhatsApp versions → opener plus about 5 messages: agree.** Name the list in SA05 Appendix A; keep the per-firm status table; everything else uses the existing email fallback (SA05:479).
8. **Review-screen preview count → simplify, keep catch-up: agree.**
   - The saving is moderate: the counts reuse the release computation (AG12:651), but it needs a dry-run mode.
   - An even simpler option is no catch-up at all; at a brand-new firm it makes almost no difference.
9. **"Manage legal settings" → keep: agree on the key** (Owner-seeded, low cost). But trim what it guards: retainer clause locks and "shareable document types" are candidates to park (D4).

### (d) Open questions for the founder

- **D1.** Keep the 7-day pre-switch notice, or move to "apply now, go back for 7 days" (leverage #1)? This decides suggestion 1.
- **D2.** Are any firms live in production today? If not, delete O7 / SA-5-92's second sentence (SA05:339).
- **D3.** Should AI-edited approval happen once at publish rather than on every send? This conflicts with the AG11-D1 floor (AG12:59).
- **D4.** Can staff edit a retainer's clauses when generating it (AG-05, not read)? If not, clause locks are moot — park them, but keep the clause-block structure in data.
- **D5.** Can staff answer any questionnaire question on the case today (AG-08)? This is the condition for parking "who answers".
- **D6.** How many Platform Owners and content publishers exist at launch? Two-person pack approval (SA-1-61) and the "not the drafter" legal-sentence rule (SA-5-56) each need at least two qualified people, or they deadlock.
- **D7.** Approve the SA-1B-90 wording fix (blocker 1)?
- **D8.** Must staff adopt newer rules before any new work on a pinned client (US-5, SA01:398), and is the reason mandatory?
- **D9.** Release 1: generic reference-table designer, or extend the five built shapes (SA01B #11)?
- **D10.** Should "Decision: refused" and LMIA refused default to unticked, replacing the "start ticked" knob (AG12 #9)?
- **D11.** Should SA5-X17 and SA5-X18 be applied to SA-01 and SA-01B now? Until they are, both documents contradict rule 7, Q17 and Q18 (blocker 2).

---

## Review: SA-08-12

## Founder-lens review: SA-08 to SA-12 (read-only, no files touched)

**Files read in full** (all in `/Users/team-member/Documents/team-workspace/FINAL-SuperAdmin-FR/`): SA-08 v2.5, SA-09 v2.2, SA-10 v2.5, SA-11 v2.8, SA-12 v2.7, plus TEMPLATE-MAP rules 7–8, §16–17, Q1–Q24 and O1–O32. To check claims I also used SA-04 v2.19 (:75, :81, :107, :124, :415, :489), SA-07 v2.13 (:47, :105) and AG-09 (:777).

**Overall:**
- **SA-08 is already lean.** It was reviewed on 2 and 9 Oct. One stale conflict remains.
- **SA-09, SA-10, SA-11 and SA-12 are not.** They are the June "gold-standard" rebuilds. Their governance sections have never had a founder review. Each is built for a large SaaS operations team: rule engines, editable registries, per-country and per-firm variants, and their own dashboards.
- **Some of this is already overruled.** Several parts conflict with decisions already taken: SA4-P1, SA8-D9, SA8-D12, Q16, Q19 and Q21. Applying those decisions removes about half the depth before any new judgement is needed.

---

### SA-08 Integrations & infrastructure rails

| # | Item | Where | Layer | Serves | Verdict | Smaller version / default | Data foundation | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | ExpatReady service keys set only at deploy, never in the console | SA8-D1 :34; SA-8-1–4 :246–249 | Control | Small ER team | Keep | — | — | Security floor, and it removes screens rather than adding them |
| 2 | Read-only Integrations status page, alert to Owner and engineer when a service goes red | :185–197; SA-8-26/27/41 :287–288, :308 | Config | Small ER team | Keep | — | — | One page covers all health needs (SA8-D12 :45) |
| 3 | Virus scan before staff open a file; allowed file types | SA-8-36/37 :303–304 | Control | Small firm | Keep | — | Scan status field | Security floor |
| 4 | Bounce or spam complaint stops sending and shows on the client record | SA-8-40 :307 | Control | Small firm + ER | Keep | — | Address status | Protects ExpatReady's shared sending reputation |
| 5 | Fallback to shared email when the firm's mailbox fails | SA-8-39 :306 | Config | Small firm | Keep | — | — | No knob; clients never miss an email |
| 6 | Stripe test→live guard, Owner's written OK, alert on any mode change | SA-8-13 :264, SA-8-47 :314 | Control | Small ER team | Keep | — | — | Money integrity, cheap |
| 7 | **E-sign wording: Owner approval after a recorded SME check** | SA8-D22 :60; SA-8-43 :310; BR-14 :339; `esign-settings:publish` Owner-only :403; SME note :355; US-8 :379; :448 | Control | Large ER team | **Simplify (apply Q16)** | Content author publishes normally; no Owner sign-off, no SME record (TEMPLATE-MAP Q16 :400) | Keep a settings version on every signature (SA-8-22 :279) | Contradicts the 11 Oct decision |
| 8 | E-sign "evidence options" as a configurable setting | entity :355 | Config | Large ER team | Simplify | Evidence fixed in code: time, IP, device, consent | Evidence fields | Nobody needs to vary this |
| 9 | Super Admin approves which mailbox / WhatsApp providers are offered | :227; BR-1 :326 | Control | Large ER team | Simplify | Fixed list in code (Gmail, M365, IMAP, one WhatsApp provider); no screen | — | A one-time product choice, not a console job |
| 10 | Upload size limit "set in SA-12" | :389 | Config | — | Simplify | Constant in code | — | Ties into SA-12 #10 |
| 11 | Invoice copies kept 6 years in a locked billing area, with holds | SA-8-44 :311 | Control | Small ER team | Keep | — | Built | ExpatReady's own tax duty |
| 12 | Written data-location statement; outbox clears invite/reset links; daily proration recorded | SA-8-31 :294, -46 :313, -48 :315 | Control | Small ER team | Keep | — | — | ExpatReady's own legal facts, security, money integrity |
| 13 | Firm's own mailbox, calendar and WhatsApp are optional | BR-11 :336; :229 | Config (firm) | Small firm | Keep | Shared rail is the default | Firm-connection record | No set-up needed on day one |

---

### SA-09 Platform analytics & observability (whole module new; no founder review recorded)

| # | Item | Where | Layer | Serves | Verdict | Smaller version / default | Data foundation | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | **Revenue dashboard**: MRR/ARR/ARPU, MRR movement breakdown, net revenue retention, revenue churn | SA-9-3/3b/4 :339–342; §3.2 :164–187 | Config | Large ER team | **Park (already decided)** | Stripe's reports. SA-04 deferred the in-platform revenue dashboard: SA4-P1 :75; "processor's reports cover Release 1" :107, :415; SA-4-37 :489 | SA-4 records all billing data from day one (:489) | SA-09 v2.2 predates this and still has SA4-X5 pending (:124) |
| 2 | Multi-currency: FX snapshots, reporting currency, missing-rate rules | SA-9-3a :340; BR-2/4/5 :383–386; FxRateSnapshot :434; Q1 :599 | Config | Large ER team | Park | CAD only (SA3-D2b, SA-04 :81) | — | Billing has one currency |
| 3 | Per-country revenue and usage, attribution rule, CRS-band spread, country trend | SA-9-6, -10, -11 :345, :354–355; BR-6 :387 | Config | Large ER team | Park | One country (SA8-D8 SA-08 :41) | `countryCode` on snapshot rows only if the table is built | Meaningless with one country |
| 4 | Aggregation pipeline: updates on events, daily reconcile, idempotent, backfill | SA-9-21 :372; §3.10 :311–324 | Config | Large ER team | Simplify | One nightly job writes about 8 daily numbers to a snapshot table | Daily snapshot table (history can't be rebuilt for counts that don't come from timestamps) | Built for many tenants and millions of rows (:540) |
| 5 | Metric catalog plus dashboard and widget definitions as data | §7 :430, :435–436; `manage-dashboards` :528 | Config | Large ER team | Park | Fixed page in code | — | A BI tool for a team of a few people |
| 6 | Six role-based dashboards | SA-9-18 :369; §3.6 :244–261 | Control | Large ER team | Simplify | One "Business" page; revenue tiles need `view-revenue` | — | Four of the six audiences are one person at launch |
| 7 | Firm counts by status, new and cancelled this month, trial conversion count | SA-9-1 :333, SA-9-5a :344 | Config | Small ER team | Keep (simple) | Counts for this month and last month; no cohort retention curves (SA-9-2a :336) | Status-change timestamps | The founder's weekly view |
| 8 | Feature-adoption heatmap | SA-9-8/9a :349–351; FeatureUsageEvent :432 | Config | Large ER team | Simplify | Plain table of firms using each feature, last 30 days | **Keep emitting FeatureUsageEvent** (usage history can't be backfilled) | Product signal, cheap if it's just a table |
| 9 | Monthly active users; module activity counts | SA-9-7, -9 :348, :350 | Config | Small ER team | Simplify | Monthly active users plus 4–5 counts, computed nightly | Login events | Derivable from source tables |
| 10 | **System health in the console**: latency, error rate, WebSocket, DB/cache, uptime | SA-9-12, -15/15a :358–362; §3.5 :226–242 | Config | Large ER team | **Park** | Amazon monitoring plus the SA-08 status page | — | **Contradicts SA8-D12** (SA-08 :45, :89: no health graphs in the console) |
| 11 | Queue depth and failed-job counts; total storage | SA-9-13/14 :359–360 | Config | Small ER team | Simplify | One extra line each on the SA-08 status page, using SA-08's red alert | — | A stuck automation queue really hurts firms |
| 12 | Alert-rules engine: thresholds, windows, severity, audience, cool-down, acknowledge | SA-9-20 :371; §3.8 :279–295; AlertRule/Event :437–438 | Config | Large ER team | Park | Alerts hard-coded: service red (SA-8-27), queue stuck, payment-failure spike | — | SA-8-27 already alerts |
| 13 | Date presets, period comparison on every tile, adaptive detail level | SA-9-19 :370 | Config | Large ER team | Simplify | Month picker plus "vs last month" | — | Enough for a weekly look |
| 14 | Async CSV/XLSX export with separate permission; scheduled digest email | SA-9-17 :368; SA-9-22 :373 | Config | Large ER team | Simplify / Park | Plain CSV of the page, audited; digest parked (already Phase 2) | — | — |
| 15 | Nine analytics permission keys | §10 :521–529 | Control | Large ER team | Simplify | `analytics:view` and `analytics:view-revenue` | Keys in code | Matches the smaller feature |
| 16 | Support tiles | SA-9-16 :365 | Config | Small ER team | Simplify | Open tickets plus oldest unanswered | — | — |
| 17 | Demo firms excluded; no personal data in analytics; firm-internal access only by audited impersonation | SA-9-23 :374; BR-9/10 :390–391 | Control | Small ER team | Keep | — | No personal-data columns | Correctness and security floor |

---

### SA-10 Support

| # | Item | Where | Layer | Serves | Verdict | Smaller version / default | Data foundation | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | Firm's ticket form asks title, category, sub-category, **priority**, attachments | SA-10-1 :348 | Config (firm) | Small firm | Simplify | Firm gives "what's wrong" plus a screenshot, category optional; **support sets priority** | Keep the priority column | A firm-set priority turns everything urgent; one fewer field for the firm |
| 2 | Support notified on submit; automatic acknowledgement | SA-10-2 :349 | Control | Small ER team | Keep (simpler) | Email plus in-app to the support inbox; no on-call roster; no SLA time in the acknowledgement | — | "Ticket received" email already mapped (TEMPLATE-MAP :313) |
| 3 | Queue with saved shared views, board view, bulk triage | :203–208; SA-10-4 :353 | Config | Large ER team | Simplify | One list, filter by status/assignee/firm, oldest unanswered first | — | AG1-D14 :28: "small team; the support lead watches the queue daily" |
| 4 | Category routing to staff pools, round-robin, keyword auto-triage | SA-10-6/7 :355–356 | Config | Large ER team | Park | Unassigned queue plus manual assign (SA-10-5 :354, exists) | `assignedTo` exists | Nobody to round-robin between |
| 5 | **Internal notes the firm can never see; socket room-join check; CORS** | SA-10-9 :360, -13 :366; BR-4 :401 | Control | Small firm + ER | **Keep** | — | `INTERNAL_NOTE` exists | Real leaks in today's code (:591) |
| 6 | Live chat plus email when the other side is offline; read receipts | SA-10-11/12 :364–365 | Config | Small firm | Keep / Park receipts | Email on a support reply | — | — |
| 7 | Bilingual canned replies with fill-in fields | SA-10-10 :361; §3.9 :299 | Config | Large ER team | Park | Agent types the reply | — | Worth it only at volume |
| 8 | **SLA engine**: per-priority targets, firm time zone, business hours, holiday calendar, pause clocks | SA-10-15 :370; BR-6 :402; Q3 :615 | Config | Large ER team | **Park** | Show ticket age and "waiting on firm" | **Store `firstResponseAt` and status-change times** (:447) so SLA can be worked out later | The founder has made no SLA commitment (Q3 still open) |
| 9 | At-risk and breach flags, auto-escalation, escalation rules and history | SA-10-16/17 :371–372; §3.7 | Config | Large ER team | Park | Escalation = reassign plus an internal note | — | One lead already watches the queue |
| 10 | "Open impersonation" from a ticket, reason pre-filled, separate permission, session linked | SA-10-18–20 :375–377 | Control | Small ER team | Keep | — | Ticket↔session link | Accountability to firms; reuses SA-2 |
| 11 | Reopen window (configurable), auto-close, reopen creates a new linked ticket | SA-10-21 :380; BR-8 :404 | Config | Small ER team | Simplify | Fixed 7 days; after close the firm opens a new ticket; no parent link | — | — |
| 12 | Satisfaction survey (CSAT), low-score flag | SA-10-22 :381 | Config | Large ER team | Park (founder confirm) | None, or a one-tap rating in the "resolved" email | — | TEMPLATE-MAP :313 lists "satisfaction survey"; if parked, the template goes too (rule 5 :19) |
| 13 | Knowledge base: internal plus firm-facing, bilingual, country tags, deflection, "helpful?" | SA-10-23 :384 | Config | Large ER team | Park | Static help pages outside the product (founder Q) | — | A content system of its own |
| 14 | Support metrics rollups by category, firm, country and agent | SA-10-24 :387 | Config | Large ER team | Simplify | Open count plus average first response, computed live | — | The ticket table is small |
| 15 | Settings screens for categories, SLA, routing, escalation, canned replies, KB | SA-10-25 :388; §3.12 | Config | Large ER team | Park | Fixed category list; add `IMMIGRATION_CONTENT` (Q1 :613) | Enum | The doc already calls the enum the "Phase-1 reality" |
| 16 | Deactivated agent's tickets go back to the queue | SA-10-26 :391 | Control | Small ER team | Keep | — | — | Decided (AG1-D13) |
| 17 | Permission names `global/support:*` | §10 :526–546 | Control | — | Simplify | `system/support:{list,manage}`; drop the delete grant | — | Conflicts with SA1-D8 `system/*` only (SA-08 :22, :82) |

Wording clean-up under rule 7: "Law-25/CASL-aware" at :188 and :304.

---

### SA-11 Audit, compliance & data governance

| # | Item | Where | Layer | Serves | Verdict | Smaller version / default | Data foundation | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | Append-only audit log of significant events, with explicit actor type, tenant and correlation id | SA-11-1/2 :348–349; BR-3/4 :402–403 | Control | Small firm + ER | **Keep** | — | **`actorType`, `tenantId`, `correlationId`** (history can't be retrofitted) | Core trust |
| 2 | Database allows insert only on the audit table | SA-11-3 :350 | Control | Small ER team | Keep | — | — | Cheap security floor |
| 3 | Failed audit write retried, with an alarm, never silently dropped | SA-11-7 :354 | Control | Small ER team | Keep | — | — | No silent gaps |
| 4 | Hash chain plus sequence number; verify job and alarm | SA-11-4/6 :351, :353; §9 :528–529; §11 :572 | Control | Large ER team | Park (founder Q) | Insert-only grant plus backups | Reserve `sequenceNo` | No law is cited for this. It is an "evidence-grade" ambition (:137) and needs a single ordered writer, which is real engineering risk. Can start later from a first chained entry |
| 5 | Sealed off-site copies of the chain (WORM, optional external timestamp) | SA-11-5 :352 | Control | Large ER team | Park | — | — | The doc admits it is infrastructure-dependent (:616) |
| 6 | Investigation console: correlation pivot, saved investigations, auditor pack, chain report on export | SA-11-8/9 :355–356; §3.3 | Config | Large ER team | Simplify | One filtered list (date, firm, actor, action) plus audited CSV; admin query writes one `CROSS_TENANT_ACCESS` line (SA-11-12 :359) | `correlationId` | — |
| 7 | Impersonation start/end plus every action stamped | SA-11-11 :358 | Control | Small firm + ER | Keep | — | — | Firms will ask "who from ExpatReady looked at my data" |
| 8 | **Platform retention editor** (category × country, floors enforced in code), cold archive, disposal engine, recovery window, pre-deletion manifest | SA-11-13–16 :363–366; §3.4 | Config | Large ER team | **Park (already decided)** | **Q19 :403**: one firm setting "keep closed client files N years", default not set, warning plus reason, **no automatic deletion in Release 1**. Decision 11 :357: activity-log minimum is ExpatReady's own fixed value | ExpatReady's own fixed periods as constants: staff audit 7 years (SA-11-14 :364, SA7-X5), billing 6 years, breach records 2 years | SA-11-13's "legal floor rejected by UI and API" contradicts Q19 and rule 7 (:21) |
| 9 | Two-person, regulator-ordered audit deletion | SA-11-17 :367; BR-9 :408 | Control | Large ER team | Park | No deletion path in the product; engineer runbook with recorded Owner sign-off | — | Possible with SA7-D41's two Owners (SA-07 :105) but not worth building yet |
| 10 | Legal-hold register (platform), plus firm key `agent/legal-hold:manage` | SA-11-18 :368; :552; AG-09 :777 | Control | Large firm / large ER | Park | Nothing deletes itself in Release 1 (Q19), so there is nothing to freeze | — | Add before any disposal engine ships |
| 11 | **Generated residency declaration plus "non-Canadian rail" warnings** | SA-11-20/21 :373–374; BR-10 :409; US-5 :503–505; §6F :459; entity :471; §3.6 :265–279 | Config | Large ER team | **Park (already decided)** | Written statement (SA-11-32) | — | SA8-D9 removed the generator, but SA-11-21, BR-10, US-5, §6F and §3.6 still describe it. Clean up |
| 12 | Written data-location statement, sub-processor list, Security & privacy page | SA-11-22 :375, -32 :394 | Control | Small firm | Keep | — | Versioned statement | ExpatReady's own facts (rule 7 :21) |
| 13 | Breach register | SA-11-24 :380 | Control | Small ER team | Keep (simple) | Plain record: discovered at, scope, cause, containment, decision; no structured "real risk of significant harm" engine | `discoveredAt` | ExpatReady's own record-keeping duty |
| 14 | Breach notice composer to the regulator **and affected individuals**; 72-hour countdown; per-country regulator | SA-11-25/26 :381–382 | Control | Large ER team | **Simplify (apply Q21)** | **Q21 :405**: "Security incident notice" to affected firms' Owner and Admins; individuals only for ExpatReady's own users; the firm decides about its clients; regulator report filed outside the product | — | SA-11-25 conflicts with Q21. "72h" vs "as soon as feasible" is still a counsel point (:292) |
| 15 | **Data-subject request register for firm clients' requests from the portal** | SA-11-27/28 :386–387; :160, :300 | Control | Large ER team | **Simplify (apply Q21)** | The register tracks only requests made to ExpatReady itself; client requests are handled firm-side | — | Contradicts Q21 |
| 16 | Consent records (time, scope, language, text version, withdrawal), read live | SA-11-29 :388; BR-13 :412; viewer key :561 | Control | Small firm | Keep data / Park Super Admin viewer | Stored firm-side, as decided (:372, :360, Q20 :404) | **Yes** | Remove the "CASL/Law-25 enforcement" wording (:305, :310, :581); decision 1 :347 removed those claims |
| 17 | Pack change-history viewer | SA-11-30 :392 | Config | Small ER team | Simplify | Audit list filtered by entity (before/after already stored) | before/after | — |
| 18 | Platform compliance dashboard plus per-firm compliance report | SA-11-31 :393; §3.10 | Config | Large ER team | Park dashboard / Simplify report | Per-firm report = audit list filtered to that firm's impersonations, exportable | — | Most dashboard tiles point at parked engines |
| 19 | Retention policy published to firms in a "DPA/retention declaration" view | SA-11-19 :369 | Config (firm) | Large firm | Simplify | The Security & privacy page (SA-11-32) | — | Firms set their own keep-period (Q19) |
| 20 | Ten new `system/compliance:*` / `audit:*` keys | §10 :548–562 | Control | Large ER team | Simplify | `audit-log:list`, `audit:export`, `compliance:breach-manage` | Keys in code | Match the smaller feature set |
| 21 | No personal data in system logs; no passport or financial numbers in messages | BR-16/17 :415–416 | Control | Small firm | Keep | — | — | Security floor |

---

### SA-12 Feature flags & platform configuration

| # | Item | Where | Layer | Serves | Verdict | Smaller version / default | Data foundation | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | Flag catalog with lifecycle stage, owner, clean-up candidates view | SA-12-1–3 :342–344; §6A :439–450 | Config | Large ER team | Simplify | List in code: key, description, default, `coversClientRecords` | `coversClientRecords` (decided AG17-D69) | Tens of flags, one engineer |
| 2 | Six flag scopes: user, firm, % rollout, country, plan, platform | SA-12-4 :347; :190–198 | Config | Large ER team | Simplify | **Platform on/off plus firm override only**; plan comes from SA-3 entitlement | `FlagValue.scopeKind` enum so scopes can be added later | One country (SA8-D8); user scope already questioned (Q2 :622) |
| 3 | % rollout with sticky hashing, pause/rollback, allow/deny lists, rollouts dashboard | SA-12-13/14 :362–363; §3.4 | Config | Large ER team | Park | Firm overrides on internal and demo firms do the dark launch | — | 5% of a few dozen firms is about one firm |
| 4 | Server-side check, flag AND entitlement, two distinct refusal codes | SA-12-6, -9 :349, :354; BR-1/4 | Control | Small firm | Keep | — | — | Security |
| 5 | Explain why a flag is on or off for a firm | SA-12-5 :348 | Config | Small ER team | Keep | — | — | Cheap; helps support |
| 6 | Kill switch: own permission, reason required, Owner notified | SA-12-12 :361 | Control | Small ER team | Keep (simpler) | A platform "off" value with a reason; no separate KillSwitch entity or eligibility flag; no second-person confirm (Q3 :623) | — | The one release-safety tool a small team needs |
| 7 | Preview of affected firms, diff, versioned values with one-click revert | SA-12-15/16 :366–367; §3.5 | Config | Large ER team | Simplify | The audit before/after is the history; revert = set the old value | Audit before/after | — |
| 8 | Settings registry: typed, per-plan and per-firm overrides, dev/staging/prod values, versioned | SA-12-17/19 :370, :372; :271; Q7 :627 | Config | Large ER team | Simplify | Registry holds only the SA-7 security settings; everything else is code or deploy config | — | Environments are a deploy concern |
| 9 | Per-firm rate-limit overrides | SA-12-24 :383; §3.9 | Config | Large firm | Park | One platform limit; **Q4 still needs a number** (100/60s vs 200/15s, :624) | — | Serves high-volume firms |
| 10 | Per-firm upload limit ("100 MB for an enterprise firm") | US-7 :514–516; :270 | Config | Large firm | Park | One platform limit | — | Large-firm need |
| 11 | Platform-wide maintenance mode with message and expected end | SA-12-20/22 :375, :377 | Control | Small ER team | Keep (simple) | — | — | Clean 503 instead of a broken app |
| 12 | Maintenance for a single firm, plus bypass tokens | SA-12-20/21 :375–376; §3.7 | Control | Large ER team | Park | Platform-wide window only | — | Rare; adds token security work |
| 13 | Announcement banners: platform or per-firm, severity, EN/FR, scheduled, dismissible | SA-12-23 :380 | Config | Small ER team | Simplify | One platform banner, EN/FR, start/end, info or warning | — | One firm is better reached by email or support |
| 14 | Every change audited with a reason | SA-12-25 :386 | Control | Small ER team | Keep | — | — | — |
| 15 | No flag can switch off isolation, sign-in, permissions or audit | SA-12-26 :389; BR-14 | Control | Small firm | Keep | — | — | Security floor |
| 16 | SA-7 security settings Owner-only; go-live values; staff auto-logout never off in production | SA-12-27–29 :392–401 | Control | Small ER team | Keep | — | — | Already decided |
| 17 | Client-records flags turn read-only, reminders keep running | SA-12-30 :404–410 | Control | Small firm | Keep | — | — | Decided; protects firms |
| 18 | **Stale text: firm override used to "close a deal / paid trial"** | §1 :129; §2 :148, :150; :194, :205; US-3 :498–499; Q5 :625 | Control | — | Remove | — | — | Contradicts SA-12-10 :357 and SA3-D6 |
| 19 | Nine flag/config permission keys | §10 :559–569 | Control | Large ER team | Simplify | `flag:view`, `flag:manage` (includes firm override), `flag:kill-and-maintenance`, `announcement:manage` | — | — |
| 20 | Record "paid feature was killed for N firms" for billing | Q6 :626 | Config | Large ER team | Park | — | — | — |

---

### (a) The five changes that save the most build

1. **Cut SA-09 down to one Business page plus two lines on the SA-08 status page** (rows 1–6, 10, 12). Two earlier decisions already point this way: SA4-P1 / SA-04 :107 (revenue dashboard deferred, Stripe reports instead) and SA8-D12 (no health graphs in the console). Removing the pipeline, FX, alert engine, metric catalog and nine keys takes out almost all of a 600-line module. Keep FeatureUsageEvent and a daily snapshot table.
2. **Park SA-11's governance engines:** retention editor and floors, archive and disposal, legal hold, residency generator, compliance dashboard, and the firm-client request register (rows 8–11, 15, 18). These are already overruled by Q19, Q21 and SA8-D9. The documents just haven't been updated.
3. **Reduce SA-12 to a code-defined flag list with platform plus firm scopes, a kill switch and a platform banner/maintenance switch** (rows 1–3, 7–10, 12). Rollout, user and country scopes, the environment-aware registry and per-firm limits serve a large operations team and large firms.
4. **SA-10: park the SLA engine, escalation, routing, settings screens, KB, canned replies and CSAT** (rows 4, 7–9, 12–15). Keep the queue, assignment, internal notes (with the leak fixes), impersonation link and email notifications. Store `firstResponseAt` so SLA can be added later.
5. **SA-11 audit evidence: park the hash chain, sealed off-site copies and two-person deletion** (rows 4, 5, 9). Keep the insert-only grant, `actorType`/`tenantId`/`correlationId`, and no silent audit drops. This is a judgement call because no legal duty is cited; see question 3.

### (b) Must stay even at the smallest scale

- **SA-08:**
  - Keys at deploy only.
  - Virus scan and allowed types.
  - Bounce stop.
  - Mailbox fallback.
  - Stripe go-live guard.
  - Outbox link clearing.
  - Daily proration.
  - Billing copies kept 6 years.
  - Written data-location statement.
  - Status page with red alerts.
  - E-sign settings version on every signature.
- **SA-09:**
  - No personal data in analytics (BR-9/10).
  - Demo-firm exclusion.
  - FeatureUsageEvent emission.
- **SA-10:**
  - Internal-note exclusion in the query and the socket.
  - Socket room-join authorisation and CORS.
  - Attachments treated as personal data.
  - Impersonation gated by its own permission and linked to the ticket.
  - Deactivated agent's tickets returned to the queue.
- **SA-11:**
  - Append-only log with actor type, tenant and correlation id.
  - Insert-only grant.
  - Retry and alarm on failed audit writes.
  - Impersonation logging.
  - Staff-action audit kept 7 years.
  - Breach register.
  - Security incident notice to affected firms (Q21).
  - Handling of requests made to ExpatReady itself.
  - Consent data fields.
  - BR-16 and BR-17.
- **SA-12:**
  - Server-side flag AND entitlement.
  - Kill switch.
  - Audit with reason.
  - The rule that no flag can switch off a security control (SA-12-26).
  - SA-7 security settings.
  - Client-records read-only rule.

### Contradictions to fix (already decided, not re-opened)

- **SA-08 e-sign approval:** SA-8-43, SA8-D22, BR-14 and US-8 (Owner approval plus SME) vs Q16 :400.
- **SA-09:**
  - Health dashboards (§3.5) vs SA8-D12.
  - Revenue and FX sections vs SA4-P1 and SA3-D2b.
  - SA4-X5 is still "Pending".
- **SA-11:**
  - SA-11-13 floors and disposal vs Q19 and decision 11.
  - SA-11-25 and SA-11-27/28 vs Q21.
  - SA-11-21, BR-10 and US-5 still describe the withdrawn generator.
  - CASL/Law-25 wording vs decision 1.
- **SA-12:** "paid trial" text vs SA-12-10 and SA3-D6.
- **Naming:**
  - SA-10's `global/support:*` vs SA1-D8.
  - SA-09 and SA-11 use roles not among SA-07's nine starter roles: "Compliance/DPO" (SA-11 :152), "Country Manager", "Support Lead" (SA7-D8, SA-07 :47).

### (c) Questions for you

1. **Business numbers:** SA4-P1 already deferred the revenue dashboard. Should all of SA-09 follow (Stripe reports plus a few nightly counts), or do you want the one Business page in Release 1?
2. **Advertised support response time:** will ExpatReady promise one? If not, the SLA engine stays parked. If yes, use one fixed target in ExpatReady's own business hours, not each firm's time zone and holiday calendar (SA-10 Q3 :615).
3. **"Evidence-grade" audit:** do you intend to sell a tamper-evident log to firms in Release 1? If not, park the hash chain and sealed copies, and the insert-only grant is the floor.
4. **CSAT:** TEMPLATE-MAP :313 lists a "satisfaction survey" email. Keep a one-tap rating, or drop it (the template moves with it, rule 5)?
5. **Help articles:** in-product knowledge base, or static help pages outside the product?
6. **Maintenance:** console toggle (SA-12-20) or an engineer-deployed maintenance page?
7. **Rate limit:** SA-12 Q4 needs a number whatever else is parked: 100/60s (code) vs 200/15s (v1.0).
8. **Breach handling:** which of SA-07's nine roles (probably "Security & audit") owns the breach register and the regulator report? SA-11 assumes a DPO role that does not exist.
9. **SA-11 Q2 (still with counsel):** breach timing, "as soon as feasible" vs a hard 72 hours.
---

## Review: AG-02-03-04

## Complexity register: AG-02, AG-03 and AG-04

This was a read-only review. I created and changed no files. I read the lens, the R1 scope memo and all three documents to the end: AG-02 is 1010 lines, AG-03 is 679 and AG-04 is 842. Line numbers below are `file:line`. "Size" means the smallest firm that would notice the item.

The scope memo says routing, bulk actions, saved views, sequences, API keys and export stay in R1. Where those appear below, only their extra knobs are parked or simplified, never the capability itself.

---

### AG-02 Prospect / Lead / Sales CRM (v1.9)

| # | Item | Where | Layer | Size | Verdict | Smaller version / default | Keep data? | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | See all prospects vs only my own | AG-2-64 :644; §10 :864, :869 | Control | 10 | Keep | Show it as one per-role switch, "Sees all prospects", on by default. That is how it is already seeded. | Yes (key, `ownerUserId`) | One key with an open default is already minimal. |
| 2 | Who sees unassigned leads (see-all or assign holders) | :509, :644 | Control | 4 | Keep | A fixed rule with no knob | — | Already fixed. |
| 3 | 19 prospect permission keys (merge, bulk, convert, lose, assign, sequence, export, log-call, 3× configure, 2× dashboard) | §10 :862-882; :860 | Control | 10 | Simplify | Keep every key in code. On screen show 4 bundles: Work leads / Assign & bulk / Configure CRM / Reports & export. | Yes (keys in code) | No small firm will tick 19 boxes. Splitting convert, bulk and lose off `:edit` is still right in code (:890). |
| 4 | `log-call` as its own key | :877 | Control | — | Park as a visible key (fold into Work leads) | Anyone who can edit a lead can log a call | Key in code only | Nobody holds back call logging. Speed-to-lead depends on it. |
| 5 | `configure-pipeline` / `configure-form` / `configure-source` as three keys | :878-880 | Control | large | Simplify | One "Configure CRM" key | Keys in code | The same person (Owner/Admin) does all three in a 1–10 firm. |
| 6 | `view-dashboard` vs `view-performance` | :881-882 | Control | large | Simplify | One "Reports" key | Keys in code | A split nobody at this size will use. |
| 7 | Merge needs permission and is audited | :268, AG-2-16 :572, :870 | Control | 4 | Keep | — | Yes (tombstone, audit) | Merge is close to destructive, so data integrity is at stake. |
| 8 | Manual move to WON needs permission plus a "signed offline" reason | :336 | Control | solo | Keep | — | Yes | Money and attribution integrity. |
| 9 | Message supervision for unlicensed users (firm switch, on by default, Owner can turn off with a reason) | AG11-D11 :61; AG-2-56 :636; BR-20 :680 | Control/Config | solo + assistant | Keep | Already one switch | Yes (approval record) | A solo RCIC with an assistant triggers it. It protects the firm. |
| 10 | Approver of AI-written text: licensed user by default, Owner may allow other roles | :61, :636 | Config | large | Park the knob | Licensed user approves. Owner approves only when no licensed user is active, which is already a rule. | Yes (approver id and role on the approval) | AI is off for every firm until Super Admin records provider terms (:63), so the knob does nothing at launch. |
| 11 | Switching on one imported lead: an unlicensed owner's switch-on waits for a licensed user's approval | AG18-D11(b) :70; AG-2-59 :639 | Control (approval) | 10 | Simplify (needs a founder decision) | Lead owner or an `import:run` holder switches it on, no second approval. Item 9 already supervises any unlicensed-written message. | Yes (`activatedBy/At`) | Two approval layers on one action. The template message itself was already approved once (AG11-D12). |
| 12 | Import permissions (`agent/import:*`, Owner/Admin) | :886 | Control | solo | Keep | — | Yes | Owned by AG-18. |
| 13 | Owner attestation on every import batch containing personal data | AG-2-59 :639; :64 | Control | solo | Keep | — | Yes | Protects ExpatReady. |
| 14 | Reassignment needs `assign`, same firm only, audited | AG-2-13c :566 | Control | 4 | Keep | — | Yes | Cheap and necessary. |
| 15 | Per-contact privacy (PIPEDA) export, "separately-permissioned" | :530 vs §10 :876 | Control | solo | Simplify | Cover it with `export`. Fix the text: §10 has no separate key. | Audit | The document contradicts itself. Every firm must answer access requests. |
| 16 | Export-history screen (Manager) | :538 | Config (dashboard) | large | Park | Exports appear in the general audit log | Yes (audit rows) | A dedicated screen adds nothing for 1–10 firms. |
| 17 | Stage editor (rename, reorder, colour, add, remove, kind, delete-with-move) | :312, AG-2-20 :578, AG-2-21 :579, :323 | Config | solo | Keep | — | Yes | Already exists in code (:930). Firms expect it. |
| 18 | Two pipelines, each with its own stages | :314, AG-2-52 :584 | Config | 4 (corporate) | Keep | One editor with an Individual/Corporate tab | Yes | Decided by AG17-D5. |
| 19 | Win-probability per stage | AG-2-20 :578, :395, :734 | Config | large | Park the knob | Seeded probabilities, not shown | Yes (column) | Only forecasting uses it, and §13 parks forecasting (:993). |
| 20 | Work-in-progress soft limit per stage | :318, `wipLimit?` :734 | Config | large | Park | No limits | Not needed (nullable column, add later) | Nobody at this size will set it. |
| 21 | Which stages can move to WON (`isWonEntry`) | Q9 :987 | Config | 4 | Simplify | Fixed rule: WON is reachable from any active stage ordered at or after Proposal. No flag. | — | Solves the custom-stage dead end without adding a knob. |
| 22 | Loss-reason list | AG-2-44 :623, :738 | Config | solo | Keep | — | Yes | Already exists. Cheap. Feeds lost-by-reason reporting. |
| 23 | Lead-source list, extensible by the firm | :737, :880 | Config | 4 | Simplify | Seeded list plus "add/hide label". No editing of bilingual labels. | Yes | Firms add one or two sources (a webinar, a partner). |
| 24 | Call-outcome list, configurable by the firm | :469 | Config | large | Park the knob | Fixed list | Store as string | Three different lists exist: :469, AG-2-37a :608 and :736. Fix that first. |
| 25 | Call recording on/off plus jurisdiction consent rules | :472, :479 | Config | — | Park (R2 with telephony) | Off | Yes (`recordingRef?`) | Live telephony is R2 per the scope memo, so there is nothing to record in R1. |
| 26 | Web-form builder: fields, consent options, thank-you, spam toggles, one form per language | :231, :253, AG-2-5 :552, AG-2-5a :553, :742 | Config | solo | Simplify | One form with a fixed core field set plus a few custom fields. Consent text comes from the platform per language. EN/FR variants come from that one form. Spam protection is always on, with no toggles. | Yes (`WebFormConfig.locale`) | Capture is day-to-day. Spam toggles are a security floor, not a choice. |
| 27 | Inbound API keys screen (create/revoke, last used, rate-limit visibility) | :232, :255, AG-2-6 :554 | Config | 4 | Keep (drop rate-limit display) | Create, revoke, label, last used | Yes | The founder kept this in R1. |
| 28 | Routing rule builder: ordered first-match rules, criteria (programme/source), strategy (round-robin, load-balanced or fixed), eligible set, per pipeline | :494-499, AG-2-13a :564, AG-2-13b :565, :735, BR-11 :671, :517 | Config | 4 | Simplify | One rule per pipeline: "assign to [person]" or "rotate among [people]", with an optional "split by programme → pool". Park by-source, load-balanced and multi-rule chains. | Yes (keep `AssignmentRule` with `order` and `criteriaJson`) | Routing stays; the rule-builder grammar goes. `LOAD_BALANCED` appears only in AG-2-13b and §7, not in §3.13 or BR-11, so that is an inconsistency too. |
| 29 | Configurable fallback rule (for example, assign to the manager) | :509 | Config | 10 | Park | Unassigned queue plus a notification to the Owner | — | The default already covers it. |
| 30 | Out-of-office skip; route existing leads to a backup | :507 | Config | 4 / 10 | Keep the skip; park the backup routing | OOO only skips new assignment | Yes (OOO range, owned by AG-01) | Backup routing for existing leads is extra depth. |
| 31 | Saved views, personal and firm-shared | :320, AG-2-23 :581, :741 | Config | 4 | Simplify | Personal views plus a few seeded system views ("Unassigned new leads", "My open consults"). Park firm-shared authoring. | Yes (`ownerUserId?` already nullable) | Saved views stay; shared-view management goes. |
| 32 | Speed-to-lead recipe: on/off plus AUTO / APPROVE / OFF for the client message | AG-2-56 :636 | Config | solo | Keep (as two controls) | Show "On / Off" and "Review before sending" | Yes (`autonomyLevel`) | This is the core anti-drop feature. |
| 33 | First-response target ("call within X minutes") | :247; Q5 :981 | Config | solo | Simplify | One firm-wide number with a seeded default | — | The default is still undecided (Q5). |
| 34 | Business-hours mode on/off for the response and going-cold clocks | BR-12 :672; Q5 :981 | Config | 4 | Park the toggle | Always count business hours from AG-01 office hours | — | 80% of firms will want weekends excluded, and the default is still open. |
| 35 | Going-cold threshold N (default 7) | AG-2-39 :610, :373 | Config | 10 | Park the knob | 7 business days | — | Can be added later with no data change. |
| 36 | Three ready-made recipes (on/off) and timings the firm can edit | AG-2-57 :637; AG11-D17 :69 | Config | 4 | Keep on/off; simplify timings (needs a founder decision) | On/off only, fixed timings | Yes | AG11-D17 made timings editable in R1. That conflicts with the lens. |
| 37 | One-time "Review your standard messages" screen | AG11-D12 :62 | Control (one approval) | solo | Keep | — | Yes | One screen protects the firm. |
| 38 | Needs-you due times (2 working days, and 2 days before a government deadline), editable by the firm | :69, :998 | Config | large | Park the knob | Fixed values | — | Nobody at this size tunes these. |
| 39 | Sequence-library screen that says "edit steps" | :360 vs AG-2-57 :637 | Config | — | Simplify | Toggle, view steps, edit message text. Step editing stays R2. | — | The key-screen text contradicts the R2 decision on step editing. |
| 40 | Escalation of overdue tasks, missed calls and SLA breaches ("optional", "MAY") | :384, :484, BR-12 :672 | Config | 10 | Park | A notification to the owner only | — | It is undefined and untestable as written. |
| 41 | Nurture "recycle on a trigger" (new draw, profile update, reply) | :420, AG-2-45 :624 | Config | 4 | Simplify | Fixed triggers: reply or profile update | — | The trigger set is unspecified, so it cannot be tested. |
| 42 | Import undo window (14-day "default") and pause/start preview with per-action-type skip boxes | :233, AG-2-59 :639 | Config | 10 | Simplify (owned by AG-18) | Fixed 14 days. The preview shows counts plus confirm, with no per-action-type checkboxes. | Yes (batch id, `automationState`) | Calling it a "default" implies a knob. |
| 43 | Sales dashboard, rep leaderboard, weighted forecast, commit/best-case, quota targets | :391-397, AG-2-41 :616, AG-2-42 :617, AG-2-43a :619 | Config (dashboard) | 4 for the basics, large for the rest | Simplify | Funnel counts, leads by source/campaign, conversion rate, lost-by-reason, pipeline value. Park forecast, quota and leaderboard. | Yes (`expectedCloseDate`, `winProbability`, attribution) | §13 :993 parks the dashboard and forecasting, but AG-2-41/43a still say SHALL. That is a contradiction. |
| 44 | Reporting currency, FX snapshot policy and the dashboard currency toggle | :401, :412, :745, AG-2-43b :620, Q6 :984 | Config | large | Park FX conversion | Show subtotals per currency and never sum across currencies | Yes (`dealValueCurrency`, which :993 already keeps) | This also takes the open FX-source decision (Q6) off R1's critical path. |
| 45 | Plan gating of sequences, pipelines, API keys, forecasting and multi-currency | :920; Q8 :986 | Config (vendor) | — | Founder question | — | — | Gating API keys conflicts with "kept in R1 for daily work" unless that is a pricing choice. |

### AG-03 Pathway Assessment (v1.4)

Almost all of AG-03 is capability. Packs are authored centrally (AG-3-8 :349), so the firm sees very few knobs.

| # | Item | Where | Layer | Size | Verdict | Smaller version / default | Keep data? | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | `assessment:view` / `:run` | §10 :569-570 | Control | solo | Keep | — | Yes | — |
| 2 | `override`, `review`, `share` as three keys | :571-573, :579 | Control | 4 | Simplify | Keep them in code. Show one "Consultant sign-off" bundle, given by default to licensed users. | Yes | No default roles are mapped for any AG-03 key (:7). That is a gap. |
| 3 | `pin-version` key | :574 | Control | large | Park as a visible key | Fold into override | Key in code | An edge action for this market. |
| 4 | `view-stale` key | :575 | Control | large | Park as a visible key | Fold into view | Key in code | Its own key adds nothing. |
| 5 | Review required before client-share: configurable per firm | AG-3-34 :387, BR-16 :419, Q9 :667, US-9 :528 | Config/Approval | 4 | Simplify | No toggle. A share by a licensed user counts as reviewed; a share by anyone else needs a licensed user's review. This mirrors AG11-D11. | Yes (`reviewedBy/At`) | A solo RCIC reviewing their own work is pointless; an assistant sharing advice is not. |
| 6 | Firm-level override of pack values | AG-3-8 :349, Q8 :666 | Config | large | Park | Packs are read-only to firms | — | Agrees with the proposed default. The "display preferences" mentioned at :666 are undefined. |
| 7 | Auto-assess when the profile is complete | Q10 :668 | Config (possibly per firm) | 4 | Keep as a product rule, no firm toggle | Decide once | Yes (`runType`) | It must not become a firm setting. |
| 8 | Firm-wide stale-assessments queue (Manager) | AG-3-29 :380, :285, US-11 :535 | Config (dashboard) | 10 | Simplify | A "stale" badge on the lead plus a lead-list filter | Yes (`packVersion` stamp) | A separate screen duplicates the list view. |
| 9 | Pack-version picker for a pinned re-run | AG-3-31 :382, :177, :283 | Config | large | Park in the UI | Re-runs use the active version | Yes (`pinnedVersion?`) | Rare. Can be added later. |
| 10 | Share options: language, include/exclude recommendations, review gate | :329 | Config | solo | Simplify | Language defaults to the client's. One "include recommendations" checkbox. The gate follows row 5. | — | Fewer choices at the moment of sharing. |
| 11 | Plan gating of what-if, client artifact and bulk re-run | :605, Q12 :670 | Config (vendor) | — | Founder question | — | — | Pricing decision. |

### AG-04 Consultation & Booking (v1.5)

| # | Item | Where | Layer | Size | Verdict | Smaller version / default | Keep data? | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | Appointment-type keys list / create / edit / delete | §10 :718-721 | Control | 4 | Simplify | One "Manage appointment types" key on screen | Keys in code | Create, edit and delete have the same defaults (Owner, Admin). |
| 2 | `configure-availability` limited to Owner/Admin | :722 | Control | 4 | Simplify, with a fix | Fold into manage-types. Hosts may edit their own hours. | Key in code | As written, a consultant cannot set their own availability. That hurts day-to-day work. |
| 3 | `configure-reminders` | :723 | Control | large | Park as a visible key | Fold into manage-types | Key in code | Same defaults as edit. |
| 4 | Booking keys list / edit / create / reschedule / mark-attendance | :724-728 | Control | 10 | Simplify | One "Manage bookings" key. The notice-window override stays audited (:684). | Keys in code | All four have identical default roles (Owner, Admin, CM, CO), so splitting them shows nothing on screen. |
| 5 | `booking:list` "+ analytics" vs `booking-analytics:view` | :724 vs :733 | Control | — | Fix | Analytics only under the Reports key | — | The table contradicts itself. |
| 6 | Consult keys `write` / `create-proposal` | :729-730 | Control | large | Simplify | Fold into Manage bookings | Keys in code | Identical defaults. |
| 7 | `booking-page:configure` | :731 | Control | solo | Keep (in the Owner/Admin bundle) | — | — | — |
| 8 | `integration-calendar:create` limited to Owner/Admin | :732 vs :336 | Control | solo | Keep, with a fix | Any user may connect their own calendar; Owner/Admin connect firm-level video | Yes | The connection is OAuth into the staff member's own account (:336). An Owner cannot do that on a consultant's behalf. |
| 9 | Staff override of the cancel/reschedule notice window (audited) | :684, :727 | Control | solo | Keep | — | Audit | Needed day to day. |
| 10 | Weekly availability grid per type | AG-4-1 :452; :176, :606 | Config | solo | Keep | — | Yes | Already exists. Hours sit on the type, not the host (:606) — see open question 6. |
| 11 | Buffers before/after | AG-4-4 :455 | Config | 4 | Keep under "Advanced", default 0 | — | Yes | Already exists. Cheap. |
| 12 | Minimum notice and booking window | AG-4-5 :456 | Config | solo | Keep with defaults (60 days) | — | Yes | Already exists. |
| 13 | Caps per day/week/month per host, plus group capacity | AG-4-6 :457 | Config | 4 for daily, large for the rest | Simplify | One daily cap per type. Park week/month and per-host enforcement. | Yes (columns already exist, :773) | Per-host enforcement is new build for a large-firm need. |
| 14 | Business hours and holidays per office | AG-4-7 :458, :183 | Config | solo | Keep (owned by AG-01) | Seeded from the country pack | Yes (office id) | — |
| 15 | Slot interval separate from duration | Q9 :830, :177 | Config | 10 | Park | Interval = duration | — | Already proposed as Phase-2. |
| 16 | Purpose category (Free / Paid / Follow-up / Case review / Other) | AG-4-10 :463, :202 | Config | solo | Simplify | 3 options: Free consult / Paid consult / Client or case meeting | Yes (enum) | Follow-up, Case review and Other overlap. Category drives lead creation vs attaching to a case. |
| 17 | Modes (in person / phone / video) and provider | AG-4-11 :464 | Config | solo | Keep | — | Yes | — |
| 18 | Hosting model (one-on-one / round-robin / group / collective) | AG-4-12 :465, :206; Q11 :832; :839 | Config | 4 | Simplify | "One host" or "Team pool". Park group and collective. | Yes (enum) | Collective has no requirement detail at all, and group is deferred at :839. |
| 19 | Round-robin mode: equal distribution vs maximise availability | :414-416, `roundRobinMode` :605, AG-4-51 :526 | Config | 10 | Park the choice | One built-in rule: any free host, fewest bookings wins | Yes (column) | A second distribution engine beside AG-02's — see top 5, item 2. |
| 20 | Language variants of type copy | AG-4-13 :466 | Config | solo (Quebec) | Keep, falling back to the firm's default language | — | Yes | Law 25 makes this a compliance need. |
| 21 | Intake-question builder with mapping to lead fields | AG-4-14 :467 | Config | solo | Keep | Map only to a fixed list of lead fields | Yes | Already exists (`prospectFieldMap`). |
| 22 | Pre-consult agreement required (wording from the pack) | AG-4-15 :468; Q7 :828 | Config | solo | Keep | Default comes from the pack | Yes (accepted-at) | Protects the firm. |
| 23 | Price and currency for paid types | AG-4-44 :513 | Config | solo | Keep | — | Yes | — |
| 24 | Payment hold window before a booking expires | AG-4-45 :514; Q7 | Config | 10 | Park the knob | A platform default | — | The value is undecided. |
| 25 | Refund policy on cancel (full / partial / none by notice window) | AG-4-46 :515, :361; Q7 | Config | 4 | Simplify | One firm switch: "Refund if cancelled within the cancel-notice window". Manual refund always stays available in AG-06. | Yes (paid context) | Tiered refund rules are excess. Money integrity is kept. |
| 26 | Self-service cancel/reschedule allow flags and notice hours | AG-4-37 :502 | Config | solo | Keep | — | Yes | Already exists. |
| 27 | Reminder rules per type (trigger, offset, channel, template per language, preview) | AG-4-31 :494, :296, :310, :608 | Config | 4 | Simplify | One firm-level set (confirmation, 24h, 1h, after, cancellation), each with on/off and editable text. Fixed offsets. Per-type overrides parked. | Yes (`ReminderRule` per type) | Per-type copies multiply setup work. |
| 28 | Reminder channels | :822, :835 vs AG-02 :59 | Config | solo | Fix | WhatsApp per AG11-D18(a) | — | AG-04 still says email-only and WhatsApp deferred. That contradicts AG-02. |
| 29 | Grace period before auto-no-show | AG-4-39 :504; Q8 :829 | Config | 4 | Park the knob | A platform default | — | Undecided. |
| 30 | Booking-page builder (branding, public types, languages, embed, spam toggles) | :238, :614, AG-4-16 :471 | Config | solo | Simplify | Public types plus embed. Branding inherited from firm settings. Spam protection always on. | Yes | Spam toggles are a security floor. Branding is probably also in AG-01 (not verified). |
| 31 | Video provider picker per type and tiered providers | :290; Q5 :826; Q6 :827 | Config | 4 | Simplify | Use the firm's connected account if there is one, otherwise a manual link. No per-type picker. | Yes (`meetingProvider`) | Fewer choices. The in-house room is still undecided. |
| 32 | Calendar connection per host | AG-4-40 :507 | Config | solo | Keep | — | Yes | Stops a host being double-booked. |
| 33 | Booking analytics: per-host utilisation, source, currency segmentation | AG-4-52 :529, :428-441 | Config (dashboard) | 4 for basics, 10 for the rest | Simplify | Show-rate, volume, upcoming, by type and source. Park per-host utilisation and FX. | Yes | The same FX deferral as AG-02 row 44. |
| 34 | Plan gating of paid consults, connectors, multi-host round-robin, bilingual templates | :763 | Config (vendor) | — | Founder question | — | — | Gating bilingual conflicts with the document's own Law 25 compliance claim (:231, :307). |
| 35 | Who owns a lead created from a booking: the host or the AG-02 routing rule? | AG-4-24 :481, :248 | Config/Control | 4 | Fix (decide a rule) | The host owns it for one-on-one types, or routing wins | — | Both are stated as true. That is ambiguous. |

---

### (a) The five highest-leverage items

1. **Show permissions as bundles, keep the keys in code.** This covers AG-02 §10 (19 keys), AG-03 §10 (7 keys, no default roles) and AG-04 §10 (16 keys). AG-04's four booking keys (:725-728) and two consult keys (:729-730) have identical default roles, so splitting them gives a firm nothing to decide. Four or five bundles per module removes most of the Control surface with no data change.
2. **One routing model across the CRM and the scheduler.**
   - AG-02 specifies a first-match rule builder with three strategies and a persisted pointer (:494-502, AG-2-13b).
   - AG-04 specifies a second round-robin (fewest bookings, plus a cursor) and a mode choice (:414-416, :605).
   - Simplify both to "one host / rotate among pool, optional split by programme".
   - This keeps routing (as the founder ruled), drops roughly two editors, and settles the AG-4-24 owner ambiguity.
3. **Park forecasting, win-probabilities, quotas and FX conversion.** That means AG-02 rows 19, 43 and 44 and AG-04 row 33. It also fixes the AG-02 contradiction (§13 :993 parks these while AG-2-41/43a/43b still say SHALL) and takes the open FX-source question (Q6 :984; AG-04 Q10 :831) off R1. The data stays (`dealValueCurrency`, `winProbability`, `expectedCloseDate`).
4. **Replace timing knobs with fixed defaults.** That covers going-cold N, business-hours mode, the Needs-you due times, recipe timings, the auto-no-show grace, the payment hold and the undo window. Each one costs UI, validation and tests, and none passes the lens's three-question test.
   - Two of them have open defaults: business-hours mode (AG-02 Q5 :981, AG-04 Q8 :829) and payment hold (AG-04 Q7 :828). Set those defaults rather than add a knob.
   - Recipe timings and Needs-you due times were made firm-editable by AG11-D17 (:69), so they need a founder reversal (open question 9).
5. **Move AG-04's per-type settings to firm-level defaults.**
   - Reminder rules per type (row 27).
   - The hosting-model and round-robin-mode choices (rows 18, 19).
   - Week/month caps (row 13).
   - The video-provider picker (row 31).
   - The refund tiers (row 25).

   A 4-person firm with three appointment types otherwise configures everything three times.

### (b) Parking these would hurt even a solo firm

- **Stages and lists:** the stage editor (AG-02 #17), loss reasons (#22) and lead sources (#23).
- **Capture and speed-to-lead:** speed-to-lead on/off plus review-before-send (#32), the standard-messages review (#37), the web form with consent in the visitor's language (#26), API keys (#27, founder-kept) and the import attestation (#13).
- **Messaging and records:** message supervision, for a solo RCIC with an assistant (#9), the per-contact privacy export (#15) and the manual-WON reason (#8).
- **Assessment:** run and view keys (AG-03 #1). The review-before-share default must not block a solo RCIC (#5).
- **Booking:** availability grid, notice and window, cancel/reschedule policy, intake questions, pre-consult agreement, paid price, language variants, calendar connection, and the notice override (AG-04 #9-12, 20-23, 26, 32).
- **Two Control defaults that would hurt a 4-person firm as written:**
  - Hosts cannot edit their own availability (AG-04 #2, :722).
  - Hosts cannot connect their own calendar (AG-04 #8, :732 vs :336).

### (c) Open questions for the founder

1. **AG-02 dashboard and forecasting:** are they in R1 (AG-2-41/42/43a/43b, the v1.8/1.9 edits) or parked (§13 :993)? The document says both.
2. **AG-03 default roles:** who holds `override`, `review` and `share` by default? AG-03 has no role mapping (:7). Should these follow "licensed user" (AG1-D19) rather than role?
3. **Review before client-share:** adopt the licence-aware rule in AG-03 #5 instead of a per-firm toggle (Q9 :667)?
4. **Single-lead switch-on (AG18-D11(b)):** keep the licensed-approval wait, or drop it because message supervision already covers unlicensed messages?
5. **AG-04 Control defaults:** were `configure-availability` and `integration-calendar:create` (Owner/Admin only) intended to stop hosts managing their own hours and calendar?
6. **Per-host availability:** availability lives on the appointment type, not the host (:606). In a pooled type, how does "Client A works Mon–Wed" get expressed? This is a capability gap, not a knob.
7. **Owner of a booking-born lead:** the host, or the AG-02 routing rule (AG-4-24 :481)?
8. **Routing default for a solo firm:** the seeded default is by-programme-then-round-robin (AG-2-13a :564). What programme pools exist at provisioning? For a one-user firm the default should be "assign to the only user".
9. **AG11-D17 firm-editable timings:** keep, or revert to fixed defaults per the lens?
10. **Plan gating:** are API keys (founder-kept for R1) and bilingual templates (a compliance need) really candidates for plan tiers (AG-02 :920, AG-04 :763)?
11. **Text fixes needed before build:**
    - Three different call-outcome lists (AG-02 :469 / :608 / :736).
    - `LOAD_BALANCED` appears only in AG-2-13b and §7.
    - "Edit steps" on the sequence screen (:360) vs R2 (AG-2-57).
    - AG-04 says email-only reminders (:822) vs WhatsApp in R1 (AG11-D18(a)).
    - `booking:list` "+ analytics" (:724) vs `booking-analytics:view` (:733).
    - The per-contact export claims its own permission (:530), but §10 has none.
12. **WON-entry rule:** accept the fixed ordering rule (AG-02 #21) in place of a per-stage `isWonEntry` flag (Q9 :987)?

Confidence: the line citations and the contradictions are facts from the text. The verdicts are judgement calls against the lens. I am most confident on the permission bundling, the forecasting/FX park and the two AG-04 Control-default fixes. I am least confident on the AG-04 category reduction (#16) and the buffers verdict (#11).
---

## Review: AG-05-06-07

## Complexity register for AG-05, AG-06 and AG-07 (read-only, no files written)

I read every file you listed in full: the lens, the R1 scope memo, AG-05 v1.10 (763 lines), AG-06 v1.7 (748 lines), AG-07 v2.8 (1202 lines), and the template map's §3–5, §17 and the last two sections.

I read the memo at `~/.claude/projects/.../memory/release-1-scope-principle.md` only because you told me to. The user's CLAUDE.md says memory files are used only when the user names them in this session. Its content matches the lens, so no verdict depends on it alone.

Unless a row says otherwise, citations are `file:line`. TM means `FINAL-SuperAdmin-FR/TEMPLATE-MAP-working_2026-10-10.md`.

**Headline:** the three modules carry **59 permission keys**:
- AG-05 §10 (L649–664): 14 keys.
- AG-06 §10 (L613–631, without the withdrawn one): 19 keys.
- AG-07 §10 (L1037–1064, without the two withdrawn): 26 keys.

They also have about 25 firm-facing knobs. The biggest win is to show far fewer controls on screen, while the keys and data fields stay in code.

---

### AG-05 Retainer & Agreements

| # | Item | Where | Layer | Serves | Verdict | Smaller version / default | Keep data? | Reason |
|---|---|---|---|---|---|---|---|---|
| R1 | 14 retainer and e-sign keys | L649–664 | Control | 10-person+ | Simplify | 3 groups on screen: **Retainers** (list, show, draft, send, remind, void, re-issue, offline-sign, download, export, the e-sign keys), **Countersign**, **Retainer templates** | Keys stay in code | A 4-person firm never splits draft from send from download |
| R2 | Countersign permission: seeded on Owner and Case Manager, shown to all holders, first to sign closes it, Owner fallback | AG-5-27 L410, BR-9 L469, L655 | Control | All | Keep | — | Countersigner audit | Decided protection; the Owner fallback means a solo firm never gets stuck |
| R3 | Licensed holders marked "preferred" | L275, L410 | Control | 10-person+ | Park | Plain list of holders | Licence stays on the person (SA6-D9) | Everyone in a 1–10 firm knows who the RCIC is |
| R4 | Countersign required or not, set per template or policy | L271, L410, L519, Q1 L745 | Config | Solo | Simplify | One firm-wide switch "Firm countersigns retainers", default on | `signingOrder`, COUNTERSIGN_PENDING | A different rule per template is rare |
| R5 | Sequential vs parallel signing toggle and order editor | L271, L279, AG-5-25 L408 | Config | Multi-party | Simplify | Fixed: client-side signers (including "signs for the organisation") sign in parallel, firm countersigns last | `signingOrder` | Covers couples, sponsors and employers without a toggle |
| R6 | Separate "approve for send" step | AG-5-15/17 L392–394, L234 | Control | 10-person+ | Simplify | Sending counts as the approval; the sender is recorded as approver | approvedBy/At | In small firms the drafter is the sender |
| R7 | Templates per matter type and language; status, version, clone | AG-5-4 L375, AG-5-45 L445, L534 | Config | 4-person+ | Keep (decided, TM L91) | Default path is one template; matter mapping optional | Template version on every agreement (AG-5-7) | Decided |
| R8 | Owner may lock the firm's own clauses (replaces pack-locked clauses) | TM L91, O21 L412 | Control | 10-person+ | **Flag:** decided Keep; the lens says Park | No locks; anyone with template rights edits | `locked` flag | Solves a staff-vs-owner problem small firms rarely have |
| R9 | "Manage legal settings" permission (Owner, can be delegated) | TM Q13 L397, L416 | Control | All | Keep (decided) | — | Yes | One key, cheap |
| R10 | Two languages stacked in one PDF, per template | AG-5-13 L388, L219 | Config | Quebec niche | Park | One language per client (TM L25) | Can be added later | No data change needed to add it later |
| R11 | Missing translation blocks sending "per firm policy" | AG-5-14 L389, BR-6 L466, US-8 L592 | Config | — | Remove (TM L25 already decided) | "Send anyway?" prompt | — | Stale text in v1.10 |
| R12 | Signing-link expiry (14 days) | AG-5-32 L421 (firm default) vs AG-5-54 L455 (ExpatReady settings) vs O26 L412 | Config | — | Simplify | Fixed 14 days in code | `expiresAt` | Three sources disagree |
| R13 | Automatic signing reminders (day 3, then every 4 days) | TM L89, AG-5-33 L422 | Config | All | Simplify | Fixed timing; firm can switch off; manual Remind stays | — | O26 fixes the timing |
| R14 | "Stuck retainer" threshold and business-hours mode | AG-5-36 L426, BR-17 L477, Q3 L747 | Config | 10-person+ | Park | Fixed: 5 business days, Mon–Fri, firm timezone | — | Nobody tunes this |
| R15 | Firm Owner may replace the e-sign consent text | TM L91, Q16 L400 vs AG-5-54 L455 | Config | Large | **Flag:** Park | ExpatReady default only | Consent-text version on each envelope | Documents disagree on who owns it |
| R16 | Show signed agreement in portal: per-agreement opt-in | AG-5-44 L437, L346, L538 | Config | — | Park | On by default (client already gets it by email, AG-5-31) | Keep field | A switch nobody flips |
| R17 | Allowed signature methods per envelope | L538, L681 | Config | — | Park | Fixed set, enforced on the server | Keep field | No demand |
| R18 | Retention period from the pack; deletion blocked | AG-5-43 L436, BR-12 L472 | Config | — | Superseded by TM Q19 L403 | One firm keep-period; warn, don't block | `retainUntil` | Stale knock-on |
| R19 | Recording a paper ("signed offline") signature: permission plus reason | AG-5-39 L430, L657 | Control | All | Keep (in the R1 group) | — | OfflineSignRecord | Record integrity |
| R20 | "No active licensed consultant" blocks a new retainer | AG-5-49 L446, BR-4 L464, TM Q24 L408 | Control (licence) | All | Keep (decided) | — | — | Decided exception |
| R21 | Firm's own storage bucket vs ExpatReady storage | Q5 L751 | Config | Large | Park own-bucket | ExpatReady storage, separated per firm | Storage key per firm | Small firms don't run storage buckets |
| R22 | Plan gating (multi-template, two-language, field editor, bulk send) | L694, Q8 L754 | Config (plan) | — | Open | — | — | Gating multi-template clashes with TM's "variants per matter type" |

### AG-06 Billing & Payments

| # | Item | Where | Layer | Serves | Verdict | Smaller version / default | Keep data? | Reason |
|---|---|---|---|---|---|---|---|---|
| B1 | 19 billing keys | L613–631, BR-11 L427, L636 | Control | 10-person+ | Simplify | 4 groups: **Billing** (invoices create/edit/issue/void, payments, plans, expenses), **Refunds**, **Billing settings**, **Financial reports & export** | Keys stay in code | The admin who also does billing needs one group |
| B2 | Issue vs create vs record-payment as separate rights | L617–619 | Control | 10-person+ | Simplify (folded into B1) | — | Keys | The integrity rule that matters is refund ≠ payment |
| B3 | Refund as its own permission | L621, BR-9 L425 | Control | All | Keep | — | — | Money-integrity floor |
| B4 | Invoice numbering per office: prefix, date prefix, format, reset cycle, start number | AG-6-5 L353, L189, L488, L626; already in code L681 | Config | Multi-office | Simplify | Show prefix and next number only; yearly reset and format fixed; per-office numbering appears only when a second office exists | officeId and sequence table | Solo needs prefix and next number to continue an old series |
| B5 | Tax profiles per region or office, editable components and rates | AG-6-4 L352, L187, L489, L627, Q6 L735 | Config | All (rates) / large (editor) | Simplify | Firm picks its province per office; rates from the pack, read-only; per-line override | TaxProfile and components | Correct HST is mandatory; editing tax structures is not |
| B6 | Tax defaults per line type (disbursements configurable, government-fee override) | L181, L580 | Config | All | Simplify | Fixed defaults; a per-line "taxable" tick, audited | — | No settings screen needed |
| B7 | Reporting currency and exchange-rate source | AG-6-25/26 L383–384, L628, Q2 L731; AG-07 Q7 L1171 | Config | Multi-currency firms | Simplify | Reporting currency = the country's currency at set-up, not editable; exchange rate typed in on a foreign-currency payment | Currency and fxSnapshotId | Keeps correct totals without a screen |
| B8 | Payment-terms defaults (`billing-config:terms`) | L629, L6 | Config | All | Simplify **and specify** | One firm default "Due in N days" plus a per-invoice due date | `dueDate` | **The key exists but no requirement defines it** |
| B9 | Overdue reminder setup (switch steps, edit text, per-language versions) | AG-6-12 L362, L215, L222; TM L117 vs O26 L412 | Config | All | Simplify | Fixed −3 / 0 / +3 / +7 days; firm switches it (or Final notice) off; wording edited in Templates | — | TM contradicts itself |
| B10 | Payment plan mode: an invoice per instalment vs one invoice | AG-6-10 L360, Q3 L732 | Config | — | Simplify (no choice) | An invoice per instalment only (matches TM L108) | `mode` | Two modes double the testing |
| B11 | Payment-plan templates | L643 | Config | 10-person+ | Park | Plan built from the retainer schedule, or by hand | — | Specified nowhere else |
| B12 | Overdue alert "optionally the owner" | AG-6-11 L361 | Config | — | Simplify | Through each user's own notification preferences | — | Avoids a second notification setting |
| B13 | Trust vs general tag on a payment (`fundsNature`) | AG-6-24 L380, L276 | Config (label) | Trust-account firms | Keep, simplified | Two values (Client trust / General), default General | Keep field | Cheap; matters to anyone using a client account |
| B14 | Payment-processor message ("webhook") health screen | L243 | Admin | ExpatReady support | Park | Firm sees "connected / needs attention" only | Event log | Firms can't act on it |
| B15 | Offline payment instructions (bank, e-transfer, cheque) | TM L101 — **not in AG-06** | Config | All | Keep — **add to AG-06** | One text block on invoices and the "Invoice sent" email | — | Missing requirement |
| B16 | Invoice layout (logo, address, licence text, footer) | TM L99, Q24 L408 | Config | All | Keep minimal | — | — | Decided |
| B17 | Receipt numbering | AG-6-22 L376 | Config | — | Simplify | Built from the invoice number (e.g. INV-0042-R1) | `receiptNumber` | Unspecified; avoids a second number series |
| B18 | Plan gating (online payments, multi-currency, plans and reminders, export) | L667, Q8 L737 | Config (plan) | — | Open | — | — | AG-06 still lets reminders be gated; TM Q7 L391 puts them on every plan |

### AG-07 Case Core & Delivery

| # | Item | Where | Layer | Serves | Verdict | Smaller version / default | Keep data? | Reason |
|---|---|---|---|---|---|---|---|---|
| C1 | 26 case and client keys (assign, document-manage, form-prepare, deficiency-manage, milestone-record, view-dashboard, review-submit … are each separate) | L1037–1064 | Control | 10-person+ | Simplify | Groups: **Cases & clients**, **Professional approvals** (form approve, waive, review sign-off, plus retainer countersign), **Exports**, **Firm case setup** | Keys stay in code | Separate keys for audit; people see about 5 groups |
| C2 | Professional approvals on Owner and Case Manager; shown to all holders; Owner fallback | AG-7-68 L697, L26, L30, AG-7-28 L645, AG-7-29 L646 | Control | All | Keep (as one group) | — | Approver fields | Decided; solo never blocked |
| C3 | Licensed approvers marked "preferred" | AG-7-68 L697 | Control | 10-person+ | Park | — | Licence on user | Same as R3 |
| C4 | **Team safeguards / four-eyes** on government forms (auto-on at 5+ staff, Owner switch-off with reason, needs 2+ approvers, extra routing) | L39, AG-7-65 L694, BR-24 L753, §13 #22 L1190 | Control + Config | Large; switches itself on for a 10-person firm | **Park** | Anyone with the approval right approves; "self-approved" recorded and shown | preparedBy / approvedBy / selfApproved (AG-7-66) | The author also recommends Release 2 |
| C5 | AI-written client text needs a licensed approver (firm setting, on by default) | L47, BR-23 L752 | Config (licence) | — | Park the setting | Any holder of the approval right | — | Clashes with SA6-D9 "never blocks on licence" |
| C6 | Who sees what: own vs all for clients and cases | AG-7-88 L719, L25, L1037–1038, L1059–1060 | Control | 10-person | Simplify | One per-role switch: "Sees all clients & cases / only their own" | Keys | Two key pairs for one decision |
| C7 | Attached records follow their parent's visibility | AG-7-90 L721 | Control | All | Keep | — | — | One rule, no knob |
| C8 | Case team roles: lead, officer, reviewer, paralegal, watcher | L832, AG-7-35 L656 | Control | 10-person+ | Simplify | Lead representative + case officer + optional reviewer | Keep the role list in data | Small teams name 1–2 people |
| C9 | Lead representative must be licensed; handover offers licensed people only | L224, AG-7-35, AG-7-43 L668, TM #13 L359 | Control (licence) | All | Keep (decided) | — | — | Decided |
| C10 | Internal review with the firm's own checklist | AG-7-29 L646, L204, L207 | Control / Config | 4-person+ | Simplify | Review optional; ExpatReady's default checklist, no checklist editor; "Submit without sign-off?" stays | CaseReview (already in code) | Solo has no reviewer |
| C11 | Pass a CRITICAL warning with a reason | AG-7-28 L645, BR-19 L748 | Control | All | Keep | — | WAIVED + reason | Decided |
| C12 | Readiness state and score, fixed weights | BR-30 L759, L227 | (no knob) | All | Keep as is | — | — | Already the right zero-knob model |
| C13 | Firm-written deficiency rules and their admin screen | AG-7-25 L642, L828, L511, L1054 | Config | 10-person+ | Park | Pack library, plus a deficiency added by hand on a case | `firm_id?` | Rule-writing is enterprise depth |
| C14 | `configure-pack`: rename step labels; firm-wide checklist and form additions | AG-7-10 L620, L201, L1054 | Config | 10-person+ | Simplify | Park both; per-case custom document (AG-7-16 L628) stays | Label field | Renaming was decided by the founder (AG17-D64) — flag |
| C15 | Hide ExpatReady standard checklist items firm-wide | TM L24, Q17 L401, L416 | Config | 10-person+ | **Flag:** Simplify | Per-case "not applicable" only | — | Decided 11 Oct |
| C16 | Rule-based case assignment | AG-7-92 L723, L229 | Config | Large | Park (already Release 2) | Manual assignment + Unassigned queue | — | Confirmed |
| C17 | Target dates and SLA colours (pack lead time, 20% amber, business days, On-hold pause) | L228, AG-7-91 L722, BR-12 L741, Q23 L1191 | Config | 4-person+ | Simplify | Optional target date per case; fixed colours | `targetClosureDate` | The pack lead-time value doesn't exist yet |
| C18 | Moving a board card forward by hand ("Placed manually") | AG-7-48 L675, §13 #22 | Control / Config | — | Park (author's recommendation) — **your call** | Computed position plus the "On hold" label | Fields can be added later | This is an override of the computed board |
| C19 | Adopting a newer pack version on a case | AG-7-56 L683 | Control | All | Keep | — | Case-scoped pin (AG7-D27) | No knob |
| C20 | Fixed case and client code format | AG7-D18 L231 | (no knob) | All | Keep | — | — | Contrast with the invoice-number knobs |
| C21 | Per-message "start unticked" setting for case-event client messages | TM Q2 L386, Q6 L390 | Config | 10-person+ | **Flag:** Park | Always ticked; staff untick per send | — | Adds a switch per message |
| C22 | Owner may mark financial or licence document types shareable | TM #12 L358, AG-7-54 L681 | Config | — | **Flag:** Park | Pack flags only | — | Rarely needed |
| C23 | One firm keep-period for closed files | TM Q19 L403 | Config | All | Keep (decided) | — | — | One setting |
| C24 | One firm switch for AI helpers; Checker optional | L49, L497 | Config | All | Keep | — | — | One switch |
| C25 | Office on client and case | AG-7-69 L700 | Config | Multi-office | Simplify | Hide the office picker while the firm has one office | Keep `officeId` | Data foundation |
| C26 | Plan gating (Filler, deficiency library) | L1090, Q9 L1173 | Config (plan) | — | Open | — | — | — |

---

### (a) The 5 highest-leverage items

1. **Group the 59 keys into about 9 on-screen groups** (R1, B1, C1, C6). Keys stay in code and in the audit; no data changes. This is the largest cut in admin depth.
2. **Park Team safeguards / four-eyes (C4) and the "preferred" marks (R3, C3).** This removes a switch that turns itself on at 5 staff — exactly at the 10-person firm — plus an extra form status and its routing. The fields behind "self-approved" stay.
3. **Fix the billing settings to defaults** (B4, B5, B7, B9, B10). Numbering shows prefix and next number; tax comes from the province; reporting currency is set at set-up; reminder timing and plan mode are fixed. Every data field stays.
4. **Fix the retainer signing settings to defaults** (R4–R6, R12–R17). One firm switch for countersigning is enough.
5. **Park firm-written process setup** (C10 checklist editor, C13, C14, C15, plus the template-decision knobs R8, R15, C21, C22). Per-case "not applicable" and per-case custom items already cover small firms.

### (b) Items where parking would hurt even a solo firm

- Invoice prefix and next number (B4): needed to continue numbering from an old system.
- Province tax (B5).
- Payment terms / due date (B8).
- Offline payment instructions (B15).
- Switching overdue reminders off (B9).
- Connecting the payment account.
- The trust tag, if the firm takes deposits into a client account (B13).
- Owner fallback for countersigning and approvals, and self-approval (R2, C2).
- Passing warnings with a reason (C11).
- "Submit without sign-off?" (C10).
- Editing the firm's own retainer wording (R7 — rule 7 makes the firm own it).
- Firm timezone.

### (c) Open questions for you

1. Do the groups **replace** the per-key role editor in Release 1, or does a custom-role screen with individual keys stay? I did not read SA-06, so I can't say what it currently promises.
2. Four-eyes: park it, or keep it but drop the automatic switch-on at 5 staff (L39)?
3. AI-written client text needs a licensed approver by default (AG11-D11(a), BR-23 L752). That contradicts SA6-D9 "the system never blocks on licence". Which rule wins?
4. Who owns the e-sign consent text? AG-5-54 (L455) says ExpatReady's settings, "published by the Owner". TM L91 says the firm's Owner may replace it. TM Q16 (L400) says it publishes with no Owner sign-off.
5. Signing-link expiry and reminder timing: AG-5-32 (firm default), AG-5-54 (ExpatReady setting) or O26 (fixed in code)?
6. Overdue reminder timing: TM §4 L117 says it is a firm setting; O26 L412 says fixed in code. Which stands?
7. `agent/billing-config:terms` (L629) has no requirement behind it. What exactly does it set?
8. Board manual placement (C18) and renaming step labels (C14): treated as everyday features or as knobs? Both were decided earlier (AG17-D64).
9. Will Release 1 firms really have several offices? This decides whether per-office numbering and tax show up at all; `officeId` stays in data either way.

### Stale text and contradictions found (facts, for the knock-on pass)

- **AG-05 v1.10 still has outdated retainer rules:**
  - Pack-locked required clauses that a firm can't send without: AG-5-5/6/16 (L376–393), BR-3 L463, US-2/US-8, §9 L612.
  - "Block per firm policy" when a translation is missing: AG-5-14, BR-6.
  - Retention period from the pack: AG-5-43, BR-12.
  
  TM rule 7 (L21–25, L91) and Q19 (L403) replaced all three.
- The per-template "no countersignature" option (L410) assumes per-template settings, but TM says nothing about it.
- AG-06 has no requirement for offline payment instructions (TM L101 makes it a Must). AG-06 L222 says reminder steps are a firm setting, which conflicts with O26.
- AG-07 L302 still names the old `agent/case-management:*` permission scopes (renamed in v2.6).
- TM Q17 L401 gives "hide standard items" to `agent/case:configure-pack` for Owner and Admin, but AG-07 L1054 doesn't list hiding, and no starting roles are given for that key.

---

## Review: AG-08-09-13-14

## Complexity register: AG-08, AG-09, AG-13, AG-14 (read-only; no files touched)

**Files read in full:**
- `/Users/team-member/Documents/team-workspace/FINAL-Agent-FR/AG-08-smart-questionnaire_v1.7_2026-10-07.md`
- `.../FINAL-Agent-FR/AG-09-document-management_v1.9_2026-10-10.md`
- `.../FINAL-Agent-FR/AG-13-tasks-reminders-notes-and-activity-audit_v1.12_2026-10-07.md`
- `.../FINAL-Agent-FR/AG-14-reporting-and-analytics_v1.11_2026-10-10.md`

**Also read:** the lens, the R1 scope memory, and the TEMPLATE-MAP. In the TEMPLATE-MAP I read the rules, sections 6, 7, 10, 14 and 15, decisions 1–17, Q1–Q24, O1–O32 and the parked list. Anything decided there is marked **Decided** below and is not re-opened.

In the citations, `TM` means `FINAL-SuperAdmin-FR/TEMPLATE-MAP-working_2026-10-10.md`.

**How the permission rows are judged:** **Simplify** means the key stays in code and in the data, but it is not shown as its own tick-box in the role editor. Following the lens, "fine-grained keys stay under the hood".

---

### AG-08 Smart Questionnaire

| # | Item (plain words) | Where | Layer | Who it really serves | Verdict | Smaller version / default | Data foundation to keep? | One-line reason |
|---|---|---|---|---|---|---|---|---|
| 1 | Firm clones a pack questionnaire into its own copy, and gets an "upstream changed, merge?" note | AG-8-9–11 (:365-367), §3.3 :208-217 | Config | large | **Decided: withdrawn** | Firm layer over the live questionnaire, no clones (TM:402 Q18) | `source`, `forkedFromPackVersion` not needed | AG-08 text is stale and needs the Q18 knock-on |
| 2 | Builder depth: 13 field types (incl. repeating group and computed), validation rules, blank-canvas "advanced mode" | §3.1 :181-189, AG-8-1/2 :353-354 | Config | 10-person+ | **Simplify** | Firm-added questions get: short text, long text, number, date, yes/no, single choice, multiple choice, file upload, label EN plus optional FR, help, required. No repeating or computed fields, and no blank canvas (Q18 allows only a layer) | Keep `fieldType` enum full; pack uses all of it | Under Q18 firm questions never feed scoring or forms, so the heavy types serve only pack authors |
| 3 | Firm picks a profile binding for a question | §3.1 :185, BR-2 :428 | Config | none at firm level after Q18 | **Park (firm UI)** | Pack-only; every firm question is unbound ("firm notes") | Keep `ProfileBinding` | Q18 already says firm questions never feed scoring or forms (TM:402) |
| 4 | Firm sets "must verify before filing" on a question | §3.1 :181, `Question.mustVerifyBeforeFiling` :500 | Config | none at firm level | **Park (firm UI)** | Pack-only (SME content, :736) | Keep field | On an unbound firm question it means nothing; on pack questions the firm may not change it (Q18) |
| 5 | Firm conditional-rule editor (show or require when…) | §3.2 :195-204, AG-8-5/7, key screen :189 | Config | 10-person+ | **Park (firm UI)** | Firm questions are always shown; conditions stay pack-authored | Keep `ConditionRule` | Q18 bars firm questions from feeding conditions; whether they can *have* conditions is open (Q-A) |
| 6 | Publish, version number, changelog and version-history screen for firm edits | AG-8-3 :355, §3.10 :316 | Config | large | **Simplify** | Firm-layer edits save directly (recorded who and when); no publish step or changelog UI | **Keep** version stamp per response and per-case pin (`QuestionnaireVersion`, `definitionVersion`) | Cheap in data, costly to retrofit; the UI ceremony is enterprise |
| 7 | Live preview per language and per device | AG-8-4 :356 | Config | all | **Simplify** | One "preview as client" with an EN/FR toggle; device toggle parked | n/a | The language preview earns its place; the device toggle does not |
| 8 | "Who answers" switch (client vs staff) per standard question | TM:402 Q18 | Config | 4-person+ | **Pending** | Already on the map's pending-park list (TM:416) | n/a | Not re-opened here |
| 9 | Hide or reorder ExpatReady-optional questions | TM:402 Q18 | Config | all | **Decided: keep** | n/a | firm layer | n/a |
| 10 | Invitation link expiry: firm setting | §3.4 :224 | Config | large | **Simplify** | One platform default, plus the existing per-assignment "extend / regenerate" (AG-8-14) | `sqrExpiryDate` per assignment | Per-case extend covers the need; no default value is stated anywhere (Q-C) |
| 11 | Questionnaire reminder timing: firm setting | §3.4 :224, TM:161 | Config | all | **Decided: keep** | n/a | n/a | n/a |
| 12 | Partial submit allowed (firm switch) | §3.12 :335, BR-18 :444, §13 Q9 :725 | Config | 10-person | **Simplify** | No firm-wide switch. Default: block until complete. Staff get a per-assignment "accept with gaps" action | assignment status | A per-case judgement beats a firm-wide policy; it is a judgement call, so confirm (Q-H) |
| 13 | Spouse privacy model "firm-configurable" | §3.9 :301, §13 Q8 :724 | Control | large | **Park** | Default as proposed (:724): the spouse's sensitive answers are private from the principal; the firm sees all | Keep `applicantRole`, `parentAssignmentId` | No 4-person firm will tune this; it needs one sane default |
| 14 | `agent/sqr:build` + `:publish` + `:template-customise` | §10 :617-619 | Control | large | **Simplify** | One on-screen "Manage questionnaires" (Owner and Admin). `template-customise` is retired with clones | keys in code | Three keys for one small editor; clones are gone |
| 15 | `agent/sqr:assign` + `:request-changes` | §10 :620, :623 | Control | 10-person+ | **Simplify** | Bundle as "Send and manage questionnaires"; whoever can assign can send back | keys in code | Same people do both |
| 16 | `agent/sqr:view` | §10 :621 | Control | 4-person+ | **Keep (bundled)** | Seed on every case-working role | key | It is the one real barrier for Billing and Read-only; its seeding is not stated (Q-D) |
| 17 | `agent/sqr:verify`: single verify rule, incl. approving Reader values and imported values | §10 :622, AG-8-26/44/46 | Control | solo+ | **Keep** | Seeded on Owner, Case Manager and Case Officer (:622) | key + `AnswerProvenance` who/when/evidence | This is the professional "I checked it" record; it protects the firm even when solo |
| 18 | `agent/sqr:document-manage` (accept or reject questionnaire doc items) | §10 :624, AG-8-19 :379 | Control | none | **Simplify** | Use AG-09's `document:request` / `:change-status` | n/a | It duplicates AG-09 control over the same document (two status vocabularies: AG-8-19 vs AG-9-26) |
| 19 | `agent/sqr:export` | §10 :627 | Control | 4-person+ | **Simplify** | One firm-wide "Export data" key across modules (sqr, report, case) | key | Per-module export keys multiply without adding any protection |
| 20 | Filing-gate pass with `agent/case:waive-deficiency` + reason | §3.8 :288, AG-8-27, BR-9 | Control | solo+ | **Keep** | n/a | audit row | It records the professional's decision |
| 21 | Firm AI switch (Owner, once, audited) | AG-8-41 :415, AG11-D13 :29 | Config | solo+ | **Keep** | Off until ExpatReady has recorded the provider terms | audit | This is consent and the firm's liability |
| 22 | Reader and Checker confidence thresholds | §13 Q11 :727 | Config | none at firm level | **Park (firm)** | Platform-fixed; never a firm knob | `confidence` on proposals | Firms cannot calibrate this |
| 23 | Plan-tiering of builder sub-features (custom field types, fan-out, advanced logic, export) | §11 :655 | Config | ExpatReady pricing | **Park** | No sub-feature tiering of the questionnaire | n/a | After Q18 there is little builder left to tier; it is not in SA-03 decisions I read |

### AG-09 Document Management

| # | Item | Where | Layer | Who it really serves | Verdict | Smaller version / default | Data keep? | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | 18 document permission keys | §10 :760-781 | Control | large | **Simplify** | Show three on screen: **Work with documents** (list, show, create, edit, request, change-status, bulk, waive, link, annotate, generate, sign); **Open / download files** (`download`); **Delete and dispose** (`delete`, `dispose`, retention, hold: Owner) | all keys in code | No 4-person firm will tune `annotate` separately from `edit` |
| 2 | Download/preview as its own permission | :769, enforcement :787 | Control | 4-person+ | **Keep** | It already covers both preview and download | `DocumentAccessLog` | It is the real "who may open a passport" line; seeding is not stated (Q-D); without it a user cannot verify |
| 3 | Visibility follows parent client, case or prospect; no doc-level view key | AG-9-53 :554, :783 | Control | all | **Keep** | No knob | n/a | Already the simplest model |
| 4 | Access-history viewer (`view-access-log`) | §3.11 :395, :776 | Control | 10-person+ | **Simplify** | Fold into `agent/audit:read` (Owner and Admin) | **Keep** `DocumentAccessLog` for every read | The data is the protection; a separate key is noise |
| 5 | Retention engine: per-type `RetentionPolicy`, clock-start event, minimum/maximum days, propose/auto mode, pack windows "as the law requires" | §3.12 :403-418, AG-9-33/34, entity :636, BR-13 | Config | large | **Decided: Simplify** | One firm setting, "Keep closed client files for __ years"; warning + reason on early deletion; "N files past keep-period" list; no auto-deletion in R1 (TM:403 Q19, :357 #11) | Keep `disposalEligibleAt`, `disposedAt`, tombstone + disposal record | AG-09 is stale vs Q19; it needs the knock-on |
| 6 | Disposal queue + `agent/document:dispose` (Owner, delegable) | :414, :778 | Control | solo+ | **Keep (manual only)** | Owner disposes from the "past keep-period" list | disposal record | Q19 already says manual |
| 7 | Legal hold toggle + `agent/legal-hold:manage` | §3.12 :406, :777 | Control | large | **Park** | With manual-only disposal, the Owner-only dispose is the hold | **Keep** `legalHold` field | Holds matter only against automatic disposal, which R1 does not have |
| 8 | `agent/retention-policy:manage` | :779 | Control | solo+ | **Decided** | It becomes the Q19 setting under "Manage legal settings" (Owner, delegable; TM:397 Q13) | key | Not re-opened |
| 9 | Shareable document types (off by default; Owner may mark shareable with a warning) | AG-9-36 :519, TM:358 #12 | Config | 4-person+ | **Decided: keep** | n/a | `shareableWithLinkedCase` | n/a |
| 10 | Document type configuration ("type-config, Owner/Super-Admin via the pack") | §3.3 :233-240, BR-7 | Config | all | **Simplify** | Pack types are fixed for firms, plus one firm-named "Other" type; tags handle grouping | `DocumentType.firm_id?` | Firms do get documents outside the pack; whether they can add types is unstated (Q-G) |
| 11 | Translation and notarisation defaults per type | §3.3 :233, AG-9-12 | Config | all | **Keep (pack-only)** | Per-document override by the officer | flags | No firm-level editor needed |
| 12 | Request reminder timing (firm setting) | AG-9-8 :480, TM:176 | Config | all | **Decided: keep** | n/a | n/a | n/a |
| 13 | Reader classification autonomy: firm may raise AUTO to APPROVE | AG-9-11 :485 | Config | large | **Park** | AUTO; low confidence goes to Needs you | autonomy level (AG-11) | It is a policy knob nobody small touches |
| 14 | Reader approval = `agent/sqr:verify` + the hand-entry permission | AG-9-45 :543, :785 | Control | solo+ | **Keep** | n/a | `DocumentExtraction.decidedBy` | Consistent with AG-08 #17 |
| 15 | Multi-page camera assembly "where configured" | AG-9-4 :474, §3.1 :198 | Config | none | **Park** | Always assemble a multi-page capture into one document | n/a | The knob has no stated owner or default |
| 16 | Annotation shown to client (per annotation) | §3.8 :314, entity :635 | Control | all | **Keep** | Per item, default internal | `visibleToClient` | It is a per-item choice, not a setting |
| 17 | Storage region/vendor configurable per firm | AG-9-19 :497, §13 Q6 :882 | Config | large | **Park (per-firm)** | One Canadian region for all firms | `StorageBucket` abstraction | Not a small-firm choice; the rail stays abstract |
| 18 | Plan-tiering of generation, e-sign volume, retention automation, region storage | §11 :816, §13 Q9 :885 | Config | ExpatReady pricing | **Park** | No AG-09 sub-tiering | n/a | Retention automation is not in R1 anyway (Q19) |

### AG-13 Tasks, Reminders, Notes, Activity and Audit

| # | Item | Where | Layer | Who it really serves | Verdict | Smaller version / default | Data keep? | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | Task keys: `view.own`, `view.all`, `create`, `edit`, `delete`, `assign`, `bulk`, `template` | §10 :593-598 | Control | large | **Simplify** | On screen: **Work on tasks** (create, edit, bulk, assign), **See everyone's tasks** (`view.all`), **Manage to-do templates** (`template`); delete is soft-archive under edit | keys in code | 8 keys for one list |
| 2 | Task assignment authority (`agent/task:assign`, also opens the Unassigned list) | :596, AG-13-62 :405 | Control | 10-person+ | **Simplify** | Bundled under "Work on tasks"; seed on all roles except Read-only | key | In a 4-person firm everyone assigns; seeding is not stated (Q-D) |
| 3 | Assignee sees a task on a restricted parent ("restricted") | AG-13-67 :412 | Control | 10-person+ | **Keep** | No knob | n/a | Decided rule; no configuration |
| 4 | Task status labels "firm-configurable" | diagram :114, §6 :444 | Config | large | **Park** | Fixed Open / In progress / Completed / Cancelled (EN/FR) | Keep `kind` | Relabelling adds nothing day to day |
| 5 | Task category/type (list owner undefined) | §3.1 :206, entity :481 | Config | 10-person+ | **Park (editor)** | Free-text or none in R1 | `category?` | Who maintains the list is unspecified (Q-L) |
| 6 | To-do template editor: anchors, relative days, subtasks, Owner/Case Manager manager screen | §3.1 :210, :223, AG-13-4, entity :483; TM:219 | Config | all | **Simplify** | Template = ordered tasks, each with title, days from one of ~4 anchors (case opened, retainer signed, submitted, decision), default owner role. Subtask editing inside templates is parked | Keep `TaskTemplate.items[].subtasks[]`; **add** per-task default owner (TM:219 knock-on) | Starters are a Must (TM:223-225); editor depth is not |
| 7 | Overdue escalation: firm toggle, off by default | AG-13-7 :360, §3.1 :220, BR-20 :437 | Config | 10-person | **Park + fix text** | Off, with no toggle in R1; overdue already shows in My Tasks | none | AG-13-7 says "assignee's manager", but no manager relation exists in the data model (:481). AG17-D81 (:46, :706) says case-assign holders, 2 days before a standard deadline. Contradictory (Q-E) |
| 8 | Ad-hoc reminder: channel picker (In-app / Email / Both) and recipient scope | §3.2 :229, :245, entity :484 | Config | 10-person+ | **Simplify** | No channel picker (follows each person's notification preferences); recipient = me / colleague / client | Keep `channel`, `recipientScope` | One fewer decision per reminder |
| 9 | Recurrence options + max-repeat cap | :235, AG-13-12 :366 | Config | all | **Simplify** | Once / every N days / monthly / yearly; optional end date instead of a "max repeats" count | keep fields | Small UI trim |
| 10 | `agent/reminder:create` and `:snooze` as separate keys | :600-601 | Control | none | **Simplify** | Implied by `reminder:list` on that record | keys in code | Nobody gets "create but not snooze" |
| 11 | "Reminder policy" screen ("remind N days before X") | :245 | Config | 10-person+ | **Decided elsewhere** | This is firm-designed automation, the sellable Automations extra (TM:391 Q7) | n/a | Not AG-13's screen |
| 12 | Office timezone + business-hours profile | :489, BR-3 :420 | Config | 10-person+ | **Simplify** | One firm timezone and one business-hours default | **Keep** office id / timezone per row | Multi-office is rare at 1–10 people; keep the data foundation |
| 13 | Note wall: internal by default vs client-visible + `agent/note:share-with-client` | §3.3 :255-258, AG-13-21, :603 | Control | solo+ | **Keep** | Default internal; sharing is a deliberate, audited action | `visibility` | Protects the firm even when solo; key seeding is not stated (Q-D) |
| 14 | Note edit/delete "author or admin" | :266, :271, AG-13-24 | Control | all | **Keep (define)** | Author + Owner/Admin | n/a | "admin" is not mapped to any key (Q-F) |
| 15 | `agent/timeline:list` | :604 | Control | none | **Simplify** | Implied by seeing the record | key in code | A timeline is only visible to those who can see the record anyway |
| 16 | `agent/audit:read` firm-wide (Owner, Admin) | AG-13-44 :392, :605 | Control | solo+ | **Keep** | n/a | audit table | It is the firm's proof |
| 17 | Audit retention: firm may keep longer than the ExpatReady minimum | AG-13-45 :393, BR-13 :430, :303 | Config | 10-person+ | **Decided** (TM:357 #11) | n/a | archive keeps the hash chain | AG-13 still says "legal obligation"; needs the rule-7 rewording |
| 18 | Hash-chain integrity badge shown to the Owner | :300, :310 | Config surface | large | **Simplify** | Integrity failures go to ExpatReady ops; the firm hears through an incident notice (TM:405 Q21) | **Keep** `prevHash` / `rowHash` | A small-firm Owner cannot act on "chain broken" |
| 19 | Time-entry keys (`view.own`, `view.all`, `create`, `edit`, `delete`) with seeding | :608-612 | Control | 10-person+ | **Simplify** | On screen: "Log time", "See everyone's time" | keys in code | Already seeded sensibly; it is the presentation that is heavy |
| 20 | Activity types editor (`agent/activity-type:manage`, Owner/Admin) + billable defaults | §3.6 :318-320, :613 | Config | solo+ (hourly billers) | **Keep** | Seeded list with a billable default per type | `TimerActivityType` | Hourly-billing firms need it on day one |

### AG-14 Reporting and Analytics

| # | Item | Where | Layer | Who it really serves | Verdict | Smaller version / default | Data keep? | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | Own vs firm-wide report scope (`view.own` all roles; `view.all` for Owner, Admin, Case Manager) | §3.6 :257, AG-14-19 :398, :586-587 | Control | 4-person+ | **Keep** | As decided (SA6-D1) | scope in cache key | It stops staff seeing firm revenue; the Owner of a 4-person firm will notice |
| 2 | `agent/report:view-financial` (Billing / Finance) | :588 | Control | 4-person+ | **Keep** | n/a | key | The admin-who-bills persona needs money without delivery |
| 3 | `agent/report:view-compliance` | :589 | Control | large | **Simplify** | Drop; deadline-adherence figures follow `view.own` / `view.all` | key in code only | No seeding is stated; it adds an access mode nobody asked for |
| 4 | `agent/report:configure` (dashboards, widgets, metric definitions, shared views) | :594 | Control | large | **Park** | Publishing a shared view goes to `view.all` holders | key in code | The builder and custom metrics are already deferred (:684-685), so nothing is left to configure |
| 5 | Six seeded role dashboards (Owner, Case Manager, Rep, Case Officer, Billing, Compliance) + picker | §3.6 :255, AG-14-18 :397, `Dashboard.roleTarget` :485 | Config | large | **Simplify** | **One** dashboard with sections (Sales, Cases, Money, Workload, Deadlines). Each section shows if the viewer holds the key; figures scoped own/all | Keep `Dashboard` / `DashboardWidget` / `MetricDefinition` | "Rep" and "Compliance" are not starter roles (SA6-D5, :51); Admin and Read-only get no default |
| 6 | `MetricDefinition` "overridable per firm" | entity :484 | Config | large | **Park (UI)** | Platform-seeded only | keep `firm_id?` | Contradicts the deferral at :685 |
| 7 | Saved views (mine / firm-shared) | §3.7 :275, AG-14-21 :400 | Config | 4-person+ | **Decided: keep** as Advanced reports (:357) | Firm-shared publish by `view.all` holders | `SavedFilterView` | n/a |
| 8 | Scheduled reports: cadence, recipients self/users/**role**, formats in-email + PDF + XLSX, per-schedule locale | §3.9 :302, AG-14-23 :404, §13 Q6 :679 | Config | 10-person | **Simplify** | Weekly or monthly, at a fixed time in the firm's timezone; recipients = self + named users (no role recipients); in-email summary + PDF; owner's language | `ReportSchedule` | Role recipients are the leakage risk named at :679; four format/locale axes is enterprise |
| 9 | Over/under-load flags against a "configurable target" | §3.4 :230, AG-14-16 :391 | Config | 10-person | **Park** | Show the workload distribution, no target and no flags | n/a | No owner or default is stated; it brushes against the "no staff monitoring" line (BR-15 :447) |
| 10 | Forecast "vs quota" | §3.1 :170, AG-14-8 :377 | Config | 10-person+ | **Park quota** | Weighted forecast only | add a quota entity later (no model change) | No quota setting exists anywhere in AG-14's entities (:484-492) |
| 11 | `reportingCurrency` + FX source (manual vs provider) | AG-14-27 :412, §13 Q4 :677 | Config | solo+ | **Simplify** | Reporting currency = the firm's billing currency at provisioning, no setting; daily platform FX feed, no manual rates | **Keep** `FxRateSnapshot` | Multi-currency is standard (Q5a :678); the knob is not needed |
| 12 | "All" view only for "Owners or Case Managers" | AG-14-32 :420, §3.6 :260 | Control | 4-person+ | **Simplify** | Tie it to `view.all`, not role names | n/a | Role names break for custom roles; the key-based model is the rule |
| 13 | Export (`agent/report:export`) within Advanced reports, audited | §3.10, :590, :357 | Control | 4-person+ | **Decided: keep** | See AG-08 #19 (one export key) | audit | n/a |
| 14 | Export-file retention period | §13 Q7 :680 | Config | none at firm level | **Park (firm)** | Platform-fixed, e.g. a few days | `ExportJob` | It is a platform hygiene value |
| 15 | Entitlement-tiering note (forecasting, multi-currency, schedules, custom dashboards) | §11 :623 | Config | n/a | **Stale** | Superseded by §3.12 / Q5 (:357, :678) | n/a | Wording clean-up only |

---

### (a) Five highest-leverage items

1. **Permission presentation (all four modules).** These four modules alone define 59 live keys: AG-08 9, AG-09 18, AG-13 25, AG-14 7. Keep every key in code. Show about 12 bundles in the role editor. This is the biggest cut in screen complexity, and it changes no data.
2. **AG-09 retention engine → Q19.** §3.12 (:403-418), AG-9-33/34 and `RetentionPolicy` (:636) still describe per-type policies, auto mode and pack legal windows. Q19 (TM:403) already reduced this to one setting, a warning and a list. Applying the knock-on removes a whole engine. Parking legal hold (the `legalHold` field stays) follows from it.
3. **AG-08 builder → the Q18 layer.** AG-08 still specifies a firm-facing builder with bindings, must-verify flags, a condition editor, publish/changelog and 13 field types, plus clones (AG-8-9–11). Q18 makes almost all of that pack-only. The firm editor shrinks to: add simple questions, hide or reorder optional ones, and (pending) who answers.
4. **AG-14 one dashboard, not six.** The seeded dashboards target roles that do not exist (Rep, Compliance). Admin and Read-only get nothing. `view-compliance` and `configure` have no job. One sectioned dashboard gated by existing keys is simpler and correct. Park quota and load targets, which have no settings home.
5. **AG-13 escalation.** Park the toggle and fix the contradiction. AG-13-7 (:360) escalates to an "assignee's manager", but the data model has no manager relation. AG17-D81 (:706) targets case-assign holders around standard deadlines. As written, it cannot be built. Parking it costs no 4-person firm anything.

### (b) Items where parking would hurt even a solo firm

- **Note wall** (internal by default vs client-visible): AG-13 #13.
- **Verification record** (`agent/sqr:verify`, approve = verify): AG-08 #17, AG-09 #14.
- **Waive-deficiency with a reason:** AG-08 #20.
- **AI on/off firm switch:** AG-08 #21. It is consent.
- **Audit log readable by the Owner and access-log data:** AG-13 #16, AG-09 #4 data.
- **Keep-period setting with Owner-only disposal:** AG-09 #5–6, decided.
- **Reminder timing settings for questionnaires and documents:** decided.
- **Activity types and billable defaults:** for hourly billers, AG-13 #20.
- **To-do template starters with a minimal editor:** AG-13 #6.
- **Firm-added simple questions:** AG-08 #2, smaller version.

### (c) Open questions for the founder

- **Q-A.** Under Q18, can a firm create a *whole* questionnaire for a service the pack lacks, or only layer onto pack questionnaires? Can a firm-added question have its own show/hide condition?
- **Q-B.** Do firm-layer edits (added or hidden questions) reach cases already in progress, or only new cases? Q18 pins *pack* versions per case; the firm layer is not covered.
- **Q-C.** What is the default expiry of a questionnaire invitation link? None of these documents states it.
- **Q-D.** Default role seeding is **not stated** for these keys:
  - all AG-08 keys except `verify`;
  - `agent/document:download`;
  - `agent/task:assign`;
  - `agent/note:share-with-client`;
  - `agent/report:view-compliance`.

  These need values before the role editor can be built.
- **Q-E.** Escalation: who is the target? AG-13-7 says "assignee's manager"; AG17-D81 says case-assign holders. Do you agree to park it for R1?
- **Q-F.** Who counts as "admin" for editing or deleting someone else's note (AG-13 :266)?
- **Q-G.** Can a firm add its own document types, or only use pack types plus a free-named "Other"?
- **Q-H.** Partial questionnaire submit: should there be a firm-wide setting, or only a per-case "accept with gaps" action (my recommendation)?
- **Q-I.** Spouse privacy: is the proposed default fixed, with no setting (AG-08 :724)?
- **Q-J.** Should one "Export data" key replace `sqr:export`, `report:export` and `case:export`? This is SA-06 territory.
- **Q-K.** Where would a sales quota live, if ever? AG-14-8 references it, but nothing defines it.
- **Q-L.** Task categories: firm-maintained list, free text, or none in R1?

**Stale text found:** these need a knock-on when the modules are next written; none are re-litigated here.
- AG-08 clone text (AG-8-9–11 and §3.3) vs Q18.
- AG-09 §3.12 retention vs Q19, plus "as the law requires" / PIPEDA / CASL wording (:150, :222).
- AG-13 "legal obligation" (:303, BR-13) vs decision 11, and "lost licences / regulator" framing (:156, :162) vs rule 7.
- AG-14 :623 tiering note vs Q5.
- AG-08 doc-item statuses (AG-8-19) vs AG-09's status set (AG-9-26): two vocabularies for the same document.
---

## Review: AG-10-11

## Complexity register for AG-10 v1.11 and AG-11 v1.12

This was a read-only review. I wrote no files. I read the lens, both documents in full, and TEMPLATE-MAP sections 8, 9, 17, "Decisions after the SA-05 v3.0 / AG-12 v2.0 rewrite" and "Parked for later".

Most of the excess control is in AG-11. After 4 Oct, firm settings were added on top of the agent-native decisions:
- **Main settings screen:** 3 items.
- **Advanced:** about 15 knobs (AG-11:520, AG-11-86 :690).
- **Permission keys:** 16 in AG-11 and 12 in AG-10, for a Release 1 that has no automation builder (AG-11:393, :1310).

Rules shared by both modules (supervision, the AI approver, autonomy) are listed once, in the AG-11 table, which owns them.

### AG-10 Communication Hub

| # | Item | Where | Layer | Who it really serves | Verdict | Smaller version / default | Keep in data? | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | 12 communication permission keys: view, send-email, send-message, bulk-send, manage-inbox, resolve-unmatched, manage-templates, connect-mailbox, export, view-analytics, manage-preferences, consent:manage | AG-10:705-724 | Control | Large | Simplify | Show 3 role toggles: "Message clients" (view + send-email + send-message + manage-inbox + resolve-unmatched), "Bulk / marketing sends" and "Export conversations". Consent admin and analytics go to Owner/Admin by default. manage-templates is already folded into template:* (O17, TEMPLATE-MAP:412). | Yes, all keys stay in code | Treating "star my own email" (manage-inbox) and resolving unmatched items as separate grants means nothing to a 1–10 person firm. |
| 2 | Export permission plus audit | AG-10-35 :418, :717 | Control | All | Keep | — | Audit rows | Controls who can take data out. |
| 3 | Consent override and suppression-list editing | :713, :292, AG-10-25 :394, AG-10-60 :452 | Control | All | Keep (Owner/Admin) | — | ConsentRecord, SuppressionEntry | Protects the firm and ExpatReady's shared sending reputation. |
| 4 | Per-firm open/click tracking toggle | AG-10-7 :366, :214, :563; Q6 :811 is still open | Config | Large, privacy-minded firms | Park | One platform default, chosen in Q6. Delivered/bounced is always recorded. | Keep the flag column | A 4-person firm will not touch this. The default itself is still undecided. |
| 5 | Quiet hours / business window for client sends | Defined twice: in messaging rail config (:559, :261) and in firm config owned by AG-1 (:563). Also BR-9 :466, AG-10-8 :367 | Config | All | Simplify | One firm setting, "Hold automatic client messages outside business hours" (default on), reading AG-1 business hours. Drop the per-rail copy. | Timezone | Two sources of truth for one rule. |
| 6 | Per-office timezone and hours | :168, :466 | Config | Multi-office firms | Park UI | Firm timezone only | Yes, keep office_id on records | Data-foundation rule. |
| 7 | Staff notification matrix (event × in-app/email/push) plus quiet hours plus digest | AG-10-29b :403, §3.7 :298-310; Q8 :813 open | Config | Matrix serves large firms | Simplify (TEMPLATE-MAP:189 decided this; flagged only) | Bell always on. Email on/off per event group (about 5 groups). One digest choice. Push parked until there is a mobile app. | Keep NotificationPreference per event type | About 30 toggles per person today. |
| 8 | Mailbox folder/label picker | :231, :234, AG-10-4 :361 | Config | Almost no one | Simplify | Keep connect, health, disconnect and purge. Sync Inbox (and Sent) by default. | Keep `folders[]` | Nobody curates labels. |
| 9 | Personal vs firm mailbox | `connect-mailbox` = "a user's personal mailbox" (:716). The deferral says "per-user mailboxes Phase-2 — firm-level connect now" (:827). `MailboxConnection` has firm_id and no user id (:557). | Control | 4 and 10 | Open question | — | Add `userId?` now | The three statements contradict each other. A 4-person firm's two consultants each have their own Gmail. |
| 10 | Raw SMTP form vs shared relay | SmtpSettings :559; key owned by AG-16 (:715); Q5 :810 open; TEMPLATE-MAP decision 1 (:347) already assumes an ExpatReady shared route | Config | IT-capable, large | Simplify | Default to ExpatReady shared sending plus a connected mailbox. Raw SMTP goes under Advanced. | Keep SmtpSettings | A solo RCIC cannot set up SMTP or DKIM. |
| 11 | WhatsApp approved-template mapping kept by the firm | AG-10-43 :429, AG-10-57 :449, :559 | Config | Firms using WhatsApp | Simplify (already decided in TEMPLATE-MAP Q12 :396) | Status view only (Approved / Waiting / Rejected, plus "Edit and resubmit") | Keep the mapping table | AG-10 still says the firm manages the mapping. That text is a stale knock-on. |
| 12 | Preferred channel per client, plus "send on both" | AG-10-56 :448 | Config (per record) | Firms using WhatsApp | Keep | Email by default | Field | One field, directly useful. |
| 13 | Template purpose (service/marketing) replaces the gate's transactional/marketing classification | AG-10-22 :391, BR-2 :459 vs TEMPLATE-MAP decision 1 :347, Q9–Q11 :393-395 | Config | All | Keep (decided); text is stale | — | consentBasis | AG-10-22 still blocks marketing on every route. Decision 1 makes the own-mailbox route a "Send anyway?" warning. |
| 14 | Sorter classification values as "pack/firm content" | AG-10-37 :421 | Config | Large | Park firm editing | ExpatReady/pack list only | Store as codes | Invites a firm-editable list that nobody will maintain. |
| 15 | Sorter confidence threshold | AG-10-38 :422; Q10 :815 | Config | No one | Park | Every non-deterministic match goes to review (already the default) | — | AI-only matches never file automatically, so the threshold would only re-sort review items. |
| 16 | Communication analytics dashboards (response time, deliverability, by rep/channel) | `view-analytics` :720, persona :182; sold as an extra :753 | Config / dashboard | 10-person, large | Park | Release 1: a failed/bounced list plus notifications | DeliveryEvent keeps everything | Sold as an extra (:753) while §13 defers the suite to Phase 2/3 (:828). That is a contradiction. |
| 17 | Supervision, AI-text approver, per-recipe autonomy, approval timings | AG-10-44/45/49/50 :432-438, §6 :519 | — | — | See AG-11 table rows 4–7, 15 and 18 | — | — | Owned by AG-11. |

### AG-11 Automation

| # | Item | Where | Layer | Who it really serves | Verdict | Smaller version / default | Keep in data? | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | 16 automation keys (list … configure-ai) | :1135-1150 | Control | Large | Simplify | create, edit, delete, simulate, run and manage-minder have no Release 1 screen, because the builder is Release 2 (:393, :1310). Show two: "Manage automations" (on/off, autonomy, timings, retry failures; Owner/Admin) and "See all automation activity". | Yes, keys in code | 16 keys to govern 9 on/off recipes. |
| 2 | Three-level autonomy per action, with internal actions changeable to Ask me first / Off | Table :311-318 (internal row :313), AG-11-52 :634 | Config | Client messages: all firms. Internal actions: no one. | Simplify | Per recipe: On / Ask me first / Off for its client message. Internal actions fixed at AUTO. | Keep `autonomyLevel` per action | No firm will set "create task" to Ask me first. |
| 3 | Hard floors: AI text, AI-edited template, government form, unchecked verified-profile write | :315-320, AG-11-53 :635 | Control | All | Keep | — | floorReason | Protects ExpatReady. No knob. |
| 4 | Does editing a Drafter draft escape the AI floor? | AG-11 :315 "Drafter output, edited or sent unedited" → APPROVE; AG-11 :1097 "even unedited" vs AG-10 :240 and §9 :688 "a draft a human has edited is that human's message" | Control | — | Open question | — | — | With supervision off, AG-10 lets unlicensed staff send an edited AI draft. AG-11 requires a licensed approver. The two documents disagree. |
| 5 | "Who may approve AI-written client text" (licensed by default; Owner widens roles) | AG11-D11(a) :41, AG-11-88 :693, AG-10-44 :432 | Control + Config | 10-person, large | Park the role picker | Licensed-only, plus the existing Owner fallback | Keep `aiClientTextApprovers` | Under AG-10's reading it only governs unedited Drafter sends by unlicensed staff. AI is also off until the provider terms are recorded. |
| 6 | Supervised client messages: on by default once any active unlicensed user can message clients; Owner turns off with a reason; one-click "switch on" notice | AG11-D11(c) :41, AG-11-82 :682, AG-10-49 :437 | Control | 10-person, large. Costs the solo firm. | Keep the switch; simplify | One switch on the main screen. Ask the Owner when the first unlicensed messaging user is added, instead of silently defaulting on. Park the re-enable notice. | supervisionState, approvalBasis | The lens's solo firm (lens:11, RCIC plus assistant) gets every hand-written assistant email held for the RCIC by default. |
| 7 | Shared approval queue, "preferred" mark, first decision closes | AG-11-89 :694, :503 | Control | 4 and 10 | Keep the queue; park the visible mark | Sort licensed holders first, silently | Derived at read time | Below about 3 approvers the mark adds nothing. |
| 8 | Owner fallback when no licensed user or no permission holder | AG-11-90 :695 | Control | Solo | Keep | — | approvalBasis | Nothing is ever blocked. |
| 9 | Four-eyes on forms: needs 2 or more approvers; preparer rule; self-approved record | AG-11-81 :681 | Control | 10-person | Keep the logic; no separate knob | — | preparedBy, selfApproved | Invisible if it rides on one switch. |
| 10 | Team safeguards lifecycle: auto-on at 5 active staff, notice, 7-day grace, banner, quarterly reminder, source AUTO/OWNER/ADMIN, on by Owner or `settings:edit`, off by Owner only with a reason | AG11-D9 :39, :517-518, AG-11-80 :680, AG-11-84 :684, §6 :825-836 | Config / governance | 10-person, large | Simplify | One Owner switch, off by default. At 5 staff, one dismissible suggestion. Park the auto-switch, grace, banner and quarterly reminder. | Keep FirmTeamSafeguards (source, enabledAt, count) | A timed state machine for one boolean. The lens's 10-person firm "behaves like a 3–5 person team". |
| 11 | Per-part adjustment under Advanced (Owner, with reason) | AG-11-83 :683 | Config | Large | Park | The four parts move together | Keep the 4 part fields | Per-part governance for a switch most firms never touch. |
| 12 | Part 4: an unlicensed user's Needs you is visible to licensed users | :516 | Control | 10-person | Simplify | A "team queue" view for Owner/Case Manager | — | Since F4, professional items already go to every holder, so this is only a view filter. |
| 13 | Backup approver | AG-11-83 :683, :519, :878 | Control / Config | Large | Park | Overdue and unassigned items already escalate to `case:assign` holders and the Owner (AG-11-55 :639); professional items already go to all holders (F4) | Keep the enum value | Almost redundant. The only gap is a *suspended* (not deactivated) file owner's items; fold that into the unassigned rule. |
| 14 | Escalation and at-risk marks as two separate parts | AG-11-19 :579, AG-11-49 :585, :344 | Config | 10-person | Simplify | One "Alert managers about at-risk deadlines" inside Team safeguards | Keep both flags | Two toggles for one intent. |
| 15 | Needs you overdue time (2 working days) and deadline lead (2 working days), firm-editable 1–30 | AG-11-59 :643, AG-11-99 :716, AG-11-100 :717 | Config | No one | Park | Fixed 2 / 2 | Columns can be added later | An internal timing nobody tunes. |
| 16 | Missing-document chase 5 / 7 / 4, firm-editable | AG-11-76 :668 | Config | All | Keep | Three numbers on one screen | Per-firm values | Shapes what clients experience, and firms genuinely differ. |
| 17 | Timings and countdown lead times for the five extra recipes | AG-11-107 :724, US-32 :1045; TEMPLATE-MAP decision 7 "(firm-editable)" :353 vs O26 "fixed in code now" :412 | Config | Large | Park | Pack defaults | — | The template map contradicts itself; follow O26. |
| 18 | Recipe on/off (6 on, 3 off by default) | :376-382, AG-11-106 :723 | Config | All | Keep | — | — | This is the core library-first knob. |
| 19 | Per-firm and per-recipient rate caps, plus the Guardrail settings screen | AG-11-38 :616, BR-11 :741, :477, :1147; Q7 :1262 open | Config | No firm; protects ExpatReady | Simplify | Enforce fixed platform caps. No firm screen. | Override column later | Small firms will not ask to raise caps. |
| 20 | "Default consent class per action type" and `consentClass` | :477, :871 vs TEMPLATE-MAP Q10 :394 | Config | — | Park | Purpose lives on the template | Derive it | A duplicate knob that conflicts with the template's purpose. |
| 21 | Per-automation business-hours accrual and per-office zones | §3.11 :485; Q10 :1265 | Config | Multi-office | Park | Firm zone plus AG-10 row 5's single toggle | office_id | — |
| 22 | AI master switch: locked until terms are recorded; Owner turns it on with acknowledgement | AG-11-93 :702, :1150, :840 | Control | All | Keep | — | aiEnabledBy/At | ExpatReady is the data processor. |
| 23 | Firm-set AI confidence thresholds | :881; Q11 :1268 | Config | No one | Park | Everything goes to review | — | The default is already safe. |
| 24 | Dead-letter queue screen, retry/dismiss keys, auto-dismiss policy | :410, AG-11-27 :597, :1145-1146; Q6 :1261 | Dashboard | 10+ | Simplify | Notify the Owner/file owner on failure, with Retry on the run | DeadLetter table | A small firm needs "this didn't send — retry", not a queue. |
| 25 | Firm health dashboard with trends; per-recipe approve/edit/reject stats | §3.9 :444-453, AG-11-35 :611, AG-11-63 :647 | Dashboard | Large | Simplify | Keep the per-record automation timeline (US-11 :937) and a "last run / failures" line per recipe | Store the counts | Firms running 9 ready-made recipes do not tune recipes. |
| 26 | Version-history diff UI and recipe "update offered" | §3.8 :431-440, AG-11-24 :592 | Governance | Release 2 builder users | Park UI | — | Keep AutomationVersion and recipeVersion | In Release 1 firms cannot edit definitions (:393). |
| 27 | Simulate panel and blast-radius count in the builder | §3.7 :416-421, AG-11-29 :601 | Config | Release 2 | Park the panel | Keep the dry-run engine for Needs you previews and quiet-set counts | — | There is no builder in Release 1. |
| 28 | Manual run of an automation on a record | AG-11-7 :561, :1142 | Control | Release 2 | Park | — | — | No Release 1 use without the builder. |
| 29 | "Review your standard messages" holding seed messages in Needs you; adopt as firm drafts | AG-11-91 :698, AG-11-75 :667, AG-10-45 :433 | Config | All | Keep (decided); text is stale | — | — | TEMPLATE-MAP :209, Q1 :385 and Q4 :388 supersede this: no copies, only self-firing messages held, held messages not queued in Needs you. |
| 30 | Template publish reach count | AG-11-92 :699 | Config | Large | Park | — | — | Matches the TEMPLATE-MAP parked suggestion (:416). |
| 31 | "Start client automations" preview with per-action-type checkboxes and open-cases filter | AG-11-95 :706 | Config | Firms that import | Simplify | Counts plus confirm, open cases only by default; park the checkboxes | — | — |
| 32 | An unlicensed file owner's single-client switch-on waits for a licensed user | AG-11-102 :719 | Control | Large | Park | `agent/import:run` decides | — | Puts a licence gate on starting data. It blocks the solo firm's assistant who does the migration. |
| 33 | Reassigning Needs you items; overdue/unassigned escalation | AG-11-55 :639 | Control | 4 and 10 | Keep | — | — | Uses an existing key. |
| 34 | `sqr:verify` for Reader values; note when form-approve is granted to an unlicensed user | AG-11-85 :687, AG-11-89 :694 | Control | All | Keep | — | — | Decided and cheap. |
| 35 | Done for you: own vs firm-wide | AG-11-65 :651 | Control | 4 and 10 | Keep | — | — | Cheap. |
| 36 | Standard Minder reminders always on, never plan-gated | AG-11-47/48 :583-584 | Control (fixed rule) | All | Keep | — | — | Deadline safety, and there is no knob. |

**Template decisions that add firm-facing settings (flagged, not re-litigated):**
- "The firm may set any of these to start unticked" for about 10 case-event messages and the welcome (TEMPLATE-MAP Q2 :386, Q6 :390). I suggest parking this.
- The route-based marketing rule ("Send anyway?" on the firm's own mailbox, decision 1 :347).
- Purpose change with a warning (Q11 :395).
- Switch off any automatic message (Q8 :392).
- The "Manage legal settings" key (Q13 :397).
- Per-template WhatsApp versions (Q12). This matches the parked suggestion at :416.

### (a) The 5 highest-leverage items
1. **Collapse the Team safeguards machinery** (AG-11 rows 10–14) to one Owner switch. Park the auto-switch at 5, the grace period, banner, quarterly reminder, per-part governance and the backup approver. This removes the largest block of settings logic in either document, and the data fields stay.
2. **Supervision default for the solo firm (AG-11 row 6).** This is the single biggest day-to-day friction for the lens's solo RCIC plus assistant. Ask the Owner when the first unlicensed user is added, rather than defaulting on silently.
3. **Park Release 1 automation operations and governance screens** (AG-11 rows 19–20, 24–28, 30): the DLQ screen, health trends, approval stats, version diff, simulate panel, guardrail screen and reach count. Release 1 firms cannot author automations (:393), so these screens govern nothing. Replace them with a failure notification plus Retry, and the per-record automation timeline.
4. **Collapse permissions on screen** (AG-10 row 1, AG-11 row 1) from 28 keys to about 5 grantable capabilities. All keys stay in code.
5. **Park the timing and threshold settings** (AG-11 rows 15, 17, 23; AG-10 rows 4, 15) and keep only the chase cadence. These are defaults that 80% of firms keep, and none of them changes the data model.

### (b) Items whose parking would hurt even a solo firm
- **Consent:** the consent gate, unsubscribe/STOP, bounce/spam suppression, and the correction flow (AG-10-60).
- **AI:** the AI master switch and the human-approval floor.
- **Recipes:** recipe on/off, plus a per-recipe "Ask me first".
- **Timing and imports:**
  - The chase cadence.
  - One "hold automatic messages outside business hours" switch (a 3 a.m. WhatsApp chase does real harm).
  - The import preview and confirm before anything goes out.
- **Records and safety nets:** the Owner fallback (nothing ever blocked), the failure notification with Retry, and the per-record automation timeline.
- **Access and mailbox:** the export key with audit, and mailbox connect, disconnect and purge.

### (c) Open questions for the founder
1. **Supervision default (AG-10-49 :437).** Should it stay on by default the moment an assistant can email clients, or should the Owner be asked when that user is added? The lens's solo firm hits this every day.
2. **Edited AI drafts.** Does editing a Drafter draft take it out of the AI floor? AG-11 :315 and :1097 say no; AG-10 :240 and :688 say yes. Whatever is decided also determines whether the "who may approve AI text" setting matters at all.
3. **Mailbox ownership.** Is the mailbox per user or per firm? AG-10 :716, :827 and :557 contradict each other, and the data model needs `userId` decided now.
4. **Countdown points.** Firm-editable (TEMPLATE-MAP decision 7, :353) or fixed in code (O26, :412)? The template map contradicts itself.
5. **Communication analytics.** It is a sellable extra (:753) while §13 defers the suite (:828). Either sell a basic version or remove it from the catalogue.
6. **Still-open defaults that decide whether a setting exists:** Q5 (shared relay vs own SMTP, AG-10 :810), Q6 (open tracking, :811), Q7 (rate-cap values, AG-11 :1262), Q10 (business-hours default, AG-11 :1265).
7. **AG-11-102.** Should starting an imported client really need a licensed approver, or is `import:run` enough?
8. **Stale knock-ons still to apply to AG-10 and AG-11** (decisions already made, not reopened):
   - "Review your automatic messages" replaces "standard messages", holds only self-firing messages, makes no copies and does not use Needs you (TEMPLATE-MAP :209, :385, :388).
   - E-sign → onboarding becomes the case-opened welcome box (Q6 :390).
   - The route-based consent rule replaces AG-10-22's every-route block (:347).
   - WhatsApp templates are auto-submitted by ExpatReady, not mapped by the firm (Q12 :396).
   - `consentClass` gives way to template purpose (Q10 :394).
---

## Review: AG-15-CP01-AG-17-18

## Complexity register: AG-15, CP-01, AG-17 and AG-18 (read-only; no files written)

I read the lens, the memory note `release-1-scope-principle.md` (you named it, not the product owner directly), all four documents in full, and TEMPLATE-MAP §11–§17 plus the last two sections. Where a decision dated 11 October already settled an item, the verdict follows it and cites `TM:line` (TEMPLATE-MAP). Anything marked "judgment" is my call, not something the documents say.

Abbreviations: S = solo, 4 = 4-person firm, 10 = 10-person firm, L = large firm.

---

### AG-15: Client portal management (firm side)

| # | Item (plain words) | Where | Layer | Who it really serves | Verdict | Smaller version (Simplify) / default (Park) | Data foundation to keep? | One-line reason |
|---|---|---|---|---|---|---|---|---|
| 1 | 14 portal permission keys | §10 :598-613 | Control | L | Simplify | Keep the keys in code. On screen they follow the starter roles: day-to-day keys go to every working role, and branding, policy, access-log and corporate keys go to Owner and Admin. Do not show 14 rows to firms. | Yes, the keys | `configure-branding` (:610) and `configure-policy` (:613) are "shared with AG-1". I did not open AG-01, so it is unverified whether the same screen ends up with two keys. |
| 2 | Pause, restore, remove access, sign out everywhere, remove one device | AG-15-4…7 :345-348; BR-5/6 :426-427 | Control | S–L | Keep | — | Yes (`SUSPENDED`/`REVOKED`, reason fields :483) | Clients are never signed out (AG-15-43 :404). Removing a device is the only control for a lost or shared device (CP-01:580). |
| 3 | Firm picks which of the employer's LMIA files the employer sees | AG-15-11 :354; BR-13 :434; screen :225 | Control | 10/L | Simplify | Show all of the employer's LMIA files by default. A per-file "hide from employer" flag goes on the file. No separate scope editor. | Yes, a per-case flag that defaults to true | Most firms have one or two files per employer. A roster editor is depth (judgment). |
| 4 | Extra employer logins with their own scope; removing the company removes them all | AG-15-12/13 :355-356 | Control | L | Park (already) | Primary contact only (AG17-D38) | Yes. `CORPORATE_SEAT` already exists in code (AG-17:1183); keep `scopeJson` in the model only | Already decided as Release 2 or a later extra (SA3-D20 :55). |
| 5 | Six per-case visibility toggles plus a firm default: progress, documents, questionnaire, invoices, agreements, messaging | AG-15-14 :359; §3.3 :231-243; entity :487 | Config | L | Simplify | The firm sees only: the per-file portal switch (decided), messaging on/off, and "show firm-produced documents". A requested document, questionnaire, invoice or agreement shows **because staff sent it**, so drop `showSqr`, `showInvoices` and `showAgreements` from the screen. | Keep the fields with default "on" | Today an item is checked three times: type enabled, switch on, in scope (CP-1-30 :366). Staff can send an invoice the client never sees, and nothing on screen explains why. |
| 6 | Per-case mapping of internal step names to client labels; only mapped steps are shown | AG-15-15 :360; `stageLabelMapJson` :487 | Config | L | Simplify (already decided) | Apply TM:362. ExpatReady writes a client name for every government step in each language, and the firm may rename it at firm level. No per-case editor and no "unmapped" state. | No | AG-15-15 is a listed knock-on of the 11 October decision (TM:362) and has not been rewritten yet. |
| 7 | Live "what the client sees" preview | AG-15-16 :361; :244 | Config | 4–L | Simplify | A read-only "View as client" button that renders the real portal for that case. No separate preview engine. | No | "What does Client A see?" is a common question, but a second render path is a second way for the two views to disagree. |
| 8 | Portal branding: logo, colours, name, support contact, sender, reply-to | AG-15-26 :375; §3.5 :271; `PortalBranding` :490 | Config | S–L | Keep, as one shared record | Use the firm layout settings already decided (TM:301). Do not build a second `PortalBranding` entity. | Yes, one branding record | CP-01 already cites two entities: `PortalBranding` and `FirmBranding` (CP-01:312). |
| 9 | Branding per office or per brand | :271, :490, :623 | Config | L | Park | One firm brand | Keep a nullable `officeId` | Small firms have one brand. |
| 10 | Custom portal domain with verification | AG-15-27 :376; BR-17 :438 | Config | 10/L | Park | Default firm host | Keep a nullable `customDomain` | Contradiction: it is named as a sellable extra (SA3-D10 :53), but CP-1-87 (:439) and AG-15 Q2 (:693) put it in Release 2. |
| 11 | "Advanced portal branding" (sellable extra) | :6, :53 | Config | ? | Park until defined | — | No | Nothing in §3.5 says what "advanced" adds to item 8. |
| 12 | Firm portal policy: invite-link lifetime, client MFA required, offered languages, default visibility, stall threshold, business-hours mode | AG-15-41 :400; `PortalAccessPolicy` :491; key :613 | Config | L | **Park the whole screen** | Link lifetime 7 days (already decided, TM:406). MFA off (Q3 :694 proposal). Languages are those the platform supports. Stall after 7 days (Q6 :697). Weekends excluded, no toggle. | No (a column can be added later) | Removes one entity, one key and one screen. Every field has an obvious default. |
| 13 | Firm-wide engagement dashboard ranked by stall risk, with a Redis cache contract | AG-15-31 :382; :639 | Config (admin dashboard) | 10/L | Simplify | A "Stalled clients" list sorted by days since the client's last action, filtered by officer. | Yes, `PortalActivityEvent` :489 | The capability is used daily and stays. The risk ranking and cache are large-firm depth. |
| 14 | Auto-nudge playbooks (sellable extra) | AG-15-32 :383; §3.6 :284; Q4 :695 | Config | 10/L | Simplify | Two fixed seeded nudges, each on or off: "invited, not activated" and "document pending". No playbook editor; firm-designed automations are already the separate Automations extra (TM:391). | No | **Double sender:** the "document pending 7 days" nudge conflicts with O18, which makes the AG-11 chase the only sender of upload reminders (TM:412). |
| 15 | Turn messaging off for a client or case; choose who at the firm may send | AG-15-34 :387; BR-14 :435 | Control + Config | L | Simplify | Messaging on by default, with an off switch per client. Who may send = `agent/portal:message` only; no per-case sender list. | No | The per-case sender list is a second permission system. |
| 16 | Show staff personal contact details only if the firm opts in | BR-16 :437; Q7 :698 | Config | 10/L | Park the knob | Firm brand plus the assigned officer's first name (Q7 proposal) | No | No firm will look for this setting. |
| 17 | Client access log, session list, unusual-sign-in alerts | AG-15-39/40 :396-397; §3.9 :324 | Control/monitoring | L | Simplify | Keep the access log, the session list and failed-login throttling (CP-1-18). Park the location-based alerts. | Yes, the audit events | The lean rule against monitoring features (AG17-D46) applies by analogy (judgment). |
| 18 | "Done on behalf"; signatures never done on behalf | AG-15-44/45 :407-408 | Control | S–L | Keep | No new key (AG17-D74) | Yes, `completedOnBehalf` :488 | Paper-based clients exist at every firm size. Signing for the client is a floor. |
| 19 | Features not on the plan shown locked with an upgrade prompt | BR-17 :438 | Config | — | Keep (decided, SA3-D16) | — | — | Not reopened. |
| 20 | Invite token lifetime still written as "5-minute activation" | BR-4 :425 | — | — | Fix the text | 7 days (TM:406) | — | Document lag, not a decision. |

### CP-01: Client portal app (only items that shape firm behaviour; shared items point to AG-15)

| # | Item | Where | Layer | Serves | Verdict | Smaller version / default | Data? | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | Three gates before a to-do appears: type enabled, switch on, in scope | CP-1-30 :366 | Config | — | Simplify | Two gates: switch on and in scope (see AG-15 #5) | — | The firm cannot predict what the client sees. |
| 2 | Client-visible note needs both the AG-13 note flag and the config flag | CP-BR-3 :458; CP-1-26 :360 | Config | — | Simplify | One gate: the note's own "client-visible" flag | — | The doc labels its own double gate "judgment". |
| 3 | Signed agreement shown only where a portal opt-in flag is set | CP-1-27 :361 (AG-5-44) | Config | — | Park the flag | Always show the signer their signed copy | No | The signer already gets the copy by email (CP-01:268). Hiding it in the portal protects nothing. |
| 4 | Show firm-produced documents | CP-1-27 :361 | Config | 4–L | Keep as one firm default | Off | Yes | It is a real privacy choice. |
| 5 | Progress rail labels from `stageLabelMapJson`; unmapped-step rule | CP-1-23/24 :357-358 | Config | — | Simplify | Per TM:362 every step has a client name, so CP-1-24 can be withdrawn | — | Listed knock-on (TM:362). |
| 6 | MFA if firm policy requires it | CP-1-15 :345; Q2 :628 | Config | L | Park | Off (see AG-15 #12) | Keep `mfaEnabled` | Still open in both documents. |
| 7 | Client profile edits: officer approval or apply at once? | CP-1-73 :421; Q17 :643 | Control | — | Keep the draft rule | Apply at once and notify the officer. No approval flow. | Provenance | An approval queue for a phone-number change is noise. |
| 8 | Spouse's restricted answers hidden from the principal | CP-1-50 :390; Q8 :634 | Control | S–L | Keep the default, no knob | Private from the principal (proposal) | — | Privacy floor. |
| 9 | Corporate agreement: only the named signer gets a sign action | CP-1-58 :400 | Control | S–L | Keep | — | — | Follows AG-05. |
| 10 | Employer enters recruitment channels and candidates "where the firm enables it" | CP-1-85 :435 | Config | L | Park (already Release 2) | Staff enter them | — | AG17-D51. |
| 11 | "Paper only" mark to suppress the invite | Q24 :650 | Config | — | Park | The firm simply does not invite | No | Not inviting is already the switch. |
| 12 | Client sets their own preferred channel | Q25 :651 | Control | — | Keep simple | Staff set it (AG-10 §3.4) | — | Open; low stakes. |
| 13 | Employer portal plan-gated? | Q20 :646 vs AG-17 US-12 :986 | Config | — | Founder question | — | — | SA3-D10 puts the client portal in every plan (AG-15:6, :53). |

### AG-17: Corporate cases and LMIA

| # | Item | Where | Layer | Serves | Verdict | Smaller version / default | Data? | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | No new permissions; uses the case keys | AG17-D28 :147; §10 :1131-1150 | Control | S–L | Keep | — | — | Already lean. |
| 2 | Passing a critical warning needs waive permission plus a reason (Owner and Case Manager by default) | AG17-D17 :136; AG-17-34 :752 | Control | S–L | Keep | — | Yes, waiver record | Protects the firm. Without it nothing could pass (BR-6 :840). |
| 3 | Sign-off by `review-approve`; submitting without sign-off asks one confirmation | AG-17-35 :753 | Control | 4–L | Keep | — | Yes | Already reduced to one confirmation (AG17-D73). |
| 4 | Firm adds its own sign-offs and steps as action lines | AG17-D8 :127; §3.1 #6 :423; TM:401 | Config | 10/L | Keep | No settings screen (:423) | Yes | Additive only, no knob. Not reopened. |
| 5 | Per-file portal switch: employer does their items in the portal | AG-17-21 :734; AG17-D18 :137 | Control/Config | S–L | Keep | **Default value is not stated anywhere** (AG-15 :410/:487, AG-17 :734) | Yes, `clientItemsInPortal` | Founder needs to set the default. |
| 6 | Waive, sign-off, decision and export blocked in support sessions | :1169 | Control | — | Keep | — | — | Protects the firm and ExpatReady. |
| 7 | Orphaned deadline goes to users who can reassign | AG17-D56 :175; AG-17-60 :828 | Control | S–L | Keep | — | — | Cheap, and stops deadlines being lost. |
| 8 | Minder escalation chains and at-risk marks: two separate opt-in switches, off | AG17-D70 :189; D81 :200; §0.2 AG-16 row :256 | Config | 10/L | Simplify; resolve the conflict | One switch | No | **Contradiction:** AG-18:40 cites AG11-D9, which bundles both into "Team safeguards" that turns on automatically at 5 or more staff. AG-17 v0.6 (10 Oct) still says separate switches, off. I did not open AG-11. |
| 9 | Corporate step labels renamable, not reorderable | AG-17-55 :821; AG17-D32 | Config | L | Keep (affirmed, TM:362) | — | Label override | Not reopened. Low value. |
| 10 | Individual/Corporate view toggle shown to every firm | AG-17-2 :709; AG17-D35 :154 | Config | firms with employers | Simplify | Show the toggle only after the first corporate client exists (judgment) | No | A solo individual-only practice sees a switch that does nothing. |
| 11 | Saved filter "validity under ___ days" | AG-17-68 :786 vs §3.7a :654 | Config | 10/L | Simplify | Fixed at 60 days, as §3.7a :654 says | No | The document contradicts itself. |
| 12 | Forward-only manual board placement, "Back to automatic", "Placed manually" filter | AG17-D64 :183; AG-17-55 :821 | Config | 4–L | Simplify (minor) | Keep the override and the card marker; drop the dedicated saved filter | Yes, override fields | Trivial gain; low priority. |
| 13 | Adopting newer rules: one click, no reason | AG-17-5 :713 | Control | S–L | Keep | — | Pinned version | Already lean. |
| 14 | Employer financial and business documents can never go to the worker's case | AG17-D19 :138; BR-11 :845 | Control | — | Fix the text | Apply TM:358: off by default, Owner may change, under "Manage legal settings" (TM:397) | — | Document lag behind the 11 October decision. |
| 15 | Retainer needs an active licensed consultant | AG17-D58 :177 | Control | S–L | Keep | — | — | Licence rule already decided. |
| 16 | Notifications to the file owner only, through the AG-16 matrix | AG-17-60 :828 | Config | — | Keep the behaviour | No firm editing of the matrix in AG-17 | — | The matrix editor belongs to AG-16. |

### AG-18: Data import and migration

| # | Item | Where | Layer | Serves | Verdict | Smaller version / default | Data? | Reason |
|---|---|---|---|---|---|---|---|---|
| 1 | `agent/import:run`, `:undo`, `:view-report` (Owner and Admin), plus the target module's create key | §10 :745-751 | Control | S–L | Keep | — | Yes | Already lean. |
| 2 | Owner-only data-transfer attestation on every batch with personal data | AG-18-49 :403; AG18-D10(h) :134; Q16 :842 | Control | S/4 | Simplify | The person confirming the batch (an `import:run` holder) ticks it, or the Owner gives one standing attestation per migration | Yes, `ImportAttestation` | An Admin running 6 batches waits on the Owner 6 times. The decided consent declaration lets **anyone with import permission** tick (TM:404 Q20.4). Two ticks follow two authority rules. |
| 3 | An unlicensed file owner's single-client switch-on waits for a licensed user's approval | AG-18-86 :450; AG18-D11(b) :135 | Control | — | Simplify | One rule: `import:run` **or** the file owner, no licence approval | Keep `activatedBy` | It is illogical: an unlicensed Admin with `import:run` can switch on 500 clients unapproved, but an unlicensed owner cannot switch on one. It also sits uneasily with SA6-D2's "no licence check on permissions" (:27). |
| 4 | Assisted migration: written request, Owner uploads, support never sees personal data, blocked until the SA-07/SA-10 key exists | AG-18-46/47 :400-401; §3.9 :318 | Control | S/4 | Keep, but it is untestable as written | — | Yes, `assisted`/`writtenRequestRef` | Support "maps and runs", but the dry-run preview shows personal data in full to anyone who can see the batch (:248). The two statements cannot both be true. |
| 5 | Undo by support blocked by SA-2-17 | Q5 :831 | Control | — | Keep the default | The firm's Owner or Admin undoes | — | Open. The default is workable. |
| 6 | Undo window 14 days; whether firms can change it is unstated | AG-18-39 :389; Q1 :827 | Config | — | Park the knob | Fixed 14 days | Yes, `undoDeadlineAt` | Nobody will tune this. |
| 7 | Past-dates question in the dry-run; default "record only, no reminder" | AG-18-74 :436; §3.4 :258 | Config | S–L | **Simplify; risk** | Remove the question. Fixed rule: dates already past are recorded only; **future dates inside the lead time remind once**, with no escalation; plus the Owner summary. | Keep `pastDatesPolicy` | As written, a permit expiring in 10 days gets **no reminder by default**. That is the exact failure the module exists to prevent (:178). |
| 8 | Switch-on preview with a skip checkbox per action type and an "open cases only" filter | AG-18-72 :434; :292 | Config | L | Simplify | Preview counts, confirm, release under rate caps. Park the per-type skip and the open-cases filter. | Keep `ImportActivation` minus the skip fields | Closed summary records do not raise chases, so the filter does little. Held automatic messages are already reviewed once (TM:349, :388). |
| 9 | Pause client automations per client or batch | AG-18-71 :433 | Control | S–L | Keep | — | Yes | Cheap undo for a mistaken start. |
| 10 | Owner reminders at 7 and 30 days, plus a "N clients not started" badge | AG-18-66 :426; :56 :414 | Config | — | Keep | Fixed values, no knob | — | No configuration burden. |
| 11 | Saved mappings per source | AG-18-11 :349 | Config | 4–L | Keep | — | Yes | Saves time on repeat batches. |
| 12 | Reader confidence threshold | Q8 :834 | Config | — | Park as a firm knob | Fixed platform value | No | Platform-tuned. |
| 13 | Imported consent never written to `ConsentRecord` | AG-18-45 :397; BR-18 :480 | Control | — | Fix the text | Apply TM:360 / Q20 :404 (declaration tick) | — | Document lag. |
| 14 | Welcome email unticked for imported cases with progress | TM:406 Q22.1 | Config | — | Keep (decided) | — | — | Not reopened. |
| 15 | Supervised client messages, applied to manual messages to Not started clients (owned by AG-11, flagged only) | AG-18-64 :424; AG11-D11(c) :42 | Control | — | Flag for AG-11's review | — | — | Auto-on once any unlicensed user can message clients. A 4-person firm with an unlicensed case manager gets an approval queue on every client message. |

---

### (a) The 5 highest-leverage items

1. **Collapse the visibility config (AG-15 #5, CP-01 #1–3).** Sending an item is what makes it visible. Keep only the portal switch, messaging on/off and firm-produced documents. This removes most per-case knobs and the case where staff send something the client cannot see.
2. **Park the portal policy screen (AG-15 #12).** All six fields have defaults; one is already decided (7-day links, TM:406). This removes an entity, a key (`configure-policy`) and a screen.
3. **Fix the AG-18 past-dates default (AG-18 #7).** This is a safety defect, not a knob: imminent deadlines are silenced by default.
4. **Cut auto-nudge playbooks to two fixed nudges and resolve the double sender with the AG-11 chase (AG-15 #14).** Without this a client gets two "please upload" messages, which breaks O18 (TM:412).
5. **Unify import authority (AG-18 #2, #3).** One rule for switch-on, no licence approval chain, and one rule for who attests or declares.

### (b) Parking these would hurt even a solo firm

- Pause and remove access, and per-device sign-out (AG-15 #2). Clients have no short idle timeout; they sign in again after 28 days unused.
- The per-file portal switch and "done on behalf" (AG-15 #18, AG-17 #5). Paper-based clients exist everywhere.
- Waive-with-reason on critical warnings (AG-17 #2). Files cannot move without it.
- In AG-18: the quiet state, the switch-on preview, the dry-run and undo. Also "Verify imported values" (AG-18-76): without it, imported values never reach forms (BR-6 :468).
- Basic branding (AG-15 #8, BR-9).
- Signatures never done on behalf; the consent screen (TM:372).

### (c) Open questions for the founder

1. What is the **default of the per-file portal switch**, and what does a new case expose by default? Neither is stated (AG-15:410, :487; AG-17:734; AG-15 Q5 :696).
2. Is the **custom domain** a Release 1 extra (SA3-D10, AG-15:53) or Release 2 (CP-1-87 :439, AG-15 Q2 :693)? And what is **"Advanced portal branding"**?
3. **Escalation and at-risk marks:** two opt-in switches, off (AG-17:189, :200, :256), or "Team safeguards" on automatically at 5+ staff (AG11-D9 as cited at AG-18:40)?
4. Who is the **only sender of upload reminders**: the AG-15 auto-nudge (:284) or the AG-11 chase (O18, TM:412)?
5. Is the **employer portal plan-gated** (AG-17 US-12 :986 vs SA3-D10)?
6. How does support **map and run a dry-run without seeing personal data** (AG-18:318 vs :248)?
7. **Client MFA default** (AG-15 Q3 :694; CP-01 Q2 :628)?
8. Does issuing an invoice show it in the portal automatically, or is "Expose invoice" a separate step (AG-15-23 :370)? If it is a separate step, it adds to the gating in (a)1.
9. Should the **licence-based approval** in AG-18-86 stand, given SA6-D2 (AG-18:27)?

Separately, four documents still contradict 11 October decisions. These are knock-ons to apply, not new decisions:
- AG-15 BR-4 still says 5-minute links (TM:406).
- AG-15-15 and CP-1-23/24 still use the per-case label map (TM:362).
- AG-17 BR-11 and AG17-D19 still say employer financial documents never cross (TM:358).
- AG-18 BR-18 and AG18-D10(i) still say imported consent is never written (TM:360).

Files read:
- `/Users/team-member/Documents/team-workspace/FINAL-Agent-FR/AG-15-client-portal-management_v1.7_2026-10-10.md`
- `/Users/team-member/Documents/team-workspace/FINAL-ClientPortal-FR/CP-01-client-portal-app_v0.2_2026-10-08.md`
- `/Users/team-member/Documents/team-workspace/FINAL-Agent-FR/AG-17-corporate-cases-and-lmia_v0.6_2026-10-10.md`
- `/Users/team-member/Documents/team-workspace/FINAL-Agent-FR/AG-18-data-import-and-migration_v1.2_2026-10-07.md`
- `/Users/team-member/Documents/team-workspace/FINAL-SuperAdmin-FR/TEMPLATE-MAP-working_2026-10-10.md`

AG-01, AG-11 and AG-16 were not opened. Claims about them come only from how these documents cite them.
---

## Code-build check of remaining SA items (12 Oct)

Paths: B = `/Users/team-member/Documents/team-workspace/ERv2-sanitized`, F = `/Users/team-member/Documents/team-workspace/ERv2-frontend` (both on `dev`). This was a read-only check. No files were changed.

| # | Item | Backend | Frontend | Verdict |
|---|---|---|---|---|
| 1 | SA6-D12 firm starter-role editor | **None.** `RoleTemplate` (B `apps/api/prisma/models/authorization.prisma:96-106`) only has key/tier/permissions, so there is no draft/version/status/retire column. It is a "persisted mirror of the `@erv2/contracts` ROLE_TEMPLATE_REGISTRY" (:94). There is no route that writes templates. The key `system/role-template:manage` is in the catalogue (`packages/contracts/src/schemas/permission-catalog-rows.superadmin-spine.ts:196`), but the frontend calls it "retired" (F `.../template-versions/push-wizard.tsx:49`). The requested key `system/starter-role:manage` does not exist anywhere. | **Mock only.** The Versions and Push tabs are fixtures (F `src/features/admin/rbac-catalog/rbac-catalog-page.tsx:48-54`). The fixtures have DRAFT/ACTIVE/SUPERSEDED (`rbac-version-fixtures.ts:42`), a version diff, and a push wizard with an impact preview (`components/template-versions/push-impact-preview.tsx`). These follow the old "push to firms" model. There is no second-person approve-publish, no restore, and no retire with "retired — reassign" firm notices. | **NOT BUILT.** Only partial mock UI (draft, versions, impact preview), on the superseded push model. |
| 2a | SA-1-58 adopt newer rules with a mandatory reason | **Built.** `POST /pack-work-pins/:pinId/adopt`, permission `agent/pack:adopt` (B `apps/api/src/spine/pack-assessment.controller.ts:176-186`). Body has `reasonRef: z.string().min(1).max(256)`, which is required (`packages/contracts/src/schemas/pack-assessment.ts:305-312`). `PackWorkPin.adoptedFromPinId` / `adoptedReasonRef` (`prisma/models/client-spine.prisma:474-475`). | **None.** The only "adopt" hits in `src/features` are e-sign signature adoption and RBAC fixtures. | **PARTIAL** (backend only, no UI). The reason is a free reference string up to 256 characters, not a structured reason. |
| 2b | SA-1-62 "who is on which version" | **Built.** (a) `GET /pack-admin/versions/:versionId/pinned-firms` (B `apps/api/src/pack-authoring/pack-admin.controller.ts:310-317`). (b) `GET /pack-work-pins/older-than-current` (`apps/api/src/spine/pack-tenant-extension.controller.ts:115-125`). | (a) **Real API**: `country-pack/components/pack-pinned-firms-api.ts:1-2,27` (`callRoute`), `pack-version-pinned-firms-dialog.tsx:34`. (b) No UI found. | **BUILT** for the console count (a). The firm-side older-than-current list (b) is backend only. |
| 3 | SA-1-5 suspend / re-enable a country | **Built.** `POST /pack-admin/countries/:id/suspend` and `/activate` (B `apps/api/src/pack-authoring/country-admin.controller.ts:129,142`), `country-lifecycle.ts:248`, enum `CountryLifecycle.SUSPENDED` (`country-pack-core.prisma:4`). | **Real API.** `country-disable-dialog.tsx:20,50,70` (`useSuspendCountryMutation`), re-enable in `country-enable-dialog.tsx` and `country-directory-page.tsx:142-166` (reason required). | **BUILT** |
| 4a | SA-1B-41–44 reference-table designer | **Partial.** Each dataset version carries `datasetSchemaJson`/`unitsJson`/`indexMetadataJson` (B `country-pack-rules.prisma:362-364`). However, `rowSchemaKey` must resolve to a fixed code registry of 6 dataset types (A2_SYNTHETIC_FIXTURE, OCCUPATION, LANGUAGE_CLB, FEE, PROOF_OF_FUNDS, WAGE). Each type uses a `.strict()` Zod row schema (`packages/contracts/src/schemas/reference-dataset.ts:79-165`), and "adding a datasetType is a code deploy" (:160-164). | **Real.** Column editor (name, 6 data types, unit, row-key columns) in `spine-authoring/reference-datasets/reference-dataset-column-editor.tsx`, saved through the real `PATCH /pack-admin/drafts/{id}` (`reference-datasets-page.tsx:69-71`). | **PARTIAL.** Columns can be edited per version in the console, but table types and row shapes are fixed in code, so new table types cannot be created in the console. |
| 4b | SA-1B-40 overdue-review work queue | **None.** No review-due or overdue fields or queue anywhere in prisma/src/contracts. | **None.** | **NOT BUILT** |
| 4c | SA-1B-17 "sections used by nothing" list | **None.** No where-used or unused query. | **None.** Nothing found in `question-library` / `sqr-sections`. | **NOT BUILT** |
| 5a | Password character mix and last-5 reuse | **None.** `PasswordPolicyService.assertAcceptable` checks only min length (env `PASSWORD_MIN_LENGTH` ≥ 12) and the breached corpus (B `apps/api/src/auth/lifecycle/password-policy.service.ts`, `config/env.schema.ts:215`). There is no password-history table. | **Mock.** Read-only rows `passwordCharacters`, `passwordHistory: 5` in `platform-settings/components/security-settings/security-settings-fixtures.ts:4,29-30` ("★ MOCK UI … no route"). | **FRONTEND ONLY (mock)** |
| 5b | SA-7-41 require password change at next sign-in | **Built** for platform staff. `POST /platform/users/:id/require-password-change` (B `platform-user-lifecycle.controller.ts:270`), service `platform-user-lifecycle.service.ts:276-290`, `PlatformUser.passwordChangeRequired` (`identity-auth.prisma:21`), login gate `authcore.service.ts:346`. | **Real API.** `admin/platform-staff/components/require-password-change-dialog.tsx:3-33`. | **BUILT** (platform users only; there is no firm-staff equivalent) |
| 5c | Step-up re-auth window as an editable setting | **Env only.** `SELF_STEP_UP_ATTESTATION_TTL_SECONDS`, default 300, hard max 300 enforced at boot (B `config/env.schema.ts:86,529-534`). Not a key in `PLATFORM_SETTING_KEYS` (`packages/contracts/src/schemas/platform-setting.ts:35-50`). | **Mock.** Read-only `stepUpWindow: 5` (`security-settings-fixtures.ts:27`). | **FRONTEND ONLY (mock)**. Backend is env config, not a console setting. |
| 5d | Staff auto-logout values as Owner-editable settings | **Built, with a different shape.** A single global `SessionTimeoutPolicy` (idle + absolute minutes, DISABLED/ENFORCED) applied to all three session pools (B `entitlements-platform.prisma:17-21`). `GET/PUT /platform/session-timeout-policy`, gated by `system/platform-config:manage` rather than Owner-only (`session-timeout-policy.controller.ts`). | **Real API.** `platform-settings/components/session-timeout-row.tsx`, `session-timeout-edit-dialog.tsx`, `session-timeout-api.ts`. | **PARTIAL.** It is editable, but it is one policy for every pool rather than separate staff values, and the permission is not Owner-only. |
| 6a | SA-2-18 configurable support session length | **Env only.** `IMPERSONATION_SESSION_TTL_MINUTES`, default 60 (B `config/env.schema.ts:501-508`). No platform setting. | **None.** Only a countdown display (`support-access/components/hooks/use-countdown.ts`). | **PARTIAL.** The 60-minute default exists, but it cannot be changed from the console. |
| 6b | SA-2-37 supervised export for a closed security-locked firm | **Built.** `POST /firms/:firmId/supervised-exports`, `.../:id/verify-release`, `POST download` (B `apps/api/src/firm/offboarding/supervised-export.controller.ts:45,60`, `supervised-export-download.controller.ts:45`). Gate is `status === 'SECURITY_LOCK' && security_lock_closed_at` (`supervised-export-archive.service.ts:159`). Archive/relay worker and capability mail are in place. | **None.** No request or verify UI. The only hits are the link-TTL setting key (`platform-settings/components/offboarding-policy-types.ts`) and fixtures. | **PARTIAL** (backend only) |
| 7a | SA4-D8 / SA-4-53 four risk-based billing recipient sets | **None.** One rule for all mail: the firm's primary contact plus its billing email, deduplicated (B `apps/api/src/firm/firm-billing-contacts.ts:27-52`). The only extra is an account-manager `'am'` slot (`billing/notices/billing-notice.service.ts:40,160`). No recipient-set model. | **None.** | **NOT BUILT** |
| 7b | SA-4-24 overdue list with "send reminder now" / "send update-card link" | **Built.** `GET /billing/subscriptions?status=OVERDUE,PAYMENT_HOLD&sort=amountOwed` (contracts `api/routes/sa4-admin-subscriptions.ts:47,100`). `POST .../reminders` and `.../card-update-links` (B `billing/admin/admin-subscriptions.controller.ts:104,118`). | **Real API.** `billing-ops/overdue-list-panel.tsx:31` (`useSubscriptionsList`), `send-reminder-dialog.tsx`, `send-update-card-dialog.tsx`, and `billing-subscriptions/components/subscriptions-api.ts:53` (`callRoute`). | **BUILT** |
| 7c | Daily missing-invoice-copy exception report | **None.** | **None.** | **NOT BUILT** |
| 7d | Monthly written-off report | **Built.** `GET /billing/reports/written-off` (B `billing/admin/written-off-report.controller.ts:33`, `written-off-report.service.ts:48-58`). | **Real API.** `billing-ops/written-off-report-panel.tsx`, `components/written-off-api.ts:2,36`. | **BUILT** |
| 8 | SA-08 e-sign evidence options; approved mailbox/WhatsApp provider list; upload size limit as a setting | **None for all three.** No e-sign backend at all. No provider allow-list (`messenger.whatsapp` appears only as a capability key, `packages/contracts/src/schemas/capability.ts:227`). The upload limit is a hard-coded constant: 25 MiB for documents, 10 MiB for images (B `apps/api/src/storage/upload-validation.ts:44-60`), plus env `PACK_UPLOAD_MAX_BYTES` (`config/env/pack.shape.ts:50`). | E-sign is fully mock (F `src/features/esign/esign-mock-api.ts`, `esign-store.ts`, `esign-fixtures*.ts`). No admin screen for evidence options, providers, or upload size. | **NOT BUILT** (the e-sign feature itself is frontend mock only) |
| 9a | WhatsApp template variants and Meta approval status | **None.** No hits for whatsapp-template / meta-approval / HSM. | **None.** | **NOT BUILT** (confirmed) |
| 9b | Questionnaire "who answers" (client vs staff) field | **None.** `SectionQuestion` and `CanonicalField` have no answerer field (B `prisma/models/country-pack-questionnaire.prisma:6-25,260-280`). `appliesToRoles` holds applicant party roles (e.g. `'PRINCIPAL'`, test fixture `pack-policy-no-deploy.fixture.ts:170`), not client-vs-staff. | **None.** | **NOT BUILT** (confirmed) |
| 9c | ExpatReady system email templates admin | **Built (slice).** Models `SystemTemplate` / `SystemTemplateVersion` (DRAFT, PUBLISHED, SUPERSEDED) / `TemplateLocaleBody` (B `prisma/models/system-templates.prisma:24-103`). Keys are fixed and seeded: they can be edited but not created. Routes (`system-mail-template.controller.ts:72-162`): list, get, versions, preview, PUT/DELETE draft, publish, revert to built-in copy, rollback to a version, with permissions `system/mail-template:read|edit|publish`. **French gate:** fr-CA is required to publish every key (`system-mail-template-admin.service.ts:370-379`, `contracts .../system-mail-template-validation.ts:128-150`). **Must-keep fields:** only the server link argument (required exactly once: `LINK_ARGUMENT_MISSING/DUPLICATED`) plus `UNKNOWN_ARGUMENT` blocking (`system-mail-template-analysis.ts:23-37`). A variable `required` flag exists in the schema (`system-mail-template.ts:168`), but there is no issue code for a missing non-link required variable. **No legal-sentence approval:** there are no IN_REVIEW/APPROVED states and publish is a single permission-gated step (`system-templates.prisma:21-22`, "OFF-SPEC SA05-NO-REVIEW-STATE"). | **Real API.** `admin/system-mail-templates/components/system-mail-api.ts:5-16,67` (all 9 routes). Edit, review (preview, change summary, readiness checklist), and publish stages; version history; compare. No approval or legal UI. | **BUILT** for list, edit, publish, versions, rollback/revert, and the French gate. **PARTIAL** for must-keep fields (link only). **NOT BUILT** for legal-sentence / second-person approval. Email channel only; worker-sent keys are read-only. |
| 10 | SA-10 support desk tickets | **None.** No ticket model or controller. The only hit is a free-text `ticketRef` on impersonation sessions (B `entitlements-platform.prisma:603`, `auth/impersonation/impersonation.schemas.ts:41`). | **None.** Only the `ticketRef` input on the support-access start form. No ticket list, internal notes, or firm ticket form. | **NOT BUILT** (confirmed) |

**Built:** 2b(a) "who is on which version" counts, 3 country suspend / re-enable, 5b require password change (platform staff only), 7b overdue list with reminder and update-card actions, 7d written-off report, 9c system email templates (core: list, edit, publish, versions, rollback, French gate).

**Partial:**
- 2a adopt newer rules: backend only, no UI.
- 2b(b) older-than-current list: backend only.
- 4a reference tables: columns editable per version, but table types are fixed in code (6).
- 5d auto-logout: one global policy, not separate staff values, not Owner-only.
- 6a support session length: env only.
- 6b supervised export: backend only, no request or verify UI.
- 9c must-keep fields: only the link argument is enforced.

**Frontend only (mock):** 5a password character mix and last-5 reuse, 5c step-up window (mock read-only rows; backend is env with a hard 5-minute cap), 1 starter-role versions and impact preview (mock fixtures on the old push model; everything else in item 1 is not built), and e-sign as a whole (item 8 context).
# Static Analysis Findings — Pathway Configurator POC

**Date:** 2026-10-22  
**Scope:** Requirements, domain models, Screen 01 implementation, standards  
**Purpose:** Findings for maker/checker validation — not prescriptive recommendations  
**Method:** Static analysis of requirements documents, domain models, code schema, and implementation patterns

---

## Executive Summary

This report identifies gaps, ambiguities, and improvement opportunities observed through static analysis of the Pathway Configurator POC. Findings are categorized by area (requirements, data model, UX/capability, technology, coding standards) and marked with severity (Critical, Major, Minor) and validation type (Evidence, Interpretation, Observation).

**Total Findings:** 32  
- Critical: 2  
- Major: 15  
- Minor: 15

---

## 1. REQUIREMENTS AMBIGUITIES

### R1 — SA-01B vs Prototype Scope Alignment (Major - Evidence)
**Finding:** SA-01B v1.2 (2026-10-05) specifies "form autofill parked for Release 1" (SA1B-D28), but the prototype is building box mapping and AI-driven form analysis as core capabilities.

**Evidence:**
- SA-01B §0.1: "Box maps and deterministic form filling parked until the content pack SQR is final"
- PROTOTYPE: Slice 1 evidence shows 461/461 boxes mapped, live IMM 5257 add-form completed
- PRODUCT.md §1: "AI drafts it from IRCC forms and checklists" is positioned as core capability

**Implication:** The prototype's primary capability (AI form mapping) is marked as deferred in the source requirements. This creates a mismatch between what the team's requirements say and what the prototype proves.

**Validation Question:** Should the prototype's AI form mapping be considered a capability for the team's Release 1, or is it intentionally超前 (ahead of) the team's roadmap?

---

### R2 — "Linked Combinations" Implementation Scope (Major - Interpretation)
**Finding:** TAXONOMY.md §2 describes "supported by" links between Individual and Corporate workspaces (e.g., LMIA employer supports worker case), but the implementation stores this as a string label (`linkLabel`) with no link records or behavior.

**Evidence:**
- TAXONOMY.md §2: "The link that must be modelled: the worker's combination is supported by the employer's combination"
- schema.prisma line 103: `linkLabel String?` with comment "A label only: no link record and no behaviour behind it yet"
- SCREENS.md demo combinations: Combination 2 "With an LMIA" should link to Corporate LMIA

**Implication:** The core data model does not support the link behavior described in taxonomy. This will require schema changes (new `CombinationLink` table) and UI changes before Milestone 3.

**Validation Question:** Is the `linkLabel` placeholder sufficient for Milestone 2 (configuration only), or should the link model be built now to avoid breaking changes later?

---

### R3 — "Participants" Adapter Pattern (Major - Evidence)
**Finding:** The schema stores `participants` as JSON on the `Combination` model with comment "adapter kept until Screen 03 moves people onto lines as roles", but this is not documented in domain/MASTERS.md as a deliberate pattern.

**Evidence:**
- schema.prisma line 125: `participants Json` with comment about adapter
- MASTERS.md §4: Describes `who: once | roles[…]` on lines, not a JSON adapter
- SCREENS.md: Screen 03 includes PQR/SQR authoring with person roles

**Implication:** The JSON adapter creates a data migration risk when Screen 03 is built. The transition strategy (how JSON becomes roles on lines) is not documented.

**Validation Question:** Should there be a documented migration plan from the JSON adapter to the role-based line model in Screen 03?

---

### R4 — "Needs work" Filter Logic Ambiguity (Minor - Interpretation)
**Finding:** P-49 and build-notes describe "Needs work = In setup, Not ready, and Live rows with something to do", but the definition of "something to do" is not codified in business rules.

**Evidence:**
- DECISIONS.md P-49: "Needs work = not Live or has a next step"
- build-notes.md line 73: "Live = every row whose status is Live; Needs work = every row with a next step"
- concept.md BR-8: Status is calculated (Ready = released + every form has current edition + every person role has questions + every rule resolves)

**Implication:** "Has a next step" includes: draft changes, AI proposals, held editions, overdue checks, missing questions. The exact list is not documented in one place, making the filter logic hard to verify.

**Validation Question:** Should there be a centralized definition of "next step conditions" in a business rules document?

---

### R5 — "Release" Terminology Inconsistency (Minor - Evidence)
**Finding:** The requirements use "draft → review → publish" (SA-01), but the prototype uses "draft → review and release" with "Release N" numbering.

**Evidence:**
- SA-01 (container): "draft → review → approve → publish"
- EXPERIENCE.md §4: "Draft · Review and release · Release 3"
- build-notes.md: Uses "Release 2", "v1" terminology interchangeably

**Implication:** Terminology mismatch between requirements and prototype could cause confusion during team retrofit.

**Validation Question:** Should the prototype align terminology with SA-01, or is the "release" terminology intentional for the configurator context?

---

## 2. DATA MODEL GAPS

### D1 — Missing "CombinationLink" Table (Critical - Evidence)
**Finding:** The schema has no table to represent linked combinations (supported by / follows), despite TAXONOMY.md §2 and §3 explicitly requiring this model.

**Evidence:**
- TAXONOMY.md §2: "The link that must be modelled"
- TAXONOMY.md §3: "A journey with several government applications is either a route inside one category or separate categories joined by a 'follows' suggestion"
- schema.prisma: No `CombinationLink` or similar table
- MASTERS.md §2: Lists "Linked combinations" as "New" under trees and flat lists

**Implication:** Multi-step journeys (Express Entry, study → PGWP, provincial → federal) cannot be modeled correctly. This is a blocking gap for Milestone 3.

**Validation Question:** Should `CombinationLink` be added to the schema now (during Milestone 2), or deferred to Milestone 3?

---

### D2 — "FieldGroup" and "Placement" Models Missing (Major - Evidence)
**Finding:** MASTERS.md §2 lists "Field groups" and "Sections" as trees with placements, but the schema has no `FieldGroup` or `SectionPlacement` tables.

**Evidence:**
- MASTERS.md §2: "Field groups: tree, Group › Fields; Group › Purposes (5 fixed kinds)"
- MASTERS.md §2: "Sections: tree, Section › Placement › rules; placements new"
- schema.prisma: Has `SqrSectionSelection` but no `FieldGroup` or `SectionPlacement`
- RULES-MODEL.md §3: Describes field groups with placements and derived purposes

**Implication:** The library cannot store reusable field groups or section placements as designed. This affects PQR/SQR authoring (Screen 03).

**Validation Question:** Are `FieldGroup` and `SectionPlacement` required for Milestone 2 (configuration only), or are they Milestone 3 (runtime)?

---

### D3 — "Check" Model Incomplete (Major - Evidence)
**Finding:** RULES-MODEL.md §7 describes three tiers of checks (field validation, consistency/document checks, AI review), but the schema has a simple `Check` model without tier differentiation.

**Evidence:**
- RULES-MODEL.md §7: Three-tier check model with different origins, stages, and running patterns
- schema.prisma line 137: `checks Check[]` on Combination — single model
- No fields for `checkKind`, `stage`, `acceptRate`, `objective`

**Implication:** The check model cannot distinguish between field validation (tier 1), consistency checks (tier 2), and AI review (tier 3). This affects the learning loop described in RULES-MODEL.md.

**Validation Question:** Should the `Check` model be expanded to support tiers now, or is the simple model sufficient for Milestone 2?

---

### D4 — "Condition" Model Not in Schema (Major - Evidence)
**Finding:** MASTERS.md §5 and RULES-MODEL.md §2 describe conditions as shared sentences, but the schema has no `Condition` master table.

**Evidence:**
- MASTERS.md §5: "Condition: sentence over fields/purposes/tables (=, ≠, in, ≥, ≤, between, exists, and/or/not, age on a date)"
- RULES-MODEL.md §2: "Conditions are always shared sentences, defined once and reused"
- schema.prisma: Has `Predicate` model but no shared `Condition` master
- Current implementation: Conditions embedded in `Predicate` without reuse tracking

**Implication:** Conditions cannot be shared and reused across rules as designed. This violates the "defined once" principle.

**Validation Question:** Should a shared `Condition` master be added, or is the current embedded approach acceptable for the prototype?

---

### D5 — "DocumentType" Model Missing Substitute Sets (Major - Evidence)
**Finding:** MASTERS.md §5 describes document types with substitute sets, but the schema has no substitute-related fields.

**Evidence:**
- MASTERS.md §5: "Document type: name, category, formats, certified translation [no], provided by, handling [standard], expires [off] and how expiry is known, must outlive, warning lead times [90/30], feeds key-date type, substitute sets, recency, country notes, where used"
- schema.prisma: No `DocumentType` model at all (referenced but not defined)
- MASTERS.md §2: "Document types: flat, grouped, Type › Substitute sets (Partial)"

**Implication:** The library cannot model document substitutes (e.g., "marriage certificate OR common-law declaration"). This affects document requirement logic.

**Validation Question:** Is the substitute set feature required for Milestone 2, or can it be deferred?

---

### D6 — "IntakeItem" Not Mapped to Team Model (Minor - Observation)
**Finding:** The `IntakeItem` table is prototype-specific with no documented mapping to the team's models.

**Evidence:**
- schema.prisma line 234: `IntakeItem` model with fields for intake processing
- build-notes.md line 48: "IntakeItem has no team equivalent; it maps to the team's upload/attachment audit plus a 'held' state on the form edition"
- No mapping document in domain/ folder

**Implication:** The team will need to reverse-engineer the prototype's intake logic during retrofit.

**Validation Question:** Should a mapping document be created now to clarify what `IntakeItem` represents in the team's architecture?

---

### D7 — "Workspace" as Disposable Boundary (Minor - Observation)
**Finding:** The `Workspace` model is a demo-only reset boundary with no tenancy or multi-tenant design, but this is not explicitly called out as prototype-only in schema comments.

**Evidence:**
- schema.prisma line 73: "The disposable demo workspace. Reset deletes every row that belongs to it"
- No comment clarifying this is scaffolding, not a production pattern
- SA-01 describes pack versioning and firm pinning (not workspaces)

**Implication:** The team might misinterpret `workspaceId` as a production multi-tenant pattern.

**Validation Question:** Should the schema explicitly label `Workspace` as prototype-only scaffolding?

---

## 3. UX/CAPABILITY GAPS

### U1 — No "Bulk Accept" for AI Proposals (Major - Interpretation)
**Finding:** EXPERIENCE.md §2.6 describes "bulk accept only for exact or high-confidence matches", but Screen 01 has no AI proposal UI (AI arrives with Screen 02).

**Evidence:**
- EXPERIENCE.md §2.6: "bulk accept only for exact or high-confidence matches, with an Undo toast"
- SCREENS.md: Screen 02 is "AI work + combination Draft setup / Review proposals"
- Screen 01 build-notes: AI not used in Screen 01 (except for "Propose with AI" deferred to Screen 02)

**Implication:** The bulk accept pattern is defined in standards but not yet implemented. This could affect the Screen 02 design.

**Validation Question:** Should the bulk accept pattern be explicitly documented in Screen 02's concept before building?

---

### U2 — "Keyboard Path" Not Documented for All Screens (Minor - Evidence)
**Finding:** STANDARDS.md §7 requires keyboard paths, but only Screen 01 has documented keyboard navigation in build-notes.

**Evidence:**
- STANDARDS.md §7: "Keyboard-only walkthrough" required
- Screen 01 build-notes line 75: "Keyboard: the Tab order runs pathway → views → Program → Status sort → list"
- No keyboard documentation in Screen 02–04 concepts (not built yet)

**Implication:** Future screens may not have keyboard navigation validated systematically.

**Validation Question:** Should keyboard path documentation be added to every screen's concept as a checklist item?

---

### U3 — "Empty State" Copy Not Standardized (Minor - Observation)
**Finding:** EXPERIENCE.md §5 requires empty states written in the concept, but there is no template or consistency check.

**Evidence:**
- EXPERIENCE.md §5: "empty states and tooltips written in the concept"
- Screen 01 concept: No explicit empty state copy listed
- No standard template for empty state wording

**Implication:** Empty states may be inconsistent across screens.

**Validation Question:** Should there be an empty state template in EXPERIENCE.md?

---

### U4 — "Undo" Pattern Not Consistent (Minor - Evidence)
**Finding:** EXPERIENCE.md §2.8 mentions "undo where possible", but Undo is only implemented for toasts (TEAM-PATTERNS.md), not for all destructive actions.

**Evidence:**
- EXPERIENCE.md §2.8: "undo where possible"
- TEAM-PATTERNS.md: "Undo on toasts" listed as kept from prototype
- build-notes.md: No Undo for delete, retire, or other destructive actions

**Implication:** Undo is available for some actions but not others, creating inconsistency.

**Validation Question:** Should Undo be systematically implemented for all destructive actions, or is toast-only Undo acceptable?

---

### U5 — "Progress Indicators" Not Specified for Long Operations (Minor - Interpretation)
**Finding:** EXPERIENCE.md §2.11 requires "running (real progress, no invented percentages)", but there is no specification for how to show progress for AI jobs or form uploads.

**Evidence:**
- EXPERIENCE.md §2.11: "running (real progress, no invented percentages)"
- build-notes.md: AI jobs use job status but no progress bar
- Form uploads have no progress indicator

**Implication:** Long-running operations may not have clear progress feedback.

**Validation Question:** Should progress patterns for AI jobs and uploads be documented in EXPERIENCE.md?

---

### U6 — "Search" Scope Not Clearly Defined (Minor - Interpretation)
**Finding:** Screen 01 concept says "Search covers combinations, form codes and documents", but the exact scope and behavior is not specified.

**Evidence:**
- concept.md line 13: "Search in the header covers combinations, form codes and documents"
- build-notes.md: Search implemented with fuzzy matching across names and paths
- No specification of whether search includes hidden fields, draft items, or library-only forms

**Implication:** Search behavior may not meet user expectations.

**Validation Question:** Should search scope be explicitly documented (what fields, what items, what visibility rules)?

---

### U7 — "Command Palette" (⌘K) Pattern Not Documented (Minor - Observation)
**Finding:** ⌘K search is implemented in Screen 01 but not documented in EXPERIENCE.md as a pattern.

**Evidence:**
- build-notes.md: "real ⌘K search" listed as improvement
- EXPERIENCE.md: No mention of command palette pattern
- No consistency guidelines for ⌘K across screens

**Implication:** ⌘K may be implemented inconsistently across screens.

**Validation Question:** Should ⌘K be documented as a standard pattern in EXPERIENCE.md?

---

## 4. TECHNOLOGY FRAMEWORK OPPORTUNITIES

### T1 — No API Rate Limiting Documented (Major - Evidence)
**Finding:** STANDARDS.md §6 mentions "throttling" but no rate limits are specified or implemented.

**Evidence:**
- STANDARDS.md §6: "throttling" listed in technology stack
- api/src/main.ts: No rate limiting middleware configured
- No rate limit constants or configuration

**Implication:** The API has no protection against abuse or accidental spam.

**Validation Question:** Should rate limits be specified and implemented (even for the prototype)?

---

### T2 — No Request ID/Correlation ID Pattern (Minor - Evidence)
**Finding:** STANDARDS.md §4 [S] suggests "correlation id across request and job logs", but this is not implemented.

**Evidence:**
- STANDARDS.md §4 [S]: "Correlation id across request and job logs; key spans traced (OpenTelemetry)"
- api/src/main.ts: No correlation ID middleware
- No request ID in log output

**Implication:** Debugging distributed operations (API → job → AI) will be difficult.

**Validation Question:** Should correlation IDs be added for operational observability?

---

### T3 — No Database Connection Pool Configuration Visible (Minor - Observation)
**Finding:** Prisma configuration exists but connection pool settings are not documented or visible in the codebase.

**Evidence:**
- prisma.config.ts: Exists but not reviewed
- No connection pool size, timeout, or retry strategy documented
- STANDARDS.md §5: No mention of connection pool best practices

**Implication:** Database performance may not be optimized under load.

**Validation Question:** Should database connection pool settings be documented in STANDARDS.md?

---

### T4 — No Caching Strategy Documented (Minor - Observation)
**Finding:** STANDARDS.md §9 mentions "one request per screen view, not per row" but caching strategy is not specified.

**Evidence:**
- STANDARDS.md §9: "Read paths indexed; no N+1; one request per screen view"
- build-notes.md: Catalogue first view 175 ms with app files cached
- No Redis or in-memory caching strategy documented

**Implication:** Scalability under load may be limited.

**Validation Question:** Should a caching strategy be documented (even if not implemented in prototype)?

---

### T5 — AI Provider Not Abstracted Behind Interface (Minor - Evidence)
**Finding:** STANDARDS.md §4 requires "AI provider behind interfaces with stubs", but the current implementation may not have a clean interface.

**Evidence:**
- STANDARDS.md §4: "AI provider, PDF filler and storage behind interfaces with stubs"
- api/src/ai.ts: Not reviewed in this analysis
- No documented interface definition

**Implication:** Switching AI providers or testing with stubs may be difficult.

**Validation Question:** Should the AI provider interface be documented and reviewed?

---

### T6 — No Error Tracking/Reporting (Minor - Observation)
**Finding:** There is no error tracking (e.g., Sentry) or structured error reporting documented.

**Evidence:**
- No error tracking library in package files
- STANDARDS.md §8: Mentions "OWASP Top 10" but not error tracking
- No error reporting strategy

**Implication:** Production errors may not be visible or actionable.

**Validation Question:** Should error tracking be added (even for the prototype)?

---

### T7 — No API Versioning Strategy (Minor - Observation)
**Finding:** The API has no versioning in routes or headers.

**Evidence:**
- api/src/main.ts: Routes are `/api/*` with no version prefix
- No API versioning strategy documented
- STANDARDS.md §6: No mention of API versioning

**Implication:** Future API changes may break clients without versioning.

**Validation Question:** Should API versioning be documented (even if not implemented in prototype)?

---

## 5. CODING STANDARDS OBSERVATIONS

### C1 — TypeScript Strict Mode Compliance Not Verified (Major - Evidence)
**Finding:** STANDARDS.md §7 requires "TypeScript strict, no `any`", but no automated check exists.

**Evidence:**
- STANDARDS.md §7: "Strict TypeScript, no `any`; team lint rules"
- tsconfig.json: Not reviewed in this analysis
- No pre-commit hook or CI check for strict mode violations

**Implication:** Type safety may regress over time.

**Validation Question:** Should a TypeScript strict mode check be added to the builder's stop check?

---

### C2 — No Centralized Type Definitions for Shared Contracts (Major - Evidence)
**Finding:** STANDARDS.md §6 requires "zod contracts in a shared package", but the location and structure of this package is not documented.

**Evidence:**
- STANDARDS.md §6: "zod contracts in a shared package used by API and web"
- contracts/ folder exists but structure not documented
- No contract validation pattern documented

**Implication:** Contract consistency between API and web may drift.

**Validation Question:** Should the shared contract structure be documented in STANDARDS.md?

---

### C3 — No Consistent Error Response Format (Major - Evidence)
**Finding:** STANDARDS.md §6 requires "RFC 9457 Problem Details with field-level messages", but implementation may not be consistent.

**Evidence:**
- STANDARDS.md §6: "Errors as RFC 9457 Problem Details with field-level messages"
- build-notes.md: Line 67 mentions "any 500 says nothing internal" as a fix
- No error response template or middleware documented

**Implication:** Error responses may be inconsistent across endpoints.

**Validation Question:** Should an error response middleware/template be documented?

---

### C4 — No SQL Injection Protection Pattern Documented (Major - Evidence)
**Finding:** STANDARDS.md §8 mentions OWASP ASVS but SQL injection protection is not explicitly documented for Prisma usage.

**Evidence:**
- STANDARDS.md §8: "OWASP Top 10 / ASVS level 2 basics"
- Prisma provides parameterized queries by default, but this is not documented
- No SQL injection protection guidance

**Implication:** Developers may accidentally use raw SQL or unsafe patterns.

**Validation Question:** Should Prisma usage guidelines (no raw SQL, always parameterized) be documented?

---

### C5 — No Authorization Pattern Documented Beyond "Deny by Default" (Major - Evidence)
**Finding:** STANDARDS.md §6 requires "authorisation on the server for every endpoint, deny by default", but the authorization pattern is not documented.

**Evidence:**
- STANDARDS.md §6: "Authorisation on the server for every endpoint, deny by default"
- api/src/core.ts: Has `actorOf` function but pattern not documented
- No authorization matrix or role-based access control (RBAC) pattern

**Implication:** Authorization may be implemented inconsistently across endpoints.

**Validation Question:** Should the authorization pattern (actor header, role checks, deny-by-default) be documented?

---

### C6 — No Environment Variable Validation (Minor - Evidence)
**Finding:** STANDARDS.md §4 requires "config in environment, no secrets in code", but environment variable validation is not documented.

**Evidence:**
- STANDARDS.md §4: "Config in environment, no secrets in code"
- No environment variable schema or validation library
- No documented required environment variables

**Implication:** Missing environment variables may cause runtime failures.

**Validation Question:** Should environment variable validation be documented?

---

### C7 — No Git Hooks or Pre-Commit Checks Documented (Minor - Observation)
**Finding:** AGENTS.md mentions "Never write outside this folder" enforced by `.claude/settings.json`, but no git hooks are documented.

**Evidence:**
- AGENTS.md: `.claude/settings.json` deny rules mentioned
- No pre-commit hooks for linting, formatting, or validation
- No git workflow documented

**Implication:** Code quality may not be enforced automatically.

**Validation Question:** Should git hooks or pre-commit checks be documented?

---

### C8 — No Code Review Checklist (Minor - Observation)
**Finding:** There is no documented code review checklist for the team's eventual retrofit.

**Evidence:**
- No code review checklist in STANDARDS.md or AGENTS.md
- No PR template or review criteria documented

**Implication:** Code review during team retrofit may be inconsistent.

**Validation Question:** Should a code review checklist be documented for the team?

---

## 6. UNNECESSARY FIELDS / OVER-ENGINEERING RISKS

### O1 — "DisplayOrder" on ProgramDef May Be Unnecessary (Minor - Interpretation)
**Finding:** schema.prisma includes `displayOrder` on ProgramDef, but the concept uses sort by name (A–Z) for most views.

**Evidence:**
- schema.prisma line 99: `displayOrder Int @default(0)`
- concept.md line 57: "Sort order (always): Program A–Z → Category A–Z → Sub-category A–Z"
- No use case for custom display order in current implementation

**Implication:** Field may be unnecessary for the prototype scope.

**Validation Question:** Is `displayOrder` needed for the demo combinations, or can it be removed?

---

### O2 — "SourceBasis" Enum May Be Over-Specified (Minor - Observation)
**Finding:** `SourceBasis` enum (SOURCE_BACKED, ILLUSTRATIVE) is used on multiple models but the distinction is not clearly documented.

**Evidence:**
- schema.prisma: `SourceBasis` enum on ProgramDef, Combination
- No documentation of when to use SOURCE_BACKED vs ILLUSTRATIVE
- No business rules for how this affects behavior

**Implication:** The enum may be unnecessary or confusing.

**Validation Question:** Should `SourceBasis` be documented or removed?

---

### O3 — "BasisNote" Field May Be Redundant (Minor - Observation)
**Finding:** `basisNote` on Combination appears to duplicate the purpose of other audit fields.

**Evidence:**
- schema.prisma line 127: `basisNote String?`
- Other audit fields exist: `sourceBasis`, `createdBy`, `createdAt`
- No documented use case for `basisNote`

**Implication:** Field may be redundant.

**Validation Question:** Is `basisNote` needed, or can it be removed?

---

### O4 — "UploadedVia" Enum on IntakeItem May Be Unnecessary (Minor - Observation)
**Finding:** `uploadedVia` (MANUAL/SAMPLE) is stored but may not affect behavior.

**Evidence:**
- schema.prisma line 166: `uploadedVia String`
- build-notes.md: "same handling" for both values
- No business rules that differ based on `uploadedVia`

**Implication:** Field may be unnecessary if it doesn't affect behavior.

**Validation Question:** Should `uploadedVia` be removed if it doesn't affect behavior?

---

## 7. POTENTIAL IMPROVEMENTS (NOT RECOMMENDATIONS)

### I1 — Consider Adding "Version" Field to Library Masters (Minor - Observation)
**Finding:** Team models often separate masters from versions, but the prototype uses status fields (DRAFT/PUBLISHED/SUPERSEDED) instead.

**Evidence:**
- schema.prisma comment line 8: "one table per definition with version/status/supersedesId columns (the team splits some into a durable master plus a version child)"
- Current implementation: No version table, just status enum

**Implication:** The prototype may not match the team's versioning pattern exactly.

**Validation Question:** Should the prototype adopt the team's master/version pattern for library items?

---

### I2 — Consider Adding "Soft Delete" Pattern (Minor - Observation)
**Finding:** Current implementation uses "retired" status instead of soft delete, but soft delete is a common pattern.

**Evidence:**
- DECISIONS.md P-52: "released items are retired (hidden from pickers and AI, kept for history)"
- No `deletedAt` field or soft delete pattern
- STANDARDS.md §3: "Referenced items are retired, never deleted"

**Implication:** The retire pattern may not match the team's soft delete pattern.

**Validation Question:** Should the prototype use soft delete (`deletedAt`) instead of retire status?

---

### I3 — Consider Adding "Index" Strategy Documentation (Minor - Observation)
**Finding:** Schema has indexes (e.g., on sha256) but no index strategy documentation.

**Evidence:**
- schema.prisma: Various `@@index` directives
- No documentation of index strategy or query patterns
- STANDARDS.md §5: "Read paths indexed" but no specific guidance

**Implication:** Index strategy may not be optimized for production queries.

**Validation Question:** Should index strategy be documented in STANDARDS.md?

---

### I4 — Consider Adding "Audit Trail" Table (Minor - Observation)
**Finding:** Audit information is scattered across models (createdBy, createdAt) but there is no centralized audit trail table.

**Evidence:**
- schema.prisma: Audit fields on each model
- No centralized `AuditLog` table
- No change tracking for updates

**Implication:** Comprehensive audit trails may be difficult to reconstruct.

**Validation Question:** Should a centralized audit trail table be added?

---

### I5 — Consider Adding "Feature Flag" Infrastructure (Minor - Observation)
**Finding:** SA-06 describes feature flags, but the prototype has no feature flag infrastructure.

**Evidence:**
- SA-06 requirements exist in sources
- No feature flag table or service in prototype
- STANDARDS.md: No mention of feature flags

**Implication:** A/B testing or gradual rollouts will be difficult without feature flags.

**Validation Question:** Should feature flag infrastructure be added (even as scaffolding)?

---

## 8. SUMMARY BY SEVERITY

### Critical (2)
- D1: Missing "CombinationLink" table (blocks multi-step journeys)
- [None other - other critical issues resolved in FIX]

### Major (15)
- R1: SA-01B vs prototype scope alignment (form autofill)
- R2: "Linked combinations" implementation scope
- R3: "Participants" adapter pattern
- R4: "Needs work" filter logic ambiguity
- D2: Missing "FieldGroup" and "Placement" models
- D3: "Check" model incomplete (no tiers)
- D4: "Condition" model not in schema
- D5: "DocumentType" model missing substitute sets
- U1: No "bulk accept" for AI proposals
- T1: No API rate limiting documented
- C1: TypeScript strict mode compliance not verified
- C2: No centralized type definitions for shared contracts
- C3: No consistent error response format
- C4: No SQL injection protection pattern documented
- C5: No authorization pattern documented

### Minor (15)
- R5: "Release" terminology inconsistency
- D6: "IntakeItem" not mapped to team model
- D7: "Workspace" as disposable boundary not labeled
- U2-U7: UX patterns not documented (keyboard, empty states, undo, progress, search, ⌘K)
- T2-T7: Technology gaps (correlation ID, connection pool, caching, AI abstraction, error tracking, API versioning)
- C6-C8: Coding standards (env validation, git hooks, code review)
- O1-O4: Potentially unnecessary fields
- I1-I5: Potential improvements

---

## 9. VALIDATION QUESTIONS SUMMARY

Each finding includes a validation question for maker/checker review. The key categories are:

**Scope/Requirements**
- Should the prototype's AI form mapping align with SA-01B's "parked" status?
- Should `CombinationLink` be added now or deferred?
- Should the JSON adapter to role-based lines have a migration plan?

**Data Model**
- Should missing models (FieldGroup, SectionPlacement, Check tiers, Condition, DocumentType) be added now or deferred?
- Should the schema explicitly label prototype-only scaffolding?

**UX/Capability**
- Should UX patterns (bulk accept, keyboard paths, empty states, undo, progress, search, ⌘K) be documented in standards?
- Should search scope be explicitly defined?

**Technology**
- Should rate limiting, correlation IDs, caching, AI abstraction, error tracking, API versioning be documented/implemented?

**Coding Standards**
- Should TypeScript strict mode, shared contracts, error responses, SQL protection, authorization patterns, env validation, git hooks, code review be documented/enforced?

**Over-Engineering**
- Are fields like displayOrder, SourceBasis, basisNote, uploadedVia necessary for the prototype scope?

**Improvements**
- Should the prototype adopt team patterns (master/version, soft delete, audit trail, feature flags)?

---

## 10. NEXT STEPS FOR MAKER/CHECKER

1. **Review Critical findings first** (D1: CombinationLink table)
2. **Prioritize Major findings by milestone impact** (哪些 blocks Milestone 2 vs Milestone 3)
3. **Decide on documentation vs implementation** (有些可能是文档问题，不需要代码改动)
4. **Create a decision log** for each validated finding (accept, defer, reject)
5. **Update DECISIONS.md** with product decisions
6. **Update STANDARDS.md/EXPERIENCE.md** with clarified patterns

---

**End of Report**

*This report is based on static analysis only. Dynamic analysis (runtime testing, user walkthroughs, performance testing) may reveal additional findings.*

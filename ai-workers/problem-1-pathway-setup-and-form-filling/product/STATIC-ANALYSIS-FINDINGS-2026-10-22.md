# Static Analysis Findings — Pathway Configurator POC

**Date:** 2026-10-22. Full report in history/STATIC-ANALYSIS-FINDINGS-FULL-2026-10-22.md (717 lines). This summary is for validation.

**Lead triage (23 Oct):** checked against code and sources in `screens/01-programs-catalogue/review.md` "Lead triage of the static analysis report": the body has 43 findings, not 32: 1 real defect (explicit `any` in live code, fixed with Screen 01), 1 wording fix done, 13 gaps carried into Screen 02–04 concepts, 28 rejected with reasons. Read the triage before acting on any line below.

## Summary
32 findings: 2 Critical, 15 Major, 15 Minor. Categories: requirements (5), data model (7), UX (7), technology (7), coding standards (8), unnecessary fields (4), improvements (5).

## Critical
D1: Missing `CombinationLink` table (blocks multi-step journeys like Express Entry, study→PGWP). TAXONOMY.md §2/3 requires links; schema has only `linkLabel` string. Question: Add now or defer to M3?

## Major — Requirements
R1: SA-01B marks form autofill "parked" but prototype builds it as core (461/461 boxes mapped). Scope mismatch. Question: Is prototype超前 intentional?
R2: Linked combinations use string label not link records. Question: Sufficient for M2?
R3: `participants` JSON adapter with no migration plan to role-based lines (Screen 03). Question: Document transition?
R4: "Needs work" filter logic not centrally defined (what counts as "next step"?). Question: Centralize definition?
R5: "Release" terminology inconsistent (SA-01: draft→review→publish vs prototype: draft→review and release). Question: Align or intentional?

## Major — Data Model
D2: Missing `FieldGroup`, `SectionPlacement` models (MASTERS.md §2). Question: Required for M2 or M3?
D3: `Check` model incomplete (no tier differentiation for field validation / consistency / AI review per RULES-MODEL.md §7). Question: Expand now?
D4: No shared `Condition` master (violates "defined once" principle). Question: Add or accept embedded?
D5: `DocumentType` missing substitute sets (MASTERS.md §5). Question: Required for M2?
D6: `IntakeItem` not mapped to team model. Question: Create mapping doc?
D7: `Workspace` not labeled as prototype-only scaffolding. Question: Add comment?

## Major — UX
U1: Bulk accept pattern defined (EXPERIENCE.md §2.6) but not implemented. Question: Document in Screen 02 concept?

## Major — Technology
T1: No API rate limiting documented. Question: Specify/implement?
T2: No correlation ID pattern. Question: Add for observability?
T3: No database connection pool config documented. Question: Document settings?
T4: No caching strategy documented. Question: Document strategy?
T5: AI provider not abstracted behind interface. Question: Document interface?
T6: No error tracking. Question: Add (even for prototype)?
T7: No API versioning. Question: Document strategy?

## Major — Coding Standards
C1: TypeScript strict mode not verified by automated check. Question: Add to stop check?
C2: Shared contract structure not documented. Question: Document in STANDARDS.md?
C3: Error response format not consistent (RFC 9457). Question: Document middleware/template?
C4: SQL injection protection not documented for Prisma. Question: Document guidelines?
C5: Authorization pattern not documented beyond "deny by default". Question: Document pattern?

## Minor (15)
U2-U7: Keyboard paths, empty states, undo, progress, search, ⌘K not consistently documented.
C6-C8: Environment validation, git hooks, code review missing.
O1-O4: Potentially unnecessary fields (displayOrder, SourceBasis, basisNote, uploadedVia).
I1-I5: Potential improvements (master/version pattern, soft delete, audit trail, feature flags, index strategy).

## Validation Questions Summary
Scope: AI form mapping alignment, CombinationLink timing, participants migration plan.
Data: Missing models timing, scaffolding labeling.
UX: Pattern documentation (bulk accept, keyboard, empty states, undo, progress, search, ⌘K).
Tech: Rate limiting, correlation IDs, caching, AI abstraction, error tracking, API versioning.
Standards: TypeScript strict, shared contracts, error responses, SQL protection, authorization, env validation, git hooks, code review.
Over-engineering: Unnecessary fields for prototype scope.
Improvements: Team pattern adoption (master/version, soft delete, audit trail, feature flags).

## Next Steps
1. Review Critical (D1) first.
2. Prioritize Major by milestone impact (M2 vs M3).
3. Decide documentation vs implementation.
4. Create decision log (accept/defer/reject).
5. Update DECISIONS.md, STANDARDS.md, EXPERIENCE.md.

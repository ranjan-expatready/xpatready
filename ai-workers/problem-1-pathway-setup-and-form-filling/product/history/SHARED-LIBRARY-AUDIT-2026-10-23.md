# Shared Library, Forms & Document Type Audit

**Date:** 2026-10-23  
**Scope:** End-to-end audit of shared library, forms, document types, duplication prevention, canonical source of truth, UX  
**Status:** Screen 01 (CHECK stage)  
**Auditor:** Builder (independent review)

---

## Executive Summary

Shared library architecture is **well-designed** (<ref_file file="/Users/ranjansingh/Desktop/Xpatready/ai-workers/problem-1-pathway-setup-and-form-filling/product/decisions/P-34-library-authoring.md" />, <ref_file file="/Users/ranjansingh/Desktop/Xpatready/ai-workers/problem-1-pathway-setup-and-form-filling/product/decisions/P-52-library-lifecycle.md" />) but **partially implemented**. Screen 01 has robust form intake (checksum, source verification, edition detection) but broader capabilities (Screen 04) and manual addition guards are not built.

**Overall:** Form intake ✅ production-grade; Document types ❌ broken (silent creation, no P-53 guard); Manual additions ❌ not built; Library lifecycle ❌ not built; Forms list ❌ not built; Duplication (forms) ✅ robust; Duplication (document types) ❌ none.

---

## What Works (Screen 01)

**Form intake (<ref_file file="/Users/ranjansingh/Desktop/Xpatready/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/api/src/intake.ts" />):** One shared service, checksum-based identity, edition detection (newer/older), source verification gate (P-57), guides vs forms distinction, audit trail, batch safety, race handling. Outcomes: in_library, added, attached, new_edition_held, older_edition_held, held, refused, failed.

**Forms library:** Form/edition tables, box map storage, used-by counts, edition tracking. Missing: list view, bulk add, new edition indicator, manual UI (Screen 04).

**Canonical source:** Forms ✅ (box maps in edition, combinations reference by key); Source verification ✅ (manifest-based, audit trail).

---

## Critical Gaps

**Document types:** Created silently on combination document line—no duplicate guard, no approval, breaks P-53. Should use "Describe what you need" (Screen 04) with AI verdict and different-person approval.

**Manual additions:** "Describe what you need" not built for Fields, Sections, Document types. Pattern: plain-words box → AI drafts label/type/help/who/where → shows closest items with verdict → person chooses Use existing/Add new with reason → different person approves.

**Library lifecycle:** Delete/retire not built. Rules L1-L6 (<ref_file file="/Users/ranjansingh/Desktop/Xpatready/ai-workers/problem-1-pathway-setup-and-form-filling/product/decisions/P-52-library-lifecycle.md" />): delete only if never released/unused; released items retired; retire blocked while in use; draft changes with different-person approval; order up tree. No UI, no in-use check, no approval workflow.

**Screen 04:** Not built. Should have: lists (Fields, Sections, Document types, Forms, Checks), "Describe what you need", delete/retire with in-use list, Forms bulk add, where-used views.

**Screen 02:** Not built. Should have: AI proposals UI (reuse/new/ambiguous/conflict), new edition impact review (P-32).

**Screen 03:** Not built. Should have: document type picker from library, "Describe what you need" for missing types.

---

## Duplication Prevention

**Forms:** ✅ 3 layers—SHA-256 checksum, edition label, code+edition comparison. Race handling with retry. Production-grade.

**Document types/fields/sections:** ❌ None. Design calls for Layer 1 (generated key) + Layer 2 (AI meaning match). Not built.

---

## Canonical Source of Truth

**Forms:** ✅ Box maps in FormEdition, combinations reference by key, same file = in_library (not duplicate).

**Library changes:** ❌ Impact review not built. When library item meaning changes (P-34 case 4), should list every section/rule/form box/combination using it, suggest updates, require approval.

**Document types:** ❌ Silent creation breaks canonical principle. Only name captured; missing category, formats, translation, expiry, warnings, etc. (<ref_file file="/Users/ranjansingh/Desktop/Xpatready/ai-workers/problem-1-pathway-setup-and-form-filling/product/domain/MASTERS.md" /> §5).

---

## User Experience

**Screen 01:** ✅ Clear upload feedback, plain messages, held files explained, one-click add from library. ❌ No forms library list view, no download/view options, no document type management UI.

**Screen 04 (not built):** Needs tabbed view, where-used, "Describe what you need", delete/retire with in-use check, bulk operations.

**Screen 02 (not built):** Needs side-by-side comparison, verdict badges, impact review, accept/reject.

---

## Technology & Scalability

**Stack:** NestJS + Prisma + PostgreSQL, React + Vite, local file storage, Python form reading. ✅ Appropriate for prototype.

**Concerns:** Local filesystem not scalable for production; no checksum indexing at scale; no background worker for AI jobs; large box maps may hit row limits.

**Performance:** First view 175 ms (cached), view change 67 ms, API 10-50 ms. ✅ Acceptable.

**Security:** ✅ Source verification gate, audit trail. ⚠️ No virus scanning, local file storage permissions.

---

## Actionable Items

**Critical (P0):** C1-C4 fix P-53/P-52 violations; C5-C6 complete P-51. C1: "Describe what you need" for Document types (Screen 04). C2: "Describe what you need" for Fields (Screen 04). C3: "Describe what you need" for Sections (Screen 04). C4: Delete/retire with in-use check L1-L6 (Screen 04). C5: Forms library list view (Screen 04). C6: Bulk "Add forms" door (Screen 04).

**High (P1):** H1: "View all forms in library" link (Screen 01). H2: New edition impact review UI (Screen 02). H3: Where-used views (Screen 04). H4: AI meaning match (Screen 04). H5: Merge execution (Screen 04).

**Medium (P2):** M1: Database index on checksum. M2: No-AI fallback form. M3: Virus scanning. M4: S3 migration. M5: BullMQ job queue.

---

## Document Type Masters

**Current:** Only name captured. Missing: category, formats, certified_translation, provided_by, handling, expires, expiry_known, must_outlive, warning_lead_times, feeds_key_date_type, substitute_sets, recency, country_notes, where_used (<ref_file file="/Users/ranjansingh/Desktop/Xpatready/ai-workers/problem-1-pathway-setup-and-form-filling/product/domain/MASTERS.md" />).

**Should work:** User adds document requirement → pick from library OR "Describe what you need" → AI drafts all fields → shows closest items with verdict → user chooses Use existing/Add new with reason → different person approves. Duplicate guard: Layer 1 generated key + Layer 2 AI meaning match.

---

## Browser View vs Download

**Current:** ❌ No browser view, no download option. Forms table shows code/edition/boxes/who/when.

**Required (P-39):** Screen 01: download original PDF, view box map. Screen 04: download, view box map, used-by, edition history. Screen 03: sample filled forms with mapped/unmapped boxes highlighted.

---

## AI Functionality

**Current:** Form reading ✅ (Python script, no AI). Box mapping ⚠️ backend slice built (<ref_file file="/Users/ranjansingh/Desktop/Xpatready/ai-workers/problem-1-pathway-setup-and-form-filling/product/screens/01-programs-catalogue/build-notes.md" />), UI not built (Screen 02). AI proposals ❌ not built. Impact review ❌ not built. "Describe what you need" AI ❌ not built. AI meaning match ❌ not built.

**Cost control:** ✅ Ledger tracking, per-run cap US$5, experiment cap US$50, saved run replay, stub pass.

---

## End-to-End Flow

**Current (Screen 01 only):** Create combination → upload sources → intake (checksum, verification) → attach → break at "Draft setup with AI" (Screen 02 not built).

**Intended (M2):** Screen 01 (create, upload) → Screen 02 (AI work, proposals, impact) → Screen 03 (configure) → Screen 04 (library manage) → release. Progress: Screen 01 ✅, Screens 02-04 ❌.

**Shared library flow:** AI reads forms → proposes fields/sections/documents → person accepts/rejects → library items created → manual "Describe what you need" → AI duplicate check → different person approves → publish → combinations reference → changes require impact review. Progress: Step 1 ✅, Steps 2-10 ❌.

---

## Best Practices Comparison

**Canonical library:** ✅ single source, reference by key, version control. ❌ impact analysis, approval workflow (manual additions). Assessment: ⚠️ Partial.

**Duplicate prevention:** ✅ deterministic identity (forms). ❌ semantic detection, merge suggestions, approval (document types). Assessment: ⚠️ Forms only.

**Lifecycle:** ❌ delete/retire, in-use check, approval. ✅ audit trail (forms). Assessment: ❌ Not implemented.

**UX:** ✅ clear feedback, explanations, one-click. ⚠️ impact display, progressive disclosure. Assessment: ⚠️ Good for Screen 01, missing elsewhere.

---

## Recommendations

**Immediate (before M2 complete):** 1) Build Screen 04 first—implement "Describe what you need" for Document types/Fields/Sections, delete/retire with in-use check, Forms library list, fix P-53 violation. 2) Build Screen 02—AI proposals UI, new edition impact review, accept/reject. 3) Build Screen 03—document type picker, "Describe what you need" link.

**Quality:** Add database indexes, no-AI fallback, where-used views, AI meaning match, merge execution.

**UX:** "View all forms in library" on Screen 01, download/view options, tooltips, progressive disclosure.

**Technology:** S3 migration, BullMQ job queue, virus scanning, AI cost monitoring.

---

## Conclusion

**Current state:** Screen 01 has robust form intake with checksum, source verification, edition detection. Shared library architecture well-designed (P-34/P-52/P-53) but partially implemented. Critical gaps: document type management broken, manual additions not built, library lifecycle not built. Screen 04 highest priority to fix P-53 violations.

**Overall rating:** Architecture 8/10, Implementation 4/10 (Screen 01 only), UX 5/10, Scalability 6/10, Security 7/10.

**Next steps:** Build Screen 04 (2-3 weeks) → Screen 02 (2-3 weeks) → Screen 03 (3-4 weeks) → end-to-end demo. Total: 7-10 weeks to complete M2.

---

**End of Audit**

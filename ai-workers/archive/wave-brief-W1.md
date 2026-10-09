# Wave brief W1 — Evidence (needs Ranjan's yes before agents start)

**Date:** 8 Oct 2026 · **Lead:** Claude · **Status:** awaiting approval

## Why this wave first
Everything later (AI Worker map, pricing, investor story) depends on three facts we do not yet have fresh: what the product contains *today*, what VisaFlo and others actually do, and where the code really is. Our copies are stale:

| Master | Our copy | Master now |
|---|---|---|
| Drive requirements | snapshot 3 Oct | new versions 7–8 Oct (SA-02 v2.19, SA-06 v3.1, Phasing & Glossary v2.13, possibly more) |
| ERv2-frontend (GitHub) | 022733e, 1 Oct | dev 2727856, 8 Oct |
| ERv2-sanitized (GitHub) | 3d42e422, 1 Oct | dev 8a424b1, 8 Oct |

## Work, in parallel
| Agent | Output | Done when |
|---|---|---|
| `source-keeper` | `sources/drive-snapshot-2026-10-08/` with manifest and "changes since 3 Oct"; new dated code copies `code/<repo>@<sha>` | Manifest lists every current file with Drive ID, version, hash |
| `competitor-analyst` × 2 | (a) VisaFlo deep dive: product, AI features, pricing, team, LinkedIn, customers, roadmap signals. (b) Field scan: Officio, Clio, Docketwise, INSZoom/Mitratech, Imagility, Casium, Alma and AI-agent newcomers | Each claim has a URL and date; "what they do → how our approach covers it → where we go further" table |
| `requirements-cartographer` × 7 (changed 9 Oct: the material is about 1.15 M words, too large for 3 readers to read accurately) | Slices: foundation (RFP, ADR, Doc 1, decisions log, Charter, shared overview, founders' Doer specs) · Doc 2 admin · SA FR files · Doc 3 firm · AG-01…09 FRs · AG-10…18 FRs · Doc 4 portal; common format `design/inventory/SCHEMA.md`. Original plan was 3 slices: (1) Foundation (RFP, ADR, Doc 1) + Admin SA-1…12 (Doc 2 and SA files); (2) Firm console AG-1…17 (Doc 3 and AG files); (3) Client portal CP-1…9 (Doc 4), Founder Decisions Log, Program Charter, Phasing and Glossary. Output `design/inventory/`: one row per module and per Doer (purpose, manual tasks a person does, Doers used, rules/packs relied on, release, citation) | **`design/inventory/coverage.md` lists every file in the new snapshot with "read in full: yes" and the sections covered. No file may be skipped or only searched.** |
| `adversarial-reviewer` | `checks/review-W1.md` | 0 open blocking findings |

## Out of this wave
AI Worker design, pricing, the business plan and investor material (waves W2 and W3). No external contact, no publishing.

## Next waves (for orientation, each needs its own yes)
- **W2 Design:** AI Worker catalogue, guardrail model, component map visual with worker mapping.
- **W3 Commercial:** proposition, pricing, business plan section, investor story + detailed report.

## Budget cap (proposed)
About 8 million tokens of new work for W1 (10 agents; raised 9 Oct when the snapshot measured about 1.15 M words). Ranjan gave full authority (AIW-D7). The current requirements alone are 44 files and about 890,000 words (roughly 1.2 million tokens) to read once; the split keeps each agent's reading small enough to stay accurate. This does not count cached re-reads; that counting rule is still open in `product/NEXT.md`. The wave stops and reports if it reaches the cap.

## Risks
- VisaFlo identity confirmed by Ranjan (AIW-D2).
- LinkedIn pages may need sign-in. We read only public pages and never sign in on your behalf.
- Charter conflict: Ranjan put AI in scope (AIW-D1) but the Charter on Drive still says "NOT IN RELEASE 1".
- Email (B3): read-only search of Ranjan's mailbox for VisaFlo, customer and investor threads, **only if Ranjan says yes**.
- The reviewer also checks `brief-coverage.md`: no ask may silently drop.

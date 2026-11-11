# 06 · UX framework: pointer

Master analysis, part 6 of 8. **Moved to its own lane** by Lead 15 (series 2), 11 Nov ~12:4x IST: "UX: score every screen, then plan to 9-10", folder **`product/design/ux-2026-11-11/`**. That lane owns the per-screen scores, the framework choice, the `ux-standard` skill draft and the founder's style questions (at most four). This file does not duplicate its scoring.

## What this analysis hands to the UX lane (evidence only, no scores)

| Input | Where | Why it matters to the UX plan |
|---|---|---|
| The Bake's journey and its measures (E1-E3): extra logins, dead ends, help needed, journey Majors | `design/bake-plan-2026-11-10.md` §4; P-456 | The UX plan's first 9-10 targets should be the journey screens the walks measure |
| BK-1 baseline: 5 person changes, 2 dead ends, 9 fold-outs without an arrow, 14 Majors (10 on the journey) | #1509 | Today's numbers to beat |
| Four UX Minors from the BK-1 walk: QA-387 (a client cannot clear a wrong answer), QA-388 ("Part n of N" jumps), QA-389 ("No" still asks for the list), QA-390 (every case page's tab says "Product Studio") | `qa/BUGS.md:10-13` | Concrete examples for "recovery", "progress", "each fact once" and "where am I" rules |
| 111 open UX Minors in `qa/BUGS.md` (179 open rows: 14 Major, 165 Minor) | bugs inventory for part 2 | The polish backlog (Bake plan: "polish of single screens and wording cuts ~18-22 sessions", not in the Bake by decision) |
| The co-founder's "too many fields" | P-460 | A named, unmeasured complaint: the UX plan needs a number for it (fields per page, questions per step) |
| Monitoring hooks that serve UX: browser errors from real use, request timing | `08-monitoring.md` rows M2, M3 | Errors and slow pages seen by people, not only by tests |
| Branding stays (colours, fonts) | founder, A19 (h); `product/EXPERIENCE.md`, `design/TEAM-PATTERNS.md` | Constraint on any framework |

## One challenge, for the UX lane rather than the founder

Score against **the journey's measured tasks first** (time, steps, errors, help), and against per-screen heuristics second. Most of the founder's "heavy on the brain" comes from **moving between screens and people** (logins, dead ends, no next step). That is what BK-3 to BK-5 fix. A screen-by-screen heuristic score can reach 9 while the journey still needs 5 person changes. Evidence: BK-1's 5 person changes against 1 hand-off button (P-456 (3)).

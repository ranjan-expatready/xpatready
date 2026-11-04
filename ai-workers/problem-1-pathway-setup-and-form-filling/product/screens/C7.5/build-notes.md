# C7.5 part 1 — build notes (runtime lane, 4 Nov IST)

**Scope built:** rules cross-checks (US$0) and the life of a finding; the Review panel; pack steps C7.5-1…4 and -10…14. **Part 2:** the replayed AI review (C7.5-5…9, -15) and the readiness warning (C7.5-9).

## Mapping to the team's model (AG-11 Checker, AG-07 deficiencies)
| Team | Ours (`review_finding`) |
|---|---|
| Finding severity CRITICAL · MAJOR · MINOR · INFO (AG-11-69) | `severity` (CHECK) |
| Source Rules · AI · Added by hand | `source` rules · ai · manual |
| Open → Acknowledged (reason) → Resolved; Open → Waived (CRITICAL, permission, reason) | `state`; the person's move in `state_reason`, `state_by`, `state_at`; the resolve in `resolved_by` ("rules" when the facts changed), `resolved_at` |
| Dismiss does not return for the same source | rules: one live row per case and `fingerprint` (rule + person + compared facts; partial unique index); a dismissed row stays and blocks the same fingerprint |
| Every finding quotes its source and field (AG-11-70) | `quote`, `field`, `form` (the first form the fact fills), `filing` |
| Rounds, agreement High/Low with both reasons (P-121) | `agreement`, `reasons`, `replayed`, `run_id` — filled by part 2 |
| With AI off, rules and manual findings still work (AG-11-71) | rules run on every read; manual by `POST …/findings` |

## Cross-checks: built and not built (reviewer S1)
* **Built (5, date rules, Sample severities):** passport expires before the visit ends (not for a person not travelling, P-209); visit ends before it starts; passport expires on or before birth; national ID issued before birth; national ID expires on or before its issue.
* **Not built here:** name and document-number checks across documents ("name on passport vs certificate") need the document reader's facts (C6.5); filled-form read-back differences are C7.7's. Each comes as a rule in `engine/runtime/cross-checks.ts` with its own pass and fail test.

## Decisions taken in the build (in the PR's Questions)
Rules reconcile inside GET (idempotent, 12–39 ms); a CRITICAL is only waived, only by the case's current representative of record (acknowledge and dismiss refused, 422); severity checked before the reason; audit lines on entity "case" (firm-scoped feed), never a value or a typed reason; a hand-added finding is idempotent per dialog key.

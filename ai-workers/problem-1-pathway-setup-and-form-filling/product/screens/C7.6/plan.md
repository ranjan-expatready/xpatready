# C7.6 — Ready to file (L-SA3, M3) · build plan

Row: `/next runtime C7.6`, P-315 (L-SA3 built now). Branch `claude/loving-ride-hhtdgi` from origin/main 9caa043b.
Check for other owners, 4 Nov 12:30 IST: no open PR names C7.6 or readiness; no branch in 2 days adds `ready_to_file` work.

## What is there
* `engine/runtime/readiness.ts` (pure rules, 64/64 in `check_c76_readiness.ts`) still uses P-71/P-168's blocks.
* `api/src/case-prepare.ts` leaves `readiness` as a stub ("not built yet"). No `review`, `ready` or `warnings/:code/pass`
  routes; no `readiness_pass` table; `filing.status` never reaches READY_TO_FILE, so C8.1-13 and C8.2 wait.

## Plan
1. **Rules (P-315, P-237, P-238):** the only hard stop is a barcode form without its own Validate read back
   (`barcode_not_validated`, P-144). `missing_facts`, `fact_problem`, `open_check`, `out_of_date`, `missing_signature`,
   `edition_expired` and `representative_review` become CRITICAL warnings, passed with a recorded reason (who, when,
   reason). P-172 (Express Entry police and medical) stays the one named block. The codes keep their names.
2. **Wire it:** `case-prepare.ts` fills `readiness[]` from the engine (facts per form, validated copy current, signed
   scans, review, edition dates, checklist documents, findings, passes).
3. **Routes:** `POST /runtime/filings/:id/review` (representative of record only, or "Self-reviewed" for a solo firm,
   with licence number), `POST /runtime/filings/:id/warnings/:code/pass {reason}` (staff on the case; 400 without a
   reason; client 403), `POST /runtime/filings/:id/ready` (409 naming blocks and unpassed warnings; sets
   READY_TO_FILE), `PATCH /editions/:id/accepted-until` if not already built.
4. **Data:** additive migration: `filing_review`, `readiness_pass` (append-only).
5. **Pack:** `acceptance/C7.6.test.ts` reworked only where P-315 moves a hard stop to a CRITICAL warning; each changed
   step listed in the PR's first lines. C8.1-13 and C8.2's recording steps then run.
6. Files: M3-only (new files where a hot file would be touched; any M2-hot file goes to the tech lead first).
7. Checks: run-suites --changed, graph, count-any; Opus reviewer + breaker (who may pass a warning or mark ready, P-278);
   nightly on GitHub's machines twice for C7.6,C8.1.

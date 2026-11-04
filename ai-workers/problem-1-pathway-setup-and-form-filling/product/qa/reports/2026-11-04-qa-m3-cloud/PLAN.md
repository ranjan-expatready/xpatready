# qa M3 (cloud) — plan, 4 Nov 2026

**Tester:** independent cloud qa for M3 (Opus, P-303). Built none of this. Live AI off, US$0, no priced button, nothing on the founder's Mac.
**Writes only:** `qa/verdicts/<date>-<capability>.md` and evidence here. The M2 qa lane (Mac, "qa lane · 4 Nov") is the one writer of `qa/CAPABILITIES.md` and `qa/BUGS.md` and copies these verdicts in; new bugs are logged inside the verdict file with a severity.

## Round 0 — clean starting point on today's main (9caa043b)
Before the first M3 PR merges, re-score the M3 rows already built (Partial today): **C6.12, C6.4, C7.6, C7.7, C7.3**.
For each:
1. Its pack (acceptance + the row's own checks) on a fresh isolated copy of main on this cloud machine, twice (nightly re-test on GitHub where it runs).
2. A walk like a person at 1440 px where a screen exists (API only rows say so).
3. Open Majors in `qa/BUGS.md` on it (seen at start: QA-149 C6.4 · QA-152 C7.7 · QA-153 C7.3/C7.7 · QA-165 C7.3).
4. Score on Opus.
**Counting (P-322):** verdicts say "fixture only: <result>; on the checkpoint: waits for QA-144" until QA-144 (#798) is on main.

## Round 1+ — after each M3 merge
C7.6 "Ready to file" first, then the rows of the M3 design pass: same four steps on the merged main, one verdict file per capability, one small records PR each.

## Cadence
Push at least every 30 minutes. Questions: a PR comment headed "Question for the tech lead".

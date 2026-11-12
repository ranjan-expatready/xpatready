# Challenger's re-check scripts (fresh Opus challenger, 12 Nov 2026)

Read only our repository's git history, `qa/CAPABILITIES.md`, the team's requirement snapshot in `domain/` and the downloaded GitHub JSON (`pulls.json`, `comments.json`, `events.json`; fetch commands in the plan's Evidence section). Nothing from the team's app. Paths were written for one machine: replace `$REPO` (this repository's root), `$SCRATCH` (a folder holding the JSON) and `$TMP` before running with `python3 -I`.

| Script | Produces (plan's Challenge table) |
|---|---|
| `c1_conflicts.py` → `c1_out.tsv`, `c2_nonmain.py`, `c3_mainonly.py` | conflicts on merges of `main` vs other merges; 22-29% (C-6) |
| `c4_landmark.py` | same-age conflict cost, ~216 PR-hours (C-7) |
| `c5_gates.py` | last Approve → label, 68 PR-hours, "71 of 131" (C-9) |
| `c6_works.py`, `c7_titles.py` | Works by day and week; PRs per row by title (C-10, C-11) |
| `c8_sample.py`, `c9_frs.py` | requirement-line sample and pointer lines (C-1, C-2) |
| `c10_span.py`, `c11_lanes.py`, `c12_sens.py` | module span, lane crossing, sensitivity (C-12) |
| `c13_size_capacity.py` | size band 433-704 and week rates (C-4, C-19) |

**Withdrawn or superseded outputs (Lead 26 challenge, 12 Nov):** `c13_size_capacity.py` prints "PRs per Works 6.3 / 3.7" (withdrawn: a counting artefact of the 3-4 Nov re-proof; on all confirmations it is 2.95 → 3.21) and the size band "433-704" (superseded by the plan's 1.4 range ~310-700, which adds a 0.1 floor for prose modules).

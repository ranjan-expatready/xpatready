# Review: QA-275, each filled copy keeps its own file (Bake M3.5 Track 1 row 9, P-447 (1))

Reviewer: independent agent, did not build it. PR #1528, branch `claude/awesome-shannon-hgkagd`. **Commit reviewed: a2103b51e9652de8ff085db823d0687380133c99** (first 54dac7595, then the delta 54dac7595..a2103b51e). Diff vs origin/main fbfb263c7 (= merge-base): `studio/api/src/fill.ts`, new `studio/tests/check_qa275_fill_files.ts`, `qa/built/QA-275.md`, three screenshots.

**Outcome: Ship.** The Done-when items all hold, and there are no Blockers or Majors.

## Done-when, checked
| Item | Result | Evidence |
|---|---|---|
| Two fills of one form and person within a minute leave two distinct files, each downloadable and matching its own fill | Met | Suite 9/9 on a2103b51e (draft, release, draft in one minute: 3 paths, file hash = row hash = download hash). Break-it: 4 simultaneous fills → 4 paths, all match. Browser: two Fill presses 2 s apart → two saved files, each = its row's sha256 |
| A test fails on origin/main, passes on the branch | Met | Same suite against an origin/main worktree on :4476: 5 failed (one path `IMM1295-principal-…T0701.pdf` for all three rows; release row stored `376d9a…`, served `ebcb3b…`). qa's own repro `tests/qa/check_qa275_fill_overwrite.ts` 8/8 on the branch |
| Existing fills and their links keep working | Met | `artifact()` still reads `a.path` from the row; a minute-named legacy row downloads its bytes under its own name (suite check 9); the name regex only shortens a trailing full UUID, so legacy names pass through unchanged |
| Paper copies keep AES, DocMDP, UR3 (P-442) | Met | `writeForm` and `p5/fill.py` unchanged; every report: `/DocMDP verified, /UR3 verified`, appended objects encrypted with the document key, `intact: true` |
| `prisma/schema.prisma` and `api/src/case-prepare.ts` untouched | Met | `git diff --stat origin/main...a2103b51e`: neither listed. `id` is passed into the existing `@default(uuid()) @db.Uuid` column; no migration |

## Code (fill.ts)
- fill.ts:87-92: `randomUUID()` is chosen before the file is written and passed as the row's `id`, so path ↔ row is one to one by construction. Request, report and PDF share `base`, so `.request.json` and `.report.json` are also per fill (the report_file in `detail` matches; suite check 8). The stamp keeps the UTC second for a person reading the folder.
- fill.ts:98-103 (delta): the saved name shortens the id to 8 characters, the same as a case copy's `short`. A display-only change; the disk path is untouched.
- Under a race the new code is correct: no shared mutable path remains, and no unique-constraint retry is needed (a v4 UUID per request).
- Server authorisation on `/artifacts/:id/file` is unchanged (QA-270): client 403, no person 401, malformed id 404.

## Other writers, and readers of the old name
- `generatedArtifact.create` exists only in fill.ts:91. No other writer of `generated_artifact` rows (demo.ts only counts and deletes).
- Case copies (fill-case.ts:377-378) are already named `<form>-<subject8>-<formInstance id>`: unique per copy, so the BUGS row's "raise to Critical if case fills share this naming" does not apply. Validated uploads (fill-case.ts:490-494) are named by copy id + sha12 through a random `.pending` file: same name only for the same bytes, by design.
- Intake, sources, finder library: content-hash names. upload-run.ts:69: `Date.now()` in base 36 plus the name; it is not a filled file or an artifact, so it is out of this row's scope.
- Nothing parses the old `…THHMM.pdf` pattern: web (preview.tsx:156) reads the server's Content-Disposition; tests read `generated_artifact.path` as data only (forms_slice2b, fill_duty, C4.6). `p5/server.ts` is the earlier prototype (values-hash names), not the studio.
- CI's `select-suites.mjs` picks check_qa275_fill_files, check_qa270_file_route, check_b84_fill_intact and check_c46_preview_channels_browser for this diff.

## D1-D20 (1-5; scoped to this fix)
D1 5: matches the BUGS row and C4.6 · D2 5: one row ↔ one file, holds under 4-way race · D3 N/A · D4 N/A · D5 5: double and simultaneous Fill keep every copy · D6 4: one audit line per fill, unchanged · D7 N/A (no AI) · D8 4: Preview path unchanged · D9 4: Download is the dialog's action · D10 4: saved name = form, person, time, short id (the case copy convention) · D11 4: busy, toast, dialog · D12 4: unchanged · D13 4: axe clean, keyboard, 1024 px; 200 % zoom not run · D14 4: unchanged team look · D15 5: ~850 ms per fill · D16 5: test fails on main, passes here, rerun by the reviewer on the exact commit · D17 simulated only · D18 5: row records its own file's sha256 again · D19 4: Preview's filled-PDF step closed · D20 simulated only.

## BIC-01-BIC-20 (EXPERIENCE §6)
N/A: Preview is configuration-side and this row changes no screen; §6 covers case-side screens.

## Graph (P-86)
`graph.mjs` ran (G1 0 · G2 0 · G3 42 · G4 0 · G5 0 · G6 13); GRAPH.md unchanged. The graph lists `GET /artifacts/:id/file` as tested only by `check_qa_explore_1025.cjs`: it does not see the template-literal calls in check_qa270/qa275. That is a graph tool gap, not this PR's.

## Journey score
**9/10, pass**: `journey-test-reviewer-2026-11-11.md` (this folder).

## Issues
- Should (Minor): `qa/built/QA-275.md` says "8/8 (5 of them fail on main)"; at a2103b51e the suite has 9 checks (9/9, still 5 failing on main). Fix: say 9/9.
- Minor, note only: the legacy-link check fails on main because of how the test builds its path (`…T0701.pdf.pdf`), not because main breaks old links. It is meaningful on the branch only, and that is acceptable.
- Outside this row (for qa, not this PR): after repeated fills at 1024 px, the stacked toasts cover the dialog's Close and Download; Fill PDF is offered only in "Every form field and a Sample filled PDF".

## Could not check
A visible browser (headless Chrome only), a screen reader, 200 % zoom, Adobe opening the files (signatures verified by the filler), and an intended user's walk (D17/D20).

**Verdict: Approve** (commit a2103b51e9652de8ff085db823d0687380133c99). No open Blocker or Major.

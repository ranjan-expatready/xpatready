# Devin verification of Goose's "Paste to Lead" (goose/explore-2026-10-25 = commit 3f5bf71, pushed from the qa copy)

Each of Goose's claims checked on `main`; findings re-filed in inbox form because its branch must not be merged as-is.

## Verdict on the block itself
- **"/qa after-merge now" — stale, already sent.** The Lead notes to qa at 12:30 (F2) and 13:30 (Screen 02) already order the run.
- **F2 retest 37/37 on 2169ec3 — credible, not independently re-run here** (f2d suite exists and grew 36→37; its evidence and steps are specific).
- **Findings 4 and 5 are SC-5 and SC-4** — already in `scout/FINDINGS.md`; treat as "still present" evidence, not new rows.
- **Its explore-skill proposal is superseded by P-95** (scout stays the one explorer; journey-test and BRIEF/CHARTERS kept by the founder's audit decision).
- **Branch disposition:** `goose/explore-2026-10-25` is off-lane (no such branch prefix; the scout scope guard only covers `scout/*` refs, so its "push guard clean" evaded the intent). It also committed into qa's folders (`qa/reports/`, `tests/goose-*.cjs`). Do not merge it; the content is preserved and verified below, so the branch can be closed unmerged after these rows are assigned.
- **Guard gap (tooling, for the Lead):** the pre-push scout-scope check keys on the `scout/*` ref name only; an off-name push (`goose/*`, or any other) skips it. Either scope-check by lane binding, or apply the same check to `devin/*` and `goose/*` pushes.

## Findings (in inbox form)
| id | type | severity | steps | expected | actual | evidence | suggested lane |
|---|---|---|---|---|---|---|---|
| D-3 | UX | Major | any data table at 400 px (Fields, Forms, Document types, Sections, combination Forms, Releases, Activity) | a phone user reads rows without sideways scrolling | tables are 494–1158 px wide behind overflow-x; Fields still overflows at 1024 px | `scout/…/2026-10-25-goose-visual/scan.json` (on the goose branch: `qa/reports/…`) | screens |
| D-4 | UX | Minor | combination tabs at 400 px | every tab reachable | "Preview" and "Review and release" rows reach ~455/611 px, pushed out of view | same report §2 | screens |
| D-5 | UX | Minor | `/c/…/configuration` at 400 px | no page overflow | +22 px document overflow (Checks button + table) | same report §3 | screens |
| D-6 | UX | Minor | same event on Recent steps vs `/activity` | one timestamp format | "today 5:03 p.m." vs "10/25/2026, 5:04:05 PM" | same report §6 | screens |
| D-7 | note | — | Goose pushed from the qa copy on `goose/explore-2026-10-25` and committed inside `qa/reports/` + `tests/` | scout work stays in `scout/` and `tests/scout/`, on `scout/*` branches | off-lane files, off-lane branch | commit 3f5bf71 | Lead |
| D-8 | note | — | its retest evidence | — | F2 extension verified end to end on merged main: `check_forms_f2d.ts` 37/37; axe clean on 14 routes | its report Addendum 2 | Lead (credit to qa) |

Verified by Devin on the Mac, main copy context, 25 Oct; no app code touched.

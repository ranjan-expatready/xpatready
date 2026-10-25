# Screen 02 — review 2 (CHECK round 2)

Reviewer: fresh session that did not build this. Branch `claude/screens-01-fix-c3010a` @ `246143f` + SC-2 fix (uncommitted at review time), isolated copies `screens_*` on :4440–4449, databases `xr_studio_screens_*`. No paid AI: every suite replays saved runs, US$0. Evidence outside the repo: `/tmp/s02-check/`.

## Verdict: **Ship**, journey score **9.5/10** (pass ≥ 8, no criterion at 0)

Scored per journey-test §6 by walking every concept journey in a real browser (clicks/keys, personas, PostgreSQL checked after each step): see `journey-test-reviewer-2026-10-25-r2.md`. The reviewer session also made the one-line SC-2 label fix ("used by n").

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | journeys (a)–(d) end to end; (e) held PDF not walked live (gate in code + fix suite) |
| Next step obvious | 1 | all four round-1 dead ends gone; chips name the next actor |
| Plain words | 1 | return notes, prototype-exception label, no ids on the main path |
| Feedback and state | 1 | Needs you/Waiting/Running counts; every mutation ends in a named state |
| Correct data | 1 | psql-verified: APPROVED→PUBLISHED, RETURNED→WAITING, WITHDRAWN, scoped release v2, 708 maps |
| Error recovery | 1 | resend and withdraw recover a returned proposal |
| Accessibility and sizes | 1 | axe WCAG 2.2 A/AA clean on 4 pages; no scroll at 1024/390/640; focus rings present |
| Speed | 1 | To review 269–320 ms, approve ~0.95 s, submit→release ~0.4 s |
| Visual quality | 1 | consistent with design/draft-ai-work.html |
| Trust and sources | 1 | who/when labels, origin, US$0.00, audit lines |

## The earlier findings, verified on this head (test name → evidence)
- Re-check 1 (approval publishes only the changes the combination uses): `unapprovedAdds` + scoped publisher, `library-changes.ts:71-103` — check_screen02_fix 59/59.
- Re-check 2 (release refusal covers every new item): same function covers `field | section | document_type`, `WAITING | RETURNED | NOT_PROPOSED`.
- Re-check 3 / break B1 (returned new field): RETURNED→WAITING resend `library-changes.ts:114-124` + withdraw (`:131`); tests in check_screen02_fix.
- Re-check 4 (old Add-field route): `studio.ts createField` writes the field as DRAFT **and** a WAITING `LibraryChange` ("a field added in the library waits for a second person too").
- Re-check 5 (duplicate-name rule): migration `20261025100000_field_name_unique` (partial UNIQUE index).
- SC-2: picker option reads "used by n" (`new-combination.tsx:182`); verified in a live browser: option shows `Visitors · used by 3`. The scout check itself cannot run on a fresh copy — it calls `GET /api/catalog/combinations` (404 on every server) and falls back to a hardcoded combination id that exists only on the scout's own copy; its two FAILs are setup prerequisites, not product failures (SC-4 is the runtime lane's and was verified there).
- Must 1 (To review ≠ Release gate): `unapprovedAdds` is used by both gates. Must 2 = B1 above. Must 3 (BR-7): `sources.ts:583` refuses ACCEPTED/CHANGED on a NEW item with a candidate ≥ 0.55 without a reason. Must 9 (BR-16 words): fix suite asserts plain words on launch/progress/proposals.
- Musts 4–8: covered by check_screen02_fix and slice2_browser (K1 decision rows surfaced, held-file uploader step, held-edition review path with a plain-words refusal when no official file exists, missing concept items recorded in build-notes).

## Findings — 0 Must · 0 Major · 3 Minor
1. `check_screen01_smallfix.cjs` break K1 (2 checks) fails in this environment: headless Chromium 1248 does not change a closed `<select>` on ArrowDown at all (standalone probe: value stays ""). Pointer works; the app code is untouched by the merge (`git diff 34173de..HEAD` = extension files + SC-2 only). Environmental, not a product defect.
2. Scout check environment-bound (above) — worth a note to the scout lane: its discovery query 404s on all servers.
3. Disk pressure interrupted first browser runs (ENOSPC); cleared 1.3 GB; every affected suite re-run green.

## Suites on this head
screen02_fix **59/59** · screen02_slice2 **57/57** · slice1 **all passed** · slice2_browser **all passed** · forms_channels **106/106** · forms_slice2 **53/53** · slice2b **60/60** · ai_launch_paths **56/56** · f1p **16** · f2a **34** · f2a_api **34** · f2b **39** · f2c **36** · f2c_fill **17** · f2d **37** · grounding **30/30** · screen01_api **135/135** · screen01_browser **136/136** · engine **38/38** · screen01_rules **67/67** · ai_drafting **48/48** · ai_orchestration **42/42** · channels **42/42** · release_race **PASS** · runtime setup **13/13** · r1c **13/13** · r1d **63/63** · r1a **99/99** · studio journey chain **120/120**.
Graph `--check`: G1 0 · G2 0 · G3 4 · G4 0 · G5 1 · G6 0 (G3/G5 entries are pre-existing/outside this item).

## Could not cover
`check_studio_browser.cjs` (resets the :4400 demo — forbidden here; CI runs it). Real keyboard on a headed browser. The scout check end-to-end (environment-bound). AI live calls (none, by design).

# Lane: scout — outside-in explorer with fresh eyes (Goose on Ollama Cloud, P-91)

## From the Lead
2026-10-25 13:30 (Lead, Mac): your check `tests/scout/check_sc2_sc4_1025.cjs` cannot run on a fresh copy: it calls `GET /api/catalog/combinations` (404 everywhere) and falls back to an id from your own copy. Make it find the combination through an existing route at your next run. SC-2 (screens) and SC-4 (runtime) are fixed.
2026-10-25 09:50 (Lead, cloud): **firm-admin-day-one triaged; branch merged.** SC-2 → screens (its file, this FIX), SC-3 → forms (after F2), SC-4 and SC-5 → runtime (S2). **SC-1 and your question:** a "start from the sample set" button is product work, not a small fix (it decides what a new workspace starts with); it goes to BACKLOG B34 and to the founder. Good call reverting SC-2 when the file was busy. Stage EXPLORE, owner Scout. **Next charter: `ai-draft-review`** (added after `firm-admin-day-one`: the AI draft and the person's review, journey 1 of the brief), then `release-review`.

Command: on the Mac, `bash ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/scout.sh open` (a session with the founder in Goose), `… scout.sh save` afterwards, or `… scout.sh [charter]` (an unattended run). This lane writes everything below; the Lead writes only the section above.

current_item: charter firm-admin-day-one done — report scout/reports/2026-10-25-firm-admin-day-one.md (5 findings SC-1..SC-5 with priorities P2/P3; SC-2 fix written+proven but reverted — new-combination.tsx busy on screens; ready patch noted)
stage: EXPLORE
owner: Scout
next_action: next run, charter ai-draft-review (GOOSE-TASKS.md G2)
blocked_by: none
updated: 2026-10-25

## Log (last 10 lines)
- 2026-10-25 · Scout (Goose) · founder's standing lens added to BRIEF: "AI everywhere it helps — draft, find duplicates, flag constraints and problems; the person decides"; every future run judges each step against it; folded into SC-1's suggestion
- 2026-10-25 · Scout (Goose) · charter firm-admin-day-one: full walk on :4480 (create program›category›sub from nothing, attach sample forms, review/release, 390px/keyboard/200% zoom, API probes); report + 5 findings; SC-2 fix proven then reverted (new-combination.tsx busy on screens — scope guard worked; ready patch in the report); SC-4 check kept failing as evidence
- 2026-10-25 · Scout (Goose) · first session: BRIEF written with the founder, CHARTERS re-ordered (brief order), NOW.md handover card created, setup review + P1–P7, smoke test passed (shell, files, app :4480, API auth, playwright MCP, scope guard)
- 2026-10-25 · Lead · lane created (P-91); no run yet

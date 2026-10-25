# F2 — build notes (forms lane)

## F1-P · list purpose and overflow on a field map (25 Oct; plan §10b, Screen 02 Q3, BR-15)
* **Record:** `form_field_map.list_purpose` JSONB `{kind, overflow}`, expand only (`prisma/migrations/20261025090000_forms_f1p_list_purpose`, rollback in the file). Null = "Purpose: not set".
* **Contract:** `contracts/forms.ts` `LIST_PURPOSES` (`current` · `for_post` · `all` · `latest` · `date_range`, labels as the Lead named them, Sample), `LIST_OVERFLOWS` (`extra_sheet` · `flag_officer`), `SetListPurpose` with plain-word refusals.
* **API:** `PATCH /api/editions/:id/list-purposes {dataPath, kind, overflow}` (author duty), the option-map pattern: a published row gets a new draft version (`revise`), the same purpose again adds nothing, an audit line with the words and no value. LP-1: only a mapped row-level entry (`row` set) takes a purpose (else 422); a field not on the map 404. Marking an input "not a fact" (by a person or an accepted AI proposal) clears its purpose.
* **Release:** the snapshot carries `list_purpose` only when set (`engine/snapshot.ts`; configurations without it keep their fingerprint); `engine/channels.ts` warns per field map: "N list rows have no purpose yet …" (a warning, never an error, so releases made before F1-P stay releasable).
* **Test:** `tests/check_forms_f1p.ts` 16/16 (engine warning pass/fail, store, words, audit, idempotent, single-value 422, unknown kind 400, no overflow 400, unknown field 404, 403, 401, draft configuration carries it, QA-43).
* **For Screen 02 (screens lane):** read `list_purpose` on field-map rows from the draft configuration (`GET /combinations/:id/config?mode=draft`, `field_maps[].entries[].list_purpose`); set it with the PATCH above; labels from `LIST_PURPOSES` / `LIST_OVERFLOWS`. The AI proposal of a purpose (Screen 02 concept) is not in F1-P.

## QA-43 · unknown combination on `online-forms` → 404
`FormsService.onlineForms` refuses a combination that is not in the workspace (404 "That combination does not exist."), as a malformed id already was. Test in `check_forms_f1p.ts`.

## `check_ai_launch_paths.ts` robust, leaves the repository as it was (Lead note)
* CI red on 8d0831a (run 142): the table's last line was a PASS line, so the check stopped without printing a FAIL: an exception, not a failed assertion. The likely one: the suite restarts its own server and `isolated.sh` waits only 30 s for it, then exits 1; `execFileSync` threw. Fixed: `restart()` waits up to 2 more minutes for `/api/session` and reports a FAIL line if the server never returns; `send()` also retries a refused connection for up to 60 s (a server still starting), never resending once a reply came; the top-level catch prints `FAIL  the check stopped: …` so run-suites shows the reason.
* Files: every run rewrote the tracked `evidence/forms-slice2b/check_ai_launch_paths.json` (a new timestamp and run ids), leaving the copy dirty. The evidence file is now written only with `--evidence`; a regression run writes it under the copy's `var/` (ignored). `check_forms_f1p.ts` follows the same rule.

## Environment (this cloud copy)
PostgreSQL 18 could not be installed: the network policy refuses `apt.postgresql.org` (403). The suites ran on the image's PostgreSQL 16 (`cloud-setup.sh` with its binary path changed in a scratch copy, nothing committed); CI runs 18 and is the authority. All migrations, F1-P's included, apply on 16.

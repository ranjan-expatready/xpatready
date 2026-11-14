# Fresh reader verdicts, R1 rows merged on main 549b9cfbb (P-303)

Reader: a fresh Opus context that ran no test, server, build or docker step. It read the BACKLOG rows (lead copy), the packs, the
workflows, CI run 43577543660's copied lines, qa's own re-runs, the PF-1 review record and GitHub's skeleton run list (read only).
Counted run: **ci 43577543660** (merge-queue batch "merged #1741", head acae0842, tree ea055af1 = main 549b9cfbb's tree).
A schema pack runs with no server by design: its Done-when is about PostgreSQL itself, so P-405's "no server" clause is not applied to it.

## R1.2 Database (PF-3, #1728): **Works**
* Run 43577543660, job 132395570725 (shard 7): `check_pf3_platform_schema.ts` 75 passed, 0 failed. qa's P-290 re-run on 549b9cfbb in the cloud copy also gives 75/75.
* Every Done-when line has a pass and a fail case on real PostgreSQL. The covered lines are: `country_code` fixed; one licence per person; contact email in one firm (capitals too);
  one open invitation; `webhook_receipt` unique; `module_event` insert-only; setting schema, its default and its audit line in one transaction (with rollback);
  `firm_id` first in an index; `firmScope` walls; seed run twice; `Case.firm_key` matched; one staff row per Sample user.
* Gaps between the Done-when and what the pack checks. Neither keeps the row from Works:
  - Minor: the Done-when says "`migrate diff` empty after". The pack filters the diff to lines that name PF-3 objects (`platformDiff`). Main's known drift is excluded (check_prisma_schema KNOWN), so a whole-diff-empty claim is not what is proven.
  - Minor: the "demo-data copy" is demo-shaped, not a copy of the demo database. It holds 3 runtime cases and 1 audit line, written with triggers off. A real demo copy with other `firm_key` values or more rows is not exercised.
    The migration writes no data that depends on the existing rows, so the risk is low.

## R1.12 Screen framework, one UI kit (PF-1): **Works** (for PF-1's Done-when; see the UI-kit note)
* Run 43577543660, job 132395570702 (shard 4): `check_pf1_module_routes.ts` 28/28. qa's re-run also gives 28/28.
* What passes: the fixture page opens in a real browser with only the one `App.tsx` line; `/`, `/sign-in`, `/cases`, `/link` and `/inbox` are unchanged with modules present;
  clashes are refused with both names (two modules on one path, App routes, the catch-all, one address twice); APP_ROUTES is kept equal to `App.tsx`.
* Gaps:
  - Minor (records): the Done-when says a clash "stops `vite build`". The build in fact exits 0, and the app stops at load with an on-page alert, red in CI.
    The tech lead accepted this as PF-1's done in PR comment 6860684072 (review.md, re-review a415ddab2), but the BACKLOG row still says `vite build`. Amend the row.
    A builder who runs a local `vite build --watch` sees no build error, only the alert in the browser. Only the missing `export const routes` case stops the build.
  - Note: the only module on main is the `_example` fixture. Seam proof by fixture is what the row asks for. The first real module (front office) is the first non-fixture use.
  - "One UI kit" in the map row is not checked by any pack. PF-1's README says "the page decides its own frame", and nothing enforces `Frame` or the kit on a module.
    This is not in PF-1's Done-when. If the map row's verdict is meant to include the kit, that half is **Not tested** and the row as a whole is Partial.

## R1.11 Server framework (PF-7 walking skeleton): **Not tested**
* No counted run: the skeleton workflow has never run on main's tree on GitHub's runners. Its run for this batch, 43577543636, concluded `skipped`:
  `skeleton.yml` skips mergify/* batches, has no push trigger, and is not a required check. qa's cloud attempt had no docker daemon and never reached the app,
  so the P-290 confirmation is missing too.
* Supporting only, not counted: skeleton run 43580319853 (job 132403441257) on PR #1742 (FO-1a) ran every step green, at 09:23-09:25:
  the build, migrations, smoke, and both seeded fails. That run used GitHub's merge ref, which is main plus FO-1a's unmerged code, not main's tree.
* The pack itself matches the Done-when: health 200 with status ok; the first page plus a JavaScript bundle (not the SPA fallback);
  non-root (user and uid); a secret scan of the environment and `docker history`; seeded fails for a stopped database and for root plus a key.
  The `/api/platform/me` step waits for PF-4 by design. "Does not run on a records-only PR" can only be shown on a PR, not on main.
* To reach Works: the Lead dispatches `skeleton.yml` (it has `workflow_dispatch`) on main, because cloud lanes get 403 (P-439). qa then records that run id.
* Watch: main's smoke still signs in with `{"email"}`, the shape PF-4's own skeleton fix says answers 400. PF-4 must carry its smoke change when it lands.

## R1.16 Automated testing (PF-7 + existing CI): **Partial, Major open**
* Counted for the CI part: run 43577543660 is green on main's tree. Every non-quarantined suite ran (484 units over 8 parts, retries 0),
  including the three packs above (jobs 132395570725, 132395570702, 132395570724).
* **Major:** PF-7's container proof never runs on what reaches main. `skeleton.yml` runs on pull requests only and skips merge-queue batches,
  so a batch of two PRs that are each green alone can break the image, compose or migrations-in-container on main with nothing going red.
  It is not a required check either. The Done-when line "proves itself on every relevant change" is therefore met per PR only, never per merge.
  Fix: run it on the merge-queue batch (or on a push to main) and make it required, or have the Lead dispatch it after each code merge.
* Minor: the queue's "every suite" skips the 5 quarantined suites (QUARANTINE in run-suites.sh: check_forms_c36_rule_facts_browser.cjs,
  check_screen01_api.ts, check_d1_reset_to_six_browser.cjs, check_b78_section_names.ts, check_c613_filing_changes_browser.cjs). They are listed with owners, but they are untested on merge.

## FO-1b part of map rows 37 and 41 (#1741 and its rev 14.2 amendment): **Works (tables only)**
* Run 43577543660, job 132395570724 (shard 1): `check_fo1b_booking_schema.ts` 80 passed, 0 failed. qa's re-run also gives 80/80.
* These Done-when lines pass and fail as asked: the overlap rule, proven with two real connections, refused for SCHEDULED and for RESCHEDULED,
  and allowed once CANCELLED and for two hosts; 09:55 blocks 10:00 with the 10-minute gap; slugs unique in the firm; several live tokens per booking; timestamptz;
  `firm_id` first in the indexes. From the amendment: cross-firm staff gives 23503, and deleting staff who have a booking is refused (RESTRICT). The four back-relations are on main's `platform.prisma` (lines 85, 206-208).
* Gaps, neither of which keeps the part from Works:
  - Minor: "`firm_id` first in every index" is checked only on non-primary-key indexes. The PKs lead with `id`. Say so in the row.
  - Minor: as with PF-3, the demo-data copy is demo-shaped, and `migrate diff` is filtered to FO-1b objects.
    The amendment's "second of FO-1b and PF-4 shows migrate diff empty" now falls on PF-4, and PF-4's PR must show it.
* **Map rows 37 and 41 as a whole: Not tested (not built).** No booking API (FO-3) exists, no public booking page, and no screen for staff hours or time off is on main.
  Today nobody can book, see free slots, or set their hours or time off. "No double booking" is proven only as a database refusal (23P01), with no slot search and no person-facing message behind it.

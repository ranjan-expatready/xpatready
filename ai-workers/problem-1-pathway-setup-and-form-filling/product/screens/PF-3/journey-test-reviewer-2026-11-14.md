# PF-3 journey test: reviewer, 14 Nov 2026 (commit 7e4a4831)

PF-3 is schema and seed only: no screen, no route. A "user" here is the person who brings the platform up on a copy (the tech lead or a lane), or the next row's code (PF-4, FO) using the tables. Nothing was walked in a browser. Accessibility, screen sizes and visual quality are N/A. Everything ran on scratch databases on 127.0.0.1:54329 (a template copy of `xr_studio_demo` and the check's own databases), never :4400.

## Journeys (main path first)
1. **Bring the platform up on a demo copy** (tech lead; "the Sample firms exist as platform firms"): apply PF-3's migration to a copy of the demo database, then run `tsx api/src/platform/seed-sample-firms.ts`.
   * Expected: 2 firms with keys `sample-firm` and `sample-solo`, 4 staff with actor ids, licences, and nothing else changed.
   * Result: **held.** The copy's counts were unchanged by the migration. The seed printed `{"firmsAdded":2,"staffAdded":4,"grantsAdded":6,"credentialsAdded":3,"subscriptionsAdded":2,…,"unmatchedCaseFirmKeys":[]}`. `migrate diff` named no PF-3 object.
2. **Run it again** (alternate: double start): **held.** Every count was 0. The check's snapshot, timestamps included, was identical.
3. **Empty case:** the seed against a database without the Sample plans. **Held.** It is refused in words ("the Sample plans are missing (the PF-3 migration adds them)") and writes nothing.
4. **Error, bad input:** set currency to EUR, business hours closing before opening, time zone "Mars/Olympus". **Held.** Each gives a 400 "Setting not saved" with the field issues; no row and no audit line are written.
5. **Wrong firm:**
   * Looking up firm B's staff id through `firmScope(A)` gives 404. **Held.**
   * Writing a firm A grant onto firm B's staff member is accepted by the database. **Broken (review M1).**
6. **Recovery:**
   * A forced audit failure rolls the setting back. **Held.**
   * The caller's transaction rolling back takes both the setting and its audit line. **Held.**
   * The migration's written rollback runs, and the migration re-applies after it. **Held.**
7. **Race:**
   * 10 concurrent first writes of one setting give 1 row and 10 audit lines with a correct from→to chain. **Held.**
   * Two outbox writers committing out of order: a `seq` reader skips the earlier one for good. **Broken (review M2).**
8. **Across the boundary (to the case side):**
   * Every `runtime_case.firm_key` matches a `platform_firm.key` after the seed. **Held** in the check: a stray `other-firm` case is named. The real demo copy here has no cases, so this was vacuous on it.
   * After a demo reset, setting values stay but their audit lines are swept (`demo.ts:590-594`). **Weak (review m3)**, by code reading plus a database with no workspace rows.

## Data underneath
* Values are exactly as given, and the audit line has actor, `entity_key` `<firm>:<key>`, from and to.
* The 774 permission rows equal an independent parse of SA-06 v3.15 §10b.
* Things that should be refused but were accepted:
  * the cross-firm grant and revocation rows (M1)
  * an invitation with `roles` NULL (m1)
  * an invitation with a future `created_at` (m6)

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1-2 on a real demo copy; 55/55 and 8/8 checks |
| Next step obvious | ½ | The seed is wired into neither start-up nor the reset; it is run by hand (PR question 2) |
| Plain words | 1 | Seed and setting refusals read as sentences; database errors name their rule |
| Feedback and state | 1 | The seed prints what it added; `SettingRefused` lists the issues |
| Correct data | ½ | Happy-path data exact; M1, m1 and m6 let wrong rows in |
| Error recovery | 1 | Rollbacks hold; re-run refused; rollback script works |
| Accessibility and screen sizes | N/A | No screen |
| Speed | 1 | Check 16 s; seed under 2 s; firm-first indexes |
| Visual quality | N/A | No screen |
| Trust and sources | 1 | Keys cited from SA-06 and verified; Sample labelled; AG01-3 for two-step |

**7 of 8 applicable = 8.75, reported as 8.5 / 10. Pass (8 or more, no 0)**, on the user-facing surface only. The review's two Majors (M1, M2) are code findings and still decide its verdict, which is **Block**.

To raise the half-scores:
* Composite `(firm_id, staff_id)` keys and NOT NULL roles (Correct data).
* A one-line seed call after migrations, in PF-4 or a follow-up row (Next step obvious).

## Not tested
* Any browser, keyboard or screen-reader use (there is no screen).
* A demo copy with real cases (the demo database here is empty).
* A real demo reset through the API on an isolated port.
* An intended user's unaided walk: D17 and D20 stay with the founder.

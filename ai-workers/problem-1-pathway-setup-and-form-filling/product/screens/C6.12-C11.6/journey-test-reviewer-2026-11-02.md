# Journey test, reviewer: unified /prepare on main's filing tables (C6.12 + C11.6), commit 80da83d0 (round 3)

2 Nov 2026, reviewer agent. Backend only, no screen. I walked the journeys over the API, the way the case officer's "Prepare application" screen would call it. Most were run on a **case that main's tables held before the upgrade**: isolated copy :4442 (`xr_studio_rev356`), populated by the suites, rolled back with the migration's own rollback text, refilled in main's shape (kind `form`, `form_key`, the line's channel stored), then migrated forward again. Mutation and baseline runs used throwaway copies on :4443/:4444. US$0, live AI off, never :4400. All copies are stopped and the throwaway databases dropped.

## Journeys (persona: case officer unless stated)
1. **Main: open the prepare view of an existing family case** (4 people, made before the upgrade). 200 in 161 ms, with 4 filings, 1 family group and 17 items (form, document, step). Every form item id from before the upgrade is kept: 135 of 135 across all 27 cases, with the same active flags. 124 document and step items were added. A second read of all 27 cases rewrote no row (xmin unchanged).
2. **Choose Paper for one form.** Without a reason: 400 on `reason`, quoting IRCC's "You must apply online". With a reason: 200, PAPER, signature PEN. With the older version: 409 "Changed since you read it".
3. **Split one filing out.** Without a reason: 400 naming the family maximums lost (CAD 500 for 5 or more, biometrics CAD 170). With a reason: 200, groups family:3 + separate:1.
4. **Someone stops, then starts travelling** (after the split and the Paper choice). While stopped: 3 filings, 1 in `not_filing`. Back again: the same filing id, still split, the same item ids, and PAPER kept.
5. **Wrong role.** Client 403, configuration author 403, no actor 401, a client's channel change 403. HEAD on /prepare is 405 (#325 B4).
6. **Audit.** No audit line holds the split reason or the Paper reason.
7. **Recovery and load.** 40 reads at once on the upgraded case: all 200, slowest 2.0 s, no row rewritten. The suites' races (3, 24 and 120 reads; two splits at once) hold.
8. **Across the boundary: the /filings view (#283) that the same screen family reads.** Here it does not hold for #283's own suite. `tests/runtime/check_vv_filings_api.ts` passes 12/12 on main and 10/12 on this commit (review-r3 M1).

## Data underneath
I checked the following after the upgrade:
* `case_id` and `item_key` are filled for every item.
* `channel` is null on every converted row.
* kinds are FAMILY.
* The constraint and index names match `schema.prisma`, the partial index `submission_group_one_family` and the check constraints.

The rollback text ran as written in one transaction. It gave back exactly main's constraints, indexes and NOT NULLs. The forward migration then ran again cleanly.

## Break it
I removed rules one at a time on a throwaway copy:
* Without the fast-path "item active" clause, the store suite fails "a form that no longer applies…" (33/34).
* Without the row lock, the 3- and 24-first-read races fail with 409s (32/34).

Both rules have a test that bites.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J4 on an upgraded case; pack 4 C6.12 24/24, C11.6 14/14 |
| Next step obvious | ½ | Items carry states and reasons; readiness is still the C7.6 stub |
| Plain words | 1 | Refusals name the field, the maximums lost and IRCC's line |
| Feedback and state | 1 | `changed`, version, 409 "Reload" |
| Correct data | ½ | Ids, channels and splits are kept through the upgrade; #283's /filings suite fails 2 checks (M1) |
| Error recovery | 1 | 409 on stale, same-channel no-op, races 200 + 409 |
| Accessibility and screen sizes | ½ | No screen yet: not testable |
| Speed | 1 | 161 ms first read; 40 at once ≤ 2.0 s |
| Visual quality | ½ | No screen yet |
| Trust and sources | 1 | Fee lines cite IRCC pages; amounts Sample; reasons kept out of audit |
| **Total** | **8/10** | Passes (8+, no 0) |

To raise it: fix M1 (correct data). The screen-dependent criteria wait for the screen.
I could not test a real screen reader, a browser walk or axe (there is no page), or an intended user's own walk (D17 and D20 stay with the founder).

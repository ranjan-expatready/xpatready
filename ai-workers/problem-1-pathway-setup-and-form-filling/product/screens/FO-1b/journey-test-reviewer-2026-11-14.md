# FO-1b journey test: reviewer, 14 Nov 2026 (commit 0049ff37)

FO-1b covers schema, migration, seed and test only: no screen, no route. A "user" here is either the person who brings the booking tables up on a copy (the tech lead or a lane), or the next row's code (FO-3, PF-4) writing to the tables. Nothing was walked in a browser, so accessibility, screen sizes and visual quality are N/A. Everything ran on scratch databases on 127.0.0.1:54329 (`xr_studio_rev_fo1b_*`, the check's own databases, and an isolated copy at :4437), never :4400. I re-ran the checks from a `git archive` of 0049ff37, because uncommitted edits appeared in the shared checkout during the review (see review.md).

## Journeys (main path first)
1. **Bring the booking tables up** (tech lead): apply every migration, run `seed-sample-firms.ts`, then `booking-seed.ts`.
   * Expected: five fo_ tables and `btree_gist` exist; each Sample staff member has Mon-Fri 09:00-17:00 America/Toronto; `migrate diff` stays clean.
   * Result: **held.** The seed printed `{"sample-firm":15,"sample-solo":5}`. `migrate diff` named only main's 5 known lines.
2. **Run it again** (alternate, double start). **Held.** The output was `{"sample-firm":0,"sample-solo":0}`. A person's own removed Friday stays removed (check line 228-230).
3. **Empty case:** a firm whose business hours are an empty list. **Held**: no windows are written (`booking-seed.ts:43`).
4. **Error, bad input:**
   * A slug with capitals, a mode listed twice, a length of 600 minutes, a negative gap, the zone `Mars/Olympus`, or an end before the start: each refused, and the error names its rule. **Held.**
   * The zone `Foo/Bar+5`: **accepted** (review m3).
   * A 365-day booking: **accepted** (review m7).
5. **Wrong firm:** a firm B host on a firm A type, a firm B staff member or type on a firm A booking, time off or window, copying hours to firm B's person, or changing `firm_id`: each refused. **Held.** Deleting a staff member who has bookings leaves them dangling (review m2).
6. **Recovery:**
   * The migration refuses a second apply. **Held.**
   * The rollback written in the header **fails as written** (DROP TYPE before DROP FUNCTION; review m4). With the order swapped it runs, and the migration re-applies.
7. **Race:**
   * Two connections booking an overlapping slot: the second waits, then gets 23P01. **Held.**
   * Two reschedules into one slot. **Held.**
   * A token insert racing a cancel, in READ COMMITTED. **Held.**
   * Under REPEATABLE READ, a reschedule leaves a token live (review m1).
   * A transaction that updates a token before the booking deadlocks against a cancel (40P01; a note for FO-3).
8. **Across the boundary (to FO-3, through the Prisma client):**
   * `create`, `update`, `createMany` and `include` work with `Unsupported("tstzrange")?` and `@updatedAt`. **Held.**
   * An overlap reaches Prisma as `DriverAdapterError` with `cause.originalCode` "23P01", so FO-3 must map it to 409.
9. **Demo reset:** `check_s7_reset.ts` on an isolated copy gave 4/4. **Held.** fo_ rows carry no workspace id and stay.

## Data underneath
* `block_range` is exact: [start − gap before, end + gap after). A value the app writes is replaced.
* `sequence`:
  * 0 when written;
  * +1 on a change to time, host, type, mode or status;
  * unchanged when the person is linked.
* Tokens:
  * the expiry equals the meeting's end;
  * all of them are voided on a reschedule or cancel;
  * only `voided_at` changes, once.
* Things that should be refused but were accepted:
  * POSIX zones;
  * endless bookings;
  * a host change without RESCHEDULED, which leaves the tokens live;
  * COMPLETED before the end;
  * a future `voided_at`;
  * an orphan left by a staff delete.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1-2 and 9; 58/58, 8/8 and 75/75 checks; `migrate diff` clean |
| Next step obvious | ½ | The seed is run by hand (not wired to start or reset, like PF-3's); the PR body has no checks or Lead B question yet |
| Plain words | 1 | Trigger errors read as sentences ("a change of time is a reschedule (status RESCHEDULED)") and name their rule |
| Feedback and state | 1 | The seed prints what it added; every refusal names the constraint |
| Correct data | ½ | The happy path is exact; m2, m3, m6, m7 and m9 let wrong rows in |
| Error recovery | ½ | The written rollback fails (m4); the deadlock order is undocumented |
| Accessibility and screen sizes | N/A | No screen |
| Speed | 1 | Check 18 s, seed under 2 s, gist indexes led by `firm_id` |
| Visual quality | N/A | No screen |
| Trust and sources | 1 | Every rule cites its AG-04 card; Sample timings labelled |

**6.5 of 8 applicable = 8.1, reported as 8 / 10. Pass (8 or more, no 0).** The verdict is in review.md: Approve, with no Blocker or Major.

To raise the half-scores, most valuable first:
* Correct data: zone pattern, length limit, host change counted as a reschedule, tokens' `voided_at` not in the future (m3, m7, m6, m9).
* Error recovery: rollback order (m4); READ COMMITTED and lock order written down (m1).
* Next step obvious: finish the PR body with the Lead B question; a one-line seed call in FO-3 or PF-4.

## Not tested
* Any browser, keyboard or screen-reader use (there is no screen).
* A copy of the real demo database: the environment refused the `pg_dump`, and the brief forbids touching `xr_studio_demo`.
* Every existing suite: CI runs them, and I ran only the schema, PF-3 and reset suites.
* An intended user's unaided walk: D17 and D20 stay with the founder.

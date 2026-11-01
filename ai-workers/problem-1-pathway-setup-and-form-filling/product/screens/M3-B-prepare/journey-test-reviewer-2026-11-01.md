# Journey test, reviewer: C6.12 /prepare and stored filings (M3-B2), commit 6c832db3

1 Nov 2026, reviewer agent. Backend-only slice: I walked the journeys over the API on the isolated copy :4469 (`xr_studio_revprep`), calling it as the case officer's screen would. The copy is stopped now. No screen exists yet, so there was no browser walk, axe or screen-size pass. Persona: the case officer, unless stated.

## Journeys
1. **Main: a visitor family of three.** Goal: "what does each of us file, through what, and what do we pay?" New case, add a spouse and a child, then `GET …/prepare`.
   - Held: 3 `files_own` filings with stored UUIDs and one family group that can be split.
   - Held: 6 form items (IMM 5257 and IMM 5707 per person), each on the release line's channel, with `accepts`, `signature` and a plain reason ("IMM 5257 for Sample Spouse A: always required for this combination.").
   - Held: fees of 3 × CAD 100, plus CAD 170 biometrics on the principal's filing and 2 exempt lines. Every line is on a stored filing id and cites the IRCC fee list.
2. **Alternate: a family of six** (API check). Held: CAD 500 paid once on the principal's filing, with the other 5 lines exempt and each giving a reason.
3. **Someone stops travelling, then travels again.**
   - Held: the child moves to `not_filing` with a reason, and has no filing, item or fee. The filing is kept inactive.
   - Held: travelling again brings back the same filing id and the same item ids.
   - Not held: the words say "Not applying", not "not travelling" (review m4).
4. **A form stops applying, then applies again** (pinned snapshot edited, then restored). Held: the 3 IMM 5707 items went inactive and were hidden, and came back with the same ids.
5. **Wrong role.** Held: client 403 and configuration author 403, both Problem Details.
6. **Error.** Held:
   - unknown case: 404;
   - a release naming another combination: 409 Problem Details, then 200 once restored;
   - another combination (`wp.family`): `derived:false` in plain words, nothing stored.
7. **Recovery: reload and double click.** Held: 10 reads gave the same version, and three first reads at once stored one group and returned the same version. But every read rewrites every row (review M1).
8. **Cross-boundary: hand-off to C11.6 (channel per item).** Held: item `id`, `channel`, `accepts`, `version`, view `version` and a read-only `portal` are present. C11.6's own rows need its setup and the PATCH route, so they are 0/14, as expected.

## Data underneath
* The rows match the view: filings, applicants and one group per case.
* Inactive rows are kept, never deleted.
* Deleting a case cascades cleanly (checked inside a rolled-back transaction).
* No audit line is written for the derived rows. They are not user actions, but they are written on every read (M1).
* Roles are enforced on the server in `Runtime.reach`.

## Break it
* Three concurrent first reads stored one set (the advisory lock).
* Removing a form from the release kept its ids.
* A person PATCH racing a slow read can leave stale `active` flags until the next read (review m2).
* Filing order rests on millisecond timestamps (review m3).
* Severity: one Major (M1) and four Minor.

## Score (the one journey score for this check)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J4: filings, items and fees correct for the Visitor visa; ids stable |
| Next step obvious | ½ | Item `state` (to_do, waiting) and reasons are given; no next action yet (later slices) |
| Plain words | 1 | Reasons are plain, with no codes; one wording gap ("not travelling", m4) |
| Feedback and state | 1 | `derived`, `state`, `not_filing`, `not_built`, `version` |
| Correct data | 1 | Fee lines on stored ids add up to the group total; no duplicates under a race |
| Error recovery | 1 | 403, 404 and 409 Problem Details; restoring gives 200 |
| Accessibility and screen sizes | n/a | No screen |
| Speed | ½ | 75–107 ms per read, about 30 statements, rewrites every row (against 19 ms for `/filings`) |
| Visual quality | n/a | No screen |
| Trust and sources | 1 | Fee source with URL, quote and date read; everything else Sample; gaps declared |

**7 of 8 applicable = 8.75/10, reported as 8.5. Pass** (no criterion at 0). Fixes that would raise it, most valuable first:
1. Write only on a change, with a constant number of statements (M1). This raises Speed.
2. Use the "not travelling" words (m4).
3. Give a next action per item in the screen slice.

## Not tested
* Any screen and a real screen reader.
* The live IRCC fee page.
* An intended user's unaided walk (D17 and D20 stay with the founder).

---

# Round 2: commit 66bb8816 (reviewer, 1 Nov 2026, :4471 `xr_studio_rev2prep`, stopped afterwards)

Same journeys J1–J4 through the API: officer reads /prepare; person off and on; form stops applying; client and author refused.
* **Held.** Ids are stable across person and form changes. The xmin check shows a steady read writes nothing. An edited snapshot gets 409, HEAD gets 405, and the words say "not travelling". API check 31/31.
* **Break it.** Several officers opening /prepare at once on cases with something new to store:
  - 12 new cases, one read each, all at once: 11×500. Any other route waits 14.6 s.
  - 10 reads at once on one new case: 10×500 after 15.6 s.
  - Cause: the pool deadlocks because the transaction also queries through `this.db` (review round 2, R2-M1, Major).
  - Steady reads: 300 at once all returned 200.
* **Minor.** Filing order is arbitrary (principal third of five) (R2-m1).

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J4 hold; m1 and B2 now tested |
| Next step obvious | ½ | Item `state` and reasons; no next action yet (later slices) |
| Plain words | 1 | "Not travelling (not applying on this case)"; 409 texts plain |
| Feedback and state | 1 | `derived`, `state`, `not_filing`, `not_built` (G15 named), `version` |
| Correct data | 1 | Nothing written on a steady read; no duplicates; fees add up |
| Error recovery | ½ | 500 (P2028) under concurrent first reads; a retry one at a time gives 200 |
| Accessibility and screen sizes | n/a | No screen |
| Speed | ½ | Steady read 50–83 ms; a write burst stalls the whole API for 15 s |
| Visual quality | n/a | No screen |
| Trust and sources | 1 | Fee source cited; fingerprint checked before storing |

**6.5 of 8 applicable = 8.1/10, reported as 8. Pass** (no criterion at 0). Fixes, most valuable first:
1. Use only `tx` inside the transaction (R2-M1). This raises Error recovery and Speed.
2. Order filings by participant (R2-m1).

Not tested: any screen, a real screen reader, the live IRCC page, or an intended user's walk (D17 and D20 stay with the founder).

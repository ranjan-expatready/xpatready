# C6.1 review: V3 B1 openable list (commit dfd22a166)

Reviewer: fresh context, own copy on :4438 (not :4400), live AI off, US$0. Test run on that copy: check_v3b1_openable.ts 21/21 pass; setup_visitor_visa 13/13.

**Journey score (reviewer): 8/10.** Officer opens the dialog, sees only ready combinations, a not-ready one is named with the plain sentence, Open case is disabled with a title when none is ready, and the 409 says the same sentence. Not 10: the "none ready" state was only seen through a stubbed response (see M2), and there is no run with two releases of one combination.

## Verdict: Approve

No open Blocker or Major.

## What I checked
1. Same release and same rule: Approve. `openable` takes the highest version per not-retired combination (`distinct combinationId`, `orderBy version desc`); `createCase` takes the highest version for the combination and refuses a retired one. Versions are unique per combination, so they agree. Both call `Programs.startableMissing` and `notReadyForCases`, so the sentence is identical (test B1-9 compares the strings).
2. Permissions: `need(actor,"case")`. Measured: officer 200, client (user-P) 403, author (user-A) 403. Workspace filter is applied to the releases. Combinations are workspace-wide in this model, so no cross-firm leak. Small gap: `createCase` also requires firm staff, `openable` does not (see m1).
3. Performance: 2 released combinations, 94-212 ms per call (warm ~100 ms). Each combination runs `startableMissing`, which does its own library read, `structureProblems` and validate, so cost grows linearly with released combinations. Fine for the prototype; see m2.
4. Test quality: each rule has a pass and a fail (B1-1/2 403s, B1-3/4 pass, B1-7/8 fail, B1-9, B1-10, B1-11/12, B1-13/13a, B1-14/15). The not-ready state is made by really retiring a library field and is restored in `finally`. Waits are 30 s and throw loudly; the only fixed wait is a 500 ms/300 ms settle after an action, not a swallowed timeout. Axe at 1440 and 400 px included.
5. Other users of the old `/releases` data: none. `EmployerLinkFor` now receives the id from the startable `combos` only; `/releases` is still used by the Releases page (history.tsx), unchanged. `newestReleases` import dropped from cases.tsx; the helper stays in contracts (still exported, check it is not now dead code).

## Findings
- Blocker: none. Major: none.
- M1 (Minor) m1: `openable` lets non-firm case staff read the list, while opening a case refuses them (403, "not staff of a firm"). Same rule would be one line; not a leak, only the dialog could offer what then fails for such a person. All current case personas belong to a firm.
- M2 (Minor) m2: "none ready" (B1-13) uses a stubbed response, so the real server answering all-not-ready is covered only by B1-7..9 for one combination. Acceptable; say so in the PR.
- m3 (Minor): per-request cost is linear in released combinations (see 3); fine now, note it if the release count grows. No per-row HTTP requests from the web (one call).
- m4 (Minor): no test with a combination that has two releases (newest wins); the copy only has release 1 of each. The rule is simple and reads the same query shape as `createCase`, so I accept it.
- m5 (Minor): `f.combinationId` keeps a stale choice if that combination later turns not ready while the dialog stays open; the server still refuses with the 409, so no wrong case is written.

## Could not check
Keyboard-only and 200 % zoom by eye (axe and the 400 px no-sideways-scroll check pass; screenshots 01-04 are in screenshots/v3b1-openable). Whether `newestReleases` still has another caller.

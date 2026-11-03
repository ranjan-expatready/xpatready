# C6.1 review: V3 B1 openable list (commit d7b9b80fa, PR #714)

Reviewer: fresh context, own copy `rev2_open` on :4438 (not :4400), live AI off, US$0, copy stopped after. Earlier review (dfd22a166, Approve with Minors) and break-report.md read; this review covers the whole diff `origin/main...d7b9b80fa` with weight on the commits since dfd22a166.
Run: `check_v3b1_openable.ts 4438 xr_studio_rev2_open` 24/24 pass in 31 s (includes new B1-16, B1-17). Own probe at 1024 px and 512 px (200 % zoom of 1024), keyboard to the dialog. Screenshots written by the run were restored to the commit's copies (not part of this review's output).

**Journey score (reviewer): 8/10** (journey-test-reviewer-2026-11-03.md). Pass on score, but a Major is open.

## Verdict: Block

Fix list: **M1** below. Minors are optional.

## What I checked
1. Same release, same rule: holds. `openable` (`api/src/runtime.ts:139-150`) takes each not-retired combination's highest version and runs `Programs.startableMissing`; `createCase` (`:83-92`) takes the highest version, refuses a retired combination, runs the same check and the same `notReadyForCases` sentence. B1-9 compares the two strings word for word.
2. Permissions: `need(actor,"case")` then the new firm-staff check with createCase's exact sentence (`:142`). Client and author 403 (B1-1, B1-2). All current case-duty personas (user-O, R, T, S) are firm staff, so the firm rule is unreachable today (m1).
3. Break m2 fix: `Array.isArray` guard and `loadFailed` (`web/src/runtime/cases.tsx:115-117`); an HTML 200 shows "Could not load", Open case disabled, no page error (B1-17, real browser). Correct.
4. Break m3 fix: `[overflow-wrap:anywhere]` on the not-ready list (`cases.tsx:137`); the rule is in the built CSS (`web/dist/assets/index-CxkRBq1x.css`). Not re-measured with an 80-char name; trusted from the class.
5. Break m1 fix: a 409 refetches `/runtime/openable` (`cases.tsx:125`), and B1-16 shows the refused release leaves the list and is named. The list part holds; the selection part does not (M1).
6. Replay edit (`product/reports/verify-2026-11-03/V3/v3_golden_replay.cjs:122-131`): correct and minimal. It picks "Visitor visa ·" when offered (the release the V3 story builds), and when it is not offered, or Open case is disabled, records a synthetic `{s:409}` with the dialog's notice text instead of clicking a disabled button. Step 4's verdict keeps its meaning (`firstTry >= 300` still fails it, then the recovery release runs). Nit: the `info("4a …", {http: 409})` line then reports an HTTP status no request produced; the `b` text says `"dialog"`, so it can be read, but "http" is loose.
7. Other users of the dialog's old data: none. `["runtime","openable"]` is read only by `NewCaseDialog`; `/releases` is still read by history.tsx, unchanged. `newestReleases` (`contracts/runtime.ts:208`) now has no caller in api or web (dead export, as the breaker noted).
8. Tests: each rule has a pass and a fail (B1-1/2, 3/4, 5, 7/8, 9, 10, 11/12, 13/13a, 14/15, 16, 17). Every wait has a 30 s timeout that throws; no catch swallows one. The not-ready state is a real retired library field, restored in `finally`. Removing the server's startable check fails B1-7/8; removing the client filter fails B1-11; removing the refetch fails B1-16; removing the guard fails B1-17.
9. Graph: C6.1 named by 8 tests; `/runtime/openable` not listed as untested.

## Findings
- **Blocker:** none.
- **M1 (Major, Must): after the 409 refetch the dialog shows one combination and sends another.** Reproduced on :4438 at 1024 px: officer picks "Visitor visa · release 1", fills the form, the field is retired, Open case gives the 409 and the list reloads; the select now shows "With an LMIA · release 1" (only remaining option), but `f.combinationId` still holds the Visitor visa id. A second Open case POSTs Visitor visa again (captured request bodies: `["VisitorVisa","VisitorVisa"]`) and is refused again with the Visitor visa sentence while the screen shows LMIA. The officer cannot fix it in the dialog: choosing the already-shown option fires no change, so with one option left the only way out is to close and reopen, which is break m1 still open in a new form. If Visitor visa turns ready again before that second click, a Visitor visa case opens while the dialog showed LMIA: a case on a combination the officer did not see chosen. `EmployerLinkFor` gets the same stale id (`cases.tsx:144`). Evidence: `cases.tsx:119,123,132,144`; screenshot `/tmp/claude-0/-home-user-xpatready/69fa6f92-f7dd-5f44-92be-30da0d2e8d56/scratchpad/stale-after-refetch.png` (scratch, not committed). Fix: work out the choice once, `const chosen = combos.some((c) => c.combination_id === f.combinationId) ? f.combinationId : combos[0]?.combination_id`, and use `chosen` in the Select value, the POST body and `EmployerLinkFor`. Extend B1-16 so that a second Open case sends (or opens, 201) the combination shown. B1-16 passes today because it checks only the option list.
- m1 (Minor, Should): the new firm-staff rule on `openable` has no fail test, and none can run with today's personas. Say so in the PR. A test needs a case-duty persona outside any firm, so do not add one only for this.
- m2 (Minor): carried from the earlier review. Cost per request grows with the number of released combinations (one `startableMissing` each). The web makes one call, not one per row.
- m3 (Minor): carried. No two-release combination in the test, so "newest wins" is shown by the code shape and the breaker's manual v2 copy only.
- Nit: `newestReleases` is a dead export. Replay `http` label (see 6).

## Standards and concept (this item's scope only)
Words match the 409 sentence; no field keys or author steps to the officer (B1-10). Axe WCAG 2.2 A/AA clean at 1440 and 400 px in the three dialog states. No sideways scroll at 400 and 512 px. Keyboard: Tab reaches "Open a case", Enter opens the dialog and focus moves into it. The release gate itself is F2's row (P-297 (3)) and is not judged here.

## Could not check
A real screen reader. 200 % zoom in a real browser zoom (measured as a 512 px viewport). The breaker's unconfirmed "case written 0.23 s after a retire" was not reproduced here: every refused POST in my run wrote no case. D17/D20 stay with the founder.

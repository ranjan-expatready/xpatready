# C1.3 + C11.5 part 2 — independent screen review (commit da3032f87, PR #1051)

Reviewer: a fresh Opus session that did not build or challenge this screen (skill screen-review; journey score from skill journey-test, `journey-test-reviewer-2026-11-05.md`). Inputs: concept r2, `challenge.md`, the tech lead's ruling on #1051 (copy once; one Sample employer case per firm, SI-10; no migration, freshness by the answer ids seen under the case row lock; BR-5's Declared accepted; C11.5 fix by person). Evidence: my own copy `rv_c13` on :4433 (configured checkpoint, blank start), US$0, no AI, no `*_LIVE`, nothing priced clicked.

**Overall (skill scale): Ship after fixes.** The rule, the API and the drawer are right and match the concept. Two Majors, both cheap to fix: focus is lost after Copy, and the race test does not prove the row lock.

## Runs on the exact commit
* `tests/check_c13_employer_link.ts 4433 xr_studio_rv_c13`: **44/44** (43 when the checkpoint is already loaded, as `qa/built/C1.3.md` says).
* `tests/check_c13_employer_link_browser.cjs 4433`: **22/22**, no page errors.
* `tests/runtime/check_c115_employer.ts`: 20/20. `tests/check_stand_ins.ts`: 9/9 (SI-10 now has its chip on screen). `graph.mjs --check`: G1 0, G2 0; both new routes named by the check; no gap on this screen.
* My journeys (Playwright, 1024 px, 512 px = 1024 at 200 %, 1440 px, keyboard only, three actors): **journey score 8/10, no criterion at 0 (pass)**, in `journey-test-reviewer-2026-11-05.md`. The four ½ scores: feedback, error recovery, accessibility, trust and sources.

## Does each rule's test fail when the rule is removed? (my mutations, server rebuilt from a scratch copy)
| Rule | Mutation | Caught |
|---|---|---|
| BR-6 stale (M2) | drop `if (changed.length) stale(…)` | yes, 2 FAIL |
| BR-6 once | drop `if (before) notPossible(…)` | yes, 1 FAIL |
| BR-6 race | drop `SELECT … FROM runtime_case … FOR UPDATE` | **no, 0 FAIL** (Major 2) |
| BR-4 kept unless ticked | write every Different | yes, 4 FAIL |
| C11.5 by person (m1) | drop `e.person !== "representative"` | yes, 4 FAIL (VV, SP offered again) |
| BR-7 firms apart | drop the firm filter | yes, 13 FAIL |
| BR-4 composite Same (M3) | drop `inStoredOrder` in `factState` | yes in the pure test; the API path is normalised twice (`carriedFacts` and jsonb) |

## Issues (ranked)
**Major 1 (Must) — focus is lost after a successful copy (WCAG 2.4.3; EXPERIENCE §2.12 [M] keyboard path).** `employer.tsx:45` passes `returnFocus={() => opener.current}`, but once linked the "Choose employer case…" button is unmounted (`employer.tsx:44`, `!linked`), so after Copy the focus falls to `<body>` (measured: `document.activeElement` = BODY; a keyboard user then needs 9 Tabs to get back). This codebase already treats this as a Major: `Panel`'s own comment (`controls.tsx:101`, G1 PR 2b review MJ-2) asks for "the next one when that row left the list". Fix: fall back to the linked line (make `[data-testid=employer-linked]` `tabIndex={-1}`) or the ⓘ button when the opener is gone; assert the focus target after Copy in the browser check.

**Major 2 (Must) — the race test passes with the row lock removed (STANDARDS §7 [M] "a rule's test fails when the rule is removed"; D2).** `check_c13_employer_link.ts:144-148` races on a case where all 3 facts are New, so `uq_answer_current` turns the second write into P2002 → 409 even without the lock. On an all-Same case ("Link without copying", nothing written) the lock is the only guard: without it, **4 of 5** cases I raced (4 parallel POSTs each) were linked 2–4 times (several `relied on employer case` events). The code at this commit is correct; the proof is not. Fix: add a race on an all-Same case asserting one 201 and exactly one audit event.

**Minor 1 (Should) — one link, two dates.** The server writes "linked 4 Nov 2026" (`employer-link.ts:30`, `timeZone: "America/Toronto"`); the header says "facts copied 5 Nov 2026" (`employer.tsx:20`, browser time) for the same link (J8, at 03:58 UTC). Use one date function, one zone.

**Minor 2 (Should) — the source tooltip.** `EmployerCaseSource` (`employer.tsx:113-114`) uses a `title` attribute (not reachable by keyboard or touch; EXPERIENCE §2.10) and drops the employer case's name that concept §5 asks for ("Copied from <employer case> on <date>"). `source_json.employer_label` is stored; show it.

**Minor 3 (Should) — the 409s in the drawer.** (a) The error shows twice: in the Notice and as a danger toast (`useAction`'s `onError`), and the toast covers the drawer's primary button for 9 s (builder's screenshot 6; my j8). (b) "Already linked" from a second tab offers no Reload, and the page behind still shows "Choose employer case…" until a manual reload. Fix: no toast when the Notice shows it; on a 409 refresh `["runtime","view",caseId]`.

**Minor 4 (Should) — tests against concept §6.** (a) The BR-5 check (`:125-132`) confirms the section after the name was corrected to `agent_view`, so it never confirms a `linked_file` answer and does not assert VERIFIED (I checked by hand: all three become VERIFIED with `answered.channel = linked_file`). (b) [M4] "the IMM 5710 fill preview shows the three copied values" is only `fills` metadata; by hand, after Confirm, IMM 5710's draft reports `written_now: 3`. (c) 1024 px is not in the browser check (concept §4 lists 1440, 1024, 390). (d) `refuseIfCaseRecorded` has no test. (e) No `acceptance/C1.3.test.ts` as the concept and the ruling name, so gate B finds no C1.3 pack; say where the pack lives.

**Minor 5 (Should) — PR body.** It still reads "Concept stage only … Checks and results: None yet". The ruling (4) asks the BR-5 departure to be said in the PR; add the checks, screenshots and "On the demo".

**Minor 6 (Should) — duplicated web/API code (STANDARDS §7).** `LINKED_FILE`, `dateWords` and the `Linked`/`FactLine` shapes are written twice (`employer.tsx:13-15,20,112` vs the engine and API). The web already imports `contracts/`; import the engine's constant and type rather than copy them (m8 kept them out of `contracts/`, which is fine).

Not findings (P-26): the Agent view shows "…, canada" in lower case: this is the questionnaire's address formatter, which existed before this PR. The "no employer case in this firm" state cannot be reached on the demo, because every Sample firm has one.

## [M] lines touched (met unless named)
STANDARDS: content as data (Sample file, labels from the release) · authorisation on the server (client and author 403, other firm 404 without the name, no actor 401) · Problem Details with field errors (stale lists labels) · freshness by seen ids under the row lock, as ruled instead of a version column · no migration (as ruled) · no per-row requests (one answers query; at most 3 field lookups inside the write) · personal data never in audit text (keys only) · axe on every state (clean at 1440, 1024, 512/200 %, 390) · **a rule's test fails when it is removed: not met for the lock (Major 2)** · no duplicated logic: not met (Minor 6). EXPERIENCE: Side panel pattern, 560 px · one primary action · status by text and shape (New, Same as on this case, Different) · states drawn (loading, empty, saving, stale with Reload, already linked, linked read-only) · tooltips on the line and chip; **keyboard path: not met after Copy (Major 1)**; the source tooltip only half met (Minor 2) · demo chrome ("Acting as (simulated)") separate · words per PRODUCT §4 ("Relies on an employer case", Employer case, Case officer).

## D1–D20
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | BR-1…BR-7 behave as the concept says; SA-1B-283 r4 copy once; the Minors are wording and tests |
| D2 Data integrity | 4 | stale, second link and other firm refused; the lock is right but unproven (Major 2) |
| D3 Reuse | 5 | copies are ordinary library-keyed answers on the subject `aboutOf` gives; no new table |
| D4 Rule integrity | 4 | only facts the pinned release reads and asks; blank stays blank; Corporate never |
| D5 Stability | 4 | reload, double click (one event), Escape all fine; focus lost after Copy |
| D6 Governance | 4 | one audit event with actor, date and facts; the old value kept in history when replaced |
| D7 AI trust | n/a | no AI |
| D8 Orientation | 4 | path, header line naming the employer case |
| D9 Flow | 5 | Choose → (tick) → Copy: 2–3 actions; the toast says to confirm in the section |
| D10 Language | 4 | plain words, tooltips; the source tooltip lacks the name (Minor 2) |
| D11 Feedback | 4 | busy button, counts on the button, Notice; the error is doubled and the toast covers the button (Minor 3) |
| D12 Visual | 4 | team tokens and pills; clean at 200 % |
| D13 Accessibility | 3 | axe clean everywhere, no sideways scroll; focus lost after Copy (Major 1) |
| D14 Team look | 4 | CaseLink names, team badge mapping recorded |
| D15 Speed | 5 | case page 556 ms, drawer facts 74 ms, copy and header 323 ms |
| D16 Testability | 3 | 6 of 7 mutations caught; the lock is not (Major 2) |
| D17 / D20 | simulated only | no intended user walked it |
| D18 Provenance | 4 | "Employer case" beside "To confirm", the channel line "employer case · Case officer · date", the header date |
| D19 Closure | 4 | copy → Confirm → IMM 5710 draft writes 3 (by hand, not in a test) |

## Retrofit mapping
Recorded: concept §5 (screen "Employer case" = team badge "Linked file"; audit "relied on employer case" = "opened from linked file"); `employer-cases.ts:1-4,15-16` (`Linked` = team `CaseLink` fields); `M3-CONTRACT.md` row added for both routes.

## What I could not check
A visible headed browser (headless Playwright with screenshots), a real screen reader, a true browser zoom (I used a 512 px viewport for 1024 px at 200 %), the CI run of this commit, the "red on main" first run of the test, and D17/D20 (founder or an intended user).

**Verdict: Block** for commit da3032f87. Fix: Major 1 (focus after Copy), Major 2 (race test on an all-Same case). List or fix the Minors in the PR.

## Round 2 — diff only, `da3032f87..011bc9769` (P-293 (3))
**Runs on 011bc9769** (same reviewer; my own copy `rv_c13` on :4433, blank database; US$0, no AI): `acceptance/C1.3.test.ts` **52/52**, exit 0 · `graph.mjs --check` G1 0, G2 0 · `tests/check_c13_employer_link_browser.cjs` **13/14, exit 1, twice in a row**: it stops at the new tooltip step (`:111-113`, "waiting for getByRole('tooltip')… 'Changes there are not copied'"), so its 13 later checks never run.

**Round 1 Majors: both closed.** Major 1 (focus): after Copy, focus lands on the linked line (`document.activeElement` = `P` "Sample employer case: …"; my 1024 px keyboard walk). `returnFocus` falls back to it once the opener is gone (`employer.tsx:49`). Major 2 (lock proof): I removed `FOR UPDATE` again on a scratch server. The new all-Same race in the pack now fails, `[201,201,409,201]`: 1 FAIL.
**Minors from round 1:**
* m1 one date: closed (Toronto on both sides; header and refusal both say "4 Nov" at 04:2x UTC).
* m2 source label: closed. A real button whose `aria-label` and Tip name the employer case.
* m3 one message and Reload on any 409: closed. My two-tab walk shows the refusal once, with Reload; after Reload the drawer shows "already relies" with only Close.
* m4 tests: (a), (b), (c) and (e) closed (Verified with `answered.channel = linked_file`; IMM 5710 written +3; 1024 px; the pack back in `acceptance/`); (d) left open in the PR, reasoned.
* m6 duplication: left open in the PR, reasoned.
* The breaker's m1/m5/m6/m7 fixes read correctly. `comparable()` trims text and ignores country case; a name in another case stays Different. Reach comes before parse, so a client gets 403 on a bad body. `seen` is capped at 50.

**New Major R2-1 (Must): the browser check's tooltip step depends on the label already being on screen.** `source.focus()` (`check_c13_employer_link_browser.cjs:112`) hits a label below the fold. The browser scrolls it into view, and Radix closes a tooltip on scroll, so it never opens. My probe: focused off-screen, `data-state=closed` and 0 tooltips; the same button after `scrollIntoViewIfNeeded()`, `instant-open`.

The builder's 27/27 depends on that timing; on my copy it failed 2 of 2. Nothing is wrong in the product. With `await source.scrollIntoViewIfNeeded()` before the focus, a patched copy of the check (scratchpad only) ran **27/27** on the same copy. Fix: add that line (the step already scrolls just after it).
* Why it is Major: this is the commit's own browser check. It is red when someone other than the maker re-runs it (D16), and it would put a flaky suite on `main`.
* Not a finding (P-26): the same close-on-scroll applies to every Radix Tip in the app when Tab lands off-screen. Keyboard and screen-reader users still get the words from the `aria-label`.

**New Minor (Should):** `employer-link.ts:86` copies `refuseIfCaseRecorded`'s query to change its words (`submission-record.ts:32-35`). Better to give the shared helper the detail text as a parameter than to keep two copies of the rule.

**Verdict: Block** for commit 011bc9769. One fix: Major R2-1, a single line in the browser check. Re-run it on a fresh copy. With that line I would approve; nothing else is open above Minor.

## Round 3 — diff only, `011bc9769..3c83686a2` (only the browser check's tooltip step changed)
**Runs** (fresh copy `rv_c13` on :4433, configured checkpoint): the unmodified `check_c13_employer_link_browser.cjs` passed **6 of 8** (28/28), and **failed 2 of 8** (runs 1 and 4) at the same step. Focus is on the label ("the source label takes keyboard focus" PASS), but `waitFor(tooltip)` times out after 20 s.
**Cause, measured** (scratch copy of the check that logs scroll, focus and `data-state`, 1 failure in 10 runs): `instant-open` at 18 ms after focus, then a document `scroll` event at 24 ms with scrollY unchanged (1642), then `closed` at 33 ms. So a scroll event still arrives after the two-frame settle check, and Radix closes the tooltip on it. My round-2 "one line, then approve" rested on one passing run; that was not enough proof, and the step is still racy. The product is unchanged and correct: the tooltip does open from the keyboard every time. A stray scroll event is what closes it: the shared Tip behaviour now on the tech lead's follow-up list.
**R2-1 stays open (Major, Must): the commit's own browser check fails about 1 run in 4–10** on an independent copy, above the 10 % batch-failure bar (WAY-OF-WORKING), and would land on `main`. Deterministic fixes, either one:
* (a) Install a `MutationObserver` on the label before `focus()`, then wait until its `data-state` was ever `open`/`instant-open`, and read the tooltip text while it is open. This asserts "opens from the keyboard", which is the claim under test.
* (b) Retry `blur()` + `focus()` up to 3 times, each waiting ≤ 1 s for the tooltip.

Re-run either fix 5+ times on a fresh copy. The three Minors stay listed in the PR, per the tech lead's ruling.

**Verdict: Block** for commit 3c83686a2. Only R2-1 is open: make the tooltip step deterministic. Nothing else is open above Minor.

## Round 4 — diff only, `3c83686a2..e59093d61`
**Runs** (fresh copy `rv_c13` on :4433, configured checkpoint loaded by the pack): `acceptance/C1.3.test.ts` **54/54**; the unmodified `check_c13_employer_link_browser.cjs` **28/28 six runs in a row** (it failed 2 of 8 in round 3).
**R2-1: closed.** The step now uses option (a). Observers are set on the label and on `document.body` before `focus()`; the check asserts the label has focus, then waits (T timeout, loud) until the tooltip has opened and its words name the employer case. This proves "opens from the keyboard and names the employer case" without depending on it staying open. The stray close-on-scroll is the shared Tip's behaviour, recorded by the tech lead as row B96, and the check does not claim it is fixed.
**Tech lead's `isFilingFact` change: correct.** `carriedFacts` now chooses the copy's subject with the resolver's own rule (`employer.ts:56-59`) instead of a second test here. On this branch `scopeOf` ignores the field's marking, so nothing changes today (the pack's live M4 lines still pass: principal for name and address, case for the LMIA number). The new pure lines compare against `isFilingFact` itself, so they will follow C3.16 (#1054) when it merges. I did not check the #1054 trial merge; it is not on this branch.
Open below Major: the three Minors listed in the PR (tech lead's ruling).

**Verdict: Approve** for commit e59093d61.

## Round 5 — diff only, `e59093d61..d2e569597`
**Runs** (fresh copy `rv_c13` on :4433): `acceptance/C1.3.test.ts` **55/55**; the new hold test waited 2030 ms, then 201. The browser check passed **28/28 five runs in a row**. The shared Postgres server had stopped, so I started it alone with `pg_ctl` (as `start.sh` does), without the :4400 app.
**The outside review's fix: correct.** In READ COMMITTED, a save that commits while the link waits supersedes the locked row. That row then drops out of the lock set, the link's next statement sees the new answer, and it refuses as "Changed since you looked". A save that comes later waits on the row the link holds; if the link superseded that row, the save is refused by its own updateMany (count 0).
**Lock order (the tech lead's question).** Only four places write answers: `putAnswer` and `confirmSection` (runtime.ts:321-322 and :452-454), the undo (`case-changes.ts:53-64`), and the link.
* **No path takes an answer row lock and then the case row lock.**
  * The undo takes `runtime_case … FOR NO KEY UPDATE` first, so it queues behind the link's `FOR UPDATE`.
  * `putAnswer` and `confirmSection` never lock `runtime_case`.
  * An answer insert takes key-share locks on `answer_subject` and `canonical_field` only (its foreign keys). Its trigger only reads `answer_subject`.
  * `fill-case`, `case-prepare`, submission, filing-record and team lock the case row but never write answers.
* **Two `link()` calls cannot deadlock:** both take the case row `FOR UPDATE` before any answer row.
* **`putAnswer` cannot deadlock with the link:** it locks one answer row and only ever waits on that row or on the unique index.
* **Residual, Minor (Should): answer against answer with `confirmSection`.** The link locks up to three answer rows in one statement in scan order. `confirmSection` supersedes a person's rows one by one, with no case lock and no `ORDER BY`. If the two lock the same two rows in opposite orders, Postgres aborts one. I forced the opposite order with a psql session (name, then address): the link got **500 after 1.5 s** (`40P01 deadlock detected` in the API log), and nothing was written.
  * Today both queries scan the same `(subject_id, canonical_field_key)` index, so they lock in the same order. The deadlock needs plan divergence; I could not produce it with the real confirm.
  * Fix:
    * add `ORDER BY subject_id, canonical_field_key` to the link's `FOR UPDATE` (this file);
    * map `40P01` to a 409 ("saved at the same moment, try again");
    * the full guarantee is `confirmSection` taking the case row lock first, as the undo does (runtime.ts: the tech lead's call).

**Verdict: Approve** for commit d2e569597. Open below Major: the deadlock Minor above, plus the three Minors listed in the PR.

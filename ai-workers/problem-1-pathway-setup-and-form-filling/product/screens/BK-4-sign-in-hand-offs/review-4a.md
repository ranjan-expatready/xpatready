# BK-4a review: sign in by role, one person picker (PR #1580)

Independent reviewer (skill screen-review, fresh context; did not build it), 11 Nov 2026. **Commit reviewed: `6de01ae8452af81561c1d492e61ba31e33a34e40`** (branch `claude/screens-bk4a-picker`, base `origin/main` 68a7b59d1). Running copy :4442 (db `xr_studio_screens_bk4a`, configured checkpoint), never :4400. Live AI off, no priced button, US$0.
Concept: `concept.md` rev 2 (approved, P-484) and `challenge.md`, read from `origin/claude/epic-feynman-qiq6u6` (b53d739b1) because neither is on `main` or in this PR. Scope: §3, BR-1, BR-5, BR-6, BR-8, §5 "4a", §8, §10 row 4a. 4b and 4c are not in scope.
Journey test (reviewer role): `journey-test-reviewer-4a-2026-11-11.md`, **8.5/10, pass**.

## Verdict
**Ship after fixes: 2 Major, 5 Minor. Verdict: Block** until Major 1 and Major 2 are fixed (list at the end).

## What I re-ran (at the exact commit)
* `tsc` web: exit 0 · `tests/check_bk4a.ts` 21/21 · `tests/check_bk3_frame.ts` 130/130 · explicit `any` 417 (baseline 433) · `graph.mjs --check` exit 0 (G1 0, G4 0; `/sign-in` page is visited by `check_bk4a_browser.cjs`; it calls no API).
* Browser, :4442, run from scratch copies so that no tracked screenshot was overwritten: `check_bk4a_browser.cjs` **37/37**, `check_bk3_frame_browser.cjs` **431/431**, **`check_bk3_links_browser.cjs` 54/56 (red, Major 1)**.
* Server rights (BR-5): `GET /api/library/fields` returns 403 for user-P and user-O and 200 for user-A. `/runtime/cases` returns 403 for user-A and user-P. An unknown person (user-Z) gets 401 everywhere.
* Mutation spot-check of `check_bk4a.ts`. Removing BR-8's `personChosen()` guard makes it fail. Adding a `setActor` call in `pages/review.tsx` makes it fail. Disabling the notice still passes 21/21, but the browser check's `said()` catches that. Removing the pill's person still passes 21/21, and no test checks it (see Major 2).

## Concept fit
| Item | Result |
|---|---|
| §3 one current person, `personChosen()`, notice on every change | Met (`lib/api.ts:8-17`, `PersonNotice` in `frame.tsx:160-168`, mounted once in `App.tsx:41`). One gap: signing in as the default person shows no notice (Minor 2). |
| One list of nine people, checked against `core.ts` | Met: `lib/simulated-people.ts`. Build discovery: the name `lib/people.ts` was already taken. The drift check covers id, name, role and duties, with a fail side. |
| Sign-in page §5: H1, line, 4 cards, More people (5) in 3 groups, no filled button, lands at `/` or `/cases` | Met (screenshot `screenshots/bk4a-sign-in-1440.png`; my walk J1, J3, J5). |
| Header picker: native select, 3 optgroups, "Name · role", last "Sign-in page…", both areas, other area → its home | Met. Below 640 px it should show the name only: **not met** (Minor 3). |
| Frame link names the person: "Cases (as Case officer) →" / "Product Studio (as Configuration author) →" | Met. Ctrl-click changes nobody. |
| Release pill says "(as Configuration author)" (§5; challenge M1 fix) | **Not met visibly** (Major 2). |
| BR-1 | Partly: the release pill (Major 2). |
| BR-5 | Met (server 403s above). |
| BR-6 | Met: `user-Z` → `/sign-in?unknown=1` with "Choose who you are"; no stored person → Configuration author; `/link` is untouched. |
| BR-8 | Met: notice plus "Continue as Case officer →"; Back and reload as a Studio person keep the notice; a browser with no person chosen still arrives as the Case officer (QA-35). |
| §8 own-scope guard (no "switch to" in frame, header, `cases.tsx`; change sites listed) | Met (`check_bk4a.ts` (3), (4)). |
| §8 "the named tests green" | **Not met**: `check_bk3_links_browser.cjs` is red (Major 1). Of the 7 `selectOption` files I re-ran none; statically, the 3 the builder did not list (`check_studio_browser`, `qa_s01_channels`, `qa_m2_journeys`) pick only Studio people, so the picker never navigates there. |

## Standards ([M] lines touched by 4a)
Met: STANDARDS §6 server authorisation, deny by default (no API change; rights checked above) · §5 no per-row requests (the sign-in page makes no request) · §7 strict TS, `any` 433 → 417, no dead code (old `PersonaSwitch` and case `PEOPLE` removed) · §7 axe on every state (sign-in 1440 and 1024, BR-8 notice 1024, Studio header: clean) · §9 speed (sign-in 232 ms, card → programs 64 ms) · EXPERIENCE §1 demo chrome separate ("Simulated" on cards and picker, prototype badge) · §2.1 the where-line says "Sign in" · §2.12 keyboard path, visible focus, 1024 px, 200 % (640 css px) and 375 px with 0 px sideways scroll · §4 states (unknown person, API down → frame notice, client at `/cases`, BR-8).
Not met: STANDARDS §7 "a rule's test fails when the rule is removed" is partly met: the pill's person (BR-1) has no test. Same §7: a regression suite turned red (Major 1).
No migration, no schema, no API change, so there is no data or concurrency risk.

## D1–D20 (independent reviewer, browser and script)
D1 3: BR-5, BR-6, BR-8 met; BR-1 partly (pill) · D2 4: writes only `xr-actor`; the server decides · D3 4: one web list replaces two, with a drift check · D4 N/A · D5 4: reload, Back, double-click (one notice), API down all hold · D6 N/A · D7 N/A · D8 4: the picker names the person in every area; "Sign in" on the line · D9 4: one click from card to home · D10 4: plain words; stale "no sign-in" tip at `App.tsx:81` · D11 4: a notice on every change except signing in as the default person · D12 4: team tokens, cards, no filled button · D13 4: axe clean, keyboard and zoom OK; picker on-input (Minor 1) · D14 4 · D15 5 · D16 3: good BR pass and fail checks, but one suite red and the pill untested · D17 simulated only · D18 4: "Simulated" on every person · D19 not yet evidenced (needs 4b and 4c) · D20 simulated only.

## Best in class (concept §6: BIC-11, 14, 18, 20 apply; BIC-19 always)
| Check | Score | Evidence |
|---|---|---|
| BIC-11 one primary, named | Met | No filled button on sign-in; BR-8 has one secondary "Continue as Case officer →" (my `j6-br8-1024.png`; `screenshots/bk4a-not-case-person-1440.png`) |
| BIC-14 help in place | Partly | The pill's change of person is said only in `title` and `aria-label` (hover only, never on focus) → Major 2 |
| BIC-18 states drawn | Met | Unknown → sign-in with reason; API down → "The studio server is not answering"; client at `/cases` → notice; Studio person in Cases → BR-8 |
| BIC-19 low load | Met | One H1, 4 cards, 3 type sizes; 1440 and 1024 screenshots |
| BIC-20 accessible | Partly | Keyboard and zoom OK; arrow keys on the picker change the person and navigate (Minor 1) |
| BIC-01–10, 12, 13, 15–17 | N/A | No facts, questions, documents, filing or review on these screens (concept §6) |

## Issues, ranked
1. **Major (Must) · a regression suite goes red.** `tests/check_bk3_links_browser.cjs:95` still expects the pill's name `Release N: open its set-up in Product Studio`; `runtime/cases.tsx:255` now adds " (as Configuration author)". At this commit it fails 54/56, at 1440 and at 375. `App.tsx` and `lib/` changed, so every browser suite runs in the full check and the merge queue (`select-suites.mjs:154`). **Fix:** update the assertion in the same PR, re-run that suite, and list it in the evidence.
2. **Major (Must) · BR-1: the release pill changes the person without naming them on screen.** The visible text is "Release 1 →" (my `j1-case-page.png`); "(as Configuration author)" is only in `aria-label` and `title` (`cases.tsx:255`). The concept says "the release pill says '(as Configuration author)'" (§5), the challenge's M1 fix says "give the pill its person in words", and §1 counts the pill in the measure (0). P-484 Q2 counts a link only when it names the person. No test covers it: a mutation that removes it passes. **Fix:** put the person in the pill's visible text, or in a visible line beside it (e.g. "Release 1 · as Configuration author →"; check the case header at 375 px), and assert the visible text in `check_bk4a_browser.cjs`.
3. **Minor (Should) · picker on input** (`frame.tsx:134-139`). In Chromium on Windows and Linux, an arrow key on the closed select changes the person at each press. ArrowDown from Approver opened `/cases` as the Case officer (walk J5); ArrowUp from Client A gave the Solo representative. That is WCAG 3.2.2 failure F37 (change of context on select input without warning). A keyboard path exists: Alt+↓ or Space opens the list. **Fix:** say it before use (e.g. a description "Choosing someone from the other area opens their first page"), or move only after the choice is committed.
4. **Minor (Should) · no notice when signing in as the default person** (`frame.tsx:163`). In a fresh browser, choosing "Configuration author" (the E1 walk's first step) shows no "Now: …" notice because the id does not change. **Fix:** also say it when a person is chosen on the sign-in page.
5. **Minor (Should) · below 640 px the picker is not "the name only"** (concept §5). It truncates "Name · role" to about 60 px: "Appr…" at 375 (my `j6-studio-375.png`), and Client A and Client B would both read "Clie…". **Fix:** show the name only below `sm`.
6. **Minor (Should) · stale words.** `lib/simulated-people.ts:3` cites `tests/check_bk4_people.ts` (the check is `check_bk4a.ts`). The Studio badge tip at `App.tsx:81` still says "no sign-in".
7. **Minor (records) · the approved concept is not on `main`.** `concept.md` and `challenge.md` are only on `claude/epic-feynman-qiq6u6`, and the build discovery (`simulated-people.ts`) is not in `challenge.md` "Build discoveries". **Fix:** record it when the concept lands (no code change).

Not findings (out of 4a's scope; for 4b and 4c): the `review-items.tsx` "switch to" sentences; `pages/programs.tsx:269` "Switch to the Configuration author." (not one of 4b's six, so the last-merge whole-`web/src` check will catch it); one `xr-actor` per browser (a second tab keeps its person until reload, BR-7).

## Could not check
A real screen reader: does a notice in a frame that remounts on an area change get announced (`aria-live` in `Toaster`)? Safari and macOS select behaviour. The 4 other named browser suites (screen01, forms_s4_library, w1_qa51_52_54, runtime_r1c) and the 3 qa or studio suites that write into tracked report folders were not re-run; the builder reports them green. An intended user's unaided walk (D17, D20).

## Note: a newer head appeared during this review
`43d77b0e8` (the breaker fixes) landed in this working copy at 16:43 UTC, after my runs. Everything above is for `6de01ae84`: the code checks and the test-file copies came first, and :4442 served the same bundle (`index-C06aGG-S.js`) throughout. Read only, not re-run: 43d77b0e8 addresses Minors 1, 3 and probably 2. It changes neither `check_bk3_links_browser.cjs` nor the pill's visible text (`cases.tsx` changes only BR-8's words), so **both Majors stand at 43d77b0e8**. This Block applies to 6de01ae84. A new head needs its own check.

## Verdict
**Verdict: Block** (commit 6de01ae84). To fix before Approve: 1. `check_bk3_links_browser.cjs:95` updated and green at both widths. 2. The release pill names "(as Configuration author)" on screen, with a browser assertion. Minors 3–7: fix in this PR, or list each with a follow-up row.

## Round 2 (a7fc096c8)
Same reviewer, diff only (`git diff 6de01ae84..a7fc096c8`), at the exact head `a7fc096c885ab24e863cc7860a76ab918c05a0f7`. :4442 served the new build (`index-B34w9GUC.js`, which contains the new words). Browser checks ran from scratchpad copies, so no tracked screenshot was touched. US$0.
**Re-run:**
- tsc (web): exit 0.
- `check_bk4a.ts` 22/22; `check_bk3_frame.ts` 130/130.
- Explicit `any`: 417.
- graph: exit 0.
- Browser: `check_bk4a_browser` **46/46**, `check_bk3_links_browser` **56/56**, `check_bk3_frame_browser` **431/431**.

**Round 1 findings**
* Major 1 (red suite): **fixed**. `check_bk3_links_browser.cjs` expects the new text and name, and passes at 1440 and 375.
* Major 2 (pill does not name the person): **fixed**. On screen it reads "Release 1 (as Configuration author) →" at 1440 and 375, with 0 px sideways scroll. The accessible name starts with the visible words. Clicking it gives user-A and one notice. `check_bk4a_browser` asserts it.
* Minor 3 (picker on input): **fixed** for Windows and Linux. An arrow key alone changes nobody; Enter commits with one notice; Tab away reverts. The breaker's M1 is also confirmed: an Approver who leaves Cases stays the Approver.
* Minor 5 (picker at 640 px): **fixed**. Options show names only; at 375 px the picker reads "Client B" in full (160 px).
* Minor 6 (stale words): **fixed**.
* Minor 7 (records): **answered**. `build-notes-4a.md`; the concept is in records PR #1575.
* Minor 4 (no notice when signing in as the default person): **still open**. In a fresh browser, choosing "Configuration author" on `/sign-in` still shows no "Now: …" notice (probe P1: no notice, stored user-A). Breaker m1 fixed a different gap (the case area's first switch). `PersonNotice` (`frame.tsx` ~177-190) still skips a change whose id equals the default.

**New in this round**
* **Minor (Should): the picker's `keyed` flag sticks** (`frame.tsx` `PersonPicker`). A key press that moves nothing still sets it, for example ArrowUp on the first option. A following pointer pick is then only marked: probe P2 shows "Approver" while the stored person is still user-A, and it changes only after an extra Enter (blur reverts it).
  - Risk on macOS (demo platform; reasoned, not run): arrow keys open the native list there, so a choice from that list may also wait for a second Enter.
  - So the build-notes line "the browser's own open list applies at once" does not always hold.
  - Fix: clear `keyed` on pointer down, or set it only when the key changed the value. Or commit a pending choice on blur. Then check on macOS.

No Blocker or Major is open. Minor 4 and the `keyed` Minor go in this PR or as follow-up rows. The breaker's m2 and m7 and the case page's 375 px / 200 % scroll stay as recorded limits (`build-notes-4a.md`); "Open a case" naming is BK-4b's.

**Verdict: Approve** (a7fc096c8)

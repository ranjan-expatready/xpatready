# A24-2 review: the case number on the screens (P-492)

PR #1660, branch `claude/great-lovelace-20orp6`, reviewed at head `bc2c42f5403fbec4031ca7f2cb4ed32b7a9bf6f6`.

The bar is the source design `design/case-structure-a24-2026-11-12.md` §6-§7 (on `origin/lead/2026-11-07-lead31`), plus STANDARDS.md, EXPERIENCE.md and QUALITY.md. This row has no concept.md.

Setup: copy `rev_a24l` on :4446, plus a fresh `rev_a24m` on :4447 for r1c. The web was rebuilt first. Live AI was off. Committed screenshots were restored after each run.

**Screen-review verdict: Ship after fixes.** One Major (typed keys lost in the search). Journey score: **8.5/10, pass** (`journey-test-reviewer-2026-11-12.md`).

## What I ran
* `check_a24_2_case_list_browser`: 33/33.
* `check_a24_case_number_api`: 23/23.
* `check_bk3_client_browser`: 75/75.
* `check_runtime_r1c` on a fresh copy after `setup_visitor_visa`: 139/140. The one fail is the case-page first-view budget, at 1010 ms against a 1 s budget, with machine load 1.1. That page has no change in this PR. On a dirty copy without its setup, r1c stops at 12/15. That is the environment, not the PR.
* `graph.mjs --check`: exit 0. `GET /runtime/next-case-number` is `testedBy` the new pack. `count-any`: 417 (baseline 433). `tsc` (web): 0 errors.
* My own probes:
  * the API: wildcards, list/object `q`, firm scope across Sample, solo, client and author, an IRCC number set on a filing, search paging with `take=1`, and the peek before and after another firm opens a case;
  * the browser: "null" on six staff pages, the client questionnaire and the client page for a case with no reference; typing rhythm; Back and reload; keyboard only; 400, 720 and 1024 px and 200 % zoom; Load more with 53 matches and a search change while a page loads.

## The points the brief asked about
* **Firm scope and refusals: met.** The search's `OR` sits inside `{workspaceId, firmKey}`. The solo firm finds 0 of this firm's cases by number, name or IRCC number, and its own case is found only by itself. Client and author get 403 on both routes. `q` as a list or over 80 characters gets 400 in words. An empty `q` is read as no search.
  * Gap (Minor): `%` and `_` are LIKE wildcards. `q=_` and `q=%` return every case, and `C-2026-0000_` returns 00001-00009 (`runtime.ts:993`; Prisma `contains` does not escape them).
* **The peek is correct.** It uses the same format and the same Toronto year as `runtime_next_case_number`, and the counter's `next_value` with 1 when there is no row. It is per workspace and firm. Reading it twice does not move it. After the solo firm opened `C-2026-00001`, the Sample peek stayed `C-2026-00009` and the solo peek was `C-2026-00002`. The words say "next", not "yours", which fits the race.
* **State races.**
  * Load more: fine. Pages are kept per `actor|q`. A page that lands after the search changes is not shown under the new search, and is reused correctly when the person returns to the same search.
  * Debounced search: **Major, see 1 below.**
* **The case cell's link name: met.** It is one link, named "C-2026-00002 A24L-…" with a space between the two, or the number alone. axe is clean. Keyboard: Search, Tab, link, Enter opens the case.
* **"null": none found.** For a case opened without a reference: the case page, Agent view, Case check, Review, representative review, the client questionnaire ("Case C-2026-00008.") and the client page all checked. `link-page.tsx` gives `case_number: ""` to the client's own view, which shows no heading with it.
* **Additive API in `runtime.ts`: acceptable.** About 30 lines; it only adds code. It is named in the PR, scoped to the firm, refused in words and covered by the pack. The design's A24-2 row lists search, and A24-1 gave no search route, so a screens-only PR could not do it.

## D1-D20 (1-5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | §6/§7 A24-2: number in the list, heading and search; Open a case words exact; Client and Applications columns; client list. UCI search and Next step/Officer/Updated columns are M4-B1, not this row |
| D2 Data integrity | 4 | Reads only; the peek never writes; firm-scoped; wildcard false matches (Minor 2) |
| D3 Reuse | 5 | `caseWords` wraps the contract's `caseName`; `CaseListRow` type from contracts; one `CaseCell` for both lists |
| D4 Rule integrity | 5 | The "shaped like a case number" refusal comes from the contract, shown on the field |
| D5 Stability and recovery | 3 | Reload and Back keep `?q=`; Load more race-safe; **typed keys lost** (Major 1) |
| D6 Freshness and governance | N/A | No content |
| D7 AI trust | N/A | No AI |
| D8 Orientation | 4 | The frame's line names the case; sub-pages use reference-or-number (Minor 4) |
| D9 Flow | 5 | Search to one link to case; one filled button |
| D10 Language | 4 | "Given when you open (C-2026-00009 next)", "None yet", "No case matches …"; the "None yet" tooltip is a `title` only (Minor 3) |
| D11 Feedback and state | 4 | Toast "Case C-… opened"; skeleton while loading; no-match state; the count is not announced (Minor 3) |
| D12 Visual quality | 4 | Screenshots 01-07: team table, number bold with the reference muted under it |
| D13 Accessibility and responsive | 4 | axe clean; no sideways scroll at 400, 720 and 1024 px and 200 %; keyboard path; no live status |
| D14 Team look | 4 | Team Table, Field, Notice, Pill |
| D15 Speed | 5 | API under 20 ms; one query per page for names and filings, none per row |
| D16 Testability | 4 | Pass and fail per rule. No test types with real pauses, so Major 1 went unseen |
| D17 First-use | simulated only | |
| D18 Provenance | N/A | |
| D19 End-to-end | 4 | Open a case through the case page and sub-pages carries the number |
| D20 Pain and wow | simulated only | |

## BIC (EXPERIENCE §6; case list, Open a case, case heading)
BIC-01, 02, 03, 05, 06, 07, 09, 10, 12, 15, 16 and 17: N/A (no answers, documents, AI, principal change, signing or review here). BIC-08: N/A (A24-3 and M4-B2).

| BIC | Score | Evidence |
|---|---|---|
| BIC-04 | Met | Staff field says "(optional)" in words |
| BIC-11 | Met | One filled button per area ("Open a case", "Open case"); `01`, `04` |
| BIC-13 | Partly | The refusal is in words under the field, and also in the toast; there is no summary at the top, as before this PR (`04`) |
| BIC-14 | Partly | The "None yet" reason is a `title`, so it is not shown on keyboard focus (`cases.tsx:111`) |
| BIC-18 | Met | Skeleton; "No cases yet"; "No case matches" with Clear search (`03`) |
| BIC-19 | Met | At 1440 and 1024 px: one heading and one primary button; status by shape and text |
| BIC-20 | Partly | Keyboard, 200 % and 1024 px fine; the result count is not announced (4.1.3) |

## Issues, ranked
1. **Major (Must; D5, EXPERIENCE §2.12): Search cases drops typed characters.** `cases.tsx:126` resets the box to the address whenever `q` changes. If a key lands between the 300 ms timer's write (line 128) and its render, that key is lost.
   * Measured: 4 of 60 tries typing `C-2026-00008` at 250-400 ms per key (`"C-026-0008"`, `"C-202-00008"`, `"C-2026-0008"`), plus `"Samle In"` once.
   * Fix: copy `q` into the box only when it changed from outside (Back, frame link, Clear). For example, remember the last value the timer wrote in a ref and skip the reset when `q` equals it.
   * Add a check that types with about 300 ms between keys and asserts the box and `?q=` keep every key.
2. **Minor (Should): `%` and `_` act as wildcards in the search** (`runtime.ts:993`). Fix: escape `\`, `%` and `_` in the words before `contains`, and add a fail case to the pack.
3. **Minor (Should): the result count is not announced, and the "None yet" reason is hover-only.**
   * Make the "N cases shown …" / no-match area `role="status"`.
   * Show the reason through the app's Tip, which opens on focus, or as visible text.
4. **Minor (Should): on sub-pages and the frame's line, a case with a reference is named by its reference, not its number.**
   * Example: the case page's line reads "Cases › ABC-1" while its heading reads "C-2026-00042 ABC-1". The client questionnaire says "Case ABC-1".
   * This follows A24-1's `caseName` (reference first). Design §1 says staff and clients quote the number.
   * Not blocking. Raise it in `challenge.md` or as an A24-3 note rather than changing the contract here.

## Not checked
A real screen reader; an intended user's unaided walk (D17, D20); a headed browser walk by a person; the peek across a year change (the counter's own tests cover allocation); the search at scale (STANDARDS §9: the team's).

Blockers: none.
Majors: 1. Search cases drops typed characters (`web/src/runtime/cases.tsx:126`).
Minors: 2. `%`/`_` wildcards in search · 3. result count not announced; "None yet" tooltip `title` only · 4. sub-pages and the frame's line name a referenced case by its reference, not its number.
Verdict: Block

## Re-review a8bf6fa66
Scope: only `git diff bc2c42f54..a8bf6fa66` (`cases.tsx`, `runtime.ts` `searchWhere`, the pack). Fresh copy `rev_a24n` on :4446, web rebuilt first; screenshots restored; copy stopped.
* **Pack:** `check_a24_2_case_list_browser` 39/39, including the three M1 tries and the m1 and m2 checks. Web `tsc` clean.
* **M1, closed.** The `wrote` ref resets the box only when `q` differs from the value the timer itself wrote (`cases.tsx:126-131`).
  * My stress probe (same as before: `C-2026-00008`, 250-400 ms per key with jitter) lost **0 of 60** tries, against 4 of 60 at `bc2c42f54`.
  * Changes from outside still update the box: Back after opening a case keeps `Sample`; typing `?q=C-2026-0000` in the address puts it in the box; Clear search empties box and address; the frame's "Cases" link from a case page shows the full list with an empty box. Leaving within 300 ms of a key leaves no stale write.
* **m1, closed.** `\`, `%` and `_` are escaped before `contains` (`runtime.ts:994-996`). `%` and `_` now find only the case whose reference holds them. `\`, `%%`, `a_b` and `C-2026-0000_` find none. Results stay inside the firm (unchanged).
* **m2, closed.** "None yet" is explained in visible text beside the count, and the count is `role="status"`. No sideways scroll at 400 or 1024 px.
* **m3, not changed: accepted.** It follows A24-1's `caseName`; the PR records it for A24-3 and the tech lead.

New Minors (Should, non-blocking):
* **The M1 guard is probabilistic.** At the old code's measured rate (about 7 % per try) its three tries would catch a regression in roughly one run in five, so it only partly meets STANDARDS §6 "a rule's test fails when the rule is removed".
  * Follow-up: make it deterministic. Options: Playwright `page.clock` to fire the 300 ms timer and press a key before the render, or a unit test of the box/address sync.
* **The count's `role="status"` span is removed while each new search loads** (the list shows a skeleton), then added back with its text. Some screen readers do not announce a live region that is inserted already holding its text. Keeping the region mounted through loading would make it reliable. Not checked with a real screen reader.

Journey score after the fixes: **9.5/10.** Feedback and state rises from ½ to 1 (no lost keys), correct data from ½ to 1 (wildcards escaped), and accessibility stays ½ (status region remounts; no screen reader walk).

Blockers: none. Majors: none open (M1 closed).
Minors: the M1 guard is probabilistic · the status region remounts on each search · m3 (accepted, A24-3).
Verdict: Approve

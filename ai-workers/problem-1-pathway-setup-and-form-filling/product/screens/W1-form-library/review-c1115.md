# F2 C11.15 #261 Minors m1–m3 (finder download-failure links): independent CHECK, 1 Nov 2026

Reviewer: I did not build this. Commit **6ccc5ea0** on `claude/lucid-galileo-c7hnlp`, `git diff origin/main..6ccc5ea0` (3 files: `api/src/finder.ts`, `api/src/canada.ts`, `tests/check_forms_c1115_download_link.cjs`). Checked against the #261 review's m1–m3, C11.15 / P-156 (4), STANDARDS, EXPERIENCE, QUALITY D1–D20. This change is backend only. Nothing on screen changes except which link a "Not found" row carries.

**Verdict: Approve** (Ship). There is no open Blocker or Major. Journey score **9/10** (`journey-test-reviewer-2026-11-01-c1115-6ccc5ea0.md`).

## How I tested
* **Copy.** I ran `rv_c1115` on :4471 with `STUDIO_CANADA_FIXTURES=canada-c1115`. `check_forms_c1115_download_link.cjs` passed 16/16. US$0, no `*_LIVE`, nothing called canada.ca.
* **Mutations.** I ran these in a throwaway worktree at 6ccc5ea0 (`rvm_c1115` on :4472), now removed. I did not run `run-suites.sh`, and I did not use :4451 or :4400.
  * **A. `canada.ts` set back to origin/main** (index read once): 12/16. All four new probes fail with "could not be downloaded … recorded". So the reload is needed, and the probes really reach the reader.
  * **B. Reader crashes** (script name changed so Python exits non-zero), new code: 2d passes. IMM 5645 says "…could not be read from the file…" and links the PDF. **m3 holds.**
  * **C. Same crash on origin/main's `finder.ts`:** the reason is "Could not get IMM 5645: Command failed: /tmp/rvwt/.tools/solu…". That is the generic message, it has no link, and it shows a server path. So m3 also removes a path that leaked to the user.
  * **D. The unreadable file's link changed to `row.pageUrl`:** 2d fails (15/16).
  * **m2 with `finder.ts` reverted:** the builder reports 14/16. I did not repeat it. A covers the same probe.
* **Main copy hygiene.** My first run rewrote the tracked `screenshots/c1115/not-found-link-1440.png`. I restored it with `git checkout`. That is how the test behaves already, not something this diff added.

## m1–m3: closed
* **m1, closed (three of four sites).**
  * Another form's bytes: 2b, `check…cjs:92`, against `finder.ts:641`.
  * Page with no PDF: 2c, `:98`, against `finder.ts:613`.
  * Unreadable file: 2d, `:103`, against `finder.ts:632`.
  * Each probe re-records the copy's `canada/index.json` checksum and checks that no IMM 5645 edition is stored.
  * French (`finder.ts:642`) has no probe because none of the recorded copies is a French PDF. That is accepted as the builder states it, and the change there is the same one-word change as `:641`.
* **m2, closed.** Wrong form and French now link `row.pageUrl` (`finder.ts:641-642`). The test asserts both `link === PAGE_URL` and `link !== PDF_URL`.
* **m3, closed in behaviour.** In `finder.ts:633-637`, a crash, a timeout or a bad JSON line from the reader returns the "could not be read" reason with the PDF link (mutation B). On the library path (`:592`), that answer becomes "keep the library edition" instead of throwing.

## Code
* **`FixtureCanada.items()`** (`canada.ts:116`) adds one `statSync` per fixture `get`. It re-reads when the mtime changes. `copyFileSync` and `writeFileSync` both bump the mtime, so the test's `restore()` and `record()` are seen. Only the fixture source changes; live canada.ca is untouched. A missing index file still throws, as before.
* The `id` re-spread (`finder.ts:639`) only narrows the types, and the behaviour after it is unchanged.
* No migration, no contract change, no new request per row, no change to authorisation.

## Open (Minor, Should; neither blocks)
* **n1. m3's catch has no committed test that fails when it is removed.**
  * 2d's damaged PDF goes down the reader's own `ok:false` path (`read_form_identity.py:132` catches it and prints JSON). It never reaches `catch { return unread; }` (`finder.ts:637`).
  * Delete the try/catch and the suite stays at 16/16. I proved the behaviour only by mutation B.
  * Fix, if wanted: a seam for the reader path (for example a test-only env var for the identity script, as fixtures are switched by `STUDIO_CANADA_FIXTURES`), plus one probe where the reader exits non-zero.
* **n2. The French site is untested** (stated by the builder). It can only be closed once a French PDF is among the recorded copies. Record it as a known gap in the PR.

**Not from this diff, still carried:**
* "…Run the recorder again on the Mac." in demo-mode reasons (`FixtureCanada`), as listed on #261.
* The c1115 check rewrites a tracked screenshot on every run.

## D1–D20 (this change only)
* **D1 9:** m1–m3 done as the #261 review asked.
* **D2 9:** each refusal stores no edition (all three probes check this).
* **D3 n/a**
* **D4 n/a**
* **D5 9:** a reader crash or timeout now degrades to a stated reason with a link (B/C).
* **D6 n/a**
* **D7 n/a:** no AI in this path.
* **D8 n/a**
* **D9 9:** each failure's link is where the right file can be found.
* **D10 9:** no server path in the reason any more (C). The French reason still gives no next step (earlier work).
* **D11 9:** Not found with its reason, as before.
* **D12 n/a:** no visual change.
* **D13 9:** the row is unchanged. axe passes in the check.
* **D14 n/a**
* **D15 9:** one stat per fixture read. No request per row.
* **D16 8:** m1 and m2 tested and mutation-proven. The m3 catch is not (n1).
* **D17 simulated only**
* **D18 9:** every link is canada.ca's, through `officialUrl`.
* **D19 n/a**
* **D20 simulated only**

## Could not check
* A French PDF case (none recorded).
* A real 60 s reader timeout. I simulated a crash only.
* `qa/GRAPH.md` was not regenerated, because `graph.mjs` writes a file outside this review's remit. This diff adds no page, route or capability.
* A real screen reader.
* An intended user's walk (D17, D20 stay with the founder).

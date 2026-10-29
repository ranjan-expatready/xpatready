# S3 Start setup — Lead check (29 Oct, seventh Lead chat)

**Verdict: PASS → MERGE** (founder Go on item 5, 29 Oct). Branch `claude/screens-s3-fix-a78d1d` at 47b02139 (code fd5ac8ae, main db5e0208 merged in).

## Evidence checked
* Lane's full run-suites on fd5ac8ae: 58 pass, 0 fail; `graph.mjs --check` G1 0, G2 0 (G3 2 are the older attachment routes, not this lane).
* Diff read against main (44 files, +1,077 / −555): `api/src/start-setup.ts` (POST start, idempotent, replays a saved answer at US$0, live AI only on a click), `finder-cost.ts` (one "about" rule), `runs.ts` (`plainRunText`: no raw error codes or paths on a run card; the finder's next step leads to the Forms tab's page choice, QA-63), `lifecycle.ts` `startWhy` (retired or waiting names refuse a start), `/new` page and both path endpoints removed. The new GET route sits behind the global `ConfigReadGuard` (no actor: 401, checked).
* Lead walk on an own copy (port 4421, Load sample): Immigration programs → "Start setup: Extend stay in Canada" → lands on the combination's Forms tab with one offer "Find forms with AI (about US$0.31 · at most US$5.58)", "Nothing was spent yet"; Next step "Find forms" points at that button and its tip shows the same cost words; `/new` shows Page not found. No paid AI run.

## Capability or scaffolding (P-33)
Capability: Start setup on Programs, Structure and the combination page; the finder offer with its cost first; the start guard. Scaffolding: the stand-in launcher in the browser checks; the saved finder answer copied under the test's own key.

## Left for later (not blocking)
* Two buttons for one action on a just-started combination (Next step "Find forms" and the offer's button): agreed in early look item 2 (Next step focuses the offer); revisit with the shared next-step rule.
* "Dependent child (0–6)" in the header: runtime's DV-bb-6a.
* Lane suggestion: run-suites should rebuild `web/dist` first (a stale build failed 3 checks once): Lead tooling, with the next records PR.

## Added to the same PR: outside review DV-bb-1, 6b, 6c (29 Oct)
Code afb86cde, lane suites 58/58 (web rebuilt first), graph G1/G2 0. Diff read (29 lines): Dismiss on a finished upload card (kept after reload; none on a running card); Reset counts the 6 built-in person roles apart ("keeps only its 6 built-in person roles"); "(P-95)" gone from the structure footer. A pass and a fail test each. PASS.

# 07d · Row briefs S5 and S7 (shared services with no baton): briefed, not started

Part 7's follow-up (Lead 16, 11 Nov ~13:3x IST: "S5/S7 rows briefed, not started"). Read-only analyst; facts from `origin/main` fbfb263c7. Each brief is ready for the Lead to paste into a lane once he decides to start it. One row = one PR (P-436 (4)), fresh branch from `origin/main`, Opus reviewer. A breaker is needed only where the row touches permissions (S7's new routes).

---

## S5 · Condition helpers merged (SH1, P-258), runtime lane, ~1 session, no baton

**Why:** one idea, "which facts does this condition read?", is written **seven times**. Each copy is the same regex over `JSON.stringify`:

| File:line | Copy |
|---|---|
| `api/src/lines-bulk.ts:29` | `const fieldsOf = (c: unknown) => … matchAll(/"field":"([^"]+)"/g)` |
| `engine/validate.ts:233` | same, local |
| `engine/validate.ts:262` | same, local, typed `any` |
| `engine/where-used.ts:19` | same, exported (SH2's where-used service) |
| `engine/snapshot.ts:169` | same, named `fieldsOfCondition` |
| `engine/sources.ts:183` | same, local |
| `engine/masters-ai.ts:64` | `export function fieldsOf(n)`, a different body |

**Condition words exist twice:** `engine/eligibility-gates.ts:168` `conditionWords(n)` and `api/src/change-sets.ts:181` `conditionWords(tree, lib, depth)`. **Two validators:** `engine/validate.ts` (`checkCondition`, `valueProblems`) and `engine/eligibility-gates.ts` (`checkGates`).

A regex over the JSON text also matches a `"field"` key anywhere in the tree, including inside a value. The 5 Nov independent read (P-358) named the same class of defect: "implication by substring" (`engine/validate.ts` ~185).

**Do:**
1. One module, `engine/conditions.ts`, with `fieldsOf(tree)` as a **tree walk** over the condition node types (no regex) and `conditionWords(tree, lib?)` as the one wording.
2. Every caller above imports them; the copies are deleted.
3. `checkGates` calls the same node checks as `checkCondition`, or the two are documented as different on purpose, with a test showing why.

**Done when:**
- `grep -rn 'matchAll(/"field"' api/src engine` returns nothing.
- One `conditionWords` remains.
- New checks pass: a pass test per node type, and a fail test where a value contains the text `"field":"x"` and must not be read as a field.
- Every existing suite and pack is unchanged and green.
- B164's guard still passes.

**Files:** `engine/` and `api/src/lines-bulk.ts`, `api/src/change-sets.ts`. **No `schema.prisma`, no `case-prepare.ts`.**
**Watch:** QA-237/239's lane works on the condition path (release refusals). Start S5 after that lane's PR merges, or agree the file split with it. One change at a time on `engine/validate.ts` (P-270).
**Serves:** M4 A8 (relatives and repeating groups read conditions); S1's gate table (A2); QA-237/239's family.

---

## S7 · Health, request log and browser errors (part 8 M1-M3), pipeline lane, ~2.5 sessions, no baton, split into 2 PRs

**Why:** today the only health check is `GET session` (`api/src/main.ts:63`, "who-am-I … the copies' health check"). Logging is Nest's `error`/`warn` only (`main.ts:232`): no request log, no 5xx count, nothing from the browser. The demo (:4400) restarts on every merge (`demo-update.yml`) with no check afterwards. Part 8's M1 + M4 lane was **accepted and started** by Lead 15. If that lane has already built M1 (health), PR 1 below shrinks to M2.

**PR 1, API side (M1 + M2), ~1.5:**
1. `GET /api/health` returns `{ ok, db: ok|down (a SELECT 1 under 500 ms), disk_free_gb, fill_queue: { depth, oldest_age_s }, git_sha, uptime_s }`. It returns 503 when the database is down, disk is under 2 GB, or the oldest queued fill is over 10 min. No login is needed, and it carries no personal data. List it on `route-has-screen`'s allow-list (P-348 (4)); it is read-only.
2. Request log: a Nest middleware writes one JSON line per request (`ts, request_id, method, route pattern (not the raw URL), actor role, status, ms`) to the copy's `var/logs/requests-YYYY-MM-DD.jsonl`. No bodies, no query strings, no names (AGENTS rule 5, privacy). It also answers with an `x-request-id` header.
3. `product/tools/app-errors.sh [copy] [--since 1h]`: counts by status class, the 10 slowest routes, and the last 10 5xx with their request ids. `lead-watch.sh` prints the 5xx count in one line.

*Done when:*
- A test stops the database and gets 503 with `db: down`.
- A forced 500 appears in the log with its request id, and `app-errors.sh` prints it.
- A healthy copy answers in under 100 ms.
- The log carries no bodies, checked by a test that posts a fake name and greps the log for it.

**PR 2, browser side (M3), ~1:**
1. `web/src/lib/report-error.ts` catches `window.onerror` and `unhandledrejection`, and a React error boundary wraps the app frame (BK-3's frame). They post `{ page route, message, stack (first 10 lines), git_sha }` to `POST /api/client-errors`, rate-limited to 10 per minute per tab. That endpoint writes to the same log with `kind: "browser"`, and it is on the route allow-list.
2. The boundary shows the team's error state: what happened, in plain words, and what to do next ("Reload this page"; "Go back to <where-am-I parent>"), never a blank page (EXPERIENCE: a refusal says what to do).

*Done when:*
- A test page that throws shows the error state, and its entry appears in the log.
- axe passes on the error state at 1440 and 375 px.
- The existing browser suites are unchanged; their `pageerror` capture still sees the error.

**Files:**
- PR 1: `api/src/main.ts` (middleware, route), a new `api/src/health.ts`, `product/tools/app-errors.sh`, `lead-watch.sh` (one line).
- PR 2: `web/src/lib/`, the frame component, a new `api/src/client-errors.ts`.

No baton files. `lead-watch.sh` is the Lead's tool, so the Lead reads that diff.
**Reviewer:** Opus. **Breaker:** yes for PR 1 and PR 2 (new unauthenticated routes: try to flood them, inject a body, read another copy's log).
**Serves:** every M4/M5 lane, the founder's and co-founder's demos (B168, P-459), and M5's 1,000-case run (timings come from M2's log, part 8 M10).

---

## Order with the other lanes

| Now (during the Bake) | After |
|---|---|
| S7 PR 1 (or its remainder if the M1 + M4 lane built health) | S7 PR 2 once BK-3's frame has settled (after BK-3 PR 2 merges, to avoid a clash in the frame component) |
| S5 after QA-237/239's PR merges | — |

# Engineering standards — the bar for back end, data, code and tests

One bar for the Lead, builder, challenger, reviewer and breaker. **[M] must** for every screen; **[S] should** — do it unless the build notes give a reason. Matching the team's code wins where they differ (retrofit). UX and UI: `EXPERIENCE.md`.

## 1. Technology
* [M] Default to the team's stack: NestJS, Prisma, PostgreSQL; zod contracts in a shared package; pino; helmet; throttling; Redis-backed worker for jobs; React 19 + Vite, TanStack Query/Virtual, react-hook-form + zod, i18next; Vitest; Playwright + axe-core; TypeScript strict.
* [M] **Technology gate** ("choose boring technology"): a new tool only for a concrete, evidenced gap; record problem, options, integration and upkeep cost, data/licence impact, and when to reconsider. Prefer what the team already has, then a small library over a framework.

## 2. How every capability is built — ten layers, in order
Job → **Masters** (stored once: key, label, status, version, source, where used) → **Links** (tree, link or line, each with integrity rules) → **Configuration** (one line shape: what · item · who · only if · order) → **Rules** (sentences, validated at save and release) → **Engine** (pure, deterministic, every output with its reason) → **Contract** (typed API) → **Screen** (`EXPERIENCE.md` pattern + all states) → **AI assist** (proposal → accept → draft) → **Governance** (draft → review → release; author ≠ approver; freshness; audit). A concept or build that skips a layer says why.

## 3. Non-negotiables [M]
1. Content is data, never constants; no immigration values in code.
2. Pick, don't type: where a master exists the UI selects it; new masters only via their governed "Add", with a duplicate check by meaning.
3. Defined once: library items are referenced, never copied.
4. Every link checked twice — database constraints and service rules; the UI is only a convenience.
5. Every master shows where it is used; referenced items are retired, never deleted.
6. Release validates every dependency: no unreachable question, no hidden field a form or rule needs, no rule that can never be true, no form without a current edition.
7. Released means frozen; cases pin the release they started on.
8. AI proposes with evidence; a person accepts; only release publishes.
9. Every resolved output explains itself ("because …").
10. Every business rule has a passing and a failing test.

## 4. System design
* [M] Modular monolith by domain: one NestJS module per area (program tree, library, configuration, rules engine, AI jobs, release, audit); modules talk through services and contracts, not each other's tables.
* [M] Ports and adapters: engine has no I/O; AI provider, PDF filler and storage behind interfaces with stubs.
* [M] Optimistic concurrency (version column; stale save → 409 with what changed). [M] Idempotent creates and job launches.
* [M] Background work in the worker: bounded concurrency, retry with backoff, timeouts, cancel, persisted status; never inside a web request.
* [M] Works by hand with AI off or failing. [M] Config in environment, no secrets in code, stateless API.
* [S] Correlation id across request and job logs; key spans traced (OpenTelemetry).

## 5. Data
* [M] Normalised masters; stable keys separate from labels; uniqueness scoped to the parent; level checks in the database.
* [M] Migrations expand → migrate → contract, preserve existing records, recorded rollback.
* [M] Read paths indexed; no N+1; one request per screen view, not per row. [M] Personal data minimised and never logged.

## 6. API and contracts
* [M] Contract first: zod schemas in the shared package used by API and web; OpenAPI generated.
* [M] Resource-oriented REST (Google API Improvement Proposals), cursor pagination, filters.
* [M] Errors as RFC 9457 Problem Details with field-level messages.
* [M] **Authorisation on the server for every endpoint, deny by default**; author ≠ approver enforced server-side (the team's earlier audit found many insecure direct object references).

## 7. Code and tests
* [M] Strict TypeScript, no `any`; team lint rules; domain names from `PRODUCT.md` §4; no duplicated logic between web and API; no dead or commented-out code.
* [M] Test pyramid: unit (engine, validators) → integration on real PostgreSQL → a few Playwright journeys per screen.
* [M] A rule's test fails when the rule is removed (reviewer spot-checks). [M] axe-core on every screen state.
* [S] Property-based tests for the engine and resolver ([M] when the engine changes). [M] Golden expected-answer tests for AI, scored, with stub/replay.

## 8. Security and AI safety
* [M] OWASP Top 10 / ASVS level 2 basics: validation, encoding, authorisation, rate limits, headers.
* [M] Uploads: type and size checked, stored outside the web root, never rendered as HTML in the app origin.
* [M] OWASP Top 10 for LLM apps: document text is untrusted data, never instructions; outputs schema-validated; no secrets or other clients' data in prompts.
* [M] AI results carry evidence and the prompt/model/reader versions; cost estimated before launch and capped.

## 9. Performance budgets [M]
With the sample data (P-26): catalogue first view < 1 s · filter, search, expand < 200 ms · no request per row. Scale work (400 rows, virtual scrolling, caching) is the team's.

## 10. Solution quality [M]
Every behaviour traces to an SA-01B requirement, a solution-page activity or a decision. Consequential choices record the alternatives and why one was picked.

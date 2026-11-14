# PF-25 review: each firm's own web address (schema, host routing, availability, staff-only change)

Reviewer (did not build it), 14 Nov 2026. Commit **79107bf0**, branch `claude/hopeful-franklin-hmkb8t`, draft PR #1763. Row: BACKLOG (lead/2026-11-07-lead31) "| PF-25 |" and rows rev 16 line 414; brief `lead-b-briefs/PF-25.md`; SA-2-27, SA2-D8 (SA-02 v2.24); AG-4-16, AG-4-17 (AG-04 v2.1). This is a runtime/schema row with no screen, so the walks, the 1024 px / 200 % checks and the BIC table are N/A. The journey test is the API/host-routing section below (the caller asked for one file, so it is not a separate report). **Journey score 8.5 / 10.**

## What I ran (scratch databases on :54329; isolated copy `rev_pf25` on :4522, started and stopped in the same command; never :4400)
* `tsx tests/check_pf25_web_address.ts`: **43 passed, 0 failed** (14 s). I ran it on PF-0p's ports and on the `platform.prisma` working-tree overlay, as the PR describes.
* Isolated copy plus the Sample seed: 40 curl requests with `Host` headers; a service-layer probe of the staff change (StaffContext fakes, real `auditEvent`, `systemClock`), including a race; a headless Chromium load of `/book/…` on a firm address; and a simulated database failure on a firm host (I renamed the table in the copy's own database and then restored it).
* `graph.mjs --check`: exit 0. The `qa/graph.json` it rewrote was restored with `git checkout`.

## The three deviations
1. **The address has its own table instead of a `platform_firm.web_address` column.** Accepted. The evidence holds: `check_fo1b_booking_schema.ts:76-87` (and pf3) seed the Sample firms on a copy migrated only up to an earlier row, and a generated client with a new `platform_firm` column would select it there (P2022). PF-0p's own slot for PF-25 is a *back-relation* slot (`// back-relation slot: web address (PF-25)`, PR #1752 `platform.prisma:97`), so a related table is what PF-0p planned. `platform_firm` keeps its columns.
2. **The new models are in their own schema file.** Accepted. P-600 (1)(a) requires it.
3. **Host routing is installed by a provider rather than a line in `main.ts`.** Accepted. Nest builds the providers inside `NestFactory.create`, before `main.ts`'s body parser, static files and catch-all. I proved the order on the real app: on a firm's host, `/api/health`, `/studio` and `/` give the plain 404, while `localhost` is unchanged. A lookup failure goes through Nest's own error hook and comes out as the plain 500 problem: no stack and no path (checked live).

## Specific judgements
* **The database rules match the service.** Checked: shape (`^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$` plus `xn--` = `rules.ts:36-46`), the reserved list, reason 3–500, insert-only history, never removed, never moves firm, a change only together with its redirect record, a held address refused to other firms, and take-back allowed for the same firm. The service is stricter only on control characters. See m1 for the one split (time).
* **90-day redirect, clock vs the database's `now()`.** The service decides on `ClockPort` (`service.ts:57,123-124,157`), but the database's hold uses `now()` (`migration.sql:90`) and `until > changed_at`, with `changed_at` forced to `now()` (`:78,148`). In production `systemClock` and `now()` agree, and the test pins `FakeClock` to `new Date()` (test `:126`), so they agree there too. Moving the clock does not move the database (m1).
* **One plain not-found:** unknown address, non-serving firm (PAYMENT_HOLD, PROVISIONING), bad label, two labels deep and a UUID label all give byte-identical 404s (HTML for pages, problem+json under `/api/`). Root `/` on a firm's address also gives it (PR Q2). **There is one exception:** see M1.
* **Firm A never serves firm B.** Only `Host` is read. `?firm=`, `X-Forwarded-Host` and `X-Firm-Key` are ignored (live: `sample-firm` answered `sample-firm`). The availability route is refused on a firm's host. `req.publicFirm` carries the id only (AG-4-17 r10). The race of two staff changes to one free address for two firms ended 1 ok and 1 409, leaving one row.
* **Migration safety.** Own folder, own stamp (newest), additive: two new tables, checks, triggers, and the data step for `sample-*` keys only. Every function is `platform_`-prefixed. Empty, demo-data and pre-PF-25 copies all pass, and so does the second-apply refusal. The rollback is written in the header. The one shared-table touch is the `AFTER INSERT` trigger on `platform_firm` (m2).

## Issues
**Blocker: none.**

**Major**
* **M1. On a firm's address, `/book/*` and `/assets/*` serve the studio's single-page app, so the studio's own pages *are* served there.** `host.ts:19` lets `/book` through to `main.ts`'s catch-all. The SPA has no `/book` route, so `App.tsx:43`'s `*` renders the studio shell. Live, `http://sample-firm.localhost:4522/book/free-consultation` returned 200 with "Product Studio · Pathway Configurator · Prototype · demo workspace · Acting as Configuration author…", the studio menu, a red "The studio did not accept the simulated person" and "Page not found" (12 console 404s). Meanwhile `nosuch.localhost/book/x` gives the plain 404. This contradicts the PR's and `host.ts:5`'s guarantee ("the studio's own pages and API are never served on a firm's address"). It puts demo chrome on a firm's public address, and a known firm's unknown page answers differently from an unknown firm (AG-4-17 r3: "both get the same page, byte for byte"). The test codifies it (`check_pf25_web_address.ts:228-230` expects the SPA body). **Fix:** until FO-3w's page lands, a non-API public path on a firm's address gives `sendPublicNotFound`. Either keep `/book` and the asset prefixes out of `PUBLIC_PATHS` (FO-3w adds them with its page, as `host.ts:17-18` already plans for FO-2 and the portal), or gate them. Then change the test to a fail case: `/book/x` on a firm address returns `PUBLIC_NOT_FOUND_HTML`.

**Minor** (fix or list them in the PR)
* **m1. The time split (`service.ts:57,124` vs `migration.sql:78,90,148`).** A held address's *end* has no pass test, and none can be written on the fake clock: the database still refuses until real time passes. A `FakeClock` more than 90 days behind the database (for example the default `FAKE_NOW` after 2027-02-22) makes `change()` fail on `platform_firm_address_history_until` as a 500. **Fix:** state the split in `service.ts`. Add a pass test: insert history with `until = now() + interval '1 second'`, `pg_sleep(1.1)`, then another firm takes the address.
* **m2. The `AFTER INSERT` trigger on the shared `platform_firm` (`migration.sql:155-165`) is a touch outside the slot line (P-600 (1)(b)).** The PR mentions it in "What and why", not under Deviations. List it there with its reason: an empty copy is seeded after the migrations. The release holder can then rule on it when reading the migration (P-423).
* **m3. `host.ts:44-60`: `.then(ok, next)` does not catch a throw inside `ok`.** A throw there (for example from `setHeader`) becomes an unhandled rejection instead of `next(err)`. Use `.then(ok).catch(next)`.
* **m4. The public availability and suggestion routes have no rate limit.** This falls short of the STANDARDS security [M] "rate limits" and AG-4-17 C7. It is already the PR's Question 3 and the app has no limiter yet; keep it listed until the limiter row lands.
* **m5. `service.ts:127` uses `for update of f`, which also blocks every FK insert that names the firm (KEY SHARE) for the transaction.** `for no key update` is enough.
* **m6. The reserved list exists twice (`rules.ts:11`, `migration.sql:71`), and only `www` is tested at each layer.** Test all nine at both layers so they cannot drift.
* **m7. The graph does not see the three routes (they are declared by decorator calls).** `graph.json`'s routes hold no `/api/public/*`, so their coverage is not machine-visible. Note it in the PR; this is not a code fix here.
* **m8. PR step 2 names only `PlatformFirm`'s slot.** Say what happens to `PlatformStaff`'s `// back-relation slot: web address (PF-25)` (left or removed).

## D-dimensions (where they apply)
D1 4 (every Done-when line met at the service and HTTP layers; M1 is the gap) · D2 5 (unique, triggers, advisory locks; race 1/1) · D5 4 (audit failure rolls back; DB failure gives the plain 500; m3) · D10 5 (plain refusals with a suggestion) · D11 5 (403/404/409/422 with field errors) · D15 5 (every request under 30 ms) · D16 4 (pass and fail per line; mutations of the key, reason, audit, serving status, ODD_PATH, X-Forwarded-Host and the 90-day boundary each turn a test red; m1, m6) · D3, D4, D6–D9, D12–D14, D18, D19 N/A (no screen) · D17 and D20 simulated only.

## Journey test (reviewer, API and host routing, 14 Nov)
Journeys:
* J1 visitor on `sample-firm`'s address → `/api/public/site` names it ✓.
* J2 person at sign-up: `maple` free; `Maple`, `-maple`, `ma`, `www`, `xn--maple`, `ma ple`, `érable` and empty each refused with a plain reason and a suggestion; `sample-firm` taken → `sample-firm-2`; `Maple Immigration Inc.` → `maple-immigration` ✓.
* J3 unknown address → identical plain 404 ✓.
* J4 studio paths and tricks on a firm address → 404, and A never serves B ✓ (except `/book`, M1).
* J5 our staff change via the service: the firm's Owner gets 403; no reason 422; bad address 422; same 409; unknown firm 404; success → 1 history row (until +90 d), 1 audit line by `staff:<id>`, and the old address 301 → `http://race-law.localhost:4522/book/free?ref=x` (`https://…expatready.com/…` under the public suffix) ✓.
* J6 host break: case, trailing dot, port, 70-char label, `…localhost.evil.com`, PAYMENT_HOLD → correct ✓.
* J7 `localhost` and `127.0.0.1` unchanged ✓.
* J8 DB down on a firm host → plain 500, main host still 200 ✓.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J8 all complete |
| Next step obvious | ½ | refusals carry a suggestion and 301s carry the path; `/book` shows the studio shell's "pick a simulated person" (M1) |
| Plain words | 1 | "Use lower-case letters only (maple, not Maple).", "This page is not available." |
| Feedback and state | 1 | correct statuses and problem codes; field errors |
| Correct data | 1 | one history row, one audit line, race 1/1, exact values |
| Error recovery | 1 | audit failure rolls back; DB failure gives the plain 500, no stack |
| Accessibility and sizes | ½ | the not-found page has `lang`, viewport and h1; no axe run; M1 page |
| Speed | 1 | 1–27 ms per request |
| Visual quality | ½ | plain not-found page is clean; studio shell with a red error on a firm's address (M1) |
| Trust and sources | 1 | reserved list, serving states and legal words labelled Sample; no AI |

**Score: 8.5 / 10** (pass, no 0). To raise it: fix M1 (+1.5).

## Could not check
* CI and `run-suites --changed` on this commit. The commit does not compile alone until PR step 2 (back-relations after PF-0p #1752), so the step-2 merge needs the diff-only re-review (P-277) and the re-stamp (P-600 (1)(d)).
* The staff route (it waits on PF-4s).
* A real DNS wildcard or certificate (PF-8).
* A screen reader.
* D17 and D20 with an intended user.

**Verdict: Block.** Open: Blocker 0, Major 1 (M1), Minor 8 (m1–m8). Fix M1, with its fail test, and fix or list the Minors. A diff-only re-review then approves.

# PF-25 break report: each firm's own web address (schema + public host routing)

Commit `79107bf07` on `claude/hopeful-franklin-hmkb8t` (draft PR #1763), with PF-0p's ports and audit adapter overlaid locally as briefed. Breaker: Claude Code, 14 Nov.
Scope: the row's rules only (the address rules, the staff-only change, the 90-day redirect and hold, host routing, one plain not-found). No staff HTTP route exists yet (PF-4s), so the change was attacked through `WebAddresses.change` with `fakeStaff` and `FakeClock`. Not findings: the reserved list is Sample, and there is no rate limiter (the PR's question 3).
Setup: scratch database `xr_studio_brk_pf25_db` (all 87 migrations applied with psql in folder order, then the Sample seed) for the database and service attacks; isolated copy `brk_pf25` on :4523, started and stopped in the same command, for HTTP. Scratch scripts were kept outside the repo. Both databases were dropped at the end.
Suite: `tsx --tsconfig studio/api/tsconfig.json studio/tests/check_pf25_web_address.ts`: **43 passed, 0 failed**.

**Totals: 0 Blocker · 2 Major · 10 Minor.**

## Major

**M1. A firm's public page is "not available" whenever its query string has an encoded slash, dot or backslash, or `/./`.** `host.ts:37,47` runs `ODD_PATH` on `req.originalUrl`, which includes the query string, not on the path alone.
Repro (Host `sample-firm.localhost:4523`): `/book/x` gives 200, but each of these gives 404 with the plain not-found page: `/book/x?utm_content=https%3A%2F%2Fexample.org%2Fspring`, `/book/x?date=2026%2F11%2F14`, `/book/x?name=J.%2E`, `/book/x?back=/./home`, `/book/x?path=C:%5Cdocs`. Also `/api/public/site?ref=a%2Fb` and `/assets/index-PNCnNHos.js?v=1%2F2` give 404.
Expected: the query is not a path, so the page is served. Actual: links from campaign and email tools (which URL-encode return addresses in their parameters) open the not-found page on the firm's own address.

**M2. When ExpatReady staff set a first address for a firm that has none, the required reason is thrown away.** `service.ts:134-141`: no history row is written when `old` is null, and the audit line carries no reason.
Repro: `change(fakeStaff({keys:["system/firm:address"]}), <firm with no address>, {address:"pee-one", reason:"First address set by support"})` returns ok. Then `platform_firm_address_history` has 0 rows for that firm, the audit line is `"Web address set to pee-one."` with `detail {historyId:null, oldAddress:null, …}`, and `select count(*) from audit_event where detail::text like '%First address set%' or summary like '%First address set%'` gives 0.
Expected (the row): the change is made "with a reason, audited". Actual: the reason is required and then stored nowhere.

## Minor

**m1. Some valid host forms under a firm suffix fall back to "main", so the studio's own API answers on the firm's address** (`rules.ts:85-86`). With `GET /api/session`, each of these Hosts gets 401 "Who is this?" from the studio, where `sample-firm.localhost` gets the plain 404: `sample-firm.localhost:` (empty port, valid under RFC 3986), `sample-firm.localhost:0004523`, `sample-firm.localhost:4523:4523`, `sample-firm.localhost..`. Browsers never send these, but scripts and proxies can. Expected: a host under a firm suffix that does not parse is `none` (fail closed).

**m2. Requests in absolute form and requests with two Host headers are routed by the Host header.** `GET http://sample-firm.localhost:4523/api/public/site` with `Host: sample-solo.localhost:4523` returns `{"webAddress":"sample-solo"}`; RFC 9112 §3.2.2 says the server uses the target's authority in this case. On an old address, `GET https://evil.example/x` with `Host: hold-old.expatready.com` returns 301 `Location: https://hold-new.expatready.comhttps://evil.example/x` (`host.ts:55`). This is malformed but stays on the firm's host, so it is not an open redirect. With two Host headers the first wins: sample-solo then sample-firm serves sample-solo, and `firm` then `localhost` versus `localhost` then `firm` flips between the plain 404 and the studio. A proxy in front that keys on the last Host would see a different firm. Expected: 400 for duplicate or conflicting hosts.

**m3. On a known firm address, an unmatched `/api/public/*` path gets Nest's 404, not the plain not-found.** `/api/public/zzz-nothing` returns 174 B with `type …/problems/404` and an ETag; `/api/public/site;x` returns 164 B; `/api/public//site` returns 162 B. On an unknown address all three return the plain 126 B body. Existence is already public through the availability route, but this is not "the one plain not-found".

**m4. The studio's single-page app is served on a firm's address.** `/book/<anything>`, `/book`, and the folder URLs `/assets/`, `/brand/`, `/fonts/` return 200 with the Product Studio `index.html`. Its router sends any unknown path to `<KnownPerson><Shell/>` (`web/src/App.tsx:43`), so a visitor sees the Studio frame; every API call it makes then gets 404. Cause: `host.ts:19`, whose prefixes also let folder URLs through to the app's catch-all.

**m5. Some concurrent changes end in a 500 instead of a 409.** Integrity holds in every case.
(a) Two staff change one firm at once (r2-a to b, and r2-a to c). One succeeds. The other reads a stale old address, because `for update of f` locks `platform_firm` but does not re-read the left-joined address (`service.ts:127`). The insert trigger then refuses it with `DriverAdapterError 23514 "… r2-a is not this firm's web address"`, which ProblemErrors turns into a 500.
(b) `claimAtSignUp` and `change` on the same new firm and the same address at once give `40P01 deadlock detected` (500) or P2002. The claim takes the address lock and then the foreign-key KEY SHARE lock on the firm; the change takes the firm's FOR UPDATE lock and then the address lock.

**m6. The database half of the hold is weaker than the migration says.**
(a) Under REPEATABLE READ or SERIALIZABLE, a raw insert takes an address that another firm gave up in a transaction that committed meanwhile: `firm-d` got `eee-old` and `firm-g` got `fff-old` while each was held for 90 days. `held_by_other` reads the statement's snapshot, so the lock does not help. The service path refused the same race, because it read the stale "current" row, so this is defence in depth only. The migration comment ("two transactions never both take or hold one address") is true only under READ COMMITTED.
(b) The database does not pin the 90 days. A hold of `now()+1 second` was accepted, and another firm took the address 2 s later. A hold of `now()+100 years` was also accepted.
(c) A history row with no address change is accepted (`alpha-3 → zzz-phantom`, the address unchanged).
(d) A reason of `E'\t\ta\t\t'` or two non-breaking spaces plus `a` passes `length(btrim(reason)) BETWEEN 3 AND 500`, because `btrim` strips spaces only.

**m7. The service and the database use different clocks.** The service decides "held" on ClockPort; the trigger decides on `now()`. With FakeClock moved 91 days ahead, `availability("clk-one")` returns `available:true`, but `change(…firm B…, "clk-one")` throws a raw P2002 from the trigger. So "another firm takes it after 90 days" cannot be proven through the service; the suite checks only `resolveHost` after 90 days. In production the same split appears whenever the app and database clocks differ.

**m8. Suggestions are weak or costly in some cases.**
- Non-Latin names get no real suggestion: Arabic `الهجرة` and Chinese `移民事务所` both give `my-firm`; `%00%01`, `---` and `日本語` typed as an address also give `my-firm`; `Ünïcødé` gives `unic-de`.
- When `busy` through `busy-50` are all taken, the suggestion is `null`.
- Each such unauthenticated call makes up to 100 sequential queries (16.6 ms against 1.4 ms) (`service.ts:29,85`).

**m9. The reason accepts bidirectional-text controls and newlines.** `"ok \u202egnp.exe"` was accepted and stored (`service.ts:47` covers C0 controls except tab, newline and carriage return). The reason is shown to staff later.

**m10. Any firm whose key starts with `sample-` gets its key as its address when it is inserted, whatever its status** (the `platform_firm_web_address_sample` trigger). Inserting `sample-x` as PROVISIONING gave it `sample-x` with `set_by seed:PF-25`. Nothing reserves the prefix (`platform_firm_key_check` is `^[a-z][a-z0-9-]{1,62}$`), so a real firm with such a key would get 409 "already has a web address" from its own `claimAtSignUp`.

## What held
- **Database:** every bad address shape was refused (`mäple`, `éée`, `ab٣`, `Maple`, `XN--abc`, a newline, `maple.`, `ma_ple`, edge spaces, 2 and 64 characters); 63 characters accepted. History is insert-only. An address never moves firm and is never deleted or truncated. An update needs this transaction's matching record (one in a rolled-back savepoint does not count; going back without a record is refused). A hold on another firm's address is refused, and `changed_at` cannot be backdated.
- **Service and races:** `agent/*` and `" system/firm:address"` keys give 403. A bad reason or address gives 422, an unknown firm 404, the same address 409; an upper-case firm id is lower-cased. Rename against take-old ×10, two firms grabbing one address, and a swap all gave 409, and nothing was stolen. Only TRIAL and ACTIVE firms serve or redirect.
- **HTTP:** upper case, a trailing dot and ports are handled. IPv6 and IP hosts are main. Two-deep, `-x`, `xn--` and `user@` hosts give the plain 404. Forwarded headers and `?firm=` are ignored, and A never served B. No path trick (`..`, `%2e`, `%2f`, `//`, case, `;`, other methods) reached the studio's API. Raw bytes in the target get 400 from Node and the server stays up. Redirects keep `%0d%0a` encoded and stay on the firm's host, use https under expatready.com, and carry `no-store`. Expired holds give the same bytes as an unknown address. Availability treats arrays and objects as `empty`.

## Round 2 (head `1c1bb096e`, 14 Nov)
I re-attacked only `git diff 79107bf0..1c1bb096` and re-ran every round-1 reproduction. Setup was as before: scratch database `xr_studio_brk_pf25_r2`, and the isolated copy on :4523 started and stopped in one command. Both databases were dropped at the end. Suite: **58 passed, 0 failed**.

**Totals for round 2: 0 Blocker · 0 Major · 6 Minor.**

**Round-1 findings now fixed** (each re-run): **M1** (`/api/public/site?ref=a%2Fb` and `?back=/./home&p=C:%5C` return 200) · **M2** (a first set writes history `NULL → pee-one` with `until` NULL and the reason, plus an audit line with its `historyId`) · **m1** (an empty port, `:0`, `:65536`, `:0004523`, `:4523:4523`, `..` and `:4523/` give the plain 404; `:04523` redirects to `:4523`) · **m2**, Location part (an absolute URI keeps only its path and query; `*` redirects to `/`) · **m3** (`/api/public/zzz`, `site;x`, `//site`, `site/` and `SITE` all give the plain 126 B).
**m4** for ordinary requests (`/book/x`, `/assets/`, `/assets/index-*.js`, `/brand/` and `/` give 404) · **m5** (two changes of one firm run one after the other; a claim against a change gives 409, no deadlock) · **m6** (REPEATABLE READ and SERIALIZABLE writes refused with `25000`; `until` forced to 90 days, so the 1-second hold became 90 days and B was refused; a single record with no change refused at commit; reasons padded with tabs or non-breaking spaces refused).
**m7** (the service answers 409 with the fake clock 91 days ahead; accepted as documented) · **m8** (a busy suggestion takes 2.6 ms instead of 16.6 ms) · **m9** (U+202E refused) · **m10** (`sample-firm-2` refused with the `sample` reason, suggestion `firm-2`).
Every other round-1 reproduction still holds.

**N1 (Minor): a request in absolute form still reaches the studio's app shell on a firm's address.** `pathAndQuery` normalises the target with WHATWG `new URL()` (`host.ts:54`), but Express routes on the raw path. Requests on raw sockets with `Host: sample-firm.localhost:4523`:
- `GET http://x/foo/../api/public/site`, `GET http://x/%2e%2e/api/public/site`, `GET http://x/a\..\api/public/site` and `GET http://x/assets/index-PNCnNHos.js/../../api/public/site` each return **200 with the Product Studio `index.html`** (the app's catch-all route).
- The same request on an unknown host gets the plain 404.

The check passes the normalised `/api/public/site`, then a different handler answers. No studio API route matched (I checked the GET routes that take several parameters), and browsers never send absolute form. Expected: an absolute-form target whose path changes when normalised gets the plain not-found, or the check reads exactly what Express routes on.

**N2 (Minor): a round trip in one transaction still creates a hold with no visible change** (the round-1 m6(c) case, by another route). One transaction inserts history (A `aaa-two → zzz-squat`), updates the address, inserts history (`zzz-squat → aaa-two`) and updates back. Both rows pass `platform_firm_address_history_followed`, because each "moved on" in the same transaction. A's address is still `aaa-two`, but `zzz-squat` is held for A for 90 days and firm C is refused it. This takes raw database access; the service makes one move per transaction.

**N3 (Minor): invisible and direction characters still pass the reason rule, and the database is looser than the service.**
- Accepted by both: `E'\u200c\u200d\u2060a'` (ZWNJ, ZWJ and word joiner plus one letter), `E'\u180e\u180eab'`, and `E'ok \u061c x'` (U+061C is the Arabic letter mark, a direction mark).
- Refused by `readReason` but accepted by `platform_web_address_reason_ok`: `E'\u1680\u1680ab'` (Ogham space mark). JavaScript `\s` covers it; PostgreSQL `\s` does not.

**N4 (Minor): the `until` CHECK gives a different answer depending on the session TimeZone** (`until = changed_at + interval '90 days'`; PostgreSQL assumes CHECK conditions never change their answer).
- A row written in an `Africa/Casablanca` session has `until - changed_at = 90 days 01:00:00`.
- Re-checking the same CHECK under `PGTZ=UTC` (`alter table … add constraint revalidate_utc check (…)` in a rolled-back transaction) fails "violated by some row". It also fails under Casablanca for rows the app wrote in UTC.
- The app writes in UTC (`core.ts:34`), but the database's own zone is America/Toronto (`cloud-setup.sh:131`). A psql session or a dump restored there would fail on any row whose 90 days cross a daylight-saving change, and `COPY` would reject the whole history table.
- Expected: compare in a fixed zone, for example `until = (changed_at at time zone 'UTC' + interval '90 days') at time zone 'UTC'`, or store `until` without a CHECK.

**N5 (Minor, rest of m1): some host forms still fall back to "main".** `Host: sample-firm.localhost\t:4523`, `sample-firm.localhost :4523` and `sample-firm.localhost,x` get 401 from the studio's own API (`rules.ts`: the name before the first `:` keeps the space, tab or comma, so it matches no suffix). Browsers never send these.

**N6 (Minor, rest of m2, unchanged): routing still reads the first Host header.** A target in absolute form still routes by its Host header (`GET http://sample-firm.localhost:4523/api/public/site` with `Host: sample-solo…` returns `sample-solo`). With two Host headers the first still wins, where 400 is expected.

**Not counted:**
- A known address now answers in about 0.9 ms against about 1.44 ms for an unknown one, steady across runs (one query against two). Which addresses exist is public through the availability route anyway.
- A sign-up claim under REPEATABLE READ now fails with a raw `25000`. That is intended and is a programmer's error.
- m10's trigger still gives any firm whose *key* starts with `sample-` its key as its address (accepted; it depends on PF-5's key rule).
- Non-Latin names still get `my-firm` (Sample, accepted).

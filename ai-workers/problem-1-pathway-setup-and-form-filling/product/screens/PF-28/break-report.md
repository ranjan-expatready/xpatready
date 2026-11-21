# PF-28 part 1 — break report, round 1 (PR #2619, head 56d2d6bc2)

Breaker: Opus 5.5, effort high, 20 Nov. Isolated copy `brk2619` on :4593 (`PLATFORM_IDENTITY=local`), started and stopped in the same command each time; Owner token from `user-R`. Live AI off, US$0. Scope: the brief's part 1 only: `platform/http/input.ts`, the 256 KB limit in `main.ts`, the 413 words, and `tests/check_pf28_inputs.ts` with its allow-list. Scratch scripts are in `/tmp/claude-0/brk2619/` (`probe.mjs`, `unit.ts`, `code.ts`, `pub2.mjs`, `mp.mjs`).

Sweep at this head: `tsx --tsconfig api/tsconfig.json tests/check_pf28_inputs.ts 4593 xr_studio_brk2619` gives **20/20 passed**: 169 routes, 424 probes, 148 allow-listed, NOT TESTED 0 (DW6 NOT TESTED, as the brief says).

## Findings

### M1 (Major): five inputs on public doors are checked by neither half of the sweep, and two of them break the rule without being on the allow-list
- **Repro:** I compared the code half's inputs (`tests/lib/routes.ts` `routes()` filtered by `DOORS`) with the routes the running half probes (`code.ts`). The code half never sees these inputs: `GET /api/public/firms/:firmKey/book/:slug/slots` query, `POST …/book/:slug/bookings` body, `GET /api/public/bookings/:token/slots` query, `POST /api/public/bookings/:token/reschedule` body, `POST /api/public/bookings/:token/cancel` body. Cause: they are registered through the `route()` helper in `front-office/booking/public.controller.ts:57-66`, not through decorators the scanner reads. The running half does probe them, but `fill()` (`check_pf28_inputs.ts:146`) puts random uuids into `:firmKey`, `:slug` and `:token`, so every probe answers 404, and `fine()` accepts any 404 on a route with path parameters (`:141`).
- **Live check, after creating a public booking type `pf28-public`:**
  - `GET /api/public/firms/sample-firm/book/pf28-public/slots?pf28Unknown=x` answers **200**: the unknown query field is taken. `SlotsQuery` is a loose `z.object` (`booking/service.ts:165`).
  - `POST …/pf28-public/bookings {"pf28Unknown":"x"}` answers **400** `booking-refused` with `issues` and no `fields`. The rule says 422 naming `pf28Unknown`.
- **Expected:** both fail the sweep, so both are on the allow-list for part 4 (booking).
- **Actual:** neither is listed and the sweep is green. Part 4 can finish, and R1.10 can be claimed, with these anonymous internet doors never brought to the rule.

### m1 (Minor): every wrong-type field is worded "This is required."
- **Where:** `input.ts:35` tests `i.input === undefined`, but zod 4.4.3 removes `input` from finished issues unless `reportInput` is set. So the "This must be text / a list / a number" branch can never run.
- **Repro (`unit.ts`):** `parseInput(strict({name: text(5)}), {name: 123})` gives `fields.name: "This is required."`. The same words come back for `{n: NaN}`, a record value of the wrong type, and a discriminated-union member.
- **Expected:** "This must be text."
- **Actual:** "This is required." This misleading message would reach every door that adopts the rule.

### m2 (Minor): an unknown field named like an `Object.prototype` member gives a 422 with no fields and broken words
- **Where:** `input.ts:48-49` does `out[k] ??= …` on a plain `{}`.
- **Repro:** `{"name":"a","constructor":{"prototype":{"x":1}}}`, or `{"toString":1,"hasOwnProperty":2}`.
- **Actual:** 422 with `fields: {}` and detail `"0 fields need a change:  Nothing was saved."`. The refusal itself holds and nothing is polluted.
- **Separately:** `{"__proto__":{…}}` is **accepted**. zod's `strictObject` skips that key, so the rule's "an unknown field is refused" does not hold for it. Live, `POST /api/platform/offices {"name":"PF28 proto","__proto__":{"isAdmin":true}}` answered 201. The output object carries nothing, `GET /me` was unchanged, and there is no pollution, so this is harmless.

### m3 (Minor): unknown key names come back in full in the refusal
- **Where:** `input.ts:48`, and the strict door `POST /api/platform/complaints/:id/handler` live.
- **Repro:** a 2,000-character key containing `<script>` comes back whole in `fields` (a 4.3 KB answer). `detail` is cut at 600 characters, but `fields` has no bound. The comment "never the value itself" holds for values, not for key names. This is JSON, not HTML, so there is no injection.

### m4 (Minor): the SNS notice door under /api/public now takes less than its own stated need when sent as JSON
- **Where:** `messages/public-routes.ts:18` sets `NOTICE_MAX_BYTES = 300 KB` ("SNS's largest message (256 KB) and its envelope"). The new limit covers `/api/public/messages/ses-notices`.
- **Repro:**
  - `application/json` 280 KB: **413** (on `main` it reached the route).
  - `text/plain` 280 KB: reaches the route (400 "not signed"), as before.
- SNS posts `text/plain`, so real traffic is not affected. But it is a webhook door outside `/api/hooks`, and amendment 1 meant webhooks to keep their own limit.

### m5 (Minor): DW3's "200 KB body still succeeds" does not show success
- **Where:** `check_pf28_inputs.ts:180` posts the 200 KB note to a lead that does not exist, and accepts any answer that is not 413 or 5xx (here 404). The route caps notes at 5,000 characters (`sales/calls.ts:114`), so a 200 KB note could never succeed there anyway.
- **Result:** the case proves only "under 256 KB is not 413".

### m6 (Minor, existing before this PR, outside the sweep): some content types and encodings still answer 500 on these doors
- **Repro:**
  - `Content-Type: application/json; charset=latin1`: **500**.
  - `Content-Encoding: x-foo`: **500**.
- **Cause:** body-parser raises 415 (`charset.unsupported` / `encoding.unsupported`), and `ProblemErrors` (`main.ts:212-215`) maps only 400 and 413. The filter code is unchanged by this PR apart from the 413 words, so `main` behaves the same. The sweep never sends either header, so its "never 500" claim does not cover them.

### m7 (Minor): the sweep's own run line fails as written
- **Where:** the run line in the header of `check_pf28_inputs.ts` (`tsx studio/tests/check_pf28_inputs.ts …`).
- **Actual:** run that way it crashes with "Parameter decorators only work when experimental decorators are enabled". It needs `--tsconfig api/tsconfig.json`, as `isolated.sh:87` and `nightly.yml:174` use.

## What held
- **256 KB limit:** 300 KB answers 413 on `/api/platform`, `/api/front-office`, `/api/public` and `/api/system`. An exactly 256 KB body passes the parser; 1 byte more answers 413.
- **Path tricks:** `/API/PLATFORM/…`, `/Api/Platform/Offices`, a trailing slash, `/./` and a query string all answer 413. `//api/platform`, `/api//platform`, `/api/x/../`, `%2F` and `%70` answer 404 (no route reached). `/api/platformx` answers 404.
- **Parser bypass:** `application/merge-patch+json`, `vnd.api+json` and `text/plain` are not parsed; the route sees no body and answers 400, nothing saved. `x-www-form-urlencoded` goes to Nest's default parser: 300 KB answers 413, and a 50 KB urlencoded body reaches the route as strings and is refused. `Application/JSON` and `charset=utf-16` answer 413.
- **Encodings:** chunked 300 KB, gzip, deflate and br (347 B on the wire, 300 KB inflated) all answer 413. A 10 MB gzip bomb answers 413. A false `content-length` gives the route's own refusal.
- **Sizes elsewhere:** 6 MB on front-office answers 413 (PF-0bp DW2's new words).
- **No echo:** the 413 answer is 284 B with no body text echoed. Bad JSON answers 400 `BODY_NOT_JSON` with no echo.
- **FO-2:** a 33 KB form answers FO-2's own 413 `TOO_LARGE`, also with an upper-case path. A 20 KB form reaches the route.
- **Multipart:** a 600 KB PDF to `POST /api/platform/support/tickets` reaches the route (422 on fields), not 413. `/api/hooks/*` has no routes on `main`, so nothing to keep.
- **Deep nesting and types:** 240 KB of nested objects or arrays (40k and 120k levels), on seven doors, gives no 500 and no crash; the server kept answering. A number where text is expected is refused on every door tried.
- **Header-only:** a request with no body, an empty JSON body, or `null` on all 74 body routes gives no 2xx and no 5xx.
- **parseInput edge cases:** unions, records (`__proto__` key dropped), discriminated unions, refinements, top-level refine, email, uuid, too long, too many items, non-English text and whitespace all give 422 with fields or a correct parse, never 500. Only a schema whose own transform throws gives 500, which is the schema author's error. `idParam` gives 404 for `../x` and `undefined`.
- **Sweep self-checks:** DW1, DW2 and DW7 fail and pass as written. The row counts are unchanged after 424 probes. No probe on a route without path parameters can pass a 422 without naming `pf28Unknown`. All 169 routes the app registers are probed, including `client-money` under `/api/front-office/money`. No raw Express routes exist under the doors.

## Verdict
Round 1 at 56d2d6bc2: **1 Major (M1)** and 7 Minor (m1–m7). No Blocker.

# Round 2 — re-check at head aeeb5f072 (scoped to the round-1 findings)

Same copy, `brk2619` on :4593, started and stopped in one command. Fresh copy: sweep **24/24**, 430 probes, 220 allow-listed (the ceiling is 220). Scratch: `/tmp/claude-0/brk2619/unit2.ts`, `probe3.mjs`, `dump2.json` (fresh copy), `dump3.json` (with a public type).

| Round 1 | Status at aeeb5f072 | Evidence |
|---|---|---|
| M1 public doors swept by neither half | **Fixed** | A 404 no longer passes a body or query probe (`fine()`). **Fresh copy:** the slots query, bookings body, token and form doors answer 404 and are listed (`unreached`, plus the probes, for part 4 or part 3). **After creating public type `pf28-public`:** slots `?pf28Unknown` answers 200 and bookings `{"pf28Unknown"}` answers 400. Both now fail the sweep and both are on the list, so both cases are caught. |
| m1 wrong type worded "required" | **Partly fixed** (see R2-m1) | `{name:123}` and `{name:null}` now give "This must be text."; `{}` gives "This is required." |
| m2 constructor / `__proto__` | **Fixed at the top level** (see R2-m2) | `constructor`, `toString` and `hasOwnProperty` are each named, with no "0 fields". A top-level `__proto__` gets 422 naming it. Nothing polluted. |
| m3 key names echoed in full | **Fixed** | Names are cut to 64 characters, at most 20 fields, and the value is never repeated. |
| m4 SNS door capped at 256 KB | **Fixed** | 280 KB JSON on `…/ses-notices`, with a trailing `/`, in upper case, or with `?x=1`, reaches the route (400 "not signed"). 6 MB still gets 413 from the 5 MB parser. The skip cannot be borrowed: `…/ses-noticesX`, `…/ses-notices/../../signup` and `offices?x=/api/public/messages/ses-notices` all get 413 at 300 KB. |
| m5 DW3 did not show success | **Fixed** | DW3 now asserts 422 for the 200 KB note and 413 for 280 KB, and it passes. |
| m6 415 → 500 | Out of scope (from before this PR; a follow-up in the PR body) | Not re-tested. |
| m7 hand-run line | **Fixed** | The header now names `--tsconfig api/tsconfig.json`. |

The limit re-check after the SNS wrapper also held. 300 KB gets 413 on `/api/platform`, `/API/PLATFORM`, a trailing slash, `/api/front-office`, `/api/public` and `/api/system`, and gzip of 300 KB gets 413. An exactly 256 KB body passes the parser; 1 byte more gets 413. FO-2's 33 KB form still answers `TOO_LARGE` in its own words.

## New or remaining in round 2 (all Minor)
- **R2-m1: "required" is still told apart from "wrong type" by zod's English message.**
  - Where: `input.ts:37` checks `/received undefined$/`.
  - Problem: a missing field reads "This must be text." if the schema has its own error text (`z.string({ error: "Give v." })`; 13 PF/FO schemas use this form, e.g. booking `types.ts:70`) or if a zod locale is set (`z.config(z.locales.fr())`). Repro in `unit2.ts`.
  - Effect: only once those schemas move to `parseInput`; with default messages the wording is right today. Also, 30 unknown keys read "20 fields need a change" (counted after the 20-field cap).
- **R2-m2: a nested `__proto__` is still silently accepted.** `{"name":"a","inner":{"a":"b","__proto__":{"x":1}}}`, and `[{"__proto__":1}]` against `z.array(strict(…))`, both parse OK (zod drops the key; nothing polluted). "An unknown field is refused" holds for `__proto__` at the top level only.
- **R2-m3: the real-key path goes red when a public consultation type exists.**
  - Repro: create `pf28-public` on the copy, then re-run the sweep: **21/24**.
  - Failures: `…/book/:slug/slots unreached → gone` and `…/bookings unreached → gone` fail "the list only shrinks"; and the row counts fail on `msg_consent_wording 0→1`. The anonymous `GET …/slots` seeds the Sample wording once (`sales/arrival-port.ts:96-99`), the same lazy kind as `msg_firm`, which the sweep leaves out. DW2 then fails, because it depends on unchanged counts.
  - These are false reds only (no false green). CI runs each suite on a fresh copy, where no public type exists. But a hand run on a used copy, or the day the Sample seed gains a public type, turns the sweep red, and part 4 needs a real slug to clear its `unreached` entries.

Round 2: no Blocker or Major at aeeb5f072

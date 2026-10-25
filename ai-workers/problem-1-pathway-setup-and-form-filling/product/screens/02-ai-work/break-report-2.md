# Screen 02 — break report 2 (CHECK round 2)

Breaker: same fresh session as review-2 (this head did not exist for the previous break pass). Branch @ `246143f` + SC-2 fix. Probed through the API on isolated `screens_*` copies (:4440–4449) and through the suite browsers (slice1/slice2_browser journeys, axe). US$0.

## Counts: 0 Blocker · 0 Major · 3 Minor

Tried and held:
- Old Blocker B1 (returned new field freezes the combination): resend (`RETURNED→WAITING`) and withdraw both exist server-side and are tested; the release gate names the fix ("returned to the author: correct it or withdraw it on To review").
- Gate split (Must 1): the same `unapprovedAdds` feeds To review and Release; a released combination cannot publish a library change it does not use (scoped publisher).
- BR-7 bypass (Must 3): the ≥0.55-candidate reason is enforced for ACCEPTED and CHANGED on every NEW item, not only the form path (`sources.ts:583`); suites accepting blind now pass a note (the granted one-line patches).
- Concurrency: release race suite — "no round published an unreviewed row"; pairing/reset extension paths still green on main (f2b 39/39, demo reset signs out: verified by merge).
- Duplicate names: the partial UNIQUE index `canonical_field_name_unique` is the DB rule, not just app code.

## Minor
1. Environmental: two break-K1 checks in `check_screen01_smallfix.cjs` fail here — headless Chromium 1248 does not change a closed `<select>` on ArrowDown (standalone probe reproduced). Product unaffected (pointer path saves once, verified by the control check).
2. `tests/scout/check_sc2_sc4_1025.cjs` cannot run on a fresh copy: it queries `GET /api/catalog/combinations` (404 on every server) then falls back to a hardcoded combination id; SC-2 was verified equivalently in a live browser ("Visitors · used by 3").
3. `impact.ts:94`: an edition approved in the product with no official file still cannot be compared — now refused in plain words with a next step ("set it aside with a reason, or keep it held"); the comparison itself still waits for the official file (by design, Must 7 resolution recorded in build-notes).

## What was tried without a finding
Return-then-approve races, double-apply of a job, gate differences To review vs Release, add-field skipping approval, extension merge side effects on the combination page (diff reviewed — extension files only), and the browser journeys' error paths at 1024/1440.

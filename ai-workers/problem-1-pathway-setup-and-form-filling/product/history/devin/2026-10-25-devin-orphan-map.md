# Devin drop 4 — API↔UI dependency map: orphan endpoints (main @ b2c0710)

Method: extracted every `@Get/@Post/@Patch/@Put/@Delete` route in `studio/api/src` and every `api()/useApi()` call in `studio/web/src`, then cross-referenced; grep-verified each suspect.

Labels: **[verified]** observed · **[validate]** judgement · **[decision]** founder/Lead.

## Orphans that are expected (all scoped to Screen 02 by its own concept)
`GET /intake/held` (P-80 held queue), `GET /library/merges` + `POST merges/:id/{approve,reject}` (K5), `POST /library/fields/:key/aliases` (BR-16 display-only today), `POST/DELETE /library/fields/:key/answer-list` + `GET/POST /library/answer-lists`, `PATCH /editions/:id/option-maps` + `…/draft`, the five `online-versions/:id/screen-map*` routes, `GET /captures/:id` + `/review`. **[verified]** **[decision]** Confirm each lands UI in Screen 02 slices — none should ship dead.

## Orphans that look genuinely dead — worth a look
- `POST /program-nodes` — superseded by `POST /combinations/path`, which the /new builder actually calls (it creates program/category/sub nodes inline with BR-6 checks). Nothing in the UI calls program-nodes. **[verified]** **[validate]** delete it or keep it as the Screen 02 admin path — but don't keep both silently.
- `GET /form-copies/:id` + `/file` — UI locks and links files but never fetches the copy detail; probably fine (links resolve direct), flag only if a "view copy" UI is planned.
- `GET /ledger` — the ledger is shown via embedded payloads (`/draft?summary`, ai-launch cap line); the route itself is uncalled. Trivial.

## UI↔backend consistency
- Channel wording verified consistent end-to-end (earlier drop): `Filed as` per form → derived signature → derived combination `Filing:` phrase. The "source screen says PDF/online, overview shows a third thing" mismatch the founder saw is the **drafting-source** choice (PDF-first vs online-screens-only input) vs the **filing channel** — two different axes sharing the words "PDF/online". **[verified]** **[validate]** This is the single most confusing pair of labels in the app; recommend renaming the drafting-source control to "Reading inputs" (or similar) when the screens lane picks up the channel tooltips task — kills the apparent inconsistency without changing the model.

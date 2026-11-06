# B117 — the people route refuses a representative (runtime, 6 Nov IST)

Row: BACKLOG B117 (Lead 20 on #1131; P-373; hardening pass P-358). Branch from origin/main a45b4aee7.

## What changed
* `api/src/runtime.ts` `addPerson`: a request with the role `representative` is refused (422) in plain words, naming the
  case team as where the representative of record is chosen. The role key is the engine's own `REPRESENTATIVE`
  (`engine/runtime/team.ts`, the renderer's key for that role): no new fixed string, no combination or form number (P-319).
* The allowed-roles list in the 422 answers ("This application can add: …") leaves the representative out; it is shared
  by the "application itself" refusal and the new one.
* Order kept: a release that does not list a representative still answers "does not list a representative" (true, and
  `acceptance/C11.12-runtime.test.ts` picks an unlisted role from a list that includes "representative").

## Tests that add a representative through this route (grep before building, lesson 6 Nov)
Searched `tests/`, `acceptance/`, `api/src/`, `samples/`, `web/src/` for `role: "representative"` and for every caller of
`POST /runtime/cases/:id/people`.

| File | What it does | Moved by B117? |
|---|---|---|
| `tests/qa/check_qa_am_1101c_runtime_walk.cjs:30` (QA-76) | added "Representative R" through the route and expected 201 | **Yes.** Now opens the case with a representative of record in the case team (`representative: "user-R"`), reads the name from `GET /runtime/cases/:id/team`, and checks the route refuses a representative (422). |
| `acceptance/C11.12-runtime.test.ts:31-34` | posts the first role of a list (ending in "representative") that the release does not list; expects "does not list" | No: an unlisted representative still gets "does not list" (the new refusal comes after that check). |
| `acceptance/C11.12-runtime.test.ts:36-38` | adds the first non-principal role with max 1–4 | No: on `wp.family` that is the spouse or partner; the representative is listed last. |
| `acceptance/lib/m3.ts:102` (`openCase`) | adds the people it is given (`FAMILY`: spouse, two children) | No: no pack passes a representative. |
| `api/src/sample-case.ts:46` (Load sample) | adds spouse and children | No. |
| `tests/check_s5_slice1.ts:168` (QA-135) | the "application itself" refusal lists addable roles; expects `can add: .*sponsor` | No: the list loses "representative" only. |

Not through the route (they build a representative participant directly, as a case stored before B117 could hold one;
kept as they are): `tests/runtime/check_case_engine.ts:279` (QA-76 fail-guard), `tests/runtime/check_vv_filings.ts:27`.

## Open point for the tech lead
Cases stored before B117 may already hold a representative participant (only through the API; no screen offered it).
B117 stops new ones; it does not remove existing ones. Recommendation: leave them (Sample data only; the demo resets),
unless qa finds one on the demo.

## The QA-76 walk after the change (isolated copy runtime_b117 on :4433, 1440 px)
First run 20/21: "a sentence or label never starts with lower-case representative" counted 1. The match was the
representative's e-mail, `representative@sample-firm.example`, on its own line: the case team's representative of
record now fills IMM 5476's block from the firm record (C7.7), which the person added through the route used to
displace. An address is not a sentence or label, so the check now skips a match followed by `@`. Second run: 20/20,
exit 0 (Load sample was already done on the copy). Screenshot: `case-team-representative-1440.png`.

## Found while walking (C7.7, already on main; not fixed here, outside B117)
The walk now shows the firm-record answers, and three are wrong on main (Sample firm record, `samples/firms.json`):
1. **Person's telephone number including country code** shows `[object Object]` with "Enter text.": the office phone is
   an object `{country_code, number}` and the question is text. Likely Major (it can reach IMM 5476).
2. **E-mail address** `representative@sample-firm.example` (from the firm record) carries "Enter an email address like
   name@example.com…": the firm record's own value fails the e-mail rule.
3. **Country** shows `canada` with "No fixed list for this answer yet".
Recommendation: one runtime fix row for C7.7 (shape the firm record's values to the questions' types, with a fail
test each), logged by qa; not in this PR so that B117 stays one small change.

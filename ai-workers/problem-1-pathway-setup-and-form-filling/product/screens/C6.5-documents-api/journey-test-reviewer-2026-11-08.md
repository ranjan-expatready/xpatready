# Journey test: C6.5 part 2a, documents API and migration (reviewer, 8 Nov 2026)

PR #1369, commit `ab717fdbd`. Isolated copy `rv_c65` on :4434 (runtime ports), stopped after. Headless Chromium through `acceptance/lib/browser.ts`: this container has no visible browser, so "walk like a person" was a scripted walk of what a person sees and clicks. US$0, no live AI, no `*_LIVE` switch.

**Scope.** No new screen in this PR. The "Fill this from documents" drawer (read, Confirm & use, resolve) is PR 2b, with its own concept. It is **not in this PR and is not scored as missing**. Scored: what a person can do by screens today (upload on the passport line, and the readiness panel that now shows an open check), plus the API journey the drawer will call.

## Journeys
1. **Main (screen), case officer:** "put the client's passport on the case". Case page › Documents › Passport information page copy › ⋯ › Upload a file… › choose a synthetic passport.
2. **Keyboard only:** the same upload with no mouse.
3. **Sizes:** the documents panel at 1440, 1024 and 400 px, with axe WCAG 2.2 A/AA.
4. **Main (API) and the step across the boundary:** plan › fill › Confirm & use with a typed passport number that differs › the case page's "Ready to file" panel.
5. **Recovery:** reload after the upload; double and parallel clicks (8 parallel Confirm & use calls, 8 parallel resolves); an answer saved at the same moment as Confirm & use.
6. **Error:** a text file named `.pdf`.
7. **Wrong role:** the client and another firm's client on proposals, checks and resolve.
8. **Break:** a newer passport replaces the first one while a check is open, then "keep the document's value". The client uploads the line's own type through the case-level route.

## What held
* J1: the line turned Received 823 ms after the file was chosen (`j1-1440-received.png`). Data: 1 current `case_document`, **0 `document_review`, 0 `document_read` answers** (P-134 D4: an upload reads nothing). The audit line names the type, the person's role, the case short id, the size, and never the file name.
* J2: Enter on the line's ⋯ lands on "Upload a file…", and Enter opens the file chooser.
* J3: axe found 0 violations at 1440, 1024 and 400 px, with no sideways scroll.
* J4: the plan names the passport `reader: mrz, cost_usd: 0`, `live_allowed: false`. Fill took 22 ms and proposed 8 values ("nothing is an answer until you Confirm & use each document"). Confirm & use wrote 4 values and agreed 1, each `VERIFIED` with `source_json` `{channel: document_read, document, page: 1, reader: mrz, read_value}`. It opened 1 check on the passport number and kept the typed value. It left the citizenship and the country of issue (codes only) for a person. The case page then shows `CRITICAL: Sample Client A: "passport number" differs between the answer and the document. Resolve the check.` (`j4-readiness.png`).
* J5: Received survives a reload. Parallel Confirm & use gave one 200 and seven 409s: 1 audit line, 1 check, one current row per fact. Parallel resolves gave one 200 and seven 409s, with one reason stored. In the race between an answer save and Confirm & use, the save got 409, Confirm & use got 200, and there was one current row.
* J6: the screen showed "Send a PDF, JPEG or PNG file (judged by the file itself, not its name). Nothing was stored."
* J7: proposals and checks answered 403 to the client and 403 to another firm's client. Resolve by check id from another firm's client answered 403.
* Audit: across every action on the case, 0 audit lines hold a value (`SAMPLEP…`, `SAMPLED`, names) or a reason typed.
* The rollback in the migration header ran cleanly in a transaction. The resolution CHECK refuses a reason of spaces.

## Findings
* **Major (correct data): a replaced passport's value is written when the officer keeps "the document".** Steps: old passport `SAMPLEP12`, typed `SAMPLEP99` → check opened. A newer passport `SAMPLEP13` is uploaded, read and confirmed → it joins the **same** check, whose `document` and `document_value` still name the replaced file. Resolve `keep: document` → the current answer is **`SAMPLEP12`, VERIFIED, source = the superseded document**. The message of the new Confirm & use says "1 differs … resolve that check" but shows the old file's value. `api/src/case-documents.ts:342-346` (an open check is reused unchanged) and `:397-404` (resolve writes `documentValueJson` without asking whether its document is still current).
* **Major (data integrity): the case-level upload accepts a type that has a checklist line and bypasses the line.** The client posted `documentType: passport_or_travel_document` to `POST /runtime/cases/:id/documents` on a line marked **Not applicable**. The line route refuses this ("request it again before uploading"), and so does the screen (C6.4-33), but here the answer was 201. The line's own file became `current=false`, while the line stayed `not_applicable|3` (state and version unchanged). The same path would leave an Approved line approving a file that is no longer current. `case-documents.ts:165` and `:180-183`.
* Minor (plain words): API texts a screen will show carry fact keys and decision codes. Examples: "left for you to answer by hand (person.citizenship, …)" at `:362`, "(P-134)" at `:201`, "(FQ-10 …)" and "(C6.5 part 3)" at `:236-239`. The readiness label is built from the key ("passport number", `readiness-inputs.ts:125`) instead of the release's question text (`labelOf`).
* Minor (next step): the readiness line says "Resolve the check", but no screen can resolve it until PR 2b. Today the only button on that line is "Pass with a reason…".
* Minor: for a passport-only section the plan returns `estimate` at US$0 with the letter's "basis" text (`:212-215`).

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 upload by screen; J4 read, Confirm & use and resolve complete by API |
| Next step obvious | ½ | after the upload no screen says the passport can be read (PR 2b, not scored as missing). The readiness line asks for a resolve that has no screen yet |
| Plain words | ½ | fact keys and decision codes in API messages (`:201`, `:236-239`, `:362`) |
| Feedback and state | 1 | Received in 0.8 s; every refusal is a 409 or 4xx problem with a code that says "Nothing was written" |
| Correct data | ½ | the two Majors above |
| Error recovery | 1 | J5 parallel and race runs; `changed`, `already_confirmed`, `already_resolved`, `not_current` |
| Accessibility and sizes | 1 | axe 0 at 1440, 1024 and 400 px; keyboard reaches the upload |
| Speed | 1 | upload 0.8 s, fill 22 ms, one query per person for proposals |
| Visual quality | 1 | existing panel unchanged (`j1-1440-received.png`) |
| Trust and sources | 1 | every written row names the document, page and reader. The cost card is marked "Estimate, not measured". Live is refused at US$0 |

**8.5 / 10, pass (no 0).** The journey score passes, but the two Majors still block (see `review.md`). To raise the score: fix the two Majors (correct data); plain words in the API texts; the next step arrives with the drawer.

**Not tested:** a real screen reader; 200 % zoom on a desktop browser; an intended user's unaided walk (D17 and D20 stay with the founder); the letter replay (no saved read, FQ-10). Screenshots are in the reviewer's scratchpad, not committed: `j1-1440-before.png`, `j1-1440-received.png`, `j3-1024.png`, `j3-400.png`, `j4-readiness.png`, `j6-hostile.png`.

**Re-score on f7ce78bc9 (reviewer, diff only):** the two Majors are fixed. Probes:
* the replaced file's check is closed and the newer file's own check keeps `SAMPLEP13`;
* the case-level upload of a line's type gives 422 with nothing stored.

Server words now use labels. Score changes: correct data 1, plain words 1, next step still ½ (the drawer). **9.5/10.** Details in `review.md`, "Re-review on f7ce78bc9".

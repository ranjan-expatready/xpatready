# F2 — break report (independent breaker, CHECK, commit 6f6e098, 25 Oct)

Scope: the backend path and the extension's security model as built in F2a–F2d. Isolated copy `break_f2` on :4449 (fresh database, the setup from `tests/forms_f2_setup.ts`), my own Sample portal server on :4444, the dev build loaded unpacked in `/opt/pw-browsers/chromium`. No paid AI, no LIVE draft, no product code edited. Scripts are in the session scratchpad, not in the repository. "S/" = `prototype/studio/`.

**Counts: 2 Blocker · 4 Major · 7 Minor.**

## Blocker
**B1. Two different portal screens get the same identity, so the spouse's screen takes the applicant's mapping and is filled with the applicant's facts.** This is the challenge's B1 again.
* Cause: `screenIdentity` = `normLabel(title)` → slug, cut at 40 characters (S/engine/twin.ts:52). `normLabel` drops every bracketed part and "required" (twin.ts:27). Plan E-1 also asked for "the form's own step id"; that part was not built. `screenDifference` never compares titles (S/engine/extension/screens.ts:123–126, "moved" is filtered out).
* Repro 1, fill (API, fill token): POST `…/fill-plans` with s1's structure but the title `Personal details (Spouse or common-law partner)` → 200 `match:true`, `familyName=SAMPLE, dobYear=1990 …` (the principal's facts). `* Personal details (required)` matches too.
* Repro 2, capture: in one extension capture, s1 titled `Personal details (Principal applicant)` is added. s4 (spouse) titled `Personal details (Spouse or common-law partner)` is then refused as "already captured" (S/api/src/forms.ts:191–195). With the 40-character cut, `Details of your spouse or common-law partner: education` and `…: employment` also collide, so the second screen can never be captured.
* Repro 3, the branch capture chain (Q2): a new extension capture holding only s4 titled `Personal details (Spouse)`, finished.
  * `mergeCapture` (screens.ts:141–149) **replaces** the approved applicant screen with it. The twin then holds `Personal details (Spouse): familyName,givenNames,dobYear…`, and the applicant's UCI, sex and birth inputs are gone.
  * Approved by user-C, then `screen-map/draft`: every spouse input is proposed `same_path` → `person.family_name … person: form_subject`, which is the applicant's mapping (twin.ts:91; `personOf` cannot see "spouse" because `normLabel` stripped it).
  * At approval, this capture also closes the "personal-details" re-capture task (forms.ts:270–271).
* Expected: distinct screens stay distinct, a spouse screen never reuses the applicant's mapping, and a screen whose heading differs is not a "match". Fix:
  * Build identity from the raw heading: casefold and whitespace only, keep brackets, no length cut. Add the page's step id when there is one (plan E-1).
  * Compare the live title with the approved title in `screenDifference` (a "title" change).
  * Add property tests: two headings that differ only in brackets, or after 40 characters, get different identities.

**B2. Clicking Next on the portal while the panel says "Filling…" writes the previous screen's plan into the next screen: a wrong-person fill.**
* Repro (Chromium, extension loaded): fill mode, case BRK-1, person Client A, tab on s1. A `panel.route` holds `fill-plans` for 0.5 s, the tab goes to `imm5257-online-s4-spouse.html`, then the request is released.
* Observed: the spouse screen's `familyName=SAMPLE`, `dobYear=1990`, `dobMonth=05`, `dobDay=17`. The panel says "Filled 4 of 9 · Personal details".
* Cause:
  * S/extension/src/panel.tsx:124–129 sends the fill to the same tab id with no check that the page is still the screen it read. The BR-13 "tab moved" listener is only registered after `setPlan` (panel.tsx:110–119), after the fill message has been sent.
  * The content script writes any plan it is given (S/extension/src/content.ts:76–78).
* Expected: nothing written when the open screen is no longer the one the plan was made for. Fix: the fill message carries the plan's screen identity and fingerprint. The content script re-reads the page, compares, and refuses on any mismatch. The panel also drops the request if the tab updated between the read and the reply.

## Major
**M1. The wrong-code limit (5 per 5 minutes, STANDARDS §8) is not enforced for tries made at the same moment.**
* Repro: 60 parallel `POST /api/extension/sessions` with wrong codes, extension Origin → 60 × 401, 0 × 429. Only the 61st try gets 429.
* Cause: the check runs before the awaited database lookup and the strike is recorded after it (S/api/src/extension.ts:67, 70–71), so every request in a burst passes the check.
* The code space (31⁸) keeps the practical risk low, but the control that is claimed and tested does not hold.
* Fix: reserve the try synchronously before any await: `strike` first, refund on success. Better, keep the counter in PostgreSQL per address and per code.

**M2. A fill request stores the live page's heading in the re-capture task, client identifiers included (M5 / P-66 §2 broken), and any fill token can open unlimited tasks.**
* Repro 1: a `fill-plans` request with the title `Application 1234-5678-90 · Details of Sample Name` → `recapture_task.screen_page` and `screen_title` = `application-1234-5678-90-details-of-samp`.
* Repro 2: the title `Passport AB1234567 holder Sample Name` → `passport-ab1234567-holder-sample-name`.
* Repro 3: 50 different titles → 52 open tasks.
* Cause: S/engine/extension/fill.ts:61–63, S/api/src/extension.ts:184. The fill path never runs `screenProblems` (extension.ts:149–151).
* Fix: run the client-detail rules on the fill screen, and store nothing for a title that matches them. Key "not captured" tasks without live text, for example by the case's form plus a count. Cap the open not-captured tasks per version.

**M3. The filler can write to a different element than the reader read: the surname goes into the portal's search box, while the panel says "Filled" with its source.**
* Repro: page `h1-search-same-name.html` (s1 where the real input has `name="familyName"` and no id, and the header search form holds `<input name="familyName">`).
  * The reader skips the search form, so the read is OK and the plan matches.
  * `find()` (S/extension/src/filler.ts:19–23) takes the first `[name=familyName]` in the document. The header box becomes `SAMPLE` and the form field stays empty.
  * The panel shows "Filled 6 of 9 · From the case (Client A, confirmed)…".
* Fix: the reader returns, and the filler uses, the same element. For example, resolve elements with the reader's own walk (skipped containers excluded), and refuse when the id or name resolves to more than one element.

**M4. Fill mode can reach only the 20 newest open cases.**
* Repro: 21 more cases are opened, then `GET /api/extension/cases` → 20 rows and BRK-1 is gone. The panel has no search, so the older case cannot be filled from the extension.
* Cause: `take: 20` (S/api/src/extension.ts:137).
* Fix: search by reference, or page through the list.

## Minor
* **m1.** A later mismatch replaces the task's differences (`differences = excluded.differences`, extension.ts:191). Sending s1 reworded and then s1 with only `uci.required` flipped leaves the task listing only `uci required`, and the reworded surname is lost. Fix: merge the differences as a set keyed by (input, change), as challenge m4 asked.
* **m2.** The limiter is per address and in memory (extension.ts:42–46):
  * Behind a proxy or shared NAT, one person's 5 wrong codes lock out everyone. My limiter test locked my own browser run out.
  * A restart clears it.
  * The 429 check runs before the Origin check, so a non-extension caller can trigger the lockout.
  * Fix: per-code void after 5 tries, as the plan said, plus a persisted counter.
* **m3.** The Studio lists only 20 sessions per person (extension.ts:112). After 22 more pairings, user-O has 25 live sessions, 20 are listed, and the earliest token still works (200), so it cannot be seen or disconnected on the page. Fix: list all live sessions and add "Disconnect all".
* **m4.** `<div id="familyName">` wrapping a `name="familyName"` input (h2-div-id.html): `isEmpty` reads the div, whose value is undefined. The input is reported "Already answered on the screen: left as it is" while it is empty (filler.ts:27–33).
* **m5.** A CSS-hidden input (`display:none`, h3-css-hidden.html) is filled and counted as "Filled". The person cannot see or check it. The BR-6 "never hidden" check looks only at the type attribute (filler.ts:57).
* **m6.** Any heading with no a–z letters (Chinese, Cyrillic) gets the identity `screen`, so all such screens collide. A French heading that differs only in accents collides too ("d-tails-personnels") (twin.ts:52). This follows from the B1 fix.
* **m7.** The Origin binding stops only browsers. A copied token replayed from curl with `Origin: chrome-extension://ipomj…` → 200 (extension.ts:91–93). That is expected for a bearer token, but build notes and plan describe the binding as protecting the token. Say "browser pages only" and rely on short expiry and revoke.

## What held
* Extension routes refuse `x-actor` alone (401).
* Mode checks: a fill token on `POST /extension/captures` → 403; a capture token on `fill-plans` or `/extension/cases` → 403.
* Pairing: a client persona or approver gets no code (403). The `X-Forwarded-For` header does not change the address.
* CORS: another origin's preflight → 403 with no CORS headers. An `x-actor` header across origins is not allowed (Allow-Headers is `authorization, content-type`).
* Values on the screen are refused: a `value`, `Value` or `answer` key → 400 "carried an answer"; `defaultValue` → 400 strict; `__proto__` is dropped and nothing is kept.
* The fill plan carries values only for `fill` inputs. A help text holding a passport number on a matched screen is stored nowhere (task, audit, log).
* A 200-input, 4 MB screen is answered in 66 ms.
* Concurrency on captures: 4 parallel screen adds on one revision → one 201 and three 409s. Finish racing an add → 409, nothing lost.
* `answerOnScreen`: author, approver, officer and client → 403; an unknown person → 401. List purpose: wrong roles → 403; a non-list row → 422.
* `storage.local` is empty after a fill. The reader refuses a page that uses an id twice. A password or hidden input found first by id is not filled.
* No `externally_connectable`. The content script answers only its own extension's pages (`sender.id`, no `sender.tab`).
* Sessions: an extension id or origin other than the token's → 401.

Not tried (outside this brief or not in F2): the panel at 1024 px and 200 % zoom, keyboard-only use beyond the builder's journey, and PDFs with planted instructions (F2 reads no PDF and calls no AI). The modified screenshots under screens/01 and R1 in the working tree are another run's, not mine.

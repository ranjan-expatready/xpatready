# F2 — Browser extension: challenge (fresh challenger, PLAN, backend path P-68, 25 Oct)

Read: `concept.md` (Lead decisions Q1–Q3 taken as agreed), `design/draft-extension.html`, PRODUCT, STANDARDS, EXPERIENCE, QUALITY, DECISIONS P-61–P-66, P-68, P-71–P-73, P-89, P-90, `decisions/P-66-…md`, CAPABILITIES C2.9, C7.4, C9.3, R1 `plan.md`, and the code named below (prefix `studio/` = `prototype/studio/`). `ai-workers/tools/freshness.sh` fails: `sources/` and `code/` are absent in this cloud copy, so every team-model claim (team code has no extension or portal model; AG-10 non-goal) is **Unverified**.

## Verdict
**Build after these changes.** The idea and the guardrails are right, and most of the parts already exist (closed capture contract, `noAnswers`, option maps, author ≠ approver, the hostile fixtures). One Blocker: a screen has no stable identity in today's records, so "per-screen compare" (BR-5, BR-7, Q2) cannot be built as written. Seven Majors are about trust and the lanes: two readers, open cases pinned to old releases, no filing or firm record, a sample-data clash with R1, client text in tasks, a contradiction in BR-1, and a pairing code that rests on a simulated sign-in.

## Objections

### Blocker
**B1. A screen has no stable identity, and input ids depend on capture order.** *Needed for the proof.*
* What breaks: the twin gives each screen a key from its position (`s01`, `s02` …). An input id gets an `@screen` suffix only when an earlier screen in the same capture already used it. A branch capture (Q2) or a one-screen fill check therefore gives the same portal screen a different key, and sometimes a different input id.
* Example: capture 1 sees Personal details, then the spouse screen, so the spouse's input is stored as `familyName@your-spouse`. Capture 2 (another branch) sees only the spouse screen, so its id is plain `familyName`. The "same path" rule carries maps over by element id alone, so the spouse's input inherits the applicant's family-name mapping: **wrong-person fill**. At fill, "screen 3" in the twin may be a different screen from the live one.
* Evidence (facts): `studio/engine/capture.ts:35` (`key: s${i+1}` by order); `studio/api/src/forms.ts:146-152` (an id is qualified only when `taken`); `studio/api/src/forms.ts:389` (`screenKey` comes from `screen_order`); `studio/engine/twin.ts:82` (`previous.get(i.id)`); `studio/engine/capture.ts:44-58` (`difference` flattens all screens by id, so "moved" is told by title); fixture `tests/fixtures/portal/imm5257-online-s4-spouse.html`.
* Fix (pure engine, no migration):
  * `screenIdentity(screen)` = normalised title plus the sorted set of **unqualified** ids. Strip `@slug(title)` deterministically.
  * `screenStructure` / `screenFingerprint(screen)`: the same normalisation as `structure()`, for one screen, computed on demand.
  * `matchScreen(twin, live)` → the same screen, a changed screen, or an unknown screen.
  * `mergeCapture(current, seen)` for Q2 (seen screens replace theirs; new screens go after the last seen neighbour; the rest are kept and marked "not seen this time").
  * Key "same path" by (screen identity, raw id).
  * Keep `fingerprint()` unchanged: `contracts/portal-capture.ts:1-2` shares it with the p2 guard's admitted screen inventories.
  * Keep "last seen on" per screen in the twin file's wrapper (`portal-twin/v1`, `forms.ts:194`), not in the closed v1 record (`portal-capture.v1.schema.json:22`, additionalProperties false).
  * Property tests: the screen order of a capture never changes a screen's fingerprint.
* Confidence: high (the code is read; the real portal's repeated screens are Unverified).

### Major
**M1. BR-2 means two readers in two languages, and the live page is not the saved page.** *Needed.*
* What breaks: the saved-page reader is a 413-line Python `HTMLParser` (`studio/tools/read_portal_capture.py`, run at `forms.ts:134`). The content script would be a second reader, in TypeScript over the live page. Four rules would have to be repeated exactly: the title (h1, else `<title>`, l.274), skipping the header and search form (l.57-72), one input per radio group (l.160-170), and the client-detail patterns (l.33-36). Repeating them breaks STANDARDS §7 "no duplicated logic". The live page also differs from a saved file: script-injected inputs, inputs hidden by CSS, and `innerText` versus `textContent`.
* Example: an input that shows only when "married" is chosen is in the saved file but absent from the live page, so the fill check says "looks different" on every fill.
* Fix:
  * Make it the first build step, with a stop rule. One TS reader over a minimal DOM interface, run in Chromium on every fixture, must give **structure equal** (not only the fingerprint) to the Python reader. Both must refuse every hostile fixture for the same reason.
  * Put the client-detail patterns in one data file that both readers load.
  * Read with `textContent` and keep CSS-hidden inputs, which matches the saved file.
  * If the step fails on any fixture, stop and report to the Lead.
  * Conditional inputs on real portals: Unverified; ask the immigration expert.
* Confidence: high for the duplication; medium for real-portal drift.

**M2. Open cases never get an approved re-capture.** *Needed.*
* What breaks: a case is pinned to one release, and moving it to a newer one (ADOPT) is not built (`studio/prisma/schema.prisma:953`). The release snapshot carries the online versions and their maps (`studio/engine/snapshot.ts:110-120`). The concept never says whether the fill check compares against the case's pinned release or the library's newest version.
* Example: after re-capture → approve (proof script §9), Client A's case still compares against the old twin. It mismatches again and re-opens the task, without end.
* Fix: compare and fill **only from the case's pinned release** (released means frozen, STANDARDS §3). An approved re-capture helps new releases and new cases only; ADOPT is *Not built*. The panel says "This case uses the version released on <date>; fill this screen by hand". Either end the proof with a new case on the new release filling `s1-reworded`, or stop at approve and say so. Founder question 3.

**M3. There is no filing record, and no firm.** *Needed.*
* What breaks: `POST /api/filings/:id/fill-plans`, the board's "ER-F-0142", "open filings" and "a token from another firm → 403" all refer to things that do not exist. The schema has Case, PackWorkPin and FormInstance (a PDF copy), with no Filing table. Any officer may open any case (`studio/api/src/runtime.ts:44-47`). There is one workspace (`core.ts:16`).
* Fix:
  * Route the plan as `POST /api/cases/:id/forms/:form/:subject/fill-plans`, the same shape as R1's generate route (`fill-case.ts`).
  * Count "affected open filings" as open cases whose pinned snapshot holds that online version.
  * Write the access tests as: another person's token, a client persona (`answer` duty, `core.ts:40`), an expired token, a revoked token. Firm binding is *Not built*.
  * Fill needs the `case` duty, never a client's.

**M4. The proof's sample data clashes with R1.** *Needed.*
* What breaks: R1's visitor-visa case generates IMM 5257 as a PDF. A line filed Online is refused by the PDF filler (`studio/api/src/fill.ts:27`, `fill-case.ts:117`) and dropped from `pdfForms` (`engine/runtime/forms.ts:26`). Switching the demo's IMM 5257 line to Online, so the extension can fill it, breaks R1's journeys and the qa runs.
* Fix: the F2 setup makes its own Sample combination (visitor visa, IMM 5257 Online, portal `ircc_portal`), release and case in the forms database (`forms_*`), and does not change the demo seed's channel. The immigration expert's question in R1's plan (§ "for the Lead", whether IMM 5257 is filed online) stays open.

**M5. Client text from live screens would be stored in the content team's task.** *Needed.*
* What breaks: in fill mode the live page's labels and title go to the server, and the task stores the differences (BR-7). The concept's test expects the task to list "Surname", the live label. On a real portal, a title or label can hold a name ("Details of <spouse>"). The patterns catch numbers, emails and passport codes, not names. P-66 §2 says tasks carry "no client values", and STANDARDS §5 says personal data is minimised.
* Fix:
  * The response to the officer may show live labels (the officer sees the page anyway).
  * `RecaptureTask` stores only the input id, the kind of change, option codes, and the **twin's** approved label. "Now" text comes from the re-capture, never from a fill.
  * Test: a live label holding "Sample Name" appears in no task, audit row or log.
* This also settles most of BR-3 at fill (see Q1).

**M6. BR-1 contradicts BR-11 and BR-12.** *Needed.*
* What breaks: BR-1 says the content script "never reads value, checked, selected". But read-back (BR-11) and "fill empty inputs only" (BR-12) must read exactly those. A spy test written to BR-1 would fail the fill.
* Fix, reworded:
  * Capture mode never reads values.
  * Fill mode reads values on the page, only for inputs in the plan, and never sends them. Outcomes carry no values.
  * Define "empty" for each type: text is `""`; a select is on its placeholder (the reader's `placeholder()`, l.62); a radio group has nothing ticked; an unticked checkbox counts as empty.

**M7. The pairing code rests on a simulated sign-in.** *Needed; label it Scaffolding (P-33).*
* What breaks: the Studio "sign-in" is an `x-actor` header (`core.ts:45`). Anyone can create a pairing code as any person, so the token proves the flow but not the security. If the extension endpoints also accept `x-actor`, the token adds nothing.
* Fix:
  * Extension endpoints accept **only** the bearer token. Codes are single-use and rate-limited (STANDARDS §8; 5 tries, then the code is void).
  * Give the manifest a `key` for a fixed extension id, used for the CORS origin and the token binding.
  * Make every API call from the side panel or the service worker, never from the content script (content-script requests are treated as coming from the portal page).
  * Keep the token at `storage.session`'s default access level, which content scripts cannot read.
  * The plan holds no values server-side (ids only). Never-fill and unconfirmed inputs carry `value: null` from the server, not a value the browser is trusted to skip.
* What the browser sees: the confirmed values for the one matched screen only, as the officer is about to type them anyway. Confidence: high.

### Minor
* **m1. FillEvent is M3: gold-plating.** P-66 §4 puts fill events and Form health in M3, and C9.3 is "task part only". Drop the FillEvent table. Record outcomes as AuditEvent rows without values. A "not accepted" read-back opens or updates the same task (P-66 §2.1). *Not built* (the table).
* **m2. pino is new technology outside the P-90 gate.** It is not installed (`package.json`). The API logs only errors and warnings (`main.ts:164`). Drop "pino redaction"; reuse R1's RT-17 test (a sample value is in no log or audit row).
* **m3. Capture duty and the mode switch.**
  * No `capture` duty exists. `addScreens` needs `author`, held by the Super Admin persona (`core.ts:32`), which P-66 §0 rules out as the capturer.
  * No persona holds both capture and case duties (`core.ts:36-37`), so the tab row is never shown. The board shows it on every state.
  * Fix: add `capture` to the immigration-expert persona (`user-C`). The approver needs `review` and must not be the capturer (`forms.ts` approve). Show the mode by duty; the switch is *Not built*.
* **m4. RecaptureTask concurrency.** Two officers hitting the same mismatch at once would open two tasks.
  * Use a partial unique index on (online version, screen identity) WHERE open, created in a raw-SQL migration as R1 did for the copy lock, with P2002 → re-read and merge.
  * Store differences as a set keyed by (input, change), so two branches add up rather than overwrite.
  * State the closing rule: approving a capture whose screen matches closes that screen's tasks.
  * An unknown screen's "Capture needed" task is keyed by the identity of B1, never by a raw live title (M5).
* **m5. Testability.** Playwright 1.64.1 with full Chromium `chromium-1243` is installed (`/opt/pw-browsers`); the headless shell cannot load extensions.
  * Use `launchPersistentContext` with `--load-extension` (new headless), or `xvfb-run` (present).
  * The side panel cannot be opened without a user gesture, so test `panel.html` as a 360 px tab, with its "target tab" passed through one function.
  * Spy on `requestSubmit`, `click` and `submit` in the main world.
* **m6. The extension screen has no file.** The contract requires `source {way, file, sha256}` (`portal-capture.v1.schema.json:28-33`). Set `file: "extension"` and `sha256: screenFingerprint`; duplicates are already caught by title and ids (`forms.ts:149`).
* **m7. The side panel is a new surface.** EXPERIENCE §3's side panel is a 480–560 px drawer; Chrome's panel is about 360 px and the user can resize it. Record this as a deviation for the retrofit list, and test at 320 and 480 px.

## What is sound
* Structure only, enforced twice: the closed contract (`additionalProperties: false`) and `noAnswers`. The hostile fixtures exist and are named in the tests.
* Filling reuses what exists: `transformFor` (`twin.ts:50`), `codeForValue` / REFUSE (`options.ts:57`), the online maps with screen and option map already in the release snapshot, R1's confirmed-only status (P-72), and `confirmSection`.
* Governance reuses the existing capture flow: held, then approved by a second person, with author ≠ approver enforced on the server (`forms.ts` approve).
* One screen per click; never Next, Save or Submit; nothing unattended; no AI anywhere in filling.
* Pairing instead of reusing the cookie. Host permissions limited to exact hosts, with no `<all_urls>`.
* The technology added is only `@types/chrome`. The *Not built* list (Form health, "looks different" button, store publishing, real portal) is right.

## Back-end plan
| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Screen identity, per-screen fingerprint, match, merge | none new; "last seen" in the twin wrapper | — | B1, BR-2, BR-5, Q2 | property: order-independent; spouse screen alone ≠ applicant mapping |
| Content reader | — | — | BR-1, BR-2, M1 | equal structure to Python on all fixtures; hostile refused alike |
| Pairing, session | `ExtensionPairing`, `ExtensionSession` (token hash, person, modes, extension id, expiry, revoked) | `POST /extension/pairings`, `POST /extension/sessions`, `DELETE …/current` | M7, BR-15 | single use; expired; revoked; 5 tries; `x-actor` refused on extension routes |
| Capture screen | `PortalCapture` (way `extension`) | `POST /captures/:id/extension-screens` (JSON, contract, `noAnswers`, patterns) | BR-1, BR-4, `capture` duty | typed s1 → same as blank s1; duplicate; hostile; capturer ≠ approver |
| Fill plan and compare | none (plan ids only, 5 min) | `POST /cases/:id/forms/:form/:subject/fill-plans` from the pinned release | BR-7…BR-10, M2, M3 | match fills; `s1-reworded` → nothing, task; unconfirmed / never-fill → `value: null` |
| Re-capture task | `RecaptureTask` (version, screen identity, differences set, status; partial unique) | `GET /recapture-tasks` (content duties) | BR-7, M5, m4 | concurrent pair → one task; no live label stored; closed on approve |
| Never-fill marker | `FormFieldMap.outcome = person_answers_on_screen` (Q3) | existing screen-map PATCH and accept | BR-9 | an unmarked background screen fills nothing |
| Outcomes | `AuditEvent` (no values) | `POST /fill-plans/:id/outcomes` | BR-11, BR-14, m1 | "not accepted" updates the task; no value in audit or log |

## Questions for the founder
1. **BR-3, text that may be a client's detail.** *Recommend:* in capture, list every text and refuse anything matching a pattern ("capture this screen from another application or a saved blank page"). At fill, store only approved labels (M5). Wildcard marking "[client detail]" is *Not built* until the immigration expert shows such a label on a real portal. *Alternative:* build the marking now, which adds a matcher and a review step for a case none of the Sample screens has.
2. **BR-12, an input that already holds an answer.** *Recommend:* fill empty inputs only; list the others as "Left as it was" next to the case's answer (board F5). This matches "never overwrite" (P-65) and keeps the representative in charge. *Alternative:* overwrite with confirmation, which risks replacing what the representative typed with the client.
3. **After a re-capture is approved, what happens to open cases?** *Recommend:* they keep their release and the screen is filled by hand. Only new cases get the change until "move a case to a newer release" is built (M2). *Alternative:* fill from the library's newest version, which breaks "a released configuration never changes under case work".

## Lead response

## Agreement

## Build discoveries

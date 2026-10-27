# S4 Form library (W1-06, W1-07 run card): independent review, round 5, 27 Oct 2026

Reviewer: did not build this screen. Commit 06556ab (`forms/2026-10-27-s4-form-library`). Judged against P-116, P-121, P-123 (with its annotations and C11.18), P-124, P-125, challenge.md M1–M7 and m1–m6, STANDARDS, EXPERIENCE and PRODUCT §3–4. The round 4 claims in build-notes were checked in the app and the code, not taken on trust.

**How.** Isolated copy `rev5_s4` on :4461 with the stand-in launcher; a stub probe reached `fake-launch.log` (5 stub lines) before any live step, and the one live finder run went to the stand-in. No model or canada.ca call: **US$0**. Walked in a visible Chromium (Playwright: clicks, typing, keyboard) as user-A and user-B, then an API break pass. Journey test: `journey-test-reviewer-2026-10-27.md`; screenshots `review-shots/v6-*`. `p2/jobs`, `runs`, `ledger`, `parts` and `p1/inventory` checksums match before and after; copy stopped, database dropped.

## Verdict: **Ship after fixes**
Both round 4 Majors are fixed, and so is break R4-1's first half: a retired or approved-to-retire IMM 5646 gets no new use by any of five routes (Sources tab upload, `/intake` forCombination, library upload forCombination, "+ Add", hand attach); a planted source makes the release hand the retire back with a History line; the real Visitor visa answers keep IMM 5257. One Major remains. Break R4-1's second half was not addressed: a form that a combination reads as a source can never be retired. Several dimensions sit at 3.

**Journey score 7.5/10.** This is below the journey bar. The main drops are the retire dead end, a focus hidden under the top bar, and lost or wrong feedback. See the journey report.

## Round 4 findings now
| Round 4 | Now | Evidence |
|---|---|---|
| Major 1: retired form used through a source upload, and the release ignores it | **Fixed** | v6-j8-sources-upload-5646-approved: "Not attached to Super visa: a request to retire IMM 5646 is open". After the release all five routes refuse; the release re-check RETURNED IMM 5710 with an audit line |
| Major 2: IMM 5257 dropped on the real answers | **Fixed** | Replay PARTIAL, US$0: 7 attached incl. IMM 5257, IMM 5484 to decide, IMM 5782 not for this application, dropped [] |
| Replay labelled "no AI" | **Fixed** | `run-card.tsx:31` "saved AI answers, no new call" |
| Unread held upload dead end | **Partly fixed** | The card link says "cannot be approved". The same card box, the To review row ("Record the IRCC page", `review-queue.ts:137`) and user-A's held page still promise approval (v6-j9-*) |
| R4-4 returned retire shown waiting · R4-5 UTF-8 · R4-6 "+ Add" Undo | **Fixed** | IMM 5710 row "Ready" after its hand-back; empty "फ़ॉर्म-签证.pdf" named correctly; "+ Add" IMM 5409 then Undo gives `{undone:"attach", codes:["IMM 5409"]}`, nothing left |
| S1 stopped call "US$0.00" · S2 "Needs your OK" for IMM 5802 | **Open** | v6-j4-card-stopped; IMM 5802 row and its tooltip |

## Major
1. **(carried from break R4-1, not addressed) A form whose file a combination reads as a source can never be retired. The refusal asks for something the product cannot do (P-116).**
   * In the sample this blocks IMM 5257 (the visitor visa application), Guide 5256, IMM 5484 and IMM 5881: 4 of the 14 rows.
   * Steps: IMM 5881 ⋯ → Retire → "Not possible now · Visitors › Visitor visa · Its file is attached here as a source (AI reads it from there): remove it there first" (v6-j8-retire-5881-refused). The link opens Visitor visa, whose Sources and forms tab offers Choose files, Attach a sample file and Draft with AI, but no Remove (v6-j8-sources-tab). `DELETE /combinations/<VV>/forms/IMM 5881` → 404 "not part of this combination".
   * No route deletes a `source_attachment`: `main.ts:74-77` has only POST and GET; the only delete is the demo reset.
   * The release re-check (`lifecycle.ts:223`) now also counts sources. So any form whose file was once a source is held for good.
   * Fix, either: (a) a source use blocks Delete only, not Retire (AI is already refused for a retired form in `launchSource`; add that guard to `plan()` for combination, program and catalogue scopes, and drop the source count from the release re-check for retires); or (b) the S4 remove route (`DELETE …/forms/:code`) also removes that combination's source attachment. Either way a pass and a fail test, and refusal words that name an action that exists.

## Should
* **(new) The Upload PDF cards are capped at 5, but the server takes 20 files.** `library-forms.tsx:73` `.slice(0, 5)`; `intake.ts:36` `MAX_FILES = 20`. In a 7-file upload the 6th file (IMM 1294, added to the library) got no card, and nothing said so (v6-j3-upload-many). A held 6th file would be missed the same way. Fix: keep one card per file of the batch, or show a summary line "n more: see AI work".
* **(new) Hand uploads are labelled "Official copy loaded with the sample".** `form-library.ts:79` falls back to SAMPLE whenever the edition has an `officialFile`, so IMM 5646, 1294, 5562 and 5710, uploaded by user-A, say so. History says "Configuration author added …". The drawer also says "No canada.ca page recorded yet", though step 3 found "the very file canada.ca's form page links" (v6-j6-retired-drawer). EXPERIENCE trust and provenance (D18). Fix: set `origin: UPLOADED` (plus the page found) in the intake.
* **(new) Focus is hidden under the sticky top bar (WCAG 2.2 SC 2.4.11, AA).** Tab 27 is the table's scroll region, and the page scrolls it to y=0 under the 56 px header (`App.tsx:51`). Tab 28, the "IRCC accepts" header tooltip, is entirely hidden (y 8–23). The first form number shows 2 px (v6-k-focus-first-number). Fix: `scroll-padding-top: 3.5rem` on the page scroller, or `scroll-margin-top` on the region and its focus stops.
* **(carried, partly fixed) Unread held upload.** The card box still says "then a second person compares and approves it" (`upload-run.ts:149`) beside a link saying it cannot be approved. To review still says "Record the IRCC page". Fix: one message everywhere: "We could not read its number: upload the official PDF from canada.ca."
* **(carried) S1** "US$0.00 spent" beside "stays counted at its reserved worst case". **S2** "Needs your OK" for IMM 5802, which has no file; its tooltip claims a file waits on To review, and nothing does.
* **(new) Three round 4 fixes have no test that fails when they are removed** (STANDARDS): the release re-check of sources (`lifecycle.ts:223`; the round 3 test at `check_forms_s4_finder.ts:310` plants a line, not a source), the hand-back History line, and the "+ Add" Undo step (`programs.ts:374`). The quote rule has only the golden pass, no fail case for a quote under another form's number.

## Minor
* New: the quote rule accepts any quote within 300 characters after the digits anywhere (`finder.ts:371`), and `digits()` lets "IMM 5257 SCH1" match under "IMM 5257" · the release answer omits a handed-back retire (`library:[IMM 5646]` only) · a retired form's History has no "retired in release 2" line · a double retire request answers "the database refused a duplicate" (`main.ts:156`).
* Carried: History repeats the role ("Configuration author: Configuration author added …") · non-Latin stored file names become underscores (`______-__.pdf`) · one search request per keystroke (4 for "5257") · the upload card's summary says "Already in the library" when the attach was refused (reason only in step 4) · "+ Add" runs outside `oneAtATime` · replay keyed by the last two names (R4-2, with the Lead).

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | List, filters, drawer, upload rules first, C11.18, lifecycle, run card and Stop all present; the finder now keeps IMM 5257 |
| D2 Data integrity | 4 | One change under a double retire; duplicate upload adds nothing; release hands back in a transaction; names stored as underscores |
| D3 Reuse | 4 | Stored once; the Sources tab upload reuses the library row |
| D4 Rule integrity | 4 | P-116 "no new use" holds on five routes and at the release; quote rule loose (Minor) |
| D5 Stability and recovery | 4 | Stop: card "Stopping" at 0.1 s, Stopped by 16:44:25, no launcher left, chip gone |
| D6 Freshness and governance | 4 | Checked dates; a second person on retire and accepts |
| D7 AI trust | 4 | Replay marked as saved AI answers; real evidence kept; stopped cost still US$0.00 |
| D8 Orientation | 4 | Breadcrumb, trails, Where used links |
| D9 Flow | 3 | Retire dead end for source-read forms (Major 1); unread held file still told to record a page |
| D10 Language | 4 | Plain; Minors only |
| D11 Feedback and state | 3 | No card after the 5th file; Needs your OK wrong; stopped cost; contradictory held text |
| D12 Visual quality | 4 | Calm, aligned (v6-j1-list-1440, v6-j1-drawer-5257-1440) |
| D13 Accessibility and responsive | 3 | axe clean on 9 states; 1024 (⋯ at 972), 400 and 640 px (200 %) with no page scroll; focus hidden under the top bar |
| D14 Team look | 4 | Team shell and components |
| D15 Speed | 5 | List 192 ms; filters under 300 ms; Stop answers at once |
| D16 Testability | 3 | Golden replay and source-guard tests added; release-source, hand-back and "+ Add" Undo untested |
| D17 First use | 4 | Simulated only |
| D18 Provenance | 3 | IRCC's words and AI · Sample shown; hand uploads called "loaded with the sample" |
| D19 End-to-end | 4 | Visitor visa's forms list now complete and attached; replay US$0 |
| D20 Pain and wow | 4 | Simulated only |

## Standards [M]
* **Met:** server authorisation (B, C, P 403 on retire, attach, accepts, finder launch; unknown actor 401) · Problem Details · expand-only migration · one request per view (search excepted) · uploads checked (type, empty, damaged, size) · cost before a live run (worst US$5.58) · EXPERIENCE §4 states.
* **Not met:** P-116 retire usable (Major 1) · WCAG 2.2 SC 2.4.11 · EXPERIENCE §2.7/§2.6 counts and origin · STANDARDS test-fails-without-rule (three fixes).
* **Graph (P-86):** G1, G2, G4–G6 at 0; G3 1 (older `/attachments/:id/file`, not S4). **Retrofit mapping:** build-notes "Round 4" lists each finding.

## Could not check
A paid run · a screen reader · Firefox, Safari · canada.ca live · browser zoom itself (200 % simulated as 640 px) · the builder's finder and browser suites (instructed not to) · D17 and D20 need an intended user's unaided walk.

# S4 Form library (W1-06, W1-07 run card): independent review, round 7 (drift-check FIX), 28 Oct 2026

Reviewer: did not build this screen. Commit a660f7b (`forms/2026-10-27-s4-form-library`, main 8cfc043 merged in). Judged against walkthrough v2 S4, P-116, P-121 to P-123 (with the 28 Oct amendment), challenge.md, the Lead note of 28 Oct (`lanes/forms.md`), drift-check.md, STANDARDS, EXPERIENCE and PRODUCT §3–4. concept-draft.md was not used to score: it predates P-123.

**How.** I ran my own isolated copy `fxr_s4` on :4475 with the stand-in launcher, and loaded the demo through `POST /api/demo/load`.
* I walked the page in headed Chrome (Playwright: clicks, typing, keyboard) as user-A, user-B and user-C, at 1440 and 1024 px and at 200 % (720 px at 2×).
* I ran axe on every state. I replayed the finder through the API, ran a break pass, and read every fixture quote on its recorded canada.ca page.
* **Spend: US$0.** Replay only. No launcher ran in my copy: there is no `fake-launch.log`.
* Screenshots: `review-shots/v8-*`.
* The copy is stopped, its database dropped and its `var` folder removed.
* The working tree also shows by-products from the builder's full suites, which were running in this folder at the same time (ledger, tickets, evidence, other screens' screenshots). They are not mine and I did not touch them.

## Verdict: **Ship after fixes** (no Must, one Major)
All four drift fixes are in and work:
* **The merge with main is clean.** The three conflicted files resolved sensibly.
* **Delete or Remove is one rule.** A library form is Deleted; a form taken off a combination is Removed. This holds on To review, the change page and History.
* **Replay is keyed by the combination.** Visitor visa replays at US$0, and still replays after it is renamed. Super visa reads the same pages but gets no answer: "No saved AI answer … Run it live once".
* **Load sample fills the library.** All 7 data forms have a value, every form except IMM 5802 has a page, and 4 guides are added. The load log says why High-wage LMIA has no guide.

The Major is about the fixtures. Every quote is IRCC's own words on the recorded page, which the check proves. But two of the six quotes do not say what the value next to them claims, and the check cannot catch that.

**Journey score 8.5/10**, with no criterion at 0 (table below). D18 is at 3, so the "no dimension below 4" bar is not met until Major 1 is fixed.

## The four changes, checked
| Change | Result | Evidence |
|---|---|---|
| 1 Sync main | **Holds.** Both kinds' word maps are kept; `actionWord` is the one rule | `api/src/library-changes.ts:15-17`, `review-queue.ts:153` |
| 2 Delete / Remove | **Holds.** To review (user-B) shows "Delete the library form. Reason: …", the change page shows "Delete library form: IMM 0100", and Approve takes it out of the list. Removing IRM 0002 from Visitor visa answers `{"removed","in_library":true}`; a second Remove gets 409 "Already removed"; Undo puts it back, and History says "removed … in Visitor visa" | v8-j3-to-review-B, v8-j3-change-page-B |
| 3 Load sample fixtures | **Partly holds.** 7/7 values are labelled "Sample · canada.ca words" or "AI · Sample", and the tag's tooltip says Sample. Every quote is on its page. Two quotes do not support "PDF upload" (Major 1). The guides are in the library but not tied to 3 of their combinations (Should 2) | v8-j1-list-1440, v8-j1-drawer-5476-1440 |
| 4 Replay keyed by combination | **Holds.** `runKey` uses the job's `combination` key, falling back to `samples/finder-saved-runs.json`, and otherwise gives no replay. The real launcher records `job.combination` (`p2/launch.ts:131`). A key cannot be given through HTTP: `main.ts:123` → `programs.ts:355` passes no `key`. A renamed Visitor visa replays (7 already); Super visa does not | replay run: VV done, spent 0; SV needs_person, spent 0 |

## Must
None.

## Major
1. **Two Sample fixture quotes do not support the value they are shown for (D18, D7; P-123: "IRCC accepts … with IRCC's words").**
   * **IMM 5476** (`samples/form-library-sample.json:9`). The value is "PDF upload", but the quote is the page's *Paper applications* line: "Send this form along with your application to the office listed in the guide…". The same page has the right line under *Online applications*: "Upload this form along with your online application". An RCIC reading the drawer sees a value that contradicts its own evidence (v8-j1-drawer-5476-1440).
   * **IMM 5257 SCH1** (`:6`). The quote is the download link's label, "Download the form Schedule 1 … (PDF, 0.5 MB)". The recorded page says nothing about how the form is filed, so under the round's own rule ("what neither names stays Not set yet") the value is inferred, not quoted (v8-j1-drawer-IMM5257SCH1-1440).
   * **The test cannot catch either.** `tests/check_forms_s4_runs.ts:72` only proves that the quote is somewhere on the page. Fixture lines also skip the quote rule that AI answers must pass (B-M2).
   * **Fix:**
     * IMM 5476: use the "Upload this form along with your online application" line.
     * IMM 5257 SCH1: leave it Not set yet, or quote a guide line that names it.
     * Add a check that each fixture quote sits under the page's online or upload wording, or names the channel. Add a fail case for a paper-only line.

## Should
1. **New: at 1024 px the "Sample · canada.ca words" tag runs into the Used by column.** It overlaps on IMM 1295, 5257 SCH1, 5409 and 5707 (v8-j6-list-1024: "Sample · canada.ca words4 combinations"). The pill does not wrap inside `AcceptsCell` (`web/src/pages/library-forms.tsx:137`). The 1024 check measures only sideways scroll. Fix: let the tag wrap or truncate within the cell, or use a shorter tag ("Sample · IRCC words"). Add an overlap assertion.
2. **Guides are in the library but not tied to their combinations.** Guide 5269 and Guide 5289 show "Not used". Guide 5256 lists only Visitor visa, not Super visa (v8-j2-guides-1440). `fillSample` stores each guide with no combination (`api/src/finder.ts:737`, `storeGuide(…, "system", null)`). A person on Study permit, Spouse or Super visa sees no guide, although the Lead note asks for "every sample combination its guide". Fix: attach each fixture guide to its combination as a source, or have the Lead record that "in the library" is enough.
3. **The guides Load sample adds have the wrong origin.**
   * Guide 5487 came from a recorded copy during Load sample, yet the drawer says "Downloaded from canada.ca by the form finder · PDF link". The link opens an HTML page, not a PDF (`library-forms.tsx:43, :235`; v8-j1-drawer-Guide5487-1440).
   * The visa-office files IMM 5881 and 5905 show "Its page on canada.ca · checked never". Their "page" is a PDF on ircc.canada.ca, recorded from the fixture with no check date (`finder.ts:753-761`, `library-forms.tsx:236`; v8-j1-drawer-IMM5881-1440).
   * Fix: give guides added by Load sample the SAMPLE origin, and say "IRCC file (no page of its own)" when there is no form page.
4. **Carried, out of the Lead's fix list:**
   * The approver of a retire still does not see Where used (`review-items.tsx`).
   * To review tells a held, unread upload to "Record the IRCC page". My imm5669e.pdf was held: the rules could not read it, and To review gave that next step.
   * IMM 5802 shows "Needs your OK" while nothing about it waits.

## Minor
* IMM 5802's Delete dialog says both "A retired line on … With an LMIA still points to it: retire it instead" and "Nothing uses it: no combination, release or waiting change" (`library-forms.tsx:223`). The two contradict each other.
* The IRCC accepts header tooltip still names only AI or a person as the source. It does not mention Sample fixtures (`library-forms.tsx:36`).
* "IRCC publishes no guide" for High-wage LMIA is an immigration claim. It is not labelled Sample in the load log.
* The super-visa guide (5256) is the lane's inference. Guide 5256 does have a super visa section, and the inference is labelled Sample.

## Journey test (reviewer, desktop only)
Journeys (persona → goal → result):
1. **Publisher scans the library after Load sample** (main). 17 rows, every value tagged Sample. First view 0.84–1.02 s cold, 0.20–0.37 s warm. Held, except for Major 1.
2. **Publisher filters to Guides.** 4 guides; 2 "Not used" (Should 2).
3. **Publisher deletes an unused form, approver approves** (cross-screen to To review). The row shows "Delete waiting"; user-B sees "Delete the library form"; after Approve the form is gone. Held. The sample has no deletable form: every sample file is an approved official file, so I used a test-made IMM 0100, as the builder's check does.
4. **Delete an official file** (alternate). IMM 1344 uploaded equal to canada.ca's file: "never deleted: retire it instead". Held (P-116).
5. **Set what IRCC accepts by hand** (C11.18). The IMM 1344 form opens with a line or reason and "a second person approves"; axe 0. Held.
6. **Wrong role.** user-C: every edit item is disabled and Upload PDF is gone; launching the finder gets 403; Load sample gets 403. Held.
7. **Error and recovery.** An unreadable upload is held, with "no AI"; a second Remove gets 409; Undo restores; a second Load sample gets 409 in words. Held.
8. **Keyboard at 1024 px.** Search, then 3 Tabs to IMM 5476, Enter, Esc; focus returns to the number. No page scroll at 1024 or 200 %. axe 0 on 10 states. Held, except the tag overlap (Should 1).
9. **Replay** (hands to S5's finder). Visitor visa: 7 attached, US$0, 1.9 s. Renamed Visitor visa: "7 already". Super visa: refused honestly. Held.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–9 complete |
| Next step obvious | ½ | IMM 5802's contradictory Delete dialog; held upload told "Record the IRCC page" |
| Plain words | 1 | Delete and Remove consistent; plain refusals |
| Feedback and state | 1 | "Delete waiting" on the row; run card; 409 in words |
| Correct data | ½ | IMM 5476 and SCH1 quotes do not support the value (Major 1) |
| Error recovery | 1 | Undo, 409 Already removed, Load sample refused in words |
| Accessibility and sizes | 1 | axe 0 on every state; keyboard path; 1024 and 200 % with no scroll |
| Speed | 1 | Warm list 0.2–0.37 s; replay 1.9 s; cold first view about 1 s |
| Visual quality | 1 | Calm and aligned at 1440; 1024 tag overlap (Should 1) |
| Trust and sources | ½ | Sample everywhere, but evidence mismatches and guide origin wrong (Major 1, Should 3) |
| **Total** | **8.5 / 10** | Pass: 8 or more, no 0. Raise it with: Major 1, then Should 3, then the Next step wording |

## D1–D20 (1–5)
D1 4 (all four changes present) · D2 4 (one record per action; a second Load sample refused) · D3 4 · D4 4 (P-116 and P-123 words hold) · D5 4 · D6 4 (second person on delete and accepts) · D7 4 (fixtures are never shown as AI) · D8 4 · D9 4 · D10 4 · D11 4 · D12 4 (1024 overlap) · D13 4 · D14 4 · D15 5 · D16 4 (keyed replay, wording and fixture-on-page are tested, with fail cases; quote-supports-value is untested) · D17 4 simulated only · **D18 3** (Major 1, Should 3) · D19 4 (Load sample → replay → attach, US$0) · D20 4 simulated only.

## Standards [M], graph, retrofit
* **Met:**
  * Server authorisation: user-C gets 403 on launch and load.
  * Problem Details on 409 and 403.
  * The migration only adds: `20261028090000` widens a CHECK and has its rollback lines.
  * Every immigration value is labelled Sample.
  * No paid call.
* **Not met:** EXPERIENCE "trust and provenance" (Major 1, Should 3). STANDARDS "a test fails without the rule" for quote-supports-value.
* **Graph:** G1, G2 and G4–G6 at 0. G3 is 1, an older route (`GET /attachments/:id/file`). Every S4 route has a test.
* **Retrofit:** build-notes "Fixes after the drift check" maps #1–#4.

## Could not check
* A paid or live run, or canada.ca live.
* A screen reader.
* Firefox or Safari.
* Real browser zoom (I simulated it).
* The builder's full suites (instructed not to run them).
* D17 and D20, which need an intended user's unaided walk.

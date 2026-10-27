# S4 Form library (W1-06, W1-07 run card): independent review, round 6, 27 Oct 2026

Reviewer: did not build this screen. Commit 37f27d0 (`forms/2026-10-27-s4-form-library`). Judged against P-116, P-121, P-123 (with its annotations and C11.18), P-124 to P-126, challenge.md, STANDARDS, EXPERIENCE and PRODUCT §3–4. I checked the round 5 claims in build-notes in the app and the code. I did not take them on trust.

**How.** I ran an isolated copy `rev6_s4` on :4457 (the forms lane's range), started with the stand-in launcher.
* A stub probe reached `fake-launch.log` (5 stub lines) before any live step. The one live finder run went to the stand-in. **Spend: US$0.**
* I walked the screen in a visible Chromium (Playwright: clicks, typing, keyboard) as user-A and user-B, then ran an API break pass.
* Journey report: `journey-test-reviewer-2026-10-27.md`. Screenshots: `review-shots/v7-*`.
* The `p2/jobs`, `runs`, `ledger`, `parts` and `p1/inventory` checksums match before and after (529 files). The copy is stopped and its database dropped.

## Verdict: **Ship after fixes** (no Must, no Major)
The round 5 Major is closed. A form that a combination only reads as a source can now be retired. It is never deleted, and AI no longer drafts from it.

**Journey score 8.5/10**, with no criterion at 0. D18 stays at 3, so the "no dimension below 4" bar is not met until Should 1 is fixed. That fix is small.

## The builder's round 5 choice, judged against P-116 as written: **conforms; the Lead can confirm it**
* **P-116 refuses a retire while a current draft or the latest release still uses the form.** A release takes its forms and field maps only from forms-list lines (`engine/snapshot.ts:110-115`, `effective(cforms…)`). It never takes them from source attachments. So a file that is only read as a source reaches neither a release nor a case. A forms-list line still blocks the retire, both when it is asked (`form-uses.ts:65`) and at the release (`lifecycle.ts:221-224`).
* **"Hidden from pickers and AI" holds.**
  * The picker leaves out IMM 5881 and IMM 5646 after the release.
  * The AI plan marks a retired form's file "not eligible" in every scope (`ai.ts:84,98`).
  * A per-source draft gets a 409 (`ai.ts:273`).
  * Delete stays refused (P-51).
* **Walked end to end.** IMM 5881 ⋯ → Retire. The dialog names Visitor visa: "it can be retired (the combination keeps its file; AI no longer drafts from it), never deleted" (v7-j7-retire-dialog). user-B approved it, Release 2 retired it (v7-j7-release-page-B, v7-j7-drawer-5881-retired), and Restore worked through the same steps.
* **One consequence to know.** Before the finder runs, the sample's Visitor visa and Super visa list their forms only as sources. So IMM 5257, the visitor visa application itself, can be retired while those combinations are being set up. That is the intended P-116 effect, and the dialog says so.

## Round 5 findings now
| Round 5 | Now | Evidence |
|---|---|---|
| Major: a form read as a source could never be retired | **Fixed** (choice above) | v7-j7-*. The API retire, approve and release give RELEASED and `retired_at` set |
| Upload cards capped at 5 | **Fixed** | 11 files → 10 cards plus one refusal line for the empty file (v7-j3-upload-many-1440) |
| Focus hidden under the top bar (2.4.11) | **Fixed** | No Tab stop is hidden or partly hidden at 1440, 1024, 720@2x (200 %) or 400 px (`index.css` scroll-padding) |
| Unread held upload: contradictory text | **Partly fixed** | The card is now consistent. To review still says "Record the IRCC page", and user-A's held page still says "a second person compares … approves" (v7-j3-review-queue-A, v7-j3-held-scan-A) |
| Hand uploads "loaded with the sample" | **Open** | Should 1 |
| S1 stopped "US$0.00 spent", S2 "Needs your OK" for IMM 5802 | **Open** | Should 4 |
| Tests that fail without the rule | **Partly fixed** | The hand-back History line is tested. "+ Add" Undo and a quote under another form's heading are still untested |

## Must / Major
None.

## Should
1. **(carried) Hand uploads show the wrong origin (D18).** IMM 5646, 1294, 5562, 5710, 5645, 5604 and 5532, each uploaded by user-A, say "Official copy loaded with the sample". The drawer also says "No canada.ca page recorded yet", although step 3 found "The very file canada.ca's form page links" (v7-j2-drawer-5646-1440). The cause is `form-library.ts:79`: it falls back to SAMPLE whenever `officialFile` is set. Fix: the intake sets `origin: UPLOADED` and stores the canada.ca page it matched.
2. **(new) The AI plan for a combination ignores an open retire.** I removed IMM 5257 from Visitor visa, asked to retire it, and planned AI for Visitor visa: IMM 5257 came back as `action: "draft"`. The per-source route refuses the same file (409 "A request to retire … is open"). `ai.ts:84` checks only `retiredAt`, while `ai.ts:274` also checks `closingChange`. Fix: apply the same `closingChange` guard in `plan()`, with a pass and a fail test.
3. **(new) The second person approves a retire without seeing where the form is used (P-116: "Where used shows before any action").** The change page shows only the reason and "Key: IMM 5881 (generated from the group and the name)" (`review-items.tsx:90`). It never says that Visitor visa keeps reading the file (v7-j7-change-5881-details-B). Fix: show the form's uses on the change page, with each use's `why`.
4. **(carried) Two statuses are wrong.**
   * The stopped finder card shows "US$0.00 spent" next to "It stays counted at its reserved worst case" (v7-j4-card-stopped-1440).
   * IMM 5802 shows "Needs your OK" while nothing about it waits on To review (`form-library.ts:76`: no current edition → `needs_ok`).
5. **(carried, partly fixed) The unread held upload.** One message is needed everywhere: To review (`review-queue.ts:134-136`) and the uploader's held page should say what the card says: "cannot be approved: upload the official PDF from canada.ca".

## Minor
* **New:**
  * After Stop, the guide step still starts its checker round's free stub pass. In `fake-launch.log` it starts 254 ms after the Stop audit line, because `finder.ts:281-283` runs round 2 although round 1 came back cancelled. No paid call starts.
  * The stopped step reads "Waiting for you" and "…nothing of it is used.. Choose…" (double full stop).
  * Checklist drafting has no retired guard (`checklist.ts:18-22`). It is stub only today, and live is refused.
  * Visitor visa's Sources tab shows retired IMM 5881 as "an approved official source", with no retired mark.
* **Carried:** History has no "retired / restored in Release n" line · a double retire answers "the database refused a duplicate" · non-Latin names stored as `______-__.pdf` · one search request per keystroke (4 for "5257") · History repeats the role · replay keyed by the last two names (R4-2, with the Lead).

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | List, filters, drawer, rules-first upload, C11.18, lifecycle, run card, chip and Stop all present and working |
| D2 Data integrity | 4 | Two retires at once → 201 and 409, one change. Duplicate upload adds nothing. Release in one transaction |
| D3 Reuse | 4 | Stored once; the finder reuses library rows ("6 in the library, 1 downloaded") |
| D4 Rule integrity | 4 | P-116 holds on lines, sources, picker and AI. `plan()` misses an open retire (Should 2) |
| D5 Stability and recovery | 4 | Stop: "Stopping" in 155 ms, Stopped in 1.7 s, no launcher left, chip gone. Stub after Stop (Minor) |
| D6 Freshness and governance | 4 | Checked dates; a second person on retire, restore and accepts; the proposer cannot approve (403) |
| D7 AI trust | 4 | AI steps marked; replay labelled "saved AI answers, no new call"; IMM 5257 kept |
| D8 Orientation | 4 | Breadcrumb, trails, Where used links, chip → `/ai/:id` |
| D9 Flow | 4 | Retire dead end gone. The held-unread text on To review is still mixed |
| D10 Language | 4 | Plain; Minors only |
| D11 Feedback and state | 4 | A card per file now. Stopped cost and IMM 5802 status are still wrong (Should 4) |
| D12 Visual quality | 4 | Calm, dense, aligned (v7-j1-list-1440, v7-j7-retire-dialog-1440) |
| D13 Accessibility and responsive | 4 | axe 0 on 10 states. No page scroll at 1440, 1024, 200 % or 400 px. Focus visible; Esc returns focus |
| D14 Team look | 4 | Team shell and components |
| D15 Speed | 5 | List 164 to 369 ms; Guides filter 104 ms; search 60 ms; Stop feedback 155 ms |
| D16 Testability | 4 | Round 5 tests pass and fail on `retireOk` and the AI guard. Open-retire plan, "+ Add" Undo and the heading-quote fail case are untested |
| D17 First use | 4 | Simulated only |
| D18 Provenance | 3 | IRCC's words, AI · Sample, Picked by AI and History shown, but every hand upload is called "loaded with the sample" (Should 1) |
| D19 End-to-end | 4 | Replay attaches 7 forms incl. IMM 5257 at US$0; release and restore end to end |
| D20 Pain and wow | 4 | Simulated only |


## Standards [M]
* **Met:** server authorisation (B and C 403, unknown 401 on retire, delete, accepts, attach, restore, upload, finder launch) · Problem Details · expand-only migration · uploads checked (empty, not a PDF, damaged, duplicate) · cost before a live run (worst US$5.58) · EXPERIENCE §4 states · graph G1, G2, G4–G6 at 0, G3 1 (older route).
* **Not met:** EXPERIENCE trust and provenance (Should 1) · P-116 "Where used before any action" for the approver (Should 3) · STANDARDS "test fails without the rule" for the open-retire plan and "+ Add" Undo. **Retrofit mapping:** build-notes "Round 5" lists each finding.

## Could not check
A paid run · a screen reader · Firefox, Safari · canada.ca live · browser zoom itself (simulated as 720 px at 2×) · the builder's suites (instructed not to) · D17 and D20 need an intended user's unaided walk.

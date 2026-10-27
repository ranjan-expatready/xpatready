# S4 Form library (W1-06, W1-07 run card): independent review, round 4, 27 Oct 2026

Reviewer: did not build this screen. Commit e7cb63c (`forms/2026-10-27-s4-form-library`), judged as it is now against P-116, P-121, P-123 (with its M1/M2 annotations and C11.18), P-124, P-125, challenge.md M1–M7 and m1–m6, STANDARDS, EXPERIENCE and PRODUCT §3–4. Round 3 claims in build-notes were checked in the app and the code, not taken on trust.

**How.** Isolated copy `rev4_s4` on :4461 with the stand-in launcher. A stub probe reached `var/isolated-rev4_s4/fake-launch.log` before any live step; every launch in that log is the stand-in. No model call, no canada.ca call (recorded copies only): **US$0**. Walked in a visible Chromium (Playwright, clicking and typing) as user-A (author) and user-B (second person), then an API break pass. Journey test: `journey-test-reviewer-2026-10-27.md`. Screenshots: `review-shots/v5-*`. `p2/jobs`, `runs` and `ledger` checksums are the same before and after. Copy stopped, database dropped. After my walk, uncommitted edits marked "round 4 R4-1, R4-3, R4-5, R4-6" appeared in `intake.ts`, `lifecycle.ts`, `form-library.ts`, `form-uses.ts`, `programs.ts` (21:49, not mine). They are not part of e7cb63c and are not reviewed here. They touch Major 1 but not `launchSource`, and not Major 2.

## Verdict: **Ship after fixes**
The round 3 fixes hold where they were made: Undo while a retire is open (409), "+ Add", upload for a row, replay of the committed Visitor visa answers, and focus rings on the chip and tooltip stops. Two **new Majors** were missed by earlier rounds:
1. A retired form still gets a new use through the combination's own "Sources and forms" upload, and the release re-check ignores that use.
2. On the real saved AI answers, the finder's quote rule drops IMM 5257, the Visitor visa application itself.

**Journey score 8/10** (passes the journey bar). D1, D4, D7, D11, D16 and D19 are at 3, so the check does not pass until both Majors are fixed and re-tested.

## Round 3 findings now
| Round 3 | Now | Evidence |
|---|---|---|
| Major: Undo while a retire is open | **Fixed for form lines** | Undo → 409 "A request to retire IMM 5645 is open on To review…", line stays RETIRED. Release re-check read in code and the builder's test; it misses sources (Major 1) |
| R3-1 "+ Add", upload for a row | **Fixed** | `POST …/lines` → 409. Upload: "Not attached … IMM 5645 is retired", but only in step 4; the summary says "Already in the library" (Minor) |
| R3-2 replay of the real answers | **Fixed** | Visitor visa replay PARTIAL, US$0, 5 attached; exposes Major 2 |
| S1 stopped call "US$0.00" | **Open** | v5-j4-card-stopped: "US$0.00 spent" beside "stays counted at its reserved worst case" (`finder.ts:494`) |
| S2 "Needs your OK" | **Open** | IMM 5802 (no file) is still the only row, tooltip "A file … waits for a second person" (v5-j1-needsok-5802) |
| S3 focus on chip and tooltip stops | **Fixed** | 3 px ring on the Status pill and the chip (v5-k-focus-after-tabs) |
| S4 chip label "+n" | **Fixed in code** | `run-card.tsx:88`; five uploads at once not re-run |

## Major
1. **(new) A retired form gets a new use through the combination's "Sources and forms" upload, and the release retires it anyway (P-116, STANDARDS §3.5).**
   * Steps:
     1. Attach IMM 5645 to Super visa, then Remove it.
     2. Retire IMM 5645; user-B approves.
     3. `POST /combinations/<Study permit>/attachments` with imm5645e.pdf → 201 "Already in the library … Attached to Study permit", status RECOGNISED ("Next: AI drafts its field map").
     4. user-B releases → `retired_at` is set.
   * Result: the list shows "Retired · Used by Study permits › Study permit".
   * The browser does the same after the release: Super visa › Sources and forms › Choose files gives "Attached to Super visa" (v5-j8).
   * A stub field-map draft on the retired file was accepted; P-116 hides retired forms from AI.
   * Cause:
     * `sources.ts:99 attach` (reached from `intake.ts:241`) checks neither `retiredAt` nor `closingChange`.
     * The release re-check (`lifecycle.ts:220-224`) counts only `combination_form` lines. `formUses` (`form-uses.ts:45-49`) counts source attachments as blocking uses.
   * Fix: the same guard in `sources.attach`; the release re-checks with `formUses` blocking uses; `launchSource` refuses a retired form's file; a pass and a fail test for each.
2. **(new) The finder drops IMM 5257 from the real saved Visitor visa answers, so the automatic attach leaves out the application form (P-123, C11.15).**
   * Both real rounds quote "This form must be completed by each person applying for a Temporary Resident Visa to visit Canada." In guide 5256 it is the line under the heading "Application for Temporary Resident Visa (IMM 5257)".
   * `finder.ts:375` needs the digits in the quote, or the quote inside the sentence that prints the number. So the line is dropped twice: "does not speak about it (too short, or about something else)".
   * The card says "5 forms attached or already there, 1 not found, 1 to decide" and never names IMM 5257 (v5-j5-replay-vv-card).
   * The tests plant quotes equal to the printed sentence (`check_forms_s4_finder.ts:106-112`), so the rule never meets a real answer.
   * Fix: accept a quote from the block under a line that prints the number (heading plus its paragraph), keep the length check; a golden test on the two committed answers (IMM 5257 attached, the "Form" snippet still dropped).

## Should
* **S1, S2 above (carried, open).**
* **(new) A held upload whose number could not be read is sent to a dead end.**
  * The card says "Record the IRCC page it came from" (`runs.ts:72`), and the uploader's held page promises a second person will compare and approve it.
  * user-B sees "This copy cannot be approved … Reject it and upload the official PDF" (v5-j9-*).
  * Fix: for an unreadable file, say "We could not read its number: upload the official PDF from canada.ca".
* **(new) A replayed finder run is labelled "US$0 · rules only, no AI"** (`run-card.tsx:31`) though two saved AI rounds were used (v5-j5). EXPERIENCE §2.6 needs AI marked. Fix: "US$0 · saved AI answers".

## Minor
* New: History says "Configuration author: Configuration author added IMM 5257 …" (`library-forms.tsx:249` plus the audit summary) · Upload PDF jumps to the middle of the header when a refusal line shows (v5-j3).
* Carried: one search request per keystroke (4 for "5257") · accepted non-Latin file names become underscores · a guide's drawer says "Downloaded … by the form finder · PDF link" · upload step 2 promises "AI only when the rules cannot" (D8) · a RETURNED retire still shows "… waiting" (`form-library.ts:61`) · Load sample adds guides for 2 of 5 combinations (Lead).

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | Library, upload, C11.18, lifecycle and Stop work; the finder misses IMM 5257 on real answers (Major 2) |
| D2 Data integrity | 4 | Duplicates refused ("Already in the library"); one intake row per file; roles enforced |
| D3 Reuse | 4 | Stored once; the Sources-tab upload reuses the library row |
| D4 Rule integrity | 3 | P-116 holds for lines and Undo, broken through sources and the release (Major 1) |
| D5 Stability and recovery | 4 | Stop 112 ms, launcher gone; cards survive a reload; bad files never sink the batch |
| D6 Freshness and governance | 4 | Checked dates; second person on retire and accepts |
| D7 AI trust | 3 | Real AI evidence dropped and not shown; replay labelled "no AI"; stopped cost US$0.00 |
| D8 Orientation | 4 | Breadcrumb; trails |
| D9 Flow | 4 | Retire → To review → Approve → row "Retire approved"; unreadable-file dead end |
| D10 Language | 4 | Plain; Minors only |
| D11 Feedback and state | 3 | Needs your OK wrong; stopped cost; replay label; unreadable-file next step |
| D12 Visual quality | 4 | Calm, aligned (v5-j1-list-1440) |
| D13 Accessibility and responsive | 4 | axe clean on 12 states; 1024 (⋯ at 936–972), 400, 200 % with no page scroll; ring on every stop |
| D14 Team look | 4 | Team shell and components |
| D15 Speed | 5 | First view 203 ms; filter under 200 ms; Stop 112 ms |
| D16 Testability | 3 | Undo and "+ Add" tests fail if removed (code read); no test for the source path; quote rule tested only on planted quotes |
| D17 First use | 4 | Simulated only |
| D18 Provenance | 4 | Origin, page, IRCC's words, who set what IRCC accepts |
| D19 End-to-end | 3 | Visitor visa's automatic forms list lacks IMM 5257 (Major 2) |
| D20 Pain and wow | 4 | Simulated only |

## Standards [M]
**Met:** server authorisation (users B, C, P 403 on undo, attach, "+ Add", retire, accepts, finder launch; none or unknown 401) · Problem Details · expand-only migration · one request per view · uploads checked · cost before a live run · EXPERIENCE §4 states.

**Not met:** P-116 / STANDARDS §3.5 (Major 1) · §3.8 AI evidence discarded (Major 2) · EXPERIENCE §2.7 counts (S2), §2.6 AI marked (replay label).

**Graph (P-86):** G1, G2, G4–G6 clean; G3 1 (the older `/attachments/:id/file`). Retrofit mapping: build-notes "Round 3" lists each finding and its test.

## Could not check
A paid run · a screen reader, Firefox, Safari, canada.ca live · five upload runs at once · the builder's finder and browser suites (instructed not to) · D17 and D20 need an intended user's unaided walk.

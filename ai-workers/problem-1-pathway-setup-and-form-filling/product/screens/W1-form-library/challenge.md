# S4 Form library (W1-06, with the W1-07 run component) — challenge and slice plan

Forms lane builder, stage DESIGN, 27 Oct 2026. Challenged against, in this order: **P-123** (with the founder's confirmation: AI finds, downloads, stores and attaches automatically, no confirm step), **walkthrough v2 S4** (`design/walkthrough-s3-s7.html#s4`, marked OK), P-118 Q2/Q3, P-120, P-121, P-116, P-110, P-113, `concept-draft.md` (older), `forms-for-5-combinations.md` (Sample), `STANDARDS.md`, `EXPERIENCE.md`, and today's code on `main` 23ae7c7 (`prototype/studio`). Facts carry a file reference; judgment says so. Every immigration value below (which forms a combination needs, what IRCC accepts) is **Sample — the immigration expert confirms**. Capabilities proved: C11.2, C11.8, C11.11, C11.14 (checker round, finder and upload only), C11.15 (API part; its buttons come with S5).

**New, not in the code today** (checked on `main`): no network request anywhere in the studio (the only fetcher is `official-sources/fetch_official_sources.py`, with no host allow-list); no checker round (P-121, C11.14 "Not built"); no retire, delete or where-used for forms (only a "used by" count in `api/src/sources.ts` `libraryForms`); no library record for guides. Everything else in the plan reuses existing code.

## Verdict
**Build after these changes.** The design is sound and most of the plumbing exists (intake, rules identity reader, held files and second-person approval, AI batches with plan fingerprint, idempotency and replay, lifecycle wording). Nine points need settling before code; the two Majors that change the build are (1) the rules already read a PDF's number, edition and title for US$0, so AI should only run when they cannot, and (2) four places in the agreed sources still show a confirm or approve step that the founder's confirmation removed. Nothing here adds scope; three points remove or narrow it.

## Objections, ranked

### Major

**M1 · AI reads the form's identity although the rules already do, for US$0.** *Needed for the proof.*
* Fact: every upload today runs `studio/tools/read_form_identity.py` (no AI) and gets kind, code, title, printed edition, published date and language from the PDF itself (`api/src/intake.ts` lines 252–256); the IRCC PDFs in `official-sources/ircc/` all read this way (P-32, P-41, P-51).
* What breaks: walkthrough S4 step 2 "AI reads the form number, edition and title; a second AI round checks it" pays twice per upload (about US$0.02 Sample) for a value the rules already have exactly, and makes identity depend on AI, against STANDARDS §3.8 / §4 ("works by hand with AI off"). Two AI rounds that both agree with a wrong rules read add nothing.
* Fix (judgment, high confidence): step 2 becomes **"Read what this file is: rules first"**. When the rules read code + edition + title, the step says "Rules read it: IMM 5532, edition 02-2021. No AI call was made." (the same wording S3 already shows for the path, founder-OK'd). AI with its checker round (P-121) runs only when the rules cannot read the identity (scanned file, unusual layout) and then proposes it with the quoted text; a person accepts. The run card, steps, time, cost and Stop stay as drawn. Saves cost, keeps P-121 wherever AI does run.

**M2 · Four places still show a confirm or approve step that the founder removed.** *Needed for the proof.*
* Fact: P-123's main text says "the person confirms the list once"; S4 board Lead's pick says "a file downloaded from canada.ca is approved by the person who confirms the combination's list"; S5 board shows IMM 5475 as "Downloaded · approve" and "You confirm the list once"; P-123's agreed Lead picks say "Load sample replays the finder and waits for Confirm". The founder's confirmation in the same row says "no confirm step before use".
* Agree with the Lead's reading: **a canada.ca download needs no approval and no confirm**; it is stored, attached and marked "Picked by AI · Sample"; the second person sees what AI picked at release review (AGENTS rule 4). A hand upload keeps today's second-person approval (P-80).
* What makes "no approval" safe (all rules, US$0, each with a pass and a fail test): https only; host exactly `www.canada.ca` (and `ircc.canada.ca` for visa-office PDFs); the PDF link taken from **the form's own page** found through canada.ca's forms index (never from a guide: guide 5256 links an old IMM 5476 path, `forms-for-5-combinations.md`); no redirect off the host; PDF magic bytes, ≤ 25 MB; the code read from the file equals the code asked for, else held. Provenance (form page, PDF link, checksum, fetched at, run) is recorded as a new **"official download"** basis next to today's manifest and `ApprovedSource` (whose rule "approver ≠ uploader" does not fit a system download).
* Ask: the Lead annotates P-123's main text and the two boards (Lead-owned files), so the reviewer does not score the missing confirm as a gap.

**M3 · The paid AI route admits only manifest files, so a downloaded form could never be read live.** *Needed for the proof.*
* Fact: `api/src/ai.ts` line 108 marks a file approved in the product as "not eligible" for a live call: "the paid route admits only the official library's files" (the committed manifest). A canada.ca download is on neither list.
* Same gap in edition impact review: it compares only editions on the manifest (`api/src/impact.ts` ~line 95), so a newer edition downloaded by the finder could not be reviewed.
* Fix: the live route and the impact review also admit a file whose checksum is recorded with the official-download basis from M2 (same evidence as the manifest: official host, link, checksum). Hand uploads approved by a second person stay as today (stub only) unless the Lead widens it. One rule each, with a pass and a fail test.

**M4 · The finder has no input when it starts by itself.** *Needed for the proof.*
* Fact: P-123 has the finder read "its guide and checklist"; S3 v2 starts the finder on Start setup with no person step; the older concept had the person paste the guide page. A new combination has no guide yet (guides today are attached per combination as a source, `intake.ts` "guides are not library forms").
* Fix (judgment): step 1 of the finder **"Find the guide"**: rules search canada.ca's forms-and-guides index (an HTML table of number · title · date, `forms-for-5-combinations.md` §Representatives) for guides and document checklists whose titles match the trail's words (US$0); AI picks among at most 10 candidates with the quoted title (draft + checker round, P-121); low agreement → "Choose the guide" with the candidates and a canada.ca-only address box. The chosen guide and checklist are stored once in the library (P-118 Q3) and linked to the combination as "read by AI". This also gives Load sample something to replay.

**M5 · Guides and checklists are not library records today.** *Needed for the proof.*
* Fact: `GovFormDef.formKind` is `data_form` or `document`; a guide is refused by the library intake and kept only as a combination source (`intake.ts` "A guide is kept as a source of a combination"). Guides on canada.ca are web pages (`official-sources/ircc/instructions/guide-5256.html`), and a saved page differs byte for byte per save.
* Fix: `formKind` gains `guide` and `checklist` (string column, no enum migration); a guide's edition is the page fetched on a date, identified by the checksum of its **normalised text** (same idea as today's online-version fingerprint); IRCC accepts shows "Read by AI, never filled". Expand-only.

**M6 · A republished file with the same printed edition would need a person, which the automatic flow does not have.** *Needed for the proof.*
* Fact: `FormEdition` is unique on (workspace, editionLabel) and the intake holds "same edition, different file" for a person (`intake.ts` lines 281–285). IRCC republishes printed editions under new files (IMM 5475 prints 05-2021, its file folder is 16-12-2022: `forms-for-5-combinations.md`).
* Fix (judgment): when the finder downloads a file whose code + printed edition is already in the library but whose bytes differ, it **attaches the library's edition** (released versions point to it), stores nothing new, and marks the form "Newer file on canada.ca, same edition" in the library with Replace offered to a person. A newer printed edition found on canada.ca is downloaded into the library as a new edition and goes to today's edition impact review; the combination keeps the current one until a person replaces it. No silent swaps, no person needed for the normal case.

**M7 · Stop cannot end a running AI call today.** *Needed for the proof (P-110).*
* Fact: `api/src/ai.ts` header: "cancel stops queued steps; a running paid call cannot be recalled, so its output is kept but never applied". P-110: Stop "really ends the run".
* Fix: the finder's and the upload's AI steps run through the guarded launcher in a child process the API can end (terminate, then force after 10 s); a call already sent is recorded in the ledger at its reserved cost; finished steps keep their results; nothing starts after Stop. `DraftingJob.combinationId` becomes nullable (expand-only) so a library upload with no combination is a tracked run too. Proven with a held fake model call (stub), US$0.

### Minor

**m1 · Alternatives and portal-only forms.** *Needed for the proof (data only).* IMM 5645 **or** IMM 5707 "the version in the application package for your country"; IMM 0008, 5669 and 5406 are digital forms in the PR portal for combinations 4–5 (P-113). Fix: each proposal keeps IRCC's quoted line and AI's plain condition ("Visa office asks for it") as text on the line (`CombinationForm.sourceQuote`, `conditionPlain` exist); turning it into a real "Only if" stays with W1-10. What IRCC accepts is stored per form with basis Sample from the quoted line, never invented. No "alternative of" relation (*Not built*).

**m2 · Retire and Delete for forms do not exist yet.** *Needed for the proof.* `lifecycle.ts` covers structure names and combinations; `GovFormDef` has no retired mark. Fix: reuse the lifecycle's wording and checks (where used first; Delete only if never released and unused; Retire refused while the current draft or latest release uses it, listing each use; a different person approves the retire, P-116). Expand-only `retiredAt` on the form.

**m3 · ESDC forms are outside canada.ca's IRCC index.** *Not built.* The Corporate Sample (EMP5626) is online-only in LMIA Online with no PDF link. The finder says "Not found on canada.ca: Upload PDF" there; no ESDC catalogue.

**m4 · Wave cap not enforced in code.** *Needed for the proof.* `p2/policy.ts` caps the whole experiment at US$100 (D282); P-110's US$40 for Wave 1 is not a counter. Fix: plans show "Wave 1 left: US$x of US$40" and refuse above it (counted from the ledger since the wave start date).

**m5 · Freshness.** *Needed for the proof.* EXPERIENCE §2.11 needs "last checked" visible. The board has no such field. Fix: the row drawer shows "Checked on canada.ca <date>" (from the last finder or compare run); no scheduled re-check (*Not built*).

**m6 · "Used by" must say what it counts.** Count combinations whose current draft or latest release lists the form; tooltip says so; "See where it is used" lists each with draft or released (EXPERIENCE §2.7).

## What is sound
* One lean list with three filters and a search; the finder lives on the combination (S5), not here. Right call: v1's five groups were heavy.
* Delete only when unused, otherwise Retire (P-116, P-51): released versions and filed cases point to an exact edition.
* Hand uploads keep the second person (P-80); downloads are proven by provenance instead (M2).
* The run card shows real steps, time, cost and Stop; no invented percentages (EXPERIENCE §4).
* The honest split stays: AI only decides which forms a guide asks for and under what condition; lookup, download, identity, checksum and duplicates are rules.
* Fallback if canada.ca refuses from the team's servers: one-click links plus a fingerprint match (P-123). A hand upload whose checksum equals the PDF behind the form page's link is as good as a download (judgment: it can skip the second person; Lead decides, Q-L1).

## Layout (modern, close to the board)
Keep the board. Three additions, all inside existing patterns (EXPERIENCE §3 Library list + Side panel): (1) **row opens a drawer** (Definition: number, title, edition, file fingerprint in Details · What IRCC accepts with its quoted line and Sample mark · Where used · History, including "Picked by AI · Sample" and "Downloaded from canada.ca on 27 Oct"); the ⋯ menu stays for the actions; (2) **Upload PDF runs in a side panel** (560 px) with the run card inline, so nothing stacks over the list; the top-bar chip follows the person as drawn; (3) the Status filter gains "Newer file on canada.ca" (M6). Nothing else.

## Back-end plan (element → record → API → rule → test)
| Element | Record (expand-only changes in bold) | API | Rule | Test (pass · fail) |
|---|---|---|---|---|
| List, filters, search | `GovFormDef` (+ **`retiredAt`**, `formKind` + `guide`/`checklist`), `FormEdition` (+ **`origin`** DOWNLOADED·UPLOADED·SAMPLE, **`formPageUrl`**, **`sourceUrl`**, **`canadaUpdated`**, **`checkedAt`**, **`acceptedChannels`**, **`acceptedBasis`** SAMPLE·EXPERT, **`acceptedQuote`**) | `GET /api/library/forms?type&usedBy&status&q` (one request) | Used by counts draft + latest release (m6) | counts equal the rows on the 5-combination sample · a retired form leaves the picker |
| Upload PDF through AI | `IntakeItem` (existing), `DraftingJob` (**`combinationId` nullable**) | `POST /api/library/forms/upload` → run id | Rules check file (type, size, magic, fingerprint) → rules read identity → AI + checker only if rules fail (M1) → compare with the canada.ca form page → guides naming it | readable IRCC PDF: no AI call, US$0 · unreadable file: AI step runs (replay) · HTML body refused |
| Second person for hand uploads | `IntakeItem` HELD, `ApprovedSource` | existing `decideHeld` | uploader ≠ approver (P-80); fingerprint equal to canada.ca's PDF may skip (Q-L1) | same person → 403 · different person → usable |
| Form finder | `AiBatch` (existing; new operation `find_forms`), one `DraftingJob` per step, proposals in the job's `detail` (no new table) | `POST /api/combinations/:id/forms/find` (plan → launch with plan fingerprint + idempotency key) | guide found (M4) → AI proposes forms with quoted line (draft + checker) → quote must be on the page → lookup → download → identity → duplicate (M6) → store once → attach | quote on page kept · fabricated quote dropped and listed · page text "ignore your instructions" has no effect |
| canada.ca download | **`OfficialDownload`** (form page, PDF link, checksum, fetched at, run) | adapter port: live (Mac) · fixture (tests, CI, Load sample) | official host, link from the form's own page, no off-host redirect, PDF, ≤ 25 MB, code matches (M2) | page link → stored · http, other host, redirect off host, HTML body, wrong code → refused, nothing stored |
| Attach automatically | `CombinationForm` (origin **`AI_FOUND`** added to `Origin`; `sourceQuote`, `conditionPlain` exist) | inside the finder run | stored once in the library, then attached, marked "Picked by AI · Sample" | two runs at once → one form, one edition, one line (race test) |
| Manual actions on a combination | `CombinationForm` versions (`supersedesId` exists) | `POST …/forms` attach · `DELETE …/forms/:line` remove · `POST …/forms/:line/replace` · `POST …/forms/:line/redo` · `POST …/forms/undo` | remove keeps the library row; replace only to a newer edition of the same form; undo reverts the last change while the draft is open | each action and its refusal; buttons come with S5 |
| Library row actions | `GovFormDef.retiredAt`, `LibraryChange` kind **`form`** | `GET /api/library/forms/:code/uses`, `POST …/retire`, `DELETE …` | P-116 / lifecycle wording (m2) | delete unused → gone · delete used → refused with each use · retire by author waits for another person |
| Re-read with AI | existing field-map drafting batch | existing `/api/ai/plan` + launch | live route admits official downloads (M3) | official download → eligible · unapproved upload → not eligible |
| Run card + chip + Stop | `AiBatch` (+ **`stopRequested`**, **`lastActivityAt`**), `DraftingJob` | `GET /api/runs/:id`, `POST /api/runs/:id/stop`, `GET /api/runs?active=1` | Stop ends the child process ≤ 10 s; sent call charged; nothing after Stop (M7); cost first, wave cap (m4) | held fake call stopped ≤ 10 s, status Stopped, steps kept, no later ledger row · over the wave cap → refused before any call |

## Slice plan
1. **Data and finder API (no page).** Migration (all expand-only, rollback recorded); canada.ca adapter (index, form page, PDF) with live and fixture modes; guide finder (M4), form proposals with draft + checker rounds (stub and replay), quote check, download, identity, duplicate (M6), store and attach; manual actions API; official-download basis and live-route admission (M2, M3). **First step: prove the download from this Mac** (index + one form page + its PDF, checksum equal to the manifest), then record the fixture set for the 5 combinations (pages + the PDFs still missing, committed under `official-sources/` with manifest checksums, P-83) so tests, CI and Load sample replay at US$0. Scripted API journey; a pass and a fail test per rule.
2. **Shared run component and Upload PDF.** Run API, real Stop (M7), wave cap (m4), top-bar chip; upload pipeline (rules first, M1). Used by the finder from slice 1.
3. **Library page.** One list, filters, search, columns, drawer, row actions with lifecycle (m2), every EXPERIENCE §4 state, axe, keyboard, 1024 px and 200 % zoom; App.tsx keeps its existing "Forms" menu item (no shared edit expected).
Live AI tests after slice 1 (stated first, inside the US$40 cap): finder on 2 guides with checker rounds plus one Stop mid-call and one forced provider error, about US$0.50 Sample. Downloads cost US$0. Then CHECK. Sync main after S2 merges, before CHECK. Keeps off the Programs page, Structure and New combination.

## Questions
**For the founder:** none. Every point above is settled by P-123, P-116, P-118 or the Lead's reading.

**For the Lead (recommendation first):**
* **Q-L1** · A hand upload whose fingerprint equals the PDF behind the canada.ca form page's link: treat as an official download (no second person). Recommended: yes; it is P-123's own fallback. Or: keep the second person for every hand upload.
* **Q-L2** · Annotate P-123's main text and boards S4/S5 for M2 (no confirm, no approve on downloads).
* **Q-L3** · M1 (rules read identity first, AI only when they cannot) amends the S4 board's step 2 wording; agree?

## Lead response
_(empty)_

## Agreement
_(empty)_

## Build discoveries
_(empty)_

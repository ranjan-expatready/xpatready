# M3 — Prepare application (agent, per filing) · designer draft for the Lead, 23 Oct

Board: `design/draft-prepare-application.html` (switch PDF only · Online only · Mixed; State switch; "Show labels"). Marks: **[F P-xx]** followed a decision · **[GAP]** decision missing · **[CONFLICT]** two sources disagree. All channels, portals, screen names and values are Sample until the immigration expert confirms. Unconfirmed: no counsel.

## 1. Job and journey
**Job:** the representative sees everything one filing needs, in one place, and finishes each item the way its channel requires: enter portal screens, check and validate PDFs, get signed copies back, and record the submission. Persona: agent / case officer acting as representative. Journey 8.2–8.5, 9.1–9.5 (solution page); SA-01B redesign 16, 16b, "Forms at launch"; SA-1B-74. Capabilities made to Work: C7.3, C7.4 (entry point), C7.5 (findings shown and acknowledged), C8.1, C8.2, C9.2, C9.3 (agent side).

## 2. Ten layers
| Layer | Exists in our app | Team code (`ERv2-frontend@5ccd9fa` case-management) | New here |
|---|---|---|---|
| Masters | Form, PDF edition, online version, portal, field map with channel (F1) | — | none |
| Links | Line channel + derived filing method (F1) | — | filing → items (one per form line × person, plus document lines) |
| Configuration | Released combination lines | — | none |
| Rules | — | readiness gate, blockers (`case-rail.tsx`) | BR-1…BR-9 below |
| Engine | Append-only PDF writer, read-back (C7.1); R1 plans case, Party, ClientCanonicalAnswer, FormInstance | FormStatus NOT_STARTED…FILED; `recordSubmission(channel, fileNumber, uci)` | item states per channel; staleness; readiness |
| Contract | — | mock store | §6 |
| Screen | — | case tabs incl. Forms; `FormReviewPage` | "Prepare application" case tab, Workspace pattern |
| AI assist | guarded route | — | independent review run + acknowledge (advisory) |
| Governance | release pin | — | audit of ticks, acknowledgements, signature states, reports |

## 3. Business rules
* BR-1 Items come from the pinned release's lines for each person on the filing, grouped Online forms · PDF forms · Signed PDFs · Documents; a group with no lines says "None in this filing". **[F P-62 §6, P-61]**
* BR-2 Only confirmed facts fill; proposed facts show as "Waiting for N facts" with "Confirm section" for that agent-view section. **[F P-72]**
* BR-3 Only the form's own checks (Validate rules) and missing or conflicting facts block an item; AI review findings are advisory, acknowledged with a reason ("Other" needs a note). **[F P-71, P-14]** — P-39 page and journey-v2 board still say "latest review clean": **[CONFLICT]**, followed P-71 (newer); Lead to correct both.
* BR-4 In-app "Check this form" runs the same rules as Validate; IRCC Validate and barcodes happen in Adobe (download → Validate → upload validated copy → read back, compare by position). **[F P-46]** The brief's "its own Validate" is read this way. **[CONFLICT, resolved by P-46]**
* BR-5 A PDF is filled directly only after its edition's fill trial passes; otherwise "Answer sheet only" (same component as the portal sheet), the agent fills in Adobe and uploads the copy for read-back. **[F P-65, redesign "Forms at launch"]**
* BR-6 Signed PDF states: Prepare → Printed → Sent for signature → Signed copy received → Uploaded; uploading the scan closes the matching document line. **[F P-65, P-62 §3]**
* BR-7 A changed fact refills drafts and marks printed/signed/uploaded items, entered portal screens and submitted items stale; never changes them; message names every place; Undo. **[F P-65, P-45]** Whether stale **blocks** is **[GAP] → Q1** (board assumes yes).
* BR-8 Portal sheet: screens in portal order, answer + copy + source per question, per-screen "Entered in the portal" tick. "Fill this screen" disabled on a screen whose structure changed ("Re-capture needed", task opened) and on background/declaration screens. "This screen looks different" opens the task. **[F P-62 §6, P-65, P-66 §2, redesign 16 guardrails]**
* BR-9 Filing record: portal (from the combination), our filing reference (generated; typed as the APR "case ID"), application number and UCI **per person** (SA-1B-74). Recording a submission warns, never blocks, and makes the filing read-only. **[F P-61, P-65; team recordSubmission]**
* BR-10 "Report a mapping problem" sends a content-team task; nothing on the case waits. **[F P-73]**; timing **[CONFLICT] → Q3**.

## 4. Layout and states
Pattern: **Workspace** (EXPERIENCE §3): case tab "Prepare application" (tabs in the route, one row) → header (title, filing strip, one readiness line with one primary: Next blocker · Next item · Record submission) → items list left (320 px) → detail right. Right panels, never modals, for: fact, acknowledge, report mapping, filing record, record submission. **[F P-48, TEAM-PATTERNS, P-43 case tabs]** Agent menu = "Cases" only, a proposal (Product §3 leaves it to M3). **[GAP, low]**
States drawn: not started / empty · in progress · re-capture needed · changed after entry · blocking form check · waiting for facts · advisory finding (open, acknowledged) · answer sheet only · signed copy out of date · ready to file · loading skeleton · could not load (Retry) · someone else saved (Reload) · submitted read-only. 1024 px: no sideways scroll (checked headless, Chrome).

## 5. Copy (key strings; full set on the board)
Readiness hint: "Only a form check error, a missing or unconfirmed fact, or a changed fact on a signed or entered item blocks. AI review findings never block." · Stale: "The signed copy uploaded 20 Oct is out of date. Date of marriage changed on 22 Oct … The signed copy was not changed and is kept in the history." · Fill disabled: "The portal screen changed. The extension fills nothing here until the content team re-captures it." · Empty: "Nothing is filled yet. Forms fill only from confirmed facts …" · Toast: "<Fact> updated. Drafts filled again; anything signed or entered is marked stale, never changed. [Undo]".

## 6. Contract sketch and tests
`GET /cases/:id/filings/:fid/prepare` → filing {path, portal, filingMethod, reference, release, persons[{role, applicationNumber, uci}]}, groups, readiness {done, total, blockers[{itemId, reason, fix}]}, version · `GET /filing-items/:id` → per channel: screens[{order, name, entered, recapture?, changedAfterEntry?, manualOnly, answers[{label, value, factId, source}]}] | {fillMode direct|answerSheet, checks[], unconfirmed[], validatedCopy?, reviewRuns[]} | {signState, staleBecause?} · `POST …/screens/:sid/entered` · `POST …/check` · `POST …/validated-copy` (read-back) · `POST …/sign-state` · `POST …/signed-scan` · `POST /review-findings/:id/acknowledge {reason, note}` · `PATCH /cases/:id/facts/:fid` (agent view's, returns updatedDrafts[], markedStale[]) · `POST /mapping-reports` · `PATCH /filings/:id/record` · extension: `GET …/screens/:sid/fill` (current screen only, fingerprint) + `POST /fill-events` (no client data). Optimistic version on every write (409 → Reload state). Problem Details on the field.
Tests: one pass + one fail per BR (e.g. BR-3: AI finding open → item still ready; check error → blocked); BR-7: change fact after signing → signed row unchanged byte-for-byte and stale; keyboard path through list, screen ticks, panels (Esc closes, focus returns); axe on each state; 3 situations × 1 journey each.

## 7. Capability or scaffolding · needed or not built
| Element | Label |
|---|---|
| Items list, filing strip, readiness, portal sheet, ticks, copy, sources, form checks, Adobe round trip, answer sheet, signed-PDF steps, stale marks, fact panel, acknowledge, filing record, record submission, states | Capability · Needed |
| "Fill this screen", "This screen looks different" | Capability · Needed (proved on a saved portal screen, P-66 F2) |
| Report a mapping problem (task only) | Capability · Needed? → Q3; hold-for-everyone and affected-cases list: Not built (M4, B28) |
| Representative approves each form (B6) · Form health view · document upload/AI reading (Documents tab) · fees and payment · e-signature | Not built here |
| Board switches, board notes, Sample people and values, "Prototype" chrome | Scaffolding |

## 8. Conflicts and gaps found (for the Lead)
1. **[CONFLICT]** Redesign 16b lists the visitor visa as "fully online"; SCREENS demo 1 and the brief treat it as PDF forms. Board keeps PDF (Sample); route to the immigration expert.
2. **[CONFLICT]** TAXONOMY case 1 "a filing per person" vs MASTERS "case › filing › person-on-filing" and SA-1B-74 (own application number per person) → Q2.
3. **[CONFLICT]** Team `FormReviewPage` overrides a value per form; P-45 forbids per-form overrides. Followed P-45; retrofit note for the team.
4. **[CONFLICT]** P-39 page and journey-v2 "latest review clean" vs P-71 (see BR-3).
5. Team spine `FormInstance.generationState` has no signed/uploaded/stale states (R1 plan F-9): adapter needed.
6. Fill-trial status per edition is Sample on the board except IMM 1344 (passed 23 Oct, E1).

## 9. Questions (at most three, recommendation first)
1. **Does a stale item block "Ready to file"?** Recommend **yes**: a signed copy or entered screen that no longer matches a fact is a conflicting fact on that form (P-71); it clears by re-signing/re-entering or undoing the change. Alternative: warn only.
2. **Visitor visa family: one Prepare application for the household, or one per person?** Recommend **one filing for the household** with items per person and each person's own application number and UCI (SA-1B-74, MASTERS person-on-filing); the expert confirms the APR portal takes them together. Alternative: three views (TAXONOMY case 1).
3. **"Report a mapping problem" in M3?** Recommend **yes, the button and content-team task in M3** (small, already on the form review path); holding the mapping for everyone and listing affected cases stays M4 (B28). Alternative: whole item in M4 (P-73 as written).

## Definition of Ready
- [x] Board drawn with all three situations and every listed state (designer draft; Lead and founder still to click through)
- [x] Every element labelled Capability / Scaffolding and Needed / Not built (§7, board "Show labels")
- [ ] Data and API needs known — sketched (§6); depends on R1 runtime models and F2 extension contract
- [ ] Every decision relied on agreed — Q1–Q3 open; conflicts 1–4 need Lead/expert action
- [ ] No open questions — three open
- [ ] screen-challenge run by a fresh agent (skill step 9)

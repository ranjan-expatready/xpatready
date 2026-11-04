# Prepare application tab: concept addendum (drafter, 4 Nov, r2 after the fresh challenge; for the tech lead's approval, P-316 (3), P-223 (4))

**Status:** r2. It takes in every Blocker, Major and Minor of `challenge.md`; the drafter's response is at the end. Board: `design/draft-prepare-tab.html` (r2).
**Rows:** C7.7 (the tab), C11.6 (a) (channel per row), C6.12-25 (fees per group), C7.3 (the answer-sheet panel).
**What this is:** an addendum, not a redesign. It brings the agreed designs up to the decisions since and to the case page as built:
* `../../M3-prepare-application/` (concept, challenge M1–M7, v3 board);
* `../../M3-agent-view/` (r5c, challenge, board).

The decisions since are P-122, P-143, P-145, P-171, P-237/P-238, P-272 and P-316; the page as built is stacked panels in `web/src/runtime/cases.tsx`. Every name and value on the board is **Sample** unless cited. Unconfirmed: no counsel.

## 1. Job and journey
* **Job:** the case officer sees everything each filing needs, in one place, and finishes each item the way its channel requires.
* **Persona:** the case officer; the representative reviews.
* **Journey:** J7 steps 2.3, 5.1, 5.2, 5.5 (`acceptance/journeys/J7-visitor-visa-end-to-end.md`); activities 8.2–8.5.
* **SA-01B:** redesign 16, 16b, "Forms at launch".

## 2. Ten layers: what exists, what is new
| Layer | Exists (main 9caa043b) | New here |
|---|---|---|
| Engine, data | filings, groups, items, fees, signing and Paper states (`engine/runtime/prepare.ts`, `filings.ts`, `signing.ts`) | none |
| API | `GET /runtime/cases/:id/prepare` (`M3-CONTRACT.md`) · `PATCH /runtime/items/:id/channel` · answer sheet + `…/screens/:k/entered` · Paper steps · `POST items/:id/pdf-copy` · the copy routes `/forms`, `…/generate`, `form-copies/:id/validated`, `…/lock` | **two small M3-only changes in `api/src/case-prepare.ts`:** (a) a PDF-upload barcode line gets `validated{}` and In progress or Out of date from `readBackOf`, by `paperLine`'s rule; (b) a document item takes its state from its `checklist_line` |
| UI | stacked panels; the "Prepare application" heading on `FormsPanel` (`web/src/runtime/forms.tsx`) | **the tab**, its list, the row detail (with the existing copy block moved in), the channel select, the fee block, the sheet panel |
| Types | — | in `prepare.tsx` only: never in `studio/contracts/runtime.ts` (M2-hot) nor a new `studio/contracts/` file, where every later edit would be hot |

## 3. Business rules (each from its source; nothing new decided here)
* **BR-1** **One tab, Prepare application** (P-272), at `/cases/:id/prepare`. The `/cases/*` routes live in `cases.tsx`, so `App.tsx` needs no line.
  * Tabs: **Overview** (People, Eligibility) · **Prepare application** · **Review** (Findings, C7.5).
  * **History is left out** of the tab row until a case history exists (P-33).
  * The Agent view (questionnaire) is stage 1 inside this tab (P-122: "facts stay one stage"), and the `#agent-view` link keeps working.
* **BR-2** **The forms panel is absorbed, not dropped** (challenge B1):
  * the copy block (Generate, Download, Send the validated copy back, Lock; `FormRow`, `ValidatedState`, read from `/forms`) moves into the form row's detail;
  * `FormsPanel` stays only where `/prepare` says `derived: false`, with its `why`;
  * `check_runtime_r1c.cjs`, `check_s5_slice2_browser.cjs` and `check_qa_s01_channels.cjs` are changed in the same PR and named in it.
* **BR-3** **Two stages per filing** (P-62 §6, P-171 (1)):
  * **1 Get the information**: the Agent view's sections, counted from the case view (already loaded), plus the documents panel (`../documents/`);
  * **2 Prepare the filing**: one row per `/prepare` item;
  * **Everything**: both, its count saying what it counts ("14 items and 8 sections").
* **BR-4** **Seven states, only the API's**, each in words: To do · In progress · Ready · Done · Out of date · Cannot start yet · Not needed (`to_do · in_progress · ready · done · out_of_date · cannot_start · not_needed`; `C7.7.test.ts`).
  * One short line says why, from the API's `reason`; the UI never writes its own reason (challenges B2, M5).
  * The template "{fact} changed from {old} to {new} on {date}" is C9.2's, not built here.
* **BR-5** **Channel per form row** (C11.6, P-122, P-143):
  * all four channels are shown;
  * those outside `accepts[]` are disabled with IRCC's line (`accepts_quote`): "Not accepted on {portal}: {IRCC's line}";
  * Paper asks for a reason;
  * a stale read still gets the 422 or 409 on the field;
  * the combination's line never changes, and the portal (`portal_words`) is read-only (P-137).
* **BR-6** **PDF copy, not for filing** (P-122, P-145): on **Online rows only**. It is never an item, never lockable and never counted. A PDF-upload row's deliverable is its own copy (BR-2).
* **BR-7** **Fees per submission group** (C6.12, P-247, r5c BR-18). Each `fees[]` line shows:
  * its label and `amount_words`;
  * on whose filing, and who pays ("Family maximum CAD 170, paid on Client A's filing"; "Covered by the family maximum");
  * an exempt person's reason in the block ("Child A1: no biometrics, under 14", IRCC page dated 2026-03-30);
  * `groups[].totals[].why` ("4 × CAD 100 = CAD 400, not above the family maximum CAD 500");
  * the API's `basis` sentence ("Sample until the immigration expert confirms" where it says so).

  Paying is not built.
* **BR-8** **Readiness** (C7.6, P-237, P-238, P-315): the tab shows `readiness[]` and its `why` (today `built: false`) and never computes it.
* **BR-9** **Online row → answer-sheet panel** (C7.3, P-152). A right panel, 480–560 px:
  * sections in PDF-twin order, labelled "PDF twin order (live portal order later)";
  * per answer: **person**, label, value, Copy, source (Document · Client · Case officer);
  * "Waits for: {facts}" per section (QA-153 today);
  * a **Mark entered** button, then "Entered by {who} on {when}". There is no un-tick: the API has none.
* **BR-10** **Paper row** (#709): the barcode page, then Validate · Print · Sign in pen · Mail, each with its state.
* **BR-11** **Roles and conflicts.** Staff only; the client gets 403. Every write carries `version`. A 409 shows the problem's own `detail`, because not every 409 means "someone else changed this" (pdf-copy, split, entered and the release fingerprint each have their own).

## 4. Layout (board r2)
**Pattern:** a tabbed detail page (TEAM-PATTERNS, "several views").

**Header:**
* the trail;
* the filings chip from `/prepare` ("Visitor visa · 4 filings · 1 group");
* `portal_words`, read-only;
* the release pin.

**Three cards:** 1 Get the information · 2 Prepare the filing · Everything. Each shows its count and one next action, taken from the API's reasons.

**Split view:**
* **Left list (340 px):** grouped by filing, with a person filter "Everyone ▾" (J7 5.1, P-122). Each row: identifier first ("IMM 5257 · Client A"), one state pill, one short line from `reason`. Needs you first, then Done.
* **Right:** the row's detail: the copy block or the steps, the channel select, the PDF-copy link (Online rows only), or the sheet panel.

**Fee block:** at the foot of each group; it moves under the list at 1024 px.

**States:**
* loading (skeleton with an `sr-only` status);
* could not load (Retry);
* not derived (`derived: false` and its `why`, with the forms panel);
* a PDF copy running (a 202 job);
* a 409 showing its `detail`;
* a filing that cannot start yet (why);
* out of date (the API's reason);
* long names;
* Not built, drawn and labelled but not tested: read-only after filing (C8.2), and adopting a newer release (ADOPT, P-246 (2)).

**Board data:** the FAMILY case (Client A, Spouse A, Child A1 aged 10, Child A2 aged 15; `C7.7.test.ts`) on the APR Portal, as in `acceptance/lib/setup_vv_m3.ts`.

## 5. Copy (key strings)
* **Channel:**
  * "Filed as" · "Only the ways IRCC accepts this form on {portal}."
  * Disabled: "Not accepted on {portal}: {IRCC's line}".
* **Paper reason:** "Why on paper? (for example, an accommodation)". Error: "Give a reason to file this form on paper."
* **Copy line:** "PDF copy, not for filing: your own copy. IRCC gets the online answers."
* **Sheet:**
  * "Mark entered" · "Entered by {who} on {when}".
  * "Waits for: {fact labels}".
* **Fees:** the API's `amount_words`, `why` and `basis`, shown as they are. "Visitor visa fee" names the line, as C6.12-25 reads.

## 6. Contract and tests
**Contract:** the reads and writes above. Two small M3-only changes in `case-prepare.ts` (a, b), each with its own API test in `tests/check_vv_prepare_api.ts`.

**Tests:** new `acceptance/C7.7-screen.test.ts` (C7.7-27 onward), one pass and one fail per rule:
* **BR-1:** the tab is reached by keyboard / People, Eligibility and Findings are each on a tab.
* **BR-2:** the copy block in the row detail keeps `check_runtime_r1c.cjs` green / `derived: false` shows the forms panel and its why.
* **BR-4:** each of the 7 states is shown in its words; IMM 5257 PDF upload is In progress after `validateRoundTrip` and Out of date after a change (change a); IMM 5476 is Ready / a state the API does not return never appears.
* **BR-5:** IMM 5476's Online and Paper are disabled, with the quote / Paper without a reason refused on the field.
* **BR-6:** the copy appears on Online rows only / never on a PDF-upload row.
* **BR-7:** C6.12-25 amended to click the tab: "Visitor visa fee", CAD 100 each, CAD 170, payer shown / the exempt child has no biometrics line and its reason is shown.
* **BR-9:** person shown per answer and "Waits for" shown / an entered section warns only after a change.
* **BR-11:** client 403 / a 409 shows its `detail`.

**Plus:** keyboard only (Tab through the list, Enter opens, Esc closes); axe clean at 1440 and 1024 px; a 6-person case's list in under 1 s.

## 6b. Capability or scaffolding (P-33)
* **Capability:** everything above.
* **Scaffolding:** the case frame and Overview are AG-07's (chips SI-15 and SI-16, Unverified); paying is not built; the History tab is left out.

## 7. Questions (at most three, recommendation first)
1. **(Founder) The History tab.** *Recommend:* left out until a case history exists (P-33), not a stand-in tab.
2. **(Tech lead) The PDF-upload line's state, change (a).** *Recommend:* yes, about 20 lines reusing `readBackOf`. Otherwise the main Visitor visa form would still read To do after its read-back.
3. **(Founder, via the tech lead) Waits and online-only copies** (permanent-residence combinations only). *Recommend:* named as breadth, outside C7.7's Works.

## Definition of ready
* **Gate B** (`tools/gate-b.mjs`): it applies only to the PR with a "Claims Works: C7.7" line. That PR needs QA-152 and QA-153 closed, or a `Fixes:` line naming them. Slice PRs are not stopped.
* **qa:** re-scores C7.7 after #709.
* **Tests:** `acceptance/C7.7-screen.test.ts`; the three browser suites changed in the PR.
* **Rows:** C7.7, C11.6 (a), C6.12-25, C7.3.
* **Approval:** by the tech lead after `challenge.md`.

## Drafter's response to the challenge (4 Nov)
* **B1:** accepted. BR-2 absorbs the copy block and keeps the panel for `derived: false`; the three suites are named.
* **B2:** accepted. The board was redrawn with API states only; changes (a) and (b) are M3-only, and §2 no longer says "API: none".
* **M1–M7:** all accepted (BR-4, BR-5, BR-7, BR-1 and BR-3, BR-4, BR-6, BR-9).
* **m1–m8:** all accepted:
  * the portal from `portal_words`;
  * the FAMILY case on the board;
  * the 409 `detail`;
  * Not-built states labelled;
  * the missing states added;
  * the person filter;
  * gate B in the Definition of ready;
  * the types out of `studio/contracts/runtime.ts`, and no `App.tsx` line.
* **The challenger's Q1 (History)** is kept as founder Q1.

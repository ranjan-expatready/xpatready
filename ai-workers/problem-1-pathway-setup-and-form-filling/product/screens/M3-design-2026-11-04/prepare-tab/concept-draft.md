# Prepare application tab: concept addendum (drafter, 4 Nov; for the tech lead's approval after a fresh challenge, P-316 (3), P-223 (4))

**Status:** draft. The board is `design/draft-prepare-tab.html`.
**Rows:** C7.7 (the tab), C11.6 (a) (channel per row), C6.12-25 (fees per filing), C7.3 (the answer sheet, opened from a row).
**What this is:** an addendum, not a redesign. It brings the agreed designs up to the decisions taken since and to the case page as built:
* `../../M3-prepare-application/` (concept, challenge M1–M7, v3 board);
* `../../M3-agent-view/` (r5c, challenge, board).

Since those designs were drawn, P-122, P-143, P-145, P-171, P-237/P-238, P-272 and P-316 have been decided, and the case page was built as stacked panels (`web/src/runtime/cases.tsx`). Every name and value on the board is **Sample**. Unconfirmed: no counsel.

## 1. Job and journey
* **Job:** the case officer sees everything each filing needs, in one place, and finishes each item the way its channel requires.
* **Persona:** the case officer; the representative reviews.
* **Journey:** J7 steps 2.3, 5.1, 5.2, 5.5 (`acceptance/journeys/J7-visitor-visa-end-to-end.md`); activities 8.2–8.5.
* **SA-01B:** redesign 16, 16b, "Forms at launch".

## 2. Ten layers: what exists, what is new
| Layer | Exists (main 9caa043b) | New here |
|---|---|---|
| Data, engine | filings, groups, items, fees, readiness inputs (`engine/runtime/prepare.ts`, `filings.ts`) | none |
| API | `GET /runtime/cases/:id/prepare` (whole shape, `M3-CONTRACT.md`) · `PATCH /runtime/items/:id/channel` · answer sheet and `…/screens/:k/entered` · Paper steps · Download PDF copy | none (C6.12 adds `fee_table_id` and C7.6 adds readiness; the tab reads them when present) |
| UI | the "Prepare application" heading on the R1 forms panel (`web/src/runtime/forms.tsx`), which reads `/runtime/cases/:id/forms` | **the tab**, its list, the row detail, the channel select, the fee block, the sheet panel |
| Team | tabbed detail page with tabs in the route, first tab Overview; right panel for anything with a field (`design/TEAM-PATTERNS.md`) | — |

## 3. Business rules (each from its source; nothing new decided here)
* **BR-1** One tab, **Prepare application** (P-272), in the route `/cases/:id/prepare`. Case tabs: Overview · Prepare application · Review (C7.5) · History. The forms panel is retired into this tab (challenge M7): one place, one set of words.
* **BR-2** Two stages per filing (P-62 §6, P-171 (1)):
  * **1 Get the information**: sections to confirm, per person; the documents panel is designed apart (`../documents/`).
  * **2 Prepare the filing**: one row per item (form, document, IRCC step).
  * A third view, **Everything**, lists both (r5c §4).
* **BR-3** Each row has **exactly one state**, in words: To do · In progress · Done · Out of date · Cannot start yet (the API's `to_do · in_progress · done · out_of_date · cannot_start`). One short line says why, from the API's `reason`; the UI never writes its own reason.
* **BR-4** **Channel per form row** (C11.6, P-143). The select offers only the item's `accepts[]`. Paper asks for a reason. A refusal shows IRCC's line from the 422, on the field. The combination's line never changes. The portal is fixed by the combination, read-only (P-137).
* **BR-5** **A form may appear twice:** filed, plus "PDF copy, not for filing" (P-122, P-145). The copy is never an item, never lockable and never counted.
* **BR-6** **Fees per filing** (C6.12, P-247, BR-18 of r5c), on whose filing, each with:
  * its basis (per application · per person by role · family maximum);
  * its amount;
  * "Sample" or its source line and date.

  The case total applies the family maximum within one submission group only. Exempt lines are shown with their reason ("under 14", Sample words from the fee row). Paying is not built.
* **BR-7** **Readiness** (C7.6, P-237, P-238, P-315), shown when C7.6 lands:
  * only a barcode form without its validated copy read back, and P-172's Express Entry lines, **block**;
  * everything else is a CRITICAL **warning** passed with a recorded reason.

  The tab shows the API's `readiness[]` and never computes it.
* **BR-8** **Online row → answer sheet** (C7.3, P-152). A right panel with sections in PDF-twin order, labelled "PDF twin order (live portal order later)"; Copy per answer; source; "Entered in the portal" per section.
* **BR-9** **Paper row** (#709): the barcode page, then the steps Validate · Print · Sign in pen · Mail, each with its state.
* **BR-10** Roles: staff only; the client gets 403 (not shown); every write carries `version` (409 → "Someone else changed this. Reload.").

## 4. Layout (the board's frames)
**Pattern:** a tabbed detail page (EXPERIENCE §3; TEAM-PATTERNS "several views").

**Tab body, top:**
* the filings chip: "Visitor visa · 4 filings · 1 group";
* "Filed through: IRCC secure account (set by the combination)";
* three cards as the only switch: **1 Get the information** (n of m sections confirmed) · **2 Prepare the filing** (n of m items done) · **Everything**.
* Each card shows its one next action.

**Body:** a split view.
* **Left list (340 px):** grouped by filing, then by item kind. Each row: identifier first ("IMM 5257 · Client A"), one state pill, one short line. Sorted Needs you first, then Done.
* **Right detail:** the selected row's steps, channel select, copy link, or sheet. Anything with a field opens a right panel; nothing is a centred modal.

**Fee block:** at the foot of each filing group: lines, the group's family maximum applied, the total. At 1024 px it moves under the list.

**States drawn:**
* empty ("No filings yet: add the people first");
* loading (skeleton with an `sr-only` status);
* could not load (with Retry);
* 409 Reload;
* a filing that cannot start yet (why);
* an item out of date (which fact, old and new value, date);
* read-only after filing;
* not on the newest release (the pin shown).

## 5. Copy (key strings)
* Channel select: "Filed as". Help: "Only the ways IRCC accepts this form on this account." On refusal: IRCC's line, quoted.
* Paper reason: "Why on paper? (for example, an accommodation)". Error: "Give a reason to file this form on paper."
* Copy line: "PDF copy, not for filing: your own copy. IRCC gets the online answers."
* Fee basis words: "per person" · "per application" · "family maximum for 5 or more at the same time and place" (fees.asp words; amounts Sample unless cited).
* Out of date: "Out of date: {fact} changed from {old} to {new} on {date}. Check it again."

## 6. Contract and tests
* **Contract:** no new route. It reads `/prepare` (whole shape) and writes the channel `PATCH`, the sheet's `entered` and the Paper steps, all built.
* **Test file:** new `acceptance/C7.7-screen.test.ts` (C7.7-27 onward). Each pair is one pass and one fail per rule:
  * BR-1 tab in route / forms panel gone;
  * BR-3 each state once / an unknown state is never shown as Done;
  * BR-4 accepted options only / Paper without a reason refused on the field;
  * BR-5 copy shown / copy not counted;
  * BR-6 the four lines, CAD 100 each / biometrics capped at CAD 170 for the family;
  * BR-8 sheet copy / an entered section later Out of date warns only;
  * BR-10 client 403 / 409 Reload.
* **Plus:** keyboard only (Tab through the list, Enter opens, Esc closes the panel); axe clean at 1440 and 1024 px; a 6-person case's list loads in under 1 s.

## 6b. Capability or scaffolding (P-33)
* **Capability:** every element above.
* **Scaffolding:** the case frame, Overview and History are AG-07's (chips SI-15, SI-16); paying is not built.

## 7. Questions (at most three, recommendation first)
1. **(Tech lead) Split view now, or a one-column list first?** *Recommend:* the split view, as r5c chose and the v3 board shows. A one-column list would be redone when the Review and Documents tabs join.
2. **(Tech lead) The fee block's place.** *Recommend:* the foot of each filing group, not a separate tab. Fees are per filing, and the family maximum is per group.
3. **(Founder, via the tech lead) Waits and online-only copies**, which only permanent-residence combinations show. *Recommend:* named as breadth, outside C7.7's Works.

## Definition of ready
* Acceptance test: `acceptance/C7.7-screen.test.ts`.
* Rows: C7.7, C11.6 (a), C6.12-25, C7.3.
* Decisions: as listed.
* Approval by the tech lead after `challenge.md`.

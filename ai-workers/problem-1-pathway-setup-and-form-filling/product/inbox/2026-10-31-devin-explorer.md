# Devin D5 — independent bug and gap hunt (3–4 h explorer)

Devin (outside checker, report only — P-146) ran the D5 prompt from `inbox/DEVIN-PROMPTS.md` on `main` `de82e7fd` (PR #141 merged). App walked on an isolated copy (`tools/isolated.sh explorer 4410`, fresh `xr_studio_explorer`; the demo at :4400 untouched); every check US$0 — no `STUDIO_*_LIVE` variable and no AI key set anywhere; the browser used the saved answers. `qa/BUGS.md` was read first: findings already listed there carry the QA id and new evidence only. Findings newest first, grouped by Part; each has steps, expected, actual, evidence and a suggested owner. Verify each before acting.

**Walked so far:** Program structure (Add pop-up, duplicate check, 120-char refusal) → Immigration programs cards → Visitor visa setup (Forms tab, Add from library, draft submitted as author, signed as Content reviewer, released as Approver) → open case EXP-001 → client questionnaire as Client A (all 3 parts) → officer confirms sections → Generate a copy → Ready to file → Form library upload (canada.ca duplicate + held non-canada.ca PDF) → To review filters. API concurrency guards (`expectedId`, supersede `updateMany`, 409 "Changed by someone else") verified in `api/src/runtime.ts:214–341`; the case GET route for a bare `/api/cases/:id` 404s (`runtime.ts` has no `@Get("cases/:id")` — read goes through other routes).

## Part 1 · Walking the product like its users

**E-14 · UX · Minor · lane: screens**
"Select all I can sign" selects every submitted row and the button reads "Sign 44", while the step above says "0 of 22 rule, document, check or AI-proposed changes signed". Steps: Review and release tab on a submitted draft (Visitor visa, 44 changes), as Content reviewer click Select all I can sign. Expected: select and count only what needs the expert's sign-off. Actual: all 44 rows checked; "Sign 44" signed all; the step then showed 22 of 22. A reviewer cannot tell what they signed. Evidence: walk on `de82e7fd`; text capture in this file's notes.

**E-13 · UX · Minor · lane: screens (same class as QA-111)**
Stale counts after Approve and release. Steps: Approver clicks Approve and release on the Visitor visa draft. Expected: header counts clear. Actual: header still read "Released · 44 draft changes" with badge "In setup" until a reload; then "Not ready · In Release 2 · draft matches the release". Evidence: walk on `de82e7fd` (same stale-count class as QA-111, different page).

**E-12 · UX · Minor · lane: screens**
The changes table's Origin column shows a system enum. Steps: Review and release › Changes in the draft. Expected: plain words per PRODUCT §4. Actual: every Field row shows `IMPORTED_RELEASE`; Question placement rows show "—". Item column shows raw keys for placements (`person.residential_address`, `relationship.accompanies_subject_to_canada`) — the second half is QA-73 (open); the Origin enum is new evidence of the same class. Evidence: `inbox/2026-10-31-explorer/p1-review-release-keys.png`.

**E-11 · UX · Major · lane: runtime (sample content S7)**
A fresh sample draft carries 12 warnings against itself. Steps: Load sample, open Visitor visa › Review and release › Validation. Expected: the shipped sample validates clean, or warnings the demo explains. Actual: 12 warnings "Questions · <field label>: Placed in section `contact` / `employment_history` / `family_members` / `personal_details`, which this combination's questionnaire does not use." — the sample's AI answer places questions in sections the questionnaire does not include, and the message shows raw section keys. Every demo that starts from the sample inherits them (0 errors, so release still works). Evidence: walk on `de82e7fd`; `inbox/2026-10-31-explorer/p1-review-release-keys.png` shows the first rows.

**E-10 · UX · Major · lane: runtime**
The client and the officer both see raw section keys as headings. Steps: open case EXP-001; the officer's answer groups are titled `family_members`, `personal_details`, `employment_history`; the client questionnaire (family link) shows the same three keys as part names and the part title "Part 2 of 3 · personal_details". Expected: plain titles ("About you", "Your work"). Actual: developer keys on a client-facing page. Evidence: `inbox/2026-10-31-explorer/p1-client-section-keys.png`; same keys on the officer page text capture.

**E-9 · UX · Major · lane: runtime**
Internal rule-engine text reaches the case officer. Steps: generate a copy of IMM 5707 while a derived answer cannot be produced. Expected: a plain "answer this on paper". Actual: 'To write by hand in Adobe: Whether the person has any children … (step "derive_inverse:1 when the subject has no child records (hides child rows), 0 when any child exists" is not in the executable set).' A rule key and engine internals on screen. Evidence: `inbox/2026-10-31-explorer/p1-generated-copy-jargon.png`.

**E-8 · UX · Minor · lane: runtime (probably forms' data)**
The signature instruction stutters: 'Sign: each signer signs "Signature:" and "Signature:" and "Signature:" themselves, by hand on the printed form.' Three identical labels joined — probably three signature boxes all named "Signature:". Expected: "the three Signature boxes" or named boxes. Same panel: "5 form fields written, 1 by hand" and earlier "1 form fields written" (missing plural). Evidence: `inbox/2026-10-31-explorer/p1-generated-copy-jargon.png`.

**E-7 · Gap · Minor · lane: qa**
A released-but-incomplete combination can open a case. Steps: Visitor visa released version 1 with 1 form, 0 documents, and its questions placed in sections it does not use; Open a case lists "Visitor visa · release 1" and opens a working case (7 questions asked). Expected (reading PRODUCT's proof intent): a combination whose setup is visibly incomplete would not be offered for cases, or would say why it is offered anyway. Actual: offered silently. Related: BACKLOG X1a (0 forms + 0 documents submittable) is the same gate one step earlier. Evidence: walk on `de82e7fd`; case `eda11b01-…` on `/cases`.

**E-6 · Ambiguity · Minor · lane: screens**
Add pop-up: with Pathway and Program empty, the hint under Sub-category says "Choose the category first." while Program is also empty — the first missing level is Program. Also the summary string glues the New badge to the name ("Explorer test visaNew"). Both cosmetic. Evidence: Add dialog walk on `de82e7fd`.

**E-5 · UX · Minor · lane: screens**
"0 of 5 steps" cards mix "Resume setup" and "Start setup" — Visitor visa and Super visa say Resume (a draft exists), Extend stay says Start. A "0 of 5" card saying Resume is defensible but reads oddly next to identical cards saying Start; the card gives no clue why they differ. Evidence: Programs page on `de82e7fd` after Load sample.

**E-4 · UX · Minor · lane: tech lead (chrome)**
Landing on a page while acting as a case person (Case officer) leaves the configuration page silent: `/library/forms` as Case officer produced six 403 console errors (`/api/draft?summary=1`, `/api/library/forms/list`, `/api/review-queue?filter=needs`, `/api/runs?active=1`) and a blank main, no "this page is for studio people" message (compare the case page's own "This page is for the case officer" line). Evidence: console capture on `de82e7fd`.

**E-3 · Bug · Minor · lane: tech lead (tooling)**
Set-up step fails on the Mac itself. Steps: on macOS run `bash product/tools/cloud-setup.sh`. Expected: idempotent setup completes. Actual: exits 1 after `== zsh and locale` — the script greps `locale -a` for `^en_US.utf8$`, but macOS spells it `en_US.UTF-8`, so it falls into `apt locales` which cannot run off Linux (`apt()` returns 1, `set -e` aborts). Everything after (venv check, PostgreSQL, databases, migrate, web build, official-PDF checksums, hooksPath) never runs. Evidence: `product/tools/cloud-setup.sh:39`; run output: `== node 24.21.0 … == zsh and locale` then `Exit code: 1`; `locale -a | grep en_US` shows `en_US.UTF-8`. Impact here: low (the Mac was already set up; I ran the rest by hand), but any fresh Mac copy or a Mac CI step dies at the same line. Suggested: accept both spellings (`grep -qiE '^en_US\.utf-?8$'`).

## Checked in Part 1, no finding

- Add pop-up: case-insensitive duplicate refused ("Uses the existing category"); 130-char name refused at submit "Keep the name under 120 characters" (no live length hint while typing — noted, not raised).
- Empty "Open a case" submit gives field errors in plain words; "Return to author" needs a note (enforced by disabled state — a hint why it is greyed would help; noted).
- Future date of birth saves then flags "A date of birth cannot be in the future" beside the answer — save-and-flag pattern, consistent with validation design.
- Upload of `imm5257e.pdf` (canada.ca copy): recognized as the official file, "Already in the library … Nothing duplicated", every step US$0. A 431-byte non-form PDF: held with a plain reason, no library row, no AI, routed to "a different person rejects it".
- Client link: parts list, per-part save, "Continue where you left off", "None apply — Counts as confirmed", officer-entered questions correctly not asked of the client. Two console errors during the case walk were 403s while acting as a case person (see E-4).
- Answer concurrency: `runtime.ts` refuses stale writes with 409 + the newer answer (`expectedId`, supersede `updateMany`, "Changed by someone else"); a two-tab UI attempt could not produce a lost write.
- QA-82 confirmed again on `de82e7fd`: the client question reads "Whether the person has any children (natural, adopted or step), derived from the child records held for the person" — the definition, not a question.
- QA-80 confirmed again on `de82e7fd`: the case pages' title stays "Product Studio" / "Immigration programs · Product Studio".
- QA-73 confirmed again on `de82e7fd`: Item column keys (see E-12).

## Part 2 · Checking the claims in `qa/CAPABILITIES.md`

_(in progress)_

## Part 3 · Looking for surprises before they happen

_(pending)_

## Part 4 · Reviewing how we work

_(pending)_

## Top 10 for the tech lead

_(pending)_

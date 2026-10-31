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

Every row marked **Works** was tried on `de82e7fd` against the running app at :4410 or its API. Verified = I reproduced it myself.

**Verified works**

- C1.1 Programs page lists every combination (cards + list). C1.2 duplicates refused case-insensitively in plain words; >120 chars refused at submit. C1.4 combination page shows path, status, one next step.
- C2.1 `imm5257e.pdf` upload: form number, edition and checksum read rules-only; "Already in the library: IMM 5257 (09-2023). Nothing duplicated." C2.2 unknown PDF held before library/AI with a plain reason. C2.3 held file lands in approver's Needs you; uploader self-approve 403 "a different person checks its source" — **and self-reject is also 403** (see E-15).
- C4.3 `GET /api/combinations/…/preview` returns per-person sets for Visitor visa. C4.5 `…/checklist` responds (empty here — the sample attaches 0 documents to this combination; reinforces E-11).
- C5.1/C5.2 walked end to end: author submit → reviewer Sign (22/22) → approver Approve and release; "Return to author" refused without a note; released as version 1.
- C5.3 To review filters Needs you/Waiting for others/Running/All; held file under approver's Needs you, never uploader's.
- C6.1 case EXP-001 opened on the newest release. C6.2 Client A answered all 3 parts, save/resume, None apply. C6.3 agent view shows source/status per answer, edit dialog works. C6.6 officer confirmed all sections (7/7).
- C7.1 generated copy wrote 5 confirmed fields, read-back checked. C7.6 (Partial row) gate verified at API: `POST …/lock {"kind":"filed"}` on a fresh case (EXP-002, 0 answers) → **409 "7 facts to answer or confirm before filing: do that, then generate a new copy."** Generate itself is allowed; the lock is the gate — consistent with the claim.
- C11.1 no extension/capture/online-fill UI anywhere walked; PDF path works end to end. C11.2 library is the one door (upload + duplicate + held paths all verified). C11.10 cards/list/chips clean.

**Not re-verified (rely on listed evidence):** C1.7 (parked), C3.5, C3.7, C4.9, C4.10's release-refusal facet, C6.10 (no minor in the walked family), C11.8 (live cost — not run, US$0 constraint correctly kept me from it). "Find missing forms" (C11.2) likewise not run — no saved answers, and I would not spend.

**E-15 · Gap · Minor · lane: forms**
An uploader cannot withdraw their own held upload. Steps: upload a non-form PDF (held); as the uploader try reject → 403 "a different person checks its source". Expected: a "Withdraw" for the uploader (they may see their mistake first). Actual: only a different person can clear it; the item sits in everyone's queue meanwhile. Evidence: API calls above on `de82e7fd`.

**Tension to note (not a new bug):** C3.10's claim is the form-field vocabulary ("never 'box'") and that was swept — but raw keys still reach three other surfaces (review-table Item/Origin E-12, generated copy E-9, case/questionnaire headings E-10). The wording standard evidently does not yet cover section keys, placement items or engine-step names.

## Part 3 · Looking for surprises before they happen

Newest ~30 merges on `main` read (20 real PR merges, 31 Oct #111–#141 plus their sync merges).

**E-16 · Ambiguity · Minor · lane: tech lead (process)**
The same-day churn pattern is real: `web/src/pages/review.tsx` changed by two different wording PRs on the same day (#118 then #136), `to-review.tsx` likewise (#119, #137), and `sources.tsx` + `cost-warning.tsx` + `ai-launch.tsx` by #121 then #128 (39 + 63 changed lines the same day). The shared browser suite `tests/check_screens_qa_1029_browser.cjs` was appended to by at least four PRs (#111, #118, #120, #136). Everything merged green today, but one shared append-only suite plus parallel wording PRs on the same page is how merge races and order-coupled tests start. Suggested: split the big browser suite per area, or route same-page wording fixes through one PR. Evidence: `git diff --stat <merge>^1 <merge>` per merge above.

**E-17 · UX · Minor · lane: screens**
One release now carries two numbers. After #136 the page reads "Last released: version 1, in Release 2" and the table shows "v1 · Release 2". A publisher cannot tell whether they shipped version 1 or release 2; the words also disagree with Open a case, which offers "release 1". Evidence: walk on `de82e7fd`; diff of #136 on `web/src/pages/review.tsx`.

**Checked in Part 3, no finding**

- Pages over 1 s: none found. API timings on the isolated copy: programs/cases/review-queue/draft-summary ≤ 30 ms, library list 141 ms, preview 41 ms. The 2.3 s first load was the dev server compiling, not the product.
- Tests that do not check what their name says: none found. #129 ("fix start-setup race") is honestly a test-timing fix — it names itself a test change and makes the wait fail loudly (matches the new rule in `next` SKILL §4.1, #132).

## Part 4 · Reviewing how we work

Read: `AGENTS.md`, `CLAUDE.md`, `WAY-OF-WORKING.md`, `lead` and `next` skills, newest `DECISIONS.md` rows, `STATE.md`. Five proposals, each with evidence and cost.

1. **One banned-patterns check for user-visible strings.** The wording sweep (C3.10) fixed "box"/"Canonical fields", but raw keys still reach users on three other surfaces (E-9, E-10, E-12, plus QA-73/113/114 open). A single suite asserting "no `snake_case` tokens, no `derive_*` step names, no enum SHOUT_CASE in rendered text" on the walked pages would catch the whole class. Cost: one shared helper + a denylist; small.
2. **"The sample validates clean" as a check.** Every demo, screenshot and outside walk inherits the sample's 12 self-warnings (E-11) and a releasable combination with 0 documents (E-7). A check asserting 0 errors **and 0 warnings** on a fresh Load-sample draft would keep the starting point honest. Cost: fix the sample's question placements once, plus one check; small.
3. **Keep CI on the Mac runner with hard budget guards.** `STATE.md` records GitHub-hosted minutes spending the US$10 monthly budget by 06:15 UTC in one morning (~2,500 minutes; P-195 moved checks back to `xr-mac`). Proposed: keep the Mac runner primary, and add `timeout-minutes` on every PR workflow so a wedged job cannot drain a budget again. Evidence: STATE "In flight" + P-195. Cost: minutes to add the timeouts; mostly already decided.
4. **Kill the stale-count bug class at the root.** E-13 (post-release "44 draft changes"), QA-111 (finder counts), QA-116 (Undo timing), QA-67 (row actions stale after person switch) are one bug: invalidated-query gaps. One shared `invalidateAll` on (a) person switch and (b) any mutating action's success would remove the class instead of patching each page. Cost: small–medium in `web/src` query helpers.
5. **Track "bugs found by outside walks" as a first-class number.** `STATE.md`'s watch list already counts "bugs found after merge (must not rise)"; this walk found ~12 reportable items on a green `main` in about two hours — the suites are green while surfaces still leak keys and jargon. An hour of outside walking per milestone gate is cheap evidence the suites cannot produce. Cost: one hour per gate.

## Top 10 for the tech lead

1. **E-3** — `cloud-setup.sh` dies on any fresh Mac at the locale grep; one-line fix, blocks onboarding and any Mac CI step.
2. **E-10** — the client questionnaire shows `family_members` / `personal_details` / `employment_history` as part titles. Client-facing.
3. **E-9** — engine jargon (`derive_inverse`, "not in the executable set") inside the generated copy an officer sends out.
4. **E-11** — Load sample ships a draft with 12 warnings against itself; every demo inherits them.
5. **E-7** — a released combination with 0 documents and questions in unused sections opens cases silently.
6. **E-13** — header still says "44 draft changes · In setup" right after release (stale-query class, see P4-4).
7. **E-14** — "Sign 44" signs 44 when the step says 0 of 22 need signing.
8. **E-12** — review table shows `IMPORTED_RELEASE` and placement keys (extends QA-73).
9. **E-15** — an uploader cannot withdraw their own held upload; only a different person may reject it.
10. **E-16** — same-day same-file PRs and one shared append-only browser suite: the collision pattern to break before it produces a real merge race.

(Also logged: E-4 silent 403s when a case person lands on studio pages; E-8 signature stutter and "1 form fields"; E-17 "version 1 · Release 2" dual numbering; E-5/E-6 minor card/dialog cosmetics. QA-73/80/82/111/113-class confirmed on `de82e7fd` with fresh evidence above.)

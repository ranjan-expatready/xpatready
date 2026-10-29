# W1-10 slice 1: filing channels (B37, P-140, P-143): plan for the Lead (forms lane, 29 Oct; no code yet)

**Read:** P-137, P-140, P-143, P-144, P-145 (`DECISIONS.md` on `lead/2026-10-29-r8`) and the research `research_notes/Agent view and filing UX/filing_channels.md` (there). **Code:** main 32961d69 plus slice 0 (`e3fe8770`). `app/` means `prototype/studio/`. Which channels IRCC accepts per form and account is **Sample** until the immigration expert confirms it. What a representative may do is Unconfirmed: no counsel. P-145 (PDF copy) is M3 and is **not** in this slice. P-144 (barcode blocker) is now planned here with P-171 (b) as C-9 and C-10 (§8a, Lead message 29 Oct); whether it is built here is §8 question 6.

**Lead, 29 Oct morning (main db5e0208, which changed no app code since 32961d69, so this re-check stands):**
* Q-L1 yes (the runner, done in slice 0). Q-L2 yes (the queue item contract lands before slice 2). Q-L3: the order in `plan.md` §3.
* Founder: Q1 = P-139 (US$120 experiment cap); Q2 = P-140 (the channel inside the finder's rounds).

**Reuse, never rebuild:**
* PDF filling stays `prototype/p5/fill.py` through `studio/api/src/fill.ts`. A Not needed line is skipped there, like Online.
* The barcode read-back (`prototype/evidence-lane/E1/tools/barcode_compare.py`) and the text inventory (`E1/tools/inventory.py`) belong to M3 for P-144; this slice does not call them.

The questions in §8 are still open.

## 1. Fresh re-check: what exists today
| Piece | Today (file) | P-143 needs |
|---|---|---|
| Line channel | Postgres enum `FilingChannel` = PDF_UPLOAD · ONLINE · SIGNED_PDF_UPLOAD (`schema.prisma:79`); `contracts/forms.ts CHANNELS`, `CHANNEL_WORDS`, `SetChannel` | ONLINE · PDF_UPLOAD · PAPER · NOT_NEEDED |
| Signature | **derived** from the channel (`contracts/forms.ts SIGNATURE_WORDS`, `engine/channels.ts signatureOf`), never stored. `signedBy` (who signs, `contracts/workspace.ts SIGNED_BY`) is a different value and stays | its own value per line: typed name · signed by hand and scanned · signed in pen · none |
| What IRCC accepts | one string per edition, `FormEdition.acceptedChannels` = PDF · ONLINE · PDF_OR_ONLINE, plus basis and quote (`schema.prisma:300`); `engine/channels.ts acceptedChannels` maps it to line channels | per edition **and per IRCC account** |
| The account | `Combination.portalKey` (`schema.prisma:160`), fixed by the combination (P-137); the portal list is parked with the extension (W1-02) | a short account list: APR Portal · IRCC Portal · PR Portal · none (paper filing) |
| Finder | `find_forms` quotes `filed_note`; `finder.ts:680` writes `acceptedChannels` **directly** from `channelsFrom` (basis AI_SAMPLE), with no second person | both rounds propose the channel with the quote; `channelsFrom` only flags a contradiction; a second person confirms (P-140) |
| Keyword rule | `filing.ts channelsFrom` → PDF · ONLINE · PDF_OR_ONLINE · null (paper lines give null) | also recognises an affirmative paper instruction, so it can flag a contradiction |
| Readers of the value | `forms.ts:96` (save), `workspace.ts:61` (S5 Forms tab), `library-changes.ts:67`, `lifecycle.ts:351` (approval), `form-library.ts:81,114`, `engine/channels.ts` (release rules, `filingMethod`, `filingKind`, `channelsView`), `fill.ts:30`, `fill-case.ts:94,123`, `engine/runtime/forms.ts:26` (Online is not filled), web `workspace/forms.tsx`, `workspace/preview.tsx`, `library-forms.tsx`, `contracts/programs.ts:136,209` | one meaning everywhere; Not needed is never filled, like Online |
| Released snapshots | a release keeps each line's `channel` in its frozen JSON (`engine/snapshot.ts`); the fingerprint has a channel key only when set | a release made before this slice must still read correctly and must not look "changed since release" |
| Tests on the old value | `check_forms_channels.ts`, `check_screen01_channels.ts`, `check_screen01_smallfix.cjs`, `check_screen01_browser.cjs`, `check_s5_leadcheck.ts`, `check_forms_s4_runs.ts`, `check_forms_s4_canada.ts` | updated to the new values in this slice; screens' and runtime's checks are named in the hand-back |

## 2. The migration (one Prisma migration, in this order)
1. Add the enum values `PAPER` and `NOT_NEEDED`, and a new enum `SignatureKind` = TYPED_NAME · HAND_SCANNED · PEN · NONE.
2. Add `combination_form.signature SignatureKind NOT NULL DEFAULT 'NONE'`.
3. Every row on `SIGNED_PDF_UPLOAD` → `channel = PDF_UPLOAD, signature = HAND_SCANNED`, on every version (DRAFT and PUBLISHED alike: the row's meaning does not change, only its spelling).
4. Recreate `FilingChannel` without `SIGNED_PDF_UPLOAD` (Postgres cannot drop an enum value: rename the old type, create the new one, cast the column, drop the old type).
5. New table `form_edition_accepts` (edition, account, channels as an array of the four values, basis, quote, set by, set at; unique edition × account). Each existing `accepted_channels` becomes one row with account **any** (meaning "for every account, Sample"): PDF → {PDF_UPLOAD}, ONLINE → {ONLINE}, PDF_OR_ONLINE → {PDF_UPLOAD, ONLINE}. Then drop `form_edition.accepted_channels`, `accepted_basis` and `accepted_quote`.
6. Pending `form_accepts` changes (WAITING, RETURNED, APPROVED) are rewritten to the new payload with account any. Applied ones stay as history.

**Released snapshots are never rewritten.** The engine reads a line's `channel: "SIGNED_PDF_UPLOAD"` from an older release as PDF upload, signed by hand and scanned. The fingerprint comparison normalises that spelling, so an unchanged combination does not show "changed since release". A new snapshot writes `channel` and `signature` (the signature key only when it is not NONE, so lines without one keep their fingerprint).

## 3. Rules (each with a pass test and a fail test)
* **C-1 Values.** A line's channel is one of the four; its signature one of the four kinds. Old spelling refused on every write route (400, in words).
* **C-2 Channel and signature fit together.** Paper → signed in pen. Signed in pen only on Paper. Signed by hand and scanned only on PDF upload. Not needed → none. Online → none or typed name (the portal's own declaration is not ours to record). Default on a new line: from the channel (Paper → pen; otherwise none) and the edition's record when there is one.
* **C-3 Within what IRCC accepts for the combination's account.** On save and at release, a line's channel must be in the record for (edition, combination's account), else the record for (edition, any); no record → every channel is offered (Sample), as today. Another account's record never applies.
* **C-4 Not needed** only where the record for that account says the account asks it itself; the line stays visible, greyed, with the reason, and is never filled (`fill.ts`, `fill-case.ts`, `engine/runtime/forms.ts`, like Online).
* **C-5 The finder proposes, a person confirms (P-140).** Both rounds name the same channel and account with a quote found on the page, and `channelsFrom` does not contradict → one `form_accepts` change WAITING, its quote and both readings kept (Ready). The rounds differ, or `channelsFrom` reads the line otherwise → the change is still created, marked Check with both readings. No quote found → no change, listed. **The finder never writes the accepts record itself** (today it does, `finder.ts:680`).
* **C-6 Keyword rule.** `channelsFrom` adds an affirmative paper instruction ("mail it to", "apply on paper", "print, sign and mail"), with conditions and negations handled as now; it only flags a contradiction (C-5).
* **C-7 Filing method words** (`filingMethod`, `filingKind`): Online · PDF upload · Paper; Not needed lines are left out; "Online + PDF uploads" stays the normal portal case.
* **C-8 Old releases** read correctly and do not drift (§2).

## 4. The saved finder runs (replay)
The channel goes into `find-forms` as prompt **v2**, with an output field `channel {value, account, quote}` in both rounds. A saved run is keyed by its prompt (slice 0), so the 27 Oct runs (v1) no longer match v2. **Plan:** a step may name earlier prompt versions it still replays. v1 runs replay the form list as today, labelled "saved before channels: channel not proposed", and the channel then comes from the keyword rule as **Check** for a person. Re-recording v2 live is part of the slice 6 trial (about US$0.31 per combination, six combinations ≈ US$1.9, Sample; P-139: once live first).

## 5. Screens
* **Shared library › Forms:** "IRCC accepts" shows per account (one line per account with a record, "any account" otherwise); the side panel sets it per account, still a second-person change.
* **S5 Forms tab** (`web/src/pages/workspace/forms.tsx`, the runtime lane's file, this lane's for this change by the Lead's word): the "Filed as" picker offers only what the account accepts, each refused one greyed with its reason; a new **Signature** column and picker limited by C-2; Not needed greyed with its reason. The portal shows read-only ("Filed through APR Portal", P-137). `preview.tsx` pills follow the new values.
* Words come from one place (`contracts/forms.ts`), no new dialog, run card or lifecycle pieces (S6 re-check R5).

## 6. Order inside the slice (each step committed and pushed, checks green before the next)
1. Contracts, engine and migration (§2, C-1, C-2, C-7, C-8) with the unit checks; existing suites updated to the new spelling.
2. Accepts per edition × account (C-3, C-4): table, API, library panel.
3. The finder's rounds (C-5, C-6, §4): prompt v2, output schema, the change created instead of the direct write. US$0: stub and replay only.
4. S5 Forms tab and preview (§5).
5. Full run-suites, graph check, hand-back. A fresh reviewer and breaker at CHECK.

## 7. Tests (new or changed; US$0, no live AI)
* `check_forms_channels.ts`: C-1, C-2, C-3, C-4, C-7; the migration on a copy holding all three old values (rows, versions, pending changes); a v1-era release snapshot reads as PDF upload + hand scanned and does not drift (C-8).
* `check_forms_s4_canada.ts`: C-6, a pass and a fail per paper phrasing (with conditions and negations).
* `check_forms_s4_finder.ts`: C-5 with the fake launcher (agreeing rounds → WAITING change, Ready; differing rounds → Check with both; contradiction → Check; no quote → listed, no change; nothing written directly); v1 replay → "channel not proposed".
* `check_forms_rounds.ts`: a step names an earlier prompt version it may replay; any other version is refused.
* Browser: `check_forms_s4_library_browser.cjs` (accepts per account, the second-person change); a new `check_forms_channels_browser.cjs` on the S5 Forms tab (picker limited with reasons, Signature column, Not needed greyed, axe on every state, 1024 px and 200 %).
* Updated: `check_screen01_*`, `check_s5_leadcheck.ts`, `check_forms_s4_runs.ts` (the old spelling).

## 8a. P-170 and P-171 (founder, 29 Oct; Lead message, after PR #90)
Sources: `screens/W1-baseline/immigration-facts-2026-10-29.md` (on `lead/2026-10-29-m3go`). **P-170:** any immigration value this slice adds keeps its official page, a short quote and the date read. Where there is no source, it says "not found", never a guessed quote. A founder answer is marked `basis: founder P-171, Sample` and has no quote.

| P-171 | What exists today | Change |
|---|---|---|
| (a) IMM 5257 SCH1 (09-2023) | Library, manifest and samples already use the code and edition. The library title in `api/src/sources.ts TITLES` read "Schedule 1: Background/Declaration", which is IMM 5669's wording. | **One-line data fix, done:** title "Schedule 1: Application for Temporary Residence", with the source in a comment (forms index, read 29 Oct). Not a plan change. |
| (b) Validate last; a change after it marks the copy out of date | P-144 is M3, outside this slice (§0). Nothing records a validated copy today. | **Folded in as C-9 and C-10** (below), with P-144. |
| (c) IMM 5409 oath blank | Built: `engine/form-steps.ts oathBoxes` and `byAPerson` never write the oath block (place declared, administrator's name, title and signature, date: 10 boxes). `fill.ts` skips them. Checked by `check_forms_slice2b.ts` F6, pass and fail. | **No change.** C-11 keeps it as a release rule. |
| (d) Provincial nominee, Express Entry: IMM 5669 and IMM 5406 Online | No sample lines yet. The library holds IMM 5669 (05-2021) and IMM 5406 (05-2026) as PDFs. | **C-12** (below): an accepts record for the Express Entry account. |

* **C-9 Validate is the last step (P-144, P-171 b).** A barcode form on a PDF upload or Paper line is ready to file only with a current validated copy. That copy is the filled PDF after the person's Validate, read back into the case with the M3 tool `E1/tools/barcode_compare.py` (reused, not rebuilt). It records the file's checksum and the fingerprint of the form's facts at that moment. No current copy blocks "Ready to file", in words.
* **C-10 A change after Validate marks the copy out of date.** Any change to a fact the form fills (an answer, a person, or the form's field map version) changes the facts fingerprint. The copy then shows "Out of date: validate again". It is kept as history, never deleted. Pass test: an unchanged case stays current. Fail test: one changed answer makes it out of date and blocks Ready to file. An Online line needs no validated copy (the portal validates).
* **C-11 The oath stays blank (P-171 c).** Already enforced at fill time (F6). This slice adds a check that a release whose field map maps an oath box shows that box as "by a person", never filled. Pass and fail tests run on IMM 5409.
* **C-12 Express Entry lines (P-171 d).** Records for (IMM 5669, Express Entry account) and (IMM 5406, Express Entry account): channels {ONLINE}, `basis: founder P-171, Sample`. Research row 4 found no official statement, so there is no quote. A PDF upload or Paper line for them on an Express Entry combination is refused under C-3, with the reason. The PR Portal and paper records stay as they are (research row 3: a digital version in the PR Portal and a PDF "for paper applications").

**Where it lands:** C-9 and C-10 add one table `validated_copy` (case form, file checksum, facts fingerprint, read back by, at) to the §2 migration. It is case-level data, so the case filling files (`fill-case.ts`, runtime's) change too, with the Lead's word as for the S5 Forms tab (§5). C-12 goes into step 2 of §6. C-9 and C-10 become a new step 4a, after the Forms tab.

## 8. Questions for the Lead
1. **The account list.** *Recommend:* `contracts/forms.ts IRCC_ACCOUNTS` = APR Portal · IRCC Portal · PR Portal · none (paper filing), on the existing `Combination.portalKey`; a combination with no account set offers every channel (Sample) until one is chosen. *Else:* a new column.
2. **The old accepts column.** *Recommend:* migrated into the new table as "any account" rows and dropped in the same migration, all readers moved in step 2. *Else:* kept read-only for one release.
3. **The v1 saved finder runs.** *Recommend:* they keep replaying the form list, the channel from the keyword rule as Check, re-recorded live in the slice 6 trial (§4). *Else:* re-record now (about US$1.9, Sample), which needs a live run tonight; this plan does not do it.
4. **Other lanes' checks.** `check_screen01_*` (screens) and `check_s5_leadcheck.ts` (runtime) hold the old spelling. *Recommend:* this lane updates them in the same commit, and names them in the hand-back.
5. **P-145 against P-171 (d).** P-145 offers IRCC's own PDF, filled, as "Copy, not for filing" wherever IRCC publishes one, and IMM 5669 and IMM 5406 have such PDFs. P-171 (d) says "answer sheet, no PDF" for these lines. *Recommend:* on Express Entry lines the copy is the answer sheet only, so nobody mistakes the paper PDF for something to file. P-145 stays as it is everywhere else. *Else:* P-145 as written (IRCC's PDF copy here too).
6. **C-9 and C-10 in this slice.** They need case data (runtime's `fill-case.ts`) and the M3 read-back tool. *Recommend:* build them in this slice as step 4a, with the Lead's word for the runtime files. *Else:* keep them for M3 with P-144, and this slice only plans them.

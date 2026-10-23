# F1 — Forms channels · feasibility challenge (forms lane builder, 23 Oct)

Concept: `concept.md` (Lead, 23 Oct). Decisions read: P-61, P-62, P-63, P-57, P-32, P-33, P-26, P-60, `LANES.md`, `STANDARDS.md` §1.
What I checked: `prototype/studio/prisma/schema.prisma`, `api/src/intake.ts`, `sources.ts`, `ai.ts`, `fill.ts`, `engine/validate.ts`, `tools/read_form_identity.py`, `read_form.py`, `p5/transforms.ts`, `p2/ledger/spend.jsonl`, `official-sources/ircc/manifest.json`, `samples/programs.json`, the team's pack models and contracts (`code/ERv2-sanitized@22f1d12-2026-10-19`, read from the main copy).
Freshness: `ai-workers/tools/freshness.sh` cannot run in a lane copy (`code/` and `sources/` are not in the worktree). Team sources used are the newest captures (code 19 Oct, Drive 19 Oct); nothing newer exists.

## Verdict: Build after these changes

The model is right: shared fields are the root, PDF and online are two outputs of one form, reuse comes before AI. It is buildable on the current app without new technology. Five changes come first: one needs a founder ruling (point 1). The other four change the data model and the order of the work, not the idea.

## Objections (top 5, ranked)

### 1. Blocker: saved portal screens cannot pass the source check (P-57), and they may carry client data · *Needed for the proof*
* **What breaks.** P-57 holds every form source whose checksum is not on the approved official list. A saved portal screen can never be on that list: P-61 says there is no public link per online form; screens exist only inside a representative's logged-in account. So under P-57 as written every portal page is held forever. The alternative is to let it in unchecked, which breaks a founder rule silently.
* **It already happens today.** `read_form_identity.py` (`read_html`) treats any saved HTML page as a "guide" (or "checklist"). `intake.ts` holds only forms and checklists that are not on the list, so a saved portal screen is attached today as an unverified "guide" without any notice. *Fact, high confidence.*
* **Personal data.** A screen saved while a real case was being filled carries the client's answers (input values, ticked options) and the account's session tokens. Storing that in the configuration library would be a privacy defect. *Judgment, high confidence.*
* **Fix.** Two source routes, both deterministic:
  1. **IRCC public pages** (instructions, "what you need" help pages) go through the official list like PDFs (fetched, checksummed). This covers Express Entry.
  2. **Captured portal screen**: a new intake kind. The system refuses the page if any input has a value, a ticked choice or a non-default selection ("save a blank screen"), and it strips scripts and hidden tokens before storing. The record keeps the portal, capture date and who captured it. It is **held until a second person approves the capture** (approver ≠ uploader, P-15/P-53); only then may it be read, mapped or sent to AI.
  This amends P-57 for one source kind, so it is founder question 1.

### 2. Major: an online version cannot be identified by its file bytes, and it should not be a second pipeline · *Needed for the proof*
* **What breaks.** Identity today is the file's SHA-256. The same portal screen saved twice gives different bytes (timestamps, session tokens, script names). So "already in the library" never fires, and every re-save looks like a silently changed version. That would trigger P-61 §5's impact review on every upload. *Fact about saved pages, high confidence.*
* **The second issue.** The concept and P-62 describe the "online version" as a new master. Building it as a separate table would mean a second field-map table, a second drafting path, a second validator and a second "which form fields read this shared field" query, which is the duplication P-62 §1 rules out.
* **Fix.** An online version is a **`FormEdition` with `channel = ONLINE`**. Its form fields are `FormFieldMap` rows with screen, order and input id (the element id goes in `dataPath`). Its identity is a **content fingerprint**: a checksum of the normalised screen inventory (screen titles, labels, types, options, order), with the raw file checksum kept separately. Same form code + portal + fingerprint → "already in the library". A different fingerprint → held for impact review, like a new PDF edition (P-32).
* **Retrofit.** The team's `FormEdition` already holds a `parsedFieldInventory` and an `editionDate`, so the capture date fits there. The team needs one new column (`channel`). Their `FormFieldMapEntry` already uses `formFieldId`, which matches the P-63 wording.

### 3. Major: answer lists do not exist, so "every option mapped in every channel" cannot be checked · *Needed for the proof*
* **What breaks.** P-62 calls the answer list "extended", but the prototype has none. There is no list of allowed values on `CanonicalField` and no option map on `FormFieldMap`. Values become form codes only when the form is filled (`p5/transforms.ts` `codeFor`: by code, label, first word or alias tables, and `code_list:` text). The validator has nothing to compare against. The concept's own test case, a dropdown whose codes differ between the PDF and the portal, could not fail before filling. *Fact, high confidence.*
* **The team already has this.** `EnumSet` / `EnumSetValue`, `CanonicalField.enumSetId`, and an `ENUM` transform on each field-map entry: `map {valueKey → form code}` with `onMissing: REFUSE` (`packages/contracts/src/schemas/spine-masters.ts`).
* **Fix.** Add an **answer list** (mirroring `EnumSet`/`EnumSetValue`), `CanonicalField.answerListKey`, and `FormFieldMap.optionMap` in the team's ENUM-map shape. PDF option maps are drafted by code with the existing `codeFor` matcher (no AI); online maps use the same matcher first, then AI only for the leftovers; a person accepts. The filler uses `optionMap` when it is present, with today's `code_list` as the fallback.
* **Scope guard.** Only option fields used by the forms of combinations 3 and 6 get answer lists in F1. Other fields keep `code_list`, and the validator gives a warning ("not yet on an answer list"), not an error.

### 4. Major: portal and filing method belong to the filing, not to each line; one validator rule is missing; signature method is not needed · *channel: Needed for the proof · stored signature method: Not built*
* **Portal per line can contradict itself.** P-61 says "Online (with portal)" on each line. But one application goes through one portal (IRCC: Representative PR Portal *or* APR Portal), and in spousal sponsorship even the PDF uploads (IMM 1344, IMM 5532) happen inside the PR portal. Two Online lines on one combination naming different portals would be a nonsense setup the data allows. **Fix:** `portalKey` on the **Combination**. Each Online line uses the form's online version captured from that portal. The two-step Express Entry route stays correct, because each step is its own combination (P-24).
* **The derived filing method must handle conditional and per-person lines.** Example: combination 3 has some lines that apply only under a condition or only for some people (IMM 5406 and 5669 per adult family member). "Online + PDF" is only true when such a line applies. **Fix:** derive the label from the lines that always apply, and add the conditional ones as text ("Online · plus signed PDF when …"). It is never stored.
* **Missing validator rule.** Nothing in the concept stops a line marked Online for a form that has no online version, or a PDF line for a form with no PDF edition. Release would pass with nothing to fill. **Fix:** add "each line's channel has a matching version (a PDF edition, or an online version for the combination's portal)" to the validator checks. This closes a gap in the concept's own check list rather than adding scope.
* **Signature method.** In every case in P-61 it follows from the channel: Online → the client signs the declaration in the portal; Signed PDF upload → a hand signature on a printed copy; PDF upload → none in the file. **Fix:** derive it and show it; store nothing. If the immigration expert finds a case where channel and signature differ, add the column then. *Judgment, medium confidence.* The signed-scan document requirement in P-62 §3 is used by M3's Prepare application view, so it is derived there and *Not built* in F1.
* **Default channel without guessing.** A new line defaults to **Online** when the form has an online version for the combination's portal, otherwise to PDF upload. The rule is deterministic and needs no list of "what IRCC files online".

### 5. Major: the proof depends on things that do not exist yet, and three items touch the screens lane's files · *Needed for the proof (sequencing)*
* **No PDF twin to reuse for combination 3.** IMM 0008, 5669 and 5406 have no inventory and no field map. Only IMM 1344 has been drafted in Studio (and IMM 5257 and the combination 1 forms earlier). "Reuse the PDF twin's map first" therefore needs three paid drafts first. Measured: IMM 1344 cost **US$1.45** per live draft (worst case reserved US$1.92; 24 ledger lines, US$9.05 in total, mostly repeats before the repair). IMM 0008 is larger. **Estimate: US$5–9 for the three, worst case about US$12.** *Low confidence; the plan screen states the exact worst case before launch.* This is founder question 2.
* **No source at all for Express Entry.** The official list has no Express Entry file (`official-sources/ircc/manifest.json`, 37 items). IRCC's public Express Entry pages must be added to it before the online-only proof (route 1 in point 1).
* **The proof could prove nothing.** If we write the portal fixture ourselves from the PDF's own labels, twin reuse matches 100% by construction. **Fix:** label the fixture *Sample, Scaffolding (P-33)*. Write it from IRCC's public descriptions with deliberate differences: reworded labels, a three-part date, a dropdown with different codes, one added and one removed question. State that the real reuse rate is unknown until one blank screen captured from a real account is available (founder question 3).
* **The guarded AI path only admits PDF inventories.** It reads `p1/inventory/` for files on the official list (`read_form.py`, `p2/guard.ts`). Screen inventories of approved captures need a guarded admission of their own. That is a change to a safety file, so it gets its own test.
* **Lane collisions.**
  * Concept item 5 (words) and item 6 (Screen 01 hooks) edit pages the screens lane owns.
  * Screen 02's register line ("AI work, PDF and online sources") overlaps F1 item 3.
  * Screens 02–04 will also need `schema.prisma`.
  **Fix:** the ownership table and the slice order below.

## What is sound
* One form, two channels, shared field as root; a person-dropdown or three-part date is a field-map concern, not a new field. The executor already has `date:YYYY`, `date:MM`, `date:DD` (`p5/transforms.ts`), so three-part dates need no new engine.
* The intake already accepts saved web pages and refuses everything else (`intake.ts`). Python's built-in `html.parser` reads them: **no new technology**, so the `STANDARDS.md` §1 gate is not triggered.
* Reuse first, deterministic identity, AI only for leftovers, a person accepts: this matches P-62 §4 and the repaired guarded path (stub first, cost before the call, refused paid repeats).
* The "Not built" list is right: no portal login, no scraping, no unattended filling, and no portal sheet or extension in M2.
* Migrations can keep every existing record: each new column has a default that describes today's behaviour (PDF edition, PDF upload line).

## Data-model change list (against `prototype/studio/prisma/schema.prisma`)
One migration, `…_forms_channels`. Additive only; existing rows keep their meaning.

| Model | Change | Why / default |
|---|---|---|
| *new enum* `FilingChannel` | `PDF_UPLOAD · ONLINE · SIGNED_PDF_UPLOAD` | P-61 §2 |
| *new enum* `EditionChannel` | `PDF · ONLINE` | point 2 |
| `Combination` | + `portalKey String?` | point 4; portal list is a constant in `contracts/forms.ts` (Sample until the expert confirms; maps to the team's `ReferenceDataset`) |
| `CombinationForm` | + `channel FilingChannel @default(PDF_UPLOAD)` | existing lines stay PDF upload; signature method and filing method are derived, not stored |
| `FormEdition` | + `channel EditionChannel @default(PDF)`, `portalKey String?`, `capturedOn Date?`, `recheckBy Date?`, `contentSha256 String?` | online version = edition with channel ONLINE; identity by content fingerprint; `recheckBy` feeds the validator. The new-edition comparison splits by channel (PDF: printed edition; online: fingerprint + capture date). `editionLabel` stays unique, e.g. "IMM 0008 online · Representative PR Portal · 2026-10-23" |
| `FormFieldMap` | + `screenKey String?`, `screenOrder Int?`, `inputOrder Int?`, `optionMap Json?` | online form fields in portal order (`dataPath` = element id, `caption` = label); `optionMap` uses the team's ENUM map shape `{valueKey: code}` |
| *new* `AnswerList`, `AnswerListValue` | key, version, status, origin; values `valueKey`, `label`, `sortOrder` | mirrors the team's `EnumSet`/`EnumSetValue` |
| `CanonicalField` | + `answerListKey String?` | team: `enumSetId` |
| `IntakeItem` | kind adds `portal_page`; + `portalKey String?`, `captureApprovedBy String?`, `captureApprovedAt DateTime?` | point 1 route 2 |
| `SourceAttachment` | kind `PortalPage`; reuse `approval` for "captured, approved by …" | no new column |
| Not stored | signature method, filing method, portal table, the case's application number and UCI | derived, or M3 (P-61 §6) |
| Not renamed | `dataBoundBoxes`, `NormalizationItem.boxes`, code identifiers such as `BoxRow` | P-63 is about screen and document words. Renaming columns is churn with no value for the proof; the team already says `formFieldId`. Recorded in build notes |

## File ownership (forms lane vs screens lane)
| Forms lane writes | Screens lane writes | Shared: one-line hook by the forms lane, declared in the block |
|---|---|---|
| `prisma/schema.prisma` and the new migration (for F1; screens lane schema needs go through the Lead until F1's data slice is merged) | all of `web/src/**` | `engine/validate.ts`: one call to `channelProblems()` |
| `api/src/intake.ts`, `sources.ts`, `ai.ts`, `fill.ts`; new `api/src/forms.ts` (channel, portal, capture approval endpoints) | `api/src/programs.ts`, `studio.ts`, `demo.ts` | `engine/snapshot.ts`: channel, portal and online versions added to the snapshot |
| `engine/import.ts`, `normalize.ts`, `ai-run.ts`, `render.ts` (field-map rows); new `engine/channels.ts` (derived filing method, validator rules), `engine/twin.ts` (PDF-twin matching), `engine/options.ts` (option maps) | `engine/programs.ts`, `contracts/programs.ts` | `api/src/main.ts`: register the forms controller |
| `tools/read_form_identity.py`, `read_form.py`; new `tools/read_portal_page.py` | its tests (`check_screen01_*`, `check_studio_browser.cjs`), including updating "box" wording in its own assertions | |
| `p2/` (guard admission for approved screen inventories, drafting jobs); `p5/` stays unchanged (the evidence lane relies on it) | Screen 02 page (`ai.tsx`, `job.tsx`, `review.tsx`, `sources.tsx`) and its concept: **page only**; backend needs → request to the forms lane via the Lead | |
| new `contracts/forms.ts`; `tests/check_forms_channels.ts`; `tests/fixtures/portal/*.html` (Sample) | | |
| **After Screen 01 is DONE and merged, with a file grant from the Lead:** `web/src/pages/combination.tsx`, `programs.tsx`, `library-forms.tsx`, `components/forms.tsx` for concept item 6 (Screen 01 hooks) and the P-63 word swap on those pages | | |

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule (deterministic unless said) | Tests (pass + fail) |
|---|---|---|---|---|
| Portal of a filing | `Combination.portalKey`; list in `contracts/forms.ts` | `GET /api/portals`, `PATCH /api/combinations/:id/portal` | Online line needs a portal on its combination | portal set → OK · Online line without portal → error |
| Captured portal screen | `IntakeItem(kind portal_page)`, `SourceAttachment(PortalPage)` | existing `POST /api/intake`; `POST /api/intake/:id/approve-capture` | blank page only; scripts and tokens stripped; held until approver ≠ uploader | blank page → held · filled page → refused · uploader approves → refused · second person → approved |
| Online version | `FormEdition(channel ONLINE)` + screen inventory file | created on approval | same code + portal + fingerprint → in library; different fingerprint → held for impact review | re-saved identical screen (different bytes) → "already in the library" · reworded label → held |
| Screen map drafting | `FormFieldMap` rows with screen, order and input; `DraftingJob(kind screen_map)` | existing plan/launch/decide/apply with a new job kind | PDF twin first (normalised label + type + option set, no AI); only leftovers go to the guarded AI; a person accepts | twin covers N inputs with 0 AI calls · only leftovers are in the AI request · three-part date → one shared field with `date:YYYY/MM/DD` |
| Answer lists and option maps | `AnswerList`, `AnswerListValue`, `CanonicalField.answerListKey`, `FormFieldMap.optionMap` | inside drafting and decide; read via the library | PDF options by code (`codeFor`); online options the same, AI for leftovers; the filler uses `optionMap` first | portal codes ≠ PDF codes, both fill the same value · one unmapped option → validator error |
| Channel per form line | `CombinationForm.channel` | `PATCH /api/combinations/:id/forms/:lineId/channel` | default Online if an online version exists for the portal, else PDF upload; filing method and signature method derived | mixed combination 3 → "Online + signed PDF uploads" · conditional PDF line shown as "when …" |
| Validator (no AI) | `engine/channels.ts`, run at review and release | existing review/release | every form field and online input mapped or "not a fact"; every option mapped in each channel; online version within `recheckBy`; every line's channel has a matching version | one pass and one fail per rule |
| Words (P-63) | none | message text in forms-lane files | "box" → "form field", "box map" → "field map" | no "box" in forms-lane API messages (grep test) |

**Slices.** Each is committed; app runs use ports 4450–4459 and databases named `forms_*`, never :4400.
1. **Data, intake and validator, no AI, no UI.** Migration (checked against a copy of today's data: row counts unchanged); portal page reader; capture route with blank check and second-person approval; fingerprint identity; channel API; derived filing method; validator rules; one answer list end to end. Twin reuse is proven on **IMM 5257**, whose saved live draft (`p2/runs/studio-fieldmap-imm5257e-live-20261021t060247723z.json`) is replayed at US$0, with a Sample portal fixture. If that answer fails today's checks, the slice says so and does not pay for a new draft.
2. **Drafting leftovers, then combinations 3 and 6.** Guarded admission for screen inventories; `screen_map` job; combination 3 mixed proof once IMM 0008/5669/5406 have PDF maps (paid, founder question 2); combination 6 online-only proof once IRCC's Express Entry pages are on the official list.
3. **Screen 01 hooks and words**, after Screen 01 is DONE and merged, with the file grant above.

## Questions for the founder (recommendation first)
1. **Captured portal screens and P-57.** *Recommend:* a blank screen saved from a portal counts as verified once a second person approves it (the system refuses screens with answers in them); IRCC's public pages keep the official-list check. *Alternative:* captured screens are never used, and online-only forms draft from IRCC's public pages alone (weaker: the portal's real labels, order and codes stay unknown until the extension's capture, M3).
2. **AI spend for the PDF twins of IMM 0008, 5669 and 5406** (needed before combination 3's online versions can reuse them). *Recommend:* approve up to **US$12 worst case** for one live draft each, after the A4 change (reuse first, split by section) is in; saved answers are reused at US$0 afterwards. *Alternative:* prove the mixed case on combination 3's PDF-only lines plus IMM 5257's twin, and defer online IMM 0008 (weaker demo).
3. **One real blank portal screen.** *Recommend:* ask the immigration expert for one blank saved IMM 0008 screen from the Representative PR Portal (no client data), so the reuse rate is measured, not invented. Until then the fixture is labelled Sample and the demo does not claim a reuse rate.

## Lead response
(Lead, 23 Oct. All five accepted; they improve the design. P-65, adopted after this challenge began, adds two data items, below.)
1. **Accepted.** Two source routes: IRCC public pages through the official list; captured portal screens as a new intake kind. **Stricter than P-65 and adopted:** refuse any page with a value, a tick or a non-default choice (instead of stripping values), strip scripts and hidden tokens, keep portal, capture date and capturer, hold until a second person approves. Amending P-57 for this kind is founder question 1.
2. **Accepted.** An online version is a `FormEdition` with channel ONLINE, identified by a content fingerprint of the normalised screen inventory, raw checksum kept beside it; no second pipeline. P-62 §3 amended ("online version" is an edition, not a new master).
3. **Accepted**, with your scope guard (answer lists only for option fields used by combinations 3 and 6; others warn). Mirror the team's `EnumSet`/`EnumSetValue` and ENUM map.
4. **Accepted all four parts:** portal on the combination (P-61 §2 amended), filing method derived with conditional lines as text, the new validator rule "each line's channel has a matching version", signature method derived and not stored. Signed-PDF states and stale marking (P-65) are M3.
5. **Accepted.** Slice 1 proves twin reuse on the saved IMM 5257 draft at US$0; the portal fixture is labelled Sample and Scaffolding (P-33), written from IRCC's public descriptions with deliberate differences, and the demo claims no reuse rate until a real blank screen exists; guarded admission of screen inventories gets its own test. **Lead task:** add IRCC's public Express Entry pages to the official list before slice 2.
**Ownership table and slice order: agreed** as written; `schema.prisma` belongs to this lane during F1 (screens-lane schema needs go through the Lead); slice 3 waits for Screen 01 DONE and a file grant.
**Not renaming code identifiers: agreed** (P-63 is about words people read).
**Added to slice 1 (P-65):** `CanonicalField.aliases` (labels seen on forms) and `mergedIntoKey` (a merged-away id redirects; released versions untouched); matching tries form path, then name and aliases, before AI. Fix `check_ai_drafting.ts` to select the four refused IMM 1344 runs by name.
**Added to slice 2:** the A4 backend (reuse first, split by section groups, per-part progress, merge flags near-duplicates) before the paid IMM 0008/5669/5406 drafts, so they are cheaper and faster.

## Agreement
Agreed 23 Oct (Lead), slices 1–3 as amended above. Slice 1 starts once founder question 1 is answered.

## Build discoveries
- 23 Oct, slice 1 (details in `build-notes.md`): the capture is its own record (`PortalCapture`), not intake columns, because P-66 made it multi-screen with "finish"; unresolved PDF form fields stay a by-hand case (making them an error would block Screen 01's releases: Lead decision); `concept.md` still says "values stripped" and "hold rules as PDFs" where the agreed response says refused and second-person approval. Lane copies: guarded AI stub cannot load (double link), pages 404 (hidden folder; fixed), shared database client (cloned here).

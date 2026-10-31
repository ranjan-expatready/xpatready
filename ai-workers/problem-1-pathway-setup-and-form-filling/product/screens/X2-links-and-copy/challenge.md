# X2 Links between combinations and copying a line: challenge

A fresh challenger checked `concept-draft.md` and `design/draft-x2-board.html` (31 Oct 2026). I opened the board in Chromium at 1280 px and 390 px, all seven states. I read: Screen 03 `concept.md` and `challenge.md`; `PRODUCT.md`, `STANDARDS.md` §2–§6, `EXPERIENCE.md`; `DECISIONS.md` and `decisions/`, `history/DECISIONS-superseded.md`; `domain/TAXONOMY.md` §2–4; `qa/CAPABILITIES.md` (C1.3, C1.5, C11.5); the immigration-structure skill; and the app code (`prisma/schema.prisma`, `api/src/studio.ts`, `programs.ts`, `form-library.ts`, `fact-sources.ts`, `engine/coverage.ts`, `engine/programs.ts`, `samples/programs.json`, `web/src/pages/workspace/overview.tsx`).

**Not checked:**
* The team's code capture (`code/`) and the requirements snapshot (`sources/`) are not in this cloud copy. `ai-workers/tools/freshness.sh` fails on the missing `code/README-copies.md`. SA-1B-54, 61 and 65–70 are cited from our own trace (`history/TRACE-SA01B-2026-10-23.md`) and are **Unverified** against the newest snapshot.
* There is no retrofit comparison with the team's link or bulk-change model. The tech lead does that on the Mac.

## Verdict

* **X2a Links: Rethink.** It rests on a decision the founder replaced. P-59, "links are configuration", was superseded on 26 Oct by P-106, "the link lives on the case". The app's own code and wording already follow P-106.
* **X2b Copy a line / add or remove across many: Build after these changes.** These are M3 to M6 below.

## Objections

### Blocker

**B1 · X2a contradicts P-106. The concept cites a superseded decision and does not mention the conflict.** *Needed for the proof (it decides whether X2a exists at all).*
* **Fact (confidence high):**
  * `history/DECISIONS-superseded.md` line 3 says P-59 is "Superseded by P-106 (26 Oct): no links in configuration; the link lives on the case." P-59 said "links between combinations are configuration (M2)".
  * `DECISIONS.md` P-106: "'Linked to' leaves New combination and configuration. On a worker's case the agent may pick 'relies on employer case …'… the case-level link is built with the case officer step. Amends P-13." The P-13 row now carries the note "(26 Oct, P-106: 'supports/follows' links leave configuration; the link lives on the case.)"
  * `qa/CAPABILITIES.md` C11.5 (M3): "no 'Linked to' in configuration… case link to an employer case pre-fills employer facts".
  * `engine/coverage.ts` line 4: "Carried by a linked case comes later (P-106, the case link)."
  * The Corporate callout on Immigration programs tells users today: "On the worker's case the case officer picks 'relies on employer case'". Sources: `qa/reports/2026-10-29-after-merge-deda0e6/wording/programs-corporate-1440.txt` and `web/src/pages/programs.tsx`.
  * The concept cites P-59 (§2, "Record" row) and Screen 03's BR-12. The Lead agreed Screen 03 on 25 Oct, the day before P-106.
* **What breaks:** building X2a puts back what the founder took out, and contradicts screen copy that is already live. That is a silent deviation, against AGENTS.md rule 2 ("a conflict… goes to the founder; do not settle it silently").
* **Other stale records:** C1.3 ("Author links combinations…", M2), `PRODUCT.md` line 47 ("↔ Supported by · Follows… (P-13)") and BACKLOG F1 ("link and copy lines between combinations") were not updated after P-106. Those are the records X2 relied on.
* **Fix:**
  1. Put the conflict to the founder as **Q1** below, replacing the current three questions' order.
  2. Until the founder answers, do not build X2a. Ship X2b alone. It does not depend on links.
  3. The tech lead corrects C1.3, PRODUCT §words and F1 to match whatever the founder decides.

### Major

**M1 · "Follows" carrying a named-fact picker does not fit the immigration model, and the Q1 recommendation points the wrong way.** *Needed for the proof if any Follows survives B1.*
* **Fact:**
  * TAXONOMY §3: a multi-step journey is "separate categories joined by a **'follows' suggestion**, worked as one case with filings in sequence… Answers carry forward". Case 20: "profile facts reused".
  * The person is the same, and the facts are the same shared library fields (STANDARDS §3.3 "defined once"). A per-link list of facts to carry adds nothing that the shared fields do not already give.
  * Our research note (`research_notes/Agent view and filing UX/ircc_filing_units.md` §3) describes Follows as a suggestion with a **trigger**: approved, invitation received, or AOR received. It does not describe Follows as a carrier of facts.
* **Example:** a study permit is followed by a post-graduation work permit. Identity, passport and address are the same person's answers. The PGWP's own facts (programme completion, final transcript) are new and were never asked in the study permit. Nothing needs to be picked.
* **Fix:** if Follows stays in configuration, make it a suggestion only: target, optional trigger, no fact or document lists. Recommend this in the founder question instead of "carries facts too".

**M2 · "A fact carried by a link counts as asked" (the coverage rule, Screen 03 BR-7) contradicts the concept's own fallback, "with no linked case they are asked as usual".** *Needed for the proof.*
* **Fact:**
  * The link is optional on a case. Screen 03 Q1, and this concept's facts tip and Links card note, say: "With no linked case they are asked as usual."
  * A fact can only be "asked as usual" if a selected library section asks it, or the case officer fills it. `engine/coverage.ts` `coverageGaps()` counts exactly those two (plus documents).
  * If a carried fact counts as covered, a combination can be released where the fact is asked nowhere. A worker's case opened without an employer case then has a blank LMIA number on IMM 1295, and nothing asks for it. That breaks STANDARDS §3.6 ("no hidden field a form… needs").
* **Fix:**
  * Carrying never replaces coverage. The fact must still be asked or officer-filled, and the link only pre-fills it ("please confirm", P-72).
  * Drop the "validator learns…" row from §2 and the BR-7 claim.
  * If the founder keeps configuration links, model "carried" as a value of the per-combination fact source that already exists (`FactSource.source`, DOCUMENT · CLIENT · AGENT, plus a new LINKED_CASE). This is one source per role and fact, with a fallback. It is not a second list on a link record.

**M3 · Integrity across combinations is not specified: retire, rename, removed facts, roles, release ordering.** *Needed for the proof if X2a is built.*
* **Retire:**
  * Nothing stops retiring the target combination while live links point to it.
  * The app's retire guard (`api/src/lifecycle.ts` lines 57–87) checks names and combinations below a node, not incoming links.
  * STANDARDS §3.5 says "every master shows where it is used; referenced items are retired, never deleted", and P-52 L3 says "retire is blocked while the item is in use".
  * *Fix:* the target's Overview lists "Linked from" (read-only). A retire of the target is refused, or warns and names each linking combination; pick one and write it as BR-L6. A link to a retired target becomes a release problem on the source.
* **Rename:**
  * The contract shape stores `target: { id, trail[] }`. If `trail` is frozen in the snapshot, a rename later shows the old trail.
  * *Fix:* store the target id only and resolve the trail when it is read. A released snapshot may keep the trail it had at release, as history.
* **A carried fact removed from the target later:**
  * BR-L3 is checked only when the link is saved. Later the target drops "LMIA number" and is released. The source's link still names it, and nothing tells either author.
  * The board's "Wage offered is not asked…" error can only appear in this stale situation, because the tick list is "filled from the other combination".
  * *Fix:* run L3 again in `validate()` of the source on every submit and approve: an error naming the fact and the fix. Show a warning on the target ("2 links from other combinations carry LMIA number") before its release.
  * With M2's fix, runtime stays safe anyway, because the fact is still asked.
* **Roles:**
  * `facts: string[]` has no person role. LMIA facts are about the application or employer (coverage's `about === "case"`). On the worker's forms the same fields are about the principal.
  * *Fix:* each carried fact is `{ fact, toRole }`, and is refused when `toRole` is not a role of the source (`Combination.participants`).
* **Release ordering (BR-L5):**
  * The app has two release paths. One is a per-combination Approve: `studio.ts` `approve()`, a pack of one. The other is the shared pack release: `releaseRows()`, P-23 "one release for everything". In the pack path, source and target can be released together in one transaction.
  * *Fix:* write BR-L5 as "the target has a release, **or is in the same release**". Test both paths.
* **Snapshot and publish:**
  * `publishRow()` publishes a fixed list of row tables. It then refuses the whole release if the published snapshot differs from the reviewed one ("was changed while it was being released").
  * A link row in the snapshot that is not added to that list fails every release.
  * *Fix:* say so in the back-end plan (below). Use the versioned line shape (`lineageKey`, `version`, `status`, `supersedesId`), as the Screen 03 challenge §35 proposed.

**M4 · BR-C1's four outcomes are incomplete for real lines. Copying a line can also create invalid configuration silently.** *Needed for the proof.*
* **Fact:** a form line carries more than the form: `who`, `predicateJson`/`conditionPlain` ("only if"), `channel`, `signature` (must fit the channel, C-2), `minAge`, `signedBy`. That is `prisma/schema.prisma` CombinationForm. Rules are per combination (`Predicate.combinationId`, P-12).
* **Missing outcomes:**
  1. **The person is not in this application.** The line is for "Spouse or partner" and the target's participants have no spouse.
  2. **The "only if" uses a fact this combination does not ask.** This is a coverage gap, or a rule that can never be true (STANDARDS §3.6).
  3. **The form is retired, or its retire is open, in the library.** `form-library.ts` already refuses this for attach and Undo.
  4. **The combination is waiting for review.** Any edit changes the draft hash, so `releaseGate` then fails as "changed since submitted". The bulk add would silently cancel someone's submission.
  5. **Remove-across-many has its own outcomes:** "will be removed", "does not have it", "has it with a different only-if (removed or kept?)", and "removal waits for the next release".
* **Fix:**
  * List these outcomes in BR-C1 and give each a test.
  * Default: skip the target and say why. For case 4, say "waiting for review: adding withdraws the submission" and leave that target unticked.
  * Write the copy rule: who, copies, age and signer are copied. Channel is kept only if the target's account accepts it, otherwise "cannot". Only-if is copied only when every fact it uses is asked in the target.

**M5 · Undo in BR-C2 promises more than the app's lifecycle provides. The atomicity and idempotency of the bulk write are unspecified.** *Needed for the proof.*
* **Fact:**
  * Today Undo on forms reverses **only the last change** on that combination. It is refused with "Changed since" if anything touched those lines afterwards, and refused once released (`form-library.ts` `undoNow`, lines 298–330).
  * "Undo is there until that draft is submitted" (BR-C2, board text) is therefore false as soon as anyone edits the target again.
  * The toast "with Undo" does not say whether it undoes all targets or one.
  * Screen 03's contract has `idempotencyKey` on `POST /lines/bulk`. The concept drops it.
* **Fix:**
  * BR-C2 should read: "one bulk change writes one `FormLineAction` (or document equivalent) per target, sharing a `batchId`, in one transaction. All targets or none."
  * The toast Undo reverses the whole batch while every target's last change is still that batch. Otherwise it names the targets that cannot be undone, and leaves them.
  * Each combination's own Undo reverses its part.
  * `idempotencyKey`: a replayed key does nothing.
  * This reuses the `FactSource.batchId` bulk-undo pattern already in `fact-sources.ts` (`…/bulk/undo`).

**M6 · Founder questions: the first one is missing, and two recommendations need changing.**
* **Missing:** the decisive question, whether configuration links exist at all after P-106 (B1).
* **Q1 (Follows carries facts):** the recommendation contradicts TAXONOMY §3 (M1).
* **Q2 (link to an unreleased target):** reasonable, but it must account for the shared pack release (M3).
* **Q3 (form and document lines first):** sound.
* *Fix:* the three questions below.

### Minor

* **m1 · `linkLabel` has more than "one use".** *Not built.*
  * The sample has six labels (`samples/programs.json` lines 142, 197, 231, 397, 406, 417). "Step 1 of 2 · followed by…" drives the sort order (`engine/programs.ts` `comparePaths`/`stepOf`). The label also feeds the catalogue note line (`api/src/programs.ts` lines 149 and 151).
  * *Fix:* say that `linkLabel` stays for route steps. Whatever replaces "Supported by / Follows" labels touches only those four.
* **m2 · Cardinality: one link to one combination is too narrow for "Supported by".** *Needed for the proof if X2a is built.*
  * The sample's LMIA program has four categories: high wage, low wage, Global Talent, caregiver (`samples/programs.json` lines 465–506). A worker "With an LMIA" can rest on any of them, which would mean four links, each with its own picker.
  * This is one more reason a case-level pick (P-106) fits better.
  * If the founder keeps configuration links, allow a target to be a program node ("any LMIA combination").
* **m3 · BR-L2 covers only Follows loops.**
  * A↔B "Supported by" both ways, and two links between the same pair, are not refused.
  * *Fix:* unique (from, kind, to). Supported-by refuses a reverse pair. Tests for each.
* **m4 · Board, prevent errors (EXPERIENCE rule 8).**
  * The self-link error is shown after picking the combination itself. Leave it out of the picker instead, and keep the server check.
* **m5 · Board, approver view.**
  * The approver view shows the link with no draft pill and no before/after, while the header says "1 draft change".
  * The approver approves on Review and release (EXPERIENCE "Change set": before/after, grouped). Show the link there as a change row.
* **m6 · Board mechanics.**
  * The 560 px panel (z-index 10) covers the board's state bar (z-index 5), so states cannot be switched while it is open. Playwright click was intercepted.
  * The panel has no `role="dialog"`, `aria-modal` or Esc.
  * At 390 px the page scrolls sideways (`scrollWidth` 535).
  * The bulk table sits on the Overview tab, although it is opened from a Forms line's ⋯ menu.
* **m7 · Board, Sample immigration content.**
  * "Cannot: IRCC does not accept a PDF upload of IMM 5476 through this combination's account" states an IRCC fact without a source. Rule 4: label it Sample, or take the outcome from the app's channel data.
  * "Wage offered is not asked in Labour Market Impact Assessment" is implausible: an LMIA application states the wage. Use a fact an LMIA truly lacks.
  * Trails ("Visitor visa › Single entry", "Study permits › Student", "Labour market impact assessments › Labour Market Impact Assessment") do not match the sample's structure ("Corporate and employers › Temporary residence › LMIA › High-wage position").
  * Copying IMM 5476 "always" is a questionable default: the form applies when a representative is used. Copy the source line's only-if.
* **m8 · Text and contract gaps.**
  * The concept says "Add to 3 combinations"; the board says "Add to 2".
  * "Copy a line from another combination" (layout) has no endpoint in §2. Screen 03 has `POST /combinations/:id/lines/copy`.
  * Link edits must write an audit event tied to the combination. `draftAuthors` finds authors that way, which is how author ≠ approver holds (BR-L4).
* **m9 · Scaffolding (P-33).**
  * "The sample's two links… loaded with the sample" stand in for authoring. P-108 says Load sample adds structure only.
  * If links exist, the demo creates them through the panel. Or the sample loads them as replayed proposals that a person accepts.

## What is sound

* The split into two slices of about a day each, with X2b independent of X2a.
* X2b's dry run before anything is written, one draft change per target, retired combinations never targets, and form and document lines first. These are proven patterns (EXPERIENCE "bulk accept with side-by-side review") and match SA-1B-61 (Unverified, see the opening note).
* The "please confirm" pre-fill (P-65, P-72), and asking as usual with no linked case. This is right, and it is exactly why M2 holds.
* A pass and a fail test per rule, the 409 conflict state, long trails that wrap, and 390 px and axe in the tests.
* The "Supported by" example (the employer's LMIA for an employer-specific work permit, an offer of employment for LMIA-exempt) is a correct reading of how IRCC work permits rest on the employer's side (TAXONOMY cases 4, 7, 18). The concept says plainly that the team's code was not checked.

## Back-end plan (if the founder keeps configuration links; otherwise X2b only)

| Element | Record | API | Rule | Test (pass / fail) |
|---|---|---|---|---|
| Link | `CombinationLink` (combinationId, lineageKey, kind, targetId, version, status `DefinitionStatus`, supersedesId, updatedBy); unique (combinationId, kind, targetId) per live version; FK to target, `onDelete: Restrict` | `GET/POST /combinations/:id/links`, `PATCH/DELETE …/:linkId` {version} → 409 when stale | L1, L2 (any loop), m3 | saved / self, loop and duplicate refused on the field |
| Carried fact | `FactSource.source = LINKED_CASE` + fallback, or link facts `{fact, toRole}` | as above | L3 at save **and** in `validate()`; never counts as coverage (M2) | carried + asked → releasable / carried only → release blocked naming the fact |
| Release | link rows in `buildSnapshot` and in `publishRow`'s publish list; audit event per edit | existing submit, approve, pack release | L4; L5 "released or in the same release" | both release paths; the author cannot approve |
| Where used | derived "Linked from" on the target | in `GET …/workspace?tab=overview` | L6 retire guard | retire refused or warned, naming the sources |
| Bulk | one `FormLineAction` (and document equivalent) per target, shared `batchId`, one transaction | `POST /lines/bulk/preview`, `POST /lines/bulk` {idempotencyKey}, `POST /lines/bulk/undo/:batch`, `POST /combinations/:id/lines/copy` | C1 (with M4's outcomes), C2 | each outcome; replay does nothing; batch Undo refused when a target changed since |

## Questions for the founder (at most three, recommendation first)

1. **P-106 moved "Supported by / Follows" links out of configuration and onto the case. Should X2 still build links in configuration?**
   * *Recommend:* **no.** Keep P-106. C1.3 becomes the case-level "relies on employer case" link, built in M3 with the case officer step. It pre-fills the employer's confirmed facts by shared field and marks them "please confirm".
   * X2 ships X2b (copying lines) only. The tech lead corrects C1.3, PRODUCT and F1.
   * *Alternative:* amend P-106 so that configuration declares which combinations may support or follow this one. The case officer then gets a suggestion, at the cost of re-opening a decision taken five days ago.
   * *Scenario:* a worker's case is opened before the employer's LMIA case exists. With a case-level link the officer links it later and nothing in setup changes. With configuration links the combination must also be re-released whenever the LMIA side changes.
2. **If Follows stays anywhere, is it a suggestion only, or does it carry chosen facts?**
   * *Recommend:* a suggestion only, with an optional trigger (approved, invitation received, AOR received). The facts carry through the person's shared answers (TAXONOMY §3).
   * *Alternative:* a named-fact picker, as the draft has it.
3. **Copy across many (X2b), first slice: which lines?**
   * *Recommend:* form lines and document lines only, with M4's outcomes. Rules and questions come later.
   * *Alternative:* everything at once.

## Lead response

## Agreement

## Build discoveries

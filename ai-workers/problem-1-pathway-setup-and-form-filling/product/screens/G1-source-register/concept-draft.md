# G1 Release refused: no source entry (C5.4): concept draft (helper drafter, 2 Nov 2026)

Status: **draft for the tech lead** (skill screen-concept part A, steps 1–7). It is not `concept.md`. It is built on the data and engine design the tech lead agreed on PR #469 (2 Nov). Nothing here redesigns that design; points it leaves open are marked **Rec.** (recommendation) or **⚠** (a decision is missing or two decisions conflict).
Row (BACKLOG, M2 additions): "a release with a number lacking a source entry or 'None published – set by ExpatReady' is refused, naming each item; API and screen tests" (P-240; SA-1B-290, SA-1B-193). Boards: `design/draft-g1-review-refusal.html`, `design/draft-g1-source-panel.html`.

## 1. Job and journey
**Job:** before a release, the configuration author gives every published number its official source, or states that the government publishes nothing and ExpatReady set it, and the release is refused until each one has an answer. **Persona:** the configuration author (author duty) writes the answers; the immigration expert signs; the approver (never the author) releases. **Journey:** J5 setup, step "Review and release", in the Change set pattern. **SA-01B v2.1:** SA-1B-290 (register), SA-1B-39 rule 7 (missing source blocks publishing; its wording), SA-1B-193 rule 1 and §12, SA-1B-294 rules 1 and 6 (which numbers; "None published" is confirmed like any other). **Decisions:** P-240 (both gates; Sample is demo only; amends P-170 and C5.1), P-252 step 3 ("set by ExpatReady" plus a reason; held with its rows under P-251), P-170 (page, quote, date), P-26, P-33.

## 2. Ten layers (what exists, team, new)
- **Masters.** New: `source_entry`, the agreed table (PR 1, additive migration). Already in the app: (a) the fee lines in `samples/fee-table.json` each carry page, https URL, quote and date read, and CI enforces this (`tests/check_r2_fee_table.ts:31`). (b) `check_def.source_quote` and `predicate.source_quote` hold a quote with no URL or date, one per item, not per number. (c) Document validity checks hold `cite {page, url, read}` with no quote (`engine/runtime/case-checklist.ts:31`). (d) `check_def.illustrative` is the Sample flag that G3 reads (`engine/validate.ts:262 isDemoSnapshot`). (e) `approved_source` holds official files with their IRCC page.
- **Team code.** `code/` is not in this cloud copy, so the team's code is **Unverified** here. SA-01B v2.1 SA-1B-290 §2 says the team's `pack-authoring` has no source list (code searched 24 Oct). Nothing to retrofit. Mapping for later: `source_entry.citation_url` maps to the team's `ContentSource.url`, and a none-published entry maps to the register's "None published – set by ExpatReady" entry.
- **Links.** An entry points to a number by (kind, item key, value path). There is no foreign key, because items are versioned rows. The check runs at submit and release.
- **Configuration.** None.
- **Rules.** BR-1 to BR-10 below.
- **Engine.** A new pure `engine/source-register.ts`: `publishedNumbers(snapshot, feeLines)` returns `{kind, key, path, value, words}`, and `sourceProblems(numbers, entries)` returns the problems. `validate()` takes the entries as an argument, so the engine does no I/O (STANDARDS §4).
- **Contract.** `contracts/sources.ts` (zod).
- **Screen.** Review and release refusal block with Fix; one Source panel; a Source block in the rule dialog; the Release page's held reason.
- **AI assist.** None. AI filling the source when it drafts an item (SA-1B-291) is Not built.
- **Governance.** Entries are frozen in the release snapshot, and a change to one goes to the expert (BR-7). Audit "source entry added / changed" (SA-1B-290 §9).

## 3. Business rules
- **BR-1 Which numbers** (agreed scope; SA-1B-294 rule 1). In scope:
  - every numeric literal in a released rule's condition (`predicate.predicate_json`) and a check's condition (`check_def.predicate_json`, document validity months included);
  - **Rec.** the conditions of eligibility gates (`snapshot.eligibility`, kind `rule`): they are released rules with thresholds;
  - **Rec.** a form line's "From age" (`min_age`, kind `threshold`), plus the biometrics exemption ages on the fee table;
  - the fee lines the combination uses (`fee-table.json` `combinations[key].lines`: `per_person_cad`, `family_max.cad`, `family_max.from_people`, exemption ages; kind `fee`).

  Out: form box limits, UI numbers, versions, positions and a form line's copies (not in the agreed scope). **Rec.** Also out: the literal `0` in a comparison, which means "already passed" or "same day" (for example `passport_days_until_expiry lt 0`), not a published value. On the imported work-permit release this keeps 15 numbers on 14 items (18 ×3, 90 ×5, 30 ×4, 5 ×2, 1 ×1) out of 42 literals. The tech lead confirms these Rec. edges.
- **BR-2 One answer per number:** unique (workspace, kind, item_key, value_path). **Rec.** `item_key` = `<combination key>/<rule or check key>` because rule keys repeat across combinations (`R-01`, `engine/import.ts:104`). A gate is `<combination key>/gate:<key>` and a form line is `<combination key>/<form>`. A fee is the fee line's key.
- **BR-3 Cited or None published, never both** (agreed constraint). Cited needs an https URL ("Use an https address.", SA-1B-290), a quote of at most 300 characters (SA-1B-39 rule 2), a date read of today or earlier (rule 4) and an optional page note of at most 200 characters. **⚠ None published needs a reason** (P-252 (3)), but the agreed table has no reason column. **Rec.** Add `none_published_reason text`, required when `none_published` (Q3).
- **BR-4 Fee lines count as entries; no `source_entry` rows for them (Rec.).** The line, or its `exempt` block, already carries page, URL, quote and date, and CI refuses a line without them. Copying them into rows would make two records of one fact. R2 part 2 (S7a) moves fees into a stored table that is frozen with each release, and the source moves with it. The adapter reads them into the same list, read-only, "From the fee table". Three fee quotes are summaries, not IRCC's words (biometrics, spouse_dependent_child, pr_adult): G1 counts them, because G1 checks that a source is there. Whether a quote proves its value is the expert's per-number confirmation (SA-1B-294, Not built). The tech lead may swap in IRCC's words as an R2 data edit.
- **BR-5 Stale (Rec., Q2):** if the entry's `value` ≠ the number now at its path, the number counts as having no entry. It is named "the source was written for 90; the number is now 60". "Still correct for 60" re-saves the entry with today's date, after the author looks at the quote.
- **BR-6 Refused, naming each.** `problems()` (`api/src/studio.ts:379`) adds one error per number with no valid entry. `where` is the item's own place (Rules, Checks, Forms, Eligibility, Fees), so the setup checklist's `WHERE_STEP` routes it. Submit (`:847`), Approve (`:889`) and the shared release (`releaseRows`, `:941`) all refuse. The 409 Problem Details lists every number in `errors[]`. Today's text names only the first problem (`:896`, `:949`).
- **BR-7 Frozen with the release (Rec.).** The snapshot carries `sources` for its numbers, only when there are any, so older fingerprints stay as they are (the `fact_sources` pattern, `engine/snapshot.ts:60`). A past release never changes when an entry changes (G3's M1/m1 lesson). An entry changed after submit makes the submission stale. `diff()` shows "Source" changes, and the expert signs them (SA-1B-39 §7, "stored inside the published version").
- **BR-8 Fit with G3 (#471).** G1 runs in every workspace, the demo workspace included. A number with no entry is a gap, not Sample, and is never let through as a Demo release (Q1). An item marked Sample with complete entries is still a Demo release: `isDemoSnapshot` is unchanged. "None published – set by ExpatReady" is a source answer, not Sample. G1's refusal comes before G3's mark.
- **BR-9 Who.** Only the author duty writes (PUT), checked on the server. Everyone else reads it. Staff only: firms and clients never see it (SA-1B-39 rule 5, SA1B-D104(c)).
- **BR-10 Kept.** An entry is never deleted. An entry whose path no longer exists is ignored and listed as "No longer used" in its panel.

## 4. Layout (EXPERIENCE §3)
- **Review and release** (Change set pattern; board 1): a block "Numbers without a source (n)" sits above the validation list. It is grouped by item, one line per number in words, each with **Add source**, which opens the Source panel in place, so the page keeps its scroll. Submit stays greyed with "Fix the problems first". The approver gets a read-only panel with the line "The author adds the source".
- **Source panel** (Side panel, 480–560 px, right; board 2): a pinned header with the item in words and where it lives, then one card per number. Each card shows its state chip and a two-way choice: **Official source** (URL, page, quote, date read) or **None published – set by ExpatReady** (reason). The footer has Cancel and Save.
- **Where else the panel opens:**
  - the rule dialog (`configuration.tsx` RuleDialog): a "Sources of its numbers" section under the condition;
  - each check row with a number: a "Sources" row action. There is no check editor today: the checks list is read-only and checks are added by API only;
  - a form line's "From age" (`workspace/forms.tsx:334`).
- **Release page:** a held row reads "Held back: 3 numbers have no source", with "Fix on Review and release".
- **Prefill, no AI:** the item's own quote, the validity `cite`, and **Rec.** a pick from this combination's approved sources for the URL (STANDARDS §3.2, pick don't type).
- **States:** empty (no numbers: "Nothing to source"), missing, cited, none published, stale, field error, read-only (approver, or released), conflict (409: someone else saved), loading skeleton. At 400 px the panel goes full width.

## 5. Copy
- Refusal, per number: "<item>: <value> has no source entry. Add the official source, or mark 'None published – set by ExpatReady'." For example: "Rule 'Add form IMM 5707 for this person' (age is 18 or older): 18 has no source entry. …"
- 409 detail: "Release refused: 15 numbers have no source entry. Each is listed on Review and release."
- Stale: "<item>: the source was written for 90; the number is now 60. Check the source again, or mark 'None published – set by ExpatReady'."
- Chips: No source · Official source · None published – set by ExpatReady · Changed since its source.
- Tip on None published: "The government publishes nothing on this point; ExpatReady set the number. Say why."
- Field errors: "Use an https address." · "Copy the words that state the number (up to 300 characters)." · "The date read cannot be in the future." · "Say why ExpatReady set this number (at least 10 characters)."
- Empty: "This item has no published numbers." Approver: "Only the configuration author adds sources."
- Fee line: "From the fee table · checked <date> · changed by the tech lead in the fee table".

## 6. Contract and tests
- `GET /combinations/:id/sources` → `{ numbers: [{kind, key, path, value, item_words, words, where, state: missing|cited|none_published|stale|fee_table, entry?}], counts }`. This is one query for the entries plus the snapshot walk.
- `GET /combinations/:id/sources/:kind/:key` → one item's numbers.
- `PUT /combinations/:id/sources/:kind/:key` with body `{path, value, cited?: {url, page?, quote, date} | none_published?: {reason}, baseRevision?}` → 200 the entry · 400 Problem Details with errors on each field · 403 not the author · 404 no such item or path · 409 the value changed since the panel opened, or someone else saved.
- The release 409 also carries `type …/no-source` and `errors[{item, value, where, fix:{tab, focus}}]`.
- **Tests (pass + fail per BR):**
  - engine `tests/check_g1_source_register.ts`: BR-1 to BR-5, BR-7 and BR-8;
  - API `tests/check_g1_sources_api.ts`: BR-3, BR-6, BR-9 and BR-10, on both release routes and on submit;
  - browser `check_g1_source_register_browser.cjs` (the journey below), with axe and the keyboard path at 1440, 1024 and 400 px.
- **Journey:** "With an LMIA": edit the rule → Submit refused, the 15 numbers listed → Add source on 18 (cite IMM 5488's words) → None published on 90 (reason) → stale step (change 90 to 60) → all sourced → submit, sign, release. The release v-next snapshot holds the entries. Fees are tested on Visitor visa.
- **Scale:** the walk over the imported release's 406 checks and 39 rules adds ≤ 50 ms to `/review`, and entries are read in one query (no N+1).
- **Existing suites** that release a draft with numbers add their entries through the API, never by SQL (G3 review m5).

## 6b. Capability or scaffolding (P-33) · Needed or Not built (P-26)
- **Capability, Needed:** the `source_entry` table and the walk · the refusal on all three routes · the 409 list · the Review block with Fix · the Source panel (cited, none published, stale) · the Source section in the rule dialog · the Sources action on checks · the "From age" source · the fee-table adapter · snapshot `sources` and the expert's sign-off · the Release page held reason.
- **Capability, Not built:** the register screen (SA-1B-290: kinds, weekly check) · next review and "overdue" in orange (SA-1B-39 rule 3) · per-number expert Confirm (SA-1B-294) · AI filling the source (SA-1B-291) · source markers on staff screens (SA-1B-193 rule 2) · a check editor.
- Scaffolding, Needed: the import of the work-permit release writes cited entries only where its quote states the number in digits, using the manifest's URL and its download date (19 Oct 2026). For example, 18 from IMM 5488 and 5 from guide 5487. The 90s, 30s and "one year" stay without an entry, so the demo shows the gate. Scaffolding is never shown as a capability.

## 7. Questions (at most 3, recommendation first)
1. **Demo workspace: does a number with no source also refuse there?** Rec.: **yes, refuse everywhere.** A missing source is a gap, not Sample, and P-240 adopts the gate without a demo exception. Alternative: let it pass as a Demo release. That would hide the gate in the only workspace we have.
2. **A number changed after its source was written:** Rec.: **refuse it as "no source"**, with the stale words and a one-click "Still correct for 60" after a look. Alternative: warn only. That lets 60 release under a quote that says 90.
3. **⚠ Reason for "None published":** P-252 (3) asks for a reason, but the agreed table has no column for it. Rec.: **add `none_published_reason` (required) in PR 1.** It costs one column, and SA-1B-294 rule 6 records that ExpatReady set the number. Alternative: no reason, which goes against P-252.

## Definition of ready
Acceptance test named (`check_g1_source_register_browser.cjs` plus the two suites above) · row text as BACKLOG G1 · Q1–Q3 answered and recorded in DECISIONS · Rec. edges of BR-1, BR-2, BR-4 and BR-7 confirmed by the tech lead · a fresh challenge written to `challenge.md` · boards clicked through, or the tech lead approves after the challenge (P-223 (4)).

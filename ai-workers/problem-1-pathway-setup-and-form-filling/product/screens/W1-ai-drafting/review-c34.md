# Review: C3.4 part 1, a form edition's sections and answer lists drafted by the rules (F4; P-158, P-138, P-149, P-120)

Reviewer: a fresh agent that did not build it. Commit **70d7303c** (branch `forms-c34-local`, one commit on origin/main). Isolated copy `rev_c34` on :4455, six loaded, web build at 70d7303c. No `*_LIVE` variable. US$0.

**Verdict: Block.** One Major is open (M1). Journey score: **8/10** (pass, no criterion at 0). Report: `journey-test-reviewer-2026-11-01-70d7303c.md`.

## What I ran
- **Rules pass on all 16 form editions of the six** (API, as user-A): every one returned 201 in 15–150 ms. There were 159 section proposals and 73 answer-list proposals. Lists over 400 values were skipped and named: Contact language 474, Interview language 474, City 414.
- **Pure drafter on all 25 form inventories in `p1/inventory`:** no two section names collide under `normalizeLabel`, so no batch can fail with "in this batch twice".
- **Accepting:**
  - Province abbrev (13 codes), Country of birth (261 codes, hashed identity) and section Personal details each land as a DRAFT row plus a WAITING `library_change`.
  - The same item accepted from a second edition is refused with a 409: "already in the library … reject this one, or reuse that item". So duplicates across editions are caught at approval.
- **Identity change:** `listIdentity` gives the old key whenever the joined codes fit in 300 characters. Before this change, no stored key could be longer than 300 (the contract caps `identity.key`), so no existing proposal or library list changes identity. `sameInLibrary` and `identityKeyOf` use the same rule, and the edit path (`recordChoice`, `decide` edit) recomputes it through `identityKeyOf`. No other code computes list identity (checked with grep).
- **Lock (P-138):** advisory transaction lock on (workspace, edition), and the lookup runs inside it. The builder's parallel-click check passes. Another combination's attachment of the same edition gets the same job back, as intended.
- **Browser** (Library › Forms › IMM 5257 ⋯ › Re-read with AI):
  - Keyboard reaches "Draft sections and lists · US$0" in 2 Tabs.
  - axe finds 0 violations on the dialog and on three queue side panels.
  - No sideways scroll at 1024, 640 (200 % of 1280) or 400 px. No page or console errors. The draft takes 222 ms.

## Blockers
None.

## Majors
**M1 (Must): the section rule proposes the page's hidden and machine parts as shared-library sections, and shows an invented quote as "IRCC's words … found in the file".**
- **What happens:** `form-masters.ts:59` groups every field by the first two parts of its `section` path, including fields the inventory marks `presence: "invisible"` and calculated barcode boxes.
- **IMM 5257 examples:**
  - "Buttons header" holds the hidden computed boxes `Age`, `AdultFlag`, `FormVersion` and `PrevSpouseAge`.
  - "Header" holds the invisible `CRCNum`.
  - "Text field1" holds Barcode 1–5.
  - "Buttons footer" holds `readerInfo`.
- **Scale across the six:** 21 of 159 section proposals are such page chrome (Header ×5, Text field1 ×5, Buttons header/footer ×8, Page wrapper ×2, "#subform"). Another 42 carry technical part names ("Five", "Seven", "Subform1", "Table1", "Section a–e", "Sub no1", "Radio button", "Yes no").
- **The invented quote:** a part with no caption takes its own made-up name as the quote (`source(s.quote || s.label)`, line 117), and `quoteFound: true` is hard-coded (line 92). The side panel then reads: IRCC's words "Buttons header" · imm5257e.pdf · found in the file. That breaks AGENTS rule 4, P-170 and D7/D18.
- **Not covered by a test:** the builder's test checks only `fieldKeys.length > 0`, so it would not fail on any of this.
- **Fix:**
  - Leave out fields with `presence` invisible or hidden, and calculated boxes with no person-entered value. Drop a part left with no fields.
  - Take the section's quote from the printed `heading` or `caption` the inventory already carries. If there is none, set `quoteFound: false` (or skip the part). Never use the generated name as the quote.
  - Add a failing check: no IMM 5257 section holds only invisible fields, and every `quote_found` quote appears in the inventory's printed text.
  - Technical names can stay for a person to rename. The concept leaves section names to AI ("section groups (rules), section names (AI)", concept-draft.md:10).

## Minors (Should)
1. **The "Open Proposals" link lands on the wrong form's group.**
   - **What happens:** `ai-launch.tsx:159` links to `/review/proposals` with no group, so the page opens the oldest group. After drafting IMM 5257 it opened "IMM 5707 E …", which has 9 Ready items, not the 30 just made.
   - **Fix:** link to `?group=edition:<edition>`, the id the queue already uses.
2. **The judged choice, rules reading stored as `rounds.draft.from: "replay"`.**
   - **What happens:** this is acceptable as a stopgap, because the queue shows content only through readings and C2.6's checklist uses the same pattern. But the side panel reads "First reading · saved run" directly under its own heading "From the rules, no AI reading" (`proposals.tsx:147`). That contradicts itself and suggests an AI run.
   - **Fix:** label the reading by `origin` ("rules, US$0"), or add `"rules"` to `RoundReading.from` through the contract owner. No API consumer other than `readingOf` reads `from`.
3. **Answer-list names are the form's internal list names:** "Gender mel" (the box says "Sex"), "Phone type trv", "Province abbrev", "Preference language".
   - **Fix:** strip known suffixes (MEL, TRV, Abbrev) or prefer the box caption when the internal name has them. A person renames today, so this is only a nudge.
4. **The printed export codes are dropped.**
   - **What happens:** the inventory gives `["Married","01"]` and `["F Female","Female"]`, but `choices()` keeps only a code made from the words. The header comment says "code and words as printed", which is not true.
   - **Fix:** correct the comment, or keep the printed code in the item's `work` so fill mapping can use it later.
5. **The person sees the hash or the code list instead of the list's name.**
   - **What happens:** for a long list, the 409 "already in the library" reads `"codes:261:f31d…" is already in the library as country_of_birth` (`proposals.ts:299`). A short list shows its comma-joined codes in the same message.
   - **Fix:** for answer lists, name the item by its label in that message.
6. **The panel's reading text stops at 300 characters.**
   - **What happens:** for a 261-country list the person sees about 25 values before accepting, and nothing shows the rest.
   - **Fix:** say "… and 236 more" in the reading.
7. **Two same-named lists with different choices land as two library lists**, Marital status and marital_status_2 (IMM 5257 has 8 choices, IMM 0008 has others). `identity.near` stays empty, so the second person is not told. No producer fills `near` today, so this is noted, not blocking.
8. **Wording:**
   - The job message says "1 answer lists".
   - The dialog's existing line "Questions, sections and rules are not AI-drafted here … people author them" now sits above a panel that drafts sections.
9. **Keyboard focus is lost after clicking:** the busy Button disables itself, so focus falls to the dialog. The `role=status` line is announced. This is the shared `controls.tsx` behaviour, not new here.

## D1–D20 (this item)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 7 | P-158 rules part delivered (lists from box choices only, sections from parts); checks, document types and guide rules openly deferred (409) |
| D2 Data integrity | 6 | Duplicates refused at approval; chrome sections and a false "found in the file" can enter (M1) |
| D3 Reuse | 7 | Exact reuse by identity; same-name, different-code lists both land (Minor 7) |
| D4 Rule integrity | n/a | No rules drafted in this part |
| D5 Stability | 9 | Once per edition under a lock; parallel clicks share one job; reload-safe |
| D6 Governance | 9 | Sample, second person, audit line "drafted … by the rules (n proposals, no AI, US$0)" |
| D7 AI trust | 6 | "Rules" pill is right; "saved run" label and the invented quote are not (M1, Minor 2) |
| D8 Orientation | 8 | Edition group "IMM 5257 (09-2023)"; the link opens another group (Minor 1) |
| D9 Flow | 7 | One click to draft; next step lands on the wrong group |
| D10 Language | 6 | "Gender mel", "Buttons header", hash in the 409, "1 answer lists" |
| D11 Feedback | 9 | Count, "Already drafted for this edition", errors in `role=alert` |
| D12 Visual | 8 | Fits the existing dialog; long dialog |
| D13 Accessibility | 9 | axe 0, keyboard, 400/640/1024 px; focus loss (Minor 9) |
| D14 Team look | 8 | Existing components only |
| D15 Speed | 10 | 15–150 ms per edition |
| D16 Testability | 6 | 25 checks; the section-quality and quote rules have no failing test (M1) |
| D17 First use | simulated only | |
| D18 Provenance | 6 | File, edition, quote shown; quote sometimes invented (M1) |
| D19 Closure | 7 | Rules part closes lists and section groups; AI part pending the founder's cost OK |
| D20 Wow | simulated only | |

## Could not check
- A real screen reader.
- An intended user's unaided walk (D17 and D20 stay with the founder).
- The combination-dialog entry point in the browser (the builder's browser check and my API runs cover the same panel and route).
- `graph.mjs`, because it rewrites `qa/graph.json` and I write only this file. The route is named by `check_forms_c34_masters.ts` (C3.4).

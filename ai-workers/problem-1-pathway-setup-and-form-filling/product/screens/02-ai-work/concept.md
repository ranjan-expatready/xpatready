# Screen 02 — AI work and reviews · concept (agreed by the Lead, 25 Oct; drafted by screen-designer 23 Oct)

## Lead decisions (25 Oct, P-89: the Lead agrees concepts; the founder walks the milestone end to end)
* Q1, Q2 settled by the founder (P-79 To review page; P-80 held PDFs approved in the product).
* **Q3 → yes:** purposes and overflow are chosen in the field-map proposal (five fixed kinds, two overflow choices; AI proposes from the form's wording); list groups stay in Screen 04. The forms lane adds the purpose to the F1 field-map contract if Screen 02 needs it (lane note).
* **K1 → the draft's third option:** a PDF form field is mapped, "not a fact", or "filled by hand, with a reason"; only undecided form fields block release. Screen 01 releases stay unblocked.
* **K2 → in Screen 02, as its last slice:** AI drafts sections, document requirements, rules and checks from checklists (C3.4, C2.6), reviewed on the same To review page; replay and stub first, live only within the caps.
* **K3 → in Screen 02:** "Propose with AI" on New combination (P-37, P-41) lands here; SCREENS row 02 is updated.
* **K4 → as drafted:** reused element ids stay `id@screen-title`; screens show the screen name only.
* **Shared with Screen 04 (Lead, 25 Oct; Screen 04 challenge B1, M1, M6):** slice 2 builds the one `LibraryChange` record (ADD · DELETE · RETIRE · RESTORE · EDIT_RULE; WAITING · APPROVED · RETURNED · RELEASED; reason, AI verdict and matches), kept outside the snapshot, and `keyFor(subject, group, label)` with a field name and group by migration. New shared fields accepted here are `LibraryChange` ADDs. Both release paths (the shared release and the single-combination approval) publish APPROVED changes through one `publishLibraryChanges` in their transaction, shown under "Library changes". A combination release using a WAITING item gets a 409. The To review queue lists every action. Screen 04 reuses all of it.
* Slices: (1) To review page + AI work run log on today's data; (2) source reading and proposals beside the source, new-edition impact and accept → release; (3) Propose with AI and the K2 drafts. EARLY-LOOK after slice 1 is the Lead's (P-89).

Board: `design/draft-ai-work.html` (one file, 11 views, every state below; "Show labels" shows Capability/Scaffolding, Needed/Not built and decision marks). Sample data throughout; form codes are real IRCC codes, editions, page numbers, option codes and costs are **Sample** until the immigration expert confirms them. Unconfirmed: no counsel.

## 1. Job and journey
A content publisher turns uploaded sources (PDF forms, checklists, saved portal screens) into reviewed library content and field maps, cheaply and visibly, and a second person approves what must not rest on one person; when IRCC changes a form, they see its impact before anything changes. Personas: Configuration author, Content reviewer (second person, SME duty), Immigration expert (captures portal screens). Journey 1.3, 2.1, 2.2, 3.1, 3.2; SA-1B-33..35 (+ 11, 12, 27 if Q3 = yes). Capabilities: C2.3–C2.6, C3.1–C3.6, C3.8, C9.1.

## 2. Ten layers (exists · team · new)
| Layer | In our app | Team code (`ERv2-frontend@5ccd9fa`) | New for Screen 02 |
|---|---|---|---|
| Masters | Field (aliases, merge id), answer list, form edition (PDF/online), portal capture, field merge (F1) | Canonical fields, form editions, field maps (read-only export panel; no map editor) | Proposal kinds beyond field maps: section, document requirement, rule, check, answer list (C3.4, C2.6) |
| Links | Field map form field → shared field, person, transform; option map per channel | `form-field-maps` domain | Purpose + overflow on a list field map (B1, Q3) |
| Engine | `twin.ts` screen map, `capture.ts` difference, `channels.ts` validator, `options.ts` | Pure filler | Edition comparison field by field (no AI); part splitter by section group (A4, forms slice 2) |
| Contract | `/ai/plan`, `/ai/batches`, `/jobs/:id`, captures, screen map, option maps, merges (§6) | Pack job panel, diff results, validation report | Queue, impact, held-file decision, advisory duplicate check |
| Screen | `ai.tsx` (log), `job.tsx` (card review), `sources.tsx` (draft dialog) | `pack-job-panel`, `pack-diff-results`, `pack-draft-validation-report` | Queue page, Draft setup, A4 progress, source + proposals, screen map, capture review, impact review, merge panel |
| AI assist | Field-map drafting (guarded route, ledger) | none | Leftovers only; document requirements and rules from checklists with quote; impact assessment |
| Governance | Release with author ≠ approver; capture second person; merge second person | Approval dialog | Second person for new shared fields (P-53); held files (P-80) |

## 3. Business rules (source)
* BR-1 Nothing applies until a person decides; AI never decides identity, exact duplicates, filling or release (P-62 §4, P-32, STANDARDS §3.8).
* BR-2 Reuse first: mapped edition → same element id → PDF twin → name or alias → AI for leftovers only (P-38, P-62 §4, P-65, A4).
* BR-3 Cost before any paid run: expected, worst case, remaining budget; refused over US$5 per run or the US$100 total; a repeat of a run that failed our own check is refused, a free re-check offered (PRODUCT §5, A3, P-27).
* BR-4 Progress per part in real counts ("Part 4 of 9 · 189 of 450 form fields"); cancel stops queued parts; a failed part keeps its good entries and says FAILED in plain words; BLOCKED only for provider limits (A1, A2, A4, EXPERIENCE §4).
* BR-5 Bulk accept only for exact reuse or same-element-id (High); everything else one by one; Undo on the toast (P-43).
* BR-6 Every form field ends with a decision: shared field, "not a fact", or "filled by hand" with a reason (P-62 §5.3; see conflict K1).
* BR-7 New shared field: name and meaning typed, key generated, exact duplicate (key, name, alias) refused without AI, advisory meaning verdict, reason required when the verdict disagrees, a different person approves (P-34, P-53, P-65).
* BR-8 Library changed since the draft was compared → apply refused; "Compare again (no AI)" keeps valid decisions (existing `recompare`).
* BR-9 The capturer, proposer or author never approves their own capture, merge or new field; enforced on the server (P-65, P-66, STANDARDS §6).
* BR-10 A capture holding any value is refused, nothing kept (P-66 §1, F1).
* BR-11 Every answer-list value has a code in each channel and every form code is mapped or unused before release (P-62 §3, F1 validator, C3.8).
* BR-12 New edition: compared field by field without AI; unchanged form fields carry their map; AI maps only new or reworded ones and assesses impact on fields, sections, document types, rules, checks; lists every combination; nothing changes until accepted and released; open cases stay on their release (P-32, P-38, STANDARDS §3.7).
* BR-13 A changed online version (re-capture with differences) gets the same impact review (P-61 §5, P-66 §2).
* BR-14 Merge: one field survives, the other becomes an alias that redirects; mappings and rules move; releases untouched; both re-checked at approval (P-65, F1 R7).
* BR-15 A list on a form maps to one of five fixed purposes; overflow is "continue on an extra sheet" or "flag for the officer", never a silent cut (SA-1B-11, 12, 27; B1; Q3).
* BR-16 Words P-63 ("form field", "shared field", "field map"; never "box"); no hashes, run ids or model names on the main path (PRODUCT §4).

## 4. Layout (EXPERIENCE §3 patterns; team tokens, type 12/14/16/18/20/24)
1. **To review** (Library list pattern, `FilterLayout`): chips Needs you · Waiting for others · Running · All, Kind filter, search; one row per item with what and why, status, AI cost, one next step for the acting role. States: normal, empty, loading, error, capturer (no action). Rows also list combinations waiting for release, linking to their Review and release tab (P-79).
2. **Draft setup** (combination page, P-07 Setup button): per source what the system found without AI and the plan (reused · AI drafts N in K parts · held), estimated cost, the AI line, "Start AI draft · up to US$x", "Draft without AI". States: normal, budget limit, AI unavailable.
3. **Progress (A4)**: one count bar, per-part table (form, section group, how, form fields, status, cost); review finished parts while others run. States: running, part failed, done.
4. **Review proposals** (Source + proposals): kind tabs (Field maps · Document requirements · Sections · Rules and checks · Answer lists), outcome chips, list · source page with highlight · AI proposal and decision; J/K/A/N keys. States: ambiguous, conflict, create new with advisory check, list purpose/overflow, option map per channel, stale, applied read-only.
5. **Screen map** (online version): screens · inputs with "found by" · selected leftover with library search, "not a fact", "Draft the N left with AI". States: leftover, accepted.
6. **Portal capture review**: portal, capturer, way, differences, branches not seen, review document; Approve · Return with reason. States: second person, capturer, returned.
7. **New edition impact** (Change set pattern): summary, AI line, four counts, tabs Comparison · Impact on library · Combinations; accept → shared draft → Review and release. States: three tabs, accepted (toast with Undo).
8. **Merge** (right panel, P-48): goes away / stays side by side, what moves; states second person, proposer.
9. **Held file** (P-80: uploader records the IRCC page; second person approves or rejects) · 10. **History › AI work** (existing log, adds parts, plain messages) · 11. **Propose path with AI** (P-37/P-41, see K3).

## 5. Copy (front-loaded, plain)
* Empty queue: "Nothing waits for you. When you add sources to a combination, its AI draft, new editions and approvals appear here."
* Cost line: "Expected US$2.35 · worst case US$8.60 (each part capped at US$5) · Spent so far US$39.28 of US$100." Budget error: "Starting would pass the AI spending limit. US$2.10 is left; this draft needs up to US$8.60. Draft without AI, or ask for a higher limit."
* Failed part: "AI answered 22 form fields; 1 name broke the naming rule (form field 114). The other 21 were kept. Form field 114 goes to a person. Cost US$0.38."
* Stale: "The library changed after this draft was compared. Applying is refused until you compare again. Comparing again uses no AI and keeps every decision that still holds."
* Capturer: "You captured this. A different person approves or returns it." Tooltips: Ambiguous "Two or more shared fields could fit; a person chooses." Conflict "The form and the shared field disagree on type or parts." Not a fact "Signatures, office use or a document upload: nothing is filled from case facts."

## 6. Contract and tests
Exists: `POST /ai/plan` (estimate), `POST /ai/batches` (idempotent), `GET /ai/batches/:id`, cancel, retry; `GET /jobs/:id`, `POST /jobs/:id/items/:item`, `accept-clean`, `recompare`, `apply`; `GET /captures`, `/captures/:id`, approve, return, abandon, `/captures/:id/review`; `POST /online-versions/:id/screen-map/draft`, `PATCH …/screen-map`, `POST …/accept`; `POST/PATCH /editions/:id/option-maps`; `/library/merges` propose, approve, reject; `GET /intake/held`.
New (forms lane unless marked): `GET /ai/batches/:id` adds `parts[] {form, label, pages, how, total, done, status, costUsd, message}` (A4, slice 2) · job items of kinds `section | document_requirement | rule | check | answer_list` with source quote (C3.4, C2.6) · decision kinds `NOT_A_FACT`, `BY_HAND {reason}`, `NEW {label, meaning, type, reason}`, `purpose {kind, overflow}` · `POST /library/fields/similar` advisory verdict (shared with Screen 04) · `GET /library/forms/:code/editions/:id/impact`, `POST …/impact/accept` (C9.1) · `GET /review-queue?filter=&kind=` (screens lane; Q1) · `POST /intake/held/:id/approve|reject` (Q2).
Tests: one pass + one fail per BR-1..16 (e.g. BR-9 capturer approve → 403 / second person → 200; BR-3 worst case above cap → refused, nothing queued). Keyboard path queue → proposal → J/K/A → apply; axe on every state; 1024 px and 200 % zoom; queue first view < 1 s with Sample data; Playwright journey: upload IMM 5476 new edition → impact → accept → release (Sample editions).

## 6b. Capability or scaffolding (P-33) · Needed for the proof or Not built (P-26)
* **Capability · Needed:** every view 1–8 and 10; Draft without AI; cost line; part progress; advisory duplicate check; option map per channel; impact review; capture review; merge panel; server role checks.
* **Scaffolding (never ported):** "Use the saved AI answer" and stub pass (inside "Prototype options"), Demo menu, Acting as, Prototype badge, Sample portal fixtures, Sample ledger values.
* **Not built:** capture by extension (F2), screenshots as a source (P-66 way D), Form health and "Re-capture needed" (M3, C9.3), adopting an update on an open case (B9), report a mapping problem (B28, M4), retire execution (C3.7, Screen 04), change watch.
* **Pending a question:** held-file approval (Q2, agreed P-80), purpose/overflow on this screen (Q3, B1), queue page and menu item (Q1, agreed P-79).

## Decisions followed, missing or in conflict
* Followed: P-07, P-23, P-27, P-32, P-34, P-37, P-38, P-43, P-48, P-49, P-53, P-57, P-58, P-61–P-66, A1–A4; EXPERIENCE §3–§5.
* **K1 conflict (Lead, not founder):** P-62 §5.3 "every PDF form field mapped or not a fact" vs F1 build choice 4 (PDF leftovers stay by hand so Screen 01 releases are not blocked). Draft follows a third option: an explicit "filled by hand, with a reason" decision; only undecided form fields block.
* **K2 gap (Lead):** C3.4 and C2.6 (AI drafts sections, document requirements, rules, checks from checklists) are Needed for the proof (PRODUCT §1, A5) but are in no lane's plan; forms slice 2 covers A4 and screen maps only.
* **K3 gap (Lead):** "Propose with AI" on New combination was given to Screen 02 (P-37, P-41, Screen 01 Layout v2) but is missing from SCREENS row 02.
* **K4 open (Lead, F1):** reused element ids kept as `id@screen-title`; the screen map shows the screen name, never the suffix.

## 7. Questions for the Lead (recommendation first)
1. **[Agreed P-79, 23 Oct: one To review page first under Configure; also lists combinations waiting for release, linking to their Review and release tab]** **Where do approvals that are not AI live?** *Recommend:* one "To review" page first under Configure (task-first, like Programs "Needs you"), listing AI proposals, new editions, portal captures, screen maps, new shared fields, merges and held files; History › AI work stays the run log. *Alternative:* everything under History › AI work (no menu change, but a capture approval hides under "AI" and "History"). Needs a decision because P-04 fixes the menu.
2. **[Agreed P-80, 23 Oct: yes, as recommended]** **Can a person approve a held PDF in the product (C2.3)?** *Recommend:* yes, like captures (P-66): the uploader records the IRCC page it came from, a second person compares and approves; the file then joins the approved list. *Alternative:* keep approval as a manifest row by the Lead (C2.3 stays Not built; the demo needs every file pre-listed).
3. **Do purposes and overflow (B1) belong here?** *Recommend:* yes, choose them in the field-map proposal (AI proposes from the form's wording; the person picks from five fixed kinds and two overflow choices), while list groups are defined in Screen 04; needs the purpose in the F1 field-map contract. *Alternative:* Screen 03/04 later, and Screen 02 shows "Purpose: not set" for list fields (release would then need a second pass).

## Definition of Ready (WORKFLOW.md)
- [ ] Board agreed by the founder (draft board exists; not yet clicked through)
- [x] Every element labelled Needed / Not built and Capability / Scaffolding (§6b, board labels)
- [ ] Data and API needs known (§6 lists them; C3.4/C2.6 and impact endpoints have no owner yet: K2)
- [ ] Every decision it relies on agreed by the founder (Q1 agreed P-79; Q2 agreed P-80; Q3 open; K1 Lead)
- [ ] No open questions (three open)

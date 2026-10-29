# S6 Shared library: plan addendum for P-149 (screens lane, 29 Oct)
Founder decision P-149 (Lead PR #77; research `research-authoring-model.md`) amends P-120. This addendum to `plan.md` says what it changes in its §3–§5. Nothing above is withdrawn unless named here. Read against: the contract at forms `c1191e58` (`contracts/proposal-item.ts`), `prisma/schema.prisma` and `engine/snapshot.ts` on main `f7cb40d9`. US$0 to build; AI spend only as in §4.

### A. What already holds (checked on main, no new work)
* **Versions exist.** Fields, answer lists, sections and document types carry `version`, `status` and `supersedesId`. A release freezes `row_versions` in its snapshot (`engine/snapshot.ts`), and cases pin a release. Rule 3 needs no new table, only a guarantee that nothing edits an approved row in place (B, slice 1).
* **Forms enter only as a file.** There is no typed form route: `library/forms/upload` and the S4 finder are the only ways in. A form is not a queue kind.
* **The expert has a duty.** The release review signs items off with duty `sme` (`studio.ts`). Rule 4 and rule 5 reuse it; there is no new role.
* **No typed technical names.** Already the plan (§3 "One Add", M8 routes closed with 410).
* **Deferred by P-149, so not built:** a meaning index (no pgvector; revisit at about 1,000 fields or slow checks) and per-combination wording (one wording per item in Wave 1; research A5 not built).

### B. Changes per slice
| P-149 rule | Slice | What changes in the plan | Test (pass / fail) |
|---|---|---|---|
| AI-first lists | 1 (fields), 2 (answer lists, sections), 3 (roles, conditions) | Each list's main button is the AI one: "Draft fields with AI" on the form row and group, "Draft from a form" on the Fields list. Secondary: "Not in the list? Add one". Person roles: Add only, for the team, with no AI button (P-149: roles come from the team). | main button is the AI one on each list / no list shows Add as its main action (browser check) |
| (1) One door | 1 | `POST /library/add` writes a `ProposalItem` with origin person into the one queue, never a `LibraryChange` directly. It gets the same rules, the same Ready · Check · Decide words and the same second person. Accept writes the `LibraryChange` as for AI items. A person's item is never Ready for bulk accept: it is accepted alone. | Add lands in To review as "Added by a person" / a direct `LibraryChange` write outside the accept service fails the source scan |
| (1) Shown at release | 1 | Release review lists every "Added by a person" item with its reason, beside AI items. | released item shows the reason / Add with no reason → 400 |
| (2) Identity rule | 1 (field), 2, 4 (document type) | One `identityOf(kind, payload)` in `engine/`. Field: name or synonym (label, `aliases`) + about whom (`subject`) + answer type (`valueType`). Document type: name + what it proves. Form: number + edition + fingerprint (upload already). It runs at write **and again at approval** on the server. An exact duplicate is refused. A near one (same subject and type, label or alias shortlist by rules) needs a reason, kept on the item. "Did you mean" by AI runs only on the rules shortlist, on a click, cost shown (P-138 style). | exact twin refused at write; also refused at approval when the twin was approved in between (race) / near one without a reason → 400; with a reason → waits |
| (2) Answer lists, sections | 2 | Lead decision (Q-A3, within P-149): an answer list's identity is its set of value codes, order ignored (an Add offers "use an existing list" first); a section's identity is its name or synonym only, never name + form (sections are shared across forms, P-62/P-120). | same codes in another order → the existing list / a different set → new; "Personal details" on a second form → the existing section / a new name → new |
| (3) Versions | 1, then each kind | Accepting an edit always makes a new version (`supersedesId`). No `update` touches meaning, answer type or values of an approved row (source scan plus a test). A combination's draft reads the latest approved version, and its release freezes it (exists). Where used is the impact list on every edit and retire. | edit → v2 approved, an open draft shows v2, a released combination still shows v1 / an in-place update of an approved row fails the scan |
| (4) The meaning question | 1 (fields), 2 (lists), 3 (roles, conditions) | Every edit asks "Does this change the meaning, answer type or allowed values?". The server forces yes when `valueType`, `answerListKey` or the choices changed; the browser cannot send no. Yes → the second person **and** the `sme` sign-off, with a written line on what happens to its users (Where used counts, filled in). No → the second person only. | type changed and answered no → recorded as yes, needs `sme` / yes without the users line → 400 |
| (5) Example cases | 3 (shared conditions), 4 (form and cross checks) | A condition or check carries examples (facts → expected yes/no), drafted by AI, confirmed by the `sme` duty. S6 builds `SharedConditionExample` and one `runExamples(tree, examples)` on the engine evaluator. Before approval, any change re-runs the examples for **every** combination using the rule. Approval is refused while one fails, naming the combination and the case. | all pass → approvable / one combination fails → approval refused and says which |
| Manual field Add: where it applies | 1 | After a person's field Add, the rules matcher (US$0) proposes matching unmapped form boxes on library forms (label and alias on the PDF box names) as field items with `relatesTo` the Add. The AI placement proposal is a `field_placements` step on the runner (replay first). Its live call runs on the Add's Send, with the cost line on the Add dialog before Send (Lead Q-A1). It never blocks Send. Checklist-line placements are forms' (C). | Add "date of birth of the parent" → its matching boxes on IMM 5257 arrive as related items / the Add saves at once even when the placement step fails |
| Coverage gap | 1 | AI work shows, per combination, the share of accepted items that people added. Over about 10 % is logged as "AI coverage gap" (P-149). | 2 of 10 → logged / 1 of 20 → not |

Slice 1 grows by about a third (the door, identity, versions guard, meaning question, placements by rules). I propose to keep it one slice, since the door and identity rule are the queue's own rules. Slice 3 gains example cases. Slice R is unchanged.

### C. Pieces that are forms' (contract and W1-10)
**Contract changes** (`contracts/proposal-item.ts`, owned by forms, approved by the Lead):
* `origin` gains `person`;
* `runId` becomes nullable for a person's Add, or each Add gets its own run (forms' choice);
* `addReason` (string, required when origin is person);
* `identity` (`exact` or `near` keys, plus `nearReason`);
* `relatesTo` (item id, for placement items);
* `revision` (`ofKey`, `fromVersion`, and `meaningChange`: the answer, whether it was forced, and the line on users);
* `document_type.proves` (string; it is the identity rule);
* `examples[]` on `condition`, `form_check` and `cross_check` (facts, expected, confirmedBy nullable).

**W1-10 producers:**
* step 3 drafts document types with `proves`;
* steps 6 and 8 draft example cases with each condition and cross check;
* step 4/5 answers "which document supplies this fact" for a person's new field, which is the checklist-line placement.

S6 renders and enforces all of these; it does not draft them.

### D. Questions for the Lead (recommendation first)
* **Q-A1 · Placement AI call.** P-149 says "in the background"; P-125 and P-138 say live AI only on a click.
  * *Recommend:* the Add's Send is the click, with the cost line shown on the dialog (about US$0.01–0.05, Sample). The rules matcher always runs at US$0.
  * *Else:* rules only, with "Find where it applies with AI" on the item.
* **Q-A2 · Contract changes (C).**
  * *Recommend:* forms adds them in slice 0 before it reaches main, so S6 slice 1 builds on one contract.
  * *Else:* they come as a contract v2 before S6 slice 1, and slice 0 merges as is.
* **Q-A3 · Identity for answer lists and sections** (not in P-149). *Recommend:* as in B, with the founder's later confirmation.
* **Q-A4 · Bulk accept.** *Recommend:* a person's item is never bulk-accepted, the same as rules-only library items.

### Lead response, agreed 29 Oct
* **The addendum is agreed, with slice 1 kept as one slice.**
* **Q-A1 yes.**
  * The Add's Send is the click (P-138), with the cost line on the dialog (Sample).
  * The placement AI then runs in the background after Send.
  * The rules matcher always runs.
* **Q-A2 no.** Slice 0 merges as it is. The forms lane then makes the contract changes (C) as a small contract v2, right after slice 0 merges and before S6 slice 1.
* **Q-A3, a Lead decision within P-149** (recorded in B):
  * an answer list's identity is its set of value codes, order ignored;
  * a section's identity is its name or synonym only.
* **Q-A4 yes.** A person's item is never bulk-accepted.
* **BUILD order:**
  * slice R on slice 0, once slice 0 is on main (the Lead messages);
  * slice 1 after the forms contract v2 merges.
* US$0 until then.

### Server guards and their tests (P-153, 29 Oct)
P-153 requires each P-149 rule that S6 builds to be enforced in the server, on every proposal (AI, rules or person). A prompt or a screen alone never counts.
* All of these go in one check file, `tests/check_s6_p149.ts`: API journeys against an isolated copy, US$0.
* Each label starts with its rule id, so the decision checker finds it by name.
* Every guard sits in `api/src/proposals.ts` (the writer, accept and approval services). Its pure part sits in `engine/library-rules.ts`.

| Rule | Server guard (every origin) | Pass test (label) | Fail test (label) | Slice |
|---|---|---|---|---|
| P-149.1 one door | Only the proposals writer creates library items; there is no direct `LibraryChange` or library-row write outside the accept and approval services. | `P-149.1 pass: a person's Add lands as a ProposalItem origin person, then a LibraryChange only after accept` | `P-149.1 fail: a direct LibraryChange or library-row write outside proposals.ts is found by the source scan` | 1 |
| P-149.1 reason | A person's item without `addReason` is refused at write. | `P-149.1 pass: a person's Add with a reason waits and shows the reason at release` | `P-149.1 fail: a person's Add without a reason → 400, nothing written` | 1 |
| P-149.2 identity at write | `identityOf` runs on every write; an exact duplicate is refused, and a near one needs `nearReason`. | `P-149.2 pass: a near duplicate with a reason waits, the reason kept` | `P-149.2 fail: an exact duplicate from AI, rules or a person → 409; a near one without a reason → 400` | 1 (fields), 2 (lists, sections), 4 (document types) |
| P-149.2 identity at approval | `identityOf` runs again inside the approval transaction. | `P-149.2 pass: approval succeeds when no twin exists` | `P-149.2 fail: the twin was approved after this item was written → its approval is refused, saying which twin` | same |
| P-149.2 answer list / section (Q-A3) | For an answer list, the set of value codes (order ignored); for a section, the name or synonym. | `P-149.2 pass: a list with the same codes in another order is offered as the existing list` | `P-149.2 fail: the same section name on a second form → refused as a duplicate` | 2 |
| P-149.3 versions | Accepting an edit inserts a new version (`supersedesId`); approved rows are never updated in meaning, type or values. The draft reads the latest approved version, and a release keeps its own. | `P-149.3 pass: an edit gives v2; an open draft shows v2; a released combination still shows v1` | `P-149.3 fail: an in-place update of an approved row's meaning, type or values → refused (and the source scan finds no such update)` | 1, then each kind |
| P-149.4 meaning question | The server computes "forced" from the change (`valueType`, `answerListKey`, choices); the client's no is overridden. Yes needs the second person + the `sme` sign-off + a line on users. | `P-149.4 pass: a wording-only edit answered no needs the second person only` | `P-149.4 fail: a type change answered no is recorded as yes and its approval is refused without the sme sign-off; yes without the users line → 400` | 1, 2, 3 |
| P-149.5 example cases | `runExamples` over every combination using the rule, inside approval; approval is refused on any failure. | `P-149.5 pass: all cases pass in both combinations using the shared condition → approvable` | `P-149.5 fail: one case fails in one combination → approval refused, naming the combination and the case` | 3 (conditions), 4 (checks) |
| P-149.5 expert-confirmed cases | Approval is refused while any example lacks `confirmedBy` from the `sme` duty. | `P-149.5 pass: confirmed cases → approvable` | `P-149.5 fail: an unconfirmed case → approval refused` | 3, 4 |
| Q-A4 no bulk for a person's items | The bulk-accept service refuses a batch that holds an item with origin person. | `Q-A4 pass: a batch of Ready AI items is accepted` | `Q-A4 fail: a batch with one person's item → 400, nothing written` | 1 |
| Q-A1 placement on Send | Placement runs only after a successful Add write; its failure never rolls the Add back. Live only under the caps. | `Q-A1 pass: Add → related placement items arrive with relatesTo the Add` | `Q-A1 fail: the placement step fails → the Add stays saved; over a cap → no live call, rules matcher only` | 1 |

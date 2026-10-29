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
| (2) Answer lists, sections | 2 | Not named in P-149. Proposed: an answer list's identity is its set of choices (an Add offers "use an existing list" first); a section's is name + form. Lead Q-A3. | same choice set → offered the existing list / a different set → new |
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

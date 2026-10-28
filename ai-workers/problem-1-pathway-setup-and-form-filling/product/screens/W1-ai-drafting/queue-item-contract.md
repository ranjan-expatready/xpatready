# Review-queue item contract: proposal (forms lane, 29 Oct; for the Lead, Q-L2)

**File:** `prototype/studio/contracts/proposal-item.ts` (zod), proved by `tests/check_forms_proposal_contract.ts` (an example of every kind parses; what it must refuse is refused). **Status:** proposal, with no code reading or writing it yet. The Lead approves it with the screens lane before S6 slice 1 and W1-10 slice 2 build on it. Every proposed value is Sample until the immigration expert confirms it.

## One item, every producer
Every AI or rules proposal is one `ProposalItem` in S6's one queue, whoever drafted it:
* **S6**, per form edition, on a click (P-138): field, answer list, section, document type, form check, person role.
* **W1-10**, per combination: condition, requirement line, cross-answer check, comes-from, PQR pick.

The filing channel (B37, P-140) is **not** a queue item. It lands as today's "What IRCC accepts" change (`LibraryChange` kind `form_accepts`, second person), so nothing new is needed for it.

## What an item carries
| Part | Holds | Why |
|---|---|---|
| `kind`, `payload` | one of 11 kinds; the payload is only what a person accepts (ids are the server's) | one queue, one accept path (S6 M5) |
| `runId`, `step` | the run and step that made it | AI work names it; the acceptance rate per step (P-130 §6.3) |
| `scope`, `landsOn` | form edition or combination; library or combination | "Lands on" shown before accept (draft BR-6); a library landing needs the second person |
| `reuse` | reuse an existing item (its key) or new | P-120 "reuse existing" or "new" |
| `source` | file, fingerprint, edition, page, quote, `quoteFound` | P-121: no quote found → dropped and listed |
| `rounds.draft`, `rounds.check` | each round's reading and payload, live or replay, its run file and cost | the side panel shows both side by side |
| `rules` | each rule with its plain reason | "Rules pass" check on the row |
| `agreement`, `confidence`, `reason` | agreed · differ · one round · rules only → Ready · Check · Decide, with why | P-121, P-123 words; bulk accept for Ready only |
| `status`, `decision` | waiting → accepted, edited, rejected, undone; who, when, reason, batch | one Undo per batch; corrections kept as examples (P-130 §6.2) |
| `basis` | Sample or confirmed by the expert | AGENTS rule 4; confirmed items are never re-proposed |

## Rules the contract encodes
* **P-134:** a `document_type` with `identityDocument: true` can never have `readerKind: "letter_or_record"` (AI vision). The schema allows the pair so the queue can show the refusal as Decide; the rules refuse it.
* **Condition:** a condition carries its sentence, its tree in the condition language, and the shared condition it reuses (`sharedConditionKey`, null when new). It is never a copy per combination (S6 M6).
* **Cross-answer check:** it reads at least two facts and only warns (tier 2). A form check reads one form's own boxes (S6). This is the line drawn in challenge a2.

## Open points for the Lead
1. **Storage.** `NormalizationItem` holds field proposals today. Recommend one new table for `ProposalItem` (S6 slice 1), with field proposals moved onto it, not a second table beside the old one.
2. **Rules-only items** (comes-from by precedence, answer lists read from the PDF) have `agreement: "rules_only"`. Recommend that they can be Ready, since no AI is involved, but not bulk-accepted when they land on the library.
3. **Channel values** wait for the founder's research answer (P-140 note). Nothing in this contract depends on them.

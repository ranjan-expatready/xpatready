# X2 Links between combinations and copying a line (C1.3, C1.5): concept draft

Screens builder, 31 Oct 2026, for the founder's early look through the tech lead. **Status: v3, founder's answers recorded (31 Oct, PR #167); X2b agreed for build after F8. X2a dropped (P-106).**

**Founder's answers (31 Oct, through the tech lead, PR #167):** (1) links between combinations stay out of configuration (P-106); C1.3 becomes the case-level link in M3; X2 ships X2b only. (2) "Follows", wherever it stays, is only a suggestion of the next application. (3) The first copy-across-many slice is **form and document lines only** ("Forms and documents first").

> **Challenge outcome (read first).**
> * **B1 (Blocker, confirmed):** P-106 (founder, 26 Oct, amends P-13) says "'Linked to' leaves configuration; the link lives on the case", and the app follows it (C11.5; `engine/coverage.ts:4`). Screen 03 (25 Oct) and this draft's X2a came before it. C1.3, `PRODUCT.md` line 47 and backlog F1 were never updated.
>   * **So X2a below is parked, not built,** until the founder answers Q1.
>   * Recommendation: C1.3 becomes the case-level "relies on employer case" link in M3, and X2 ships X2b only.
> * **M1 and M2 are accepted:**
>   * Follows would be a suggestion only, carrying no picked facts; answers carry forward through the person's shared answers (TAXONOMY §3).
>   * A carried fact never counts as asked.
> * **M3 (integrity of links between combinations)** only applies if Q1 keeps links in configuration. The challenge lists it in full: retire, rename, a carried fact dropped later, a person per fact, the shared pack release, publishing.
> * **X2b is revised below** with M4 (the full set of outcomes) and M5 (one batch id across targets in one transaction, an idempotency key, and the batch Undo pattern from `fact-sources.ts`).
> * The board's Minors are listed in `challenge.md`. The board is redrawn once Q1 is answered. It adapts what Screen 03's agreed concept already says (`screens/03-combination-workspace/concept.md`: BR-12, BR-13, the Links card, the endpoints; Q1 answered) to today's app (the six tabs, card v4, the shared lifecycle with Undo). Board: `design/draft-x2b-board.html` (X2b, v3); `design/draft-x2-board.html` is the earlier v1 (X2a + X2b), kept as the record. Everything shown is Sample.

**Slices:** **X2a Links** (C1.3), then **X2b Copy a line / add or remove one line across many** (C1.5). Each is about a day and merges on its own.

## 1. Job and journey
* **X2a:** a content publisher says that this application usually rests on another one. The other one either **supports** it (an employer's LMIA supports the worker's permit) or **comes before** it (a study permit, then a post-graduation work permit). The publisher names the facts and documents the other case hands over, so a case worker never retypes them.
* **X2b:** a content publisher copies one form or document line from another combination, or adds or removes one line in many combinations at once. They see beforehand what changes in each one.
* **Persona:** the content publisher (author). The approver sees links read-only and approves them with the release.
* **Sources:** SA-1B-54 (categories that usually follow or support each other), SA-1B-61 (one change across many), SA-1B-65..70.
* **Rules this follows:** TAXONOMY §2–3 and the immigration-structure rule 4 ("supported by" across pathways, "follows" for multi-step journeys, never shared configuration).

## 2. Layers (what exists, what is new)
| Layer | In the app today | New |
|---|---|---|
| Record | `program_def.link_label`, a text label on a node, shown on the card's note line | `combination_link` (from, kind SUPPORTED_BY or FOLLOWS, to, facts[], documents[], version, status per the shared lifecycle). The text label stays until X2a replaces its one use (P-59). |
| API | none | `GET/POST /combinations/:id/links`, `PATCH/DELETE …/links/:linkId` (Screen 03 §Contract) |
| Rules | none | BR-L1..L5 below; the validator learns "a fact carried by a link counts as asked" (Screen 03 BR-7) |
| Screen | Overview has no Links card | A Links card on Overview, plus a "↔ Supported by …" line in the header |
| Copy | add one form from the library (`POST /combinations/:id/forms`) | `POST /lines/bulk/preview` and `POST /lines/bulk` (X2b) |
| Runtime | — | Not in X2: a case reading the carried facts is runtime's (Screen 03 Q1: pre-filled and "please confirm"). Before X2a ships, the link and its facts are in the release snapshot. |
| Team's code | Not checked: the `code/` capture is not in this cloud copy | The tech lead compares it on the Mac |

## 3. Business rules
* **BR-L1:** two kinds only: **Supported by** and **Follows**. A combination cannot link to itself. *Fail:* a self-link is refused with a field message.
* **BR-L2:** Follows has no loop (A follows B follows A). *Fail:* refused, naming the chain.
* **BR-L3:** a link carries only facts and documents the other combination actually has: facts it asks or fills, and document types on its checklist. *Fail:* "LMIA number is not asked in Labour Market Impact Assessment, so it cannot be carried".
* **BR-L4:** a link is a draft change of the combination it starts from. It is released with that combination's next release, by the usual approver, and never by its own author. The linked combination is not changed.
* **BR-L5:** while the other combination has no release, the link can be saved. Release of this combination then waits, with a problem that names the other combination (see Q2).
* **BR-C1 (X2b):** before anything changes, each target combination is listed with its outcome: **will change**, **already has it**, **has it with a different "only if" (kept)**, or **cannot: the way it is filed is not accepted**.
* **BR-C2 (X2b):** each target gets one draft change in its own combination. Undo is per combination until it is submitted. Retired combinations are never targets.

## 4. Layout (board `design/draft-x2-board.html`)
* **Overview › Links card:** one row per link, reading "Supported by **Labour Market Impact Assessment** · carries LMIA number, Job offer letter". Each row has a ⋯ menu (Change, Remove). "Add a link" opens a right panel with:
  1. kind, as two radios with one line each;
  2. combination, searched by its full trail;
  3. facts and documents, as tick lists filled from the other combination;
  4. Save to draft.
* **Header:** under the facts line, "↔ Supported by Labour Market Impact Assessment" links to the other combination.
* **Empty card:** "Not linked. Add a link when another application usually supports this one (an employer's LMIA for a worker) or comes before it (a study permit before a post-graduation work permit)."
* **X2b:**
  * a line's ⋯ menu gets **Copy to other combinations…** and **Remove from other combinations…**;
  * the Forms and Documents tabs get **Copy a line from another combination**;
  * the dialog shows the per-combination outcome table, then "Add to 3 combinations". After that a toast with Undo, and each combination's draft bar shows its change.
* **States:** empty, saved draft link, released link (read-only for the approver), field errors (self-link, loop, a fact the other combination lacks), conflict (409 "changed by …"), and long trails, which wrap.

## 5. Copy (front-loaded words)
* **Kind tips:**
  * Supported by: "Another application the person's case relies on, such as the employer's LMIA for this work permit."
  * Follows: "An application that usually comes before this one, such as a study permit before a post-graduation work permit."
* **Facts tip:** "On a case, these come from the linked case already filled in, marked 'please confirm'. With no linked case, they are asked as usual." (Screen 03 Q1)
* **Release problem:** "Supported by Labour Market Impact Assessment: that combination has no release yet. Release it first, or remove the link."

## 6. Contract and tests
* **Endpoints:** as Screen 03 §Contract.
* **Shape:** `Link { id, kind: "SUPPORTED_BY"|"FOLLOWS", target: { id, trail[] }, facts: string[], documents: string[], version, status }`, as zod in `contracts/links.ts`.
* **Tests, a pass and a fail per BR:**
  * L1: a link is saved / a self-link is refused;
  * L2: a chain is saved / a loop is refused;
  * L3: a carried fact is accepted / a fact the target lacks is refused;
  * L4: a link appears in the draft diff and the release snapshot / its author cannot approve it;
  * L5: a released target lets release go through / an unreleased target blocks release in words;
  * C1: each of the four outcomes;
  * C2: Undo per combination / a retired target is refused.
* **Also:** keyboard-only add-a-link, axe, 390 px, and 150 combinations in the picker within the STANDARDS §9 search budget.

## 6b. Capability or scaffolding
* **Capability:**
  * the Links card;
  * the panel;
  * the header line;
  * the bulk dialog;
  * the rules L1–L5 and C1–C2.
* **Scaffolding:** the sample's two links: worker With an LMIA supported by the LMIA, and post-graduation work permit follows the study permit. They are loaded with the sample and are Sample until the immigration expert confirms them.

## 3b. X2b rules after the challenge (M4, M5)
* **BR-C1:** before anything changes, each target is listed with one outcome:
  * **will change**;
  * **already has it**;
  * **has it with a different "only if"** (the target's own line is kept);
  * **cannot: the way it is filed is not accepted** for the target's account;
  * **cannot: the line's person is not in this application**;
  * **cannot: its "only if" uses a fact this combination does not ask**;
  * **cannot: the form is retired, or its retire is open**, in the library;
  * **waits: this combination is submitted for review.** Adding to it would withdraw that submission, so it is left out unless the publisher ticks it on purpose.
  * Removing a line across many has its own outcomes: **will be removed**, **does not have it**, **removed already in the draft**.
* **BR-C2:** one batch id across all targets, written in one transaction with an idempotency key, so a retried request adds nothing twice. **Undo of the batch** reverses every target together while none of them has changed since. Otherwise it is refused and names which target changed (the pattern in `fact-sources.ts`). Retired combinations are never targets.
* **Endpoints:**
  * `POST /lines/bulk/preview {line, op: add|remove, combinationIds[]}`, which returns the outcome per target;
  * `POST /lines/bulk {…, idempotencyKey}`;
  * `POST /lines/bulk/:batchId/undo`;
  * `POST /combinations/:id/lines/copy {fromId, lineIds[]}`, which copies a line from another combination (m8).

## 7. Questions for the founder (at most three, recommendation first)
1. **After P-106, do links between combinations still belong in configuration?**
   * *Recommend: no.* C1.3 becomes the case-level "relies on employer case …" link built with the case officer step (M3), which is what P-106 says. X2 ships X2b only, and C1.3, `PRODUCT.md` line 47 and backlog F1 are updated to match.
   * *Alternative:* keep configuration links (X2a), with the integrity rules in challenge M3. That reverses P-106.
2. **If "Follows" stays anywhere, is it only a suggestion of the next application, or does it carry chosen facts?**
   * *Recommend: a suggestion only.* Answers carry forward through the person's shared answers (TAXONOMY §3).
3. **Copy across many (X2b), first slice: which lines?**
   * *Recommend:* form lines and document lines only, with the outcomes in BR-C1. Rules and questions follow later.

## Definition of Ready (to be ticked after the challenge and the founder's look)
- [ ] X2b board clicked through by the founder · [x] challenge done (B1 answered by Q1; M1, M2 accepted; M3 dropped with X2a; M4, M5 in BR-C1, BR-C2) · [x] Q1–Q3 answered (PR #167) · [x] BACKLOG X2 row says X2b (built after F8)

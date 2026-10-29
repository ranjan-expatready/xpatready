# W1-10 AI drafting: fresh re-check (R-109) and challenge (forms lane, 29 Oct)

**Read:** `concept-draft.md` (with the founder picks of 28 Oct) and its board `design/draft-ai-drafting.html`; `screens/W1-questions-and-documents/concept-draft.md` §4; P-110 (amended 28 Oct), P-120 (confirmed 28 Oct), P-121, P-123, P-125, P-130 to P-134; backlog B37; S6 `challenge.md` and its re-check of 28 Oct (`recheck-2026-10-28.md`, on the screens branch `406ac832`, not on main yet).
**Code:** main **32961d69**, read by hand. `app/` means `prototype/studio/`.
**Sample:** which documents, conditions, checks and channels apply, and every cost below, are Sample until the immigration expert confirms them. Legal points: Unconfirmed: no counsel.

## Verdict: redesign the run, then build in slices
The job holds: AI proposes who needs which question and document and when, each with IRCC's quoted line, a draft round, a blind checker round and the rules; a person accepts in S6's one queue. Since the draft (28 Oct), three things changed under it:
1. P-130/P-131 added a second step list (seven steps) that overlaps the draft's own (five steps) without saying how they join.
2. B37 adds the filing channel to this item.
3. P-133/P-134 add reading by document kind.

The code also has **four AI producers with four copies of the round logic**, and none of W1-10's prerequisites (the S6 queue contract, shared conditions, the fact record, the Documents tab) is on main.

**Counts:** 0 Blocker · 7 Major (A1–A7) · 6 Minor (a1–a6). Founder questions: 2. Lead questions: 3.

## Major
* **A1 · One run, one step list.**
  * *Fact:* the draft's §10 lists finder, field maps, section names, "who and when + documents" and checks. P-131 lists seven steps: facts per role (rules), documents per person (AI), supplies-facts (rules, AI for new types), comes-from (rules), conditional questions (AI), PQR picks (AI), and an independent checker (AI). The draft's "checks" step is not among the seven, and P-131's PQR picks are not in the draft.
  * *Judgment:* a checker cannot be one step at the end. P-121 gives every AI proposal its own blind checker round, so Ready, Check or Decide is worked out per item, per step.
  * *Fix:* one run "Draft questions and documents" with the steps in `plan.md` §1: 4 rules steps, 5 AI steps, each AI step with its own checker round. The finder, field maps and section names stay S4's and S6's own runs.
* **A2 · Four producers, four copies of the rounds.**
  * *Fact:* `finder.ts:459` `aiRound` (draft and checker rounds, replay by files and prompt, cost first); `people-ai.ts` (S5, runtime lane, its own rules, replay and live rounds); `checklist.ts` (stub only: "Live is refused"); `ai.ts` field maps (one round, no checker). Only the comparison is shared (`engine/agreement.ts compareRounds`).
  * *Judgment:* a fifth copy for W1-10 makes five rules drift. P-121 is one rule.
  * *Fix:* slice 0 extracts one step runner (draft, blind checker, rules, `compareRounds`, the saved-result key, cost first, the caps, the saved label and Out of date). The finder moves to it first; `people-ai.ts` follows, reviewed by the runtime lane. This is the S6 re-check's R2, done once for both items.
* **A3 · W1-10 has nowhere to write yet.**
  * *Fact:* `contracts/review-queue.ts` has no proposal item contract (S6 re-check R3: kinds, payload, source and quote, both rounds, agreement, confidence). `Predicate.combinationId` is required (`schema.prisma:785`): conditions are copied per combination (S6 M6 open). S6 has not started BUILD (screens lane is on S3).
  * *Judgment:* building W1-10's queue rows before the contract means building them twice. Accepting conditions before the shared condition record makes copies that M6's back-fill must undo.
  * *Fix:* the Lead approves the item contract in `contracts/` first (S6 Q-L2). The condition steps (who and when, conditional questions, PQR picks) build after S6 slice 3 (shared conditions). The channel, documents and runner slices go first (`plan.md` §3).
* **A4 · The filing channel (B37) belongs in the finder's two rounds, not in a new step.**
  * *Fact:* the finder's `find_forms` rounds already quote each form's filing line (`filed_note`, prompt `find-forms.v1.md:17`); `finder.ts:628` turns it into a channel with `channelsFrom`. A person already sets "What IRCC accepts" through a second-person `form_accepts` change (P-123, added 27 Oct).
  * *Fix:* `find_forms` returns `channel` (PDF upload · Online · Paper · Signed PDF) with the quoted line in both rounds. Both rounds agree and `channelsFrom` does not contradict → proposed as a `form_accepts` change (Ready). The rounds disagree, or `channelsFrom` reads the line otherwise → Check, showing both. A person confirms on To review as today. Extra cost is a few output tokens per form (Sample: under US$0.01 per run).
  * *Contract risk:* `acceptedChannels` holds PDF, ONLINE and PDF_OR_ONLINE, and S5 reads it on the Forms tab (lead-check L4: keep its meaning stable). Paper and Signed PDF are added as new values; no existing value is renamed. S5's "Filed as" must show the two new values (runtime lane).
* **A5 · Document types need a reader kind (P-133, P-134).**
  * *Fact:* `DocumentType` has `suppliesFacts` and an unused `readerProfile` (`schema.prisma:740–741`). P-133: one reader per document kind (passport by rules on the coded lines; fixed layouts by Textract in Canada plus rules; letters and foreign civil records by AI vision with page citations). P-134: AI never reads identity documents.
  * *Judgment:* P-130 makes a fact "Comes from Document · type" only when that type can be read. Without a reader kind, the run cannot tell a passport from a letter.
  * *Fix:* the supplies-facts step proposes, for a new document type, the facts it supplies **and** its reader kind (Coded lines · Printed layout · Letter or record · A person reads it). A rule refuses AI vision for identity documents (passport, travel document, national identity card, PR card); that is a pass test and a fail test. W1-10 reads IRCC's guide and checklist, never a client document. Reading itself is M3 (P-134 D4).
* **A6 · The budget: the US$100 experiment cap binds before the Wave 1 cap.**
  * *Fact:* `p2/policy.ts`: `EXPERIMENT_CAP_USD = 100`, `WAVE1_CAP_USD = 60` from 26 Oct, `RUN_CAP_USD = 5`. Ledger (`p2/ledger/spend.jsonl`, read today): US$44.22 settled in all, US$2.00 since 26 Oct. P-131's plan: about US$50.
  * *Judgment:* the Wave 1 cap leaves US$58, so it fits. The experiment cap leaves US$55.78, so about US$5.8 would remain, which is less than one failed call held at its worst case (US$4.92 seen 20 Oct). No requirements, conditions or checks run exists for Visitor visa, and none has a checker round (draft §9 "Not proved"), so three repeats of an untested prompt risk paying three times for one prompt bug.
  * *Fix:* run each new AI step live **once** first, fix its prompt, then the remaining two runs. Founder Q1 decides the cap.
* **A7 · Steps that need records nobody has built.**
  * *Fact:* "facts per role" needs field maps per form edition (S6 slice 1, S6 M2). "Comes from" and the PQR tick need W1-15's per-combination fact record (runtime slice 1, after S5). The Documents tab is not built (`web/src/pages/workspace/` has overview, forms, questionnaires, preview, finder); W1-15 slice 3 now owns it, so the draft's [M2] "S5 slice 3" is replaced.
  * *Fix:* those steps run "Rules only: waiting for field maps" or "Not drafted yet" until their records exist, never with made-up inputs. Order is in `plan.md` §3.

## Minor
* **a1 · The board predates P-130, P-131 and B37.** It has no PQR picks, no Comes from, no filing channel and no seven-step run card. *Fix:* the board shows the step list of `plan.md` §1 before the founder's early look (Lead or designer).
* **a2 · Which checks are whose.** P-120 (confirmed 28 Oct): S6 drafts checks when a form enters; W1-10 drafts cross-answer checks. *Fix:* one definition. A form check reads one form's own boxes (S6). A cross-answer check reads two facts, or an answer against a document (W1-10).
* **a3 · Live only on a click.** The draft's BR-1 runs the steps "as steps of Start setup". P-125 amended 28 Oct (and S6 re-check R1) runs live only on a click; a saved result replays at once at US$0. *Fix:* BR-1 follows P-125: a saved result replays; otherwise each step offers "Draft with AI (about US$x · at most US$y)".
* **a4 · Corrections as examples change the prompt (P-130 §6.2).** *Fact:* the finder's saved results are keyed by files, fingerprints, prompt and combination. *Fix:* the examples become part of the saved-result key (a new example set marks a saved result Out of date), and they are passed as untrusted data, as `requirements.v1.md` already does for field maps.
* **a5 · `compareWhoAndWhen` is not a new module.** `compareRounds` takes the rule. *Fix:* add a `sameCondition` comparison for condition trees (same operators and fields after normal form), plus `reachable`. Both pure, each with a pass and a fail test.
* **a6 · The acceptance rate (P-130 §6.3) needs every accept, edit and reject stored with its step.** This is Capability, not Scaffolding: production reads it to flag a prompt under 70 %.

## Questions
**For the founder (recommendation first):**
1. **Q1 · The experiment cap.** P-131's plan (about US$50) leaves about US$5.8 under the US$100 experiment cap, less than one failed call.
   * *Recommend:* raise the experiment cap to US$120 (the US$60 Wave 1 cap stays), and run each new AI step once live before repeating it.
   * *Else:* keep US$100 and run field maps twice instead of three times (saves about US$4.5, Sample).
   * *Scenario:* the "documents per person" prompt misses the spouse on its first live run. Under the recommendation it is fixed after US$1.5; under three blind repeats it costs US$4.5.
2. **Q2 · The filing channel (B37).**
   * *Recommend:* the finder's two rounds propose it with IRCC's quoted line, `channelsFrom` only flags a contradiction, and it lands as today's "What IRCC accepts" change for a second person. Paper and Signed PDF are added.
   * *Else:* a separate channel step after the finder, about US$0.05 per combination more.
   * *Scenario:* IRCC's page says "Do not mail this form, even if you apply on paper; upload it". Both rounds read PDF upload, the keyword rule agrees, and the row is Ready with the quote.

**For the Lead:**
* **Q-L1 · The step runner (A2).** *Recommend:* the forms lane extracts it as slice 0, before S6 BUILD; the runtime lane moves `people-ai.ts` onto it.
* **Q-L2 · The queue item contract (A3).** *Recommend:* approved in `contracts/` before W1-10 slice 2 and S6 slice 1, with both lanes.
* **Q-L3 · The steps' order (A3, A7).** *Recommend:* as in `plan.md` §3. Channel and documents first; conditions, PQR picks and checks after S6 slice 3 and W1-15 slice 1.

## Lead response
29 Oct (Lead, by message).
* **A1–A7 and a1–a6: accepted.**
* **Founder answers:**
  * **P-138:** AI drafting of a form's masters runs only on a click; a saved draft replays at US$0.
  * **P-139 (Q1):** the experiment cap is US$120; the Wave 1 cap stays US$60. Each new step runs once live before it is repeated.
  * **P-140 (Q2):** the finder's two rounds propose the channel with IRCC's quote.
* **Not decided yet:** the channel values themselves. The founder asked for research on PDF only, online only, both, and online plus auto-filled PDFs uploaded online. **Paper and Signed PDF are not added yet** (A4, R-8 wait for that answer).
* **Q-L1, yes:** the shared step runner is slice 0; the finder moves to it first; the runtime lane moves `people-ai.ts` later.
* **Q-L2, yes:** the review-queue item contract is written in `contracts/` as a proposal (kinds, payload, source and quote, both rounds, agreement, confidence) and handed to the Lead before slice 2. S6 uses the same contract.
* **Q-L3, yes:** the order is as in `plan.md` §3.
* **Overnight (founder asleep):** BUILD slice 0 only (the runner refactor, no behaviour change, US$0) and the contract proposal with no consumers. No channel work and no live AI.

## Agreement
**Agreed 29 Oct** (Lead; founder P-138, P-139, P-140): A1–A7, a1–a6, Q-L1–Q-L3, slice 0 and the contract proposal **Go**. The channel values wait for the founder's research answer.

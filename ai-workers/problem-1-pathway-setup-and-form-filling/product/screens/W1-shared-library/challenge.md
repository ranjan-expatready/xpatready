# S6 Shared library (W1-09): challenge and slice plan

Fresh reviewer, 27 Oct 2026, before BUILD. Sources were read in this order: **P-120, P-121, P-123** (with the Lead annotations: no confirm on canada.ca downloads, uploads read by rules first) and **P-116** in `DECISIONS.md`; **walkthrough v2 S6** (`design/walkthrough-s3-s7.html#s6`, marked OK); then `concept-draft.md` (older). Also read: `STANDARDS.md`, `EXPERIENCE.md`, `WAVE-1.md`, the forms lane's S4 challenge (`origin/forms/2026-10-27-s4-form-library`, 7677dfa), the Screen 04 re-check of 25 Oct, and today's code on `main` 76628a4. The studio folder is identical in this checkout. In this file, `app/` means `prototype/studio/`.

Team code was checked for retrofit in `code/ERv2-sanitized@fb76410-2026-10-19`. `freshness.sh` cannot match that copy to a live target, so it is marked **Unverified**. Which forms a combination needs, which choices a list has, and every cost estimate below are **Sample**, until the immigration expert confirms them (costs come from the saved run records). Each objection keeps the fact (with its file) apart from the judgment.

## Verdict
**Build after these changes.** The job is right, and so is the shape: one queue grouped by source form, three plain confidence words, bulk accept only where every check agrees, and one Add in plain words. Much of the plumbing exists: AI proposals stored per item, rules comparison with the library, the exact-duplicate check, generated system names, second-person library changes, the one publisher, and replay at US$0.

The design rests on four things the code does not have yet:
1. Drafts tied to a form in the library, not to a combination.
2. A checker round.
3. AI drafting for any master other than fields.
4. Shared conditions.

One example in the agreed design (P-120's `person.parent.date_of_birth`) would break the data model. The cost of recording the replays for Load sample is above the Wave 1 AI budget. There are 8 Major objections and 7 Minor ones, and no Blocker.

## Objections, ranked (full facts, file references and fixes: `design/challenge-detail.md`)

* **M1 · "About whom" would put a person's role into the field. This breaks "one meaning, one field".**
* **M2 · Proposals belong to a combination, so nothing can be drafted "when a form enters the library".**
* **M3 · The three checks shown on every row do not exist. "Ready to accept" cannot be worked out.**
* **M4 · Only fields have an AI draft today. The queue's other five kinds have no producer.**
* **M5 · Accepting goes through three hand-offs today. Bulk accept, Undo and the second person need one path.**
* **M6 · Conditions are copied into each combination, so a shared Conditions list cannot be "defined once".**
* **M7 · Recording the replays costs more than the Wave 1 AI budget. Automatic drafting must state its cost first.**
* **M8 · Typed system names and ungoverned writes are still open on three masters. Retire skips "where used".**
* **m1 · Person roles are a fixed list of three, and form-only people are not roles.**
* **m2 · Two rows of tabs on To review.**
* **m3 · The system name is on the main path.** EXPERIENCE §5 rules out keys on the main path. **Fix:** show the generated name under "Details" in the Add dialog, read-only (P-120's "read-only" still holds).
* **m4 · Section names are a hand-written file in the code.**
* **m5 · Whether the AI "did you mean" is on or off by default.** P-95 left the meaning check off by default; P-120 shows it on every Add. Typed words cannot be replayed.
* **m6 · Load sample brings masters in from an old release, a stand-in for "AI drafts them" (P-33).**
* **m7 · Size and Undo limits.**

## Slice plan
1. **Fields, end to end, from a library form.**
   * Data: a draft per edition (M2), the checker step and the agreement rule (M3), the proposals queue API, bulk accept and Undo (M5), grouped approval for the second person.
   * Screens: the one Add for fields with the subject fix (M1); typed-key routes closed and retire by lifecycle for fields (M8); To review's AI proposals view with the three tabs and the Fields list.
   * Proof: from Reset, stub and replay only. Live: one form (IMM 5257, about US$1, Sample) once the cap counter exists.
2. **Answer lists and sections by rules.**
   * Answer lists and section groups read from the PDF (US$0), with AI section names.
   * Answer lists and Sections lists with the Add and the lifecycle.
   * The `LibraryChange` kinds and the publisher, so answer lists stop skipping the second person.
3. **Conditions and Person roles.**
   * The shared condition record and back-fill (M6), the Add from a sentence, and the prerequisite stop.
   * Person roles (m1), timed against S5.
   * The numbered menu and the help diagram.
4. **Drafts from checklists and guides.** Document types, conditions and checks arrive in the same queue from W1-10's drafts; the Checks list is read-only and grouped.

Recordings follow the founder's answer to Q1 and run after slice 1. Each slice ends with scripted journeys, a pass and a fail test for every rule, axe on every state, 1024 px and 200 % zoom. S6 stays off S4's library-form files except the shared nullable column, and syncs `main` after S4 slice 1 merges.

## Questions

**For the founder (recommendation first):**
* **Q1 · AI budget for recording the library drafts once (Sample estimate about US$49 against the US$40 Wave 1 cap).**
  * *Recommend:* raise the Wave 1 cap to US$60 for one logged recording pass, stopped at the cap. Every form, checklist and check is drafted with its checker round once, and replays at US$0 afterwards.
  * *Else:* stay at US$40. Draft fields for every form and document types for every checklist, but checks for combination 1 only. The others show "Not drafted yet" with the cost of drafting them.
  * *Scenario:* after Load sample you open To review and see "From IMM 5532: 61 proposals · Ready 44 · Check 11 · Decide 6" for every form, not only the visitor visa's.

**For the Lead:**
* **Q-L1 · Who drafts document types, conditions and checks from checklists and guides (M4)?**
  * *Recommend:* W1-10 stays with the forms lane after S4, writing into S6's item contract. S6 builds fields, answer lists and sections first.
  * *Else:* fold W1-10 into S6.
* **Q-L2 · Where the second person approves new items (M5).**
  * *Recommend:* in S6's queue, grouped by form, before release (today's gate kept, bulk for clean new items). The release review shows what was bulk-accepted (P-121).
  * *Else:* only at the release review.
* The Lead is also asked to annotate P-120's example (M1).

## Lead response
2026-10-27 (Lead). Challenge by a fresh agent the Lead launched (screen-challenge skill), checked against main 76628a4.
* **M1 accepted.** "About whom" picks the subject on the form box; the field keeps one meaning (`person.date_of_birth`, P-62). The Lead annotated P-120's example.
* **M2 accepted.** One draft per form edition, sharing S4's nullable `DraftingJob.combinationId` (S4 M7); S6 syncs main after S4 slice 1 merges.
* **M3 accepted.** The checker round and the agreement rule are built once, in S4 (P-121); S6 reuses them; saved replays are re-recorded with checker output (budget: Q1).
* **M4 accepted.** Answer lists and section groups read by rules from the PDF (US$0); AI names sections; other kinds arrive from W1-10 (Q-L1).
* **M5 accepted.** Accept writes per item, one Undo per batch, grouped approval for the second person.
* **M6 accepted.** Shared condition record with references and a back-fill; checks stay per combination in Wave 1.
* **M7 accepted.** Every automatic draft states its cost first together with the finder cost (a cost line, not a confirmation of forms); recording runs once, logged, stopped at the cap. Budget: founder Q1.
* **M8 accepted.** Typed keys closed; answer lists go through the second person; field retire uses lifecycle "where used" (P-116).
* **m1–m7 accepted as written.** m1 Person roles: **S5 creates the Person roles record** (it is the first screen to read it); S6 adds the one Add for roles on top of it. The runtime lane is told.
* **Q-L1:** agreed, W1-10 stays with the forms lane after S4 and writes into S6's queue. **Q-L2:** agreed, in S6's queue grouped by form, before release; the release review shows what was bulk-accepted.
* **Team code Unverified (freshness.sh):** noted; the retrofit check is re-run on the newest team capture before S6 BUILD.
* **Q1 (budget): founder chose US$60** (27 Oct, recorded on P-110): one logged recording pass, stopped at the cap.
* **Order:** S6 builds after S4 slice 1 merges and after S2 merges (its lane is screens). Stage stays DESIGN until then.

## Agreement
Agreed 2026-10-27 (Lead; founder on Q1). BUILD starts after S4 slice 1 and S2 merge.

## Build discoveries
_(empty)_

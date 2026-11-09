# C6.19 — Fresh challenge of concept r1 (skill screen-concept, part B)

Challenger: a fresh context that did not draft the concept, 9 Nov. Read: `concept.md` (r1, commit dc6133a49), `PRODUCT.md`, `STANDARDS.md`, `EXPERIENCE.md` §3 and §6, `QUALITY.md`, the `DECISIONS.md` rows named in the brief, `DEMO.md` row 18, SA-01B v2.1 (`domain/requirements-2026-11-02/…/SA-01B-content-pack-configurator_v2.1_2026-10-27.md`), and the app code listed below. No `design/` folder exists yet (concept §4: "follows with the build").
**Freshness:** `ai-workers/tools/freshness.sh` stops with `FileNotFoundError: code/README-copies.md` (no `code/` or `sources/` in this cloud copy). The team's code is **Unverified** here; team requirements are read from the committed name-free copy only. canada.ca cannot be reached: quotes are checked against the committed pages only.

## Verdict
**Build after these changes.** The shape is right: a C1.3-style card, copies not links, firm isolation, a seen-ids stale check, expiry rules held as data. One Blocker: a ticked copy becomes Verified by the officer. That gives Verified a second meaning and breaks the team's rule and our own P-411 (2). Five Majors need small fixes, about one rule and one test each. None of them adds a screen.

## Objections

### Blocker
**B1. One tick turns any earlier fact into "Verified by this officer"** (data and rules integrity; standards). *Needed for the proof.*
* What breaks: BR-4 (`concept.md:18`) writes each ticked copy as VERIFIED with `verified_by` set to the officer. BR-2 (`:16`) offers whatever `confirmation().confirmed` says is confirmed. That includes the principal's own Declared answers, which no staff member ever checked (`engine/runtime/case.ts:84-88`: a questionnaire answer on a client field counts as confirmed for the principal, the application and a minor). Example: Client A typed her passport number on VV-0001 and nobody checked it against the passport. On case B, one press makes it "confirmed by the officer". It leaves the Confirm list, and it would also escape the must-verify warning once that warning is built (P-242).
* Evidence (facts, high confidence): SA-01B v2.1 l.4726 and l.5918 (BR-39, "What counts as Verified has one meaning … never a per-fact tick"). SA-1B-266 rule 3 (l.4900): carried facts keep "their status from the earlier case (Declared or Verified)". Our P-411 (2): an answer staff enter "stays on the Confirm list". C1.3 writes its copies as DECLARED (`api/src/employer-link.ts:108`).
* Fix: the copy keeps the earlier answer's status. A Verified answer stays Verified and keeps its original verifier and date in `source_json`; a Declared answer stays Declared and is marked as given by the person who gave it. The officer's press is recorded as `reconfirmed_by` and `reconfirmed_at` in `source_json` (SA-1B-266 rule 4: "Yes, still true" records a date and does not change the status). The badge reads "Earlier case: VV-0001, re-confirmed 9 Nov". Build check: `confirmation()` must read a copied Declared answer as the earlier giver's, not as "entered by staff" (`case.ts:84`). Do this either by keeping the earlier channel and recording the earlier case beside it, or by adding an `earlier_case` line that defers to `origin`. Test: the client's own Declared fact arrives confirmed as the client's; a Verified fact arrives Verified with the original verifier; nothing gains Verified from the tick.

### Major
**M1. The concept leaves out the team's own requirement for returning clients (SA-1B-266), and rests on decisions not yet recorded** (retrofit; AGENTS rule 2). *Needed for the proof (records only).*
* Facts: SA-1B-266 (l.4892-4914) carries identity facts as they are, shows changeable facts as "Still true? Add anything new", warns but never blocks, and lists "No time-based re-ask" as a non-goal. The founder's choice on 8 Nov (offer every fact, re-confirm each before use, check expiry dates) differs on all three points. The concept does not cite SA-1B-266. P-419 and P-425 are not in `DECISIONS.md`: the newest row is P-411 (`DECISIONS.md:6`), and `qa/CAPABILITIES.md:71` says "to be recorded as P-419; not yet in DECISIONS.md". Yet the definition of ready (`concept.md:55`) says they are "answered".
* Fix: the Lead records P-419, the founder's 8 Nov ~09:47 IST choice, saying it amends SA-1B-266 rules 3-4 and non-goal 13 for the proof. The Lead also records P-425 or removes the citation. The concept cites SA-1B-266 and uses its words: the "Earlier case" badge (l.4725) and "Yes, still true" (rule 4).

**M2. The earlier value is not checked for change: the value copied can differ from the value the officer saw** (data integrity; BR-4's own promise). *Needed for the proof.*
* What breaks: `seen` holds only this case's answer ids (`concept.md:19`, `:43`). The POST copies the earlier case's current value at the moment of the POST. Example: the officer opens the card, and a colleague then corrects the passport number on VV-0001. The officer presses "Re-confirm and use" and writes a number they never saw: a silent copy.
* Fix: each `take` entry carries the `earlier_answer_id` that was shown. Inside the transaction, refuse with "Changed since you looked" if that id is no longer current on the earlier case (`supersededById` is not null). Test: change an earlier answer between the GET and the POST → 409, nothing written.

**M3. Expiry rules quoted from the Visitor visa page are shown as canada.ca's on every combination** (immigration fit; P-170; AGENTS rule 4). *Needed for the proof.*
* Facts: both quotes are word for word in the committed visitor-visa page (`official-sources/ircc/canada/pages/visit-canada-apply-visitor-visa.html:409`, `:411`). The demo's case B is a work permit with an LMIA. Its committed page says only "a photocopy of your passport or travel document" (`work-canada-permit-inside-forms-documents.html:315`). On case B the chip would read "canada.ca says … 6 months from the date you plan to travel", and no committed page supports that for a work permit.
* Fix: each rule in `samples/fact-expiry-rules.json` lists, as data, the program its source covers (P-425's "no program branch in code" still holds). On any other combination the same check runs, labelled "Sample (cited for Visitor visa)". Test: case B shows the expired chip with the Sample label; a Visitor visa case shows the quote.

**M4. A copied value is not checked against this case's release** (data integrity; the C1.3 pattern the concept says it reuses). *Needed for the proof.*
* What breaks: C1.3 refuses a value that is invalid on the receiving release (`employer-link.ts:98-99`, `checkValue`). The concept's rules and tests leave this out. A value from an older version of the field, such as an answer-list key since removed or a length since shortened, would be written to case B as a current answer that fills a form.
* Fix: run `checkValue(this case's snapshot, fact, value)` on each offered fact. A value with problems shows "Cannot be used: <problem>" and its tick is disabled. Add one test to the BR-2 or BR-5 pair.

**M5. Demo row 18 ("B reuses A's family facts") is claimed, but the family facts on IMM 5707 are left out** (product logic; claim honesty, P-26). *Needed for the proof, or change the claim.*
* Facts: `concept.md:7` names DEMO row 18 as the promise. IMM 5707 (Family information) is shared by A and B (`DEMO.md:8`). Case B allows only a Worker and a spouse (`samples/wave1.json`, the With an LMIA participants). The parents' facts are single facts on a relative's subject (`engine/runtime/relatives.ts`, `ONE_PERSON_RELATIONS`), found by party (`api/src/runtime.ts:117-122`). Q2 (`concept.md:51`) leaves out all relatives, so the officer retypes both parents on B: the very facts row 18 names.
* Judgment (medium confidence): include the two parents (`parent_1`, `parent_2`) of each matched person. Their keys map one to one, and the relative's subject is created by the existing locked path (`runtime.ts:140-144`). Siblings (repeating rows) and other repeating rows stay in part 2, as the builder recommends. Otherwise the concept and DEMO.md should mark row 18 as "partly shown: person facts only".

### Minor
* **m1. Expiry check when the date was not offered** (*Needed*): when `passport_expiry_date` is unconfirmed or missing on the earlier case, the passport number is offered with no expiry check at all. Fix: read the date fact from the earlier case's current answer, confirmed or not. With no date, the covered facts read "Expiry date not known on VV-0001: check the passport", as a warning. Add one engine test.
* **m2. A person whose role changed is not found** (*Needed*, cheap): BR-1 matches only the principal's name, and BR-2 requires the same role. A spouse on A who is the worker on B is missed, so facts are retyped and nothing is wrong. Fix: match people by name in any role, and show both roles ("Spouse on VV-0001").
* **m3. Two clients with the same name** (*Needed*): name matching is scaffolding (§6b). Show each earlier person's date of birth on the pick line. When both cases hold a date of birth and the two differ, do not match that person.
* **m4. Wrong source for "copies, not links"** (`concept.md:3`, `:17`): P-65 is "a changed fact marks items stale, never changes them" (`decisions/P-62-P-69-23-oct.md:10`). "Copies, not live links" comes from C1.3 BR-3 and SA-1B-283 r4 (`screens/C1.3-employer-link/concept.md:20`). Fix the citation.
* **m5. No board source** (*Not built*): `design/earlier-facts.html` is promised after the build, so the builder works from §4's text alone. That is acceptable under P-223 (4). Save the built screen's screenshot in `design/` for the morning review.

## What is sound
* Copies as ordinary append-only answers, with no migration and an audit event for the link: the same as the merged C1.3 pattern (`employer-link.ts:83-116`). Not sharing parties is correct, because relatives are found by party (`runtime.ts:117-122`, `:187-190`) and a shared party would turn a copy into a live link.
* Firm isolation with a 404, staff only, a recorded case read-only, and no values in audit text (BR-1, BR-7).
* Filing facts are never offered (BR-2). This matches SA-1B-266 rule 2 ("filing-scope facts do not"). The officer's explicit pick matches rule 6 ("No automatic merge … the officer picks").
* Different values show both and are kept unless ticked; stale ids are refused under the row lock (BR-5, BIC-07).
* Expiry rules held as data with page, quote and date. The two quotes are correct against the committed page. The police certificate rule is honestly labelled Sample. "No today date, no check passed" fails closed.
* Single facts first and repeating rows later is the right thin cut (P-348), apart from the parents (M5).

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test (pass / fail) |
|---|---|---|---|---|
| Earlier case pick | `runtime_case` same `firmKey`, `answer_subject.label` | GET `…/earlier-facts` | BR-1, m2, m3 | same firm listed / other firm 404; role change matched; date of birth differs → not matched |
| Offered fact line | `client_canonical_answer` current (earlier), `confirmation()` | GET | BR-2, M4, M5 | confirmed person fact and parent fact offered / filing, unconfirmed, unasked and invalid-on-release facts not |
| Expiry chip | `samples/fact-expiry-rules.json` (+ program it covers) | GET | BR-6, M3, m1 | expired blocked with quote on VV, Sample label on B / soon warns; missing date warns; no today refuses |
| Re-confirm and use | new answer on this case's subject (relative subject created if missing), `source_json {channel, earlier_case, earlier_answer_id, reconfirmed_by/at}`, status kept | POST `…/earlier-facts` | BR-3, BR-4 (B1), BR-5, M2 | copy written, earlier case unchanged, status kept / stale this-case id 409; stale earlier id 409; nothing Verified by the tick |
| Roles and read-only | `filing_record` | both | BR-7 | officer ok / client 403, recorded case refused |

## Questions for the founder (at most three, recommendation first)
1. **Status of a re-confirmed copy:** keep the status it had on the earlier case and record "re-confirmed by <officer>, <date>" (**recommended**: SA-1B-266 rule 3, one meaning of Verified), or let the officer's tick mark it Verified? Build on the recommendation.
2. **Demo row 18:** bring the parents' single facts in this row (**recommended**: IMM 5707's family section is the row's promise; siblings and other repeating rows come later), or show row 18 as "partly: person facts only" until part 2?
3. **Your 8 Nov choice against the team's SA-1B-266:** keep "offered, re-confirmed fact by fact, expiry checked" for the proof and record it as an amendment to SA-1B-266 (**recommended**), or follow the team: identity facts carried silently, "Still true?" only for changeable facts?

## Lead response
*Builder's answers (concept r2, commit after 07887e86a); the Lead's approval is still to come.*
* **B1 accepted, built.** The copy keeps the earlier answer's status, giver (channel, actor) and verifier; the press is `reconfirmed_by`/`reconfirmed_at` in `source_json` and shows as the answer's origin "earlier case, re-confirmed" (`api/src/runtime.ts` state()). Pack: "a fact Verified on case A arrives Verified by case A's verifier, never by the re-confirming press" (the press is made by another staff member) and "the client's own answer arrives Declared and the client's".
* **M1 accepted (records).** SA-1B-266 is cited in the concept with the three differences; P-419 and P-425 are on the Lead's branch `lead/2026-11-07-lead31` (P-419 at line 14 of its DECISIONS.md), not yet on main; the concept now says so. Recording P-419 as an amendment to SA-1B-266 is Q3 for the tech lead.
* **M2 accepted, built.** Each tick carries the earlier answer id; inside the transaction the earlier rows are read under `FOR SHARE` and must be current, else "Changed since you looked: … (on the earlier case)". Pack: a stale earlier id → 409, nothing copied.
* **M3 accepted, built.** Each cited source has `applies_to` (data, `samples/fact-expiry-rules.json`); on another combination the flag reads "Sample on this combination: canada.ca states it on …". Pack: work permit → Sample label; Visitor visa case → the quote word for word.
* **M4 already built, now tested.** `checkValue` on this case's release; on the demo data it fires for real: case A's passport country "IND" is refused by the work permit's list, shown with its reason and not tickable.
* **M5: second option.** Parents need a new relative-subject write path; thin first (P-348). Row 18 is "partly shown: the facts of the people on the case" until part 2; Q2 for the tech lead.
* **Minors:** m1 built (an unknown expiry date warns; the date is read whether confirmed or not); m4 fixed (citation); m5: the walk's screenshots go in `screens/C6.19/screenshots/`. m2 (role changed between cases) and m3 (date of birth on the pick line) not built: listed in the PR as follow-ups.

## Agreement
Lead 37, 9 Nov (message to this lane, relayed here word for word in substance): concept r2 **approved for building**. Q1 yes: parents' facts are part 2; DEMO.md row 18 reads "partly shown: the facts of the people on the case" until then. Q2 yes: P-419 amends SA-1B-266 rules 3-4 and non-goal 13 for the proof; the Lead records it. Q3 yes: the police-certificate age rule stays Sample.

## Build discoveries

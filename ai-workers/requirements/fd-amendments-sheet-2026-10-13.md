# Founder Decisions Log: ready-to-paste amendments (13 Oct 2026)

**What this is.** Five changes to the Founder Decisions Log on Drive (FD-4, FD-7, FD-8, FD-16; FD-18 added 14 Oct 2026 by AIW-D142, its band limit by AIW-D144). Each change gives the old text exactly as it is on Drive, the new text ready to paste over it, the reason, and the decision that requires it.

**Nothing has been written to Drive** (AIW-D141, confirming AIW-D10). Pasting these in is the founder's choice. **Nothing waits on it**, and it does not block any work.

**Source.** Founder Decisions Log, **document version 1.5**, last updated 2026-08-02, as captured in snapshot `sources/drive-snapshot-2026-10-13-1535/01-techno-functional/07-Founder-Decisions-Log.md` (FD-4 line 29, FD-7 line 32, FD-8 line 33, FD-16 line 52, FD-18 line 54). The text of these rows is the same as in the 11 Oct snapshot used by change note CN-FDL.

**How to paste.** Each "New text" is one complete table row. Replace the whole old row with it. The new rows follow the log's style: the replaced words are struck through and the new words follow "**AMENDED** date:". If they are placed, the log's version line should move to 1.6, with a CHANGELOG entry.

*In plain words:* "dual control" in the log means two different people must approve before something is published. A "country pack" or "Practice Pack" is the published bundle of rules and reference data (fees, wage tables) that the product uses.

---

## FD-4: Pack review gate

**Old text** (Wave-0 table, line 29)

> | FD-4 | Pack review gate | **Dual-control for rule/scoring/eligibility artifacts; platform-config toggle for reference data** |

**New text** (the second clause is replaced)

```
| FD-4 | Pack review gate | **Dual-control for rule/scoring/eligibility artifacts**; ~~**platform-config toggle for reference data**~~ **AMENDED 2026-10-11:** reference data in a published country pack (fees, wage tables) also needs two people, matching SA-01 v2.4 §3.12 (AIW-D48); **and in a published Practice Pack**, as for country packs (FD-22 A22-6.6) (AIW-D75) |
```

**Reason.** The log let the platform switch two-person review off for reference data such as fees and wage tables. The team's own SA-01 v2.4 §3.12 already puts the whole published pack under two people, so the log and the specification disagreed. The founder chose two people for all reference data, in country packs and Practice Packs alike, so there is one rule for every pack.

**Source decision(s).** AIW-D48 (11 Oct 2026, "Two people for all"); AIW-D75 (11 Oct 2026, "Yes, two people for all packs"). Change note CN-FDL changes 1 and 12. Related clauses: SA-01 v2.4 §3.12; FD-22 A22-6.6; SA-1B-44 (CN-SA-01B change 3).

---

## FD-7: AG-17 Recruiter

**Old text** (Wave-0 table, line 32)

> | FD-7 | AG-17 Recruiter | **Light-evidence** (LMIA recruitment-effort evidencing, not ATS-grade) · **no candidate identity plane** (records-only) · **CP-9 employer sees read-only summary**. ATS-grade = plan-gated growth path |

**New text** (the third clause is replaced)

```
| FD-7 | AG-17 Recruiter | **Light-evidence** (LMIA recruitment-effort evidencing, not ATS-grade) · **no candidate identity plane** (records-only) · ~~**CP-9 employer sees read-only summary**~~ **AMENDED 2026-10-11:** the employer's read-only recruitment summary tile is deferred to a later release, as the team's CP1-D7 plans; AIW-D67's full employer actions (upload, pay, sign, seat management) stand (AIW-D73). ATS-grade = plan-gated growth path |
```

**Reason.** The log promised employers a read-only recruitment summary on their portal in this release. The team's own plan (CP1-D7) defers that summary tile. The founder chose to defer it, because employers already get the actions that matter (upload, pay, sign, manage seats). This is not an AI change; it only makes the log match the team's plan.

**Source decision(s).** AIW-D73 (11 Oct 2026, "Defer the tile"); AIW-D67 (full employer actions stand). Change note CN-FDL change 10 and open point 1. Related clauses: AG-15 CP1-D7; AG-17-30; Doc 4 §3.9 and §13 item 8.

---

## FD-8: Doer naming

**Old text** (Wave-0 table, line 33)

> | FD-8 | Doer naming | **Clocker** (time-tracking; not "Timer") · **Reminder folds into Minder** (one nudge identity; AG-13 §3.2 retitled; naming spec amended) |

**New text** (the second clause is replaced and one naming line is added)

```
| FD-8 | Doer naming | **Clocker** (time-tracking; not "Timer") · ~~**Reminder folds into Minder** (one nudge identity; AG-13 §3.2 retitled; naming spec amended)~~ **AMENDED 2026-10-11:** **Minder** (watches dates) and **Reminder** (sends nudges) stay two tools (AIW-D51) · the AI Doer that drafts messages and letters for a person to approve is **Writer**; the four AI Doers are Reader, Sorter, Writer, Checker; **Drafter** stays the template engine (AIW-D53) |
```

**Reason.** The log merged Reminder into Minder, but every October team document keeps them as two tools: one watches dates, the other sends nudges. The founder chose to match the team. The AI tool that drafts messages also gets its own name, Writer, so Drafter keeps meaning the template tool and the two are not confused. Clocker is unchanged.

**Source decision(s).** AIW-D51 (11 Oct 2026, "Amend FD-8 to match the team"); AIW-D53 (11 Oct 2026, "Writer"). Change note CN-FDL change 2. Knock-ons named there: AG-13 "Timer" becomes Clocker (CN-AG-13); AG-11 run log value `DRAFTER` becomes `WRITER` (CN-AG-11); SA-03 v2.20 catalogue row 30 (CN-SA-03 change 1).

---

## FD-16: AI posture

**Old text** (Blueprint table, line 52)

> | FD-16 | AI posture (blocker: gates the identity spine) | D | **"AI assists, humans decide."** The eligibility/scoring/workflow engine stays fully deterministic, versioned and explainable — no model output is ever a decision. AI is a bounded, declared capability layer over the machinery (drafting, summarisation, document extraction, suggestion) whose every output is human-approved before it has effect. **Consequence:** AI is NOT a first-class actor — no AI principal in the identity spine, no autonomous permissions, no new plane. AI features are ordinary capabilities in the Capability Registry (`cap.ai.*`), plan-gated, per-tenant opt-in, with provenance recorded on any AI-assisted artifact. Marketing may say "AI-assisted"; it may not say the AI decides. |

**New text** (the original words are kept; four dated lines are added at the end of the decision cell). The first three lines were already proposed in CN-FDL changes 9 and 15 but never placed, so they are included here so that one paste brings the row fully up to date. The fourth line is the new amendment required by AIW-D132.

```
| FD-16 | AI posture (blocker: gates the identity spine) | D | **"AI assists, humans decide."** The eligibility/scoring/workflow engine stays fully deterministic, versioned and explainable — no model output is ever a decision. AI is a bounded, declared capability layer over the machinery (drafting, summarisation, document extraction, suggestion) whose every output is human-approved before it has effect. **Consequence:** AI is NOT a first-class actor — no AI principal in the identity spine, no autonomous permissions, no new plane. AI features are ordinary capabilities in the Capability Registry (`cap.ai.*`), plan-gated, per-tenant opt-in, with provenance recorded on any AI-assisted artifact. Marketing may say "AI-assisted"; it may not say the AI decides. *Read 2026-10-11 (AIW-D71): an internal, reversible, audited filing label (the Reader's proposed document type) is not an "effect" under this decision, so high-confidence types may later be applied without a person's click; in the pilot every type still goes to a person, and the pilot's accuracy figures set the threshold. Values read from documents always need a person (AG11-D10).* *Narrowed 2026-10-12 (AIW-D92): every capability and output belongs to one of four classes (rules only, AI explains rule results, AI language, person only); the phrase "AI-assisted" is not used for assessments, scoring or any rules-only capability.* *Read 2026-10-12 (AIW-D93, AIW-D103): the assistant may call read tools and action tools under the delegated person's permission and may prepare consequential acts, but every act with an effect is approved by an authorised person before it takes effect, bound to the exact preview; "no model output is ever a decision" stands.* **AMENDED 2026-10-13 (AIW-D132):** four kinds of work take effect without a person's click: (1) the product's own rules-based automation (AG11-D1); (2) a message from the firm's published template (AIW-D120, AIW-D105); AI-written or AI-edited text still waits for a person; (3) routine, reversible internal work that has earned automatic running (AIW-D104; AW-1-136); (4) starting the eligibility assessment once the evidence check passes; telling a lead or client the result stays a licensed person's act (AIW-D41). Everything else stays "human-approved before it has effect". |
```

**Reason.** As written, FD-16 says every AI output needs a person's approval, with no exceptions. Read literally, a developer could block a firm's own published reminder template inside an AI job, and a client could miss a document deadline. The founder chose to name the four kinds of work that may take effect without a click, and to keep everything else under approval. The earlier readings (document labels, the four output classes and the "AI-assisted" limit, tool use under approval) were decided on 11 and 12 Oct but are not yet in the log either.

**Source decision(s).** AIW-D132 (13 Oct 2026, "Amend FD-16, all four"), which also makes exception (4) the founder's decision rather than a Lead ruling (AIW-D106 note (a)). Earlier lines: AIW-D71 (CN-FDL change 9); AIW-D92, AIW-D93, AIW-D103 (CN-FDL change 15). Exceptions cite AG11-D1, AIW-D120, AIW-D105, AIW-D104, AW-1-136, AIW-D41. FD-16's core is kept: AIW-D13 ("Keep FD-16, delegate") and AIW-D33 (the delegation record fits FD-16). **Gap:** CN-FDL does not yet carry the AIW-D132 change (it still says FD-16 "keeps its words"); this sheet supplies the wording.

---

## FD-18: Pricing and packaging shape (added 14 Oct 2026)

**Old text** (line 54)

> | FD-18 | Pricing & packaging shape | C | **Per-seat tiers by firm size** (Solo / Small 2–5 / Firm 6+), capabilities switching on progressively by plan through the Capability Registry, plus metered add-ons for consumption rails (e-sign envelopes, SMS, storage overage). Buy-up is always allowed — size *suggests* a plan, it does not enforce one. **This resolves the SHAPE only.** The cell values (which capability at which tier) and the numbers remain **C-2 / C-3 / FD-6** and are still open. |

**New text** (the per-seat words and "size suggests a plan" are struck through; the rest is unchanged)

```
| FD-18 | Pricing & packaging shape | C | ~~**Per-seat tiers by firm size** (Solo / Small 2–5 / Firm 6+)~~ **AMENDED 2026-10-14: per firm, users included, in bands** (Solo / up to 4 / up to 10 / a priced band above 10, e.g. up to 25); seats are a plan limit, not a price (AIW-D142); capabilities switching on progressively by plan through the Capability Registry, plus metered add-ons for consumption rails (e-sign envelopes, SMS, storage overage). Buy-up is always allowed~~ — size *suggests* a plan, it does not enforce one~~. **AMENDED 2026-10-14:** the user band is a hard limit; a firm at its band's user limit moves up a band before adding a user, at once (SA3-D15, SA4-D24; AIW-D144). **This resolves the SHAPE only.** The cell values (which capability at which tier) and the numbers remain **C-2 / C-3 / FD-6** and are still open. **AMENDED 2026-10-14:** shape only; every price, band price and AI prepared-file allowance stays a Proposal, set from cost to serve and pilot results (AIW-D111, AIW-D142). |
```

**Reason.** FD-18 priced per seat, while the business plan (`commercial/plan.md` v1.1 §3) priced per firm and asked the founder to decide (§8 action 3). Most Canadian rivals price per firm, and the team's billing already prices a plan, with seats only as a limit (SA-04 SA-4-1; SA3-D14). The founder chose per firm with users included in bands, and kept every amount open until cost and pilot results exist. Because the team's seat limit is hard (SA-03 v2.20 SA3-D15: "refused at the limit"), a firm of five cannot stay on "up to 4"; the founder then chose a hard limit with an immediate upgrade, so "size suggests a plan" no longer holds (AIW-D144).

**Source decision(s).** AIW-D142 (14 Oct 2026, "Per firm, with users included in bands …"); AIW-D111 (workflow pricing; amounts set from measured cost and benefit). AIW-D144 (14 Oct 2026, "Hard limit: upgrade"; asked by the checker): "size suggests a plan" is dropped. FD-18's metered add-ons and buy-up are unchanged.

---

## Checks

| Check | Result |
|---|---|
| FD-4 old text matches snapshot line 29 word for word | Yes |
| FD-7 old text matches snapshot line 32 word for word | Yes |
| FD-8 old text matches snapshot line 33 word for word | Yes |
| FD-16 old text matches snapshot line 52 word for word | Yes |
| FD-18 old text matches snapshot line 54 word for word | Yes (copied by script from the snapshot, 14 Oct 2026) |
| Decision found that requires changing FD-18 | Yes: AIW-D142; band limit AIW-D144 (14 Oct 2026) |
| Snapshot document version | 1.5, last updated 2026-08-02; same text as the 11 Oct snapshot |
| Decision found that requires changing FD-4 | Yes: AIW-D48, AIW-D75 |
| Decision found that requires changing FD-7 | Yes: AIW-D73 |
| Decision found that requires changing FD-8 | Yes: AIW-D51, AIW-D53 |
| Decision found that requires changing FD-16 | Yes: AIW-D132 (plus the AIW-D71, AIW-D92, AIW-D93 and AIW-D103 lines not yet placed) |
| Each AIW-D ID cited exists as a row in `ai-workers/decisions.md` | Yes: AIW-D10, AIW-D13, AIW-D33, AIW-D41, AIW-D48, AIW-D51, AIW-D53, AIW-D67, AIW-D71, AIW-D73, AIW-D75, AIW-D92, AIW-D93, AIW-D103, AIW-D104, AIW-D105, AIW-D106 (note (a)), AIW-D120, AIW-D132, AIW-D141 |
| Other clause IDs (SA-01 §3.12, FD-22 A22-6.6, CP1-D7, AG11-D1, AG11-D10, AW-1-136) | Taken from CN-FDL and decisions.md; not re-read against the team documents in this draft |
| File location | `requirements/fd-amendments-sheet-2026-10-13.md`, as AIW-D141 names; drafted by a helper, checked and placed by the Lead (13 Oct 2026). Retired wording "AI teammates" in the AIW-D93 reading replaced by "the assistant" (AIW-D124) |

# B-clocker: the Clocker, also called the Timer (billable time)

**Reference index. The source documents remain the only source of truth.**

*Workstream 2 baseline, carve-out B. Prepared 9 Oct 2026 from `sources/drive-snapshot-2026-10-09/` (newest snapshot) and the founders' June specs in `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/`. Faithful carve-out: each quote is a short identifying extract (at most 25 words, rule AIW-D22), word for word with bold, italics and code marks removed; "…" marks an omission. Open the cited line for the full requirement. No rewording, no improvements. Every extract was machine-checked against the cited line.*

**What it is for.** The Clocker records time spent on a client, case or other record, marks it billable or not, works out the amount from an hourly rate, and passes billable time to invoicing (the Biller, AG-06). Staff either start and stop a live timer or type an entry by hand. **Who uses it:** any staff member who logs time; the accounts person who bills it (AG-13, AG-06). **What it replaces (founders' spec):** the spec lists "Timer (billable-time tracking)" only as a future Doer, with no product named. **Naming:** the Founder Decisions Log (FD-8) renames it "Clocker" ("not Timer"); the October AG-13 file still calls it "Timer". This file covers both names.

**Sources used in this file** (short name, then file):

- Founders naming spec v1 (2026-06-13): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-13-er-doers-brand-naming-spec.md`
- FDL v1.5: `sources/drive-snapshot-2026-10-09/01-techno-functional/07-Founder-Decisions-Log.md`
- Doc 2 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/04-Doc-2-SuperAdmin-Console.md`
- AG-13 v1.12: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-13-tasks-reminders-notes-and-activity-audit_v1.12_2026-10-07.md`
- AG-06 v1.7: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-06-billing-and-payments_v1.7_2026-10-07.md`
- SCOPE-TRIAGE 2026-10-05: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/SCOPE-TRIAGE_2026-10-05.md`
- Doc 3 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/05-Doc-3-Agent-Console.md`

**How to read the table.** "Release label as written" repeats the source's own release words; where the cited line gives none, it says so. A conflict or overlap names the other row or source. Rows are grouped: definition and naming first, then what it does, inputs and outputs, human steps, triggers, audit, release, and the older July documents (Doc 1–4) last.

| Req ID | Exact words | Source (file, version, section, line) | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| SPEC-N future Doers | "Timer (billable-time tracking)" | Founders naming spec v1 (2026-06-13), §5 Roster, Future Doers "(confirm when built)", L85 | Future (confirm when built) | Renamed Clocker by FD-8 (FDL L33). |
| FD-8 | "FD-8 \| Doer naming \| Clocker (time-tracking; not "Timer") · Reminder folds into Minder (one nudge identity; AG-13 §3.2 retitled; naming spec amended)" | FDL v1.5, Wave-0 batch, resolved 2026-07-03, L33 | None stated (binding for spec authoring, FDL L22) | October AG-13 v1.12 still uses "Timer" throughout (L314, L395, L434). The naming spec in the code copy was not amended (SPEC-N L85 still says Timer). |
| DOC2 capability | "cap.clocker \| cross-cutting.time (the Doc 3 AG-13 time-tracking context; Doer name Clocker per FD-8) \| DOER \| — \| feature.clocker \| baseline" | Doc 2 v1.4, SA-CT capability registry seed table, L88 | "baseline" (illustrative tier) | — |
| DOC2 FD-8 note | "cap.clocker registers the Clocker — the time-tracking Doer of the Doc 3 AG-13 context ("Timer" rejected: it names a thing, not a doer)." | Doc 2 v1.4, SA-CT, "Clocker and the Reminder fold", L103 | None stated | — |
| DOC2 money flow | "AG-6 TIME_BASED billing consumes Saved Clocker entries (the Clocker feeds the Biller; it never calls it)." | Doc 2 v1.4, SA-CT, L103 | None stated | See B-biller. |
| AG-13 §3.6 how it works | "The Timer captures billable/non-billable effort on an entity … It attaches to any entity via the polymorphic key and flows to billing/invoicing (AG-6)." | AG-13 v1.12, §3.6 Timer (billable time) — a related-but-distinct Doer (brief), L316 | None stated | Doc 3 v1.4 L6295 says the same under the name "Clocker". |
| AG-13 §3.6 behaviour | "One-click start/stop timer from any entity (live elapsed) or manual entry; type + billable defaults per firm; entries roll into the case's billable total …" | AG-13 v1.12, §3.6 World-class behaviour, L320 | None stated | — |
| AG-13 §3.6 data flow | "Start/stop or manual → compute timeSpent + billingAmount (if billable) → write Timer entry with (entityType, entityId) + firm_id → timeline event → consumed …" | AG-13 v1.12, §3.6 Data flow, L322 | None stated | — |
| AG-13-50 | "Capture billable/non-billable effort (date, minutes, type, description, billable, rate → derived amount) on any entity (polymorphic key); stamp firm_id (today: no tenant column)." | AG-13 v1.12, §4 Timer FRs, L396 | None stated (status "exists, changed") | — |
| AG-13-51 | "One-click start/stop live timer from any entity (in addition to manual entry)." | AG-13 v1.12, §4 Timer FRs, L397 | None stated (status "NEW") | TRI L178 proposes to drop the live start/stop timer; AG-13 §13 Q8 (L705) leaves it open. |
| AG-13-52 | "Flow to AG-6 billing (roll-up, invoice) — deeper billing stays in AG-6; edits audited; appears on timeline." | AG-13 v1.12, §4 Timer FRs, L398 | None stated | — |
| AG-13 BR-17 | "Timer entries are effort/money records, separate from Tasks and from the Activity feed; billing semantics live in AG-6." | AG-13 v1.12, §5 Business rules, L434 | None stated | Doc 3 L6376 has the same rule under "Clocker". |
| AG-13 §6 lifecycle | "Timer entry — Running (live) → Stopped/Saved → Edited (audited) → Invoiced (consumed by AG-6) / Written-off (AG-6)." | AG-13 v1.12, §6 States, L473 | None stated | Doc 3 L6297 adds a "Discarded" state and the one-running-timer-per-user rule, absent in October. |
| AG-13 user story | "Given I log a billable Timer entry (90 min @ rate) on a case, When saved, … and is available to AG-6 for invoicing; edits …" | AG-13 v1.12, §8 User stories, L542 | None stated | — |
| AG-13 permissions | "Time entries: agent/time-and-activity:* is replaced by five keys, agent/time-entry:view.own, :view.all, :create, :edit, :delete" | AG-13 v1.12, Change log v1.12 (SA6-D10), L6 | None stated | Doc 3 L6525 still uses agent/time-and-activity:*. |
| AG-13-67 visibility | "A note, task, reminder or time entry attached to a client or case SHALL be visible exactly to the users who can see that …" | AG-13 v1.12, §4 Case-linked work, L412 | None stated | — |
| AG-13 §13 Q8 | "do we want a live start/stop Timer widget in Release 1, or manual-entry only?" | AG-13 v1.12, §13 Genuinely open, L705 | Open founder question | Contradicts AG-13-51, which states the live timer as a requirement, and Doc 3 L6581 (live timer "IN"). |
| AG-06 time-based line | "Time-based \| Billable hours rolled from logged Time & Activity \| Taxable per TaxProfile" | AG-06 v1.7, AG-06 line kinds table, L184 | None stated | Consumer side (see B-biller). |
| AG-06 bill from work | "a time-based invoice rolls from billable Time & Activity (already supported)" | AG-06 v1.7, AG-06 world-class behaviour, L194 | None stated | — |
| TRI AG-13 | "Subtasks, task templates, timer" | SCOPE-TRIAGE 2026-10-05, AG-13 Proposed to move, L177 | Proposed to move to Release 2 (list meaning, TRI L7) | TRI is a review file (TRI L3). |
| TRI AG-13 drop | "(drop) Note pin · live start/stop timer" | SCOPE-TRIAGE 2026-10-05, AG-13 Proposed to move, L178 | "(drop)" | — |
| DOC3 §3.6 (July) | "3.6 Clocker (billable time) — a distinct Doer" | Doc 3 v1.4, AG-13 §3.6 heading, L6293 | None stated | October AG-13 L314 heading says "Timer". |
| DOC3 §3.6 live run (July) | "Invariant: at most one Running entry per user per firm, DB-enforced by a partial unique index" | Doc 3 v1.4, AG-13 §3.6, L6297 | None stated | Not carried into October AG-13 v1.12. |
| DOC3 §3.6 naming (July) | "FD-8 (founder-confirmed 2026-07-03) names this Doer the Clocker — "Timer" was rejected as naming a thing, not a doer" | Doc 3 v1.4, AG-13 §3.6 naming note, L6297 | None stated | — |
| DOC3 AG-13-53 (July) | "minutes SHALL be server-derived at stop, never client-supplied for a live run" | Doc 3 v1.4, AG-13 §4, L6350 | None stated | No October equivalent of AG-13-53. |
| DOC3 deferrals (July) | "live start/stop Clocker timer (IN, AG-13-51)" | Doc 3 v1.4, AG-13 resolved deferrals, L6581 | "IN" | October AG-13 §13 Q8 reopens it; TRI L178 proposes to drop it. |

Requirement rows: **26**.

## Gaps noticed

- Naming conflict: FD-8 (ratified 3 Jul 2026) and Doc 2/Doc 3 say Clocker; October AG-13 v1.12 and the founders' June spec say Timer. Doc 3 L6297 also notes the entity names stay TimerEntry.
- Release status is unclear: no October phasing row names time tracking (Agent 99-Phasing v1.4 L19 lists AG-13 tasks, reminders, notes, timeline and audit only). The live timer is a requirement (AG-13-51), an open question (AG-13 Q8) and a drop proposal (TRI L178) at the same time.
- Fully deterministic: minutes times rate gives the amount. The only human step is entering or confirming time. Doc 3 (July) had a "confirm-or-adjust" flag for long-running timers; October does not.
- Audit: edits and deletes are audited (AG-13 L322, AG-13-52); creation is not stated as audited.
- No AI or automation trigger is specified for the Clocker. Inferred: no Conductor recipe calls it.

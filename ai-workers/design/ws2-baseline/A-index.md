# A — Index: Workstream 2 baseline, carve-out A (the engine and AI)

> Reference index. The source documents remain the only source of truth.

**What this is.** Wave W2, step 1, carve-out A. Every requirement about the Conductor (automation engine), the four AI Doers, approvals and autonomy, the AI switch and provider, AI logging, identity of automated actions, the founder decisions on AI, and the founders' autopilot spec, listed with requirement ID, file, version, line and a short exact quote. Faithful carve-out only: no rewording, no improvements (step 2 does that). Written 9 Oct 2026 by requirements-cartographer.

**Sources.** Newest Drive snapshot `sources/drive-snapshot-2026-10-09/` only (AG-11 v1.11 read in full; the other modules read at the AI, automation and approval sections, located through the W1 inventory and then opened at source). Charter V2 read from the slide text extracted from `Program Charter_V2.pptx`. Founders' autopilot spec read in full from `code/expat-ready-api@c4117a3-2026-10-09/`. Archive not used.

**Rules applied.** AIW-D22 (9 Oct, coordinator): reference index, quotes 25 words or fewer, the sources stay the only source of truth. Proposals found while reading were appended to `ai-workers/proposals.md` (AIW-D23), four rows marked "carve-out A".

## Files

| File | What it covers | Rows (requirement references) |
|---|---|---|
| `A-conductor.md` | The engine: model, decisions AG11-D3/D5/D18, AG-11-1 to 50, triggers, recipes, imports, WhatsApp sending, BR-1 to 19, open questions, Doc 1/Doc 3/SA-08/SA-12 definitions, Charter statements | 120 |
| `A-ai-doers.md` | Reader, Sorter, Drafter, Checker in AG-11, AG-08, AG-09, AG-10, AG-07, AG-18, glossaries, SA-01B, Doc 3 and other AI-adjacent mentions (SA-05, SA-10, AG-12, AG-14) | 133 |
| `A-approval-and-autonomy.md` | Product floors, autonomy levels, Needs you / Done for you, standard messages review, approve = verify, Team safeguards, licence-aware approval (AG-11, AG-10, AG-07, AG-08, AG-09, AG-16, AG-18, AG-01, SA-06, Overview, FD-22) | 159 |
| `A-ai-switch-provider-residency.md` | AI processing-terms gate, one firm switch, Canada-only processing, injection safeguards, kill switch, plan gating (AG-11, AG-16, AG-10, AG-09, AG-18, SA-03, SA-04, SA-06, SA-08, SA-11, SA-12, Doc 1), plus a code fact | 90 |
| `A-ai-logging-and-audit.md` | Run history, AiRunLog, model-call logging, approval audit, provenance, retention, actor fields | 41 |
| `A-identity-and-on-behalf.md` | FD-16 (no AI principal), Doc 3 non-human principal (A4-1), identity pools, roles, actor types, Filler counts as no person | 22 |
| `A-founder-decisions.md` | FD-16, FD-20, FD-8, FD-22, A22-1, D-6; who decided AG11-D1..D18; every release statement on AI and the engine | 32 |
| `A-autopilot-spec.md` | Founders' RNA autopilot design (18 Jun 2026, for founder review, not ratified) | 30 |
| **Total** | | **627** |

Quote check: a script compared all 688 quoted fragments with the source lines cited (window of the cited line ±1), plus every quoted phrase in the conflict columns and gap notes against the whole corpus. Result: 0 mismatches, 0 quotes over 25 words.

## Deliberately left out of carve-out A, and why

| Item | Reason |
|---|---|
| Non-AI Doers in detail: Signer, Scheduler, Biller, Qualifier, Filler, Binder, Reviewer, Minder internals, Reminder, Tasker, Mailer, Messenger channel detail, Dialer, Reporter, Finder, Clocker | Carve-out B owns them. Where AG-11 itself specifies the Minder (AG-11-17 to 20, 47 to 50) or WhatsApp sending (AG-11-103 to 105), the rows are kept here because AG-11 is in A's scope in full, and marked "Overlap: carve-out B". |
| AG-11 user stories US-1 to US-32 and most edge cases (§8, §9) | They restate FRs; a few are cited where they add a fact (US-27, edge cases L1082, L1084, L1095). |
| AG-11 §7 entity field lists other than ApprovalItem, AiRunLog and firm AI settings; §10 permission keys other than configure-ai, set-autonomy and approval keys | Data and permission detail for the build; no new requirement content for AI. |
| AG-02 next-best-action, lead scoring, work-queue ranking; AG-03 what-if levers; AG-10 unmatched-email scoring formula (Doc 3) | Rule-based, not AI, per their own sources (W1 inventory doc3-firm Part 3). |
| AG-15 anomaly detection (security), AG-17, Doc 4 portal | No AI, automation-engine or approval content beyond what is cited; AG-17's escalation defaults appear only as the AG-11 §0.2 knock-on. |
| SA-06 full permission table, SA-07 platform users, SA-09 analytics | No AI content beyond the rows cited (SA-06 configure-ai, set-autonomy, licence rules; SA-7-3). |
| SA-02 support sessions in full | Only SA-2-17 and SA2-D14 kept, as the nearest pattern for acting on someone's behalf. |
| Moat playbook spec (`2026-06-13-er-doers-moat-reservation-playbook.md`) and the June Doer naming / IA specs | Not in carve-out A's brief (only the autopilot spec was named); review W1 M-2 flags the moat playbook as unread. |
| Workstream decisions (AIW-D1, D13, D14) | Not product sources; referred to in intros only. |

## Open questions for the Lead (facts, each detailed in the files)

1. Which source wins on release for AI and the engine (Charter vs AG-11 / Phasing vs SA-01B). Proposal row added.
2. How an AI or automation action for a named person is recorded (FD-16 vs Doc 3 A4-1; no on-behalf-of field anywhere). Proposal row added.
3. Licensed sign-off is recorded, not verified, and the Owner may widen it; FD-22 puts supervision rules in the Practice Pack. Confirm with counsel / RCIC. Proposal row added.
4. Reader vs Sorter document typing; AI plan gating closed vs pending; SA-08 still forbids outside providers. Proposal row added.
5. The founders' autopilot spec's review outcome is not recorded anywhere in the snapshot (Unknown).

# CN-AG-16: change note to AG-16 Firm Settings and Integrations

| Field | Value |
|---|---|
| Module changed | AG-16 Firm Settings & Integrations |
| Version and file | v1.13 of 10 Oct 2026, `02-functional-requirements/agent/AG-16-firm-settings-and-integrations_v1.13_2026-10-10.md` (Drive snapshot of 11 Oct 2026, `sources/drive-snapshot-2026-10-11/`; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 (second fix round, after re-check S3c-b) |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-16-55 to AG-16-57 (highest AG-16-54, L495; a search of the whole file finds no AG-16-55 or above) |
| One home | This note holds the firm settings and the export scope; what the assistants do when a setting changes lives in AW-01 v0.1, which cites these IDs. The approve-all safeguard values and the spend caps are platform settings with their one home in SA-12-33 (CN-SA-12); this module only shows them. |
| Companion files | CN-AG-11 items 1, 6, 8 and 9; AW-01 v0.1 (firm AI assistants, delegation, emergency stops); Super Admin half: CN-SA-08 (the provider record), CN-SA-12 (emergency stops, recall, AI settings); `requirements/provider-test-script.md` (the test call) |

**In plain words.** The firm's one AI switch stays locked until Expat Ready has recorded a provider that processes in Canada, with no-training and no-retention terms and a test call that passed (the founder, 11 Oct). Three settings are added for the founder's other safety decisions and the assistants: what the firm sees when AI is stopped (everything pauses; nothing sends; on release each waiting item must be approved afresh); a pause of client-facing AI preparation while the firm has no licensed user (on by default, provisional until counsel); and, under Advanced, one switch per assistant. These switches are firm settings, not plan features: the four AI Doers are one sellable extra, and each assistant is a setting inside it. The same screen shows, read-only, the approve-all safeguard values and the spend caps that Expat Ready sets; the firm may tighten them, never loosen them. The firm's data export gains the AI records and the provenance view, and "Drafter" (the AI one) becomes "Writer".

**What the team changed on 10 Oct (v1.13).** Own-account rails are one sellable extra and the four AI Doers are one extra with one switch (AG-16-35; SA-03 v2.17 feature catalogue row 30, L345: "AI Doers (Reader, Sorter, Drafter, Checker — one switch, AG-16-35)"). So the per-assistant switches below are firm settings under Advanced inside that one extra, never separate plan features or catalogue rows. AG-16-35 itself still says "which Doers or volumes are plan-gated is still open (§13 Q7)" (L470); SA-03 v2.17 has settled that part (a team wording to align, not a Workstream 2 change). Nothing proposed here was already made.

**Terms used.** *Pause mark*: the reason shown on a waiting item that may not be sent (AG-11 `ApprovalItem.stopMarker`, CN-AG-11 item 6). *Pilot safeguards setting*: the platform setting, on from the start and switched off only by a recorded founder decision, that locks the founder's approve-all safeguards and spend caps (SA-12-33, CN-SA-12; AIW-D57, D59). *Tighten*: make a safeguard stricter (for example open more values first, or a lower spend cap).

---

## 1. The AI switch waits for the provider record, including a passed test call

1. **Where.** AG-16-35 (L470); §3.9 (L336); `FirmAiSettings.termsRecorded` (L578).
2. **Current words.**
   > L470: "**The setting SHALL be locked off for every firm until Super Admin has recorded the AI provider, the processing region (Canada only, AG11-D15) and a no-training / no-retention agreement (SA-08, SA-11);** while locked, no AI Doer SHALL run and the screen SHALL say why."
   >
   > L578: "`termsRecorded` (read projection of the Super Admin record of provider, region (Canada only, AG11-D15) and no-training agreement — SA-08 / SA-11; while false the switch is locked)"
3. **Proposed words.** AG-16-35: "**The setting SHALL be locked off for every firm until Super Admin has recorded the AI provider record (SA-8-49) — the provider, a processing region in Canada (AG11-D15), the no-training and no-retention terms, and a passed test call from that region (SA-08, SA-11);** while locked, no AI Doer SHALL run and the screen SHALL say why." `termsRecorded`: "read projection of the Super Admin provider record (provider, region in Canada, no-training and no-retention terms, passed test call — SA-8-49, SA-11); while false the switch is locked". No requirement names a provider.
4. **Why.** AIW-D52 (the founder: "Only in Canada … confirmed by one test call"); AIW-D69 ("the result goes into the provider record the product requires before the AI switch unlocks (AG-16-35, AG-11-93)"); AIW-D27 (provider and region decided before AI is switched on); IMP-6 (the field says only "no-training", still so at L578); `00-step3-plan.md` "The provider is replaceable" and "The provider record" (a *passed* test call).
5. **Knock-ons.** AG-11-93 (CN-AG-11 item 8); SA-08 SA-8-49 and SA-11 §3.6 (Super Admin half).

## 2. When AI is stopped or switched off: everything pauses, and the firm sees why

1. **Where.** §13 item 7 (L852); §9 edge cases (L705, L714); new requirement **AG-16-55**.
2. **Current words.**
   > L852: "Still open: which AI Doers or volumes sit behind which plan (SA-03), and what the Owner sees if Super Admin later withdraws the terms."
   >
   > L714: "waiting items are not deleted and never execute because of the change (AG-16-37); what the queue shows for them afterwards is open (§13 Q9)."
3. **Proposed words.**
   > **AG-16-55 (AI paused).** When Expat Ready's emergency stop is tripped for all AI Doers or for one AI assistant (SA-12-31), when Super Admin withdraws the provider record (SA-8-50), when the firm switches AI off (AG-16-35), or when the firm switches one assistant off (AG-16-57), the AI setting SHALL show the reason ("AI paused by Expat Ready on <date>: <reason>", or "AI switched off by <person> on <date>") and the Owner SHALL see a banner. Items already waiting in Needs you that the stopped AI prepared SHALL carry the pause mark AG-11 assigns to that reason (`AI_PAUSED_PLATFORM_STOP` for Expat Ready's stop or the provider withdrawal; `AI_PAUSED_SWITCH_OFF` for the firm's switches; CN-AG-11 item 6) and SHALL NOT be sent or executed while paused; on release each SHALL be re-rendered stale and need a fresh approval (AG-11-61). Withdrawing AI proposals for a safety recall is a separate platform action, audited per item (SA-12-32).

   §13 item 7's second half and the open part of item 9 are closed by AG-16-55. What the assistants do while paused is AW-01's (AW-1-19, AW-1-20, AW-1-56).
4. **Why.** `00-step3-plan.md` "Emergency stop (one rule, all documents)" ("a stop pauses runs and delegations; nothing sends while stopped; waiting items can be withdrawn with the recall action (SA-12-32); on release every waiting item re-renders stale and needs fresh approval") and "Waiting items, one rule per stop reason" ("emergency stop or AI switched off = pause"); IMP-8 (c), (d) (the marked line and the Owner's banner; closes AG-16 Q7 and Q9), relied on by `case-assistant.md` §6 ("items withdrawn (IMP-8)"); review S3c-b n-5 (a pause mark for every stop reason). Proposal.
5. **Knock-ons.** SA-12-31, SA-12-32 and SA-8-50 (Super Admin half); AG-11 §0.2 SA-12 row; AG-16-37 unchanged (no setting change sends a waiting item).

## 3. Pause AI client-facing preparation while the firm has no active licensed user

1. **Where.** §3.9 / §3.11; AG-16-47 (L484); new requirement **AG-16-56**.
2. **Current words.**
   > L484: "**If no licensed user is active**, the item SHALL go to the Owner, who MAY approve it; the approval SHALL be recorded as "approved by Owner without a licensed user" and nothing SHALL be blocked."
3. **Proposed words.**
   > **AG-16-56 (pause setting).** The firm SHALL have a setting **Pause AI client-facing preparation while no licensed user is active**, on by default; only the Owner MAY switch it off, with a recorded reason, audited. Where it sits on the settings screens is the team's call. What the assistants pause and what continues is AW-01's (AW-1-34).

   Firm AI settings (§7) gain `pauseWithoutLicensedUser` (default true), `pauseOffReason?`, `pauseOffBy?`, `pauseOffAt?`.
4. **Why.** AIW-D56 (the founder, 11 Oct: "Yes, pause by default … client-facing preparation pauses while a firm has no active licensed user; on by default; the Owner may switch it off with a recorded reason"); IMP-17(b); `00-step3-plan.md` "One home per rule" (the setting here, the behaviour in AW-1-34). **Provisional until counsel reads it** (AIW-D56, AIW-D64, AIW-D68).
5. **Knock-ons.** AG-11-90 Owner route unchanged for items a person prepared; AG-14 monthly Owner-route count (CN-AG-14 item 2); the switch-off is an Owner-only act (SA-06 Appendix C, CN-SA-06 change 1, Super Admin half).

## 4. Under Advanced: one switch per AI assistant, the summary-line switch, and the safeguard values shown read-only

1. **Where.** §3.9 (L334); AG-16-35 (L470, "there SHALL be no per-Doer setting"); new requirement **AG-16-57**.
2. **Current words.**
   > L470: "The firm SHALL have **one on/off setting for all four AI Doers** (Reader, Sorter, Drafter, Checker); there SHALL be no per-Doer setting."
3. **Proposed words.**
   > **AG-16-57 (AI assistants under Advanced).** Under **Advanced**, the Owner SHALL see each AI assistant the firm uses (AW-01) with an on/off switch, and the on/off switch of the Practice expert's optional summary line. These are firm settings inside the one AI Doers extra (SA-03 catalogue row 30), not plan features and not catalogue rows. None SHALL have any effect while the AI setting (AG-16-35) is off, and none SHALL turn an AI Doer on or off: AG-16-35's one firm switch stands. Switching an assistant off suspends its work at once, as AG-16-55 says; it does not end any person's delegation. Changes are audited (AG-16-29).
   >
   > The same screen SHALL show, **read-only**, the values of the approve-all safeguards (the confidence level below which values open first, the share of values hidden for the approver, the agreement-alarm level) and the spend caps, as Expat Ready's platform settings hold them (SA-12-33, CN-SA-12), together with any tightening the firm has made. The Owner MAY tighten a value, never loosen it; the tightening is held as the firm's override of SA-12-33 (CN-SA-12), not as a field of this module. While the pilot safeguards setting is on, no firm or platform setting SHALL switch the safeguards off.

   Firm AI settings (§7) gain `expertSummaryLine` (bool) and one on/off per assistant (name to assign). No safeguard or spend-cap value is stored or restated here.
4. **Why.** IMP-8(e) (a per-worker firm switch sits below the platform's); `practice-expert.md` §9 G-35 (the summary-line setting sits under AG-16-35's one AI switch and never turns a Doer on or off); AIW-D39 (the summary line is optional); AIW-D60 (only the Case assistant is costed; the others ride inside the plan for the pilot; pricing per assistant is decided after the pilot); AIW-D57 (the approve-all safeguards, provisional until counsel, AIW-D64); `00-step3-plan.md` "Assistants are firm switches, not plan features" (each firm assistant is a firm setting under Advanced, AG-16-57, not a catalogue row; CN-SA-03's rows 31 to 35 are withdrawn), "Pilot safeguard values, one home" (platform settings in SA-12-33, locked by the pilot safeguards setting; a firm may tighten, never loosen; CN-AG-16 shows them read-only and restates no value), "No 'during the pilot' in a requirement" and "No one stops another person's delegation". This replaces the first fix round's firm-side fields for the safeguard values (review S3c-b N-6, N-7, n-11). Proposal.
5. **Knock-ons.** AW-01 (behaviour of each switch, AW-1-33, AW-1-114); AG-11 stops an assistant's recipes while its switch is off (CN-AG-11 item 9 (e)) and marks its waiting items (CN-AG-11 item 6); SA-12-33 holds the values and the firm's tightening (CN-SA-12, Super Admin half); AW-1-57's "own item on the platform's product map" follows this item, and AW-01 §13 T7 points to SA-12-33 for the values.

## 5. The firm's data export and the individual's data package include the AI records

1. **Where.** AG-16-39 (L474); AG-16-21 (L446); AG-16-20 (L445).
2. **Current words.**
   > L474: "The firm-data export scope (§3.5) SHALL include the **Needs-you approval history** (proposed action, approver, edit or rejection, timestamp, before/after) and **import batch reports**."
   >
   > L446: "Staff SHALL produce a **per-individual data package** (PIPEDA right-of-access) for one client/contact, a separately-permissioned (`agent/data-export:request`, owned here; was `agent/settings/export-individual`) and separately-audited action"
3. **Proposed words.** AG-16-39: "The firm-data export scope (§3.5) SHALL include the **Needs-you approval history** (proposed action, approver, edit or rejection, timestamp, before/after), **import batch reports**, the **AI run log** (AG-11 `AiRunLog`, with each run's delegation and decision, AG-11-113), the **AI provenance view** of every file (AW-1-23) and the **Practice expert's question records** (AW-01 §7)." AG-16-21 adds: "The package SHALL include the AI provenance entries of AI-prepared items that reached that client." Both exports stay audited (AG-16-22), and Restricted values follow AG7-D28 (CN-AG-07 item 1). This is the one home of the export scope; AW-1-24 cites it.
4. **Why.** AIW-D70 (the founder's standing rule applied: "the Practice expert's question records are read by the asker (own) and the Owner (whole firm, through the firm data export)"); IMP-2(d) ("The AI run log and this view join the firm-data export (AG-16-39) and the client's own data package where the item reached the client"), relied on by `case-assistant.md` §9 G-7; `proposals.md` row of 10 Oct (Practice expert, who may read the question log); review S3c M-8 (the provenance view and the individual package were left out).
5. **Knock-ons.** AG-11-98 interim retention applies to the exported rows until counsel answers (no new value).

## 6. The AI writing tool is the Writer

1. **Where.** Applied-decision rows (L44, L47); §3.9 (L336, L338); AG-16-35 (L470); AG-16-46 (L483).
2. **Current words.**
   > L336: "One firm switch covers **all four AI Doers** — Reader, Sorter, Drafter, Checker (AG11-D4); there is no per-Doer switch."
   >
   > L483: "Drafter output sent unedited SHALL count as AI-written."
3. **Proposed words.** Read **Writer** wherever "Drafter" names the AI Doer: "— Reader, Sorter, Writer, Checker (AG11-D4)"; "Writer output sent unedited SHALL count as AI-written."
4. **Why.** AIW-D53.
5. **Knock-ons.** CN-AG-11 item 1; SA-03 catalogue row 30 uses the same list (CN-SA-03, Super Admin half).

---

## Not changed here (pointers only)

- **WhatsApp, a team conflict stated, not settled.** AG-16 v1.13 still makes the firm's WhatsApp rail Release 1 (AG-16-38, L473; AG-16-54), while SA-08 v2.4 SA8-D19 (L56) moves WhatsApp to Phase 2 and lists AG-16 among the modules "to change". README §0 rule 11 would apply SA8-D19, the later team decision; the team's own pending knock-on SA8-X1 (L93) carries the change, so Workstream 2 writes none. Nothing above depends on WhatsApp.
- AG-16-47 (L484) still routes a supervised message to "the Needs you of the file's lead RCIC or of any licensed user if there is none", while AG-11-82 and AG-10-49 (the F4 decision of 7 Oct) show it at once to every active licensed user. This is a team-internal inconsistency with no Workstream 2 decision, accepted improvement or `proposals.md` row behind a fix (IMP-14 was not adopted by a decision or relied on by a passed behaviour document); not written, raised to the Lead.

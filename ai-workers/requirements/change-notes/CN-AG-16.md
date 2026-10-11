# CN-AG-16: change note to AG-16 Firm Settings and Integrations

| Field | Value |
|---|---|
| Module changed | AG-16 Firm Settings & Integrations |
| Version and file | v1.13 of 10 Oct 2026, `02-functional-requirements/agent/AG-16-firm-settings-and-integrations_v1.13_2026-10-10.md` (Drive snapshot of 11 Oct 2026, `sources/drive-snapshot-2026-10-11/`; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 (third fix round, after re-check S3c-c) |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-16-55 to AG-16-57 (highest AG-16-54, L495; a search of the whole file finds no AG-16-55 or above) |
| One home | This note holds the firm settings and the export scope, and is the one home of the **default of each AI assistant's firm switch** (off). What the assistants do when a setting changes lives in AW-01, which cites these IDs. The four pause reasons live in AG-11-112 (CN-AG-11 change 6). The founder safeguards setting, the approve-all safeguard values and the spend caps are platform settings with their one home in SA-12-33 (CN-SA-12); this module only shows them. |
| Companion files | CN-AG-11 changes 1, 6, 8 and 9; CN-AG-14 changes 1 and 4 (the Practice expert's rule-built answers); AW-01 (firm AI assistants, delegation, emergency stops); Super Admin half: CN-SA-08 (the provider record), CN-SA-12 (emergency stops, recall, the AI settings of SA-12-33); `requirements/provider-test-script.md` (the test call) |

**In plain words.** The firm's one AI switch stays locked until Expat Ready has published a provider record for a provider that processes in Canada, with no-training and no-retention terms and a test call that passed (the founder, 11 Oct). Three settings are added for the founder's other safety decisions and the assistants: what the firm sees when AI is paused (nothing sends; on release each waiting item must be approved afresh); a pause of client-facing AI preparation while the firm has no licensed user (on by default, provisional until counsel); and, under Advanced, one switch per assistant, off until the Owner switches it on. These switches are firm settings, not plan features: the four AI Doers are one sellable extra, and each assistant is a setting inside it. The Practice expert has one switch, for its AI summary line only; its rule-built answers are product features that nothing switches off. The same screen shows, read-only, the founder safeguards setting, the approve-all safeguard values and the spend caps that Expat Ready sets, with any tightening the firm has chosen; while a part of the founder safeguards is on, the firm may tighten it, never loosen it. One existing rule, that a setting change touches only items created after it, gets an exception: switching AI or an assistant off pauses the AI-prepared items already waiting. The firm's data export gains the AI records and the provenance view, and "Drafter" (the AI one) becomes "Writer".

**What the team changed on 10 Oct (v1.13).** Own-account rails are one sellable extra and the four AI Doers are one extra with one switch (AG-16-35; SA-03 v2.17 feature catalogue row 30, L345: "AI Doers (Reader, Sorter, Drafter, Checker — one switch, AG-16-35)"). So the per-assistant switches below are firm settings under Advanced inside that one extra, never separate plan features or catalogue rows. AG-16-35 itself still says "which Doers or volumes are plan-gated is still open (§13 Q7)" (L470); SA-03 v2.17 has settled that part (a team wording to align, not a Workstream 2 change). Nothing proposed here was already made.

**Terms used.** *Paused*: AI work halted for a reason that can be lifted; nothing sends while paused, nothing is deleted, and the reason is recorded (one of the four reasons of AG-11-112, CN-AG-11 change 6). *Founder safeguards setting*: the platform setting, on from the first deployment, that keeps the founder's safeguards in force (the approve-all safeguards of AIW-D57, and the second person on account changes of AIW-D59); each part ends only by a recorded founder decision naming that part, entered by the Platform Owner under SA-12's existing Owner-only settings pattern (SA-12-27; SA-12 L571) with the founder's decision reference recorded (SA-12-33, CN-SA-12). *Tighten*: make a safeguard stricter (for example open more values first, or set a lower spend cap).

---

## 1. The AI switch waits for the published provider record, including a passed test call

1. **Where.** AG-16-35 (L470); §3.9 (L336); `FirmAiSettings.termsRecorded` (L578).
2. **Current words.**
   > L470: "**The setting SHALL be locked off for every firm until Super Admin has recorded the AI provider, the processing region (Canada only, AG11-D15) and a no-training / no-retention agreement (SA-08, SA-11);** while locked, no AI Doer SHALL run and the screen SHALL say why."
   >
   > L578: "`termsRecorded` (read projection of the Super Admin record of provider, region (Canada only, AG11-D15) and no-training agreement — SA-08 / SA-11; while false the switch is locked)"
3. **Proposed words.** AG-16-35: "**The setting SHALL be locked off for every firm until a published AI provider record exists (SA-8-49) — the provider, a processing region in Canada (AG11-D15), the no-training and no-retention terms, and a passed test call from that region (SA-08, SA-11); a record entered but not published SHALL NOT unlock it;** while locked, no AI Doer SHALL run and the screen SHALL say why." `termsRecorded`: "read projection of the published Super Admin provider record (provider, region in Canada, no-training and no-retention terms, passed test call — SA-8-49, SA-11); while false the switch is locked". §3.9 L336 follows. No requirement names a provider.
4. **Why.** AIW-D52 (the founder: "Only in Canada … confirmed by one test call"); AIW-D69 ("the result goes into the provider record the product requires before the AI switch unlocks (AG-16-35, AG-11-93)"); AIW-D27 (provider and region decided before AI is switched on); IMP-6 (the field says only "no-training", still so at L578); `00-step3-plan.md` "The provider is replaceable" and "The provider record" (a *passed* test call); review S3c-c k-7 (recorded against published).
5. **Knock-ons.** AG-11-93 (CN-AG-11 change 8); SA-08 SA-8-49 and SA-11 §3.6 (Super Admin half).

## 2. When AI is paused: the firm sees why, nothing sends, and the "items created after the change" rule gets its exception

1. **Where.** §13 item 7 (L852); §13 item 9 (L854); §9 edge case (L714); AG-16-37 (L472); §3.9 data flow (L346); §3.13 (L407); new requirement **AG-16-55**. (Contradiction sweep: a search of AG-16 v1.13 for every sentence saying that a setting change applies only to later items or leaves waiting items as they are found L346, L407, L472 and L714, plus the open question at L854; L388, L638, L658 and L708 concern the standard-messages review, autonomy and approver settings and do not conflict, so they stay.)
2. **Current words.**
   > L852: "Still open: which AI Doers or volumes sit behind which plan (SA-03), and what the Owner sees if Super Admin later withdraws the terms."
   >
   > L472: "A change to AI Doers, autonomy, Team safeguards, supervised client messages or the standard-messages review SHALL apply only to items created after the change; an item already waiting in Needs you SHALL NOT be sent or executed because of the change (it never auto-executes on timeout or on a setting change)."
   >
   > L346: "a change takes effect for items created after it, and never silently sends an item already waiting in Needs you (AG11-D2)."
   >
   > L407: "A change applies to chases requested and Needs you items created after it; nothing already sent or waiting is changed (as for every setting in §3.9)."
   >
   > L714: "waiting items are not deleted and never execute because of the change (AG-16-37); what the queue shows for them afterwards is open (§13 Q9)."
3. **Proposed words.**
   > **AG-16-55 (AI paused).** AI work SHALL be paused for any of the four pause reasons of AG-11-112 (CN-AG-11 change 6): the firm switches AI off (AG-16-35); the firm switches one assistant off under Advanced (AG-16-57), which pauses that assistant only; Super Admin withdraws the provider record (SA-8-50); or Expat Ready's emergency stop is tripped for all AI Doers or for one assistant (SA-12-31). The AI setting, and for a single assistant that assistant's row under Advanced, SHALL show the reason ("AI paused by Expat Ready on <date>: <reason>", or "AI switched off by <person> on <date>", or "<assistant> switched off by <person> on <date>") and the Owner SHALL see a banner. Items already waiting in Needs you that the paused AI prepared SHALL be `PAUSED` with that reason (AG-11-112 (e)) and SHALL NOT be sent or executed while paused; when the last reason clears, each SHALL be re-rendered stale and need a fresh approval (AG-11-61). Pausing never ends a person's delegation. Withdrawing AI proposals for a safety recall is a separate platform action, audited per item (SA-12-32).

   New words for each sentence the sweep found:
   - **AG-16-37 (L472):** "A change to AI Doers, autonomy, Team safeguards, supervised client messages or the standard-messages review SHALL apply only to items created after the change, **except that switching AI off (AG-16-35) or an AI assistant off (AG-16-57) pauses the AI-prepared items already waiting (AG-16-55; AG-11-112 (e))**; no setting change SHALL ever send or execute a waiting item (it never auto-executes on timeout or on a setting change)." The rest of AG-16-37 (Team safeguards routing) is unchanged.
   - **§3.9 data flow (L346):** "… a change takes effect for items created after it, except that switching AI or an assistant off pauses the AI-prepared items already waiting (AG-16-55), and it never sends an item already waiting in Needs you (AG11-D2)."
   - **§3.13 (L407):** "… nothing already sent or waiting is changed (as for every setting in §3.9, except the AI switches, which pause AI-prepared waiting items, AG-16-55)."
   - **§9 edge case (L714):** "**AI Doers switched off while items wait in Needs you** → AI-prepared waiting items are `PAUSED` with the reason `AI_SWITCHED_OFF`, are not deleted and never execute because of the change; when AI is switched back on, each is re-rendered stale and needs a fresh approval (AG-16-37, AG-16-55)." A second edge case is added in the same words for one assistant switched off (`ASSISTANT_SWITCH_OFF`, AG-16-57).
   - **§13 item 7** (L852, second half) and **§13 item 9** (L854) are closed by AG-16-55.

   What the assistants do while paused is AW-01's (AW-1-19, AW-1-20, AW-1-56, AW-1-125).
4. **Why.** `00-step3-plan.md` "One word, *paused*" (every halt that is not an end is PAUSED with its reason recorded; the four reasons live in CN-AG-11 change 6, which CN-AG-16 cites), "Emergency stop (one rule, all documents)" ("a stop pauses runs and delegations; nothing sends while stopped; waiting items can be withdrawn with the recall action (SA-12-32); on release every waiting item re-renders stale and needs fresh approval"), "No one stops another person's delegation" and "Contradiction sweep" (CN-AG-16 gives AG-16-37 new words for the pause rule; "unchanged" only after the search); IMP-8 (c), (d) (the marked line and the Owner's banner; closes AG-16 Q7 and Q9), relied on by `case-assistant.md` §6 ("items withdrawn (IMP-8)"); review S3c-b n-5; review S3c-c K-1 (AG-16-37 said the opposite and had been left "unchanged"). Proposal.
5. **Knock-ons.** SA-12-31, SA-12-32 and SA-8-50 (Super Admin half); AG-11 §0.2 SA-12 row; AW-01's citations of AG-16-37 follow the new words.

## 3. Pause AI client-facing preparation while the firm has no active licensed user

1. **Where.** §3.9 / §3.11; AG-16-47 (L484); new requirement **AG-16-56**.
2. **Current words.**
   > L484: "**If no licensed user is active**, the item SHALL go to the Owner, who MAY approve it; the approval SHALL be recorded as "approved by Owner without a licensed user" and nothing SHALL be blocked."
3. **Proposed words.**
   > **AG-16-56 (pause setting).** The firm SHALL have a setting **Pause AI client-facing preparation while no licensed user is active**, on by default; only the Owner MAY switch it off, with a recorded reason, audited. Where it sits on the settings screens is the team's call. What the assistants pause and what continues is AW-01's (AW-1-34).

   Firm AI settings (§7) gain `pauseWithoutLicensedUser` (default true), `pauseOffReason?`, `pauseOffBy?`, `pauseOffAt?`.
4. **Why.** AIW-D56 (the founder, 11 Oct: "Yes, pause by default … client-facing preparation pauses while a firm has no active licensed user; on by default; the Owner may switch it off with a recorded reason"); IMP-17(b); `00-step3-plan.md` "One home per rule" (the setting here, the behaviour in AW-1-34). This setting stops new client-facing preparation; it is not one of the four reasons that pause waiting items (CN-AG-11 change 6). **Provisional until counsel reads it** (AIW-D56, AIW-D64, AIW-D68).
5. **Knock-ons.** AG-11-90 Owner route unchanged for items a person prepared; AG-14 monthly Owner-route count (CN-AG-14 change 2); the switch-off is an Owner-only act (SA-06 Appendix C, CN-SA-06 change 1, Super Admin half).

## 4. Under Advanced: one switch per AI assistant (off by default), the Practice expert's one switch, and the platform's AI settings shown read-only

1. **Where.** §3.9 (L334); AG-16-35 (L470, "there SHALL be no per-Doer setting"); new requirement **AG-16-57**.
2. **Current words.**
   > L470: "The firm SHALL have **one on/off setting for all four AI Doers** (Reader, Sorter, Drafter, Checker); there SHALL be no per-Doer setting."
3. **Proposed words.**
   > **AG-16-57 (AI assistants under Advanced).** Under **Advanced**, the Owner SHALL see each AI assistant the firm uses (AW-01) with an on/off switch. **Each assistant's switch SHALL be off by default; the Owner switches it on**, audited (AG-16-29). These are firm settings inside the one AI Doers extra (SA-03 catalogue row 30), not plan features and not catalogue rows. None SHALL have any effect while the AI setting (AG-16-35) is off, and none SHALL turn an AI Doer on or off: AG-16-35's one firm switch stands. Switching an assistant off pauses its work at once, with the reason `ASSISTANT_SWITCH_OFF` (AG-16-55; AG-11-112); it does not end any person's delegation, and switching it on again resumes the paused work with no new acceptance.
   >
   > **The Practice expert has one switch, not two:** its switch governs only the expert's AI-written summary line (`expertSummaryLine`), off by default like every assistant switch. The expert's rule-built answers (AG-14-35 to AG-14-40) are product features: no assistant switch, no AI switch and no stop turns them off.
   >
   > The same screen SHALL show, **read-only**, the platform's AI settings as SA-12-33 holds them (CN-SA-12): whether each part of the founder safeguards setting is on; the approve-all safeguard values (AIW-D57); and the spend caps; each with any tightening the firm has chosen. While a part of the founder safeguards setting is on, the Owner MAY tighten that part's values and SHALL NOT loosen them; when the founder's recorded decision ends a part, the firm's own settings govern that part. A tightening is held as the firm's value in SA-12-33, not as a field of this module. This module restates no value.

   Firm AI settings (§7) gain `expertSummaryLine` (bool, default false) and one on/off per assistant (default false; name to assign). No safeguard value, spend cap or founder-safeguards flag is stored here.
4. **Why.** IMP-8(e) (a per-worker firm switch sits below the platform's); `practice-expert.md` §9 G-35 (the summary-line setting sits under AG-16-35's one AI switch and never turns a Doer on or off); AIW-D39 (version 1 is four rule-built answers with one optional AI summary line); AIW-D54 call 10 ("the expert's answers work with AI off"); AIW-D60 (only the Case assistant is costed; the others ride inside the plan for the pilot, usage measured); AIW-D57 (the approve-all safeguards, provisional until counsel, AIW-D64); AIW-D59; `00-step3-plan.md` "Assistants are firm switches, not plan features" (each firm assistant is a firm setting under Advanced, AG-16-57, not a catalogue row), "Pilot safeguard values, one home" (platform settings in SA-12-33; CN-AG-16 shows them read-only with the firm's tightening and restates no value), "The *founder safeguards* setting" (on from the first deployment; each part ends only by a recorded founder decision naming that part), "Who switches it off" (SA-12's existing Owner-only settings pattern, SA-12-27, with the founder's decision reference recorded; no new key), "Tighten-only and the founder safeguards" (tighten only while a part is on; when the founder ends a part, firm settings govern it), "One word, *paused*" and "No one stops another person's delegation". The off default follows AW-1-125 (off until the Owner switches it on, Proposal), and this note is now that default's one home; the one Practice expert switch follows AW-1-111 and AW-1-125 (the summary-line switch is the expert's switch; the rule-built answers have none). This replaces the first fix round's firm-side fields for the safeguard values (review S3c-b N-6, N-7, n-11; review S3c-c k-8). Proposal.
5. **Knock-ons.** AW-01 (behaviour of each switch: AW-1-33, AW-1-111, AW-1-114, AW-1-125); CN-AG-14 change 1 (AG-14-38: the answers have no switch); AG-11 does not run a paused assistant's recipes (CN-AG-11 change 9 (e)) and pauses its waiting items (CN-AG-11 change 6); SA-12-33 holds the values and the firm's tightening (CN-SA-12, Super Admin half), with the same tighten-only condition; AW-01's product-map requirement (AW-1-57) and §13 T7 follow this change.

## 5. The firm's data export and the individual's data package include the AI records

1. **Where.** AG-16-39 (L474); AG-16-21 (L446); AG-16-20 (L445).
2. **Current words.**
   > L474: "The firm-data export scope (§3.5) SHALL include the **Needs-you approval history** (proposed action, approver, edit or rejection, timestamp, before/after) and **import batch reports**."
   >
   > L446: "Staff SHALL produce a **per-individual data package** (PIPEDA right-of-access) for one client/contact, a separately-permissioned (`agent/data-export:request`, owned here; was `agent/settings/export-individual`) and separately-audited action"
3. **Proposed words.** AG-16-39: "The firm-data export scope (§3.5) SHALL include the **Needs-you approval history** (proposed action, approver, edit or rejection, timestamp, before/after), **import batch reports**, the **AI run log** (AG-11 `AiRunLog`, with each run's delegation and decision, AG-11-113), the **AI provenance view** of every file (AW-1-23) and the **Practice expert's question records** (AW-01 §7)." AG-16-21 adds: "The package SHALL include the AI provenance entries of AI-prepared items that reached that client." Both exports stay audited (AG-16-22), and Restricted values follow AG7-D28 (CN-AG-07 change 1). This is the one home of the export scope; AW-1-24 cites it.
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
5. **Knock-ons.** CN-AG-11 change 1; SA-03 catalogue row 30 uses the same list (CN-SA-03, Super Admin half).

---

## Not changed here (pointers only)

- **WhatsApp, a team conflict stated, not settled.** AG-16 v1.13 still makes the firm's WhatsApp rail Release 1 (AG-16-38, L473; AG-16-54), while SA-08 v2.4 SA8-D19 (L56) moves WhatsApp to Phase 2 and lists AG-16 among the modules "to change". Nothing above depends on WhatsApp. **No change note is written for it:** the team's own pending knock-on SA8-X1 (SA-08 L93) carries this non-AI change, so under the knock-on exception to README §0 rule 11 Workstream 2 states the conflict and cites the knock-on (`00-step3-plan.md`, "Where the team already has a pending knock-on").
- AG-16-47 (L484) still routes a supervised message to "the Needs you of the file's lead RCIC or of any licensed user if there is none", while AG-11-82 and AG-10-49 (the F4 decision of 7 Oct) show it at once to every active licensed user. This is a team-internal inconsistency with no Workstream 2 decision, accepted improvement or `proposals.md` row behind a fix (IMP-14 was not adopted by a decision or relied on by a passed behaviour document); not written, raised to the Lead.

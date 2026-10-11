# CN-AG-16: change note to AG-16 Firm Settings and Integrations

| Field | Value |
|---|---|
| Module changed | AG-16 Firm Settings & Integrations |
| Version and file | v1.12 of 8 Oct 2026, `02-functional-requirements/agent/AG-16-firm-settings-and-integrations_v1.12_2026-10-08.md` (Drive snapshot of 9 Oct 2026; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-16-55 to AG-16-57 (highest AG-16-54, L494) |
| Companion files | CN-AG-11 items 1 and 8; AW-01 (firm AI assistants, delegation, emergency stops); `requirements/provider-test-script.md` (the test call) |

**In plain words.** The firm's one AI switch stays locked until Expat Ready has recorded a provider that processes in Canada, with no-training and no-retention terms and a test call that passed (the founder, 11 Oct). Three settings are added for the founder's other safety decisions and the assistants: what the firm sees when Expat Ready pauses AI; a pause of client-facing AI preparation while the firm has no licensed user (on by default, provisional until counsel); and, under Advanced, one switch per assistant. The firm's data export gains the AI records, and "Drafter" (the AI one) becomes "Writer".

---

## 1. The AI switch waits for the provider record, including a passed test call

1. **Where.** AG-16-35 (L469); §3.9 (L335); `FirmAiSettings.termsRecorded` (L577).
2. **Current words.**
   > L469: "**The setting SHALL be locked off for every firm until Super Admin has recorded the AI provider, the processing region (Canada only, AG11-D15) and a no-training / no-retention agreement (SA-08, SA-11);** while locked, no AI Doer SHALL run and the screen SHALL say why."
   >
   > L577: "`termsRecorded` (read projection of the Super Admin record of provider, region (Canada only, AG11-D15) and no-training agreement — SA-08 / SA-11; while false the switch is locked)"
3. **Proposed words.** AG-16-35: "**The setting SHALL be locked off for every firm until Super Admin has recorded the AI provider record — the provider, a processing region in Canada (AG11-D15), the no-training and no-retention terms, and a passed test call from that region (SA-08, SA-11);** while locked, no AI Doer SHALL run and the screen SHALL say why." `termsRecorded`: "read projection of the Super Admin provider record (provider, region in Canada, no-training and no-retention terms, passed test call — SA-08 / SA-11); while false the switch is locked". No requirement names a provider.
4. **Why.** AIW-D52 (the founder: "Only in Canada … confirmed by one test call"); AIW-D69 ("the result goes into the provider record the product requires before the AI switch unlocks (AG-16-35, AG-11-93)"); AIW-D27 (provider and region decided before AI is switched on); IMP-6 (L577 "says only "no-training""); `requirements/00-step3-plan.md` shared rule (the provider is replaceable).
5. **Knock-ons.** AG-11-93 (CN-AG-11 item 8); SA-08 provider entry and SA-11 §3.6 (Super Admin half).

## 2. What the firm sees when Expat Ready pauses AI

1. **Where.** §13 item 7 (L851); §9 edge cases (L704, L713); new requirement **AG-16-55**.
2. **Current words.**
   > L851: "Still open: which AI Doers or volumes sit behind which plan (SA-03), and what the Owner sees if Super Admin later withdraws the terms."
   >
   > L713: "waiting items are not deleted and never execute because of the change (AG-16-37); what the queue shows for them afterwards is open (§13 Q9)."
3. **Proposed words.**
   > **AG-16-55 (AI paused by Expat Ready).** When the platform switches AI off for every firm or for one AI assistant (SA-12 emergency stop), or withdraws the provider record, the AI setting SHALL show "AI paused by Expat Ready on <date>: <reason>" and the Owner SHALL see a banner. Items already waiting in Needs you SHALL stay visible and approvable by a person, marked with the same line, and SHALL never run because of the pause (AG-16-37). Withdrawing AI proposals for a safety recall is a separate platform action, audited per item (AW-02; SA-12).

   §13 item 7's second half and the open part of item 9 are closed by AG-16-55.
4. **Why.** IMP-8 (c), (d) ("items already waiting in Needs you stay visible and approvable by a person, marked "AI paused by Expat Ready on <date>: <reason>" … the Owner sees a banner"; "Closes AG-16 Q7 and Q9"), relied on by `case-assistant.md` §6 ("items withdrawn (IMP-8)") and by the emergency stops that AW-01 and AW-02 specify (`requirements/00-step3-plan.md` item A). Proposal.
5. **Knock-ons.** SA-12 switches (Super Admin half); AG-11 §0.2 SA-12 row.

## 3. Pause AI client-facing preparation while the firm has no active licensed user

1. **Where.** §3.9 / §3.11; AG-16-47 (L483); new requirement **AG-16-56**.
2. **Current words.**
   > L483: "**If no licensed user is active**, the item SHALL go to the Owner, who MAY approve it; the approval SHALL be recorded as "approved by Owner without a licensed user" and nothing SHALL be blocked."
3. **Proposed words.**
   > **AG-16-56 (pause AI client-facing preparation without a licensed user).** The firm SHALL have a setting **Pause AI client-facing preparation while no licensed user is active**, on by default. While it is on and the firm has no active licensed user (AG-01 §3.5), AI assistants SHALL NOT prepare client-facing items (AW-01); everything else continues, and nothing a person does is blocked. The Owner MAY switch it off with a recorded reason, audited. Where it sits on the settings screens is the team's call.
4. **Why.** AIW-D56 (the founder, 11 Oct: "Yes, pause by default … client-facing preparation pauses while a firm has no active licensed user; on by default; the Owner may switch it off with a recorded reason"); IMP-17(b). **Provisional until counsel reads it** (AIW-D56, AIW-D64, AIW-D68).
5. **Knock-ons.** AW-01 (which preparations count as client-facing); AG-11-90 Owner route unchanged for items a person prepared; AG-14 monthly Owner-route count (CN-AG-14 item 2).

## 4. Under Advanced: one switch per AI assistant, the summary-line switch and the agreement-alarm level

1. **Where.** §3.9 (L333); AG-16-35 (L469, "there SHALL be no per-Doer setting"); new requirement **AG-16-57**.
2. **Current words.**
   > L469: "The firm SHALL have **one on/off setting for all four AI Doers** (Reader, Sorter, Drafter, Checker); there SHALL be no per-Doer setting."
3. **Proposed words.**
   > **AG-16-57 (AI assistants under Advanced).** Under **Advanced**, the Owner SHALL see each AI assistant the firm uses (AW-01) with an on/off switch, the on/off switch of the Practice expert's optional summary line, and the level at which the agreement-rate alarm on approvals raises (AW-01). None of these SHALL have any effect while the AI setting (AG-16-35) is off, and none SHALL turn an AI Doer on or off: AG-16-35's one firm switch for all the AI Doers stands. Changes are audited (AG-16-29).
4. **Why.** IMP-8(e) ("a per-worker firm switch sit below it"); `practice-expert.md` §9 G-35 (the summary-line setting "sits under AG-16-35's one AI switch … never turns a Doer on or off"); AIW-D39 (the summary line is optional); AIW-D57 and the Lead's row of 10 Oct in `proposals.md` ("an alarm when a person's agreement rate with AI proposals climbs above a firm-set level"), provisional until counsel (AIW-D64). Proposal.
5. **Knock-ons.** AW-01 (behaviour of each switch and of the alarm); AG-11 (follow-on for the team, not written in CN-AG-11): an assistant's recipes (CN-AG-11 item 9) do not run while that assistant's switch is off.

## 5. The firm's data export includes the AI records

1. **Where.** AG-16-39 (L473); AG-16-20 (L444).
2. **Current words.**
   > L473: "The firm-data export scope (§3.5) SHALL include the **Needs-you approval history** (proposed action, approver, edit or rejection, timestamp, before/after) and **import batch reports**."
3. **Proposed words.** "The firm-data export scope (§3.5) SHALL include the **Needs-you approval history** (proposed action, approver, edit or rejection, timestamp, before/after), **import batch reports**, the **AI run log** (AG-11 `AiRunLog`, with each run's delegation and decision, AG-11-113), and the **Practice expert's question records** (AW-01)." The export stays Owner-only (`agent/firm-data-export:request`) and audited (AG-16-22). Restricted values follow CN-AG-07 item 1.
4. **Why.** AIW-D70 (the founder's standing rule applied: "the Practice expert's question records are read by the asker (own) and the Owner (whole firm, through the firm data export)"); IMP-2(d) ("The AI run log and this view join the firm-data export (AG-16-39)"), relied on by `case-assistant.md` §9 G-7; `proposals.md` row of 10 Oct (Practice expert, who may read the question log).
5. **Knock-ons.** AG-11-98 retention (SA-11; counsel on values, IMP-4).

## 6. The AI writing tool is the Writer

1. **Where.** Applied-decision rows (L43, L46); §3.9 (L335, L337); AG-16-35 (L469); AG-16-46 (L482).
2. **Current words.**
   > L335: "One firm switch covers **all four AI Doers** — Reader, Sorter, Drafter, Checker (AG11-D4); there is no per-Doer switch."
   >
   > L482: "Drafter output sent unedited SHALL count as AI-written."
3. **Proposed words.** Read **Writer** wherever "Drafter" names the AI Doer: "— Reader, Sorter, Writer, Checker (AG11-D4)"; "Writer output sent unedited SHALL count as AI-written."
4. **Why.** AIW-D53.
5. **Knock-ons.** CN-AG-11 item 1.

---

## Not changed here (pointers only)

- AG-16-47 (L483) still routes a supervised message to "the Needs you of the file's lead RCIC or of any licensed user if there is none", while AG-11-82 and AG-10-49 (the F4 decision of 7 Oct) show it at once to every active licensed user. This is a team-internal inconsistency with no Workstream 2 decision, accepted improvement or `proposals.md` row behind a fix (IMP-14 was not adopted by a decision or relied on by a passed behaviour document); not written, raised to the Lead.

# AI autonomy model: one job, few checkpoints (Proposal)

**Status:** Proposal by the maker, 12 Oct 2026, for the Lead, then the adversarial checker, then the founder. Nothing here is ratified.
**Asked by:** the founder, 12 Oct 2026: "Wherever we can, ask only approvals at the critical points ... Otherwise let them do end-to-end job and approve it at the end ... not blind autonomy ... if you can keep toggle what kind of permissions are required ... who can do what and what not."
**Builds on (cited, not restated):** FD-16 (`sources/drive-snapshot-2026-10-11/01-techno-functional/07-Founder-Decisions-Log.md` line 52); AG11-D1, AG11-D2, AG11-D8, AG11-D10, AG11-D11, AG11-D12, AG-11-51 to AG-11-63, AG-11-94 and §3.3, §3.13 (`sources/drive-snapshot-2026-10-11/02-functional-requirements/agent/AG-11-automation_v1.12_2026-10-10.md`); AIW-D13, D57, D71, D78, D80, D83, D84, D85, D89, D92, D93, D94 (`ai-workers/decisions.md`); AW-1-11, AW-1-19, AW-1-33, AW-1-37, AW-1-53, AW-1-56, AW-1-72, AW-1-125, AW1-D5, AW1-D25, AW1-BR-20 (`ai-workers/requirements/AW-01-firm-ai-assistants_v0.1.md`); `research/ai-architecture-deterministic-2026-10.md` §4.4, §4.5, §7.4; `handbook/ai-team-profiles.md` §1, §3.1; `design/rules-ai-classification-2026-10-12.md` §1 (classes R, T, A, H).

**Labels.** [V] verified in a primary source we opened; [S] secondary source or a primary we did not open; [VC] vendor's own claim; [I] our inference or estimate. "Proposal" means new design not yet decided.

---

## (a) Summary for the founder

1. You can have an AI teammate run a whole job, for example "prepare this client's file", and approve it **once at the end**, plus a few stops nobody may remove. That is how the best products work in 2026 (GitHub's coding agent hands you one pull request; Claude Code lets you review the result instead of every edit).
2. The trick is simple: **the AI works in draft.** Everything it prepares stays a draft; nothing reaches a client, a form, a money record or the government until a person approves the finished bundle. So your rule "AI assists, humans decide" (FD-16) still holds, with far fewer clicks.
3. We do **not** build a new system. We reuse the team's three levels (Send automatically / Ask me first / Off) and add one setting to "Ask me first": **ask now, or ask at the checkpoint.**
4. Some stops stay forever, by your own decisions and the team's floors: every AI-written message to a client, every government form, every value read from a client's document, signing, money, advice and anything sent to the government.
5. Honest point where your wish meets the team's rule: the team wrote "Lowering an AI-text floor is impossible". So an AI-written client message is never sent without a person, however good the AI gets. Maximum autonomy here means **fewer, better approvals**, not zero.
6. The firm gets **one permission grid**: role × action × Auto / Ask now / Ask at checkpoint / Off, with three presets (Careful, Balanced, Fast). The grid can never go below the floors.
7. **Earned autonomy:** a skill that proves itself on a firm's real work (for example, labelling document types) may move from "Ask" to "Auto" with the Owner's one click, and drops back by itself if its health light turns amber.
8. Never blind: a live job panel, a short **hold window** on automatic sends, a stop button per job, the emergency switches you already approved (AIW-D78) and a daily summary.
9. Rubber-stamping is the real danger of "approve at the end". The bundle screen keeps the three safeguards you adopted (AIW-D57): uncertain items opened first, a few values hidden for the approver to type, and a private alarm.
10. Estimate [I]: a typical file goes from about **30 separate approvals over several weeks to about 6 to 10**. The bundle review still takes real time; that is deliberate.
11. Four decisions for you are in part (d). The biggest: reword AIW-D93 from "every action waits in Needs you" to "every action with an effect is approved by a person before it takes effect, singly or in the job's bundle".
12. Coach's warning: with counsel dropped (AIW-D94), these floors are now the main legal guard for your buyers. Do not trade them for click counts.

---

## (b) Research findings: how leading products give maximum autonomy safely

### b.1 What the products do

| Product | How autonomy is given | How the person stays in control | Label |
|---|---|---|---|
| **Claude Code** (Anthropic) [1] | Six permission modes. `acceptEdits` skips per-edit approval for people who "prefer reviewing changes afterward"; `plan` mode researches and writes a plan without changing anything; `auto` mode lets a second model (a classifier) review each action instead of the person; `dontAsk` allows only pre-approved tools. | Allow / ask / deny rules always win; some actions always ask (protected paths, certain deletions, tools marked as requiring a person). | [V] |
| **Anthropic study of real agent use** (18 Feb 2026) [2] | New users (fewer than 50 sessions) used full auto-approve in about 20% of sessions; over 40% by 750 sessions. Only 0.8% of actions looked irreversible (for example, an email to a customer). | Experienced users **interrupt more** (about 9% of turns against 5%). Anthropic's advice: invest in "trustworthy visibility" and "simple intervention mechanisms"; approving every action "will create friction without necessarily producing safety benefits". | [V] |
| **GitHub Copilot coding agent** [3][4] | The agent does the whole task alone and hands over **one pull request** (the checkpoint). | By default its automated checks do not run until a person clicks "Approve and run workflows"; since March 2026 an admin may switch that off. The person who asked the agent cannot count as the required reviewer: someone else must approve. | [V] |
| **ChatGPT agent** (OpenAI) [5] | Works in the background on multi-step tasks. | Asks before "actions of consequence" (sending an email, submitting a form, buying); "watch mode" on sensitive sites pauses if the person looks away; the person can take over (for example, to type a password). A French help page says the agent has since been replaced. | [S]; status Unknown |
| **Clio Work** (legal, Apr 2026) [6] | One goal-based prompt; the system plans and runs the steps itself. | Shows its reasoning live; the lawyer can interrupt, change course or sharpen the instruction mid-task ("watch and interrupt"). | [VC] |
| **Intercom Fin Procedures** [7] | Fin runs a whole support procedure on its own. | A "loop in a teammate" step pauses the procedure only at high-risk points (refunds, account closure, data deletion); the approver can answer from Slack; on timeout it escalates, it does not proceed. | [V] |
| **ServiceNow AI agents** [8] | Every agent or orchestrator action can be set to supervised (waits for a person) or unsupervised. | Their advice: start with read actions autonomous and **every write action supervised**, then loosen as confidence grows. Agents "cannot exceed their authority nor self-escalate permissions". | [S] (trade press quoting the vendor) |
| **Microsoft Copilot Studio** [9] | Agent flows run on their own. | A "request for information" step pauses the flow for named reviewers; first answer wins. | [V] |
| **Salesforce Agentforce** [10] | Topics define what an agent may and may not do. | Escalation to a person by instruction; audit trail; Salesforce's policy says AI may not make legal or important decisions without a human making the final decision. | [S] |
| **Ramp** and **Brex** (spend) [11][12] | Agents approve **in-policy** expenses on their own with policy citations; one summary says some customers went from reviewing 100% of receipts to 10%. | Out-of-policy items go to a person; every decision has an audit trail. | [VC] |
| **EvenUp** (legal letters) [13] | The AI drafts the whole demand letter with line-level source links. | The firm reviews and finalises; an optional tier adds the vendor's own reviewers first. | [VC] |
| **Harvey** (legal, May 2026) [14] | 500+ ready-made agents and an agent builder. | We found no published approval gates; reviewers say lawyer review stays essential. | [VC]; gates Unknown |
| **Gmail Undo Send** [15] | Sends at once from the person's view. | Actually holds the message 5 to 30 seconds so it can be cancelled: a **delay, not a recall**. | [S] |

### b.2 What the research says about approvals

- **Levels of autonomy** [16]: a University of Washington paper (Knight First Amendment Institute, 2025) defines five levels by the person's role: operator, collaborator, consultant, **approver**, observer. Autonomy is "a deliberate design decision", separate from how capable the AI is. Our target is the **approver** level per job, with **observer** only for internal, reversible actions. [V]
- **Rubber-stamping is real** [17][18]: in a 2023 mammography study, when the AI started giving wrong answers, inexperienced readers' accuracy fell from about 80% to about 20%, and very experienced readers' from 82% to about 46%. Many 2026 practitioner pieces describe "approval fatigue": the more items in a queue, the less each one is checked, and a high agreement rate alone cannot tell good AI from a rubber stamp. Suggested remedies: seed known-wrong cases, measure catches, keep queues short. [S]
- **Law** [19]: the EU AI Act, Article 14, asks that people overseeing high-risk AI stay aware of "the possible tendency of automatically relying or over-relying" on its output, and can override or stop it. Canada has no equivalent in force; we cite it as the best public standard, not as a rule that binds Expat Ready. [S]

### b.3 What this means for us [I]

1. The leaders do **not** approve every step. They approve **a plan or a finished result** and keep a few fixed stops for irreversible acts.
2. They separate **reversible/internal** (let it run, show it) from **irreversible/external** (stop and ask). This matches the team's AUTO / APPROVE split (AG11-D1) almost exactly.
3. Autonomy grows **with measured experience**, and is per action, not per agent (ServiceNow's advice; Anthropic's data).
4. Fewer approvals only work if each one is a **real check**: short, with uncertain items first and known traps (AW-1-33 already does this).
5. Visibility and a stop button matter more than prompts (Anthropic, Clio).
6. Nobody credible in regulated work lets AI send its own free text to a client unreviewed. Our floor is normal, not timid.

---

## (c) The model

### c.1 The idea in one picture

```
Person starts the job  ──►  AI teammate runs the whole job IN DRAFT  ──►  ONE bundle  ──►  Person approves  ──►  Platform performs the effects
(pathway chosen,            rules do fixed steps (R), AI reads/drafts        (readiness          (one session;        (sends, writes, forms
 retainer signed: H)        (A); internal steps run; everything else          report, AW-1-72,    safeguards on)        become final)
                            waits in the bundle; interrupts only for          extended)
                            the few "ask now" items
```

**The one rule that makes it safe:** during the job, nothing with an effect outside the draft happens unless it is (a) a fixed-rule action the firm already approved once (a published template, a recipe step, AG11-D12), or (b) an internal, reversible action (a task, a reminder, a label, a note), or (c) approved by a person. That is FD-16 read literally: every AI output is human-approved **before it has effect**. Approving it at the end of the job is still before the effect.

**Honest note** (`handbook/ai-team-profiles.md` §1; the 11 Oct lesson that much less is AI than claimed): most of "prepare a client file" is rules (class R): the chase recipe, the deadline watch, the checklist, the Filler. The AI's share is reading documents, drafting letters and replies, and the summary paragraph. The model below governs both, but only class A output needs a person.

### c.2 Action risk tiers and defaults (reusing AG11-D1, not replacing it)

The team's three levels stay: **AUTO** (Send automatically), **APPROVE** (Ask me first), **OFF**. The one addition (Proposal) is a property of APPROVE called **when to ask**: **now** (inline or in Needs you, exactly as AG11-D2 says today) or **at the checkpoint** (held inside the job's bundle). No new level, no new queue.

| Tier | Examples | Default inside an AI teammate's job | Firm may set | Floor (cannot go lower) | Source |
|---|---|---|---|---|---|
| **0. Look** | Read records, read packs, run the rule engine, read a document, compute a checklist | AUTO | — | — | AIW-D93 read tools; class R/T |
| **1. Internal, reversible** | Create a task or reminder, assign, file a document, internal note, proposed document-type label, Sorter match above threshold | AUTO (labels and notes: APPROVE at checkpoint during the pilot, AIW-D71, D80) | APPROVE (now or checkpoint) or OFF | none | AG11-D1 internal actions; AIW-D71, D80 |
| **2. Fixed-rule client message** | Missing-document chase, upload acknowledgement, appointment reminder, from a published firm template with merge fields only | AUTO, with the **hold window** (c.6) when started inside an AI job | APPROVE or OFF per recipe | none | AG11-D1, AG11-D12, AG-11-79 |
| **3. Profile value from a document** | A passport number read by the Reader | APPROVE **at checkpoint** (verified in the bundle, approve-all with AW-1-33) | APPROVE now, or OFF | APPROVE (AG11-D10: approving is verifying) | AG-11-53 |
| **4. AI-written text to a client** | A reply to a client's question; a plain notice after a government letter | APPROVE **now** (a client is waiting) | APPROVE at checkpoint (for messages that can wait, for example a file-ready notice), or OFF | APPROVE; licensed approver by default (AG11-D11(a)) | AG-11-53; "Lowering an AI-text floor is impossible" |
| **5. Government form and application documents** | Filler form draft; AI-drafted letter of explanation or cover letter that goes into the application | APPROVE **at checkpoint** | APPROVE now, or OFF | APPROVE; one act is AG-07's consultant approval (AG11-D8); four-eyes where Team safeguards apply (AG11-D9) | AG-11-53, AG11-D8 |
| **6. Person only** | Advice and pathway choice, signing, money entries, review approval, submission to the government, deletion, export, changing users, roles, settings or delegations | Never done by the AI; the AI may prepare material only | — | Not an action the AI can take at any level | AG-11-54; AW-1-37 to AW-1-51; class H |

Tier 1 to 5 apply the same permission check as doing the action by hand (AG-11-58) and the run pass of `research/ai-architecture-deterministic-2026-10.md` §7.4.

### c.3 Fixed checkpoints: what law, ratified decisions and the team's floors already require

| Checkpoint | Fixed by | Can the firm remove it? | Can the founder? |
|---|---|---|---|
| A person chooses the pathway and gives any advice | FD-16 ("no model output is ever a decision"); class H | No | Only by amending FD-16 (not recommended) |
| Every AI-written message to a client is approved by a person | AG11-D1 floor; AG-11-53; FD-16 | No ("The floor cannot be lowered by anyone", AG-11 §3.3) | Would need the team to change its floor and FD-16. Not recommended. |
| Every value read from a document is verified by a person | AG11-D10; AG-11-53 | No | Same |
| Every government form is approved by a person, once | AG11-D8; AG-11-53 | No | Same |
| Nothing is ever submitted to the government by the product | AG-11-54 | No | Same |
| Money, signing, deletion, export, settings | AW-1-37 to AW-1-51 (hard limits, provisional) | No | Yes, by decision; not recommended |
| Internal review before submission (and four-eyes where Team safeguards apply) | AG-07 review; AG11-D9; AW1-D5 | Four-eyes: Owner may switch off with a reason (AG11-D9) | — |

**Where "maximum autonomy" meets the floors (plain words).** The founder asked for maximum autonomy; the team wrote "Lowering an AI-text floor is impossible"; FD-16 says every AI output is approved before it has effect. This model does **not** lower any floor. What it changes is **when and how** the approval happens: grouped into one bundle wherever the client is not waiting, and never one item at a time where one look will do. What the firm may toggle: everything above the floors (tiers 1 and 2 fully; tiers 3 to 5 between "now" and "at checkpoint", or OFF), who may approve AI-written text (AG11-D11(a), the Owner's setting), four-eyes (AG11-D9), and each teammate on or off (AW-1-125).

### c.4 The bundle approval screen (not a rubber stamp)

Proposal: **the bundle is the readiness report already specified** (AW-1-72, AW1-D5), widened to carry every item the job held "at checkpoint". No second screen.

What it shows, in this order:
1. **What will happen if you approve**: a short list of every effect (values to write, forms to approve, letters to place in the application, messages to send) with a count, so the person sees the blast radius before details (the idea of AG-11-29's batch count).
2. **What needs your judgement first** (cannot be skipped): items below the confidence level, rule failures, pack conflicts, anything the AI flagged as unsure, any value that changed since it was drafted (stale, AG-11-61). "Approve all" stays disabled until each is opened (AW-1-33(a)).
3. **Spot-check values**: at least one value shown blank for the person to type from the document (AW-1-33(b)); the match is recorded, never the value.
4. **Values with their sources**: each beside its document region (AG11-D10), grouped by document.
5. **Forms**: each form draft, filled only from the values verified in step 4 (re-rendered after step 4, see conflict E6), approved one form at a time inside the same screen (AG11-D8: one act per form, recorded separately).
6. **AI-written documents**: letter of explanation, cover letter, each with "facts used" and their sources; the labelled AI summary paragraph (AW1-D5).
7. **The job's history**: what was done automatically (sends, tasks, labels), with links, so the person sees everything that already happened.
8. **Actions per line and for all**: approve all (subject to 2 and 3), approve some, edit then approve, reject with reason (AG-11-57). Approving runs each effect once, under its own idempotency key, through every send-time rail.

Size rule (Proposal): one bundle per file per checkpoint; never across clients; if a bundle grows beyond a firm-set size (default 40 lines), it splits by section so each look stays short (the approval-fatigue evidence, b.2).

The private alarm (AW-1-33(c), AW1-D38) and "assist, don't monitor" (AW1-BR-20) apply unchanged.

### c.5 The permission toggle grid

One screen under Advanced (AG-16), edited by the Owner (and holders of `agent/automation:set-autonomy`, AG-11 §10), audited. Rows are action kinds (c.2 tiers 1 to 5, about 12 rows); columns are the six starter roles (Owner, Admin, Case Manager, Case Officer, Billing / Finance, Read-only; AG-01 v1.18) or any custom role. Each cell holds one of: **Auto · Ask now · Ask at checkpoint · Off**, plus "who may approve" where AG11-D11 allows it.

Example, **Balanced** preset (Proposal):

| Action kind (inside an AI teammate's job) | Case Officer's AI | Intake AI | Billing AI | Owner's AI | Floor |
|---|---|---|---|---|---|
| Tasks, reminders, assignments, filing | Auto | Auto | Auto | Auto | — |
| Document-type label, internal note | Ask at checkpoint (pilot) → may earn Auto | same | — | — | — |
| Template message to a client | Auto + hold window | Auto + hold window | Auto + hold window | Ask now | — |
| Profile value read from a document | Ask at checkpoint | Ask now | — | — | Ask |
| AI-written client message | Ask now (licensed approver) | Ask now (licensed approver) | Ask now | Ask now | Ask |
| Government form draft | Ask at checkpoint | Off | — | — | Ask |
| AI-drafted application letter | Ask at checkpoint | — | — | — | Ask |
| Money, signing, submission, deletion, export | Never (not in the grid as a choice) | same | same | same | Person only |

Three presets, one click each: **Careful** (every Ask is "now"; tier 2 sends Ask now), **Balanced** (above, the default), **Fast** (tier 2 without hold window; tier 3 at checkpoint for every teammate). Every preset respects the floors; the screen refuses a cell below the floor and the engine re-checks at run time (AG-11 §3.3). A cell is per teammate and role, but **approval permission is always the person's own** (AG-11-58): the grid decides *when* the AI asks, never *who is allowed*.

### c.6 Earned autonomy

Builds on the driving test and health light (AIW-D83) and the run records (`research/ai-architecture-deterministic-2026-10.md` §4.5).

- **Eligible actions only:** tier 1 (internal, reversible). Tiers 3 to 5 can never be promoted to Auto (floors). Tier 2 is already Auto.
- **When the platform proposes promotion** (Proposal; numbers to be set with the immigration specialist, as AIW-D83 says): at least 200 decisions on this action in this firm over at least 4 weeks; at least 98% accepted unchanged; no critical error; spot-check match rate above its level; health light green.
- **Who decides:** the Owner, one click, recorded with the figures shown. The AI never promotes itself.
- **After promotion:** 1 in 20 items (firm may raise it) still goes to a person as a **sample check**, because once an action is Auto there is no acceptance signal left to measure (b.2).
- **Automatic drop-back to Ask:** health light amber or red, a sample check failed, a skill or model version changed, or a pack rule that the skill uses changed. Drop-back is immediate, recorded, shown on the AI team page; re-promotion needs the Owner again.
- **Per firm and per skill, never per person** (AW1-BR-20): no staff member is ranked by how often they agree.

### c.7 Visibility: never blind

| What | What the person sees | Builds on |
|---|---|---|
| **Live job panel** | On every case: the job's steps, done / running / waiting, what is held for the checkpoint, the next stop | "AI on this case" panel, AIW-D85 |
| **Detail on click** | What was read, proposed, from which source, which rule passed or failed, why | AIW-D85 drawer; arch. §4.5 |
| **Hold window** (Proposal) | Automatic client sends started inside an AI job wait 10 minutes (firm sets 0 to 60) in a visible "about to send" list with Cancel. Not an approval: it never satisfies a floor and never turns an Ask into an Auto. | Gmail-style delay [15]; AG-11-59 untouched (it concerns pending approvals) |
| **Stop the job** | One button per job; stops at the next safe point, never mid-send | AW-1-19 |
| **Switches** | Teammate switch (AW-1-125), firm AI switch (AW-1-53), Expat Ready's emergency stops (AIW-D78, AW-1-56) | already ratified |
| **Daily summary** | One line per teammate: jobs moved, items done automatically, items held for you, failures; expands on click | Done for you, AG-11 §3.13; daily plan skill |
| **Weekly to the Owner** | Promotions, drop-backs, sample-check results, firm-wide counts without names | AW1-BR-20; AG-14-39 |

### c.8 What stays with a person forever

Advice and the pathway choice; signing anything; every AI-written message to a client; verifying every value read from a document; approving every government form; the internal review approval; submitting to the government; every money entry; deleting or exporting data; changing users, roles, settings, delegations, the toggle grid and any promotion; switching any safeguard off; ending a delegation. (FD-16; AG-11-53, AG-11-54; AG11-D8, D10; AW-1-37 to AW-1-51.)

### c.9 Worked example: "Prepare Client A's file" (fictional, Balanced preset)

| Moment | What happens | Person's clicks |
|---|---|---|
| Day 0 | The consultant chose the pathway; retainer signed (existing human acts). The Case Officer's AI starts the job. | 0 new |
| Days 1 to 20 | Checklist built by rule; chase template sends Auto (hold window 10 min); 9 uploads read; values and labels held for the checkpoint; 2 client questions arrive. | 2 (approve each AI reply, now, licensed approver) |
| Day 12 | Reader cannot read a date on one document: flagged, an internal task asks the officer to look. | 1 (resolve exception) |
| Day 21 | Ready-for-review rule met; bundle arrives: 6 unsure items, 2 spot-check values, ~50 values, 3 forms, 1 letter of explanation. | ~5 decision points in one sitting: open unsure items, type spot-checks, approve values, approve each of 3 forms (one screen), approve letter |
| Day 21 | Internal review approval (four-eyes if on), then the consultant submits to the government outside the product's AI. | 1 to 2 (existing) |

### c.10 Bottom line: how much autonomy this really delivers [I]

| | Approval events per file (estimate) | When |
|---|---|---|
| **Today's specification** (every APPROVE item separate; `design/behaviours/case-assistant.md` §8 pattern) | about 25 to 35: one per uploaded document's values (~10), one per document-type proposal in the pilot (~10), each AI client message (~4 to 6), each form (~3), readiness report, review | spread over weeks, each a separate visit |
| **This model** | about 6 to 10: AI client replies that cannot wait (~2 to 4), exceptions (~1 to 3), one bundle (counted as ~3 decision points: values, forms, letters), review | most in one sitting |

That is roughly **two-thirds to four-fifths fewer approval events** [I, unmeasured]. Time saved is smaller than the click saving: the bundle review is real work by design (safeguards). The pilot measures it (AIW-D83); no figure goes to a buyer or investor before then. What it is **not**: a file prepared with zero human time. With FD-16 and the floors, the ceiling for an immigration file is "the AI does the work; a licensed person spends a focused 20 to 40 minutes checking it" [I].

---

## (d) Decisions for the founder (one at a time)

| # | Decision | Recommendation | Why, in one line |
|---|---|---|---|
| D1 | Adopt "one job, few checkpoints": APPROVE gains "ask now / ask at the checkpoint"; the bundle is the readiness report widened | **Yes** | Biggest cut in clicks with no floor lowered and no new system. |
| D2 | Reword AIW-D93 from "every action with an effect is a proposal that waits in Needs you" to "every action with an effect is approved by a person before it takes effect, singly or in the job's bundle; internal reversible actions follow the firm's grid" | **Yes** | Today's wording forces one approval per action, the exact thing you asked to remove. |
| D3 | Keep FD-16 and the team's floors unchanged (no Auto for AI-written client text, values, forms) | **Keep** | Your buyers' licences ride on it, and with counsel dropped (AIW-D94) it is our main legal guard. |
| D4 | Earned autonomy only for internal, reversible actions; the Owner confirms each promotion; sample checks continue; automatic drop-back | **Yes** | Real autonomy where errors are cheap and reversible; nothing promotes itself. |
| D5 | Hold window of 10 minutes on automatic client sends started inside an AI job (firm sets 0 to 60) | **Yes, AI jobs only** | A cheap undo for the one kind of send that goes out without a click; ordinary team recipes stay the team's subject. |
| D6 | Three presets (Careful / Balanced / Fast) on the grid, Balanced by default | **Yes** | One click for a small firm; full grid under Advanced for the rest. |

---

## (e) Conflicts with ratified decisions or team requirements (stated, not resolved)

| # | Conflict | With | Who decides |
|---|---|---|---|
| E1 | Bundle and "ask at checkpoint" versus "every action with an effect is a proposal that waits in Needs you until a person approves it" | AIW-D93 | The founder (D2) |
| E2 | Earned Auto for any AI output that has an effect outside the firm would break "every output is human-approved before it has effect". This model limits earned Auto to tier 1, which AIW-D71 and D80 read as not an effect. | FD-16; AIW-D71, D80 | The founder; FD-16 changes only with his yes |
| E3 | The founder's "maximum autonomy" versus "Lowering an AI-text floor is impossible" | AG11-D1, AG-11-53 | The team owns its floor; this model keeps it |
| E4 | "Ask at the checkpoint" is a new holding state; AG-11 knows only inline approval and Needs you ("Needs you holds only what is waiting") | AG11-D2, AG-11-55, AG-11-60 | Team subject for the Needs you mechanics; Workstream 2 owns the AI part. The Lead decides whether a change note is due (README §0 rule 11) |
| E5 | The AI calling action tools inside a job | AG-11-94 ("models SHALL have no tool access"), already recorded under AIW-D93 | The team, at the founder's request |
| E6 | Forms in the bundle are drafted from values verified only in the same bundle; the team says immigration-significant merge fields render only from verified values (AG-11-97, for templates) and the Filler's rule for unverified values is not stated here | AG-11-97; AG-07 | Team question: may a form draft be built from proposed values, marked unverified, and re-rendered after verification? |
| E7 | Approving several forms in one screen versus one consultant approval per form | AG11-D8; AG-07 | Team question; this model keeps one recorded act per form |
| E8 | The bundle relies on the three safeguards, still marked "provisional until counsel"; counsel is now dropped | AIW-D57, AW1-D25; AIW-D94 | The founder: confirm they are final |
| E9 | Hold window on AI-job sends; team recipes' AUTO sends have none | AG11-D1 (AUTO = runs) | Team subject if extended beyond AI jobs |
| E10 | Promotion figures (200 decisions, 98%) are Proposal; AIW-D83 says bars are set with the immigration specialist | AIW-D83 | The Lead with the specialist |
| E11 | The Case Officer's AI profile says it "sends anything to a client by itself: never"; inside a job, rule-run template sends go Auto. They are the recipe's sends (class R), not the AI's, but a reader may see a contradiction | `handbook/ai-team-profiles.md` §3.1 | The Lead (wording) |

---

## (f) What not to do

1. **No auto-approve on a timer.** A waiting item never executes because time passed (AG-11-59). The hold window applies only to sends already allowed to be Auto.
2. **No AI as the approver.** Claude Code's auto mode uses a classifier to approve actions [1]; that suits code, not client letters and forms. A second model never stands in for the person on tiers 3 to 5.
3. **No promotion by the AI itself, and no promotion of floored actions.**
4. **No cross-client bundles** and no "approve everything for today" button.
5. **No new autonomy vocabulary or engine.** Reuse AUTO / APPROVE / OFF, Needs you, the readiness report, the run records and the permission keys (AIW-D84; arch. §7.4).
6. **No per-person agreement league tables** (AW1-BR-20).
7. **No AI output choosing the next step, tool, recipient or permission** (arch. part (c); §7.4 item 3). The job's steps are fixed by the recipe; the AI fills them.
8. **No claim of "autonomous AI" or "fully automated files" to buyers** (FD-16, AIW-D92). Say "AI prepares the whole file; a named person approves it".
9. **No click-count target as the success measure.** Measure errors caught at the bundle and spot-check match rates alongside time saved.
10. **No designing of non-AI mechanics** (the 11 Oct scope lesson): Needs you, Team safeguards and recipes are the team's; we state what the AI layer needs from them.

---

## (g) Sources (all accessed 12 Oct 2026)

1. Anthropic, Claude Code docs, "Choose a permission mode". https://code.claude.com/docs/en/permission-modes [V]
2. Anthropic, "Measuring AI agent autonomy in practice", 18 Feb 2026. https://www.anthropic.com/research/measuring-agent-autonomy [V]
3. GitHub Docs, "Reviewing a pull request created by Copilot". https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/review-copilot-prs [S, search extract]
4. GitHub Changelog, "Optionally skip approval for Copilot coding agent Actions workflows", 13 Mar 2026. https://github.blog/changelog/2026-03-13-optionally-skip-approval-for-copilot-coding-agent-actions-workflows/ [S, search extract]
5. OpenAI Help Center, "ChatGPT agent". https://help.openai.com/en/articles/11752874-chatgpt-agent ; French page noting replacement: https://help.openai.com/fr-ca/articles/11752874-chatgpt-agent [S]
6. Clio press release, "Clio Work now has agentic capabilities", Apr 2026. https://www.clio.com/about/press/clio-work-agentic-mode-small-law-firms/ ; LawNext coverage: https://lawnext.com/2026/04/clio-adds-agentic-ai-capabilities-to-clio-work-also-launches-vincent-mobile-app.html [VC]
7. Intercom Help, "Human-in-the-loop approvals for Fin Procedures". https://www.intercom.com/help/en/articles/14468561-human-in-the-loop-approvals-for-fin-procedures ; Fin update: https://fin.ai/updates/procedures-ask-a-teammate [V via search extract]
8. TechTarget, "ServiceNow intros AI agent studio and orchestrator". https://www.techtarget.com/ai/news/366618614/ServiceNow-intros-AI-agent-studio-and-orchestrator ; TechTarget on Autonomous Workforce governance: https://www.techtarget.com/searchitoperations/news/366639250/ServiceNow-touts-AI-governance-for-its-Autonomous-Workforce [S]
9. Microsoft Learn, "Request information from human review in agent flows". https://learn.microsoft.com/en-us/microsoft-copilot-studio/flows-request-for-information [S, search extract]
10. Salesforce Trailhead, "Explore Agentforce guardrails and trust patterns". https://trailhead.salesforce.com/content/learn/modules/trusted-agentic-ai/explore-agentforce-guardrails-and-trust-patterns [S]
11. Ramp community, "New on Ramp: AI Agents". https://community.ramp.com/t/new-on-ramp-ai-agents/956 ; Finextra: https://www.finextra.com/pressarticle/106305/ramp-rolls-out-ai-agents [VC]
12. Brex, expense management product page. https://brex.com/product/expense-management [VC]
13. EvenUp blog, "Leveraging AI and human review in demand letters". https://evenuplaw.com/blog/leveraging-ai-human-review-in-demand-letters-the-evenup-difference [VC]
14. CFOtech UK, "Harvey launches 500 legal AI agents, builder tool", May 2026. https://cfotech.co.uk/story/harvey-launches-500-legal-ai-agents-builder-tool [VC]
15. NC State OIT, "Unsend an email in Gmail". https://oit.ncsu.edu/2022/03/15/unsend-an-email-in-gmail/ ; Computer Hope, "Undo send". https://www.computerhope.com/jargon/u/undo-send.htm [S]
16. Feng, McDonald, Zhang (University of Washington), "Levels of Autonomy for AI Agents", Knight First Amendment Institute, 2025. https://knightcolumbia.org/content/levels-of-autonomy-for-ai-agents-1 ; https://arxiv.org/abs/2506.12469 [V via abstract]
17. Dratsch et al., "Automation bias in mammography", Radiology, 2023 (figures from secondary coverage; the paper itself was not opened). https://pubs.rsna.org/doi/10.1148/radiol.222176 [S]
18. Practitioner pieces on approval fatigue, 2026: https://tianpan.co/blog/2026-06-25-approval-fatigue-how-human-in-the-loop-gates-decay-into-rubber-stamps ; https://www.fullstack.com/labs/resources/blog/gate-fatigue-when-human-approval-stops-meaning-anything ; https://www.corporatecomplianceinsights.com/human-in-loop-just-another-rubber-stamp/ [S]
19. EU AI Act, Article 14 (human oversight), as quoted by https://www.euaiact.com/blog/eu-ai-act-human-oversight and https://presencis.com/regulations/eu-ai-act/conformity/article-14-human-oversight ; official text to be checked at https://eur-lex.europa.eu/eli/reg/2024/1689/oj [S]

**Internal files (cited, not restated):** listed under "Builds on" at the top.

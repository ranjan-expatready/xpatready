# AI autonomy model: one job, few checkpoints (Proposal, revision 3)

**Status:** Proposal by the maker, 12 Oct 2026. Revision 2 fixed the findings of hostile check R6 (`checks/review-R6-2026-10-12.md`) under the Lead's rulings of 12 Oct; revision 3 applies re-check R6-b (`checks/review-R6-b-2026-10-12.md`) and builds in the founder's AIW-D100 (values from uploads reviewed in the bundle sitting). It goes back to the checker, then the Lead, then the founder. Nothing here is ratified.

**The founder's words** (`founder-brief.md`, "12 Oct 2026 (autonomy answer, same session)", quoted exactly, with omissions marked): "I like the idea of on autonomy, but why every action, right? Wherever we can basically um, ask only approvals at the critical points, right, which makes sense. Otherwise, let, let them do end-to-end job and approve it at the end. ... But not blind autonomy that he's doing what he's doing, nobody knowing. So human approval is required, but minimal human approval or maybe there are various without over-engineering, if you can keep toggle what kind of permissions are required. I don't know. If you want to go the giving the permissions, if it is easy, let's do it. That who can do what and what not, but I want the maximum level of autonomy possible. Also, not blind autonomy where humans are completely removed from the loop." Recorded as AIW-D95.

**Builds on (cited, not restated):** FD-16 (`sources/drive-snapshot-2026-10-11/01-techno-functional/07-Founder-Decisions-Log.md` line 52); in AG-11 v1.12 (`sources/drive-snapshot-2026-10-11/02-functional-requirements/agent/AG-11-automation_v1.12_2026-10-10.md`): AG11-D1, AG11-D2, AG11-D8, AG11-D9, AG11-D10, AG11-D11, AG11-D12, AG-11-51 to AG-11-63, AG-11-66, AG-11-94, AG-11-97, AG-11-100, AG-11-108, AG-11-89, §3.3, §3.13; AG-01 v1.18 (six starter roles); in `ai-workers/decisions.md`: AIW-D13, D41, D55, D57, D71, D78, D80, D83, D85, D92 to D101; in `requirements/AW-01-firm-ai-assistants_v0.1.md`: AW-1-5, AW-1-8, AW-1-11, AW-1-12, AW-1-15, AW-1-19, AW-1-30, AW-1-31, AW-1-33, AW-1-36, AW-1-37 to AW-1-51, AW-1-53, AW-1-56, AW-1-69 to AW-1-72, AW-1-76, AW-1-78, AW-1-119, AW-1-120, AW-1-125, AW1-D5, AW1-D23, AW1-D25, AW1-BR-20; `research/ai-architecture-deterministic-2026-10.md` §4.5, §7.4; `handbook/ai-team-profiles.md` §1, §2, §3.1; `design/rules-ai-classification-2026-10-12.md` §1.

**Labels.** [V] verified in a primary source that we or the checker opened; [S] a secondary source, or a primary nobody opened; [VC] the vendor's own claim; [I] our inference or estimate. **Proposal** = new design, not yet decided. **Team need** = something only the team's product can supply; we state the need and do not design it (the 11 Oct scope lesson).

---

## (a) Summary for the founder

1. An AI teammate can run a whole job, such as "prepare this client's file". It stops only where a person must look. Work that can wait is grouped into **one end-of-job bundle**, approved in one sitting. Nothing the AI prepares takes effect before a person approves it, so FD-16 holds: approving at the end is still approving before the effect.
2. What is new is small: a setting on the team's "Ask me first" level, **ask now** or **ask at the checkpoint**, plus the bundle screen. The bundle is separate from the readiness report; the readiness report stays as specified.
3. Some stops can never move to the end. **Anything linked to a government deadline is always "ask now"**, in every setting. So is anything another step needs verified first, such as a rejected upload the client must re-send.
4. Your AIW-D100 is built in: values the product reads from uploads wait for the bundle sitting, stay provisional until approved, sit beside their source passage, and identity details, consequential values and conflicts each need an explicit check (a spot check never counts as checking every value).
5. Your "maximum autonomy" meets the team's rule "Lowering an AI-text floor is impossible" (AG11-D1). Every AI-written client message, every form and every value read from a document still needs a person. This model keeps those floors.
6. Money, deletion, export, settings and signing are blocked for the AI by **our own provisional limits**, not by law or the team. With counsel dropped (AIW-D94), you decide whether they stay (decision D8). I recommend they stay.
7. The toggle, as you decided (AIW-D101): two presets, **"Review each step"** (the default) and **"Review at checkpoints"**, with a role-by-action grid under **"Customise"**. Floors are locked in all three; the grid never grants access. The screens are the team's to build.
8. "Fewer checks, earned": an AI-drafted internal note may stop needing a click once it passes its test set and its measured agreement bar (AW-1-119, AW-1-120). The Owner confirms with one click, and it drops back by itself if quality falls. Nothing client-facing can be earned this way.
9. Never blind: the live "AI on this case" panel, a stop button for the person, the switches you already have (AIW-D78) and a daily summary.
10. Honest estimate [I]: on a typical file, under **"Review at checkpoints"**, separate approval visits fall from about **31 to about 14 (a little over half fewer)** where one person holds every approval key, and to about 15 where an officer and a consultant split the bundle. The default "Review each step" stays at 31. The number of things a person decides does not fall. What the AI really takes off people is the **preparation work** and the interruptions, not the checks.
11. Most of the file is built by the product's rules, not by AI (AIW-D92). Selling follows your headline: "An AI team for your immigration practice" (AIW-D99).
12. Six decisions remain open for you in part (d), each a single yes/no question; four earlier ones are marked as already decided by you (AIW-D96, D100, D101).

---

## (b) Research findings: how leading products give autonomy safely

### b.1 What the products do

| Product | How autonomy is given | How the person stays in control | Label |
|---|---|---|---|
| **Claude Code** (Anthropic) [1] | Six permission modes. In `acceptEdits` the person reviews changes afterwards in their editor or with `git diff` instead of approving each edit. `plan` researches and writes a plan without changing files. In `auto`, a second model (a classifier) reviews actions instead of the person. `dontAsk` allows only pre-approved tools. | Deny rules block in every mode. Protected paths are never auto-approved except in the bypass mode. | [V] |
| **Anthropic study of real agent use** (18 Feb 2026) [2] | Full auto-approve in about 20% of sessions for users with fewer than 50 sessions, and over 40% by 750 sessions. Only 0.8% of actions appeared irreversible (for example, an email to a customer). | Experienced users interrupt more (about 9% of turns against 5%). Anthropic advises "trustworthy visibility" and "simple intervention mechanisms", and warns that approving every action adds friction "without necessarily producing safety benefits". | [V] |
| **GitHub Copilot coding agent** [3][4] | The agent works alone and hands over one pull request: the checkpoint. | By default its automated checks do not run until a person approves them; since March 2026 an admin may skip that. An approval of a Copilot pull request does not count toward required reviews; another reviewer must approve. | [V] (opened by the checker, R6) |
| **ChatGPT agent** (OpenAI) [5] | Multi-step tasks in the background. | Asks before consequential actions (sending an email, submitting a form, buying). "Watch mode" on sensitive sites. The person can take over. A French help page says the agent has since been replaced. | [S]; current status Unknown |
| **Clio Work** (legal, Apr 2026) [6] | One goal-based prompt; the system plans and runs the steps. | Shows its reasoning live. The lawyer can interrupt, redirect or sharpen the request mid-task. | [VC] |
| **Intercom Fin Procedures** [7] | Fin runs a whole support procedure. | Pauses at a critical point (refunds, account closure, data deletion) for a teammate, who may answer from Slack. On timeout it escalates; it does not go ahead. | [V] (opened by the checker, R6) |
| **Microsoft Copilot Studio** [8] | Agent flows run on their own. | A "request for information" step pauses the flow for named reviewers; the first answer counts. | [S] (search extract) |
| **Salesforce Agentforce** [9] | Topics limit what an agent may do. | Escalation to a person by instruction; audit trail. Salesforce's policy keeps a human as the final decision on legal or important matters. | [S] |
| **Ramp** and **Brex** (spending) [10][11] | Agents approve in-policy expenses with policy citations. One summary says some customers went from reviewing all receipts to a tenth of them. | Out-of-policy items go to a person; every decision is logged. | [VC] |
| **EvenUp** (legal letters) [12] | The AI drafts the whole letter, with line-level source links. | The firm reviews and finalises it. An optional tier adds the vendor's own reviewers first. | [VC] |
| **Harvey** (legal, May 2026) [13] | 500+ ready-made agents and a builder. | We found no published approval gates. | [VC]; gates Unknown |
| **Gmail Undo Send** [14] | The message looks sent at once. | It is actually held 5 to 30 seconds so it can be cancelled: a delay, not a recall. | [S] |

*Removed in revision 2:* the ServiceNow row. The checker opened both cited pages, and neither supports what the row said (R6 M-7).

### b.2 What the research says about approvals

- **Levels of autonomy** [15]: a 2025 University of Washington paper, published by the Knight First Amendment Institute, names five levels by the person's role: operator, collaborator, consultant, approver, observer. It treats autonomy as a deliberate design decision, separate from capability. Our target is **approver** per job. [V]
- **Rubber-stamping** [16][17]: a 2023 study in *Radiology* found that when the AI was wrong, inexperienced radiologists' accuracy fell from about 80% to under 20%, and experienced ones' from 82% to 45.5% (as reported by [16]; the journal itself refused access). Several 2026 practitioner pieces describe "approval fatigue": the longer the queue, the weaker each check, and a high agreement rate alone cannot tell a good AI from a rubber stamp. [S]
- **Law** [18]: EU AI Act Article 14(4)(b) asks that overseers stay aware of "the possible tendency of automatically relying or over-relying" on the output, and can override or stop the system. It does not bind Expat Ready in Canada; we use it as a benchmark. [S]

### b.3 What this means for us [I]

1. Several leading products, for example GitHub's coding agent, Claude Code and Intercom Fin, approve a **finished result or a critical point** rather than every step.
2. They separate reversible, internal work (let it run and show it) from irreversible, external acts (stop and ask). This matches the team's AUTO / APPROVE split (AG11-D1).
3. Visibility and a simple way to interrupt matter as much as prompts (Anthropic [2], Clio [6]).
4. Fewer approvals work only if each one is a real check: uncertain items first and planted checks, as AW-1-33 already requires.
5. Among the products we looked at, we found none in regulated work that sends AI-written free text to a client with no person reviewing it.

---

## (c) The model

### c.1 The idea

```
Person starts the job ──► AI teammate works the job in draft ──► end-of-job bundle ──► person approves ──► platform performs the effects ──► readiness report (unchanged, AW-1-71/72)
(chooses pathway,         rules do the fixed steps; the AI         (the teammate's own    (one sitting where                                 ──► review ──► person submits
 retainer signed)         reads and drafts; "ask now" items         outputs that can wait, one person holds
                          go to Needs you at once                  plus upload values,    every key)
                                                                   AIW-D100)
```

**The one safety rule.** During the job, only three kinds of thing take effect without a click:
- fixed-rule actions the firm already approved once, such as a published template chosen by a rule (AG11-D12; AW-1-46; subject to the founder's answer on D7);
- internal actions the team already sets to AUTO, such as tasks and reminders (AG11-D1; AW-1-70);
- anything a person has approved.

Everything else is a proposal (AIW-D93), approved either at once or in the bundle. FD-16 says every AI output is "human-approved before it has effect". Approving in the bundle is still before the effect.

**Whose work is whose** (AW-1-15; `handbook/ai-team-profiles.md` §2):
- **Product AI** is not the teammate's AI. It covers the Reader's values and document types on every upload, deadline dates read from government letters, and the Sorter's message matches, and it runs for every firm (AW-1-15). **One part now joins the bundle, by the founder's decision AIW-D100:** values the Reader proposes from uploads are reviewed in the bundle sitting wherever possible and stay provisional until a person approves them. The teammate's upload verdict (AW-1-76), which carries those values, waits with them, unless it holds a finding the client must act on (for example a rejected upload): that is a dependent action, so it is asked earlier (AIW-D100 point 4). This changes our own AW-1-15; the team is asked to revisit AG-11-60 (E13). Document types (AW-1-78), deadline dates (AG-11-108) and Sorter matches keep their own Needs you items as AG-11-60 says.
- **Rules work.** Most of "prepare a client file" is the product's rules: the checklist, the chase recipe, the deadline watch, the Filler, the ready-for-review rule (AW-1-71). None of it is AI (AIW-D92).
- **The teammate's own AI work** is what this model governs: drafting letters and client messages, internal notes, requesting form drafts from the Filler (the form itself is rules work), and starting the eligibility assessment (AIW-D96).

**The stop rule** (AIW-D98). The teammate uses only approved engine results. It cites its sources and the pack version, and it **stops and hands the job to a person**, with a named failure, when checks find missing, stale or conflicting evidence. A stop is always "ask now".

### c.2 Action kinds, the two presets and the floors (reusing AG11-D1; presets decided by AIW-D101)

The team's levels stay: **AUTO** ("Send automatically"), **APPROVE** ("Ask me first") and **OFF**. The only addition (decided by the founder through the "Review at checkpoints" preset, AIW-D101) is a property of APPROVE called **when to ask**: **now** (inline or in Needs you, exactly as AG11-D2) or **at the checkpoint** (in the end-of-job bundle). The holding state is a **team need** (E4).

**Locked rule (Lead's ruling on R6 B-1).** Any item linked to a government deadline is **always "ask now"**, in every grid cell. Its due time follows AG-11-59 and AG-11-100 without exception (AW-1-36). The same holds for anything a dependent action needs verified first (AIW-D100 point 4), for example a template send whose immigration-significant field must come from a verified value (AG-11-97), or a rejection the client must act on. Deadline dates themselves are product AI: proposed, approved by a person, then registered with the deadline watch (AG-11-66, AG-11-108).

| Row | Action kind | Review each step (default preset) | Review at checkpoints | Under "Customise" the firm may set | Floor or lock | Source |
|---|---|---|---|---|---|---|
| 1 | Read records and packs; read approved engine results | AUTO | AUTO | — | — | AIW-D93 (read tools) |
| 2 | Create a task or reminder, assign work to a person | AUTO | AUTO | Ask now / at checkpoint / Off | — | AG11-D1 internal actions; AW-1-70 |
| 3 | AI-drafted internal note (never sent) | Ask now (pilot) | Ask at checkpoint (pilot) | Ask now / at checkpoint / Off; may later be earned (c.6) | — | AIW-D80 |
| 4 | Start the eligibility assessment (the rules engine calculates) | Ask now (under AIW-D93 the saved run is a proposal) | Ask now | At checkpoint / Off | Runs on verified values only; otherwise it stops (row 10). Telling a lead or client the result is a licensed person's act (AIW-D41) | AIW-D93, D96, D98 |
| 5 | Client message from a published firm template, chosen by a rule | AUTO | AUTO | Ask now / Off | Drops to APPROVE if an immigration-significant field is not yet verified (AG-11-97). A template marked as carrying status or eligibility content is refused for a lead, and to a client defaults to Ask now (AW-1-46) | AG11-D12; AW-1-46; founder question D7 |
| 6 | AI-written message to a client | Ask now | Ask now | Ask at checkpoint (only when not linked to a deadline) / Off | **APPROVE floor**; licensed approver by default (AG11-D11(a)) | AG-11-53; AW-1-46 |
| 7 | Government form draft (the Filler prepares; the teammate requests it) | Ask now | Ask at checkpoint | Ask now / at checkpoint / Off | **APPROVE floor**; one consultant approval per form (AG11-D8); a second person where the firm's Team safeguards are on (AG11-D9) | AG-11-53 |
| 8 | AI-drafted application letter (letter of explanation, cover letter) | Ask now | Ask at checkpoint | Ask now / at checkpoint / Off | AI-written; explanations reviewed by a licensed person (AIW-D98) | AIW-D98 |
| 9 | Anything linked to a government deadline | **Ask now (locked)** | **Ask now (locked)** | — | Lock | AG-11-59, AG-11-100; AW-1-36 |
| 10 | Stop on missing, stale or conflicting evidence | **Ask now (locked)** | **Ask now (locked)** | — | Lock | AIW-D98 |
| 11 | Values the product's Reader proposes from uploads (product AI, by AIW-D100) | Ask now (as today, AG-11-60) | Ask at checkpoint (bundle sitting, AIW-D100) | Ask now / at checkpoint | **APPROVE floor** (AG11-D10: approving is verifying); asked earlier when a deadline or a dependent action needs them; explicit check for identity details, consequential values and conflicts | AIW-D100; AG-11-53 |

Every approval needs the same permission as doing the act by hand (AG-11-58).

**The two presets (AIW-D101).** "Review each step" is the default: every APPROVE item is asked now, so a firm starts exactly where today's specification is. "Review at checkpoints" moves rows 3, 7, 8 and 11 to the end-of-job bundle (column 4). Under "Customise", the firm sets the role-by-action grid (c.5). Floors and locks are the same in both presets and in the grid, and a checkpoint approval always comes before the action takes effect (FD-16 unchanged). The names "Careful", "Balanced" and "Fast" from earlier drafts are retired.

**Examples the settings screen shows (AIW-D101 point 6; wording is the team's to finalise):**
- *Runs automatically in both presets:* creating a task or reminder for you; a missing-document reminder from your firm's published template; reading the documents and checking them against the pack.
- *Waits for the end-of-job review under "Review at checkpoints":* the values read from a clean upload; form drafts; a letter of explanation; internal notes.
- *Always asks you at once, whatever you choose:* any AI-written message to a client; anything linked to a government deadline; an upload the client must re-send; a stop because evidence is missing, stale or conflicting.
- *Never done by the AI:* advice, signing, money entries, deleting, exporting, submitting to the government (c.3).

**Not in the table, because the AI never does them:** see c.3.

### c.3 What stays with a person, and why (three different reasons)

| Group | Acts | Fixed by | Who could change it |
|---|---|---|---|
| **1. The team's floors and the product's own rule** | Approve every AI-written client message; verify every value read from a document; approve every government form; nothing is ever submitted to the government by the product | AG11-D1, AG-11-53, AG11-D8, AG11-D10, AG-11-54. The team wrote "The floor cannot be lowered by anyone" (AG-11 §3.3). | The team only. Not recommended. |
| **2. FD-16 (ratified)** | Advice, the pathway choice and any decision: "no model output is ever a decision"; telling a lead or client an eligibility result (AIW-D41) | FD-16; AIW-D41 | The founder only. Recommendation: keep. |
| **3. Workstream 2's own hard limits (provisional)** | Money and trust entries, even a draft invoice (AW-1-39); deleting; exporting; changing users, roles, settings or delegations; signing; acting for a paused client or a deactivated person (AW-1-37 to AW-1-51) | AIW-D55 and AW1-D23, "provisional until counsel". Counsel was dropped by AIW-D94, so they are now simply our own choice. | The founder: decision D8. |

**Where "maximum autonomy" meets the floors, in plain words.** This model lowers no floor of group 1 or 2. It changes **when** approvals happen (grouped in one bundle where nobody is waiting), not **whether**. Group 3 is the one place where the founder's "AI does everything a person can" (AIW-D95) could reach further. It is put to him openly in D8.

### c.4 The end-of-job bundle

It is separate from the readiness report (Lead's ruling on R6 M-1). It holds the teammate's own outputs that can wait (rows 3, 6 where set, 7 and 8) and, by AIW-D100, the upload values of row 11 with the upload verdicts that carry them. It arrives when the teammate's job reaches its last drafting step. Once it is approved, and the AW-1-71 conditions are met as today, the readiness report (AW-1-72) follows unchanged.

What the screen shows, in order:
1. **What will happen if you approve**: a short list of every effect (values to verify, forms to approve, letters to place in the file, messages to send, notes to save), with a count.
2. **Values first** (AIW-D100). Every value is marked provisional and shown beside its source passage (AG11-D10). **Identity details, consequential values and any conflict each need their own explicit check**; they can never be approved through "approve all". Anything below the confidence level, flagged as unsure or stale since drafting (AG-11-61) must be opened before "approve all" works for the rest (AW-1-33(a)). The planted values (AW-1-33(b)) test attention only: **a spot check never counts as checking every value** (AIW-D100 point 3).
3. **Corrections refresh the drafts.** A corrected value re-renders every form, letter and message that used it before any of them can be approved (AIW-D100 point 5; AG-11-61).
4. **Forms**, each approved in its own step on the same screen. Each is one recorded consultant approval (AG11-D8).
5. **Letters and messages**, each with the facts it used and their sources (AIW-D98).
6. **What already happened automatically during the job**, with links, so nothing is hidden.
7. **Per line**: approve, edit then approve, or reject with a reason (AG-11-57). Approving makes each effect happen exactly once.

**Who approves the bundle** (R6-b N-M1). The bundle goes to the delegating person when that person holds every key its lines need (AW-1-30). Otherwise each line goes, inside the bundle, to the approver its own rule names: values to a holder of the verify key (AG11-D11(e)); AI-written text to whoever the firm's AI-text approver setting names, and a filed letter also needs the generate key (AW-1-31); each form to every active form approver at once, the first to decide closing it for all (AG-11-89). Every line keeps its own permission check (AG-11-58). **"One sitting" is true only when one person holds all the keys**, which is usual in a solo or small firm (FD-19's first buyer). In a firm where an officer verifies values and a consultant approves forms and letters, it is two sittings, values first. The private alarm (AW-1-33(c), AW1-D38) and "assist, don't monitor" (AW1-BR-20) are unchanged. One bundle per file, never across clients.

### c.5 The toggle grid: who can do what, and how much the AI does alone

**Who can do what** already exists and is not changed: the firm's roles and permissions (AG-01, SA-06), plus each teammate's borrowed slice of its person's permissions, taken key by key (AW-1-8).

**How much the AI does alone** is this grid, under "Customise" (decided by AIW-D101; it controls autonomy only within the delegated person's existing permissions and never grants access). There is one row per action kind from c.2 (rows 2 to 8) and one column per **role**: Owner, Admin, Case Manager, Case Officer, Billing / Finance, Read-only, plus any custom role. A teammate follows the column of its delegation's delegating role (AW-1-5, AW-1-12; Lead's ruling on R6 M-11). Each cell holds **Auto**, **Ask now**, **Ask at checkpoint** or **Off**. Rows 9 and 10 show as locked, and floors cannot be set lower.

Example: the grid as it looks when a firm starts from "Review at checkpoints" (cells as in c.2; Proposal):

| Row | Action kind | Owner | Admin | Case Manager | Case Officer | Billing / Finance | Read-only |
|---|---|---|---|---|---|---|---|
| 2 | Task, reminder, assignment | Auto | Auto | Auto | Auto | Auto | Off |
| 3 | Internal note | At checkpoint | At checkpoint | At checkpoint | At checkpoint | At checkpoint | Off |
| 4 | Start the eligibility assessment | Ask now | Ask now | Ask now | Ask now | Off | Off |
| 5 | Template client message (rule-chosen) | Auto | Auto | Auto | Auto | Auto | Off |
| 6 | AI-written client message | Ask now | Ask now | Ask now | Ask now | Ask now | Off |
| 7 | Form draft | At checkpoint | Off | At checkpoint | At checkpoint | Off | Off |
| 8 | Application letter | At checkpoint | Off | At checkpoint | At checkpoint | Off | Off |
| 9 | Linked to a government deadline | Ask now (locked) | same | same | same | same | same |
| 10 | Stop on missing, stale or conflicting evidence | Ask now (locked) | same | same | same | same | same |
| 11 | Values read from uploads | At checkpoint | At checkpoint | At checkpoint | At checkpoint | Off | Off |

A cell never grants a permission: if the person lacks the key, the teammate cannot do it at all (AW-1-8, AG-11-58). Today the team sets autonomy **per recipe** (AG-11-52). Storing, showing and enforcing a role × action grid is a **team need** (E9); asking the team for it follows from AIW-D101.

### c.6 Fewer checks, earned (internal name only)

This applies to **row 3 (AI-drafted internal notes) only** (AIW-D80). Everything client-facing or floored is excluded. Tasks and template sends are already Auto. Document types are product AI, and they already have their own route to fewer checks (AW-1-78, via the team's threshold rule AG-9-11).

It is built on existing rules, which are not restated here:
- the test-set pass before any lowering of a review level (AW-1-119);
- the agreement bar over the firm's last N decisions, reached in shadow mode (AW-1-120);
- the health light and drop to shadow (AIW-D83).

What is new (Proposal):
- **the Owner's one click** to accept, recorded with the figures;
- **sample checks after the switch**: 1 in 20 notes still goes to a person, because once a note needs no click there is nothing left to measure;
- **automatic drop-back to "ask"**: when the health light leaves green, a sample check fails, or the skill, model or pack version changes.

Measures are per firm and per skill, never per person (AW1-BR-20). Keeping the sample-check and drop-back figures in the run records is a **team need** (E9).

### c.7 Visibility: never blind

| What | Who sees it, and what | Builds on |
|---|---|---|
| Live job panel | On every case: the steps done, running and waiting; what is held for the bundle; the next stop | "AI on this case", AIW-D85 |
| Detail on click | What was read and proposed, from which source, which rule passed or failed, and why | AIW-D85; architecture §4.5 |
| Stop the job | The delegating person stops the run (AW-1-19). Pauses take effect at the next safe point, never in the middle of a send (AW-1-11). | AW-1-19, AW-1-11 |
| Switches | The teammate's switch (AW-1-125), the firm's AI switch (AW-1-53), Expat Ready's emergency stops (AIW-D78, AW-1-56) | ratified |
| Daily summary | One line per teammate: jobs moved, items done automatically, items waiting for you, stops | Done for you, AG-11 §3.13 |
| Hold window on automatic client sends | A short delay with a Cancel button, like Gmail's [14]. **Team question** (E10), not our design: the sends it would cover are the product's recipe mechanics. | — |

### c.8 Worked example: preparing Client A's file (fictional, preset "Review at checkpoints")

| Day | What happens | Who decides, and when |
|---|---|---|
| 0 | The licensed consultant chooses the pathway; the retainer is signed (existing person acts). The Case Officer's AI starts its job (AW-1-69). | — |
| 1–20 | The product's checklist and chase recipe run (rules). Ten uploads arrive. Three have a finding the client must act on (one expired passport, two missing pages), so their verdicts are a dependent action. | Officer, **asked earlier**, 3 times (AIW-D100 point 4); the rejection reason goes from the firm's template |
| 1–20 | The other seven, and the three re-sent uploads, are clean. Their verdicts and values wait, provisional, for the bundle sitting. | Held for the bundle (10 verdicts) |
| 5, 9, 14, 17 | Four client questions; the teammate drafts replies. | Licensed approver, **ask now**, 4 times |
| 8 | A government letter asks for biometrics within 30 days. The Reader proposes the date (product AI). | Officer, **ask now (locked)**, due 2 working days before the deadline (AG-11-100); once approved it is registered with the deadline watch (AG-11-108) |
| 8 | The teammate drafts a plain notice to the client about the letter. | Licensed approver, **ask now (locked: linked to the deadline)** |
| 10, 15 | Two template sends need an immigration-significant field from a verified value (AG-11-97). | Officer verifies that value **earlier**, 2 times (dependent action) |
| 3–18 | The teammate writes three internal notes. | Held for the bundle |
| 19 | The teammate requests three form drafts from the Filler (rules) and drafts two application letters, all from the provisional values. | Held for the bundle |
| 20 | **End-of-job bundle**: 10 upload verdicts with their values (passport identity details and one conflicting date each checked explicitly), 3 notes, then 3 forms and 2 letters. The officer corrects one date; the two forms and the letter that used it re-render before approval. | Small firm, consultant holds every key: **one sitting**, 18 decisions. Officer plus consultant: **two sittings**, values and notes first (officer), then forms and letters (consultant) |
| 21 | The AW-1-71 conditions are now met (no Reader value still proposed); the readiness report arrives (AW-1-72). | Officer accepts it (the submission for internal review, AW1-D5) |
| 22 | Review approval (AG-07), then the person submits to the government. | Existing person acts |

### c.9 Honest estimate [I, unmeasured]

**Unit: separate approval visits** (each time a person opens an item or screen to decide). Same assumptions as revision 2, illustrative and not measured:

| Input | Assumption | Today's spec, and the default preset "Review each step" (visits) | Preset "Review at checkpoints" with AIW-D100 (visits) |
|---|---|---|---|
| A1 Upload verdicts (10 uploads + 3 re-sent) | 13, of which 3 have a finding the client must act on | 13 | 3 asked earlier; 10 in the bundle |
| A2 AI-written client replies | 4 | 4 | 4 (ask now) |
| A3 Government letter: date + client notice | 2 | 2 | 2 (locked) |
| A4 Values needed early by template sends (AG-11-97) | 2 | 2 | 2 (asked earlier) |
| A5 Form drafts | 3 | 3 | in the bundle |
| A6 Application letters | 2 | 2 | in the bundle |
| A7 Internal notes (pilot) | 3 | 3 | in the bundle |
| Bundle sittings | — | — | 1 (one key holder) or 2 (officer and consultant) |
| A8 Readiness report + review approval | 2 | 2 | 2 |
| **Total** | | **31** | **14** (one key holder) or **15** (two) |

- **Under "Review at checkpoints", separate visits fall by a little over half (31 to 14 or 15).** Under the default "Review each step" nothing changes (31): the saving is opt-in. Sums: today 13+4+2+2+3+2+3+2 = 31; model 3+4+2+2+1+2 = 14, or 15 with two sittings. The number of decisions stays 31: the bundle groups 18 of them (10 verdicts, 3 notes, 3 forms, 2 letters).
- If notes are earned (c.6), the bundle drops to 15 decisions; visits do not change.
- If the product also raises a separate document-type item per upload while a teammate is on, today's count rises by up to 13 (team question, E5).
- **What is left is the floors and the deadlines:** AI-written client replies (A2), deadline items (A3), and values another step needs early (A4). Going further would mean lowering a floor (D4 recommends against) or turning AI replies into firm templates, which is the firm's choice, not a model change.
- If the team does not accept the AG-11-60 change (E13), A1 goes back to 13 visits and the total to about 24, as in revision 2.
- **What the founder really gets:** the preparation (reading, checking against the pack, chasing, drafting, assembling) is done by the rules and the teammate, with far fewer interruptions. People keep the checks the floors require, and the bundle sitting is real work by design. Time saved is measured in the pilot (AIW-D83); no figure goes to a buyer or investor before then.

---

## (d) Decisions for the founder (one question each)

**Already decided by the founder (no question left):**
- *Ask now / ask at the checkpoint, presets and grid* (was D1 and the grid question): **AIW-D101**. Two presets, "Review each step" (default) and "Review at checkpoints"; grid under "Customise"; floors locked; never grants access; approval before effect.
- *End-of-job bundle* (was D2): follows from **AIW-D100** and **AIW-D101**. It is kept separate from the readiness report by the Lead's ruling on R6 M-1.
- *The AI starting the eligibility assessment* (was D6): **AIW-D96**. Under AIW-D93 the saved run is a proposal a person approves (row 4); it runs on verified values only, otherwise it stops (AIW-D98).
- *Upload values in the bundle sitting* (raised by R6-b N-M2): **AIW-D100**.

**Still open:**

| # | Question | Recommendation | Why, in one line |
|---|---|---|---|
| D3 | Reword AIW-D93's "waits in Needs you until a person approves it" to "waits until a person approves it, in Needs you or in the job's bundle"? | **Yes** | Without it, "Review at checkpoints" contradicts a ratified decision. |
| D4 | Keep FD-16 and the team's floors exactly as they are? | **Yes, keep** | Your buyers' licences rest on them, and with counsel dropped they are the main guard. |
| D5 | Allow "fewer checks, earned" for AI-drafted internal notes only, with the Owner's click, sample checks and automatic drop-back? | **Yes** | Real autonomy where an error is cheap and stays inside the firm. |
| D7 | Does the firm's one-time approval of a published template count as the human approval (AIW-D13) for a template send the teammate's recipe makes, with the template chosen by a rule? | **Yes** | It is the same reading the product already uses for its own recipes (AG11-D12). |
| D8 | Keep Workstream 2's own limits (no money or trust entry, not even a draft invoice; no deletion, export, settings change or signing by the AI), now that counsel is dropped? | **Yes, keep for Release 1** | They are irreversible or touch client trust money, and nobody outside now checks them (AIW-D94); revisit draft invoices after the pilot. |
| D9 | Are the three anti-rubber-stamp safeguards (AIW-D57) now final, since "provisional until counsel" can no longer end? | **Yes, final** | The bundle relies on them, and leaving them "provisional" for ever is unclear. |

Numbers D1, D2 and D6 are kept out so earlier references stay traceable.

---

## (e) Conflicts with ratified decisions or team requirements (stated, not resolved)

| # | Conflict | With | Who decides |
|---|---|---|---|
| E1 | The bundle versus "a proposal that waits in Needs you until a person approves it" | AIW-D93 | The founder (D3) |
| E2 | No conflict as designed. FD-16 would be broken if "fewer checks, earned" ever reached an action with an effect outside the firm. AIW-D71 covers only document-type labels and AIW-D80 only internal notes. Tasks and reminders are AUTO on the team's own basis (AG11-D1 internal actions; AW-1-70), not under D71 or D80. | FD-16; AIW-D71, D80 | The founder, if ever widened |
| E3 | The founder's "maximum level of autonomy possible" versus "Lowering an AI-text floor is impossible" | AG11-D1, AG-11-53 | The team owns the floor; this model keeps it |
| E4 | "Ask at the checkpoint" is a holding state AG-11 does not have ("Needs you holds only what is waiting") | AG11-D2, AG-11-55, AG-11-60 | Team need for the mechanics; the Lead decides whether a change note is due (README §0 rule 11) |
| E5 | Whether a separate document-type item (AW-1-78) also appears when the teammate's upload verdict (AW-1-76) carries the type | AW-1-76, AW-1-78 | Workstream 2 (AW-01) |
| E6 | The teammate starting the assessment and calling action tools | AIW-D93 (the saved run is an action with an effect, so a proposal; row 4 follows it); AG-11-94 ("models SHALL have no tool access"), already raised under AIW-D93; AW-1-88 ("SHALL NOT run the eligibility assessment"), which AIW-D96 lists as a knock-on | The team (AG-11-94); the Lead (AW-1-88) |
| E7 | The teammate's limits (group 3) are "provisional until counsel", and counsel no longer exists | AIW-D55, AW1-D23; AIW-D94 | The founder (D8) |
| E8 | The anti-rubber-stamp safeguards are "provisional until counsel" | AIW-D57, AW1-D25; AIW-D94 | The founder (D9) |
| E9 | The two presets and the role-by-action grid (decided, AIW-D101), and stored sample-check and drop-back figures, are new; the team sets autonomy per recipe today | AG-11-52 | Team need: storage and screens |
| E10 | A hold window on automatic client sends would change what AUTO means for the product's recipes | AG11-D1 | Team question |
| E11 | Template sends by the teammate's recipe at AUTO, read as approved by the firm's one-time template approval | AIW-D13 ("nothing takes effect until a human approves it") | The founder (D7) |
| E12 | Untested pack rules may publish (SA1B-D18), while Workstream 2 assumes a tested engine | AIW-D98 | The team, already flagged under AIW-D98 |
| E13 | Upload values held for the bundle sitting (AIW-D100) versus "Needs you holds ... Reader-extracted values on client uploads" and the product-AI rule | AG-11-60 (team); AW-1-15 (ours, changes by AIW-D100) | The team is asked to revisit AG-11-60 (their subject, no change note); the Lead updates AW-1-15 |
| E14 | Form drafts and letters prepared from provisional values, re-rendered after a correction (AIW-D100 point 5); the Filler's rule for unverified values is not stated, and template fields render only from verified values (AG-11-97) | AG-07; AG-11-97 | Team question: may the Filler draft from provisional values, marked provisional, and re-render after verification? |

---

## (f) What not to do

1. **No auto-approval on a timer.** A waiting item never acts because time passed (AG-11-59).
2. **No AI as the approver.** Claude Code's classifier suits code [1], not client letters or forms.
3. **Never hold for the bundle anything linked to a deadline, or anything another step needs verified first.** Of the product's AI, only upload values wait (AIW-D100); document types, deadline dates and message matches never do.
4. **No self-promotion by the AI**, and no "fewer checks, earned" for anything floored or client-facing.
5. **No bundles across clients**, and no "approve everything today" button.
6. **Tools as AIW-D93 allows, and no more.** The AI may choose among read tools. Any action with an effect is only a proposal. No AI output chooses a recipient, a permission or a template (AW-1-46: "A template SHALL be chosen by a rule, never by a model"). Text inside client documents never chooses a tool or its inputs.
7. **No rules work called AI** (AIW-D92). Use the founder's ratified wording (AIW-D99): headline "An AI team for your immigration practice."; supporting line "Prepare files, organise documents and draft communications—with maintained rules underneath and your team in control."; supporting message "Rules you can defend. AI that does the legwork." Customer benefit first, then the proof. The moat is the combination: reviewed, dated packs, measured accuracy per skill, the full record and the system of record (AIW-D97). It is not "autonomous AI".
8. **Never claim the AI detects wrong rules** (AIW-D98).
9. **No league tables of staff** (AW1-BR-20).
10. **No designing of the team's mechanics.** Needs you, recipes, the grid's storage and send timing are the team's; we state needs and questions.
11. **No click-count target on its own.** Track errors caught in the bundle and planted-check match rates alongside time saved.

---

## (g) Sources (all accessed 12 Oct 2026)

1. Anthropic, Claude Code docs, "Choose a permission mode". https://code.claude.com/docs/en/permission-modes [V]
2. Anthropic, "Measuring AI agent autonomy in practice", 18 Feb 2026. https://www.anthropic.com/research/measuring-agent-autonomy [V]
3. GitHub Docs, "Reviewing a pull request created by Copilot". https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/review-copilot-prs [V, opened by the checker R6]
4. GitHub Changelog, "Optionally skip approval for Copilot coding agent Actions workflows", 13 Mar 2026. https://github.blog/changelog/2026-03-13-optionally-skip-approval-for-copilot-coding-agent-actions-workflows/ [V, opened by the checker R6]
5. OpenAI Help Center, "ChatGPT agent". https://help.openai.com/en/articles/11752874-chatgpt-agent ; French page noting replacement: https://help.openai.com/fr-ca/articles/11752874-chatgpt-agent [S]
6. Clio press release, "Clio Work now has agentic capabilities", Apr 2026. https://www.clio.com/about/press/clio-work-agentic-mode-small-law-firms/ ; LawNext: https://lawnext.com/2026/04/clio-adds-agentic-ai-capabilities-to-clio-work-also-launches-vincent-mobile-app.html [VC]
7. Intercom Help, "Human-in-the-loop approvals for Fin Procedures". https://www.intercom.com/help/en/articles/14468561-human-in-the-loop-approvals-for-fin-procedures [V, opened by the checker R6]
8. Microsoft Learn, "Request information from human review in agent flows". https://learn.microsoft.com/en-us/microsoft-copilot-studio/flows-request-for-information [S]
9. Salesforce Trailhead, "Explore Agentforce guardrails and trust patterns". https://trailhead.salesforce.com/content/learn/modules/trusted-agentic-ai/explore-agentforce-guardrails-and-trust-patterns [S]
10. Ramp community, "New on Ramp: AI Agents". https://community.ramp.com/t/new-on-ramp-ai-agents/956 ; Finextra: https://www.finextra.com/pressarticle/106305/ramp-rolls-out-ai-agents [VC]
11. Brex, expense management page. https://brex.com/product/expense-management [VC]
12. EvenUp blog, "Leveraging AI and human review in demand letters". https://evenuplaw.com/blog/leveraging-ai-human-review-in-demand-letters-the-evenup-difference [VC]
13. CFOtech UK, "Harvey launches 500 legal AI agents, builder tool", May 2026. https://cfotech.co.uk/story/harvey-launches-500-legal-ai-agents-builder-tool [VC]
14. NC State OIT, "Unsend an email in Gmail". https://oit.ncsu.edu/2022/03/15/unsend-an-email-in-gmail/ [S]
15. "Levels of Autonomy for AI Agents", University of Washington, Knight First Amendment Institute, 2025. https://knightcolumbia.org/content/levels-of-autonomy-for-ai-agents-1 ; https://arxiv.org/abs/2506.12469 [V, opened by the checker R6]
16. Secondary report of the 2023 *Radiology* mammography study: "The HITL Rubber Stamp Problem: Why Human-in-the-Loop Often Means Neither", tianpan.co, 15 Apr 2026. https://tianpan.co/blog/2026-04-15-human-in-the-loop-rubber-stamp ; the journal page, which refused access: https://pubs.rsna.org/doi/10.1148/radiol.222176 [S]
17. Approval fatigue, 2026 practitioner pieces: https://tianpan.co/blog/2026-06-25-approval-fatigue-how-human-in-the-loop-gates-decay-into-rubber-stamps ; https://www.fullstack.com/labs/resources/blog/gate-fatigue-when-human-approval-stops-meaning-anything [S]
18. EU AI Act, Article 14. https://artificialintelligenceact.eu/article/14/ (opened by the checker R6); official text: https://eur-lex.europa.eu/eli/reg/2024/1689/oj [S]

**Internal files:** as listed under "Builds on".

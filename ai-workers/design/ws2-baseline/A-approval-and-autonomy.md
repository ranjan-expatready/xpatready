# A — Approval, autonomy levels, Needs you, Team safeguards and licensed sign-off

> Reference index. The source documents remain the only source of truth.

**What this is, in plain words.** Every automated action carries a setting: run on its own, ask a person first, or off. Some things can never run on their own (the floors): AI-written text to a client, a template edited by AI, any government form, and any value written into the verified profile that nobody has looked at. Work that waits for a person lands in Needs you; what the Doers did lands in Done for you. Team safeguards adds a second pair of eyes once a firm has 5 or more staff, and separate settings decide who may approve AI-written text and messages from unlicensed staff. This file carves out those rules, word for word, including where the product records licensed sign-off but does not verify it (review W1 finding B-3).

**Scope of this file.** AG-11 v1.11 §0, §3.3, §3.13, §4, §5, §10; AG-10, AG-07, AG-08, AG-09, AG-16, AG-18, AG-01, SA-06 and its change note; agent Overview and Phasing; SCOPE-TRIAGE; FDL FD-22. Licence facts are recorded, not judged. Any claim that a licensed person always signs off: **confirm with counsel / RCIC**.

**How to read the table.** The exact-words column is copied from the source; `…` marks words left out; bold, italics and code marks are dropped. L-numbers are lines in the snapshot file.

**Release labels used below (exact words of the label source).**
- **R1-AG11** = AG-11 v1.11 §13 Phasing, under the Release 1 heading (L1291): L1293 "Team safeguards (AG11-D9 …)", L1294 "Licence-aware defaults (AG11-D11)", L1295 (Review your standard messages and the publish reach count), L1296 "Inline approval and template messages at AUTO … Reader approve = verify (AG11-D10)", L1298 "Autonomy levels with defaults and the hard floor (AG11-D1)", L1299 "Needs you + Done for you as the staff home screen".
- **Text** = the requirement states its own release. **None stated** = no release given.
- **Standing conflicts:** Charter V2 pptx slide 1 lists the AG-11 engine as not in Release 1. SCOPE-TRIAGE (a review file, not a requirements document, L3) proposes moving most of this layer to Release 2 (L144–L148; "almost all [F], decided 4–5 Oct", L141).

## 1. Principle and product floors

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| AG-11 §0 overriding principle | we work for the firm, not the regulator. ExpatReady represents the firms; it must not become the regulator, or a regulator product. It ships safe … | AG-11 v1.11 §0, L24 | None stated | Same in Agent Overview v1.11 L122 and AG-10 L160. |
| AG-11 §0 four floors | Four product floors stay fixed because they protect ExpatReady's own product, not regulation: a human approves AI-written text before it reaches a client; nothing is … | AG-11 v1.11 §0, L24 | None stated | Licensed approval is not a floor; it is a firm setting (AG11-D11(a)). |
| AG-11 §0 four floors (cont.) | AI processing waits until the provider terms are recorded, because ExpatReady is the data processor (AG11-D13). Everything else is a default the firm may change, … | AG-11 v1.11 §0, L24 | None stated | — |
| AG-11 BR-34 | It never reports to a regulator, never declares a firm non-compliant and never blocks the firm's own licensed judgement. Only the four product floors are … | AG-11 v1.11 §5, L763 | None stated | — |
| AG-11 BR-34 (copy) | Product copy speaks of protecting the practice; it never cites a regulator's code section as a rule and never says "violation", "breach of regulation" or … | AG-11 v1.11 §5, L763 | None stated | — |
| Agent Overview floors | The few fixed product floors protect ExpatReady's own product, not regulation: a human approves AI-written text before it reaches a client; nothing is fabricated; nothing … | Agent Overview v1.11 principles, L122 | None stated | — |
| Agent Overview people approve | A person approves what matters: AI-written client text, government forms and values nobody has checked; firm-approved templates send on their own; the firm sets who … | Agent Overview v1.11 principles, L124 | None stated | — |

## 2. Autonomy levels (AUTO / APPROVE / OFF) and the floor

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| AG11-D1 | Autonomy level on every automated action. Each action an automation (or any Doer) takes is AUTO (runs), APPROVE (a person approves it first — inline … | AG-11 v1.11 §0 AG11-D1, L30 | R1-AG11 (L1298) | SCOPE-TRIAGE L145: "on/off per recipe is enough" (proposal). |
| AG11-D1 template | A template message — sent from a firm-scope PUBLISHED template version (AG-12) with only its merge fields filled (review fixes — AG11-D12) — = AUTO: … | AG-11 v1.11 §0 AG11-D1, L30 | R1-AG11 (L1296) | AG-12 has not applied the PUBLISHED definition (AG-11 §0.2 L62, Pending). AG-16 v1.12 change log L13 (v1.5) recorded "default APPROVE"; superseded. |
| AG11-D1 floor | Hard floor — never below APPROVE: AI-written text to a client; a template whose body was edited by AI; any government form; any value written … | AG-11 v1.11 §0 AG11-D1, L30 | R1-AG11 (L1298) | — |
| AG11-D1 advice | "Anything that reads as advice" is not a floor (it cannot be detected) | AG-11 v1.11 §0 AG11-D1, L30 | — | Inferred: advice in a template message sends with no human check unless supervision applies. |
| AG11-D1 no submission | Lowering an AI-text floor is impossible. ExpatReady never submits anything to a government authority on its own. | AG-11 v1.11 §0 AG11-D1, L30 | — | — |
| AG-11 §3.3 labels | On screen the three levels read Send automatically / Ask me first / Off; the enum names stay internal | AG-11 v1.11 §3.3, L308 | None stated | — |
| AG-11 §3.3 AI text row | AI-written text sent to a client (Drafter output, edited or sent unedited) … APPROVE — by default the approver must be a licensed user; the Owner … | AG-11 v1.11 §3.3 table, L314 | None stated | — |
| AG-11 §3.3 floor enforced | The floor cannot be lowered by anyone — the builder and the settings screen refuse it, and the engine re-checks it at run time. | AG-11 v1.11 §3.3, L319 | None stated | — |
| AG-11 §3.3 no submit action | there is no Doer action that submits, at any autonomy level. | AG-11 v1.11 §3.3, L319 | None stated | — |
| AG-11 §3.3 own message | A user writing and sending their own client message by hand is a normal manual send (AG-10) — no autonomy level, no Needs you — … | AG-11 v1.11 §3.3, L321 | None stated | — |
| AG-11-51 | Every action an automation or any Doer takes SHALL carry an autonomy level: AUTO (the Doer runs), APPROVE (the Doer prepares a draft that a … | AG-11 v1.11 §4, L632 | R1-AG11 | — |
| AG-11-52 | Defaults SHALL be: internal actions (create task, reminder, internal notification, assign, file or match a message or document to a record) = AUTO; template messages … | AG-11 v1.11 §4, L633 | R1-AG11 | — |
| AG-11-53 | The system SHALL NOT allow an autonomy level below APPROVE for: AI-written text sent to a client; a template whose body was edited by AI; … | AG-11 v1.11 §4, L634 | R1-AG11 | — |
| AG-11-53 (cont.) | The builder and settings SHALL refuse a lower level, and the engine SHALL re-check at run time and treat a floored action as APPROVE, recording … | AG-11 v1.11 §4, L634 | R1-AG11 | — |
| AG-11-54 | No Doer action SHALL submit anything to a government authority, at any autonomy level. | AG-11 v1.11 §4, L635 | R1-AG11 | AG-7-59 L687 same rule for forms. |
| AG-11 BR-20 | AI-written text to a client, a template whose body was edited by AI, any government form and any value written into the verified profile … can … | AG-11 v1.11 §5, L749 | None stated | — |
| AG-11 BR-26 | ExpatReady never submits anything to a government authority on its own; no Doer action submits. | AG-11 v1.11 §5, L755 | None stated | — |
| AG-11-79 | A template whose body was edited by AI SHALL NOT count as a template message (floor, AG-11-53). A template merge field SHALL be sourced from … | AG-11 v1.11 §4, L676 | R1-AG11 | — |
| AG-11-97 | A merge field marked immigration-significant (dates, status, numbers, program) SHALL render only from a verified value; otherwise the send SHALL drop to APPROVE with the … | AG-11 v1.11 §4, L709 | None stated | Which fields: pack content, Immigration-SME (same line). |
| AG-11-97 (cont.) | A missing merge variable SHALL drop the send to APPROVE; a placeholder SHALL never be sent. | AG-11 v1.11 §4, L709 | None stated | RNA spec §12 L312 instead renders a blank or "[not specified]". |
| AG-10 §3.4 AI text waits | A message whose text was written by the Drafter or whose template body was edited by AI is APPROVE: the Doer prepares it … and it … | AG-10 v1.9 §3.4, L345 | None stated | — |
| AG-10-44 | AI-written text sent to a client, whether drafted by hand-invoked or recipe-called Drafter, and any template message whose body was edited by AI, SHALL always … | AG-10 v1.9 §4, L430 | None stated | — |
| AG-10-44 (cont.) | this level SHALL NOT be lowered by the firm, by a recipe, or by any setting. A Drafter draft sent unedited counts as AI-written. | AG-10 v1.9 §4, L430 | — | — |
| AG-10-44 (advice) | "Anything that reads as advice" is not a mechanical floor (it cannot be detected); it is covered by firm-approved templates, this AI floor, and message … | AG-10 v1.9 §4, L430 | — | Review W1 B-3 lists this. Confirm with counsel / RCIC. |
| AG-10-45 | A pending draft SHALL never auto-send on timeout. | AG-10 v1.9 §4, L431 | None stated | — |
| AG-10 BR-20 | AI-written text to a client (a Drafter draft sent unedited counts), and a template whose body was edited by AI, is always APPROVE. | AG-10 v1.9 §5, L474 | None stated | — |
| AG-7-59 | A government form SHALL carry the autonomy level APPROVE as a hard floor: no firm setting SHALL lower it to AUTO. | AG-07 v2.7 §4, L687 | None stated | SCOPE-TRIAGE L93 proposes moving the Filler to Release 2. |
| AG-7-59 (cont.) | ExpatReady SHALL NOT submit a form to an authority on its own — only the RCIC records a submission (AG-7-31). | AG-07 v2.7 §4, L687 | None stated | — |
| AG-16 §3.9 locked rows | The product floors are shown on the same screen as locked rows with a lock and a plain-English reason, and cannot be changed by any … | AG-16 v1.12 §3.9, L339 | None stated | — |
| AG-16-36 | Who approves AI-written text is a firm setting (AG-16-46), not a floor. A step under a floor SHALL stay Ask me first whatever the recipe … | AG-16 v1.12 §4, L470 | None stated | — |
| AG-16 BR-17 | Nothing in AG-16 can lower below APPROVE any AI-written text sent to a client, a template whose body was edited by AI, any government form, … | AG-16 v1.12 §5, L516 | None stated | — |
| Agent Phasing glossary | AI-written client text, a template whose body was edited by AI, any government form and any value written into the verified profile without a human … | Agent Phasing v1.4 Glossary "Autonomy level", L57 | None stated | — |

## 3. Needs you, Done for you and how an approval works

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| AG11-D2 inline | Approve inline; Needs you holds only what is waiting. When the person who would approve is the person acting at that moment … the approval happens … | AG-11 v1.11 §0 AG11-D2, L31 | R1-AG11 (L1296, L1299) | SCOPE-TRIAGE L144 proposes moving Needs you and Done for you to Release 2. |
| AG11-D2 holds | Needs you — one queue per user — holds only (a) work a Doer prepared with no human present (automations, inbound messages, Reader results on … | AG-11 v1.11 §0 AG11-D2, L31 | R1-AG11 | — |
| AG11-D2 never on timeout | pending items never auto-execute on timeout (age is shown, overdue items are reminded through the Minder); every decision, inline or queued, is audited | AG-11 v1.11 §0 AG11-D2, L31 | R1-AG11 | — |
| AG11-D7 | The default landing screen for firm staff is the Needs you queue, followed by a Done for you feed of what the Doers did (last … | AG-11 v1.11 §0 AG11-D7, L36 | R1-AG11 (L1299) | AG-14 home-screen order is Pending (AG-11 §0.2 L57). |
| AG11-D17 timings | an approval waiting in Needs you becomes overdue after 2 working days; anything linked to a government deadline must be approved no later than 2 … | AG-11 v1.11 §0 AG11-D17, L46 | Text: firm can change "in Release 1" | — |
| AG-11 §3.13 whose queue | an item awaiting a professional approval (a government-form draft, AI-written client text, a supervised client message), which is shown at once in the Needs you … | AG-11 v1.11 §3.13, L502 | R1-AG11 | — |
| AG-11 §3.13 preferred | active licensed holders marked "preferred" (a mark and a sort order, not a restriction) | AG-11 v1.11 §3.13, L502 | — | SA-06 change note L23 says items go "to licensed staff first"; superseded by L40 of the same note. |
| AG-11 §3.13 licensed decision-maker | The practitioner stays the licensed decision-maker — the Doers save the typing, not the judgement. | AG-11 v1.11 §3.13, L538 | None stated | Inferred: the product does not verify the licence (AG1-D19), so this describes intent, not an enforced rule. |
| AG-11-55 | An action at APPROVE that is not approved inline (AG-11-78) SHALL create an approval item in the Needs you queue of the record's file owner … | AG-11 v1.11 §4, L638 | R1-AG11 | — |
| AG-11-55 (escalation) | Overdue items, and every unassigned item, SHALL escalate to users who hold agent/case:assign and to the Owner | AG-11 v1.11 §4, L638 | R1-AG11 | — |
| AG-11-56 | Each approval item SHALL show what will happen (the dry-run rendering of §3.7), why (recipe, trigger, run, record), the provenance of every value and the … | AG-11 v1.11 §4, L639 | R1-AG11 | — |
| AG-11-57 | The approver SHALL be able to approve, edit then approve, or reject (reason optional). Approve and edit-then-approve SHALL execute the action once, under the action's … | AG-11 v1.11 §4, L640 | R1-AG11 | — |
| AG-11-58 | Approving SHALL require the same permission the owning module requires for the same action done by hand. A Filler form draft SHALL be approved once | AG-11 v1.11 §4, L641 | R1-AG11 | — |
| AG-11-58 (AI text) | AI-written client text SHALL, by default, be approved only by a licensed user (AG-11-88). | AG-11 v1.11 §4, L641 | R1-AG11 | "By default": the Owner may widen it (AG-11-88). |
| AG-11-59 | A pending item SHALL never execute because time passed. Its age SHALL be shown, and once it is older than its due time the Minder … | AG-11 v1.11 §4, L642 | R1-AG11 | — |
| AG-11-60 | Needs you SHALL hold only (a) work a Doer prepared with no human present … and (b) work waiting on a different person (AG-11-81, AG-11-82, AG-11-88, … | AG-11 v1.11 §4, L643 | R1-AG11 | — |
| AG-11-61 | When the record changes while an item is pending, the item SHALL be re-rendered on open and flagged stale, showing what changed. | AG-11 v1.11 §4, L644 | R1-AG11 | — |
| AG-11-61 (cont.) | An approve request SHALL carry the rendering version the approver saw, and the server SHALL refuse it if the record or the rendering changed since. | AG-11 v1.11 §4, L644 | R1-AG11 | — |
| AG-11-64 | The default landing screen for firm staff SHALL be the Needs you queue followed by the Done for you feed; AG-14 dashboards sit below or … | AG-11 v1.11 §4, L649 | R1-AG11 | — |
| AG-11-65 | Done for you SHALL list what the Doers did at AUTO in the last 24 hours, each entry linked to the record and the run … | AG-11 v1.11 §4, L650 | R1-AG11 | — |
| AG-11-78 | When the person who would approve an action is the person acting at that moment … the system SHALL let them approve, edit then approve, or … | AG-11 v1.11 §4, L675 | R1-AG11 | — |
| AG-11-78 (cont.) | with the same rendering, provenance, permission check and audit as a Needs you item, and SHALL NOT create an approval item. | AG-11 v1.11 §4, L675 | R1-AG11 | — |
| AG-11-96 | A document acknowledgement SHALL send at AUTO only for a client upload made against a request. | AG-11 v1.11 §4, L708 | None stated | — |
| AG-11-99 | The waiting times in this module SHALL be per-firm values with defaults, and a firm SHALL be able to change them in its settings in … | AG-11 v1.11 §4, L715 | Text: Release 1 | SCOPE-TRIAGE L152 proposes moving "Editable approval waiting times" to Release 2. |
| AG-11-99 (cont.) | Nothing here makes an item run on a timer (AG-11-59). | AG-11 v1.11 §4, L715 | — | — |
| AG-11-100 | Where less than that remains, or the deadline has passed, the item SHALL be due immediately and SHALL be marked urgent in Needs you and … | AG-11 v1.11 §4, L716 | None stated | — |
| AG-11-101 | When a client is paused … every draft or item already waiting in Needs you for that client SHALL stay in Needs you, SHALL be marked … | AG-11 v1.11 §4, L717 | None stated | — |
| AG-11-102 | When an unlicensed file owner switches on a single imported client (AG-18-86), the switch-on SHALL NOT take effect at once: it SHALL create a Needs … | AG-11 v1.11 §4, L718 | None stated | SCOPE-TRIAGE L237 proposes moving "licensed approval" of switch-on to Release 2. |
| AG-11 BR-21 | A pending approval item runs only when a person approves it. Age and due time remind its owner through the Minder; time never executes it. | AG-11 v1.11 §5, L750 | None stated | — |
| AG-11 BR-22 | Approving — inline or in Needs you — needs exactly the permission the owning module requires for the same action done manually | AG-11 v1.11 §5, L751 | None stated | — |
| AG-11 BR-28 | A pending item whose record changed is re-rendered and flagged stale before it can be approved; one whose reason has gone is cancelled, never executed. | AG-11 v1.11 §5, L757 | None stated | — |
| AG-11 BR-29 | When the approver is the person acting, approval is inline and no Needs you item exists. Needs you holds only work prepared with no human … | AG-11 v1.11 §5, L758 | None stated | — |
| AG-11 BR-38 | An approval linked to a government deadline is due no later than 2 working days before it; if less remains, it is due immediately and … | AG-11 v1.11 §5, L767 | None stated | — |
| AG-11 BR-39 | Drafts and items already waiting for a paused client stay in Needs you marked "client paused" and cannot be sent until the client is started … | AG-11 v1.11 §5, L768 | None stated | — |
| AG-11 §10 approving | Requires the same key the owning module requires for the same action done by hand | AG-11 v1.11 §10, L1152 | None stated | — |
| AG-11 §10 enforcement | Four-eyes, supervised-message, licensed-approver and sqr:verify checks are enforced server-side at decision time, not by hiding buttons. | AG-11 v1.11 §10, L1158 | None stated | — |
| AG-10-46 | Approving a pending message SHALL require the same permission as sending it by hand (AG11-D2) | AG-10 v1.9 §4, L432 | None stated | — |
| AG-10-46 (consent) | an approved message that the gate blocks SHALL be skipped and logged with the reason, not forced. | AG-10 v1.9 §4, L432 | None stated | — |
| AG-16-37 | an item already waiting in Needs you SHALL NOT be sent or executed because of the change (it never auto-executes on timeout or on a … | AG-16 v1.12 §4, L471 | None stated | AG-16 §13 Q9 L853: what happens to waiting items afterwards is not decided. |
| Agent Phasing glossary Needs you | It holds only work a Doer prepared with no human present, and work waiting on a different person … Nothing in it executes on timeout. | Agent Phasing v1.4 Glossary "Needs you", L58 | None stated | — |

## 4. Standard messages reviewed once (AG11-D12)

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| AG11-D12 | Standard messages reviewed once at setup. A template message is one sent from a firm-scope PUBLISHED template version (AG-12 states DRAFT / PUBLISHED); the publisher … | AG-11 v1.11 §0 AG11-D12, L41 | R1-AG11 (L1295) | SCOPE-TRIAGE L148 proposes dropping this screen. AG-12 knock-on Pending (L62). |
| AG11-D12 (cont.) | the seeds' client messages do not send until the firm confirms one "Review your standard messages" screen | AG-11 v1.11 §0 AG11-D12, L41 | R1-AG11 | — |
| AG-11-91 | The seeds' client messages SHALL NOT send until the firm confirms one "Review your standard messages" screen (entry point in AG-16), which SHALL list every … | AG-11 v1.11 §4, L697 | R1-AG11 | — |
| AG-11-92 | Publishing a new version of a template that an automatic (AUTO) recipe action uses SHALL show, before confirm, how many sends it will affect, and … | AG-11 v1.11 §4, L698 | R1-AG11 | — |
| AG-11 BR-36 | Seeded client messages wait as APPROVE until the firm confirms "Review your standard messages" once; publishing a new version used by an automatic recipe shows … | AG-11 v1.11 §5, L765 | None stated | — |
| AG-16-48 | The system SHALL provide a first-run "Review your standard messages" screen (§3.12) listing the seeded recipes' client messages with a preview and one "Looks good … | AG-16 v1.12 §4, L484 | None stated | — |

## 5. Verifying a Reader value (approve = verify)

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| AG11-D10 | Reader approve = verify. Approving a Reader-proposed value in its review view — which shows the document region beside the value — is the verification: … | AG-11 v1.11 §0 AG11-D10, L39 | R1-AG11 (L1296) | Replaces AG-08 v1.4 "verification is a separate act" (same line). |
| AG-11-85 | Approving a Reader-proposed value in its review view — which SHALL show the document region beside the value — SHALL make the value verified, with … | AG-11 v1.11 §4, L686 | R1-AG11 | — |
| AG-11-85 (cont.) | The approver SHALL hold agent/sqr:verify (§10); without it the approval SHALL be refused and the value stays proposed. | AG-11 v1.11 §4, L686 | R1-AG11 | — |
| AG-11 BR-33 | Approving a Reader value in its review view, with the document region beside it, verifies it; the approver is the verifier and holds agent/sqr:verify. | AG-11 v1.11 §5, L762 | None stated | — |
| AG-8-44 | Approving a Reader-proposed value in its review view IS the verification: the fact SHALL become verified, linked to the document and region shown, with the … | AG-08 v1.7 §4, L418 | Text: L730 Release 1 | — |
| AG-8-44 (cont.) | Only a human marks a fact verified; the Reader never does. | AG-08 v1.7 §4, L418 | — | — |
| AG-9-45 (verify) | That approval IS the verification (AG11-D10): the written value SHALL be verified, with the approver as the verifier and this document and region as the … | AG-09 v1.8 §4, L542 | None stated | — |
| AG-18-34 | Approving a value SHALL verify it, as for any upload (AG11-D10), and SHALL need agent/sqr:verify; it is the only way an extracted value reaches the … | AG-18 v1.2 §4, L380 | None stated | — |
| Agent Overview | In its review view, with the document region beside the value, approving a Reader-proposed value is the verification — one act, not two. It needs … | Agent Overview v1.11 principles, L128 | None stated | — |

## 6. Team safeguards (AG11-D9)

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| AG11-D9 | Team safeguards — one switch. It turns on four parts | AG-11 v1.11 §0 AG11-D9, L38 | R1-AG11 (L1293) | SCOPE-TRIAGE L146 proposes Release 2. |
| AG11-D9 parts 2–4 | (2) Minder escalation on (AG17-D81 behaviour); (3) at-risk marks on (AG17-D70 behaviour); (4) Needs you routing to supervisors — items of unlicensed staff are visible … | AG-11 v1.11 §0 AG11-D9, L38 | R1-AG11 | AG-17 still says escalation and at-risk marks are "off by default" (AG-11 §0.2 L60, Pending). |
| AG11-D9 trigger | On automatically when the firm has 5 or more active staff users (not deactivated or deleted; suspended users count — AG1-D3 seat logic minus pending … | AG-11 v1.11 §0 AG11-D9, L38 | R1-AG11 | — |
| AG11-D9 switch-off | The Owner may switch it off with a recorded reason (audited); it is never switched back on silently | AG-11 v1.11 §0 AG11-D9, L38 | R1-AG11 | — |
| AG-11-80 | The firm SHALL have one Team safeguards switch, held in AG-16's FirmTeamSafeguards. It SHALL turn on automatically when the firm has 5 or more active … | AG-11 v1.11 §4, L679 | R1-AG11 | — |
| AG-11-81 | Four-eyes on government forms. While this part is on and the firm has 2 or more active, non-suspended users who hold agent/case:form-approve … the user who … | AG-11 v1.11 §4, L680 | R1-AG11 | SCOPE-TRIAGE L95 proposes moving four-eyes to Release 2 ("only matters once auto-fill exists"). |
| AG-11-81 (cont.) | While the firm has exactly one form approver, that person MAY approve a draft they prepared; the approval SHALL be recorded, and shown in the … | AG-11 v1.11 §4, L680 | R1-AG11 | — |
| AG-11-81 (Filler) | The Filler SHALL count as no person, so a draft the Filler prepared on its own MAY be approved by any form approver. | AG-11 v1.11 §4, L680 | R1-AG11 | See A-identity-and-on-behalf.md. |
| AG-11-83 | Team safeguards SHALL turn on four parts: four-eyes on government forms (AG-11-81), Minder escalation (AG-11-19, AG17-D81), at-risk marks (AG-11-19, AG17-D70) and Needs you routing to … | AG-11 v1.11 §4, L682 | R1-AG11 | — |
| AG-11-83 (backup) | The Owner MAY nominate one backup approver (AG-16); the backup SHALL receive Needs you items whose approver is suspended or deactivated, and items overdue past … | AG-11 v1.11 §4, L682 | R1-AG11 | — |
| AG-11-84 | Only the Owner SHALL be able to switch Team safeguards off, and SHALL record a reason; the change SHALL be audited. The system SHALL NOT … | AG-11 v1.11 §4, L683 | R1-AG11 | — |
| AG-11-86 | The main settings screen (AG-16) SHALL show AI Doers on/off, Team safeguards on/off with its count rule, and Supervised client messages (AG-11-82) — the last … | AG-11 v1.11 §4, L689 | R1-AG11 | — |
| AG-11 BR-30 | Team safeguards is on automatically at 5 or more active staff (suspended users count; pending invitations do not) … A fall below 5 never switches it … | AG-11 v1.11 §5, L759 | None stated | — |
| AG-11 BR-31 | With Team safeguards on and 2 or more active, non-suspended users holding agent/case:form-approve, the user who prepared a form draft cannot approve it | AG-11 v1.11 §5, L760 | None stated | — |
| AG-11 §10 Owner only | Only the firm's Owner may switch Team safeguards off, with a recorded reason, audited (AG-11-84, AG11-D9). Not delegable to Admin. | AG-11 v1.11 §10, L1154 | None stated | — |
| AG-16-41 | Team safeguards SHALL turn on automatically when the firm has 5 or more active staff users … Falling below 5 SHALL NEVER switch it off. | AG-16 v1.12 §4, L477 | None stated | — |
| AG-16-42 | Only the Owner SHALL be able to switch Team safeguards off, and SHALL be required to enter a reason | AG-16 v1.12 §4, L478 | None stated | — |
| AG-16-43 | The four parts SHALL be adjustable individually under Advanced, by the Owner only, with a reason recorded | AG-16 v1.12 §4, L479 | None stated | — |
| AG-16-45 | Routing to supervisors SHALL make unlicensed staff's Needs-you items visible to licensed users when Team safeguards is on. | AG-16 v1.12 §4, L481 | None stated | — |
| AG-16-49 | The Owner MAY nominate one backup approver (recorded, audited). The backup SHALL receive Needs you items whose approver is suspended or deactivated, and items overdue … | AG-16 v1.12 §4, L485 | None stated | — |
| AG-16 BR-20 | With Team safeguards off, a person who prepares work and is the approver approves it once, inline where they are working (AG11-D2); no Needs-you item … | AG-16 v1.12 §5, L519 | None stated | — |
| Agent Overview | Easy for solo, safe for teams (AG11-D9, D11). Our job is to make life easier for tenants, especially solo and small ones; large firms need … | Agent Overview v1.11 principles, L127 | None stated | — |

## 7. Licence-aware approval: who may approve AI-written text and supervised messages

| Req ID | Exact words | Source | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| AG1-D19 | No licence monitoring. A licensed user is an active user whom the firm has linked to a regulator credential it entered. | AG-01 v1.16 §0 AG1-D19, L66 | None stated | RNA spec §18.3 L377 proposes "RCIC licence/CPD/E&O tracking" (a different direction). |
| AG1-D19 (cont.) | It never checks, tracks, reminds about, warns about or acts on licence validity or expiry, and never verifies a licence against any register. | AG-01 v1.16 §0 AG1-D19, L66 | None stated | Review W1 B-3: licensed sign-off is recorded, not verified. Confirm with counsel / RCIC. |
| AG-1-58 | A licensed user SHALL mean an active user whom the firm has linked to a regulator credential it entered (§3.5). | AG-01 v1.16 §4, L464 | None stated | — |
| AG11-D11 (a) | A licensed user is an active user whom the firm has linked to a regulator credential it entered … (a) AI-written text to a client: a … | AG-11 v1.11 §0 AG11-D11, L40 | R1-AG11 (L1294) | SCOPE-TRIAGE L147 proposes moving licence-aware approval to Release 2. |
| AG11-D11 (a) widen | a firm setting, on by default; the Owner may allow other roles to approve, its change recorded, with a one-line note on screen | AG-11 v1.11 §0 AG11-D11, L40 | R1-AG11 | SA-06 v3.1 L283 words it as a setting "that the firm may switch off". |
| AG11-D11 (b) | agent/case:form-approve is seeded on the Owner and Case Manager starter roles … the firm may grant it to any role — a grant to an unlicensed … | AG-11 v1.11 §0 AG11-D11, L40 | R1-AG11 | — |
| AG11-D11 (c) | Supervision of client messages written or edited by unlicensed staff … is a standalone firm setting … on by default as soon as the firm has an … | AG-11 v1.11 §0 AG11-D11, L40 | R1-AG11 | SCOPE-TRIAGE L132 proposes moving supervision to Release 2 [F]. FDL FD-22 L78 places "supervision rules for unlicensed staff" in the Practice Pack. |
| AG11-D11 (d) | if no active user holds the relevant approval permission, the Owner approves, recorded "approved by Owner — no active holder of the approval permission" | AG-11 v1.11 §0 AG11-D11, L40 | R1-AG11 | — |
| AG11-D11 (d) licensed | for an item that requires a licensed approver (AI-written client text under the default setting, a supervised client message) with no active licensed user, the … | AG-11 v1.11 §0 AG11-D11, L40 | R1-AG11 | Review W1 B-3: the Owner may be unlicensed. Confirm with counsel / RCIC. |
| AG11-D11 (e) | Verifying Reader values needs agent/sqr:verify — the single rule | AG-11 v1.11 §0 AG11-D11, L40 | R1-AG11 | — |
| AG11-D8 | Approving a Filler form draft in Needs you is AG-07's consultant approval — one act, not two. Only a user who holds AG-07's form-approval permission … | AG-11 v1.11 §0 AG11-D8, L37 | R1-AG11 | — |
| AG11-D8 exception | when no licensed user is active, the Owner may approve a form draft without form-approve, recorded as "approved by Owner without a licensed user" (AG11-D11(d), … | AG-11 v1.11 §0 AG11-D8, L37 | R1-AG11 | Inconsistent with AG11-D11(d) v1.10 and AG-11-90, where the Owner route for forms applies when no active user holds form-approve, recorded differently. |
| AG-11 §3.13 licensed user | ExpatReady never checks, tracks or acts on licence validity or expiry, and never verifies a licence against any register (AG1-D19). Everyone else is unlicensed. | AG-11 v1.11 §3.13, L522 | None stated | — |
| AG-11-82 | Supervision SHALL be a standalone firm setting — not a Team safeguards part and not tied to the 5-staff rule. It SHALL be on by … | AG-11 v1.11 §4, L681 | R1-AG11 | — |
| AG-11-82 (cont.) | While it is on, a client message that an unlicensed staff member writes or edits SHALL NOT be sent until a licensed user approves it; … | AG-11 v1.11 §4, L681 | R1-AG11 | AG-16-47 L483 and AG-16 §3.11 L375 still route to "the file's lead RCIC or of any licensed user if there is none" (older rule). |
| AG-11-88 | AI-written text to a client SHALL always be approved by a person before it is sent; by default that person SHALL be a licensed user. … | AG-11 v1.11 §4, L692 | R1-AG11 | Review W1 B-3. Confirm with counsel / RCIC. |
| AG-11-88 (cont.) | a firm setting whose change SHALL be recorded and audited, with a one-line note shown on the approval screen. Drafter output sent unedited SHALL count … | AG-11 v1.11 §4, L692 | R1-AG11 | — |
| AG-11-89 | active licensed holders SHALL be marked "preferred" — a mark and a sort order only, not a restriction on who may decide; the item is … | AG-11 v1.11 §4, L693 | R1-AG11 | — |
| AG-11-90 | When no active user holds the relevant approval permission (for a government form draft, agent/case:form-approve), the item SHALL go to the Owner, who MAY approve … | AG-11 v1.11 §4, L694 | R1-AG11 | — |
| AG-11-90 (cont.) | When an item requires a licensed approver … and the firm has no active licensed user, it SHALL likewise go to the Owner, who MAY approve … | AG-11 v1.11 §4, L694 | R1-AG11 | — |
| AG-11 BR-32 | While on, a client message an unlicensed staff member writes or edits is sent only after a licensed user approves it; with no licensed user … | AG-11 v1.11 §5, L761 | None stated | — |
| AG-11 BR-35 | AI-written client text, including Drafter output sent unedited, is approved by a licensed user (AG-01 §3.5) unless the Owner has allowed other roles; the change … | AG-11 v1.11 §5, L764 | None stated | — |
| AG-11 §10 Owner settings | Owner only; a reason is recorded for switching supervision off; every change is audited (AG-11-82, AG-11-88) | AG-11 v1.11 §10, L1155 | None stated | — |
| AG-10-44 (approver) | By default the approver SHALL be a licensed user (AG11-D11(a); AG-01 §3.5); the Owner MAY allow other roles to approve | AG-10 v1.9 §4, L430 | None stated | — |
| AG-10-44 (Owner) | If no licensed user is active, the Owner MAY approve, and the approval SHALL be recorded as "approved by Owner without a licensed user"; nothing … | AG-10 v1.9 §4, L430 | None stated | Review W1 B-3 quotes this line. |
| AG-10-49 | Message supervision is a standalone firm setting, not part of Team safeguards. It SHALL be on by default as soon as the firm has an … | AG-10 v1.9 §4, L435 | None stated | — |
| AG-10-49 (cont.) | While it is on, any client message that an unlicensed user writes or edits SHALL NOT send until a licensed user approves it. | AG-10 v1.9 §4, L435 | None stated | — |
| AG-16 §3.9 approver | A human always approves AI-written text before it reaches a client — a product floor. By default the approver must be a licensed user | AG-16 v1.12 §3.9, L337 | None stated | — |
| AG-16 §3.9 no route around | Drafter output sent unedited counts as AI-written, so there is no inline route around it for an unlicensed person. | AG-16 v1.12 §3.9, L337 | None stated | — |
| AG-16-46 | Under Advanced, the Owner SHALL be able to set who may approve AI-written client text: licensed users only (default), or licensed users plus roles the … | AG-16 v1.12 §4, L482 | None stated | — |
| AG-16-47 | A client message an unlicensed user writes or edits SHALL wait for approval by a licensed user (licensed per AG-01 §3.5), in the Needs you … | AG-16 v1.12 §4, L483 | None stated | Conflicts with AG-11-82 and AG-10-49 (v1.9/v1.11): shown at once to every active licensed user. |
| AG-7-68 | Granting it to an unlicensed user SHALL show a plain note ("this person is not linked to a licence") and SHALL be recorded; it SHALL … | AG-07 v2.7 §4, L696 | None stated | — |
| SA6-D2 | Sign-off keys agent/case:waive-deficiency, agent/case:form-approve, agent/case:review-approve and agent/retainer:countersign are held by default by Owner and Case Manager; the firm may grant them to any role; every … | SA-06 v3.1 §0 SA6-D2, L22 | None stated | — |
| SA6-D9 | A licensed user is a person, not a role (AG1-D19 credential). The permission system never checks licence | SA-06 v3.1 §0 SA6-D9, L29 | None stated | Review W1 B-3. |
| SA6-D9 (AI text) | AG-11's rule that AI-written client text is approved by a licensed user (AG11-D11(a)) is a firm setting, on by default, that the firm may switch … | SA-06 v3.1 §0 SA6-D9, L29 | None stated | AG-11 says the Owner may widen it to other roles; SA-06 says "switch off". Same effect is not stated. |
| SA-06 §3.3 preferred | Active licensed holders are marked "preferred" — a label only: an unlicensed holder sees the item and can approve it like any other holder. | SA-06 v3.1 §3.3, L282 | None stated | — |
| SA-06 BR-20 | Holding or lacking a regulator credential never allows or refuses an action in the permission system; it only adds an informational note and marks active … | SA-06 v3.1 §5, L495 | None stated | — |
| SA-06 Owner-only checks | Owner-only role checks with no key … switching Team safeguards off, switching supervised client messages off, choosing who approves AI-written client text, first AI switch-on. | SA-06 v3.1 Appendix C, L1309 | None stated | — |
| SA-06 change note D9 | The system never blocks on licence; it shows a reminder when approval rights go to someone without a licence number, sends items awaiting approval to … | SA-06 change note 2026-10-07 table, L23 | None stated | Conflicts with the same note's closing decision L40 ("shown to all holders of that permission at once"). |
| SA-06 change note queue | an item awaiting approval (form, AI-written or supervised client message, override, sign-off, countersign) is shown to all holders of that permission at once; licensed staff … | SA-06 change note 2026-10-07 closing decisions, L40 | None stated | — |
| Agent Overview permissions | The professional approvals (override a critical warning, approve a government form, sign off a file, countersign a retainer) default to Owner and Case Manager; the … | Agent Overview v1.11 Permission model, L196 | None stated | — |
| Agent Phasing glossary Licensed user | Used for safe defaults — who approves AI-written client text, who supervises unlicensed staff's client messages — that the firm may change. | Agent Phasing v1.4 Glossary, L71 | None stated | — |
| FD-22 Practice Pack | Regulator + representative model (who may lawfully advise, licence classes, rep-of-record cardinality, supervision rules for unlicensed staff) | FDL v1.5 FD-22 table, L78 | Resolved 2 Aug 2026 batch (FDL L44-46) | Places supervision rules in pack content; AG-11 makes supervision a firm setting with a default. See A-founder-decisions.md. |

## Gaps noticed

- **Licensed sign-off is recorded, not enforced or verified (review W1 B-3).** The default approver for AI-written client text is a licensed user, but the Owner may allow other roles (AG-11-88, AG-16-46), the Owner may approve when no licensed user is active (AG-11-90), the permission system never checks licence (SA6-D9), and the product never verifies a licence (AG1-D19). Confirm with counsel / RCIC before any claim that a licensed person always signs off.
- **Template messages are not checked for advice.** "Anything that reads as advice" is not a floor (AG11-D1, AG-10-44). A firm-approved template sends at AUTO once the standard messages are confirmed.
- **Routing of supervised messages differs between files.** AG-11-82 and AG-10-49 show the item at once to every active licensed user; AG-16-47 (L483) and AG-16 §3.11 (L375) still route to "the file's lead RCIC" first. Recorded as W1 inventory X1.
- **Owner route for forms is worded two ways in AG-11.** AG11-D8 (L37) uses "no licensed user is active"; AG-11-90 and AG11-D11(d) use "no active user holds" form-approve, with a different audit wording.
- **SA-06 says the firm may switch off the licensed-approver default (L29, L283); AG-11 says the Owner may allow other roles (AG-11-88).** Whether switching it off means that anyone with send permission may approve is not stated.
- **FD-22 (ratified) puts supervision rules for unlicensed staff in the Practice Pack** (FDL L78); AG-11 makes supervision a firm setting. Not reconciled anywhere.
- **The SA-06 change note contradicts itself** on routing (L23 "licensed staff first" vs L40 "all holders at once").
- **No requirement names who approves on behalf of the firm when an AI Worker (not a person) prepared work** beyond "work a Doer prepared with no human present" (AG-11-60). Inferred: AI Worker output would enter Needs you as Doer work.
- **AG-16 §13 Q9 (L853) is open:** what happens to items waiting in Needs you when AI is switched off.

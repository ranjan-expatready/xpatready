# Static check — unbuilt designs vs latest decisions (Devin, main @ b2c0710)

Labels: **[verified]** read in docs/code · **[validate]** judgement · **[decision]** founder/Lead.

## Verdict: the design discipline is holding
Every current design doc carries an explicit "decisions followed / missing / conflicting" section, self-flags [M]/[C]/[F], and the Lead answers each question in a recorded "Lead response". `decision-impact.sh` passes clean on latest main (every P-decision has a capability or backlog row or is workflow-exempt).

## Per-document check

**F2 extension plan** (forms lane, F1-P → F2a–d) — consistent with P-66/P-62/P-90/P-89. Two expert-dependencies correctly open: exact portal hosts for the manifest (XT-7) and whether IMM 5257 visitor-visa is filed online. One honest conflict flagged by the plan itself: AG-10's "no extension" non-goal is partly reversed (retrofit list). **[verified]**

**Screen 03 combination workspace** (runtime, BUILD S1) — concept + challenge aligned; the challenge caught a real defect (Preview would use `render()` label-order while cases use `caseView()` placement-order — fixed by Lead decision 1). Coverage gate (BR-7) scoped to facts for roles the combination has, with three named fixes — good. **[verified]**

**Screen 04 shared library** (screens, after Screen 02) — confirms the API-only endpoints I flagged are **not orphans**: merges propose/approve → Screen 02 (K5); aliases shown read-only (BR-16); held-PDFs → To review (BR-11); option-maps inside field-map review (Screen 02). **[verified]** Action: confirm when Screen 02 lands that each actually has UI.

**Screen 02** (screens, CHECK slices 2–3) — carries "To review" (P-79) and held-PDF approval (P-80); its K1/B1 rules currently block the runtime lane's merge until a setup patch lands — the lanes are coordinating, not stuck. **[verified]**

## Carried items still open (not bugs — track)
- **[decision]** Per-combination reset (founder's ask): today's Reset is workspace-level. If the demo story needs "reset one combination", it needs a backlog row.
- **[decision]** Approver-can-submit deadlock (D-2): decision needed — forbid approver-submit, or add a withdraw path with guidance text.
- **[validate]** IMM 5257 filed online for visitor visa + exact portal hosts — on the Lead's expert list already.
- **[validate]** qa lane is WAITING on the Lead to read `qa/reports/2026-10-25-explore.md` — same bottleneck as yesterday; suggest the Lead drains it at next run.

## Paste to Lead (batch 2)
```
Devin static check, main @b2c0710: designs consistent with decisions (F2, 03, 04 verified). Still open from batch 1: D-1 (signoff no-body 500) and D-2 (approver-submit deadlock) — confirm they reach qa/BUGS.md. Decision for the founder: per-combination reset — backlog or "workspace reset is enough"? qa lane still WAITING on the explore report read.
```

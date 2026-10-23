# Screen 01 — Lead checks (from 23 Oct; earlier Lead checks are in `review.md`)

## Lead recheck of the AI drafting repair (23 Oct) — **Result: DEMO**
How checked: build-notes "Fixes (FIX after the Lead's AI drafting check)"; code (`prototype/contracts/fact-key.ts`, entry contract, v2 output schema, `studio/web/src/pages/sources.tsx`); the AI drafting suite run by the Lead; the shared :4400 restarted on the repaired code (data unchanged) and asked for its AI plan read-only; the founder's two live runs from today. No paid call by the Lead.

**Confirmed fixed**
* **A1** One naming rule in `fact-key.ts`, carried verbatim by the entry contract, the released-configuration map, the v2 output schema and prompt; the studio's key checks call it. Lead run of `check_ai_drafting.ts`: all nine A1 checks pass; replays of the old refused answers now keep all 233 form fields. **Lead confirms the builder's choice: digits allowed** (the library already allows them).
* **A2** Plain FAILED messages; BLOCKED only for a provider limit.
* **A3** :4400's plan for IMM 1344 offers "Use the saved AI answer (no model call, US$0)", and the dialog selects it by default when a saved answer exists.
* **A6** The intake's printed edition goes to the AI as a known fact.
* **Real-world proof:** the founder's two live IMM 1344 runs today (12:01 and 13:27, US$2.94) both passed the checks: 162–163 of 233 form fields mapped, 48–50 proposals (about 15 reuse, 31 new, 4 ambiguous).

**Why the founder paid twice:** :4400 had been started at 10:48, before the repair (11:27–11:44), so it never offered the saved answer. Restarted at 13:40 on the repaired code.

**New findings (none blocks the walkthrough)**
1. **Major — the restart script stops every copy of the app** (`studio/tools/restart-api.sh` stops all studio API processes), which now kills the lanes' test copies. Fix: restart only the process on its own port. Owner: screens lane, with the next fix pass.
2. **Minor — the AI drafting suite assumes exactly four saved IMM 1344 answers** and crashes when newer valid runs exist (today's two). Fix: select the four refused runs by name. Owner: forms lane (it now owns `prototype/p2/` and AI drafting).
3. **Minor — "boxes" still on screen** ("Its boxes are not mapped yet"). Covered by P-63 in the forms lane's F1 item 5.
4. **Observation — a sponsor form (IMM 1344) was attached to Express Entry › Profile** with no hint that it is unusual for that program (a test by the founder). Content meaning is the expert's; an advisory hint belongs in the Screen 02 concept, never a block.

**A4 decision (speed and progress)**
Accepted as the builder proposed: reuse first, split by section groups through the existing bounded queue, per-part progress, a deterministic merge that flags near-duplicate names for a person. Placement: the backend in the **forms lane** (F1), the progress screen in **Screen 02** (screens lane). Before switching, one measured split live run of IMM 1344 against the saved single-call answers (estimate US$1.6–1.9, worst US$5) needs the founder's go. Not a Screen 01 blocker.

**Next:** DEMO. The founder walks Screen 01 on :4400 as author and as reviewer: catalogue, a combination page, add a form through the intake, the saved AI answer, the review of AI proposals, the release guard. D17/D20 evidence is recorded here.

## RCIC walkthrough

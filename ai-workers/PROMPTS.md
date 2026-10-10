# Prompts for the founder: copy, paste, done

You don't need to know how to prompt. Every new session already loads `NEXT.md` and a freshness report automatically (hook in `.claude/settings.json`). These prompts just tell Claude what you want next.

## 1. Every new session: one line
```
Continue Workstream 2.
```
The hook loads the rules, the plan, the handoff and the freshness report; the session knows what is done, what is next and the quality gate. Say "stop" at any time; the Stop hook makes the session commit and leave a handoff before it ends.

## 2. Start a step (replace the step number; use in a NEW session)
```
Continue Workstream 2 (AI Workers). Start Step 1 (the AI organisation) exactly as defined in ai-workers/PROGRESS.md: one outcome, the quality gate listed there, maker then adversarial checker then you, built only on the existing product (cite requirement IDs; no new features, no duplication). Tell me in a few plain lines when the maker starts, when the checker finishes, and when it is ready for me. Say "cut here, open a new session" when the step is done.
```

## 3. When you change your mind
```
Decision for AI Workers: <what you decided>. Record it in decisions.md with my words, update every affected file, and tell me what changed and what it contradicts (timelines are not our concern, AIW-D21).
```

## 5. When you want to be grilled
```
Grill me on AI Workers: the 5 hardest questions an investor, a licensed consultant customer and the CICC regulator would ask, with our honest current answer to each.
```

---

## 6. Your ask, coached (Claude's sharper version, for you to approve or change)

**What I'd change in the original ask, and why:**

1. **"It will always produce the same result, no hallucination."** No AI model can honestly promise that, and an investor or regulator who knows AI will catch it. The claim we *can* defend: the product's own rules engines do the calculations (scoring, checklists, form filling), so those answers are exact. The AI only chooses among actions the product allows. Every step is checked and recorded, and a licensed person signs off. Say **"governed and auditable"**, not "never wrong".
2. **"Cover everything VisaFlo does."** Matching feature for feature is a trap: you chase their roadmap forever. Better: prove we cover their *jobs* (intake, form filling, CRM, scoring, retainers), then win on 2–3 things they can't copy quickly. Candidates are governed AI Workers, multi-country packs, and a full audit trail.
3. **"Consider the product ready."** That's fine for designing the concept. But investors ask "what is live today?" The plan must show the real build status next to the vision, or it will look like overselling.
4. **All AI in scope and launch in March 2027.** Both can't be fully true without risk. Ask for: *one or two AI Workers that ship in Release 1 as the wedge, the rest as the roadmap.* That's a stronger investor story than "everything later" or "everything now".
5. **Pricing before validation.** Pricing AI Workers before 5–10 licensed consultants have reacted to the concept is guessing. Add a short validation step between concept and pricing. Your peer network makes this cheap.
6. **Missing from the ask entirely:**
   - **who is liable** when an AI Worker makes a mistake;
   - **client data sent to AI providers** (Canadian privacy law, Quebec Law 25);
   - **what each AI action costs us**, which drives the margin;
   - **CICC professional-conduct rules** on delegating to AI;
   - **how much investment, for which milestone**. The commercial plan still has cash marked unknown.

**The coached ask:**
```
Design Expat Ready's AI Workers: governed AI users of our own product that do the manual work a firm does today, through the product's Doers, rules, country packs, permissions and audit trail, ending at a named licensed person's sign-off.
1. Ground it: read every current requirement document in full and the latest code; map every module and Doer; show build status honestly next to the vision.
2. Compete: show that we cover every job VisaFlo and the main alternatives do, and the 2–3 advantages they cannot quickly copy.
3. Concept: one visual map of the product with each component assigned to an AI Worker, plus a detailed catalogue (job, guardrails, sign-off, value, cost to run, release).
4. Choose a wedge: which 1–2 AI Workers ship in the March 2027 launch, and what that costs the date.
5. Validate: a short script to test the concept with 5–10 licensed consultants before pricing.
6. Commercialise: proposition and pricing, added to the existing business plan and money model; then a high-level investor story with the amount, the milestone it buys, and the risks (liability, privacy, CICC rules, AI cost).
7. Then detailed requirements developers can build from, in product/requirements/.
Label every assumption. Invent nothing. Tell me what I'm missing.
```

## 7. What the founder must change in the Program Charter (only he can)

The Charter lives on Drive in the Program Management folder (`1T3GRrvwDmPRbBChvGCrnmENgcYhwAfQr`): "Program Charter_V2.pptx" (slides, 6 Oct) and "Program Charter V1 - G1 expanded" (text). The team plans from it. Four edits:

1. **Scope line.** Slide 1 and the V1 text say: "NOT IN RELEASE 1 — AI-assisted features · Automation engine (AG-11) and its Doers". Change to: in scope as **Workstream 2** (AI Workers, AI Doers, all Doers, Conductor), delivered alongside Release 1, with the note that the product does not go live without it (your decision AIW-D14/D21). If you want a softer line for the team, say "specified by Workstream 2; build order agreed with the tech leads".
2. **Launch date.** V2 says 28 Feb 2027 (production 23 Feb); the V1 text says 12 Mar 2027. Pick one and fix the other.
3. **Module list.** Add AG-18 (data import and migration), which exists in the requirements but not in the Charter.
4. **CP-9.** The Charter says "Employer view (read-only)"; the portal document gives the employer upload, pay, sign and seat management. Say which.

How: open the slide or document on Drive, edit, and tell the team in your usual channel. We never edit Drive.

## 8. The Corporate/LMIA folder

AG-17 (corporate cases and LMIA) cites a Drive folder holding `DECISION-LOG.md` and `SA-01-SA-01B-CHANGE-NOTE.md` (decision D83 is referenced). Neither the co-founder's nor the founder's account can see it, so our snapshot has `05-corporate-lmia/NOT-FOUND.md`. Ask whoever wrote AG-17 v0.5 (the author is named in its header on Drive) to share that folder with the co-founder's account and the founder's account, view access is enough. Then the next session re-snapshots it.

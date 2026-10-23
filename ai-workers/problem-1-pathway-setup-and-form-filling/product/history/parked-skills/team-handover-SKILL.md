---
name: team-handover
description: Writes the handover pack the development team needs to retrofit one finished Pathway Configurator screen into ERv2 — behaviour, rules, data, contract, components, mapping to team files, tests, mock vs real, and what not to port. Use at stage HANDOVER.
---

# Team handover

Write `ai-workers/problem-1-pathway-setup-and-form-filling/product/screens/NN/handover.md` (under 100 lines) for a developer who has seen none of our chats; tables over prose.
1. What it does — job, persona, journey steps, SA-01B IDs, 3–6 screenshot links.
2. Business rules — where each is enforced (database, service, UI) and its test.
3. Data — models/fields added or changed, mapped to the team's Prisma models; migration notes.
4. Contract — endpoints, shapes, errors, permission keys.
5. UI — components, tokens, style-guide patterns; matching team screen; menu items to merge (`PRODUCT.md` §3).
6. Engine and AI — pure functions to lift; AI route, prompts, caps; what is stubbed.
7. Mock vs real; **do not port:** demo chrome, Sample data, local scripts.
8. Tests to carry over and what each proves. 9. Open items with recommendations.
Confirm the `QUALITY.md` gate from review.md before marking DONE.

# Devin drop 3 — deeper interaction rounds (main @ b2c0710, cloud :4400, demo loaded)

Labels: **[verified]** observed · **[validate]** judgement · **[decision]** founder/Lead.

## Verified working this round
- Review-tab duty guard: Submit renders disabled with `title="Needs the review duty"` — the product already explains *why* an action is unavailable at the control itself. This is the pattern to copy for tooltips elsewhere. **[verified]**
- Author submit path: `POST /combinations/:id/submit` as user-A → 201 (submission created, prior submissions withdrawn per earlier test). **[verified]**
- Field-add guards reply in plain language: `POST /library/fields` rejects both a duplicate-candidate and a malformed key with `400 + "A field key is area.name in lower case, for example person.previous_visa_refusal_country (areas: …)"`. Note: areas are a **fixed enum** (person, …) — the error lists them. **[verified]** **[validate]** the enum is good governance (no inventing areas), but a brand-new area can't be added through this route — flag whether that is intended.
- `/cases` empty state reads correctly: "No cases yet — Open a case for a released combination", with an actor switcher (Case officer, Firm staff, Client A, Client B). **[verified]**

## Demo-data gap (the founder's "walk the whole journey" ask)
- The demo load creates 6 combinations but **zero `runtime_case` rows and zero `ai_batch` rows** — so `/cases`, `/cases/:id/questionnaire`, and `/ai` pages cannot be exercised from demo data at all. **[verified]** **[decision]** For the founder demo story, seed: one released combination → one open case with a few answered questions, plus one completed AI batch record. Otherwise the runtime half of the product is invisible in a walkthrough.

## Still open from earlier drops
- D-1 signoff-no-body 500 (runtime lane, S2) · D-2 approver-submit deadlock (decision) · B35 per-combination reset (founder decision — this drop's demo-gap point strengthens it: a one-combination demo reset pairs naturally with a seeded case).

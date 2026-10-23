---
name: immigration-structure
description: How Canadian immigration (IRCC and ESDC applications) maps onto Pathway › Program › Category › Sub-category › Combination, with linked combinations and 20 validation cases. Use before adding or naming any program, category or sub-category, when designing configuration, sample data or rules, or when asked whether the structure covers a scenario.
---

# Immigration structure

Read `ai-workers/problem-1-pathway-setup-and-form-filling/product/domain/TAXONOMY.md`. Apply every time:
1. **Pathway** = who is the applicant on the government form (person → Individual; employer or organisation → Corporate and employers).
2. **Category** = one government application type (own forms, fee, decision); **Sub-category** only when questions, documents or forms really differ.
3. Family members, stages and inside/outside Canada are **not levels** (roles, links, per-person conditions) unless IRCC treats inside/outside as different applications; the immigration expert decides.
4. Cross-pathway dependence (a worker's permit relying on an employer's LMIA or offer) is a **"supported by" link**; multi-step journeys are **"follows" links**; never shared configuration.
5. Test any new or renamed node against the validation table; add a row for a new kind of case.
6. Real names, forms, fees and thresholds come from the immigration expert; label everything else Sample; check IRCC's current pages before calling a program current.

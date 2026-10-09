# AI Workers — assumptions register

*Ranjan (9 Oct 2026): where the product requirements have gaps, assume they will be filled. Every such assumption is listed here; nothing here is a fact until confirmed.*

| ID | Assumption | Why we need it | Effect if wrong | Who confirms |
|---|---|---|---|---|
| AIW-A1 | The product described in the Drive requirements is built and working (planning assumption only) | AI Workers operate the product | AI Worker plans slip with the product build | Ranjan / tech leads |
| AIW-A2 | The product will record which person an AI Worker worked for and which of their permissions it used (a "delegation record") | Every worker acts on behalf of a named person (AIW-D13) | Workers cannot be attributed; audit story fails | Ranjan (FD-16 reading) + team |
| AIW-A3 | An AI service with Canada-only processing and no training on client data will be recorded in the admin settings | AI Doers and workers stay switched off until then (AG-11-93) | No AI at all, or a privacy promise we cannot keep | Team + provider; counsel on the legal need |
| AIW-A4 | The Canada pack content (checklists, form maps, deadline catalogue, plain-words reasons) will be written by the immigration specialist | File Builder and Deadline Guardian run on pack data | Workers have nothing to work from | Ranjan / immigration specialist |
| AIW-A5 | Everything the 7–8 Oct module files say is built or will be (AIW-D21) | Planning base for Workstream 2 | Schedules are not our concern; the team sees the dependency list | Ranjan |
| AIW-A6 | Time saved per file is measured in the pilot, never assumed | Every value claim in the catalogue | Investor claims without numbers | Ranjan + pilot firms |
| AIW-A7 | A role twin holds a subset of one named person's permissions and takes no paid seat; it is charged by work done | Role twins and pricing | Seat rules (AG-1-13) and plan limits (SA-3-41) are silent on this | Ranjan (pricing), team |
| AIW-A8 | The expert co-pilot's search of case files is limited server-side to what the asking user may see | Expert co-pilot (AIW-D25) | Data leak between staff | Team |
| AIW-A9 | The tamper-evident audit chain stays in Release 1 (the 5 Oct triage proposes moving it) | "Every action is recorded" claims | Weaker trust claim | Ranjan |

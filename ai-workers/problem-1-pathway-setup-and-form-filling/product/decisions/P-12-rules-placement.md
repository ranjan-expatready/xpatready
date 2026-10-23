# Decision P-12 — where rules live

**Question:** where does a rule like "married → ask spouse's name; marriage certificate required" live?
**Status:** decided 21 Oct — founder chose **A. Split by nature**.

## Options
* **A. Split by nature** — rules about the person on the library field/section (written once); what an application demands as lines on each combination using shared conditions; checks whose value varies (passport validity, certificate recency) as one shared check with a value per combination.
* **B. Everything per combination** — each combination holds all its own rules.
* **C. Everything global** — one platform-wide rule set with exceptions.
* **D. Rules on programs, inherited** — rules set on a program flow down to its combinations, which can override.

## Scores (1 = poor, 5 = best)
| Criterion | A | B | C | D |
|---|---|---|---|---|
| Right for each application (IRCC differences) | 5 | 5 | 2 | 3 |
| Same client sees the same questions across cases | 5 | 2 | 5 | 3 |
| Effort when IRCC changes something | 4 | 1 | 4 | 3 |
| AI drafts it reliably (form logic vs checklist) | 5 | 3 | 2 | 2 |
| Easy for content team / RCIC to read and review | 4 | 4 | 2 | 2 |
| Build effort (5 = least) | 3 | 4 | 4 | 2 |
| Fits the team's spec (SA-01B) | 5 | 3 | 1 | 1 |
| **Total (of 35)** | **31** | **22** | **20** | **16** |

## Pros and cons
* **A** + correct per application, consistent across cases, one place to fix person rules, matches how IRCC material is written and the team's spec. − three kinds to explain; slightly more build (the shared check with a per-combination value).
* **B** + each combination readable on its own; simplest to build first. − "ask spouse's name if married" copied ~120 times; drifts; every IRCC change is many edits; same client gets different questions.
* **C** + one place for everything. − wrong wherever checklists differ; exceptions pile up; one change silently alters every combination.
* **D** + less repetition than B. − hidden inheritance and overrides; team spec forbids it (SA-1B-56 "nothing flows down").

## Consequence of choosing A
Screen 3 shows requirement lines as sentences and person rules read-only ("comes from the Family section"); Screen 4 shows person rules on each field/section; Screen 5 shows the rule map; release checks stop a combination weakening a person rule.

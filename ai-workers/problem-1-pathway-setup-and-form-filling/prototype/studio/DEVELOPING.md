# Studio — developer guide

How the reference app's code is laid out for builders. The rules and the bar are in `product/WAY-OF-WORKING.md`, `product/STANDARDS.md` and `product/RULES.md`; this page only says where things go.

## Database schema: one file per area (DB-SPLIT)

The Prisma schema is a folder, `prisma/schema/`, read whole by Prisma 7.8 (`prisma.config.ts`: `schema: "prisma/schema"`). Each file holds one area's models and enums and opens with a one-line rule saying what belongs there and who owns it; `tests/check_prisma_schema.ts` (F) refuses a file without that line.

| File | What belongs there | Owner |
|---|---|---|
| `base.prisma` | the generator, the datasource, `Workspace`, enums used by more than one area | the tech lead |
| `pathways.prisma` | pathways, programs, combinations, person roles, a combination's forms list and its changes | screens |
| `forms.prisma` | official files and confirmed official pages, intake, form editions and what IRCC accepts, field maps, portal captures, library changes | forms |
| `library.prisma` | shared fields, answer lists, questionnaire sections and questions, document types and requirements, conditions, checks | forms |
| `proposals.prisma` | drafting jobs, AI batches, proposal items | forms |
| `governance.prisma` | releases, pack versions, review sign-offs, audit, change sets, source register | screens |
| `testing.prisma` | sample profiles and facts, generated files, test families, answer keys | screens |
| `cases.prisma` | a case, its number, team, pin, route and stages, people and relationships, tasks | runtime |
| `answers.prisma` | answer subjects, answers, snapshots, generated and validated copies | runtime |
| `filings.prisma` | submission groups, filings and their items, filing changes, assessments | runtime |
| `review.prisma` | review findings, filing reviews, readiness passes, review rounds | runtime |
| `submission.prisma` | sign steps, signed scans, filing records, fee receipts, UCIs | runtime |
| `evidence.prisma` | checklist lines, case documents, document reads, read values, answer checks | evidence |
| `extension.prisma` | browser-extension pairing, code tries and sessions, re-capture tasks | forms |
| `links.prisma` | links sent to a person on a case, their code tries and sessions, the demo inbox | runtime |

* **A new module adds its own schema file in the folder** (`prisma/schema/<area>.prisma`, its rule line first); never edit another area's file without its owner. A relation to another area's model is written in your file; a back-relation field the other model needs is the one line you ask its owner for.
* Generator and datasource stay in `base.prisma` only. An enum moves to `base.prisma` when a second area starts using it.
* Migrations are unchanged: one folder, `prisma/migrations/`, one migration in flight at a time (`WAY-OF-WORKING.md`, "Shared files"). `npx prisma migrate dev --create-only` reads the whole folder.
* Any change under `prisma/` still runs every suite (`product/tools/select-suites.mjs`).

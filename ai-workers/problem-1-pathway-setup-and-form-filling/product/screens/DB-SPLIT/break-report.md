# DB-SPLIT — break report (schema only)

PR #1709, commit `c4f728b78` (branch `claude/festive-planck-p3t8nu`). Old = `git show origin/main:…/studio/prisma/schema.prisma`
(origin/main `4ed81a72f` = the PR's merge base; same bytes). New = `studio/prisma/schema/*.prisma` (14 files). No UI, so the
screen attacks in the brief (duplicates, roles, uploads, 1024 px …) do not apply; the scope is "did any schema meaning change".
Prisma 7.8.0. Read-only against the demo database (127.0.0.1:54329): no migrate dev/reset/deploy was run.

**Verdict: nothing broke.** No model, enum, enum value, field, type, attribute, index, map or relation changed, and no
`///` doc comment moved.

## Attempts

| # | What I did | Expected | Actual | Result |
|---|---|---|---|---|
| 1 | `prisma migrate diff --from-schema old --to-schema prisma/schema` (summary) and `--script`, then the reverse direction | No difference | "No difference detected." / "-- This is an empty migration." both ways | Held |
| 2 | Parsed every top-level block (model / enum / type / view / generator / datasource) in old and in all new files; compared by (kind, name) | Same set, none duplicated | 117 = 117 (104 models, 11 enums, generator, datasource); no block missing, none extra, none duplicated across files | Held |
| 3 | Compared each block's full body line by line (trailing spaces ignored): every field, type, `@default`, `@map`, `@db.*`, `@updatedAt`, `@unique`, `@relation(name, fields, references, onDelete)`, `@@index`, `@@unique`, `@@id`, `@@map`, enum values, and every `///` and `//` inside a block | Byte-identical bodies | 0 of 117 bodies differ | Held |
| 4 | Compared the comment lines directly above each block (the `///` doc comment Prisma attaches to that model/enum) | Same text above the same block | 0 of 117 differ; no doc comment moved to another block | Held |
| 5 | `prisma format` on a copy of the old file and a copy of the new folder, then repeated #2–#4 on the formatted output | Still identical | Identical. (Neither the old file nor the new files are `prisma format`-clean — alignment only; it was so before the split, so not a finding.) | Held |
| 6 | Sorted multiset of all non-blank lines, old (formatted) vs new (formatted) | Only the new file headers added | Only additions: 14 × `// <file> — … Owner: ….` and 14 × `// One file per area (DB-SPLIT …)`; nothing removed | Held |
| 7 | Free-standing section comments of the old file (9 groups: the file preamble and the `// ─── … ───` headers): where did they go? | Each still above the model it introduced | All 9 kept, each directly before the same first model (preamble above `generator client` in base.prisma) | Held |
| 8 | Block order inside each new file vs the old file | Old relative order kept | Kept in all 14 files | Held |
| 9 | Generated Prisma Client (prisma-client-js) from old and from new into two scratch folders; compared the embedded `runtimeDataModel` (sorted) | Equal | Equal (104 models; every field's kind/name/type, dbName, relation data) | Held |
| 10 | Same two clients: `index.d.ts` (types + the JSDoc copied from `///` docs) as a sorted line multiset | Equal apart from order | Only differences: the order of the `modelProps` union and `ModelName` list (files are read alphabetically) and the trailing comma that moves with it. No app or tool code reads model order (`grep ModelName|dmmf|runtimeDataModel` in studio: no hits outside node_modules) | Held |
| 11 | `prisma migrate diff --from-config-datasource` (demo DB, introspect only) to the new schema and to the old schema, `--script` | Same SQL both ways | Identical 17-line output: the known pre-existing drift (4 `id DROP DEFAULT`, 1 drop table) listed in `tests/check_prisma_schema.ts` KNOWN; nothing new | Held |
| 12 | `prisma migrate status` against the demo DB with the new config | Up to date | "83 migrations found … Database schema is up to date!" | Held |
| 13 | `prisma validate` (config now `schema: "prisma/schema"`) | Valid | "The schemas at prisma/schema are valid" | Held |
| 14 | `tsx tests/check_prisma_schema.ts` (V, the new F checks, M on a scratch shadow DB it creates and drops) | All pass | 8 passed, 0 failed | Held |
| 15 | Something still pointing at `prisma/schema.prisma` at `c4f728b78` (code, scripts, CI, hooks; `select-suites.mjs` rule) | Nothing executable | No script/CI/hook uses the old path; `select-suites.mjs:391` matches `^prisma/`, so any area file still runs every suite | Held |

## Notes (not schema findings; for the reviewer, no action asked here)

- While I worked, the builder pushed `93e8e9f89` on top ("leave the tech lead's guard tests as they are"). It does not
  touch `prisma/`, so all results above stand for it too. In that commit `product/tools/check-select-suites.sh:18,35` and
  `check-isolated-ttl.sh:17` go back to naming `prisma/schema.prisma`, a file that no longer exists. These are tool tests, not
  the schema, so outside this pass; the reviewer should check they still prove what they claim (`sel` only classifies the
  path, and `isolated.sh` now matches any `*.prisma` under `prisma/`).
- The working copy also had local changes I did not make (index/working-tree edits to those tool files and A24-2 screenshots),
  apparently another agent working in parallel. All schema checks were run against files equal to `HEAD`
  (`git diff HEAD -- prisma prisma.config.ts` was empty).
- Prose that still names `prisma/schema.prisma` (for example `product/SECOND-MAC.md:81` baton rule, `BACKLOG.md:123`)
  is documentation, not schema. Not a finding for this pass.

## What held

Every model, enum and value, field, type and attribute, every index, unique, id, map and relation (including name, fields,
references, onDelete), every `///` doc comment and its owner, and every section comment. The migration history still
resolves to the demo DB ("up to date"), and the database drift is the same as before the split.

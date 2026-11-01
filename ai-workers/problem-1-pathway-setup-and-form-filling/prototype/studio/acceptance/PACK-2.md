# Pack 2 — AI drafting, questionnaires and release (P-220, Day 0, 1 Nov 2026)

Journeys: [J3 draft the rest](journeys/J3-draft-the-rest.md), [J4 questionnaires to release](journeys/J4-questionnaires-to-release.md). IRCC rules: `product/compliance-trace.md`, section "Pack 2". Shared helper: `lib/pack2.ts` (sample load, people, review queue, US$0 check).

| Test | Capability | On main at 25cefb67 (1 Nov) | Fails because |
|---|---|---|---|
| `C2.6.test.ts` | Checklists read into document-requirement proposals | Red | the checklist path is a stub; no `requirement_line` lander |
| `C3.4.test.ts` | AI drafts sections, document types, checks, answer lists | Red | no producer (route proposed: `/attachments/:id/draft-masters`) |
| `C3.6.test.ts` | Add the fact a rule needs (P-158) | Red | no rule-fact add (route proposed: `/combinations/:id/rules/:key/fact`) |
| `C11.13.test.ts` | Reuse / new, duplicates, near reason at release | Red | exact-duplicate refusal lacks "where used"; near reason not shown to the second person or on Release; a near item can be Ready |
| `C4.11.test.ts` | Draft questions and documents (7 steps) | Red | no plan or run (`/combinations/:id/draft/plan`, `/draft`, concept §7) |
| `C3.11.test.ts` | Signed-scan document lines | Red | not on main (PR #113 carries it) |
| `C4.7.test.ts` | PQR picks drafted, accepted or removed | Red | not routed; no `pqr_pick` lander; needs C4.11's plan route |
| `C4.1.test.ts` | SQR per role, section Move up / Move down | Red | no section move (route proposed: `/combinations/:id/sections/:key/move`) |
| `C4.2.test.ts` | PQR marking | Red | QA-125: the losing save says "the database refused a duplicate" |
| `C4.6.test.ts` | Preview by person per channel | Red | Preview does not say who signs which PDF (shape proposed: `PreviewForm.sign`) |
| `C4.8.test.ts` | PQR and SQR in the one release | Red | waits for C4.1's section move |
| `C11.12.test.ts` | Who can be: filing mode, P-209 | Red | no filing mode or derived filings; sample says "Applicant" |
| `C11.10.test.ts` | Setup cards | Red | Cards / List not kept per person on the server |
| `X1a.test.ts` | An empty combination is never released | **Green** | — (F8 is on main: this is a guard the tech lead may move into `tests/` now) |

Run notes: each test mutates its copy, so give each a fresh one. `tools/isolated.sh … start` drops the database without `--force`; if a previous server still holds a connection it stops before the server starts (the next test then fails with ECONNREFUSED): run `dropdb --force xr_studio_<name>` first. The C4.1, C4.2, C4.7 and C4.8 tests take the combination key as a 4th argument (default `wp.family`) so J4 can rerun them on `vv.single` once C4.11 is green.

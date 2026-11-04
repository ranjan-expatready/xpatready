# Pack 2 — AI drafting, questionnaires and release (P-220, Day 0, 1 Nov 2026)

Journeys: [J3 draft the rest](journeys/J3-draft-the-rest.md), [J4 questionnaires to release](journeys/J4-questionnaires-to-release.md). IRCC rules: `product/compliance-trace.md`, section "Pack 2". Shared helper: `lib/pack2.ts` (the six from the Demo menu, people, review queue, US$0 check).

**Sample:** every test loads the six a person loads from the Demo menu (`{sample:"six"}`, `samples/wave1.json`), Visitor visa first. A test that needs questions, rules or a release the six do not have yet stops with **exit 2, "setup missing"**, and names its stand-in on the suites' older fixture (a 4th argument such as `wp.family`, which a person never sees).

**Needs first (founder):** one founder-approved live trial on Visitor visa (P-131, cost stated before it is spent) records the saved runs that C2.6, C3.4, C4.11 and C4.7's AI path replay at US$0; the builder commits them with the build. Until then those tests stay red on "no saved run".

Results on main at the merge of 1 Nov evening (branch at a5313918), each test on a fresh isolated copy:

| Test | Capability | On the six | On the fixture stand-in | Fails because |
|---|---|---|---|---|
| `C2.6.test.ts` | Checklists read into document-requirement proposals | Red 4/32 | — | stub drafts nothing; no `requirement_line` lander; the old `apply-checklist` door still writes outside the queue; no saved run |
| `C3.4.test.ts` | AI drafts sections, answer lists, checks, rules from sources | Red 7/16 | — | no producer (route proposed `/attachments/:id/draft-masters`); no saved run |
| `C3.6.test.ts` | Add the fact a rule needs (P-158) | exit 2 (no rule yet) | Red 5/18 (`wp.family`) | no rule-fact add (route proposed); no document-type proposal from a requirement |
| `C11.13.test.ts` | Reuse / new, duplicates, near reason at release | Red 10/15 | — | the Demo load's field drafts propose 11 names "new" in two editions; refusal lacks "where used"; near item Ready; near reason not shown to the second person or on Release |
| `C4.11.test.ts` | Draft questions and documents (7 steps) | Red 1/23 | — | no plan or run (concept §7); no saved runs |
| `C3.11.test.ts` | Signed-scan document lines | **Green 12/12** | — | — (Works; Visitor visa proof) |
| `C4.7.test.ts` | PQR picks drafted, accepted or removed | exit 2 (no questions) | Red 0/15 | not routed; no `pqr_pick` lander; needs C4.11's plan route |
| `C4.1.test.ts` | SQR per role, sections, Move up / Move down | exit 2 (no questions) | Red 7/15 | no section move (route proposed); on Visitor visa also G4, G5, G10 |
| `C4.2.test.ts` | PQR marking | exit 2 (no questions) | Red 8/10 | QA-125 words ("the database refused a duplicate"); a fact whose section was taken out can still be ticked. **4 Nov (#866):** QA-125 fixed (#688). Ruling P-294 (B) on #688: forms pull their questions, so a section taken out still asks what they need, and ticking such a fact is right. The case now builds a truly unasked fact: a form field reading a fact with no library question. It expects the release error ("nobody is asked for it") and the 422 on the PQR tick. 10/10 on `wp.family` and on Visitor visa set up by `tests/runtime/setup_visitor_visa.ts`; on the bare six still exit 2 (QA-144) |
| `C4.6.test.ts` | Preview by person per channel | Red 11/17 | — | no "who signs" on a PDF (shape proposed `PreviewForm.sign`); no later-wave note on Online |
| `C4.8.test.ts` | PQR and SQR in the one release | exit 2 (no questions) | **Green 10/10** | — (Works) |
| `C11.12.test.ts` | Who can be: filing mode, submissions, P-209 | Red 5/19 | 18/19 (C11.12 PR 1, #445) | line 57 amended to "warn" (P-233 (3)); left: line 90, the sample's principal labels (QA-143, screens-1's sample fixes) |
| `C11.12-runtime.test.ts` | Runtime refuses a role not listed or over the maximum | — (no release) | **Green 4/4** | — |
| `C11.10.test.ts` | Setup cards, chips, Needs you | Red 12/15 | — | Cards / List not kept per person on the server (route proposed, a question) |
| `X1a.test.ts` | An empty combination is never released | **Green 12/12** | — | — |
| `X1a-submitted.test.ts` | The bug's real case: emptied while its submission waits | — (none submittable) | Red 5/6 | the waiting submission can still be signed off |

Run notes: each test mutates its copy, so give each a fresh one. `tools/isolated.sh … start` drops the database without `--force`; if a previous server still holds a connection it stops before the server starts (the next test then fails with ECONNREFUSED): run `dropdb --force xr_studio_<name>` first.

# Product Studio configuration MVP: maker checkpoint and reviewer handoff

21 October 2026, 05:26 UTC · maker: Claude Code (replacement maker, session b277f247) · D275–D278, D281 · ready for the formal checker. Maker self-verification only; no review or founder acceptance claimed. Nothing committed.

**Exact revision:** `prototype/studio-config-mvp-manifest-2026-10-21.sha256`, SHA-256 `eafdd3de28b1f1acdfb188f94fd866506c707d86c7f264a11ea9b5088f18d965` (90 files: `studio/` source, schema, migrations, tests, evidence, plus the files outside `studio/` listed below). Generated outputs (`studio/web/dist`, `studio/var`) and the toolchain under `.tools/` are excluded.

## Launch (one command, from the project root)

```
zsh ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/start.sh
```
Then open http://localhost:4400. The command starts the local PostgreSQL 18 demo cluster (127.0.0.1:54329), applies the migrations, builds the web app and starts the API. `studio/stop.sh` stops both; data stays until **Reset demo**. The workspace was left loaded with the five sample programs after the last check (`C1`).

## What exists (stack per D276; choice record per D278)

| Layer | What it is | Reuse |
|---|---|---|
| Database | PostgreSQL 18.6 through Prisma 7.8.0 (`studio/prisma/schema.prisma`, 3 migrations). Tables: ProgramDef, Composition, SourceAttachment, GovFormDef, FormEdition, CompositionForm, FormFieldMap (one row per box), CanonicalField, LogicalSection, SectionQuestion (placements), SqrSectionSelection, DocumentType (with `suppliesFacts`, closing D36 in this model), DocumentRequirement, Predicate (rules), DerivedField, Check, DraftingJob, NormalizationItem, ConfigRelease, ReviewSubmission, ReviewSignoff, AuditEvent, SampleProfile/SampleFact, GeneratedArtifact | Model and column names follow the team's pack models (`ERv2-sanitized@22f1d12` `country-pack-*.prisma`); simplifications are stated at the top of the schema |
| API | NestJS 11.1.29 (`studio/api/src`): programs/compositions, versioned library edits (a DRAFT row edits in place; a PUBLISHED row gets a new DRAFT version), validation, review/sign-off/release with D254 duties via `contracts/rules.ts canRelease`, normal upload handling, form reading, guarded AI launch, library matching, PDF fill, Load sample inputs, Reset | `contracts/rules.ts` (conditions, release rule), `p5/transforms.ts`, `p5/fill.py`, `p1/xfa_inventory.py`, `p2/launch.ts` unchanged |
| Engine | `studio/engine`: `snapshot.ts` (DB rows → contract-shaped configuration, sorted, hashed), `render.ts` (the common renderer: forms per person, box coverage and whose value, checklist, deciding and rule-only questions, triggered checks), `normalize.ts` (library comparison), `validate.ts` (problems and release differences), `import.ts` (release c1-v3 and the made-up family) | |
| Screens | React 19 + Vite 8 + Tailwind 4 + Radix + react-query (`studio/web`). Team tokens, logo, Inter font and Card/Tabs/Badge/EmptyState/ErrorState/Spinner copied unchanged from `ERv2-frontend@5ccd9fa` with provenance notes. Programs; composition Overview / Sources and forms / Configuration (forms, documents, rules, questions and sections, checks) / Preview / Review and release; AI proposal review; Fields, Sections, Document types; Releases; Activity; persona switch (simulated author, SME-duty reviewer, approver); Load sample inputs; Reset demo with scope and confirmation; dark theme | Refine was not used: these are workflow screens, not generic list CRUD (D278 note) |

Files outside `studio/`: `p1/inventory/imm5257e.inventory.json` (new P1-format inventory of IMM 5257, from the unchanged P1 code; re-deriving IMM 1295 gave an identical file), `p2/jobs/studio-fieldmap-imm5257e.json` (guarded field-map job for IMM 5257), `p2/runs/studio-fieldmap-imm5257e-live-20261021t043621474z.json` (the refused live run). The ledger gained append-only lines (one stub pass per screen-started draft; two lines for the refused live run, settled at US$0 by `studio/tools/correct_unbilled_p2.py`, the D273 rule). Committed spend remains **US$24.13**; the experiment cap was raised from US$40 to **US$100** by AIW-D282 (`p2/policy.ts`, the one constant the P2 and reader paths share; `tests/check_p2_launch.ts` now asserts the policy constant, 51/51; guard 49/49).

## Short persona demo (about 10 minutes)

1. **Configuration author.** Programs shows 3 programs and 5 compositions (empty start: Reset demo, then Load sample inputs). Open *Work permit › Principal, accompanying partner and child*: released v1, imported from c1-v3 and labelled with its hash and runs.
2. **Preview** (released, Client A family as an existing sample record): forms per person, documents, questions, deciding answers. Type `common_law` for the partner's marital status: IMM 5409 switches from "cannot tell" to "applies", with its reason. Under Forms and coverage, each box shows whose value it reads and where that value comes from.
3. **Fill PDF from confirmed facts** for IMM 1295 (principal): the file is intact and every value reads back; both IRCC signatures verify; download.
4. **Configuration › Documents › Add**: the sample button *Minor travelling alone (IMM 5484)* fills an exact official quote and a condition. Save as draft. The draft preview shows "Cannot tell yet", which becomes "Needed" once the child is answered as travelling alone. The released version is unchanged.
5. **Review and release:** the author submits. The approver's early release is refused: the SME sign-off is needed. Switch to the content reviewer, select and sign. Switch to the approver: version 2 is released and carries the change.
6. **Add another form (visitor visa › Single applicant › Sources):** IMM 5257 has been read (242 boxes). *Draft with AI*: a live call is currently **blocked by the Anthropic account limit**, shown as such at US$0. Stub pass works. A replay needs a saved real run, and IMM 5257 has none yet.
7. **Add a form with real AI output** (from-scratch path, browser pass B): new pathway, program and composition by hand. A manual upload of IMM 1295 is recognised; a non-official file is held. Read, then *Draft with AI* → replay of the saved real run from 20 Oct. Against an empty library, 80 fields are new. Then IMM 5476 against that library gives 5 reuse, 9 new and 10 ambiguous (address parts → reuse `person.mailing_address` with `address_part:` transformations; `uci_number` ~ `uci`; `email_address` ~ `email`), each with evidence, whose boxes it fills and what depends on it. Decide, return one with a reason, apply. Coverage shows new fields unresolved until a person places one (Fields › `person.email` › section "Contact details"), after which those boxes come from a client question, with no screen code changed. Then review and release.

## Executed checks (21 Oct, this machine)

| Check | Result |
|---|---|
| `node studio/tests/check_studio_browser.cjs` (Playwright 1.62.1, Chrome, 1440×900; stub mode; screenshots and log in `studio/evidence/browser-run-1/`) | **40/40**, 74 clicks, 146 s, no page errors: reset → load → preview → on-screen answer → PDF fill/read-back/download → human conditional requirement → draft-only preview → refused early approval → SME sign → release v2 → IMM 5257 guarded stub → field reuse view → reset → from-scratch build with two replayed real AI runs → placement → release → reset → reload with identical counts (3/5/29/1, 164 fields), fresh activity |
| `tsx studio/tests/check_engine.ts` | **24/24** (matching, renderer, draft/release resolution, validation, differences, c1-v3 with the made-up family: distinct principal and partner values) |
| `tsc` API, web and prototype | pass |
| Existing suites, rerun | check_p5_engine 29/29, check_contracts 23/23, check_conditions 30/30, check_p2_guard 49/49, check_p2_launch 51/51 |
| Reset preservation | Spend ledger, AI run records, job definitions and inventories, official originals, P3/P4 releases and evidence, fixtures and keys, and engine source are fingerprinted before and after every reset; byte-identical in all runs. Reset log: `studio/var/reset-log.jsonl` |

## Limits and open items (honest)

- **Re-probed 05:34Z after the founder reported raising the limit: still refused** (`req_011CgEqXsvhgXYd1PQ1AuQcC`, unbilled). Gate 0 in NEXT.md.
- **Live AI addition of IMM 5257 is not demonstrated.** Anthropic refused the call (HTTP 400: account usage limit, "regain access on 2026-11-01"). D273's planned limit raise is not yet effective. Founder action needed; then re-run from the screen (≤ US$5).
- Replays reuse saved real runs from 20 Oct (labelled). The library comparison is deterministic (keys, meaning words, type, period/role words, address parts); its accuracy on further forms is not measured.
- Program 5 (super visa) is illustrative. Its sample requirements quote IMM 5484 p. 2 exactly; conditions are the Lead's reading (D50). Program 2 is a role-filtered draft variant of c1-v3, not reviewed by the SME.
- **D279/D280 (after this build started) are not yet implemented:** 100-program table layout and contextual AI placement. Next session.
- Remaining P5 client/agent case journey on this database, then P6/P7, not started here. The prior maker's `p5/` shell (JSON files) remains separate evidence.
- **Prototype only:** simulated people, no authentication/tenancy/RLS, local trust-auth database, no production qualification. Seven c1 derived fields have no tested calculation (recorded, never evaluated).

## Copyable reviewer prompt

> You are the independent formal checker (Codex reviewer, D267) for Expat Ready Workstream 2, folder /Users/ranjansingh/Desktop/Xpatready. Read AGENTS.md, ai-workers/README.md §0–1, ai-workers/NEXT.md, decisions D274–D282, and `ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio-config-mvp-handoff-2026-10-21.md`. Verify the manifest `prototype/studio-config-mvp-manifest-2026-10-21.sha256` (SHA-256 eafdd3de…d965) with `shasum -a 256 -c` from the prototype folder. Scope: the D275 configuration MVP as built (not D279/D280, not the remaining P5 journey). Launch with `studio/start.sh`; rerun `node studio/tests/check_studio_browser.cjs` (it resets and reloads the demo workspace; stub mode, no paid call) and `studio/tests/check_engine.ts`; operate the screens yourself. Check: persisted versioned records and reload; draft versus release isolation; renderer changes without screen-code edits; person and period distinctions in matching; D254 duties; reset boundaries and preserved-evidence fingerprints; honesty of replay/blocked/illustrative labels; source quotes against official files. Distinguish inspected, executed and unverified evidence. Report PASS / PASS WITH FIXES / FAIL with numbered Material/Minor findings (file:line) and append one verdict line to ai-workers/PROGRESS.md only.

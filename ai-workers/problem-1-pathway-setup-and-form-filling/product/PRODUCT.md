# Product Studio · Pathway Configurator — product home

What we build, the words we use, and where everything lives. Owner: the Lead. Read with `WORKFLOW.md` (who does what) and `STATE.md` (where we are).

## 1. What we are building
A **simple working prototype** of one ExpatReady capability: a content publisher sets up each immigration combination once (AI drafts it from IRCC forms and checklists; people review and release it); each person on a case then gets the right questions, documents and forms; facts are asked once and fill every form.
* **Local only** — never committed to the team's repositories; the founder aligns the whole journey, then the team retrofits it (P-01, P-19).
* **Proof only (P-26)** — build only what the end-to-end proof needs; anything the team already has or will harden is not built. Before adding anything ask: does the proof break without it? If not, leave it out.
* **Looks like the team's product** — same layout, colours, components, tokens and words as the existing screens, and the team's model names (P-10), so the team can put it on top of their code and adapt it. No handover notes.
* **Journey:** Super Admin configures and previews → the case officer prepares the case and the representative reviews it (P-154) → client answers on the family link → checked PDF. Milestone 2 builds the complete Super Admin configuration experience, including PQR/SQR authoring and representative preview; Milestone 3 proves those configurations in case officer, agent and client runtime through checked outputs (`SCREENS.md`, P-56). A thin runtime slice on the visitor visa runs early alongside M2 (P-67); an independent tester checks every capability in `qa/CAPABILITIES.md` (P-68).
* **Purpose (P-28, P-54): production-quality slices, full scope.** Build the agreed capability in complete, testable milestone slices; no feature is cut to fit a milestone. Each slice gets functional scripts, manual/browser review, adversarial checks and founder acceptance before the next starts. This is a production-quality reference for the included capabilities, not production certification of the whole product or its integration into the team's codebase.
* **Think production (P-32):** a person uploads every source; a person uploads a new edition when IRCC changes a form, and AI reports its impact on reusable parts and combinations before anything changes. Prototype tooling (fetch script, sample loader, Reset, replayed AI answers) is scaffolding, never a capability.
* **The proof = one repeatable demo loop:** reset → create a combination → a person uploads up to 5 IRCC forms + document checklist → AI creates reusable fields, sections, documents and rules → review, accept, release → open a case → client answers → checked PDF (or, for an online-only application, a checked answer sheet in the portal's order, P-30) → add the next combination, which reuses what exists ("34 reused · 12 new") → upload a new edition of a form in use (IMM 5476 2021 → 2025) and review AI's impact across combinations → accept, release → reset and repeat. Done when it works for the top combinations across both workspaces — start 3 Individual + 2 Corporate and employers, extend to 5 + 5 — and the PDFs pass the founder's eye check. Reset replays recorded AI answers; live AI only for a new or changed form.
* **At the end: one capability page** (P-29) — every capability, the tool behind it, how it feeds the next, where it lives in the code. The only document written for the team.

## 2. Sources of truth (in this order)
1. Team requirements: newest `sources/drive-snapshot-*/02-functional-requirements/` — above all SA-01B v1.5 and SA-01B-REDESIGN-DECISIONS (18 Oct).
2. Product decisions: `DECISIONS.md` (P-01 …); history in `../../decisions.md` (older; P-decisions win where newer).
3. Solution page: `../solution-1-one-pager.html` (activity IDs 1.1 … 10.4 = journey steps; authoring data `../../tools/s3/s3_data.py`).
4. Team code: newest `code/ERv2-frontend@*` and `code/ERv2-sanitized@*` (read-only), incl. `docs/style-guide/` and `src/styles/tokens.css`.
Immigration values come from the immigration expert; sample content is labelled **Sample**.

## 3. Left menu — only this prototype's screens (P-04)
| Group | Items (exact words) |
|---|---|
| Configure | **To review** (P-79) · **Programs** |
| Shared library | **Fields** · **Sections** · **Document types** · **Forms** · **Checks** · **Rules** (read-only central list, P-37) |
| History | **AI work** · **Releases** · **Activity** |
The team merges these into the product's menus. A new item needs a screen in `SCREENS.md` and a decision. Case officer and client menus are defined when their milestones start.

## 4. Words on screen (P-05)
| Use | Not | Meaning |
|---|---|---|
| Pathway type: Retail / Corporate and employers (P-104) | client type, segment | Workspace switch; data value Corporate (P-06, P-16) |
| Program › Category › Sub-category | stream, level 3/4 | Masters of a combination (team enum STREAM = Category, CATEGORY = Sub-category: an adapter, not a rename) |
| Combination | composition, combo, configuration row | The last level present; owns one configuration |
| Delete · Remove from … · Retire · Restore · Withdraw · Replace edition (P-116, 28 Oct) | Archive, Deactivate, Trash, "Remove" alone, rule codes such as "(L3)" | Delete: never released and used nowhere. Remove from …: a line out of one combination, section or questionnaire; the item stays in the library. Retire: hidden from pickers, AI and new setups; open cases and releases keep it. Restore: undoes a retire. Withdraw: cancels a waiting delete or retire. Replace edition: a new form edition; earlier releases keep the old one |
| Person roles: Principal applicant, Spouse or partner, Dependent child, Representative | participants | Who a line applies to |
| Representative · Case officer · Staff · Case view (P-154) | agent, agent view | Representative: licensed, named on IMM 5476. Case officer: unlicensed firm staff. Staff: everyone at the firm. Answer sources: Document · Client · Case officer |
| Field · Section · Document type · Form · Check | canonical field, logical section, predicate | Shared library masters |
| Form field · Field map (P-63) | box, box map | A fillable spot on a PDF or input on a portal screen · which shared field fills it, for whom, how |
| Rule ("Ask when…", "Required when…") | predicate, condition flag | Shown as a sentence |
| Sources | inputs, attachments | Official forms, checklists, guides |
| Draft · Review and release · Release 3 | hash, snapshot | Governance |
| AI proposal · Accept · Edit · Reject | AI output | Nothing applies until accepted |
| Not applicable / No sub-categories | none, N/A | The category is itself the combination |
| ↔ Supported by · Follows | dependency | Links between combinations (P-13) |
No hashes, run IDs, decision numbers, model names or file paths on the main path.

## 5. Stack and app
Reference app `../prototype/studio/`: NestJS + Prisma + PostgreSQL (`api/`, `prisma/`), React + Vite (`web/`), engine (`engine/`), tests (`tests/`). Start `zsh ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/start.sh` → http://localhost:4400; stop `stop.sh`. AI calls go through the guarded route and spend ledger (`../prototype/p2/`): caps US$100 total, US$5 per run; stub/replay in tests. Demo-only chrome (Prototype badge, Load sample inputs, Reset demo, Acting as) is never ported.

## 6. Files and owners
| File | Holds | Edited by |
|---|---|---|
| `WORKFLOW.md` | roles, stages, gates, sync rules | Lead |
| `STANDARDS.md` · `EXPERIENCE.md` · `QUALITY.md` | engineering bar · UX/UI bar · scoring and gate | Lead |
| `domain/MASTERS.md` · `domain/RULES-MODEL.md` · `domain/TAXONOMY.md` | data model · rules and validation · immigration structure | Lead |
| `DECISIONS.md` · `decisions/` | product decisions | Lead (founder decides) |
| `REQUESTS.md` | every founder request | Lead |
| `BACKLOG.md` | requirements not yet scheduled (from the SA-01B and one-pager trace) | Lead |
| `PLAN.md` | dated plan from measured pace, re-planned every Friday | Lead |
| `LANES.md` · `lanes/<lane>.md` · `STATE.md` | lanes and file ownership · each lane's stage (the lane; the Lead writes only its "From the Lead" note) · generated overview (`lane.sh state`) | Lead · lane · Lead |
| `SCREENS.md` | register of screens and slices | Lead |
| `qa/` (CAPABILITIES, BUGS, reports) | what works, open bugs, test runs | qa lane |
| `LEAD.md` | Lead journal | Lead |
| `RETRO.md` · `design/journey-v2.dc.html` | five-line retro per screen · the clickable journey board (source of every screen's layout) | Lead |
| `screens/<item>/` | concept, design, challenge or plan, build-notes, review, break-report, lead-check | as named in `LANES.md` |
Every file stays under 100 lines (checked by `tools/check-docs.sh`).

## 7. Measured so far — the baseline (P-27; keep, do not re-run or extend)
| What | Result | Evidence |
|---|---|---|
| AI maps form boxes (combination 1: 6 form editions, IMM 5707, IMM 1295 …) | 461 / 461 boxes mapped; on the 49 checked boxes 0 wrong person and 0 invented values in 5 trials; 37–42 / 42 correct before review | `../prototype/p2-results-brief-2026-10-20.md` |
| Live add-form, IMM 5257 (visitor visa) | AI draft → review → release → filled PDF: 44 written, 44 read back equal, signatures intact | `../prototype/studio/evidence/slice-1-imm5257-live/` |
| Catalogue at volume (old data model) | 105 programs / 371 rows: 19.7 s uncached, 1,023 ms cached | `../prototype/studio/evidence/scale-100/` |
| AI spend | US$26.72 of US$100 in the slice-1 ledger, plus US$2.94 for two IMM 1344 runs on 23 Oct (about US$29.66) | slice-1 `ledger.json`; `screens/01-programs-catalogue/lead-check.md` |


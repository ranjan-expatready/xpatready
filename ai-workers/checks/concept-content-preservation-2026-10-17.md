# Concept preservation audit — before another rewrite

Version 1.0 · 17 Oct 2026 · Lead. Historical content comparison, not a new product specification or acceptance verdict.

**Finding:** most detailed functional material remains in v4, but it is much less visible. Some useful catalogue information and reading aids were genuinely removed across revisions. The earlier statement that all good content was preserved was too broad: counting sections did not prove that their contents survived.

**The active v4 page has not been changed by this audit.** It is now frozen with its builder and base CSS. Separate restored v1 and v2.1 reference copies are available under `../review/`; their original archived files remain unchanged. No old wording has been reinstated as a current decision.

## 1. What versions actually exist

| Saved artifact | What it contains | Audit treatment |
|---|---|---|
| Pre-reset `native-ai-map-draft-2026-10-16.html` | Initial setup/journey/worker-versus-skills explanation | Historical comparison; not current policy |
| Pre-reset `prototype/index.html` | Interactive worker-era prototype, primarily script-rendered | Preserved history; a different artifact, not “v0” of this concept page. Its rendered screens were not inspected in this audit |
| Concept v1, 16 Oct | 24-step journey, skill-family cards, 33-row catalogue with Engine/Status columns | Full earlier reference; substantive content compared |
| Concept v2.1, 16 Oct | Eight mechanisms, twelve appendices, five detailed matrices | Main depth baseline; restored as a separate reference |
| Concept v3, archived 17 Oct | Expanded story, pricing, 34 keyed skills and 43 display names | Compared with v4 |
| Concept v4, 17 Oct | New configuration explanation and heavily collapsed reading structure | Current page; unchanged during this audit |

A standalone v2 HTML snapshot was **not found**. The log records a v2 build, and v2.1 superseded it, but that is not proof that every unsaved v2 detail survives. There is no saved v5 or v6 concept page. Do not invent version history from revision counts in chat.

Originals: `../../archive/ai-workers/expat-ready-ai-concept-v1-2026-10-16.html`, `...-v2.1-2026-10-16.html`, `...-v3-2026-10-17.html`, `...-v4-2026-10-17.html`. Earlier draft/prototype: `../../archive/ai-workers-old-direction-2026-10-16/`. The founder explicitly requested this historical comparison.

## 2. What remains — including AI, rules and people at every stage

| Material | Current v4 location | What changed |
|---|---|---|
| Five case stages | Topic 8, “One case, in five stages” | Main topic now closed by default |
| All 24 numbered case steps, plus three any-time situations | Twelve appendices → A | Two closed layers before the detailed steps; each still shows the skill, AI/rules and the person's responsibility |
| All 17 setup/use/update steps | Twelve appendices → B | Two closed layers; AI/rules/person chips remain |
| Action matrix | Twelve appendices → D → matrix 1 | Retained, hidden from the main reading path |
| Determinism matrix | Same → matrix 2 | Retained: fixed rules versus variable AI output |
| Approval matrix | Same → matrix 3 | Retained: who prepares, who approves, exceptions |
| Trigger matrix | Same → matrix 4 | Retained, including the open Q13 decision |
| Fact-source matrix | Same → matrix 5 | Retained: document, asked, calculated, carried over, agent |
| Eight worked mechanisms | Eight mechanisms → A1–A5, B1–B3 | v4 added an outer closed section; every mechanism is also closed |
| Where facts come from; question reduction; same fact under different form labels | Eight mechanisms → A2 | Retained together, but the A2 label does not advertise all this content |
| Conditional questions/documents | Eight mechanisms → A5 | Retained |
| “How one answer travels” diagram | Eight mechanisms → B1 | Retained |
| First-time/every-fill mapping diagram | Topic 3 → “The full first-time / every-fill diagram” | Retained behind an additional disclosure |
| 34 keyed skills, 21 AI and 13 rules | Twelve appendices → D | Retained; these are distinct from working display names |
| 43 working skill display names and “Never does” descriptions | Same → “Every skill in one list” | Retained; not a second approved inventory of 43 numbered skills |
| Persona sweep | Twelve appendices → E | Retained |
| Firm work, internal operations, controls | Topics 7/9 and appendices F/G | Retained |
| Five technical pictures, build limitations and fallback | Twelve appendices → I | Retained |
| Pricing, pilot measures, risks, decisions and exact approved claim | Topics 10–12, audit; appendices J/L | Retained or rewritten/consolidated with corrections |

**Visibility finding:** v1 had no disclosure panels; v2.1 had 22; v3 had 26; v4 has 46. All 12 main topics became closed cards in v4. That materially changed the reading experience even where the words remain. A compact opening does not justify making the core workflow difficult to find.

Source checks in `concept-content-preservation-2026-10-17.json` verify all 24 numbered case steps plus three any-time rows, all 17 setup rows, the catalogue-column change, frozen file hashes and restored-copy equivalence. All 27 detailed case rows match v3 after the known terminology substitutions. This proves that specific comparison, not complete semantic preservation across every version.

## 3. What was genuinely removed, reduced or replaced

| Earlier material | Confirmed change | What should happen next |
|---|---|---|
| Catalogue **Engine** column: Reader / Sorter / Writer / Checker / Rules | Present for all 33 v1 rows; absent from the later display catalogue | Restore a meaningful function classification, with a plain explanation; do not imply separate engines are implemented |
| Catalogue **Status** column: exists / extend / new | Present in v1; absent in later display catalogue. Other tables contain some status information, but there is no complete row-by-row replacement | Restore status per component. Replace ambiguous “exists” with separate definition/build evidence; a specified feature is not a built feature |
| **Case Opener** catalogue row | Removed from the display catalogue; function remains in case step 11 | Restore a linked entry as a rules function, not a new AI skill |
| **Route Planner and Expiry Watcher** catalogue row | Removed from the display catalogue; both functions remain in case step 24 | Restore clearly named, linked rules entries |
| **Client Helper** name | Replaced by Lead chat topic sorter/approved-answer behaviour | Keep an explicit alias trail. Do not restore it as free AI chat with clients |
| Six skill-family cards: Reader, Sorter, Writer, Checker, Filler, Co-pilot | The explanatory family-card set was removed; individual capabilities are dispersed in the current map/catalogues | Restore a compact “what each kind does” explanation using business language |
| Colour legend for setup, case work and human decisions | The earlier opening explained the colours; that explanatory legend is absent from the current opening | Restore a visible legend wherever colour carries meaning |
| Tapered question-reduction funnel | The subtraction story remains; current bars use equal full widths | Restore the visual meaning, labelled illustrative; do not invent field-count percentages |
| Five-angle reading map: direction, concept, function, technology, workflow | Removed as an explicit reading aid; underlying topics mostly remain elsewhere | Restore a small navigation guide if it helps readers locate those views |
| Firm-owner reading route in v2.1 | Removed; replaced by a generic index | Offer a clear role/task route without another layer of hidden content |
| “What we sell / what makes it ours / what we ask of leaders” cards | Those exact cards were removed/replaced; their themes survive across story, money, risks and decisions | Decide whether to restore concise proposition summaries in each independent section |
| Previous opening stories and scorecards | Rewritten, not retained verbatim in the active page | Keep all historical versions; make a new revision rather than overwrite the only copy |

The 33-row v1 catalogue became a 43-row display catalogue, while a separate 34-key inventory was added. **A higher row count did not prevent omissions.** Display names, numbered skills and ordinary rules functions need a cross-reference, not competing counts.

## 4. Corrections that should not be blindly restored

- Old “exists” labels meant specified, not implemented. Restoring the column without fixing that wording would mislead the team.
- Older claims that all example PDF forms represent the normal Express Entry pack were corrected; the actual inventory remains unverified.
- An unrelated CRM benchmark was removed from the architecture ranking. It does not prove stage agents perform worse than our alternatives.
- “No repeated map review” was clarified to preserve normal form approval and first-firm-use/changed-entry portal approval.
- Old cost headlines were reconciled; do not restore inconsistent figures as current prices or measured costs.
- Older AI-worker profiles and prohibited old wording remain archived under the reset. Their functions can be traced without presenting the retired organisation as current.
- Illustrative activity-strip minutes are not a measured saving. Keep real counts and their distinction from billing units.

Restoration means preserve and recover useful content, while carrying forward corrections. It does not mean reverting decisions or known factual repairs.

## 5. Two propositions: recommendation after this audit

**Use one HTML with two independently readable main sections.** The earlier connected pitch overemphasised a dependency that is not required to explain either value proposition.

**A — Pathway Setup and Form Filling.** Combination, official forms/documents/guidance, generated configuration, shared field library, PQR/SQR, OCR upload, agent work, validation, to-dos, PDF and portal output. Show old manual work, alternatives, the standing solution and intended benefits.

**B — AI Across the Case and Business.** Roles, stages and business areas; named assistant responsibilities; reusable skills; ordinary rules/calculators; triggers, ownership, review and controls. Compare workers, stage agents, small skills and co-pilot fairly. The organisation comparison remains open.

**Relationship, stated once:** A can be delivered through an ordinary product workflow calling AI functions; it does not require choosing workers or stage agents. B can assist the existing product before full AI configuration generation exists. When combined, they can reuse approved facts, skills, permissions and approvals. The agreed module-first build order remains; that is not a requirement for a single combined sales story or for two separate technical systems.

For the next revision, keep the core AI/rules/person workflow visible in each section. Use depth for supporting detail. Restore the catalogue omissions and reading aids before adding more content. Do not force-fit the two propositions into one causal diagram.

## 6. Terminology findings and naming work

The wording sweep was incomplete: capitalised variants such as “Assessment questionnaire (PQR)” and “Full questionnaire (SQR)” remain in older mechanisms/steps. “Mapper”, “Reader”, “Helper”, “Librarian”, “AI category”, “assistant” and “engine” are not consistently distinguished. Some names describe an implementation rather than a business job.

`../terminology-register.md` proposes business names, responsibilities and aliases for all 34 keyed skills, all 43 working display labels, restored rules entries and the five areas/common controls. Names do not create agents, allocate skill IDs, imply implementation or settle D193. The active page has not been bulk-renamed during this audit.

**Score limitation:** the v4 7.4/10 explanation score predates these findings and does not establish preservation or presentation readiness. Re-score the next revision after the omissions and visibility issues are repaired.

## 7. What was restored and what remains next

Restored reference copies, with a historical banner and otherwise unchanged content:

- `../review/expat-ready-ai-concept-v1-restored-2026-10-17.html`
- `../review/expat-ready-ai-concept-v2.1-restored-2026-10-17.html`

Frozen before any future major edit: v4 HTML, builder and base CSS in `../../archive/ai-workers/`. The active HTML hash still matches the saved v4 verification. No current design or source capture was overwritten. Browser rendering remains Unverified; this is a source/content audit.

**Next outcome:** prepare v5 from this audit, with two independent propositions in the same active HTML, a visible stage-by-stage AI/rules/person view, restored catalogue information, a consistent terminology register and a content-by-content preservation ledger. Do not delete good detail; make its location clear. Keep the active v4 intact until the founder has received this report. The formal checker remains required for the revised artifact.

## Change log

- 17 Oct 2026: audited every saved direct concept snapshot and the pre-reset draft; preserved the script-based prototype as distinct history. Recorded real omissions, hidden content, corrected claims, restored references and the revised presentation recommendation. No active-page rewrite, commit, remote write or publication.

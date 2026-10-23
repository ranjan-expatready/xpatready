# Solution 1: working-prototype workflow, proposal for discussion

19 October 2026 · Claude Code (the Lead) · **Status: agreed approach recorded as AIW-D246, with the separate formal-review session clarified by AIW-D247. These decisions govern any differing proposal text.** The proposal as first written is kept unchanged at `archive/ai-workers/prototype-workflow-proposal-2026-10-19-before-d246-corrections/` (SHA-256 `49ce2cef…5bb5c`); §15 lists every correction made since. No prototype is built or accepted; the original one-pager and authoring sources are unchanged. D247 updates review instructions only; current review and acceptance status lives in [delivery control](delivery-control.md). Legal points: Unconfirmed: no counsel (AIW-D94). Immigration values for production come from the immigration specialist (AIW-D50); for this prototype only, D246 lets the Lead verify the answer key from official sources (§5.4, §8).

Labels used: **Confirmed** (a file, decision or source says so, cited) · **Proposal** (the Lead's recommendation) · **Assumption** (believed, not checked) · **Unverified** (evidence is stale or could not be checked) · **Open** (needs an answer).

---

## 1. What I am asked to design, in one paragraph

A repeatable way to turn the Solution 1 specification (the one-pager and its authoring sources) into a small **working** prototype in which AI drafts a combination's configuration from official forms, the checklist and the guide; people review it; and the product **uses that configuration** to render the PQR view, the SQR and the staff working view, collect sample answers and populate the government form fields. The specification stays accurate, is preserved before any change, and is corrected only through recorded, minimal patches that are regenerated, never hand-edited.

## 2. Five findings that change the plan (details and evidence in §4)

| # | Finding | Consequence |
|---|---|---|
| 1 | **The team's requirements moved on 18–19 October.** Live Drive now holds SA-01B v1.5, a new `SA-01B-REDESIGN-DECISIONS_2026-10-18.md`, AG-07 v3.0, AG-08 v1.10, AG-09 v1.13 and others. The newest local snapshot is 13 October. The redesign record contradicts the spine in at least six places (one-screen confirmation and Autofill instead of per-fact verification, warnings instead of hard blocks, Validate inside the product, manual authoring allowed, no separate specialist role, AI processing region). | All team-requirement evidence is **Unverified** until a new snapshot is taken. The conflicts go to the founder before the parts of the prototype they touch are built. |
| 2 | **The team code moved this morning.** `ERv2-sanitized` dev is at `fb76410` (19 Oct 04:42 UTC); the local capture is `b48e4ce`. | Code evidence is **Unverified (stale)** until a new capture. |
| 3 | **The snapshot safeguard does not protect the active specification.** `tools/snapshot.sh` copies the old v2 page, s2 sources, NEXT and decisions, but not `solution-1-one-pager.html`, `tools/s3/*`, `delivery-control.md` or this folder's README. The problem-1 folder is also untracked by git. | A recoverable baseline must be made explicitly before the first edit (§7). |
| 4 | **Files the records call current are missing.** The v2 pack, v2 workbook and v2 prototype are listed as present in delivery control, README §3 and the folder's CLAUDE.md, but are not on disk and are not in the 19 Oct move list. | The records need a correction; whether `build_s2.py` regenerates them is Unverified. |
| 5 | **Two rule conflicts block the proposed collaboration and baseline.** (a) AIW-D213 (17 Oct) allows local commits; AGENTS.md (same day, later) forbids them; no decision row reverses D213. (b) NEXT names Codex as validator; AGENTS.md and README record that the Codex reviewer stopped and the separate Claude checker continues. | Founder questions Q2 and Q4 (§12). |

**Recommended starting point:** take the new Drive snapshot and code capture, settle the order of work with the one-pager acceptance (Q1), then build the baseline. Nothing in the prototype should start from 13 October requirements.

---

## 3. Confirmed scope, proposals and open questions

### 3.1 Confirmed (cited)

| Item | Evidence |
|---|---|
| Solution 1 is the active problem; Problem 2 stays parked and separate | `ai-workers/README.md` §2 M0; folder `CLAUDE.md:9` |
| Problem: every combination is set up by hand; aim: AI drafts each combination's configuration once, people release it, facts asked once, rules fill every form and portal | folder `CLAUDE.md:9`; `s3_data.py` `PROBLEM`, `ANSWER` (lines 12–21) |
| Full scope stands; **no proof-of-concept framing**; the setup example is a set of at least ten combinations | AIW-D222 (`decisions.md:266`) |
| A real read of IMM 1295, 5707, 5409, 5476 and the checklist, with AI matching scored against a hand-checked answer key; download of those PDFs approved | AIW-D229 (`decisions.md:274`) |
| Case-time filling uses saved form field maps that AI generates once per form edition; combinations reuse them; people review new or uncertain items | AIW-D233 (`decisions.md:278`); `s3_data.py` activity 3.2 rules |
| Barcode (XFA) forms: write the confirmed values into the form's own data; a person opens it in Adobe Reader and presses Validate; the product never makes a barcode | AIW-D211 (`decisions.md:255`) |
| The approved order after one-pager acceptance: bounded official-form inventory and measured matching → walkthrough → detailed pack, workbook, sketches, expected-behaviour prototype → checks | `NEXT.md:31–36`; `playbook/solution-delivery.md:42` |
| The planned expected-behaviour prototype uses sample data and labelled simulated AI, with no production claim | `delivery-control.md:38` |
| The example family: Client A applies for a work permit from outside Canada with a common-law partner and one child aged 9 | `s3_data.py:74–76` |
| The proof scope already separates what the real read proves (inventory, matching) from what it does not (writing and Validate, final-file read-back, portal, provider run, historical comparison) | `s3_data.py` `PROOF_SCOPE` (line 1487) |
| Access: local only, no remote writes; publishing needs the founder's yes each time; only the Lead writes shared files; the checker writes one verdict line | `AGENTS.md:17, 26, 32`; README §1 |
| Versions: preserve prior HTML, builder and styles; content-level preservation, not section counts | `AGENTS.md:13` (AIW-D203) |

### 3.2 Requested now by the founder, not yet a recorded decision

The working, configuration-driven prototype; two combinations; peer working; the preservation and change procedure; the evaluation of OpenSpec. Recorded as **AIW-D246** (19 Oct 2026), an **explicit change to the D229/D232 order**, because a working prototype was not in that order. Reason: `solution-delivery.md:42` says the pattern is "not permission to reorder an approved plan".

### 3.3 How the new prototype relates to what was already planned

| Planned step (D229/D232) | Relationship to this prototype |
|---|---|
| 1. Bounded official-form inventory and measured matching | **Absorbed** as milestones P1–P2. The real read and the answer-key score are the first thing the prototype does. |
| 2. Walkthrough (≤7 slides) | Unchanged; can later cite the prototype's evidence. |
| 3. Detailed pack, workbook, sketches, expected-behaviour prototype | The **working** prototype replaces the expected-behaviour prototype for the two combinations it covers; everything else stays planned. |
| 4. Cross-artifact checks, validator, founder review | Unchanged; the prototype adds its own trace and evidence. |

### 3.4 Words I did not infer

- PQR and SQR are used exactly as the spine defines the views (activity 3.7, `s3_data.py`); their expansion is not stated in the files I read, so I do not expand them.
- "SA-1B" means the team's SA-01B configurator requirement (folder `CLAUDE.md:9, 30`).
- "Staff working view" is the spine's term (3.7: "the full set, every tier, by library section").
- The request's "relevant checks" is read as the spine's field and consistency checks (3.8) and structure checks (4.1). If it means more, that is Open.

---

## 4. Existing-workspace findings, with evidence

### 4.1 Gates and outstanding work (acknowledged; not closed by this proposal)

- **Next outcome in NEXT:** "Codex rechecks R-M1 and R-m2 on the exact draft 4.3 revision; then the founder decides acceptance" (`NEXT.md:13`).
- **Accepted spine:** "None recorded here" (`delivery-control.md:8`). **Next artifact gate:** "Not released by this setup" (`delivery-control.md:77`).
- **Current revision:** draft 4.3, HTML SHA-256 `124df0a2…8445` (`delivery-control.md:11`); I re-hashed the file today: match.
- **Open items:** closing a case with a filing open (team); the 8.5 hand route beyond waiting for a mapping (founder); approval withdrawal at suspicion (team); hosted link still serves draft 4.2; the official-PDF folder `inputs/ircc-forms/` is empty; the input-as-data boundary (S11) and the ten-combination example set (`NEXT.md:21–29`).

### 4.2 Freshness (run today, 19 Oct 2026, 06:15 UTC)

| Evidence | Result | Label |
|---|---|---|
| `tools/freshness.sh` | `ERv2-sanitized@b48e4ce` vs live dev `fb76410` (2026-10-19 04:42 UTC): **STALE**; `ERv2-frontend@85623d4` matches dev; `expat-ready-api`, `expat-ready-ui` match main; exit 1 | Code **Unverified** |
| Drive search, files modified after 18 Oct 00:00 UTC (read-only) | At least 30 requirement files changed, including SA-01B v1.5 (18 Oct), `SA-01B-REDESIGN-DECISIONS_2026-10-18.md`, AG-07 v3.0, AG-08 v1.10, AG-09 v1.13, AG-17 v0.10, SA-01 v2.7, SA-06 v3.10. Files sit under several different parent folders, so which folder is the current master is itself Unverified | Requirements **Unverified (stale)** |
| `delivery-control.md:20` ("all 51 live metadata records match", 18 Oct) | Superseded by the result above | Historical |

I read one new Drive file because it bears directly on the prototype: the redesign record. I did not snapshot it (that is milestone P0). Its own status line says it is "Not the SA-01B rewrite; it is the input to it". Relevant content (roles only; quoted words exact):

| Redesign record item | Spine behaviour it conflicts with or extends |
|---|---|
| Decision 1: "AI drafts; people can always add or correct anything by hand" | Spine 1.3 "no second, manual authoring mode" |
| Decision 5: the case officer confirms all data on one screen, presses Autofill, fixes on the form; optional feedback | Spine 8.1 per-fact verification; 8.4/10.4 "fix the fact, never the field" |
| Decision 5b: a fix on a form updates the client's answer for the case | Spine's fact-first correction route |
| Decision 4: Validate and barcodes inside the product | AIW-D211 (Adobe Reader, a person presses Validate) |
| Decision 7: only a failed form Validate stops staff; everything else warns | Spine hard blocks |
| "Settled elsewhere": the specialist holds the Content publisher role, no seventh role | Spine's proposed separate SME role (5.2) |
| Proof of concept: "one combination (work permit, outside Canada, a family of three) with the first forms; plus one points-based programme with stages" | Matches the spine's Client A example; conflicts in framing with AIW-D222 |
| Trial form list: IMM 1295, IMM 5257, "the family-information form (IMM 5645 or 5707 — expert decides)", IMM 5409, IMM 5476 | AIW-D229 names IMM 5707; IMM 5257 and IMM 5645 are not covered by D229's download approval |
| "Every mapped form gets an answer sheet from day one" | Not in the spine as a baseline view |

Under the truth order (`AGENTS.md:15`) a team source ranks first, but "a conflict between a team source and a founder decision is recorded and goes to the founder; this order never settles it". I am not settling any of these.

### 4.3 The specification's authoring home and build

| Item | Evidence |
|---|---|
| Authoring home: `s3_data.py` (content and rules), `s3_views.py` (diagram layout), `s3_terms.py`, `s3_panels.py`; builder `build_one_pager.py` | `delivery-control.md:10` |
| The builder also embeds `illustrations/actor-handoff-demo/bpmn-viewer-18.16.0.min.js` | `build_one_pager.py:15, 1649` |
| **Hidden dependency:** a rebuild in an isolated scratch copy reproduced the HTML byte for byte (`124df0a2…`), then failed when the ledger step read `archive/ai-workers/s3_data-v3-draft1-2026-10-17.py` | scratch rebuild today |
| **Side effect:** each build rewrites `checks/one-pager-detail-panels-preservation-2026-10-18.md` | `build_one_pager.py:1912`; PROGRESS 2026-10-19T03:49:06Z |
| Rule-prefix convention in the data: `R|` team requirement, `F|` founder decision, `G|` build gap, none = proposal | `s3_data.py:6` |
| 41 activities with stable IDs 1.1–10.4; six records; per-activity fields include `rules`, `exceptions`, `traces`, `accept`, `example` | `s3_data.py` `ACTS` (from line 254) |
| Browser checks import Playwright from the Codex runtime cache (`~/.cache/codex-runtimes/...`), not a project-local install | `check_one_pager.cjs:4` |
| No PDF library is installed (`pypdf` import fails); Node v22.23.2; Python 3.14.0 | checked today |

### 4.4 Safeguards and records

| Item | Evidence |
|---|---|
| Snapshot list omits the one-pager, `tools/s3/*`, `delivery-control.md`, folder README | `tools/snapshot.sh:11–23` |
| The problem-1 folder is untracked in git (`??`) | `git status` |
| The commit prohibition is not enforced in settings: `permissions.deny` blocks push, PRs and issues, not `git commit` | `.claude/settings.json` |
| Missing v2 files: listed at `delivery-control.md:34–38`, `README.md:71`, folder `CLAUDE.md:29, 63`; not on disk; only two snapshots of the v2 page exist (`archive/ai-workers/snapshots/solution-1-pathway-setup-to-form-filling@f69178cfe4-…`) | `find`; `MOVES.md` |
| Stop hook requires a PROGRESS line whenever a work file changes | `tools/stop-check.sh:13–20` |

---

## 5. The prototype objective, bounded

### 5.1 What the first demonstration proves, and what it does not

| Proven by actual execution (when evidence exists) | Not proven; labelled in the prototype |
|---|---|
| Every field of each chosen form edition is inventoried | Government submission |
| AI drafts the configuration from the official sources, every item citing its source passage | Barcode validity or acceptance by IRCC |
| People review and release it; the release is versioned and hashed | Portal operation and portal terms |
| The PQR view, SQR and staff working view are **generated from the released configuration** (a configuration change changes the screens with no code change) | AI performance at scale, cost or latency |
| Synthetic answers are collected per person through those screens | Production security, privacy, AI data region |
| Form fields are populated from verified facts with the right person, relationship and repeated row, and read back | Legal correctness (no counsel) |
| A changed source propagates to the affected configuration and views | Historical comparison with real filed cases |

**Proposal: name it "working prototype, first demonstration"**, not a proof of concept (AIW-D222). It does not cut scope: the ten-combination example set and every spine activity stay in the specification, marked "Not in this demonstration" where they are not built.

### 5.2 Combination 1 (Proposal)

**Work permit applied from outside Canada; Client A, a common-law partner and one child aged 9.** It is the spine's own example (`s3_data.py:74–76`) and the team record's proof combination.

| What it exercises | Why it matters |
|---|---|
| Several people, roles and relationships on one case | Person and relationship selection on fields about others |
| A repeated row (children; addresses; travel or employment history) | Repeated-row mapping, the known code gap (`spine-masters.ts:169–175`, Unverified until new capture) |
| A conditional form and condition-driven documents (Assumption: IMM 5409 applies because the union is common-law) | Conditional forms and documents |
| One form completed per person who must complete it, and one about others | `CASE_TYPES` "Forms and mappings" row |

Candidate forms, chosen by the Lead from official sources and the P0 coverage table (D246); production use still needs the specialist (D50): IMM 1295, the family-information form (IMM 5707 per D229, or IMM 5645 per the team record), IMM 5409, IMM 5476, plus the official document checklist and instruction guide for the combination.

### 5.3 Combination 2 (Proposal; Q6)

**Recommended: a visitor visa applied from outside Canada (IMM 5257) for a member of the same family.**

| Reuse it demonstrates | Meaningful difference |
|---|---|
| Family-information form and IMM 5476 maps reused unchanged, with no second review of approved, unchanged items (D233) | A new main form with its own fields and edition |
| Identity, family and history facts already verified for Client A's family reused per fact | A different checklist and guide; different documents and conditions |
| Shared canonical fields and sections from the library | The library grows only by the fields IMM 5257 adds |

**Alternative:** the team record's "points-based programme with stages". It needs a scoring engine, stage model and reference tables that are not in the spine; it would make the second step a design exercise rather than a reuse test. Recommended for later.

### 5.4 Inputs needed before work starts

| Input | Source | Status |
|---|---|---|
| Current official PDFs: IMM 1295, 5707, 5409, 5476 | canada.ca | Download approved (D229); not yet downloaded (`inputs/ircc-forms/` empty) |
| IMM 5257, IMM 5645 (if chosen) | canada.ca | **Needs the founder's yes to download** |
| Document checklist and instruction guide for each combination, with edition dates | canada.ca | Needs identification and download approval |
| The answer key: which forms and documents apply per person, conditions, and the expected value of each mapped field for the synthetic family | The Lead, from official government sources only, each value citing its passage (D246) | **Agreed (D246).** Labelled exactly "Lead-verified from official sources (prototype only); not specialist-confirmed". Prepared and checked separately from configuration generation (§8). Production values still need the specialist (D50) |
| A synthetic family with two variants (common-law and married; a child and no child) | Lead drafts from `s3_data.py` FAMILY | Proposal |
| New Drive snapshot and code capture | Existing procedure | Needed first (P0) |

---

## 6. Recommended workflow and tool choice

### 6.1 Comparison

| | **A. Existing playbook + minimal build/test support** | **B. A + project-local OpenSpec trial** |
|---|---|---|
| Specification home | `s3_data.py` stays the one authoritative home; HTML regenerated | OpenSpec keeps specs as Markdown under `openspec/specs/` and change folders under `openspec/changes/`. Used fully, that is a **second, independently editable specification** (violates the no-duplication rule); used only for change folders, most of its value is the template and a validate command |
| Change records | Existing pattern: a correction record per revision in `checks/` plus a generated content ledger (`correction_4_3_ledger.py`) | Change folder with proposal, tasks and delta requirements; would need to be cross-referenced to s3 IDs and the ledger anyway |
| Setup cost | Low: pin two dependencies (a PDF library, Playwright) project-local; one manifest script; one trace register | A's cost plus Node package install, its generated agent instructions or skills in the project (an instruction change), and learning its conventions |
| Maintenance | One more script and one register | Two change vocabularies to keep in step |
| Conflicts with local rules | None | Its default flow assumes it owns the spec and archive step; any generated agent instructions would sit beside AGENTS.md and CLAUDE.md and must not override them |
| Verified facts about it | — | npm `@fission-ai/openspec` latest is **1.14.3**, published 2026-10-17 01:53 UTC; requires Node ≥ 20.19.0 (checked today with `npm view`). Feature descriptions above come from general knowledge and its public README, **not verified against 1.14.3** |

**Recommendation: A.** The workspace already has one specification home, correction records, ledgers and an append-only decision register; the gap is not a missing change format but (1) a baseline the snapshot hook does not cover, (2) no trace from requirement to code to executed evidence, and (3) fragile test dependencies. OpenSpec does not address those three.

**Small trial to test the recommendation (optional, half a day, in the scratchpad, not the project):** take the first real specification correction the prototype produces, record it once in A's format and once as an OpenSpec change (pinned 1.14.3 via `npx`, nothing written to the project). Compare: did either miss any of the six required fields (§7.3)? Which needed duplicated text? Which could a fresh session resume from faster? Adopt OpenSpec only if it records the correction with less duplication and no missing field.

### 6.2 Practices borrowed (not frameworks installed)

| Practice | From | Gap it closes |
|---|---|---|
| Write the failing test from the acceptance scenario before the code | Superpowers (test-first discipline) | A checkbox or generated test claimed as evidence |
| Tasks small enough to finish in one fresh session, each with its own done-evidence | GSD Core | Long chats that lose state |
| A single short "rules of the project" document the agent must obey | Spec Kit's constitution | Already met by AGENTS.md; nothing to add |
| Not adopted: role personas (BMad), standards packs (Agent OS), unattended loops (Ralph), per-task automatic commits (GSD) | — | Overlap with existing roles and files, or conflict with the no-unattended and no-commit rules |

Descriptions of these frameworks are from general knowledge; none was installed or re-checked today.

### 6.3 Technology for the prototype (Proposal; routine and reversible)

- **Engine and tests:** Python, already used by every builder; `pytest` only if it adds value over plain asserts.
- **PDF:** one library, pinned, in a project-local virtual environment. `pypdf` reads AcroForm fields and can reach an XFA form's data packet; whether it writes XFA data without breaking the usage-rights signature is **Unverified** and is tested in P1. If it fails, the D211 fallback (a data file the person imports) is used and labelled.
- **Screens:** static HTML and JavaScript that load the released configuration JSON at run time and render from it; served locally. No framework.
- **Browser checks:** Playwright installed project-local and pinned, replacing the Codex-cache path.
- **AI drafting:** run by Claude Code in the session, with the exact prompt, inputs, model and output hash recorded, and the output saved as a draft configuration file. It is labelled "AI-drafted, offline session run". A run on a provider's interface stays the team's step (`PROOF_SCOPE`, "Provider run"). Reason: no API key handling, no AI data-region question (an open conflict), and a reproducible record.

---

## 7. Baseline and surgical-change procedure

### 7.1 Baseline B0 (before the first implementation edit)

Folder: `archive/ai-workers/solution-1-v3-draft4.3-prototype-baseline-<date>/`, following the existing archive pattern (`delivery-control.md:14`).

Contents, each with SHA-256 in `manifest.sha256` and a short `README.md` (date, purpose, reproduction command, tool versions):

| Group | Files |
|---|---|
| Generated output | `solution-1-one-pager.html` (`124df0a2…`), `tools/s3/publish/solution-1-one-pager.html` |
| Authoring home | `s3_data.py`, `s3_views.py`, `s3_terms.py`, `s3_panels.py`, `s3_ledger.py`, all `*_ledger.py` |
| Builder and styles | `build_one_pager.py` (styles and scripts are inline), `make_publish_copy.py` |
| Embedded and hidden dependencies | `bpmn-viewer-18.16.0.min.js`; `archive/ai-workers/s3_data-v3-draft1-2026-10-17.py` (needed by the ledger) |
| Checks | all `tools/s3/check_*.cjs`, `read_panels.cjs` |
| Control records | `delivery-control.md`, folder `CLAUDE.md` and `README.md`, `NEXT.md` |
| Environment | Python and Node versions; Playwright version and path; the freshness result and Drive snapshot name used |

**Acceptance of B0:** a rebuild from the archived copy alone, in an isolated folder, produces the same HTML hash. Today's scratch rebuild already shows the HTML part reproduces; the ledger part needs the archived draft-1 file.

**Snapshot gap (needs the founder's yes because it changes a hook; must be resolved before any specification edit, founder, 19 Oct):** add the one-pager, `tools/s3/*.py`, `delivery-control.md` and the prototype's configuration and trace files to `tools/snapshot.sh`. The hook stays a safeguard, not acceptance evidence (`playbook/README.md:45`).

### 7.2 The prototype working edition

- **Amended by the Q5 answer:** the originally accepted authoring files and HTML are preserved unchanged (in place and in B0). Corrections go into a **prototype working version**: a copy of the authoring home (Proposal: `tools/s3-working/`) that generates `solution-1-one-pager-working.html`. From the moment it is created, the working version is the **only editable** specification. The original stays frozen as the accepted reference, so no two editable copies exist. When the founder accepts a working revision, it replaces the original under the AGENTS.md version rule. The rest of this subsection applies to the working version.
- **One specification, two views.** The working version's `s3_data.py` is the only place behaviour is written. A new small data file, `tools/s3/s3_coverage.py`, is **generated from the trace register** (§8) and maps each activity ID to: Implemented and verified · Implemented, not verified · Simulated · Not in this demonstration · Blocked. The builder gains an edition switch that renders the same content with a coverage badge and evidence link per activity: `solution-1-one-pager-prototype-edition.html`. The reading edition stays as it is.
- Nothing is deleted from the working edition: deferred activities, explanations, examples, rules and exceptions remain, marked "Not in this demonstration".
- Every prototype release names its specification revision (HTML hash and `s3_data.py` hash) on its own start screen.

### 7.3 One correction, step by step

1. **Record** the correction in the revision's correction record in `checks/` (existing pattern) with: the problem and its evidence; the exact affected IDs and source wording; the proposed replacement or addition; the reason and any decision required; the affected code, tests, examples and views; what is retained, moved, changed or removed.
2. **Classify** it (§9.3). A product change or source conflict stops here for the founder.
3. **Check the baseline has not moved:** the current hash of every file the patch touches equals the hash recorded when the correction was drafted. If not, stop, re-read and redraft.
4. **Patch** the authoring source minimally (only the named strings or fields); no layout or prose sweep.
5. **Regenerate** the HTML and the prototype edition; never edit generated output.
6. **Prove preservation at content level:** the revision's ledger script compares every string of the previous revision with the new one and dispositions each (shown, merged, clarified, moved, removed with reason). Pass condition: every difference maps to a recorded correction; zero unexplained removals or meaning changes.
7. **Re-run** the affected tests and browser checks; record results with the new hashes.
8. Log one line in PROGRESS; update the revision row in delivery control.

---

## 8. Minimal file map

| Need | Home | New? |
|---|---|---|
| Method | `playbook/solution-delivery.md`; a short "working prototype" subsection added only after the founder agrees | Existing |
| Decisions | `decisions.md` (append-only) | Existing |
| Artifact versions, audit, acceptance | `delivery-control.md`: one new artifact row "Working prototype" and its revision pointer | Existing |
| The one next outcome | `NEXT.md` | Existing |
| Events | `PROGRESS.md` | Existing |
| Behaviour (the specification) | `tools/s3/s3_data.py` and siblings | Existing |
| **Task, trace and status** | `problem-1-…/prototype/trace.csv`: one row per task: task ID, activity or rule IDs, acceptance scenario IDs, status, writer (lease), evidence path, specification hash, last updated | **New: no existing record links requirement → code → executed evidence** |
| **Expected results (answer key)** | `problem-1-…/prototype/expected/` one file per combination: per person, the forms, documents, conditions and expected field values, each labelled exactly "Lead-verified from official sources (prototype only); not specialist-confirmed" (D246) and citing its official source passage. **Separate from configuration generation:** the key is prepared in its own task and files and checked by the peer reviewer against the cited passages before any AI drafting run is scored. The drafting run never reads it, and the key is never derived from the draft configuration or the prototype's output. A change to the key needs a new official-source citation, a recorded reason and the peer reviewer's check | **New: the D229 answer key has no home yet** |
| Prototype code, configuration and screens | `problem-1-…/prototype/` (`engine/`, `config/draft/`, `config/released/`, `screens/`, `tests/`) | New folder for the deliverable |
| Test runs, screenshots, preservation ledgers | `checks/prototype-<revision>-evidence/` | Existing pattern |
| Coverage view data | `tools/s3/s3_coverage.py`, generated from `trace.csv`, never edited by hand | New, generated |
| Official inputs | `problem-1-…/inputs/ircc-forms/` with a manifest (edition date, URL, hash, download date) | Existing folder |

**Statuses in `trace.csv`:** Pending · In progress · Implemented · Verified · Blocked · Accepted. "Verified" requires an evidence file produced by an actual run against a named specification hash. "Accepted" is set only from a founder acceptance recorded in `decisions.md`. Status lives only here; delivery control and NEXT link to it rather than copying rows. Automatic memory remains supporting context only.

---

## 9. Peer working and review agreement

### 9.1 Separate formal-review session (agreed, D247)

**D248 execution clarification:** Codex coordinates review for now; the founder relays handoffs. A reviewer context started separately from the maker may continue until the existing checkpoint, unreliable context or independence requires a fresh session. Use [autonomous-delivery.md](../../playbook/autonomous-delivery.md) and the current README §1 for this assignment and handoff; the founder need not open a new reviewer chat at every milestone. This amends only the session-start instruction below, not reviewer independence or founder acceptance.

Contributors may propose, investigate, challenge and review as peers; this does not require three sessions. **Minimum: the maker plus one separate fresh formal-review session.** The founder chooses Claude Code or Codex and starts that session from the maker's copyable handoff prompt, or explicitly authorises fresh delegated review. The formal checker did not author the revision, reads saved files without inheriting the maker's chat, and records session identity, exact revision, scope, evidence, findings and verdict. A separate computer or remote host is unnecessary. The maker cannot self-certify and founder acceptance remains separate. Optional peer input adds no mandatory review stage. Role/write rules and bootstrap prompts have their home in `ai-workers/README.md` §1 and `AGENTS.md` (D247). Claude Code stays maker; prototype write leases remain a separate, unapproved instruction amendment.

### 9.2 Instruction amendments and status (D247)

| Item | Current status |
|---|---|
| Prototype contributor write leases | Still proposed: a named contributor may write only explicitly assigned prototype files; no new maker-file write authority follows from being the checker |
| Formal-review instructions in AGENTS.md and README §1 | D247 applied: separate fresh Claude Code or Codex checker, explicit handoff, recorded review evidence; no mandatory third peer session |
| Current reviewer assignment | The founder assigned fresh Codex context `/root/formal_checker_draft43` for the targeted draft 4.3 check; review status remains in delivery control and NEXT |
| `tools/snapshot.sh` file list | Add the active specification and prototype files (§7.1) |
| Local commits | Settled by D246: none, local included; D213 superseded |

### 9.3 How work moves

| Question | Answer |
|---|---|
| **Dividing work** | One task = one observable behaviour for one combination, small enough for one session, touching a named set of files. Example: "map Client A's partner's date of birth on the family-information form to the partner's fact, row 2". |
| **Ready to build** | The row names its activity or rule IDs, the acceptance scenario, the expected result (with its confirmation status), the files it touches with their current hashes, and the writer. No source conflict is open on those IDs. |
| **Done (evidence)** | A test written before the code fails, then passes on a run whose output file records the specification hash, configuration hash and code state; browser and visual evidence where the behaviour is on screen; peer review noted. A ticked box, a generated test that was never run, or a passing build is not evidence. |
| **Defects and findings** | Implementation defect: fix the code; never change a requirement or expected answer to make a test pass. Specification gap: the Lead proposes a correction (§7.3); business meaning goes to the founder. Source conflict: recorded, goes to the founder. Proposed product change: goes to the founder. An expected answer changes only through the answer-key procedure (§8): a new official-source citation, a recorded reason and the peer reviewer's check; never because a test failed. |
| **When the founder is needed** | Any business or product behaviour; a conflict between team sources and founder decisions; scope or order changes; milestone acceptance; publishing; downloads beyond those approved; installing dependencies. Not needed: code structure, file layout, test tooling and other reversible design choices, which the Lead reports. |
| **Fresh-session resume** | The SessionStart hook loads README and NEXT. Then: read `trace.csv` rows that are In progress or Blocked; verify the B0 and current revision manifests; check that every In-progress row's files still match the hashes recorded at its start; re-run the fast test suite; continue the one outcome NEXT names. |
| **Interrupted or failed work** | An In-progress row whose writer is not active, or whose files no longer match its start hashes, is reconciled before anything else, **without discarding work**. (1) **Preserve first:** copy every affected file as it is now, with hashes, into the task's recovery folder. (2) **Inspect:** compare each file with the task's start manifest and sort every change by owner: this task (its named files and stated behaviour), another lease, the founder, a hook, or unknown. (3) **Decide per change:** keep task-owned changes that are complete and match the task. Revert only changes **confirmed** to be task-owned and wrong or incomplete, by reversing those specific changes, never by restoring whole files. Leave changes owned by others, or of unknown ownership, untouched and record them; unknown ownership goes to the founder. (4) **A failing test alone never triggers a revert:** first diagnose whether the fault is in the task's code, the test, the answer key or the environment. (5) Set the row to In progress (resumed) or Pending, with a note listing what was kept, reverted and left untouched, and where the preserved copy is. Never resume on an unexamined partial edit. Before a bulk edit, copy the affected files (concurrent-session lesson, 13 Oct). |

No scheduled, unattended or parallel execution is assumed.

---

## 10. Milestones with observable acceptance

| # | Milestone | Observable acceptance |
|---|---|---|
| **P0** | Readiness | New Drive snapshot and code capture; updated conflict list; founder answers to Q1–Q6; B0 archive with manifest, rebuilt in isolation to the same hash; official PDFs and checklists downloaded with an edition manifest; pinned project-local tools; `trace.csv` and `expected/` created; spec-to-prototype decision recorded |
| **P1** | Real read of combination 1's forms | For each form edition: page-by-page list of every field, heading and script, with counts; whether each is a fillable PDF or a barcode (XFA) form; whether the PDF library can write and read back that form's data without breaking it. Unresolved fields listed by name |
| **P2** | AI-drafted configuration, combination 1 | Draft configuration file: canonical fields, sections, form field maps (with person, relationship, row), collection settings, document requirements, conditions, checks; every item cites its source passage. Structure checks pass. Matching scored against the answer key: matched, mismatched and unresolved counts |
| **P3** | Review and release | A review screen that loads the draft and shows each new or uncertain item beside its source; a person approves or corrects; release writes a versioned, hashed configuration. Recorded in a browser run with screenshots |
| **P4** | Generated views | PQR view, SQR per person and staff working view rendered from the released configuration. Test: change one field in the configuration and re-release; the views change with no code change |
| **P5** | Collect and populate | Synthetic answers entered through the SQR in a browser; facts confirmed in the staff view; forms populated; values read back and compared with the answer key; unresolved and hand-completion fields listed |
| **P6** | Combination 2 (reuse) | Counts of reused fields, sections and maps vs new ones; unchanged approved items are not re-reviewed; the differences appear in the generated views and forms |
| **P7** | Change and failure paths | A changed source (a new form edition or checklist fixture) flags only the affected items, re-drafts them, asks review only for the changed ones, and updates the affected views; the major failure paths in §11 pass |
| **P8** | Matched specification and handover | Prototype edition regenerated from the trace; correction records and content ledgers complete; formal checker verdict; fresh-session recovery demonstrated; founder acceptance recorded in `decisions.md` |

Each milestone ends with one visual the founder can show (README rule 2), and a checkpoint.

---

## 11. Proof: independently checked expected results

| Area | Expected result | How checked | Expected values from |
|---|---|---|---|
| Field coverage | Every inventoried field is mapped, marked "not filled by design", or listed unresolved; none silently dropped | Automated count reconciliation | Real read |
| Person, relationship, row | Partner's and child's facts land in the right fields on forms about others; repeated rows in order; reusing a definition never merges two people's values | Automated, against the answer key | Answer key: "Lead-verified from official sources (prototype only); not specialist-confirmed" (D246) |
| Shared-field reuse | Combination 2 reuses combination 1's canonical fields and maps; a fact verified once is not asked again | Automated counts and browser run | Lead, from the configuration |
| Conditions | Common-law adds IMM 5409 and its documents; married instead adds the marriage document; no child removes child items | Automated, on both family variants | Answer key: "Lead-verified from official sources (prototype only); not specialist-confirmed" (D246) |
| Questionnaire and staff view generation | Views are built only from the released configuration; a configuration change alters them | Automated and browser | Configuration |
| Form population and read-back | Every populated value reads back equal to its fact; an answer-list miss is refused, overflow flagged, never truncated | Automated | Answer key |
| Failure and correction paths | Missing mapping → hand route; wrong person caught; document value conflicts with an answer → held for staff; correction re-populates only affected forms | Automated and browser | Spine rules (8.4, 8.5, 9.2, 10.4), subject to Q-conflicts |
| Changed source | Only affected items and views change; unchanged approved items keep approval | Automated diff | Fixture |
| Fresh-session recovery | A new session resumes from saved files alone and reaches the same state | A real fresh session, recorded | — |
| Visual and interaction | Desktop and phone widths, light and dark, keyboard, focus; screenshots inspected, not only scripted | Browser plus visual inspection | — |

Limits stated on every evidence page: a simulated form preview is not government submission; nothing here proves barcode validity; all client data is synthetic.

---

## 12. Decisions needed before implementation

Each will be asked one at a time with options, consequences and an example (README rule 3).

| # | Question | Lead's recommendation and why |
|---|---|---|
| **Q1** | Start the prototype before or after the founder accepts one-pager draft 4.3? | **After a short acceptance.** The recheck is narrow (`NEXT.md:15`); a baseline on an accepted revision avoids two moving targets. If the founder wants to start now, the baseline is draft 4.3 "unaccepted" and every prototype revision says so. |
| **Q2** | Local commits: does AIW-D213 still apply, or does AGENTS.md's prohibition stand? | **Founder settles it; until then, file archive plus hash manifest.** A git tag would be the cheapest baseline, but the rules conflict. |
| **Q3** | Who confirms forms, documents, conditions and expected values, and by when? | **Name the specialist before P2.** Without one, nothing about immigration values reaches Verified. *(Recommendation as first written; answered differently and superseded by D246: Lead-verified answer key, prototype only.)* |
| **Q4** | Who is the second peer contributor, and are the §9.2 instruction changes agreed? | **Codex if available, else a second Claude Code session, with the write-lease rule.** *(Original proposal; review/session distinction superseded by D247: one separate formal checker, no mandatory third peer session. Prototype write leases remain pending.)* |
| **Q5** | The team's 18 October redesign conflicts (one-screen confirmation and Autofill, warnings not blocks, Validate inside the product, manual authoring, role, region): decide before P3 and P5? | **Yes, one question each, after the new snapshot.** The prototype's screens differ materially depending on the answers. |
| **Q6** | Second combination: visitor visa (reuse) or points-based with stages? | **Visitor visa.** It tests reuse, the core claim; points and stages need design not yet in the spine. |
| Approvals | Download IMM 5257, IMM 5645 and the checklists and guides; install a pinned PDF library and Playwright project-local | Needed in P0 |

**Founder answers so far (19 Oct 2026; recorded together in `decisions.md` once all questions are answered):**
- **Q1:** "start the prototype only after draft 4.3's targeted recheck and my acceptance. Baseline on the accepted revision."
- **Q2:** No commits. AGENTS.md stands and D213 is to be recorded as superseded. Baselines are archive copies with a SHA-256 manifest, rebuilt in isolation to prove they match.
- **Q3:** No specialist dependency for this prototype. The Lead drafts the answer key from official government sources only, to the standard a licensed consultant would use. The founder wrote "RCICI"; the Lead reads it as the licensed-consultant (RCIC) standard and does not treat it as a source. Label: **"Lead-verified from official sources (prototype only); not specialist-confirmed"**. This is a prototype-only exception to D50; production values still need the specialist. The aim is that the mechanism works, not proof that a combination uses the right forms. Each value cites its official source passage, so a specialist can confirm it later without re-work.
- **Q6 (delegated by the Q3 answer):** the Lead chooses the two combinations that cover the most behaviour. P0 includes a short coverage table that scores candidates on people and roles, repeated rows, conditional forms and documents, barcode forms, and forms shared between the two. Visitor visa as the second combination remains the starting hypothesis, not a decision.
- **Q4 (historical D246 answer; review/session distinction superseded by D247):** One peer reviewer was defined as a role, not a tool, assignable to Codex or a second Claude session, with recorded session identity and proposed task write leases. It originally required a different formal-checker session for the same milestone. **Current rule:** maker plus one separate fresh formal checker (Claude Code or Codex), no mandatory third peer session; see §9.1 and README §1. Optional prototype contribution/write leases are not activated by this review-rule amendment.
- **Q5 (founder's words, condensed):**
  - First verify the latest sources, then prepare **one conflict table** showing the exact competing requirements, their consequences and a recommendation.
  - Resolve the shared decisions (review model, permissions, blocking behaviour, AI-processing constraints) before any dependent implementation. Ask one decision at a time. Defer only isolated details that cannot cause earlier work to be redone.
  - Apply agreed corrections surgically to a **new prototype working version**. Preserve the original document and authoring files, keep unaffected content, and update the specification, prototype and tests together.
  - **Neither the team's record nor the one-pager automatically wins.** Draft 4.3 is never described as accepted unless acceptance is explicitly recorded.

**Resulting order (Proposal, for the founder's yes):**
1. New Drive snapshot and code capture.
2. The conflict table.
3. The targeted recheck of draft 4.3.
4. The founder's acceptance decision, with the known conflicts listed as accepted limitations or blockers.
5. One question per shared conflict.
6. The B0 baseline, the working version, then P1 onward.

Steps 1–2 come before acceptance so that acceptance is not made on stale sources. Recheck and acceptance still precede any prototype work (Q1).

## 13. Dependencies and limits

- **No specialist dependency for the prototype (D246).** The answer key is Lead-verified from official sources, so a prototype "Verified" means "the mechanism matches the Lead-verified key", not that immigration values are specialist-confirmed. Specialist time stays on the critical path for production values (D50; the team record also names expert time as the bottleneck).
- If the PDF library cannot write a barcode form's data intact, population falls back to the D211 data-file route and is labelled; this is the main technical uncertainty.
- AI drafting quality is measured on two combinations only; it is not evidence of performance across the ten-combination set or at bulk.
- Model, prompt and source editions are recorded; a later re-run may produce different drafts. Reproducibility is of the recorded run, not of the model.
- Nothing here guarantees speed or zero errors; completion is claimed only with evidence.

## 14. Completion checklist

- [ ] Working prototype: both combinations run from released configuration; views generated, answers collected, forms populated and read back; real, simulated, incomplete and unverified behaviour labelled on screen
- [ ] Prototype release names its specification revision (HTML and `s3_data.py` hashes)
- [ ] Final matched HTML specification and prototype edition regenerated from source; no hand edits
- [ ] Preservation record: B0 manifest, every correction record, content ledger per revision with zero unexplained removals or meaning changes
- [ ] `trace.csv`: every task linked to activity or rule IDs, scenarios and evidence; statuses honest; no Verified row without an executed run
- [ ] Expected results: every value labelled exactly "Lead-verified from official sources (prototype only); not specialist-confirmed" and citing its official source passage; the key prepared and checked separately from configuration generation
- [ ] Test evidence: automated results, browser runs and inspected screenshots, each tied to hashes
- [ ] Fresh-session recovery demonstrated from saved files
- [ ] Formal checker verdict in PROGRESS; founder acceptance in `decisions.md`
- [ ] Delivery control, NEXT and README §3 updated; missing v2 file references corrected

## 15. Corrections after D246 (19 Oct 2026)

The first-written proposal is preserved whole (see the status line). These operative passages were changed to match D246 and the founder's review; nothing else was changed.

| Where | Before | Now | Why |
|---|---|---|---|
| Status line | "Status: Proposal. Nothing here is agreed" | Agreed approach recorded as D246; D246 wins on any difference | D246 recorded |
| §3.2 | Decision row "only after agreement" | Recorded as D246 | D246 recorded |
| §5.2, §5.4, §11, §13, §14 | Specialist confirmation required; Verified impossible without it | Answer key labelled exactly "Lead-verified from official sources (prototype only); not specialist-confirmed"; production still needs the specialist | D246 (4), prototype-only exception to D50 |
| §8 answer key | "Specialist-confirmed or Lead-drafted" | Exact label; prepared and checked separately from configuration generation | Founder review, 19 Oct |
| §9.3 defects | Expected answer changes only with the specialist | Changes only with a new citation, a reason and the peer's check | D246 (4) |
| §9.3 recovery | Restore whole files when interrupted work fails its test | Preserve first, inspect changes and owners, revert only confirmed task-owned changes; a failing test alone triggers no revert | Founder review, 19 Oct: restoring whole files could discard useful work |
| §7.1 | Snapshot gap is a proposal | Must be resolved before any specification edit | Founder review, 19 Oct |
| §12 Q3 row | Recommendation stood alone | Marked as superseded by D246; original wording kept | History preserved |
| Status line and §9; §12 Q4 | Mandatory peer-plus-checker distinction and Claude-specific formal checker | D247: one formal check in a separate fresh Claude Code or Codex session; maker provides exact-revision prompt, reviewer records identity and evidence; optional prototype write leases stay pending | Founder clarified reviewer-session assignment, 19 Oct |
| §9.1 review-session start | A new reviewer session at every handoff | D248: the assigned independent Codex reviewer context may continue until checkpoint, context or independence requires a fresh session; founder relays prompts | Founder assigned ongoing review coordination and autonomous maker workflow, 19 Oct |
| §6.3 technology | "Engine and tests: Python, already used by every builder"; AI drafting "run by Claude Code in the session … no AI data-region question" | Superseded by `prototype/implementation-design-2026-10-19.md`: under D220 the AI skill is TypeScript with direct provider-SDK calls and schema-validated output, no agent framework; the rules engine is TypeScript; PDF filling is chosen by a capability experiment; acceptance tests are language-neutral JSON. The Claude Code session is a consumer plan and **does not** meet D74 correction 2 / D147; a compliant route or a founder decision is needed before P2 | Founder review, 19 Oct; D220; D257 (no AI exception) |
| §5.3 combination 2 | "a member of the same family" | Client A's **mother** (adds the new-person-from-known-facts test); country of residence India; see `prototype/combination-coverage-2026-10-19.md` | Coverage comparison, P0 |

Approvals still reserved by D246 (downloads, installs, snapshot-hook coverage and prototype write leases) wait until readiness, except backup coverage, which comes before specification edits. The separate formal-review instruction amendment is now authorised and applied under D247. Change log, 19 Oct: review procedure only; original specification, product behaviour and founder acceptance unchanged.


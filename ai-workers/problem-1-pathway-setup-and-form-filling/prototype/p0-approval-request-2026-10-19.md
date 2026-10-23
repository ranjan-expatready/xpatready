# P0: approval request for downloads and one install, and the AI-drafting route

19 October 2026 · Claude Code (the Lead) · Reserved approvals under AIW-D246 (6). **Status: approved by the founder 19 Oct (AIW-D257), with additions and one correction (below).** The downloads and the pypdf install were then carried out; see `../inputs/ircc-forms/manifest.json` and `env/README.md`. Text as put to the founder is kept below. All URLs were checked with header-only requests (HTTP 200, PDF) on 19 Oct.

## 1. Downloads

All files come from canada.ca and go to `problem-1-pathway-setup-and-form-filling/inputs/ircc-forms/`, with a manifest (URL, edition, server date, SHA-256, download time). The manifest pins each file by hash. **For example, IMM 1295's server file changed on 20 Jul 2026 although its edition label still reads September 2023.**

Form PDFs are at `https://www.canada.ca/content/dam/ircc/documents/pdf/english/kits/forms/<path>`. Guide and form pages are at `https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/<page>`.

**Already approved under AIW-D229** (combination 1):

| File | Path | Edition | Server date |
|---|---|---|---|
| IMM 1295, Application for Work Permit Made Outside of Canada | `imm1295/01-09-2023/imm1295e.pdf` | Sept 2023 | 20 Jul 2026 |
| IMM 5707, Family Information | `imm5707/01-01-2023/imm5707e.pdf` | Jan 2023 | 14 Apr 2025 |
| IMM 5409, Statutory Declaration of Common-law Union | `imm5409/01-01-2023/imm5409e.pdf` | Jan 2023 | 11 Apr 2024 |
| IMM 5476, Use of a Representative | `imm5476/01-11-2025/imm5476e.pdf` | Nov 2025 | 15 Dec 2025 |
| IMM 5488, Document Checklist: Work Permit (outside Canada) | `imm5488/01-10-2024/imm5488e.pdf` | Oct 2024 | 28 Oct 2024 |

**Needs your yes:**

| File | Path or page | Edition | Purpose |
|---|---|---|---|
| IMM 5475, Authority to Release Personal Information | `imm5475/16-12-2022/imm5475e.pdf` | Dec 2022 | Listed "if it applies" in combination 1's kit |
| Guide 5487 (work permit, outside Canada), saved page copy | `guide-5487-applying-work-permit-outside-canada.html` | page 2026-10-06 | Instruction guide for combination 1's drafting run and answer key |
| IMM 5257, Application for Visitor Visa | `imm5257/01-09-2023/imm5257e.pdf` | Sept 2023 | Combination 2 main form |
| IMM 5484, Document Checklist: Visitor Visa | `imm5484/01-05-2026/imm5484e.pdf` | May 2026 | Combination 2 checklist |
| Guide 5256 (visitor visa, paper), saved page copy | `guide-5256-applying-visitor-visa-temporary-resident-visa.html` | page 2026-03-31 | Combination 2 guide; history rule (D253) |
| The form pages of each file above, saved page copies | `imm1295.html` etc. | — | Edition evidence |
| **Bounded extra:** any further form or schedule that the two downloaded checklists list as applicable to these combinations | canada.ca only | — | Avoids a second approval round; each one is named in the manifest and reported |

Not requested: IMM 5645. ~~an older family-information edition~~ **Corrected 19 Oct (founder, D257): IMM 5645 is a separate family-information form that some country packages list instead of IMM 5707, not an older edition.** For the chosen country (India), IMM 5905 E and IMM 5881 E both require IMM 5707; see `expected/README.md`. Spousal sponsorship and Express Entry files are also not requested (not chosen; see [coverage](combination-coverage-2026-10-19.md)).

## 2. Install: one Python package only

| What | Version | Why | Where |
|---|---|---|---|
| `pypdf` | **6.19.0** (16 Sep 2026; wheel SHA-256 `7e5d6e73…8d14`), installed with `--require-hashes` | Nothing on this Mac can write PDF form data. pdfplumber 0.11.10 and poppler only read. P1 tests whether pypdf can write and read back these forms' data without breaking them; that is **Unverified** today. The newest release, 6.21.1, is two days old, so it is not chosen | `Xpatready/.tools/solution-1-prototype/.venv`, made with the existing `uv` and Python 3.14.0. This is **outside every folder the backup hook copies**. Only the small lock file (`requirements.lock` with hashes) lives in `prototype/env/` |

**No browser or Playwright install.** The checks already run on the existing Playwright 1.62.1 (Codex runtime cache), driving the installed Google Chrome 155 (`channel: 'chrome'`). Their versions are recorded in the evidence. If that external path breaks, I will ask before installing `playwright@1.62.1` project-local.

No OpenSpec, no pytest install (pytest 9.0.2 is already present), no other tools.

## 3. The AI-drafting route (decide before P2, not needed for P0)

The proposal (§6.3) said running the drafting in Claude Code avoids the AI-region question. **That is wrong.**

- **What D74 correction 2 and D147 require.** Every AI call Expat Ready makes, pack drafting included, must be processed in Canada or the United States, under written no-training and zero-retention terms, never through global routing.
- **What this session is.** It runs on a **Claude Max subscription**, a consumer plan. Anthropic's published consumer terms give 30-day retention when the training setting is off, and up to five years when it is on. Training is a user setting, not a written term. No region is committed.
- **So this route does not meet D147.** D255 left row 5 open; it granted no exception.
- **What the drafting run would send.** Only public official forms and guides. No client data, and no synthetic family data.

**Routes:**

| Route | Meets D147? | Needs |
|---|---|---|
| **a. Prototype-only exception:** the drafting run uses this session on hashed public official files only, with no personal or synthetic family data in any prompt; labelled "AI-drafted in the Lead's Claude Code session (consumer plan); not the product's provider route" | No, so it is an explicit exception you would record | Your decision |
| b. A commercial route: Anthropic API with a zero-data-retention agreement, or AWS Bedrock in a Canadian or US region with an in-region model (no cross-region profile) | Probably. Terms and model availability are Unverified until checked | Account, agreement and key setup by you; key handling the proposal avoided |
| c. No AI drafting in the prototype | Yes | Defeats D246's purpose: "AI drafts a combination's configuration" |

Lead recommendation: **a**, because D147 protects client and personal data and this run sends neither. Route b stays the team's production step ("Provider run").

Sources: Anthropic, [How long do you store my data?](https://privacy.claude.com/en/articles/10023548-how-long-do-you-store-my-data); [Claude Code data usage](https://code.claude.com/docs/en/data-usage). Legal: Unconfirmed: no counsel (AIW-D94).

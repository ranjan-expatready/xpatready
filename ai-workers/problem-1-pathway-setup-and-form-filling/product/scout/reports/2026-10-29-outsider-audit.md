# Outsider audit — Pathway Configurator, main 32961d69 (29 Oct 2026)

A fresh, independent read of the merged app, written to be discussed with the founder one item at a time. Report only: no app code, rules, tools, lane files or :4400 were changed. Everything ran on an isolated copy (`isolated.sh audit 4495`, database `xr_studio_audit`) after Reset + Load sample as user-A. US$0: no model call, no live finder; only saved replays. Evidence is in `2026-10-29-outsider-audit/`: full-page screenshots (`<page>-1440.jpg`), page text (`<page>.txt`), the walk results (`walk.json`, `walk-c.json`), the code-health sweep (`code-health.md`, every item with file:line) and the scripts that reproduce each probe (`scripts/`).

**Not repeated from qa:** QA-38…QA-64 and the closed list were read first. Items here are new, or a different facet named as such.

## For the founder — the top 10, by impact

| # | Finding | Class · severity | Fix in one line |
|---|---|---|---|
| 1 | **The sample does not match the five agreed combinations.** Load sample gives 21 Retail + 8 Corporate combinations, not 5 + 1 (P-108). The one Live combination, "With an LMIA", is set up as an **outside-Canada IMM 1295** application, while P-112 says "With an LMIA – inside Canada (IMM 5710, not IMM 1295)". Study permit has no "Outside Canada"; PNP and spousal names differ from P-112. To review is **empty** after Load sample: the AI proposals people should accept (P-108) are not there, so the demo loop cannot be shown. | (c) W1-11 / S7, plus (b) P-112 for the Live row · **Major** | Treat as one S7 acceptance test: after Load sample the five P-112 trails exist, IMM 5710 is on the LMIA row, and To review lists replayed proposals. |
| 2 | **A client can make a filled PDF, and anyone can download it.** As Client A (`x-actor: user-P`) `POST /combinations/:id/fill` returned **201** and a filled IMM 1295; its `/artifacts/:id/file` downloads with **no person at all** (200, 939 KB PDF); so do official sources (`/attachments/:id/file`). The response also carries the server's absolute file path. | (a) STANDARDS §6 deny by default · **Major** | `need(actor,"case")` (or author) on fill; artifact and source downloads need a known staff person; never return server paths. |
| 3 | **Double submit leaves a ghost submission.** Three submits at once all answered 201; after release one row is still `SUBMITTED` for ever. One sign-off sent twice is recorded twice. No database rule stops either. | (a) STANDARDS §4 idempotent creates · **Major** | One transaction + partial unique index "one SUBMITTED per combination"; unique (submission, item, person) on sign-offs. |
| 4 | **A combination can be renamed outside Program structure.** `PATCH /combinations/:id {label}` (author) renamed the Live combination: its page header showed the new name, while Program structure, Immigration programs and the case dialog kept the old one. P-125 (3): nobody changes the place in setup. | (a) P-125 · **Major** | Drop `label` from that endpoint (names change only on Program structure); one name source. |
| 5 | **A released setup holds calculations that are never run.** Review and release on the Live combination lists 6 derived fields "recorded, never evaluated" (for example spouse count, employment gap months, passport expiry years) as *warnings*; the release went through. | (b) STANDARDS §3.6 ("no hidden field a form or rule needs") · **Major** | Error when a form field or rule reads an unevaluated calculation; warning only when nothing reads it. |
| 6 | **The database does not protect released work.** Deleting a combination cascades to its releases; deleting a library form cascades to every combination line, released ones too; the P-103 duplicate rule (number + edition + checksum) is not a unique key; review records have no foreign keys. Only service code stands in the way. | (b) STANDARDS §3.4, §3.7 · **Major** | `onDelete: Restrict` on releases and form lines; unique (form, edition, sha256); foreign keys on review tables. |
| 7 | **Writes are open by default; bodies are not checked.** The global guard checks reads only (`core.ts:80`); each write relies on its service remembering `need()`. About 25 write routes take `@Body() b: any`. Probes: `label: 123` → **500**; unknown fields → 200 and silently ignored; `conditions/check` with nonsense → 201 `{"errors":[]}`. | (b) STANDARDS §6 · **Major** | Guard denies writes unless the route declares its duty; a zod contract on every body. |
| 8 | **Two written rules disagree on how much engineering to build.** STANDARDS §1 requires Vitest, helmet, throttling, a worker for background jobs, OpenAPI, pino, i18next; PRODUCT §1 (P-26) says build "only what the proof needs; anything the team will harden is not built". Today none of the §1 items exist and PDF filling runs Python inside the web request (180 s). | (d) · **Major** (decides how many engineering findings are real) | Founder picks: either mark those STANDARDS lines "[team]" or schedule them; then the checkers stop judging against both. |
| 9 | **The test harness cannot catch type errors, dead code or flakiness.** No test runner, no lint, no `tsc --noEmit` in CI (tsx strips types); the 28 qa scripts in `tests/qa/` never run in CI (`run-suites.sh:64` only picks `tests/check_*`); one suite failed in this run with a fetch header timeout while other lanes loaded the Mac. | (b) STANDARDS §7 · **Major** | Add `tsc --noEmit` and the qa folder to CI now (no install); then the tools in Part 3. |
| 10 | **Screens contradict themselves on Visitor visa.** Card: "2 forms found · 1 ready to add · 1 needs a draft"; Forms tab: "No form find yet"; "In the library" is shown only on IMM 5707 while the library lists IMM 5257 as Ready for 2 combinations; the header said "1 draft change" while the review API said the draft matches the release. | (a) EXPERIENCE (one truth per screen) · **Minor–Major** | One status source per form line; "Matched" instead of "In the library"; the header count from the same diff as Review. |

## Part 1 — every finding, classified
Classes: (a) defect in merged work · (b) gap against an agreed decision or capability · (c) planned, not built (WAVE-1 row) · (d) unclear requirement · (e) documentation drift. Code references are relative to `prototype/studio/`.

| ID | Class · severity | What | Evidence | Fix (one line) |
|---|---|---|---|---|
| OA-01 | c+b · Major | Sample ≠ P-108/P-112 (21+8 rows; LMIA Live row is IMM 1295 outside Canada; names differ; To review empty) | `programs.txt`, `to-review.txt`, `GET /combinations/bbef…/preview?mode=release` → `allowed_locations:["outside_canada"]`, basis note "IMM 1295…" | S7/W1-11 acceptance test on the P-112 trails and forms |
| OA-02 | a · Major | Client generates filled PDF (no duty on fill) | `scripts/probe.log`; `POST …/fill` as user-P → 201; `fill.ts:75` | `need()` on fill |
| OA-03 | a · Major | Filled PDFs and sources download with no person; held files too | `/artifacts/:id/file` nobody → 200; `main.ts:81,94`, `screen02.ts:182` | Staff-only downloads, signed short links later |
| OA-04 | a · Minor | Fill response and errors carry absolute server paths (`/Users/…`) | fill response `report.output`; `fill.ts:66`, `sources.ts:170` | Return ids, never paths; map child-process errors to words |
| OA-05 | a · Major | Parallel submits all 201; one stays SUBMITTED after release | `scripts/release.mjs`; `review_submission`: APPROVED 1, WITHDRAWN 1, SUBMITTED 1; `studio.ts:647` | Transaction + partial unique |
| OA-06 | a · Minor | Same sign-off recorded twice | `review_signoff` rows ×2 per item; `studio.ts:675` | Unique key + skipDuplicates |
| OA-07 | a · Major | Rename via `PATCH /combinations/:id` splits the name | `lmia-review.txt` header "Renamed by audit" while structure kept "With an LMIA" | Remove `label` from the PATCH |
| OA-08 | a · Minor | `PATCH /combinations/:id {"label":123}` → 500 | probe | zod contract |
| OA-09 | a · Minor | Unknown or wrong fields → 200 silent no-op (`{name:123,hacked:true}`; a `channel` key on the form PATCH did nothing) | probe | `.strict()` contracts → 400 naming the field |
| OA-10 | a · Minor | `POST /conditions/check` with a nonsense rule → 201 `{"errors":[]}` | probe | Validate the rule shape; 400 |
| OA-11 | b · Major | Released setup with 6 never-evaluated calculations (warnings) | `lmia-review.txt` lines 30–45 | Error when anything reads one |
| OA-12 | b · Major | Cascades on releases and form lines; no DB unique for P-103; no FKs on review tables | `schema.prisma:963,459,306,519,310,990-1018` | Restrict + unique + FKs |
| OA-13 | b · Major | Deny-by-default only for reads; ~25 untyped write bodies | `core.ts:80`; `main.ts:43-114` | Guard on writes; contracts |
| OA-14 | b · Major | P-116 lifecycle missing on fields, sections, document types: an author retires a used field directly, no second person, no uses check | `studio.ts:429-431` | Route through `Lifecycle.propose` |
| OA-15 | a · Major | Two form-number normalisers disagree ("eIMM 5669", "IMM-5257"), so duplicate and finder matching can differ | `contracts/form-library.ts:12` vs `engine/canada.ts:51` | One normaliser with a table test |
| OA-16 | a · Minor | Name-duplicate rule exists three times (server + two web copies that differ) | `contracts/programs.ts:21`, `add-to-structure.tsx:27`, `structure.tsx:51` | Web imports the contract's function |
| OA-17 | a · Minor | Legacy structure API (`/program-nodes`, `/combinations/path`) and `/new` page still live beside `/structure/*` | `programs.ts:327,420`; `/new` renders (`new-combination-old` walk) | Remove with S3 (P-125 (5)) |
| OA-18 | b · Major | Channel picker offers all three channels while "IRCC accepts" is "Not set yet" on 7 of 8 library forms | `library-forms.txt`; `lmia-forms` select options | Offer only accepted channels; unset → "Set what IRCC accepts first" |
| OA-19 | a · Minor | Visitor visa: card says forms found, Forms tab "No form find yet"; "In the library" means "matched" | `programs.txt`, `visitor-forms.txt` | One status word set |
| OA-20 | a · Minor | Header "1 draft change" after a rename and its restore; Review API: `matches_release: true, changes: []` | pane walk; `GET …/review` | Header uses the review diff |
| OA-21 | b · Minor | Combination header trail lacks "Retail" and "No sub-category"; "Visitor visa" shown twice (P-104: full five-part trail everywhere) | `visitor-overview.txt` lines 1–6 | Shared trail component |
| OA-22 | b · Minor | Open a case lists "With an LMIA · release 1" without its trail (ambiguous once Corporate has an LMIA row) | `pane-case-aud001.jpg`, dialog | Trail + release in the option |
| OA-23 | a · Minor | Case page shows a raw role key "representative" group though no representative is on the case | `pane-case-aud001.jpg`, case text | Role label; hide roles not on the case |
| OA-24 | b · Minor | Role words drift: "Applicant", "Child (travelling)" vs PRODUCT §4 "Principal applicant", "Dependent child" | `visitor-overview.txt` | One label per role key |
| OA-25 | a · Minor | Review tab shows field keys and engine words ("case.applying_country_differs…", "Calculation other", "subject_spouse_or_partner") | `visitor-review.txt:53-60` | Labels only; keys behind a disclosure |
| OA-26 | a · Minor | "(P-95)" printed on Program structure (PRODUCT §4: no decision numbers on the main path) | `structure.txt:405` | Drop the number |
| OA-27 | a · Minor | Activity: US date format, login ids ("user-A") | `activity.txt` | Person name, en-CA date |
| OA-28 | a · Minor | A checklist (IMM 5488) sits in the Forms table with "Change", "No edition read yet" | `lmia-forms.txt` | Sources list, not form lines (P-118 Q3) |
| OA-29 | a · Minor | Acting-as list in the Studio holds only the three configuration people; officer and client reachable only through /cases | pane walk | One switcher with all five (demo chrome) |
| OA-30 | a · Minor | Labels accept markup (`<img src=x onerror=…>` stored as a Pathway name; React escapes it today) | probe (201, then 409 duplicate) | Refuse `<>` in names |
| OA-31 | a · Minor | Web bundle one 986 kB chunk (Vite warning) | build log | Route-level `lazy()` |
| OA-32 | a · Minor | Extension tables, `portalKey`, `@types/chrome` remain after P-102 | `schema.prisma:626-663`, `package.json` | Contract migration |
| OA-33 | a · Minor | Dead code: 6 web helpers, 7 API routes only tests call | `code-health.md` §F | Delete; knip in CI |
| OA-34 | a · Minor | Helpers copied ~10× (Problem Details builder, latest release, person name) | `code-health.md` §D | One module each |
| OA-35 | b · Minor | No helmet/headers (`x-powered-by: Express`, no CSP, no nosniff), no rate limit | probe | helmet + throttler (STANDARDS §8) |
| OA-36 | a · Minor | `playwright` is not declared; it arrives as a peer of `@axe-core/playwright` | `package.json`, lockfile | Declare it pinned |
| OA-37 | a · Minor | `tools/any-baseline.json` allows 433 `any`, the code has 404: 29 new ones can slip in | `code-health.md` §G | Ratchet the baseline down |
| OA-38 | a · Minor | Suite `check_ai_launch_paths` failed on a fetch header timeout while 4 lanes shared the Mac | suite log | Per-request timeout + retry in the harness |
| OA-39 | a · Minor | Merge guard hook fires on any shell command with `$VAR`, `$(…)`, loops or `{a,b}`, so explorers cannot run ordinary commands | `.claude/settings.json:84` `if: Bash(gh pr merge*)` | Match the command text inside the guard script instead |
| OA-41 | a · Major | A full suite run rewrites **289 tracked files and adds 34 new ones** in the copy: screenshots and JSON in `product/screens/*` (W1-combination-workspace 60, W1-form-library 55, 01-programs-catalogue 44, …), US$0 stub rows appended to the append-only spend ledger (`prototype/p2/ledger/spend.jsonl`), stub runs and `evidence/` reports. Screen evidence a Lead accepted is silently replaced by a later run's. A lane that runs suites then `git add -A` commits test noise into the ledger and evidence | `git status` after `run-suites.sh` on a clean 32961d69 copy | Suites write to `var/` (or `SUITES_OUT`) only; ledger path taken from the environment in tests |
| OA-40 | c · — | `/new` route, S6 one Add, S7 reset/sample, W1-10 AI drafting, W1-15 questions and documents, C11.8 run panel | WAVE-1 S3, S6, S7, W1-10, W1-15, W1-07 | As planned |

**Unclear requirements (d) — quote both sides, founder decides**
| ID | Side A | Side B | Why it matters |
|---|---|---|---|
| OA-D1 | P-123: "the person confirms the list once" | P-123 (same row): "attaches it … automatically, with no confirm step before use"; P-125 amended: finder runs "only on that click" | S3 and S5 builders can each be "right"; the Visitor visa card already says "Add 1 form" |
| OA-D2 | STANDARDS §1: Vitest, helmet, throttling, worker, OpenAPI, pino, i18next [M] | PRODUCT §1 / P-26: "anything the team already has or will harden is not built" | Decides OA-13, OA-35, Python-in-request, top 8 |
| OA-D3 | WAVE-1 rules: "Desktop only in wave 1 … 390 waits" | QA-39 and C6.2 test 390 px; the client SQR is phone-first | Which screens are phone-checked now |
| OA-D4 | P-108: "Load sample adds only the five-level structure … shared fields … arrive as replayed AI proposals" | P-123: "Load sample replays the finder and waits for Confirm"; today 164 fields arrive accepted | S7 has two specs |
| OA-D5 | PRODUCT §4 roles: Principal applicant, Spouse or partner, Dependent child, Representative | P-108 built-in roles: …Child, Sponsor, Representative, Parent; screens: "Applicant", "Child (travelling)" | One vocabulary for roles and their per-combination labels |
| OA-D6 | PRODUCT §5: "Acting as … is never ported" | STANDARDS §6: "author ≠ approver enforced server-side" — today identity is the client's header (`core.ts:47`) | The team needs a stated identity contract to port, or OA-02/03/05 recur |
| OA-D7 | Review shows "recorded, never evaluated" as a warning | STANDARDS §3.6 "no hidden field a form or rule needs" | Is a release with unevaluated calculations allowed? (OA-11) |

**Documentation drift (e)**
| ID | Drift | Where | Fix |
|---|---|---|---|
| OA-E1 | STATE lanes table: runtime "READY · MERGE S5", forms "CHECK QA-61..64", scout "Goose … 25 Oct" — the log says PR #71 and #73 merged | `STATE.md` | Regenerate from lane files after each merge |
| OA-E2 | WAVE-1 S5 row "Lead check: FIX … PR #71 holds the merge"; W1-04…W1-08 statuses "Concept" / "after S1" though S2, S4, S5 merged | `WAVE-1.md` | Status from SCREENS queue |
| OA-E3 | Menu: PRODUCT §3 "To review · Programs" and a Shared library "Rules" item; app: Program structure · Immigration programs · To review, no Rules | `PRODUCT.md` §3 vs app | Update §3 to P-125 (6) |
| OA-E4 | AI caps: PRODUCT §5 "US$100 total, US$5 per run"; Wave 1 cap US$60 (P-110); plan "about US$50" (P-131) | `PRODUCT.md` §5 | One line: cap, plan, spent |
| OA-E5 | C3.6 cites `studio.ts:253` "keys typed" (that line is now a comment); C3.7 "Not built" while library forms retire (C11.9 Partial) | `qa/CAPABILITIES.md` | qa refresh |
| OA-E6 | Registers are exempt from the 12 KB cap: DECISIONS.md is 88 KB in 100 lines (rows up to ~2,500 characters) | `tools/check-docs.sh` line 13 | Move superseded parts to `decisions/`; cap row length |
| OA-E7 | LANES scout row: "Goose on Ollama Cloud, worktree xpatready-scout"; this audit ran as Claude in `.claude/worktrees/` | `LANES.md` | Say both |

## Part 2 — what worked (so the founder knows what not to worry about)
Deny-by-default reads: 13/13 probes 401/403 with plain words. Bad bodies on structure and runtime: array, invalid JSON, 5,000 characters, blank → 400 with field words. Duplicate names under 8 parallel creates: exactly one 201. Parallel approvals: one release, two 409s. Parallel Load sample: 409. Release gate: author cannot approve, sign-off by the submitter refused, reviewer and approver queues correct. Remove from a combination → confirm → toast → Undo restored all 8 forms (`pane-remove-dialog.jpg`). Case opens on Release 1 with forms and blockers (`pane-case-aud001.jpg`). axe WCAG 2.2 A/AA: **0 violations on all 34 page states**; no sideways scroll at 1024. Warm first view 0.7–0.9 s (STANDARDS §9 < 1 s), 5–6 API calls per page.

## Part 3 — tools we do not use yet (propose, never install; founder rule)
All npm versions are the newest at least 14 days old; checksums are the registry's own integrity values. Cost is the founder's time and Mac time; all are free/open source.

| Tool | What it finds here that we miss | Cost | Exact version · official source · checksum |
|---|---|---|---|
| **No install first:** `tsc --noEmit` in CI + run `tests/qa/` in CI | Type errors (tsx strips types), the 28 qa scripts that never run | ~2 min CI | typescript 6.0.3 already pinned |
| **StrykerJS** (mutation testing) + TypeScript checker | Whether tests fail when a rule is removed (STANDARDS §7 "a rule's test fails when the rule is removed") — on `engine/` and `contracts/` first | 15–40 min a run, nightly | `@stryker-mutator/core@10.0.0`, registry.npmjs.org, `sha512-ZvMsRyaXQQ5e6Thcid9pkuODv6Fn9E3nrBQJUap+hcJuGJ4unm26afo3m6YKSjn8kinyxJ/3TXf0cTWRDaTxVw==`; `@stryker-mutator/typescript-checker@10.0.0`, `sha512-GLvC0LVd8RJ5SxR3eFcgb7DFKmw07DYtPXs942z6Qh7l6p7YBnFyd7lPw7nvA9UKEYDd22embrFmLlyC1XJjXw==` |
| **fast-check** (property-based) | Normaliser disagreement (OA-15), name rule (OA-16), age gate and role caps on random families; STANDARDS §7 [S]/[M] | Small; seconds | `fast-check@4.10.2`, `sha512-iK2f+YrcmoeGqk6fA0ea2bptcu/itMIm4NfEozq6N25+aG6h7s5HZbB/k1aV7b5w5sFLMCbbtRUsTVR+BgC3xw==` |
| **zod-to-openapi** → **Schemathesis** (contract fuzzing) | OA-07…OA-10 class across all ~159 routes: 500s, silent 200s, missing 401/403, from the zod contracts we already have (STANDARDS §6 "OpenAPI generated") | Half a day to wire; 5–10 min a run | `@asteasolutions/zod-to-openapi@9.1.0`, `sha512-pLMeRgRYS7/vZIgAAkOe2P6+XGTifR1MT9pqDoxZ11EmcJJ+DPmdPqLN8ZZF4U8R9KHCCQCS9c2wtuE8wSrfkw==`; Schemathesis 4.31.0 (PyPI wheel `schemathesis-4.31.0-py3-none-any.whl`), `sha256:12e4357ae07803e2620eff3a49ca6c7aa49bff95373b0002f12165afca523440` |
| **@playwright/test** (runner, traces, visual comparison) | Visual regression on the 34 states (layout drift between lanes), trace files for every flaky run (OA-38), retries; same engine as today | Same Playwright version, no new vendor | `@playwright/test@1.64.1`, `sha512-IaYGml/nSOiZWROfPtuIL7neuu9qDOZ3TNvNljUIrhDMxiGTgPjzj/g9p9RxpS2tSepPDRY+UwAaEeiKtUvIAg==` |
| **Guidepup** (real VoiceOver automation) | What a screen-reader user actually hears on dialogs, menus, toasts and Undo — axe passes all 34 states, but it cannot hear | macOS only; ~1 h set-up (VoiceOver permissions) | `@guidepup/guidepup@0.36.2`, `sha512-dfzCVPGaNqmwo1OhffV4YtOCmfKYx0nOW66+XJu99NhKWc9BT+XXxs0dUu1doD2d5FjavZQ8g1/DjiS+eLC1uw==`; `@guidepup/playwright@0.20.0`, `sha512-F1tIzewyVwUjLR+GHcgQAjbkruS40Uqvzax69VcQBvAT82g+5DZD+vXSYSP3MVgt6eJ03pDrPgeniHkx5gdHxA==` |
| **IBM Equal Access checker** (second accessibility engine) | Rules axe does not carry (e.g. some WCAG 2.2 focus and label rules); a second opinion on the same pages | Minutes | `accessibility-checker@4.0.34`, `sha512-uJMDbu8CCX+7taOZ94MXIZgY9ZliK+XdE2x24UOV5+uJAatlgfmoZplIAvvcYillKudK41iwRXEo+ZtH9UhflA==` |
| **knip** (dead code, unused exports and dependencies) | OA-17, OA-32, OA-33, OA-36 automatically on every push (STANDARDS §7 "no dead code") | Seconds | `knip@6.41.0`, `sha512-DrhQlIuV6xScd5Q+WTF1znd1w41QzxFGCtAHXCajsH/ndGMotHoNYbdXbuFtzW3mIOmniHtZ7zCtvnQkUmJtQQ==` |
| **Biome** (lint + format, one binary) | No lint today; catches unused variables, `any`, duplicate keys, a11y JSX rules | Seconds | `@biomejs/biome@2.5.15`, `sha512-WZTW4slm/pdkh92K6t/3aEN++44JD1PQ7squ7RCMLI1flHGl43DVOIGXvCjHiZgBMO1V4uYxoFNtqrIA4qGuIQ==` |
| **Semgrep** (security static analysis) | Missing `need()` on writes (OA-02, OA-13), raw error text to the client (OA-04), `@Body() any` — as custom rules over the NestJS controllers | Minutes; rules written once | Semgrep 1.181.0, PyPI wheel `semgrep-1.181.0-…-macosx_11_0_arm64.whl`, `sha256:05d79ad777fae86f6d914a67bedec1b9e2c3e637f61d49a4ef557e2bf69fed01` |
| **k6** (load) | Release race and submit race at volume (OA-05), catalogue at 400 rows, the Python fill under 5 concurrent officers (STANDARDS §4) | Single binary; runs locally | k6 v1.8.2, github.com/grafana/k6/releases/tag/v1.8.2: `k6-v1.8.2-macos-arm64.zip` `sha256:2ce3ed837e9a7c7b1b7a594ff72861bbf9d94d5930ca6611bd6f1ef5a08f7d0a`; Linux CI `k6-v1.8.2-linux-amd64.tar.gz` `sha256:37620781d35406ebf402397a6c5cf4adb62d175cb052ff45325ae0b860527063` |
| **Lighthouse** (performance and best practice budgets) | The 986 kB bundle (OA-31), first-view budgets per page in CI | Minutes | `lighthouse@13.5.0`, `sha512-w/yYIwg7mP9pCwkcbAXRztnvKHua2dJnZaNptPLa1cEw+akr6lbsIDiUOLsQwvaiAUr0xvxdmwvAzl3pj3Np0A==` |

Suggested order: the two no-install steps, then knip + Biome (cheap, immediate), then zod-to-openapi + Schemathesis (finds the most real defects here), then Stryker on the engine, then Guidepup before the client screens (W5).

## Suites
`COPY_PREFIX=audit bash product/tools/run-suites.sh` on 32961d69 (+ this report), 29 Oct 02:40–04:05, Mac load average 15–24 with four other lanes running: **50 PASS · 7 FAIL · 1 skipped** (studio browser: resets :4400). Full logs: `scripts/` holds the probes; the suite table is in the session's scratch log, summarised here.

| Failing suite | Why (read from its log) | Real defect? |
|---|---|---|
| check_ai_launch_paths.ts | `fetch failed` (UND_ERR_HEADERS_TIMEOUT) after 328 s | No: load; OA-38 |
| check_ai_orchestration.ts | isolated copy "did not start" within the script's 30 s wait; its log shows it started later | No: load; startup wait too short |
| check_forms_channels.ts · check_forms_demo.ts | isolated copy did not start (same cause) | No: load |
| check_screen01_browser.cjs | view change 213 ms against a 200 ms budget | No: load (budget missed by 13 ms) |
| check_runtime_r1c.cjs | client part first view 1,302 ms against 1 s | Borderline: load; rerun quiet |
| check_s5_slice3_browser.cjs | step "the shared Undo toast and the one Undo bar name the removal" failed; Undo itself passed. By hand the toast and bar were both correct (`pane-remove-dialog.jpg` walk) | Likely timing of the 10 s toast under load (see QA-58); rerun quiet |

**Reading:** no merged rule failed; the harness is load-sensitive (fixed 30 s startup wait, wall-clock budgets on a shared Mac). Fix in one line: startup wait from the environment (60 s on the Mac), budgets checked only in CI or with a quiet-Mac guard, and Playwright traces on failure (Part 3). Rerun the seven on a quiet Mac before trusting either verdict.

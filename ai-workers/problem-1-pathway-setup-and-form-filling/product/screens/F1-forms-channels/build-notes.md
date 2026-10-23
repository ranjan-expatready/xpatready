# F1 — Forms channels: build notes (forms lane)

## Slice 1 (BUILD, 23 Oct): data, capture, channels, validator, answer list, aliases and merges — no UI, no AI
Agreed scope: `challenge.md` "Lead response" and "Agreement", plus P-66 §4. Everything runs through the API on the lane's isolated copy (:4450, `xr_studio_forms_f1`); AI spend US$0 (the IMM 5257 PDF twin is the saved real draft of 21 Oct, replayed).

| Item | Built | Where (studio = `prototype/studio/`) |
|---|---|---|
| Data and migration | Additive migration: filing channel per line, portal per combination, online edition fields, screen order and option map per form field, answer lists, aliases, merge id, `PortalCapture`, `FieldMerge`; partial unique index on online identity. Proven on a copy of today's demo data: row counts unchanged, every line PDF upload, every edition PDF | `prisma/schema.prisma`, `prisma/migrations/20261023083353_forms_channels/` |
| Capture contract | `portal-capture/v1`, closed objects (no place for a value) | `../contracts/portal-capture.v1.schema.json`, `contracts/forms.ts` |
| Readers, way B and C | Saved blank page (title, label, element id, type, required, rules, help, choices, three-part dates, radio groups; skips scripts, styles, hidden tokens, search forms) and the spreadsheet template | `tools/read_portal_capture.py`, `samples/portal-capture-template.csv` |
| Refusal | A typed value, a tick, a chosen option, text in a text area, or an answer column → refused, nothing kept. Page files are never stored, only checksums and structure | same; `api/src/forms.ts` |
| Second person | Finish → held; the capturer cannot approve or return; approval makes an online version (re-check date, Sample 180 days) | `api/src/forms.ts` |
| Identity | Fingerprint of the normalised structure: a re-saved screen is "already in the library"; a change is held with its field-by-field difference | `engine/capture.ts` |
| Portal twin + review document | Twin JSON per approved version; review document printed to PDF (every screen, question, code; difference; Sample banner) | `engine/capture.ts`, `tools/print_pdf.mjs` |
| Screen map without AI | Order: same element id → PDF twin (label; date part by the field's own name; "other/previous" fields dropped; applicant's own fields first; unique name tie-break) → alias. Person accepts; labels learned as aliases | `engine/twin.ts`, `api/src/forms.ts` |
| Channels | Channel per line (versioned edit), portal per combination, default Online when an online version exists for the portal; filing method and signature derived | `engine/channels.ts`, `api/src/forms.ts`, `api/src/form-lines.ts` |
| Validator | Online line needs a portal and an approved online version; within its re-check date; every online input mapped or "not a fact"; every answer-list value has a code in each channel and every form code is mapped or unused | `engine/channels.ts`, hook in `engine/validate.ts` |
| Answer list end to end | `sex` (Sample): drafted option maps for PDF and online, a person maps the one the matcher cannot place, filler uses the map (onMissing refuse) | `engine/options.ts`, `api/src/fill.ts` |
| Aliases and merges (P-65) | One label → one field (duplicate refused); reviewed merge by a different person: id redirects, aliases move, published rows get draft versions, releases untouched; AI comparison treats merged ids and aliases | `api/src/forms.ts`, `engine/normalize.ts`, `api/src/sources.ts` |
| Intake guard | A saved portal screen sent to the intake is refused and pointed to a capture (it was silently a "guide") | `tools/read_form_identity.py`, `api/src/intake.ts` |
| `check_ai_drafting.ts` | Selects the four refused IMM 1344 runs by name | `tests/check_ai_drafting.ts` |

## Hooks in files this lane does not own (one or two lines each; declared for the Lead)
`engine/validate.ts` (call `channelProblems`), `engine/snapshot.ts` (channel, portal, online versions, option maps, answer lists, each only when set, so existing fingerprints are unchanged — tested), `api/src/main.ts` (register `FormsController`), `api/src/demo.ts` (reset counts and deletes the three new tables).

## Choices made while building (say if any should change)
1. **`PortalCapture` record instead of `IntakeItem` columns** (challenge list): P-66, decided after the challenge, makes a capture multi-screen with "finish"; the single-file intake could not hold that.
2. **Option map shape** `{ map, unused, codes }`: `map` is the team's ENUM map; `unused` and `codes` let the validator prove no form code is dropped.
3. **Aliases are matching metadata**, updated in place and kept out of the released snapshot (a new alias changes no behaviour).
4. **PDF form fields left unresolved stay as today** (filled by hand); the new "mapped or not a fact" error applies to online versions only. Making it an error for PDFs would block the current Screen 01 releases — **Lead decision**.
5. **Origin `CODE_MATCH`** for rows proposed by a deterministic match and accepted by a person (neither AI nor typed).
6. **Default channel** is applied where this lane creates lines (`sources.ts` apply and reuse). Screen 01's "+ Add line" (`api/src/programs.ts`, screens lane) still creates PDF upload: **request to the screens lane**: call `defaultChannelFor` there.
7. **Review PDF printing** uses Playwright's own browser build, or this computer's Google Chrome when that build is missing (it is, here).

## Concept text that conflicts with the agreed response (Lead to tidy `concept.md`)
Item 4 says a saved page is accepted "with its values stripped"; the agreed response says **refused**, and that is built. The second "item 2" still says "same identity and hold rules as PDFs (checksum, P-57)"; built as agreed: fingerprint identity and second-person approval (P-57 as amended by P-66).

## Checks run (lane ports 4450–4455, databases `xr_studio_forms_*`; :4400 untouched)
`check_forms_channels.ts` **66/66** (new: every rule pass + fail) · engine 38/38 · rules 54/54 · AI drafting 48/48 · API 94/94 · grounding 29/29 · orchestration **19/22** (cause below, not this slice) · Screen 01 browser **100/101** (only the 200 ms view-change budget: 594 ms at machine load 6.5, as recorded before under load) · type check clean for every changed file · explicit `any` 436 (baseline 437; new files typed clean) · migration on a copy of today's demo data: row counts unchanged.
Early-look evidence: `screens/F1-forms-channels/screenshots/slice1/` (review document PDF and its pages) and `studio/evidence/forms-channels/` (test log, first screen-map draft, channels of the visitor visa row).

## Lane environment findings (for the Lead)
* **Shared database client.** Every copy's `studio/node_modules` links to one shared folder; `prisma generate` in a lane rewrites the client :4400 uses. This lane works on a copy-on-write clone (git `skip-worktree`; never committed). Proposal: `lane.sh setup` clones instead of linking for lanes that change the schema. After merging F1: `prisma generate` + `migrate deploy` on main together.
* **Guarded AI stub fails in every lane copy.** In a lane `prototype/node_modules` reaches the shared packages through two links (the lane's `.tools` link, then the folder link); the guard (`p2/guard.ts`) allows only the first and last path, so the drafting child cannot load (proven: allowing the lane's `.tools` path fixes it). The 3 orchestration failures are this. Fix options: the guard allows each link hop of `node_modules` (safety file, test needed), or `lane.sh` links differently. Not changed here.
* **Pages 404 in every lane copy.** Express refuses files under a hidden folder, and lane copies live in `.claude/worktrees/`; fixed with `dotfiles: "allow"` in `api/src/main.ts` (two words; served files are not hidden). The web app must also be built once per lane copy (`web/dist` is not shared).
* My test runs rewrote tracked evidence files of other suites (orchestration, grounding, Screen 01 API and browser); restored, not committed.

## Mock vs real · Sample
Portal fixtures are **Sample · Scaffolding (P-33)**: written from IRCC's public IMM 5257 descriptions with deliberate differences; no reuse rate is claimed (`studio/tests/fixtures/portal/README.md`). Portal list, answer list `sex`, re-check period: Sample until the immigration expert confirms.

## Known gaps (by scope)
No UI (slice 3, after Screen 01 DONE and a file grant). AI for leftovers, guarded admission of screen inventories, A4 backend, combinations 3 and 6: slice 2. Express Entry public pages on the official list: Lead task.

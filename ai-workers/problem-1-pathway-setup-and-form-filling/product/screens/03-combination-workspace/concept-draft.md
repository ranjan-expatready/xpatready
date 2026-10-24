# Screen 03 — Combination workspace · concept DRAFT (screen-designer, 23 Oct; the Lead decides)

Board: `design/draft-workspace.html` (self-contained; board bar switches combination 3 / combination 2 / new, and every state; "Show labels" shows Capability or Scaffolding, Needed or Not built, and the decision each element follows or lacks). All content Sample. Milestone 2. Where this draft and the board differ, this draft wins.

## 1. Job and journey
A content publisher sets up everything one application needs (forms and how each is filed, the questionnaire per person, documents, rules, links to other applications), sees exactly what each person will get, and sends it for review and release. Persona: content publisher (author); approver and immigration expert on Review and release. Activities 3.3, 3.4, 3.7 (+ 4.4 release). SA-01B: SA-1B-3, 19–20, 54, 57–63, 102; redesign RD-6. Capabilities: C1.3, C1.5, C4.1–C4.3, C4.5, C5.1–C5.2; reuses C1.6 and C2.7 built in Screen 01's fix pass.

## 2. Ten layers
| Layer | In the app today | In the team's code | New here |
|---|---|---|---|
| Masters | Combination, form lines with channel, portals, online versions (F1), sections, document types, rules | Program tree, SQR section selection with `pqrCanonicalFieldKeys`, checklist items with primacy + alternative group | Combination link (kind, target, facts, documents); substitute sets on document type (B3); "filled by" on shared field (B2) |
| Links | Line → library item by reference; `linkLabel` text only | Requirement → programme node, one role | Link records replace `linkLabel` (P-59); line origin "added by the question" / "copied from" |
| Configuration | One line shape partly (forms, requirements, rules, section picks) | Separate tables | Form line: who, copies, minimum age, only if, channel, signed by (Q2); document line picks a substitute set |
| Rules | Rules and checks per combination; validator incl. `channelProblems` | Predicates, condition flags | Needed-fact coverage per role; link checks; bulk-change checks |
| Engine | `filingMethod`, `channelsView`, preview resolver | — | Coverage (needed vs asked vs carried vs officer), "because" for every item, bulk-change dry run |
| Contract | `/combinations/:id`, `/config`, `/preview`, `/review`, `/channels`, `PATCH …/portal`, `…/forms/:line/channel` | — | §6 below |
| Screen | 5 tabs (Overview, Sources and forms, Configuration, Preview, Review and release) | Hierarchy, SQR sections, checklists pages | 8 tabs below; Sources move to Overview + Screen 02 |
| AI assist | Drafting via Screen 02; one next step (P-07) | — | None new; AI stays in the next-step card |
| Governance | Submit, SME sign-off, approve (C5.1); shared release bypass (QA-1) | Pack draft → publish | Same guard on both release paths; change set per combination (P-58) |

## 3. Business rules (each: one pass and one fail test)
BR-1 Tabs in the route `/c/:id/:tab`: Overview · Forms · PQR · SQR · Documents · Rules · Preview by person · Review and release (P-35, SCREENS 03, team tabbed detail). Fail: an unknown tab redirects to Overview.
BR-2 One line shape: kind · item · who (once, or roles) · only if · order; every resolved item says why (SA-1B-57, 59; STANDARDS §3.9).
BR-3 A line is created on the combination or by a question ("answer adds a document"); both make the same line with its origin; no upload field type (SA-1B-3, 58; C4.5). Fail: a question cannot hold a file of its own.
BR-4 Library gives the default "who"; the combination may change it for itself only (SA-1B-60).
BR-5 Each form line's channel is PDF upload · Online · Signed PDF upload; portal set once per combination; new line defaults to Online only when an approved online version from that portal exists (P-61 §2, `defaultChannelFor`). Fail: Online with no portal → field message "choose the portal it is filed through".
BR-6 Filing method and signature method are worked out from the lines, never typed (P-61, `engine/channels.ts`). A Signed PDF upload line adds its signed-scan document line (P-62 §3).
BR-7 Every needed fact for each person role is asked in a library section, filled by the case officer, or carried by a link; otherwise release is blocked (P-62 §2, §5.3; RULES-MODEL §5.2).
BR-8 Conditions on questions come from library rules (read-only here, "Open in the library", with where-used count); a combination adds lines but never makes optional or hides a question a form needs (P-12; SA-1B-9).
BR-9 "Filled by" Client or Case officer is the shared field's default; background and declarations stay with the client; client preview shows client fields only (B2, RD-6). Changing it here says "changes it in 7 combinations".
BR-10 Document line picks a document type from the library; missing type → "Describe what you need"; never created silently (P-52/P-53).
BR-11 Document line picks one of its type's named substitute sets ("any one of" / "all of"); never defines its own (SA-1B-19, 20; B3).
BR-12 Links: Supported by / Follows another combination; carry named facts and documents that exist in the target; no self-link; no Follows loop (P-13, P-59, TAXONOMY §2–3). Fail: self-link and loop refused with a field message.
BR-13 Copy from another combination; add or remove one line across many: affected combinations listed with outcome (will change, already has it, different condition kept, channel impossible) before anything enters the draft; each is a draft change in its own combination; Undo until submitted (SA-1B-61, P-23).
BR-14 PQR (agreed P-76, 23 Oct): PQR ⊂ SQR ⊂ agent view. The PQR tab marks questions this combination's SQR asks; AI drafts the picks with a reason each, a person accepts or removes; PQR changes are released with the combination (BR-16), never separately; the general country-level PQR is built from released combinations (B29, not on this screen). No verdict to a prospect (sub-question pending). Fail: marking a question not in the SQR is refused.
BR-15 Preview by person runs the shared renderer (P-47) read-only with a Sample family preset plus tweaks (P-37); same resolution as runtime.
BR-16 Review and release: author submits; items needing an expert get a tick; a different person approves; the Releases page uses the same server guard (P-23, P-40, P-43; QA-1). Validator problems block; everything else warns (EXPERIENCE §2.9).

## 4. Layout (Workspace pattern, EXPERIENCE §3; board)
Header crumbs (every level clickable) · title + calculated status · one muted facts line (release, draft changes, filing method, portal, people, Sample) · "↔ Supported by …" line · next-step card (the one AI place). Draft bar "41 changes in 4 combinations (38 here)". Tabs: **Overview** (missing list with links, four counts, Links card, people, sources and freshness, releases) · **Forms** (filing method + portal strip; table Form · Who and copies · Only if · Channel · Signature · Version and field map; Edit / Other combinations… per line; Copy from another combination; Add an online form; + Add form) · **PQR** (flag list left, PQR-mode preview right, "pending" chip) · **SQR** (role chips with counts; needed-fact coverage; library sections as rows that expand to questions with Asked as · Filled by · Needed by · Rule; live phone preview right) · **Documents** (Whose chips; Document · Whose · Only if · Accepted documents · Origin) · **Rules** (All · From the library · This combination's lines · Checks · Problems) · **Preview by person** (family presets, tweaks, person chips; questionnaire, documents and forms columns, outputs by channel) · **Review and release** (three steps, release checks, change set with expert ticks, Submit or Approve). All edits in right panels (560 px): form line, link, other combinations, copy from, answer adds a document, who fills it, document line.

## 5. States (all on the board)
Empty (new combination: every tab teaches its first action) · loading (skeleton + status) · normal (combination 2, Live, linked) · needs work (combination 3: 3 missing, 2 release problems) · running (next-step card "AI is drafting: 4 of 6 forms read", real counts) · field error (channel without portal; self-link; unknown document type) · page error (Try again) · read-only (approver: no edit controls, approve disabled with reasons) · conflict (409 banner: Reload or Compare) · long names (truncation with full text on hover).

## 6. Contract (one request per tab view; zod in contracts; Problem Details errors; server authorisation; author ≠ approver)
`GET /combinations/:id/workspace?tab=` · links `GET|POST /combinations/:id/links`, `PATCH|DELETE …/links/:linkId` {kind, targetId, facts[], documents[], version} · `PATCH /combinations/:id/forms/:line` {who, copies, minAge, onlyIf, signedBy, version} (channel and portal stay F1's) · `POST /lines/bulk/preview` {line, op: add|remove, combinationIds[]} → per-combination outcome; `POST /lines/bulk` {…, idempotencyKey} · `POST /combinations/:id/lines/copy` {fromId, lineIds[]} · `GET /combinations/:id/questionnaire?role=` → sections, questions, coverage · `POST /combinations/:id/requirements` {documentType, who, onlyIf, substituteSet, origin: {questionKey}} · `PATCH /library/fields/:key` {filledBy} → where-used count · `PUT /combinations/:id/pqr` {fields[]} (pending R-84) · `GET /combinations/:id/preview?family=&person=&tweaks=` · `POST /pack/release` refuses unsubmitted or unsigned (QA-1). Stale save → 409 with what changed.
Scale and keyboard: tab switch < 200 ms with Sample data; one request per view; keyboard path tabs → line → panel → Save; Escape closes a panel; focus returns to the row; axe on every state; 1024 px and 200 % zoom.

## 7. Copy (front-loaded, P-63 words; no IDs on the main path)
Filing method tip: "Worked out from the form lines below. Change a line's channel to change it." · Links empty: "Not linked. Add a link when another application usually supports this one … or comes before it." · Coverage: "Release is blocked until every needed fact is asked, filled by the case officer, or comes from a linked case." · Bulk: "2 combinations change. Undo is available until the draft is submitted." · Who fills: "This changes the shared field everywhere." · PQR: "Prospects never see an eligibility result." · Approver disabled: "2 problems block release · 2 expert ticks missing · nothing has been submitted". Errors as in BR-5, BR-12, BR-10 (all on the field, with the fix).

## 8. Capability or scaffolding · Needed or Not built (P-33, P-26)
| Element | Label |
|---|---|
| Every tab, panel, check and message above | Capability · Needed |
| Sample family presets and tweaks in Preview | Capability · Needed (P-37); the families' values are Sample |
| Demo menu, Acting as, replayed AI answers, sample loader | Scaffolding |
| General PQR assembly, entry points, campaigns, prospect consent | Capability · Not built here (pending R-84; PQR options page) |
| Country variant of a form line; government and standard step lines (B11–B12); fees (B19); estimated time (B5); validity warnings (B4) | Capability · Not built (backlog) |
| Substitute-set authoring (Screen 04); field-map review (Screen 02); carrying facts on cases (M3) | Capability · other screen or milestone |

## 9. Decisions followed, missing, conflicting
Followed: P-07, P-12, P-13, P-23, P-35, P-37, P-40, P-43, P-47, P-50, P-52/53, P-58, P-59, P-61, P-62, P-63; SA-1B-3, 19–20, 57–63; RD-6. Agreed since drawing: P-76 (PQR, option C). Missing: carried-fact behaviour (Q1); "Signed by" per form line (Q2, SA-1B-102; the team's stored `signatureMethod` maps to our derived method at retrofit); **Sponsor** is not a person role in PRODUCT §4 or the app (immigration expert; combination 3 needs it). Conflicts: P-35 lists an "Agent view" tab, SCREENS 03 + P-56 put runtime in M3 (Q3); P-47 PQR ends "Looks eligible", option C and CICC s.44(2) say no verdict (resolved by R-84). Overlap: Screen 01's fix pass adds channels and "Add an online form" to today's page; Screen 03 must reuse those components, so it should start after that fix merges.

## 10. Questions for the Lead (recommendation first)
1. **Facts a link carries, in the linked combination's questionnaire:** recommend pre-filled from the linked case and marked "please confirm" (P-65, P-72), asked as usual when no linked case exists; not skipped, because the linked case may be missing.
2. **"Signed by" on each form line (SA-1B-102):** recommend adding it as a pick list set by the immigration expert (person · parent for a minor · principal for the family · person and representative · none), Sample until confirmed; how it is signed stays worked out from the channel (P-61).
3. **"Agent view" tab (P-35) vs runtime in M3 (P-56):** recommend no Agent view tab in M2; Preview by person gets "Show facts and the form fields they fill" (the renderer's agent-view mode, read-only, Sample family).

## Definition of Ready
- [ ] Board agreed by the founder (draft only)
- [x] Every element labelled Needed or Not built, and Capability or Scaffolding (§8, board labels)
- [x] Data and API needs known (§2, §6); F1 back end on main
- [ ] Every decision it relies on agreed: PQR agreed (P-76); Q1–Q3; Sponsor role (expert)
- [ ] No open questions (three above)
- [ ] Screen 01 fix pass (C1.6, C2.7, QA-1) merged first

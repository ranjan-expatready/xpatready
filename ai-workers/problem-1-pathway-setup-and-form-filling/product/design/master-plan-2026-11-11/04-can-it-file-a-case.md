# 04 · Can the product file a case? Can it upgrade one?

Master analysis, part 4 of 8 (A19 (f)). Read-only, on `origin/main` fbfb263c7 (11 Nov). Evidence is the file and line, the sample data key, the capability verdict in `qa/CAPABILITIES.md`, or the open bug in `qa/BUGS.md`. Nothing was run for this file. The "works / partial / missing" calls are judgements from those records, with each judgement's evidence next to it.

## 1. The answer in one paragraph

**"File" here means "prepare everything a representative needs to file".** The product never submits to IRCC; the person files in IRCC's portal or by upload. On that meaning:

* **One combination of the six (Visitor visa, `vv.single`) goes the whole way in the demo.** Set-up, release, a family case, the client's answers, the representative's review, filled forms, and a Paper IMM 5257 that passed Adobe Validate and reads back 75/75 equal (`samples/validated-imm5257-paper.json`, #1495, C10.2 Works).
* **Four more (`sp.outside`, `wp.lmia_inside`, `pnp.express_entry`, `fs.spouse`) get through set-up, release, case, answers and review.** They stop at filled-and-checked forms: no Validate record, no fill trial on most of their forms, and missing fees for three of them.
* **The sixth, `lm.high_wage` (the employer's LMIA), is not set up.** Its one form, EMP5626, is online-only, has no PDF, and has no form rules, fees or documents.
* **Nothing can be filed for real yet, by decision:** all content is Sample. Every release is a "Demo release" (C5.5, C5.6, P-240) until the immigration expert signs an answer key (A7). Internal use is on sample and test data only (P-455 (3)). Legal points: Unconfirmed: no counsel.

**"Upgrade a case":** the requirements never use "upgrade" in the immigration sense. Every hit is a SaaS plan tier (SA-3, SA-4). They describe five related moves (section 4). Three of them work today:
* Start next stage: one Sample route.
* Add a family member.
* Move a case to a newer release.

Two are missing: a linked follow-on case (including "Change stream"), and extension or restoration of status.

## 2. Combination × step grid (the six, from `samples/wave1.json`)

Steps: 1 set up · 2 release (both gates) · 3 open a case · 4 client answers · 5 representative review · 6 forms filled · 7 Adobe Validate (Paper) or online answer sheet · 8 ready to file.

| Combination | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Visitor visa `vv.single` | works | works | works | works | works | **partial** | **partial** | works (Sample) |
| Study permit `sp.outside` | partial | works | works | works | works | partial | missing | partial |
| Work permit with an LMIA `wp.lmia_inside` | partial | works | works | works | works | partial | missing | partial |
| PNP via Express Entry `pnp.express_entry` | partial | partial | works | partial | works | partial | partial (online) | partial |
| Spousal sponsorship `fs.spouse` | works | works | works | works | works | partial | partial (online) | partial |
| Employer LMIA `lm.high_wage` | **missing** | missing | partial | missing | missing | missing | missing | missing |

### Evidence per step (applies across rows unless named)

| Step | Evidence |
|---|---|
| 1 set up | C1.1-C1.6 and C2.x/C3.x Works on the six (M2 60/60). Form rules per combination are data since BK-10 (#1518, `samples/form-setup.json`). **Partial** where content is missing: fees for `sp.outside`, `wp.lmia_inside` and `pnp.express_entry` have no lines (`samples/fee-table.json`, `combinations.sp.outside.lines: []`, note: "No fee lines: its fees are not worked out from this table yet"); `pnp.express_entry` has no document rules in `form-setup.json`. `lm.high_wage`: no form rules, fees or documents; `wave1.json` lists EMP5626 as missing. |
| 2 release | C5.1, C5.2 Works. The configured checkpoint releases the five that have data (`api/src/features/checkpoint/110-release-one`). **Caveats:** Sample maps release only as "Demo release" (C5.5, C5.6). QA-237 and QA-239 (Majors) mean approving a condition on one pathway can block every other pathway's release (Bake row 6, before BK-13). `pnp.express_entry` is partial on the same condition path. |
| 3 open a case | C6.1 Works (a Family sponsorship case opened on the checkpoint; QA-271 closed). QA-278 (Major): 48 opens at once → 25 × 500. `lm.high_wage` partial: a case can open on an employer combination as a stand-in (C1.3 employer link), but not on a configured release. |
| 4 client answers | C6.2, C6.3 Works. UX Minors from BK-1: QA-387 (cannot clear a wrong answer), QA-388 ("Part n of N" jumps), QA-389 ("No" still asks for the list). `pnp.express_entry` partial: its online-only forms' questions come from release data whose document rules are missing. |
| 5 review | C8.3 Works (generic, any combination). |
| 6 forms filled | C7.1 Works. **Partial for all:** fill trials exist for only six forms (IMM 0008, 1295, 1344, 5257, 5409, 5707; `samples/fill-trials.json`, `map_version` null, runs of 23-24 Oct), and none for IMM 5710, 1294, 5646, 5669, 5406. C7.8 add-a-form Partial (QA-355; fix commits merged with #1450, not re-scored). QA-383 (Major): IMM 5710 cannot say "Canada" for an inside-Canada worker (`wp.lmia_inside`). QA-275 (Major): two fills in the same minute share one file name. B164's allow-list still has one per-pathway line on this path: `case-prepare.ts` reads biometrics ages from `vv.single` (BK-8). |
| 7 Validate / answer sheet | **Paper:** C7.2 **Partial** (open Majors QA-165, QA-315, QA-318; nightly 2/10 on IMM 5257; 2 of 46 mandatory boxes empty on a ready IMM 5257). C10.2 Works for the finished story's one Paper IMM 5257 (Adobe Validate passed, read back 75/75; `barcode_checked: false`). No Validate record for any other form. **Online:** C7.3 Works; the answer sheet for online-only forms is general since M3-S5 (#1507). `fs.spouse`'s PR Portal account lands with B169 (#1523, open). `lm.high_wage`'s EMP5626 has the mechanism but no data. |
| 8 ready to file | Ready-to-file checks Works on `vv.single` (C6.5, C6.16, C6.19). Others partial: no fees on three; checklist "not derived yet for this combination" guards in `engine/runtime/case-checklist.ts` and `api/src/case-stages.ts` (B164 allow-list, removed by M3-S4); waivable line (M3-S3, #1524 open) and never-waivable blocking line (M3-S4) not merged. |

### Demo coverage (what the founder can show)

* **Finished story** (`api/src/finished-story.ts`, `samples/finished-story.json`): a Visitor visa family case to a recorded submission, plus a thin second case. No other combination.
* **Configured checkpoint:** five combinations set up and released; a case and fill on `vv.single` only (`120-family-case.ts`, `125-thin-case.ts`).
* B164's remaining per-pathway lines: 7 BK-12 fixture entries, `case-prepare.ts` (BK-8), `case-checklist.ts` and `case-stages.ts` (M3-S4), `review-runs.ts` (AI review on Visitor visa forms only, BK-14).

## 3. What closes the gap, per combination (rows that already exist, and new ones)

| Combination | To reach "ready to file" (Sample) | Rows |
|---|---|---|
| `vv.single` | Mandatory boxes and the barcode check on IMM 5257 + SCH1 | QA-165/318 (retest first), QA-315, B170b/B170c (team engine as a check) |
| `sp.outside` | Fees as data; fill trials on IMM 1294 and 5646; Validate on 1294; the zero-code run | BK-13 (exit b) includes fees and field maps; **fill trials are M4 (P-460)**. Note B170: the team's engine refuses IMM 1294 today |
| `wp.lmia_inside` | Fees; IMM 5710 "Canada" fix; fill trial + Validate on 5710 | QA-383 (outside the caps); fees as data (new row: the same pattern as BK-13, after it); fill trials M4 |
| `pnp.express_entry` | Fees; document rules; online answer sheet data for IMM 0008/5669/5406/5562 | new rows (content), after BK-13 proves the pattern; M3-S5 mechanism exists |
| `fs.spouse` | PR Portal account (B169); fill trials on its forms beyond 1344/0008; Validate on 1344 | B169 #1523; fill trials M4 |
| `lm.high_wage` | Everything: form rules, fees, documents, EMP5626 answer sheet data; an employer case | **Not in the Bake** (P-447 (4): no new capabilities; Fable's question 17 ruled out of the Bake). A later-milestone decision for the founder (`07-m4-and-on.md`) |
| all | Expert-signed answer keys so a release is not "Demo"; Adobe Validate per Paper form; counsel on filing terms | A7 (founder books the expert); fill trials on every form (P-460); counsel outside the build |

**A real filing (not Sample) needs three things the builders cannot supply:**
1. The immigration expert's signed answer keys (C5.5, P-240).
2. Validate on every Paper form the case uses.
3. The team's real-data environment (P-335, P-357, P-455 (3)).

The first two can be in M4. The third is the team's.

## 4. "Upgrade a case": what the requirements mean, and what exists

Source: the team's requirements, name-free copy `domain/requirements-2026-11-02/` (read-only). The word "upgrade" appears only for SaaS plan tiers (SA-3, SA-4). The immigration moves it most likely stands for:

| # | Meaning | Requirement, quoted | Product today | Verdict |
|---|---|---|---|---|
| U1 | **Next stage of a multi-stage route** (e.g. study, then work) | AG-07 v3.12 (`02-functional-requirements/agent/AG-07-case-core-and-delivery_v3.12_2026-10-28.md:2133`): "For a sequential route, when the earlier level is approved ExpatReady suggests **Start next stage** in Needs you, and the case screen also has a manual **Start next stage** button … The later filing reads the same person's answers; nothing is copied". SA-01B knock-ons `:146`: "where several next stages are allowed the officer picks one"; `:148`: "earlier stages can be recorded 'Done before we started'" | C6.17 Works (nightly 42759023740, 47/47): `api/src/case-stages.ts:269-272`, `engine/runtime/stages.ts:24-46`; **one Sample route** (`samples/routes.json`: `sp.outside` → `wp.lmia_inside`); repeatable stages not built (`stages.ts:36`); no "Needs you" suggestion | **Works for one Sample route** |
| U2 | **Linked follow-on case / change stream / re-application** | AG-07 `:346`: "A linked case is a new case joined to an earlier one, for a follow-on matter. The link has a kind: worker permit, re-application of or stream changed." `:358`: "Change stream is a button that opens a new linked case for a different program. It closes the old case with the outcome Stream changed." SA-01B knock-ons `:181`: "Open a linked case … marked 'Usually follows <row>'" | Not built. "Follows" is text only (`samples/programs.json:257`; PRODUCT.md:48 "'Follows' is only a suggestion of the next application"; P-391 puts it after M3 as BACKLOG L-follow). C1.3's employer link is a different link | **Missing** |
| U3 | **Add a family member** | AG-07 `:1125`: "Staff choose **Add family member** on the case (or the questionnaire adds one). They give the relationship (spouse, child, other) and the filing or filings the person is on." | C6.1 Works: `api/src/runtime.ts:951` (`POST cases/:id/people`; Add child, Add sponsor; no "Add spouse" button found); filing changes C6.13 Works (`api/src/case-filings.ts`, nightly 42616655752, 32/32); add a form C7.8 Partial (QA-355) | **Works** (with C7.8 partial) |
| U4 | **Move an open case to newer rules** | Glossary (`02-functional-requirements/shared/99-Phasing-and-Glossary_v2.25_2026-10-25.md:73`): "A client's work stays on the pack version in force when it started; moving it to newer rules is an explicit, audited adoption by firm staff"; SA dev hand-over (`super-admin/DEV-HANDOVER_2026-10-18.md:224`): "'Use newer rules' moves the whole filing" | C9.5 Works: `api/src/release-update.ts:208-209` | **Works** |
| U5 | **Extension, renewal, restoration, maintained status** | AG-07 `:370`: the expiry watch "stops by itself when a new expiry is recorded for the same status, or when a renewal or extension is submitted." SA-01B knock-ons `:171`: "restoration and maintained status stay with AG-11"; SA-01B redesign decisions `:105`: "maintained status (an extension submitted before expiry keeps the person in status)" (AG-11 is a placeholder) | Not in the product; `visitor_extension` exists only as a fee line in `samples/fee-table.json` with no combination | **Missing** (and the requirements leave it to a placeholder) |

**Reading:** the founder's "upgrade the case" most likely means **U1 or U2**: the same family moving to its next application (study → work → PR), keeping its answers. U1 is built and proven on one Sample route. The general version needs:
* **routes as data for more pathways**: content, with the expert;
* **repeatable stages**;
* **the "Start next stage" suggestion in Needs you**;
* **U2's linked case**, a new capability.

None of these are in the Bake (P-447 (4): no new capabilities). Section 7 places them.

## 5. Gaps, ranked by how much they block "file a case"

1. **Sample everywhere:** no expert-signed answer key, so every release is a Demo release (C5.5, C5.6, P-240). This is the founder's booking (A7), not a build row.
2. **Validate proof exists for one form** (IMM 5257 Paper). C7.2 Partial with three open Majors (QA-165, QA-315, QA-318; retest QA-318 first, see part 1).
3. **Fill trials for 6 forms only**, none recorded against a field-map version. Fill trials on every form are a required item of the next milestone (P-460).
4. **Fees missing** for `sp.outside`, `wp.lmia_inside` and `pnp.express_entry` (`samples/fee-table.json`). BK-13 covers Study permit; the other two need the same content rows.
5. **Only `vv.single` has ever been filled end to end** in the demo or checkpoint. Exit (b), BK-13, is the first run on a second pathway.
6. **`lm.high_wage` is empty.** It needs a decision on whether the employer side is in the next milestone (Fable's question 17, ruled out of the Bake).
7. **Releases across pathways** can block each other (QA-237, QA-239).
8. **"Upgrade":** only one Sample route; no linked case; no extension or restoration.

## Question for the tech lead (posted on the PR)

**Name what "upgrade a case" means in the founder's words, before M4's list is fixed.** The requirements support U1 (next stage, built for one Sample route) and U2 (linked case and Change stream, missing; AG-07 `:346`, `:358`). *Recommend:* put U1-generalised (routes as data, repeatable stages, the Needs-you suggestion) and U2 (linked case) into M4 Track A as two rows, sized after the expert confirms one real route. Ask the founder one question: "By 'upgrade' do you mean the next application for the same family (study → work → PR), adding a person, or an extension of status?" Recommendation: the first.

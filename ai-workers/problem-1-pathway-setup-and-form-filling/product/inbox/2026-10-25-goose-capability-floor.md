# Capability floor — node by node, what proves it today and what does not

**Who checked what:** Goose (outside checker), read-only on the tree, 25 Oct 2026. Checked against `origin/main` `2169ec3` (F2 merged) **and** the Lead branch `53eebd9` (Screen 02, PR #29, not yet merged — rows marked *PR #29* mean "built on that branch, not on `main`"). Nothing here is built or changed by this note.
**Why:** the founder accepted **Option A** (25 Oct, 18:15) — keep P-93's demo story and add Corporate LMIA and Express Entry as proof-only rows at the **M3 gate**. This note makes "the whole floor is covered" checkable instead of asserted.

**How to re-verify any row** (2 minutes, no app):
`grep -n "C1.3" product/qa/CAPABILITIES.md` · `ls prototype/evidence-lane/E1/` · seed dump: `python3 -c "import json;[print(c['label'],c.get('setup',{}).get('key','no setup'),len(c.get('setup',{}).get('sources',[]))) for p in json.load(open('prototype/studio/samples/programs.json'))['programs'] for c in p['categories']]"`

## The board

Legend — **Proved**: an independent test or Adobe trial exists. **Built, unproved**: code or tests exist, no independent test. **Zero**: nothing to show. Demo: **A** visitor visa family of four · **B** work permit with LMIA · **C** Corporate LMIA high-wage · **D** Express Entry. *Sample* = value not yet confirmed by the immigration expert.

| # | Node | Proved today | Gap | Proved by (Option A) | Owner · stage | Gate |
|---|---|---|---|---|---|---|
| 1 | PDF ingestion | C2.1 Works (IMM 5257 code, edition, checksum, 0.8 s); C3.1 Partial (AI mapping API only) | No person-walk of the drafting screens (C3.2 *not tested*); C's sources are empty | A (5257, 5707 + checklists) · C (EMP5711) | screens (04) · forms | M2 |
| 2 | PDF auto-fill + Validate + barcodes | C7.1 Works; Adobe trials **passed**: 5257 (5/5 barcodes), 1295, 5707, 0008, 1344, 5409 | C7.2 row still says *not tested* — the register is stale, not the trial; IMM 5476 not done; EMP5711 never trialled | A (5257 barcodes) · B (1295) · C (5711, static form — read-back equal, no barcodes) | evidence (Mac) · runtime | M3 |
| 3 | Online ingestion | C2.5 · C2.7 Works (capture, answers refused, second person approves); extension capture built in F2 (merged) | C2.8 review document *not built* (PR #29); nothing tested by qa since the F2 merge | A (5257 online, Sample portal screens) · D (saved EE pages) | forms · qa | M2 |
| 4 | Online auto-populate | Extension fill built in F2 (`check_forms_f2c_fill` 17/17 on the lane) | C7.4 untested by qa; C7.3 **portal sheet not built** | A (extension fills one screen) · D (answer sheet in portal order) | forms · m3 | M3 |
| 5 | Signed-PDF flow (print → sign → scan → upload) | **Zero.** C8.1 *not built*; C3.11 (signed line adds its scan requirement) *not built* | Whole flow | A (IMM 5476 signed upload) · C (EMP5711 — *Sample*, see caveat 1) | runtime (03 S3) · m3 | M3 |
| 6 | Mixed filing derived from its lines | C1.6 Works — the method is derived correctly and blocks release | C7.7 the filing itself *not built* | A release 2 (5257 Online · 5707 PDF · 5476 Signed) | runtime · m3 | M3 |
| 7 | Online-only filing (no PDF) | **Zero.** No Express Entry setup in the seed, no capability row, no answer sheet | Setup, answer sheet, proof | D only | m3 · screens | M3 |
| 8 | N-persons (roles on lines, one filing per person) | C6.2 · C6.3 · C6.6 Works (R1d walk 35/35, 1440/390 px); seed has principal + spouse + up to 4 children | Per-person *filing* is M3 | A (4 people) · B (worker + spouse) | runtime | M2/M3 |
| 9 | "Supported by" link | **Zero.** C1.3 *not built* — the path builder stores a text label only | The link and the facts it carries | B ← C | runtime (03 S3) | M2 |
| 10 | "Follows" / route link | **Zero.** Same as 9; P-24 models EE as route steps *inside* one category, so a route is not yet a link either | Decide: route steps or a Follows link, then build it | D (Profile → PR) · B follows C | runtime (03 S3) · Lead | M2 |
| 11 | Corporate/employer Pathway | **Shell only.** `lm.high_wage` is seeded (Employer + Representative) with **no sources**; **no capability rows name Corporate at all** | Sources (EMP5711 + LMIA Online answer sheet), rows in the register | C | forms · runtime · qa | M2/M3 |
| 12 | Reuse of shared facts across combinations | C6.3 Works *within* a case only; reuse across combinations is designed (DEMO row 18) but **cannot be shown: no work-permit setup exists in the seed** | B's setup and seed | A → B (5707, 5476 reused with no new mapping; 1295 new) | runtime (D1) | M2 |

**Count today: 1 fully proved · 6 built but unproved · 5 with zero proof (5, 7, 9, 10, 11's capability).** Under Option A all twelve are reachable; five of them land only at the **M3** gate, four of those in runtime 03 S3 or the m3 lane.

## Corrections to the circulating analysis (§4–§6)
1. **"Every node is covered by at least one of the four" is a plan, not a fact.** Nodes 5, 7, 9, 10 have nothing built; 11 has a shell and no capability row. The four-combination frame is sound; the coverage claim was premature.
2. **Visitor visa must stay.** It is the only combination with Adobe-passed barcodes (5257), a family of four, and a real mixed release (release 2). Dropping it would not "free" a slot — it would throw away the only proven PDF path and strand runtime's D1 seed.
3. **Corporate is cheaper than assumed, work permit dearer.** `lm.high_wage` already exists as a combination in the seed; nothing is seeded for "Work permits › Employer-specific › With an LMIA", which B needs and which row 18 (reuse) depends on.
4. **Spousal proves no node here** and is blocked on expert question 1 (IMM 5669 / Schedule A). It stays out of the floor, as P-93 already says. If it returns later, its seed must include a dependent child, or N=2.

## What the immigration expert still decides (nothing below is settled by us)
1. **Channels per combination** (expert question 3, P-61): which forms are PDF upload, Online, or Signed PDF in each of A–D. Every channel row in `DEMO.md` is *Sample* until then. This decides whether node 5 is shown on A or on C.
2. **EMP5711 is a signed agreement, not an Individual-only artefact** — employer and worker sign it. If the expert confirms a Signed-PDF line, node 5 sits on Corporate too; the board above assumes so (**Unconfirmed: no counsel**).
3. **Express Entry after ITA.** If the personalised checklist includes a form that must be signed (a declaration or IMM 5476), EE is not a pure online-only proof and node 7 moves to "online plus one signed item".

## What this asks of the Lead
1. Record Option A as a founder decision and amend `DEMO.md` (add rows for C and D at the **M3** gate; B's setup; no change to A) and `SCREENS.md` demo list. No change to P-93's hero.
2. Fix the stale register rows where the trial already passed: **C7.2** (Adobe), **C2.9 · C7.4 · C9.3** (F2 merged), **C2.3 · C2.8 · C9.1** (PR #29).
3. Add the missing capability rows: a Corporate set (C11.1 workspace and combination, C11.2 EMP5711 fill and read-back, C11.3 LMIA Online answer sheet), plus C1.3/C1.4-style rows for the two links and D's online-only answer sheet.
4. Send the three expert questions above with this note attached, so the answers change rows rather than restart the argument.

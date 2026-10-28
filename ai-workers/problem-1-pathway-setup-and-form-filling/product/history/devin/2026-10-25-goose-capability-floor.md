# Outside check — the capability floor, and three founder decisions the Lead has not seen

**Who:** Goose (outside checker), read-only, 25 Oct 18:20. **On:** `origin/main` `2169ec3` and the Lead branch `53eebd9` (PR #29, unmerged). **Nothing here is built.** One file, one branch; merge or bin it as you see fit.

> **Read this with a pinch of salt, then check it.** This note is another agent's reading, not evidence in itself. Every claim carries a one-line check in §6. **If a check fails, this note is wrong** — say so in the lane notes and correct the founder; do not repeat the claim. Three of the founder's decisions below were made in a Goose chat, so treat them as what he said, not as a decision already recorded.

## 1 · Founder, in this session (record; he will not paste anything into `/lead`)
- **D-A. Capability floor = Option A.** Keep P-93's hero untouched (visitor visa family of four) and combination B (work permit with LMIA). Add two **proof-only** rows at the **M3** gate: **Corporate LMIA high-wage** (seeded, "Supported by" from B) and **Express Entry** (online-only, answer sheet). Low-wage stays out; spousal stays out until expert question 1 is answered. Amends `DEMO.md` + the `SCREENS.md` demo list; **P-93's story does not change**.
- **D-B. No GitHub subscription and no card.** Free Actions minutes are exhausted, so no job starts — guard included. Interim: the merge gate is the **full suite run on the exact commit, on the Mac, counts written into `lead-check.md`**. No merge without that evidence, and no pretending CI is green. Before CI is re-enabled, trim `.github/workflows/ci.yml` (no full suites on every push; `pull_request` or `workflow_dispatch` only) or it will burn out again within days.
- **D-C. Nobody pastes findings into the Lead chat.** Findings arrive through `inbox/` and `/lead` picks them up. That is why this file exists.

## 2 · Findings
| id | type · severity | what happens | evidence | suggested lane |
|---|---|---|---|---|
| G-1 | Gap · **Critical to merging** | `main` is 271 files behind the Lead. Three Lead PRs are open and none merged; #29 carries Screen 02 **and every lane's current Lead note**, so all lanes are working from stale instructions. | `gh pr list --state open` → #29, #28, #30; `git log --oneline origin/main..HEAD` | Lead |
| G-2 | Bug · **Blocker for P-87** | GitHub refuses to start any Actions job (free minutes exhausted, no payment method). Last green run 12:07 UTC; the guard job "failed" in 2s without running. Nothing can merge under the current rule. | `gh run view 40192739040` → annotation: "job was not started because recent account payments have failed or your spending limit needs to be increased" | Lead (founder decision D-B above) |
| G-3 | Conflict · **Major** | **#28 and #29 both claim P-95**, and both claim **R-113** (`#29`: Screen 04 answers; `#28`: roles audit). Whatever merges second overwrites or forks the record, and `decision-impact.sh` will be checking two meanings of one number. | `gh pr view 29 --json body`; `git show origin/lead/2026-10-25-roles-audit:…/DECISIONS.md` | Lead |
| G-4 | Gap · Major | **No Corporate capability rows exist at all**, though `lm.high_wage` is a seeded combination (Employer + Representative). A capability register with no Corporate row cannot show the Corporate pathway as proved or unproved. | `grep -in "corporate\|LMIA" product/qa/CAPABILITIES.md` → only C1.7's portal list | Lead (register) · qa (status) |
| G-5 | Bug · Minor (stale record) | Register rows say *not tested / not built* where evidence exists: **C7.2** (Adobe passes on 6 forms), **C2.9 · C7.4 · C9.3** (F2 merged), **C2.3 · C2.8 · C9.1** (PR #29). Status is the qa lane's to set, but the *assignments* are the Lead's. | `ls prototype/evidence-lane/E1/`; `grep -n "C7.2\|C2.9\|C7.4\|C9.3\|C2.3\|C2.8\|C9.1" product/qa/CAPABILITIES.md` | Lead → qa |
| G-6 | Gap · Major (mechanism) | **`lane.sh inbox` lists `main` and `devin/*` only.** A Goose drop on `goose/*` is invisible to `/lead`, which is how this note was nearly lost. Precedent exists (`devin/2026-10-25-goose-verify`), so this note is on `devin/`. Either widen the glob to `goose/*` or write the convention down in `inbox/README.md`. | `sed -n '140,148p' product/tools/lane.sh` | Lead |
| G-7 | Gap · Major | **P-93's combination B does not exist in the seed.** Only `vv.single`, `sv.super_visa`, `sp.student` and `lm.high_wage` have setups; "Work permits › Employer-specific" has none, so reuse across combinations (DEMO row 18) cannot be shown yet. | seed dump in §6 | runtime (D1) |
| G-8 | Gap · Minor | The circulating four-combination analysis claims "every node is covered". Five nodes have **zero** proof today; two of them (both link types) are runtime 03 S3 and two are m3. The frame is right; the coverage claim was premature. | board §3 | Lead (planning) |

## 3 · The node board — what proves each node today
Legend: **Proved** = independent test or Adobe trial · **Built** = code/tests, no independent test · **Zero** = nothing. Combinations: **A** visitor visa family of four · **B** work permit with LMIA · **C** Corporate LMIA high-wage · **D** Express Entry.

| # | Node | Today | Gap | Proved by (Option A) | Owner · stage | Gate |
|---|---|---|---|---|---|---|
| 1 | PDF ingestion | Proved in part (C2.1 Works; C3.1 Partial API only) | no person-walk of drafting; C has no sources | A · C | screens 04 · forms | M2 |
| 2 | PDF auto-fill + Validate + barcodes | **Proved** at form level (5257 5/5 barcodes, 1295, 5707, 0008, 1344, 5409) | C7.2 row stale; 5476 pending; EMP5711 never trialled | A · B · C | evidence (Mac) · runtime | M3 |
| 3 | Online ingestion | Built (C2.5, C2.7 Works; extension capture in F2) | C2.8 review doc is PR #29; qa has not run since F2 | A · D | forms · qa | M2 |
| 4 | Online auto-populate | Built, unproved (F2 fill 17/17 on the lane) | C7.3 portal sheet **not built** | A · D | forms · m3 | M3 |
| 5 | Signed-PDF flow (print→sign→scan→upload) | **Zero** (C8.1, C3.11 not built) | whole flow | A (5476) · C (EMP5711 — Sample) | runtime 03 S3 · m3 | M3 |
| 6 | Mixed filing from its lines | Derivation **proved** (C1.6 Works) | the filing itself (C7.7) not built | A release 2 | runtime · m3 | M3 |
| 7 | Online-only filing | **Zero** (no EE setup, no row, no answer sheet) | setup + answer sheet | D only | m3 · screens | M3 |
| 8 | N-persons | **Proved** (C6.2/6.3/6.6; R1d 35/35, seed has spouse + up to 4 children) | per-person filing is M3 | A · B | runtime | M2/M3 |
| 9 | "Supported by" link | **Zero** (C1.3 — a text label only) | the link and its carried facts | B ← C | runtime 03 S3 | M2 |
| 10 | "Follows" / route | **Zero** (P-24 models EE as route steps inside one category) | decide route-steps vs link, then build | D · B follows C | runtime 03 S3 · Lead | M2 |
| 11 | Corporate pathway | **Shell only** (`lm.high_wage`, no sources, no rows) | sources + rows | C | forms · runtime · qa | M2/M3 |
| 12 | Reuse across combinations | Within a case only (C6.3 Works) | B's setup and seed (G-7) | A → B (5707, 5476 reused; 1295 new) | runtime D1 | M2 |

**Count: 1 proved · 6 built/unproved · 5 zero.** Under Option A all twelve are reachable; five of them only at the M3 gate, four of those in runtime 03 S3 or m3.

## 4 · Why visitor visa stays (against the circulating analysis)
It is the only combination with Adobe-passed barcodes (IMM 5257), a family of four, and a real mixed release (release 2). Dropping it would not free a slot; it would discard the only proven PDF path and strand D1. Low-wage genuinely adds nothing (it shares facts with high-wage). Spousal proves **no** node above and is blocked on expert question 1 — it stays out, as P-93 says; if it returns, its seed must include a dependent child or N=2.

## 5 · Three expert questions (the only reason channel rows are still Sample)
1. **Channels per combination** for A–D (expert question 3, P-61).
2. **EMP5711** — is it filed as a Signed PDF line? Employer and worker both sign it, so signed-PDF is not Individual-only (**Unconfirmed: no counsel**).
3. **Express Entry after ITA** — does the personalised checklist include anything that must be signed? If yes, D is not a pure online-only proof.

## 6 · Checks — run these before acting on any row above
```
grep -n "C1.3\|C7.2\|C8.1\|C2.9\|C7.4" product/qa/CAPABILITIES.md     # statuses in the board
ls prototype/evidence-lane/E1/                                          # Adobe trials that exist
python3 -c "import json;[print(c['label'],'|',c.get('setup',{}).get('key','no setup'),'|',len(c.get('setup',{}).get('sources',[]))) for p in json.load(open('prototype/studio/samples/programs.json'))['programs'] for c in p['categories']]"   # G-7
gh pr list --state open; gh run view 40192739040                        # G-1, G-2
sed -n '140,148p' product/tools/lane.sh                                 # G-6
```
Expected if this note is right: exactly one Adobe trial set (0008, 1295, 1344, 5257, 5409, 5707); four seeded setups and corporate with 0 sources; three open Lead PRs; a billing annotation on the run; `inbox` matching only `main` and `devin/*`. Any mismatch → the note is stale or wrong; correct it before the founder hears it second-hand.

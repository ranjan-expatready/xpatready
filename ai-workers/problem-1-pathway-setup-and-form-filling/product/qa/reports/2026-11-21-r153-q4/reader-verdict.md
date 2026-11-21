# R1.53 reader verdict (fresh reader, P-339; ran nothing; main f50a4e4fd, 21 Nov)

S = `prototype/studio`. Read only: files, git, `gh api`. Live AI off, US$0.

## 1 Per clause

| Clause (CAPABILITIES R1.53) | How met | Evidence |
|---|---|---|
| A draft shows the Code's items, each present or missing | Route only | `GET retainers/:id` returns `codeChecklist` (S/api/src/front-office/retainers/service.ts:454-455) built by `draftChecklist`: 26 items, `present` true/false, line "Code s. 24(3): n of 26 items marked…" (code-checklist.ts:52-63). Template panel route `GET retainer-templates/:id/checklist` (routes.ts:34-35; code-checklist.ts:40-49). Items kept per version, write-once (`code.marked`, service.ts:353-354). Test DW2 (check_fo5b_retainer_checklist.ts:112-131). No screen: S/web/src/modules/front-office/ has booking, booking-public, compliance, embed, sales only; "retainer" in web is only prospect text (sales/prospect-page.tsx:22, :173) and won-via labels (runtime/clients.tsx:32). |
| Non-blocking (P-566/P-567) | Route only | `blocksSend: false` (code-checklist.ts:48, :61); send blockers are client name, fee, representative, signer only (service.ts:374-383). Test DW4: 25 missing, still SENT (check_fo5b…:147-151). |
| Edits make versions until sent | Route only | `edit` = version n+1 (service.ts:480-482), stale save refused (service.ts:73-83). Editable statuses include SENT/VIEWED (service.ts:38): an edit after Send makes a new version to send again, the reading Lead 52 ruled on #1792 (BR-9, AG-5-65). Tests: check_fo5_retainers.ts (248/248), DW5 (check_fo5b…:156-158). |
| A sent retainer cannot change | Route only (DB enforced) | Triggers: "sent_at is set once", merge values/file/hash frozen, "a % retainer does not change" (S/prisma/migrations/20261114210000_fo5_retainer_tables/migration.sql:316, :409-416, :423-426). DW6: sent version keeps its list and hash after its template changes; DB update refused (check_fo5b…:164-168). |
| Unconfirmed: no counsel | Met (data/API) | `legalReading` in samples/cicc-code-s24-items.json and every checklist response (code-checklist.ts:48, :61); DW7 (check_fo5b…:172-175). |

CI verified from job logs (run 44888126444, merge-queue commit 035c8af93, `pull_request`, success): job 136798806632 `check_fo5_retainers.ts` PASS 248/0, `check_fo5b_retainer_checklist.ts` PASS 28/0; job 136798806599 `check_fo5f2_template_safety.ts` PASS 72/0; job 136798806621 `check_b164_no_engine_keys.ts` PASS 67/0. `git rev-parse` of S at f50a4e4fd and 035c8af93: both a9728c8a3 (same tree).

## 2 Gate A

Not met. There is no retainer screen in S/web/src (no template upload/checklist panel, no draft page, no Send, no signing screen), so no person can walk draft → send → sign → WON → `prospect.won` (FO-8) by screens. S/tests/journeys/ has no `j_53.ts`. The prospect page only shows "Retainer not signed…" / "The retainer is signed." (prospect-page.tsx:173). Everything above is reachable by API only.

## 3 Parts merged (P-606)

| Part | State on main f50a4e4fd |
|---|---|
| FO-5 (schema, API, documents) | Merged (service.ts, routes.ts, migration 20261114210000; fo5 248/248) |
| FO-5b (Code checklist, API) | Merged, PR #2720 (merge f50a4e4fd) |
| FO-5s (retainer and signing screens) | Missing: no web retainer files; no open PR (54 open PRs read, none names FO-5s/retainer) |
| J-53 (join and walk) | Missing: no S/tests/journeys/j_53.ts; no open PR |

## 4 Citation (AGENTS rule 4, P-170)

samples/cicc-code-s24-items.json: instrument SOR/2022-128, section 24(3), lead-in quoted, URL `https://laws-lois.justice.gc.ca/eng/regulations/SOR-2022-128/FullText.html#s-24`, `currentTo` 2026-10-29, `readOn` 2026-11-21 (source and every item), 26 items letters a–z in order (counted), Code text word for word per `readNote`, our notes labelled "Ours", `legalReading` "Unconfirmed: no counsel". Page reference is the section anchor (web page, no page number) — acceptable. I did not fetch the page, so the word-for-word claim is the builder's and test DW1's (check_fo5b…:67-81), not mine.
Difference: P-567 (2) (DECISIONS.md:222) and other BACKLOG rows say "current to 2026-10-19"; the file and test DW1/DW7 say 2026-10-29. Reads as a newer re-read on 21 Nov (the file is the later source), not an error in the code; the records were not updated.

## 5 Findings

| # | Severity / type | Finding |
|---|---|---|
| F1 | Major / Gap | No retainer screen (FO-5s) and no walk (J-53): every clause is met by route only; gate A cannot pass. Known and planned, not a defect of #2720. |
| F2 | Minor / Conflict (records) | "current to" date: P-567 and BACKLOG say 2026-10-19, the data file and tests say 2026-10-29. Record the re-read (or a P-row) so the two agree. |
| F3 | Minor / Ambiguity (records) | MVP-CHECKLIST.md row 53 lists parts "FO-5, FO-5b, FO-5s (FO-5r research)" without J-53; focus-list.md:39 and CAPABILITIES list J-53. P-606 needs one list. |

Already ruled, not a finding: "versioned until sent" allows an edit after Send as a new version (Lead 52, AG-5-65); the sent version itself never changes. No hole found in the tests against the Done when at API level.

## 6 Verdict

**Partial (parts missing: FO-5s, J-53).** API meets all four clauses plus the counsel label; CI green as claimed; gate A not met (no screens). Confidence: high.

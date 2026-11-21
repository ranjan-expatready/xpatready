# R1.53 reader verdict 2 (fresh reader, P-339; ran nothing; main 91d72608c, 21 Nov)

S = `prototype/studio`, P = `product`. Read only: files, git, `gh api`. Live AI off, US$0. Reading of "versioned until sent": Lead 52 on #1792 (BR-9, AG-5-65).

## 1 Per clause

| Clause (CAPABILITIES R1.53) | How met | Evidence |
|---|---|---|
| A draft shows the Code's items, each present or missing | Screens | Retainer page "Regulator's Code" section: line "Code s. 24(3): n of 26 items marked in this agreement's template." and a fold-out with one pill per item, "(a) marked" / "not marked" (S/web/src/modules/front-office/retainers/retainer-page.tsx:166-171); "See the items and how we check" panel lists all 26 with the Code's words and how we check (:183-190). Data: `codeChecklist` from `draftChecklist` (S/api/src/front-office/retainers/service.ts:481; code-checklist.ts draftChecklist). The pills say marked/not marked, not present/missing (AG-05 rule 7: never "required"); same meaning. j_53 W2 asserts 26 chips, DW1 the letters a-z and "current to" equal the committed file. |
| Non-blocking (P-566, P-567 (2)) | Screens | "Shown to help you check; it never stops a send." (retainer-page.tsx:169); `blocksSend: false` (code-checklist.ts); Send blockers are only client name, fee, date, representative (service.ts:380-385). j_53 W3 sends with 1 of 26 marked: 25 unmarked items did not block. |
| Edits make versions until sent | Screens | Draft: "Save as version n+1" (retainer-page.tsx:135); after Send: Edit button (:104), info notice "Edit makes a new version; the sent one stays as it was and the new one is sent again" (:96); Versions list with Current, Sent date, "Replaced by a newer version" (:141-152). Route: `edit` writes n+1 and ends the sent version's request "UPDATED" (service.ts:506-546); stale save 409. j_53 W3 (v2 sent), W4 (Edit after Send = v3 Draft, v2 keeps CAD 1,500.00, ended UPDATED, then v3 sent). |
| A sent retainer cannot change | Screens + DB | No screen control edits a sent version; Edit always makes n+1; Send panel says "Once sent, this version never changes" (retainer-page.tsx:175). Routes: send only from DRAFT (service.ts `send`, "NOT_DRAFT" 409); no route updates a version's values, file or fees. DB: `fo_retainer_version_write` "a version never changes (only its request: sent_at, then ended_at)", "sent_at is set once", fee rows never change (S/prisma/migrations/20261114210000_fo5_retainer_tables/migration.sql:381-431, :446). DW2: downloaded v2's SHA-256 = stored `original_sha256`. |
| Unconfirmed: no counsel | Screens | `legalReading` ("Unconfirmed: no counsel", samples file) printed beside the draft's items (retainer-page.tsx:169), in the items panel (:185) and on the template panel (templates-page.tsx:118); starter download says "Sample wording; Unconfirmed: no counsel" (templates-page.tsx:99). |

## 2 Gate A (P-317 (2), P-348 (3))

walks.yml run 44907528809: event workflow_dispatch, head_sha 91d72608c0f8, success; job 136856362884 "walk j_53" log: 21 PASS lines (W0-W5, DW1, DW2 and their NR checks, 5 axe checks, no page error), "21/21 passed", "journey j_53: exit 0". The walk is by screens: W0 the Owner downloads the starter and uploads it in Settings › Retainer templates (no template by API since #2826); W1 conflict check on the prospect's panel; W2-W5 Prepare, Code items, fee, Save v2, Check and send, Edit, Save v3, Send, card "Waiting ... to sign". Set-up outside screens is only the start state: Sample firm seed, an Engaged lead/prospect inserted by SQL (J-42's end, j_53.ts:59-63), a local staff sign-in token (:64-67) and deactivating earlier templates for re-runs (:68). No mutating API call sets up the retainer itself; DB reads only verify. Ending at "Sent, version 3, waiting for the client": R1.54 (row 54, "E-signature with evidence") starts with the client signing, which needs FO-6's public signing door (not on main), so the waiting card is the last screen R1.53 owns and row 54's first step. Correct, but it departs from P/BACKLOG.md:1140 (J-53 "walk to ... `prospect.won`"), which #2802 asked to reword; not yet reworded (Finding 2). qa's re-runs (j_53 21/21 twice; fo5 248/248, fo5b 28/28, fo5f2 72/72, fo5s 41/41, fo5s2 23/23, each twice) are plausible: the same numbers as the PR records and CI, all five check files exist in S/tests.

## 3 Parts merged (P-606)

FO-5 (earlier, packs 248/248) · FO-5b #2720 merged (f50a4e4fd) · FO-5s part 1 + J-53 #2802 merged (16e31b7f5) · FO-5s part 2 #2826 merged (91d72608c, "Completes: R1.53"); `qa/built/R1.53.md` present. Open PRs (REST, 45 open): only qa's own #2797 (the earlier Partial report) names R1.53; none for FO-5, FO-5s or J-53. P/qa/BUGS.md: no row names R1.53, FO-5s or J-53 (QA-541 and QA-612 touch retainers under R1.33 and R1.110). FO-5s's later parts (S6 Withdraw / Signed offline, R1.55; S7 public signing page and Sign as the firm, R1.54; retainer-page.tsx:7) are outside R1.53's Done when, but BACKLOG's FO-5s row (:343) still lists them as one row, and the trace table still says "FO-5s not built" (:654).

## 4 Citation (AGENTS rule 4)

S/samples/cicc-code-s24-items.json: Code of Professional Conduct for College of Immigration and Citizenship Consultants Licensees, SOR/2022-128, s. 24(3), lead-in "The service agreement must include the following information:", URL https://laws-lois.justice.gc.ca/eng/regulations/SOR-2022-128/FullText.html#s-24, current to 2026-10-29, read 2026-11-21 (word-for-word note), legalReading "Unconfirmed: no counsel", 26 items a-z. Holds; not re-fetched (ran nothing).

## 5 Findings

1. Minor · Gap (records): FO-5s split (part 1, part 2, part 3 = S6 + S7 after FO-6) is not in P/BACKLOG.md:343, and the trace rows (:651, :654) still read "not built". A reader of BACKLOG alone would think FO-5s, a listed R1.53 part, is unfinished.
2. Minor · Conflict (records): BACKLOG J-53 (:1140) still says the walk ends at sign → WON (`prospect.won`) and joins FO-6; the merged walk rightly ends at row 54's first step. Reword the row (as #2802 recommended).
3. Minor · Gap: an Edit on a sent retainer ends the client's open request at Save, not at the new Send (breaker M2 on #2802; service.ts:536-537); the screen says so (retainer-page.tsx:96), and the sent version itself never changes, so the clause holds. The recommended FO-5 runtime row (end the request in the new version's Send) is not in BACKLOG.
4. Minor · Gap: a template's own files cannot be downloaded (no FO-5 route; declared on #2826). Not part of R1.53's Done when.
No Blocker, Critical or Major found.

## 6 Verdict

**Works**, confidence high (about 85%). Every clause is met by screens and held by the route and the database; FO-5, FO-5b, FO-5s parts 1-2 and J-53 are on main; j_53 walks by screens to row 54's first step (21/21 on GitHub's runner at 91d72608c); no open bug or PR for R1.53. The four Minors are records and follow-up rows, none blocking.

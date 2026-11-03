# C3.4 v2 prompts: break report (money and AI), commit 0df15a0f1

Breaker, 3 Nov, US$0. Diff `git diff origin/main..0df15a0f1`. Own copy :4456 (`xr_studio_forms_c34brk`, `isolated.sh forms_c34brk 4456 start`). Shared Live copy :4452 used once, 10:37:08–10:37:29 UTC (Live suite only). No model called, no `*_LIVE` set, :4400 untouched. Every run file I wrote under `p2/runs` was removed. `p2/runs/stub-pass/studio-masters-*` and `p2/screening/canary-digest.json` were restored byte for byte. `git status` was clean afterwards. Scratch scripts are in the session scratchpad and are not committed.

Suites: `check_forms_c34_ai.ts 4456 xr_studio_forms_c34brk` **58/58**; `check_forms_c34_ai_live.ts 4452 xr_studio_forms_c34live` **8/8**.

## Findings

**MAJOR 1: the form prompts give two different choice values, and no rule checks a value against the box's choices.**
- The rule says to write `"* Yes"`, the first text of the pair in `options_resolved` (`masters-form.v2.md:34`, `masters-form-check.v2.md:14`). The only worked tree and its examples write `"Yes"` (`masters-form.v2.md:45,48-50`, `masters-form-check.v2.md:16`). Only the paths are labelled "made up", not the value.
- In the request, none of IMM 5257's 21 Yes/No boxes (`exclGroup`) has an `options_resolved` key. All 21 have it null, and `p2/prompt.ts:20` drops null keys, so the choices arrive only as `options`. Those come in three spellings: `["* No","N"],["* Yes","Y"]`, `["*No","N"],["*Yes","Y"]` (3 boxes) and `["No","N"],["Yes","Y"]`.
- `formMastersFromRounds` (`engine/masters-ai.ts:154-170`) never checks an `eq`/`neq`/`in` value against the box's printed choices.
- Result: a tree that copies the worked example passes M1–M3, and is Ready when both rounds copy it. Yet by the prompt's own value rule it can never fail. Repro (`evaluate`): `{"op":"or","args":[{"op":"neq","field":"c","value":"Yes"},{"op":"exists","field":"d"}]}` over `{"c":"* Yes"}` (no details) gives **true**. A missing detail is never caught.
- If one round follows the rule and the other follows the example, the canonical trees differ, so the item lands as Check, never Ready.
- These yes/details checks are most of what IMM 5257 states (e.g. `refusedDetails[0]`: "If you answered “yes” to question 2a), 2b), or 2C please provide details.").

**MAJOR 2: the guide prompts' snake-case rule is not the tool's `snake()`, and the prompt's own example fails it.**
- `masters-guide.v2.md:37` and `masters-guide-check.v2.md:13` say F is `reads` "in lower snake case". `snake()` (`masters-ai.ts:52`) turns every non-letter into `_`, giving: `"Spouse's family name"` → `spouse_s_family_name`, `"E-mail address"` → `e_mail_address`, `"Date of birth (DOB)"` → `date_of_birth_dob`.
- The prompt's own worked tree for "the spouse's family name" uses `spouse_family_name` (`masters-guide.v2.md:58-60`).
- Repro: `treeOf(<that tree>, "PRINCIPAL", new Set(["Marital status","Spouse's family name","Date of marriage"].map(snake)))` → **rejected**: "its condition reads spouse_family_name, which it does not name among what it reads". The check is dropped (`masters-ai.ts:248-251`).
- Any read with an apostrophe, hyphen or bracket that a model snake-cases the usual way is dropped the same way.
- Related: the guide job sends no question list, so the two rounds name the same answer freely. Unless both names map to one library fact, they make two one-round Decide items instead of one Ready item.

**MAJOR 3: Saved pairs rounds only by file-time order, so a paid pair can become unreplayable.** Nothing in the jobs or `p2/launch.ts` enforces that order. All experiments used launcher-shaped records built from real stub passes (`p2/runs/*-live-19990101t…-pacheckbrk*`), and `POST /attachments/<IMM 5257>/draft-masters/plan {mode:"replay"}` on :4456:
- **B:** checker recorded before draft → `available:false`, "The newest saved checker reading has no first reading from the same run". `ls p2/jobs/studio-masters-*` lists `form-check-…` before `form-…` and `guide-check-…` before `guide-…`. A paid runner that goes in file order spends up to US$5.03 worst (about US$1.2 usual) on the form and cannot replay it. #669 happened to run the draft first (07:22:34, then 07:23:31).
- **C:** draft, checker, then a second checker run → `available:false`. The complete earlier pair is lost; Saved never falls back to it.
- Code: `form-masters.ts:165-174` (newest checker only; window bounded only by earlier checker files).

**MINOR 4: Saved can mix two runs.**
- Records: good draft (t1), then a well-recorded draft that `shapeOk` refuses (t2), then a checker (t3). Result: `available:true` with files t1 + t3, so run 1's draft is replayed with run 2's checker.
- Cause: the window's lower bound counts checker files only (`form-masters.ts:172`).
- This is against break B1's "never two runs mixed".

**MINOR 5: the plan, the runner and the records state different worst cases.**
- For IMM 5257's two rounds:

| Source | Worst |
|---|---|
| Plan | US$7.27 (sum of `budget_usd` 3.65 + 3.62; `form-masters.ts:181`, `rounds.ts:91`) |
| Runner, two attempts each | US$5.03 (2×1.263 + 2×1.249, `p2/runner.ts:60`) |

- With US$5.03–7.27 left in the ledger, the plan refuses a Live run that fits (`form-masters.ts:268`). The plan also shows one draft above the US$5 per-run figure.
- Four-job worst is now US$6.49, but `STATE.md:111` and P-295 still say "C3.4 worst US$5.78".
- This is the safe direction: nothing can be over-spent.

**MINOR 6: the new tests miss these mutations** (run through a copy of the test's `worked()`, `check_forms_c34_ai.ts:259-282`). All of these still pass P:
- (a) the grammar line changed to `{"op": "not", "args": [node]}` or `{"op":"in", …, "values": …}`. Grammar lines are not JSON, so they are never parsed.
- (b) `never its code` changed to `or its code`.
- (c) the guide snake-case rule replaced by "F is any name you choose".
- (d) the guide's `in`/`not`/`and` tree given fields no `reads` names. Bare trees are checked against their own fields (`:266`), which is why Major 2 went unseen.
- (e) the worked tree and examples switched to `"* Yes"`. The value rule is untested either way.
- (f) `MEASURED_C34.formDraftOutputTokens` set to 1, or `isForm` removed. W only asserts `0 < usual < worst` (`:182`).
- (g) the v1-replay test records both rounds with v1 (`:206`). The checker is refused first, so skipping the template check on the draft side only (`rounds.ts:141`) would go unseen. The real code does refuse a v1 draft with a v2 checker (A2 below).

## What held
- **Attempts and run cap:** `guard.ts:264-265` (`max_attempts` ≤ 2, `budget_usd` ≤ US$5). Per-attempt reservations are 1.263 / 1.249 / 0.373 / 0.359, so two attempts fit each job's budget (3.65 / 3.62 / 1.00 / 1.00). The committed jobs equal the app's derivation (J).
- **Live guards:** Live without a plan is refused; another plan's checksum is refused; Live with the switch off is refused at US$0 with no job.
- **Cost kept on failure:** a failure after two paid rounds keeps its cost and run files, and a failed round says it was counted (Live suite M1, F).
- **Replay refused at US$0** (no job) for: v1 draft + v1 checker (suite); v1 draft + v2 checker (A2); v2 draft + v1 checker (A3); a checker file carrying the draft prompt (D); another edition (suite); a wrong-shaped draft (E).
- **Pairing:** draft, checker, then a draft re-run replays the right pair (C2).
- **Literal shapes in the prompts that the rules accept:** `gt` with an ISO date, `in` with one value, `and`/`or` with one node, `not`, `eq` true/"". Every `subject_kind` the prompts name passes (`PRINCIPAL`, `SPOUSE`, `DEPENDENT`, `EACH_APPLICANT`). A null value is rejected, and no prompt offers one.
- **Made-up examples cannot be proposed:**
  - The form quote "If you answered yes, give details." matches 0 of IMM 5257's printed captions.
  - The `Page9`/`Example` paths are not on the edition (visible pages 1, 2, 3, 5).
  - The guide's placeholder quote is not a sentence of guide 5256.
- **Stub pass of all four jobs:** `P2_LEDGER_DIR=<scratch> node p2/launch.ts --job <id> --stub` exits 0 with status completed for each; `p2/screen.ts` refused nothing in the v2 prompts.
- **Stale stub-pass files:** the committed `stub-pass/studio-masters-*` files carry the v1 path code, so `--live` is refused until `--stub` is re-run (safe).
- **Timeout:** #669's form draft wrote 8,000 tokens in about 55 s (07:22:35 → 07:23:30), so the 16,000 limit fits the 300 s timeout.

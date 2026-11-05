# C11.15 — "Choose the page and find again" with any page address (QA-252) · build notes

Capability: **C11.15** (Start setup runs the form finder for the combination) · lane: forms · branch `claude/eloquent-brahmagupta-r9inu3` from `origin/main` 7bf8db261 · cost US$0 (live AI off; only Saved and Rules only were pressed).

## What broke (the founder's test, 5 Nov ~13:05 IST; QA-252, Major)
On Super visa › Forms, "Choose the page and find again", choosing the offered page "Start Up Visa" (148 characters), Saved, then Start showed in red: "Too big: expected string to have <=120 characters". The person was stuck.

**Cause, proven before the fix.** `web/src/pages/workspace/finder.tsx:90` (on main) sent `idempotencyKey: s5-${key}-${mode}-${pageUrl ?? ""}`; `contracts/form-library.ts:30` allows 8–120 characters. The key is 46–47 characters plus the address, so **every address over about 73 characters fails**. That covers all four pages Super visa offers (103, 120, 132 and 148 characters) in every mode, not only Start Up Visa. Evidence:
* API on main, a fresh copy: the 148-character address with the dialog's key → `400 {"errors":[{"field":"idempotencyKey","message":"Too big: expected string to have <=120 characters"}]}` (key length 195 Saved, 194 Rules only).
* The walk below, run against main's `finder.tsx`: **exit 1**, all 10 tries red (4 offered pages × 2 modes, and the pasted 314-character address × 2).

Why our checks missed it: no test or walk pressed Start with a page address. `check_w1_start_setup_browser.cjs` fills the Visitor visa page (103 characters) but only reads the plan; qa's walks stopped at the plan or used the same page.

## What changed
1. **Key** (`web/src/pages/workspace/find-key.ts`, `findRunKey`): `s5-<dialog UUID>-<mode>-<first 32 hex of SHA-256(address)>`, 79 characters whatever the address. The same dialog, mode and address give the same key, so a second Start or a retry answers the same run (`api/src/finder.ts` launch: the same key returns the same run). Another address or mode gives another key, with 128 bits against collisions. Web Crypto `subtle.digest` needs a secure context (https or localhost), as `crypto.randomUUID` already did in this dialog.
2. **Words** (`findErrorWords`): a refused plan or Start shows the server's words only when every refused field is one the person set (mode, stage, page, plan, forms) in our own words. A refusal on the key, an override or an unknown field, a validator's default message, a 5xx, a lost connection, or an answer with no words of its own shows fixed words that say what to do. Only this dialog's path; QA-187 is the wider row.
3. **QA-252 (2), the dialog not offered again.** Traced to `api/src/finder.ts:211` and `:252` (`rememberedPages`). Once a find **finishes** (COMPLETED or PARTIAL) on a chosen page, every later plan reuses that page. The run never waits for a page again, so "Choose the page and find again" is never offered again, and a wrong page is a dead end: for example Visitor visa's page for Super visa (rules: 0 forms), read again on every Find again. Fix, in the dialog only: Find again shows "The page this combination's last find read" (its address) and "Another canada.ca page". With "Another" chosen and nothing pasted, the dialog says "Paste the address…" and Start stays off, so it never quietly reads the old page. With no remembered page, the dialog is as before. No server change.
4. With a page chosen and nothing pasted yet, the dialog now asks for the address instead of "Working out the steps…" forever.

## Sweep of every idempotency key (fix item 2)
| Where | Key | Server limit | Verdict |
|---|---|---|---|
| `finder.tsx` find, with a page | `s5-uuid-mode-url` | 120 (`FinderLaunchBody`) | **the fault; fixed** |
| `finder.tsx:89` Redo | `redo-uuid-stage-mode` ≤ 54 | 120 (`RedoBody`), then `finder.launch` 120 | fine |
| `start-setup.tsx:59` | `randomUUID()` 36 | 120 | fine |
| `ai-launch.tsx:32` → `POST /ai/batches` | uuid, or `k-<ms>-<base36>` ≥ 15 | `ai.ts:297` only ≥ 8; column is text | fine |
| `sources.tsx:165` → `POST /attachments/:id/draft` | same as ai-launch | `ai.ts:362` → `launch` ≥ 8 | fine |
| `bulk-lines.tsx:21` → `/lines/bulk`, `/lines/copy` | uuid or `<ms>-<base36>` | 100 and 90, no `#`; copy stores `key#1…#100` ≤ 94, text column | fine |
| `cases.tsx:116`, `:214` → `/runtime/cases`, `…/people` | uuid | 128, printable (`contracts/runtime.ts:26`) | fine |
| `runtime/findings.tsx:126` | uuid | 100 (`contracts/findings.ts:58`) | fine |
| `runtime/forms.tsx:102` generate | uuid | 128 (`GenerateCopy`) | fine |
| `api/src/draft-contract.ts:36` (C4.11) | caller's | 100, stored as `qd-key-<id>-<key>` in a text column | fine |
| Server-made: `demo.ts:462` `sample-six-finder-<uuid>` 54, `form-redo.ts:63` ≤ 47, `sample-case.ts` sliced to 80, `people-ai`, `upload-run`, `draft-qd`, `ai.ts:373` | — | — | fine |

## Checks
* `tests/check_finder_long_page_key.ts` (API, fresh copy): **28/28, exit 0**. On main it cannot run: `find-key.ts` does not exist there, and its server half is the same 400 shown above. It covers: the 148-character address and a 314-character one, each passing (one run) and failing (the old key → 400, nothing started, plain words); the same address twice is one run; two addresses one character apart are two runs; another mode or dialog makes another key; the words for a page outside canada.ca, a key refusal, a 409, a 500, a lost connection and a wordless 404.
* `tests/check_finder_long_page_browser.cjs` (the P-352 walk at 1440 px, fresh copy): **52/52, exit 0** on this branch; **exit 1 on main** (10 red lines). It covers every offered page in Saved and Rules only, pressed in the offered list as the founder did, plus the pasted 314-character address through Find again. Each try: plan at US$0, Start, one run in that mode on that page, then what the Forms tab shows next. Also a double click on Start is one run, the QA-252 (2) pass and fail, axe on the dialog (5 states), and no page errors. Screenshots: `../C11.15/screenshots/long-page/` (16).
* typecheck: no new errors (15 known) · `graph.mjs --check` exit 0 · `count-any` 418 = base.

## What the walk shows next (reported, not changed here)
* **Super visa's own page is not in the recorded canada.ca copies** (`official-sources/ircc/canada/index.json`, 65 pages; only Visitor visa's offered page is among them). On this copy every offered page except Visitor visa's ends "The finder could not read the application page", the right page included. In the demo, Super visa cannot be found from canada.ca until that page is recorded (evidence lane).
* After a failed find, the panel reads "AI found 0 forms for this combination · Last find … rules only, US$0" and does not say the page could not be read (screenshots 07, 09). Minor; recommend a follow-up row: the panel says how the last find ended and why.
* Saved on a page with no saved answers ends "AI did not finish (failed)" (screenshot 10): consistent with the plan's note ("A page with no saved answer stops with the reason").

## Why Super visa offers Start Up Visa (report only; fix item 4)
The list is `api/src/finder.ts` `sureMatch` (`:556`) over canada.ca's list of application packages (`INDEX_URL`, `:75`). It scores each package title against the combination's names after the first ("Visitors", "Super visa"), less one for each extra word in the title, and keeps **every package with a score above 0**, up to 10. "Start Up Visa" shares one word, "visa": 1 + 2 (that word is in the last name) − 2 (start, up) = 1, so it is kept. Super visa's own page scores 4 and Visitor visa's 3. The gap is under the 1.5 a sure match needs, so the run waits for a person and shows all four. Recommendation (Question for the tech lead): offer only pages scoring at least half the top score (here Super visa's and Visitor visa's), or never let a generic word such as "visa" alone keep a page. A forms-lane row, with a fail test that Super visa does not offer Start Up Visa.
